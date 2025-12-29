# 🖥️ Windows Service Monitor com Notificações Discord

Uma aplicação completa Node.js + Express que monitora serviços do Windows e envia notificações via Discord quando um serviço para de funcionar. Inclui interface web intuitiva para gerenciamento.

## ✨ Características

- ✅ **Interface Web** - Gerenciar serviços via navegador
- ✅ **Descoberta Automática** - Liste todos os serviços do Windows
- ✅ **Monitoramento em Tempo Real** - Verifica status continuamente
- ✅ **Notificações Discord** - Embeds bonitos e informativos
- ✅ **Reinício Automático** - Reinicia serviços com falha (configurável)
- ✅ **Sistema de Logs** - Rastreamento completo com Winston
- ✅ **Configuração JSON** - Fácil de customizar
- ✅ **Responsivo** - Funciona em desktop, tablet e mobile

## 📋 Pré-requisitos

- **Node.js** v14 ou superior
- **NPM** instalado
- **Acesso de Administrador** (para reiniciar serviços)
- **Webhook do Discord** configurado
- **Navegador web** (Chrome, Edge, Firefox)

## 🚀 Instalação Rápida

### 1. Instalar Dependências
```powershell
npm install
```

### 2. Obter Webhook do Discord

1. Acesse seu servidor Discord
2. Vá em **Configurações do Servidor** → **Integrações** → **Webhooks**
3. Clique em **Novo Webhook**
4. Dê o nome "Service Monitor"
5. Selecione o canal desejado
6. Copie a URL do webhook

### 3. Configurar `services.json`

Copie `services_EXEMPLO.json` e renomeie para `services.json`:

```json
{
  "services": [
    {
      "name": "AdobeARMservice",
      "displayName": "Adobe Acrobat Update Service",
      "critical": false,
      "description": "Serviço de atualização",
      "restartOnFailure": true
    }
  ],
  "servidor": {
    "port": 3000
  },
  "discord": {
    "webhookUrl": "https://discord.com/api/webhooks/SEU_ID/SEU_TOKEN",
    "sendStartupMessage": true,
    "notifyOnRecovery": true
  },
  "monitoring": {
    "checkInterval": 30000,
    "maxRetries": 3,
    "logLevel": "info"
  }
}
```

### 4. Iniciar a Aplicação

**Opção 1: Interface Web (Recomendado)**
```powershell
# Abre interface web em http://localhost:3000
npm run web
```

**Opção 2: Monitor em Background**
```powershell
# Apenas monitora (sem interface web)
npm run dev
```

**Opção 3: Produção com PM2**
```powershell
pm2 start app.js --name "Service Monitor Web"
pm2 start src/monitor.js --name "Service Monitor"
```

A interface estará disponível em: **http://localhost:3000**

##### * **Se porta padrão for 3000 se tiver alterado no services.json usar a denifida lá**


## 🌐 Interface Web

### Funcionalidades

#### 📍 Aba "Descobrir Serviços"
1. Clique em **"Descobrir Serviços"** para listar todos os serviços do Windows
2. Use a busca para filtrar por nome ou exibição
3. Para cada serviço:
   - Veja o status (Rodando/Parado)
   - Active/desative o toggle **"Reiniciar se falhar"**
   - Clique em **"Monitorar"** para adicionar ao monitoramento
4. O serviço será adicionado automaticamente ao `services.json`

#### 👁️ Aba "Serviços Monitorados"
- Visualize todos os serviços em monitoramento
- Veja se o restart automático está ativado
- Remova serviços clicando em **"Remover"**
- Mudanças refletem imediatamente no monitor

### Fluxo de Funcionamento

```
┌─────────────────────────────────────────┐
│   Interface Web (http://localhost:3000) │
└────────────┬────────────────────────────┘
             │
             ├─→ 🔎 Descobrir Serviços (PowerShell)
             │    └─→ Salva em discovered-services.json
             │
             ├─→ 📌 Adicionar ao Monitoramento
             │    └─→ Escreve em services.json
             │
             └─→ 👁️ Carregar Serviços Monitorados
                  └─→ Lê de services.json

         ↓

┌──────────────────────────────────────┐
│  monitor.js (Background Service)     │
│  Lê services.json a cada intervalo   │
│                                      │
│  ✓ Verifica status do serviço        │
│  ✓ Envia notificações Discord        │
│  ✓ Reinicia se falhar (se ativo)     │
│  ✓ Atualiza logs                     │
└──────────────────────────────────────┘
```

## 📖 Configuração Completa

### services.json - Todos os Parâmetros

```json
{
  "services": [
    {
      "name": "ServiceName",           // Nome técnico (obrigatório)
      "displayName": "Display Name",   // Nome para exibição (obrigatório)
      "critical": true,                // Serviço crítico? (true/false)
      "restartOnFailure": true,        // Reiniciar automaticamente? (true/false)
      "description": "Descrição"       // Descrição (opcional)
    }
  ],
  "servidor": {
    "port": 3000                       // Porta web (padrão: 3000)
  },
  "discord": {
    "webhookUrl": "https://...",       // URL do webhook (obrigatório)
    "sendStartupMessage": true,        // Notificar ao iniciar?
    "notifyOnRecovery": true           // Notificar quando recupera?
  },
  "monitoring": {
    "checkInterval": 30000,            // Intervalo de verificação (ms)
    "maxRetries": 3,                   // Max tentativas de restart
    "logLevel": "info"                 // Nível de log: info/warn/error/debug
  }
}
```

