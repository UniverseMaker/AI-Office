// v4 소품: 엘리베이터 사이 기둥(층 안내판이 가려지지 않게) · 층 이름 행잉 간판 · B6 비밀던전 (횃불 · 보물상자 · 돌기둥 · 철창 우리와 슬라임 · 뼈).
(function () {
  const C = AIO.compose;
  const { P, shade, poly, box, sbox, cylinder, ellipseFloor, onPlaneY, roundRect } = AIO.iso;
  const FONT = AIO.art.FONT;

  /** 두 엘리베이터 사이를 메우는 벽 기둥: 앞면(y+d)에 층 안내판이 붙는다 */
  C.prop('v4_elevPillar', {
    draw(ctx, f) { box(ctx, f.x, f.y, 0, f.w || 1, f.d || 2, 72, '#d9dde1', '#c4cacf', '#b2b8be', 'rgba(0,0,0,0.12)'); },
    depth: (f) => f.x + (f.w || 1) / 2 + f.y + (f.d || 2) - 0.2,
  });

  /** 천장에 매단 층 간판 (빌딩 관리에서 정한 층 이름) */
  C.prop('v4_floorSign', {
    draw(ctx, f) {
      const w = f.w || 6, z = 96;
      for (const dx of [0.6, w - 0.6]) { const [a, b] = P(f.x + dx, f.y, 104), [c, d] = P(f.x + dx, f.y, z); ctx.strokeStyle = 'rgba(80,80,80,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
      onPlaneY(ctx, f.x, f.y, z, (g) => {
        const W = w * 32, H = 22;
        g.fillStyle = f.bg || '#2b2622'; roundRect(g, 0, 0, W, H, 5); g.fill();
        g.fillStyle = f.accent || '#f0a03c'; g.fillRect(6, H - 4, W - 12, 2);
        g.fillStyle = '#fff8ea'; g.font = `bold 11px ${FONT}`; g.textAlign = 'center';
        let t = String(f.text || ''); while (t.length > 2 && g.measureText(t).width > W - 14) t = t.slice(0, -2) + '…';
        g.fillText(t, W / 2, 14); g.textAlign = 'left';
      });
    },
    depth: (f) => f.x + (f.w || 6) / 2 + f.y - 0.3,
  });

  // ---------------------------------------------------------------- 🐉 비밀던전
  C.prop('v4_torch', {
    dynamic: true,
    draw(ctx, f, t) {
      sbox(ctx, f.x - 0.06, f.y - 0.06, 0, 0.12, 0.12, 34, '#4a3a2c');
      box(ctx, f.x - 0.14, f.y - 0.14, 34, 0.28, 0.28, 5, '#6b5440', '#5a4535', '#4d3a2c');
      const [sx, sy] = P(f.x, f.y, 40), k = Math.sin(t * 9 + f.x * 3) * 1.5, k2 = Math.cos(t * 7 + f.y) * 1.2;
      const gg = ctx.createRadialGradient(sx, sy - 6, 1, sx, sy - 6, 34); gg.addColorStop(0, 'rgba(255,170,60,0.35)'); gg.addColorStop(1, 'rgba(255,140,40,0)');
      ctx.fillStyle = gg; ctx.fillRect(sx - 34, sy - 40, 68, 68);
      ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(sx - 5, sy); ctx.quadraticCurveTo(sx - 6 + k, sy - 10, sx + k2, sy - 17 - k); ctx.quadraticCurveTo(sx + 6 + k, sy - 8, sx + 5, sy); ctx.fill();
      ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(sx - 2.5, sy); ctx.quadraticCurveTo(sx - 3, sy - 6, sx + k2 * 0.5, sy - 10); ctx.quadraticCurveTo(sx + 3, sy - 5, sx + 2.5, sy); ctx.fill();
    },
  });
  C.prop('v4_chest', {
    draw(ctx, f, t) {
      const { x, y } = f;
      box(ctx, x, y, 0, 1.2, 0.8, 12, '#a0662e', '#8a5426', '#74461f', 'rgba(0,0,0,0.25)');
      box(ctx, x - 0.03, y - 0.03, 12, 1.26, 0.86, 5, '#b8783a', '#9a612c', '#844f23', 'rgba(0,0,0,0.25)');
      for (const dx of [0.15, 1.0]) box(ctx, x + dx, y + 0.78, 0, 0.08, 0.04, 17, '#d9b44a', '#c9a23c', '#b08a2e');
      onPlaneY(ctx, x + 0.45, y + 0.82, 15, (g) => { g.fillStyle = '#e8c25a'; g.fillRect(2, 2, 6, 7); g.fillStyle = '#3b2a1a'; g.fillRect(4, 5, 2, 3); });
      const [sx, sy] = P(x + 0.6, y + 0.4, 18);
      ctx.fillStyle = '#ffd34d'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(sx - 8 + i * 4, sy - 1 - (i % 2) * 2, 3, 1.6, 0, 0, 7); ctx.fill(); }
      if (Math.sin(t * 3 + x) > 0.6) { ctx.fillStyle = '#fff'; ctx.fillRect(sx + 3, sy - 7, 1.6, 1.6); }
    },
  });
  C.prop('v4_stonePillar', {
    draw(ctx, f) {
      box(ctx, f.x - 0.1, f.y - 0.1, 0, 0.9, 0.9, 6, '#7d7770', '#6b655e', '#5d5751');
      box(ctx, f.x, f.y, 6, 0.7, 0.7, 70, '#8f8981', '#7a746d', '#69635d', 'rgba(0,0,0,0.18)');
      for (let z = 14; z < 70; z += 14) poly(ctx, [P(f.x, f.y + 0.7, z), P(f.x + 0.7, f.y + 0.7, z)], null, 'rgba(0,0,0,0.18)');
    },
    depth: (f) => f.x + f.y + 0.7,
  });
  C.prop('v4_cage', {
    dynamic: true,
    draw(ctx, f, t) {
      const { x, y } = f, w = 2, d = 2, h = 44;
      box(ctx, x, y, 0, w, d, 3, '#4a4744', '#3b3936', '#2f2d2b');
      // 슬라임
      const b = Math.abs(Math.sin(t * 2.4 + x)) * 4;
      const [sx, sy] = P(x + 1, y + 1, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx, sy, 16, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#5fd36a'; ctx.beginPath(); ctx.ellipse(sx, sy - 9 - b, 15 - b * 0.4, 12 + b * 0.4, 0, Math.PI, 0); ctx.lineTo(sx + 15, sy - 2); ctx.quadraticCurveTo(sx, sy + 3, sx - 15, sy - 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(sx - 6, sy - 15 - b, 4, 2.5, -0.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#1d2a1d'; ctx.fillRect(sx - 6, sy - 11 - b, 2.4, 3.2); ctx.fillRect(sx + 4, sy - 11 - b, 2.4, 3.2);
      // 철창
      ctx.strokeStyle = '#3b3f45'; ctx.lineWidth = 1.6;
      for (let i = 0; i <= 8; i++) { const u = i / 8; for (const [ax, ay] of [[x + u * w, y + d], [x + w, y + u * d]]) { const [p1, q1] = P(ax, ay, 3), [p2, q2] = P(ax, ay, h); ctx.beginPath(); ctx.moveTo(p1, q1); ctx.lineTo(p2, q2); ctx.stroke(); } }
      poly(ctx, [P(x, y, h), P(x + w, y, h), P(x + w, y + d, h), P(x, y + d, h)], 'rgba(60,60,60,0.25)', '#3b3f45', 1.4);
    },
    depth: (f) => f.x + 1 + f.y + 1.6,
  });
  C.prop('v4_bones', { draw(ctx, f) {
    const [sx, sy] = P(f.x, f.y, 0);
    ctx.fillStyle = '#efe9dc'; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.arc(sx, sy - 5, 5, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2b2622'; ctx.fillRect(sx - 3, sy - 6, 2, 2); ctx.fillRect(sx + 1, sy - 6, 2, 2);
    ctx.strokeStyle = '#efe9dc'; ctx.lineWidth = 2; for (const [a, b, c, e] of [[-12, 2, 10, -2], [-9, -2, 12, 3]]) { ctx.beginPath(); ctx.moveTo(sx + a, sy + b); ctx.lineTo(sx + c, sy + e); ctx.stroke(); }
  } });
  C.prop('v4_chainBench', { draw(ctx, f) {
    box(ctx, f.x, f.y, 0, f.w || 2.4, 0.5, 10, '#6b655e', '#5a544e', '#4d4843', 'rgba(0,0,0,0.2)');
    ctx.strokeStyle = '#4a4744'; ctx.lineWidth = 1.2; ctx.setLineDash([2, 2]);
    for (let i = 0.4; i < (f.w || 2.4); i += 0.8) { const [a, b] = P(f.x + i, f.y, 10), [c, d] = P(f.x + i, f.y, 40); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
    ctx.setLineDash([]);
  }, slice: 0.3 });
  C.floorStyle('v4_stone', (g, x, y, w, d, base, r) => {
    poly(g, [P(x, y), P(x + w, y), P(x + w, y + d), P(x, y + d)], base);
    for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) { const c = shade(base, (r() - 0.5) * 0.16); poly(g, [P(x + i + 0.04, y + j + 0.04), P(x + i + 0.96, y + j + 0.04), P(x + i + 0.96, y + j + 0.96), P(x + i + 0.04, y + j + 0.96)], c, 'rgba(0,0,0,0.25)', 0.6); }
  });
  AIO.floorStyles.v4_stone.base = '#5d5852';
})();
