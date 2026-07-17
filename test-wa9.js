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
      
      const templateMessage = {
        hydratedTemplate: {
          hydratedContentText: "Testing templateMessage buttons",
          hydratedFooterText: "Footer",
          hydratedButtons: [
            {
              index: 1,
              quickReplyButton: {
                displayText: "Click Me Template",
                id: "btn1"
              }
            }
          ]
        }
      };
      
      const msg = generateWAMessageFromContent(formattedPhone, {
        templateMessage
      }, { userJid: sock.user.id });
      
      const res = await sock.relayMessage(formattedPhone, msg.message, { messageId: msg.key.id });
      console.log('Result:', res);
    } catch (e) {
      console.log('error:', e);
    }
    process.exit(0);
  }, 3000);
}
run();
