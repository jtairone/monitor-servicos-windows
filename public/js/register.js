const API_BASE = window.location.origin; //'http://localhost:3001';

// Verificar se já existe um admin cadastrado ao carregar a página
async function checkAdminExists() {
    try {
        // Tentar fazer login com credenciais vazias para verificar se há usuários
        const response = await fetch(`${API_BASE}/api/admin-status`);
        const data = await response.json();
        
        if (data.adminExists) {
            showAdminAlreadyExists();
        }
    } catch (error) {
        // Se der erro, continua normalmente (admin pode não existir ainda)
        console.log('Verificando status de admin...');
    }
}

function showAdminAlreadyExists() {
    const form = document.getElementById('registerForm');
    const container = document.querySelector('.login-card');
    
    // Desabilitar formulário
    form.style.opacity = '0.5';
    form.style.pointerEvents = 'none';
    
    // Mostrar mensagem de erro
    errorMessage.innerHTML = `
        <strong><i class="fas fa-lock"></i> Cadastro Fechado</strong><br>
        Um administrador já foi registrado. Se você é o administrador, use suas credenciais para fazer login.
        <br><br>
        <small style="display: block; margin-top: 10px;">Se perdeu suas credenciais, entre em contato com o suporte técnico.</small>
    `;
    errorMessage.style.display = 'block';
    
    // Mudar texto do botão
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<i class="fas fa-lock"></i> Cadastro Não Disponível';
    registerBtn.style.opacity = '0.6';
}

// Alternar tema
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});

// Carregar tema salvo
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
}

// Verificar se admin já existe ao carregar a página
checkAdminExists();

// Referências dos elementos
const registerForm = document.getElementById('registerForm');
const registerUsername = document.getElementById('registerUsername');
const registerPassword = document.getElementById('registerPassword');
const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
const passwordToggle = document.getElementById('passwordToggle');
const passwordToggleConfirm = document.getElementById('passwordToggleConfirm');
const registerBtn = document.getElementById('registerBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

// Toggle visibilidade da senha
passwordToggle.addEventListener('click', (e) => {
    e.preventDefault();
    const input = registerPassword;
    const icon = passwordToggle.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

passwordToggleConfirm.addEventListener('click', (e) => {
    e.preventDefault();
    const input = registerPasswordConfirm;
    const icon = passwordToggleConfirm.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

// Validação de força da senha em tempo real
registerPassword.addEventListener('input', () => {
    updatePasswordStrength();
    validatePasswordMatch();
});

registerPasswordConfirm.addEventListener('input', () => {
    validatePasswordMatch();
});

function updatePasswordStrength() {
    const password = registerPassword.value;
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    const passwordHelper = document.getElementById('passwordHelper');
    
    let strength = 0;
    let strengthLabel = 'Fraca';
    let strengthColor = '#ef4444'; // red
    
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
    
    if (password.length === 0) {
        strengthText.textContent = 'Digite uma senha';
        passwordHelper.textContent = 'Mínimo 6 caracteres';
        strengthFill.style.width = '0%';
        strengthFill.style.backgroundColor = '#e5e7eb';
    } else if (strength < 2) {
        strengthLabel = 'Fraca';
        strengthColor = '#ef4444';
        strengthFill.style.width = '25%';
        passwordHelper.textContent = '❌ Mínimo 6 caracteres';
    } else if (strength < 3) {
        strengthLabel = 'Média';
        strengthColor = '#f59e0b';
        strengthFill.style.width = '50%';
        passwordHelper.textContent = '⚠️ Use letras maiúsculas e números';
    } else if (strength < 4) {
        strengthLabel = 'Boa';
        strengthColor = '#3b82f6';
        strengthFill.style.width = '75%';
        passwordHelper.textContent = '✓ Boa senha';
    } else {
        strengthLabel = 'Forte';
        strengthColor = '#10b981';
        strengthFill.style.width = '100%';
        passwordHelper.textContent = '✓ Senha muito forte';
    }
    
    strengthFill.style.backgroundColor = strengthColor;
    strengthText.textContent = `Força: ${strengthLabel}`;
    strengthText.style.color = strengthColor;
}

function validatePasswordMatch() {
    const password = registerPassword.value;
    const passwordConfirm = registerPasswordConfirm.value;
    const passwordConfirmHelper = document.getElementById('passwordConfirmHelper');
    
    if (passwordConfirm.length === 0) {
        passwordConfirmHelper.textContent = '';
    } else if (password === passwordConfirm) {
        passwordConfirmHelper.textContent = '✓ Senhas conferem';
        passwordConfirmHelper.style.color = '#10b981';
    } else {
        passwordConfirmHelper.textContent = '❌ Senhas não conferem';
        passwordConfirmHelper.style.color = '#ef4444';
    }
}

// Validação de usuário em tempo real
registerUsername.addEventListener('input', () => {
    const username = registerUsername.value;
    const usernameHelper = document.getElementById('usernameHelper');
    
    if (username.length === 0) {
        usernameHelper.textContent = '';
    } else if (username.length < 3) {
        usernameHelper.textContent = '❌ Mínimo 3 caracteres';
        usernameHelper.style.color = '#ef4444';
    } else {
        usernameHelper.textContent = '✓ Nome válido';
        usernameHelper.style.color = '#10b981';
    }
});

// Enviar formulário
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = registerUsername.value.trim();
    const password = registerPassword.value;
    const passwordConfirm = registerPasswordConfirm.value;
    
    // Validações
    errorMessage.textContent = '';
    successMessage.textContent = '';
    
    if (username.length < 3) {
        showError('Usuário deve ter no mínimo 3 caracteres');
        return;
    }
    
    if (password.length < 6) {
        showError('Senha deve ter no mínimo 6 caracteres');
        return;
    }
    
    if (password !== passwordConfirm) {
        showError('As senhas não conferem');
        return;
    }
    
    // Enviar requisição de cadastro
    try {
        registerBtn.disabled = true;
        registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
        
        const response = await fetch(`${API_BASE}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Erro ao cadastrar');
        }
        
        showSuccess('Administrador criado com sucesso! Redirecionando...');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        
    } catch (error) {
        showError(error.message);
        registerBtn.disabled = false;
        registerBtn.innerHTML = '<i class="fas fa-user-check"></i> Criar Conta';
    }
});

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
