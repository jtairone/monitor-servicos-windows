const { body, query, param, validationResult } = require('express-validator');

// Middleware para lidar com erros de validação
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Erro de validação',
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    next();
};

// Validadores reutilizáveis
const validators = {
    // Serviços
    addService: [
        body('name')
            .trim()
            .notEmpty().withMessage('Nome do serviço é obrigatório')
            .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres')
            .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Nome pode conter apenas letras, números, hífen e underscore')
            .escape(),
        body('displayName')
            .trim()
            .notEmpty().withMessage('Nome de exibição é obrigatório')
            .isLength({ min: 2, max: 150 }).withMessage('Display name deve ter entre 2 e 150 caracteres')
            .escape(),
        body('restartOnFailure')
            .optional()
            .isBoolean().withMessage('restartOnFailure deve ser true ou false'),
        handleValidationErrors
    ],

    // Autenticação
    login: [
        body('username')
            .trim()
            .notEmpty().withMessage('Usuário é obrigatório')
            .isLength({ min: 3, max: 50 }).withMessage('Usuário deve ter entre 3 e 50 caracteres')
            .isAlphanumeric().withMessage('Usuário deve conter apenas letras e números')
            .escape(),
        body('password')
            .notEmpty().withMessage('Senha é obrigatória')
            .isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
        handleValidationErrors
    ],

    // Configurações
    updateSettings: [
        body('port')
            .isInt({ min: 1024, max: 65535 }).withMessage('Porta deve estar entre 1024 e 65535'),
        body('interval')
            .isInt({ min: 5000 }).withMessage('Intervalo deve ser no mínimo 5000ms'),
        body('discordWebhookUrl')
            .trim()
            .if(body => body !== '')
            .isURL().withMessage('URL do Discord inválida'),
        body('maxRetries')
            .isInt({ min: 1, max: 10 }).withMessage('Max retries deve estar entre 1 e 10'),
        body('logLevel')
            .isIn(['debug', 'info', 'warn', 'error']).withMessage('Nível de log inválido'),
        handleValidationErrors
    ],

    // Serviço específico por nome
    serviceName: [
        param('name')
            .trim()
            .notEmpty().withMessage('Nome do serviço é obrigatório')
            .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Nome inválido'),
        handleValidationErrors
    ]
};

module.exports = { validators, handleValidationErrors };