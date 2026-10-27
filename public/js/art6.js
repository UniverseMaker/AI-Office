// Campus-scale art: chunked ground (roads with lane markings, zebra crossings, stop lines, lots, sports fields,
// amphitheatre, solar farm), exteriors of every named campus building, vehicles on both road axes, trucks of several
// kinds, and interior props for the police station, bank, server floors, labs and the factory's overhead dock doors.
(function () {
  const { P, shade, rgba, poly, box, sbox, cylinder, ellipseFloor, onPlaneY, onPlaneX, roundRect } = AIO.iso;
  const A = AIO.art, A2 = AIO.art2, A3 = AIO.art3, A5 = AIO.art5;
  const FONT = A.FONT;
  const rect = (g, x, y, w, d, c, z = 0) => poly(g, [P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], c);
  const hit = (r, R) => r.x < R.x1 && r.x + r.w > R.x0 && r.y < R.y1 && r.y + r.d > R.y0;
  const clipR = (r, R) => { const x = Math.max(r.x, R.x0), y = Math.max(r.y, R.y0); return { x, y, w: Math.min(r.x + r.w, R.x1) - x, d: Math.min(r.y + r.d, R.y1) - y }; };

  // ------------------------------------------------------------------ ground (one chunk = tile rect R)
  function ground(g, OUT, R) {
    const W = OUT.W, H = OUT.H, G = OUT.ground;
    const BASE = G.base || {};   // 부지 바탕: 잔디(기본) · 모래 · 눈 · 흙 …
    rect(g, R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, BASE.color || '#a9d18e');
    if ((R.s || 1) >= 0.5 && BASE.tufts !== null) {
      // grass tufts, batched into two strokes
      const rr = AIO.rand(R.x0 * 7 + R.y0 * 3 + 5), n = (R.x1 - R.x0) * (R.y1 - R.y0) * 7;
      for (const col of BASE.tufts || ['#7fb86a', '#b6dca0']) {
        g.beginPath();
        for (let i = 0; i < n / 2; i++) { const [sx, sy] = P(R.x0 + rr() * (R.x1 - R.x0), R.y0 + rr() * (R.y1 - R.y0)); g.moveTo(sx, sy); g.lineTo(sx + (rr() - 0.5) * 2, sy - 2.5); }
        g.strokeStyle = col; g.lineWidth = 0.9; g.stroke();
      }
    }
    if (R.y1 >= H) poly(g, [P(R.x0, H, 0), P(R.x1, H, 0), P(R.x1, H, -16), P(R.x0, H, -16)], BASE.edge || '#8a7a5c');
    if (R.x1 >= W) poly(g, [P(W, R.y0, 0), P(W, R.y1, 0), P(W, R.y1, -16), P(W, R.y0, -16)], BASE.edge2 || '#76684d');
    for (const d of G.decals) if (d.type === 'meadow' && hit(d, R)) A5.decal(g, d);
    // 지형 영역: 바닥 재질 사각형 (모래·데크·물·눈 …) — style 은 art2 floor 재질 또는 AIO.floorStyles 플러그인
    for (const a of G.areas || []) if (hit(a, R)) { const c = clipR(a, R); A2.floor(g, c.x, c.y, c.w, c.d, a.style, a.color, Math.round(a.x * 7 + a.y * 3)); }
    for (const r of G.walk) if (hit(r, R)) { const c = clipR(r, R); A2.floor(g, c.x, c.y, c.w, c.d, 'tile', '#ddd6ca', Math.round(c.x + c.y)); }
    for (const r of G.plaza) if (hit(r, R)) { const c = clipR(r, R); A2.floor(g, c.x, c.y, c.w, c.d, 'tile', r.color || '#e8e2d6', Math.round(c.x * 3 + c.y)); }
    const A7 = AIO.art7;
    const bb = (pts, w) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x: x0 - w, y: y0 - w, w: x1 - x0 + 2 * w, d: y1 - y0 + 2 * w }; };
    for (const c of G.curves || []) if (hit(bb(c.pts, c.w), R)) A7.curvePath(g, c);
    for (const d of G.rounds || []) if (hit({ x: d.cx - d.r - 1, y: d.cy - d.r - 1, w: d.r * 2 + 2, d: d.r * 2 + 2 }, R)) A7.roundPlaza(g, d);
    for (const d of G.fell || []) if (hit({ x: d.cx - d.rx - 1, y: d.cy - d.rx - 1, w: d.rx * 2 + 2, d: d.rx * 2 + 2 }, R)) A7.flowerEllipse(g, d);
    for (const r of G.lots) if (hit(r, R)) {
      const c = clipR(r, R); rect(g, c.x, c.y, c.w, c.d, '#6a6e73');
      const m = G.lotMarks;
      if (m) for (const lx of [m.x + 1.8, m.x + 5.4]) if (lx > R.x0 && lx < R.x1) for (let y = Math.max(m.y0, R.y0); y < Math.min(m.y1, R.y1); y += 1.6) rect(g, lx - 0.05, y, 0.1, 0.8, '#f2c230');
    }
    for (const r of G.road) if (hit(r, R)) roadSeg(g, r, R);
    for (const r of G.inter) if (hit(r, R)) { rect(g, r.x, r.y, r.w, r.d, '#5c6065'); }
    for (const c of G.cross) if (hit(c, R)) crosswalk(g, c, G.road[c.road]);
    for (const d of G.decals) if (d.type !== 'meadow' && (d.w ? hit(d, R) : hit({ x: d.cx - (d.rx || d.R || 2) - 1, y: d.cy - (d.ry || d.R || 2) - 1, w: (d.rx || d.R || 2) * 2 + 2, d: (d.ry || d.R || 2) * 2 + 2 }, R))) {
      if (d.type === 'track') track(g, d); else if (d.type === 'court') court(g, d); else if (d.type === 'amphi') amphi(g, d); else if (d.type === 'solar') solar(g, d); else if (d.type === 'pool') AIO.art7.pool(g, d); else A5.decal(g, d);
    }
  }

  function roadSeg(g, r, R) {
    const c = clipR(r, R);
    rect(g, c.x, c.y, c.w, c.d, '#5f6368');
    const yel = '#f2c230', wh = 'rgba(244,242,238,0.9)';
    const D = r.axis === 'x' ? r.d : r.w, mid = D / 2, four = D >= 4;
    if (r.axis === 'x') {
      rect(g, c.x, r.y + 0.06, c.w, 0.06, wh); rect(g, c.x, r.y + r.d - 0.12, c.w, 0.06, wh);
      rect(g, c.x, r.y + mid - 0.08, c.w, 0.06, yel); rect(g, c.x, r.y + mid + 0.02, c.w, 0.06, yel);
      if (four) for (let x = Math.floor(c.x / 1.6) * 1.6; x < c.x + c.w; x += 1.6) for (const ly of [r.y + 0.97, r.y + 2.97]) rect(g, Math.max(c.x, x), ly, 0.7, 0.06, wh);
    } else {
      rect(g, r.x + 0.06, c.y, 0.06, c.d, wh); rect(g, r.x + r.w - 0.12, c.y, 0.06, c.d, wh);
      rect(g, r.x + mid - 0.08, c.y, 0.06, c.d, yel); rect(g, r.x + mid + 0.02, c.y, 0.06, c.d, yel);
      if (four) for (let y = Math.floor(c.y / 1.6) * 1.6; y < c.y + c.d; y += 1.6) for (const lx of [r.x + 0.97, r.x + 2.97]) rect(g, lx, Math.max(c.y, y), 0.06, 0.7, wh);
    }
  }
  /** zebra crossing: stripes run WITH the traffic and are stacked across the road */
  function crosswalk(g, c, r) {
    rect(g, c.x - 0.05, c.y, c.w + 0.1, c.d, '#5f6368');
    const st = '#f4f2ee';
    if (c.axis === 'x') {
      for (let j = c.y + 0.22; j + 0.3 <= c.y + c.d - 0.1; j += 0.56) rect(g, c.x + 0.15, j, c.w - 0.3, 0.3, st);
      if (c.light) { rect(g, c.x - 0.75, r.y + 2.1, 0.14, 1.85, st); rect(g, c.x + c.w + 0.6, r.y + 0.05, 0.14, 1.85, st); }
    } else {
      for (let i = c.x + 0.22; i + 0.3 <= c.x + c.w - 0.1; i += 0.56) rect(g, i, c.y + 0.15, 0.3, c.d - 0.3, st);
      if (c.light) { rect(g, r.x + 0.05, c.y - 0.75, 1.85, 0.14, st); rect(g, r.x + 2.1, c.y + c.d + 0.6, 1.85, 0.14, st); }
    }
  }
  function track(g, d) {
    const cx = d.x + d.w / 2, cy = d.y + d.d / 2;
    ellipseFloor(g, cx, cy, d.w / 2, d.d / 2, 0, '#c9573f');
    ellipseFloor(g, cx, cy, d.w / 2 - 3.2, d.d / 2 - 3.2, 0, '#7fbf6a');
    for (let k = 1; k < 4; k++) ellipseFloor(g, cx, cy, d.w / 2 - k * 0.8, d.d / 2 - k * 0.8, 0, null, 'rgba(255,255,255,0.7)');
    rect(g, cx - 0.05, cy - d.d / 2 + 3.4, 0.1, d.d - 6.8, 'rgba(255,255,255,0.75)');
    ellipseFloor(g, cx, cy, 2.4, 2.4, 0, null, 'rgba(255,255,255,0.75)');
    for (let i = 0; i < 8; i++) rect(g, cx - d.w / 2 + 6 + i * ((d.w - 12) / 8), cy - d.d / 2 + 3.6, (d.w - 12) / 16, d.d - 7.2, 'rgba(255,255,255,0.05)');
  }
  function court(g, d) {
    const col = d.kind === 'tennis' ? ['#3b7fb8', '#5b9a4c'] : d.kind === 'basket' ? ['#c97b3f', '#d79a5e'] : ['#4f9a4b', '#5fae58'];
    rect(g, d.x, d.y, d.w, d.d, col[1]); rect(g, d.x + 0.5, d.y + 0.5, d.w - 1, d.d - 1, col[0]);
    const wl = 'rgba(255,255,255,0.85)';
    const line = (x, y, w, dd) => rect(g, x, y, w, dd, wl);
    line(d.x + 0.5, d.y + 0.5, d.w - 1, 0.08); line(d.x + 0.5, d.y + d.d - 0.58, d.w - 1, 0.08); line(d.x + 0.5, d.y + 0.5, 0.08, d.d - 1); line(d.x + d.w - 0.58, d.y + 0.5, 0.08, d.d - 1);
    if (d.kind === 'tennis') { line(d.x + 0.5, d.y + d.d / 2 - 0.04, d.w - 1, 0.08); line(d.x + d.w / 2 - 0.04, d.y + 2.5, 0.08, d.d - 5); }
    else { line(d.x + d.w / 2 - 0.04, d.y + 0.5, 0.08, d.d - 1); ellipseFloor(g, d.x + d.w / 2, d.y + d.d / 2, 2, 2, 0, null, wl); }
  }
  function amphi(g, d) {
    const { cx, cy, r0, r1 } = d;
    const [sx, sy] = P(cx, cy, 0), k = 45.25;
    g.save(); g.translate(sx, sy); g.scale(1, 0.5);
    for (let rr = r1; rr > r0; rr -= 1.3) {
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, rr * k, Math.PI * 0.08 + Math.PI / 4, Math.PI * 0.92 + Math.PI / 4); g.closePath();
      g.fillStyle = Math.round((r1 - rr) / 1.3) % 2 ? '#d8cbb3' : '#e8dcc4'; g.fill();
    }
    g.beginPath(); g.arc(0, 0, r0 * k, 0, 7); g.fillStyle = '#b98c5e'; g.fill();
    g.restore();
  }
  function solar(g, d) {
    rect(g, d.x, d.y, d.w, d.d, '#b9c49e');
    for (let y = d.y + 0.5; y + 1.4 < d.y + d.d; y += 2.4) for (let x = d.x + 0.5; x + 3 < d.x + d.w; x += 3.4) {
      rect(g, x, y, 3, 1.4, '#2e4a78'); rect(g, x + 0.1, y + 0.1, 2.8, 0.25, 'rgba(255,255,255,0.25)');
      for (let i = 1; i < 4; i++) rect(g, x + i * 0.75, y, 0.03, 1.4, 'rgba(255,255,255,0.3)');
    }
  }

  // ------------------------------------------------------------------ campus building exteriors
  const STY = {
    brick: { wall: '#b5523b', side: '#9c4532', band: '#e9e1d3', glass: '#9fc3d8', frame: '#f1ece4', roof: '#9a9690' },
    white: { wall: '#efe9df', side: '#d9d1c4', band: '#d4ccbe', glass: '#5c6f80', frame: '#ffffff', roof: '#bdb6aa' },
    hall: { wall: '#b5523b', side: '#9c4532', band: '#e9e1d3', glass: '#9fc3d8', frame: '#f1ece4', roof: '#7d6a5a' },
    glass: { wall: '#7fa7c4', side: '#6890ad', band: '#e6edf2', glass: '#a9cbe3', frame: '#dfe8ef', roof: '#c9ced3' },
    glassBrick: { wall: '#b5523b', side: '#9c4532', band: '#e9e1d3', glass: '#a9cbe3', frame: '#f1ece4', roof: '#a9a59e' },
    concrete: { wall: '#c4c7ca', side: '#aeb2b6', band: '#dfe2e4', glass: '#7f99ad', frame: '#e9ecee', roof: '#9da2a6' },
    sports: { wall: '#dfe3e6', side: '#c7ccd0', band: '#3f8f9f', glass: '#9fc3d8', frame: '#ffffff', roof: '#3f8f9f' },
    dorm: { wall: '#e9d8bd', side: '#d6c3a5', band: '#c79a6b', glass: '#9fc3d8', frame: '#ffffff', roof: '#9a8f80' },
    fire: { wall: '#c43d32', side: '#a5332a', band: '#f1ece4', glass: '#9fc3d8', frame: '#ffffff', roof: '#8d8f93' },
    police: { wall: '#eef1f5', side: '#d5dbe2', band: '#1f4e9a', glass: '#9fc3d8', frame: '#ffffff', roof: '#9da2a6' },
    bank: { wall: '#f4efe6', side: '#ddd5c6', band: '#2f7d4f', glass: '#9fc3d8', frame: '#ffffff', roof: '#a9a59e' },
    shop: { wall: '#f4efe6', side: '#e0d8ca', band: '#d97757', glass: '#bfe0f0', frame: '#ffffff', roof: '#a9a59e' },
  };
  const FPX = 30;
  function campusBuilding(ctx, o, night) {
    const s = STY[o.style] || STY.brick;
    const { x, y, W, H } = o, n = o.floors || 3, h = n * FPX + 6;
    poly(ctx, [P(x + 0.3, y + 0.3), P(x + W + h / 60, y + 0.4), P(x + W + h / 60, y + H + h / 80), P(x + 0.3, y + H + 0.3)], 'rgba(40,40,30,0.16)');
    const lit = (i, k) => night && ((i * 7 + k * 13 + (o.seed || 0)) % 5 < 3);
    const face = (g, len, south) => {
      const Wl = len * 32;
      g.fillStyle = south ? s.wall : s.side; g.fillRect(0, 0, Wl, h);
      if (o.style === 'glass') {
        const gr = g.createLinearGradient(0, 0, Wl, h); gr.addColorStop(0, south ? '#9cc3df' : '#86adc9'); gr.addColorStop(1, south ? '#6f97b6' : '#5d84a2');
        g.fillStyle = gr; g.fillRect(0, 0, Wl, h);
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; for (let i = 0; i < Wl; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
        for (let k = 0; k <= n; k++) { g.fillStyle = s.band; g.fillRect(0, h - k * FPX - 2, Wl, 2); }
        if (night) for (let k = 0; k < n; k++) for (let i = 0; i < len; i++) if (lit(i, k)) { g.fillStyle = 'rgba(255,226,150,0.75)'; g.fillRect(i * 32 + 1, h - (k + 1) * FPX + 2, 30, FPX - 4); }
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(Wl * 0.1, h); g.lineTo(Wl * 0.3, 0); g.lineTo(Wl * 0.38, 0); g.lineTo(Wl * 0.18, h); g.fill();
      } else if (o.style === 'sports') {
        for (let i = 0; i < len; i += 2) { g.fillStyle = night ? 'rgba(255,226,150,0.7)' : s.glass; g.fillRect(i * 32 + 6, 14, 52, 18); }
        g.fillStyle = s.band; g.fillRect(0, h - 22, Wl, 5);
      } else {
        for (let k = 0; k < n; k++) {
          const top = h - (k + 1) * FPX;
          g.fillStyle = s.band; g.fillRect(0, top + FPX - 3, Wl, 3);
          const step = o.style === 'shop' ? 1 : o.style === 'dorm' ? 1 : 1;
          for (let i = 0; i < len; i += step) {
            if (o.style === 'shop' && k === 0 && south) continue;
            if (o.style === 'fire' && k === 0 && south) continue;
            const wx = i * 32 + 6, wy = top + 7, ww = o.style === 'concrete' ? 32 : 20, wh = FPX - 15;
            if (o.style === 'concrete' && i % 1) continue;
            g.fillStyle = s.frame; g.fillRect(wx - 1.5, wy - 1.5, ww + 3, wh + 3);
            g.fillStyle = lit(i, k) ? 'rgba(255,226,150,0.95)' : s.glass; g.fillRect(wx, wy, ww, wh);
            if (o.style === 'hall' && k === n - 1) { g.fillStyle = s.frame; g.beginPath(); g.arc(wx + ww / 2, wy, ww / 2 + 1.5, Math.PI, 0); g.fill(); g.fillStyle = s.glass; g.beginPath(); g.arc(wx + ww / 2, wy, ww / 2, Math.PI, 0); g.fill(); }
            if (o.style === 'dorm') { g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(wx - 3, wy + wh, ww + 6, 3); g.fillStyle = ['#f07a8a', '#7ab8f5', '#f6c445', '#9fd8b0'][(i + k) % 4]; if ((i * 3 + k) % 4 === 0) g.fillRect(wx + 2, wy + wh - 5, 5, 5); }
          }
        }
        if (o.style === 'glassBrick') { g.fillStyle = 'rgba(160,200,225,0.85)'; g.fillRect(0, 0, Wl, h - 2 * FPX); g.strokeStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < Wl; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h - 2 * FPX); g.stroke(); } }
      }
      if (south) {
        // entrance + name plate
        const dx = (o.W / 2) * 32;
        if (o.style === 'fire') {
          for (let i = 0; i < 3; i++) { const gx = 40 + i * 240; g.fillStyle = '#2b2b2b'; g.fillRect(gx, h - FPX + 2, 150, FPX - 2); g.fillStyle = '#e5534b'; g.fillRect(gx + 4, h - FPX + 4, 142, 6); g.fillStyle = '#f2f2f2'; for (let k = 0; k < 3; k++) g.fillRect(gx + 4, h - FPX + 12 + k * 5, 142, 2); }
        } else if (o.style === 'shop') {
          const aw = ['#e5534b', '#2f9e5f', '#4e7cf6', '#e9a23b', '#a67be0', '#e2667f'][(o.seed || 0) % 6];
          g.fillStyle = 'rgba(200,228,240,0.85)'; g.fillRect(10, h - FPX + 6, Wl - 20, FPX - 6);
          for (let i = 0; i < Wl / 12; i++) { g.fillStyle = i % 2 ? '#ffffff' : aw; g.fillRect(i * 12, h - FPX - 2, 12, 9); }
          g.fillStyle = '#2b2622'; roundRect(g, 18, h - FPX - 22, Wl - 36, 15, 4); g.fill();
          g.fillStyle = '#fff'; g.font = `bold 9px ${FONT}`; g.textAlign = 'center'; g.fillText(o.name, Wl / 2, h - FPX - 11); g.textAlign = 'left';
          return;
        } else {
          g.fillStyle = '#3b3f45'; g.fillRect(dx - 22, h - 24, 44, 24); g.fillStyle = 'rgba(200,228,240,0.8)'; g.fillRect(dx - 19, h - 21, 18, 21); g.fillRect(dx + 1, h - 21, 18, 21);
          g.fillStyle = shade(s.wall, -0.15); g.fillRect(dx - 30, h - 28, 60, 4);
        }
        const label = `${o.code ? o.code + '  ' : ''}${o.name}`;
        g.font = `bold 10px ${FONT}`;
        const lw = g.measureText(label).width + 16;
        g.fillStyle = 'rgba(43,38,34,0.86)'; roundRect(g, dx - lw / 2, 6, lw, 16, 5); g.fill();
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(label, dx, 18); g.textAlign = 'left';
      }
    };
    onPlaneY(ctx, x, y + H, h, (g) => face(g, W, true));
    onPlaneX(ctx, x + W, y + H, h, (g) => face(g, H, false));
    // roof
    if (o.style === 'sports' || o.style === 'hall') {
      const rh = o.style === 'sports' ? 26 : 18;
      for (let i = 0; i < 12; i++) {
        const a0 = i / 12 * Math.PI, a1 = (i + 1) / 12 * Math.PI;
        const y0 = y + H / 2 - Math.cos(a0) * H / 2, y1 = y + H / 2 - Math.cos(a1) * H / 2, z0 = h + Math.sin(a0) * rh, z1 = h + Math.sin(a1) * rh;
        poly(ctx, [P(x, y0, z0), P(x + W, y0, z0), P(x + W, y1, z1), P(x, y1, z1)], shade(s.roof, 0.12 - i * 0.02), 'rgba(0,0,0,0.08)');
      }
      const pts = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; pts.push(P(x + W, y + H / 2 - Math.cos(a) * H / 2, h + Math.sin(a) * rh)); }
      pts.push(P(x + W, y, h)); poly(ctx, pts, shade(s.side, -0.05));
    } else {
      poly(ctx, [P(x, y, h), P(x + W, y, h), P(x + W, y + H, h), P(x, y + H, h)], s.roof, 'rgba(0,0,0,0.12)');
      box(ctx, x, y + H - 0.15, h, W, 0.15, 4, shade(s.wall, 0.15), shade(s.wall, -0.05), shade(s.wall, -0.15));
      box(ctx, x + W - 0.15, y, h, 0.15, H, 4, shade(s.wall, 0.15), shade(s.wall, -0.05), shade(s.wall, -0.15));
      const r = AIO.rand((o.seed || 1) + W * 7 + H);
      if (o.style !== 'shop') for (let i = 0; i < Math.min(5, Math.floor(W / 6)); i++) box(ctx, x + 2 + r() * (W - 5), y + 1 + r() * (H - 4), h, 1.4, 1.2, 8, '#d9dde1', '#c4c9cd', '#b5bbc0', 'rgba(0,0,0,0.12)');
      if (o.style === 'fire') { box(ctx, x + W - 4, y + 1, h, 3, 3, 46, '#c43d32', '#a5332a', '#8f2c25', 'rgba(0,0,0,0.15)'); onPlaneY(ctx, x + W - 4, y + 4, h + 44, (g) => { g.fillStyle = '#fff'; g.font = `bold 14px ${FONT}`; g.fillText('119', 18, 24); }); }
      if (o.style === 'glass' && W > 18) { box(ctx, x + W / 2 - 3, y + H / 2 - 2, h, 6, 4, 10, '#e6edf2', '#c9d6df', '#b8c7d2', 'rgba(0,0,0,0.1)'); }
    }
  }

  // ------------------------------------------------------------------ vehicles
  /** car on either axis. axis 'x': footprint x..x+1.6, y..y+0.8 · axis 'y': x..x+0.8, y..y+1.6. dir: +1 / -1 along the axis */
  function vehicle(ctx, x, y, axis, dir, color, kind = 'car', t = 0) {
    if (axis === 'x' && kind === 'car') { A3.car(ctx, x, y, color, dir); return; }
    const ax = axis === 'x';
    const len = kind === 'fire' ? 4.4 : 1.6, wid = kind === 'fire' ? 1.25 : 0.8;
    const fw = ax ? len : wid, fd = ax ? wid : len;
    const c = kind === 'police' ? '#ffffff' : kind === 'fire' ? '#d9302a' : kind === 'taxi' ? '#f2c230' : color;
    ellipseFloor(ctx, x + fw / 2, y + fd / 2, fw / 2 + 0.1, fd / 2 + 0.1, 0, 'rgba(0,0,0,0.18)');
    const hb = kind === 'fire' ? 26 : 9;
    box(ctx, x, y, 3, fw, fd, hb, shade(c, 0.08), shade(c, -0.1), shade(c, -0.2), 'rgba(0,0,0,0.2)');
    if (kind === 'police') { if (ax) onPlaneY(ctx, x, y + fd, 10, (g) => { g.fillStyle = '#1f4e9a'; g.fillRect(0, 2, len * 32, 4); }); else onPlaneX(ctx, x + fw, y + fd, 10, (g) => { g.fillStyle = '#1f4e9a'; g.fillRect(0, 2, len * 32, 4); }); }
    if (kind === 'fire') {
      if (ax) onPlaneY(ctx, x, y + fd, 26, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 12, len * 32, 3); g.fillStyle = '#b8bec4'; for (let i = 8; i < len * 32 - 30; i += 12) g.fillRect(i, 2, 8, 8); g.fillStyle = '#fff'; g.font = `bold 6px ${FONT}`; g.fillText('119 소방', 6, 22); });
      else onPlaneX(ctx, x + fw, y + fd, 26, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 12, len * 32, 3); g.fillStyle = '#b8bec4'; for (let i = 30; i < len * 32 - 8; i += 12) g.fillRect(i, 2, 8, 8); g.fillStyle = '#fff'; g.font = `bold 6px ${FONT}`; g.fillText('119 소방', 34, 22); });
      // ladder on top
      const [lx0, ly0] = ax ? [x + 0.4, y + fd / 2] : [x + fw / 2, y + 0.4];
      const [a, b] = P(lx0, ly0, 30), [cc, d] = ax ? P(x + len - 1.2, ly0, 30) : P(lx0, y + len - 1.2, 30);
      ctx.strokeStyle = '#d9dde1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(cc, d); ctx.stroke();
    }
    // cabin glass
    const cab = kind === 'fire' ? { l: 1.1, z: 3 + hb, hh: 0 } : { l: 0.8, z: 12, hh: 7 };
    const front = dir > 0;
    if (kind !== 'fire') {
      const cx = ax ? (front ? x + 0.45 : x + 0.35) : x + 0.08, cy = ax ? y + 0.08 : (front ? y + 0.45 : y + 0.35);
      box(ctx, cx, cy, cab.z, ax ? cab.l : wid - 0.16, ax ? wid - 0.16 : cab.l, cab.hh, '#dbe9f2', '#a9c6d8', '#93b5cb', 'rgba(0,0,0,0.2)');
      if (kind === 'police' || kind === 'taxi') {
        const [sx, sy] = P(cx + (ax ? cab.l / 2 : (wid - 0.16) / 2), cy + (ax ? (wid - 0.16) / 2 : cab.l / 2), cab.z + cab.hh + 2);
        if (kind === 'police') { const on = Math.sin(t * 8) > 0; ctx.fillStyle = on ? '#e5534b' : '#4e7cf6'; ctx.fillRect(sx - 6, sy - 2, 6, 3); ctx.fillStyle = on ? '#4e7cf6' : '#e5534b'; ctx.fillRect(sx, sy - 2, 6, 3); }
        else { ctx.fillStyle = '#2b2622'; ctx.fillRect(sx - 5, sy - 3, 10, 4); }
      }
    }
    const wheels = ax ? [[0.3, wid], [len - 0.3, wid]] : [[wid, 0.3], [wid, len - 0.3]];
    for (const [wx, wy] of wheels) { const [sx, sy] = P(x + wx, y + wy, 3); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(sx, sy, 3.6, 3.6, 0, 0, 7); ctx.fill(); }
    const [hx, hy] = ax ? P(front ? x + len : x, y + wid / 2, 7) : P(x + wid / 2, front ? y + len : y, 7);
    ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.arc(hx, hy, 1.6, 0, 7); ctx.fill();
  }

  /** trucks: box / semi (long trailer) / tanker / flatbed. axis 'x' footprint x..x+L, y..y+1.2; cab at the +dir end */
  function truck(ctx, x, y, axis, dir, color, kind = 'box', opt = {}) {
    const L = truck.len(kind), Wd = 1.6, cabL = 1.7;
    const ax = axis === 'x';
    const fw = ax ? L : Wd, fd = ax ? Wd : L;
    ellipseFloor(ctx, x + fw / 2, y + fd / 2, fw / 2 + 0.1, fd / 2 + 0.1, 0, 'rgba(0,0,0,0.2)');
    const bodyL = L - cabL - 0.1;
    const body = ax ? { x: dir > 0 ? x : x + cabL + 0.1, y, w: bodyL, d: Wd } : { x, y: dir > 0 ? y : y + cabL + 0.1, w: Wd, d: bodyL };
    const cab = ax ? { x: dir > 0 ? x + L - cabL : x, y: y + 0.05, w: cabL, d: Wd - 0.1 } : { x: x + 0.05, y: dir > 0 ? y + L - cabL : y, w: Wd - 0.1, d: cabL };
    const side = (zTop, fn) => (ax ? onPlaneY(ctx, body.x, body.y + body.d, zTop, (g) => fn(g, body.w)) : onPlaneX(ctx, body.x + body.w, body.y + body.d, zTop, (g) => fn(g, body.d)));
    const drawBody = () => {
      if (kind === 'tanker') {
        box(ctx, body.x, body.y, 4, body.w, body.d, 6, '#5d6166', '#4f5459', '#45494e');
        const n = 10;
        for (let i = 0; i < n; i++) {
          const s0 = i / n, s1 = (i + 1) / n;
          const a = ax ? [body.x + s0 * body.w, body.y + body.d / 2] : [body.x + body.w / 2, body.y + s0 * body.d];
          const b2 = ax ? [body.x + s1 * body.w, body.y + body.d / 2] : [body.x + body.w / 2, body.y + s1 * body.d];
          void a; void b2;
        }
        // cylinder along the axis, approximated by stacked boxes with rounded shading
        for (const [z, hh, sh] of [[10, 10, -0.12], [20, 16, 0.05], [36, 8, -0.05]]) box(ctx, body.x + (ax ? 0 : 0.08), body.y + (ax ? 0.08 : 0), z, body.w - (ax ? 0 : 0.16), body.d - (ax ? 0.16 : 0), hh, shade('#d9dde1', sh + 0.1), shade('#d9dde1', sh), shade('#d9dde1', sh - 0.12));
        side(44, (g, len) => { g.fillStyle = color; g.fillRect(6, 16, len * 32 - 12, 6); g.fillStyle = '#3b332b'; g.font = `bold 6px ${FONT}`; g.fillText('⛽ 냉각수', 10, 26); });
      } else if (kind === 'flatbed') {
        box(ctx, body.x, body.y, 4, body.w, body.d, 6, '#8d959c', '#7f878e', '#737a80');
        const n = Math.floor((ax ? body.w : body.d) / 1.2);
        for (let i = 0; i < n; i++) { const ox = ax ? body.x + 0.2 + i * 1.2 : body.x + 0.15, oy = ax ? body.y + 0.15 : body.y + 0.2 + i * 1.2; box(ctx, ox, oy, 10, ax ? 1 : 1.2, ax ? 1.2 : 1, 16 + (i % 2) * 8, '#d6a96b', '#c4955a', '#a9773f', 'rgba(0,0,0,0.2)'); }
      } else {
        box(ctx, body.x, body.y, 6, body.w, body.d, 52, '#f4f2ee', '#e3ded6', '#d6d0c6', 'rgba(0,0,0,0.2)');
        side(58, (g, len) => { g.fillStyle = color; g.fillRect(6, 10, len * 32 - 12, 12); g.fillStyle = '#fff'; g.font = `bold 10px ${FONT}`; g.fillText(opt.label || (kind === 'semi' ? 'AI LOGISTICS' : 'AI 물류'), 12, 20); g.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 26; i < 52; i += 6) g.fillRect(4, i, len * 32 - 8, 1); });
      }
    };
    const drawCab = () => {
      box(ctx, cab.x, cab.y, 4, cab.w, cab.d, 40, shade(color, 0.12), shade(color, -0.06), shade(color, -0.18), 'rgba(0,0,0,0.2)');
      const glass = (g, len) => { g.fillStyle = '#cfe6f2'; g.fillRect(4, 4, len * 32 - 8, 15); g.fillStyle = '#2b2b2b'; g.fillRect(6, 28, len * 32 - 12, 6); g.fillStyle = '#fff6c9'; g.fillRect(3, 28, 6, 4); g.fillRect(len * 32 - 9, 28, 6, 4); };
      if (ax && dir > 0) onPlaneX(ctx, cab.x + cab.w, cab.y + cab.d, 40, (g) => glass(g, cab.d));
      if (!ax && dir > 0) onPlaneY(ctx, cab.x, cab.y + cab.d, 40, (g) => glass(g, cab.w));
      if (ax) onPlaneY(ctx, cab.x, cab.y + cab.d, 38, (g) => { g.fillStyle = '#cfe6f2'; g.fillRect(dir > 0 ? cab.w * 32 - 24 : 5, 3, 19, 13); });
      else onPlaneX(ctx, cab.x + cab.w, cab.y + cab.d, 38, (g) => { g.fillStyle = '#cfe6f2'; g.fillRect(dir > 0 ? 5 : cab.d * 32 - 24, 3, 19, 13); });
      if (opt.beacon) { const [sx, sy] = P(cab.x + cab.w / 2, cab.y + cab.d / 2, 46); ctx.fillStyle = Math.sin(opt.t * 7) > 0 ? '#ffb347' : '#a06a1a'; ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0, 7); ctx.fill(); }
    };
    if (dir < 0) { drawCab(); drawBody(); } else { drawBody(); drawCab(); }
    const wl = [0.9, L - 0.9, L - 2.1, ...(L > 7 ? [2.1, 3.2] : [])];
    for (const w of wl) { const [sx, sy] = ax ? P(x + w, y + Wd, 5) : P(x + Wd, y + w, 5); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(sx, sy, 5.4, 5.4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#9aa1a7'; ctx.beginPath(); ctx.ellipse(sx, sy, 2.2, 2.2, 0, 0, 7); ctx.fill(); }
  }
  truck.len = (kind) => (kind === 'semi' ? 9.5 : kind === 'tanker' ? 8.5 : kind === 'flatbed' ? 7.5 : 6.2);

  // ------------------------------------------------------------------ small outdoor props
  function willow(ctx, x, y, seed, t) {
    ellipseFloor(ctx, x + 0.2, y + 0.2, 0.9, 0.9, 0, 'rgba(40,60,30,0.18)');
    sbox(ctx, x - 0.1, y - 0.1, 0, 0.2, 0.2, 40, '#7a5a3a');
    const [sx, sy] = P(x, y, 44);
    ctx.fillStyle = '#7cb862'; ctx.beginPath(); ctx.ellipse(sx, sy - 8, 30, 18, 0, 0, 7); ctx.fill();
    for (let i = 0; i < 16; i++) {
      const ox = -26 + i * 3.5, sw = Math.sin(t * 1.2 + i + seed) * 2;
      const g = ctx.createLinearGradient(0, sy - 8, 0, sy + 34); g.addColorStop(0, '#86c26a'); g.addColorStop(1, 'rgba(150,205,120,0.5)');
      ctx.strokeStyle = g; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(sx + ox, sy - 6); ctx.quadraticCurveTo(sx + ox + sw, sy + 14, sx + ox + sw * 1.5, sy + 26 + (i % 3) * 4); ctx.stroke();
    }
  }
  function pondSign(ctx, x, y) {
    sbox(ctx, x, y, 0, 0.08, 0.08, 22, '#7a5540');
    onPlaneY(ctx, x - 0.6, y + 0.08, 30, (g) => { g.fillStyle = '#f6efd8'; roundRect(g, 0, 0, 40, 12, 3); g.fill(); g.strokeStyle = '#7a5540'; g.stroke(); g.fillStyle = '#3b332b'; g.font = `5px ${FONT}`; g.fillText('🦢 오리연못 · 거위 조심', 2, 8); });
  }
  function campusSign(ctx, x, y) {
    box(ctx, x - 2.6, y - 0.4, 0, 5.2, 0.8, 26, '#efe9df', '#ddd5c9', '#cfc6b8', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x - 2.4, y + 0.4, 24, (g) => { g.fillStyle = '#1f4e9a'; g.font = `bold 15px ${FONT}`; g.fillText('AI LAB', 14, 17); g.fillStyle = '#5b6b7a'; g.font = `5px ${FONT}`; g.fillText('AI CAMPUS · AI 인공지능 연구원', 14, 23); });
  }
  function flag(ctx, x, y, color, t) {
    sbox(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, 92, '#d9dde1');
    const [sx, sy] = P(x, y, 90);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(sx, sy);
    for (let i = 0; i <= 8; i++) ctx.lineTo(sx + i * 3.5, sy + Math.sin(t * 4 + i * 0.8) * 2);
    for (let i = 8; i >= 0; i--) ctx.lineTo(sx + i * 3.5, sy + 16 + Math.sin(t * 4 + i * 0.8) * 2);
    ctx.fill();
  }
  function stage(ctx, x, y, w) {
    box(ctx, x, y, 0, w, 2.2, 10, '#b98c5e', '#a87a52', '#8a6247', 'rgba(0,0,0,0.15)');
    for (const px of [x + 0.1, x + w - 0.2]) sbox(ctx, px, y + 0.1, 10, 0.1, 0.1, 40, '#3b3f45');
    box(ctx, x, y, 50, w, 0.3, 4, '#3b3f45', '#2d3035', '#26292d');
    onPlaneY(ctx, x + 0.4, y + 0.15, 46, (g) => { g.fillStyle = '#7a2232'; g.fillRect(0, 0, (w - 0.8) * 32, 34); g.fillStyle = '#f6d58a'; g.font = `bold 7px ${FONT}`; g.fillText('🎤 노천극장 · 오늘의 세미나', 8, 14); });
  }
  function picnicTable(ctx, x, y) {
    for (const [lx, ly] of [[0.2, 0.3], [2.6, 0.3], [0.2, 1.5], [2.6, 1.5]]) sbox(ctx, x + lx, y + ly, 0, 0.12, 0.12, 14, '#8a6247');
    box(ctx, x, y + 0.2, 14, 3, 1.6, 2, '#c49a62', '#a87a52', '#8a6247', 'rgba(0,0,0,0.12)');
    box(ctx, x, y - 0.45, 8, 3, 0.4, 1.6, '#c49a62', '#a87a52', '#8a6247'); box(ctx, x, y + 2.05, 8, 3, 0.4, 1.6, '#c49a62', '#a87a52', '#8a6247');
  }
  function goal(ctx, x, y, side) {
    const d = 3;
    for (const yy of [y - d / 2, y + d / 2]) sbox(ctx, x - 0.05, yy - 0.05, 0, 0.1, 0.1, 22, '#ffffff');
    const [a, b] = P(x, y - d / 2, 22), [c, e] = P(x, y + d / 2, 22);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, e); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.6;
    for (let i = 0; i <= 6; i++) { const [p, q] = P(x, y - d / 2 + i * d / 6, 22), [r2, s2] = P(x - side * 0.8, y - d / 2 + i * d / 6, 0); ctx.beginPath(); ctx.moveTo(p, q); ctx.lineTo(r2, s2); ctx.stroke(); }
  }
  function hoop(ctx, x, y, side) {
    sbox(ctx, x - 0.08, y - 0.08, 0, 0.16, 0.16, 50, '#4f5459');
    box(ctx, x + side * 0.3, y - 0.6, 46, 0.08, 1.2, 16, '#ffffff', '#e9e4da', '#ddd6ca', 'rgba(0,0,0,0.3)');
    const [sx, sy] = P(x + side * 0.7, y, 48); ctx.strokeStyle = '#e5534b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(sx, sy, 6, 3, 0, 0, 7); ctx.stroke();
  }
  function atmKiosk(ctx, x, y) {
    box(ctx, x, y, 0, 1.6, 0.8, 40, '#2f7d4f', '#276a43', '#205a38', 'rgba(0,0,0,0.2)');
    onPlaneY(ctx, x + 0.1, y + 0.8, 38, (g) => { g.fillStyle = '#fff'; g.font = `bold 6px ${FONT}`; g.fillText('🏧 ATM', 6, 9); g.fillStyle = '#cfe6f2'; g.fillRect(8, 14, 30, 12); });
  }
  function goose(ctx, x, y, dir, t, seed) {
    const [sx, sy] = P(x, y, 0);
    const f = dir > 0 ? 1 : -1, bob = Math.abs(Math.sin(t * 6 + seed)) * 1.2;
    ctx.fillStyle = 'rgba(60,40,20,0.15)'; ctx.beginPath(); ctx.ellipse(sx, sy, 8, 3, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#f08a3a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(sx - 2, sy); ctx.lineTo(sx - 2, sy - 5); ctx.moveTo(sx + 2, sy); ctx.lineTo(sx + 2, sy - 5); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(sx, sy - 9 - bob, 9, 5.6, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx + f * 6, sy - 10 - bob); ctx.quadraticCurveTo(sx + f * 9, sy - 18 - bob, sx + f * 8, sy - 22 - bob); ctx.stroke();
    ctx.fillStyle = '#f08a3a'; ctx.beginPath(); ctx.moveTo(sx + f * 9, sy - 23 - bob); ctx.lineTo(sx + f * 13, sy - 22 - bob); ctx.lineTo(sx + f * 9, sy - 21 - bob); ctx.fill();
    ctx.fillStyle = '#222'; ctx.fillRect(sx + f * 8 - 0.5, sy - 24 - bob, 1.2, 1.2);
  }

  // ------------------------------------------------------------------ interiors: police / bank
  function bars(ctx, f) {
    // bars along a wall edge; axis 'x' at y=f.y spanning x..x+1, axis 'y' at x=f.x spanning y..y+1
    const H = 58;
    ctx.strokeStyle = '#5d6166'; ctx.lineWidth = 1.6;
    for (let i = 0.08; i < 1; i += 0.16) { const [a, b] = f.axis === 'x' ? P(f.x + i, f.y, 0) : P(f.x, f.y + i, 0), [c, d] = f.axis === 'x' ? P(f.x + i, f.y, H) : P(f.x, f.y + i, H); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
    for (const z of [2, 30, H]) { const [a, b] = f.axis === 'x' ? P(f.x, f.y, z) : P(f.x, f.y, z), [c, d] = f.axis === 'x' ? P(f.x + 1, f.y, z) : P(f.x, f.y + 1, z); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
  }
  function barDoor(ctx, f) {
    // open barred door swung against the wall
    const H = 58;
    ctx.strokeStyle = '#4f5459'; ctx.lineWidth = 1.4;
    for (let i = 0; i <= 5; i++) { const [a, b] = P(f.x + 0.02, f.y - i * 0.16, 0), [c, d] = P(f.x + 0.02, f.y - i * 0.16, H); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
    const [a, b] = P(f.x, f.y, H + 2), [c, d] = P(f.x + 1, f.y, H + 2); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
  }
  function bunk(ctx, x, y) {
    box(ctx, x, y, 0, 2.4, 0.9, 10, '#8d959c', '#7f878e', '#737a80');
    box(ctx, x + 0.05, y + 0.05, 10, 2.3, 0.8, 4, '#e9e4da', '#d9d2c5', '#cbc3b5');
    box(ctx, x + 0.1, y + 0.1, 14, 0.6, 0.6, 3, '#ffffff', '#eeeeee', '#e0e0e0');
  }
  function cellToilet(ctx, x, y) { cylinder(ctx, x, y, 0, 0.25, 10, '#e8edf1', '#cfd6dc', 'rgba(0,0,0,0.15)'); box(ctx, x - 0.2, y - 0.4, 10, 0.4, 0.2, 10, '#e8edf1', '#cfd6dc', '#c2cad1'); }
  function flagStand(ctx, x, y, t) { sbox(ctx, x, y, 0, 0.08, 0.08, 60, '#c9a676'); const [sx, sy] = P(x, y, 58); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, sy, 22, 14); ctx.fillStyle = '#e5534b'; ctx.beginPath(); ctx.arc(sx + 11, sy + 7, 4, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#1f4e9a'; ctx.beginPath(); ctx.arc(sx + 11, sy + 7, 4, 0, Math.PI); ctx.fill(); void t; }
  function wantedBoard(ctx, x, y, w, items) {
    for (const lx of [x + 0.2, x + w - 0.3]) sbox(ctx, lx, y + 0.3, 0, 0.08, 0.08, 40, '#6d757c');
    onPlaneY(ctx, x, y + 0.35, 62, (g) => {
      g.fillStyle = '#c9a676'; g.fillRect(0, 0, w * 32, 30);
      g.fillStyle = '#3b332b'; g.font = `bold 5px ${FONT}`; g.fillText('🚨 수배 · 수감 현황', 4, 7);
      (items.length ? items : ['수감자 없음 🕊️']).slice(0, 3).forEach((s, i) => { g.fillStyle = '#fff'; g.fillRect(4 + i * 30, 10, 26, 18); g.fillStyle = '#3b332b'; g.font = `3.4px ${FONT}`; g.fillText(String(s).slice(0, 8), 6 + i * 30, 26); g.fillStyle = '#d9c8a4'; g.beginPath(); g.arc(17 + i * 30, 17, 4, 0, 7); g.fill(); });
    });
  }
  function vaultDoor(ctx, x, y, open, t) {
    // a huge round door hinged on the wall at (x, y), swung open into the hall
    const [sx, sy] = P(x + 1, y, 32);
    ctx.save(); ctx.translate(sx, sy);
    ctx.fillStyle = '#7d858c'; ctx.beginPath(); ctx.ellipse(0, 0, 30, 30, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b2f33'; ctx.beginPath(); ctx.ellipse(0, 0, 24, 24, 0, 0, 7); ctx.fill();
    ctx.restore();
    const a = open * 1.2;
    const [hx, hy] = P(x + 2.2, y, 32);
    ctx.save(); ctx.translate(hx, hy); ctx.scale(Math.cos(a) * 0.95 + 0.05, 1);
    ctx.fillStyle = '#c0c6cc'; ctx.beginPath(); ctx.ellipse(-26, 0, 26, 27, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#8d959c'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = '#6d757c'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const r = t * 0.5 + k * 2.1; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-26 + Math.cos(r) * 14, Math.sin(r) * 14); ctx.stroke(); }
    ctx.fillStyle = '#e9c46a'; ctx.beginPath(); ctx.arc(-26, 0, 4, 0, 7); ctx.fill();
    ctx.restore();
  }
  function depositBoxes(ctx, x, y, w) {
    onPlaneY(ctx, x, y + 0.02, 66, (g) => {
      const Wl = w * 32; g.fillStyle = '#9a8556'; g.fillRect(0, 0, Wl, 64);
      for (let i = 0; i < Wl / 12; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 3 ? '#d6c08a' : '#e4cf9a'; g.fillRect(1 + i * 12, 1 + j * 8, 10.5, 6.6); g.fillStyle = '#7a6a3f'; g.fillRect(8 + i * 12, 4 + j * 8, 1.6, 1.6); }
    });
  }
  function goldStack(ctx, x, y, t) {
    for (let k = 0; k < 3; k++) for (let i = 0; i < 3 - k; i++) box(ctx, x + i * 0.45 + k * 0.22, y + k * 0.1, k * 5, 0.42, 0.9, 5, '#f6d365', '#e2b93b', '#c99a20', 'rgba(0,0,0,0.15)');
    A.sparkles(ctx, ...P(x + 0.7, y + 0.4, 18), t, '#f6c445');
  }
  function tellerCounter(ctx, x, y, w) {
    box(ctx, x, y, 0, w, 0.9, 26, '#f4f1ec', '#d9cdb8', '#cbbfa8', 'rgba(0,0,0,0.12)');
    box(ctx, x - 0.05, y - 0.05, 26, w + 0.1, 1, 3, '#2f7d4f', '#276a43', '#205a38');
    box(ctx, x, y + 0.4, 29, w, 0.05, 26, 'rgba(210,235,245,0.35)', 'rgba(210,235,245,0.35)', 'rgba(190,215,232,0.35)', 'rgba(140,160,175,0.5)');
    for (let i = 0; i < 3; i++) onPlaneY(ctx, x + 1.5 + i * 4.5, y + 0.9, 22, (g) => { g.fillStyle = '#16181b'; g.fillRect(0, 0, 26, 8); g.fillStyle = '#ffb347'; g.font = `5px ${FONT}`; g.fillText(`창구 ${i + 1}  ▶ ${100 + i * 7}`, 2, 6); });
  }
  function ticketMachine(ctx, x, y) { box(ctx, x - 0.3, y - 0.3, 0, 0.6, 0.6, 34, '#2f7d4f', '#276a43', '#205a38'); onPlaneY(ctx, x - 0.3, y + 0.3, 32, (g) => { g.fillStyle = '#fff'; g.font = `4px ${FONT}`; g.fillText('번호표', 2, 7); g.fillStyle = '#cfe6f2'; g.fillRect(3, 10, 13, 8); }); }
  function atm(ctx, x, y) { box(ctx, x, y, 0, 1.2, 0.8, 40, '#d9dde1', '#c4c9cd', '#b5bbc0', 'rgba(0,0,0,0.15)'); onPlaneX(ctx, x + 1.2, y + 0.8, 38, (g) => { g.fillStyle = '#2f7d4f'; g.fillRect(0, 0, 26, 6); g.fillStyle = '#fff'; g.font = `4px ${FONT}`; g.fillText('ATM', 8, 4.6); g.fillStyle = '#9fc9de'; g.fillRect(5, 9, 16, 9); }); }

  // ------------------------------------------------------------------ interiors: server floors / labs
  function gpuRack(ctx, f, t, level) {
    const { x, y } = f;
    box(ctx, x, y, 0, 0.95, 0.8, 76, '#1d2126', '#16191d', '#111316', 'rgba(0,0,0,0.4)');
    onPlaneY(ctx, x + 0.04, y + 0.8, 74, (g) => {
      for (let u = 0; u < 8; u++) {
        g.fillStyle = '#262b31'; g.fillRect(2, 2 + u * 8.6, 26, 7.6);
        const busy = Math.sin(t * (2 + level * 8) + u * 0.9 + (f.seed || 0)) > 0.4 - level;
        g.fillStyle = busy ? '#76e04f' : '#2d4a24'; g.fillRect(3, 3 + u * 8.6, 20, 1.6);
        g.fillStyle = 'rgba(118,224,79,0.18)'; g.fillRect(3, 5 + u * 8.6, 20 * (0.3 + 0.7 * Math.abs(Math.sin(t * 0.7 + u + (f.seed || 0)))), 3);
        g.fillStyle = '#ffffff'; g.font = `2.6px ${FONT}`; g.fillText('H100', 23.5, 7.4 + u * 8.6);
      }
    });
  }
  function coolantPipe(ctx, x, y, w, t) {
    for (const [dy, c] of [[0, '#4e9cf6'], [0.12, '#e5534b']]) { box(ctx, x, y + dy, 78, w, 0.08, 3, c, shade(c, -0.15), shade(c, -0.25)); }
    const k = (t * 0.4) % 1;
    for (let i = 0; i < 6; i++) { const [sx, sy] = P(x + ((i / 6 + k) % 1) * w, y + 0.04, 81); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(sx - 1, sy - 1, 2, 2); }
  }
  function nocWall(ctx, f, t, info) {
    onPlaneY(ctx, f.x, f.y, 84, (g) => {
      const Wl = f.w * 32;
      g.fillStyle = '#1d2126'; g.fillRect(0, 0, Wl, 52);
      for (let i = 0; i < 6; i++) {
        const sx = 4 + i * (Wl - 8) / 6, sw = (Wl - 8) / 6 - 4;
        g.fillStyle = '#0f1a24'; g.fillRect(sx, 4, sw, 44);
        g.strokeStyle = f.gpu ? '#76e04f' : '#5fd0ff'; g.lineWidth = 1; g.beginPath();
        for (let k = 0; k < 20; k++) { const v = 26 + Math.sin(t * (1 + i * 0.3) + k * 0.7 + i) * 10 * (0.4 + info.load); k ? g.lineTo(sx + k * sw / 19, 4 + v) : g.moveTo(sx, 4 + v); }
        g.stroke();
        g.fillStyle = '#e9eef5'; g.font = `4px ${FONT}`; g.fillText(f.gpu ? ['loss', 'GPU util', 'tokens/s', 'VRAM', 'temp', 'epochs'][i] : ['CPU', 'net in', 'net out', 'disk', 'temp', 'sessions'][i], sx + 2, 9);
      }
      g.fillStyle = '#ffb347'; g.font = `5px ${FONT}`; g.fillText(f.gpu ? `🔥 학습 중 세션 ${info.busy}개` : `세션 ${info.n}개 · 작업 중 ${info.busy}`, 6, 50);
    });
  }
  function upsCabinet(ctx, x, y, t) { box(ctx, x, y, 0, 2, 0.8, 54, '#d9dde1', '#c4c9cd', '#b5bbc0', 'rgba(0,0,0,0.15)'); onPlaneY(ctx, x, y + 0.8, 52, (g) => { g.fillStyle = '#16181b'; g.fillRect(8, 6, 30, 10); g.fillStyle = '#4ef08a'; g.font = `4.4px ${FONT}`; g.fillText(`UPS ${96 + Math.round(Math.sin(t + x) * 2)}%`, 10, 13); }); }
  function batteryRack(ctx, x, y, w) { box(ctx, x, y, 0, w, 0.7, 30, '#4f5459', '#454a4e', '#3b3f43'); for (let i = 0; i < w * 3; i++) for (let j = 0; j < 3; j++) box(ctx, x + 0.05 + i * 0.33, y + 0.1, 2 + j * 9, 0.28, 0.5, 7, '#2f3338', '#25292d', '#1e2125'); }
  function chiller(ctx, x, y, t) {
    box(ctx, x, y, 0, 3, 1.6, 44, '#e9ecee', '#d4d8db', '#c4c9cd', 'rgba(0,0,0,0.15)');
    for (let k = 0; k < 2; k++) { const [sx, sy] = P(x + 0.8 + k * 1.4, y + 0.8, 44); ctx.fillStyle = '#5d6166'; ctx.beginPath(); ctx.ellipse(sx, sy, 12, 6, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#d9dde1'; ctx.lineWidth = 1.4; for (let b = 0; b < 3; b++) { const a = t * 6 + b * 2.1; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * 10, sy + Math.sin(a) * 5); ctx.stroke(); } }
  }
  function pipes(ctx, x, y, w) { for (const [dz, c] of [[20, '#4e9cf6'], [30, '#e5534b'], [40, '#3fb27f']]) box(ctx, x, y, dz, w, 0.2, 4, c, shade(c, -0.15), shade(c, -0.25)); }
  function labBench(ctx, x, y, w, t) {
    box(ctx, x, y, 0, w, 0.9, 26, '#e9ecee', '#d4d8db', '#c4c9cd', 'rgba(0,0,0,0.12)');
    box(ctx, x - 0.05, y - 0.05, 26, w + 0.1, 1, 2, '#2b2f33', '#23272b', '#1d2023');
    for (let i = 0; i < w; i += 1.2) { cylinder(ctx, x + 0.4 + i, y + 0.4, 28, 0.12, 8, 'rgba(160,220,255,0.7)', 'rgba(160,220,255,0.5)'); cylinder(ctx, x + 0.75 + i, y + 0.5, 28, 0.08, 10, i % 2.4 ? 'rgba(255,180,200,0.8)' : 'rgba(180,255,190,0.8)', 'rgba(255,255,255,0.4)'); }
    box(ctx, x + w - 1.2, y + 0.1, 28, 0.9, 0.6, 12, '#3b3f45', '#2d3035', '#26292d');
    const [sx, sy] = P(x + w - 0.75, y + 0.7, 34); ctx.fillStyle = Math.sin(t * 3) > 0 ? '#4ef08a' : '#2a7a55'; ctx.fillRect(sx - 4, sy - 2, 8, 4);
  }
  function robotArm(ctx, x, y, t) {
    cylinder(ctx, x, y, 0, 0.5, 8, '#f2c230', '#d9a91a');
    const a1 = Math.sin(t * 0.9) * 0.8, a2 = Math.sin(t * 1.3 + 1) * 0.9;
    const [bx, by] = P(x, y, 8);
    const j1 = [bx + Math.cos(a1) * 22, by - 24 + Math.sin(a1) * 6], j2 = [j1[0] + Math.cos(a1 + a2) * 18, j1[1] + 8 + Math.sin(a1 + a2) * 6];
    ctx.lineCap = 'round'; ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(j1[0], j1[1]); ctx.lineTo(j2[0], j2[1]); ctx.stroke();
    ctx.fillStyle = '#3b3f45'; for (const p of [[bx, by], j1, j2]) { ctx.beginPath(); ctx.arc(p[0], p[1], 3.4, 0, 7); ctx.fill(); }
  }
  function robotDog(ctx, x, y, t) {
    const [sx, sy] = P(x + Math.sin(t * 0.6) * 0.4, y, 0);
    const k = Math.sin(t * 8) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(sx, sy, 12, 4, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3b3f45'; ctx.lineWidth = 2.4; for (const [dx, o] of [[-8, k], [-4, -k], [4, k], [8, -k]]) { ctx.beginPath(); ctx.moveTo(sx + dx, sy - 12); ctx.lineTo(sx + dx + o, sy - 1); ctx.stroke(); }
    ctx.fillStyle = '#f2c230'; roundRect(ctx, sx - 11, sy - 18, 22, 8, 3); ctx.fill();
    ctx.fillStyle = '#3b3f45'; roundRect(ctx, sx + 8, sy - 21, 7, 6, 2); ctx.fill();
    ctx.fillStyle = '#5fd0ff'; ctx.fillRect(sx + 11, sy - 19, 2, 2);
  }
  function posterBoard(ctx, x, y, w) {
    for (const lx of [x + 0.2, x + w - 0.3]) sbox(ctx, lx, y + 0.3, 0, 0.08, 0.08, 40, '#6d757c');
    onPlaneY(ctx, x, y + 0.35, 66, (g) => {
      const Wl = w * 32; g.fillStyle = '#f4f1ec'; g.fillRect(0, 0, Wl, 36);
      for (let i = 0; i < 3; i++) { const px = 4 + i * (Wl - 8) / 3; g.fillStyle = '#ffffff'; g.fillRect(px, 4, (Wl - 8) / 3 - 4, 28); g.fillStyle = ['#4e7cf6', '#e5534b', '#3fb27f'][i]; g.fillRect(px + 2, 6, (Wl - 8) / 3 - 8, 4); g.fillStyle = '#c9c2b6'; for (let k = 0; k < 4; k++) g.fillRect(px + 2, 13 + k * 4, (Wl - 8) / 3 - 10 - (k % 2) * 6, 1.4); }
    });
  }
  /** overhead dock door on the factory's east wall (plane x = f.x), bay f.y..f.y+f.w; open 0..1 rolls it up */
  function dockDoor(ctx, f, open) {
    const { x, y, w } = f, H = 70;
    onPlaneX(ctx, x, y + w, H + 10, (g) => {
      const Wl = w * 32;
      g.fillStyle = '#5f6b77'; g.fillRect(-5, 0, 5, H + 10); g.fillRect(Wl, 0, 5, H + 10); g.fillStyle = '#4f5a65'; g.fillRect(-5, 0, Wl + 10, 12);
      const down = (1 - open) * H;
      g.fillStyle = '#d9a91a'; g.fillRect(0, 12, Wl, down);
      g.fillStyle = 'rgba(0,0,0,0.18)'; for (let k = 12; k < 12 + down; k += 5) g.fillRect(0, k, Wl, 1);
      g.fillStyle = '#2b2b2b'; for (let i = 0; i < Wl; i += 10) g.fillRect(i, 12 + down - 4, 5, 4);
      g.fillStyle = '#2f3a44'; g.fillRect(-5, 4, 28, 7); g.fillStyle = '#f2c230'; g.font = `5px ${FONT}`; g.fillText(`DOCK ${f.bay + 1}`, -3, 9.6);
      g.fillStyle = open > 0.5 ? '#3fb27f' : '#e5534b'; g.beginPath(); g.arc(Wl + 2.5, 18, 2.4, 0, 7); g.fill();
    });
    // rubber dock shelter
    box(ctx, x, y - 0.2, 0, 0.3, 0.2, 76, '#2b2b2b', '#232323', '#1d1d1d'); box(ctx, x, y + w, 0, 0.3, 0.2, 76, '#2b2b2b', '#232323', '#1d1d1d');
  }

  AIO.art6 = {
    ground, court, campusBuilding, vehicle, truck, willow, pondSign, campusSign, flag, stage, picnicTable, goal, hoop, atmKiosk, goose,
    bars, barDoor, bunk, cellToilet, flagStand, wantedBoard, vaultDoor, depositBoxes, goldStack, tellerCounter, ticketMachine, atm,
    gpuRack, coolantPipe, nocWall, upsCabinet, batteryRack, chiller, pipes, labBench, robotArm, robotDog, posterBoard, dockDoor, FPX,
  };
})();
