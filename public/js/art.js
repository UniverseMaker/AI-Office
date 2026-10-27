// All drawing: knitted plush characters, furniture, wall decor, monitor screens, labels and bubbles.
(function () {
  const { P, shade, rgba, poly, box, sbox, cylinder, ellipseFloor, onPlaneY, onPlaneX, roundRect, TW, TH } = AIO.iso;
  const FONT = '"Jua", "Gowun Dodum", "Malgun Gothic", sans-serif';
  const PAL = {
    floor: '#eadcc3', wallL: '#e7e4de', wallR: '#dcd8d1', wallTop: '#f4f2ee', base: '#cfc9bf',
    wood: '#e8d6b6', woodDark: '#c9a676', white: '#f5f4f1', metal: '#a5a9ad', dark: '#3d4147',
    chair: '#a3a7ab', plant: '#3f8f4a', pot: '#c4623d', cork: '#c79a63', mint: '#cfeedd',
    sofa: '#ece6dc', cushion: '#7a2232',
  };

  // ------------------------------------------------------------------ knit texture
  const patterns = new Map();
  function knit(ctx, color) {
    let p = patterns.get(color);
    if (p) return p;
    const c = document.createElement('canvas');
    c.width = 12; c.height = 12;
    const g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 12, 12);
    g.lineWidth = 1.1; g.lineCap = 'round';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = col * 4 + (row % 2) * 2, y = row * 4;
        g.strokeStyle = shade(color, -0.13);
        g.beginPath(); g.moveTo(x, y + 0.5); g.quadraticCurveTo(x + 1.2, y + 3.2, x + 2, y + 3.6); g.stroke();
        g.beginPath(); g.moveTo(x + 4, y + 0.5); g.quadraticCurveTo(x + 2.8, y + 3.2, x + 2, y + 3.6); g.stroke();
        g.strokeStyle = shade(color, 0.35);
        g.beginPath(); g.moveTo(x + 0.8, y + 0.8); g.lineTo(x + 1.6, y + 2.4); g.stroke();
      }
    }
    p = ctx.createPattern(c, 'repeat');
    patterns.set(color, p);
    return p;
  }
  function fillKnit(ctx, color, ox, oy) {
    const p = knit(ctx, color);
    if (p.setTransform) p.setTransform(new DOMMatrix([0.9, 0, 0, 0.9, ox, oy]));
    ctx.fillStyle = p;
    ctx.fill();
  }
  function plushShade(ctx, cx, cy, r) {
    const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.5, r * 0.1, cx, cy, r * 1.15);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.55, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(70,45,20,0.22)');
    ctx.fillStyle = g;
    ctx.fill();
  }

  // ------------------------------------------------------------------ character
  /**
   * e: { sx, sy (feet, world px), style:{yarn,accent,accent2,hat,glasses,stripe}, pose:'stand'|'walk'|'sit'|'sofa',
   *      dir:'+x'|'+y'|'-x'|'-y', anim, t, seed, scale, alpha, carry:'paper'|'mug'|null }
   */
  function character(ctx, e) {
    const s = e.scale || 1, t = e.t, st = e.style;
    const front = e.dir === '+y' || e.dir === '+x';
    const flip = e.dir === '+x' || e.dir === '-y' ? 1 : -1; // which side the face leans to
    ctx.save();
    ctx.globalAlpha *= e.alpha ?? 1;
    ctx.translate(e.sx, e.sy);
    ctx.scale(s, s);

    let lift = 0, bob = 0, tilt = 0;
    const sitting = e.pose === 'sit' || e.pose === 'sofa';
    if (sitting) lift = e.pose === 'sofa' ? 9 : 11;
    if (e.pose === 'walk') bob = Math.abs(Math.sin(t * 11)) * 3.2;
    if (e.anim === 'type') bob = Math.abs(Math.sin(t * 9)) * 0.9;
    if (e.anim === 'think') tilt = Math.sin(t * 1.6) * 0.1;
    if (e.anim === 'sleep') tilt = 0.32 * flip, bob = Math.sin(t * 1.5) * 0.6;
    if (e.anim === 'cheer') bob = Math.abs(Math.sin(t * 7)) * 5;
    if (e.anim === 'wave') bob = Math.abs(Math.sin(t * 5)) * 1.5;
    if (e.anim === 'idle') bob = Math.sin(t * 2 + e.seed) * 0.6;

    // shadow
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(60,40,20,0.16)';
    ctx.fill();

    ctx.translate(0, -lift - bob);
    const yarn = st.yarn;

    // legs
    if (!sitting) {
      const k = e.pose === 'walk' ? Math.sin(t * 11) * 3 : 0;
      for (const [lx, off] of [[-4.2, k], [4.2, -k]]) {
        ctx.beginPath();
        ctx.ellipse(lx, -4 + Math.min(0, off) * 0.5, 3.6, 5, 0, 0, Math.PI * 2);
        fillKnit(ctx, shade(yarn, -0.04), 0, 0);
        ctx.strokeStyle = 'rgba(80,60,40,0.18)'; ctx.lineWidth = 0.8; ctx.stroke();
      }
    } else {
      // tiny knees poking forward when facing camera
      if (front) for (const lx of [-4.5, 4.5]) {
        ctx.beginPath(); ctx.ellipse(lx - flip * 2, -3, 4, 3.2, 0, 0, Math.PI * 2);
        fillKnit(ctx, shade(yarn, -0.04), 0, 0);
      }
    }

    // arms behind (back view)
    const armPhase = e.anim === 'type' ? Math.sin(t * 16) : 0;
    const drawArm = (side, raise, fwd) => {
      ctx.beginPath();
      ctx.ellipse(side * 10.5 + fwd * flip * -1, -15 - raise, 3.6, 5.4, side * (0.5 + raise * 0.06), 0, Math.PI * 2);
      fillKnit(ctx, shade(yarn, -0.02), 0, 0);
      ctx.strokeStyle = 'rgba(80,60,40,0.15)'; ctx.lineWidth = 0.8; ctx.stroke();
    };
    let raiseL = 0, raiseR = 0, fwd = 0;
    if (e.anim === 'type') { raiseL = 3 + armPhase * 2; raiseR = 3 - armPhase * 2; fwd = 2; }
    if (e.anim === 'wave') { raiseR = 13 + Math.sin(t * 9) * 3; }
    if (e.anim === 'point') { raiseR = 8; }
    if (e.anim === 'cheer') { raiseL = 12; raiseR = 12; }
    if (e.anim === 'think') { raiseR = 7; }
    if (e.carry) { raiseL = 4; raiseR = 4; fwd = 3; }
    if (!front) { drawArm(-1, raiseL, fwd); drawArm(1, raiseR, fwd); }

    // body
    ctx.beginPath();
    ctx.ellipse(0, -14, 10.5, 10.5, 0, 0, Math.PI * 2);
    fillKnit(ctx, yarn, 0, 0);
    plushShade(ctx, 0, -14, 10.5);
    ctx.strokeStyle = 'rgba(80,60,40,0.18)'; ctx.lineWidth = 0.9; ctx.stroke();
    // outfit: safety vest (factory) / necktie (premium office)
    if (st.vest) {
      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, -14, 10.5, 10.5, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = st.vest; ctx.fillRect(-11, -24, 22, 21);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(-11, -12, 22, 2.2);
      if (front) { ctx.fillStyle = yarn; ctx.beginPath(); ctx.moveTo(-3.5, -24); ctx.lineTo(0, -15); ctx.lineTo(3.5, -24); ctx.fill(); }
      else { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(-1.1, -24, 2.2, 21); }
      ctx.restore();
    }
    if (st.tie && front) {
      ctx.fillStyle = st.tie;
      ctx.beginPath(); ctx.moveTo(-1.8, -19.5); ctx.lineTo(1.8, -19.5); ctx.lineTo(2.6, -9); ctx.lineTo(0, -6.5); ctx.lineTo(-2.6, -9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(st.tie, -0.25); ctx.fillRect(-1.6, -20.5, 3.2, 2.4);
    }

    // scarf
    ctx.save();
    ctx.translate(0, -22);
    ctx.beginPath(); ctx.ellipse(0, 0, 11.5, 4.2, 0, 0, Math.PI * 2);
    fillKnit(ctx, st.accent, 0, 0);
    ctx.strokeStyle = shade(st.accent, -0.25); ctx.lineWidth = 0.7; ctx.stroke();
    if (st.stripe) { ctx.strokeStyle = st.accent2; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(0, 0.5, 10.5, 3.2, 0, 0.2, Math.PI - 0.2); ctx.stroke(); }
    if (front) {
      const tx = 6 * flip;
      ctx.beginPath(); roundRect(ctx, tx - 3, 1, 6, 10, 2.2);
      fillKnit(ctx, st.accent, 0, 0);
      ctx.strokeStyle = shade(st.accent, -0.25); ctx.stroke();
      ctx.fillStyle = shade(st.accent, 0.25);
      for (let i = 0; i < 3; i++) ctx.fillRect(tx - 2.6 + i * 2, 10.5, 1.1, 2.2);
    }
    ctx.restore();

    // arms front
    if (front) { drawArm(-1, raiseL, fwd); drawArm(1, raiseR, fwd); }

    // carried things
    if (e.carry === 'paper') {
      ctx.save(); ctx.translate(-flip * 2, -16); ctx.rotate(-0.15 * flip);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#b9b3a8'; ctx.lineWidth = 0.6;
      ctx.fillRect(-5, -6, 10, 12); ctx.strokeRect(-5, -6, 10, 12);
      ctx.fillStyle = '#c9c2b6'; for (let i = 0; i < 4; i++) ctx.fillRect(-3.5, -3.5 + i * 2.6, 7 - (i === 3 ? 3 : 0), 0.9);
      ctx.restore();
    } else if (e.carry === 'cig') {
      const mx = -flip * 10, my = -20;
      ctx.strokeStyle = '#f4f1ec'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - flip * 4, my - 1); ctx.stroke();
      ctx.fillStyle = '#ff7a3d'; ctx.beginPath(); ctx.arc(mx - flip * 4.4, my - 1.1, 0.9, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(190,190,190,0.6)'; ctx.lineWidth = 0.9;
      ctx.beginPath(); const o = Math.sin(t * 2.4) * 1.6; ctx.moveTo(mx - flip * 4.4, my - 2); ctx.quadraticCurveTo(mx - flip * 4 + o, my - 7, mx - flip * 5 - o, my - 13); ctx.stroke();
    } else if (e.carry === 'box') {
      ctx.save(); ctx.translate(-flip * 1, -17);
      ctx.fillStyle = '#d6a96b'; ctx.strokeStyle = '#a9773f'; ctx.lineWidth = 0.7;
      ctx.beginPath(); roundRect(ctx, -7, -6, 14, 11, 1.2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8d3a8'; ctx.fillRect(-1.2, -6, 2.4, 11);
      ctx.fillStyle = '#3fb27f'; ctx.font = `bold 6px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('✓', 3.6, 3.4); ctx.textAlign = 'left';
      ctx.restore();
    } else if (e.carry === 'mug') {
      const mx = -flip * 9, my = -18;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#bbb'; ctx.lineWidth = 0.6;
      ctx.beginPath(); roundRect(ctx, mx - 3, my - 4, 6, 7, 1.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = st.accent; ctx.fillRect(mx - 3, my - 1, 6, 1.6);
      ctx.strokeStyle = 'rgba(160,160,160,0.6)'; ctx.lineWidth = 0.9;
      for (let i = 0; i < 2; i++) { ctx.beginPath(); const o = Math.sin(t * 3 + i) * 1.5; ctx.moveTo(mx - 1 + i * 2, my - 6); ctx.quadraticCurveTo(mx + o + i * 2, my - 9, mx - 1 + i * 2, my - 12); ctx.stroke(); }
    } else if (e.carry === 'mop') {
      const mx = -flip * 11, sw = Math.sin(t * 4) * 3;
      ctx.strokeStyle = '#a9773f'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(mx, -30); ctx.lineTo(mx - flip * 4 + sw, 6); ctx.stroke();
      ctx.fillStyle = '#e9e4da'; ctx.beginPath(); ctx.ellipse(mx - flip * 4 + sw, 7, 6, 2.6, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#cfc8bc'; ctx.lineWidth = 0.6; for (let i = -4; i <= 4; i += 2) { ctx.beginPath(); ctx.moveTo(mx - flip * 4 + sw + i, 6); ctx.lineTo(mx - flip * 4 + sw + i * 1.2, 9); ctx.stroke(); }
    } else if (e.carry === 'balloon') {
      const mx = -flip * 10, by = -62 + Math.sin(t * 1.7) * 2.5, bx = mx + Math.sin(t * 1.3) * 3;
      ctx.strokeStyle = 'rgba(80,80,80,0.6)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(mx, -18); ctx.quadraticCurveTo(mx + 3, -40, bx, by + 9); ctx.stroke();
      const bc = st.balloon || '#e5534b';
      ctx.fillStyle = bc; ctx.beginPath(); ctx.ellipse(bx, by, 7, 8.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(bx - 2.4, by - 3, 1.8, 2.6, -0.4, 0, 7); ctx.fill();
    } else if (e.carry === 'icecream') {
      const mx = -flip * 9, my = -18;
      ctx.fillStyle = '#e0b26b'; ctx.beginPath(); ctx.moveTo(mx - 3, my - 3); ctx.lineTo(mx + 3, my - 3); ctx.lineTo(mx, my + 5); ctx.fill();
      ctx.fillStyle = '#f7c6d4'; ctx.beginPath(); ctx.arc(mx, my - 5, 3.6, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.arc(mx + 1, my - 8.5, 2.6, 0, 7); ctx.fill();
    } else if (e.carry === 'tray') {
      ctx.save(); ctx.translate(-flip * 6, -20);
      ctx.fillStyle = '#8a6247'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 3.2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-5, -6, 4, 5); ctx.fillRect(1.5, -5, 4, 4);
      ctx.fillStyle = '#c47f22'; ctx.fillRect(-5, -4, 4, 1.2);
      ctx.restore();
    } else if (e.carry === 'ball') {
      const k = Math.abs(Math.sin(t * 5)), bx = -flip * 12, by = -2 - k * 22;
      ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(bx, by, 4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#e5534b'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(bx, by, 4, 0.4, 2.6); ctx.stroke();
    }

    // head
    ctx.save();
    ctx.translate(0, -34);
    ctx.rotate(tilt);
    const R = 14.5;
    if (st.hat === 'ears') {
      for (const sx of [-1, 1]) {
        ctx.save(); ctx.translate(sx * 7, -14); ctx.rotate(sx * 0.25);
        ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 8, 0, 0, Math.PI * 2); fillKnit(ctx, yarn, 0, 0);
        ctx.strokeStyle = 'rgba(80,60,40,0.2)'; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 1, 1.7, 5, 0, 0, Math.PI * 2); ctx.fillStyle = '#f2c2c2'; ctx.fill();
        ctx.restore();
      }
    }
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
    fillKnit(ctx, yarn, 0, -34);
    // yarn-ball strands
    ctx.save(); ctx.clip();
    ctx.strokeStyle = shade(yarn, -0.09); ctx.lineWidth = 1.3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const a = (e.seed % 7) * 0.3 + i * 0.8;
      ctx.ellipse(0, 0, R * (0.95 - i * 0.12), R * 0.38, a, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
    plushShade(ctx, 0, 0, R);
    ctx.strokeStyle = 'rgba(80,60,40,0.2)'; ctx.lineWidth = 0.9; ctx.stroke();

    // face
    if (front) {
      const dx = flip * 3.2;
      const blink = ((t + e.seed % 5) % 4.3) < 0.13;
      const closed = e.anim === 'sleep' || blink;
      ctx.fillStyle = '#2b2622';
      ctx.strokeStyle = '#2b2622'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      for (const ex of [-5, 5]) {
        if (closed) { ctx.beginPath(); ctx.arc(ex + dx, 1, 2.2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
        else {
          ctx.beginPath(); ctx.ellipse(ex + dx, 0.5, 1.9, 2.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + dx + 0.6, -0.4, 0.7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2b2622';
        }
      }
      // cheeks
      ctx.fillStyle = 'rgba(244,140,140,0.5)';
      for (const ex of [-8.6, 8.6]) { ctx.beginPath(); ctx.ellipse(ex + dx, 5, 3, 1.9, 0, 0, Math.PI * 2); ctx.fill(); }
      // mouth
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      if (e.anim === 'sleep') { ctx.arc(dx, 6, 1.2, 0, Math.PI * 2); ctx.stroke(); }
      else if (e.anim === 'cheer' || e.anim === 'wave') { ctx.arc(dx, 4.6, 2.4, 0.1 * Math.PI, 0.9 * Math.PI); ctx.fillStyle = '#c0504d'; ctx.fill(); ctx.stroke(); }
      else { ctx.moveTo(dx - 2.2, 4.6); ctx.quadraticCurveTo(dx - 1.1, 6.2, dx, 4.9); ctx.quadraticCurveTo(dx + 1.1, 6.2, dx + 2.2, 4.6); ctx.stroke(); }
      if (st.glasses) {
        ctx.strokeStyle = '#3b332b'; ctx.lineWidth = 1;
        for (const ex of [-5, 5]) { ctx.beginPath(); ctx.arc(ex + dx, 0.7, 3.6, 0, Math.PI * 2); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(dx - 1.4, 0.4); ctx.lineTo(dx + 1.4, 0.4); ctx.stroke();
      }
      if (st.hat === 'shades') {
        ctx.fillStyle = '#1d1d1d';
        ctx.beginPath(); roundRect(ctx, dx - 10, -2.4, 8.6, 5.2, 2); ctx.fill();
        ctx.beginPath(); roundRect(ctx, dx + 1.4, -2.4, 8.6, 5.2, 2); ctx.fill();
        ctx.fillRect(dx - 2, -1.4, 4, 1.2);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(dx - 8.5, -1.5, 2.5, 1.2); ctx.fillRect(dx + 3, -1.5, 2.5, 1.2);
      }
    }

    hat(ctx, st, front, flip, t);
    ctx.restore();
    ctx.restore();
  }

  function hat(ctx, st, front, flip, t) {
    const a = st.accent, b = st.accent2;
    switch (st.hat) {
      case 'hardhat': {
        const hc = st.hardhat || '#f2c230';
        ctx.beginPath(); ctx.ellipse(0, -4, 18.5, 5.8, 0, 0, Math.PI * 2); ctx.fillStyle = shade(hc, -0.12); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-14.5, -4); ctx.bezierCurveTo(-14.5, -24, 14.5, -24, 14.5, -4); ctx.closePath();
        ctx.fillStyle = hc; ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-5, -15, 4, 2.4, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = shade(hc, -0.18); ctx.fillRect(-1.6, -20.5, 3.2, 16.5);
        if (b) { ctx.fillStyle = a; ctx.fillRect(-14, -7.5, 28, 2.4); }
        break;
      }
      case 'beanie': {
        ctx.beginPath(); ctx.arc(0, -1, 15.3, Math.PI * 1.03, Math.PI * 1.97); ctx.closePath();
        fillKnit(ctx, a, 0, -35);
        plushShade(ctx, 0, -6, 14);
        ctx.beginPath(); roundRect(ctx, -15.5, -6, 31, 5.5, 2.5); fillKnit(ctx, shade(a, -0.12), 0, -35);
        ctx.strokeStyle = shade(a, -0.3); ctx.lineWidth = 0.6;
        for (let i = -14; i <= 14; i += 2.6) { ctx.beginPath(); ctx.moveTo(i, -5.5); ctx.lineTo(i, -1); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0, -17.5, 4.6, 0, Math.PI * 2); fillKnit(ctx, b, 0, -52); plushShade(ctx, 0, -17.5, 4.6);
        break;
      }
      case 'beret': {
        ctx.save(); ctx.translate(2 * flip, -11); ctx.rotate(-0.12 * flip);
        ctx.beginPath(); ctx.ellipse(0, 0, 16.5, 6.4, 0, 0, Math.PI * 2); fillKnit(ctx, a, 0, -45);
        plushShade(ctx, 0, 0, 14);
        ctx.strokeStyle = shade(a, -0.3); ctx.lineWidth = 0.7; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, -5.5, 1.6, 3, 0, 0, Math.PI * 2); ctx.fillStyle = shade(a, -0.2); ctx.fill();
        if (b) { ctx.beginPath(); ctx.arc(-6 * flip, -1, 2.4, 0, Math.PI * 2); ctx.fillStyle = b; ctx.fill(); }
        ctx.restore();
        break;
      }
      case 'bucket': {
        ctx.beginPath(); ctx.ellipse(0, -6, 20, 6.5, 0, 0, Math.PI * 2); fillKnit(ctx, shade(b || a, -0.05), 0, -40);
        ctx.strokeStyle = 'rgba(80,60,40,0.25)'; ctx.lineWidth = 0.7; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-12, -6); ctx.bezierCurveTo(-12, -22, 12, -22, 12, -6); ctx.closePath();
        fillKnit(ctx, b || a, 0, -40); plushShade(ctx, 0, -12, 12);
        ctx.fillStyle = a; ctx.fillRect(-12, -9.5, 24, 3.2);
        break;
      }
      case 'cap': {
        ctx.beginPath(); ctx.arc(0, -2, 15, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath();
        fillKnit(ctx, a, 0, -36); plushShade(ctx, 0, -8, 14);
        if (front) { ctx.beginPath(); ctx.ellipse(flip * 6, -2.5, 11, 3.8, flip * 0.15, 0, Math.PI * 2); ctx.fillStyle = shade(a, -0.15); ctx.fill(); }
        else { ctx.beginPath(); ctx.ellipse(-flip * 5, -4, 6, 2.6, 0, 0, Math.PI * 2); ctx.fillStyle = shade(a, -0.2); ctx.fill(); }
        ctx.beginPath(); ctx.arc(0, -16.5, 1.8, 0, Math.PI * 2); ctx.fillStyle = shade(a, -0.25); ctx.fill();
        break;
      }
      case 'police': {
        ctx.beginPath(); ctx.arc(0, -3, 15, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fillStyle = '#26365e'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, -16, 15, 4.4, 0, 0, Math.PI * 2); ctx.fillStyle = '#2b3a67'; ctx.fill();
        ctx.fillStyle = '#1b2440'; ctx.fillRect(-15, -6, 30, 3);
        if (front) { ctx.beginPath(); ctx.ellipse(flip * 4, -2.5, 12, 3.4, 0, 0, Math.PI * 2); ctx.fillStyle = '#141b30'; ctx.fill(); ctx.fillStyle = '#f6c445'; ctx.beginPath(); ctx.arc(0, -11, 2.6, 0, 7); ctx.fill(); }
        break;
      }
      case 'headphones': {
        ctx.strokeStyle = shade(a, -0.1); ctx.lineWidth = 3.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 0, 16.5, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
        for (const sx of [-1, 1]) {
          ctx.beginPath(); ctx.ellipse(sx * 15, 1, 4.6, 6.4, 0, 0, Math.PI * 2);
          ctx.fillStyle = a; ctx.fill();
          ctx.beginPath(); ctx.ellipse(sx * 15.6, 1, 2.6, 4.2, 0, 0, Math.PI * 2);
          ctx.fillStyle = b || shade(a, 0.3); ctx.fill();
        }
        break;
      }
      case 'bow': {
        ctx.save(); ctx.translate(8 * flip, -11); ctx.rotate(0.3 * flip);
        ctx.fillStyle = a;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-9, -8, -9, 0); ctx.quadraticCurveTo(-9, 7, 0, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(9, -8, 9, 0); ctx.quadraticCurveTo(9, 7, 0, 0); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); ctx.fillStyle = b || shade(a, -0.2); ctx.fill();
        ctx.restore();
        break;
      }
      case 'shades': {
        // little hair tuft
        ctx.strokeStyle = shade(st.yarn, -0.25); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-2, -14); ctx.quadraticCurveTo(0, -21, 4, -19); ctx.stroke();
        break;
      }
      default: break;
    }
  }

  // ------------------------------------------------------------------ furniture
  function shadowRect(ctx, x, y, w, d, a = 0.1) {
    poly(ctx, [P(x + 0.1, y + 0.15), P(x + w + 0.15, y + 0.15), P(x + w + 0.15, y + d + 0.2), P(x + 0.1, y + d + 0.2)], `rgba(80,60,30,${a})`);
  }

  /** desk with monitor. f: {x,y,w,d,face,seed, lead}, screen: {act, status, provider, t} */
  function desk(ctx, f, scr) {
    const { x, y, w, d } = f;
    const top = 24;
    shadowRect(ctx, x, y, w, d, 0.12);
    // drawer cabinet (white) at one end + legs at other
    const cabX = f.seed % 2 ? x + 0.08 : x + w - 0.62;
    sbox(ctx, cabX, y + 0.1, 0, 0.54, d - 0.2, top - 2, PAL.white, 'rgba(0,0,0,0.06)');
    // drawer lines on +y face
    onPlaneY(ctx, cabX, y + d - 0.1, top - 4, (g) => {
      g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 0.8;
      for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(1.5, i * 6.5); g.lineTo(15.5, i * 6.5); g.stroke(); }
      g.fillStyle = '#bdbab3'; for (let i = 0; i < 3; i++) g.fillRect(7, 2.5 + i * 6.5, 3, 1);
    });
    const legX = f.seed % 2 ? x + w - 0.12 : x + 0.04;
    sbox(ctx, legX, y + 0.08, 0, 0.08, 0.08, top - 2, PAL.white);
    sbox(ctx, legX, y + d - 0.16, 0, 0.08, 0.08, top - 2, PAL.white);
    // top
    if (f.premium) box(ctx, x, y, top - 2.5, w, d, 2.5, f.lead ? '#8a6247' : '#a07a5c', '#7a5540', '#6b4a35', 'rgba(60,40,20,0.2)');
    else box(ctx, x, y, top - 2.5, w, d, 2.5, f.lead ? '#e2cfa9' : '#ece0c8', '#d9c7a4', '#cdb894', 'rgba(120,90,50,0.15)');

    const facePlus = f.face === '-y'; // occupant faces -y => screen faces +y (visible)
    // occupant facing the camera: monitor sits to the side so the cute face stays visible
    const mx = f.mx ?? (facePlus ? x + w / 2 - 0.52 : x + 0.04);
    const my = facePlus ? y + 0.28 : y + d - 0.36;
    // keyboard + mouse
    const kx = facePlus ? mx + 0.12 : x + 0.64;
    const ky = facePlus ? y + d - 0.42 : y + 0.12;
    box(ctx, kx, ky, top, 0.72, 0.26, 1.2, '#f2f2f0', '#d6d6d2', '#c8c8c4');
    box(ctx, kx + 0.83, ky + 0.05, top, 0.12, 0.16, 1.2, '#efefed', '#d0d0cc', '#c4c4c0');
    // mug / papers / mini plant
    const r = AIO.rand(f.seed);
    const it = Math.floor(r() * 4);
    const ix = f.seed % 2 ? x + w - 0.35 : x + 0.25;
    const iy = facePlus ? y + 0.6 : y + 0.35;
    if (it === 0) cylinder(ctx, ix, iy, top, 0.07, 7, '#6b4b33', '#f7f5f0', 'rgba(0,0,0,0.12)');
    else if (it === 1) { box(ctx, ix - 0.15, iy - 0.1, top, 0.36, 0.26, 1, '#ffffff', '#e6e6e6', '#dddddd'); box(ctx, ix - 0.1, iy - 0.06, top + 1, 0.36, 0.26, 1, '#fdfbf6', '#e6e6e6', '#dddddd'); }
    else if (it === 2) { cylinder(ctx, ix, iy, top, 0.08, 6, '#d58b6b', '#c4623d'); leafBlob(ctx, ix, iy, top + 6, 0.55, f.seed); }
    else cylinder(ctx, ix, iy, top, 0.06, 7, '#9fd3c7', '#e9f5f2', 'rgba(0,0,0,0.12)');

    // monitor
    const z0 = top + 3, sh = 21, sw = 1.05;
    sbox(ctx, mx + sw / 2 - 0.06, my, top, 0.12, 0.08, 4, '#8d9196');
    box(ctx, mx + sw / 2 - 0.2, my - 0.08, top, 0.4, 0.24, 0.8, '#b8bcc0', '#a3a7ab', '#979b9f');
    box(ctx, mx, my, z0, sw, 0.07, sh, PAL.dark, '#2d3035', '#26292d');
    if (facePlus) {
      onPlaneY(ctx, mx, my + 0.07, z0 + sh, (g) => {
        g.fillStyle = '#1f2226'; g.fillRect(0, 0, sw * 32, sh);
        g.save(); g.beginPath(); g.rect(1.3, 1.3, sw * 32 - 2.6, sh - 2.6); g.clip();
        screen(g, sw * 32 - 2.6, sh - 2.6, scr, 1.3, 1.3);
        g.restore();
      });
    } else {
      onPlaneY(ctx, mx, my + 0.07, z0 + sh, (g) => {
        g.fillStyle = '#34383d'; g.fillRect(0, 0, sw * 32, sh);
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(sw * 16 - 3, sh / 2 - 3, 6, 6);
        if (scr && scr.on) { g.fillStyle = 'rgba(160,200,255,0.18)'; g.fillRect(0, 0, sw * 32, 1.2); }
      });
    }
    if (f.lead) {
      // name plate
      const px = x + (f.seed % 2 ? 0.35 : w - 0.8), py = facePlus ? y + d - 0.2 : y + 0.1;
      box(ctx, px, py, top, 0.5, 0.08, 4.5, '#333', '#2a2a2a', '#222');
      onPlaneY(ctx, px, py + 0.08, top + 4.5, (g) => { g.fillStyle = '#f6d58a'; g.font = `bold 3.5px ${FONT}`; g.fillText('지휘', 2.5, 3.6); });
    }
  }

  function leafBlob(ctx, cx, cy, z, s, seed) {
    const [sx, sy] = P(cx, cy, z);
    const r = AIO.rand(seed + 3);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.6 + (r() - 0.5) * 0.3;
      ctx.beginPath();
      ctx.ellipse(sx + Math.cos(a) * 4 * s, sy + Math.sin(a) * 4 * s - 2 * s, 3.4 * s, 1.8 * s, a, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? '#4e9a52' : '#3f8a45';
      ctx.fill();
    }
  }

  function chair(ctx, c, part) {
    // c: {x,y,face}; part 'seat' | 'back'
    const cx = c.x, cy = c.y;
    if (part === 'seat') {
      ellipseFloor(ctx, cx, cy, 0.28, 0.28, 0, 'rgba(60,60,60,0.12)');
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        const [x1, y1] = P(cx + Math.cos(a) * 0.24, cy + Math.sin(a) * 0.24, 1.5);
        const [x0, y0] = P(cx, cy, 2);
        ctx.strokeStyle = '#6d7175'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.fillStyle = '#4a4d51'; ctx.beginPath(); ctx.arc(x1, y1 + 1, 1.3, 0, Math.PI * 2); ctx.fill();
      }
      sbox(ctx, cx - 0.04, cy - 0.04, 2, 0.08, 0.08, 7, '#7b7f83');
      if (c.premium) box(ctx, cx - 0.27, cy - 0.27, 9, 0.54, 0.54, 3, '#4a3a32', '#3d2f28', '#32261f', 'rgba(0,0,0,0.12)');
      else box(ctx, cx - 0.27, cy - 0.27, 9, 0.54, 0.54, 3, '#b3b7bb', '#9da1a5', '#8e9296', 'rgba(0,0,0,0.08)');
      return;
    }
    const by = c.face === '+y' ? cy - 0.3 : cy + 0.22;
    sbox(ctx, cx - 0.04, by + 0.02, 12, 0.08, 0.06, 6, '#7b7f83');
    if (c.premium) box(ctx, cx - 0.27, by, 16, 0.54, 0.09, 19, '#4a3a32', '#3d2f28', '#32261f', 'rgba(0,0,0,0.12)');
    else box(ctx, cx - 0.26, by, 16, 0.52, 0.08, 15, '#b6babe', '#a0a4a8', '#8f9397', 'rgba(0,0,0,0.08)');
  }

  function plant(ctx, x, y, size = 1, seed = 1) {
    ellipseFloor(ctx, x, y + 0.05, 0.32 * size, 0.32 * size, 0, 'rgba(60,40,20,0.12)');
    // wooden stand
    for (const [dx, dy] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) sbox(ctx, x + dx * size - 0.02, y + dy * size - 0.02, 0, 0.04, 0.04, 9 * size, '#b8894f');
    cylinder(ctx, x, y, 8 * size, 0.24 * size, 14 * size, '#7a4a2a', PAL.pot, 'rgba(0,0,0,0.1)');
    const [sx, sy] = P(x, y, 22 * size);
    const r = AIO.rand(seed);
    const leaves = 9;
    for (let i = 0; i < leaves; i++) {
      const a = -Math.PI / 2 + (i / (leaves - 1) - 0.5) * 2.9 + (r() - 0.5) * 0.25;
      const len = (13 + r() * 9) * size;
      const lx = sx + Math.cos(a) * len * 0.7, ly = sy + Math.sin(a) * len * 0.55 - 6 * size;
      ctx.strokeStyle = '#4b7a3b'; ctx.lineWidth = 1.1 * size;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + Math.cos(a) * len * 0.3, sy - 10 * size, lx, ly); ctx.stroke();
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(a + Math.PI / 2 * 0.2);
      ctx.beginPath(); ctx.ellipse(0, 0, 8.5 * size, 5.5 * size, 0, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? '#5aa35a' : i % 3 === 1 ? '#3f8f4a' : '#4a9a4f'; ctx.fill();
      // monstera splits
      ctx.strokeStyle = 'rgba(240,240,220,0.55)'; ctx.lineWidth = 0.8 * size;
      for (let k = -1; k <= 1; k += 2) { ctx.beginPath(); ctx.moveTo(k * 2 * size, 0); ctx.lineTo(k * 7 * size, k * 2.5 * size); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(30,70,30,0.35)'; ctx.beginPath(); ctx.moveTo(-8 * size, 0); ctx.lineTo(8 * size, 0); ctx.stroke();
      ctx.restore();
    }
  }

  function lamp(ctx, x, y, night) {
    ellipseFloor(ctx, x, y, 0.22, 0.22, 0, '#8d9196');
    const [bx, by] = P(x, y, 0);
    ctx.strokeStyle = '#5d6166'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx - 11, by - 54); ctx.lineTo(bx - 5, by - 70); ctx.lineTo(bx + 5, by - 70); ctx.lineTo(bx + 11, by - 54); ctx.closePath();
    ctx.fillStyle = '#9b9fa4'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(bx, by - 54, 11, 3, 0, 0, Math.PI * 2); ctx.fillStyle = night ? '#fff3c4' : '#7d8186'; ctx.fill();
  }

  function sofa(ctx, x, y, w) {
    shadowRect(ctx, x, y, w, 1, 0.13);
    sbox(ctx, x + 0.05, y + 0.05, 0, w - 0.1, 0.9, 6, '#b8b0a3');
    box(ctx, x, y, 6, w, 1, 8, '#efe9df', '#ddd5c9', '#d1c9bc', 'rgba(0,0,0,0.06)');
    box(ctx, x, y - 0.02, 6, w, 0.35, 24, '#f2ece2', '#ddd5c9', '#d1c9bc', 'rgba(0,0,0,0.06)');
    box(ctx, x - 0.02, y, 6, 0.3, 1, 15, '#f2ece2', '#ddd5c9', '#d1c9bc', 'rgba(0,0,0,0.06)');
    box(ctx, x + w - 0.28, y, 6, 0.3, 1, 15, '#f2ece2', '#ddd5c9', '#d1c9bc', 'rgba(0,0,0,0.06)');
    // cushions
    box(ctx, x + 0.45, y + 0.28, 14, 0.5, 0.12, 12, '#8b2a3a', '#7a2232', '#6a1c2b');
    box(ctx, x + w - 0.95, y + 0.28, 14, 0.5, 0.12, 12, '#cfd5dc', '#bcc3cb', '#adb4bc');
  }

  function roundTable(ctx, cx, cy, r, color = '#f7f6f2') {
    ellipseFloor(ctx, cx + 0.1, cy + 0.1, r * 0.9, r * 0.9, 0, 'rgba(60,40,20,0.12)');
    cylinder(ctx, cx, cy, 0, r * 0.3, 2, '#c9c9c4', '#b9b9b4');
    sbox(ctx, cx - 0.05, cy - 0.05, 2, 0.1, 0.1, 16, '#c7c7c2');
    cylinder(ctx, cx, cy, 18, r, 3, color, '#dedbd4', 'rgba(0,0,0,0.08)');
  }

  function stool(ctx, x, y, color) {
    ellipseFloor(ctx, x + 0.05, y + 0.05, 0.24, 0.24, 0, 'rgba(60,40,20,0.12)');
    sbox(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, 8, '#b5b2ab');
    cylinder(ctx, x, y, 8, 0.26, 4, shade(color, 0.08), shade(color, -0.12));
  }

  function cabinet(ctx, x, y, w, coffee) {
    shadowRect(ctx, x, y, w, 0.8, 0.12);
    box(ctx, x, y, 0, w, 0.8, 26, '#d8b98a', '#c9a676', '#b8955f', 'rgba(90,60,20,0.2)');
    onPlaneY(ctx, x, y + 0.8, 24, (g) => {
      g.strokeStyle = 'rgba(90,60,20,0.35)'; g.lineWidth = 0.8;
      const W = w * 32;
      g.strokeRect(2, 2, W / 2 - 3, 19); g.strokeRect(W / 2 + 1, 2, W / 2 - 3, 19);
      g.fillStyle = '#8a6a3a'; g.fillRect(W / 2 - 4, 10, 1.5, 4); g.fillRect(W / 2 + 2.5, 10, 1.5, 4);
    });
    if (coffee) {
      // espresso machine
      box(ctx, x + 0.2, y + 0.2, 26, 0.5, 0.4, 16, '#efefec', '#d9d9d5', '#c9c9c5', 'rgba(0,0,0,0.1)');
      box(ctx, x + 0.2, y + 0.2, 42, 0.5, 0.4, 2, '#2e2e2e', '#262626', '#1f1f1f');
      box(ctx, x + 0.36, y + 0.55, 30, 0.2, 0.08, 3, '#555', '#444', '#3a3a3a');
      cylinder(ctx, x + 0.46, y + 0.62, 26, 0.06, 4, '#6b4b33', '#fff');
      // kettle
      cylinder(ctx, x + 1.1, y + 0.4, 26, 0.13, 10, '#333', '#2a2a2a');
      // mini plant
      cylinder(ctx, x + w - 0.3, y + 0.4, 26, 0.1, 6, '#ddd', '#f2f2f2');
      leafBlob(ctx, x + w - 0.3, y + 0.4, 32, 0.9, 5);
    }
  }

  function whiteboard(ctx, x, y, w, todos, color) {
    const h = 34, z0 = 22;
    sbox(ctx, x + 0.05, y - 0.05, 0, 0.06, 0.1, z0 + h, '#9a9ea3');
    sbox(ctx, x + w - 0.11, y - 0.05, 0, 0.06, 0.1, z0 + h, '#9a9ea3');
    box(ctx, x, y, z0, w, 0.06, h, '#ddd', '#f9f9f7', '#cfcfcf', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x, y + 0.06, z0 + h, (g) => {
      const W = w * 32;
      g.strokeStyle = '#c9c9c9'; g.lineWidth = 0.8; g.strokeRect(1, 1, W - 2, h - 2);
      const colors = ['#f7e27a', '#bfe6c8', '#f6c1c8', '#bcd7f5'];
      const list = (todos && todos.length ? todos : [null, null, null, null]).slice(0, 8);
      list.forEach((td, i) => {
        const cx = 4 + (i % 4) * ((W - 6) / 4), cy = 4 + Math.floor(i / 4) * 14;
        const done = td && (td.status === 'completed' || td.status === 'done');
        const prog = td && (td.status === 'in_progress');
        g.fillStyle = td ? (done ? '#d9d9d9' : prog ? '#f7e27a' : colors[i % 4]) : colors[i % 4];
        g.fillRect(cx, cy, (W - 6) / 4 - 2.5, 11);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        if (td) {
          g.font = `2.6px ${FONT}`;
          const txt = String(td.text || '').slice(0, 7);
          g.fillText(txt, cx + 1, cy + 4);
          if (done) { g.strokeStyle = '#3fb27f'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(cx + 2, cy + 8); g.lineTo(cx + 4, cy + 10); g.lineTo(cx + 8, cy + 6); g.stroke(); }
        } else { g.fillRect(cx + 1.5, cy + 3, 6, 0.8); g.fillRect(cx + 1.5, cy + 6, 4, 0.8); }
      });
      if (color) { g.fillStyle = color; g.fillRect(1, h - 4, W - 2, 3); }
    });
  }

  /** little A-frame easel: "오늘의 규칙" board */
  function easel(ctx, x, y, lines) {
    const [bx, by] = P(x, y, 0);
    ctx.strokeStyle = '#a07a4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx - 10, by); ctx.lineTo(bx - 4, by - 46); ctx.moveTo(bx + 10, by); ctx.lineTo(bx + 4, by - 46); ctx.moveTo(bx, by - 2); ctx.lineTo(bx, by - 40); ctx.stroke();
    onPlaneY(ctx, x - 0.55, y, 50, (g) => {
      g.fillStyle = '#3d4a3f'; roundRect(g, 0, 0, 36, 30, 2); g.fill();
      g.strokeStyle = '#b8894f'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#f6efd8'; g.font = `4px ${FONT}`; g.fillText('오늘의 규칙', 3, 6);
      g.font = `3px ${FONT}`; g.fillStyle = '#e8e3cf';
      lines.slice(0, 4).forEach((l, i) => g.fillText(l, 3, 12 + i * 4.6));
    });
  }

  function bookshelf(ctx, x, y, w, seed) {
    shadowRect(ctx, x, y, w, 0.5, 0.1);
    box(ctx, x, y, 0, w, 0.5, 58, '#e3d2b4', '#cdb894', '#bfa985', 'rgba(90,60,20,0.2)');
    onPlaneY(ctx, x, y + 0.5, 56, (g) => {
      const r = AIO.rand(seed); const W = w * 32;
      const cols = ['#d97757', '#4e7cf6', '#3f8f4a', '#e9a23b', '#7a2232', '#8b7d6b', '#a67be0', '#10a37f'];
      for (let s = 0; s < 3; s++) {
        g.fillStyle = '#b89c70'; g.fillRect(1, s * 18 + 16, W - 2, 1.5);
        let bx = 2;
        while (bx < W - 4) { const bw = 2 + r() * 2.5, bh = 9 + r() * 6; g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(bx, s * 18 + 16 - bh, bw, bh); bx += bw + 0.6; if (r() < 0.08) bx += 4; }
      }
    });
  }

  function printer(ctx, x, y, busy, t) {
    box(ctx, x, y, 0, 0.9, 0.7, 16, '#d7d3cb', '#c4bfb5', '#b6b0a6');
    box(ctx, x + 0.05, y + 0.05, 16, 0.8, 0.6, 10, '#f3f2ee', '#dedcd6', '#d1cec7', 'rgba(0,0,0,0.1)');
    box(ctx, x + 0.2, y + 0.55, 18, 0.5, 0.2, 1, '#fff', '#eee', '#e4e4e4');
    const [lx, ly] = P(x + 0.75, y + 0.65, 24);
    ctx.fillStyle = busy && Math.sin(t * 8) > 0 ? '#3fb27f' : '#9ac7ad'; ctx.beginPath(); ctx.arc(lx, ly, 1.4, 0, Math.PI * 2); ctx.fill();
  }

  function waterCooler(ctx, x, y) {
    box(ctx, x, y, 0, 0.5, 0.5, 26, '#f2f2ef', '#dededa', '#d1d1cc', 'rgba(0,0,0,0.1)');
    cylinder(ctx, x + 0.25, y + 0.25, 26, 0.2, 18, '#bfe3f5', 'rgba(150,205,235,0.85)');
  }

  function coatRack(ctx, x, y, coats) {
    ellipseFloor(ctx, x, y, 0.2, 0.2, 0, '#7a5a35');
    const [bx, by] = P(x, y, 0);
    ctx.strokeStyle = '#8a6a3f'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 66); ctx.stroke();
    const cols = coats.slice(0, 4);
    cols.forEach((c, i) => {
      const a = i % 2 ? 1 : -1;
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(bx + a * 2, by - 62 + i * 3); ctx.quadraticCurveTo(bx + a * 12, by - 50, bx + a * 9, by - 30 + i * 2); ctx.lineTo(bx + a * 2, by - 32 + i * 2); ctx.closePath(); ctx.fill();
    });
  }

  function rug(ctx, x, y, w, d, color, border) {
    poly(ctx, [P(x, y), P(x + w, y), P(x + w, y + d), P(x, y + d)], color);
    if (border) poly(ctx, [P(x + 0.15, y + 0.15), P(x + w - 0.15, y + 0.15), P(x + w - 0.15, y + d - 0.15), P(x + 0.15, y + d - 0.15)], null, border, 1.2);
  }

  // ------------------------------------------------------------------ monitor screens
  /** draws inside a w×h screen (local coords, origin ox,oy) */
  function screen(g, w, h, scr, ox, oy) {
    const t = scr?.t || 0;
    g.save(); g.translate(ox, oy);
    const act = scr?.act || 'off';
    const lines = (n, colorFn, speed = 6, x0 = 2) => {
      const lh = 2.4, off = (t * speed) % lh;
      for (let i = -1; i < n; i++) {
        const k = Math.floor(t * speed / lh) + i;
        const r = AIO.rand(k * 31 + (scr?.seed || 0));
        g.fillStyle = colorFn(r, k);
        g.fillRect(x0 + Math.floor(r() * 3) * 2, i * lh - off + 2, 6 + r() * (w - 12), 1.1);
      }
    };
    switch (act) {
      case 'off': g.fillStyle = '#16181b'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(2, 2, w * 0.4, 1); break;
      case 'sleep': {
        g.fillStyle = '#101418'; g.fillRect(0, 0, w, h);
        const x = (Math.sin(t * 0.4) * 0.5 + 0.5) * (w - 6), y = (Math.cos(t * 0.33) * 0.5 + 0.5) * (h - 4);
        g.fillStyle = 'rgba(160,190,255,0.5)'; g.font = `3px ${FONT}`; g.fillText('z', x, y + 3);
        break;
      }
      case 'edit': {
        g.fillStyle = '#1e2430'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#2a3242'; g.fillRect(0, 0, 4, h);
        const cols = ['#7fb3ff', '#f7b267', '#9be29b', '#e58bd3', '#d6dbe4'];
        lines(8, (r) => cols[Math.floor(r() * cols.length)], 3.5, 5.5);
        g.fillStyle = '#ffd866'; if (Math.sin(t * 6) > 0) g.fillRect(10 + (t * 9 % (w - 14)), h - 5, 0.8, 2.4);
        break;
      }
      case 'terminal': {
        g.fillStyle = '#0c0f0c'; g.fillRect(0, 0, w, h);
        lines(8, (r) => (r() < 0.15 ? '#ffd866' : '#5fe08a'), 7);
        break;
      }
      case 'web': {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#e8eaed'; g.fillRect(0, 0, w, 3.2);
        g.fillStyle = '#ff6159'; g.fillRect(1, 1, 1, 1); g.fillStyle = '#ffbd2e'; g.fillRect(2.6, 1, 1, 1); g.fillStyle = '#28c840'; g.fillRect(4.2, 1, 1, 1);
        const sc = (t * 3) % 10;
        g.fillStyle = '#4e7cf6'; g.fillRect(3, 5 - sc * 0.3, w * 0.5, 2);
        g.fillStyle = '#d5d9df'; for (let i = 0; i < 5; i++) g.fillRect(3, 9 + i * 2.4 - sc * 0.3, w - 6 - (i % 2) * 8, 1);
        g.fillStyle = '#f0c27a'; g.fillRect(w - 10, 8 - sc * 0.3, 7, 6);
        break;
      }
      case 'search': {
        g.fillStyle = '#f7f8fa'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#e4e7ec'; g.fillRect(2, 2, w - 4, 3);
        for (let i = 0; i < 4; i++) { g.fillStyle = i === Math.floor(t * 2) % 4 ? '#ffe28a' : '#d5d9df'; g.fillRect(3, 7 + i * 3, w - 8 - i * 2, 1.6); }
        const mx = 6 + (Math.sin(t * 2) * 0.5 + 0.5) * (w - 12), my = 9 + Math.cos(t * 2.6) * 3;
        g.strokeStyle = '#555'; g.lineWidth = 0.9; g.beginPath(); g.arc(mx, my, 2.4, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(mx + 1.7, my + 1.7); g.lineTo(mx + 3.6, my + 3.6); g.stroke();
        break;
      }
      case 'read': {
        g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#e0dbd0'; g.fillRect(w / 2 - 0.3, 1, 0.6, h - 2);
        lines(8, () => '#b9b3a6', 1.5, 2);
        g.fillStyle = 'rgba(255,220,120,0.5)'; g.fillRect(3, ((t * 4) % h), w / 2 - 5, 1.6);
        break;
      }
      case 'think': {
        const gr = g.createLinearGradient(0, 0, w, h);
        gr.addColorStop(0, '#2b2a4a'); gr.addColorStop(1, '#4a3a5e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 3; i++) { const a = 0.3 + 0.7 * Math.max(0, Math.sin(t * 4 - i * 0.8)); g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.arc(w / 2 - 5 + i * 5, h / 2, 1.4, 0, Math.PI * 2); g.fill(); }
        break;
      }
      case 'delegate': case 'meeting': {
        g.fillStyle = '#f4f1fb'; g.fillRect(0, 0, w, h);
        const c = scr?.accent || '#a67be0';
        g.fillStyle = c; g.beginPath(); g.arc(w / 2, 4.5, 2.4, 0, Math.PI * 2); g.fill();
        g.strokeStyle = c; g.lineWidth = 0.6;
        for (let i = 0; i < 4; i++) {
          const x = 4 + i * (w - 8) / 3;
          g.beginPath(); g.moveTo(w / 2, 6.5); g.lineTo(x, 12); g.stroke();
          const on = Math.floor(t * 2) % 4 === i;
          g.fillStyle = on ? c : '#cdc3e6'; g.beginPath(); g.arc(x, 13.5, 1.9, 0, Math.PI * 2); g.fill();
        }
        break;
      }
      case 'plan': {
        g.fillStyle = '#fffdf3'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 4; i++) {
          const done = i < Math.floor(t) % 5;
          g.strokeStyle = '#999'; g.lineWidth = 0.5; g.strokeRect(2.5, 2.5 + i * 4, 2.2, 2.2);
          if (done) { g.fillStyle = '#3fb27f'; g.fillRect(3, 3 + i * 4, 1.4, 1.4); }
          g.fillStyle = done ? '#bbb' : '#777'; g.fillRect(6.5, 3.2 + i * 4, w - 12 - i * 2, 1);
        }
        break;
      }
      case 'ask': {
        const on = Math.sin(t * 5) > 0;
        g.fillStyle = on ? '#e5534b' : '#b8322b'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff'; g.font = `bold 13px ${FONT}`; g.textAlign = 'center'; g.fillText('?', w / 2, h / 2 + 5);
        break;
      }
      case 'done': {
        g.fillStyle = '#e8f4ff'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#3fb27f'; g.lineWidth = 1.8; g.lineCap = 'round';
        g.beginPath(); g.moveTo(w / 2 - 5, h / 2); g.lineTo(w / 2 - 1.5, h / 2 + 3.5); g.lineTo(w / 2 + 5, h / 2 - 3.5); g.stroke();
        break;
      }
      case 'idle': {
        const gr = g.createLinearGradient(0, 0, w, h);
        gr.addColorStop(0, scr?.accent ? shade(scr.accent, 0.3) : '#9ec5e8'); gr.addColorStop(1, scr?.accent ? shade(scr.accent, -0.2) : '#5d8fc4');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `7px ${FONT}`; g.textAlign = 'center'; g.fillText(scr?.logo || '●', w / 2, h / 2 + 2.5);
        break;
      }
      default: {
        g.fillStyle = '#20242b'; g.fillRect(0, 0, w, h);
        lines(6, (r) => (r() < 0.5 ? '#8fb8ff' : '#c9d1dd'), 4);
      }
    }
    g.restore();
  }

  // ------------------------------------------------------------------ walls & decor
  function windowOnLeftWall(ctx, y0, sky, t) {
    // y0 = left (front) end of the window on plane x=0, width 2 tiles
    onPlaneX(ctx, 0.02, y0, 82, (g) => {
      const W = 64, H = 46;
      g.fillStyle = '#f6f5f2'; g.fillRect(-2, -2, W + 4, H + 4);
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      if (sky.stars) { g.fillStyle = 'rgba(255,255,255,0.8)'; const r = AIO.rand(Math.floor(y0 * 13)); for (let i = 0; i < 6; i++) g.fillRect(r() * W, r() * H * 0.7, 0.8, 0.8); }
      if (sky.cloud) { g.fillStyle = 'rgba(255,255,255,0.7)'; const cx = ((t * 1.5 + y0 * 17) % (W + 20)) - 10; g.beginPath(); g.ellipse(cx, 12, 8, 3, 0, 0, Math.PI * 2); g.ellipse(cx + 6, 10, 6, 3, 0, 0, Math.PI * 2); g.fill(); }
      // distant buildings
      g.fillStyle = sky.bld; for (let i = 0; i < 6; i++) { const bh = 8 + ((i * 37 + y0 * 7) % 13); g.fillRect(i * 11, H - bh, 9, bh); }
      if (sky.stars) { g.fillStyle = '#ffe9a8'; for (let i = 0; i < 6; i++) for (let k = 0; k < 2; k++) if ((i + k + Math.floor(y0)) % 3 === 0) g.fillRect(i * 11 + 2 + k * 4, H - 5 - k * 3, 1.5, 1.5); }
      g.fillStyle = '#f6f5f2'; g.fillRect(W / 2 - 1, 0, 2, H); g.fillRect(0, H / 2 - 1, W, 2);
      g.strokeStyle = '#d8d6d0'; g.lineWidth = 1; g.strokeRect(-2, -2, W + 4, H + 4);
      g.fillStyle = '#e9e7e2'; g.fillRect(-4, H + 2, W + 8, 3);
    });
  }

  function door(ctx, y0) {
    onPlaneX(ctx, 0.02, y0, 74, (g) => {
      g.fillStyle = '#d9d5ce'; g.fillRect(-3, -3, 46, 77);
      g.fillStyle = '#c9a676'; g.fillRect(0, 0, 40, 74);
      g.strokeStyle = 'rgba(90,60,20,0.3)'; g.lineWidth = 1; g.strokeRect(5, 6, 30, 26); g.strokeRect(5, 38, 30, 30);
      g.fillStyle = '#e9e1d2'; g.fillRect(9, 10, 22, 18);
      g.fillStyle = '#8a8f94'; g.beginPath(); g.arc(34, 40, 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2f7d4f'; g.fillRect(8, -14, 24, 8); g.fillStyle = '#fff'; g.font = `5px ${FONT}`; g.fillText('출입문', 12, -8.2);
    });
  }

  function bulletin(ctx, x0, notes) {
    onPlaneY(ctx, x0, 0.02, 84, (g) => {
      const W = 112, H = 46;
      g.fillStyle = '#b98b55'; g.fillRect(-3, -3, W + 6, H + 6);
      g.fillStyle = PAL.cork; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(120,80,40,0.25)'; const r = AIO.rand(7); for (let i = 0; i < 70; i++) g.fillRect(r() * W, r() * H, 0.8, 0.8);
      // title card
      g.fillStyle = '#fff'; g.fillRect(4, 3, 30, 9); g.fillStyle = '#e5534b'; g.fillRect(4, 3, 30, 2);
      g.fillStyle = '#3b332b'; g.font = `4.2px ${FONT}`; g.fillText('대표 결정 필요', 5.5, 10.5);
      const list = notes.slice(0, 3);
      if (!list.length) { g.fillStyle = '#e8f6ee'; g.fillRect(40, 10, 34, 24); g.fillStyle = '#3fb27f'; g.font = `4px ${FONT}`; g.fillText('결정할 일 없음 🎉', 42, 23); }
      list.forEach((n, i) => {
        const x = 6 + i * 35, y = 15 + (i % 2) * 3;
        g.save(); g.translate(x + 15, y + 12); g.rotate((i - 1) * 0.05);
        g.fillStyle = n.urgent ? '#ffd9d6' : PAL.mint; g.fillRect(-15, -12, 30, 25);
        g.fillStyle = '#e5534b'; g.beginPath(); g.arc(0, -11, 1.6, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#3b332b'; g.font = `3.4px ${FONT}`;
        const words = String(n.text);
        g.fillText(words.slice(0, 9), -13, -5); g.fillText(words.slice(9, 18), -13, -0.5);
        g.fillStyle = '#7a6e61'; g.font = `2.8px ${FONT}`; g.fillText(n.sub || '', -13, 8);
        g.restore();
      });
    });
  }

  function calendar(ctx, x0, date) {
    onPlaneY(ctx, x0, 0.02, 86, (g) => {
      const W = 52, H = 60;
      g.fillStyle = '#b98b55'; g.fillRect(-2, -2, W + 4, H + 4);
      g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#2f5d46'; g.fillRect(0, 0, W, 13);
      g.fillStyle = '#fff'; g.font = `8px ${FONT}`; g.textAlign = 'center'; g.fillText(`${date.getMonth() + 1}월`, W / 2, 10);
      g.font = `3.2px ${FONT}`;
      const first = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
      const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      g.fillStyle = '#999'; ['일', '월', '화', '수', '목', '금', '토'].forEach((d, i) => g.fillText(d, 5 + i * 7, 18));
      for (let dnum = 1; dnum <= days; dnum++) {
        const idx = first + dnum - 1, cx = 5 + (idx % 7) * 7, cy = 24 + Math.floor(idx / 7) * 6.6;
        if (dnum === date.getDate()) { g.fillStyle = '#2b2622'; g.beginPath(); g.arc(cx, cy - 1.2, 2.8, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; }
        else g.fillStyle = idx % 7 === 0 ? '#e5534b' : '#555';
        g.fillText(String(dnum), cx, cy);
      }
      g.textAlign = 'left';
    });
  }

  function clock(ctx, x0, now, z = 78) {
    onPlaneY(ctx, x0, 0.02, z, (g) => {
      const r = 13;
      g.save(); g.translate(r + 2, r + 2);
      g.beginPath(); g.arc(0, 0, r + 1.6, 0, Math.PI * 2); g.fillStyle = '#5d6166'; g.fill();
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = '#fbfaf7'; g.fill();
      g.strokeStyle = '#555'; g.lineWidth = 0.7;
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(Math.sin(a) * r * 0.8, -Math.cos(a) * r * 0.8); g.lineTo(Math.sin(a) * r * 0.92, -Math.cos(a) * r * 0.92); g.stroke(); }
      const h = now.getHours() % 12 + now.getMinutes() / 60, m = now.getMinutes() + now.getSeconds() / 60, s = now.getSeconds() + now.getMilliseconds() / 1000;
      const hand = (a, len, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(a) * len, -Math.cos(a) * len); g.stroke(); };
      hand(h / 12 * Math.PI * 2, r * 0.5, 1.6, '#333'); hand(m / 60 * Math.PI * 2, r * 0.75, 1.1, '#333'); hand(s / 60 * Math.PI * 2, r * 0.82, 0.5, '#e5534b');
      g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fillStyle = '#333'; g.fill();
      g.restore();
    });
  }

  function frame(ctx, x0, seed, wall = 'y', y0) {
    const draw = (g) => {
      const W = 34, H = 42;
      g.fillStyle = '#3a3a3a'; g.fillRect(-2, -2, W + 4, H + 4);
      g.fillStyle = '#efece6'; g.fillRect(0, 0, W, H);
      const r = AIO.rand(seed);
      const c1 = ['#b9a68a', '#8fa9a0', '#c99a84', '#9aa5bf'][seed % 4];
      g.fillStyle = shade(c1, 0.3); g.fillRect(4, 4, W - 8, H - 8);
      g.fillStyle = c1; g.beginPath(); g.moveTo(4, H - 14); g.lineTo(14, H - 26 - r() * 6); g.lineTo(22, H - 18); g.lineTo(30, H - 24); g.lineTo(30, H - 4); g.lineTo(4, H - 4); g.fill();
      g.fillStyle = shade(c1, -0.25); g.beginPath(); g.arc(24, 12, 3.4, 0, Math.PI * 2); g.fill();
    };
    if (wall === 'y') onPlaneY(ctx, x0, 0.02, 90, draw); else onPlaneX(ctx, 0.02, y0, 90, draw);
  }

  function plaque(ctx, x0, text) {
    onPlaneY(ctx, x0, 0.02, 92, (g) => {
      g.font = `bold 11px ${FONT}`;
      const W = Math.max(96, g.measureText(text).width + 24), H = 22;
      g.fillStyle = '#3b332b'; AIO.iso.roundRect(g, 0, 0, W, H, 6); g.fill();
      g.fillStyle = '#f6d58a'; g.textAlign = 'center'; g.fillText(text, W / 2, 15);
      g.textAlign = 'left';
    });
  }

  // ------------------------------------------------------------------ labels & bubbles (screen space, unscaled)
  function measure(ctx, text, font) { ctx.font = font; return ctx.measureText(text).width; }

  function nameTag(ctx, x, y, name, sub, opt = {}) {
    const f1 = `${opt.small ? 10 : 12}px ${FONT}`, f2 = `${opt.small ? 9 : 10}px ${FONT}`;
    const w = Math.max(measure(ctx, name, f1), measure(ctx, sub, f2) + (opt.dot ? 10 : 0)) + 14;
    const h = opt.small ? 26 : 30;
    const bx = x - w / 2, by = y - h;
    ctx.save();
    ctx.shadowColor = 'rgba(60,40,20,0.18)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    roundRect(ctx, bx, by, w, h, 6);
    ctx.fillStyle = opt.dim ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.95)'; ctx.fill();
    ctx.restore();
    if (opt.lead) { roundRect(ctx, bx, by, w, h, 6); ctx.strokeStyle = '#2b2622'; ctx.lineWidth = 2; ctx.stroke(); }
    if (opt.selected) { roundRect(ctx, bx - 2, by - 2, w + 4, h + 4, 8); ctx.strokeStyle = '#f0a03c'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = '#2b2622'; ctx.font = f1; ctx.textAlign = 'center';
    ctx.fillText(name, x, by + (opt.small ? 11 : 13));
    ctx.font = f2; ctx.fillStyle = '#7a6e61';
    const sw = measure(ctx, sub, f2);
    const sx = x + (opt.dot ? 5 : 0);
    ctx.fillText(sub, sx, by + (opt.small ? 22 : 25));
    if (opt.dot) { ctx.beginPath(); ctx.arc(sx - sw / 2 - 6, by + (opt.small ? 19 : 21.5), 3.2, 0, Math.PI * 2); ctx.fillStyle = opt.dot; ctx.fill(); }
    ctx.textAlign = 'left';
    return { x: bx, y: by, w, h };
  }

  function bubble(ctx, x, y, text, opt = {}) {
    const font = `${opt.big ? 13 : 12}px ${FONT}`;
    const w = measure(ctx, text, font) + 20, h = opt.big ? 28 : 25;
    const bx = x - w / 2, by = y - h - 7;
    ctx.save();
    if (opt.wobble) ctx.translate(0, Math.sin(opt.t * 6) * 1.5);
    ctx.shadowColor = 'rgba(60,40,20,0.18)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    ctx.beginPath();
    roundRect(ctx, bx, by, w, h, h / 2);
    ctx.moveTo(x - 6, by + h - 0.5); ctx.lineTo(x, by + h + 7); ctx.lineTo(x + 5, by + h - 0.5);
    ctx.fillStyle = opt.bg || '#fff'; ctx.fill();
    ctx.restore();
    if (opt.border) { ctx.save(); if (opt.wobble) ctx.translate(0, Math.sin(opt.t * 6) * 1.5); roundRect(ctx, bx, by, w, h, h / 2); ctx.strokeStyle = opt.border; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
    ctx.save(); if (opt.wobble) ctx.translate(0, Math.sin(opt.t * 6) * 1.5);
    ctx.fillStyle = opt.fg || '#2b2622'; ctx.font = font; ctx.textAlign = 'center';
    ctx.fillText(text, x, by + h / 2 + 4.5);
    ctx.restore();
    ctx.textAlign = 'left';
    return { x: bx, y: by, w, h };
  }

  function zzz(ctx, x, y, t) {
    ctx.save(); ctx.font = `bold 11px ${FONT}`; ctx.fillStyle = 'rgba(110,130,190,0.85)';
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.6 + i / 3) % 1);
      ctx.globalAlpha = Math.sin(k * Math.PI);
      ctx.font = `bold ${8 + k * 6}px ${FONT}`;
      ctx.fillText('z', x + k * 14 + Math.sin(k * 6) * 2, y - k * 22);
    }
    ctx.restore();
  }

  function sparkles(ctx, x, y, t, color = '#f6c445') {
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const a = t * 2 + i * 1.256, r = 18 + Math.sin(t * 5 + i) * 4;
      const sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * 0.6;
      const s = 2.2 + Math.sin(t * 8 + i) * 1.2;
      ctx.fillStyle = i % 2 ? color : '#fff6c9';
      ctx.beginPath(); ctx.moveTo(sx, sy - s * 2); ctx.lineTo(sx + s * 0.5, sy - s * 0.5); ctx.lineTo(sx + s * 2, sy); ctx.lineTo(sx + s * 0.5, sy + s * 0.5);
      ctx.lineTo(sx, sy + s * 2); ctx.lineTo(sx - s * 0.5, sy + s * 0.5); ctx.lineTo(sx - s * 2, sy); ctx.lineTo(sx - s * 0.5, sy - s * 0.5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function exclaim(ctx, x, y, t) {
    const b = Math.abs(Math.sin(t * 6)) * 4;
    ctx.save();
    ctx.translate(x, y - b);
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fillStyle = '#e5534b'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('!', 0, 5);
    ctx.restore();
  }

  function heart(ctx, x, y, t) {
    const k = (t % 1.2) / 1.2;
    ctx.save(); ctx.globalAlpha = 1 - k; ctx.translate(x, y - k * 18); ctx.scale(0.8 + k * 0.4, 0.8 + k * 0.4);
    ctx.fillStyle = '#f07a8a'; ctx.beginPath(); ctx.moveTo(0, 3); ctx.bezierCurveTo(-7, -3, -3, -8, 0, -4); ctx.bezierCurveTo(3, -8, 7, -3, 0, 3); ctx.fill();
    ctx.restore();
  }

  AIO.art = {
    PAL, FONT, character, desk, chair, plant, lamp, sofa, roundTable, stool, cabinet, whiteboard, easel, bookshelf, printer, waterCooler, coatRack, rug,
    windowOnLeftWall, door, bulletin, calendar, clock, frame, plaque, nameTag, bubble, zzz, sparkles, exclaim, heart, screen, leafBlob,
  };
})();
