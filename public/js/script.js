// ==========================================
// SELETORES DOM
// ==========================================

// Dash Stats
const statTotal = document.getElementById('stat-total');
const statRunning = document.getElementById('stat-running');

// Discover Tab
const discoverBtn = document.getElementById('discoverBtn');
const servicesList = document.getElementById('servicesList');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const filterSection = document.getElementById('filterSection');

// Monitored Tab
const refreshMonitoredBtn = document.getElementById('refreshMonitoredBtn');
const monitoredList = document.getElementById('monitoredList');

// Settings Tab
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const cfgInterval = document.getElementById('cfg-interval');
const msValue = document.getElementById('ms-value');
const secValue = document.getElementById('sec-value');

// Global UI
const loadingModal = document.getElementById('loadingModal');
const loadingText = document.getElementById('loadingText');

// Variáveis de estado
let allDiscoveredServices = [];
let allMonitoredServices = [];

// ==========================================
// EVENT LISTENERS
// ==========================================

discoverBtn.addEventListener('click', discoverServices);
refreshMonitoredBtn.addEventListener('click', loadMonitoredServices);
searchInput.addEventListener('input', filterServices);
statusFilter.addEventListener('change', filterServices);
saveSettingsBtn.addEventListener('click', saveSettings);

// Escuta a digitação no campo de intervalo para atualizar a legenda em tempo real
cfgInterval.addEventListener('input', updateIntervalHelper);

// Navegação de Abas (Tabs)
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(tabName).classList.add('active');

        if (tabName === 'monitored') loadMonitoredServices();
        if (tabName === 'settings') loadSettings();
    });
});

// ==========================================
// FUNÇÕES UTILITÁRIAS
// ==========================================

// Atualiza o texto de ajuda (ms para segundos)
function updateIntervalHelper() {
    const ms = parseInt(cfgInterval.value) || 0;
    const sec = (ms / 1000).toFixed(1);
    
    if(msValue) msValue.textContent = ms;
    if(secValue) secValue.textContent = sec;
}

function showLoading(text = 'Processando...') {
    loadingText.textContent = text;
    loadingModal.classList.add('show');
}

function hideLoading() {
    loadingModal.classList.remove('show');
}

