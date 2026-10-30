/* AI OFFICE v6 — 👾 도트 세상 (그래픽 세트 「도트」)
 *
 * 캐릭터만 도트 그림으로 바뀌던 것을 바닥 · 벽 · 가구 · 건물 · 바깥까지 넓힌다.
 *   1) 도트 에셋이 있는 가구는 에셋 그림으로 바꿔 그린다 (침대 · 책장 · 화분 · 원탁 · 스툴 · 옷장 · 상자 · 통 …)
 *      - furniture.png: 「Isometric Furniture and Walls」 hawkbirdtree, CC0 (OpenGameArt)
 *      - room.png:      「Isometric pixel room」 hooded crow, CC0 (OpenGameArt)
 *   2) 바닥 · 벽은 같은 에셋의 나무 마루 · 타일 · 돌 · 잔디 · 벽돌 무늬를 깐다 (색은 맵 색 그대로, 무늬만 곱하기)
 *   3) 에셋이 없는 나머지(책상 모니터 · 서버랙 · 자판기 …)는 캐릭터와 같은 픽셀 크기(2.6)의 격자에 다시 찍는다
 *      — 작은 캔버스에 그린 뒤 반투명 가장자리를 없애고 색 단계를 줄이고 1픽셀 테두리를 둘러 도트 그림으로 만든다.
 *      화면 전체에 거는 필터가 아니라 물건마다 한 번 만들어 두고(1.5초마다 새로) 그 자리에 붙인다.
 */
