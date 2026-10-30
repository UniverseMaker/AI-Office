// Outdoor pack: road furniture (traffic lights, bus stop, bus, trucks, gate), food trucks + outdoor cafe, playground,
// garden pieces (flower bushes, hedges, pergola, gazebo, pond, bridge, deck chairs, greenhouse, string lights),
// extra buildings (Apple-Park-like ring, logistics warehouse, daycare) and flat ground decals for the static caches.
(function () {
  const { P, shade, rgba, poly, box, sbox, cylinder, ellipseFloor, onPlaneY, onPlaneX, roundRect } = AIO.iso;
  const A = AIO.art, A2 = AIO.art2, A3 = AIO.art3;
  const FONT = A.FONT;
  const FLOWER = ['#f07a8a', '#f6c445', '#ffffff', '#b38cf0', '#ff9a5a', '#f2a7c3', '#7ab8f5'];
  const rect = (g, x, y, w, d, c, z = 0) => poly(g, [P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], c);
  const dot = (g, x, y, z, r, c) => { const [sx, sy] = P(x, y, z); g.fillStyle = c; g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill(); };

  // ------------------------------------------------------------------ flat decals (drawn into static caches)
  function decal(g, d) {
    const r = AIO.rand(d.seed || Math.round(d.x * 7 + d.y * 13));
    switch (d.type) {
      case 'flowers': {
        rect(g, d.x, d.y, d.w, d.d, '#7a5a3a');
        rect(g, d.x + 0.06, d.y + 0.06, d.w - 0.12, d.d - 0.12, '#6b8f4e');
        const pal = d.colors || FLOWER;
        const n = Math.round(d.w * d.d * 14);
        for (let i = 0; i < n; i++) { const fx = d.x + 0.12 + r() * (d.w - 0.24), fy = d.y + 0.12 + r() * (d.d - 0.24); dot(g, fx, fy, 0, 1.2 + r() * 1.3, pal[Math.floor(r() * pal.length)]); }
        for (let i = 0; i < n / 3; i++) dot(g, d.x + 0.12 + r() * (d.w - 0.24), d.y + 0.12 + r() * (d.d - 0.24), 0, 1.1, '#4f8a3e');
        break;
      }
      case 'meadow': {
        const n = Math.round(d.w * d.d * 5);
        for (let i = 0; i < n; i++) dot(g, d.x + r() * d.w, d.y + r() * d.d, 0, 0.9 + r() * 0.8, r() < 0.5 ? '#ffffff' : FLOWER[Math.floor(r() * FLOWER.length)]);
        break;
      }
      case 'pond': {
        ellipseFloor(g, d.cx, d.cy, d.rx + 0.25, d.ry + 0.25, 0, '#c9bfae');
        ellipseFloor(g, d.cx, d.cy, d.rx, d.ry, 0, '#5aa7cf');
        ellipseFloor(g, d.cx - d.rx * 0.15, d.cy - d.ry * 0.15, d.rx * 0.75, d.ry * 0.7, 0, '#76bde0');
        for (let i = 0; i < Math.round(d.rx * d.ry); i++) {
          const a = r() * 6.28, k = 0.35 + r() * 0.5;
          const [sx, sy] = P(d.cx + Math.cos(a) * d.rx * k, d.cy + Math.sin(a) * d.ry * k, 0);
          g.fillStyle = '#5c9a4a'; g.beginPath(); g.ellipse(sx, sy, 5, 2.6, 0, 0.3, 6.0); g.lineTo(sx, sy); g.fill();
          if (r() < 0.4) { g.fillStyle = '#f7b6c8'; g.beginPath(); g.arc(sx + 1, sy - 1, 1.6, 0, 7); g.fill(); }
        }
        break;
      }
      case 'sand': rect(g, d.x, d.y, d.w, d.d, '#d9c39a'); rect(g, d.x + 0.1, d.y + 0.1, d.w - 0.2, d.d - 0.2, '#ead7ad'); for (let i = 0; i < d.w * d.d * 3; i++) dot(g, d.x + r() * d.w, d.y + r() * d.d, 0, 0.7, '#cdb48a'); break;
      case 'rubber': rect(g, d.x, d.y, d.w, d.d, '#e58a6c'); rect(g, d.x + 0.1, d.y + 0.1, d.w - 0.2, d.d - 0.2, '#ef9f7f'); break;
      case 'mat': {
        rect(g, d.x, d.y, d.w, d.d, d.color || '#e5534b');
        g.save(); g.globalAlpha = 0.85;
        for (let i = 0; i < d.w; i += 0.5) rect(g, d.x + i, d.y, 0.25, d.d, '#ffffff');
        for (let j = 0; j < d.d; j += 0.5) rect(g, d.x, d.y + j, d.w, 0.25, 'rgba(255,255,255,0.55)');
        g.restore();
        break;
      }
      case 'parking': {
        rect(g, d.x, d.y, d.w, d.d, '#6a6e73');
        for (let i = 0; i <= d.n; i++) rect(g, d.x + i * (d.w / d.n) - 0.04, d.y + 0.15, 0.08, d.d / 2 - 0.4, '#f4f2ee');
        for (let i = 0; i <= d.n; i++) rect(g, d.x + i * (d.w / d.n) - 0.04, d.y + d.d / 2 + 0.25, 0.08, d.d / 2 - 0.4, '#f4f2ee');
        rect(g, d.x, d.y + d.d / 2 - 0.04, d.w, 0.08, '#f2c230');
        break;
      }
      case 'asphalt': rect(g, d.x, d.y, d.w, d.d, '#5f6368'); break;
      case 'ringPath': {
        const [sx, sy] = P(d.cx, d.cy, 0);
        g.save(); g.translate(sx, sy); g.scale(1, 0.5);
        g.beginPath(); g.arc(0, 0, d.R * 45.25, 0, 7); g.arc(0, 0, (d.R - d.w) * 45.25, 0, 7, true); g.fillStyle = '#e5dccb'; g.fill('evenodd');
        g.restore();
        break;
      }
      case 'helipad': {
        ellipseFloor(g, d.x + d.w / 2, d.y + d.d / 2, d.w / 2, d.d / 2, 0, '#5f6368');
        ellipseFloor(g, d.x + d.w / 2, d.y + d.d / 2, d.w / 2 - 0.3, d.d / 2 - 0.3, 0, null, '#f2c230');
        break;
      }
      case 'deckPath': { rect(g, d.x, d.y, d.w, d.d, '#b98c5e'); for (let i = 0; i < (d.w > d.d ? d.w : d.d); i += 0.5) d.w > d.d ? rect(g, d.x + i, d.y, 0.03, d.d, 'rgba(0,0,0,0.15)') : rect(g, d.x, d.y + i, d.w, 0.03, 'rgba(0,0,0,0.15)'); break; }
      case 'stones': for (let i = 0; i < d.n; i++) { const [sx, sy] = P(d.x + (d.dx || 0) * i, d.y + (d.dy || 0) * i, 0); g.fillStyle = '#d9d3c8'; g.beginPath(); g.ellipse(sx, sy, 9, 4.5, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.12)'; g.stroke(); } break;
      default: { const X = AIO.decals && AIO.decals[d.type]; if (X) X(g, d, r); break; }   // 플러그인 바닥 데칼 (props.js)
    }
  }

  // ------------------------------------------------------------------ road furniture
  /** Korean-style horizontal 3-light car signal + pedestrian signal on one pole. state: 'g'|'y'|'r' for cars */
  function trafficLight(ctx, x, y, state, t, side) {
    ellipseFloor(ctx, x, y, 0.15, 0.15, 0, '#6d7175');
    sbox(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, 82, '#5d6166');
    // arm over the road
    const ax = side > 0 ? 0 : 0, ay = side > 0 ? -1.4 : 1.4;
    const [px, py] = P(x, y, 80), [qx, qy] = P(x + ax, y + ay, 80);
    ctx.strokeStyle = '#5d6166'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke();
    const hx = x + ax, hy = y + ay;
    box(ctx, hx - 0.55, hy - 0.08, 74, 1.1, 0.16, 10, '#2f3338', '#25292d', '#1e2125');
    const on = { r: 0, y: 1, g: 2 }[state];
    ['#e5534b', '#f2c230', '#3fb27f'].forEach((c, i) => {
      const [sx, sy] = P(hx - 0.35 + i * 0.35, hy + 0.08, 79);
      ctx.fillStyle = i === on ? c : shade(c, -0.65); ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, 7); ctx.fill();
      if (i === on) { ctx.fillStyle = rgba(c, 0.25); ctx.beginPath(); ctx.arc(sx, sy, 6, 0, 7); ctx.fill(); }
    });
    // pedestrian head on the pole (green when cars are red)
    box(ctx, x - 0.18, y + 0.05, 40, 0.36, 0.12, 18, '#2f3338', '#25292d', '#1e2125');
    const walk = state === 'r';
    const blink = walk && Math.sin(t * 8) < -0.2 && (t % 12) > 9;
    onPlaneY(ctx, x - 0.16, y + 0.17, 57, (g) => {
      g.fillStyle = walk ? (blink ? '#16301f' : '#3fdc7f') : '#3a1715'; g.fillRect(1, 1, 10, 7);
      g.fillStyle = !walk ? '#ff5a4f' : '#1b1b1b'; g.fillRect(1, 9, 10, 7);
      g.fillStyle = '#111'; g.font = `5px ${FONT}`; g.fillText('🚶', 3, 7); g.fillText('🧍', 3, 15);
    });
  }

  function stopLine(g, x, y0, y1) { rect(g, x, y0, 0.12, y1 - y0, '#f4f2ee'); }

  function bus(ctx, x, y, dir, t, door) {
    const L = 4.4, Wd = 1.15, c = '#2f9e5f';
    ellipseFloor(ctx, x + L / 2, y + Wd / 2, L / 2 + 0.1, 0.65, 0, 'rgba(0,0,0,0.2)');
    box(ctx, x, y, 3, L, Wd, 30, shade(c, 0.1), c, shade(c, -0.2), 'rgba(0,0,0,0.25)');
    box(ctx, x + 0.05, y + 0.05, 33, L - 0.1, Wd - 0.1, 2, '#f4f2ee', '#e3ded6', '#d6d0c6');
    onPlaneY(ctx, x, y + Wd, 31, (g) => {
      const Wl = L * 32;
      g.fillStyle = '#cfe6f2'; for (let i = 0; i < 6; i++) g.fillRect(8 + i * 21, 4, 17, 11);
      g.fillStyle = '#f2c230'; g.fillRect(0, 17, Wl, 3);
      g.fillStyle = '#fff'; g.font = `bold 6px ${FONT}`; g.fillText('🚌 7  AI 캠퍼스 순환', 10, 26);
      const dx = dir > 0 ? Wl - 28 : 8;
      g.fillStyle = door ? '#3b3f45' : '#9cc9de'; g.fillRect(dx, 4, 16, 24);
      g.strokeStyle = '#1f6a3f'; g.strokeRect(dx, 4, 16, 24);
    });
    onPlaneX(ctx, dir > 0 ? x + L : x, y + Wd, 31, (g) => { g.fillStyle = '#cfe6f2'; g.fillRect(2, 3, Wd * 32 - 4, 14); g.fillStyle = '#1d2024'; g.fillRect(4, 19, Wd * 32 - 8, 5); g.fillStyle = '#ffb347'; g.font = `4px ${FONT}`; g.fillText('7 순환', 6, 23); });
    for (const wx of [0.6, L - 0.7]) { const [sx, sy] = P(x + wx, y + Wd, 3); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(sx, sy, 4.4, 4.4, 0, 0, 7); ctx.fill(); }
  }

  /** box truck. axis 'x': footprint x..x+4.2, y..y+1.2, cab at +x end when dir>0. axis 'y': along y, cab at +y end when dir>0 */
  function truck(ctx, x, y, axis, dir, color, opt = {}) {
    const L = 4.2, Wd = 1.2, cabL = 1.15;
    const ax = axis === 'x';
    const fw = ax ? L : Wd, fd = ax ? Wd : L;
    ellipseFloor(ctx, x + fw / 2, y + fd / 2, fw / 2 + 0.1, fd / 2 + 0.1, 0, 'rgba(0,0,0,0.2)');
    // container + cab
    const cont = ax ? { x: dir > 0 ? x : x + cabL, y, w: L - cabL, d: Wd } : { x, y: dir > 0 ? y : y + cabL, w: Wd, d: L - cabL };
    const cab = ax ? { x: dir > 0 ? x + L - cabL : x, y: y + 0.05, w: cabL, d: Wd - 0.1 } : { x: x + 0.05, y: dir > 0 ? y + L - cabL : y, w: Wd - 0.1, d: cabL };
    const drawCont = () => {
      box(ctx, cont.x, cont.y, 4, cont.w, cont.d, 36, '#f4f2ee', '#e3ded6', '#d6d0c6', 'rgba(0,0,0,0.2)');
      const label = (g, len) => { g.fillStyle = color; g.fillRect(4, 8, len * 32 - 8, 7); g.fillStyle = '#fff'; g.font = `bold 6px ${FONT}`; g.fillText(opt.label || 'AI 물류', 8, 14); };
      if (ax) onPlaneY(ctx, cont.x, cont.y + cont.d, 40, (g) => label(g, cont.w));
      else onPlaneX(ctx, cont.x + cont.w, cont.y + cont.d, 40, (g) => label(g, cont.d));
      if (opt.open) { // rear doors open toward the dock
        const back = ax ? (dir > 0 ? P(cont.x, cont.y + cont.d, 38) : null) : null;
        if (back) { ctx.fillStyle = '#2b2b2b'; }
      }
    };
    const drawCab = () => {
      box(ctx, cab.x, cab.y, 3, cab.w, cab.d, 26, shade(color, 0.1), shade(color, -0.08), shade(color, -0.2), 'rgba(0,0,0,0.2)');
      const ws = ax ? { x: dir > 0 ? cab.x + cab.w : cab.x, y0: cab.y + cab.d } : null;
      if (ax && dir > 0) onPlaneX(ctx, cab.x + cab.w, cab.y + cab.d, 26, (g) => { g.fillStyle = '#cfe6f2'; g.fillRect(3, 2, cab.d * 32 - 6, 10); g.fillStyle = '#fff6c9'; g.fillRect(2, 18, 4, 3); g.fillRect(cab.d * 32 - 6, 18, 4, 3); });
      if (!ax && dir > 0) onPlaneY(ctx, cab.x, cab.y + cab.d, 26, (g) => { g.fillStyle = '#cfe6f2'; g.fillRect(3, 2, cab.w * 32 - 6, 10); g.fillStyle = '#fff6c9'; g.fillRect(2, 18, 4, 3); g.fillRect(cab.w * 32 - 6, 18, 4, 3); });
      if (ax) onPlaneY(ctx, cab.x, cab.y + cab.d, 24, (g) => { g.fillStyle = '#cfe6f2'; g.fillRect(dir > 0 ? cab.w * 32 - 18 : 4, 2, 14, 9); });
      else onPlaneX(ctx, cab.x + cab.w, cab.y + cab.d, 24, (g) => { g.fillStyle = '#cfe6f2'; g.fillRect(dir > 0 ? 4 : cab.d * 32 - 18, 2, 14, 9); });
      void ws;
    };
    // draw whichever part is further back first
    const cabBack = ax ? dir < 0 : dir < 0;
    if (cabBack) { drawCab(); drawCont(); } else { drawCont(); drawCab(); }
    const wheels = ax ? [[0.6, Wd], [L - 0.6, Wd], [L - 1.6, Wd]] : [[Wd, 0.6], [Wd, L - 0.6], [Wd, L - 1.6]];
    for (const [wx, wy] of wheels) { const [sx, sy] = P(x + wx, y + wy, 3); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(sx, sy, 3.8, 3.8, 0, 0, 7); ctx.fill(); }
    if (opt.blink) { const [sx, sy] = P(cont.x + (ax ? 0 : cont.w / 2), cont.y + (ax ? cont.d / 2 : 0), 36); ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(sx, sy, 2, 0, 7); ctx.fill(); }
  }

  function busStop(ctx, x, y, t, arriving) {
    // shelter: 3.4 wide along x, open to the north (road side); glass back on the south + side panels
    const w = 3.4;
    ellipseFloor(ctx, x + w / 2, y + 0.6, w / 2 + 0.2, 0.7, 0, 'rgba(0,0,0,0.1)');
    for (const px of [x, x + w - 0.1]) sbox(ctx, px, y + 0.05, 0, 0.1, 0.1, 50, '#4f5a65');
    for (const px of [x, x + w - 0.1]) sbox(ctx, px, y + 1.05, 0, 0.1, 0.1, 50, '#4f5a65');
    box(ctx, x + 0.1, y + 1.1, 4, w - 0.2, 0.04, 44, 'rgba(200,228,240,0.35)', 'rgba(200,228,240,0.35)', 'rgba(180,210,225,0.35)', 'rgba(90,110,130,0.55)');
    box(ctx, x - 0.02, y + 0.15, 4, 0.04, 0.9, 44, 'rgba(200,228,240,0.35)', 'rgba(200,228,240,0.35)', 'rgba(180,210,225,0.35)', 'rgba(90,110,130,0.55)');
    // route map + ad lightbox on the back glass
    onPlaneY(ctx, x + 0.3, y + 1.08, 44, (g) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 2, 26, 30); g.strokeStyle = '#2f7d4f'; g.strokeRect(0, 2, 26, 30);
      g.strokeStyle = '#2f9e5f'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(3, 26); g.lineTo(9, 12); g.lineTo(16, 20); g.lineTo(23, 6); g.stroke();
      g.fillStyle = '#e5534b'; g.beginPath(); g.arc(16, 20, 1.6, 0, 7); g.fill();
      g.fillStyle = '#3b332b'; g.font = `3.4px ${FONT}`; g.fillText('노선도', 3, 6.5);
      const gr = g.createLinearGradient(32, 0, 70, 30); gr.addColorStop(0, '#f6d58a'); gr.addColorStop(1, '#d97757');
      g.fillStyle = gr; g.fillRect(32, 2, 40, 30);
      g.fillStyle = '#fff'; g.font = `bold 5px ${FONT}`; g.fillText('AI CAMPUS', 36, 12); g.font = `3.6px ${FONT}`; g.fillText('🧶 함께 일하는 AI들', 36, 19); g.fillText('오늘도 출근 완료!', 36, 25);
    });
    // roof with LED arrival board under it
    box(ctx, x - 0.15, y - 0.1, 50, w + 0.3, 1.35, 3, '#2f7d4f', '#276a43', '#205a38', 'rgba(0,0,0,0.2)');
    onPlaneY(ctx, x + 0.9, y + 0.6, 49, (g) => {
      g.fillStyle = '#16181b'; g.fillRect(0, 0, 50, 8);
      g.fillStyle = '#ffb347'; g.font = `4.4px ${FONT}`;
      g.fillText(arriving ? '🚌 7 순환  곧 도착' : `🚌 7 순환  ${1 + Math.floor((t / 20) % 5)}분`, 2, 6);
    });
    A2.bench(ctx, x + 0.5, y + 0.55, 2.2, '#c9a676');
    // sign pole + bin
    const sx = x + w + 0.5, sy = y + 0.2;
    sbox(ctx, sx, sy, 0, 0.08, 0.08, 66, '#5d6166');
    onPlaneY(ctx, sx - 0.35, sy + 0.08, 76, (g) => { g.fillStyle = '#2f9e5f'; g.beginPath(); g.arc(12, 6, 6, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `6px ${FONT}`; g.fillText('🚌', 8.5, 8.5); g.fillStyle = '#ffffff'; g.fillRect(2, 13, 20, 7); g.fillStyle = '#2f7d4f'; g.font = `3.4px ${FONT}`; g.fillText('AI캠퍼스앞', 3, 18); });
    cylinder(ctx, x - 0.5, y + 0.8, 0, 0.18, 14, '#5d6166', '#7d858c');
  }

  function gateBooth(ctx, x, y) {
    box(ctx, x, y, 0, 1.3, 1.3, 40, '#e9e4dc', '#d6cfc3', '#c9c1b4', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x + 0.1, y + 1.3, 34, (g) => { g.fillStyle = '#cfe6f2'; g.fillRect(2, 2, 34, 14); });
    onPlaneX(ctx, x + 1.3, y + 1.2, 34, (g) => { g.fillStyle = '#cfe6f2'; g.fillRect(2, 2, 30, 14); });
    box(ctx, x - 0.15, y - 0.15, 40, 1.6, 1.6, 4, '#3f74b8', '#335f97', '#2a4f7e');
    onPlaneY(ctx, x, y + 1.45, 44, (g) => { g.fillStyle = '#fff'; g.font = `4px ${FONT}`; g.fillText('🚧 출입통제', 4, -1); });
  }
  /** barrier arm along x from (x,y); open 0..1 lifts it */
  function barrier(ctx, x, y, len, open) {
    box(ctx, x - 0.2, y - 0.2, 0, 0.4, 0.4, 18, '#f2c230', '#d9a91a', '#c39714');
    const a = open * 1.35;
    const [sx, sy] = P(x, y, 16);
    const [ex0, ey0] = P(x + len, y, 16);
    const dx = ex0 - sx, dy = ey0 - sy;
    const ex = sx + dx * Math.cos(a), ey = sy + dy * Math.cos(a) - Math.hypot(dx, dy) * Math.sin(a);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = '#e5534b'; ctx.lineWidth = 3.4; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
  }
  function container(ctx, x, y, z, color, label) {
    box(ctx, x, y, z, 3, 1.2, 30, shade(color, 0.08), shade(color, -0.08), shade(color, -0.2), 'rgba(0,0,0,0.25)');
    onPlaneY(ctx, x, y + 1.2, z + 30, (g) => { g.strokeStyle = 'rgba(0,0,0,0.18)'; for (let i = 3; i < 96; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 30); g.stroke(); } if (label) { g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `bold 6px ${FONT}`; g.fillText(label, 8, 18); } });
  }

  // ------------------------------------------------------------------ food / cafe
  const FT = {
    taco: { c: '#e9a23b', name: '🌮 타코', menu: ['타코 3K', '부리토 5K'] },
    icecream: { c: '#f2a7c3', name: '🍦 아이스크림', menu: ['소프트콘 2K', '파르페 4K'] },
    coffee: { c: '#7a4a2a', name: '☕ 커피트럭', menu: ['라떼 3K', '콜드브루 3K'] },
    burger: { c: '#e5534b', name: '🍔 버거', menu: ['치즈버거 6K', '감튀 3K'] },
    tteok: { c: '#d94f6a', name: '🍢 떡볶이', menu: ['떡볶이 4K', '어묵 1K'] },
  };
  /** food truck along x (4 long), serving window on the +y (south) side facing the plaza */
  function foodTruck(ctx, x, y, kind, t) {
    const k = FT[kind] || FT.taco, L = 4, Wd = 1.4;
    ellipseFloor(ctx, x + L / 2, y + Wd / 2, L / 2 + 0.2, 0.8, 0, 'rgba(0,0,0,0.2)');
    box(ctx, x, y, 4, L - 1, Wd, 40, '#f7f4ee', shade(k.c, 0.15), shade(k.c, -0.05), 'rgba(0,0,0,0.2)');
    box(ctx, x + L - 1, y + 0.1, 4, 1, Wd - 0.2, 28, shade(k.c, 0.1), k.c, shade(k.c, -0.15), 'rgba(0,0,0,0.2)');
    onPlaneX(ctx, x + L, y + Wd - 0.1, 30, (g) => { g.fillStyle = '#cfe6f2'; g.fillRect(3, 2, 30, 10); });
    onPlaneY(ctx, x, y + Wd, 42, (g) => {
      // serving hatch with a vendor inside
      g.fillStyle = '#2b2622'; g.fillRect(8, 12, 60, 16);
      g.fillStyle = '#f1e3c8'; g.beginPath(); g.arc(38, 22, 6, 0, 7); g.fill();
      g.fillStyle = '#3b332b'; g.fillRect(35, 20, 1.4, 1.4); g.fillRect(40, 20, 1.4, 1.4);
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(38, 15, 6.5, 3, 0, 0, 7); g.fill();
      g.fillStyle = '#e9e4da'; g.fillRect(6, 27, 64, 3);
      g.fillStyle = '#fff'; g.fillRect(10, 2, 56, 8); g.fillStyle = k.c; g.font = `bold 6px ${FONT}`; g.fillText(k.name, 13, 8.4);
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = `3.6px ${FONT}`; k.menu.forEach((m, i) => g.fillText(m, 72, 16 + i * 6));
    });
    // striped awning over the hatch
    const [a0x, a0y] = P(x + 0.2, y + Wd, 31), [a1x, a1y] = P(x + 2.6, y + Wd, 31), [a2x, a2y] = P(x + 2.6, y + Wd + 0.55, 26), [a3x, a3y] = P(x + 0.2, y + Wd + 0.55, 26);
    for (let i = 0; i < 6; i++) {
      const f0 = i / 6, f1 = (i + 1) / 6;
      const L0 = [a0x + (a1x - a0x) * f0, a0y + (a1y - a0y) * f0], L1 = [a0x + (a1x - a0x) * f1, a0y + (a1y - a0y) * f1];
      const B0 = [a3x + (a2x - a3x) * f0, a3y + (a2y - a3y) * f0], B1 = [a3x + (a2x - a3x) * f1, a3y + (a2y - a3y) * f1];
      poly(ctx, [L0, L1, B1, B0], i % 2 ? '#ffffff' : k.c);
    }
    for (const wx of [0.6, L - 0.7]) { const [sx, sy] = P(x + wx, y + Wd, 4); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(sx, sy, 4, 4, 0, 0, 7); ctx.fill(); }
    // steam / sparkle
    const [sx, sy] = P(x + 1.2, y + 0.4, 46);
    ctx.strokeStyle = 'rgba(220,220,220,0.6)'; ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) { const o = Math.sin(t * 2 + i) * 2; ctx.beginPath(); ctx.moveTo(sx + i * 6, sy); ctx.quadraticCurveTo(sx + i * 6 + o, sy - 8, sx + i * 6 - o, sy - 16); ctx.stroke(); }
  }

  function menuStand(ctx, x, y) {
    const [sx, sy] = P(x, y, 0);
    ctx.fillStyle = '#8a6247'; ctx.beginPath(); ctx.moveTo(sx - 7, sy); ctx.lineTo(sx - 5, sy - 22); ctx.lineTo(sx + 5, sy - 22); ctx.lineTo(sx + 7, sy); ctx.fill();
    ctx.fillStyle = '#2f3a30'; ctx.fillRect(sx - 5, sy - 20, 10, 16);
    ctx.fillStyle = '#f6efd8'; ctx.font = `3.2px ${FONT}`; ctx.fillText('TODAY', sx - 4, sy - 15); ctx.fillText('라떼', sx - 4, sy - 10); ctx.fillText('쿠키', sx - 4, sy - 6);
  }

  /** small outdoor cafe pavilion: counter with striped awning, along x */
  function cafeKiosk(ctx, x, y, w, t) {
    box(ctx, x, y, 0, w, 1.2, 46, '#f7f4ee', '#e9e1d3', '#ddd3c2', 'rgba(0,0,0,0.15)');
    box(ctx, x - 0.05, y + 1.2, 0, w + 0.1, 0.5, 24, '#c49a62', '#a87a52', '#8a6247', 'rgba(0,0,0,0.15)');
    box(ctx, x - 0.05, y + 1.15, 24, w + 0.1, 0.6, 2, '#efe7da', '#d9cdb8', '#cbbfa8');
    onPlaneY(ctx, x, y + 1.2, 46, (g) => {
      g.fillStyle = '#2f3a30'; g.fillRect(6, 6, w * 32 - 12, 12);
      g.fillStyle = '#f6efd8'; g.font = `5px ${FONT}`; g.fillText('☕ 야외 카페  ·  아메리카노  라떼  에이드  쿠키', 10, 14);
    });
    for (let i = 0; i < Math.floor(w / 0.5); i++) {
      const xx = x + i * 0.5;
      poly(ctx, [P(xx, y + 1.2, 48), P(xx + 0.5, y + 1.2, 48), P(xx + 0.5, y + 2.0, 38), P(xx, y + 2.0, 38)], i % 2 ? '#ffffff' : '#2f9e5f', 'rgba(0,0,0,0.08)');
    }
    for (let k = 0; k < 3; k++) cylinder(ctx, x + 0.6 + k * 0.3, y + 1.45, 26, 0.08, 6, '#fff', '#f2efe9');
    box(ctx, x + w - 1.2, y + 1.3, 26, 0.6, 0.35, 8, '#3b3f45', '#2d3035', '#26292d');
    const [sx, sy] = P(x + 1.6, y + 0.6, 50);
    ctx.strokeStyle = 'rgba(220,220,220,0.5)'; ctx.lineWidth = 1; const o = Math.sin(t * 2) * 2;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + o, sy - 8, sx - o, sy - 14); ctx.stroke();
  }

  function stringLights(ctx, pts, t, night) {
    for (const [x, y] of pts) sbox(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, 64, '#5d6166');
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const [ax, ay] = P(x0, y0, 64), [bx, by] = P(x1, y1, 64);
      const mx = (ax + bx) / 2, my = (ay + by) / 2 + 14;
      ctx.strokeStyle = 'rgba(60,60,60,0.6)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
      for (let k = 1; k < 9; k++) {
        const s = k / 9, qx = (1 - s) * (1 - s) * ax + 2 * (1 - s) * s * mx + s * s * bx, qy = (1 - s) * (1 - s) * ay + 2 * (1 - s) * s * my + s * s * by;
        const tw = night ? 0.75 + 0.25 * Math.sin(t * 3 + k + i) : 0.6;
        ctx.fillStyle = `rgba(255,214,120,${tw})`; ctx.beginPath(); ctx.arc(qx, qy + 2, 1.8, 0, 7); ctx.fill();
        if (night) { ctx.fillStyle = 'rgba(255,214,120,0.18)'; ctx.beginPath(); ctx.arc(qx, qy + 2, 5, 0, 7); ctx.fill(); }
      }
    }
  }

  function basket(ctx, x, y) {
    box(ctx, x - 0.2, y - 0.14, 0, 0.4, 0.28, 7, '#c49a62', '#a87a52', '#8a6247');
    const [sx, sy] = P(x, y, 7); ctx.strokeStyle = '#8a6247'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(sx, sy, 5, Math.PI, 0); ctx.stroke();
    dot(ctx, x - 0.08, y, 8, 2, '#e5534b'); dot(ctx, x + 0.06, y + 0.02, 8, 1.8, '#f6c445');
  }

  // ------------------------------------------------------------------ playground
  function slide(ctx, x, y) {
    // ladder tower at (x,y) 1×1, slide going +y
    for (const [lx, ly] of [[0, 0], [0.9, 0], [0, 0.9], [0.9, 0.9]]) sbox(ctx, x + lx, y + ly, 0, 0.1, 0.1, 34, '#e5534b');
    box(ctx, x, y, 30, 1, 1, 3, '#f2c230', '#d9a91a', '#c39714');
    poly(ctx, [P(x, y, 50), P(x + 1, y, 50), P(x + 1, y + 1, 44), P(x, y + 1, 44)], null);
    // roof
    const [tx, ty] = P(x + 0.5, y + 0.5, 54);
    poly(ctx, [[tx, ty - 10], P(x, y + 1, 40), P(x + 1, y + 1, 40)], '#4e7cf6'); poly(ctx, [[tx, ty - 10], P(x + 1, y + 1, 40), P(x + 1, y, 40)], '#3f68d0');
    // the slide
    poly(ctx, [P(x + 0.15, y + 1, 32), P(x + 0.85, y + 1, 32), P(x + 0.85, y + 3, 2), P(x + 0.15, y + 3, 2)], '#3fb27f', 'rgba(0,0,0,0.15)');
    poly(ctx, [P(x + 0.85, y + 1, 32), P(x + 0.85, y + 3, 2), P(x + 0.85, y + 3, 6), P(x + 0.85, y + 1, 36)], '#2f8c62');
    // ladder rungs on the back
    for (let k = 0; k < 4; k++) { const [a, b] = P(x + 0.1, y, 6 + k * 7), [c, d] = P(x + 0.9, y, 6 + k * 7); ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
  }
  function swingSet(ctx, x, y, t, busy) {
    // frame along x, 3 wide; seats swing along y
    for (const px of [x, x + 3]) {
      const [a, b] = P(px, y - 0.4, 0), [c, d] = P(px, y + 0.4, 0), [e, f] = P(px, y, 46);
      ctx.strokeStyle = '#e5534b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(e, f); ctx.lineTo(c, d); ctx.stroke();
    }
    const [b0x, b0y] = P(x, y, 46), [b1x, b1y] = P(x + 3, y, 46);
    ctx.strokeStyle = '#3f74b8'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(b0x, b0y); ctx.lineTo(b1x, b1y); ctx.stroke();
    for (const [k, sx] of [[0, 0.9], [1, 2.1]]) {
      const ang = Math.sin(t * 2.2 + k * 1.3) * (busy && busy[k] ? 0.55 : 0.08);
      const sy = y + Math.sin(ang) * 1.1, sz = 46 - Math.cos(ang) * 34;
      const [hx, hy] = P(x + sx, y, 46), [px, py] = P(x + sx, sy, sz);
      ctx.strokeStyle = 'rgba(80,80,80,0.7)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(hx - 4, hy); ctx.lineTo(px - 4, py); ctx.moveTo(hx + 4, hy); ctx.lineTo(px + 4, py); ctx.stroke();
      ctx.fillStyle = '#f2c230'; ctx.fillRect(px - 6, py - 1, 12, 3);
    }
  }
  function swingSeatPos(x, y, k, t, busy) {
    const ang = Math.sin(t * 2.2 + k * 1.3) * (busy ? 0.55 : 0.08);
    return { x: x + (k ? 2.1 : 0.9), y: y + Math.sin(ang) * 1.1, z: 46 - Math.cos(ang) * 34 };
  }
  function seesaw(ctx, x, y, t) {
    const a = Math.sin(t * 1.6) * 0.25;
    box(ctx, x + 1.3, y - 0.15, 0, 0.4, 0.3, 8, '#e5534b', '#c9443d', '#b23a34');
    const [cx, cy] = P(x + 1.5, y, 10);
    const dx = Math.cos(a) * 46, dz = Math.sin(a) * 18;
    ctx.strokeStyle = '#3f74b8'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - dx, cy - dx * 0.5 + dz); ctx.lineTo(cx + dx, cy + dx * 0.5 - dz); ctx.stroke();
    ctx.fillStyle = '#f2c230'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * dx * 0.92, cy + s * (dx * 0.5 - dz) * 0.92 - 4, 2.4, 0, 7); ctx.fill(); }
  }
  function jungleGym(ctx, x, y) {
    const c = ['#3fb27f', '#4e7cf6', '#f2c230'];
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) sbox(ctx, x + i - 0.04, y + j - 0.04, 0, 0.08, 0.08, 34, c[(i + j) % 3]);
    ctx.lineWidth = 1.6;
    for (const z of [12, 23, 34]) for (let i = 0; i <= 2; i++) {
      ctx.strokeStyle = c[i % 3];
      ctx.beginPath(); ctx.moveTo(...P(x + i, y, z)); ctx.lineTo(...P(x + i, y + 2, z)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(...P(x, y + i, z)); ctx.lineTo(...P(x + 2, y + i, z)); ctx.stroke();
    }
  }
  function merryGoRound(ctx, x, y, t) {
    cylinder(ctx, x, y, 0, 1.0, 5, '#f2c230', '#d9a91a', 'rgba(0,0,0,0.15)');
    const [sx, sy] = P(x, y, 5);
    for (let k = 0; k < 4; k++) {
      const a = t * 1.1 + k * Math.PI / 2;
      const px = sx + Math.cos(a) * 34, py = sy + Math.sin(a) * 17;
      ctx.strokeStyle = ['#e5534b', '#4e7cf6', '#3fb27f', '#a67be0'][k]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 26, sy + Math.sin(a) * 13); ctx.lineTo(px, py); ctx.lineTo(px, py - 16); ctx.stroke();
    }
    cylinder(ctx, x, y, 5, 0.12, 22, '#e5534b', '#c9443d');
  }
  function sandboxRim(ctx, x, y, w, d) {
    box(ctx, x, y + d - 0.15, 0, w, 0.15, 4, '#c49a62', '#a87a52', '#8a6247');
    box(ctx, x + w - 0.15, y, 0, 0.15, d, 4, '#c49a62', '#a87a52', '#8a6247');
    // bucket + castle
    cylinder(ctx, x + 0.8, y + 0.8, 0, 0.2, 6, '#e5534b', '#c9443d');
    box(ctx, x + 1.4, y + 1.2, 0, 0.5, 0.5, 7, '#ead7ad', '#d9c39a', '#cdb48a');
    box(ctx, x + 1.5, y + 1.3, 7, 0.3, 0.3, 5, '#ead7ad', '#d9c39a', '#cdb48a');
  }

  // ------------------------------------------------------------------ garden
  function flowerBush(ctx, x, y, size, seed, color) {
    const r = AIO.rand(seed);
    ellipseFloor(ctx, x + 0.05, y + 0.05, 0.42 * size, 0.42 * size, 0, 'rgba(40,60,30,0.16)');
    const [sx, sy] = P(x, y, 0);
    const blobs = [[0, -9, 11], [-7, -5, 8], [7, -5, 8], [0, -15, 8]];
    blobs.forEach(([dx, dy, rr], i) => { ctx.beginPath(); ctx.arc(sx + dx * size, sy + dy * size, rr * size, 0, 7); ctx.fillStyle = ['#4f9550', '#5fa35a', '#58a057', '#6db866'][i]; ctx.fill(); });
    const c = color || FLOWER[Math.floor(r() * FLOWER.length)];
    for (let k = 0; k < 9; k++) { ctx.fillStyle = k % 4 === 0 ? '#ffffff' : c; ctx.beginPath(); ctx.arc(sx + (r() - 0.5) * 22 * size, sy - 3 * size - r() * 16 * size, 1.9 * size, 0, 7); ctx.fill(); }
  }
  function hedge(ctx, x, y, w, d, h = 16) {
    box(ctx, x, y, 0, w, d, h, '#5fa35a', '#4f9550', '#458a47', 'rgba(30,60,30,0.2)');
    const r = AIO.rand(Math.round(x * 13 + y * 7));
    for (let i = 0; i < (w + d) * 3; i++) { const [sx, sy] = P(x + r() * w, y + r() * d, h); ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, 7); ctx.fill(); }
  }
  function topiary(ctx, x, y, seed) {
    box(ctx, x - 0.25, y - 0.25, 0, 0.5, 0.5, 10, '#c9a676', '#b8955f', '#a8854f');
    const [sx, sy] = P(x, y, 10);
    ctx.fillStyle = '#4f9550'; ctx.beginPath(); ctx.arc(sx, sy - 12, 10, 0, 7); ctx.fill();
    ctx.fillStyle = '#5fa35a'; ctx.beginPath(); ctx.arc(sx, sy - 26, 7, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(sx - 3, sy - 16, 3, 0, 7); ctx.fill();
  }
  /** pergola along x with hanging wisteria */
  function pergola(ctx, x, y, w, d, t) {
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) sbox(ctx, x + px - 0.08, y + py - 0.08, 0, 0.16, 0.16, 56, '#f4efe6');
    for (let i = 0; i <= w; i += 0.5) box(ctx, x + i - 0.04, y - 0.2, 56, 0.08, d + 0.4, 3, '#f4efe6', '#e3ddd2', '#d6cfc3');
    box(ctx, x - 0.2, y - 0.08, 59, w + 0.4, 0.16, 3, '#f4efe6', '#e3ddd2', '#d6cfc3');
    box(ctx, x - 0.2, y + d - 0.08, 59, w + 0.4, 0.16, 3, '#f4efe6', '#e3ddd2', '#d6cfc3');
    const r = AIO.rand(Math.round(x * 3 + y));
    for (let i = 0; i < w * 6; i++) {
      const px = x + r() * w, py = y + r() * d, len = 8 + r() * 14;
      const [sx, sy] = P(px, py, 56);
      const sway = Math.sin(t * 1.4 + i) * 1.2;
      const g = ctx.createLinearGradient(sx, sy, sx, sy + len);
      g.addColorStop(0, '#b38cf0'); g.addColorStop(1, 'rgba(214,190,250,0.7)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx + sway, sy + len / 2, 3, len / 2, 0, 0, 7); ctx.fill();
    }
    for (let i = 0; i < w * 4; i++) { const [sx, sy] = P(x + r() * w, y + r() * d, 60); ctx.fillStyle = r() < 0.5 ? '#6db866' : '#5fa35a'; ctx.beginPath(); ctx.arc(sx, sy, 4, 0, 7); ctx.fill(); }
  }
  function gazebo(ctx, x, y, t) {
    // 2×2 white gazebo centred on (x,y)
    cylinder(ctx, x, y, 0, 1.3, 4, '#efe9df', '#d9d3c8', 'rgba(0,0,0,0.12)');
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; sbox(ctx, x + Math.cos(a) * 1.1 - 0.05, y + Math.sin(a) * 1.1 - 0.05, 4, 0.1, 0.1, 44, '#ffffff'); }
    const [sx, sy] = P(x, y, 48);
    ctx.beginPath(); ctx.ellipse(sx, sy, 66, 33, 0, 0, Math.PI); ctx.lineTo(sx, sy - 30); ctx.closePath(); ctx.fillStyle = '#d97757'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx, sy, 66, 33, 0, Math.PI, 0); ctx.lineTo(sx, sy - 30); ctx.closePath(); ctx.fillStyle = '#e08b6c'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx - 66, sy); ctx.lineTo(sx, sy - 30); ctx.lineTo(sx + 66, sy); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#f6d58a'; ctx.beginPath(); ctx.arc(sx, sy - 32, 3, 0, 7); ctx.fill();
    void t;
  }
  function bridge(ctx, x, y, w) {
    // wooden arched bridge along x, 1 wide
    const n = Math.round(w * 4);
    for (let i = 0; i < n; i++) {
      const s0 = i / n, s1 = (i + 1) / n, z0 = Math.sin(s0 * Math.PI) * 10 + 2, z1 = Math.sin(s1 * Math.PI) * 10 + 2;
      poly(ctx, [P(x + s0 * w, y, z0), P(x + s1 * w, y, z1), P(x + s1 * w, y + 1, z1), P(x + s0 * w, y + 1, z0)], i % 2 ? '#b98c5e' : '#a87a52', 'rgba(0,0,0,0.12)');
    }
    for (const yy of [y, y + 1]) {
      ctx.strokeStyle = '#d94f3a'; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let i = 0; i <= n; i++) { const s = i / n, [px, py] = P(x + s * w, yy, Math.sin(s * Math.PI) * 10 + 14); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      for (let i = 0; i <= n; i += 2) { const s = i / n, [px, py] = P(x + s * w, yy, Math.sin(s * Math.PI) * 10 + 2); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 12); ctx.stroke(); }
    }
  }
  function duck(ctx, x, y, t, seed) {
    const [sx, sy] = P(x, y, 0);
    const b = Math.sin(t * 2 + seed) * 0.8;
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(sx, sy + 1, 8, 2.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = seed % 3 ? '#f6e27a' : '#ffffff'; ctx.beginPath(); ctx.ellipse(sx, sy - 3 + b, 6, 3.6, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(sx + 4, sy - 7 + b, 2.8, 0, 7); ctx.fill();
    ctx.fillStyle = '#f08a3a'; ctx.fillRect(sx + 6.2, sy - 7.2 + b, 2.4, 1.2);
    ctx.fillStyle = '#222'; ctx.fillRect(sx + 4.4, sy - 8.2 + b, 0.9, 0.9);
  }
  function koi(ctx, x, y, t, seed) {
    const a = t * 0.5 + seed;
    const [sx, sy] = P(x + Math.cos(a) * 0.9, y + Math.sin(a) * 0.6, 0);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(a + Math.PI / 2); ctx.scale(1, 0.6);
    ctx.fillStyle = seed % 2 ? '#ff8a3d' : '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 5, 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e5534b'; ctx.beginPath(); ctx.arc(1, 0, 1.3, 0, 7); ctx.fill();
    ctx.restore();
  }
  function deckChair(ctx, x, y, color) {
    // lounger along y, head to the north
    box(ctx, x - 0.3, y - 0.2, 4, 0.6, 1.3, 2, '#ffffff', '#e9e4da', '#ddd6ca');
    for (const [lx, ly] of [[-0.25, -0.1], [0.2, -0.1], [-0.25, 1.0], [0.2, 1.0]]) sbox(ctx, x + lx, y + ly, 0, 0.05, 0.05, 4, '#b7bec4');
    poly(ctx, [P(x - 0.3, y - 0.2, 6), P(x + 0.3, y - 0.2, 6), P(x + 0.3, y + 0.3, 18), P(x - 0.3, y + 0.3, 18)], color, 'rgba(0,0,0,0.12)');
    rect(ctx, x - 0.28, y + 0.35, 0.56, 0.85, color, 6.1);
    for (let i = 0; i < 3; i++) rect(ctx, x - 0.28, y + 0.42 + i * 0.28, 0.56, 0.08, '#ffffff', 6.2);
  }
  function parasol(ctx, x, y, color, t) {
    sbox(ctx, x - 0.03, y - 0.03, 0, 0.06, 0.06, 50, '#6d7175');
    const [sx, sy] = P(x, y, 52);
    const sway = Math.sin(t * 0.8 + x) * 0.8;
    for (let k = 0; k < 8; k++) {
      const a0 = k / 8 * Math.PI * 2, a1 = (k + 1) / 8 * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(sx + sway, sy - 10);
      ctx.lineTo(sx + Math.cos(a0) * 40, sy + Math.sin(a0) * 20); ctx.lineTo(sx + Math.cos(a1) * 40, sy + Math.sin(a1) * 20); ctx.closePath();
      ctx.fillStyle = k % 2 ? '#ffffff' : color; ctx.fill();
    }
  }
  function greenhouse(ctx, x, y, w, d) {
    box(ctx, x, y, 0, w, d, 6, '#d9d3c8', '#c9c1b4', '#bab3a7');
    box(ctx, x, y, 6, w, d, 34, 'rgba(210,235,225,0.35)', 'rgba(200,232,220,0.42)', 'rgba(185,220,205,0.42)', 'rgba(255,255,255,0.8)');
    const r = AIO.rand(Math.round(x + y * 3));
    for (let i = 0; i < w * d * 3; i++) { const [sx, sy] = P(x + 0.2 + r() * (w - 0.4), y + 0.2 + r() * (d - 0.4), 10); ctx.fillStyle = r() < 0.3 ? FLOWER[Math.floor(r() * 5)] : '#5fa35a'; ctx.beginPath(); ctx.arc(sx, sy - r() * 10, 3, 0, 7); ctx.fill(); }
    const [a, b] = P(x, y + d / 2, 52), [c, e] = P(x + w, y + d / 2, 52);
    poly(ctx, [P(x, y, 40), P(x + w, y, 40), [c, e], [a, b]], 'rgba(220,240,235,0.45)', 'rgba(255,255,255,0.9)');
    poly(ctx, [[a, b], [c, e], P(x + w, y + d, 40), P(x, y + d, 40)], 'rgba(235,250,245,0.5)', 'rgba(255,255,255,0.9)');
    onPlaneY(ctx, x + 0.2, y + d, 32, (g) => { g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, 0, 50, 9); g.fillStyle = '#2f7d4f'; g.font = `5px ${FONT}`; g.fillText('🌱 온실 · 허브가든', 3, 6.5); });
  }
  function roofTree(ctx, x, y, size, seed, t, blossom) {
    box(ctx, x - 0.45, y - 0.45, 0, 0.9, 0.9, 12, '#b98c5e', '#a87a52', '#8a6247', 'rgba(0,0,0,0.12)');
    rect(ctx, x - 0.4, y - 0.4, 0.8, 0.8, '#6b4a35', 12.1);
    ctx.save(); ctx.translate(...P(0, 0, 12)); A3.tree(ctx, x, y, size, seed, t); ctx.restore();
    if (blossom) {
      const r = AIO.rand(seed), [sx, sy] = P(x, y, 12 + 26 * size);
      for (let k = 0; k < 26; k++) { ctx.fillStyle = k % 3 ? '#f7b6c8' : '#ffd9e4'; ctx.beginPath(); ctx.arc(sx + (r() - 0.5) * 40 * size, sy - 4 - r() * 30 * size, 2.6, 0, 7); ctx.fill(); }
    }
  }
  function birdbath(ctx, x, y, t) {
    cylinder(ctx, x, y, 0, 0.18, 18, '#e6e0d6', '#cfc8bc');
    cylinder(ctx, x, y, 18, 0.45, 4, '#9fd2ee', '#e6e0d6');
    const [sx, sy] = P(x + 0.2, y, 22); const hop = Math.abs(Math.sin(t * 3)) * 2;
    ctx.fillStyle = '#7a5540'; ctx.beginPath(); ctx.ellipse(sx, sy - 3 - hop, 3.2, 2.4, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(sx + 2.4, sy - 5 - hop, 1.7, 0, 7); ctx.fill();
  }
  function stoneLantern(ctx, x, y, night) {
    box(ctx, x - 0.2, y - 0.2, 0, 0.4, 0.4, 6, '#cfc8bc', '#bab3a7', '#a9a296');
    sbox(ctx, x - 0.08, y - 0.08, 6, 0.16, 0.16, 10, '#cfc8bc');
    box(ctx, x - 0.22, y - 0.22, 16, 0.44, 0.44, 8, night ? '#ffe3a0' : '#e6e0d6', night ? '#ffd27a' : '#cfc8bc', night ? '#f2c060' : '#bab3a7');
    const [sx, sy] = P(x, y, 24); ctx.fillStyle = '#bab3a7'; ctx.beginPath(); ctx.moveTo(sx - 12, sy + 2); ctx.lineTo(sx, sy - 8); ctx.lineTo(sx + 12, sy + 2); ctx.fill();
  }

  // ------------------------------------------------------------------ factory dock / interior extras
  function dockLeveler(ctx, f, t, busy) {
    const { x, y, w, d } = f;
    poly(ctx, [P(x, y, 1), P(x + w, y, 1), P(x + w, y + d, 1), P(x, y + d, 1)], '#8d959c', 'rgba(0,0,0,0.25)');
    for (let i = 0; i < 6; i++) poly(ctx, [P(x + 0.05, y + i * d / 6, 1.2), P(x + w - 0.05, y + i * d / 6, 1.2), P(x + w - 0.05, y + i * d / 6 + 0.06, 1.2), P(x + 0.05, y + i * d / 6 + 0.06, 1.2)], 'rgba(255,255,255,0.25)');
    A2.hazardRect(ctx, x - 0.3, y - 0.15, 0.25, d + 0.3);
    const [lx, ly] = P(x + w - 0.1, y - 0.1, 40); ctx.fillStyle = busy ? (Math.sin(t * 6) > 0 ? '#3fb27f' : '#2a7a55') : '#e5534b'; ctx.beginPath(); ctx.arc(lx, ly, 3, 0, 7); ctx.fill();
  }
  /** standing board listing what waits for a decision */
  function decisionBoard(ctx, x, y, w, items) {
    for (const lx of [x + 0.2, x + w - 0.3]) sbox(ctx, lx, y + 0.3, 0, 0.08, 0.08, 46, '#6d757c');
    onPlaneY(ctx, x, y + 0.35, 60, (g) => {
      const Wl = w * 32;
      g.fillStyle = '#2b2622'; roundRect(g, 0, 0, Wl, 40, 3); g.fill();
      g.fillStyle = '#f6d58a'; g.font = `bold 5.5px ${FONT}`; g.fillText('🙋 결정 대기 보드', 5, 8);
      g.font = `4.2px ${FONT}`;
      if (!items.length) { g.fillStyle = '#9fd8b0'; g.fillText('대기 중인 결정이 없어요 🎉', 5, 18); }
      items.slice(0, 5).forEach((s, i) => { g.fillStyle = '#ff8a7a'; g.fillText('● ' + s, 5, 16 + i * 5.2); });
    });
  }

  // ------------------------------------------------------------------ extra buildings
  /** Apple-Park-like glass ring. back pass: inner wall far side + back half of the roof. front pass: outer glass + front roof */
  function ringPass(ctx, o, front, t, night) {
    const { cx, cy, R, r, h } = o;
    const k = 45.2548;
    const [sx, sy0] = P(cx, cy, 0);
    const sy1 = sy0 - h;
    const AO = R * k, BO = AO / 2, AI = r * k, BI = AI / 2;
    const roof = (half) => {
      ctx.save();
      ctx.beginPath(); ctx.rect(sx - AO - 10, half < 0 ? sy1 - BO - 10 : sy1, AO * 2 + 20, BO + 10); ctx.clip();
      ctx.beginPath(); ctx.ellipse(sx, sy1, AO, BO, 0, 0, 7); ctx.ellipse(sx, sy1, AI, BI, 0, 0, 7, true);
      ctx.fillStyle = '#e9ecef'; ctx.fill('evenodd');
      // solar panels: concentric dark arcs
      ctx.lineWidth = 3.2;
      for (let q = 1; q < 4; q++) {
        const rr = r + (R - r) * q / 4;
        ctx.strokeStyle = 'rgba(46,74,120,0.75)'; ctx.beginPath(); ctx.ellipse(sx, sy1, rr * k, rr * k / 2, 0, 0, 7); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(sx, sy1, AO, BO, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.ellipse(sx, sy1, AI, BI, 0, 0, 7); ctx.stroke();
      ctx.restore();
    };
    const band = (A, B, top) => {
      // vertical band between the half-ellipse at z=0 and z=h (top=true: far half seen from inside)
      ctx.beginPath();
      if (top) { ctx.ellipse(sx, sy1, A, B, 0, Math.PI, 2 * Math.PI); ctx.lineTo(sx + A, sy0); ctx.ellipse(sx, sy0, A, B, 0, 2 * Math.PI, Math.PI, true); }
      else { ctx.ellipse(sx, sy0, A, B, 0, 0, Math.PI); ctx.lineTo(sx - A, sy1); ctx.ellipse(sx, sy1, A, B, 0, Math.PI, 0, true); }
      ctx.closePath();
    };
    const glass = (A, B, top, alpha) => {
      band(A, B, top);
      const gr = ctx.createLinearGradient(sx - A, 0, sx + A, 0);
      const lit = night ? 'rgba(255,226,150,' : 'rgba(170,205,225,';
      gr.addColorStop(0, lit + (alpha * 0.9) + ')'); gr.addColorStop(0.5, (night ? 'rgba(255,240,200,' : 'rgba(225,240,250,') + alpha + ')'); gr.addColorStop(1, lit + (alpha * 0.8) + ')');
      ctx.fillStyle = gr; ctx.fill();
      // white floor slabs (4 storeys)
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.2;
      for (let q = 0; q <= 4; q++) { const zz = sy0 - h * q / 4; ctx.beginPath(); if (top) ctx.ellipse(sx, zz, A, B, 0, Math.PI, 2 * Math.PI); else ctx.ellipse(sx, zz, A, B, 0, 0, Math.PI); ctx.stroke(); }
      // mullions
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.8;
      for (let a = 0.05; a < Math.PI; a += 0.07) { const px = sx + Math.cos(top ? a + Math.PI : a) * A, py = (top ? -1 : 1) * Math.sin(a) * B; ctx.beginPath(); ctx.moveTo(px, sy0 + py); ctx.lineTo(px, sy1 + py); ctx.stroke(); }
    };
    if (!front) {
      glass(AI, BI, true, 0.95);
      roof(-1);
    } else {
      glass(AO, BO, false, 0.62);
      // tunnel openings where the paths go through
      for (const g of o.gates || []) {
        const ang = g.angle; // 0 = +x (east), PI/2 = +y (south)
        const gx = cx + Math.cos(ang) * R, gy = cy + Math.sin(ang) * R;
        const [px, py] = P(gx, gy, 0);
        ctx.fillStyle = 'rgba(40,45,52,0.85)'; ctx.beginPath(); ctx.moveTo(px - 26, py); ctx.lineTo(px - 26, py - h * 0.4); ctx.quadraticCurveTo(px, py - h * 0.55, px + 26, py - h * 0.4); ctx.lineTo(px + 26, py); ctx.fill();
      }
      roof(1);
      // label
      const [lx, ly] = P(cx, cy + R, h + 6);
      ctx.fillStyle = 'rgba(43,38,34,0.85)'; roundRect(ctx, lx - 60, ly - 8, 120, 16, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `bold 9px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('🍏 링 R&D 센터', lx, ly + 3); ctx.textAlign = 'left';
    }
  }

  function warehouse(ctx, o, t) {
    const { x, y, W, H } = o, Hh = 70;
    poly(ctx, [P(x + 0.3, y + 0.3), P(x + W + 0.8, y + 0.5), P(x + W + 0.8, y + H + 0.6), P(x + 0.3, y + H + 0.4)], 'rgba(40,40,30,0.18)');
    onPlaneY(ctx, x, y + H, Hh, (g) => {
      const Wl = W * 32; g.fillStyle = '#d6dadd'; g.fillRect(0, 0, Wl, Hh);
      g.strokeStyle = 'rgba(60,70,80,0.15)'; for (let i = 0; i < Wl; i += 5) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, Hh); g.stroke(); }
      g.fillStyle = '#e9a23b'; g.fillRect(0, 10, Wl, 5);
      g.fillStyle = '#2f3a44'; roundRect(g, 10, 20, 96, 16, 3); g.fill(); g.fillStyle = '#f2c230'; g.font = `9px ${FONT}`; g.fillText('📦 물류센터', 18, 32);
    });
    onPlaneX(ctx, x + W, y + H, Hh, (g) => {
      const Wl = H * 32; g.fillStyle = '#c4c9cd'; g.fillRect(0, 0, Wl, Hh);
      g.fillStyle = '#e9a23b'; g.fillRect(0, 10, Wl, 5);
      for (let i = 0; i < Math.floor(H / 3); i++) { g.fillStyle = '#7d868e'; g.fillRect(14 + i * 96, Hh - 46, 60, 46); g.strokeStyle = 'rgba(0,0,0,0.25)'; for (let k = Hh - 44; k < Hh; k += 4) { g.beginPath(); g.moveTo(16 + i * 96, k); g.lineTo(72 + i * 96, k); g.stroke(); } }
    });
    poly(ctx, [P(x, y, Hh), P(x + W, y, Hh), P(x + W, y + H, Hh), P(x, y + H, Hh)], '#aab2b9', 'rgba(0,0,0,0.15)');
    for (let i = 1; i < W; i += 2.5) box(ctx, x + i, y + 1, Hh, 1, 1, 6, '#c9cfd4', '#b7bec4', '#a9b0b6');
    void t;
  }

  function daycare(ctx, o, t) {
    const { x, y, W, H } = o, Hh = 54;
    poly(ctx, [P(x + 0.3, y + 0.3), P(x + W + 0.6, y + 0.5), P(x + W + 0.6, y + H + 0.5), P(x + 0.3, y + H + 0.4)], 'rgba(40,40,30,0.15)');
    onPlaneY(ctx, x, y + H, Hh, (g) => {
      const Wl = W * 32; g.fillStyle = '#fff3d6'; g.fillRect(0, 0, Wl, Hh);
      const cols = ['#f07a8a', '#7ab8f5', '#9fd8b0', '#f6c445'];
      for (let i = 0; i < W - 1; i++) { g.fillStyle = cols[i % 4]; roundRect(g, 10 + i * 32, 16, 18, 18, 9); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(18 + i * 32, 16, 2, 18); }
      g.fillStyle = '#e5534b'; roundRect(g, Wl / 2 - 14, Hh - 30, 28, 30, 12); g.fill();
      g.fillStyle = '#ffffff'; g.font = `bold 8px ${FONT}`; g.fillText('🧸 AI 어린이집', 8, 10);
    });
    onPlaneX(ctx, x + W, y + H, Hh, (g) => { const Wl = H * 32; g.fillStyle = '#f6e6c0'; g.fillRect(0, 0, Wl, Hh); for (let i = 0; i < H - 1; i++) { g.fillStyle = '#7ab8f5'; roundRect(g, 10 + i * 32, 16, 18, 18, 9); g.fill(); } });
    // candy roof
    const peakL = P(x, y + H / 2, Hh + 26), peakR = P(x + W, y + H / 2, Hh + 26);
    poly(ctx, [P(x, y, Hh), P(x + W, y, Hh), peakR, peakL], '#e5534b');
    poly(ctx, [peakL, peakR, P(x + W, y + H, Hh), P(x, y + H, Hh)], '#f07a8a', 'rgba(0,0,0,0.1)');
    poly(ctx, [peakR, P(x + W, y + H, Hh), P(x + W, y, Hh)], '#d4483f');
    for (let i = 0; i < W; i += 1) { const [a, b] = P(x + i, y + H, Hh); ctx.fillStyle = i % 2 ? '#ffffff' : '#f6c445'; ctx.beginPath(); ctx.arc(a, b + 2, 3, 0, 7); ctx.fill(); }
    const [fx, fy] = P(x + W - 1, y + H / 2, Hh + 26); ctx.strokeStyle = '#6d7175'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 22); ctx.stroke();
    ctx.fillStyle = '#f6c445'; ctx.beginPath(); ctx.moveTo(fx, fy - 22); ctx.lineTo(fx + 12 + Math.sin(t * 3) * 2, fy - 18); ctx.lineTo(fx, fy - 14); ctx.fill();
  }

  /** tower faces for storeys k0..k1-1 (no roof). info.floors[k] lights the windows of storey k */
  /**
   * tower exterior. b.facade (optional) restyles it — without it the look is the original glass tower:
   *   wall '#hex' · texture 'brick'|'wood'|'stripes'|'concrete'|'panel' · win 'glass'|'grid'|'arch'|'band'|'round'|'small'|'none'
   *   winColor · frame · trim · sign · signBg · signFg · lobby (ground-floor glass colour) · awning '#hex' · paint(g, o) extra painter
   */
  function towerFaces(ctx, b, info, k0, k1) {
    if (k1 <= k0) return;
    const FP = info.floorPx, x0 = b.x, y0 = b.y, W = b.W, H = b.H, t = info.t, night = info.night;
    const F = b.facade || null;
    const zTop = k1 * FP, Hb = (k1 - k0) * FP;
    if (k0 === 0) poly(ctx, [P(x0 + 0.3, y0 + 0.3), P(x0 + W + 1.4, y0 + 0.6), P(x0 + W + 1.4, y0 + H + 1.2), P(x0 + 0.3, y0 + H + 0.4)], 'rgba(40,40,30,0.18)');
    const texture = (g, Wpx) => {
      const tx = F.texture;
      if (tx === 'brick') { for (let y = 0, row = 0; y < Hb; y += 6, row++) { g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(0, y, Wpx, 1); for (let x = (row % 2) * 8; x < Wpx; x += 16) g.fillRect(x, y, 1, 6); } }
      else if (tx === 'wood') { for (let x = 0; x < Wpx; x += 7) { g.fillStyle = (x / 7) % 2 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)'; g.fillRect(x, 0, 7, Hb); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, 0, 1, Hb); } }
      else if (tx === 'stripes') { for (let x = 0; x < Wpx; x += 6) { g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(x, 0, 2, Hb); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x + 3, 0, 1, Hb); } }
      else if (tx === 'concrete') { const r = AIO.rand(Wpx + Hb); for (let i = 0; i < Wpx * Hb / 40; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'; g.fillRect(r() * Wpx, r() * Hb, 2, 2); } }
      else if (tx === 'panel') { for (let x = 0; x < Wpx; x += 32) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, 0, 1.5, Hb); } }
    };
    const face = (g, len, dark, south) => {
      const Wpx = len * 32;
      const gr = g.createLinearGradient(0, 0, 0, Hb);
      if (F && F.wall) { gr.addColorStop(0, shade(F.wall, dark ? -0.1 : 0.02)); gr.addColorStop(1, shade(F.wall, dark ? -0.2 : -0.08)); }
      else { gr.addColorStop(0, dark ? '#7f98ab' : '#94adc0'); gr.addColorStop(1, dark ? '#6a8296' : '#7e97ab'); }
      g.fillStyle = gr; g.fillRect(0, 0, Wpx, Hb);
      if (F && F.texture) texture(g, Wpx);
      const winStyle = (F && F.win) || 'glass';
      for (let k = k0; k < k1; k++) {
        const fl = info.floors[k] || {};
        const top = Hb - (k - k0 + 1) * FP;
        const lit = fl.people > 0 && (night || fl.busy > 0);
        if (k === 0 && south) {
          // ground floor: lobby glass, main door, cafe with its own street door + awning
          g.fillStyle = night ? 'rgba(255,226,150,0.85)' : (F && F.lobby) || 'rgba(205,226,240,0.8)'; g.fillRect(4, top + 6, Wpx - 8, FP - 6);
          g.strokeStyle = (F && F.frame) || 'rgba(90,110,130,0.5)'; for (let i = 0; i < len; i++) { g.beginPath(); g.moveTo(i * 32, top + 6); g.lineTo(i * 32, top + FP); g.stroke(); }
          const dx = (b.door.x - x0) * 32;
          g.fillStyle = '#2b3036'; g.fillRect(dx - 44, top + 12, 88, FP - 12);
          g.fillStyle = 'rgba(190,220,240,0.7)'; g.fillRect(dx - 40, top + 16, 38, FP - 16); g.fillRect(dx + 2, top + 16, 38, FP - 16);
          if (F && F.awning) for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#ffffff' : F.awning; g.fillRect(dx - 54 + i * 12, top + 3, 12, 8); }
          const sign = (F && F.sign) || 'AI 빌딩동';
          g.font = `10px ${FONT}`; const sw = Math.max(112, g.measureText(sign).width + 24);
          g.fillStyle = (F && F.signBg) || '#3b332b'; roundRect(g, dx - sw / 2, top - 4, sw, 16, 4); g.fill();
          g.fillStyle = (F && F.signFg) || '#f6d58a'; g.textAlign = 'center'; g.fillText(sign, dx, top + 8);
          if (b.cafeDoor) {
            const cx = (b.cafeDoor.x - x0) * 32;
            const c0 = (b.cafe ? b.cafe.x0 - x0 : len - 16) * 32;
            g.fillStyle = night ? 'rgba(255,200,120,0.9)' : 'rgba(250,228,196,0.85)'; g.fillRect(c0, top + 6, Wpx - c0 - 4, FP - 6);
            g.fillStyle = '#7a4a2a'; g.fillRect(cx - 24, top + 16, 48, FP - 16);
            g.fillStyle = 'rgba(255,240,220,0.8)'; g.fillRect(cx - 21, top + 19, 20, FP - 19); g.fillRect(cx + 1, top + 19, 20, FP - 19);
            for (let i = 0; i < (Wpx - c0) / 12; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#2f9e5f'; g.fillRect(c0 + i * 12, top + 1, 12, 9); }
            g.fillStyle = '#2f3a30'; roundRect(g, cx - 40, top - 10, 80, 13, 4); g.fill();
            g.fillStyle = '#f6efd8'; g.font = `8px ${FONT}`; g.fillText('☕ AI CAFE', cx, top - 1);
          }
          g.textAlign = 'left';
          continue;
        }
        const HC = info.heat || {}, FX = HC.fx || {}, hv = fl.heat || 0, sp = HC.speed || 1;
        const HEAT = ['', 'rgba(255,220,130,0.92)', 'rgba(255,172,72,0.94)', 'rgba(255,104,70,0.96)'];
        const winC = (i) => {
          if (fl.urgent && Math.sin(t * 6 + i * 0.3) > 0) return 'rgba(255,90,80,0.85)';
          if (hv) {
            if (FX.rainbow && hv >= 2) return `hsla(${(i * 28 + k * 47 + t * 140 * sp) % 360},85%,62%,0.92)`;          // 🌈 무지개
            if (FX.wave && hv >= 2) { const pos = (t * 7 * sp + k * 3) % (len + 6) - 3; if (Math.abs(i - pos) < 1.6) return 'rgba(255,255,235,0.98)'; }   // 🌊 흐르는 불빛
            if (FX.blink && hv >= 3 && Math.sin(t * 5 * sp + k) < -0.2) return night ? 'rgba(60,40,30,0.85)' : 'rgba(150,120,90,0.6)';   // 💡 깜빡임
            if (FX.tint) return HEAT[hv];                                                                                   // 🔥 단계별 불빛
          }
          if (lit) return (i * 7 + k * 3) % 5 === 0 ? 'rgba(255,240,200,0.65)' : 'rgba(255,226,150,0.9)';
          return night ? 'rgba(40,52,80,0.85)' : (F && F.winColor) || 'rgba(205,226,240,0.75)';
        };
        if (winStyle === 'band') {
          g.fillStyle = winC(0); g.fillRect(3, top + 12, Wpx - 6, FP - 26);
          g.strokeStyle = (F && F.frame) || 'rgba(60,70,80,0.45)'; g.lineWidth = 1;
          for (let i = 1; i < len; i++) { g.beginPath(); g.moveTo(i * 32, top + 12); g.lineTo(i * 32, top + FP - 14); g.stroke(); }
        } else if (winStyle !== 'none') for (let i = 0; i < len; i++) {
          const c = winC(i);
          if (winStyle === 'glass') {
            const wx = i * 32 + 3, wy = top + 7, ww = 26, wh = FP - 13;
            g.fillStyle = c; g.fillRect(wx, wy, ww, wh);
            if (!lit && !night) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx + 8, wy); g.lineTo(wx + 13, wy); g.lineTo(wx + 5, wy + wh); g.fill(); }
          } else if (winStyle === 'grid' || winStyle === 'small') {
            if (winStyle === 'small' && i % 2) continue;
            const ww = winStyle === 'small' ? 16 : 20, wh = winStyle === 'small' ? 18 : FP - 22, wx = i * 32 + (32 - ww) / 2, wy = top + (FP - wh) / 2 - 2;
            g.fillStyle = (F && F.frame) || '#f4efe6'; g.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
            g.fillStyle = c; g.fillRect(wx, wy, ww, wh);
            g.fillStyle = (F && F.frame) || '#f4efe6'; g.fillRect(wx + ww / 2 - 0.75, wy, 1.5, wh); g.fillRect(wx, wy + wh / 2 - 0.75, ww, 1.5);
          } else if (winStyle === 'arch') {
            const ww = 18, wx = i * 32 + 7, wy = top + 14, wh = FP - 24;
            g.fillStyle = (F && F.frame) || '#f4efe6'; g.beginPath(); g.moveTo(wx - 2, wy + wh + 2); g.lineTo(wx - 2, wy); g.arc(wx + ww / 2, wy, ww / 2 + 2, Math.PI, 0); g.lineTo(wx + ww + 2, wy + wh + 2); g.fill();
            g.fillStyle = c; g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy); g.arc(wx + ww / 2, wy, ww / 2, Math.PI, 0); g.lineTo(wx + ww, wy + wh); g.fill();
          } else if (winStyle === 'round') {
            const cx = i * 32 + 16, cy = top + FP / 2;
            g.fillStyle = (F && F.frame) || '#cfd5da'; g.beginPath(); g.arc(cx, cy, 11, 0, 7); g.fill();
            g.fillStyle = c; g.beginPath(); g.arc(cx, cy, 8.5, 0, 7); g.fill();
          }
        }
        if (fl.tag && south) { g.fillStyle = 'rgba(43,38,34,0.55)'; roundRect(g, 6, top + 8, 22, 12, 3); g.fill(); g.fillStyle = '#fff'; g.font = `7px ${FONT}`; g.fillText(fl.tag, 8, top + 17); }
        if (hv && FX.neon) {                                                                                               // ✨ 네온 띠
          const NEON = ['', '#ffd36b', '#ff9a3c', '#ff4f4f'], a = 0.55 + 0.45 * Math.sin(t * 3 * sp + k);
          g.save(); g.globalAlpha = a; g.shadowColor = NEON[hv]; g.shadowBlur = 6 + hv * 3; g.fillStyle = NEON[hv]; g.fillRect(2, top + FP - 6, Wpx - 4, 2.5); g.restore();
        }
        if (hv && FX.count && south && fl.people) {                                                                         // 👥 인원 숫자
          const txt = `👥 ${fl.people}`; g.font = `bold 8px ${FONT}`; const tw = g.measureText(txt).width + 10;
          g.fillStyle = ['', 'rgba(200,150,40,0.9)', 'rgba(226,120,30,0.92)', 'rgba(220,60,50,0.95)'][hv]; roundRect(g, Wpx - tw - 6, top + 8, tw, 12, 6); g.fill();
          g.fillStyle = '#fff'; g.fillText(txt, Wpx - tw - 1, top + 17);
        }
        g.fillStyle = (F && F.trim) || (dark ? '#c9c4bb' : '#dcd7ce'); g.fillRect(0, top + FP - 3, Wpx, 3);
      }
      g.fillStyle = (F && F.trim) ? shade(F.trim, -0.1) : dark ? '#b8b2a8' : '#cfc9bf'; g.fillRect(0, 0, Wpx, 4);
      if (F && F.paint) F.paint(g, { len, Wpx, Hb, FP, k0, k1, dark, south, night, t });
    };
    onPlaneY(ctx, x0, y0 + H, zTop, (g) => face(g, W, false, true));
    onPlaneX(ctx, x0 + W, y0 + H, zTop, (g) => face(g, H, true, false));
    if (k0 === 0) {
      box(ctx, b.door.x - 1.8, y0 + H, FP - 12, 3.6, 1.0, 4, '#f2efe9', '#d9d3c9', '#cfc8bc', 'rgba(0,0,0,0.15)');
      if (b.cafeDoor) box(ctx, b.cafeDoor.x - 1.4, y0 + H, FP - 16, 2.8, 0.9, 3, '#2f9e5f', '#278552', '#206e44', 'rgba(0,0,0,0.15)');
    }
  }
  /** parapet on the front edges of a roof at height z */
  function parapet(ctx, b, z) {
    box(ctx, b.x, b.y + b.H - 0.12, z, b.W, 0.12, 9, 'rgba(220,235,245,0.55)', 'rgba(200,225,240,0.5)', 'rgba(190,215,232,0.5)', 'rgba(140,160,175,0.6)');
    box(ctx, b.x + b.W - 0.12, b.y, z, 0.12, b.H, 9, 'rgba(220,235,245,0.55)', 'rgba(200,225,240,0.5)', 'rgba(190,215,232,0.5)', 'rgba(140,160,175,0.6)');
  }

  AIO.art5 = {
    decal, trafficLight, stopLine, bus, truck, busStop, gateBooth, barrier, container, foodTruck, menuStand, cafeKiosk, stringLights, basket,
    slide, swingSet, swingSeatPos, seesaw, jungleGym, merryGoRound, sandboxRim, flowerBush, hedge, topiary, pergola, gazebo, bridge, duck, koi,
    deckChair, parasol, greenhouse, roofTree, birdbath, stoneLantern, dockLeveler, decisionBoard, ringPass, warehouse, daycare, towerFaces, parapet,
  };
})();
