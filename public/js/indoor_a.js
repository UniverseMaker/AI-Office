// (v3) 실내 A팀 — 새 건물 10종
//   🏫 school 고등학교 · 🏥 hospital 종합병원 · 🏨 hotel 호텔 · 🏬 dept 백화점 · 📚 library 도서관
//   🎮 gamestudio 게임 스튜디오 · 📺 broadcast 방송국 · 🧪 biolab 바이오 연구소 · 🏭 factory2 스마트팩토리 · 🌿 glasshouse 온실 오피스
// 모든 새 소품 · 바닥 재질 · 데칼은 ia_ 접두어. 엔진(compose.js tower 키트) 위에 층별 테마 방을 손으로 짠다.
(function () {
  const C = AIO.compose;
  const { P, shade, rgba, poly, box, sbox, cylinder, ellipseFloor, onPlaneY, onPlaneX, roundRect } = AIO.iso;
  const FONT = AIO.art.FONT;
  const COLORS = C.COLORS;
  const rect = (g, x, y, w, d, c, z = 0) => poly(g, [P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], c);
  const night = (I) => !!(I && I.nightInfo && I.nightInfo.lamps);
  const GOODS = ['#e5534b', '#4e7cf6', '#f2c230', '#3fb27f', '#a67be0', '#ff9a5a', '#e2667f', '#1f9fb4'];
  const glow = (ctx, sx, sy, r, c, a) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(sx, sy, 1, sx, sy, r); gg.addColorStop(0, rgba(c, a)); gg.addColorStop(1, rgba(c, 0)); ctx.fillStyle = gg; ctx.fillRect(sx - r, sy - r, r * 2, r * 2); ctx.restore(); };

  // ================================================================ 벽걸이 판 (게시판 · 칠판 · 네온 · ON AIR · 악보 · 엑스레이 · 흡음재 · 이끼벽 · 술장 · 안내도 · 뉴스 자막)
  // slice 1: 조각마다 깊이를 한 칸 뒤로 미뤄서, 칸에 안 맞춘(x 소수) 판도 벽 조각에 반쯤 가려지지 않게 한다
  C.prop('ia_board', {
    slice: 1,
    depth: (f) => f.x + (f.w || 1) + f.y + 0.1,
    draw(ctx, f, t, I) {
      const z = f.z || 68, Wl = f.w * 32, Hh = f.h || 34, k = f.kind || 'cork', c = f.color || '#ff4fd8';
      onPlaneY(ctx, f.x, f.y + 0.04, z, (g) => {
        if (k === 'cork') {
          g.fillStyle = '#8a6247'; g.fillRect(-2, -2, Wl + 4, Hh + 4); g.fillStyle = '#d6a96b'; g.fillRect(0, 0, Wl, Hh);
          const r = AIO.rand(Math.round(f.x * 13 + f.y * 7));
          for (let i = 0; i < Wl * Hh / 40; i++) { g.fillStyle = 'rgba(120,80,40,0.25)'; g.fillRect(r() * Wl, r() * Hh, 1, 1); }
          const n = Math.max(2, Math.floor(Wl / 18));
          for (let i = 0; i < n; i++) {
            const px = 3 + i * (Wl - 6) / n + r() * 3, py = 9 + r() * (Hh - 24), pw = (Wl - 6) / n - 4;
            g.fillStyle = ['#fffdf6', '#fff3a8', '#cfe9ff', '#ffd6e2', '#d8f5d0'][i % 5]; g.fillRect(px, py, pw, 13);
            g.fillStyle = 'rgba(60,60,60,0.45)'; for (let l = 0; l < 3; l++) g.fillRect(px + 2, py + 3 + l * 3.4, pw * (0.5 + r() * 0.4), 1);
            g.fillStyle = ['#e5534b', '#4e7cf6', '#3fb27f'][i % 3]; g.beginPath(); g.arc(px + pw / 2, py + 1, 1.4, 0, 7); g.fill();
          }
          if (f.title) { g.fillStyle = '#3b2a1c'; g.font = `bold 6px ${FONT}`; g.fillText(f.title, 4, 7); }
        } else if (k === 'chalk' || k === 'white') {
          g.fillStyle = '#8a6247'; g.fillRect(-2, -2, Wl + 4, Hh + 4);
          g.fillStyle = k === 'white' ? '#f7f8fa' : '#2f5240'; g.fillRect(0, 0, Wl, Hh);
          g.fillStyle = k === 'white' ? '#2f6fb0' : 'rgba(255,255,255,0.88)'; g.font = `5px ${FONT}`;
          (f.lines || []).forEach((l, i) => g.fillText(l, 5, 9 + i * 7.5));
          g.fillStyle = '#d9c8a4'; g.fillRect(3, Hh - 1, Wl - 6, 2);
        } else if (k === 'neon') {
          g.fillStyle = '#17122a'; roundRect(g, 0, 0, Wl, Hh, 5); g.fill();
          const on = Math.sin(t * 7 + f.x) > -0.92;
          g.save(); g.font = `bold ${f.size || 10}px ${FONT}`; g.textAlign = 'center';
          g.shadowColor = c; g.shadowBlur = on ? 8 : 0; g.fillStyle = on ? '#fff' : rgba(c, 0.5); g.fillText(f.text || 'GAME ON', Wl / 2, Hh / 2 + 4);
          g.strokeStyle = on ? c : rgba(c, 0.4); g.lineWidth = 1.2; roundRect(g, 3, 3, Wl - 6, Hh - 6, 4); g.stroke(); g.restore();
        } else if (k === 'onair') {
          const on = Math.sin(t * 2.4) > -0.5;
          g.fillStyle = '#2b2b2b'; roundRect(g, 0, 0, Wl, Hh, 4); g.fill();
          g.fillStyle = on ? '#ff3b30' : '#5a1a16'; roundRect(g, 2, 2, Wl - 4, Hh - 4, 3); g.fill();
          g.save(); if (on) { g.shadowColor = '#ff6b5b'; g.shadowBlur = 10; } g.fillStyle = on ? '#fff' : '#d9a6a0'; g.font = `bold ${Math.min(12, Hh * 0.55)}px ${FONT}`; g.textAlign = 'center'; g.fillText(f.text || 'ON AIR', Wl / 2, Hh / 2 + 4); g.restore();
        } else if (k === 'staff') {
          g.fillStyle = '#fffdf6'; g.fillRect(0, 0, Wl, Hh); g.strokeStyle = '#c9bfa8'; g.strokeRect(0, 0, Wl, Hh);
          g.strokeStyle = '#555'; g.lineWidth = 0.5;
          for (const y0 of [6, 20]) { for (let l = 0; l < 5; l++) { g.beginPath(); g.moveTo(3, y0 + l * 2); g.lineTo(Wl - 3, y0 + l * 2); g.stroke(); } }
          g.fillStyle = '#222'; const r = AIO.rand(5);
          for (const y0 of [6, 20]) for (let x = 10; x < Wl - 6; x += 7) { const ny = y0 + Math.floor(r() * 8); g.beginPath(); g.ellipse(x, ny, 1.6, 1.1, -0.4, 0, 7); g.fill(); g.fillRect(x + 1.2, ny - 6, 0.6, 6); }
          g.font = `bold 7px ${FONT}`; g.fillText('𝄞', 3, 13); g.fillText('𝄞', 3, 27);
        } else if (k === 'xray') {
          g.fillStyle = '#d9dde1'; g.fillRect(-2, -2, Wl + 4, Hh + 4);
          for (let i = 0; i < Math.floor(Wl / 30); i++) {
            const x0 = 2 + i * 30; g.fillStyle = '#e8f4ff'; g.fillRect(x0, 1, 27, Hh - 2); g.fillStyle = '#1d2733'; g.fillRect(x0 + 2, 3, 23, Hh - 6);
            g.strokeStyle = 'rgba(230,240,255,0.85)'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(x0 + 13.5, 6); g.lineTo(x0 + 13.5, Hh - 5); g.stroke();
            for (let r2 = 0; r2 < 5; r2++) { g.beginPath(); g.ellipse(x0 + 13.5, 10 + r2 * 4, 8 - r2 * 0.4, 2.2, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke(); }
          }
        } else if (k === 'foam') {
          g.fillStyle = '#2b2d33'; g.fillRect(0, 0, Wl, Hh);
          for (let i = 0; i < Wl; i += 8) for (let j = 0; j < Hh; j += 8) { g.fillStyle = ((i + j) / 8) % 2 ? '#3a3d45' : '#30333a'; g.beginPath(); g.moveTo(i, j); g.lineTo(i + 8, j); g.lineTo(i + 4, j + 8); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(i, j + 8); g.lineTo(i + 8, j + 8); g.lineTo(i + 4, j); g.fill(); }
          if (f.text) { g.fillStyle = c; g.font = `bold 6px ${FONT}`; g.fillText(f.text, 4, Hh - 3); }
        } else if (k === 'moss') {
          g.fillStyle = '#4f7d3c'; g.fillRect(0, 0, Wl, Hh); const r = AIO.rand(Math.round(f.x * 11));
          for (let i = 0; i < Wl * Hh / 12; i++) { g.fillStyle = ['#5f9a48', '#77b35a', '#3f6e30', '#8cc46a'][Math.floor(r() * 4)]; g.beginPath(); g.ellipse(r() * Wl, r() * Hh, 2 + r() * 2.5, 1.2 + r() * 1.5, r() * 3, 0, 7); g.fill(); }
          for (let i = 0; i < Wl / 9; i++) { g.fillStyle = ['#f07a8a', '#f6c445', '#ffffff', '#b38cf0'][i % 4]; g.beginPath(); g.arc(r() * Wl, r() * Hh, 1.3, 0, 7); g.fill(); }
          if (f.text) { g.fillStyle = 'rgba(255,255,255,0.92)'; g.font = `bold 7px ${FONT}`; g.fillText(f.text, 4, 9); }
        } else if (k === 'shelf') {
          g.fillStyle = '#3b2a1e'; g.fillRect(0, 0, Wl, Hh);
          { const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, 'rgba(255,190,110,0.55)'); gr.addColorStop(1, 'rgba(255,150,80,0.15)'); g.fillStyle = gr; g.fillRect(2, 2, Wl - 4, Hh - 4); }
          const r = AIO.rand(Math.round(f.x * 5 + 3));
          for (let s = 0; s < 3; s++) { g.fillStyle = '#c9a676'; g.fillRect(0, 10 + s * 11, Wl, 1.4); for (let x = 3; x < Wl - 3; x += 4) { const h2 = 5 + r() * 3; g.fillStyle = ['#7a2232', '#2f6b3a', '#c9a24a', '#e8e2d0', '#4a2c1a', '#2f4f7a'][Math.floor(r() * 6)]; g.fillRect(x, 10 + s * 11 - h2, 2.4, h2); g.fillRect(x + 0.7, 10 + s * 11 - h2 - 2, 1, 2); } }
        } else if (k === 'map') {
          g.fillStyle = '#2b2622'; roundRect(g, 0, 0, Wl, Hh, 3); g.fill();
          g.fillStyle = '#f6d58a'; g.font = `bold 6px ${FONT}`; g.fillText(f.title || '층별 안내', 4, 8);
          g.font = `4.5px ${FONT}`; (f.lines || []).forEach((l, i) => { g.fillStyle = GOODS[i % GOODS.length]; g.fillRect(4, 11 + i * 5.6, 3, 3.6); g.fillStyle = '#f4efe6'; g.fillText(l, 9, 14.4 + i * 5.6); });
        } else if (k === 'ticker') {
          g.fillStyle = '#0f1a2e'; g.fillRect(0, 0, Wl, Hh);
          g.fillStyle = '#e5534b'; g.fillRect(0, Hh - 10, 30, 10); g.fillStyle = '#fff'; g.font = `bold 6px ${FONT}`; g.fillText('속보', 7, Hh - 3);
          g.save(); g.beginPath(); g.rect(31, Hh - 10, Wl - 31, 10); g.clip(); g.fillStyle = '#ffe28a'; g.font = `6px ${FONT}`;
          const msg = f.text || 'AI 방송국 · 오늘의 세션 소식 · 날씨 맑음 · 증시 보합 · ';
          const off = (t * 22) % (msg.length * 6); g.fillText(msg + msg, 34 - off, Hh - 3); g.restore();
          g.fillStyle = '#1f6fd0'; g.fillRect(0, 0, Wl, Hh - 10); g.fillStyle = '#fff'; g.font = `bold 8px ${FONT}`; g.fillText(f.title || 'AIBS NEWS', 6, 12);
        } else if (k === 'kids') {
          g.fillStyle = '#fff6e0'; roundRect(g, 0, 0, Wl, Hh, 6); g.fill();
          for (let i = 0; i < Wl; i += 10) { g.fillStyle = GOODS[(i / 10) % GOODS.length]; g.beginPath(); g.arc(i + 5, Hh - 6, 4, 0, 7); g.fill(); }
          g.fillStyle = '#e5534b'; g.font = `bold 8px ${FONT}`; g.fillText(f.text || '키즈 존', 6, 12);
        } else if (k === 'chroma') {
          g.fillStyle = '#35d45a'; g.fillRect(0, 0, Wl, Hh); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 0.6;
          for (let i = 8; i < Wl; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, Hh); g.stroke(); } for (let j = 8; j < Hh; j += 8) { g.beginPath(); g.moveTo(0, j); g.lineTo(Wl, j); g.stroke(); }
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.font = `bold 6px ${FONT}`; g.fillText('CHROMA KEY', 4, Hh - 4);
        } else if (k === 'andon') {
          g.fillStyle = '#1d2126'; roundRect(g, 0, 0, Wl, Hh, 3); g.fill();
          g.fillStyle = '#f2c230'; g.font = `bold 6px ${FONT}`; g.fillText(f.title || 'ANDON · 라인 상태', 4, 8);
          (f.lines || ['1라인', '2라인', '검사', '창고']).forEach((l, i) => { const st = Math.floor((t * 0.2 + i * 1.7) % 7); const c2 = st === 6 ? '#ff5a4f' : st === 5 ? '#f2c230' : '#4ef08a'; g.fillStyle = '#e9eef5'; g.font = `5px ${FONT}`; g.fillText(l, 4, 16 + i * 7); g.fillStyle = c2; g.beginPath(); g.arc(Wl - 8, 14 + i * 7, 2.4, 0, 7); g.fill(); g.fillStyle = rgba(c2, 0.5); g.fillRect(26, 12.5 + i * 7, (Wl - 40) * (st === 6 ? 0.3 : 0.6 + 0.4 * Math.abs(Math.sin(t * 0.5 + i))), 3); });
        } else if (k === 'poster') {
          const n = Math.max(1, Math.floor(Wl / 26));
          for (let i = 0; i < n; i++) { const x0 = i * (Wl / n) + 2, pw = Wl / n - 4; g.fillStyle = '#f4f1ec'; g.fillRect(x0 - 1, -1, pw + 2, Hh + 2); const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, GOODS[(i * 3 + 1) % 8]); gr.addColorStop(1, GOODS[(i * 3 + 4) % 8]); g.fillStyle = gr; g.fillRect(x0, 0, pw, Hh); g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = `bold 5px ${FONT}`; g.fillText((f.lines || [])[i] || '★', x0 + 2, Hh - 4); }
        }
      });
    },
  });

  // ================================================================ 🏫 학교
  /** 신발장: 칸칸이 실내화 */
  C.prop('ia_shoeLocker', { slice: 0.6, depth: (f) => f.x + f.w / 2 + f.y + 0.3, draw(ctx, f) {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.6, 40, '#ece5d8', '#dcd3c3', '#cbc1af', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x, y + 0.6, 38, (g) => {
      const n = Math.floor(w * 32 / 8);
      for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) {
        g.fillStyle = '#b9ad98'; g.fillRect(1 + i * 8, 2 + j * 9, 7, 8);
        if ((i * 3 + j * 5) % 4) { g.fillStyle = ['#ffffff', '#cfe6f2', '#ffd6e2', '#d8f5d0'][(i + j) % 4]; g.fillRect(2 + i * 8, 6 + j * 9, 2.4, 3); g.fillRect(4.6 + i * 8, 6 + j * 9, 2.4, 3); g.fillStyle = '#4e7cf6'; g.fillRect(2 + i * 8, 8.4 + j * 9, 5, 0.8); }
      }
    });
  } });
  /** 인체모형 (해골) */
  C.prop('ia_skeleton', { draw(ctx, f, t) {
    const { x, y } = f;
    cylinder(ctx, x + 0.5, y + 0.5, 0, 0.32, 3, '#7d858c', '#6d757c');
    sbox(ctx, x + 0.47, y + 0.47, 3, 0.06, 0.06, 50, '#9aa1a7');
    const [sx, sy] = P(x + 0.5, y + 0.55, 0);
    const bone = '#f6f1e3', ln = '#cbbf9f';
    ctx.strokeStyle = bone; ctx.lineCap = 'round'; ctx.lineWidth = 2;
    const sw = Math.sin(t * 1.2) * 1.2;
    ctx.beginPath(); ctx.moveTo(sx, sy - 54); ctx.lineTo(sx, sy - 30); ctx.stroke();                 // 척추
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(sx, sy - 50 + i * 4, 7 - i * 0.6, 2.2, 0, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(sx - 7, sy - 52); ctx.lineTo(sx - 9 + sw, sy - 40); ctx.lineTo(sx - 9 + sw, sy - 30); ctx.moveTo(sx + 7, sy - 52); ctx.lineTo(sx + 9 - sw, sy - 40); ctx.lineTo(sx + 10 - sw, sy - 30); ctx.stroke();
    ctx.fillStyle = bone; ctx.beginPath(); ctx.ellipse(sx, sy - 29, 6, 3, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx - 3, sy - 28); ctx.lineTo(sx - 4, sy - 16); ctx.lineTo(sx - 4, sy - 5); ctx.moveTo(sx + 3, sy - 28); ctx.lineTo(sx + 4, sy - 16); ctx.lineTo(sx + 4, sy - 5); ctx.stroke();
    ctx.fillStyle = bone; ctx.beginPath(); ctx.arc(sx, sy - 59, 5, 0, 7); ctx.fill(); ctx.strokeStyle = ln; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.fillStyle = '#3b332b'; ctx.fillRect(sx - 3, sy - 60, 2, 2); ctx.fillRect(sx + 1, sy - 60, 2, 2); ctx.fillRect(sx - 2, sy - 56, 4, 1);
  } });
  /** 지구본 */
  C.prop('ia_globe', { draw(ctx, f, t) {
    const { x, y } = f;
    cylinder(ctx, x + 0.5, y + 0.5, 0, 0.25, 3, '#8a6247', '#7a5540');
    sbox(ctx, x + 0.47, y + 0.47, 3, 0.06, 0.06, 18, '#8a6247');
    const [sx, sy] = P(x + 0.5, y + 0.5, 30);
    ctx.fillStyle = '#5fa8e0'; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 7); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 7); ctx.clip(); ctx.fillStyle = '#6dbb5a';
    const o = (t * 4) % 24;
    for (const [dx, dy, rx, ry] of [[-6, -3, 4, 3], [3, 2, 3, 4], [10, -4, 3, 2], [-14, 3, 3, 3]]) { ctx.beginPath(); ctx.ellipse(sx + ((dx + o + 12) % 24) - 12, sy + dy, rx, ry, 0.3, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(sx, sy, 11, -1.9, 1.3); ctx.stroke();
  } });
  /** 배식대: 반찬통 · 침방지 유리 · 쟁반 레일 */
  C.prop('ia_mealCounter', { slice: 0.9, draw(ctx, f, t) {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.8, 24, '#e1e5e9', '#c9cfd4', '#b7bec4', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x, y + 0.8, 22, (g) => { g.fillStyle = '#aab2b9'; for (let i = 4; i < w * 32; i += 16) g.fillRect(i, 4, 10, 14); g.fillStyle = '#3b332b'; g.font = `6px ${FONT}`; g.fillText('🍱 오늘의 급식', 6, 12); });
    box(ctx, x, y + 0.8, 14, w, 0.25, 2, '#c4c9cd', '#a9b0b6', '#9aa1a7');
    const food = ['#f4f1ec', '#e9a23b', '#c0392b', '#6dbb5a', '#f2c230', '#8b5a3c'];
    for (let i = 0.15, k = 0; i < w - 0.6; i += 0.75, k++) {
      box(ctx, x + i, y + 0.15, 24, 0.6, 0.5, 1.5, '#9aa1a7', '#8d959c', '#7d858c');
      rect(ctx, x + i + 0.06, y + 0.2, 0.48, 0.4, food[k % food.length], 25.6);
      if (k % 2 === 0) { const [sx, sy] = P(x + i + 0.3, y + 0.4, 27); ctx.strokeStyle = 'rgba(240,240,240,0.5)'; ctx.lineWidth = 1; const o = Math.sin(t * 2 + i) * 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + o, sy - 6, sx - o, sy - 12); ctx.stroke(); }
    }
    poly(ctx, [P(x, y + 0.75, 32), P(x + w, y + 0.75, 32), P(x + w, y + 0.35, 42), P(x, y + 0.35, 42)], 'rgba(200,230,245,0.35)', 'rgba(150,180,200,0.6)');
    for (const px of [x + 0.05, x + w - 0.1]) sbox(ctx, px, y + 0.5, 24, 0.05, 0.05, 18, '#9aa1a7');
  } });
  /** 드럼 세트 */
  C.prop('ia_drumKit', { draw(ctx, f, t) {
    const { x, y } = f;
    const hit = Math.abs(Math.sin(t * 5)) * 1.2;
    for (const [dx, dy, z, r, c] of [[0.25, 0.3, 28, 0.32, '#f2c230'], [0.95, 0.3, 32, 0.3, '#f2c230']]) { sbox(ctx, x + dx, y + dy, 0, 0.04, 0.04, z, '#9aa1a7'); cylinder(ctx, x + dx, y + dy, z + (dx > 0.5 ? hit : 0), r, 0.6, c, shade(c, -0.2)); }
    cylinder(ctx, x + 0.55, y + 0.35, 0, 0.36, 22, '#ffffff', '#c0392b', 'rgba(0,0,0,0.25)');
    const [bx, by] = P(x + 0.55, y + 0.7, 11); ctx.fillStyle = '#f4f1ec'; ctx.beginPath(); ctx.ellipse(bx, by, 7, 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#c0392b'; ctx.font = `bold 4px ${FONT}`; ctx.fillText('AI', bx - 3, by + 1.5);
    cylinder(ctx, x + 0.3, y + 0.75, 0, 0.2, 18, '#f4f1ec', '#8d959c'); cylinder(ctx, x + 0.85, y + 0.75, 0, 0.2, 14, '#f4f1ec', '#c0392b');
  } });
  /** 보면대 */
  C.prop('ia_musicStand', { draw(ctx, f) {
    const { x, y } = f;
    sbox(ctx, x - 0.02, y - 0.02, 0, 0.04, 0.04, 28, '#3b3f45');
    poly(ctx, [P(x - 0.3, y, 28), P(x + 0.3, y, 28), P(x + 0.3, y - 0.12, 42), P(x - 0.3, y - 0.12, 42)], '#2d3035');
    poly(ctx, [P(x - 0.26, y - 0.01, 30), P(x + 0.26, y - 0.01, 30), P(x + 0.26, y - 0.11, 41), P(x - 0.26, y - 0.11, 41)], '#fffdf6');
  } });
  /** 약품장 / 보건실 장 (빨간 십자) */
  C.prop('ia_medCabinet', { slice: 0.5, draw(ctx, f) {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.5, 56, '#f7f8fa', '#e6e9ec', '#d6dade', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x, y + 0.5, 54, (g) => {
      const Wl = w * 32;
      g.fillStyle = 'rgba(200,230,245,0.55)'; g.fillRect(2, 12, Wl - 4, 38);
      for (let s = 0; s < 3; s++) { g.fillStyle = '#c4cbd2'; g.fillRect(2, 24 + s * 12, Wl - 4, 1); for (let i = 5; i < Wl - 6; i += 5) { g.fillStyle = ['#ffffff', '#cfe6f2', '#ffd6e2', '#f2c230', '#8fd6b4'][(i + s * 2) % 5]; g.fillRect(i, 16 + s * 12, 3.4, 7.5); } }
      g.fillStyle = '#e5534b'; g.fillRect(Wl / 2 - 2, 2, 4, 9); g.fillRect(Wl / 2 - 5, 4.5, 10, 4);
      g.strokeStyle = '#b5bbc0'; g.beginPath(); g.moveTo(Wl / 2, 12); g.lineTo(Wl / 2, 50); g.stroke();
    });
  } });
  /** 바퀴 달린 이동식 칠판 */
  C.prop('ia_rollBoard', { slice: 0.3, depth: (f) => f.x + f.w / 2 + f.y + 0.3, draw(ctx, f) {
    const { x, y, w } = f;
    for (const lx of [x + 0.1, x + w - 0.15]) { box(ctx, lx - 0.1, y, 0, 0.3, 0.5, 2, '#5d6166', '#4f5459', '#45494d'); sbox(ctx, lx, y + 0.2, 2, 0.06, 0.06, 56, '#9aa1a7'); }
    onPlaneY(ctx, x + 0.15, y + 0.25, 58, (g) => {
      const Wl = (w - 0.3) * 32;
      g.fillStyle = '#c9cfd4'; g.fillRect(-1.5, -1.5, Wl + 3, 36); g.fillStyle = '#2f5240'; g.fillRect(0, 0, Wl, 33);
      g.fillStyle = 'rgba(255,255,255,0.88)'; g.font = `5px ${FONT}`;
      (f.lines || ['📌 오늘의 할 일', '1. 코드 리뷰', '2. 버그 잡기 🐛']).forEach((l, i) => g.fillText(l, 5, 9 + i * 8));
      g.fillStyle = '#f2c230'; g.fillRect(Wl - 18, 26, 6, 1.6); g.fillStyle = '#fff'; g.fillRect(Wl - 10, 26, 6, 1.6);
    });
  } });

  // ================================================================ 🏥 병원
  /** 병원 침대: 난간 · 링거대 · 모니터 */
  C.prop('ia_hospBed', { depth: (f) => f.x + 0.55 + f.y + 1.05, draw(ctx, f, t) {
    const { x, y } = f, c = f.color || '#8fc1e3';
    for (const [lx, ly] of [[0.08, 0.1], [0.95, 0.1], [0.08, 1.9], [0.95, 1.9]]) sbox(ctx, x + lx, y + ly, 0, 0.06, 0.06, 9, '#9aa1a7');
    box(ctx, x, y, 9, 1.1, 2.05, 3, '#e9edf1', '#d2d8de', '#c4cbd2');
    box(ctx, x + 0.05, y + 0.05, 12, 1, 1.95, 4, '#ffffff', '#eceff2', '#dde2e6');
    poly(ctx, [P(x + 0.08, y + 0.08, 16), P(x + 1.02, y + 0.08, 16), P(x + 1.02, y + 0.7, 16), P(x + 0.08, y + 0.7, 16)], '#f4f6f8');
    box(ctx, x + 0.18, y + 0.12, 16, 0.74, 0.42, 4, '#fffdf6', '#efeadf', '#e3ddd0');
    box(ctx, x + 0.05, y + 0.75, 16, 1, 1.25, 1.6, c, shade(c, -0.1), shade(c, -0.2));
    box(ctx, x, y - 0.04, 0, 1.1, 0.1, 28, '#c4cbd2', '#b5bbc0', '#a9b0b6');
    box(ctx, x + 1.05, y + 0.6, 17, 0.05, 1, 6, '#9aa1a7', '#8d959c', '#7d858c');
    // 링거대
    cylinder(ctx, x + 1.3, y + 0.25, 0, 0.14, 1, '#7d858c', '#6d757c');
    sbox(ctx, x + 1.28, y + 0.23, 1, 0.04, 0.04, 62, '#b5bbc0');
    const [ix, iy] = P(x + 1.3, y + 0.25, 58); ctx.fillStyle = 'rgba(220,240,255,0.85)'; roundRect(ctx, ix - 3, iy, 6, 9, 2); ctx.fill(); ctx.strokeStyle = 'rgba(150,170,190,0.8)'; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ix, iy + 9); ctx.quadraticCurveTo(ix - 4, iy + 26, ...P(x + 0.9, y + 0.9, 18)); ctx.stroke();
    const p = (t * 0.7) % 1; ctx.fillStyle = 'rgba(150,200,255,0.9)'; ctx.fillRect(ix - 0.6, iy + 9 + p * 6, 1.2, 1.4);
  } });
  /** 수술대 + 무영등 + 생체 모니터 */
  C.prop('ia_surgery', { depth: (f) => f.x + 1 + f.y + 1.2, draw(ctx, f, t, I) {
    const { x, y } = f;
    box(ctx, x + 0.75, y + 0.6, 0, 0.5, 0.8, 18, '#b5bbc0', '#9aa1a7', '#8d959c');
    box(ctx, x + 0.55, y + 0.15, 18, 0.9, 1.7, 4, '#5fa88a', '#4b8f74', '#3f7c63', 'rgba(0,0,0,0.15)');
    box(ctx, x + 0.62, y + 0.2, 22, 0.76, 0.35, 2, '#e9f3ee', '#d6e6dd', '#c8dcd0');
    // 모니터 카트
    box(ctx, x + 1.55, y + 0.2, 0, 0.4, 0.4, 30, '#d9dde1', '#c4c9cd', '#b5bbc0');
    box(ctx, x + 1.5, y + 0.25, 30, 0.5, 0.12, 16, '#2d3035', '#26292d', '#1e2125');
    onPlaneY(ctx, x + 1.52, y + 0.38, 45, (g) => { g.fillStyle = '#0b1a14'; g.fillRect(0, 0, 14, 13); g.strokeStyle = '#4ef08a'; g.lineWidth = 0.8; g.beginPath(); for (let i = 0; i < 14; i++) { const ph = (i + t * 12) % 14; const v = ph > 6 && ph < 7.5 ? -5 : ph > 7.5 && ph < 8.5 ? 3 : 0; i ? g.lineTo(i, 7 + v) : g.moveTo(i, 7 + v); } g.stroke(); g.fillStyle = '#ffb347'; g.font = `3.4px ${FONT}`; g.fillText('♥72', 1, 12); });
    // 기구 쟁반
    sbox(ctx, x + 0.2, y + 1.6, 0, 0.05, 0.05, 22, '#9aa1a7'); box(ctx, x, y + 1.45, 22, 0.45, 0.35, 1.2, '#d9dde1', '#c4c9cd', '#b5bbc0');
    // 무영등 (천장에서)
    const [cx, cy] = P(x + 1, y + 1, 104), [lx, ly] = P(x + 1, y + 1, 76);
    ctx.strokeStyle = '#9aa1a7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(lx + 8, ly - 10); ctx.lineTo(lx, ly); ctx.stroke();
    ctx.fillStyle = '#e9edf1'; ctx.beginPath(); ctx.ellipse(lx, ly, 15, 7, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#b5bbc0'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fffbe0'; for (const [dx, dy] of [[-6, 0], [0, -2.5], [6, 0], [0, 2.5], [0, 0]]) { ctx.beginPath(); ctx.arc(lx + dx, ly + dy, 2.2, 0, 7); ctx.fill(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const [tx2, ty2] = P(x + 1, y + 1, 22); const gg = ctx.createLinearGradient(lx, ly, tx2, ty2); gg.addColorStop(0, 'rgba(255,250,220,0.35)'); gg.addColorStop(1, 'rgba(255,250,220,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(lx - 12, ly); ctx.lineTo(lx + 12, ly); ctx.lineTo(tx2 + 26, ty2); ctx.lineTo(tx2 - 26, ty2); ctx.fill(); ctx.restore();
  } });
  /** 약국 선반 */
  C.prop('ia_pharmShelf', { slice: 0.6, draw(ctx, f) {
    const { x, y, w } = f, r = AIO.rand(f.seed || 4);
    box(ctx, x, y, 0, w, 0.6, 58, '#f7f8fa', '#e6e9ec', '#d6dade', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x, y + 0.6, 56, (g) => {
      const Wl = w * 32;
      for (let s = 0; s < 5; s++) { g.fillStyle = '#c9cfd4'; g.fillRect(0, 11 + s * 10, Wl, 1.2); let px = 2; while (px < Wl - 4) { const bw = 2.5 + r() * 3; g.fillStyle = ['#ffffff', '#cfe6f2', '#ffd6e2', '#d8f5d0', '#fff3a8', '#e5534b'][Math.floor(r() * 6)]; g.fillRect(px, 11 + s * 10 - 6 - r() * 2, bw, 8); px += bw + 0.6; } }
      g.fillStyle = '#2f9e5f'; g.fillRect(3, 1, 5, 2); g.fillRect(4.5, -0.5, 2, 5); g.fillStyle = '#2f6b3a'; g.font = `bold 5px ${FONT}`; g.fillText('PHARMACY', 11, 4);
    });
  } });
  /** 연결 의자 (대기석) — 앉은 사람은 +y 쪽(보는 쪽)을 본다 */
  C.prop('ia_waitChairs', { slice: 0.6, draw(ctx, f) {
    const { x, y, w } = f, c = f.color || '#4e9cf6';
    box(ctx, x, y + 0.2, 5, w, 0.3, 1.5, '#9aa1a7', '#8d959c', '#7d858c');
    for (const lx of [x + 0.15, x + w - 0.2]) sbox(ctx, lx, y + 0.3, 0, 0.06, 0.06, 6, '#7d858c');
    for (let i = 0; i + 0.7 <= w + 0.01; i += 0.8) {
      box(ctx, x + i + 0.06, y + 0.05, 13, 0.66, 0.12, 14, shade(c, 0.05), shade(c, -0.1), shade(c, -0.2));
      box(ctx, x + i + 0.06, y + 0.15, 9, 0.66, 0.6, 3, shade(c, 0.12), c, shade(c, -0.15));
    }
  } });
  /** 휠체어 */
  C.prop('ia_wheelchair', { draw(ctx, f) {
    const { x, y } = f;
    box(ctx, x + 0.25, y + 0.3, 12, 0.5, 0.5, 2, '#3b3f45', '#2d3035', '#26292d');
    box(ctx, x + 0.25, y + 0.25, 14, 0.5, 0.08, 14, '#3b3f45', '#2d3035', '#26292d');
    for (const wx of [x + 0.22, x + 0.78]) { const [sx, sy] = P(wx, y + 0.55, 10); ctx.strokeStyle = '#7d858c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(sx, sy, 3.5, 9, 0, 0, 7); ctx.stroke(); }
  } });

  // ================================================================ 🏨 호텔
  /** 샹들리에 (천장에 매달림 · 밤에 더 밝게) */
  C.prop('ia_chandelier', { depth: (f) => f.x + f.y + 2, draw(ctx, f, t, I) {
    const { x, y } = f, s = (f.size || 1) * 1.45;
    const [ax, ay] = P(x, y, 112), [cx, cy] = P(x, y, 92);
    ctx.strokeStyle = '#b8955f'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(cx, cy - 8); ctx.stroke();
    glow(ctx, cx, cy, 40 * s, '#ffe2a0', night(I) ? 0.5 : 0.3);
    for (const [dz, r] of [[0, 15], [8, 10]]) { ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy + dz, r * s, r * s * 0.45, 0, 0, 7); ctx.stroke(); }
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + t * 0.15; const px = cx + Math.cos(a) * 15 * s, py = cy + Math.sin(a) * 6.8 * s; ctx.fillStyle = 'rgba(230,245,255,0.9)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 1.4, py + 4); ctx.lineTo(px, py + 7); ctx.lineTo(px + 1.4, py + 4); ctx.fill(); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const px = cx + Math.cos(a) * 15 * s, py = cy + Math.sin(a) * 6.8 * s; ctx.fillStyle = '#c9a24a'; ctx.fillRect(px - 0.8, py - 5, 1.6, 4); ctx.fillStyle = '#fff6d6'; ctx.beginPath(); ctx.arc(px, py - 6.5, 2, 0, 7); ctx.fill(); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.5; const px = cx + Math.cos(a) * 10 * s, py = cy + 8 + Math.sin(a) * 4.5 * s; ctx.fillStyle = '#fff6d6'; ctx.beginPath(); ctx.arc(px, py - 3, 1.8, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(230,245,255,0.95)'; ctx.beginPath(); ctx.moveTo(cx, cy + 10); ctx.lineTo(cx - 3, cy + 16); ctx.lineTo(cx, cy + 22); ctx.lineTo(cx + 3, cy + 16); ctx.fill();
  } });
  /** 더블 침대 (헤드보드 · 쿠션 · 협탁 스탠드) — x..x+2, y..y+2.4 */
  C.prop('ia_bigBed', { depth: (f) => f.x + 1 + f.y + 1.3, draw(ctx, f, t, I) {
    const { x, y } = f, c = f.color || '#c9b9e8';
    box(ctx, x, y, 0, 2, 0.22, 36, '#d9c7a8', '#c9b38f', '#b89e78', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x + 0.1, y + 0.22, 34, (g) => { for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(120,90,60,0.25)'; g.strokeRect(2 + i * 10, 3, 9, 14); } });
    box(ctx, x, y + 0.22, 0, 2, 2.15, 10, '#8a6247', '#7a5540', '#6b4a35');
    box(ctx, x + 0.04, y + 0.25, 10, 1.92, 2.08, 5, '#ffffff', '#eef0f2', '#e1e5e9');
    for (const px of [x + 0.15, x + 1.05]) box(ctx, px, y + 0.32, 15, 0.8, 0.45, 4.5, '#fffdf6', '#efeadf', '#e3ddd0');
    box(ctx, x + 0.04, y + 0.95, 15, 1.92, 1.38, 2, c, shade(c, -0.1), shade(c, -0.2));
    box(ctx, x + 0.04, y + 0.95, 17, 1.92, 0.22, 1, '#ffffff', '#eef0f2', '#e1e5e9');
    box(ctx, x + 0.04, y + 1.75, 17, 1.92, 0.3, 1, '#b8955f', '#a8854f', '#987540');
    // 협탁 + 스탠드
    box(ctx, x - 0.55, y + 0.15, 0, 0.45, 0.45, 14, '#8a6247', '#7a5540', '#6b4a35');
    sbox(ctx, x - 0.35, y + 0.35, 14, 0.04, 0.04, 8, '#c9a24a');
    const [sx, sy] = P(x - 0.33, y + 0.37, 26); ctx.fillStyle = '#f6efd8'; ctx.beginPath(); ctx.moveTo(sx - 5, sy + 2); ctx.lineTo(sx + 5, sy + 2); ctx.lineTo(sx + 3, sy - 5); ctx.lineTo(sx - 3, sy - 5); ctx.fill();
    if (night(I)) glow(ctx, sx, sy, 26, '#ffd68a', 0.5);
  } });
  /** 짐 카트 */
  C.prop('ia_luggage', { draw(ctx, f) {
    const { x, y } = f;
    box(ctx, x + 0.1, y + 0.2, 3, 0.8, 0.6, 2, '#b07a3a', '#9c6a30', '#8a5c28');
    for (const [wx, wy] of [[0.15, 0.75], [0.85, 0.75]]) { const [sx, sy] = P(x + wx, y + wy, 2); ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(sx, sy, 2, 0, 7); ctx.fill(); }
    box(ctx, x + 0.2, y + 0.3, 5, 0.55, 0.35, 14, '#4e7cf6', '#3f68d0', '#3459b5');
    box(ctx, x + 0.25, y + 0.3, 19, 0.45, 0.3, 9, '#e5534b', '#c9443d', '#b23a34');
    box(ctx, x + 0.62, y + 0.55, 5, 0.3, 0.2, 10, '#f2c230', '#d9ad25', '#c79e20');
    const [a, b] = P(x + 0.12, y + 0.5, 4), [c2, d] = P(x + 0.12, y + 0.5, 42), [e, g2] = P(x + 0.88, y + 0.5, 42), [h, k] = P(x + 0.88, y + 0.5, 4);
    ctx.strokeStyle = '#d4a94a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c2, d); ctx.quadraticCurveTo((c2 + e) / 2, d - 8, e, g2); ctx.lineTo(h, k); ctx.stroke();
  } });
  /** 연회 원탁 (흰 식탁보 · 꽃 장식) — 중심 (x, y) */
  C.prop('ia_banquet', { depth: (f) => f.x + f.y, draw(ctx, f) {
    const { x, y } = f, c = f.color || '#f07a8a';
    cylinder(ctx, x, y, 0, 0.78, 20, '#ffffff', '#efece6', 'rgba(0,0,0,0.08)');
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const [sx, sy] = P(x + Math.cos(a) * 0.52, y + Math.sin(a) * 0.52, 20.5); ctx.fillStyle = '#f7f6f2'; ctx.beginPath(); ctx.ellipse(sx, sy, 4, 2, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 0.6; ctx.stroke(); }
    cylinder(ctx, x, y, 20, 0.1, 6, 'rgba(220,240,250,0.8)', 'rgba(200,225,240,0.6)');
    const [sx, sy] = P(x, y, 28); for (let k = 0; k < 7; k++) { ctx.fillStyle = k % 3 === 0 ? '#5c9a4a' : k % 2 ? c : '#ffffff'; ctx.beginPath(); ctx.arc(sx + Math.cos(k * 0.9) * 4, sy - 2 + Math.sin(k * 1.7) * 2.5, 2.4, 0, 7); ctx.fill(); }
  } });
  /** 바 카운터 (원목 · 대리석 상판 · 유리잔) */
  C.prop('ia_bar', { slice: 0.9, draw(ctx, f, t, I) {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.9, 28, '#5a3e2c', '#4d3526', '#3f2b1f', 'rgba(0,0,0,0.2)');
    onPlaneY(ctx, x, y + 0.9, 26, (g) => { const Wl = w * 32; for (let i = 0; i < Wl; i += 16) { g.strokeStyle = 'rgba(255,220,160,0.18)'; g.strokeRect(i + 2, 3, 12, 18); } if (night(I)) { g.fillStyle = 'rgba(255,190,110,0.5)'; g.fillRect(0, 22, Wl, 1.5); } });
    box(ctx, x - 0.05, y - 0.05, 28, w + 0.1, 1, 2.5, '#efe9df', '#ddd5c9', '#cfc6b8');
    box(ctx, x, y + 0.85, 4, w, 0.06, 1.2, '#d4a94a', '#c9a24a', '#b8955f');
    for (let i = 0.4; i < w; i += 0.9) { const [sx, sy] = P(x + i, y + 0.45, 30.5); ctx.fillStyle = 'rgba(220,240,250,0.75)'; ctx.fillRect(sx - 1.5, sy - 6, 3, 6); ctx.fillStyle = ['#e5534b', '#f2c230', '#a67be0'][Math.round(i * 3) % 3]; ctx.fillRect(sx - 1.5, sy - 3, 3, 3); }
  } });
  /** 그랜드 피아노 (건반은 +y 쪽) */
  C.prop('ia_grandPiano', { depth: (f) => f.x + 0.8 + f.y + 1, draw(ctx, f) {
    const { x, y } = f;
    for (const [lx, ly] of [[0.2, 0.3], [1.4, 0.3], [0.8, 1.4]]) sbox(ctx, x + lx, y + ly, 0, 0.08, 0.08, 18, '#111');
    const body = [P(x, y + 1.5, 18), P(x, y + 0.5, 18), P(x + 0.3, y, 18), P(x + 1.1, y, 18), P(x + 1.6, y + 0.6, 18), P(x + 1.6, y + 1.5, 18)];
    poly(ctx, body.map(([a, b]) => [a, b + 10]).reverse().concat(body), '#141416');
    poly(ctx, [P(x, y + 1.5, 28), P(x + 1.6, y + 1.5, 28), P(x + 1.6, y + 1.5, 18), P(x, y + 1.5, 18)], '#1d1d1f');
    poly(ctx, [P(x + 1.6, y + 0.6, 28), P(x + 1.6, y + 1.5, 28), P(x + 1.6, y + 1.5, 18), P(x + 1.6, y + 0.6, 18)], '#0d0d0f');
    poly(ctx, body.map(([a, b]) => [a, b - 10]), '#232326', 'rgba(255,255,255,0.15)');
    poly(ctx, [P(x + 0.1, y + 1.4, 29), P(x + 0.4, y + 0.1, 29), P(x + 0.5, y + 0.2, 58), P(x + 0.2, y + 1.3, 46)], 'rgba(40,40,44,0.92)', 'rgba(255,255,255,0.2)');
    box(ctx, x + 0.05, y + 1.5, 22, 1.5, 0.3, 3, '#ffffff', '#e8e8e8', '#dddddd');
    for (let k = 0; k < 9; k++) { const [sx, sy] = P(x + 0.12 + k * 0.16, y + 1.6, 25.2); ctx.fillStyle = '#111'; ctx.fillRect(sx - 0.8, sy - 1.5, 1.6, 2.6); }
    box(ctx, x + 0.4, y + 1.95, 0, 0.8, 0.35, 14, '#1d1d1f', '#141416', '#0d0d0f');
  } });

  // ================================================================ 🏬 백화점
  /** 화장품 · 명품 쇼케이스 (유리 · 조명) */
  C.prop('ia_cosmetic', { slice: 0.8, draw(ctx, f, t) {
    const { x, y, w } = f, c = f.color || '#f2a7c3';
    box(ctx, x, y, 0, w, 0.8, 22, '#ffffff', shade(c, 0.5), shade(c, 0.3), 'rgba(0,0,0,0.1)');
    onPlaneY(ctx, x, y + 0.8, 20, (g) => { g.fillStyle = c; g.fillRect(0, 2, w * 32, 2); g.fillStyle = shade(c, -0.35); g.font = `bold 6px ${FONT}`; g.fillText(f.brand || 'BEAUTÉ', 6, 14); });
    const r = AIO.rand(Math.round(x * 7 + y));
    for (let i = 0.2; i < w - 0.1; i += 0.3) { const kind = Math.floor(r() * 3); const px = x + i, py = y + 0.3 + r() * 0.3; if (kind === 0) cylinder(ctx, px, py, 22, 0.05, 6, '#e5534b', '#c9a24a'); else if (kind === 1) box(ctx, px - 0.07, py - 0.07, 22, 0.14, 0.14, 6, 'rgba(255,220,240,0.9)', 'rgba(240,190,215,0.85)', 'rgba(220,170,200,0.85)'); else cylinder(ctx, px, py, 22, 0.07, 4, '#ffffff', '#f2c230'); }
    box(ctx, x, y, 22, w, 0.8, 12, 'rgba(230,245,255,0.28)', 'rgba(210,235,250,0.32)', 'rgba(190,220,240,0.32)', 'rgba(150,180,200,0.7)');
    const sh = (t * 0.3 + x) % 1; const [gx, gy] = P(x + sh * w, y + 0.8, 30); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(gx - 1, gy - 8, 2, 8);
  } });
  /** 마네킹 */
  C.prop('ia_mannequin', { draw(ctx, f, t) {
    const { x, y } = f, c = f.color || '#e5534b';
    cylinder(ctx, x + 0.5, y + 0.5, 0, 0.3, 2, '#d9dde1', '#c4c9cd');
    sbox(ctx, x + 0.48, y + 0.48, 2, 0.04, 0.04, 14, '#9aa1a7');
    const [sx, sy] = P(x + 0.5, y + 0.5, 0);
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(sx - 5, sy - 46); ctx.lineTo(sx + 5, sy - 46); ctx.lineTo(sx + 4, sy - 34); ctx.lineTo(sx + 9, sy - 16); ctx.lineTo(sx - 9, sy - 16); ctx.lineTo(sx - 4, sy - 34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(c, -0.2); ctx.beginPath(); ctx.moveTo(sx, sy - 34); ctx.lineTo(sx + 9, sy - 16); ctx.lineTo(sx + 2, sy - 16); ctx.fill();
    ctx.fillStyle = '#f2e6d8'; ctx.fillRect(sx - 7, sy - 47, 14, 3); ctx.beginPath(); ctx.arc(sx, sy - 52, 3.6, 0, 7); ctx.fill(); ctx.fillRect(sx - 1, sy - 49, 2, 3);
    ctx.strokeStyle = '#f2e6d8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx - 7, sy - 45); ctx.lineTo(sx - 9, sy - 32); ctx.moveTo(sx + 7, sy - 45); ctx.lineTo(sx + 9, sy - 32); ctx.stroke();
    if (f.bag) { ctx.fillStyle = f.bag; roundRect(ctx, sx + 7, sy - 32, 7, 6, 1.5); ctx.fill(); }
  } });
  /** 옷걸이 행거 */
  C.prop('ia_clothesRack', { slice: 0.5, draw(ctx, f) {
    const { x, y, w } = f, r = AIO.rand(Math.round(x * 3 + y * 5));
    for (const lx of [x + 0.05, x + w - 0.1]) { sbox(ctx, lx, y + 0.2, 0, 0.05, 0.05, 44, '#b5bbc0'); box(ctx, lx - 0.15, y, 0, 0.35, 0.5, 1, '#9aa1a7', '#8d959c', '#7d858c'); }
    box(ctx, x, y + 0.2, 44, w, 0.05, 1.2, '#d9dde1', '#c4c9cd', '#b5bbc0');
    for (let i = 0.2; i < w - 0.15; i += 0.22) { const c = GOODS[Math.floor(r() * GOODS.length)]; poly(ctx, [P(x + i, y + 0.05, 42), P(x + i + 0.18, y + 0.05, 42), P(x + i + 0.18, y + 0.4, 42), P(x + i + 0.18, y + 0.4, 18 + r() * 6), P(x + i, y + 0.4, 18 + r() * 6)], shade(c, (i * 10 % 3) * 0.05), 'rgba(0,0,0,0.12)'); }
  } });
  /** 명품 가방 진열장 */
  C.prop('ia_bagShelf', { slice: 0.5, draw(ctx, f) {
    const { x, y, w } = f, c = f.color || '#2b2622';
    box(ctx, x, y, 0, w, 0.5, 52, shade(c, 0.1), c, shade(c, -0.2), 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x, y + 0.5, 50, (g) => {
      const Wl = w * 32;
      g.fillStyle = '#f6efd8'; g.fillRect(2, 2, Wl - 4, 46);
      for (let s = 0; s < 3; s++) { g.fillStyle = '#c9a24a'; g.fillRect(2, 16 + s * 15, Wl - 4, 1.2); for (let i = 6; i < Wl - 10; i += 14) { const bc = ['#7a2232', '#c47f22', '#2b2622', '#e2667f', '#4e7cf6'][(i + s * 3) % 5]; g.fillStyle = bc; roundRect(g, i, 16 + s * 15 - 8, 10, 7.5, 2); g.fill(); g.strokeStyle = bc; g.lineWidth = 1; g.beginPath(); g.arc(i + 5, 16 + s * 15 - 8, 3, Math.PI, 0); g.stroke(); g.fillStyle = '#f2c230'; g.fillRect(i + 4, 16 + s * 15 - 5, 2, 1.4); } }
    });
  } });
  /** 에스컬레이터 (뒤쪽으로 올라감) — x..x+1.4, y..y+4 */
  C.prop('ia_escalator', { depth: (f) => f.x + 0.7 + f.y + 4, draw(ctx, f, t) {
    const { x, y } = f, Lg = 4, w = 1.4, top = 96;
    const zAt = (yy) => Math.max(0, Math.min(top, (y + Lg - 0.6 - yy) / (Lg - 1.2) * top));
    poly(ctx, [P(x, y + Lg, 0), P(x + w, y + Lg, 0), P(x + w, y + Lg - 0.6, 0), P(x, y + Lg - 0.6, 0)], '#c4c9cd');
    const n = 14;
    for (let i = n - 1; i >= 0; i--) {
      const yy = y + 0.6 + ((i + (t * 0.8) % 1) / n) * (Lg - 1.2), z = zAt(yy);
      box(ctx, x + 0.18, yy, Math.max(0, z - 4), w - 0.36, (Lg - 1.2) / n, 4, '#8d959c', '#6d757c', '#5d6166');
      poly(ctx, [P(x + 0.18, yy, z), P(x + w - 0.18, yy, z), P(x + w - 0.18, yy + 0.04, z), P(x + 0.18, yy + 0.04, z)], '#f2c230');
    }
    for (const sx of [x, x + w - 0.18]) {
      poly(ctx, [P(sx + 0.18, y + Lg, 0), P(sx + 0.18, y + Lg - 0.6, 0), P(sx + 0.18, y + 0.6, top), P(sx + 0.18, y, top), P(sx + 0.18, y, top + 26), P(sx + 0.18, y + 0.6, top + 26), P(sx + 0.18, y + Lg - 0.6, 26), P(sx + 0.18, y + Lg, 26)], 'rgba(205,230,245,0.35)', 'rgba(140,170,190,0.6)');
      ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(...P(sx + 0.18, y + Lg, 26)); ctx.lineTo(...P(sx + 0.18, y + Lg - 0.6, 26)); ctx.lineTo(...P(sx + 0.18, y + 0.6, top + 26)); ctx.stroke();
    }
    box(ctx, x + w - 0.18, y + 0.6, 0, 0.18, Lg - 1.2, 0, '#c4c9cd', '#b5bbc0', '#a9b0b6');
    poly(ctx, [P(x + w, y + Lg - 0.6, 0), P(x + w, y + 0.6, top), P(x + w, y + 0.6, top - 14), P(x + w, y + Lg - 0.6, -14)], '#b5bbc0', 'rgba(0,0,0,0.15)');
    const [ax, ay] = P(x + w / 2, y + Lg - 0.3, 0); ctx.fillStyle = '#3fb27f'; ctx.beginPath(); ctx.moveTo(ax, ay - 3); ctx.lineTo(ax - 4, ay + 1); ctx.lineTo(ax + 4, ay + 1); ctx.fill();
  } });
  /** 볼풀 (키즈존) */
  C.prop('ia_ballPit', { depth: (f) => f.x + f.w / 2 + f.y + f.d / 2, draw(ctx, f, t) {
    const { x, y, w, d } = f, r = AIO.rand(Math.round(x * 3 + y * 7));
    rect(ctx, x + 0.2, y + 0.2, w - 0.4, d - 0.4, '#8fd0f0', 1);
    for (let i = 0; i < w * d * 26; i++) { const bx = x + 0.3 + r() * (w - 0.6), by = y + 0.3 + r() * (d - 0.6); const [sx, sy] = P(bx, by, 6 + r() * 3 + Math.sin(t * 2 + i) * 0.5); ctx.fillStyle = GOODS[i % 5]; ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(sx - 1, sy - 1.5, 1, 1); }
    const pad = (px, py, pw, pd, c) => box(ctx, px, py, 0, pw, pd, 10, shade(c, 0.12), c, shade(c, -0.15));
    pad(x, y, w, 0.2, '#f2c230'); pad(x, y, 0.2, d, '#4e7cf6'); pad(x + w - 0.2, y, 0.2, d, '#3fb27f'); pad(x, y + d - 0.2, w, 0.2, '#e5534b');
  } });

  // ================================================================ 📚 도서관
  /** 북카트 */
  C.prop('ia_bookCart', { draw(ctx, f) {
    const { x, y } = f, r = AIO.rand(Math.round(x * 5 + y * 3));
    for (const [wx, wy] of [[0.2, 0.75], [0.8, 0.75]]) { const [sx, sy] = P(x + wx, y + wy, 2); ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(sx, sy, 2, 0, 7); ctx.fill(); }
    box(ctx, x + 0.1, y + 0.25, 3, 0.8, 0.5, 4, '#a87a52', '#8a6247', '#7a5540');
    box(ctx, x + 0.1, y + 0.25, 16, 0.8, 0.5, 3, '#a87a52', '#8a6247', '#7a5540');
    for (const z of [7, 19]) for (let i = 0.15; i < 0.85; i += 0.12) box(ctx, x + i, y + 0.32, z, 0.1, 0.36, 7 + r() * 3, GOODS[Math.floor(r() * 8)], shade(GOODS[Math.floor(r() * 8)], -0.1), '#7a5540');
    sbox(ctx, x + 0.9, y + 0.3, 3, 0.04, 0.04, 30, '#7a5540');
  } });
  /** 고서 보존 진열장 (유리 · 온습도계) */
  C.prop('ia_archive', { slice: 0.9, draw(ctx, f, t) {
    const { x, y, w } = f, r = AIO.rand(Math.round(x * 9 + y));
    box(ctx, x, y, 0, w, 0.9, 20, '#7a5540', '#6b4a35', '#5a3e2c', 'rgba(0,0,0,0.15)');
    rect(ctx, x + 0.05, y + 0.05, w - 0.1, 0.8, '#7a2232', 20.2);
    for (let i = 0.3; i < w - 0.3; i += 0.8) { const kind = Math.floor(r() * 3); if (kind === 0) { box(ctx, x + i, y + 0.25, 20.3, 0.55, 0.4, 3, '#d9c8a4', '#8a5c3a', '#6b4a35'); poly(ctx, [P(x + i + 0.27, y + 0.25, 23.4), P(x + i + 0.27, y + 0.65, 23.4)], null, '#7a5540'); } else if (kind === 1) { cylinder(ctx, x + i + 0.25, y + 0.45, 20.3, 0.12, 2, '#efe1bd', '#d9c8a4'); poly(ctx, [P(x + i + 0.1, y + 0.45, 21), P(x + i + 0.6, y + 0.45, 21), P(x + i + 0.6, y + 0.65, 20.4), P(x + i + 0.1, y + 0.65, 20.4)], '#efe1bd'); } else box(ctx, x + i, y + 0.2, 20.3, 0.5, 0.5, 6, '#5a3e2c', '#4d3526', '#3f2b1f'); }
    box(ctx, x, y, 20, w, 0.9, 16, 'rgba(230,245,255,0.22)', 'rgba(210,235,250,0.3)', 'rgba(190,220,240,0.3)', 'rgba(150,170,190,0.7)');
    onPlaneY(ctx, x + w - 0.6, y + 0.9, 17, (g) => { g.fillStyle = '#16181b'; g.fillRect(0, 0, 14, 7); g.fillStyle = '#4ef08a'; g.font = `3.6px ${FONT}`; g.fillText(`${18 + Math.round(Math.sin(t * 0.3))}° 45%`, 1, 5); });
  } });
  /** 목록함 (카드 서랍장) */
  C.prop('ia_cardCatalog', { draw(ctx, f) {
    const { x, y } = f;
    box(ctx, x, y, 0, 1.1, 0.6, 34, '#b07a4a', '#9a6a3e', '#875c35', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x, y + 0.6, 32, (g) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) { g.strokeStyle = 'rgba(60,35,20,0.5)'; g.strokeRect(1 + i * 8.6, 1 + j * 6.2, 8, 5.6); g.fillStyle = '#d4a94a'; g.fillRect(4 + i * 8.6, 3.5 + j * 6.2, 2.4, 1); g.fillStyle = '#f6efd8'; g.fillRect(2.4 + i * 8.6, 2 + j * 6.2, 5, 1.2); } });
  } });

  // ================================================================ 🎮 게임 스튜디오
  /** 모션캡처 트러스 (part: back · front) — x..x+w, y..y+d */
  C.prop('ia_mocap', { depth: (f) => (f.part === 'front' ? f.x + f.w + f.y + f.d : f.x + f.y + 0.2), draw(ctx, f, t) {
    const { x, y, w, d } = f, Z = 92;
    const post = (px, py) => { box(ctx, px - 0.08, py - 0.08, 0, 0.16, 0.16, Z, '#5d6166', '#4f5459', '#45494d'); };
    const beam = (x0, y0, x1, y1) => { ctx.strokeStyle = '#4f5459'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(...P(x0, y0, Z)); ctx.lineTo(...P(x1, y1, Z)); ctx.stroke(); ctx.strokeStyle = '#7d858c'; ctx.lineWidth = 1; ctx.stroke(); };
    const cam = (px, py) => { const [sx, sy] = P(px, py, Z - 4); ctx.fillStyle = '#2b2b2b'; ctx.fillRect(sx - 3, sy - 2, 6, 4); ctx.fillStyle = Math.sin(t * 6 + px * 3 + py) > 0 ? '#ff3b30' : '#7a1a14'; ctx.beginPath(); ctx.arc(sx, sy + 3, 1.4, 0, 7); ctx.fill(); };
    if (f.part === 'front') { post(x + w, y + d); post(x, y + d); post(x + w, y); beam(x, y + d, x + w, y + d); beam(x + w, y, x + w, y + d); for (let i = 1; i < w; i += 2) cam(x + i, y + d); for (let j = 1; j < d; j += 2) cam(x + w, y + j); return; }
    post(x, y); beam(x, y, x + w, y); beam(x, y, x, y + d); for (let i = 1; i < w; i += 2) cam(x + i, y); for (let j = 1; j < d; j += 2) cam(x, y + j);
  } });
  /** 게이밍 의자 (part seat/back — 앉은 사람은 face 쪽을 본다, 기본 -y) */
  C.prop('ia_gamingChair', { depth: (f) => (f.part === 'seat' ? f.x + f.y - 0.05 : f.x + f.y + 0.22), draw(ctx, f) {
    const { x, y } = f, c = f.color || '#a67be0';
    if (f.part === 'seat') {
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(...P(x, y, 1)); ctx.lineTo(...P(x + Math.cos(a) * 0.3, y + Math.sin(a) * 0.3, 1)); ctx.stroke(); }
      sbox(ctx, x - 0.04, y - 0.04, 1, 0.08, 0.08, 10, '#3b3f45');
      box(ctx, x - 0.3, y - 0.28, 11, 0.6, 0.56, 4, '#2b2b2b', '#232323', '#1d1d1d');
      box(ctx, x - 0.2, y - 0.2, 15, 0.4, 0.4, 0.6, c, shade(c, -0.1), shade(c, -0.2));
      return;
    }
    box(ctx, x - 0.3, y + 0.24, 14, 0.6, 0.12, 30, '#2b2b2b', '#232323', '#1d1d1d', 'rgba(0,0,0,0.3)');
    onPlaneY(ctx, x - 0.3, y + 0.36, 44, (g) => { g.fillStyle = c; g.fillRect(3, 2, 3, 26); g.fillRect(13, 2, 3, 26); g.fillStyle = '#f4f1ec'; g.fillRect(6, 4, 7, 4); });
  } });
  /** 굿즈 선반 (피규어 · 인형) */
  C.prop('ia_merch', { slice: 0.6, draw(ctx, f, t) {
    const { x, y, w } = f, r = AIO.rand(Math.round(x * 13 + y));
    box(ctx, x, y, 0, w, 0.6, 50, '#ffffff', '#ece8f4', '#dcd6ea', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x, y + 0.6, 48, (g) => {
      const Wl = w * 32;
      for (let s = 0; s < 3; s++) { g.fillStyle = '#d6cfe6'; g.fillRect(0, 15 + s * 15, Wl, 1.5); for (let i = 5; i < Wl - 5; i += 9) { const c = GOODS[Math.floor(r() * 8)]; const kind = (i + s) % 3; if (kind === 0) { g.fillStyle = c; g.beginPath(); g.arc(i, 15 + s * 15 - 4, 3.6, 0, 7); g.fill(); g.beginPath(); g.arc(i - 2.5, 15 + s * 15 - 8, 1.4, 0, 7); g.arc(i + 2.5, 15 + s * 15 - 8, 1.4, 0, 7); g.fill(); g.fillStyle = '#222'; g.fillRect(i - 1.6, 15 + s * 15 - 5, 1, 1); g.fillRect(i + 0.8, 15 + s * 15 - 5, 1, 1); } else if (kind === 1) { g.fillStyle = c; g.fillRect(i - 3, 15 + s * 15 - 11, 6, 11); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(i - 2, 15 + s * 15 - 9, 4, 4); } else { g.fillStyle = '#f2e6d8'; g.beginPath(); g.arc(i, 15 + s * 15 - 9, 2.2, 0, 7); g.fill(); g.fillStyle = c; g.fillRect(i - 2, 15 + s * 15 - 7, 4, 6); } } }
      g.fillStyle = '#a67be0'; g.font = `bold 5px ${FONT}`; g.fillText('🎮 OFFICIAL GOODS', 4, 6);
    });
  } });
  /** 믹싱 콘솔 (페이더 · 레벨미터 · 모니터 스피커) */
  C.prop('ia_mixer', { slice: 0.9, draw(ctx, f, t) {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.9, 22, '#3b3f45', '#2d3035', '#26292d', 'rgba(0,0,0,0.2)');
    poly(ctx, [P(x, y + 0.9, 22), P(x + w, y + 0.9, 22), P(x + w, y + 0.1, 30), P(x, y + 0.1, 30)], '#2b2e33', 'rgba(0,0,0,0.3)');
    for (let i = 0.2; i < w - 0.1; i += 0.18) { const lv = 0.2 + 0.6 * Math.abs(Math.sin(t * 2 + i * 5)); const [a, b] = P(x + i, y + 0.75, 23.5), [c, d] = P(x + i, y + 0.75 - lv * 0.5, 23.5 + lv * 5); ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(...P(x + i, y + 0.3, 28)); ctx.stroke(); ctx.fillStyle = '#d9dde1'; ctx.fillRect(c - 1.2, d - 1, 2.4, 2); const [m, n] = P(x + i, y + 0.2, 29); ctx.fillStyle = lv > 0.7 ? '#ff5a4f' : lv > 0.5 ? '#f2c230' : '#4ef08a'; ctx.fillRect(m - 0.8, n - 1, 1.6, 1.6); }
    for (const sx of [x + 0.15, x + w - 0.55]) { box(ctx, sx, y + 0.05, 30, 0.4, 0.35, 16, '#1d1d1f', '#141416', '#0d0d0f'); const [cx, cy] = P(sx + 0.2, y + 0.4, 38); ctx.fillStyle = '#3b3f45'; ctx.beginPath(); ctx.arc(cx, cy, 3.4 + Math.abs(Math.sin(t * 8)) * 0.4, 0, 7); ctx.fill(); }
  } });
  /** e스포츠 팀 부스 (모니터 3대 · LED · 팀 로고) */
  C.prop('ia_esports', { slice: 0.8, draw(ctx, f, t) {
    const { x, y, w } = f, c = f.color || '#5fd0ff';
    box(ctx, x, y, 0, w, 0.8, 24, '#1d1d24', '#16161c', '#101015', 'rgba(0,0,0,0.3)');
    onPlaneY(ctx, x, y + 0.8, 22, (g) => { g.fillStyle = c; g.fillRect(0, 0, w * 32, 2); g.save(); g.shadowColor = c; g.shadowBlur = 6; g.fillStyle = '#fff'; g.font = `bold 8px ${FONT}`; g.fillText(f.team || 'TEAM AI', 8, 14); g.restore(); });
    for (let i = 0.3; i + 0.8 < w + 0.1; i += 1.05) { box(ctx, x + i, y + 0.1, 24, 0.9, 0.08, 13, '#111', '#0b0b0d', '#08080a'); onPlaneY(ctx, x + i + 0.04, y + 0.18, 36, (g) => { g.fillStyle = `hsl(${(t * 30 + i * 80) % 360},55%,45%)`; g.fillRect(0, 0, 27, 11); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(4 + (t * 15 + i * 9) % 18, 4, 3, 3); }); box(ctx, x + i + 0.2, y + 0.45, 24, 0.5, 0.2, 1, '#2b2b2b', '#232323', '#1d1d1d'); }
  } });

  // ================================================================ 📺 방송국
  /** 뉴스 앵커 데스크 (앞면 로고 · 마이크) */
  C.prop('ia_anchorDesk', { slice: 0.9, draw(ctx, f, t) {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.9, 26, '#f4f6f8', '#1f4fa8', '#183f88', 'rgba(0,0,0,0.2)');
    onPlaneY(ctx, x, y + 0.9, 24, (g) => { const Wl = w * 32; const gr = g.createLinearGradient(0, 0, Wl, 0); gr.addColorStop(0, '#1f4fa8'); gr.addColorStop(0.5, '#3f7fe0'); gr.addColorStop(1, '#1f4fa8'); g.fillStyle = gr; g.fillRect(0, 0, Wl, 24); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect((t * 30) % (Wl + 40) - 40, 0, 20, 24); g.fillStyle = '#fff'; g.font = `bold 9px ${FONT}`; g.textAlign = 'center'; g.fillText(f.text || '📺 AIBS 뉴스 9', Wl / 2, 15); g.textAlign = 'left'; });
    box(ctx, x - 0.05, y - 0.05, 26, w + 0.1, 1, 2, '#ffffff', '#e1e5e9', '#d2d7dc');
    for (let i = 0.6; i < w; i += 1.4) { sbox(ctx, x + i, y + 0.3, 28, 0.03, 0.03, 8, '#3b3f45'); const [sx, sy] = P(x + i, y + 0.3, 37); ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, 7); ctx.fill(); box(ctx, x + i + 0.2, y + 0.2, 28, 0.4, 0.3, 0.6, '#ffffff', '#e1e5e9', '#d2d7dc'); }
  } });
  /** 방송 카메라 (페데스탈 · 탤리 램프) — 렌즈는 -y 쪽 */
  C.prop('ia_tvCamera', { draw(ctx, f, t) {
    const { x, y } = f;
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + 0.5; ctx.strokeStyle = '#3b3f45'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(...P(x + 0.5, y + 0.5, 0)); ctx.lineTo(...P(x + 0.5 + Math.cos(a) * 0.4, y + 0.5 + Math.sin(a) * 0.4, 0)); ctx.stroke(); }
    cylinder(ctx, x + 0.5, y + 0.5, 0, 0.12, 34, '#5d6166', '#4f5459');
    box(ctx, x + 0.25, y + 0.25, 34, 0.5, 0.65, 16, '#3b3f45', '#2d3035', '#26292d', 'rgba(0,0,0,0.3)');
    box(ctx, x + 0.33, y - 0.1, 37, 0.34, 0.36, 10, '#1d1d1f', '#141416', '#0d0d0f');
    onPlaneY(ctx, x + 0.28, y + 0.9, 48, (g) => { g.fillStyle = '#16181b'; g.fillRect(0, 0, 13, 9); g.fillStyle = '#5f8fc0'; g.fillRect(1, 1, 11, 7); g.fillStyle = '#fff'; g.font = `3px ${FONT}`; g.fillText('REC', 2, 4); });
    const [lx, ly] = P(x + 0.5, y + 0.3, 52); const on = Math.sin(t * 1.3 + x) > -0.3; ctx.fillStyle = on ? '#ff3b30' : '#5a1a16'; ctx.beginPath(); ctx.arc(lx, ly, 2, 0, 7); ctx.fill(); if (on) glow(ctx, lx, ly, 10, '#ff3b30', 0.5);
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(...P(x + 0.7, y + 0.9, 38)); ctx.lineTo(...P(x + 0.95, y + 1.1, 30)); ctx.stroke();
  } });
  /** 스튜디오 조명 (소프트박스) */
  C.prop('ia_studioLight', { draw(ctx, f, t, I) {
    const { x, y } = f;
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + 0.2; ctx.strokeStyle = '#3b3f45'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(...P(x + 0.5, y + 0.5, 30)); ctx.lineTo(...P(x + 0.5 + Math.cos(a) * 0.35, y + 0.5 + Math.sin(a) * 0.35, 0)); ctx.stroke(); }
    sbox(ctx, x + 0.48, y + 0.48, 30, 0.04, 0.04, 36, '#5d6166');
    const [sx, sy] = P(x + 0.5, y + 0.5, 72);
    ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.moveTo(sx - 12, sy - 9); ctx.lineTo(sx + 12, sy - 9); ctx.lineTo(sx + 7, sy + 4); ctx.lineTo(sx - 7, sy + 4); ctx.fill();
    ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.moveTo(sx - 10, sy - 7); ctx.lineTo(sx + 10, sy - 7); ctx.lineTo(sx + 6, sy + 2); ctx.lineTo(sx - 6, sy + 2); ctx.fill();
    glow(ctx, sx, sy + 6, 40, f.color || '#fff4d6', 0.35);
  } });
  /** 송신탑 (빨강·흰 철골 · 깜빡이는 항공등 · 접시 안테나) — x..x+2, y..y+2 */
  C.prop('ia_tower', { depth: (f) => f.x + f.y + 2, draw(ctx, f, t) {
    const { x, y } = f, Hh = f.h || 190, cx = x + 1, cy = y + 1;
    const leg = (dx, dy, z) => { const k = 1 - z / Hh * 0.82; return P(cx + dx * k, cy + dy * k, z); };
    const corners = [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]];
    box(ctx, x + 0.05, y + 0.05, 0, 1.9, 1.9, 4, '#9aa1a7', '#8d959c', '#7d858c');
    const segs = 8;
    for (let s = 0; s < segs; s++) {
      const z0 = s * Hh / segs, z1 = (s + 1) * Hh / segs, col = s % 2 ? '#ffffff' : '#e5534b';
      for (let i = 0; i < 4; i++) {
        const [ax, ay] = corners[i], [bx, by] = corners[(i + 1) % 4];
        ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(...leg(ax, ay, z0)); ctx.lineTo(...leg(ax, ay, z1)); ctx.stroke();
        if (i >= 1 && i <= 2 || i === 3) { ctx.strokeStyle = rgba(col === '#ffffff' ? '#c9ced3' : '#c9443d', 0.9); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(...leg(ax, ay, z0)); ctx.lineTo(...leg(bx, by, z1)); ctx.moveTo(...leg(bx, by, z0)); ctx.lineTo(...leg(ax, ay, z1)); ctx.stroke(); }
      }
    }
    const [dx2, dy2] = P(cx + 0.25, cy + 0.25, Hh * 0.55); ctx.fillStyle = '#f4f6f8'; ctx.beginPath(); ctx.ellipse(dx2 + 6, dy2, 7, 9, -0.4, 0, 7); ctx.fill(); ctx.strokeStyle = '#b5bbc0'; ctx.lineWidth = 1; ctx.stroke();
    const [tx, ty] = P(cx, cy, Hh); ctx.strokeStyle = '#d9dde1'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty - 22); ctx.stroke();
    const on = Math.sin(t * 3) > 0; ctx.fillStyle = on ? '#ff3b30' : '#7a1a14'; ctx.beginPath(); ctx.arc(tx, ty - 23, 2.6, 0, 7); ctx.fill(); if (on) glow(ctx, tx, ty - 23, 22, '#ff3b30', 0.6);
    for (let k = 0; k < 3; k++) { const p = ((t * 0.5 + k / 3) % 1); ctx.strokeStyle = `rgba(95,208,255,${0.6 * (1 - p)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(tx, ty - 23, 6 + p * 30, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(tx, ty - 23, 6 + p * 30, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke(); }
  } });
  /** 위성 접시 안테나 */
  C.prop('ia_dish', { draw(ctx, f) {
    const { x, y } = f;
    box(ctx, x + 0.3, y + 0.3, 0, 0.4, 0.4, 6, '#9aa1a7', '#8d959c', '#7d858c');
    sbox(ctx, x + 0.47, y + 0.47, 6, 0.06, 0.06, 14, '#7d858c');
    const [sx, sy] = P(x + 0.5, y + 0.5, 30);
    ctx.fillStyle = '#f4f6f8'; ctx.beginPath(); ctx.ellipse(sx, sy, 14, 10, -0.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#b5bbc0'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#e1e5e9'; ctx.beginPath(); ctx.ellipse(sx + 1, sy - 1, 10, 7, -0.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7d858c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx - 8, sy + 6); ctx.lineTo(sx - 12, sy - 12); ctx.lineTo(sx + 9, sy - 7); ctx.stroke();
    ctx.fillStyle = '#e5534b'; ctx.font = `bold 4px ${FONT}`; ctx.fillText('AIBS', sx - 4, sy + 2);
  } });

  // ================================================================ 🧪 바이오 연구소
  /** 액체질소 저장 탱크 (김이 피어오름) */
  C.prop('ia_cryo', { draw(ctx, f, t) {
    const { x, y } = f, cx = x + 0.5, cy = y + 0.5;
    cylinder(ctx, cx, cy, 0, 0.4, 36, '#e1e7ec', '#bfc8d0', 'rgba(0,0,0,0.18)');
    for (const z of [8, 28]) { const [a, b] = P(cx, cy, z); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(a, b, 18, 9, 0, 0, Math.PI); ctx.stroke(); }
    cylinder(ctx, cx, cy, 36, 0.22, 5, '#9aa1a7', '#7d858c');
    onPlaneY(ctx, cx - 0.25, cy + 0.38, 24, (g) => { g.fillStyle = '#4e7cf6'; g.fillRect(0, 0, 16, 8); g.fillStyle = '#fff'; g.font = `bold 4px ${FONT}`; g.fillText('LN₂', 3, 6); });
    const [sx, sy] = P(cx, cy, 42);
    for (let k = 0; k < 4; k++) { const p = (t * 0.35 + k / 4) % 1; ctx.fillStyle = `rgba(240,248,255,${0.55 * (1 - p)})`; ctx.beginPath(); ctx.arc(sx + Math.sin(t + k * 2) * 6, sy - p * 26, 4 + p * 7, 0, 7); ctx.fill(); }
  } });
  /** 생물안전작업대 (BSC · 푸른 UV) — w×0.9 */
  C.prop('ia_bsc', { slice: 0.9, draw(ctx, f, t) {
    const { x, y, w } = f;
    for (const lx of [x + 0.1, x + w - 0.15]) sbox(ctx, lx, y + 0.4, 0, 0.06, 0.06, 18, '#9aa1a7');
    box(ctx, x, y, 18, w, 0.9, 10, '#f2f4f6', '#dfe3e7', '#cfd5da');
    box(ctx, x, y, 28, w, 0.5, 34, '#f2f4f6', '#dfe3e7', '#cfd5da', 'rgba(0,0,0,0.12)');
    poly(ctx, [P(x + 0.1, y + 0.88, 30), P(x + w - 0.1, y + 0.88, 30), P(x + w - 0.1, y + 0.55, 54), P(x + 0.1, y + 0.55, 54)], `rgba(120,170,255,${0.32 + 0.08 * Math.sin(t * 2)})`, 'rgba(120,150,190,0.7)');
    box(ctx, x, y, 62, w, 0.9, 6, '#e1e5e9', '#cfd5da', '#c2c9cf');
    onPlaneY(ctx, x + 0.1, y + 0.9, 66, (g) => { g.fillStyle = '#16181b'; g.fillRect(0, 0, 22, 4); g.fillStyle = '#4ef08a'; g.font = `3.4px ${FONT}`; g.fillText('BSL-2 OK', 1, 3.3); g.fillStyle = '#f2c230'; g.fillRect(26, 0, 6, 4); g.fillStyle = '#222'; g.font = `3px ${FONT}`; g.fillText('☣', 27.5, 3.3); });
    cylinder(ctx, x + w * 0.35, y + 0.55, 28, 0.08, 6, 'rgba(255,200,220,0.8)', 'rgba(255,170,200,0.6)');
  } });
  /** LED 재배 선반 (보라빛 · 모종) */
  C.prop('ia_growRack', { slice: 0.7, draw(ctx, f, t) {
    const { x, y, w } = f, c = f.color || '#d46bff';
    for (const lx of [x + 0.04, x + w - 0.1]) for (const ly of [y + 0.04, y + 0.6]) sbox(ctx, lx, ly, 0, 0.06, 0.06, 62, '#c4cbd2');
    for (const z of [6, 26, 46]) {
      box(ctx, x, y, z, w, 0.7, 2, '#e1e5e9', '#c9cfd4', '#b7bec4');
      box(ctx, x + 0.05, y + 0.1, z + 2, w - 0.1, 0.5, 2.5, '#6b4a35', '#5a3e2c', '#4d3526');
      for (let i = 0.15; i < w - 0.1; i += 0.24) for (const j of [0.2, 0.45]) { const [sx, sy] = P(x + i, y + j, z + 5); const h = 3 + Math.sin(i * 7 + z) * 1.2; ctx.fillStyle = '#6dbb5a'; ctx.beginPath(); ctx.ellipse(sx - 1.5, sy - h, 2.2, 1.2, -0.5, 0, 7); ctx.ellipse(sx + 1.5, sy - h, 2.2, 1.2, 0.5, 0, 7); ctx.fill(); }
      box(ctx, x + 0.1, y + 0.3, z + 17, w - 0.2, 0.1, 1.2, c, c, shade(c, -0.2));
      const [gx, gy] = P(x + w / 2, y + 0.35, z + 12); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(c, 0.12 + 0.03 * Math.sin(t * 2)); ctx.beginPath(); ctx.ellipse(gx, gy, w * 22, 10, 0, 0, 7); ctx.fill(); ctx.restore();
    }
  } });
  /** 격리 챔버 (유리 · 에어록 · 경고띠) — 2×2 */
  C.prop('ia_isoPod', { depth: (f) => f.x + 1 + f.y + 1.2, draw(ctx, f, t) {
    const { x, y } = f;
    box(ctx, x, y, 0, 2, 2, 4, '#f2c230', '#2b2b2b', '#2b2b2b');
    for (let i = 0; i < 2; i += 0.25) { poly(ctx, [P(x + i, y + 2, 0), P(x + i + 0.12, y + 2, 0), P(x + i + 0.12, y + 2, 4), P(x + i, y + 2, 4)], '#f2c230'); }
    box(ctx, x + 0.5, y + 0.4, 4, 1, 1.2, 8, '#ffffff', '#eceff2', '#dde2e6');
    box(ctx, x + 0.55, y + 0.45, 12, 0.9, 0.35, 3, '#fffdf6', '#efeadf', '#e3ddd0');
    box(ctx, x, y, 4, 2, 2, 62, 'rgba(210,240,230,0.18)', 'rgba(190,235,220,0.24)', 'rgba(170,220,205,0.26)', 'rgba(90,150,130,0.75)');
    box(ctx, x, y, 66, 2, 2, 5, '#e1e5e9', '#cfd5da', '#c2c9cf');
    onPlaneY(ctx, x + 0.3, y + 2, 64, (g) => { g.fillStyle = '#e5534b'; g.fillRect(0, 0, 44, 6); g.fillStyle = '#fff'; g.font = `bold 4.4px ${FONT}`; g.fillText('☣ 격리 · ISOLATION', 2, 4.6); });
    const [lx, ly] = P(x + 2, y + 2, 68); ctx.fillStyle = Math.sin(t * 2.5) > 0 ? '#4ef08a' : '#1f6a3f'; ctx.beginPath(); ctx.arc(lx - 4, ly, 2, 0, 7); ctx.fill();
  } });

  // ================================================================ 🏭 스마트팩토리
  /** 컨베이어 (상자가 x 방향으로 흘러감) */
  C.prop('ia_conveyor', { slice: 0.8, draw(ctx, f, t) {
    const { x, y, w } = f;
    for (let i = 0.2; i < w; i += 1.2) sbox(ctx, x + i, y + 0.15, 0, 0.08, 0.5, 14, '#5d6166');
    box(ctx, x, y, 14, w, 0.8, 5, '#3b3f45', '#7d858c', '#6d757c');
    for (let i = 0; i < w; i += 0.25) { const o = (i + t * 0.6) % w; rect(ctx, x + o, y + 0.08, 0.04, 0.64, 'rgba(255,255,255,0.12)', 19.1); }
    const n = Math.max(2, Math.floor(w / 1.4)), sp = f.speed ?? 0.6;
    for (let k = 0; k < n; k++) { const p = ((k / n) * w + t * sp) % w; if (p > w - 0.6) continue; box(ctx, x + p + 0.05, y + 0.18, 19, 0.5, 0.45, 9, '#d6a96b', '#c4935a', '#b2824c', 'rgba(90,60,30,0.3)'); poly(ctx, [P(x + p + 0.28, y + 0.18, 28.05), P(x + p + 0.32, y + 0.18, 28.05), P(x + p + 0.32, y + 0.63, 28.05), P(x + p + 0.28, y + 0.63, 28.05)], '#e9dcc3'); }
    box(ctx, x, y - 0.05, 19, w, 0.06, 3, '#f2c230', '#d9ad25', '#c79e20'); box(ctx, x, y + 0.79, 19, w, 0.06, 3, '#f2c230', '#d9ad25', '#c79e20');
  } });
  /** 비전 검사 게이트 (초록 레이저) */
  C.prop('ia_scanner', { depth: (f) => f.x + 0.5 + f.y + 1, draw(ctx, f, t) {
    const { x, y } = f;
    for (const py of [y - 0.1, y + 0.9]) sbox(ctx, x + 0.35, py, 0, 0.12, 0.12, 50, '#4f5a65');
    box(ctx, x + 0.25, y - 0.15, 50, 0.32, 1.2, 8, '#4f8ad6', '#3f74b8', '#356399');
    onPlaneY(ctx, x + 0.25, y + 1.05, 57, (g) => { g.fillStyle = '#16181b'; g.fillRect(0, 0, 10, 6); g.fillStyle = Math.sin(t * 4) > 0 ? '#4ef08a' : '#ff5a4f'; g.font = `3px ${FONT}`; g.fillText(Math.sin(t * 4) > 0 ? 'OK' : 'NG', 2, 4.5); });
    const p = (Math.sin(t * 2.4) + 1) / 2; const [a, b] = P(x + 0.4, y, 48), [c, d] = P(x + 0.4, y + 0.8, 48), [e, g2] = P(x + 0.2 + p * 0.4, y + 0.4, 24);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(78,240,138,0.22)'; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e + 4, g2 + 4); ctx.lineTo(e - 4, g2 - 4); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(78,240,138,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(...P(x + 0.2 + p * 0.4, y + 0.05, 24.5)); ctx.lineTo(...P(x + 0.2 + p * 0.4, y + 0.75, 24.5)); ctx.stroke();
  } });
  /** 쌓인 상자 */
  C.prop('ia_crates', { draw(ctx, f) {
    const { x, y } = f, r = AIO.rand(f.seed || Math.round(x * 3 + y));
    const n = 2 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) { const px = x + 0.1 + (k % 2) * 0.42 * (k < 2 ? 1 : 0.5), py = y + 0.15 + (k === 1 ? 0.25 : 0); const z = k >= 2 ? 16 : 0; box(ctx, px, py, z, 0.45, 0.5, 16, '#d6a96b', '#c4935a', '#b2824c', 'rgba(90,60,30,0.3)'); poly(ctx, [P(px + 0.2, py, z + 16.05), P(px + 0.25, py, z + 16.05), P(px + 0.25, py + 0.5, z + 16.05), P(px + 0.2, py + 0.5, z + 16.05)], '#e9dcc3'); }
  } });
  /** 태양광 패널 배열 — x..x+w, y..y+d (뒤가 높게 기울어짐) */
  C.prop('ia_solar', { depth: (f) => f.x + f.w / 2 + f.y + f.d / 2, draw(ctx, f, t) {
    const { x, y, w, d } = f;
    for (let j = 0; j + 1 <= d + 0.01; j += 1.5) {
      const y0 = y + j, y1 = y0 + 1;
      for (const lx of [x + 0.2, x + w - 0.3]) { sbox(ctx, lx, y0 + 0.1, 0, 0.08, 0.08, 22, '#9aa1a7'); sbox(ctx, lx, y1 - 0.15, 0, 0.08, 0.08, 8, '#9aa1a7'); }
      poly(ctx, [P(x, y0, 24), P(x + w, y0, 24), P(x + w, y1, 8), P(x, y1, 8)], '#1f3f7a', '#c4cbd2', 1);
      ctx.strokeStyle = 'rgba(160,190,230,0.45)'; ctx.lineWidth = 0.6;
      for (let i = 0.5; i < w; i += 0.5) { ctx.beginPath(); ctx.moveTo(...P(x + i, y0, 24)); ctx.lineTo(...P(x + i, y1, 8)); ctx.stroke(); }
      for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(...P(x, y0 + k / 3, 24 - k * 16 / 3)); ctx.lineTo(...P(x + w, y0 + k / 3, 24 - k * 16 / 3)); ctx.stroke(); }
      const sh = ((t * 0.15 + j * 0.2) % 1) * w; poly(ctx, [P(x + sh, y0, 24), P(x + Math.min(w, sh + 0.4), y0, 24), P(x + Math.min(w, sh + 0.2), y1, 8), P(x + Math.max(0, sh - 0.2), y1, 8)], 'rgba(255,255,255,0.18)');
    }
  } });

  // ================================================================ 🌿 온실 오피스
  /** 수경재배 랙 (상추 · 파이프 · 백색 LED) */
  C.prop('ia_hydro', { slice: 0.7, draw(ctx, f, t) {
    const { x, y, w } = f;
    for (const lx of [x + 0.04, x + w - 0.1]) sbox(ctx, lx, y + 0.3, 0, 0.06, 0.06, 64, '#d9dde1');
    for (const z of [10, 30, 50]) {
      box(ctx, x, y + 0.1, z, w, 0.5, 5, '#ffffff', '#e9edf1', '#d2d8de');
      for (let i = 0.2; i < w - 0.1; i += 0.3) { const [sx, sy] = P(x + i, y + 0.35, z + 5); ctx.fillStyle = '#7cc472'; ctx.beginPath(); ctx.arc(sx, sy - 2.5, 3.6, 0, 7); ctx.fill(); ctx.fillStyle = '#a6dc8f'; ctx.beginPath(); ctx.arc(sx - 1, sy - 3.6, 2, 0, 7); ctx.fill(); }
      box(ctx, x, y + 0.62, z + 2, w, 0.06, 1.5, '#5fb2e0', '#4e9cf6', '#3f86d6');
      box(ctx, x + 0.1, y + 0.3, z + 17, w - 0.2, 0.08, 1, '#fffbe8', '#fffbe8', '#e9e4cf');
    }
    const p = (t * 0.5) % 1; const [dx, dy] = P(x + p * w, y + 0.65, 13); ctx.fillStyle = 'rgba(150,210,255,0.9)'; ctx.fillRect(dx - 1, dy - 1, 2, 2);
  } });
  /** 몬스테라 · 열대 화분 */
  C.prop('ia_monstera', { draw(ctx, f, t) {
    const { x, y } = f, s = f.size || 1, cx = x + 0.5, cy = y + 0.5;
    cylinder(ctx, cx, cy, 0, 0.3 * s, 14 * s, '#f4f1ec', f.pot || '#c96a3a');
    const [sx, sy] = P(cx, cy, 14 * s);
    const r = AIO.rand(f.seed || Math.round(x * 7 + y * 3));
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.42 + Math.sin(t * 0.8 + k) * 0.04, len = (16 + r() * 12) * s;
      const lx = sx + Math.cos(a) * len, ly = sy - 6 * s + Math.sin(a) * len * 0.9;
      ctx.strokeStyle = '#4f8a3e'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + Math.cos(a) * len * 0.3, sy - len * 0.5, lx, ly); ctx.stroke();
      ctx.fillStyle = k % 2 ? '#3f8a45' : '#4f9a52'; ctx.beginPath(); ctx.ellipse(lx, ly, 8 * s, 5.5 * s, a + Math.PI / 2, 0, 7); ctx.fill();
      ctx.strokeStyle = '#2f6b3a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(lx - Math.cos(a + Math.PI / 2) * 6 * s, ly - Math.sin(a + Math.PI / 2) * 4 * s); ctx.lineTo(lx + Math.cos(a + Math.PI / 2) * 6 * s, ly + Math.sin(a + Math.PI / 2) * 4 * s); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.0)';
    }
  } });
  /** 나비 떼 (팔랑팔랑 · 바닥은 막지 않음) */
  C.prop('ia_butterflies', { depth: (f) => f.x + f.y + 1.5, dynamic: true, draw(ctx, f, t) {
    const n = f.n || 4;
    for (let k = 0; k < n; k++) {
      const a = t * (0.5 + k * 0.12) + k * 2.1, rr = 0.8 + (k % 3) * 0.4;
      const [sx, sy] = P(f.x + Math.cos(a) * rr, f.y + Math.sin(a * 1.3) * rr, 30 + Math.sin(t * 2 + k) * 10 + k * 4);
      const flap = Math.abs(Math.sin(t * 14 + k * 3));
      const c = ['#f6c445', '#ff9a5a', '#7ab8f5', '#f2a7c3', '#b38cf0'][k % 5];
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(sx - 2.4 * flap, sy - 1, 2.8 * flap + 0.4, 2.2, -0.4, 0, 7); ctx.ellipse(sx + 2.4 * flap, sy - 1, 2.8 * flap + 0.4, 2.2, 0.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#2b2622'; ctx.fillRect(sx - 0.5, sy - 2.5, 1, 4);
    }
  } });
  /** 허브 바 (원목 카운터 · 허브 화분 · 차 유리병) */
  C.prop('ia_herbBar', { slice: 0.9, draw(ctx, f, t) {
    const { x, y, w } = f;
    box(ctx, x, y, 0, w, 0.9, 26, '#c49a62', '#a87a52', '#8a6247', 'rgba(0,0,0,0.15)');
    onPlaneY(ctx, x, y + 0.9, 24, (g) => { for (let i = 0; i < w * 32; i += 6) { g.fillStyle = (i / 6) % 2 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'; g.fillRect(i, 0, 6, 24); } g.fillStyle = '#2f6b3a'; g.font = `bold 6px ${FONT}`; g.fillText(f.text || '🌿 HERB CAFE', 6, 14); });
    box(ctx, x - 0.05, y - 0.05, 26, w + 0.1, 1, 2, '#e2cfae', '#c9b38f', '#b89e78');
    for (let i = 0.3; i < w - 0.2; i += 0.6) {
      if (Math.round(i * 10) % 3 === 0) { cylinder(ctx, x + i, y + 0.4, 28, 0.13, 10, 'rgba(230,250,240,0.7)', 'rgba(200,235,215,0.6)'); cylinder(ctx, x + i, y + 0.4, 28, 0.11, 6, '#c9e6a0', rgba('#9cc46a', 0.7)); }
      else { cylinder(ctx, x + i, y + 0.4, 28, 0.13, 5, '#c96a3a', '#a8532a'); const [sx, sy] = P(x + i, y + 0.4, 33); ctx.fillStyle = '#5c9a4a'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(sx + Math.cos(k * 1.3) * 3, sy - 3 - Math.sin(k * 2) * 2 + Math.sin(t + k) * 0.4, 2.2, 0, 7); ctx.fill(); } }
    }
  } });
  /** 꽃 아치 (아래로 지나다닐 수 있음 · 기둥 칸만 막는다) */
  C.prop('ia_flowerArch', { depth: (f) => f.x + f.w / 2 + f.y + 0.3, draw(ctx, f, t) {
    const { x, y, w } = f, r = AIO.rand(Math.round(x * 3 + y * 11));
    for (const px of [x + 0.15, x + w - 0.25]) sbox(ctx, px, y + 0.2, 0, 0.1, 0.1, 60, '#f4f1ec');
    const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push(P(x + 0.2 + u * (w - 0.4), y + 0.25, 60 + Math.sin(u * Math.PI) * 22)); }
    ctx.strokeStyle = '#f4f1ec'; ctx.lineWidth = 3; ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.stroke();
    for (const [a, b] of pts) for (let k = 0; k < 3; k++) { ctx.fillStyle = k ? ['#f07a8a', '#f6c445', '#ffffff', '#b38cf0', '#f2a7c3'][Math.floor(r() * 5)] : '#5c9a4a'; ctx.beginPath(); ctx.arc(a + (r() - 0.5) * 8, b + (r() - 0.5) * 6, 2.4, 0, 7); ctx.fill(); }
    for (const px of [x + 0.2, x + w - 0.2]) for (let z = 8; z < 60; z += 7) { const [a, b] = P(px, y + 0.3, z); ctx.fillStyle = z % 14 ? '#5c9a4a' : '#f07a8a'; ctx.beginPath(); ctx.arc(a + Math.sin(z) * 3, b, 2.2, 0, 7); ctx.fill(); }
  } });

  // ================================================================ 기타 (MRI · 닥터헬기 · 자쿠지 · 광고판 · DNA 조형물)
  /** MRI (둥근 구멍 + 미끄러지는 침대) — x..x+2.2, y..y+2.8 */
  C.prop('ia_mri', { depth: (f) => f.x + 1.1 + f.y + 1.5, draw(ctx, f, t) {
    const { x, y } = f;
    box(ctx, x + 0.6, y + 1.1, 0, 1, 1.6, 12, '#e1e5e9', '#cfd5da', '#c2c9cf');
    box(ctx, x, y, 0, 2.2, 1.1, 50, '#f4f6f8', '#e1e5e9', '#d2d7dc', 'rgba(0,0,0,0.12)');
    onPlaneY(ctx, x, y + 1.1, 50, (g) => {
      const cx = 35, cy = 25;
      g.fillStyle = '#cfd5da'; g.beginPath(); g.arc(cx, cy, 21, 0, 7); g.fill();
      g.strokeStyle = `rgba(95,180,255,${0.6 + 0.3 * Math.sin(t * 2)})`; g.lineWidth = 1.6; g.beginPath(); g.arc(cx, cy, 19, 0, 7); g.stroke();
      const gr = g.createRadialGradient(cx, cy, 2, cx, cy, 16); gr.addColorStop(0, '#0f1418'); gr.addColorStop(1, '#3b4248'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 16, 0, 7); g.fill();
      g.fillStyle = '#4e7cf6'; g.font = `bold 5px ${FONT}`; g.fillText('AI MRI 3T', 4, 7);
    });
    box(ctx, x + 0.65, y + 0.9, 12, 0.9, 1.85, 4, '#8fc1e3', '#7aaed2', '#6a9cc0');
    box(ctx, x + 0.75, y + 2.3, 16, 0.7, 0.35, 3, '#fffdf6', '#efeadf', '#e3ddd0');
  } });
  /** 닥터헬기 (프로펠러가 돈다) — x..x+4, y..y+1.3 */
  C.prop('ia_heli', { depth: (f) => f.x + 1.6 + f.y + 0.7, dynamic: true, draw(ctx, f, t) {
    const { x, y } = f;
    for (const sy of [y + 0.15, y + 1.15]) { box(ctx, x + 0.4, sy, 2, 2.2, 0.08, 1.4, '#5d6166', '#4f5459', '#45494d'); for (const sx of [x + 0.8, x + 2.1]) sbox(ctx, sx, sy, 3, 0.05, 0.05, 6, '#5d6166'); }
    box(ctx, x + 2.4, y + 0.55, 16, 1.7, 0.22, 6, '#f4f6f8', '#e1e5e9', '#d2d7dc');
    box(ctx, x + 3.85, y + 0.6, 22, 0.25, 0.12, 14, '#e5534b', '#c9443d', '#b23a34');
    box(ctx, x + 0.5, y + 0.2, 9, 2, 1, 22, '#ffffff', '#eef1f4', '#dde2e6', 'rgba(0,0,0,0.25)');
    onPlaneY(ctx, x + 0.5, y + 1.2, 31, (g) => { g.fillStyle = '#e5534b'; g.fillRect(0, 12, 64, 4); g.fillStyle = 'rgba(120,180,220,0.9)'; g.fillRect(2, 2, 18, 9); g.fillRect(24, 2, 12, 9); g.fillStyle = '#e5534b'; g.fillRect(46, 1, 4, 10); g.fillRect(43, 4, 10, 4); g.fillStyle = '#2b3a67'; g.font = `bold 4px ${FONT}`; g.fillText('AI 닥터헬기', 4, 21); });
    poly(ctx, [P(x + 0.5, y + 0.2, 31), P(x + 0.5, y + 1.2, 31), P(x + 0.15, y + 1.1, 18), P(x + 0.15, y + 0.3, 18)], 'rgba(130,190,230,0.9)', 'rgba(60,90,120,0.6)');
    sbox(ctx, x + 1.45, y + 0.65, 31, 0.1, 0.1, 6, '#3b3f45');
    const a = t * 14, [mx, my] = P(x + 1.5, y + 0.7, 38);
    ctx.fillStyle = 'rgba(60,60,60,0.10)'; ctx.beginPath(); ctx.ellipse(mx, my, 104, 52, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(40,40,40,0.85)'; ctx.lineWidth = 2;
    for (const k of [0, Math.PI / 2]) { const [ax, ay] = P(x + 1.5 + Math.cos(a + k) * 2.3, y + 0.7 + Math.sin(a + k) * 2.3, 38), [bx, by] = P(x + 1.5 - Math.cos(a + k) * 2.3, y + 0.7 - Math.sin(a + k) * 2.3, 38); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
    ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(mx, my, 2.4, 0, 7); ctx.fill();
  } });
  /** 자쿠지 (돌 테두리 · 보글보글 · 김) — 3×3 */
  C.prop('ia_jacuzzi', { depth: (f) => f.x + 1.5 + f.y + 1.5, draw(ctx, f, t) {
    const cx = f.x + 1.5, cy = f.y + 1.5;
    cylinder(ctx, cx, cy, 0, 1.42, 11, '#efe9df', '#d6cfc3', 'rgba(0,0,0,0.12)');
    ellipseFloor(ctx, cx, cy, 1.18, 1.18, 11.2, '#5fc4e0');
    ellipseFloor(ctx, cx - 0.15, cy - 0.15, 0.8, 0.8, 11.3, 'rgba(160,230,245,0.6)');
    for (let k = 0; k < 14; k++) { const a = k * 2.4 + t * 0.7, r = 0.2 + ((k * 37) % 9) / 10, p = (t * 1.5 + k / 14) % 1; const [sx, sy] = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 11.5 + p * 4); ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - p)})`; ctx.beginPath(); ctx.arc(sx, sy, 1.2 + p * 1.5, 0, 7); ctx.fill(); }
    const [sx, sy] = P(cx, cy, 20); for (let k = 0; k < 3; k++) { const p = (t * 0.3 + k / 3) % 1; ctx.fillStyle = `rgba(255,255,255,${0.25 * (1 - p)})`; ctx.beginPath(); ctx.arc(sx + Math.sin(t + k * 2) * 10, sy - p * 30, 8 + p * 8, 0, 7); ctx.fill(); }
  } });
  /** 세워진 광고판 / 네온 간판 (외부에서도 잘 보이게 높이 띄움) */
  C.prop('ia_billboard', { slice: 0.3, depth: (f) => f.x + f.w / 2 + f.y + 0.3, draw(ctx, f, t, I) {
    const { x, y, w } = f, z0 = f.z0 ?? 34, h = f.h || 46, c = f.color || '#ff4fd8';
    for (const px of [x + 0.4, x + w - 0.5]) sbox(ctx, px, y + 0.05, 0, 0.12, 0.12, z0 + 4, '#5d6166');
    box(ctx, x, y, z0, w, 0.22, h, '#2b2b2b', '#232323', '#1d1d1d', 'rgba(0,0,0,0.3)');
    onPlaneY(ctx, x + 0.06, y + 0.22, z0 + h - 2, (g) => {
      const Wl = (w - 0.12) * 32, Hh = h - 4;
      if (f.kind === 'neon') { g.fillStyle = '#17122a'; g.fillRect(0, 0, Wl, Hh); g.save(); g.shadowColor = c; g.shadowBlur = 10; g.strokeStyle = c; g.lineWidth = 2; roundRect(g, 4, 4, Wl - 8, Hh - 8, 6); g.stroke(); g.fillStyle = '#fff'; g.font = `bold ${f.size || 14}px ${FONT}`; g.textAlign = 'center'; g.fillText(f.text || '', Wl / 2, Hh / 2 + 5); g.restore(); if (f.sub) { g.fillStyle = '#5fd0ff'; g.font = `7px ${FONT}`; g.textAlign = 'center'; g.fillText(f.sub, Wl / 2, Hh - 8); g.textAlign = 'left'; } return; }
      const gr = g.createLinearGradient(0, 0, Wl, Hh); gr.addColorStop(0, c); gr.addColorStop(1, f.color2 || '#4e7cf6'); g.fillStyle = gr; g.fillRect(0, 0, Wl, Hh);
      g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(((t * 40) % (Wl + 60)) - 40, 0, 18, Hh);
      g.fillStyle = '#fff'; g.font = `bold ${f.size || 13}px ${FONT}`; g.fillText(f.text || '', 8, Hh / 2 + 2);
      if (f.sub) { g.font = `7px ${FONT}`; g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillText(f.sub, 8, Hh - 7); }
    });
    if (night(I)) { const [gx, gy] = P(x + w / 2, y + 0.3, z0 + h / 2); glow(ctx, gx, gy, w * 20, c, 0.35); }
  } });
  /** DNA 이중나선 조형물 (천천히 돈다) */
  C.prop('ia_dna', { draw(ctx, f, t) {
    const { x, y } = f, cx = x + 0.5, cy = y + 0.5;
    cylinder(ctx, cx, cy, 0, 0.45, 8, '#f4f6f8', '#d6dde2', 'rgba(0,0,0,0.12)');
    const pts = [];
    for (let k = 0; k < 18; k++) { const a = k * 0.55 + t * 0.8, z = 12 + k * 3.6; pts.push([P(cx + Math.cos(a) * 0.32, cy + Math.sin(a) * 0.32, z), P(cx - Math.cos(a) * 0.32, cy - Math.sin(a) * 0.32, z), Math.sin(a)]); }
    for (const [a, b] of pts) { ctx.strokeStyle = 'rgba(160,170,180,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    for (const [a, b, s] of pts) { ctx.fillStyle = s > 0 ? '#3fb27f' : '#2f8c62'; ctx.beginPath(); ctx.arc(a[0], a[1], 2.6, 0, 7); ctx.fill(); ctx.fillStyle = s > 0 ? '#8a6be0' : '#a67be0'; ctx.beginPath(); ctx.arc(b[0], b[1], 2.6, 0, 7); ctx.fill(); }
  } });

  // ================================================================ 바닥 재질 · 데칼
  const tileLines = (g, x, y, w, d, st, c) => { g.strokeStyle = c; g.lineWidth = 0.7; for (let i = 0; i <= w + 1e-6; i += st) { g.beginPath(); g.moveTo(...P(x + i, y)); g.lineTo(...P(x + i, y + d)); g.stroke(); } for (let j = 0; j <= d + 1e-6; j += st) { g.beginPath(); g.moveTo(...P(x, y + j)); g.lineTo(...P(x + w, y + j)); g.stroke(); } };
  /** 체크무늬 타일 */
  C.floorStyle('ia_checker', (g, x, y, w, d, base) => { for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) if ((i + j) % 2) rect(g, x + i, y + j, 1, 1, shade(base, -0.1)); tileLines(g, x, y, w, d, 1, 'rgba(0,0,0,0.06)'); });
  /** 헤링본 원목 */
  C.floorStyle('ia_herring', (g, x, y, w, d, base, r) => {
    for (let i = 0; i < w; i += 0.5) for (let j = 0; j < d; j += 0.5) { const k = ((i * 2 + j * 2) % 2); rect(g, x + i, y + j, 0.5, 0.5, shade(base, k ? -0.06 : 0.04 + r() * 0.03)); g.strokeStyle = 'rgba(110,70,40,0.18)'; g.lineWidth = 0.5; g.beginPath(); if (k) { g.moveTo(...P(x + i + 0.25, y + j)); g.lineTo(...P(x + i + 0.25, y + j + 0.5)); } else { g.moveTo(...P(x + i, y + j + 0.25)); g.lineTo(...P(x + i + 0.5, y + j + 0.25)); } g.stroke(); }
  });
  /** 병원 리놀륨 (반짝 · 점무늬) */
  C.floorStyle('ia_lino', (g, x, y, w, d, base, r) => { for (let i = 0; i < w * d * 8; i++) { const [sx, sy] = P(x + r() * w, y + r() * d); g.fillStyle = r() < 0.5 ? shade(base, -0.08) : 'rgba(255,255,255,0.5)'; g.fillRect(sx, sy, 1.2, 1.2); } tileLines(g, x, y, w, d, 2, 'rgba(0,0,0,0.05)'); });
  /** 테라조 (알록달록 돌 조각) */
  C.floorStyle('ia_terrazzo', (g, x, y, w, d, base, r) => { for (let i = 0; i < w * d * 10; i++) { const [sx, sy] = P(x + r() * w, y + r() * d); g.fillStyle = ['#e2667f', '#4e7cf6', '#f2c230', '#9aa1a7', '#3fb27f'][Math.floor(r() * 5)]; g.globalAlpha = 0.45; g.fillRect(sx, sy, 1.6 + r() * 1.4, 1.2); g.globalAlpha = 1; } tileLines(g, x, y, w, d, 3, 'rgba(0,0,0,0.05)'); });
  /** 무늬 강판 (공장) */
  C.floorStyle('ia_steel', (g, x, y, w, d, base) => { tileLines(g, x, y, w, d, 2, 'rgba(40,40,40,0.25)'); for (let i = 0.25; i < w; i += 0.5) for (let j = 0.25; j < d; j += 0.5) { const [sx, sy] = P(x + i, y + j); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(sx - 2, sy - 0.5, 4, 1); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(sx - 2, sy + 0.5, 4, 0.6); } });
  /** 게임 카펫 (어두운 바탕 · 네온 도형) */
  C.floorStyle('ia_neon', (g, x, y, w, d, base, r) => { for (let i = 0; i < w * d * 0.6; i++) { const [sx, sy] = P(x + 0.3 + r() * (w - 0.6), y + 0.3 + r() * (d - 0.6)); g.strokeStyle = ['rgba(255,79,216,0.45)', 'rgba(95,208,255,0.45)', 'rgba(242,194,48,0.4)'][i % 3]; g.lineWidth = 1; const k = Math.floor(r() * 3); g.beginPath(); if (k === 0) g.arc(sx, sy, 3, 0, 7); else if (k === 1) { g.moveTo(sx - 3, sy + 2); g.lineTo(sx, sy - 3); g.lineTo(sx + 3, sy + 2); g.closePath(); } else { g.moveTo(sx - 3, sy); g.lineTo(sx + 3, sy); g.moveTo(sx, sy - 2); g.lineTo(sx, sy + 2); } g.stroke(); } });
  /** 육각 타일 느낌 (연구소) */
  C.floorStyle('ia_hex', (g, x, y, w, d, base) => { tileLines(g, x, y, w, d, 1, 'rgba(60,110,100,0.16)'); for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) if ((i * 3 + j * 5) % 7 === 0) rect(g, x + i + 0.1, y + j + 0.1, 0.8, 0.8, shade(base, -0.06)); });
  /** 흙 · 자갈 (온실 바닥) */
  C.floorStyle('ia_soil', (g, x, y, w, d, base, r) => { for (let i = 0; i < w * d * 14; i++) { const [sx, sy] = P(x + r() * w, y + r() * d); g.fillStyle = r() < 0.5 ? 'rgba(90,60,30,0.25)' : 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(sx, sy, 1.4, 0.8, 0, 0, 7); g.fill(); } });

  /** 육상 트랙 (붉은 우레탄 · 흰 레인) */
  C.decal('ia_track', (g, d) => {
    const { x, y, w } = d, dd = d.d;
    rect(g, x, y, w, dd, '#c9573f');
    rect(g, x + 1.6, y + 1.6, w - 3.2, dd - 3.2, d.inner || '#7fb86a');
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 0.8;
    for (const k of [0.15, 0.55, 1.0, 1.45]) { g.beginPath(); g.moveTo(...P(x + k, y + k)); g.lineTo(...P(x + w - k, y + k)); g.lineTo(...P(x + w - k, y + dd - k)); g.lineTo(...P(x + k, y + dd - k)); g.closePath(); g.stroke(); }
    rect(g, x + w - 1.6, y + dd / 2, 1.6, 0.1, '#ffffff');
  });
  /** 헬리패드 (어두운 원 · 노란 테 · 흰 H · 유도등) */
  C.decal('ia_helipad', (g, d) => {
    const cx = d.x + d.w / 2, cy = d.y + d.d / 2, R = d.w / 2;
    ellipseFloor(g, cx, cy, R, R, 0, '#4f5459'); ellipseFloor(g, cx, cy, R - 0.35, R - 0.35, 0, null, '#f2c230'); ellipseFloor(g, cx, cy, R - 0.5, R - 0.5, 0, null, '#f2c230');
    const hb = (x0, y0, w, dd) => rect(g, cx + x0, cy + y0, w, dd, '#ffffff');
    hb(-0.9, -1.1, 0.4, 2.2); hb(0.5, -1.1, 0.4, 2.2); hb(-0.5, -0.2, 1, 0.4);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const [sx, sy] = P(cx + Math.cos(a) * (R - 0.15), cy + Math.sin(a) * (R - 0.15)); g.fillStyle = '#4ef08a'; g.beginPath(); g.arc(sx, sy, 1.6, 0, 7); g.fill(); }
  });
  /** 둥근 러그 */
  C.decal('ia_roundRug', (g, d) => { ellipseFloor(g, d.cx, d.cy, d.r, d.r, 0, d.border || '#b8955f'); ellipseFloor(g, d.cx, d.cy, d.r - 0.18, d.r - 0.18, 0, d.color || '#7a2232'); ellipseFloor(g, d.cx, d.cy, d.r * 0.55, d.r * 0.55, 0, null, d.border || '#b8955f'); });
  /** 모션캡처 바닥 격자 */
  C.decal('ia_grid', (g, d) => { rect(g, d.x, d.y, d.w, d.d, d.color || '#2b2d33'); g.strokeStyle = 'rgba(95,208,255,0.35)'; g.lineWidth = 0.6; for (let i = 0; i <= d.w; i += 0.5) { g.beginPath(); g.moveTo(...P(d.x + i, d.y)); g.lineTo(...P(d.x + i, d.y + d.d)); g.stroke(); } for (let j = 0; j <= d.d; j += 0.5) { g.beginPath(); g.moveTo(...P(d.x, d.y + j)); g.lineTo(...P(d.x + d.w, d.y + j)); g.stroke(); } ellipseFloor(g, d.x + d.w / 2, d.y + d.d / 2, 0.6, 0.6, 0, null, '#ff4fd8'); });
  /** 공장 보행 통로 (초록 띠 · 화살표) */
  C.decal('ia_walkway', (g, d) => { rect(g, d.x, d.y, d.w, d.d, 'rgba(63,178,127,0.35)'); rect(g, d.x, d.y, d.w, 0.08, '#f2c230'); rect(g, d.x, d.y + d.d - 0.08, d.w, 0.08, '#f2c230'); for (let i = 1; i < d.w; i += 2.5) { const cy = d.y + d.d / 2; poly(g, [P(d.x + i + 0.5, cy), P(d.x + i, cy - 0.3), P(d.x + i, cy + 0.3)], 'rgba(255,255,255,0.7)'); } });
  /** 바닥 안내선 (병원 · 색깔 줄) */
  C.decal('ia_guide', (g, d) => { (d.colors || ['#4e9cf6', '#3fb27f', '#f2c230']).forEach((c, i) => rect(g, d.x, d.y + i * 0.22, d.w, 0.14, c)); });
  /** 실내 물길 (온실 · 졸졸) */
  C.decal('ia_stream', (g, d) => { rect(g, d.x - 0.1, d.y - 0.1, d.w + 0.2, d.d + 0.2, '#c9bfae'); const [a, b] = P(d.x, d.y), [c, e] = P(d.x + d.w, d.y + d.d); const gr = g.createLinearGradient(a, b, c, e); gr.addColorStop(0, '#6fc3e6'); gr.addColorStop(1, '#3f9fd0'); rect(g, d.x, d.y, d.w, d.d, gr); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 0.8; const r = AIO.rand(Math.round(d.x * 3 + d.y)); for (let i = 0; i < d.w * d.d * 2; i++) { const [sx, sy] = P(d.x + r() * d.w, d.y + r() * d.d); g.beginPath(); g.moveTo(sx - 4, sy); g.quadraticCurveTo(sx, sy - 1.5, sx + 4, sy); g.stroke(); } for (let i = 0; i < d.w * 1.5; i++) { const [sx, sy] = P(d.x + r() * d.w, d.y + (r() < 0.5 ? -0.05 : d.d + 0.05)); g.fillStyle = '#9a9184'; g.beginPath(); g.ellipse(sx, sy, 3, 1.6, 0, 0, 7); g.fill(); } });

  // ================================================================ 공용 배치 도우미
  function kit(T) {
    const W = T.W, H = T.H, CX = T.CX;
    const rest = T.rest;
    const k = {
      W, H, CX,
      /** 3인 소파 (x..x+3, y) — 앞줄(y+1)에서 앉는다 */
      sofa(L, K, x, y, tag) { K.add({ type: 'sofa', x, y, w: 3 }); K.blockRect(x, y, 3, 1); [0.6, 1.6, 2.4].forEach((d) => rest(L, { x: x + d, y: y + 0.62, face: '+y', pose: 'sofa', approach: [Math.floor(x + d), y + 1] }, tag)); },
      /** 원탁 + 양옆 스툴 2 (탁자 칸 x,y · 스툴 칸 x-1, x+1) */
      table(L, K, x, y, tag, color = '#ffffff', stool = '#c49a62') { K.add({ type: 'roundTable', x: x + 0.5, y: y + 0.5, r: 0.42, color }); K.block(x, y); for (const [dx, face] of [[-0.45, '+x'], [1.45, '-x']]) { K.add({ type: 'stool', x: x + dx, y: y + 0.5, color: stool }); rest(L, { x: x + dx, y: y + 0.5, face, pose: 'sit' }, tag); } },
      /** 1인 침대 (x..x+1, y..y+2) */
      bed(L, K, x, y, color, tag, ap) { K.add({ type: 'bed', x, y, color }); K.blockRect(x, y, 1, 2); rest(L, { x: x + 0.5, y: y + 0.95, face: '+y', pose: 'sofa', approach: ap || [x + 1, y + 1] }, tag); },
      /** 선베드 (x, y..y+1) — y+2 에서 눕는다 */
      deck(L, K, x, y, color, tag) { K.add({ type: 'deckChair', x: x + 0.5, y: y + 0.3, color }); K.blockRect(x, y, 1, 2); rest(L, { x: x + 0.5, y: y + 0.85, face: '+y', pose: 'sofa', approach: [x, y + 2] }, tag); },
      bean(L, K, x, y, color, tag) { K.add({ type: 'beanbag', x: x + 0.5, y: y + 0.5, color }); rest(L, { x: x + 0.5, y: y + 0.5, face: '-y', pose: 'sofa' }, tag); },
      /** 벤치 (x..x+w, y) — w-1 자리 · 앞줄(y+1)에서 앉는다 */
      bench(L, K, x, y, w, tag, color) { K.add({ type: 'bench', x: x + 0.15, y: y + 0.3, w: w - 0.3, color }); K.blockRect(x, y, w, 1); const n = w - 1; for (let i = 0; i < n; i++) { const sx = n === 1 ? x + w / 2 : x + 0.8 + i * (w - 1.6) / (n - 1); rest(L, { x: sx, y: y + 0.55, face: '+y', pose: 'sit', approach: [Math.floor(sx), y + 1] }, tag); } },
      /** 파라솔 테이블 + 양옆 스툴 */
      parasol(L, K, x, y, color, tag) { K.add({ type: 'parasolTable', x: x + 0.5, y: y + 0.5, color }); K.block(x, y); for (const [dx, face] of [[-0.45, '+x'], [1.45, '-x']]) { K.add({ type: 'stool', x: x + dx, y: y + 0.5, color: '#f3d48c' }); rest(L, { x: x + dx, y: y + 0.5, face, pose: 'sit' }, tag); } },
      /** 연결 대기 의자 n석 (x.., y) — 앞줄(y+1)에서 앉는다 */
      wait(L, K, x, y, n, tag, color) { const w = n * 0.8; K.add({ type: 'ia_waitChairs', x, y, w, color }); K.blockRect(x, y, Math.ceil(w), 1); for (let i = 0; i < n; i++) { const sx = x + 0.4 + i * 0.8; rest(L, { x: sx, y: y + 0.5, face: '+y', pose: 'sit', approach: [Math.floor(sx), y + 1] }, tag); } },
      /** 원형 연회 테이블 (중심 cx, cy 정수) + 의자 4 */
      banquet(L, K, cx, cy, color, tag) { K.add({ type: 'ia_banquet', x: cx, y: cy, color }); K.blockRect(cx - 1, cy - 1, 2, 2); k.chairs(L, K, [[cx, cy - 1.2, '+y'], [cx, cy + 1.2, '-y'], [cx - 1.2, cy, '+x'], [cx + 1.2, cy, '-x']], tag, true); },
      tree(K, x, y, blossom = false, size = 1) { K.add({ type: 'roofTree', x: x + 0.5, y: y + 0.5, size, seed: x * 7 + y * 3, blossom }); K.block(x, y); },
      stools(L, K, xs, y, face, tag, color = '#c49a62') { for (const x of xs) { K.add({ type: 'stool', x, y, color }); rest(L, { x, y, face, pose: 'sit' }, tag); } },
      barStools(L, K, xs, y, tag, carry = 'mug') { for (const x of xs) { K.add({ type: 'barStool', x, y }); rest(L, { x, y, face: '-y', pose: 'sit', carry }, tag); } },
      chairs(L, K, pts, tag, premium = false) { for (const [x, y, face] of pts) { K.add({ type: 'chair', x, y, face, part: 'seat', premium }); K.add({ type: 'chair', x, y, face, part: 'back', premium }); rest(L, { x, y, face, pose: 'sit' }, tag); } },
      plant(K, x, y, size = 1, seed = 1) { K.add({ type: 'plant', x: x + 0.5, y: y + 0.55, size, seed }); K.block(x, y); },
      lamp(L, K, x, y) { K.add({ type: 'lamp', x: x + 0.5, y: y + 0.5 }); K.block(x, y); L.lamps.push({ x: x + 0.5, y: y + 0.5 }); },
      stand(L, x, y, face, tag, carry = 'mug') { rest(L, { x, y, face, pose: 'stand', carry }, tag); },
      /** 업무층: 인턴 핫데스크 묶음이 층 폭보다 넓으면 엔진이 통째로 빼먹어 S.hot 이 비고 world.hotSpot 이 죽는다 → 폭에 맞게 자른다 (남는 인턴은 근처에 서 있음) */
      work(o, wo) { return T.workFloors({ ...o, hot: Math.min(o.hot, Math.max(4, Math.floor((W - 4) / 4) * 4)) }, wo); },
      /** 옥상: 엘리베이터 탑(T.roof 와 같은 모양) + 실외기 줄 — 꾸미기는 직접 */
      roof(name, floor, color, desc, ac = true) {
        const { L, K } = T.level(name, floor, color, 'roof', { short: 'R' });
        L.desc = desc;
        L.patches.push({ x: CX, y: 0, w: 6, d: 3, style: 'marble', color: '#efece6' });
        L.elev = [];
        for (const [car, cx] of [[0, CX], [1, CX + 3]]) { K.add({ type: 'elevCab', x: cx, y: 0, w: 2, d: 2, car }); K.add({ type: 'elevDoor', x: cx, y: 0, w: 2, d: 2, car, label: 'R' }); K.blockRect(cx, 0, 2, 2); L.elev.push({ car, hall: { x: cx + 1, y: 2.75 }, cabin: { x: cx + 1, y: 1.0 } }); }
        K.add({ type: 'elevPanel', x: CX + 2.5, y: 0.35, label: 'R' }); K.block(CX + 2, 0);
        K.add({ type: 'hutShell', x: CX, y: 0, w: 6, d: 3 });
        K.wallY(0, 3, CX, { h: 82, color: '#e6e0d6' }); K.wallY(0, 3, CX + 6, { h: 82, color: '#e6e0d6' });
        K.wallX(CX, CX + 6, 3, { h: 82, color: '#e6e0d6', doors: [CX + 1, CX + 4] });
        if (ac) for (let x = CX + 7.5; x + 1 < W; x += 2.2) { K.add({ type: 'airCon', x, y: 0.4 }); K.block(Math.floor(x), 0); }
        L.windows = []; L.wallY = null;
        return { L, K };
      },
    };
    return k;
  }
  /** 외벽 그림 도우미: 층 k(0=1층)의 위쪽 y (그 층이 이번 조각에 없으면 null) */
  const rowTop = (o, k) => (k >= o.k0 && k < o.k1 ? o.Hb - (k - o.k0 + 1) * o.FP : null);
  /** 건물 마감: 외벽 그림이 꼭대기 층을 알 수 있게 */
  const finish = (T, fac) => { const B = T.done(); fac.n = B.levels.length - (B.base || 0) - 1; return B; };

  // ================================================================ 🏫 AI 고등학교
  C.indoor({
    id: 'school', icon: '🏫', name: 'AI 고등학교', desc: '교실 업무층 · 교무실 · 과학실 · 음악실 · 급식실 · 보건실 · 옥상 운동장',
    build(S, o) {
      const W = 28, H = 20;
      const fac = {
        wall: '#b5523b', texture: 'brick', win: 'grid', frame: '#fbf7ef', winColor: 'rgba(205,226,240,0.82)', trim: '#efe6d8',
        sign: '🏫 AI 고등학교', signBg: '#2f5240', signFg: '#ffffff', lobby: 'rgba(220,235,245,0.85)',
        paint(g, o) {
          const top = rowTop(o, (fac.n || 1) - 1);
          if (top == null) return;
          if (o.south) {
            const cx = o.Wpx / 2, cy = top + o.FP / 2 - 1;
            g.fillStyle = '#efe6d8'; roundRect(g, cx - 27, top + 1, 54, o.FP - 3, 6); g.fill();
            g.fillStyle = '#2f5240'; g.beginPath(); g.arc(cx, cy, 21, 0, 7); g.fill();
            g.fillStyle = '#fffdf6'; g.beginPath(); g.arc(cx, cy, 18, 0, 7); g.fill();
            for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillStyle = '#2f5240'; g.fillRect(cx + Math.cos(a) * 15 - 1, cy + Math.sin(a) * 15 - 1, 2, 2); }
            const d = new Date(), hr = ((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2 - Math.PI / 2, mn = d.getMinutes() / 60 * Math.PI * 2 - Math.PI / 2;
            g.strokeStyle = '#2b2622'; g.lineCap = 'round'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(hr) * 9, cy + Math.sin(hr) * 9); g.stroke();
            g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(mn) * 14, cy + Math.sin(mn) * 14); g.stroke();
            g.fillStyle = '#e5534b'; g.beginPath(); g.arc(cx, cy, 1.8, 0, 7); g.fill();
          } else {
            const x0 = o.Wpx / 2 - 9, hh = Math.min(o.Hb - top - 8, o.FP * 3 - 8);
            g.fillStyle = '#2f5240'; g.fillRect(x0, top + 4, 18, hh); g.fillStyle = '#f6d58a'; g.fillRect(x0 + 2, top + 6, 14, 1.5);
            g.fillStyle = '#ffffff'; g.font = `bold 10px ${FONT}`; g.textAlign = 'center';
            [...'꿈을코딩하는학교'].forEach((ch, i) => { if (12 + i * 12 < hh) g.fillText(ch, x0 + 9, top + 18 + i * 12); });
            g.textAlign = 'left';
          }
        },
      };
      const T = C.tower(S, { W, H, id: 'school', name: '🏫 AI 고등학교', facade: fac });
      const k = kit(T), CX = T.CX;

      // ---- 1F 중앙현관
      {
        T.nextFloor();
        const { L, K } = T.level('1F 중앙현관', 'ia_checker', '#e9e2d2');
        L.desc = '중앙현관 · 신발장 · 수위실 · 행정실 · 트로피 진열장';
        T.shell(L, K, { name: T.securityRoom(L, K, '🛡️ 수위실'), color: '#2b3a67' });
        T.entrance(L, K);
        K.add({ type: 'ia_board', x: 2, y: 5, w: 4, kind: 'cork', title: '📢 알림판', z: 42, h: 26 });
        K.add({ type: 'ia_shoeLocker', x: 0.3, y: 7.2, w: 6 }); K.blockRect(0, 7, 7, 1);
        K.add({ type: 'trophyCase', x: 7.5, y: 7.3, w: 3 }); K.blockRect(7, 7, 4, 1);
        K.add({ type: 'reception', x: 18.4, y: 8.6, w: 5 }); K.blockRect(18, 8, 6, 1);
        T.npc(L, '행정실 주무관', { x: 20.9, y: 7.9, face: '+y' }, { anim: 'type', hat: 'bow', accent: '#2f5240' });
        K.add({ type: 'flagStand', x: 25.6, y: 8.2 }); K.block(25, 8);
        K.add({ type: 'extinguisher', x: 27.5, y: 7.4 }); K.block(27, 7);
        k.bench(L, K, 1, 11, 4, '현관 벤치'); k.bench(L, K, 1, 15, 4, '현관 벤치');
        K.add({ type: 'sculpture', x: 8.5, y: 13.5 }); K.block(8, 13);
        T.visitorSofa(L, K, 19, 15);
        K.add({ type: 'umbrellaStand', x: 10.5, y: 19.3 }); K.block(10, 19);
        k.plant(K, 0, 19, 1.1, 3); k.plant(K, 27, 19, 1.1, 5); k.plant(K, 24, 15, 1, 8);
        T.npc(L, '수위 아저씨', { x: 14.5, y: 17.5, face: '+y' }, { hat: 'police', patrol: [{ x: 14.5, y: 17.5, face: '+y' }, { x: 4, y: 6, face: '+x' }, { x: 24, y: 6, face: '-x' }] });
        T.sign(L, 0.3, 8.6, '👟 신발장', '#7a5540'); T.sign(L, 5.3, 19.7, '🏫 중앙현관', '#2f5240');
      }
      // ---- 교실 업무층 (세션 자리)
      k.work(o, {
        name: (n) => `${n}F 교실`, looks: [['wood', '#e3cfa6'], ['wood', '#d8c39b']],
        deco(L, K, n) {
          L.desc = '교실(칠판·교탁) · ' + L.desc;
          K.add({ type: 'ia_rollBoard', x: 11, y: H - 1.9, w: 3, lines: [`📌 ${n}F 오늘의 할 일`, '1. 코드 리뷰', '2. 테스트 통과 ✅'] }); K.blockRect(11, H - 2, 3, 1);
          K.add({ type: 'lectern', x: 15.5, y: H - 1.5 }); K.block(15, H - 2);
          T.sign(L, 11.2, H - 0.3, `🏫 ${n}F 교실`, '#2f5240');
        },
      });
      // ---- 과학실 · 음악실 (+ 교무실)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 과학실·음악실`, 'tile', '#e8e6df', 'office');
        L.desc = '교무실 · 과학실(실험대·인체모형) · 음악실(피아노·드럼·합주)';
        T.shell(L, K, { name: '🧑‍🏫 교무실', color: '#7a5540' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'carpet', color: '#cdbfa6' });
        K.add({ type: 'bookshelf', x: 0.4, y: 0.3, w: 2.2, seed: 9 }); K.blockRect(0, 0, 3, 1);
        K.add({ type: 'ia_board', x: 3.4, y: 0, w: 4.4, kind: 'cork', title: '📅 학사 일정', z: 84 });
        for (let c = 0; c < 4; c++) { const st = K.deskSeat(1, -0.6, c, 'B', null); if (c !== 2) T.npc(L, c === 0 ? '교감 선생님' : '선생님', { x: st.x, y: st.y, face: '-y', pose: 'sit' }, { anim: c === 1 ? 'think' : 'type', accent: ['#7a5540', '#4e7cf6', '#000', '#3fb27f'][c], tie: c === 0 ? '#7a2232' : undefined }); }
        K.wallX(0, W, 7, { doors: [3, 17], h: 90, color: '#e9e5de' });
        K.wallY(7, H, 14, { h: 90, color: '#e9e5de' });
        // 과학실
        L.patches.push({ x: 0, y: 7, w: 14, d: H - 7, style: 'ia_hex', color: '#dfeae4' });
        K.add({ type: 'ia_board', x: 0.4, y: 7, w: 2.4, kind: 'poster', lines: ['주기율표', 'DNA'], z: 72, h: 30 });
        K.add({ type: 'blackboard', x: 5, y: 7, w: 5.5, lines: ['🧪 오늘의 실험: 전기분해', '2H₂O → 2H₂ + O₂', '⚠️ 보안경 필수!'] });
        K.add({ type: 'labBench', x: 1.5, y: 10, w: 5 }); K.blockRect(1, 10, 6, 1);
        K.add({ type: 'labBench', x: 1.5, y: 14, w: 5 }); K.blockRect(1, 14, 6, 1);
        k.stools(L, K, [2.2, 3.9, 5.6], 11.45, '-y', '과학실 실험', '#9fc4e8');
        k.stools(L, K, [2.2, 3.9, 5.6], 15.45, '-y', '과학실 실험', '#9fc4e8');
        K.add({ type: 'ia_skeleton', x: 10, y: 8 }); K.block(10, 8);
        K.add({ type: 'specimenTank', x: 12.5, y: 8.5, color: '#4ef08a' }); K.block(12, 8);
        K.add({ type: 'ia_globe', x: 8, y: 8 }); K.block(8, 8);
        K.add({ type: 'storageShelf', x: 9.3, y: 18.3, w: 2.4, seed: 4 }); K.blockRect(9, 18, 3, 1);
        T.npc(L, '과학 선생님', { x: 9.5, y: 12.5, face: '-x' }, { anim: 'think', hat: 'beret', accent: '#3fb27f', patrol: [{ x: 9.5, y: 12.5, face: '-x' }, { x: 8.5, y: 16.5, face: '-x' }] });
        T.sign(L, 0.3, 19.7, '🧪 과학실', '#2f9e5f');
        // 음악실
        L.patches.push({ x: 14, y: 7, w: W - 14, d: H - 7, style: 'carpet', color: '#d9cfe6' });
        K.add({ type: 'piano', x: 15.2, y: 8.2 }); K.blockRect(15, 8, 2, 1);
        K.add({ type: 'stool', x: 16, y: 9.5, color: '#2b2622' });
        T.npc(L, '음악 선생님', { x: 16, y: 9.5, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'bow', accent: '#a67be0' });
        K.add({ type: 'ia_drumKit', x: 25, y: 8 }); K.block(25, 8);
        K.add({ type: 'ia_board', x: 18.5, y: 7, w: 5, kind: 'staff', z: 74, h: 32 });
        K.add({ type: 'ia_board', x: 24, y: 7, w: 3.4, kind: 'poster', lines: ['🎻 합창대회', '🎹 연주회'], z: 74, h: 30 });
        for (const [xs, y] of [[[18.5, 20.5, 22.5, 24.5], 12.6], [[19.5, 21.5, 23.5], 15.6]]) {
          k.chairs(L, K, xs.map((x) => [x, y, '-y']), '음악실 합주');
          for (const x of xs) { K.add({ type: 'ia_musicStand', x, y: y - 0.85 }); K.block(Math.floor(x), Math.floor(y - 0.85)); }
        }
        k.plant(K, 27, 19, 1, 6);
        T.sign(L, 14.3, 19.7, '🎵 음악실', '#a67be0');
      }
      // ---- 급식실 · 보건실 (+ 매점)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 급식실·보건실`, 'tile', '#efe9dc', 'office');
        L.desc = '매점 · 급식실(배식대·식탁) · 보건실(침대 3)';
        T.shell(L, K, { name: '🏪 매점', color: '#2f9e5f' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'tile', color: '#efe9df' });
        K.add({ type: 'storeShelf', x: 0.4, y: 0.3, w: 4, seed: 3 }); K.blockRect(0, 0, 5, 1);
        K.add({ type: 'fridgeCase', x: 5.4, y: 0.1, w: 3 }); K.blockRect(5, 0, 4, 1);
        K.add({ type: 'vending', x: 9.4, y: 0.25, color: '#e5534b' }); K.block(9, 0);
        K.add({ type: 'till', x: 7, y: 2.6, w: 3, label: '🏪 학생 매점' }); K.blockRect(7, 2, 3, 1);
        T.npc(L, '매점 이모', { x: 8.5, y: 1.8, face: '+y' }, { hat: 'bucket', accent: '#2f9e5f' });
        k.stand(L, 8.5, 4.3, '-y', '매점 줄', 'icecream');
        K.wallX(0, W, 7, { doors: [12, 15, 21], h: 100, color: '#e9e5de' });
        K.wallY(7, H, 18, { h: 100, color: '#e9e5de' });
        // 급식실
        L.patches.push({ x: 0, y: 7, w: 18, d: H - 7, style: 'tile', color: '#f3ecdc' });
        K.add({ type: 'menuWall', x: 1, y: 7, w: 6, items: ['🍚 잡곡밥', '🍲 미역국', '🍗 닭강정', '🥬 배추김치', '🍮 푸딩', '🥛 우유'] });
        K.add({ type: 'ia_mealCounter', x: 1, y: 9, w: 9 }); K.blockRect(1, 9, 9, 1);
        T.npc(L, '조리사', { x: 3, y: 8.3, face: '+y' }, { anim: 'type', hat: 'cap', accent: '#ffffff', carry: 'tray' });
        T.npc(L, '조리사', { x: 7, y: 8.3, face: '+y' }, { anim: 'type', hat: 'cap', accent: '#ffffff' });
        for (const [ty, xs] of [[12, [1.5, 3.5, 5.5, 7.5]], [16, [2.5, 4.5, 6.5]]]) {
          for (let i = 0; i < 8; i++) K.add({ type: 'tableSeg', x: 1 + i, y: ty, w: 1, d: 0.9 });
          K.blockRect(1, ty, 8, 1);
          k.stools(L, K, xs, ty - 0.6, '+y', '급식실', '#f2c230');
          k.stools(L, K, xs, ty + 1.4, '-y', '급식실', '#4e9cf6');
        }
        K.add({ type: 'storageShelf', x: 12.4, y: 18.3, w: 2.4, seed: 2 }); K.blockRect(12, 18, 3, 1);
        K.add({ type: 'waterCooler', x: 16.3, y: 18.3 }); K.block(16, 18);
        k.plant(K, 17, 8, 1, 2);
        T.npc(L, '영양 선생님', { x: 11, y: 14, face: '-x' }, { hat: 'bow', accent: '#c47f22', carry: 'paper', patrol: [{ x: 11, y: 14, face: '-x' }, { x: 11, y: 10.5, face: '-x' }, { x: 14, y: 17.5, face: '-y' }] });
        T.sign(L, 0.3, 19.7, '🍱 급식실', '#c47f22'); T.sign(L, 12.2, 17.7, '식판 반납', '#7a5540', false);
        // 보건실
        L.patches.push({ x: 18, y: 7, w: W - 18, d: H - 7, style: 'ia_lino', color: '#eef5f3' });
        K.add({ type: 'ia_board', x: 18.4, y: 7, w: 2.4, kind: 'cork', title: '🩹 건강 수칙', z: 74, h: 30 });
        K.add({ type: 'ia_medCabinet', x: 23.4, y: 7.2, w: 3 }); K.blockRect(23, 7, 4, 1);
        const st = K.deskSeat(18, 8, 0, 'F', null);
        T.npc(L, '보건 선생님', { x: st.x, y: st.y, face: '+y', pose: 'sit' }, { anim: 'type', accent: '#e2667f' });
        for (const [bx, c] of [[19, '#f2a7c3'], [22, '#a8c8f0'], [25, '#b8e0c0']]) k.bed(L, K, bx, 15, c, '보건실 침대');
        K.add({ type: 'ia_wheelchair', x: 26, y: 11 }); K.block(26, 11);
        T.sign(L, 18.3, 19.7, '🩹 보건실', '#e2667f');
      }
      // ---- 옥상 운동장
      {
        const { L, K } = k.roof('R 옥상 운동장', 'tile', '#c4cabd', '옥상 운동장 · 농구 코트 · 육상 트랙 · 미니 축구 · 벤치');
        L.decals.push({ type: 'court', kind: 'basket', x: 0.5, y: 4, w: 12, d: 9 });
        K.add({ type: 'hoop', x: 1.2, y: 8.5, side: 1 }); K.block(1, 8);
        K.add({ type: 'hoop', x: 11.8, y: 8.5, side: -1 }); K.block(11, 8);
        L.decals.push({ type: 'ia_track', x: 14, y: 4, w: 13.5, d: 15.5 });
        K.add({ type: 'goal', x: 16.3, y: 11.75, side: 1 }); K.add({ type: 'goal', x: 25.2, y: 11.75, side: -1 });
        k.bench(L, K, 1, 15, 4, '옥상 벤치', '#4e7cf6'); k.bench(L, K, 6, 15, 4, '옥상 벤치', '#e5534b');
        k.stand(L, 4, 13.6, '-y', '농구 구경', 'icecream'); k.stand(L, 8.5, 13.6, '-y', '농구 구경');
        K.add({ type: 'waterCooler', x: 12.3, y: 18.3 }); K.block(12, 18);
        K.add({ type: 'flag', x: 27.4, y: 19.2, color: '#2f5240' }); K.block(27, 19);
        k.plant(K, 0, 19, 1.1, 4);
        T.npc(L, '체육 선생님', { x: 15, y: 5, face: '+x' }, { hat: 'cap', accent: '#e5534b', say: '삑! 한 바퀴 더!', patrol: [{ x: 15, y: 5, face: '+x' }, { x: 26.5, y: 5, face: '+y' }, { x: 26.5, y: 18.5, face: '-x' }, { x: 15, y: 18.5, face: '-y' }] });
        T.npc(L, '농구부', { x: 6.5, y: 8.5, face: '-x' }, { hat: 'beanie', accent: '#4e7cf6', patrol: [{ x: 6.5, y: 8.5, face: '-x' }, { x: 3, y: 7, face: '-x' }, { x: 9.5, y: 10, face: '+x' }] });
        T.sign(L, 0.4, H - 0.4, '⚽ 옥상 운동장', '#3f8a45'); T.sign(L, 14.3, 3.6, '🏃 트랙', '#c9573f');
      }
      return finish(T, fac);
    },
  });

  // ================================================================ 🏥 AI 종합병원
  C.indoor({
    id: 'hospital', icon: '🏥', name: 'AI 종합병원', desc: '접수·대기실·응급실 · 진료실·약국·MRI · 입원 병동 · 수술실·회복실 · 옥상 헬리포트',
    build(S, o) {
      const W = 30, H = 20;
      const fac = {
        wall: '#f4f6f8', texture: 'panel', win: 'band', winColor: 'rgba(185,222,240,0.88)', frame: 'rgba(80,120,150,0.5)', trim: '#d5dee5',
        sign: '🏥 AI 종합병원', signBg: '#e5534b', signFg: '#ffffff', lobby: 'rgba(215,236,246,0.9)', awning: '#e5534b',
        paint(g, o) {
          for (let k = Math.max(1, o.k0); k < o.k1; k++) { const y = rowTop(o, k) + o.FP - 7; g.fillStyle = 'rgba(63,178,127,0.55)'; g.fillRect(0, y, o.Wpx, 2.5); }
          const top = rowTop(o, (fac.n || 1) - 1);
          if (top != null) {
            const cx = o.south ? o.Wpx - 48 : 44, cy = top + o.FP / 2;
            g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, 25, 0, 7); g.fill(); g.strokeStyle = '#e5534b'; g.lineWidth = 2.5; g.stroke();
            g.fillStyle = '#e5534b'; g.fillRect(cx - 6.5, cy - 18, 13, 36); g.fillRect(cx - 18, cy - 6.5, 36, 13);
          }
          const g0 = rowTop(o, 0);
          if (g0 != null && !o.south) {
            g.fillStyle = '#e5534b'; roundRect(g, 10, g0 + 6, o.Wpx - 20, 14, 3); g.fill();
            g.fillStyle = '#fff'; g.font = `bold 9px ${FONT}`; g.fillText('🚑 응급의료센터  EMERGENCY 24h', 18, g0 + 16.5);
            g.fillStyle = '#c9cfd4'; g.fillRect(o.Wpx - 120, g0 + 24, 90, o.FP - 24); g.fillStyle = 'rgba(0,0,0,0.15)'; for (let i = 0; i < 6; i++) g.fillRect(o.Wpx - 120, g0 + 27 + i * 5, 90, 1);
          }
        },
      };
      const T = C.tower(S, { W, H, id: 'hospital', name: '🏥 AI 종합병원', facade: fac });
      const k = kit(T), CX = T.CX;
      let floorMap = null;

      // ---- 1F 접수 · 응급실
      {
        T.nextFloor();
        const { L, K } = T.level('1F 접수·응급실', 'ia_lino', '#eef3f5', 'office');
        L.desc = '응급실 · 접수·수납 · 대기실 · 휠체어 대여 · 층별 안내';
        T.shell(L, K, { name: '🚑 응급실', color: '#e5534b' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'ia_lino', color: '#f6e9e9' });
        for (const bx of [1, 5, 9]) { K.add({ type: 'ia_hospBed', x: bx, y: 0.3, color: '#f2a7a7' }); K.blockRect(bx, 0, 2, 3); T.rest(L, { x: bx + 0.55, y: 1.3, face: '+y', pose: 'sofa', approach: [bx, 3] }, '응급실 침대'); }
        K.add({ type: 'ia_board', x: 11.6, y: 0, w: 2, kind: 'xray', z: 84, h: 30 });
        T.npc(L, '응급의학과 의사', { x: 7.5, y: 3.6, face: '-y' }, { anim: 'think', hat: 'cap', accent: '#3fb27f', patrol: [{ x: 7.5, y: 3.6, face: '-y' }, { x: 3.5, y: 3.6, face: '-y' }, { x: 11.5, y: 3.6, face: '-y' }] });
        T.entrance(L, K, { turnstiles: false });
        floorMap = { type: 'ia_board', x: 2, y: 5, w: 6.5, kind: 'map', title: '🏥 층별 안내', z: 45, h: 40, lines: [] };
        K.add(floorMap);
        K.add({ type: 'reception', x: 18.4, y: 8.6, w: 6 }); K.blockRect(18, 8, 7, 1);
        T.npc(L, '원무과', { x: 20, y: 7.9, face: '+y' }, { anim: 'type', hat: 'bow', accent: '#4e9cf6' });
        T.npc(L, '원무과', { x: 23, y: 7.9, face: '+y' }, { anim: 'type', accent: '#4e9cf6' });
        K.add({ type: 'ticketMachine', x: 16.6, y: 9 }); K.block(16, 9);
        K.add({ type: 'waterCooler', x: 26.3, y: 7.3 }); K.block(26, 7);
        K.add({ type: 'vending', x: 28.4, y: 7.3, color: '#4e9cf6' }); K.block(28, 7);
        k.wait(L, K, 1, 11, 6, '대기실', '#4e9cf6'); k.wait(L, K, 1, 14, 6, '대기실', '#3fb27f');
        L.decals.push({ type: 'ia_guide', x: 8, y: 16.6, w: 21, d: 0.7 });
        for (const x of [10, 11]) { K.add({ type: 'ia_wheelchair', x, y: 18 }); K.block(x, 18); }
        T.visitorSofa(L, K, 20, 15);
        k.plant(K, 0, 19, 1.1, 3); k.plant(K, 29, 19, 1.1, 7);
        T.npc(L, '안내 봉사자', { x: 13, y: 12, face: '+y' }, { hat: 'bucket', accent: '#3fb27f', patrol: [{ x: 13, y: 12, face: '+y' }, { x: 9, y: 17.5, face: '+y' }, { x: 17, y: 13, face: '-x' }] });
        T.sign(L, 18.4, 10, '🧾 접수·수납', '#4e9cf6'); T.sign(L, 1.2, 16.6, '💺 대기실', '#4e9cf6'); T.sign(L, 9.4, 19.7, '♿ 휠체어 대여', '#6b8fb0');
      }
      k.work(o, {
        name: (n) => `${n}F 의료정보팀`, looks: [['ia_lino', '#e9f0f3'], ['carpet', '#dfe7ec']],
        deco(L, K, n) {
          L.desc = '의료정보·원무 · ' + L.desc;
          K.add({ type: 'ia_medCabinet', x: 11, y: H - 1.8, w: 3 }); K.blockRect(11, H - 2, 3, 1);
          K.add({ type: 'ia_wheelchair', x: 15, y: H - 2 }); K.block(15, H - 2);
          T.sign(L, 11.2, H - 0.3, `🩺 ${n}F 의료정보팀`, '#4e9cf6');
        },
      });
      // ---- 진료실 · 약국 · MRI (+ 주사실)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 진료실·약국`, 'ia_lino', '#eef3f5', 'office');
        L.desc = '주사실 · 내과·정형외과 진료실 · 약국 · 영상의학과(MRI)';
        T.shell(L, K, { name: '💉 주사실', color: '#4e9cf6' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'ia_lino', color: '#e8f1f8' });
        K.add({ type: 'ia_medCabinet', x: 0.4, y: 0.2, w: 3 }); K.blockRect(0, 0, 4, 1);
        k.chairs(L, K, [[5.5, 2.2, '+y'], [7.5, 2.2, '+y'], [9.5, 2.2, '+y']], '주사실');
        T.npc(L, '간호사', { x: 7.5, y: 3.6, face: '-y' }, { hat: 'bow', accent: '#f2a7c3', carry: 'tray', patrol: [{ x: 7.5, y: 3.6, face: '-y' }, { x: 3, y: 3, face: '+y' }] });
        K.wallX(0, 14, 7, { frosted: true, h: 80, doors: [3, 10] });
        K.wallY(7, H, 7, { frosted: true, h: 80 }); K.wallY(7, H, 14, { h: 80 });
        [[0, '🩺 내과 진료실', '#4e9cf6'], [7, '🦴 정형외과 진료실', '#3fb27f']].forEach(([rx, name, c], i) => {
          L.patches.push({ x: rx, y: 7, w: 7, d: H - 7, style: 'ia_lino', color: i ? '#eef6f0' : '#eef2f8' });
          const st = K.deskSeat(rx + 2, 8, 0, 'F', null);
          T.npc(L, i ? '정형외과 의사' : '내과 의사', { x: st.x, y: st.y, face: '+y', pose: 'sit' }, { anim: 'type', accent: '#ffffff', tie: c });
          k.chairs(L, K, [[rx + 3, 11.6, '-y']], '진료 상담');
          K.add({ type: 'ia_hospBed', x: rx + 4.8, y: 14, color: c }); K.blockRect(rx + 4, 14, 3, 3);
          T.rest(L, { x: rx + 5.35, y: 15.1, face: '+y', pose: 'sofa', approach: [rx + 3, 15] }, '진찰 침대');
          K.add({ type: 'ia_board', x: rx + 0.3, y: 7, w: 1.9, kind: 'xray', z: 70, h: 28 });
          k.plant(K, rx, H - 1, 0.9, rx + 3);
          T.sign(L, rx + 0.3, H - 0.3, name, c);
        });
        // 약국
        K.wallX(14, 22, 7, { glass: true, h: 80, doors: [21] }); K.wallY(7, H, 22, { h: 80 });
        L.patches.push({ x: 14, y: 7, w: 8, d: H - 7, style: 'tile', color: '#eef7ef' });
        K.add({ type: 'ia_pharmShelf', x: 14.3, y: 7.2, w: 5, seed: 3 }); K.blockRect(14, 7, 6, 1);
        K.add({ type: 'till', x: 15, y: 10, w: 4, label: '💊 약 받는 곳', color: '#e8f5ec' }); K.blockRect(15, 10, 4, 1);
        T.npc(L, '약사', { x: 16, y: 9.2, face: '+y' }, { anim: 'type', accent: '#2f9e5f' });
        T.npc(L, '약사', { x: 18, y: 9.2, face: '+y' }, { accent: '#2f9e5f', carry: 'box', patrol: [{ x: 18, y: 9.2, face: '+y' }, { x: 17, y: 8.4, face: '-y' }] });
        k.wait(L, K, 15, 14, 5, '약국 대기', '#3fb27f');
        T.sign(L, 14.3, H - 0.3, '💊 약국', '#2f9e5f');
        // 영상의학과 MRI
        K.wallX(22, W, 7, { h: 90, doors: [26] });
        L.patches.push({ x: 22, y: 7, w: W - 22, d: H - 7, style: 'ia_lino', color: '#e6ecf5' });
        K.add({ type: 'ia_board', x: 22.3, y: 7, w: 3.2, kind: 'xray', z: 76, h: 32 });
        K.add({ type: 'ia_board', x: 27, y: 7, w: 2.4, kind: 'onair', text: '촬영 중', z: 86, h: 13 });
        K.add({ type: 'ia_mri', x: 24, y: 10.5 }); K.blockRect(24, 10, 3, 4);
        T.rest(L, { x: 25.1, y: 12.9, face: '+y', pose: 'sofa', approach: [27, 13] }, 'MRI 검사');
        const s2 = K.deskSeat(22, 13, 0, 'F', null);
        T.npc(L, '방사선사', { x: s2.x, y: s2.y, face: '+y', pose: 'sit' }, { anim: 'type', hat: 'cap', accent: '#4e9cf6' });
        k.wait(L, K, 26, 17, 3, 'MRI 대기', '#4e9cf6');
        T.sign(L, 22.3, H - 0.3, '☢️ 영상의학과 MRI', '#4e7cf6');
      }
      // ---- 입원 병동
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 입원 병동`, 'ia_lino', '#f0f4f2', 'office');
        L.desc = '간호사 스테이션 · 입원실 4 (침대 12) · 특실 보호자 소파';
        T.shell(L, K, { name: '👩‍⚕️ 간호사 스테이션', color: '#e2667f', glass: true });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'ia_lino', color: '#f7eef2' });
        K.add({ type: 'reception', x: 1.4, y: 2.4, w: 6 }); K.blockRect(1, 2, 7, 1);
        T.npc(L, '수간호사', { x: 3, y: 1.6, face: '+y' }, { anim: 'type', hat: 'bow', accent: '#e2667f' });
        T.npc(L, '간호사', { x: 5.5, y: 1.6, face: '+y' }, { anim: 'type', hat: 'bow', accent: '#f2a7c3' });
        K.add({ type: 'ia_medCabinet', x: 9.4, y: 0.2, w: 3 }); K.blockRect(9, 0, 4, 1);
        K.add({ type: 'janitorCart', x: 12.3, y: 2.4 }); K.blockRect(12, 2, 2, 1);
        K.wallX(0, W, 7, { doors: [2, 9, 16, 24], h: 80, color: '#eef1ee' });
        for (const x of [7, 14, 21]) K.wallY(7, H, x, { h: 80, color: '#eef1ee' });
        [[0, 7], [7, 14], [14, 21], [21, 30]].forEach(([rx, rx1], i) => {
          L.patches.push({ x: rx, y: 7, w: rx1 - rx, d: H - 7, style: 'ia_lino', color: ['#eef5f9', '#f6f1ea', '#eef6ef', '#f4eef6'][i] });
          for (const [b, bx] of [rx + 0.2, rx + 2.3, rx + 4.4].entries()) { K.add({ type: 'ia_hospBed', x: bx, y: 9, color: COLORS[(i * 3 + b) % 7] }); K.blockRect(Math.floor(bx), 9, 2, 3); T.rest(L, { x: bx + 0.55, y: 10.1, face: '+y', pose: 'sofa', approach: [Math.floor(bx + 0.55), 12] }, `${n}0${i + 1}호 병실`); }
          K.add({ type: 'roundTable', x: rx + 4.5, y: 15.5, r: 0.35, color: '#ffffff' }); K.block(rx + 4, 15);
          k.chairs(L, K, [[rx + 5.5, 15.5, '-x']], '보호자 의자');
          k.plant(K, rx, H - 1, 0.9, rx + 1);
          T.sign(L, rx + 0.3, H - 0.3, i === 3 ? `👑 ${n}0${i + 1}호 특실` : `🛏️ ${n}0${i + 1}호`, '#6b8fb0');
        });
        k.sofa(L, K, 25, 17, '특실 보호자 소파');
        T.npc(L, '회진 교수', { x: 4, y: 6, face: '+x' }, { tie: '#4e9cf6', accent: '#ffffff', anim: 'think', patrol: [{ x: 4, y: 6, face: '+x' }, { x: 27, y: 6, face: '-x' }, { x: 16, y: 13, face: '-y' }] });
        T.npc(L, '간호사', { x: 10, y: 13, face: '-y' }, { hat: 'bow', accent: '#f2a7c3', carry: 'tray', patrol: [{ x: 10, y: 13, face: '-y' }, { x: 3, y: 13, face: '-y' }, { x: 24, y: 13, face: '-y' }] });
      }
      // ---- 수술실 · 회복실
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 수술실·회복실`, 'ia_lino', '#e4f1ec', 'office');
        L.desc = '소독·탈의실 · 수술실 2 (무영등·생체 모니터) · 회복실';
        T.shell(L, K, { name: '🧼 소독·탈의실', color: '#3fb27f' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'tile', color: '#e3f0ea' });
        K.add({ type: 'lockers', x: 0.3, y: 0.25, w: 4 }); K.blockRect(0, 0, 5, 1);
        K.add({ type: 'storageShelf', x: 5.4, y: 0.3, w: 3, seed: 8 }); K.blockRect(5, 0, 4, 1);
        k.bench(L, K, 1, 3, 4, '소독실 대기', '#3fb27f');
        T.npc(L, '외과 레지던트', { x: 10, y: 2.5, face: '-x' }, { hat: 'cap', accent: '#3fb27f', anim: 'think' });
        K.wallX(0, W, 7, { doors: [6, 16, 24], h: 90, color: '#e8f1ec' });
        K.wallY(7, H, 10, { h: 90, color: '#e8f1ec' }); K.wallY(7, H, 20, { glass: true, h: 80 });
        [[0, '🔪 제1 수술실'], [10, '🔪 제2 수술실']].forEach(([rx, name]) => {
          L.patches.push({ x: rx, y: 7, w: 10, d: H - 7, style: 'tile', color: '#d6ece4' });
          L.decals.push({ type: 'floor', x: rx + 2.5, y: 10, w: 5, d: 5.5, color: 'rgba(63,178,127,0.18)' });
          K.add({ type: 'ia_surgery', x: rx + 4, y: 11.5 }); K.blockRect(rx + 4, 11, 2, 3);
          T.npc(L, '집도의', { x: rx + 4.6, y: 14.6, face: '-y' }, { anim: 'type', hat: 'cap', accent: '#3fb27f' });
          T.npc(L, '마취과 의사', { x: rx + 6.7, y: 12.3, face: '-x' }, { anim: 'think', hat: 'cap', accent: '#4e9cf6' });
          K.add({ type: 'ia_board', x: rx + 0.5, y: 7, w: 3, kind: 'onair', text: '수술 중', z: 86, h: 14 });
          K.add({ type: 'ia_medCabinet', x: rx + 7.2, y: 7.2, w: 2.5 }); K.blockRect(rx + 7, 7, 3, 1);
          T.sign(L, rx + 0.3, H - 0.3, name, '#2f9e5f');
        });
        L.patches.push({ x: 20, y: 7, w: W - 20, d: H - 7, style: 'ia_lino', color: '#eef6f2' });
        for (const bx of [21, 24, 27]) { K.add({ type: 'ia_hospBed', x: bx, y: 9.5, color: '#b8e0c0' }); K.blockRect(bx, 9, 2, 3); T.rest(L, { x: bx + 0.55, y: 10.6, face: '+y', pose: 'sofa', approach: [bx, 12] }, '회복실'); }
        k.sofa(L, K, 22, 16, '회복실 보호자');
        T.npc(L, '회복실 간호사', { x: 25.5, y: 13.5, face: '-y' }, { hat: 'bow', accent: '#f2a7c3', carry: 'tray', patrol: [{ x: 25.5, y: 13.5, face: '-y' }, { x: 21.5, y: 13, face: '-y' }, { x: 28.5, y: 13, face: '-y' }] });
        T.sign(L, 20.3, H - 0.3, '🛌 회복실', '#3fb27f');
      }
      // ---- 옥상 헬리포트 + 직원 휴게 정원
      {
        const { L, K } = k.roof('R 옥상 헬리포트', 'concrete', '#b9bcbf', '닥터헬기 헬리포트 · 직원 휴게 옥상정원');
        L.decals.push({ type: 'ia_helipad', x: 1, y: 4, w: 12, d: 12 });
        K.add({ type: 'ia_heli', x: 5.2, y: 9.3 }); K.blockRect(5, 9, 5, 2);
        K.add({ type: 'flag', x: 13.6, y: 15.4, color: '#ff9a3c' }); K.block(13, 15);
        T.npc(L, '닥터헬기 조종사', { x: 8, y: 12.2, face: '-y' }, { hat: 'shades', accent: '#2b3a67' });
        T.npc(L, '응급구조사', { x: 4, y: 12.5, face: '+x' }, { hat: 'cap', accent: '#e5534b', patrol: [{ x: 4, y: 12.5, face: '+x' }, { x: 3, y: 7, face: '+x' }, { x: 11, y: 13.5, face: '-x' }] });
        L.patches.push({ x: 16, y: 4, w: W - 16, d: H - 4, style: 'grass', color: '#a6d28b' });
        k.parasol(L, K, 18, 6, '#e5534b', '옥상 휴게'); k.parasol(L, K, 23, 6, '#4e9cf6', '옥상 휴게'); k.parasol(L, K, 26, 10, '#3fb27f', '옥상 휴게');
        k.bench(L, K, 17, 13, 4, '옥상 벤치'); k.bench(L, K, 22, 15, 4, '옥상 벤치');
        for (const [x, y] of [[29, 5], [16, 9], [29, 17], [17, 18]]) k.tree(K, x, y, y > 8);
        for (const x of [19.4, 22]) { K.add({ type: 'planter', x, y: H - 0.9, w: 2.2, seed: x * 3 }); K.blockRect(Math.floor(x), H - 1, 3, 1); }
        T.sign(L, 1.2, H - 0.4, '🚁 헬리포트', '#e5534b'); T.sign(L, 16.4, H - 0.4, '🌿 직원 휴게 정원', '#3f8a45');
      }
      floorMap.lines = T.levels.slice().reverse().slice(0, 6).map((L) => L.name);
      return finish(T, fac);
    },
  });

  // ================================================================ 🏨 AI 호텔
  C.indoor({
    id: 'hotel', icon: '🏨', name: 'AI 호텔', desc: '샹들리에 로비·컨시어지 · 객실층 · 실내 수영장·자쿠지 · 연회장 · 스카이라운지 바',
    build(S, o) {
      const W = 28, H = 22;
      const fac = {
        wall: '#24304f', texture: 'panel', win: 'arch', frame: '#d4a94a', winColor: 'rgba(255,236,190,0.7)', trim: '#d4a94a',
        sign: '🏨 HOTEL AI ★★★★★', signBg: '#1a2238', signFg: '#f6d58a', lobby: 'rgba(255,230,180,0.85)', awning: '#d4a94a',
        paint(g, o) {
          g.fillStyle = 'rgba(212,169,74,0.85)';
          for (const x of [0, o.Wpx / 2 - 2, o.Wpx - 4]) g.fillRect(x, 0, 4, o.Hb);
          const top = rowTop(o, (fac.n || 1) - 1);
          if (top == null) return;
          if (o.south) {
            const cx = o.Wpx / 2, cy = top + o.FP / 2;
            g.fillStyle = '#1a2238'; g.beginPath(); g.arc(cx, cy, 22, 0, 7); g.fill(); g.strokeStyle = '#d4a94a'; g.lineWidth = 2; g.stroke();
            g.fillStyle = '#f6d58a'; g.beginPath(); g.moveTo(cx - 12, cy + 6); g.lineTo(cx - 12, cy - 6); g.lineTo(cx - 6, cy); g.lineTo(cx, cy - 10); g.lineTo(cx + 6, cy); g.lineTo(cx + 12, cy - 6); g.lineTo(cx + 12, cy + 6); g.closePath(); g.fill();
            g.font = `bold 6px ${FONT}`; g.textAlign = 'center'; g.fillText('★ ★ ★ ★ ★', cx, cy + 15); g.textAlign = 'left';
          } else {
            const x0 = o.Wpx / 2 - 10, hh = Math.min(o.Hb - top - 6, o.FP * 4);
            g.fillStyle = '#1a2238'; g.fillRect(x0, top + 3, 20, hh);
            g.save(); g.shadowColor = '#f6d58a'; g.shadowBlur = o.night ? 8 : 2; g.fillStyle = '#f6d58a'; g.font = `bold 12px ${FONT}`; g.textAlign = 'center';
            [...'HOTEL'].forEach((ch, i) => { if (14 + i * 15 < hh) g.fillText(ch, x0 + 10, top + 17 + i * 15); }); g.restore();
          }
        },
      };
      const T = C.tower(S, { W, H, id: 'hotel', name: '🏨 AI 호텔', facade: fac });
      const k = kit(T), CX = T.CX;

      // ---- 1F 로비
      {
        T.nextFloor();
        const { L, K } = T.level('1F 그랜드 로비', 'marble', '#f4efe6');
        L.desc = '그랜드 로비 · 샹들리에 · 컨시어지 · 피아노 라운지 · 수하물 보관';
        T.shell(L, K, { name: '🧳 수하물 보관소', color: '#7a2232' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'carpet', color: '#c9b38f' });
        K.add({ type: 'parcelShelf', x: 0.4, y: 0.3, w: 5, seed: 6 }); K.blockRect(0, 0, 6, 1);
        for (const x of [2, 5, 8]) { K.add({ type: 'ia_luggage', x, y: 2 }); K.block(x, 2); }
        T.npc(L, '벨보이', { x: 10.5, y: 3, face: '+y' }, { hat: 'cap', accent: '#7a2232', tie: '#d4a94a', patrol: [{ x: 10.5, y: 3, face: '+y' }, { x: 12.5, y: 6, face: '+x' }, { x: 16, y: 17, face: '+y' }] });
        T.entrance(L, K, { turnstiles: false });
        L.decals.push({ type: 'ia_roundRug', cx: 14, cy: 13, r: 3.4, color: '#7a2232', border: '#d4a94a' });
        K.add({ type: 'ia_banquet', x: 14, y: 13, color: '#f2a7c3' }); K.blockRect(13, 12, 2, 2);
        K.add({ type: 'ia_chandelier', x: 14, y: 13, size: 1.3 });
        K.add({ type: 'reception', x: 19.4, y: 8.6, w: 5 }); K.blockRect(19, 8, 6, 1);
        T.npc(L, '컨시어지', { x: 21, y: 7.9, face: '+y' }, { anim: 'type', accent: '#1a2238', tie: '#d4a94a' });
        T.npc(L, '프런트', { x: 23, y: 7.9, face: '+y' }, { anim: 'type', hat: 'bow', accent: '#1a2238' });
        K.add({ type: 'ia_grandPiano', x: 7.6, y: 8 }); K.blockRect(7, 8, 3, 3);
        T.npc(L, '피아니스트', { x: 8.4, y: 10.15, face: '-y', pose: 'sit' }, { anim: 'type', accent: '#2b2622', tie: '#2b2622' });
        k.sofa(L, K, 1, 11, '로비 라운지'); k.sofa(L, K, 1, 15, '로비 라운지');
        K.add({ type: 'roundTable', x: 2.5, y: 13.5, r: 0.5, color: '#efe6d6' }); K.block(2, 13);
        T.visitorSofa(L, K, 20, 16);
        K.add({ type: 'ia_luggage', x: 17, y: 19 }); K.block(17, 19);
        K.add({ type: 'umbrellaStand', x: 11.5, y: 21.3 }); K.block(11, 21);
        K.add({ type: 'ia_monstera', x: 0, y: 20, size: 1.1 }); K.block(0, 20);
        K.add({ type: 'ia_monstera', x: 27, y: 20, size: 1.1, pot: '#d4a94a' }); K.block(27, 20);
        K.add({ type: 'ia_monstera', x: 26, y: 8, size: 0.9, pot: '#d4a94a' }); K.block(26, 8);
        T.npc(L, '도어맨', { x: 12.5, y: 20.4, face: '+y' }, { hat: 'police', accent: '#7a2232', tie: '#d4a94a' });
        T.sign(L, 19.4, 10, '🛎️ 컨시어지 · 프런트', '#1a2238'); T.sign(L, 1.2, 17.6, '🎹 피아노 라운지', '#7a2232');
      }
      k.work(o, {
        name: (n) => `${n}F 비즈니스 센터`, looks: [['carpet', '#d9cbb7'], ['ia_herring', '#d9b98f']],
        deco(L, K, n) {
          L.desc = '비즈니스 센터 · ' + L.desc;
          K.add({ type: 'ia_luggage', x: 11, y: H - 2 }); K.block(11, H - 2);
          K.add({ type: 'ia_monstera', x: 13, y: H - 2, size: 0.9, pot: '#d4a94a' }); K.block(13, H - 2);
          T.sign(L, 11.2, H - 0.3, `💼 ${n}F 비즈니스 센터`, '#1a2238');
        },
      });
      // ---- 객실층
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 객실층`, 'carpet', '#7a2f3a');
        L.desc = '하우스키핑 · 디럭스 객실 3 · 스위트룸 (더블베드 · 티 테이블)';
        T.shell(L, K, { name: '🧺 하우스키핑', color: '#4e7cf6' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'tile', color: '#e4edf5' });
        for (let i = 0; i < 4; i++) { K.add({ type: 'washer', x: 0.3 + i * 1.2, y: 0.3, k: i }); K.block(i, 0); }
        K.add({ type: 'storageShelf', x: 5.4, y: 0.3, w: 3, seed: 5 }); K.blockRect(5, 0, 4, 1);
        K.add({ type: 'janitorCart', x: 9.3, y: 2.4 }); K.blockRect(9, 2, 2, 1);
        T.npc(L, '룸메이드', { x: 6, y: 3, face: '+y' }, { hat: 'bow', accent: '#4e7cf6', carry: 'mop', patrol: [{ x: 6, y: 3, face: '+y' }, { x: 2, y: 6, face: '+x' }, { x: 25, y: 6, face: '-x' }] });
        L.patches.push({ x: 0, y: 5, w: W, d: 2, style: 'carpet', color: '#7a2f3a' });
        K.wallX(0, W, 7, { doors: [1, 8, 15, 22], h: 90, color: '#efe6d6' });
        for (const x of [7, 14, 21]) K.wallY(7, H, x, { h: 90, color: '#efe6d6' });
        [[0, '#c9b9e8'], [7, '#a8c8f0'], [14, '#f2c9a8'], [21, '#e8c9d8']].forEach(([rx, c], i) => {
          const suite = i === 3;
          L.patches.push({ x: rx, y: 7, w: 7, d: H - 7, style: suite ? 'ia_herring' : 'carpet', color: suite ? '#c9a676' : '#e8dcc8' });
          K.add({ type: 'ia_bigBed', x: rx + 3, y: 8.4, color: c }); K.blockRect(rx + 2, 8, 4, 3);
          T.rest(L, { x: rx + 3.55, y: 9.7, face: '+y', pose: 'sofa', approach: [rx + 1, 9] }, suite ? '스위트룸 침대' : `${n}0${i + 1}호 객실`);
          T.rest(L, { x: rx + 4.45, y: 9.7, face: '+y', pose: 'sofa', approach: [rx + 6, 9] }, suite ? '스위트룸 침대' : `${n}0${i + 1}호 객실`);
          K.add({ type: 'roundTable', x: rx + 5.5, y: 15.5, r: 0.38, color: '#ffffff' }); K.block(rx + 5, 15);
          k.chairs(L, K, [[rx + 4.4, 15.5, '+x']], '객실 티타임', true);
          k.lamp(L, K, rx + 6, 13);
          if (suite) { k.sofa(L, K, rx + 2, 18, '스위트 거실'); K.add({ type: 'ia_chandelier', x: rx + 3.5, y: 15, size: 0.8 }); }
          else { K.add({ type: 'ia_luggage', x: rx + 1, y: 18 }); K.block(rx + 1, 18); }
          T.sign(L, rx + 0.3, H - 0.3, suite ? `👑 ${n}0${i + 1} 스위트` : `🛏️ ${n}0${i + 1}호`, suite ? '#b8955f' : '#7a2232');
        });
      }
      // ---- 실내 수영장 (+ 사우나)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 실내 수영장`, 'tile', '#dfeff2', 'office');
        L.desc = '사우나 · 실내 수영장 · 선베드 · 자쿠지 · 안전요원';
        T.shell(L, K, { name: '🧖 사우나', color: '#c47f22' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'wood', color: '#c49a62' });
        k.bench(L, K, 1, 1, 5, '사우나', '#a87a52'); k.bench(L, K, 6, 1, 5, '사우나', '#a87a52');
        K.add({ type: 'ia_board', x: 2, y: 0, w: 4, kind: 'neon', text: '♨️ SAUNA 85°C', color: '#ff9a3c', size: 7, z: 86, h: 18 });
        L.decals.push({ type: 'pool', x: 2, y: 9, w: 14, d: 7 }); K.blockRect(2, 9, 14, 7);
        for (const x of [2, 4, 6, 8, 10, 12]) k.deck(L, K, x, 17, ['#4e9cf6', '#f2a7c3', '#f6c445', '#3fb27f', '#ff9a5a', '#a67be0'][x / 2 - 1], '수영장 선베드');
        for (const x of [3, 7, 11]) { K.add({ type: 'parasol', x: x + 0.5, y: 17.5, color: ['#e5534b', '#4e7cf6', '#f2c230'][(x - 3) / 4] }); K.block(x, 17); }
        K.add({ type: 'ia_jacuzzi', x: 20, y: 9 }); K.blockRect(20, 9, 3, 3);
        T.rest(L, { x: 20.7, y: 10.5, face: '+x', pose: 'sit', approach: [19, 10] }, '자쿠지');
        T.rest(L, { x: 22.3, y: 10.5, face: '-x', pose: 'sit', approach: [23, 10] }, '자쿠지');
        T.npc(L, '안전요원', { x: 17, y: 12.5, face: '-x' }, { hat: 'cap', accent: '#e5534b', say: '🏊 뛰지 마세요!' });
        K.add({ type: 'storageShelf', x: 24.4, y: 18.4, w: 3, seed: 1 }); K.blockRect(24, 18, 4, 1);
        K.add({ type: 'waterCooler', x: 18.3, y: 20.3 }); K.block(18, 20);
        for (const [x, y] of [[27, 8], [0, 21], [27, 15]]) { K.add({ type: 'ia_monstera', x, y, size: 1 }); K.block(x, y); }
        T.sign(L, 2.2, 8.4, '🏊 실내 수영장', '#1f9fb4'); T.sign(L, 19.6, 12.6, '♨️ 자쿠지', '#c47f22'); T.sign(L, 24.2, 20.2, '🧺 타월', '#6b5b4a', false);
      }
      // ---- 연회장 (+ 연회 주방)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 그랜드 연회장`, 'carpet', '#8a3a3a');
        L.desc = '연회 주방 · 그랜드 연회장(무대·샹들리에·원탁 5)';
        T.shell(L, K, { name: '🍳 연회 주방', color: '#c47f22' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'tile', color: '#e8e6df' });
        K.add({ type: 'kitchenLine', x: 0.4, y: 0.3, w: 8, kind: 'pot' }); K.blockRect(0, 0, 9, 1);
        K.add({ type: 'fridge', x: 9.6, y: 0.25 }); K.block(9, 0);
        T.npc(L, '총주방장', { x: 3, y: 1.7, face: '-y' }, { anim: 'type', hat: 'cap', accent: '#ffffff' });
        T.npc(L, '요리사', { x: 6, y: 1.7, face: '-y' }, { anim: 'type', hat: 'cap', accent: '#ffffff' });
        K.wallX(0, W, 7, { doors: [6, 20], h: 100, color: '#efe6d6' });
        L.patches.push({ x: 9, y: 7, w: 10, d: 2.4, style: 'ia_herring', color: '#b98c5e' });
        K.add({ type: 'ia_board', x: 9.5, y: 7, w: 9, kind: 'neon', text: '🎉 AI 신년 하례회', color: '#f6d58a', size: 11, z: 96, h: 26 });
        K.blockRect(9, 7, 10, 2);
        T.npc(L, '사회자', { x: 14, y: 8.2, face: '+y' }, { tie: '#d4a94a', accent: '#1a2238', say: '🥂 건배~!' });
        for (const [cx, cy, c] of [[5, 12, '#f2a7c3'], [23, 12, '#a8c8f0'], [14, 13, '#f6c445'], [10, 18, '#b8e0c0'], [18, 18, '#c9b9e8']]) k.banquet(L, K, cx, cy, c, '연회 원탁');
        K.add({ type: 'ia_chandelier', x: 8, y: 15, size: 1.2 }); K.add({ type: 'ia_chandelier', x: 20, y: 15, size: 1.2 });
        T.npc(L, '웨이터', { x: 7.5, y: 15.5, face: '+x' }, { carry: 'tray', tie: '#2b2622', accent: '#ffffff', patrol: [{ x: 7.5, y: 15.5, face: '+x' }, { x: 20.5, y: 15.5, face: '-x' }, { x: 14, y: 20.5, face: '-y' }] });
        for (const [x, y] of [[0, 21], [27, 21], [0, 8], [27, 8]]) { K.add({ type: 'ia_monstera', x, y, size: 0.9, pot: '#d4a94a' }); K.block(x, y); }
        T.sign(L, 0.3, H - 0.3, '🥂 그랜드 연회장', '#b8955f');
      }
      // ---- 스카이라운지 바
      {
        const { L, K } = k.roof('R 스카이라운지', 'deck', '#6b5040', '스카이라운지 바 · 라운지 소파 · 인피니티 풀 · 불멍');
        K.add({ type: 'ia_bar', x: 1, y: 5, w: 7 }); K.blockRect(1, 5, 7, 1);
        T.npc(L, '바텐더', { x: 4, y: 4.4, face: '+y' }, { anim: 'type', hat: 'shades', accent: '#2b2622', tie: '#d4a94a' });
        k.barStools(L, K, [1.6, 2.8, 4, 5.2, 6.4], 6.75, '스카이 바');
        k.sofa(L, K, 1, 11, '스카이라운지'); k.sofa(L, K, 6, 11, '스카이라운지');
        L.decals.push({ type: 'pool', x: 14, y: 16, w: 13, d: 5 }); K.blockRect(14, 16, 13, 5);
        for (const x of [16, 18, 20, 22, 24]) k.deck(L, K, x, 12, ['#f6d58a', '#ffffff', '#f6d58a', '#ffffff', '#f6d58a'][(x - 16) / 2], '인피니티 풀 선베드');
        K.add({ type: 'firePit', x: 5, y: 17 }); K.blockRect(4, 16, 2, 2);
        k.bean(L, K, 2, 19, '#d4a94a', '불멍'); k.bean(L, K, 6, 19, '#7a2232', '불멍');
        K.add({ type: 'stringLights', pts: [[0.5, 9], [12.5, 9], [12.5, 21.5]] }); for (const [x, y] of [[0, 9], [12, 9], [12, 21]]) K.block(x, y);
        T.npc(L, '웨이터', { x: 10, y: 14, face: '-x' }, { carry: 'tray', tie: '#2b2622', accent: '#ffffff', patrol: [{ x: 10, y: 14, face: '-x' }, { x: 3, y: 9, face: '-y' }, { x: 26, y: 14, face: '-x' }] });
        T.sign(L, 0.4, 7.8, '🍸 스카이 바', '#d4a94a'); T.sign(L, 14.2, 21.7, '🏊 인피니티 풀', '#1f9fb4'); T.sign(L, 0.4, 21.7, '🔥 불멍 라운지', '#c47f22');
      }
      return finish(T, fac);
    },
  });

  // ================================================================ 🏬 AI 백화점
  C.indoor({
    id: 'dept', icon: '🏬', name: 'AI 백화점', desc: 'B1 식품관 · 화장품·명품관 · 푸드코트·회전초밥 · 문화센터·키즈존 · 옥상 정원',
    build(S, o) {
      const W = 32, H = 20;
      const fac = {
        wall: '#f4ede2', texture: 'concrete', win: 'small', frame: '#c9a24a', winColor: 'rgba(255,236,210,0.8)', trim: '#2b2622',
        sign: '🏬 AI 백화점', signBg: '#2b2622', signFg: '#f6d58a', lobby: 'rgba(255,240,220,0.9)', awning: '#e2667f',
        paint(g, o) {
          const n = fac.n || 1;
          if (o.south) {
            const banners = [[0.12, '#e5534b', 'SALE', '~50%'], [0.42, '#2f6fb0', 'NEW', '시즌'], [0.72, '#2f9e5f', '식품관', 'B1']];
            for (const [fx, c, a, b] of banners) {
              const t1 = rowTop(o, Math.min(n - 1, o.k1 - 1)), x0 = o.Wpx * fx;
              const y0 = Math.max(0, (t1 ?? 0) + 6), y1 = (rowTop(o, Math.max(1, o.k0)) ?? o.Hb) + o.FP - 6;
              if (y1 - y0 < 30) continue;
              g.fillStyle = c; g.fillRect(x0, y0, 30, y1 - y0); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x0 + 3, y0, 2, y1 - y0);
              g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `bold 10px ${FONT}`; g.fillText(a, x0 + 15, y0 + 18); g.font = `bold 9px ${FONT}`; g.fillText(b, x0 + 15, y0 + 32); g.textAlign = 'left';
            }
          } else {
            const top = rowTop(o, Math.min(n - 1, o.k1 - 1)), bot = rowTop(o, Math.max(1, o.k0));
            if (top == null || bot == null) return;
            const y0 = top + 6, hh = Math.min(bot + o.FP - 10 - y0, o.FP * 3);
            if (hh < 30) return;
            const x0 = 24, w = o.Wpx - 48;
            g.fillStyle = '#1d1d24'; g.fillRect(x0 - 3, y0 - 3, w + 6, hh + 6);
            const gr = g.createLinearGradient(x0, y0, x0 + w, y0 + hh); gr.addColorStop(0, '#ff6fa8'); gr.addColorStop(0.5, '#ffb35c'); gr.addColorStop(1, '#6fb8ff'); g.fillStyle = gr; g.fillRect(x0, y0, w, hh);
            g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x0 + ((o.t * 50) % (w + 60)) - 40, y0, 22, hh);
            g.fillStyle = '#fff'; g.font = `bold 18px ${FONT}`; g.fillText('AI SUMMER SALE', x0 + 14, y0 + hh / 2 + 2); g.font = `9px ${FONT}`; g.fillText('🛍️ 전 층 최대 50% · 사은품 증정', x0 + 14, y0 + hh / 2 + 18);
          }
        },
      };
      const T = C.tower(S, { W, H, id: 'dept', name: '🏬 AI 백화점', facade: fac });
      const k = kit(T), CX = T.CX;

      // ---- B1 식품관
      {
        const { L, K } = T.level('B1 식품관', 'tile', '#f1ede4', 'office', { basement: true });
        L.desc = '정육·수산 · 신선식품 · 청과 · 베이커리 · 즉석 튀김 · 계산대';
        T.shell(L, K, { name: '🥩 정육·수산', color: '#c0392b' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'tile', color: '#f4eded' });
        K.add({ type: 'fridgeCase', x: 0.4, y: 0.1, w: 7 }); K.blockRect(0, 0, 8, 1);
        K.add({ type: 'till', x: 3, y: 2.6, w: 5, label: '🥩 한우 · 🐟 활어', color: '#f4f1ec' }); K.blockRect(3, 2, 5, 1);
        T.npc(L, '정육 코너', { x: 4.5, y: 1.8, face: '+y' }, { anim: 'type', hat: 'cap', accent: '#c0392b' });
        K.add({ type: 'aquarium', x: 9.4, y: 0.3, w: 3 }); K.blockRect(9, 0, 4, 1);
        for (const y of [8, 11, 14]) { K.add({ type: 'storeShelf', x: 1, y, w: 6, seed: y * 7 }); K.blockRect(1, y, 6, 1); }
        K.add({ type: 'fridgeCase', x: 8.4, y: 7.1, w: 6 }); K.blockRect(8, 7, 7, 1);
        K.add({ type: 'veggies', x: 9, y: 10.5, w: 4, d: 1.5, seed: 4 }); K.blockRect(9, 10, 4, 2);
        K.add({ type: 'breadCase', x: 16, y: 9, w: 5 }); K.blockRect(16, 9, 5, 1);
        K.add({ type: 'pizzaOven', x: 18.4, y: 7.2 }); K.blockRect(18, 7, 2, 1);
        T.npc(L, '제빵사', { x: 17, y: 8.3, face: '+y' }, { anim: 'type', hat: 'cap', accent: '#c47f22' });
        k.stand(L, 10, 13.6, '-y', '시식 코너', 'icecream'); k.stand(L, 12, 13.6, '-y', '시식 코너'); k.stand(L, 17.5, 10.6, '-y', '베이커리', 'icecream');
        K.add({ type: 'till', x: 1, y: 17.4, w: 3, label: '계산대 1' }); K.blockRect(1, 17, 3, 1);
        K.add({ type: 'till', x: 5.5, y: 17.4, w: 3, label: '계산대 2' }); K.blockRect(5, 17, 4, 1);
        T.npc(L, '계산원', { x: 2.5, y: 16.7, face: '+y' }, { anim: 'type', hat: 'bow', accent: '#2f9e5f' });
        T.npc(L, '계산원', { x: 7, y: 16.7, face: '+y' }, { anim: 'type', hat: 'bow', accent: '#2f9e5f' });
        K.add({ type: 'kitchenLine', x: 24.4, y: 7.3, w: 6, kind: 'fry' }); K.blockRect(24, 7, 7, 1);
        T.npc(L, '튀김 장인', { x: 27, y: 8.5, face: '-y' }, { anim: 'type', hat: 'cap', accent: '#e9a23b' });
        for (const [x, y] of [[25, 12], [29, 12], [27, 16]]) k.table(L, K, x, y, '즉석 코너', '#ffffff', '#e9a23b');
        K.add({ type: 'basket', x: 13.5, y: 18.5 }); K.block(13, 18);
        K.add({ type: 'basket', x: 14.5, y: 18.6 }); K.block(14, 18);
        T.sign(L, 1, 7.6, '🥫 신선·가공식품', '#2f9e5f'); T.sign(L, 9, 12.3, '🍎 청과', '#c0392b', false); T.sign(L, 16, 10.3, '🥐 베이커리', '#c47f22'); T.sign(L, 24.4, 9.6, '🍗 즉석 튀김', '#e9a23b'); T.sign(L, 0.4, H - 0.3, '🛒 계산대', '#2f9e5f');
      }
      // ---- 1F 화장품 · 명품관
      {
        T.nextFloor();
        const { L, K } = T.level('1F 화장품·명품관', 'ia_terrazzo', '#f6f1ea');
        L.desc = '고객센터 · 화장품 · 향수 · 명품 부티크 · 에스컬레이터';
        T.shell(L, K, { name: '🛍️ 고객센터', color: '#e2667f' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'carpet', color: '#efe0e6' });
        const dir = { type: 'ia_board', x: 0.5, y: 0, w: 6, kind: 'map', title: '🏬 층별 안내', z: 86, h: 44, lines: [] }; K.add(dir);
        K.add({ type: 'reception', x: 8, y: 2, w: 5 }); K.blockRect(8, 2, 5, 1);
        T.npc(L, '고객센터', { x: 10.5, y: 1.4, face: '+y' }, { anim: 'type', hat: 'bow', accent: '#e2667f' });
        T.entrance(L, K, { turnstiles: false });
        [[2, 9, '#f2a7c3', 'BEAUTÉ'], [2, 13, '#a8c8f0', 'AQUA'], [11, 14, '#f6d58a', 'PARFUM']].forEach(([x, y, c, brand]) => {
          K.add({ type: 'ia_cosmetic', x, y, w: 4, color: c, brand }); K.blockRect(x, y, 4, 1);
          T.npc(L, '뷰티 어드바이저', { x: x + 2, y: y - 0.6, face: '+y' }, { hat: 'bow', accent: c });
          k.stand(L, x + 1, y + 1.4, '-y', '화장품 코너', null); k.stand(L, x + 3, y + 1.4, '-y', '화장품 코너', null);
        });
        K.add({ type: 'ia_escalator', x: 9, y: 7.9 }); K.blockRect(9, 7, 2, 5);
        K.add({ type: 'ia_bagShelf', x: 22.4, y: 7.2, w: 4, color: '#2b2622' }); K.blockRect(22, 7, 5, 1);
        K.add({ type: 'ia_bagShelf', x: 27, y: 7.2, w: 4, color: '#7a2232' }); K.blockRect(27, 7, 4, 1);
        for (const [x, c, bag] of [[23, '#2b2622', '#c47f22'], [25, '#e5534b', '#2b2622'], [27, '#f6efd8', '#7a2232'], [29, '#4e7cf6', '#f2c230']]) { K.add({ type: 'ia_mannequin', x, y: 10, color: c, bag }); K.block(x, 10); }
        L.decals.push({ type: 'floor', x: 21.6, y: 7, w: 10.4, d: 5, color: 'rgba(43,38,34,0.08)' });
        k.bench(L, K, 27, 15, 4, '쇼핑 쉼터', '#2b2622');
        T.visitorSofa(L, K, 20, 16);
        K.add({ type: 'ia_monstera', x: 13, y: 9, size: 1 }); K.block(13, 9);
        k.plant(K, 0, 19, 1.1, 2); k.plant(K, 31, 19, 1.1, 9);
        T.npc(L, '도어걸', { x: 13.5, y: 18.5, face: '+y' }, { hat: 'bow', accent: '#e2667f', say: '어서 오세요~' });
        T.sign(L, 22, 12.3, '👜 명품 부티크', '#2b2622'); T.sign(L, 9, 12.6, '⬆️ 에스컬레이터', '#3fb27f', false); T.sign(L, 1.6, 16.6, '💄 화장품', '#e2667f');
        T._dir = dir;
      }
      k.work(o, {
        name: (n) => `${n}F MD 오피스`, looks: [['ia_terrazzo', '#efe9e0'], ['carpet', '#e6dde8']],
        deco(L, K, n) {
          L.desc = 'MD·바이어 오피스 · ' + L.desc;
          K.add({ type: 'ia_mannequin', x: 11, y: H - 2, color: COLORS[n % 7] }); K.block(11, H - 2);
          K.add({ type: 'ia_mannequin', x: 12, y: H - 2, color: COLORS[(n + 2) % 7] }); K.block(12, H - 2);
          K.add({ type: 'ia_clothesRack', x: 13.3, y: H - 1.9, w: 3 }); K.blockRect(13, H - 2, 4, 1);
          T.sign(L, 11.2, H - 0.3, `🛍️ ${n}F MD 오피스`, '#e2667f');
        },
      });
      // ---- 푸드코트 (+ 회전초밥)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 푸드코트`, 'tile', '#f3ecdc', 'office');
        L.desc = '회전초밥 · 푸드코트(한식·치킨·분식·음료) · 테이블 10 · 라운지';
        T.shell(L, K, { name: '🍣 회전초밥', color: '#1f9fb4' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'wood', color: '#e2cfae' });
        K.add({ type: 'sushiBelt', x: 1, y: 1.2, w: 12 }); K.blockRect(1, 1, 12, 2);
        T.npc(L, '초밥 장인', { x: 6, y: 0.6, face: '+y' }, { anim: 'type', hat: 'cap', accent: '#ffffff' });
        k.stools(L, K, [2, 3.6, 5.2, 6.8, 8.4, 10, 11.6], 3.4, '-y', '회전초밥', '#a87a52');
        K.wallX(0, W, 7, { doors: [6, 13, 19, 25], h: 100, color: '#efe9df' });
        [[0.4, 'pot', '🍲 한식', ['🍲 된장찌개', '🍚 비빔밥', '🥘 불고기']], [7.4, 'fry', '🍗 치킨', ['🍗 후라이드', '🌶️ 양념', '🍺 생맥']], [14.4, 'pot', '🍜 분식', ['🍢 떡볶이', '🍙 김밥', '🥟 만두']]].forEach(([x, kind, name, items], i) => {
          const w = i === 2 ? 4.4 : 5;
          K.add({ type: 'kitchenLine', x, y: 8.3, w, kind }); K.blockRect(Math.floor(x), 8, Math.ceil(w), 1);
          K.add({ type: 'menuWall', x, y: 7, w, items });
          T.npc(L, `${name} 요리사`, { x: x + w / 2, y: 7.55, face: '+y' }, { anim: 'type', hat: 'cap', accent: '#ffffff' });
        });
        K.add({ type: 'cafeCounter', x: 20.4, y: 8.2, w: 4 }); K.blockRect(20, 8, 5, 1);
        T.npc(L, '바리스타', { x: 22.4, y: 7.6, face: '+y' }, { anim: 'type', hat: 'beret', accent: '#7a4a2a' });
        K.add({ type: 'ia_board', x: 26, y: 7, w: 5.5, kind: 'neon', text: '🍔 FOOD COURT', color: '#ff9a3c', size: 9, z: 90, h: 22 });
        for (const x of [2, 6, 10, 14, 18]) k.table(L, K, x, 12, '푸드코트', '#ffffff', ['#e5534b', '#f2c230', '#4e9cf6', '#3fb27f', '#a67be0'][x % 5]);
        for (const x of [4, 8, 12, 16, 20]) k.table(L, K, x, 16, '푸드코트', '#ffffff', ['#e5534b', '#f2c230', '#4e9cf6', '#3fb27f', '#a67be0'][x % 5]);
        k.sofa(L, K, 25, 12, '푸드코트 라운지'); k.sofa(L, K, 25, 16, '푸드코트 라운지');
        K.add({ type: 'storageShelf', x: 28.4, y: 18.3, w: 3, seed: 3 }); K.blockRect(28, 18, 4, 1);
        T.npc(L, '홀 서빙', { x: 12, y: 14, face: '+x' }, { carry: 'tray', hat: 'cap', accent: '#e5534b', patrol: [{ x: 12, y: 14, face: '+x' }, { x: 22, y: 14, face: '-x' }, { x: 3, y: 18.5, face: '+x' }] });
        T.sign(L, 0.3, H - 0.3, '🍽️ 푸드코트', '#c47f22'); T.sign(L, 28.2, 20 - 2.3, '식판 반납', '#7a5540', false);
      }
      // ---- 문화센터 · 키즈존 (+ 공방)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 문화센터·키즈존`, 'carpet', '#f3e3c8');
        L.desc = '공방 클래스 · 문화센터(요가·쿠킹) · 키즈존(볼풀·트램펄린·장난감)';
        T.shell(L, K, { name: '🎨 공방 클래스', color: '#a67be0' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'wood', color: '#e6d6bd' });
        for (const [x, s] of [[1.5, 3], [5, 5], [8.5, 7], [12, 9]]) { K.add({ type: 'canvasEasel', x, y: 1.2, seed: s }); K.block(Math.floor(x), 1); }
        k.stools(L, K, [1.5, 5, 8.5, 12], 2.9, '-y', '공방 클래스', '#a67be0');
        T.npc(L, '공방 강사', { x: 15, y: 2.5, face: '-x' }, { hat: 'beret', accent: '#a67be0', anim: 'think' });
        K.wallX(0, W, 7, { doors: [3, 20], h: 90, color: '#efe6d6' });
        K.wallY(7, H, 16, { h: 90, color: '#efe6d6' });
        L.patches.push({ x: 0, y: 7, w: 16, d: H - 7, style: 'wood', color: '#e6cfa8' });
        K.add({ type: 'ia_board', x: 5, y: 7, w: 6, kind: 'white', lines: ['🧘 요가 10:00', '🍰 베이킹 14:00', '🎸 통기타 19:00'], z: 72, h: 30 });
        T.npc(L, '요가 강사', { x: 7.5, y: 8.8, face: '+y' }, { accent: '#3fb27f', anim: 'think', say: '숨 들이쉬고~' });
        [2, 4.5, 7, 9.5, 12].forEach((x, i) => { L.decals.push({ type: 'mat', x, y: 10.5, w: 1.3, d: 2.4, color: COLORS[i] }); T.rest(L, { x: x + 0.65, y: 11.7, face: '-y', pose: 'sit' }, '요가 클래스'); });
        K.add({ type: 'kitchenLine', x: 2, y: 16, w: 6, kind: 'pot' }); K.blockRect(2, 16, 6, 1);
        k.stand(L, 3.5, 17.6, '-y', '쿠킹 클래스', null); k.stand(L, 6, 17.6, '-y', '쿠킹 클래스', null);
        T.sign(L, 0.3, H - 0.3, '🧘 문화센터', '#3fb27f');
        L.patches.push({ x: 16, y: 7, w: W - 16, d: H - 7, style: 'carpet', color: '#fbe7b5' });
        K.add({ type: 'ia_board', x: 16.5, y: 7, w: 3.2, kind: 'kids', text: '🧸 키즈 존', z: 72, h: 26 });
        K.add({ type: 'ia_ballPit', x: 18, y: 9, w: 5, d: 4 }); K.blockRect(18, 9, 5, 4);
        T.rest(L, { x: 19, y: 10.6, face: '+x', pose: 'sit', approach: [17, 10] }, '볼풀'); T.rest(L, { x: 21.6, y: 11.6, face: '-x', pose: 'sit', approach: [23, 11] }, '볼풀');
        K.add({ type: 'trampoline', x: 27.5, y: 10.5 }); K.blockRect(26, 9, 3, 3);
        K.add({ type: 'toyBlocks', x: 25, y: 15, seed: 3 }); K.block(25, 15);
        K.add({ type: 'toyBlocks', x: 28, y: 14, seed: 8 }); K.block(28, 14);
        for (const [x, c] of [[18, '#e2667f'], [20, '#4e9cf6'], [22, '#f6c445']]) k.bean(L, K, x, 17, c, '키즈존 빈백');
        T.npc(L, '보육 선생님', { x: 24, y: 13, face: '-x' }, { hat: 'bow', accent: '#f2a7c3', patrol: [{ x: 24, y: 13, face: '-x' }, { x: 17, y: 15, face: '+x' }, { x: 29, y: 17, face: '-x' }] });
        T.sign(L, 16.3, H - 0.3, '🧸 키즈존', '#e5534b');
      }
      // ---- 옥상 정원
      {
        const { L, K } = k.roof('R 옥상 정원', 'deck', '#c9a57a', '옥상 정원 · 연못·잉어 · 파라솔 · 벤치');
        L.patches.push({ x: 0, y: 3, w: CX, d: H - 3, style: 'grass', color: '#a6d28b' });
        const cx = 7, cy = 12, rx = 3, ry = 2.2;
        L.decals.push({ type: 'pond', cx, cy, rx, ry });
        for (let i = Math.floor(cx - rx); i <= cx + rx; i++) for (let j = Math.floor(cy - ry); j <= cy + ry; j++) if (((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 < 1) K.block(i, j);
        K.add({ type: 'koi', x: 6.4, y: 11.8, seed: 2 }); K.add({ type: 'koi', x: 7.8, y: 12.4, seed: 5 });
        for (const [x, y, b] of [[1, 4, false], [12, 5, true], [1, 18, true], [14, 18, false]]) k.tree(K, x, y, b);
        for (const [x, y, c] of [[3, 7, '#f07a8a'], [11, 9, '#f6c445'], [3, 16, '#b38cf0'], [11, 15, '#ffffff']]) { K.add({ type: 'flowerBush', x: x + 0.5, y: y + 0.5, size: 1, seed: x * 3 + y, color: c }); K.block(x, y); }
        k.bench(L, K, 4, 17, 4, '연못 벤치'); k.bench(L, K, 9, 17, 4, '연못 벤치');
        for (const [x, y, c] of [[19, 6, '#e5534b'], [24, 6, '#f2c230'], [19, 11, '#4e9cf6'], [24, 11, '#e2667f'], [28, 9, '#3fb27f']]) k.parasol(L, K, x, y, c, '옥상 카페');
        for (const x of [18.4, 21, 23.6, 26.2]) { K.add({ type: 'planter', x, y: H - 0.9, w: 2.2, seed: x * 3 }); K.blockRect(Math.floor(x), H - 1, 3, 1); }
        K.add({ type: 'stringLights', pts: [[17.5, 4], [30.5, 4], [30.5, 15]] }); for (const [x, y] of [[17, 4], [30, 4], [30, 15]]) K.block(x, y);
        T.npc(L, '정원사', { x: 15, y: 9, face: '-x' }, { hat: 'bucket', accent: '#3f8a45', carry: 'box', patrol: [{ x: 15, y: 9, face: '-x' }, { x: 2, y: 14, face: '+x' }, { x: 16, y: 16, face: '-y' }] });
        T.sign(L, 0.4, H - 0.4, '🌿 옥상 정원', '#3f8a45'); T.sign(L, 18.2, 15.6, '☕ 옥상 카페', '#7a4a2a');
      }
      T._dir.lines = T.levels.slice().reverse().slice(0, 7).map((L) => L.name);
      return finish(T, fac);
    },
  });

  // ================================================================ 📚 AI 도서관
  C.indoor({
    id: 'library', icon: '📚', name: 'AI 도서관', desc: '대출대 로비 · 연구 열람실 · 종합자료실(서가) · 디지털자료실·북카페 · 고서 보존실 · 옥상 독서정원',
    build(S, o) {
      const W = 28, H = 20;
      const fac = {
        wall: '#e8dcc0', texture: 'concrete', win: 'arch', frame: '#8a6247', winColor: 'rgba(255,240,200,0.78)', trim: '#8a6247',
        sign: '📚 AI 도서관 LIBRARY', signBg: '#4a2c1a', signFg: '#f6d58a', lobby: 'rgba(255,235,200,0.85)',
        paint(g, o) {
          g.fillStyle = 'rgba(255,255,255,0.28)';
          for (let x = 4 * 32; x < o.Wpx - 8; x += 4 * 32) g.fillRect(x - 5, 0, 10, o.Hb);
          g.fillStyle = 'rgba(138,98,71,0.25)';
          for (let x = 4 * 32; x < o.Wpx - 8; x += 4 * 32) g.fillRect(x + 4, 0, 1.5, o.Hb);
          const top = rowTop(o, (fac.n || 1) - 1);
          if (top == null) return;
          const cx = o.south ? o.Wpx / 2 : o.Wpx / 2, cy = top + o.FP / 2;
          g.fillStyle = '#4a2c1a'; roundRect(g, cx - 34, cy - 20, 68, 40, 6); g.fill();
          if (o.south) {
            g.fillStyle = '#f6efd8'; g.beginPath(); g.moveTo(cx, cy - 8); g.quadraticCurveTo(cx - 12, cy - 14, cx - 24, cy - 10); g.lineTo(cx - 24, cy + 10); g.quadraticCurveTo(cx - 12, cy + 6, cx, cy + 12); g.quadraticCurveTo(cx + 12, cy + 6, cx + 24, cy + 10); g.lineTo(cx + 24, cy - 10); g.quadraticCurveTo(cx + 12, cy - 14, cx, cy - 8); g.fill();
            g.strokeStyle = '#c9a24a'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy - 8); g.lineTo(cx, cy + 12); g.stroke();
            g.fillStyle = 'rgba(74,44,26,0.5)'; for (let i = 0; i < 4; i++) { g.fillRect(cx - 20, cy - 5 + i * 4, 15, 1); g.fillRect(cx + 5, cy - 5 + i * 4, 15, 1); }
          } else { g.fillStyle = '#f6d58a'; g.font = `bold 13px ${FONT}`; g.textAlign = 'center'; g.fillText('知 · 書', cx, cy + 5); g.textAlign = 'left'; }
        },
      };
      const T = C.tower(S, { W, H, id: 'library', name: '📚 AI 도서관', facade: fac });
      const k = kit(T), CX = T.CX;

      // ---- 1F 로비 · 대출대
      {
        T.nextFloor();
        const { L, K } = T.level('1F 로비·대출대', 'ia_herring', '#c99a6a');
        L.desc = '대출·반납 · 신간 코너 · 목록함 · 상호대차실';
        T.shell(L, K, { name: '📦 상호대차실', color: '#7a5540' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'carpet', color: '#d9cbb0' });
        K.add({ type: 'parcelShelf', x: 0.4, y: 0.3, w: 5, seed: 4 }); K.blockRect(0, 0, 6, 1);
        for (const x of [3, 6]) { K.add({ type: 'ia_bookCart', x, y: 2.2 }); K.block(x, 2); }
        T.npc(L, '사서 보조', { x: 9, y: 2.5, face: '-x' }, { anim: 'type', accent: '#7a5540', carry: 'box', patrol: [{ x: 9, y: 2.5, face: '-x' }, { x: 11, y: 6, face: '+x' }, { x: 3, y: 6, face: '+x' }] });
        T.entrance(L, K);
        K.add({ type: 'ia_board', x: 2, y: 5, w: 4.4, kind: 'cork', title: '📢 이달의 행사', z: 42, h: 26 });
        K.add({ type: 'till', x: 18.4, y: 9, w: 4, label: '📚 대출·반납', color: '#e6d6bd' }); K.blockRect(18, 9, 5, 1);
        T.npc(L, '사서', { x: 19.5, y: 8.3, face: '+y' }, { anim: 'type', hat: 'bow', accent: '#7a5540' });
        T.npc(L, '사서', { x: 21.5, y: 8.3, face: '+y' }, { anim: 'type', accent: '#2f6b3a' });
        for (const x of [24.2, 25.4]) K.add({ type: 'ia_cardCatalog', x, y: 7.3 });
        K.blockRect(24, 7, 3, 1);
        for (const y of [9, 12]) { K.add({ type: 'bookStack', x: 1, y, w: 5, seed: y * 3 }); K.blockRect(1, y, 5, 1); }
        k.bench(L, K, 1, 15, 4, '로비 벤치', '#8a6247');
        K.add({ type: 'ia_bookCart', x: 8, y: 10 }); K.block(8, 10);
        K.add({ type: 'ia_globe', x: 9, y: 13 }); K.block(9, 13);
        T.visitorSofa(L, K, 19, 15);
        k.plant(K, 0, 19, 1.1, 2); k.plant(K, 27, 19, 1.1, 6); k.plant(K, 27, 9, 1, 4);
        T.npc(L, '경비', { x: 14.5, y: 17.5, face: '+y' }, { hat: 'police', patrol: [{ x: 14.5, y: 17.5, face: '+y' }, { x: 4, y: 6, face: '+x' }, { x: 24, y: 6, face: '-x' }] });
        T.sign(L, 1.2, 13.6, '🆕 신간 코너', '#2f6b3a'); T.sign(L, 18.4, 10.4, '📚 대출·반납', '#7a5540'); T.sign(L, 23.8, 8.6, '🗂️ 목록함', '#7a5540', false);
      }
      k.work(o, {
        name: (n) => `${n}F 연구 열람실`, looks: [['carpet', '#cfd8c8'], ['ia_herring', '#d4b48a']],
        deco(L, K, n) {
          L.desc = '연구 열람실 · ' + L.desc;
          K.add({ type: 'ia_bookCart', x: 11, y: H - 2 }); K.block(11, H - 2);
          K.add({ type: 'ia_globe', x: 13, y: H - 2 }); K.block(13, H - 2);
          T.sign(L, 11.2, H - 0.3, `📖 ${n}F 연구 열람실`, '#7a5540');
        },
      });
      // ---- 종합자료실 (서가)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 종합자료실`, 'carpet', '#c9d2c0');
        L.desc = '정기간행물실 · 서가(000~900) · 열람 테이블 12석';
        T.shell(L, K, { name: '📰 정기간행물실', color: '#2f6b3a', glass: true });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'carpet', color: '#d8d2bf' });
        K.add({ type: 'storageShelf', x: 0.4, y: 0.3, w: 5, seed: 12 }); K.blockRect(0, 0, 6, 1);
        K.add({ type: 'readingTable', x: 1.5, y: 2.1, w: 6 }); K.blockRect(1, 2, 7, 1);
        k.chairs(L, K, [[2.3, 3.75, '-y'], [4.2, 3.75, '-y'], [6.1, 3.75, '-y']], '정기간행물');
        K.add({ type: 'bookshelf', x: 9.4, y: 0.3, w: 2.2, seed: 3 }); K.blockRect(9, 0, 3, 1);
        ['000~200 총류·철학·종교', '300~500 사회·과학', '600~800 기술·예술·문학', '900 역사·지리'].forEach((label, i) => {
          const y = 8 + i * 3;
          K.add({ type: 'bookStack', x: 1, y, w: 10, seed: y * 7 }); K.blockRect(1, y, 10, 1);
          T.sign(L, 1.1, y + 1.6, `📚 ${label}`, '#2f6b3a', false);
        });
        for (const ty of [9, 14]) {
          K.add({ type: 'readingTable', x: 14, y: ty, w: 6 }); K.blockRect(14, ty, 6, 1);
          k.chairs(L, K, [15, 16.8, 18.6].flatMap((x) => [[x, ty - 0.55, '+y'], [x, ty + 1.75, '-y']]), '열람석');
        }
        for (const x of [21.4, 24]) K.add({ type: 'bookshelf', x, y: 7.2, w: 2.2, seed: x * 5 });
        K.blockRect(21, 7, 6, 1);
        for (const y of [11, 15]) { K.add({ type: 'bookStack', x: 22, y, w: 5, seed: y * 11 }); K.blockRect(22, y, 5, 1); }
        K.add({ type: 'ia_bookCart', x: 20, y: 18 }); K.block(20, 18);
        k.plant(K, 27, 19, 1, 9);
        T.npc(L, '사서', { x: 11.5, y: 9.5, face: '-x' }, { carry: 'box', hat: 'bow', accent: '#2f6b3a', patrol: [{ x: 11.5, y: 9.5, face: '-x' }, { x: 11.5, y: 15.5, face: '-x' }, { x: 21, y: 13, face: '+x' }] });
        T.sign(L, 0.3, H - 0.3, '📚 종합자료실 (서가)', '#2f6b3a'); T.sign(L, 14.2, H - 0.3, '📖 열람석', '#7a5540');
      }
      // ---- 디지털자료실 · 북카페
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 디지털자료실·북카페`, 'carpet', '#d6dde6');
        L.desc = '멀티미디어실 · 디지털자료실(PC 10대) · 북카페(소파·빈백)';
        T.shell(L, K, { name: '🎧 멀티미디어실', color: '#4e7cf6' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'carpet', color: '#cfd8e6' });
        for (const x of [1, 4, 7]) { K.add({ type: 'pcStation', x, y: 0.3 }); K.blockRect(x, 0, 2, 1); k.chairs(L, K, [[x + 0.8, 1.75, '-y']], '멀티미디어실'); }
        K.wallX(0, 14, 7, { glass: true, doors: [3], h: 70 }); K.wallX(14, W, 7, { doors: [18], h: 90, color: '#e6d6bd' }); K.wallY(7, H, 14, { h: 80 });
        L.patches.push({ x: 0, y: 7, w: 14, d: H - 7, style: 'carpet', color: '#dbe3ee' });
        for (const ry of [9, 13]) for (const x of [1, 3.5, 6, 8.5, 11]) { K.add({ type: 'pcStation', x, y: ry }); K.blockRect(Math.floor(x), ry, 2, 1); k.chairs(L, K, [[x + 0.8, ry + 1.45, '-y']], '디지털자료실'); }
        K.add({ type: 'printer', x: 12.4, y: 18 }); K.blockRect(12, 18, 2, 1);
        T.npc(L, '디지털 사서', { x: 6, y: 17, face: '-y' }, { hat: 'headphones', accent: '#4e7cf6', patrol: [{ x: 6, y: 17, face: '-y' }, { x: 1, y: 12, face: '+x' }, { x: 12, y: 16, face: '-x' }] });
        T.sign(L, 0.3, H - 0.3, '💻 디지털자료실', '#4e7cf6');
        L.patches.push({ x: 14, y: 7, w: W - 14, d: H - 7, style: 'wood', color: '#d9b98f' });
        K.add({ type: 'ia_board', x: 14.4, y: 7, w: 3.3, kind: 'chalk', lines: ['☕ 아메리카노 2,000', '🍰 치즈케이크 3,500', '📖 책과 함께 쉬어가요'], z: 74, h: 30 });
        K.add({ type: 'cafeCounter', x: 21, y: 8.2, w: 5 }); K.blockRect(21, 8, 5, 1);
        T.npc(L, '바리스타', { x: 23, y: 7.6, face: '+y' }, { anim: 'type', hat: 'beret', accent: '#7a4a2a' });
        K.add({ type: 'bookshelf', x: 26.2, y: 7.2, w: 1.6, seed: 5 }); K.blockRect(26, 7, 2, 1);
        k.sofa(L, K, 15, 12, '북카페 소파');
        k.table(L, K, 21, 12, '북카페', '#ffffff', '#a87a52'); k.table(L, K, 25, 12, '북카페', '#ffffff', '#a87a52'); k.table(L, K, 23, 16, '북카페', '#ffffff', '#a87a52');
        k.bean(L, K, 15, 17, '#e2667f', '북카페 빈백'); k.bean(L, K, 17, 17, '#4e9cf6', '북카페 빈백');
        k.plant(K, 27, 19, 1, 3);
        T.sign(L, 14.3, H - 0.3, '☕ 북카페', '#7a4a2a');
      }
      // ---- 고서 보존실
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 고서 보존실`, 'ia_herring', '#8a6247');
        L.desc = '보존처리실 · 고서 보존 서고(항온·항습 진열장) · 고서 열람석 · 서재';
        T.shell(L, K, { name: '🧪 보존처리실', color: '#7a5540' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'tile', color: '#e8e2d6' });
        K.add({ type: 'labBench', x: 0.5, y: 0.3, w: 5 }); K.blockRect(0, 0, 6, 1);
        K.add({ type: 'drafting', x: 7, y: 1 }); K.blockRect(7, 1, 2, 1);
        K.add({ type: 'airCon', x: 10.5, y: 0.4 }); K.block(10, 0);
        T.npc(L, '보존처리 연구원', { x: 3, y: 1.6, face: '-y' }, { anim: 'type', hat: 'beret', accent: '#7a5540' });
        K.wallX(0, W, 7, { doors: [6], h: 100, color: '#d9c8a4' });
        K.add({ type: 'vaultDoor', x: 4.6, y: 7 });
        L.patches.push({ x: 0, y: 7, w: W, d: H - 7, style: 'ia_herring', color: '#7a5a3e' });
        for (const x of [9.4, 12, 14.6, 17.2, 19.8, 22.4, 25]) K.add({ type: 'bookshelf', x, y: 7.2, w: 2.2, seed: Math.round(x * 3) });
        K.blockRect(9, 7, 19, 1);
        for (const y of [10, 13, 16]) { K.add({ type: 'ia_archive', x: 1, y, w: 5 }); K.blockRect(1, y, 5, 1); }
        K.add({ type: 'readingTable', x: 9, y: 11, w: 5 }); K.blockRect(9, 11, 5, 1);
        k.chairs(L, K, [[10, 10.45, '+y'], [12, 10.45, '+y'], [10, 12.75, '-y'], [12, 12.75, '-y']], '고서 열람', true);
        K.add({ type: 'ia_archive', x: 9, y: 16, w: 5 }); K.blockRect(9, 16, 5, 1);
        L.decals.push({ type: 'ia_roundRug', cx: 22.5, cy: 13.5, r: 2.6, color: '#2f4f3a', border: '#c9a24a' });
        K.add({ type: 'roundTable', x: 22.5, y: 13.5, r: 0.5, color: '#7a5540' }); K.block(22, 13);
        k.chairs(L, K, [[21.3, 13.5, '+x'], [23.7, 13.5, '-x'], [22.5, 12.3, '+y'], [22.5, 14.7, '-y']], '고서 서재', true);
        K.add({ type: 'ia_globe', x: 25, y: 10 }); K.block(25, 10);
        k.lamp(L, K, 19, 10); k.lamp(L, K, 26, 17);
        K.add({ type: 'airCon', x: 27.2, y: 18.4 }); K.block(27, 18);
        K.add({ type: 'ia_cardCatalog', x: 16, y: 18.3 }); K.blockRect(16, 18, 2, 1);
        T.npc(L, '고문서 학예사', { x: 15, y: 13.5, face: '-x' }, { anim: 'think', hat: 'beret', accent: '#4a2c1a', carry: 'paper', patrol: [{ x: 15, y: 13.5, face: '-x' }, { x: 7, y: 14.5, face: '-x' }, { x: 20, y: 17, face: '-y' }] });
        T.sign(L, 0.3, H - 0.3, '📜 고서 보존 서고 (항온 18° · 항습 45%)', '#c9a24a'); T.sign(L, 20, 16.6, '🪑 서재', '#c9a24a', false);
      }
      // ---- 옥상 독서정원
      {
        const { L, K } = k.roof('R 옥상 독서정원', 'grass', '#a6d28b', '옥상 독서정원 · 퍼걸러 벤치 · 해먹 · 빈백 · 피크닉 테이블 · 작은 도서관');
        L.patches.push({ x: 0, y: 3, w: W, d: 1, style: 'deck', color: '#c9a57a' });
        K.add({ type: 'pergola', x: 1, y: 4, w: 10, d: 2 });
        k.bench(L, K, 2, 5, 4, '퍼걸러 벤치', '#8a6247'); k.bench(L, K, 7, 5, 4, '퍼걸러 벤치', '#8a6247');
        for (const x of [15, 20]) { K.add({ type: 'hammock', x, y: 8 }); K.block(x, 8); K.block(x + 2, 8); T.rest(L, { x: x + 1.3, y: 8.1, face: '+y', pose: 'sofa', approach: [x + 1, 9] }, '해먹 독서'); }
        K.add({ type: 'picnicTable', x: 2, y: 11 }); K.blockRect(2, 10, 3, 4);
        for (const [x, y, face, ap] of [[2.8, 10.75, '+y', [2, 9]], [4.2, 10.75, '+y', [4, 9]], [2.8, 13.25, '-y', [2, 14]], [4.2, 13.25, '-y', [4, 14]]]) T.rest(L, { x, y, face, pose: 'sit', approach: ap }, '피크닉 테이블');
        for (const [x, y, c] of [[8, 12, '#e2667f'], [10, 12, '#4e9cf6'], [8, 15, '#f6c445'], [10, 15, '#3fb27f']]) k.bean(L, K, x, y, c, '빈백 독서');
        K.add({ type: 'ia_bookCart', x: 6, y: 17 }); K.block(6, 17);
        for (const [x, y, b] of [[12, 4, true], [0, 17, false], [12, 18, true], [26, 5, false], [26, 17, true]]) k.tree(K, x, y, b);
        for (const [x, y, c] of [[18, 13, '#f07a8a'], [22, 14, '#f6c445'], [16, 17, '#b38cf0']]) { K.add({ type: 'flowerBush', x: x + 0.5, y: y + 0.5, size: 1, seed: x + y, color: c }); K.block(x, y); }
        k.bench(L, K, 19, 17, 4, '정원 벤치', '#8a6247');
        K.add({ type: 'stringLights', pts: [[14.5, 5.5], [25.5, 5.5], [25.5, 11.5]] }); for (const [x, y] of [[14, 5], [25, 5], [25, 11]]) K.block(x, y);
        T.npc(L, '독서 모임 리더', { x: 7, y: 9, face: '+y' }, { hat: 'beret', accent: '#2f6b3a', carry: 'paper', say: '📖 이번 달 책은…', patrol: [{ x: 7, y: 9, face: '+y' }, { x: 13, y: 13, face: '-x' }, { x: 18, y: 10, face: '-y' }] });
        T.sign(L, 0.4, H - 0.4, '📖 옥상 독서정원', '#3f8a45'); T.sign(L, 5.4, 18.6, '📚 작은 도서관', '#7a5540', false);
      }
      return finish(T, fac);
    },
  });

  // ================================================================ 🎮 게임 스튜디오
  C.indoor({
    id: 'gamestudio', icon: '🎮', name: '게임 스튜디오', desc: '굿즈샵 로비·오락실 · 개발실 · QA 테스트룸·사운드 부스 · 모션캡처 · e스포츠 경기장 · 네온 루프탑',
    build(S, o) {
      const W = 30, H = 20;
      const fac = {
        wall: '#2a2140', texture: 'panel', win: 'grid', winColor: 'rgba(120,200,255,0.6)', frame: '#ff4fd8', trim: '#5fd0ff',
        sign: '🎮 PIXEL AI GAMES', signBg: '#ff4fd8', signFg: '#ffffff', lobby: 'rgba(160,120,255,0.55)',
        paint(g, o) {
          for (let k = Math.max(1, o.k0); k < o.k1; k++) {
            const y = rowTop(o, k) + o.FP - 8, c = k % 2 ? '#ff4fd8' : '#5fd0ff';
            g.save(); g.shadowColor = c; g.shadowBlur = o.night ? 8 : 3; g.fillStyle = c; g.fillRect(0, y, o.Wpx, 2); g.restore();
          }
          const top = rowTop(o, (fac.n || 1) - 1), bot = rowTop(o, Math.max(1, (fac.n || 1) - 3));
          if (top == null || bot == null || o.south) {
            if (o.south && top != null) { g.fillStyle = '#17122a'; roundRect(g, 12, top + 6, 70, 22, 4); g.fill(); g.save(); g.shadowColor = '#4ef08a'; g.shadowBlur = 6; g.fillStyle = '#4ef08a'; g.font = `bold 11px ${FONT}`; g.fillText('▶ PLAY', 22, top + 21); g.restore(); }
            return;
          }
          // 동쪽 벽: 픽셀 외계인 벽화
          const px = 9, inv = ['00100000100', '00010001000', '00111111100', '01101110110', '11111111111', '10111111101', '10100000101', '00011011000'];
          const ox = o.Wpx / 2 - (11 * px) / 2, oy = top + 8 + Math.round(Math.sin(o.t * 2) * 2);
          g.fillStyle = 'rgba(23,18,42,0.9)'; g.fillRect(ox - 8, top + 2, 11 * px + 16, Math.min(8 * px + 16, bot + o.FP - top - 4));
          inv.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '1' && 8 + j * px < bot + o.FP - top) { g.fillStyle = (Math.floor(o.t * 2) % 2) ? '#4ef08a' : '#5fd0ff'; g.fillRect(ox + i * px, oy + j * px, px - 1, px - 1); } }));
        },
      };
      const T = C.tower(S, { W, H, id: 'gamestudio', name: '🎮 게임 스튜디오', facade: fac });
      const k = kit(T), CX = T.CX;
      const NEON = ['#ff4fd8', '#5fd0ff', '#f2c230', '#a67be0'];

      // ---- 1F 굿즈샵 로비
      {
        T.nextFloor();
        const { L, K } = T.level('1F 굿즈샵 로비', 'ia_neon', '#2b2540');
        L.desc = '레트로 오락실 · 굿즈샵 · 신작 시연대 · 코스튬 직원';
        T.shell(L, K, { name: '🕹️ 레트로 오락실', color: '#ff4fd8' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'ia_neon', color: '#231d36' });
        for (let i = 0; i < 6; i++) K.add({ type: 'arcade', x: 0.6 + i * 1.15, y: 0.25, hue: i * 55 });
        K.blockRect(0, 0, 8, 1);
        for (const x of [1.5, 3.8, 6.1]) k.stand(L, x, 1.8, '-y', '레트로 오락실', null);
        K.add({ type: 'foosball', x: 9.5, y: 1.5 }); K.blockRect(9, 1, 3, 2);
        k.stand(L, 8.6, 2, '+x', '푸스볼', null); k.stand(L, 12.2, 2, '-x', '푸스볼', null);
        T.entrance(L, K);
        K.add({ type: 'ia_board', x: 3, y: 5, w: 6, kind: 'neon', text: '🎮 NEW RELEASE', color: '#5fd0ff', size: 8, z: 44, h: 22 });
        K.add({ type: 'ia_merch', x: 1, y: 7.2, w: 5 }); K.blockRect(1, 7, 5, 1);
        K.add({ type: 'ia_merch', x: 7, y: 7.2, w: 4 }); K.blockRect(7, 7, 4, 1);
        K.add({ type: 'trophyCase', x: 1, y: 11, w: 4 }); K.blockRect(1, 11, 4, 1);
        K.add({ type: 'till', x: 7, y: 11, w: 3, label: '🎁 굿즈 계산', color: '#3a3550' }); K.blockRect(7, 11, 3, 1);
        T.npc(L, '굿즈샵 점원', { x: 8.5, y: 10.4, face: '+y' }, { anim: 'type', hat: 'beanie', accent: '#ff4fd8' });
        K.add({ type: 'ia_mannequin', x: 12, y: 9, color: '#a67be0', bag: '#5fd0ff' }); K.block(12, 9);
        K.add({ type: 'ia_billboard', x: 18.6, y: 7, w: 8.6, kind: 'neon', text: '▶ 신작 체험존', sub: 'DEMO · 무료 체험', color: '#5fd0ff', size: 11, z0: 46, h: 34 }); K.block(19, 7); K.block(26, 7);
        [18.5, 21, 23.5, 26].forEach((x, i) => {
          K.add({ type: 'pcStation', x, y: 8.4 }); K.blockRect(Math.floor(x), 8, 2, 1);
          for (const part of ['seat', 'back']) K.add({ type: 'ia_gamingChair', x: x + 0.8, y: 9.85, part, color: NEON[i] });
          T.rest(L, { x: x + 0.8, y: 9.85, face: '-y', pose: 'sit' }, '신작 시연대');
        });
        T.visitorSofa(L, K, 20, 15);
        for (const [x, c] of [[2, '#ff4fd8'], [4, '#5fd0ff'], [6, '#f2c230']]) k.bean(L, K, x, 15, c, '굿즈샵 빈백');
        K.add({ type: 'arcade', x: 27.5, y: 16, hue: 300 }); K.block(27, 16);
        T.npc(L, '코스튬 직원', { x: 13, y: 14, face: '+y' }, { hat: 'beanie', accent: '#a67be0', say: '신작 체험해 보세요!', patrol: [{ x: 13, y: 14, face: '+y' }, { x: 18, y: 12, face: '+x' }, { x: 9, y: 17, face: '+y' }] });
        k.plant(K, 0, 19, 1.1, 4); k.plant(K, 29, 19, 1.1, 8);
        T.sign(L, 1, 8.6, '🎁 굿즈샵', '#ff4fd8'); T.sign(L, 18.4, 10.8, '▶ 신작 시연대', '#5fd0ff');
      }
      k.work(o, {
        name: (n) => `${n}F 개발실`, looks: [['carpet', '#3a3550'], ['ia_neon', '#2f2a44']],
        deco(L, K, n) {
          L.desc = '게임 개발실 · ' + L.desc;
          K.add({ type: 'arcade', x: 11, y: H - 1.8, hue: n * 40 }); K.add({ type: 'arcade', x: 12.15, y: H - 1.8, hue: n * 40 + 120 }); K.blockRect(11, H - 2, 2, 1);
          k.bean(L, K, 14, H - 2, NEON[n % 4], `${n}F 개발실 빈백`);
          T.sign(L, 11.2, H - 0.3, `💾 ${n}F 개발실`, '#a67be0');
        },
      });
      // ---- QA · 사운드
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F QA·사운드`, 'carpet', '#3a3550');
        L.desc = '사운드 부스(믹싱 콘솔·흡음재·악기) · QA 테스트룸(PC 12대·버그 보드) · 콘솔 테스트 코너';
        T.shell(L, K, { name: '🎧 사운드 부스', color: '#5fd0ff' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'carpet', color: '#2b2d33' });
        K.add({ type: 'ia_board', x: 0.3, y: 0, w: 14.4, kind: 'foam', z: 96, h: 60, text: '🎧 SOUND BOOTH', color: '#5fd0ff' });
        K.add({ type: 'ia_board', x: 7.5, y: 0.06, w: 2.4, kind: 'onair', text: 'REC', z: 92, h: 14 });
        K.add({ type: 'ia_mixer', x: 1, y: 1.8, w: 5 }); K.blockRect(1, 1, 5, 2);
        for (const part of ['seat', 'back']) K.add({ type: 'ia_gamingChair', x: 3.5, y: 3.4, part, color: '#5fd0ff' });
        T.npc(L, '사운드 디자이너', { x: 3.5, y: 3.4, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'headphones', accent: '#5fd0ff' });
        K.add({ type: 'ia_drumKit', x: 8, y: 1.3 }); K.block(8, 1);
        K.add({ type: 'piano', x: 10, y: 1.2 }); K.blockRect(10, 1, 2, 1);
        k.chairs(L, K, [[7, 3.5, '-y'], [12, 3.4, '-y']], '사운드 부스');
        K.wallX(0, W, 7, { doors: [2, 22], h: 90, color: '#3a3550' });
        L.patches.push({ x: 0, y: 7, w: W, d: H - 7, style: 'ia_neon', color: '#2b2540' });
        K.add({ type: 'ia_board', x: 4, y: 7, w: 7, kind: 'cork', title: '🐛 버그 보드 (BUG 42 → 7)', z: 76, h: 34 });
        K.add({ type: 'ia_board', x: 23, y: 7, w: 6, kind: 'neon', text: 'BUILD #4821 ✅', color: '#4ef08a', size: 8, z: 80, h: 20 });
        let q = 0;
        for (const ry of [9, 13]) for (const x of [1, 3.2, 5.4, 7.6, 9.8, 12]) {
          K.add({ type: 'pcStation', x, y: ry }); K.blockRect(Math.floor(x), ry, 2, 1);
          const sx = x + 0.8, sy = ry + 1.45, c = NEON[q % 3];
          for (const part of ['seat', 'back']) K.add({ type: 'ia_gamingChair', x: sx, y: sy, part, color: c });
          if (q % 3 === 1) T.npc(L, 'QA 테스터', { x: sx, y: sy, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'headphones', accent: c });
          else T.rest(L, { x: sx, y: sy, face: '-y', pose: 'sit' }, 'QA 테스트');
          q++;
        }
        K.add({ type: 'gameTV', x: 17, y: 8.2, w: 4 }); K.blockRect(17, 8, 4, 1);
        k.bean(L, K, 17, 10, '#ff4fd8', '콘솔 테스트'); k.bean(L, K, 19, 10, '#5fd0ff', '콘솔 테스트');
        K.add({ type: 'waterCooler', x: 27.3, y: 8.3 }); K.block(27, 8);
        K.add({ type: 'vending', x: 28.4, y: 8.3, color: '#a67be0' }); K.block(28, 8);
        k.sofa(L, K, 23, 14, 'QA 휴게 소파');
        T.npc(L, 'QA 리드', { x: 15.5, y: 12, face: '-x' }, { carry: 'paper', hat: 'beanie', accent: '#f2c230', patrol: [{ x: 15.5, y: 12, face: '-x' }, { x: 15.5, y: 17, face: '-x' }, { x: 0.5, y: 16.5, face: '+x' }] });
        T.sign(L, 0.3, H - 0.3, '🐞 QA 테스트룸', '#4ef08a'); T.sign(L, 17, 11.6, '🎮 콘솔 테스트', '#ff4fd8');
      }
      // ---- 모션캡처 스튜디오
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 모션캡처 스튜디오`, 'concrete', '#5d6166', 'office');
        L.desc = '의상·분장실 · 모션캡처 스튜디오(트러스·적외선 카메라) · 모니터링석 · 액터 대기석';
        T.shell(L, K, { name: '🎭 의상·분장실', color: '#a67be0' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'carpet', color: '#d9cfe6' });
        for (const x of [1, 3.5, 6]) { K.add({ type: 'salonStation', x, y: 0.1 }); K.block(Math.floor(x), 0); T.rest(L, { x: x + 0.5, y: 1.3, face: '-y', pose: 'sit', approach: [Math.floor(x), 2] }, '분장실'); }
        K.add({ type: 'ia_clothesRack', x: 9, y: 0.4, w: 3 }); K.blockRect(9, 0, 3, 1);
        K.add({ type: 'ia_mannequin', x: 12, y: 0, color: '#1d1d1f' }); K.block(12, 0);
        T.npc(L, '분장사', { x: 4.5, y: 2.6, face: '-y' }, { hat: 'bow', accent: '#a67be0', patrol: [{ x: 4.5, y: 2.6, face: '-y' }, { x: 2, y: 2.6, face: '-y' }, { x: 7, y: 2.6, face: '-y' }] });
        K.wallX(0, W, 7, { doors: [14, 25], h: 100, color: '#4a4e55' });
        L.decals.push({ type: 'ia_grid', x: 1.5, y: 9.5, w: 11, d: 8 });
        for (const part of ['back', 'front']) K.add({ type: 'ia_mocap', x: 1.5, y: 9.5, w: 11, d: 8, part });
        for (const [x, y] of [[1, 9], [12, 9], [1, 17], [12, 17]]) K.block(x, y);
        K.add({ type: 'ia_board', x: 4, y: 7, w: 3, kind: 'onair', text: '● REC', z: 96, h: 16 });
        T.npc(L, '모션 액터', { x: 5, y: 12, face: '+y' }, { anim: 'think', hat: 'shades', accent: '#1d1d1f', say: '🤸 액션!', patrol: [{ x: 5, y: 12, face: '+y' }, { x: 9, y: 15, face: '-x' }, { x: 4, y: 15.5, face: '+x' }] });
        T.npc(L, '모션 액터', { x: 9, y: 11.5, face: '-x' }, { hat: 'shades', accent: '#1d1d1f', patrol: [{ x: 9, y: 11.5, face: '-x' }, { x: 6, y: 14, face: '+y' }, { x: 10.5, y: 16, face: '-y' }] });
        for (const [x, y] of [[14, 9], [14, 16]]) { K.add({ type: 'ia_studioLight', x, y }); K.block(x, y); }
        K.add({ type: 'bigScreen', x: 16, y: 7.1, w: 6 }); K.blockRect(16, 7, 6, 1);
        for (let i = 0; i < 6; i++) K.add({ type: 'tableSeg', x: 16 + i, y: 9.5, w: 1, d: 0.9 });
        K.blockRect(16, 9, 6, 1);
        for (const part of ['seat', 'back']) K.add({ type: 'chair', x: 17.5, y: 10.9, face: '-y', part, premium: true });
        T.npc(L, '애니메이션 감독', { x: 17.5, y: 10.9, face: '-y', pose: 'sit' }, { anim: 'think', hat: 'beret', accent: '#ff4fd8', say: '좋아, 한 번 더!' });
        k.chairs(L, K, [[19.5, 10.9, '-y'], [21.2, 10.9, '-y']], '모캡 모니터링');
        K.add({ type: 'ia_tvCamera', x: 23, y: 12 }); K.block(23, 12);
        k.sofa(L, K, 24, 16, '액터 대기석');
        K.add({ type: 'waterCooler', x: 27.3, y: 8.3 }); K.block(27, 8);
        K.add({ type: 'vending', x: 28.4, y: 8.3, color: '#ff4fd8' }); K.block(28, 8);
        K.add({ type: 'ia_board', x: 26, y: 7, w: 3.6, kind: 'poster', lines: ['🗡️ 기사', '🐉 드래곤', '🤖 로봇'], z: 78, h: 30 });
        T.sign(L, 1.5, H - 0.3, '🎬 모션캡처 스튜디오', '#ff4fd8'); T.sign(L, 16, 12.3, '🖥️ 모니터링', '#5fd0ff'); T.sign(L, 24, H - 0.3, '🧃 액터 대기석', '#a67be0');
      }
      // ---- e스포츠 경기장
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F e스포츠 경기장`, 'ia_neon', '#1d1a2c', 'office');
        L.desc = '해설 부스 · e스포츠 경기장(대형 스크린·팀 부스 2) · 관객석 18';
        T.shell(L, K, { name: '🎙️ 해설 부스', color: '#f2c230', glass: true });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'carpet', color: '#2b2d33' });
        for (let i = 0; i < 5; i++) K.add({ type: 'tableSeg', x: 3 + i, y: 2.6, w: 1, d: 0.9 });
        K.blockRect(3, 2, 5, 2);
        for (const [x, role] of [[4.5, '캐스터'], [6.5, '해설위원']]) { for (const part of ['seat', 'back']) K.add({ type: 'chair', x, y: 1.9, face: '+y', part, premium: true }); T.npc(L, role, { x, y: 1.9, face: '+y', pose: 'sit' }, { anim: 'type', hat: 'headphones', accent: '#f2c230', tie: '#2b2622', say: x < 5 ? '와아아 역전!' : undefined }); }
        K.add({ type: 'ia_board', x: 9, y: 0, w: 2.4, kind: 'onair', text: 'LIVE', z: 90, h: 14 });
        K.wallX(0, W, 7, { doors: [2, 27], h: 100, color: '#2b2540' });
        L.patches.push({ x: 3, y: 7, w: 24, d: 4.2, style: 'deck', color: '#4a3a6a' });
        L.decals.push({ type: 'floor', x: 3, y: 11.05, w: 24, d: 0.15, color: '#5fd0ff' });
        K.add({ type: 'bigScreen', x: 8, y: 7.05, w: 14 }); K.blockRect(8, 7, 14, 1);
        for (const [x, c, team] of [[4, '#5fd0ff', 'TEAM BLUE'], [19, '#ff4fd8', 'TEAM PINK']]) {
          K.add({ type: 'ia_esports', x, y: 8.4, w: 6, color: c, team }); K.blockRect(x, 8, 6, 1);
          for (let i = 0; i < 3; i++) { const sx = x + 1 + i * 2; for (const part of ['seat', 'back']) K.add({ type: 'ia_gamingChair', x: sx, y: 10, part, color: c }); T.npc(L, `${team} 선수`, { x: sx, y: 10, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'headphones', accent: c }); }
        }
        for (const y of [13, 15, 17]) for (const x0 of [2, 16]) {
          K.add({ type: 'seatRow', x: x0, y, w: 11, color: y === 13 ? '#e5534b' : '#4e7cf6' }); K.blockRect(x0, y, 11, 1);
          for (const s of [2, 6, 10]) { const sx = x0 + 0.4 + s * 0.8; T.rest(L, { x: sx, y: y + 0.2, face: '-y', pose: 'sit', approach: [Math.floor(sx), y + 1] }, '관객석'); }
        }
        for (const [x, c] of [[0, '#5fd0ff'], [29, '#ff4fd8']]) { K.add({ type: 'flag', x: x + 0.5, y: 19.4, color: c }); K.block(x, 19); }
        for (const [x, y] of [[1, 9], [28, 9]]) { K.add({ type: 'ia_studioLight', x, y, color: '#c9a8ff' }); K.block(x, y); }
        T.npc(L, '응원단장', { x: 14, y: 19, face: '-y' }, { hat: 'cap', accent: '#f2c230', say: '📣 파이팅!!', patrol: [{ x: 14, y: 19, face: '-y' }, { x: 14, y: 12, face: '-y' }, { x: 27, y: 18.5, face: '-x' }] });
        T.sign(L, 0.3, H - 0.3, '🏟️ e스포츠 경기장', '#ff4fd8'); T.sign(L, 13.2, 12.4, '🎟️ 관객석', '#f2c230', false);
      }
      // ---- 네온 루프탑
      {
        const { L, K } = k.roof('R 네온 루프탑', 'deck', '#3a3550', '네온 루프탑 · 대형 네온 간판 · 빈백 · 바비큐 · DJ 부스');
        K.add({ type: 'ia_billboard', x: 1, y: 4, w: 11, kind: 'neon', text: '🎮 PIXEL AI GAMES', sub: 'PRESS START ▶', color: '#ff4fd8', size: 15, z0: 40, h: 56 }); K.block(1, 4); K.block(11, 4);
        for (const [x, c] of [[2, '#ff4fd8'], [4, '#5fd0ff'], [6, '#f2c230'], [8, '#a67be0']]) k.bean(L, K, x, 8, c, '네온 빈백');
        k.parasol(L, K, 17, 7, '#ff4fd8', '루프탑 테이블'); k.parasol(L, K, 22, 7, '#5fd0ff', '루프탑 테이블'); k.parasol(L, K, 26, 11, '#a67be0', '루프탑 테이블');
        K.add({ type: 'bbq', x: 3, y: 14 }); K.blockRect(3, 14, 2, 1);
        k.bench(L, K, 1, 16, 4, '바비큐 벤치', '#5fd0ff'); k.bench(L, K, 6, 16, 4, '바비큐 벤치', '#ff4fd8');
        K.add({ type: 'stringLights', pts: [[0.5, 12], [13.5, 12], [13.5, 19.5]] }); for (const [x, y] of [[0, 12], [13, 12], [13, 19]]) K.block(x, y);
        k.bench(L, K, 17, 15, 4, '루프탑 벤치', '#a67be0');
        K.add({ type: 'ia_mixer', x: 21, y: 17, w: 3 }); K.blockRect(21, 17, 3, 1);
        T.npc(L, 'DJ', { x: 22.5, y: 18.4, face: '-y' }, { hat: 'headphones', accent: '#ff4fd8', say: '🎧 볼륨 업!' });
        T.npc(L, '바비큐 담당', { x: 5.5, y: 13.5, face: '-x' }, { hat: 'cap', accent: '#f2c230', carry: 'tray' });
        T.sign(L, 0.4, H - 0.4, '🌃 네온 루프탑', '#ff4fd8'); T.sign(L, 20.6, H - 0.4, '🎧 DJ 부스', '#5fd0ff');
      }
      return finish(T, fac);
    },
  });

  // ================================================================ 📺 AI 방송국
  C.indoor({
    id: 'broadcast', icon: '📺', name: 'AI 방송국', desc: '방송국 로비 · 보도국 · 뉴스 스튜디오·부조정실 · 분장실·라디오 부스 · 옥상 송신탑',
    build(S, o) {
      const W = 28, H = 20;
      const fac = {
        wall: '#e9eef5', texture: 'panel', win: 'glass', winColor: 'rgba(170,205,240,0.85)', frame: 'rgba(31,79,168,0.5)', trim: '#1f4fa8',
        sign: '📺 AIBS 방송국', signBg: '#1f4fa8', signFg: '#ffffff', lobby: 'rgba(200,225,250,0.9)', awning: '#1f4fa8',
        paint(g, o) {
          const n = fac.n || 1;
          const kTop = Math.min(n - 1, 4), kBot = 2;
          if (o.south && kTop >= kBot && o.k0 <= kBot && o.k1 > kTop) {
            const y0 = rowTop(o, kTop) + 4, y1 = rowTop(o, kBot) + o.FP - 6, x0 = 26, x1 = Math.min(o.Wpx - 26, x0 + 300);
            g.fillStyle = '#16181b'; g.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8);
            const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#1f4fa8'); gr.addColorStop(1, '#0f2a5a'); g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
            const ax = x0 + (x1 - x0) * 0.7, ay = y1 - 18;
            g.fillStyle = '#2b3a67'; g.beginPath(); g.ellipse(ax, ay + 8, 26, 16, 0, Math.PI, 0); g.fill(); g.fillStyle = '#f2d2b6'; g.beginPath(); g.arc(ax, ay - 16, 12, 0, 7); g.fill(); g.fillStyle = '#3b2a1c'; g.beginPath(); g.arc(ax, ay - 20, 12, Math.PI, 0); g.fill();
            g.fillStyle = '#e5534b'; g.fillRect(ax - 2, ay - 4, 4, 9);
            g.fillStyle = '#fff'; g.font = `bold 16px ${FONT}`; g.fillText('AIBS NEWS 9', x0 + 12, y0 + 24); g.font = `9px ${FONT}`; g.fillText('세션 속보 · 오늘의 AI 날씨', x0 + 12, y0 + 40);
            g.save(); g.beginPath(); g.rect(x0, y1 - 14, x1 - x0, 14); g.clip(); g.fillStyle = '#e5534b'; g.fillRect(x0, y1 - 14, x1 - x0, 14); g.fillStyle = '#fff'; g.font = `bold 8px ${FONT}`;
            const msg = '속보 · AI 방송국 오늘도 정상 송출 중 · 세션 작업 순항 · 내일 날씨 맑음 ☀️ · ';
            const off = (o.t * 30) % 420; g.fillText(msg + msg, x0 + 6 - off, y1 - 4); g.restore();
          }
          const top = rowTop(o, n - 1);
          if (!o.south && top != null) {
            const cx = o.Wpx / 2, cy = top + o.FP / 2;
            g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, 25, 0, 7); g.fill();
            for (const [dx, dy, c] of [[-8, -5, '#e5534b'], [8, -5, '#3fb27f'], [0, 8, '#4e7cf6']]) { g.fillStyle = rgba(c, 0.85); g.beginPath(); g.arc(cx + dx, cy + dy, 11, 0, 7); g.fill(); }
            g.fillStyle = '#1f4fa8'; g.font = `bold 8px ${FONT}`; g.textAlign = 'center'; g.fillText('AIBS', cx, cy + 34); g.textAlign = 'left';
          }
        },
      };
      const T = C.tower(S, { W, H, id: 'broadcast', name: '📺 AI 방송국', facade: fac });
      const k = kit(T), CX = T.CX;

      // ---- 1F 로비
      {
        T.nextFloor();
        const { L, K } = T.level('1F 방송국 로비', 'marble', '#eef1f5');
        L.desc = '보안실 · 로비 뉴스 자막판 · 방송대상 트로피 · 첫 방송 카메라 전시 · 방청객 대기석';
        T.shell(L, K, { name: T.securityRoom(L, K), color: '#2b3a67' });
        T.entrance(L, K);
        K.add({ type: 'ia_board', x: 0.6, y: 5, w: 11.5, kind: 'ticker', title: '📺 AIBS 뉴스', z: 44, h: 30 });
        K.add({ type: 'trophyCase', x: 1, y: 7.3, w: 4 }); K.blockRect(1, 7, 4, 1);
        K.add({ type: 'ia_tvCamera', x: 6, y: 7.6 }); K.blockRect(6, 7, 1, 2);
        K.add({ type: 'reception', x: 18.4, y: 8.6, w: 5 }); K.blockRect(18, 8, 6, 1);
        T.npc(L, '안내', { x: 20.9, y: 7.9, face: '+y' }, { hat: 'bow', accent: '#1f4fa8', anim: 'type' });
        k.wait(L, K, 1, 12, 6, '방청객 대기', '#1f4fa8'); k.wait(L, K, 1, 15, 6, '방청객 대기', '#e5534b');
        K.add({ type: 'ia_billboard', x: 8.5, y: 11, w: 3, kind: 'ad', text: '뉴스 9', sub: '오늘 밤 9시', color: '#1f4fa8', color2: '#3f7fe0', z0: 12, h: 40, size: 11 }); K.block(8, 11); K.block(11, 11);
        T.visitorSofa(L, K, 19, 15);
        K.add({ type: 'flagStand', x: 25.6, y: 8.2 }); K.block(25, 8);
        k.plant(K, 0, 19, 1.1, 3); k.plant(K, 27, 19, 1.1, 6);
        T.npc(L, '경비', { x: 14.5, y: 17.5, face: '+y' }, { hat: 'police', patrol: [{ x: 14.5, y: 17.5, face: '+y' }, { x: 4, y: 6, face: '+x' }, { x: 24, y: 6, face: '-x' }] });
        T.sign(L, 5.4, 9.6, '📷 첫 방송 카메라', '#7a5540', false); T.sign(L, 1.2, 17.4, '🎟️ 방청객 대기', '#1f4fa8'); T.sign(L, 1, 8.6, '🏆 방송대상', '#c9a24a', false);
      }
      k.work(o, {
        name: (n) => `${n}F 보도국`, looks: [['carpet', '#d6dde8'], ['tile', '#e6eaef']],
        deco(L, K, n) {
          L.desc = '보도국(기자석) · ' + L.desc;
          K.add({ type: 'ia_tvCamera', x: 11, y: H - 2 }); K.block(11, H - 2);
          K.add({ type: 'ia_studioLight', x: 13, y: H - 2 }); K.block(13, H - 2);
          T.sign(L, 11.2, H - 0.3, `📰 ${n}F 보도국`, '#1f4fa8');
        },
      });
      // ---- 뉴스 스튜디오 (+ 부조정실)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 뉴스 스튜디오`, 'raised', '#3b4250', 'office');
        L.desc = '부조정실(관제 화면·콘솔) · 뉴스 스튜디오(앵커 데스크·카메라 3·조명) · 날씨 크로마키 · 토크쇼 세트';
        T.shell(L, K, { name: '🎛️ 부조정실', color: '#1f4fa8', glass: true });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'raised', color: '#d5d9dd' });
        K.add({ type: 'nocWall', x: 0.4, y: 0.25, w: 12 }); K.blockRect(0, 0, 13, 1);
        K.add({ type: 'ia_mixer', x: 1.5, y: 1.7, w: 6 }); K.blockRect(1, 1, 7, 2);
        T.npc(L, 'PD', { x: 3.5, y: 3.3, face: '-y' }, { anim: 'think', hat: 'headphones', accent: '#e5534b', say: '카메라 2번 준비!' });
        T.npc(L, '기술감독', { x: 6, y: 3.3, face: '-y' }, { anim: 'type', hat: 'headphones', accent: '#1f4fa8' });
        k.chairs(L, K, [[9, 3.2, '-y'], [10.6, 3.2, '-y']], '부조정실 모니터링');
        K.wallX(0, W, 7, { doors: [2, 26], h: 104, color: '#2b3340' });
        K.add({ type: 'ia_board', x: 6, y: 7, w: 12, kind: 'ticker', title: 'AIBS NEWS 9', z: 100, h: 58 });
        K.add({ type: 'ia_board', x: 18.5, y: 7, w: 1.8, kind: 'onair', z: 100, h: 12 });
        L.decals.push({ type: 'ia_roundRug', cx: 12, cy: 10.6, r: 3.2, color: '#1f4fa8', border: '#9cc0ff' });
        K.add({ type: 'ia_anchorDesk', x: 8, y: 10, w: 8 }); K.blockRect(8, 10, 8, 1);
        for (const [x, role, tie] of [[10, '메인 앵커', '#e5534b'], [13.6, '앵커', '#1f4fa8']]) { for (const part of ['seat', 'back']) K.add({ type: 'chair', x, y: 9.4, face: '+y', part, premium: true }); T.npc(L, role, { x, y: 9.4, face: '+y', pose: 'sit' }, { anim: 'type', accent: '#2b3a67', tie }); }
        for (const [x, y] of [[9, 15], [12, 15.6], [15, 15]]) { K.add({ type: 'ia_tvCamera', x, y }); K.block(x, Math.floor(y)); T.npc(L, '카메라 감독', { x: x + 0.5, y: y + 1.6, face: '-y' }, { hat: 'headphones', accent: '#3b3f45' }); }
        for (const [x, y] of [[5, 12], [18, 12]]) { K.add({ type: 'ia_studioLight', x, y }); K.block(x, y); }
        K.add({ type: 'ia_board', x: 21, y: 7, w: 4.6, kind: 'chroma', z: 100, h: 62 });
        T.npc(L, '기상캐스터', { x: 23.3, y: 8.6, face: '+y' }, { hat: 'bow', accent: '#f2c230', say: '내일은 맑음 ☀️' });
        K.add({ type: 'ia_tvCamera', x: 23, y: 12.5 }); K.block(23, 12);
        k.sofa(L, K, 1, 15, '토크쇼 세트');
        K.add({ type: 'roundTable', x: 2.5, y: 17.4, r: 0.45, color: '#ffffff' }); K.block(2, 17);
        K.add({ type: 'ia_studioLight', x: 5, y: 17.5, color: '#ffd6e8' }); K.block(5, 17);
        T.sign(L, 0.3, H - 0.3, '🎙️ 토크쇼 세트', '#e5534b'); T.sign(L, 7.8, 13.2, '📺 뉴스 스튜디오', '#1f4fa8', false); T.sign(L, 21, 11.3, '☀️ 날씨', '#f2c230', false);
      }
      // ---- 분장실 · 라디오 (+ 자료 보관실)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 분장실·라디오`, 'carpet', '#e6dce8');
        L.desc = '자료 보관실 · 분장실(거울 5·의상) · 라디오 부조 · 라디오 부스(ON AIR)';
        T.shell(L, K, { name: '📼 자료 보관실', color: '#7a5540' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'tile', color: '#e2ddd3' });
        for (const x of [0.4, 4.4, 8.4]) K.add({ type: 'storageShelf', x, y: 0.3, w: 3.4, seed: Math.round(x * 5) });
        K.blockRect(0, 0, 12, 1);
        K.add({ type: 'storageShelf', x: 0.4, y: 2.3, w: 3.4, seed: 21 }); K.blockRect(0, 2, 4, 1);
        T.npc(L, '아카이브 담당', { x: 7, y: 2.6, face: '-y' }, { carry: 'box', hat: 'cap', accent: '#7a5540', patrol: [{ x: 7, y: 2.6, face: '-y' }, { x: 10, y: 3.5, face: '-y' }, { x: 5, y: 1.5, face: '-y' }] });
        K.wallX(0, W, 7, { doors: [5, 18], h: 90, color: '#efe6ec' });
        K.wallY(7, H, 14, { h: 90, color: '#efe6ec' });
        L.patches.push({ x: 0, y: 7, w: 14, d: H - 7, style: 'carpet', color: '#f3e3ec' });
        for (const x of [0.6, 2.6, 6.6, 8.6, 10.6]) { K.add({ type: 'salonStation', x, y: 7.1 }); K.block(Math.floor(x), 7); T.rest(L, { x: x + 0.5, y: 8.35, face: '-y', pose: 'sit', approach: [Math.floor(x + 0.5), 9] }, '분장실'); }
        T.npc(L, '헤어 스타일리스트', { x: 4, y: 9.6, face: '-y' }, { hat: 'bow', accent: '#e2667f', patrol: [{ x: 4, y: 9.6, face: '-y' }, { x: 1, y: 9.6, face: '-y' }, { x: 9, y: 9.6, face: '-y' }] });
        K.add({ type: 'ia_clothesRack', x: 1, y: 15, w: 4 }); K.blockRect(1, 15, 4, 1);
        K.add({ type: 'ia_clothesRack', x: 7, y: 15, w: 4 }); K.blockRect(7, 15, 4, 1);
        k.sofa(L, K, 9, 12, '분장 대기');
        K.add({ type: 'ia_mannequin', x: 12, y: 17, color: '#e2667f' }); K.block(12, 17);
        T.sign(L, 0.3, H - 0.3, '💄 분장실', '#e2667f');
        L.patches.push({ x: 14, y: 7, w: W - 14, d: H - 7, style: 'carpet', color: '#2b2d33' });
        K.wallY(7, H, 21, { glass: true, doors: [16], h: 80 });
        K.add({ type: 'ia_board', x: 15, y: 7, w: 2.8, kind: 'onair', text: 'ON AIR', z: 88, h: 18 });
        K.add({ type: 'ia_mixer', x: 15, y: 9, w: 5 }); K.blockRect(15, 9, 5, 1);
        for (const part of ['seat', 'back']) K.add({ type: 'chair', x: 17.5, y: 10.4, face: '-y', part });
        T.npc(L, '라디오 PD', { x: 17.5, y: 10.4, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'headphones', accent: '#5fd0ff' });
        k.chairs(L, K, [[19.4, 10.5, '-y']], '라디오 부조');
        K.add({ type: 'ia_board', x: 21.2, y: 7, w: 6.6, kind: 'foam', z: 88, h: 50, text: '📻 AIBS FM 107.7', color: '#ff9a3c' });
        for (let i = 0; i < 4; i++) K.add({ type: 'tableSeg', x: 22.5 + i, y: 11.5, w: 1, d: 0.9 });
        K.blockRect(22, 11, 5, 1);
        for (const part of ['seat', 'back']) K.add({ type: 'chair', x: 24.5, y: 10.6, face: '+y', part, premium: true });
        T.npc(L, 'DJ', { x: 24.5, y: 10.6, face: '+y', pose: 'sit' }, { anim: 'type', hat: 'headphones', accent: '#ff9a3c', say: '📻 신청곡 받습니다~' });
        k.chairs(L, K, [[23.3, 12.9, '-y'], [25.7, 12.9, '-y']], '라디오 게스트');
        k.sofa(L, K, 23, 17, '라디오 청취 소파');
        T.sign(L, 14.3, H - 0.3, '🎚️ 라디오 부조', '#5fd0ff'); T.sign(L, 21.3, H - 0.3, '📻 라디오 부스', '#ff9a3c');
      }
      // ---- 옥상 송신탑
      {
        const { L, K } = k.roof('R 송신탑', 'concrete', '#b9bcbf', '송신탑(항공등) · 위성 안테나 · 옥상 휴게');
        L.decals.push({ type: 'hazard', x: 1.4, y: 4.4, w: 3.2, d: 3.2 });
        K.add({ type: 'ia_tower', x: 2, y: 5, h: 200 }); K.blockRect(2, 5, 2, 2);
        for (const [x, y] of [[7, 4], [9, 4], [7, 7]]) { K.add({ type: 'ia_dish', x, y }); K.block(x, y); }
        K.add({ type: 'upsCabinet', x: 9.4, y: 7 }); K.blockRect(9, 7, 3, 1);
        T.npc(L, '송신 엔지니어', { x: 5, y: 9, face: '-y' }, { hat: 'hardhat', accent: '#f2c230', carry: 'paper', patrol: [{ x: 5, y: 9, face: '-y' }, { x: 1, y: 9, face: '+y' }, { x: 11, y: 9.5, face: '-y' }] });
        L.patches.push({ x: 14, y: 5, w: W - 14, d: H - 5, style: 'deck', color: '#c9a57a' });
        k.parasol(L, K, 16, 8, '#1f4fa8', '옥상 휴게'); k.parasol(L, K, 21, 8, '#e5534b', '옥상 휴게'); k.parasol(L, K, 25, 12, '#f2c230', '옥상 휴게');
        k.bench(L, K, 15, 15, 4, '옥상 벤치'); k.bench(L, K, 21, 17, 4, '옥상 벤치'); k.bench(L, K, 2, 14, 4, '송신탑 벤치');
        K.add({ type: 'ashtray', x: 26.5, y: 18.5 }); K.block(26, 18); K.add({ type: 'smokeSign', x: 27.4, y: 17.2 });
        for (const [x, y] of [[14, 11], [27, 6]]) k.tree(K, x, y, true);
        T.sign(L, 0.4, H - 0.4, '📡 송신탑', '#e5534b'); T.sign(L, 14.3, H - 0.4, '☕ 옥상 휴게', '#7a4a2a');
      }
      return finish(T, fac);
    },
  });

  // ================================================================ 🧪 바이오 연구소
  C.indoor({
    id: 'biolab', icon: '🧪', name: '바이오 연구소', desc: 'B1 격리실 · DNA 로비 · 연구실 · 클린룸 · 실험실·극저온 저장고 · 온실 실험실 · 옥상 정원',
    build(S, o) {
      const W = 28, H = 20;
      const fac = {
        wall: '#f2f7f5', texture: 'panel', win: 'small', frame: '#7fd6bf', winColor: 'rgba(170,230,215,0.85)', trim: '#7fd6bf',
        sign: '🧪 AI BIO LAB', signBg: '#2f9e8f', signFg: '#ffffff', lobby: 'rgba(200,240,230,0.9)',
        paint(g, o) {
          for (let k = Math.max(1, o.k0); k < o.k1; k++) { const y = rowTop(o, k) + o.FP - 9; g.fillStyle = '#9fe3d0'; g.fillRect(0, y, o.Wpx, 6); g.fillStyle = 'rgba(47,158,143,0.35)'; g.fillRect(0, y + 6, o.Wpx, 1); }
          if (!o.south) {
            const x0 = o.Wpx / 2, y0 = 8, y1 = o.Hb - (o.k0 === 0 ? o.FP + 4 : 4);
            if (y1 - y0 < 30) return;
            g.fillStyle = 'rgba(242,247,245,0.9)'; g.fillRect(x0 - 24, y0 - 4, 48, y1 - y0 + 8);
            for (let y = y0; y < y1; y += 6) { const a = y * 0.09; const dx = Math.cos(a) * 16; g.strokeStyle = 'rgba(150,170,180,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 - dx, y); g.lineTo(x0 + dx, y); g.stroke(); g.fillStyle = Math.sin(a) > 0 ? '#3fb27f' : '#2f8c62'; g.beginPath(); g.arc(x0 - dx, y, 2.8, 0, 7); g.fill(); g.fillStyle = Math.sin(a) > 0 ? '#8a6be0' : '#a67be0'; g.beginPath(); g.arc(x0 + dx, y, 2.8, 0, 7); g.fill(); }
            return;
          }
          const top = rowTop(o, (fac.n || 1) - 1);
          if (top == null) return;
          const cx = o.Wpx - 60, cy = top + o.FP / 2;
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, 24, 0, 7); g.fill();
          g.strokeStyle = '#2f9e8f'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; const px = cx + Math.cos(a) * 15, py = cy + Math.sin(a) * 15; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
          for (let i = 0; i < 6; i += 2) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; g.fillStyle = ['#3fb27f', '#4e9cf6', '#e2667f'][i / 2]; g.beginPath(); g.arc(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15, 5, 0, 7); g.fill(); }
        },
      };
      const T = C.tower(S, { W, H, id: 'biolab', name: '🧪 바이오 연구소', facade: fac });
      const k = kit(T), CX = T.CX;

      // ---- B1 격리실
      {
        const { L, K } = T.level('B1 격리실', 'ia_hex', '#d9e6e2', 'office', { basement: true });
        L.desc = '방호복 탈의실 · 음압 격리실(챔버 4·제독 게이트) · 생물안전작업대 · -80℃ 냉동고 · 비상전원';
        T.shell(L, K, { name: '🦺 방호복 탈의실', color: '#e9a23b' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'tile', color: '#e8eef0' });
        K.add({ type: 'lockers', x: 0.3, y: 0.25, w: 5 }); K.blockRect(0, 0, 6, 1);
        K.add({ type: 'storageShelf', x: 6.4, y: 0.3, w: 3, seed: 4 }); K.blockRect(6, 0, 4, 1);
        k.bench(L, K, 1, 3, 4, '탈의실 벤치', '#7fd6bf');
        T.npc(L, '안전관리자', { x: 9, y: 3, face: '-x' }, { hat: 'hardhat', accent: '#f2c230', say: '방호복 착용 필수!' });
        K.wallX(0, W, 7, { doors: [6, 21], h: 90, color: '#dfe8e6' });
        K.wallY(7, H, 15, { glass: true, doors: [16], h: 80 });
        L.patches.push({ x: 0, y: 7, w: 15, d: H - 7, style: 'ia_hex', color: '#d2e2dc' });
        L.decals.push({ type: 'hazard', x: 0.3, y: 10.3, w: 14.4, d: 3.4 });
        K.add({ type: 'ia_scanner', x: 5.6, y: 8 });
        K.add({ type: 'ia_board', x: 8.5, y: 7, w: 5, kind: 'onair', text: '☣ 음압 유지 중', z: 84, h: 14 });
        for (const x of [1, 4, 7, 10]) { K.add({ type: 'ia_isoPod', x, y: 11 }); K.blockRect(x, 11, 2, 2); }
        k.wait(L, K, 2, 16, 5, '격리 관찰석', '#7fd6bf');
        T.npc(L, '격리 연구원', { x: 3.5, y: 14.5, face: '-y' }, { hat: 'hardhat', accent: '#ffffff', anim: 'think', patrol: [{ x: 3.5, y: 14.5, face: '-y' }, { x: 9.5, y: 14.5, face: '-y' }, { x: 12.5, y: 9, face: '-y' }] });
        T.sign(L, 0.3, H - 0.3, '☣️ 음압 격리실 (BSL-3)', '#e5534b');
        L.patches.push({ x: 15, y: 7, w: W - 15, d: H - 7, style: 'concrete', color: '#c9cfcc' });
        for (const x of [16, 18.5]) { K.add({ type: 'ia_bsc', x, y: 7.3, w: 2 }); K.blockRect(Math.floor(x), 7, 3, 1); }
        k.chairs(L, K, [[17, 8.9, '-y'], [19.5, 8.9, '-y']], '생물안전작업대');
        K.add({ type: 'generator', x: 23, y: 9 }); K.blockRect(23, 9, 3, 2);
        K.add({ type: 'chiller', x: 23, y: 13 }); K.blockRect(23, 13, 3, 2);
        K.add({ type: 'fridge', x: 16.3, y: 12 }); K.add({ type: 'fridge', x: 17.4, y: 12 }); K.blockRect(16, 12, 3, 1);
        T.npc(L, '시설 기사', { x: 21, y: 16, face: '-y' }, { hat: 'hardhat', accent: '#c47f22', carry: 'paper', patrol: [{ x: 21, y: 16, face: '-y' }, { x: 26.5, y: 12, face: '-x' }, { x: 17, y: 17, face: '-y' }] });
        T.sign(L, 15.3, H - 0.3, '⚡ 비상전원 · ❄️ -80℃ 냉동고', '#4e9cf6');
      }
      // ---- 1F 로비
      {
        T.nextFloor();
        const { L, K } = T.level('1F 로비', 'ia_hex', '#e9f4f0');
        L.desc = '보안실 · 로비 · 표본 전시 · DNA 조형물 · 연구 분야 포스터';
        T.shell(L, K, { name: T.securityRoom(L, K), color: '#2b3a67' });
        T.entrance(L, K);
        K.add({ type: 'ia_board', x: 1.5, y: 5, w: 8, kind: 'poster', lines: ['🧬 유전체', '🦠 미생물', '🌱 합성생물'], z: 44, h: 28 });
        for (const [x, c] of [[1.5, '#4ef08a'], [3.5, '#5fd0ff'], [5.5, '#f2a7c3']]) { K.add({ type: 'specimenTank', x, y: 8.5, color: c }); K.block(Math.floor(x), 8); }
        L.decals.push({ type: 'ia_roundRug', cx: 8.5, cy: 12.5, r: 2, color: '#a8e6d6', border: '#2f9e8f' });
        K.add({ type: 'ia_dna', x: 8, y: 12 }); K.block(8, 12);
        K.add({ type: 'reception', x: 18.4, y: 8.6, w: 5 }); K.blockRect(18, 8, 6, 1);
        T.npc(L, '안내', { x: 20.9, y: 7.9, face: '+y' }, { anim: 'type', hat: 'bow', accent: '#2f9e8f' });
        k.wait(L, K, 1, 15, 5, '로비 대기', '#7fd6bf');
        T.visitorSofa(L, K, 19, 15);
        K.add({ type: 'ia_cryo', x: 25, y: 9 }); K.block(25, 9);
        k.plant(K, 0, 19, 1.1, 2); k.plant(K, 27, 19, 1.1, 5); k.plant(K, 27, 8, 1, 7);
        T.npc(L, '연구원', { x: 12, y: 15, face: '+y' }, { accent: '#ffffff', carry: 'paper', patrol: [{ x: 12, y: 15, face: '+y' }, { x: 4, y: 6, face: '+x' }, { x: 23, y: 12, face: '-x' }] });
        T.sign(L, 1, 9.8, '🧫 표본 전시', '#2f9e8f'); T.sign(L, 6.5, 14.8, '🧬 DNA 조형물', '#8a6be0', false);
      }
      k.work(o, {
        name: (n) => `${n}F 연구실`, looks: [['ia_hex', '#e6f1ed'], ['tile', '#eef2f0']],
        deco(L, K, n) {
          L.desc = '바이오 연구실 · ' + L.desc;
          K.add({ type: 'ia_cryo', x: 11, y: H - 2 }); K.block(11, H - 2);
          K.add({ type: 'specimenTank', x: 13.5, y: H - 1.5, color: COLORS[n % 7] }); K.block(13, H - 2);
          T.sign(L, 11.2, H - 0.3, `🔬 ${n}F 연구실`, '#2f9e8f');
        },
      });
      // ---- 클린룸 (+ 에어샤워실)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 클린룸`, 'raised', '#eef2f5', 'office');
        L.desc = '에어샤워실 · 클린룸 ISO 5 (공정 장비 12·노란 조명 구역·웨이퍼 로봇) · 모니터링석';
        T.shell(L, K, { name: '🥼 에어샤워실', color: '#4e9cf6' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'tile', color: '#eef3f7' });
        K.add({ type: 'lockers', x: 0.3, y: 0.25, w: 3 }); K.blockRect(0, 0, 4, 1);
        for (const x of [5.5, 8.5]) K.add({ type: 'ia_scanner', x, y: 1.4 });
        k.bench(L, K, 1, 3, 3, '에어샤워 대기', '#4e9cf6');
        T.npc(L, '클린룸 매니저', { x: 10.5, y: 2.5, face: '-x' }, { hat: 'beanie', accent: '#ffffff', anim: 'think' });
        K.wallX(0, W, 7, { glass: true, doors: [12], h: 80 });
        L.patches.push({ x: 0, y: 7, w: W, d: H - 7, style: 'raised', color: '#f4f7f9' });
        L.decals.push({ type: 'floor', x: 15, y: 7.2, w: 12.8, d: 12.6, color: 'rgba(255,214,90,0.18)' });
        let s = 0;
        for (const y of [9, 13]) for (const x of [1, 4, 7, 16, 19, 22]) { K.add({ type: 'cleanroomTool', x, y, seed: s++ }); K.blockRect(x, y, 2, 2); }
        for (const x of [1, 7, 16, 22]) k.stand(L, x + 0.8, 11.5, '-y', '장비 점검', null);
        K.add({ type: 'robotArm', x: 13.5, y: 15.5 }); K.block(13, 15);
        for (const x of [16, 18.5, 21]) { K.add({ type: 'pcStation', x, y: 17.2 }); K.blockRect(Math.floor(x), 17, 2, 1); k.chairs(L, K, [[x + 0.8, 18.65, '-y']], '클린룸 모니터링'); }
        T.npc(L, '클린룸 엔지니어', { x: 3.5, y: 15.5, face: '-y' }, { hat: 'beanie', accent: '#ffffff', anim: 'type', patrol: [{ x: 3.5, y: 15.5, face: '-y' }, { x: 8.5, y: 15.5, face: '-y' }, { x: 3, y: 8, face: '+y' }] });
        T.npc(L, '클린룸 엔지니어', { x: 20.5, y: 15.5, face: '-y' }, { hat: 'beanie', accent: '#ffffff', anim: 'type', patrol: [{ x: 20.5, y: 15.5, face: '-y' }, { x: 25.5, y: 11.5, face: '-x' }, { x: 15, y: 8, face: '+y' }] });
        T.sign(L, 0.3, H - 0.3, '🧑‍🔬 클린룸 (ISO 5)', '#4e9cf6'); T.sign(L, 15.3, 8.4, '💡 노란 조명 구역', '#e9a23b', false);
      }
      // ---- 실험실 · 극저온 저장고
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 실험실·극저온 저장고`, 'ia_hex', '#e3efe9', 'office');
        L.desc = '극저온 저장고(액체질소 탱크 8) · 실험실(실험대·표본·생물안전작업대·LED 재배랙·리퀴드 핸들러) · 실험실 휴게';
        T.shell(L, K, { name: '❄️ 극저온 저장고', color: '#4e9cf6' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'concrete', color: '#d4dde3' });
        L.decals.push({ type: 'hazard', x: 0.2, y: 0.2, w: 8.6, d: 4 });
        for (const x of [0.5, 2, 3.5, 5, 6.5]) K.add({ type: 'ia_cryo', x, y: 0.4 });
        K.blockRect(0, 0, 8, 2);
        for (const x of [0.5, 2, 3.5]) K.add({ type: 'ia_cryo', x, y: 2.2 });
        K.blockRect(0, 2, 5, 2);
        K.add({ type: 'fridge', x: 9.5, y: 0.25 }); K.add({ type: 'fridge', x: 10.6, y: 0.25 }); K.blockRect(9, 0, 3, 1);
        T.npc(L, '시료 관리자', { x: 7, y: 3.6, face: '-x' }, { hat: 'beanie', accent: '#4e9cf6', carry: 'box', patrol: [{ x: 7, y: 3.6, face: '-x' }, { x: 10.5, y: 2, face: '-y' }] });
        K.wallX(0, W, 7, { glass: true, doors: [2, 13], h: 80 });
        L.patches.push({ x: 0, y: 7, w: W, d: H - 7, style: 'ia_hex', color: '#e6f2ec' });
        for (const y of [9.5, 13.5]) { K.add({ type: 'labBench', x: 2, y, w: 6 }); K.blockRect(2, Math.floor(y), 6, 1); k.stools(L, K, [3, 4.8, 6.6], y + 1.45, '-y', '실험대', '#7fd6bf'); }
        for (const [x, c] of [[15.5, '#4ef08a'], [17, '#5fd0ff'], [18.5, '#f2a7c3'], [20, '#f2c230']]) { K.add({ type: 'specimenTank', x, y: 8.5, color: c }); K.block(Math.floor(x), 8); }
        K.add({ type: 'ia_bsc', x: 22, y: 7.3, w: 2 }); K.add({ type: 'ia_bsc', x: 24.5, y: 7.3, w: 2 }); K.blockRect(22, 7, 5, 1);
        k.chairs(L, K, [[23, 8.9, '-y'], [25.5, 8.9, '-y']], '생물안전작업대');
        for (const y of [12, 15]) { K.add({ type: 'ia_growRack', x: 15, y, w: 4 }); K.blockRect(15, y, 4, 1); }
        K.add({ type: 'robotArm', x: 21.5, y: 12.5 }); K.block(21, 12);
        k.table(L, K, 24, 16, '실험실 휴게', '#ffffff', '#7fd6bf');
        K.add({ type: 'waterCooler', x: 26.3, y: 13.3 }); K.block(26, 13);
        T.npc(L, '연구원', { x: 4.5, y: 12.3, face: '-y' }, { anim: 'type', accent: '#ffffff', patrol: [{ x: 4.5, y: 12.3, face: '-y' }, { x: 9, y: 16.5, face: '-y' }] });
        T.npc(L, '연구원', { x: 20, y: 10.5, face: '-y' }, { anim: 'think', hat: 'beret', accent: '#ffffff', patrol: [{ x: 20, y: 10.5, face: '-y' }, { x: 20, y: 17, face: '-y' }, { x: 13, y: 12, face: '+x' }] });
        T.sign(L, 0.3, H - 0.3, '🧪 실험실', '#2f9e8f'); T.sign(L, 15, 16.6, '🌱 LED 재배랙', '#a64fd0', false); T.sign(L, 21.6, 9.6, '🧫 BSC', '#2f9e8f', false);
      }
      // ---- 온실 실험실
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 온실 실험실`, 'tile', '#e8efe2', 'office');
        L.desc = '생장 제어실 · 유리온실 2동 · LED 재배랙 · 실험 텃밭 · 나비';
        T.shell(L, K, { name: '🌡️ 생장 제어실', color: '#3f8a45', glass: true });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'raised', color: '#dfe6e0' });
        K.add({ type: 'nocWall', x: 0.4, y: 0.25, w: 8 }); K.blockRect(0, 0, 9, 1);
        const st = K.deskSeat(1, -0.6, 0, 'B', null);
        T.npc(L, '생장 제어 연구원', { x: st.x, y: st.y, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'bucket', accent: '#3f8a45' });
        k.chairs(L, K, [[5, 3.6, '-y'], [7, 3.6, '-y']], '생장 제어실');
        K.wallX(0, W, 7, { glass: true, doors: [8, 20], h: 80 });
        L.patches.push({ x: 0, y: 7, w: W, d: H - 7, style: 'ia_soil', color: '#b8a07a' });
        L.patches.push({ x: 0, y: 7, w: W, d: 1.6, style: 'tile', color: '#e8efe2' });
        K.add({ type: 'greenhouse', x: 1, y: 9, w: 6, d: 5 }); K.blockRect(1, 9, 6, 5);
        K.add({ type: 'greenhouse', x: 9, y: 9, w: 6, d: 5 }); K.blockRect(9, 9, 6, 5);
        for (const x of [17, 21, 25]) { K.add({ type: 'ia_growRack', x, y: 9, w: 2.8 }); K.blockRect(x, 9, 3, 1); }
        for (const x of [17, 22]) { K.add({ type: 'veggies', x, y: 13, w: 4, d: 2, seed: x }); K.blockRect(x, 13, 4, 2); }
        k.bench(L, K, 2, 16, 4, '온실 벤치', '#8a6247'); k.bench(L, K, 9, 16, 4, '온실 벤치', '#8a6247');
        k.stand(L, 18.5, 10.6, '-y', 'LED 재배랙 관찰', null); k.stand(L, 22.5, 10.6, '-y', 'LED 재배랙 관찰', null);
        K.add({ type: 'ia_butterflies', x: 20.5, y: 16.5, n: 5 });
        for (const [x, y] of [[27, 18], [0, 18], [15, 18]]) { K.add({ type: 'ia_monstera', x, y, size: 1.05 }); K.block(x, y); }
        T.npc(L, '식물학자', { x: 16, y: 16.5, face: '-y' }, { hat: 'bucket', accent: '#3f8a45', carry: 'paper', patrol: [{ x: 16, y: 16.5, face: '-y' }, { x: 26, y: 16, face: '-x' }, { x: 8, y: 15, face: '-y' }] });
        T.sign(L, 1, 14.5, '🌱 유리온실 A', '#3f8a45', false); T.sign(L, 9, 14.5, '🌱 유리온실 B', '#3f8a45', false); T.sign(L, 0.3, H - 0.3, '🌿 온실 실험실', '#3f8a45');
      }
      // ---- 옥상 정원 · 설비
      {
        const { L, K } = k.roof('R 옥상 정원·설비', 'deck', '#b7c9c2', '옥상 정원 · 냉각탑 · 저수조 · 파라솔 · DNA 조형물');
        L.decals.push({ type: 'hazard', x: 0.5, y: 3.6, w: 11, d: 3 });
        K.add({ type: 'chiller', x: 1, y: 4 }); K.blockRect(1, 4, 3, 2);
        K.add({ type: 'chiller', x: 5, y: 4 }); K.blockRect(5, 4, 3, 2);
        K.add({ type: 'waterTank', x: 10, y: 5.5 }); K.blockRect(9, 4, 2, 3);
        L.patches.push({ x: 0, y: 8, w: W, d: H - 8, style: 'grass', color: '#a6d28b' });
        for (const [x, y, c] of [[3, 10, '#7fd6bf'], [8, 10, '#e2667f'], [13, 10, '#4e9cf6'], [18, 10, '#f2c230']]) k.parasol(L, K, x, y, c, '옥상 정원');
        k.bench(L, K, 2, 15, 4, '정원 벤치'); k.bench(L, K, 8, 15, 4, '정원 벤치');
        K.add({ type: 'ia_dna', x: 22, y: 14 }); K.block(22, 14);
        for (const [x, y, b] of [[0, 9, false], [14, 15, true], [26, 9, true], [26, 18, false], [0, 18, true]]) k.tree(K, x, y, b);
        for (const x of [17, 19.6]) { K.add({ type: 'planter', x, y: H - 0.9, w: 2.2, seed: x }); K.blockRect(Math.floor(x), H - 1, 3, 1); }
        T.npc(L, '설비 기사', { x: 6, y: 7, face: '-y' }, { hat: 'hardhat', accent: '#c47f22', patrol: [{ x: 6, y: 7, face: '-y' }, { x: 11.5, y: 7, face: '-y' }, { x: 1, y: 7, face: '-y' }] });
        T.sign(L, 0.4, H - 0.4, '🌿 옥상 정원', '#3f8a45'); T.sign(L, 0.6, 7.2, '❄️ 냉각 설비', '#4e9cf6', false);
      }
      return finish(T, fac);
    },
  });

  // ================================================================ 🏭 스마트팩토리
  C.indoor({
    id: 'factory2', icon: '🏭', name: '스마트팩토리', desc: '쇼룸·출하장 로비 · 생산관리팀 · 스마트 생산라인 · 품질검사·자재창고 · 통합 통제실 · 옥상 태양광',
    build(S, o) {
      const W = 32, H = 22;
      const hz = (g, y, w, h) => { g.fillStyle = '#f2c230'; g.fillRect(0, y, w, h); g.fillStyle = '#2b2b2b'; for (let x = -h; x < w; x += 12) { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + 6, y + h); g.lineTo(x + 6 + h, y); g.lineTo(x + h, y); g.fill(); } };
      const fac = {
        wall: '#9aa3ab', texture: 'stripes', win: 'band', winColor: 'rgba(200,220,235,0.75)', frame: 'rgba(60,70,80,0.6)', trim: '#f2c230',
        sign: '🏭 AI SMART FACTORY', signBg: '#2b2b2b', signFg: '#f2c230', lobby: 'rgba(210,225,235,0.85)',
        paint(g, o) {
          const g0 = rowTop(o, 0);
          if (g0 != null) hz(g, g0 - 3, o.Wpx, 7);
          const top = rowTop(o, (fac.n || 1) - 1);
          if (top != null) hz(g, top, o.Wpx, 6);
          if (!o.south && g0 != null) {
            for (const x0 of [o.Wpx * 0.25, o.Wpx * 0.6]) { g.fillStyle = '#6d757c'; g.fillRect(x0, g0 + 10, 76, o.FP - 10); g.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = 0; i < 9; i++) g.fillRect(x0, g0 + 13 + i * 5, 76, 1.2); g.fillStyle = '#f2c230'; g.fillRect(x0 - 3, g0 + 8, 82, 3); }
          }
          if (!o.south && top != null) {
            const cx = o.Wpx / 2, cy = top + o.FP / 2 + 2;
            g.fillStyle = '#2b2b2b'; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + o.t * 0.3; g.save(); g.translate(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18); g.rotate(a); g.fillRect(-3.5, -3.5, 7, 7); g.restore(); }
            g.beginPath(); g.arc(cx, cy, 18, 0, 7); g.fill(); g.fillStyle = '#f2c230'; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill();
            g.fillStyle = '#2b2b2b'; g.font = `bold 5px ${FONT}`; g.textAlign = 'center'; g.fillText('AI', cx, cy + 2); g.textAlign = 'left';
          }
        },
      };
      const T = C.tower(S, { W, H, id: 'factory2', name: '🏭 스마트팩토리', facade: fac });
      const k = kit(T), CX = T.CX;

      // ---- 1F 로비 · 출하장
      {
        T.nextFloor();
        const { L, K } = T.level('1F 로비·출하장', 'concrete', '#c9c8c3');
        L.desc = '보안실 · 생산 현황판 · 쇼룸(로봇팔·머신·지게차) · 출하 대기장(팔레트 랙) · 안전 통로';
        T.shell(L, K, { name: T.securityRoom(L, K), color: '#2b3a67' });
        T.entrance(L, K);
        K.add({ type: 'ia_board', x: 1.5, y: 5, w: 8, kind: 'andon', title: '📊 오늘의 생산 현황', lines: ['1라인', '2라인', '검사', '출하'], z: 44, h: 36 });
        L.patches.push({ x: 0, y: 7, w: 13, d: 6, style: 'ia_steel', color: '#d5d9dd' });
        L.decals.push({ type: 'hazard', x: 0.5, y: 7.5, w: 12, d: 5 });
        K.add({ type: 'robotArm', x: 3, y: 10 }); K.blockRect(2, 9, 2, 2);
        K.add({ type: 'machine', x: 6, y: 9, w: 1.8, d: 1.35, seed: 3, color: '#dfe5ea' }); K.blockRect(6, 9, 2, 2);
        K.add({ type: 'forklift', x: 10, y: 9.5 }); K.blockRect(10, 9, 2, 1);
        for (const x of [21, 25]) { K.add({ type: 'palletRack', x, y: 7.2, w: 3, seed: x }); K.blockRect(x, 7, 3, 1); }
        K.add({ type: 'palletRack', x: 28.5, y: 7.2, w: 3, seed: 9 }); K.blockRect(28, 7, 4, 1);
        for (const x of [22.5, 26.5]) { K.add({ type: 'pallet', x, y: 10, count: 6 }); K.blockRect(Math.floor(x), 10, 2, 1); }
        for (const [x, y] of [[29, 11], [30, 12]]) { K.add({ type: 'ia_crates', x, y }); K.block(x, y); }
        K.add({ type: 'reception', x: 13.4, y: 13.6, w: 3 }); K.blockRect(13, 13, 4, 1);
        T.npc(L, '방문 접수', { x: 14.9, y: 12.9, face: '+y' }, { anim: 'type', hat: 'bow', accent: '#f2c230' });
        L.decals.push({ type: 'ia_walkway', x: 0, y: 15.4, w: W, d: 1.2 });
        k.wait(L, K, 1, 17, 6, '방문객 대기', '#f2c230');
        T.visitorSofa(L, K, 22, 17);
        k.plant(K, 0, 21, 1.1, 2); k.plant(K, 31, 21, 1.1, 5);
        K.add({ type: 'extinguisher', x: 31.5, y: 14.4 }); K.block(31, 14);
        T.npc(L, '안전관리자', { x: 16, y: 11, face: '+y' }, { hat: 'hardhat', accent: '#f2c230', say: '안전모 착용!', patrol: [{ x: 16, y: 11, face: '+y' }, { x: 3, y: 14, face: '+x' }, { x: 27, y: 14, face: '-x' }] });
        T.sign(L, 0.5, 12.8, '🤖 스마트 공정 쇼룸', '#c47f22'); T.sign(L, 21, 9.6, '📦 출하 대기장', '#c47f22');
      }
      k.work(o, {
        name: (n) => `${n}F 생산관리팀`, looks: [['ia_steel', '#c9ced3'], ['concrete', '#c9c8c3']],
        deco(L, K, n) {
          L.desc = '생산관리·MES 오피스 · ' + L.desc;
          for (const x of [11, 12]) { K.add({ type: 'ia_crates', x, y: H - 2, seed: x + n }); K.block(x, H - 2); }
          K.add({ type: 'forklift', x: 14, y: H - 1.8 }); K.blockRect(14, H - 2, 2, 1);
          T.sign(L, 11.2, H - 0.3, `🏭 ${n}F 생산관리팀`, '#c47f22');
        },
      });
      // ---- 스마트 생산라인 (+ 공구실)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 스마트 생산라인`, 'ia_steel', '#bfc5ca', 'factory');
        L.desc = '공구실 · 스마트 생산라인 2 (머신·로봇팔·컨베이어·비전검사) · 자재 랙 · AGV · 라인 휴게';
        T.shell(L, K, { name: '🧰 공구실', color: '#c47f22' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'concrete', color: '#c4c2bc' });
        K.add({ type: 'gearRack', x: 0.4, y: 0.3, w: 5 }); K.blockRect(0, 0, 6, 1);
        for (let i = 0; i < 5; i++) K.add({ type: 'partsBin', x: 7 + i * 0.6, y: 0.3, seed: i + 3 });
        K.blockRect(7, 0, 4, 1);
        K.add({ type: 'storageShelf', x: 12, y: 0.3, w: 3, seed: 2 }); K.blockRect(12, 0, 3, 1);
        T.npc(L, '공구 담당', { x: 8, y: 2.5, face: '-y' }, { hat: 'hardhat', accent: '#c47f22', anim: 'type' });
        k.bench(L, K, 1, 3, 4, '공구실 벤치', '#c47f22');
        for (const [ly, i] of [[8, 0], [15, 1]]) {
          L.decals.push({ type: 'hazard', x: 0.6, y: ly - 0.3, w: 14.8, d: 5.6 });
          for (let m = 0; m < 4; m++) { const x = 1 + m * 3.3; K.add({ type: 'machine', x, y: ly, w: 1.8, d: 1.35, seed: m + i * 7, color: ['#dfe5ea', '#e6e1d6', '#dde7e2', '#e4dfe9'][m] }); K.blockRect(Math.floor(x), ly, 2, 2); }
          K.add({ type: 'ia_conveyor', x: 1, y: ly + 2.6, w: 14, speed: 0.7 }); K.blockRect(1, ly + 2, 14, 2);
          K.add({ type: 'ia_scanner', x: 12, y: ly + 2.6 });
          for (const x of [3.5, 7.5]) { K.add({ type: 'robotArm', x, y: ly + 4.5 }); K.block(Math.floor(x), ly + 4); }
          T.npc(L, '라인 작업자', { x: 10, y: ly + 4.6, face: '-y' }, { hat: 'hardhat', accent: '#f2c230', anim: 'type', patrol: [{ x: 10, y: ly + 4.6, face: '-y' }, { x: 13.5, y: ly + 4.6, face: '-y' }, { x: 0.5, y: ly + 1, face: '+x' }] });
          T.sign(L, 0.7, ly + 5.5, `⚙️ ${i + 1}라인`, '#c47f22', false);
        }
        L.patches.push({ x: 17, y: 7, w: W - 17, d: H - 7, style: 'concrete', color: '#c9c8c3' });
        for (const x of [18, 22, 26]) { K.add({ type: 'palletRack', x, y: 7.2, w: 3, seed: x }); K.blockRect(x, 7, 3, 1); }
        K.add({ type: 'forklift', x: 29.5, y: 9 }); K.blockRect(29, 9, 2, 1);
        K.add({ type: 'robotDog', x: 21, y: 11 });
        L.decals.push({ type: 'ia_walkway', x: 16.2, y: 12.5, w: 15.8, d: 1 });
        k.table(L, K, 21, 15, '라인 휴게', '#ffffff', '#f2c230'); k.table(L, K, 25, 15, '라인 휴게', '#ffffff', '#f2c230');
        k.bench(L, K, 20, 19, 4, '라인 벤치', '#f2c230');
        K.add({ type: 'waterCooler', x: 29.3, y: 15.3 }); K.block(29, 15);
        K.add({ type: 'vending', x: 30.4, y: 15.3, color: '#e5534b' }); K.block(30, 15);
        T.npc(L, '라인장', { x: 16, y: 12, face: '-x' }, { hat: 'hardhat', accent: '#e5534b', carry: 'paper', say: '오늘 목표 1,200개!', patrol: [{ x: 16, y: 12, face: '-x' }, { x: 16, y: 20, face: '-x' }, { x: 28, y: 12, face: '-x' }] });
        T.sign(L, 18, 8.6, '📦 자재 랙', '#3f74b8', false); T.sign(L, 17.2, H - 0.3, '☕ 라인 휴게', '#7a4a2a'); T.sign(L, 20, 11.6, '🤖 AGV', '#3f74b8', false);
      }
      // ---- 품질검사 · 자재창고 (+ 정밀 측정실)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 품질검사·자재창고`, 'concrete', '#c4c6c4', 'factory');
        L.desc = '정밀 측정실 · 품질검사실(검사대·비전 컨베이어·3차원 측정기) · 자재창고(팔레트 랙 12·지게차)';
        T.shell(L, K, { name: '🔬 정밀 측정실', color: '#4e7cf6', glass: true });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'raised', color: '#e3e8ec' });
        K.add({ type: 'labBench', x: 0.5, y: 0.3, w: 6 }); K.blockRect(0, 0, 7, 1);
        for (const x of [8, 9.5]) { K.add({ type: 'model3d', x, y: 0.3 }); K.block(Math.floor(x), 0); }
        K.add({ type: 'drafting', x: 12, y: 1 }); K.blockRect(12, 1, 2, 1);
        k.chairs(L, K, [[2, 1.8, '-y'], [4.5, 1.8, '-y']], '정밀 측정실');
        T.npc(L, 'QA 엔지니어', { x: 9, y: 2.5, face: '-y' }, { anim: 'type', hat: 'cap', accent: '#4e7cf6' });
        K.wallX(0, W, 7, { glass: true, doors: [4, 22], h: 80 });
        K.wallY(7, H, 16, { h: 90, color: '#c9cfd4' });
        L.patches.push({ x: 0, y: 7, w: 16, d: H - 7, style: 'tile', color: '#e8ebee' });
        K.add({ type: 'ia_board', x: 6, y: 7, w: 5, kind: 'white', lines: ['✅ 양품률 99.7%', '⚠️ 불량 3건 (스크래치)', '📈 Cpk 1.67'], z: 70, h: 30 });
        for (const y of [9, 13]) { K.add({ type: 'labBench', x: 1, y, w: 6 }); K.blockRect(1, y, 6, 1); k.stools(L, K, [2, 3.8, 5.6], y + 1.45, '-y', '품질검사', '#4e7cf6'); }
        K.add({ type: 'ia_conveyor', x: 9, y: 10, w: 6, speed: 0.5 }); K.blockRect(9, 10, 6, 1);
        K.add({ type: 'ia_scanner', x: 11.5, y: 10 });
        k.stand(L, 11, 11.7, '-y', '비전검사 확인', null);
        K.add({ type: 'cleanroomTool', x: 11, y: 14, seed: 3 }); K.blockRect(11, 14, 2, 2);
        T.npc(L, '품질검사원', { x: 8, y: 17, face: '-y' }, { hat: 'cap', accent: '#3fb27f', carry: 'paper', patrol: [{ x: 8, y: 17, face: '-y' }, { x: 14.5, y: 12.5, face: '-y' }, { x: 0.5, y: 11.5, face: '+x' }] });
        T.sign(L, 0.3, H - 0.3, '✅ 품질검사실', '#3fb27f'); T.sign(L, 10.6, 16.6, '📐 3차원 측정기', '#4e7cf6', false);
        L.patches.push({ x: 16, y: 7, w: W - 16, d: H - 7, style: 'concrete', color: '#bdbfbd' });
        for (const y of [9, 13, 17]) for (const x of [17, 20.5, 24, 27.5]) { K.add({ type: 'palletRack', x, y, w: 3, seed: Math.round(x * 3 + y) }); K.blockRect(Math.floor(x), y, x % 1 ? 4 : 3, 1); }
        K.add({ type: 'forklift', x: 30.3, y: 11 }); K.blockRect(30, 11, 2, 1);
        for (const x of [17, 18]) { K.add({ type: 'ia_crates', x, y: 20, seed: x }); K.block(x, 20); }
        k.bench(L, K, 26, 20, 4, '창고 휴게', '#3f74b8');
        T.npc(L, '지게차 기사', { x: 22, y: 11.5, face: '+x' }, { hat: 'hardhat', accent: '#f2c230', patrol: [{ x: 17, y: 11.5, face: '+x' }, { x: 29, y: 15.5, face: '-x' }, { x: 22, y: 19, face: '+x' }] });
        T.sign(L, 16.3, H - 0.3, '📦 자재창고', '#3f74b8');
      }
      // ---- 통합 통제실 (+ 서버실)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 통합 통제실`, 'raised', '#d5d9dd', 'office');
        L.desc = '서버실 · 통합 통제실(대형 관제 화면 2·관제석 12·안돈) · 공장장석 · 라운지';
        T.shell(L, K, { name: '🖥️ 서버실', color: '#4f5a65' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'raised', color: '#cdd2d7' });
        for (const ry of [0.4, 2.6]) { for (let x = 0.5; x + 0.9 < 12; x += 1.05) K.add({ type: 'serverRack', x, y: ry }); K.blockRect(0, Math.floor(ry), 12, 1); }
        T.npc(L, '서버 엔지니어', { x: 6, y: 1.6, face: '-y' }, { hat: 'cap', accent: '#4f5a65', carry: 'paper', patrol: [{ x: 6, y: 1.6, face: '-y' }, { x: 13.5, y: 3.5, face: '-x' }, { x: 2, y: 3.8, face: '+x' }] });
        K.wallX(0, W, 7, { doors: [17], h: 104, color: '#4a5260' });
        L.patches.push({ x: 0, y: 7, w: W, d: H - 7, style: 'raised', color: '#3b4250' });
        K.add({ type: 'nocWall', x: 0.5, y: 7.05, w: 16 }); K.add({ type: 'nocWall', x: 18.5, y: 7.05, w: 13, gpu: true });
        K.add({ type: 'ia_board', x: 19, y: 7, w: 6, kind: 'andon', title: 'ANDON · 라인 상태', lines: ['1라인', '2라인'], z: 103, h: 18 });
        let q = 0;
        for (const oy of [6, 10]) for (let c = 0; c < 6; c++) {
          const st = K.deskSeat(2, oy, c, 'B', null);
          if (q++ % 3 === 0) T.npc(L, '관제 요원', { x: st.x, y: st.y, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'headphones', accent: '#5fd0ff' });
          else T.rest(L, { x: st.x, y: st.y, face: '-y', pose: 'sit' }, '통제실 관제석');
        }
        K.add({ type: 'execDesk', x: 21, y: 13, w: 2.6, d: 1, label: '👷 공장장' }); K.blockRect(21, 13, 3, 1);
        K.add({ type: 'bossChair', x: 22.3, y: 12.45 });
        T.npc(L, '공장장', { x: 22.3, y: 12.45, face: '+y', pose: 'sit' }, { anim: 'think', hat: 'hardhat', accent: '#f2c230', tie: '#2b3a67' });
        k.chairs(L, K, [[21, 15.4, '-y'], [23.6, 15.4, '-y']], '공장장 보고');
        k.sofa(L, K, 26, 18, '통제실 라운지');
        K.add({ type: 'roundTable', x: 27.5, y: 16.5, r: 0.45, color: '#ffffff' }); K.block(27, 16);
        K.add({ type: 'waterCooler', x: 31.3, y: 9.3 }); K.block(31, 9);
        k.plant(K, 31, 21, 1, 3); k.plant(K, 0, 21, 1, 6);
        T.sign(L, 0.3, H - 0.3, '🛰️ 통합 통제실', '#5fd0ff'); T.sign(L, 20.6, 14.6, '👷 공장장석', '#f2c230', false);
      }
      // ---- 옥상 태양광
      {
        const { L, K } = k.roof('R 옥상 태양광', 'concrete', '#b7b9b8', '태양광 발전(120kW) · ESS 배터리 · 옥상 휴게');
        K.add({ type: 'ia_solar', x: 1, y: 4, w: 14, d: 7 }); K.blockRect(1, 4, 14, 7);
        K.add({ type: 'ia_solar', x: 1, y: 13, w: 14, d: 7 }); K.blockRect(1, 13, 14, 7);
        K.add({ type: 'ia_solar', x: 25, y: 4, w: 6, d: 4 }); K.blockRect(25, 4, 6, 4);
        K.add({ type: 'batteryRack', x: 18, y: 5, w: 4 }); K.blockRect(18, 5, 4, 1);
        K.add({ type: 'upsCabinet', x: 22.5, y: 5 }); K.blockRect(22, 5, 3, 1);
        L.patches.push({ x: 17, y: 9, w: W - 17, d: H - 9, style: 'deck', color: '#c9a57a' });
        k.parasol(L, K, 19, 11, '#f2c230', '옥상 휴게'); k.parasol(L, K, 24, 11, '#3fb27f', '옥상 휴게'); k.parasol(L, K, 28, 14, '#4e9cf6', '옥상 휴게');
        k.bench(L, K, 18, 17, 4, '옥상 벤치'); k.bench(L, K, 24, 19, 4, '옥상 벤치');
        K.add({ type: 'waterTank', x: 30, y: 19 }); K.blockRect(29, 18, 2, 2);
        for (const [x, y] of [[17, 14], [31, 9]]) k.tree(K, x, y, true);
        T.npc(L, '태양광 점검원', { x: 8, y: 11.8, face: '-y' }, { hat: 'hardhat', accent: '#f2c230', carry: 'paper', patrol: [{ x: 1, y: 11.8, face: '+x' }, { x: 15, y: 11.8, face: '-x' }, { x: 8, y: 20.6, face: '-y' }] });
        T.sign(L, 0.4, H - 0.4, '☀️ 옥상 태양광 발전 (120kW)', '#e9a23b'); T.sign(L, 17.3, H - 0.4, '☕ 옥상 휴게', '#7a4a2a'); T.sign(L, 18, 6.4, '🔋 ESS', '#3fb27f', false);
      }
      return finish(T, fac);
    },
  });

  // ================================================================ 🌿 온실 오피스
  C.indoor({
    id: 'glasshouse', icon: '🌿', name: '온실 오피스', desc: '정글 로비 · 그린 오피스 · 수경재배 농장 · 허브 카페·나비 정원 · 옥상 텃밭',
    build(S, o) {
      const W = 26, H = 20;
      const fac = {
        wall: '#bfe3c8', texture: 'panel', win: 'glass', winColor: 'rgba(175,230,190,0.72)', frame: 'rgba(60,120,80,0.6)', trim: '#e9f5ec',
        sign: '🌿 GREEN AI OFFICE', signBg: '#2f7d4f', signFg: '#ffffff', lobby: 'rgba(200,240,210,0.85)', awning: '#3fb27f',
        paint(g, o) {
          const r = AIO.rand(o.len * 7 + (o.south ? 1 : 2));
          for (let k = Math.max(1, o.k0); k < o.k1; k++) {
            const y = rowTop(o, k) + o.FP - 5;
            for (let x = 2; x < o.Wpx; x += 7) { g.fillStyle = ['#5f9a48', '#77b35a', '#4f8a3e'][Math.floor(r() * 3)]; g.beginPath(); g.ellipse(x, y, 5, 3.6, 0, 0, 7); g.fill(); if (r() < 0.25) { g.fillStyle = ['#f07a8a', '#f6c445', '#ffffff'][Math.floor(r() * 3)]; g.beginPath(); g.arc(x + 1, y - 2, 1.4, 0, 7); g.fill(); } }
          }
          if (rowTop(o, (fac.n || 1) - 1) == null) return;
          for (let i = 0; i < Math.floor(o.Wpx / 40); i++) {
            const x0 = 12 + i * 40 + r() * 14, len = 30 + r() * Math.min(170, o.Hb * 0.6);
            g.strokeStyle = '#4f8a3e'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, 0); for (let y = 0; y < len; y += 4) g.lineTo(x0 + Math.sin(y * 0.15 + i) * 3, y); g.stroke();
            for (let y = 6; y < len; y += 7) { const sd = (y / 7) % 2 ? 1 : -1; g.fillStyle = sd > 0 ? '#77b35a' : '#5f9a48'; g.beginPath(); g.ellipse(x0 + Math.sin(y * 0.15 + i) * 3 + sd * 3, y, 3.4, 2.1, sd * 0.5, 0, 7); g.fill(); if (r() < 0.12) { g.fillStyle = '#f2a7c3'; g.beginPath(); g.arc(x0 + sd * 5, y + 2, 1.6, 0, 7); g.fill(); } }
          }
        },
      };
      const T = C.tower(S, { W, H, id: 'glasshouse', name: '🌿 온실 오피스', facade: fac });
      const k = kit(T), CX = T.CX;

      // ---- 1F 정글 로비
      {
        T.nextFloor();
        const { L, K } = T.level('1F 정글 로비', 'deck', '#c9a57a');
        L.desc = '식물 병원 · 정글 로비(실내 개울·연못·나무·나비) · 이끼 벽 · 해먹';
        T.shell(L, K, { name: '🪴 식물 병원', color: '#3f8a45' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'tile', color: '#e6efe2' });
        K.add({ type: 'flowerStand', x: 0.4, y: 0.4, w: 5, seed: 5 }); K.blockRect(0, 0, 6, 2);
        K.add({ type: 'labBench', x: 6.5, y: 0.3, w: 3.5 }); K.blockRect(6, 0, 4, 1);
        T.npc(L, '식물 의사', { x: 8, y: 2.2, face: '-y' }, { hat: 'bucket', accent: '#3f8a45', anim: 'think' });
        k.chairs(L, K, [[3, 3.3, '-y']], '식물 상담');
        T.entrance(L, K, { turnstiles: false });
        K.add({ type: 'ia_board', x: 0.6, y: 5, w: 9.5, kind: 'moss', text: '🌿 GREEN AI OFFICE', z: 44, h: 32 });
        L.patches.push({ x: 0, y: 7, w: 12, d: H - 7, style: 'grass', color: '#9fcf8a' });
        L.decals.push({ type: 'ia_stream', x: 1, y: 9, w: 8, d: 1 }); K.blockRect(1, 9, 8, 1);
        const cx = 5, cy = 13.5, rx = 2.6, ry = 1.7;
        L.decals.push({ type: 'pond', cx, cy, rx, ry });
        for (let i = Math.floor(cx - rx); i <= cx + rx; i++) for (let j = Math.floor(cy - ry); j <= cy + ry; j++) if (((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 < 1) K.block(i, j);
        K.add({ type: 'koi', x: 4.5, y: 13.4, seed: 3 }); K.add({ type: 'koi', x: 5.8, y: 13.8, seed: 7 });
        k.bench(L, K, 1, 17, 4, '연못 벤치', '#8a6247');
        k.tree(K, 20, 10, false, 1.3); k.tree(K, 9, 16, true, 1.2);
        for (const [x, y] of [[0, 8], [10, 8], [24, 12], [0, 19], [25, 19], [14, 10]]) { K.add({ type: 'ia_monstera', x, y, size: 1 + ((x + y) % 3) * 0.15 }); K.block(x, y); }
        K.add({ type: 'reception', x: 15.4, y: 8.6, w: 5 }); K.blockRect(15, 8, 6, 1);
        T.npc(L, '그린 컨시어지', { x: 17.9, y: 7.9, face: '+y' }, { anim: 'type', hat: 'bucket', accent: '#3fb27f' });
        K.add({ type: 'hammock', x: 15, y: 12.5 }); K.block(15, 12); K.block(17, 12);
        T.rest(L, { x: 16.3, y: 12.6, face: '+y', pose: 'sofa', approach: [16, 13] }, '해먹');
        T.visitorSofa(L, K, 19, 15);
        K.add({ type: 'ia_butterflies', x: 6, y: 12, n: 4 });
        T.sign(L, 1, 10.4, '💧 실내 개울', '#1f9fb4', false); T.sign(L, 0.3, H - 0.3, '🌴 정글 로비', '#3f8a45');
      }
      k.work(o, {
        name: (n) => `${n}F 그린 오피스`, looks: [['wood', '#dcc9a3'], ['carpet', '#d6e6cf']],
        deco(L, K, n) {
          L.desc = '그린 오피스(식물 가득) · ' + L.desc;
          K.add({ type: 'ia_monstera', x: 10, y: H - 2, size: 1.1 }); K.block(10, H - 2);
          K.add({ type: 'flowerStand', x: 11.4, y: H - 1.7, w: 2.5, seed: n }); K.blockRect(11, H - 2, 3, 1);
          K.add({ type: 'ia_monstera', x: 14, y: H - 2, size: 0.95, pot: '#f4f1ec' }); K.block(14, H - 2);
          K.add({ type: 'ia_monstera', x: W - 1, y: 9, size: 1, pot: '#c96a3a' }); K.block(W - 1, 9);
          T.sign(L, 10.2, H - 0.3, `🌱 ${n}F 그린 오피스`, '#3f8a45');
        },
      });
      // ---- 수경재배 농장 (+ 양액 조제실 · LED 재배실 · 직판장)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 수경재배 농장`, 'tile', '#e6efe6', 'office');
        L.desc = '양액 조제실 · 수경재배 랙 6 · 수확 로봇 · LED 재배실 · 직판장 · 수확 휴게';
        T.shell(L, K, { name: '🧪 양액 조제실', color: '#1f9fb4' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'tile', color: '#e2eef0' });
        K.add({ type: 'labBench', x: 0.5, y: 0.3, w: 5 }); K.blockRect(0, 0, 6, 1);
        for (const [x, c] of [[7, '#7cc472'], [8.5, '#5fb2e0']]) { K.add({ type: 'specimenTank', x, y: 0.7, color: c }); K.block(Math.floor(x), 0); }
        T.npc(L, '양액 연구원', { x: 3, y: 1.6, face: '-y' }, { anim: 'type', hat: 'bucket', accent: '#1f9fb4' });
        k.chairs(L, K, [[5, 3.4, '-y']], '양액 조제실');
        K.wallX(0, W, 7, { glass: true, doors: [8, 16], h: 80 });
        L.patches.push({ x: 0, y: 7, w: 16, d: H - 7, style: 'tile', color: '#eef4ea' });
        for (const y of [9, 12, 15]) { K.add({ type: 'ia_hydro', x: 1, y, w: 6 }); K.blockRect(1, y, 6, 1); K.add({ type: 'ia_hydro', x: 8.5, y, w: 6 }); K.blockRect(8, y, 7, 1); }
        k.stand(L, 3.5, 10.6, '-y', '수확 체험', null); k.stand(L, 11, 13.6, '-y', '수확 체험', null);
        K.add({ type: 'robotDog', x: 7.5, y: 14 });
        T.npc(L, '도시농부', { x: 4, y: 17.5, face: '-y' }, { hat: 'bucket', accent: '#3f8a45', carry: 'box', patrol: [{ x: 4, y: 17.5, face: '-y' }, { x: 7.5, y: 10.5, face: '-y' }, { x: 13, y: 16.5, face: '-y' }] });
        K.wallY(7, H, 16, { glass: true, h: 80, doors: [17] });
        L.patches.push({ x: 16, y: 7, w: W - 16, d: H - 7, style: 'tile', color: '#e6ece4' });
        L.decals.push({ type: 'floor', x: 16.1, y: 7.1, w: 9.8, d: 6, color: 'rgba(212,107,255,0.14)' });
        for (const y of [8.5, 11.5]) { K.add({ type: 'ia_growRack', x: 17, y, w: 8 }); K.blockRect(17, Math.floor(y), 8, 1); }
        K.add({ type: 'till', x: 18, y: 16, w: 3, label: '🥬 오늘 수확 판매', color: '#e8f5ec' }); K.blockRect(18, 16, 3, 1);
        T.npc(L, '직판장 농부', { x: 19.5, y: 15.4, face: '+y' }, { hat: 'bucket', accent: '#3f8a45', carry: 'box' });
        K.add({ type: 'veggies', x: 22, y: 15.5, w: 3, d: 1.5, seed: 4 }); K.blockRect(22, 15, 3, 2);
        k.table(L, K, 19, 18, '수확 휴게', '#ffffff', '#8fc46a'); k.table(L, K, 23, 18, '수확 휴게', '#ffffff', '#8fc46a');
        T.sign(L, 0.3, H - 0.3, '🥬 수경재배 농장', '#3f8a45'); T.sign(L, 16.3, 13.8, '💜 LED 재배실', '#a64fd0', false); T.sign(L, 16.3, H - 0.3, '🛒 직판장', '#2f9e5f');
      }
      // ---- 허브 카페 · 나비 정원 (+ 티 블렌딩룸)
      {
        const n = T.nextFloor();
        const { L, K } = T.level(`${n}F 허브 카페·나비 정원`, 'deck', '#c9a57a', 'office');
        L.desc = '티 블렌딩룸 · 허브 카페(허브 바·테이블 5) · 나비 정원(꽃 아치·새 물그릇·꽃밭)';
        T.shell(L, K, { name: '🍵 티 블렌딩룸', color: '#2f7d4f' });
        L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'wood', color: '#e2cfae' });
        K.add({ type: 'storageShelf', x: 0.4, y: 0.3, w: 3, seed: 7 }); K.blockRect(0, 0, 4, 1);
        K.add({ type: 'ia_herbBar', x: 4.5, y: 1.2, w: 5, text: '🍵 TEA BLEND' }); K.blockRect(4, 1, 6, 2);
        k.stools(L, K, [5.2, 6.8, 8.4], 3.5, '-y', '티 시음', '#8a6247');
        T.npc(L, '티 소믈리에', { x: 7, y: 0.6, face: '+y' }, { anim: 'type', hat: 'beret', accent: '#2f7d4f' });
        K.wallX(0, W, 7, { glass: true, doors: [4, 18], h: 80 });
        K.wallY(7, H, 12, { glass: true, doors: [14], h: 80 });
        L.patches.push({ x: 0, y: 7, w: 12, d: H - 7, style: 'wood', color: '#d9b98f' });
        K.add({ type: 'ia_herbBar', x: 6.4, y: 8.2, w: 5 }); K.blockRect(6, 8, 6, 1);
        T.npc(L, '허브 바리스타', { x: 8.5, y: 7.6, face: '+y' }, { anim: 'type', hat: 'bucket', accent: '#3fb27f' });
        k.barStools(L, K, [7, 8.2, 9.4, 10.6], 9.75, '허브 바');
        for (const [x, y] of [[2, 12], [6, 12], [2, 16], [6, 16], [10, 16]]) k.table(L, K, x, y, '허브 카페', '#ffffff', '#8fc46a');
        K.add({ type: 'flowerStand', x: 0.4, y: 8.2, w: 3, seed: 2 }); K.blockRect(0, 8, 3, 2);
        K.add({ type: 'ia_monstera', x: 10, y: 12 }); K.block(10, 12);
        T.sign(L, 0.3, H - 0.3, '🌿 허브 카페', '#2f7d4f');
        L.patches.push({ x: 12, y: 7, w: W - 12, d: H - 7, style: 'grass', color: '#a6d28b' });
        L.decals.push({ type: 'meadow', x: 12, y: 7, w: W - 12, d: H - 7 }, { type: 'flowers', x: 13, y: 8, w: 4, d: 2 }, { type: 'flowers', x: 21, y: 8, w: 4, d: 2 }, { type: 'flowers', x: 13, y: 17, w: 3, d: 2 });
        K.blockRect(13, 8, 4, 2); K.blockRect(21, 8, 4, 2); K.blockRect(13, 17, 3, 2);
        K.add({ type: 'ia_flowerArch', x: 17, y: 11, w: 3 }); K.block(17, 11); K.block(19, 11);
        K.add({ type: 'birdbath', x: 22.5, y: 13.5 }); K.block(22, 13);
        for (const [x, y, c] of [[25, 11, '#f07a8a'], [14, 14, '#f6c445'], [25, 16, '#b38cf0'], [21, 18, '#ff9a5a']]) { K.add({ type: 'flowerBush', x: x + 0.5, y: y + 0.5, size: 1, seed: x * 3 + y, color: c }); K.block(x, y); }
        for (const [x, y] of [[15, 12], [20, 15], [23, 10]]) K.add({ type: 'ia_butterflies', x, y, n: 4 });
        k.bench(L, K, 17, 16, 4, '나비 정원 벤치', '#8a6247'); k.bench(L, K, 22, 18, 3, '나비 정원 벤치', '#8a6247');
        T.npc(L, '나비 해설사', { x: 18, y: 13.5, face: '+y' }, { hat: 'bucket', accent: '#f6c445', say: '🦋 날개를 만지지 마세요', patrol: [{ x: 18, y: 13.5, face: '+y' }, { x: 13, y: 15, face: '+x' }, { x: 24, y: 14.5, face: '-x' }] });
        T.sign(L, 12.3, H - 0.3, '🦋 나비 정원', '#e9a23b');
      }
      // ---- 옥상 텃밭
      {
        const { L, K } = k.roof('R 옥상 텃밭', 'deck', '#c9a57a', '옥상 텃밭 · 미니 온실 · 닭장 · 피크닉 테이블 · 빗물 저장조');
        L.patches.push({ x: 0, y: 3, w: CX, d: H - 3, style: 'ia_soil', color: '#a88a62' });
        for (const [x, y] of [[1, 4], [5, 4], [1, 7], [5, 7], [1, 11], [5, 11]]) { K.add({ type: 'veggies', x, y, w: 3, d: 2, seed: x * 3 + y }); K.blockRect(x, y, 3, 2); }
        k.stand(L, 2.5, 6.5, '-y', '텃밭 가꾸기', null); k.stand(L, 6.5, 10.5, '-y', '텃밭 가꾸기', null);
        K.add({ type: 'greenhouse', x: 18, y: 5, w: 6, d: 4 }); K.blockRect(18, 5, 6, 4);
        K.add({ type: 'coop', x: 13, y: 5 }); K.blockRect(13, 5, 2, 3);
        K.add({ type: 'picnicTable', x: 13, y: 12 }); K.blockRect(13, 11, 3, 4);
        for (const [x, y, face, ap] of [[13.8, 11.75, '+y', [13, 10]], [15.2, 11.75, '+y', [15, 10]], [13.8, 14.25, '-y', [13, 15]], [15.2, 14.25, '-y', [15, 15]]]) T.rest(L, { x, y, face, pose: 'sit', approach: ap }, '피크닉 테이블');
        k.parasol(L, K, 19, 11, '#3fb27f', '옥상 텃밭 카페'); k.parasol(L, K, 23, 11, '#f6c445', '옥상 텃밭 카페');
        k.bench(L, K, 19, 15, 4, '옥상 벤치', '#8a6247');
        K.add({ type: 'waterTank', x: 25, y: 17.5 }); K.blockRect(24, 16, 2, 3);
        for (const [x, y] of [[0, 15], [10, 17], [17, 18]]) k.tree(K, x, y, y > 16);
        K.add({ type: 'basket', x: 9.5, y: 6.5 }); K.block(9, 6);
        T.npc(L, '도시농부', { x: 4, y: 10, face: '+y' }, { hat: 'bucket', accent: '#3f8a45', carry: 'box', patrol: [{ x: 4, y: 10, face: '+y' }, { x: 8.5, y: 13.5, face: '-y' }, { x: 4, y: 6, face: '-y' }] });
        T.sign(L, 0.4, H - 0.4, '🥕 옥상 텃밭', '#3f8a45'); T.sign(L, 18, 9.6, '🌱 미니 온실', '#3f8a45', false); T.sign(L, 12.6, 8.4, '🐔 닭장', '#c43d32', false);
      }
      return finish(T, fac);
    },
  });
})();
