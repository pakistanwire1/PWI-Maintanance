const GAS_URL = 'https://script.google.com/macros/s/AKfycbxXYlKJfozMft9Mi-02GmcBl0ANjNGra8mw5B6xERgqqkt-zc4ya1PyXstAhga9snFA/exec';
const body = JSON.stringify({ action: 'login', email: 'pakistanwire1@gmail.com', password: 'admin123' });

async function probe(url) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, redirect: 'follow' });
  const t = await r.text();
  const ct = (r.headers.get('content-type') || '');
  const isJson = ct.includes('application/json') || t.trim().startsWith('{');
  return { status: r.status, isJson, len: t.length, head: t.slice(0, 80).replace(/\n/g, ' ') };
}

const results = [];
for (let i = 0; i < 6; i++) {
  try { results.push(await probe(GAS_URL)); } catch (e) { results.push({ status: 'ERR', isJson: false, len: 0, head: String(e.message).slice(0, 60) }); }
  await new Promise(r => setTimeout(r, 1500));
}
for (const r of results) console.log(JSON.stringify(r));
const ok = results.filter(r => r.status === 200 && r.isJson).length;
console.log('\nDirect GAS: ' + ok + '/6 JSON-200 responses');
