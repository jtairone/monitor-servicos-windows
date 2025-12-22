//const fs = require('fs');
const os = require('os');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const logger = require('./logger');

async function sendDiscordNotification(serviceConfig, oldStatus, newStatus) {
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

  module.exports = sendDiscordNotification;