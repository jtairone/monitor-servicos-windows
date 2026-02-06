const path = require('path');
const { Service } = require('node-windows');

// Caminho do script principal da sua aplicação
const scriptPath = path.join(__dirname, 'app.js');

// Definição do serviço do Windows
const svc = new Service({
  name: 'MonitorServicos',
  description: 'Monitor de serviços do Windows desenvolvido em Node.js',
  script: scriptPath,
  // Opcional: argumentos extras para o Node, se desejar
  // nodeOptions: [
  //   '--harmony',
  //   '--max_old_space_size=4096'
  // ]
});

// Eventos úteis para debug
svc.on('install', () => {
  console.log('✅ Serviço "MonitorServicos" instalado com sucesso.');
  console.log('▶ Iniciando serviço...');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('ℹ O serviço "MonitorServicos" já está instalado.');
});

svc.on('start', () => {
  console.log('✅ Serviço "MonitorServicos" iniciado.');
});

svc.on('error', (err) => {
  console.error('❌ Erro no serviço "MonitorServicos":', err.message || err);
});

svc.on('uninstall', () => {
  console.log('🗑 Serviço "MonitorServicos" desinstalado.');
});

// Executa a instalação quando rodar `node service.js`
svc.install();

