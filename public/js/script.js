// ==========================================
// VARIÁVEIS GLOBAIS
// ==========================================

const API_BASE = '';
let currentUser = null;
let allServices = [];
let monitoredServices = [];
let allAuditLogs = [];
const cfgInterval = document.getElementById('cfg-interval');
const msValue = document.getElementById('ms-value');
const secValue = document.getElementById('sec-value');

// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    await verifyToken();
    setupEventListeners();
    await loadAuditLogs(); // Carregar logs de auditoria na inicialização
});

// Escuta a digitação no campo de intervalo para atualizar a legenda em tempo real
cfgInterval.addEventListener('input', updateIntervalHelper);

// Atualiza o texto de ajuda (ms para segundos)
function updateIntervalHelper() {
    const ms = parseInt(cfgInterval.value) || 0;
    const sec = (ms / 1000).toFixed(1);
    
    if(msValue) msValue.textContent = ms;
    if(secValue) secValue.textContent = sec;
}

// ==========================================
// AUTENTICAÇÃO E VERIFICAÇÃO DE TOKEN
// ==========================================

async function verifyToken() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '/login';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/verify-token`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        const user = localStorage.getItem('user');
        if (user) {
            currentUser = JSON.parse(user);
            document.getElementById('userName').textContent = currentUser.username;
        }
    } catch (error) {
        console.error('Token verification error:', error);
        window.location.href = '/login';
    }
}

function getAuthHeader() {
    const token = localStorage.getItem('token');
    return { 'Authorization': `Bearer ${token}` };
}

// ==========================================
// DARK MODE / THEME
// ==========================================

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme === 'dark' ? 'dark-mode' : '';
    updateThemeIcon(savedTheme === 'dark');
}

function updateThemeIcon(isDark) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    toast.innerHTML = `
        <i class="${icons[type] || icons.info}"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ==========================================
// MODAL FUNCTIONS
// ==========================================

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

function showConfirmation(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    
    const confirmBtn = document.getElementById('confirmBtn');
    confirmBtn.onclick = () => {
        closeModal('confirmationModal');
        onConfirm();
    };

    showModal('confirmationModal');
}

function showLoading(text = 'Processando requisição...') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingModal').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingModal').classList.remove('show');
}

// ==========================================
// EVENT LISTENERS SETUP
// ==========================================

function setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', switchTab);
    });

    // Discover tab
    document.getElementById('discoverBtn').addEventListener('click', discoverServices);

    // Monitored tab
    document.getElementById('refreshMonitoredBtn').addEventListener('click', loadMonitoredServices);

    // Audit tab
    document.getElementById('refreshAuditBtn').addEventListener('click', loadAuditLogs);

    // Settings tab
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Search filters
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterServices);
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterServices);
    }

    const auditSearchInput = document.getElementById('auditSearchInput');
    if (auditSearchInput) {
        auditSearchInput.addEventListener('input', filterAuditLogs);
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal-overlay').classList.remove('show');
        });
    });

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });
    });
}

// ==========================================
// THEME TOGGLE
// ==========================================

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    const theme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    updateThemeIcon(isDark);
}

// ==========================================
// TAB NAVIGATION
// ==========================================

function switchTab(e) {
    const tabName = e.currentTarget.dataset.tab;
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    e.currentTarget.classList.add('active');

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // Load data for specific tabs
    if (tabName === 'discover') {
        // Mostrar filtros quando discover for clicado
        if (allServices.length === 0) {
            discoverServices();
        } else {
            document.getElementById('filterSection').style.display = 'flex';
        }
    } else if (tabName === 'audit') {
        loadAuditLogs();
    } else if (tabName === 'monitored') {
        loadMonitoredServices();
    } else if (tabName === 'settings') {
        loadSettings();
    }
}

// ==========================================
// SERVICES DISCOVERY
// ==========================================

