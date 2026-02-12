const Sequelize = require('sequelize');
const conexao = require('../database/bancodados');

const AuditLog = conexao.define('audit_logs', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    username: {
        type: Sequelize.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    action: {
        type: Sequelize.STRING(50),
        allowNull: false,
        validate: {
            notEmpty: true,
            isIn: [['LOGIN', 'LOGOUT', 'REGISTER', 'START', 'STOP', 'RESTART', 
                   'ADD_SERVICE', 'REMOVE_SERVICE', 'UPDATE_SETTINGS', 'CHANGE_PASSWORD', 'DISCOVER_SERVICES']]
        }
    },
    status: {
        type: Sequelize.STRING(20),
        defaultValue: 'success',
        validate: {
            isIn: [['success', 'failed']]
        }
    },
    details: {
        type: Sequelize.TEXT,
        defaultValue: '{}',
        get() {
            const value = this.getDataValue('details');
            return typeof value === 'string' ? JSON.parse(value) : value;
        },
        set(value) {
            this.setDataValue('details', typeof value === 'string' ? value : JSON.stringify(value));
        }
    },
    ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
    },
    createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    }
}, {
    timestamps: false,
    freezeTableName: true/* ,
    indexes: [
        { fields: ['username'] },
        { fields: ['action'] },
        { fields: ['createdAt'] }
    ] */
});

conexao.sync();

module.exports = AuditLog;