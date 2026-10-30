// 화면 코드(public/js · html)의 한글 문자열 리터럴을 전부 모아(주석 제외, 템플릿의 고정 부분 포함) 영어 모드에서 번역해 보고 빠진 것만 뽑는다.
//   tr('…') 로 바로 감싸지 않고 row('모드', …) · 배열 라벨처럼 돌려서 번역되는 문구까지 잡기 위한 것.   node tools/i18n-literals.mjs [--json out.json]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import url from 'node:url';
import { jsStrings } from './jsstrings.mjs';

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'public');
const HANGUL = /[가-힣]/;
const ctx = { window: {}, localStorage: { getItem: () => 'en', setItem() {} }, document: { documentElement: {}, querySelectorAll: () => [], getElementById: () => null, addEventListener() {} }, CustomEvent: class {}, console };
ctx.window = ctx; ctx.AIO = {}; vm.createContext(ctx);
for (const f of ['js/i18n.js', 'js/i18n_en.js']) if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
// 맵 정의 파일들이 번역을 덧붙이는 경우(maps.js 등)도 반영
for (const f of fs.readdirSync(path.join(root, 'js'))) { const src = fs.readFileSync(path.join(root, 'js', f), 'utf8'); for (const m of src.matchAll(/AIO\.i18n\.add\((\{[\s\S]*?\})\);/g)) { try { vm.runInContext(`AIO.i18n.add(${m[1]})`, ctx); } catch {} } }
const tr = ctx.AIO.tr;

const SKIP = /^(i18n.*|timer-core|timer-standalone|demo)\.js$/;   // 번역 표 · 독립 타이머 · 데모 데이터(세션 제목 흉내)는 제외
const found = new Map();
const add = (s, f) => { s = s.replace(/\\n/g, ' ').trim(); if (!s || !HANGUL.test(s) || s.length > 240) return; if (/^[\s\S]*\$\{/.test(s)) return; if (!found.has(s)) found.set(s, f); };
function scan(src, f) {
  for (const raw of jsStrings(src)) for (const seg of raw.split(/<[^>]*>/)) add(seg, f);   // 템플릿 속 HTML 태그 사이 글자도 조각으로
}
for (const f of fs.readdirSync(path.join(root, 'js'))) if (f.endsWith('.js') && !SKIP.test(f)) scan(fs.readFileSync(path.join(root, 'js', f), 'utf8'), 'js/' + f);
for (const f of ['index.html']) { const src = fs.readFileSync(path.join(root, f), 'utf8'); for (const m of src.matchAll(/>([^<>]*[가-힣][^<>]*)</g)) add(m[1], f); for (const m of src.matchAll(/(?:title|placeholder|aria-label)="([^"]*[가-힣][^"]*)"/g)) add(m[1], f); }
const missing = [...found].filter(([s]) => HANGUL.test(tr(s)));
const by = {};
for (const [s, f] of missing) (by[f] = by[f] || []).push(s);
console.log(`한글 리터럴 ${found.size}개 중 영어 없음 ${missing.length}개`);
for (const [k, l] of Object.entries(by).sort((a, b) => b[1].length - a[1].length).slice(0, 30)) console.log(`  ${k}: ${l.length}`);
const out = process.argv.indexOf('--json');
if (out > 0) fs.writeFileSync(process.argv[out + 1], JSON.stringify(by, null, 1));
