// 맵 자동 점검 (브라우저 없이): 런타임 오류 · 벽 통과 · 못 가는 자리 · 엘리베이터/문 사용.
//   node tools/maptest.mjs                       → 모든 실내(+마당) · 모든 실외(+꼬마빌딩) · 원본 맵 5종
//   node tools/maptest.mjs <실내id> <실외id>      → 그 조합만 (자세히)
//   ONLY=in node tools/maptest.mjs  /  ONLY=out   → 실내만 / 실외만
//   STEPS=600 으로 시뮬레이션 길이 조절 (기본 900)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import url from 'node:url';

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'public');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const skip = new Set(['data', 'auth', 'detail', 'ui', 'main', 'prefs', 'brand', 'viewfilter', 'keepopen']);   // 화면(UI) 전용 모듈은 빼고 맵 · 세계만
const files = [...html.matchAll(/<script src="js\/([\w-]+)\.js"><\/script>/g)].map((m) => m[1]).filter((f) => !skip.has(f));

const ctxProxy = () => new Proxy({}, {
  get(t, k) {
    if (k === 'measureText') return (s) => ({ width: String(s).length * 6 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createConicGradient') return () => ({ addColorStop() {} });
    if (k === 'createPattern') return () => ({ setTransform() {} });
    if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    if (k in t) return t[k];
    return (...a) => { for (const v of a) if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`non-finite arg to ${String(k)}`); };
  },
  set(t, k, v) { t[k] = v; return true; },
});

function load() {
  const store = {};
  const sandbox = {
    console, Math, Date, JSON, Map, Set, Uint8Array, Uint8ClampedArray, Int16Array, Int32Array, Float32Array, Promise, setTimeout, setInterval, clearInterval,
    document: { createElement: () => ({ getContext: () => ctxProxy(), width: 0, height: 0 }), documentElement: {}, querySelectorAll: () => [], getElementById: () => null, readyState: 'complete', addEventListener() {} }, addEventListener() {}, dispatchEvent() {}, CustomEvent: class {},
    DOMMatrix: class { constructor(a) { this.a = a; } },
    location: { search: '', protocol: 'file:' }, localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), sandbox, { filename: f + '.js' });
  return sandbox.AIO;
}

