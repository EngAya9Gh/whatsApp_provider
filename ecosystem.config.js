// PM2: the API and the background worker as two processes (names match the GitHub deploy workflow).
// Switch once on the server:
//   pm2 delete whatsapp-api && pm2 start ecosystem.config.js && pm2 save
// After that every deploy restarts both. To go back to one process:
//   pm2 delete whatsapp-api whatsapp-worker && pm2 start src/server.js --name whatsapp-api && pm2 save
module.exports = {
  apps: [
    {
      name: 'whatsapp-api',
      script: 'src/server.js',
      env: { PROCESS_ROLE: 'api' },
      max_memory_restart: '1G'
    },
    {
      name: 'whatsapp-worker',
      script: 'src/worker.js',
      env: { PROCESS_ROLE: 'worker' },
      kill_timeout: 30000, // time to finish the jobs in progress on restart
      max_memory_restart: '1G'
    }
  ]
};
