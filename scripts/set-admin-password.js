#!/usr/bin/env node
// Sets the admin dashboard password on the server, without handling the hash by hand.
//   cd /home/provider/htdocs/provider.wakeel.cc && node scripts/set-admin-password.js
// Asks for the new password twice (nothing shows while typing), turns it into a bcrypt hash and writes
// ADMIN_PASSWORD_HASH='…' into .env (the old line is replaced, every other line is kept; a copy is saved as
// .env.bak). Then restart: pm2 restart whatsapp-api --update-env
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcryptjs');

const ENV_FILE = path.join(__dirname, '..', '.env');

// One terminal reader for both questions; what is typed is not shown (typed lines wait in a queue)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
rl._writeToOutput = () => {};
const queue = [];
let waiting = null;
rl.on('line', (line) => { if (waiting) { const take = waiting; waiting = null; take(line); } else queue.push(line); });
const askHidden = (question) => new Promise((resolve) => {
  process.stdout.write(question);
  const done = (line) => { process.stdout.write('\n'); resolve(line); };
  if (queue.length) done(queue.shift());
  else waiting = done;
});
const stop = (message) => { console.error(message); rl.close(); process.exit(1); };

(async () => {
  if (!fs.existsSync(ENV_FILE)) {
    stop(`No .env file at ${ENV_FILE}. Run this from the project folder on the server.`);
  }
  const password = await askHidden('New admin password / كلمة سر الأدمن الجديدة: ');
  if (password.length < 10) {
    stop('Use at least 10 characters. / استخدم 10 أحرف على الأقل.');
  }
  const again = await askHidden('Type it again / اكتبها مرة ثانية: ');
  if (again !== password) {
    stop('The two passwords are different. Nothing was changed. / الكلمتان مختلفتان، لم يتغير شيء.');
  }

  rl.close();
  const hash = bcrypt.hashSync(password, 10);
  const line = `ADMIN_PASSWORD_HASH='${hash}'`;
  const text = fs.readFileSync(ENV_FILE, 'utf8');
  fs.writeFileSync(`${ENV_FILE}.bak`, text);
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex(l => /^\s*ADMIN_PASSWORD_HASH\s*=/.test(l));
  if (at >= 0) lines[at] = line;
  else lines.splice(lines[lines.length - 1] === '' ? lines.length - 1 : lines.length, 0, line);
  fs.writeFileSync(ENV_FILE, lines.join('\n'));

  const email = (text.match(/^\s*ADMIN_EMAIL\s*=\s*['"]?([^'"\r\n]+)/m) || [])[1] || 'admin@wakeel.tech';
  console.log('\nDone. / تم.');
  console.log(`Admin email / إيميل الأدمن: ${email.trim()}`);
  console.log('Now restart / الآن أعد التشغيل:  pm2 restart whatsapp-api --update-env');
})();
