import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const html = fs.readFileSync('gas_shell_built.html', 'utf8');
await page.setContent(html, { waitUntil: 'load' });
const dump = await page.evaluate(() => {
  const pc = document.querySelector('.page-content');
  const mc = document.querySelector('.main-content');
  const childrenOfPC = pc ? Array.from(pc.children).map(c => c.id || c.tagName) : null;
  const childrenOfMC = mc ? Array.from(mc.children).map(c => c.id || c.className || c.tagName) : null;
  const allPages = Array.from(document.querySelectorAll('.page')).map(p => ({ id: p.id, parent: p.parentElement ? (p.parentElement.id || p.parentElement.className || 'BODY') : '?' }));
  const qr = document.getElementById('qrPage');
  let qrContent = null;
  if (qr) {
    const r = qr.getBoundingClientRect();
    qrContent = { parent: qr.parentElement.className, rect: Math.round(r.width) + 'x' + Math.round(r.height), childPageIds: Array.from(qr.children).map(c => c.id || c.tagName) };
  }
  return { childrenOfPC, childrenOfMC, allPages, qrContent };
}).catch(e => ({ err: String(e) }));
console.log(JSON.stringify(dump, null, 1));
await browser.close();
