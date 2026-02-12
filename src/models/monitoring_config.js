const Sequelize = require('sequelize');
const conexao = require('../database/bancodados');

const Config = conexao.define('monitoring_config', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    servidor_porta: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3001
    },
    discord_webhook_url: {
        type: Sequelize.STRING(500),
        allowNull: false
    },
    discord_send_startup: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    discord_notify_recovery: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    monitoring_check_interval: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30000
    },
    monitoring_max_retries: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3
    },
    monitoring_log_level: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'info'
    }
}, {
    // Opções adicionais do modelo
    timestamps: false, // Desativa createdAt/updatedAt automáticos
    freezeTableName: true // Impede pluralização automática
});

// Não sincronizar aqui - a inicialização é feita em src/database/init.js
module.exports = Config;