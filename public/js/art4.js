// Interior detail pack: restrooms, phone booths, bean bags, ping-pong, CCTV wall, storage, janitor cart, parcels,
// trophy case, aquarium, art easel, snack bar, piano, conference screen, sculpture.
(function () {
  const { P, shade, poly, box, sbox, cylinder, ellipseFloor, onPlaneY, onPlaneX, roundRect } = AIO.iso;
  const FONT = AIO.art.FONT;

  /** 3×6 restroom: two stalls along the back, sinks + mirror on the side */
  function restroom(ctx, f, t) {
    const { x, y, w, kind } = f;
    const tint = kind === 'm' ? '#cfe0f2' : '#f6d6de';
    // back wall tiles
    onPlaneY(ctx, x, y + 0.02, 64, (g) => {
      g.fillStyle = tint; g.fillRect(0, 0, w * 32, 64);
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 0.6;
      for (let i = 0; i < w * 32; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); }
      for (let j = 0; j < 64; j += 6) { g.beginPath(); g.moveTo(0, j); g.lineTo(w * 32, j); g.stroke(); }
    });
    // stalls (1.4 wide each) with partitions + doors
    for (let k = 0; k < 2; k++) {
      const sx = x + 0.1 + k * 1.45;
      cylinder(ctx, sx + 0.7, y + 0.45, 0, 0.22, 10, '#ffffff', '#e8edf1', 'rgba(0,0,0,0.12)');
      box(ctx, sx + 0.5, y + 0.05, 10, 0.4, 0.2, 12, '#ffffff', '#e8edf1', '#dde3e8');
      box(ctx, sx + 1.38, y, 2, 0.07, 1.6, 50, '#9fb1c2', '#8ea1b3', '#8295a7');
      box(ctx, sx + 0.05, y + 1.55, 2, 1.25, 0.07, 50, kind === 'm' ? '#7fa6cf' : '#e298aa', shade(kind === 'm' ? '#7fa6cf' : '#e298aa', -0.12), shade(kind === 'm' ? '#7fa6cf' : '#e298aa', -0.2));
      const [hx, hy] = P(sx + 1.1, y + 1.62, 26); ctx.fillStyle = Math.sin(t * 0.3 + k * 3) > 0.6 ? '#e5534b' : '#3fb27f'; ctx.fillRect(hx - 1.5, hy - 1.5, 3, 3);
    }
    // sink counter on the east wall
    box(ctx, x + w - 0.6, y + 2.6, 0, 0.55, 2.2, 24, '#f4f1ec', '#e3ded6', '#d6d0c6');
    for (let k = 0; k < 2; k++) { cylinder(ctx, x + w - 0.33, y + 3.1 + k * 1.1, 24, 0.17, 2, '#ffffff', '#eef2f5'); sbox(ctx, x + w - 0.12, y + 3.05 + k * 1.1, 24, 0.05, 0.05, 8, '#b7bec4'); }
    onPlaneX(ctx, x + w - 0.04, y + 4.9, 60, (g) => { g.fillStyle = 'rgba(210,232,245,0.9)'; g.fillRect(0, 0, 66, 22); g.strokeStyle = '#b7bec4'; g.strokeRect(0, 0, 66, 22); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(6, 3, 6, 16); });
  }

  function phoneBooth(ctx, x, y, color, busy) {
    box(ctx, x, y, 0, 1.1, 1.1, 66, shade(color, 0.1), 'rgba(200,225,240,0.35)', shade(color, -0.15), 'rgba(60,70,80,0.4)');
    box(ctx, x - 0.04, y - 0.04, 66, 1.18, 1.18, 5, shade(color, 0.05), shade(color, -0.1), shade(color, -0.2));
    box(ctx, x + 0.2, y + 0.15, 16, 0.7, 0.4, 4, '#c9a676', '#b8955f', '#a8854f');
    const [lx, ly] = P(x + 0.55, y + 1.1, 62); ctx.fillStyle = busy ? '#e5534b' : '#3fb27f'; ctx.beginPath(); ctx.arc(lx, ly, 2, 0, 7); ctx.fill();
    onPlaneY(ctx, x + 0.1, y + 1.1, 70, (g) => { g.fillStyle = '#fff'; g.font = `4px ${FONT}`; g.fillText('📞 집중부스', 3, 3); });
  }

  function beanbag(ctx, x, y, color) {
    ellipseFloor(ctx, x + 0.05, y + 0.08, 0.42, 0.42, 0, 'rgba(60,40,20,0.15)');
    const [sx, sy] = P(x, y, 0);
    ctx.beginPath(); ctx.ellipse(sx, sy - 7, 15, 10, 0, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(sx - 4, sy - 12, 2, sx, sy - 7, 16); g.addColorStop(0, shade(color, 0.25)); g.addColorStop(1, shade(color, -0.12));
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx + 2, sy - 12, 7, 4, 0, 0, Math.PI * 2); ctx.fillStyle = shade(color, -0.2); ctx.fill();
  }

  function pingPong(ctx, f, t) {
    const { x, y } = f, w = 2.6, d = 1.4;
    for (const [lx, ly] of [[0.2, 0.2], [w - 0.3, 0.2], [0.2, d - 0.3], [w - 0.3, d - 0.3]]) sbox(ctx, x + lx, y + ly, 0, 0.08, 0.08, 20, '#4f5459');
    box(ctx, x, y, 20, w, d, 2, '#2f7d4f', '#276a43', '#205a38', 'rgba(0,0,0,0.2)');
    poly(ctx, [P(x + 0.05, y + d / 2 - 0.02, 22.1), P(x + w - 0.05, y + d / 2 - 0.02, 22.1), P(x + w - 0.05, y + d / 2 + 0.02, 22.1), P(x + 0.05, y + d / 2 + 0.02, 22.1)], '#ffffff');
    poly(ctx, [P(x + w / 2 - 0.02, y, 22.1), P(x + w / 2 + 0.02, y, 22.1), P(x + w / 2 + 0.02, y + d, 22.1), P(x + w / 2 - 0.02, y + d, 22.1)], '#ffffff');
    box(ctx, x + w / 2 - 0.03, y - 0.05, 22, 0.06, d + 0.1, 5, 'rgba(255,255,255,0.7)', 'rgba(230,230,230,0.6)', 'rgba(210,210,210,0.6)');
    const k = (Math.sin(t * 3) + 1) / 2;
    const [bx, by] = P(x + 0.3 + k * (w - 0.6), y + d / 2 + Math.sin(t * 7) * 0.25, 30 + Math.abs(Math.sin(t * 6)) * 10);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, 7); ctx.fill();
  }

  function cctvWall(ctx, f, t) {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.6, 24, '#5f6b77', '#4f5a65', '#434d57');
    onPlaneY(ctx, x, y + 0.04, 82, (g) => {
      g.fillStyle = '#23282e'; g.fillRect(0, 0, w * 32, 54);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        const sx = 3 + i * (w * 32 - 6) / 3, sy = 3 + j * 25, sw = (w * 32 - 6) / 3 - 3, sh = 22;
        const gr = g.createLinearGradient(sx, sy, sx + sw, sy + sh); gr.addColorStop(0, '#3a4d5c'); gr.addColorStop(1, '#22313c'); g.fillStyle = gr; g.fillRect(sx, sy, sw, sh);
        g.fillStyle = 'rgba(160,200,170,0.35)'; g.fillRect(sx + 2, sy + sh - 6, sw - 4, 2);
        const px = sx + 4 + ((t * 6 + i * 13 + j * 7) % (sw - 8)); g.fillStyle = '#9fd3a8'; g.fillRect(px, sy + 8, 2, 4);
        g.fillStyle = '#e5534b'; if (Math.sin(t * 4 + i + j) > 0) g.fillRect(sx + sw - 4, sy + 2, 2, 2);
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = `3px ${FONT}`; g.fillText(['로비', '정문', '카페', '주차장', '옥상', '공장'][i + j * 3], sx + 2, sy + 5);
      }
    });
  }

  function storageShelf(ctx, x, y, w, seed) {
    const r = AIO.rand(seed);
    for (const lx of [0, w - 0.08]) sbox(ctx, x + lx, y, 0, 0.08, 0.7, 60, '#7d858c');
    for (const z of [2, 22, 42]) {
      box(ctx, x, y, z, w, 0.7, 2, '#b8bec4', '#a5abb1', '#989ea4');
      for (let k = 0.1; k < w - 0.4; k += 0.55) if (r() < 0.8) box(ctx, x + k, y + 0.08, z + 2, 0.48, 0.55, 8 + r() * 8, '#d6a96b', '#c4935a', '#b2824c', 'rgba(90,60,30,0.25)');
    }
  }

  function janitorCart(ctx, x, y) {
    box(ctx, x, y, 4, 0.9, 0.5, 14, '#f2c230', '#d9ad25', '#c79e20', 'rgba(0,0,0,0.2)');
    cylinder(ctx, x + 0.25, y + 0.25, 18, 0.18, 8, '#4e9cf6', '#3b82d6');
    sbox(ctx, x + 0.75, y + 0.2, 18, 0.04, 0.04, 30, '#8a6a45');
    for (const [wx, wy] of [[0.1, 0.5], [0.8, 0.5]]) { const [sx, sy] = P(x + wx, y + wy, 2); ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, 7); ctx.fill(); }
  }

  function parcelShelf(ctx, x, y, w, seed) {
    storageShelf(ctx, x, y, w, seed);
    onPlaneY(ctx, x, y + 0.7, 64, (g) => { g.fillStyle = '#2f7d4f'; g.fillRect(2, 0, 44, 8); g.fillStyle = '#fff'; g.font = `5px ${FONT}`; g.fillText('📦 택배 보관', 4, 6); });
  }

  function trophyCase(ctx, x, y, w) {
    box(ctx, x, y, 0, w, 0.5, 58, 'rgba(220,240,250,0.4)', 'rgba(205,228,240,0.35)', 'rgba(190,215,232,0.4)', 'rgba(110,90,60,0.6)');
    box(ctx, x, y, 0, w, 0.5, 8, '#6b4a35', '#5a3d2b', '#4c3324');
    for (let k = 0; k < Math.floor(w * 2); k++) {
      const [sx, sy] = P(x + 0.25 + k * 0.5, y + 0.25, 30 + (k % 2) * 18);
      ctx.fillStyle = k % 3 === 0 ? '#f6c445' : k % 3 === 1 ? '#c9cdd2' : '#d9a066';
      ctx.beginPath(); ctx.moveTo(sx - 3, sy - 8); ctx.lineTo(sx + 3, sy - 8); ctx.lineTo(sx + 1.5, sy - 2); ctx.lineTo(sx - 1.5, sy - 2); ctx.fill(); ctx.fillRect(sx - 0.8, sy - 2, 1.6, 3); ctx.fillRect(sx - 2.5, sy + 1, 5, 1.5);
    }
  }

  function aquarium(ctx, x, y, w, t) {
    box(ctx, x, y, 0, w, 0.6, 18, '#3b332b', '#2e2722', '#25201b');
    box(ctx, x, y, 18, w, 0.6, 26, 'rgba(120,190,230,0.5)', 'rgba(110,180,225,0.55)', 'rgba(90,160,210,0.55)', 'rgba(60,80,100,0.5)');
    for (let k = 0; k < 4; k++) {
      const fx = x + 0.2 + ((t * (0.2 + k * 0.05) + k * 0.3) % 1) * (w - 0.4), [sx, sy] = P(fx, y + 0.6, 24 + k * 4 + Math.sin(t * 2 + k) * 2);
      ctx.fillStyle = ['#ff8a3d', '#f2c230', '#e2667f', '#4e9cf6'][k]; ctx.beginPath(); ctx.ellipse(sx, sy, 3, 1.8, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx - 3, sy); ctx.lineTo(sx - 5.5, sy - 2); ctx.lineTo(sx - 5.5, sy + 2); ctx.fill();
    }
    for (let k = 0; k < 3; k++) { const [sx, sy] = P(x + 0.4 + k * (w - 0.8) / 2, y + 0.3, 19); ctx.strokeStyle = '#3f8a45'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + Math.sin(t + k) * 3, sy - 10, sx, sy - 18); ctx.stroke(); }
  }

  function canvasEasel(ctx, x, y, seed) {
    const [bx, by] = P(x, y, 0);
    ctx.strokeStyle = '#a07a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 9, by); ctx.lineTo(bx - 3, by - 44); ctx.moveTo(bx + 9, by); ctx.lineTo(bx + 3, by - 44); ctx.stroke();
    onPlaneY(ctx, x - 0.5, y, 50, (g) => {
      g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 32, 26);
      const r = AIO.rand(seed); const c = ['#e2667f', '#4e7cf6', '#f2c230', '#3fb27f', '#a67be0'];
      for (let k = 0; k < 6; k++) { g.fillStyle = c[Math.floor(r() * c.length)]; g.beginPath(); g.arc(4 + r() * 24, 4 + r() * 18, 2 + r() * 5, 0, 7); g.fill(); }
    });
  }

  function snackBar(ctx, x, y, w) {
    box(ctx, x, y, 0, w, 0.7, 26, '#f4f1ec', '#e3ded6', '#d6d0c6', 'rgba(0,0,0,0.1)');
    const c = ['#e2667f', '#f2c230', '#3fb27f', '#d9a066', '#4e7cf6'];
    for (let k = 0; k < w * 3; k++) { const [sx, sy] = P(x + 0.2 + k * 0.32, y + 0.35, 28); ctx.fillStyle = c[k % c.length]; ctx.beginPath(); ctx.ellipse(sx, sy - 2, 3, 3.5, 0, 0, 7); ctx.fill(); }
    onPlaneY(ctx, x + 0.2, y + 0.7, 22, (g) => { g.fillStyle = '#3b332b'; g.font = `6px ${FONT}`; g.fillText('🍪 스낵바 · 무료', 4, 10); });
  }

  function piano(ctx, x, y) {
    box(ctx, x, y, 0, 1.6, 0.7, 34, '#1d1d1f', '#141416', '#0d0d0f', 'rgba(0,0,0,0.3)');
    box(ctx, x, y + 0.45, 22, 1.6, 0.3, 3, '#ffffff', '#e8e8e8', '#dddddd');
    for (let k = 0; k < 9; k++) { const [sx, sy] = P(x + 0.1 + k * 0.17, y + 0.6, 25.2); ctx.fillStyle = '#111'; ctx.fillRect(sx - 0.8, sy - 1.5, 1.6, 2.6); }
  }

  function bigScreen(ctx, x, y, w, lines, t) {
    box(ctx, x, y, 30, w, 0.08, 56, '#1d2024', '#16181b', '#111316');
    onPlaneY(ctx, x + 0.1, y + 0.08, 84, (g) => {
      const W = (w - 0.2) * 32;
      const gr = g.createLinearGradient(0, 0, W, 52); gr.addColorStop(0, '#20304d'); gr.addColorStop(1, '#2f5a6e');
      g.fillStyle = gr; g.fillRect(1.5, 1.5, W - 3, 50);
      g.fillStyle = '#f6d58a'; g.font = `6px ${FONT}`; g.fillText('📈 AI 인공지능 연구원 현황', 5, 10);
      g.fillStyle = '#e9eef5'; g.font = `4.5px ${FONT}`; lines.forEach((l, i) => g.fillText(l, 5, 19 + i * 7));
      for (let i = 0; i < 12; i++) { const h = 6 + 20 * Math.abs(Math.sin(i * 1.3 + t * 0.3)); g.fillStyle = i % 2 ? '#6ec1a6' : '#f0a27f'; g.fillRect(W - 50 + i * 3.8, 46 - h, 2.6, h); }
    });
  }

  function sculpture(ctx, x, y, t) {
    box(ctx, x - 0.3, y - 0.3, 0, 0.6, 0.6, 18, '#efe9df', '#ddd5c9', '#cfc6b8');
    const [sx, sy] = P(x, y, 18);
    ctx.save(); ctx.translate(sx, sy - 16); ctx.rotate(t * 0.3);
    ctx.strokeStyle = '#d97757'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 12, 7, 0.4, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#4e7cf6'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 12, -0.4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function hutShell(ctx, f) {
    // elevator penthouse on the roof: back wall + roof slab with a sign (front wall is real wall segments)
    const { x, y, w, d } = f;
    poly(ctx, [P(x, y, 0), P(x + w, y, 0), P(x + w, y, 82), P(x, y, 82)], '#ddd6ca');
    box(ctx, x - 0.1, y - 0.1, 82, w + 0.2, d + 0.2, 6, '#cfc8bc', '#bfb8ab', '#b2ab9e', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x + w / 2 - 1.2, y + d + 0.1, 88, (g) => { g.fillStyle = '#3b332b'; roundRect(g, 0, 0, 76, 12, 3); g.fill(); g.fillStyle = '#f6d58a'; g.font = `6px ${FONT}`; g.fillText('🛗 엘리베이터 · R', 6, 8.5); });
  }

  AIO.art4 = { restroom, phoneBooth, beanbag, pingPong, cctvWall, storageShelf, janitorCart, parcelShelf, trophyCase, aquarium, canvasEasel, snackBar, piano, bigScreen, sculpture, hutShell };
})();
