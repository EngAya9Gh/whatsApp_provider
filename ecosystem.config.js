// PM2: the API and the background worker as two processes (names match the GitHub deploy workflow).
// Every deploy runs `pm2 startOrRestart ecosystem.config.js --update-env`, which starts the worker the first
// time and restarts both after that. Check with `pm2 ls` (two processes) and the admin System health page.
// To go back to one process: in the deploy, replace that line with `pm2 restart whatsapp-api`, then on the
// server: pm2 delete whatsapp-worker && pm2 restart whatsapp-api --update-env && pm2 save
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
