const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const auth = require('./src/auth');
const audit = require('./src/audit');
const { exec, spawn } = require('child_process');
const logger = require('./src/logger');
const { runServiceAction, getServicesStatusMap, loginLimiter, serviceLimiter } = require('./src/funcoes');

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
        const usersFile = path.join(__dirname, 'users.json');
        let adminExists = false;
        console.log(usersFile);
        
        try {
            const data = await fs.readFile(usersFile, 'utf8');
            const users = JSON.parse(data);
            console.log(users.length);
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
        const data = await fs.readFile(path.join(__dirname, 'services.json'), 'utf8');
        const fullConfig = JSON.parse(data);
        // Removemos a lista de serviços para focar apenas nas definições
        const { services, ...settings } = fullConfig;
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Salvar configurações
router.post('/api/settings', auth.authMiddleware, auth.adminMiddleware, async (req, res) => {
    try {
        const newSettings = req.body;
        const filePath = path.join(__dirname, 'services.json');
        const data = await fs.readFile(filePath, 'utf8');
        const fullConfig = JSON.parse(data);
        
        const fieldMroutering = {
            port: fullConfig.servidor?.port,
            interval: fullConfig.monitoring?.checkInterval,
            discordWebhookUrl: fullConfig.discord?.webhookUrl,
            notifyOnStartup: fullConfig.discord?.sendStartupMessage
        };
        
        // Converte os dados achatados para estrutura aninhada
        const Alterados = {};
        const updatedConfig = JSON.parse(JSON.stringify(fullConfig)); // Deep clone

        // Detecta o que foi alterado
        Object.keys(newSettings).forEach(key => {
            const newValue = newSettings[key];
            const oldValue = fieldMroutering[key];
            
            if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
                Alterados[key] = { old: oldValue, new: newValue };
            }
        });

        // Aplica as alterações no updatedConfig
        Object.keys(Alterados).forEach(key => {
            const newValue = Alterados[key].new;
            switch (key) { 
                case 'port':
                    updatedConfig.servidor.port = newValue;
                    break;
                case 'interval': 
                    updatedConfig.monitoring.checkInterval = newValue;
                    break;
                case 'discordWebhookUrl':
                    updatedConfig.discord.webhookUrl = newValue;
                    break;
                case 'notifyOnStartup': 
                    updatedConfig.discord.sendStartupMessage = newValue;
                    break;
                default:
                    break;
            }
        });
        // Se não houve alterações
        if (Object.keys(Alterados).length === 0) {
            return res.json({ 
                success: true, 
                message: "Nenhuma alteração detectada" 
            });
        }

        // Escreve no arquivo
        await fs.writeFile(filePath, JSON.stringify(updatedConfig, null, 2));
        
        // Log de auditoria
        await audit.logAction(req.user.username, 'UPDATE_SETTINGS', { 
            changes: Alterados,
            ip: req.ip 
        });
        
        res.json({ 
            success: true, 
            message: "Configurações salvas! Reinicie o servidor para aplicar os novos parâmetros.",
            changes: Alterados
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Carregar discovered-services.json
/* router.get('/api/discovered-services', auth.authMiddleware, async (req, res) => {
    try {
        const discoveredPath = path.join(__dirname, './src/discovered-services.json');
        const data = await fs.readFile(discoveredPath, 'utf-8');
        const services = JSON.parse(data);
        
        res.json(services);
    } catch (error) {
        logger.error('Erro ao carregar discovered-services:', error.message);
        res.status(500).json({ error: 'Arquivo não encontrado. Execute descoberta primeiro.' });
    }
}); */

// API: Carregar services.json (serviços monitorados)
/* router.get('/api/monitored-services', auth.authMiddleware, async (req, res) => {
    try {
        const servicesPath = path.join(__dirname, 'services.json');
        const data = await fs.readFile(servicesPath, 'utf-8');
        const config = JSON.parse(data);

        const services = config.services || [];
        const statusMap = await getServicesStatusMap(services.map(s => s.name));

        const withStatus = services.map(s => ({
            ...s,
            status: statusMap.get(s.name) || 'Unknown'
        }));

        res.json(withStatus);
    } catch (error) {
        logger.error('Erro ao carregar services.json:', error.message);
        res.status(500).json({ error: error.message });
    }
}); */

// API: Adicionar serviço ao monitoramento
/* router.post('/api/add-monitored-service', auth.authMiddleware, async (req, res) => {
    try {
        const { name, displayName, restartOnFailure } = req.body;
        
        if (!name || !displayName) {
            return res.status(400).json({ error: 'Nome e displayName são obrigatórios' });
        }
        
        const servicesPath = path.join(__dirname, 'services.json');
        const data = await fs.readFile(servicesPath, 'utf-8');
        const config = JSON.parse(data);
        
        // Verificar se serviço já existe
        const exists = config.services.some(s => s.name === name);
        if (exists) {
            return res.status(400).json({ error: 'Serviço já está sendo monitorado' });
        }
        
        // Adicionar novo serviço
        config.services.push({
            name: name,
            displayName: displayName,
            critical: false,
            description: `Adicionado em ${new Date().toLocaleString('pt-BR')}`,
            restartOnFailure: Boolean(restartOnFailure)
        });
        
        // Salvar
        await fs.writeFile(servicesPath, JSON.stringify(config, null, 2));
        
        logger.info(`Serviço ${name} adicionado ao monitoramento`);
        res.json({ 
            success: true, 
            message: `Serviço ${displayName} adicionado com sucesso!`,
            service: config.services[config.services.length - 1]
        });
        
    } catch (error) {
        logger.error('Erro ao adicionar serviço:', error.message);
        res.status(500).json({ error: error.message });
    }
}); */

// API: Remover serviço do monitoramento
/* router.delete('/api/monitored-services/:name', auth.authMiddleware, async (req, res) => {
    try {
        const { name } = req.params;
        
        const servicesPath = path.join(__dirname, 'services.json');
        const data = await fs.readFile(servicesPath, 'utf-8');
        const config = JSON.parse(data);
        
        // Remover serviço
        config.services = config.services.filter(s => s.name !== name);
        
        // Salvar
        await fs.writeFile(servicesPath, JSON.stringify(config, null, 2));
        
        logger.info(`Serviço ${name} removido do monitoramento`);
        res.json({ success: true, message: 'Serviço removido com sucesso!' });
        
    } catch (error) {
        logger.error('Erro ao remover serviço:', error.message);
        res.status(500).json({ error: error.message });
    }
}); */

/* router.post('/api/startservice/:serviceName', auth.authMiddleware, serviceLimiter, async (req, res) => {
    const { serviceName } = req.params;
    try {
        const result = await runServiceAction(serviceName, 'start');
        if (!result) {
            throw new Error('Falha ao iniciar o serviço');
        }

        res.json({ success: true, message: `Serviço ${serviceName} iniciado com sucesso!` });

    } catch (error) {
        logger.error(`Erro ao iniciar serviço ${serviceName}: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: `Erro ao iniciar serviço: ${error.message}` 
        });
    }
}); */

/* router.post('/api/stopservice/:serviceName', auth.authMiddleware, serviceLimiter, async (req, res) => {
    const { serviceName } = req.params;
    try {
        const result = await runServiceAction(serviceName, 'stop');
        if (!result) {
            throw new Error('Falha ao parar o serviço');
        }

        res.json({ success: true, message: `Serviço ${serviceName} parado com sucesso!` });

    } catch (error) {
        console.log(error)
        logger.error(`Erro ao parar serviço ${serviceName}: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: `Erro ao parar serviço: ${error.message}` 
        });
    }
}); */

/* router.post('/api/restartservice/:serviceName', auth.authMiddleware, serviceLimiter, async (req, res) => {
    const { serviceName } = req.params;
    try {
        const result = await runServiceAction(serviceName, 'restart');
        if (!result) {
            throw new Error('Falha ao reiniciar o serviço');
        }

        res.json({ success: true, message: `Serviço ${serviceName} reiniciado com sucesso!` });

    } catch (error) {
        logger.error(`Erro ao reiniciar serviço ${serviceName}: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: `Erro ao reiniciar serviço: ${error.message}` 
        });
    }
}); */

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
        const servicesPath = path.join(__dirname, 'services.json');
        const data = await fs.readFile(servicesPath, 'utf-8');
        const config = JSON.parse(data);
        const services = config.services || [];
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
router.post('/api/add-service', auth.authMiddleware, async (req, res) => {
    try {
        const { name, displayName, restartOnFailure } = req.body;
        
        if (!name || !displayName) {
            return res.status(400).json({ error: 'Nome e displayName são obrigatórios' });
        }
        
        const servicesPath = path.join(__dirname, 'services.json');
        const data = await fs.readFile(servicesPath, 'utf8');
        const config = JSON.parse(data);
        
        if (!config.services) config.services = [];
        
        const exists = config.services.some(s => s.name === name);
        if (exists) {
            return res.status(400).json({ error: 'Serviço já está sendo monitorado' });
        }
        
        config.services.push({ 
            name, 
            displayName, 
            restartOnFailure: Boolean(restartOnFailure) 
        });
        await fs.writeFile(servicesPath, JSON.stringify(config, null, 2));
        
        audit.logAction(req.user.username, 'ADD_SERVICE', name, 'success');
        
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
        
        const servicesPath = path.join(__dirname, 'services.json');
        const data = await fs.readFile(servicesPath, 'utf8');
        const config = JSON.parse(data);
        
        if (!config.services) config.services = [];
        
        config.services = config.services.filter(s => s.name !== name);
        await fs.writeFile(servicesPath, JSON.stringify(config, null, 2));
        
        audit.logAction(req.user.username, 'REMOVE_SERVICE', name, 'success');
        
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

// POST /api/update-settings
/* router.post('/api/update-settings', auth.authMiddleware, auth.adminMiddleware, async (req, res) => {
    try {
        const { port, interval, discordWebhookUrl, notifyOnStartup } = req.body;
        const servicesPath = path.join(__dirname, 'services.json');
        const data = await fs.readFile(servicesPath, 'utf8');
        const config = JSON.parse(data);
        
        if (port) config.port = port;
        if (interval) config.interval = interval;
        if (discordWebhookUrl) config.discordWebhookUrl = discordWebhookUrl;
        if (typeof notifyOnStartup === 'boolean') config.notifyOnStartup = notifyOnStartup;
        
        await fs.writeFile(servicesPath, JSON.stringify(config, null, 2));
        
        audit.logAction(req.user.username, 'UPDATE_SETTINGS', 'Sistema', 'success');
        
        res.json({ success: true, message: 'Configurações atualizadas com sucesso' });
    } catch (error) {
        audit.logAction(req.user?.username || 'unknown', 'UPDATE_SETTINGS', '', 'failed');
        res.status(500).json({ error: error.message });
    }
}); */

module.exports = router;