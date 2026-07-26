import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));
  
  console.log('Navigating to http://localhost:5173/diary/create...');
  try {
    await page.goto('http://localhost:5173/diary/create', { waitUntil: 'networkidle2' });
  } catch (err) {
    console.error("Navigation failed", err);
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