### Exemplo com Múltiplos Serviços

```json
{
  "services": [
    {
      "name": "MySQL80",
      "displayName": "MySQL Database",
      "critical": true,
      "restartOnFailure": true
    },
    {
      "name": "W3SVC",
      "displayName": "IIS Web Server",
      "critical": true,
      "restartOnFailure": false
    },
    {
      "name": "DockerDesktopService",
      "displayName": "Docker Desktop",
      "critical": false,
      "restartOnFailure": false
    }
  ],
  "servidor": {
    "port": 3000
  },
  "discord": {
    "webhookUrl": "https://discord.com/api/webhooks/...",
    "sendStartupMessage": true,
    "notifyOnRecovery": true
  },
  "monitoring": {
    "checkInterval": 60000,
    "maxRetries": 5,
    "logLevel": "info"
  }
}
```

## 🔍 Encontrar Nomes dos Serviços

### Via Interface Web
1. Na aba "Descobrir Serviços", clique no botão
2. Todos os serviços do Windows serão listados
3. Use o valor da coluna "Nome" para adicionar em services.json

### Via PowerShell
```powershell
# Listar todos os serviços
Get-Service | Format-Table Name, DisplayName, Status

# Procurar um serviço específico
Get-Service | Where-Object { $_.DisplayName -like "*MySQL*" }
```

### Via Script Node.js
```powershell
node .\src\discover-services.js
# Gera discovered-services.json com todos os serviços
```

## 📊 Notificações Discord

### Quando um Serviço Para

```
❌ Serviço Parado
AdobeARMservice parou de funcionar

📡 Servidor: MEU-PC
⏰ Horário: 26/12/2025 14:30:45
🔧 Status: stopped
```

### Quando um Serviço Inicia

```
✅ Serviço Iniciado
AdobeARMservice está rodando

📡 Servidor: MEU-PC
⏰ Horário: 26/12/2025 14:31:00
🔄 Status Anterior: Parado
```

### Quando um Serviço é Reiniciado Automaticamente

```
🔄 Serviço Reiniciado
AdobeARMservice foi reiniciado automaticamente

📡 Servidor: MEU-PC
⏰ Horário: 26/12/2025 14:31:15
```

## 📁 Estrutura de Projeto

```
monitor-servicos/
├── app.js                     # Servidor Express (interface web)
(background)
├── package.json               # Dependências
├── services.json              # Configuração ⚙️ (edite aqui!)
├── services_EXEMPLO.json      # Template
├── README.md                  # Este arquivo
│
├── src/
│   ├── discover-services.js   # Script descobrir serviços
│   ├── logger.js              # Sistema logging Winston
│   ├── sendNotification.js    # Enviar notificações Discord
│   └── monitor.js             # Lógica monitoramento
│
├── scripts/
│   └── restart-service.ps1    # Script PowerShell restart
│
├── public/                    # Interface Web
│   ├── index.html             # Página principal
│   ├── styles.css             # Estilos
|   ├── img/                   # imagens
│   |   └── logo.png           # Logo para favicom pagina 
│   └── js/
│       ├── script.js          # Lógica frontend
│       └── sweetalert2.js     # Biblioteca modal
│
├── logs/
│   ├── error.log              # Erros apenas
│   └── combined.log           # Todos os eventos
│
└── nodemon.json               # Configuração auto-reload
```

## � API Endpoints (Para Integração)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/discover-services` | Descobre serviços do Windows |
| `GET` | `/api/discovered-services` | Carrega cache de serviços descobertos |
| `GET` | `/api/monitored-services` | Carrega serviços em monitoramento |
| `POST` | `/api/add-monitored-service` | Adiciona serviço ao monitoramento |
| `DELETE` | `/api/monitored-services/:name` | Remove serviço do monitoramento |

## 🛠️ Troubleshooting

### ❌ Erro: "Webhook URL do Discord não configurado"
**Solução:** Adicione a URL em `services.json` na seção `discord.webhookUrl`

### ❌ Erro: "Sem notificações no Discord"
**Solução:** 
1. Verifique se a webhook URL está correta
2. Teste parando um serviço manualmente: `Stop-Service -Name "NomeDoServiço"`
3. Confirme que o webhook tem permissão para postar no canal
4. Verifique os logs em `logs/combined.log`

### ❌ Erro: "Serviço não encontrado"
**Solução:** 
1. Use a interface web para descobrir serviços
2. Copie o nome técnico (coluna "Name")
3. Não use o "Display Name"

### ❌ Erro: "Acesso negado ao reiniciar"
**Solução:** 
1. **Importante**: O Node.js não tem privilégios admin
2. Quando tentar reiniciar, aparecerá popup do **UAC (User Account Control)**
3. Clique **"Sim"** para permitir execução com privilégios elevados
4. O script então conseguirá parar/iniciar os serviços

