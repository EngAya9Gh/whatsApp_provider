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
      
      // Update backgrounds
      content = content.replace(/background:\s*white;?/g, 'background: rgba(255,255,255,0.03);');
      content = content.replace(/background:\s*#F8FAFC;?/g, 'background: #0F172A;');
      content = content.replace(/background:\s*#f9fafb;?/g, 'background: transparent;');
      content = content.replace(/background:\s*#F1F5F9;?/g, 'background: #0F172A;');
      
      // Update texts
      content = content.replace(/color:\s*#111827;?/g, 'color: #F8FAFC;');
      content = content.replace(/color:\s*#1E293B;?/g, 'color: #E2E8F0;');
      content = content.replace(/color:\s*#0f172a;?/g, 'color: #F8FAFC;');
      content = content.replace(/color:\s*#374151;?/g, 'color: #E2E8F0;');
      content = content.replace(/color:\s*#334155;?/g, 'color: #cbd5e1;');
      content = content.replace(/color:\s*#6b7280;?/g, 'color: #94A3B8;');
      content = content.replace(/color:\s*#64748b;?/g, 'color: #94A3B8;');
      
      // Update borders
      content = content.replace(/border:\s*1px\s+solid\s+#E2E8F0;?/g, 'border: 1px solid rgba(255,255,255,0.1);');
      content = content.replace(/border-bottom:\s*1px\s+solid\s+#e5e7eb;?/g, 'border-bottom: 1px solid rgba(255,255,255,0.05);');
      content = content.replace(/border-top:\s*1px\s+solid\s+#e5e7eb;?/g, 'border-top: 1px solid rgba(255,255,255,0.05);');
      
      // inputs
      content = content.replace(/border:\s*1.5px\s+solid\s+#E2E8F0;?/g, 'border: 1.5px solid rgba(255,255,255,0.1);');
      
      // table row hover or specific things
      content = content.replace(/background:\s*#f3f4f6;?/g, 'background: rgba(255,255,255,0.05);');
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

dirs.forEach(processDir);
console.log('Done!');
