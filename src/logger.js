const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Garantir que a pasta logs existe
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    try {
        fs.mkdirSync(logsDir, { recursive: true });
    } catch (err) {
        console.error(`[Logger] Erro ao criar pasta logs: ${err.message}`);
    }
}

let logger;

try {
    logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }), // Captura stack traces
            winston.format.json()
        ),
        transports: [
            // Arquivo com apenas erros
            new winston.transports.File({ 
                filename: 'logs/error.log', 
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 5
            }),
            
            // Arquivo com todos os logs (info, warn, error, etc)
            new winston.transports.File({ 
                filename: 'logs/combined.log',
                maxsize: 5242880, // 5MB
                maxFiles: 5
            }),
            
            // Console apenas com ERROS (capturado pelo PM2)
            new winston.transports.Console({
                level: 'error',
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            })
        ],
        
        // Configurações adicionais para melhor controle
        exitOnError: false // Não encerra o processo em caso de erro no logger
    });
    
    // Log inicial para confirmar funcionamento
    logger.info('Logger inicializado com sucesso');
    
} catch (error) {
    // FALLBACK: Se houver erro na configuração do winston
    console.error(`[Logger] Erro na configuração: ${error.message}. Usando fallback.`);
    
    // Criar logger fallback com console
    logger = {
        levels: ['error', 'warn', 'info', 'debug'],
        
        // Método genérico
        log: function(level, message, meta) {
            if (!this.levels.includes(level)) level = 'info';
            const timestamp = new Date().toISOString();
            const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
            
            const logMessage = `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
            
            // Usar console apropriado se disponível
            if (console[level]) {
                console[level](logMessage);
            } else {
                console.log(logMessage);
            }
            
            // Tentar logar em arquivo mesmo no fallback
            try {
                fs.appendFileSync(
                    path.join(logsDir, 'fallback.log'), 
                    logMessage + '\n',
                    { flag: 'a' }
                );
            } catch (fileErr) {
                // Ignora erro de arquivo no fallback
            }
        },
        
        // Métodos específicos
        info: function(msg, meta) { this.log('info', msg, meta); },
        error: function(msg, meta) { this.log('error', msg, meta); },
        warn: function(msg, meta) { this.log('warn', msg, meta); },
        debug: function(msg, meta) { this.log('debug', msg, meta); },
        
        // Métodos adicionais úteis
        child: function() { return this; }, // Compatibilidade com loggers que usam child
        close: function() { console.log('[Logger] Fallback logger closed'); }
    };
    
    logger.info('Logger fallback inicializado');
}

// Exportar o logger configurado
module.exports = logger;