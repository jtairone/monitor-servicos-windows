// Elementos DOM
const discoverBtn = document.getElementById('discoverBtn');
const refreshMonitoredBtn = document.getElementById('refreshMonitoredBtn');
const servicesList = document.getElementById('servicesList');
const monitoredList = document.getElementById('monitoredList');
const discoverMessage = document.getElementById('discoverMessage');
const monitoredMessage = document.getElementById('monitoredMessage');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const filterSection = document.getElementById('filterSection');
const loadingModal = document.getElementById('loadingModal');
const loadingText = document.getElementById('loadingText');

// Variáveis globais
let allDiscoveredServices = [];
let allMonitoredServices = [];

// Event Listeners
discoverBtn.addEventListener('click', discoverServices);
refreshMonitoredBtn.addEventListener('click', loadMonitoredServices);
searchInput.addEventListener('input', filterServices);
statusFilter.addEventListener('change', filterServices);

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    // Remove active class
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Add active class
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');

    // Carregar dados do tab
    if (tabName === 'monitored') {
        loadMonitoredServices();
    }
}

// Mostrar/esconder loading
function showLoading(text = 'Carregando...') {
    loadingText.textContent = text;
    loadingModal.classList.add('show');
}

function hideLoading() {
    loadingModal.classList.remove('show');
}

// Mostrar mensagens
function showMessage(element, message, type = 'info') {
    element.textContent = message;
    element.className = `message show ${type}`;
    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}

// 1. DESCOBRIR SERVIÇOS
async function discoverServices() {
    showLoading('Descobrindo serviços do Windows... Isto pode levar alguns segundos.');
    
    try {
        const response = await fetch('/api/discover-services', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao descobrir serviços');
        }

        const data = await response.json();
        allDiscoveredServices = data.services;

        showMessage(discoverMessage, `✅ ${data.count} serviços descobertos com sucesso!`, 'success');
        filterSection.style.display = 'flex';
        renderDiscoveredServices(allDiscoveredServices);

    } catch (error) {
        console.error('Erro:', error);
        showMessage(discoverMessage, `❌ Erro: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// Renderizar serviços descobertos
function renderDiscoveredServices(services) {
    if (services.length === 0) {
        servicesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <h3>Nenhum serviço encontrado</h3>
                <p>Clique em "Descobrir Serviços" para listar os serviços do Windows</p>
            </div>
        `;
        return;
    }

    servicesList.innerHTML = services.map(service => `
        <div class="service-item" data-service-name="${service.name}">
            <div class="service-info">
                <div class="service-name">${service.name}</div>
                <div class="service-display">📋 ${service.displayName}</div>
                <span class="service-status ${service.status === 'Running' ? 'running' : 'stopped'}">
                    ${service.status === 'Running' ? '✅ Rodando' : '❌ Parado'}
                </span>
            </div>
            <div class="service-controls">
                <div class="toggle-group">
                    <span class="toggle-label">Reiniciar se falhar:</span>
                    <label class="toggle-switch">
                        <input type="checkbox" class="restart-toggle" checked>
                        <span class="slider"></span>
                    </label>
                </div>
                <button class="btn btn-success" onclick="addMonitoredService('${service.name}', '${service.displayName}', this)">
                    <span class="btn-icon">📌</span> Monitorar
                </button>
            </div>
        </div>
    `).join('');
}

// Filtrar serviços
function filterServices() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusTerm = statusFilter.value;

    const filtered = allDiscoveredServices.filter(service => {
        const matchesSearch = service.name.toLowerCase().includes(searchTerm) ||
                            service.displayName.toLowerCase().includes(searchTerm);
        const matchesStatus = !statusTerm || service.status === statusTerm;

        return matchesSearch && matchesStatus;
    });

    renderDiscoveredServices(filtered);
}

