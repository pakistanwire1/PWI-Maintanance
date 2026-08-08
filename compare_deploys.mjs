import https from 'https';
import http from 'http';

const CF = 'https://pwi-maintanance.pages.dev/';
const GAS_PROD = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const GAS_TEST = 'https://script.google.com/macros/s/AKfycbw_8kIJGnvUgyEVhwFZXkKaU0XmZBj8QRTJEe24PnloGT7hLhgbJeHcb-4XvqyCSmhJ/exec';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

function analyze(name, res) {
  const b = res.body || '';
  const out = { url: res.url || name, status: res.status, bytes: b.length };
  out.hasNumberedLoop = /for\s*\(\s*var\s+p\s*=\s*1\s*;\s*p\s*<=\s*totalPages/.test(b);
  out.hasPrevNext = /Prev/.test(b) && /Next/.test(b);
  out.hasPageXofY = /Page\s+['"]?\s*\+\s*__?notifPage|Page\s+['"]?\s*\+\s*Nav\._notifPage|Page\s+['"]?\s*\+\s*state\.page|Page\s+\d+\s+of/.test(b);
  out.paginationRefs = (b.match(/notifPaginationFooter|renderNotifications|notifGoPage|pagination-btns|class="pagination"/g) || []).reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {});
  const oldMarker = b.includes('__notifPage') || b.includes('_notifGoPage(') && /for\s*\(\s*var\s+p\s*=\s*1\s*;\s*p\s*<=\s*totalPages/.test(b);
  out.oldStyleNumberedStrip = oldMarker;
  return out;
}

const results = {};
for (const [name, url] of [['CF', CF], ['GAS_PROD', GAS_PROD], ['GAS_TEST', GAS_TEST]]) {
  try {
    const res = await fetchText(url);
    results[name] = analyze(name, res);
    // count occurrences of the loop pattern in full
    const loops = (res.body.match(/for\s*\(\s*var\s+p\s*=\s*1\s*;\s*p\s*<=\s*totalPages/g) || []).length;
    results[name].numberedLoopCount = loops;
    console.log(`\n=== ${name} ===`);
    console.log(JSON.stringify(results[name], null, 1));
  } catch (e) {
    results[name] = { error: String(e) };
    console.log(`\n=== ${name} ===\nERROR ${e}`);
  }
}
console.log('\nDONE');
