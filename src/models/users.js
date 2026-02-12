const Sequelize = require('sequelize');
const conexao = require('../database/bancodados');

const Users = conexao.define('users', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    username: {
        type: Sequelize.STRING,
        allowNull: false
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    },
    role: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'admin'
    }
});

// Não sincronizar aqui - a inicialização é feita em src/database/init.js
module.exports = Users;