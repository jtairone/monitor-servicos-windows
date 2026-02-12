const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const auth = require('./src/auth');
const audit = require('./src/audit');
const { exec, spawn } = require('child_process');
const logger = require('./src/logger');
const { getUsers } = require('./src/getSets/getSetUsers');
const { 
    runServiceAction, 
    getServicesStatusMap, 
    loginLimiter, 
    serviceLimiter
} = require('./src/funcoes');
const { getServicesAll, getService, setService, delService } = require('./src/getSets/getSetServices');
const { getConfig, setUpdateConfig } = require('./src/getSets/getSetConfig');
const { validators } = require('./src/validators');
// Página principal
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Página de login
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Página de registro
router.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// API de login
router.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Usuário e senha são obrigatórios' });
    }

    const result = await auth.login(username, password);
    await audit.logAction(username, 'LOGIN', { ip: req.ip }, result.success ? 'success' : 'failed');

    if (result.success) {
        return res.json(result);
    }
    return res.status(401).json(result);
});

// API de registro
router.post('/api/register', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Usuário e senha são obrigatórios' });
    }

    const result = await auth.register(username, password);
    
    if (result.success) {
        await audit.logAction(username, 'REGISTER', { ip: req.ip }, 'success');
        return res.json(result);
    }
    
    await audit.logAction(username || 'unknown', 'REGISTER', { ip: req.ip }, 'failed');
    return res.status(400).json(result);
});

// API para verificar se admin existe
router.get('/api/admin-status', async (req, res) => {
    try {
        let adminExists = false;        
        try {
            const users = await getUsers();
            adminExists = users.length > 0;
        } catch (error) {
            // Arquivo não existe ainda
            console.log(error);
            adminExists = false;
        }
        res.json({ adminExists });
    } catch (error) {
        res.json({ adminExists: false });
    }
});

// API de logout
router.post('/api/logout', auth.authMiddleware, async (req, res) => {
    await audit.logAction(req.user.username, 'LOGOUT', { ip: req.ip });
    res.json({ success: true, message: 'Logout realizado com sucesso' });
});

// Verificar token
router.get('/api/verify-token', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ valid: false });
    }
    const decoded = auth.verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ valid: false });
    }
    res.json({ valid: true, user: decoded });
});

// API: Descobrir serviços (rodar discover-services.js)
try {
    router.post('/api/discover-services', auth.authMiddleware, async (req, res) => {
    try {
        logger.info('Iniciando descoberta de serviços...');
        
        return new Promise((resolve) => {
            // Comando PowerShell melhorado que traz o Status em texto
            const psCommand = `powershell -NoProfile -Command "Get-Service | Select-Object Name, DisplayName, Status | ConvertTo-Json"`;
            
            exec(psCommand, 
                { shell: 'cmd.exe', maxBuffer: 1024 * 1024 * 10, timeout: 30000 }, 
                async (error, stdout, stderr) => {
                    try {
                        if (error || !stdout) {
                            logger.error('Erro ao executar PowerShell:', error?.message || 'Sem saída');
                            logger.error('Stderr:', stderr);
                            return res.status(500).json({ error: 'Erro ao descobrir serviços: ' + (error?.message || stderr) });
                        }
                        
                        // Remover linhas em branco
                        const cleanOutput = stdout.trim();
                        if (!cleanOutput) {
                            return res.status(500).json({ error: 'PowerShell não retornou dados' });
                        }
                        
                        const services = JSON.parse(cleanOutput);
                        
                        // Processar array ou objeto único
                        let serviceArray = Array.isArray(services) ? services : [services];
                        
                        // Mapear para o formato desejado com mapeamento de status
                        const processedServices = serviceArray.map(s => {
                            let status = 'Unknown';
                            
                            // Converter Status para texto
                            if (typeof s.Status === 'number') {
                                // Enum do PowerShell: 1=Stopped, 2=Start Pending, 3=Stop Pending, 
                                // 4=Running, 5=Continue Pending, 6=Pause Pending, 7=Paused
                                status = (s.Status === 4) ? 'Running' : 'Stopped';
                            } else if (typeof s.Status === 'string') {
                                // Se vier como string, normalizar
                                status = s.Status.toLowerCase().includes('running') ? 'Running' : 'Stopped';
                            }
                            
                            return {
                                name: s.Name,
                                displayName: s.DisplayName || s.Name,
                                status: status
                            };
                        });
                        
                        // Salvar no discovered-services.json
                        const discoveredPath = path.join(__dirname, './src/discovered-services.json');
                        await fs.writeFile(discoveredPath, JSON.stringify(processedServices, null, 2));
                        
                        logger.info(`Descobertos ${processedServices.length} serviços`);
                        res.json({ 
                            success: true, 
                            services: processedServices,
                            count: processedServices.length 
                        });
                        await audit.logAction(req.user.username, 'DISCOVER_SERVICES', { count: processedServices.length, ip: req.ip });
                        resolve();
                    } catch (parseError) {
                        logger.error('Erro ao processar resposta:', parseError.message);
                        logger.error('Output recebido:', stdout);
                        res.status(500).json({ error: 'Erro ao processar serviços: ' + parseError.message });
                        resolve();
                    }
                }
            );
        });
        
    } catch (error) {
        logger.error('Erro na rota discover-services:', error.message);
        res.status(500).json({ error: error.message });
    }
});
} catch (e) {
    console.error('[ERRO na rota POST] :', e.message);
}

