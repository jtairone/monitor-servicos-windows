const { Service } = require('node-windows');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const {sendDiscordNotification, hook } = require('./sendNotification');
const { getServicesAll } = require('./getSets/getSetServices');
const { getConfig } = require('./getSets/getSetConfig');

class ServiceMonitor {
    constructor() {
        this.services = [];
        this.serviceStatus = new Map();
        this.retryCount = new Map();
        this.config = { monitoring_check_interval: 30000, monitoring_max_retries: 3, discord_webhook_url: '' };
    }

    async loadServices() {
        try {
            this.config = await getConfig();
            this.services = await getServicesAll();
            
            if (this.services.length === 0) {
                logger.warn('⚠️  Nenhum serviço configurado ainda. O monitor continuará aguardando...');
                logger.info('💡 Adicione serviços através da interface web para começar o monitoramento');
                return; // Não lança erro, apenas avisa
            }
            
            logger.info(`Carregados ${this.services.length} serviços para monitoramento`);
            if (this.config?.discord_webhook_url) {
                logger.info(`Webhook Discord URL: ${this.config.discord_webhook_url.substring(0, 50)}...`);
            }
            
            // Inicializar status apenas para serviços existentes
            for (const service of this.services) {
                if (!this.serviceStatus.has(service.name)) this.serviceStatus.set(service.name, null);
                if (!this.retryCount.has(service.name)) this.retryCount.set(service.name, 0);
            }
            
        } catch (error) {
            logger.error('Erro ao carregar serviços:', error);
            // Não lança erro aqui, permite que o monitor continue tentando
            this.services = [];
        }
    }

