// Campus art: grounds, outdoor props, building exteriors (tower / factory), elevators, lobby cafe, rooftop smoking area.
(function () {
  const { P, shade, rgba, poly, box, sbox, cylinder, ellipseFloor, onPlaneY, onPlaneX, roundRect } = AIO.iso;
  const A = AIO.art, A2 = AIO.art2;
  const FONT = A.FONT;

  // ------------------------------------------------------------------ grounds (static cache)
  function ground(g, OUT) {
    const W = OUT.W, H = OUT.H;
    // earth slab edge
    poly(g, [P(0, H, 0), P(W, H, 0), P(W, H, -16), P(0, H, -16)], '#8a7a5c');
    poly(g, [P(W, 0, 0), P(W, H, 0), P(W, H, -16), P(W, 0, -16)], '#76684d');
    A2.floor(g, 0, 0, W, H, 'grass', '#a9d18e', 5);
    const G = OUT.ground;
    for (const r of G.walk) A2.floor(g, r.x, r.y, r.w, r.d, 'tile', '#d9d3c8', r.x + r.y);
    for (const r of G.plaza) A2.floor(g, r.x, r.y, r.w, r.d, 'tile', '#e8e2d6', r.x * 3 + r.y);
    for (const r of G.road) {
      poly(g, [P(r.x, r.y), P(r.x + r.w, r.y), P(r.x + r.w, r.y + r.d), P(r.x, r.y + r.d)], '#5f6368');
      // curbs
      poly(g, [P(r.x, r.y), P(r.x + r.w, r.y), P(r.x + r.w, r.y + 0.08), P(r.x, r.y + 0.08)], '#c9c5bd');
      poly(g, [P(r.x, r.y + r.d - 0.08), P(r.x + r.w, r.y + r.d - 0.08), P(r.x + r.w, r.y + r.d), P(r.x, r.y + r.d)], '#c9c5bd');
      // centre line
      for (let x = r.x + 0.5; x < r.x + r.w; x += 1.6) poly(g, [P(x, r.y + r.d / 2 - 0.05), P(x + 0.8, r.y + r.d / 2 - 0.05), P(x + 0.8, r.y + r.d / 2 + 0.05), P(x, r.y + r.d / 2 + 0.05)], '#f2c230');
    }
    const c = G.crosswalk;
    if (c) for (let k = 0; k < 6; k++) poly(g, [P(c.x - 1 + k * 0.42, c.y + 0.1), P(c.x - 1 + k * 0.42 + 0.24, c.y + 0.1), P(c.x - 1 + k * 0.42 + 0.24, c.y + c.d - 0.1), P(c.x - 1 + k * 0.42, c.y + c.d - 0.1)], '#f4f2ee');
  }

  // ------------------------------------------------------------------ outdoor props
  function tree(ctx, x, y, s, seed, t) {
    ellipseFloor(ctx, x + 0.15, y + 0.15, 0.55 * s, 0.55 * s, 0, 'rgba(40,60,30,0.18)');
    sbox(ctx, x - 0.07, y - 0.07, 0, 0.14, 0.14, 26 * s, '#8a6a45');
    const [sx, sy] = P(x, y, 26 * s);
    const sway = Math.sin(t * 0.9 + seed) * 1.2;
    const r = AIO.rand(seed);
    const blobs = [[0, -14, 17], [-10, -6, 12], [10, -6, 12], [-5, -24, 11], [6, -22, 12]];
    blobs.forEach(([dx, dy, rr], i) => {
      ctx.beginPath(); ctx.arc(sx + dx * s + sway * (1 - i * 0.1), sy + dy * s, rr * s, 0, Math.PI * 2);
      ctx.fillStyle = ['#5fa35a', '#4f9550', '#6db866', '#58a057', '#7cc472'][i]; ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(sx - 6 * s + sway, sy - 22 * s, 6 * s, 0, 7); ctx.fill();
    if (r() < 0.35) { ctx.fillStyle = '#f07a8a'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(sx + (r() - 0.5) * 26 * s, sy - 8 * s - r() * 20 * s, 1.8, 0, 7); ctx.fill(); } }
  }

  function streetLamp(ctx, x, y, night) {
    ellipseFloor(ctx, x, y, 0.15, 0.15, 0, '#6d7175');
    const [bx, by] = P(x, y, 0);
    ctx.strokeStyle = '#4f5459'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 70); ctx.quadraticCurveTo(bx, by - 78, bx + 8, by - 78); ctx.stroke();
    ctx.fillStyle = '#3d4247'; ctx.beginPath(); roundRect(ctx, bx + 4, by - 81, 10, 5, 2); ctx.fill();
    ctx.fillStyle = night ? '#fff1b8' : '#d9dde1'; ctx.fillRect(bx + 5, by - 76.5, 8, 1.6);
  }

  function busStop(ctx, x, y) {
    box(ctx, x, y + 0.9, 0, 2.6, 0.1, 44, 'rgba(190,220,235,0.4)', 'rgba(190,220,235,0.35)', 'rgba(170,200,220,0.4)', 'rgba(90,110,130,0.6)');
    for (const px of [x, x + 2.5]) sbox(ctx, px, y + 0.95, 0, 0.1, 0.1, 46, '#4f5a65');
    box(ctx, x - 0.1, y - 0.1, 46, 2.8, 1.2, 3, '#2f7d4f', '#276a43', '#205a38');
    A2.bench(ctx, x + 0.4, y + 0.5, 1.8, '#c9a676');
    onPlaneY(ctx, x + 0.2, y + 1.0, 40, (q) => { q.fillStyle = '#ffffff'; roundRect(q, 0, 0, 40, 12, 3); q.fill(); q.fillStyle = '#2f7d4f'; q.font = `6px ${FONT}`; q.fillText('🚌 출근 정류장', 3, 8.4); });
  }

  function fountain(ctx, x, y, t) {
    cylinder(ctx, x, y, 0, 1.0, 8, '#bfe3f5', '#cfc8bc', 'rgba(0,0,0,0.15)');
    cylinder(ctx, x, y, 8, 0.85, 0.1, 'rgba(120,190,230,0.85)', 'rgba(120,190,230,0.85)');
    cylinder(ctx, x, y, 0, 0.18, 22, '#e6e0d6', '#cfc8bc');
    const [sx, sy] = P(x, y, 22);
    ctx.strokeStyle = 'rgba(160,215,245,0.85)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + t * 0.3;
      const h = 8 + Math.sin(t * 4 + i) * 1.5;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + Math.cos(a) * 12, sy - h, sx + Math.cos(a) * 22, sy + 14 + Math.sin(a) * 6); ctx.stroke();
    }
  }

  function monument(ctx, x, y, text) {
    box(ctx, x, y, 0, 1.8, 0.6, 22, '#efe9df', '#ddd5c9', '#cfc6b8', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x + 0.1, y + 0.6, 20, (q) => { q.fillStyle = '#3b332b'; q.font = `bold 8px ${FONT}`; q.fillText(text, 4, 12); q.fillStyle = '#d97757'; q.fillRect(4, 15, 30, 1.6); });
  }

  function car(ctx, x, y, color, dir = 1) {
    // body along x, 1.6 × 0.8
    ellipseFloor(ctx, x + 0.8, y + 0.4, 0.9, 0.5, 0, 'rgba(0,0,0,0.18)');
    box(ctx, x, y, 3, 1.6, 0.8, 9, shade(color, 0.08), shade(color, -0.1), shade(color, -0.2), 'rgba(0,0,0,0.2)');
    box(ctx, x + (dir > 0 ? 0.35 : 0.45), y + 0.08, 12, 0.8, 0.64, 7, '#dbe9f2', '#a9c6d8', '#93b5cb', 'rgba(0,0,0,0.2)');
    for (const [wx, wy] of [[0.3, 0.8], [1.3, 0.8]]) { const [sx, sy] = P(x + wx, y + wy, 3); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(sx, sy, 3.6, 3.6, 0, 0, 7); ctx.fill(); }
    const [hx, hy] = P(x + (dir > 0 ? 1.6 : 0), y + 0.4, 7); ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.arc(hx, hy, 1.6, 0, 7); ctx.fill();
  }

  // ------------------------------------------------------------------ building exteriors
  /** info: { floors:[{busy, urgent, people}], night, t, roofA, wallA } */
  function towerExterior(ctx, b, info) {
    const n = b.levels.length - 1;               // storeys (lobby + offices); the roof is the top
    const FP = info.floorPx, Hb = n * FP;
    const { t, night } = info;
    const x0 = b.x, y0 = b.y, W = b.W, H = b.H;
    ctx.save();
    ctx.globalAlpha *= info.wallA;
    // base shadow
    poly(ctx, [P(x0 + 0.3, y0 + 0.3), P(x0 + W + 1.2, y0 + 0.6), P(x0 + W + 1.2, y0 + H + 1.0), P(x0 + 0.3, y0 + H + 0.4)], 'rgba(40,40,30,0.18)');
    const face = (g, len, dark) => {
      const Wpx = len * 32;
      const gr = g.createLinearGradient(0, 0, 0, Hb);
      gr.addColorStop(0, dark ? '#7f98ab' : '#94adc0'); gr.addColorStop(1, dark ? '#5f7789' : '#728ca0');
      g.fillStyle = gr; g.fillRect(0, 0, Wpx, Hb);
      for (let k = 0; k < n; k++) {
        const fl = info.floors[k] || {};
        const top = Hb - (k + 1) * FP;
        const lit = fl.people > 0 && (night || fl.busy > 0);
        for (let i = 0; i < len; i++) {
          const wx = i * 32 + 3, wy = top + 7, ww = 26, wh = FP - 13;
          let c;
          if (fl.urgent && Math.sin(t * 6 + i * 0.3) > 0) c = 'rgba(255,90,80,0.85)';
          else if (lit) c = (i * 7 + k * 3) % 5 === 0 ? 'rgba(255,240,200,0.65)' : 'rgba(255,226,150,0.9)';
          else c = night ? 'rgba(40,52,80,0.85)' : 'rgba(205,226,240,0.75)';
          g.fillStyle = c; g.fillRect(wx, wy, ww, wh);
          if (!lit && !night) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx + 8, wy); g.lineTo(wx + 13, wy); g.lineTo(wx + 5, wy + wh); g.fill(); }
        }
        g.fillStyle = dark ? '#c9c4bb' : '#dcd7ce'; g.fillRect(0, top + FP - 3, Wpx, 3);
      }
      g.fillStyle = dark ? '#b8b2a8' : '#cfc9bf'; g.fillRect(0, 0, Wpx, 4);
    };
    onPlaneY(ctx, x0, y0 + H, Hb, (g) => {
      face(g, W, false);
      // entrance on the ground floor
      const dx = (b.door.x - x0) * 32;
      g.fillStyle = '#2b3036'; g.fillRect(dx - 40, Hb - FP + 10, 80, FP - 10);
      g.fillStyle = 'rgba(190,220,240,0.6)'; g.fillRect(dx - 36, Hb - FP + 14, 34, FP - 14); g.fillRect(dx + 2, Hb - FP + 14, 34, FP - 14);
      g.fillStyle = '#3b332b'; roundRect(g, dx - 52, Hb - FP - 8, 104, 16, 4); g.fill();
      g.fillStyle = '#f6d58a'; g.font = `10px ${FONT}`; g.textAlign = 'center'; g.fillText('AI 빌딩동', dx, Hb - FP + 4); g.textAlign = 'left';
    });
    onPlaneX(ctx, x0 + W, y0 + H, Hb, (g) => face(g, H, true));
    // canopy over the entrance
    box(ctx, b.door.x - 1.6, y0 + H, FP - 12, 3.2, 0.9, 4, '#f2efe9', '#d9d3c9', '#cfc8bc', 'rgba(0,0,0,0.15)');
    ctx.restore();
    // roof
    ctx.save();
    ctx.globalAlpha *= info.roofA;
    poly(ctx, [P(x0, y0, Hb), P(x0 + W, y0, Hb), P(x0 + W, y0 + H, Hb), P(x0, y0 + H, Hb)], '#c9c2b6', 'rgba(0,0,0,0.15)');
    poly(ctx, [P(x0 + 1, y0 + 8, Hb), P(x0 + 12, y0 + 8, Hb), P(x0 + 12, y0 + 19, Hb), P(x0 + 1, y0 + 19, Hb)], '#8fc47a');
    poly(ctx, [P(x0 + 23, y0 + 8, Hb), P(x0 + 33, y0 + 8, Hb), P(x0 + 33, y0 + 19, Hb), P(x0 + 23, y0 + 19, Hb)], '#b8b6b0');
    box(ctx, x0 + 12.7, y0, Hb, 6.6, 2.2, 22, '#e6e0d6', '#d6cfc3', '#c9c1b4', 'rgba(0,0,0,0.12)');
    for (const [px, py, c] of [[3.5, 11.5, '#e2667f'], [8.5, 11.5, '#4e7cf6'], [3.5, 16.5, '#3fb27f'], [8.5, 16.5, '#e9a23b']]) {
      const [sx, sy] = P(x0 + px, y0 + py, Hb + 16); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(sx, sy, 15, 7, 0, 0, 7); ctx.fill();
    }
    box(ctx, x0, y0 + H - 0.12, Hb, W, 0.12, 8, '#e9e4dc', '#d6cfc3', '#c9c1b4');
    box(ctx, x0 + W - 0.12, y0, Hb, 0.12, H, 8, '#e9e4dc', '#d6cfc3', '#c9c1b4');
    ctx.restore();
  }

  function factoryExterior(ctx, b, info) {
    const Hf = 92, x0 = b.x, y0 = b.y, W = b.W, H = b.H, t = info.t;
    ctx.save();
    ctx.globalAlpha *= info.wallA;
    poly(ctx, [P(x0 + 0.3, y0 + 0.3), P(x0 + W + 0.9, y0 + 0.5), P(x0 + W + 0.9, y0 + H + 0.7), P(x0 + 0.3, y0 + H + 0.4)], 'rgba(40,40,30,0.18)');
    const face = (g, len, dark) => {
      const Wpx = len * 32;
      g.fillStyle = dark ? '#a9b2ba' : '#bcc5cc'; g.fillRect(0, 0, Wpx, Hf);
      g.strokeStyle = 'rgba(60,70,80,0.18)'; g.lineWidth = 1; for (let i = 0; i < Wpx; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, Hf); g.stroke(); }
      g.fillStyle = '#3f74b8'; g.fillRect(0, Hf - 22, Wpx, 6);
      for (let i = 1; i < len - 1; i += 3) { g.fillStyle = info.night && info.people ? 'rgba(255,220,140,0.85)' : 'rgba(200,225,240,0.8)'; g.fillRect(i * 32, 14, 70, 16); g.fillStyle = '#5f6b77'; g.fillRect(i * 32 + 34, 14, 2, 16); }
    };
    onPlaneY(ctx, x0, y0 + H, Hf, (g) => {
      face(g, W, false);
      const dx = (b.door.x - x0) * 32;
      g.fillStyle = '#7d868e'; g.fillRect(dx - 52, Hf - 64, 104, 64);
      g.strokeStyle = 'rgba(40,40,40,0.3)'; for (let k = Hf - 62; k < Hf; k += 4) { g.beginPath(); g.moveTo(dx - 50, k); g.lineTo(dx + 50, k); g.stroke(); }
      g.fillStyle = '#f2c230'; g.fillRect(dx - 52, Hf - 66, 104, 3);
      g.fillStyle = '#2f3a44'; roundRect(g, dx + 64, 30, 110, 18, 4); g.fill();
      g.fillStyle = '#f2c230'; g.font = `11px ${FONT}`; g.fillText('🏭 AI 공장동', dx + 72, 43);
    });
    onPlaneX(ctx, x0 + W, y0 + H, Hf, (g) => face(g, H, true));
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= info.roofA;
    poly(ctx, [P(x0, y0, Hf), P(x0 + W, y0, Hf), P(x0 + W, y0 + H, Hf), P(x0, y0 + H, Hf)], '#9aa3ab');
    for (let x = x0; x < x0 + W - 0.1; x += 3) {
      const x1 = Math.min(x0 + W, x + 2.4);
      poly(ctx, [P(x, y0, Hf), P(x1, y0, Hf + 18), P(x1, y0 + H, Hf + 18), P(x, y0 + H, Hf)], '#b5bdc4', 'rgba(0,0,0,0.12)');
      poly(ctx, [P(x1, y0, Hf + 18), P(x1, y0 + H, Hf + 18), P(x1, y0 + H, Hf), P(x1, y0, Hf)], 'rgba(180,215,235,0.85)', 'rgba(80,100,120,0.4)');
    }
    // chimney + smoke
    const cx = x0 + W - 3, cy = y0 + 2;
    cylinder(ctx, cx, cy, Hf, 0.6, 70, '#d9d4cb', '#c4623d');
    for (let k = 0; k < 3; k++) { const [sx, sy] = P(cx, cy, Hf + 74 + k * 8); ctx.fillStyle = '#efefef'; ctx.fillRect(sx - 12, sy - 4, 24, 3); }
    const puff = info.people ? 5 : 2;
    for (let i = 0; i < puff; i++) {
      const k = ((t * 0.25 + i / puff) % 1);
      const [sx, sy] = P(cx, cy, Hf + 72 + k * 70);
      ctx.fillStyle = `rgba(235,235,235,${0.75 * (1 - k)})`; ctx.beginPath(); ctx.arc(sx + k * 30, sy, 6 + k * 14, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ elevator
  function elevCab(ctx, f, open) {
    const { x, y, w, d } = f, H = 70;
    // shaft back + sides (dark), cabin floor, back wall with mirror + handrail
    poly(ctx, [P(x, y, 0), P(x + w, y, 0), P(x + w, y, H), P(x, y, H)], '#b9bfc5');
    poly(ctx, [P(x + 0.15, y, 8), P(x + w - 0.15, y, 8), P(x + w - 0.15, y, 52), P(x + 0.15, y, 52)], open > 0.05 ? 'rgba(220,235,245,0.9)' : '#a9b0b6');
    poly(ctx, [P(x + 0.25, y, 26), P(x + w - 0.25, y, 26), P(x + w - 0.25, y, 28), P(x + 0.25, y, 28)], '#8d949b');
    box(ctx, x - 0.08, y, 0, 0.08, d, H, '#9aa1a7', '#a3aaaf', '#9aa1a7');
    poly(ctx, [P(x, y, 1), P(x + w, y, 1), P(x + w, y + d, 1), P(x, y + d, 1)], '#d6dadd');
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 0.7;
    for (let i = 0.25; i < w; i += 0.25) { ctx.beginPath(); ctx.moveTo(...P(x + i, y, 1)); ctx.lineTo(...P(x + i, y + d, 1)); ctx.stroke(); }
    poly(ctx, [P(x + 0.2, y + 0.2, H - 2), P(x + w - 0.2, y + 0.2, H - 2), P(x + w - 0.2, y + 0.5, H - 2), P(x + 0.2, y + 0.5, H - 2)], open > 0.05 ? '#fff8e0' : '#c9cdd1');
  }

  function elevDoor(ctx, f, open, label, moving, t) {
    const { x, y, w, d } = f, H = 64, Wl = w * 32;
    const yy = y + d;
    // side wall (east) of the shaft drawn in front so the cabin reads as a box
    box(ctx, x + w, y, 0, 0.1, d, 72, '#c4cacf', '#b2b8be', '#a5abb1');
    onPlaneY(ctx, x, yy, 76, (g) => {
      // frame
      g.fillStyle = '#7d858c'; g.fillRect(-4, 0, Wl + 8, 12); g.fillRect(-4, 12, 4, H); g.fillRect(Wl, 12, 4, H);
      // panels
      const half = Wl / 2, slide = half * Math.max(0, Math.min(1, open));
      const steel = (px, pw) => { if (pw <= 0.5) return; const gr = g.createLinearGradient(px, 0, px + pw, 0); gr.addColorStop(0, '#d3d8dc'); gr.addColorStop(0.5, '#eef1f3'); gr.addColorStop(1, '#c2c8cd'); g.fillStyle = gr; g.fillRect(px, 12, pw, H); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(px + pw - 1, 12, 1, H); };
      steel(0, half - slide); steel(half + slide, half - slide);
      // indicator
      g.fillStyle = '#1d2024'; roundRect(g, Wl / 2 - 12, 2, 24, 8, 2); g.fill();
      g.fillStyle = '#ffb347'; g.font = `6px ${FONT}`; g.textAlign = 'center';
      g.fillText(moving ? (Math.sin(t * 6) > 0 ? '▲▼' : label) : label, Wl / 2, 8.4); g.textAlign = 'left';
    });
  }

  function elevPanel(ctx, f, label, t) {
    onPlaneY(ctx, f.x - 0.5, f.y - 0.3, 66, (g) => {
      g.fillStyle = '#3b332b'; roundRect(g, 4, 0, 24, 30, 3); g.fill();
      g.fillStyle = '#f6d58a'; g.font = `5px ${FONT}`; g.textAlign = 'center'; g.fillText(label, 16, 8); g.textAlign = 'left';
      g.fillStyle = '#e9eef5'; g.font = `3.4px ${FONT}`; ['R 옥상정원', '2F~ 업무층', '1F 로비·카페'].forEach((s, i) => g.fillText(s, 6, 15 + i * 5));
      g.fillStyle = '#d9dde1'; g.fillRect(12, 32, 8, 12); g.fillStyle = '#f2c230'; g.beginPath(); g.arc(16, 36, 1.5, 0, 7); g.fill(); g.beginPath(); g.arc(16, 41, 1.5, 0, 7); g.fill();
    });
  }

  function elevHutRoof(ctx, f) {
    box(ctx, f.x - 0.2, f.y - 0.05, 0, 0.2, f.d, 74, '#e6e0d6', '#d6cfc3', '#c9c1b4');
    box(ctx, f.x + f.w, f.y - 0.05, 0, 0.2, f.d, 74, '#e6e0d6', '#d6cfc3', '#c9c1b4');
    box(ctx, f.x - 0.2, f.y - 0.05, 74, f.w + 0.4, f.d + 0.1, 6, '#d9d4cb', '#c9c3b8', '#bab3a7', 'rgba(0,0,0,0.12)');
  }

  // ------------------------------------------------------------------ lobby / cafe / roof props
  function cafeCounter(ctx, f, t) {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.8, 26, '#f4f1ec', '#8a6247', '#7a5540', 'rgba(0,0,0,0.12)');
    box(ctx, x - 0.05, y - 0.05, 26, w + 0.1, 0.9, 2.5, '#e9dcc3', '#d9c7a4', '#cdb894');
    // espresso machine
    box(ctx, x + 0.3, y + 0.15, 28.5, 1.0, 0.5, 15, '#c0c6cc', '#a9b0b6', '#9aa1a7', 'rgba(0,0,0,0.12)');
    box(ctx, x + 0.3, y + 0.15, 43.5, 1.0, 0.5, 2, '#2e2e2e', '#262626', '#1f1f1f');
    for (let k = 0; k < 3; k++) { const [sx, sy] = P(x + 0.6 + k * 0.3, y + 0.62, 33); ctx.strokeStyle = 'rgba(200,200,200,0.55)'; ctx.lineWidth = 0.9; ctx.beginPath(); const o = Math.sin(t * 3 + k) * 1.5; ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + o, sy - 5, sx, sy - 10); ctx.stroke(); }
    // pastry case
    box(ctx, x + 2.0, y + 0.1, 28.5, 1.8, 0.6, 12, 'rgba(220,240,250,0.55)', 'rgba(200,225,240,0.5)', 'rgba(190,215,232,0.5)', 'rgba(90,110,130,0.5)');
    const pc = ['#d9a066', '#f0c27a', '#e2667f', '#8b5a3c', '#f7e27a'];
    for (let k = 0; k < 6; k++) { const [sx, sy] = P(x + 2.2 + k * 0.27, y + 0.4, 32); ctx.fillStyle = pc[k % pc.length]; ctx.beginPath(); ctx.ellipse(sx, sy, 3.2, 2, 0, 0, 7); ctx.fill(); }
    // register + cups
    box(ctx, x + w - 1.2, y + 0.2, 28.5, 0.6, 0.45, 6, '#3b3f45', '#2d3035', '#26292d');
    for (let k = 0; k < 4; k++) cylinder(ctx, x + 4.2 + k * 0.25, y + 0.55, 28.5, 0.07, 6, '#fff', '#f2efe9');
    onPlaneY(ctx, x + 0.2, y + 0.8, 22, (g) => { g.fillStyle = '#f6d58a'; g.font = `7px ${FONT}`; g.fillText('☕ AI CAFE', 6, 12); });
  }

  function menuBoard(ctx, x0) {
    onPlaneY(ctx, x0, 0.02, 88, (g) => {
      g.fillStyle = '#2f3a30'; roundRect(g, 0, 0, 120, 34, 3); g.fill();
      g.strokeStyle = '#8a6247'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#f6efd8'; g.font = `5.5px ${FONT}`; g.fillText('MENU', 6, 8);
      g.font = `4px ${FONT}`; g.fillStyle = '#e8e3cf';
      [['아메리카노', '토큰 1K'], ['카페라떼', '토큰 1.5K'], ['생각 에스프레소', 'thinking'], ['디버그 스무디', '🐛 free']].forEach(([a, b], i) => { g.fillText(a, 6, 15 + i * 5); g.fillText(b, 70, 15 + i * 5); });
    });
  }

  function highTable(ctx, f) {
    const { x, y, w } = f;
    for (const lx of [x + 0.3, x + w - 0.4]) sbox(ctx, lx, y + 0.2, 0, 0.1, 0.1, 28, '#5d6166');
    box(ctx, x, y, 28, w, 0.6, 2.5, '#8a6247', '#7a5540', '#6b4a35', 'rgba(0,0,0,0.15)');
  }
  function barStool(ctx, x, y) {
    ellipseFloor(ctx, x + 0.05, y + 0.05, 0.2, 0.2, 0, 'rgba(60,40,20,0.12)');
    sbox(ctx, x - 0.03, y - 0.03, 0, 0.06, 0.06, 14, '#5d6166');
    cylinder(ctx, x, y, 14, 0.22, 3, '#a87a52', '#8a6247');
  }

  function entrance(ctx, f, open) {
    const { x, y, w } = f;
    const H = 58, top = Math.max(H, f.h || H), L = top - H;   // 옆벽이 문보다 높으면(옥상 엘리베이터실 82) 문 위를 같은 벽으로 막는다
    onPlaneY(ctx, x, y, top, (g) => {
      const Wl = w * 32, half = Wl / 2, s = half * 0.9 * open;
      if (L > 0) { g.fillStyle = f.color || '#e6e0d6'; g.fillRect(-3, 0, Wl + 6, L); g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(-3, L - 2, Wl + 6, 2); }
      g.fillStyle = '#6d757c'; g.fillRect(-3, L, Wl + 6, 5);
      g.fillStyle = 'rgba(190,220,240,0.28)'; g.fillRect(0 - s, L + 5, half, H - 5); g.fillRect(half + s, L + 5, half, H - 5);
      g.strokeStyle = 'rgba(110,130,145,0.6)'; g.lineWidth = 1; g.strokeRect(0 - s, L + 5, half, H - 5); g.strokeRect(half + s, L + 5, half, H - 5);
      g.fillStyle = '#f6d58a'; g.font = `4px ${FONT}`; g.textAlign = 'center'; g.fillText('자동문 · AUTO', Wl / 2, L + 3.8); g.textAlign = 'left';
    });
  }

  function shutterFront(ctx, f) {
    const { x, y, w } = f;
    sbox(ctx, x - 0.1, y - 0.05, 0, 0.1, 0.1, 70, '#5f6b77');
    sbox(ctx, x + w, y - 0.05, 0, 0.1, 0.1, 70, '#5f6b77');
    box(ctx, x - 0.1, y - 0.1, 62, w + 0.2, 0.2, 10, '#8d959c', '#7f878e', '#737a80');
    onPlaneY(ctx, x, y + 0.1, 72, (g) => { g.fillStyle = '#f2c230'; g.fillRect(0, 0, w * 32, 2); g.fillStyle = '#2b2b2b'; for (let i = 0; i < w * 32; i += 8) g.fillRect(i, 0, 4, 2); });
  }

  function ashtray(ctx, x, y, t) {
    sbox(ctx, x - 0.06, y - 0.06, 0, 0.12, 0.12, 24, '#6d7175');
    cylinder(ctx, x, y, 24, 0.2, 3, '#9aa1a7', '#7d858c');
    const [sx, sy] = P(x, y, 28);
    ctx.strokeStyle = 'rgba(200,200,200,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); const o = Math.sin(t * 2 + x) * 2; ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + o, sy - 6, sx - o, sy - 14); ctx.stroke();
  }
  function smokeSign(ctx, x, y) {
    sbox(ctx, x, y, 0, 0.08, 0.08, 40, '#5d6166');
    onPlaneY(ctx, x - 0.4, y + 0.08, 52, (g) => { g.fillStyle = '#ffffff'; roundRect(g, 0, 0, 30, 12, 3); g.fill(); g.strokeStyle = '#6b6b6b'; g.stroke(); g.fillStyle = '#3b332b'; g.font = `5px ${FONT}`; g.fillText('🚬 흡연구역', 2, 8.5); });
  }

  function windowOnBackWall(ctx, x0, sky, t) {
    onPlaneY(ctx, x0, 0.02, 86, (g) => {
      const W = 64, H = 46;
      g.fillStyle = '#f6f5f2'; g.fillRect(-2, -2, W + 4, H + 4);
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = sky.bld; for (let i = 0; i < 6; i++) { const bh = 8 + ((i * 41 + x0 * 7) % 15); g.fillRect(i * 11, H - bh, 9, bh); }
      if (sky.stars) { g.fillStyle = '#ffe9a8'; for (let i = 0; i < 6; i++) if ((i + Math.floor(x0)) % 3 === 0) g.fillRect(i * 11 + 3, H - 6, 1.5, 1.5); }
      g.fillStyle = '#f6f5f2'; g.fillRect(W / 2 - 1, 0, 2, H); g.fillRect(0, H / 2 - 1, W, 2);
    });
  }

  AIO.art3 = { ground, tree, streetLamp, busStop, fountain, monument, car, towerExterior, factoryExterior, elevCab, elevDoor, elevPanel, elevHutRoof, cafeCounter, menuBoard, highTable, barStool, entrance, shutterFront, ashtray, smokeSign, windowOnBackWall };
})();
