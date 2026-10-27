// (v3) 실외 A팀 — 부지 10종: 🏖️ 해변 · 🏕️ 숲속 캠핑장 · 🌸 벚꽃길 · 🏞️ 호숫가 · ⛲ 도심 광장 · 🌾 시골 농장 · ⛳ 골프장 · 🎡 놀이공원 · 🏟️ 운동장 · ❄️ 설원 마을
// 모든 좌표는 건물 크기(B.W, B.H)·정문(k.front, B.doorX)·오른쪽 끝(k.right) 기준으로 계산한다 (꼬마빌딩 22×16 ~ 선셋 글래스 58×37).
// 새 소품 · 바닥 재질 · 데칼은 모두 oa_ 접두어.
(function () {
  const C = AIO.compose;
  const { P, shade, rgba, poly, box, sbox, cylinder, ellipseFloor, onPlaneY, onPlaneX, roundRect } = AIO.iso;
  const FONT = AIO.art.FONT;
  const TAU = Math.PI * 2;
  /** 매 프레임 그리는 중인가 (저배율 청크 굽기에는 I.low 가 없다) — 움직이는 소품은 굽지 않는다 */
  const live = (I) => !!I && 'low' in I;
  const lit = (I) => !!(I && I.nightInfo && I.nightInfo.lamps);
  const rect = (g, x, y, w, d, c, z = 0) => poly(g, [P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], c);
  const dot = (g, x, y, z, r, c) => { const [sx, sy] = P(x, y, z); g.fillStyle = c; g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill(); };
  const tileSpace = (g, fn) => { g.save(); g.transform(32, 16, -32, 16, 0, 0); fn(g); g.restore(); };
  const shadow = (ctx, cx, cy, rx, ry = rx) => ellipseFloor(ctx, cx, cy, rx, ry, 0, 'rgba(50,40,30,0.14)');
  const glow = (ctx, sx, sy, r, col, a) => {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createRadialGradient(sx, sy, 1, sx, sy, r); gg.addColorStop(0, rgba(col, a)); gg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = gg; ctx.fillRect(sx - r, sy - r, r * 2, r * 2); ctx.restore();
  };
  const line = (ctx, pts, c, lw = 1) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); };
  const prop = (type, draw, o = {}) => C.prop(type, { draw, ...o });
  const BACK = () => -1e5;                    // 바닥에 붙은 것(파도·물결·선착장)은 맨 먼저

  // ================================================================ 바닥 재질 (area style)
  C.floorStyle('oa_sand', (g, x, y, w, d, base, r) => {
    for (let i = 0; i < w * d * 8; i++) { const [sx, sy] = P(x + r() * w, y + r() * d); g.fillStyle = r() < 0.5 ? shade(base, -0.09) : shade(base, 0.14); g.fillRect(sx, sy, 1.3, 1.3); }
    g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = 0.8;
    for (let i = 0; i < w * d / 5; i++) { const px = x + r() * (w - 0.7), py = y + r() * d; g.beginPath(); g.moveTo(...P(px, py)); g.quadraticCurveTo(...P(px + 0.3, py - 0.18), ...P(px + 0.65, py)); g.stroke(); }
  });
  C.floorStyle('oa_forest', (g, x, y, w, d, base, r) => {
    for (let i = 0; i < w * d * 5; i++) { const [sx, sy] = P(x + r() * w, y + r() * d); const k = r(); g.fillStyle = k < 0.35 ? 'rgba(122,90,58,0.45)' : k < 0.7 ? 'rgba(60,110,60,0.35)' : 'rgba(200,170,90,0.4)'; g.beginPath(); g.ellipse(sx, sy, 1.8, 0.9, r() * 3, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(110,80,50,0.35)'; g.lineWidth = 0.7;
    for (let i = 0; i < w * d / 3; i++) { const [sx, sy] = P(x + r() * w, y + r() * d); g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 3 + r() * 3, sy - 1 + r() * 2); g.stroke(); }
  });
  C.floorStyle('oa_pavers', (g, x, y, w, d, base, r) => {
    g.strokeStyle = 'rgba(110,92,72,0.2)'; g.lineWidth = 0.7;
    for (let j = Math.ceil(y * 2) / 2; j <= y + d + 1e-6; j += 0.5) { g.beginPath(); g.moveTo(...P(x, j)); g.lineTo(...P(x + w, j)); g.stroke(); }
    for (let j = Math.floor(y * 2) / 2; j < y + d; j += 0.5) {
      const off = (Math.round(j * 2) % 2) * 0.5, j0 = Math.max(y, j), j1 = Math.min(y + d, j + 0.5);
      if (j1 <= j0) continue;
      for (let i = Math.floor(x) + off; i <= x + w; i += 1) { if (i < x) continue; g.beginPath(); g.moveTo(...P(i, j0)); g.lineTo(...P(i, j1)); g.stroke(); }
    }
    for (let n = 0; n < w * d * 0.5; n++) {
      const bj = Math.floor((y + r() * d) * 2) / 2, off = (Math.round(bj * 2) % 2) * 0.5, bx = Math.floor(x + r() * w - off) + off;
      const x0 = Math.max(x, bx) + 0.04, x1 = Math.min(x + w, bx + 1) - 0.04, y0 = Math.max(y, bj) + 0.04, y1 = Math.min(y + d, bj + 0.5) - 0.04;
      if (x1 > x0 && y1 > y0) rect(g, x0, y0, x1 - x0, y1 - y0, r() < 0.5 ? 'rgba(0,0,0,0.045)' : 'rgba(255,255,255,0.12)');
    }
  });
  C.floorStyle('oa_dirt', (g, x, y, w, d, base, r) => {
    for (let i = 0; i < w * d * 6; i++) { const [sx, sy] = P(x + r() * w, y + r() * d); g.fillStyle = r() < 0.5 ? shade(base, -0.12) : shade(base, 0.1); g.fillRect(sx, sy, 1.5, 1.2); }
    const along = w >= d;
    for (const o of [0.3, 0.7]) { if (along) rect(g, x, y + d * o - 0.05, w, 0.1, 'rgba(90,60,30,0.16)'); else rect(g, x + w * o - 0.05, y, 0.1, d, 'rgba(90,60,30,0.16)'); }
    for (let i = 0; i < w * d / 4; i++) dot(g, x + r() * w, y + r() * d, 0, 1 + r() * 1.2, r() < 0.5 ? '#b9a98f' : '#9a8a72');
  });
  C.floorStyle('oa_furrows', (g, x, y, w, d, base) => {
    for (let j = Math.ceil(y * 2) / 2; j + 0.4 <= y + d; j += 0.5) { rect(g, x, j + 0.04, w, 0.2, shade(base, -0.2)); rect(g, x, j + 0.3, w, 0.08, shade(base, 0.14)); }
  });
  C.floorStyle('oa_fairway', (g, x, y, w, d, base, r) => {
    for (let j = Math.floor(y / 1.5) * 1.5; j < y + d; j += 1.5) { const j0 = Math.max(y, j), j1 = Math.min(y + d, j + 0.75); if (j1 > j0) rect(g, x, j0, w, j1 - j0, shade(base, 0.09)); }
    for (let i = 0; i < w * d * 3; i++) { const [sx, sy] = P(x + r() * w, y + r() * d); g.fillStyle = 'rgba(40,90,30,0.18)'; g.fillRect(sx, sy, 1, 1); }
  });
  C.floorStyle('oa_snow', (g, x, y, w, d, base, r) => {
    g.strokeStyle = 'rgba(140,165,195,0.22)'; g.lineWidth = 1.2;
    for (let i = 0; i < w * d / 7; i++) { const px = x + r() * (w - 1), py = y + r() * d; g.beginPath(); g.moveTo(...P(px, py)); g.quadraticCurveTo(...P(px + 0.5, py - 0.35), ...P(px + 1, py)); g.stroke(); }
    for (let i = 0; i < w * d * 3; i++) { const [sx, sy] = P(x + r() * w, y + r() * d); g.fillStyle = r() < 0.6 ? 'rgba(255,255,255,0.95)' : 'rgba(170,200,230,0.6)'; g.fillRect(sx, sy, 1.2, 1.2); }
  });
  C.floorStyle('oa_ice', (g, x, y, w, d, base, r) => {
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.4;
    for (let i = 0; i < w * d / 4; i++) { const px = x + r() * w, py = y + r() * d; const [a, b] = P(px, py), [c, e] = P(Math.min(x + w, px + 0.9), Math.max(y, py - 0.4)); g.beginPath(); g.moveTo(a, b); g.lineTo(c, e); g.stroke(); }
    tileSpace(g, (q) => {
      q.strokeStyle = 'rgba(120,160,200,0.35)'; q.lineWidth = 0.025;
      for (let i = 0; i < w * d / 3; i++) { const cx = x + r() * w, cy = y + r() * d, rr = 0.6 + r() * 1.6, a0 = r() * TAU; q.beginPath(); q.arc(cx, cy, rr, a0, a0 + 0.8 + r()); q.stroke(); }
    });
  });

  // ================================================================ 바닥 데칼 (정적, 캐시)
  /** 바다: 해안선 pts 아래가 바다 (젖은 모래 · 얕은 물 · 깊은 물 · 반짝임) */
  C.decal('oa_sea', (g, d, r) => {
    const pts = d.pts, Y1 = d.y + d.d, x0 = pts[0][0], x1 = pts[pts.length - 1][0];
    tileSpace(g, (q) => {
      const path = (off) => { q.beginPath(); q.moveTo(x0, pts[0][1] + off); for (const [x, y] of pts) q.lineTo(x, y + off); q.lineTo(x1, Y1); q.lineTo(x0, Y1); q.closePath(); };
      path(-1.4); q.fillStyle = 'rgba(170,138,92,0.28)'; q.fill();
      path(-0.5); q.fillStyle = 'rgba(160,128,86,0.25)'; q.fill();
      for (const [off, c] of [[0, '#9fe0ea'], [0.9, '#6fcbe0'], [2.6, '#47aed6'], [5.2, '#3593c6'], [8, '#2d7fb8']]) { path(off); q.fillStyle = c; q.fill(); }
      q.beginPath(); q.moveTo(x0, pts[0][1]); for (const [x, y] of pts) q.lineTo(x, y); q.strokeStyle = 'rgba(255,255,255,0.95)'; q.lineWidth = 0.14; q.stroke();
    });
    const at = (x) => { const i = Math.max(0, Math.min(pts.length - 1, Math.round((x - x0) / ((x1 - x0) / (pts.length - 1))))); return pts[i][1]; };
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1;
    for (let i = 0; i < d.w * 2.2; i++) {
      const px = x0 + r() * (x1 - x0), sy = at(px), py = sy + 1.2 + r() * Math.max(0.5, Y1 - sy - 1.4);
      const [sx, sy2] = P(px, py); g.beginPath(); g.moveTo(sx - 4, sy2); g.quadraticCurveTo(sx, sy2 - 2, sx + 4, sy2); g.stroke();
    }
  });
  /** 조개 · 불가사리 · 조약돌 */
  C.decal('oa_shells', (g, d, r) => {
    const n = Math.round(d.w * d.d * (d.n || 0.7));
    for (let i = 0; i < n; i++) {
      const [sx, sy] = P(d.x + r() * d.w, d.y + r() * d.d), k = r();
      if (k < 0.3) { // 불가사리
        const c = ['#f08a5d', '#f2a65a', '#e8665f'][Math.floor(r() * 3)], rr = 3.6, a0 = r();
        g.fillStyle = c; g.beginPath();
        for (let j = 0; j < 10; j++) { const a = a0 + j / 10 * TAU, rad = j % 2 ? rr * 0.42 : rr; g.lineTo(sx + Math.cos(a) * rad, sy + Math.sin(a) * rad * 0.6); }
        g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(sx - 0.6, sy - 0.6, 1.2, 1.2);
      } else if (k < 0.7) { // 조개 (부채꼴)
        const c = ['#f7d9d0', '#fbe9d6', '#f2c4c9', '#efe2c8'][Math.floor(r() * 4)];
        g.fillStyle = c; g.beginPath(); g.moveTo(sx, sy + 1.5); g.arc(sx, sy + 1.5, 3.4, Math.PI * 1.1, Math.PI * 1.9); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(170,120,110,0.5)'; g.lineWidth = 0.5; for (let j = 0; j < 4; j++) { const a = Math.PI * (1.2 + j * 0.2); g.beginPath(); g.moveTo(sx, sy + 1.5); g.lineTo(sx + Math.cos(a) * 3.2, sy + 1.5 + Math.sin(a) * 3.2); g.stroke(); }
      } else { g.fillStyle = ['#cfc6b8', '#b9b0a2', '#e6e0d6'][Math.floor(r() * 3)]; g.beginPath(); g.ellipse(sx, sy, 1.8 + r(), 1.1, 0, 0, 7); g.fill(); }
    }
  });
  /** 개울: pts(위→아래) 폴리라인 · 폭 sw */
  C.decal('oa_stream', (g, d) => {
    tileSpace(g, (q) => {
      const path = () => { q.beginPath(); d.pts.forEach(([x, y], i) => (i ? q.lineTo(x, y) : q.moveTo(x, y))); };
      q.lineCap = 'round'; q.lineJoin = 'round';
      path(); q.strokeStyle = '#c9bea4'; q.lineWidth = d.sw + 0.7; q.stroke();
      path(); q.strokeStyle = '#a9a08a'; q.lineWidth = d.sw + 0.25; q.stroke();
      path(); q.strokeStyle = '#64b3d6'; q.lineWidth = d.sw; q.stroke();
      path(); q.strokeStyle = '#86cbe6'; q.lineWidth = d.sw * 0.5; q.stroke();
      path(); q.setLineDash([0.5, 1.6]); q.strokeStyle = 'rgba(255,255,255,0.5)'; q.lineWidth = 0.06; q.stroke(); q.setLineDash([]);
    });
    const r = AIO.rand(d.seed || 9);
    for (let i = 0; i < d.pts.length; i++) { const [x, y] = d.pts[i]; for (const s of [-1, 1]) if (r() < 0.6) dot(g, x + s * (d.sw / 2 + 0.25 + r() * 0.3), y + r() - 0.5, 0, 1.4 + r() * 1.6, r() < 0.5 ? '#9a9486' : '#c2bcae'); }
  });
  /** 벚꽃잎 흩날린 바닥 */
  C.decal('oa_petals', (g, d, r) => {
    const n = Math.round(d.w * d.d * (d.n || 3));
    for (let i = 0; i < n; i++) { const [sx, sy] = P(d.x + r() * d.w, d.y + r() * d.d); g.fillStyle = ['#f7b6c8', '#fbd0dc', '#f4a3bb', '#ffffff'][Math.floor(r() * 4)]; g.beginPath(); g.ellipse(sx, sy, 1.7, 1, r() * 3, 0, 7); g.fill(); }
  });
  /** 큰 호수: 모래 둔치 · 깊이 그라데이션 · 반짝임 · 연잎 */
  C.decal('oa_lake', (g, d, r) => {
    const { cx, cy, rx, ry } = d;
    ellipseFloor(g, cx, cy, rx + 0.55, ry + 0.55, 0, '#d9cba8');
    ellipseFloor(g, cx, cy, rx + 0.2, ry + 0.2, 0, '#b8ad92');
    for (const [k, c] of [[1, '#79c0de'], [0.86, '#62b0d6'], [0.66, '#4f9fcb'], [0.42, '#438fc0']]) ellipseFloor(g, cx + (1 - k) * 0.6, cy + (1 - k) * 0.4, rx * k, ry * k, 0, c);
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1;
    for (let i = 0; i < rx * ry * 0.9; i++) { const a = r() * TAU, k = Math.sqrt(r()) * 0.85; const [sx, sy] = P(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k); g.beginPath(); g.moveTo(sx - 5, sy); g.quadraticCurveTo(sx, sy - 2, sx + 5, sy); g.stroke(); }
    for (let i = 0; i < (d.pads ?? Math.round(rx)); i++) {
      const a = r() * TAU, k = 0.78 + r() * 0.15; const [sx, sy] = P(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k);
      g.fillStyle = '#5c9a4a'; g.beginPath(); g.ellipse(sx, sy, 5, 2.6, 0, 0.3, 6.0); g.lineTo(sx, sy); g.fill();
      if (r() < 0.4) { g.fillStyle = '#f7b6c8'; g.beginPath(); g.arc(sx + 1, sy - 1, 1.6, 0, 7); g.fill(); }
    }
  });
  /** 밀밭: 금빛 이삭 */
  C.decal('oa_wheat', (g, d, r) => {
    rect(g, d.x, d.y, d.w, d.d, '#b8933f'); rect(g, d.x + 0.08, d.y + 0.08, d.w - 0.16, d.d - 0.16, '#e2bd5c');
    for (let j = d.y + 0.25; j < d.y + d.d; j += 0.5) rect(g, d.x + 0.1, j, d.w - 0.2, 0.06, 'rgba(150,110,40,0.35)');
    const n = Math.round(d.w * d.d * 12);
    for (let i = 0; i < n; i++) {
      const [sx, sy] = P(d.x + 0.15 + r() * (d.w - 0.3), d.y + 0.15 + r() * (d.d - 0.3)), h = 5 + r() * 4;
      g.strokeStyle = r() < 0.5 ? '#c99a3c' : '#d9ab48'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 0.6, sy - h); g.stroke();
      g.fillStyle = r() < 0.5 ? '#f2cf6a' : '#e8bd4f'; g.beginPath(); g.ellipse(sx + 0.7, sy - h - 1.6, 1.1, 2.4, 0.15, 0, 7); g.fill();
    }
  });
  /** 골프 그린 (+ 프린지 · 깎은 결 · 홀컵) */
  C.decal('oa_green', (g, d) => {
    ellipseFloor(g, d.cx, d.cy, d.rx + 0.7, d.ry + 0.7, 0, '#8fcc6c');
    ellipseFloor(g, d.cx, d.cy, d.rx, d.ry, 0, '#a9e08a');
    tileSpace(g, (q) => {
      q.save(); q.beginPath(); q.ellipse(d.cx, d.cy, d.rx, d.ry, 0, 0, 7); q.clip();
      for (let j = Math.floor(d.cy - d.ry); j < d.cy + d.ry; j += 1) { q.fillStyle = 'rgba(255,255,255,0.13)'; q.fillRect(d.cx - d.rx, j, d.rx * 2, 0.5); }
      q.restore();
    });
    if (d.hx != null) { ellipseFloor(g, d.hx, d.hy, 0.16, 0.16, 0, '#2b2b2b'); ellipseFloor(g, d.hx, d.hy, 0.24, 0.24, 0, null, '#ffffff'); }
  });
  /** 벙커 (모래, 두 덩이 콩 모양 + 갈퀴 자국) */
  C.decal('oa_bunker', (g, d, r) => {
    tileSpace(g, (q) => {
      const blobs = [[d.cx, d.cy, d.rx, d.ry], [d.cx + d.rx * 0.55, d.cy + d.ry * 0.35, d.rx * 0.6, d.ry * 0.75]];
      for (const [x, y, a, b] of blobs) { q.beginPath(); q.ellipse(x, y, a + 0.15, b + 0.15, d.rot || 0, 0, 7); q.fillStyle = '#c9b27a'; q.fill(); }
      for (const [x, y, a, b] of blobs) { q.beginPath(); q.ellipse(x, y, a, b, d.rot || 0, 0, 7); q.fillStyle = '#efdcaa'; q.fill(); }
      q.strokeStyle = 'rgba(190,160,100,0.45)'; q.lineWidth = 0.04;
      for (let i = -d.ry; i < d.ry; i += 0.35) { q.beginPath(); q.moveTo(d.cx - d.rx * 0.6, d.cy + i); q.quadraticCurveTo(d.cx, d.cy + i - 0.2, d.cx + d.rx * 0.8, d.cy + i + 0.1); q.stroke(); }
    });
  });
  /** 미니 기차 레일 (둥근 사각형 고리) */
  const rrPath = (q, x, y, w, d, rad) => { q.beginPath(); q.moveTo(x + rad, y); q.arcTo(x + w, y, x + w, y + d, rad); q.arcTo(x + w, y + d, x, y + d, rad); q.arcTo(x, y + d, x, y, rad); q.arcTo(x, y, x + w, y, rad); q.closePath(); };
  C.decal('oa_rails', (g, d) => {
    tileSpace(g, (q) => {
      q.lineJoin = 'round';
      rrPath(q, d.x, d.y, d.w, d.d, d.r); q.strokeStyle = '#b9ab95'; q.lineWidth = 1.0; q.stroke();
      rrPath(q, d.x, d.y, d.w, d.d, d.r); q.setLineDash([0.16, 0.24]); q.strokeStyle = '#8a6247'; q.lineWidth = 0.78; q.stroke(); q.setLineDash([]);
      for (const o of [-0.24, 0.24]) { rrPath(q, d.x - o, d.y - o, d.w + o * 2, d.d + o * 2, d.r + o); q.strokeStyle = '#7d858c'; q.lineWidth = 0.07; q.stroke(); }
    });
  });
  /** 비치발리볼 코트 줄 */
  C.decal('oa_vball', (g, d) => {
    const c = '#3b7fd0';
    rect(g, d.x, d.y, d.w, 0.08, c); rect(g, d.x, d.y + d.d - 0.08, d.w, 0.08, c); rect(g, d.x, d.y, 0.08, d.d, c); rect(g, d.x + d.w - 0.08, d.y, 0.08, d.d, c);
  });

  // ================================================================ 🏖️ 해변 소품
  /** 야자수 (x,y = 칸 중심) */
  prop('oa_palm', (ctx, f, t) => {
    const s = f.size || 1, r = AIO.rand(f.seed || 7), lean = (r() - 0.5) * 24 * s, H = (62 + r() * 16) * s;
    shadow(ctx, f.x + 0.3, f.y + 0.3, 0.8 * s);
    const [bx, by] = P(f.x, f.y, 0);
    for (let i = 0; i < 9; i++) {
      const k0 = i / 9, k1 = (i + 1) / 9, w0 = (4.4 - k0 * 1.7) * s, w1 = (4.4 - k1 * 1.7) * s;
      const x0 = bx + lean * k0 * k0, x1 = bx + lean * k1 * k1, y0 = by - H * k0, y1 = by - H * k1 - 1;
      ctx.fillStyle = i % 2 ? '#c9a26b' : '#b58a57'; ctx.beginPath(); ctx.moveTo(x0 - w0, y0); ctx.lineTo(x1 - w1, y1); ctx.lineTo(x1 + w1, y1); ctx.lineTo(x0 + w0, y0); ctx.fill();
      ctx.fillStyle = 'rgba(80,50,20,0.16)'; ctx.beginPath(); ctx.moveTo(x0 + w0 * 0.2, y0); ctx.lineTo(x1 + w1 * 0.2, y1); ctx.lineTo(x1 + w1, y1); ctx.lineTo(x0 + w0, y0); ctx.fill();
    }
    const tx = bx + lean, ty = by - H, sw = Math.sin(t * 1.3 + (f.seed || 0)) * 1.8, a0 = r() * 6;
    const leaf = (a, i, back) => {
      const L = (back ? 26 : 31) * s, ca = Math.cos(a), sa = Math.sin(a);
      const ex = tx + ca * L + sw, ey = ty + sa * L * 0.45 + 15 * s, mx = tx + ca * L * 0.55 + sw * 0.5, my = ty + sa * L * 0.24 - 9 * s;
      ctx.fillStyle = back ? '#3b8048' : ['#4fa356', '#5cb562', '#46994f'][i % 3];
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(mx - sa * 5 * s, my - 3 * s, ex, ey); ctx.quadraticCurveTo(mx + sa * 4 * s, my + 6 * s, tx, ty + 2 * s); ctx.fill();
      ctx.strokeStyle = 'rgba(30,80,40,0.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(mx, my + 1.5 * s, ex, ey); ctx.stroke();
    };
    for (let i = 0; i < 8; i++) { const a = a0 + i / 8 * TAU; if (Math.sin(a) < 0) leaf(a, i, true); }
    ctx.fillStyle = '#6b4a2a'; for (const [dx, dy] of [[-2.8, 3], [2.6, 3.4], [0, 5]]) { ctx.beginPath(); ctx.arc(tx + dx * s, ty + dy * s, 2.6 * s, 0, 7); ctx.fill(); }
    for (let i = 0; i < 8; i++) { const a = a0 + i / 8 * TAU; if (Math.sin(a) >= 0) leaf(a, i, false); }
  });
  /** 구조대 망루 (2×2) */
  prop('oa_lifeguard', (ctx, f, t) => {
    const { x, y } = f, Z = 46;
    shadow(ctx, x + 1.2, y + 1.2, 1.3);
    const leg = (lx, ly) => { const [a, b] = P(x + lx, y + ly, 0), [c, d] = P(x + 1 + (lx - 1) * 0.72, y + 1 + (ly - 1) * 0.72, Z); line(ctx, [[a, b], [c, d]], '#f4f1ec', 3.2); line(ctx, [[a, b], [c, d]], 'rgba(0,0,0,0.12)', 0.6); };
    leg(0.15, 0.15); leg(1.85, 0.15);
    line(ctx, [P(x + 0.3, y + 0.3, 8), P(x + 1.7, y + 0.3, 30)], '#e9e4da', 1.6);
    leg(0.15, 1.85); leg(1.85, 1.85);
    line(ctx, [P(x + 0.3, y + 1.75, 8), P(x + 1.7, y + 1.75, 30)], '#e9e4da', 1.6); line(ctx, [P(x + 1.75, y + 0.3, 30), P(x + 1.75, y + 1.7, 8)], '#e9e4da', 1.6);
    // 사다리 (+y 면)
    for (const lx of [0.75, 1.15]) line(ctx, [P(x + lx, y + 2.35, 0), P(x + lx, y + 1.7, Z)], '#c49a62', 1.6);
    for (let k = 1; k < 8; k++) { const s = k / 8; line(ctx, [P(x + 0.75, y + 2.35 - s * 0.65, s * Z), P(x + 1.15, y + 2.35 - s * 0.65, s * Z)], '#a87a52', 1.2); }
    box(ctx, x + 0.15, y + 0.15, Z, 1.7, 1.7, 3, '#d9b98a', '#c49a62', '#a87a52', 'rgba(0,0,0,0.15)');
    box(ctx, x + 0.4, y + 0.35, Z + 3, 1.2, 1.2, 22, '#ffffff', '#f4f1ec', '#e3ddd3', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x + 0.4, y + 1.55, Z + 25, (g) => { g.fillStyle = '#e5534b'; g.fillRect(0, 0, 38.4, 4); g.fillRect(0, 17, 38.4, 5); g.fillStyle = '#2b3a4a'; g.fillRect(4, 6, 30, 9); g.fillStyle = '#ffd36b'; g.font = `bold 6px ${FONT}`; g.fillText('🛟 구조대', 6, 13.5); });
    onPlaneX(ctx, x + 1.6, y + 1.55, Z + 25, (g) => { g.fillStyle = '#e5534b'; g.fillRect(0, 0, 38.4, 4); g.fillRect(0, 17, 38.4, 5); g.strokeStyle = '#f08a3a'; g.lineWidth = 3; g.beginPath(); g.arc(19, 11, 5, 0, 7); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1; g.setLineDash([2, 2]); g.stroke(); g.setLineDash([]); });
    const ap = P(x + 1, y + 0.95, Z + 40);
    poly(ctx, [P(x + 0.2, y + 1.75, Z + 25), P(x + 1.8, y + 1.75, Z + 25), ap], '#e5534b', 'rgba(0,0,0,0.15)');
    poly(ctx, [P(x + 1.8, y + 0.15, Z + 25), P(x + 1.8, y + 1.75, Z + 25), ap], '#c43d32', 'rgba(0,0,0,0.15)');
    poly(ctx, [P(x + 0.6, y + 1.75, Z + 25), P(x + 1.0, y + 1.75, Z + 25), ap], '#ffffff');
    const [px, py] = ap; line(ctx, [[px, py], [px, py - 18]], '#d9dde1', 1.2);
    ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.moveTo(px, py - 18); for (let i = 0; i <= 5; i++) ctx.lineTo(px + i * 3, py - 18 + Math.sin(t * 5 + i) * 1.4); for (let i = 5; i >= 0; i--) ctx.lineTo(px + i * 3, py - 11 + Math.sin(t * 5 + i) * 1.4); ctx.fill();
    ctx.fillStyle = '#e5534b'; ctx.fillRect(px + 1, py - 16, 6, 3);
  }, { depth: (f) => f.x + f.y + 1.6 });
  /** 서핑보드 거치대 (x 방향 w=2.4, 보드는 +y 쪽에 기대 있음) */
  prop('oa_surfRack', (ctx, f, t) => {
    const { x, y } = f, w = f.w || 2.4;
    shadow(ctx, x + w / 2, y + 0.7, w / 2 + 0.2, 0.6);
    for (const px of [x + 0.1, x + w - 0.1]) { line(ctx, [P(px, y + 1, 0), P(px, y + 0.4, 30), P(px, y - 0.1, 0)], '#a87a52', 2.2); }
    line(ctx, [P(x + 0.1, y + 0.4, 30), P(x + w - 0.1, y + 0.4, 30)], '#8a6247', 2.4);
    const cols = [['#4fc3e8', '#ffffff'], ['#f6c445', '#e5534b'], ['#f07a8a', '#ffffff'], ['#3fb27f', '#f6c445'], ['#a67be0', '#ffffff']];
    const n = Math.max(2, Math.floor((w - 0.2) / 0.5));
    for (let i = 0; i < n; i++) {
      const bx = x + 0.3 + i * ((w - 0.6) / Math.max(1, n - 1)), [a, b] = P(bx, y + 1.15, 0), [c, d] = P(bx, y + 0.45, 44);
      const cx = (a + c) / 2, cy = (b + d) / 2, L = Math.hypot(c - a, d - b) / 2, ang = Math.atan2(d - b, c - a), [c0, c1] = cols[(i + (f.seed || 0)) % cols.length];
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
      ctx.fillStyle = c0; ctx.beginPath(); ctx.ellipse(0, 0, L, 4.6, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = c1; ctx.fillRect(-L * 0.8, -0.8, L * 1.6, 1.6); ctx.restore();
    }
    onPlaneY(ctx, x + 0.2, y + 1.2, 6, (g) => { g.fillStyle = '#f6efd8'; roundRect(g, 0, 0, 40, 9, 2); g.fill(); g.fillStyle = '#2f5d8a'; g.font = `bold 5px ${FONT}`; g.fillText('🏄 서핑 스쿨', 3, 6.5); });
  }, { slice: 0.8 });
  /** 비치발리볼 네트 (y 방향, 길이 d) — 공이 넘나든다 */
  prop('oa_volleyNet', (ctx, f, t, I) => {
    const { x, y } = f, d = f.d || 5;
    for (const py of [y, y + d]) { sbox(ctx, x - 0.05, py - 0.05, 0, 0.1, 0.1, 40, '#f4f1ec'); }
    ctx.fillStyle = 'rgba(30,30,30,0.18)'; poly(ctx, [P(x, y, 40), P(x, y + d, 40), P(x, y + d, 26), P(x, y, 26)], 'rgba(40,40,40,0.15)');
    ctx.strokeStyle = 'rgba(40,40,40,0.55)'; ctx.lineWidth = 0.5;
    for (let z = 26; z <= 40; z += 3.5) { ctx.beginPath(); ctx.moveTo(...P(x, y, z)); ctx.lineTo(...P(x, y + d, z)); ctx.stroke(); }
    for (let j = 0; j <= d; j += 0.25) { ctx.beginPath(); ctx.moveTo(...P(x, y + j, 26)); ctx.lineTo(...P(x, y + j, 40)); ctx.stroke(); }
    line(ctx, [P(x, y, 40), P(x, y + d, 40)], '#ffffff', 2);
    if (!live(I)) return;
    const u = (t * 0.35) % 2, s = u < 1 ? u : 2 - u, bx = x - 3 + s * 6, h = 18 + Math.sin(s * Math.PI) * 52, by = y + d / 2 + Math.sin(t * 0.7) * 1.2;
    const [sx, sy] = P(bx, by, 0); ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(sx, sy, 4, 2, 0, 0, 7); ctx.fill();
    const [qx, qy] = P(bx, by, h); ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(qx, qy, 3.6, 0, 7); ctx.fill(); ctx.strokeStyle = '#3b7fd0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(qx, qy, 3.6, 0.3, 2.2); ctx.stroke(); ctx.strokeStyle = '#f2c230'; ctx.beginPath(); ctx.arc(qx, qy, 3.6, 3.4, 5.2); ctx.stroke();
  }, { depth: (f) => f.x + f.y + (f.d || 5) / 2, dynamic: true });
  /** 비치 바 뒤쪽 (선반 · 병 · 초가 차양) — 바텐더는 그 앞 칸 */
  prop('oa_barBack', (ctx, f, t, I) => {
    const { x, y, w } = f;
    box(ctx, x, y + 0.1, 0, w, 0.6, 30, '#c49a62', '#a87a52', '#8a6247', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x, y + 0.7, 30, (g) => {
      g.fillStyle = '#7a5540'; g.fillRect(0, 9, w * 32, 2); g.fillRect(0, 20, w * 32, 2);
      for (let i = 0; i < w * 32 / 5 - 1; i++) { g.fillStyle = ['#3fb27f', '#f6c445', '#e5534b', '#4fc3e8', '#f07a8a'][i % 5]; g.fillRect(3 + i * 5, 2 + (i % 2), 3, 7 - (i % 2)); g.fillStyle = ['#a67be0', '#ffffff', '#ff9a5a'][i % 3]; g.fillRect(4 + i * 5, 13, 2.5, 7); }
    });
    for (const px of [x + 0.05, x + w - 0.15]) sbox(ctx, px, y + 0.2, 0, 0.1, 0.1, 58, '#8a6247');
    const z0 = 56, z1 = 62;
    poly(ctx, [P(x - 0.2, y - 0.2, z1), P(x + w + 0.2, y - 0.2, z1), P(x + w + 0.2, y + 1.3, z0), P(x - 0.2, y + 1.3, z0)], '#e2c27a', 'rgba(120,90,40,0.4)');
    poly(ctx, [P(x + w + 0.2, y - 0.2, z1), P(x + w + 0.2, y + 1.3, z0), P(x + w + 0.2, y + 1.3, z0 - 6), P(x + w + 0.2, y - 0.2, z1 - 6)], '#c9a560');
    for (let i = 0; i < w * 5 + 2; i++) { const px = x - 0.2 + i * 0.2; const [a, b] = P(px, y + 1.3, z0); ctx.fillStyle = i % 2 ? '#d4b066' : '#c49f58'; ctx.beginPath(); ctx.moveTo(a - 3, b); ctx.lineTo(a + 3, b); ctx.lineTo(a, b + 6 + (i % 3)); ctx.fill(); }
    onPlaneY(ctx, x + w / 2 - 1.1, y + 1.3, z0 + 12, (g) => { g.fillStyle = '#3b2f2a'; roundRect(g, 0, 0, 70, 11, 3); g.fill(); g.fillStyle = '#ffd36b'; g.font = `bold 7px ${FONT}`; g.fillText('🍹 BEACH BAR', 9, 8.5); });
    if (lit(I)) glow(ctx, ...P(x + w / 2, y + 1, 40), 60, '#ffcf80', 0.35);
  }, { slice: 0.6 });
  /** 비치 바 카운터 (앞) */
  prop('oa_barFront', (ctx, f) => {
    const { x, y, w } = f;
    box(ctx, x, y + 0.1, 0, w, 0.7, 22, '#e9d3a4', '#c9a26b', '#a87a52', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x, y + 0.8, 22, (g) => { for (let i = 0; i < w * 32; i += 4) { g.fillStyle = i % 8 ? '#d9b97f' : '#c49a62'; g.fillRect(i, 0, 3.2, 22); } g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, w * 32, 2); });
    box(ctx, x - 0.05, y + 0.05, 22, w + 0.1, 0.8, 2.5, '#8a6247', '#7a5540', '#6b4a35');
    for (let i = 0; i < w - 0.5; i += 1.3) { const [cx, cy] = P(x + 0.6 + i, y + 0.45, 24.5); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(cx - 2.5, cy - 7, 5, 7); ctx.fillStyle = ['#ff9a5a', '#f07a8a', '#6fd0e6'][Math.round(i) % 3]; ctx.fillRect(cx - 2, cy - 5, 4, 4.5); ctx.strokeStyle = '#3fb27f'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(cx + 1, cy - 5); ctx.lineTo(cx + 3, cy - 11); ctx.stroke(); }
  }, { slice: 1 });
  /** 파도 (해안선 따라 밀려오는 거품) — 움직임 전용 */
  prop('oa_waves', (ctx, f, t, I) => {
    if (!live(I)) return;
    const pts = f.pts;
    for (let k = 0; k < 2; k++) {
      const u = (t * 0.17 + k * 0.5 + (f.seed || 0) * 0.13) % 1, off = 1.7 * (1 - u), a = Math.sin(u * Math.PI);
      ctx.strokeStyle = `rgba(255,255,255,${0.75 * a})`; ctx.lineWidth = 1.6 + a; ctx.beginPath();
      pts.forEach(([x, y], i) => { const [sx, sy] = P(x, y + off + Math.sin(x * 1.7 + t) * 0.06); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.stroke();
    }
    const sw = 0.25 + 0.2 * Math.sin(t * 1.1 + (f.seed || 0));
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath();
    pts.forEach(([x, y], i) => { const [sx, sy] = P(x, y - sw); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
    for (let i = pts.length - 1; i >= 0; i--) { const [sx, sy] = P(pts[i][0], pts[i][1] + 0.15); ctx.lineTo(sx, sy); }
    ctx.fill();
  }, { depth: BACK, dynamic: true });
  /** 갈매기 (하늘을 빙빙) — 움직임 전용 */
  prop('oa_gulls', (ctx, f, t, I) => {
    if (!live(I)) return;
    for (let i = 0; i < (f.n || 3); i++) {
      const a = t * (0.22 + i * 0.03) + i * 2.1, [sx, sy] = P(f.x + Math.cos(a) * (f.r || 4), f.y + Math.sin(a) * (f.r || 4) * 0.6, 95 + Math.sin(t * 0.7 + i) * 10);
      const fl = Math.sin(t * 7 + i * 1.3) * 4;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx - 8, sy - fl); ctx.quadraticCurveTo(sx - 4, sy - 4 - fl * 0.5, sx, sy); ctx.quadraticCurveTo(sx + 4, sy - 4 - fl * 0.5, sx + 8, sy - fl); ctx.stroke();
      ctx.strokeStyle = '#6d7175'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(sx - 8, sy - fl); ctx.lineTo(sx - 6.5, sy - fl - 0.6); ctx.moveTo(sx + 8, sy - fl); ctx.lineTo(sx + 6.5, sy - fl - 0.6); ctx.stroke();
      ctx.fillStyle = '#f2c230'; ctx.fillRect(sx + (Math.cos(a) > 0 ? 1 : -3), sy - 0.5, 2, 1);
    }
  }, { depth: (f) => f.x + f.y + 60, dynamic: true });

  // ================================================================ 🏕️ 캠핑 소품
  /** 텐트 2×2 (kind 'a' 삼각 · 'dome' 돔) — 입구는 +y */
  prop('oa_tent', (ctx, f, t, I) => {
    const { x, y } = f, c = f.color || '#f08a3a';
    shadow(ctx, x + 1.1, y + 1.1, 1.2);
    if (f.kind === 'dome') {
      const [sx, sy] = P(x + 1, y + 1, 0), rx = 0.92 * 45.25, ry = rx / 2, H = 30;
      ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI); ctx.ellipse(sx, sy, rx, ry + H, 0, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = c; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(sx + rx * 0.15, sy - H - ry, rx, H + ry * 2); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(sx - rx * 0.4, sy - H * 0.9, rx * 0.35, 6, -0.3, 0, 7); ctx.fill(); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.2;
      for (const k of [-0.55, 0.15]) { ctx.beginPath(); ctx.ellipse(sx + k * rx * 0.6, sy, rx * 0.55, ry + H, 0, Math.PI, TAU); ctx.stroke(); }
      ctx.fillStyle = shade(c, -0.45); ctx.beginPath(); ctx.ellipse(sx - rx * 0.28, sy + ry * 0.55, 10, 14, 0, Math.PI, TAU); ctx.lineTo(sx - rx * 0.28 + 10, sy + ry * 0.55); ctx.fill();
      ctx.fillStyle = shade(c, 0.2); ctx.beginPath(); ctx.moveTo(sx - rx * 0.28 + 10, sy + ry * 0.55); ctx.lineTo(sx - rx * 0.28 + 3, sy + ry * 0.55 - 13); ctx.lineTo(sx - rx * 0.28 + 15, sy + ry * 0.55 + 1); ctx.fill();
    } else {
      const H = 32, a = 0.08, b = 1.92;
      poly(ctx, [P(x + a, y + a, 0), P(x + a, y + b, 0), P(x + 1, y + b, H), P(x + 1, y + a, H)], shade(c, -0.3));
      poly(ctx, [P(x + 1, y + a, H), P(x + 1, y + b, H), P(x + b, y + b, 0), P(x + b, y + a, 0)], shade(c, -0.08), 'rgba(0,0,0,0.15)');
      poly(ctx, [P(x + 1.62, y + a, 6), P(x + 1.62, y + b, 6), P(x + b, y + b, 0), P(x + b, y + a, 0)], 'rgba(255,255,255,0.35)');
      poly(ctx, [P(x + a, y + b, 0), P(x + b, y + b, 0), P(x + 1, y + b, H)], shade(c, 0.08), 'rgba(0,0,0,0.15)');
      poly(ctx, [P(x + 0.58, y + b, 0), P(x + 1.42, y + b, 0), P(x + 1, y + b, H * 0.72)], '#3b2f2a');
      poly(ctx, [P(x + 1.42, y + b, 0), P(x + 1.0, y + b, H * 0.72), P(x + 1.62, y + b + 0.12, 4)], shade(c, 0.25));
      line(ctx, [P(x + 1, y + a, H), P(x + 1, y + b, H)], shade(c, -0.4), 1.4);
      for (const [px, py, q] of [[x + 1, y - 0.35, y + a], [x + 1, y + 2.35, y + b]]) line(ctx, [P(x + 1, q, H), P(px, py, 0)], 'rgba(90,80,70,0.55)', 0.6);
    }
    if (lit(I)) glow(ctx, ...P(x + 1, y + 1.6, 10), 34, '#ffcf80', 0.35);
  }, { depth: (f) => f.x + f.y + 1.5 });
  /** 통나무 의자 (axis 'x' | 'y', 길이 w) */
  prop('oa_log', (ctx, f) => {
    const { x, y } = f, w = f.w || 3, top = '#a87a52', l = '#8a6247', r = '#6b4a35';
    if (f.axis === 'y') {
      box(ctx, x + 0.28, y, 0, 0.44, w, 11, top, l, r, 'rgba(0,0,0,0.15)');
      onPlaneY(ctx, x + 0.28, y + w, 11, (g) => { g.fillStyle = '#e9c99a'; g.beginPath(); g.ellipse(7, 5.5, 6.8, 5.5, 0, 0, 7); g.fill(); g.strokeStyle = '#c49a62'; g.lineWidth = 0.7; for (const k of [4, 2]) { g.beginPath(); g.ellipse(7, 5.5, k * 1.3, k, 0, 0, 7); g.stroke(); } });
      for (let i = 0.4; i < w; i += 0.7) line(ctx, [P(x + 0.72, y + i, 2), P(x + 0.72, y + i + 0.3, 9)], 'rgba(60,40,25,0.35)', 0.8);
    } else {
      box(ctx, x, y + 0.28, 0, w, 0.44, 11, top, l, r, 'rgba(0,0,0,0.15)');
      onPlaneX(ctx, x + w, y + 0.72, 11, (g) => { g.fillStyle = '#e9c99a'; g.beginPath(); g.ellipse(7, 5.5, 6.8, 5.5, 0, 0, 7); g.fill(); g.strokeStyle = '#c49a62'; g.lineWidth = 0.7; for (const k of [4, 2]) { g.beginPath(); g.ellipse(7, 5.5, k * 1.3, k, 0, 0, 7); g.stroke(); } });
      for (let i = 0.4; i < w; i += 0.7) line(ctx, [P(x + i, y + 0.72, 2), P(x + i + 0.3, y + 0.72, 9)], 'rgba(60,40,25,0.35)', 0.8);
    }
  }, { slice: 0.5 });
  /** 랜턴 기둥 */
  prop('oa_lantern', (ctx, f, t, I) => {
    const { x, y } = f, on = lit(I);
    sbox(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, 44, '#5a3e2c');
    line(ctx, [P(x, y, 44), P(x + 0.35, y, 44)], '#5a3e2c', 1.6);
    const sw = Math.sin(t * 1.4 + x) * 0.6, [lx, ly] = P(x + 0.35, y, 40);
    line(ctx, [[lx, ly - 4], [lx + sw, ly]], '#3b2f2a', 0.8);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(lx + sw - 3.5, ly, 7, 1.5); ctx.fillRect(lx + sw - 3, ly + 9.5, 6, 1.5);
    ctx.fillStyle = on ? '#ffe39a' : '#f6d58a'; ctx.fillRect(lx + sw - 2.8, ly + 1.5, 5.6, 8);
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 0.6; ctx.strokeRect(lx + sw - 2.8, ly + 1.5, 5.6, 8);
    glow(ctx, lx + sw, ly + 6, on ? 30 : 10, '#ffcf80', on ? 0.6 : 0.25);
  });
  /** 접이식 캠핑 의자 (face 방향으로 앉는다) */
  prop('oa_campChair', (ctx, f) => {
    const { x, y } = f, c = f.color || '#3f8a45', face = f.face || '+y';
    const dv = { '+y': [0, 1], '-y': [0, -1], '+x': [1, 0], '-x': [-1, 0] }[face], sd = [Math.abs(dv[1]), Math.abs(dv[0])], h = 0.32, Zs = 12;
    const p = (u, v, z) => P(x + sd[0] * u + dv[0] * v, y + sd[1] * u + dv[1] * v, z);
    ellipseFloor(ctx, x, y, 0.38, 0.38, 0, 'rgba(0,0,0,0.12)');
    for (const u of [-h, h]) { line(ctx, [p(u, -h, 0), p(u, h, Zs)], '#6d757c', 1.3); line(ctx, [p(u, h, 0), p(u, -h, Zs)], '#6d757c', 1.3); }
    const back = () => { poly(ctx, [p(-h, -h, Zs), p(h, -h, Zs), p(h, -h - 0.1, Zs + 22), p(-h, -h - 0.1, Zs + 22)], shade(c, -0.1), 'rgba(0,0,0,0.2)'); line(ctx, [p(-h, -h - 0.1, Zs + 22), p(h, -h - 0.1, Zs + 22)], '#6d757c', 1.4); poly(ctx, [p(-h, -h, Zs + 14), p(h, -h, Zs + 14), p(h, -h - 0.05, Zs + 17), p(-h, -h - 0.05, Zs + 17)], 'rgba(255,255,255,0.35)'); };
    const seat = () => { poly(ctx, [p(-h, -h, Zs), p(h, -h, Zs), p(h, h, Zs + 1), p(-h, h, Zs + 1)], c, 'rgba(0,0,0,0.2)'); for (const u of [-h, h]) line(ctx, [p(u, -h, Zs + 9), p(u, h * 0.9, Zs + 8)], '#6d757c', 1.6); const [cx, cy] = p(h + 0.05, h * 0.6, Zs + 8); ctx.fillStyle = '#3b3f45'; ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, 7); ctx.fill(); };
    if (face === '+y' || face === '+x') { back(); seat(); } else { seat(); back(); }
  });
  /** 통나무집 (w×d · snow 지붕 눈 · label 간판) — 박공은 x 방향 */
  prop('oa_cabin', (ctx, f, t, I) => {
    const { x, y } = f, w = f.w || 4, d = f.d || 3, Hw = 34, Hr = 60, snow = !!f.snow, on = lit(I);
    shadow(ctx, x + w / 2 + 0.2, y + d / 2 + 0.2, w / 2 + 0.4, d / 2 + 0.4);
    box(ctx, x, y, 0, w, d, Hw, '#b98c5e', '#a87a52', '#8a6247', 'rgba(0,0,0,0.2)');
    onPlaneY(ctx, x, y + d, Hw, (g) => { for (let v = 3; v < Hw; v += 5) { g.fillStyle = 'rgba(70,45,25,0.3)'; g.fillRect(0, v, w * 32, 1.2); } });
    onPlaneX(ctx, x + w, y + d, Hw, (g) => { for (let v = 3; v < Hw; v += 5) { g.fillStyle = 'rgba(50,30,15,0.3)'; g.fillRect(0, v, d * 32, 1.2); } });
    for (let v = 3; v < Hw; v += 5) { const [cx, cy] = P(x + w, y + d, Hw - v + 2); ctx.fillStyle = '#d9b98a'; ctx.beginPath(); ctx.arc(cx, cy, 2.3, 0, 7); ctx.fill(); }
    // 문 · 창문
    onPlaneY(ctx, x, y + d, Hw, (g) => {
      const dx = w * 32 * 0.3; g.fillStyle = '#6b4a35'; g.fillRect(dx, 10, 13, 24); g.fillStyle = '#f2c230'; g.fillRect(dx + 10, 22, 1.6, 1.6);
      const wx = w * 32 * 0.62; g.fillStyle = on ? '#ffd98a' : '#cfe6f2'; g.fillRect(wx, 9, 18, 12); g.strokeStyle = '#f4ead8'; g.lineWidth = 1.6; g.strokeRect(wx, 9, 18, 12); g.beginPath(); g.moveTo(wx + 9, 9); g.lineTo(wx + 9, 21); g.stroke();
      g.fillStyle = '#e5534b'; g.fillRect(wx - 1, 21, 20, 3);
    });
    // 박공벽(+x) · 지붕
    poly(ctx, [P(x + w, y, Hw), P(x + w, y + d, Hw), P(x + w, y + d / 2, Hr)], '#a87a52', 'rgba(0,0,0,0.15)');
    const e = 0.25, rc = f.roof || '#6b4a3a';
    poly(ctx, [P(x - e, y - e, Hw - 2), P(x + w + e, y - e, Hw - 2), P(x + w + e, y + d / 2, Hr), P(x - e, y + d / 2, Hr)], shade(rc, -0.15));
    poly(ctx, [P(x - e, y + d / 2, Hr), P(x + w + e, y + d / 2, Hr), P(x + w + e, y + d + e, Hw - 2), P(x - e, y + d + e, Hw - 2)], rc, 'rgba(0,0,0,0.2)');
    if (snow) {
      poly(ctx, [P(x - e, y + d / 2, Hr + 2), P(x + w + e, y + d / 2, Hr + 2), P(x + w + e, y + d + e - 0.25, Hw + 3), P(x - e, y + d + e - 0.25, Hw + 3)], '#f6f9fc', 'rgba(150,175,200,0.5)');
      for (let i = 0; i < w * 3; i++) { const [a, b] = P(x - e + (i + 0.5) * (w + 2 * e) / (w * 3), y + d + e - 0.25, Hw + 3); ctx.fillStyle = '#f6f9fc'; ctx.beginPath(); ctx.ellipse(a, b + 1.5, 3.4, 2.4 + (i % 3), 0, 0, 7); ctx.fill(); }
      poly(ctx, [P(x + w + e, y - e, Hw), P(x + w + e, y + d / 2, Hr + 2), P(x + w + e, y + d / 2, Hr - 1)], '#e8eef4');
    }
    // 굴뚝 + 연기
    const chx = x + w * 0.72, chy = y + d * 0.3;
    box(ctx, chx, chy, Hr - 14, 0.45, 0.45, 22, '#c4b8a8', '#a99d8d', '#968a7b', 'rgba(0,0,0,0.2)');
    if (snow) box(ctx, chx - 0.03, chy - 0.03, Hr + 8, 0.51, 0.51, 2.5, '#ffffff', '#e8eef4', '#dce4ec');
    if (live(I)) for (let k = 0; k < 4; k++) { const u = (t * 0.25 + k / 4) % 1, [sx, sy] = P(chx + 0.22, chy + 0.22, Hr + 10 + u * 34); ctx.fillStyle = `rgba(235,235,240,${0.55 * (1 - u)})`; ctx.beginPath(); ctx.arc(sx + Math.sin(t + k) * 4 + u * 10, sy, 3 + u * 6, 0, 7); ctx.fill(); }
    if (f.label) onPlaneY(ctx, x + w / 2 - 1, y + d + e, Hw - 2, (g) => { g.fillStyle = '#3b2f2a'; roundRect(g, 0, 2, 64, 10, 2); g.fill(); g.fillStyle = '#ffe39a'; g.font = `bold 6px ${FONT}`; g.fillText(f.label, 4, 9.5); });
    if (on) glow(ctx, ...P(x + w * 0.7, y + d, 18), 50, '#ffcf80', 0.35);
  }, { depth: (f) => f.x + f.y + Math.min(f.w || 4, f.d || 3) + 0.3 });
  /** 개울 물결 (흐르는 거품 줄) — 움직임 전용 */
  prop('oa_flow', (ctx, f, t, I) => {
    if (!live(I)) return;
    ctx.save(); ctx.setLineDash([5, 12]); ctx.lineDashOffset = -t * 22; ctx.lineCap = 'round';
    for (const [o, a] of [[-0.35, 0.55], [0.3, 0.4]]) { ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1.3; ctx.beginPath(); f.pts.forEach(([x, y], i) => { const [sx, sy] = P(x + o, y); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.stroke(); }
    ctx.restore();
  }, { depth: BACK, dynamic: true });

  // ================================================================ 🌸 벚꽃길 소품
  /** 큰 벚나무 (꽃잎이 흩날린다) */
  prop('oa_sakura', (ctx, f, t, I) => {
    const s = f.size || 1, r = AIO.rand(f.seed || 3), sw = Math.sin(t * 0.8 + (f.seed || 0)) * 1.2;
    shadow(ctx, f.x + 0.25, f.y + 0.25, 1.15 * s);
    const [bx, by] = P(f.x, f.y, 0);
    ctx.fillStyle = '#6b4a3a'; ctx.beginPath(); ctx.moveTo(bx - 4 * s, by); ctx.quadraticCurveTo(bx - 1 * s, by - 16 * s, bx - 3 * s, by - 32 * s); ctx.lineTo(bx + 2 * s, by - 32 * s); ctx.quadraticCurveTo(bx + 2 * s, by - 14 * s, bx + 4.5 * s, by); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.moveTo(bx + 1 * s, by); ctx.quadraticCurveTo(bx + 1.5 * s, by - 16 * s, bx + 1 * s, by - 32 * s); ctx.lineTo(bx + 2 * s, by - 32 * s); ctx.quadraticCurveTo(bx + 2 * s, by - 14 * s, bx + 4.5 * s, by); ctx.fill();
    line(ctx, [[bx - 1 * s, by - 28 * s], [bx - 15 * s, by - 42 * s]], '#5a3e30', 2.6 * s); line(ctx, [[bx + 1 * s, by - 29 * s], [bx + 16 * s, by - 43 * s]], '#5a3e30', 2.4 * s);
    const cx = bx + sw, cy = by - 50 * s;
    const B = [[-21, -2, 13, 0], [21, -3, 13, 0], [0, -16, 16, 0], [-12, 5, 13, 1], [12, 5, 13, 1], [0, -3, 17, 1], [-26, 9, 9, 1], [26, 8, 9, 1], [-7, 12, 11, 2], [9, 11, 10, 2], [-2, -21, 10, 2], [16, -12, 8, 2], [-8, -12, 7, 3], [7, -5, 5, 3]];
    const pal = ['#ee9ab2', '#f6b3c6', '#fbcbd8', '#ffe3ec'];
    for (const [dx, dy, rr, k] of B) { ctx.fillStyle = pal[k]; ctx.beginPath(); ctx.arc(cx + dx * s * (1 + k * 0.02), cy + dy * s, rr * s, 0, 7); ctx.fill(); }
    for (let i = 0; i < 22; i++) { const a = r() * TAU, k = r(); ctx.fillStyle = r() < 0.5 ? '#ffffff' : '#e5849f'; ctx.fillRect(cx + Math.cos(a) * 26 * s * k, cy + Math.sin(a) * 16 * s * k, 1.6, 1.6); }
    if (live(I) && !I.low) for (let k = 0; k < 7; k++) {
      const u = (t * 0.18 + k * 0.143 + (f.seed || 0) * 0.07) % 1, px = cx + (r() - 0.5) * 60 * s + Math.sin(t * 1.6 + k) * 6, py = cy + 8 * s + u * 52 * s;
      ctx.fillStyle = `rgba(247,170,195,${0.9 - u * 0.5})`; ctx.save(); ctx.translate(px, py); ctx.rotate(t * 2 + k); ctx.beginPath(); ctx.ellipse(0, 0, 2.2, 1.2, 0, 0, 7); ctx.fill(); ctx.restore();
    }
  });
  /** 포장마차 (w×2, 반투명 주황 천막 · 어묵 · 떡볶이 · 김) — 주인은 뒤 칸(y)에 선다 */
  prop('oa_stall', (ctx, f, t, I) => {
    const { x, y } = f, w = f.w || 3, c = f.color || '#f07a3a', on = lit(I), Z = 44;
    shadow(ctx, x + w / 2, y + 1.1, w / 2 + 0.3, 1.2);
    for (const [px, py] of [[x, y], [x + w, y], [x, y + 2], [x + w, y + 2]]) line(ctx, [P(px, py, 0), P(px, py, Z)], '#9aa1a7', 1.4);
    poly(ctx, [P(x, y, 0), P(x + w, y, 0), P(x + w, y, Z), P(x, y, Z)], rgba(c, 0.55));
    poly(ctx, [P(x + w, y, 0), P(x + w, y + 2, 0), P(x + w, y + 2, Z), P(x + w, y, Z)], rgba(shade(c, -0.15), 0.5));
    // 카운터 · 음식
    box(ctx, x + 0.15, y + 1.05, 0, w - 0.3, 0.75, 18, '#d9dde1', '#c4c9cd', '#b5bbc0', 'rgba(0,0,0,0.15)');
    box(ctx, x + 0.1, y + 1.0, 18, w - 0.2, 0.85, 2, '#8a6247', '#7a5540', '#6b4a35');
    const pot = (px, col, steam) => { cylinder(ctx, px, y + 1.4, 20, 0.28, 5, col, '#7d858c'); if (steam && live(I)) for (let k = 0; k < 2; k++) { const u = (t * 0.5 + k / 2) % 1, [sx, sy] = P(px, y + 1.4, 26 + u * 18); ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - u)})`; ctx.beginPath(); ctx.arc(sx + Math.sin(t * 2 + k) * 2, sy, 2 + u * 3, 0, 7); ctx.fill(); } };
    pot(x + 0.6, '#e5534b', true);
    if (w > 2.2) pot(x + 1.5, '#e9c38a', true);
    for (let i = 0; i < 4; i++) { const [sx, sy] = P(x + w - 0.9 + i * 0.12, y + 1.3, 22); line(ctx, [[sx, sy], [sx + 1, sy - 9]], '#c9a26b', 0.8); ctx.fillStyle = '#f4ead8'; ctx.fillRect(sx - 1, sy - 8, 3, 4); }
    // 박공 천막 지붕 (용마루 x 방향) · 앞 현수막 · 전구
    const e = 0.15, RZ = Z + 18, y0 = y - e, y1 = y + 2 + e, ym = y + 1;
    poly(ctx, [P(x - e, y0, Z), P(x + w + e, y0, Z), P(x + w + e, ym, RZ), P(x - e, ym, RZ)], rgba(shade(c, -0.18), 0.92));
    poly(ctx, [P(x + w + e, y0, Z), P(x + w + e, y1, Z), P(x + w + e, ym, RZ)], rgba(shade(c, -0.28), 0.8), 'rgba(0,0,0,0.15)');
    poly(ctx, [P(x - e, ym, RZ), P(x + w + e, ym, RZ), P(x + w + e, y1, Z), P(x - e, y1, Z)], rgba(c, 0.82), 'rgba(0,0,0,0.15)');
    for (let i = 1; i < w * 2; i++) line(ctx, [P(x - e + i * (w + 2 * e) / (w * 2), ym, RZ), P(x - e + i * (w + 2 * e) / (w * 2), y1, Z)], 'rgba(255,255,255,0.18)', 1);
    line(ctx, [P(x - e, ym, RZ), P(x + w + e, ym, RZ)], shade(c, -0.35), 1.6);
    onPlaneY(ctx, x + 0.1, y1, Z, (g) => { const Wl = (w - 0.2) * 32; g.fillStyle = 'rgba(255,255,255,0.95)'; roundRect(g, 0, 0, Wl, 12, 2); g.fill(); g.strokeStyle = shade(c, -0.2); g.lineWidth = 1; g.stroke(); g.fillStyle = shade(c, -0.35); g.font = `bold 8px ${FONT}`; g.fillText(f.text || '🍢 포장마차', 4, 9); });
    for (let i = 0; i < 5; i++) { const [lx, ly] = P(x + 0.3 + i * (w - 0.6) / 4, y1, Z - 15 + Math.sin(i * 1.3) * 1.5); ctx.fillStyle = on || f.bulb ? '#ffe39a' : '#fff6d8'; ctx.beginPath(); ctx.arc(lx, ly, 1.8, 0, 7); ctx.fill(); }
    if (on) glow(ctx, ...P(x + w / 2, y + 1.6, Z - 10), 52, '#ffb860', 0.5);
  }, { depth: (f) => f.x + f.y + 1.5, slice: 3 });
  /** 하트 포토존 (폭 3 · 가운데 칸에 서서 사진) */
  prop('oa_photoZone', (ctx, f, t) => {
    const { x, y } = f;
    box(ctx, x + 0.2, y + 0.05, 0, 2.6, 0.9, 3, '#ffffff', '#f2e6ea', '#e6d6dc', 'rgba(0,0,0,0.1)');
    for (const px of [x + 0.35, x + 2.65]) sbox(ctx, px - 0.05, y + 0.45, 0, 0.1, 0.1, 50, '#f4f1ec');
    onPlaneY(ctx, x, y + 0.5, 86, (g) => {
      const cx = 48, heart = () => { g.beginPath(); g.moveTo(cx, 78); g.bezierCurveTo(cx - 52, 40, cx - 34, -6, cx, 18); g.bezierCurveTo(cx + 34, -6, cx + 52, 40, cx, 78); };
      heart(); g.strokeStyle = '#f2a7c3'; g.lineWidth = 7; g.stroke(); heart(); g.strokeStyle = '#f7c4d4'; g.lineWidth = 3; g.stroke();
      const r = AIO.rand(5); for (let i = 0; i < 40; i++) { const u = i / 40, a = u * TAU; const hx = cx + 16 * Math.pow(Math.sin(a), 3) * 2.6, hy = 44 - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 2.6; g.fillStyle = ['#ffffff', '#f07a8a', '#ffe3ec', '#e5849f'][Math.floor(r() * 4)]; g.beginPath(); g.arc(hx + r() * 3 - 1.5, hy + r() * 3 - 1.5, 2.2, 0, 7); g.fill(); }
      g.fillStyle = '#3b2f2a'; roundRect(g, cx - 22, 0, 44, 10, 3); g.fill(); g.fillStyle = '#ffe3ec'; g.font = `bold 6px ${FONT}`; g.fillText('📸 벚꽃 포토존', cx - 19, 7.5);
    });
  }, { depth: (f) => f.x + f.y + 2 });

  // ================================================================ 🏞️ 호숫가 소품
  /** 나무 선착장 (w×d 판자 데크, 물 위 기둥) */
  prop('oa_dock', (ctx, f) => {
    const { x, y, w, d } = f, z = 5;
    for (let j = 0.4; j < d; j += 1.6) for (const px of [x + 0.08, x + w - 0.12]) { cylinder(ctx, px, y + j, -4, 0.08, z + 7, '#6b4a35', '#5a3e2c'); }
    box(ctx, x, y, 1, w, d, z - 1, '#c49a62', '#a87a52', '#8a6247');
    for (let j = 0; j < d; j += 0.33) poly(ctx, [P(x, y + j, z), P(x + w, y + j, z), P(x + w, y + j + 0.3, z), P(x, y + j + 0.3, z)], (Math.round(j * 3) % 2) ? '#c9a26b' : '#bf9761', 'rgba(90,60,30,0.2)', 0.5);
    for (const px of [x + 0.08, x + w - 0.12]) cylinder(ctx, px, y + d - 0.15, z, 0.09, 7, '#8a6247', '#6b4a35');
  }, { depth: (f) => f.x + f.y - 0.5 });
  /** 오리배 (moored: 정박해서 출렁 · 아니면 호수 타원을 따라 돈다) */
  const swan = (ctx, sx, sy, flip, t, color, seed) => {
    const bob = Math.sin(t * 2 + seed) * 1.2;
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 31, 10, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(sx, sy + bob); ctx.scale(flip * 1.3, 1.3);
    ctx.fillStyle = '#e9edf1'; ctx.beginPath(); ctx.ellipse(0, -5, 19, 8, 0, 0, Math.PI); ctx.lineTo(-19, -8); ctx.ellipse(0, -8, 19, 7, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(-17, -6, 34, 3);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -11, 15, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f4f6f8'; ctx.beginPath(); ctx.moveTo(-15, -12); ctx.quadraticCurveTo(-24, -22, -18, -26); ctx.quadraticCurveTo(-12, -18, -8, -14); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(-7, -17, 9, 5); ctx.fillStyle = shade(color, -0.2); ctx.fillRect(-7, -22, 2, 6);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(11, -12); ctx.quadraticCurveTo(20, -18, 14, -26); ctx.quadraticCurveTo(10, -32, 15, -36); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(16, -36, 4.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#f08a3a'; ctx.beginPath(); ctx.moveTo(19.5, -37.5); ctx.lineTo(25, -35.5); ctx.lineTo(19.5, -34); ctx.fill();
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(16.5, -38, 1.5, 1.5);
    ctx.restore();
  };
  prop('oa_swanBoat', (ctx, f, t, I) => {
    if (f.moored) { const [sx, sy] = P(f.x, f.y, 0); swan(ctx, sx, sy, f.flip || 1, t, f.color || '#f07a8a', f.seed || 0); return; }
    if (!live(I)) return;
    const a = (f.phase || 0) + t * (f.speed || 0.04) * (f.dir || 1), x = f.cx + Math.cos(a) * f.rx, y = f.cy + Math.sin(a) * f.ry;
    const vx = -Math.sin(a) * f.rx * (f.dir || 1), vy = Math.cos(a) * f.ry * (f.dir || 1);
    f.x = x; f.y = y;
    const [sx, sy] = P(x, y, 0); swan(ctx, sx, sy, vx - vy >= 0 ? 1 : -1, t, f.color || '#f07a8a', f.seed || 0);
  }, { dynamic: true });
  /** 나룻배 (정박) */
  prop('oa_rowBoat', (ctx, f, t) => {
    const [sx, sy] = P(f.x, f.y, Math.sin(t * 1.8 + f.x) * 1.2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 26, 9, 0.46, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(0.46);
    ctx.fillStyle = '#8a6247'; ctx.beginPath(); ctx.ellipse(0, 0, 24, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#c49a62'; ctx.beginPath(); ctx.ellipse(0, -2, 20, 5.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#a87a52'; for (const o of [-7, 6]) ctx.fillRect(o, -7, 3, 10);
    ctx.fillStyle = f.color || '#4e7cf6'; ctx.fillRect(-24, -1, 48, 2);
    ctx.restore();
    line(ctx, [[sx - 4, sy - 4], [sx - 26, sy - 14]], '#7a5540', 1.4);
  }, { dynamic: true });
  /** 갈대 · 부들 무더기 */
  prop('oa_reeds', (ctx, f, t) => {
    const r = AIO.rand(f.seed || 4), n = f.n || 9;
    for (let i = 0; i < n; i++) {
      const [sx, sy] = P(f.x + (r() - 0.5) * 0.9, f.y + (r() - 0.5) * 0.9, 0), h = 16 + r() * 14, sw = Math.sin(t * 1.4 + i + f.x) * 2;
      ctx.strokeStyle = r() < 0.5 ? '#6f9a48' : '#88b25a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + sw * 0.3, sy - h * 0.6, sx + sw, sy - h); ctx.stroke();
      if (r() < 0.45) { ctx.fillStyle = '#7a5235'; roundRect(ctx, sx + sw - 1.6, sy - h - 1, 3.2, 7, 1.6); ctx.fill(); }
      else if (r() < 0.5) { ctx.fillStyle = 'rgba(240,230,200,0.85)'; ctx.beginPath(); ctx.ellipse(sx + sw, sy - h - 2, 2, 4, 0.3, 0, 7); ctx.fill(); }
    }
  });
  /** 낚싯대 (거치대 + 줄 + 찌) — 찌는 (f.tx, f.ty) */
  prop('oa_fishingRod', (ctx, f, t) => {
    const [ax, ay] = P(f.x, f.y, 6), [bx, by] = P(f.x + (f.tx - f.x) * 0.35, f.y + (f.ty - f.y) * 0.35, 40);
    line(ctx, [[ax, ay], [bx, by]], '#3b3f45', 1.4);
    ctx.fillStyle = '#c9cfd4'; ctx.beginPath(); ctx.arc(ax + (bx - ax) * 0.12, ay + (by - ay) * 0.12, 1.8, 0, 7); ctx.fill();
    const bob = Math.sin(t * 2.4 + f.x) * 1.2 + (Math.sin(t * 0.37 + f.y) > 0.92 ? 3 : 0), [cx, cy] = P(f.tx, f.ty, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx + cx) / 2, (by + cy) / 2 + 6, cx, cy + bob - 3); ctx.stroke();
    ctx.fillStyle = '#e5534b'; ctx.beginPath(); ctx.arc(cx, cy + bob - 3, 1.8, Math.PI, TAU); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy + bob - 3, 1.8, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(cx, cy + 1, 5 + bob, 2.4, 0, 0, 7); ctx.stroke();
  }, { depth: (f) => f.x + f.y - 0.3 });
  /** 오리배 대여소 (w×2 작은 매표 오두막) */
  prop('oa_boatHouse', (ctx, f, t, I) => {
    const { x, y } = f, w = f.w || 3;
    shadow(ctx, x + w / 2, y + 1, w / 2 + 0.3, 1.1);
    box(ctx, x, y, 0, w, 2, 32, '#f4f1ec', '#e9e4da', '#d9d3c8', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x, y + 2, 32, (g) => { g.fillStyle = '#3b7fd0'; g.fillRect(0, 0, w * 32, 4); g.fillStyle = '#cfe6f2'; g.fillRect(10, 8, w * 32 - 40, 12); g.fillStyle = '#8a6247'; g.fillRect(6, 20, w * 32 - 32, 3); g.fillStyle = '#6b4a35'; g.fillRect(w * 32 - 22, 10, 13, 22); });
    onPlaneX(ctx, x + w, y + 2, 32, (g) => { for (const [cx, c] of [[16, '#f08a3a'], [40, '#e5534b']]) { g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.arc(cx, 14, 5, 0, 7); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1; g.setLineDash([2, 2]); g.stroke(); g.setLineDash([]); } });
    poly(ctx, [P(x - 0.2, y - 0.2, 32), P(x + w + 0.2, y - 0.2, 32), P(x + w + 0.2, y + 1, 46), P(x - 0.2, y + 1, 46)], '#2f6fb8');
    poly(ctx, [P(x - 0.2, y + 1, 46), P(x + w + 0.2, y + 1, 46), P(x + w + 0.2, y + 2.25, 31), P(x - 0.2, y + 2.25, 31)], '#3b7fd0', 'rgba(0,0,0,0.2)');
    poly(ctx, [P(x + w + 0.2, y - 0.2, 32), P(x + w + 0.2, y + 2.25, 31), P(x + w + 0.2, y + 1, 46)], '#2a64a6');
    onPlaneY(ctx, x + 0.1, y + 2.25, 30, (g) => { g.fillStyle = '#ffffff'; roundRect(g, 0, -1, 74, 10, 2); g.fill(); g.fillStyle = '#2f6fb8'; g.font = `bold 6.5px ${FONT}`; g.fillText('🦢 오리배 대여 30분', 3, 6.5); });
  }, { depth: (f) => f.x + f.y + 2.2, slice: 1.4 });

  // ================================================================ ⛲ 광장 소품
  /** 큰 분수 (지름 4칸 · 3단 · 물줄기 · 물결) */
  prop('oa_bigFountain', (ctx, f, t, I) => {
    const { x, y } = f, R = f.r || 1.85, mv = live(I);
    shadow(ctx, x + 0.2, y + 0.2, R + 0.3);
    cylinder(ctx, x, y, 0, R, 10, '#e9e4da', '#d6cfc2', 'rgba(0,0,0,0.15)');
    ellipseFloor(ctx, x, y, R - 0.18, R - 0.18, 10, '#6fc0e3');
    ellipseFloor(ctx, x - 0.15, y - 0.15, R - 0.6, R - 0.6, 10, '#86cde9');
    if (mv) for (let k = 0; k < 3; k++) { const u = (t * 0.3 + k / 3) % 1; ellipseFloor(ctx, x, y, 0.5 + u * (R - 0.7), 0.5 + u * (R - 0.7), 10, null, `rgba(255,255,255,${0.6 * (1 - u)})`); }
    // 가장자리 작은 물줄기 (안쪽으로)
    ctx.strokeStyle = 'rgba(170,225,250,0.85)'; ctx.lineWidth = 1.2;
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, [ax, ay] = P(x + Math.cos(a) * (R - 0.15), y + Math.sin(a) * (R - 0.15), 11), [bx, by] = P(x + Math.cos(a) * (R - 0.9), y + Math.sin(a) * (R - 0.9), 10); const h = 16 + (mv ? Math.sin(t * 3 + k) * 2 : 0); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - h, bx, by); ctx.stroke(); }
    cylinder(ctx, x, y, 10, 0.32, 22, '#efe9df', '#d9d3c8');
    cylinder(ctx, x, y, 30, 1.0, 4, '#e9e4da', '#d6cfc2', 'rgba(0,0,0,0.12)');
    ellipseFloor(ctx, x, y, 0.85, 0.85, 34, '#7cc8e8');
    // 아래 단으로 떨어지는 물 커튼
    ctx.fillStyle = 'rgba(170,225,250,0.5)';
    { const [lx, ly] = P(x, y, 30), rx = 1.02 * 45.25 * 0.98; ctx.beginPath(); ctx.ellipse(lx, ly, rx, rx / 2, 0, 0, Math.PI); ctx.lineTo(lx - rx, ly + 16); ctx.ellipse(lx, ly + 16, rx * 1.06, rx / 2 * 1.06, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill(); }
    cylinder(ctx, x, y, 34, 0.14, 14, '#efe9df', '#d9d3c8');
    cylinder(ctx, x, y, 48, 0.45, 3, '#e9e4da', '#d6cfc2');
    ellipseFloor(ctx, x, y, 0.36, 0.36, 51, '#8fd3ee');
    const [tx, ty] = P(x, y, 51), jh = 26 + (mv ? Math.sin(t * 4) * 3 : 0);
    ctx.strokeStyle = 'rgba(190,235,255,0.95)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty - jh); ctx.stroke();
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + (mv ? t * 0.3 : 0), ex = tx + Math.cos(a) * 26, ey = ty + 12 + Math.sin(a) * 9; ctx.strokeStyle = 'rgba(170,225,250,0.8)'; ctx.beginPath(); ctx.moveTo(tx, ty - jh); ctx.quadraticCurveTo(tx + Math.cos(a) * 16, ty - jh - 8 + Math.sin(a) * 4, ex, ey); ctx.stroke(); }
    if (mv) for (let k = 0; k < 10; k++) { const u = (t * 0.9 + k * 0.1) % 1, a = k * 2.4; ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - u)})`; ctx.fillRect(tx + Math.cos(a) * 22 * u, ty - jh + u * u * 40 - u * 8, 1.6, 1.6); }
  }, { dynamic: true });
  /** 비둘기 떼 (콕콕 · 가끔 퍼드득) — 움직임 전용 */
  prop('oa_pigeons', (ctx, f, t, I) => {
    if (!live(I) || I.low) return;
    const n = f.n || 6, r = AIO.rand(f.seed || 2);
    for (let i = 0; i < n; i++) {
      const ox = (r() - 0.5) * 2.6, oy = (r() - 0.5) * 2, ph = r() * 9, cyc = (t * 0.06 + ph) % 1, fly = cyc > 0.93 ? Math.sin((cyc - 0.93) / 0.07 * Math.PI) : 0;
      const px = f.x + ox + Math.sin(t * 0.25 + ph) * 0.5, py = f.y + oy + Math.cos(t * 0.21 + ph) * 0.4, dir = Math.cos(t * 0.25 + ph) > 0 ? 1 : -1;
      const [sx, sy] = P(px, py, fly * 34), peck = !fly && Math.sin(t * 5 + ph * 3) > 0.55;
      if (!fly) { ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.beginPath(); ctx.ellipse(sx, sy, 5, 2, 0, 0, 7); ctx.fill(); }
      ctx.save(); ctx.translate(sx, sy); ctx.scale(dir, 1);
      if (!fly) { ctx.strokeStyle = '#e88a8a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(-1, -2.5); ctx.moveTo(1, 0); ctx.lineTo(1, -2.5); ctx.stroke(); }
      ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.ellipse(0, -5, 5.5, 3.4, -0.15, 0, 7); ctx.fill();
      ctx.fillStyle = '#7d8691'; ctx.beginPath(); ctx.ellipse(-1.5, -5.5, 3.6, 2.2, -0.2, 0, 7); ctx.fill();
      if (fly) { const w = Math.sin(t * 22 + i) * 5; ctx.fillStyle = '#b5bdc6'; ctx.beginPath(); ctx.moveTo(-1, -6); ctx.lineTo(-6, -11 - w); ctx.lineTo(2, -7); ctx.fill(); }
      const hx = peck ? 4.5 : 4, hy = peck ? -2.5 : -8.5;
      ctx.fillStyle = '#6fa58c'; ctx.beginPath(); ctx.arc(hx - 1.2, hy + 2, 2.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#8a94a0'; ctx.beginPath(); ctx.arc(hx, hy, 2.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#3b3f45'; ctx.fillRect(hx + 2, hy - 0.4, 1.8, 1); ctx.fillStyle = '#e5534b'; ctx.fillRect(hx + 0.4, hy - 1, 1, 1);
      ctx.restore();
    }
  }, { depth: (f) => f.x + f.y + 0.5, dynamic: true });
  /** 버스킹 무대 (원형 · 마이크 · 앰프 · 음표) — x,y 중심 */
  prop('oa_buskStage', (ctx, f, t, I) => {
    const { x, y } = f;
    shadow(ctx, x + 0.1, y + 0.1, 1.5);
    cylinder(ctx, x, y, 0, 1.35, 4, '#3b3f45', '#2d3035', 'rgba(0,0,0,0.2)');
    ellipseFloor(ctx, x, y, 1.2, 1.2, 4, null, 'rgba(242,194,48,0.8)');
    box(ctx, x + 0.4, y - 0.9, 4, 0.55, 0.45, 14, '#2b2b2b', '#232323', '#1d1d1d');
    onPlaneY(ctx, x + 0.42, y - 0.45, 17, (g) => { g.fillStyle = '#555'; g.beginPath(); g.arc(8, 6, 4.5, 0, 7); g.fill(); g.fillStyle = '#888'; g.beginPath(); g.arc(8, 6, 1.6, 0, 7); g.fill(); });
    line(ctx, [P(x - 0.2, y + 0.35, 4), P(x - 0.2, y + 0.35, 30)], '#9aa1a7', 1.2);
    { const [mx, my] = P(x - 0.2, y + 0.35, 30); ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(mx + 1, my - 1, 2.2, 0, 7); ctx.fill(); }
    // 기타 케이스 (팁)
    { const [gx, gy] = P(x + 0.4, y + 1.7, 0); ctx.fillStyle = '#3b2f2a'; ctx.beginPath(); ctx.ellipse(gx, gy, 10, 4, 0.2, 0, 7); ctx.fill(); ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.ellipse(gx, gy - 1, 8, 2.8, 0.2, 0, 7); ctx.fill(); ctx.fillStyle = '#f2c230'; for (let k = 0; k < 4; k++) ctx.fillRect(gx - 4 + k * 2.5, gy - 2 + (k % 2), 1.6, 1.2); }
    if (live(I) && !I.low) for (let k = 0; k < 3; k++) { const u = (t * 0.35 + k / 3) % 1, [nx, ny] = P(x, y, 40 + u * 40); ctx.fillStyle = `rgba(80,60,160,${0.9 * (1 - u)})`; ctx.font = `bold 10px ${FONT}`; ctx.fillText(k % 2 ? '♪' : '♫', nx + Math.sin(t * 2 + k) * 10 + (k - 1) * 10, ny); }
  }, { depth: (f) => f.x + f.y - 1.2 });
  /** 가판대 키오스크 (w×1.5, 잡지 · 신문 · 음료) */
  prop('oa_kiosk', (ctx, f, t, I) => {
    const { x, y } = f, w = f.w || 2;
    shadow(ctx, x + w / 2, y + 0.8, w / 2 + 0.3, 0.9);
    box(ctx, x, y, 0, w, 1.4, 36, '#2f7d4f', '#276a43', '#205a38', 'rgba(0,0,0,0.2)');
    onPlaneY(ctx, x, y + 1.4, 34, (g) => {
      g.fillStyle = '#f4f1ec'; g.fillRect(3, 6, w * 32 - 6, 22);
      const cs = ['#e5534b', '#4e7cf6', '#f2c230', '#3fb27f', '#a67be0', '#f07a8a', '#1f9fb4'];
      for (let i = 0; i < (w * 32 - 10) / 7; i++) for (let j = 0; j < 2; j++) { g.fillStyle = cs[(i * 3 + j) % cs.length]; g.fillRect(5 + i * 7, 8 + j * 10, 6, 8); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(6 + i * 7, 9 + j * 10, 4, 1.4); }
    });
    poly(ctx, [P(x - 0.25, y - 0.1, 38), P(x + w + 0.25, y - 0.1, 38), P(x + w + 0.25, y + 1.85, 32), P(x - 0.25, y + 1.85, 32)], '#e5534b', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x - 0.25, y + 1.85, 32, (g) => { for (let i = 0; i < (w + 0.5) * 32; i += 8) { g.fillStyle = (i / 8) % 2 ? '#ffffff' : '#e5534b'; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 8, 0); g.lineTo(i + 4, 5); g.fill(); } });
    onPlaneY(ctx, x + 0.05, y - 0.1, 50, (g) => { g.fillStyle = '#2b2622'; roundRect(g, 0, 0, w * 32 - 2, 10, 2); g.fill(); g.fillStyle = '#ffe39a'; g.font = `bold 6px ${FONT}`; g.fillText(f.text || '📰 가판대', 4, 7.5); });
    sbox(ctx, x + w / 2 - 0.04, y - 0.06, 36, 0.08, 0.08, 6, '#5d6166');
  }, { depth: (f) => f.x + f.y + 1.2, slice: 1.3 });
  /** 광장 시계탑 기둥 (실제 시각) */
  prop('oa_clock', (ctx, f) => {
    const { x, y } = f;
    shadow(ctx, x + 0.15, y + 0.15, 0.45);
    cylinder(ctx, x, y, 0, 0.32, 8, '#3b4a3f', '#2f3b33');
    cylinder(ctx, x, y, 8, 0.12, 64, '#3b4a3f', '#2f3b33');
    box(ctx, x - 0.32, y - 0.32, 72, 0.64, 0.64, 22, '#3b4a3f', '#33413a', '#2a362f', 'rgba(0,0,0,0.25)');
    const d = new Date(), hr = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * TAU, mn = d.getMinutes() / 60 * TAU;
    const face = (g) => { g.fillStyle = '#fbf6ea'; g.beginPath(); g.arc(10, 11, 8, 0, 7); g.fill(); g.strokeStyle = '#c9a54a'; g.lineWidth = 1.2; g.stroke(); g.strokeStyle = '#2b2b2b'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(10, 11); g.lineTo(10 + Math.sin(hr) * 4.5, 11 - Math.cos(hr) * 4.5); g.stroke(); g.lineWidth = 0.9; g.beginPath(); g.moveTo(10, 11); g.lineTo(10 + Math.sin(mn) * 6.5, 11 - Math.cos(mn) * 6.5); g.stroke(); };
    onPlaneY(ctx, x - 0.32, y + 0.32, 94, face); onPlaneX(ctx, x + 0.32, y + 0.32, 94, face);
    const [ax, ay] = P(x, y, 104); ctx.fillStyle = '#c9a54a'; ctx.beginPath(); ctx.moveTo(ax - 14, ay + 4); ctx.lineTo(ax, ay - 8); ctx.lineTo(ax + 14, ay + 4); ctx.fill();
  });

  // ================================================================ 🌾 농장 소품
  /** 빨간 헛간 (w×d, 박공 정면 +y · 큰 X자 문 · 건초 다락) */
  prop('oa_barn', (ctx, f, t) => {
    const { x, y } = f, w = f.w || 6, d = f.d || 4, Hw = 42, Hb = 60, Hr = 78;
    shadow(ctx, x + w / 2 + 0.3, y + d / 2 + 0.3, w / 2 + 0.5, d / 2 + 0.5);
    // 왼쪽 지붕(뒤)
    poly(ctx, [P(x - 0.15, y - 0.2, Hw - 2), P(x + w * 0.14, y - 0.2, Hb), P(x + w / 2, y - 0.2, Hr), P(x + w / 2, y + d + 0.2, Hr), P(x + w * 0.14, y + d + 0.2, Hb), P(x - 0.15, y + d + 0.2, Hw - 2)], '#5d4a44');
    box(ctx, x, y, 0, w, d, Hw, '#c94a3c', '#c94a3c', '#a83b30', 'rgba(0,0,0,0.2)');
    onPlaneX(ctx, x + w, y + d, Hw, (g) => { for (let u = 0; u < d * 32; u += 5) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(u, 0, 1, Hw); } for (const u of [d * 32 * 0.3, d * 32 * 0.7]) { g.fillStyle = '#f4f1ec'; g.fillRect(u - 8, 10, 16, 12); g.fillStyle = '#3b2f2a'; g.fillRect(u - 6, 12, 12, 8); g.strokeStyle = '#f4f1ec'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(u - 6, 12); g.lineTo(u + 6, 20); g.moveTo(u + 6, 12); g.lineTo(u - 6, 20); g.stroke(); } g.fillStyle = '#f4f1ec'; g.fillRect(0, 0, d * 32, 2.5); });
    // 오른쪽 지붕 (두 꺾임)
    poly(ctx, [P(x + w + 0.15, y - 0.2, Hw - 2), P(x + w + 0.15, y + d + 0.2, Hw - 2), P(x + w * 0.86, y + d + 0.2, Hb), P(x + w * 0.86, y - 0.2, Hb)], '#6b5650', 'rgba(0,0,0,0.2)');
    poly(ctx, [P(x + w * 0.86, y - 0.2, Hb), P(x + w * 0.86, y + d + 0.2, Hb), P(x + w / 2, y + d + 0.2, Hr), P(x + w / 2, y - 0.2, Hr)], '#7a645d', 'rgba(0,0,0,0.2)');
    for (let j = 0.3; j < d + 0.2; j += 0.6) line(ctx, [P(x + w + 0.15, y + j, Hw - 2), P(x + w * 0.86, y + j, Hb), P(x + w / 2, y + j, Hr)], 'rgba(0,0,0,0.1)', 0.8);
    // 정면 박공 (+y)
    onPlaneY(ctx, x, y + d, Hr, (g) => {
      const Wl = w * 32, top = Hr - Hw;
      g.beginPath(); g.moveTo(0, Hr); g.lineTo(0, top); g.lineTo(Wl * 0.14, Hr - Hb); g.lineTo(Wl / 2, 0); g.lineTo(Wl * 0.86, Hr - Hb); g.lineTo(Wl, top); g.lineTo(Wl, Hr); g.closePath(); g.fillStyle = '#d4513f'; g.fill();
      for (let u = 4; u < Wl; u += 6) { g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(u, 0, 1, Hr); }
      g.strokeStyle = '#f4f1ec'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, top); g.lineTo(Wl * 0.14, Hr - Hb); g.lineTo(Wl / 2, 0); g.lineTo(Wl * 0.86, Hr - Hb); g.lineTo(Wl, top); g.stroke();
      const dw = Wl * 0.42, dx = (Wl - dw) / 2, dh = 30;
      g.fillStyle = '#b8402f'; g.fillRect(dx, Hr - dh, dw, dh); g.strokeStyle = '#f4f1ec'; g.lineWidth = 2; g.strokeRect(dx, Hr - dh, dw, dh);
      g.beginPath(); g.moveTo(dx + dw / 2, Hr - dh); g.lineTo(dx + dw / 2, Hr); for (const [a, b] of [[dx, dx + dw / 2], [dx + dw / 2, dx + dw]]) { g.moveTo(a, Hr - dh); g.lineTo(b, Hr); g.moveTo(b, Hr - dh); g.lineTo(a, Hr); } g.stroke();
      g.fillStyle = '#f4f1ec'; g.fillRect(Wl / 2 - 11, Hr - Hb + 6, 22, 16); g.fillStyle = '#e2bd5c'; g.fillRect(Wl / 2 - 9, Hr - Hb + 8, 18, 12); g.strokeStyle = '#c99a3c'; g.lineWidth = 0.8; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(Wl / 2 - 8 + k * 3, Hr - Hb + 20); g.lineTo(Wl / 2 - 7 + k * 3, Hr - Hb + 12); g.stroke(); }
      g.fillStyle = '#f4f1ec'; g.fillRect(Wl / 2 - 1, 4, 2, 6);
    });
  }, { depth: (f) => f.x + f.y + Math.min(f.w || 6, f.d || 4) + 0.3 });
  /** 사일로 (원통 + 돔 지붕) — x,y 중심 */
  prop('oa_silo', (ctx, f) => {
    const { x, y } = f, r = 0.85, H = 82;
    shadow(ctx, x + 0.25, y + 0.25, 1);
    cylinder(ctx, x, y, 0, r, H, '#c9d3dc', '#aab6c1', 'rgba(0,0,0,0.15)');
    const [sx, sy] = P(x, y, 0), rx = r * 45.25 * 0.98;
    ctx.save(); ctx.beginPath(); ctx.rect(sx, sy - H - 30, rx + 2, H + 60); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(sx, sy, rx, rx / 2, 0, 0, Math.PI); ctx.lineTo(sx - rx, sy - H); ctx.ellipse(sx, sy - H, rx, rx / 2, 0, Math.PI, 0, true); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(90,100,110,0.35)'; ctx.lineWidth = 1; for (let z = 10; z < H; z += 10) { ctx.beginPath(); ctx.ellipse(sx, sy - z, rx, rx / 2, 0, 0, Math.PI); ctx.stroke(); }
    ctx.fillStyle = '#9aa6b1'; ctx.beginPath(); ctx.ellipse(sx, sy - H, rx, rx / 2, 0, Math.PI, 0); ctx.ellipse(sx, sy - H, rx, rx / 2 + 22, 0, 0, Math.PI, true); ctx.fill();
    ctx.fillStyle = '#b8c3cd'; ctx.beginPath(); ctx.ellipse(sx - rx * 0.3, sy - H - 12, rx * 0.4, 6, -0.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#7d858c'; ctx.beginPath(); ctx.arc(sx, sy - H - rx / 2 - 20, 3, 0, 7); ctx.fill();
    for (let z = 4; z < H; z += 6) { ctx.fillStyle = '#6d757c'; ctx.fillRect(sx - rx * 0.55, sy + rx * 0.3 - z, 7, 1.4); }
    ctx.fillStyle = '#e5534b'; ctx.font = `bold 8px ${FONT}`; ctx.fillText('AI FARM', sx - 18, sy - H * 0.55);
  });
  /** 풍차 (x,y 중심 · 날개가 돈다) */
  prop('oa_windmill', (ctx, f, t) => {
    const { x, y } = f, H = 76;
    shadow(ctx, x + 0.3, y + 0.3, 1.3);
    const [bx, by] = P(x, y, 0), w0 = 34, w1 = 20;
    ctx.fillStyle = '#f4ead8'; ctx.beginPath(); ctx.moveTo(bx - w0, by - 4); ctx.lineTo(bx - w1, by - H); ctx.lineTo(bx + w1, by - H); ctx.lineTo(bx + w0, by - 4); ctx.quadraticCurveTo(bx, by + 12, bx - w0, by - 4); ctx.fill();
    ctx.fillStyle = 'rgba(120,90,60,0.18)'; ctx.beginPath(); ctx.moveTo(bx + 2, by + 4); ctx.lineTo(bx + 2, by - H); ctx.lineTo(bx + w1, by - H); ctx.lineTo(bx + w0, by - 4); ctx.quadraticCurveTo(bx + 18, by + 4, bx + 2, by + 4); ctx.fill();
    ctx.strokeStyle = 'rgba(150,120,90,0.35)'; ctx.lineWidth = 0.8; for (let z = 14; z < H; z += 12) { const k = z / H, hw = w0 + (w1 - w0) * k; ctx.beginPath(); ctx.moveTo(bx - hw, by - z); ctx.quadraticCurveTo(bx, by - z + 8, bx + hw, by - z); ctx.stroke(); }
    ctx.fillStyle = '#6b4a35'; roundRect(ctx, bx - 14, by - 22, 11, 20, 5); ctx.fill(); ctx.fillStyle = '#cfe6f2'; ctx.fillRect(bx + 6, by - 50, 8, 9); ctx.strokeStyle = '#8a6247'; ctx.strokeRect(bx + 6, by - 50, 8, 9);
    ctx.fillStyle = '#8a4a3a'; ctx.beginPath(); ctx.moveTo(bx - w1 - 6, by - H + 2); ctx.quadraticCurveTo(bx, by - H - 34, bx + w1 + 6, by - H + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.moveTo(bx + 2, by - H - 16); ctx.quadraticCurveTo(bx + 14, by - H - 10, bx + w1 + 6, by - H + 2); ctx.lineTo(bx + 2, by - H + 2); ctx.fill();
    const hx = bx - 6, hy = by - H + 2, a0 = t * 0.9;
    for (let k = 0; k < 4; k++) {
      const a = a0 + k * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), L = 52, W2 = 9;
      ctx.strokeStyle = '#6b4a35'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + ca * L, hy + sa * L * 0.9); ctx.stroke();
      const p = (s, o) => [hx + ca * L * s - sa * o, hy + (sa * L * s + ca * o) * 0.9];
      ctx.fillStyle = 'rgba(250,245,235,0.92)'; ctx.beginPath(); ctx.moveTo(...p(0.22, 0)); ctx.lineTo(...p(1, 0)); ctx.lineTo(...p(1, W2)); ctx.lineTo(...p(0.22, W2)); ctx.fill();
      ctx.strokeStyle = 'rgba(120,90,60,0.6)'; ctx.lineWidth = 0.6; for (let s = 0.3; s < 1; s += 0.14) { ctx.beginPath(); ctx.moveTo(...p(s, 0)); ctx.lineTo(...p(s, W2)); ctx.stroke(); }
    }
    ctx.fillStyle = '#3b2f2a'; ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, 7); ctx.fill();
  }, { dynamic: true });
  /** 건초 (kind 'roll' 둥근 곤포 · 'bale' 네모 더미) */
  prop('oa_hay', (ctx, f) => {
    const { x, y } = f;
    if (f.kind === 'bale') {
      box(ctx, x - 0.45, y - 0.3, 0, 0.9, 0.6, 12, '#ecd27e', '#d9b95a', '#c9a64a', 'rgba(120,90,30,0.3)');
      box(ctx, x - 0.3, y - 0.25, 12, 0.7, 0.5, 11, '#f0d98a', '#ddbf62', '#cdac52', 'rgba(120,90,30,0.3)');
      for (const o of [-0.2, 0.2]) { line(ctx, [P(x + o, y + 0.3, 0), P(x + o, y + 0.3, 12)], 'rgba(120,80,30,0.6)', 0.8); }
      return;
    }
    shadow(ctx, x + 0.1, y + 0.1, 0.55);
    cylinder(ctx, x, y, 0, 0.48, 24, '#efd889', '#d9b95a', 'rgba(120,90,30,0.35)');
    const [sx, sy] = P(x, y, 24); ctx.strokeStyle = 'rgba(160,120,40,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); for (let a = 0; a < 14; a += 0.3) { const rr = a * 1.5; const px = sx + Math.cos(a) * rr, py = sy + Math.sin(a) * rr * 0.5; a ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
    ctx.strokeStyle = 'rgba(170,130,50,0.5)'; for (let k = 0; k < 8; k++) { const [a, b] = P(x - 0.3 + k * 0.09, y + 0.4, 2 + (k % 3) * 6); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + 3, b - 4); ctx.stroke(); }
  });
  /** 트랙터 (x 방향 2칸, 큰 뒷바퀴) */
  prop('oa_tractor', (ctx, f, t) => {
    const { x, y } = f, c = f.color || '#3f9a4b';
    shadow(ctx, x + 1, y + 0.55, 1.2, 0.6);
    const wheel = (wx, wy, r, z) => onPlaneY(ctx, wx - r, wy, z + r * 2, (g) => { const R = r * 32; g.fillStyle = '#2b2b2b'; g.beginPath(); g.arc(R, R, R, 0, 7); g.fill(); g.strokeStyle = '#444'; g.lineWidth = 2; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; g.beginPath(); g.moveTo(R + Math.cos(a) * R * 0.75, R + Math.sin(a) * R * 0.75); g.lineTo(R + Math.cos(a) * R, R + Math.sin(a) * R); g.stroke(); } g.fillStyle = '#f2c230'; g.beginPath(); g.arc(R, R, R * 0.5, 0, 7); g.fill(); g.fillStyle = '#d9a91a'; g.beginPath(); g.arc(R, R, R * 0.18, 0, 7); g.fill(); });
    wheel(x + 0.5, y + 0.05, 0.42, 0); wheel(x + 1.6, y + 0.15, 0.26, 0);
    box(ctx, x + 0.9, y + 0.25, 10, 1.1, 0.6, 14, shade(c, 0.1), c, shade(c, -0.15), 'rgba(0,0,0,0.2)');
    onPlaneY(ctx, x + 1.2, y + 0.85, 22, (g) => { g.fillStyle = '#2b2b2b'; for (let k = 0; k < 4; k++) g.fillRect(4 + k * 5, 3, 3, 8); });
    box(ctx, x + 0.15, y + 0.15, 8, 0.85, 0.8, 8, shade(c, 0.1), c, shade(c, -0.15), 'rgba(0,0,0,0.2)');
    for (const [px, py] of [[x + 0.2, y + 0.2], [x + 0.9, y + 0.2], [x + 0.2, y + 0.9], [x + 0.9, y + 0.9]]) sbox(ctx, px, py, 16, 0.05, 0.05, 24, '#3b3f45');
    box(ctx, x + 0.1, y + 0.1, 40, 0.95, 0.9, 2.5, '#f4f1ec', '#e3ddd3', '#d6cfc2', 'rgba(0,0,0,0.2)');
    box(ctx, x + 0.4, y + 0.4, 16, 0.3, 0.3, 6, '#3b2f2a', '#2b2b2b', '#232323');
    cylinder(ctx, x + 1.8, y + 0.35, 24, 0.05, 16, '#7d858c', '#6d757c');
    if (f.puff !== false) for (let k = 0; k < 3; k++) { const u = (t * 0.4 + k / 3) % 1, [sx, sy] = P(x + 1.8, y + 0.35, 42 + u * 22); ctx.fillStyle = `rgba(120,120,120,${0.4 * (1 - u)})`; ctx.beginPath(); ctx.arc(sx + u * 8, sy, 2 + u * 4, 0, 7); ctx.fill(); }
    wheel(x + 0.5, y + 0.95, 0.42, 0); wheel(x + 1.6, y + 0.85, 0.26, 0);
  }, { depth: (f) => f.x + f.y + 1 });
  /** 허수아비 (흔들) — x,y 중심 */
  prop('oa_scarecrow', (ctx, f, t) => {
    const { x, y } = f, [bx, by] = P(x, y, 0), sw = Math.sin(t * 1.1 + x) * 2;
    shadow(ctx, x + 0.2, y + 0.2, 0.45);
    line(ctx, [[bx, by], [bx + sw * 0.3, by - 52]], '#8a6247', 2.6);
    line(ctx, [[bx - 20 + sw * 0.5, by - 40], [bx + 20 + sw * 0.5, by - 41]], '#8a6247', 2.2);
    ctx.fillStyle = '#d9534b'; ctx.beginPath(); ctx.moveTo(bx - 14 + sw * 0.5, by - 42); ctx.lineTo(bx + 14 + sw * 0.5, by - 42); ctx.lineTo(bx + 9 + sw * 0.4, by - 22); ctx.lineTo(bx - 9 + sw * 0.4, by - 22); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.8; for (const o of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(bx + o + sw * 0.5, by - 42); ctx.lineTo(bx + o * 0.7 + sw * 0.4, by - 22); ctx.stroke(); } for (const v of [-36, -29]) { ctx.beginPath(); ctx.moveTo(bx - 13 + sw * 0.5, by + v); ctx.lineTo(bx + 13 + sw * 0.5, by + v); ctx.stroke(); }
    ctx.fillStyle = '#e9c35a'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(bx + s * 20 + sw * 0.5, by - 41); ctx.lineTo(bx + s * 25 + sw * 0.5, by - 44); ctx.lineTo(bx + s * 25 + sw * 0.5, by - 37); ctx.fill(); }
    const hx = bx + sw * 0.6, hy = by - 50;
    ctx.fillStyle = '#e8d2a6'; ctx.beginPath(); ctx.arc(hx, hy, 6.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3b2f2a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(hx - 3.5, hy - 1.5); ctx.lineTo(hx - 1.5, hy + 0.5); ctx.moveTo(hx - 1.5, hy - 1.5); ctx.lineTo(hx - 3.5, hy + 0.5); ctx.moveTo(hx + 1.5, hy - 1.5); ctx.lineTo(hx + 3.5, hy + 0.5); ctx.moveTo(hx + 3.5, hy - 1.5); ctx.lineTo(hx + 1.5, hy + 0.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy + 2, 2.6, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = '#d9b95a'; ctx.beginPath(); ctx.ellipse(hx, hy - 5, 13, 3.4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#c9a64a'; ctx.beginPath(); ctx.ellipse(hx, hy - 8, 6.5, 5, 0, Math.PI, TAU); ctx.fill(); ctx.fillStyle = '#e5534b'; ctx.fillRect(hx - 6.5, hy - 8, 13, 2);
    if (Math.sin(t * 0.3 + x) > -0.2) { const cx = bx + 18 + sw * 0.5, cy = by - 44; ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.ellipse(cx, cy, 3.6, 2.6, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(cx + 3, cy - 2.4, 2, 0, 7); ctx.fill(); ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.moveTo(cx + 4.6, cy - 2.8); ctx.lineTo(cx + 7, cy - 2.2); ctx.lineTo(cx + 4.6, cy - 1.6); ctx.fill(); }
  });
  /** 젖소 (풀 뜯기 · 꼬리 살랑) — x,y 중심 */
  prop('oa_cow', (ctx, f, t) => {
    const { x, y } = f, [sx, sy] = P(x, y, 0), fl = f.flip || 1, graze = Math.sin(t * 0.6 + (f.seed || 0)) > 0, chew = Math.sin(t * 6) * 0.6;
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(sx, sy, 22, 8, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(sx, sy); ctx.scale(fl, 1);
    ctx.fillStyle = '#e6e0d6'; for (const lx of [-12, -6, 7, 13]) ctx.fillRect(lx - 1.6, -12, 3.4, 12); ctx.fillStyle = '#3b3f45'; for (const lx of [-12, -6, 7, 13]) ctx.fillRect(lx - 1.6, -2, 3.4, 2);
    ctx.fillStyle = '#ffffff'; roundRect(ctx, -17, -26, 34, 17, 8); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.ellipse(-7, -21, 6, 4, 0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(6, -14, 5, 3.5, -0.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(12, -22, 3, 2.4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2b5c4'; ctx.beginPath(); ctx.ellipse(-4, -9, 4, 2.4, 0, 0, 7); ctx.fill();
    const tw = Math.sin(t * 3 + (f.seed || 0)) * 3; ctx.strokeStyle = '#e6e0d6'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-17, -22); ctx.quadraticCurveTo(-21, -16 + tw * 0.3, -20 + tw, -10); ctx.stroke(); ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(-20 + tw, -9, 1.8, 0, 7); ctx.fill();
    const hx = 19, hy = graze ? -8 + chew : -26;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(hx, hy, 6.5, 6, graze ? 0.5 : 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.stroke();
    ctx.fillStyle = '#f2b5c4'; ctx.beginPath(); ctx.ellipse(hx + 3, hy + 3.5, 4.4, 3, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#c98a9a'; ctx.fillRect(hx + 1.5, hy + 3, 1, 1); ctx.fillRect(hx + 4, hy + 3, 1, 1);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(hx - 0.5, hy - 2.5, 1.6, 1.6);
    ctx.fillStyle = '#f4ead8'; ctx.beginPath(); ctx.moveTo(hx - 4, hy - 4); ctx.lineTo(hx - 6, hy - 9); ctx.lineTo(hx - 2, hy - 5); ctx.fill(); ctx.beginPath(); ctx.moveTo(hx + 1, hy - 5); ctx.lineTo(hx + 2, hy - 10); ctx.lineTo(hx + 4, hy - 5); ctx.fill();
    ctx.fillStyle = '#e6e0d6'; ctx.beginPath(); ctx.ellipse(hx - 6, hy - 2, 3.4, 1.6, -0.4, 0, 7); ctx.fill();
    ctx.restore();
  });
  /** 나무 울타리 (칸 한 변: axis 'x' 는 y=f.y 선 위, 'y' 는 x=f.x 선 위) */
  prop('oa_rail', (ctx, f) => {
    const [a, b] = P(f.x, f.y, 0), [c, d] = f.axis === 'x' ? P(f.x + 1, f.y, 0) : P(f.x, f.y + 1, 0);
    for (const z of [8, 16]) { ctx.fillStyle = '#c49a62'; ctx.beginPath(); ctx.moveTo(a, b - z); ctx.lineTo(c, d - z); ctx.lineTo(c, d - z - 2.6); ctx.lineTo(a, b - z - 2.6); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(Math.min(a, c), Math.min(b, d) - z, Math.abs(c - a), 0.8); }
    ctx.fillStyle = '#8a6247'; ctx.fillRect(a - 1.5, b - 21, 3, 21); ctx.fillStyle = '#a87a52'; ctx.fillRect(a - 1.5, b - 21, 1.5, 21);
    if (f.end) { ctx.fillStyle = '#8a6247'; ctx.fillRect(c - 1.5, d - 21, 3, 21); }
  });
  /** 농장 직판장 (w×1.5, 채소 상자 · 지붕) */
  prop('oa_produceStand', (ctx, f) => {
    const { x, y } = f, w = f.w || 3;
    shadow(ctx, x + w / 2, y + 0.8, w / 2 + 0.3, 0.9);
    for (const [px, py] of [[x + 0.1, y + 0.1], [x + w - 0.2, y + 0.1], [x + 0.1, y + 1.2], [x + w - 0.2, y + 1.2]]) sbox(ctx, px, py, 0, 0.1, 0.1, 44, '#8a6247');
    box(ctx, x, y + 0.3, 0, w, 1.1, 14, '#c49a62', '#a87a52', '#8a6247', 'rgba(0,0,0,0.15)');
    const crates = ['#e5534b', '#f08a3a', '#7cc472', '#8a5ab8', '#f2c230', '#3f9a4b'];
    for (let i = 0; i < w * 2 - 1; i++) { const cx = x + 0.15 + i * 0.5; box(ctx, cx, y + 0.45, 14, 0.42, 0.8, 5, '#d9b98a', '#c49a62', '#a87a52'); const c = crates[i % crates.length]; for (let k = 0; k < 4; k++) dot(ctx, cx + 0.12 + (k % 2) * 0.18, y + 0.6 + Math.floor(k / 2) * 0.35, 20, 2.6, c); }
    poly(ctx, [P(x - 0.2, y - 0.1, 50), P(x + w + 0.2, y - 0.1, 50), P(x + w + 0.2, y + 1.6, 42), P(x - 0.2, y + 1.6, 42)], '#3f8a45', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x - 0.2, y + 1.6, 42, (g) => { for (let i = 0; i < (w + 0.4) * 32; i += 8) { g.fillStyle = (i / 8) % 2 ? '#ffffff' : '#3f8a45'; g.fillRect(i, 0, 8, 5); } });
    onPlaneY(ctx, x + 0.2, y + 1.4, 12, (g) => { g.fillStyle = '#f6efd8'; roundRect(g, 0, 0, w * 32 - 12, 9, 2); g.fill(); g.fillStyle = '#7a4a2a'; g.font = `bold 5.5px ${FONT}`; g.fillText('🥕 오늘 딴 채소 · 달걀', 3, 6.5); });
  }, { depth: (f) => f.x + f.y + 1, slice: 1.4 });

  // ================================================================ ⛳ 골프 소품
  /** 핀 깃발 (번호) */
  prop('oa_pin', (ctx, f, t) => {
    const [bx, by] = P(f.x, f.y, 0); line(ctx, [[bx, by], [bx, by - 46]], '#f4f1ec', 1.6);
    ctx.fillStyle = f.color || '#e5534b'; ctx.beginPath(); ctx.moveTo(bx, by - 46);
    for (let i = 0; i <= 6; i++) ctx.lineTo(bx + i * 3, by - 46 + Math.sin(t * 5 + i * 0.9) * 1.6 + i * 0.8);
    for (let i = 6; i >= 0; i--) ctx.lineTo(bx + i * 3, by - 36 + Math.sin(t * 5 + i * 0.9) * 1.6 + i * 0.3);
    ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.font = `bold 6px ${FONT}`; ctx.fillText(String(f.n || 1), bx + 6, by - 38.5);
  }, { dynamic: true });
  /** 골프 카트 (axis 'x'|'y' · dir) — x,y 중심 */
  const cart = (ctx, x, y, axis, dir, color) => {
    const L = 1.5, Wd = 0.85, ax = axis === 'x', w = ax ? L : Wd, d = ax ? Wd : L, x0 = x - w / 2, y0 = y - d / 2;
    ellipseFloor(ctx, x, y, w / 2 + 0.15, d / 2 + 0.15, 0, 'rgba(0,0,0,0.15)');
    const front = (s) => (ax ? [x0 + (dir > 0 ? L - s : s), null] : [null, y0 + (dir > 0 ? L - s : s)]);
    for (const s of [0.25, L - 0.25]) for (const o of [0.05, Wd - 0.05]) { const px = ax ? x0 + s : x0 + o, py = ax ? y0 + o : y0 + s; cylinder(ctx, px, py, 0, 0.13, 4, '#2b2b2b', '#2b2b2b'); }
    box(ctx, x0, y0, 4, w, d, 8, '#ffffff', '#e9edf1', '#d9dde1', 'rgba(0,0,0,0.2)');
    // 좌석 · 등받이
    const [fx] = front(0.55), [, fy] = front(0.55);
    if (ax) { const sx = dir > 0 ? x0 + 0.35 : x0 + L - 0.85; box(ctx, sx, y0 + 0.1, 12, 0.5, Wd - 0.2, 3, color, shade(color, -0.1), shade(color, -0.2)); box(ctx, dir > 0 ? sx - 0.08 : sx + 0.5, y0 + 0.1, 12, 0.08, Wd - 0.2, 12, shade(color, -0.05), shade(color, -0.15), shade(color, -0.25)); }
    else { const sy = dir > 0 ? y0 + 0.35 : y0 + L - 0.85; box(ctx, x0 + 0.1, sy, 12, Wd - 0.2, 0.5, 3, color, shade(color, -0.1), shade(color, -0.2)); box(ctx, x0 + 0.1, dir > 0 ? sy - 0.08 : sy + 0.5, 12, Wd - 0.2, 0.08, 12, shade(color, -0.05), shade(color, -0.15), shade(color, -0.25)); }
    // 골프백 (뒤)
    const bx = ax ? (dir > 0 ? x0 + 0.15 : x0 + L - 0.15) : x0 + Wd / 2, by = ax ? y0 + Wd / 2 : (dir > 0 ? y0 + 0.15 : y0 + L - 0.15);
    cylinder(ctx, bx, by, 12, 0.14, 14, '#3b3f45', '#2b2f35'); for (let k = 0; k < 3; k++) { const [cx, cy] = P(bx, by, 26); line(ctx, [[cx - 2 + k * 2, cy], [cx - 3 + k * 3, cy - 6]], '#c9cfd4', 1); }
    // 지붕
    for (const s of [0.3, L - 0.3]) for (const o of [0.08, Wd - 0.08]) { const px = ax ? x0 + s : x0 + o, py = ax ? y0 + o : y0 + s; sbox(ctx, px - 0.03, py - 0.03, 12, 0.06, 0.06, 26, '#d9dde1'); }
    box(ctx, x0 + (ax ? 0.15 : 0), y0 + (ax ? 0 : 0.15), 38, ax ? L - 0.3 : Wd, ax ? Wd : L - 0.3, 2.5, color, shade(color, -0.1), shade(color, -0.2), 'rgba(0,0,0,0.2)');
    void fx; void fy;
  };
  prop('oa_golfCart', (ctx, f, t, I) => {
    if (!f.path) { cart(ctx, f.x, f.y, f.axis || 'x', f.dir || 1, f.color || '#3fb27f'); return; }
    if (!live(I)) return;
    // 경로 왕복 (축 정렬 폴리라인)
    const pts = f.path, seg = []; let tot = 0;
    for (let i = 0; i < pts.length - 1; i++) { const l = Math.abs(pts[i + 1][0] - pts[i][0]) + Math.abs(pts[i + 1][1] - pts[i][1]); seg.push(l); tot += l; }
    const per = tot * 2, s0 = (t * (f.speed || 1.6) + (f.phase || 0)) % per, back = s0 > tot; let s = back ? per - s0 : s0, i = 0;
    while (i < seg.length - 1 && s > seg[i]) { s -= seg[i]; i++; }
    const [ax0, ay0] = pts[i], [ax1, ay1] = pts[i + 1], k = seg[i] ? s / seg[i] : 0, x = ax0 + (ax1 - ax0) * k, y = ay0 + (ay1 - ay0) * k;
    const axis = Math.abs(ax1 - ax0) > Math.abs(ay1 - ay0) ? 'x' : 'y', dir = Math.sign(axis === 'x' ? ax1 - ax0 : ay1 - ay0) * (back ? -1 : 1) || 1;
    f.x = x; f.y = y; cart(ctx, x, y, axis, dir, f.color || '#3fb27f');
  }, { dynamic: true });
  /** 티잉 그라운드 표지 (티 마커 2개 · 공 · 홀 안내판) */
  prop('oa_tee', (ctx, f) => {
    const { x, y } = f;
    for (const o of [-0.8, 0.8]) { const [sx, sy] = P(x, y + o, 0); ctx.fillStyle = f.color || '#4e7cf6'; ctx.beginPath(); ctx.arc(sx, sy - 3, 3.4, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(sx - 1, sy - 4.4, 1.2, 0, 7); ctx.fill(); }
    { const [sx, sy] = P(x + 0.2, y, 0); line(ctx, [[sx, sy], [sx, sy - 3]], '#f4f1ec', 1); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx, sy - 4.6, 1.8, 0, 7); ctx.fill(); }
    sbox(ctx, x - 0.9, y - 1.3, 0, 0.08, 0.08, 20, '#7a5540');
    onPlaneY(ctx, x - 1.5, y - 1.2, 30, (g) => { g.fillStyle = '#2f5d3a'; roundRect(g, 0, 0, 40, 13, 2); g.fill(); g.fillStyle = '#fff'; g.font = `bold 5.5px ${FONT}`; g.fillText(f.text || '1번 홀 · PAR 4', 3, 6); g.fillStyle = '#cfe8c0'; g.font = `4.5px ${FONT}`; g.fillText(f.sub || '320 m', 3, 11); });
  });
  /** 골프백 거치대 */
  prop('oa_bagRack', (ctx, f) => {
    const { x, y } = f, w = f.w || 2;
    box(ctx, x, y + 0.3, 0, w, 0.4, 6, '#a87a52', '#8a6247', '#6b4a35');
    sbox(ctx, x + 0.05, y + 0.25, 0, 0.08, 0.08, 26, '#8a6247'); sbox(ctx, x + w - 0.13, y + 0.25, 0, 0.08, 0.08, 26, '#8a6247');
    line(ctx, [P(x, y + 0.3, 24), P(x + w, y + 0.3, 24)], '#8a6247', 2);
    const cs = ['#3b3f45', '#e5534b', '#ffffff', '#4e7cf6', '#3fb27f'];
    for (let i = 0; i < w * 2 - 1; i++) { const bx = x + 0.3 + i * 0.5; cylinder(ctx, bx, y + 0.5, 2, 0.17, 26, shade(cs[i % cs.length], 0.08), cs[i % cs.length], 'rgba(0,0,0,0.2)'); const [cx, cy] = P(bx, y + 0.5, 28); for (let k = 0; k < 3; k++) { line(ctx, [[cx - 2 + k * 2, cy + 1], [cx - 3 + k * 3, cy - 7]], '#c9cfd4', 1); ctx.fillStyle = '#9aa1a7'; ctx.fillRect(cx - 4 + k * 3, cy - 9, 3, 2); } }
  }, { slice: 0.7 });

  // ================================================================ 🎡 놀이공원 소품
  /** 대관람차 (w=5 · 바퀴는 y+1 면 · 곤돌라 10개가 돈다) */
  prop('oa_ferris', (ctx, f, t, I) => {
    const { x, y } = f, w = f.w || 5, R = 74, hubZ = R + 18, on = lit(I), a0 = t * 0.12, U = w * 32 / 2;
    shadow(ctx, x + w / 2, y + 1, w / 2 + 0.3, 1.3);
    box(ctx, x + 0.3, y + 0.2, 0, w - 0.6, 1.6, 6, '#e9e4da', '#d6cfc2', '#c4bcae', 'rgba(0,0,0,0.15)');
    const legs = (yy, col) => { const [hx, hy] = P(x + w / 2, yy, hubZ); for (const lx of [x + 0.5, x + w - 0.5]) line(ctx, [P(lx, yy, 6), [hx, hy]], col, 3.2); line(ctx, [P(x + w * 0.3, yy, 40), P(x + w * 0.7, yy, 40)], col, 1.6); };
    legs(y + 0.55, '#c4ccd3');
    const cols = ['#e5534b', '#f2c230', '#4e7cf6', '#3fb27f', '#a67be0', '#f07a8a', '#1f9fb4', '#ff9a5a', '#e2667f', '#4fc3e8'];
    onPlaneY(ctx, x, y + 1, hubZ, (g) => {
      g.strokeStyle = '#f4f6f8'; g.lineWidth = 3; g.beginPath(); g.arc(U, 0, R, 0, TAU); g.stroke();
      g.strokeStyle = '#e2667f'; g.lineWidth = 1.2; g.beginPath(); g.arc(U, 0, R - 5, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(220,226,232,0.9)'; g.lineWidth = 1;
      for (let k = 0; k < 20; k++) { const a = a0 + k / 20 * TAU; g.beginPath(); g.moveTo(U, 0); g.lineTo(U + Math.cos(a) * R, Math.sin(a) * R); g.stroke(); }
      for (let k = 0; k < 40; k++) { const a = a0 + k / 40 * TAU; g.fillStyle = on ? `hsl(${(k * 37 + t * 80) % 360},90%,${65 + 10 * Math.sin(t * 4 + k)}%)` : '#fff6d8'; g.beginPath(); g.arc(U + Math.cos(a) * R, Math.sin(a) * R, on ? 1.8 : 1.2, 0, 7); g.fill(); }
      g.fillStyle = '#e2667f'; g.beginPath(); g.arc(U, 0, 7, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(U, 0, 3, 0, 7); g.fill();
      for (let k = 0; k < 10; k++) {
        const a = a0 + k / 10 * TAU, px = U + Math.cos(a) * R, py = Math.sin(a) * R, c = cols[k];
        g.strokeStyle = '#9aa1a7'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, py); g.lineTo(px, py + 5); g.stroke();
        g.fillStyle = c; roundRect(g, px - 8, py + 5, 16, 14, 4); g.fill(); g.fillStyle = shade(c, -0.25); g.fillRect(px - 8, py + 15, 16, 4);
        g.fillStyle = on ? '#ffe9a8' : '#dff1fa'; g.fillRect(px - 5.5, py + 8, 4.5, 5); g.fillRect(px + 1, py + 8, 4.5, 5);
        g.fillStyle = shade(c, 0.2); g.beginPath(); g.ellipse(px, py + 5, 9, 2.6, 0, Math.PI, TAU); g.fill();
      }
    });
    legs(y + 1.45, '#d9dee3');
    onPlaneY(ctx, x + w / 2 - 1.2, y + 1.8, 14, (g) => { g.fillStyle = '#e2667f'; roundRect(g, 0, 0, 77, 11, 3); g.fill(); g.fillStyle = '#fff'; g.font = `bold 7px ${FONT}`; g.fillText('🎡 대관람차 AI-WHEEL', 4, 8.5); });
    if (on) glow(ctx, ...P(x + w / 2, y + 1, hubZ), 120, '#ff9ad0', 0.18);
  }, { depth: (f) => f.x + f.y + 2.2, dynamic: true });
  /** 회전목마 (x,y 중심 · 지름 ~3.6) */
  prop('oa_carousel', (ctx, f, t, I) => {
    const { x, y } = f, R = 1.75, on = lit(I), mv = live(I), a0 = mv ? t * 0.5 : 0;
    shadow(ctx, x + 0.2, y + 0.2, R + 0.25);
    cylinder(ctx, x, y, 0, R, 6, '#f6efe0', '#e2667f', 'rgba(0,0,0,0.15)');
    ellipseFloor(ctx, x, y, R - 0.15, R - 0.15, 6, null, 'rgba(242,194,48,0.7)');
    const horse = (a, back) => {
      const hx = x + Math.cos(a) * 1.25, hy = y + Math.sin(a) * 1.25, up = 18 + Math.sin(t * 2.6 + a * 2) * 5;
      const [px, py] = P(hx, hy, 6), [qx, qy] = P(hx, hy, 58);
      line(ctx, [[px, py], [qx, qy]], '#e9c35a', 1.6);
      const [sx, sy] = P(hx, hy, up), dir = -Math.sin(a) > 0 ? 1 : -1, c = ['#ffffff', '#f7c4d4', '#cfe6f2', '#fbe9b0'][Math.round(a * 4 / TAU * 2) & 3];
      ctx.save(); ctx.translate(sx, sy); ctx.scale(dir, 1); if (back) ctx.globalAlpha *= 0.9;
      ctx.fillStyle = c; roundRect(ctx, -8, -5, 15, 7, 3.5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(9, -12); ctx.lineTo(12, -10); ctx.lineTo(8, -2); ctx.fill(); ctx.beginPath(); ctx.ellipse(11.5, -11, 3.6, 2.2, 0.4, 0, 7); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-6, 1); ctx.lineTo(-9, 7); ctx.moveTo(5, 1); ctx.lineTo(8, 7); ctx.stroke();
      ctx.fillStyle = '#a67be0'; ctx.fillRect(-3, -7, 6, 3); ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.moveTo(7, -11); ctx.quadraticCurveTo(5, -16, 2, -8); ctx.fill(); ctx.fillStyle = '#2b2b2b'; ctx.fillRect(11.6, -12.2, 1.2, 1.2);
      ctx.restore();
    };
    const N = 8, A = []; for (let k = 0; k < N; k++) A.push(a0 + k / N * TAU);
    for (const a of A) if (Math.sin(a) < 0) horse(a, true);
    cylinder(ctx, x, y, 6, 0.32, 52, '#f2d27a', '#e2b84a');
    { const [sx, sy] = P(x, y, 22); ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let k = 0; k < 4; k++) ctx.fillRect(sx - 8 + k * 4.5, sy - 10, 2.5, 18); }
    for (const a of A) if (Math.sin(a) >= 0) horse(a, false);
    // 지붕 (줄무늬 원뿔) + 물결 가장자리
    const zr = 58, N2 = 16, apex = P(x, y, 86);
    for (let k = 0; k < N2; k++) { const b0 = k / N2 * TAU, b1 = (k + 1) / N2 * TAU; if (Math.sin((b0 + b1) / 2) < -0.2) continue; poly(ctx, [P(x + Math.cos(b0) * (R + 0.15), y + Math.sin(b0) * (R + 0.15), zr), P(x + Math.cos(b1) * (R + 0.15), y + Math.sin(b1) * (R + 0.15), zr), apex], k % 2 ? '#ffffff' : '#e5534b', 'rgba(0,0,0,0.08)'); }
    for (let k = 0; k < 24; k++) { const b = k / 24 * TAU; if (Math.sin(b) < -0.3) continue; const [sx, sy] = P(x + Math.cos(b) * (R + 0.15), y + Math.sin(b) * (R + 0.15), zr); ctx.fillStyle = k % 2 ? '#f2c230' : '#e2667f'; ctx.beginPath(); ctx.arc(sx, sy, 4.2, 0, Math.PI); ctx.fill(); if (on || k % 3 === 0) { ctx.fillStyle = on ? `hsl(${(k * 40 + t * 90) % 360},90%,70%)` : '#fff6d8'; ctx.beginPath(); ctx.arc(sx, sy - 1, 1.3, 0, 7); ctx.fill(); } }
    const [fx, fy] = apex; line(ctx, [[fx, fy], [fx, fy - 12]], '#e9c35a', 1.4); ctx.fillStyle = '#e5534b'; ctx.beginPath(); ctx.moveTo(fx, fy - 12); ctx.lineTo(fx + 8, fy - 9 + Math.sin(t * 4)); ctx.lineTo(fx, fy - 6); ctx.fill();
    if (on) glow(ctx, ...P(x, y, 40), 80, '#ffd27a', 0.25);
  }, { dynamic: true });
  /** 솜사탕 수레 */
  prop('oa_cottonCandy', (ctx, f, t) => {
    const { x, y } = f;
    shadow(ctx, x + 0.7, y + 0.5, 0.9, 0.6);
    for (const [wx, wy] of [[x + 0.2, y + 0.85], [x + 1.2, y + 0.85]]) onPlaneY(ctx, wx - 0.15, wy, 9, (g) => { g.fillStyle = '#3b3f45'; g.beginPath(); g.arc(5, 4.5, 4.5, 0, 7); g.fill(); g.fillStyle = '#f2c230'; g.beginPath(); g.arc(5, 4.5, 1.6, 0, 7); g.fill(); });
    box(ctx, x, y, 6, 1.4, 0.8, 16, '#fbd0dc', '#f7b6c8', '#f09ab4', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x, y + 0.8, 20, (g) => { g.fillStyle = '#ffffff'; g.font = `bold 5.5px ${FONT}`; g.fillText('🍭 솜사탕', 6, 9); });
    cylinder(ctx, x + 0.45, y + 0.4, 22, 0.3, 8, 'rgba(230,245,255,0.6)', 'rgba(220,240,255,0.5)', 'rgba(150,180,200,0.6)');
    const [cx, cy] = P(x + 0.45, y + 0.4, 28); ctx.fillStyle = '#ffc6dc'; ctx.beginPath(); ctx.arc(cx + Math.sin(t * 6) * 2, cy, 7, 0, 7); ctx.fill();
    for (let k = 0; k < 4; k++) { const [sx, sy] = P(x + 0.9 + (k % 2) * 0.25, y + 0.25 + Math.floor(k / 2) * 0.3, 22); line(ctx, [[sx, sy], [sx, sy - 10]], '#f4f1ec', 1); ctx.fillStyle = ['#ffc6dc', '#c9e4ff', '#fff2a8', '#d9c6ff'][k]; ctx.beginPath(); ctx.arc(sx, sy - 13, 5, 0, 7); ctx.fill(); }
    sbox(ctx, x + 1.25, y + 0.1, 22, 0.05, 0.05, 32, '#9aa1a7');
    const [ux, uy] = P(x + 1.27, y + 0.12, 56); ctx.fillStyle = '#f07a8a'; ctx.beginPath(); ctx.moveTo(ux - 24, uy + 8); ctx.quadraticCurveTo(ux, uy - 14, ux + 24, uy + 8); ctx.fill(); ctx.fillStyle = '#ffffff'; for (const o of [-14, 0, 14]) { ctx.beginPath(); ctx.moveTo(ux, uy - 4); ctx.lineTo(ux + o - 3, uy + 7); ctx.lineTo(ux + o + 3, uy + 7); ctx.fill(); }
  }, { depth: (f) => f.x + f.y + 0.8 });
  /** 풍선 수레 (풍선 다발이 둥실) */
  prop('oa_balloonCart', (ctx, f, t) => {
    const { x, y } = f;
    shadow(ctx, x + 0.5, y + 0.4, 0.7, 0.5);
    box(ctx, x, y, 0, 1, 0.7, 14, '#cfe6f2', '#a8cfe4', '#8fbcd6', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x, y + 0.7, 12, (g) => { g.fillStyle = '#2f6fb8'; g.font = `bold 5px ${FONT}`; g.fillText('🎈 풍선', 3, 7); });
    const [bx, by] = P(x + 0.5, y + 0.35, 14), cs = ['#e5534b', '#4e7cf6', '#f2c230', '#3fb27f', '#a67be0', '#f07a8a', '#ff9a5a', '#1f9fb4', '#ffffff'];
    for (let k = 0; k < 9; k++) {
      const a = k * 2.4, rr = 8 + (k % 3) * 6, px = bx + Math.cos(a) * rr + Math.sin(t * 1.2 + k) * 2, py = by - 56 - Math.sin(a) * rr * 0.6 - (k % 3) * 6 + Math.sin(t * 1.6 + k * 0.7) * 2;
      ctx.strokeStyle = 'rgba(80,80,80,0.5)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx + px) / 2 + 2, (by + py) / 2, px, py + 6); ctx.stroke();
      ctx.fillStyle = cs[k]; ctx.beginPath(); ctx.ellipse(px, py, 5.2, 6.4, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(px - 1.8, py - 2.4, 1.4, 2, 0.3, 0, 7); ctx.fill();
    }
  }, { depth: (f) => f.x + f.y + 0.6 });
  /** 미니 기차 한 칸 (loop 둥근 사각 레일 위를 돈다 · i=0 기관차) */
  const loopPos = (L, s) => {
    const { x, y, w, d, r } = L, sx = w - 2 * r, sy = d - 2 * r, arc = Math.PI / 2 * r, per = 2 * sx + 2 * sy + 4 * arc;
    s = ((s % per) + per) % per;
    const segs = [['l', x + r, y, 1, 0, sx], ['a', x + w - r, y + r, -Math.PI / 2, arc], ['l', x + w, y + r, 0, 1, sy], ['a', x + w - r, y + d - r, 0, arc], ['l', x + w - r, y + d, -1, 0, sx], ['a', x + r, y + d - r, Math.PI / 2, arc], ['l', x, y + d - r, 0, -1, sy], ['a', x + r, y + r, Math.PI, arc]];
    for (const g of segs) {
      const len = g[0] === 'l' ? g[5] : g[4];
      if (s <= len) { if (g[0] === 'l') return [g[1] + g[3] * s, g[2] + g[4] * s, g[3], g[4]]; const a = g[3] + s / r; return [g[1] + Math.cos(a) * r, g[2] + Math.sin(a) * r, -Math.sin(a), Math.cos(a)]; }
      s -= len;
    }
    return [x + r, y, 1, 0];
  };
  prop('oa_trainCar', (ctx, f, t, I) => {
    if (!live(I)) return;
    const [x, y, dx, dy] = loopPos(f.loop, t * (f.speed || 1.4) - f.i * 1.15);
    f.x = x; f.y = y;
    const ax = Math.abs(dx) > Math.abs(dy), c = f.i === 0 ? '#e5534b' : ['#4e7cf6', '#f2c230', '#3fb27f', '#a67be0'][(f.i - 1) % 4];
    const w = ax ? 1.0 : 0.6, d = ax ? 0.6 : 1.0, x0 = x - w / 2, y0 = y - d / 2;
    ellipseFloor(ctx, x, y, w / 2 + 0.1, d / 2 + 0.1, 0, 'rgba(0,0,0,0.15)');
    box(ctx, x0, y0, 2, w, d, 4, '#3b3f45', '#2b2f35', '#232629');
    if (f.i === 0) {
      box(ctx, x0, y0, 6, w, d, 9, shade(c, 0.1), c, shade(c, -0.15), 'rgba(0,0,0,0.2)');
      const back = ax ? (dx > 0 ? x0 : x0 + w - 0.4) : x0, backY = ax ? y0 : (dy > 0 ? y0 : y0 + d - 0.4);
      box(ctx, back, backY, 15, ax ? 0.4 : w, ax ? d : 0.4, 12, '#2b3a4a', '#243140', '#1d2833', 'rgba(0,0,0,0.2)');
      box(ctx, back - 0.03, backY - 0.03, 27, (ax ? 0.4 : w) + 0.06, (ax ? d : 0.4) + 0.06, 2, c, shade(c, -0.1), shade(c, -0.2));
      const cxp = ax ? x + dx * 0.3 : x, cyp = ax ? y : y + dy * 0.3;
      cylinder(ctx, cxp, cyp, 15, 0.1, 9, '#2b2b2b', '#3b3f45');
      for (let k = 0; k < 3; k++) { const u = (t * 0.8 + k / 3) % 1, [sx, sy] = P(cxp - dx * u * 0.8, cyp - dy * u * 0.8, 26 + u * 16); ctx.fillStyle = `rgba(250,250,250,${0.6 * (1 - u)})`; ctx.beginPath(); ctx.arc(sx, sy, 2.5 + u * 4, 0, 7); ctx.fill(); }
      const [hx, hy] = P(x + dx * w / 2, y + dy * d / 2, 10); ctx.fillStyle = '#ffe39a'; ctx.beginPath(); ctx.arc(hx, hy, 2, 0, 7); ctx.fill();
    } else {
      box(ctx, x0, y0, 6, w, d, 7, shade(c, 0.1), c, shade(c, -0.15), 'rgba(0,0,0,0.2)');
      box(ctx, x0 + 0.08, y0 + 0.08, 13, w - 0.16, d - 0.16, 0.5, shade(c, -0.35), shade(c, -0.35), shade(c, -0.35));
      for (const [px, py] of [[x0 + 0.05, y0 + 0.05], [x0 + w - 0.1, y0 + 0.05], [x0 + 0.05, y0 + d - 0.1], [x0 + w - 0.1, y0 + d - 0.1]]) sbox(ctx, px, py, 13, 0.05, 0.05, 12, '#f4f1ec');
      box(ctx, x0 - 0.05, y0 - 0.05, 25, w + 0.1, d + 0.1, 2, '#ffffff', '#e9edf1', '#d9dde1');
    }
  }, { dynamic: true });
  /** 매표소 (2×1.6) */
  prop('oa_ticketBooth', (ctx, f, t, I) => {
    const { x, y } = f;
    shadow(ctx, x + 1, y + 0.8, 1.2, 0.9);
    box(ctx, x, y, 0, 2, 1.5, 40, '#fff6e6', '#f6e6c8', '#e9d6b2', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x, y + 1.5, 40, (g) => { g.fillStyle = '#e2667f'; g.fillRect(0, 34, 64, 6); g.fillStyle = '#cfe6f2'; roundRect(g, 10, 8, 44, 20, 8); g.fill(); g.fillStyle = '#7a5a3a'; g.beginPath(); g.arc(32, 22, 5, 0, 7); g.fill(); g.fillStyle = '#f2c230'; g.fillRect(27, 15, 10, 2.5); g.fillStyle = '#c49a62'; g.fillRect(10, 26, 44, 3); });
    poly(ctx, [P(x - 0.2, y - 0.2, 40), P(x + 2.2, y - 0.2, 40), P(x + 1, y + 0.75, 62)], '#e5534b');
    poly(ctx, [P(x + 2.2, y - 0.2, 40), P(x + 2.2, y + 1.7, 40), P(x + 1, y + 0.75, 62)], '#c43d32', 'rgba(0,0,0,0.15)');
    poly(ctx, [P(x - 0.2, y + 1.7, 40), P(x + 2.2, y + 1.7, 40), P(x + 1, y + 0.75, 62)], '#ffffff', 'rgba(0,0,0,0.15)');
    for (let k = 0; k < 4; k++) poly(ctx, [P(x - 0.2 + k * 0.6, y + 1.7, 40), P(x + 0.1 + k * 0.6, y + 1.7, 40), P(x + 1, y + 0.75, 62)], '#e5534b');
    onPlaneY(ctx, x + 0.1, y + 1.55, 46, (g) => { g.fillStyle = '#2b2622'; roundRect(g, 0, 0, 58, 9, 2); g.fill(); g.fillStyle = '#ffe39a'; g.font = `bold 6px ${FONT}`; g.fillText('🎟️ 매표소', 12, 7); });
    for (let k = 0; k < 3; k++) { const px = x + 2.5 + k * 0.8; cylinder(ctx, px, y + 2.1, 0, 0.07, 16, '#c9a54a', '#b8943a'); if (k) { const [a, b] = P(px - 0.8, y + 2.1, 14), [c, d] = P(px, y + 2.1, 14); ctx.strokeStyle = '#a8323e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2, (b + d) / 2 + 5, c, d); ctx.stroke(); } }
  }, { depth: (f) => f.x + f.y + 1.6 });
  /** 입구 아치 (x 방향 w, 양쪽 기둥 1칸) */
  prop('oa_gateArch', (ctx, f, t, I) => {
    const { x, y } = f, w = f.w || 7, H = 70, on = lit(I);
    for (const [px, c] of [[x, '#a67be0'], [x + w - 1, '#4e7cf6']]) { box(ctx, px + 0.15, y + 0.15, 0, 0.7, 0.7, H, shade(c, 0.15), c, shade(c, -0.15), 'rgba(0,0,0,0.2)'); onPlaneY(ctx, px + 0.15, y + 0.85, H, (g) => { for (let v = 6; v < H; v += 12) { g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.arc(11, v, 3, 0, 7); g.fill(); } }); const [sx, sy] = P(px + 0.5, y + 0.5, H); ctx.fillStyle = '#f2c230'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k / 10 * TAU, rr = k % 2 ? 4 : 10; ctx.lineTo(sx + Math.cos(a) * rr, sy - 8 + Math.sin(a) * rr); } ctx.fill(); }
    onPlaneY(ctx, x + 0.5, y + 0.5, H + 8, (g) => {
      const Wl = (w - 1) * 32;
      g.fillStyle = '#e2667f'; g.beginPath(); g.moveTo(0, 30); g.quadraticCurveTo(Wl / 2, -10, Wl, 30); g.lineTo(Wl, 20); g.quadraticCurveTo(Wl / 2, -22, 0, 20); g.fill();
      g.fillStyle = '#fff6e6'; roundRect(g, Wl / 2 - 46, -6, 92, 22, 8); g.fill(); g.strokeStyle = '#e2667f'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#e2667f'; g.font = `bold 12px ${FONT}`; g.fillText('🎡 AI 랜드', Wl / 2 - 34, 10);
      for (let k = 0; k < 14; k++) { const u = k / 13, bx = u * Wl, by = 30 - 4 * Math.sin(u * Math.PI) * 10 + 2; g.fillStyle = on ? `hsl(${(k * 50 + t * 100) % 360},90%,70%)` : '#fff6d8'; g.beginPath(); g.arc(bx, by - 6, 1.8, 0, 7); g.fill(); }
    });
  }, { slice: 0.6 });
  /** 삼각 깃발 줄 (pts 기둥들 사이) */
  prop('oa_bunting', (ctx, f, t) => {
    const cs = ['#e5534b', '#f2c230', '#4e7cf6', '#3fb27f', '#a67be0', '#f07a8a'];
    for (const [x, y] of f.pts) sbox(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, 54, '#f4f1ec');
    for (let i = 0; i < f.pts.length - 1; i++) {
      const [ax, ay] = P(...f.pts[i], 54), [bx, by] = P(...f.pts[i + 1], 54), mx = (ax + bx) / 2, my = (ay + by) / 2 + 12;
      ctx.strokeStyle = 'rgba(80,80,80,0.6)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
      const n = Math.max(4, Math.round(Math.hypot(bx - ax, by - ay) / 10));
      for (let k = 1; k < n; k++) { const s = k / n, qx = (1 - s) * (1 - s) * ax + 2 * (1 - s) * s * mx + s * s * bx, qy = (1 - s) * (1 - s) * ay + 2 * (1 - s) * s * my + s * s * by, sw = Math.sin(t * 3 + k + i) * 1.2; ctx.fillStyle = cs[(k + i) % cs.length]; ctx.beginPath(); ctx.moveTo(qx - 3, qy); ctx.lineTo(qx + 3, qy); ctx.lineTo(qx + sw, qy + 7); ctx.fill(); }
    }
  });

  // ================================================================ 🏟️ 운동장 소품
  /** 계단식 관중석 (x 방향 w · tiers 줄 · 맨 앞줄이 y+tiers-1, 앞(+y)을 본다) */
  prop('oa_bleachers', (ctx, f, t, I) => {
    const { x, y, w } = f, n = f.tiers || 3, c = f.color || '#4e7cf6', r = AIO.rand(f.seed || 5);
    const rise = 13, crowd = live(I) && !I.low;
    for (let i = n - 1; i >= 0; i--) {
      const yy = y + (n - 1 - i), h = 7 + i * rise;
      box(ctx, x, yy, 0, w, 1, h, '#d9dde1', '#c4c9cd', '#b5bbc0', 'rgba(0,0,0,0.12)');
      for (let s = 0; s + 0.7 <= w; s += 0.8) {
        const cc = (Math.floor(s / 0.8) + i) % 6 === 0 ? '#f4f1ec' : c;
        box(ctx, x + s + 0.06, yy + 0.35, h, 0.68, 0.45, 3, shade(cc, 0.1), cc, shade(cc, -0.15));
        box(ctx, x + s + 0.06, yy + 0.2, h, 0.68, 0.15, 11, shade(cc, 0.05), shade(cc, -0.05), shade(cc, -0.2));
        if (i > 0 && r() < 0.55) { // 관중 (윗줄만)
          const [hx, hy] = P(x + s + 0.4, yy + 0.55, h + 14 + (crowd ? Math.abs(Math.sin(t * 3 + s * 2 + i)) * 2 : 0)), col = ['#e5534b', '#f2c230', '#3fb27f', '#ffffff', '#a67be0', '#ff9a5a'][Math.floor(r() * 6)];
          ctx.fillStyle = col; roundRect(ctx, hx - 4, hy, 8, 9, 3); ctx.fill(); ctx.fillStyle = ['#f6d8b8', '#e8c39e', '#c99a72'][Math.floor(r() * 3)]; ctx.beginPath(); ctx.arc(hx, hy - 2.5, 3.4, 0, 7); ctx.fill();
          if (crowd && Math.sin(t * 2 + s * 1.7 + i) > 0.6) { ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx + 3, hy + 2); ctx.lineTo(hx + 6, hy - 6); ctx.stroke(); }
        }
      }
    }
    box(ctx, x, y - 0.1, 0, w, 0.12, 7 + (n - 1) * rise + 20, '#c4c9cd', '#b5bbc0', '#a9b0b6');
  }, { slice: 3 });
  /** 전광판 (x 방향 w, 두 기둥) */
  prop('oa_scoreboard', (ctx, f, t) => {
    const { x, y } = f, w = f.w || 4, Z = 96;
    for (const px of [x + 0.4, x + w - 0.5]) sbox(ctx, px, y + 0.3, 0, 0.12, 0.12, Z - 40, '#7d858c');
    box(ctx, x, y + 0.2, Z - 44, w, 0.3, 46, '#2b2f35', '#23272c', '#1d2024', 'rgba(0,0,0,0.3)');
    onPlaneY(ctx, x + 0.1, y + 0.5, Z - 2, (g) => {
      const Wl = (w - 0.2) * 32; g.fillStyle = '#0d1014'; g.fillRect(0, 0, Wl, 40);
      g.fillStyle = '#f2c230'; g.font = `bold 6px ${FONT}`; g.fillText('🏟️ AI 스타디움', 4, 8);
      const sec = Math.floor(t) % 60, mn = 30 + Math.floor(t / 60) % 15;
      g.fillStyle = '#ff6b5b'; g.font = `bold 13px ${FONT}`; g.fillText('3', 14, 26); g.fillText('2', Wl - 24, 26);
      g.fillStyle = '#ffffff'; g.font = `bold 6px ${FONT}`; g.fillText('클로드', 6, 35); g.fillText('코덱스', Wl - 30, 35);
      g.fillStyle = '#4ef08a'; g.font = `bold 8px ${FONT}`; g.fillText(`${mn}:${String(sec).padStart(2, '0')}`, Wl / 2 - 13, 24);
      for (let k = 0; k < 8; k++) { g.fillStyle = Math.sin(t * 4 + k) > 0 ? '#f2c230' : '#3b3f45'; g.fillRect(Wl / 2 - 16 + k * 4, 30, 2.5, 2.5); }
    });
  }, { slice: 0.5 });
  /** 조명탑 */
  prop('oa_floodlight', (ctx, f, t, I) => {
    const { x, y } = f, H = 130, on = lit(I);
    cylinder(ctx, x, y, 0, 0.2, 6, '#9aa1a7', '#7d858c');
    for (const [dx, dy] of [[-0.1, -0.1], [0.1, -0.1], [0, 0.1]]) line(ctx, [P(x + dx * 2, y + dy * 2, 0), P(x + dx * 0.4, y + dy * 0.4, H)], '#9aa1a7', 1.6);
    for (let z = 10; z < H; z += 14) line(ctx, [P(x - 0.18, y - 0.18, z), P(x + 0.16, y - 0.16, z + 7), P(x, y + 0.18, z)], 'rgba(130,140,150,0.8)', 0.7);
    onPlaneY(ctx, x - 0.6, y + 0.1, H + 22, (g) => { g.fillStyle = '#3b3f45'; g.fillRect(0, 0, 38, 22); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { g.fillStyle = on ? '#fffbe0' : '#d9dde1'; g.beginPath(); g.arc(5 + i * 9.5, 4 + j * 7, 3, 0, 7); g.fill(); } });
    if (on) glow(ctx, ...P(x, y + 0.1, H + 12), 70, '#fffbe0', 0.5);
  });
  /** 더그아웃 (벤치 + 투명 지붕, 앞은 +y) */
  prop('oa_dugout', (ctx, f) => {
    const { x, y } = f, w = f.w || 4, c = f.color || '#e5534b';
    box(ctx, x, y, 0, w, 0.15, 30, '#3b4a5a', '#33404e', '#2b3642');
    box(ctx, x + 0.1, y + 0.2, 9, w - 0.2, 0.5, 3, shade(c, 0.1), c, shade(c, -0.2));
    for (const lx of [x + 0.2, x + w - 0.3]) sbox(ctx, lx, y + 0.3, 0, 0.08, 0.3, 9, '#5d6166');
    for (const lx of [x + 0.05, x + w - 0.1]) poly(ctx, [P(lx, y, 0), P(lx, y + 0.95, 0), P(lx, y + 0.95, 26), P(lx, y, 32)], 'rgba(200,225,240,0.35)', 'rgba(140,170,190,0.6)');
    poly(ctx, [P(x - 0.05, y - 0.05, 32), P(x + w + 0.05, y - 0.05, 32), P(x + w + 0.05, y + 1, 26), P(x - 0.05, y + 1, 26)], 'rgba(190,220,240,0.5)', 'rgba(120,150,170,0.7)');
    onPlaneY(ctx, x + 0.2, y + 0.15, 28, (g) => { g.fillStyle = '#ffffff'; g.font = `bold 6px ${FONT}`; g.fillText(f.text || '🏃 선수 대기석', 4, 8); });
  }, { slice: 1 });
  /** 매점 (w×2, 노란 줄무늬 차양 · 메뉴판 · 팝콘) */
  prop('oa_snackBar', (ctx, f, t) => {
    const { x, y } = f, w = f.w || 3;
    shadow(ctx, x + w / 2, y + 1.1, w / 2 + 0.3, 1.2);
    box(ctx, x, y, 0, w, 1.8, 38, '#f4f1ec', '#e9e4da', '#d9d3c8', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x, y + 1.8, 38, (g) => {
      const Wl = w * 32; g.fillStyle = '#2b2622'; g.fillRect(6, 4, Wl - 12, 10); g.fillStyle = '#ffe39a'; g.font = `bold 5.5px ${FONT}`; g.fillText(f.text || '🌭 핫도그 · 🥤 콜라 · 🍿 팝콘', 9, 11);
      g.fillStyle = '#3b3f45'; g.fillRect(6, 16, Wl - 12, 12); g.fillStyle = '#c49a62'; g.fillRect(4, 26, Wl - 8, 3);
      g.fillStyle = '#e5534b'; g.fillRect(Wl - 26, 17, 12, 9); g.fillStyle = '#fff6d0'; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(Wl - 24 + (k % 4) * 3, 18 + Math.floor(k / 4) * 3, 1.4, 0, 7); g.fill(); }
    });
    poly(ctx, [P(x - 0.2, y + 1.2, 42), P(x + w + 0.2, y + 1.2, 42), P(x + w + 0.2, y + 2.4, 32), P(x - 0.2, y + 2.4, 32)], '#f2c230', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x - 0.2, y + 2.4, 32, (g) => { for (let i = 0; i < (w + 0.4) * 32; i += 8) { g.fillStyle = (i / 8) % 2 ? '#ffffff' : '#f2c230'; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 8, 0); g.lineTo(i + 4, 5); g.fill(); } });
    for (let k = 0; k < 2; k++) { const [px, py] = P(x + 0.7 + k * 1.1, y + 2.25, 16); ctx.fillStyle = ['#e5534b', '#4e7cf6'][k]; ctx.fillRect(px - 2.5, py - 6, 5, 6); }
  }, { depth: (f) => f.x + f.y + 1.6, slice: 1.8 });

  // ================================================================ ❄️ 설원 소품
  /** 침엽수 (snow: 눈 덮임) — x,y 칸 중심 */
  prop('oa_fir', (ctx, f, t) => {
    const s = f.size || 1, snow = !!f.snow, r = AIO.rand(f.seed || 1), sw = Math.sin(t * 0.8 + (f.seed || 0)) * 0.8;
    shadow(ctx, f.x + 0.2, f.y + 0.2, 0.62 * s);
    if (snow) ellipseFloor(ctx, f.x, f.y, 0.55 * s, 0.55 * s, 0, 'rgba(255,255,255,0.9)');
    const [bx, by] = P(f.x, f.y, 0);
    ctx.fillStyle = '#6b4a35'; ctx.fillRect(bx - 2.5 * s, by - 12 * s, 5 * s, 12 * s);
    const tiers = 4, cols = snow ? ['#2f5f4a', '#33694f', '#387356', '#3e7d5d'] : ['#2c6a44', '#327a4c', '#388653', '#40955c'];
    for (let k = 0; k < tiers; k++) {
      const wd = (21 - k * 4.5) * s * (0.95 + r() * 0.1), base = by - (8 + k * 13) * s, top = base - 22 * s, ox = sw * k * 0.3;
      ctx.fillStyle = cols[k]; ctx.beginPath(); ctx.moveTo(bx - wd + ox * 0.6, base); ctx.quadraticCurveTo(bx + ox * 0.5, base + 5 * s, bx + wd + ox * 0.6, base); ctx.lineTo(bx + ox, top); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.beginPath(); ctx.moveTo(bx + ox, top); ctx.lineTo(bx + wd + ox * 0.6, base); ctx.quadraticCurveTo(bx + wd * 0.5, base + 3 * s, bx + 2 + ox * 0.5, base + 3 * s); ctx.closePath(); ctx.fill();
      if (snow) {
        ctx.fillStyle = '#f7fafd'; ctx.beginPath(); ctx.moveTo(bx + ox, top - 1); ctx.lineTo(bx - wd * 0.62 + ox * 0.7, base - 9 * s);
        for (let q = 0; q <= 4; q++) { const u = q / 4, px = bx - wd * 0.62 + wd * 1.24 * u + ox * 0.7, py = base - 9 * s + (q % 2 ? 3.5 * s : 0); ctx.lineTo(px, py); }
        ctx.closePath(); ctx.fill();
      }
    }
  });
  /** 눈사람 — x,y 칸 중심 (hat: 'top'|'bucket', scarf 색) */
  prop('oa_snowman', (ctx, f, t) => {
    const { x, y } = f, s = f.size || 1, [bx, by] = P(x, y, 0);
    shadow(ctx, x + 0.15, y + 0.15, 0.55 * s);
    const ball = (cy, r) => { const g = ctx.createRadialGradient(bx - r * 0.35, cy - r * 0.4, r * 0.2, bx, cy, r); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d6e2ee'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, cy, r, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(150,175,200,0.45)'; ctx.lineWidth = 0.7; ctx.stroke(); };
    ball(by - 11 * s, 13 * s); ball(by - 31 * s, 10 * s);
    ctx.strokeStyle = '#6b4a35'; ctx.lineWidth = 1.6; const wv = Math.sin(t * 2 + x) * 3;
    ctx.beginPath(); ctx.moveTo(bx - 8 * s, by - 32 * s); ctx.lineTo(bx - 20 * s, by - 40 * s + wv); ctx.lineTo(bx - 23 * s, by - 44 * s + wv); ctx.moveTo(bx - 20 * s, by - 40 * s + wv); ctx.lineTo(bx - 25 * s, by - 39 * s + wv); ctx.moveTo(bx + 8 * s, by - 32 * s); ctx.lineTo(bx + 19 * s, by - 37 * s); ctx.lineTo(bx + 23 * s, by - 35 * s); ctx.stroke();
    ball(by - 47 * s, 7.5 * s);
    ctx.fillStyle = '#2b2b2b'; for (const v of [-35, -29, -23]) { ctx.beginPath(); ctx.arc(bx, by + v * s, 1.3 * s, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.arc(bx - 2.6 * s, by - 49 * s, 1.1 * s, 0, 7); ctx.arc(bx + 2.6 * s, by - 49 * s, 1.1 * s, 0, 7); ctx.fill();
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(bx - 3 * s + k * 1.5 * s, by - 43.5 * s + Math.abs(k - 2) * -0.5 * s, 0.6 * s, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#f08a3a'; ctx.beginPath(); ctx.moveTo(bx, by - 47.5 * s); ctx.lineTo(bx + 9 * s, by - 45.5 * s); ctx.lineTo(bx, by - 45.5 * s); ctx.fill();
    const sc = f.scarf || '#e5534b'; ctx.fillStyle = sc; roundRect(ctx, bx - 8 * s, by - 41.5 * s, 16 * s, 4 * s, 2 * s); ctx.fill(); ctx.fillRect(bx + 3 * s, by - 40 * s, 4 * s, 10 * s); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(bx - 5 * s, by - 41.5 * s, 2 * s, 4 * s); ctx.fillRect(bx + 1 * s, by - 41.5 * s, 2 * s, 4 * s);
    if (f.hat === 'bucket') { ctx.fillStyle = '#4e7cf6'; ctx.beginPath(); ctx.moveTo(bx - 6 * s, by - 53 * s); ctx.lineTo(bx + 6 * s, by - 53 * s); ctx.lineTo(bx + 4.5 * s, by - 61 * s); ctx.lineTo(bx - 4.5 * s, by - 61 * s); ctx.fill(); }
    else { ctx.fillStyle = '#2b2b2b'; ctx.fillRect(bx - 8 * s, by - 55 * s, 16 * s, 2.4 * s); ctx.fillRect(bx - 5 * s, by - 66 * s, 10 * s, 11 * s); ctx.fillStyle = sc; ctx.fillRect(bx - 5 * s, by - 58 * s, 10 * s, 2 * s); }
  });
  /** 이글루 (3×3, 입구 +y) */
  prop('oa_igloo', (ctx, f, t, I) => {
    const { x, y } = f, cx = x + 1.5, cy = y + 1.4, on = lit(I);
    shadow(ctx, cx + 0.2, cy + 0.2, 1.6);
    const [sx, sy] = P(cx, cy, 0), rx = 1.35 * 45.25, ry = rx / 2, H = 40;
    ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI); ctx.ellipse(sx, sy, rx, ry + H, 0, Math.PI, TAU); ctx.closePath();
    const gg = ctx.createLinearGradient(sx - rx, sy - H, sx + rx, sy); gg.addColorStop(0, '#ffffff'); gg.addColorStop(1, '#c9d9e8'); ctx.fillStyle = gg; ctx.fill();
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(130,160,190,0.5)'; ctx.lineWidth = 1;
    for (let k = 1; k < 5; k++) { const h = k * H / 5, rr = rx * Math.sqrt(1 - (h / (H + ry)) ** 2); ctx.beginPath(); ctx.ellipse(sx, sy - h, rr, rr / 2, 0, 0, Math.PI); ctx.stroke(); for (let j = 0; j < 7; j++) { const a = (j + (k % 2) * 0.5) / 7 * Math.PI, px = sx + Math.cos(a) * rr, py = sy - h + Math.sin(a) * rr / 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + H / 5); ctx.stroke(); } }
    ctx.restore();
    // 입구 터널 (+y)
    const tx = cx - 0.15, ty = y + 2.5;
    box(ctx, tx - 0.45, ty - 0.6, 0, 0.9, 0.9, 18, '#f4f8fc', '#e6eef6', '#d2deea', 'rgba(130,160,190,0.5)');
    onPlaneY(ctx, tx - 0.45, ty + 0.3, 22, (g) => { g.fillStyle = '#e6eef6'; g.beginPath(); g.moveTo(0, 22); g.lineTo(0, 8); g.quadraticCurveTo(14.4, -4, 28.8, 8); g.lineTo(28.8, 22); g.fill(); g.fillStyle = on ? '#7a5235' : '#3d4a5a'; g.beginPath(); g.moveTo(7, 22); g.lineTo(7, 12); g.quadraticCurveTo(14.4, 3, 22, 12); g.lineTo(22, 22); g.fill(); if (on) { g.fillStyle = 'rgba(255,200,120,0.8)'; g.fillRect(9, 14, 11, 8); } });
    if (on) glow(ctx, ...P(tx, ty + 0.3, 10), 40, '#ffb860', 0.5);
  }, { depth: (f) => f.x + f.y + 2.6 });
  /** 링크 펜스 (흰 보드 + 파란 손잡이) — 칸 한 변 */
  prop('oa_rinkBoard', (ctx, f) => {
    const [a, b] = P(f.x, f.y, 0), [c, d] = f.axis === 'x' ? P(f.x + 1, f.y, 0) : P(f.x, f.y + 1, 0), H = 12;
    ctx.fillStyle = f.axis === 'x' ? '#f7fafd' : '#e3ebf3'; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(c, d - H); ctx.lineTo(a, b - H); ctx.fill();
    ctx.fillStyle = (Math.round(f.x + f.y) % 3) ? 'rgba(78,124,246,0.25)' : 'rgba(229,83,75,0.3)'; ctx.beginPath(); ctx.moveTo(a, b - 3); ctx.lineTo(c, d - 3); ctx.lineTo(c, d - 8); ctx.lineTo(a, b - 8); ctx.fill();
    ctx.strokeStyle = '#3b7fd0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a, b - H); ctx.lineTo(c, d - H); ctx.stroke();
  });
  /** 스케이터 (링크 안 타원을 따라 미끄러진다) — 움직임 전용 */
  prop('oa_skater', (ctx, f, t, I, world) => {
    if (!live(I) || I.low || !world) return;
    const a = (f.phase || 0) + t * (f.speed || 0.22) * (f.dir || 1), x = f.cx + Math.cos(a) * f.rx, y = f.cy + Math.sin(a) * f.ry;
    const vx = -Math.sin(a) * (f.dir || 1), vy = Math.cos(a) * (f.dir || 1);
    f.x = x; f.y = y;
    const dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? '+x' : '-x') : (vy > 0 ? '+y' : '-y');
    const [sx, sy] = P(x, y, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sy); const [px, py] = P(x - vx * 0.9, y - vy * 0.9 * (f.ry / f.rx), 0); ctx.lineTo(px, py); ctx.stroke();
    f._st = f._st || world.npcStyle(f.seed || 1, { hat: 'beanie', accent: f.accent });
    AIO.art.character(ctx, { sx, sy: sy - 2, style: f._st, pose: 'stand', dir, anim: 'idle', t: t + (f.seed || 0), seed: f.seed || 1, scale: f.scale || 0.9 });
  }, { dynamic: true });
  /** 썰매 언덕 (w×d, 뒤(y)가 높고 앞(+y)으로 내려온다 · 썰매가 미끄러진다) */
  prop('oa_sledHill', (ctx, f, t, I, world) => {
    const { x, y } = f, w = f.w || 4, d = f.d || 7, Ht = 50, top = 1.6;
    shadow(ctx, x + w / 2 + 0.3, y + d / 2 + 0.3, w / 2 + 0.4, d / 2 + 0.4);
    const z = (yy) => (yy <= y + top ? Ht : Ht * Math.max(0, (y + d - yy) / (d - top)) ** 1.15);
    // 오른쪽 옆면
    const side = []; for (let j = 0; j <= 20; j++) { const yy = y + j / 20 * d; side.push(P(x + w, yy, z(yy))); } side.push(P(x + w, y + d, 0), P(x + w, y, 0));
    poly(ctx, side, '#d6e2ee', 'rgba(140,165,195,0.4)');
    // 윗면 (평지 + 비탈)
    for (let j = 0; j < 20; j++) { const y0 = y + j / 20 * d, y1 = y + (j + 1) / 20 * d; poly(ctx, [P(x, y0, z(y0)), P(x + w, y0, z(y0)), P(x + w, y1, z(y1)), P(x, y1, z(y1))], j < 5 ? '#f7fafd' : shade('#f2f6fb', -0.02 * (j % 2))); }
    poly(ctx, [P(x, y + d - 0.01, 0), P(x + w, y + d - 0.01, 0), P(x + w, y + d, 0.1), P(x, y + d, 0.1)], '#e3ebf3');
    // 썰매 자국 · 계단
    for (const lx of [x + w * 0.3, x + w * 0.7]) line(ctx, Array.from({ length: 12 }, (_, j) => { const yy = y + top + j / 11 * (d - top); return P(lx, yy, z(yy) + 0.3); }), 'rgba(150,180,210,0.6)', 1.2);
    for (let j = 0; j < 8; j++) { const yy = y + top + j / 8 * (d - top); line(ctx, [P(x + w - 0.35, yy, z(yy)), P(x + w - 0.05, yy, z(yy))], '#a87a52', 1.6); }
    { const [fx, fy] = P(x + w / 2, y + 0.3, Ht); line(ctx, [[fx, fy], [fx, fy - 22]], '#9aa1a7', 1.2); ctx.fillStyle = '#e5534b'; ctx.beginPath(); ctx.moveTo(fx, fy - 22); ctx.lineTo(fx + 10, fy - 18 + Math.sin(t * 4)); ctx.lineTo(fx, fy - 14); ctx.fill(); }
    if (!live(I) || I.low) return;
    for (let k = 0; k < 2; k++) {
      const u = (t * 0.22 + k * 0.5) % 1, lx = x + w * (k ? 0.7 : 0.3), yy = y + top + u * u * (d - top + 1.2), zz = yy < y + d ? z(yy) : 0;
      const [sx, sy] = P(lx, Math.min(yy, y + d + 1.2), zz);
      ctx.fillStyle = ['#e5534b', '#4e7cf6'][k]; roundRect(ctx, sx - 9, sy - 5, 18, 6, 3); ctx.fill(); ctx.strokeStyle = '#a87a52'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx - 10, sy + 2); ctx.lineTo(sx + 9, sy + 2); ctx.quadraticCurveTo(sx + 13, sy + 2, sx + 12, sy - 3); ctx.stroke();
      if (world) { f['_s' + k] = f['_s' + k] || world.npcStyle(70 + k * 13 + (f.seed || 0), { hat: 'beanie' }); AIO.art.character(ctx, { sx, sy: sy - 3, style: f['_s' + k], pose: 'sit', dir: '+y', anim: 'idle', t, seed: k, scale: 0.62 }); }
    }
  }, { depth: (f) => f.x + f.y + Math.min(f.w || 4, f.d || 7) + 0.3, dynamic: true });
  /** 장작 난로 (주물 · 굴뚝 연기 · 주전자 김) */
  prop('oa_stove', (ctx, f, t, I) => {
    const { x, y } = f, on = lit(I), fl = 0.7 + 0.3 * Math.sin(t * 9) * Math.sin(t * 5.3);
    shadow(ctx, x + 0.5, y + 0.5, 0.7);
    for (const [lx, ly] of [[0.15, 0.15], [0.75, 0.15], [0.15, 0.75], [0.75, 0.75]]) sbox(ctx, x + lx, y + ly, 0, 0.08, 0.08, 6, '#2b2b2b');
    box(ctx, x + 0.1, y + 0.1, 6, 0.8, 0.8, 22, '#3b3f45', '#2b2f35', '#232629', 'rgba(0,0,0,0.3)');
    onPlaneY(ctx, x + 0.1, y + 0.9, 26, (g) => { g.fillStyle = '#1d1d1d'; roundRect(g, 5, 5, 16, 12, 3); g.fill(); g.fillStyle = `rgba(255,${140 + fl * 60},60,${0.75 + fl * 0.25})`; roundRect(g, 7, 7, 12, 8, 2); g.fill(); g.fillStyle = '#ffe39a'; g.beginPath(); g.ellipse(13, 12, 3 * fl + 1, 2.4, 0, 0, 7); g.fill(); g.strokeStyle = '#555'; g.lineWidth = 0.8; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(9 + k * 4, 7); g.lineTo(9 + k * 4, 15); g.stroke(); } });
    cylinder(ctx, x + 0.5, y + 0.3, 28, 0.1, 40, '#3b3f45', '#2b2f35');
    cylinder(ctx, x + 0.3, y + 0.65, 28, 0.17, 7, '#e5534b', '#c9443d'); { const [kx, ky] = P(x + 0.3, y + 0.65, 35); line(ctx, [[kx - 4, ky - 1], [kx, ky - 5], [kx + 4, ky - 1]], '#2b2b2b', 1); }
    if (live(I)) for (let k = 0; k < 4; k++) { const u = (t * 0.3 + k / 4) % 1, [sx, sy] = P(x + 0.5, y + 0.3, 70 + u * 30); ctx.fillStyle = `rgba(200,200,205,${0.5 * (1 - u)})`; ctx.beginPath(); ctx.arc(sx + Math.sin(t + k) * 3 + u * 8, sy, 3 + u * 5, 0, 7); ctx.fill(); const [vx, vy] = P(x + 0.3, y + 0.65, 38 + u * 14); ctx.fillStyle = `rgba(255,255,255,${0.45 * (1 - u)})`; ctx.beginPath(); ctx.arc(vx + 4 + u * 4, vy, 1.5 + u * 2, 0, 7); ctx.fill(); }
    for (let k = 0; k < 3; k++) { const [lx, ly] = P(x + 1.15, y + 0.3 + k * 0.22, 3 + (k === 1 ? 5 : 0)); ctx.fillStyle = '#8a6247'; roundRect(ctx, lx - 7, ly - 3, 14, 6, 3); ctx.fill(); ctx.fillStyle = '#e9c99a'; ctx.beginPath(); ctx.ellipse(lx + 7, ly, 2, 3, 0, 0, 7); ctx.fill(); }
    glow(ctx, ...P(x + 0.5, y + 1, 14), on ? 60 : 26, '#ffa040', on ? 0.55 : 0.3 * fl);
  });
  /** 펭귄 무리 (뒤뚱뒤뚱) — 움직임 전용 */
  prop('oa_penguins', (ctx, f, t, I) => {
    if (!live(I) || I.low) return;
    const n = f.n || 4, list = [];
    for (let i = 0; i < n; i++) { const ph = i * 1.9 + (f.seed || 0), px = f.x + Math.sin(t * 0.18 + ph) * 1.6, py = f.y + Math.cos(t * 0.13 + ph * 1.3) * 1.1 + (i % 2) * 0.4; list.push([px, py, Math.cos(t * 0.18 + ph) > 0 ? 1 : -1, ph, i]); }
    list.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
    for (const [px, py, dir, ph, i] of list) {
      const [sx, sy] = P(px, py, 0), wd = Math.sin(t * 8 + ph) * 0.18, s = i === n - 1 ? 0.7 : 1;
      ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.beginPath(); ctx.ellipse(sx, sy, 6 * s, 2.4 * s, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(wd); ctx.scale(dir * s, s);
      ctx.fillStyle = '#f08a3a'; ctx.fillRect(-4, -1.5, 3.5, 1.6); ctx.fillRect(1, -1.5, 3.5, 1.6);
      ctx.fillStyle = '#2b3140'; ctx.beginPath(); ctx.ellipse(0, -10, 6.5, 9.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(1.6, -9, 4.4, 7.4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2b3140'; ctx.beginPath(); ctx.ellipse(-5, -10, 2, 5.5, 0.35 + Math.sin(t * 8 + ph) * 0.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(2.6, -16, 1.6, 0, 7); ctx.fill(); ctx.fillStyle = '#1d1d1d'; ctx.beginPath(); ctx.arc(3, -16, 0.8, 0, 7); ctx.fill();
      ctx.fillStyle = '#f2a03a'; ctx.beginPath(); ctx.moveTo(5, -15); ctx.lineTo(8.5, -14); ctx.lineTo(5, -13); ctx.fill();
      ctx.fillStyle = 'rgba(255,190,190,0.6)'; ctx.beginPath(); ctx.arc(3.6, -13.4, 1.1, 0, 7); ctx.fill();
      ctx.restore();
    }
  }, { depth: (f) => f.x + f.y + 0.6, dynamic: true });
  /** 눈 내림 (구역마다 하나) — 움직임 전용 */
  prop('oa_snowfall', (ctx, f, t, I) => {
    if (!live(I) || I.low) return;
    const r = AIO.rand(f.seed || 3), w = f.w || 12, d = f.d || 12;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 26; i++) { const px = f.x + r() * w, py = f.y + r() * d, sp = 14 + r() * 10, z = 150 - ((t * sp + r() * 150) % 150), rr = 1 + r() * 1.4, [sx, sy] = P(px + Math.sin(t * 0.8 + i) * 0.25, py, z); ctx.beginPath(); ctx.arc(sx, sy, rr, 0, 7); ctx.fill(); }
  }, { depth: (f) => f.x + f.y + 200, dynamic: true });

  // ================================================================ 부지 공용 도구
  const COLS = ['#e5534b', '#4e7cf6', '#3fb27f', '#e9a23b', '#a67be0', '#e2667f', '#1f9fb4'];
  function tools(S, OUT, B, k, id) {
    const W = k.W, H = k.H;
    const inR = (x, y, r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.d;
    /** 엔진의 OUT.grid 와 같은 규칙으로 걸을 수 있는 칸인지 (다리 · 횡단보도 우선) */
    const ok = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      if ((OUT.bridges || []).some((b) => inR(x, y, b)) || k.G.cross.some((c) => inR(x, y, c))) return true;
      const u = k.used[y * W + x];
      return u !== 3 && u !== 4 && !OUT.blocked.has(x + ',' + y);
    };
    const T = { W, H, ok, r: AIO.rand(id.length * 977 + B.W * 31 + B.H * 7) };
    T.rest = (s, tag) => k.rest(s, tag);
    /** 곡선 길 — 긴 구간은 잘게 나눠서 (k.curve 의 표시 칸에 구멍이 안 나게) */
    T.path = (pts, w = 1.4, o = {}) => {
      const out = [pts[0]];
      for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 1.2)); for (let s = 1; s <= n; s++) out.push([ax + (bx - ax) * s / n, ay + (by - ay) * s / n]); }
      k.curve(out, w, o);
    };
    T.park = () => (S.park = S.park || { mats: [], wander: [], play: [] });
    /** 소품을 놓을 수 있나: 풀밭이나 포장(길·데크) 위, 막힌 칸 · 물 · 차도가 아님 */
    const can = (x, y, w = 1, d = 1) => { for (let i = Math.floor(x); i < Math.ceil(x + w); i++) for (let j = Math.floor(y); j < Math.ceil(y + d); j++) { if (i < 0 || j < 0 || i >= W || j >= H) return false; const u = k.used[j * W + i]; if (u > 1 || OUT.blocked.has(i + ',' + j)) return false; } return true; };
    T.can = can;
    T.put = (f, bx, by, bw = 1, bd = 1) => (can(bx, by, bw, bd) ? k.add(f, bx, by, bw, bd) : null);
    /** x 방향 벤치 (칸 x..x+w, 줄 y) — face '+y' 면 앞(y+1)에서, '-y' 면 뒤(y-1)에서 앉는다 */
    T.bench = (x, y, w, face, tag, color) => {
      if (!can(x, y, w, 1)) return 0;
      k.add({ type: 'bench', x, y, w: w - 0.2, color }, x, y, w, 1);
      let n = 0;
      for (let sx = x + 0.6; sx < x + w - 0.3; sx += 1.1, n++) k.rest({ x: sx, y: y + 0.25, face, pose: 'sit', approach: [Math.floor(sx), y + (face === '-y' ? -1 : 1)] }, tag);
      return n;
    };
    /** 파라솔 테이블 (칸 x,y) + 양옆 스툴 2 */
    T.table = (x, y, color, tag) => {
      if (!can(x - 1, y, 3, 1)) return false;
      k.add({ type: 'parasolTable', x: x + 0.5, y: y + 0.5, color }, x, y);
      for (const [dx, face] of [[-1, '+x'], [1, '-x']]) { k.K.add({ type: 'stool', x: x + 0.5 + dx, y: y + 0.5, color: '#f3d48c' }); k.rest({ x: x + 0.5 + dx, y: y + 0.5, face, pose: 'sit' }, tag); }
      return true;
    };
    /** 피크닉 테이블 3×2 + 4자리 */
    T.picnic = (x, y, tag) => {
      if (!can(x, y - 1, 3, 4)) return false;
      k.add({ type: 'picnicTable', x, y }, x, y, 3, 2);
      for (const [dx, dy, face] of [[0.6, -0.35, '+y'], [2.0, -0.35, '+y'], [0.6, 2.25, '-y'], [2.0, 2.25, '-y']]) k.rest({ x: x + dx, y: y + dy, face, pose: 'sit' }, tag);
      return true;
    };
    T.lamp = (x, y) => { const f = { type: 'streetLamp', x: x + 0.5, y: y + 0.5 }; k.K.add(f); OUT.lamps.push(f); };
    T.lantern = (x, y) => { if (!can(x, y)) return; k.add({ type: 'oa_lantern', x: x + 0.4, y: y + 0.5 }, x, y); OUT.lamps.push({ x: x + 0.7, y: y + 0.5 }); };
    /** 가족 피크닉 돗자리 (3×2.2) */
    T.mat = (x, y, color) => {
      if (!k.free(x, y, 3, 3)) return false;
      k.G.decals.push({ type: 'mat', x, y, w: 3, d: 2.2, color }); k.mark(x, y, 3, 3, 1);
      k.K.add({ type: 'basket', x: x + 1.5, y: y + 1.1 });
      T.park().mats.push({ x, y, seats: [[x + 0.6, y + 0.6, '+y'], [x + 2.4, y + 0.6, '+y'], [x + 0.6, y + 1.7, '-y'], [x + 2.4, y + 1.7, '-y']].map(([sx, sy, face]) => ({ lv: OUT.idx, x: sx, y: sy, face, pose: 'sit', tag: '가족 피크닉' })) });
      return true;
    };
    T.play = (x, y, face, o = {}) => T.park().play.push({ lv: OUT.idx, x, y, face, pose: 'stand', ...o });
    T.wander = (x, y, o = {}) => T.park().wander.push({ x, y, face: '+y', ...o });
    /** 영역 안 빈자리(둘레 pad 칸까지 비어 있는) n 곳에 fn(x,y) */
    T.scatter = (x0, y0, x1, y1, n, fn, pad = 1) => {
      let c = 0;
      for (let i = 0; i < n * 10 && c < n; i++) { const x = x0 + Math.floor(T.r() * (x1 - x0)), y = y0 + Math.floor(T.r() * (y1 - y0)); if (k.free(x - pad, y - pad, 1 + 2 * pad, 1 + 2 * pad)) { fn(x, y); c++; } }
      return c;
    };
    /** 가장자리 띠 (두께 th) 빈칸마다 fn */
    T.border = (th, fn, every = 1) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x < th || y < th || x >= W - th || y >= H - th) && (x + y * 3) % every === 0 && k.free(x, y)) fn(x, y); };
    T.fir = (x, y, s, snow) => k.add({ type: 'oa_fir', x: x + 0.5, y: y + 0.5, size: s, seed: x * 31 + y * 7, snow }, x, y);
    T.lakeTiles = (cx, cy, rx, ry) => { for (let i = Math.floor(cx - rx); i <= cx + rx; i++) for (let j = Math.floor(cy - ry); j <= cy + ry; j++) if (i >= 0 && j >= 0 && i < W && j < H && ((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 < 1) k.water(i, j, 1, 1); };
    /** 마무리: 정문에서 못 가는 휴식 자리는 접근 칸을 고치고, 그래도 안 되면 뺀다 (가족 · NPC 순찰 · S.door 도 확인) */
    T.done = () => {
      const seen = new Uint8Array(W * H), q = [];
      const sx = Math.floor(k.TX + B.doorX), sy = k.front;
      if (ok(sx, sy)) { seen[sy * W + sx] = 1; q.push(sx, sy); }
      while (q.length) {
        const y = q.pop(), x = q.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || !ok(nx, ny)) continue; seen[ny * W + nx] = 1; q.push(nx, ny); }
      }
      const R = (x, y) => x >= 0 && y >= 0 && x < W && y < H && seen[y * W + x] === 1;
      const fix = (s) => {
        const tx = Math.floor(s.x), ty = Math.floor(s.y);
        if (s.approach ? R(s.approach[0], s.approach[1]) : R(tx, ty)) return true;
        const dv = { '+y': [0, 1], '-y': [0, -1], '+x': [1, 0], '-x': [-1, 0] }[s.face] || [0, 1];
        const c = [[tx, ty], [tx + dv[0], ty + dv[1]], [tx - dv[0], ty - dv[1]], [tx + dv[1], ty + dv[0]], [tx - dv[1], ty - dv[0]]].find(([x, y]) => R(x, y));
        if (!c) return false;
        if (c[0] === tx && c[1] === ty) delete s.approach; else s.approach = c;
        return true;
      };
      let drop = 0;
      for (let i = S.rest.length - 1; i >= 0; i--) if (S.rest[i].lv === OUT.idx && !fix(S.rest[i])) { S.rest.splice(i, 1); drop++; }
      if (S.park) {
        S.park.mats = S.park.mats.filter((m) => m.seats.every((s) => R(Math.floor(s.x), Math.floor(s.y))));
        S.park.play = S.park.play.filter((s) => fix(s));
        S.park.wander = S.park.wander.filter((s) => R(Math.floor(s.x), Math.floor(s.y)));
      }
      for (const n of S.npcs) if (n.lv === OUT.idx && n.patrol) n.patrol = n.patrol.filter((p) => R(Math.floor(p.x), Math.floor(p.y)));
      if (S.door && !R(Math.floor(S.door.x), Math.floor(S.door.y))) console.warn(`[oa:${id}] S.door 에 갈 수 없음`, S.door);
      if (drop) console.warn(`[oa:${id}] 못 가는 휴식 자리 ${drop}개 뺐음`);
    };
    return T;
  }

  // ================================================================ 🏖️ 해변
  C.outdoor({
    id: 'beach', icon: '🏖️', name: '해변', desc: '모래사장 · 파도치는 바다 · 파라솔 선베드 · 비치발리볼 · 서핑 · 구조대 망루 · 비치 바 · 잔교',
    size: (B) => ({ W: B.W + 40, H: B.H + 34 }),
    lot(S, OUT, B, k) {
      const TX = 4, TY = 4;
      OUT.ground.base = { color: '#ecd9a8', tufts: null, edge: '#c9ad78', edge2: '#b89a62' };
      k.place(B, TX, TY);
      const T = tools(S, OUT, B, k, 'beach'), W = k.W, H = k.H, F = k.front, R0 = k.right, DX = TX + B.doorX, dX = Math.floor(DX);
      k.area(0, 0, W, H, 'oa_sand', '#ecd9a8');
      // 🌊 바다 (물결치는 해안선)
      const shore = (x) => H - 9 + 1.2 * Math.sin(x * 0.21) + 0.7 * Math.sin(x * 0.067 + 1.3);
      const pts = []; for (let x = 0; x <= W + 1e-6; x += 0.5) pts.push([x, shore(x)]);
      const ys = Math.floor(Math.min(...pts.map((p) => p[1]))) - 2;
      k.G.decals.push({ type: 'oa_sea', x: 0, y: ys, w: W, d: H - ys, pts, seed: 11 });
      const sand = []; // 열마다 마지막 모래 줄
      for (let i = 0; i < W; i++) { const j0 = Math.floor(shore(i + 0.5) - 0.5) + 1; sand[i] = j0 - 1; k.water(i, j0, 1, H - j0); }
      const lastSand = (x0, x1 = x0) => { let m = 1e9; for (let i = Math.max(0, x0); i <= Math.min(W - 1, x1); i++) m = Math.min(m, sand[i]); return m; };
      const minSand = lastSand(0, W - 1);
      for (let x0 = 0; x0 < W; x0 += 6) k.K.add({ type: 'oa_waves', x: x0 + 3, y: shore(x0 + 3), pts: pts.filter(([x]) => x >= x0 - 0.01 && x <= x0 + 6.01), seed: x0 });
      k.G.decals.push({ type: 'oa_shells', x: 1, y: minSand - 2.6, w: W - 2, d: 2.4, n: 0.4, seed: 4 });
      // 🪵 데크 · 산책로 · 보드워크 · 잔교
      k.area(TX - 1, F, B.W + 2, 2, 'deck', '#c9a57a', 1);
      k.area(0, F + 2, W, 2, 'deck', '#c49a6c', 1);
      const bwX = dX - 1, bwEnd = lastSand(bwX, bwX + 2) - 1;
      k.area(bwX, F + 4, 3, bwEnd - F - 4, 'deck', '#c9a57a', 1);
      const pierEnd = Math.min(H - 2, lastSand(bwX, bwX + 2) + 6);
      OUT.bridges = [{ x: bwX, y: bwEnd, w: 3, d: pierEnd - bwEnd }];
      k.K.add({ type: 'oa_dock', x: bwX, y: bwEnd, w: 3, d: pierEnd - bwEnd });
      for (const dx of [0.5, 1.5, 2.5]) T.rest({ x: bwX + dx, y: pierEnd - 0.45, face: '+y', pose: 'sit' }, '잔교 끝 바다 구경');
      T.rest({ x: bwX + 0.3, y: pierEnd - 2.5, face: '-x', pose: 'sit' }, '잔교 끝 바다 구경');
      k.sign(bwX + 3.2, bwEnd + 1, '🌊 잔교', '#2f6fb8');
      // ⛱️ 파라솔 · 선베드 (두 줄) + 수건 돗자리
      const bedC = [['#4e9cf6', '#f6c445'], ['#f2a7c3', '#3fb27f'], ['#e5534b', '#ffffff'], ['#a67be0', '#f6c445']];
      const mats = [];
      [F + 6, F + 11].forEach((ry, ri) => {
        if (ry + 3 > minSand - 2) return;
        for (let x = 2 + ri * 2, n = 0; x + 3 < W - 1; x += 5, n++) {
          if (x + 3 >= bwX - 1 && x <= bwX + 4) continue;
          if ((n + ri) % 3 === 2) { mats.push([x, ry]); continue; }
          const cc = bedC[(n + ri) % bedC.length];
          [0.5, 1.7].forEach((o, q) => { const cx = x + o; k.add({ type: 'deckChair', x: cx, y: ry, color: cc[q] }, Math.floor(cx), ry, 1, 1); T.rest({ x: cx, y: ry + 0.55, face: '+y', pose: 'sofa', approach: [Math.floor(cx), ry + 2], carry: q ? 'icecream' : 'mug' }, '파라솔 선베드'); });
          k.K.add({ type: 'parasol', x: x + 1.1, y: ry + 0.25, color: ['#e5534b', '#4e7cf6', '#f2c230', '#3fb27f'][(n + ri) % 4] });
        }
      });
      mats.forEach(([x, y], i) => T.mat(x, y, COLS[i % COLS.length]));
      // 🛟 구조대 망루
      let lx = Math.round(W * 0.66); if (lx >= bwX - 2 && lx <= bwX + 4) lx = bwX + 6;
      const ly = lastSand(lx, lx + 1) - 2;
      k.add({ type: 'oa_lifeguard', x: lx, y: ly }, lx, ly, 2, 2);
      k.sign(lx - 0.5, ly + 2.6, '🛟 구조대', '#e5534b');
      const px0 = Math.max(2, lx - 14), px1 = Math.min(W - 3, lx + 10);
      k.npc('구조요원', { x: lx + 1.2, y: ly + 3.4, face: '+y' }, { hat: 'cap', accent: '#e5534b', say: '🛟 안전선 안에서 놀아요!', patrol: [{ x: lx + 1.2, y: ly + 3.4, face: '+y' }, { x: px0 + 0.5, y: lastSand(px0) - 0.5, face: '+y' }, { x: px1 + 0.5, y: lastSand(px1) - 0.5, face: '+y' }] });
      // 🏄 서핑 스쿨
      const sx = 4, sy = lastSand(sx, sx + 3) - 3;
      if (k.free(sx, sy, 3, 1)) { k.add({ type: 'oa_surfRack', x: sx, y: sy, w: 2.6, seed: 2 }, sx, sy, 3, 1); k.npc('서핑 강사', { x: sx + 1.5, y: sy + 2.4, face: '+y' }, { hat: 'shades', accent: '#1f9fb4', say: '🏄 오늘 파도 최고예요!' }); }
      // 🍹 비치 바 (오른쪽 위)
      const bx = R0 + 3, by = 1, bw = 5;
      k.add({ type: 'oa_barBack', x: bx, y: by, w: bw }, bx, by, bw, 1);
      k.add({ type: 'oa_barFront', x: bx, y: by + 2, w: bw }, bx, by + 2, bw, 1);
      k.npc('바텐더', { x: bx + bw / 2, y: by + 1.5, face: '+y' }, { anim: 'type', hat: 'shades', accent: '#f08a3a' });
      for (let i = 0; i < 4; i++) { const x = bx + 0.7 + i * 1.2; k.K.add({ type: 'barStool', x, y: by + 3.5 }); T.rest({ x, y: by + 3.5, face: '-y', pose: 'sit', carry: 'mug' }, '비치 바'); }
      k.sign(bx, by + 4.6, '🍹 비치 바', '#c47f22');
      // 🏐 비치발리볼
      const vx = R0 + 3, vy = by + 8;
      if (vy + 6 < F) {
        k.G.decals.push({ type: 'oa_vball', x: vx, y: vy, w: 10, d: 5 }); k.mark(vx, vy, 10, 5, 1);
        k.K.add({ type: 'oa_volleyNet', x: vx + 5, y: vy - 0.3, d: 5.6 }); k.solid(vx + 4, vy - 1, 1, 1); k.solid(vx + 4, vy + 5, 1, 1);
        for (const [x, y, face] of [[vx + 2, vy + 1.5, '+x'], [vx + 2.5, vy + 3.6, '+x'], [vx + 7.6, vy + 1.4, '-x'], [vx + 8, vy + 3.5, '-x']]) T.play(x, y, face, { ball: true });
        T.bench(vx + 1, vy - 2, 3, '+y', '비치발리볼 관람'); T.bench(vx + 6, vy - 2, 3, '+y', '비치발리볼 관람');
        k.sign(vx + 0.2, vy + 5.6, '🏐 비치발리볼', '#3b7fd0');
      }
      // 🍦 아이스크림 트럭 · 해먹 · 야자수
      const tx = R0 + 16;
      if (tx + 5 < W && k.free(tx, by + 8, 4, 4)) { k.add({ type: 'foodTruck', x: tx, y: by + 8, kind: 'icecream' }, tx, by + 8, 4, 2); for (let q = 0; q < 2; q++) T.rest({ x: tx + 1.2 + q * 0.9, y: by + 10.8 + q * 0.7, face: '-y', pose: 'stand', carry: 'icecream' }, '아이스크림 줄'); T.wander(tx + 1.6, by + 11.4, { food: 'icecream' }); }
      if (k.free(R0 + 21, 4, 3, 1)) k.add({ type: 'hammock', x: R0 + 21.2, y: 4.5 }, R0 + 21, 4, 3, 1);
      for (let x = 2; x < W - 2; x += 7) if (Math.abs(x + 1.5 - DX) > 4) T.bench(x, F + 3, 3, '+y', '해변 산책로 벤치');
      const palm = (x, y) => k.add({ type: 'oa_palm', x: x + 0.5, y: y + 0.5, size: 0.9 + T.r() * 0.35, seed: x * 7 + y * 13 }, x, y);
      T.scatter(R0 + 2, 1, W - 1, F - 1, Math.round((W - R0) * F / 70), palm, 1);
      T.scatter(0, 1, TX - 1, F - 1, Math.round(F / 6), palm, 0);
      T.scatter(1, F + 5, W - 1, minSand - 4, Math.round(W / 9), palm, 1);
      // 🐕 · 갈매기 · 가족
      k.K.add({ type: 'oa_gulls', x: W * 0.3, y: H - 4, r: 5, n: 3 }); k.K.add({ type: 'oa_gulls', x: W * 0.75, y: H - 5, r: 4, n: 2 });
      for (let x = 6; x < W - 4; x += 9) T.play(x + 0.5, lastSand(x) - 0.4, '+y');
      for (let x = 4; x < W - 3; x += 8) T.wander(x + 0.5, F + 2.5);
      S.pets = [{ kind: 'dog', color: '#d9a066' }, { kind: 'dog', color: '#f4ead8' }, { kind: 'cat', color: '#f0a050', near: [bx + 2, by + 5] }];
      k.sign(1.2, F + 1.6, '🏖️ AI 해수욕장', '#c47f22');
      S.door = { lv: OUT.idx, x: 1.5, y: F + 2.5, face: '+x' };
      T.done();
    },
  });

  // ================================================================ 🏕️ 숲속 캠핑장
  C.outdoor({
    id: 'camping', icon: '🏕️', name: '숲속 캠핑장', desc: '빽빽한 침엽수 숲 · 텐트 사이트 · 캠프파이어 · 계곡 징검다리와 다리 · 해먹 · 랜턴 · 관리소',
    size: (B) => ({ W: B.W + 44, H: B.H + 34 }),
    lot(S, OUT, B, k) {
      const TX = 4, TY = 4;
      OUT.ground.base = { color: '#9cc27f', tufts: ['#7aa860', '#b4d79a'], edge: '#7a6248', edge2: '#6b553d' };
      k.place(B, TX, TY);
      const T = tools(S, OUT, B, k, 'camping'), W = k.W, H = k.H, F = k.front, R0 = k.right, DX = TX + B.doorX, dX = Math.floor(DX);
      k.area(0, 0, W, H, 'oa_forest', '#9cc27f');
      k.area(TX - 1, F, B.W + 2, 2, 'deck', '#b98c5e', 1);
      // 🌊 계곡 (위→아래로 흐른다)
      const sxAt = (y) => R0 + 11 + 2.2 * Math.sin(y * 0.16 + 0.5), SW = 2.4;
      const pts = []; for (let y = -1; y <= H + 1; y++) pts.push([sxAt(y), y]);
      k.G.decals.push({ type: 'oa_stream', x: R0 + 6, y: 0, w: 10, d: H, pts, sw: SW, seed: 3 });
      const rowWater = (j) => { const xs = []; for (let i = Math.floor(sxAt(j + 0.5) - 3); i <= sxAt(j + 0.5) + 3; i++) if (Math.abs(i + 0.5 - sxAt(j + 0.5)) < SW / 2) xs.push(i); return xs; };
      for (let j = 0; j < H; j++) for (const i of rowWater(j)) k.water(i, j, 1, 1);
      for (let y0 = 0; y0 < H; y0 += 7) k.K.add({ type: 'oa_flow', x: sxAt(y0 + 3.5), y: y0 + 3.5, pts: pts.filter(([, y]) => y >= y0 && y <= y0 + 7) });
      OUT.bridges = [];
      const yb = F + 7, wb = rowWater(yb), b0 = wb[0], b1 = wb[wb.length - 1];
      OUT.bridges.push({ x: b0, y: yb, w: b1 - b0 + 1, d: 1 }); k.K.add({ type: 'bridge', x: b0 - 0.5, y: yb, w: b1 - b0 + 2 });
      const ysn = Math.max(3, Math.floor(F / 2)), ws = rowWater(ysn);
      OUT.bridges.push({ x: ws[0], y: ysn, w: ws.length, d: 1 }); k.G.decals.push({ type: 'stones', x: ws[0] + 0.5, y: ysn + 0.5, n: ws.length, dx: 1, dy: 0 });
      k.sign(b0 - 1, yb + 1.6, '🌉 계곡 다리', '#2f6fb8'); k.sign(ws[0] - 1, ysn + 1.4, '🪨 징검다리', '#2f6fb8');
      // 🥾 오솔길
      const trail = { color: '#d2b98f', edge: '#ad936a' };
      T.path([[0, F + 2.5], [DX - 2, F + 2.5], [DX + 4, F + 3.6], [b0 - 4, yb + 0.5], [b0 - 0.5, yb + 0.5]], 1.6, trail);
      const ex0 = Math.ceil(Math.max(...pts.map((p) => p[0]))) + 2;
      T.path([[b1 + 1.5, yb + 0.5], [ex0 + 3, yb + 0.5], [ex0 + 6, yb - 3], [W - 4, yb - 4]], 1.4, trail);
      T.path([[R0 + 1, ysn + 0.5], [ws[0] - 0.5, ysn + 0.5]], 1.2, trail); T.path([[ws[ws.length - 1] + 1.5, ysn + 0.5], [ex0 + 4, ysn + 0.5]], 1.2, trail);
      // 🔥 캠프파이어 (통나무 의자 4면)
      const cfx = Math.min(Math.floor(sxAt(F + 12)) - 7, dX + 4), cfy = F + 12;
      k.add({ type: 'firePit', x: cfx, y: cfy }, cfx - 1, cfy - 1, 2, 2); OUT.lamps.push({ x: cfx, y: cfy });
      k.add({ type: 'oa_log', x: cfx - 2, y: cfy - 3, w: 3, axis: 'x' }, cfx - 2, cfy - 3, 3, 1);
      k.add({ type: 'oa_log', x: cfx - 2, y: cfy + 2, w: 3, axis: 'x' }, cfx - 2, cfy + 2, 3, 1);
      k.add({ type: 'oa_log', x: cfx - 3, y: cfy - 2, w: 3, axis: 'y' }, cfx - 3, cfy - 2, 1, 3);
      k.add({ type: 'oa_log', x: cfx + 2, y: cfy - 2, w: 3, axis: 'y' }, cfx + 2, cfy - 2, 1, 3);
      for (let q = 0; q < 3; q++) {
        T.rest({ x: cfx - 1.5 + q, y: cfy - 2.5, face: '+y', pose: 'sit', approach: [cfx - 2 + q, cfy - 4], carry: q === 1 ? null : 'mug' }, '캠프파이어');
        T.rest({ x: cfx - 1.5 + q, y: cfy + 2.5, face: '-y', pose: 'sit', approach: [cfx - 2 + q, cfy + 3] }, '캠프파이어');
        T.rest({ x: cfx - 2.5, y: cfy - 1.5 + q, face: '+x', pose: 'sit', approach: [cfx - 4, cfy - 2 + q] }, '캠프파이어');
        T.rest({ x: cfx + 2.5, y: cfy - 1.5 + q, face: '-x', pose: 'sit', approach: [cfx + 3, cfy - 2 + q] }, '캠프파이어');
      }
      for (const [x, y] of [[cfx - 4, cfy - 4], [cfx + 3, cfy - 4], [cfx - 4, cfy + 3], [cfx + 3, cfy + 3]]) T.lantern(x, y);
      k.npc('기타 치는 캠퍼', { x: cfx + 4.5, y: cfy + 0.5, face: '-x', pose: 'sit' }, { anim: 'think', hat: 'beanie', accent: '#e9a23b', say: '🎸 ♪ 모닥불 피워 놓고~' });
      k.sign(cfx - 2.5, cfy + 4.4, '🔥 캠프파이어', '#c47f22');
      // ⛺ A 사이트 (서쪽) · B 사이트 (계곡 건너)
      const tentC = ['#f08a3a', '#3fb27f', '#4e7cf6', '#f2c230', '#e2667f', '#a67be0'];
      let ti = 0;
      const tent = (x, y) => {
        if (!k.free(x, y, 2, 3)) return false;
        k.add({ type: 'oa_tent', x, y, color: tentC[ti % tentC.length], kind: ti % 3 === 1 ? 'dome' : 'a' }, x, y, 2, 2);
        [0.45, 1.55].forEach((o, q) => { k.K.add({ type: 'oa_campChair', x: x + o, y: y + 2.55, face: '+y', color: tentC[(ti + q + 2) % tentC.length] }); T.rest({ x: x + o, y: y + 2.55, face: '+y', pose: 'sit', carry: q ? 'mug' : null }, ti % 2 ? '텐트 앞 캠핑의자' : '텐트 사이트'); });
        if (ti % 2 === 0) T.lantern(x + 2, y + 1);
        ti++; return true;
      };
      for (let x = 3; x + 2 < cfx - 5; x += 5) tent(x, F + 5);
      for (let x = 3; x + 3 < sxAt(F + 18) - 2; x += 5) tent(x, F + 18);
      for (const y of [3, 9]) for (let x = ex0 + 1; x + 3 < W - 2; x += 5) if (y + 4 < yb - 1 || y > yb + 2) tent(x, y);
      k.sign(2.2, F + 4.6, '⛺ A 사이트', '#3f8a45'); k.sign(ex0 + 1, 2.4, '⛺ B 사이트', '#3f8a45');
      // 🛖 관리소 · 피크닉 · 해먹 · 가족
      const cy0 = H - 7;
      if (k.free(2, cy0, 4, 4)) { k.add({ type: 'oa_cabin', x: 2, y: cy0, w: 4, d: 3, label: '🛖 캠핑장 관리소', roof: '#5a6b3a' }, 2, cy0, 4, 3); k.npc('캠핑장 관리인', { x: 4.5, y: cy0 + 3.5, face: '+y' }, { hat: 'bucket', accent: '#3f8a45', say: '🌲 불씨 조심하세요!' }); }
      T.picnic(8, H - 6, '숲속 피크닉'); T.picnic(13, H - 6, '숲속 피크닉');
      for (const [x, y] of [[ex0 + 2, F + 11], [ex0 + 9, F + 4]]) if (k.free(x, y, 3, 1)) k.add({ type: 'hammock', x: x + 0.2, y: y + 0.5 }, x, y, 3, 1);
      T.picnic(ex0 + 10, F + 12, '계곡 피크닉');
      [[ex0 + 2, F + 15], [ex0 + 7, F + 18], [ex0 + 12, F + 21], [ex0 + 3, F + 21]].forEach(([x, y], i) => { if (y + 3 < H - 2) T.mat(x, y, COLS[(i + 2) % COLS.length]); });
      for (const [x, y] of [[ex0 + 4, yb - 1], [ex0 + 12, yb - 3]]) T.lantern(x, y);
      const fishY = F + 20; k.npc('낚시하는 캠퍼', { x: Math.floor(sxAt(fishY + 0.5) - SW / 2) - 0.5, y: fishY + 0.5, face: '+x', pose: 'sit' }, { anim: 'think', hat: 'bucket', accent: '#1f9fb4', say: '🎣 송사리 잡는 중' });
      for (const [x, y] of [[ex0 + 3, F + 13], [ex0 + 10, F + 17], [cfx, cfy + 5], [6, F + 15]]) T.play(x + 0.5, y + 0.5, '+y', { ball: (x & 1) === 0 });
      for (const [x, y] of [[cfx - 6, cfy], [ex0 + 6, F + 9], [DX, F + 4]]) T.wander(x + 0.5, y + 0.5);
      // 🌲 숲 (가장자리 빽빽 + 안쪽 듬성)
      T.border(2, (x, y) => T.fir(x, y, 0.95 + T.r() * 0.4, false));
      T.scatter(0, 0, W, H, Math.round(W * H / 38), (x, y) => (T.r() < 0.75 ? T.fir(x, y, 0.85 + T.r() * 0.45, false) : k.tree(x, y, 1 + T.r() * 0.25, T.r() < 0.5 ? 'pine' : 'oak')), 1);
      const dY = F + 24, dXd = Math.floor(sxAt(dY + 0.5) - SW / 2) - 2;
      S.pets = [{ kind: 'dog', color: '#d9a066' }, { kind: 'dog', color: '#6b4a35' }, { kind: 'cat', color: '#8a8f96' },
        { kind: 'duck', color: '#ffffff', near: [dXd, dY] }, { kind: 'duck', color: '#3f8a45', near: [dXd, dY] }];
      k.sign(1.2, F + 1.6, '🏕️ AI 숲속 캠핑장', '#3f8a45');
      S.door = { lv: OUT.idx, x: 0.5, y: F + 2.5, face: '+x' };
      T.done();
    },
  });

  // ================================================================ 🌸 벚꽃길
  C.outdoor({
    id: 'blossom', icon: '🌸', name: '벚꽃길', desc: '벚나무 가로수길 · 흩날리는 꽃잎 · 포장마차 · 푸드트럭 · 돗자리 피크닉 · 포토존 · 벚꽃로',
    size: (B) => ({ W: B.W + 38, H: B.H + 36 }),
    lot(S, OUT, B, k) {
      const TX = 4, TY = 4;
      OUT.ground.base = { color: '#b9dca1', tufts: ['#97c47f', '#cfe8bb'], edge: '#8a7a5c', edge2: '#76684d' };
      k.place(B, TX, TY);
      const T = tools(S, OUT, B, k, 'blossom'), W = k.W, H = k.H, F = k.front, R0 = k.right, DX = TX + B.doorX, dX = Math.floor(DX);
      const ROADY = H - 6, R = k.road(ROADY, '벚꽃로');
      k.cross(R, dX - 1);
      S.traffic = { roads: k.roads, cross: k.G.cross };
      // 길: 건물 앞 · 벚꽃 산책로(가로) · 오른쪽 가로수길(세로) · 문→횡단보도
      const PY = F + 3, AX = R0 + 5;
      k.area(TX - 1, F, B.W + 2, 2, 'oa_pavers', '#efe2dc', 1);
      k.area(0, PY, W, 4, 'oa_pavers', '#f3e6de', 1);
      k.area(AX, 0, 4, PY, 'oa_pavers', '#f3e6de', 1);
      k.area(dX - 1, PY + 4, 3, ROADY - 1 - PY - 4, 'oa_pavers', '#ece0d6', 1);
      k.area(dX - 1, F + 2, 3, 1, 'oa_pavers', '#ece0d6', 1);
      k.G.decals.push({ type: 'oa_petals', x: 0, y: PY, w: W, d: 4, n: 3, seed: 3 }, { type: 'oa_petals', x: AX, y: 0, w: 4, d: PY, n: 3, seed: 5 }, { type: 'oa_petals', x: 0, y: PY + 4, w: W, d: ROADY - PY - 5, n: 0.5, seed: 8 }, { type: 'oa_petals', x: R0 + 2, y: 0, w: W - R0 - 2, d: PY, n: 0.5, seed: 9 });
      // 🌸 가로수 (산책로 양쪽 · 가로수길 양쪽)
      const sak = (x, y, s = 1.15) => (k.free(x, y) ? k.add({ type: 'oa_sakura', x: x + 0.5, y: y + 0.5, size: s + T.r() * 0.2, seed: x * 13 + y * 7 }, x, y) : null);
      for (let x = 1; x < W - 1; x += 4) { if (Math.abs(x + 0.5 - DX) > 2.5 && (x < TX - 1 || x > R0)) sak(x, PY - 1); if (Math.abs(x + 0.5 - DX) > 2.5) sak(x, PY + 4); }
      for (let y = 1; y < PY - 1; y += 4) { sak(AX - 1, y); sak(AX + 4, y); }
      // 🪑 산책로 벤치 (나무 사이)
      for (let x = 3; x + 2 < W - 1; x += 8) if (Math.abs(x + 1 - DX) > 3) T.bench(x, PY + 4, 2, '+y', '벚꽃길 벤치', '#c98a6a');
      // 🧺 피크닉 잔디 (문 왼쪽) · 🚚 푸드트럭
      const L1 = dX - 3;
      let mi = 0; for (const y of [PY + 7, PY + 11]) for (let x = 2; x + 3 < L1; x += 6) if (T.mat(x, y, COLS[(mi++) % COLS.length])) T.wander(x + 1.5, y + 3.2);
      if (mi) k.sign(1.5, PY + 6.4, '🧺 피크닉 잔디', '#3f8a45');
      const trucks = ['tteok', 'icecream', 'coffee'];
      let tn = 0; for (let x = 2; x + 4 < L1 && tn < 3; x += 5) { const y = ROADY - 4; if (!k.free(x, y, 4, 2)) continue; k.add({ type: 'foodTruck', x, y, kind: trucks[tn] }, x, y, 4, 2); for (let q = 0; q < 2; q++) T.rest({ x: x + 1.2 + q * 0.9, y: y + 2.8 + q * 0.6, face: '-y', pose: 'stand', carry: trucks[tn] === 'icecream' ? 'icecream' : trucks[tn] === 'coffee' ? 'mug' : null }, '푸드트럭 줄'); T.wander(x + 1.6, y + 3.3, { food: trucks[tn] }); tn++; }
      if (tn) k.sign(2, ROADY - 4.6, '🚚 푸드트럭', '#c47f22');
      // 🍢 포장마차 거리 (문 오른쪽 · 차도 옆)
      let first = null; const stallX = [];
      for (let x = dX + 4, n = 0; x + 3 < W - 2 && n < 4; x += 5) {
        const y = ROADY - 4; if (!k.free(x, y, 3, 3)) continue;
        k.add({ type: 'oa_stall', x, y, w: 3, color: n % 2 ? '#e8663f' : '#f08a3a', text: ['🍢 어묵 · 떡볶이', '🌭 핫바 · 순대', '🍡 꼬치 · 호떡', '🥘 전 · 막걸리'][n] }, x, y + 1, 3, 1);
        for (let i = 0; i < 3; i++) { k.K.add({ type: 'stool', x: x + 0.5 + i, y: y + 2.55, color: '#e5534b' }); T.rest({ x: x + 0.5 + i, y: y + 2.55, face: '-y', pose: 'sit', carry: i === 1 ? null : 'mug' }, '포장마차'); }
        stallX.push(x); if (!first) first = [x, y]; n++;
      }
      if (first) { k.npc('포장마차 이모', { x: first[0] + 1.5, y: first[1] + 0.5, face: '+y' }, { anim: 'type', hat: 'bow', accent: '#e8663f', say: '🍢 어묵 국물 서비스~' }); k.sign(first[0], ROADY - 4.7, '🍢 포장마차 거리', '#e8663f'); }
      // 📸 포토존 (가로수길 끝)
      const phx = AX, phy = PY + 6;
      if (k.free(phx - 1, phy, 5, 3)) {
        k.add({ type: 'oa_photoZone', x: phx, y: phy }, phx, phy, 1, 1); k.solid(phx + 2, phy, 1, 1);
        T.rest({ x: phx + 1.5, y: phy + 0.75, face: '+y', pose: 'stand', carry: null }, '벚꽃 포토존');
        k.npc('사진사', { x: phx + 1.5, y: phy + 3.2, face: '-y' }, { anim: 'think', hat: 'beret', accent: '#e2667f', say: '📸 하나, 둘, 김치~' });
        k.sign(phx + 3.4, phy + 1.2, '📸 벚꽃 포토존', '#e2667f');
        for (const [x, y, c] of [[phx - 0.6, phy + 0.8, '#f2a7c3'], [phx + 3.6, phy + 0.8, '#f07a8a']]) if (k.free(Math.floor(x), Math.floor(y))) k.add({ type: 'flowerBush', x, y, size: 1, seed: x * 3, color: c }, Math.floor(x), Math.floor(y));
      }
      // 🌸 오른쪽 위 꽃동산 (피크닉 테이블 · 벤치 · 꽃밭)
      T.picnic(AX + 7, 3, '벚꽃 동산 피크닉'); T.picnic(AX + 13, 3, '벚꽃 동산 피크닉');
      if (PY > 14) { T.bench(AX + 7, 9, 3, '+y', '벚꽃 동산 벤치'); T.bench(AX + 13, 9, 3, '+y', '벚꽃 동산 벤치'); }
      k.G.fell.push({ cx: AX + 11, cy: Math.min(PY - 4, 13), rx: 3, ry: 1.4, seed: 21, colors: ['#f7b6c8', '#ffffff', '#f07a8a', '#fbd0dc'] }); k.solid(AX + 8, Math.min(PY - 4, 13) - 1, 6, 2);
      T.scatter(R0 + 2, 1, W - 1, PY - 2, Math.round((W - R0) * PY / 60), (x, y) => sak(x, y, 1.0), 1);
      T.scatter(0, 1, TX - 1, PY - 2, 3, (x, y) => sak(x, y, 0.95), 0);
      T.scatter(1, PY + 6, L1, ROADY - 5, 4, (x, y) => sak(x, y, 1.0), 1);
      // 문 오른쪽 꽃동산: 벚나무 숲 · 피크닉 · 분홍 꽃밭
      const rx0 = dX + 4, rx1 = W - 2, ry0 = PY + 6, ry1 = ROADY - 6;
      if (rx1 - rx0 > 8 && ry1 - ry0 > 4) {
        T.picnic(rx0 + 1, ry0 + 3, '벚꽃 아래 피크닉'); T.picnic(Math.min(rx1 - 4, rx0 + 12), ry0 + 6, '벚꽃 아래 피크닉');
        k.G.fell.push({ cx: rx0 + 8, cy: ry0 + 1.8, rx: 2.6, ry: 1.2, seed: 31, colors: ['#f7b6c8', '#ffffff', '#f07a8a', '#fbd0dc'] }); k.solid(rx0 + 5, ry0 + 1, 6, 2);
        T.scatter(rx0, ry0, rx1, ry1, Math.round((rx1 - rx0) * (ry1 - ry0) / 14), (x, y) => sak(x, y, 1.05), 1);
        for (let x = rx0 + 2; x + 2 < rx1; x += 9) T.bench(x, ry1, 2, '-y', '벚꽃 숲 벤치', '#c98a6a');
      }
      // 🛣️ 가로등 · 도로 건너 꽃길
      for (let x = 5; x < W - 2; x += 10) if (Math.abs(x - dX) > 3 && !stallX.some((sx) => x >= sx - 1 && x <= sx + 3)) { const f = { type: 'streetLamp', x: x + 0.5, y: R.y - 0.6 }; k.K.add(f); OUT.lamps.push(f); }
      for (let x = 1; x < W - 1; x += 3) if (Math.abs(x - dX) > 3) T.put({ type: 'flowerBush', x: x + 0.5, y: H - 0.6, size: 0.9, seed: x * 5, color: x % 2 ? '#f2a7c3' : '#ffffff' }, x, H - 1);
      k.npc('벚꽃길 관리인', { x: 3.5, y: PY + 1.5, face: '+x' }, { hat: 'bucket', accent: '#3f8a45', say: '🌸 꽃잎이 눈처럼 내려요', patrol: [{ x: 3.5, y: PY + 1.5, face: '+x' }, { x: W - 4.5, y: PY + 2.5, face: '-x' }, { x: AX + 1.5, y: 2.5, face: '+y' }] });
      for (const [x, y] of [[phx - 2, phy + 3], [AX + 2, PY - 3], [6, PY + 2], [W - 6, PY + 2]]) T.play(x + 0.5, y + 0.5, '+y');
      S.pets = [{ kind: 'dog', color: '#f4ead8' }, { kind: 'dog', color: '#d9a066' }, { kind: 'cat', color: '#f0a050' }];
      k.sign(1.2, PY + 0.4, '🌸 AI 벚꽃길', '#e2667f');
      S.door = { lv: OUT.idx, x: dX + 0.5, y: H - 1.5, face: '-y' };
      T.done();
    },
  });

  // ================================================================ 🏞️ 호숫가
  C.outdoor({
    id: 'lake', icon: '🏞️', name: '호숫가', desc: '큰 호수 · 오리배 · 나무 선착장 · 낚시터 · 갈대숲 · 호수 둘레길 · 정자 · 호숫가 카페',
    size: (B) => ({ W: B.W + 46, H: B.H + 36 }),
    lot(S, OUT, B, k) {
      const TX = 4, TY = 4;
      OUT.ground.base = { color: '#a6d48c', tufts: ['#86bb6c', '#c0e3a8'], edge: '#7a6a4c', edge2: '#6b5d42' };
      k.place(B, TX, TY);
      const T = tools(S, OUT, B, k, 'lake'), W = k.W, H = k.H, F = k.front, R0 = k.right, DX = TX + B.doorX, dX = Math.floor(DX);
      k.area(TX - 1, F, B.W + 2, 2, 'deck', '#c9a57a', 1);
      // 🏞️ 호수
      const rx = Math.min(16, Math.floor((W - R0) * 0.4)), ry = Math.min(9, Math.floor((H - F) * 0.28)), cx = W - rx - 5, cy = H - ry - 5;
      k.G.decals.push({ type: 'oa_lake', cx, cy, rx, ry, seed: 7 });
      T.lakeTiles(cx, cy, rx, ry);
      const wTop = (i) => { for (let j = 0; j < H; j++) if (k.used[j * W + i] === 4) return j; return H; };
      const wLeft = (j) => { for (let i = 0; i < W; i++) if (k.used[j * W + i] === 4) return i; return W; };
      // 🥾 둘레길 · 문에서 가는 길
      const loop = []; for (let a = 0; a <= 32; a++) { const t = a / 32 * TAU; loop.push([cx + Math.cos(t) * (rx + 2.6), cy + Math.sin(t) * (ry + 2.4)]); }
      T.path(loop, 1.3, { dots: true });
      T.path([[0, F + 3.5], [DX - 3, F + 3.5], [DX + 0.5, F + 2]], 1.4);
      T.path([[DX + 0.5, F + 2], [DX + 3, F + 5], [cx - rx * 0.75, cy - ry - 2.2]], 1.4);
      // 🪵 선착장 (북쪽 둑에서 호수로) · 서쪽 낚시 데크
      const dkx = Math.round(cx - rx * 0.3), yw = Math.max(wTop(dkx), wTop(dkx + 1));
      OUT.bridges = [{ x: dkx, y: yw, w: 2, d: 5 }];
      k.K.add({ type: 'oa_dock', x: dkx, y: yw - 0.7, w: 2, d: 5.7 });
      T.rest({ x: dkx + 0.5, y: yw + 4.55, face: '+y', pose: 'sit', carry: null }, '선착장 낚시'); T.rest({ x: dkx + 1.5, y: yw + 4.55, face: '+y', pose: 'sit', carry: null }, '선착장 낚시');
      T.rest({ x: dkx + 0.3, y: yw + 2.5, face: '-x', pose: 'sit' }, '선착장'); T.rest({ x: dkx + 1.7, y: yw + 1.5, face: '+x', pose: 'sit' }, '선착장');
      k.K.add({ type: 'oa_fishingRod', x: dkx + 0.5, y: yw + 4.95, tx: dkx + 0.3, ty: yw + 7.6 }); k.K.add({ type: 'oa_fishingRod', x: dkx + 1.5, y: yw + 4.95, tx: dkx + 2.3, ty: yw + 7.3 });
      k.K.add({ type: 'oa_swanBoat', x: dkx + 3.4, y: yw + 1.2, moored: true, color: '#f07a8a', flip: -1, seed: 1 }); k.K.add({ type: 'oa_swanBoat', x: dkx + 3.4, y: yw + 3.6, moored: true, color: '#4fc3e8', flip: -1, seed: 2 });
      k.K.add({ type: 'oa_rowBoat', x: dkx - 1, y: yw + 2.6, color: '#3fb27f' });
      k.sign(dkx - 1.5, yw - 1.2, '🦢 오리배 선착장', '#2f6fb8');
      const pr = Math.floor(cy), wx0 = wLeft(pr);
      OUT.bridges.push({ x: wx0, y: pr, w: 3, d: 1 });
      k.K.add({ type: 'oa_dock', x: wx0 - 0.7, y: pr, w: 3.7, d: 1 });
      T.rest({ x: wx0 + 2.6, y: pr + 0.5, face: '+x', pose: 'sit', carry: null }, '낚시터'); T.rest({ x: wx0 + 1.4, y: pr + 0.75, face: '+y', pose: 'sit', carry: null }, '낚시터');
      k.K.add({ type: 'oa_fishingRod', x: wx0 + 2.95, y: pr + 0.5, tx: wx0 + 5.6, ty: pr + 0.9 }); k.K.add({ type: 'oa_fishingRod', x: wx0 + 1.4, y: pr + 1.05, tx: wx0 + 1.9, ty: pr + 3.2 });
      k.sign(wx0 - 2.5, pr + 1.6, '🎣 낚시터', '#2f6fb8');
      // 🦢 오리배 · 오리 · 갈대
      [[0, 0.035, 1, '#f07a8a'], [2.1, 0.03, -1, '#f2c230'], [4.2, 0.04, 1, '#a67be0']].forEach(([ph, sp, dir, c], i) => k.K.add({ type: 'oa_swanBoat', x: cx, y: cy, cx: cx + 1, cy: cy + 0.8, rx: rx * 0.55, ry: ry * 0.42, phase: ph, speed: sp, dir, color: c, seed: i + 3 }));
      for (const [ox, oy, s] of [[0.45, 0.15, 1], [-0.5, 0.3, 2], [0.1, -0.35, 3]]) k.K.add({ type: 'duck', x: cx + rx * ox, y: cy + ry * oy, seed: s });
      for (const a of [0.15, 0.55, 0.95, 2.2, 2.6, 3.4, 3.9, 4.4, 5.6, 6.0]) { const x = cx + Math.cos(a) * (rx - 0.7), y = cy + Math.sin(a) * (ry - 0.6); if (Math.abs(x - dkx - 1) < 3 && y < cy) continue; if (Math.abs(y - pr) < 2 && x < cx) continue; k.K.add({ type: 'oa_reeds', x, y, seed: Math.round(a * 10), n: 10 }); }
      k.sign(cx + rx * 0.75, cy + ry + 0.9, '🌾 갈대숲', '#6f9a48');
      // 🪑 북쪽 호숫가 벤치 (호수를 본다) · 정자 · 버드나무
      const by = cy - ry - 4;
      for (let x = Math.round(cx - rx + 1); x + 3 < cx + rx - 1; x += 6) if (x + 3 < dkx - 1 || x > dkx + 3) T.bench(x, by, 3, '+y', '호숫가 벤치');
      const gz = [W - 5, Math.max(F + 1, by - 3)];
      if (k.free(gz[0] - 1, gz[1] - 1, 3, 3)) { k.add({ type: 'gazebo', x: gz[0] + 0.5, y: gz[1] + 0.5 }, gz[0] - 1, gz[1] - 1, 3, 1); T.rest({ x: gz[0] - 0.2, y: gz[1] + 0.9, face: '+x', pose: 'sit' }, '호숫가 정자'); T.rest({ x: gz[0] + 1.2, y: gz[1] + 0.9, face: '-x', pose: 'sit' }, '호숫가 정자'); }
      for (const [x, y] of [[cx - rx - 1.5, cy - 4], [cx - rx - 1, cy + 4], [cx + rx + 1, cy - 2]]) if (k.free(Math.floor(x) - 1, Math.floor(y) - 1, 2, 2)) k.add({ type: 'willow', x, y, seed: Math.round(x + y) }, Math.floor(x) - 1, Math.floor(y) - 1, 2, 2);
      // ☕ 호숫가 카페 (오른쪽 위) · 오리배 대여소
      const kx = R0 + 3;
      k.add({ type: 'cafeKiosk', x: kx, y: 2, w: 5 }, kx, 2, 5, 2);
      k.npc('호숫가 바리스타', { x: kx + 2.5, y: 3.4, face: '+y' }, { anim: 'type', hat: 'beret', accent: '#2f9e5f' });
      for (let i = 0; i < 5; i++) { const x = kx + 1 + i * 4; if (x + 2 > W - 2) break; T.table(x, 7, COLS[i], '호숫가 카페'); if (F > 18) T.table(x, 11, COLS[(i + 3) % 7], '호숫가 카페'); }
      k.add({ type: 'stringLights', pts: [[kx - 0.5, 5.5], [Math.min(W - 2, kx + 19.5), 5.5]] }); k.solid(kx - 1, 5, 1, 1); k.solid(Math.min(W - 2, kx + 19), 5, 1, 1);
      k.sign(kx, 5.3, '☕ 호숫가 카페', '#2f9e5f');
      const bhx = Math.min(W - 5, dkx + 3), bhy = by - 3;
      if (k.free(bhx, bhy, 3, 3)) { k.add({ type: 'oa_boatHouse', x: bhx, y: bhy, w: 3 }, bhx, bhy, 3, 2); k.npc('선착장 직원', { x: bhx + 1.5, y: bhy + 2.6, face: '+y' }, { hat: 'cap', accent: '#2f6fb8', say: '🦢 오리배 30분에 만원!', patrol: [{ x: bhx + 1.5, y: bhy + 2.6, face: '+y' }, { x: dkx + 1, y: yw - 1.5, face: '+y' }] }); }
      k.npc('낚시꾼', { x: cx + rx * 0.35, y: wTop(Math.round(cx + rx * 0.35)) - 0.5, face: '+y', pose: 'sit' }, { anim: 'think', hat: 'bucket', accent: '#6f9a48', say: '🎣 월척이다!' });
      k.K.add({ type: 'oa_fishingRod', x: cx + rx * 0.35 + 0.3, y: wTop(Math.round(cx + rx * 0.35)) - 0.3, tx: cx + rx * 0.35 + 0.8, ty: wTop(Math.round(cx + rx * 0.35)) + 2.6 });
      k.npc('공원 관리인', { x: cx - rx - 2.1, y: cy, face: '+y' }, { hat: 'bucket', accent: '#3f8a45', patrol: [0, 1.6, 3.2, 4.7].map((a) => ({ x: cx + Math.cos(a) * (rx + 2.6), y: cy + Math.sin(a) * (ry + 2.4), face: '+y' })) });
      // 🧺 앞마당 공원 (문 아래 · 호수 왼쪽)
      const PX1 = Math.floor(cx - rx - 3);
      let mi = 0; for (const y of [F + 6, F + 11, F + 16]) for (let x = 2; x + 3 < Math.min(PX1, dX - 2); x += 6) if (y + 3 < H - 2 && T.mat(x, y, COLS[(mi++) % COLS.length])) T.wander(x + 1.5, y + 3.3);
      T.picnic(Math.max(2, dX + 3), F + 10, '호숫가 피크닉'); T.picnic(Math.max(2, dX + 3), F + 16, '호숫가 피크닉');
      k.G.fell.push({ cx: 6, cy: H - 4, rx: 3.2, ry: 1.4, seed: 12 }); k.solid(3, H - 5, 7, 2);
      T.scatter(1, F + 3, PX1, H - 1, Math.round(PX1 * (H - F) / 70), (x, y) => k.tree(x, y, 1.05 + T.r() * 0.25, ['oak', 'maple', 'cherry'][Math.floor(T.r() * 3)]), 1);
      T.scatter(R0 + 2, 13, W - 1, by - 1, 4, (x, y) => k.tree(x, y, 1.1, 'oak'), 1);
      T.scatter(0, 1, TX - 1, F, 3, (x, y) => k.tree(x, y, 1, 'oak'), 0);
      for (const [x, y] of [[cx - rx - 3, cy + ry], [cx, cy + ry + 2.5], [cx + rx + 2.4, cy]]) T.play(x, y, '+y');
      S.pets = [{ kind: 'dog', color: '#d9a066' }, { kind: 'dog', color: '#ffffff' }, { kind: 'cat', color: '#8a8f96' },
        { kind: 'duck', color: '#ffffff', near: [cx - rx * 0.6, cy - ry - 1.6] }, { kind: 'duck', color: '#3f8a45', near: [cx - rx * 0.6, cy - ry - 1.6] }];
      k.sign(1.2, F + 2.2, '🏞️ AI 호수공원', '#2f6fb8');
      S.door = { lv: OUT.idx, x: 0.5, y: F + 3.5, face: '+x' };
      T.done();
    },
  });

  // ================================================================ ⛲ 도심 광장
  C.outdoor({
    id: 'plaza', icon: '⛲', name: '도심 광장', desc: '넓은 포장 광장 · 3단 대분수 · 비둘기 · 버스킹 무대 · 가판대 · 시계탑 · 광장 카페 · 차도와 횡단보도',
    size: (B) => ({ W: B.W + 40, H: B.H + 38 }),
    lot(S, OUT, B, k) {
      const TX = 4, TY = 4;
      OUT.ground.base = { color: '#d6cfc2', tufts: null, edge: '#a39b8d', edge2: '#938b7e' };
      k.place(B, TX, TY);
      const T = tools(S, OUT, B, k, 'plaza'), W = k.W, H = k.H, F = k.front, R0 = k.right, DX = TX + B.doorX, dX = Math.floor(DX);
      k.area(0, 0, W, H, 'oa_pavers', '#ddd5c8');
      k.area(TX - 1, F, B.W + 2, 2, 'oa_pavers', '#cfc6b6', 1);
      const ROADY = H - 6, R = k.road(ROADY, '광장로');
      k.cross(R, dX - 1);
      const c2x = W - 12; if (c2x - dX > 10) k.cross(R, c2x);
      S.traffic = { roads: k.roads, cross: k.G.cross };
      // ⛲ 대분수 + 둥근 광장
      const fx = Math.round(W * 0.55), fy = F + 3 + Math.floor((ROADY - 2 - F - 3) / 2);
      k.G.rounds.push({ cx: fx, cy: fy, r: 7.2, color: '#ece4d4' });
      k.add({ type: 'oa_bigFountain', x: fx, y: fy, r: 2.35 }, fx - 3, fy - 3, 6, 6);
      k.sign(fx - 2, fy + 3.2, '⛲ 시민 대분수', '#2f6fb8');
      T.bench(fx - 5, fy - 5, 3, '+y', '분수 벤치'); T.bench(fx + 2, fy - 5, 3, '+y', '분수 벤치');
      T.bench(fx - 5, fy + 4, 3, '-y', '분수 벤치'); T.bench(fx + 2, fy + 4, 3, '-y', '분수 벤치');
      k.K.add({ type: 'oa_pigeons', x: fx - 4.6, y: fy + 3.4, n: 7, seed: 3 }); k.K.add({ type: 'oa_pigeons', x: fx + 5, y: fy - 2.6, n: 5, seed: 8 });
      k.npc('비둘기 할아버지', { x: fx - 4.5, y: fy + 3.3, face: '+x' }, { hat: 'beret', accent: '#7a5a3a', say: '🕊️ 구구구~ 이리 오렴' });
      for (const [x, y, w] of [[fx - 12, fy - 8, 4], [fx + 8, fy - 8, 4], [fx - 12, fy + 6, 4], [fx + 8, fy + 6, 4]]) if (k.free(x, y, w, 2)) { k.G.decals.push({ type: 'flowers', x, y, w, d: 2, seed: x * 7 + y }); k.solid(x, y, w, 2); }
      for (const [x, y] of [[fx - 7, fy], [fx + 7, fy]]) T.lamp(x, y);
      if (k.free(fx + 8, fy - 3)) { k.add({ type: 'oa_clock', x: fx + 8.5, y: fy - 2.5 }, fx + 8, fy - 3); k.sign(fx + 8.8, fy - 1.6, '🕰️ 광장 시계탑', '#3b4a3f'); }
      for (const [x, y] of [[fx - 8, fy - 4], [fx + 7, fy + 3], [fx - 8, fy + 3], [fx + 7, fy - 4]]) if (k.free(x, y)) { k.G.rounds.push({ cx: x + 0.5, cy: y + 0.5, r: 0.7, color: '#b9b0a2' }); k.tree(x, y, 1.1, 'ginkgo'); }
      if (k.free(dX + 3, F + 2, 3, 1)) k.add({ type: 'bikeRack', x: dX + 3.2, y: F + 2.5 }, dX + 3, F + 2, 2, 1);
      if (k.free(fx + 4, fy + 4)) k.add({ type: 'oa_balloonCart', x: fx + 4, y: fy + 4.2 }, fx + 4, fy + 4);
      // 🎸 버스킹 무대 (분수 왼쪽)
      const bx = Math.max(dX + 6, fx - 14), by = fy;
      k.add({ type: 'oa_buskStage', x: bx, y: by }, bx - 1, by - 1, 2, 2);
      k.npc('거리의 버스커', { x: bx + 0.2, y: by + 0.3, face: '+y' }, { anim: 'think', hat: 'beret', accent: '#a67be0', say: '🎸 오늘도 한 곡~ ♬' });
      for (const [dx, dy] of [[-1.6, 2.8], [0, 3.3], [1.6, 2.8], [-0.8, 4.4], [0.9, 4.5]]) T.rest({ x: bx + dx, y: by + dy, face: '-y', pose: 'stand', carry: null }, '버스킹 관람');
      k.sign(bx - 2, by - 2.2, '🎸 버스킹 존', '#a67be0');
      // 📰 가판대 · 🌳 은행나무 · 화분 · 가로등
      const kx = W - 7;
      if (k.free(kx, ROADY - 4, 2, 2)) { k.add({ type: 'oa_kiosk', x: kx, y: ROADY - 4, w: 2, text: '📰 신문 · 잡지 · 음료' }, kx, ROADY - 4, 2, 2); k.npc('가판대 주인', { x: kx - 0.5, y: ROADY - 2.5, face: '+x' }, { anim: 'idle', hat: 'cap', accent: '#2f7d4f', say: '📰 오늘 신문이요~' }); k.sign(kx - 1, ROADY - 4.6, '📰 가판대', '#2f7d4f'); }
      for (let x = 3; x < W - 2; x += 6) { const near = k.G.cross.some((c) => x >= c.x - 3 && x <= c.x + 5); if (!near) k.tree(x, ROADY - 2, 1.05, 'ginkgo'); }
      for (let x = 2; x + 2 < W - 2; x += 6) { const near = k.G.cross.some((c) => x + 3 >= c.x - 2 && x <= c.x + 5); if (!near && Math.abs(x + 1 - DX) > 4) T.put({ type: 'planter', x, y: ROADY - 3.6, w: 2.2, seed: x }, x, ROADY - 4, 3, 1); }
      for (let x = 7; x < W - 2; x += 12) { const f = { type: 'streetLamp', x: x + 0.5, y: R.y - 0.6 }; k.K.add(f); OUT.lamps.push(f); }
      k.npc('교통 안내원', { x: dX - 2.5, y: ROADY - 0.5, face: '+y' }, { hat: 'police', accent: '#2b3a67', say: '🚦 초록불에 건너세요' });
      // ☕ 광장 카페 (오른쪽 위)
      const cx0 = R0 + 3;
      k.add({ type: 'cafeKiosk', x: cx0, y: 2, w: 5 }, cx0, 2, 5, 2);
      k.npc('카페 사장님', { x: cx0 + 2.5, y: 3.4, face: '+y' }, { anim: 'type', hat: 'beret', accent: '#7a4a2a' });
      for (let i = 0; i < 6; i++) { const x = cx0 + 1 + i * 4; if (x + 2 > W - 2) break; T.table(x, 7, COLS[i % 7], '광장 카페'); if (F > 16) T.table(x, 11, COLS[(i + 2) % 7], '광장 카페'); }
      k.sign(cx0, 5.3, '☕ 광장 카페', '#7a4a2a');
      for (let x = R0 + 3; x < W - 2; x += 5) T.put({ type: 'topiary', x: x + 0.5, y: F - 1.5, seed: x }, x, F - 2);
      for (let y = 2; y < F - 2; y += 4) T.put({ type: 'topiary', x: 1.5, y: y + 0.5, seed: y }, 1, y);
      // 광장 가장자리 의자 · 동상
      T.bench(2, F + 4, 3, '+y', '광장 벤치'); T.bench(2, F + 10, 3, '+y', '광장 벤치');
      if (k.free(fx + 11, fy - 1, 2, 2)) { k.add({ type: 'monument', x: fx + 12, y: fy }, fx + 11, fy - 1, 2, 2); }
      for (const [x, y] of [[fx - 6, fy + 2], [fx + 6, fy - 3], [bx + 3, by + 4]]) T.play(x, y, '+y');
      S.pets = [{ kind: 'dog', color: '#f4ead8' }, { kind: 'dog', color: '#6b4a35' }, { kind: 'cat', color: '#2b2b2b' }];
      k.sign(1.2, F + 2.6, '⛲ AI 시민광장', '#2f6fb8');
      S.door = { lv: OUT.idx, x: dX + 0.5, y: H - 1.5, face: '-y' };
      T.done();
    },
  });

  // ================================================================ 🌾 시골 농장
  C.outdoor({
    id: 'farm', icon: '🌾', name: '시골 농장', desc: '흙길 · 밭 이랑과 채소 · 금빛 밀밭 · 빨간 헛간 · 사일로 · 풍차 · 트랙터 · 허수아비 · 젖소 목장 · 닭 · 오리 연못',
    size: (B) => ({ W: B.W + 48, H: B.H + 38 }),
    lot(S, OUT, B, k) {
      const TX = 4, TY = 4;
      OUT.ground.base = { color: '#d2bb8f', tufts: ['#b8a274', '#c9b483'], edge: '#8a6a4a', edge2: '#76583c' };
      k.place(B, TX, TY);
      const T = tools(S, OUT, B, k, 'farm'), W = k.W, H = k.H, F = k.front, R0 = k.right, DX = TX + B.doorX, dX = Math.floor(DX);
      // 흙길 (정문 앞 · 가로 큰길 · 세로 농로)
      k.area(TX - 1, F, B.W + 2, 2, 'oa_dirt', '#c9ad80', 1);
      k.area(0, F + 2, W, 2, 'oa_dirt', '#c3a678', 1);
      k.area(dX - 1, F + 4, 3, H - F - 5, 'oa_dirt', '#c3a678', 1);
      k.area(0, 0, TX - 1, F, 'grass', '#b9d48f');
      k.area(0, F + 4, dX - 1, H - F - 4, 'grass', '#b9d48f');
      // 🏚️ 헛간 · 사일로 · 트랙터 · 건초 · 닭장 (오른쪽 위)
      const bx = R0 + 3;
      k.add({ type: 'oa_barn', x: bx, y: 1, w: 6, d: 4 }, bx, 0, 6, 5);
      k.add({ type: 'oa_silo', x: bx + 7.5, y: 2.5 }, bx + 6, 0, 3, 4);
      k.add({ type: 'oa_tractor', x: bx, y: 6.2 }, bx, 6, 2, 1);
      k.add({ type: 'oa_hay', x: bx + 3.5, y: 6.5 }, bx + 3, 6); k.add({ type: 'oa_hay', x: bx + 4.6, y: 7.3 }, bx + 4, 7); k.add({ type: 'oa_hay', x: bx + 3.4, y: 8.2, kind: 'bale' }, bx + 3, 8);
      k.add({ type: 'coop', x: bx + 7, y: 6 }, bx + 7, 6, 2, 2);
      k.sign(bx, 5.4, '🏚️ AI 농장 헛간', '#c94a3c'); k.sign(bx + 7, 8.6, '🐔 닭장', '#c47f22');
      // 🥬 채소밭 이랑
      const fx0 = bx + 11, fx1 = W - 7;
      k.area(fx0 - 1, 1, fx1 - fx0 + 2, Math.min(F, 18), 'oa_furrows', '#a9805a');
      let lastBed = 2;
      for (let y = 2; y + 2 < Math.min(F, 18); y += 3) { for (let x = fx0; x + 3 <= fx1; x += 7) { const w = Math.min(6, fx1 - x); k.add({ type: 'veggies', x, y, w, d: 1.8, seed: x * 3 + y }, x, y, w, 2); } lastBed = y; }
      k.mark(fx0 - 1, 1, fx1 - fx0 + 2, lastBed + 2, 1);
      k.npc('농부', { x: fx0 + 1, y: 4.5, face: '+x' }, { hat: 'bucket', accent: '#3f9a4b', say: '🥕 올해 농사 대풍이에요', patrol: [{ x: fx0 + 1, y: 4.5, face: '+x' }, { x: fx1 - 1, y: 4.5, face: '-x' }, { x: fx1 - 1, y: 7.5, face: '-x' }, { x: fx0 + 1, y: 7.5, face: '+y' }] });
      k.sign(fx0, 1.2, '🥬 채소밭', '#3f9a4b');
      // 🌬️ 풍차 (오른쪽 뒤 모서리)
      k.add({ type: 'oa_windmill', x: W - 3.5, y: 3.5 }, W - 5, 2, 3, 3);
      // 🐄 목장 (문 오른쪽 · 나무 울타리)
      const px0 = dX + 4, py0 = F + 6, pw = Math.min(16, W - px0 - 14), pd = 10, gate = px0 + 2;
      k.area(px0, py0, pw, pd, 'grass', '#a9cf86');
      const rail = (axis, x, y, bx2, by2) => { k.K.add({ type: 'oa_rail', axis, x, y }); k.solid(bx2, by2, 1, 1); };
      for (let x = px0; x < px0 + pw; x++) { if (x !== gate && x !== gate + 1) rail('x', x, py0, x, py0); rail('x', x, py0 + pd, x, py0 + pd - 1); }
      for (let y = py0; y < py0 + pd; y++) { rail('y', px0, y, px0, y); rail('y', px0 + pw, y, px0 + pw - 1, y); }
      k.K.add({ type: 'oa_rail', axis: 'y', x: px0 + pw, y: py0 + pd - 1, end: true });
      [[px0 + 4, py0 + 3.5, 1], [px0 + 9, py0 + 5.5, -1], [px0 + pw - 4, py0 + 3, 1], [px0 + 6, py0 + 7.5, -1]].forEach(([x, y, fl], i) => { if (x < px0 + pw - 2) k.add({ type: 'oa_cow', x: x + 0.5, y: y, flip: fl, seed: i * 3 }, Math.floor(x) - 0, Math.floor(y), 1, 1); });
      k.add({ type: 'oa_hay', x: px0 + pw - 2.5, y: py0 + pd - 2.5 }, px0 + pw - 3, py0 + pd - 3);
      k.npc('목장 지기', { x: gate + 1, y: py0 - 1, face: '+y' }, { hat: 'cap', accent: '#c94a3c', say: '🐄 음매~ 우유 짜러 가요', patrol: [{ x: gate + 1, y: py0 - 1, face: '+y' }, { x: gate + 1, y: py0 + 2.5, face: '+y' }, { x: px0 + 6, y: py0 + 5, face: '+x' }] });
      k.sign(px0, py0 - 0.6, '🐄 젖소 목장', '#c94a3c');
      // 🌻 밀밭 + 허수아비 (목장 오른쪽)
      const wx0 = px0 + pw + 3, ww = W - 3 - wx0, wy0 = F + 5, wd = Math.min(14, H - wy0 - 4);
      if (ww >= 6) {
        k.G.decals.push({ type: 'oa_wheat', x: wx0, y: wy0, w: ww, d: wd, seed: 6 }); k.solid(wx0, wy0, ww, wd);
        k.K.add({ type: 'oa_scarecrow', x: wx0 + ww / 2, y: wy0 + wd / 2 });
        k.sign(wx0, wy0 + wd + 0.5, '🌻 금빛 밀밭', '#c99a3c');
      }
      // 🦆 오리 연못 (목장 아래)
      const pcx = px0 + 6, pcy = py0 + pd + 6;
      if (pcy + 3 < H - 1) {
        k.pond(pcx, pcy, 4, 2.4);
        T.bench(pcx - 4, pcy - 4, 3, '+y', '연못 벤치'); T.bench(pcx + 1, pcy - 4, 3, '+y', '연못 벤치');
        for (const a of [0.3, 2.6, 3.6]) k.K.add({ type: 'oa_reeds', x: pcx + Math.cos(a) * 3.4, y: pcy + Math.sin(a) * 1.9, seed: Math.round(a * 9), n: 7 });
        k.K.add({ type: 'duck', x: pcx, y: pcy, seed: 2 });
        k.sign(pcx + 4.5, pcy + 2.4, '🦆 오리 연못', '#2f6fb8');
      }
      // 🥕 직판장 · 피크닉 · 건초 의자 (문 왼쪽)
      if (k.free(2, F + 5, 3, 2)) { k.add({ type: 'oa_produceStand', x: 2, y: F + 5, w: 3 }, 2, F + 5, 3, 2); k.npc('직판장 사장님', { x: 3.5, y: F + 4.5, face: '+y' }, { anim: 'type', hat: 'bucket', accent: '#e9a23b', say: '🥕 방금 딴 당근이에요!' }); k.sign(5.4, F + 5.6, '🥕 직판장', '#e9a23b'); }
      const LX = dX - 2;
      for (let x = 2; x + 3 < LX; x += 5) T.picnic(x, F + 10, '농장 피크닉');
      for (let i = 0; i < 4; i++) { const x = 2 + i * 2; if (x + 1 >= LX) break; k.add({ type: 'oa_hay', x: x + 0.5, y: F + 15.5, kind: 'bale' }, x, F + 15); T.rest({ x: x + 0.5, y: F + 15.6, face: '+y', pose: 'sit', approach: [x, F + 16] }, '건초 의자'); }
      let mi = 0; for (const y of [F + 19, F + 23]) for (let x = 2; x + 3 < LX; x += 5) if (y + 3 < H - 1 && T.mat(x, y, COLS[(mi++) % 7])) T.wander(x + 1.5, y + 3.2);
      T.scatter(1, F + 5, LX, H - 1, Math.round(LX * (H - F) / 90), (x, y) => k.tree(x, y, 1.2 + T.r() * 0.2, T.r() < 0.6 ? 'oak' : 'maple'), 1);
      T.scatter(0, 1, TX - 1, F, 3, (x, y) => k.tree(x, y, 1.1, 'oak'), 0);
      T.scatter(R0 + 2, 10, W - 1, F + 1, 4, (x, y) => k.tree(x, y, 1.1, 'oak'), 1);
      for (let x = 1; x < W - 1; x += 3) if (Math.abs(x - dX) > 2) T.put({ type: 'flowerBush', x: x + 0.5, y: H - 0.6, size: 0.8, seed: x * 3, color: ['#f6c445', '#ffffff', '#ff9a5a'][x % 3] }, x, H - 1);
      for (const [x, y] of [[bx + 5, 9.5], [dX + 0.5, F + 6], [3, F + 13]]) T.play(x, y, '+y');
      S.pets = [{ kind: 'dog', color: '#d9a066' }, { kind: 'dog', color: '#2b2b2b' }, { kind: 'cat', color: '#f0a050' },
        { kind: 'hen', chicks: 4, near: [bx + 8, 9] }, { kind: 'hen', chicks: 3, near: [bx + 6, 10] },
        { kind: 'duck', color: '#ffffff', near: [pcx - 5, pcy - 2] }, { kind: 'duck', color: '#3f8a45', near: [pcx - 5, pcy - 2] }];
      k.sign(1.2, F + 2.4, '🌾 AI 농장', '#c99a3c');
      S.door = { lv: OUT.idx, x: 0.5, y: F + 2.5, face: '+x' };
      T.done();
    },
  });

  // ================================================================ ⛳ 골프장
  C.outdoor({
    id: 'golf', icon: '⛳', name: '골프장', desc: '페어웨이 · 그린과 깃발 홀 · 모래 벙커 · 연못 해저드 · 카트 길과 골프카트 · 클럽하우스 테라스 · 퍼팅 연습장',
    size: (B) => ({ W: B.W + 50, H: B.H + 38 }),
    lot(S, OUT, B, k) {
      const TX = 4, TY = 4;
      OUT.ground.base = { color: '#86b866', tufts: ['#6fa552', '#a4d184'], edge: '#7a6a4c', edge2: '#6b5d42' };
      k.place(B, TX, TY);
      const T = tools(S, OUT, B, k, 'golf'), W = k.W, H = k.H, F = k.front, R0 = k.right, DX = TX + B.doorX, dX = Math.floor(DX);
      // ☕ 클럽하우스 테라스 (건물 앞 데크)
      k.area(TX - 1, F, B.W + 2, 5, 'deck', '#c9a57a', 1);
      for (let x = TX + 1; x + 2 < R0 - 1; x += 5) if (Math.abs(x + 0.5 - DX) > 3) T.table(x, F + 2, COLS[(x >> 2) % 7], '클럽하우스 테라스');
      for (let x = TX; x + 2 < R0; x += 4) if (Math.abs(x + 1 - DX) > 3) T.put({ type: 'planter', x, y: F + 4.2, w: 2.2, seed: x }, x, F + 4, 3, 1);
      if (k.free(R0 - 3, F, 2, 1)) k.add({ type: 'oa_bagRack', x: R0 - 3, y: F - 0.2, w: 2 }, R0 - 3, F, 2, 1);
      k.sign(TX, F + 4.9, '☕ 클럽하우스 테라스', '#7a4a2a');
      // 🛺 카트 승차장
      for (let i = 0; i < 3; i++) k.add({ type: 'oa_golfCart', x: R0 + 1.5 + i, y: F + 1.2, axis: 'y', dir: 1, color: ['#3fb27f', '#ffffff', '#4e7cf6'][i] }, R0 + 1 + i, F, 1, 2);
      k.sign(R0 + 1, F + 2.6, '🛺 카트 승차장', '#3f8a45');
      // 🏌️ 1번 홀 (가로, 건물 앞)
      const h1y = F + 9, fx0 = 6, fx1 = W - 6;
      k.area(fx0, h1y, fx1 - fx0, 8, 'oa_fairway', '#9bd27a', 1);
      k.area(2, h1y + 2, 3, 4, 'oa_fairway', '#a6d985', 1);
      k.K.add({ type: 'oa_tee', x: 3.5, y: h1y + 4, color: '#4e7cf6', text: '1번 홀 · PAR 4', sub: `${(fx1 - fx0) * 6} m` });
      const g1 = { cx: W - 11, cy: h1y + 4, rx: 4, ry: 3 };
      k.G.decals.push({ type: 'oa_green', ...g1, hx: g1.cx + 1, hy: g1.cy - 0.4 }); k.K.add({ type: 'oa_pin', x: g1.cx + 1, y: g1.cy - 0.4, n: 1, color: '#e5534b' });
      k.G.decals.push({ type: 'oa_bunker', cx: g1.cx - 5.5, cy: h1y + 7.3, rx: 1.8, ry: 0.9 }, { type: 'oa_bunker', cx: Math.round(W * 0.48), cy: h1y + 0.9, rx: 2.4, ry: 0.8, rot: 0.1 }, { type: 'oa_bunker', cx: g1.cx + 2, cy: h1y + 7.6, rx: 1.4, ry: 0.7 });
      k.npc('골퍼', { x: 3.4, y: h1y + 4.6, face: '+x' }, { anim: 'idle', hat: 'cap', accent: '#4e7cf6', say: '🏌️ 나이스 샷~!' });
      T.bench(2, h1y + 7, 3, '+y', '1번 홀 티 대기');
      T.bench(g1.cx - 4, h1y - 2, 3, '+y', '1번 홀 그린 관람'); T.bench(g1.cx + 1, h1y - 2, 3, '+y', '1번 홀 그린 관람');
      k.sign(fx0, h1y + 8.5, '🏌️ 1번 홀 · PAR 4', '#2f5d3a');
      // 🛣️ 카트 길 (1번 홀 북쪽) + 달리는 카트
      const cy0 = h1y - 2.5;
      T.path([[0, cy0], [W - 3, cy0]], 1.2, { color: '#e6e3dc', edge: '#c9c4b8' });
      T.path([[DX + 0.5, F + 5], [DX + 0.5, cy0]], 1.2, { color: '#e6e3dc', edge: '#c9c4b8' });
      k.K.add({ type: 'oa_golfCart', x: 3, y: cy0, path: [[3, cy0], [W - 5, cy0]], speed: 1.3, color: '#3fb27f' });
      // 🏌️ 2번 홀 (세로, 건물 오른쪽) · 연못 해저드
      const h2x = R0 + 7;
      if (h2x + 9 < W - 2) {
        k.area(h2x, 2, 8, F - 3, 'oa_fairway', '#9bd27a', 1);
        const g2 = { cx: h2x + 4, cy: 4.5, rx: 3.2, ry: 2.4 };
        k.G.decals.push({ type: 'oa_green', ...g2, hx: g2.cx + 0.6, hy: g2.cy }); k.K.add({ type: 'oa_pin', x: g2.cx + 0.6, y: g2.cy, n: 2, color: '#f2c230' });
        k.G.decals.push({ type: 'oa_bunker', cx: h2x + 8.4, cy: 6.5, rx: 1.4, ry: 1.0 }); k.mark(h2x + 7, 5, 3, 3, 1);
        k.K.add({ type: 'oa_tee', x: h2x + 4, y: F - 2.5, color: '#e5534b', text: '2번 홀 · PAR 3', sub: '150 m' });
        k.npc('골퍼 2', { x: g2.cx - 1, y: g2.cy + 1.2, face: '+x' }, { anim: 'think', hat: 'shades', accent: '#e5534b', say: '⛳ 버디 찬스!' });
        k.sign(h2x, F - 1.2, '🏌️ 2번 홀 · PAR 3', '#2f5d3a');
        const pcx = h2x + 15, pcy = Math.round(F * 0.45);
        if (pcx + 5 < W - 1) {
          k.G.decals.push({ type: 'oa_lake', cx: pcx, cy: pcy, rx: 3.6, ry: 2.6, pads: 3, seed: 4 }); T.lakeTiles(pcx, pcy, 3.6, 2.6);
          T.bench(pcx - 3, pcy - 5, 3, '+y', '연못 쉼터');
          k.K.add({ type: 'duck', x: pcx, y: pcy, seed: 5 });
          for (const a of [0.4, 2.8]) k.K.add({ type: 'oa_reeds', x: pcx + Math.cos(a) * 3, y: pcy + Math.sin(a) * 2, seed: Math.round(a * 7) });
          k.sign(pcx - 3, pcy + 3.4, '💧 워터 해저드', '#2f6fb8');
        }
        k.npc('그린 키퍼', { x: h2x + 9.5, y: 8.5, face: '-x' }, { hat: 'bucket', accent: '#3f8a45', say: '🌱 잔디 깎는 중', patrol: [{ x: h2x + 9.5, y: 8.5, face: '-x' }, { x: g1.cx - 3, y: h1y - 0.8, face: '+y' }] });
      }
      // ⛳ 퍼팅 연습장 (왼쪽 아래)
      const pg = { cx: 8, cy: H - 6, rx: 4.5, ry: 2.4 };
      k.G.decals.push({ type: 'oa_green', ...pg, hx: 6.5, hy: H - 6.2 }); k.mark(3, H - 9, 11, 6, 1);
      k.K.add({ type: 'oa_pin', x: 6.5, y: H - 6.2, n: 9, color: '#a67be0' }); k.K.add({ type: 'oa_pin', x: 10, y: H - 5.4, n: 8, color: '#4e7cf6' });
      for (const [x, y, face] of [[4.2, H - 5.6, '+x'], [11.8, H - 6.5, '-x'], [8.2, H - 4.2, '-y']]) T.rest({ x, y, face, pose: 'stand', carry: null }, '퍼팅 연습');
      T.bench(4, H - 10, 3, '+y', '퍼팅장 벤치');
      k.sign(3, H - 3, '⛳ 퍼팅 연습장', '#2f5d3a');
      k.npc('캐디', { x: 12, y: cy0, face: '+x' }, { hat: 'cap', accent: '#e9a23b', carry: 'box', say: '🏌️ 7번 아이언 드릴까요?', patrol: [{ x: 12, y: cy0, face: '+x' }, { x: W - 8, y: cy0, face: '-x' }, { x: 8, y: H - 8.5, face: '+y' }] });
      // 🌳 러프의 나무들
      T.scatter(1, h1y + 9, W - 1, H - 1, Math.round(W * (H - h1y - 9) / 55), (x, y) => k.tree(x, y, 1.1 + T.r() * 0.3, T.r() < 0.5 ? 'oak' : 'pine'), 1);
      T.scatter(R0 + 1, 1, h2x, F - 1, 3, (x, y) => k.tree(x, y, 1.05, 'pine'), 0);
      T.scatter(h2x + 9, 1, W - 1, F + 5, Math.round((W - h2x) * F / 70), (x, y) => k.tree(x, y, 1.1, T.r() < 0.5 ? 'oak' : 'maple'), 1);
      T.scatter(0, 1, TX - 1, F, 3, (x, y) => k.tree(x, y, 1, 'pine'), 0);
      S.pets = [{ kind: 'dog', color: '#f4ead8', near: [DX, F + 6] }, { kind: 'duck', color: '#ffffff', near: [h2x + 11, Math.round(F * 0.45)] }];
      k.sign(1.2, F + 1.2, '⛳ AI 컨트리클럽', '#2f5d3a');
      S.door = { lv: OUT.idx, x: 0.5, y: cy0, face: '+x' };
      T.done();
    },
  });

  // ================================================================ 🎡 놀이공원
  C.outdoor({
    id: 'themepark', icon: '🎡', name: '놀이공원', desc: '대관람차 · 회전목마 · 미니 기차 · 솜사탕 · 풍선 · 매표소와 입구 아치 · 퍼레이드 길 · 먹거리 광장',
    size: (B) => ({ W: B.W + 50, H: B.H + 40 }),
    lot(S, OUT, B, k) {
      const TX = 4, TY = 4;
      OUT.ground.base = { color: '#eadfcd', tufts: null, edge: '#b8a990', edge2: '#a89a82' };
      k.place(B, TX, TY);
      const T = tools(S, OUT, B, k, 'themepark'), W = k.W, H = k.H, F = k.front, R0 = k.right, DX = TX + B.doorX, dX = Math.floor(DX);
      k.area(0, 0, W, H, 'oa_pavers', '#f1e6d6');
      k.area(TX - 1, F, B.W + 2, 2, 'oa_pavers', '#e9d9c9', 1);
      // 🎉 퍼레이드 길 (둥근 사각 고리) + 입구
      const Lx0 = 5.5, Ly0 = F + 3.2, Lx1 = W - 5.5, Ly1 = H - 5.5, pc = { color: '#f6c9d0', edge: '#e8a9b6' };
      T.path([[Lx0, H], [Lx0, Ly0 + 2], [Lx0 + 2, Ly0], [Lx1 - 2, Ly0], [Lx1, Ly0 + 2], [Lx1, Ly1 - 2], [Lx1 - 2, Ly1], [Lx0 + 2, Ly1], [Lx0, Ly1 - 2]], 2.4, pc);
      T.path([[DX + 0.5, F + 1.5], [DX + 0.5, Ly0]], 2, pc);
      // 🎟️ 입구 아치 · 매표소
      k.add({ type: 'oa_gateArch', x: 2, y: H - 3, w: 7 }, 2, H - 3); k.solid(8, H - 3, 1, 1);
      if (k.free(10, H - 5, 2, 2)) { k.add({ type: 'oa_ticketBooth', x: 10, y: H - 5 }, 10, H - 5, 2, 2); k.npc('매표소 직원', { x: 9.5, y: H - 4.5, face: '+y' }, { anim: 'type', hat: 'cap', accent: '#e2667f', say: '🎟️ 자유이용권 있어요!' }); k.sign(10, H - 2.6, '🎟️ 매표소', '#e2667f'); }
      // 🎡 대관람차 (오른쪽 뒤)
      const fwx = R0 + 4;
      k.add({ type: 'oa_ferris', x: fwx, y: 1.2, w: 5 }, fwx, 0, 5, 4);
      for (let q = 0; q < 3; q++) T.rest({ x: fwx + 1.5 + q, y: 4.6, face: '-y', pose: 'stand', carry: null }, '대관람차 줄');
      k.sign(fwx - 0.5, 5.4, '🎡 대관람차', '#e2667f');
      // 🍔 먹거리 광장 (대관람차 오른쪽)
      const kinds = ['icecream', 'burger', 'taco'];
      let fxx = fwx + 7;
      kinds.forEach((kd, i) => { const x = fxx + i * 5; if (x + 4 > W - 2 || !k.free(x, 1, 4, 4)) return; k.add({ type: 'foodTruck', x, y: 1, kind: kd }, x, 1, 4, 2); for (let q = 0; q < 2; q++) T.rest({ x: x + 1.2 + q * 0.9, y: 3.8 + q * 0.6, face: '-y', pose: 'stand', carry: kd === 'icecream' ? 'icecream' : null }, '먹거리 줄'); T.wander(x + 1.6, 4.3, { food: kd }); });
      for (let i = 0; i < 6; i++) { const x = fwx + 8 + i * 4; if (x + 2 > W - 2) break; T.table(x, 8, COLS[i % 7], '먹거리 광장'); if (F > 16) T.table(x, 12, COLS[(i + 3) % 7], '먹거리 광장'); }
      k.add({ type: 'stringLights', pts: [[fwx + 6.5, 6.5], [Math.min(W - 2, fwx + 30.5), 6.5]] }); k.solid(fwx + 6, 6, 1, 1); k.solid(Math.min(W - 2, fwx + 30), 6, 1, 1);
      k.sign(fwx + 7, 6.9, '🍔 먹거리 광장', '#e9a23b');
      // 🎠 회전목마 (고리 안 왼쪽)
      const ccx = Math.round(Lx0 + 9.5), ccy = Math.round(Ly0 + 8.5);
      k.add({ type: 'oa_carousel', x: ccx, y: ccy }, ccx - 2, ccy - 2, 4, 4);
      for (const [dx, dy, f] of [[-3, 0, '+x'], [3, 0.5, '-x'], [0, 3, '-y'], [-2, 2.6, '-y']]) T.play(ccx + dx, ccy + dy, f);
      T.bench(ccx - 2, ccy - 5, 3, '+y', '회전목마 구경'); T.bench(ccx - 2, ccy + 4, 3, '-y', '회전목마 구경');
      k.sign(ccx - 2, ccy + 2.6, '🎠 회전목마', '#e2667f');
      // 🍭 솜사탕 · 🎈 풍선
      if (k.free(ccx + 4, ccy - 1, 2, 1)) { k.add({ type: 'oa_cottonCandy', x: ccx + 4, y: ccy - 1 }, ccx + 4, ccy - 1, 2, 1); k.npc('솜사탕 장수', { x: ccx + 5, y: ccy + 0.6, face: '+y' }, { anim: 'type', hat: 'bow', accent: '#f07a8a', say: '🍭 달콤한 솜사탕~' }); T.wander(ccx + 5, ccy + 1.5, { food: 'icecream' }); }
      if (k.free(Lx0 + 2, Ly1 - 4, 1, 1)) { k.add({ type: 'oa_balloonCart', x: Lx0 + 2, y: Ly1 - 4 }, Lx0 + 2, Ly1 - 4); k.npc('풍선 아저씨', { x: Lx0 + 3.6, y: Ly1 - 3.3, face: '+y' }, { hat: 'cap', accent: '#4e7cf6', say: '🎈 풍선 하나 사 가세요!' }); }
      // 🚂 미니 기차 (고리 안 오른쪽) + 잔디 피크닉
      const tx0 = Math.round(ccx + 7), ty0 = Math.round(Ly0 + 3), tw = Math.min(24, Math.round(Lx1 - 3 - tx0)), td = Math.min(15, Math.round(Ly1 - 3 - ty0));
      if (tw >= 10 && td >= 8) {
        const loop = { x: tx0, y: ty0, w: tw, d: td, r: 3 };
        k.area(tx0 + 1, ty0 + 1, tw - 2, td - 2, 'grass', '#b8dca0');
        k.G.decals.push({ type: 'oa_rails', ...loop });
        for (let i = 0; i < 4; i++) { const [x, y] = [tx0 + 3 + i, ty0]; k.K.add({ type: 'oa_trainCar', x, y, loop, i, speed: 1.6 }); }
        let mi = 0; for (let y = ty0 + 2; y + 3 < ty0 + td - 1; y += 4) for (let x = tx0 + 2; x + 3 < tx0 + tw - 1; x += 5) if (mi < 6 && T.mat(x, y, COLS[(mi++) % 7])) T.wander(x + 1.5, y + 2.9);
        k.sign(tx0, ty0 + td + 0.6, '🚂 미니 기차', '#e5534b');
        T.scatter(tx0 + 2, ty0 + 2, tx0 + tw - 2, ty0 + td - 2, 3, (x, y) => k.tree(x, y, 1, 'cherry'), 1);
        for (let x = tx0 + 1; x < tx0 + tw; x += 6) for (const y of [ty0 - 0.2, ty0 + td + 0.2]) T.play(x + 0.5, y, y < ty0 ? '+y' : '-y');
      }
      // 🎪 퍼레이드 장식 · 벤치 · 마스코트
      const bunt = []; for (let y = Ly0 + 2; y <= Ly1 - 2; y += 5) bunt.push([Lx1 + 2.2, y]);
      if (bunt.length > 1) k.K.add({ type: 'oa_bunting', pts: bunt, x: bunt[0][0], y: bunt[0][1] });
      const bunt2 = []; for (let x = Math.max(Lx0 + 4, R0 + 2); x <= Lx1 - 4; x += 6) bunt2.push([x, Ly0 - 1.6]);
      if (bunt2.length > 1) k.K.add({ type: 'oa_bunting', pts: bunt2, x: bunt2[0][0], y: bunt2[0][1] });
      for (let x = Lx0 + 10; x + 3 < Lx1 - 4; x += 9) T.bench(Math.round(x), Math.round(Ly1 + 1.6), 3, '-y', '퍼레이드 길 벤치');
      k.npc('마스코트 곰돌이', { x: Lx0, y: Ly0 + 4, face: '+y' }, { hat: 'bow', accent: '#c98a5a', say: '🐻 안녕~! 같이 놀자!', patrol: [{ x: Lx0, y: Ly0 + 4, face: '+y' }, { x: Lx1 - 3, y: Ly0, face: '+x' }, { x: Lx1, y: Ly1 - 3, face: '+y' }, { x: Lx0 + 4, y: Ly1, face: '-x' }] });
      T.scatter(0, 1, TX - 1, F, 2, (x, y) => k.tree(x, y, 1, 'cherry'), 0);
      for (const x of [Lx0 + 2, Lx1 - 2]) T.lamp(Math.round(x), Math.round(Ly0 + 6));
      k.sign(1, H - 4.2, '🎡 AI 랜드 입구', '#a67be0');
      S.door = { lv: OUT.idx, x: 5.5, y: H - 1.5, face: '-y' };
      T.done();
    },
  });

  // ================================================================ 🏟️ 운동장
  C.outdoor({
    id: 'stadium', icon: '🏟️', name: '운동장', desc: '육상 트랙과 축구장 · 계단식 관중석 · 전광판 · 조명탑 · 더그아웃 · 농구장 · 매점',
    size: (B) => ({ W: B.W + 46, H: B.H + 44 }),
    lot(S, OUT, B, k) {
      const TX = 4, TY = 4;
      OUT.ground.base = { color: '#9fcd82', tufts: ['#80b866', '#bfe0a8'], edge: '#7a6a4c', edge2: '#6b5d42' };
      k.place(B, TX, TY);
      const T = tools(S, OUT, B, k, 'stadium'), W = k.W, H = k.H, F = k.front, R0 = k.right, DX = TX + B.doorX, dX = Math.floor(DX);
      k.area(0, F, W, 3, 'oa_pavers', '#e3ddd2', 1);
      // 🏃 육상 트랙 + 축구장
      const tw = Math.min(40, W - 10), td = Math.min(22, H - F - 12), tx0 = Math.round((W - tw) / 2), ty0 = F + 7, tcx = tx0 + tw / 2, tcy = ty0 + td / 2;
      k.G.decals.push({ type: 'track', x: tx0, y: ty0, w: tw, d: td }); k.mark(tx0, ty0, tw, td, 1);
      S.track = { cx: tcx, cy: tcy, rx: tw / 2 - 1.2, ry: td / 2 - 1.2 };
      const rin = tw / 2 - 3.2;
      k.K.add({ type: 'goal', x: tcx - rin + 1.8, y: tcy, side: -1 }); k.K.add({ type: 'goal', x: tcx + rin - 1.8, y: tcy, side: 1 });
      for (let i = 0; i < 6; i++) T.play(tcx - 6 + (i % 3) * 6 + (i > 2 ? 2 : 0), tcy - 2 + (i > 2 ? 4 : 0), i % 2 ? '-x' : '+x', { ball: true });
      k.npc('주심', { x: tcx, y: tcy - 0.5, face: '+y' }, { hat: 'cap', accent: '#2b2b2b', say: '🟨 옐로카드!', patrol: [{ x: tcx, y: tcy - 0.5, face: '+y' }, { x: tcx - 6, y: tcy + 1, face: '+x' }, { x: tcx + 6, y: tcy - 1, face: '-x' }] });
      for (const [x, y] of [[tx0, ty0], [tx0 + tw - 1, ty0], [tx0, ty0 + td - 1], [tx0 + tw - 1, ty0 + td - 1]]) { k.add({ type: 'oa_floodlight', x: x + 0.5, y: y + 0.5 }, x, y); OUT.lamps.push({ x: x + 0.5, y: y + 0.5 }); }
      k.sign(tx0 + 1, ty0 + td + 0.6, '🏃 육상 트랙 · 축구장', '#c9573f');
      // 📣 관중석 · 더그아웃 · 전광판 (트랙 북쪽, 트랙을 본다)
      const bx0 = tx0 + 7, bw = tw - 14, by0 = F + 3;
      k.add({ type: 'oa_bleachers', x: bx0, y: by0, w: bw, tiers: 3, color: '#4e7cf6', seed: 3 }, bx0, by0, bw, 3);
      for (let s = 0.5; s < bw; s += 1.6) T.rest({ x: bx0 + s, y: by0 + 2.55, face: '+y', pose: 'sit', approach: [Math.floor(bx0 + s), by0 + 3], carry: null }, '관중석');
      k.K.add({ type: 'flag', x: bx0 + 0.6, y: by0 - 0.2, color: '#e5534b' }); k.K.add({ type: 'flag', x: bx0 + bw - 0.6, y: by0 - 0.2, color: '#4e7cf6' });
      k.add({ type: 'oa_dugout', x: tx0 + 2, y: F + 4, w: 4, color: '#e5534b', text: '🏃 홈 팀' }, tx0 + 2, F + 4, 4, 1);
      for (let q = 0; q < 3; q++) T.rest({ x: tx0 + 2.7 + q * 1.2, y: F + 4.45, face: '+y', pose: 'sit', approach: [tx0 + 2 + q, F + 5], carry: null }, '더그아웃');
      k.add({ type: 'oa_scoreboard', x: bx0 + bw + 0.5, y: F + 3, w: 4 }, bx0 + bw, F + 3); k.solid(bx0 + bw + 3, F + 3, 1, 1);
      k.npc('응원단장', { x: bx0 + bw / 2, y: by0 + 3.6, face: '-y' }, { hat: 'headphones', accent: '#e5534b', say: '📣 AI 팀 파이팅!' });
      k.npc('코치', { x: tx0 + 4, y: F + 5.5, face: '+y' }, { hat: 'cap', accent: '#3f8a45', say: '📣 한 바퀴 더!', patrol: [{ x: tx0 + 4, y: F + 5.5, face: '+y' }, { x: tx0 + tw - 3, y: F + 6.3, face: '+y' }] });
      k.sign(bx0, by0 - 0.6, '📣 관중석', '#4e7cf6');
      // 🏀 농구장 · 🌭 매점 (건물 오른쪽)
      const cx0 = R0 + 3;
      if (cx0 + 15 < W - 1) {
        k.G.decals.push({ type: 'court', x: cx0, y: 1, w: 14, d: 8, kind: 'basket' }); k.mark(cx0, 1, 14, 8, 1);
        k.K.add({ type: 'hoop', x: cx0 + 0.6, y: 5, side: -1 }); k.K.add({ type: 'hoop', x: cx0 + 13.4, y: 5, side: 1 });
        for (const [x, y, f] of [[cx0 + 4, 3.5, '+x'], [cx0 + 5, 6.5, '+x'], [cx0 + 10, 4, '-x'], [cx0 + 9, 6.6, '-x']]) T.play(x, y, f, { ball: true });
        T.bench(cx0 + 2, 10, 3, '-y', '농구장 관람'); T.bench(cx0 + 8, 10, 3, '-y', '농구장 관람');
        k.sign(cx0, 0.6, '🏀 농구장', '#c97b3f');
      }
      const sbx = cx0 + 17;
      if (sbx + 4 < W - 1) {
        k.add({ type: 'oa_snackBar', x: sbx, y: 1, w: 3 }, sbx, 1, 3, 2);
        k.npc('매점 직원', { x: sbx + 3.6, y: 2, face: '-x' }, { anim: 'type', hat: 'cap', accent: '#f2c230', say: '🌭 핫도그 나왔어요!' });
        for (let i = 0; i < 4; i++) { const x = sbx + i * 4; if (x + 2 > W - 2) break; T.table(x + 1, 6, COLS[i % 7], '매점 테이블'); if (F > 15) T.table(x + 1, 10, COLS[(i + 4) % 7], '매점 테이블'); }
        T.wander(sbx + 1.5, 3.8, { food: 'coffee' });
        k.sign(sbx, 4.4, '🌭 매점', '#e9a23b');
      }
      // 🌳 잔디밭 (트랙 아래 · 양옆) + 가족
      const ly0 = ty0 + td + 2;
      let mi = 0; for (let x = 3; x + 3 < W - 2; x += 7) if (ly0 + 3 < H - 1 && mi < 5 && T.mat(x, ly0 + 1, COLS[(mi++) % 7])) T.wander(x + 1.5, ly0 + 4);
      for (let x = 4; x + 3 < W - 2; x += 14) T.bench(x, ty0 + td + 0.5 | 0, 3, '-y', '트랙 옆 벤치');
      T.scatter(1, ly0, W - 1, H - 1, Math.round(W * (H - ly0) / 45), (x, y) => k.tree(x, y, 1.1, T.r() < 0.5 ? 'oak' : 'maple'), 1);
      T.scatter(1, ty0, tx0 - 1, ty0 + td, 4, (x, y) => k.tree(x, y, 1.05, 'oak'), 1);
      T.scatter(tx0 + tw + 1, ty0, W - 1, ty0 + td, 4, (x, y) => k.tree(x, y, 1.05, 'oak'), 1);
      T.scatter(0, 1, TX - 1, F, 3, (x, y) => k.tree(x, y, 1, 'oak'), 0);
      T.scatter(R0 + 2, 12, W - 1, F, 3, (x, y) => k.tree(x, y, 1, 'oak'), 1);
      for (let x = 3; x < W - 2; x += 12) T.lamp(x, F + 2);
      S.pets = [{ kind: 'dog', color: '#d9a066', near: [tx0 - 2, ty0 + 4] }];
      k.sign(1.2, F + 0.6, '🏟️ AI 스타디움', '#4e7cf6');
      S.door = { lv: OUT.idx, x: 0.5, y: F + 1.5, face: '+x' };
      T.done();
    },
  });

  // ================================================================ ❄️ 설원 마을
  C.outdoor({
    id: 'snow', icon: '❄️', name: '설원 마을', desc: '눈 덮인 마을 · 눈사람 · 이글루와 펭귄 · 눈 덮인 침엽수 · 스케이트장 · 썰매 언덕 · 장작 난로 · 핫초코 · 산장',
    size: (B) => ({ W: B.W + 46, H: B.H + 38 }),
    lot(S, OUT, B, k) {
      const TX = 4, TY = 4;
      OUT.ground.base = { color: '#eef3f8', tufts: null, edge: '#c5d0da', edge2: '#b3bfca' };
      k.place(B, TX, TY);
      const T = tools(S, OUT, B, k, 'snow'), W = k.W, H = k.H, F = k.front, R0 = k.right, DX = TX + B.doorX, dX = Math.floor(DX);
      k.area(0, 0, W, H, 'oa_snow', '#eef3f8');
      k.area(TX - 1, F, B.W + 2, 2, 'oa_pavers', '#dfe5ec', 1);
      const pc = { color: '#dde5ee', edge: '#c4d0dc' };
      T.path([[0, F + 2.6], [W - 2, F + 2.6]], 1.8, pc);
      // ⛸️ 스케이트장 (얼음 + 보드 펜스 + 스케이터)
      const rw = 14, rd = 8, rx0 = Math.min(W - rw - 8, dX + 5), ry0 = F + 7, gate = rx0 + 2;
      k.area(rx0, ry0, rw, rd, 'oa_ice', '#cfe6f5', 1);
      for (let x = rx0; x < rx0 + rw; x++) { if (x !== gate && x !== gate + 1) { k.K.add({ type: 'oa_rinkBoard', axis: 'x', x, y: ry0 }); k.solid(x, ry0, 1, 1); } k.K.add({ type: 'oa_rinkBoard', axis: 'x', x, y: ry0 + rd }); k.solid(x, ry0 + rd - 1, 1, 1); }
      for (let y = ry0; y < ry0 + rd; y++) { k.K.add({ type: 'oa_rinkBoard', axis: 'y', x: rx0, y }); k.solid(rx0, y, 1, 1); k.K.add({ type: 'oa_rinkBoard', axis: 'y', x: rx0 + rw, y }); k.solid(rx0 + rw - 1, y, 1, 1); }
      const scx = rx0 + rw / 2, scy = ry0 + rd / 2;
      [[0, 0.24, 1, 11], [1.6, 0.2, 1, 23], [3.3, 0.26, -1, 37], [4.6, 0.18, 1, 51]].forEach(([ph, sp, dir, seed], i) => k.K.add({ type: 'oa_skater', x: scx, y: scy, cx: scx, cy: scy, rx: rw / 2 - 2.4 - (i % 2) * 0.8, ry: rd / 2 - 1.7 - (i % 2) * 0.4, phase: ph, speed: sp, dir, seed, accent: COLS[i] }));
      T.bench(rx0 + 5, ry0 - 2, 3, '+y', '스케이트장 관람'); T.bench(rx0 + 9, ry0 - 2, 3, '+y', '스케이트장 관람');
      k.npc('스케이트 강사', { x: gate + 1, y: ry0 - 0.5, face: '+y' }, { hat: 'beanie', accent: '#3b7fd0', say: '⛸️ 무릎을 살짝 굽혀요!' });
      k.sign(rx0, ry0 + rd + 0.6, '⛸️ 눈꽃 스케이트장', '#3b7fd0');
      // 🔥 장작 난로 (통나무 의자 4면)
      const stx = Math.max(4, Math.min(dX - 9, rx0 - 8)), sty = F + 10;
      k.add({ type: 'oa_stove', x: stx, y: sty }, stx, sty, 2, 1); OUT.lamps.push({ x: stx + 0.5, y: sty + 0.5 });
      k.add({ type: 'oa_log', x: stx - 1, y: sty - 2, w: 3, axis: 'x' }, stx - 1, sty - 2, 3, 1);
      k.add({ type: 'oa_log', x: stx - 1, y: sty + 2, w: 3, axis: 'x' }, stx - 1, sty + 2, 3, 1);
      k.add({ type: 'oa_log', x: stx - 2, y: sty - 1, w: 3, axis: 'y' }, stx - 2, sty - 1, 1, 3);
      k.add({ type: 'oa_log', x: stx + 2, y: sty - 1, w: 3, axis: 'y' }, stx + 2, sty - 1, 1, 3);
      for (let q = 0; q < 3; q++) {
        T.rest({ x: stx - 0.5 + q, y: sty - 1.5, face: '+y', pose: 'sit', approach: [stx - 1 + q, sty - 3], carry: 'mug' }, '장작 난로');
        T.rest({ x: stx - 0.5 + q, y: sty + 2.5, face: '-y', pose: 'sit', approach: [stx - 1 + q, sty + 3], carry: 'mug' }, '장작 난로');
        T.rest({ x: stx - 1.5, y: sty - 0.5 + q, face: '+x', pose: 'sit', approach: [stx - 3, sty - 1 + q], carry: 'mug' }, '장작 난로');
        T.rest({ x: stx + 2.5, y: sty - 0.5 + q, face: '-x', pose: 'sit', approach: [stx + 3, sty - 1 + q], carry: 'mug' }, '장작 난로');
      }
      T.lantern(stx - 3, sty - 3); T.lantern(stx + 3, sty + 3);
      k.sign(stx - 2, sty + 3.9, '🔥 장작 난로', '#c47f22');
      // ☕ 핫초코 노점
      const hx = stx - 1, hy = sty + 6;
      if (k.free(hx, hy, 3, 3)) {
        k.add({ type: 'oa_stall', x: hx, y: hy, w: 3, color: '#a0643a', text: '☕ 핫초코 · 붕어빵', bulb: true }, hx, hy + 1, 3, 1);
        for (let i = 0; i < 3; i++) { k.K.add({ type: 'stool', x: hx + 0.5 + i, y: hy + 2.55, color: '#e5534b' }); T.rest({ x: hx + 0.5 + i, y: hy + 2.55, face: '-y', pose: 'sit', carry: 'mug' }, '핫초코 노점'); }
        k.npc('핫초코 아저씨', { x: hx + 1.5, y: hy + 0.5, face: '+y' }, { anim: 'type', hat: 'beanie', accent: '#a0643a', say: '☕ 따끈한 핫초코 한 잔!' });
      }
      // 🛷 썰매 언덕 (오른쪽 뒤) · 🐧 이글루 마을 · 🏠 산장
      const shx = W - 8;
      k.add({ type: 'oa_sledHill', x: shx, y: 1, w: 5, d: 9, seed: 3 }, shx, 0, 5, 10);
      for (const [x, f] of [[shx + 1.5, '+y'], [shx + 3.6, '-x']]) T.play(x, 11.6, f);
      k.npc('썰매장 안내', { x: shx - 1, y: 10.5, face: '+y' }, { hat: 'beanie', accent: '#e5534b', say: '🛷 한 줄로 서 주세요~' });
      k.sign(shx - 1.5, 11.6, '🛷 썰매 언덕', '#e5534b');
      const ix = R0 + 3;
      for (const [x, y] of [[ix, 2], [ix + 5, 6]]) if (k.free(x, y, 3, 4)) k.add({ type: 'oa_igloo', x, y }, x, y, 3, 3);
      k.K.add({ type: 'oa_penguins', x: ix + 3.5, y: 11, n: 5, seed: 2 }); k.solid(ix + 2, 10, 3, 2);
      k.sign(ix, 10.6, '🐧 펭귄 마을', '#3b7fd0');
      const cbx = ix + 10;
      if (cbx + 5 < shx - 2 && k.free(cbx, 2, 5, 4)) {
        k.add({ type: 'oa_cabin', x: cbx, y: 2, w: 5, d: 3, snow: true, label: '🏠 눈꽃 산장', roof: '#7a3b32' }, cbx, 2, 5, 3);
        T.table(cbx + 1, 7, '#e5534b', '산장 앞 테라스'); T.table(cbx + 4, 7, '#4e7cf6', '산장 앞 테라스');
      }
      if (k.free(W - 12, H - 7, 5, 4)) { k.add({ type: 'oa_cabin', x: W - 12, y: H - 7, w: 5, d: 3, snow: true, label: '☕ 산장 카페', roof: '#3b5a7a' }, W - 12, H - 7, 5, 3); T.bench(W - 12, H - 3, 3, '+y', '산장 카페 벤치'); }
      // ⛄ 눈사람 · 가족
      const scarf = ['#e5534b', '#4e7cf6', '#3fb27f', '#f2c230', '#a67be0'];
      let sn = 0; const snowman = (x, y) => { k.add({ type: 'oa_snowman', x: x + 0.5, y: y + 0.5, scarf: scarf[sn % 5], hat: sn % 2 ? 'bucket' : 'top', size: 0.9 + (sn % 3) * 0.1 }, x, y); T.play(x + 1.5, y + 0.8, '-x'); sn++; };
      for (const [x, y] of [[ix + 9, 9], [rx0 + rw + 3, ry0 + 2], [3, H - 6], [Math.round(DX) + 2, H - 8]]) if (k.free(x - 1, y - 1, 3, 3)) snowman(x, y);
      let mi = 0; for (let x = 3; x + 3 < Math.min(W - 14, rx0 + rw + 6); x += 6) if (mi < 4 && T.mat(x, H - 5, ['#e5534b', '#3b7fd0', '#3fb27f', '#a67be0'][mi % 4])) { T.wander(x + 1.5, H - 2.4); mi++; }
      // 🌲 눈 덮인 숲 · 눈 내림
      T.border(2, (x, y) => (T.r() < 0.55 ? T.fir(x, y, 0.95 + T.r() * 0.4, true) : null));
      T.scatter(0, 0, W, H, Math.round(W * H / 55), (x, y) => T.fir(x, y, 0.85 + T.r() * 0.45, true), 1);
      for (let x = 0; x < W; x += 12) for (let y = 0; y < H; y += 12) k.K.add({ type: 'oa_snowfall', x, y, w: 12, d: 12, seed: x * 7 + y });
      S.pets = [{ kind: 'dog', color: '#c9d1d9' }, { kind: 'dog', color: '#8a8f96' }, { kind: 'cat', color: '#f4ead8' }];
      k.sign(1.2, F + 1.4, '❄️ AI 설원 마을', '#3b7fd0');
      S.door = { lv: OUT.idx, x: 0.5, y: F + 2.5, face: '+x' };
      T.done();
    },
  });
})();
