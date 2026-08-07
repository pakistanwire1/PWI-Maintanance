import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const html = fs.readFileSync('gas_shell_built.html', 'utf8');
await page.setContent(html, { waitUntil: 'load' });
const dump = await page.evaluate(() => {
  const pc = document.querySelector('.page-content');
  const pages = ['dashboardPage','assetsPage','machinesPage','techniciansPage','sectionsPage','departmentsPage','usersPage','openjobcardPage','startjobcardPage','closejobcardPage','pendingjobcardPage','approvejobcardPage','jobcardsPage','pmPage','checklistsPage','sparepartsPage','inventoryPage','notificationsPage','qrPage','auditPage','settingsPage','emailPage'];
  const res = {};
  for (const id of pages) {
    const el = document.getElementById(id);
    if (!el) { res[id] = 'MISSING'; continue; }
    const par = el.parentElement;
    res[id] = par ? (par.id || par.className || 'BODY') : '?';
  }
  const modal = document.getElementById('assetFormModal');
  res._assetFormModal = modal ? { childCount: modal.children.length, display: getComputedStyle(modal).display } : null;
  res._qrPage = (() => {
    const el = document.getElementById('qrPage');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { parent: el.parentElement ? (el.parentElement.id || el.parentElement.className) : '?', rect: Math.round(r.width) + 'x' + Math.round(r.height) };
  })();
  return res;
}).catch(e => ({ err: String(e) }));
console.log(JSON.stringify(dump, null, 1));
await browser.close();
