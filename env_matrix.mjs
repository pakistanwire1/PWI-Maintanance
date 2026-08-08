import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const creds = JSON.parse(fs.readFileSync('C:/Users/afsar/AppData/Local/Temp/opencode/admin_creds.json', 'utf8'));
const url = 'https://pwi-maintanance.pages.dev';
const outDir = 'C:/Users/afsar/AppData/Local/Temp/opencode/cf_matrix';
fs.mkdirSync(outDir, { recursive: true });
const PAGES = ['dashboard', 'reports', 'machines', 'departments', 'inventory', 'users', 'notifications', 'settings'];

async function runEnv(name, executablePath, profile, mobile) {
  const results = {};
  const browser = await puppeteer.launch({
    executablePath, headless: 'new', userDataDir: profile,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,1000', '--incognito']
  });
  const page = await browser.newPage();
  if (mobile) {
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');
  } else {
    await page.setViewport({ width: 1440, height: 900 });
  }

  await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.log(`[${name}] goto`, String(e).slice(0,100)));
  await sleep(4000);
  // skip welcome
  const onWelcome = await page.evaluate(() => {
    const w = document.getElementById('welcomePage');
    return w && getComputedStyle(w).display !== 'none';
  }).catch(() => false);
  if (onWelcome) {
    await page.evaluate(() => localStorage.setItem('cmms_welcomed', '1'));
    await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => {});
    await sleep(4000);
  }
  // login
  for (let i = 0; i < 30; i++) {
    const st = await page.evaluate(() => {
      const lp = document.getElementById('loginPage');
      const app = document.getElementById('appContainer');
      return { lv: lp && getComputedStyle(lp).display !== 'none', av: app && getComputedStyle(app).display !== 'none' };
    }).catch(() => ({}));
    if (st.av) break;
    if (st.lv) {
      await page.evaluate((em, pw) => {
        document.getElementById('loginEmail').value = em;
        document.getElementById('loginPassword').value = pw;
        document.getElementById('loginBtn').click();
      }, creds.Email, creds.Password);
      await sleep(4000);
    }
    await sleep(1500);
  }
  const loggedIn = await page.evaluate(() => getComputedStyle(document.getElementById('appContainer')).display !== 'none').catch(() => false);
  results.loggedIn = loggedIn;
  if (loggedIn) {
    for (const pg of PAGES) {
      try {
        await page.evaluate((p) => {
          if (window.Router && Router.navigate) { Router.navigate(p); return; }
          window.location.hash = '/' + p;
        }, pg);
        await sleep(2500);
        const check = await page.evaluate((pg) => {
          const candidates = Array.from(document.querySelectorAll('button')).filter(b => /^\d+$/.test((b.textContent || '').trim()));
          const numberedStrips = candidates.filter(b => {
            const r = b.getBoundingClientRect();
            const p = b.parentElement;
            return p && r.top > 0 && r.width >= 20 && r.width <= 60;
          });
          // identify strips of >=2 consecutive numbered buttons in same parent
          const byParent = {};
          numberedStrips.forEach(b => {
            const key = (b.parentElement ? b.parentElement.id || b.parentElement.className : 'none') + '@' + Math.round(b.getBoundingClientRect().top);
            byParent[key] = (byParent[key] || 0) + 1;
          });
          const stripGroups = Object.entries(byParent).filter(([k, v]) => v >= 2).map(([k, v]) => ({ group: k, count: v }));
          const footer = document.getElementById('notifPaginationFooter');
          const footerR = footer ? footer.getBoundingClientRect() : null;
          return {
            page: pg,
            numberedButtonCount: candidates.length,
            stripGroups,
            notifFooter: footer ? { rect: [Math.round(footerR.x), Math.round(footerR.y), Math.round(footerR.width), Math.round(footerR.height)], text: (footer.textContent || '').trim(), numbered: Array.from(footer.querySelectorAll('button')).filter(b => /^\d+$/.test((b.textContent || '').trim())).map(b => b.textContent.trim()) } : null,
            title: document.title,
            hash: location.hash
          };
        }, pg);
        results[pg] = check;
        // screenshot bottom-right region
        const shot = await page.evaluate(() => ({
          x: Math.max(0, window.innerWidth - 460),
          y: Math.max(0, window.innerHeight - 220),
          w: 460,
          h: 220
        }));
        await page.screenshot({ path: path.join(outDir, `${name}_${pg}_bottomright.png`), clip: shot }).catch(() => {});
      } catch (e) {
        results[pg] = { err: String(e).slice(0, 150) };
      }
    }
  }
  await browser.close();
  return results;
}

const all = {};
try { all.chrome_incognito = await runEnv('chrome_incognito', CHROME, 'C:/Users/afsar/AppData/Local/Temp/opencode/matrix_chrome', false); } catch (e) { all.chrome_incognito = { err: String(e).slice(0, 200) }; }
try { all.chrome_mobile = await runEnv('chrome_mobile', CHROME, 'C:/Users/afsar/AppData/Local/Temp/opencode/matrix_mobile', true); } catch (e) { all.chrome_mobile = { err: String(e).slice(0, 200) }; }
try { all.edge_incognito = await runEnv('edge_incognito', EDGE, 'C:/Users/afsar/AppData/Local/Temp/opencode/matrix_edge', false); } catch (e) { all.edge_incognito = { err: String(e).slice(0, 200) }; }

fs.writeFileSync(path.join(outDir, 'matrix_report.json'), JSON.stringify(all, null, 1));
console.log('MATRIX REPORT (summary):');
for (const [env, res] of Object.entries(all)) {
  if (res.err) { console.log(env, 'ERR', res.err); continue; }
  console.log(`\n== ${env} == loggedIn=${res.loggedIn}`);
  for (const pg of PAGES) {
    const r = res[pg];
    if (!r) continue;
    const strip = r.stripGroups && r.stripGroups.length ? JSON.stringify(r.stripGroups) : 'none';
    const nf = r.notifFooter ? `footer=${JSON.stringify(r.notifFooter.text)} numbered=${JSON.stringify(r.notifFooter.numbered)}` : 'footer=absent';
    console.log(`  ${pg}: numberedButtons=${r.numberedButtonCount} stripGroups=${strip} ${nf}`);
  }
}
console.log('\nDONE');
