const express = require('express');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const router = require('./router');

// Variável global para armazenar o processo do monitor
let monitorProcess = null;

// Logger simples se não conseguir carregar
const logger = require('./src/logger');

const config = (() => {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'services.json'), 'utf8'));
    } catch {
        return { servidor: { port: 3000 } };
    }
})();

console.log('[2] Criando aplicação Express');
const app = express();
const PORT = config.servidor?.port || 3000;
console.log('[3] Aplicação criada');

// Middleware
console.log('[4] Configurando middlewares');
app.use(express.json());
app.use(express.static('public'));
console.log('[5] Middlewares configurados');

// Rotas de autenticação
console.log('[6] Configurando rotas');
app.use('/', router);

// Iniciar servidor
console.log('[7] Iniciando servidor...');
const server = app.listen(PORT, () => {
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
    logger.info(`🌐 Servidor rodando em http://localhost:${PORT}`);
    logger.info(`Abra seu navegador e acesse http://localhost:${PORT}`);
    
    // Iniciar monitor.js automaticamente após o servidor estar pronto
    console.log('[8] Iniciando Monitor de Serviços...');
    startMonitor();
});

server.on('error', (err) => {
    console.error('❌ Erro ao iniciar servidor:', err.message);
    process.exit(1);
});

// Função para iniciar o monitor.js como processo filho
function startMonitor() {
    try {
        const monitorPath = path.join(__dirname, './src/monitor.js');
        
        // Spawn do monitor.js como processo filho
        monitorProcess = spawn('node', [monitorPath], {
            stdio: ['ignore', 'pipe', 'pipe'], // Capturar stdout e stderr
            detached: false
        });
        
        // Capturar stdout do monitor
        if (monitorProcess.stdout) {
            monitorProcess.stdout.on('data', (data) => {
                console.log(`[Monitor] ${data.toString().trim()}`);
            });
        }
        
        // Capturar stderr do monitor
        if (monitorProcess.stderr) {
            monitorProcess.stderr.on('data', (data) => {
                console.error(`[Monitor ERRO] ${data.toString().trim()}`);
            });
        }
        
        monitorProcess.on('error', (err) => {
            logger.error('❌ Erro ao iniciar monitor.js:', err.message);
            console.error('Erro ao iniciar monitor.js:', err.message);
        });
        
        monitorProcess.on('exit', (code, signal) => {
            logger.warn(`⚠️ Monitor encerrado com código ${code}`);
            console.warn(`⚠️ Monitor encerrado com código ${code}`);
            
            // Reiniciar monitor se ele falhar
            if (code !== 0 && code !== null) {
                console.log('🔄 Tentando reiniciar monitor em 5 segundos...');
                setTimeout(() => {
                    startMonitor();
                }, 5000);
            }
        });
        
        //console.log('✅ Monitor iniciado com sucesso (PID: ' + monitorProcess.pid + ')');
        logger.info('✅ Monitor iniciado com sucesso (PID: ' + monitorProcess.pid + ')');
        
    } catch (err) {
        logger.error('Erro ao executar startMonitor:', err.message);
        //console.error('Erro ao executar startMonitor:', err.message);
    }
}

// Handler para encerramento gracioso
process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando aplicação...');
    logger.info('Encerrando aplicação');
    
    // Encerrar processo do monitor se estiver rodando
    if (monitorProcess) {
        console.log('⏸️  Encerrando Monitor...');
        monitorProcess.kill('SIGINT');
    }
    
    // Encerrar servidor após 2 segundos
    setTimeout(() => {
        console.log('✅ Aplicação encerrada');
        logger.info('Aplicação encerrada');
        process.exit(0);
    }, 2000);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Encerrando aplicação (SIGTERM)...');
    if (monitorProcess) {
        monitorProcess.kill('SIGTERM');
    }
    
    setTimeout(() => {
        console.log('✅ Aplicação encerrada');
        process.exit(0);
    }, 2000);
});
