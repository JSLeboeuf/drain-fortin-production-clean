// Offline guard: scans for external URLs and prints summary.
const fs = require('fs');
const path = require('path');

function listFiles(dir) {
  const res = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) res.push(...listFiles(p));
    else res.push(p);
  }
  return res;
}

const root = path.resolve(__dirname, '..');
const targets = [path.join(root, 'src'), path.join(root, 'index.html')];
let files = [];
for (const t of targets) {
  if (fs.existsSync(t)) {
    const stat = fs.statSync(t);
    if (stat.isDirectory()) files.push(...listFiles(t));
    else files.push(t);
  }
}
files = files.filter((p) => /\.(tsx?|html|css|cjs|mjs|js)$/.test(p));

const offenders = [];
const EXT_URL = /https?:\/\//i;

for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  if (EXT_URL.test(txt)) {
    // Ignore benign README mentions in comments? We keep it strict for src and html
    offenders.push(f.replace(root + path.sep, ''));
  }
}

if (offenders.length) {
  console.log('❌ External URLs detected (no-outbound policy):');
  offenders.forEach((p) => console.log(' -', p));
  process.exitCode = 1;
} else {
  console.log('✅ No external URLs found in apps/web source.');
}
