const sessionManager = require('./src/modules/whatsapp/session.manager');
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const fs = require('fs');

async function run() {
  const tenantId = 'd6550b31-bff3-4a6a-9572-97871d1451c4';
  await sessionManager.createSession(tenantId);
  setTimeout(async () => {
    const sock = sessionManager.getSession(tenantId);
    if (!sock) return console.log('No sock');
    
    try {
      const formattedPhone = '963932903237@s.whatsapp.net';
      
      const imageBuffer = fs.readFileSync('dashboard/src/assets/logo.png');
      const media = await prepareWAMessageMedia({ image: imageBuffer }, { upload: sock.waUploadToServer });
      const imageMessage = media.imageMessage;

      const messageContent = {
        viewOnceMessage: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({ text: 'Test Image inside Buttons' }),
              footer: proto.Message.InteractiveMessage.Footer.create({ text: 'Footer' }),
              header: proto.Message.InteractiveMessage.Header.create({ 
                title: 'Title', 
                subtitle: 'Subtitle', 
                hasMediaAttachment: true,
                imageMessage
              }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [
                  {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                      display_text: "Click Me Image",
                      id: "btn1"
                    })
                  }
                ]
              })
            })
          }
        }
      };
      
      const msg = generateWAMessageFromContent(formattedPhone, messageContent, { userJid: sock.user.id });
      
      const res = await sock.relayMessage(formattedPhone, msg.message, { messageId: msg.key.id });
      console.log('Result:', res);
    } catch (e) {
      console.log('error:', e);
    }
    process.exit(0);
  }, 3000);
}
run();
