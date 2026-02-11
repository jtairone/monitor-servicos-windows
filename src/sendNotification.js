//const fs = require('fs');
const os = require('os');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const logger = require('./logger');
const CONFIG = require('../data/services.json');

// Validar services
if (!CONFIG.services || typeof CONFIG.services !== 'object') {
    throw new Error('Serviços para monitorar não configurado em services.json');
}
// Validar webhook URL
if (!CONFIG.discord.webhookUrl || typeof CONFIG.discord.webhookUrl !== 'string') {
    throw new Error('Webhook URL do Discord não configurado em services.json');
}

const services = CONFIG.services || [];
const servicesStatus = new Map();
const retryCount = new Map();
//const IMAGE_URL = 'https://api.redux.ind.br:2096/img/logofolha_redux.png';
// Inicializar webhook do Discord
const hook = new Webhook(CONFIG.discord.webhookUrl);
hook.setUsername('Windows Service Monitor');
//hook.setAvatar(IMAGE_URL);


async function sendDiscordNotification(serviceConfig, oldStatus, newStatus) {
        try {
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
            
            await hook.send(embed);
            logger.info(`Notificação Discord enviada para ${serviceConfig.name}`);
            
        } catch (error) {
            logger.error('Erro ao enviar notificação Discord:', error.message);
        }
  }
  //sendDiscordNotification({ name: 'Example Service', displayName: 'Serviço Exemplo' }, { running: false }, { running: true });
  module.exports = { sendDiscordNotification, hook };