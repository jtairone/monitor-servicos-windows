module.exports = {
  apps: [{
    name: 'monitor-servicos',
    script: 'app.js',
    watch: false, // Desabilita watch mode em produção
    instances: 'max', // Ou número específico
    exec_mode: 'fork', // Ou 'cluster' se desejar balanceamento de carga
    env: {
      NODE_ENV: 'production'
    }
  }]
}