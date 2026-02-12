
# 🖥️ Windows Service Monitor com Notificações Discord

<img width="320" height="450" alt="iniciando aplicação" src="https://github.com/user-attachments/assets/720f8140-ea1a-4152-8a94-1f866d93b374" />

<img width="320" height="450" alt="Serviço parou reinicia" src="https://github.com/user-attachments/assets/b2f449ae-44c0-44b6-8f89-10e298839704" />

<img width="320" height="450" alt="iniciando aplicação" src="https://github.com/user-attachments/assets/720f8140-ea1a-4152-8a94-1f866d93b374" />

<img width="320" height="450" alt="Serviço parou reinicia" src="https://github.com/user-attachments/assets/b2f449ae-44c0-44b6-8f89-10e298839704" />

Uma aplicação completa Node.js + Express que monitora serviços do Windows e envia notificações via Discord quando um serviço para de funcionar. Inclui interface web intuitiva para gerenciamento.

## ✨ Características

- ✅ **Interface Web** - Gerenciar serviços via navegador
- ✅ **Descoberta Automática** - Liste todos os serviços do Windows
- ✅ **Monitoramento em Tempo Real** - Verifica status continuamente
- ✅ **Notificações Discord** - Embeds bonitos e informativos
- ✅ **Reinício Automático** - Reinicia serviços com falha (configurável)
- ✅ **Sistema de Logs** - Rastreamento completo com Winston
- ✅ **Banco de Dados SQLite** - Armazenamento persistente de serviços, configurações e auditoria (não mais JSON)
- ✅ **Responsivo** - Funciona em desktop, tablet e mobile

## 🔐 Funcionalidades Phase 2 (Segurança)

- ✅ **Autenticação JWT** - Login seguro com JWT tokens (24h expiry)
- ✅ **Encriptação de Senha** - Bcryptjs com 10 salt rounds
- ✅ **Auditoria Completa** - Registro de todas as ações (LOGIN, LOGOUT, START, STOP, RESTART, ADD_SERVICE, REMOVE_SERVICE)
- ✅ **Rate Limiting** - Proteção contra força bruta (5 tentativas/15min login, 10 ações/min)
- ✅ **Dark Mode** - Tema escuro com CSS variables e persistência localStorage
- ✅ **Toast Notifications** - Notificações visuais para ações do usuário
- ✅ **Modais de Confirmação** - Confirmações para ações críticas
- ✅ **Interface Responsiva** - Design mobile-first com breakpoints (1200px, 768px, 480px)
- ✅ **Filtros Avançados** - Busca por nome/descrição e filtro por status
- ✅ **Aba de Auditoria** - Visualização de histórico de ações com timestamps
- ✅ **Gerenciamento de Configurações** - Editar porta, intervalo, webhooks via interface

## 🔑 Funcionalidades Phase 3 (Admin Único)

- ✅ **Cadastro de Admin Único** - Apenas um administrador permitido na primeira execução
- ✅ **Sistema de Registro** - Página dedicada para criar admin (desabilitada após primeiro cadastro)
- ✅ **Slider Restart Automático** - Toggle interativo com feedback visual (verde quando ativo)
- ✅ **Indicador de Restart** - Badges nos serviços monitorados mostrando status do restart (Auto-Restart/Sem Restart)
- ✅ **Validação de Força de Senha** - Indicador em tempo real (Fraca/Média/Boa/Forte)
- ✅ **CORS Habilitado** - Suporte a requisições cross-origin
- ✅ **Verificação de Admin** - API endpoint para verificar se admin já existe
- ✅ **Mensagens Personalizadas** - Feedback claro quando cadastro já foi realizado

## 🗺️ Roadmap - Funcionalidades Futuras

### 📋 Próxima Feature (Phase 4)
- [ ] **Gestão de Usuários Admin** - Possibilidade de alterar credenciais do admin
  - Tela para mudar senha do administrador
  - Recuperação de senha via email
  - Log de alterações de credenciais

### 📋 Em Desenvolvimento
- [ ] **Notificações via Telegram** - Suporte a Bot do Telegram como alternativa ao Discord
  - Integração com API do Telegram
  - Suporte a commands de status via Telegram
  
- [ ] **Monitoramento de Hosts Remotos (Multi-agent)** - Expandir para máquinas na rede
  - Agente Node.js em hosts remotos
  - Sincronização com servidor central
  - Dashboard unificado com múltiplos hosts
  - Comunicação segura (SSL/TLS)

### 🎯 Planejado para Futuro
- [ ] **Email Notifications** - Suporte a notificações via SMTP
- [ ] **Gráficos de Uptime** - Dashboard com estatísticas visuais e métricas
- [ ] **Two-Factor Authentication** - 2FA com autenticador mobile
- [ ] **Role-Based Access Control** - Diferentes níveis de permissão (admin, monitor, viewer)
- [ ] **Backup & Restore** - Sistema de backup automático das configurações e dados

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

### 3. Iniciar a Aplicação

**Opção 1: Interface Web (DEBUG)**
```powershell
# Abre interface web em http://localhost:3000
npm start
```

**Opção 2: Produção com PM2**
```powershell
pm2 start app.js --name "Service Monitor Web"
pm2 start src/monitor.js --name "Service Monitor"
```
##### * Não recomendo pois teria inicia como administrador pra poder rodar comando no cmd de reinicio 

### 5. Executar como Serviço do Windows (node-windows) Recomendado

