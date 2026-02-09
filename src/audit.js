const fs = require('fs').promises;
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
