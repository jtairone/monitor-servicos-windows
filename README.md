# 🖥️ Windows Service Monitor com Notificações Discord

Uma aplicação Node.js que monitora serviços do Windows e envia notificações via Discord quando um serviço para de funcionar.

## ✨ Características

- ✅ Monitora múltiplos serviços Windows
- ✅ Notificações em tempo real no Discord
- ✅ Reinício automático de serviços (configurável)
- ✅ Sistema de logs com Winston
- ✅ Configuração via JSON
- ✅ Interface amigável com embeds do Discord

## 📋 Pré-requisitos

- **Node.js** v14 ou superior
- **NPM** instalado
- **Acesso de Administrador** (para reiniciar serviços)
- **Webhook do Discord** configurado

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
##### * use o services_EXEMPLO.json copie e altere o nome para services.json e edite os dados

Edite o arquivo `services.json` e adicione:
- Sua webhook URL do Discord
- Os serviços que deseja monitorar

```json
{
  "services": [
    {
      "name": "AdobeARMservice",
      "displayName": "Adobe Acrobat Update Service",
      "critical": true,
      "restartOnFailure": false
    }
  ],
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

### 4. Encontrar Nomes dos Serviços

Execute como administrador:
```powershell
# Opção 1: Usar o script fornecido
node .\discover-services.js
# ira gerar o arquivo discovered-services.json com todos os serviços do windows

# Opção 2: Comando manual
Get-Service | Format-Table Name, DisplayName, Status
```

**Importante:** Use o valor da coluna **Name** (não DisplayName)

### 5. Executar a Aplicação

```powershell
# Como administrador
node monitor.js

# em produção recomendo usar PM2
pm2 start monitor.js --name "Monitor Serviços Windows"
```

Na posta logs deve ver as informações de erros e debugs.


## 📖 Estrutura de Configuração

### `services.json` - Completo

```json
{
  "services": [
    {
      "name": "ServiceName",           // Nome técnico do serviço (obrigatório)
      "displayName": "Display Name",   // Nome para exibição (obrigatório)
      "critical": true,                // Serviço crítico? (true/false)
      "restartOnFailure": true,        // Reiniciar automaticamente? (true/false)
      "description": "Descrição"       // Descrição do serviço (opcional)
    }
  ],
  "discord": {
    "webhookUrl": "https://...",       // URL do webhook Discord (obrigatório)
    "sendStartupMessage": true,        // Notificar ao iniciar? (true/false)
    "notifyOnRecovery": true           // Notificar quando recupera? (true/false)
  },
  "monitoring": {
    "checkInterval": 30000,            // Intervalo de verificação (ms)
    "maxRetries": 3,                   // Max tentativas de restart
    "logLevel": "info"                 // Nível de log
  }
}
```

## 📊 Exemplos de Configuração

### Monitorar Múltiplos Serviços

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

## 🔍 Visualização das Notificações no Discord

### Quando um Serviço Para
```
❌ Serviço Parado
AdobeARMservice parou de funcionar

📡 Servidor: MEU-PC
⏰ Horário: 22/12/2025 14:30:45
🔧 Status: stopped
```

### Quando um Serviço Inicia
```
✅ Serviço Iniciado
AdobeARMservice está rodando

📡 Servidor: MEU-PC
⏰ Horário: 22/12/2025 14:31:00
🔄 Status Anterior: Parado
```

### Quando um Serviço é Reiniciado Automaticamente
```
🔄 Serviço Reiniciado
AdobeARMservice foi reiniciado automaticamente

📡 Servidor: MEU-PC
⏰ Horário: 22/12/2025 14:31:15
```

## 📁 Estrutura de Arquivos

```
monitor-servicos/
├── monitor.js               # Aplicação principal
├── package.json             # Dependências
├── services.json            # Configuração dos serviços
├── README.md                # Este arquivo
├── discover-services.js     # Script para listar serviços
├── discovered-services.json # (gerado) Serviços descobertos
└── logs/
    ├── error.log            # Logs de erro
    └── combined.log         # Todos os logs
