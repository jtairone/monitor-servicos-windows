const Sequelize = require('sequelize');
const conexao = new Sequelize({
    dialect: 'sqlite',
    storage: './src/database/banco.sqlite',
    logging: false
});

module.exports = conexao;