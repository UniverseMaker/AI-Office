// 맵 데이터 한글 중 영어 번역이 없는 것 모으기: 모든 실내 · 실외 맵을 지어 보고 층 이름 · 설명 · 표지판 · 가구 글자 · NPC · 쉬는 자리 이름 · 맵 이름/설명,
// 그리고 지으면서 / 몇 초 돌리면서 AIO.tr 로 들어온 문구를 영어로 번역해 본다.   node tools/i18n-mapstrings.mjs [--json out.json]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import url from 'node:url';

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'public');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const skip = new Set(['data', 'auth', 'detail', 'ui', 'main', 'prefs', 'brand', 'viewfilter']);
const files = [...html.matchAll(/<script src="js\/([\w-]+)\.js"><\/script>/g)].map((m) => m[1]).filter((f) => !skip.has(f));
const HANGUL = /[가-힣]/;
const ctxProxy = () => new Proxy({}, {
  get(t, k) {
    if (k === 'measureText') return (s) => ({ width: String(s).length * 6 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createConicGradient') return () => ({ addColorStop() {} });
    if (k === 'createPattern') return () => ({ setTransform() {} });
    if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    if (k in t) return t[k];
    return () => {};
  },
  set(t, k, v) { t[k] = v; return true; },
});
function load() {
  const store = { 'aio.lang': 'en' };
  const sandbox = {
    console, Math, Date, JSON, Map, Set, Uint8Array, Uint8ClampedArray, Int16Array, Int32Array, Float32Array, Promise, setTimeout() {}, setInterval() {}, clearInterval() {},
    document: { createElement: () => ({ getContext: () => ctxProxy(), width: 0, height: 0 }), documentElement: {}, querySelectorAll: () => [], getElementById: () => null, readyState: 'complete', addEventListener() {} },
    DOMMatrix: class { constructor(a) { this.a = a; } }, CustomEvent: class {},
    location: { search: '', protocol: 'file:' }, localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } },
  };
  sandbox.window = sandbox; sandbox.addEventListener = () => {}; sandbox.dispatchEvent = () => {}; sandbox.matchMedia = () => ({ matches: false, addEventListener() {} });
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), sandbox, { filename: f + '.js' });
  return sandbox.AIO;
}
const found = new Map();
const add = (s, where) => { if (typeof s !== 'string') return; s = s.trim(); if (!s || !HANGUL.test(s) || s.length > 160) return; if (!found.has(s)) found.set(s, where); };
let AIO = load();
const tr0 = AIO.tr;
const seenTr = new Set();
AIO.tr = (s, ...a) => { if (typeof s === 'string') seenTr.add(s); return tr0(s, ...a); };
const ins = AIO.maps.indoors, outs = AIO.maps.outdoors;
for (const d of [...ins, ...outs]) { add(d.name, 'maps'); add(d.desc, 'maps'); }
const pairs = [...ins.map((d) => [d.id, d.id === 'lab' ? 'campus' : 'yard']), ...outs.map((d) => [d.id === 'campus' ? 'lab' : 'kkoma', d.id])];
const seen = new Set();
for (const [i, o] of pairs) {
  if (seen.has(i + o)) continue; seen.add(i + o);
  try {
    AIO.maps.pick(i, o);
    const w = new AIO.World(), demo = new AIO.Demo();
    w.setState(demo.step());
    const S = w.S, where = `${i}+${o}`;
    for (const L of S.levels) {
      add(L.name, where); add(L.desc, where);
      if (L.name) { const m = L.name.match(/^(\S+)\s+(.+)$/); if (m) add(m[2], where); }
      for (const sg of L.signs || []) add(sg.text, where);
      for (const f of L.furniture || []) { for (const k of ['label', 'text', 'title', 'name', 'sign']) add(f[k], where); for (const k of ['lines', 'items', 'menu']) if (Array.isArray(f[k])) f[k].forEach((x) => add(x, where)); }
    }
    for (const n of S.npcs || []) { add(n.role, where); add(n.say, where); }
    for (const r of [...(S.rest || []), ...(S.underRest || []), ...(S.underDorm || []), ...(S.jail || []), ...(S.dorms || []), ...(S.dungeon || []), ...(S.vault || []), ...(S.eat || []), ...(S.shops || [])]) add(r.tag, where);
    for (const b of S.buildings || []) add(b.name, where);
    for (let k = 0; k < 40; k++) w.update(0.25, k * 0.25);
    for (const e of w.ents.values()) { try { const bb = w.bubbleFor && w.bubbleFor(e); if (bb && bb.text) add(bb.text, where); } catch {} }
  } catch (e) { console.error('build fail', i, o, e.message); }
}
for (const s of seenTr) add(s, 'tr()');
const missing = [...found].filter(([s]) => HANGUL.test(tr0(s)));
const by = {};
for (const [s, w] of missing) (by[w.startsWith('tr') ? 'tr' : w.split('+')[0]] = by[w.startsWith('tr') ? 'tr' : w.split('+')[0]] || []).push(s);
console.log(`맵 문구 ${found.size}개 중 영어 없음 ${missing.length}개`);
for (const [k, l] of Object.entries(by).sort((a, b) => b[1].length - a[1].length).slice(0, 40)) console.log(`  ${k}: ${l.length}`);
const out = process.argv.indexOf('--json');
if (out > 0) fs.writeFileSync(process.argv[out + 1], JSON.stringify(by, null, 1));