```

## 🛠️ Troubleshooting

### Problema: "Webhook URL do Discord não configurado"
**Solução:** Adicione a URL em `services.json` na seção `discord.webhookUrl`

### Problema: Sem notificações no Discord
**Solução:** 
1. Verifique se a webhook URL está correta
2. Verifique se o webhook tem permissão para postar
3. Teste parando um serviço manualmente: `Stop-Service -Name "NomeDoServiço"`

### Problema: "Serviço não encontrado"
**Solução:** 
1. Use o nome técnico, não o de exibição
2. Execute `discover-services.js` para obter nomes corretos
3. Verifique se o serviço existe em seu sistema

### Problema: Erro de permissão ao reiniciar
**Solução:** Execute o PowerShell/CMD como **Administrador**

### Problema: Logs não aparecem
**Solução:** 
1. Crie a pasta `logs` manualmente se não existir
2. Verifique permissões de leitura/escrita

## 🔒 Segurança

### ⚠️ IMPORTANTE: Não Exponha a Webhook URL

1. **Adicione `.gitignore`:**
```
services.json
.env
logs/
node_modules/
```

2. **Use variáveis de ambiente em produção:**
```javascript
const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
```

3. **Revoke webhook se comprometida:**
   - Vá em Discord > Servidor > Integrações > Webhooks
   - Clique em "Deletar" na webhook comprometida
   - Crie uma nova

## 📊 Logs

### Localizações dos Logs
- **Erros:** `logs/error.log`
- **Todos:** `logs/combined.log`
- **Console:** Mensagens em tempo real

### Exemplo de Log
```
2025-12-22T14:30:45.123Z info: Carregados 3 serviços para monitoramento
2025-12-22T14:30:45.456Z info: Webhook URL: https://discord.com/api/webhooks/...
2025-12-22T14:30:45.789Z info: Iniciando monitoramento de 3 serviços
2025-12-22T14:31:00.000Z info: Status alterado para AdobeARMservice: Rodando
2025-12-22T14:31:00.100Z info: Notificação Discord enviada para AdobeARMservice
```

## 🚀 Deployment

### Como Serviço Windows Automático

1. Instale `node-windows`:
```powershell
npm install -g node-windows
```

2. Crie `install.js`:
```javascript
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'WindowsServiceMonitor',
  description: 'Monitora serviços Windows e notifica no Discord',
  script: require('path').join(__dirname, 'monitor.js')
});

svc.on('install', () => {
  svc.start();
});

svc.install();
```

3. Execute:
```powershell
node install.js
```

4. Gerencie:
```powershell
# Iniciar
Start-Service -Name "WindowsServiceMonitor"

# Parar
Stop-Service -Name "WindowsServiceMonitor"

# Status
Get-Service -Name "WindowsServiceMonitor"

# Desinstalar
# Edite install.js com svc.uninstall() no final
```

## 📞 Suporte e Debug

### Ativar Log Debug
Edite `services.json`:
```json
"monitoring": {
  "logLevel": "debug"
}
```

### Teste Manual de Serviço
```powershell
# Ver status
Get-Service -Name "AdobeARMservice"

# Parar
Stop-Service -Name "AdobeARMservice" -Force

# Iniciar
Start-Service -Name "AdobeARMservice"
```

### Teste da Webhook Discord
```powershell
$url = "https://discord.com/api/webhooks/..."
$body = @{
    content = "Teste de webhook"
} | ConvertTo-Json

Invoke-WebRequest -Uri $url -Method Post -Body $body -ContentType "application/json"
```

## 📝 Licença

ISC

## 👤 Autor

Tairone Morais
- Email: jtaironemorais@hotmail.com
- GitHub: [@jtairone](https://github.com/jtairone)

---

**Última atualização:** 23 de dezembro de 2025
