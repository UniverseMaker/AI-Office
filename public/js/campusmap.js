// AI 캠퍼스 outdoor map (compact): one row of buildings — 소방서 · 연구동 · 링 R&D 센터 · 경찰서 · 은행 — facing the
// AI 파크 and the 오리연못, the industrial zone (공장동 + fenced truck lot + 물류센터) across 동측도로, 대학로 with crosswalks,
// traffic lights and bus stops, and the shopping street (상가길) south of it with the storefronts facing the street.
// 연구동 / 공장동 / 경찰서 / 은행 interiors are hand-built (campus.js); the rest come from interiors2.js templates.
(function () {
  const LY = AIO.layout;
  const I = () => AIO.interiors;
  const W = 270, H = 134;
  const SHOPS = ['🏪 편의점', '🍗 치킨집', '☕ 카페 어은', '📚 서점', '🍜 분식집', '💐 꽃집', '✏️ 문구점', '💊 약국', '🥐 빵집', '🍕 피자', '🧋 버블티', '✂️ 미용실', '🍔 버거', '🍣 초밥', '🎮 PC방', '🏋️ 헬스장'];

  /** opt.main: 조합 맵 — 연구동 자리에 다른 실내(건물) 정의가 들어간다 (없으면 원본 캠퍼스 그대로) */
  function build(spec, opt = {}) {
    const S = LY.newScene('campus');
    S.rest = []; S.visitorSeats = []; S.doors = []; S.buildings = []; S.npcs = []; S.occ = []; S.spots = []; S.campusDoors = [];
    S.park = { mats: [], play: [], wander: [] };
    const OUT = I().level(S, 'AI 캠퍼스', { floor: 'grass', outer: 'none', short: '외부', bld: 'out' });
    OUT.W = W; OUT.H = H;

    // interiors first (their sizes decide the layout)
    let MB = null;
    if (opt.main) {
      S.underRest = []; S.underDorm = []; S.jail = []; S.vault = []; S.dorms = []; S.dungeon = [];
      MB = opt.main.build(S, AIO.compose.openSpec({ ...spec, stoppedTeams: [], stoppedSingles: [] }), { spec, outdoor: 'campus' });   // 멈춘 세션은 원래대로 공장동
    }
    const towerLv = MB ? MB.levels : I().tower(S, spec);
    const F = I().factory(S, spec);
    const PL = I().police(S);
    const BK = I().bank(S);

    const K = LY.kit(S, OUT);
    const G = OUT.ground = { walk: [], plaza: [], road: [], inter: [], cross: [], decals: [], lots: [], curves: [], rounds: [], fell: [] };
    const used = new Uint8Array(W * H); // 1 paved · 2 solid · 3 road · 4 water
    const mark = (x, y, w, d, v) => { for (let i = Math.max(0, Math.floor(x)); i < Math.min(W, Math.ceil(x + w)); i++) for (let j = Math.max(0, Math.floor(y)); j < Math.min(H, Math.ceil(y + d)); j++) if (v === 3 || used[j * W + i] !== 3) used[j * W + i] = v; };
    const free = (x, y, w = 1, d = 1) => { for (let i = Math.floor(x); i < Math.ceil(x + w); i++) for (let j = Math.floor(y); j < Math.ceil(y + d); j++) if (i < 0 || j < 0 || i >= W || j >= H || used[j * W + i]) return false; return true; };
    const solid = (x, y, w, d) => { K.blockRect(x, y, w, d); mark(x, y, w, d, 2); };
    const walk = (x, y, w, d) => { G.walk.push({ x, y, w, d }); mark(x, y, w, d, 1); };
    const plaza = (x, y, w, d, color) => { G.plaza.push({ x, y, w, d, color }); mark(x, y, w, d, 1); };
    const decal = (d, v = 1) => { G.decals.push(d); if (d.w) mark(d.x, d.y, d.w, d.d, v); };
    const add = (f, bx, by, bw = 1, bd = 1) => { K.add(f); if (bx != null) solid(bx, by, bw, bd); return f; };
    const rest = (spot, tag) => S.rest.push({ lv: OUT.idx, tag, carry: 'mug', ...spot });
    const spot = (s) => S.spots.push({ lv: OUT.idx, ...s });
    const curve = (pts, w = 1.3, o = {}) => {
      G.curves.push({ pts, w, ...o });
      const samp = [];
      let prev = pts[0];
      for (let i = 1; i < pts.length - 1; i++) {
        const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
        for (let t = 0; t <= 1; t += 0.04) samp.push([(1 - t) * (1 - t) * prev[0] + 2 * (1 - t) * t * pts[i][0] + t * t * m[0], (1 - t) * (1 - t) * prev[1] + 2 * (1 - t) * t * pts[i][1] + t * t * m[1]]);
        prev = m;
      }
      const last = pts[pts.length - 1];
      for (let t = 0; t <= 1; t += 0.05) samp.push([prev[0] + (last[0] - prev[0]) * t, prev[1] + (last[1] - prev[1]) * t]);
      for (const [px, py] of samp) for (let i = Math.floor(px - w / 2); i <= px + w / 2; i++) for (let j = Math.floor(py - w / 2); j <= py + w / 2; j++) if (i >= 0 && j >= 0 && i < W && j < H && !used[j * W + i] && Math.hypot(i + 0.5 - px, j + 0.5 - py) < w / 2 + 0.35) used[j * W + i] = 1;
    };
    const fbed = (cx, cy, rx, ry, seed, rot = 0) => { G.fell.push({ cx, cy, rx, ry, seed, rot }); for (let i = Math.floor(cx - rx); i <= cx + rx; i++) for (let j = Math.floor(cy - ry); j <= cy + ry; j++) if (((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 < 0.8 && !used[j * W + i]) { used[j * W + i] = 2; K.block(i, j); } };

    // ---------------------------------------------------------------- roads
    const roads = [];
    const road = (axis, pos, a0, a1, name, D = 4) => {
      const r = axis === 'x' ? { axis, x: a0, y: pos, w: a1 - a0, d: D, name } : { axis, x: pos, y: a0, w: D, d: a1 - a0, name };
      roads.push(r); G.road.push(r); mark(r.x, r.y, r.w, r.d, 3);
      if (axis === 'x') { walk(a0, pos - 1, a1 - a0, 1); walk(a0, pos + D, a1 - a0, 1); } else { walk(pos - 1, a0, 1, a1 - a0); walk(pos + D, a0, 1, a1 - a0); }
      return r;
    };
    const R_S = road('x', 106, 0, W, '대학로');
    road('x', 125, 0, W, '상가길', 3);
    const R_E = road('y', 172, 0, 106, '동측도로');
    for (const a of roads) for (const b of roads) if (a.axis === 'x' && b.axis === 'y' && b.x >= a.x - 4 && b.x <= a.x + a.w && a.y >= b.y - 4 && a.y <= b.y + b.d) G.inter.push({ x: b.x, y: a.y, w: 4, d: 4 });
    const cross = (r, at, light = true) => {
      const c = r.axis === 'x' ? { axis: 'x', x: at, y: r.y, w: 3, d: 4 } : { axis: 'y', x: r.x, y: at, w: 4, d: 3 };
      c.light = light; c.id = G.cross.length; c.road = roads.indexOf(r); c.phase = (c.id * 7.3) % 22;
      G.cross.push(c); mark(c.x, c.y, c.w, c.d, 1);
      if (light) {
        const [ax, ay, bx, by] = r.axis === 'x' ? [c.x - 0.6, r.y - 1.4, c.x + c.w + 0.6, r.y + 5.4] : [r.x - 1.4, c.y + c.d + 0.6, r.x + 5.4, c.y - 0.6];
        add({ type: 'trafficLight', x: ax, y: ay, cw: c.id, side: -1 }, Math.floor(ax), Math.floor(ay));
        add({ type: 'trafficLight', x: bx, y: by, cw: c.id, side: 1 }, Math.floor(bx), Math.floor(by));
      }
      return c;
    };
    cross(R_S, 52); cross(R_S, 101); cross(R_S, 206); cross(R_S, 14, false);
    cross(R_E, 97); cross(R_E, 30, false);
    S.traffic = { roads, cross: G.cross };

    // ---------------------------------------------------------------- the building row
    const occ = (o) => { S.occ.push(o); solid(o.x, o.y, o.W, o.H); return o; };
    const doorOf = (o) => {
      const dx = Math.floor(o.x + o.W / 2), dy = o.y + o.H;
      plaza(dx - 2, dy, 4, 2);
      o.door = { x: dx + 0.5, y: dy + 0.6 };
      S.campusDoors.push({ lv: OUT.idx, x: dx + 0.5, y: dy + 0.6, face: '-y', name: o.name, id: o.id });
      return o;
    };
    const TW = MB ? MB.W : I().TW, TH = MB ? MB.H : I().TH;
    const TX = MB ? Math.max(31, Math.round(60 - TW / 2)) : 36, TY = MB ? Math.max(2, 38 - TH) : 14, front = TY + TH;
    for (const L of towerLv) { L.ox = TX; L.oy = TY; }
    solid(TX, TY, TW, TH);
    const RING = { cx: 102, cy: 26, R: 12, r: 7.5, h: 66 };
    const PX = 122, PY = 22, BX = 148, BY = 24;
    PL.ox = PX; PL.oy = PY; BK.ox = BX; BK.oy = BY;
    solid(PX, PY, PL.W, PL.H); solid(BX, BY, BK.W, BK.H);
    plaza(2, front, 169, 3, '#e8e2d6');
    // 소방서 west of the tower, engines on the apron
    doorOf(occ({ id: 'fire', kind: 'campus', code: '119', name: '캠퍼스 소방서', x: 4, y: 22, W: 26, H: 16, floors: 2, style: 'fire', tmpl: 'fire', floor: 'concrete' }));
    plaza(4, 41, 26, 6, '#d5d0c6');
    for (let i = 0; i < 3; i++) add({ type: 'fireTruck', x: 7 + i * 7.5, y: 41.2 }, 7 + i * 7.5, 41, 2, 5);
    // ring: annulus solid except two gates; courtyard orchard
    // 넓은 건물이 연구동 자리에 들어오면 링 R&D 센터는 비운다
    if (!(MB && TX + TW > 89)) {
      RING.gates = [{ angle: Math.PI / 2 }, { angle: 0 }];
      for (let i = RING.cx - RING.R - 1; i <= RING.cx + RING.R + 1; i++) for (let j = RING.cy - RING.R - 1; j <= RING.cy + RING.R + 1; j++) {
        const d = Math.hypot(i + 0.5 - RING.cx, j + 0.5 - RING.cy);
        if (d < RING.r || d > RING.R || i < 0 || j < 0) continue;
        const gate = (Math.abs(i + 0.5 - RING.cx) < 1.2 && j > RING.cy) || (Math.abs(j + 0.5 - RING.cy) < 1.2 && i > RING.cx);
        if (gate) { mark(i, j, 1, 1, 1); continue; }
        K.block(i, j); used[j * W + i] = 2;
      }
      const ringO = { id: 'ring', kind: 'ring', name: '링 R&D 센터', x: RING.cx - RING.R, y: RING.cy - RING.R, W: RING.R * 2, H: RING.R * 2, ring: RING, tmpl: 'ring', floor: 'carpet' };
      S.occ.push(ringO); doorOf(ringO);
      decal({ type: 'ringPath', cx: RING.cx, cy: RING.cy, R: 6.4, w: 0.9 }, 0);
      decal({ type: 'pond', cx: RING.cx, cy: RING.cy, rx: 1.8, ry: 1.8 }, 0); solid(RING.cx - 2, RING.cy - 2, 4, 4);
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + 0.3, tx = RING.cx + Math.cos(a) * 4.2, ty = RING.cy + Math.sin(a) * 4.2; add({ type: 'tree', x: tx, y: ty, size: 0.85, seed: k * 17 + 5, kind: k % 2 ? 'cherry' : 'oak' }, Math.floor(tx), Math.floor(ty)); }
      decal({ type: 'meadow', x: RING.cx - 5, y: RING.cy - 5, w: 10, d: 10, seed: 21 }, 0);
      for (const [bx, by] of [[RING.cx - 1.2, RING.cy + 5.6], [RING.cx + 3.6, RING.cy - 6.2]]) { add({ type: 'bench', x: bx, y: by, w: 2 }, Math.floor(bx), Math.floor(by), 2, 1); rest({ x: bx + 1, y: by + 0.25, face: '+y', pose: 'sit', approach: [Math.floor(bx + 1), Math.floor(by) + 1] }, '링 가든 벤치'); }
    }

    // ---------------------------------------------------------------- 오리연못 (west lawn): geese waddling round it, willows, benches, a loop path
    const POND = { cx: 15, cy: 76, rx: 9, ry: 6.5 };
    decal({ type: 'pond', ...POND });
    for (let i = Math.floor(POND.cx - POND.rx); i <= POND.cx + POND.rx; i++) for (let j = Math.floor(POND.cy - POND.ry); j <= POND.cy + POND.ry; j++) if (((i + 0.5 - POND.cx) / POND.rx) ** 2 + ((j + 0.5 - POND.cy) / POND.ry) ** 2 < 1) { K.block(i, j); used[j * W + i] = 4; }
    S.geese = { ...POND, n: 8 };
    for (let k = 0; k < 4; k++) add({ type: 'duck', x: POND.cx, y: POND.cy, seed: k + 7 });
    { const loop = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI * 2; loop.push([POND.cx + Math.cos(a) * (POND.rx + 2.6), POND.cy + Math.sin(a) * (POND.ry + 2.4)]); } curve(loop, 1.2, { dots: true }); }
    curve([[17, 47], [12, 56], [15, 66.5]]); curve([[15, 85.5], [10, 95], [14, 105]]);
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2 + 0.2, bx = Math.round(POND.cx + Math.cos(a) * (POND.rx + 1.3)), by = Math.round(POND.cy + Math.sin(a) * (POND.ry + 1.2));
      if (!free(bx, by, 2, 1)) continue;
      add({ type: 'bench', x: bx, y: by, w: 2 }, bx, by, 2, 1);
      rest({ x: bx + 1, y: by + 0.25, face: '+y', pose: 'sit', approach: [bx + 1, by + 1] }, '오리연못 벤치');
    }
    add({ type: 'willow', x: POND.cx - POND.rx - 0.5, y: POND.cy - 4, seed: 1 }, Math.floor(POND.cx - POND.rx - 1.5), Math.floor(POND.cy - 5), 2, 2);
    add({ type: 'willow', x: POND.cx + POND.rx + 0.5, y: POND.cy + 3, seed: 2 }, Math.floor(POND.cx + POND.rx - 0.5), Math.floor(POND.cy + 2), 2, 2);
    add({ type: 'pondSign', x: POND.cx - 2, y: POND.cy + POND.ry + 1.1 }, POND.cx - 2, Math.floor(POND.cy + POND.ry + 1));
    fbed(24, 56, 2.4, 1.3, 31, 0.4); fbed(6, 94, 2.2, 1.3, 32, -0.3);

    // ---------------------------------------------------------------- AI 파크 (y 41 … 105)
    plaza(51, front + 3, 4, R_S.y - front - 4); plaza(100, front + 3, 4, R_S.y - front - 4);
    walk(29, 60, 143, 1); walk(29, 82, 143, 1);
    // zone A · playground + daycare + picnic
    decal({ type: 'rubber', x: 30, y: 42, w: 20, d: 16 }, 1);
    add({ type: 'slide', x: 32, y: 43 }, 32, 43, 1, 3);
    add({ type: 'swingSet', x: 36, y: 45 }, 36, 44, 4, 2);
    add({ type: 'seesaw', x: 42.5, y: 44.5 }, 42, 44, 4, 1);
    add({ type: 'jungleGym', x: 32, y: 50 }, 32, 50, 2, 2);
    add({ type: 'merryGoRound', x: 40, y: 53 }, 39, 52, 2, 2);
    decal({ type: 'sand', x: 44, y: 49, w: 5, d: 5 }); add({ type: 'sandboxRim', x: 44, y: 49, w: 5, d: 5 });
    const pp = (o) => S.park.play.push({ lv: OUT.idx, ...o });
    pp({ x: 36.9, y: 46.3, face: '+y', pose: 'sit', swing: 0, at: [36, 45] }); pp({ x: 38.1, y: 46.3, face: '+y', pose: 'sit', swing: 1, at: [36, 45] });
    pp({ x: 32.5, y: 46.5, face: '+y', pose: 'stand', slide: true }); pp({ x: 42.3, y: 45.6, face: '+y', pose: 'sit' }); pp({ x: 45.6, y: 45.6, face: '+y', pose: 'sit' });
    pp({ x: 33, y: 52.6, face: '+y', pose: 'stand' }); pp({ x: 41.3, y: 54.4, face: '-x', pose: 'stand' }); pp({ x: 45.5, y: 51, face: '+y', pose: 'sit' });
    pp({ x: 47.5, y: 52.5, face: '-x', pose: 'sit' }); pp({ x: 35.5, y: 56.5, face: '+x', pose: 'stand', ball: true }); pp({ x: 48, y: 56.5, face: '-x', pose: 'stand', ball: true });
    doorOf(occ({ id: 'daycare', kind: 'daycare', name: 'AI 어린이집', x: 31, y: 62, W: 10, H: 7, tmpl: 'daycare', floor: 'wood' }));
    add({ type: 'bench', x: 44, y: 43.2, w: 2.2 }, 44, 43, 3, 1);
    // zone B · pond + bridge + gazebo + flowers
    const PD = { cx: 72, cy: 50, rx: 7, ry: 4 };
    decal({ type: 'pond', ...PD });
    for (let i = PD.cx - 7; i < PD.cx + 7; i++) for (let j = PD.cy - 4; j < PD.cy + 4; j++) if (((i + 0.5 - PD.cx) / PD.rx) ** 2 + ((j + 0.5 - PD.cy) / PD.ry) ** 2 < 1) { if (j === PD.cy - 1 && i > PD.cx - 4 && i < PD.cx + 4) continue; K.block(i, j); used[j * W + i] = 4; }
    S.bridge = { y: PD.cy - 1, x0: PD.cx - 3, x1: PD.cx + 4 };
    add({ type: 'bridge', x: PD.cx - 3.5, y: PD.cy - 1, w: 8 });
    for (let k = 0; k < 4; k++) add({ type: 'duck', x: PD.cx, y: PD.cy, seed: k });
    for (const [bx, by] of [[66, 43], [75, 43], [66, 56], [75, 56]]) { add({ type: 'bench', x: bx, y: by, w: 2.4 }, bx, by, 3, 1); for (let k = 0; k < 2; k++) rest({ x: bx + 0.7 + k * 1.1, y: by + 0.25, face: '+y', pose: 'sit', approach: [bx + k, by + 1] }, '파크 연못 벤치'); }
    for (const [x, y, w, d, s] of [[56, 43, 8, 2, 1], [56, 56, 8, 2, 2], [80, 43, 8, 2, 3], [80, 56, 8, 2, 4]]) { decal({ type: 'flowers', x, y, w, d, seed: s * 11 }, 2); solid(x, y, w, d); }
    add({ type: 'gazebo', x: 92, y: 51 }, 91, 50, 2, 1);
    rest({ x: 91.3, y: 51.4, face: '+x', pose: 'sit' }, '정자'); rest({ x: 92.7, y: 51.4, face: '-x', pose: 'sit' }, '정자');
    for (const [x, y, c] of [[82, 48, '#f07a8a'], [85, 51, '#f6c445'], [88, 47, '#b38cf0'], [95, 47, '#7ab8f5'], [97, 54, '#ff9a5a']]) add({ type: 'flowerBush', x, y, size: 1.1, seed: x * 7 + y, color: c }, Math.floor(x), Math.floor(y));
    // zone B · family picnic lawn + outdoor cafe
    const matColors = ['#e5534b', '#4e7cf6', '#3fb27f', '#e9a23b', '#a67be0', '#e2667f'];
    [[58, 63], [65, 63], [72, 63], [58, 72], [65, 72], [72, 72]].forEach(([mx, my], i) => {
      decal({ type: 'mat', x: mx, y: my, w: 3, d: 2.2, color: matColors[i] }, 1);
      add({ type: 'basket', x: mx + 1.5, y: my + 1.1 });
      S.park.mats.push({ x: mx, y: my, seats: [[mx + 0.6, my + 0.6, '+y'], [mx + 2.4, my + 0.6, '+y'], [mx + 0.6, my + 1.7, '-y'], [mx + 2.4, my + 1.7, '-y']].map(([x, y, face]) => ({ lv: OUT.idx, x, y, face, pose: 'sit', tag: '가족 피크닉' })) });
    });
    for (const [x, y, k] of [[62, 69, 'cherry'], [69, 69, 'oak'], [76, 78, 'maple'], [55, 78, 'oak']]) add({ type: 'tree', x: x + 0.5, y: y + 0.5, size: 1.35, seed: x * 3 + y, kind: k }, x, y);
    add({ type: 'cafeKiosk', x: 81, y: 62, w: 5 }, 81, 62, 5, 2);
    S.npcs.push({ lv: OUT.idx, id: 'N:kiosk', role: '야외카페 바리스타', home: { lv: OUT.idx, x: 83.5, y: 63.4, face: '+y', pose: 'stand' }, anim: 'type', hat: 'beret', accent: '#2f9e5f' });
    for (const [x, y, c] of [[84, 68, '#e2667f'], [89, 68, '#4e7cf6'], [94, 68, '#3fb27f'], [84, 74, '#e9a23b'], [89, 74, '#a67be0'], [94, 74, '#1f9fb4']]) {
      add({ type: 'parasolTable', x, y, color: c }, Math.floor(x), Math.floor(y));
      for (const [dx, face] of [[-1, '+x'], [1, '-x']]) { add({ type: 'stool', x: x + dx, y, color: '#f3d48c' }); rest({ x: x + dx, y, face, pose: 'sit' }, '야외 카페'); }
    }
    add({ type: 'stringLights', pts: [[80.5, 66.5], [97.5, 66.5], [97.5, 78.5], [80.5, 78.5]] });
    for (const [x, y] of [[80, 66], [97, 66], [97, 78], [80, 78]]) solid(x, y, 1, 1);
    // zone B · food trucks + picnic tables
    ['taco', 'icecream', 'coffee', 'burger', 'tteok'].forEach((k, i) => {
      const x = 57 + i * 8;
      add({ type: 'foodTruck', x, y: 85, kind: k }, x, 85, 4, 2);
      for (let q = 0; q < 2; q++) rest({ x: x + 1.2 + q * 0.9, y: 87.8 + q * 0.7, face: '-y', pose: 'stand', carry: k === 'icecream' ? 'icecream' : k === 'coffee' ? 'mug' : null }, '푸드트럭 줄');
      S.park.wander.push({ x: x + 1.6, y: 88.4, face: '-y', food: k });
    });
    for (const [x, y] of [[59, 93], [67, 93], [75, 93], [83, 93], [91, 93]]) {
      add({ type: 'picnicTable', x, y }, x, y, 3, 2);
      for (const [dx, dy, face] of [[0.6, -0.35, '+y'], [2.0, -0.35, '+y'], [0.6, 2.25, '-y'], [2.0, 2.25, '-y']]) rest({ x: x + dx, y: y + dy, face, pose: 'sit' }, '푸드코트 테이블');
    }
    add({ type: 'stringLights', pts: [[56.5, 91], [97.5, 91]] }); solid(56, 91, 1, 1); solid(97, 91, 1, 1);
    // zone C · flower garden + loungers + parking + sports
    add({ type: 'pergola', x: 106, y: 42, w: 12, d: 2 });
    for (let x = 107; x < 118; x += 3) { add({ type: 'bench', x, y: 42.3, w: 2.2 }, x, 42, 3, 1); rest({ x: x + 1, y: 42.55, face: '+y', pose: 'sit', approach: [x + 1, 43] }, '등나무 벤치'); }
    for (const [x, y, w, d, s] of [[106, 46, 6, 2, 5], [114, 46, 6, 2, 6], [122, 44, 10, 2, 7], [134, 44, 10, 2, 8], [146, 44, 10, 2, 9], [158, 44, 12, 2, 10]]) { decal({ type: 'flowers', x, y, w, d, seed: s * 13 }, 2); solid(x, y, w, d); }
    for (let x = 106; x < 170; x += 4) add({ type: 'hedge', x, y: 50, w: 3, d: 0.8 }, x, 50, 3, 1);
    for (let x = 108; x < 168; x += 6) add({ type: 'topiary', x: x + 0.5, y: 52.5, seed: x }, x, 52);
    [124, 128, 132, 150, 154].forEach((x, i) => { add({ type: 'deckChair', x, y: 55, color: ['#4e9cf6', '#f2a7c3', '#f6c445', '#3fb27f', '#e5534b'][i] }, x, 55, 1, 1); rest({ x, y: 55.55, face: '+y', pose: 'sofa', approach: [x, 57] }, '잔디 선베드'); });
    decal({ type: 'parking', x: 108, y: 62, w: 62, d: 18, n: 24 }, 1);
    for (let i = 0; i < 16; i++) { const k = (i * 7) % 24, x = 108 + k * (62 / 24) + 0.4, top = i % 2 === 0; add({ type: 'parkedCar', x, y: top ? 68.9 : 71.5, axis: 'y', dir: top ? 1 : -1, color: ['#4e7cf6', '#e5534b', '#f2c230', '#ffffff', '#3b3f45', '#3fb27f'][i % 6] }, Math.floor(x), top ? 69 : 71, 1, 2); }
    decal({ type: 'court', x: 111, y: 85, w: 30, d: 16, kind: 'futsal' }, 1);
    add({ type: 'goal', x: 111.2, y: 91.5, side: -1 }); add({ type: 'goal', x: 140.4, y: 91.5, side: 1 });
    decal({ type: 'court', x: 147, y: 86, w: 20, d: 14, kind: 'basket' }, 1);
    add({ type: 'hoop', x: 147.6, y: 92.4, side: -1 }); add({ type: 'hoop', x: 166.2, y: 92.4, side: 1 });
    for (let k = 0; k < 6; k++) pp({ x: 116 + k * 4, y: 89 + (k % 3) * 4, face: k % 2 ? '-x' : '+x', pose: 'stand', ball: true });
    // police + bank fronts
    plaza(PX + 9, PY + PL.H, 4, 3); plaza(BX + 9, BY + BK.H, 4, 3);
    for (let i = 0; i < 2; i++) add({ type: 'policeCar', x: PX + 1 + i * 3.4, y: PY + PL.H + 0.8 }, PX + 1 + i * 3.4, PY + PL.H, 2, 3);
    add({ type: 'atmKiosk', x: BX + 18, y: BY + BK.H + 0.5 }, BX + 18, BY + BK.H, 2, 1);
    curve([[2, 10], [30, 6], [60, 10], [90, 5], [120, 10], [168, 8]]);

    // ---------------------------------------------------------------- industrial zone (공장동 · fenced truck lot · 물류센터)
    const FX = 184, FY = 88 - F.H;
    F.ox = FX; F.oy = FY;
    solid(FX, FY, F.W, F.H);
    const ROADY = R_S.y;
    const LX = FX + F.W, LOT = { x: LX, y: FY - 16, w: 264 - LX, d: ROADY - 1 - (FY - 16) };
    G.lots.push(LOT); mark(LOT.x, LOT.y, LOT.w, LOT.d, 1);
    plaza(FX, FY + F.H, F.W, 3, '#d5d0c6');
    decal({ type: 'parking', x: FX + 6, y: FY + F.H + 3, w: F.W - 8, d: 10, n: 12 }, 1);
    for (let i = 0; i < 8; i++) { const x = FX + 6 + ((i * 5) % 12) * ((F.W - 8) / 12) + 0.4, top = i % 2 === 0; add({ type: 'parkedCar', x, y: top ? FY + F.H + 3.8 : FY + F.H + 8.2, axis: 'y', dir: top ? -1 : 1, color: ['#ffffff', '#3b3f45', '#4e7cf6', '#f2c230'][i % 4] }); }
    plaza(FX + 2, FY + F.H + 3, 3, ROADY - 1 - (FY + F.H + 3));
    const GX = Math.min(LX + 14, 252);
    S.yard = { dockX: LX, bays: S.bays.map((b) => FY + b), laneIn: GX, laneOut: GX + 3.6, gateY: ROADY - 2, lot: LOT, roadY: ROADY };
    add({ type: 'gateBooth', x: GX + 7, y: ROADY - 4.4 }, GX + 7, ROADY - 5, 2, 2);
    add({ type: 'barrier', x: GX + 6.4, y: ROADY - 1.4, len: -7.4, gate: true });
    S.npcs.push({ lv: OUT.idx, id: 'N:gate', role: '출입 관리', home: { lv: OUT.idx, x: GX + 7.8, y: ROADY - 2.4, face: '+y', pose: 'stand' }, anim: 'idle', hat: 'cap', accent: '#3f74b8' });
    G.lotMarks = { x: GX, y0: FY, y1: ROADY - 2 };
    const fence = (axis, x, y) => { K.add({ type: 'fence', axis, x, y }); K.block(axis === 'x' ? x : x - 1, axis === 'x' ? y - 1 : y); };
    for (let x = LX; x < 264; x++) { if (x < GX - 1 || x > GX + 6) fence('x', x, ROADY - 1); fence('x', x, LOT.y); }
    for (let y = LOT.y; y < ROADY - 1; y++) { fence('y', 264, y); if (y < FY || y >= FY + F.H) fence('y', LX, y); }
    const kinds = ['box', 'semi', 'tanker', 'box', 'flatbed', 'semi', 'box', 'tanker', 'semi', 'box'];
    const cols = ['#e5534b', '#4e7cf6', '#3fb27f', '#e9a23b', '#a67be0', '#1f9fb4', '#e2667f', '#7a4a2a', '#2b3a67', '#c47f22'];
    let wi = 0;
    for (const ry of [FY - 2, FY + 14]) for (let x = GX + 8; x + 1.6 <= 262 && wi < 20; x += 2.6) {
      const k = kinds[wi % kinds.length], L = AIO.art6.truck.len(k);
      if (ry + L > ROADY - 8) break;
      add({ type: 'truck', x, y: ry, axis: 'y', dir: 1, kind: k, color: cols[wi % cols.length] }, Math.floor(x), Math.floor(ry), 2, Math.ceil(L));
      wi++;
    }
    for (let i = 0, x = LX + 1; x + 10 < GX - 1; i++, x += 10.5) add({ type: 'truck', x, y: FY - 13, axis: 'x', dir: 1, kind: i % 2 ? 'semi' : 'box', color: cols[(i + 3) % cols.length] }, Math.floor(x), FY - 13, 10, 2);
    doorOf(occ({ id: 'warehouse', kind: 'warehouse', name: '물류센터', x: 186, y: 4, W: 40, H: Math.max(16, FY - 16 - 4 - 6), tmpl: 'warehouse', floor: 'concrete' }));
    for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) for (let z = 0; z < 1 + ((i + k) % 3); z++) add({ type: 'container', x: 232 + k * 14, y: 5 + i * 5, z: z * 30, color: ['#e5534b', '#4e7cf6', '#3fb27f', '#e9a23b', '#a67be0'][(i + k * 2 + z) % 5], label: ['AIO', 'AI LAB', 'GPU', 'DATA'][(i + z) % 4] });
    solid(232, 5, 28, 15);

    // ---------------------------------------------------------------- south of 대학로: bus stops + the shopping street
    S.busStops = [{ x: 56, y: 111.2 }, { x: 210, y: 111.2 }];
    for (const b of S.busStops) add({ type: 'busStop', x: b.x, y: b.y, stop: S.busStops.indexOf(b) }, b.x, Math.floor(b.y), 4, 2);
    S.door = { lv: OUT.idx, x: 61.5, y: 110.5, face: '-y' };
    let si = 0;
    for (let x = 4; x + 10 < W - 3; x += 13) {
      walk(x + 11, 111, 1, 13);
      if (S.busStops.some((b) => x + 11 > b.x - 2 && x < b.x + 6)) continue;
      const name = SHOPS[si % SHOPS.length], sh = AIO.interiors2.SHOPS[name] || { kind: 'other' };
      doorOf(occ({ id: 'shop' + si, kind: 'shop', name, x, y: 114, W: 10, H: 7, seed: si, tmpl: 'shop', shop: sh, floor: sh.floor || 'tile', floorColor: sh.color }));
      add({ type: 'parkedCar', x: x + 2 + (si % 3) * 2.5, y: 125.1, axis: 'x', dir: 1, color: ['#4e7cf6', '#ffffff', '#e5534b', '#f2c230'][si % 4] });
      si++;
    }

    // ---------------------------------------------------------------- paths from every door to the nearest paved tile
    for (const o of S.occ) {
      if (!o.door) continue;
      const x = Math.floor(o.door.x) - 1;
      let y = Math.floor(o.y + o.H + 2);
      const y0 = y;
      while (y < H - 1 && used[y * W + x] !== 1 && used[y * W + x] !== 3 && used[y * W + x] !== 2 && used[y * W + x] !== 4) y++;
      if (y > y0) walk(x, y0, 2, y - y0);
    }
    // the four hand-built buildings, then interiors for the rest
    const door = (bld, ox, oy, L, lx) => S.doors.push({ bld, a: { lv: OUT.idx, x: ox + lx, y: oy + L.H + 0.55 }, b: { lv: L.idx, x: lx, y: L.H - 0.6 } });
    const L1 = towerLv[MB ? MB.base || 0 : 0];
    if (MB) { door('tower', TX, TY, L1, MB.doorX); if (MB.cafeDoor != null) door('cafe', TX, TY, L1, MB.cafeDoor); }
    else { door('tower', TX, TY, L1, 17); door('cafe', TX, TY, L1, 34.5); }
    door('factory', FX, FY, F, 3.5); door('police', PX, PY, PL, 11); door('bank', BX, BY, BK, 11);
    if (MB) S.buildings.push({ id: 'tower', name: MB.name, type: 'tower', x: TX, y: TY, W: TW, H: TH, levels: towerLv.map((L) => L.idx), door: { x: TX + MB.doorX, y: front }, base: MB.base || 0, lobby: L1.idx, facade: MB.facade, ...(MB.cafeDoor != null ? { cafeDoor: { x: TX + MB.cafeDoor, y: front }, cafe: { x0: TX + (MB.cafeX0 ?? MB.cafeDoor - 10) } } : {}) });
    else S.buildings.push({ id: 'tower', name: '🏢 연구동', type: 'tower', x: TX, y: TY, W: TW, H: TH, levels: towerLv.map((L) => L.idx), door: { x: TX + 17, y: front }, cafeDoor: { x: TX + 34.5, y: front }, cafe: { x0: TX + 24 } });
    S.buildings.push({ id: 'factory', name: '🏭 공장동', type: 'factory', x: FX, y: FY, W: F.W, H: F.H, levels: [F.idx], door: { x: FX + 3.5, y: FY + F.H }, bays: S.yard.bays });
    S.buildings.push({ id: 'police', name: '🚔 경찰서', type: 'police', x: PX, y: PY, W: PL.W, H: PL.H, levels: [PL.idx], door: { x: PX + 11, y: PY + PL.H } });
    S.buildings.push({ id: 'bank', name: '🏦 은행', type: 'bank', x: BX, y: BY, W: BK.W, H: BK.H, levels: [BK.idx], door: { x: BX + 11, y: BY + BK.H } });
    for (const b of S.buildings) { b.core = true; S.occ.push({ id: b.id, kind: b.type, name: b.name, x: b.x, y: b.y, W: b.W, H: b.H, bld: b }); }
    for (const o of S.occ) {
      if (!o.tmpl || o.bld) continue;
      const L = AIO.interiors2.make(S, o);
      L.ox = o.x; L.oy = o.y;
      const dc = Math.floor(o.W / 2);
      S.doors.push({ bld: o.id, a: { lv: OUT.idx, x: o.x + dc + 0.5, y: o.y + o.H + 0.6 }, b: { lv: L.idx, x: dc + 0.5, y: o.H - 0.6 } });
      const b = { id: o.id, name: `${o.code ? o.code + ' ' : ''}${o.name}`, type: o.kind, x: o.x, y: o.y, W: o.W, H: o.H, levels: [L.idx], door: { x: o.x + dc, y: o.y + o.H }, occ: o };
      S.buildings.push(b); o.bld = b;
    }

    // ---------------------------------------------------------------- trees, lamps, benches on the remaining lawn
    const r = AIO.rand(2024);
    const tree = (x, y, s, kind) => { if (!free(x, y)) return false; add({ type: 'tree', x: x + 0.5, y: y + 0.5, size: s, seed: x * 31 + y, kind }, x, y); return true; };
    const grove = (cx, cy, rad, kind, n) => { for (let k = 0; k < n * 3 && n > 0; k++) { const a = r() * 6.28, d = Math.sqrt(r()) * rad; if (tree(Math.floor(cx + Math.cos(a) * d), Math.floor(cy + Math.sin(a) * d), 0.85 + r() * 0.5, kind)) n--; } };
    for (const [cx, cy, rad, kind, n] of [[14, 9, 5, 'pine', 9], [64, 8, 5, 'ginkgo', 8], [132, 9, 5, 'cherry', 9], [160, 10, 4, 'maple', 6], [6, 58, 4, 'cherry', 7], [24, 98, 5, 'pine', 8]]) grove(cx, cy, rad, kind, n);
    for (const rd of roads) {
      const sp = rd.name === '대학로' ? 'ginkgo' : rd.name === '상가길' ? 'maple' : 'cherry';
      if (rd.axis === 'x') for (let x = rd.x + 2; x < rd.x + rd.w - 1; x += 5) { tree(x, rd.y - 2, 1.05, sp); tree(x + 2, rd.y + rd.d + 1, 1.05, sp); }
      else for (let y = rd.y + 2; y < rd.y + rd.d - 1; y += 5) { tree(rd.x - 2, y, 1.05, sp); tree(rd.x + rd.w + 1, y + 2, 1.05, sp); }
    }
    for (const rd of roads) {
      if (rd.axis === 'x') for (let x = rd.x + 6; x < rd.x + rd.w - 2; x += 14) { const f = { type: 'streetLamp', x: x + 0.5, y: rd.y - 0.6 }; if (free(x, rd.y - 2)) { K.add(f); OUT.lamps.push(f); } }
      else for (let y = rd.y + 6; y < rd.y + rd.d - 2; y += 14) { const f = { type: 'streetLamp', x: rd.x - 0.6, y: y + 0.5 }; if (free(rd.x - 2, y)) { K.add(f); OUT.lamps.push(f); } }
    }
    let benches = 0;
    for (let y = 2; y < H - 2; y += 2) for (let x = 2; x < W - 2; x += 2) {
      if (used[y * W + x]) continue;
      const v = r();
      if (v < 0.07) tree(x, y, 0.8 + r() * 0.55, ['oak', 'cherry', 'pine', 'maple'][Math.floor(r() * 4)]);
      else if (v < 0.08) { if (free(x, y)) add({ type: 'flowerBush', x: x + 0.5, y: y + 0.5, size: 0.8 + r() * 0.3, seed: x * 7 + y }, x, y); }
      else if (v < 0.085 && benches < 40 && free(x, y, 3, 2)) {
        add({ type: 'bench', x, y, w: 2.2 }, x, y, 3, 1); benches++;
        spot({ x: x + 1, y: y + 0.25, face: '+y', pose: 'sit', approach: [x + 1, y + 1] });
      }
    }
    for (let x = 1; x < W - 1; x += 3) { tree(x, 1, 1.1, x % 2 ? 'pine' : 'oak'); tree(x, H - 3, 1.05, x % 2 ? 'pine' : 'maple'); }
    for (let y = 4; y < 104; y += 4) { tree(1, y, 1, 'pine'); tree(W - 3, y, 1, 'pine'); }
    // park wander points (families stroll between them; the pond loop too)
    for (const [x, y] of [[53, 48], [66, 60.5], [81, 60.5], [102, 60.5], [53, 82.5], [78, 82.5], [102, 70], [46, 60.5], [62, 91], [88, 91], [15, 67], [26, 76], [15, 85]]) S.park.wander.push({ x: x + 0.5, y: y + 0.5, face: '+y' });

    // ---------------------------------------------------------------- grid + walking costs
    OUT.used = used;
    S.FLOOR_PX = I().FLOOR_PX;
    S.floorNames = towerLv.map((L) => L.name);
    S.home = { x0: 0, y0: 0, x1: 176, y1: 110 };
    return finalize(S, OUT);
  }

  function finalize(S, OUT) {
    const { P } = AIO.iso;
    for (const L of S.levels) {
      L.grid = new Uint8Array(L.W * L.H).fill(1);
      for (const k of L.blocked) { const [i, j] = k.split(',').map(Number); if (i >= 0 && j >= 0 && i < L.W && j < L.H) L.grid[j * L.W + i] = 0; }
      const z = L.zBase || 0;
      const b = [P(0, 0, 120 + z), P(L.W, 0, 120 + z), P(0, L.H, z), P(L.W, L.H, z - 20), P(L.W, 0, z), P(0, L.H, z - 20)];
      L.bounds = { minX: Math.min(...b.map((p) => p[0])) - 30, maxX: Math.max(...b.map((p) => p[0])) + 30, minY: Math.min(...b.map((p) => p[1])) - 30, maxY: Math.max(...b.map((p) => p[1])) + 20 };
    }
    const W = OUT.W, H = OUT.H, used = OUT.used;
    const C = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const u = used[i];
      if (u === 3 || u === 4) OUT.grid[i] = 0;          // roads and water: only crosswalks (paved, 1) and the bridge cross them
      C[i] = u === 1 ? 1 : 3;
    }
    for (const c of OUT.ground.cross) for (let x = c.x; x < c.x + c.w; x++) for (let y = c.y; y < c.y + c.d; y++) { OUT.grid[y * W + x] = 1; C[y * W + x] = 1; }
    const B = S.bridge;
    if (B) for (let x = B.x0; x < B.x1; x++) { OUT.grid[B.y * W + x] = 1; C[B.y * W + x] = 1; }
    OUT.cost = C;
    OUT.cwAt = new Int16Array(W * H).fill(-1);
    for (const c of OUT.ground.cross) for (let x = c.x; x < c.x + c.w; x++) for (let y = c.y; y < c.y + c.d; y++) OUT.cwAt[y * W + x] = c.id;
    const tower = S.buildings[0];
    const top = (tower.levels.length - 1 - (tower.base || 0)) * S.FLOOR_PX + 100;
    const pts = [P(0, 0, 0), P(W, 0, 0), P(0, H, 0), P(W, H, 0), P(tower.x, tower.y, top)];
    S.bounds = { minX: Math.min(...pts.map((p) => p[0])) - 30, maxX: Math.max(...pts.map((p) => p[0])) + 30, minY: Math.min(...pts.map((p) => p[1])) - 60, maxY: Math.max(...pts.map((p) => p[1])) + 30 };
    const h = S.home, hp = [P(h.x0, h.y0, 0), P(h.x1, h.y0, 0), P(h.x0, h.y1, 0), P(h.x1, h.y1, 0), P(tower.x, tower.y, top)];
    S.homeBounds = { minX: Math.min(...hp.map((p) => p[0])) - 20, maxX: Math.max(...hp.map((p) => p[0])) + 20, minY: Math.min(...hp.map((p) => p[1])) - 30, maxY: Math.max(...hp.map((p) => p[1])) + 20 };
    for (const b of S.buildings) {
      const q = [P(b.x, b.y, 110), P(b.x + b.W, b.y, 110), P(b.x, b.y + b.H, 0), P(b.x + b.W, b.y + b.H, -10)];
      b.bounds = { minX: Math.min(...q.map((p) => p[0])) - 20, maxX: Math.max(...q.map((p) => p[0])) + 20, minY: Math.min(...q.map((p) => p[1])) - 30, maxY: Math.max(...q.map((p) => p[1])) + 20 };
    }
    return S;
  }

  AIO.campus = { build, W, H, get TW() { return AIO.interiors.TW; }, get TH() { return AIO.interiors.TH; }, get FLOOR_PX() { return AIO.interiors.FLOOR_PX; } };
})();