async function discoverServices() {
    try {
        showLoading('Descobrindo serviços do Windows...');
        
        const response = await fetch(`${API_BASE}/api/discover-services`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            }
        });
         if (!response.ok){
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            } 
            throw new Error('Erro ao descobrir serviços');
        }

        const data = await response.json();
        allServices = data.services || [];
        
        renderServicesList(allServices);
        updateStats();
        
        // Mostrar filtros
        const filterSection = document.getElementById('filterSection');
        if (filterSection) {
            filterSection.style.display = 'flex';
        }
        
        hideLoading();
        showToast(`${allServices.length} serviços descobertos com sucesso`, 'success');
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
        console.error(error);
    }
}

function renderServicesList(services) {
    const container = document.getElementById('servicesList');
    
    if (!services || services.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;">Nenhum serviço encontrado</p>';
        return;
    }

    container.innerHTML = services.map(service => {
        const name = service.name || service.Name;
        const displayName = service.displayName || service.DisplayName || name;
        const status = service.status || service.State || 'Unknown';
        const isRunning = status === 'Running';
        
        return `
        <div class="service-card">
            <div class="service-header">
                <div class="service-name">${name}</div>
                <span class="service-status ${isRunning ? 'status-running' : 'status-stopped'}">
                    ${isRunning ? 'Rodando' : 'Parado'}
                </span>
            </div>
            <div class="service-description">${displayName}</div>
            <div class="service-actions">
                ${isRunning
                    ? `<button class="btn btn-sm btn-secondary" onclick="stopService('${name}')">
                        <i class="fas fa-stop"></i> Parar
                      </button>`
                    : `<button class="btn btn-sm btn-success" onclick="startService('${name}')">
                        <i class="fas fa-play"></i> Iniciar
                      </button>`
                }
                <button class="btn btn-sm btn-warning" onclick="restartService('${name}')">
                    <i class="fas fa-sync"></i> Reiniciar
                </button>
                <button class="btn btn-sm btn-primary" onclick="addToMonitored('${name}', '${displayName}')">
                    <i class="fas fa-plus"></i> Monitorar
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// ==========================================
// SERVICE ACTIONS
// ==========================================

function startService(serviceName) {
    showConfirmation(
        'Iniciar Serviço',
        `Deseja iniciar o serviço "${serviceName}"?`,
        async () => {
            await executeServiceAction(serviceName, 'start');
        }
    );
}

function stopService(serviceName) {
    showConfirmation(
        'Parar Serviço',
        `Deseja parar o serviço "${serviceName}"?`,
        async () => {
            await executeServiceAction(serviceName, 'stop');
        }
    );
}

function restartService(serviceName) {
    showConfirmation(
        'Reiniciar Serviço',
        `Deseja reiniciar o serviço "${serviceName}"?`,
        async () => {
            await executeServiceAction(serviceName, 'restart');
        }
    );
}

async function executeServiceAction(serviceName, action) {
    try {
        showLoading(`${action === 'start' ? 'Iniciando' : action === 'stop' ? 'Parando' : 'Reiniciando'} serviço...`);
        
        const response = await fetch(`${API_BASE}/api/service/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ serviceName })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || error.error || `Erro ao ${action} o serviço`);
        }

        hideLoading();
        const actionText = action === 'start' ? 'iniciado' : action === 'stop' ? 'parado' : 'reiniciado';
        showToast(`Serviço ${actionText} com sucesso!`, 'success');
        
        // Recarregar a lista apropriada
        const currentTab = document.querySelector('.nav-item.active')?.dataset.tab;
        if (currentTab === 'discover') {
            await discoverServices();
        } else if (currentTab === 'monitored') {
            await loadMonitoredServices();
        }
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

async function addToMonitored(serviceName, displayName) {
    try {
        showLoading('Adicionando serviço ao monitoramento...');
        
        const response = await fetch(`${API_BASE}/api/add-service`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({
                name: serviceName,
                displayName: displayName
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.message || 'Erro ao adicionar serviço');
        }

        hideLoading();
        showToast('Serviço adicionado ao monitoramento!', 'success');
        await discoverServices(); // Recarregar lista de serviços
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
        console.error(error);
    }
}

// ==========================================
// MONITORED SERVICES
// ==========================================

async function loadMonitoredServices() {
    try {
        const btn = document.getElementById('refreshMonitoredBtn');
        const originalHTML = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
        
        const response = await fetch(`${API_BASE}/api/list-services`, {
            headers: getAuthHeader()
        });

        if (!response.ok){
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            } 
            throw new Error('Erro ao carregar serviços monitorados');
        }

        const data = await response.json();
        monitoredServices = data.services || [];
        
        renderMonitoredServices(monitoredServices);
        
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Atualizado!';
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        showToast('Status dos serviços atualizado', 'success');
    } catch (error) {
        const btn = document.getElementById('refreshMonitoredBtn');
        btn.innerHTML = '<i class="fas fa-redo"></i> Atualizar';
        btn.disabled = false;
        
        showToast(error.message, 'error');
        console.error(error);
    }
}

