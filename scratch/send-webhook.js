const crypto = require('crypto');
const http = require('https'); // or http depending on the url

const url = 'https://provider.wakeel.cc/api/v1/meta/webhook';
const secret = '5a880bb6c6173474a926f328a6a98492'; // From user's .env

const payload = {
  object: "whatsapp_business_account",
  entry: [{
    id: "1054343476970194", // WABA ID
    changes: [{
      field: "messages",
      value: {
        messaging_product: "whatsapp",
        metadata: {
          display_phone_number: "16505551111",
          phone_number_id: "1267824766416701" // Real Phone Number ID
        },
        contacts: [{
          profile: { name: "Test User" },
          wa_id: "966535278722"
        }],
        messages: [{
          id: "ABGGFlA5Fpa_" + Date.now(),
          from: "966535278722",
          type: "text",
          text: { body: "مرحباً! هذه رسالة تجريبية من السكربت" },
          timestamp: Math.floor(Date.now() / 1000).toString()
        }]
      }
    }]
  }]
};

const payloadString = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Hub-Signature-256': `sha256=${signature}`
  }
};

const req = http.request(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(payloadString);
req.end();
