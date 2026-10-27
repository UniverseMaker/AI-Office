// Office life pack: break-room fun (beer tap, arcade, game TV, foosball, massage chair, darts), nap pods,
// air-conditioners, entrance kit (turnstiles, umbrella stand, extinguisher, exit sign), brand wall,
// and the terrace animals (puppies, cats, ducks, a hen with her chicks).
(function () {
  const { P, shade, rgba, poly, box, sbox, cylinder, ellipseFloor, onPlaneY, onPlaneX, roundRect } = AIO.iso;
  const A = AIO.art;
  const FONT = A.FONT;

  function beerTap(ctx, f, t) {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.9, 26, '#6b4a35', '#5a3e2c', '#4d3526', 'rgba(0,0,0,0.15)');
    box(ctx, x - 0.05, y - 0.05, 26, w + 0.1, 1, 2.5, '#c49a62', '#a87a52', '#8a6247');
    box(ctx, x + 0.3, y + 0.1, 28.5, w - 0.6, 0.25, 6, '#c0c6cc', '#a9b0b6', '#9aa1a7');
    for (let i = 0; i < 3; i++) {
      const px = x + 0.6 + i * ((w - 1.2) / 2);
      sbox(ctx, px - 0.04, y + 0.2, 34.5, 0.08, 0.08, 10, '#d9dde1');
      const [hx, hy] = P(px, y + 0.24, 46); ctx.fillStyle = ['#f2c230', '#e5534b', '#3b332b'][i]; roundRect(ctx, hx - 2, hy - 6, 4, 8, 1.5); ctx.fill();
      const [gx, gy] = P(px, y + 0.6, 28.5); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(gx - 2.5, gy - 8, 5, 8); ctx.fillStyle = '#f2b632'; ctx.fillRect(gx - 2, gy - 6, 4, 5); ctx.fillStyle = '#fffbe8'; ctx.fillRect(gx - 2, gy - 7.5, 4, 1.6);
    }
    onPlaneY(ctx, x + 0.3, y + 0.9, 22, (g) => { g.fillStyle = '#f6d58a'; g.font = `bold 7px ${FONT}`; g.fillText('🍺 CRAFT BEER · 금요일 5시~', 4, 12); });
  }
  function arcade(ctx, x, y, t, hue = 280) {
    box(ctx, x, y, 0, 0.9, 0.8, 56, `hsl(${hue},45%,30%)`, `hsl(${hue},45%,24%)`, `hsl(${hue},45%,18%)`, 'rgba(0,0,0,0.25)');
    onPlaneY(ctx, x + 0.05, y + 0.8, 52, (g) => {
      g.fillStyle = '#111'; g.fillRect(3, 6, 22, 16);
      g.fillStyle = `hsl(${(t * 60 + hue) % 360},80%,60%)`; g.fillRect(5 + (t * 12 % 14), 12, 4, 4);
      g.fillStyle = '#f2c230'; g.fillRect(8, 18 - Math.abs(Math.sin(t * 3)) * 6, 3, 3);
      g.fillStyle = `hsl(${hue},70%,62%)`; g.font = `bold 4px ${FONT}`; g.fillText('AI FIGHTER', 3, 4);
      g.fillStyle = '#e5534b'; g.beginPath(); g.arc(9, 28, 1.6, 0, 7); g.fill(); g.fillStyle = '#4e7cf6'; g.beginPath(); g.arc(14, 28, 1.6, 0, 7); g.fill(); g.fillStyle = '#3b3f45'; g.fillRect(19, 26, 2, 4);
    });
  }
  function gameTV(ctx, f, t) {
    const { x, y, w } = f;
    box(ctx, x, y + 0.1, 0, w, 0.5, 12, '#3b3f45', '#2d3035', '#26292d');
    box(ctx, x + w / 2 - 0.4, y + 0.2, 12, 0.8, 0.3, 3, '#f4f6f8', '#e1e5e9', '#d2d7dc');
    onPlaneY(ctx, x + 0.1, y + 0.3, 48, (g) => {
      const Wl = (w - 0.2) * 32;
      g.fillStyle = '#16181b'; g.fillRect(0, 0, Wl, 30);
      const k = t * 40;
      g.fillStyle = '#7cc0f0'; g.fillRect(2, 2, Wl - 4, 18); g.fillStyle = '#6dbb5a'; g.fillRect(2, 20, Wl - 4, 8);
      g.fillStyle = '#e5534b'; g.fillRect(8 + (k % (Wl - 20)), 14, 5, 6); g.fillStyle = '#f2c230'; g.beginPath(); g.arc(Wl - 12 - ((k * 0.7) % (Wl - 24)), 10, 2.4, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = `4px ${FONT}`; g.fillText('P1 ★★★', 4, 6);
    });
  }
  function foosball(ctx, x, y, t) {
    for (const [lx, ly] of [[0.1, 0.1], [1.7, 0.1], [0.1, 0.8], [1.7, 0.8]]) sbox(ctx, x + lx, y + ly, 0, 0.08, 0.08, 18, '#4d3526');
    box(ctx, x, y, 18, 1.9, 1, 6, '#3f8a45', '#8a6247', '#7a5540', 'rgba(0,0,0,0.2)');
    for (let i = 0; i < 4; i++) { const [a, b] = P(x + 0.3 + i * 0.42, y - 0.2, 25), [c, d] = P(x + 0.3 + i * 0.42, y + 1.2, 25); ctx.strokeStyle = '#d9dde1'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); ctx.fillStyle = i % 2 ? '#e5534b' : '#4e7cf6'; const [m, n] = P(x + 0.3 + i * 0.42, y + 0.5 + Math.sin(t * 4 + i) * 0.2, 25); ctx.fillRect(m - 1.5, n - 2, 3, 4); }
    const [bx, by] = P(x + 0.95 + Math.sin(t * 2.3) * 0.6, y + 0.5 + Math.cos(t * 3.1) * 0.3, 24.5); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, 1.5, 0, 7); ctx.fill();
  }
  function massageChair(ctx, x, y, color = '#3b3f45') {
    box(ctx, x - 0.4, y - 0.1, 0, 0.8, 0.9, 12, shade(color, 0.1), color, shade(color, -0.15));
    box(ctx, x - 0.4, y - 0.15, 12, 0.8, 0.25, 26, shade(color, 0.1), color, shade(color, -0.15), 'rgba(0,0,0,0.2)');
    box(ctx, x - 0.5, y, 8, 0.12, 0.8, 10, shade(color, 0.2), shade(color, 0.05), shade(color, -0.1));
    box(ctx, x + 0.38, y, 8, 0.12, 0.8, 10, shade(color, 0.2), shade(color, 0.05), shade(color, -0.1));
  }
  function dartboard(ctx, f) {
    onPlaneY(ctx, f.x, f.y + 0.03, 72, (g) => { for (const [r, c] of [[12, '#2b2b2b'], [10, '#e5534b'], [7, '#f4f1ec'], [4, '#3fb27f'], [1.6, '#e5534b']]) { g.fillStyle = c; g.beginPath(); g.arc(14, 14, r, 0, 7); g.fill(); } g.fillStyle = '#f2c230'; g.fillRect(17, 9, 5, 1); });
  }
  /** 캡슐형 수면 포드: 받침 위 둥근 셸(뒤는 막힘, 앞은 열림) · 안쪽 매트리스·베개·이불 · 무드등 · 번호판 */
  function napPod(ctx, x, y, t, color = '#7a8fd6') {
    const w = 1.6, d = 2.4, z0 = 8, r = w / 2, hh = 30, cx = x + r, y0 = y, y1 = y + d;
    // 받침대 + 서랍
    box(ctx, x, y, 0, w, d, z0, '#d9dde1', '#c4c9cd', '#b5bbc0', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x + 0.1, y1, z0 - 1, (g) => { g.fillStyle = '#b5bbc0'; g.fillRect(4, 1, 40, 4); g.fillStyle = '#8d959c'; g.fillRect(22, 2.5, 6, 1.2); });
    const pt = (a, yy, zOff = 0) => P(cx - Math.cos(a) * r, yy, z0 + Math.sin(a) * hh + zOff);
    // 뒤 막힘판 (반원)
    { const pts = []; for (let k = 0; k <= 12; k++) pts.push(pt(k / 12 * Math.PI, y0)); poly(ctx, pts, '#e3e8ec'); }
    // 안쪽: 매트리스 · 베개 · 이불 · 무드등
    box(ctx, x + 0.12, y + 0.1, z0, w - 0.24, d - 0.2, 4, '#ffffff', '#eef1f4', '#e1e6ea');
    box(ctx, x + 0.25, y + 0.2, z0 + 4, w - 0.5, 0.5, 4, '#fffdf6', '#f0ebe0', '#e3ddd0');
    box(ctx, x + 0.16, y + 0.85, z0 + 4, w - 0.32, d - 1.05, 3, color, shade(color, -0.12), shade(color, -0.22));
    for (let k = 0; k < 3; k++) poly(ctx, [P(x + 0.16, y + 1.1 + k * 0.4, z0 + 7.05), P(x + w - 0.16, y + 1.1 + k * 0.4, z0 + 7.05), P(x + w - 0.16, y + 1.16 + k * 0.4, z0 + 7.05), P(x + 0.16, y + 1.16 + k * 0.4, z0 + 7.05)], 'rgba(255,255,255,0.35)');
    const glow = 0.55 + 0.25 * Math.sin(t * 1.3 + x);
    const [lx, ly] = P(cx, y0 + 0.15, z0 + hh - 6);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createRadialGradient(lx, ly, 1, lx, ly + 10, 34); gg.addColorStop(0, `rgba(255,214,140,${0.45 * glow})`); gg.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = gg; ctx.fillRect(lx - 34, ly - 20, 68, 60); ctx.restore();
    ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.ellipse(lx, ly, 4, 2, 0, 0, 7); ctx.fill();
    // 셸: 서쪽 → 꼭대기 → 동쪽 순서로 띠를 그린다 (보이는 쪽이 나중)
    const N = 14;
    for (let k = 0; k < N; k++) {
      const a0 = k / N * Math.PI, a1 = (k + 1) / N * Math.PI, mid = (a0 + a1) / 2;
      const light = 0.12 + 0.18 * Math.sin(mid) - 0.12 * Math.cos(mid);
      poly(ctx, [pt(a0, y0), pt(a1, y0), pt(a1, y1), pt(a0, y1)], shade('#eef2f5', Math.max(-0.25, Math.min(0.2, light - 0.05))));
    }
    // 앞 테두리(입구) · 포인트 띠 · 번호판
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath();
    for (let k = 0; k <= 16; k++) { const [px, py] = pt(k / 16 * Math.PI, y1); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
    const [nx, ny] = pt(Math.PI * 0.82, y1, 0);
    ctx.fillStyle = '#2b2622'; roundRect(ctx, nx - 2, ny - 4, 14, 8, 2); ctx.fill();
    ctx.fillStyle = '#ffe2a0'; ctx.font = `bold 5px ${FONT}`; ctx.fillText('Zz', nx + 1, ny + 2);
  }
  function airCon(ctx, x, y, t) {
    box(ctx, x, y, 0, 0.7, 0.6, 60, '#f4f6f8', '#e1e5e9', '#d2d7dc', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x + 0.05, y + 0.6, 56, (g) => { g.fillStyle = '#c4cbd2'; for (let i = 0; i < 6; i++) g.fillRect(3, 4 + i * 3, 16, 1.4); g.fillStyle = '#4ef08a'; g.font = `4px ${FONT}`; g.fillText('22°C', 5, 30); g.fillStyle = '#16181b'; g.fillRect(3, 24, 16, 8); g.fillStyle = '#5fd0ff'; g.fillText('22°C', 5, 30); });
    const [sx, sy] = P(x + 0.35, y + 0.8, 48);
    ctx.strokeStyle = 'rgba(150,210,245,0.5)'; ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) { const o = ((t * 20 + k * 8) % 24); ctx.beginPath(); ctx.moveTo(sx - 6 + k * 6, sy + o * 0.3); ctx.quadraticCurveTo(sx - 4 + k * 6, sy + 6 + o * 0.5, sx - 8 + k * 6, sy + 12 + o * 0.6); ctx.stroke(); }
  }
  function wallAC(ctx, f, t) {
    onPlaneY(ctx, f.x, f.y + 0.03, 100, (g) => {
      g.fillStyle = '#f4f6f8'; roundRect(g, 0, 0, 52, 14, 4); g.fill(); g.strokeStyle = '#c4cbd2'; g.stroke();
      g.fillStyle = '#c4cbd2'; g.fillRect(4, 10, 44, 1.5);
      g.fillStyle = '#5fd0ff'; g.fillRect(44, 3, 3, 2);
      g.strokeStyle = 'rgba(150,210,245,0.45)'; for (let k = 0; k < 3; k++) { const o = (t * 14 + k * 6) % 14; g.beginPath(); g.moveTo(10 + k * 14, 14 + o); g.lineTo(8 + k * 14, 18 + o); g.stroke(); }
    });
  }
  function exitSign(ctx, f) { onPlaneY(ctx, f.x, f.y + 0.03, 102, (g) => { g.fillStyle = '#2f9e5f'; roundRect(g, 0, 0, 30, 10, 2); g.fill(); g.fillStyle = '#fff'; g.font = `bold 6px ${FONT}`; g.fillText('🏃 비상구', 3, 7.5); }); }
  function extinguisher(ctx, x, y) { cylinder(ctx, x, y, 0, 0.13, 16, '#e5534b', '#c9443d'); cylinder(ctx, x, y, 16, 0.06, 3, '#2b2b2b', '#2b2b2b'); }
  function umbrellaStand(ctx, x, y) {
    cylinder(ctx, x, y, 0, 0.22, 14, '#5d6166', '#4f5459');
    for (const [dx, c] of [[-4, '#e5534b'], [0, '#4e7cf6'], [4, '#f2c230']]) { const [sx, sy] = P(x, y, 14); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + dx * 0.5, sy); ctx.lineTo(sx + dx, sy - 16); ctx.stroke(); ctx.beginPath(); ctx.arc(sx + dx + 2, sy - 16, 2, Math.PI, 0); ctx.stroke(); }
  }
  function turnstile(ctx, x, y, t, open) {
    box(ctx, x, y, 0, 0.3, 1, 26, '#d9dde1', '#c4c9cd', '#b5bbc0', 'rgba(0,0,0,0.15)');
    box(ctx, x, y + 0.1, 26, 0.3, 0.8, 1.5, '#16181b', '#111316', '#0d0f11');
    const [lx, ly] = P(x + 0.15, y + 0.2, 28); ctx.fillStyle = open ? '#4ef08a' : '#ff6b5b'; ctx.fillRect(lx - 2, ly - 1, 4, 2);
    box(ctx, x + 0.3, y + 0.45, 14, 0.7 * (1 - open * 0.8), 0.1, 10, 'rgba(210,235,245,0.6)', 'rgba(200,225,240,0.5)', 'rgba(190,215,232,0.5)', 'rgba(140,160,175,0.6)');
  }
  function fridge(ctx, x, y) {
    box(ctx, x, y, 0, 0.9, 0.8, 62, '#e9edf1', '#d2d8de', '#c4cbd2', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x, y + 0.8, 60, (g) => { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 20, 28, 1); g.fillStyle = '#9aa1a7'; g.fillRect(24, 6, 1.5, 10); g.fillRect(24, 26, 1.5, 14); g.fillStyle = '#f2c230'; g.fillRect(4, 30, 6, 6); g.fillStyle = '#e2667f'; g.fillRect(12, 34, 5, 5); });
  }
  /** big brand wall facing the open office */
  function brandWall(ctx, f) {
    onPlaneY(ctx, f.x, f.y + 0.03, 92, (g) => {
      const Wl = f.w * 32;
      g.fillStyle = '#2b2622'; roundRect(g, 0, 0, Wl, 30, 6); g.fill();
      g.fillStyle = '#d97757'; g.beginPath(); g.arc(16, 15, 9, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = `bold 9px ${FONT}`; g.fillText('🧶', 11, 19);
      g.fillStyle = '#f6d58a'; g.font = `bold 13px ${FONT}`; g.fillText(f.text || 'AI 인공지능 연구원', 30, 15);
      g.fillStyle = 'rgba(246,239,226,0.75)'; g.font = `6px ${FONT}`; g.fillText(f.sub || 'AI Research Institute', 30, 24);
    });
  }

  // ------------------------------------------------------------------ animals
  function pet(ctx, sx, sy, kind, dir, t, moving, color, seed = 0) {
    const f = dir === '-x' || dir === '+y' ? -1 : 1;   // facing left/right on screen
    const step = moving ? Math.sin(t * 16 + seed) : 0, bob = moving ? Math.abs(step) * 1.6 : Math.sin(t * 2 + seed) * 0.4;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(1.6, 1.6);
    ctx.fillStyle = 'rgba(60,40,20,0.15)'; ctx.beginPath(); ctx.ellipse(0, 0, kind === 'chick' ? 4 : 9, kind === 'chick' ? 1.6 : 3.2, 0, 0, 7); ctx.fill();
    ctx.translate(0, -bob);
    if (kind === 'dog') {
      const c = color || '#d9a066', dk = shade(c, -0.25);
      ctx.fillStyle = dk; for (const [lx, o] of [[-5, step], [-2, -step], [3, step], [6, -step]]) ctx.fillRect(lx * f - 1, -5 + Math.min(0, o) , 2.4, 5);
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -8, 9, 5, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-8 * f, -10); ctx.quadraticCurveTo(-12 * f, -16 - Math.abs(Math.sin(t * 12)) * 3, -11 * f + Math.sin(t * 14) * 2, -18); ctx.stroke();
      ctx.beginPath(); ctx.arc(8 * f, -14, 5.4, 0, 7); ctx.fill();
      ctx.fillStyle = dk; ctx.beginPath(); ctx.ellipse(5 * f, -17, 2.2, 4, f * 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(12.5 * f, -13.5, 1.3, 0, 7); ctx.fill(); ctx.fillRect(9 * f - 0.6, -16, 1.3, 1.3);
      if (moving) { ctx.fillStyle = '#e2667f'; ctx.fillRect(11 * f - 1, -11, 2.4, 2.4); }
    } else if (kind === 'cat') {
      const c = color || '#8a8f96', dk = shade(c, -0.25);
      const sit = !moving;
      ctx.fillStyle = c;
      if (sit) { ctx.beginPath(); ctx.ellipse(0, -7, 6, 7, 0, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = dk; for (const [lx, o] of [[-4, step], [-1, -step], [3, step], [5, -step]]) ctx.fillRect(lx * f - 1, -4 + Math.min(0, o), 2, 4); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -7, 8, 4.4, 0, 0, 7); ctx.fill(); }
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-6 * f, -6); ctx.quadraticCurveTo(-12 * f, -8, -10 * f + Math.sin(t * 2 + seed) * 2, -16); ctx.stroke();
      const hy = sit ? -15 : -12;
      ctx.beginPath(); ctx.arc(6 * f, hy, 4.6, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(3 * f, hy - 3); ctx.lineTo(4 * f, hy - 8); ctx.lineTo(6 * f, hy - 4); ctx.fill(); ctx.beginPath(); ctx.moveTo(7 * f, hy - 4); ctx.lineTo(9 * f, hy - 8); ctx.lineTo(10 * f, hy - 3); ctx.fill();
      ctx.fillStyle = '#f6d55a'; ctx.fillRect(5 * f - 0.6, hy - 1, 1.4, 1.4); ctx.fillRect(8.5 * f - 0.6, hy - 1, 1.4, 1.4);
      if (seed % 2) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(6 * f, hy + 2, 2.4, 1.4, 0, 0, 7); ctx.fill(); }
    } else if (kind === 'duck' || kind === 'hen') {
      const c = kind === 'hen' ? '#f4ead8' : (color || '#ffffff');
      ctx.strokeStyle = '#f08a3a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-1.5, 0); ctx.lineTo(-1.5 + step, -4); ctx.moveTo(1.5, 0); ctx.lineTo(1.5 - step, -4); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -7, 7, 4.6, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(5 * f, -12, 3.4, 0, 7); ctx.fill();
      if (kind === 'hen') { ctx.fillStyle = '#e5534b'; ctx.beginPath(); ctx.arc(5 * f, -15.6, 1.6, 0, 7); ctx.arc(6.5 * f, -15, 1.3, 0, 7); ctx.fill(); }
      else if (color === '#3f8a45' || seed % 3 === 0) { ctx.fillStyle = '#2f7d4f'; ctx.beginPath(); ctx.arc(5 * f, -12.5, 3, Math.PI, 0); ctx.fill(); }
      ctx.fillStyle = kind === 'hen' ? '#f2c230' : '#f08a3a'; ctx.beginPath(); ctx.moveTo(8 * f, -12.4); ctx.lineTo(11 * f, -11.6); ctx.lineTo(8 * f, -10.8); ctx.fill();
      ctx.fillStyle = '#222'; ctx.fillRect(6 * f - 0.5, -13.2, 1.1, 1.1);
      ctx.fillStyle = shade(c, -0.08); ctx.beginPath(); ctx.ellipse(-1.5 * f, -7.5, 4, 2.4, f * 0.2, 0, 7); ctx.fill();
    } else if (kind === 'chick') {
      ctx.fillStyle = '#f6d55a'; ctx.beginPath(); ctx.arc(0, -3.5, 3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(2 * f, -6.4, 2.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#f08a3a'; ctx.beginPath(); ctx.moveTo(3.8 * f, -6.6); ctx.lineTo(5.4 * f, -6.2); ctx.lineTo(3.8 * f, -5.8); ctx.fill();
      ctx.fillStyle = '#222'; ctx.fillRect(2.6 * f - 0.4, -7.2, 0.9, 0.9);
    }
    ctx.restore();
  }

  function doghouse(ctx, x, y) {
    box(ctx, x, y, 0, 1.8, 1.6, 22, '#e5534b', '#c9443d', '#b23a34', 'rgba(0,0,0,0.15)');
    const pl = P(x, y + 0.8, 36), pr = P(x + 1.8, y + 0.8, 36);
    poly(ctx, [P(x - 0.1, y - 0.1, 22), P(x + 1.9, y - 0.1, 22), pr, pl], '#8a6247');
    poly(ctx, [pl, pr, P(x + 1.9, y + 1.7, 22), P(x - 0.1, y + 1.7, 22)], '#a87a52', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x + 0.5, y + 1.6, 16, (g) => { g.fillStyle = '#2b1a12'; g.beginPath(); g.arc(13, 16, 9, Math.PI, 0); g.lineTo(22, 16); g.lineTo(4, 16); g.fill(); g.fillStyle = '#fff'; g.font = `bold 5px ${FONT}`; g.fillText('🐶 멍멍이', -2, -2); });
    cylinder(ctx, x + 2.3, y + 1.5, 0, 0.22, 3, '#4e7cf6', '#3f68d0');
  }
  function catTree(ctx, x, y) {
    cylinder(ctx, x, y, 0, 0.45, 4, '#c9b38f', '#b89e78');
    cylinder(ctx, x, y, 4, 0.12, 40, '#d9c8a4', '#c9b38f');
    for (const [z, r] of [[18, 0.38], [32, 0.32], [44, 0.42]]) cylinder(ctx, x + (z === 32 ? 0.25 : 0), y, z, r, 3, '#a8bfe0', '#8aa6cf');
    const [sx, sy] = P(x + 0.25, y, 35); ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(sx + 6, sy + 6, 2, 0, 7); ctx.fill(); ctx.strokeStyle = '#999'; ctx.beginPath(); ctx.moveTo(sx + 6, sy - 2); ctx.lineTo(sx + 6, sy + 4); ctx.stroke();
  }
  function coop(ctx, x, y) {
    box(ctx, x, y, 6, 1.8, 1.4, 16, '#f4ead8', '#e6d6bd', '#d6c3a5', 'rgba(0,0,0,0.15)');
    for (const [lx, ly] of [[0.1, 0.1], [1.6, 0.1], [0.1, 1.2], [1.6, 1.2]]) sbox(ctx, x + lx, y + ly, 0, 0.08, 0.08, 6, '#8a6247');
    poly(ctx, [P(x - 0.1, y - 0.1, 22), P(x + 1.9, y - 0.1, 22), P(x + 1.9, y + 0.7, 32), P(x - 0.1, y + 0.7, 32)], '#c43d32');
    poly(ctx, [P(x - 0.1, y + 0.7, 32), P(x + 1.9, y + 0.7, 32), P(x + 1.9, y + 1.5, 22), P(x - 0.1, y + 1.5, 22)], '#e5534b', 'rgba(0,0,0,0.12)');
    poly(ctx, [P(x + 0.6, y + 1.4, 6), P(x + 1.4, y + 2.2, 0), P(x + 1.6, y + 2.2, 0), P(x + 0.8, y + 1.4, 6)], '#a87a52');
    onPlaneY(ctx, x + 0.4, y + 1.4, 18, (g) => { g.fillStyle = '#3b2f2a'; g.fillRect(6, 4, 10, 8); g.fillStyle = '#f6d55a'; g.beginPath(); g.arc(11, 10, 2, 0, 7); g.fill(); });
  }

  /** 계단실: 왼쪽은 앞→뒤로 올라가는 계단, 오른쪽은 앞→뒤로 내려가는 계단(바닥 개구부) · 난간 · 미끄럼방지 띠 */
  function stairs(ctx, f) {
    const { x, y, w, d } = f, n = 8, H = 44, LAND = 0.75;
    const xm = x + w / 2, sd = (d - LAND) / n, rise = H / (n + 1);
    poly(ctx, [P(x, y), P(x + w, y), P(x + w, y + d), P(x, y + d)], '#d6d0c6');
    // ---- 내려가는 계단: 앞쪽(복도 문 쪽) 층계참에서 들어가 뒤쪽으로 내려간다 — 올라가는 계단과 방향이 반대
    const o0 = xm + 0.06, o1 = x + w - 0.04, oy0 = y + 0.04, oy1 = y + d - LAND;
    const dn = (oy1 - oy0) / n, drop = H / n;
    poly(ctx, [P(o0, oy1), P(o1, oy1), P(o1, y + d), P(o0, y + d)], '#e6e1d8', 'rgba(0,0,0,0.08)');   // 앞쪽 층계참 (바닥 높이)
    const hole = [P(o0, oy0), P(o1, oy0), P(o1, oy1), P(o0, oy1)];
    ctx.save();
    ctx.beginPath(); hole.forEach(([hx, hy], i) => (i ? ctx.lineTo(hx, hy) : ctx.moveTo(hx, hy))); ctx.closePath(); ctx.clip();
    poly(ctx, hole, '#2f2b27');
    poly(ctx, [P(o0, oy0, 0), P(o1, oy0, 0), P(o1, oy0, -H - 30), P(o0, oy0, -H - 30)], '#7a7368');           // 뒷벽
    poly(ctx, [P(o0, oy0, 0), P(o0, oy1, 0), P(o0, oy1, -H - 30), P(o0, oy0, -H - 30)], '#8a8276');           // 서쪽 벽
    // 뒤(가장 깊은 단)부터 앞(얕은 단)으로: 앞 단이 뒤 단의 앞부분을 덮는다
    for (let i = n - 1; i >= 0; i--) {
      const y1 = oy1 - i * dn, y0 = y1 - dn, z = -(i + 1) * drop, k = i / n;
      poly(ctx, [P(o0, y0, z), P(o1, y0, z), P(o1, y1, z), P(o0, y1, z)], shade('#ece7df', -0.04 - k * 0.42));             // 디딤판
      poly(ctx, [P(o0, y1, z), P(o1, y1, z), P(o1, y1, z - drop * 0.9), P(o0, y1, z - drop * 0.9)], shade('#c7bfb2', -0.06 - k * 0.42));   // 단 앞면 두께
      poly(ctx, [P(o0, y1 - 0.09, z), P(o1, y1 - 0.09, z), P(o1, y1, z), P(o0, y1, z)], rgba('#e0a92a', 0.9 - k * 0.6));   // 미끄럼방지 띠
    }
    ctx.restore();
    poly(ctx, hole, null, '#9a9387', 1);
    // ---- 올라가는 계단: 앞에서 뒤로 높아지고, 맨 뒤는 층계참
    const s0 = x + 0.04, s1 = xm - 0.06;
    box(ctx, s0, y + 0.04, 0, s1 - s0, LAND - 0.04, H, '#ece7df', '#cfc6b8', '#c3baac', 'rgba(0,0,0,0.08)');
    for (let i = n - 1; i >= 0; i--) {
      const y1 = y + d - i * sd, y0 = y1 - sd, h = (i + 1) * rise;
      box(ctx, s0, y0, 0, s1 - s0, sd, h, '#efebe4', '#cfc6b8', '#c3baac', 'rgba(0,0,0,0.07)');
      poly(ctx, [P(s0, y1 - 0.09, h), P(s1, y1 - 0.09, h), P(s1, y1, h), P(s0, y1, h)], '#e0a92a');   // 미끄럼방지 띠
    }
    // ---- 난간: 가운데 칸막이 난간(계단 경사를 따라) + 개구부 뒤쪽 안전난간
    const rail = (pts, c, lw) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke(); };
    const RH = 17, rx = xm;
    for (let i = 0; i <= n; i += 2) {
      const yy = y + d - i * sd - sd / 2, h = (i + 1) * rise;
      const hh = i === n ? H : h;
      rail([P(rx, Math.max(yy, y + LAND / 2), hh), P(rx, Math.max(yy, y + LAND / 2), hh + RH)], '#8d969e', 1.3);
    }
    rail([P(rx, y + 0.3, H + RH), P(rx, y + LAND, H + RH), P(rx, y + d - sd / 2, rise + RH), P(rx, y + d, rise + RH - 2)], '#8a6247', 2.4);
    rail([P(rx, y + d, rise + RH - 2), P(rx, y + d, 0)], '#8d969e', 1.6);
    rail([P(o1 - 0.04, oy1, RH), P(o1 - 0.04, oy0, RH)], '#8d969e', 1.6); rail([P(o0, oy0 + 0.04, RH), P(o1, oy0 + 0.04, RH)], '#8d969e', 1.6);   // 개구부 오른쪽 · 뒤쪽 안전난간
    // 바닥 안내 화살표 (▲ 올라감 · ▼ 내려감)
    const arrow = (cx, yy, up, c) => { const s = up ? -1 : 1; poly(ctx, [P(cx, yy + 0.25 * s, 0), P(cx - 0.2, yy - 0.15 * s, 0), P(cx + 0.2, yy - 0.15 * s, 0)], c); };
    arrow((s0 + s1) / 2, y + d + 0.35, true, 'rgba(63,138,69,0.85)'); arrow((o0 + o1) / 2, y + d - LAND / 2, true, 'rgba(196,61,50,0.8)');   // ▼ 뒤쪽으로 내려감
  }
  function bbq(ctx, x, y, t) {
    for (const [lx, ly] of [[0.1, 0.1], [0.9, 0.1], [0.1, 0.6], [0.9, 0.6]]) sbox(ctx, x + lx, y + ly, 0, 0.06, 0.06, 16, '#3b3f45');
    box(ctx, x, y, 16, 1.1, 0.8, 6, '#2b2b2b', '#232323', '#1d1d1d');
    for (let k = 0; k < 4; k++) { const [sx, sy] = P(x + 0.25 + k * 0.22, y + 0.4, 22.5); ctx.fillStyle = k % 2 ? '#a8532a' : '#c96a3a'; ctx.beginPath(); ctx.ellipse(sx, sy, 3.2, 1.6, 0, 0, 7); ctx.fill(); }
    const [sx, sy] = P(x + 0.55, y + 0.4, 24);
    ctx.strokeStyle = 'rgba(220,220,220,0.55)'; ctx.lineWidth = 1.4;
    for (let k = 0; k < 3; k++) { const o = Math.sin(t * 2 + k) * 3; ctx.beginPath(); ctx.moveTo(sx - 6 + k * 6, sy); ctx.quadraticCurveTo(sx - 6 + k * 6 + o, sy - 12, sx - 6 + k * 6 - o, sy - 24); ctx.stroke(); }
  }
  function trampoline(ctx, x, y, t) {
    ellipseFloor(ctx, x, y, 1.3, 1.3, 0, 'rgba(0,0,0,0.12)');
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4; sbox(ctx, x + Math.cos(a) * 1.1, y + Math.sin(a) * 1.1, 0, 0.06, 0.06, 10, '#4e7cf6'); }
    cylinder(ctx, x, y, 10, 1.25, 1.5, '#2b2b2b', '#4e7cf6');
    const [sx, sy] = P(x, y, 12 + Math.abs(Math.sin(t * 3)) * 2); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.ellipse(sx, sy, 30, 15, 0, 0, 7); ctx.fill();
  }
  function veggies(ctx, x, y, w, d, seed) {
    box(ctx, x, y, 0, w, d, 5, '#7a5a3a', '#6b4a35', '#5a3e2c');
    const r = AIO.rand(seed);
    for (let i = 0.4; i < w; i += 0.7) for (let j = 0.35; j < d; j += 0.7) { const [sx, sy] = P(x + i, y + j, 5); const kind = Math.floor(r() * 3); ctx.fillStyle = '#4f9550'; ctx.beginPath(); ctx.ellipse(sx, sy - 3, 5, 3, 0, 0, 7); ctx.fill(); ctx.fillStyle = ['#e5534b', '#ff9a5a', '#7cc472'][kind]; ctx.beginPath(); ctx.arc(sx + (r() - 0.5) * 4, sy - 5, 1.8, 0, 7); ctx.fill(); }
  }
  function mailboxes(ctx, x, y, w) {
    box(ctx, x, y, 0, w, 0.5, 34, '#c9cfd4', '#b7bec4', '#a9b0b6', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x, y + 0.5, 32, (g) => { for (let i = 0; i < w * 32 / 8; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 3 ? '#e1e5e9' : '#d2d8de'; g.fillRect(1 + i * 8, 2 + j * 7.5, 7, 6.5); g.fillStyle = '#7d858c'; g.fillRect(5 + i * 8, 5 + j * 7.5, 2, 1); } });
  }
  function bikeRack(ctx, x, y) {
    for (let k = 0; k < 3; k++) { const [sx, sy] = P(x + k * 0.6, y, 0); ctx.strokeStyle = '#7d858c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(sx, sy - 8, 6, Math.PI, 0); ctx.stroke(); }
    const [bx, by] = P(x + 0.3, y + 0.3, 0); ctx.strokeStyle = '#e5534b'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(bx - 6, by - 5, 4.5, 0, 7); ctx.arc(bx + 6, by - 5, 4.5, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(bx - 6, by - 5); ctx.lineTo(bx, by - 11); ctx.lineTo(bx + 6, by - 5); ctx.stroke();
  }

  function generator(ctx, x, y, t) {
    box(ctx, x, y, 0, 2.6, 1.4, 34, '#e9a23b', '#c47f22', '#a8691a', 'rgba(0,0,0,0.2)');
    onPlaneY(ctx, x + 0.1, y + 1.4, 30, (g) => { g.fillStyle = '#2b2b2b'; for (let i = 0; i < 8; i++) g.fillRect(6 + i * 9, 6, 5, 18); g.fillStyle = '#fff'; g.font = `bold 5px ${FONT}`; g.fillText('⚡ 비상발전기', 4, 4); });
    cylinder(ctx, x + 2.2, y + 0.4, 34, 0.15, 22, '#7d858c', '#6d757c');
    const [sx, sy] = P(x + 2.2, y + 0.4, 58); ctx.fillStyle = `rgba(160,160,160,${0.25 + 0.15 * Math.sin(t * 3)})`; ctx.beginPath(); ctx.arc(sx + Math.sin(t) * 2, sy - 6, 5, 0, 7); ctx.fill();
  }
  function waterTank(ctx, x, y) {
    cylinder(ctx, x, y, 0, 0.9, 54, '#9fc9de', '#7fb0cc', 'rgba(0,0,0,0.2)');
    for (const z of [14, 28, 42]) { const [a, b] = P(x - 0.9, y, z); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(...P(x, y, z), 41, 20, 0, 0, Math.PI); ctx.stroke(); void a; void b; }
    onPlaneY(ctx, x - 0.4, y + 0.85, 40, (g) => { g.fillStyle = '#2f5d8a'; g.font = `bold 5px ${FONT}`; g.fillText('💧 저수조', 2, 6); });
  }
  function electricPanel(ctx, f, t) {
    onPlaneY(ctx, f.x, f.y + 0.03, 76, (g) => {
      const Wl = f.w * 32;
      for (let i = 0; i < Wl / 18; i++) { g.fillStyle = '#c4cbd2'; g.fillRect(i * 18 + 1, 0, 16, 60); g.fillStyle = '#9aa1a7'; g.fillRect(i * 18 + 3, 4, 12, 18); for (let k = 0; k < 4; k++) { g.fillStyle = Math.sin(t * 2 + i + k) > 0.3 ? '#4ef08a' : '#2a5a3a'; g.fillRect(i * 18 + 4 + k * 3, 26, 2, 2); } g.fillStyle = '#f2c230'; g.fillRect(i * 18 + 3, 40, 12, 3); }
    });
  }
  function specimenTank(ctx, x, y, t, color = '#4ef08a') {
    cylinder(ctx, x, y, 0, 0.42, 8, '#3b3f45', '#2d3035');
    cylinder(ctx, x, y, 8, 0.38, 48, rgba(color, 0.35), rgba(color, 0.28), 'rgba(255,255,255,0.4)');
    const [sx, sy] = P(x, y, 30 + Math.sin(t * 1.4 + x) * 3);
    ctx.fillStyle = '#f2b5c4'; ctx.beginPath(); ctx.ellipse(sx, sy, 8, 6, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#d9849a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx - 6, sy); ctx.quadraticCurveTo(sx, sy - 4, sx + 6, sy); ctx.stroke();
    for (let k = 0; k < 3; k++) { const p = (t * 0.6 + k / 3) % 1, [bx, by] = P(x + (k - 1) * 0.15, y, 10 + p * 46); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(bx, by, 1.4, 0, 7); ctx.fill(); }
    cylinder(ctx, x, y, 56, 0.42, 4, '#3b3f45', '#2d3035');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const [gx, gy] = P(x, y, 30); const gg = ctx.createRadialGradient(gx, gy, 2, gx, gy, 34); gg.addColorStop(0, rgba(color, 0.25)); gg.addColorStop(1, rgba(color, 0)); ctx.fillStyle = gg; ctx.fillRect(gx - 34, gy - 34, 68, 68); ctx.restore();
  }
  /** soil cutaway round a basement floor seen from outside (south + east faces, from ground level down) */
  function earthCut(ctx, b, zb) {
    const { x, y, W, H } = b;
    const face = (pts, c) => poly(ctx, pts, c);
    face([P(x - 0.6, y + H + 0.6, 0), P(x + W + 0.6, y + H + 0.6, 0), P(x + W + 0.6, y + H + 0.6, zb), P(x - 0.6, y + H + 0.6, zb)], '#8a6a4a');
    face([P(x + W + 0.6, y - 0.6, 0), P(x + W + 0.6, y + H + 0.6, 0), P(x + W + 0.6, y + H + 0.6, zb), P(x + W + 0.6, y - 0.6, zb)], '#76583c');
    ctx.strokeStyle = 'rgba(60,40,20,0.35)'; ctx.lineWidth = 1;
    for (let z = -10; z > zb; z -= 14) { ctx.beginPath(); ctx.moveTo(...P(x - 0.6, y + H + 0.6, z)); ctx.lineTo(...P(x + W + 0.6, y + H + 0.6, z)); ctx.lineTo(...P(x + W + 0.6, y - 0.6, z)); ctx.stroke(); }
    const r = AIO.rand(7);
    for (let i = 0; i < 40; i++) { const [sx, sy] = P(x + r() * W, y + H + 0.6, zb * r()); ctx.fillStyle = 'rgba(120,95,70,0.8)'; ctx.beginPath(); ctx.ellipse(sx, sy, 2 + r() * 3, 1.5, 0, 0, 7); ctx.fill(); }
  }

  AIO.art8 = { generator, waterTank, electricPanel, specimenTank, earthCut, stairs, bbq, trampoline, veggies, mailboxes, bikeRack, doghouse, catTree, coop, beerTap, arcade, gameTV, foosball, massageChair, dartboard, napPod, airCon, wallAC, exitSign, extinguisher, umbrellaStand, turnstile, fridge, brandWall, pet };
})();
