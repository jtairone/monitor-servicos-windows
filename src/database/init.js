const conexao = require('./bancodados');
const Config = require('../models/monitoring_config');
const Users = require('../models/users');
const Services = require('../models/services');
const AuditLog = require('../models/audit_logs');
const fs = require('fs');
const path = require('path');

/**
 * Inicializa o banco de dados criando todas as tabelas e dados padrão
 */
async function initializeDatabase() {
    try {
        console.log('🔄 Inicializando banco de dados...');
        
        // Garantir que o diretório do banco existe
        const dbDir = path.join(__dirname);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log('📁 Diretório do banco criado');
        }
        
        // Sincronizar todas as tabelas (cria se não existirem)
        await conexao.sync({ force: false }); // force: false = não recria tabelas existentes
        console.log('✅ Tabelas sincronizadas');
        
        // Verificar se já existe configuração padrão
        const existingConfig = await Config.findOne({ where: { id: 1 } });
        
        if (!existingConfig) {
            console.log('📝 Criando configuração padrão...');
            await Config.create({
                id: 1,
                servidor_porta: 3000,
                discord_webhook_url: '',
                discord_send_startup: true,
                discord_notify_recovery: true,
                monitoring_check_interval: 30000,
                monitoring_max_retries: 3,
                monitoring_log_level: 'info'
            });
            console.log('✅ Configuração padrão criada');
        } else {
            console.log('ℹ️  Configuração já existe, pulando criação');
        }
        
        console.log('✅ Banco de dados inicializado com sucesso');
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao inicializar banco de dados:', error.message);
        throw error;
    }
}

module.exports = { initializeDatabase };
