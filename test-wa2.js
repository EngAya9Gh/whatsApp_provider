const sessionManager = require('./src/modules/whatsapp/session.manager');

async function run() {
  const tenantId = 'd6550b31-bff3-4a6a-9572-97871d1451c4';
  await sessionManager.createSession(tenantId);
  
  setTimeout(async () => {
    const sock = sessionManager.getSession(tenantId);
    if (!sock) return console.log('No sock');
    
    try {
      const res = await sock.onWhatsApp('963932903237');
      console.log('onWhatsApp:', res);
      const test = await sock.sendMessage('963932903237@s.whatsapp.net', {text: 'test'});
      console.log('sendTest:', test);
    } catch (e) {
      console.log('error:', e);
    }
    process.exit(0);
  }, 5000);
}
run();
