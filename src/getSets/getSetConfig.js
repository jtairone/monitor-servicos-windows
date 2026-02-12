const tbConfig = require('../models/monitoring_config');

async function getConfig() {
    try {
        const config = await tbConfig.findOne({ where: { id: 1 }, raw: true } );
        
        // Se não encontrar configuração, retornar valores padrão
        if (!config) {
            console.log('⚠️  Configuração não encontrada, usando valores padrão');
            return {
                id: 1,
                servidor_porta: 3000,
                discord_webhook_url: '',
                discord_send_startup: true,
                discord_notify_recovery: true,
                monitoring_check_interval: 30000,
                monitoring_max_retries: 3,
                monitoring_log_level: 'info'
            };
        }
        
        return config;
    } catch (error) {
        console.error('Erro ao obter configuração:', error);
        // Em caso de erro, retornar valores padrão em vez de lançar exceção
        console.log('⚠️  Usando valores padrão devido ao erro');
        return {
            id: 1,
            servidor_porta: 3000,
            discord_webhook_url: '',
            discord_send_startup: true,
            discord_notify_recovery: true,
            monitoring_check_interval: 30000,
            monitoring_max_retries: 3,
            monitoring_log_level: 'info'
        };
    }
}

async function setUpdateConfig(data) {
    try {
      const configA = await getConfig()
        if (configA && configA.id) {
          const config = await tbConfig.update(data, { where: { id: 1 } });
          return config;
        } else {
          const config = await tbConfig.create(data);
          return config;
        } 
    } catch (error) {
        console.error('Erro ao obter os usuários:', error);
        throw error;
    }
  }


module.exports = { getConfig, setUpdateConfig };