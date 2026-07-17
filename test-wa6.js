const sessionManager = require('./src/modules/whatsapp/session.manager');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

async function run() {
  const tenantId = 'd6550b31-bff3-4a6a-9572-97871d1451c4';
  await sessionManager.createSession(tenantId);
  setTimeout(async () => {
    const sock = sessionManager.getSession(tenantId);
    if (!sock) return console.log('No sock');
    
    try {
      const formattedPhone = '963932903237@s.whatsapp.net';
      
      const res = await sock.sendMessage(formattedPhone, {
          text: "Testing Baileys helper buttons",
          footer: "Footer text",
          buttons: [
              { buttonId: 'id1', buttonText: { displayText: 'Button 1' }, type: 1 }
          ],
          headerType: 1
      });
      console.log('Result helper:', res.key.id);
    } catch (e) {
      console.log('error:', e);
    }
    process.exit(0);
  }, 3000);
}
run();