Para que o monitor consiga iniciar/parar/reiniciar serviços com mais estabilidade, você pode rodar a aplicação como **serviço do Windows** usando o `node-windows`:

1. Instale a dependência (uma vez):
   ```powershell
   npm install node-windows
   ```
   ###### * Já deve estar instalado no projeto pois e um pacote do package.json
2. Abra o **PowerShell** ou **Prompt de Comando** como **Administrador**  
   (botão direito → "Executar como administrador").
3. Navegue até a pasta do projeto:
   ```powershell
   cd C:\"Caminho pasta do projeto"\monitor-servicos
   ```
4. Execute o script que registra o serviço:
   ```powershell
   node service.js
   ```
5. Após a instalação, abra `services.msc` e procure por `MonitorServicos`.
   - Verifique se o serviço está em execução.
   - Opcional: ajuste a conta de Logon do serviço se precisar de permissões específicas.

A interface estará disponível em: **http://localhost:3000**

##### * **Se porta padrão for 3000 se tiver alterado no services.json usar a denifida lá**

### 4. Configurar 

Acessar http://localhost:3000 *ou porta tiver parametrizado em configurações, configurar o webhook do discord e salvar e demais parametrizações forem necessarias.

## 💾 Banco de Dados SQLite

A partir da versão atual, toda persistência de dados é realizada em **banco de dados SQLite** em vez de arquivos JSON. Isso proporciona melhor performance, integridade de dados e facilita consultas e análises.

### 📊 Estrutura do Banco de Dados

#### Tabela: `users`
Armazena credenciais do administrador
```
- id (INTEGER PRIMARY KEY)
- username (STRING) - Nome de usuário único
- password (STRING) - Senha criptografada com bcryptjs
- createdAt (TIMESTAMP) - Data de criação
```

#### Tabela: `services`
Armazena serviços sob monitoramento
```
- id (INTEGER PRIMARY KEY)
- name (STRING) - Nome técnico do serviço (único)
- displayName (STRING) - Nome de exibição
- restartOnFailure (BOOLEAN) - Se deve reiniciar automaticamente
- createdAt (TIMESTAMP) - Data de adição
- updatedAt (TIMESTAMP) - Última atualização
```

#### Tabela: `monitoring_config`
Armazena configurações globais do sistema
```
- id (INTEGER PRIMARY KEY)
- servidor_porta (INTEGER) - Porta do servidor web
- discord_webhook_url (STRING) - URL do webhook Discord
- discord_send_startup (BOOLEAN) - Notificar ao iniciar
- discord_notify_recovery (BOOLEAN) - Notificar ao recuperar
- monitoring_check_interval (INTEGER) - Intervalo de verificação (ms)
- monitoring_max_retries (INTEGER) - Máximo de tentativas de restart
- monitoring_log_level (STRING) - Nível de log (debug/info/warn/error)
```

#### Tabela: `audit_logs`
Registra todas as ações realizadas no sistema
```
- id (INTEGER PRIMARY KEY)
- username (STRING) - Usuário que realizou a ação
- action (STRING) - Tipo de ação (LOGIN, LOGOUT, START, STOP, RESTART, etc)
- details (JSON) - Detalhes da ação
- ip_address (STRING) - IP do cliente
- createdAt (TIMESTAMP) - Data/hora da ação
```

### 📂 Localização do Banco de Dados

O arquivo SQLite é armazenado em: `./src/database/banco.sqlite`

### ✨ Benefícios do SQLite

- ✅ **Armazenamento Persistente** - Dados salvos mesmo após reinicializações
- ✅ **Performance** - Queries otimizadas comparado a leitura de JSON
- ✅ **Integridade** - Relacionamentos e constraints garantem consistência
- ✅ **Auditoria Completa** - Histórico de todas as ações
- ✅ **Facilita Análises** - Consultas SQL complexas possíveis
- ✅ **Sem Conflitos** - Locking automático previne corrupção de dados
- ✅ **Backup Simples** - Apenas copiar o arquivo `.sqlite`

##### * **Não há mais necessidade de configurar services.json manualmente - tudo é gerenciado via interface web!**


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
| `GET` | `/api/list-services` | Carrega serviços em monitoramento |
| `POST` | `/api/add-service` | Adiciona serviço ao monitoramento |
| `DELETE` | `/api/remove-service` | Remove serviço do monitoramento |

## 🛠️ Troubleshooting

### ❌ Erro: "Webhook URL do Discord não configurado"
**Solução:** Configurar na pagina WEB menu configuração a URL do Webhook

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
1. Edite configuração na pagina WEB e altere para outra porta esteja disponível.
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

Configure em pagina web em configurações:

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
pm2 start app.js --name "Service Monitor Web"

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
services.json
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
- [ ] Adicionar webhook do Discord
- [ ] Rodar `npm start`

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

**Última atualização:** 12 de fevereiro de 2026  
**Versão:** 3.0.0 (Phase 3 - Admin Único & Melhorias)  
**Status:** ✅ Pronto para Produção

### Histórico de Versões

| Versão | Data | Destaques |
|--------|------|----------|
| 3.0.0 | 12/02/2026 | ✅ Admin Único, Slider Restart, Badges de Status, Página Registro, CORS, Banco de Dados |
| 2.0.0 | 09/02/2026 | ✅ Autenticação JWT, Auditoria, Dark Mode, Responsivo |
| 2.1.0 | 26/12/2025 | ✅ Interface Web completa, Notificações Discord |
| 1.0.0 | 01/12/2025 | ✅ Monitor básico em background |
