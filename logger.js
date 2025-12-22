const winston = require('winston');

// Configurar logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        // Arquivo com apenas erros
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error' 
        }),
        
        // Arquivo com todos os logs (info, warn, error, etc)
        new winston.transports.File({ 
            filename: 'logs/combined.log' 
        }),
        
        // Console apenas com ERROS (capturado pelo PM2)
        new winston.transports.Console({
            level: 'error',
            format: winston.format.simple()
        })
    ]
});

module.exports = logger;