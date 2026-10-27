// Interior pack for every campus building (lecture rooms, labs, library, dorms, cafeteria, gym, shops) +
// tree species, fences and organic ground strokes (curving paths, round plazas, flower ellipses).
(function () {
  const { P, shade, rgba, poly, box, sbox, cylinder, ellipseFloor, onPlaneY, onPlaneX, roundRect } = AIO.iso;
  const A = AIO.art;
  const FONT = A.FONT;
  const GOODS = ['#e5534b', '#f2c230', '#4e7cf6', '#3fb27f', '#ff9a5a', '#a67be0', '#ffffff', '#1f9fb4', '#e2667f'];

  // ------------------------------------------------------------------ restroom pieces (drawn separately so walls sort right)
  function restroomWall(ctx, f) {
    const tint = f.kind === 'm' ? '#cfe0f2' : '#f6d6de';
    onPlaneY(ctx, f.x, f.y + 0.02, 64, (g) => {
      g.fillStyle = tint; g.fillRect(0, 0, f.w * 32, 64);
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 0.6;
      for (let i = 0; i < f.w * 32; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); }
      for (let j = 0; j < 64; j += 6) { g.beginPath(); g.moveTo(0, j); g.lineTo(f.w * 32, j); g.stroke(); }
    });
  }
  function stall(ctx, f, t) {
    const sx = f.x, y = f.y, c = f.kind === 'm' ? '#7fa6cf' : '#e298aa';
    cylinder(ctx, sx + 0.7, y + 0.45, 0, 0.22, 10, '#ffffff', '#e8edf1', 'rgba(0,0,0,0.12)');
    box(ctx, sx + 0.5, y + 0.05, 10, 0.4, 0.2, 12, '#ffffff', '#e8edf1', '#dde3e8');
    box(ctx, sx + 1.38, y, 2, 0.07, 1.6, 50, '#9fb1c2', '#8ea1b3', '#8295a7');
    box(ctx, sx + 0.05, y + 1.55, 2, 1.25, 0.07, 50, c, shade(c, -0.12), shade(c, -0.2));
    const [hx, hy] = P(sx + 1.1, y + 1.62, 26); ctx.fillStyle = Math.sin(t * 0.3 + f.k * 3) > 0.6 ? '#e5534b' : '#3fb27f'; ctx.fillRect(hx - 1.5, hy - 1.5, 3, 3);
  }
  function sinks(ctx, f) {
    const { x, y } = f;
    box(ctx, x, y, 0, 0.55, 2.2, 24, '#f4f1ec', '#e3ded6', '#d6d0c6');
    for (let k = 0; k < 2; k++) { cylinder(ctx, x + 0.27, y + 0.5 + k * 1.1, 24, 0.17, 2, '#ffffff', '#eef2f5'); sbox(ctx, x + 0.04, y + 0.45 + k * 1.1, 24, 0.05, 0.05, 8, '#b7bec4'); }
    onPlaneX(ctx, x - 0.03, y + 2.3, 60, (g) => { g.fillStyle = 'rgba(210,232,245,0.9)'; g.fillRect(0, 0, 66, 22); g.strokeStyle = '#b7bec4'; g.strokeRect(0, 0, 66, 22); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(6, 3, 6, 16); });
  }

  // ------------------------------------------------------------------ classrooms / labs / offices
  function blackboard(ctx, f) {
    onPlaneY(ctx, f.x, f.y + 0.03, 78, (g) => {
      const Wl = f.w * 32;
      g.fillStyle = '#8a6247'; g.fillRect(-3, -3, Wl + 6, 46);
      g.fillStyle = f.white ? '#f7f8fa' : '#2f5240'; g.fillRect(0, 0, Wl, 40);
      g.fillStyle = f.white ? '#4e7cf6' : 'rgba(255,255,255,0.85)'; g.font = `5px ${FONT}`;
      (f.lines || ['오늘의 강의', '∇·E = ρ/ε₀', 'loss → 0 ?']).forEach((l, i) => g.fillText(l, 6, 9 + i * 8));
      g.strokeStyle = f.white ? '#e5534b' : 'rgba(255,255,255,0.6)'; g.lineWidth = 0.8;
      g.beginPath(); for (let i = 0; i < 10; i++) g.lineTo(Wl - 50 + i * 4, 32 - Math.sin(i * 0.8) * 8); g.stroke();
      g.fillStyle = '#d9c8a4'; g.fillRect(4, 41, Wl - 8, 2);
    });
  }
  function lectern(ctx, x, y) {
    box(ctx, x - 0.4, y - 0.3, 0, 0.8, 0.6, 30, '#8a6247', '#7a5540', '#6b4a35', 'rgba(0,0,0,0.15)');
    poly(ctx, [P(x - 0.45, y - 0.35, 30), P(x + 0.45, y - 0.35, 30), P(x + 0.45, y + 0.35, 34), P(x - 0.45, y + 0.35, 34)], '#a87a52');
    box(ctx, x - 0.15, y - 0.1, 34, 0.3, 0.2, 2, '#d9dde1', '#c4c9cd', '#b5bbc0');
  }
  /** row of joined student desks along x (sliced by the renderer) */
  function deskRow(ctx, f) {
    const { x, y, w } = f;
    for (let i = 0; i <= w; i += 2) sbox(ctx, x + Math.min(i, w - 0.1), y + 0.1, 0, 0.08, 0.5, 18, '#7d858c');
    box(ctx, x, y, 18, w, 0.7, 2, '#e9dcc3', '#d9c7a4', '#cdb894', 'rgba(0,0,0,0.12)');
    for (let i = 0.4; i < w; i += 1) { const [sx, sy] = P(x + i, y + 0.35, 20); ctx.fillStyle = (i * 7 | 0) % 3 ? '#ffffff' : '#cfe6f2'; ctx.fillRect(sx - 4, sy - 2, 8, 3); }
  }
  /** auditorium seat row: folding seats along x, facing -y (towards the stage) */
  function seatRow(ctx, f) {
    const { x, y, w } = f, c = f.color || '#a8323e';
    box(ctx, x, y + 0.45, 0, w, 0.12, 16, shade(c, -0.1), shade(c, -0.2), shade(c, -0.3));
    for (let i = 0; i < w; i += 0.8) {
      box(ctx, x + i + 0.06, y, 6, 0.68, 0.45, 4, shade(c, 0.1), c, shade(c, -0.15));
      box(ctx, x + i + 0.06, y + 0.4, 6, 0.68, 0.12, 20, shade(c, 0.05), shade(c, -0.05), shade(c, -0.2));
    }
  }
  function cleanroomTool(ctx, x, y, t, seed) {
    box(ctx, x, y, 0, 1.6, 1.2, 46, '#f2f4f6', '#dfe3e7', '#cfd5da', 'rgba(0,0,0,0.12)');
    box(ctx, x + 0.2, y + 0.2, 46, 1.2, 0.8, 8, '#e3e8ec', '#cfd5da', '#c2c9cf');
    onPlaneY(ctx, x + 0.1, y + 1.2, 40, (g) => { g.fillStyle = '#16181b'; g.fillRect(6, 4, 24, 12); g.fillStyle = Math.sin(t * 2 + seed) > 0 ? '#4ef08a' : '#5fd0ff'; g.font = `4px ${FONT}`; g.fillText(['EUV', 'CVD', 'ETCH', 'SEM'][seed % 4], 9, 12); g.fillStyle = '#ffb347'; g.fillRect(36, 6, 3, 3); });
  }
  function drafting(ctx, x, y) {
    for (const [lx, ly] of [[0.1, 0.1], [1.4, 0.1], [0.1, 0.9], [1.4, 0.9]]) sbox(ctx, x + lx, y + ly, 0, 0.06, 0.06, 26, '#5d6166');
    poly(ctx, [P(x, y, 30), P(x + 1.5, y, 30), P(x + 1.5, y + 1, 24), P(x, y + 1, 24)], '#f7f6f2', 'rgba(0,0,0,0.2)');
    const [sx, sy] = P(x + 0.7, y + 0.5, 28); ctx.strokeStyle = '#4e7cf6'; ctx.lineWidth = 0.8; ctx.strokeRect(sx - 8, sy - 4, 12, 6); ctx.beginPath(); ctx.arc(sx + 6, sy, 3, 0, 7); ctx.stroke();
  }
  function model3d(ctx, x, y, t) {
    box(ctx, x, y, 0, 1, 1, 22, '#ffffff', '#ececec', '#dcdcdc');
    const [sx, sy] = P(x + 0.5, y + 0.5, 30);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.6);
    ctx.fillStyle = '#f2c230'; ctx.fillRect(-5, -5, 10, 10); ctx.fillStyle = '#e5534b'; ctx.beginPath(); ctx.arc(0, -8, 4, 0, 7); ctx.fill();
    ctx.restore();
  }

  // ------------------------------------------------------------------ library / dorm / gym / daycare / fire
  function bookStack(ctx, f) {
    // double-sided free-standing library shelf along x
    const { x, y, w } = f, r = AIO.rand(f.seed || 3);
    box(ctx, x, y, 0, w, 0.7, 54, '#a87a52', '#8a6247', '#7a5540', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x, y + 0.7, 52, (g) => {
      for (let s = 0; s < 4; s++) { let bx = 2; while (bx < w * 32 - 3) { const bw = 2 + r() * 3; g.fillStyle = ['#c0392b', '#2f6fb0', '#2f9e5f', '#e9a23b', '#7a4a2a', '#a67be0', '#e2667f'][Math.floor(r() * 7)]; g.fillRect(bx, 3 + s * 12.5, bw, 9 + r() * 2); bx += bw + 0.5; } g.fillStyle = '#7a5540'; g.fillRect(0, 13 + s * 12.5, w * 32, 1.5); }
    });
  }
  function readingTable(ctx, x, y, w) {
    box(ctx, x, y, 0, w, 1.2, 20, '#c49a62', '#a87a52', '#8a6247', 'rgba(0,0,0,0.12)');
    for (let i = 0.6; i < w; i += 1.6) { cylinder(ctx, x + i, y + 0.6, 20, 0.1, 10, '#3fb27f', '#2f8c62'); const [sx, sy] = P(x + i, y + 0.6, 31); ctx.fillStyle = 'rgba(255,240,180,0.9)'; ctx.beginPath(); ctx.ellipse(sx, sy, 5, 2.5, 0, 0, 7); ctx.fill(); }
  }
  function bed(ctx, x, y, color, flip) {
    if (flip) {                                                                                       // 머리판이 앞(남쪽) — 뒤에 있는 것부터 그린다
      box(ctx, x - 0.02, y - 0.03, 0, 1.04, 0.1, 9, '#a87a52', '#8a6247', '#7a5540');                 // 발판(뒤, 매트리스보다 낮게)
      box(ctx, x, y + 0.07, 0, 1, 1.86, 10, '#c49a62', '#a87a52', '#8a6247', 'rgba(0,0,0,0.12)');    // 침대 틀
      box(ctx, x + 0.05, y + 0.1, 10, 0.9, 1.8, 4, '#ffffff', '#ececec', '#e0e0e0');                  // 매트리스 (틀 안쪽)
      box(ctx, x + 0.05, y + 0.1, 14, 0.9, 1.25, 2, color, shade(color, -0.1), shade(color, -0.2));  // 이불
      box(ctx, x + 0.15, y + 1.45, 14, 0.7, 0.38, 3, '#fffdf6', '#f0ebe0', '#e3ddd0');                 // 베개
      box(ctx, x, y + 1.93, 0, 1, 0.12, 24, '#a87a52', '#8a6247', '#7a5540');                         // 머리판(앞)
      return;
    }
    box(ctx, x, y - 0.05, 0, 1, 0.12, 24, '#a87a52', '#8a6247', '#7a5540');                        // 머리판 (뒤라서 먼저)
    box(ctx, x, y + 0.07, 0, 1, 1.93, 10, '#c49a62', '#a87a52', '#8a6247', 'rgba(0,0,0,0.12)');    // 침대 틀
    box(ctx, x + 0.05, y + 0.1, 10, 0.9, 1.85, 4, '#ffffff', '#ececec', '#e0e0e0');                 // 매트리스
    box(ctx, x + 0.15, y + 0.15, 14, 0.7, 0.38, 3, '#fffdf6', '#f0ebe0', '#e3ddd0');                 // 베개
    box(ctx, x + 0.05, y + 0.62, 14, 0.9, 1.33, 2, color, shade(color, -0.1), shade(color, -0.2));  // 이불
    box(ctx, x - 0.02, y + 1.93, 0, 1.04, 0.1, 12, '#a87a52', '#8a6247', '#7a5540');                // 발판
  }
  function washer(ctx, x, y, t, k) {
    box(ctx, x, y, 0, 0.9, 0.8, 30, '#f4f6f8', '#e1e5e9', '#d2d7dc', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x + 0.05, y + 0.8, 26, (g) => { g.fillStyle = '#c4cbd2'; g.beginPath(); g.arc(14, 13, 9, 0, 7); g.fill(); g.fillStyle = 'rgba(160,210,240,0.9)'; g.beginPath(); g.arc(14, 13, 7, 0, 7); g.fill(); g.fillStyle = '#fff'; const a = t * 6 + k; g.fillRect(14 + Math.cos(a) * 4 - 1.5, 13 + Math.sin(a) * 4 - 1.5, 3, 3); });
  }
  function treadmill(ctx, x, y, t) {
    box(ctx, x, y + 0.2, 0, 0.8, 1.6, 5, '#3b3f45', '#2d3035', '#26292d');
    for (let i = 0; i < 4; i++) { const k = ((t * 1.4 + i / 4) % 1) * 1.5; poly(ctx, [P(x + 0.1, y + 0.25 + k, 5.1), P(x + 0.7, y + 0.25 + k, 5.1), P(x + 0.7, y + 0.3 + k, 5.1), P(x + 0.1, y + 0.3 + k, 5.1)], '#5d6166'); }
    for (const lx of [x + 0.05, x + 0.7]) sbox(ctx, lx, y + 0.2, 5, 0.06, 0.06, 28, '#9aa1a7');
    box(ctx, x, y, 30, 0.8, 0.3, 6, '#2d3035', '#26292d', '#1e2125');
  }
  function weightRack(ctx, x, y) {
    box(ctx, x, y, 0, 2, 0.6, 26, '#3b3f45', '#2d3035', '#26292d');
    for (let i = 0; i < 5; i++) { const [sx, sy] = P(x + 0.2 + i * 0.4, y + 0.6, 10 + (i % 2) * 10); ctx.fillStyle = ['#e5534b', '#4e7cf6', '#f2c230', '#3fb27f', '#3b3f45'][i]; ctx.beginPath(); ctx.ellipse(sx, sy, 3.6, 6, 0, 0, 7); ctx.fill(); }
  }
  function toyBlocks(ctx, x, y, seed) {
    const r = AIO.rand(seed);
    for (let i = 0; i < 6; i++) box(ctx, x + r() * 0.8, y + r() * 0.8, (i % 3) * 5, 0.25, 0.25, 5, GOODS[i % GOODS.length], shade(GOODS[i % GOODS.length], -0.1), shade(GOODS[i % GOODS.length], -0.2));
  }
  function firePole(ctx, x, y) { cylinder(ctx, x, y, 0, 0.6, 1, '#e5534b', '#c9443d'); sbox(ctx, x - 0.04, y - 0.04, 1, 0.08, 0.08, 104, '#d9dde1'); }
  function gearRack(ctx, x, y, w) {
    box(ctx, x, y, 0, w, 0.5, 6, '#8d959c', '#7f878e', '#737a80');
    for (let i = 0.3; i < w; i += 0.8) { box(ctx, x + i, y + 0.05, 6, 0.6, 0.35, 32, '#c9a24a', '#b38b33', '#9a7628'); const [sx, sy] = P(x + i + 0.3, y + 0.2, 46); ctx.fillStyle = '#e5534b'; ctx.beginPath(); ctx.ellipse(sx, sy, 7, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#f2c230'; ctx.fillRect(sx - 6, sy - 2, 12, 2); }
  }

  // ------------------------------------------------------------------ shops / restaurants
  function storeShelf(ctx, f) {
    const { x, y, w } = f, r = AIO.rand(f.seed || 7);
    box(ctx, x, y, 0, w, 0.8, 34, '#f4f6f8', '#e1e5e9', '#d2d7dc', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x, y + 0.8, 32, (g) => {
      for (let s = 0; s < 3; s++) { for (let i = 2; i < w * 32 - 4; i += 4.5) { g.fillStyle = GOODS[Math.floor(r() * GOODS.length)]; g.fillRect(i, 2 + s * 10, 3.6, 7); } g.fillStyle = '#c4cbd2'; g.fillRect(0, 9.5 + s * 10, w * 32, 1); }
    });
    for (let i = 0.2; i < w; i += 0.45) box(ctx, x + i, y + 0.15, 34, 0.3, 0.45, 4, GOODS[Math.floor(r() * GOODS.length)], shade('#cccccc', -0.1), shade('#cccccc', -0.2));
  }
  function fridgeCase(ctx, f, t) {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.9, 62, '#e9edf1', '#d2d8de', '#c4cbd2', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x, y + 0.9, 60, (g) => {
      const Wl = w * 32;
      g.fillStyle = 'rgba(190,225,245,0.55)'; g.fillRect(2, 2, Wl - 4, 54);
      for (let s = 0; s < 4; s++) for (let i = 4; i < Wl - 6; i += 5) { g.fillStyle = GOODS[(i + s * 3) % GOODS.length]; g.fillRect(i, 6 + s * 13, 3.4, 9); }
      g.strokeStyle = '#b7bec4'; for (let i = 0; i < Wl; i += 32) { g.beginPath(); g.moveTo(i, 2); g.lineTo(i, 56); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(6 + (t * 10 % 20), 4, 3, 50);
    });
  }
  function till(ctx, f, t) {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.9, 26, f.color || '#f4f1ec', shade(f.color || '#e6e0d6', -0.05), shade(f.color || '#d6cfc3', -0.12), 'rgba(0,0,0,0.12)');
    box(ctx, x - 0.05, y - 0.05, 26, w + 0.1, 1, 2.5, '#3b3f45', '#2d3035', '#26292d');
    box(ctx, x + w - 1, y + 0.2, 28.5, 0.6, 0.45, 8, '#2d3035', '#26292d', '#1e2125');
    const [sx, sy] = P(x + w - 0.7, y + 0.45, 37); ctx.fillStyle = Math.sin(t * 2) > 0 ? '#4ef08a' : '#5fd0ff'; ctx.fillRect(sx - 4, sy - 2, 8, 3);
    if (f.label) onPlaneY(ctx, x + 0.2, y + 0.9, 22, (g) => { g.fillStyle = '#3b332b'; g.font = `6px ${FONT}`; g.fillText(f.label, 4, 12); });
  }
  function kitchenLine(ctx, f, t) {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.9, 26, '#c9cfd4', '#b7bec4', '#a9b0b6', 'rgba(0,0,0,0.15)');
    for (let i = 0.2; i < w - 0.6; i += 1.2) {
      if (f.kind === 'fry' && (i | 0) % 2 === 0) { box(ctx, x + i, y + 0.15, 26, 0.9, 0.6, 2, '#e9a23b', '#c47f22', '#a8691a'); const [sx, sy] = P(x + i + 0.45, y + 0.45, 29); for (let k = 0; k < 3; k++) { ctx.fillStyle = 'rgba(255,240,200,0.8)'; ctx.beginPath(); ctx.arc(sx - 6 + k * 6, sy + Math.sin(t * 8 + k) * 1.2, 1.4, 0, 7); ctx.fill(); } }
      else { cylinder(ctx, x + i + 0.45, y + 0.45, 26, 0.32, 6, '#6d7175', '#5d6166'); const [sx, sy] = P(x + i + 0.45, y + 0.45, 33); ctx.strokeStyle = 'rgba(230,230,230,0.6)'; ctx.lineWidth = 1; const o = Math.sin(t * 2 + i) * 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + o, sy - 8, sx - o, sy - 16); ctx.stroke(); }
    }
    box(ctx, x, y - 0.05, 60, w, 0.5, 10, '#d9dde1', '#c4c9cd', '#b5bbc0');
  }
  function pizzaOven(ctx, x, y, t) {
    box(ctx, x, y, 0, 1.8, 1.4, 22, '#b5523b', '#9c4532', '#8a3d2c');
    const [sx, sy] = P(x + 0.9, y + 0.7, 22);
    ctx.fillStyle = '#c9573f'; ctx.beginPath(); ctx.ellipse(sx, sy - 6, 34, 26, 0, Math.PI, 0); ctx.fill();
    const [mx, my] = P(x + 0.9, y + 1.4, 30); ctx.fillStyle = '#2b1a12'; ctx.beginPath(); ctx.ellipse(mx, my, 10, 7, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = `rgba(255,${150 + Math.sin(t * 9) * 40},60,0.9)`; ctx.beginPath(); ctx.ellipse(mx, my - 1, 7, 4, 0, Math.PI, 0); ctx.fill();
    sbox(ctx, x + 1.4, y + 0.3, 30, 0.25, 0.25, 30, '#7d858c');
  }
  function breadCase(ctx, f) {
    const { x, y, w } = f, r = AIO.rand(9);
    box(ctx, x, y, 0, w, 0.9, 22, '#e2cfae', '#c9b38f', '#b89e78');
    box(ctx, x, y, 22, w, 0.9, 14, 'rgba(220,240,250,0.5)', 'rgba(200,225,240,0.45)', 'rgba(190,215,232,0.45)', 'rgba(90,110,130,0.5)');
    for (let i = 0.2; i < w; i += 0.35) { const [sx, sy] = P(x + i, y + 0.3 + r() * 0.3, 24); ctx.fillStyle = ['#d9a066', '#c47f22', '#f0c27a', '#8b5a3c'][Math.floor(r() * 4)]; ctx.beginPath(); ctx.ellipse(sx, sy, 4, 2.4, 0, 0, 7); ctx.fill(); }
  }
  function flowerStand(ctx, x, y, w, seed) {
    const r = AIO.rand(seed);
    for (let tier = 0; tier < 3; tier++) box(ctx, x, y + tier * 0.35, tier * 8, w, 0.35, 8, '#c49a62', '#a87a52', '#8a6247');
    for (let tier = 0; tier < 3; tier++) for (let i = 0.25; i < w; i += 0.5) {
      cylinder(ctx, x + i, y + tier * 0.35 + 0.17, 8 + tier * 8, 0.16, 6, '#5d6166', '#4f5459');
      const [sx, sy] = P(x + i, y + tier * 0.35 + 0.17, 20 + tier * 8);
      const c = ['#f07a8a', '#f6c445', '#ffffff', '#b38cf0', '#ff9a5a', '#e5534b'][Math.floor(r() * 6)];
      for (let k = 0; k < 4; k++) { ctx.fillStyle = k ? c : '#5c9a4a'; ctx.beginPath(); ctx.arc(sx + (r() - 0.5) * 8, sy - r() * 6, 2.4, 0, 7); ctx.fill(); }
    }
  }
  function salonStation(ctx, x, y) {
    onPlaneY(ctx, x - 0.2, y + 0.02, 70, (g) => { g.fillStyle = '#e6c88a'; roundRect(g, 0, 0, 38, 44, 18); g.fill(); g.fillStyle = 'rgba(210,232,245,0.95)'; roundRect(g, 3, 3, 32, 38, 15); g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(9, 8, 4, 26); });
    box(ctx, x - 0.1, y + 0.05, 22, 1.2, 0.35, 2, '#f4f1ec', '#e6e0d6', '#d6cfc3');
    cylinder(ctx, x + 0.5, y + 1.2, 0, 0.3, 4, '#9aa1a7', '#7d858c');
    sbox(ctx, x + 0.45, y + 1.15, 4, 0.1, 0.1, 8, '#7d858c');
    box(ctx, x + 0.15, y + 0.95, 12, 0.7, 0.6, 4, '#2b2b2b', '#232323', '#1d1d1d');
    box(ctx, x + 0.15, y + 0.85, 16, 0.7, 0.15, 18, '#2b2b2b', '#232323', '#1d1d1d');
  }
  function sushiBelt(ctx, f, t) {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 1.4, 22, '#c49a62', '#a87a52', '#8a6247', 'rgba(0,0,0,0.12)');
    box(ctx, x + 0.2, y + 0.3, 22, w - 0.4, 0.8, 1.2, '#9aa1a7', '#7d858c', '#6d7175');
    const n = Math.floor(w * 2.2), L = (w - 0.4) * 2 + 1.6;
    for (let i = 0; i < n; i++) {
      let s = ((i / n) * L + t * 0.5) % L, px, py;
      if (s < w - 0.4) { px = x + 0.2 + s; py = y + 0.45; } else if (s < w - 0.4 + 0.8) { px = x + w - 0.2; py = y + 0.45 + (s - (w - 0.4)) * 0.6; } else if (s < 2 * (w - 0.4) + 0.8) { px = x + w - 0.2 - (s - (w - 0.4) - 0.8); py = y + 0.95; } else { px = x + 0.2; py = y + 0.95 - (s - 2 * (w - 0.4) - 0.8) * 0.6; }
      const [sx, sy] = P(px, py, 24);
      ctx.fillStyle = ['#e5534b', '#4e7cf6', '#f2c230', '#3fb27f'][i % 4]; ctx.beginPath(); ctx.ellipse(sx, sy, 5, 2.6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = i % 3 ? '#ff8a5a' : '#ffffff'; ctx.beginPath(); ctx.ellipse(sx, sy - 1.6, 3, 1.4, 0, 0, 7); ctx.fill();
    }
  }
  function pcStation(ctx, f, t) {
    const { x, y } = f;
    box(ctx, x, y, 0, 1.6, 0.8, 22, '#2d3035', '#26292d', '#1e2125', 'rgba(0,0,0,0.2)');
    box(ctx, x + 0.3, y + 0.1, 22, 1, 0.12, 16, '#16181b', '#111316', '#0d0f11');
    onPlaneY(ctx, x + 0.32, y + 0.22, 37, (g) => { const hue = (t * 40 + x * 30) % 360; g.fillStyle = `hsl(${hue},70%,55%)`; g.fillRect(1, 1, 30, 13); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(4 + (t * 20 % 20), 5, 4, 4); });
    const [sx, sy] = P(x + 0.8, y + 0.6, 23); ctx.fillStyle = `hsl(${(t * 60 + x * 50) % 360},80%,60%)`; ctx.fillRect(sx - 8, sy, 16, 1.5);
  }
  function wallSign(ctx, f) {
    onPlaneY(ctx, f.x, f.y + 0.03, 96, (g) => {
      g.font = `bold 9px ${FONT}`;
      const w = g.measureText(f.text).width + 18;
      g.fillStyle = f.color || '#2b2622'; roundRect(g, 0, 0, w, 18, 6); g.fill();
      g.fillStyle = '#fff'; g.fillText(f.text, 9, 12.5);
    });
  }
  function menuWall(ctx, f) {
    onPlaneY(ctx, f.x, f.y + 0.03, 92, (g) => {
      const Wl = f.w * 32;
      g.fillStyle = '#2f3a30'; roundRect(g, 0, 0, Wl, 30, 3); g.fill();
      g.fillStyle = '#f6efd8'; g.font = `5px ${FONT}`;
      (f.items || []).forEach((m, i) => g.fillText(m, 6 + (i % 3) * (Wl / 3), 10 + Math.floor(i / 3) * 8));
    });
  }

  // ------------------------------------------------------------------ trees, fences, organic ground
  function tree2(ctx, x, y, s, seed, kind, t) {
    ellipseFloor(ctx, x + 0.15, y + 0.15, 0.55 * s, 0.55 * s, 0, 'rgba(40,60,30,0.18)');
    const sway = Math.sin(t * 0.9 + seed) * 1.2;
    if (kind === 'pine') {
      sbox(ctx, x - 0.06, y - 0.06, 0, 0.12, 0.12, 14 * s, '#7a5a3a');
      const [sx, sy] = P(x, y, 10 * s);
      for (let k = 0; k < 4; k++) { const w = (18 - k * 4) * s, top = sy - (8 + k * 12) * s; ctx.fillStyle = ['#2f6b45', '#357a4e', '#3c8957', '#469862'][k]; ctx.beginPath(); ctx.moveTo(sx - w + sway * k * 0.2, top + 12 * s); ctx.lineTo(sx + sway * k * 0.3, top - 10 * s); ctx.lineTo(sx + w + sway * k * 0.2, top + 12 * s); ctx.fill(); }
      return;
    }
    sbox(ctx, x - 0.07, y - 0.07, 0, 0.14, 0.14, 24 * s, kind === 'ginkgo' ? '#6b4a35' : '#8a6a45');
    const [sx, sy] = P(x, y, 24 * s);
    const pal = { cherry: ['#f7b6c8', '#f4a3bb', '#fbd0dc', '#f09ab4', '#ffe0ea'], maple: ['#e5534b', '#d9442f', '#f07a3a', '#c43d32', '#ff9a5a'], ginkgo: ['#f2c230', '#e9b81f', '#f6d55a', '#ddb01a', '#ffe27a'], oak: ['#4f9550', '#5fa35a', '#468a47', '#6db866', '#3f8442'] }[kind] || ['#5fa35a', '#4f9550', '#6db866', '#58a057', '#7cc472'];
    const blobs = kind === 'ginkgo' ? [[0, -16, 13], [-8, -8, 10], [8, -8, 10], [0, -28, 10], [0, -38, 7]] : [[0, -14, 17], [-10, -6, 12], [10, -6, 12], [-5, -24, 11], [6, -22, 12]];
    blobs.forEach(([dx, dy, rr], i) => { ctx.beginPath(); ctx.arc(sx + dx * s + sway * (1 - i * 0.1), sy + dy * s, rr * s, 0, 7); ctx.fillStyle = pal[i % pal.length]; ctx.fill(); });
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(sx - 6 * s + sway, sy - 22 * s, 6 * s, 0, 7); ctx.fill();
    if (kind === 'cherry') { const r = AIO.rand(seed); for (let k = 0; k < 5; k++) { const fx = sx + (r() - 0.5) * 50 * s, fy = sy + 10 + ((t * 8 + k * 13 + seed) % 30); ctx.fillStyle = 'rgba(247,182,200,0.8)'; ctx.fillRect(fx, fy, 2, 2); } }
  }
  /** chain-link fence along one tile edge (axis 'x' at y = f.y, axis 'y' at x = f.x) */
  function fence(ctx, f) {
    const H = 22, [a, b] = P(f.x, f.y, 0), [c, d] = f.axis === 'x' ? P(f.x + 1, f.y, 0) : P(f.x, f.y + 1, 0);
    ctx.fillStyle = 'rgba(140,150,160,0.38)'; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(c, d - H); ctx.lineTo(a, b - H); ctx.fill();
    ctx.strokeStyle = 'rgba(90,100,110,0.6)'; ctx.lineWidth = 0.6;
    for (let k = 0; k <= 8; k++) { const fx = a + (c - a) * k / 8, fy = b + (d - b) * k / 8; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + (c - a) / 8, fy + (d - b) / 8 - H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(fx + (c - a) / 8, fy + (d - b) / 8); ctx.lineTo(fx, fy - H); ctx.stroke(); }
    ctx.strokeStyle = '#5d6166'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a, b - H); ctx.lineTo(c, d - H); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a, b - H - 2); ctx.stroke();
  }
  /** smooth strokes in tile space (iso-correct widths): curving paths, round plazas, flower ellipses */
  function tileSpace(g, fn) { g.save(); g.transform(32, 16, -32, 16, 0, 0); fn(g); g.restore(); }
  function curvePath(g, c) {
    tileSpace(g, (q) => {
      const pts = c.pts;
      const draw = () => { q.beginPath(); q.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; q.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); } const l = pts[pts.length - 1]; q.lineTo(l[0], l[1]); };
      q.lineCap = 'round'; q.lineJoin = 'round';
      draw(); q.strokeStyle = c.edge || '#cbbfa8'; q.lineWidth = c.w + 0.18; q.stroke();
      draw(); q.strokeStyle = c.color || '#e6dccb'; q.lineWidth = c.w; q.stroke();
      if (c.dots) { draw(); q.setLineDash([0.12, 0.5]); q.strokeStyle = 'rgba(160,140,110,0.35)'; q.lineWidth = c.w * 0.5; q.stroke(); q.setLineDash([]); }
    });
  }
  function roundPlaza(g, d) {
    tileSpace(g, (q) => {
      q.beginPath(); q.arc(d.cx, d.cy, d.r + 0.15, 0, 7); q.fillStyle = '#cbbfa8'; q.fill();
      q.beginPath(); q.arc(d.cx, d.cy, d.r, 0, 7); q.fillStyle = d.color || '#ece4d4'; q.fill();
      q.lineWidth = 0.06; q.strokeStyle = 'rgba(150,130,100,0.35)';
      for (let rr = d.r - 0.8; rr > 0.5; rr -= 0.8) { q.beginPath(); q.arc(d.cx, d.cy, rr, 0, 7); q.stroke(); }
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; q.beginPath(); q.moveTo(d.cx + Math.cos(a) * 0.6, d.cy + Math.sin(a) * 0.6); q.lineTo(d.cx + Math.cos(a) * d.r, d.cy + Math.sin(a) * d.r); q.stroke(); }
    });
  }
  function flowerEllipse(g, d) {
    const r = AIO.rand(d.seed || 3);
    tileSpace(g, (q) => {
      q.beginPath(); q.ellipse(d.cx, d.cy, d.rx + 0.1, d.ry + 0.1, d.rot || 0, 0, 7); q.fillStyle = '#7a5a3a'; q.fill();
      q.beginPath(); q.ellipse(d.cx, d.cy, d.rx, d.ry, d.rot || 0, 0, 7); q.fillStyle = '#6b8f4e'; q.fill();
      const pal = d.colors || ['#f07a8a', '#f6c445', '#ffffff', '#b38cf0', '#ff9a5a'];
      for (let i = 0; i < d.rx * d.ry * 40; i++) { const a = r() * 6.28, k = Math.sqrt(r()); const px = d.cx + Math.cos(a) * d.rx * k * 0.95, py = d.cy + Math.sin(a) * d.ry * k * 0.95; q.fillStyle = pal[Math.floor(r() * pal.length)]; q.fillRect(px, py, 0.09, 0.09); }
    });
  }
  function lawnPatch(g, d) {
    tileSpace(g, (q) => { q.beginPath(); q.ellipse(d.cx, d.cy, d.rx, d.ry, d.rot || 0, 0, 7); q.fillStyle = d.color || 'rgba(120,180,90,0.35)'; q.fill(); });
  }

  // ------------------------------------------------------------------ terrace: infinity pool + campfire
  function pool(g, d) {
    const { x, y, w } = d, dd = d.d;
    const rect = (x0, y0, ww, hh, c) => poly(g, [P(x0, y0), P(x0 + ww, y0), P(x0 + ww, y0 + hh), P(x0, y0 + hh)], c);
    rect(x - 0.3, y - 0.3, w + 0.6, dd + 0.6, '#f4f1ec');
    for (let i = 0; i <= w + 0.5; i += 0.5) poly(g, [P(x - 0.3 + i, y - 0.3), P(x - 0.3 + i, y + dd + 0.3)], null, 'rgba(0,0,0,0.06)');
    const [ax, ay] = P(x, y), [bx, by] = P(x + w, y + dd);
    const gr = g.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, '#4fc3e8'); gr.addColorStop(1, '#2a8fc6');
    rect(x, y, w, dd, gr);
    g.save(); g.globalAlpha = 0.35; g.strokeStyle = '#ffffff'; g.lineWidth = 1;
    const r = AIO.rand(Math.round(x * 3 + y));
    for (let i = 0; i < w * dd * 1.5; i++) { const [sx, sy] = P(x + r() * w, y + r() * dd); g.beginPath(); g.moveTo(sx - 5, sy); g.quadraticCurveTo(sx, sy - 2, sx + 5, sy); g.stroke(); }
    g.restore();
    for (let i = 0; i < w; i += 1) rect(x + i + 0.1, y + dd / 2 - 0.03, 0.8, 0.06, 'rgba(255,255,255,0.35)');
    // infinity edge glowing on the open (south) side
    rect(x, y + dd - 0.12, w, 0.12, 'rgba(255,255,255,0.7)');
  }
  function firePit(ctx, x, y, t) {
    cylinder(ctx, x, y, 0, 1.0, 6, '#8d959c', '#7d858c', 'rgba(0,0,0,0.2)');
    cylinder(ctx, x, y, 6, 0.75, 0.5, '#3b2f2a', '#3b2f2a');
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4, [sx, sy] = P(x + Math.cos(a) * 0.35, y + Math.sin(a) * 0.35, 7); ctx.strokeStyle = '#6b4a35'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(...P(x, y, 9)); ctx.stroke(); }
    const [fx, fy] = P(x, y, 8);
    for (let k = 0; k < 5; k++) {
      const h = 14 + Math.sin(t * 9 + k * 1.7) * 4 + (k === 2 ? 6 : 0), w = 5 - Math.abs(k - 2);
      const g = ctx.createLinearGradient(fx, fy, fx, fy - h); g.addColorStop(0, '#ff7a1a'); g.addColorStop(0.6, '#ffc23a'); g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(fx - 9 + k * 4.5 - w, fy); ctx.quadraticCurveTo(fx - 9 + k * 4.5 + Math.sin(t * 7 + k) * 2, fy - h * 0.6, fx - 9 + k * 4.5, fy - h); ctx.quadraticCurveTo(fx - 9 + k * 4.5 + w, fy - h * 0.5, fx - 9 + k * 4.5 + w, fy); ctx.fill();
    }
    for (let k = 0; k < 4; k++) { const p = (t * 0.6 + k / 4) % 1; ctx.fillStyle = `rgba(255,200,90,${1 - p})`; ctx.fillRect(fx + Math.sin(k * 3 + t) * 8, fy - 18 - p * 30, 1.6, 1.6); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(fx, fy - 6, 2, fx, fy - 6, 46); gg.addColorStop(0, 'rgba(255,150,60,0.28)'); gg.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = gg; ctx.fillRect(fx - 46, fy - 52, 92, 92); ctx.restore();
  }
  function hammock(ctx, x, y, t) {
    for (const px of [x, x + 2.6]) sbox(ctx, px - 0.06, y - 0.06, 0, 0.12, 0.12, 30, '#8a6247');
    const [a, b] = P(x, y, 24), [c, d] = P(x + 2.6, y, 24);
    const sag = 12 + Math.sin(t * 1.2) * 1.5;
    ctx.fillStyle = '#f2a7c3'; ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2, (b + d) / 2 + sag * 2, c, d); ctx.quadraticCurveTo((a + c) / 2, (b + d) / 2 + sag * 1.4, a, b); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2, (b + d) / 2 + sag * 1.7, c, d); ctx.stroke();
  }

  AIO.art7 = {
    pool, firePit, hammock,
    restroomWall, stall, sinks, blackboard, lectern, deskRow, seatRow, cleanroomTool, drafting, model3d, bookStack, readingTable, bed, washer, treadmill, weightRack,
    toyBlocks, firePole, gearRack, storeShelf, fridgeCase, till, kitchenLine, pizzaOven, breadCase, flowerStand, salonStation, sushiBelt, pcStation, wallSign, menuWall,
    tree2, fence, tileSpace, curvePath, roundPlaza, flowerEllipse, lawnPatch,
  };
})();