function renderMonitoredServices(services) {
    const container = document.getElementById('monitoredList');
    
    if (!services || services.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;">Nenhum serviço sendo monitorado</p>';
        return;
    }

    container.innerHTML = services.map(service => {
        const name = service.name;
        const displayName = service.displayName || name;
        const status = service.status || 'unknown';
        const isRunning = status === 'running' || status === 'Running';
        
        return `
        <div class="service-card">
            <div class="service-header">
                <div class="service-name">${name}</div>
                <span class="service-status ${isRunning ? 'status-running' : 'status-stopped'}">
                    ${isRunning ? 'Rodando' : 'Parado'}
                </span>
            </div>
            <div class="service-description">${displayName}</div>
            <div class="service-actions">
                ${isRunning
                    ? `<button class="btn btn-sm btn-secondary" onclick="stopService('${name}')">
                        <i class="fas fa-stop"></i> Parar
                      </button>`
                    : `<button class="btn btn-sm btn-success" onclick="startService('${name}')">
                        <i class="fas fa-play"></i> Iniciar
                      </button>`
                }
                <button class="btn btn-sm btn-danger" onclick="removeMonitored('${name}')">
                    <i class="fas fa-trash"></i> Remover
                </button>
            </div>
        </div>
        `;
    }).join('');
}

async function removeMonitored(serviceName) {
    showConfirmation(
        'Remover Monitoramento',
        `Deseja remover o serviço "${serviceName}" do monitoramento?`,
        async () => {
            try {
                showLoading('Removendo serviço...');
                
                const response = await fetch(`${API_BASE}/api/remove-service`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeader()
                    },
                    body: JSON.stringify({ name: serviceName })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || error.message || 'Erro ao remover serviço');
                }

                hideLoading();
                showToast('Serviço removido do monitoramento!', 'success');
                await loadMonitoredServices();
            } catch (error) {
                hideLoading();
                showToast(error.message, 'error');
            }
        }
    );
}

// ==========================================
// AUDIT LOGS
// ==========================================

async function loadAuditLogs() {
    try {
        const response = await fetch(`${API_BASE}/api/audit-logs`, {
            headers: getAuthHeader()
        });

        if (!response.ok) throw new Error('Erro ao carregar logs de auditoria');

        const data = await response.json();
        allAuditLogs = data.logs || [];
        
        renderAuditLogs(allAuditLogs);
    } catch (error) {
        showToast(error.message, 'error');
        console.error(error);
    }
}

function renderAuditLogs(logs) {
    const container = document.getElementById('auditList');
    
    if (!logs || logs.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;">Nenhum evento registrado</p>';
        return;
    }

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('pt-BR');
    };

    const getStatusClass = (status) => {
        if (status === 'failed') return 'failed';
        if (status === 'logout') return 'logout';
        return 'success';
    };
    
    container.innerHTML = logs.map(log => `
        <div class="audit-item ${getStatusClass(log.status)}">
            <div class="audit-info">
                <div class="audit-action">
                    <i class="fas fa-${getActionIcon(log.action)}"></i> ${log.action}
                </div>
                <div class="audit-user">${log.username}</div>
                <div class="audit-details" style="margin-top: 4px; font-size: 0.85em; opacity: 0.8;">
                    ${log.details.count ? `<span><i class="fas fa-list-ol"></i> ${log.details.count} itens</span>` : ''}
                    ${log.details.count && log.details.ip ? ' <span class="separator">|</span> ' : ''}
                    ${log.details.ip ? `<span><i class="fas fa-network-wired"></i> ${log.details.ip}</span>` : ''}
                    ${log.details.serviceName ? ' <span class="separator">|</span> ' : ''}
                    ${log.details.serviceName ? `<span><i class="fas fa-cogs"></i> ${log.details.serviceName}</span>` : ''}
                </div>
            </div>
            <div class="audit-time">${formatDate(log.timestamp)}</div>
        </div>
    `).join('');
}