// 2. ADICIONAR SERVIÇO AO MONITORAMENTO
async function addMonitoredService(name, displayName, button) {
    // Pegar estado do toggle
    const item = document.querySelector(`[data-service-name="${name}"]`);
    const toggleSwitch = item.querySelector('.restart-toggle');
    const restartOnFailure = toggleSwitch.checked;

    // Desabilitar botão
    button.disabled = true;
    button.innerHTML = '<span class="btn-icon">⏳</span> Adicionando...';

    try {
        const response = await fetch('/api/add-monitored-service', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                displayName: displayName,
                restartOnFailure: restartOnFailure
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao adicionar serviço');
        }

        showMessage(discoverMessage, `✅ ${data.message}`, 'success');
        
        // Remover item da lista visual
        item.style.opacity = '0.5';
        button.innerHTML = '<span class="btn-icon">✅</span> Adicionado';
        button.disabled = false;

        // Atualizar lista de monitorados após 1 segundo
        setTimeout(loadMonitoredServices, 1000);

    } catch (error) {
        console.error('Erro:', error);
        showMessage(discoverMessage, `❌ Erro: ${error.message}`, 'error');
        button.disabled = false;
        button.innerHTML = '<span class="btn-icon">📌</span> Monitorar';
    }
}

// 3. CARREGAR SERVIÇOS MONITORADOS
async function loadMonitoredServices() {
    try {
        showLoading('Carregando serviços monitorados...');

        const response = await fetch('/api/monitored-services');

        if (!response.ok) {
            throw new Error('Erro ao carregar serviços monitorados');
        }

        allMonitoredServices = await response.json();
        renderMonitoredServices(allMonitoredServices);

    } catch (error) {
        console.error('Erro:', error);
        showMessage(monitoredMessage, `❌ Erro: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// Renderizar serviços monitorados
function renderMonitoredServices(services) {
    if (services.length === 0) {
        monitoredList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👁️</div>
                <h3>Nenhum serviço em monitoramento</h3>
                <p>Vá para a aba "Descobrir Serviços" e clique em "Monitorar" para adicionar serviços</p>
            </div>
        `;
        return;
    }

    monitoredList.innerHTML = services.map(service => `
        <div class="service-item">
            <div class="service-info">
                <div class="service-name">📌 ${service.name}</div>
                <div class="service-display">${service.displayName}</div>
                <div style="margin-top: 8px; font-size: 0.85em; color: #7f8c8d;">
                    <span>${service.critical ? '🔴 Crítico' : '🟡 Normal'}</span>
                    <span style="margin-left: 15px;">Restart: ${service.restartOnFailure ? '✅ Ativado' : '❌ Desativado'}</span>
                </div>
            </div>
            <div class="service-controls">
                <button class="btn btn-danger" onclick="removeMonitoredService('${service.name}', this)">
                    <span class="btn-icon">🗑️</span> Remover
                </button>
            </div>
        </div>
    `).join('');

    showMessage(monitoredMessage, `📊 ${services.length} serviço(s) sendo monitorado(s)`, 'info');
}

// 4. REMOVER SERVIÇO DO MONITORAMENTO
async function removeMonitoredService(name, button) {
    if (!confirm(`Tem certeza que deseja remover o serviço "${name}" do monitoramento?`)) {
        return;
    }

    button.disabled = true;
    button.innerHTML = '<span class="btn-icon">⏳</span> Removendo...';

    try {
        const response = await fetch(`/api/monitored-services/${name}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao remover serviço');
        }

        showMessage(monitoredMessage, `✅ Serviço removido com sucesso!`, 'success');
        
        // Recarregar lista
        loadMonitoredServices();

    } catch (error) {
        console.error('Erro:', error);
        showMessage(monitoredMessage, `❌ Erro: ${error.message}`, 'error');
        button.disabled = false;
        button.innerHTML = '<span class="btn-icon">🗑️</span> Remover';
    }
}

// Carregar serviços monitorados ao abrir
window.addEventListener('load', () => {
    // Não carregar automaticamente, apenas quando abrir a aba
});
