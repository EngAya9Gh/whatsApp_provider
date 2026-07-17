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
      
      const messageContent = {
          interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({ text: "Hello without ViewOnce!" }),
              footer: proto.Message.InteractiveMessage.Footer.create({ text: "Footer" }),
              header: proto.Message.InteractiveMessage.Header.create({ title: "Title", subtitle: "subtitle", hasMediaAttachment: false }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                  buttons: [
                      {
                          name: "quick_reply",
                          buttonParamsJson: JSON.stringify({
                              display_text: "Click Me",
                              id: "btn_1"
                          })
                      }
                  ]
              })
          })
      };
      
      const waMsg = generateWAMessageFromContent(formattedPhone, messageContent, { userJid: sock.user.id });
      const res = await sock.relayMessage(formattedPhone, waMsg.message, { messageId: waMsg.key.id });
      console.log('Result:', res);
    } catch (e) {
      console.log('error:', e);
    }
    process.exit(0);
  }, 3000);
}
run();
