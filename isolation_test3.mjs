import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const html = `<style>
#appContainer { display: none; }
.page { display: none; animation: fadeIn 0.3s ease; background: #333; color: #fff; padding: 20px; }
.page.active { display: block; min-height: 100%; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
</style>
<body style="margin:0;background:#111">
<div id="appContainer"><div class="page">DASHBOARD</div><div class="page">AUDIT</div></div>
<button id="login">login</button>
<button id="navAudit">go audit</button>
<script>
login.onclick = () => { document.getElementById('appContainer').style.display = 'block'; document.querySelectorAll('.page')[0].classList.add('active'); };
navAudit.onclick = () => { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); document.querySelectorAll('.page')[1].classList.add('active'); };
</script>`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(html);
const probe = () => page.evaluate(() => {
  const p = Array.from(document.querySelectorAll('.page'));
  return p.map(el => ({ op: getComputedStyle(el).opacity, anims: el.getAnimations().length }));
});
console.log('before login: ' + JSON.stringify(await probe()));
await page.click('#login');
await sleep(50);
console.log('t+50ms after reveal+activate: ' + JSON.stringify(await probe()));
await sleep(700);
console.log('t+750ms: ' + JSON.stringify(await probe()));
await page.click('#navAudit');
await sleep(50);
console.log('t+50ms after nav to audit: ' + JSON.stringify(await probe()));
await sleep(700);
console.log('t+750ms audit: ' + JSON.stringify(await probe()));
// now test repeatedly toggling same page (simulating repeated navigateTo)
for (let i = 0; i < 5; i++) { await page.click('#navAudit'); await sleep(30); }
await sleep(700);
console.log('after 5 rapid re-navigations 700ms: ' + JSON.stringify(await probe()));
await browser.close();
