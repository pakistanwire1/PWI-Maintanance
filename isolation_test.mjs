import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const html = `<style>
.page { display: none; animation: fadeIn 0.3s ease; background: #333; color: #fff; }
.page.active { display: block; min-height: 100%; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
</style>
<body style="margin:0">
<div id="p1" class="page active">PAGE ONE VISIBLE CONTENT</div>
<div id="p2" class="page">PAGE TWO</div>
<button id="btn">nav to p2</button>
<script>
btn.onclick = () => { document.getElementById('p1').classList.remove('active'); document.getElementById('p2').classList.add('active'); };
</script>`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(html);
const probe = () => page.evaluate(() => ({
  p1: { op: getComputedStyle(document.getElementById('p1')).opacity, anims: document.getElementById('p1').getAnimations().length },
  p2: { op: getComputedStyle(document.getElementById('p2')).opacity, anims: document.getElementById('p2').getAnimations().length }
}));
console.log('initial (p2 active hidden, p1 shown): ' + JSON.stringify(await probe()));
await page.click('#btn');
console.log('after nav immediate: ' + JSON.stringify(await probe()));
await sleep(600);
console.log('after nav 600ms: ' + JSON.stringify(await probe()));
await page.click('#btn');
await sleep(600);
console.log('back to p1 600ms: ' + JSON.stringify(await probe()));
// Test direct DOMContentLoaded with page already active (no toggle)
const html2 = `<style>.page{display:none;animation:fadeIn 0.3s ease}.page.active{display:block}@keyframes fadeIn{from{opacity:0}to{opacity:1}}</style>
<body style="margin:0"><div id="q" class="page active">ALREADY ACTIVE</div></body>`;
await page.setContent(html2);
console.log('already-active-on-load 800ms: ' + JSON.stringify(await page.evaluate(() => getComputedStyle(document.getElementById('q')).opacity)));
await sleep(600);
await browser.close();
