const express = require('express');
const { execSync } = require('child_process');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const execAsync = promisify(exec);

console.log('🔍 Iniciando aplicação...');
console.log('[1] Express carregado');

async function runServiceAction(serviceName, action) {
    try {
        //console.log(`🔧 Executando ${action} no serviço: ${serviceName}`);
        
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
                console.log(`✅ Resultado: ${success ? 'Sucesso' : 'Falha'}`);
                
                resolve(success);
            });
        });
        
    } catch (error) {
        console.error(`❌ Erro em runServiceAction: ${error.message}`);
        return false;
    }
}


// Variável global para armazenar o processo do monitor
let monitorProcess = null;

// Logger simples se não conseguir carregar
let logger;
try {
    logger = require('./src/logger');
    console.log('[2] Logger carregado');
} catch (e) {
    console.log('[2] Logger não encontrado, usando console');
    logger = {
        info: (msg) => console.log('[INFO]', msg),
        error: (msg) => console.error('[ERROR]', msg),
        warn: (msg) => console.warn('[WARN]', msg),
        debug: (msg) => console.debug('[DEBUG]', msg)
    };
}

let config;
try {
    const data = fs.readFileSync(path.join(__dirname, 'services.json'), 'utf8');
    config = JSON.parse(data);
} catch (e) {
    config = { servidor: { port: 3000 } }; // Fallback
}

console.log('[3] Criando aplicação Express');
const app = express();
const PORT = config.servidor?.port || 3000;
console.log('[4] Aplicação criada');

// Middleware
console.log('[5] Configurando middlewares');
app.use(express.json());
app.use(express.static('public'));
console.log('[6] Middlewares configurados');

// Rotas para servir arquivos estáticos
console.log('[7] Configurando rotas');
try {
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    console.log('[8] Rota GET / configurada');
} catch (e) {
    console.error('[ERRO na rota GET] :', e.message);
}

// API: Descobrir serviços (rodar discover-services.js)
try {
    app.post('/api/discover-services', async (req, res) => {
    try {
        logger.info('Iniciando descoberta de serviços...');
        
        return new Promise((resolve) => {
            // Comando PowerShell melhorado que traz o Status em texto
            const psCommand = `powershell -NoProfile -Command "Get-Service | Select-Object Name, DisplayName, Status | ConvertTo-Json"`;
            
            exec(psCommand, 
                { shell: 'cmd.exe', maxBuffer: 1024 * 1024 * 10, timeout: 30000 }, 
                async (error, stdout, stderr) => {
                    try {
                        if (error || !stdout) {
                            logger.error('Erro ao executar PowerShell:', error?.message || 'Sem saída');
                            logger.error('Stderr:', stderr);
                            return res.status(500).json({ error: 'Erro ao descobrir serviços: ' + (error?.message || stderr) });
                        }
                        
                        // Remover linhas em branco
                        const cleanOutput = stdout.trim();
                        if (!cleanOutput) {
                            return res.status(500).json({ error: 'PowerShell não retornou dados' });
                        }
                        
                        const services = JSON.parse(cleanOutput);
                        
                        // Processar array ou objeto único
                        let serviceArray = Array.isArray(services) ? services : [services];
                        
                        // Mapear para o formato desejado com mapeamento de status
                        const processedServices = serviceArray.map(s => {
                            let status = 'Unknown';
                            
                            // Converter Status para texto
                            if (typeof s.Status === 'number') {
                                // Enum do PowerShell: 1=Stopped, 2=Start Pending, 3=Stop Pending, 
                                // 4=Running, 5=Continue Pending, 6=Pause Pending, 7=Paused
                                status = (s.Status === 4) ? 'Running' : 'Stopped';
                            } else if (typeof s.Status === 'string') {
                                // Se vier como string, normalizar
                                status = s.Status.toLowerCase().includes('running') ? 'Running' : 'Stopped';
                            }
                            
                            return {
                                name: s.Name,
                                displayName: s.DisplayName || s.Name,
                                status: status
                            };
                        });
                        
                        // Salvar no discovered-services.json
                        const discoveredPath = path.join(__dirname, './src/discovered-services.json');
                        await fs.writeFile(discoveredPath, JSON.stringify(processedServices, null, 2));
                        
                        logger.info(`Descobertos ${processedServices.length} serviços`);
                        res.json({ 
                            success: true, 
                            services: processedServices,
                            count: processedServices.length 
                        });
                        resolve();
                    } catch (parseError) {
                        logger.error('Erro ao processar resposta:', parseError.message);
                        logger.error('Output recebido:', stdout);
                        res.status(500).json({ error: 'Erro ao processar serviços: ' + parseError.message });
                        resolve();
                    }
                }
            );
        });
        
    } catch (error) {
        logger.error('Erro na rota discover-services:', error.message);
        res.status(500).json({ error: error.message });
    }
});
    console.log('[9] Rota POST /api/discover-services configurada');
} catch (e) {
    console.error('[ERRO na rota POST] :', e.message);
}

