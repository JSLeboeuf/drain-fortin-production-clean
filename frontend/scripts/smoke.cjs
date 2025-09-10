// Minimal smoke: no network, just static checks
const fs = require('fs');
const path = require('path');

function has(p) {
  return fs.existsSync(path.resolve(__dirname, '..', p));
}

function read(p) {
  return fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
}

const results = [];

// Files exist
results.push({ name: 'vite.config.ts', ok: has('vite.config.ts') });
results.push({ name: 'src/main.tsx', ok: has('src/main.tsx') });
results.push({ name: 'src/App.tsx', ok: has('src/App.tsx') });
results.push({ name: 'src/pages/Calls.tsx', ok: has('src/pages/Calls.tsx') });
results.push({ name: 'src/pages/Analytics.tsx', ok: has('src/pages/Analytics.tsx') });

// Check preconnect DEV block
try {
  const main = read('src/main.tsx');
  results.push({ name: 'preconnect DEV', ok: /VITE_API_BASE_URL/.test(main) && /preconnect/.test(main) });
  results.push({ name: 'web vitals DEV', ok: /Vitals/.test(main) || /largest-contentful-paint/.test(main) });
} catch (e) {
  results.push({ name: 'preconnect DEV', ok: false });
}

// Check vendor split
try {
  const vc = read('vite.config.ts');
  results.push({ name: 'manualChunks vendor', ok: /manualChunks/.test(vc) && /vendor/.test(vc) });
} catch (e) {
  results.push({ name: 'manualChunks vendor', ok: false });
}

// Landmark presence sample page
try {
  const dash = read('src/pages/Dashboard.tsx');
  const calls = read('src/pages/Calls.tsx');
  const analytics = read('src/pages/Analytics.tsx');
  results.push({ name: 'a11y main landmark (dashboard)', ok: /id=\"main\"/.test(dash) });
  results.push({ name: 'a11y main landmark (calls)', ok: /id=\"main\"/.test(calls) });
  results.push({ name: 'a11y main landmark (analytics)', ok: /id=\"main\"/.test(analytics) });
} catch (e) {
  results.push({ name: 'a11y main landmark', ok: false });
}

const failed = results.filter(r => !r.ok);
for (const r of results) console.log(`${r.ok ? '✅' : '❌'} ${r.name}`);
process.exitCode = failed.length ? 1 : 0;
