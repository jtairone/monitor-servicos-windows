const { exec } = require('child_process');
const fs = require('fs').promises;

async function discoverServices() {
    return new Promise((resolve, reject) => {
        exec('powershell "Get-Service | Select-Object Name, DisplayName, Status | ConvertTo-Json"', 
            { shell: 'powershell.exe' }, 
            (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                
                try {
                    const services = JSON.parse(stdout);
                    resolve(services);
                } catch (parseError) {
                    // Tentar parse como array de linhas
                    const lines = stdout.split('\n').filter(line => line.trim());
                    const services = lines.map(line => {
                        const parts = line.split(/\s{2,}/);
                        return {
                            Name: parts[0],
                            DisplayName: parts[1],
                            Status: parts[2]
                        };
                    });
                    resolve(services);
                }
            }
        );
    });
}

async function main() {
    try {
        console.log('🔍 Descobrindo serviços do Windows...\n');
        
        const services = await discoverServices();
        
        console.log(`📊 Total de serviços encontrados: ${services.length}\n`);
        
        // Mostrar os 20 primeiros serviços
        console.log('═'.repeat(80));
        console.log(`${'Nome do Serviço'.padEnd(30)} | ${'Nome de Exibição'.padEnd(40)} | Status`);
        console.log('═'.repeat(80));
        
        services.slice(0, 20).forEach(service => {
            const status = service.Status === 'Running' ? '✅' : '❌';
            console.log(`${service.Name.padEnd(30)} | ${(service.DisplayName || '').substring(0, 40).padEnd(40)} | ${status} ${service.Status}`);
        });
        
        // Salvar em arquivo
        const serviceList = services.map(s => ({
            name: s.Name,
            displayName: s.DisplayName,
            status: s.Status
        }));
        
        await fs.writeFile(
            'discovered-services.json',
            JSON.stringify(serviceList, null, 2),
            'utf8'
        );
        
        console.log('\n💾 Lista salva em "discovered-services.json"');
        console.log('\n📝 Para usar no monitor, copie o "name" para o arquivo services.json');
        
    } catch (error) {
        console.error('Erro:', error);
    }
}

main();