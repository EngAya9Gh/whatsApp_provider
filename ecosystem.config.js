// PM2: the API and the background worker as two processes.
//   pm2 delete all && pm2 start ecosystem.config.js && pm2 save
// (deploy.sh keeps working: "pm2 restart all" restarts both)
// To stay with a single process instead, run only src/server.js without PROCESS_ROLE (= "all").
module.exports = {
  apps: [
    {
      name: 'wakeel-api',
      script: 'src/server.js',
      env: { PROCESS_ROLE: 'api' },
      max_memory_restart: '1G'
    },
    {
      name: 'wakeel-worker',
      script: 'src/worker.js',
      env: { PROCESS_ROLE: 'worker' },
      kill_timeout: 30000, // time to finish the jobs in progress on restart
      max_memory_restart: '1G'
    }
  ]
};