function run(AIO, inId, outId, verbose) {
  AIO.maps.pick(inId, outId);
  const cam = new AIO.iso.Camera(); cam.vw = 1600; cam.vh = 900;
  const w = new AIO.World();
  const demo = new AIO.Demo();
  let st = demo.step();
  const res = { inId, outId, err: null, unreachable: 0, crossings: 0, elev: 0, doors: 0 };
  try {
    w.setState(st);
    const S = w.S;
    res.levels = S.levels.length; res.seats = S.seats.size; res.rest = S.rest.length; res.size = `${S.levels[0].W}x${S.levels[0].H}`;
    if (verbose) {
      console.log('levels:', S.levels.map((L) => `${L.idx}:${L.name}(${L.W}x${L.H})`).join(' | '));
      console.log('buildings:', S.buildings.map((b) => `${b.id}@${b.x},${b.y} ${b.W}x${b.H}`).join(' | '), 'seats', S.seats.size, 'rest', S.rest.length, 'visitor', S.visitorSeats.length, 'hot', S.hot.length, 'npcs', S.npcs.length);
    }
    const bad = [];
    const spots = [...S.seats].concat(S.rest.map((r, i) => ['rest:' + r.tag + i, r]), S.visitorSeats.map((r, i) => ['visit' + i, r]), (S.meeting || []).map((r, i) => ['meet' + i, r]), (S.leadRooms || []).map((r, i) => ['leadroom' + i, r.seat]), (S.dungeon || []).map((r, i) => ['dungeon' + i, r]), (S.dorms || []).map((r, i) => ['dorm' + i, r]), (S.shops || []).map((r, i) => ['shop:' + r.tag + i, r]), (S.eat || []).map((r, i) => ['eat' + i, r]));
    for (const [k, seat] of spots) {
      const fake = { lv: S.door.lv, x: S.door.x, y: S.door.y, seed: 1, plan: [], spot: null };
      const plan = w.plan(fake, seat);
      const fades = plan.filter((s) => s.k === 'fade').length, doors = plan.filter((s) => s.k === 'door').length;
      if (fades !== doors) { res.unreachable++; if (bad.length < 5) bad.push(`${k} lv${seat.lv}(${S.levels[seat.lv].name}) ${seat.x},${seat.y}`); }
    }
    if (bad.length) res.bad = bad;
    const ctx = ctxProxy();
    let t = 0;
    const prev = new Map();
    const steps = +(process.env.STEPS || 900);
    for (let i = 0; i < steps; i++) {
      if (i % 10 === 0) { st = demo.step(); w.setState(st); }
      t += 0.1;
      const B = S.buildings[0];
      if (B) w.view = { focus: i % 200 < 100 ? B.id : null, t: i % 200 < 100 ? 1 : 0, floor: B.levels[(i >> 3) % B.levels.length] };
      w.update(0.1, t);
      for (const e of w.ents.values()) {
        const tx = Math.floor(e.x), ty = Math.floor(e.y), lv = e.lv || 0;
        const p = prev.get(e.id);
        if (p && p.lv === lv && Math.abs(p.tx - tx) + Math.abs(p.ty - ty) === 1 && AIO.layout.crosses(S.levels[lv], p.tx, p.ty, tx - p.tx, ty - p.ty)) { res.crossings++; if (verbose && res.crossings < 5) console.log('  WALL CROSS', e.id, `lv${lv}`, p.tx, p.ty, '->', tx, ty); }
        if (p && p.lv !== lv) { if (S.levels[p.lv].bld === S.levels[lv].bld && S.levels[lv].bld === 'tower') res.elev++; else res.doors++; }
        prev.set(e.id, { lv, tx, ty });
      }
      if (i % 20 === 0) w.draw(ctx, cam, 1, 1600, 900);
    }
  } catch (e) { res.err = e.stack.split('\n').slice(0, 4).join(' | '); }
  return res;
}

const AIO = load();
const ins = AIO.maps.indoors.map((d) => d.id), outs = AIO.maps.outdoors.map((d) => d.id);
const fmt = (r) => `${r.err ? '❌' : r.unreachable || r.crossings ? '⚠️' : '✅'} ${r.inId.padEnd(12)} + ${r.outId.padEnd(12)} lot ${String(r.size).padEnd(8)} lv ${String(r.levels).padStart(2)} seats ${String(r.seats).padStart(3)} rest ${String(r.rest).padStart(3)} | 못감 ${r.unreachable} 벽통과 ${r.crossings} 엘베 ${r.elev} 문 ${r.doors}${r.err ? '\n     ERROR ' + r.err : ''}${r.bad ? '\n     못 가는 자리: ' + r.bad.join(' / ') : ''}`;
if (process.argv[2]) {
  const r = run(AIO, process.argv[2], process.argv[3] || 'yard', true);
  console.log(fmt(r));
} else {
  let fail = 0;
  const pairs = [];
  if (process.env.ONLY !== 'out') for (const i of ins) pairs.push([i, i === 'lab' ? 'campus' : 'yard']);
  if (process.env.ONLY !== 'in') for (const o of outs) pairs.push([o === 'campus' ? 'lab' : 'kkoma', o]);
  if (!process.env.ONLY) pairs.push(['office', 'none'], ['terrace', 'terrace'], ['office', 'campus'], ['kkoma', 'campus'], ['lab', 'yard']);
  const seen = new Set();
  for (const [i, o] of pairs) {
    if (seen.has(i + o)) continue; seen.add(i + o);
    const r = run(load(), i, o, false);
    if (r.err || r.unreachable || r.crossings) fail++;
    console.log(fmt(r));
  }
  console.log(`\n실내 ${ins.length}종 · 실외 ${outs.length}종 · 문제 ${fail}건`);
}
