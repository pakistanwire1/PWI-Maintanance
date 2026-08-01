import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMAIL = 'supervisor@cmms.com';
const PASSWORD = 'super123';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, 'verify_shots');
fs.mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function capture(name, base) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(base, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.evaluate(() => { try { localStorage.setItem('cmms_welcomed', '1'); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle2', timeout: 120000 });
  await page.waitForSelector('#loginForm', { timeout: 60000 });
  await page.type('#loginEmail', EMAIL);
  await page.type('#loginPassword', PASSWORD);
  await page.evaluate(() => document.getElementById('loginForm').dispatchEvent(new Event('submit')));
  await page.waitForFunction(() => { try { return !!localStorage.getItem('cmms_token'); } catch (e) { return false; } }, { timeout: 120000 });
  await page.waitForSelector('#pageContent', { timeout: 60000 });
  await page.evaluate(() => navigateTo('reports'));
  await page.waitForSelector('#rptType', { timeout: 60000 });
  try {
    await page.waitForFunction(() => {
      return ['rptType','rptDivision','rptSection','rptDepartment','rptMachineNumber'].every(id => {
        const el = document.getElementById(id);
        return el && Array.from(el.options).some(o => o.value !== '');
      });
    }, { timeout: 120000 });
  } catch (e) { console.log(name + ': dropdown wait timed out (expected for BEFORE)'); }
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, name + '.png') });
  await browser.close();
  console.log('saved ' + OUT + '\\' + name + '.png');
}

await capture('reports_before', 'https://ff9dc02b.pwi-maintanance.pages.dev');
await capture('reports_after', 'https://pwi-maintanance.pages.dev');
