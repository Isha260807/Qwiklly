// Pre-translates the app's static UI strings (English -> Hindi) with Google Cloud
// Translation and writes src/i18n/prebuilt/hi.json. The runtime translator loads this
// file first, so fixed UI text appears instantly; only dynamic text hits the API.
//
// Usage:  node scripts/buildTranslations.mjs        (re-run after adding UI text;
//         already-translated strings are reused, only new ones are sent)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src');
const outFile = path.join(srcDir, 'i18n', 'prebuilt', 'hi.json');

const readEnvKey = () => {
  if (process.env.VITE_GOOGLE_MAPS_API_KEY) return process.env.VITE_GOOGLE_MAPS_API_KEY;
  const env = fs.readFileSync(path.join(root, '.env'), 'utf8');
  const m = env.match(/^VITE_GOOGLE_MAPS_API_KEY=(.*)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
};

const walk = (dir, out = []) => {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name === 'i18n') continue;
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(name.name)) out.push(p);
  }
  return out;
};

const looksLikeUiText = (s) => {
  if (s.length < 2 || s.length > 160) return false;
  if (!/[A-Za-z]{2}/.test(s)) return false;
  if (/[{}<>=\\]|\$\{|https?:|\.(js|jsx|png|jpg|svg|css|mp3|json)\b/.test(s)) return false;
  if (/^[a-z0-9_.:/#@-]+$/.test(s)) return false; // identifiers, classNames, paths, ids
  if (/^(bg|text|flex|grid|border|rounded|px|py|p|m|w|h|min|max|gap|font|shadow|absolute|relative|fixed)-/.test(s)) return false;
  if (/\b(flex|grid|items-center|justify-|rounded-|bg-|text-\[|px-\d|py-\d)\b/.test(s)) return false; // tailwind class strings
  return /^[A-Z0-9"'(¡¿₹]/.test(s) || /\s/.test(s);
};

const found = new Set();
const add = (raw) => {
  const s = raw.replace(/\s+/g, ' ').trim();
  if (looksLikeUiText(s)) found.add(s);
};

for (const file of walk(srcDir)) {
  const code = fs.readFileSync(file, 'utf8');
  // JSX text between tags (no expressions inside)
  for (const m of code.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) add(m[1]);
  // string literals (toasts, labels, placeholders, titles...)
  for (const m of code.matchAll(/'([^'\n\\]{2,160})'|"([^"\n\\]{2,160})"/g)) add(m[1] ?? m[2]);
}

const existing = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const todo = [...found].filter((s) => !(s in existing));
console.log(`found ${found.size} strings, ${todo.length} new`);

const key = readEnvKey();
if (todo.length && !key) throw new Error('VITE_GOOGLE_MAPS_API_KEY missing');

const translate = async (batch) => {
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: batch, source: 'en', target: 'hi', format: 'text' }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).data.translations.map((t) => t.translatedText);
};

const SIZE = 100;
const batches = [];
for (let i = 0; i < todo.length; i += SIZE) batches.push(todo.slice(i, i + SIZE));

const CONCURRENCY = 5;
for (let i = 0; i < batches.length; i += CONCURRENCY) {
  const group = batches.slice(i, i + CONCURRENCY);
  const results = await Promise.all(group.map(translate));
  group.forEach((batch, gi) => batch.forEach((s, si) => (existing[s] = results[gi][si])));
  console.log(`translated ${Math.min((i + CONCURRENCY) * SIZE, todo.length)}/${todo.length}`);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
const sorted = Object.fromEntries(Object.entries(existing).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(outFile, JSON.stringify(sorted));
console.log(`wrote ${Object.keys(sorted).length} entries -> ${path.relative(root, outFile)}`);
