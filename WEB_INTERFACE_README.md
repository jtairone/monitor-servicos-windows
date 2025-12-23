# 🔍 Service Monitor - Interface Web

Interface web para gerenciar e monitorar serviços do Windows com notificações via Discord.

## ✨ Recursos

✅ **Descobrir Serviços** - Liste todos os serviços do Windows  
✅ **Gerenciar Monitoramento** - Adicione/remova serviços com um clique  
✅ **Toggle Reiniciar** - Ative/desative reinício automático por serviço  
✅ **Interface Intuitiva** - Design moderno e responsivo  
✅ **Integração em Tempo Real** - Mudanças refletem imediatamente no monitor.js  

## 📋 Estrutura do Projeto

```
monitor-servicos/
├── monitor.js                 # Monitor principal (serviço em background)
├── app.js                     # Servidor Express (web interface)
├── discover-services.js       # Script para descobrir serviços
├── sendNotification.js        # Envia notificações Discord
├── logger.js                  # Sistema de logging
├── services.json              # Configuração dos serviços a monitorar
├── discovered-services.json   # Cache de serviços descobertos
├── package.json               # Dependências
├── public/                    # Arquivos frontend
│   ├── index.html            # Página principal
│   ├── styles.css            # Estilos
│   └── script.js             # Lógica frontend
└── scripts/
    └── restart-service.ps1   # Script PowerShell para reiniciar serviços
```

## 🚀 Como Usar

### 1. Instalar Dependências

```powershell
npm install
```

### 2. Iniciar a Interface Web

```powershell
npm run web
```

Ou execute diretamente:

```powershell
node app.js
```

A interface estará disponível em: **http://localhost:3000**
#### * altere a variável PORT no app.js caso a porta 300 esteja sendo utilizado por outra aplicação.

### 3. Usar a Interface

#### 📍 Aba "Descobrir Serviços"
1. Clique em **"Descobrir Serviços"** para listar todos os serviços do Windows
2. Use a busca para filtrar por nome ou exibição
3. Para cada serviço:
   - Veja o status (Rodando/Parado)
   - Active/desative o toggle **"Reiniciar se falhar"**
   - Clique em **"Monitorar"** para adicionar ao monitoramento
4. O serviço será adicionado ao `services.json`

#### 👁️ Aba "Serviços Monitorados"
- Visualize todos os serviços em monitoramento
- Veja se o restart automático está ativado
- Remova serviços clicando em **"Remover"**

### 4. Monitor Principal em Background

Execute em outro terminal para monitorar os serviços em tempo real:

```powershell
npm start
```

Ou:

```powershell
node monitor.js
```

## 🔄 Fluxo de Funcionamento

```
┌─────────────────────────────────────────┐
│   Interface Web (http://localhost:3000) │
└────────────┬────────────────────────────┘
             │
             ├─→ 🔎 Descobre Serviços (PowerShell)
             │    └─→ Salva em discovered-services.json
             │
             ├─→ 📌 Adiciona ao Monitoramento
             │    └─→ Escreve em services.json
             │
             └─→ 👁️ Carrega Serviços Monitorados
                  └─→ Lê de services.json

         ↓

┌──────────────────────────────┐
│  monitor.js (setInterval)    │
│  Lê services.json a cada     │
│  intervalo configurado       │
│                              │
│  ✓ Verifica status           │
│  ✓ Envia notificações        │
│  ✓ Reinicia se falhar        │
│  ✓ Atualiza logs             │
└──────────────────────────────┘
```

## 📝 Formato do services.json

```json
{
  "services": [
    {
      "name": "AdobeARMservice",
      "displayName": "Adobe Acrobat Update Service",
      "critical": false,
      "description": "Adicionado em 22/12/2025",
      "restartOnFailure": true
    }
  ],
  "discord": {
    "webhookUrl": "https://discord.com/api/webhooks/...",
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

## 🔌 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/discover-services` | Descobre serviços do Windows |
| `GET` | `/api/discovered-services` | Carrega serviços descobertos |
| `GET` | `/api/monitored-services` | Carrega serviços em monitoramento |
| `POST` | `/api/add-monitored-service` | Adiciona serviço ao monitoramento |
| `DELETE` | `/api/monitored-services/:name` | Remove serviço do monitoramento |

## ⚙️ Configurações

### Intervalo de Verificação (services.json)

```json
"monitoring": {
  "checkInterval": 30000  // 30 segundos
}
```

### Máximo de Tentativas de Reinício

```json
"monitoring": {
  "maxRetries": 3  // Tenta 3 vezes antes de desistir
}
```

### Webhook Discord

Atualize a URL do webhook no `services.json`:

```json
"discord": {
  "webhookUrl": "sua_url_do_webhook_aqui"
}
```

## 📱 Responsividade

A interface é totalmente responsiva e funciona em:
- 🖥️ Desktop (Chrome, Edge, Firefox)
- 📱 Tablet
- 📱 Mobile

## 🛠️ Troubleshooting

### Erro: "Arquivo não encontrado"
- Certifique-se de que `discovered-services.json` existe
- Clique em "Descobrir Serviços" primeiro

### Erro: "Serviço já está sendo monitorado"
- O serviço já foi adicionado anteriormente
- Remova primeiro pela aba "Serviços Monitorados"

### Serviços não aparecem em monitoramento
- Verifique se `monitor.js` está em execução
- Confirme que `services.json` foi atualizado corretamente
- Reinicie o `monitor.js`

### Não recebe notificações Discord
- Valide a URL do webhook em `services.json`
- Confirme que o Discord webhook está ativo
- Verifique se o bot tem permissão no canal

## 📊 Logs

Os logs estão disponíveis em:
```
/logs/
```

Configure o nível de log em `services.json`:
```json
"monitoring": {
  "logLevel": "info"  // info, warn, error, debug
}
```

## 🚨 Importante

⚠️ **Execute como Administrador** - Necessário para reiniciar serviços  
⚠️ **Backup do services.json** - Guarde uma cópia antes de fazer mudanças  
⚠️ **Cuidado com serviços críticos** - Não desative o reinício de serviços essenciais  

## 📞 Suporte

Para reportar bugs ou sugerir melhorias, entre em contato.

---

**Versão:** 2.0.0  
**Última atualização:** 23 de Dezembro de 2025
