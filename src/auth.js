const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const JWT_SECRET = 'your-secret-key-change-in-production-2026';
const JWT_EXPIRY = '24h';
const USERS_FILE = path.join(__dirname, '../users.json');

// Funções de autenticação
const auth = {
    // Login do usuário
    async login(username, password) {
        try {
            // Ler arquivo de usuários
            const data = await fs.readFile(USERS_FILE, 'utf8');
            const users = JSON.parse(data);
            
            // Procurar usuário
            const user = users.find(u => u.username === username);
            if (!user) {
                return { success: false, message: 'Usuário ou senha incorretos' };
            }
            
            // Verificar senha
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return { success: false, message: 'Usuário ou senha incorretos' };
            }
            
            // Gerar token JWT
            const token = jwt.sign(
                { username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRY }
            );
            
            return {
                success: true,
                message: 'Login realizado com sucesso',
                token: token,
                user: {
                    username: user.username,
                    role: user.role
                }
            };
        } catch (error) {
            console.error('Erro ao fazer login:', error.message);
            return { success: false, message: 'Erro ao fazer login' };
        }
    },

    // Registrar novo usuário (apenas um admin permitido)
    async register(username, password) {
        try {
            // Validações
            if (!username || username.length < 3) {
                return { success: false, message: 'Usuário deve ter no mínimo 3 caracteres' };
            }
            
            if (!password || password.length < 6) {
                return { success: false, message: 'Senha deve ter no mínimo 6 caracteres' };
            }
            
            // Ler arquivo de usuários
            let users = [];
            try {
                const data = await fs.readFile(USERS_FILE, 'utf8');
                users = JSON.parse(data);
            } catch (error) {
                // Se arquivo não existe, criar array vazio
                users = [];
            }
            
            // Verificar se já existe algum usuário (apenas um admin permitido)
            if (users.length > 0) {
                return { 
                    success: false, 
                    message: 'Um administrador já foi cadastrado. Entre em contato com o suporte para acesso.',
                    alreadyRegistered: true 
                };
            }
            
            // Hash da senha
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Adicionar novo usuário com role de admin
            users.push({
                username: username,
                password: hashedPassword,
                role: 'admin',
                createdAt: new Date().toISOString()
            });
            
            // Salvar arquivo de usuários
            await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
            
            return {
                success: true,
                message: 'Administrador registrado com sucesso!'
            };
        } catch (error) {
            console.error('Erro ao registrar:', error.message);
            return { success: false, message: 'Erro ao registrar usuário' };
        }
    },

    // Verificar token
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            return decoded;
        } catch (error) {
            return null;
        }
    },

    // Comparar senha
    async comparePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    },

    // Gerar hash de senha
    async hashPassword(password) {
        return await bcrypt.hash(password, 10);
    },

    // Middleware de autenticação
    authMiddleware: (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token não fornecido' });
        }
        
        const decoded = auth.verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
        }
        
        req.user = decoded;
        next();
    },

    // Middleware de admin
    adminMiddleware: (req, res, next) => {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Acesso negado. Apenas administradores.' });
        }
        next();
    }
};

module.exports = auth;