### ❌ Erro: "Porta 3000 já está em uso"
**Solução:** 
1. Edite `services.json` e altere `servidor.port` para outra porta
2. Exemplo: `"port": 3001`
3. Reinicie a aplicação

### ❌ Logs não aparecem
**Solução:** 
1. A pasta `logs/` é criada automaticamente
2. Verifique permissões de leitura/escrita
3. Rode como administrador

## 🔒 Segurança

### ⚠️ IMPORTANTE: Não Exponha a Webhook URL

1. **Adicione `.gitignore`:**
```
services.json
.env
logs/
node_modules/
.DS_Store
```

2. **Se webhook foi comprometida:**
   - Vá em Discord > Servidor > Integrações > Webhooks
   - Clique em "Deletar" na webhook comprometida
   - Crie uma nova

## 📊 Logs

### Localizações

- **Apenas Erros:** `logs/error.log`
- **Todos os Eventos:** `logs/combined.log`
- **Console:** Mensagens em tempo real no terminal

### Nível de Log

Configure em `services.json`:
```json
"monitoring": {
  "logLevel": "debug"  // info, warn, error, debug
}
```

### Exemplo de Log

```
2025-12-26T14:30:45.123Z info: Carregados 3 serviços para monitoramento
2025-12-26T14:30:45.456Z info: Webhook URL: https://discord.com/api/webhooks/...
2025-12-26T14:30:45.789Z info: Iniciando monitoramento de 3 serviços
2025-12-26T14:31:00.000Z info: ⚠️ MUDANÇA DETECTADA em AdobeARMservice: Parado
2025-12-26T14:31:00.100Z info: 🔄 Tentando reiniciar AdobeARMservice...
2025-12-26T14:31:05.200Z info: ✅ Serviço AdobeARMservice reiniciado com sucesso
```

## 🚀 Deploy em Produção

### Com PM2

```powershell
npm install -g pm2

# Iniciar
pm2 start pm2.json --name "Service Monitor Web"

# Salvar config
pm2 save

# Fazer iniciar no boot
pm2 startup
```

## 📱 Compatibilidade

- ✅ **Desktop** - Chrome, Edge, Firefox, Safari
- ✅ **Tablet** - iPad, Android Tablet
- ✅ **Mobile** - iPhone, Android (visualização, não recomendado para edição)
- ✅ **Windows** - Windows 7 SP1 ou superior
- ✅ **Node.js** - v14.0.0 ou superior

## 📞 Suporte e Debug

### Teste Manual de Serviço

```powershell
# Ver status
Get-Service -Name "AdobeARMservice"

# Parar (teste de detecção)
Stop-Service -Name "AdobeARMservice" -Force

# Iniciar
Start-Service -Name "AdobeARMservice"

# Verificar log do monitor
Get-Content logs/combined.log -Tail 20
```

### Teste da Webhook Discord

```powershell
$url = "https://discord.com/api/webhooks/..."
$body = @{
    content = "✅ Teste de webhook"
} | ConvertTo-Json

Invoke-WebRequest -Uri $url -Method Post -Body $body -ContentType "application/json"
```

### Ativar Debug Logging

```json
{
  "monitoring": {
    "logLevel": "debug"
  }
}
```

Então verifique `logs/combined.log`:
```powershell
Get-Content logs/combined.log -Follow
```

## 📝 Scripts Úteis

### Descobrir Todos os Serviços

```powershell
node src/discover-services.js
# Gera discovered-services.json
```

### Listar Serviços em Monitoramento

```powershell
# Abra http://localhost:3000 e vá em "Serviços Monitorados"
# Ou verifique services.json diretamente:
type services.json
```

### Verificar Status do Monitor

```powershell
# Se rodando como serviço
Get-Service | Where-Object { $_.Name -like "*Monitor*" }

# Se rodando via npm
Get-Process node
```

## 🎓 Fluxo de Uso Recomendado

### 1. Configuração Inicial
- [ ] Instalar dependências: `npm install`
- [ ] Copiar `services_EXEMPLO.json` → `services.json`
- [ ] Adicionar webhook do Discord
- [ ] Rodar `npm run web`

### 2. Descobrir Serviços
- [ ] Acessar http://localhost:3000
- [ ] Clique em "Descobrir Serviços"
- [ ] Selecione serviços a monitorar
- [ ] Configure opções de restart

### 3. Monitoramento
- [ ] Verifique aba "Serviços Monitorados"
- [ ] Teste parando um serviço
- [ ] Confirme notificação no Discord
- [ ] Confirme restart automático (se ativado)

### 4. Deploy
- [ ] Configure como serviço Windows (produção)
- [ ] Verifique logs regularmente
- [ ] Ajuste intervalos conforme necessário

## 📄 Licença

ISC

## 👤 Autor

Tairone Morais
- Email: jtaironemorais@hotmail.com
- GitHub: [@jtairone](https://github.com/jtairone)

---

**Última atualização:** 26 de dezembro de 2025  
**Versão:** 2.1.0  
**Status:** ✅ Pronto para Produção