// Obter configurações completas (Discord, Monitoramento, Servidor)
router.get('/api/settings', auth.authMiddleware, auth.adminMiddleware, async (req, res) => {
    try {
        const settings = await getConfig();
        // Removemos a lista de serviços para focar apenas nas definições
        //const { services, ...settings } = fullConfig.config || {};
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Salvar configurações
router.post('/api/settings', validators.updateSettings, auth.authMiddleware, auth.adminMiddleware, async (req, res) => {
    try {
        const { 
            discordWebhookUrl, 
            interval, 
            notifyOnStartup, 
            notifyOnRecovery,
            maxRetries,
            logLevel,
            port 
        } = req.body;
        
        const fieldMroutering = {
            servidor_porta: port || 3001,
            monitoring_check_interval: interval || 30000,
            discord_webhook_url: discordWebhookUrl || '',
            discord_send_startup: notifyOnStartup || true,
            discord_notify_recovery: notifyOnRecovery || true,
            monitoring_max_retries: maxRetries || 3,
            monitoring_log_level: logLevel || 'info'
        };
        
        // Escreve no arquivo
        setUpdateConfig(fieldMroutering);
        // Log de auditoria
        await audit.logAction(req.user.username, 'UPDATE_SETTINGS', { 
            changes: req.body,
            ip: req.ip 
        });
        
        res.json({ 
            success: true, 
            message: "Configurações salvas! Reinicie o servidor para aplicar os novos parâmetros.",
            changes: req.body
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AUDIT LOGS ENDPOINT
router.get('/api/audit-logs', auth.authMiddleware, async (req, res) => {
    try {
        const logs = await audit.getAuditLogs(500); // últimos 500 eventos
        res.json({ logs });
    } catch (error) {
        logger.error(`Erro ao obter logs de auditoria: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter logs de auditoria'
        });
    }
});

// ALIAS ENDPOINTS (para compatibilidade com novo frontend Phase 2)
// GET /api/list-services (alias para /api/monitored-services)
router.get('/api/list-services', auth.authMiddleware, async (req, res) => {
    try {
        const services = await getServicesAll()
        const statusMap = await getServicesStatusMap(services.map(s => s.name));
        
        const withStatus = services.map(s => ({
            ...s,
            status: statusMap.get(s.name) || 'unknown'
        }));
        
        res.json({ services: withStatus });
    } catch (error) {
        logger.error('Erro ao carregar services:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/add-service (alias para /api/add-monitored-service)
router.post('/api/add-service', validators.addService, auth.authMiddleware,  async (req, res) => {
    try {
        const { name, displayName, restartOnFailure } = req.body;
        if (!name || !displayName) {
            return res.status(400).json({ error: 'Nome e displayName são obrigatórios' });
        }
        const services = await getServicesAll();
        const exists = services.some(s => s.name === name);
        if (exists) {
            return res.status(400).json({ error: 'Serviço já está sendo monitorado' });
        }
        setService({ name, displayName, restartOnFailure: Boolean(restartOnFailure) });        
        audit.logAction(req.user.username, 'ADD_SERVICE', { ip: req.ip, serviceName: name }, 'success');
        res.json({ success: true, message: 'Serviço adicionado com sucesso' });
    } catch (error) {
        audit.logAction(req.user?.username || 'unknown', 'ADD_SERVICE', '', 'failed');
        res.status(500).json({ error: error.message });
    }
});

// POST /api/remove-service (novo)
router.post('/api/remove-service', auth.authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Nome do serviço é obrigatório' });
        }
        await delService(name);
        audit.logAction(req.user.username, 'REMOVE_SERVICE', { ip: req.ip, serviceName: name }, 'success');
        res.json({ success: true, message: 'Serviço removido com sucesso' });
    } catch (error) {
        audit.logAction(req.user?.username || 'unknown', 'REMOVE_SERVICE', '', 'failed');
        res.status(500).json({ error: error.message });
    }
});

// POST /api/service/start
router.post('/api/service/start', auth.authMiddleware, serviceLimiter, async (req, res) => {
    try {
        const { serviceName } = req.body;
        const result = await runServiceAction(serviceName, 'start');
        if (!result) throw new Error('Falha ao iniciar o serviço');
        
        audit.logAction(req.user.username, 'START', { ip: req.ip, serviceName }, 'success');
        res.json({ success: true, message: `Serviço ${serviceName} iniciado com sucesso!` });
    } catch (error) {
        audit.logAction(req.user?.username || 'unknown', 'START', {serviceName}, 'failed');
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/service/stop
router.post('/api/service/stop', auth.authMiddleware, serviceLimiter, async (req, res) => {
    try {
        const { serviceName } = req.body;
        const result = await runServiceAction(serviceName, 'stop');
        if (!result) throw new Error('Falha ao parar o serviço');
        
        audit.logAction(req.user.username, 'STOP', { ip: req.ip, serviceName }, 'success');
        res.json({ success: true, message: `Serviço ${serviceName} parado com sucesso!` });
    } catch (error) {
        audit.logAction(req.user?.username || 'unknown', 'STOP', {serviceName}, 'failed');
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/service/restart
router.post('/api/service/restart', auth.authMiddleware, serviceLimiter, async (req, res) => {
    try {
        const { serviceName } = req.body;
        const result = await runServiceAction(serviceName, 'restart');
        if (!result) throw new Error('Falha ao reiniciar o serviço');
        
        audit.logAction(req.user.username, 'RESTART', { ip: req.ip, serviceName }, 'success');
        res.json({ success: true, message: `Serviço ${serviceName} reiniciado com sucesso!` });
    } catch (error) {
        audit.logAction(req.user?.username || 'unknown', 'RESTART', {serviceName}, 'failed');
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;