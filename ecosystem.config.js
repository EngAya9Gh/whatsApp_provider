// PM2: three processes (names match the GitHub deploy workflow). Every deploy runs
// `pm2 startOrRestart ecosystem.config.js --update-env`: apps not running yet start, the others restart.
//   whatsapp-api       HTTP API + dashboard sockets. QR_SESSIONS=remote: the QR numbers are held by whatsapp-sessions
//   whatsapp-worker    Meta webhooks, Meta campaigns, schedulers (tickets, billing, retention, alerts)
//   whatsapp-sessions  WhatsApp QR (Baileys) numbers + QR campaigns: a deploy or a memory restart of the api
//                      no longer disconnects them (they reconnect from sessions/ without a new scan)
// Check with `pm2 ls` (three processes) and the admin System health page.
// To move the QR numbers back into the api: remove QR_SESSIONS below and the whatsapp-sessions app, deploy,
// then on the server: pm2 delete whatsapp-sessions && pm2 save
module.exports = {
  apps: [
    {
      name: 'whatsapp-api',
      script: 'src/server.js',
      env: { PROCESS_ROLE: 'api', QR_SESSIONS: 'remote' },
      max_memory_restart: '1G'
    },
    {
      name: 'whatsapp-worker',
      script: 'src/worker.js',
      env: { PROCESS_ROLE: 'worker', QR_SESSIONS: 'remote' },
      kill_timeout: 30000, // time to finish the jobs in progress on restart
      max_memory_restart: '1G'
    },
    {
      name: 'whatsapp-sessions',
      script: 'src/sessions.js',
      env: { PROCESS_ROLE: 'sessions', QR_SESSIONS: 'remote' },
      kill_timeout: 15000, // time to finish the sends in progress on restart
      max_memory_restart: '1G'
    }
  ]
};
