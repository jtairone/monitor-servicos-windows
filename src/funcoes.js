const { exec, spawn } = require('child_process');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

async function getServicesStatusMap(serviceNames) {
    if (!Array.isArray(serviceNames) || serviceNames.length === 0) return new Map();

    // Escapar aspas simples para PowerShell
    const escaped = serviceNames.map(n => String(n).replace(/'/g, "''"));
    const nameList = escaped.map(n => `'${n}'`).join(',');

    return new Promise((resolve) => {
        const psCommand = `powershell -NoProfile -Command "Get-Service -Name @(${nameList}) -ErrorAction SilentlyContinue | Select-Object Name, Status | ConvertTo-Json"`;

        exec(psCommand, { shell: 'cmd.exe', maxBuffer: 1024 * 1024 * 2, timeout: 15000 }, (error, stdout) => {
            try {
                if (error || !stdout) return resolve(new Map());

                const clean = stdout.trim();
                if (!clean) return resolve(new Map());

                const parsed = JSON.parse(clean);
                const arr = Array.isArray(parsed) ? parsed : [parsed];
                const map = new Map();

                for (const item of arr) {
                    if (!item?.Name) continue;

                    const rawStatus = item.Status;
                    let finalStatus = 'Unknown';

                    if (typeof rawStatus === 'number') {
                        // Enum: 1=Stopped, 2=StartPending, 3=StopPending, 4=Running, 5=ContinuePending, 6=PausePending, 7=Paused
                        finalStatus = rawStatus === 4 ? 'Running' : 'Stopped';
                    } else {
                        const s = String(rawStatus || '').toLowerCase();

                        if (
                            s.includes('running') ||
                            s.includes('startpending') ||
                            s.includes('continuepending')
                        ) {
                            finalStatus = 'Running';
                        } else if (
                            s.includes('stopped') ||
                            s.includes('stoppending') ||
                            s.includes('pausepending') ||
                            s.includes('paused')
                        ) {
                            finalStatus = 'Stopped';
                        }
                    }

                    map.set(item.Name, finalStatus);
                }

                resolve(map);
            } catch {
                resolve(new Map());
            }
        });
    });
}

async function runServiceAction(serviceName, action) {
    try {
        let psCommand = ''; 
        switch (action) {
            case 'stop':
                psCommand = `Stop-Service -Name "${serviceName}" -Force -ErrorAction Stop; Write-Output "SUCCESS"`;
                break;
            case 'start':
                psCommand = `Start-Service -Name "${serviceName}" -ErrorAction Stop; Write-Output "SUCCESS"`;
                break;
            case 'restart':
                psCommand = `Restart-Service -Name "${serviceName}" -Force -ErrorAction Stop; Write-Output "SUCCESS"`;
                break;
            default:
                throw new Error(`Ação não reconhecida: ${action}`);
        }
        
        // Construir comando PowerShell com tratamento de erro
        const cmd = `powershell -NoProfile -Command "try { ${psCommand} } catch { Write-Output 'FAILED: ' + \\$_.Exception.Message }"`;
        
       // console.log(`Comando executado: ${cmd}`);
        
        return new Promise((resolve) => {
            exec(cmd, {
                windowsHide: true,
                timeout: 30000,
                shell: 'cmd.exe'
            }, (error, stdout, stderr) => {
                const output = stdout.trim();
                console.log(`📋 Output: ${output}`);
                
                if (stderr) {
                    console.error(`⚠️ Stderr: ${stderr}`);
                }
                
                if (error) {
                    console.error(`❌ Erro ao executar: ${error.message}`);
                    resolve(false);
                    return;
                }
                
                // Verificar se foi bem-sucedido
                const success = output.includes('SUCCESS') && !output.includes('FAILED');
                //console.log(`✅ Resultado: ${success ? 'Sucesso' : 'Falha'}`);
                
                resolve(success);
            });
        });
        
    } catch (error) {
        console.error(`❌ Erro em runServiceAction: ${error.message}`);
        return false;
    }
}

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 tentativas
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
});

const serviceLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 10, // 10 ações por minuto
    message: 'Muitas ações. Tente novamente em um momento.'
});

function lerServicesJson(fullConfig = false) {
    const servicesPath = path.join(__dirname, '../data/services.json');
    
    if(fullConfig){
        const data = fs.readFileSync(servicesPath, 'utf-8');
        const config = JSON.parse(data);
        return { config, path: servicesPath };    
    }
    
    const data = fs.readFileSync(servicesPath, 'utf-8');
    const config = JSON.parse(data);
    return { config: config.services || [], path: servicesPath };
}

function salvarServicesJson(config, filePath) {
    const json = JSON.stringify(config, null, 2);
    fs.writeFileSync(filePath, json, 'utf-8');
}

module.exports = {
    getServicesStatusMap,
    runServiceAction,
    loginLimiter,
    serviceLimiter,
    lerServicesJson,
    salvarServicesJson
};