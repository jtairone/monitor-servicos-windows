const Sequelize = require('sequelize');
const conexao = require('../database/bancodados');

const Services = conexao.define('monitored_services', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false
    },
    displayName: {
        type: Sequelize.STRING,
        allowNull: false
    },
    restartOnFailure: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    }
});

conexao.sync();

module.exports = Services;