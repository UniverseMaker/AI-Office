// Extra art for the premium office (rooms, glass walls, exec room, meeting room, server room, elevator, rooftop)
// and the factory (machines with stack lights, conveyor lines, pallets, racks, vending machines).
(function () {
  const { P, shade, rgba, poly, box, sbox, cylinder, ellipseFloor, onPlaneY, onPlaneX, roundRect } = AIO.iso;
  const A = AIO.art;
  const FONT = A.FONT;

  // ------------------------------------------------------------------ floors (static cache)
  function floor(g, x, y, w, d, style, color, seed = 1) {
    const base = color || { wood: '#eadcc3', carpet: '#d9d4cc', marble: '#f2efe9', concrete: '#c9c8c3', tile: '#eeeae3', grass: '#9fcf8a', deck: '#c9a57a', raised: '#d5d9dd' }[style] || '#eadcc3';
    poly(g, [P(x, y), P(x + w, y), P(x + w, y + d), P(x, y + d)], base);
    const r = AIO.rand(seed * 131 + 7);
    const X = AIO.floorStyles && AIO.floorStyles[style];   // 플러그인 바닥 재질 (props.js)
    if (X) { X(g, x, y, w, d, color || X.base || base, r, seed); return; }
    switch (style) {
      case 'carpet': {
        for (let i = 0; i < w * d * 14; i++) { const px = x + r() * w, py = y + r() * d; const [sx, sy] = P(px, py); g.fillStyle = r() < 0.5 ? shade(base, -0.06) : shade(base, 0.05); g.fillRect(sx, sy, 1.2, 1.2); }
        break;
      }
      case 'marble': {
        for (let i = 0; i <= w; i += 2) poly(g, [P(x + i, y), P(x + i, y + d)], null, 'rgba(0,0,0,0.06)');
        for (let j = 0; j <= d; j += 2) poly(g, [P(x, y + j), P(x + w, y + j)], null, 'rgba(0,0,0,0.06)');
        g.strokeStyle = 'rgba(150,140,130,0.18)'; g.lineWidth = 0.8;
        for (let i = 0; i < w * d / 3; i++) { const px = x + r() * w, py = y + r() * d; g.beginPath(); g.moveTo(...P(px, py)); g.quadraticCurveTo(...P(px + r() - 0.5, py + 0.6), ...P(px + r() * 1.2 - 0.6, py + 1.1)); g.stroke(); }
        break;
      }
      case 'concrete': {
        for (let i = 0; i < w * d * 10; i++) { const [sx, sy] = P(x + r() * w, y + r() * d); g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'; g.fillRect(sx, sy, 1.5, 1.5); }
        g.strokeStyle = 'rgba(80,80,80,0.12)'; g.lineWidth = 0.8;
        for (let i = 0; i <= w; i += 4) { g.beginPath(); g.moveTo(...P(x + i, y)); g.lineTo(...P(x + i, y + d)); g.stroke(); }
        for (let j = 0; j <= d; j += 4) { g.beginPath(); g.moveTo(...P(x, y + j)); g.lineTo(...P(x + w, y + j)); g.stroke(); }
        break;
      }
      case 'tile': case 'raised': {
        g.strokeStyle = style === 'raised' ? 'rgba(90,100,110,0.25)' : 'rgba(150,140,125,0.22)'; g.lineWidth = 0.7;
        const st = style === 'raised' ? 1 : 0.5;
        for (let i = 0; i <= w + 1e-6; i += st) { g.beginPath(); g.moveTo(...P(x + i, y)); g.lineTo(...P(x + i, y + d)); g.stroke(); }
        for (let j = 0; j <= d + 1e-6; j += st) { g.beginPath(); g.moveTo(...P(x, y + j)); g.lineTo(...P(x + w, y + j)); g.stroke(); }
        if (style === 'raised') { g.fillStyle = 'rgba(80,90,100,0.18)'; for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) for (let k = 0; k < 3; k++) { const [sx, sy] = P(x + i + 0.3 + k * 0.2, y + j + 0.5); g.fillRect(sx, sy, 1, 1); } }
        break;
      }
      case 'grass': {
        for (let i = 0; i < w * d * 16; i++) { const [sx, sy] = P(x + r() * w, y + r() * d); g.strokeStyle = r() < 0.5 ? '#7fb86a' : '#b6dca0'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + (r() - 0.5) * 2, sy - 2.5); g.stroke(); }
        break;
      }
      case 'deck': {
        for (let j = 0; j < d * 2; j++) poly(g, [P(x, y + j / 2), P(x + w, y + j / 2), P(x + w, y + (j + 1) / 2), P(x, y + (j + 1) / 2)], j % 2 ? shade(base, 0.05) : base, 'rgba(90,60,30,0.2)', 0.6);
        break;
      }
      default: { // wood planks
        const cols = [base, shade(base, 0.03), shade(base, -0.03), shade(base, 0.06)];
        for (let j = 0; j < d * 3; j++) {
          const rr = AIO.rand(j * 977 + seed);
          let px = -rr() * 2;
          while (px < w) {
            const len = 1.3 + rr() * 2.2, x0 = Math.max(0, px), x1 = Math.min(w, px + len);
            if (x1 > x0) poly(g, [P(x + x0, y + j / 3), P(x + x1, y + j / 3), P(x + x1, y + (j + 1) / 3), P(x + x0, y + (j + 1) / 3)], cols[Math.floor(rr() * cols.length)], 'rgba(150,115,70,0.13)', 0.5);
            px += len;
          }
        }
      }
    }
  }

  function hazardRect(g, x, y, w, d) {
    // yellow/black safety border on the floor
    const seg = 0.5;
    const edge = (x0, y0, x1, y1) => {
      const len = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(len / seg);
      for (let i = 0; i < n; i++) {
        const a = i / n, b = Math.min(1, (i + 1) / n);
        const ax = x0 + (x1 - x0) * a, ay = y0 + (y1 - y0) * a, bx = x0 + (x1 - x0) * b, by = y0 + (y1 - y0) * b;
        const nx = (y1 - y0) / len * 0.12, ny = -(x1 - x0) / len * 0.12;
        poly(g, [P(ax, ay), P(bx, by), P(bx + nx, by + ny), P(ax + nx, ay + ny)], i % 2 ? '#2b2b2b' : '#f2c230');
      }
    };
    edge(x, y, x + w, y); edge(x + w, y, x + w, y + d); edge(x + w, y + d, x, y + d); edge(x, y + d, x, y);
  }

  function lane(g, x, y, w, d) { poly(g, [P(x, y), P(x + w, y), P(x + w, y + d), P(x, y + d)], 'rgba(120,180,120,0.22)', 'rgba(70,140,70,0.45)', 1); }

  // ------------------------------------------------------------------ outer walls (static cache)
  function outerWalls(g, L, style, WALL) {
    const W = L.W, H = L.H;
    if (style === 'roof') {
      // parapet + glass railing
      poly(g, [P(0, 0, 0), P(0, H, 0), P(0, H, 10), P(0, 0, 10)], '#cfc8bc');
      poly(g, [P(0, 0, 0), P(W, 0, 0), P(W, 0, 10), P(0, 0, 10)], '#c6bfb3');
      poly(g, [P(0, 0, 10), P(0, H, 10), P(0, H, 38), P(0, 0, 38)], 'rgba(190,220,235,0.35)', 'rgba(120,150,170,0.5)');
      poly(g, [P(0, 0, 10), P(W, 0, 10), P(W, 0, 38), P(0, 0, 38)], 'rgba(190,220,235,0.35)', 'rgba(120,150,170,0.5)');
      g.strokeStyle = '#9aa3a8'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(...P(0, H, 38)); g.lineTo(...P(0, 0, 38)); g.lineTo(...P(W, 0, 38)); g.stroke();
      return;
    }
    const premium = style === 'premium', factory = style === 'factory';
    const c1 = factory ? '#c3c8cc' : premium ? '#ece7df' : '#e7e4de';
    const c2 = factory ? '#b5bbc0' : premium ? '#e2dcd2' : '#dcd8d1';
    poly(g, [P(0, 0, 0), P(0, H, 0), P(0, H, WALL), P(0, 0, WALL)], c1);
    poly(g, [P(0, 0, 0), P(W, 0, 0), P(W, 0, WALL), P(0, 0, WALL)], c2);
    if (premium) {
      // wainscoting + crown molding
      poly(g, [P(0, 0, 0), P(0, H, 0), P(0, H, 34), P(0, 0, 34)], '#8b6f5a');
      poly(g, [P(0, 0, 0), P(W, 0, 0), P(W, 0, 34), P(0, 0, 34)], '#7e6450');
      g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 0.8;
      for (let i = 0.5; i < W; i += 1) { onPlaneY(g, i, 0.01, 32, (q) => { q.strokeStyle = 'rgba(255,240,220,0.22)'; q.strokeRect(2, 3, 28, 26); }); }
      for (let i = 0.5; i < H; i += 1) { onPlaneX(g, 0.01, i + 1, 32, (q) => { q.strokeStyle = 'rgba(255,240,220,0.22)'; q.strokeRect(2, 3, 28, 26); }); }
      poly(g, [P(0, 0, 34), P(0, H, 34), P(0, H, 36), P(0, 0, 36)], '#c9a676');
      poly(g, [P(0, 0, 34), P(W, 0, 34), P(W, 0, 36), P(0, 0, 36)], '#b8955f');
      poly(g, [P(0, 0, WALL - 5), P(0, H, WALL - 5), P(0, H, WALL), P(0, 0, WALL)], '#f6f3ee');
      poly(g, [P(0, 0, WALL - 5), P(W, 0, WALL - 5), P(W, 0, WALL), P(0, 0, WALL)], '#efebe4');
    } else if (factory) {
      // corrugated metal + high window band + steel columns
      g.strokeStyle = 'rgba(70,80,90,0.18)'; g.lineWidth = 1;
      for (let i = 0; i < W; i += 0.25) { g.beginPath(); g.moveTo(...P(i, 0, 0)); g.lineTo(...P(i, 0, WALL)); g.stroke(); }
      for (let i = 0; i < H; i += 0.25) { g.beginPath(); g.moveTo(...P(0, i, 0)); g.lineTo(...P(0, i, WALL)); g.stroke(); }
      poly(g, [P(0, 0, 0), P(0, H, 0), P(0, H, 18), P(0, 0, 18)], '#8d959c');
      poly(g, [P(0, 0, 0), P(W, 0, 0), P(W, 0, 18), P(0, 0, 18)], '#838b92');
      for (let i = 3; i < W; i += 4) sbox(g, i, 0.02, 0, 0.25, 0.2, WALL, '#5f6b77');
      for (let i = 3; i < H; i += 4) sbox(g, 0.02, i, 0, 0.2, 0.25, WALL, '#5f6b77');
    } else {
      poly(g, [P(0, 0, 0), P(0, H, 0), P(0, H, 5), P(0, 0, 5)], '#d3cec6');
      poly(g, [P(0, 0, 0), P(W, 0, 0), P(W, 0, 5), P(0, 0, 5)], '#cbc6bd');
    }
    const cap = factory ? '#9aa2a9' : '#f4f2ee';
    poly(g, [P(0, 0, WALL), P(0, H, WALL), P(-0.18, H, WALL), P(-0.18, -0.18, WALL)], cap, 'rgba(0,0,0,0.08)');
    poly(g, [P(-0.18, -0.18, WALL), P(W, -0.18, WALL), P(W, 0, WALL), P(0, 0, WALL)], cap, 'rgba(0,0,0,0.08)');
    poly(g, [P(-0.18, H, WALL), P(0, H, WALL), P(0, H, -14), P(-0.18, H, -14)], factory ? '#7f8890' : '#cfc9bf');
    poly(g, [P(W, -0.18, WALL), P(W, 0, WALL), P(W, 0, -14), P(W, -0.18, -14)], factory ? '#737c84' : '#bfb8ad');
  }

  function slab(g, L, color) {
    const W = L.W, H = L.H;
    poly(g, [P(0, H, 0), P(W, H, 0), P(W, H, -14), P(0, H, -14)], shade(color, -0.12));
    poly(g, [P(W, 0, 0), P(W, H, 0), P(W, H, -14), P(W, 0, -14)], shade(color, -0.22));
  }

  function factoryWindows(g, W, t, sky) {
    // band of high windows along the back wall
    for (let x = 1; x < W - 1; x += 2) {
      onPlaneY(g, x, 0.02, 98, (q) => {
        const gr = q.createLinearGradient(0, 0, 0, 22); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]);
        q.fillStyle = '#5f6b77'; q.fillRect(-1.5, -1.5, 59, 25);
        q.fillStyle = gr; q.fillRect(0, 0, 56, 22);
        q.fillStyle = '#5f6b77'; for (let k = 1; k < 4; k++) q.fillRect(k * 14 - 0.6, 0, 1.2, 22); q.fillRect(0, 10.4, 56, 1.2);
      });
    }
  }

  function shutterDoor(g, y0) {
    onPlaneX(g, 0.02, y0, 84, (q) => {
      q.fillStyle = '#5f6b77'; q.fillRect(-4, -4, 72, 88);
      q.fillStyle = '#b9c1c8'; q.fillRect(0, 0, 64, 84);
      q.strokeStyle = 'rgba(60,70,80,0.35)'; q.lineWidth = 1; for (let i = 3; i < 84; i += 3.5) { q.beginPath(); q.moveTo(0, i); q.lineTo(64, i); q.stroke(); }
      q.fillStyle = '#f2c230'; q.fillRect(0, 80, 64, 4); q.fillStyle = '#2b2b2b'; for (let i = 0; i < 64; i += 8) q.fillRect(i, 80, 4, 4);
      q.fillStyle = '#2f7d4f'; q.fillRect(14, -16, 36, 9); q.fillStyle = '#fff'; q.font = `6px ${FONT}`; q.fillText('입고 · 출근', 19, -9.4);
    });
  }

  function elevatorDoorStatic(g, y0, label) {
    onPlaneX(g, 0.02, y0, 76, (q) => {
      q.fillStyle = '#8d949b'; q.fillRect(-4, -12, 50, 88);
      q.fillStyle = '#c9cfd4'; q.fillRect(0, 0, 21, 76); q.fillRect(21.5, 0, 21, 76);
      q.fillStyle = 'rgba(255,255,255,0.35)'; q.fillRect(2, 2, 3, 72); q.fillRect(23.5, 2, 3, 72);
      q.fillStyle = '#2b2f33'; q.fillRect(10, -10, 22, 7);
      q.fillStyle = '#ffb347'; q.font = `5px ${FONT}`; q.fillText(label, 13, -4.6);
      q.fillStyle = '#d9dee2'; q.fillRect(46, 32, 5, 10); q.fillStyle = '#f2c230'; q.beginPath(); q.arc(48.5, 35, 1.3, 0, 7); q.fill(); q.beginPath(); q.arc(48.5, 39.5, 1.3, 0, 7); q.fill();
    });
  }

  // ------------------------------------------------------------------ interior walls / doors (sorted)
  function wallSeg(ctx, f) {
    const H = f.h || 72;
    const glass = f.glass || f.frosted;
    const base = glass ? 10 : H;
    const col = f.color || '#e9e5de';
    if (f.axis === 'x') {
      box(ctx, f.x, f.y - 0.05, 0, 1, 0.1, base, shade(col, 0.05), shade(col, -0.06), shade(col, -0.16));
      if (glass) {
        poly(ctx, [P(f.x, f.y, base), P(f.x + 1, f.y, base), P(f.x + 1, f.y, H), P(f.x, f.y, H)], f.frosted ? 'rgba(235,240,245,0.62)' : 'rgba(195,225,240,0.2)');
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(...P(f.x + 0.2, f.y, base + 6)); ctx.lineTo(...P(f.x + 0.45, f.y, H - 8)); ctx.stroke();
        box(ctx, f.x, f.y - 0.04, H, 1, 0.08, 3, '#8f969c', '#80878d', '#737a80');
        sbox(ctx, f.x - 0.03, f.y - 0.04, base, 0.06, 0.08, H - base, '#9aa1a7');
      }
    } else {
      box(ctx, f.x - 0.05, f.y, 0, 0.1, 1, base, shade(col, 0.05), shade(col, -0.06), shade(col, -0.16));
      if (glass) {
        poly(ctx, [P(f.x, f.y, base), P(f.x, f.y + 1, base), P(f.x, f.y + 1, H), P(f.x, f.y, H)], f.frosted ? 'rgba(235,240,245,0.62)' : 'rgba(195,225,240,0.2)');
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(...P(f.x, f.y + 0.8, base + 6)); ctx.lineTo(...P(f.x, f.y + 0.55, H - 8)); ctx.stroke();
        box(ctx, f.x - 0.04, f.y, H, 0.08, 1, 3, '#8f969c', '#80878d', '#737a80');
        sbox(ctx, f.x - 0.04, f.y - 0.03, base, 0.08, 0.06, H - base, '#9aa1a7');
      }
    }
  }

  function doorframe(ctx, f) {
    const H = 72;
    const c = '#8f969c';
    if (f.axis === 'x') {
      sbox(ctx, f.x - 0.04, f.y - 0.05, 0, 0.08, 0.1, H, c);
      sbox(ctx, f.x + 0.96, f.y - 0.05, 0, 0.08, 0.1, H, c);
      box(ctx, f.x, f.y - 0.05, H - 8, 1, 0.1, 8, '#a7adb3', '#959ba1', '#878d93');
    } else {
      sbox(ctx, f.x - 0.05, f.y - 0.04, 0, 0.1, 0.08, H, c);
      sbox(ctx, f.x - 0.05, f.y + 0.96, 0, 0.1, 0.08, H, c);
      box(ctx, f.x - 0.05, f.y, H - 8, 0.1, 1, 8, '#a7adb3', '#959ba1', '#878d93');
    }
  }

  // ------------------------------------------------------------------ premium furniture
  function execDesk(ctx, f, papers, t) {
    const { x, y, w, d } = f;
    poly(ctx, [P(x + 0.1, y + 0.15), P(x + w + 0.15, y + 0.15), P(x + w + 0.15, y + d + 0.2), P(x + 0.1, y + d + 0.2)], 'rgba(60,40,20,0.14)');
    box(ctx, x + 0.05, y + 0.05, 0, w - 0.1, d - 0.1, 24, '#6b4a35', '#5a3d2b', '#4c3324', 'rgba(0,0,0,0.15)');
    box(ctx, x, y, 24, w, d, 3, '#8a6247', '#7a5540', '#6b4a35', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x + 0.2, y + d - 0.05, 22, (g) => { g.strokeStyle = 'rgba(255,220,170,0.25)'; g.lineWidth = 0.8; g.strokeRect(2, 2, (w - 0.4) * 32 - 4, 18); });
    // nameplate
    box(ctx, x + w / 2 - 0.45, y + d - 0.25, 27, 0.9, 0.12, 5, '#2b2622', '#221e1b', '#1a1714');
    onPlaneY(ctx, x + w / 2 - 0.45, y + d - 0.13, 32, (g) => { g.fillStyle = '#f6d58a'; g.font = `4.2px ${FONT}`; g.fillText(f.label || '👑 대표', 3, 4); });
    // inbox tray with decision papers
    box(ctx, x + 0.25, y + 0.3, 27, 0.6, 0.45, 2, '#c9a676', '#b8955f', '#a8854f');
    const n = Math.min(10, papers);
    for (let i = 0; i < n; i++) box(ctx, x + 0.3 + (i % 2) * 0.02, y + 0.33, 29 + i * 1.3, 0.5, 0.38, 1.1, i % 3 === 0 ? '#ffd9d6' : '#fff', '#e8e2da', '#ddd6cd');
    if (n) { const [sx, sy] = P(x + 0.55, y + 0.5, 32 + n * 1.3); ctx.fillStyle = '#e5534b'; ctx.beginPath(); ctx.arc(sx + 8, sy - 6, 5.5 + Math.sin(t * 5), 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold 7px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(String(papers), sx + 8, sy - 3.5); ctx.textAlign = 'left'; }
    // lamp + laptop
    cylinder(ctx, x + w - 0.4, y + 0.4, 27, 0.08, 14, '#2b2b2b', '#3a3a3a');
    const [lx, ly] = P(x + w - 0.4, y + 0.4, 41);
    ctx.fillStyle = '#2f5d46'; ctx.beginPath(); ctx.ellipse(lx, ly, 7, 3, 0, 0, 7); ctx.fill();
    box(ctx, x + w / 2 - 0.4, y + 0.35, 27, 0.8, 0.5, 1, '#c9cdd2', '#b5b9be', '#a6aaaf');
    poly(ctx, [P(x + w / 2 - 0.4, y + 0.35, 28), P(x + w / 2 + 0.4, y + 0.35, 28), P(x + w / 2 + 0.4, y + 0.35, 42), P(x + w / 2 - 0.4, y + 0.35, 42)], '#2a2f35');
  }

  function bossChair(ctx, x, y) {
    ellipseFloor(ctx, x, y, 0.32, 0.32, 0, 'rgba(60,40,20,0.15)');
    sbox(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, 9, '#2b2b2b');
    box(ctx, x - 0.32, y - 0.3, 9, 0.64, 0.6, 5, '#3a2a22', '#2e211b', '#251a15');
    box(ctx, x - 0.34, y - 0.42, 14, 0.68, 0.14, 30, '#3a2a22', '#2e211b', '#251a15', 'rgba(0,0,0,0.2)');
    const [sx, sy] = P(x, y - 0.4, 46); ctx.font = `10px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('👑', sx, sy); ctx.textAlign = 'left';
  }

  function armchair(ctx, x, y, color = '#d8cfc2') {
    poly(ctx, [P(x - 0.4, y - 0.35), P(x + 0.45, y - 0.35), P(x + 0.45, y + 0.5), P(x - 0.4, y + 0.5)], 'rgba(60,40,20,0.12)');
    box(ctx, x - 0.4, y - 0.4, 0, 0.8, 0.8, 11, shade(color, 0.06), shade(color, -0.08), shade(color, -0.16));
    box(ctx, x - 0.4, y - 0.4, 11, 0.8, 0.2, 13, shade(color, 0.06), shade(color, -0.08), shade(color, -0.16));
    box(ctx, x - 0.4, y - 0.2, 11, 0.16, 0.6, 7, shade(color, 0.06), shade(color, -0.08), shade(color, -0.16));
    box(ctx, x + 0.24, y - 0.2, 11, 0.16, 0.6, 7, shade(color, 0.06), shade(color, -0.08), shade(color, -0.16));
  }

  function longTable(ctx, f) {
    const { x, y, w, d } = f;
    poly(ctx, [P(x + 0.1, y + 0.15), P(x + w + 0.15, y + 0.15), P(x + w + 0.15, y + d + 0.2), P(x + 0.1, y + d + 0.2)], 'rgba(60,40,20,0.12)');
    for (const lx of [x + 0.6, x + w - 0.8]) sbox(ctx, lx, y + d / 2 - 0.1, 0, 0.2, 0.2, 20, '#7d8489');
    box(ctx, x, y, 20, w, d, 3, '#f4f1ec', '#dcd7cf', '#cfc9c0', 'rgba(0,0,0,0.12)');
    for (let i = 0; i < Math.floor(w); i++) {
      box(ctx, x + 0.3 + i, y + 0.15, 23, 0.4, 0.28, 0.6, '#fff', '#e5e5e5', '#d9d9d9');
      box(ctx, x + 0.3 + i, y + d - 0.43, 23, 0.4, 0.28, 0.6, '#fff', '#e5e5e5', '#d9d9d9');
    }
    cylinder(ctx, x + w / 2, y + d / 2, 23, 0.12, 6, '#9fd3c7', '#e9f5f2');
  }

  function tv(ctx, f, lines, t) {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.45, 18, '#5a4636', '#4a3a2d', '#3d3025');
    box(ctx, x + 0.1, y + 0.05, 30, w - 0.2, 0.06, 40, '#1d2024', '#16181b', '#111316');
    onPlaneY(ctx, x + 0.1, y + 0.11, 70, (g) => {
      const W = (w - 0.2) * 32;
      const gr = g.createLinearGradient(0, 0, W, 40); gr.addColorStop(0, '#1e2a44'); gr.addColorStop(1, '#2d4a5e');
      g.fillStyle = gr; g.fillRect(1.5, 1.5, W - 3, 37);
      g.fillStyle = '#f6d58a'; g.font = `5px ${FONT}`; g.fillText('📊 오늘의 AI 현황', 4, 8);
      g.fillStyle = '#e9eef5'; g.font = `4px ${FONT}`;
      lines.slice(0, 4).forEach((l, i) => g.fillText(l, 4, 15 + i * 5.6));
      // mini bar chart
      for (let i = 0; i < 8; i++) { const h = 6 + 10 * Math.abs(Math.sin(i * 1.7 + t * 0.4)); g.fillStyle = i % 2 ? '#6ec1a6' : '#f0a27f'; g.fillRect(W - 30 + i * 3.2, 35 - h, 2.2, h); }
    });
  }

  function serverRack(ctx, f, t, level) {
    const { x, y } = f;
    box(ctx, x, y, 0, 0.9, 0.75, 72, '#2c3138', '#23272d', '#1c1f24', 'rgba(0,0,0,0.3)');
    onPlaneY(ctx, x + 0.05, y + 0.75, 70, (g) => {
      for (let u = 0; u < 12; u++) {
        g.fillStyle = u % 2 ? '#3a4048' : '#353a42'; g.fillRect(2, 2 + u * 5.5, 25, 4.6);
        for (let k = 0; k < 4; k++) {
          const on = Math.sin(t * (3 + level * 6) + u * 1.7 + k * 2.3 + x * 5) > 0.2 - level * 0.6;
          g.fillStyle = on ? (k === 0 ? '#4ef08a' : k === 3 ? '#ffb347' : '#5fd0ff') : '#20252b';
          g.fillRect(19 + k * 1.8, 3.6 + u * 5.5, 1.1, 1.1);
        }
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(3, 3.2 + u * 5.5, 12, 1);
      }
    });
  }

  function reception(ctx, f) {
    const { x, y, w } = f;
    poly(ctx, [P(x + 0.1, y + 0.15), P(x + w + 0.15, y + 0.15), P(x + w + 0.15, y + 1.2), P(x + 0.1, y + 1.2)], 'rgba(60,40,20,0.12)');
    box(ctx, x, y, 0, w, 0.9, 28, '#f4f1ec', '#e6e0d6', '#d6cfc3', 'rgba(0,0,0,0.1)');
    box(ctx, x - 0.05, y - 0.05, 28, w + 0.1, 1.0, 3, '#c9a676', '#b8955f', '#a8854f');
    onPlaneY(ctx, x + 0.3, y + 0.9, 22, (g) => { g.fillStyle = '#3b332b'; g.font = `7px ${FONT}`; g.fillText('🧶 AI 인공지능 연구원 · 안내', 4, 12); });
    cylinder(ctx, x + w - 0.5, y + 0.4, 31, 0.1, 8, '#7a4a2a', '#c4623d');
    A.leafBlob(ctx, x + w - 0.5, y + 0.4, 39, 1.2, 3);
  }

  function bench(ctx, x, y, w, color = '#b8894f') {
    for (const lx of [x + 0.1, x + w - 0.2]) sbox(ctx, lx, y + 0.1, 0, 0.1, 0.3, 9, '#5d6166');
    box(ctx, x, y, 9, w, 0.5, 3, shade(color, 0.08), shade(color, -0.1), shade(color, -0.2));
  }

  function parasolTable(ctx, x, y, color, t) {
    A.roundTable(ctx, x, y, 0.45, '#ffffff');
    const [px, py] = P(x, y, 0);
    ctx.strokeStyle = '#8d9196'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px, py - 20); ctx.lineTo(px, py - 66); ctx.stroke();
    const sway = Math.sin(t * 0.8 + x) * 1.2;
    for (let i = 0; i < 8; i++) {
      const a0 = i / 8 * Math.PI * 2, a1 = (i + 1) / 8 * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(px + sway, py - 72);
      ctx.lineTo(px + Math.cos(a0) * 34, py - 56 + Math.sin(a0) * 14);
      ctx.lineTo(px + Math.cos(a1) * 34, py - 56 + Math.sin(a1) * 14);
      ctx.closePath(); ctx.fillStyle = i % 2 ? color : '#fffaf0'; ctx.fill();
    }
  }

  function planter(ctx, x, y, w, seed) {
    box(ctx, x, y, 0, w, 0.6, 14, '#a8805a', '#94704d', '#835f40');
    box(ctx, x + 0.05, y + 0.05, 14, w - 0.1, 0.5, 1, '#6b4a2a', '#5d3f24', '#50361f');
    const r = AIO.rand(seed);
    for (let i = 0; i < w * 2; i++) {
      const cx = x + 0.3 + i * 0.5, [sx, sy] = P(cx, y + 0.3, 15);
      ctx.fillStyle = ['#e2667f', '#f3c44b', '#9b7fe0', '#ffffff'][Math.floor(r() * 4)];
      ctx.beginPath(); ctx.arc(sx, sy - 6 - r() * 4, 2.4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#4a8a45'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 6); ctx.stroke();
    }
  }

  function elevatorHut(ctx, x, y) {
    box(ctx, x, y, 0, 1.6, 1.4, 64, '#d9d4cb', '#c9c3b8', '#bab3a7', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x + 0.3, y + 1.4, 56, (g) => { g.fillStyle = '#c9cfd4'; g.fillRect(0, 0, 32, 56); g.fillStyle = '#9aa1a7'; g.fillRect(15.5, 0, 1, 56); g.fillStyle = '#2b2f33'; g.fillRect(8, -8, 16, 6); g.fillStyle = '#ffb347'; g.font = `4px ${FONT}`; g.fillText('R ▼', 11, -3.4); });
  }

  /** vertical glass shaft outside the left wall, spanning all floors, with a car */
  function elevatorShaft(ctx, levels, ey, car) {
    if (levels.length < 2) return;
    const top = levels[levels.length - 1], bottom = levels[0];
    const [bx, by] = P(-0.55, ey, 0); const yb = by + bottom.dy + 6, yt = by + top.dy - 90;
    const w = 26;
    ctx.fillStyle = 'rgba(190,215,230,0.28)'; ctx.fillRect(bx - w / 2, yt, w, yb - yt);
    ctx.strokeStyle = 'rgba(110,130,145,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(bx - w / 2, yt, w, yb - yt);
    ctx.strokeStyle = 'rgba(110,130,145,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, yt); ctx.lineTo(bx, yb); ctx.stroke();
    for (const L of levels) { ctx.fillStyle = 'rgba(110,130,145,0.6)'; ctx.fillRect(bx - w / 2 - 3, by + L.dy - 2, w + 6, 3); }
    const cy = car.y;
    ctx.fillStyle = '#f6f3ee'; roundRect(ctx, bx - 10, cy - 34, 20, 34, 3); ctx.fill();
    ctx.strokeStyle = '#8d949b'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = car.busy ? '#ffb347' : '#cfd5da'; ctx.fillRect(bx - 7, cy - 31, 14, 5);
    if (car.riders) { ctx.font = `10px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('🧶'.repeat(Math.min(3, car.riders)), bx, cy - 10); ctx.textAlign = 'left'; }
  }

  // ------------------------------------------------------------------ factory
  function stackLight(ctx, sx, sy, state, t) {
    // state: 'run' | 'idle' | 'alert' | 'off' | 'done'
    ctx.fillStyle = '#4a4f55'; ctx.fillRect(sx - 1, sy - 4, 2, 6);
    const cols = [['#e5534b', state === 'alert' && Math.sin(t * 10) > 0], ['#f2c230', state === 'idle' || state === 'done'], ['#3fdc84', state === 'run']];
    cols.forEach(([c, on], i) => {
      const y = sy - 8 - (2 - i) * 5;
      ctx.fillStyle = on ? c : shade(c, -0.6); ctx.fillRect(sx - 3, y, 6, 4.6);
      if (on) { ctx.fillStyle = rgba(c, 0.3); ctx.beginPath(); ctx.arc(sx, y + 2.3, 7, 0, 7); ctx.fill(); }
    });
    ctx.fillStyle = '#d9dde1'; ctx.fillRect(sx - 3.2, sy - 25.5, 6.4, 1.8);
  }

  function beacon(ctx, sx, sy, t) {
    const a = t * 6;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(sx, sy, 2, sx, sy, 60);
    gr.addColorStop(0, 'rgba(255,60,50,0.55)'); gr.addColorStop(1, 'rgba(255,60,50,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, 60, a, a + 0.7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, 60, a + Math.PI, a + Math.PI + 0.7); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#e5534b'; ctx.beginPath(); ctx.arc(sx, sy, 4.5, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#555'; ctx.fillRect(sx - 5, sy, 10, 2.5);
  }

  /** CNC-ish machine; screen faces +y (operator stands south of it) */
  function machine(ctx, f, scr, state, t) {
    const { x, y, w, d } = f;
    poly(ctx, [P(x + 0.1, y + 0.15), P(x + w + 0.15, y + 0.15), P(x + w + 0.15, y + d + 0.2), P(x + 0.1, y + d + 0.2)], 'rgba(40,40,40,0.18)');
    box(ctx, x, y, 0, w, d, 8, '#5f6b77', '#4f5a65', '#434d57');
    const body = f.color || '#dfe5ea';
    box(ctx, x + 0.05, y + 0.05, 8, w - 0.1, d - 0.1, 36, shade(body, 0.04), shade(body, -0.06), shade(body, -0.15), 'rgba(0,0,0,0.12)');
    box(ctx, x + 0.05, y + 0.05, 44, w - 0.1, d - 0.1, 4, '#4f8ad6', '#3f74b8', '#356399');
    // viewing window with spinning tool
    onPlaneY(ctx, x + 0.2, y + d - 0.05, 40, (g) => {
      const W = (w - 0.9) * 32;
      g.fillStyle = '#2a3036'; g.fillRect(0, 0, W, 22);
      g.fillStyle = 'rgba(160,200,230,0.25)'; g.fillRect(1, 1, W - 2, 20);
      const run = state === 'run';
      g.save(); g.translate(W / 2, 11); g.rotate(run ? t * 9 : 0.3);
      g.fillStyle = '#c0c6cc'; for (let k = 0; k < 6; k++) { g.rotate(Math.PI / 3); g.fillRect(-1.2, -8, 2.4, 5); }
      g.beginPath(); g.arc(0, 0, 4, 0, 7); g.fill();
      g.restore();
      if (run && Math.sin(t * 13) > 0.3) { g.fillStyle = '#ffd36b'; for (let k = 0; k < 5; k++) g.fillRect(W / 2 + Math.cos(k + t * 20) * 6, 16 + Math.sin(k * 3) * 3, 1.2, 1.2); }
      g.fillStyle = '#f2c230'; g.fillRect(0, 22, W, 2); g.fillStyle = '#2b2b2b'; for (let i = 0; i < W; i += 6) g.fillRect(i, 22, 3, 2);
    });
    // control screen on the right side of the front face
    onPlaneY(ctx, x + w - 0.62, y + d - 0.04, 38, (g) => {
      g.fillStyle = '#1f2226'; g.fillRect(0, 0, 18, 14);
      g.save(); g.beginPath(); g.rect(1, 1, 16, 12); g.clip(); A.screen(g, 16, 12, scr, 1, 1); g.restore();
      g.fillStyle = '#e5534b'; g.beginPath(); g.arc(4, 19, 2.2, 0, 7); g.fill();
      g.fillStyle = '#3fb27f'; g.beginPath(); g.arc(10, 19, 2.2, 0, 7); g.fill();
    });
    const [lx, ly] = P(x + w - 0.25, y + 0.25, 48);
    stackLight(ctx, lx, ly, state, t);
    if (state === 'alert') { const [bx2, by2] = P(x + 0.3, y + 0.3, 50); beacon(ctx, bx2, by2, t); }
  }

  function partsBin(ctx, x, y, seed) {
    box(ctx, x, y, 0, 0.5, 0.45, 9, '#3f74b8', '#356399', '#2c5383');
    const r = AIO.rand(seed);
    for (let i = 0; i < 4; i++) { const [sx, sy] = P(x + 0.1 + r() * 0.3, y + 0.1 + r() * 0.25, 9.5); ctx.fillStyle = r() < 0.5 ? '#b5bcc3' : '#d6a64a'; ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, 7); ctx.fill(); }
  }

  function conveyor(ctx, f, t, speed, boxes) {
    const { x, y, w } = f;
    const d = 1;
    for (let i = 0.3; i < w; i += 1.4) { sbox(ctx, x + i, y + 0.08, 0, 0.1, 0.1, 12, '#5f6b77'); sbox(ctx, x + i, y + d - 0.18, 0, 0.1, 0.1, 12, '#5f6b77'); }
    box(ctx, x, y, 12, w, d, 3, '#3a3f45', '#d6dbe0', '#c4cad0', 'rgba(0,0,0,0.25)');
    // moving chevrons on the belt
    const off = (t * speed) % 0.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    for (let i = -off; i < w; i += 0.5) { if (i < 0) continue; ctx.beginPath(); ctx.moveTo(...P(x + i, y + 0.15, 15)); ctx.lineTo(...P(x + i + 0.12, y + 0.5, 15)); ctx.lineTo(...P(x + i, y + 0.85, 15)); ctx.stroke(); }
    // side rails
    box(ctx, x, y - 0.04, 15, w, 0.06, 3, '#f2c230', '#d9ad25', '#c79e20');
    box(ctx, x, y + d - 0.02, 15, w, 0.06, 3, '#f2c230', '#d9ad25', '#c79e20');
    // boxes
    for (const b of boxes) {
      const bx = x + ((b.p + t * speed * 0.25) % 1) * (w - 0.6);
      box(ctx, bx, y + 0.25, 15, 0.5, 0.5, 9, '#d6a96b', '#c4935a', '#b2824c', 'rgba(90,60,30,0.3)');
      poly(ctx, [P(bx + 0.22, y + 0.25, 24), P(bx + 0.28, y + 0.25, 24), P(bx + 0.28, y + 0.75, 24), P(bx + 0.22, y + 0.75, 24)], '#e8d3a8');
    }
  }

  function console_(ctx, f, scr, state, t) {
    const { x, y, w, d } = f;
    box(ctx, x, y, 0, w, d, 26, '#5f6b77', '#4f5a65', '#434d57', 'rgba(0,0,0,0.2)');
    poly(ctx, [P(x, y + d * 0.3, 26), P(x + w, y + d * 0.3, 26), P(x + w, y + d, 20), P(x, y + d, 20)], '#3a4048');
    onPlaneY(ctx, x + 0.1, y + d, 20, (g) => { g.fillStyle = '#2f7d4f'; g.fillRect(0, 2, (w - 0.2) * 32, 5); g.fillStyle = '#fff'; g.font = `3.6px ${FONT}`; g.fillText('LINE CONTROL', 3, 5.8); });
    box(ctx, x + 0.15, y + 0.2, 26, w - 0.3, 0.06, 18, '#1f2226', '#16181b', '#111316');
    onPlaneY(ctx, x + 0.15, y + 0.26, 44, (g) => { g.save(); g.beginPath(); g.rect(1, 1, (w - 0.3) * 32 - 2, 16); g.clip(); A.screen(g, (w - 0.3) * 32 - 2, 16, scr, 1, 1); g.restore(); });
    const [lx, ly] = P(x + w - 0.15, y + 0.15, 28);
    stackLight(ctx, lx, ly, state, t);
    if (state === 'alert') { const [bx2, by2] = P(x + 0.2, y + 0.2, 46); beacon(ctx, bx2, by2, t); }
  }

  function station(ctx, f, t, active) {
    // little robot arm on the belt edge
    const { x, y } = f;
    cylinder(ctx, x, y, 0, 0.18, 14, '#f2c230', '#d9ad25');
    const [sx, sy] = P(x, y, 14);
    const a = active ? Math.sin(t * 6 + x) * 0.6 : 0.2;
    ctx.strokeStyle = '#e9a23b'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); const ex = sx + Math.cos(-1.2 + a) * 12, ey = sy + Math.sin(-1.2 + a) * 12; ctx.lineTo(ex, ey);
    const fx = ex + Math.cos(0.4 + a) * 10, fy = ey + Math.sin(0.4 + a) * 10; ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = '#4f5a65'; ctx.beginPath(); ctx.arc(fx, fy, 2.6, 0, 7); ctx.fill();
    if (active && Math.sin(t * 15 + x) > 0.5) { ctx.fillStyle = '#ffd36b'; for (let k = 0; k < 4; k++) ctx.fillRect(fx + Math.cos(k * 2 + t * 30) * 5, fy + 4 + Math.sin(k * 3) * 3, 1.3, 1.3); }
  }

  function pallet(ctx, x, y, count) {
    box(ctx, x, y, 0, 1.2, 1.2, 4, '#c49a62', '#b0874f', '#9c7642');
    const n = Math.min(12, count);
    for (let i = 0; i < n; i++) {
      const lx = (i % 2) * 0.55, ly = (Math.floor(i / 2) % 2) * 0.55, lz = Math.floor(i / 4) * 10;
      box(ctx, x + 0.05 + lx, y + 0.05 + ly, 4 + lz, 0.5, 0.5, 10, '#d6a96b', '#c4935a', '#b2824c', 'rgba(90,60,30,0.3)');
    }
    if (count) { const [sx, sy] = P(x + 0.6, y + 0.6, 4 + Math.ceil(n / 4) * 10 + 10); ctx.fillStyle = '#2f7d4f'; roundRect(ctx, sx - 12, sy - 8, 24, 11, 5); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `7px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(`✓ ${count}`, sx, sy); ctx.textAlign = 'left'; }
  }

  function palletRack(ctx, x, y, w, seed) {
    const r = AIO.rand(seed);
    for (let i = 0; i <= w; i += w / 2) sbox(ctx, x + i - 0.05, y, 0, 0.1, 0.9, 70, '#3f74b8');
    for (const z of [0, 24, 48]) {
      box(ctx, x, y, z + 20, w, 0.9, 3, '#e9a23b', '#d98f2a', '#c47f22');
      for (let k = 0; k < w; k += 0.7) if (r() < 0.75) box(ctx, x + k + 0.05, y + 0.1, z + 23 - 20 + 20, 0.6, 0.7, 12 + r() * 8, '#d6a96b', '#c4935a', '#b2824c', 'rgba(90,60,30,0.25)');
    }
  }

  function vending(ctx, x, y, color, t) {
    box(ctx, x, y, 0, 0.8, 0.6, 58, shade(color, 0.05), shade(color, -0.1), shade(color, -0.2), 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x + 0.06, y + 0.6, 54, (g) => {
      g.fillStyle = '#dff1ff'; g.fillRect(1, 2, 16, 34);
      const cols = ['#e5534b', '#3fb27f', '#4e7cf6', '#f2c230', '#a67be0'];
      for (let r2 = 0; r2 < 5; r2++) for (let c = 0; c < 4; c++) { g.fillStyle = cols[(r2 + c) % 5]; g.fillRect(2.5 + c * 3.6, 4 + r2 * 6.4, 2.4, 4.6); }
      g.fillStyle = '#222'; g.fillRect(19, 6, 5, 8); g.fillStyle = Math.sin(t * 2) > 0 ? '#4ef08a' : '#2a5'; g.fillRect(20, 7, 3, 2);
      g.fillStyle = '#333'; g.fillRect(2, 40, 14, 6);
    });
  }

  function lockers(ctx, x, y, w) {
    box(ctx, x, y, 0, w, 0.5, 52, '#7a8b99', '#6b7b88', '#5e6d79', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x, y + 0.5, 50, (g) => {
      for (let i = 0; i < w * 32; i += 10.6) { g.strokeStyle = 'rgba(0,0,0,0.25)'; g.strokeRect(i + 0.6, 1, 9.4, 48); g.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 4; k++) g.fillRect(i + 3, 5 + k * 1.6, 4.4, 0.6); g.fillStyle = '#d9dee2'; g.fillRect(i + 8, 24, 1, 4); }
    });
  }

  function forklift(ctx, x, y) {
    box(ctx, x, y, 3, 1.1, 0.7, 12, '#f2c230', '#d9ad25', '#c79e20', 'rgba(0,0,0,0.2)');
    box(ctx, x + 0.2, y + 0.1, 15, 0.6, 0.5, 2, '#333', '#2a2a2a', '#222');
    sbox(ctx, x + 0.15, y + 0.05, 15, 0.06, 0.06, 26, '#333'); sbox(ctx, x + 0.75, y + 0.05, 15, 0.06, 0.06, 26, '#333');
    box(ctx, x + 0.1, y, 41, 0.75, 0.65, 2, '#444', '#3a3a3a', '#333');
    sbox(ctx, x + 1.1, y + 0.1, 0, 0.08, 0.5, 34, '#555');
    box(ctx, x + 1.18, y + 0.15, 1, 0.6, 0.12, 1.5, '#666', '#555', '#4d4d4d'); box(ctx, x + 1.18, y + 0.45, 1, 0.6, 0.12, 1.5, '#666', '#555', '#4d4d4d');
    for (const [wx, wy] of [[0.2, 0.7], [0.85, 0.7]]) { const [sx, sy] = P(x + wx, y + wy, 3); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(sx, sy, 4, 4, 0, 0, 7); ctx.fill(); }
  }

  function banner(g, x0, text, color = '#2f7d4f') {
    onPlaneY(g, x0, 0.02, 98, (q) => { q.fillStyle = color; q.fillRect(0, 0, 120, 13); q.fillStyle = '#fff'; q.font = `8px ${FONT}`; q.fillText(text, 6, 9.6); });
  }

  /** ANDON board on the factory back wall (like the bulletin) */
  function andon(ctx, x0, items, t) {
    onPlaneY(ctx, x0, 0.02, 80, (g) => {
      g.fillStyle = '#1d2024'; g.fillRect(-2, -2, 116, 46);
      g.fillStyle = '#f2c230'; g.font = `6px ${FONT}`; g.fillText('ANDON · 호출 현황', 4, 7);
      if (!items.length) { g.fillStyle = '#3fdc84'; g.font = `6px ${FONT}`; g.fillText('● 전 라인 정상 가동', 6, 24); }
      items.slice(0, 4).forEach((it, i) => {
        const on = Math.sin(t * 6 + i) > -0.3;
        g.fillStyle = on ? '#e5534b' : '#5a2320'; g.fillRect(4, 12 + i * 8, 6, 6);
        g.fillStyle = '#e9eef5'; g.font = `4.4px ${FONT}`; g.fillText(String(it).slice(0, 24), 13, 17 + i * 8);
      });
    });
  }

  AIO.art2 = {
    floor, hazardRect, lane, outerWalls, slab, factoryWindows, shutterDoor, elevatorDoorStatic, wallSeg, doorframe,
    execDesk, bossChair, armchair, longTable, tv, serverRack, reception, bench, parasolTable, planter, elevatorHut, elevatorShaft,
    stackLight, beacon, machine, partsBin, conveyor, console: console_, station, pallet, palletRack, vending, lockers, forklift, banner, andon,
  };
})();
