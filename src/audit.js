/* const fs = require('fs').promises;
const path = require('path');

const AUDIT_FILE = path.join(__dirname, '../logs/audit.log');

const audit = {
    async logAction(username, action, details = {}, status = 'success') {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                username,
                action,
                status,
                details
            };
            
            const logLine = JSON.stringify(logEntry) + '\n';
            await fs.appendFile(AUDIT_FILE, logLine, 'utf8');
        } catch (error) {
            console.error('Erro ao registrar auditoria:', error.message);
        }
    },

    async getAuditLogs(limit = 100) {
        try {
            const data = await fs.readFile(AUDIT_FILE, 'utf8');
            const logs = data
                .split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line))
                .reverse()
                .slice(0, limit);
            return logs;
        } catch (error) {
            return [];
        }
    }
};

module.exports = audit;
 */

const logger = require('./logger');
const AuditLog = require('./models/audit_logs');

const audit = {
    async logAction(username, action, details = {}, status = 'success') {
        try {
            // Validar entrada
            if (!username || typeof username !== 'string') {
                logger.warn('Auditoria: username inválido');
                return;
            }

            await AuditLog.create({
                username: username.trim(),
                action,
                status,
                details: JSON.stringify(details),
                ip_address: details.ip || null
            });
        } catch (error) {
            logger.error('Erro ao registrar auditoria:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error.code
            });
        }
    },

    async getAuditLogs(limit = 50) {
        try {
            const { count, rows } = await AuditLog.findAndCountAll({
                limit,
                order: [['createdAt', 'DESC']]
            });

            return {
                total: count,
                limit,
                data: rows
            };
        } catch (error) {
            logger.error('Erro ao obter logs:', error.message);
            return { total: 0, limit, data: [] };
        }
    },

    async getAuditLogsByUser(username, limit = 100) {
        try {
            return await AuditLog.findAll({
                where: { username },
                limit,
                order: [['createdAt', 'DESC']]
            });
        } catch (error) {
            logger.error('Erro ao obter logs do usuário:', error.message);
            return [];
        }
    },

    async getAuditLogsByAction(action, limit = 100) {
        try {
            return await AuditLog.findAll({
                where: { action },
                limit,
                order: [['createdAt', 'DESC']]
            });
        } catch (error) {
            logger.error('Erro ao obter logs por ação:', error.message);
            return [];
        }
    }
};

module.exports = audit;