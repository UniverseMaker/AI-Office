// (v3) 실외 B팀 부지 10종: 🌵 사막 오아시스 · 🏝️ 열대 섬 · 🌉 한강공원 · 🎋 일본식 정원 · 🌻 꽃밭 정원
//                          🚉 기차역 앞 · ⚓ 항구 · 🎪 야시장 · 🍇 와이너리 · ♨️ 온천 마을
// 모든 소품 · 바닥 재질 · 데칼 이름은 ob_ 접두어. 모든 좌표는 건물 크기(B.W/B.H)와 k.front/k.right 기준.
(function () {
  const C = AIO.compose;
  const { P, shade, rgba, poly, box, sbox, cylinder, ellipseFloor, onPlaneY, onPlaneX, roundRect } = AIO.iso;
  const FONT = AIO.art.FONT;

  // ================================================================ 그리기 도우미
  /** 타일 좌표계로 그리기 (iso 변환) — 곡선 해안선 · 타원 연못 등 */
  const TS = (g, fn) => { g.save(); g.transform(32, 16, -32, 16, 0, 0); fn(g); g.restore(); };
  const rect = (g, x, y, w, d, c, z = 0) => poly(g, [P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], c);
  const dot = (g, x, y, z, r, c) => { const [sx, sy] = P(x, y, z); g.fillStyle = c; g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill(); };
  const shadow = (g, x, y, rx, ry, a = 0.16) => ellipseFloor(g, x, y, rx, ry, 0, `rgba(40,30,20,${a})`);
  /** 실시간 프레임인지 (정적 캐시에 그릴 때는 I.low 가 없다) — 움직이는 소품은 캐시에 그리지 않는다 */
  const live = (I) => !!I && 'low' in I;
  const isNight = (I) => !!(I && I.nightInfo && I.nightInfo.lamps);
  const glow = (g, sx, sy, r, rgb, a) => { g.save(); g.globalCompositeOperation = 'lighter'; const gg = g.createRadialGradient(sx, sy, 1, sx, sy, r); gg.addColorStop(0, `rgba(${rgb},${a})`); gg.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gg; g.fillRect(sx - r, sy - r, r * 2, r * 2); g.restore(); };
  const smooth = (p) => { const u = Math.max(0, Math.min(1, p)); return u * u * (3 - 2 * u); };
  /** 왕복 운동 (양 끝에서 잠시 쉼): 0..1 위치, 방향(+1/-1), 움직이는 중인지 */
  const pingpong = (t, speed, seed = 0) => { const p = (t * speed + seed) % 2; const a = p < 1 ? p : 2 - p; const u = smooth((a - 0.12) / 0.76); return { u, dir: p < 1 ? 1 : -1, moving: a > 0.12 && a < 0.88 }; };
  const signBoard = (g, w, h, bg, fg, text, size = 6) => { g.fillStyle = bg; roundRect(g, 0, 0, w, h, 2); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.8; g.stroke(); g.fillStyle = fg; g.font = `bold ${size}px ${FONT}`; g.fillText(text, 3, h / 2 + size * 0.36); };

  // ================================================================ 부지 도우미
  /** 타원 안쪽 타일을 물(못 걷는 곳)로 */
  function waterEllipse(k, cx, cy, rx, ry) {
    for (let i = Math.floor(cx - rx); i <= cx + rx; i++) for (let j = Math.floor(cy - ry); j <= cy + ry; j++) if (((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 < 1) k.water(i, j, 1, 1);
  }
  /** 벤치(앉는 자리 n개). back=true 면 북쪽(-y)을 보고 앉는다 */
  function benchSeats(k, bx, by, n, tag, o = {}) {
    const w = 0.3 + n * 1.1;
    k.add({ type: 'bench', x: bx, y: by, w, color: o.color }, Math.floor(bx), by, Math.ceil(bx + w) - Math.floor(bx), 1);
    for (let q = 0; q < n; q++) { const sx = bx + 0.7 + q * 1.1; k.rest({ x: sx, y: by + 0.25, face: o.back ? '-y' : '+y', pose: 'sit', carry: o.carry === undefined ? 'mug' : o.carry, approach: [Math.floor(sx), by + (o.back ? -1 : 1)] }, tag); }
  }
  /** 파라솔 테이블 + 양옆 의자 2개 (tx-1 .. tx+1 타일) */
  function cafeSet(k, tx, ty, color, tag, o = {}) {
    k.add({ type: o.table || 'parasolTable', x: tx + 0.5, y: ty + 0.5, color }, tx, ty);
    for (const [dx, face] of [[-1, '+x'], [1, '-x']]) { k.add({ type: 'stool', x: tx + 0.5 + dx, y: ty + 0.5, color: o.stool || '#f3d48c' }); k.rest({ x: tx + 0.5 + dx, y: ty + 0.5, face, pose: 'sit', carry: o.carry === undefined ? 'mug' : o.carry }, tag); }
  }
  /** 가족 피크닉 돗자리 */
  function picnicMats(S, OUT, k, list, tag) {
    S.park = S.park || { mats: [], wander: [], play: [] };
    for (const [mx, my, color] of list) {
      k.G.decals.push({ type: 'mat', x: mx, y: my, w: 3, d: 2.2, color }); k.mark(mx, my, 3, 3, 1);
      k.add({ type: 'basket', x: mx + 1.5, y: my + 1.1 });
      S.park.mats.push({ x: mx, y: my, seats: [[mx + 0.6, my + 0.6, '+y'], [mx + 2.4, my + 0.6, '+y'], [mx + 0.6, my + 1.7, '-y'], [mx + 2.4, my + 1.7, '-y']].map(([x, y, face]) => ({ lv: OUT.idx, x, y, face, pose: 'sit', tag })) });
    }
  }
  /** 영역 안 빈 타일에 무작위로 n개 흩뿌리기 (둘레 margin 칸까지 비어 있을 때만) */
  function scatter(k, seed, x0, y0, x1, y1, n, fn, margin = 1) {
    const r = AIO.rand(seed);
    let done = 0;
    for (let q = 0; q < n * 8 && done < n; q++) {
      const x = Math.floor(x0 + r() * (x1 - x0)), y = Math.floor(y0 + r() * (y1 - y0));
      if (x < 1 || y < 1 || x >= k.W - 1 || y >= k.H - 1) continue;
      if (!k.free(x - margin, y - margin, 1 + margin * 2, 1 + margin * 2)) continue;
      if (fn(x, y, r) !== false) done++;
    }
    return done;
  }
  /** 막힌 칸이 없는가 (포장된 칸은 괜찮음) */
  const clear = (k, x, y, w = 1, d = 1) => { for (let i = Math.floor(x); i < Math.ceil(x + w); i++) for (let j = Math.floor(y); j < Math.ceil(y + d); j++) { if (i < 0 || j < 0 || i >= k.W || j >= k.H) return false; const u = k.used[j * k.W + i]; if (u === 2 || u === 3 || u === 4) return false; } return true; };
  /** 긴 소품은 화면 밖 판정(기준점 하나)에 잘리지 않게 maxW 칸씩 나눠 놓는다 */
  const addSplit = (k, f, maxW = 4) => { const n = Math.max(1, Math.ceil(f.w / maxW)), sw = f.w / n; for (let i = 0; i < n; i++) k.K.add({ ...f, x: f.x + i * sw, w: sw, part: i, parts: n }); };
  /** 기둥 사이를 잇는 줄(등불/줄조명): 점들 사이를 seg 칸 이하로 나눠 각 구간을 따로 놓고 기둥 칸은 막는다 */
  const addLine = (k, type, pts, seg = 6) => {
    const all = [pts[0]];
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / seg)); for (let j = 1; j <= n; j++) all.push([x0 + (x1 - x0) * j / n, y0 + (y1 - y0) * j / n]); }
    for (let i = 1; i < all.length; i++) k.K.add({ type, pts: [all[i - 1], all[i]] });
    for (const [x, y] of all) k.solid(Math.floor(x), Math.floor(y), 1, 1);
  };
  const lamp = (k, OUT, x, y) => { const f = { type: 'streetLamp', x: x + 0.5, y: y + 0.5 }; k.add(f, x, y); OUT.lamps.push(f); };

  // ================================================================ 공용 소품
  /** 🌴 야자수 (휘어진 줄기 · 부채꼴 잎 · 코코넛) */
  function palm(ctx, f, t) {
    const { x, y } = f, s = f.size || 1, r = AIO.rand((f.seed || 1) * 7 + 3);
    shadow(ctx, x + 0.35, y + 0.25, 0.75 * s, 0.55 * s);
    const lean = (r() - 0.35) * 22 * s, H = 72 * s, [bx, by] = P(x, y, 0);
    const n = 10;
    for (let i = 0; i < n; i++) {
      const k0 = i / n, k1 = (i + 1) / n;
      const x0 = bx + lean * k0 * k0, y0 = by - H * k0, x1 = bx + lean * k1 * k1, y1 = by - H * k1, w0 = (5.4 - 2.2 * k0) * s, w1 = (5.4 - 2.2 * k1) * s;
      ctx.fillStyle = i % 2 ? '#a57d4c' : '#b8915c';
      ctx.beginPath(); ctx.moveTo(x0 - w0, y0); ctx.lineTo(x1 - w1 - 0.6, y1 + 0.5); ctx.lineTo(x1 + w1 + 0.6, y1 + 0.5); ctx.lineTo(x0 + w0, y0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(70,45,20,0.18)'; ctx.beginPath(); ctx.moveTo(x0 + w0 * 0.2, y0); ctx.lineTo(x1 + w1 * 0.2, y1); ctx.lineTo(x1 + w1, y1); ctx.lineTo(x0 + w0, y0); ctx.fill();
    }
    const tx = bx + lean, ty = by - H, sw = Math.sin(t * 1.2 + (f.seed || 0)) * 0.07;
    const frond = (a, len) => {
      const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.45 + 12 * s;
      const cx = tx + Math.cos(a) * len * 0.55, cy = ty + Math.sin(a) * len * 0.25 - 9 * s;
      const px = -Math.sin(a) * 7 * s, py = Math.cos(a) * 3.5 * s;
      ctx.fillStyle = Math.sin(a) < 0 ? '#4a9447' : '#5fae58';
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(cx + px, cy + py, ex, ey); ctx.quadraticCurveTo(cx - px, cy - py, tx, ty); ctx.fill();
      ctx.strokeStyle = 'rgba(30,80,35,0.45)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
    };
    const angs = [];
    for (let k = 0; k < 8; k++) angs.push([k / 8 * Math.PI * 2 + 0.2 + sw * (k % 2 ? 1 : -1), (27 + r() * 8) * s]);
    for (const [a, l] of angs) if (Math.sin(a) < 0) frond(a, l);
    for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#7a5230' : '#8a6238'; ctx.beginPath(); ctx.arc(tx - 3 * s + k * 3 * s, ty + 3 * s + (k % 2) * 1.5, 2.8 * s, 0, 7); ctx.fill(); }
    for (const [a, l] of angs) if (Math.sin(a) >= 0) frond(a, l);
  }
  C.prop('ob_palm', { draw: palm });

  /** 🪨 바위 (둥근 돌 · 이끼) */
  function rock(ctx, f) {
    const { x, y } = f, s = f.size || 1, c = f.color || '#a9a296', r = AIO.rand((f.seed || 2) * 13);
    shadow(ctx, x + 0.08, y + 0.08, 0.5 * s, 0.38 * s, 0.2);
    const [sx, sy] = P(x, y, 0);
    const blobs = [[0, -6, 11, 8], [-6 + r() * 3, -4, 7, 5], [6, -3, 7, 5]];
    blobs.forEach(([dx, dy, rx, ry], i) => { ctx.fillStyle = i ? shade(c, -0.08) : c; ctx.beginPath(); ctx.ellipse(sx + dx * s, sy + dy * s, rx * s, ry * s, 0, 0, 7); ctx.fill(); });
    ctx.fillStyle = shade(c, 0.22); ctx.beginPath(); ctx.ellipse(sx - 3 * s, sy - 10 * s, 5 * s, 2.6 * s, -0.2, 0, 7); ctx.fill();
    ctx.strokeStyle = shade(c, -0.3); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(sx, sy - 6 * s, 11 * s, 8 * s, 0, 0.2, Math.PI - 0.2); ctx.stroke();
    if (f.moss) { ctx.fillStyle = 'rgba(95,163,90,0.8)'; ctx.beginPath(); ctx.ellipse(sx + 2 * s, sy - 12 * s, 6 * s, 2.4 * s, 0.1, 0, 7); ctx.fill(); }
  }
  C.prop('ob_rock', { draw: rock });

  /** ⚠️ 경고 표지판 (노란 마름모 + 글 판) */
  C.prop('ob_warnSign', { draw(ctx, f) {
    const { x, y } = f;
    sbox(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, 34, '#8a8f96');
    onPlaneY(ctx, x - 0.46, y + 0.05, 56, (g) => {
      g.fillStyle = f.bg || '#f2c230'; g.strokeStyle = '#2b2622'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(15, 0); g.lineTo(30, 13); g.lineTo(15, 26); g.lineTo(0, 13); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#2b2622'; g.font = `bold 11px ${FONT}`; g.fillText(f.icon || '!', 9.5, 17.5);
      const w = Math.max(30, String(f.text || '').length * 5.6 + 6);
      g.translate(15 - w / 2, 27); signBoard(g, w, 9, '#ffffff', '#c43d32', f.text || '', 5.2);
    });
  } });

  /** 🏮 등불 기둥 (빨간 종이등 2개 · 밤에 빛남) — 야시장 · 온천 */
  C.prop('ob_lantern', { dynamic: true, draw(ctx, f, t, I) {
    const { x, y } = f, c = f.color || '#e5534b', n = isNight(I);
    sbox(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, 56, '#6b4a35');
    box(ctx, x - 0.05, y - 0.35, 54, 0.1, 0.7, 2, '#8a6247', '#7a5540', '#6b4a35');
    for (const dy of [-0.3, 0.3]) {
      const [sx, sy0] = P(x, y + dy, 54), sw = Math.sin(t * 1.6 + x + dy * 3) * 1.2, sy = sy0 + 4;
      ctx.strokeStyle = '#3b2f2a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(sx, sy0); ctx.lineTo(sx + sw, sy); ctx.stroke();
      if (n) glow(ctx, sx + sw, sy + 8, 26, '255,170,90', 0.55);
      ctx.fillStyle = n ? shade(c, 0.25) : c; ctx.beginPath(); ctx.ellipse(sx + sw, sy + 8, 5, 7, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.6; for (const k of [-3, 0, 3]) { ctx.beginPath(); ctx.moveTo(sx + sw - 5, sy + 8 + k); ctx.quadraticCurveTo(sx + sw, sy + 9.5 + k, sx + sw + 5, sy + 8 + k); ctx.stroke(); }
      ctx.fillStyle = '#2b2622'; ctx.fillRect(sx + sw - 3, sy, 6, 1.6); ctx.fillRect(sx + sw - 3, sy + 14.4, 6, 1.6);
      if (f.text) { ctx.fillStyle = n ? '#7a1f1a' : '#fff4dc'; ctx.font = `bold 5px ${FONT}`; ctx.fillText(f.text, sx + sw - 2.6, sy + 10); }
    }
  } });

  // ================================================================ 🌵 사막 소품
  C.floorStyle('ob_dunes', (g, x, y, w, d, base, r, seed) => {
    const S = 9;
    for (let ci = Math.floor((x - 9) / S); ci <= Math.ceil((x + w + 9) / S); ci++) for (let cj = Math.floor((y - 9) / S); cj <= Math.ceil((y + d + 9) / S); cj++) {
      const h = AIO.rand(ci * 7919 + cj * 104729 + 17);
      const cx = ci * S + h() * S, cy = cj * S + h() * S, rx = 2.6 + h() * 3.2, ry = 1.4 + h() * 1.6, rot = 0.3 + h() * 0.6;
      TS(g, (q) => {
        q.beginPath(); q.ellipse(cx + 0.4, cy + 0.35, rx, ry, rot, 0, 7); q.fillStyle = shade(base, -0.045); q.fill();
        q.beginPath(); q.ellipse(cx, cy, rx * 0.92, ry * 0.85, rot, 0, 7); q.fillStyle = shade(base, 0.045); q.fill();
        q.strokeStyle = rgba(shade(base, -0.12), 0.35); q.lineWidth = 0.05;
        for (let k = 1; k < 3; k++) { q.beginPath(); q.ellipse(cx + 0.12 * k, cy + 0.14 * k, rx * (1 - k * 0.25), ry * (1 - k * 0.25), rot, Math.PI * 0.15, Math.PI * 0.75); q.stroke(); }
      });
    }
    void r; void seed;
  });
  /** 오아시스 연못: 풀 테두리 · 젖은 모래 · 청록 물 · 갈대 */
  C.decal('ob_oasis', (g, d) => {
    const r = AIO.rand(Math.round(d.cx * 13 + d.cy * 7));
    const { cx, cy } = d, rx = d.wrx, ry = d.wry;
    TS(g, (q) => {
      const e = (ex, ey, c, ox = 0, oy = 0) => { q.beginPath(); q.ellipse(cx + ox, cy + oy, ex, ey, 0, 0, 7); q.fillStyle = c; q.fill(); };
      e(rx + 1.7, ry + 1.4, '#a8c87a'); e(rx + 1.2, ry + 1.0, '#93bd6a');
      e(rx + 0.55, ry + 0.45, '#cdb27c');
      e(rx + 0.1, ry + 0.08, '#2f8fb0'); e(rx, ry, '#3fb0c9'); e(rx * 0.7, ry * 0.62, '#6fd0e0', -rx * 0.12, -ry * 0.15);
      q.strokeStyle = 'rgba(255,255,255,0.55)'; q.lineWidth = 0.06;
      for (let k = 0; k < 6; k++) { const a = r() * 6.28, kk = 0.2 + r() * 0.5, px = cx + Math.cos(a) * rx * kk, py = cy + Math.sin(a) * ry * kk; q.beginPath(); q.moveTo(px - 0.4, py); q.lineTo(px + 0.4, py); q.stroke(); }
    });
    for (let k = 0; k < 22; k++) {
      const a = r() * 6.28, [sx, sy] = P(cx + Math.cos(a) * (rx + 0.3), cy + Math.sin(a) * (ry + 0.25), 0);
      g.strokeStyle = r() < 0.5 ? '#5f9a45' : '#7cb85a'; g.lineWidth = 1;
      for (let j = -1; j <= 1; j++) { g.beginPath(); g.moveTo(sx + j * 1.5, sy); g.lineTo(sx + j * 2.5, sy - 6 - r() * 4); g.stroke(); }
    }
  });

  /** 🌵 선인장: saguaro(기둥) · barrel(공) · pear(부채) */
  function cactus(ctx, f) {
    const { x, y } = f, s = (f.size || 1) * 1.3, kind = f.kind || 'saguaro', r = AIO.rand((f.seed || 3) * 17);
    shadow(ctx, x + 0.12, y + 0.1, 0.38 * s, 0.28 * s, 0.2);
    const [sx, sy] = P(x, y, 0);
    const G0 = '#3f8a4a', G1 = '#5aa55a', G2 = '#8fd07f';
    if (kind === 'saguaro') {
      const tube = (pts, w) => {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const [c, lw, ox] of [[G0, w, 0], [G1, w * 0.72, -w * 0.12], [G2, w * 0.16, -w * 0.26]]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(sx + px * s + ox, sy + py * s) : ctx.moveTo(sx + px * s + ox, sy + py * s))); ctx.stroke(); }
      };
      const hL = -16 - r() * 6, hR = -24 - r() * 6;
      tube([[0, hL], [-9, hL], [-9, hL - 13]], 7);
      if (r() < 0.8) tube([[0, hR], [8, hR], [8, hR - 11]], 6.5);
      tube([[0, -1], [0, -46]], 11);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let k = 0; k < 10; k++) ctx.fillRect(sx + (r() - 0.5) * 9 * s, sy - (4 + r() * 40) * s, 1, 1);
      if (f.bloom) { ctx.fillStyle = '#f7b6c8'; ctx.beginPath(); ctx.arc(sx, sy - 51 * s, 3 * s, 0, 7); ctx.fill(); ctx.fillStyle = '#f6d55a'; ctx.beginPath(); ctx.arc(sx, sy - 51 * s, 1.2 * s, 0, 7); ctx.fill(); }
    } else if (kind === 'barrel') {
      ctx.fillStyle = G0; ctx.beginPath(); ctx.ellipse(sx, sy - 8 * s, 10 * s, 9 * s, 0, 0, 7); ctx.fill();
      ctx.fillStyle = G1; ctx.beginPath(); ctx.ellipse(sx - 1.2 * s, sy - 9 * s, 8.4 * s, 8 * s, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(30,80,35,0.5)'; ctx.lineWidth = 0.8;
      for (const k of [-6, -3, 0, 3, 6]) { ctx.beginPath(); ctx.ellipse(sx + k * s * 0.4, sy - 8.5 * s, Math.abs(k) * 0.55 * s + 1, 8.5 * s, 0, -Math.PI / 2, Math.PI / 2, k < 0); ctx.stroke(); }
      const fc = ['#f07a8a', '#f6c445', '#ff9a5a'][Math.floor(r() * 3)];
      for (let k = 0; k < 5; k++) { ctx.fillStyle = fc; ctx.beginPath(); ctx.arc(sx + (k - 2) * 2.4 * s, sy - 17 * s + Math.abs(k - 2) * 0.8, 2 * s, 0, 7); ctx.fill(); }
    } else {
      const pads = [[0, -9, 0], [-7, -19, -0.45], [6, -20, 0.4], [-1, -29, 0.1]];
      if (r() < 0.5) pads.push([10, -11, 0.7]);
      pads.forEach(([dx, dy, rot], i) => {
        ctx.save(); ctx.translate(sx + dx * s, sy + dy * s); ctx.rotate(rot);
        ctx.fillStyle = i % 2 ? G1 : '#62ad5e'; ctx.beginPath(); ctx.ellipse(0, 0, 6.2 * s, 8.6 * s, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = G0; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,230,0.75)'; for (let k = 0; k < 5; k++) ctx.fillRect((r() - 0.5) * 7 * s, (r() - 0.5) * 11 * s, 1, 1);
        if (i >= 2) { ctx.fillStyle = '#d9446a'; ctx.beginPath(); ctx.ellipse(-2 * s, -8.5 * s, 1.8 * s, 2.4 * s, 0, 0, 7); ctx.ellipse(2.4 * s, -8 * s, 1.8 * s, 2.4 * s, 0, 0, 7); ctx.fill(); }
        ctx.restore();
      });
    }
  }
  C.prop('ob_cactus', { draw: cactus });

  /** 🐪 낙타: sit(앉음) / walk(축 x 로 천천히 왕복) */
  function camelBody(ctx, sx, sy, dir, t, moving, sit, seed) {
    ctx.save(); ctx.translate(sx, sy); ctx.scale(dir * 1.4, 1.4);
    ctx.fillStyle = 'rgba(60,40,20,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 5, 0, 0, 7); ctx.fill();
    const body = '#d9a96b', dk = '#b98a52', st = moving ? Math.sin(t * 5 + seed) : 0;
    const by = sit ? -10 : -26;
    if (!sit) {
      ctx.strokeStyle = dk; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      for (const [lx, o] of [[-9, st], [-5, -st], [7, -st], [11, st]]) { ctx.beginPath(); ctx.moveTo(lx, by + 3); ctx.lineTo(lx + o * 2, by + 13); ctx.lineTo(lx + o * 3, 0); ctx.stroke(); }
    } else { ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(-8, -3, 6, 3, 0, 0, 7); ctx.ellipse(8, -3, 6, 3, 0, 0, 7); ctx.fill(); }
    ctx.strokeStyle = dk; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-14, by); ctx.quadraticCurveTo(-18, by + 6 + Math.sin(t * 3 + seed) * 2, -17, by + 10); ctx.stroke();
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, by, 15, 8, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-1, by - 8, 8, 7, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#c94a3a'; ctx.beginPath(); ctx.moveTo(-8, by - 7); ctx.quadraticCurveTo(-1, by - 18, 6, by - 7); ctx.lineTo(7, by + 1); ctx.lineTo(-9, by + 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2c230'; for (let k = 0; k < 4; k++) ctx.fillRect(-8 + k * 4.2, by - 1, 2.4, 2);
    ctx.strokeStyle = '#2f6db3'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-8, by - 4); ctx.lineTo(6.5, by - 4); ctx.stroke();
    const nod = Math.sin(t * (moving ? 5 : 1.2) + seed) * 1.2;
    ctx.strokeStyle = body; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(11, by - 1); ctx.quadraticCurveTo(19, by - 4, 18, by - 15 + nod); ctx.stroke();
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(21, by - 16 + nod, 6, 3.4, 0.15, 0, 7); ctx.fill();
    ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(17, by - 19 + nod, 1.4, 2.2, -0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b2622'; ctx.fillRect(20, by - 18 + nod, 1.4, 1.4); ctx.fillRect(26, by - 15.5 + nod, 0.9, 0.9);
    ctx.restore();
  }
  C.prop('ob_camel', {
    dynamic: true,
    depth: (f) => (f._cx ?? f.x) + (f._cy ?? f.y) + 0.3,
    draw(ctx, f, t, I) {
      if (f.walk) {
        if (!live(I)) return;
        const m = pingpong(t, 0.045, f.seed || 0);
        f._cx = f.x + m.u * f.walk; f._cy = f.y;
        const [sx, sy] = P(f._cx, f._cy, 0);
        camelBody(ctx, sx, sy, m.dir, t, m.moving, false, f.seed || 0);
      } else { const [sx, sy] = P(f.x, f.y, 0); camelBody(ctx, sx, sy, f.dir || 1, t, false, !!f.sit, f.seed || 0); }
    },
  });

  /** ⛺ 베두인 텐트 (줄무늬 천 · 앞쪽 열림 · 안쪽 쿠션 · 랜턴). w × 2.4 */
  C.prop('ob_tent', {
    slice: 2.4,
    draw(ctx, f, t, I) {
      const { x, y, w } = f, d = 2.4, c = f.color || '#6b3f2a', c2 = f.stripe || '#efe2c6', Z = 40, ZF = 31;
      shadow(ctx, x + w / 2 + 0.3, y + d / 2 + 0.2, w / 2 + 0.3, 1.5);
      rect(ctx, x, y, w, d, '#3b2a20');
      poly(ctx, [P(x, y, 0), P(x + w, y, 0), P(x + w, y, Z), P(x, y, Z)], shade(c, -0.45));
      rect(ctx, x + 0.15, y + 0.6, w - 0.3, d - 0.6, '#b8473a', 0.5);
      for (let i = 0; i < w - 0.6; i += 0.9) box(ctx, x + 0.3 + i, y + d - 0.75, 0.5, 0.75, 0.5, 5, ['#e9a23b', '#4e7cf6', '#3fb27f', '#e2667f'][Math.round(i / 0.9) % 4], shade('#e9a23b', -0.1), shade('#e9a23b', -0.2));
      const n = isNight(I), [lx, ly] = P(x + w / 2, y + 1, 26);
      if (n) glow(ctx, lx, ly, 40, '255,190,110', 0.5);
      ctx.fillStyle = n ? '#ffd27a' : '#e0a92a'; ctx.beginPath(); ctx.arc(lx, ly, 2.6, 0, 7); ctx.fill();
      // 지붕: 기둥마다 봉긋 솟은 천막 (뒤 높고 앞 낮음)
      const poles = [0.1, w / 2, w - 0.1], bump = (u) => Math.max(...poles.map((p) => Math.max(0, 1 - Math.abs(u - p) / 1.15))) ** 1.4;
      const zb = (u) => Z + 22 * bump(u), zf = (u) => ZF + 6 * bump(u);
      poly(ctx, [P(x + w, y, 0), P(x + w, y + d, 0), P(x + w, y + d, zf(w)), P(x + w, y, zb(w))], shade(c, -0.25), 'rgba(0,0,0,0.2)');
      for (let k = 0.5; k < d - 0.2; k += 0.8) poly(ctx, [P(x + w, y + k, 0), P(x + w, y + k + 0.25, 0), P(x + w, y + k + 0.25, ZF), P(x + w, y + k, ZF + 2)], rgba(c2, 0.35));
      const N = Math.ceil((w + 0.24) / 0.2);
      for (let i = 0; i < N; i++) {
        const u0 = i * (w + 0.24) / N - 0.12, u1 = (i + 1) * (w + 0.24) / N - 0.12, up = bump(u1) < bump(u0);
        const col = Math.floor((u0 + 0.12) / 0.4) % 3 === 1 ? c2 : c;
        poly(ctx, [P(x + u0, y - 0.05, zb(u0)), P(x + u1, y - 0.05, zb(u1)), P(x + u1, y + d + 0.12, zf(u1)), P(x + u0, y + d + 0.12, zf(u0))], shade(col, up ? -0.1 : 0.04));
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.8; ctx.beginPath();
      for (let i = 0; i <= N; i++) { const u = i * (w + 0.24) / N - 0.12, [px, py] = P(x + u, y + d + 0.12, zf(u)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      // 앞 장식 술 + 기둥
      for (let u = 0; u <= w; u += 0.5) { const [sx, sy] = P(x + u, y + d + 0.12, zf(u)); ctx.fillStyle = Math.round(u * 2) % 2 ? '#f2c230' : '#c94a3a'; ctx.beginPath(); ctx.arc(sx, sy + 1.5, 2, 0, Math.PI); ctx.fill(); }
      for (const u of poles) { sbox(ctx, x + u - 0.04, y + d, 0, 0.08, 0.08, zf(u), '#8a6247'); const [px, py] = P(x + u, y + 0.2, zb(u) + 3); ctx.fillStyle = '#d9a441'; ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 7); ctx.fill(); }
    },
  });
  /** 페르시아풍 러그 (테두리 · 무늬 · 술) */
  C.decal('ob_rug', (g, d) => {
    const { x, y, w } = d, dd = d.d, c = d.color || '#b8473a';
    rect(g, x, y, w, dd, shade(c, -0.25)); rect(g, x + 0.12, y + 0.12, w - 0.24, dd - 0.24, '#e9c46a'); rect(g, x + 0.22, y + 0.22, w - 0.44, dd - 0.44, c);
    TS(g, (q) => { q.fillStyle = '#e9c46a'; for (let i = 0; i < 3; i++) { const cx = x + w * (i + 0.5) / 3, cy = y + dd / 2; q.beginPath(); q.moveTo(cx, cy - 0.35); q.lineTo(cx + 0.3, cy); q.lineTo(cx, cy + 0.35); q.lineTo(cx - 0.3, cy); q.closePath(); q.fill(); } q.fillStyle = '#f6efe0'; for (let i = x + 0.1; i < x + w; i += 0.2) { q.fillRect(i, y - 0.12, 0.06, 0.12); q.fillRect(i, y + dd, 0.06, 0.12); } });
  });
  /** 🫖 낮은 찻상 (놋쟁반 + 찻주전자) */
  C.prop('ob_teaTray', { draw(ctx, f) {
    const { x, y } = f;
    cylinder(ctx, x, y, 0, 0.3, 6, '#d9a441', '#b8862f', 'rgba(0,0,0,0.2)');
    const [sx, sy] = P(x, y, 6); ctx.fillStyle = '#e9e4da'; ctx.beginPath(); ctx.ellipse(sx, sy - 3, 3, 3.6, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#c9c1b4'; ctx.fillRect(sx + 2, sy - 4, 3, 1);
    for (const o of [-6, 6]) { ctx.fillStyle = '#7fbfd9'; ctx.fillRect(sx + o - 1, sy - 1.5, 2, 3); }
  } });
  /** 🪣 물 여물통 */
  C.prop('ob_trough', { draw(ctx, f) { const { x, y } = f; box(ctx, x, y, 0, 1.6, 0.6, 8, '#8a6247', '#7a5540', '#6b4a35', 'rgba(0,0,0,0.2)'); rect(ctx, x + 0.08, y + 0.08, 1.44, 0.44, '#4fa8c9', 7.5); } });

  // ================================================================ 🌵 사막 오아시스
  C.outdoor({
    id: 'desert', icon: '🌵', name: '사막 오아시스', desc: '모래언덕 · 오아시스 연못 · 야자수 · 선인장 · 낙타 · 베두인 텐트',
    size: (B) => ({ W: B.W + 34, H: B.H + 26 }),
    lot(S, OUT, B, k) {
      OUT.ground.base = { color: '#efd6a2', tufts: ['#e0c28a', '#f7e7c4'], edge: '#cfa968', edge2: '#b8914f' };
      const TX = 3, TY = 3;
      k.place(B, TX, TY);
      const W = k.W, H = k.H, F = k.front, R = k.right, DX = Math.floor(TX + B.doorX);
      k.area(0, 0, W, H, 'ob_dunes', '#efd6a2');
      // 길: 정문 → 남쪽 출입구 · 정문 → 오아시스
      const ocx = R + 16, ocy = TY + Math.round(B.H * 0.42) + 2, orx = 7, ory = 4.5;
      const path = { color: '#e6cb94', edge: '#cfae72', dots: true };
      k.curve([[DX + 0.5, F + 0.5], [DX + 0.5, F + 5], [DX + 1.5, F + (H - F) / 2], [DX + 0.5, H - 3], [DX + 0.5, H - 0.5]], 1.6, path);
      k.curve([[DX + 1.5, F + 2.5], [R - 2, F + 2.5], [R + 8, F + 1], [ocx, ocy + ory + 4]], 1.4, path);
      // 🌴 오아시스
      k.G.decals.push({ type: 'ob_oasis', cx: ocx, cy: ocy, rx: orx + 2.2, ry: ory + 2, wrx: orx, wry: ory });
      waterEllipse(k, ocx, ocy, orx, ory);
      k.sign(ocx - 3, ocy + ory + 4.6, '🌴 오아시스', '#1f9fb4');
      const by = Math.floor(ocy + ory + 2);
      benchSeats(k, ocx - 5.4, by, 2, '오아시스 벤치', { back: true, color: '#c49a62' });
      benchSeats(k, ocx + 2.2, by, 2, '오아시스 벤치', { back: true, color: '#c49a62' });
      for (let q = 0; q < 10; q++) { const a = q / 10 * Math.PI * 2 + 0.3, x = Math.floor(ocx + Math.cos(a) * (orx + 1.6)), y = Math.floor(ocy + Math.sin(a) * (ory + 1.4)); if (k.free(x, y)) k.add({ type: 'ob_palm', x: x + 0.5, y: y + 0.5, size: 0.9 + (q % 3) * 0.12, seed: q + 5 }, x, y); }
      picnicMats(S, OUT, k, [[ocx + orx + 2, ocy - 3, '#e5534b'], [ocx + orx + 2, ocy + 1, '#4e7cf6']], '오아시스 피크닉');
      S.park.wander.push({ x: ocx - orx - 2, y: ocy, face: '+x' }, { x: ocx, y: ocy - ory - 1.5, face: '+y' }, { x: ocx + orx + 1.5, y: ocy + ory + 1, face: '-x', food: 'icecream' });
      k.npc('오아시스 지기', { x: ocx - orx - 1.5, y: ocy + 0.5, face: '+x' }, { hat: 'bucket', accent: '#1f9fb4', say: '💧 물 조심하세요', patrol: [{ x: ocx - orx - 1.5, y: ocy + 0.5, face: '+x' }, { x: ocx + 0.5, y: ocy - ory - 1.5, face: '+y' }, { x: ocx + orx + 1.5, y: ocy + 0.5, face: '-x' }] });
      // ⛺ 베두인 텐트 (길 왼쪽)
      const tentN = DX >= 13 ? 2 : 1;
      for (let i = 0; i < tentN; i++) {
        const tx = 2 + i * 5, ty = F + 3;
        k.add({ type: 'ob_tent', x: tx, y: ty, w: 4, color: i ? '#4a3b5c' : '#6b3f2a' }, tx, ty, 4, 3);
        k.G.decals.push({ type: 'ob_rug', x: tx + 0.2, y: ty + 3, w: 3.6, d: 1.7, color: i ? '#3f6fb3' : '#b8473a' });
        k.add({ type: 'ob_teaTray', x: tx + 2, y: ty + 3.85 });
        for (const [sx, face] of [[tx + 0.8, '+x'], [tx + 3.2, '-x']]) k.rest({ x: sx, y: ty + 3.85, face, pose: 'sit', carry: 'mug' }, '베두인 텐트');
        k.rest({ x: tx + 2, y: ty + 4.5, face: '-y', pose: 'sit', carry: 'mug' }, '베두인 텐트');
        k.solid(tx + 2, ty + 3, 1, 1);
      }
      k.sign(2, F + 2.6, '⛺ 베두인 텐트', '#8a4a2a');
      k.npc('텐트 주인', { x: 4.5, y: F + 8.5, face: '-y' }, { hat: 'beanie', accent: '#c94a3a', say: '🫖 민트티 한잔?', anim: 'idle' });
      // 🔥 사막 캠프파이어 (길 오른쪽)
      const fx = DX + 8, fy = F + 8;
      k.add({ type: 'firePit', x: fx, y: fy }, fx - 1, fy - 1, 2, 2);
      benchSeats(k, fx - 2.6, fy - 3, 4, '사막 캠프파이어', { color: '#a87a52' });
      benchSeats(k, fx - 2.6, fy + 2, 4, '사막 캠프파이어', { color: '#a87a52', back: true });
      OUT.lamps.push({ x: fx, y: fy });
      k.sign(fx - 2.6, fy + 3.9, '🔥 사막 캠프파이어', '#c47f22');
      // 🐪 낙타 쉼터 (앞쪽 오른편)
      const cx0 = Math.max(fx + 5, R + 2), cy0 = F + 4;
      k.add({ type: 'ob_camel', x: cx0 + 1, y: cy0 + 0.5, sit: true, dir: 1, seed: 1 }, cx0, cy0, 2, 1);
      k.add({ type: 'ob_camel', x: cx0 + 4.5, y: cy0 + 0.6, sit: false, dir: -1, seed: 2 }, cx0 + 4, cy0, 2, 1);
      k.add({ type: 'ob_trough', x: cx0 + 1.2, y: cy0 + 2 }, cx0 + 1, cy0 + 2, 2, 1);
      k.add({ type: 'ob_camel', x: cx0, y: cy0 + 5.5, walk: 6, seed: 3 }, cx0, cy0 + 5, 8, 1);
      k.sign(cx0, cy0 + 7, '🐪 낙타 쉼터', '#a8691a');
      k.npc('낙타 몰이꾼', { x: cx0 + 3, y: cy0 + 3.5, face: '+y' }, { hat: 'cap', accent: '#e9a23b', say: '🐪 타 보실래요?', patrol: [{ x: cx0 + 3, y: cy0 + 3.5, face: '+y' }, { x: cx0 + 8.5, y: cy0 + 3.5, face: '-x' }] });
      // ⚠️ 모래바람 표지 · 🌵 선인장 정원
      k.add({ type: 'ob_warnSign', x: DX + 2.6, y: H - 3.4, icon: '🌪', text: '모래바람 주의' }, DX + 2, H - 4);
      k.add({ type: 'ob_warnSign', x: W - 2.5, y: F + 2.4, icon: '!', text: '낙타 횡단' }, W - 3, F + 2);
      k.sign(W - 13, H - 1.4, '🌵 선인장 정원', '#3f8a4a');
      const kinds = ['saguaro', 'barrel', 'pear', 'saguaro', 'pear'];
      scatter(k, 41, 1, 1, W - 1, H - 1, Math.round(W * H / 55), (x, y, r) => { k.add({ type: 'ob_cactus', x: x + 0.5, y: y + 0.5, kind: kinds[Math.floor(r() * kinds.length)], size: 0.8 + r() * 0.45, seed: x * 7 + y, bloom: r() < 0.3 }, x, y); });
      scatter(k, 43, 1, 1, W - 1, H - 1, Math.round(W * H / 160), (x, y, r) => { k.add({ type: 'ob_rock', x: x + 0.5, y: y + 0.5, size: 0.7 + r() * 0.6, color: '#c98f5f', seed: x + y * 3 }, x, y); });
      scatter(k, 47, R + 1, 1, W - 1, H - 1, 6, (x, y, r) => { k.add({ type: 'ob_palm', x: x + 0.5, y: y + 0.5, size: 0.85 + r() * 0.3, seed: x * 3 + y }, x, y); });
      S.pets = [{ kind: 'cat', color: '#e8c48a' }, { kind: 'cat', color: '#f0a050' }, { kind: 'dog', color: '#ead6b0' }];
      S.door = { lv: OUT.idx, x: DX + 0.5, y: H - 1.2, face: '-y' };
    },
  });
  // ================================================================ 🌊 물가 공용 (바다 · 강 · 부두 · 배)
  const now = () => Date.now() / 1000;
  /** 타일 공간 둥근 사각형 경로 */
  const rrPath = (q, x0, y0, x1, y1, r) => { r = Math.max(0, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2)); q.moveTo(x0 + r, y0); q.arcTo(x1, y0, x1, y1, r); q.arcTo(x1, y1, x0, y1, r); q.arcTo(x0, y1, x0, y0, r); q.arcTo(x0, y0, x1, y0, r); q.closePath(); };
  const rrE = (q, L, e) => rrPath(q, L.x0 - e, L.y0 - e, L.x1 + e, L.y1 + e, Math.max(0, L.r + e));
  /** 점이 육지(둥근 사각형) 안인가 */
  const inLand = (px, py, L, e = 0) => {
    const x0 = L.x0 - e, y0 = L.y0 - e, x1 = L.x1 + e, y1 = L.y1 + e, r = Math.max(0, Math.min(L.r + e, (x1 - x0) / 2, (y1 - y0) / 2));
    if (px < x0 || px > x1 || py < y0 || py > y1) return false;
    const cx = Math.max(x0 + r, Math.min(x1 - r, px)), cy = Math.max(y0 + r, Math.min(y1 - r, py));
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r + 1e-6;
  };
  /** 바다: land(둥근 사각형) 바깥이 전부 바다. beach>0 이면 모래사장 띠, quay 면 콘크리트 안벽 */
  C.decal('ob_sea', (g, d) => {
    const L = d.land, r = AIO.rand(d.seed || 5);
    TS(g, (q) => {
      const band = (e0, e1, col) => { q.beginPath(); if (e0 == null) q.rect(d.x - 2, d.y - 2, d.w + 4, d.d + 4); else rrE(q, L, e0); rrE(q, L, e1); q.fillStyle = col; q.fill('evenodd'); };
      band(null, 2.8, '#3f9ad0'); band(2.8, 1.3, '#55b2dc'); band(1.3, 0.12, '#7ccde8');
      if (d.beach) { band(0.12, -0.45, '#e4c98f'); band(-0.45, -d.beach, '#f2dfb0'); }
      if (d.quay) { band(0.12, -0.55, '#bdb7ab'); q.beginPath(); rrE(q, L, 0.12); q.strokeStyle = '#8f897e'; q.lineWidth = 0.08; q.stroke(); q.beginPath(); rrE(q, L, -0.55); q.strokeStyle = '#f2c230'; q.lineWidth = 0.06; q.stroke(); }
      q.beginPath(); rrE(q, L, 0.2); q.strokeStyle = 'rgba(255,255,255,0.85)'; q.lineWidth = 0.13; q.stroke();
      q.setLineDash([0.5, 0.35]); q.beginPath(); rrE(q, L, 0.75); q.strokeStyle = 'rgba(255,255,255,0.45)'; q.lineWidth = 0.08; q.stroke(); q.setLineDash([]);
      q.strokeStyle = 'rgba(255,255,255,0.55)'; q.lineWidth = 0.07;
      for (let i = 0; i < d.w * d.d / 9; i++) { const px = d.x + r() * d.w, py = d.y + r() * d.d; if (inLand(px, py, L, 2)) continue; q.beginPath(); q.moveTo(px - 0.35, py + 0.12); q.quadraticCurveTo(px, py - 0.18, px + 0.35, py + 0.12); q.stroke(); }
    });
    if (d.beach) for (let i = 0; i < (L.x1 - L.x0) * 1.2; i++) { const a = r() * 6.28, px = (L.x0 + L.x1) / 2 + Math.cos(a) * (L.x1 - L.x0), py = (L.y0 + L.y1) / 2 + Math.sin(a) * (L.y1 - L.y0); const qx = Math.max(L.x0 + 0.3, Math.min(L.x1 - 0.3, px)), qy = Math.max(L.y0 + 0.3, Math.min(L.y1 - 0.3, py)); if (!inLand(qx, qy, L, -0.3) || inLand(qx, qy, L, -d.beach + 0.3)) continue; dot(g, qx, qy, 0, 1.6, r() < 0.5 ? '#f7b6c8' : '#ffffff'); }
  });
  /** 나무 부두 / 돌 방파제 (물 위 걷는 길) */
  C.decal('ob_pier', (g, d) => {
    const { x, y, w } = d, dd = d.d, stone = d.kind === 'stone';
    rect(g, x + 0.1, y + 0.15, w, dd, 'rgba(20,60,90,0.3)');
    if (stone) {
      rect(g, x, y, w, dd, '#a9a59e');
      const r = AIO.rand(Math.round(x * 7 + y));
      for (let i = 0; i < w * dd * 3; i++) { const [sx, sy] = P(x + 0.1 + r() * (w - 0.2), y + 0.1 + r() * (dd - 0.2)); g.fillStyle = r() < 0.5 ? '#bdb9b1' : '#94908a'; g.beginPath(); g.ellipse(sx, sy, 5 + r() * 4, 2.6 + r() * 2, 0, 0, 7); g.fill(); }
      rect(g, x, y + dd - 0.1, w, 0.1, '#7d7a74');
      return;
    }
    const along = dd >= w;
    rect(g, x, y, w, dd, '#b98c5e');
    if (along) for (let j = 0; j < dd; j += 0.34) rect(g, x, y + j, w, 0.04, 'rgba(70,45,25,0.35)');
    else for (let i = 0; i < w; i += 0.34) rect(g, x + i, y, 0.04, dd, 'rgba(70,45,25,0.35)');
    rect(g, x, y, 0.08, dd, '#8a6247'); rect(g, x + w - 0.08, y, 0.08, dd, '#8a6247');
    poly(g, [P(x, y + dd), P(x + w, y + dd), P(x + w, y + dd, -5), P(x, y + dd, -5)], '#8a6247');
    poly(g, [P(x + w, y), P(x + w, y + dd), P(x + w, y + dd, -5), P(x + w, y, -5)], '#7a5540');
    for (let j = 0; j <= dd; j += 2) for (const px of [x + 0.05, x + w - 0.05]) { const [sx, sy] = P(px, Math.min(y + dd - 0.05, y + j)); g.fillStyle = '#6b4a35'; g.fillRect(sx - 1.6, sy - 3, 3.2, 7); }
  });
  /** 강: x 축으로 흐르는 띠 (위쪽 돌 호안) */
  C.decal('ob_river', (g, d) => {
    const { x, y, w } = d, dd = d.d, r = AIO.rand(Math.round(y * 11));
    rect(g, x, y - 0.35, w, 0.35, '#c9c3b6');
    rect(g, x, y, w, dd, '#4b9fd0');
    rect(g, x, y, w, 0.6, '#6cb7de'); rect(g, x, y + dd * 0.35, w, dd * 0.3, '#56a9d6');
    for (let i = 0; i < w * dd / 3; i++) { const [sx, sy] = P(x + r() * w, y + 0.7 + r() * (dd - 0.9)); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(sx - 6, sy - 3); g.lineTo(sx + 6, sy + 3); g.stroke(); }
    poly(g, [P(x, y), P(x + w, y), P(x + w, y, -2), P(x, y, -2)], '#a59f93');
  });
  /** 강변 계단 (앉아서 강 보는 곳) */
  C.decal('ob_steps', (g, d) => {
    const { x, y, w } = d, dd = d.d;
    for (let j = 0; j < dd; j += 0.5) { rect(g, x, y + j, w, 0.5, Math.round(j * 2) % 2 ? '#d9d3c6' : '#e8e2d6'); rect(g, x, y + j + 0.42, w, 0.08, 'rgba(120,110,95,0.35)'); }
  });
  /** 자전거 도로 (초록 포장 · 흰 점선 · 자전거 그림) */
  C.decal('ob_bikeLane', (g, d) => {
    const { x, y, w } = d, dd = d.d;
    rect(g, x, y, w, dd, '#5f9a6e'); rect(g, x, y, w, 0.08, '#f4f2ee'); rect(g, x, y + dd - 0.08, w, 0.08, '#f4f2ee');
    for (let i = x + 0.3; i < x + w; i += 1.4) rect(g, i, y + dd / 2 - 0.04, 0.7, 0.08, '#f6e7a0');
    for (let i = x + 4; i < x + w - 2; i += 12) for (const [yy, dir] of [[y + dd * 0.25, 1], [y + dd * 0.75, -1]]) {
      const [sx, sy] = P(i, yy); g.save(); g.translate(sx, sy); g.transform(1, 0.5, -1, 0.5, 0, 0); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(-6, 0, 4, 0, 7); g.moveTo(10, 0); g.arc(6, 0, 4, 0, 7); g.moveTo(-6, 0); g.lineTo(-1, -6); g.lineTo(6, 0); g.moveTo(-1, -6); g.lineTo(4, -6); g.stroke();
      g.beginPath(); g.moveTo(-12 * dir, 6); g.lineTo(-4 * dir, 6); g.lineTo(-7 * dir, 4); g.stroke(); g.restore();
    }
  });

  /** 실린더 몸통 그라데이션 */
  const sideGrad = (ctx, sx, a, base) => { const gr = ctx.createLinearGradient(sx - a, 0, sx + a, 0); gr.addColorStop(0, shade(base, 0.12)); gr.addColorStop(0.5, base); gr.addColorStop(1, shade(base, -0.24)); return gr; };
  /** 위로 좁아지는 원기둥 */
  function frustum(ctx, cx, cy, z, r0, r1, h, side, top) {
    const [sx, sy] = P(cx, cy, z), a0 = r0 * 44.3, a1 = r1 * 44.3;
    ctx.beginPath(); ctx.ellipse(sx, sy, a0, a0 / 2, 0, 0, Math.PI); ctx.lineTo(sx - a1, sy - h); ctx.ellipse(sx, sy - h, a1, a1 / 2, 0, Math.PI, 0, true); ctx.closePath();
    ctx.fillStyle = sideGrad(ctx, sx, a0, side); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.6; ctx.stroke();
    if (top) { ctx.beginPath(); ctx.ellipse(sx, sy - h, a1, a1 / 2, 0, 0, 7); ctx.fillStyle = top; ctx.fill(); }
  }
  /** 🗼 등대 (빨강·흰 줄무늬 · 전망대 · 밤엔 회전 불빛) */
  C.prop('ob_lighthouse', { dynamic: true, depth: (f) => f.x + f.y + 0.6, draw(ctx, f, t, I) {
    const { x, y } = f;
    for (const [dx, dy, s] of [[-0.7, 0.4, 1.1], [0.6, 0.5, 0.9], [0.1, 0.8, 0.8]]) rock(ctx, { x: x + dx, y: y + dy, size: s, color: '#9a958c', seed: 9 + dx * 10 });
    frustum(ctx, x, y, 0, 0.95, 0.95, 8, '#b5aea2', '#c9c3b6');
    const bands = 6, H = 96;
    for (let i = 0; i < bands; i++) { const z = 8 + i * H / bands, r0 = 0.72 - i * 0.04, r1 = r0 - 0.04; frustum(ctx, x, y, z, r0, r1, H / bands + 0.5, i % 2 ? '#ffffff' : '#e5534b'); }
    const zt = 8 + H;
    onPlaneY(ctx, x - 0.15, y + 0.45, 60, (g) => { g.fillStyle = '#3b4a5c'; roundRect(g, 0, 0, 9, 13, 4); g.fill(); });
    frustum(ctx, x, y, zt, 0.62, 0.62, 3, '#3b3f45', '#5d6166');
    const n = isNight(I);
    frustum(ctx, x, y, zt + 3, 0.36, 0.36, 15, n ? '#ffe9a8' : '#cfeefa');
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4; sbox(ctx, x + Math.cos(a) * 0.34 - 0.02, y + Math.sin(a) * 0.34 - 0.02, zt + 3, 0.04, 0.04, 15, '#3b3f45'); }
    const [sx, sy] = P(x, y, zt + 18);
    ctx.fillStyle = '#c43d32'; ctx.beginPath(); ctx.ellipse(sx, sy, 17, 8.5, 0, Math.PI, 0); ctx.lineTo(sx + 17, sy); ctx.quadraticCurveTo(sx, sy - 22, sx - 17, sy); ctx.fill();
    ctx.fillStyle = '#e5534b'; ctx.beginPath(); ctx.ellipse(sx - 4, sy - 8, 5, 4, -0.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#3b3f45'; ctx.fillRect(sx - 1, sy - 20, 2, 6);
    ctx.strokeStyle = '#3b3f45'; ctx.lineWidth = 1; const [gx, gy] = P(x, y, zt + 9); ctx.beginPath(); ctx.ellipse(gx, gy, 0.62 * 44.3, 0.31 * 44.3, 0, 0, Math.PI); ctx.stroke();
    const [lx, ly] = P(x, y, zt + 10);
    if (n && live(I)) {
      const a = t * 0.9, ex = Math.cos(a) * 260, ey = Math.sin(a) * 130;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createLinearGradient(lx, ly, lx + ex, ly + ey); gr.addColorStop(0, 'rgba(255,240,180,0.55)'); gr.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + ex - ey * 0.12, ly + ey + ex * 0.06); ctx.lineTo(lx + ex + ey * 0.12, ly + ey - ex * 0.06); ctx.closePath(); ctx.fill(); ctx.restore();
      glow(ctx, lx, ly, 40, '255,236,160', 0.7);
    } else { ctx.fillStyle = n ? '#fff2b0' : '#f6d55a'; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, 7); ctx.fill(); }
  } });

  /** 🛶 카약 (모래 위 · float 면 물 위에서 출렁) */
  C.prop('ob_kayak', { dynamic: true, draw(ctx, f, t) {
    const { x, y } = f, c = f.color || '#f2c230', ay = f.axis === 'y', L = 1.25, Wd = 0.27;
    const bob = f.float ? Math.sin(t * 1.8 + x * 3) * 1.4 : 0, z = (f.float ? 1 : 2) + bob;
    if (f.float) ellipseFloor(ctx, x, y, ay ? 0.5 : 1.5, ay ? 1.5 : 0.5, 0, 'rgba(255,255,255,0.35)');
    else shadow(ctx, x + 0.1, y + 0.1, ay ? 0.4 : 1.3, ay ? 1.3 : 0.4);
    const hullP = (q, k) => { if (ay) { q.moveTo(x, y - L); q.quadraticCurveTo(x + Wd * 2 * k, y, x, y + L); q.quadraticCurveTo(x - Wd * 2 * k, y, x, y - L); } else { q.moveTo(x - L, y); q.quadraticCurveTo(x, y - Wd * 2 * k, x + L, y); q.quadraticCurveTo(x, y + Wd * 2 * k, x - L, y); } };
    ctx.save(); ctx.translate(0, -z + 4); TS(ctx, (q) => { q.beginPath(); hullP(q, 1); q.fillStyle = shade(c, -0.3); q.fill(); }); ctx.restore();
    ctx.save(); ctx.translate(0, -z); TS(ctx, (q) => {
      q.beginPath(); hullP(q, 1); q.fillStyle = c; q.fill(); q.strokeStyle = shade(c, -0.35); q.lineWidth = 0.04; q.stroke();
      q.beginPath(); q.ellipse(x, y, ay ? 0.16 : 0.32, ay ? 0.32 : 0.16, 0, 0, 7); q.fillStyle = '#2b2f36'; q.fill();
      q.strokeStyle = '#f4f6f8'; q.lineWidth = 0.05; q.beginPath(); if (ay) { q.moveTo(x, y - L * 0.85); q.lineTo(x, y - 0.4); q.moveTo(x, y + 0.4); q.lineTo(x, y + L * 0.85); } else { q.moveTo(x - L * 0.85, y); q.lineTo(x - 0.4, y); q.moveTo(x + 0.4, y); q.lineTo(x + L * 0.85, y); } q.stroke();
    }); ctx.restore();
    const [a1, b1] = P(x + (ay ? -0.7 : -0.25), y + (ay ? 0.25 : 0.7), z + 2), [a2, b2] = P(x + (ay ? 0.7 : 0.25), y + (ay ? -0.25 : -0.7), z + 2);
    ctx.strokeStyle = '#3b3f45'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2); ctx.stroke();
    ctx.fillStyle = '#4e7cf6'; for (const [px, py] of [[a1, b1], [a2, b2]]) { ctx.beginPath(); ctx.ellipse(px, py, 3, 1.6, 0.4, 0, 7); ctx.fill(); }
  } });

  /** ⛵ 배 (x 축 방향, 길이 L): taxi 수상택시 · fish 어선 · cargo 화물선 — 물 위에서 출렁 */
  function hull(ctx, x, y, L, Wd, hz, z0, col, deck) {
    const b = Math.min(1.3, L * 0.3);
    const top = [P(x, y, z0 + hz), P(x + L - b, y, z0 + hz), P(x + L, y + Wd / 2, z0 + hz + 3), P(x + L - b, y + Wd, z0 + hz), P(x, y + Wd, z0 + hz)];
    poly(ctx, [P(x + 0.15, y + Wd - 0.1, z0), P(x + L - b, y + Wd - 0.15, z0), P(x + L - 0.2, y + Wd / 2, z0 + 2), P(x + L, y + Wd / 2, z0 + hz + 3), P(x + L - b, y + Wd, z0 + hz), P(x, y + Wd, z0 + hz)], col, 'rgba(0,0,0,0.25)', 0.7);
    poly(ctx, [P(x + L - b, y, z0 + hz), P(x + L, y + Wd / 2, z0 + hz + 3), P(x + L - 0.2, y + Wd / 2, z0 + 2), P(x + L - b, y + 0.15, z0)], shade(col, -0.22), 'rgba(0,0,0,0.25)', 0.7);
    poly(ctx, top, deck); poly(ctx, top, null, shade(col, -0.4), 0.9);
    return top;
  }
  C.prop('ob_boat', {
    dynamic: true,
    depth: (f) => f.x + (f.L || 3) / 2 + f.y + (f.Wd || 1.3) / 2,
    draw(ctx, f, t, I) {
      const { x, y } = f, L = f.L || 3, Wd = f.Wd || 1.3, kind = f.kind || 'fish';
      const z0 = Math.sin(t * 1.4 + x) * 1.3;
      ellipseFloor(ctx, x + L / 2, y + Wd / 2, L / 2 + 0.4, Wd / 2 + 0.35, 0, 'rgba(255,255,255,0.3)');
      ellipseFloor(ctx, x + L / 2 + 0.1, y + Wd / 2 + 0.1, L / 2, Wd / 2, 0, 'rgba(20,60,90,0.25)');
      if (kind === 'taxi') {
        hull(ctx, x, y, L, Wd, 10, z0, '#f4f6f8', '#e1e5e9');
        poly(ctx, [P(x, y + Wd, z0 + 6), P(x + L - 1.3, y + Wd, z0 + 6), P(x + L - 0.6, y + Wd * 0.75, z0 + 8), P(x + L - 0.6, y + Wd * 0.75, z0 + 6.5), P(x + L - 1.3, y + Wd, z0 + 4.5), P(x, y + Wd, z0 + 4.5)], '#f2c230');
        box(ctx, x + 0.4, y + 0.2, z0 + 10, L - 1.6, Wd - 0.4, 16, '#f4f6f8', '#e9edf1', '#d2d8de', 'rgba(0,0,0,0.15)');
        onPlaneY(ctx, x + 0.5, y + Wd - 0.2, z0 + 23, (g) => { g.fillStyle = '#2f5d8a'; g.fillRect(0, 2, (L - 1.8) * 32, 7); g.fillStyle = '#f2c230'; g.font = `bold 5px ${FONT}`; g.fillText('수상택시', 4, 14.5); });
        box(ctx, x + 0.3, y + 0.1, z0 + 26, L - 1.4, Wd - 0.2, 2, '#f2c230', '#e0a92a', '#c99620');
      } else if (kind === 'cargo') {
        hull(ctx, x, y, L, Wd, 18, z0, '#c43d32', '#7d858c');
        poly(ctx, [P(x, y + Wd, z0 + 6), P(x + L - 1.3, y + Wd, z0 + 6), P(x + L - 1.3, y + Wd, z0), P(x, y + Wd, z0)], '#2b2f36');
        const cols = ['#e5534b', '#4e7cf6', '#3fb27f', '#e9a23b', '#a67be0', '#1f9fb4'];
        for (let i = 0; i < Math.floor((L - 3.2) / 1.05); i++) for (let s = 0; s < 2; s++) box(ctx, x + 2.3 + i * 1.05, y + 0.2 + (Wd - 0.4) / 2 * (s % 2), z0 + 18 + (i % 3 === 1 ? 0 : 0), 1, (Wd - 0.4) / 2, 12, shade(cols[(i * 2 + s) % 6], 0.1), cols[(i * 2 + s) % 6], shade(cols[(i * 2 + s) % 6], -0.2), 'rgba(0,0,0,0.2)');
        box(ctx, x + 0.2, y + 0.25, z0 + 18, 1.6, Wd - 0.5, 30, '#f4f6f8', '#e1e5e9', '#d2d8de', 'rgba(0,0,0,0.2)');
        onPlaneY(ctx, x + 0.25, y + Wd - 0.25, z0 + 44, (g) => { g.fillStyle = '#2f5d8a'; g.fillRect(2, 2, 46, 5); });
        sbox(ctx, x + 0.9, y + 0.6, z0 + 48, 0.3, 0.3, 14, '#e5534b');
      } else {
        hull(ctx, x, y, L, Wd, 11, z0, f.color || '#3f6fb3', '#c9a26a');
        poly(ctx, [P(x, y + Wd, z0 + 9), P(x + L - 1.3, y + Wd, z0 + 9), P(x + L - 1.3, y + Wd, z0 + 7.5), P(x, y + Wd, z0 + 7.5)], '#ffffff');
        box(ctx, x + 0.25, y + 0.25, z0 + 11, 1, Wd - 0.5, 18, '#f4f6f8', '#e9edf1', '#d2d8de', 'rgba(0,0,0,0.18)');
        onPlaneY(ctx, x + 0.3, y + Wd - 0.25, z0 + 25, (g) => { g.fillStyle = '#7fb6d6'; g.fillRect(2, 2, 24, 6); });
        box(ctx, x + 0.15, y + 0.15, z0 + 29, 1.2, Wd - 0.3, 2, '#e5534b', '#c9443d', '#b23a34');
        sbox(ctx, x + 2, y + Wd / 2 - 0.04, z0 + 11, 0.08, 0.08, 40, '#8a6247');
        const [mx, my] = P(x + 2, y + Wd / 2, z0 + 50);
        ctx.strokeStyle = 'rgba(60,60,60,0.6)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(...P(x + L - 0.1, y + Wd / 2, z0 + 14)); ctx.moveTo(mx, my); ctx.lineTo(...P(x + 0.2, y + Wd / 2, z0 + 30)); ctx.stroke();
        for (let k = 0; k < 4; k++) { const [fx, fy] = P(x + 2 + (L - 2.1) * (k + 1) / 5, y + Wd / 2, z0 + 50 - (36 * (k + 1) / 5)); ctx.fillStyle = ['#e5534b', '#f2c230', '#3fb27f', '#4e7cf6'][k]; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 4, fy + 1); ctx.lineTo(fx, fy + 4); ctx.fill(); }
        const [nx, ny] = P(x + L - 1.1, y + Wd / 2, z0 + 11); ctx.fillStyle = '#3f8a4a'; ctx.beginPath(); ctx.ellipse(nx, ny - 3, 7, 4, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 0.5; for (let k = -5; k <= 5; k += 2.5) { ctx.beginPath(); ctx.moveTo(nx + k, ny - 6); ctx.lineTo(nx + k * 0.8, ny); ctx.stroke(); }
        for (const k of [0.6, 1.4]) dot(ctx, x + k, y + Wd, z0 + 6, 2.2, '#ff7a3a');
        if (isNight(I)) { const [lx, ly] = P(x + 2, y + Wd / 2, z0 + 51); glow(ctx, lx, ly, 22, '255,230,150', 0.7); }
      }
    },
  });
  /** 🐦 갈매기 무리 (빙빙 돈다) */
  C.prop('ob_gulls', { dynamic: true, depth: () => 1e5 - 1, draw(ctx, f, t, I) {
    if (!live(I)) return;
    const n = f.n || 4, R = f.r || 3;
    for (let i = 0; i < n; i++) {
      const a = t * (0.35 + i * 0.05) + i * 1.7, [sx, sy] = P(f.x + Math.cos(a) * R, f.y + Math.sin(a) * R * 0.7, 90 + i * 9 + Math.sin(t + i) * 5);
      const fl = Math.sin(t * 7 + i * 2) * 3, dir = Math.sin(a) > 0 ? -1 : 1;
      ctx.strokeStyle = '#f8f8f8'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx - 7, sy - 2 + fl); ctx.quadraticCurveTo(sx - 3, sy - 5, sx, sy); ctx.quadraticCurveTo(sx + 3, sy - 5, sx + 7, sy - 2 + fl); ctx.stroke();
      ctx.strokeStyle = '#8a8f96'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = '#f2c230'; ctx.fillRect(sx + 1.5 * dir, sy - 0.5, 2 * dir, 1);
    }
  } });

  // ================================================================ 🏝️ 열대 섬 소품
  /** 🍹 티키 바 (초가 지붕 · 대나무 카운터) — 폭 w, 깊이 2 */
  C.prop('ob_tikiBar', { slice: 2, draw(ctx, f, t, I) {
    const { x, y, w } = f, n = isNight(I);
    shadow(ctx, x + w / 2 + 0.3, y + 1.2, w / 2 + 0.6, 1.5, 0.2);
    box(ctx, x + 0.2, y + 0.02, 0, w - 0.4, 0.35, 30, '#a8814f', '#8a6638', '#7a5a30');
    for (let i = 0; i < (w - 0.6) * 3; i++) { const bx = x + 0.35 + i / 3; cylinder(ctx, bx, y + 0.2, 30, 0.05, 8 + (i % 3) * 2, '#fff', ['#3fb27f', '#e5534b', '#f2c230', '#7ab8f5', '#a67be0'][i % 5]); }
    for (const px of [x + 0.05, x + w - 0.15]) sbox(ctx, px, y + 0.05, 0, 0.12, 0.12, 64, '#b8955f');
    box(ctx, x, y + 1.05, 0, w, 0.55, 24, '#c9a26a', '#b88a4f', '#9c7440', 'rgba(0,0,0,0.2)');
    onPlaneY(ctx, x, y + 1.6, 24, (g) => { for (let i = 0; i < w * 32; i += 6) { g.fillStyle = (i / 6) % 2 ? '#d9b77a' : '#c49a5e'; g.fillRect(i, 0, 5.4, 24); g.fillStyle = 'rgba(90,60,30,0.35)'; g.fillRect(i, 7 + (i % 12), 5.4, 1.2); } g.fillStyle = '#7a4a2a'; g.font = `bold 8px ${FONT}`; g.fillText('🗿', w * 16 - 5, 16); });
    box(ctx, x - 0.1, y + 0.98, 24, w + 0.2, 0.72, 3, '#8a5a32', '#7a4a2a', '#6b3f22');
    for (let i = 0; i < w - 0.6; i += 1.1) { const cx = x + 0.6 + i; cylinder(ctx, cx, y + 1.3, 27, 0.13, 6, '#f6e7c4', '#7a5230'); const [sx, sy] = P(cx, y + 1.3, 33); ctx.strokeStyle = ['#e5534b', '#f2c230', '#3fb27f'][Math.round(i) % 3]; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 3, sy - 7); ctx.stroke(); }
    for (const px of [x + 0.05, x + w - 0.15]) sbox(ctx, px, y + 1.75, 0, 0.12, 0.12, 64, '#b8955f');
    // 초가 지붕
    const E = 64, Rz = 84, rx0 = x - 0.45, rx1 = x + w + 0.45, ry0 = y - 0.35, ry1 = y + 2.25, ym = y + 0.95;
    poly(ctx, [P(rx0, ry0, E), P(rx1, ry0, E), P(rx1 - 1, ym, Rz), P(rx0 + 1, ym, Rz)], '#c9a55e');
    poly(ctx, [P(rx1, ry0, E), P(rx1, ry1, E), P(rx1 - 1, ym, Rz)], '#c49a50', 'rgba(0,0,0,0.15)');
    poly(ctx, [P(rx0, ry1, E), P(rx1, ry1, E), P(rx1 - 1, ym, Rz), P(rx0 + 1, ym, Rz)], '#e3c27a', 'rgba(0,0,0,0.15)');
    ctx.strokeStyle = 'rgba(140,100,40,0.45)'; ctx.lineWidth = 0.8;
    for (let u = 0; u <= 1; u += 0.06) { const [a, b] = P(rx0 + 1 + (rx1 - rx0 - 2) * u, ym, Rz), [c, d] = P(rx0 + (rx1 - rx0) * u, ry1, E); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
    ctx.fillStyle = '#d4b066'; for (let u = 0; u < rx1 - rx0; u += 0.18) { const [a, b] = P(rx0 + u, ry1, E); ctx.beginPath(); ctx.moveTo(a - 3, b); ctx.lineTo(a + 3, b); ctx.lineTo(a + 0.5, b + 6 + (Math.round(u * 9) % 3) * 1.5); ctx.fill(); }
    onPlaneY(ctx, x + w / 2 - 0.9, ry1, E - 4, (g) => signBoard(g, 58, 11, '#2b2622', '#f6c445', '🍹 TIKI BAR', 7));
    if (n) { const [gx, gy] = P(x + w / 2, y + 1.3, 40); glow(ctx, gx, gy, 70, '255,190,110', 0.4); }
  } });

  // ================================================================ 🏝️ 열대 섬
  C.outdoor({
    id: 'island', icon: '🏝️', name: '열대 섬', desc: '바다로 둘러싸인 섬 · 야자수 · 해먹 · 티키 바 · 카약 · 나무 부두 · 등대',
    size: (B) => ({ W: B.W + 40, H: B.H + 34 }),
    lot(S, OUT, B, k) {
      OUT.ground.base = { color: '#a8d98a', tufts: ['#8cc56f', '#c2e6a8'], edge: '#2f7fae', edge2: '#2a73a0' };
      const TX = 8, TY = 7;
      k.place(B, TX, TY);
      const W = k.W, H = k.H, F = k.front, R = k.right, DX = Math.floor(TX + B.doorX);
      const land = { x0: 3.5, y0: 3.5, x1: W - 3.5, y1: H - 5, r: 7 };
      k.G.decals.push({ type: 'ob_sea', x: 0, y: 0, w: W, d: H, land, beach: 2.6, seed: 7 });
      for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) if (!inLand(i + 0.5, j + 0.5, land)) k.water(i, j, 1, 1);
      // ⚓ 나무 부두 → 섬 출입구 (배 타고 오가는 곳)
      const px = Math.min(W - 12, DX + 9), py0 = Math.floor(land.y1) - 1;
      k.G.decals.push({ type: 'ob_pier', x: px, y: py0 + 0.3, w: 2, d: H - py0 - 0.3 });
      OUT.bridges = [{ x: px, y: py0, w: 2, d: H - py0 }];
      k.solid(px, py0, 2, H - py0); k.mark(px, py0, 2, H - py0, 4);
      k.add({ type: 'ob_boat', x: px + 2.4, y: H - 3.3, L: 3.2, kind: 'taxi' });
      k.add({ type: 'ob_kayak', x: px - 3, y: H - 2.2, float: true, color: '#e5534b' });
      k.add({ type: 'ob_kayak', x: px + 6, y: H - 1.6, float: true, color: '#3fb27f' });
      k.sign(px - 3.6, py0 - 0.4, '⚓ 나무 부두', '#7a5540');
      k.npc('선장', { x: px + 1.5, y: H - 4.5, face: '+x' }, { hat: 'cap', accent: '#2f5d8a', say: '🚤 섬 일주 출발~', patrol: [{ x: px + 1.5, y: H - 4.5, face: '+x' }, { x: px + 0.5, y: py0 - 1, face: '+y' }] });
      // 길: 정문 → 부두
      const path = { color: '#efdfb4', edge: '#d8c38e', dots: true };
      k.curve([[DX + 0.5, F + 0.5], [DX + 0.5, F + 4], [(DX + px) / 2 + 1, (F + py0) / 2 + 1], [px + 1, py0 - 2], [px + 1, py0 + 0.5]], 1.6, path);
      // 🍹 티키 바 (건물 오른쪽 위)
      const tx = R + 4, ty = TY + 1;
      k.add({ type: 'ob_tikiBar', x: tx, y: ty, w: 6 }, tx, ty + 1, 6, 1);
      k.solid(tx, ty, 1, 1); k.solid(tx + 5, ty, 1, 1);
      k.npc('바텐더', { x: tx + 3, y: ty + 0.6, face: '+y' }, { anim: 'type', hat: 'bucket', accent: '#f2a7c3', say: '🍹 망고 스무디 한 잔!' });
      for (let i = 0; i < 5; i++) { const sx = tx + 0.7 + i * 1.15; k.add({ type: 'barStool', x: sx, y: ty + 2.4 }); k.rest({ x: sx, y: ty + 2.4, face: '-y', pose: 'sit', carry: 'mug' }, '티키 바'); }
      k.sign(tx, ty + 3.4, '🍹 티키 바', '#c47f22');
      cafeSet(k, tx + 1, ty + 6, '#f2a7c3', '티키 바 테이블');
      cafeSet(k, tx + 5, ty + 6, '#3fb27f', '티키 바 테이블');
      if (k.free(tx + 8, ty + 6, 3, 1)) cafeSet(k, tx + 9, ty + 6, '#f6c445', '티키 바 테이블');
      // 🗼 등대 (오른쪽 위 곶)
      const lx = Math.floor(land.x1 - 3), ly = Math.floor(land.y0 + 2);
      k.add({ type: 'ob_lighthouse', x: lx + 0.5, y: ly + 0.5 }, lx - 1, ly - 1, 3, 3);
      k.sign(lx - 2, ly + 2.6, '🗼 등대', '#c43d32');
      k.npc('등대지기', { x: lx - 1.5, y: ly + 2.5, face: '+x' }, { hat: 'beanie', accent: '#e5534b', say: '🔭 오늘 바다 맑음' });
      // 🏖️ 선베드 · 파라솔 (앞쪽 해변)
      const cy0 = Math.floor(land.y1 - 4.2);
      let nChair = 0;
      for (let x = 6; x < W - 6 && nChair < 8; x += 2) {
        if (Math.abs(x - px) < 4 || !k.free(x, cy0, 1, 3)) continue;
        const c = ['#f2a7c3', '#4e9cf6', '#f6c445', '#3fb27f'][nChair % 4];
        k.add({ type: 'deckChair', x: x + 0.5, y: cy0 + 0.2, color: c }, x, cy0, 1, 1);
        k.rest({ x: x + 0.5, y: cy0 + 0.75, face: '+y', pose: 'sofa', carry: nChair % 2 ? 'mug' : null, approach: [x, cy0 + 2] }, '해변 선베드');
        if (nChair % 2 === 0) k.add({ type: 'parasol', x: x + 1.5, y: cy0 + 1.2, color: c });
        nChair++;
      }
      k.sign(6, cy0 + 2.6, '🏖️ 해변 선베드', '#1f9fb4');
      // 🛶 카약 대여 (해변)
      for (let q = 0; q < 3; q++) { const kx = px - 4 - q * 1.6, ky = land.y1 - 1.4; if (kx > 4 && k.free(Math.floor(kx), Math.floor(ky))) k.add({ type: 'ob_kayak', x: kx + 0.5, y: ky, axis: 'y', color: ['#f2c230', '#e5534b', '#4e7cf6'][q] }, Math.floor(kx), Math.floor(ky) - 1, 1, 2); }
      k.sign(px - 8.5, land.y1 - 0.2, '🛶 카약 대여', '#e5534b');
      k.npc('구조대원', { x: 8.5, y: land.y1 - 1.5, face: '+y' }, { hat: 'cap', accent: '#e5534b', say: '🛟 안전 수영!', patrol: [{ x: 8.5, y: land.y1 - 1.5, face: '+y' }, { x: px - 2.5, y: land.y1 - 1.5, face: '+y' }] });
      // 🌴 해먹 · 야자수 · 피크닉
      let hm = 0;
      k.placeIn(R + 3, ty + 9, Math.max(4, land.x1 - R - 7), Math.max(4, land.y1 - ty - 16), 5, 2, (x, y) => {
        k.add({ type: 'ob_palm', x: x + 0.5, y: y + 0.5, size: 1, seed: 3 }, x, y); k.add({ type: 'ob_palm', x: x + 4.5, y: y + 0.5, size: 1.05, seed: 4 }, x + 4, y);
        k.add({ type: 'hammock', x: x + 1, y: y }, x + 1, y, 3, 1); hm++;
      });
      k.sign(R + 3, ty + 8.6, '🌺 해먹 그늘', '#3f8a45');
      picnicMats(S, OUT, k, [[4, F + 2, '#e5534b'], [Math.max(8, DX - 6), F + 5, '#4e7cf6']], '섬 피크닉');
      S.park.wander.push({ x: tx + 3, y: ty + 4.2, face: '-y', food: 'icecream' }, { x: px - 1, y: land.y1 - 2, face: '+y' }, { x: R + 2, y: F + 3, face: '+y' });
      const r = AIO.rand(19);
      for (let q = 0; q < 60; q++) {
        const a = r() * 6.28, rr = 0.6 + r() * 0.42, x = Math.floor((land.x0 + land.x1) / 2 + Math.cos(a) * (land.x1 - land.x0) / 2 * rr), y = Math.floor((land.y0 + land.y1) / 2 + Math.sin(a) * (land.y1 - land.y0) / 2 * rr);
        if (inLand(x + 0.5, y + 0.5, land, -1) && k.free(x - 1, y - 1, 3, 3)) k.add({ type: 'ob_palm', x: x + 0.5, y: y + 0.5, size: 0.85 + r() * 0.35, seed: q }, x, y);
      }
      scatter(k, 23, 5, 5, W - 5, H - 6, Math.round(W * H / 140), (x, y, rr) => { if (!inLand(x + 0.5, y + 0.5, land, -1.5)) return false; k.add({ type: 'flowerBush', x: x + 0.5, y: y + 0.5, size: 0.9, seed: x * 3 + y, color: ['#f07a8a', '#ff9a5a', '#f6c445'][Math.floor(rr() * 3)] }, x, y); });
      S.pets = [{ kind: 'dog', color: '#d9a066' }, { kind: 'cat', color: '#f4ead8' }, { kind: 'cat', color: '#2b2b2b' }];
      S.door = { lv: OUT.idx, x: px + 1, y: H - 1.2, face: '-y' };
    },
  });
  // ================================================================ 🌉 한강공원 소품
  /** 움직이는 소품: x 를 시간 함수로 (화면 밖 판정 · 정렬이 실제 위치를 따라감) */
  const moverX = (f, fn) => { Object.defineProperty(f, 'x', { get: fn, enumerable: true, configurable: true }); return f; };
  /** 🏪 편의점 (흰 박스 · 초록/파랑 띠 · 유리 앞면 · 밤엔 환함) 4×2 */
  C.prop('ob_cvs', { slice: 2, draw(ctx, f, t, I) {
    const { x, y } = f, w = 4, d = 2, H = 46, n = isNight(I);
    shadow(ctx, x + w / 2 + 0.3, y + d / 2 + 0.3, w / 2 + 0.4, 1.4, 0.18);
    box(ctx, x, y, 0, w, d, H, '#f4f6f8', '#e9edf1', '#d2d8de', 'rgba(0,0,0,0.18)');
    onPlaneY(ctx, x, y + d, H, (g) => {
      const Wl = w * 32;
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, Wl, 13); g.fillStyle = '#2f9e5f'; g.fillRect(0, 0, Wl, 3); g.fillStyle = '#4e7cf6'; g.fillRect(0, 3, Wl, 2);
      g.fillStyle = '#2f5d8a'; g.font = `bold 6.5px ${FONT}`; g.fillText('🏪 편의점 24시', 6, 11.5);
      g.fillStyle = n ? '#fff3c4' : '#cfe6f2'; g.fillRect(3, 15, Wl - 30, 29);
      for (let r = 0; r < 3; r++) { g.fillStyle = 'rgba(120,120,120,0.35)'; g.fillRect(5, 22 + r * 8, Wl - 34, 1.2); for (let i = 0; i < 14; i++) { g.fillStyle = ['#e5534b', '#f2c230', '#3fb27f', '#4e7cf6', '#f2a7c3'][(i + r * 2) % 5]; g.fillRect(6 + i * 6.6, 17 + r * 8, 4, 4.6); } }
      g.fillStyle = n ? '#fff8dc' : '#b9dcef'; g.fillRect(Wl - 24, 15, 20, 31); g.strokeStyle = '#8d959c'; g.lineWidth = 1; g.strokeRect(Wl - 24, 15, 20, 31); g.fillStyle = '#8d959c'; g.fillRect(Wl - 15, 28, 2, 6);
      g.fillStyle = '#e5534b'; g.font = `bold 4px ${FONT}`; g.fillText('1+1', Wl - 22, 20);
    });
    onPlaneX(ctx, x + w, y + d - 0.2, H - 8, (g) => { g.fillStyle = '#e5534b'; roundRect(g, 4, 2, 44, 22, 3); g.fill(); g.fillStyle = '#fff'; g.font = `bold 8px ${FONT}`; g.fillText('🍜 한강라면', 7, 17); });
    if (n) { const [gx, gy] = P(x + w / 2, y + d + 0.4, 10); glow(ctx, gx, gy, 70, '255,240,190', 0.35); }
  } });
  /** 🍜 즉석 라면 조리기 (김 모락) */
  C.prop('ob_ramen', { draw(ctx, f, t) {
    const { x, y } = f;
    box(ctx, x - 0.4, y - 0.3, 0, 0.8, 0.6, 20, '#d9dde1', '#c4c9cd', '#b5bbc0', 'rgba(0,0,0,0.18)');
    for (let i = 0; i < 2; i++) { cylinder(ctx, x - 0.18 + i * 0.36, y, 20, 0.14, 4, '#e5534b', '#c9443d'); const [sx, sy] = P(x - 0.18 + i * 0.36, y, 26); ctx.strokeStyle = 'rgba(240,240,240,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); const o = Math.sin(t * 2 + i) * 2.5; ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + o, sy - 8, sx - o, sy - 16); ctx.stroke(); }
    onPlaneY(ctx, x - 0.4, y + 0.3, 16, (g) => { g.fillStyle = '#2b2622'; g.font = `bold 5px ${FONT}`; g.fillText('🍜 라면', 2, 7); });
  } });
  /** 🍗 돗자리 치킨 (상자 + 캔) */
  C.prop('ob_chicken', { draw(ctx, f) {
    const { x, y } = f;
    box(ctx, x - 0.3, y - 0.22, 0, 0.6, 0.44, 5, '#f6e7c4', '#e9a23b', '#c47f22');
    for (let k = 0; k < 6; k++) dot(ctx, x - 0.18 + (k % 3) * 0.18, y - 0.1 + Math.floor(k / 3) * 0.2, 6, 2.6, k % 2 ? '#c9782f' : '#d98a3a');
    poly(ctx, [P(x - 0.3, y - 0.22, 5), P(x + 0.3, y - 0.22, 5), P(x + 0.3, y - 0.42, 14), P(x - 0.3, y - 0.42, 14)], '#e5534b');
    for (const [dx, c] of [[0.48, '#4e7cf6'], [0.58, '#3fb27f'], [-0.5, '#e5534b']]) cylinder(ctx, x + dx, y + 0.2, 0, 0.06, 6, '#d9dde1', c);
  } });
  /** 💪 공원 운동기구: walker(허공 걷기) · twist(허리 돌리기) · bars(철봉) */
  C.prop('ob_gym', { draw(ctx, f, t) {
    const { x, y } = f, kind = f.kind || 'walker', Y = '#f2c230', G = '#3fb27f';
    shadow(ctx, x, y, 0.5, 0.4);
    if (kind === 'bars') { for (const dx of [-0.45, 0.45]) sbox(ctx, x + dx - 0.04, y - 0.04, 0, 0.08, 0.08, 52, G); const [a, b] = P(x - 0.45, y, 52), [c, d] = P(x + 0.45, y, 52); ctx.strokeStyle = '#c4cbd2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); return; }
    if (kind === 'twist') { cylinder(ctx, x, y, 0, 0.12, 30, G, shade(G, -0.15)); const a = Math.sin(t * 1.5) * 0.5; cylinder(ctx, x + Math.cos(a) * 0.05, y, 4, 0.32, 3, Y, shade(Y, -0.2)); const [a1, b1] = P(x - 0.3, y, 34), [a2, b2] = P(x + 0.3, y, 34); ctx.strokeStyle = G; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2); ctx.stroke(); return; }
    for (const dy of [-0.35, 0.35]) { const [a, b] = P(x - 0.4, y + dy, 0), [c, d] = P(x, y + dy, 46), [e, g2] = P(x + 0.4, y + dy, 0); ctx.strokeStyle = Y; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e, g2); ctx.stroke(); }
    const [tx, ty] = P(x, y - 0.35, 46), [ux, uy] = P(x, y + 0.35, 46); ctx.strokeStyle = G; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(ux, uy); ctx.stroke();
    for (const [dy, ph] of [[-0.15, 0], [0.15, Math.PI]]) { const sw = Math.sin(t * 2 + ph) * 0.25, [hx, hy] = P(x, y + dy, 44), [fx, fy] = P(x + sw, y + dy, 8); ctx.strokeStyle = '#8d959c'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(fx, fy); ctx.stroke(); ctx.fillStyle = '#3b3f45'; ctx.fillRect(fx - 4, fy - 1, 8, 2.4); }
  } });
  /** 🚴 자전거 타는 사람 (자전거 도로를 따라 달림 · x 는 시간 함수) */
  C.prop('ob_cyclist', { dynamic: true, depth: (f) => f.x + f.y + 0.2, draw(ctx, f, t, I) {
    if (!live(I)) return;
    const x = f.x, y = f.y, dir = f.dir || 1, L = f.x1 - f.x0, u = (x - f.x0) / L;
    const a = Math.min(1, u * 8, (1 - u) * 8); if (a <= 0.02) return;
    const [sx, sy] = P(x, y, 0), ped = now() * 9 + (f.seed || 0);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(sx, sy); ctx.scale(dir, 1);
    ctx.fillStyle = 'rgba(40,30,20,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 4, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 1.6; for (const wx of [-8, 8]) { ctx.beginPath(); ctx.ellipse(wx, -6, 6, 6, 0, 0, 7); ctx.stroke(); }
    ctx.strokeStyle = f.bike || '#e5534b'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-2, -15); ctx.lineTo(6, -15); ctx.lineTo(8, -6); ctx.moveTo(-2, -15); ctx.lineTo(0, -6); ctx.lineTo(-8, -6); ctx.moveTo(6, -15); ctx.lineTo(7, -19); ctx.stroke();
    const k1 = Math.cos(ped) * 3, k2 = Math.sin(ped) * 3;
    ctx.strokeStyle = '#3b4a5c'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-2, -18); ctx.lineTo(1 + k1, -11 + k2 * 0.5); ctx.lineTo(0 + k1, -6 + k2); ctx.stroke();
    ctx.fillStyle = f.color || '#4e7cf6'; roundRect(ctx, -5, -30, 8, 13, 3); ctx.fill();
    ctx.strokeStyle = '#f1d3b5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(1, -26); ctx.lineTo(7, -19); ctx.stroke();
    ctx.fillStyle = '#f1d3b5'; ctx.beginPath(); ctx.arc(1, -34, 5, 0, 7); ctx.fill();
    ctx.fillStyle = f.helmet || '#f2c230'; ctx.beginPath(); ctx.arc(1, -35, 5.4, Math.PI, 0); ctx.fill(); ctx.fillRect(-4.4, -35.5, 10.8, 1.6);
    ctx.fillStyle = '#2b2622'; ctx.fillRect(3.5, -34, 1.2, 1.2);
    ctx.restore();
  } });
  /** 🌉 한강 다리 (y 방향으로 강을 건넘 · 아치 · 교각 · 달리는 차) */
  C.prop('ob_bigBridge', { dynamic: true, depth: (f) => f.x + f.w + f.y0 + f.d, draw(ctx, f, t, I) {
    const { x, w, d } = f, y = f.y0, Z = 56, ramp = f.ramp || 6, yr = y + ramp, y1 = y + d;
    const zAt = (yy) => (yy < yr ? Z * Math.max(0, yy - y) / ramp : Z);
    for (const py of f.piers || []) { box(ctx, x + 0.5, py, 0, w - 1, 0.9, Z - 6, '#d2cdc3', '#bdb8ae', '#a9a49a', 'rgba(0,0,0,0.2)'); box(ctx, x + 0.2, py - 0.1, Z - 9, w - 0.4, 1.1, 3, '#c4bfb5', '#aaa59b', '#97928a'); }
    const ya = f.archA ?? yr + 1, yb = f.archB ?? y1 - 0.5, AH = 44;
    const arch = (ax, col, lw) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
      for (let k = 0; k <= 24; k++) { const yy = ya + (yb - ya) * k / 24, [px, py] = P(ax, yy, Z + 6 + AH * Math.sin(Math.PI * k / 24)); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke(); ctx.lineWidth = 0.9;
      for (let yy = ya + 1; yy < yb; yy += 1) { const [px, py] = P(ax, yy, Z + 6 + AH * Math.sin(Math.PI * (yy - ya) / (yb - ya))), [qx, qy] = P(ax, yy, Z + 5); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke(); }
    };
    arch(x + 0.1, '#3f7fc4', 3.4);
    const st = 0.5;
    for (let yy = y; yy < y1 - 1e-6; yy += st) {
      const yb2 = Math.min(y1, yy + st), z0 = zAt(yy), z1 = zAt(yb2);
      poly(ctx, [P(x + w, yy, z0 - 7), P(x + w, yb2, z1 - 7), P(x + w, yb2, z1), P(x + w, yy, z0)], '#9aa0a7');
      poly(ctx, [P(x, yy, z0), P(x + w, yy, z0), P(x + w, yb2, z1), P(x, yb2, z1)], '#6f747b');
      if (Math.round(yy * 2) % 3 === 0) poly(ctx, [P(x + w / 2 - 0.05, yy, z0 + 0.1), P(x + w / 2 + 0.05, yy, z0 + 0.1), P(x + w / 2 + 0.05, yb2, z1 + 0.1), P(x + w / 2 - 0.05, yb2, z1 + 0.1)], '#f2c230');
    }
    poly(ctx, [P(x, y1, Z), P(x + w, y1, Z), P(x + w, y1, Z - 7), P(x, y1, Z - 7)], '#b5bac0');
    if (live(I)) for (let q = 0; q < 4; q++) {
      const dirn = q % 2 ? -1 : 1, s = ((now() * (1.4 + q * 0.3) + q * 7) % (d + 2)) - 1, yy = dirn > 0 ? y + s : y1 - s, cx = x + (dirn > 0 ? w * 0.68 : w * 0.3);
      if (yy < y || yy > y1 - 0.8) continue;
      const z = zAt(yy); const c = ['#e5534b', '#f4f6f8', '#4e7cf6', '#f2c230'][q];
      box(ctx, cx - 0.35, yy, z, 0.7, 1.1, 7, shade(c, 0.1), c, shade(c, -0.2), 'rgba(0,0,0,0.25)');
      box(ctx, cx - 0.3, yy + 0.25, z + 7, 0.6, 0.55, 5, '#bfe0f0', '#9cc5dc', '#86b0c8');
    }
    for (const ax of [x + 0.05, x + w - 0.05]) { ctx.strokeStyle = '#d9dde1'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = 0; k <= 20; k++) { const yy = y + d * k / 20, [px, py] = P(ax, yy, zAt(yy) + 6); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
    arch(x + w - 0.1, '#4e8fd6', 3.6);
    const n = isNight(I);
    for (let yy = yr; yy < y1; yy += 3) { const [lx, ly] = P(x + w - 0.1, yy, Z + 22); sbox(ctx, x + w - 0.13, yy, Z, 0.06, 0.06, 22, '#8d959c'); if (n) glow(ctx, lx, ly, 26, '255,220,150', 0.6); ctx.fillStyle = n ? '#fff2c0' : '#e9edf1'; ctx.beginPath(); ctx.arc(lx, ly, 2, 0, 7); ctx.fill(); }
  } });

  // ================================================================ 🌉 한강공원
  C.outdoor({
    id: 'hanriver', icon: '🌉', name: '한강공원', desc: '한강 · 아치 다리 · 자전거 도로 · 편의점 라면 · 돗자리 치킨 · 수상택시 · 운동기구',
    size: (B) => ({ W: B.W + 36, H: B.H + 34 }),
    lot(S, OUT, B, k) {
      OUT.ground.base = { color: '#9fd38a', tufts: ['#85c070', '#bde3a6'], edge: '#3b86b8', edge2: '#8a7a5c' };
      const TX = 4, TY = 3;
      k.place(B, TX, TY);
      const W = k.W, H = k.H, F = k.front, R = k.right, DX = Math.floor(TX + B.doorX), RY = H - 9;
      // 🌊 한강 + 강변 계단 · 산책로 · 자전거 도로
      k.water(0, RY, W, H - RY, { type: 'ob_river', x: 0, y: RY, w: W, d: H - RY });
      k.G.decals.push({ type: 'ob_steps', x: 0, y: RY - 2, w: W, d: 2 }); k.mark(0, RY - 2, W, 2, 1);
      k.plaza(0, RY - 4, W, 2, '#e6dccb');
      k.G.decals.push({ type: 'ob_bikeLane', x: 0, y: RY - 6, w: W, d: 1.8 }); k.mark(0, RY - 6, W, 2, 1);
      for (const [dir, ly, c, h, sd] of [[1, RY - 5.55, '#4e7cf6', '#f2c230', 0], [-1, RY - 4.65, '#e5534b', '#ffffff', 5], [1, RY - 5.55, '#3fb27f', '#e5534b', 11]]) {
        const f = { type: 'ob_cyclist', y: ly, x0: 1, x1: W - 1, dir, color: c, helmet: h, seed: sd };
        const spd = 1.6 + sd * 0.05;
        moverX(f, () => { const p = ((now() * spd + sd * 9) % (f.x1 - f.x0)); return dir > 0 ? f.x0 + p : f.x1 - p; });
        k.K.add(f);
      }
      k.sign(1, RY - 6.4, '🚴 한강 자전거길', '#2f7d4f');
      for (let x = 2; x < W - 10; x += 7) { const lx = x + 3; if (lx < W - 10) lamp(k, OUT, lx, RY - 7); }
      // 🌉 아치 다리 (오른쪽 끝)
      const bx = W - 8;
      k.add({ type: 'ob_bigBridge', x: bx, y0: RY - 9, y: RY - 9 + (H - RY + 9) * 0.55, w: 4, d: H - RY + 9, ramp: 6, piers: [RY - 1.9, RY + 2.6, RY + 6.2], archA: RY - 1.5, archB: H - 0.3 });
      k.solid(bx, RY - 9, 4, 3); k.solid(bx, RY - 2, 4, 2);
      k.sign(bx - 6, RY - 7.6, '🌉 한강 아치교', '#3f7fc4');
      // 강 보는 계단 자리
      let ns = 0;
      for (let x = 2; x < bx - 2 && ns < 8; x += 3) { if (x >= W * 0.33 - 1 && x <= W * 0.33 + 3) continue; k.rest({ x: x + 0.5, y: RY - 0.7, face: '+y', pose: 'sit', carry: ns % 3 ? 'mug' : null }, '강변 계단'); ns++; }
      // 🚤 수상택시 선착장
      const PX = Math.floor(W * 0.33);
      k.G.decals.push({ type: 'ob_pier', x: PX, y: RY, w: 2, d: 3 }, { type: 'ob_pier', x: PX - 1, y: RY + 3, w: 5, d: 1.6 });
      OUT.bridges = [{ x: PX, y: RY, w: 2, d: 3 }, { x: PX - 1, y: RY + 3, w: 5, d: 2 }];
      k.add({ type: 'ob_boat', x: PX + 4.4, y: RY + 2.9, L: 3.4, kind: 'taxi' });
      k.sign(PX - 3.2, RY - 2.2, '🚤 수상택시 선착장', '#2f5d8a');
      k.npc('수상택시 선장', { x: PX + 1.5, y: RY + 3.8, face: '+x' }, { hat: 'cap', accent: '#f2c230', say: '🚤 여의도 5분!' });
      // 길: 정문 → 산책로
      k.curve([[DX + 0.5, F + 0.5], [DX + 0.5, F + 4], [DX + 0.5, RY - 6]], 1.6, { color: '#e6dccb', edge: '#cbbfa8' });
      // 🏪 편의점 + 파라솔 (라면 휴식)
      const cx = DX + 4, cy = F + 2;
      k.add({ type: 'ob_cvs', x: cx, y: cy }, cx, cy, 4, 2);
      k.add({ type: 'ob_ramen', x: cx + 4.6, y: cy + 1.4 }, cx + 4, cy + 1);
      for (let i = 0; i < 3; i++) { const tx = cx + i * 4; if (tx + 2 < W - 1 && k.free(tx - 1, cy + 4, 3, 1)) cafeSet(k, tx, cy + 4, ['#e5534b', '#4e7cf6', '#3fb27f'][i], '편의점 라면'); }
      k.sign(cx, cy + 5.6, '🏪 편의점 · 한강라면', '#2f9e5f');
      k.npc('편의점 알바', { x: cx + 2.5, y: cy + 2.6, face: '+y' }, { anim: 'idle', hat: 'cap', accent: '#2f9e5f', say: '🍜 라면 물 받아가세요' });
      // 🍗 돗자리 치킨 (길 왼쪽)
      const mats = [[1.5, F + 3, '#e5534b'], [1.5, F + 7.5, '#f2c230']];
      if (DX - 6 >= 5) mats.push([DX - 5.5, F + 5, '#4e7cf6']);
      for (const [mx, my, c] of mats) {
        k.G.decals.push({ type: 'mat', x: mx, y: my, w: 3.4, d: 2.4, color: c }); k.mark(Math.floor(mx), my, 4, 3, 1);
        k.add({ type: 'ob_chicken', x: mx + 1.7, y: my + 1.2 });
        for (const [dx, dy, face] of [[0.6, 0.55, '+y'], [2.8, 0.55, '+y'], [0.6, 1.85, '-y'], [2.8, 1.85, '-y']]) k.rest({ x: mx + dx, y: my + dy, face, pose: 'sit', carry: 'mug' }, '돗자리 치킨');
      }
      k.sign(1.5, F + 2.6, '🍗 돗자리 치킨존', '#c47f22');
      k.npc('치킨 배달원', { x: DX - 1.5, y: F + 2.5, face: '+y' }, { hat: 'cap', accent: '#e5534b', carry: 'box', say: '🍗 치킨 왔습니다~', patrol: [{ x: DX - 1.5, y: F + 2.5, face: '+y' }, { x: 5, y: F + 6.2, face: '-x' }, { x: DX - 1.5, y: RY - 7.5, face: '-y' }] });
      // 💪 운동기구 (건물 오른쪽)
      const gx = R + 3, gy = TY + 2;
      k.G.decals.push({ type: 'rubber', x: gx - 0.5, y: gy - 0.5, w: 9, d: 3 }); k.mark(gx - 0.5, gy - 0.5, 9, 3, 1);
      ['walker', 'twist', 'bars', 'walker'].forEach((kind, i) => k.add({ type: 'ob_gym', x: gx + 0.5 + i * 2, y: gy + 0.5, kind }, gx + i * 2, gy));
      k.sign(gx - 0.4, gy + 2.6, '💪 야외 운동기구', '#c43d32');
      k.npc('운동하는 어르신', { x: gx + 1.5, y: gy + 1.5, face: '+y' }, { hat: 'beanie', accent: '#a67be0', say: '💪 하나 둘!', patrol: [{ x: gx + 1.5, y: gy + 1.5, face: '+y' }, { x: gx + 5.5, y: gy + 1.5, face: '-y' }] });
      // 🌸 벚꽃길 · 잔디 피크닉 (가족)
      for (let x = 1; x < W - 9; x += 4) k.tree(x, RY - 7, 1.05, 'cherry');
      picnicMats(S, OUT, k, [[R + 3, gy + 6, '#3fb27f'], [R + 8, gy + 6, '#a67be0'], [R + 5, gy + 10, '#e9a23b']], '한강 피크닉');
      S.park.wander.push({ x: cx + 2.5, y: cy + 3.2, face: '-y', food: 'icecream' }, { x: PX + 1, y: RY - 3, face: '+y' }, { x: R + 6, y: gy + 9, face: '+y' }, { x: W - 12, y: RY - 3.5, face: '+y' });
      S.park.play.push({ lv: OUT.idx, x: gx + 4.5, y: gy + 1.2, face: '+y', pose: 'stand', ball: false });
      scatter(k, 61, R + 1, 1, W - 1, RY - 8, Math.round((W - R) * (RY - 8) / 22), (x, y, r) => { k.tree(x, y, 0.95 + r() * 0.2, ['cherry', 'oak', 'ginkgo'][Math.floor(r() * 3)]); });
      scatter(k, 63, 1, F + 2, W - 1, RY - 8, 8, (x, y, r) => { k.tree(x, y, 1, r() < 0.6 ? 'cherry' : 'oak'); });
      k.sign(W - 18, 1.6, '🌉 한강공원', '#3f8a45');
      S.pets = [{ kind: 'dog', color: '#f4ead8' }, { kind: 'dog', color: '#d9a066' }, { kind: 'dog', color: '#2b2b2b' }, { kind: 'cat', color: '#8a8f96' }];
      S.door = { lv: OUT.idx, x: 0.6, y: RY - 3.5, face: '+x' };
    },
  });

  // ================================================================ ⚓ 항구 소품
  /** 계선주 (배 묶는 기둥) */
  C.prop('ob_bollard', { draw(ctx, f) { const { x, y } = f; cylinder(ctx, x, y, 0, 0.16, 8, '#3b3f45', '#2b2f36'); cylinder(ctx, x, y, 8, 0.22, 3, '#4f5459', '#3b3f45'); } });
  /** 🐟 어시장 좌판 (얼음 위 생선 · 줄무늬 차양 · 고무 대야) 2×1.2 */
  C.prop('ob_fishStall', { draw(ctx, f, t, I) {
    const { x, y } = f, c = f.color || '#4e7cf6', r = AIO.rand(Math.round(x * 7 + y * 3));
    shadow(ctx, x + 1, y + 0.7, 1.3, 0.8);
    for (const [lx, ly] of [[0.1, 0.15], [1.8, 0.15], [0.1, 1.05], [1.8, 1.05]]) sbox(ctx, x + lx, y + ly, 0, 0.08, 0.08, 52, '#8d959c');
    box(ctx, x, y + 0.1, 0, 2, 1, 16, '#c4cbd2', '#aeb6bd', '#9aa1a7', 'rgba(0,0,0,0.18)');
    poly(ctx, [P(x + 0.05, y + 0.15, 23), P(x + 1.95, y + 0.15, 23), P(x + 1.95, y + 1.05, 16.5), P(x + 0.05, y + 1.05, 16.5)], '#eef7fb', 'rgba(150,190,210,0.6)');
    for (let i = 0; i < 9; i++) { const fx = x + 0.3 + (i % 5) * 0.36, fy = y + 0.35 + Math.floor(i / 5) * 0.4, [sx, sy] = P(fx, fy, 21 - Math.floor(i / 5) * 3); const col = ['#c9ced3', '#e5847a', '#6f8fb3', '#c9ced3'][Math.floor(r() * 4)]; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(sx, sy, 6, 2.2, 0.45, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(sx - 5, sy - 2.5); ctx.lineTo(sx - 8, sy - 5); ctx.lineTo(sx - 8, sy); ctx.fill(); ctx.fillStyle = '#2b2622'; ctx.fillRect(sx + 3, sy - 1.2, 1, 1); }
    cylinder(ctx, x + 2.35, y + 0.9, 0, 0.3, 7, '#e5534b', '#c9443d'); for (let k = 0; k < 3; k++) dot(ctx, x + 2.25 + k * 0.1, y + 0.85, 7.5, 2.2, '#d9442f');
    const E = 46, Rz = 54;
    for (let i = 0; i < 6; i++) { const u0 = -0.15 + i * 2.3 / 6, u1 = u0 + 2.3 / 6; poly(ctx, [P(x + u0, y - 0.05, Rz), P(x + u1, y - 0.05, Rz), P(x + u1, y + 1.45, E), P(x + u0, y + 1.45, E)], i % 2 ? '#ffffff' : c); }
    poly(ctx, [P(x - 0.15, y + 1.45, E), P(x + 2.15, y + 1.45, E), P(x + 2.15, y + 1.45, E - 4), P(x - 0.15, y + 1.45, E - 4)], shade(c, -0.15));
    onPlaneY(ctx, x + 0.15, y + 1.46, E + 7, (g) => signBoard(g, 54, 9, '#ffffff', shade(c, -0.3), f.label || '🐟 활어 · 회', 6));
    const [lx, ly] = P(x + 1, y + 0.7, E - 4); ctx.strokeStyle = '#3b3f45'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 6); ctx.stroke();
    if (isNight(I)) glow(ctx, lx, ly + 8, 30, '255,220,150', 0.6); ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(lx, ly + 8, 2.4, 0, 7); ctx.fill();
  } });
  /** 🏗️ 항만 크레인 (y 방향 붐이 바다 위로 · 트롤리가 컨테이너를 옮김) */
  C.prop('ob_crane', { dynamic: true, depth: (f) => f.x + 1.5 + f.y + 3.9, draw(ctx, f, t) {
    const { x, y } = f, reach = f.reach || 6, c = f.color || '#e5534b', Z = 104;
    const legs = [[0.1, 0.1], [2.65, 0.1], [0.1, 3.65], [2.65, 3.65]];
    for (const [lx, ly] of legs.slice(0, 2)) sbox(ctx, x + lx, y + ly, 0, 0.25, 0.25, Z, c, 'rgba(0,0,0,0.2)');
    for (const z of [34, Z - 6]) box(ctx, x + 0.1, y + 0.1, z, 2.8, 0.25, 6, c, shade(c, -0.1), shade(c, -0.2));
    for (const [lx, ly] of legs) box(ctx, x + lx - 0.1, y + ly - 0.15, 0, 0.45, 0.55, 5, '#3b3f45', '#2b2f36', '#24272b');
    box(ctx, x + 1.1, y - 0.2, Z + 6, 0.8, 1, 34, shade(c, 0.05), shade(c, -0.1), shade(c, -0.22), 'rgba(0,0,0,0.2)');
    const y0 = y - 2, y1 = y + 3.9 + reach;
    box(ctx, x + 1.05, y0, Z, 0.9, y1 - y0, 7, shade(c, 0.1), shade(c, -0.05), shade(c, -0.2), 'rgba(0,0,0,0.25)');
    const [ax, ay] = P(x + 1.5, y + 0.3, Z + 40);
    ctx.strokeStyle = 'rgba(60,60,60,0.75)'; ctx.lineWidth = 0.8; for (const yy of [y0 + 0.2, y1 - 0.2, y + 3.5]) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(...P(x + 1.5, yy, Z + 7)); ctx.stroke(); }
    const m = pingpong(t, 0.05, x), ty = y + 1.2 + m.u * (reach + 1.8), cz = Z - 40 - Math.sin(m.u * Math.PI) * 10;
    box(ctx, x + 0.95, ty, Z - 6, 1.1, 0.9, 6, '#f4f6f8', '#d2d8de', '#b5bbc0');
    box(ctx, x + 1.1, ty + 0.1, Z - 22, 0.8, 0.7, 14, '#f4f6f8', '#9fc3d8', '#86adc9');
    const [h1x, h1y] = P(x + 1.5, ty + 0.45, Z - 22), [h2x, h2y] = P(x + 1.5, ty + 0.45, cz + 13);
    ctx.strokeStyle = '#3b3f45'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(h1x - 3, h1y); ctx.lineTo(h2x - 3, h2y); ctx.moveTo(h1x + 3, h1y); ctx.lineTo(h2x + 3, h2y); ctx.stroke();
    box(ctx, x + 0.3, ty, cz, 2.4, 0.9, 12, '#3fb27f', '#2f9e5f', '#278a52', 'rgba(0,0,0,0.25)');
    for (const [lx, ly] of legs.slice(2)) sbox(ctx, x + lx, y + ly, 0, 0.25, 0.25, Z, c, 'rgba(0,0,0,0.2)');
    for (const z of [34, Z - 6]) box(ctx, x + 0.1, y + 3.65, z, 2.8, 0.25, 6, c, shade(c, -0.1), shade(c, -0.2));
    for (const lx of [0.1, 2.65]) { const [a, b] = P(x + lx + 0.12, y + 0.35, 40), [cc, d] = P(x + lx + 0.12, y + 3.65, Z - 6); ctx.strokeStyle = shade(c, -0.15); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(cc, d); ctx.stroke(); }
  } });

  // ================================================================ ⚓ 항구
  C.outdoor({
    id: 'harbor', icon: '⚓', name: '항구', desc: '바다 · 부두 · 어선 · 컨테이너 · 크레인 · 방파제 등대 · 어시장 · 갈매기',
    size: (B) => ({ W: B.W + 38, H: B.H + 30 }),
    lot(S, OUT, B, k) {
      OUT.ground.base = { color: '#d6d1c7', tufts: null, edge: '#2f7fae', edge2: '#9c968a' };
      const TX = 3, TY = 3;
      k.place(B, TX, TY);
      const W = k.W, H = k.H, F = k.front, R = k.right, DX = Math.floor(TX + B.doorX), SY = H - 8;
      k.area(0, 0, W, SY, 'concrete', '#d6d1c7');
      const land = { x0: -20, y0: -20, x1: W + 20, y1: SY, r: 0 };
      k.G.decals.push({ type: 'ob_sea', x: 0, y: SY - 1, w: W, d: H - SY + 1, land, quay: true, seed: 3 });
      k.water(0, SY, W, H - SY);
      // 🗼 방파제 + 등대 (왼쪽)
      k.G.decals.push({ type: 'ob_pier', kind: 'stone', x: 1, y: SY, w: 3, d: H - SY });
      k.add({ type: 'ob_lighthouse', x: 2.5, y: H - 1.5 }, 1, H - 3, 3, 3);
      k.sign(4.2, H - 3.2, '🗼 방파제 등대', '#c43d32');
      // ⚓ 나무 부두 + 어선
      const PX = Math.max(DX + 6, Math.floor(W * 0.4));
      k.G.decals.push({ type: 'ob_pier', x: PX, y: SY, w: 2, d: H - SY - 1 });
      OUT.bridges = [{ x: 1, y: SY, w: 3, d: H - SY - 3 }, { x: PX, y: SY, w: 2, d: H - SY - 1 }];
      k.add({ type: 'ob_boat', x: PX - 3.7, y: SY + 1.6, L: 3.3, kind: 'fish', color: '#3f6fb3' });
      k.add({ type: 'ob_boat', x: PX + 2.4, y: SY + 2.8, L: 3.5, kind: 'fish', color: '#2f9e5f' });
      k.add({ type: 'ob_boat', x: 6, y: SY + 3.6, L: 3.2, kind: 'fish', color: '#e5534b' });
      k.sign(PX - 2.4, SY - 0.6, '⚓ 어선 부두', '#2f5d8a');
      k.npc('어부', { x: PX + 0.5, y: SY + 3.5, face: '+x' }, { hat: 'bucket', accent: '#e9a23b', say: '🎣 오늘 만선!', patrol: [{ x: PX + 0.5, y: SY + 3.5, face: '+x' }, { x: PX + 1.5, y: SY - 1.5, face: '+y' }] });
      for (let x = 6; x < W - 2; x += 5) if (Math.abs(x - PX - 1) > 2) k.K.add({ type: 'ob_bollard', x: x + 0.5, y: SY - 0.3 });
      // 길: 정문 → 부두
      k.curve([[DX + 0.5, F + 0.5], [DX + 0.5, F + 4], [DX + 0.5, SY - 4]], 1.8, { color: '#ebe5d9', edge: '#bdb7ab' });
      k.plaza(0, SY - 4, W, 2, '#e3ddd1');
      // 🐟 어시장 좌판 (길 왼쪽 · 두 줄)
      const stalls = [];
      for (let x = 2; x + 2.4 < DX - 1; x += 3) stalls.push([x, F + 3]);
      for (let x = 2; x + 2.4 < DX - 1; x += 3) stalls.push([x, F + 8]);
      stalls.forEach(([x, y], i) => k.add({ type: 'ob_fishStall', x, y, color: ['#4e7cf6', '#e5534b', '#3fb27f', '#e9a23b'][i % 4], label: ['🐟 활어 · 회', '🦀 대게 · 꽃게', '🦑 오징어', '🐚 조개 · 전복'][i % 4] }, x, y, 3, 2));
      k.sign(2, F + 2.4, '🐟 어시장', '#2f5d8a');
      k.npc('경매사', { x: Math.min(DX - 2.5, 6.5), y: F + 6.2, face: '+y' }, { hat: 'cap', accent: '#2f5d8a', say: '🐟 광어 한 상자 만원!', anim: 'think', patrol: [{ x: Math.min(DX - 2.5, 6.5), y: F + 6.2, face: '+y' }, { x: 3.5, y: F + 6.2, face: '+y' }] });
      // 🍽️ 회센터 테이블 (길 오른쪽)
      for (let i = 0; i < 4; i++) { const tx = DX + 4 + (i % 2) * 4, ty = F + 3 + Math.floor(i / 2) * 4; cafeSet(k, tx, ty, ['#4e7cf6', '#e5534b', '#3fb27f', '#f2c230'][i], '회센터 테이블'); }
      k.sign(DX + 3, F + 10.4, '🍽️ 회센터 테이블', '#c47f22');
      // 바다 보는 벤치 (안벽)
      for (const bx of [DX + 3, PX + 4, PX + 9]) if (bx + 3.6 < W - 12 && k.free(Math.floor(bx), SY - 2, 4, 1)) benchSeats(k, bx, SY - 2, 3, '바다 벤치', { color: '#6d8fa8' });
      if (k.free(9, SY - 2, 4, 1)) benchSeats(k, 9, SY - 2, 3, '바다 벤치', { color: '#6d8fa8' });
      // 📦 컨테이너 야드 + 🏗️ 크레인 (오른쪽)
      const yx0 = R + 3, yx1 = W - 2, yy0 = TY + 1, yy1 = SY - 7;
      k.area(R + 1, 0, W - R - 1, SY - 5, 'concrete', '#bfbab0');
      const cols = ['#e5534b', '#4e7cf6', '#3fb27f', '#e9a23b', '#a67be0', '#1f9fb4'], lab = ['AIO', 'K-LINE', 'SEA', 'CARGO'];
      const r = AIO.rand(29);
      for (let y = yy0; y + 1.2 < yy1; y += 3) for (let x = yx0; x + 3 <= yx1; x += 4) {
        const n = 1 + Math.floor(r() * 3);
        for (let z = 0; z < n; z++) k.K.add({ type: 'container', x, y, z: z * 30, color: cols[Math.floor(r() * 6)], label: lab[Math.floor(r() * 4)] });
        k.solid(x, y, 3, 2);
      }
      k.add({ type: 'forklift', x: yx0 + 0.5, y: yy1 + 0.6 }, yx0, yy1);
      k.sign(R + 2, TY + 0.4, '📦 컨테이너 야드', '#a8691a');
      const crx = W - 9;
      k.add({ type: 'ob_crane', x: crx, y: SY - 4, reach: 6 }, crx, SY - 4); k.solid(crx + 2, SY - 4, 1, 1); k.solid(crx, SY - 1, 1, 1); k.solid(crx + 2, SY - 1, 1, 1);
      k.add({ type: 'ob_boat', x: W - 14, y: SY + 2.4, L: 11, Wd: 2.2, kind: 'cargo' });
      k.npc('항만 작업자', { x: crx - 1.5, y: SY - 2.5, face: '+y' }, { hat: 'hardhat', accent: '#f2c230', vest: '#f28c28', say: '🏗️ 하역 중!', patrol: [{ x: crx - 1.5, y: SY - 2.5, face: '+y' }, { x: yx0 + 1.5, y: yy1 + 1.5, face: '-y' }] });
      // 🐦 갈매기 · 고양이
      k.K.add({ type: 'ob_gulls', x: PX + 1, y: SY + 2, n: 4, r: 3 });
      k.K.add({ type: 'ob_gulls', x: crx, y: SY - 2, n: 3, r: 4 });
      k.K.add({ type: 'ob_gulls', x: 6, y: F + 4, n: 3, r: 3 });
      for (const x of [Math.max(10, DX - 8), PX + 6]) if (k.free(x, SY - 5)) lamp(k, OUT, x, SY - 5);
      S.pets = [{ kind: 'cat', color: '#f0a050' }, { kind: 'cat', color: '#2b2b2b' }, { kind: 'cat', color: '#f4ead8' }, { kind: 'dog', color: '#d9a066' }];
      S.door = { lv: OUT.idx, x: 0.6, y: SY - 2.5, face: '+x' };
    },
  });
  // ================================================================ 🎋 일본식 정원 · ♨️ 온천 공용 소품
  /** 🎋 대나무 숲 한 무더기 (마디 · 잎 · 살랑) */
  C.prop('ob_bamboo', { draw(ctx, f, t) {
    const { x, y } = f, n = f.n || 6, r = AIO.rand((f.seed || 1) * 31 + 7);
    shadow(ctx, x + 0.2, y + 0.15, 0.6, 0.45, 0.14);
    const st = [];
    for (let i = 0; i < n; i++) st.push([x + (r() - 0.5) * 0.8, y + (r() - 0.5) * 0.8, 78 + r() * 40, r()]);
    st.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
    for (const [sx0, sy0, h, k] of st) {
      const [bx, by] = P(sx0, sy0, 0), sw = Math.sin(t * 0.9 + k * 6) * 3;
      const col = k < 0.5 ? '#6fae4f' : '#7fbf5c';
      ctx.strokeStyle = shade(col, -0.25); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx, by - h * 0.6, bx + sw, by - h); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 3.4; ctx.stroke();
      ctx.strokeStyle = shade(col, -0.35); ctx.lineWidth = 1;
      for (let z = 14; z < h - 6; z += 15) { const u = z / h, px = bx + sw * u * u; ctx.beginPath(); ctx.moveTo(px - 2, by - z); ctx.lineTo(px + 2, by - z); ctx.stroke(); }
      ctx.fillStyle = k < 0.5 ? '#5fa35a' : '#78bd62';
      for (let j = 0; j < 10; j++) { const u = 0.5 + j * 0.05, px = bx + sw * u * u + (j % 2 ? 1 : -1) * (5 + j * 0.8), py = by - h * u; ctx.beginPath(); ctx.ellipse(px, py, 7.5, 2.2, (j % 2 ? 0.45 : -0.45), 0, 7); ctx.fill(); }
    }
  } });
  /** 대나무 울타리 한 칸 (fence 처럼 타일 모서리를 따라: axis 'x' 는 y=f.y 선, 'y' 는 x=f.x 선) */
  C.prop('ob_bambooFence', { depth: (f) => (f.axis === 'x' ? f.x + 0.5 + f.y : f.x + f.y + 0.5), draw(ctx, f) {
    const H = 30, ax = f.axis === 'x', n = 7;
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 0.86) / n;
      const p = (u, z) => (ax ? P(f.x + u, f.y, z) : P(f.x, f.y + u, z));
      poly(ctx, [p(u0, 0), p(u1, 0), p(u1, H + (i % 2) * 2), p(u0, H + (i % 2) * 2)], i % 2 ? '#c9b26a' : '#b89e55', 'rgba(90,70,30,0.35)', 0.5);
    }
    for (const z of [8, 22]) { const [a, b] = ax ? P(f.x, f.y, z) : P(f.x, f.y, z), [c, d] = ax ? P(f.x + 1, f.y, z) : P(f.x, f.y + 1, z); ctx.strokeStyle = '#6b4a35'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
  } });
  /** ⛩️ 토리이 (기둥 2개 · 검은 가사기 · 현판) — x..x+w, 사람이 아래로 지나간다 */
  C.prop('ob_torii', { slice: 0.5, draw(ctx, f) {
    const { x, y, w } = f, R = '#d9442f', Hh = 74;
    for (const px of [x + 0.35, x + w - 0.35]) { cylinder(ctx, px, y + 0.25, 0, 0.2, 6, '#2b2622', '#2b2622'); cylinder(ctx, px, y + 0.25, 6, 0.15, Hh - 6, shade(R, 0.1), R); }
    box(ctx, x + 0.05, y + 0.12, Hh - 18, w - 0.1, 0.26, 6, shade(R, 0.1), R, shade(R, -0.2));
    const k0 = x - 0.55, k1 = x + w + 0.55;
    box(ctx, x - 0.2, y + 0.08, Hh - 2, w + 0.4, 0.34, 6, shade(R, 0.1), R, shade(R, -0.2));
    const [a1, b1] = P(k0, y + 0.25, Hh + 12), [a2, b2] = P(k1, y + 0.25, Hh + 12), [m1, n1] = P((k0 + k1) / 2, y + 0.25, Hh + 6);
    ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.moveTo(a1, b1); ctx.quadraticCurveTo(m1, n1, a2, b2); ctx.lineTo(a2 + 1, b2 + 6); ctx.quadraticCurveTo(m1, n1 + 6, a1 - 1, b1 + 6); ctx.closePath(); ctx.fill();
    onPlaneY(ctx, x + w / 2 - 0.22, y + 0.4, Hh - 2, (g) => { g.fillStyle = '#2b2622'; g.fillRect(0, 0, 14, 16); g.fillStyle = '#f2c230'; g.font = `bold 6px ${FONT}`; g.fillText(f.text || '和', 3.5, 10.5); });
  } });
  /** 가레산스이(모래 갈퀴 정원): 갈퀴 무늬 + 돌 둘레 동심원 */
  C.decal('ob_raked', (g, d) => {
    const { x, y, w } = d, dd = d.d;
    rect(g, x - 0.15, y - 0.15, w + 0.3, dd + 0.3, '#8a8276');
    TS(g, (q) => {
      q.fillStyle = '#ece6d6'; q.fillRect(x, y, w, dd);
      q.save(); q.beginPath(); q.rect(x, y, w, dd); q.clip();
      q.strokeStyle = 'rgba(150,140,120,0.45)'; q.lineWidth = 0.035;
      for (let j = y + 0.2; j < y + dd; j += 0.22) { q.beginPath(); for (let i = x; i <= x + w + 0.01; i += 0.25) { const yy = j + Math.sin((i + j) * 1.3) * 0.05; i === x ? q.moveTo(i, yy) : q.lineTo(i, yy); } q.stroke(); }
      for (const [cx, cy, rr] of d.rocks || []) {
        q.beginPath(); q.ellipse(cx, cy, rr + 1.1, rr + 1.1, 0, 0, 7); q.fillStyle = '#ece6d6'; q.fill();
        for (let k = 0.25; k <= 1.1; k += 0.22) { q.beginPath(); q.ellipse(cx, cy, rr + k, rr + k, 0, 0, 7); q.stroke(); }
        q.beginPath(); q.ellipse(cx, cy, rr + 0.05, rr + 0.05, 0, 0, 7); q.fillStyle = 'rgba(110,150,80,0.55)'; q.fill();
      }
      q.restore();
    });
  });
  /** 🍵 다실 정자 (다다미 마루 · 장지문 · 기와 지붕) w × 3 */
  C.prop('ob_teaHouse', { slice: 3, draw(ctx, f, t, I) {
    const { x, y, w } = f, d = 3, FZ = 10, E = 54, Rz = 74, n = isNight(I);
    shadow(ctx, x + w / 2 + 0.4, y + d / 2 + 0.4, w / 2 + 0.6, 2, 0.2);
    box(ctx, x, y, 0, w, d, FZ, '#a87a52', '#8a6247', '#7a5540', 'rgba(0,0,0,0.2)');
    rect(ctx, x + 0.1, y + 0.1, w - 0.2, d - 0.2, '#d9d29a', FZ);
    for (let i = 0; i < w - 0.2; i += 1) rect(ctx, x + 0.1 + i, y + 0.1, 0.04, d - 0.2, 'rgba(90,80,40,0.4)', FZ + 0.1);
    rect(ctx, x + 0.1, y + 0.1 + (d - 0.2) / 2, w - 0.2, 0.04, 'rgba(90,80,40,0.4)', FZ + 0.1);
    poly(ctx, [P(x, y, FZ), P(x + w, y, FZ), P(x + w, y, E), P(x, y, E)], '#efe8d8');
    onPlaneY(ctx, x, y, E, (g) => { g.strokeStyle = 'rgba(120,90,60,0.6)'; g.lineWidth = 1; for (let i = 0; i <= w * 32; i += 10) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, E - FZ); g.stroke(); } for (let j = 0; j < E - FZ; j += 9) { g.beginPath(); g.moveTo(0, j); g.lineTo(w * 32, j); g.stroke(); } g.fillStyle = '#3f6b3a'; g.fillRect(w * 16 - 9, 8, 18, 22); g.fillStyle = '#f6efe0'; g.font = `bold 8px ${FONT}`; g.fillText('茶', w * 16 - 4, 22); });
    box(ctx, x + w / 2 - 0.5, y + 1, FZ, 1, 0.8, 5, '#6b4a35', '#5a3e2c', '#4d3526');
    cylinder(ctx, x + w / 2 - 0.15, y + 1.4, FZ + 5, 0.1, 3, '#7a9a5a', '#3f6b3a'); cylinder(ctx, x + w / 2 + 0.2, y + 1.35, FZ + 5, 0.07, 2.5, '#f6efe0', '#d9d3c8');
    poly(ctx, [P(x + w, y, FZ), P(x + w, y + d * 0.55, FZ), P(x + w, y + d * 0.55, E), P(x + w, y, E)], '#e6dfcd');
    for (const [px, py] of [[x, y + d], [x + w, y + d], [x + w, y], [x + w, y + d * 0.55]]) sbox(ctx, px - 0.07, py - 0.07, FZ, 0.14, 0.14, E - FZ, '#5a3e2c');
    const ox = 0.6, oy = 0.6, x0 = x - ox, x1 = x + w + ox, y0 = y - oy, y1 = y + d + oy, ym = y + d / 2;
    poly(ctx, [P(x0, y0, E), P(x1, y0, E), P(x1 - 1.2, ym, Rz), P(x0 + 1.2, ym, Rz)], '#4f5a64');
    poly(ctx, [P(x1, y0, E), P(x1, y1, E), P(x1 - 1.2, ym, Rz)], '#46505a', 'rgba(0,0,0,0.25)');
    poly(ctx, [P(x0, y1, E), P(x1, y1, E), P(x1 - 1.2, ym, Rz), P(x0 + 1.2, ym, Rz)], '#5d6975', 'rgba(0,0,0,0.25)');
    ctx.strokeStyle = 'rgba(30,35,40,0.35)'; ctx.lineWidth = 0.8; for (let u = 0.05; u < 1; u += 0.07) { const [a, b] = P(x0 + 1.2 + (x1 - x0 - 2.4) * u, ym, Rz), [c, e] = P(x0 + (x1 - x0) * u, y1, E); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, e); ctx.stroke(); }
    box(ctx, x0 + 1.1, ym - 0.12, Rz, x1 - x0 - 2.2, 0.24, 4, '#3b434b', '#333a41', '#2b3137');
    poly(ctx, [P(x0, y1, E), P(x1, y1, E), P(x1, y1, E - 3), P(x0, y1, E - 3)], '#3b434b');
    const [lx, ly] = P(x + w - 0.4, y + d + 0.2, E - 4); ctx.strokeStyle = '#3b2f2a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 4); ctx.stroke();
    if (n) glow(ctx, lx, ly + 10, 26, '255,190,110', 0.6);
    ctx.fillStyle = n ? '#ffd9a0' : '#f6efe0'; ctx.beginPath(); ctx.ellipse(lx, ly + 10, 4, 6, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.stroke();
    box(ctx, x + 0.6, y + d, 0, 1.4, 0.45, 5, '#bdb7ab', '#a9a296', '#968f84');
  } });
  /** 🎍 시시오도시 (대나무 물받이가 탁 하고 넘어감) + 돌 수반 */
  C.prop('ob_shishi', { draw(ctx, f, t) {
    const { x, y } = f;
    cylinder(ctx, x + 0.2, y + 0.2, 0, 0.42, 9, '#bdb7ab', '#a9a296'); ellipseFloor(ctx, x + 0.2, y + 0.2, 0.3, 0.3, 9, '#6fb6cf');
    sbox(ctx, x - 0.35, y - 0.1, 0, 0.08, 0.08, 22, '#8a6247'); sbox(ctx, x - 0.35, y + 0.15, 0, 0.08, 0.08, 22, '#8a6247');
    const ph = (t * 0.22 + x) % 1, a = ph < 0.85 ? -0.35 + ph / 0.85 * 0.6 : 0.25 - (ph - 0.85) / 0.15 * 0.6;
    const [px, py] = P(x - 0.35, y + 0.05, 20), L = 26;
    ctx.save(); ctx.translate(px, py); ctx.rotate(a);
    ctx.fillStyle = '#7fbf5c'; roundRect(ctx, -L * 0.35, -2.4, L, 4.8, 2.4); ctx.fill(); ctx.strokeStyle = '#4f8a3e'; ctx.lineWidth = 0.6; ctx.stroke(); ctx.fillStyle = '#4f8a3e'; ctx.fillRect(L * 0.25, -2.4, 1, 4.8);
    ctx.restore();
    const [sx, sy] = P(x - 0.6, y - 0.5, 34); ctx.strokeStyle = '#7fbf5c'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px + 12, py - 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(160,215,240,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + 12, py - 8); ctx.lineTo(px + 13, py - 3 + Math.sin(t * 9)); ctx.stroke();
  } });

  // ================================================================ 🎋 일본식 정원
  C.outdoor({
    id: 'zen', icon: '🎋', name: '일본식 정원', desc: '대나무 숲 · 가레산스이 모래 정원 · 잉어 연못과 다리 · 토리이 · 석등 · 다실 · 단풍',
    size: (B) => ({ W: B.W + 34, H: B.H + 30 }),
    lot(S, OUT, B, k) {
      OUT.ground.base = { color: '#9cc48a', tufts: ['#7fae6c', '#b6d6a2'], edge: '#7d6a52', edge2: '#6b5a45' };
      const TX = 3, TY = 3;
      k.place(B, TX, TY);
      const W = k.W, H = k.H, F = k.front, R = k.right, DX = Math.floor(TX + B.doorX);
      // 길: 정문 → ⛩️ → 남쪽 출입구 (자갈길)
      const gravel = { color: '#e3ddce', edge: '#bdb5a3', dots: true };
      k.curve([[DX + 1, F + 0.5], [DX + 1, H - 0.5]], 2, gravel);
      k.add({ type: 'ob_torii', x: DX - 1, y: F + 3, w: 4, text: '和' }, DX - 1, F + 3); k.solid(DX + 2, F + 3, 1, 1);
      k.add({ type: 'ob_torii', x: DX - 1, y: H - 4, w: 4, text: '庭' }, DX - 1, H - 4); k.solid(DX + 2, H - 4, 1, 1);
      k.sign(DX + 3.2, H - 3.2, '⛩️ 정원 입구', '#d9442f');
      for (let y = F + 6; y < H - 5; y += 4) for (const x of [DX - 1, DX + 2]) if (k.free(x, y)) k.add({ type: 'stoneLantern', x: x + 0.5, y: y + 0.5 }, x, y);
      // 🪨 가레산스이 (건물 오른쪽 위)
      const gx = R + 3, gy = TY + 1, gw = Math.min(16, W - R - 6), gd = Math.max(7, Math.min(10, B.H - 6));
      const rocks = [[gx + gw * 0.25, gy + gd * 0.4, 0.5], [gx + gw * 0.62, gy + gd * 0.3, 0.4], [gx + gw * 0.72, gy + gd * 0.7, 0.55]];
      k.G.decals.push({ type: 'ob_raked', x: gx, y: gy, w: gw, d: gd, rocks });
      k.solid(gx, gy, gw, gd);
      rocks.forEach(([cx, cy, rr], i) => k.K.add({ type: 'ob_rock', x: cx, y: cy, size: rr * 3.4, moss: true, color: '#8f8a80', seed: i + 3 }));
      k.sign(gx, gy + gd + 0.6, '🪨 가레산스이 모래 정원', '#6b5a45');
      benchSeats(k, gx + 1, gy + gd + 1, 3, '모래 정원 툇마루', { back: true, color: '#8a6247' });
      if (gw >= 12) benchSeats(k, gx + gw - 5, gy + gd + 1, 3, '모래 정원 툇마루', { back: true, color: '#8a6247' });
      k.npc('정원사', { x: gx + gw / 2, y: gy + gd + 3.5, face: '-y' }, { hat: 'bucket', accent: '#3f6b3a', say: '🧹 모래 무늬 정리 중', patrol: [{ x: gx + gw / 2, y: gy + gd + 3.5, face: '-y' }, { x: gx - 1.5, y: gy + 2, face: '+x' }] });
      // 🐟 잉어 연못 + 붉은 다리 (앞쪽 오른편)
      const pcx = Math.max(DX + 11, R - 3), pcy = F + 9, prx = 4.6, pry = 3.2;
      k.pond(pcx, pcy, prx, pry);
      const bx0 = Math.floor(pcx - prx - 1), bw = Math.ceil(pcx + prx + 1) - bx0;
      OUT.bridges = [{ x: bx0, y: Math.floor(pcy), w: bw, d: 1 }];
      k.add({ type: 'bridge', x: bx0, y: Math.floor(pcy), w: bw });
      k.curve([[DX + 2, Math.floor(pcy) + 0.5], [bx0, Math.floor(pcy) + 0.5]], 1.2, gravel); k.curve([[bx0 + bw, Math.floor(pcy) + 0.5], [bx0 + bw + 3, Math.floor(pcy) + 0.5]], 1.2, gravel);
      for (let q = 0; q < 6; q++) k.add({ type: 'koi', x: pcx - prx / 2 + (q % 3) * prx / 2, y: pcy - 1 + (q % 2) * 1.6, seed: q });
      for (const [x, y] of [[pcx - prx - 1.2, pcy - 1.5], [pcx + prx + 1.2, pcy - 1.5]]) k.add({ type: 'stoneLantern', x, y }, Math.floor(x), Math.floor(y));
      for (const bx of [pcx - prx + 0.5, pcx + prx - 3.6]) benchSeats(k, bx, Math.floor(pcy + pry + 1.5), 2, '잉어 연못', { back: true, color: '#8a6247' });
      k.sign(pcx - prx, pcy + pry + 3.4, '🐟 잉어 연못', '#1f9fb4');
      k.add({ type: 'ob_shishi', x: pcx + prx + 1, y: pcy + 2 }, Math.floor(pcx + prx + 0.5), Math.floor(pcy + 1.5), 1, 2);
      // 🍵 다실 정자 (앞쪽 왼편)
      const thx = 2, thy = F + 3, thw = Math.min(6, DX - 5);
      if (thw >= 4) {
        k.add({ type: 'ob_teaHouse', x: thx, y: thy, w: thw }, thx, thy, thw, 3);
        for (let q = 0; q < thw - 1; q++) k.rest({ x: thx + 0.9 + q, y: thy + 2.75, face: '+y', pose: 'sit', carry: 'mug', approach: [thx + q, thy + 3] }, '다실 툇마루');
        k.npc('다도 선생', { x: thx + thw / 2, y: thy + 1.2, face: '+y', pose: 'sit' }, { anim: 'idle', hat: null, accent: '#3f6b3a', say: '🍵 말차 한 잔 드세요' });
        k.sign(thx, thy + 4, '🍵 다실', '#3f6b3a');
        k.G.decals.push({ type: 'stones', x: thx + thw / 2, y: thy + 4.2, n: 4, dx: 0.9, dy: 0.5 });
      } else {
        k.add({ type: 'gazebo', x: 4, y: F + 5 }, 3, F + 4, 3, 3);
        for (const [dx, dy, face] of [[-1.6, 0, '+x'], [1.6, 0, '-x'], [0, 1.6, '-y']]) k.rest({ x: 4 + dx, y: F + 5 + dy, face, pose: 'sit', carry: 'mug' }, '정자');
      }
      // 🎋 대나무 숲 (가장자리) · 🍁 단풍
      for (let x = 1; x < W - 1; x += 2) { if (k.free(x, 1)) k.add({ type: 'ob_bamboo', x: x + 0.5, y: 1.4, n: 6, seed: x }, x, 1); }
      for (let y = 3; y < H - 2; y += 2) { if (k.free(W - 2, y)) k.add({ type: 'ob_bamboo', x: W - 1.5, y: y + 0.5, n: 6, seed: y * 3 }, W - 2, y); }
      scatter(k, 71, 1, F + 1, DX - 2, H - 1, 6, (x, y) => { k.add({ type: 'ob_bamboo', x: x + 0.5, y: y + 0.5, n: 7, seed: x * 7 + y }, x, y); });
      k.sign(1, F + 0.6, '🎋 대나무 숲', '#3f8a45');
      scatter(k, 73, 1, 1, W - 2, H - 1, Math.round(W * H / 75), (x, y, r) => { k.tree(x, y, 0.95 + r() * 0.25, r() < 0.55 ? 'maple' : r() < 0.6 ? 'pine' : 'cherry'); });
      scatter(k, 79, 1, 1, W - 2, H - 1, Math.round(W * H / 160), (x, y, r) => { k.add({ type: 'ob_rock', x: x + 0.5, y: y + 0.5, size: 0.6 + r() * 0.5, moss: true, seed: x + y }, x, y); });
      S.pets = [{ kind: 'cat', color: '#f4ead8' }, { kind: 'cat', color: '#2b2b2b' }, { kind: 'duck', color: '#ffffff', near: [pcx, pcy] }, { kind: 'duck', color: '#3f8a45', near: [pcx, pcy] }];
      S.door = { lv: OUT.idx, x: DX + 1, y: H - 1.2, face: '-y' };
    },
  });

  // ================================================================ 🌻 꽃밭 정원 소품
  const FLOW = { sunflower: ['#f6c445', '#f2b632', '#ffd75a'], tulip: ['#e5534b', '#f2a7c3', '#f6c445', '#ffffff', '#a67be0'], lavender: ['#a88be6', '#9a7bd9', '#b9a0f0'], rose: ['#e2667f', '#f2a7c3', '#ffffff'] };
  /** 꽃밭 한 줄 (흙두둑 + 색 꽃) — kind: sunflower | tulip | lavender | rose, color 로 한 색만 */
  C.decal('ob_flowerRow', (g, d) => {
    const { x, y, w } = d, dd = d.d, r = AIO.rand(Math.round(x * 13 + y * 7) + 1), kind = d.kind || 'tulip';
    rect(g, x, y, w, dd, '#8a6a4a'); rect(g, x + 0.05, y + 0.08, w - 0.1, dd - 0.16, '#6f8f4e');
    const pal = d.color ? [d.color] : FLOW[kind] || FLOW.tulip;
    const n = Math.round(w * dd * (kind === 'lavender' ? 26 : 16));
    for (let i = 0; i < n; i++) {
      const fx = x + 0.1 + r() * (w - 0.2), fy = y + 0.12 + r() * (dd - 0.24), [sx, sy] = P(fx, fy);
      if (kind === 'lavender') { g.strokeStyle = '#5f8f4e'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx, sy - 6); g.stroke(); g.fillStyle = pal[Math.floor(r() * pal.length)]; g.beginPath(); g.ellipse(sx, sy - 7, 1.3, 3, 0, 0, 7); g.fill(); }
      else if (kind === 'tulip') { g.strokeStyle = '#4f8a3e'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx, sy - 5); g.stroke(); g.fillStyle = pal[Math.floor(r() * pal.length)]; g.beginPath(); g.moveTo(sx - 2.2, sy - 8); g.lineTo(sx - 2.2, sy - 5); g.quadraticCurveTo(sx, sy - 3, sx + 2.2, sy - 5); g.lineTo(sx + 2.2, sy - 8); g.lineTo(sx + 1, sy - 6.6); g.lineTo(sx, sy - 8.4); g.lineTo(sx - 1, sy - 6.6); g.closePath(); g.fill(); }
      else { g.fillStyle = pal[Math.floor(r() * pal.length)]; g.beginPath(); g.arc(sx, sy - 2, 2.4, 0, 7); g.fill(); g.fillStyle = kind === 'sunflower' ? '#7a4a2a' : 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(sx, sy - 2, 1, 0, 7); g.fill(); }
    }
  });
  /** 🌻 키 큰 해바라기 줄 (x 방향) */
  C.prop('ob_sunflowers', { slice: 0.6, draw(ctx, f, t) {
    const { x, y, w } = f, r = AIO.rand(Math.round(x * 7 + y * 13));
    for (let i = 0; i < w * 2.2; i++) {
      const fx = x + 0.2 + (i / 2.2) + (r() - 0.5) * 0.15, fy = y + 0.3 + (r() - 0.5) * 0.3, h = 30 + r() * 16, [sx, sy] = P(fx, fy, 0), sw = Math.sin(t * 1.1 + i) * 1.5;
      ctx.strokeStyle = '#4f8a3e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx, sy - h * 0.6, sx + sw, sy - h); ctx.stroke();
      ctx.fillStyle = '#5fa35a'; ctx.beginPath(); ctx.ellipse(sx - 4, sy - h * 0.45, 4, 2, -0.5, 0, 7); ctx.ellipse(sx + 4, sy - h * 0.6, 4, 2, 0.5, 0, 7); ctx.fill();
      const cx = sx + sw, cy = sy - h;
      ctx.fillStyle = '#f6c445'; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * 4.2, cy + Math.sin(a) * 4.2, 2.8, 1.4, a, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#7a4a2a'; ctx.beginPath(); ctx.arc(cx, cy, 3.2, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(cx + 0.8, cy + 0.8, 1.6, 0, 7); ctx.fill();
    }
  } });
  /** 🌬️ 풍차 (팔각 탑 · 돌아가는 날개) */
  C.prop('ob_windmill', { dynamic: true, depth: (f) => f.x + f.y + 1, draw(ctx, f, t) {
    const { x, y } = f, [ox, oy] = P(x, y, 0);
    shadow(ctx, x + 0.5, y + 0.4, 1.9, 1.4, 0.18);
    ctx.save(); ctx.translate(ox, oy); ctx.scale(1.35, 1.35); ctx.translate(-ox, -oy);
    frustum(ctx, x, y, 0, 1.2, 1.15, 10, '#bdb7ab', '#c9c3b6');
    frustum(ctx, x, y, 10, 1.05, 0.72, 70, '#f4efe6');
    onPlaneY(ctx, x - 0.2, y + 0.98, 30, (g) => { g.fillStyle = '#7a4a2a'; roundRect(g, 0, 0, 13, 20, 6); g.fill(); g.fillStyle = '#5a3e2c'; g.fillRect(6, 2, 1, 18); });
    onPlaneY(ctx, x - 0.45, y + 0.8, 62, (g) => { g.fillStyle = '#7fb6d6'; g.fillRect(0, 0, 8, 8); g.strokeStyle = '#fff'; g.strokeRect(0, 0, 8, 8); });
    const [cx, cy] = P(x, y, 80);
    ctx.fillStyle = '#c94a3a'; ctx.beginPath(); ctx.ellipse(cx, cy, 33, 16, 0, Math.PI, 0); ctx.quadraticCurveTo(cx + 18, cy - 30, cx, cy - 34); ctx.quadraticCurveTo(cx - 18, cy - 30, cx - 33, cy); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(cx - 10, cy - 16, 8, 10, -0.3, 0, 7); ctx.fill();
    const [hx, hy] = P(x + 0.35, y + 0.8, 80), a0 = t * 0.9;
    for (let k = 0; k < 4; k++) {
      const a = a0 + k * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
      const ex = (u) => [hx + ca * u * 0.9 - sa * 0, hy + sa * u];
      ctx.save(); ctx.translate(hx, hy); ctx.transform(0.8, 0.35, 0, 1, 0, 0); ctx.rotate(a);
      ctx.fillStyle = '#8a6247'; ctx.fillRect(-1.2, 0, 2.4, 60);
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillRect(1.2, 14, 11, 44); ctx.strokeStyle = '#a87a52'; ctx.lineWidth = 0.6; for (let j = 14; j < 58; j += 6) { ctx.beginPath(); ctx.moveTo(1.2, j); ctx.lineTo(12.2, j); ctx.stroke(); } ctx.strokeRect(1.2, 14, 11, 44);
      ctx.restore(); void ex;
    }
    ctx.fillStyle = '#5a3e2c'; ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, 7); ctx.fill();
    ctx.restore();
  } });
  /** 🌸 꽃 아치 (x..x+w 를 가로지름, 아래로 지나감) */
  C.prop('ob_flowerArch', { slice: 0.4, draw(ctx, f) {
    const { x, y, w } = f, r = AIO.rand(Math.round(x * 3 + y * 11)), H = 56, pal = f.colors || ['#f2a7c3', '#e2667f', '#ffffff', '#f6c445'];
    for (const px of [x + 0.2, x + w - 0.2]) sbox(ctx, px - 0.06, y + 0.14, 0, 0.12, 0.12, H, '#f4efe6');
    const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push(P(x + 0.2 + (w - 0.4) * u, y + 0.2, H + Math.sin(Math.PI * u) * 22)); }
    ctx.strokeStyle = '#f4efe6'; ctx.lineWidth = 2.4; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
    ctx.strokeStyle = '#4f9550'; ctx.lineWidth = 6; ctx.globalAlpha = 0.85; ctx.stroke(); ctx.globalAlpha = 1;
    for (let i = 0; i < 46; i++) { const k = Math.floor(r() * pts.length), [px, py] = pts[k]; ctx.fillStyle = pal[Math.floor(r() * pal.length)]; ctx.beginPath(); ctx.arc(px + (r() - 0.5) * 8, py + (r() - 0.5) * 7, 1.8 + r() * 1.2, 0, 7); ctx.fill(); }
    for (const px of [x + 0.2, x + w - 0.2]) for (let z = 8; z < H; z += 7) { const [sx, sy] = P(px, y + 0.2, z); ctx.fillStyle = r() < 0.5 ? '#4f9550' : pal[Math.floor(r() * pal.length)]; ctx.beginPath(); ctx.arc(sx + (r() - 0.5) * 5, sy, 2.2, 0, 7); ctx.fill(); }
  } });
  /** 🦋🐝 나비 · 벌 (꽃 위를 맴돎) */
  C.prop('ob_butterflies', { dynamic: true, depth: (f) => f.x + f.y + 2, draw(ctx, f, t, I) {
    if (!live(I)) return;
    const n = f.n || 5, R = f.r || 2.5;
    for (let i = 0; i < n; i++) {
      const a = t * (0.5 + (i % 3) * 0.17) + i * 2.1, rr = R * (0.5 + 0.5 * Math.sin(t * 0.3 + i));
      const [sx, sy] = P(f.x + Math.cos(a) * rr, f.y + Math.sin(a * 1.3) * rr * 0.8, 22 + Math.sin(t * 2 + i) * 8);
      if (i % 3 === 2) { ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.ellipse(sx, sy, 3, 2, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#2b2622'; ctx.fillRect(sx - 0.5, sy - 2, 1, 4); ctx.fillStyle = 'rgba(255,255,255,0.75)'; const fl = Math.abs(Math.sin(t * 30 + i)) * 2.5; ctx.beginPath(); ctx.ellipse(sx - 1, sy - 2.5 - fl * 0.3, 2, 1 + fl * 0.3, -0.4, 0, 7); ctx.fill(); continue; }
      const fl = Math.abs(Math.sin(t * 9 + i * 1.7)), c = ['#f2a7c3', '#7ab8f5', '#f6c445', '#ffffff'][i % 4];
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(sx - 2.6 * fl, sy - 1, 2.8 * fl + 0.4, 2.4, 0.3, 0, 7); ctx.ellipse(sx + 2.6 * fl, sy - 1, 2.8 * fl + 0.4, 2.4, -0.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#3b2f2a'; ctx.fillRect(sx - 0.4, sy - 3, 0.8, 4);
    }
  } });
  /** 🐝 벌통 */
  C.prop('ob_beehive', { draw(ctx, f) { const { x, y } = f; box(ctx, x - 0.3, y - 0.3, 0, 0.6, 0.6, 4, '#8a6247', '#7a5540', '#6b4a35'); for (let k = 0; k < 3; k++) box(ctx, x - 0.28, y - 0.28, 4 + k * 7, 0.56, 0.56, 6.4, '#f6d55a', k % 2 ? '#e9b81f' : '#f2c230', '#d9a020'); box(ctx, x - 0.34, y - 0.34, 25, 0.68, 0.68, 3, '#e9e4da', '#d6cfc3', '#c4bcae'); onPlaneY(ctx, x - 0.1, y + 0.29, 8, (g) => { g.fillStyle = '#3b2f2a'; g.fillRect(0, 0, 6, 2); }); } });

  // ================================================================ 🌻 꽃밭 정원
  C.outdoor({
    id: 'flowers', icon: '🌻', name: '꽃밭 정원', desc: '해바라기 · 튤립 · 라벤더 밭 · 풍차 · 온실 · 꽃 터널 · 피크닉 · 벌과 나비',
    size: (B) => ({ W: B.W + 36, H: B.H + 30 }),
    lot(S, OUT, B, k) {
      OUT.ground.base = { color: '#a9d68c', tufts: ['#8cc56f', '#c7e8ae'], edge: '#8a6a4a', edge2: '#76583c' };
      const TX = 3, TY = 3;
      k.place(B, TX, TY);
      const W = k.W, H = k.H, F = k.front, R = k.right, DX = Math.floor(TX + B.doorX);
      const path = { color: '#eadfc6', edge: '#cdbd98', dots: true };
      // 🌸 꽃 터널: 정문에서 남쪽으로
      k.curve([[DX + 1, F + 0.5], [DX + 1, H - 0.5]], 2, path);
      const ay0 = F + 3;
      for (let i = 0; i < 6; i++) { const y = ay0 + i * 1.5; if (y > H - 4) break; k.add({ type: 'ob_flowerArch', x: DX - 0.9, y, w: 3.8 }); k.solid(DX - 1, Math.floor(y), 1, 1); k.solid(DX + 2, Math.floor(y), 1, 1); }
      k.sign(DX + 3, ay0 - 0.6, '🌸 꽃 터널', '#e2667f');
      // 🌷 튤립 · 💜 라벤더 · 🌻 해바라기 밭 (건물 오른쪽: 줄줄이)
      const fx0 = R + 3, fx1 = W - 3, fw = fx1 - fx0;
      const rows = [['sunflower', null], ['sunflower', null], ['tulip', '#e5534b'], ['tulip', '#f2a7c3'], ['tulip', '#f6c445'], ['tulip', '#a67be0'], ['lavender', null], ['lavender', null], ['lavender', null]];
      let ry = TY;
      rows.forEach(([kind, color], i) => {
        if (ry + 1 > F - 1) return;
        if (kind === 'sunflower') { k.G.decals.push({ type: 'ob_flowerRow', x: fx0, y: ry, w: fw, d: 1, kind }); addSplit(k, { type: 'ob_sunflowers', x: fx0, y: ry, w: fw }); k.solid(fx0, ry, fw, 1); }
        else { k.G.decals.push({ type: 'ob_flowerRow', x: fx0, y: ry, w: fw, d: 1, kind, color }); k.solid(fx0, ry, fw, 1); }
        if (i === 0) k.sign(fx0, ry - 0.5, '🌻 해바라기 밭', '#c47f22');
        if (i === 2) k.sign(fx0, ry - 0.5, '🌷 튤립 밭', '#e5534b');
        if (i === 6) k.sign(fx0, ry - 0.5, '💜 라벤더 밭', '#7a5ec4');
        ry += 2;
      });
      k.K.add({ type: 'ob_butterflies', x: fx0 + fw * 0.3, y: TY + 4, n: 6, r: 3 });
      k.K.add({ type: 'ob_butterflies', x: fx0 + fw * 0.7, y: TY + 10, n: 5, r: 3 });
      k.npc('정원사', { x: fx0 - 1.5, y: TY + 3, face: '+x' }, { hat: 'bucket', accent: '#3f8a45', say: '🌷 물 주는 중~', patrol: [{ x: fx0 - 1.5, y: TY + 3, face: '+x' }, { x: fx0 + fw / 2, y: TY + 5, face: '-y' }, { x: fx1 + 1.5, y: TY + 9, face: '-x' }] });
      // 🌬️ 풍차 · 🌱 온실 (앞쪽 오른편)
      const mx = Math.max(DX + 10, R - 2), my = F + 5;
      k.add({ type: 'ob_windmill', x: mx + 0.5, y: my + 0.5 }, mx - 1, my - 1, 3, 3);
      k.sign(mx - 1.5, my + 2.4, '🌬️ 풍차', '#c94a3a');
      benchSeats(k, mx - 1.6, my + 3, 3, '풍차 벤치', { color: '#a87a52' });
      const gx = mx + 5, gy = F + 2;
      if (gx + 6 < W - 1) { k.add({ type: 'greenhouse', x: gx, y: gy, w: 6, d: 4 }, gx, gy, 6, 4); k.sign(gx, gy + 4.5, '🌱 유리 온실', '#2f7d4f'); }
      for (let i = 0; i < 3; i++) if (k.free(gx + 1 + i * 2, gy + 6)) k.add({ type: 'ob_beehive', x: gx + 1.5 + i * 2, y: gy + 6.5 }, gx + 1 + i * 2, gy + 6);
      k.K.add({ type: 'ob_butterflies', x: gx + 3, y: gy + 7, n: 6, r: 2 });
      k.npc('양봉가', { x: gx + 3, y: gy + 8.2, face: '-y' }, { hat: 'bucket', accent: '#f2c230', say: '🐝 꿀 맛 보세요', anim: 'idle' });
      // 🧺 피크닉 (앞쪽 왼편)
      const px0 = 2;
      k.add({ type: 'picnicTable', x: px0, y: F + 3 }, px0, F + 3, 4, 2);
      for (const [dx, dy, face] of [[0.6, -0.35, '+y'], [2.0, -0.35, '+y'], [0.6, 2.25, '-y'], [2.0, 2.25, '-y']]) k.rest({ x: px0 + dx, y: F + 3 + dy, face, pose: 'sit' }, '꽃밭 피크닉');
      k.add({ type: 'parasol', x: px0 + 1.5, y: F + 4, color: '#f2a7c3' });
      if (DX - 3 >= px0 + 4 + 5) {
        k.add({ type: 'picnicTable', x: px0 + 5, y: F + 3 }, px0 + 5, F + 3, 4, 2);
        for (const [dx, dy, face] of [[0.6, -0.35, '+y'], [2.0, -0.35, '+y'], [0.6, 2.25, '-y'], [2.0, 2.25, '-y']]) k.rest({ x: px0 + 5 + dx, y: F + 3 + dy, face, pose: 'sit' }, '꽃밭 피크닉');
        k.add({ type: 'parasol', x: px0 + 6.5, y: F + 4, color: '#f6c445' });
      }
      k.sign(px0, F + 2.4, '🧺 꽃밭 피크닉', '#e2667f');
      cafeSet(k, px0 + 1, F + 8, '#e2667f', '꽃밭 카페'); cafeSet(k, px0 + 5, F + 8, '#a67be0', '꽃밭 카페');
      k.add({ type: 'flowerStand', x: px0, y: F + 11, w: 3, seed: 5 }, px0, F + 11, 3, 1);
      k.npc('꽃집 직원', { x: px0 + 1.5, y: F + 12.5, face: '-y' }, { hat: 'bow', accent: '#e2667f', say: '💐 한 다발 어때요?' });
      picnicMats(S, OUT, k, [[2, H - 6, '#e5534b'], [Math.min(DX - 5, 7), H - 9, '#4e7cf6'], [mx + 4, H - 5, '#3fb27f']], '꽃밭 돗자리');
      S.park.wander.push({ x: px0 + 1.5, y: F + 12.4, face: '-y', food: 'icecream' }, { x: mx - 2, y: my + 5.5, face: '-y' }, { x: DX + 1, y: F + 6, face: '+y' });
      S.park.play.push({ lv: OUT.idx, x: mx + 1.5, y: my + 6, face: '+y', pose: 'stand', ball: true });
      // 꽃밭 장식: 앞쪽 줄 꽃밭 · 꽃덤불
      for (let y = F + 13; y < H - 2; y += 3) for (let x = DX + 4; x + 6 < W - 2; x += 8) if (k.free(x, y, 6, 1)) { const kinds = ['tulip', 'lavender', 'rose']; const kk = kinds[(x + y) % 3]; k.G.decals.push({ type: 'ob_flowerRow', x, y, w: 6, d: 1, kind: kk }); k.solid(x, y, 6, 1); }
      scatter(k, 91, 1, 1, W - 1, H - 1, Math.round(W * H / 90), (x, y, r) => { k.add({ type: 'flowerBush', x: x + 0.5, y: y + 0.5, size: 0.9 + r() * 0.3, seed: x * 3 + y }, x, y); });
      scatter(k, 93, 1, 1, W - 1, H - 1, 6, (x, y) => { k.tree(x, y, 1, 'cherry'); });
      S.pets = [{ kind: 'dog', color: '#f4ead8' }, { kind: 'cat', color: '#f0a050' }, { kind: 'hen', chicks: 4 }];
      S.door = { lv: OUT.idx, x: DX + 1, y: H - 1.2, face: '-y' };
    },
  });

  // ================================================================ ♨️ 온천 마을 소품
  /** 노천탕 물 (구불구불한 바위 테두리 · 우윳빛 옥색 물) */
  C.decal('ob_onsen', (g, d) => {
    const { cx, cy } = d, rx = d.wrx, ry = d.wry, r = AIO.rand(Math.round(cx * 11 + cy * 5));
    const rad = (a, k) => 1 + 0.07 * Math.sin(3 * a + cx) + 0.04 * Math.sin(5 * a + cy) + k;
    const shape = (q, k, sx = rx, sy = ry) => { q.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, f = rad(a, k); const px = cx + Math.cos(a) * sx * f, py = cy + Math.sin(a) * sy * f; i ? q.lineTo(px, py) : q.moveTo(px, py); } q.closePath(); };
    TS(g, (q) => {
      shape(q, 0.28); q.fillStyle = '#8f8a80'; q.fill();
      shape(q, 0.08); q.fillStyle = '#6fa9b0'; q.fill();
      shape(q, 0.02); q.fillStyle = '#9fd8d6'; q.fill();
      shape(q, -0.25); q.fillStyle = '#b8e6e2'; q.fill();
    });
    for (let i = 0; i < 34; i++) { const a = i / 34 * Math.PI * 2 + r() * 0.1, f = rad(a, 0.19), [sx, sy] = P(cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f, 0); const c = ['#a9a296', '#9a948a', '#b8b2a6'][i % 3]; g.fillStyle = shade(c, -0.25); g.beginPath(); g.ellipse(sx, sy + 1.5, 7 + r() * 3, 4, 0, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.ellipse(sx, sy - 1, 7 + r() * 3, 4.2, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(sx - 2, sy - 2.5, 3, 1.4, 0, 0, 7); g.fill(); }
  });
  /** 개울 (y 방향 · 자갈 둑) */
  C.decal('ob_stream', (g, d) => {
    const { x, y, w } = d, dd = d.d, r = AIO.rand(Math.round(x * 17 + y));
    rect(g, x - 0.2, y, w + 0.4, dd, '#bdb5a3'); rect(g, x, y, w, dd, '#5fb0d4'); rect(g, x + w * 0.25, y, w * 0.5, dd, '#7cc6e2');
    for (let i = 0; i < dd * 2; i++) { const [sx, sy] = P(x + 0.3 + r() * (w - 0.6), y + r() * dd); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(sx + 5, sy - 2.5); g.lineTo(sx - 5, sy + 2.5); g.stroke(); }
    for (let i = 0; i < dd * 3; i++) { const side = r() < 0.5 ? x - 0.1 : x + w + 0.1; dot(g, side, y + r() * dd, 0, 1.6 + r() * 1.6, r() < 0.5 ? '#9a948a' : '#d6cfc0'); }
  });
  /** ♨️ 김 (모락모락 피어오름) */
  C.prop('ob_steam', { dynamic: true, depth: (f) => f.x + f.y + (f.ry || 2) + 1, draw(ctx, f, t, I) {
    if (!live(I)) return;
    const n = f.n || 10, r = AIO.rand(Math.round(f.x * 7 + f.y));
    for (let i = 0; i < n; i++) {
      const bx = f.x + (r() - 0.5) * 1.6 * (f.rx || 2), by = f.y + (r() - 0.5) * 1.6 * (f.ry || 2), sp = 0.12 + r() * 0.08, ph = (t * sp + r()) % 1;
      const [sx, sy] = P(bx, by, 4 + ph * 64);
      const a = Math.sin(Math.PI * ph) * 0.45;
      ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(sx + Math.sin(t * 0.8 + i) * 6 * ph, sy, 6 + ph * 12, 0, 7); ctx.fill();
    }
  } });
  /** 🦶 족욕탕 (나무 홈통 · 따뜻한 물) x 방향 w × 1 */
  C.prop('ob_footbath', { slice: 1, draw(ctx, f, t, I) {
    const { x, y, w } = f;
    box(ctx, x, y + 0.1, 0, w, 0.8, 7, '#a87a52', '#8a6247', '#7a5540', 'rgba(0,0,0,0.2)');
    rect(ctx, x + 0.12, y + 0.22, w - 0.24, 0.56, '#7fc9c9', 6.6);
    for (let i = 0; i < w * 2; i++) { const [sx, sy] = P(x + 0.3 + i * 0.5, y + 0.5, 7); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(sx, sy, 3 + Math.sin(t * 2 + i) * 0.8, 1.2, 0, 0, 7); ctx.stroke(); }
    if (live(I)) for (let i = 0; i < w; i++) { const ph = (t * 0.25 + i * 0.37) % 1, [sx, sy] = P(x + 0.5 + i, y + 0.5, 8 + ph * 30); ctx.fillStyle = `rgba(255,255,255,${Math.sin(Math.PI * ph) * 0.3})`; ctx.beginPath(); ctx.arc(sx, sy, 4 + ph * 6, 0, 7); ctx.fill(); }
    onPlaneY(ctx, x + 0.2, y + 0.9, 6, (g) => { g.fillStyle = '#f6efe0'; g.font = `bold 4px ${FONT}`; g.fillText('♨ 족욕 · 무료', 2, 4.5); });
  } });
  /** ♨️ 온천 간판 기둥 (나무 판 · 노렌) */
  C.prop('ob_onsenGate', { slice: 0.5, draw(ctx, f, t) {
    const { x, y, w } = f;
    for (const px of [x + 0.15, x + w - 0.25]) sbox(ctx, px, y + 0.15, 0, 0.12, 0.12, 64, '#6b4a35');
    box(ctx, x - 0.2, y + 0.1, 64, w + 0.4, 0.25, 5, '#5a3e2c', '#4d3526', '#3b2a20');
    onPlaneY(ctx, x + 0.2, y + 0.36, 62, (g) => { const Wl = (w - 0.4) * 32; for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#2f4f7a' : '#3a5f8f'; g.fillRect(i * Wl / 4 + 0.5, 0, Wl / 4 - 1, 22 + Math.sin(t * 1.5 + i) * 1.2); } g.fillStyle = '#ffffff'; g.font = `bold 10px ${FONT}`; g.fillText('♨', Wl / 2 - 5, 15); });
    onPlaneY(ctx, x + w / 2 - 0.6, y + 0.36, 80, (g) => signBoard(g, 38, 12, '#f6efe0', '#7a2a1a', f.text || '노천 온천', 7));
    sbox(ctx, x + w / 2 - 0.04, y + 0.2, 64, 0.08, 0.08, 6, '#6b4a35');
  } });

  // ================================================================ ♨️ 온천 마을
  C.outdoor({
    id: 'onsen', icon: '♨️', name: '온천 마을', desc: '노천 온천 · 모락모락 김 · 대나무 울타리 · 석등 · 족욕 · 유카타 손님 · 등불 · 작은 다리',
    size: (B) => ({ W: B.W + 36, H: B.H + 30 }),
    lot(S, OUT, B, k) {
      OUT.ground.base = { color: '#a9bf8e', tufts: ['#8fa874', '#c3d4a8'], edge: '#7d6a52', edge2: '#6b5a45' };
      const TX = 3, TY = 3;
      k.place(B, TX, TY);
      const W = k.W, H = k.H, F = k.front, R = k.right, DX = Math.floor(TX + B.doorX);
      const stone = { color: '#d9d2c2', edge: '#aaa190', dots: true };
      // 🏮 온천 거리: 정문 → 남쪽
      k.curve([[DX + 1, F + 0.5], [DX + 1, H - 0.5]], 2, stone);
      for (let y = F + 3; y < H - 2; y += 4) for (const x of [DX - 1, DX + 2]) if (k.free(x, y)) k.add({ type: (y / 4) % 2 < 1 ? 'ob_lantern' : 'stoneLantern', x: x + 0.5, y: y + 0.5, color: '#e5534b', text: '湯' }, x, y);
      k.sign(DX + 3.2, H - 1.6, '🏮 온천 거리', '#c43d32');
      // 🌉 개울 + 작은 다리 (온천 가는 길)
      const SX = Math.max(DX + 6, R - 3), sy0 = F + 1;
      k.water(SX, sy0, 2, H - sy0, { type: 'ob_stream', x: SX, y: sy0, w: 2, d: H - sy0 });
      const bY = F + 4;
      k.curve([[DX + 2, bY + 0.5], [SX - 0.5, bY + 0.5]], 1.4, stone);
      OUT.bridges = [{ x: SX - 1, y: bY, w: 4, d: 1 }];
      k.add({ type: 'bridge', x: SX - 1, y: bY, w: 4 });
      k.sign(SX - 3, bY - 0.8, '🌉 작은 다리', '#7a5540');
      // ♨️ 노천탕 2개 (개울 건너 · 대나무 울타리)
      const ox0 = SX + 3, ox1 = W - 2, oy0 = F - 4, oy1 = H - 2;
      const pools = [[ox0 + (ox1 - ox0) * 0.32, oy0 + (oy1 - oy0) * 0.3, 4.2, 3], [ox0 + (ox1 - ox0) * 0.66, oy0 + (oy1 - oy0) * 0.7, 4.6, 3.2]];
      k.area(ox0 - 0.5, oy0 - 0.5, ox1 - ox0 + 1, oy1 - oy0 + 1, 'tile', '#d3cab8', 1);
      k.curve([[SX + 3, bY + 0.5], [ox0 + 1, bY + 0.5]], 1.4, stone);
      for (let x = ox0 - 1; x < ox1; x++) { k.add({ type: 'ob_bambooFence', x, y: oy0 - 1, axis: 'x' }); k.K.block(x, oy0 - 2); }
      for (let y = oy0 - 1; y < oy1; y++) { k.add({ type: 'ob_bambooFence', x: ox1, y, axis: 'y' }); k.K.block(ox1, y); }
      k.add({ type: 'ob_onsenGate', x: DX - 0.85, y: F + 2, w: 3.7, text: '온천 마을' }); k.solid(DX - 1, F + 2, 1, 1); k.solid(DX + 2, F + 2, 1, 1);
      pools.forEach(([cx, cy, rx, ry], i) => {
        k.G.decals.push({ type: 'ob_onsen', cx, cy, rx: rx + 2, ry: ry + 2, wrx: rx, wry: ry });
        waterEllipse(k, cx, cy, rx - 0.3, ry - 0.3);
        k.K.add({ type: 'ob_steam', x: cx, y: cy, rx, ry, n: 18 });
        let n = 0;
        for (let q = 0; q < 16 && n < 7; q++) {
          const a = q / 16 * Math.PI * 2 + 0.2 + i, px = cx + Math.cos(a) * (rx + 0.35), py = cy + Math.sin(a) * (ry + 0.35);
          { const u = k.used[Math.floor(py) * W + Math.floor(px)]; if (u === 2 || u === 4) continue; }
          const face = Math.abs(Math.cos(a)) * rx > Math.abs(Math.sin(a)) * ry ? (Math.cos(a) > 0 ? '-x' : '+x') : (Math.sin(a) > 0 ? '-y' : '+y');
          k.rest({ x: px, y: py, face, pose: 'sit', carry: null }, i ? '노천탕 (여유)' : '노천탕 (전망)'); n++;
        }
        k.add({ type: 'ob_rock', x: cx - rx - 0.3, y: cy - ry * 0.5, size: 1.2, moss: true, seed: 5 + i }, Math.floor(cx - rx - 0.8), Math.floor(cy - ry * 0.5));
        k.add({ type: 'stoneLantern', x: cx + rx + 0.9, y: cy - ry - 0.4 }, Math.floor(cx + rx + 0.4), Math.floor(cy - ry - 0.9));
      });
      k.sign(ox0, oy0 - 0.4, '♨️ 노천 온천', '#c43d32');
      for (let q = 0; q < 6; q++) { const y = oy0 + 1 + q * 3; if (y < oy1 - 1 && k.free(ox1 - 1, y)) k.add({ type: 'ob_bamboo', x: ox1 - 0.6, y: y + 0.5, n: 6, seed: q }, ox1 - 1, y); }
      // 🦶 족욕 (거리 왼쪽)
      const fbw = Math.max(4, Math.min(6, DX - 4)), fbx = 2, fby = F + 4;
      k.add({ type: 'ob_footbath', x: fbx, y: fby, w: fbw }, fbx, fby, fbw, 1);
      for (let q = 0; q < fbw - 1; q++) {
        k.add({ type: 'bench', x: fbx + 0.5 + q, y: fby - 0.75, w: 1, color: '#8a6247' }); k.add({ type: 'bench', x: fbx + 0.5 + q, y: fby + 1.15, w: 1, color: '#8a6247' });
        k.rest({ x: fbx + 1 + q, y: fby - 0.35, face: '+y', pose: 'sit', carry: null }, '족욕');
        k.rest({ x: fbx + 1 + q, y: fby + 1.35, face: '-y', pose: 'sit', carry: null }, '족욕');
      }
      k.sign(fbx, fby + 2.4, '🦶 족욕탕', '#2f7d4f');
      // 유카타 손님 · 여관 주인
      k.npc('여관 주인', { x: DX - 1.5, y: F + 2.5, face: '+y' }, { hat: null, accent: '#7a2a1a', say: '♨️ 어서 오세요~' });
      k.npc('유카타 손님', { x: DX + 1, y: F + 9, face: '+y' }, { hat: null, accent: '#4e7cf6', say: '♨️ 물이 딱 좋아요', patrol: [{ x: DX + 1, y: F + 9, face: '+y' }, { x: ox0 + 2, y: bY + 1.5, face: '+x' }, { x: fbx + 2, y: fby + 2.5, face: '-y' }] });
      k.npc('유카타 손님', { x: DX, y: H - 4, face: '-y' }, { hat: 'bow', accent: '#e2667f', say: '🍡 경단 먹으러 가요', patrol: [{ x: DX, y: H - 4, face: '-y' }, { x: DX + 1, y: F + 6, face: '+y' }] });
      // 🍡 경단 가게 (노점)
      if (k.free(2, F + 9, 4, 2)) { k.add({ type: 'cafeKiosk', x: 2, y: F + 9, w: 3 }, 2, F + 9, 4, 2); k.sign(2, F + 11.6, '🍡 경단 · 온천 달걀', '#a8691a'); }
      k.sign(ox1 - 8, oy1 + 0.6, '🎋 대나무 울타리', '#3f8a45');
      // 단풍 · 대나무 · 바위
      for (let x = 1; x < W - 1; x += 2) if (k.free(x, 1)) k.add({ type: 'ob_bamboo', x: x + 0.5, y: 1.4, n: 5, seed: x * 5 }, x, 1);
      scatter(k, 101, 1, 1, W - 1, H - 1, Math.round(W * H / 85), (x, y, r) => { k.tree(x, y, 0.95 + r() * 0.25, r() < 0.6 ? 'maple' : 'pine'); });
      scatter(k, 103, 1, 1, W - 1, H - 1, Math.round(W * H / 170), (x, y, r) => { k.add({ type: 'ob_rock', x: x + 0.5, y: y + 0.5, size: 0.6 + r() * 0.5, moss: true, seed: x * 3 + y }, x, y); });
      S.park = { mats: [], wander: [{ x: DX + 1, y: F + 7, face: '+y' }, { x: SX - 2, y: bY + 1.5, face: '+x' }, { x: ox0 + 1, y: bY + 1.5, face: '+y' }], play: [] };
      S.pets = [{ kind: 'cat', color: '#f4ead8' }, { kind: 'cat', color: '#f0a050' }, { kind: 'cat', color: '#8a8f96' }];
      S.door = { lv: OUT.idx, x: DX + 1, y: H - 1.2, face: '-y' };
    },
  });
  // ================================================================ 🚉 기차역 소품
  /** 선로 (자갈 · 침목 · 레일 2줄) — x 방향, d=2 */
  C.decal('ob_rails', (g, d) => {
    const { x, y, w } = d, dd = d.d || 2;
    rect(g, x, y, w, dd, '#a39a8c');
    const r = AIO.rand(Math.round(y * 7));
    for (let i = 0; i < w * dd * 6; i++) dot(g, x + r() * w, y + r() * dd, 0, 0.9, r() < 0.5 ? '#8f877a' : '#b9b1a3');
    for (let i = x + 0.2; i < x + w; i += 0.55) rect(g, i, y + 0.2, 0.22, dd - 0.4, '#7a5a3a');
    for (const ry of [y + dd * 0.3, y + dd * 0.7]) { rect(g, x, ry - 0.06, w, 0.12, '#6d757c'); rect(g, x, ry - 0.06, w, 0.04, '#d9dde1'); }
  });
  /** 승강장 끝 (노란 점자블록 · 흰 선) */
  C.decal('ob_platformEdge', (g, d) => {
    const { x, y, w } = d;
    rect(g, x, y, w, 0.3, '#f2c230');
    for (let i = x + 0.1; i < x + w; i += 0.25) dot(g, i, y + 0.15, 0, 0.9, '#d9a020');
    rect(g, x, y - 0.25, w, 0.06, '#ffffff');
    poly(g, [P(x, y + 0.3), P(x + w, y + 0.3), P(x + w, y + 0.3, -8), P(x, y + 0.3, -8)], '#9d968a');
  });
  /** 택시 승강장 바닥 */
  C.decal('ob_taxiBay', (g, d) => {
    const { x, y, w } = d, dd = d.d;
    rect(g, x, y, w, dd, '#6a6e73'); rect(g, x, y, w, 0.08, '#f2c230'); rect(g, x, y + dd - 0.08, w, 0.08, '#f2c230');
    for (let i = x + 1; i < x + w - 1; i += 4) { const [sx, sy] = P(i, y + dd / 2); g.save(); g.translate(sx, sy); g.transform(1, 0.5, -1, 0.5, 0, 0); g.fillStyle = '#f2c230'; g.font = `bold 9px ${FONT}`; g.fillText('TAXI', -10, 3); g.restore(); }
  });
  /** 승강장 지붕 (x 방향, 깊이 2) */
  C.prop('ob_canopy', { slice: 1.6, draw(ctx, f) {
    const { x, y, w } = f, Z = 80, y1 = y + 1.7;
    sbox(ctx, x + 0.05, y + 0.4, 0, 0.14, 0.14, Z, '#8d959c'); if (f.part === f.parts - 1) sbox(ctx, x + w - 0.2, y + 0.4, 0, 0.14, 0.14, Z, '#8d959c');
    poly(ctx, [P(x, y - 0.3, Z + 6), P(x + w, y - 0.3, Z + 6), P(x + w, y1, Z), P(x, y1, Z)], '#5f8fb3', 'rgba(0,0,0,0.2)');
    poly(ctx, [P(x, y1, Z), P(x + w, y1, Z), P(x + w, y1, Z - 3), P(x, y1, Z - 3)], '#3f6f93');
    for (let i = 0.3; i < w; i += 0.8) poly(ctx, [P(x + i, y - 0.3, Z + 6.1), P(x + i + 0.05, y - 0.3, Z + 6.1), P(x + i + 0.05, y1, Z + 0.1), P(x + i, y1, Z + 0.1)], 'rgba(255,255,255,0.2)');
  } });
  /** 역 이름판 (지하철 스타일) */
  C.prop('ob_stationSign', { draw(ctx, f) {
    const { x, y } = f;
    for (const dx of [0.1, 1.9]) sbox(ctx, x + dx, y, 0, 0.08, 0.08, 34, '#5d6166');
    onPlaneY(ctx, x, y + 0.05, 52, (g) => {
      g.fillStyle = '#ffffff'; roundRect(g, 0, 0, 64, 18, 3); g.fill(); g.strokeStyle = '#2f9e5f'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#2f9e5f'; g.beginPath(); g.arc(32, 7.5, 5, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `bold 5px ${FONT}`; g.fillText('AI', 29, 9.5);
      g.fillStyle = '#2b2622'; g.font = `bold 6px ${FONT}`; g.fillText(f.text || 'AI역', 25, 16.5);
      g.font = `4px ${FONT}`; g.fillText('◀ ' + (f.prev || '연구소'), 2, 9); g.fillText((f.next || '캠퍼스') + ' ▶', 46, 9);
    });
  } });
  /** 🕰️ 시계탑 (실제 시각) */
  C.prop('ob_clockTower', { draw(ctx, f, t, I) {
    const { x, y } = f, H = 120, n = isNight(I);
    shadow(ctx, x + 0.4, y + 0.4, 1.1, 0.8, 0.2);
    box(ctx, x - 0.8, y - 0.8, 0, 1.6, 1.6, 8, '#bdb7ab', '#a9a296', '#968f84');
    box(ctx, x - 0.55, y - 0.55, 8, 1.1, 1.1, H - 30, '#c97a5a', '#b5523b', '#9c4532', 'rgba(0,0,0,0.15)');
    box(ctx, x - 0.65, y - 0.65, H - 22, 1.3, 1.3, 26, '#f4efe6', '#e6dfd2', '#d6cfc3', 'rgba(0,0,0,0.15)');
    const now2 = new Date(), hh = now2.getHours() % 12 + now2.getMinutes() / 60, mm = now2.getMinutes() + now2.getSeconds() / 60;
    const face = (g) => { g.fillStyle = n ? '#fff3c4' : '#ffffff'; g.beginPath(); g.arc(21, 13, 11, 0, 7); g.fill(); g.strokeStyle = '#2b2622'; g.lineWidth = 1.2; g.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.fillStyle = '#2b2622'; g.fillRect(21 + Math.sin(a) * 9 - 0.5, 13 - Math.cos(a) * 9 - 0.5, 1, 1); } g.lineCap = 'round'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(21, 13); g.lineTo(21 + Math.sin(hh / 12 * 6.283) * 5.5, 13 - Math.cos(hh / 12 * 6.283) * 5.5); g.stroke(); g.lineWidth = 1; g.beginPath(); g.moveTo(21, 13); g.lineTo(21 + Math.sin(mm / 60 * 6.283) * 8.5, 13 - Math.cos(mm / 60 * 6.283) * 8.5); g.stroke(); };
    onPlaneY(ctx, x - 0.65, y + 0.65, H - 2, face); onPlaneX(ctx, x + 0.65, y + 0.65, H - 2, face);
    const [tx, ty] = P(x, y, H + 4);
    ctx.fillStyle = '#2f6b4f'; ctx.beginPath(); ctx.moveTo(tx - 30, ty + 2); ctx.lineTo(tx, ty - 34); ctx.lineTo(tx + 30, ty + 2); ctx.lineTo(tx, ty + 17); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#245a41'; ctx.beginPath(); ctx.moveTo(tx, ty - 34); ctx.lineTo(tx + 30, ty + 2); ctx.lineTo(tx, ty + 17); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(tx, ty - 36, 2.4, 0, 7); ctx.fill();
    if (n) { const [gx, gy] = P(x, y + 0.65, H - 15); glow(ctx, gx, gy, 40, '255,240,190', 0.4); }
  } });
  /** 🍱 도시락 가판대 */
  C.prop('ob_bentoStall', { slice: 1.2, draw(ctx, f, t, I) {
    const { x, y } = f, w = 3;
    box(ctx, x, y, 0, w, 1.2, 22, '#f4efe6', '#e6dfd2', '#d6cfc3', 'rgba(0,0,0,0.15)');
    box(ctx, x - 0.05, y - 0.05, 22, w + 0.1, 1.3, 2, '#c49a62', '#a87a52', '#8a6247');
    for (let i = 0; i < 6; i++) { const bx = x + 0.2 + (i % 3) * 0.95, by = y + 0.15 + Math.floor(i / 3) * 0.5; box(ctx, bx, by, 24, 0.8, 0.4, 3, ['#e5534b', '#2b2622', '#3fb27f'][i % 3], shade('#2b2622', 0.2), '#2b2622'); rect(ctx, bx + 0.08, by + 0.06, 0.3, 0.28, '#f6efe0', 27.1); rect(ctx, bx + 0.42, by + 0.06, 0.3, 0.28, ['#e9a23b', '#7cc472', '#f2a7c3'][i % 3], 27.1); }
    for (const px of [x + 0.05, x + w - 0.12]) sbox(ctx, px, y + 0.05, 0, 0.07, 0.07, 58, '#8d959c');
    for (let i = 0; i < 6; i++) { const u0 = -0.15 + i * (w + 0.3) / 6, u1 = u0 + (w + 0.3) / 6; poly(ctx, [P(x + u0, y - 0.1, 58), P(x + u1, y - 0.1, 58), P(x + u1, y + 1.7, 48), P(x + u0, y + 1.7, 48)], i % 2 ? '#ffffff' : '#e5534b'); }
    onPlaneY(ctx, x + 0.2, y + 1.71, 56, (g) => signBoard(g, 70, 10, '#2b2622', '#f6c445', '🍱 역 도시락 · 김밥', 6.5));
    onPlaneY(ctx, x + 0.1, y + 1.2, 20, (g) => { g.fillStyle = '#2b2622'; g.font = `bold 5px ${FONT}`; g.fillText('🍙 3,500  🍱 6,900', 4, 9); });
  } });
  /** 🚆 기차 한 칸 (x 방향 · 시간에 따라 들어와서 서고 떠남) */
  C.prop('ob_trainCar', { dynamic: true, depth: (f) => f.x + 2.4 + f.y + 0.6, draw(ctx, f, t, I) {
    if (!live(I)) return;
    const x = f.x, y = f.y, L = 4.8, Wd = 1.15, H = 34, c = f.color || '#1f9fb4', n = isNight(I);
    if (x < -6 || x > f.W + 1) return;
    ellipseFloor(ctx, x + L / 2, y + Wd / 2, L / 2 + 0.1, 0.7, 0, 'rgba(0,0,0,0.18)');
    for (const wx of [0.6, 1.3, L - 1.3, L - 0.6]) { const [sx, sy] = P(x + wx, y + Wd, 3); ctx.fillStyle = '#2b2f36'; ctx.beginPath(); ctx.ellipse(sx, sy, 4, 3.4, 0, 0, 7); ctx.fill(); }
    box(ctx, x, y, 4, L, Wd, H, '#e9edf1', '#f4f6f8', '#d2d8de', 'rgba(0,0,0,0.25)');
    onPlaneY(ctx, x, y + Wd, H + 4, (g) => {
      const Wl = L * 32;
      g.fillStyle = c; g.fillRect(0, H - 12, Wl, 5); g.fillStyle = shade(c, -0.25); g.fillRect(0, H - 7, Wl, 2);
      for (let i = 0; i < 7; i++) { const wx = 6 + i * 21; if (i === 3) { g.fillStyle = '#c4cbd2'; g.fillRect(wx - 2, 6, 14, H - 8); g.fillStyle = n ? '#fff3c4' : '#9fc3d8'; g.fillRect(wx, 8, 4, 12); g.fillRect(wx + 6, 8, 4, 12); continue; } g.fillStyle = n ? '#fff3c4' : '#7fa7c4'; roundRect(g, wx, 7, 15, 11, 2); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(wx + 2, 8, 3, 9); }
      if (f.lead) { g.fillStyle = shade(c, -0.1); g.font = `bold 5px ${FONT}`; g.fillText(f.label || 'AI 급행', 6, 4.8); }
    });
    if (f.lead) {
      onPlaneX(ctx, x + L, y + Wd, H + 4, (g) => { g.fillStyle = '#2b3a4a'; roundRect(g, 3, 5, 31, 12, 3); g.fill(); g.fillStyle = c; g.fillRect(0, H - 12, 37, 5); g.fillStyle = n ? '#fff2b0' : '#f6e7a0'; g.beginPath(); g.arc(7, H - 16, 2, 0, 7); g.arc(30, H - 16, 2, 0, 7); g.fill(); });
      if (n) { const [lx, ly] = P(x + L, y + Wd / 2, 14); glow(ctx, lx + 20, ly + 10, 60, '255,240,180', 0.35); }
      sbox(ctx, x + 1.4, y + 0.4, H + 4, 0.4, 0.4, 3, '#5d6166');
      const [p1, p2] = P(x + 1.6, y + 0.6, H + 7), [q1, q2] = P(x + 2.4, y + 0.6, H + 20); ctx.strokeStyle = '#3b3f45'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p1, p2); ctx.lineTo(q1, q2); ctx.lineTo(q1 - 14, q2 + 2); ctx.stroke();
    }
    box(ctx, x + 0.1, y + 0.1, H + 4, L - 0.2, Wd - 0.2, 2, '#c4cbd2', '#b5bbc0', '#a9b0b6');
  } });

  // ================================================================ 🚉 기차역 앞
  C.outdoor({
    id: 'station', icon: '🚉', name: '기차역 앞', desc: '역 광장 · 시계탑 · 버스·택시 승강장 · 도시락 가판대 · 승강장 · 지나가는 기차',
    size: (B) => ({ W: B.W + 34, H: B.H + 31 }),
    lot(S, OUT, B, k) {
      OUT.ground.base = { color: '#cfcac0', tufts: null, edge: '#8f897e', edge2: '#7d776d' };
      const TX = 3, TY = 3;
      k.place(B, TX, TY);
      const W = k.W, H = k.H, F = k.front, R = k.right, DX = Math.floor(TX + B.doorX);
      // 🚉 역 광장
      k.plaza(0, F, W, 9, '#e8e2d6');
      k.G.rounds.push({ cx: DX + 9, cy: F + 4.5, r: 3.6, color: '#efe7d6' });
      k.add({ type: 'ob_clockTower', x: DX + 9.5, y: F + 4.5 }, DX + 8, F + 3, 3, 3);
      k.sign(DX + 6, F + 8.4, '🕰️ 시계탑 광장', '#2f6b4f');
      for (const [bx, by] of [[DX + 5.4, F + 1], [DX + 11, F + 1]]) if (bx + 3 < W - 1) benchSeats(k, bx, by, 2, '역 광장 벤치', { color: '#6d8fa8' });
      // 🍱 도시락 가판대 + 테이블 (광장 왼쪽)
      k.add({ type: 'ob_bentoStall', x: 2, y: F + 1 }, 2, F + 1, 3, 2);
      k.npc('도시락 판매원', { x: 3.5, y: F + 3.4, face: '+y' }, { hat: 'beret', accent: '#e5534b', say: '🍱 따끈한 도시락!' });
      cafeSet(k, 2, F + 5, '#e5534b', '도시락 테이블'); if (DX - 3 >= 9) cafeSet(k, 6, F + 5, '#f2c230', '도시락 테이블');
      k.sign(2, F + 7.4, '🍱 도시락 가판대', '#c47f22');
      // 🚌 역앞길 + 🚕 택시 승강장 + 버스 정류장
      const RY = F + 10;
      const road = k.road(RY, '역앞길');
      k.cross(road, DX - 1);
      S.traffic = { roads: k.roads, cross: k.G.cross };
      const tbx = DX + 14, tbw = Math.min(12, W - tbx - 2);
      k.G.decals.push({ type: 'ob_taxiBay', x: tbx, y: F + 6.6, w: tbw, d: 1.6 });
      for (let i = 0; i + 2 < tbw && i < 12; i += 3.4) k.add({ type: 'parkedCar', x: tbx + 0.4 + i, y: F + 6.8, axis: 'x', dir: -1, color: '#f2c230' }, Math.floor(tbx + i), F + 6, 3, 2);
      k.sign(tbx, F + 6.2, '🚕 택시 승강장', '#c99620');
      k.npc('택시 기사', { x: tbx + tbw + 0.5, y: F + 5.5, face: '-x' }, { hat: 'cap', accent: '#f2c230', say: '🚕 어디로 모실까요?' });
      const bsx = Math.min(W - 6, DX + 4);
      k.add({ type: 'busStop', x: bsx, y: RY + 4.02 }, bsx, RY + 4, 4, 1);
      k.sign(bsx + 4.2, RY + 5.6, '🚌 버스 승강장', '#2f7d4f');
      // 🚆 승강장 + 선로 + 기차
      const PY = RY + 5;
      k.area(0, PY, W, 3, 'tile', '#dcd8cf', 1);
      k.G.decals.push({ type: 'ob_platformEdge', x: 0, y: PY + 2.7, w: W });
      addSplit(k, { type: 'ob_canopy', x: 1, y: PY, w: W - 2 });
      k.add({ type: 'ob_stationSign', x: Math.floor(W / 2) + 2, y: PY + 2.2, text: 'AI역', prev: '연구소', next: '캠퍼스' }, Math.floor(W / 2) + 2, PY + 2, 2, 1);
      k.sign(1, PY + 0.4, '🚆 1번 승강장', '#1f9fb4');
      for (let bx = 2; bx + 4 < W - 1; bx += 7) if (clear(k, bx, PY + 1, 4, 2) && Math.abs(bx + 2 - (W / 2 + 3)) > 3) benchSeats(k, bx, PY + 1, 3, '승강장 벤치', { color: '#4e7cf6', back: false });
      k.npc('역무원', { x: Math.floor(W / 2) - 1.5, y: PY + 1.5, face: '+y' }, { hat: 'police', accent: '#2b3a67', say: '🚆 열차가 들어옵니다', patrol: [{ x: Math.floor(W / 2) - 1.5, y: PY + 1.5, face: '+y' }, { x: 3.5, y: PY + 2.3, face: '+x' }, { x: W - 4, y: PY + 2.3, face: '-x' }] });
      const T1 = PY + 3, T2 = PY + 5;
      k.water(0, T1, W, 4, { type: 'ob_rails', x: 0, y: T1, w: W, d: 2 });
      k.G.decals.push({ type: 'ob_rails', x: 0, y: T2, w: W, d: 2 });
      // 기차: 들어와서(감속) 승강장에 서고 → 떠남 (90초 주기)
      const stopX = Math.max(2, W / 2 - 10), cars = 4, CL = 5;
      const headX = () => { const p = now() % 90; if (p < 14) { const u = p / 14; return -CL * cars - 4 + (stopX + CL * cars + 4) * (1 - (1 - u) * (1 - u)); } if (p < 40) return stopX; if (p < 56) { const u = (p - 40) / 16; return stopX + (W + 8 - stopX) * u * u; } return -1000; };
      for (let i = 0; i < cars; i++) { const f = { type: 'ob_trainCar', y: T1 + 0.4, W, lead: i === 0, color: '#1f9fb4', label: 'AI 급행' }; moverX(f, () => headX() - i * CL); k.K.add(f); }
      const head2 = () => { const p = (now() + 50) % 70; return W + 4 - p * 2.2; };
      for (let i = 0; i < 3; i++) { const f = { type: 'ob_trainCar', y: T2 + 0.4, W, lead: false, color: '#e9a23b' }; moverX(f, () => head2() + i * CL); k.K.add(f); }
      // 뒤쪽 울타리 · 나무
      for (let x = 1; x < W - 1; x++) k.K.add({ type: 'fence', axis: 'x', x, y: T2 + 3 });
      for (let x = 2; x < W - 1; x += 4) if (T2 + 3 < H - 1) k.tree(x, H - 2, 1, 'ginkgo');
      k.solid(0, T2 + 2, W, H - T2 - 2);
      // 건물 오른쪽: 주차장 · 자전거 거치대
      if (W - R > 14) {
        k.G.decals.push({ type: 'parking', x: R + 2, y: TY + 1, w: Math.min(12, W - R - 4), d: Math.min(12, F - TY - 2), n: 4 }); k.mark(R + 2, TY + 1, Math.min(12, W - R - 4), Math.min(12, F - TY - 2), 1);
        for (let i = 0; i < 3; i++) k.add({ type: 'parkedCar', x: R + 3 + i * 3, y: TY + 2 + (i % 2) * 5, axis: 'y', dir: 1, color: ['#4e7cf6', '#ffffff', '#e5534b'][i] });
        k.add({ type: 'bikeRack', x: R + 2, y: F - 0.7 }, R + 2, F - 1, 3, 1);
      }
      for (const x of [6, Math.round(W / 2), W - 6]) { const f = { type: 'streetLamp', x: x + 0.5, y: RY - 0.6 }; k.K.add(f); OUT.lamps.push(f); }
      scatter(k, 111, R + 1, 1, W - 1, F - 1, 6, (x, y) => { k.tree(x, y, 1, 'ginkgo'); });
      S.pets = [{ kind: 'dog', color: '#d9a066' }];
      S.door = { lv: OUT.idx, x: 0.6, y: PY + 1.5, face: '+x' };
    },
  });

  // ================================================================ 🎪 야시장 소품
  C.floorStyle('ob_night', (g, x, y, w, d, base, r) => {
    for (let i = Math.floor(x); i < x + w; i++) for (let j = Math.floor(y); j < y + d; j++) { if ((i + j) % 2) rect(g, i, j, 1, 1, shade(base, 0.05)); rect(g, i, j, 1, 0.03, 'rgba(0,0,0,0.2)'); rect(g, i, j, 0.03, 1, 'rgba(0,0,0,0.2)'); }
    for (let k2 = 0; k2 < w * d / 6; k2++) { const [sx, sy] = P(x + r() * w, y + r() * d); g.fillStyle = r() < 0.5 ? 'rgba(255,190,110,0.07)' : 'rgba(160,120,255,0.06)'; g.beginPath(); g.ellipse(sx, sy, 20, 10, 0, 0, 7); g.fill(); }
  });
  /** 🏮 포장마차 (주황 천막 · 안쪽 불빛 · 떡볶이/어묵) 3 × 2 */
  C.prop('ob_pojang', { slice: 2, draw(ctx, f, t, I) {
    const { x, y } = f, w = 3, d = 2, c = f.color || '#ff8a3d', H = 40, n = isNight(I);
    shadow(ctx, x + w / 2 + 0.3, y + d / 2 + 0.3, w / 2 + 0.4, 1.3, 0.25);
    box(ctx, x + 0.2, y + 0.9, 0, w - 0.4, 0.6, 18, '#d9dde1', '#c4c9cd', '#b5bbc0');
    cylinder(ctx, x + 0.9, y + 1.15, 18, 0.42, 2, '#c43d32', '#2b2f36'); for (let k = 0; k < 6; k++) dot(ctx, x + 0.75 + (k % 3) * 0.12, y + 1.1 + Math.floor(k / 3) * 0.1, 20.5, 2, '#e5534b');
    box(ctx, x + 1.6, y + 0.95, 18, 0.9, 0.45, 3, '#9aa1a7', '#8d959c', '#7d858c'); for (let k = 0; k < 5; k++) { const [sx, sy] = P(x + 1.7 + k * 0.17, y + 1.15, 21); ctx.strokeStyle = '#a87a52'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 9); ctx.stroke(); ctx.fillStyle = '#f2d39a'; ctx.fillRect(sx - 1.4, sy - 7, 2.8, 4); }
    const [hx, hy] = P(x + 0.9, y + 1.15, 22); ctx.strokeStyle = 'rgba(240,240,240,0.6)'; ctx.lineWidth = 1.2; for (let k = 0; k < 2; k++) { const o = Math.sin(t * 2 + k) * 2; ctx.beginPath(); ctx.moveTo(hx - 3 + k * 6, hy); ctx.quadraticCurveTo(hx + o, hy - 8, hx - o - 3 + k * 6, hy - 16); ctx.stroke(); }
    if (n) { const [gx, gy] = P(x + w / 2, y + 1, 30); glow(ctx, gx, gy, 60, '255,170,90', 0.45); }
    poly(ctx, [P(x, y, 0), P(x + w, y, 0), P(x + w, y, H), P(x, y, H)], rgba(c, 0.85));
    poly(ctx, [P(x + w, y, 0), P(x + w, y + d, 0), P(x + w, y + d, H - 6), P(x + w, y, H)], rgba(shade(c, -0.15), 0.9), 'rgba(0,0,0,0.2)');
    onPlaneX(ctx, x + w, y + d - 0.2, H - 12, (g) => { g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `bold 8px ${FONT}`; g.fillText(f.text || '떡볶이', 3, 12); });
    const roofP = (u, v) => P(x - 0.1 + u, y - 0.1 + v * (d + 0.3), H - v * 6 + Math.sin(v * Math.PI) * 6);
    for (let i = 0; i < 6; i++) { const u0 = i * (w + 0.2) / 6, u1 = (i + 1) * (w + 0.2) / 6; const pts = []; for (let v = 0; v <= 1.001; v += 0.25) pts.push(roofP(u0, v)); for (let v = 1; v >= -0.001; v -= 0.25) pts.push(roofP(u1, v)); poly(ctx, pts, i % 2 ? shade(c, 0.1) : c); }
    const fr = []; for (let u = 0; u <= w + 0.2; u += 0.25) fr.push(roofP(u, 1)); ctx.strokeStyle = shade(c, -0.3); ctx.lineWidth = 1; ctx.beginPath(); fr.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
    ctx.strokeStyle = 'rgba(220,235,245,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); fr.forEach(([px, py], i) => (i ? ctx.lineTo(px, py + 4) : ctx.moveTo(px, py + 4))); ctx.stroke();
    for (const px of [x + 0.05, x + w - 0.1]) sbox(ctx, px, y + d, 0, 0.06, 0.06, H - 6, '#8d959c');
    onPlaneY(ctx, x + 0.3, y + d + 0.2, H + 2, (g) => signBoard(g, (w - 0.6) * 32, 9, '#2b2622', n ? '#ffe07a' : '#f6c445', f.label || '🍢 포장마차', 6.5));
    const [bx, by] = P(x + w / 2, y + d, H - 8); ctx.fillStyle = n ? '#fff2b0' : '#f6e7a0'; ctx.beginPath(); ctx.arc(bx, by + 5, 2.6, 0, 7); ctx.fill(); if (n) glow(ctx, bx, by + 5, 20, '255,230,150', 0.6);
  } });
  /** 플라스틱 간이 테이블 */
  C.prop('ob_plasticTable', { draw(ctx, f) { const { x, y } = f, c = f.color || '#e5534b'; for (const [dx, dy] of [[-0.25, -0.25], [0.2, -0.25], [-0.25, 0.2], [0.2, 0.2]]) sbox(ctx, x + dx, y + dy, 0, 0.05, 0.05, 16, shade(c, -0.15)); cylinder(ctx, x, y, 16, 0.4, 2, shade(c, 0.12), c, 'rgba(0,0,0,0.2)'); cylinder(ctx, x + 0.1, y, 18, 0.1, 6, '#3fb27f', '#2f9e5f'); dot(ctx, x - 0.12, y + 0.05, 19, 2.6, '#f6efe0'); } });
  /** 🎈 풍선 다발 */
  C.prop('ob_balloons', { dynamic: true, draw(ctx, f, t) {
    const { x, y } = f, r = AIO.rand(5), [sx, sy] = P(x, y, 0);
    box(ctx, x - 0.25, y - 0.25, 0, 0.5, 0.5, 12, '#8a6247', '#7a5540', '#6b4a35');
    ctx.save(); ctx.translate(sx, sy); ctx.scale(1.35, 1.35); ctx.translate(-sx, -sy);
    const cols = ['#e5534b', '#4e7cf6', '#f2c230', '#3fb27f', '#a67be0', '#f2a7c3', '#ff9a5a'];
    for (let i = 0; i < 9; i++) { const bx = sx + (r() - 0.5) * 34 + Math.sin(t * 1.3 + i) * 2, by = sy - 50 - r() * 30 + Math.cos(t * 1.1 + i) * 2; ctx.strokeStyle = 'rgba(80,80,80,0.6)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(sx, sy - 10); ctx.lineTo(bx, by + 7); ctx.stroke(); ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.ellipse(bx, by, 6, 7.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(bx - 2, by - 3, 1.6, 2.4, -0.4, 0, 7); ctx.fill(); }
    ctx.restore();
  } });
  /** 🎸 버스킹 무대 (앰프 · 마이크 · 기타 케이스 · 음표) */
  C.prop('ob_busker', { dynamic: true, draw(ctx, f, t, I) {
    const { x, y } = f;
    ellipseFloor(ctx, x + 0.8, y + 0.5, 1.6, 1, 0, 'rgba(160,120,255,0.18)');
    box(ctx, x - 0.2, y - 0.2, 0, 0.6, 0.5, 18, '#2b2f36', '#3b3f45', '#24272b'); onPlaneY(ctx, x - 0.2, y + 0.3, 16, (g) => { g.fillStyle = '#5d6166'; g.beginPath(); g.arc(9, 8, 6, 0, 7); g.fill(); g.fillStyle = '#2b2f36'; g.beginPath(); g.arc(9, 8, 3, 0, 7); g.fill(); });
    sbox(ctx, x + 1.2, y + 0.2, 0, 0.04, 0.04, 34, '#8d959c'); dot(ctx, x + 1.2, y + 0.2, 35, 2.2, '#2b2f36');
    box(ctx, x + 0.3, y + 0.9, 0, 1.3, 0.5, 3, '#2b2622', '#3b2f2a', '#241c18'); rect(ctx, x + 0.38, y + 0.98, 1.14, 0.34, '#c94a3a', 3.1); for (let k = 0; k < 6; k++) dot(ctx, x + 0.5 + k * 0.17, y + 1.1 + (k % 2) * 0.1, 3.4, 1.2, '#f2c230');
    if (live(I)) for (let k = 0; k < 3; k++) { const ph = (t * 0.4 + k / 3) % 1, [nx, ny] = P(x + 1 + Math.sin(ph * 6 + k) * 0.4, y, 40 + ph * 40); ctx.fillStyle = `rgba(255,214,120,${Math.sin(Math.PI * ph)})`; ctx.font = `bold 10px ${FONT}`; ctx.fillText(k % 2 ? '♪' : '♫', nx, ny); }
  } });
  /** 🏮 등불 줄 (줄조명처럼 이어진 종이등) */
  C.prop('ob_lanternLine', { dynamic: true, depth: () => 1e5, draw(ctx, f, t, I) {
    const n = isNight(I), cols = ['#e5534b', '#f2c230', '#ff8a3d', '#f2a7c3'];
    for (const [x, y] of f.pts) sbox(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, 70, '#5a3e2c');
    for (let i = 0; i < f.pts.length - 1; i++) {
      const [x0, y0] = f.pts[i], [x1, y1] = f.pts[i + 1], [ax, ay] = P(x0, y0, 70), [bx, by] = P(x1, y1, 70), mx = (ax + bx) / 2, my = (ay + by) / 2 + 16;
      ctx.strokeStyle = 'rgba(40,30,25,0.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
      const m = Math.max(3, Math.round(Math.hypot(bx - ax, by - ay) / 26));
      for (let k = 1; k < m; k++) {
        const s = k / m, qx = (1 - s) * (1 - s) * ax + 2 * (1 - s) * s * mx + s * s * bx, qy = (1 - s) * (1 - s) * ay + 2 * (1 - s) * s * my + s * s * by + 6, sw = Math.sin(t * 1.5 + k + i) * 1;
        const c = cols[(k + i) % cols.length];
        if (n) glow(ctx, qx + sw, qy, 16, '255,180,100', 0.45);
        ctx.fillStyle = n ? shade(c, 0.25) : c; ctx.beginPath(); ctx.ellipse(qx + sw, qy, 3.6, 4.6, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#2b2622'; ctx.fillRect(qx + sw - 2, qy - 5.4, 4, 1.2); ctx.fillRect(qx + sw - 2, qy + 4.2, 4, 1.2);
      }
    }
  } });

  // ================================================================ 🎪 야시장
  C.outdoor({
    id: 'nightmarket', icon: '🎪', name: '야시장', desc: '포장마차 거리 · 등불 · 줄조명 · 푸드트럭 · 간이 테이블 · 풍선 · 버스킹',
    size: (B) => ({ W: B.W + 34, H: B.H + 30 }),
    lot(S, OUT, B, k) {
      OUT.ground.base = { color: '#4f4a5e', tufts: null, edge: '#2f2b3a', edge2: '#28242f' };
      const TX = 3, TY = 3;
      k.place(B, TX, TY);
      const W = k.W, H = k.H, F = k.front, R = k.right, DX = Math.floor(TX + B.doorX);
      k.area(0, 0, W, H, 'ob_night', '#4f4a5e');
      k.curve([[DX + 1, F + 0.5], [DX + 1, H - 0.5]], 2, { color: '#6a6378', edge: '#3b3646' });
      // 🏮 포장마차 거리: 두 줄 (길 자리는 비움)
      const foods = [['🍢 어묵 · 떡볶이', '떡볶이', '#ff8a3d'], ['🦑 오징어 구이', '오징어', '#e5534b'], ['🥟 만두 · 호떡', '호떡', '#f2c230'], ['🍗 닭꼬치', '닭꼬치', '#ff8a3d'], ['🌽 옥수수 · 군밤', '군밤', '#3fb27f'], ['🍜 잔치국수', '국수', '#4e7cf6']];
      let fi = 0;
      const rows = [F + 2, F + 9];
      const tableCols = ['#e5534b', '#4e7cf6', '#3fb27f', '#f2c230'];
      for (const ry of rows) {
        if (ry + 6 > H - 2) continue;
        for (let x = 2; x + 3 < W - 2; x += 5) {
          if (x + 3 > DX - 1 && x < DX + 3) continue;
          if (!k.free(x, ry, 3, 2)) continue;
          const [label, text, c] = foods[fi % foods.length]; fi++;
          k.add({ type: 'ob_pojang', x, y: ry, label, text, color: c }, x, ry, 3, 2);
          OUT.lamps.push({ x: x + 1.5, y: ry + 2 });
          const tx = x + 1, ty = ry + 3;
          if (k.free(tx - 1, ty, 3, 1)) { k.add({ type: 'ob_plasticTable', x: tx + 0.5, y: ty + 0.5, color: tableCols[fi % 4] }, tx, ty); for (const [dx, face] of [[-1, '+x'], [1, '-x']]) { k.add({ type: 'stool', x: tx + 0.5 + dx, y: ty + 0.5, color: ['#4e7cf6', '#e5534b'][fi % 2] }); k.rest({ x: tx + 0.5 + dx, y: ty + 0.5, face, pose: 'sit', carry: 'mug' }, '포장마차'); } }
        }
        addLine(k, 'ob_lanternLine', [[1.5, ry + 4.5], [W - 1.5, ry + 4.5]], 7);
      }
      k.sign(2, F + 1.6, '🏮 포장마차 거리', '#ff8a3d');
      k.npc('포장마차 사장님', { x: 3.5, y: F + 5.6, face: '+y' }, { hat: 'bucket', accent: '#ff8a3d', carry: 'tray', say: '🍢 어묵 국물 서비스!', patrol: [{ x: 3.5, y: F + 5.6, face: '+y' }, { x: DX - 2.5, y: F + 5.6, face: '-x' }] });
      // 🚚 푸드트럭 존 (건물 오른쪽)
      const kinds = ['tteok', 'burger', 'taco', 'icecream', 'coffee'];
      let ti = 0;
      for (let y = TY + 1; y + 4 < F - 1 && ti < 5; y += 5) for (let x = R + 3; x + 5 < W - 1 && ti < 5; x += 7) { k.add({ type: 'foodTruck', x, y, kind: kinds[ti] }, x, y, 4, 2); OUT.lamps.push({ x: x + 2, y: y + 1.5 }); ti++; }
      k.sign(R + 3, TY + 0.4, '🚚 푸드트럭 존', '#e9a23b');
      const ttY = Math.min(F - 3, TY + 12);
      for (let i = 0; i < 2; i++) if (k.free(R + 3 + i * 4, ttY, 3, 1)) cafeSet(k, R + 4 + i * 4, ttY, '#a67be0', '푸드트럭 테이블', { table: 'ob_plasticTable', stool: '#e5534b' });
      addLine(k, 'stringLights', [[R + 2.5, TY + 0.5], [W - 2.5, TY + 0.5], [W - 2.5, F - 1.5]], 7);
      // 🎸 버스킹 무대 + 관객 벤치 (앞쪽 오른편)
      const bkx = Math.min(W - 10, Math.max(DX + 6, R - 6)), bky = Math.min(H - 8, F + 16);
      k.G.decals.push({ type: 'ob_stageMat', x: bkx - 1, y: bky - 1, w: 4, d: 3 });
      k.add({ type: 'ob_busker', x: bkx, y: bky }, bkx - 1, bky - 1, 3, 2);
      k.npc('버스커', { x: bkx + 0.9, y: bky + 1.4, face: '+y' }, { anim: 'idle', hat: 'beanie', accent: '#a67be0', say: '🎸 신청곡 받아요~' });
      benchSeats(k, bkx - 1.6, bky + 4, 3, '버스킹 관객석', { back: true, color: '#6d5a8a', carry: null });
      k.sign(bkx - 1, bky + 5.8, '🎸 버스킹 무대', '#a67be0');
      OUT.lamps.push({ x: bkx + 1, y: bky + 1 });
      // 🎈 풍선 가게 · 등불 기둥
      const blx = Math.max(2, DX - 6), bly = Math.min(H - 4, F + 16);
      k.add({ type: 'ob_balloons', x: blx + 0.5, y: bly + 0.5 }, blx, bly);
      k.npc('풍선 아저씨', { x: blx + 1.5, y: bly + 1.5, face: '+y' }, { hat: 'cap', accent: '#e5534b', say: '🎈 풍선 하나 2천원!' });
      k.sign(blx - 1, bly + 2.6, '🎈 풍선 가게', '#e5534b');
      for (let y = F + 2; y < H - 2; y += 4) for (const x of [DX - 1, DX + 2]) if (k.free(x, y)) k.add({ type: 'ob_lantern', x: x + 0.5, y: y + 0.5, color: y % 8 < 4 ? '#e5534b' : '#ff8a3d', text: '夜' }, x, y);
      k.sign(DX + 3, H - 1.4, '🎪 야시장 입구', '#f2c230');
      S.park = { mats: [], wander: [{ x: blx + 1.5, y: bly + 1.6, face: '-y', food: 'icecream' }, { x: bkx + 1, y: bky + 3, face: '-y' }, { x: DX + 1, y: F + 7, face: '+y', food: 'coffee' }], play: [] };
      S.pets = [{ kind: 'cat', color: '#2b2b2b' }, { kind: 'cat', color: '#f0a050' }];
      S.door = { lv: OUT.idx, x: DX + 1, y: H - 1.2, face: '-y' };
    },
  });
  C.decal('ob_stageMat', (g, d) => { rect(g, d.x, d.y, d.w, d.d, '#3b3050'); rect(g, d.x + 0.1, d.y + 0.1, d.w - 0.2, d.d - 0.2, '#5a4a7a'); for (let i = 0; i < 8; i++) dot(g, d.x + 0.3 + i * (d.w - 0.6) / 7, d.y + 0.15, 0, 1.4, '#ffe07a'); });

  // ================================================================ 🍇 와이너리 소품
  /** 언덕 (부드러운 그늘 · 등고선) */
  C.decal('ob_hill', (g, d) => {
    TS(g, (q) => {
      const { cx, cy } = d;
      for (let k2 = 0; k2 < 5; k2++) { const s = 1 - k2 * 0.18; q.beginPath(); q.ellipse(cx + k2 * 0.25, cy + k2 * 0.25, d.hrx * s, d.hry * s, 0, 0, 7); q.fillStyle = `rgba(255,250,220,${0.07})`; q.fill(); q.strokeStyle = 'rgba(120,110,60,0.18)'; q.lineWidth = 0.06; q.stroke(); }
      q.beginPath(); q.ellipse(cx + d.hrx * 0.25, cy + d.hry * 0.3, d.hrx * 0.95, d.hry * 0.9, 0, 0.1, Math.PI * 0.75); q.strokeStyle = 'rgba(80,90,40,0.12)'; q.lineWidth = 1.2; q.stroke();
    });
  });
  /** 🍇 포도 덩굴 한 줄 (말뚝 · 철사 · 잎 · 보라 포도송이) x 방향 */
  C.prop('ob_vines', { slice: 0.5, draw(ctx, f, t) {
    const { x, y, w } = f, r = AIO.rand(Math.round(x * 5 + y * 17)), yy = y + 0.5;
    shadow(ctx, x + w / 2 + 0.2, yy + 0.2, w / 2, 0.35, 0.12);
    for (const i of [0, w / 2, w - 0.08]) sbox(ctx, x + i, yy - 0.04, 0, 0.08, 0.08, 30, '#8a6247');
    for (const z of [16, 28]) { const [a, b] = P(x, yy, z), [c, d] = P(x + w, yy, z); ctx.strokeStyle = 'rgba(90,90,90,0.5)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
    for (let i = 0; i < w * 16; i++) { const u = r() * w, z = 10 + r() * 22, [sx, sy] = P(x + u, yy + (r() - 0.5) * 0.35, z); ctx.fillStyle = ['#5fa35a', '#4f9550', '#6db866', '#7cc472'][Math.floor(r() * 4)]; ctx.beginPath(); ctx.ellipse(sx, sy, 6 + r() * 2.5, 4.4, r() - 0.5, 0, 7); ctx.fill(); }
    for (let i = 0; i < w * 2.2; i++) { const u = 0.3 + r() * (w - 0.6), [sx, sy] = P(x + u, yy + 0.18, 14 + r() * 8), col = f.green ? '#b9d36a' : '#7a3f8f'; for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? col : shade(col, 0.15); ctx.beginPath(); ctx.arc(sx + (k % 2) * 2.2 - 1, sy + Math.floor(k / 2) * 2.2, 1.6, 0, 7); ctx.fill(); } }
    void t;
  } });
  /** 🛢️ 오크통 더미 (누운 통 피라미드) */
  function barrel(ctx, x, y, z) {
    const [sx, sy] = P(x, y, z + 9);
    ctx.fillStyle = '#8a5a32'; ctx.beginPath(); ctx.ellipse(sx - 6, sy + 2, 7.5, 9, 0.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#a8713f'; ctx.beginPath(); ctx.moveTo(sx - 6, sy - 7); ctx.lineTo(sx + 12, sy + 2); ctx.lineTo(sx + 12, sy + 20); ctx.lineTo(sx - 6, sy + 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c48a52'; ctx.beginPath(); ctx.ellipse(sx + 12, sy + 11, 7, 9, 0.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5a5e63'; ctx.lineWidth = 1.2; for (const k of [0.25, 0.75]) { ctx.beginPath(); ctx.moveTo(sx - 6 + 18 * k, sy - 7 + 9 * k); ctx.lineTo(sx - 6 + 18 * k, sy + 11 + 9 * k); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(sx + 12, sy + 11, 7, 9, 0.5, 0, 7); ctx.stroke();
    ctx.fillStyle = '#6b4a35'; ctx.beginPath(); ctx.arc(sx + 12, sy + 11, 1.4, 0, 7); ctx.fill();
  }
  C.prop('ob_barrels', { draw(ctx, f) { const { x, y } = f, n = f.n || 3; shadow(ctx, x + 0.5, y + 0.4, 0.9, 0.7); for (let i = 0; i < n; i++) barrel(ctx, x + 0.2, y - 0.4 + i * 0.55, 0); for (let i = 0; i < n - 1; i++) barrel(ctx, x + 0.2, y - 0.12 + i * 0.55, 15); } });
  /** 🍷 와인 저장고 입구 (잔디 언덕에 돌 아치 · 나무 문 · 등) */
  C.prop('ob_cellar', { slice: 3, draw(ctx, f, t, I) {
    const { x, y } = f, w = 4, d = 3, n = isNight(I);
    const [cx, cy] = P(x + w / 2, y + d / 2, 0);
    ctx.fillStyle = '#7fae5a'; ctx.beginPath(); ctx.ellipse(cx, cy - 6, 150, 62, 0, Math.PI, 0); ctx.lineTo(cx + 150, cy + 8); ctx.quadraticCurveTo(cx, cy + 44, cx - 150, cy + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#93c06a'; ctx.beginPath(); ctx.ellipse(cx - 20, cy - 34, 90, 30, 0, Math.PI, 0); ctx.fill();
    box(ctx, x + 0.8, y + d - 0.6, 0, 2.4, 0.6, 40, '#c9bfae', '#b5aa98', '#a39886', 'rgba(0,0,0,0.2)');
    onPlaneY(ctx, x + 0.8, y + d, 40, (g) => {
      g.fillStyle = '#9a8f7c'; for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI; g.fillRect(38 + Math.cos(a) * 26 - 3, 30 + Math.sin(a) * 24 - 3, 7, 6); }
      g.fillStyle = '#5a3e2c'; g.beginPath(); g.moveTo(16, 40); g.lineTo(16, 26); g.arc(38, 26, 22, Math.PI, 0); g.lineTo(60, 40); g.closePath(); g.fill();
      g.fillStyle = '#7a5230'; g.beginPath(); g.moveTo(19, 40); g.lineTo(19, 26); g.arc(38, 26, 19, Math.PI, 0); g.lineTo(57, 40); g.closePath(); g.fill();
      g.strokeStyle = '#5a3e2c'; g.lineWidth = 1; g.beginPath(); g.moveTo(38, 7); g.lineTo(38, 40); for (let k = 24; k < 56; k += 6) { g.moveTo(k, 14); g.lineTo(k, 40); } g.stroke();
      g.fillStyle = '#d9a441'; g.beginPath(); g.arc(35, 28, 1.4, 0, 7); g.arc(41, 28, 1.4, 0, 7); g.fill();
      g.fillStyle = '#2b2622'; roundRect(g, 22, -6, 32, 10, 2); g.fill(); g.fillStyle = '#f6d58a'; g.font = `bold 5.5px ${FONT}`; g.fillText('🍷 CELLAR', 25, 1.5);
    });
    const [lx, ly] = P(x + 3.3, y + d, 34); if (n) glow(ctx, lx, ly, 30, '255,200,120', 0.6); ctx.fillStyle = n ? '#ffe2a0' : '#e0a92a'; ctx.beginPath(); ctx.arc(lx, ly, 3, 0, 7); ctx.fill();
  } });
  /** 🫒 올리브 나무 (뒤틀린 줄기 · 은녹색 잎) */
  C.prop('ob_olive', { draw(ctx, f, t) {
    const { x, y } = f, s = (f.size || 1) * 1.5, r = AIO.rand((f.seed || 1) * 11);
    shadow(ctx, x + 0.2, y + 0.2, 0.5 * s, 0.36 * s);
    const [sx, sy] = P(x, y, 0);
    ctx.strokeStyle = '#7a6a55'; ctx.lineCap = 'round'; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.bezierCurveTo(sx - 6 * s, sy - 10 * s, sx + 6 * s, sy - 16 * s, sx - 2 * s, sy - 26 * s); ctx.stroke();
    ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(sx + 1, sy - 12 * s); ctx.quadraticCurveTo(sx + 10 * s, sy - 16 * s, sx + 12 * s, sy - 24 * s); ctx.stroke();
    const sw = Math.sin(t * 0.8 + (f.seed || 0)) * 1;
    for (let k = 0; k < 9; k++) { ctx.fillStyle = ['#8fae7f', '#a3bf94', '#7d9c70', '#b5cca8'][k % 4]; ctx.beginPath(); ctx.ellipse(sx + (r() - 0.5) * 34 * s + sw, sy - 28 * s - r() * 16 * s, 10 * s, 7 * s, 0, 0, 7); ctx.fill(); }
    for (let k = 0; k < 7; k++) dot(ctx, x + (r() - 0.5) * 0.8, y + (r() - 0.5) * 0.4, (28 + r() * 14) * s, 1.4, '#4a5a2a');
  } });

  // ================================================================ 🍇 와이너리
  C.outdoor({
    id: 'vineyard', icon: '🍇', name: '와이너리', desc: '포도 덩굴 언덕 · 오크통 · 시음 테라스 · 와인 저장고 · 언덕길 · 올리브 나무',
    size: (B) => ({ W: B.W + 36, H: B.H + 30 }),
    lot(S, OUT, B, k) {
      OUT.ground.base = { color: '#b9cc8c', tufts: ['#a3b878', '#cfdcaa'], edge: '#8a6a4a', edge2: '#76583c' };
      const TX = 3, TY = 3;
      k.place(B, TX, TY);
      const W = k.W, H = k.H, F = k.front, R = k.right, DX = Math.floor(TX + B.doorX);
      const dirt = { color: '#dcc79c', edge: '#bfa676', dots: true };
      // ⛰️ 언덕 + 🍇 포도밭 (건물 오른쪽)
      const vx0 = R + 3, vx1 = W - 2, vw = vx1 - vx0;
      k.G.decals.push({ type: 'ob_hill', cx: vx0 + vw / 2, cy: TY + (F - TY) / 2, rx: vw / 2 + 4, ry: (F - TY) / 2 + 4, hrx: vw / 2 + 3, hry: (F - TY) / 2 + 3 });
      // 언덕길: 정문 앞 → 포도밭 사이 → 와인 저장고
      const cxl = vx0 + Math.floor(vw / 2) - 1;
      k.curve([[DX + 1, F + 1.5], [R + 1, F + 1.5], [cxl + 0.5, F - 1], [cxl + 0.5, TY + 4], [cxl + 2, TY + 3.5]], 1.6, dirt);
      let vr = 0;
      for (let y = TY + 6; y + 1 < F - 1; y += 2) {
        for (const [a, b] of [[vx0, cxl - 1], [cxl + 2, vx1]]) if (b - a >= 3) { addSplit(k, { type: 'ob_vines', x: a, y, w: b - a, green: (vr + (a > cxl ? 1 : 0)) % 3 === 2 }); k.solid(a, y, b - a, 1); }
        vr++;
      }
      k.sign(vx0, TY + 5.4, '🍇 포도밭', '#7a3f8f');
      k.npc('포도 따는 농부', { x: vx0 - 1.5, y: TY + 7.5, face: '+x' }, { hat: 'bucket', accent: '#7a3f8f', carry: 'box', say: '🍇 올해 포도 달아요!', patrol: [{ x: vx0 - 1.5, y: TY + 7.5, face: '+x' }, { x: cxl + 0.5, y: TY + 11, face: '-y' }, { x: vx1 + 0.5, y: TY + 9, face: '-x' }] });
      // 🍷 와인 저장고 (언덕 꼭대기)
      const clx = Math.min(W - 6, cxl + 3), cly = TY;
      k.add({ type: 'ob_cellar', x: clx, y: cly }, clx, cly, 4, 3);
      k.add({ type: 'ob_barrels', x: clx - 2, y: cly + 1.5, n: 3 }, clx - 2, cly, 2, 3);
      k.sign(clx, cly + 3.5, '🛢️ 와인 저장고', '#7a2a3a');
      k.npc('셀러 마스터', { x: clx + 2, y: cly + 3.6, face: '+y' }, { hat: 'beret', accent: '#7a2a3a', say: '🛢️ 오크통에서 2년 숙성' });
      // 🍷 시음 테라스 (앞쪽 · 데크)
      const tx0 = DX + 4, ty0 = F + 4, tw = Math.min(16, W - tx0 - 3), td = 9;
      k.area(tx0, ty0, tw, td, 'deck', '#c9a57a', 1);
      for (let i = 0; i < 6; i++) { const tx = tx0 + 2 + (i % 3) * 5, ty = ty0 + 2 + Math.floor(i / 3) * 4; if (tx + 2 <= tx0 + tw) cafeSet(k, tx, ty, ['#7a2a3a', '#f4efe6', '#3f6b3a'][i % 3], '시음 테라스'); }
      k.add({ type: 'pergola', x: tx0 + 0.2, y: ty0 + 0.2, w: tw - 0.4, d: 0.6 });
      k.sign(tx0, ty0 + td + 0.4, '🍷 시음 테라스', '#7a2a3a');
      k.npc('소믈리에', { x: tx0 + 1, y: ty0 + 4.5, face: '+x' }, { hat: null, accent: '#f4efe6', tie: '#7a2a3a', carry: 'tray', say: '🍷 2024 빈티지 어떠세요?', patrol: [{ x: tx0 + 1, y: ty0 + 4.5, face: '+x' }, { x: tx0 + tw - 1, y: ty0 + 4.5, face: '-x' }] });
      // 오크통 더미 · 와인 바 앞
      for (let i = 0; i < 3; i++) { const bx = tx0 + tw + 1, by = ty0 + i * 3; if (bx + 2 < W && k.free(bx, by, 2, 2)) k.add({ type: 'ob_barrels', x: bx, y: by + 1, n: 2 + (i % 2) }, bx, by, 2, 2); }
      // 🫒 올리브 숲 (앞쪽 왼편) + 피크닉
      k.curve([[DX + 1, F + 0.5], [DX + 1, H - 0.5]], 1.8, dirt);
      if (k.free(2, F + 3, 4, 2)) { k.add({ type: 'picnicTable', x: 2, y: F + 3 }, 2, F + 3, 4, 2); for (const [dx, dy, face] of [[0.6, -0.35, '+y'], [2.0, -0.35, '+y'], [0.6, 2.25, '-y'], [2.0, 2.25, '-y']]) k.rest({ x: 2 + dx, y: F + 3 + dy, face, pose: 'sit', carry: 'mug' }, '올리브 그늘'); }
      scatter(k, 121, 1, F + 2, DX - 1, H - 1, Math.max(4, Math.round((DX - 2) * (H - F) / 18)), (x, y, r) => { k.add({ type: 'ob_olive', x: x + 0.5, y: y + 0.5, size: 0.9 + r() * 0.3, seed: x * 7 + y }, x, y); }, 1);
      k.sign(1, F + 1.2, '🫒 올리브 숲', '#5a6b3a');
      picnicMats(S, OUT, k, [[Math.max(2, DX - 6), H - 6, '#7a2a3a'], [tx0 + 2, H - 5, '#3f6b3a']], '포도밭 피크닉');
      S.park.wander.push({ x: tx0 + 1, y: ty0 + td + 1.5, face: '-y' }, { x: cxl + 0.5, y: F - 2, face: '-y' }, { x: DX + 2, y: F + 3, face: '+y' });
      // 앞쪽 오른편도 포도밭 (빈 칸이 이어지는 구간마다 한 줄)
      for (let y = ty0 + td + 2; y < H - 2; y += 2) {
        let a = DX + 4;
        for (let x = DX + 4; x <= W - 2; x++) { const ok = x < W - 2 && k.free(x, y) && k.free(x, y - 1); if (!ok) { if (x - a >= 3) { addSplit(k, { type: 'ob_vines', x: a, y, w: x - a, green: (x + y) % 3 === 0 }); k.solid(a, y, x - a, 1); } a = x + 1; } }
      }
      for (let y = F + 3; y < ty0 + td; y += 2) {
        let a = tx0 + tw + 4;
        for (let x = a; x <= W - 2; x++) { const ok = x < W - 2 && k.free(x, y) && k.free(x, y - 1); if (!ok) { if (x - a >= 3) { addSplit(k, { type: 'ob_vines', x: a, y, w: x - a }); k.solid(a, y, x - a, 1); } a = x + 1; } }
      }
      scatter(k, 123, R + 1, F + 1, W - 1, H - 1, 6, (x, y, r) => { k.add({ type: 'ob_olive', x: x + 0.5, y: y + 0.5, size: 0.9 + r() * 0.3, seed: x * 3 + y }, x, y); });
      for (let y = TY + 2; y < F; y += 3) { if (k.free(R + 1, y)) k.tree(R + 1, y, 1.1, 'pine'); }
      S.pets = [{ kind: 'dog', color: '#6b4a35' }, { kind: 'hen', chicks: 3 }, { kind: 'cat', color: '#f4ead8' }];
      S.door = { lv: OUT.idx, x: DX + 1, y: H - 1.2, face: '-y' };
    },
  });
  // @@END@@
})();
