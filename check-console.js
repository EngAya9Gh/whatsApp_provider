const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  
  // Login
  await page.type('input[type="email"]', 'admin@example.com');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  
  console.log('Navigating to Meta Templates...');
  await page.goto('http://localhost:5174/meta-templates', { waitUntil: 'networkidle2' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Navigating to Meta Profile...');
  await page.goto('http://localhost:5174/meta-business-profile', { waitUntil: 'networkidle2' });
  
  await new Promise(r => setTimeout(r, 2000));

  await browser.close();
})();
