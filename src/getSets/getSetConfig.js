const tbConfig = require('../models/monitoring_config');

async function getConfig() {
    try {
        const config = await tbConfig.findOne({ where: { id: 1 }, raw: true } );
        return config;
    } catch (error) {
        console.error('Erro ao obter os usuários:', error);
        throw error;
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