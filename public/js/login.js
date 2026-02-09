// ==========================================
// GERENCIAR TEMA DARK MODE
// ==========================================

function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    const isDark = saved === 'dark';
    
    if (isDark) {
        document.body.classList.add('dark-mode');
        updateThemeIcon();
    }
}

document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
});

function updateThemeIcon() {
    const icon = document.getElementById('themeToggle').querySelector('i');
    const isDark = document.body.classList.contains('dark-mode');
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

// Inicializar tema ao carregar
initTheme();

// ==========================================
// MOSTRAR/OCULTAR SENHA
// ==========================================

const passwordInput = document.getElementById('password');
const passwordToggle = document.getElementById('passwordToggle');

passwordToggle.addEventListener('click', (e) => {
    e.preventDefault();
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    passwordToggle.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
});

// ==========================================
// FAZER LOGIN
// ==========================================

const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!username || !password) {
        showError('Usuário e senha são obrigatórios');
        return;
    }
    
    // Mostrar loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Autenticando...';
    errorMessage.classList.remove('show');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            showError(data.message || 'Erro ao fazer login');
            return;
        }
        
        // Armazenar token e informações do usuário
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
        }
        
        // Redirecionar para dashboard
        window.location.href = '/';
        
    } catch (error) {
        showError('Erro ao conectar com o servidor: ' + error.message);
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
    }
});

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

// ==========================================
// CARREGAR DADOS SALVOS
// ==========================================

window.addEventListener('load', () => {
    // Se já está logado, redirecionar para dashboard
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/';
    }
    
    // Restaurar nome de usuário se "manter conectado" foi marcado
    if (localStorage.getItem('rememberMe')) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.username) {
            document.getElementById('username').value = user.username;
            document.getElementById('rememberMe').checked = true;
        }
    }
});
