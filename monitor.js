const { Service } = require('node-windows');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

// Configurações
const CONFIG = {
    checkInterval: 30000, // 30 segundos
    servicesFile: 'services.json',
    maxRetries: 3,
    webhookUrl: null // Será carregado do arquivo services.json
};

class ServiceMonitor {
    constructor() {
        this.hook = null;
        this.services = [];
        this.serviceStatus = new Map();
        this.retryCount = new Map();
    }

    async loadServices() {
        try {
            const data = await fs.readFile(CONFIG.servicesFile, 'utf8');
            const config = JSON.parse(data);
            this.services = config.services || [];
            
            // Carregar configurações do arquivo
            if (config.discord && config.discord.webhookUrl) {
                CONFIG.webhookUrl = config.discord.webhookUrl;
            }
            
            if (config.monitoring) {
                if (config.monitoring.checkInterval) {
                    CONFIG.checkInterval = config.monitoring.checkInterval;
                }
                if (config.monitoring.maxRetries) {
                    CONFIG.maxRetries = config.monitoring.maxRetries;
                }
            }
            
            // Validar webhook URL
            if (!CONFIG.webhookUrl || typeof CONFIG.webhookUrl !== 'string') {
                throw new Error('Webhook URL do Discord não configurado em services.json');
            }
            
            // Inicializar webhook
            this.hook = new Webhook(CONFIG.webhookUrl);
            this.hook.setUsername('Windows Service Monitor');
            //this.hook.setAvatar('https://cdn-icons-png.flaticon.com/512/3050/3050526.png');
            
            if (this.services.length === 0) {
                throw new Error('Nenhum serviço configurado no services.json');
            }
            
            logger.info(`Carregados ${this.services.length} serviços para monitoramento`);
            logger.info(`Webhook URL: ${CONFIG.webhookUrl.substring(0, 50)}...`);
            
            // Inicializar status
            for (const service of this.services) {
                this.serviceStatus.set(service.name, null);
                this.retryCount.set(service.name, 0);
            }
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Criar arquivo de exemplo se não existir
                await this.createExampleConfig();
                logger.info('Arquivo services.json criado com configuração de exemplo');
            } else {
                logger.error('Erro ao carregar serviços:', error);
                throw error;
            }
        }
    }

    async checkServiceStatus(serviceName) {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            
            // Usar PowerShell para verificar o status do serviço
            const command = `powershell -Command "Get-Service -Name '${serviceName}' -ErrorAction SilentlyContinue | Select-Object -Property Status, DisplayName"`;
            
            exec(command, (error, stdout, stderr) => {
                try {
                    if (error || !stdout) {
                        resolve({
                            exists: false,
                            running: false,
                            error: `Serviço "${serviceName}" não encontrado no sistema`
                        });
                        return;
                    }
                    
                    // Verificar se o serviço existe e seu status
                    if (stdout.includes('Running')) {
                        resolve({
                            exists: true,
                            running: true,
                            status: 'running',
                            error: null
                        });
                    } else if (stdout.includes('Stopped')) {
                        resolve({
                            exists: true,
                            running: false,
                            status: 'stopped',
                            error: null
                        });
                    } else {
                        resolve({
                            exists: false,
                            running: false,
                            error: `Serviço "${serviceName}" não encontrado no sistema`
                        });
                    }
                } catch (err) {
                    resolve({
                        exists: false,
                        running: false,
                        error: err.message
                    });
                }
            });
        });
    }

    async sendDiscordNotification(serviceConfig, oldStatus, newStatus) {
        try {
            if (!this.hook) {
                logger.warn('Webhook não inicializado');
                return;
            }

            const hostname = os.hostname();
            const timestamp = new Date().toLocaleString('pt-BR');
            const displayName = serviceConfig.displayName || serviceConfig.name;
            
            let embed;
            
            if (newStatus.running) {
                // Serviço iniciou/recuperou
                embed = new MessageBuilder()
                    .setTitle('✅ Serviço Iniciado')
                    .setDescription(`**${displayName}** está rodando`)
                    .addField('📡 Servidor', hostname || 'Unknown', true)
                    .addField('⏰ Horário', timestamp, true)
                    .addField('🔄 Status Anterior', oldStatus && oldStatus.running ? 'Rodando' : 'Parado', true)
                    .setColor('#00ff00')
                    .setFooter('Service Monitor v1.0')
                    .setTimestamp();
            } else {
                // Serviço parou
                embed = new MessageBuilder()
                    .setTitle('❌ Serviço Parado')
                    .setDescription(`**${displayName}** parou de funcionar`)
                    .addField('📡 Servidor', hostname || 'Unknown', true)
                    .addField('⏰ Horário', timestamp, true)
                    .addField('🔧 Status', newStatus.status || 'stopped', true)
                    .setColor('#ff0000')
                    .setFooter('Service Monitor v1.0')
                    .setTimestamp();
                
                if (newStatus.error) {
                    embed.addField('⚠️ Erro', `\`\`\`${newStatus.error.substring(0, 1000)}\`\`\``, false);
                }
            }
            
            await this.hook.send(embed);
            logger.info(`Notificação Discord enviada para ${serviceConfig.name}`);
            
        } catch (error) {
            logger.error('Erro ao enviar notificação Discord:', error.message);
        }
    }

    async attemptRestart(serviceName, displayName) {
        return new Promise(async (resolve) => {
            const { exec } = require('child_process');
            const path = require('path');
            const fs = require('fs').promises;
            const os = require('os');
            
            try {
                // Arquivo temporário para capturar resultado
                const tempFile = path.join(os.tmpdir(), `restart-${serviceName}-${Date.now()}.txt`);
                
                // Caminho do script PowerShell elevado
                const scriptPath = path.join(__dirname, 'scripts', 'restart-service.ps1');
                
                // Comando que executa o script com elevação de privilégios
                const elevateCommand = `Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', '${scriptPath}', '-ServiceName', '${serviceName}', '-OutputFile', '${tempFile}' -Wait`;
                
                // Executar comando de elevação
                exec(`powershell -Command "${elevateCommand}"`, { windowsHide: true }, async (error, stdout, stderr) => {
                    try {
                        // Aguardar o arquivo ser criado (com timeout)
                        let attempts = 0;
                        while (attempts < 10) {
                            try {
                                const result = await fs.readFile(tempFile, 'utf-8');
                                const output = result.trim().toUpperCase();
                                
                                logger.info(`Resultado do restart: ${output}`);
                                
                                // Limpar arquivo temporário
                                await fs.unlink(tempFile).catch(() => {});
                                
                                if (output.includes('SUCCESS')) {
                                    logger.info(`Serviço ${serviceName} reiniciado com sucesso`);
                                    
                                    // Notificar no Discord sobre o restart
                                    const hostname = os.hostname();
                                    const timestamp = new Date().toLocaleString('pt-BR');
                                    
                                    const embed = new MessageBuilder()
                                        .setTitle('🔄 Serviço Reiniciado')
                                        .setDescription(`**${displayName}** foi reiniciado automaticamente`)
                                        .addField('📡 Servidor', hostname || 'Unknown', true)
                                        .addField('⏰ Horário', timestamp, true)
                                        .setColor('#ffa500')
                                        .setFooter('Service Monitor v1.0')
                                        .setTimestamp();
                                    
                                    if (this.hook) {
                                        this.hook.send(embed).catch(err => {
                                            logger.error('Erro ao enviar notificação de restart:', err.message);
                                        });
                                    }
                                    
                                    resolve(true);
                                } else {
                                    logger.error(`Falha ao reiniciar ${serviceName}: ${output}`);
                                    resolve(false);
                                }
                                return;
                            } catch (readErr) {
                                // Arquivo ainda não existe, tentar novamente
                                attempts++;
                                await new Promise(r => setTimeout(r, 200));
                            }
                        }
                        
                        // Timeout: arquivo não foi criado
                        logger.error(`Timeout ao aguardar resultado do restart de ${serviceName}`);
                        resolve(false);
                    } catch (err) {
                        logger.error(`Erro ao processar restart de ${serviceName}:`, err.message);
                        resolve(false);
                    }
                });
                
            } catch (err) {
                logger.error(`Erro ao iniciar restart de ${serviceName}:`, err.message);
                resolve(false);
            }
        });
    }

    async monitorService(serviceConfig) {
        try {
            const currentStatus = await this.checkServiceStatus(serviceConfig.name);
            const previousStatus = this.serviceStatus.get(serviceConfig.name);
            /* console.log(`Monitoring Service: ${serviceConfig.name}`);
            console.log('Previous Status:')
            console.log(previousStatus)
            console.log('Current Status:')
            console.log(currentStatus) */


            // Log detalhado para debug
            logger.debug(`[${new Date().toLocaleTimeString('pt-BR')}] Verificando ${serviceConfig.name}:`);
            logger.debug(`  Status Anterior: ${previousStatus ? (previousStatus.running ? '✓ Rodando' : '✗ Parado') : 'Nunca verificado'}`);
            logger.debug(`  Status Atual: ${currentStatus.running ? '✓ Rodando' : '✗ Parado'}`);
            
            // Primeira verificação ou status mudou
            if (previousStatus === null || previousStatus.running !== currentStatus.running) {
                logger.warn(`⚠️  MUDANÇA DETECTADA em ${serviceConfig.name}: ${currentStatus.running ? 'Rodando' : 'Parado'}`);
                
                // Enviar notificação
                await this.sendDiscordNotification(serviceConfig, previousStatus || {}, currentStatus);
                
                // Se parou e tem restart habilitado
                if (!currentStatus.running && serviceConfig.restartOnFailure) {
                    const retries = this.retryCount.get(serviceConfig.name) + 1;
                    this.retryCount.set(serviceConfig.name, retries);
                    
                    logger.warn(`🔴 Serviço ${serviceConfig.name} PAROU! Tentativa ${retries}/${CONFIG.maxRetries}`);
                    
                    if (retries <= CONFIG.maxRetries) {
                        logger.info(`🔄 Tentando reiniciar ${serviceConfig.name}...`);
                        const success = await this.attemptRestart(serviceConfig.name, serviceConfig.displayName);
                        
                        if (success) {
                            logger.info(`✅ Restart bem-sucedido para ${serviceConfig.name}`);
                            this.retryCount.set(serviceConfig.name, 0);
                        } else {
                            logger.error(`❌ Restart FALHOU para ${serviceConfig.name}`);
                        }
                    } else {
                        logger.error(`🚫 Máximo de tentativas excedido para ${serviceConfig.name}`);
                    }
                } else if (currentStatus.running) {
                    // Resetar contador se voltou a funcionar
                    logger.info(`✅ Serviço ${serviceConfig.name} recuperado!`);
                    this.retryCount.set(serviceConfig.name, 0);
                }
            }
            
            // Atualizar status
            this.serviceStatus.set(serviceConfig.name, currentStatus);
            
        } catch (error) {
            logger.error(`Erro ao monitorar ${serviceConfig.name}:`, error.message);
        }
    }

    async start() {
        try {
            await this.loadServices();
            
            // Enviar mensagem de inicialização
            if (this.services.length > 0 && this.hook) {
                try {
                    const hostname = os.hostname();
                    const servicesList = this.services
                        .map(s => `• ${s.displayName || s.name}`)
                        .join('\n');
                    
                    const embed = new MessageBuilder()
                        .setTitle('🚀 Service Monitor Iniciado')
                        .setDescription(`Monitorando **${this.services.length}** serviços no servidor`)
                        .addField('📡 Servidor', hostname || 'Unknown', true)
                        .addField('⏰ Iniciado em', new Date().toLocaleString('pt-BR'), true)
                        .addField('👁️ Serviços Monitorados', servicesList || 'Nenhum', false)
                        .setColor('#0099ff')
                        .setFooter('Service Monitor v1.0')
                        .setTimestamp();
                    
                    await this.hook.send(embed);
                    logger.info('Mensagem de inicialização enviada para Discord');
                } catch (error) {
                    logger.error('Erro ao enviar mensagem de inicialização:', error.message);
                }
            }
            
            logger.info(`Iniciando monitoramento de ${this.services.length} serviços`);
            logger.info(`Intervalo de verificação: ${CONFIG.checkInterval / 1000} segundos`);
            
            // Verificar todos os serviços imediatamente
            logger.info('▶️  Executando primeira verificação...');
            for (const service of this.services) {
                await this.monitorService(service);
            }
            
            // Configurar intervalo de verificação
            let checkCount = 0;
            setInterval(async () => {
                checkCount++;
                const timestamp = new Date().toLocaleTimeString('pt-BR');
                logger.info(`\n📍 VERIFICAÇÃO #${checkCount} - ${timestamp}`);
                
                for (const service of this.services) {
                    await this.monitorService(service);
                }
                
                logger.info(`✅ Verificação #${checkCount} concluída\n`);
            }, CONFIG.checkInterval);
            
            logger.info('Monitor em execução. Pressione Ctrl+C para parar.');
            
        } catch (error) {
            logger.error('Erro ao iniciar monitor:', error.message);
            process.exit(1);
        }
    }
}

// Inicializar
const monitor = new ServiceMonitor();
monitor.start();

// Tratamento de sinais para desligamento gracioso
process.on('SIGINT', () => {
    logger.info('Monitor sendo encerrado...');
    process.exit(0);
});