// SweetAlert2 configurado
function showMessage(message, type = 'info') {
    Swal.fire({
        toast: true,
        position: "top-end",
        icon: type,
        title: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

function updateTopStats(services) {
    statTotal.textContent = services.length;
    statRunning.textContent = services.filter(s => s.status === 'Running').length;
}

// ==========================================
// LÓGICA DE DESCOBERTA (DISCOVER)
// ==========================================

async function discoverServices() {
    showLoading('Lendo serviços do Windows...');
    try {
        const response = await fetch('/api/discover-services', { method: 'POST' });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        allDiscoveredServices = data.services;
        updateTopStats(allDiscoveredServices);
        filterSection.style.display = 'flex';
        renderDiscoveredServices(allDiscoveredServices);
        showMessage(`✅ ${data.count} serviços encontrados!`, 'success');
    } catch (error) {
        showMessage(`❌ Erro: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

function renderDiscoveredServices(services) {
    if (services.length === 0) {
        servicesList.innerHTML = `<div class="empty-state"><h3>Nenhum serviço encontrado</h3></div>`;
        return;
    }
    servicesList.innerHTML = services.map(service => `
        <div class="service-item" data-service-name="${service.name}">
            <div class="service-info">
                <div class="service-name">${service.name}</div>
                <div class="service-display">${service.displayName}</div>
                <span class="status-pill ${service.status === 'Running' ? 'running' : 'stopped'}">
                    ${service.status === 'Running' ? '● Rodando' : '○ Parado'}
                </span>
            </div>
            <div class="service-controls" style="margin-top:15px; display:flex; justify-content:space-between; align-items:center;">
                <label class="toggle-switch">
                    <input type="checkbox" class="restart-toggle" checked title="Auto-restart">
                    <span class="slider">Auto-restart</span>
                </label>
                <button class="btn btn-primary" onclick="addMonitoredService('${service.name}', '${service.displayName}', this)">
                    <i class="fas fa-plus"></i> Monitorar
                </button>
            </div>
            <div class="action-buttons" style="margin-top:10px; display:flex; gap:8px;">
                <button class="btn btn-success btn-sm" ${service.status === 'Running' ? 'disabled': ''} onclick="startService('${service.name}")">
                    <i class="fas fa-play"></i> Start
                </button>
                <button class="btn btn-danger btn-sm" ${service.status !== 'Running' ? 'disabled': ''} onclick="stopService('${service.name}')">
                    <i class="fas fa-stop"></i> Stop
                </button>
                <button class="btn btn-warning btn-sm" ${service.status !== 'Running' ? 'disabled': ''} onclick="restartService('${service.name}')">
                    <i class="fas fa-redo"></i> Reiniciar
                </button>
            </div>
        </div>
    `).join('');
}

function filterServices() {
    const term = searchInput.value.toLowerCase();
    const status = statusFilter.value;
    const filtered = allDiscoveredServices.filter(s => 
        (s.name.toLowerCase().includes(term) || s.displayName.toLowerCase().includes(term)) &&
        (!status || s.status === status)
    );
    renderDiscoveredServices(filtered);
}

// ==========================================
// LÓGICA DE MONITORAMENTO (MONITORED)
// ==========================================

async function addMonitoredService(name, displayName, button) {
    const item = document.querySelector(`[data-service-name="${name}"]`);
    const restartOnFailure = item.querySelector('.restart-toggle').checked;

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aguarde';

    try {
        const response = await fetch('/api/add-monitored-service', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, displayName, restartOnFailure })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showMessage(`📌 ${name} monitorado!`, 'success');
        item.style.opacity = '0.4';
        button.innerHTML = '<i class="fas fa-check"></i> Ativo';
    } catch (error) {
        showMessage(`❌ Erro: ${error.message}`, 'error');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-plus"></i> Monitorar';
    }
}

async function loadMonitoredServices() {
    showLoading('Atualizando lista...');
    try {
        const response = await fetch('/api/monitored-services');
        allMonitoredServices = await response.json();
        renderMonitoredServices(allMonitoredServices);
    } catch (error) {
        showMessage('Erro ao carregar monitorados', 'error');
    } finally {
        hideLoading();
    }
}

function renderMonitoredServices(services) {
    if (services.length === 0) {
        monitoredList.innerHTML = `<div class="empty-state"><h3>Sem serviços monitorados</h3></div>`;
        return;
    }
    monitoredList.innerHTML = services.map(s => `
        <div class="service-item">
            <div class="service-info">
                <div class="service-name" style="color:var(--primary)">${s.name}</div>
                <div class="service-display">${s.displayName}</div>
                <div style="font-size:0.75rem; margin-top:8px">
                    <span class="status-pill running">PROTEGIDO</span>
                    ${s.restartOnFailure ? '<span class="status-pill running">AUTO-RESTART</span>' : ''}
                </div>
            </div>
            <button class="btn btn-outline" style="margin-top:15px; width:100%; color: var(--danger)" onclick="removeMonitoredService('${s.name}', this)">
                <i class="fas fa-trash-alt"></i> Remover
            </button>
            <div class="action-buttons" style="margin-top:10px; display:flex; gap:8px;">
                <button class="btn btn-success btn-sm" ${s.status === 'Running' ? 'disabled': ''} onclick="startService('${s.name}')">
                    <i class="fas fa-play"></i> Start
                </button>
                <button class="btn btn-danger btn-sm" ${s.status !== 'Running' ? 'disabled': ''} onclick="stopService('${s.name}')">
                    <i class="fas fa-stop"></i> Stop
                </button>
                <button class="btn btn-warning btn-sm" ${s.status !== 'Running' ? 'disabled': ''} onclick="restartService('${s.name}')">
                    <i class="fas fa-redo"></i> Reiniciar
                </button>
            </div>
        </div>
    `).join('');
}

async function removeMonitoredService(name, button) {
    const result = await Swal.fire({
        title: 'Tem certeza?',
        text: `Parar monitoramento de ${name}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Sim, remover!',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            await fetch(`/api/monitored-services/${name}`, { method: 'DELETE' });
            loadMonitoredServices();
            showMessage('Removido com sucesso', 'success');
        } catch (e) { 
            showMessage('Erro ao remover', 'error');
        }
    }
}

// ==========================================
// LÓGICA DE CONFIGURAÇÕES (SETTINGS)
// ==========================================

async function loadSettings() {
    showLoading('Lendo configurações...');
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();

        // Preenche os campos
        document.getElementById('cfg-port').value = data.servidor?.port || 3000;
        document.getElementById('cfg-interval').value = data.monitoring?.checkInterval || 30000;
        document.getElementById('cfg-discord-url').value = data.discord?.webhookUrl || '';
        document.getElementById('cfg-discord-startup').checked = data.discord?.sendStartupMessage || false;

        // IMPORTANTE: Atualiza a legenda ms/s logo após carregar os valores
        updateIntervalHelper();

    } catch (error) {
        showMessage('Erro ao carregar configurações', 'error');
    } finally {
        hideLoading();
    }
}

async function saveSettings() {
    saveSettingsBtn.disabled = true;
    saveSettingsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    const payload = {
        servidor: { port: parseInt(document.getElementById('cfg-port').value) },
        monitoring: {
            checkInterval: parseInt(document.getElementById('cfg-interval').value),
            maxRetries: 3,
            logLevel: "info"
        },
        discord: {
            webhookUrl: document.getElementById('cfg-discord-url').value,
            sendStartupMessage: document.getElementById('cfg-discord-startup').checked,
            notifyOnRecovery: true
        }
    };

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (response.ok) {
            showMessage(result.message, 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        showMessage(`Erro ao salvar: ${error.message}`, 'error');
    } finally {
        saveSettingsBtn.disabled = false;
        saveSettingsBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
    }
}

window.addEventListener('load', () => {
    // Inicializar qualquer dado necessário
});