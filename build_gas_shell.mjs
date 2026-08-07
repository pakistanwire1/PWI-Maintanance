import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

function include(filename) {
  const p = path.join(ROOT, filename + '.html');
  if (!fs.existsSync(p)) {
    console.log('MISSING INCLUDE: ' + filename);
    return '<!-- MISSING INCLUDE: ' + filename + ' -->';
  }
  return fs.readFileSync(p, 'utf-8');
}

let html = fs.readFileSync(path.join(ROOT, 'Index.html'), 'utf-8');
html = html.replace(/<\?!= include\('([A-Za-z0-9_]+)'\); \?>/g, (m, name) => include(name));

const out = path.join(ROOT, 'gas_shell_built.html');
fs.writeFileSync(out, html);
console.log('Built ' + out + ' (' + html.length + ' bytes)');