(function () {
  'use strict';
  const AIO = (window.AIO = window.AIO || {});
  const PX = 2.6;                                         // 도트 하나 = 세상 2.6px (도트 캐릭터와 같은 크기)
  const BASE = 'assets/sets/pixel/env/';
  const on = () => !!(AIO.skins && AIO.skins.get && AIO.skins.get().set === 'pixel');

  // ------------------------------------------------------------ 에셋
  const img = {};
  function load(name) {
    if (img[name] !== undefined) return img[name];
    if (typeof Image === 'undefined') return (img[name] = null);
    const im = new Image();
    im.onload = () => { im.ok = true; window.dispatchEvent(new Event('aio:pxload')); };
    im.src = BASE + name + '.png';
    return (img[name] = im);
  }
  const ready = (name) => { const im = load(name); return im && im.ok ? im : null; };

  // 에셋 시트 안의 그림 자리 [시트, x, y, w, h]
  const SPR = {
    bedTeal: ['F', 4, 9, 57, 45], bedStripe: ['F', 68, 15, 55, 39], bedGreen: ['F', 164, 202, 57, 45], bedRed: ['F', 3, 265, 57, 45],
    shelfBooks: ['F', 160, 3, 32, 57], shelfEmpty: ['F', 128, 3, 32, 57], barrel: ['F', 194, 65, 27, 29], barrelOpen: ['F', 226, 65, 27, 29],
    barrelWater: ['F', 194, 97, 27, 29], bucket: ['F', 7, 133, 18, 23], dresser: ['F', 45, 143, 36, 33], dresser2: ['F', 172, 139, 36, 41],
    wardrobe: ['F', 110, 133, 34, 54], wardrobeSlim: ['F', 228, 138, 23, 49], glassCab: ['F', 270, 133, 34, 54], glassCabSlim: ['F', 4, 200, 23, 49],
    chairA: ['F', 39, 193, 18, 30], chairB: ['F', 72, 193, 17, 30], grandClock: ['F', 101, 200, 23, 48], chestPurple: ['F', 131, 195, 26, 26],
    chestWood: ['F', 35, 227, 26, 26], chestRed: ['F', 67, 227, 26, 26], pot: ['F', 229, 197, 21, 22], lantern: ['F', 265, 196, 14, 23],
    stoolOrange: ['F', 294, 199, 18, 18], stoolRed: ['F', 265, 231, 14, 18], stool: ['F', 297, 231, 14, 18], tableRoundCloth: ['F', 132, 273, 51, 33],
    tableRoundWhite: ['F', 69, 273, 51, 33], tableRound: ['F', 198, 273, 51, 33], tableRoundBlue: ['F', 262, 273, 51, 33], tableRoundPurple: ['F', 6, 337, 51, 33],
    sinkCounter: ['F', 77, 338, 36, 33], sideTable: ['F', 129, 320, 30, 31], bench: ['F', 129, 358, 30, 20], smallTable: ['F', 163, 358, 26, 21],
    stove: ['F', 205, 325, 37, 51], vaseBlue: ['F', 264, 325, 17, 22], vaseFlower: ['F', 295, 333, 20, 40], table: ['F', 4, 399, 56, 42],
    tableCloth: ['F', 66, 399, 56, 42], tableBanquet: ['F', 130, 399, 56, 42], tableWhite: ['F', 195, 399, 56, 42], pottedTree: ['F', 256, 394, 32, 44],
    well: ['F', 13, 513, 38, 61], crates: ['F', 64, 512, 32, 64], counter: ['F', 198, 12, 50, 42], stall: ['F', 261, 7, 54, 77],
    deskR: ['R', 26, 317, 64, 51], deskChairR: ['R', 116, 320, 64, 51], deskFullR: ['R', 219, 309, 64, 55], shelfR: ['R', 131, 413, 34, 61],
    shelfBooksR: ['R', 233, 408, 34, 61], cabinetR: ['R', 30, 416, 34, 61], wardrobeR: ['R', 30, 518, 40, 65], wardrobe2R: ['R', 124, 520, 40, 65],
    nightstandR: ['R', 133, 609, 26, 30], nightstandPlantR: ['R', 28, 605, 22, 34], chairR: ['R', 212, 603, 18, 28], chairR2: ['R', 262, 603, 18, 28],
    chairR3: ['R', 218, 655, 18, 32], chairR4: ['R', 267, 656, 18, 32], bedR: ['R', 484, 464, 86, 56], mirrorR: ['R', 639, 463, 32, 63],
    rugR: ['R', 475, 591, 67, 34],
  };
  const SHEET = { F: 'furniture', R: 'room' };
  const hash = (f) => { const v = Math.sin((+f.x || 0) * 12.9898 + (+f.y || 0) * 78.233) * 43758.5453; return v - Math.floor(v); };
  const pick = (f, arr) => arr[Math.floor(hash(f) * arr.length) % arr.length];
  const light = (c) => { const m = /^#?([\da-f]{6})$/i.exec(c || ''); if (!m) return false; const n = parseInt(m[1], 16); return ((n >> 16) + ((n >> 8) & 255) + (n & 255)) / 3 > 200; };
  /** 가구 종류 → 에셋 그림 (없으면 null = 도트 격자에 다시 찍기) */
  const MAP = {
    plant: (f) => ((f.size || 1) >= 0.95 ? 'pottedTree' : 'vaseFlower'),
    ia_monstera: () => 'pottedTree', flowerBush: () => 'vaseFlower', ib_jar: () => 'vaseBlue', ib_vasePlinth: () => 'vaseBlue',
    bookshelf: (f) => pick(f, ['shelfBooksR', 'shelfBooks']), storageShelf: () => 'shelfR', ia_archive: () => 'shelfBooks',
    bed: (f) => pick(f, ['bedTeal', 'bedGreen', 'bedRed', 'bedStripe']), ia_bigBed: () => 'bedR',
    cabinet: (f) => (f.coffee ? null : pick(f, ['dresser', 'nightstandR'])),
    ib_wardrobe: (f) => pick(f, ['wardrobe', 'wardrobeR']), ia_medCabinet: () => 'glassCab', trophyCase: () => 'glassCab',
    roundTable: (f) => (light(f.color) ? 'tableRoundWhite' : 'tableRound'),
    stool: () => 'stool', barStool: () => 'stoolRed',
    ib_crate: () => 'crates', ia_crates: () => 'crates', v4_chest: () => 'chestWood',
    ob_barrels: () => 'barrel', oa_lantern: () => 'lantern', ob_lantern: () => 'lantern',
    ib_lowTable: () => 'smallTable', readingTable: () => 'table', ia_banquet: () => 'tableBanquet', ib_doughTable: () => 'table',
  };

  /** 에셋 그림 그리기: 원래 그림이 차지하던 화면 자리(rect)의 바닥 가운데에 맞춘다 */
  function sprite(ctx, f, rect) {
    const fn = MAP[f.type];
    const key = fn && fn(f);
    if (!key) return false;
    const s = SPR[key], im = ready(SHEET[s[0]]);
    if (!im) return false;
    const [, sx, sy, sw, sh] = s;
    const rw = rect[2] - rect[0];
    let k = rw / (sw * PX);                                   // 그림 크기 맞추기: 비슷하면 원래 도트 크기 그대로
    k = k > 0.72 && k < 1.4 ? 1 : Math.max(0.45, Math.min(2.2, k));
    const dw = sw * PX * k, dh = sh * PX * k;
    const cx = Math.round((rect[0] + rect[2]) / 2 / PX) * PX, by = Math.round(rect[3] / PX) * PX;
    const flip = (+f.d || 0) > (+f.w || 0) * 1.2 || f.axis === 'y' || f.face === '-x' || f.face === '+x';
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(cx, by);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(im, sx, sy, sw, sh, -dw / 2, -dh, dw, dh);
    ctx.restore();
    return true;
  }

  // ------------------------------------------------------------ 도트 격자에 다시 찍기
  /** 작은 캔버스 하나를 도트 그림으로: 반투명 가장자리 없애기 · 색 단계 줄이기 · (원하면) 1픽셀 어두운 테두리 */
  function crisp(c, outline) {
    const g = c.getContext('2d', { willReadFrequently: true });
    const W = c.width, H = c.height;
    if (!W || !H) return;
    const im = g.getImageData(0, 0, W, H), d = im.data;
    if (!d || d.length < W * H * 4) return;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 120) { d[i + 3] = 0; continue; }
      d[i + 3] = 255;
      d[i] = Math.min(255, Math.round(d[i] / 16) * 16); d[i + 1] = Math.min(255, Math.round(d[i + 1] / 16) * 16); d[i + 2] = Math.min(255, Math.round(d[i + 2] / 16) * 16);
    }
    if (outline) {
      const src = new Uint8ClampedArray(d);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (src[i + 3]) continue;
        let n = -1;
        if (x > 0 && src[i - 1]) n = i - 4; else if (x < W - 1 && src[i + 7]) n = i + 4; else if (y > 0 && src[i - W * 4 + 3]) n = i - W * 4; else if (y < H - 1 && src[i + W * 4 + 3]) n = i + W * 4;
        if (n < 0) continue;
        d[i] = src[n] * 0.32; d[i + 1] = src[n + 1] * 0.3; d[i + 2] = src[n + 2] * 0.36; d[i + 3] = 255;
      }
    }
    g.putImageData(im, 0, 0);
  }

  const objs = new WeakMap();                            // 가구 → { c, x, y, w, h, at }
  let frameT = 0, spent = 0;
  /** draw(c) 로 그린 것을 도트 격자에 찍어 둔 그림으로 붙인다. rect = 그림이 차지하는 자리(현재 좌표계) */
  function drawObj(ctx, owner, rect, draw, ttl = 1.5, outline = true) {
    const now = performance.now();
    let o = objs.get(owner);
    const stale = !o || (ttl >= 0 && now - o.at > ttl * 1000 * (0.8 + 0.4 * hashKey(owner)));
    if (stale) {
      if (now - frameT > 30) { frameT = now; spent = 0; }
      if (o && spent > 5) { /* 이번 프레임은 시간이 없다 → 지난 그림 그대로 */ }
      else {
        const t0 = performance.now();
        const gx0 = Math.floor(rect[0] / PX) - 2, gy0 = Math.floor(rect[1] / PX) - 2, gx1 = Math.ceil(rect[2] / PX) + 2, gy1 = Math.ceil(rect[3] / PX) + 2;
        const W = gx1 - gx0, H = gy1 - gy0;
        if (W <= 0 || H <= 0 || W * H > 600000) return false;
        const c = (o && o.c) || document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.setTransform(1 / PX, 0, 0, 1 / PX, -gx0, -gy0);
        try { draw(g); } catch { return false; }
        g.setTransform(1, 0, 0, 1, 0, 0);
        crisp(c, outline);
        o = { c, x: gx0 * PX, y: gy0 * PX, w: W * PX, h: H * PX, at: now };
        objs.set(owner, o);
        spent += performance.now() - t0;
      }
    }
    if (!o) return false;
    const sm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(o.c, o.x, o.y, o.w, o.h);
    ctx.imageSmoothingEnabled = sm;
    return true;
  }
  const hk = new WeakMap(); let hkN = 0;
  function hashKey(o) { let v = hk.get(o); if (v == null) { v = ((hkN++ * 0.618034) % 1); hk.set(o, v); } return v; }

  /** 가구 하나 (world.drawFurniture 대신) — 그렸으면 true */
  function furniture(ctx, f, I, lv, W) {
    const D = AIO.depth;
    const m = D && D.furnBox(f, (c) => W.drawFurniture(c, f, I, lv));
    if (!m || !m.r) return false;
    const r = [m.r[0] - 4, m.r[1] - 4, m.r[2] + 4, m.r[3] + 4];
    if (m.b && sprite(ctx, f, m.r)) return true;
    return drawObj(ctx, f, r, (c) => W.drawFurniture(c, f, I, lv), 1.5, true);
  }

  // ------------------------------------------------------------ 바닥 · 벽 무늬
  const pats = new Map();
  function pattern(g, name) {
    const im = ready(name); if (!im) return null;
    let p = pats.get(g.canvas) && pats.get(g.canvas)[name];
    if (!p) { p = g.createPattern(im, 'repeat'); const m = pats.get(g.canvas) || {}; m[name] = p; pats.set(g.canvas, m); }
    return p;
  }
  const FLOOR_TEX = { wood: 'floor_wood', deck: 'floor_wood2', tile: 'floor_stone', marble: 'floor_tile', concrete: 'floor_tile', raised: 'floor_tile', grass: 'floor_grass', carpet: null };
  /** 바닥 사각형(x,y,w,d)에 재질 무늬를 곱한다 */
  function floorTex(g, x, y, w, d, style) {
    const name = FLOOR_TEX[style] === undefined ? 'floor_tile' : FLOOR_TEX[style];
    const P = AIO.iso.P;
    if (!name) { dither(g, x, y, w, d); return; }
    const p = pattern(g, name); if (!p) return;
    p.setTransform && p.setTransform(new DOMMatrix([PX, 0, 0, PX, 0, 0]));
    g.save();
    g.globalCompositeOperation = 'multiply';
    g.beginPath(); for (const [i, q] of [P(x, y), P(x + w, y), P(x + w, y + d), P(x, y + d)].entries()) g[i ? 'lineTo' : 'moveTo'](q[0], q[1]); g.closePath();
    g.fillStyle = p; g.fill();
    g.restore();
  }
  /** 카펫: 무늬 대신 성긴 점묘(디더) */
  function dither(g, x, y, w, d) {
    const P = AIO.iso.P;
    g.save();
    g.beginPath(); for (const [i, q] of [P(x, y), P(x + w, y), P(x + w, y + d), P(x, y + d)].entries()) g[i ? 'lineTo' : 'moveTo'](q[0], q[1]); g.closePath(); g.clip();
    g.fillStyle = 'rgba(0,0,0,0.07)';
    const [l] = P(x, y + d), [r] = P(x + w, y), [, t] = P(x, y), [, b] = P(x + w, y + d);
    for (let yy = Math.floor(t / PX) * PX; yy < b; yy += PX * 2) for (let xx = Math.floor(l / PX) * PX + ((yy / PX / 2) % 2 ? PX * 2 : 0); xx < r; xx += PX * 4) g.fillRect(xx, yy, PX, PX);
    g.restore();
  }
  /** 뒷벽 두 면에 벽돌 무늬 (wall 높이) */
  function wallTex(g, L, style, WALL) {
    if (style === 'roof' || style === 'none') return;
    const P = AIO.iso.P;
    const p = pattern(g, style === 'factory' ? 'wall_stone' : 'wall_brick'); if (!p) return;
    const face = (pts, m) => {
      p.setTransform && p.setTransform(new DOMMatrix(m));
      g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.55;
      g.beginPath(); pts.forEach((q, i) => g[i ? 'lineTo' : 'moveTo'](q[0], q[1])); g.closePath(); g.fillStyle = p; g.fill(); g.restore();
    };
    face([P(0, 0, 0), P(L.W, 0, 0), P(L.W, 0, WALL), P(0, 0, WALL)], [PX, PX / 2, 0, PX, 0, 0]);
    face([P(0, 0, 0), P(0, L.H, 0), P(0, L.H, WALL), P(0, 0, WALL)], [-PX, PX / 2, 0, PX, 0, 0]);
  }

  // 시트 · 무늬는 미리 불러 둔다 (도트 세트를 고를 때)
  function preload() { for (const n of ['furniture', 'room', 'floor_wood', 'floor_wood2', 'floor_stone', 'floor_tile', 'floor_grass', 'wall_brick', 'wall_stone']) load(n); }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('aio:skin', () => { if (on()) preload(); });
    if (on()) preload();
  }

  AIO.pxw = { PX, on, furniture, drawObj, crisp, sprite, floorTex, wallTex, preload, SPR, MAP };
})();