    async checkServiceStatus(serviceName) {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            
            // Usar PowerShell para verificar o status do serviço
            const psCommand = `(Get-Service -Name '${serviceName}' -ErrorAction SilentlyContinue).Status`;
            
            exec(`powershell -NoProfile -Command "${psCommand}"`, 
                { shell: 'powershell.exe', windowsHide: true, timeout: 10000 }, 
                (error, stdout, stderr) => {
                    try {
                        const status = stdout.trim().toLowerCase();
                        
                        if (status === 'running') {
                            resolve({
                                exists: true,
                                running: true,
                                status: 'running',
                                error: null
                            });
                        } else if (status === 'stopped') {
                            resolve({
                                exists: true,
                                running: false,
                                status: 'stopped',
                                error: null
                            });
                        } else if (status === '' || error) {
                            resolve({
                                exists: false,
                                running: false,
                                error: `Serviço "${serviceName}" não encontrado no sistema`
                            });
                        } else {
                            resolve({
                                exists: true,
                                running: false,
                                status: status,
                                error: null
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

    async attemptRestart(serviceName, displayName) {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            const path = require('path');
            const fs = require('fs').promises;
            const os = require('os');
            
            try {
                // Criar script batch que faz o restart
                const batFile = path.join(os.tmpdir(), `restart-${serviceName}-${Date.now()}.bat`);
                const logFile = path.join(os.tmpdir(), `restart-${serviceName}-${Date.now()}.log`);
                
                const batContent = `@echo off
net stop "${serviceName}" /y >>"${logFile}" 2>&1
timeout /t 1 /nobreak >nul
net start "${serviceName}" >>"${logFile}" 2>&1
if %ERRORLEVEL% equ 0 (
    echo SUCCESS>>"${logFile}"
) else (
    echo FAILED>>"${logFile}"
)
`;
                
                // Escrever arquivo bat
                fs.writeFile(batFile, batContent, 'utf8').then(() => {
                    // Executar com elevação
                    const elevateCmd = `powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','${batFile}' -Verb RunAs -Wait -WindowStyle Hidden"`;
                    
                    exec(elevateCmd, { windowsHide: true, timeout: 40000 }, async (error, stdout, stderr) => {
                        // Aguardar arquivo de log ser criado
                        await new Promise(r => setTimeout(r, 2000));
                        
                        try {
                            const logContent = await fs.readFile(logFile, 'utf8');
                            const output = logContent.toUpperCase();
                            
                            logger.info(`[${serviceName}] Resultado: ${output.substring(0, 100)}`);
                            
                            // Limpar arquivos temporários
                            await fs.unlink(batFile).catch(() => {});
                            await fs.unlink(logFile).catch(() => {});
                            
                            if (output.includes('SUCCESS')) {
                                logger.info(`✅ Serviço ${serviceName} reiniciado com sucesso`);
                                
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
                                
                                if (hook) {
                                    hook.send(embed).catch(err => {
                                        logger.error('Erro ao enviar notificação:', err.message);
                                    });
                                }
                                
                                resolve(true);
                            } else {
                                logger.error(`❌ Falha ao reiniciar ${serviceName}`);
                                resolve(false);
                            }
                        } catch (readErr) {
                            logger.error(`Erro ao ler resultado do restart:`, readErr.message);
                            resolve(false);
                        }
                    });
                }).catch(writeErr => {
                    logger.error(`Erro ao criar arquivo restart:`, writeErr.message);
                    resolve(false);
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
            // Log detalhado para debug
            logger.debug(`[${new Date().toLocaleTimeString('pt-BR')}] Verificando ${serviceConfig.name}:`);
            logger.debug(`  Status Anterior: ${previousStatus ? (previousStatus.running ? '✓ Rodando' : '✗ Parado') : 'Nunca verificado'}`);
            logger.debug(`  Status Atual: ${currentStatus.running ? '✓ Rodando' : '✗ Parado'}`);
            
            // Primeira verificação ou status mudou
            if (previousStatus === null || previousStatus.running !== currentStatus.running) {
                logger.warn(`⚠️  MUDANÇA DETECTADA em ${serviceConfig.name}: ${currentStatus.running ? 'Rodando' : 'Parado'}`);
                
                // Enviar notificação
                await sendDiscordNotification(serviceConfig, previousStatus || {}, currentStatus);
                
                // Se parou e tem restart habilitado
                if (!currentStatus.running && serviceConfig.restartOnFailure) {
                    const retries = this.retryCount.get(serviceConfig.name) + 1;
                    this.retryCount.set(serviceConfig.name, retries);
                    
                    logger.warn(`🔴 Serviço ${serviceConfig.name} PAROU! Tentativa ${retries}/${this.config.monitoring_max_retries}`);
                    
                    if (retries <= this.config.monitoring_max_retries) {
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
            // Garantir que o hook está inicializado com a URL correta
            if (this.config?.discord_webhook_url) {
                const { hook: discordHook } = require('./sendNotification');
                if (!discordHook) {
                    const { initializeHook } = require('./sendNotification');
                    await initializeHook?.();
                }
            }
            
            // Enviar mensagem de inicialização (apenas se Discord está configurado E habilitado)
            if (this.services.length > 0 && 
                this.config?.discord_webhook_url && 
                this.config?.discord_send_startup === true) {
                try {
                    const { hook: discordHook } = require('./sendNotification');
                    if (discordHook) {
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
                            .setFooter('Service Monitor v3.0')
                            .setTimestamp();
                        
                        await discordHook.send(embed);
                        logger.info('Mensagem de inicialização enviada para Discord');
                    } else {
                        logger.warn('Webhook Discord não está disponível para mensagem de inicialização');
                    }
                } catch (error) {
                    logger.error('Erro ao enviar mensagem de inicialização:', error.message);
                }
            } else if (!this.config?.discord_send_startup) {
                logger.info('Notificação de inicialização desabilitada nas configurações');
            }
            
            if (this.services.length > 0) {
                logger.info(`Iniciando monitoramento de ${this.services.length} serviços`);
                logger.info(`Intervalo de verificação: ${this.config.monitoring_check_interval / 1000} segundos`);
                
                // Verificar todos os serviços imediatamente
                logger.info('▶️  Executando primeira verificação...');
                for (const service of this.services) {
                    await this.monitorService(service);
                }
            } else {
                logger.info('⏳ Monitor aguardando serviços serem adicionados...');
                logger.info(`Intervalo de verificação: ${this.config.monitoring_check_interval / 1000} segundos`);
            }
            
            // Loop de verificação com intervalo dinâmico (lê do services.json a cada ciclo)
            let checkCount = 0;
            const loop = async () => {
                checkCount++;
                const timestamp = new Date().toLocaleTimeString('pt-BR');
                logger.info(`\n📍 VERIFICAÇÃO #${checkCount} - ${timestamp}`);

                // Recarregar configurações a cada ciclo (sem precisar reiniciar)
                // Isso permite alterar restartOnFailure / lista de serviços / checkInterval em tempo real.
                try {
                    await this.loadServices();
                } catch (e) {
                    logger.error('Erro ao recarregar configurações:', e.message);
                }
                
                // Só monitorar se houver serviços configurados
                if (this.services.length > 0) {
                    for (const service of this.services) {
                        await this.monitorService(service);
                    }
                    logger.info(`✅ Verificação #${checkCount} concluída (${this.services.length} serviços)\n`);
                } else {
                    logger.info(`⏳ Verificação #${checkCount} - Aguardando serviços...\n`);
                }

                const interval = this.config?.monitoring_check_interval || 30000;
                setTimeout(loop, interval);
            };

            // Inicia o loop dinâmico
            setTimeout(loop, this.config.monitoring_check_interval);
            
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