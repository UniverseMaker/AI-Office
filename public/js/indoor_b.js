// (v3) 실내 B팀: 새 건물 10종
//   🏯 한옥 오피스 · 🚀 우주 관제센터 · 🏦 은행 본점 · 🎨 아트센터 · 🏋️ 스포츠센터 ·
//   ☕ 카페&베이커리 · 🗼 초고층 타워 · 🛏️ 코리빙 하우스 · 📦 컨테이너 오피스 · 🎵 뮤직 레이블
// 새 소품 · 바닥 재질 · 데칼은 모두 ib_ 접두어. 그림 스타일은 art8.js 에 맞춘다 (위 밝게 · +y면 중간 · +x면 어둡게, 얇은 외곽선).
(function () {
  const C = AIO.compose;
  const { P, shade, rgba, poly, box, sbox, cylinder, ellipseFloor, onPlaneY, onPlaneX, roundRect } = AIO.iso;
  const FONT = AIO.art.FONT;
  const OL = 'rgba(0,0,0,0.14)';
  const PAL = ['#e5534b', '#4e7cf6', '#3fb27f', '#e9a23b', '#a67be0', '#e2667f', '#1f9fb4'];

  // ================================================================ 그리기 도우미
  const rect = (g, x, y, w, d, c, z = 0) => poly(g, [P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], c);
  const dot = (g, x, y, z, r, c) => { const [sx, sy] = P(x, y, z); g.fillStyle = c; g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill(); };
  const bx = (ctx, x, y, z, w, d, h, c, k = OL) => box(ctx, x, y, z, w, d, h, shade(c, 0.12), shade(c, -0.05), shade(c, -0.18), k);
  const legs = (ctx, x, y, w, d, h, c, s = 0.08, i = 0.08) => { for (const [lx, ly] of [[i, i], [w - i - s, i], [i, d - i - s], [w - i - s, d - i - s]]) box(ctx, x + lx, y + ly, 0, s, s, h, shade(c, 0.1), c, shade(c, -0.15)); };
  const shadowR = (ctx, x, y, w, d) => poly(ctx, [P(x + 0.06, y + 0.1), P(x + w + 0.14, y + 0.1), P(x + w + 0.14, y + d + 0.16), P(x + 0.06, y + d + 0.16)], 'rgba(60,40,20,0.12)');
  const glow = (ctx, sx, sy, r, c, a) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(sx, sy, 1, sx, sy, r); gg.addColorStop(0, rgba(c, a)); gg.addColorStop(1, rgba(c, 0)); ctx.fillStyle = gg; ctx.fillRect(sx - r, sy - r, r * 2, r * 2); ctx.restore(); };
  const isNight = (I) => !!(I && I.nightInfo && I.nightInfo.lamps);
  const line = (ctx, a, b, c, lw = 1) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  /** 바닥(타일 좌표)에 그대로 그리기: 1 = 1칸 */
  const tileSpace = (g, fn) => { g.save(); g.transform(32, 16, -32, 16, 0, 0); fn(g); g.restore(); };
  const prop = (type, draw, depth, extra) => C.prop(type, { draw, ...(depth ? { depth } : {}), ...(extra || {}) });
  const mid = (f) => f.x + (f.w || 1) / 2 + f.y + (f.d || 1) / 2;
  const WEST = () => -5000;                       // 서쪽 바깥벽(x=0)에 붙인 것: 늘 맨 먼저 그린다
  const lowD = (k = 0.3) => (f) => f.x + f.y + k;  // 낮은 소품(사람이 걸터앉는 것): 사람보다 먼저

  /** 옹기 장독 (s: 크기) */
  function jar(ctx, x, y, z, s = 1, lid = true, hue = 0, col = null) {
    const [sx, sy] = P(x, y, z), rx = 12 * s, h = 22 * s;
    ctx.fillStyle = 'rgba(40,25,15,0.18)'; ctx.beginPath(); ctx.ellipse(sx, sy + 1, rx * 0.95, rx * 0.42, 0, 0, 7); ctx.fill();
    const gr = ctx.createLinearGradient(sx - rx, 0, sx + rx, 0);
    const base = col || (hue ? '#7a4a2e' : '#6e4027');
    gr.addColorStop(0, shade(base, -0.35)); gr.addColorStop(0.32, shade(base, 0.22)); gr.addColorStop(0.55, base); gr.addColorStop(1, shade(base, -0.45));
    ctx.beginPath();
    ctx.moveTo(sx - rx * 0.6, sy);
    ctx.bezierCurveTo(sx - rx * 1.2, sy - h * 0.3, sx - rx * 1.15, sy - h * 0.85, sx - rx * 0.62, sy - h);
    ctx.lineTo(sx + rx * 0.62, sy - h);
    ctx.bezierCurveTo(sx + rx * 1.15, sy - h * 0.85, sx + rx * 1.2, sy - h * 0.3, sx + rx * 0.6, sy);
    ctx.ellipse(sx, sy, rx * 0.6, rx * 0.27, 0, 0, Math.PI);
    ctx.closePath(); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = 'rgba(30,15,8,0.45)'; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(245,215,175,0.35)'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let k = -4; k <= 4; k++) { const px = sx + k * rx * 0.2, py = sy - h * 0.62 + Math.sin(k * 1.6) * 1.4; k === -4 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke();
    ctx.fillStyle = 'rgba(255,235,205,0.28)'; ctx.beginPath(); ctx.ellipse(sx - rx * 0.48, sy - h * 0.55, rx * 0.12, h * 0.24, 0, 0, 7); ctx.fill();
    ctx.fillStyle = shade(base, -0.4); ctx.beginPath(); ctx.ellipse(sx, sy - h, rx * 0.62, rx * 0.26, 0, 0, 7); ctx.fill();
    if (lid) {
      ctx.fillStyle = '#5e3621'; ctx.beginPath(); ctx.ellipse(sx, sy - h - 1.2, rx * 0.72, rx * 0.3, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7d4a2d'; ctx.beginPath(); ctx.ellipse(sx, sy - h - 2.8, rx * 0.5, rx * 0.2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#5e3621'; ctx.beginPath(); ctx.arc(sx, sy - h - 4, 1.5 * s + 0.4, 0, 7); ctx.fill();
    }
  }

  // ================================================================ 바닥 재질 (ib_)
  /** 우물마루: 굵은 귀틀 사이로 짧은 청판 */
  C.floorStyle('ib_maru', (g, x, y, w, d, base, r) => {
    const lt = shade(base, 0.07), dk = shade(base, -0.18);
    for (let i = 0; i < w; i += 2) for (let j = 0; j < d; j += 0.5) rect(g, x + i + 0.1, y + j + 0.03, Math.min(2, w - i) - 0.2, 0.44, (Math.round(i / 2) + Math.round(j * 2)) % 2 ? lt : base);
    for (let i = 0; i <= w; i += 2) rect(g, x + i - 0.06, y, 0.12, d, dk);
    for (let k = 0; k < w * d * 1.5; k++) { const px = x + r() * w, py = y + r() * d; line(g, P(px, py), P(px + 0.35, py), 'rgba(90,55,30,0.13)', 0.6); }
  });
  /** 마당 흙 · 자갈 */
  C.floorStyle('ib_madang', (g, x, y, w, d, base, r) => { for (let i = 0; i < w * d * 5; i++) dot(g, x + r() * w, y + r() * d, 0, 0.5 + r() * 1.1, r() < 0.5 ? shade(base, -0.13) : shade(base, 0.14)); });
  /** 테라조: 알록달록 돌 조각 + 줄눈 */
  C.floorStyle('ib_terrazzo', (g, x, y, w, d, base, r) => {
    const chips = ['#e5a0a0', '#9fbfe0', '#e8c97a', '#a8d0b0', '#8a8f96', '#ffffff'];
    for (let i = 0; i < w * d * 9; i++) dot(g, x + r() * w, y + r() * d, 0, 0.5 + r() * 0.9, chips[Math.floor(r() * chips.length)]);
    for (let i = 0; i <= w; i += 3) line(g, P(x + i, y), P(x + i, y + d), 'rgba(0,0,0,0.07)', 0.7);
    for (let j = 0; j <= d; j += 3) line(g, P(x, y + j), P(x + w, y + j), 'rgba(0,0,0,0.07)', 0.7);
  });
  /** 고무 매트 바닥 (체육관) */
  C.floorStyle('ib_rubber', (g, x, y, w, d, base, r) => {
    for (let i = 0; i < w * d * 10; i++) dot(g, x + r() * w, y + r() * d, 0, 0.5, r() < 0.5 ? shade(base, 0.18) : shade(base, -0.15));
    for (let i = 0; i <= w; i += 1) line(g, P(x + i, y), P(x + i, y + d), 'rgba(0,0,0,0.12)', 0.6);
    for (let j = 0; j <= d; j += 1) line(g, P(x, y + j), P(x + w, y + j), 'rgba(0,0,0,0.12)', 0.6);
  });
  /** 체커보드 타일 (카페) */
  C.floorStyle('ib_checker', (g, x, y, w, d, base) => { const dk = shade(base, -0.2); for (let i = 0; i < w; i += 0.5) for (let j = 0; j < d; j += 0.5) if ((Math.round(i * 2) + Math.round(j * 2)) % 2) rect(g, x + i, y + j, Math.min(0.5, x + w - (x + i)), Math.min(0.5, d - j), dk); });
  /** 줄무늬 철판 (컨테이너 · 메이커스페이스) */
  C.floorStyle('ib_steel', (g, x, y, w, d, base, r) => {
    for (let i = 0.15; i < w; i += 0.34) for (let j = 0.15; j < d; j += 0.34) { const a = P(x + i, y + j), b = P(x + i + 0.12, y + j + ((Math.round(i * 3) + Math.round(j * 3)) % 2 ? 0.08 : -0.08)); line(g, a, b, shade(base, 0.2), 1.2); }
    for (let i = 0; i <= w; i += 2) line(g, P(x + i, y), P(x + i, y + d), 'rgba(0,0,0,0.18)', 0.8);
    void r;
  });
  /** 유리 바닥 (전망대 스카이워크): 아래로 도시 불빛 */
  C.floorStyle('ib_glass', (g, x, y, w, d, base, r) => {
    for (let i = 0; i < w * d * 4; i++) dot(g, x + r() * w, y + r() * d, 0, 0.6 + r() * 0.6, r() < 0.7 ? 'rgba(255,214,120,0.75)' : 'rgba(150,210,255,0.7)');
    for (let i = 0; i <= w; i += 1) line(g, P(x + i, y), P(x + i, y + d), 'rgba(200,230,255,0.25)', 0.7);
    for (let j = 0; j <= d; j += 1) line(g, P(x, y + j), P(x + w, y + j), 'rgba(200,230,255,0.25)', 0.7);
    for (let k = 0; k < w + d; k += 3) poly(g, [P(x + k, y), P(x + k + 0.6, y), P(x + Math.max(0, k + 0.6 - d), y + Math.min(d, k + 0.6)), P(x + Math.max(0, k - d), y + Math.min(d, k))], 'rgba(255,255,255,0.05)');
  });
  /** 물감 튄 콘크리트 (작업실) */
  C.floorStyle('ib_splat', (g, x, y, w, d, base, r) => {
    for (let i = 0; i < w * d * 6; i++) dot(g, x + r() * w, y + r() * d, 0, 0.7, r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)');
    for (let i = 0; i < w * d * 0.8; i++) { const c = PAL[Math.floor(r() * PAL.length)], px = x + r() * w, py = y + r() * d; dot(g, px, py, 0, 1.5 + r() * 2.5, rgba(c, 0.6)); for (let k = 0; k < 4; k++) dot(g, px + (r() - 0.5) * 0.5, py + (r() - 0.5) * 0.5, 0, 0.6 + r(), rgba(c, 0.55)); }
  });
  /** 헤링본 마루 (VIP 라운지) */
  C.floorStyle('ib_parquet', (g, x, y, w, d, base, r) => {
    for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) for (let k = 0; k < 4; k++) {
      const c = shade(base, (r() - 0.5) * 0.16);
      if ((i + j) % 2) rect(g, x + i + k * 0.25 + 0.01, y + j + 0.01, 0.23, 0.98, c); else rect(g, x + i + 0.01, y + j + k * 0.25 + 0.01, 0.98, 0.23, c);
    }
  });

  // ================================================================ 바닥 데칼 (ib_)
  /** 옥상 러닝트랙: 둥근 트랙 + 레인 + 잔디 */
  C.decal('ib_track', (g, d) => tileSpace(g, (q) => {
    const R = d.d / 2;
    q.fillStyle = '#c4573d'; roundRect(q, d.x, d.y, d.w, d.d, R); q.fill();
    q.strokeStyle = 'rgba(255,255,255,0.85)'; q.lineWidth = 0.05;
    for (let k = 0; k <= 4; k++) { const o = 0.15 + k * 0.42; roundRect(q, d.x + o, d.y + o, d.w - o * 2, d.d - o * 2, R - o); q.stroke(); }
    const o = 0.15 + 4 * 0.42 + 0.1;
    q.fillStyle = '#8cc46c'; roundRect(q, d.x + o, d.y + o, d.w - o * 2, d.d - o * 2, R - o); q.fill();
    q.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = d.x + o + 0.5; i < d.x + d.w - o - 0.5; i += 1.2) q.fillRect(i, d.y + o + 0.1, 0.6, d.d - o * 2 - 0.2);
    q.fillStyle = '#ffffff'; q.fillRect(d.x + d.w / 2 - 0.05, d.y + d.d - o + 0.05, 0.1, o - 0.2);
    q.fillStyle = '#ffffff'; q.font = `bold 0.7px ${FONT}`; q.fillText('START', d.x + d.w / 2 + 0.2, d.y + d.d - 0.55);
  }));
  /** 헬리패드: 원 + 노란 테두리 + H */
  C.decal('ib_helipad', (g, d) => tileSpace(g, (q) => {
    const cx = d.x + d.w / 2, cy = d.y + d.d / 2, R = Math.min(d.w, d.d) / 2;
    q.fillStyle = '#4f555b'; q.beginPath(); q.arc(cx, cy, R, 0, 7); q.fill();
    q.strokeStyle = '#f2c230'; q.lineWidth = 0.22; q.beginPath(); q.arc(cx, cy, R - 0.35, 0, 7); q.stroke();
    q.strokeStyle = '#ffffff'; q.lineWidth = 0.08; q.beginPath(); q.arc(cx, cy, R * 0.62, 0, 7); q.stroke();
    q.fillStyle = '#ffffff'; const s = R * 0.42; q.fillRect(cx - s, cy - s, s * 0.32, s * 2); q.fillRect(cx + s * 0.68, cy - s, s * 0.32, s * 2); q.fillRect(cx - s, cy - s * 0.16, s * 2, s * 0.32);
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; q.fillStyle = k % 2 ? '#7cf09a' : '#ffffff'; q.beginPath(); q.arc(cx + Math.cos(a) * (R - 0.08), cy + Math.sin(a) * (R - 0.08), 0.09, 0, 7); q.fill(); }
  }));
  /** 수영장 레인 번호 · 바닥 화살표 같은 단색 원 */
  C.decal('ib_circle', (g, d) => tileSpace(g, (q) => { q.fillStyle = d.color || 'rgba(255,255,255,0.3)'; q.beginPath(); q.arc(d.x, d.y, d.r || 1, 0, 7); q.fill(); if (d.ring) { q.strokeStyle = d.ring; q.lineWidth = 0.08; q.stroke(); } }));

  // ================================================================ 소품 — 🏯 한옥
  /** 좌식 찻상 / 서안 (kind: 'tea' 다기 · 'brush' 붓·벼루·한지 · 'melon' 수박) */
  prop('ib_lowTable', (ctx, f) => {
    const { x, y } = f, w = f.w || 2, d = f.d || 1;
    shadowR(ctx, x, y, w, d);
    for (const [lx, ly] of [[0.12, 0.12], [w - 0.24, 0.12], [0.12, d - 0.24], [w - 0.24, d - 0.24]]) box(ctx, x + lx, y + ly, 0, 0.12, 0.12, 7, '#7a4a2a', '#6b4226', '#5a3720');
    box(ctx, x + 0.04, y + 0.04, 7, w - 0.08, d - 0.08, 3, '#c48d57', '#a8743f', '#925f30', OL);
    poly(ctx, [P(x + 0.12, y + 0.12, 10.02), P(x + w - 0.12, y + 0.12, 10.02), P(x + w - 0.12, y + d - 0.12, 10.02), P(x + 0.12, y + d - 0.12, 10.02)], null, 'rgba(90,50,20,0.25)');
    if (f.kind === 'tea') {
      const cx = x + w / 2, cy = y + d / 2;
      ellipseFloor(ctx, cx, cy, 0.42, 0.3, 10.1, '#8a5a34');
      cylinder(ctx, cx, cy, 10, 0.12, 6, '#f5f1e6', '#ddd5c3', OL);
      cylinder(ctx, cx, cy, 16, 0.06, 2, '#e9e1cf', '#d6ccb6');
      const [a, b] = P(cx + 0.12, cy, 13); ctx.strokeStyle = '#d6ccb6'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + 5, b - 3); ctx.stroke();
      for (const [dx, dy] of [[-0.55, -0.15], [0.55, -0.15], [-0.55, 0.2], [0.55, 0.2]]) if (Math.abs(dx) < w / 2 - 0.1) cylinder(ctx, cx + dx, cy + dy, 10, 0.06, 3, '#cfe3d4', '#a9c9b4');
    } else if (f.kind === 'brush') {
      for (let i = 0.3; i < w - 0.5; i += 1) {
        poly(ctx, [P(x + i, y + 0.2, 10.05), P(x + i + 0.6, y + 0.2, 10.05), P(x + i + 0.6, y + d - 0.2, 10.05), P(x + i, y + d - 0.2, 10.05)], '#fbf7ee', 'rgba(0,0,0,0.12)');
        const [sx, sy] = P(x + i + 0.3, y + d / 2, 10.1); ctx.strokeStyle = '#2b2622'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(sx - 4, sy - 1); ctx.quadraticCurveTo(sx, sy - 4, sx + 4, sy + 1); ctx.moveTo(sx - 1, sy - 4); ctx.lineTo(sx + 1, sy + 3); ctx.stroke();
      }
      box(ctx, x + w - 0.42, y + 0.25, 10, 0.3, 0.45, 2, '#3b3632', '#2b2622', '#221e1b');
      const [px, py] = P(x + w - 0.3, y + d - 0.2, 11); ctx.strokeStyle = '#8a6247'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(px - 6, py); ctx.lineTo(px + 4, py - 2); ctx.stroke(); ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.arc(px - 6, py, 1.4, 0, 7); ctx.fill();
    } else if (f.kind === 'melon') {
      const [sx, sy] = P(x + w / 2, y + d / 2, 10.5);
      ctx.fillStyle = '#e9e1cf'; ctx.beginPath(); ctx.ellipse(sx, sy, 11, 5.5, 0, 0, 7); ctx.fill();
      for (let k = -1; k <= 1; k++) { ctx.fillStyle = '#3f8a45'; ctx.beginPath(); ctx.moveTo(sx + k * 6 - 4, sy); ctx.lineTo(sx + k * 6 + 4, sy); ctx.lineTo(sx + k * 6, sy - 6); ctx.fill(); ctx.fillStyle = '#ef5b5b'; ctx.beginPath(); ctx.moveTo(sx + k * 6 - 3, sy - 0.8); ctx.lineTo(sx + k * 6 + 3, sy - 0.8); ctx.lineTo(sx + k * 6, sy - 5.4); ctx.fill(); }
    }
  }, (f) => mid(f) - 0.3);
  /** 방석 */
  prop('ib_cushion', (ctx, f) => {
    const c = f.color || '#c94f4f';
    box(ctx, f.x - 0.3, f.y - 0.3, 0, 0.6, 0.6, 5, shade(c, 0.12), shade(c, -0.08), shade(c, -0.2), OL);
    poly(ctx, [P(f.x - 0.2, f.y - 0.2, 5.02), P(f.x + 0.2, f.y - 0.2, 5.02), P(f.x + 0.2, f.y + 0.2, 5.02), P(f.x - 0.2, f.y + 0.2, 5.02)], null, shade(c, 0.4), 0.8);
    dot(ctx, f.x, f.y, 5.2, 1.4, '#f6d58a');
  }, (f) => f.x + f.y - 0.25);
  /** 병풍 (지그재그 패널 · 산수 · 매화) */
  prop('ib_folding', (ctx, f) => {
    const { x, y, w } = f, n = Math.max(2, Math.round(w / 0.6)), pw = w / n, h = 40;
    for (let i = 0; i < n; i++) {
      const x0 = x + i * pw, x1 = x0 + pw, y0 = y + (i % 2 ? 0.16 : 0), y1 = y + ((i + 1) % 2 ? 0.16 : 0);
      const pt = (u, v) => P(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, 2 + v * h);
      sbox(ctx, x0 + 0.02, y0 - 0.02, 0, 0.06, 0.06, 3, '#5a3720');
      poly(ctx, [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)], i % 2 ? '#f3ead6' : '#f7f0de', '#5a3720', 1.4);
      poly(ctx, [pt(0.06, 0.86), pt(0.94, 0.86), pt(0.94, 0.96), pt(0.06, 0.96)], '#3e5c7a');
      poly(ctx, [pt(0.06, 0.04), pt(0.94, 0.04), pt(0.94, 0.12), pt(0.06, 0.12)], '#3e5c7a');
      if ((f.seed || 0) % 2 === 0 && i % 3 !== 2) {
        poly(ctx, [pt(0.1, 0.2), pt(0.45, 0.62), pt(0.8, 0.2)], 'rgba(90,100,110,0.45)'); poly(ctx, [pt(0.4, 0.2), pt(0.75, 0.48), pt(0.95, 0.2)], 'rgba(90,100,110,0.3)');
        if (i === 0) { const [sx, sy] = pt(0.7, 0.72); ctx.fillStyle = '#e5534b'; ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, 7); ctx.fill(); }
      } else {
        const a = pt(0.15, 0.2), b = pt(0.55, 0.55), c = pt(0.8, 0.75); ctx.strokeStyle = '#3b2a20'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(b[0] - 3, b[1], c[0], c[1]); ctx.stroke();
        for (let k = 0; k < 5; k++) { const [px, py] = pt(0.2 + k * 0.14, 0.28 + k * 0.1); ctx.fillStyle = k % 2 ? '#f2a7c3' : '#e2667f'; ctx.beginPath(); ctx.arc(px + 2, py - 2, 1.6, 0, 7); ctx.fill(); }
      }
    }
  }, (f) => f.x + f.w / 2 + f.y + 0.4, { slice: 0.3 });
  /** 장독 하나 */
  prop('ib_jar', (ctx, f) => jar(ctx, f.x, f.y, f.z || 0, f.s || 1, f.lid !== false, f.hue), (f) => f.x + f.y);
  /** 장독대: 돌 기단 위에 장독 여러 개 */
  prop('ib_jarStand', (ctx, f) => {
    const { x, y, w, d } = f, r = AIO.rand(f.seed || 7);
    box(ctx, x, y, 0, w, d, 7, '#cfc8bc', '#b9b2a6', '#a9a296', OL);
    onPlaneY(ctx, x, y + d, 7, (g) => { g.strokeStyle = 'rgba(80,70,60,0.35)'; g.lineWidth = 0.8; for (let i = 0; i < w * 32; i += 14) { g.strokeRect(i + ((i / 14) % 2) * 4, 0.5, 13, 3); g.strokeRect(i + 6, 3.5, 13, 3); } });
    for (let j = 0.5; j < d; j += 0.95) for (let i = 0.5 + ((Math.round(j) % 2) ? 0.3 : 0); i < w - 0.2; i += 0.9) jar(ctx, x + i, y + j, 7, 0.65 + r() * 0.5, r() < 0.85, r() < 0.4);
  }, (f) => mid(f) + 0.2);
  /** 족자 (벽에 거는 두루마리 글씨) — axis 'x': x=상수 벽(+x를 봄) · 'y': y=상수 벽 */
  prop('ib_scroll', (ctx, f) => {
    const draw = (g) => {
      g.fillStyle = '#5a3720'; g.fillRect(-1, 0, 22, 2.5);
      g.fillStyle = '#d8c39a'; g.fillRect(0, 2.5, 20, 40);
      g.fillStyle = '#fbf6ea'; g.fillRect(2.5, 5, 15, 34);
      g.fillStyle = '#2b2622'; g.font = `bold 8px ${FONT}`; g.textAlign = 'center';
      [...(f.text || '일취월장')].slice(0, 4).forEach((ch, i) => g.fillText(ch, 10, 13 + i * 8.2));
      g.fillStyle = '#c43d32'; g.fillRect(12.5, 34, 3.5, 3.5);
      g.fillStyle = '#5a3720'; g.fillRect(-1.5, 42, 23, 2.5); g.textAlign = 'left';
    };
    if (f.axis === 'x') onPlaneX(ctx, f.x + 0.04, f.y, f.z || 44, draw); else onPlaneY(ctx, f.x, f.y + 0.04, f.z || 44, draw);
  }, (f) => (f.west ? -5000 : f.x + f.y + 0.05));
  /** 평상: 다리 달린 낮은 나무 마루 (위에 소반) */
  prop('ib_pyeongsang', (ctx, f) => {
    const { x, y, w, d } = f;
    shadowR(ctx, x, y, w, d);
    legs(ctx, x, y, w, d, 7, '#6b4226', 0.12, 0.1);
    box(ctx, x, y, 7, w, d, 3, '#cf9f68', '#b38552', '#9a7044', OL);
    for (let j = 0.33; j < d; j += 0.33) line(ctx, P(x + 0.03, y + j, 10.02), P(x + w - 0.03, y + j, 10.02), 'rgba(110,70,35,0.3)', 0.8);
    if (f.tray) { const cx = x + w / 2 - 0.3, cy = y + 0.25; box(ctx, cx, cy, 10, 0.6, 0.5, 4, '#a8743f', '#925f30', '#7d5129'); const [sx, sy] = P(cx + 0.3, cy + 0.25, 14.5); for (let k = -1; k <= 1; k++) { ctx.fillStyle = '#3f8a45'; ctx.beginPath(); ctx.moveTo(sx + k * 5 - 3.5, sy); ctx.lineTo(sx + k * 5 + 3.5, sy); ctx.lineTo(sx + k * 5, sy - 5); ctx.fill(); ctx.fillStyle = '#ef5b5b'; ctx.beginPath(); ctx.moveTo(sx + k * 5 - 2.6, sy - 0.7); ctx.lineTo(sx + k * 5 + 2.6, sy - 0.7); ctx.lineTo(sx + k * 5, sy - 4.4); ctx.fill(); } }
  }, lowD(0.5));
  /** 한지 등 (나무 기둥 위 종이 초롱) */
  prop('ib_hanjiLamp', (ctx, f, t, I) => {
    const { x, y } = f, on = isNight(I);
    cylinder(ctx, x, y, 0, 0.16, 3, '#6b4226', '#5a3720');
    sbox(ctx, x - 0.035, y - 0.035, 3, 0.07, 0.07, 22, '#6b4226');
    box(ctx, x - 0.17, y - 0.17, 25, 0.34, 0.34, 16, on ? '#fff3c8' : '#f6eedb', on ? '#ffe39a' : '#ece2c9', on ? '#f6d27a' : '#ddd1b4', '#6b4226');
    onPlaneY(ctx, x - 0.17, y + 0.17, 41, (g) => { g.strokeStyle = 'rgba(107,66,38,0.6)'; g.lineWidth = 0.7; for (let i = 3; i < 11; i += 3.5) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 16); g.stroke(); } g.beginPath(); g.moveTo(0, 8); g.lineTo(11, 8); g.stroke(); });
    if (on) { const [sx, sy] = P(x, y, 33); glow(ctx, sx, sy, 34, '#ffd27a', 0.35); }
  }, (f) => f.x + f.y);

  // ================================================================ 소품 — 🚀 우주
  /** 로켓 (2×2 · 발사대 · scaffold 면 정비 타워) */
  prop('ib_rocket', (ctx, f, t) => {
    const { x, y } = f, s = f.s || 1, cx = x + 1, cy = y + 1, R = 0.42 * s;
    bx(ctx, x + 0.05, y + 0.05, 0, 1.9, 1.9, 5, '#9aa1a7');
    for (let k = 0; k < 6; k++) poly(ctx, [P(x + 0.1 + k * 0.3, y + 1.95, 2), P(x + 0.25 + k * 0.3, y + 1.95, 2), P(x + 0.25 + k * 0.3, y + 1.95, 4.5), P(x + 0.1 + k * 0.3, y + 1.95, 4.5)], k % 2 ? '#2b2b2b' : '#f2c230');
    const red = '#e5534b';
    if (f.scaffold) for (const [px, py] of [[x + 0.1, y + 0.1], [x + 1.78, y + 0.1], [x + 0.1, y + 1.78]]) sbox(ctx, px, py, 5, 0.1, 0.1, 100 * s, red);
    const stack = [[0.3, '#f4f6f8'], [0.05, '#2b2f33'], [0.28, '#f4f6f8'], [0.05, red], [0.1, '#f4f6f8']];
    let z = 5;
    for (const [k, c] of stack) { const h = k * 112 * s; cylinder(ctx, cx, cy, z, R, h, shade(c, 0.05), c, OL); z += h; }
    const [bx0, by0] = P(cx, cy, 5), rx = R * 64 / Math.SQRT2 * 0.98;
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx0 - rx * 0.55, by0 - (z - 5) + 4, 3, z - 14);
    const [nx, ny] = P(cx, cy, z);
    ctx.beginPath(); ctx.moveTo(nx - rx, ny); ctx.quadraticCurveTo(nx - rx * 0.9, ny - rx * 1.7, nx, ny - rx * 2.5); ctx.quadraticCurveTo(nx + rx * 0.9, ny - rx * 1.7, nx + rx, ny); ctx.ellipse(nx, ny, rx, rx / 2, 0, 0, Math.PI); ctx.closePath();
    ctx.fillStyle = red; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.fillStyle = '#3f68d0';
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(bx0 + sg * (rx - 2), by0 - 30 * s); ctx.lineTo(bx0 + sg * (rx + 10 * s), by0 - 4 * s); ctx.lineTo(bx0 + sg * (rx + 10 * s), by0 + 4 * s); ctx.lineTo(bx0 + sg * (rx - 1), by0 - 2); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#2f55b0'; ctx.fillRect(bx0 - 1.6, by0 - 26 * s, 3.2, 26 * s + rx / 2);
    const [wx, wy] = P(cx, cy + R, z - 18 * s); ctx.fillStyle = '#9fd8ff'; ctx.strokeStyle = '#c4cbd2'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(wx, wy, 3.4 * s, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2b2f33'; ctx.font = `bold ${Math.round(6 * s)}px ${FONT}`; ctx.textAlign = 'center'; ['A', 'I', '-', '1'].forEach((ch, i) => ctx.fillText(ch, wx, wy + 14 * s + i * 7 * s)); ctx.textAlign = 'left';
    if (f.scaffold) {
      sbox(ctx, x + 1.78, y + 1.78, 5, 0.1, 0.1, 100 * s, red);
      for (let k = 1; k <= 3; k++) { const zz = 5 + k * 26 * s; box(ctx, x + 1.45, y + 0.1, zz, 0.45, 1.8, 2, '#c9cfd4', '#b7bec4', '#a9b0b6', OL); line(ctx, P(x + 1.9, y + 0.1, zz + 9), P(x + 1.9, y + 1.9, zz + 9), red, 1.2); }
    }
    if (f.steam) { const [sx, sy] = P(cx, cy, 6); for (let k = 0; k < 3; k++) { const p = (t * 0.5 + k / 3) % 1; ctx.fillStyle = `rgba(235,235,235,${0.45 * (1 - p)})`; ctx.beginPath(); ctx.arc(sx + (k - 1) * 14 * p, sy - 4 + p * 4, 5 + p * 10, 0, 7); ctx.fill(); } }
  }, (f) => f.x + f.y + 2.1);
  /** 관제실 대형 스크린 (서쪽 바깥벽) — 세계지도 · 궤도 · 카운트다운 */
  prop('ib_mcWallX', (ctx, f, t) => {
    onPlaneX(ctx, 0.04, f.y0, 100, (g) => {
      const Wl = f.len * 32, Hh = 74;
      g.fillStyle = '#10151f'; roundRect(g, -3, -3, Wl + 6, Hh + 6, 3); g.fill();
      g.fillStyle = '#0b2140'; g.fillRect(0, 0, Wl * 0.62, Hh);
      g.fillStyle = 'rgba(80,170,120,0.55)';
      for (const [u, v, a, b] of [[0.1, 0.3, 0.09, 0.16], [0.2, 0.62, 0.05, 0.2], [0.42, 0.28, 0.06, 0.12], [0.45, 0.58, 0.06, 0.18], [0.62, 0.32, 0.14, 0.14], [0.78, 0.7, 0.05, 0.08]]) { g.beginPath(); g.ellipse(Wl * 0.62 * u, Hh * v, Wl * 0.62 * a, Hh * b, 0.3, 0, 7); g.fill(); }
      g.strokeStyle = 'rgba(95,208,255,0.25)'; g.lineWidth = 0.6; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(Wl * 0.62 * i / 8, 0); g.lineTo(Wl * 0.62 * i / 8, Hh); g.stroke(); } for (let j = 1; j < 4; j++) { g.beginPath(); g.moveTo(0, Hh * j / 4); g.lineTo(Wl * 0.62, Hh * j / 4); g.stroke(); }
      g.strokeStyle = '#f2c230'; g.lineWidth = 1.4; g.beginPath(); for (let i = 0; i <= 60; i++) { const u = i / 60 * Wl * 0.62, v = Hh / 2 + Math.sin(i / 60 * Math.PI * 2 * 1.5 + 0.6) * Hh * 0.3; i ? g.lineTo(u, v) : g.moveTo(u, v); } g.stroke();
      const p = (t * 0.05) % 1, su = p * Wl * 0.62, sv = Hh / 2 + Math.sin(p * Math.PI * 2 * 1.5 + 0.6) * Hh * 0.3;
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(su, sv, 2.4, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.arc(su, sv, 5 + Math.sin(t * 5) * 1.5, 0, 7); g.fill();
      const x2 = Wl * 0.62 + 4, w2 = Wl - x2;
      g.fillStyle = '#141a26'; g.fillRect(x2, 0, w2, Hh);
      g.fillStyle = '#7cc8ff'; g.font = `bold 7px ${FONT}`; g.fillText('🚀 MISSION CONTROL · 미션 관제', x2 + 4, 10);
      const sec = 3600 * 2 - Math.floor(t) % 7200, hh = String(Math.floor(sec / 3600)).padStart(2, '0'), mm = String(Math.floor(sec / 60) % 60).padStart(2, '0'), ss = String(sec % 60).padStart(2, '0');
      g.fillStyle = '#ff6b5b'; g.font = `bold 15px ${FONT}`; g.fillText(`T-${hh}:${mm}:${ss}`, x2 + 4, 30);
      for (let k = 0; k < 6; k++) { const v = 0.35 + 0.3 * Math.sin(t * (1 + k * 0.3) + k); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x2 + 4, 38 + k * 6, w2 - 8, 4); g.fillStyle = ['#4ef08a', '#5fd0ff', '#f2c230', '#4ef08a', '#a67be0', '#5fd0ff'][k]; g.fillRect(x2 + 4, 38 + k * 6, (w2 - 8) * v, 4); }
    });
  }, WEST);
  /** 관제 콘솔 한 칸 (y 방향으로 이어 붙임 · 화면은 +x 쪽 운영자를 본다) */
  prop('ib_mcDeskY', (ctx, f, t) => {
    const { x, y } = f;
    box(ctx, x, y, 0, 0.9, 1, 20, '#4a5368', '#3d4558', '#333a4b', OL);
    poly(ctx, [P(x + 0.35, y, 20), P(x + 0.9, y, 17), P(x + 0.9, y + 1, 17), P(x + 0.35, y + 1, 20)], '#2b3242', OL);
    for (let k = 0; k < 4; k++) { const [sx, sy] = P(x + 0.6 + (k % 2) * 0.18, y + 0.2 + k * 0.2, 19); ctx.fillStyle = Math.sin(t * 3 + k + y * 2) > 0.2 ? ['#4ef08a', '#f2c230', '#5fd0ff', '#ff6b5b'][k] : '#26313d'; ctx.fillRect(sx - 1.2, sy - 0.8, 2.4, 1.6); }
    box(ctx, x + 0.08, y + 0.08, 20, 0.12, 0.84, 18, '#1d222b', '#181c24', '#14171e');
    onPlaneX(ctx, x + 0.21, y + 0.9, 37, (g) => {
      g.fillStyle = '#0d1a2b'; g.fillRect(0, 0, 24, 15);
      const k = (f.y * 3 + f.x) % 3;
      if (k === 0) { g.strokeStyle = '#4ef08a'; g.lineWidth = 0.8; g.beginPath(); for (let i = 0; i <= 22; i++) { const v = 8 + Math.sin(i * 0.6 + t * 3 + y) * 4; i ? g.lineTo(1 + i, v) : g.moveTo(1, v); } g.stroke(); }
      else if (k === 1) { g.fillStyle = '#5fd0ff'; for (let i = 0; i < 5; i++) g.fillRect(2 + i * 4.4, 13 - (4 + 5 * Math.abs(Math.sin(t + i + y))), 3, 4 + 5 * Math.abs(Math.sin(t + i + y))); }
      else { g.fillStyle = '#f2c230'; g.font = `4px ${FONT}`; g.fillText('GO / NO-GO', 2, 6); g.fillStyle = Math.sin(t * 2 + y) > 0 ? '#4ef08a' : '#3a5a42'; g.fillText('● GO', 3, 12); }
    });
  }, (f) => f.x + 0.5 + f.y + 0.5);
  /** -x 를 보는 의자 (part 'seat' | 'back') */
  prop('ib_chairX', (ctx, f) => {
    const { x, y } = f, c = f.color || '#3b4252';
    if (f.part === 'seat') { ellipseFloor(ctx, x, y, 0.28, 0.28, 0, 'rgba(60,60,60,0.12)'); sbox(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, 9, '#7b7f83'); box(ctx, x - 0.27, y - 0.27, 9, 0.54, 0.54, 3, shade(c, 0.12), shade(c, -0.05), shade(c, -0.18), OL); return; }
    box(ctx, x + 0.2, y - 0.27, 12, 0.09, 0.54, 19, shade(c, 0.12), shade(c, -0.05), shade(c, -0.18), OL);
  }, (f) => (f.part === 'seat' ? f.x + f.y - 0.05 : f.x + 0.25 + f.y));
  /** 우주복 전시 */
  prop('ib_spacesuit', (ctx, f) => {
    const { x, y } = f, wht = '#f2f2ee';
    cylinder(ctx, x, y, 0, 0.3, 3, '#5d6166', '#4f5459', OL);
    box(ctx, x - 0.18, y - 0.16, 3, 0.14, 0.24, 17, shade(wht, 0.05), shade(wht, -0.08), shade(wht, -0.16), OL);
    box(ctx, x + 0.04, y - 0.16, 3, 0.14, 0.24, 17, shade(wht, 0.05), shade(wht, -0.08), shade(wht, -0.16), OL);
    box(ctx, x - 0.2, y - 0.3, 18, 0.4, 0.16, 18, '#d9dde1', '#c4c9cd', '#b5bbc0', OL);
    box(ctx, x - 0.22, y - 0.16, 20, 0.44, 0.3, 17, shade(wht, 0.05), shade(wht, -0.08), shade(wht, -0.16), OL);
    for (const sg of [-1, 1]) box(ctx, x + sg * 0.27 - 0.06, y - 0.1, 22, 0.12, 0.2, 14, shade(wht, 0.02), shade(wht, -0.1), shade(wht, -0.18), OL);
    onPlaneY(ctx, x - 0.22, y + 0.14, 36, (g) => { g.fillStyle = '#4e7cf6'; g.fillRect(3, 3, 5, 3.5); g.fillStyle = '#e5534b'; g.fillRect(9, 3, 3, 3.5); g.fillStyle = '#9aa1a7'; g.fillRect(4, 9, 8, 4); });
    const [hx, hy] = P(x, y, 44);
    ctx.fillStyle = '#f7f7f4'; ctx.beginPath(); ctx.arc(hx, hy, 8.5, 0, 7); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.6; ctx.stroke();
    const gr = ctx.createLinearGradient(hx - 6, hy - 4, hx + 6, hy + 4); gr.addColorStop(0, '#f6d365'); gr.addColorStop(1, '#b8862b');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(hx + 1, hy + 1, 6, 4.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(hx - 1.5, hy - 0.5, 1.8, 1, -0.5, 0, 7); ctx.fill();
  }, (f) => f.x + f.y + 0.2);
  /** 지구본 (돌아감) */
  prop('ib_globe', (ctx, f, t) => {
    const { x, y } = f;
    cylinder(ctx, x, y, 0, 0.25, 3, '#8a6247', '#7a5540', OL);
    sbox(ctx, x - 0.03, y - 0.03, 3, 0.06, 0.06, 16, '#b8955f');
    const [sx, sy] = P(x, y, 32), R = 12;
    ctx.strokeStyle = '#b8955f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, R + 2.5, -1.2, 2.2); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, R, 0, 7); ctx.clip();
    ctx.fillStyle = '#4f9bd8'; ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
    ctx.fillStyle = '#6dbb5a';
    for (const [u, v, a, b] of [[0, -4, 4, 6], [6, 3, 3, 5], [14, -2, 5, 4], [21, 4, 3, 3]]) { const px = sx - R + ((u + t * 4) % 28) - 2; ctx.beginPath(); ctx.ellipse(px, sy + v, a, b, 0.4, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(sx - 4, sy - 4, 4, 0, 7); ctx.fill();
    ctx.restore();
  }, (f) => f.x + f.y);
  /** 인공위성 모형 */
  prop('ib_satModel', (ctx, f, t) => {
    const { x, y } = f;
    cylinder(ctx, x, y, 0, 0.22, 3, '#3b3f45', '#2d3035', OL);
    sbox(ctx, x - 0.025, y - 0.025, 3, 0.05, 0.05, 20, '#9aa1a7');
    const z = 23 + Math.sin(t * 1.5) * 1.5;
    box(ctx, x - 0.15, y - 0.15, z, 0.3, 0.3, 10, '#f6d365', '#e2b93b', '#c99a20', OL);
    for (const sg of [-1, 1]) box(ctx, x + (sg < 0 ? -0.75 : 0.15), y - 0.06, z + 4, 0.6, 0.12, 0.8, '#4e7cf6', '#3f68d0', '#2f55b0');
    for (const sg of [-1, 1]) { const [a, b] = P(x + sg * 0.15, y, z + 5), [c, d] = P(x + sg * 0.75, y, z + 5); ctx.fillStyle = 'rgba(80,120,220,0.9)'; ctx.fillRect(Math.min(a, c), Math.min(b, d) - 4, Math.abs(c - a), 8); ctx.strokeStyle = '#c4cbd2'; ctx.lineWidth = 0.6; ctx.strokeRect(Math.min(a, c), Math.min(b, d) - 4, Math.abs(c - a), 8); }
    const [dx, dy] = P(x, y, z + 14); ctx.fillStyle = '#e1e5e9'; ctx.beginPath(); ctx.ellipse(dx, dy, 5, 2.5, 0, 0, 7); ctx.fill();
  }, (f) => f.x + f.y);
  /** 다축 회전 훈련기 (3×3) */
  prop('ib_gyro', (ctx, f, t) => {
    const { x, y } = f, cx = x + 1.5, cy = y + 1.5;
    cylinder(ctx, cx, cy, 0, 1.3, 4, '#d9dde1', '#b5bbc0', OL);
    for (const sg of [-1, 1]) { const [a, b] = P(cx + sg * 1.05, cy, 4), [c, d] = P(cx + sg * 1.05, cy, 46); line(ctx, [a, b], [c, d], '#7d858c', 3); }
    const [sx, sy] = P(cx, cy, 44);
    const rings = [[46, '#e5534b', 0.9], [38, '#4e7cf6', 1.4], [30, '#f2c230', 2.1]];
    rings.forEach(([R, c, sp], i) => { const a = t * sp + i; ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.beginPath(); if (i === 1) ctx.ellipse(sx, sy, R * 0.85, R * Math.abs(Math.cos(a)) * 0.85 + 2, 0, 0, 7); else ctx.ellipse(sx, sy, R * Math.abs(Math.cos(a)) * 0.85 + 2, R * 0.85, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke(); });
    ctx.fillStyle = '#3b3f45'; roundRect(ctx, sx - 6, sy - 7, 12, 14, 3); ctx.fill();
    ctx.fillStyle = '#f2f2ee'; ctx.beginPath(); ctx.arc(sx, sy - 9, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#e2b93b'; ctx.beginPath(); ctx.ellipse(sx + 1, sy - 8.5, 3.4, 2.6, 0, 0, 7); ctx.fill();
  }, (f) => f.x + f.y + 3);
  /** 회전의자 훈련기 (2×2) */
  prop('ib_spinChair', (ctx, f, t) => {
    const { x, y } = f, cx = x + 1, cy = y + 1, a = t * 2.4;
    cylinder(ctx, cx, cy, 0, 0.85, 4, '#c4cbd2', '#9aa1a7', OL);
    ellipseFloor(ctx, cx, cy, 0.7, 0.7, 4.1, null, '#f2c230');
    const px = cx + Math.cos(a) * 0.35, py = cy + Math.sin(a) * 0.35;
    sbox(ctx, cx - 0.05, cy - 0.05, 4, 0.1, 0.1, 8, '#5d6166');
    box(ctx, px - 0.28, py - 0.28, 12, 0.56, 0.56, 4, '#e5534b', '#c9443d', '#b23a34', OL);
    const bxx = px - Math.cos(a) * 0.3, byy = py - Math.sin(a) * 0.3;
    box(ctx, bxx - 0.2, byy - 0.2, 16, 0.4, 0.4, 16, '#e5534b', '#c9443d', '#b23a34', OL);
  }, (f) => f.x + f.y + 2);
  /** 중성부력 수조 속 우주인 (둥둥) */
  prop('ib_floatSuit', (ctx, f, t) => {
    const [sx, sy] = P(f.x + Math.sin(t * 0.3) * 0.6, f.y + Math.cos(t * 0.25) * 0.4, 2 + Math.sin(t * 1.1) * 2);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.sin(t * 0.4) * 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; roundRect(ctx, -10, -6, 20, 12, 5); ctx.fill();
    ctx.fillRect(-14, -3, 5, 4); ctx.fillRect(9, -3, 5, 4);
    ctx.fillStyle = '#f7f7f4'; ctx.beginPath(); ctx.arc(12, -1, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#e2b93b'; ctx.beginPath(); ctx.ellipse(13.5, -1, 3.5, 3, 0, 0, 7); ctx.fill();
    ctx.restore();
    for (let k = 0; k < 4; k++) { const p = (t * 0.4 + k / 4) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - p)})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(sx + 10 + k * 3, sy - 4 - p * 22, 1.6, 0, 7); ctx.stroke(); }
  }, (f) => f.x + f.y - 1);
  /** 천체 관측 돔 (r: 반지름 칸) */
  prop('ib_dome', (ctx, f, t, I) => {
    const r = f.r || 2.5, cx = f.x + r, cy = f.y + r;
    cylinder(ctx, cx, cy, 0, r * 0.98, 28, '#e3e7eb', '#cfd5da', OL);
    onPlaneY(ctx, cx - 0.5, cy + r * 0.98, 24, (g) => { g.fillStyle = '#5d6166'; g.fillRect(4, 2, 24, 22); g.fillStyle = '#7d858c'; g.fillRect(6, 4, 20, 20); g.fillStyle = '#f2c230'; g.fillRect(22, 13, 2, 2); });
    const [sx, sy] = P(cx, cy, 28), rx = r * 64 / Math.SQRT2 * 0.98, ry = rx * 0.92;
    const gr = ctx.createLinearGradient(sx - rx, sy - ry, sx + rx, sy); gr.addColorStop(0, '#fbfcfd'); gr.addColorStop(0.6, '#dfe4e8'); gr.addColorStop(1, '#b9c1c8');
    ctx.beginPath(); ctx.ellipse(sx, sy, rx, rx / 2, 0, 0, Math.PI); ctx.ellipse(sx, sy, rx, ry, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(120,130,140,0.3)'; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry * k / 4 + 2, 0, Math.PI, Math.PI * 2); ctx.stroke(); }
    const off = Math.sin(t * 0.15) * rx * 0.35, open = isNight(I) ? 1 : 0.6;
    ctx.save(); ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, Math.PI, Math.PI * 2); ctx.lineTo(sx + rx, sy); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#1d2547'; ctx.fillRect(sx + off - 7 * open, sy - ry - 2, 14 * open, ry + 2);
    ctx.restore();
    ctx.strokeStyle = '#3b3f45'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx + off, sy - ry * 0.45); ctx.lineTo(sx + off + 8, sy - ry * 1.05); ctx.stroke(); ctx.lineCap = 'butt';
    if (isNight(I)) for (let k = 0; k < 3; k++) { const [px, py] = [sx + off + 8 + k * 9, sy - ry * 1.05 - 6 - k * 7]; ctx.fillStyle = `rgba(255,255,220,${0.4 + 0.4 * Math.sin(t * 3 + k)})`; ctx.fillRect(px, py, 1.6, 1.6); }
  }, (f) => f.x + f.y + (f.r || 2.5) * 2);
  /** 망원경 (kind 'viewer' = 전망대 동전 쌍안경) */
  prop('ib_telescope', (ctx, f, t) => {
    const [sx, sy] = P(f.x, f.y, 0);
    if (f.kind === 'viewer') {
      cylinder(ctx, f.x, f.y, 0, 0.18, 3, '#5d6166', '#4f5459', OL);
      sbox(ctx, f.x - 0.05, f.y - 0.05, 3, 0.1, 0.1, 24, '#4e7cf6');
      const [hx, hy] = P(f.x, f.y, 30);
      ctx.fillStyle = '#3f68d0'; roundRect(ctx, hx - 9, hy - 6, 18, 10, 4); ctx.fill();
      ctx.fillStyle = '#2b2f33'; ctx.beginPath(); ctx.arc(hx - 4, hy + 1, 3, 0, 7); ctx.arc(hx + 4, hy + 1, 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.arc(hx - 4, hy + 1, 1.6, 0, 7); ctx.arc(hx + 4, hy + 1, 1.6, 0, 7); ctx.fill();
      ctx.fillStyle = '#f2c230'; ctx.fillRect(hx - 2, hy - 9, 4, 3);
      return;
    }
    ctx.strokeStyle = '#5d6166'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx, sy - 20); ctx.lineTo(sx - 8, sy); ctx.moveTo(sx, sy - 20); ctx.lineTo(sx + 8, sy); ctx.moveTo(sx, sy - 20); ctx.lineTo(sx + 1, sy + 4); ctx.stroke();
    const a = -0.6 + Math.sin(t * 0.2 + f.x) * 0.15;
    ctx.save(); ctx.translate(sx, sy - 22); ctx.rotate(a);
    ctx.fillStyle = '#f4f6f8'; roundRect(ctx, -12, -4, 30, 8, 3); ctx.fill(); ctx.strokeStyle = OL; ctx.stroke();
    ctx.fillStyle = '#4e7cf6'; ctx.fillRect(14, -4.5, 5, 9); ctx.fillStyle = '#2b2f33'; ctx.fillRect(-14, -2, 3, 4);
    ctx.fillStyle = '#c4cbd2'; ctx.fillRect(-2, -8, 10, 3);
    ctx.restore();
  }, (f) => f.x + f.y);
  /** 위성 안테나 접시 */
  prop('ib_dish', (ctx, f, t) => {
    const { x, y } = f;
    bx(ctx, x - 0.35, y - 0.35, 0, 0.7, 0.7, 10, '#c4cbd2');
    sbox(ctx, x - 0.06, y - 0.06, 10, 0.12, 0.12, 14, '#7d858c');
    const [sx, sy] = P(x, y, 30), a = -0.5 + Math.sin(t * 0.1) * 0.2;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
    ctx.fillStyle = '#eef1f4'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 9, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#9aa1a7'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#d2d8de'; ctx.beginPath(); ctx.ellipse(0, 2, 16, 5, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7d858c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(0, -16); ctx.lineTo(14, 0); ctx.stroke(); ctx.fillStyle = '#e5534b'; ctx.beginPath(); ctx.arc(0, -16, 2, 0, 7); ctx.fill();
    ctx.restore();
  }, (f) => f.x + f.y + 0.3);

  // ================================================================ 소품 — 🏦 은행
  /** 대리석 기둥 */
  prop('ib_column', (ctx, f) => {
    const { x, y } = f, h = f.h || 92;
    bx(ctx, x - 0.32, y - 0.32, 0, 0.64, 0.64, 6, '#efe9df');
    cylinder(ctx, x, y, 6, 0.24, 2, '#e2b93b', '#c99a20');
    cylinder(ctx, x, y, 8, 0.22, h - 16, '#f7f3eb', '#e8e1d4', OL);
    const [sx, sy] = P(x, y, 8); ctx.strokeStyle = 'rgba(150,135,110,0.28)'; ctx.lineWidth = 0.8;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(sx + k * 3.6, sy + 2); ctx.lineTo(sx + k * 3.6, sy - (h - 16) + 3); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(sx - 6, sy - (h - 16), 2, h - 16);
    bx(ctx, x - 0.3, y - 0.3, h - 8, 0.6, 0.6, 4, '#efe9df'); bx(ctx, x - 0.36, y - 0.36, h - 4, 0.72, 0.72, 4, '#e8dfc9');
  }, (f) => f.x + f.y + 0.3);
  /** 현금 정사 테이블 (지폐 다발 · 계수기) */
  prop('ib_cashTable', (ctx, f, t) => {
    const { x, y } = f, w = f.w || 3;
    shadowR(ctx, x, y, w, 1); legs(ctx, x, y, w, 1, 20, '#8d959c');
    box(ctx, x, y, 20, w, 1, 2.5, '#f4f1ec', '#e1dbd0', '#d2cbbf', OL);
    for (let i = 0; i < Math.floor((w - 1) / 0.45); i++) { const hh = 3 + ((i * 7) % 5); box(ctx, x + 0.15 + i * 0.45, y + 0.3, 22.5, 0.36, 0.2, hh, '#9fd8a8', '#7cc48a', '#66ad74', OL); poly(ctx, [P(x + 0.29 + i * 0.45, y + 0.3, 22.6 + hh), P(x + 0.37 + i * 0.45, y + 0.3, 22.6 + hh), P(x + 0.37 + i * 0.45, y + 0.5, 22.6 + hh), P(x + 0.29 + i * 0.45, y + 0.5, 22.6 + hh)], '#f6d58a'); }
    box(ctx, x + w - 0.85, y + 0.2, 22.5, 0.6, 0.6, 7, '#d9dde1', '#c4c9cd', '#b5bbc0', OL);
    onPlaneY(ctx, x + w - 0.8, y + 0.8, 28, (g) => { g.fillStyle = '#16181b'; g.fillRect(2, 1, 14, 5); g.fillStyle = '#4ef08a'; g.font = `4px ${FONT}`; g.fillText(String(1000 + Math.floor(t * 37) % 9000), 3, 5); });
  }, mid);
  /** 현금 팔레트 (랩 씌운 지폐 벽돌) */
  prop('ib_cashPallet', (ctx, f) => {
    const { x, y } = f;
    box(ctx, x + 0.05, y + 0.05, 0, 1.8, 1.8, 3, '#c49a62', '#a87a52', '#8a6247', OL);
    for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { bx(ctx, x + 0.12 + i * 0.84, y + 0.12 + j * 0.84, 3 + k * 7, 0.8, 0.8, 7, '#7cc48a'); poly(ctx, [P(x + 0.45 + i * 0.84, y + 0.12 + j * 0.84, 10 + k * 7), P(x + 0.55 + i * 0.84, y + 0.12 + j * 0.84, 10 + k * 7), P(x + 0.55 + i * 0.84, y + 0.92 + j * 0.84, 10 + k * 7), P(x + 0.45 + i * 0.84, y + 0.92 + j * 0.84, 10 + k * 7)], '#f6d58a'); }
    box(ctx, x + 0.1, y + 0.1, 3, 1.7, 1.7, 21.5, 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.45)');
    onPlaneY(ctx, x + 0.5, y + 1.82, 18, (g) => { g.fillStyle = '#f6d58a'; g.fillRect(0, 0, 26, 8); g.fillStyle = '#2b2216'; g.font = `bold 5px ${FONT}`; g.fillText('₩ 100억', 2, 6); });
  }, (f) => f.x + f.y + 1.9);
  /** 소형 금고 */
  prop('ib_safe', (ctx, f) => {
    const { x, y } = f;
    box(ctx, x - 0.35, y - 0.35, 0, 0.7, 0.7, 24, '#6d7782', '#5b646e', '#4b535c', OL);
    onPlaneY(ctx, x - 0.3, y + 0.35, 22, (g) => { g.strokeStyle = '#3d444b'; g.strokeRect(1, 1, 18, 18); g.fillStyle = '#c9cfd4'; g.beginPath(); g.arc(9, 10, 4, 0, 7); g.fill(); g.fillStyle = '#3d444b'; g.fillRect(8.4, 6.5, 1.2, 3); g.fillStyle = '#e2b93b'; g.fillRect(15, 7, 2, 7); });
  }, (f) => f.x + f.y + 0.3);
  /** 레이저 경보망 */
  prop('ib_laserGrid', (ctx, f, t) => {
    const { x, y, w, d } = f, posts = [[x, y], [x + w, y], [x, y + d], [x + w, y + d]];
    for (const [px, py] of posts.slice(0, 2)) sbox(ctx, px - 0.06, py - 0.06, 0, 0.12, 0.12, 24, '#5d6166');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const z of [6, 13, 20]) for (const [a, b] of [[0, 1], [0, 2], [1, 3], [2, 3], [0, 3]]) { const al = 0.35 + 0.3 * Math.sin(t * 7 + z + a * 2 + b); line(ctx, P(posts[a][0], posts[a][1], z), P(posts[b][0], posts[b][1], z), `rgba(255,60,60,${al})`, 1.2); }
    ctx.restore();
    for (const [px, py] of posts.slice(2)) sbox(ctx, px - 0.06, py - 0.06, 0, 0.12, 0.12, 24, '#5d6166');
  }, (f) => f.x + f.w / 2 + f.y + f.d / 2);
  /** 트레이딩룸 시세 전광판 (서쪽 바깥벽) */
  prop('ib_tickerX', (ctx, f, t) => {
    onPlaneX(ctx, 0.04, f.y0, 100, (g) => {
      const Wl = f.len * 32, Hh = 76;
      g.fillStyle = '#0d0f12'; roundRect(g, -3, -3, Wl + 6, Hh + 6, 3); g.fill();
      g.fillStyle = '#16181b'; g.fillRect(0, 0, Wl, 13);
      const items = ['AIO ▲3.2%', 'KOSPI ▲1.1%', 'GPU ▼0.8%', 'TOKEN ▲12%', 'USD/KRW ▼0.3%', 'BTC ▲2.4%', 'NASDAQ ▲0.6%', 'AGENT ▼1.5%'];
      g.save(); g.beginPath(); g.rect(0, 0, Wl, 13); g.clip(); g.font = `bold 8px ${FONT}`;
      let u = -((t * 28) % 420);
      for (let rep = 0; rep < 4; rep++) for (const it of items) { g.fillStyle = it.includes('▲') ? '#ff5b5b' : '#5b9bff'; g.fillText(it, u, 10); u += it.length * 5.6 + 14; }
      g.restore();
      const cw = Wl * 0.7;
      g.fillStyle = '#0f1820'; g.fillRect(0, 15, cw, Hh - 15);
      g.strokeStyle = 'rgba(120,160,190,0.15)'; for (let j = 1; j < 5; j++) { g.beginPath(); g.moveTo(0, 15 + j * 12); g.lineTo(cw, 15 + j * 12); g.stroke(); }
      const r = AIO.rand(7); let v = 45;
      const N = Math.floor(cw / 7), shift = Math.floor(t * 0.5);
      for (let i = 0; i < N + shift; i++) { const o = v; v = Math.max(22, Math.min(68, v + (r() - 0.48) * 9)); if (i < shift) continue; const px = (i - shift) * 7 + 3, up = v < o; g.fillStyle = up ? '#ff5b5b' : '#5b9bff'; g.fillRect(px + 2, Math.min(o, v) - 3, 1, Math.abs(o - v) + 6); g.fillRect(px, Math.min(o, v), 5, Math.max(1.5, Math.abs(o - v))); }
      g.fillStyle = '#16181b'; g.fillRect(cw + 3, 15, Wl - cw - 3, Hh - 15);
      g.fillStyle = '#f6d58a'; g.font = `bold 7px ${FONT}`; g.fillText('AI 종합지수', cw + 7, 26);
      g.fillStyle = '#ff5b5b'; g.font = `bold 13px ${FONT}`; g.fillText((3215 + Math.sin(t * 0.7) * 12).toFixed(2), cw + 7, 44);
      g.font = `6px ${FONT}`; g.fillText('▲ 38.21 (+1.20%)', cw + 7, 55); g.fillStyle = '#9aa1a7'; g.fillText('거래대금 12.4조', cw + 7, 66);
    });
  }, WEST);
  /** 트레이딩 데스크 (양쪽 자리 · 가운데 모니터 벽) */
  prop('ib_tradeDesk', (ctx, f, t) => {
    const { x, y, w } = f;
    shadowR(ctx, x, y, w, 2); legs(ctx, x, y, w, 2, 20, '#5d6166', 0.1, 0.15);
    box(ctx, x, y, 20, w, 2, 2, '#ece8e0', '#d6d1c7', '#c8c2b6', OL);
    box(ctx, x, y + 0.95, 22, w, 0.1, 5, '#9aa1a7', '#8d959c', '#7d858c');
    for (let i = 0; i < w; i++) {
      for (const k of [0, 1]) box(ctx, x + i + 0.06 + k * 0.45, y + 0.72, 25, 0.42, 0.06, 13, '#2b2f33', '#1d2126', '#16181b');
      for (const k of [0, 1]) {
        box(ctx, x + i + 0.06 + k * 0.45, y + 1.1, 25, 0.42, 0.06, 13, '#2b2f33', '#1d2126', '#16181b');
        onPlaneY(ctx, x + i + 0.08 + k * 0.45, y + 1.17, 37, (g) => {
          g.fillStyle = '#0d1a2b'; g.fillRect(0, 0, 12.5, 10.5);
          g.strokeStyle = (i + k) % 2 ? '#ff5b5b' : '#5b9bff'; g.lineWidth = 0.8; g.beginPath();
          for (let q = 0; q <= 10; q++) { const v = 5 + Math.sin(q * 0.9 + t * 1.5 + i * 2 + k) * 3; q ? g.lineTo(1 + q, v) : g.moveTo(1, v); } g.stroke();
        });
      }
      for (const yy of [0.2, 1.55]) poly(ctx, [P(x + i + 0.25, y + yy, 22.05), P(x + i + 0.75, y + yy, 22.05), P(x + i + 0.75, y + yy + 0.2, 22.05), P(x + i + 0.25, y + yy + 0.2, 22.05)], '#3b3f45');
    }
  }, null, { slice: 1 });
  /** 와인 랙 */
  prop('ib_wineRack', (ctx, f) => {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.5, 62, '#7a4a2a', '#6b4226', '#5a3720', OL);
    onPlaneY(ctx, x, y + 0.5, 60, (g) => {
      const Wl = w * 32; g.fillStyle = '#4a2a19'; g.fillRect(2, 2, Wl - 4, 56);
      for (let i = 0; i < (Wl - 4) / 7; i++) for (let j = 0; j < 7; j++) { g.fillStyle = (i * 3 + j) % 4 ? '#2f4a2a' : '#6b1f2a'; g.beginPath(); g.arc(5.5 + i * 7, 6 + j * 7.6, 2.8, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(4.5 + i * 7, 4.6 + j * 7.6, 1, 1); }
    });
  }, null, { slice: 0.3 });
  /** 옥상 간판 (철골 위 글자) */
  prop('ib_roofSign', (ctx, f, t, I) => {
    const { x, y, w } = f, c = f.color || '#e2b93b', on = isNight(I);
    for (let i = 0.3; i < w; i += 2) { sbox(ctx, x + i, y + 0.2, 0, 0.08, 0.08, 46, '#7d858c'); line(ctx, P(x + i, y + 0.2, 0), P(x + i + 1, y + 0.2, 40), '#9aa1a7', 0.8); }
    onPlaneY(ctx, x, y + 0.3, 72, (g) => {
      g.font = `bold 30px ${FONT}`; g.textAlign = 'center';
      if (on) { g.shadowColor = c; g.shadowBlur = 12; }
      g.lineWidth = 4; g.strokeStyle = '#5a4214'; g.strokeText(f.text || 'AI BANK', w * 16, 28); g.fillStyle = c; g.fillText(f.text || 'AI BANK', w * 16, 28);
      g.shadowBlur = 0; g.textAlign = 'left';
    });
  }, (f) => f.x + f.w / 2 + f.y + 0.3);
  /** 번호표 안내판 (서쪽 바깥벽) */
  prop('ib_numBoardX', (ctx, f, t) => {
    onPlaneX(ctx, 0.04, f.y0, 92, (g) => {
      g.fillStyle = '#1d2126'; roundRect(g, 0, 0, 84, 34, 4); g.fill();
      g.fillStyle = '#f6d58a'; g.font = `bold 7px ${FONT}`; g.fillText('🔔 호출 번호', 6, 10);
      const nn = 127 + Math.floor(t / 9) % 50; g.fillStyle = '#ff6b5b'; g.font = `bold 14px ${FONT}`; g.fillText(String(nn).padStart(4, '0'), 6, 27);
      g.fillStyle = '#4ef08a'; g.font = `bold 8px ${FONT}`; g.fillText(`→ ${1 + Math.floor(t / 9) % 3}번 창구`, 44, 26);
    });
  }, WEST);
  /** 차단봉 (벨벳 줄) */
  prop('ib_stanchion', (ctx, f) => {
    const { x, y, w } = f, n = Math.max(2, Math.round(w / 1.5) + 1);
    const pts = []; for (let i = 0; i < n; i++) pts.push(x + (w * i) / (n - 1));
    for (let i = 0; i < n - 1; i++) { const a = P(pts[i], y, 18), b = P(pts[i + 1], y, 18); ctx.strokeStyle = '#a8323e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 6, b[0], b[1]); ctx.stroke(); }
    for (const px of pts) { cylinder(ctx, px, y, 0, 0.12, 2, '#c99a20', '#b8862b'); sbox(ctx, px - 0.03, y - 0.03, 2, 0.06, 0.06, 17, '#e2b93b'); dot(ctx, px, y, 20, 2, '#f6d365'); }
  }, (f) => f.x + f.w / 2 + f.y);

  // ================================================================ 소품 — 🎨 아트센터
  /** 그림 액자 (axis 'x' = x 상수 벽, 'y' = y 상수 벽 · 실내 칸막이엔 w ≤ 1 로 칸에 맞춰 건다) */
  prop('ib_frame', (ctx, f) => {
    const Wp = (f.w || 1) * 32 - 3.2, Hh = f.h || 40, r = AIO.rand(f.seed || 1), kind = (f.seed || 1) % 5;
    const fn = (g) => {
      g.fillStyle = 'rgba(255,240,200,0.18)'; g.beginPath(); g.moveTo(1.6 + Wp / 2 - 4, -10); g.lineTo(1.6 + Wp / 2 + 4, -10); g.lineTo(Wp + 4, Hh); g.lineTo(-1, Hh); g.fill();
      g.fillStyle = '#2b2622'; g.fillRect(1.6 + Wp / 2 - 3, -12, 6, 3);
      g.fillStyle = f.frame || (kind % 2 ? '#c9a64a' : '#2b2622'); g.fillRect(-1.4, -2, Wp + 6, Hh + 4);
      const ax = 1.6, aw = Wp, ah = Hh;
      g.fillStyle = '#fffdf7'; g.fillRect(ax, 0, aw, ah);
      if (kind === 0) { const cols = ['#e5534b', '#4e7cf6', '#f2c230', '#fffdf7', '#fffdf7']; let yy = 0; while (yy < ah) { const hh = Math.min(ah - yy, 6 + r() * 14); let xx = 0; while (xx < aw) { const ww = Math.min(aw - xx, 6 + r() * 16); g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(ax + xx, yy, ww, hh); g.strokeStyle = '#111'; g.lineWidth = 1.4; g.strokeRect(ax + xx, yy, ww, hh); xx += ww; } yy += hh; } }
      else if (kind === 1) { const gr = g.createLinearGradient(0, 0, 0, ah); gr.addColorStop(0, '#9fd3f0'); gr.addColorStop(1, '#fbe3c0'); g.fillStyle = gr; g.fillRect(ax, 0, aw, ah); g.fillStyle = '#f2a33b'; g.beginPath(); g.arc(ax + aw * 0.7, ah * 0.3, 4, 0, 7); g.fill(); g.fillStyle = '#5b8f5a'; g.beginPath(); g.moveTo(ax, ah); g.lineTo(ax + aw * 0.3, ah * 0.45); g.lineTo(ax + aw * 0.55, ah * 0.75); g.lineTo(ax + aw * 0.8, ah * 0.5); g.lineTo(ax + aw, ah); g.fill(); }
      else if (kind === 2) { g.fillStyle = '#1d2547'; g.fillRect(ax, 0, aw, ah); for (let k = 0; k < 6; k++) { g.fillStyle = PAL[Math.floor(r() * PAL.length)]; g.globalAlpha = 0.85; g.beginPath(); g.arc(ax + r() * aw, r() * ah, 3 + r() * 8, 0, 7); g.fill(); } g.globalAlpha = 1; g.strokeStyle = '#f6c445'; g.lineWidth = 1; g.beginPath(); for (let k = 0; k < 12; k++) { const px = ax + 2 + k * (aw - 4) / 11, py = ah / 2 + Math.sin(k * 1.3) * ah * 0.3; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
      else if (kind === 3) { g.fillStyle = '#e9d8c0'; g.fillRect(ax, 0, aw, ah); g.fillStyle = '#7a4a2a'; g.beginPath(); g.ellipse(ax + aw / 2, ah * 0.85, aw * 0.38, ah * 0.3, 0, Math.PI, 0); g.fill(); g.fillStyle = '#f2c9a0'; g.beginPath(); g.arc(ax + aw / 2, ah * 0.42, Math.min(aw, ah) * 0.2, 0, 7); g.fill(); g.fillStyle = '#3b2a20'; g.beginPath(); g.arc(ax + aw / 2, ah * 0.36, Math.min(aw, ah) * 0.21, Math.PI, 0); g.fill(); }
      else { for (let k = 0; k < 9; k++) { g.strokeStyle = PAL[k % PAL.length]; g.lineWidth = 2 + r() * 3; g.beginPath(); g.moveTo(ax + r() * aw, r() * ah); g.quadraticCurveTo(ax + r() * aw, r() * ah, ax + r() * aw, r() * ah); g.stroke(); } }
    };
    if (f.axis === 'x') onPlaneX(ctx, f.x + 0.04, f.y, f.z || 80, fn); else onPlaneY(ctx, f.x, f.y + 0.04, f.z || 80, fn);
  }, (f) => (f.west ? -5000 : f.axis === 'x' ? f.x + f.y - 1 + 0.52 : f.x + 0.52 + f.y));
  /** 대형 풍선 강아지 조각 (2×2) */
  prop('ib_bigSculpture', (ctx, f, t) => {
    const { x, y } = f, c = f.color || '#ff7eb6';
    bx(ctx, x + 0.15, y + 0.15, 0, 1.7, 1.7, 12, '#f4f2ee');
    const [sx, sy0] = P(x + 1, y + 1, 12), sy = sy0 - 2 + Math.sin(t * 1.2) * 0.6;
    const ball = (px, py, rx, ry, rot = 0) => { const gr = ctx.createRadialGradient(sx + px - rx * 0.35, sy + py - ry * 0.45, 1, sx + px, sy + py, Math.max(rx, ry)); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, shade(c, 0.35)); gr.addColorStop(1, shade(c, -0.25)); ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(sx + px, sy + py, rx, ry, rot, 0, 7); ctx.fill(); };
    ball(-14, -10, 5, 11, 0.15); ball(10, -10, 5, 11, -0.15);
    ball(-2, -26, 18, 8);
    ball(-20, -38, 4.5, 10, 0.5); ball(16, -38, 5, 9, -0.2);
    ball(18, -50, 9, 8); ball(26, -48, 7, 4.5, 0.2); ball(13, -60, 3.5, 7, -0.3); ball(21, -61, 3.5, 7, 0.3);
    ball(-10, -12, 4.5, 10, -0.1); ball(4, -12, 4.5, 10, 0.1);
  }, (f) => f.x + f.y + 2);
  /** 좌대 위 도자기 */
  prop('ib_vasePlinth', (ctx, f) => {
    const { x, y } = f;
    bx(ctx, x - 0.3, y - 0.3, 0, 0.6, 0.6, 26, '#f7f5f0');
    jar(ctx, x, y, 26, 0.8, false, 0, ['#7fb59b', '#3e5c9a', '#c9573f', '#e9dcc3'][(f.seed || 0) % 4]);
  }, (f) => f.x + f.y);
  /** 전시실 오토만 (등받이 없는 의자) */
  prop('ib_galleryBench', (ctx, f) => {
    const { x, y } = f, w = f.w || 1, d = f.d || 1;
    box(ctx, x, y, 0, w, d, 9, '#5b4a44', '#4a3b36', '#3d302c', OL);
    box(ctx, x + 0.04, y + 0.04, 9, w - 0.08, d - 0.08, 2.5, '#7a6259', '#65514a', '#56443e');
    for (let i = 0.3; i < Math.max(w, d); i += 0.5) dot(ctx, w > d ? x + i : x + w / 2, w > d ? y + d / 2 : y + i, 11.6, 0.9, '#3d302c');
  }, lowD(0.2));
  /** 물레 (돌아가는 도자기) */
  prop('ib_wheel', (ctx, f, t) => {
    const { x, y } = f, cx = x + 0.5, cy = y + 0.5;
    bx(ctx, x + 0.18, y + 0.18, 0, 0.64, 0.64, 12, '#8d959c');
    cylinder(ctx, cx, cy, 12, 0.42, 4, '#d9c8b4', '#c4b09a', OL);
    cylinder(ctx, cx, cy, 13, 0.24, 2, '#9aa1a7', '#7d858c');
    const [sx, sy] = P(cx, cy, 15), hh = 12 + Math.sin(t * 0.3) * 2, wob = Math.sin(t * 9) * 0.5;
    ctx.fillStyle = '#c9895a'; ctx.beginPath(); ctx.moveTo(sx - 6, sy); ctx.bezierCurveTo(sx - 9 + wob, sy - hh * 0.5, sx - 5, sy - hh, sx - 4, sy - hh); ctx.lineTo(sx + 4, sy - hh); ctx.bezierCurveTo(sx + 5, sy - hh, sx + 9 + wob, sy - hh * 0.5, sx + 6, sy); ctx.ellipse(sx, sy, 6, 2.6, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#a86a40'; ctx.beginPath(); ctx.ellipse(sx, sy - hh, 4, 1.6, 0, 0, 7); ctx.fill();
    const k = (t * 3) % 1; ctx.fillStyle = 'rgba(255,230,200,0.35)'; ctx.fillRect(sx - 6 + k * 10, sy - hh + 2, 1.6, hh - 2);
  }, (f) => f.x + f.y + 0.6);
  /** 가마 (2×2 · 불창 · 연기) */
  prop('ib_kiln', (ctx, f, t) => {
    const { x, y } = f;
    box(ctx, x + 0.1, y + 0.2, 0, 1.8, 1.6, 30, '#c0654b', '#a8553e', '#8f4834', OL);
    onPlaneY(ctx, x + 0.1, y + 1.8, 30, (g) => { g.strokeStyle = 'rgba(70,30,20,0.35)'; g.lineWidth = 0.8; for (let j = 0; j < 30; j += 5) for (let i = (j / 5 % 2) * 6; i < 58; i += 12) g.strokeRect(i, j, 12, 5); g.fillStyle = '#3b2620'; roundRect(g, 18, 10, 22, 16, 8); g.fill(); const fl = 0.6 + 0.4 * Math.sin(t * 8) * Math.sin(t * 5.3); g.fillStyle = `rgba(255,${140 + fl * 60},60,${0.75 + fl * 0.25})`; roundRect(g, 21, 13, 16, 11, 6); g.fill(); });
    const [tx, ty] = P(x + 1, y + 1, 30); ctx.fillStyle = '#b55c44'; ctx.beginPath(); ctx.ellipse(tx, ty, 40, 20, 0, Math.PI, 0); ctx.fill();
    sbox(ctx, x + 1.5, y + 0.5, 30, 0.25, 0.25, 30, '#5d6166');
    const [cx, cy] = P(x + 1.62, y + 0.62, 62); for (let k = 0; k < 3; k++) { const p = (t * 0.35 + k / 3) % 1; ctx.fillStyle = `rgba(200,200,200,${0.45 * (1 - p)})`; ctx.beginPath(); ctx.arc(cx + Math.sin(t + k) * 4, cy - p * 30, 4 + p * 8, 0, 7); ctx.fill(); }
    const [gx, gy] = P(x + 1, y + 1.8, 12); glow(ctx, gx, gy, 30, '#ff9a5a', 0.25 + 0.1 * Math.sin(t * 6));
  }, (f) => f.x + f.y + 2);
  /** 도자기 선반 (3단) */
  prop('ib_potShelf', (ctx, f) => {
    const { x, y, w } = f, r = AIO.rand(f.seed || 3);
    for (const px of [x + 0.05, x + w - 0.13]) sbox(ctx, px, y + 0.05, 0, 0.08, 0.5, 50, '#8a6247');
    for (const z of [2, 18, 34, 50]) box(ctx, x, y, z, w, 0.6, 2, '#c49a62', '#a87a52', '#8a6247', OL);
    for (const z of [4, 20, 36]) for (let i = 0.3; i < w - 0.2; i += 0.45) jar(ctx, x + i, y + 0.3, z, 0.38 + r() * 0.15, false, 0, ['#7fb59b', '#e9dcc3', '#c9573f', '#3e5c9a', '#d9b26a'][Math.floor(r() * 5)]);
  }, null, { slice: 0.5 });
  /** 점토 작업대 */
  prop('ib_clayTable', (ctx, f) => {
    const { x, y, w } = f, d = f.d || 1;
    shadowR(ctx, x, y, w, d); legs(ctx, x, y, w, d, 20, '#8a6247');
    box(ctx, x, y, 20, w, d, 3, '#d9c3a0', '#c4ab86', '#b39a76', OL);
    for (let i = 0; i < w; i += 0.9) { const [sx, sy] = P(x + 0.45 + i, y + d / 2, 23); ctx.fillStyle = '#b07a52'; ctx.beginPath(); ctx.ellipse(sx, sy - 3, 6, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(sx - 2, sy - 5, 2, 1, 0, 0, 7); ctx.fill(); }
  }, null, { slice: 0.6 });
  /** 페인트 통 더미 */
  prop('ib_paintCans', (ctx, f) => {
    const { x, y } = f;
    [[-0.15, -0.1, 0, '#e5534b'], [0.15, -0.05, 0, '#4e7cf6'], [0, 0.15, 0, '#f2c230'], [0, 0, 10, '#3fb27f']].forEach(([dx, dy, z, c]) => { cylinder(ctx, x + dx, y + dy, z, 0.14, 9, '#d9dde1', '#c4c9cd', OL); const [sx, sy] = P(x + dx, y + dy, z + 9); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(sx, sy, 5, 2.5, 0, 0, 7); ctx.fill(); ctx.fillRect(sx - 1, sy, 2, 4); });
  }, (f) => f.x + f.y);
  /** 미디어아트 벽 (서쪽 바깥벽 · 흐르는 색) */
  prop('ib_mediaWallX', (ctx, f, t) => {
    onPlaneX(ctx, 0.04, f.y0, 102, (g) => {
      const Wl = f.len * 32, Hh = 98;
      g.fillStyle = '#0b0c14'; g.fillRect(0, 0, Wl, Hh);
      for (let b = 0; b < 6; b++) {
        g.fillStyle = `hsla(${(t * 25 + b * 50) % 360},85%,60%,0.55)`; g.beginPath(); g.moveTo(0, Hh);
        for (let u = 0; u <= Wl; u += 8) g.lineTo(u, Hh * (0.25 + b * 0.12) + Math.sin(u * 0.02 + t * (0.6 + b * 0.15) + b) * 14);
        g.lineTo(Wl, Hh); g.fill();
      }
      const r = AIO.rand(5); g.fillStyle = 'rgba(255,255,255,0.8)';
      for (let k = 0; k < 30; k++) { const u = (r() * Wl + t * (6 + r() * 10)) % Wl, v = r() * Hh * 0.6; g.fillRect(u, v, 1.4, 1.4); }
    });
  }, WEST);
  /** 바닥 프로젝션 (움직이는 물결 · 반딧불) */
  prop('ib_projFloor', (ctx, f, t) => {
    tileSpace(ctx, (q) => {
      q.save(); q.beginPath(); q.rect(f.x, f.y, f.w, f.d); q.clip();
      q.globalCompositeOperation = 'lighter';
      for (const [cx, cy, ph] of [[f.x + f.w * 0.3, f.y + f.d * 0.4, 0], [f.x + f.w * 0.72, f.y + f.d * 0.65, 1.7]]) for (let k = 0; k < 4; k++) {
        const R = ((t * 0.9 + ph + k * 1.6) % 6.4); q.strokeStyle = `hsla(${(t * 30 + k * 60 + ph * 50) % 360},90%,65%,${0.45 * (1 - R / 6.4)})`; q.lineWidth = 0.16; q.beginPath(); q.arc(cx, cy, R, 0, 7); q.stroke();
      }
      const r = AIO.rand(9);
      for (let k = 0; k < 26; k++) { const px = f.x + ((r() * f.w + Math.sin(t * 0.4 + k) * 0.8) % f.w + f.w) % f.w, py = f.y + ((r() * f.d + t * 0.25 * (r() + 0.3)) % f.d); q.fillStyle = `rgba(160,255,220,${0.5 + 0.4 * Math.sin(t * 3 + k)})`; q.beginPath(); q.arc(px, py, 0.07, 0, 7); q.fill(); }
      q.restore();
    });
  }, () => -4000, { dynamic: true });
  /** LED 큐브 기둥 */
  prop('ib_mediaCube', (ctx, f, t) => {
    const { x, y } = f, h = 50, hue = (t * 40 + x * 30) % 360;
    box(ctx, x - 0.4, y - 0.4, 0, 0.8, 0.8, h, `hsl(${hue},85%,72%)`, `hsl(${(hue + 40) % 360},80%,58%)`, `hsl(${(hue + 80) % 360},75%,48%)`, 'rgba(255,255,255,0.4)');
    for (let z = 10; z < h; z += 10) line(ctx, P(x - 0.4, y + 0.4, z), P(x + 0.4, y + 0.4, z), 'rgba(0,0,0,0.25)', 0.8);
    for (let z = 10; z < h; z += 10) line(ctx, P(x + 0.4, y + 0.4, z), P(x + 0.4, y - 0.4, z), 'rgba(0,0,0,0.25)', 0.8);
    const [sx, sy] = P(x, y, h / 2); glow(ctx, sx, sy, 40, `#ffffff`, 0.08);
  }, (f) => f.x + f.y + 0.4);
  /** VR 체험 패드 */
  prop('ib_vrPad', (ctx, f, t) => {
    const { x, y } = f;
    ellipseFloor(ctx, x, y, 0.48, 0.48, 0.3, 'rgba(95,208,255,0.18)', `rgba(95,208,255,${0.6 + 0.3 * Math.sin(t * 3)})`);
    ellipseFloor(ctx, x, y, 0.32, 0.32, 0.3, null, 'rgba(255,255,255,0.4)');
    const [sx, sy] = P(x, y, 58 + Math.sin(t * 2) * 3), a = t;
    ctx.strokeStyle = 'rgba(95,208,255,0.75)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 0; k < 4; k++) { const p = [sx + Math.cos(a + k * Math.PI / 2) * 7, sy + Math.sin(a + k * Math.PI / 2) * 3.5]; k ? ctx.lineTo(...p) : ctx.moveTo(...p); } ctx.closePath(); ctx.stroke();
    ctx.beginPath(); for (let k = 0; k < 4; k++) { const p = [sx + Math.cos(a + k * Math.PI / 2) * 7, sy - 8 + Math.sin(a + k * Math.PI / 2) * 3.5]; k ? ctx.lineTo(...p) : ctx.moveTo(...p); } ctx.closePath(); ctx.stroke();
  }, (f) => f.x + f.y - 0.6);
  /** 빨간 링 조각 (옥상) */
  prop('ib_ring', (ctx, f, t) => {
    const { x, y } = f;
    bx(ctx, x + 0.2, y + 0.2, 0, 1.6, 0.6, 6, '#9aa1a7');
    const [sx, sy] = P(x + 1, y + 0.5, 42);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.sin(t * 0.3) * 0.05);
    ctx.strokeStyle = shade('#e5534b', -0.3); ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(1.5, 1, 27, 33, 0.45, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#e5534b'; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(0, 0, 27, 33, 0.45, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(-1, -1, 27, 33, 0.45, 3.4, 4.6); ctx.stroke();
    ctx.restore();
  }, (f) => f.x + f.y + 1.5);

  // ================================================================ 소품 — 🏋️ 스포츠
  /** 스피닝 자전거 (y 방향, 앞바퀴는 북쪽) */
  prop('ib_bike', (ctx, f, t) => {
    const { x, y } = f, cx = x + 0.3, c = f.color || '#e9593b';
    box(ctx, cx - 0.25, y + 0.05, 0, 0.5, 1.1, 2, '#3b3f45', '#2d3035', '#26292d');
    onPlaneX(ctx, cx + 0.05, y + 0.55, 26, (g) => { g.fillStyle = '#5d6166'; g.beginPath(); g.arc(9, 13, 10, 0, 7); g.fill(); g.strokeStyle = '#c4cbd2'; g.lineWidth = 1; for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1; g.beginPath(); g.moveTo(9, 13); g.lineTo(9 + Math.cos(a) * 9, 13 + Math.sin(a) * 9); g.stroke(); } });
    line(ctx, P(cx, y + 0.85, 2), P(cx, y + 0.85, 11), c, 2.6); line(ctx, P(cx, y + 0.85, 7), P(cx, y + 0.25, 22), c, 2.6);
    box(ctx, cx - 0.12, y + 0.72, 11, 0.24, 0.28, 2.5, '#2b2f33', '#1d2126', '#16181b');
    line(ctx, P(cx - 0.2, y + 0.22, 23), P(cx + 0.2, y + 0.22, 23), '#2b2f33', 2.2);
    onPlaneY(ctx, cx - 0.1, y + 0.2, 26, (g) => { g.fillStyle = '#16181b'; g.fillRect(0, 0, 6, 4); g.fillStyle = '#4ef08a'; g.fillRect(1, 1, (Math.sin(t * 2) * 0.5 + 0.5) * 4, 1.4); });
  }, (f) => f.x + 0.3 + f.y + 0.45);
  /** 벤치프레스 */
  prop('ib_benchPress', (ctx, f, t) => {
    const { x, y } = f;
    legs(ctx, x + 0.3, y + 0.3, 0.4, 1.4, 9, '#3b3f45');
    box(ctx, x + 0.3, y + 0.3, 9, 0.4, 1.4, 3, '#e9593b', '#c94a30', '#a83e28', OL);
    for (const px of [x + 0.1, x + 0.82]) sbox(ctx, px, y + 0.25, 0, 0.08, 0.08, 30, '#5d6166');
    const z = 28 + Math.max(0, Math.sin(t * 1.4)) * 4;
    line(ctx, P(x - 0.3, y + 0.3, z), P(x + 1.3, y + 0.3, z), '#9aa1a7', 2);
    for (const px of [x - 0.2, x + 1.15]) onPlaneX(ctx, px, y + 0.55, z + 8, (g) => { g.fillStyle = '#2b2f33'; g.beginPath(); g.arc(8, 8, 8, 0, 7); g.fill(); g.fillStyle = '#5d6166'; g.beginPath(); g.arc(8, 8, 2, 0, 7); g.fill(); });
  }, (f) => f.x + 0.5 + f.y + 1);
  /** 클라이밍 월 (서쪽 바깥벽) */
  prop('ib_climbWallX', (ctx, f) => {
    onPlaneX(ctx, 0.05, f.y0, 104, (g) => {
      const Wl = f.len * 32, Hh = 104, r = AIO.rand(21);
      g.fillStyle = '#e8c99a'; g.fillRect(0, 0, Wl, Hh);
      g.strokeStyle = 'rgba(120,90,50,0.25)'; g.lineWidth = 0.8; for (let u = 0; u < Wl; u += 32) { g.beginPath(); g.moveTo(u, 0); g.lineTo(u, Hh); g.stroke(); } for (let v = 0; v < Hh; v += 26) { g.beginPath(); g.moveTo(0, v); g.lineTo(Wl, v); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.06)'; g.beginPath(); g.moveTo(Wl * 0.45, 0); g.lineTo(Wl * 0.7, 0); g.lineTo(Wl * 0.62, Hh); g.lineTo(Wl * 0.5, Hh); g.fill();
      for (let k = 0; k < f.len * 9; k++) { const c = PAL[Math.floor(r() * PAL.length)]; const u = 6 + r() * (Wl - 12), v = 8 + r() * (Hh - 16); g.fillStyle = c; g.beginPath(); g.ellipse(u, v, 2.5 + r() * 3, 2 + r() * 2.5, r() * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(u - 1, v - 1.5, 1.4, 1); }
      g.fillStyle = '#2b2622'; g.font = `bold 8px ${FONT}`; g.fillText('🧗 CLIMB · 볼더링', 6, 10);
    });
  }, WEST);
  /** 짐볼 */
  prop('ib_yogaBall', (ctx, f) => { const [sx, sy] = P(f.x, f.y, 0), c = f.color || '#4e9cf6'; ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(sx, sy, 10, 4, 0, 0, 7); ctx.fill(); const gr = ctx.createRadialGradient(sx - 4, sy - 16, 1, sx, sy - 10, 12); gr.addColorStop(0, shade(c, 0.5)); gr.addColorStop(1, shade(c, -0.15)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy - 10, 10, 0, 7); ctx.fill(); }, (f) => f.x + f.y);
  /** 수영장 감시탑 의자 */
  prop('ib_lifeguard', (ctx, f, t) => {
    const { x, y } = f;
    for (const [lx, ly] of [[0.1, 0.1], [0.8, 0.1], [0.1, 0.8], [0.8, 0.8]]) sbox(ctx, x + lx, y + ly, 0, 0.08, 0.08, 36, '#f4f6f8');
    for (let z = 8; z < 34; z += 8) box(ctx, x + 0.1, y + 0.85, z, 0.78, 0.06, 1.5, '#f4f6f8', '#e1e5e9', '#d2d7dc');
    box(ctx, x + 0.05, y + 0.05, 36, 0.9, 0.9, 3, '#e5534b', '#c9443d', '#b23a34', OL);
    box(ctx, x + 0.05, y + 0.05, 39, 0.9, 0.1, 14, '#f4f6f8', '#e1e5e9', '#d2d7dc', OL);
    sbox(ctx, x + 0.48, y + 0.4, 39, 0.05, 0.05, 30, '#9aa1a7');
    const [ux, uy] = P(x + 0.5, y + 0.45, 72); for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#ffffff' : '#e5534b'; ctx.beginPath(); ctx.moveTo(ux, uy - 8); ctx.arc(ux, uy, 22, Math.PI + k * Math.PI / 6, Math.PI + (k + 1) * Math.PI / 6); ctx.closePath(); ctx.fill(); }
  }, (f) => f.x + f.y + 0.9);
  /** 수영하는 사람 (레인을 왕복) */
  prop('ib_swimmer', (ctx, f, t) => {
    const s = (f.seed || 1), ph = t * 0.12 + s * 1.7, k = (Math.sin(ph) * 0.5 + 0.5), dir = Math.cos(ph) >= 0 ? 1 : -1;
    const px = f.x + k * f.w, [sx, sy] = P(px, f.y, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(sx - dir * 10, sy + 3, 12, 3, 0, 0, 7); ctx.fill();
    const a = t * 6 + s; ctx.strokeStyle = '#f2c9a0'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + dir * Math.cos(a) * 9, sy - 2 - Math.max(0, Math.sin(a)) * 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - dir * Math.cos(a) * 9, sy - 2 - Math.max(0, -Math.sin(a)) * 8); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = PAL[s % PAL.length]; ctx.beginPath(); ctx.arc(sx + dir * 4, sy - 2, 4.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#16181b'; ctx.fillRect(sx + dir * 4 - 3, sy - 3, 6, 1.6);
  }, (f) => f.x + f.w / 2 + f.y, { dynamic: true });
  /** 원형 스파 욕조 (3×3) */
  prop('ib_hotTub', (ctx, f, t) => {
    const cx = f.x + 1.5, cy = f.y + 1.5;
    cylinder(ctx, cx, cy, 0, 1.35, 13, '#d9c8b4', '#b98c5e', OL);
    ellipseFloor(ctx, cx, cy, 1.15, 1.15, 13.1, '#6cc6e6');
    ellipseFloor(ctx, cx - 0.15, cy - 0.15, 0.8, 0.8, 13.2, 'rgba(255,255,255,0.18)');
    for (let k = 0; k < 8; k++) { const a = k * 0.8 + t * 0.6, rr = 0.3 + ((t * 0.7 + k * 0.37) % 0.8), [bx2, by2] = P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 13.5); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(bx2, by2, 1.6 + (k % 3), 0, 7); ctx.stroke(); }
    const [sx, sy] = P(cx, cy, 20); for (let k = 0; k < 3; k++) { const p = (t * 0.3 + k / 3) % 1; ctx.fillStyle = `rgba(255,255,255,${0.25 * (1 - p)})`; ctx.beginPath(); ctx.arc(sx + (k - 1) * 18, sy - p * 26, 6 + p * 8, 0, 7); ctx.fill(); }
  }, lowD(0.3));
  /** 사우나 2단 나무 벤치 */
  prop('ib_saunaBench', (ctx, f) => {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.45, 22, '#d4a26a', '#b98a55', '#a07646', OL);
    box(ctx, x, y + 0.45, 0, w, 0.55, 10, '#dcae78', '#c49660', '#a98050', OL);
    for (let i = 0.25; i < w; i += 0.25) { line(ctx, P(x + i, y + 0.45, 10.05), P(x + i, y + 1, 10.05), 'rgba(110,70,35,0.25)', 0.7); line(ctx, P(x + i, y, 22.05), P(x + i, y + 0.45, 22.05), 'rgba(110,70,35,0.25)', 0.7); }
  }, lowD(0.2));
  /** 사우나 난로 (돌 · 김) */
  prop('ib_saunaStove', (ctx, f, t) => {
    const { x, y } = f;
    box(ctx, x - 0.35, y - 0.35, 0, 0.7, 0.7, 18, '#5d6166', '#4f5459', '#41454a', OL);
    onPlaneY(ctx, x - 0.3, y + 0.35, 14, (g) => { g.fillStyle = `rgba(255,${120 + Math.sin(t * 6) * 30},50,0.9)`; g.fillRect(4, 3, 12, 6); });
    for (let k = 0; k < 7; k++) { const [sx, sy] = P(x - 0.2 + (k % 3) * 0.2, y - 0.2 + Math.floor(k / 3) * 0.2, 19); ctx.fillStyle = k % 2 ? '#8a8f96' : '#6d7175'; ctx.beginPath(); ctx.ellipse(sx, sy - 1.5, 4, 3, 0, 0, 7); ctx.fill(); }
    const [sx, sy] = P(x, y, 22); for (let k = 0; k < 4; k++) { const p = (t * 0.4 + k / 4) % 1; ctx.fillStyle = `rgba(255,255,255,${0.4 * (1 - p)})`; ctx.beginPath(); ctx.arc(sx + Math.sin(t * 2 + k) * 6, sy - p * 34, 4 + p * 9, 0, 7); ctx.fill(); }
  }, (f) => f.x + f.y + 0.3);
  /** 농구공 카트 */
  prop('ib_ballCart', (ctx, f) => {
    const { x, y } = f;
    for (const [lx, ly] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) { sbox(ctx, x + lx - 0.02, y + ly - 0.02, 2, 0.04, 0.04, 16, '#9aa1a7'); dot(ctx, x + lx, y + ly, 1.5, 1.6, '#2b2f33'); }
    for (let k = 0; k < 7; k++) { const [sx, sy] = P(x - 0.2 + (k % 3) * 0.2, y - 0.2 + Math.floor(k / 3) * 0.2, 16 + (k > 4 ? 6 : 0)); ctx.fillStyle = '#e9772f'; ctx.beginPath(); ctx.arc(sx, sy - 4, 5, 0, 7); ctx.fill(); ctx.strokeStyle = '#7a3a12'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(sx - 5, sy - 4); ctx.lineTo(sx + 5, sy - 4); ctx.moveTo(sx, sy - 9); ctx.lineTo(sx, sy + 1); ctx.stroke(); }
    box(ctx, x - 0.35, y - 0.35, 14, 0.7, 0.7, 0.1, null, 'rgba(150,160,170,0.5)', 'rgba(150,160,170,0.5)', '#9aa1a7');
  }, (f) => f.x + f.y + 0.3);

  // ================================================================ 소품 — ☕ 카페 & 베이커리
  /** 커피 로스터 (s=1: 3×2 · 드럼 · 호퍼 · 냉각판 · 굴뚝) */
  prop('ib_roaster', (ctx, f, t) => {
    const { x, y } = f, s = f.s || 1, bw = 1.3 * s, d = 1.5 * s, H0 = 30 * s;
    sbox(ctx, x + 0.3, y + 0.3, H0, 0.16, 0.16, 46 * s, '#b87333');
    box(ctx, x + 0.2, y + 0.2, 0, bw, d, H0, '#3b3f45', '#2b2f33', '#1d2126', OL);
    box(ctx, x + 0.2, y + 0.2, H0, bw, d, 2, '#b87333', '#a0632b', '#8a5525');
    onPlaneY(ctx, x + 0.2, y + 0.2 + d, H0 - 2, (g) => {
      const cx = bw * 16, cy = 13 * s;
      g.fillStyle = '#b87333'; g.beginPath(); g.arc(cx, cy, 10 * s, 0, 7); g.fill();
      g.fillStyle = '#2b2f33'; g.beginPath(); g.arc(cx, cy, 7 * s, 0, 7); g.fill();
      g.fillStyle = '#ffd27a'; g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4); g.beginPath(); g.arc(cx, cy, 3.4 * s, 0, 7); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = '#d9dde1'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx + 9 * s, cy); g.lineTo(cx + 15 * s, cy + 4 * s); g.stroke();
      g.fillStyle = '#f6d58a'; g.font = `bold ${Math.round(5 * s)}px ${FONT}`; g.fillText('ROAST', 2, H0 - 6);
    });
    const [hx, hy] = P(x + 0.2 + bw * 0.5, y + 0.2 + d * 0.4, H0 + 2);
    ctx.fillStyle = '#c4cbd2'; ctx.beginPath(); ctx.moveTo(hx - 5 * s, hy); ctx.lineTo(hx + 5 * s, hy); ctx.lineTo(hx + 11 * s, hy - 15 * s); ctx.lineTo(hx - 11 * s, hy - 15 * s); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OL; ctx.stroke();
    ctx.fillStyle = '#5b8a3a'; ctx.beginPath(); ctx.ellipse(hx, hy - 15 * s, 11 * s, 3.4 * s, 0, 0, 7); ctx.fill();
    const tx = x + 0.2 + bw + 0.55 * s, ty = y + 0.2 + d * 0.55;
    for (const [lx, ly] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) sbox(ctx, tx + lx * s, ty + ly * s, 0, 0.06, 0.06, 14 * s, '#7d858c');
    cylinder(ctx, tx, ty, 14 * s, 0.55 * s, 4, '#c4cbd2', '#9aa1a7', OL);
    ellipseFloor(ctx, tx, ty, 0.48 * s, 0.48 * s, 18 * s + 0.1, '#6b3f26');
    const a = t * 1.5, [ax, ay] = P(tx, ty, 18 * s + 1), [bx2, by2] = P(tx + Math.cos(a) * 0.45 * s, ty + Math.sin(a) * 0.45 * s, 18 * s + 1); line(ctx, [ax, ay], [bx2, by2], '#d9dde1', 1.6);
    const [cx, cy] = P(x + 0.38, y + 0.38, H0 + 46 * s); for (let k = 0; k < 3; k++) { const p = (t * 0.3 + k / 3) % 1; ctx.fillStyle = `rgba(210,200,190,${0.4 * (1 - p)})`; ctx.beginPath(); ctx.arc(cx + Math.sin(t + k) * 4, cy - p * 26, 4 + p * 8, 0, 7); ctx.fill(); }
  }, (f) => f.x + f.y + 2 * (f.s || 1));
  /** 생두 자루 (원산지 도장) */
  prop('ib_beanSacks', (ctx, f) => {
    const { x, y, w } = f, names = ['에티오피아', '콜롬비아', '브라질', '케냐', '과테말라'];
    for (let i = 0; i < w; i++) {
      bx(ctx, x + i + 0.06, y + 0.12, 0, 0.88, 0.76, 13, '#cfb282');
      const [sx, sy] = P(x + i + 0.5, y + 0.5, 13); ctx.fillStyle = '#c4a576'; ctx.beginPath(); ctx.ellipse(sx, sy - 1, 18, 7, 0, 0, 7); ctx.fill();
      onPlaneY(ctx, x + i + 0.1, y + 0.88, 11, (g) => { g.fillStyle = '#5a3a22'; g.font = `bold 4.5px ${FONT}`; g.fillText(names[(i + (f.seed || 0)) % names.length], 2, 6); g.strokeStyle = '#5a3a22'; g.lineWidth = 0.6; g.strokeRect(1, 1, 24, 7.5); });
      if ((i + (f.seed || 0)) % 2 === 0) { bx(ctx, x + i + 0.12, y + 0.2, 13, 0.76, 0.62, 10, '#d6bb8c'); }
    }
  }, null, { slice: 0.7 });
  /** 핸드드립 바 (드리퍼 · 서버 · 주전자) */
  prop('ib_brewBar', (ctx, f, t) => {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.8, 26, '#f4f1ec', '#8a6247', '#7a5540', OL);
    box(ctx, x - 0.05, y - 0.05, 26, w + 0.1, 0.9, 2.5, '#e9dcc3', '#d9c7a4', '#cdb894');
    for (let i = 0.5; i < w; i += 1.2) {
      cylinder(ctx, x + i, y + 0.4, 28.5, 0.13, 8, 'rgba(220,240,250,0.5)', 'rgba(200,225,240,0.45)', 'rgba(90,110,130,0.4)');
      const [sx, sy] = P(x + i, y + 0.4, 37); ctx.fillStyle = '#f4f6f8'; ctx.beginPath(); ctx.moveTo(sx - 6, sy - 6); ctx.lineTo(sx + 6, sy - 6); ctx.lineTo(sx + 1.5, sy); ctx.lineTo(sx - 1.5, sy); ctx.fill(); ctx.strokeStyle = OL; ctx.stroke();
      const p = (t * 1.3 + i) % 1; ctx.fillStyle = '#6b3f26'; ctx.fillRect(sx - 0.5, sy, 1, 4 * p + 1);
      const [kx, ky] = P(x + i + 0.45, y + 0.3, 28.5); ctx.fillStyle = '#2b2f33'; ctx.beginPath(); ctx.ellipse(kx, ky - 4, 4, 4.5, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#2b2f33'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(kx - 3, ky - 4); ctx.quadraticCurveTo(kx - 9, ky - 6, kx - 9, ky - 12); ctx.stroke();
    }
  }, null, { slice: 0.9 });
  /** 커핑 테이블 */
  prop('ib_cuppingTable', (ctx, f) => {
    const { x, y, w } = f;
    shadowR(ctx, x, y, w, 1); legs(ctx, x, y, w, 1, 22, '#8a6247');
    box(ctx, x, y, 22, w, 1, 2.5, '#d9c3a0', '#c4ab86', '#b39a76', OL);
    for (let i = 0.3; i < w - 0.1; i += 0.5) for (const j of [0.3, 0.7]) { cylinder(ctx, x + i, y + j, 24.5, 0.09, 3.5, '#4a2a19', '#f4f1ec'); }
  }, null, { slice: 0.6 });
  /** 3단 데크 오븐 (빵이 보이는 창) */
  prop('ib_deckOven', (ctx, f, t) => {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 1.2, 54, '#d9dde1', '#c4c9cd', '#b5bbc0', OL);
    onPlaneY(ctx, x, y + 1.2, 52, (g) => {
      const Wl = w * 32;
      for (let k = 0; k < 3; k++) {
        const top = 4 + k * 15; g.fillStyle = '#9aa1a7'; g.fillRect(3, top, Wl - 14, 12);
        const fl = 0.75 + 0.25 * Math.sin(t * 3 + k); g.fillStyle = `rgba(255,${150 + 40 * fl},70,0.9)`; g.fillRect(6, top + 3, Wl - 20, 7);
        for (let i = 10; i < Wl - 18; i += 12) { g.fillStyle = '#c9893f'; g.beginPath(); g.ellipse(i, top + 7.5, 4.5, 2.2, 0, 0, 7); g.fill(); }
        g.fillStyle = '#5d6166'; g.fillRect(4, top + 1, Wl - 16, 1.4);
      }
      g.fillStyle = '#2b2f33'; g.fillRect(Wl - 9, 6, 6, 40); g.fillStyle = '#ff6b5b'; g.font = `4px ${FONT}`; g.fillText('230', Wl - 9, 14);
    });
  }, null, { slice: 1.1 });
  /** 스탠드 반죽기 */
  prop('ib_mixer', (ctx, f, t) => {
    const { x, y } = f;
    box(ctx, x - 0.3, y - 0.3, 0, 0.6, 0.6, 6, '#e1e5e9', '#c4c9cd', '#b5bbc0', OL);
    box(ctx, x + 0.1, y - 0.25, 6, 0.2, 0.5, 34, '#e5534b', '#c9443d', '#b23a34', OL);
    box(ctx, x - 0.25, y - 0.25, 34, 0.55, 0.5, 8, '#e5534b', '#c9443d', '#b23a34', OL);
    cylinder(ctx, x - 0.1, y, 8, 0.24, 14, '#e9edf1', '#c4c9cd', OL);
    ellipseFloor(ctx, x - 0.1, y, 0.2, 0.2, 22.1, '#f2dfb8');
    const [sx, sy] = P(x - 0.1, y, 34), a = Math.sin(t * 8) * 3; line(ctx, [sx, sy], [sx + a, sy + 10], '#9aa1a7', 1.6);
  }, (f) => f.x + f.y + 0.3);
  /** 반죽 작업대 (밀가루 · 반죽 · 밀대) */
  prop('ib_doughTable', (ctx, f) => {
    const { x, y, w } = f, d = f.d || 1, r = AIO.rand(f.seed || 4);
    shadowR(ctx, x, y, w, d); legs(ctx, x, y, w, d, 22, '#8a6247');
    box(ctx, x, y, 22, w, d, 3, '#e3c99c', '#c9ab7c', '#b8996c', OL);
    for (let i = 0; i < w * 6; i++) dot(ctx, x + 0.1 + r() * (w - 0.2), y + 0.1 + r() * (d - 0.2), 25.05, 1.2 + r() * 2, 'rgba(255,255,255,0.55)');
    for (let i = 0.4; i < w - 0.3; i += 0.8) { const [sx, sy] = P(x + i, y + d / 2, 25); ctx.fillStyle = '#f2dfb8'; ctx.beginPath(); ctx.ellipse(sx, sy - 2, 6, 3.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(sx - 2, sy - 3.5, 2, 1, 0, 0, 7); ctx.fill(); }
    line(ctx, P(x + w - 0.6, y + 0.2, 26.5), P(x + w - 0.2, y + 0.8, 26.5), '#a87a52', 3);
  }, null, { slice: 0.6 });
  /** 빵 식힘 랙 (바퀴 달린 트롤리) */
  prop('ib_breadRack', (ctx, f) => {
    const { x, y } = f, w = 1.5, r = AIO.rand(x * 7 + y);
    for (const [lx, ly] of [[0.05, 0.05], [w - 0.11, 0.05], [0.05, 0.5], [w - 0.11, 0.5]]) sbox(ctx, x + lx, y + ly, 0, 0.06, 0.06, 56, '#9aa1a7');
    for (let z = 6; z < 56; z += 10) {
      box(ctx, x, y, z, w, 0.6, 1, '#c4c9cd', '#b5bbc0', '#a9b0b6');
      for (let i = 0.2; i < w - 0.1; i += 0.35) { const [sx, sy] = P(x + i, y + 0.3, z + 1); ctx.fillStyle = r() < 0.5 ? '#c9893f' : '#e0a95a'; ctx.beginPath(); ctx.ellipse(sx, sy - 2, 5, 2.4, 0.3, 0, 7); ctx.fill(); }
    }
  }, (f) => f.x + 0.75 + f.y + 0.3);
  /** 밀가루 포대 */
  prop('ib_flourSacks', (ctx, f) => {
    const { x, y } = f;
    for (const [dx, z] of [[0.05, 0], [1.0, 0], [0.5, 12]]) { bx(ctx, x + dx, y + 0.12, z, 0.9, 0.76, 12, '#f4f1ec'); onPlaneY(ctx, x + dx + 0.06, y + 0.88, z + 10, (g) => { g.fillStyle = '#4e7cf6'; g.font = `bold 5px ${FONT}`; g.fillText('밀가루', 4, 7); g.fillStyle = '#e5534b'; g.fillRect(4, 1, 18, 1.4); }); }
  }, (f) => f.x + 1 + f.y + 0.5);
  /** 케이크 진열대 (유리 돔) */
  prop('ib_cakeStand', (ctx, f) => {
    const { x, y } = f;
    cylinder(ctx, x, y, 0, 0.32, 3, '#e9e1d3', '#d6ccb6', OL);
    sbox(ctx, x - 0.04, y - 0.04, 3, 0.08, 0.08, 22, '#c4b09a');
    cylinder(ctx, x, y, 25, 0.38, 2, '#ffffff', '#e9e1d3', OL);
    cylinder(ctx, x, y, 27, 0.26, 9, '#fbe3ea', '#f2a7c3');
    const [sx, sy] = P(x, y, 36); ctx.fillStyle = '#e5534b'; ctx.beginPath(); ctx.arc(sx, sy - 1, 2.2, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(220,240,250,0.35)'; ctx.strokeStyle = 'rgba(150,180,200,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(sx, sy + 7, 17, 8.5, 0, 0, Math.PI); ctx.ellipse(sx, sy + 7, 17, 22, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
  }, (f) => f.x + f.y);

  // ================================================================ 소품 — 🗼 초고층 타워
  /** 타워 축소 모형 (2×2) */
  prop('ib_towerModel', (ctx, f, t, I) => {
    const { x, y } = f, r = AIO.rand(17);
    box(ctx, x + 0.1, y + 0.1, 0, 1.8, 1.8, 14, '#2b3a50', '#22303f', '#1b2632', OL);
    box(ctx, x + 0.15, y + 0.15, 14, 1.7, 1.7, 1, '#9fcf8a', '#86b873', '#76a565');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (!(i > 0 && i < 3 && j > 0 && j < 3)) { const h = 6 + r() * 14; box(ctx, x + 0.2 + i * 0.4, y + 0.2 + j * 0.4, 15, 0.3, 0.3, h, '#e9edf1', '#c4d4e0', '#a9bccb', 'rgba(0,0,0,0.12)'); }
    box(ctx, x + 0.75, y + 0.75, 15, 0.5, 0.5, 52, '#bfe0f5', '#8fb8d4', '#7aa3bf', 'rgba(40,70,100,0.4)');
    sbox(ctx, x + 0.97, y + 0.97, 67, 0.06, 0.06, 16, '#c4cbd2');
    const [sx, sy] = P(x + 1, y + 1, 84); ctx.fillStyle = Math.sin(t * 3) > 0 ? '#ff5b5b' : '#7a2a2a'; ctx.beginPath(); ctx.arc(sx, sy, 2, 0, 7); ctx.fill();
    box(ctx, x + 0.1, y + 0.1, 15, 1.8, 1.8, 72, 'rgba(220,240,250,0.12)', 'rgba(210,235,250,0.15)', 'rgba(200,225,240,0.12)', 'rgba(150,180,200,0.45)');
  }, (f) => f.x + f.y + 2);
  /** 층별 안내판 */
  prop('ib_directory', (ctx, f) => {
    const { x, y } = f;
    box(ctx, x - 0.3, y - 0.1, 0, 0.6, 0.2, 4, '#5d6166', '#4f5459', '#41454a');
    box(ctx, x - 0.4, y - 0.05, 4, 0.8, 0.1, 50, '#22384d', '#1b2d3e', '#152431', OL);
    onPlaneY(ctx, x - 0.38, y + 0.06, 52, (g) => {
      g.fillStyle = '#e8f4ff'; g.font = `bold 5px ${FONT}`; g.fillText(f.title || '🗼 층별 안내', 2, 7);
      g.font = `3.6px ${FONT}`; (f.lines || ['R 헬리포트', '스카이라운지', '전망대', '스카이 로비', '오피스', '1F 로비']).forEach((s, i) => { g.fillStyle = i % 2 ? '#9fd3f0' : '#ffffff'; g.fillText(s, 3, 14 + i * 5.5); });
    });
  }, (f) => f.x + f.y);
  /** 헬리콥터 (로터 회전) */
  prop('ib_heli', (ctx, f, t) => {
    const cx = f.x + 1.5, cy = f.y + 1, c = f.color || '#e5534b';
    for (const dy of [-0.45, 0.45]) { line(ctx, P(cx - 1, cy + dy, 2), P(cx + 1, cy + dy, 2), '#3b3f45', 2); for (const dx of [-0.5, 0.5]) line(ctx, P(cx + dx, cy + dy, 2), P(cx + dx, cy + dy * 0.6, 10), '#3b3f45', 1.4); }
    const [tx, ty] = P(cx - 2.2, cy, 26), [bx0, by0] = P(cx - 0.6, cy, 20); ctx.strokeStyle = shade(c, -0.15); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(tx, ty); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = shade(c, -0.2); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - 4, ty - 12); ctx.lineTo(tx + 3, ty - 10); ctx.closePath(); ctx.fill();
    const ta = t * 30; ctx.strokeStyle = 'rgba(60,60,60,0.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(tx + Math.cos(ta) * 7, ty - 2 + Math.sin(ta) * 7); ctx.lineTo(tx - Math.cos(ta) * 7, ty - 2 - Math.sin(ta) * 7); ctx.stroke();
    const [sx, sy] = P(cx, cy, 20);
    const gr = ctx.createRadialGradient(sx - 6, sy - 8, 2, sx, sy, 22); gr.addColorStop(0, shade(c, 0.35)); gr.addColorStop(1, shade(c, -0.15));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(sx, sy, 22, 13, 0, 0, 7); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.ellipse(sx + 9, sy - 2, 10, 8, 0.3, -1.4, 1.2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(sx + 11, sy - 6, 3, 1.6, 0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `bold 6px ${FONT}`; ctx.fillText('AI-1', sx - 14, sy + 4);
    sbox(ctx, cx - 0.04, cy - 0.04, 33, 0.08, 0.08, 6, '#3b3f45');
    const [rx, ry] = P(cx, cy, 40), ra = t * 9;
    ctx.fillStyle = 'rgba(80,80,80,0.12)'; ctx.beginPath(); ctx.ellipse(rx, ry, 70, 35, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2b2f33'; ctx.lineWidth = 2.6; for (const k of [0, Math.PI / 2]) { ctx.beginPath(); ctx.moveTo(rx + Math.cos(ra + k) * 70, ry + Math.sin(ra + k) * 35); ctx.lineTo(rx - Math.cos(ra + k) * 70, ry - Math.sin(ra + k) * 35); ctx.stroke(); }
  }, (f) => f.x + f.y + 2.6, { dynamic: true });
  /** 풍향 자루 */
  prop('ib_windsock', (ctx, f, t) => {
    const { x, y } = f; sbox(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, 52, '#9aa1a7');
    const [sx, sy] = P(x, y, 50), sw = Math.sin(t * 1.5) * 3;
    for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#ffffff' : '#ff7a3a'; const a = 6 - k * 1.2, b = 6 - (k + 1) * 1.2; ctx.beginPath(); ctx.moveTo(sx + k * 7, sy - a + sw * k * 0.3); ctx.lineTo(sx + (k + 1) * 7, sy - b + sw * (k + 1) * 0.3); ctx.lineTo(sx + (k + 1) * 7, sy + b + sw * (k + 1) * 0.3); ctx.lineTo(sx + k * 7, sy + a + sw * k * 0.3); ctx.closePath(); ctx.fill(); }
  }, (f) => f.x + f.y);
  /** 안테나 마스트 (깜빡이는 항공등) */
  prop('ib_mast', (ctx, f, t) => {
    const { x, y } = f, h = f.h || 110;
    for (const [lx, ly] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) line(ctx, P(x + lx, y + ly, 0), P(x + lx * 0.3, y + ly * 0.3, h), '#c4cbd2', 1.2);
    for (let z = 12; z < h; z += 14) { const k = 1 - z / h * 0.7; line(ctx, P(x - 0.18 * k, y + 0.18 * k, z), P(x + 0.18 * k, y - 0.18 * k, z + 12), '#9aa1a7', 0.8); }
    const [sx, sy] = P(x, y, h + 2), on = Math.sin(t * 3 + x) > 0.3;
    ctx.fillStyle = on ? '#ff3b3b' : '#6a2a2a'; ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, 7); ctx.fill(); if (on) glow(ctx, sx, sy, 16, '#ff3b3b', 0.6);
  }, (f) => f.x + f.y);

  // ================================================================ 소품 — 🛏️ 코리빙
  /** 빨래 건조대 */
  prop('ib_dryRack', (ctx, f, t) => {
    const { x, y } = f, w = 1.6;
    for (const px of [x + 0.05, x + w - 0.05]) { line(ctx, P(px, y + 0.1, 0), P(px, y + 0.5, 30), '#c4cbd2', 1.4); line(ctx, P(px, y + 0.9, 0), P(px, y + 0.5, 30), '#c4cbd2', 1.4); }
    for (const z of [22, 30]) line(ctx, P(x, y + 0.5, z), P(x + w, y + 0.5, z), '#9aa1a7', 1);
    for (let i = 0; i < 4; i++) { const px = x + 0.15 + i * 0.36, sw = Math.sin(t * 1.5 + i) * 0.03; poly(ctx, [P(px, y + 0.5 + sw, 30), P(px + 0.3, y + 0.5 + sw, 30), P(px + 0.3, y + 0.5 + sw, 16 + (i % 2) * 4), P(px, y + 0.5 + sw, 16 + (i % 2) * 4)], PAL[(i * 2 + 1) % PAL.length], OL); }
  }, (f) => f.x + 0.8 + f.y + 0.5);
  /** 키친 아일랜드 */
  prop('ib_island', (ctx, f, t) => {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.9, 24, '#ffffff', '#e9e6df', '#dcd7cd', OL);
    box(ctx, x - 0.05, y - 0.05, 24, w + 0.1, 1, 2.5, '#c49a62', '#a87a52', '#8a6247');
    const [sx, sy] = P(x + 0.7, y + 0.45, 26.5); ctx.fillStyle = '#f4f1ec'; ctx.beginPath(); ctx.ellipse(sx, sy, 9, 4.5, 0, 0, 7); ctx.fill(); for (const [dx, c] of [[-3, '#e5534b'], [2, '#f2c230'], [0, '#3fb27f']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx + dx, sy - 2, 2.4, 0, 7); ctx.fill(); }
    box(ctx, x + w * 0.5 - 0.4, y + 0.2, 26.5, 0.8, 0.5, 0.8, '#d9b98c', '#c4a576', '#b39466');
    cylinder(ctx, x + w - 0.6, y + 0.45, 26.5, 0.22, 7, '#5d6166', '#4f5459', OL);
    const [px, py] = P(x + w - 0.6, y + 0.45, 34); for (let k = 0; k < 2; k++) { const p = (t * 0.5 + k / 2) % 1; ctx.fillStyle = `rgba(255,255,255,${0.4 * (1 - p)})`; ctx.beginPath(); ctx.arc(px, py - p * 16, 3 + p * 5, 0, 7); ctx.fill(); }
  }, null, { slice: 0.9 });
  /** 옷장 */
  prop('ib_wardrobe', (ctx, f) => {
    const { x, y } = f, c = f.color || '#e9dcc3';
    box(ctx, x + 0.05, y + 0.1, 0, 0.9, 0.6, 58, shade(c, 0.08), shade(c, -0.06), shade(c, -0.16), OL);
    onPlaneY(ctx, x + 0.05, y + 0.7, 56, (g) => { g.strokeStyle = 'rgba(90,60,30,0.35)'; g.strokeRect(1.5, 1.5, 12, 52); g.strokeRect(15, 1.5, 12, 52); g.fillStyle = '#b8955f'; g.fillRect(12, 26, 1.2, 6); g.fillRect(15.8, 26, 1.2, 6); });
  }, (f) => f.x + 0.5 + f.y + 0.4);
  /** 홈시네마 스크린 (서쪽 바깥벽 · 커튼) */
  prop('ib_cinemaX', (ctx, f, t) => {
    onPlaneX(ctx, 0.04, f.y0, 96, (g) => {
      const Wl = f.len * 32, Hh = 70;
      g.fillStyle = '#7a1f2a'; g.fillRect(-6, -6, Wl + 12, Hh + 14);
      g.fillStyle = '#16181b'; g.fillRect(6, 0, Wl - 12, Hh - 4);
      const sw = Wl - 16, sh = Hh - 10, ox = 8, oy = 2;
      const gr = g.createLinearGradient(0, oy, 0, oy + sh); gr.addColorStop(0, '#f7b267'); gr.addColorStop(1, '#f4845f'); g.fillStyle = gr; g.fillRect(ox, oy, sw, sh);
      g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(ox + sw * 0.7, oy + sh * 0.55, 10, 0, 7); g.fill();
      g.fillStyle = '#3d405b'; g.beginPath(); g.moveTo(ox, oy + sh); for (let u = 0; u <= sw; u += 10) g.lineTo(ox + u, oy + sh * 0.68 + Math.sin(u * 0.05) * 6); g.lineTo(ox + sw, oy + sh); g.fill();
      const px = ox + ((t * 14) % (sw + 30)) - 15; g.fillStyle = '#2b2622'; g.fillRect(px, oy + sh * 0.7, 14, 5); g.beginPath(); g.arc(px + 3, oy + sh * 0.7 + 6, 2.2, 0, 7); g.arc(px + 11, oy + sh * 0.7 + 6, 2.2, 0, 7); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.25)'; for (let v = oy; v < oy + sh; v += 3) g.fillRect(ox, v, sw, 1);
      g.fillStyle = '#a8323e'; for (const [a, b] of [[-6, 10], [Wl - 10, Wl + 6]]) { g.fillRect(a, -6, b - a, Hh + 14); g.fillStyle = 'rgba(0,0,0,0.18)'; for (let u = a + 2; u < b; u += 4) g.fillRect(u, -6, 1.2, Hh + 14); g.fillStyle = '#a8323e'; }
      g.fillStyle = '#f6d58a'; g.font = `bold 7px ${FONT}`; g.fillText('🎬 오늘의 영화 · AI 오디세이', 14, -10);
    });
  }, WEST);
  /** 리클라이너 (-x 를 봄 · 등받이는 +x 쪽) */
  prop('ib_recliner', (ctx, f) => {
    const { x, y } = f, c = f.color || '#a8323e';
    box(ctx, x - 0.35, y - 0.32, 0, 0.62, 0.64, 10, shade(c, 0.12), shade(c, -0.05), shade(c, -0.18), OL);
    box(ctx, x - 0.55, y - 0.25, 3, 0.22, 0.5, 5, shade(c, 0.12), shade(c, -0.05), shade(c, -0.18), OL);
    for (const dy of [-0.38, 0.3]) box(ctx, x - 0.3, y + dy, 10, 0.55, 0.08, 6, shade(c, 0.05), shade(c, -0.1), shade(c, -0.22), OL);
    box(ctx, x + 0.2, y - 0.34, 8, 0.16, 0.68, 22, shade(c, 0.12), shade(c, -0.05), shade(c, -0.18), OL);
  }, (f) => f.x + f.y + 0.25);
  /** 팝콘 기계 */
  prop('ib_popcorn', (ctx, f, t) => {
    const { x, y } = f;
    box(ctx, x - 0.35, y - 0.3, 6, 0.7, 0.6, 22, '#e5534b', '#c9443d', '#b23a34', OL);
    for (const [lx, ly] of [[-0.3, -0.25], [0.3, 0.25]]) dot(ctx, x + lx, y + ly, 3, 3, '#2b2f33');
    box(ctx, x - 0.32, y - 0.27, 28, 0.64, 0.54, 20, 'rgba(255,250,230,0.3)', 'rgba(255,250,230,0.25)', 'rgba(255,250,230,0.2)', '#c9443d');
    const r = AIO.rand(3); for (let k = 0; k < 16; k++) dot(ctx, x - 0.25 + r() * 0.5, y - 0.2 + r() * 0.4, 28 + r() * 8 + Math.abs(Math.sin(t * 6 + k)) * 2, 1.6, '#fff3c4');
    box(ctx, x - 0.36, y - 0.31, 48, 0.72, 0.62, 3, '#e5534b', '#c9443d', '#b23a34');
    onPlaneY(ctx, x - 0.33, y + 0.3, 24, (g) => { g.fillStyle = '#fff3c4'; g.font = `bold 5px ${FONT}`; g.fillText('POPCORN', 1, 8); });
  }, (f) => f.x + f.y + 0.3);
  /** 빔프로젝터 (스탠드) */
  prop('ib_projector', (ctx, f, t) => {
    const { x, y } = f;
    cylinder(ctx, x, y, 0, 0.25, 2, '#3b3f45', '#2d3035', OL); sbox(ctx, x - 0.03, y - 0.03, 2, 0.06, 0.06, 36, '#5d6166');
    box(ctx, x - 0.25, y - 0.2, 38, 0.5, 0.4, 8, '#f4f6f8', '#e1e5e9', '#d2d7dc', OL);
    const [lx, ly] = P(x - 0.25, y, 42); ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.arc(lx, ly, 2.6, 0, 7); ctx.fill(); glow(ctx, lx, ly, 14, '#bfe8ff', 0.4 + 0.1 * Math.sin(t * 5));
  }, (f) => f.x + f.y);
  /** 허수아비 */
  prop('ib_scarecrow', (ctx, f, t) => {
    const { x, y } = f, sw = Math.sin(t * 1.2) * 0.05;
    sbox(ctx, x - 0.03, y - 0.03, 0, 0.06, 0.06, 40, '#8a6247');
    line(ctx, P(x - 0.45, y + sw, 32), P(x + 0.45, y - sw, 32), '#8a6247', 2.2);
    poly(ctx, [P(x - 0.25, y, 36), P(x + 0.25, y, 36), P(x + 0.2, y, 20), P(x - 0.2, y, 20)], '#4e7cf6', OL);
    const [hx, hy] = P(x, y, 44); ctx.fillStyle = '#f2dfb8'; ctx.beginPath(); ctx.arc(hx, hy, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#2b2622'; ctx.fillRect(hx - 3, hy - 1, 1.4, 1.4); ctx.fillRect(hx + 1.6, hy - 1, 1.4, 1.4);
    ctx.fillStyle = '#e0b84f'; ctx.beginPath(); ctx.ellipse(hx, hy - 5, 11, 3, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(hx, hy - 7, 6, 4, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#e5534b'; ctx.fillRect(hx - 6, hy - 7, 12, 1.6);
  }, (f) => f.x + f.y);
  /** 신발장 */
  prop('ib_shoeRack', (ctx, f) => {
    const { x, y, w } = f;
    box(ctx, x, y + 0.1, 0, w, 0.5, 20, '#e9dcc3', '#d6c6a6', '#c4b28e', OL);
    onPlaneY(ctx, x, y + 0.6, 19, (g) => { g.fillStyle = '#c4b28e'; g.fillRect(0, 9, w * 32, 1); for (let i = 0; i < w * 4; i++) for (const v of [3, 13]) { g.fillStyle = PAL[(i * 3 + v) % PAL.length]; g.fillRect(2 + i * 8, v, 6, 4); g.fillStyle = '#ffffff'; g.fillRect(2 + i * 8, v + 3, 6, 1); } });
  }, null, { slice: 0.4 });
  /** 코르크 게시판 (서쪽 바깥벽) */
  prop('ib_corkBoardX', (ctx, f) => {
    onPlaneX(ctx, 0.04, f.y0, 86, (g) => {
      g.fillStyle = '#8a6247'; g.fillRect(-3, -3, 76, 46); g.fillStyle = '#d9b07a'; g.fillRect(0, 0, 70, 40);
      [['🗑️ 분리수거 화·금', '#fff3a0', 3, 3], ['🍕 금요일 파티!', '#ffd1dc', 36, 4], ['🧺 세탁기 3번 고장', '#c9f2d0', 5, 21], ['🎬 토요일 영화', '#cfe3ff', 38, 22]].forEach(([s, c, u, v]) => { g.fillStyle = c; g.fillRect(u, v, 30, 15); g.fillStyle = '#e5534b'; g.beginPath(); g.arc(u + 15, v + 1.5, 1.5, 0, 7); g.fill(); g.fillStyle = '#2b2622'; g.font = `3.6px ${FONT}`; g.fillText(s, u + 1.5, v + 9); });
    });
  }, WEST);

  // ================================================================ 소품 — 📦 컨테이너
  /** 팝업 옷걸이 */
  prop('ib_popRack', (ctx, f) => {
    const { x, y, w } = f;
    for (const px of [x + 0.1, x + w - 0.1]) { sbox(ctx, px - 0.03, y + 0.47, 0, 0.06, 0.06, 40, '#2b2b2b'); line(ctx, P(px - 0.2, y + 0.5, 0), P(px + 0.2, y + 0.5, 0), '#2b2b2b', 1.6); }
    line(ctx, P(x + 0.1, y + 0.5, 40), P(x + w - 0.1, y + 0.5, 40), '#9aa1a7', 1.6);
    for (let i = 0; i < Math.floor((w - 0.3) / 0.28); i++) { const px = x + 0.25 + i * 0.28, c = PAL[(i * 3 + Math.round(x)) % PAL.length]; const [hx, hy] = P(px, y + 0.5, 40); ctx.strokeStyle = '#7d858c'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(hx, hy + 1.5, 1.5, Math.PI, 0); ctx.stroke(); poly(ctx, [P(px - 0.12, y + 0.42, 37), P(px + 0.12, y + 0.58, 37), P(px + 0.12, y + 0.58, 18), P(px - 0.12, y + 0.42, 18)], c, OL); }
  }, null, { slice: 0.5 });
  /** 팝업 진열 테이블 (운동화 · 박스) */
  prop('ib_popTable', (ctx, f) => {
    const { x, y, w } = f, d = f.d || 1;
    box(ctx, x, y, 0, w, d, 22, '#2b2b2b', '#1d1d1d', '#141414', OL);
    for (let i = 0.25; i < w - 0.2; i += 0.55) { bx(ctx, x + i, y + 0.25, 22, 0.42, 0.25, 6, PAL[Math.round(i * 7) % PAL.length]); box(ctx, x + i, y + 0.25, 28, 0.42, 0.25, 0.8, '#ffffff', '#eeeeee', '#dddddd'); }
    onPlaneY(ctx, x + 0.1, y + d, 20, (g) => { g.fillStyle = '#ff5fd2'; g.font = `bold 6px ${FONT}`; g.fillText('POP-UP ✦ LIMITED', 3, 10); });
  }, null, { slice: 0.6 });
  /** 나무 상자 더미 (n: 1~3단) */
  prop('ib_crate', (ctx, f) => {
    const { x, y } = f, n = f.n || 1;
    for (let k = 0; k < n; k++) { const ox = (k % 2) * 0.06; box(ctx, x - 0.4 + ox, y - 0.4, k * 16, 0.8, 0.8, 16, '#d9b07a', '#c49a62', '#a87a52', OL); onPlaneY(ctx, x - 0.4 + ox, y + 0.4, k * 16 + 16, (g) => { g.strokeStyle = 'rgba(90,60,30,0.45)'; g.lineWidth = 0.8; g.strokeRect(1, 1, 23, 14); g.beginPath(); g.moveTo(1, 1); g.lineTo(24, 15); g.stroke(); }); }
  }, (f) => f.x + f.y + 0.3);
  /** 3D 프린터 (헤드가 움직이며 출력물이 자람) */
  prop('ib_printer3d', (ctx, f, t) => {
    const { x, y } = f, x0 = x + 0.1, y0 = y + 0.1, w = 0.8;
    box(ctx, x0, y0, 0, w, w, 8, '#3b3f45', '#2d3035', '#26292d', OL);
    for (const [lx, ly] of [[0, 0], [w - 0.05, 0]]) sbox(ctx, x0 + lx, y0 + ly, 8, 0.05, 0.05, 34, '#2b2f33');
    const p = (t * 0.08) % 1, h = 2 + p * 14;
    cylinder(ctx, x0 + w / 2, y0 + w / 2, 8, 0.16, h, '#ff9a5a', '#e9772f');
    const hx = x0 + w / 2 + Math.sin(t * 5) * 0.12, hy = y0 + w / 2 + Math.cos(t * 4) * 0.12;
    line(ctx, P(x0, hy, 10 + h), P(x0 + w, hy, 10 + h), '#9aa1a7', 1.2);
    box(ctx, hx - 0.08, hy - 0.08, 10 + h, 0.16, 0.16, 5, '#e5534b', '#c9443d', '#b23a34');
    for (const [lx, ly] of [[0, w - 0.05], [w - 0.05, w - 0.05]]) sbox(ctx, x0 + lx, y0 + ly, 8, 0.05, 0.05, 34, '#2b2f33');
    box(ctx, x0, y0, 42, w, w, 2, '#2b2f33', '#1d2126', '#16181b');
    cylinder(ctx, x0 + w - 0.12, y0 + 0.2, 44, 0.12, 4, '#ff9a5a', '#e9772f');
  }, (f) => f.x + f.y + 0.6);
  /** 공구 벽 (axis 'y' = 뒷벽 · 'x' 서쪽 바깥벽) */
  prop('ib_toolWall', (ctx, f) => {
    const draw = (g) => {
      const Wl = (f.w || 4) * 32, Hh = 40, r = AIO.rand(13);
      g.fillStyle = '#d9b07a'; g.fillRect(0, 0, Wl, Hh); g.fillStyle = 'rgba(90,60,30,0.35)';
      for (let u = 3; u < Wl; u += 5) for (let v = 3; v < Hh; v += 5) g.fillRect(u, v, 1, 1);
      for (let u = 6; u < Wl - 8; u += 13) {
        const k = Math.floor(r() * 4); g.fillStyle = ['#e5534b', '#3b3f45', '#4e7cf6', '#f2c230'][k];
        if (k === 0) { g.fillRect(u, 6, 3, 18); g.fillRect(u - 3, 6, 9, 5); } else if (k === 1) { g.fillRect(u + 1, 8, 2.4, 20); g.beginPath(); g.arc(u + 2.2, 8, 3.4, 0, 7); g.fill(); } else if (k === 2) { g.fillRect(u, 10, 3, 14); g.fillRect(u - 1, 6, 5, 5); } else { g.beginPath(); g.moveTo(u, 26); g.lineTo(u + 8, 26); g.lineTo(u + 4, 8); g.fill(); }
      }
      g.fillStyle = '#2b2622'; g.font = `bold 5px ${FONT}`; g.fillText('🛠️ 공구 제자리!', 3, Hh - 3);
    };
    if (f.axis === 'x') onPlaneX(ctx, 0.04, f.y0, 90, draw); else onPlaneY(ctx, f.x, 0.04, 90, draw);
  }, () => -5000);
  /** 철제 작업대 (바이스 · 공구) */
  prop('ib_workbench', (ctx, f) => {
    const { x, y, w } = f;
    shadowR(ctx, x, y, w, 0.9); legs(ctx, x, y, w, 0.9, 22, '#5d6670');
    box(ctx, x, y + 0.1, 6, w, 0.7, 1, '#7d858c', '#6d757c', '#5d6670');
    box(ctx, x, y, 22, w, 0.9, 3, '#c49a62', '#a87a52', '#8a6247', OL);
    box(ctx, x + 0.2, y + 0.1, 25, 0.35, 0.3, 6, '#4e7cf6', '#3f68d0', '#2f55b0');
    for (let i = 1; i < w - 0.3; i += 0.9) { line(ctx, P(x + i, y + 0.45, 25.2), P(x + i + 0.4, y + 0.6, 25.2), '#3b3f45', 1.8); dot(ctx, x + i + 0.2, y + 0.3, 25.5, 1.4, '#e5534b'); }
  }, null, { slice: 0.8 });
  /** 레이저 커터 (2×1) */
  prop('ib_laserCutter', (ctx, f, t) => {
    const { x, y } = f;
    box(ctx, x + 0.05, y + 0.1, 0, 1.9, 0.8, 22, '#e9edf1', '#d2d8de', '#c4cbd2', OL);
    box(ctx, x + 0.1, y + 0.15, 22, 1.8, 0.7, 6, 'rgba(255,170,90,0.35)', 'rgba(255,160,80,0.3)', 'rgba(255,150,70,0.3)', 'rgba(120,80,40,0.5)');
    const [lx, ly] = P(x + 0.4 + (Math.sin(t * 2) * 0.5 + 0.5) * 1.2, y + 0.3 + (Math.cos(t * 3) * 0.5 + 0.5) * 0.3, 22.5);
    ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(lx, ly, 1.6, 0, 7); ctx.fill(); glow(ctx, lx, ly, 8, '#ff3b3b', 0.6);
    onPlaneY(ctx, x + 1.4, y + 0.9, 18, (g) => { g.fillStyle = '#16181b'; g.fillRect(0, 0, 12, 7); g.fillStyle = '#4ef08a'; g.font = `3.5px ${FONT}`; g.fillText('CUT', 2, 5); });
  }, (f) => f.x + 1 + f.y + 0.5);
  /** 반쯤 잘라 만든 컨테이너 바 (w×2 · 맥주탭 · 네온) */
  prop('ib_pubBar', (ctx, f, t, I) => {
    const { x, y } = f, w = f.w || 5, c = f.color || '#2f7fbf', Hh = 56;
    box(ctx, x, y, 0, w, 0.15, Hh, shade(c, 0.1), shade(c, -0.05), shade(c, -0.18), OL);
    onPlaneY(ctx, x, y + 0.15, Hh, (g) => {
      const Wl = w * 32; g.fillStyle = shade(c, -0.25); g.fillRect(0, 0, Wl, Hh);
      g.fillStyle = 'rgba(0,0,0,0.18)'; for (let u = 2; u < Wl; u += 5) g.fillRect(u, 0, 2, Hh);
      g.fillStyle = '#6b4a35'; for (const v of [16, 28]) g.fillRect(4, v, Wl - 8, 2);
      for (let u = 8; u < Wl - 8; u += 7) for (const v of [16, 28]) { g.fillStyle = PAL[(u + v) % PAL.length]; g.fillRect(u, v - 7, 3, 7); }
      const on = isNight(I); g.save(); if (on) { g.shadowColor = '#ff5fd2'; g.shadowBlur = 8; } g.fillStyle = '#ff7ae0'; g.font = `bold 9px ${FONT}`; g.fillText('🍺 ROOFTOP PUB', Wl / 2 - 36, 10); g.restore();
    });
    for (const px of [x, x + w - 0.15]) box(ctx, px, y, 0, 0.15, 2, Hh, shade(c, 0.1), shade(c, -0.05), shade(c, -0.18), OL);
    box(ctx, x + 0.3, y + 1.25, 0, w - 0.6, 0.6, 24, '#c49a62', '#a87a52', '#8a6247', OL);
    box(ctx, x + 0.25, y + 1.2, 24, w - 0.5, 0.7, 2.5, '#6b4a35', '#5a3e2c', '#4d3526');
    for (let i = 0; i < 3; i++) { const px = x + 1 + i * ((w - 2) / 2); sbox(ctx, px - 0.04, y + 1.4, 26.5, 0.08, 0.08, 9, '#d9dde1'); const [hx, hy] = P(px, y + 1.44, 37); ctx.fillStyle = ['#f2c230', '#e5534b', '#3b332b'][i]; roundRect(ctx, hx - 2, hy - 6, 4, 8, 1.5); ctx.fill(); }
    box(ctx, x - 0.05, y - 0.05, Hh, w + 0.1, 2.1, 4, shade(c, 0.15), shade(c, -0.05), shade(c, -0.18), OL);
  }, null, { slice: 1 });
  /** 케이블 릴 테이블 */
  prop('ib_spool', (ctx, f) => {
    const { x, y } = f;
    cylinder(ctx, x, y, 0, 0.42, 3, '#c49a62', '#a87a52', OL);
    cylinder(ctx, x, y, 3, 0.2, 13, '#d9b07a', '#b8894f');
    cylinder(ctx, x, y, 16, 0.46, 3, '#d9b07a', '#a87a52', OL);
    ellipseFloor(ctx, x, y, 0.3, 0.3, 19.1, null, 'rgba(90,60,30,0.3)');
    cylinder(ctx, x + 0.1, y - 0.05, 19, 0.06, 6, 'rgba(255,220,120,0.9)', 'rgba(240,200,90,0.8)');
  }, (f) => f.x + f.y);
  /** 네온 사인 (axis 'x' 서쪽 바깥벽 · 'y' 벽) */
  prop('ib_neon', (ctx, f, t, I) => {
    const draw = (g) => {
      const c = f.color || '#ff5fd2', on = isNight(I) || f.always, fl = Math.sin(t * 13) > -0.9 ? 1 : 0.4;
      g.font = `bold ${f.size || 14}px ${FONT}`;
      const tw = g.measureText(f.text).width;
      g.fillStyle = 'rgba(20,16,26,0.85)'; roundRect(g, -6, -(f.size || 14) - 4, tw + 12, (f.size || 14) + 12, 4); g.fill();
      g.save(); g.shadowColor = c; g.shadowBlur = on ? 14 : 7; g.globalAlpha = fl; g.strokeStyle = c; g.lineWidth = 2.2; g.strokeText(f.text, 0, 0); g.fillStyle = '#ffffff'; g.fillText(f.text, 0, 0); g.restore();
    };
    if (f.axis === 'x') onPlaneX(ctx, (f.x || 0) + 0.05, f.y, f.z || 86, draw); else onPlaneY(ctx, f.x, f.y + 0.05, f.z || 86, draw);
  }, (f) => (f.west ? -4900 : f.x + f.y + 0.6));

  // ================================================================ 소품 — 🎵 뮤직 레이블
  /** 라이브 무대 (y 방향 · 서쪽 벽에 붙임 · 관객은 +x 쪽) */
  prop('ib_liveStageY', (ctx, f, t) => {
    const { x, y, w, d } = f;
    box(ctx, x, y, 0, w, d, 6, '#2b2622', '#221e1b', '#1a1715', OL);
    for (let j = 0; j < d; j += 0.5) { const [a, b] = P(x + w, y + j + 0.25, 3); ctx.fillStyle = `hsl(${(t * 80 + j * 40) % 360},90%,62%)`; ctx.beginPath(); ctx.arc(a, b, 1.6, 0, 7); ctx.fill(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const ly = y + 1 + k * (d - 2) / 3, sy2 = y + d / 2 + Math.sin(t * 0.9 + k * 1.7) * d * 0.35, sx2 = x + w * 0.55 + Math.cos(t * 1.1 + k) * 0.6;
      const a = P(0.3, ly - 0.15, 92), b = P(0.3, ly + 0.15, 92), c1 = P(sx2 - 0.6, sy2 + 0.6, 6), c2 = P(sx2 + 0.6, sy2 - 0.6, 6);
      ctx.fillStyle = `hsla(${(k * 90 + t * 30) % 360},90%,65%,0.16)`; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c2); ctx.lineTo(...c1); ctx.closePath(); ctx.fill();
      ellipseFloor(ctx, sx2, sy2, 0.7, 0.7, 6.1, `hsla(${(k * 90 + t * 30) % 360},90%,70%,0.25)`);
    }
    ctx.restore();
    const dk = x + 0.9, dj = y + d / 2;
    cylinder(ctx, dk, dj, 6, 0.32, 10, '#f4f6f8', '#e5534b', OL);
    for (const [dx, dy, z] of [[0.35, -0.45, 16], [0.35, 0.45, 16], [0.6, 0, 12]]) cylinder(ctx, dk + dx, dj + dy, 6 + z - 6, 0.17, 6, '#f4f6f8', '#4e7cf6', OL);
    for (const dy of [-0.8, 0.8]) { sbox(ctx, dk + 0.1, dj + dy, 6, 0.04, 0.04, 22, '#9aa1a7'); const [cx, cy] = P(dk + 0.12, dj + dy, 28); ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.ellipse(cx, cy, 8, 3, 0, 0, 7); ctx.fill(); }
    for (const dy of [1.6, d - 1.6]) { box(ctx, x + 0.3, y + dy - 0.35, 6, 0.55, 0.7, 18, '#2b2f33', '#1d2126', '#16181b', OL); onPlaneX(ctx, x + 0.85, y + dy + 0.35, 22, (g) => { g.fillStyle = '#4a4f55'; g.fillRect(2, 2, 18, 12); g.fillStyle = '#f2c230'; g.fillRect(3, 15, 4, 1.5); }); }
    for (const dy of [-1.2, 0, 1.2]) { const mx = x + w - 0.8, my = dj + dy; sbox(ctx, mx - 0.02, my - 0.02, 6, 0.04, 0.04, 34, '#c4cbd2'); const [px, py] = P(mx, my, 40); ctx.fillStyle = '#2b2f33'; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 7); ctx.fill(); }
  }, lowD(0.5));
  /** 공연장 LED 월 (서쪽 바깥벽) */
  prop('ib_ledWallX', (ctx, f, t) => {
    onPlaneX(ctx, 0.04, f.y0, 100, (g) => {
      const Wl = f.len * 32, Hh = 84;
      g.fillStyle = '#0b0a10'; g.fillRect(-2, -2, Wl + 4, Hh + 4);
      g.fillStyle = '#3b3f45'; g.fillRect(-4, -8, Wl + 8, 5); for (let u = 8; u < Wl; u += 24) { g.fillStyle = '#2b2f33'; g.fillRect(u, -4, 6, 6); g.fillStyle = `hsl(${(t * 60 + u) % 360},90%,65%)`; g.fillRect(u + 1, 1, 4, 2); }
      const n = Math.floor(Wl / 7);
      for (let i = 0; i < n; i++) { const v = (Math.sin(t * 6 + i * 0.7) * 0.5 + 0.5) * (Math.sin(t * 2.3 + i * 0.31) * 0.4 + 0.6); const h = v * (Hh - 26); g.fillStyle = `hsl(${(i * 9 + t * 40) % 360},85%,60%)`; for (let k = 0; k < h; k += 4) g.fillRect(i * 7 + 1, Hh - 6 - k, 5, 3); }
      g.save(); g.shadowColor = '#ff5fd2'; g.shadowBlur = 10; g.fillStyle = '#ffffff'; g.font = `bold 13px ${FONT}`; g.textAlign = 'center'; g.fillText(f.text || '♪ LIVE · AI RECORDS', Wl / 2, 18); g.restore(); g.textAlign = 'left';
    });
  }, WEST);
  /** 스피커 (face 'x' = +x 를 봄 · 'y' = +y) */
  prop('ib_speaker', (ctx, f) => {
    const { x, y } = f, s = f.s || 1, w = 0.6 * s, h = 46 * s;
    box(ctx, x - w / 2, y - w / 2, 0, w, w, h, '#2b2f33', '#1d2126', '#16181b', OL);
    const cones = (g, ww) => { for (const [v, r] of [[h * 0.3, 7 * s], [h * 0.68, 9 * s]]) { g.fillStyle = '#4a4f55'; g.beginPath(); g.arc(ww / 2, v, r, 0, 7); g.fill(); g.fillStyle = '#16181b'; g.beginPath(); g.arc(ww / 2, v, r * 0.45, 0, 7); g.fill(); } };
    if (f.face === 'x') onPlaneX(ctx, x + w / 2, y + w / 2, h, (g) => cones(g, w * 32)); else onPlaneY(ctx, x - w / 2, y + w / 2, h, (g) => cones(g, w * 32));
  }, (f) => f.x + f.y + 0.3);
  /** 믹싱 콘솔 (페이더 · 레벨미터 · 모니터 스피커) */
  prop('ib_mixDesk', (ctx, f, t) => {
    const { x, y, w } = f, d = f.d || 1;
    box(ctx, x, y, 0, w, d, 18, '#3b3f45', '#2d3035', '#26292d', OL);
    poly(ctx, [P(x, y, 24), P(x + w, y, 24), P(x + w, y + d, 18), P(x, y + d, 18)], '#2b2f33', OL);
    for (let i = 0.15; i < w - 0.1; i += 0.12) {
      const k = Math.round(i * 10), v = Math.sin(t * 3 + k) * 0.5 + 0.5;
      const a = P(x + i, y + 0.15, 23.2), b = P(x + i, y + d - 0.15, 18.8); line(ctx, a, b, '#16181b', 0.8);
      const fp = 0.3 + 0.4 * (Math.sin(k * 1.7) * 0.5 + 0.5); const [px, py] = P(x + i, y + 0.15 + fp * (d - 0.3), 23.2 - fp * 4.4); ctx.fillStyle = '#d9dde1'; ctx.fillRect(px - 1.2, py - 0.8, 2.4, 1.6);
      const [mx, my] = P(x + i, y + 0.08, 24.5); ctx.fillStyle = v > 0.8 ? '#ff5b5b' : v > 0.5 ? '#f2c230' : '#4ef08a'; ctx.fillRect(mx - 0.8, my - v * 5, 1.6, v * 5);
    }
    for (const px of [x + 0.1, x + w - 0.5]) { box(ctx, px, y + 0.05, 24, 0.4, 0.35, 12, '#2b2f33', '#1d2126', '#16181b', OL); onPlaneY(ctx, px, y + 0.4, 34, (g) => { g.fillStyle = '#4a4f55'; g.beginPath(); g.arc(6.4, 4, 3, 0, 7); g.arc(6.4, 9, 2, 0, 7); g.fill(); }); }
  }, null, { slice: 0.7 });
  /** 드럼 세트 (2×2 · 베이스드럼은 +y) */
  prop('ib_drums', (ctx, f, t) => {
    const { x, y } = f, cx = x + 1, cy = y + 1.1;
    onPlaneY(ctx, cx - 0.4, cy + 0.15, 22, (g) => { g.fillStyle = '#e5534b'; g.beginPath(); g.arc(13, 11, 11, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(13, 11, 8.5, 0, 7); g.fill(); g.fillStyle = '#2b2622'; g.font = `bold 5px ${FONT}`; g.fillText('AI', 9.5, 13); });
    for (const [dx, dy, r, z] of [[-0.55, -0.25, 0.2, 14], [0.55, -0.25, 0.2, 14], [0.75, 0.35, 0.24, 8], [-0.75, 0.3, 0.18, 12]]) { sbox(ctx, cx + dx, cy + dy, 0, 0.04, 0.04, z, '#9aa1a7'); cylinder(ctx, cx + dx, cy + dy, z, r, 6, '#f4f6f8', '#e5534b', OL); }
    for (const [dx, dy, z] of [[-0.9, -0.6, 30], [0.85, -0.55, 32], [-0.95, 0.5, 22]]) { sbox(ctx, cx + dx, cy + dy, 0, 0.03, 0.03, z, '#9aa1a7'); const [sx, sy] = P(cx + dx, cy + dy, z + Math.sin(t * 5 + dx) * 0.8); ctx.fillStyle = '#e2b93b'; ctx.beginPath(); ctx.ellipse(sx, sy, 11, 3.5, 0.1, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(120,90,20,0.5)'; ctx.lineWidth = 0.6; ctx.stroke(); }
    cylinder(ctx, cx, cy - 0.85, 0, 0.18, 11, '#2b2f33', '#3b3f45');
  }, (f) => f.x + f.y + 2);
  /** 기타 앰프 + 기타 */
  prop('ib_amp', (ctx, f) => {
    const { x, y } = f, c = f.color || '#e2b93b';
    box(ctx, x - 0.4, y - 0.25, 0, 0.8, 0.5, 24, '#2b2622', '#221e1b', '#1a1715', OL);
    onPlaneY(ctx, x - 0.4, y + 0.25, 24, (g) => { g.fillStyle = '#c9b48a'; g.fillRect(2, 2, 21.6, 4); g.fillStyle = '#3d3530'; g.fillRect(2, 8, 21.6, 14); g.strokeStyle = 'rgba(255,255,255,0.08)'; for (let u = 3; u < 23; u += 2) { g.beginPath(); g.moveTo(u, 8); g.lineTo(u, 22); g.stroke(); } for (let k = 0; k < 5; k++) { g.fillStyle = '#d9dde1'; g.beginPath(); g.arc(4 + k * 4, 4, 1, 0, 7); g.fill(); } });
    const [gx, gy] = P(x + 0.5, y + 0.3, 0);
    ctx.save(); ctx.translate(gx, gy - 14); ctx.rotate(-0.25);
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 4, 6, 7.5, 0, 0, 7); ctx.ellipse(0, -5, 4.5, 5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, 7); ctx.fill();
    ctx.fillStyle = '#6b4226'; ctx.fillRect(-0.9, -24, 1.8, 20); ctx.fillStyle = '#2b2622'; ctx.fillRect(-1.6, -28, 3.2, 4.5); ctx.restore();
  }, (f) => f.x + f.y + 0.3);
  /** 스탠드에 세운 기타 */
  prop('ib_guitarStand', (ctx, f) => {
    const { x, y } = f, c = f.color || '#4e7cf6', [sx, sy] = P(x, y, 0);
    ctx.strokeStyle = '#3b3f45'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(sx - 6, sy); ctx.lineTo(sx, sy - 14); ctx.lineTo(sx + 6, sy); ctx.stroke();
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(sx, sy - 10, 7, 8.5, 0, 0, 7); ctx.ellipse(sx, sy - 21, 5, 5.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(sx - 3, sy - 13, 1.6, 4, 0.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.arc(sx, sy - 15, 2, 0, 7); ctx.fill(); ctx.fillStyle = '#6b4226'; ctx.fillRect(sx - 1, sy - 42, 2, 24); ctx.fillStyle = '#2b2622'; ctx.fillRect(sx - 2, sy - 47, 4, 5.5);
  }, (f) => f.x + f.y);
  /** 스탠드 마이크 */
  prop('ib_mic', (ctx, f) => {
    const { x, y } = f; ellipseFloor(ctx, x, y, 0.18, 0.18, 0, '#3b3f45'); sbox(ctx, x - 0.02, y - 0.02, 0, 0.04, 0.04, 34, '#c4cbd2');
    const [sx, sy] = P(x, y, 36); ctx.fillStyle = '#2b2f33'; roundRect(ctx, sx - 2.4, sy - 5, 4.8, 8, 2.4); ctx.fill(); ctx.fillStyle = '#9aa1a7'; ctx.beginPath(); ctx.arc(sx, sy - 4.5, 2.8, 0, 7); ctx.fill();
  }, (f) => f.x + f.y);
  /** 녹음 부스 — 뒷벽·흡음재 (사람보다 먼저) */
  prop('ib_vocalBooth', (ctx, f, t) => {
    const { x, y, w, d } = f;
    poly(ctx, [P(x, y, 0.2), P(x + w, y, 0.2), P(x + w, y + d, 0.2), P(x, y + d, 0.2)], '#3a3442');
    box(ctx, x, y, 0, w, 0.12, 62, '#3b3f45', '#2b2f33', '#26292d', OL); box(ctx, x, y, 0, 0.12, d, 62, '#3b3f45', '#2b2f33', '#26292d', OL);
    onPlaneY(ctx, x + 0.12, y + 0.13, 60, (g) => { for (let u = 0; u < (w - 0.12) * 32; u += 8) for (let v = 0; v < 58; v += 8) { g.fillStyle = (u + v) % 16 ? '#4a4458' : '#5a5168'; g.beginPath(); g.moveTo(u, v); g.lineTo(u + 8, v); g.lineTo(u + 4, v + 8); g.fill(); } });
    const mx = x + w / 2, my = y + d / 2; sbox(ctx, mx - 0.02, my - 0.02, 0, 0.04, 0.04, 34, '#c4cbd2'); const [sx, sy] = P(mx, my, 36); ctx.fillStyle = '#9aa1a7'; ctx.beginPath(); ctx.arc(sx, sy - 3, 3, 0, 7); ctx.fill(); ctx.strokeStyle = '#16181b'; ctx.beginPath(); ctx.arc(sx, sy - 3, 6, 0, 7); ctx.stroke();
  }, (f) => f.x + f.y + 0.2);
  /** 녹음 부스 — 유리 앞면 · ON AIR (사람보다 나중) */
  prop('ib_boothGlass', (ctx, f, t) => {
    const { x, y, w, d } = f;
    box(ctx, x + w - 0.08, y, 0, 0.08, d, 62, 'rgba(210,235,250,0.3)', 'rgba(200,225,240,0.25)', 'rgba(190,215,232,0.22)', 'rgba(140,160,175,0.6)');
    box(ctx, x, y + d - 0.08, 0, w, 0.08, 62, 'rgba(210,235,250,0.3)', 'rgba(200,225,240,0.22)', 'rgba(190,215,232,0.22)', 'rgba(140,160,175,0.6)');
    box(ctx, x - 0.04, y - 0.04, 62, w + 0.08, d + 0.08, 4, '#2b2f33', '#1d2126', '#16181b', OL);
    const on = Math.sin(t * 2) > -0.3; onPlaneY(ctx, x + w / 2 - 0.5, y + d, 72, (g) => { g.fillStyle = on ? '#e5534b' : '#5a2a2a'; roundRect(g, 0, 0, 32, 9, 3); g.fill(); g.fillStyle = '#ffffff'; g.font = `bold 6px ${FONT}`; g.fillText('● ON AIR', 4, 7); });
  }, (f) => f.x + f.w + f.y + f.d - 0.3);
  /** LP 진열대 (앨범 커버) */
  prop('ib_lpShelf', (ctx, f) => {
    const { x, y, w } = f, r = AIO.rand(f.seed || 5);
    box(ctx, x, y, 0, w, 0.8, 22, '#8a6247', '#7a5540', '#6b4a35', OL);
    for (let i = 0.1; i < w - 0.2; i += 0.26) { const c = PAL[Math.floor(r() * PAL.length)]; poly(ctx, [P(x + i, y + 0.15, 22), P(x + i + 0.05, y + 0.65, 22), P(x + i + 0.05, y + 0.65, 34), P(x + i, y + 0.15, 34)], shade(c, -0.15), OL); }
    onPlaneY(ctx, x + 0.2, y + 0.8, 20, (g) => { for (let u = 0; u < (w - 0.4) * 32; u += 18) { g.fillStyle = PAL[Math.floor(r() * PAL.length)]; g.fillRect(u, 2, 15, 15); g.fillStyle = '#16181b'; g.beginPath(); g.arc(u + 7.5, 9.5, 4, 0, 7); g.fill(); g.fillStyle = '#f6d58a'; g.beginPath(); g.arc(u + 7.5, 9.5, 1.2, 0, 7); g.fill(); } });
  }, null, { slice: 0.8 });
  /** DJ 턴테이블 2대 */
  prop('ib_turntable', (ctx, f, t) => {
    const { x, y } = f, w = f.w || 2;
    box(ctx, x, y, 0, w, 0.9, 24, '#2b2622', '#221e1b', '#1a1715', OL);
    for (const k of [0, 1]) { const cx = x + 0.45 + k * (w - 0.9); box(ctx, cx - 0.38, y + 0.08, 24, 0.76, 0.74, 2, '#9aa1a7', '#7d858c', '#6d757c'); ellipseFloor(ctx, cx, y + 0.45, 0.32, 0.32, 26.2, '#16181b'); ellipseFloor(ctx, cx, y + 0.45, 0.1, 0.1, 26.3, PAL[k * 2]); const a = t * 4 + k, [sx, sy] = P(cx, y + 0.45, 26.4); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(sx, sy, 10, 5, 0, a, a + 0.8); ctx.stroke(); }
    box(ctx, x + w / 2 - 0.2, y + 0.15, 24, 0.4, 0.6, 3, '#3b3f45', '#2d3035', '#26292d');
  }, (f) => f.x + (f.w || 2) / 2 + f.y + 0.5);
  /** 주크박스 */
  prop('ib_jukebox', (ctx, f, t) => {
    const { x, y } = f;
    box(ctx, x - 0.4, y - 0.3, 0, 0.8, 0.6, 40, '#8a4a2a', '#7a3f22', '#6b361d', OL);
    onPlaneY(ctx, x - 0.4, y + 0.3, 46, (g) => { g.fillStyle = `hsl(${(t * 60) % 360},90%,60%)`; g.beginPath(); g.arc(12.8, 12, 12, Math.PI, 0); g.fill(); g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(12.8, 12, 9, Math.PI, 0); g.fill(); g.fillStyle = '#2b2622'; g.fillRect(4, 14, 17.6, 12); g.fillStyle = `hsl(${(t * 60 + 120) % 360},90%,60%)`; for (let k = 0; k < 4; k++) g.fillRect(5 + k * 4.4, 16, 3, 8); g.fillStyle = '#e2b93b'; g.fillRect(6, 30, 13, 6); });
  }, (f) => f.x + f.y + 0.3);
  /** 골드 레코드 액자 (y 상수 벽 · 사람보다 먼저) */
  prop('ib_recordWall', (ctx, f) => {
    onPlaneY(ctx, f.x, f.y + 0.04, f.z || 42, (g) => {
      for (let u = 0; u < f.w * 32 - 20; u += 26) { g.fillStyle = '#16181b'; g.fillRect(u, 0, 22, 26); g.fillStyle = '#e2b93b'; g.beginPath(); g.arc(u + 11, 11, 8.5, 0, 7); g.fill(); g.fillStyle = '#b8862b'; g.beginPath(); g.arc(u + 11, 11, 2.5, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.font = `3px ${FONT}`; g.fillText('1M', u + 8, 24); }
    });
  }, null, { slice: 0.1 });
  /** 흡음재 (서쪽 바깥벽) */
  prop('ib_foamX', (ctx, f) => {
    onPlaneX(ctx, 0.04, f.y0, 92, (g) => { const Wl = f.len * 32; for (let u = 0; u < Wl; u += 10) for (let v = 0; v < 70; v += 10) { g.fillStyle = (u / 10 + v / 10) % 2 ? '#3d3648' : '#4e4560'; g.fillRect(u, v, 9.5, 9.5); g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.moveTo(u, v); g.lineTo(u + 9.5, v); g.lineTo(u + 4.75, v + 4.75); g.fill(); } });
  }, WEST);
  /** 버스킹 무대 (둥근 낮은 무대 3×3 · 기타 케이스) */
  prop('ib_buskStage', (ctx, f, t) => {
    const cx = f.x + 1.5, cy = f.y + 1.5;
    cylinder(ctx, cx, cy, 0, 1.35, 6, '#b98c5e', '#8a6247', OL);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, [px, py] = P(cx + Math.cos(a) * 1.3, cy + Math.sin(a) * 1.3, 6); ctx.fillStyle = Math.sin(t * 4 + k) > 0 ? '#ffe39a' : '#c49a62'; ctx.beginPath(); ctx.arc(px, py, 1.4, 0, 7); ctx.fill(); }
    box(ctx, cx - 1.1, cy + 0.2, 6, 0.6, 0.45, 14, '#2b2622', '#221e1b', '#1a1715', OL);
    const [gx, gy] = P(cx + 0.5, cy + 1.05, 6.2); ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.ellipse(gx, gy, 14, 5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#a8323e'; ctx.beginPath(); ctx.ellipse(gx, gy, 12, 4, 0, 0, 7); ctx.fill();
    for (let k = 0; k < 5; k++) dot(ctx, cx + 0.3 + k * 0.08, cy + 1.02 + (k % 2) * 0.05, 6.4, 1.3, '#e2b93b');
  }, lowD(0.4));

  // @@PROPS@@

  // ================================================================ 건물 도우미
  /** 옥상 레벨 + 엘리베이터 탑 (T.roof 의 엘리베이터 부분) */
  function roofLevel(T, name, floor, color, desc) {
    const { L, K } = T.level(name, floor, color, 'roof', { short: 'R' });
    L.desc = desc;
    const CX = T.CX;
    L.patches.push({ x: CX, y: 0, w: 6, d: 3, style: 'marble', color: '#efece6' });
    L.elev = [];
    for (const [car, cx] of [[0, CX], [1, CX + 3]]) { K.add({ type: 'elevCab', x: cx, y: 0, w: 2, d: 2, car }); K.add({ type: 'elevDoor', x: cx, y: 0, w: 2, d: 2, car, label: 'R' }); K.blockRect(cx, 0, 2, 2); L.elev.push({ car, hall: { x: cx + 1, y: 2.75 }, cabin: { x: cx + 1, y: 1.0 } }); }
    K.add({ type: 'elevPanel', x: CX + 2.5, y: 0.35, label: 'R' }); K.block(CX + 2, 0);
    K.add({ type: 'hutShell', x: CX, y: 0, w: 6, d: 3 });
    K.wallY(0, 3, CX, { h: 82, color: '#e6e0d6' }); K.wallY(0, 3, CX + 6, { h: 82, color: '#e6e0d6' });
    K.wallX(CX, CX + 6, 3, { h: 82, color: '#e6e0d6', doors: [CX + 1, CX + 4] });
    L.windows = []; L.wallY = null;
    return { L, K };
  }
  /** 1F 로비 기본: 보안실 · 정문 (turnstiles:false 면 게이트 없음) */
  function lobby(T, name, floor, color, desc, o = {}) {
    T.nextFloor();
    const { L, K } = T.level(name, floor, color);
    L.desc = desc;
    T.shell(L, K, { name: T.securityRoom(L, K, o.secName), color: o.secColor || '#2b3a67' });
    T.entrance(L, K, { turnstiles: o.turnstiles });
    return { L, K };
  }
  const rest = (T, L, x, y, face, pose, tag, ap, carry) => T.rest(L, { x, y, face, pose, ...(ap ? { approach: ap } : {}), ...(carry !== undefined ? { carry } : {}) }, tag);
  /** 둥근 탁자(tx,ty 칸) + 좌우 스툴 2 */
  function table(T, L, K, tx, ty, tag, o = {}) {
    K.add({ type: o.type || (o.parasol ? 'parasolTable' : 'roundTable'), x: tx + 0.5, y: ty + 0.5, r: 0.42, color: o.color || '#ffffff' }); K.block(tx, ty);
    for (const [dx, face] of [[-1, '+x'], [1, '-x']]) { K.add({ type: o.stoolType || 'stool', x: tx + 0.5 + dx, y: ty + 0.5, color: o.stool || '#c49a62' }); rest(T, L, tx + 0.5 + dx, ty + 0.5, face, 'sit', tag, null, o.carry); }
  }
  /** 소파(x 칸부터 3칸, by 줄) + 휴식 3 */
  function sofa(T, L, K, x, by, tag) {
    K.add({ type: 'sofa', x, y: by + 0.2, w: 3 }); K.blockRect(x, by, 3, 1);
    [0.6, 1.6, 2.4].forEach((d) => rest(T, L, x + d, by + 0.82, '+y', 'sofa', tag, [Math.floor(x + d), by + 1]));
  }
  /** 벤치(x 칸부터 n칸, by 줄) + 휴식 n */
  function bench(T, L, K, x, by, n, tag, o = {}) {
    K.add({ type: 'bench', x: x + 0.05, y: by + 0.25, w: n - 0.1, color: o.color }); K.blockRect(x, by, n, 1);
    for (let q = 0; q < n; q++) rest(T, L, x + q + 0.5, by + 0.5, o.face || '+y', 'sit', tag, [x + q, o.face === '-y' ? by - 1 : by + 1], o.carry);
  }
  /** 좌식 찻상(x..x+w, y 줄) + 양쪽 방석 휴식 */
  function lowSet(T, L, K, x, y, w, tag, o = {}) {
    K.add({ type: 'ib_lowTable', x, y, w, d: 1, kind: o.kind || 'tea' }); K.blockRect(x, y, w, 1);
    const cols = o.cushions || ['#c94f4f', '#3e5c7a', '#e9a23b', '#3f8a45', '#a67be0'];
    let k = 0;
    for (const [dy, face] of (o.sides || [[-1, '+y'], [1, '-y']])) for (let i = 0; i < w; i++) {
      const cx = x + i + 0.5, cy = y + dy + 0.5;
      K.add({ type: 'ib_cushion', x: cx, y: cy, color: cols[k++ % cols.length] });
      rest(T, L, cx, cy, face, 'sit', tag, null, o.carry);
    }
  }
  /** 바 스툴 줄 (카운터 앞): y = 의자 줄 */
  function stools(T, L, K, x0, n, step, y, tag, o = {}) {
    for (let k = 0; k < n; k++) { const x = x0 + k * step; K.add({ type: 'barStool', x, y }); rest(T, L, x, y - 0.02, o.face || '-y', 'sit', tag, null, o.carry); }
  }
  function beanbag(T, L, K, x, y, color, tag, face = '-y') { K.add({ type: 'beanbag', x, y, color }); rest(T, L, x, y, face, 'sofa', tag); }
  function deckChair(T, L, K, x, by, color, tag) { K.add({ type: 'deckChair', x: x + 0.5, y: by + 0.2, color }); K.blockRect(x, by, 1, 2); rest(T, L, x + 0.5, by + 0.75, '+y', 'sofa', tag, [x, by + 2]); }
  const lamp = (L, K, x, y, type = 'lamp') => { K.add({ type, x: x + 0.5, y: y + 0.5 }); K.block(x, y); L.lamps.push({ x: x + 0.5, y: y + 0.5 }); };
  const plant = (K, x, y, size = 1, seed = 1) => { K.add({ type: 'plant', x: x + 0.5, y: y + 0.55, size, seed }); K.block(x, y); };
  /** 외관 페인트: 층마다 fn(k, top) */
  const storeys = (o, fn) => { for (let k = o.k0; k < o.k1; k++) fn(k, o.Hb - (k - o.k0 + 1) * o.FP); };

  // ================================================================ 1. 🏯 한옥 오피스
  C.indoor({
    id: 'hanok', icon: '🏯', name: '한옥 오피스', desc: '낮고 넓은 한옥 · 대청마루 업무층 · 사랑방 다실 · 서예실 · 지하 장독 숙성고 · 장독대 옥상',
    build(S, o) {
      const W = 36, H = 24, DX = 18;
      const F = { wall: '#b48a5e', texture: 'wood', win: 'grid', winColor: 'rgba(250,240,215,0.92)', frame: '#5a3720', trim: '#3f4552', sign: '🏯 한옥 오피스 · 韓屋', signBg: '#4a2e1c', signFg: '#f6e7c8', lobby: 'rgba(250,240,215,0.9)', n: 1 };
      F.paint = (g, q) => {
        const dx = DX * 32;
        const eave = (top, a, b, big) => {
          const th = big ? 13 : 9, y0 = top - th + 5;
          g.fillStyle = 'rgba(40,25,15,0.28)'; g.fillRect(a, top + 6, b - a, 4);                                  // 처마 그림자
          g.fillStyle = '#3f4552';
          g.beginPath(); g.moveTo(a - 6, y0 - 5); g.quadraticCurveTo(a + 4, y0 + 2, a + 18, y0); g.lineTo(b - 18, y0); g.quadraticCurveTo(b - 4, y0 + 2, b + 6, y0 - 5); g.lineTo(b + 2, top + 6); g.lineTo(a - 2, top + 6); g.closePath(); g.fill();
          g.fillStyle = '#5b6576'; for (let x = a + 1; x < b; x += 5) g.fillRect(x, y0 + 1, 2.2, th - 1);
          g.fillStyle = '#272c35'; g.fillRect(a - 2, top + 4, b - a + 4, 2.6);
          g.fillStyle = '#e4ddcc'; for (let x = a + 2.5; x < b; x += 5) { g.beginPath(); g.arc(x, top + 5.3, 1.35, 0, 7); g.fill(); }
          if (big) { g.fillStyle = '#272c35'; g.fillRect(a + 10, y0 - 4, b - a - 20, 4); }
        };
        storeys(q, (k, top) => {
          g.fillStyle = 'rgba(243,236,220,0.9)'; g.fillRect(0, top + q.FP - 9, q.Wpx, 6);                 // 하인방 회벽
          for (let i = 0; i <= q.len; i += 3) {                                                            // 기둥
            const px = Math.min(i * 32, q.Wpx - 3) - (i ? 3 : 0);
            if (k === 0 && q.south && Math.abs(px - dx) < 60) continue;
            g.fillStyle = '#5a3720'; g.fillRect(px, top, 6, q.FP); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(px + 1, top, 1.4, q.FP);
          }
          if (k === 0) { g.fillStyle = '#a9a296'; g.fillRect(-4, q.Hb - 6, q.Wpx + 8, 6); g.strokeStyle = 'rgba(70,60,50,0.4)'; g.lineWidth = 0.8; for (let x = 0; x < q.Wpx; x += 16) g.strokeRect(x, q.Hb - 6, 16, 6); }
          if (k === 0 && q.south) { eave(top, -8, dx - 70); eave(top, dx + 70, q.Wpx + 8); } else eave(top, -8, q.Wpx + 8);
        });
        if (q.k1 === F.n) eave(0, -14, q.Wpx + 14, true);
      };
      const T = C.tower(S, { W, H, id: 'hanok', name: '🏯 한옥 오피스', facade: F });

      // ---- B1 장독 숙성고 (지하는 먼저)
      {
        const { L, K } = T.level('B1 장독 숙성고', 'ib_madang', '#bba381', 'office', { basement: true });
        L.desc = '옹기 장독대 · 간장·된장 숙성 · 김치냉장실 · 시음 사랑채';
        T.shell(L, K, { name: '🧊 김치냉장실', color: '#4e7cf6' });
        L.windows = [];
        L.patches.push({ x: 0, y: 0, w: T.CX, d: 5, style: 'tile', color: '#e4edf5' });
        K.add({ type: 'fridgeCase', x: 0.4, y: 0.4, w: 12 }); K.blockRect(0, 0, 13, 1);
        T.npc(L, '김치 명인', { x: 6, y: 2.5, face: '-y' }, { anim: 'type', hat: 'bow', accent: '#c43d32', patrol: [{ x: 6, y: 2.5, face: '-y' }, { x: 15, y: 2.5, face: '-y' }] });
        for (const [y, seed] of [[8, 3], [12, 5], [16, 9]]) { K.add({ type: 'ib_jarStand', x: 1, y, w: 12, d: 2, seed }); K.blockRect(1, y, 12, 2); }
        K.add({ type: 'storageShelf', x: 14.4, y: 7.3, w: 6, seed: 4 }); K.blockRect(14, 7, 7, 1);
        for (const [x, y, s] of [[15.5, 11.5, 1.3], [17.5, 11.6, 1.1], [15.6, 14.5, 1.2], [17.5, 14.4, 1.4], [19.5, 13, 1]]) { K.add({ type: 'ib_jar', x, y, s }); K.block(Math.floor(x), Math.floor(y)); }
        L.patches.push({ x: 23, y: 8, w: 13, d: 16, style: 'ib_maru', color: '#d8b98c' });
        K.add({ type: 'ib_folding', x: 24, y: 8.2, w: 4, seed: 2 }); K.blockRect(24, 8, 4, 1);
        lowSet(T, L, K, 25, 11, 2, '🍵 장 시음 사랑채'); lowSet(T, L, K, 30, 11, 2, '🍵 장 시음 사랑채'); lowSet(T, L, K, 27, 17, 3, '🍵 장 시음 사랑채');
        lamp(L, K, 23, 22, 'ib_hanjiLamp'); lamp(L, K, 35, 9, 'ib_hanjiLamp');
        T.npc(L, '장 담그는 장인', { x: 6, y: 10.5, face: '-y' }, { hat: 'bucket', accent: '#6e4027', carry: 'box', patrol: [{ x: 6, y: 10.5, face: '-y' }, { x: 11, y: 14.5, face: '-y' }, { x: 4, y: 18.5, face: '-y' }] });
        T.sign(L, 0.4, H - 0.4, '🏺 장독 숙성고', '#6e4027'); T.sign(L, 23.4, H - 0.4, '🍵 시음 사랑채', '#7a4a2a');
      }
      // ---- 1F 로비 · 안마당
      {
        const { L, K } = lobby(T, '1F 로비·안마당', 'ib_maru', '#d8b98c', '솟을대문 로비 · 안마당 연못 · 평상 · 사랑마루 · 안내', { secName: '🛡️ 행랑채 보안실' });
        L.patches.push({ x: 1, y: 8, w: 13, d: 12, style: 'ib_madang', color: '#d9c7a3' });
        L.decals.push({ type: 'pond', cx: 7, cy: 12.5, rx: 2.1, ry: 1.5 }); K.blockRect(5, 11, 4, 3);
        K.add({ type: 'koi', x: 7, y: 12.5, seed: 1 }); K.add({ type: 'koi', x: 6.6, y: 12.8, seed: 4 });
        K.add({ type: 'stoneLantern', x: 10.5, y: 11.5 }); K.block(10, 11);
        K.add({ type: 'roofTree', x: 2.5, y: 9.5, size: 1.1, seed: 3 }); K.block(2, 9);
        K.add({ type: 'roofTree', x: 12.5, y: 18.5, size: 1, seed: 8, blossom: true }); K.block(12, 18);
        K.add({ type: 'flowerBush', x: 3.5, y: 15.5, size: 1, seed: 4, color: '#f07a8a' }); K.block(3, 15);
        K.add({ type: 'ib_pyeongsang', x: 6, y: 16, w: 3, d: 2, tray: true }); K.blockRect(6, 16, 3, 2);
        for (let q = 0; q < 3; q++) rest(T, L, 6.5 + q, 17.65, '+y', 'sit', '🏯 안마당 평상', [6 + q, 18]);
        K.add({ type: 'ib_folding', x: 24.4, y: 7.3, w: 5.2, seed: 1 }); K.blockRect(24, 7, 6, 1);
        K.add({ type: 'reception', x: 24.6, y: 9.6, w: 5 }); K.blockRect(24, 9, 6, 1);
        T.npc(L, '안내원', { x: 27, y: 8.9, face: '+y' }, { hat: 'bow', accent: '#c43d32' });
        T.visitorSofa(L, K, 23, 15);
        lowSet(T, L, K, 30, 13, 2, '🍵 1F 사랑마루');
        K.add({ type: 'ib_jar', x: 33.5, y: 8.5, s: 1.2 }); K.block(33, 8); K.add({ type: 'ib_jar', x: 34.6, y: 9.4, s: 0.9 }); K.block(34, 9);
        lamp(L, K, 22, 22, 'ib_hanjiLamp'); lamp(L, K, 35, 22, 'ib_hanjiLamp');
        T.npc(L, '보안요원', { x: DX + 0.5, y: H - 5, face: '+y' }, { hat: 'police', patrol: [{ x: DX + 0.5, y: H - 5, face: '+y' }, { x: 10, y: 6, face: '+x' }, { x: 30, y: 6, face: '-x' }] });
        T.sign(L, 1.3, 19.7, '🏯 안마당', '#3f8a45'); T.sign(L, 29.4, 15.6, '🍵 사랑마루', '#7a4a2a');
      }
      // ---- 대청마루 업무층
      T.workFloors(o, {
        name: (n) => `${n}F 대청마루`, looks: [['ib_maru', '#dcbf92'], ['ib_maru', '#d2b083']],
        deco(L, K, n) {
          const fy = H - 2;
          K.add({ type: 'ib_folding', x: 11, y: fy + 0.2, w: 4, seed: n }); K.blockRect(11, fy, 4, 1);
          K.add({ type: 'ib_jar', x: 16.5, y: fy + 0.5, s: 1.1 }); K.block(16, fy);
          K.add({ type: 'ib_lowTable', x: 19, y: fy, w: 2, d: 1, kind: 'tea' }); K.blockRect(19, fy, 2, 1);
          lamp(L, K, 23, fy, 'ib_hanjiLamp');
          L.windows = [10.4, 19.4];
          K.add({ type: 'ib_scroll', axis: 'x', x: 0, y: 14.3, z: 82, west: true, text: '일취월장' }); K.add({ type: 'ib_scroll', axis: 'x', x: 0, y: 15.5, z: 82, west: true, text: '온고지신' });
        },
      });
      // ---- 사랑방 다실 · 서예실
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 사랑방·서예실`, 'ib_maru', '#d9bb8f');
        L.desc = '사랑방 다실 (좌식 찻상·방석·병풍) · 서예실 (서안·족자) · 다실 준비실';
        T.shell(L, K, { name: '🫖 다실 준비실', color: '#7a4a2a' });
        L.patches.push({ x: 0, y: 0, w: T.CX, d: 5, style: 'tile', color: '#efe6d3' });
        K.add({ type: 'cabinet', x: 0.6, y: 0.35, w: 3, coffee: true }); K.blockRect(0, 0, 4, 1);
        K.add({ type: 'ib_jar', x: 5.5, y: 0.6, s: 0.9 }); K.block(5, 0); K.add({ type: 'ib_jar', x: 6.5, y: 0.6, s: 0.8 }); K.block(6, 0);
        K.add({ type: 'ib_lowTable', x: 9, y: 1, w: 3, d: 1, kind: 'tea' }); K.blockRect(9, 1, 3, 1);
        K.add({ type: 'ib_cushion', x: 10.5, y: 2.5, color: '#3e5c7a' });
        T.npc(L, '차 우리는 직원', { x: 10.5, y: 2.5, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'bow', accent: '#3f8a45' });
        K.wallX(0, W, 7, { h: 46, doors: [9, 14, 23, 31], color: '#efe3c8' });
        K.wallY(7, H, 18, { h: 46, doors: [12, 20], color: '#efe3c8' });
        // 사랑방
        L.patches.push({ x: 0, y: 7, w: 18, d: H - 7, style: 'ib_maru', color: '#e4c79a' });
        K.add({ type: 'ib_folding', x: 1, y: 7.25, w: 6, seed: 2 }); K.blockRect(1, 7, 6, 1);
        L.windows = [12.5, 21];
        K.add({ type: 'ib_scroll', axis: 'x', x: 0, y: 15.6, z: 82, west: true, text: '다반사' }); K.add({ type: 'ib_scroll', axis: 'x', x: 0, y: 16.8, z: 82, west: true, text: '청풍명월' });
        for (const [x, y] of [[2, 10], [8, 10], [2, 15], [8, 15]]) lowSet(T, L, K, x, y, 2, '🍵 사랑방 다실');
        lowSet(T, L, K, 13, 18, 2, '🍵 다도 체험', { sides: [[1, '-y']] });
        K.add({ type: 'ib_cushion', x: 13.5, y: 17.5, color: '#7a4a2a' });
        T.npc(L, '다도 사범', { x: 13.5, y: 17.5, face: '+y', pose: 'sit' }, { anim: 'think', hat: 'beret', accent: '#7a4a2a' });
        lamp(L, K, 16, 8, 'ib_hanjiLamp'); lamp(L, K, 0, 22, 'ib_hanjiLamp');
        K.add({ type: 'ib_jar', x: 16.5, y: 22.5, s: 1 }); K.block(16, 22);
        T.sign(L, 0.4, H - 0.4, '🍵 사랑방 다실', '#7a4a2a');
        // 서예실
        L.patches.push({ x: 18, y: 7, w: 18, d: H - 7, style: 'ib_maru', color: '#ead2a8' });
        for (const [y, tx] of [[10.7, '온고지신'], [15.7, '학이시습'], [18.8, '대기만성']]) K.add({ type: 'ib_scroll', axis: 'x', x: 18, y, text: tx });
        for (const [x, tx] of [[25, '일취월장'], [26.6, '인공지능'], [28.2, '천천히']]) K.add({ type: 'ib_scroll', axis: 'y', x, y: 7, text: tx });
        for (const [x, y] of [[21, 11], [27, 11], [21, 16], [27, 16]]) lowSet(T, L, K, x, y, 3, '🖌️ 서예 체험', { kind: 'brush', sides: [[1, '-y']], cushions: ['#f6eedb', '#e9dcc3'] });
        K.add({ type: 'ib_lowTable', x: 33, y: 9, w: 2, d: 1, kind: 'brush' }); K.blockRect(33, 9, 2, 1);
        T.npc(L, '서예 선생', { x: 25, y: 9.5, face: '+y' }, { anim: 'point', hat: 'beret', accent: '#2b2622', patrol: [{ x: 25, y: 9.5, face: '+y' }, { x: 32.5, y: 14.5, face: '-x' }, { x: 25, y: 19.5, face: '-y' }] });
        lamp(L, K, 35, 22, 'ib_hanjiLamp');
        T.sign(L, 18.4, H - 0.4, '🖌️ 서예실', '#2b2622');
      }
      // ---- R 장독대 · 옥상 마당
      {
        const { L, K } = roofLevel(T, 'R 장독대·옥상마당', 'ib_madang', '#d3bf98', '장독대 · 소나무 · 평상 · 작은 연못 · 석등 · 찻자리');
        K.add({ type: 'ib_jarStand', x: 1, y: 1, w: 9, d: 3, seed: 11 }); K.blockRect(1, 1, 9, 3);
        K.add({ type: 'ib_jarStand', x: 11, y: 1, w: 7, d: 2, seed: 13 }); K.blockRect(11, 1, 7, 2);
        T.sign(L, 1.3, 4.7, '🏺 장독대', '#6e4027');
        for (const [x, y] of [[3, 9], [11, 14]]) {
          K.add({ type: 'ib_pyeongsang', x, y, w: 4, d: 2, tray: x === 3 }); K.blockRect(x, y, 4, 2);
          for (let q = 0; q < 4; q++) rest(T, L, x + q + 0.5, y + 1.65, '+y', 'sit', '🌲 옥상 평상', [x + q, y + 2]);
        }
        for (const [x, y, b] of [[1, 15, false], [17, 8, true], [33, 19, false], [30, 6, true]]) { K.add({ type: 'roofTree', x: x + 0.5, y: y + 0.5, size: 1.1, seed: x * 7 + y, blossom: b }); K.block(x, y); }
        K.add({ type: 'stoneLantern', x: 9.5, y: 16.5 }); K.block(9, 16); K.add({ type: 'stoneLantern', x: 28.5, y: 12.5 }); K.block(28, 12);
        L.decals.push({ type: 'pond', cx: 27, cy: 16, rx: 2.4, ry: 1.6 }); K.blockRect(25, 15, 4, 2);
        K.add({ type: 'koi', x: 27, y: 16, seed: 2 }); K.add({ type: 'koi', x: 26.6, y: 16.3, seed: 5 });
        K.add({ type: 'flowerBush', x: 21.5, y: 20.5, size: 1, seed: 3, color: '#f07a8a' }); K.block(21, 20);
        K.add({ type: 'flowerBush', x: 6.5, y: 20.5, size: 1, seed: 6, color: '#f6c445' }); K.block(6, 20);
        K.add({ type: 'ib_jar', x: 34.5, y: 3.5, s: 1.2 }); K.block(34, 3); K.add({ type: 'ib_jar', x: 33.4, y: 4.5, s: 0.9 }); K.block(33, 4);
        lowSet(T, L, K, 17, 21, 2, '🍵 옥상 찻자리');
        T.npc(L, '정원사', { x: 8, y: 12.5, face: '-y' }, { hat: 'bucket', accent: '#3f8a45', patrol: [{ x: 8, y: 12.5, face: '-y' }, { x: 20, y: 18.5, face: '+x' }, { x: 31, y: 9.5, face: '-y' }] });
        T.sign(L, 0.4, H - 0.4, '🌲 옥상 마당', '#3f8a45');
      }
      const B = T.done();
      F.n = B.levels.length - B.base - 1;
      return B;
    },
  });

  // ================================================================ 2. 🚀 우주 관제센터
  C.indoor({
    id: 'mission', icon: '🚀', name: '우주 관제센터', desc: '거대 관제실 · 로켓 조립동 · 우주인 훈련실 · 천체 관측 돔 옥상',
    build(S, o) {
      const W = 30, H = 20, DX = 15;
      const F = { wall: '#1f2a48', texture: 'panel', win: 'band', winColor: 'rgba(90,150,240,0.55)', frame: 'rgba(120,200,255,0.55)', trim: '#3fa9ff', sign: '🚀 AI 우주 관제센터', signBg: '#0b1430', signFg: '#7cc8ff', lobby: 'rgba(120,180,255,0.5)', n: 1 };
      F.paint = (g, q) => {
        storeys(q, (k, top) => {
          const a = 0.35 + 0.25 * Math.sin(q.t * 2 + k * 0.7);
          g.fillStyle = `rgba(95,208,255,${q.night ? Math.min(1, a + 0.35) : a})`; g.fillRect(0, top + q.FP - 6, q.Wpx, 3);
          if (k > 0) { g.fillStyle = 'rgba(255,255,255,0.07)'; for (let i = 2; i < q.len; i += 4) g.fillRect(i * 32 - 1, top, 3, q.FP); }
        });
        if (!q.south && q.k1 === F.n && F.n >= 2) {
          const cx = q.Wpx / 2, cy = q.FP * 0.95, R = Math.min(q.FP * 0.78, 42);
          g.fillStyle = '#0b1430'; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); g.strokeStyle = '#7cc8ff'; g.lineWidth = 3; g.stroke();
          g.strokeStyle = '#f2c230'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(cx, cy, R * 0.82, R * 0.3, -0.4, 0, 7); g.stroke();
          g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(cx, cy - R * 0.62); g.quadraticCurveTo(cx + 7, cy - R * 0.1, cx + 5, cy + R * 0.35); g.lineTo(cx - 5, cy + R * 0.35); g.quadraticCurveTo(cx - 7, cy - R * 0.1, cx, cy - R * 0.62); g.fill();
          g.fillStyle = '#e5534b'; g.fillRect(cx - 2, cy - R * 0.2, 4, 4); g.fillStyle = '#ff9a5a'; g.beginPath(); g.moveTo(cx - 4, cy + R * 0.35); g.lineTo(cx, cy + R * 0.35 + 6 + Math.sin(q.t * 9) * 2); g.lineTo(cx + 4, cy + R * 0.35); g.fill();
          g.fillStyle = '#ffffff'; for (const [u, v] of [[-0.5, -0.4], [0.55, -0.3], [-0.6, 0.3], [0.45, 0.45]]) g.fillRect(cx + u * R, cy + v * R, 2, 2);
          g.fillStyle = '#7cc8ff'; g.font = `bold 7px ${FONT}`; g.textAlign = 'center'; g.fillText('AI SPACE', cx, cy + R * 0.75); g.textAlign = 'left';
        }
      };
      const T = C.tower(S, { W, H, id: 'mission', name: '🚀 우주 관제센터', facade: F });
      // ---- 1F 로비 · 우주 전시관
      {
        const { L, K } = lobby(T, '1F 로비·우주 전시관', 'marble', '#e4e8f0', '우주 전시관 (로켓 모형·우주복·지구본) · 안내 데스크 · 방문객 대기석');
        L.rugs.push({ x: 1.2, y: 8.2, w: 10.6, d: 9.4, color: '#24305a', border: '#3fa9ff' });
        K.add({ type: 'ib_rocket', x: 3, y: 9, s: 0.85 }); K.blockRect(3, 9, 2, 2);
        K.add({ type: 'ib_spacesuit', x: 7.5, y: 9.5 }); K.block(7, 9); K.add({ type: 'ib_spacesuit', x: 9, y: 9.5 }); K.block(9, 9);
        K.add({ type: 'ib_globe', x: 6.5, y: 13.5 }); K.block(6, 13);
        K.add({ type: 'ib_satModel', x: 9.5, y: 13.5 }); K.block(9, 13);
        bench(T, L, K, 2, 15, 4, '🚀 우주 전시관 벤치', { color: '#4e7cf6' });
        K.add({ type: 'reception', x: 19.6, y: 9.6, w: 5 }); K.blockRect(19, 9, 6, 1);
        T.npc(L, '안내원', { x: 22, y: 8.9, face: '+y' }, { hat: 'cap', accent: '#3fa9ff' });
        T.visitorSofa(L, K, 20, 13);
        plant(K, 28, 18, 1.1, 4); plant(K, 18, 7, 0.9, 7);
        T.npc(L, '보안요원', { x: DX + 0.5, y: H - 5, face: '+y' }, { hat: 'police', patrol: [{ x: DX + 0.5, y: H - 5, face: '+y' }, { x: 6, y: 6, face: '+x' }, { x: 26, y: 6, face: '-x' }] });
        T.sign(L, 1.3, 17.9, '🚀 우주 전시관', '#3fa9ff');
      }
      // ---- 업무층
      T.workFloors(o, {
        name: (n) => `${n}F 미션 업무층`, looks: [['carpet', '#d3d9e6'], ['carpet', '#cfd6e2']],
        deco(L, K) {
          const fy = H - 2;
          K.add({ type: 'ib_spacesuit', x: 11.5, y: fy + 0.5 }); K.block(11, fy);
          K.add({ type: 'ib_globe', x: 13.5, y: fy + 0.5 }); K.block(13, fy);
          K.add({ type: 'ib_satModel', x: 16.5, y: fy + 0.5 }); K.block(16, fy);
        },
      });
      // ---- 미션 관제실
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 미션 관제실`, 'raised', '#4a5368');
        L.desc = '대형 관제 스크린 · 관제 콘솔 3열 · 비행 감독석 · 견학 갤러리 · 통신실';
        T.shell(L, K, { name: '🛰️ 통신실', color: '#3fa9ff', glass: true });
        L.windows = [];
        L.patches.push({ x: 0, y: 0, w: T.CX, d: 5, style: 'raised', color: '#3b4252' });
        for (let i = 0; i < 6; i++) K.add({ type: 'serverRack', x: 0.4 + i * 1.05, y: 0.3 }); K.blockRect(0, 0, 7, 1);
        const g = K.deskSeat(8, -0.6, 0, 'B', null);
        T.npc(L, '통신 엔지니어', { x: g.x, y: g.y, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'headphones', accent: '#3fa9ff' });
        K.add({ type: 'ib_mcWallX', y0: H - 0.6, len: H - 8.6 });
        const opChair = (x, y) => { K.add({ type: 'ib_chairX', x, y, part: 'seat' }); K.add({ type: 'ib_chairX', x, y, part: 'back' }); };
        for (const cx of [3, 8, 13]) for (let y = 8; y < 17; y++) { K.add({ type: 'ib_mcDeskY', x: cx, y }); K.block(cx, y); }
        for (const [x, y] of [[4.5, 9.5], [4.5, 13.5], [9.5, 11.5], [9.5, 15.5], [14.5, 9.5], [14.5, 14.5]]) { opChair(x, y); T.npc(L, '관제 요원', { x, y, face: '-x', pose: 'sit' }, { anim: 'type', hat: 'headphones', accent: '#3fa9ff' }); }
        for (const [x, y] of [[4.5, 11.5], [9.5, 9.5], [14.5, 12.5]]) { opChair(x, y); rest(T, L, x, y, '-x', 'sit', '🛰️ 관제석 체험'); }
        for (let y = 11; y < 14; y++) { K.add({ type: 'ib_mcDeskY', x: 19, y }); K.block(19, y); }
        opChair(20.5, 12.5); T.npc(L, '비행 감독', { x: 20.5, y: 12.5, face: '-x', pose: 'sit' }, { anim: 'think', hat: 'headphones', accent: '#e5534b', tie: '#2b3a67', say: 'GO 판정!' });
        for (const x of [24.5, 26.5]) for (let y = 8.5; y < 17; y += 2) { K.add({ type: 'ib_chairX', x, y, part: 'seat', color: '#7a2232' }); K.add({ type: 'ib_chairX', x, y, part: 'back', color: '#7a2232' }); rest(T, L, x, y, '-x', 'sit', '👀 견학 갤러리'); }
        T.npc(L, '관제 엔지니어', { x: 17, y: 8, face: '-x' }, { hat: 'cap', accent: '#3fa9ff', carry: 'paper', patrol: [{ x: 17, y: 8, face: '-x' }, { x: 6.5, y: 17.5, face: '-x' }, { x: 11.5, y: 8, face: '-x' }] });
        T.sign(L, 1.3, H - 0.4, '🛰️ 미션 관제실', '#3fa9ff'); T.sign(L, 23.4, H - 0.4, '👀 견학 갤러리', '#7a2232');
      }
      // ---- 로켓 조립동
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 로켓 조립동`, 'concrete', '#c4c8cf');
        L.desc = '조립 중인 로켓 · 정비 타워 · 로봇팔 · 지게차 · 부품 창고 · 정비 휴게 벤치';
        T.shell(L, K, { name: '🧰 부품 창고', color: '#e9a23b' });
        L.patches.push({ x: 0, y: 0, w: T.CX, d: 5, style: 'concrete', color: '#b5b9bd' });
        K.add({ type: 'palletRack', x: 0.4, y: 0.3, w: 6, seed: 2 }); K.blockRect(0, 0, 7, 1);
        for (const x of [8.2, 8.8, 9.4]) K.add({ type: 'partsBin', x, y: 0.4, seed: x * 10 }); K.blockRect(8, 0, 2, 1);
        T.npc(L, '자재 담당', { x: 11, y: 2.5, face: '-y' }, { hat: 'cap', accent: '#e9a23b', carry: 'box', patrol: [{ x: 11, y: 2.5, face: '-y' }, { x: 4, y: 2.5, face: '-y' }] });
        L.decals.push({ type: 'hazard', x: 8, y: 8, w: 13, d: 10 });
        K.add({ type: 'ib_rocket', x: 11, y: 11, s: 1.25, scaffold: true, steam: true }); K.blockRect(11, 11, 2, 2);
        K.add({ type: 'ib_rocket', x: 16, y: 13, s: 0.8 }); K.blockRect(16, 13, 2, 2);
        K.add({ type: 'robotArm', x: 24.5, y: 10.5 }); K.blockRect(23, 9, 3, 3);
        K.add({ type: 'forklift', x: 3, y: 14.2 }); K.blockRect(3, 14, 2, 1);
        K.add({ type: 'labBench', x: 1, y: 8, w: 5 }); K.blockRect(1, 8, 5, 1);
        K.add({ type: 'palletRack', x: 1, y: 17.1, w: 4, seed: 5 }); K.blockRect(1, 17, 5, 1);
        T.npc(L, '로켓 엔지니어', { x: 10, y: 15, face: '-y' }, { hat: 'hardhat', accent: '#e5534b', carry: 'paper', patrol: [{ x: 10, y: 15, face: '-y' }, { x: 14.5, y: 9.5, face: '-y' }, { x: 19, y: 16.5, face: '-x' }] });
        T.npc(L, '용접 기사', { x: 13.6, y: 12.3, face: '-x' }, { anim: 'type', hat: 'hardhat', accent: '#f2c230' });
        bench(T, L, K, 22, 16, 4, '🔧 정비 휴게 벤치', { color: '#e9a23b' });
        K.add({ type: 'vending', x: 27.2, y: 16.25, color: '#3fa9ff' }); K.block(27, 16);
        rest(T, L, 9.5, 18.5, '-y', 'stand', '👀 조립 견학'); rest(T, L, 14.5, 18.5, '-y', 'stand', '👀 조립 견학');
        T.sign(L, 8.3, 18.6, '🚀 로켓 조립 베이 (안전모 필수)', '#e5534b', false);
      }
      // ---- 우주인 훈련실
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 우주인 훈련실`, 'ib_rubber', '#9fb3d1');
        L.desc = '다축 회전 훈련기 · 회전의자 · 러닝머신 · 중성부력 수조 · 회복실 · 우주복 장비실';
        T.shell(L, K, { name: '🧑‍🚀 우주복 장비실', color: '#3fa9ff' });
        K.add({ type: 'lockers', x: 0.4, y: 0.3, w: 5 }); K.blockRect(0, 0, 6, 1);
        for (const x of [7.5, 8.7, 9.9]) { K.add({ type: 'ib_spacesuit', x, y: 0.6 }); K.block(Math.floor(x), 0); }
        T.npc(L, '장비 담당', { x: 11, y: 2.5, face: '-y' }, { hat: 'cap', accent: '#3fa9ff' });
        K.add({ type: 'ib_gyro', x: 2, y: 9 }); K.blockRect(2, 9, 3, 3);
        K.add({ type: 'ib_spinChair', x: 7, y: 9 }); K.blockRect(7, 9, 2, 2);
        for (const x of [11, 12.2, 13.4]) { K.add({ type: 'treadmill', x, y: 8.8 }); K.blockRect(Math.floor(x), 9, 1, 2); rest(T, L, x + 0.4, 9.8, '-y', 'stand', '🏃 무중력 러닝', [Math.floor(x), 11]); }
        L.decals.push({ type: 'pool', x: 18, y: 9, w: 9, d: 6 }); K.blockRect(18, 9, 9, 6);
        K.add({ type: 'ib_floatSuit', x: 21.5, y: 12 }); K.add({ type: 'ib_floatSuit', x: 24.5, y: 10.8 });
        T.npc(L, '다이빙 교관', { x: 22.5, y: 15.8, face: '-y' }, { hat: 'cap', accent: '#1f9fb4' });
        rest(T, L, 19.5, 15.6, '-y', 'stand', '🌊 중성부력 수조'); rest(T, L, 25.5, 15.6, '-y', 'stand', '🌊 중성부력 수조');
        for (const [x, c] of [[3, '#4e9cf6'], [5, '#f2a7c3'], [7, '#f6c445']]) beanbag(T, L, K, x, 17.2, c, '🛋️ 회복실');
        K.add({ type: 'massageChair', x: 10.5, y: 17 }); K.block(10, 17); rest(T, L, 10.5, 17, '+y', 'sit', '🛋️ 회복실', [10, 18]);
        T.npc(L, '훈련 교관', { x: 6, y: 13, face: '+y' }, { hat: 'cap', accent: '#3fa9ff', say: '자세 유지!', patrol: [{ x: 6, y: 13, face: '+y' }, { x: 15, y: 13, face: '-y' }, { x: 10, y: 15.5, face: '-x' }] });
        T.sign(L, 1.3, 12.8, '🌀 회전 훈련', '#3fa9ff'); T.sign(L, 18.3, 16.7, '🌊 중성부력 수조', '#1f9fb4'); T.sign(L, 1.3, H - 0.4, '🛋️ 회복실', '#7a8fd6');
      }
      // ---- R 천체 관측 돔
      {
        const { L, K } = roofLevel(T, 'R 천체 관측 돔', 'concrete', '#8f96a3', '천체 관측 돔 · 망원경 · 별 보기 선베드 · 위성 안테나');
        K.add({ type: 'ib_dome', x: 1, y: 5, r: 3 }); K.blockRect(1, 5, 6, 6);
        for (const [x, y] of [[9.5, 7.5], [12.5, 10.5]]) { K.add({ type: 'ib_telescope', x, y }); K.block(Math.floor(x), Math.floor(y)); }
        K.add({ type: 'ib_dish', x: 25.5, y: 6.5 }); K.block(25, 6);
        for (const [x, c] of [[9, '#4e9cf6'], [11, '#a67be0'], [13, '#f2a7c3'], [15, '#f6c445']]) deckChair(T, L, K, x, 14, c, '🌌 별 보기 선베드');
        bench(T, L, K, 21, 14, 3, '🔭 옥상 벤치');
        for (const x of [22.5, 24.7]) { K.add({ type: 'airCon', x, y: 0.4 }); K.block(Math.floor(x), 0); }
        T.npc(L, '천문학자', { x: 10.5, y: 8.5, face: '-x' }, { anim: 'think', hat: 'beret', accent: '#a67be0', patrol: [{ x: 10.5, y: 8.5, face: '-x' }, { x: 13.5, y: 11.5, face: '-x' }] });
        T.sign(L, 1.3, 11.8, '🔭 천체 관측 돔', '#a67be0'); T.sign(L, 8.4, 16.8, '🌌 별 보기', '#3fa9ff');
      }
      const B = T.done();
      F.n = B.levels.length - B.base - 1;
      return B;
    },
  });

  // ================================================================ 3. 🏦 은행 본점
  C.indoor({
    id: 'bankhq', icon: '🏦', name: '은행 본점', desc: '영업장 창구 · 트레이딩룸 · VIP 라운지 · 지하 대형 금고 · 옥상 정원',
    build(S, o) {
      const W = 32, H = 22, DX = 16;
      const F = { wall: '#efe8dc', texture: 'concrete', win: 'arch', winColor: 'rgba(205,226,240,0.82)', frame: '#d8cdb8', trim: '#c9a64a', sign: '🏦 AI 은행 본점', signBg: '#c9a23a', signFg: '#2b2216', lobby: 'rgba(220,235,245,0.85)', n: 1 };
      F.paint = (g, q) => {
        const dx = DX * 32;
        storeys(q, (k, top) => {
          for (let i = 0; i <= q.len; i += 2) {                                         // 대리석 기둥 (필라스터)
            const px = Math.min(i * 32, q.Wpx - 4) - 5;
            if (k === 0 && q.south && Math.abs(px - dx) < 64) continue;
            g.fillStyle = '#faf6ee'; g.fillRect(px, top + 4, 10, q.FP - 6); g.fillStyle = 'rgba(150,135,110,0.25)'; for (let f = 2; f < 10; f += 3) g.fillRect(px + f, top + 8, 0.8, q.FP - 14);
            g.fillStyle = '#e2d6bf'; g.fillRect(px - 2, top + 2, 14, 4); g.fillRect(px - 2, top + q.FP - 6, 14, 4);
          }
          if (k === 0) { g.fillStyle = 'rgba(120,105,85,0.25)'; for (let v = top + 10; v < top + q.FP; v += 9) { if (q.south) { g.fillRect(0, v, dx - 64, 1.2); g.fillRect(dx + 64, v, q.Wpx - dx - 64, 1.2); } else g.fillRect(0, v, q.Wpx, 1.2); } }
        });
        if (q.k1 === F.n) {                                                             // 코니스 + 덴틸
          g.fillStyle = '#e2d6bf'; g.fillRect(-4, -4, q.Wpx + 8, 9); g.fillStyle = '#c9a64a'; g.fillRect(-4, 4, q.Wpx + 8, 2.5);
          g.fillStyle = '#d4c6aa'; for (let x = 0; x < q.Wpx; x += 6) g.fillRect(x, 6.5, 3.5, 3);
        }
        if (q.south && q.k0 === 0 && q.k1 >= 2) { const top = q.Hb - 2 * q.FP; g.fillStyle = '#c9a64a'; g.font = `bold 13px ${FONT}`; g.textAlign = 'center'; g.fillText('AI BANK · 1926', dx, top + q.FP - 10); g.textAlign = 'left'; }
      };
      const T = C.tower(S, { W, H, id: 'bankhq', name: '🏦 AI 은행 본점', facade: F });
      // ---- B1 지하 금고 (지하는 먼저)
      {
        const { L, K } = T.level('B1 지하 금고', 'concrete', '#a9aaa6', 'office', { basement: true });
        L.desc = '대형 금고실 (금괴·현금 팔레트·대여금고·레이저 경보) · 현금 정사실';
        T.shell(L, K, { name: '💰 현금 정사실', color: '#2f7d4f' });
        L.windows = [];
        L.patches.push({ x: 0, y: 0, w: T.CX, d: 5, style: 'tile', color: '#dfe6df' });
        for (const tx of [1, 7]) {
          K.add({ type: 'ib_cashTable', x: tx, y: 2, w: 3 }); K.blockRect(tx, 2, 3, 1);
          K.add({ type: 'chair', x: tx + 1.5, y: 1.45, face: '+y', part: 'seat' }); K.add({ type: 'chair', x: tx + 1.5, y: 1.45, face: '+y', part: 'back' });
          T.npc(L, '현금 정사 직원', { x: tx + 1.5, y: 1.45, face: '+y', pose: 'sit' }, { anim: 'type', accent: '#2f7d4f', tie: '#2f7d4f' });
        }
        K.add({ type: 'goldStack', x: 12.8, y: 0.4 }); K.blockRect(12, 0, 3, 2);
        K.wallX(0, W, 9, { h: 64, doors: [8, 24], color: '#8d959c' });
        K.add({ type: 'vaultDoor', x: 7.5, y: 9 });
        L.patches.push({ x: 0, y: 9, w: W, d: H - 9, style: 'concrete', color: '#8f9196' });
        K.add({ type: 'depositBoxes', x: 10.2, y: 9, w: 13.6 }); K.blockRect(10, 9, 14, 1);
        for (const [x, y] of [[2, 12], [5, 12], [2, 16], [5, 16]]) { K.add({ type: 'goldStack', x: x + 0.1, y: y + 0.3 }); K.blockRect(x, y, 2, 2); }
        for (const [x, y] of [[11, 12], [14, 12], [17, 12], [11, 17], [14, 17]]) { K.add({ type: 'ib_cashPallet', x, y }); K.blockRect(x, y, 2, 2); }
        for (const [x, y] of [[27.5, 11.5], [28.5, 11.5], [29.5, 11.5], [27.5, 13.5], [28.5, 13.5], [29.5, 13.5]]) { K.add({ type: 'ib_safe', x, y }); K.block(Math.floor(x), Math.floor(y)); }
        L.decals.push({ type: 'floor', x: 20.6, y: 16.6, w: 5.8, d: 4.8, color: 'rgba(229,83,75,0.12)' });
        K.add({ type: 'ib_laserGrid', x: 21, y: 17, w: 5, d: 4 }); K.blockRect(21, 17, 5, 4);
        T.npc(L, '금고지기', { x: 10, y: 11, face: '+y' }, { hat: 'police', accent: '#b8955f', patrol: [{ x: 10, y: 11, face: '+y' }, { x: 26, y: 15.5, face: '-y' }, { x: 8, y: 20, face: '+x' }] });
        T.npc(L, '경비원', { x: 16, y: 7.5, face: '+y' }, { hat: 'police', accent: '#2b3a67', patrol: [{ x: 16, y: 7.5, face: '+y' }, { x: 3, y: 7.5, face: '+x' }, { x: 29, y: 7.5, face: '-x' }] });
        T.sign(L, 0.4, H - 0.4, '🔐 대형 금고실 · 관계자 외 출입금지', '#b8955f', false); T.sign(L, 20.4, 16.5, '🚨 레이저 경보 구역', '#e5534b');
      }
      // ---- 1F 영업장
      {
        const { L, K } = lobby(T, '1F 영업장', 'marble', '#f2ede3', '은행 창구 3곳 · 번호표 · 대기석 · ATM 코너 · 방문객 대기석');
        L.windows = [10, 20.5];
        K.add({ type: 'tellerCounter', x: 2, y: 9, w: 12 }); K.blockRect(2, 9, 12, 1);
        [3.5, 7.5, 11.5].forEach((x, i) => { T.npc(L, `창구 ${i + 1}`, { x, y: 8.4, face: '+y' }, { anim: 'type', hat: i === 1 ? 'bow' : null, accent: '#2f7d4f', tie: i === 1 ? null : '#2f7d4f' }); rest(T, L, x, 10.6, '-y', 'stand', '🏦 창구 상담'); });
        K.add({ type: 'ticketMachine', x: 1.5, y: 12.5 }); K.block(1, 12);
        K.add({ type: 'ib_numBoardX', y0: 15.2 });
        K.add({ type: 'seatRow', x: 3, y: 13.2, w: 8, color: '#2f7d4f' }); K.blockRect(3, 13, 8, 1);
        for (let sx = 3.4; sx < 10.9; sx += 0.8) rest(T, L, sx, 13.55, '-y', 'sit', '🎫 번호표 대기석', [Math.floor(sx), 14]);
        K.add({ type: 'atm', x: 26.4, y: 8.1 }); K.blockRect(26, 8, 2, 1); K.add({ type: 'atm', x: 28.4, y: 8.1 }); K.blockRect(28, 8, 2, 1);
        rest(T, L, 27, 9.6, '-y', 'stand', '🏧 ATM'); rest(T, L, 29, 9.6, '-y', 'stand', '🏧 ATM');
        K.add({ type: 'ib_stanchion', x: 19.5, y: 11.5, w: 5 }); K.blockRect(19, 11, 6, 1);
        T.visitorSofa(L, K, 22, 14);
        for (const [x, y] of [[1, 17], [11, 17], [20, 17], [30, 17]]) { K.add({ type: 'ib_column', x: x + 0.5, y: y + 0.5 }); K.block(x, y); }
        plant(K, 31, 21, 1.1, 2); plant(K, 0, 21, 1, 5);
        T.npc(L, '청원경찰', { x: DX + 0.5, y: H - 5, face: '+y' }, { hat: 'police', patrol: [{ x: DX + 0.5, y: H - 5, face: '+y' }, { x: 6, y: 6, face: '+x' }, { x: 27, y: 6, face: '-x' }] });
        T.sign(L, 0.4, H - 0.4, '🏦 영업장', '#2f7d4f'); T.sign(L, 26.3, 10.7, '🏧 ATM 코너', '#2f7d4f');
      }
      // ---- 업무층
      T.workFloors(o, {
        name: (n) => `${n}F 금융 업무층`, looks: [['carpet', '#d8d3c6'], ['carpet', '#cfd6d0']],
        deco(L, K) {
          const fy = H - 2;
          K.add({ type: 'ib_column', x: 11.5, y: fy + 0.5 }); K.block(11, fy);
          K.add({ type: 'trophyCase', x: 13.3, y: fy + 0.1, w: 3.4 }); K.blockRect(13, fy, 4, 1);
          K.add({ type: 'ib_column', x: 19.5, y: fy + 0.5 }); K.block(19, fy);
        },
      });
      // ---- 트레이딩룸
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 트레이딩룸`, 'carpet', '#3b4250');
        L.desc = '실시간 시세 전광판 · 트레이딩 데스크 4열 · 리스크 관리실 · 커피 테이블';
        T.shell(L, K, { name: '📉 리스크 관리실', color: '#e5534b', glass: true });
        L.windows = [];
        L.patches.push({ x: 0, y: 0, w: T.CX, d: 5, style: 'carpet', color: '#4a5160' });
        K.add({ type: 'nocWall', x: 0.4, y: 0.25, w: 8 }); K.blockRect(0, 0, 9, 1);
        for (const c of [0, 2]) { const st = K.deskSeat(1, -0.6, c, 'B', null); T.npc(L, '리스크 매니저', { x: st.x, y: st.y, face: '-y', pose: 'sit' }, { anim: 'type', accent: '#e5534b', tie: '#2b3a67' }); }
        K.add({ type: 'ib_tickerX', y0: H - 0.8, len: H - 8.4 });
        let id = 0;
        for (const [dx, dy] of [[3, 9], [17, 9], [3, 14], [17, 14]]) {
          K.add({ type: 'ib_tradeDesk', x: dx, y: dy, w: 10 }); K.blockRect(dx, dy, 10, 2);
          for (const [cy, face] of [[dy - 0.55, '+y'], [dy + 2.55, '-y']]) for (let j = 0; j < 5; j++) {
            const cx = dx + 0.5 + j * 2, k = id++;
            K.add({ type: 'chair', x: cx, y: cy, face, part: 'seat', premium: true }); K.add({ type: 'chair', x: cx, y: cy, face, part: 'back', premium: true });
            if (k % 5 === 0) T.npc(L, '트레이더', { x: cx, y: cy, face, pose: 'sit' }, { anim: 'type', accent: '#2b3a67', tie: k % 2 ? '#e5534b' : '#4e7cf6' });
            else if (k % 5 === 2) rest(T, L, cx, cy, face, 'sit', '📈 트레이딩 체험석');
          }
        }
        T.npc(L, '트레이딩 헤드', { x: 15, y: 12.5, face: '-x' }, { anim: 'point', tie: '#7a2232', accent: '#2b2622', say: '매수!', patrol: [{ x: 15, y: 12.5, face: '-x' }, { x: 2, y: 12.5, face: '-x' }, { x: 29, y: 12.5, face: '-x' }] });
        table(T, L, K, 22, 19, '☕ 트레이딩룸 커피', { color: '#f4f1ec', stool: '#3b4250' }); table(T, L, K, 27, 19, '☕ 트레이딩룸 커피', { color: '#f4f1ec', stool: '#3b4250' });
        K.add({ type: 'cabinet', x: 29.4, y: 17.3, w: 2.2, coffee: true }); K.blockRect(29, 17, 3, 1);
        T.sign(L, 1.3, H - 0.4, '📈 트레이딩룸', '#e5534b');
      }
      // ---- VIP 라운지
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F VIP 라운지`, 'ib_parquet', '#9a6f48');
        L.desc = 'VIP 라운지 (소파·안락의자·그랜드 피아노·수족관) · 와인 셀러 · 컨시어지';
        T.shell(L, K, { name: '🍷 와인 셀러', color: '#7a2232', glass: true });
        L.patches.push({ x: 0, y: 0, w: T.CX, d: 5, style: 'carpet', color: '#5a2a32' });
        K.add({ type: 'ib_wineRack', x: 0.4, y: 0.2, w: 8 }); K.blockRect(0, 0, 9, 1);
        T.npc(L, '소믈리에', { x: 10, y: 2.5, face: '-y' }, { anim: 'idle', accent: '#7a2232', tie: '#7a2232', carry: 'tray' });
        table(T, L, K, 13, 2, '🍷 와인 시음', { color: '#f4f1ec', stool: '#7a2232' });
        L.rugs.push({ x: 1.4, y: 8.4, w: 11.2, d: 5.2, color: '#7a2232', border: '#c9a64a' });
        sofa(T, L, K, 2, 9, '🥂 VIP 라운지'); sofa(T, L, K, 8, 9, '🥂 VIP 라운지');
        K.add({ type: 'ib_lowTable', x: 2.5, y: 11, w: 2, d: 1 }); K.blockRect(2, 11, 3, 1); K.add({ type: 'ib_lowTable', x: 8.5, y: 11, w: 2, d: 1 }); K.blockRect(8, 11, 3, 1);
        for (const [x, c] of [[3, '#c9a64a'], [5, '#7a2232'], [9, '#c9a64a'], [11, '#7a2232']]) { K.add({ type: 'armchair', x: x + 0.5, y: 15.5, color: c }); rest(T, L, x + 0.5, 15.55, '+y', 'sit', '🥂 VIP 안락의자'); }
        for (const x of [4, 10]) { K.add({ type: 'roundTable', x: x + 0.5, y: 17.5, r: 0.38, color: '#f4f1ec' }); K.block(x, 17); }
        K.add({ type: 'piano', x: 24, y: 8 }); K.blockRect(24, 8, 2, 1);
        K.add({ type: 'stool', x: 24.8, y: 9.3, color: '#2b2622' });
        T.npc(L, '피아니스트', { x: 24.8, y: 9.3, face: '-y', pose: 'sit' }, { anim: 'type', accent: '#2b2622', tie: '#2b2622' });
        K.add({ type: 'aquarium', x: 19, y: 19, w: 4 }); K.blockRect(19, 19, 4, 1);
        K.add({ type: 'massageChair', x: 28.5, y: 12 }); K.block(28, 12); rest(T, L, 28.5, 12, '+y', 'sit', '💆 VIP 안마의자', [28, 13]);
        for (const [x, y] of [[15, 8], [15, 17]]) { K.add({ type: 'ib_column', x: x + 0.5, y: y + 0.5 }); K.block(x, y); }
        lamp(L, K, 0, 20); lamp(L, K, 31, 20);
        T.npc(L, '컨시어지', { x: 17, y: 12, face: '+y' }, { tie: '#7a2232', accent: '#2b2622', carry: 'tray', patrol: [{ x: 17, y: 12, face: '+y' }, { x: 6, y: 14, face: '-y' }, { x: 26, y: 15, face: '-x' }] });
        T.sign(L, 0.4, H - 0.4, '🥂 VIP 라운지', '#c9a64a');
      }
      // ---- R 옥상 정원
      {
        const { L, K } = roofLevel(T, 'R 옥상 정원', 'deck', '#bfae94', '옥상 간판 · 국기 게양대 · 토피어리 정원 · 파라솔 · 벤치');
        K.add({ type: 'ib_roofSign', x: 2, y: 0.2, w: 12, text: 'AI BANK' }); K.blockRect(2, 0, 12, 1);
        for (const x of [25.5, 27, 28.5]) { K.add({ type: 'flagStand', x, y: 4.5 }); K.block(Math.floor(x), 4); }
        L.patches.push({ x: 1, y: 6, w: 15, d: 15, style: 'grass', color: '#a6d28b' });
        for (const [x, y] of [[2, 7], [7, 7], [12, 7], [2, 19], [14, 19]]) { K.add({ type: 'topiary', x: x + 0.5, y: y + 0.5, seed: x }); K.block(x, y); }
        for (const [x, y, c] of [[4, 11, '#c9a64a'], [10, 11, '#2f7d4f'], [4, 15, '#2f7d4f'], [10, 15, '#c9a64a']]) table(T, L, K, x, y, '🌳 옥상 정원', { parasol: true, color: c, stool: '#f3d48c' });
        bench(T, L, K, 21, 18, 3, '🌳 옥상 벤치', { color: '#2f7d4f' }); bench(T, L, K, 26, 18, 3, '🌳 옥상 벤치', { color: '#2f7d4f' });
        for (const [x, y, c] of [[20.5, 9.5, '#f07a8a'], [30.5, 12.5, '#f6c445']]) { K.add({ type: 'flowerBush', x, y, size: 1, seed: x, color: c }); K.block(Math.floor(x), Math.floor(y)); }
        T.npc(L, '정원 관리인', { x: 8, y: 13.5, face: '-y' }, { hat: 'bucket', accent: '#2f7d4f', patrol: [{ x: 8, y: 13.5, face: '-y' }, { x: 22, y: 12, face: '+x' }] });
        T.sign(L, 1.4, 5.6, '🌳 옥상 정원', '#2f7d4f');
      }
      const B = T.done();
      F.n = B.levels.length - B.base - 1;
      return B;
    },
  });

  // ================================================================ 4. 🎨 아트센터
  C.indoor({
    id: 'artcenter', icon: '🎨', name: '아트센터', desc: '전시실 · 작업실 · 도예 공방 · 미디어아트 룸 · 옥상 조각정원',
    build(S, o) {
      const W = 30, H = 20, DX = 15;
      const F = { wall: '#f6f3ec', win: 'small', winColor: 'rgba(205,226,240,0.85)', frame: '#2b2622', trim: '#2b2622', sign: '🎨 AI 아트센터', signBg: '#e5534b', signFg: '#ffffff', lobby: 'rgba(230,240,248,0.9)', n: 1 };
      F.paint = (g, q) => {
        const cols = ['#e5534b', '#4e7cf6', '#f2c230', '#2b2622', '#3fb27f'];
        storeys(q, (k, top) => {
          if (k === 0) return;
          for (let j = 0; j * 4 < q.len; j++) {
            const h = (k * 7 + j * 13 + (q.south ? 0 : 5)) % 5, x0 = j * 128, w = Math.min(128, q.Wpx - x0);
            if (h < 2) { g.fillStyle = cols[(k + j * 2 + (q.south ? 0 : 1)) % cols.length]; g.fillRect(x0, top, w, q.FP - 3); if (h === 0 && w > 60) { g.fillStyle = cols[(k + j) % 3]; g.fillRect(x0 + w * 0.55, top + 8, w * 0.45, q.FP * 0.45); } }
            g.fillStyle = '#2b2622'; g.fillRect(x0 - 2, top, 4, q.FP);
          }
          g.fillStyle = '#2b2622'; g.fillRect(0, top + q.FP - 4, q.Wpx, 4);
        });
      };
      const T = C.tower(S, { W, H, id: 'artcenter', name: '🎨 AI 아트센터', facade: F });
      // ---- 1F 로비 · 아트숍
      {
        const { L, K } = lobby(T, '1F 로비·아트숍', 'ib_terrazzo', '#efebe4', '대형 조각 · 아트숍 · 로비 갤러리 · 방문객 대기석', { secColor: '#e5534b' });
        K.add({ type: 'ib_bigSculpture', x: 4, y: 10 }); K.blockRect(4, 10, 2, 2);
        L.windows = [9.6];
        K.add({ type: 'ib_frame', axis: 'x', x: 0, y: 14.8, w: 2.6, h: 46, z: 86, seed: 1, west: true }); K.add({ type: 'ib_frame', axis: 'x', x: 0, y: 18.6, w: 2.4, h: 40, z: 84, seed: 7, west: true });
        K.add({ type: 'storeShelf', x: 20.6, y: 7.6, w: 5, seed: 6 }); K.blockRect(20, 7, 6, 1);
        K.add({ type: 'till', x: 21, y: 10.4, w: 3, label: '🎨 아트숍' }); K.blockRect(21, 10, 3, 1);
        T.npc(L, '아트숍 직원', { x: 22.5, y: 9.6, face: '+y' }, { hat: 'beret', accent: '#e5534b' });
        T.visitorSofa(L, K, 20, 13);
        bench(T, L, K, 2, 15, 3, '🎨 로비 벤치', { color: '#2b2622' });
        K.add({ type: 'ib_vasePlinth', x: 8.5, y: 9.5, seed: 1 }); K.block(8, 9);
        K.add({ type: 'ib_vasePlinth', x: 27.5, y: 9.5, seed: 2 }); K.block(27, 9);
        plant(K, 29, 18, 1.1, 3);
        T.npc(L, '보안요원', { x: DX + 0.5, y: H - 5, face: '+y' }, { hat: 'police', patrol: [{ x: DX + 0.5, y: H - 5, face: '+y' }, { x: 7, y: 6, face: '+x' }, { x: 26, y: 6, face: '-x' }] });
        T.sign(L, 1.4, 12.8, '🎈 대형 조각', '#e5534b'); T.sign(L, 19.4, 11.8, '🛍️ 아트숍', '#e5534b');
      }
      // ---- 업무층
      T.workFloors(o, {
        name: (n) => `${n}F 크리에이티브 업무층`, looks: [['ib_terrazzo', '#f1eee8'], ['wood', '#e8dcc6']],
        deco(L, K, n) {
          const fy = H - 2;
          K.add({ type: 'canvasEasel', x: 11.5, y: fy + 0.5, seed: n }); K.block(11, fy);
          K.add({ type: 'ib_vasePlinth', x: 14.5, y: fy + 0.5, seed: n }); K.block(14, fy);
          K.add({ type: 'sculpture', x: 17.5, y: fy + 0.5 }); K.block(17, fy);
          L.windows = [10.4, 17.6];
          K.add({ type: 'ib_frame', axis: 'x', x: 0, y: 14.4, w: 2.4, h: 40, z: 84, seed: n + 3, west: true });
        },
      });
      // ---- 전시실
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 전시실`, 'ib_terrazzo', '#f6f4ef');
        L.desc = '회화 · 조각 · 도자 · 3D 모형 전시 · 관람 오토만 · 수장고';
        T.shell(L, K, { name: '🗝️ 수장고', color: '#6b5b4a' });
        L.windows = [];
        K.add({ type: 'storageShelf', x: 0.4, y: 0.3, w: 6, seed: 2 }); K.blockRect(0, 0, 7, 1);
        T.npc(L, '학예사', { x: 10, y: 2.5, face: '-y' }, { hat: 'beret', accent: '#6b5b4a', carry: 'paper', patrol: [{ x: 10, y: 2.5, face: '-y' }, { x: 14, y: 9, face: '+y' }] });
        for (const [y, w, seed] of [[10.8, 2.4, 11], [14.4, 2.2, 12], [18.4, 2.6, 13]]) K.add({ type: 'ib_frame', axis: 'x', x: 0, y, w, h: 46, z: 86, seed, west: true });
        K.wallY(9, 15, 10, { h: 72, color: '#fbfaf7' });
        for (const [y, seed] of [[11, 14], [14, 15]]) K.add({ type: 'ib_frame', axis: 'x', x: 10, y, w: 0.95, h: 38, z: 62, seed });
        K.wallX(17, 25, 12, { h: 72, color: '#fbfaf7' });
        for (const [x, seed] of [[18, 16], [20, 17], [22, 18]]) K.add({ type: 'ib_frame', axis: 'y', x, y: 12, w: 0.95, h: 38, z: 62, seed });
        K.add({ type: 'sculpture', x: 4.5, y: 11.5 }); K.block(4, 11);
        K.add({ type: 'sculpture', x: 14.5, y: 16.5 }); K.block(14, 16);
        K.add({ type: 'model3d', x: 6, y: 16 }); K.block(6, 16);
        for (const [x, y, s] of [[24.5, 16.5, 0], [27.5, 9.5, 1], [27.5, 16.5, 3]]) { K.add({ type: 'ib_vasePlinth', x, y, seed: s }); K.block(Math.floor(x), Math.floor(y)); }
        K.add({ type: 'ib_galleryBench', x: 3.1, y: 13.1, w: 0.8, d: 1.8 }); K.blockRect(3, 13, 1, 2);
        rest(T, L, 3.5, 13.5, '-x', 'sit', '🖼️ 회화 감상', [4, 13]); rest(T, L, 3.5, 14.5, '-x', 'sit', '🖼️ 회화 감상', [4, 14]);
        K.add({ type: 'ib_galleryBench', x: 19.1, y: 15.1, w: 1.8, d: 0.8 }); K.blockRect(19, 15, 2, 1);
        rest(T, L, 19.5, 15.5, '-y', 'sit', '🖼️ 회화 감상', [19, 16]); rest(T, L, 20.5, 15.5, '-y', 'sit', '🖼️ 회화 감상', [20, 16]);
        K.add({ type: 'ib_galleryBench', x: 12.1, y: 10.1, w: 0.8, d: 1.8 }); K.blockRect(12, 10, 1, 2);
        rest(T, L, 12.5, 10.5, '-x', 'sit', '🖼️ 회화 감상', [13, 10]); rest(T, L, 12.5, 11.5, '-x', 'sit', '🖼️ 회화 감상', [13, 11]);
        rest(T, L, 1.5, 18.5, '-x', 'stand', '🖼️ 회화 감상'); rest(T, L, 22.5, 13.5, '-y', 'stand', '🖼️ 회화 감상'); rest(T, L, 7.5, 16.5, '-x', 'stand', '🗿 조각 감상');
        T.npc(L, '도슨트', { x: 8, y: 8, face: '+y' }, { anim: 'point', hat: 'bow', accent: '#e5534b', say: '이 작품은요…', patrol: [{ x: 8, y: 8, face: '+y' }, { x: 16, y: 14, face: '-y' }, { x: 25, y: 18.5, face: '-y' }] });
        T.npc(L, '전시 보안요원', { x: 28.5, y: 18.5, face: '-x' }, { hat: 'police' });
        T.sign(L, 0.4, H - 0.4, '🖼️ 전시실', '#6b5b4a'); T.sign(L, 17.4, 13.6, '🖼️ 신진작가전', '#e5534b');
      }
      // ---- 작업실 · 도예 공방
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 작업실·도예 공방`, 'ib_splat', '#d6d2ca');
        L.desc = '회화 작업실 (이젤·제도대) · 도예 공방 (물레·가마·도자기 선반) · 재료실';
        T.shell(L, K, { name: '🧴 재료실', color: '#a67be0' });
        K.add({ type: 'storageShelf', x: 0.4, y: 0.3, w: 6, seed: 5 }); K.blockRect(0, 0, 7, 1);
        K.add({ type: 'ib_paintCans', x: 8.5, y: 0.6 }); K.block(8, 0); K.add({ type: 'ib_paintCans', x: 9.6, y: 0.7 }); K.block(9, 0);
        T.npc(L, '재료 담당', { x: 11, y: 2.5, face: '-y' }, { hat: 'beanie', accent: '#a67be0', carry: 'box', patrol: [{ x: 11, y: 2.5, face: '-y' }, { x: 3, y: 2.5, face: '-y' }] });
        K.wallY(7, H, 15, { h: 46, doors: [10, 17], color: '#efe9df' });
        for (const [x, y] of [[2, 10], [5, 10], [2, 14], [5, 14]]) { K.add({ type: 'canvasEasel', x: x + 0.5, y: y + 0.5, seed: x * 3 + y }); K.block(x, y); K.add({ type: 'stool', x: x + 0.5, y: y + 1.6, color: '#a67be0' }); rest(T, L, x + 0.5, y + 1.6, '-y', 'sit', '🎨 그림 그리기'); }
        for (const y of [9, 13]) { K.add({ type: 'drafting', x: 9, y }); K.blockRect(9, y, 2, 1); K.add({ type: 'stool', x: 9.75, y: y + 1.5, color: '#4e7cf6' }); rest(T, L, 9.75, y + 1.5, '-y', 'sit', '📐 제도 작업'); }
        K.add({ type: 'canvasEasel', x: 12.5, y: 15.5, seed: 9 }); K.block(12, 15);
        T.npc(L, '화가', { x: 12.5, y: 16.6, face: '-y' }, { anim: 'think', hat: 'beret', accent: '#e5534b' });
        T.sign(L, 0.4, H - 0.4, '🎨 회화 작업실', '#a67be0');
        L.patches.push({ x: 15, y: 7, w: 15, d: H - 7, style: 'concrete', color: '#d9cfc2' });
        K.add({ type: 'ib_potShelf', x: 16, y: 7.2, w: 6, seed: 3 }); K.blockRect(16, 7, 6, 1);
        for (const x of [17, 20, 23]) { K.add({ type: 'ib_wheel', x, y: 10 }); K.block(x, 10); K.add({ type: 'stool', x: x + 0.5, y: 11.45, color: '#c9895a' }); rest(T, L, x + 0.5, 11.45, '-y', 'sit', '🏺 도예 체험'); }
        K.add({ type: 'ib_wheel', x: 26, y: 10 }); K.block(26, 10); K.add({ type: 'stool', x: 26.5, y: 11.45, color: '#c9895a' });
        T.npc(L, '도예가', { x: 26.5, y: 11.45, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'bucket', accent: '#c9895a' });
        K.add({ type: 'ib_kiln', x: 25, y: 15 }); K.blockRect(25, 15, 2, 2);
        K.add({ type: 'ib_clayTable', x: 17, y: 14, w: 3, d: 1 }); K.blockRect(17, 14, 3, 1);
        rest(T, L, 18.5, 15.5, '-y', 'stand', '🏺 도예 체험');
        T.npc(L, '가마 장인', { x: 24, y: 17.5, face: '+x' }, { hat: 'hardhat', accent: '#c0654b' });
        T.sign(L, 15.4, H - 0.4, '🏺 도예 공방', '#c0654b');
      }
      // ---- 미디어아트 룸
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 미디어아트`, 'concrete', '#26282f');
        L.desc = '몰입형 미디어 월 · 바닥 프로젝션 · LED 큐브 · VR 체험 · 영사실';
        T.shell(L, K, { name: '🎛️ 영사실', color: '#1f9fb4' });
        L.windows = [];
        L.patches.push({ x: 0, y: 0, w: T.CX, d: 5, style: 'carpet', color: '#3b3f4a' });
        for (let i = 0; i < 3; i++) K.add({ type: 'serverRack', x: 8.4 + i * 1.05, y: 0.3 }); K.blockRect(8, 0, 4, 1);
        const st = K.deskSeat(1, -0.6, 0, 'B', null);
        T.npc(L, '미디어 아티스트', { x: st.x, y: st.y, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'headphones', accent: '#1f9fb4' });
        K.add({ type: 'ib_mediaWallX', y0: H - 0.4, len: H - 7.6 });
        K.add({ type: 'ib_projFloor', x: 1.5, y: 7.5, w: 20, d: 11.5 });
        for (const [x, y, c] of [[3.5, 10.5, '#4e9cf6'], [3.5, 13.5, '#a67be0'], [3.5, 16.5, '#f2a7c3'], [7, 12, '#3fb27f'], [7, 15, '#f6c445']]) beanbag(T, L, K, x, y, c, '🌌 미디어아트 감상', '-x');
        for (const [x, y] of [[12.5, 10.5], [16.5, 15.5], [20.5, 9.5]]) { K.add({ type: 'ib_mediaCube', x, y }); K.block(Math.floor(x), Math.floor(y)); }
        for (const [x, y] of [[24.5, 11.5], [27.5, 11.5], [24.5, 15.5]]) { K.add({ type: 'ib_vrPad', x, y }); rest(T, L, x, y, '-y', 'stand', '🥽 VR 체험'); }
        T.npc(L, 'VR 안내원', { x: 27.5, y: 15.5, face: '-x' }, { hat: 'headphones', accent: '#a67be0', patrol: [{ x: 27.5, y: 15.5, face: '-x' }, { x: 14, y: 18, face: '-y' }] });
        T.sign(L, 1.4, H - 0.4, '🌌 미디어아트 룸', '#1f9fb4'); T.sign(L, 23.4, 13.6, '🥽 VR 체험', '#a67be0');
      }
      // ---- R 조각정원
      {
        const { L, K } = roofLevel(T, 'R 조각정원', 'grass', '#a9cf8f', '풍선 강아지 조각 · 빨간 링 · 토피어리 · 벤치 · 파라솔');
        L.decals.push({ type: 'stones', x: 16.5, y: 4.5, n: 6, dx: -1.2, dy: 1.1 });
        K.add({ type: 'ib_bigSculpture', x: 3, y: 8, color: '#5fb8ff' }); K.blockRect(3, 8, 2, 2);
        K.add({ type: 'ib_ring', x: 9, y: 12 }); K.blockRect(9, 12, 2, 1);
        K.add({ type: 'sculpture', x: 21.5, y: 9.5 }); K.block(21, 9);
        K.add({ type: 'ib_vasePlinth', x: 25.5, y: 8.5, seed: 2 }); K.block(25, 8);
        for (const [x, y] of [[1, 4], [6, 4], [11, 4], [28, 4], [28, 18]]) { K.add({ type: 'topiary', x: x + 0.5, y: y + 0.5, seed: x * 3 }); K.block(x, y); }
        K.add({ type: 'hedge', x: 0.3, y: 18.3, w: 7.4, d: 0.8 }); K.blockRect(0, 18, 8, 1);
        bench(T, L, K, 2, 14, 3, '🗿 조각정원 벤치', { color: '#2b2622' }); bench(T, L, K, 20, 15, 3, '🗿 조각정원 벤치', { color: '#2b2622' });
        table(T, L, K, 13, 16, '🗿 조각정원 파라솔', { parasol: true, color: '#e5534b', stool: '#f3d48c' }); table(T, L, K, 25, 13, '🗿 조각정원 파라솔', { parasol: true, color: '#4e7cf6', stool: '#f3d48c' });
        for (const [x, y, c] of [[16.5, 10.5, '#f07a8a'], [26.5, 17.5, '#f6c445'], [12.5, 8.5, '#b38cf0']]) { K.add({ type: 'flowerBush', x, y, size: 1, seed: x, color: c }); K.block(Math.floor(x), Math.floor(y)); }
        T.npc(L, '조각가', { x: 6, y: 11, face: '-x' }, { anim: 'think', hat: 'beret', accent: '#e5534b', patrol: [{ x: 6, y: 11, face: '-x' }, { x: 18, y: 12, face: '+x' }] });
        T.sign(L, 0.4, H - 1.4, '🗿 옥상 조각정원', '#3f8a45');
      }
      const B = T.done();
      F.n = B.levels.length - B.base - 1;
      return B;
    },
  });

  // ================================================================ 5. 🏋️ 스포츠센터
  C.indoor({
    id: 'sports', icon: '🏋️', name: '스포츠센터', desc: '헬스장 · 클라이밍 월 · 실내 수영장 · 농구 코트 · 사우나·라커룸 · 옥상 러닝트랙',
    build(S, o) {
      const W = 32, H = 22, DX = 16;
      const F = { wall: '#eef2f6', texture: 'panel', win: 'band', winColor: 'rgba(170,220,250,0.82)', frame: 'rgba(40,60,80,0.4)', trim: '#e9593b', sign: '🏋️ AI 스포츠센터', signBg: '#e9593b', signFg: '#ffffff', lobby: 'rgba(200,232,250,0.88)', n: 1 };
      F.paint = (g, q) => {
        g.save(); g.beginPath();
        storeys(q, (k, top) => { if (k > 0) { g.rect(0, top, q.Wpx, 12); g.rect(0, top + q.FP - 14, q.Wpx, 14); } });
        g.clip();
        for (const [off, c] of [[0, '#e9593b'], [26, '#1f9fb4'], [44, '#f2c230']]) { g.fillStyle = c; for (let x = -q.Hb + off; x < q.Wpx; x += 260) { g.beginPath(); g.moveTo(x, q.Hb); g.lineTo(x + 18, q.Hb); g.lineTo(x + 18 + q.Hb, 0); g.lineTo(x + q.Hb, 0); g.fill(); } }
        g.restore();
        if (!q.south && q.k1 === F.n && F.n >= 2) {
          const cx = q.Wpx / 2, cy = q.FP * 0.55;
          g.fillStyle = '#e9593b'; g.beginPath(); g.arc(cx, cy, 20, 0, 7); g.fill();
          g.strokeStyle = '#ffffff'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath();
          g.moveTo(cx - 2, cy - 7); g.lineTo(cx - 5, cy + 3); g.lineTo(cx - 11, cy + 9); g.moveTo(cx - 5, cy + 3); g.lineTo(cx + 3, cy + 7); g.lineTo(cx + 2, cy + 13); g.moveTo(cx - 2, cy - 5); g.lineTo(cx + 7, cy - 1); g.moveTo(cx - 2, cy - 5); g.lineTo(cx - 10, cy - 3); g.stroke(); g.lineCap = 'butt';
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx + 1, cy - 12, 3, 0, 7); g.fill();
        }
      };
      const T = C.tower(S, { W, H, id: 'sports', name: '🏋️ AI 스포츠센터', facade: F });
      // ---- 1F 로비 · 스포츠숍
      {
        const { L, K } = lobby(T, '1F 로비·스포츠숍', 'tile', '#eef1f4', '트레이너 데스크 · 스포츠숍 · 트로피 진열장 · 방문객 대기석', { secColor: '#e9593b' });
        K.add({ type: 'reception', x: 20.6, y: 9.6, w: 5 }); K.blockRect(20, 9, 6, 1);
        T.npc(L, '트레이너', { x: 23, y: 8.9, face: '+y' }, { hat: 'cap', accent: '#e9593b' });
        K.add({ type: 'storeShelf', x: 2.6, y: 8, w: 6, seed: 3 }); K.blockRect(2, 8, 7, 1);
        K.add({ type: 'ib_ballCart', x: 2.5, y: 12.5 }); K.block(2, 12);
        K.add({ type: 'vending', x: 10.2, y: 8.25, color: '#1f9fb4' }); K.block(10, 8);
        T.visitorSofa(L, K, 21, 14);
        K.add({ type: 'trophyCase', x: 27, y: 7.3, w: 4 }); K.blockRect(27, 7, 4, 1);
        bench(T, L, K, 3, 15, 4, '🏋️ 로비 벤치', { color: '#e9593b' });
        K.add({ type: 'ib_yogaBall', x: 6.5, y: 12.5, color: '#f2a7c3' }); K.block(6, 12);
        T.npc(L, '보안요원', { x: DX + 0.5, y: H - 5, face: '+y' }, { hat: 'police', patrol: [{ x: DX + 0.5, y: H - 5, face: '+y' }, { x: 6, y: 6, face: '+x' }, { x: 28, y: 6, face: '-x' }] });
        T.sign(L, 1.4, 10.6, '🛍️ 스포츠숍', '#e9593b'); T.sign(L, 26.4, 8.7, '🏆 트로피', '#c9a64a');
      }
      // ---- 업무층
      T.workFloors(o, {
        name: (n) => `${n}F 업무층`, looks: [['ib_rubber', '#d9dee3'], ['wood', '#e6d3b0']],
        deco(L, K) {
          const fy = H - 2;
          K.add({ type: 'ib_ballCart', x: 11.5, y: fy + 0.5 }); K.block(11, fy);
          K.add({ type: 'ib_yogaBall', x: 13.5, y: fy + 0.5, color: '#1f9fb4' }); K.block(13, fy);
          K.add({ type: 'weightRack', x: 15, y: fy + 0.2 }); K.blockRect(15, fy, 2, 1);
        },
      });
      // ---- 헬스장 · 클라이밍
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 헬스장·클라이밍`, 'ib_rubber', '#40464e');
        L.desc = '러닝머신 · 스피닝 · 웨이트 · 벤치프레스 · 클라이밍 월 · 스트레칭 존 · PT룸';
        T.shell(L, K, { name: '🧴 PT룸', color: '#e9593b', glass: true });
        L.decals.push({ type: 'mat', x: 1, y: 1, w: 5, d: 3, color: '#e9593b' });
        K.add({ type: 'weightRack', x: 8, y: 0.3 }); K.blockRect(8, 0, 2, 1);
        T.npc(L, 'PT 코치', { x: 3, y: 2.5, face: '+x' }, { anim: 'point', hat: 'cap', accent: '#e9593b', say: '하나 더!' });
        rest(T, L, 4.5, 2.5, '-x', 'stand', '💪 PT 수업');
        for (const x of [2, 3.2, 4.4, 5.6, 6.8]) { K.add({ type: 'treadmill', x, y: 8.8 }); K.blockRect(Math.floor(x), 9, 1, 2); rest(T, L, x + 0.4, 9.8, '-y', 'stand', '🏃 러닝머신', [Math.floor(x), 11]); }
        for (const x of [9, 10.2, 11.4, 12.6]) { K.add({ type: 'ib_bike', x, y: 9, color: x > 11 ? '#1f9fb4' : '#e9593b' }); K.blockRect(Math.floor(x), 9, 1, 2); rest(T, L, x + 0.3, 9.85, '-y', 'sit', '🚴 스피닝', [Math.floor(x), 11]); }
        L.windows = [];
        K.add({ type: 'ib_climbWallX', y0: H - 0.4, len: 7.4 });
        L.decals.push({ type: 'mat', x: 0, y: 14.4, w: 3, d: 7.4, color: '#4e7cf6' });
        rest(T, L, 0.6, 16.5, '-x', 'stand', '🧗 클라이밍'); rest(T, L, 0.6, 19.5, '-x', 'stand', '🧗 클라이밍');
        T.npc(L, '클라이밍 강사', { x: 2.5, y: 18, face: '-x' }, { hat: 'cap', accent: '#4e7cf6' });
        K.add({ type: 'weightRack', x: 6, y: 13 }); K.blockRect(6, 13, 2, 1);
        K.add({ type: 'ib_benchPress', x: 9, y: 13 }); K.blockRect(9, 13, 1, 2);
        T.npc(L, '헬스 트레이너', { x: 11, y: 16, face: '-x' }, { hat: 'cap', accent: '#e9593b', patrol: [{ x: 11, y: 16, face: '-x' }, { x: 16, y: 11.5, face: '-y' }, { x: 5, y: 12, face: '+y' }] });
        L.decals.push({ type: 'mat', x: 18, y: 9, w: 11, d: 5, color: '#1f9fb4' });
        for (const x of [23.5, 25.5, 27.5]) rest(T, L, x, 10.5, '+y', 'sit', '🧘 스트레칭');
        for (const [x, y, c] of [[19.5, 10.5, '#f2a7c3'], [20.5, 12.5, '#f6c445'], [19, 16.5, '#7ab8f5']]) { K.add({ type: 'ib_yogaBall', x, y, color: c }); K.block(Math.floor(x), Math.floor(y)); }
        K.add({ type: 'waterCooler', x: 30.6, y: 16.3 }); K.block(30, 16);
        T.sign(L, 1.4, 13.6, '🏋️ 헬스장', '#e9593b'); T.sign(L, 3.4, H - 0.4, '🧗 클라이밍 월', '#4e7cf6'); T.sign(L, 18.4, 14.6, '🧘 스트레칭 존', '#1f9fb4');
      }
      // ---- 실내 수영장
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 실내 수영장`, 'tile', '#dfeff4');
        L.desc = '25m 실내 수영장 · 선베드 · 스파 욕조 · 안전요원 · 샤워실';
        T.shell(L, K, { name: '🚿 샤워실', color: '#1f9fb4' });
        L.patches.push({ x: 0, y: 0, w: T.CX, d: 5, style: 'tile', color: '#e4f1f7' });
        K.add({ type: 'lockers', x: 0.4, y: 0.3, w: 6 }); K.blockRect(0, 0, 7, 1);
        bench(T, L, K, 2, 2, 3, '🚿 샤워실 벤치', { color: '#1f9fb4' });
        L.decals.push({ type: 'pool', x: 2, y: 9, w: 18, d: 8 }); K.blockRect(2, 9, 18, 8);
        for (const [y, s] of [[10.3, 1], [12.4, 2], [14.5, 3], [16.2, 4]]) K.add({ type: 'ib_swimmer', x: 3, y, w: 15.5, seed: s });
        K.add({ type: 'ib_lifeguard', x: 21, y: 9 }); K.block(21, 9);
        T.npc(L, '안전요원', { x: 22.5, y: 10.5, face: '-x' }, { hat: 'cap', accent: '#e5534b', say: '뛰지 마세요!', patrol: [{ x: 22.5, y: 10.5, face: '-x' }, { x: 21, y: 17.5, face: '-y' }] });
        for (const [x, c] of [[3, '#4e9cf6'], [5, '#f2a7c3'], [7, '#f6c445'], [9, '#3fb27f'], [11, '#a67be0']]) deckChair(T, L, K, x, 18, c, '🏖️ 풀사이드 선베드');
        for (const [x, c] of [[4, '#e5534b'], [8, '#4e7cf6']]) { K.add({ type: 'parasol', x: x + 0.5, y: 18.6, color: c }); K.block(x, 18); }
        K.add({ type: 'ib_hotTub', x: 24, y: 12 }); K.blockRect(24, 12, 3, 3);
        rest(T, L, 24.25, 13.5, '+x', 'sit', '♨️ 스파 욕조', [23, 13]); rest(T, L, 25.5, 12.25, '+y', 'sit', '♨️ 스파 욕조', [25, 11]); rest(T, L, 26.75, 13.5, '-x', 'sit', '♨️ 스파 욕조', [27, 13]);
        K.add({ type: 'waterCooler', x: 30.6, y: 8.3 }); K.block(30, 8);
        plant(K, 30, 20, 1.1, 3);
        T.sign(L, 2.4, 8.6, '🏊 실내 수영장 (25m)', '#1f9fb4', false); T.sign(L, 23.4, 16.6, '♨️ 스파', '#c49a62');
      }
      // ---- 농구 코트 · 사우나 · 라커룸
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 농구코트·사우나`, 'wood', '#d9a467');
        L.desc = '실내 농구 코트 · 관람석 · 핀란드식 사우나 · 냉탕 · 라커룸';
        T.shell(L, K, { name: '🔒 라커룸', color: '#6b5b4a' });
        L.patches.push({ x: 0, y: 0, w: T.CX, d: 5, style: 'tile', color: '#e2ddd3' });
        K.add({ type: 'lockers', x: 0.4, y: 0.3, w: 8 }); K.blockRect(0, 0, 9, 1);
        bench(T, L, K, 2, 2, 4, '🔒 라커룸 벤치', { color: '#6b5b4a' });
        L.decals.push({ type: 'court', x: 1, y: 8, w: 19, d: 11, kind: 'basket' });
        K.add({ type: 'hoop', x: 1.6, y: 13.5, side: -1 }); K.block(1, 13);
        K.add({ type: 'hoop', x: 19.4, y: 13.5, side: 1 }); K.block(19, 13);
        T.npc(L, '농구 동호회', { x: 6, y: 11, face: '+x' }, { hat: 'cap', accent: '#e9593b', patrol: [{ x: 6, y: 11, face: '+x' }, { x: 15, y: 16, face: '-x' }, { x: 10, y: 13.5, face: '+x' }] });
        T.npc(L, '농구 동호회', { x: 14, y: 11, face: '-x' }, { hat: 'beanie', accent: '#4e7cf6', patrol: [{ x: 14, y: 11, face: '-x' }, { x: 4, y: 15, face: '+x' }, { x: 17, y: 13, face: '-x' }] });
        rest(T, L, 6, 12.5, '-x', 'stand', '🏀 농구 한 판'); rest(T, L, 14, 15, '+x', 'stand', '🏀 농구 한 판');
        K.add({ type: 'seatRow', x: 2, y: 19.3, w: 8, color: '#e9593b' }); K.blockRect(2, 19, 8, 1);
        for (let sx = 2.4; sx < 9.9; sx += 0.8) rest(T, L, sx, 19.65, '-y', 'sit', '🏀 관람석', [Math.floor(sx), 20]);
        K.wallY(7, H, 21, { h: 60, doors: [16], color: '#b98c5e' });
        L.patches.push({ x: 21, y: 7, w: 11, d: H - 7, style: 'wood', color: '#c49a62' });
        K.add({ type: 'ib_saunaBench', x: 22, y: 8, w: 5 }); K.blockRect(22, 8, 5, 1);
        for (let i = 0; i < 5; i++) rest(T, L, 22.5 + i, 8.75, '+y', 'sit', '♨️ 사우나', [22 + i, 9]);
        K.add({ type: 'ib_saunaBench', x: 27, y: 8, w: 4 }); K.blockRect(27, 8, 4, 1);
        for (let i = 0; i < 4; i++) rest(T, L, 27.5 + i, 8.75, '+y', 'sit', '♨️ 사우나', [27 + i, 9]);
        K.add({ type: 'ib_saunaStove', x: 29.5, y: 12.5 }); K.block(29, 12);
        L.decals.push({ type: 'pool', x: 23, y: 14, w: 4, d: 3 }); K.blockRect(23, 14, 4, 3);
        T.npc(L, '사우나 관리인', { x: 24, y: 11, face: '+y' }, { hat: 'bucket', accent: '#c49a62', carry: 'tray' });
        T.sign(L, 0.4, 8.6, '🏀 농구 코트', '#e9593b'); T.sign(L, 21.4, H - 0.4, '♨️ 사우나', '#c0654b'); T.sign(L, 22.4, 17.6, '🧊 냉탕', '#1f9fb4');
      }
      // ---- R 러닝트랙
      {
        const { L, K } = roofLevel(T, 'R 러닝트랙', 'ib_rubber', '#9a5a46', '옥상 러닝트랙 · 잔디 필드 · 스트레칭 · 벤치');
        L.decals.push({ type: 'ib_track', x: 1, y: 5, w: 30, d: 16 });
        bench(T, L, K, 8, 12, 3, '🏃 트랙 벤치', { color: '#e9593b' }); bench(T, L, K, 20, 12, 3, '🏃 트랙 벤치', { color: '#1f9fb4' });
        rest(T, L, 5, 13, '+x', 'stand', '🤸 스트레칭'); rest(T, L, 27, 13, '-x', 'stand', '🤸 스트레칭');
        K.add({ type: 'waterCooler', x: 15.6, y: 12.3 }); K.block(15, 12);
        for (const x of [24.5, 26.7, 28.9]) { K.add({ type: 'airCon', x, y: 0.4 }); K.block(Math.floor(x), 0); }
        T.npc(L, '러너', { x: 3, y: 6, face: '+x' }, { hat: 'cap', accent: '#e9593b', patrol: [{ x: 3, y: 6, face: '+x' }, { x: 28, y: 6, face: '+y' }, { x: 29, y: 19.5, face: '-x' }, { x: 3, y: 19.5, face: '-y' }] });
        T.npc(L, '러너', { x: 29, y: 19.5, face: '-x' }, { hat: 'beanie', accent: '#1f9fb4', patrol: [{ x: 29, y: 19.5, face: '-x' }, { x: 3, y: 19.5, face: '-y' }, { x: 3, y: 6, face: '+x' }, { x: 28, y: 6, face: '+y' }] });
        T.sign(L, 1.4, 4.6, '🏃 옥상 러닝트랙', '#e9593b');
      }
      const B = T.done();
      F.n = B.levels.length - B.base - 1;
      return B;
    },
  });

  // ================================================================ 6. ☕ 카페 & 베이커리
  C.indoor({
    id: 'bakery', icon: '☕', name: '카페 & 베이커리', desc: '1F 카페·빵집 · 로스터리 · 제빵 공방 · 코워킹 카페 · 루프탑 카페',
    build(S, o) {
      const W = 26, H = 18, DX = 13;
      const F = { wall: '#f7ead2', texture: 'brick', win: 'arch', winColor: 'rgba(255,236,200,0.85)', frame: '#fffaf0', trim: '#c2793f', sign: '☕ AI 카페 & 베이커리', signBg: '#7a4a2a', signFg: '#fff3dc', lobby: 'rgba(255,230,190,0.85)', awning: '#d9534f', n: 1 };
      F.paint = (g, q) => {
        const dx = DX * 32;
        storeys(q, (k, top) => {
          if (k === 0) {
            if (q.south) for (let x = 0; x < q.Wpx; x += 10) { if (Math.abs(x + 5 - dx) < 60) continue; g.fillStyle = (x / 10) % 2 ? '#ffffff' : '#d9534f'; g.fillRect(x, top + 2, 10, 9); g.beginPath(); g.arc(x + 5, top + 11, 5, 0, Math.PI); g.fill(); }
            return;
          }
          for (let i = 0; i < q.len; i++) {
            const ax = i * 32 + 4, ay = top + 4;
            g.fillStyle = 'rgba(80,40,20,0.18)'; g.fillRect(ax, ay + 10, 24, 3);
            for (let s = 0; s < 6; s++) { g.fillStyle = s % 2 ? '#ffffff' : '#d9534f'; g.beginPath(); g.moveTo(ax + s * 4, ay); g.lineTo(ax + s * 4 + 4, ay); g.lineTo(ax + s * 4 + 4.4, ay + 8); g.lineTo(ax + s * 4 - 0.4, ay + 8); g.fill(); g.beginPath(); g.arc(ax + s * 4 + 2, ay + 8, 2.1, 0, Math.PI); g.fill(); }
          }
        });
        if (!q.south && q.k1 - q.k0 >= 3 && q.len >= 8) {
          const cx = q.Wpx / 2, cy = q.Hb - q.FP * 2.1;
          g.fillStyle = '#7a4a2a'; g.beginPath(); g.arc(cx, cy, 34, 0, 7); g.fill();
          g.fillStyle = '#fff3dc'; roundRect(g, cx - 14, cy - 8, 24, 22, 5); g.fill(); g.strokeStyle = '#fff3dc'; g.lineWidth = 3; g.beginPath(); g.arc(cx + 11, cy + 2, 5, -1.3, 1.3); g.stroke();
          g.strokeStyle = 'rgba(255,243,220,0.8)'; g.lineWidth = 1.6; for (const u of [-7, 0, 7]) { g.beginPath(); g.moveTo(cx - 2 + u * 0.8, cy - 11); g.quadraticCurveTo(cx + 2 + u * 0.8, cy - 17, cx - 2 + u * 0.8, cy - 23 + Math.sin(q.t * 2 + u) * 1.5); g.stroke(); }
          g.fillStyle = '#fff3dc'; g.font = `bold 8px ${FONT}`; g.textAlign = 'center'; g.fillText('COFFEE · BREAD', cx, cy + 26); g.textAlign = 'left';
        }
      };
      const T = C.tower(S, { W, H, id: 'bakery', name: '☕ AI 카페 & 베이커리', facade: F });
      // ---- 1F 카페 & 베이커리
      {
        const { L, K } = lobby(T, '1F 카페&베이커리', 'ib_checker', '#f3e7d3', '카페 카운터 · 빵 진열대 · 화덕 피자 · 테이블석 · 방문객 대기석', { turnstiles: false, secColor: '#7a4a2a' });
        K.add({ type: 'cafeCounter', x: 0.6, y: 8, w: 6.4 }); K.blockRect(0, 8, 7, 1);
        T.npc(L, '바리스타', { x: 3, y: 7.45, face: '+y' }, { anim: 'type', hat: 'beret', accent: '#7a4a2a' });
        K.add({ type: 'breadCase', x: 8, y: 8, w: 4 }); K.blockRect(8, 8, 4, 1);
        T.npc(L, '제빵사', { x: 10, y: 7.45, face: '+y' }, { hat: 'beanie', accent: '#ffffff' });
        K.add({ type: 'pizzaOven', x: 20.5, y: 7.6 }); K.blockRect(20, 7, 3, 2);
        T.npc(L, '피자 장인', { x: 21.5, y: 9.6, face: '-y' }, { anim: 'type', hat: 'beanie', accent: '#e5534b' });
        for (const [tx, ty] of [[2, 11], [7, 11], [2, 14], [7, 14]]) table(T, L, K, tx, ty, '☕ 1F 카페', { color: '#ffffff', stool: '#c49a62' });
        T.visitorSofa(L, K, 17, 13);
        K.add({ type: 'ib_cakeStand', x: 23.5, y: 12.5 }); K.block(23, 12); K.add({ type: 'ib_cakeStand', x: 23.5, y: 15.5 }); K.block(23, 15);
        plant(K, 25, 17, 1.1, 2); plant(K, 16, 9, 0.9, 4);
        T.npc(L, '홀 직원', { x: 5, y: 12.5, face: '+y' }, { hat: 'bow', accent: '#d9534f', carry: 'tray', patrol: [{ x: 5, y: 12.5, face: '+y' }, { x: 12, y: 10, face: '-x' }, { x: 9, y: 16, face: '-y' }] });
        T.sign(L, 0.4, H - 0.4, '☕ 카페', '#7a4a2a'); T.sign(L, 8.4, 9.6, '🥐 베이커리', '#c2793f'); T.sign(L, 19.4, 10.6, '🍕 화덕', '#e5534b');
      }
      // ---- 업무층
      T.workFloors(o, {
        name: (n) => `${n}F 업무층`, looks: [['wood', '#e7d2b0'], ['ib_checker', '#f1e4cc']],
        deco(L, K) {
          const fy = H - 2;
          K.add({ type: 'ib_flourSacks', x: 10, y: fy }); K.blockRect(10, fy, 2, 1);
          K.add({ type: 'ib_cakeStand', x: 13.5, y: fy + 0.5 }); K.block(13, fy);
        },
      });
      // ---- 로스터리
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 로스터리`, 'concrete', '#cbbfae');
        L.desc = '커피 로스터 2대 · 생두 자루 · 핸드드립 바 · 커핑룸';
        T.shell(L, K, { name: '☕ 커핑룸', color: '#7a4a2a', glass: true });
        L.patches.push({ x: 0, y: 0, w: T.CX, d: 5, style: 'wood', color: '#d6bf9a' });
        K.add({ type: 'ib_cuppingTable', x: 2, y: 2, w: 4 }); K.blockRect(2, 2, 4, 1);
        T.npc(L, 'Q 그레이더', { x: 3.5, y: 1.4, face: '+y' }, { anim: 'think', hat: 'beret', accent: '#7a4a2a' });
        rest(T, L, 2.5, 3.5, '-y', 'stand', '☕ 커핑 체험'); rest(T, L, 4.5, 3.5, '-y', 'stand', '☕ 커핑 체험');
        K.add({ type: 'ib_roaster', x: 1, y: 9, s: 1 }); K.blockRect(1, 9, 3, 2);
        T.npc(L, '로스터', { x: 2.5, y: 11.6, face: '-y' }, { anim: 'type', hat: 'cap', accent: '#b87333' });
        K.add({ type: 'ib_roaster', x: 6, y: 9, s: 0.75 }); K.blockRect(6, 9, 2, 2);
        K.add({ type: 'ib_beanSacks', x: 11, y: 8, w: 3, seed: 0 }); K.blockRect(11, 8, 3, 1);
        K.add({ type: 'ib_beanSacks', x: 11, y: 10, w: 3, seed: 2 }); K.blockRect(11, 10, 3, 1);
        K.add({ type: 'ib_brewBar', x: 15, y: 13.3, w: 6 }); K.blockRect(15, 13, 6, 1);
        T.npc(L, '바리스타', { x: 17.5, y: 12.5, face: '+y' }, { anim: 'type', hat: 'beret', accent: '#7a4a2a' });
        stools(T, L, K, 15.6, 4, 1.4, 14.75, '☕ 핸드드립 바');
        table(T, L, K, 3, 15, '☕ 로스터리 테이블', { color: '#f4f1ec', stool: '#7a4a2a' }); table(T, L, K, 8, 15, '☕ 로스터리 테이블', { color: '#f4f1ec', stool: '#7a4a2a' });
        plant(K, 24, 8, 1.1, 3); lamp(L, K, 25, 16);
        T.sign(L, 0.4, 12.6, '🔥 로스팅', '#b87333'); T.sign(L, 14.4, 16.6, '☕ 핸드드립 바', '#7a4a2a');
      }
      // ---- 제빵 공방
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 제빵 공방`, 'tile', '#f4efe6');
        L.desc = '3단 데크 오븐 · 반죽기 · 반죽 작업대 · 베이킹 클래스 · 케이크 데코 · 반죽 숙성실';
        T.shell(L, K, { name: '🧊 반죽 숙성실', color: '#4e7cf6' });
        for (let k = 0; k < 3; k++) K.add({ type: 'fridge', x: 0.3 + k * 1.05, y: 0.25 }); K.blockRect(0, 0, 4, 1);
        K.add({ type: 'ib_breadRack', x: 5, y: 0.4 }); K.blockRect(5, 0, 2, 1);
        T.npc(L, '제빵사', { x: 8, y: 2.5, face: '-y' }, { hat: 'beanie', accent: '#ffffff', carry: 'tray', patrol: [{ x: 8, y: 2.5, face: '-y' }, { x: 3, y: 10.6, face: '-y' }] });
        K.add({ type: 'ib_deckOven', x: 1, y: 8, w: 4 }); K.blockRect(1, 8, 4, 2);
        T.npc(L, '제빵 장인', { x: 3, y: 10.6, face: '-y' }, { anim: 'type', hat: 'beanie', accent: '#ffffff' });
        K.add({ type: 'ib_mixer', x: 7.5, y: 8.6 }); K.block(7, 8);
        K.add({ type: 'ib_doughTable', x: 3, y: 12, w: 6, d: 1, seed: 2 }); K.blockRect(3, 12, 6, 1);
        T.npc(L, '베이킹 강사', { x: 4.5, y: 11.4, face: '+y' }, { anim: 'point', hat: 'beanie', accent: '#c2793f' });
        for (const x of [4.5, 6, 7.5]) rest(T, L, x, 13.6, '-y', 'stand', '🥐 베이킹 클래스');
        K.add({ type: 'ib_breadRack', x: 12, y: 8 }); K.blockRect(12, 8, 2, 1);
        K.add({ type: 'ib_flourSacks', x: 20, y: 8 }); K.blockRect(20, 8, 2, 1);
        K.add({ type: 'ib_doughTable', x: 15, y: 12, w: 4, d: 1, seed: 5 }); K.blockRect(15, 12, 4, 1);
        rest(T, L, 15.5, 11.4, '+y', 'stand', '🎂 케이크 데코'); rest(T, L, 17.5, 11.4, '+y', 'stand', '🎂 케이크 데코'); rest(T, L, 16.5, 13.6, '-y', 'stand', '🎂 케이크 데코');
        K.add({ type: 'ib_cakeStand', x: 22.5, y: 15.5 }); K.block(22, 15); K.add({ type: 'ib_cakeStand', x: 24, y: 15.5 }); K.block(24, 15);
        T.npc(L, '파티시에', { x: 18, y: 15, face: '-y' }, { hat: 'bow', accent: '#f2a7c3', patrol: [{ x: 18, y: 15, face: '-y' }, { x: 21, y: 10.5, face: '-x' }] });
        T.sign(L, 0.4, H - 0.4, '🥐 제빵 공방', '#c2793f'); T.sign(L, 14.4, 14.6, '🎂 케이크 데코', '#f2a7c3');
      }
      // ---- 코워킹 카페
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 코워킹 카페`, 'wood', '#d8bf98');
        L.desc = '긴 코워킹 테이블 · 카페 바 · 라운지 소파 · 빈백 · 북카페';
        T.shell(L, K, { name: '📚 북카페', color: '#3f8a45', glass: true });
        for (const x of [0.4, 2.8, 5.2]) K.add({ type: 'bookshelf', x, y: 0.3, w: 2.2, seed: x * 3 }); K.blockRect(0, 0, 8, 1);
        for (const x of [2.5, 5.5]) { K.add({ type: 'armchair', x, y: 3, color: '#a8c69a' }); rest(T, L, x, 3.05, '+y', 'sit', '📚 북카페'); }
        for (let i = 0; i < 5; i++) K.add({ type: 'tableSeg', x: 2 + i, y: 10, w: 1, d: 1 }); K.blockRect(2, 10, 5, 1);
        for (let i = 0; i < 5; i++) for (const [yy, face] of [[9.4, '+y'], [11.6, '-y']]) { K.add({ type: 'stool', x: 2.5 + i, y: yy, color: '#7a4a2a' }); rest(T, L, 2.5 + i, yy, face, 'sit', '💻 코워킹 테이블'); }
        K.add({ type: 'cafeCounter', x: 15, y: 8, w: 4 }); K.blockRect(15, 8, 4, 1);
        T.npc(L, '바리스타', { x: 16.5, y: 7.45, face: '+y' }, { anim: 'type', hat: 'beret', accent: '#3f8a45' });
        sofa(T, L, K, 14, 13, '🛋️ 코워킹 라운지');
        beanbag(T, L, K, 21, 11, '#f2a7c3', '🛋️ 코워킹 라운지'); beanbag(T, L, K, 22.5, 12.5, '#7ab8f5', '🛋️ 코워킹 라운지');
        table(T, L, K, 10, 14, '☕ 창가 테이블', { color: '#f4f1ec', stool: '#7a4a2a' });
        plant(K, 24, 8, 1.1, 6); lamp(L, K, 25, 16); lamp(L, K, 0, 16);
        T.npc(L, '커뮤니티 매니저', { x: 12, y: 8, face: '+y' }, { carry: 'paper', accent: '#3f8a45', patrol: [{ x: 12, y: 8, face: '+y' }, { x: 8, y: 13, face: '-x' }, { x: 20, y: 15, face: '-y' }] });
        T.sign(L, 0.4, H - 0.4, '💻 코워킹 카페', '#3f8a45');
      }
      // ---- R 루프탑 카페
      {
        const { L, K } = roofLevel(T, 'R 루프탑 카페', 'deck', '#c9a57a', '루프탑 카페 바 · 파라솔 테이블 · 선베드 · 전구 줄조명');
        K.add({ type: 'cafeCounter', x: 0.6, y: 5.2, w: 5 }); K.blockRect(0, 5, 6, 1);
        T.npc(L, '바리스타', { x: 2.6, y: 4.6, face: '+y' }, { anim: 'type', hat: 'beret', accent: '#7a4a2a' });
        stools(T, L, K, 1.2, 4, 1.3, 6.75, '☕ 루프탑 카페 바');
        for (const [x, y, c] of [[3, 10, '#d9534f'], [8, 10, '#f2c230'], [3, 14, '#4e7cf6'], [8, 14, '#3fb27f']]) table(T, L, K, x, y, '☕ 루프탑 카페', { parasol: true, color: c, stool: '#f3d48c' });
        for (const [x, c] of [[18, '#f2a7c3'], [20, '#f6c445'], [22, '#7ab8f5']]) deckChair(T, L, K, x, 12, c, '☀️ 루프탑 선베드');
        K.add({ type: 'stringLights', pts: [[0.5, 8.5], [W - 0.5, 8.5], [W - 0.5, H - 0.5]] }); for (const [x, y] of [[0, 8], [W - 1, 8], [W - 1, H - 1]]) K.block(x, y);
        for (const x of [18, 21]) { K.add({ type: 'planter', x, y: 0.4, w: 2.2, seed: x }); K.blockRect(x, 0, 3, 1); }
        for (const [x, y, c] of [[13.5, 6.5, '#f07a8a'], [24.5, 5.5, '#f6c445']]) { K.add({ type: 'flowerBush', x, y, size: 1, seed: x, color: c }); K.block(Math.floor(x), Math.floor(y)); }
        T.npc(L, '서버', { x: 6, y: 12, face: '+y' }, { hat: 'bow', accent: '#d9534f', carry: 'tray', patrol: [{ x: 6, y: 12, face: '+y' }, { x: 15, y: 9.5, face: '+x' }, { x: 10, y: 16, face: '-y' }] });
        T.sign(L, 0.4, 8.0, '☕ 루프탑 카페', '#7a4a2a');
      }
      const B = T.done();
      F.n = B.levels.length - B.base - 1;
      return B;
    },
  });

  // ================================================================ 7. 🗼 초고층 타워
  C.indoor({
    id: 'skytower', icon: '🗼', name: '초고층 타워', desc: '좁고 높은 유리 타워 · 오피스 · 스카이 로비 · 피난안전층 · 전망대 · 스카이라운지 · 헬리포트',
    build(S, o) {
      const W = 22, H = 16, DX = 11;
      const F = { wall: '#7fa3bd', win: 'band', winColor: 'rgba(200,232,250,0.85)', frame: 'rgba(50,80,110,0.55)', trim: '#dfe8ef', sign: '🗼 AI 스카이타워', signBg: '#22384d', signFg: '#e8f4ff', lobby: 'rgba(210,235,250,0.9)', n: 1, sky: -1, deck: -1 };
      F.paint = (g, q) => {
        const gr = g.createLinearGradient(0, 0, q.Wpx, q.Hb); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.42, 'rgba(255,255,255,0.13)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(0.62, 'rgba(255,255,255,0.08)'); gr.addColorStop(0.7, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, q.Wpx, q.Hb - (q.k0 === 0 ? q.FP : 0));
        g.fillStyle = 'rgba(232,242,250,0.6)'; for (let i = 1; i < q.len; i++) g.fillRect(i * 32 - 1, 0, 2, q.Hb - (q.k0 === 0 ? q.FP : 0));
        storeys(q, (k, top) => {
          if (k !== F.sky && k !== F.deck) return;
          const sky = k === F.sky;
          g.fillStyle = sky ? 'rgba(226,185,59,0.95)' : 'rgba(26,40,64,0.95)'; g.fillRect(0, top, q.Wpx, 7); g.fillRect(0, top + q.FP - 8, q.Wpx, 5);
          if (q.south) { g.fillStyle = sky ? '#2b2216' : '#9fd8ff'; g.font = `bold 6px ${FONT}`; g.fillText(sky ? 'SKY LOBBY' : 'SKY DECK 360°', 8, top + 6); }
        });
        if (q.k1 === F.n) {
          g.fillStyle = '#dfe8ef'; g.fillRect(-2, -3, q.Wpx + 4, 9);
          for (let x = 6; x < q.Wpx - 4; x += 12) { g.fillStyle = q.night ? '#fff3c4' : '#b9c7d2'; g.fillRect(x, 0, 6, 2.6); }
          if (Math.sin(q.t * 3) > 0.2) { g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(3, -1, 2.4, 0, 7); g.arc(q.Wpx - 3, -1, 2.4, 0, 7); g.fill(); }
        }
      };
      const T = C.tower(S, { W, H, id: 'skytower', name: '🗼 AI 스카이타워', facade: F });
      // ---- 1F 그랜드 로비
      {
        const { L, K } = lobby(T, '1F 그랜드 로비', 'marble', '#f0efec', '그랜드 로비 · 안내 데스크 · 타워 모형 · 층별 안내 · 방문객 대기석');
        K.add({ type: 'reception', x: 14.6, y: 8.6, w: 5 }); K.blockRect(14, 8, 6, 1);
        T.npc(L, '안내원', { x: 17, y: 7.9, face: '+y' }, { hat: 'bow', accent: '#22384d' });
        T.visitorSofa(L, K, 15, 12);
        K.add({ type: 'ib_towerModel', x: 2, y: 9 }); K.blockRect(2, 9, 2, 2);
        K.add({ type: 'ib_directory', x: 5.5, y: 8.5 }); K.block(5, 8);
        bench(T, L, K, 1, 13, 3, '🗼 로비 벤치', { color: '#22384d' });
        plant(K, 21, 14, 1.1, 2); plant(K, 6, 14, 1, 7);
        T.npc(L, '보안요원', { x: DX + 0.5, y: H - 5, face: '+y' }, { hat: 'police', patrol: [{ x: DX + 0.5, y: H - 5, face: '+y' }, { x: 3, y: 6, face: '+x' }, { x: 19, y: 6, face: '-x' }] });
        T.sign(L, 1.4, 11.8, '🗼 타워 모형', '#22384d');
      }
      // ---- 오피스층
      T.workFloors(o, {
        name: (n) => `${n}F 오피스`, looks: [['carpet', '#d9dde2'], ['carpet', '#e0dccf']],
        deco(L, K) { const fy = H - 2; plant(K, 10, fy, 0.9, 3); K.add({ type: 'umbrellaStand', x: 11.5, y: fy + 0.5 }); K.block(11, fy); plant(K, 12, fy, 0.9, 5); },
      });
      const lv = () => T.levels.length - 1;
      // ---- 스카이 로비 (환승층)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 스카이 로비`, 'marble', '#ece9e2');
        L.desc = '고층부 환승 로비 · 컨시어지 · 라운지 소파 · 수족관';
        F.sky = lv();
        T.shell(L, K, { name: '🛎️ 컨시어지', color: '#c9a64a', glass: true });
        K.add({ type: 'reception', x: 1, y: 2, w: 4 }); K.blockRect(1, 2, 5, 1);
        T.npc(L, '컨시어지', { x: 3, y: 1.4, face: '+y' }, { hat: 'bow', accent: '#c9a64a', tie: '#c9a64a' });
        sofa(T, L, K, 2, 9, '🛋️ 스카이 로비 라운지'); sofa(T, L, K, 7, 9, '🛋️ 스카이 로비 라운지'); sofa(T, L, K, 14, 9, '🛋️ 스카이 로비 라운지');
        K.add({ type: 'aquarium', x: 2, y: 13, w: 4 }); K.blockRect(2, 13, 4, 1);
        K.add({ type: 'ib_directory', x: 11.5, y: 8.5, title: '🔁 고층부 환승', lines: ['스카이라운지', '전망대', '고층 엘리베이터', '저층 엘리베이터', '1F 로비'] }); K.block(11, 8);
        plant(K, 21, 14, 1.1, 4); plant(K, 18, 13, 1, 6);
        T.npc(L, '스카이 로비 안내원', { x: 12, y: 12, face: '+y' }, { hat: 'bow', accent: '#22384d', patrol: [{ x: 12, y: 12, face: '+y' }, { x: 4, y: 6, face: '+x' }, { x: 19, y: 11.5, face: '-x' }] });
        T.sign(L, 0.4, H - 0.4, '🔁 스카이 로비', '#c9a64a');
      }
      // ---- 중간층 (지상 12층 이상이 되도록 채운다)
      const fillers = {
        refuge(L, K, n) {
          L.desc = '피난안전구역 · 비상 발전기 · 저수조 · 비상 물자 · 방재실';
          T.shell(L, K, { name: '🧯 방재실', color: '#e5534b' });
          K.add({ type: 'electricPanel', x: 0.3, y: 0, w: 6.4 }); K.blockRect(0, 0, 7, 1);
          L.decals.push({ type: 'hazard', x: 0.4, y: 7.4, w: 21.2, d: 8.2 });
          K.add({ type: 'storageShelf', x: 1.3, y: 8.2, w: 6, seed: n }); K.blockRect(1, 8, 7, 1);
          K.add({ type: 'generator', x: 15.2, y: 8 }); K.blockRect(15, 8, 3, 2);
          K.add({ type: 'waterTank', x: 20, y: 11 }); K.blockRect(19, 10, 2, 2);
          bench(T, L, K, 2, 12, 4, '🧯 피난안전구역 대기', { color: '#e5534b' }); bench(T, L, K, 8, 12, 4, '🧯 피난안전구역 대기', { color: '#e5534b' });
          T.npc(L, '안전관리자', { x: 10, y: 9.5, face: '+y' }, { hat: 'hardhat', accent: '#e5534b', carry: 'paper', patrol: [{ x: 10, y: 9.5, face: '+y' }, { x: 3, y: 14.5, face: '+x' }, { x: 17, y: 14.5, face: '-x' }] });
          T.sign(L, 0.4, H - 0.4, '🧯 피난안전층', '#e5534b');
        },
        library(L, K, n) {
          L.desc = '구름 위 도서관 · 서가 · 열람 테이블 · 열람 데스크';
          T.shell(L, K, { name: '📖 열람 데스크', color: '#3f8a45', glass: true });
          K.add({ type: 'reception', x: 1, y: 2, w: 4 }); K.blockRect(1, 2, 5, 1);
          T.npc(L, '사서', { x: 3, y: 1.4, face: '+y' }, { anim: 'type', hat: 'beret', accent: '#3f8a45' });
          for (const y of [8, 10.5, 13]) { K.add({ type: 'bookStack', x: 0.5, y, w: 6, seed: y * 7 + n }); K.blockRect(0, Math.floor(y), 7, 1); }
          K.add({ type: 'readingTable', x: 9, y: 10, w: 7 }); K.blockRect(9, 10, 7, 2);
          for (let x = 9.6; x < 16; x += 1.6) for (const [dy, face] of [[-0.55, '+y'], [2.6, '-y']]) { K.add({ type: 'stool', x, y: 10 + dy, color: '#a87a52' }); rest(T, L, x, 10 + dy, face, 'sit', '📚 스카이 도서관'); }
          lamp(L, K, 20, 14); plant(K, 20, 8, 1, 4);
          T.sign(L, 0.4, H - 0.4, '📚 스카이 도서관', '#3f8a45');
        },
        hotel(L, K, n) {
          L.desc = '호텔 객실 3칸 · 하우스키핑';
          T.shell(L, K, { name: '🧺 하우스키핑', color: '#a67be0' });
          K.add({ type: 'janitorCart', x: 1, y: 0.4 }); K.blockRect(1, 0, 2, 1); K.add({ type: 'lockers', x: 3.6, y: 0.3, w: 3 }); K.blockRect(3, 0, 4, 1);
          K.wallX(0, W, 7, { h: 46, doors: [3, 10, 17], color: '#e7e1d8' });
          for (const x of [7, 14]) K.wallY(7, H, x, { h: 46, color: '#e7e1d8' });
          [[0, 7], [7, 14], [14, 22]].forEach(([rx, rx1], i) => {
            L.patches.push({ x: rx, y: 7, w: rx1 - rx, d: H - 7, style: 'carpet', color: i % 2 ? '#d8cfe6' : '#e6dcef' });
            const bx2 = rx1 - 1.6; K.add({ type: 'bed', x: bx2, y: 8.4, color: PAL[(i + n) % PAL.length] }); K.blockRect(Math.floor(bx2), 8, 2, 3);
            rest(T, L, bx2 + 0.5, 9.3, '+y', 'sofa', `🛏️ 호텔 ${n}0${i + 1}호`, [Math.floor(bx2) - 1, 9]);
            K.add({ type: 'armchair', x: rx + 1.5, y: 13.5, color: '#c9a64a' }); rest(T, L, rx + 1.5, 13.55, '+y', 'sit', `🛏️ 호텔 ${n}0${i + 1}호`);
            lamp(L, K, rx, 8);
            T.sign(L, rx + 0.3, H - 0.3, `🛏️ ${n}0${i + 1}호`, '#a67be0');
          });
          T.npc(L, '하우스키퍼', { x: 10, y: 6, face: '+x' }, { hat: 'bow', accent: '#a67be0', carry: 'mop', patrol: [{ x: 10, y: 6, face: '+x' }, { x: 3, y: 6, face: '+x' }, { x: 17, y: 6, face: '-x' }] });
        },
        gym(L, K, n) {
          L.desc = '스카이 피트니스 · 창가 러닝머신 · 요가 매트';
          T.shell(L, K, { name: '🧴 탈의실', color: '#e9593b' });
          K.add({ type: 'lockers', x: 0.4, y: 0.3, w: 5 }); K.blockRect(0, 0, 6, 1);
          for (const x of [2, 3.2, 4.4, 5.6, 6.8, 8]) { K.add({ type: 'treadmill', x, y: 8.8 }); K.blockRect(Math.floor(x), 9, 1, 2); rest(T, L, x + 0.4, 9.8, '-y', 'stand', '🏃 스카이 러닝', [Math.floor(x), 11]); }
          L.decals.push({ type: 'mat', x: 11, y: 9, w: 9, d: 5, color: '#1f9fb4' });
          for (const x of [13, 15.5, 18]) rest(T, L, x, 11.5, '+y', 'sit', '🧘 스카이 요가');
          K.add({ type: 'weightRack', x: 2, y: 13 }); K.blockRect(2, 13, 2, 1);
          T.npc(L, '트레이너', { x: 10, y: 12.5, face: '-x' }, { hat: 'cap', accent: '#e9593b', patrol: [{ x: 10, y: 12.5, face: '-x' }, { x: 16, y: 14.5, face: '-y' }] });
          T.sign(L, 0.4, H - 0.4, '🏃 스카이 피트니스', '#e9593b');
        },
        garden(L, K, n) {
          L.desc = '실내 스카이 가든 · 나무 · 벤치 · 꽃';
          T.shell(L, K, { name: '🌱 온실 관리실', color: '#3f8a45', glass: true });
          K.add({ type: 'veggies', x: 0.5, y: 0.5, w: 5, d: 2, seed: n }); K.blockRect(0, 0, 6, 3);
          L.patches.push({ x: 0, y: 7, w: W, d: H - 7, style: 'grass', color: '#a6d28b' });
          for (const [x, y, b] of [[2, 8, true], [9, 8, false], [16, 8, true], [20, 12, false]]) { K.add({ type: 'roofTree', x: x + 0.5, y: y + 0.5, size: 1.1, seed: x * 3 + n, blossom: b }); K.block(x, y); }
          bench(T, L, K, 3, 12, 3, '🌳 스카이 가든', { color: '#3f8a45' }); bench(T, L, K, 11, 12, 3, '🌳 스카이 가든', { color: '#3f8a45' });
          for (const [x, y, c] of [[7.5, 14.5, '#f07a8a'], [15.5, 14.5, '#f6c445'], [1.5, 14.5, '#b38cf0']]) { K.add({ type: 'flowerBush', x, y, size: 1, seed: x, color: c }); K.block(Math.floor(x), Math.floor(y)); }
          T.npc(L, '정원사', { x: 8, y: 10.5, face: '-y' }, { hat: 'bucket', accent: '#3f8a45', patrol: [{ x: 8, y: 10.5, face: '-y' }, { x: 18, y: 14.5, face: '-x' }] });
          T.sign(L, 0.4, H - 0.4, '🌳 스카이 가든', '#3f8a45');
        },
      };
      const names = { refuge: '피난안전층', library: '스카이 도서관', hotel: '호텔 객실층', gym: '스카이 피트니스', garden: '스카이 가든' };
      const order = ['refuge', 'library', 'hotel', 'gym', 'garden'];
      const need = Math.max(0, 12 - T.levels.length - 2);
      for (let i = 0; i < need; i++) {
        const kind = order[i % order.length], n = T.nextFloor();
        const { L, K } = T.level(`${n}F ${names[kind]}`, kind === 'garden' ? 'wood' : kind === 'refuge' ? 'concrete' : kind === 'gym' ? 'ib_rubber' : 'carpet', { refuge: '#c9c8c3', library: '#d8cdb8', hotel: '#e3dccf', gym: '#9fb3c8', garden: '#d9c49e' }[kind]);
        fillers[kind](L, K, n);
      }
      // ---- 전망대
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 전망대`, 'ib_glass', '#22314a');
        L.desc = '360° 전망대 · 유리 바닥 스카이워크 · 동전 망원경 · 매표소';
        F.deck = lv();
        T.shell(L, K, { name: '🎟️ 매표소', color: '#4e7cf6', glass: true });
        L.patches.push({ x: 0, y: 0, w: T.CX, d: 5, style: 'marble', color: '#e3e7ec' });
        K.add({ type: 'till', x: 1, y: 2, w: 3, label: '🎟️ 전망대 매표소' }); K.blockRect(1, 2, 3, 1);
        T.npc(L, '매표원', { x: 2.5, y: 1.4, face: '+y' }, { hat: 'cap', accent: '#4e7cf6' });
        L.decals.push({ type: 'floor', x: 7.5, y: 8.5, w: 7, d: 4, color: 'rgba(150,210,255,0.12)' });
        for (const x of [3.5, 7.5, 15.5, 19.5]) { K.add({ type: 'ib_telescope', kind: 'viewer', x, y: 14.5 }); K.block(Math.floor(x), 14); rest(T, L, x, 13.4, '+y', 'stand', '🔭 전망 망원경'); }
        for (const y of [9.5, 11.5]) { K.add({ type: 'ib_telescope', kind: 'viewer', x: 20.5, y }); K.block(20, Math.floor(y)); rest(T, L, 19.5, y, '+x', 'stand', '🔭 전망 망원경'); }
        bench(T, L, K, 9, 11, 3, '🌆 스카이워크 벤치', { color: '#22384d' });
        T.npc(L, '전망대 안내원', { x: 11, y: 9, face: '+y' }, { hat: 'cap', accent: '#4e7cf6', say: '발밑을 보세요!', patrol: [{ x: 11, y: 9, face: '+y' }, { x: 4, y: 12, face: '+y' }, { x: 17, y: 12, face: '+y' }] });
        T.sign(L, 7.6, 8.4, '🌆 유리 바닥 스카이워크', '#4e7cf6'); T.sign(L, 0.4, H - 0.4, '🔭 전망대', '#22384d');
      }
      // ---- 스카이라운지
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 스카이라운지`, 'carpet', '#3c3350');
        L.desc = '스카이라운지 바 · 피아노 · 야경 소파석 · 바 창고';
        T.shell(L, K, { name: '🍸 바 창고', color: '#a67be0' });
        K.add({ type: 'ib_wineRack', x: 0.4, y: 0.2, w: 5 }); K.blockRect(0, 0, 6, 1);
        K.add({ type: 'beerTap', x: 1, y: 8, w: 4 }); K.blockRect(1, 8, 4, 1);
        T.npc(L, '바텐더', { x: 3, y: 7.5, face: '+y' }, { anim: 'type', hat: 'shades', accent: '#2b2622', tie: '#a67be0' });
        stools(T, L, K, 1.6, 3, 1.3, 9.75, '🍸 스카이 바');
        K.add({ type: 'piano', x: 16, y: 8 }); K.blockRect(16, 8, 2, 1);
        K.add({ type: 'stool', x: 16.8, y: 9.3, color: '#2b2622' });
        T.npc(L, '피아니스트', { x: 16.8, y: 9.3, face: '-y', pose: 'sit' }, { anim: 'type', accent: '#2b2622', tie: '#2b2622' });
        sofa(T, L, K, 7, 12, '🌃 야경 소파석'); sofa(T, L, K, 13, 12, '🌃 야경 소파석');
        lamp(L, K, 21, 14); lamp(L, K, 0, 14); plant(K, 21, 8, 1, 4);
        L.rugs.push({ x: 6.5, y: 11.6, w: 10, d: 3.6, color: '#5a4a72', border: '#c9a64a' });
        T.sign(L, 0.4, H - 0.4, '🍸 스카이라운지', '#a67be0');
      }
      // ---- R 헬리포트
      {
        const { L, K } = roofLevel(T, 'R 헬리포트', 'concrete', '#8d9399', '헬리패드 · 헬리콥터 · 풍향 자루 · 안테나 · 헬기 대기석');
        L.decals.push({ type: 'ib_helipad', x: 8, y: 4.5, w: 11, d: 11 });
        K.add({ type: 'ib_heli', x: 12, y: 9 }); K.blockRect(12, 9, 3, 2);
        K.add({ type: 'ib_windsock', x: 20.5, y: 14.5 }); K.block(20, 14);
        for (const x of [1.5, 20.5]) { K.add({ type: 'ib_mast', x, y: 1.5 }); K.block(Math.floor(x), 1); }
        bench(T, L, K, 1, 13, 3, '🚁 헬기 대기석', { color: '#f2c230' }); bench(T, L, K, 1, 10, 3, '🚁 헬기 대기석', { color: '#f2c230' });
        T.npc(L, '헬기 조종사', { x: 15.5, y: 11.5, face: '+y' }, { hat: 'headphones', accent: '#2b3a67' });
        T.npc(L, '유도원', { x: 10, y: 14.5, face: '+y' }, { hat: 'cap', accent: '#f2c230', patrol: [{ x: 10, y: 14.5, face: '+y' }, { x: 17, y: 14.5, face: '-x' }, { x: 7, y: 6, face: '+x' }] });
        T.sign(L, 0.4, 9.6, '🚁 헬리포트', '#f2c230');
      }
      const B = T.done();
      F.n = B.levels.length - B.base - 1;
      return B;
    },
  });

  // ================================================================ 8. 🛏️ 코리빙 하우스
  C.indoor({
    id: 'coliving', icon: '🛏️', name: '코리빙 하우스', desc: '공유 주방·세탁실 · 개인 방 · 홈시네마·게임룸 · 옥상 텃밭·바비큐',
    build(S, o) {
      const W = 26, H = 20, DX = 13;
      const F = { wall: '#fbf3ee', win: 'grid', winColor: 'rgba(214,236,248,0.85)', frame: '#ffffff', trim: '#ffffff', sign: '🛏️ AI 코리빙 하우스', signBg: '#7fc8a9', signFg: '#ffffff', lobby: 'rgba(230,245,240,0.88)', n: 1 };
      F.paint = (g, q) => {
        const past = ['#f9d5dc', '#cdeedd', '#fff1b8', '#dcd3f5', '#cfe7fb'];
        storeys(q, (k, top) => {
          if (k === 0) return;
          const wh = q.FP - 22, wy = top + (q.FP - wh) / 2 - 2;
          g.save(); g.beginPath(); g.rect(0, top, q.Wpx, q.FP - 3); for (let i = 0; i < q.len; i++) g.rect(i * 32 + 4, wy - 2, 24, wh + 4);
          g.fillStyle = past[(k + (q.south ? 0 : 2)) % past.length]; g.fill('evenodd'); g.restore();
          for (let i = (k % 2) * 2; i + 2 <= q.len; i += 4) {
            const bx0 = i * 32 + 2, bw = 60, by = top + q.FP - 6;
            g.fillStyle = 'rgba(80,60,60,0.15)'; g.fillRect(bx0 - 2, by + 4, bw + 4, 3);
            g.fillStyle = '#ffffff'; g.fillRect(bx0 - 2, by, bw + 4, 4); g.fillRect(bx0, by - 16, bw, 2);
            for (let u = bx0; u <= bx0 + bw; u += 5) g.fillRect(u, by - 16, 1.2, 16);
            for (let u = bx0 + 6; u < bx0 + bw - 4; u += 14) { g.fillStyle = '#c96a3a'; g.fillRect(u, by - 22, 7, 6); g.fillStyle = '#5b9b4a'; g.beginPath(); g.arc(u + 3.5, by - 24, 4.5, 0, 7); g.fill(); g.fillStyle = PAL[Math.round(u / 14 + k) % PAL.length]; g.beginPath(); g.arc(u + 2, by - 26, 1.6, 0, 7); g.arc(u + 5.5, by - 25, 1.6, 0, 7); g.fill(); }
          }
        });
      };
      const T = C.tower(S, { W, H, id: 'coliving', name: '🛏️ AI 코리빙 하우스', facade: F });
      // ---- 1F 로비 · 우편실
      {
        const { L, K } = lobby(T, '1F 로비·우편실', 'wood', '#e8d8bc', '입주민 로비 · 우편함 · 택배 선반 · 신발장 · 게시판 · 방문객 대기석', { turnstiles: false, secName: '🧑‍💼 관리사무소', secColor: '#7fc8a9' });
        K.add({ type: 'mailboxes', x: 0.6, y: 8, w: 4 }); K.blockRect(0, 8, 5, 1);
        K.add({ type: 'parcelShelf', x: 5.6, y: 8, w: 3, seed: 4 }); K.blockRect(5, 8, 4, 1);
        K.add({ type: 'ib_shoeRack', x: 20, y: 8, w: 3 }); K.blockRect(20, 8, 3, 1);
        L.windows = [10.4, 18.6];
        K.add({ type: 'ib_corkBoardX', y0: 15 });
        T.visitorSofa(L, K, 16, 13);
        table(T, L, K, 3, 13, '☕ 입주민 라운지', { color: '#fff3c4', stool: '#7fc8a9' }); table(T, L, K, 7, 13, '☕ 입주민 라운지', { color: '#fff3c4', stool: '#f2a7c3' });
        beanbag(T, L, K, 3, 16.5, '#f2a7c3', '☕ 입주민 라운지'); beanbag(T, L, K, 5, 16.5, '#7fc8a9', '☕ 입주민 라운지');
        K.add({ type: 'bikeRack', x: 22.5, y: 15.5 }); K.blockRect(22, 15, 2, 1);
        K.add({ type: 'catTree', x: 24.5, y: 11.5 }); K.block(24, 11);
        T.npc(L, '하우스 매니저', { x: 9, y: 11, face: '+y' }, { hat: 'bow', accent: '#7fc8a9', carry: 'box', patrol: [{ x: 9, y: 11, face: '+y' }, { x: 6, y: 9.5, face: '-y' }, { x: 20, y: 10, face: '-y' }] });
        T.sign(L, 0.4, 9.6, '📬 우편함 · 택배', '#7fc8a9'); T.sign(L, 0.4, H - 0.4, '☕ 입주민 라운지', '#f2a7c3');
      }
      // ---- 공유 오피스
      T.workFloors(o, {
        name: (n) => `${n}F 공유 오피스`, looks: [['wood', '#ead6b6'], ['carpet', '#e6dde8']],
        deco(L, K) { const fy = H - 2; K.add({ type: 'catTree', x: 11.5, y: fy + 0.5 }); K.block(11, fy); K.add({ type: 'beanbag', x: 13.5, y: fy + 0.5, color: '#f2a7c3' }); K.block(13, fy); plant(K, 15, fy, 1, 4); },
      });
      // ---- 공유 주방 · 세탁실
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 공유 주방·세탁실`, 'tile', '#f2ece2');
        L.desc = '공유 주방 · 키친 아일랜드 · 12인 공유 식탁 · 세탁실';
        T.shell(L, K, { name: '🧺 세탁실', color: '#4e7cf6' });
        L.patches.push({ x: 0, y: 0, w: T.CX, d: 5, style: 'tile', color: '#e4edf5' });
        for (let k = 0; k < 7; k++) K.add({ type: 'washer', x: 0.3 + k * 1.02, y: 0.3, k }); K.blockRect(0, 0, 8, 1);
        K.add({ type: 'ib_dryRack', x: 8.2, y: 1.6 }); K.blockRect(8, 1, 2, 2);
        rest(T, L, 2.5, 2, '-y', 'stand', '🧺 빨래 기다리기'); rest(T, L, 4.5, 2, '-y', 'stand', '🧺 빨래 기다리기');
        K.add({ type: 'kitchenLine', x: 0.4, y: 7.3, w: 9, kind: 'pot' }); K.blockRect(0, 7, 10, 1);
        K.add({ type: 'fridge', x: 10.2, y: 7.25 }); K.block(10, 7);
        T.npc(L, '요리하는 입주민', { x: 4, y: 8.4, face: '-y' }, { anim: 'type', hat: 'bow', accent: '#f2a7c3' });
        K.add({ type: 'ib_island', x: 2, y: 10, w: 6 }); K.blockRect(2, 10, 6, 1);
        for (let i = 0; i < 5; i++) { K.add({ type: 'barStool', x: 2.5 + i * 1.2, y: 11.6 }); rest(T, L, 2.5 + i * 1.2, 11.6, '-y', 'sit', '🍳 키친 아일랜드'); }
        for (let i = 0; i < 6; i++) K.add({ type: 'tableSeg', x: 13 + i, y: 12, w: 1, d: 1 }); K.blockRect(13, 12, 6, 1);
        for (let i = 0; i < 5; i++) for (const [yy, face] of [[11.4, '+y'], [13.6, '-y']]) { K.add({ type: 'stool', x: 13.6 + i * 1.2, y: yy, color: ['#f2a7c3', '#7fc8a9', '#f6c445'][i % 3] }); rest(T, L, 13.6 + i * 1.2, yy, face, 'sit', '🍽️ 공유 식탁'); }
        lamp(L, K, 20, 8); lamp(L, K, 12, 8); plant(K, 25, 18, 1.1, 3);
        T.sign(L, 0.4, 9.2, '🍳 공유 주방', '#e9a23b'); T.sign(L, 12.4, 15.2, '🍽️ 공유 식탁', '#7fc8a9');
      }
      // ---- 개인 방
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 개인 방`, 'carpet', '#e3dccf');
        L.desc = '개인 방 4칸 (침대·책상·옷장·빈백) · 하우스키핑';
        T.shell(L, K, { name: '🧹 하우스키핑', color: '#3f8a45' });
        K.add({ type: 'janitorCart', x: 1, y: 0.4 }); K.blockRect(1, 0, 2, 1); K.add({ type: 'lockers', x: 4, y: 0.3, w: 3 }); K.blockRect(4, 0, 3, 1);
        T.npc(L, '하우스키퍼', { x: 5, y: 2.5, face: '-y' }, { hat: 'bucket', accent: '#3f8a45', carry: 'mop', patrol: [{ x: 5, y: 2.5, face: '-y' }, { x: 5, y: 6.2, face: '+x' }, { x: 20, y: 6.2, face: '-x' }] });
        K.wallX(0, W, 7, { h: 46, doors: [3, 9, 15, 22], color: '#efe6dc' });
        for (const x of [6, 12, 18]) K.wallY(7, H, x, { h: 46, color: '#efe6dc' });
        const pastel = ['#f9d5dc', '#cdeedd', '#fff1b8', '#dcd3f5'];
        [[0, 6], [6, 12], [12, 18], [18, 26]].forEach(([rx, rx1], i) => {
          const rw = rx1 - rx, tag = `🛏️ 개인 방 ${n}0${i + 1}`;
          L.patches.push({ x: rx, y: 7, w: rw, d: H - 7, style: 'wood', color: i % 2 ? '#e6d6bd' : '#ead9c0' });
          L.rugs.push({ x: rx + 1, y: 15.4, w: rw - 2, d: 2.6, color: pastel[i], border: shade(pastel[i], -0.15) });
          const bx2 = rx + rw - 1.3; K.add({ type: 'bed', x: bx2, y: 8.4, color: PAL[(i * 2 + 1) % PAL.length] }); K.blockRect(Math.floor(bx2), 8, 2, 3);
          rest(T, L, bx2 + 0.5, 9.3, '+y', 'sofa', tag, [Math.floor(bx2) - 1, 9]);
          K.add({ type: 'ib_wardrobe', x: rx, y: 7.9, color: pastel[(i + 1) % 4] }); K.block(rx, 8);
          K.add({ type: 'desk', x: rx + 0.1, y: 13, w: 2, d: 1, face: '-y', seed: rx * 7 + n }); K.blockRect(rx, 13, 2, 1);
          K.add({ type: 'chair', x: rx + 1.1, y: 14.55, face: '-y', part: 'seat' }); K.add({ type: 'chair', x: rx + 1.1, y: 14.55, face: '-y', part: 'back' });
          beanbag(T, L, K, rx + rw - 1.5, 16.5, pastel[(i + 2) % 4], tag);
          lamp(L, K, rx, H - 1);
          T.sign(L, rx + 0.3, H - 0.3, `🛏️ ${n}0${i + 1}호`, '#3f8a45');
        });
      }
      // ---- 홈시네마 · 게임룸
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 홈시네마`, 'carpet', '#4a4458');
        L.desc = '홈시네마 (대형 스크린·리클라이너 10석·팝콘) · 게임룸 (콘솔·오락기)';
        T.shell(L, K, { name: '🎮 게임룸', color: '#a67be0' });
        K.add({ type: 'gameTV', x: 1, y: 0.3, w: 3 }); K.blockRect(1, 0, 3, 1);
        beanbag(T, L, K, 2, 2.6, '#f2a7c3', '🎮 게임룸'); beanbag(T, L, K, 3.6, 2.6, '#7ab8f5', '🎮 게임룸');
        K.add({ type: 'arcade', x: 6.2, y: 0.3 }); K.add({ type: 'arcade', x: 7.3, y: 0.3, hue: 30 }); K.blockRect(6, 0, 2, 1);
        rest(T, L, 6.65, 1.6, '-y', 'stand', '🕹️ 오락기');
        L.windows = [];
        K.add({ type: 'ib_cinemaX', y0: H - 1.5, len: 9 });
        for (const x of [5.5, 9]) for (const y of [10.5, 12, 13.5, 15, 16.5]) { K.add({ type: 'ib_recliner', x, y, color: x < 7 ? '#a8323e' : '#5a4a72' }); rest(T, L, x, y, '-x', 'sofa', '🎬 홈시네마'); }
        K.add({ type: 'ib_projector', x: 14.5, y: 13.5 }); K.block(14, 13);
        K.add({ type: 'ib_popcorn', x: 20.5, y: 9.5 }); K.block(20, 9);
        K.add({ type: 'vending', x: 22.2, y: 8.25, color: '#a67be0' }); K.block(22, 8);
        T.npc(L, '영화 동호회장', { x: 18, y: 12, face: '-x' }, { hat: 'beanie', accent: '#a67be0', say: '불 끕니다~', patrol: [{ x: 18, y: 12, face: '-x' }, { x: 20, y: 10.5, face: '-y' }] });
        T.sign(L, 4.4, H - 0.4, '🎬 홈시네마', '#a67be0');
      }
      // ---- R 옥상 텃밭 · 바비큐
      {
        const { L, K } = roofLevel(T, 'R 옥상 텃밭·바비큐', 'deck', '#c4a27c', '옥상 텃밭 · 허수아비 · 바비큐 그릴 · 피크닉 테이블 · 해먹');
        for (const [x, y] of [[1, 1], [1, 4], [6, 1], [6, 4]]) { K.add({ type: 'veggies', x, y, w: 4, d: 2, seed: x * 3 + y }); K.blockRect(x, y, 4, 2); }
        K.add({ type: 'ib_scarecrow', x: 5.5, y: 3.5 }); K.block(5, 3);
        K.add({ type: 'bbq', x: 14, y: 12 }); K.blockRect(14, 12, 2, 1);
        T.npc(L, '바비큐 장인', { x: 14.5, y: 11.3, face: '+y' }, { hat: 'bucket', accent: '#e5534b', carry: 'tray', say: '고기 다 익었어요!' });
        for (const [x, y] of [[3, 10], [3, 15]]) {
          K.add({ type: 'picnicTable', x, y }); K.blockRect(x, y, 3, 2);
          for (let q = 0; q < 3; q++) { rest(T, L, x + 0.6 + q * 0.9, y - 0.25, '+y', 'sit', '🍖 옥상 피크닉'); rest(T, L, x + 0.6 + q * 0.9, y + 2.25, '-y', 'sit', '🍖 옥상 피크닉'); }
        }
        K.add({ type: 'hammock', x: 19, y: 9.5 }); K.block(19, 9); K.block(21, 9);
        rest(T, L, 20.3, 9.5, '+y', 'sofa', '🌿 옥상 해먹', [20, 10]);
        K.add({ type: 'stringLights', pts: [[0.5, 7.5], [W - 0.5, 7.5], [W - 0.5, H - 0.5]] }); for (const [x, y] of [[0, 7], [W - 1, 7], [W - 1, H - 1]]) K.block(x, y);
        for (const [x, y, c] of [[11.5, 16.5, '#f07a8a'], [23.5, 13.5, '#f6c445']]) { K.add({ type: 'flowerBush', x, y, size: 1, seed: x, color: c }); K.block(Math.floor(x), Math.floor(y)); }
        T.npc(L, '텃밭 입주민', { x: 5.5, y: 6.5, face: '-y' }, { hat: 'bucket', accent: '#3f8a45', patrol: [{ x: 5.5, y: 6.5, face: '-y' }, { x: 10.5, y: 3.5, face: '-x' }] });
        T.sign(L, 0.4, 3.6, '🥬 옥상 텃밭', '#3f8a45'); T.sign(L, 12.4, 13.6, '🍖 바비큐', '#e5534b');
      }
      const B = T.done();
      F.n = B.levels.length - B.base - 1;
      return B;
    },
  });

  // ================================================================ 9. 📦 컨테이너 오피스
  C.indoor({
    id: 'container', icon: '📦', name: '컨테이너 오피스', desc: '컨테이너를 쌓은 작은 건물 · 1F 팝업 스토어 · 메이커스페이스 · 창업 라운지 · 옥상 루프탑 펍',
    build(S, o) {
      const W = 22, H = 16, DX = 11;
      const F = { wall: '#d9534f', texture: 'stripes', win: 'small', winColor: 'rgba(220,235,245,0.82)', frame: '#2b2b2b', trim: '#3a3a3a', sign: '📦 AI 컨테이너 오피스', signBg: '#2b2b2b', signFg: '#f2c230', lobby: 'rgba(255,240,210,0.85)', n: 1 };
      F.paint = (g, q) => {
        const cols = ['#d9534f', '#2f7fbf', '#f2b13a', '#3a9a5b', '#7b5ea7', '#e07a3a'];
        storeys(q, (k, top) => {
          if (k === 0 && q.south) { g.fillStyle = '#f2c230'; for (let x = 0; x < q.Wpx; x += 12) g.fillRect(x, q.Hb - 4, 6, 4); return; }
          const c = cols[(k + (q.south ? 0 : 3)) % cols.length], wh = 18, ww = 16, wy = top + (q.FP - wh) / 2 - 2;
          g.save(); g.beginPath(); g.rect(0, top, q.Wpx, q.FP); for (let i = 0; i < q.len; i += 2) g.rect(i * 32 + 6, wy - 2, ww + 4, wh + 4); g.clip('evenodd');
          g.fillStyle = c; g.fillRect(0, top, q.Wpx, q.FP);
          g.fillStyle = 'rgba(0,0,0,0.16)'; for (let x = 0; x < q.Wpx; x += 6) g.fillRect(x, top, 2.2, q.FP);
          g.fillStyle = 'rgba(255,255,255,0.13)'; for (let x = 3; x < q.Wpx; x += 6) g.fillRect(x, top, 1, q.FP);
          g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = `bold 7px ${FONT}`; g.fillText(`AIBX ${String(2026 + k * 7).slice(-4)} · 40FT`, 40, top + q.FP - 8);
          g.restore();
          g.fillStyle = 'rgba(30,30,30,0.55)'; for (const u of [q.Wpx - 24, q.Wpx - 13]) g.fillRect(u, top + 4, 2.2, q.FP - 8);
          g.fillStyle = '#f2c230'; for (const u of [q.Wpx - 25, q.Wpx - 14]) { g.fillRect(u, top + q.FP * 0.35, 4, 3); g.fillRect(u, top + q.FP * 0.65, 4, 3); }
          g.fillStyle = '#2b2b2b'; for (const [u, v] of [[0, top], [q.Wpx - 6, top], [0, top + q.FP - 7], [q.Wpx - 6, top + q.FP - 7]]) g.fillRect(u, v, 6, 6);
          g.fillStyle = '#1d1d1d'; g.fillRect(0, top + q.FP - 2, q.Wpx, 2);
        });
      };
      const T = C.tower(S, { W, H, id: 'container', name: '📦 AI 컨테이너 오피스', facade: F });
      // ---- 1F 팝업 스토어
      {
        const { L, K } = lobby(T, '1F 팝업 스토어', 'concrete', '#c9c6bf', '팝업 스토어 (옷걸이·한정판 진열대·계산대) · 네온 사인 · 방문객 대기석', { turnstiles: false, secColor: '#f2c230' });
        K.add({ type: 'ib_popRack', x: 1, y: 9, w: 3 }); K.blockRect(1, 9, 3, 1);
        K.add({ type: 'ib_popRack', x: 1, y: 12, w: 3 }); K.blockRect(1, 12, 3, 1);
        K.add({ type: 'ib_popTable', x: 5, y: 10, w: 2, d: 1 }); K.blockRect(5, 10, 2, 1);
        K.add({ type: 'till', x: 15, y: 8.4, w: 3, label: 'POP-UP' }); K.blockRect(15, 8, 3, 1);
        T.npc(L, '팝업 매니저', { x: 16.5, y: 7.7, face: '+y' }, { hat: 'beanie', accent: '#ff5fd2' });
        T.visitorSofa(L, K, 15, 12);
        L.windows = [9.6];
        K.add({ type: 'ib_neon', axis: 'x', x: 0, y: 15.2, z: 84, text: 'POP-UP STORE', color: '#ff5fd2', size: 12, west: true });
        K.add({ type: 'ib_crate', x: 19.5, y: 8.5, n: 2 }); K.block(19, 8); K.add({ type: 'ib_crate', x: 20.5, y: 8.5, n: 1 }); K.block(20, 8);
        for (const x of [2.5, 4.5]) { K.add({ type: 'stool', x, y: 14.5, color: '#f2c230' }); rest(T, L, x, 14.5, '+y', 'sit', '📦 팝업 대기석'); }
        T.npc(L, '스태프', { x: 7, y: 13, face: '-x' }, { hat: 'cap', accent: '#f2c230', carry: 'box', patrol: [{ x: 7, y: 13, face: '-x' }, { x: 4.5, y: 11, face: '-y' }, { x: 13, y: 9, face: '+x' }] });
        T.sign(L, 0.4, H - 0.4, '🛍️ 팝업 스토어', '#ff5fd2');
      }
      // ---- 업무층
      T.workFloors(o, {
        name: (n) => `${n}F 컨테이너 오피스`, looks: [['concrete', '#cfccc4'], ['ib_steel', '#bfc5ca']],
        deco(L, K) { const fy = H - 2; K.add({ type: 'ib_crate', x: 10.5, y: fy + 0.5, n: 2 }); K.block(10, fy); K.add({ type: 'ib_crate', x: 11.5, y: fy + 0.5, n: 1 }); K.block(11, fy); },
      });
      // ---- 메이커스페이스
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 메이커스페이스`, 'ib_steel', '#b9bec3');
        L.desc = '3D 프린터 3대 · 레이저 커터 · 공작 테이블 · 로봇팔 · 공구 벽 · 공구실';
        T.shell(L, K, { name: '🪚 공구실', color: '#e9a23b' });
        K.add({ type: 'ib_toolWall', axis: 'y', x: 0.4, w: 5 });
        K.add({ type: 'ib_workbench', x: 0.4, y: 0.3, w: 4 }); K.blockRect(0, 0, 5, 1);
        T.npc(L, '공구실 관리자', { x: 3, y: 2.2, face: '-y' }, { anim: 'type', hat: 'hardhat', accent: '#e9a23b' });
        for (const x of [1, 2.2, 3.4]) { K.add({ type: 'ib_printer3d', x, y: 8 }); K.block(Math.floor(x), 8); }
        rest(T, L, 1.5, 9.6, '-y', 'stand', '🖨️ 3D 프린팅'); rest(T, L, 3, 9.6, '-y', 'stand', '🖨️ 3D 프린팅');
        K.add({ type: 'ib_workbench', x: 6, y: 9, w: 4 }); K.blockRect(6, 9, 4, 1);
        for (let i = 0; i < 4; i++) { K.add({ type: 'stool', x: 6.5 + i, y: 10.6, color: '#e9a23b' }); rest(T, L, 6.5 + i, 10.6, '-y', 'sit', '🔧 공작 테이블'); }
        K.add({ type: 'ib_laserCutter', x: 13, y: 8 }); K.blockRect(13, 8, 2, 1);
        rest(T, L, 13.5, 9.6, '-y', 'stand', '⚡ 레이저 커팅');
        K.add({ type: 'robotArm', x: 18.5, y: 12.5 }); K.blockRect(17, 11, 3, 3);
        K.add({ type: 'partsBin', x: 1.2, y: 13.2, seed: 3 }); K.add({ type: 'partsBin', x: 1.8, y: 13.2, seed: 5 }); K.block(1, 13);
        L.windows = [];
        K.add({ type: 'ib_toolWall', axis: 'x', y0: 14.6, w: 4 });
        T.npc(L, '메이커', { x: 10, y: 12.5, face: '-y' }, { hat: 'beanie', accent: '#e9a23b', carry: 'box', patrol: [{ x: 10, y: 12.5, face: '-y' }, { x: 4, y: 12.5, face: '-y' }, { x: 15, y: 14, face: '+x' }] });
        T.sign(L, 0.4, H - 0.4, '🛠️ 메이커스페이스', '#e9a23b');
      }
      // ---- 창업 라운지
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 창업 라운지`, 'wood', '#c9a57a');
        L.desc = '해먹 · 탁구대 · 빈백 · 폰부스 · 자판기';
        T.shell(L, K, { name: '📞 폰부스', color: '#7b5ea7' });
        for (const [x, c] of [[0.4, '#7b5ea7'], [1.9, '#2f7fbf'], [3.4, '#3a9a5b']]) K.add({ type: 'phoneBooth', x, y: 0.6, color: c }); K.blockRect(0, 0, 5, 2);
        for (const y of [9.5, 13]) { K.add({ type: 'hammock', x: 2, y }); K.block(2, Math.floor(y)); K.block(4, Math.floor(y)); rest(T, L, 3.3, y, '+y', 'sofa', '🌴 해먹 쉼터', [3, Math.floor(y) + 1]); }
        K.add({ type: 'pingPong', x: 12.5, y: 9 }); K.blockRect(12, 9, 4, 2);
        rest(T, L, 11.5, 9.7, '+x', 'stand', '🏓 탁구'); rest(T, L, 16.4, 9.7, '-x', 'stand', '🏓 탁구');
        for (const [x, y, c] of [[7, 12.5, '#f2a7c3'], [8.5, 13.5, '#7ab8f5'], [7, 14.5, '#f6c445']]) beanbag(T, L, K, x, y, c, '🛋️ 빈백 라운지');
        K.add({ type: 'vending', x: 19.2, y: 8.25, color: '#7b5ea7' }); K.block(19, 8);
        K.add({ type: 'ib_crate', x: 20.5, y: 14.5, n: 3 }); K.block(20, 14);
        T.npc(L, '스타트업 대표', { x: 10, y: 13, face: '+y' }, { anim: 'point', hat: 'shades', accent: '#7b5ea7', say: '투자 유치!', patrol: [{ x: 10, y: 13, face: '+y' }, { x: 17, y: 13, face: '-x' }] });
        T.sign(L, 0.4, H - 0.4, '🚀 창업 라운지', '#7b5ea7');
      }
      // ---- R 루프탑 펍
      {
        const { L, K } = roofLevel(T, 'R 루프탑 펍', 'deck', '#b98c5e', '컨테이너 바 · 케이블 릴 테이블 · 화로 · 전구 줄조명');
        K.add({ type: 'ib_pubBar', x: 14, y: 4, w: 6, color: '#2f7fbf' }); K.blockRect(14, 4, 6, 2);
        T.npc(L, '바텐더', { x: 17, y: 4.7, face: '+y' }, { anim: 'type', hat: 'beanie', accent: '#2f7fbf' });
        stools(T, L, K, 14.8, 4, 1.3, 6.75, '🍺 루프탑 펍');
        for (const [x, y] of [[3, 9], [7, 9], [3, 13], [7, 13]]) table(T, L, K, x, y, '🍻 케이블 릴 테이블', { type: 'ib_spool', stool: '#d9b07a' });
        K.add({ type: 'firePit', x: 14.5, y: 12.5 }); K.block(14, 12);
        for (const [x, y, face] of [[13.3, 12.5, '+x'], [15.7, 12.5, '-x'], [14.5, 13.7, '-y']]) { K.add({ type: 'stool', x, y, color: '#8a6247' }); rest(T, L, x, y, face, 'sit', '🔥 화로 곁'); }
        K.add({ type: 'stringLights', pts: [[0.5, 7.5], [W - 0.5, 7.5], [W - 0.5, H - 0.5]] }); for (const [x, y] of [[0, 7], [W - 1, 7], [W - 1, H - 1]]) K.block(x, y);
        K.add({ type: 'ib_crate', x: 20.5, y: 3.5, n: 2 }); K.block(20, 3);
        for (const [x, y, c] of [[10.5, 15.5, '#f07a8a'], [19.5, 10.5, '#f6c445']]) { K.add({ type: 'flowerBush', x, y, size: 1, seed: x, color: c }); K.block(Math.floor(x), Math.floor(y)); }
        T.sign(L, 0.4, 8.0, '🍻 루프탑 펍', '#2f7fbf');
      }
      const B = T.done();
      F.n = B.levels.length - B.base - 1;
      return B;
    },
  });

  // ================================================================ 10. 🎵 뮤직 레이블
  C.indoor({
    id: 'musiclabel', icon: '🎵', name: '뮤직 레이블', desc: 'B1 라이브홀 · LP 카페 · 녹음 스튜디오 · 연습실 · 옥상 버스킹 무대',
    build(S, o) {
      const W = 30, H = 20, DX = 15;
      const F = { wall: '#1d1b22', texture: 'panel', win: 'small', winColor: 'rgba(170,120,255,0.55)', frame: '#3a3545', trim: '#ff5fd2', sign: '🎵 AI 뮤직 레이블', signBg: '#111111', signFg: '#ff5fd2', lobby: 'rgba(255,95,210,0.3)', n: 1 };
      F.paint = (g, q) => {
        const pulse = 0.6 + 0.4 * Math.sin(q.t * 3);
        storeys(q, (k, top) => { g.save(); g.shadowColor = '#5ff6ff'; g.shadowBlur = q.night ? 8 : 3; g.fillStyle = `rgba(95,246,255,${0.45 + 0.35 * pulse})`; g.fillRect(0, top + q.FP - 5, q.Wpx, 2); g.restore(); });
        const avail = q.Hb - (q.k0 === 0 ? q.FP : 0) - 12;
        if (q.south && avail > 70) {
          const letters = [...'AIRECORDS'], step = Math.min(14, (avail - 8) / letters.length), x0 = q.Wpx - 40;
          g.fillStyle = '#121016'; roundRect(g, x0, 6, 26, step * letters.length + 8, 4); g.fill(); g.strokeStyle = '#3a3545'; g.lineWidth = 1; g.stroke();
          g.save(); g.shadowColor = '#ff5fd2'; g.shadowBlur = q.night ? 12 : 5; g.fillStyle = '#ffd6f4'; g.font = `bold ${Math.round(step * 0.85)}px ${FONT}`; g.textAlign = 'center';
          letters.forEach((ch, i) => g.fillText(ch, x0 + 13, 6 + step * (i + 1)));
          g.restore(); g.textAlign = 'left';
        }
        if (!q.south && q.k1 === F.n && F.n >= 2) {
          const cx = q.Wpx * 0.35, cy = q.FP, R = Math.min(q.FP * 0.85, 46);
          g.fillStyle = '#121016'; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 1; for (let r = R * 0.4; r < R; r += 4) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); }
          g.fillStyle = '#ff5fd2'; g.beginPath(); g.arc(cx, cy, R * 0.3, 0, 7); g.fill(); g.fillStyle = '#121016'; g.beginPath(); g.arc(cx, cy, 2.5, 0, 7); g.fill();
          const a = q.t * 2; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R * 0.7, a, a + 0.6); g.stroke();
          g.save(); g.shadowColor = '#5ff6ff'; g.shadowBlur = q.night ? 14 : 6; g.strokeStyle = '#5ff6ff'; g.lineWidth = 3;
          const nx = q.Wpx * 0.72, ny = cy + R * 0.4; g.beginPath(); g.ellipse(nx, ny, 7, 5, -0.4, 0, 7); g.stroke(); g.beginPath(); g.moveTo(nx + 6, ny - 2); g.lineTo(nx + 6, ny - R * 1.1); g.quadraticCurveTo(nx + 18, ny - R * 0.9, nx + 20, ny - R * 0.6); g.stroke(); g.restore();
        }
      };
      const T = C.tower(S, { W, H, id: 'musiclabel', name: '🎵 AI 뮤직 레이블', facade: F });
      // ---- B1 라이브홀 (지하는 먼저)
      {
        const { L, K } = T.level('B1 라이브홀', 'wood', '#3a2f2a', 'office', { basement: true });
        L.desc = '라이브 무대 · LED 월 · 스탠딩석 · 바 · 테이블석 · 음향 콘솔 · 밴드 대기실';
        T.shell(L, K, { name: '🎸 밴드 대기실', color: '#ff5fd2' });
        L.windows = [];
        L.patches.push({ x: 0, y: 0, w: T.CX, d: 5, style: 'carpet', color: '#4a3b4a' });
        sofa(T, L, K, 2, 2, '🎸 밴드 대기실');
        K.add({ type: 'ib_guitarStand', x: 9.5, y: 0.6, color: '#e5534b' }); K.block(9, 0); K.add({ type: 'ib_amp', x: 11, y: 0.6 }); K.block(11, 0);
        T.npc(L, '밴드 매니저', { x: 12.5, y: 2.5, face: '-x' }, { hat: 'headphones', accent: '#ff5fd2', carry: 'paper' });
        K.add({ type: 'ib_ledWallX', y0: H - 1, len: 10 });
        K.add({ type: 'ib_liveStageY', x: 0.3, y: 9, w: 4.4, d: 10 }); K.blockRect(0, 9, 5, 10);
        T.npc(L, '보컬', { x: 3.8, y: 14, face: '+x' }, { anim: 'cheer', hat: 'shades', accent: '#ff5fd2' });
        T.npc(L, '기타리스트', { x: 2.6, y: 11.6, face: '+x' }, { anim: 'type', hat: 'beanie', accent: '#5ff6ff' });
        T.npc(L, '베이시스트', { x: 2.6, y: 16.4, face: '+x' }, { anim: 'type', hat: 'cap', accent: '#f2c230' });
        K.add({ type: 'ib_speaker', x: 5.5, y: 8.5, face: 'x' }); K.block(5, 8); K.add({ type: 'ib_speaker', x: 5.5, y: 19.4, face: 'x' }); K.block(5, 19);
        for (const x of [7.5, 9.5, 11.5]) for (const y of [11.5, 13.5, 15.5, 17.5]) rest(T, L, x, y, '-x', 'stand', '🤘 스탠딩석');
        K.add({ type: 'beerTap', x: 21, y: 8, w: 4 }); K.blockRect(21, 8, 4, 1);
        T.npc(L, '바텐더', { x: 23, y: 7.5, face: '+y' }, { anim: 'type', hat: 'shades', accent: '#2b2622' });
        stools(T, L, K, 21.6, 3, 1.3, 9.75, '🍸 라이브홀 바');
        K.add({ type: 'ib_mixDesk', x: 15, y: 14, w: 2, d: 1 }); K.blockRect(15, 14, 2, 1);
        T.npc(L, '음향 감독', { x: 16, y: 15.5, face: '-y' }, { anim: 'type', hat: 'headphones', accent: '#5ff6ff' });
        for (const [tx, ty] of [[21, 13], [25, 13], [21, 16], [25, 16]]) table(T, L, K, tx, ty, '🍸 라이브홀 테이블', { color: '#2b2622', stool: '#ff5fd2' });
        T.sign(L, 6.4, 9.6, '🎤 B1 라이브홀', '#ff5fd2'); T.sign(L, 20.4, 11.6, '🍸 바', '#5ff6ff');
      }
      // ---- 1F 로비 · LP 카페
      {
        const { L, K } = lobby(T, '1F 로비·LP 카페', 'wood', '#5a4638', 'LP 카페 (레코드 진열대·턴테이블 DJ·주크박스) · 골드 레코드 벽 · 안내 데스크', { secColor: '#ff5fd2' });
        L.patches.push({ x: 0, y: 7, w: 12, d: H - 7, style: 'wood', color: '#6b5242' });
        K.add({ type: 'ib_lpShelf', x: 1, y: 8, w: 5, seed: 3 }); K.blockRect(1, 8, 5, 1);
        K.add({ type: 'ib_turntable', x: 7, y: 8, w: 2 }); K.blockRect(7, 8, 2, 1);
        T.npc(L, 'DJ', { x: 8, y: 7.4, face: '+y' }, { anim: 'type', hat: 'headphones', accent: '#ff5fd2' });
        for (const [tx, ty] of [[2, 12], [6, 12], [2, 15], [6, 15]]) table(T, L, K, tx, ty, '🎶 LP 카페', { color: '#2b2622', stool: '#ff5fd2' });
        K.add({ type: 'ib_jukebox', x: 10.5, y: 11.5 }); K.block(10, 11);
        K.add({ type: 'reception', x: 19.6, y: 9.6, w: 5 }); K.blockRect(19, 9, 6, 1);
        T.npc(L, '안내원', { x: 22, y: 8.9, face: '+y' }, { hat: 'headphones', accent: '#5ff6ff' });
        T.visitorSofa(L, K, 20, 13);
        K.add({ type: 'ib_recordWall', x: 1, y: 5, w: 8, z: 42 });
        L.windows = [11];
        K.add({ type: 'ib_neon', axis: 'x', x: 0, y: 18.2, z: 86, text: '♪ AI RECORDS', color: '#ff5fd2', size: 13, west: true, always: true });
        K.add({ type: 'ib_guitarStand', x: 12.5, y: 8.5, color: '#f2c230' }); K.block(12, 8);
        T.npc(L, '보안요원', { x: DX + 0.5, y: H - 5, face: '+y' }, { hat: 'police', patrol: [{ x: DX + 0.5, y: H - 5, face: '+y' }, { x: 11, y: 6, face: '+x' }, { x: 26, y: 6, face: '-x' }] });
        T.sign(L, 0.4, H - 0.4, '🎶 LP 카페', '#ff5fd2');
      }
      // ---- 업무층
      T.workFloors(o, {
        name: (n) => `${n}F 기획·A&R`, looks: [['wood', '#d7c3a6'], ['carpet', '#d4cfe0']],
        deco(L, K) { const fy = H - 2; K.add({ type: 'ib_guitarStand', x: 11.5, y: fy + 0.5, color: '#e5534b' }); K.block(11, fy); K.add({ type: 'ib_speaker', x: 13.5, y: fy + 0.5, s: 0.7 }); K.block(13, fy); K.add({ type: 'ib_amp', x: 16, y: fy + 0.5 }); K.block(16, fy); },
      });
      // ---- 녹음 스튜디오
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 녹음 스튜디오`, 'carpet', '#5a4e63');
        L.desc = '컨트롤룸 (믹싱 콘솔·프로듀서 소파) · 라이브룸 (보컬 부스·드럼·앰프·피아노) · 마스터링룸';
        T.shell(L, K, { name: '🎧 마스터링룸', color: '#1f9fb4', glass: true });
        K.add({ type: 'ib_mixDesk', x: 2, y: 2, w: 4, d: 1 }); K.blockRect(2, 2, 4, 1);
        K.add({ type: 'chair', x: 4, y: 3.55, face: '-y', part: 'seat', premium: true }); K.add({ type: 'chair', x: 4, y: 3.55, face: '-y', part: 'back', premium: true });
        T.npc(L, '마스터링 엔지니어', { x: 4, y: 3.55, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'headphones', accent: '#1f9fb4' });
        K.wallY(7, H, 15, { glass: true, h: 60, doors: [17], color: '#c9d2dc' });
        L.windows = [];
        K.add({ type: 'ib_foamX', y0: H - 0.5, len: 12 });
        K.add({ type: 'ib_mixDesk', x: 3, y: 11, w: 6, d: 1.2 }); K.blockRect(3, 11, 6, 2);
        for (const x of [4.5, 7.5]) { K.add({ type: 'chair', x, y: 13.6, face: '-y', part: 'seat', premium: true }); K.add({ type: 'chair', x, y: 13.6, face: '-y', part: 'back', premium: true }); rest(T, L, x, 13.6, '-y', 'sit', '🎚️ 믹싱 콘솔'); }
        K.add({ type: 'chair', x: 6, y: 13.6, face: '-y', part: 'seat', premium: true }); K.add({ type: 'chair', x: 6, y: 13.6, face: '-y', part: 'back', premium: true });
        T.npc(L, '사운드 엔지니어', { x: 6, y: 13.6, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'headphones', accent: '#5ff6ff' });
        sofa(T, L, K, 2, 16, '🛋️ 프로듀서 소파');
        for (const x of [0.5, 12.5]) { K.add({ type: 'ib_speaker', x, y: 8.5, s: 0.9 }); K.block(Math.floor(x), 8); }
        K.add({ type: 'ib_vocalBooth', x: 24, y: 8, w: 4, d: 3 }); K.add({ type: 'ib_boothGlass', x: 24, y: 8, w: 4, d: 3 }); K.blockRect(24, 8, 4, 3);
        T.npc(L, '보컬', { x: 26, y: 9.9, face: '+y' }, { anim: 'cheer', hat: 'headphones', accent: '#ff5fd2' });
        for (const x of [18.5, 20.5]) { K.add({ type: 'ib_mic', x, y: 10.5 }); K.block(Math.floor(x), 10); rest(T, L, x, 11.5, '-y', 'stand', '🎤 보컬 녹음'); }
        K.add({ type: 'ib_drums', x: 17, y: 14 }); K.blockRect(17, 14, 2, 2);
        K.add({ type: 'ib_amp', x: 21, y: 15.5 }); K.block(21, 15);
        K.add({ type: 'piano', x: 25, y: 14 }); K.blockRect(25, 14, 2, 1);
        K.add({ type: 'stool', x: 25.8, y: 15.3, color: '#2b2622' }); rest(T, L, 25.8, 15.3, '-y', 'sit', '🎹 건반 녹음');
        T.npc(L, '프로듀서', { x: 13, y: 9.5, face: '+x' }, { anim: 'think', hat: 'shades', accent: '#ff5fd2', say: '한 번 더 갈게요!', patrol: [{ x: 13, y: 9.5, face: '+x' }, { x: 6, y: 15, face: '-y' }, { x: 20, y: 18, face: '-y' }] });
        T.sign(L, 0.4, H - 0.4, '🎚️ 컨트롤룸', '#1f9fb4'); T.sign(L, 15.4, H - 0.4, '🎤 라이브룸', '#ff5fd2');
      }
      // ---- 연습실
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 연습실`, 'carpet', '#3d4f6b');
        L.desc = '드럼 연습실 · 기타 합주실 · 건반실 · 보컬·댄스실 · 피아노 레슨실';
        T.shell(L, K, { name: '🎹 레슨실', color: '#e9a23b' });
        K.add({ type: 'piano', x: 2, y: 0.3 }); K.blockRect(2, 0, 2, 1);
        K.add({ type: 'stool', x: 2.8, y: 1.5, color: '#2b2622' }); rest(T, L, 2.8, 1.5, '-y', 'sit', '🎹 피아노 레슨');
        T.npc(L, '피아노 선생님', { x: 4.5, y: 2, face: '-x' }, { anim: 'point', hat: 'beret', accent: '#e9a23b' });
        K.wallX(0, W, 7, { h: 46, doors: [3, 10, 17, 25], color: '#5a4e63' });
        for (const x of [7, 14, 21]) K.wallY(7, H, x, { h: 46, color: '#5a4e63' });
        [[0, 7, '#4a3b5a'], [7, 14, '#3b4a5a'], [14, 21, '#4a4a3b'], [21, 30, '#5a3b4a']].forEach(([rx, rx1, c]) => L.patches.push({ x: rx, y: 7, w: rx1 - rx, d: H - 7, style: 'carpet', color: c }));
        K.add({ type: 'ib_drums', x: 2, y: 10 }); K.blockRect(2, 10, 2, 2);
        K.add({ type: 'stool', x: 3, y: 9.5, color: '#2b2622' }); rest(T, L, 3, 9.5, '+y', 'sit', '🥁 드럼 연습');
        K.add({ type: 'ib_speaker', x: 5.5, y: 16.5, s: 0.8, face: 'y' }); K.block(5, 16);
        beanbag(T, L, K, 2, 16, '#ff5fd2', '🥁 드럼 연습');
        for (const x of [8.5, 12.5]) { K.add({ type: 'ib_amp', x, y: 9.5, color: x < 10 ? '#e5534b' : '#4e7cf6' }); K.block(Math.floor(x), 9); }
        rest(T, L, 9, 11, '-y', 'stand', '🎸 기타 합주'); rest(T, L, 11.5, 11, '-y', 'stand', '🎸 기타 합주');
        T.npc(L, '기타 연습생', { x: 10, y: 15, face: '-y' }, { anim: 'cheer', hat: 'beanie', accent: '#e5534b' });
        for (const x of [15.5, 18.5]) { K.add({ type: 'piano', x, y: 8 }); K.blockRect(Math.floor(x), 8, 2, 1); K.add({ type: 'stool', x: x + 0.8, y: 9.3, color: '#2b2622' }); rest(T, L, x + 0.8, 9.3, '-y', 'sit', '🎹 건반 연습'); }
        for (const x of [23.5, 26.5]) { K.add({ type: 'ib_mic', x, y: 10.5 }); K.block(Math.floor(x), 10); rest(T, L, x, 11.5, '-y', 'stand', '🎤 보컬 연습'); }
        beanbag(T, L, K, 28, 16, '#5ff6ff', '🎤 보컬 연습'); beanbag(T, L, K, 25, 16.5, '#f6c445', '🎤 보컬 연습');
        T.npc(L, '연습생', { x: 24.5, y: 14, face: '-y' }, { anim: 'cheer', hat: 'bow', accent: '#ff5fd2' });
        T.sign(L, 0.3, H - 0.3, '🥁 드럼실', '#ff5fd2'); T.sign(L, 7.3, H - 0.3, '🎸 합주실', '#4e7cf6'); T.sign(L, 14.3, H - 0.3, '🎹 건반실', '#f2c230'); T.sign(L, 21.3, H - 0.3, '🎤 보컬·댄스실', '#5ff6ff');
      }
      // ---- R 버스킹 무대
      {
        const { L, K } = roofLevel(T, 'R 버스킹 무대', 'deck', '#a98a6a', '옥상 버스킹 무대 · 관람 벤치 · 파라솔 · 전구 줄조명');
        K.add({ type: 'ib_buskStage', x: 3, y: 8 }); K.blockRect(3, 8, 3, 3);
        T.npc(L, '버스커', { x: 4.5, y: 9.5, face: '+y' }, { anim: 'cheer', hat: 'beanie', accent: '#ff5fd2', say: '🎶 신청곡 받아요!' });
        K.add({ type: 'ib_speaker', x: 7.5, y: 8.5, s: 0.8, face: 'y' }); K.block(7, 8);
        bench(T, L, K, 2, 13, 4, '🎸 버스킹 관람', { face: '-y', color: '#8a6247' }); bench(T, L, K, 7, 13, 4, '🎸 버스킹 관람', { face: '-y', color: '#8a6247' });
        table(T, L, K, 13, 10, '🎶 옥상 파라솔', { parasol: true, color: '#ff5fd2', stool: '#f3d48c' }); table(T, L, K, 13, 15, '🎶 옥상 파라솔', { parasol: true, color: '#5ff6ff', stool: '#f3d48c' });
        K.add({ type: 'stringLights', pts: [[0.5, 6.5], [W - 0.5, 6.5], [W - 0.5, H - 0.5]] }); for (const [x, y] of [[0, 6], [W - 1, 6], [W - 1, H - 1]]) K.block(x, y);
        for (const [x, y, c] of [[20.5, 9.5, '#f07a8a'], [24.5, 15.5, '#b38cf0'], [9.5, 17.5, '#f6c445']]) { K.add({ type: 'flowerBush', x, y, size: 1, seed: x, color: c }); K.block(Math.floor(x), Math.floor(y)); }
        for (const x of [22.5, 24.7, 26.9]) { K.add({ type: 'airCon', x, y: 0.4 }); K.block(Math.floor(x), 0); }
        T.sign(L, 0.4, 12.4, '🎸 버스킹 무대', '#ff5fd2');
      }
      const B = T.done();
      F.n = B.levels.length - B.base - 1;
      return B;
    },
  });
})();
