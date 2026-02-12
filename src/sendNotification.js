const os = require('os');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const logger = require('./logger');
const { getConfig } = require('./getSets/getSetConfig');
const { getServicesAll } = require('./getSets/getSetServices');

// ✅ CRIAR HOOK COMO NULL INICIALMENTE
let hook = null;

// ✅ FUNÇÃO PARA INICIALIZAR O HOOK
async function initializeHook() {
    try {
        const CONFIG = await getConfig();
        if (CONFIG?.discord_webhook_url) {
            hook = new Webhook(CONFIG.discord_webhook_url);
            hook.setUsername('Windows Service Monitor');
            logger.info('Webhook Discord inicializado com sucesso');
        }
    } catch (error) {
        logger.error('Erro ao inicializar webhook:', error.message);
        hook = null;
    }
}

// ✅ INICIALIZAR AUTOMATICAMENTE
(async () => {
    await initializeHook();
})();

async function sendDiscordNotification(serviceConfig, oldStatus, newStatus) {
        try {
            const CONFIG = await getConfig();
            const SERVICES = await getServicesAll();
            
            // ✅ VERIFICAR SE O HOOK PRECISA SER RECRIADO
            if (!hook || hook.webhookUrl !== CONFIG.discord_webhook_url) {
                await initializeHook();
                if (!hook) {
                    throw new Error('Não foi possível inicializar webhook');
                }
            }
            
            // Validar services
            if (!SERVICES || typeof SERVICES !== 'object') {
                throw new Error('Serviços para monitorar não configurados');
            }
            // Validar webhook URL
            if (!CONFIG.discord_webhook_url || typeof CONFIG.discord_webhook_url !== 'string') {
                throw new Error('Webhook URL do Discord não configurado');
            }

            if (!hook) {
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
                    .setFooter('Service Monitor v3.0')
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
                    .setFooter('Service Monitor v3.0')
                    .setTimestamp();
                
                if (newStatus.error) {
                    embed.addField('⚠️ Erro', `\`\`\`${newStatus.error.substring(0, 1000)}\`\`\``, false);
                }
            }
            
            await hook.send(embed);
            logger.info(`Notificação Discord enviada para ${serviceConfig.name}`);
            
        } catch (error) {
            logger.error('Erro ao enviar notificação Discord:', error.message);
        }
  }
  //sendDiscordNotification({ name: 'Example Service', displayName: 'Serviço Exemplo' }, { running: false }, { running: true });
  
  // ✅ EXPORTAR EXATAMENTE COMO ERA ANTES
  module.exports = { sendDiscordNotification, hook, initializeHook };