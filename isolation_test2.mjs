import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const html = `<style>
.page { display: none; animation: fadeIn 0.3s ease; background: #333; color: #fff; padding: 20px; }
.page.active { display: block; min-height: 100%; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
</style>
<body style="margin:0;background:#111">
<div class="page">DASHBOARD</div>
<div class="page">AUDIT</div>
<button id="nav1">to dashboard</button>
<script>
nav1.onclick = () => { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); document.querySelectorAll('.page')[0].classList.add('active'); };
</script>`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(html);
console.log('after load (no active): ' + JSON.stringify(await page.evaluate(() => document.querySelectorAll('.page').length)));
await sleep(500);
await page.click('#nav1');
console.log('after toggle: ' + JSON.stringify(await page.evaluate(() => {
  const el = document.querySelectorAll('.page')[0];
  return { op: getComputedStyle(el).opacity, anims: el.getAnimations().length };
})));
await sleep(600);
console.log('600ms later: ' + JSON.stringify(await page.evaluate(() => {
  const el = document.querySelectorAll('.page')[0];
  return { op: getComputedStyle(el).opacity, anims: el.getAnimations().length };
})));
await browser.close();
