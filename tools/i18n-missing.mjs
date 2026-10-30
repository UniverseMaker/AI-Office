// 영어 번역 빠진 문구 찾기: 코드에서 tr('…') · T('…') · data-i18n 문구와 맵 정의(층 · 표지판 · 맵 이름 …)의 한글을 모아
// 영어 모드에서 번역해 보고, 여전히 한글이 남는 것만 뽑는다.   node tools/i18n-missing.mjs [--json out.json]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import url from 'node:url';

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'public');
const HANGUL = /[가-힣]/;
// i18n 을 영어로 띄운다 (+ 번역을 덧붙이는 파일들)
const ctx = { window: {}, localStorage: { getItem: () => 'en', setItem() {} }, document: { documentElement: {}, querySelectorAll: () => [], getElementById: () => null, addEventListener() {} }, CustomEvent: class {}, console };
ctx.window = ctx; ctx.AIO = {}; ctx.window.AIO = ctx.AIO;
vm.createContext(ctx);
for (const f of ['js/i18n.js', ...fs.readdirSync(path.join(root, 'js')).filter((f) => /^i18n_.*\.js$/.test(f)).map((f) => 'js/' + f)]) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const tr = ctx.AIO.tr;

const found = new Map();      // 문구 → 처음 나온 곳
const add = (s, where) => { s = s.trim(); if (!s || !HANGUL.test(s) || s.length > 200) return; if (!found.has(s)) found.set(s, where); };
const files = [...fs.readdirSync(path.join(root, 'js')).map((f) => 'js/' + f), 'index.html', 'timer.html'].filter((f) => /\.(js|html)$/.test(f) && !/i18n/.test(f));
const STR = String.raw`'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|` + '`([^`$\\\\]*)`';
const CALL = new RegExp(String.raw`\b(?:tr|T|AIO\.tr)\(\s*(?:${STR})`, 'g');
for (const f of files) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of src.matchAll(CALL)) add((m[1] ?? m[2] ?? m[3] ?? '').replace(/\\'/g, "'"), f);
  if (f.endsWith('.html')) for (const m of src.matchAll(/data-i18n[^>]*>([^<]+)</g)) add(m[1], f);
  for (const m of src.matchAll(/data-i18n-(?:title|placeholder|aria-label)[^>]*?(?:title|placeholder|aria-label)="([^"]+)"|(?:title|placeholder|aria-label)="([^"]+)"[^>]*data-i18n-(?:title|placeholder|aria-label)/g)) add(m[1] || m[2], f);
}
const missing = [...found].filter(([s]) => HANGUL.test(tr(s)));
const byFile = {};
for (const [s, f] of missing) (byFile[f] = byFile[f] || []).push(s);
console.log(`문구 ${found.size}개 중 영어 번역 없음 ${missing.length}개`);
for (const [f, l] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${f}: ${l.length}`);
const out = process.argv.indexOf('--json');
if (out > 0) fs.writeFileSync(process.argv[out + 1], JSON.stringify(byFile, null, 1));