// Obter configurações completas (Discord, Monitoramento, Servidor)
app.get('/api/settings', async (req, res) => {
    try {
        const data = await fs.readFile(path.join(__dirname, 'services.json'), 'utf8');
        const fullConfig = JSON.parse(data);
        // Removemos a lista de serviços para focar apenas nas definições
        const { services, ...settings } = fullConfig;
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Salvar configurações
app.post('/api/settings', async (req, res) => {
    try {
        const newSettings = req.body;
        const filePath = path.join(__dirname, 'services.json');
        const data = await fs.readFile(filePath, 'utf8');
        const fullConfig = JSON.parse(data);

        // Mescla as novas configurações mantendo os serviços intactos
        const updatedConfig = {
            services: fullConfig.services,
            ...newSettings
        };

        await fs.writeFile(filePath, JSON.stringify(updatedConfig, null, 2));
        res.json({ success: true, message: "Configurações salvas! Reinicie o servidor para aplicar os novos parâmetros." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Carregar discovered-services.json
app.get('/api/discovered-services', async (req, res) => {
    try {
        const discoveredPath = path.join(__dirname, './src/discovered-services.json');
        const data = await fs.readFile(discoveredPath, 'utf-8');
        const services = JSON.parse(data);
        
        res.json(services);
    } catch (error) {
        logger.error('Erro ao carregar discovered-services:', error.message);
        res.status(500).json({ error: 'Arquivo não encontrado. Execute descoberta primeiro.' });
    }
});

// API: Carregar services.json (serviços monitorados)
app.get('/api/monitored-services', async (req, res) => {
    try {
        const servicesPath = path.join(__dirname, 'services.json');
        const data = await fs.readFile(servicesPath, 'utf-8');
        const config = JSON.parse(data);
        
        res.json(config.services || []);
    } catch (error) {
        logger.error('Erro ao carregar services.json:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// API: Adicionar serviço ao monitoramento
app.post('/api/add-monitored-service', async (req, res) => {
    try {
        const { name, displayName, restartOnFailure } = req.body;
        
        if (!name || !displayName) {
            return res.status(400).json({ error: 'Nome e displayName são obrigatórios' });
        }
        
        const servicesPath = path.join(__dirname, 'services.json');
        const data = await fs.readFile(servicesPath, 'utf-8');
        const config = JSON.parse(data);
        
        // Verificar se serviço já existe
        const exists = config.services.some(s => s.name === name);
        if (exists) {
            return res.status(400).json({ error: 'Serviço já está sendo monitorado' });
        }
        
        // Adicionar novo serviço
        config.services.push({
            name: name,
            displayName: displayName,
            critical: false,
            description: `Adicionado em ${new Date().toLocaleString('pt-BR')}`,
            restartOnFailure: Boolean(restartOnFailure)
        });
        
        // Salvar
        await fs.writeFile(servicesPath, JSON.stringify(config, null, 2));
        
        logger.info(`Serviço ${name} adicionado ao monitoramento`);
        res.json({ 
            success: true, 
            message: `Serviço ${displayName} adicionado com sucesso!`,
            service: config.services[config.services.length - 1]
        });
        
    } catch (error) {
        logger.error('Erro ao adicionar serviço:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// API: Remover serviço do monitoramento
app.delete('/api/monitored-services/:name', async (req, res) => {
    try {
        const { name } = req.params;
        
        const servicesPath = path.join(__dirname, 'services.json');
        const data = await fs.readFile(servicesPath, 'utf-8');
        const config = JSON.parse(data);
        
        // Remover serviço
        config.services = config.services.filter(s => s.name !== name);
        
        // Salvar
        await fs.writeFile(servicesPath, JSON.stringify(config, null, 2));
        
        logger.info(`Serviço ${name} removido do monitoramento`);
        res.json({ success: true, message: 'Serviço removido com sucesso!' });
        
    } catch (error) {
        logger.error('Erro ao remover serviço:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/startservice/:serviceName', async (req, res) => {
    const { serviceName } = req.params;
    try {
        const result = await runServiceAction(serviceName, 'start');
        if (!result) {
            throw new Error('Falha ao iniciar o serviço');
        }

        res.json({ success: true, message: `Serviço ${serviceName} iniciado com sucesso!` });

    } catch (error) {
        logger.error(`Erro ao iniciar serviço ${serviceName}: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: `Erro ao iniciar serviço: ${error.message}` 
        });
    }
});

app.post('/api/stopservice/:serviceName', async (req, res) => {
    const { serviceName } = req.params;
    try {
        const result = await runServiceAction(serviceName, 'stop');
        console.log(result)
        if (!result) {
            throw new Error('Falha ao parar o serviço');
        }

        res.json({ success: true, message: `Serviço ${serviceName} parado com sucesso!` });

    } catch (error) {
        console.log(error)
        logger.error(`Erro ao parar serviço ${serviceName}: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: `Erro ao parar serviço: ${error.message}` 
        });
    }
});

app.post('/api/restartservice/:serviceName', async (req, res) => {
    const { serviceName } = req.params;
    try {
        const result = await runServiceAction(serviceName, 'restart');
        if (!result) {
            throw new Error('Falha ao reiniciar o serviço');
        }

        res.json({ success: true, message: `Serviço ${serviceName} reiniciado com sucesso!` });

    } catch (error) {
        logger.error(`Erro ao reiniciar serviço ${serviceName}: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: `Erro ao reiniciar serviço: ${error.message}` 
        });
    }
});

// Iniciar servidor
console.log('[10] Iniciando servidor...');
const server = app.listen(PORT, () => {
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
    logger.info(`🌐 Servidor rodando em http://localhost:${PORT}`);
    logger.info(`Abra seu navegador e acesse http://localhost:${PORT}`);
    
    // Iniciar monitor.js automaticamente após o servidor estar pronto
    console.log('[11] Iniciando Monitor de Serviços...');
    startMonitor();
});

server.on('error', (err) => {
    console.error('❌ Erro ao iniciar servidor:', err.message);
    process.exit(1);
});

// Função para iniciar o monitor.js como processo filho
function startMonitor() {
    try {
        const monitorPath = path.join(__dirname, './src/monitor.js');
        
        // Spawn do monitor.js como processo filho
        monitorProcess = spawn('node', [monitorPath], {
            stdio: ['ignore', 'pipe', 'pipe'], // Capturar stdout e stderr
            detached: false
        });
        
        // Capturar stdout do monitor
        if (monitorProcess.stdout) {
            monitorProcess.stdout.on('data', (data) => {
                console.log(`[Monitor] ${data.toString().trim()}`);
            });
        }
        
        // Capturar stderr do monitor
        if (monitorProcess.stderr) {
            monitorProcess.stderr.on('data', (data) => {
                console.error(`[Monitor ERRO] ${data.toString().trim()}`);
            });
        }
        
        monitorProcess.on('error', (err) => {
            logger.error('❌ Erro ao iniciar monitor.js:', err.message);
            console.error('Erro ao iniciar monitor.js:', err.message);
        });
        
        monitorProcess.on('exit', (code, signal) => {
            logger.warn(`⚠️ Monitor encerrado com código ${code}`);
            console.warn(`⚠️ Monitor encerrado com código ${code}`);
            
            // Reiniciar monitor se ele falhar
            if (code !== 0 && code !== null) {
                console.log('🔄 Tentando reiniciar monitor em 5 segundos...');
                setTimeout(() => {
                    startMonitor();
                }, 5000);
            }
        });
        
        //console.log('✅ Monitor iniciado com sucesso (PID: ' + monitorProcess.pid + ')');
        logger.info('✅ Monitor iniciado com sucesso (PID: ' + monitorProcess.pid + ')');
        
    } catch (err) {
        logger.error('Erro ao executar startMonitor:', err.message);
        //console.error('Erro ao executar startMonitor:', err.message);
    }
}

// Handler para encerramento gracioso
process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando aplicação...');
    logger.info('Encerrando aplicação');
    
    // Encerrar processo do monitor se estiver rodando
    if (monitorProcess) {
        console.log('⏸️  Encerrando Monitor...');
        monitorProcess.kill('SIGINT');
    }
    
    // Encerrar servidor após 2 segundos
    setTimeout(() => {
        console.log('✅ Aplicação encerrada');
        logger.info('Aplicação encerrada');
        process.exit(0);
    }, 2000);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Encerrando aplicação (SIGTERM)...');
    if (monitorProcess) {
        monitorProcess.kill('SIGTERM');
    }
    
    setTimeout(() => {
        console.log('✅ Aplicação encerrada');
        process.exit(0);
    }, 2000);
});