function filterAuditLogs() {
    const searchTerm = document.getElementById('auditSearchInput').value.toLowerCase();
    const filtered = allAuditLogs.filter(log => 
        log.username.toLowerCase().includes(searchTerm) ||
        log.action.toLowerCase().includes(searchTerm)
    );
    renderAuditLogs(filtered);
}

function getActionIcon(action) {
    const icons = {
        'LOGIN': 'sign-in-alt',
        'LOGOUT': 'sign-out-alt',
        'START': 'play',
        'STOP': 'stop',
        'RESTART': 'sync',
        'ADD_SERVICE': 'plus',
        'REMOVE_SERVICE': 'trash',
        'DISCOVER_SERVICES': 'search',
        'UPDATE_SETTINGS': 'cog'
    };
    return icons[action] || 'info-circle';
}

// ==========================================
// SETTINGS
// ==========================================

// ==========================================
// SETTINGS
// ==========================================

async function loadSettings() {
    try {
        showLoading('Carregando configurações...');
        
        const response = await fetch(`${API_BASE}/api/settings`, {
            headers: getAuthHeader()
        });

        if (!response.ok) {
            console.warn('Erro ao carregar configurações, usando valores padrão');
            hideLoading();
            return;
        }

        const settings = await response.json();
        
        // Popular os campos com os valores do servidor
        document.getElementById('cfg-port').value = settings.servidor?.port || 3000;
        document.getElementById('cfg-interval').value = settings.monitoring?.checkInterval || 30000;
        document.getElementById('cfg-discord-url').value = settings.discord?.webhookUrl || '';
        document.getElementById('cfg-discord-startup').checked = settings.discord?.sendStartupMessage || false;
        updateIntervalHelper();
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar configurações:', error);
        // Usar valores padrão
        document.getElementById('cfg-port').value = 3001;
        document.getElementById('cfg-interval').value = 30000;
    }
}

async function saveSettings() {
    try {
        const port = document.getElementById('cfg-port').value;
        const interval = document.getElementById('cfg-interval').value;
        const discordUrl = document.getElementById('cfg-discord-url').value;
        const discordStartup = document.getElementById('cfg-discord-startup').checked;

        if (!port || !interval) {
            showToast('Porta e Intervalo são obrigatórios', 'warning');
            return;
        }

        const btn = document.getElementById('saveSettingsBtn');
        const originalHTML = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

        const response = await fetch(`${API_BASE}/api/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({
                port: parseInt(port),
                interval: parseInt(interval),
                discordWebhookUrl: discordUrl || null,
                notifyOnStartup: discordStartup
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || error.error || 'Erro ao salvar configurações');
        }

        btn.innerHTML = '<i class="fas fa-check-circle"></i> Salvo!';
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        
        showToast('Configurações salvas com sucesso!', 'success');
    } catch (error) {
        const btn = document.getElementById('saveSettingsBtn');
        btn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
        btn.disabled = false;
        
        showToast(error.message, 'error');
        console.error(error);
    }
}

// ==========================================
// UTILITIES
// ==========================================

function updateStats() {
    const running = allServices.filter(s => (s.status || s.State) === 'Running').length;
    const total = allServices.length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-running').textContent = running;
}

function filterServices() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    const filtered = allServices.filter(s => 
        (s.name.toLowerCase().includes(searchTerm) || s.displayName.toLowerCase().includes(searchTerm)) &&
        (!statusFilter || s.status === statusFilter)
    );

    renderServicesList(filtered);
}

async function logout() {
    try {
        await fetch(`${API_BASE}/api/logout`, {
            method: 'POST',
            headers: getAuthHeader()
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
}
