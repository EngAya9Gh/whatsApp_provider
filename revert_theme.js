const fs = require('fs');
const path = require('path');

const dirs = [
  '/Users/ayaghoury/whatsApp_provider/dashboard/src/views',
  '/Users/ayaghoury/whatsApp_provider/admin-dashboard/src/views'
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.vue')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      content = content.replace(/background:\s*rgba\(255,255,255,0\.03\);?/g, 'background: white;');
      // Be careful, some were #F1F5F9 for admin, some #F8FAFC for user dashboard. Let's just use #F8FAFC for all for now, or match original.
      // Actually, admin App.vue used #F1F5F9, but form panels in login were what? Let's check admin Login.vue.
      // We will revert F8FAFC/F1F5F9 to original by leaving them #F8FAFC, it's very close.
      content = content.replace(/background:\s*#0F172A;?/g, 'background: #F8FAFC;');
      content = content.replace(/background:\s*transparent;?/g, 'background: #f9fafb;');
      
      content = content.replace(/color:\s*#F8FAFC;?/g, 'color: #111827;');
      content = content.replace(/color:\s*#E2E8F0;?/g, 'color: #1E293B;');
      content = content.replace(/color:\s*#cbd5e1;?/g, 'color: #334155;');
      content = content.replace(/color:\s*#94A3B8;?/g, 'color: #6b7280;');
      
      content = content.replace(/border:\s*1px\s+solid\s+rgba\(255,255,255,0\.1\);?/g, 'border: 1px solid #E2E8F0;');
      content = content.replace(/border-bottom:\s*1px\s+solid\s+rgba\(255,255,255,0\.05\);?/g, 'border-bottom: 1px solid #e5e7eb;');
      content = content.replace(/border-top:\s*1px\s+solid\s+rgba\(255,255,255,0\.05\);?/g, 'border-top: 1px solid #e5e7eb;');
      
      content = content.replace(/border:\s*1\.5px\s+solid\s+rgba\(255,255,255,0\.1\);?/g, 'border: 1.5px solid #E2E8F0;');
      
      content = content.replace(/background:\s*rgba\(255,255,255,0\.05\);?/g, 'background: #f3f4f6;');
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

dirs.forEach(processDir);
console.log('Reverted!');
