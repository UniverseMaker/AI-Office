// Building interiors of the AI campus (the outdoor map is campusmap.js).
//   연구동 (tower)  1F 로비·카페·보안실·창고·청소원 휴게실·택배실 / 연구소 층 × n / 서버실 / GPU 학습 서버실 / 임원층 / R 옥상정원
//   공장동          long-stopped sessions: production lines + machine cells, 관리실·비품실·화장실·휴게실, overhead dock doors
//   경찰서          유치장 (jailed sessions) · 은행 출장소: 금고 (vaulted sessions)
// Every tower floor shares the same plate (TW × TH) and elevator core, and is raised by zBase when shown.
(function () {
  const LY = AIO.layout;
  const { shade, rgba } = AIO.iso;
  const TW = 40, TH = 24;      // tower floor plate
  const CORE = 12;             // elevator core (with restrooms) x on every tower floor, 12 wide
  const FLOOR_PX = 58;         // height of one storey

  function level(S, name, o) {
    const L = LY.newLevel(S, name, o);
    L.decals = []; L.northWindows = []; L.ox = 0; L.oy = 0; L.zBase = 0;
    L.short = o.short || name.split(' ')[0];
    L.bld = o.bld;
    return L;
  }
  const rest = (S, L, spot, tag) => S.rest.push({ lv: L.idx, tag, carry: 'mug', ...spot });
  const npc = (S, L, o) => S.npcs.push({ lv: L.idx, ...o, home: { lv: L.idx, ...o.home }, patrol: o.patrol ? o.patrol.map((p) => ({ lv: L.idx, pose: 'stand', ...p })) : null });
  /** restroom as separate pieces (tiled back wall, two stalls, sinks on the west wall) so each sorts on its own */
  function restroomPieces(K, rx, kind) {
    K.add({ type: 'restroomWall', x: rx, y: 0, w: 3, kind });
    for (let k = 0; k < 2; k++) K.add({ type: 'stall', x: rx + 0.1 + k * 1.45, y: 0, kind, k });
    K.add({ type: 'sinks', x: rx + 0.05, y: 2.6, kind });
    K.blockRect(rx, 0, 3, 2); K.blockRect(rx, 2, 1, 3);
  }
  const windowsLeft = (L) => { L.windows = []; for (let wy = 8.6; wy + 2 < TH - 0.4; wy += 3.4) L.windows.push(wy + 2); };

  // ---------------------------------------------------------------- shared pieces
  /** elevator hall in the middle + men's / women's restrooms on both sides (roof: elevator penthouse instead) */
  function core(S, L, K, roof) {
    const x0 = CORE;
    L.patches.push({ x: x0 + 3, y: 0, w: 6, d: roof ? 3 : 6, style: 'marble', color: '#efece6' });
    L.elev = [];
    for (const [car, cx] of [[0, x0 + 3], [1, x0 + 6]]) {
      K.add({ type: 'elevCab', x: cx, y: 0, w: 2, d: 2, car });
      K.add({ type: 'elevDoor', x: cx, y: 0, w: 2, d: 2, car, label: L.short });
      K.blockRect(cx, 0, 2, 2);
      L.elev.push({ car, hall: { x: cx + 1, y: 2.75 }, cabin: { x: cx + 1, y: 1.0 } });
    }
    K.add({ type: 'elevPanel', x: x0 + 5.5, y: 0.35, label: L.short }); K.block(x0 + 5, 0);
    K.add({ type: 'plant', x: x0 + 8.5, y: 0.6, size: 0.7, seed: L.idx * 5 }); K.block(x0 + 8, 0);
    if (roof) {
      K.add({ type: 'hutShell', x: x0 + 3, y: 0, w: 6, d: 3 });
      K.wallY(0, 3, x0 + 3, { h: 82, color: '#e6e0d6' });
      K.wallY(0, 3, x0 + 9, { h: 82, color: '#e6e0d6' });
      K.wallX(x0 + 3, x0 + 9, 3, { h: 82, color: '#e6e0d6', doors: [x0 + 4, x0 + 7] });
      return;
    }
    for (const [rx, kind, door] of [[x0, 'm', x0 + 1], [x0 + 9, 'f', x0 + 10]]) {
      L.patches.push({ x: rx, y: 0, w: 3, d: 6, style: 'tile', color: kind === 'm' ? '#e4edf5' : '#f8e9ee' });
      restroomPieces(K, rx, kind);
      K.wallX(rx, rx + 3, 6, { glass: false, h: 40, doors: [door], color: kind === 'm' ? '#dfe8f0' : '#f3e1e7' });
      L.signs.push({ x: rx + 0.2, y: 5.7, text: kind === 'm' ? '🚹 남' : '🚺 여', color: kind === 'm' ? '#4e7cf6' : '#e2667f', room: true });
    }
    for (const x of [x0, x0 + 3, x0 + 9, x0 + 12]) K.wallY(0, 6, x, { h: 44, color: '#ece7df' });
  }

  function office(S, L, K, ox, w, team, o = {}) {
    const lv = L.idx;
    L.patches.push({ x: ox, y: 0, w, d: 6, style: 'carpet', color: o.carpet || (team ? shade(team.color, 0.8) : '#d9d3c9') });
    K.add({ type: 'bookshelf', x: ox + 0.4, y: 0.3, w: 2.2, seed: ox + lv }); K.blockRect(ox, 0, 3, 1);
    const dx = ox + (o.deskX ?? (w - 2.6) / 2);
    K.add({ type: 'execDesk', x: dx, y: 2.05, w: 2.6, d: 1.0, seatKey: team?.lead || null, label: o.label || (team ? '👔 팀장' : '비어 있음') });
    K.blockRect(Math.floor(dx), 2, Math.ceil(dx + 2.6) - Math.floor(dx), 1);
    const seat = { key: team?.lead, lv, x: dx + 1.3, y: 1.45, face: '+y', pose: 'sit', lead: true };
    if (o.boss) K.add({ type: 'bossChair', x: seat.x, y: seat.y });
    else { K.add({ type: 'chair', x: seat.x, y: seat.y, face: '+y', part: 'seat', premium: true }); K.add({ type: 'chair', x: seat.x, y: seat.y, face: '+y', part: 'back', premium: true }); }
    if (team) {
      S.seats.set(team.lead, seat);
      S.reportSpots.set(team.lead, [{ lv, x: dx + 1.3, y: 3.45, face: '-y' }, { lv, x: dx + 2.95, y: 3.5, face: '-x' }, { lv, x: dx - 0.35, y: 3.5, face: '+x' }]);
    }
    if (o.npc) npc(S, L, { ...o.npc, home: { x: seat.x, y: seat.y, face: '+y', pose: 'sit' } });
    K.add({ type: 'armchair', x: dx + 0.3, y: 4.45, color: o.chair || '#d9cbb7' }); K.block(Math.floor(dx + 0.3), 4);
    K.add({ type: 'armchair', x: dx + 2.3, y: 4.45, color: o.chair || '#d9cbb7' }); K.block(Math.floor(dx + 2.3), 4);
    K.add({ type: 'plant', x: ox + w - 0.55, y: 0.6, size: 0.9, seed: ox + 3 }); K.block(ox + w - 1, 0);
    if (o.extra) o.extra(K, ox, w);
    K.wallX(ox, ox + w, 6, { glass: true, doors: [ox + w - 1] });
    L.northWindows.push(ox + Math.max(2.6, w / 2 + 0.4));
    L.signs.push({ x: ox + 0.35, y: 5.7, text: o.sign || (team ? `👔 ${team.title}` : '빈 팀장실'), color: team ? team.color : o.signColor || '#9a9a9a', team: !!team, key: team?.lead, room: !team });
  }

  function meetingRoom(S, L, K, ox, w, title = '🗣️ 회의실', o = {}) {
    const lv = L.idx, y0 = o.y0 || 0;
    L.patches.push({ x: ox, y: y0, w, d: 6, style: 'carpet', color: o.carpet || '#c9d2dc' });
    if (o.bigScreen) K.add({ type: 'bigScreen', x: ox + w / 2 - 2.5, y: y0 + 0.25, w: 5 }); else K.add({ type: 'tv', x: ox + w / 2 - 1.6, y: y0 + 0.3, w: 3.2 });
    K.blockRect(ox + 1, y0, w - 2, 1);
    const n = w - 3;
    for (let i = 0; i < n; i++) K.add({ type: 'tableSeg', x: ox + 1.5 + i, y: y0 + 2.5, w: 1, d: 1.1 });
    K.blockRect(ox + 1, y0 + 2, n + 1, 2);
    for (let i = 0; i < n - 1; i++) {
      const x = ox + 2.1 + i * ((n - 0.9) / Math.max(1, n - 1));
      for (const [y, face] of [[y0 + 1.9, '+y'], [y0 + 4.15, '-y']]) {
        K.add({ type: 'chair', x, y, face, part: 'seat', premium: true });
        K.add({ type: 'chair', x, y, face, part: 'back', premium: true });
        S.meeting.push({ lv, x, y, face, pose: 'sit' });
      }
    }
    K.add({ type: 'plant', x: ox + w - 0.55, y: y0 + 5.3, size: 0.85, seed: ox }); K.block(ox + w - 1, y0 + 5);
    if (!y0) { K.wallX(ox, ox + w, 6, { glass: true, doors: [ox + 1] }); L.northWindows.push(ox + w - 2.5); }
    else K.wallX(ox, ox + w, y0, { glass: true, doors: [ox + 1] });
    L.signs.push({ x: ox + 0.35, y: y0 + (y0 ? 0.6 : 5.7), text: title, color: '#6b5b4a', room: true });
  }

  function breakRoom(S, L, K, ox, w, tag) {
    L.patches.push({ x: ox, y: 0, w, d: 6, style: 'tile', color: '#eef2ea' });
    K.add({ type: 'cabinet', x: ox + 0.35, y: 0.35, w: 2.4, coffee: true }); K.blockRect(ox, 0, 3, 1);
    K.add({ type: 'vending', x: ox + 3.3, y: 0.25, color: '#e5534b' }); K.block(ox + 3, 0);
    if (w >= 8) { K.add({ type: 'vending', x: ox + 4.3, y: 0.25, color: '#4e7cf6' }); K.block(ox + 4, 0); }
    K.add({ type: 'plant', x: ox + w - 0.55, y: 0.6, size: 0.9, seed: ox + 9 }); K.block(ox + w - 1, 0);
    rest(S, L, { x: ox + 1.5, y: 1.6, face: '-y', pose: 'stand' }, tag);
    const tx = ox + Math.min(3.5, w / 2);
    K.add({ type: 'roundTable', x: tx, y: 3.5, r: 0.6, color: '#f7f6f2' }); K.block(Math.floor(tx), 3);
    for (const [dx, dy, face, color] of [[-1.1, 0, '+x', '#a9c2d6'], [1.1, 0, '-x', '#f2b5b5'], [0, -1.1, '+y', '#b8d8b0'], [0, 1.1, '-y', '#f3d48c']]) {
      K.add({ type: 'stool', x: tx + dx, y: 3.5 + dy, color });
      rest(S, L, { x: tx + dx, y: 3.5 + dy, face, pose: 'sit' }, tag);
    }
    if (w >= 8) {
      K.add({ type: 'sofa', x: ox + w - 3.4, y: 3.3, w: 2.6 }); K.blockRect(ox + w - 4, 3, 3, 1);
      [0.6, 1.6].forEach((d) => rest(S, L, { x: ox + w - 3.4 + d, y: 3.92, face: '+y', pose: 'sofa', approach: [Math.floor(ox + w - 3.4 + d), 4] }, tag));
    }
    K.wallX(ox, ox + w, 6, { glass: true, doors: [ox + 1] });
    L.signs.push({ x: ox + 0.35, y: 5.7, text: '☕ 휴게실', color: '#3f8a45', room: true });
  }

  const sideWalls = (K, xs) => { for (const x of xs) K.wallY(0, 6, x, { h: 44, color: '#ece7df' }); };

  // ---------------------------------------------------------------- open-office blocks: desks first, a few useful corners
  function corners(S, L, K, tag) {
    const r = (k) => rest(S, L, k, tag);
    return {
      collab: () => ({ w: 6, d: 6, place(ox, oy) {
        K.add({ type: 'whiteboard', x: ox + 1.6, y: oy + 0.5, w: 2.6, podKey: null, color: '#3fb27f' }); K.blockRect(ox + 1, oy, 4, 1);
        K.add({ type: 'roundTable', x: ox + 3, y: oy + 3.2, r: 0.95, color: '#f7f6f2' }); K.blockRect(ox + 2, oy + 2, 2, 2);
        for (const [dx, dy, face, c] of [[-1.35, 0, '+x', '#a9c2d6'], [1.35, 0, '-x', '#f2b5b5'], [0, -1.35, '+y', '#b8d8b0'], [0, 1.35, '-y', '#f3d48c']]) { K.add({ type: 'stool', x: ox + 3 + dx, y: oy + 3.2 + dy, color: c }); r({ x: ox + 3 + dx, y: oy + 3.2 + dy, face, pose: 'sit' }); }
        L.signs.push({ x: ox + 0.5, y: oy + 5.6, text: '🤝 협업 테이블', color: '#3f8a45' });
      } }),
      booths: () => ({ w: 4, d: 6, place(ox, oy) {
        K.add({ type: 'phoneBooth', x: ox + 0.4, y: oy + 0.6, color: '#3f74b8' }); K.blockRect(ox, oy, 2, 2);
        K.add({ type: 'phoneBooth', x: ox + 2.4, y: oy + 0.6, color: '#2f7d4f' }); K.blockRect(ox + 2, oy, 2, 2);
        K.add({ type: 'printer', x: ox + 0.6, y: oy + 3.4 }); K.blockRect(ox, oy + 3, 2, 1);
        K.add({ type: 'waterCooler', x: ox + 2.6, y: oy + 3.4 }); K.block(ox + 2, oy + 3);
        L.signs.push({ x: ox + 0.3, y: oy + 5.6, text: '📞 집중부스', color: '#3f74b8' });
      } }),
      library: () => ({ w: 6, d: 6, place(ox, oy) {
        K.add({ type: 'bookshelf', x: ox + 0.3, y: oy + 0.25, w: 2.6, seed: ox * 5 }); K.add({ type: 'bookshelf', x: ox + 3.1, y: oy + 0.25, w: 2.6, seed: ox * 5 + 1 }); K.blockRect(ox, oy, 6, 1);
        K.add({ type: 'armchair', x: ox + 1.4, y: oy + 3.0, color: '#b79c74' }); K.block(ox + 1, oy + 3);
        K.add({ type: 'armchair', x: ox + 4.4, y: oy + 3.0, color: '#b79c74' }); K.block(ox + 4, oy + 3);
        K.add({ type: 'lamp', x: ox + 2.9, y: oy + 2.6 }); L.lamps.push({ x: ox + 2.9, y: oy + 2.6 }); K.block(ox + 2, oy + 2);
        r({ x: ox + 1.4, y: oy + 2.98, face: '-y', pose: 'sit', approach: [ox + 1, oy + 4] }); r({ x: ox + 4.4, y: oy + 2.98, face: '-y', pose: 'sit', approach: [ox + 4, oy + 4] });
        L.signs.push({ x: ox + 0.5, y: oy + 5.6, text: '📚 논문 라이브러리', color: '#7a5540' });
      } }),
      lab: () => ({ w: 6, d: 6, place(ox, oy) {
        K.add({ type: 'labBench', x: ox + 0.5, y: oy + 1.0, w: 5 }); K.blockRect(ox, oy + 1, 6, 1);
        K.add({ type: 'labBench', x: ox + 0.5, y: oy + 3.6, w: 5 }); K.blockRect(ox, oy + 3, 6, 1);
        r({ x: ox + 1.8, y: oy + 2.55, face: '-y', pose: 'stand' }); r({ x: ox + 4.2, y: oy + 4.95, face: '-y', pose: 'stand' });
        L.signs.push({ x: ox + 0.5, y: oy + 5.6, text: '🧪 실험 벤치', color: '#1f9fb4' });
      } }),
      robot: () => ({ w: 6, d: 6, place(ox, oy) {
        L.decals.push({ type: 'floor', x: ox + 0.5, y: oy + 0.5, w: 5, d: 4.6, color: '#d5d9dd' });
        A_hazard(L, ox + 0.5, oy + 0.5, 5, 4.6);
        K.add({ type: 'robotArm', x: ox + 2, y: oy + 2.2 }); K.blockRect(ox + 1, oy + 1, 2, 2);
        K.add({ type: 'robotDog', x: ox + 4.2, y: oy + 3.4 }); K.block(ox + 4, oy + 3);
        L.signs.push({ x: ox + 0.5, y: oy + 5.6, text: '🤖 로봇 테스트베드', color: '#4f5a65' });
      } }),
      // ---- front strip (d = 4)
      printers: () => ({ w: 6, d: 4, place(ox, oy) {
        K.add({ type: 'printer', x: ox + 0.5, y: oy + 1.2 }); K.blockRect(ox, oy + 1, 2, 1);
        K.add({ type: 'waterCooler', x: ox + 2, y: oy + 1.2 }); K.block(ox + 2, oy + 1);
        K.add({ type: 'bookshelf', x: ox + 3, y: oy + 1, w: 2.6, seed: ox }); K.blockRect(ox + 3, oy + 1, 3, 1);
        L.signs.push({ x: ox + 0.5, y: oy + 3.4, text: '🖨️ 복합기', color: '#6b5b4a' });
      } }),
      plants: () => ({ w: 4, d: 4, place(ox, oy) {
        K.add({ type: 'plant', x: ox + 1, y: oy + 1.5, size: 1.25, seed: ox * 7 }); K.block(ox + 1, oy + 1);
        K.add({ type: 'plant', x: ox + 2.8, y: oy + 2, size: 0.95, seed: ox * 7 + 3 }); K.block(ox + 2, oy + 2);
      } }),
      sofaRow: () => ({ w: 6, d: 4, place(ox, oy) {
        K.add({ type: 'sofa', x: ox + 1.2, y: oy + 1.1, w: 3.4 }); K.blockRect(ox + 1, oy + 1, 4, 1);
        [0.7, 1.7, 2.7].forEach((d) => r({ x: ox + 1.2 + d, y: oy + 1.72, face: '+y', pose: 'sofa', approach: [Math.floor(ox + 1.2 + d), oy + 2] }));
        K.add({ type: 'roundTable', x: ox + 2.9, y: oy + 3.0, r: 0.4, color: '#efe7da' }); K.block(ox + 2, oy + 3);
      } }),
      boards: () => ({ w: 5, d: 4, place(ox, oy) {
        K.add({ type: 'whiteboard', x: ox + 0.4, y: oy + 1.2, w: 2.0, podKey: null, color: '#4e7cf6' }); K.blockRect(ox, oy + 1, 3, 1);
        K.add({ type: 'whiteboard', x: ox + 2.6, y: oy + 1.2, w: 2.0, podKey: null, color: '#e9a23b' }); K.blockRect(ox + 2, oy + 1, 3, 1);
      } }),
      aquarium: () => ({ w: 5, d: 4, place(ox, oy) { K.add({ type: 'aquarium', x: ox + 0.5, y: oy + 1.2, w: 3.6 }); K.blockRect(ox, oy + 1, 5, 1); } }),
      poster: () => ({ w: 5, d: 4, place(ox, oy) { K.add({ type: 'posterBoard', x: ox + 0.5, y: oy + 1.2, w: 4 }); K.blockRect(ox, oy + 1, 5, 1); L.signs.push({ x: ox + 0.5, y: oy + 3.4, text: '📰 연구 포스터', color: '#7a5540' }); } }),
    };
  }
  const A_hazard = (L, x, y, w, d) => L.decals.push({ type: 'hazard', x, y, w, d });

  /** desks fill both 6-deep rows (free-seat clusters top them up), one corner block per floor, a 4-deep front strip */
  function furnish(S, L, K, seatBlocks, corner, strip) {
    const ROW = TW - 2;
    const rows = [[], []];
    let r = 0, x = 0;
    const fits = (w) => x + w <= ROW || r === 0;
    const put = (b) => {
      if (x + b.w > ROW) { if (r === 1) return false; r = 1; x = 0; }
      rows[r].push({ b, x: 1 + x }); x += b.w; return true;
    };
    for (const b of seatBlocks) put(b);
    if (corner && fits(corner().w)) put(corner());
    // top up with empty desks (자율좌석) so the floor reads as a working office
    let first = true;
    for (let guard = 0; guard < 12; guard++) {
      const cols = Math.min(4, Math.floor((ROW - x - 2) / 2));
      if (cols < 2) { if (r === 1) break; r = 1; x = 0; continue; }
      rows[r].push({ b: K.cluster(new Array(cols * 2).fill(null), 'free', first ? '💺 자율좌석' : null, { noDecor: cols < 3 }), x: 1 + x });
      x += cols * 2 + 2; first = false;
    }
    rows.forEach((row, i) => row.forEach(({ b, x: bx }) => b.place(bx, 8 + i * 6)));
    let sx = 1;
    for (const mk of strip) { const b = mk(); if (sx + b.w > ROW + 1) break; b.place(sx, 20); sx += b.w; }
  }

  const LABS = [
    { name: '정보전자연구소', floor: 'wood', color: '#e6dccb', corridor: '#cfc6b8', corner: 'booths', strip: ['printers', 'plants', 'boards', 'sofaRow', 'plants', 'poster', 'plants'] },
    { name: '융복합연구센터', floor: 'carpet', color: '#e8e1f1', corridor: '#d6cbe6', corner: 'collab', strip: ['aquarium', 'plants', 'sofaRow', 'boards', 'plants', 'printers', 'plants'] },
    { name: '응용과학연구소', floor: 'tile', color: '#ecebe6', corridor: '#c9d6cf', corner: 'lab', strip: ['printers', 'sofaRow', 'plants', 'poster', 'plants', 'boards', 'plants'] },
    { name: '공간지능연구센터', floor: 'carpet', color: '#dfe7ef', corridor: '#c7d3df', corner: 'robot', strip: ['boards', 'plants', 'sofaRow', 'printers', 'plants', 'poster', 'plants'] },
  ];

  /** research floor: north strip (2 lead offices · core · meeting · break), corridor, desk-filled open plan */
  function labFloor(S, n, f, vi) {
    const V = LABS[vi % LABS.length];
    const L = level(S, `${n}F ${V.name}`, { floor: V.floor, outer: 'premium', short: `${n}F`, bld: 'tower' });
    L.floorColor = V.color;
    const K = LY.kit(S, L);
    L.W = TW; L.H = TH;
    office(S, L, K, 0, 6, f.teams[0] || null);
    office(S, L, K, 6, 6, f.teams[1] || null);
    core(S, L, K);
    meetingRoom(S, L, K, 24, 8);
    breakRoom(S, L, K, 32, 8, `${n}F 휴게실`);
    sideWalls(K, [6, 32]);
    L.patches.push({ x: 0, y: 6, w: TW, d: 2, style: 'carpet', color: V.corridor });
    L.signs.push({ x: CORE + 4.2, y: 7.7, text: `🛗 ${n}F ${V.name}`, color: '#2b2622', room: true });
    const C = corners(S, L, K, `${n}F 라운지`);
    furnish(S, L, K, f.blocks.map((b) => b.make(S, L, K)), C[V.corner], V.strip.map((k) => C[k]));
    windowsLeft(L);
    L.wallY = { clock: 39.0 };
    return L;
  }

  /** 서버실 / GPU 학습 서버실: NOC + power + cooling at the back, raised floor with rack rows in front */
  function serverFloor(S, n, gpu) {
    const name = gpu ? 'GPU 학습 서버실' : '서버실';
    const L = level(S, `${n}F ${name}`, { floor: 'raised', outer: 'premium', short: `${n}F`, bld: 'tower' });
    L.floorColor = gpu ? '#d3d8de' : '#d9dde1';
    const K = LY.kit(S, L);
    const lv = L.idx;
    L.W = TW; L.H = TH;
    // north strip: 관제실(NOC) · core · UPS · 냉각
    L.patches.push({ x: 0, y: 0, w: 12, d: 6, style: 'carpet', color: '#2f3a44' });
    K.add({ type: 'nocWall', x: 0.4, y: 0.25, w: 11.2, gpu }); K.blockRect(0, 0, 12, 1);
    for (let i = 0; i < 3; i++) {
      const seat = K.deskSeat(1 + i * 3.5 - 1, 0, 0, 'B', `N:noc-${lv}-${i}`);
      if (i < 2) npc(S, L, { id: `N:noc-${lv}-${i}`, role: '관제 엔지니어', home: { x: seat.x, y: seat.y, face: '-y', pose: 'sit' }, anim: 'type', hat: 'headphones', accent: '#1f9fb4' });
    }
    K.wallX(0, 12, 6, { glass: true, doors: [11] });
    L.signs.push({ x: 0.3, y: 5.7, text: gpu ? '📈 학습 모니터링실' : '🖥️ 관제실 (NOC)', color: '#1f9fb4', room: true });
    core(S, L, K);
    L.patches.push({ x: 24, y: 0, w: 8, d: 6, style: 'concrete', color: '#c9ccd0' });
    for (let i = 0; i < 3; i++) { K.add({ type: 'upsCabinet', x: 24.4 + i * 2.5, y: 0.3 }); K.blockRect(24 + i * 2.5, 0, 2, 1); }
    K.add({ type: 'batteryRack', x: 24.5, y: 3.2, w: 6.5 }); K.blockRect(24, 3, 7, 1);
    K.wallX(24, 32, 6, { glass: false, h: 46, doors: [31], color: '#d5d9dd' });
    L.signs.push({ x: 24.3, y: 5.7, text: '🔋 UPS·배터리실', color: '#c47f22', room: true });
    L.patches.push({ x: 32, y: 0, w: 8, d: 6, style: 'concrete', color: '#c9ccd0' });
    K.add({ type: 'chiller', x: 32.5, y: 0.4 }); K.add({ type: 'chiller', x: 35.8, y: 0.4 }); K.blockRect(32, 0, 7, 2);
    K.add({ type: 'pipes', x: 32.3, y: 3.6, w: 7.2 }); K.blockRect(32, 3, 8, 1);
    K.wallX(32, 40, 6, { glass: false, h: 46, doors: [33], color: '#d5d9dd' });
    L.signs.push({ x: 32.3, y: 5.7, text: gpu ? '❄️ 액체냉각 CDU' : '❄️ 항온항습기', color: '#4e7cf6', room: true });
    sideWalls(K, [12, 24, 32]);
    L.patches.push({ x: 0, y: 6, w: TW, d: 2, style: 'tile', color: '#b9c0c7' });
    L.signs.push({ x: CORE + 4.2, y: 7.7, text: `🛗 ${n}F ${name}`, color: '#2b2622', room: true });
    // rack rows: cold aisle / hot aisle, a cross aisle in the middle
    const rows = [9, 12.6, 16.2, 19.8];
    rows.forEach((ry, ri) => {
      L.decals.push({ type: 'floor', x: 1, y: ry - 1.2, w: TW - 2, d: 1.1, color: ri % 2 ? 'rgba(229,83,75,0.12)' : 'rgba(78,124,246,0.13)' });
      for (let x = 1.2; x < TW - 1.5; x += 1.05) {
        if (x > 18.5 && x < 21) continue;
        K.add({ type: gpu ? 'gpuRack' : 'serverRack', x, y: ry, seed: Math.round(x * 7 + ry * 3) });
      }
      K.blockRect(1, Math.floor(ry), 18, 1); K.blockRect(21, Math.floor(ry), TW - 22, 1);
      L.signs.push({ x: 1.2, y: ry + 1.6, text: `${gpu ? 'GPU' : 'SRV'}-${String.fromCharCode(65 + ri)} 열`, color: gpu ? '#2f9e5f' : '#4f5a65' });
    });
    if (gpu) for (const ry of rows) K.add({ type: 'coolantPipe', x: 1.2, y: ry - 0.15, w: TW - 2.6 });
    npc(S, L, { id: `N:srv-${lv}`, role: gpu ? 'GPU 엔지니어' : '서버 엔지니어', home: { x: 20, y: 10.8, face: '-y', pose: 'stand' }, anim: 'idle', hat: 'cap', accent: gpu ? '#2f9e5f' : '#4f5a65', carry: 'paper',
      patrol: [{ x: 20, y: 10.8, face: '-x' }, { x: 3, y: 11, face: '-y' }, { x: 37, y: 14.6, face: '-y' }, { x: 20, y: 18.2, face: '+x' }, { x: 5, y: 21.6, face: '-y' }, { x: 35, y: 22.6, face: '-y' }] });
    windowsLeft(L);
    L.wallY = { clock: 39.0 };
    return L;
  }

  /** 임원층: 대표실 · 대회의실 · 이사실 × 3 · 중역회의실 · 비서실/대기 라운지 */
  function execFloor(S, n) {
    const L = level(S, `${n}F 임원층`, { floor: 'carpet', outer: 'premium', short: `${n}F`, bld: 'tower' });
    L.floorColor = '#d2c4ab';
    const K = LY.kit(S, L);
    L.W = TW; L.H = TH;
    meetingRoom(S, L, K, 0, 12, '🏛️ 대회의실', { bigScreen: true, carpet: '#b7a07a' });
    core(S, L, K);
    office(S, L, K, 24, 16, null, {
      label: '👑 대표', sign: '👑 대표실', signColor: '#b8955f', carpet: '#b79c74', chair: '#7a2232', boss: true, deskX: 6.7,
      extra: (K2, ox) => {
        K2.add({ type: 'bookshelf', x: ox + 3.1, y: 0.3, w: 2.4, seed: 99 }); K2.blockRect(ox + 3, 0, 3, 1);
        K2.add({ type: 'trophyCase', x: ox + 11.3, y: 0.3, w: 3.2 }); K2.blockRect(ox + 11, 0, 4, 1);
        K2.add({ type: 'sofa', x: ox + 11, y: 2.6, w: 3.2 }); K2.blockRect(ox + 11, 2, 4, 1);
        K2.add({ type: 'roundTable', x: ox + 12.6, y: 4.4, r: 0.5, color: '#6b4a35' }); K2.block(ox + 12, 4);
        K2.add({ type: 'aquarium', x: ox + 0.8, y: 4.9, w: 3.2 }); K2.blockRect(ox, 4, 4, 2);
      },
    });
    L.patches.push({ x: 0, y: 6, w: TW, d: 2, style: 'wood', color: '#a88560' });
    L.signs.push({ x: CORE + 4.2, y: 7.7, text: `🛗 ${n}F 임원층`, color: '#2b2622', room: true });
    // middle: secretary desk + waiting lounge + art
    K.add({ type: 'reception', x: 28, y: 9.4, w: 5 }); K.blockRect(28, 9, 5, 1);
    npc(S, L, { id: 'N:secretary-ceo', role: '대표 비서', home: { x: 30.5, y: 8.7, face: '+y', pose: 'stand' }, anim: 'type', hat: 'bow', accent: '#b8955f' });
    L.rugs.push({ x: 1, y: 9, w: 14, d: 8, color: '#c9b38f', border: '#a88b5e' });
    K.add({ type: 'sofa', x: 2, y: 10, w: 3.4 }); K.blockRect(2, 10, 4, 1);
    [0.7, 1.7, 2.7].forEach((d) => rest(S, L, { x: 2 + d, y: 10.62, face: '+y', pose: 'sofa', approach: [Math.floor(2 + d), 11] }, `${n}F 임원 라운지`));
    K.add({ type: 'roundTable', x: 3.7, y: 12.6, r: 0.6, color: '#6b4a35' }); K.block(3, 12);
    K.add({ type: 'armchair', x: 2.4, y: 14.4, color: '#8a6247' }); K.block(2, 14);
    K.add({ type: 'armchair', x: 5, y: 14.4, color: '#8a6247' }); K.block(5, 14);
    K.add({ type: 'piano', x: 9, y: 10 }); K.blockRect(9, 10, 2, 1);
    K.add({ type: 'decisionBoard', x: 17, y: 9.2, w: 4 }); K.blockRect(17, 9, 4, 1);
    for (const x of [22.5, 34.5]) { K.add({ type: 'sculpture', x, y: 12.5 }); K.block(Math.floor(x), 12); }
    K.add({ type: 'trophyCase', x: 9.5, y: 15.4, w: 4 }); K.blockRect(9, 15, 5, 1);
    // south strip (y 18..24): 이사실 × 3 + 중역회의실, walls on y = 18 with doors
    const dir = (ox, i) => {
      L.patches.push({ x: ox, y: 18, w: 7, d: 6, style: 'carpet', color: '#cbb894' });
      K.add({ type: 'execDesk', x: ox + 2.2, y: 20.4, w: 2.6, d: 1.0, label: `🎩 이사 ${i}` }); K.blockRect(ox + 2, 20, 3, 1);
      K.add({ type: 'chair', x: ox + 3.5, y: 21.85, face: '-y', part: 'seat', premium: true }); K.add({ type: 'chair', x: ox + 3.5, y: 21.85, face: '-y', part: 'back', premium: true });
      K.add({ type: 'bookshelf', x: ox + 0.4, y: 18.4, w: 2, seed: ox }); K.blockRect(ox, 18, 2, 1);
      K.add({ type: 'plant', x: ox + 6.4, y: 23.3, size: 0.9, seed: ox }); K.block(ox + 6, 23);
      npc(S, L, { id: `N:director-${i}`, role: `이사 ${i}`, home: { x: ox + 3.5, y: 21.85, face: '-y', pose: 'sit' }, anim: i === 2 ? 'think' : 'type', hat: 'shades', accent: '#7a5540', tie: '#7a2232' });
      K.wallX(ox, ox + 7, 18, { glass: true, doors: [ox + 5] });
      if (ox > 0) K.wallY(18, 24, ox, { h: 44, color: '#e6dccb' });
      L.signs.push({ x: ox + 0.3, y: 18.6, text: `🎩 이사실 ${i}`, color: '#7a5540', room: true });
    };
    dir(0, 1); dir(7, 2); dir(14, 3);
    K.wallY(18, 24, 21, { h: 44, color: '#e6dccb' });
    meetingRoom(S, L, K, 22, 11, '🏛️ 중역회의실', { carpet: '#b9a37e', y0: 18 });
    K.wallY(18, 24, 33, { h: 44, color: '#e6dccb' });
    L.patches.push({ x: 33, y: 18, w: 7, d: 6, style: 'tile', color: '#efe9df' });
    K.add({ type: 'cabinet', x: 33.4, y: 18.4, w: 2.4, coffee: true }); K.blockRect(33, 18, 3, 1);
    const sec = K.deskSeat(34, 18, 0, 'F', 'N:secretary-exec', { premium: true });
    npc(S, L, { id: 'N:secretary-exec', role: '비서실', home: { x: sec.x, y: sec.y, face: '+y', pose: 'sit' }, anim: 'type', hat: 'bow', accent: '#7a5540' });
    K.wallX(33, 40, 18, { glass: true, doors: [39] });
    L.signs.push({ x: 33.3, y: 18.6, text: '🗂️ 비서실', color: '#7a5540', room: true });
    windowsLeft(L);
    L.wallY = { clock: 39.0 };
    return L;
  }

  /** 1F: service rooms at the back, lobby lounge + reception in front, cafe on the road side with its own street door */
  function lobby(S) {
    const L = level(S, '1F 로비', { floor: 'marble', outer: 'premium', short: '1F', bld: 'tower' });
    L.floorColor = '#f1eee8';
    const K = LY.kit(S, L);
    const lv = L.idx;
    L.W = TW; L.H = TH;
    L.patches.push({ x: 0, y: 0, w: 7, d: 6, style: 'tile', color: '#d8dde2' });
    K.add({ type: 'cctvWall', x: 0.4, y: 0.25, w: 5 }); K.blockRect(0, 0, 6, 1);
    K.add({ type: 'lockers', x: 5.6, y: 1.3, w: 1.2 }); K.blockRect(5, 1, 2, 1);
    const g1 = K.deskSeat(0, 0, 0, 'B', 'N:guard-desk');
    npc(S, L, { id: 'N:guard-desk', role: '보안요원', home: { x: g1.x, y: g1.y, face: '-y', pose: 'sit' }, anim: 'type', hat: 'cap', accent: '#2b3a67' });
    K.wallX(0, 7, 6, { glass: false, h: 44, doors: [6], color: '#dfe3e7' });
    L.signs.push({ x: 0.3, y: 5.7, text: '🛡️ 보안실', color: '#2b3a67', room: true });
    L.patches.push({ x: 7, y: 0, w: 5, d: 6, style: 'concrete', color: '#d7d3cb' });
    K.add({ type: 'storageShelf', x: 7.3, y: 0.3, w: 2.1, seed: 3 }); K.add({ type: 'storageShelf', x: 9.6, y: 0.3, w: 2.1, seed: 5 }); K.blockRect(7, 0, 5, 1);
    K.add({ type: 'pallet', x: 9.6, y: 3, count: 4 }); K.blockRect(9, 3, 2, 2);
    K.wallX(7, 12, 6, { glass: false, h: 44, doors: [8], color: '#dfe3e7' });
    L.signs.push({ x: 7.3, y: 5.7, text: '📦 창고', color: '#6b5b4a', room: true });
    core(S, L, K);
    L.patches.push({ x: 24, y: 0, w: 6, d: 6, style: 'tile', color: '#e6efe2' });
    K.add({ type: 'lockers', x: 24.3, y: 0.25, w: 2.6 }); K.blockRect(24, 0, 3, 1);
    K.add({ type: 'janitorCart', x: 27.6, y: 0.5 }); K.blockRect(27, 0, 2, 1);
    K.add({ type: 'roundTable', x: 26.5, y: 3.5, r: 0.5, color: '#f7f6f2' }); K.block(26, 3);
    K.add({ type: 'stool', x: 25.4, y: 3.5, color: '#b8d8b0' }); K.add({ type: 'stool', x: 27.6, y: 3.5, color: '#f3d48c' });
    npc(S, L, { id: 'N:cleaner', role: '청소원', home: { x: 25.4, y: 3.5, face: '+x', pose: 'sit' }, anim: 'idle', hat: 'bucket', accent: '#3f8a45', walkCarry: 'mop', patrol: [{ x: 25.4, y: 3.5, face: '+x', pose: 'sit' }, { x: 14.5, y: 7, face: '-y' }, { x: 3.5, y: 9, face: '+y' }, { x: 20, y: 20.5, face: '+y' }, { x: 22, y: 7, face: '-y' }] });
    K.wallX(24, 30, 6, { glass: false, h: 44, doors: [25], color: '#dfe3e7' });
    L.signs.push({ x: 24.3, y: 5.7, text: '🧹 청소원 휴게실', color: '#3f8a45', room: true });
    L.patches.push({ x: 30, y: 0, w: 10, d: 6, style: 'concrete', color: '#ddd7cc' });
    K.add({ type: 'parcelShelf', x: 30.4, y: 0.3, w: 3.2, seed: 11 }); K.add({ type: 'parcelShelf', x: 34, y: 0.3, w: 3.2, seed: 13 }); K.blockRect(30, 0, 8, 1);
    K.add({ type: 'reception', x: 32, y: 3.2, w: 4 }); K.blockRect(32, 3, 4, 1);
    K.wallX(30, 40, 6, { glass: false, h: 44, doors: [31], color: '#dfe3e7' });
    L.signs.push({ x: 30.3, y: 5.7, text: '📮 택배실', color: '#c47f22', room: true });
    sideWalls(K, [7, 30]);
    L.patches.push({ x: 0, y: 6, w: 24, d: 2, style: 'carpet', color: '#cfc6b8' });
    L.rugs.push({ x: 1, y: 11, w: 12, d: 9, color: '#e2dbcf', border: '#c9bda9' });
    const visitor = [];
    for (const gx of [1.6, 7.4]) {
      K.add({ type: 'sofa', x: gx, y: 12.1, w: 3.2 }); K.blockRect(gx, 12, 3.2, 1);
      const seats = [0.6, 1.6, 2.6].map((dx) => ({ x: gx + dx, y: 12.72, face: '+y', pose: 'sofa', approach: [Math.floor(gx + dx), 13] }));
      K.add({ type: 'roundTable', x: gx + 1.6, y: 14.4, r: 0.5, color: '#efe7da' }); K.block(Math.floor(gx + 1.6), 14);
      K.add({ type: 'armchair', x: gx + 0.5, y: 16.0, color: '#c9d2dc' }); K.block(Math.floor(gx + 0.5), 16);
      K.add({ type: 'armchair', x: gx + 2.7, y: 16.0, color: '#c9d2dc' }); K.block(Math.floor(gx + 2.7), 16);
      const arms = [{ x: gx + 0.5, y: 15.98, face: '-y', pose: 'sit', approach: [Math.floor(gx + 0.5), 17] }, { x: gx + 2.7, y: 15.98, face: '-y', pose: 'sit', approach: [Math.floor(gx + 2.7), 17] }];
      if (gx < 5) [...seats, ...arms].forEach((s) => rest(S, L, s, '1F 로비 라운지'));
      else visitor.push(...seats, ...arms);
    }
    S.visitorSeats = visitor.map((s) => ({ lv, ...s }));
    L.signs.push({ x: 1.4, y: 19.6, text: '🛋️ 로비 라운지', color: '#6b5b4a', room: true });
    K.add({ type: 'sculpture', x: 7, y: 9.5 }); K.block(6, 9); K.block(7, 9);
    K.add({ type: 'reception', x: 13.6, y: 15.3, w: 6 }); K.blockRect(13, 15, 7, 1);
    npc(S, L, { id: 'N:receptionist', role: '안내원', home: { x: 16.6, y: 14.6, face: '+y', pose: 'stand' }, anim: 'idle', hat: 'bow', accent: '#d97757' });
    L.signs.push({ x: 13.4, y: 17.2, text: '🛎️ 안내데스크', color: '#6b5b4a', room: true });
    K.add({ type: 'decisionBoard', x: 15, y: 9.3, w: 4 }); K.blockRect(15, 9, 4, 1);
    K.add({ type: 'entrance', x: 15.5, y: TH - 0.08, w: 3, bld: 'tower' });
    L.decals.push({ type: 'floor', x: 15.4, y: TH - 1.6, w: 3.2, d: 1.5, color: '#8a7d6b' });
    for (const [x, y] of [[0.6, 9], [12.5, 9], [0.6, 21.5], [13, 22.5], [19.6, 22.5], [21.5, 9]]) { K.add({ type: 'plant', x, y, size: 1.05, seed: x * 3 + y }); K.block(Math.floor(x), Math.floor(y)); }
    const CX = 24, CY = 12;
    L.patches.push({ x: CX, y: CY, w: TW - CX, d: TH - CY, style: 'wood', color: '#e2cfae' });
    K.wallY(CY, TH, CX, { glass: true, doors: [17, 18] });
    K.wallX(CX, TW, CY, { glass: true });
    K.add({ type: 'cafeCounter', x: CX + 1.4, y: CY + 1.3, w: 6.4 }); K.blockRect(CX + 1, CY + 1, 7, 1);
    npc(S, L, { id: 'N:barista', role: '바리스타', home: { x: CX + 4.6, y: CY + 0.55, face: '+y', pose: 'stand' }, anim: 'type', hat: 'beret', accent: '#7a4a2a' });
    K.add({ type: 'menuStand', x: CX + 9, y: CY + 0.6 }); K.block(CX + 8, CY);
    for (let i = 0; i < 4; i++) { const x = CX + 2 + i * 1.3; K.add({ type: 'barStool', x, y: CY + 2.6 }); rest(S, L, { x, y: CY + 2.58, face: '-y', pose: 'sit' }, '1F 카페'); }
    for (const [tx, ty] of [[CX + 3, CY + 6], [CX + 7, CY + 6], [CX + 11, CY + 5], [CX + 11, CY + 9], [CX + 4, CY + 9.5]]) {
      K.add({ type: 'roundTable', x: tx, y: ty, r: 0.45, color: '#ffffff' }); K.block(Math.floor(tx), Math.floor(ty));
      for (const [dx, face] of [[-1, '+x'], [1, '-x']]) { K.add({ type: 'stool', x: tx + dx, y: ty, color: '#c49a62' }); rest(S, L, { x: tx + dx, y: ty, face, pose: 'sit' }, '1F 카페'); }
    }
    K.add({ type: 'plant', x: TW - 0.6, y: CY + 0.6, size: 1, seed: 77 }); K.block(TW - 1, CY);
    K.add({ type: 'entrance', x: 33.5, y: TH - 0.08, w: 2, bld: 'cafe' });
    L.signs.push({ x: CX + 0.6, y: TH - 0.5, text: '☕ AI 카페 (도로 쪽 출입문)', color: '#7a4a2a', room: true });
    npc(S, L, { id: 'N:guard-1', role: '보안요원', home: { x: 20.5, y: 22.4, face: '+y', pose: 'stand' }, anim: 'idle', hat: 'cap', accent: '#2b3a67', patrol: [{ x: 20.5, y: 22.4, face: '+y' }, { x: 21.5, y: 10.5, face: '-x' }, { x: 3, y: 7, face: '+x' }, { x: 22, y: 7, face: '-x' }, { x: 13, y: 20.5, face: '+y' }] });
    npc(S, L, { id: 'N:guard-2', role: '보안요원', home: { x: 14.5, y: 22.4, face: '+y', pose: 'stand' }, anim: 'idle', hat: 'cap', accent: '#2b3a67', patrol: [{ x: 14.5, y: 22.4, face: '+y' }, { x: 11.5, y: 18, face: '+y' }, { x: 21, y: 18.5, face: '-x' }, { x: 9, y: 7, face: '-y' }] });
    windowsLeft(L);
    L.wallY = {};
    return L;
  }

  /** rooftop garden: wisteria pergola, cherry trees, gazebo, twin koi ponds with lanterns, greenhouse, loungers, smoking corner */
  function roof(S) {
    const L = level(S, 'R 옥상정원', { floor: 'deck', outer: 'roof', short: 'R', bld: 'tower' });
    const K = LY.kit(S, L);
    L.W = TW; L.H = TH;
    core(S, L, K, true);
    const R = (spot, tag) => rest(S, L, spot, tag);
    L.patches.push({ x: 0, y: 3, w: 12, d: 21, style: 'grass', color: '#a6d28b' }, { x: 24, y: 7, w: 9, d: 17, style: 'grass', color: '#a6d28b' });
    L.decals.push({ type: 'deckPath', x: 17, y: 3, w: 2, d: 21 }, { type: 'deckPath', x: 1, y: 4, w: 10, d: 2 }, { type: 'deckPath', x: 12, y: 6.5, w: 12, d: 1.2 });
    // west: wisteria pergola walk + flower beds + gazebo + cherry trees
    K.add({ type: 'pergola', x: 1, y: 4, w: 10, d: 2 });
    for (const bx of [2.2, 6.4]) { K.add({ type: 'bench', x: bx, y: 3.25, w: 2.2 }); K.blockRect(Math.floor(bx), 3, 3, 1); for (let k = 0; k < 2; k++) R({ x: bx + 0.6 + k, y: 3.5, face: '+y', pose: 'sit', approach: [Math.floor(bx + 0.6 + k), 4] }, '옥상 등나무길'); }
    L.decals.push({ type: 'flowers', x: 1, y: 7, w: 4.5, d: 1.6, colors: ['#f07a8a', '#f2a7c3', '#ffffff'] }, { type: 'flowers', x: 6.5, y: 7, w: 4.5, d: 1.6, colors: ['#f6c445', '#ff9a5a', '#ffffff'] }, { type: 'flowers', x: 1, y: 21.5, w: 10, d: 2, colors: ['#b38cf0', '#7ab8f5', '#ffffff'] });
    for (const [x, y] of [[1.5, 7], [6.5, 7], [1, 21], [5, 21], [9, 21]]) for (let i = 0; i < 4; i++) K.block(Math.floor(x) + i, Math.floor(y));
    K.add({ type: 'gazebo', x: 6, y: 15 }); K.blockRect(5, 14, 2, 1);
    R({ x: 5.2, y: 15.4, face: '+x', pose: 'sit' }, '옥상 정자'); R({ x: 6.8, y: 15.4, face: '-x', pose: 'sit' }, '옥상 정자');
    for (const [x, y, s] of [[1.5, 11], [10.5, 11], [1.5, 18.5], [10.5, 18.5]]) { K.add({ type: 'roofTree', x, y, size: 1.05, seed: x * 9 + y, blossom: true }); K.block(Math.floor(x), Math.floor(y)); void s; }
    K.add({ type: 'birdbath', x: 3.5, y: 13 }); K.block(3, 13);
    for (const [x, y, c] of [[9, 9.5, '#f07a8a'], [2.6, 9.6, '#f6c445'], [9.5, 13.6, '#b38cf0'], [2.4, 17, '#7ab8f5'], [9.4, 17, '#ff9a5a']]) { K.add({ type: 'flowerBush', x, y, size: 1, seed: x * 13 + y, color: c }); K.block(Math.floor(x), Math.floor(y)); }
    // centre: twin koi ponds either side of the deck path, lanterns, fountain at the end
    for (const cx of [14.4, 21.6]) {
      L.decals.push({ type: 'pond', cx, cy: 13.5, rx: 2.1, ry: 3.6 });
      K.blockRect(13, 10, 3, 7); K.blockRect(20, 10, 3, 7);
      for (let k = 0; k < 3; k++) K.add({ type: 'koi', x: cx, y: 12.5 + k, seed: k + (cx > 18 ? 3 : 0) });
    }
    for (const [x, y] of [[16.4, 9], [19.6, 9], [16.4, 18], [19.6, 18]]) { K.add({ type: 'stoneLantern', x, y }); K.block(Math.floor(x), Math.floor(y)); }
    K.add({ type: 'fountain', x: 18, y: 21.6 }); K.blockRect(17, 21, 2, 2);
    for (const bx of [13, 20.4]) { K.add({ type: 'bench', x: bx, y: 19.6, w: 2.4 }); K.blockRect(Math.floor(bx), 19, 3, 1); for (let k = 0; k < 2; k++) R({ x: bx + 0.7 + k * 1.1, y: 19.85, face: '+y', pose: 'sit', approach: [Math.floor(bx + 0.7 + k * 1.1), 20] }, '옥상 연못'); }
    for (const x of [12.5, 23.5]) { K.add({ type: 'topiary', x, y: 7.9 }); K.block(Math.floor(x), 7); }
    // east: greenhouse, herb planters, loungers under parasols, string lights, café tables
    K.add({ type: 'greenhouse', x: 33, y: 0.6, w: 6, d: 5 }); K.blockRect(33, 0, 7, 6);
    for (let x = 24.5; x < 32; x += 2.6) { K.add({ type: 'planter', x, y: 0.5, w: 2.2, seed: x }); K.blockRect(Math.floor(x), 0, 3, 1); }
    for (const [i, x] of [[0, 25.5], [1, 28], [2, 30.5]]) {
      K.add({ type: 'deckChair', x, y: 9, color: ['#4e9cf6', '#f2a7c3', '#f6c445'][i] }); K.blockRect(Math.floor(x), 9, 1, 1);
      R({ x, y: 9.55, face: '+y', pose: 'sofa', approach: [Math.floor(x), 11] }, '옥상 선베드');
    }
    K.add({ type: 'parasol', x: 26.8, y: 8.6, color: '#e5534b' }); K.add({ type: 'parasol', x: 29.3, y: 8.6, color: '#3fb27f' });
    for (const [x, y, c] of [[26, 15], [30, 15], [26, 19.5], [30, 19.5]].map((p, i) => [...p, ['#e2667f', '#4e7cf6', '#3fb27f', '#e9a23b'][i]])) {
      K.add({ type: 'parasolTable', x, y, color: c }); K.block(Math.floor(x), Math.floor(y));
      for (const [dx, face] of [[-1, '+x'], [1, '-x']]) { K.add({ type: 'stool', x: x + dx, y, color: '#f3d48c' }); R({ x: x + dx, y, face, pose: 'sit' }, '옥상 카페 테이블'); }
    }
    K.add({ type: 'stringLights', pts: [[24.5, 13], [32.5, 13], [32.5, 22.5]] });
    for (const [x, y] of [[24.5, 13], [32.5, 13], [32.5, 22.5]]) K.block(Math.floor(x), Math.floor(y));
    // smoking corner behind a hedge
    K.add({ type: 'hedge', x: 33.2, y: 8, w: 0.6, d: 7 }); K.blockRect(33, 8, 1, 7);
    L.patches.push({ x: 34, y: 7, w: 6, d: 17, style: 'concrete', color: '#c9c8c3' });
    K.add({ type: 'ashtray', x: 36.5, y: 8.5 }); K.block(36, 8);
    K.add({ type: 'ashtray', x: 36.5, y: 19.5 }); K.block(36, 19);
    for (const by of [11.6, 15.6]) {
      K.add({ type: 'bench', x: 35, y: by, w: 2.6 }); K.blockRect(35, Math.floor(by), 3, 1);
      for (let k = 0; k < 2; k++) R({ x: 35.7 + k * 1.2, y: by + 0.25, face: '+y', pose: 'sit', carry: 'cig', approach: [Math.floor(35.7 + k * 1.2), Math.floor(by) + 1] }, '옥상 흡연');
    }
    K.add({ type: 'smokeSign', x: 34.4, y: 7.5 });
    L.signs.push({ x: 1.2, y: 23.4, text: '🌸 옥상정원', color: '#3f8a45', room: true }, { x: 34.2, y: 23.4, text: '🚬 흡연구역', color: '#6b6b6b', room: true }, { x: 24.2, y: 23.4, text: '🌿 선셋 라운지', color: '#3f8a45', room: true });
    npc(S, L, { id: 'N:gardener', role: '정원사', home: { x: 4, y: 9, face: '+y', pose: 'stand' }, anim: 'idle', hat: 'bucket', accent: '#3f8a45', say: '🌷 물 주는 중', patrol: [{ x: 4, y: 9, face: '+y' }, { x: 8.5, y: 18, face: '-x' }, { x: 18, y: 15, face: '-x' }, { x: 27.5, y: 12, face: '+y' }, { x: 3, y: 20, face: '+y' }] });
    return L;
  }

  // ---------------------------------------------------------------- 공장동
  function factory(S, spec) {
    const L = level(S, '공장동', { floor: 'concrete', outer: 'factory', short: '공장', bld: 'factory' });
    const K = LY.kit(S, L);
    const lv = L.idx;
    const line = (p) => {
      const cols = Math.ceil(Math.max(2, p.members.length) / 2), Lb = cols * 2 + 1;
      return {
        w: 2 + Lb + 3, d: 6,
        place(ox, oy) {
          L.decals.push({ type: 'hazard', x: ox + 0.2, y: oy + 0.7, w: 2 + Lb + 2.6, d: 4.6 });
          K.add({ type: 'console', x: ox + 0.35, y: oy + 2.2, w: 1.4, d: 1.3, seatKey: p.lead, podKey: p.lead });
          K.blockRect(ox, oy + 2, 2, 2);
          S.seats.set(p.lead, { key: p.lead, lv, x: ox + 1.05, y: oy + 4.25, face: '-y', pose: 'stand', lead: true });
          for (let i = 0; i < Lb; i++) K.add({ type: 'beltSeg', x: ox + 2 + i, y: oy + 2.5, i, n: Lb, podKey: p.lead });
          K.blockRect(ox + 2, oy + 2, Lb, 2);
          p.members.forEach((m, i) => {
            const col = Math.floor(i / 2), north = i % 2 === 0, x = ox + 3 + col * 2, key = `M:${p.lead}:${m}`;
            S.seats.set(key, { key, lv, x, y: north ? oy + 1.5 : oy + 4.5, face: north ? '+y' : '-y', pose: 'stand' });
            K.add({ type: 'station', x: x + (north ? 0.25 : -0.25), y: north ? oy + 2.35 : oy + 3.65, seatKey: key });
          });
          K.add({ type: 'pallet', x: ox + 2 + Lb + 0.4, y: oy + 2.4, podKey: p.lead }); K.blockRect(ox + 2 + Lb, oy + 2, 2, 2);
          S.reportSpots.set(p.lead, [{ lv, x: ox + 2.1, y: oy + 4.6, face: '-x' }, { lv, x: ox + 0.5, y: oy + 4.9, face: '+x' }]);
          L.signs.push({ x: ox + 0.5, y: oy + 5.7, text: '🏭 ' + p.title + ' 라인', color: p.color, team: true, key: p.lead });
        },
      };
    };
    const cell = (keys, first) => ({
      w: 13, d: 5,
      place(ox, oy) {
        L.decals.push({ type: 'lane', x: ox + 0.3, y: oy + 2.3, w: 12.4, d: 1.1 });
        for (let i = 0; i < 4; i++) {
          const key = keys[i] ?? null;
          K.add({ type: 'machine', x: ox + 1 + i * 3, y: oy + 0.55, w: 1.8, d: 1.35, seatKey: key, seed: ox + oy * 7 + i, color: ['#dfe5ea', '#e6e1d6', '#dde7e2', '#e4dfe9'][i] });
          K.blockRect(ox + 1 + i * 3, oy, 2, 2);
          L.decals.push({ type: 'hazard', x: ox + 0.8 + i * 3, y: oy + 0.35, w: 2.2, d: 1.75 });
          if (key) S.seats.set(key, { key, lv, x: ox + 1.9 + i * 3, y: oy + 2.75, face: '-y', pose: 'stand' });
          K.add({ type: 'partsBin', x: ox + 2.85 + i * 3, y: oy + 2.25, seed: i + ox }); K.block(ox + 2 + i * 3, oy + 2);
        }
        if (first) L.signs.push({ x: ox + 0.5, y: oy + 4.6, text: '⚙️ 장기 중단 세션 가공 셀', color: '#4f5a65' });
      },
    });
    const blocks = spec.stoppedTeams.map(line);
    const singles = spec.stoppedSingles.slice();
    while (singles.length % 4) singles.push(null);
    for (let i = 0; i < Math.max(4, singles.length); i += 4) blocks.push(cell(singles.slice(i, i + 4), i === 0));
    const prodW = Math.max(28, Math.min(40, Math.ceil(Math.sqrt(blocks.reduce((s, b) => s + b.w * b.d, 0)) * 1.4)));
    const DOCK = 8;
    const strip = [['관리실', 7], ['비품실', 5], ['남', 3], ['여', 3], ['휴게실', 9]];
    const stripW = strip.reduce((s, x) => s + x[1], 0);
    const W = Math.max(prodW + 1, stripW) + DOCK;
    let sx = 0;
    for (const [name, w] of strip) {
      const ox = sx;
      if (name === '관리실') {
        L.patches.push({ x: ox, y: 0, w, d: 6, style: 'tile', color: '#d8dde2' });
        K.add({ type: 'cctvWall', x: ox + 0.4, y: 0.25, w: 5 }); K.blockRect(ox, 0, 6, 1);
        const m = K.deskSeat(ox, 0, 0, 'B', 'N:factory-manager');
        npc(S, L, { id: 'N:factory-manager', role: '공장장', home: { x: m.x, y: m.y, face: '-y', pose: 'sit' }, anim: 'type', hat: 'hardhat', accent: '#c47f22' });
        L.signs.push({ x: ox + 0.3, y: 5.7, text: '🧑‍🔧 관리실', color: '#c47f22', room: true });
      } else if (name === '비품실') {
        L.patches.push({ x: ox, y: 0, w, d: 6, style: 'concrete', color: '#d0ccc4' });
        K.add({ type: 'storageShelf', x: ox + 0.3, y: 0.3, w: 2.1, seed: 21 }); K.add({ type: 'storageShelf', x: ox + 2.6, y: 0.3, w: 2.1, seed: 23 }); K.blockRect(ox, 0, 5, 1);
        K.add({ type: 'lockers', x: ox + 0.3, y: 3.2, w: 2.4 }); K.blockRect(ox, 3, 3, 1);
        L.signs.push({ x: ox + 0.3, y: 5.7, text: '🧰 비품실', color: '#6b5b4a', room: true });
      } else if (name === '남' || name === '여') {
        const kind = name === '남' ? 'm' : 'f';
        L.patches.push({ x: ox, y: 0, w, d: 6, style: 'tile', color: kind === 'm' ? '#e4edf5' : '#f8e9ee' });
        restroomPieces(K, ox, kind);
        L.signs.push({ x: ox + 0.2, y: 5.7, text: kind === 'm' ? '🚹 남' : '🚺 여', color: kind === 'm' ? '#4e7cf6' : '#e2667f', room: true });
      } else {
        L.patches.push({ x: ox, y: 0, w, d: 6, style: 'tile', color: '#d8e3d2' });
        K.add({ type: 'lockers', x: ox + 0.4, y: 0.25, w: 3 }); K.blockRect(ox, 0, 4, 1);
        K.add({ type: 'vending', x: ox + 4.4, y: 0.25, color: '#e5534b' }); K.add({ type: 'vending', x: ox + 5.4, y: 0.25, color: '#4e7cf6' }); K.blockRect(ox + 4, 0, 3, 1);
        rest(S, L, { x: ox + 5.3, y: 1.6, face: '-y', pose: 'stand' }, '공장 휴게실');
        K.add({ type: 'bench', x: ox + 1, y: 2.9, w: 3 }); K.blockRect(ox + 1, 2, 3, 1);
        [1.5, 2.5, 3.5].forEach((dx) => rest(S, L, { x: ox + dx, y: 3.15, face: '+y', pose: 'sit', approach: [Math.floor(ox + dx), 3] }, '공장 휴게실'));
        K.add({ type: 'roundTable', x: ox + 7, y: 3.6, r: 0.6, color: '#f7f6f2' }); K.block(ox + 7, 3);
        for (const [dx, face] of [[-1.05, '+x'], [1.05, '-x']]) { K.add({ type: 'stool', x: ox + 7 + dx, y: 3.6, color: '#a9c2d6' }); rest(S, L, { x: ox + 7 + dx, y: 3.6, face, pose: 'sit' }, '공장 휴게실'); }
        L.signs.push({ x: ox + 0.3, y: 5.7, text: '🥤 공장 휴게실', color: '#3f8a45', room: true });
      }
      K.wallX(ox, ox + w, 6, { glass: name === '관리실' || name === '휴게실', h: 46, doors: [ox + (name === '남' || name === '여' ? 1 : w - 1)], color: '#cdd3d8' });
      sx += w;
      if (sx < stripW) K.wallY(0, 6, sx, { h: 46, color: '#cdd3d8' });
    }
    if (stripW < W) K.wallY(0, 6, stripW, { h: 46, color: '#cdd3d8' });
    const { H: ph } = LY.pack(blocks, prodW - 1, 1, 8);
    L.W = W; L.H = Math.max(ph + 4, 24);
    // shipping zone along the east wall: overhead doors the trucks back right up to
    const dx = W - DOCK;
    L.patches.push({ x: dx, y: 7, w: DOCK, d: L.H - 7, style: 'concrete', color: '#b9bcbf' });
    L.decals.push({ type: 'lane', x: dx + 0.4, y: 7.4, w: 1.1, d: L.H - 8 });
    const bays = [];
    for (let by = 8; by + 3.2 <= L.H - 1 && bays.length < 4; by += 4) bays.push(by);
    S.bays = bays;
    bays.forEach((by, i) => {
      K.add({ type: 'dockLeveler', x: W - 1.6, y: by + 0.2, w: 1.6, d: 2.6, bay: i }); K.blockRect(W - 2, by, 2, 3);
      K.add({ type: 'dockDoor', x: W, y: by, w: 3, bay: i });
      for (let k = 0; k < 2; k++) { K.add({ type: 'pallet', x: W - 4.6, y: by + 0.2 + k * 1.4, count: 3 + ((i + k) * 5) % 9 }); }
      K.blockRect(W - 5, by, 2, 3);
      L.signs.push({ x: W - 4.8, y: by + 3.1, text: `🚚 ${i + 1}번 도크`, color: '#c47f22' });
    });
    K.add({ type: 'forklift', x: dx + 0.6, y: L.H - 3.2 }); K.blockRect(dx, L.H - 4, 2, 1);
    npc(S, L, { id: 'N:dock-worker', role: '출하 담당', home: { x: dx + 2.5, y: 9.5, face: '+x', pose: 'stand' }, anim: 'idle', hat: 'hardhat', accent: '#f2c230', walkCarry: 'box', patrol: bays.map((by) => ({ x: W - 2.6, y: by + 3.4, face: '+x' })).concat([{ x: dx + 1.5, y: 8.5, face: '-x' }]) });
    npc(S, L, { id: 'N:dock-worker2', role: '지게차 기사', home: { x: dx + 3.5, y: L.H - 2.5, face: '+x', pose: 'stand' }, anim: 'idle', hat: 'hardhat', accent: '#ff8a3d', walkCarry: 'box', patrol: bays.slice().reverse().map((by) => ({ x: W - 3.4, y: by + 3.4, face: '+x' })).concat([{ x: dx + 2, y: L.H - 2, face: '-y' }]) });
    K.add({ type: 'shutterFront', x: 2, y: L.H - 0.06, w: 3 });
    L.wallY = { andon: 2, clock: Math.min(stripW + 1, W - 5) };
    return L;
  }

  // ---------------------------------------------------------------- 경찰서 (유치장) & 은행 출장소 (금고)
  function police(S) {
    const L = level(S, '캠퍼스 경찰서', { floor: 'tile', outer: 'premium', short: '경찰서', bld: 'police' });
    L.floorColor = '#e3e7ec';
    const K = LY.kit(S, L);
    const lv = L.idx;
    L.W = 22; L.H = 16;
    S.jail = [];
    // north: three holding cells behind bars + the chief's office
    for (let i = 0; i < 3; i++) {
      const ox = i * 5;
      L.patches.push({ x: ox, y: 0, w: 5, d: 6, style: 'concrete', color: '#bfc3c7' });
      K.add({ type: 'bunk', x: ox + 0.4, y: 0.4 }); K.blockRect(ox, 0, 3, 1);
      K.add({ type: 'cellToilet', x: ox + 4.1, y: 0.5 }); K.block(ox + 4, 0);
      for (const [x, y, face, pose] of [[ox + 1.0, 0.95, '+y', 'sit'], [ox + 2.1, 0.95, '+y', 'sit'], [ox + 1.6, 3.4, '+y', 'stand'], [ox + 3.4, 3.0, '-x', 'stand']]) S.jail.push({ lv, x, y, face, pose, approach: pose === 'sit' ? [Math.floor(x), 2] : undefined, tag: `유치장 ${i + 1}호` });
      K.wallX(ox, ox + 5, 6, { bars: true, doors: [ox + 2] });
      if (i) K.wallY(0, 6, ox, { h: 60, color: '#9aa1a7' });
      L.signs.push({ x: ox + 0.3, y: 5.7, text: `🚔 유치장 ${i + 1}호`, color: '#2b3a67', room: true });
    }
    K.wallY(0, 6, 15, { h: 60, color: '#9aa1a7' });
    L.patches.push({ x: 15, y: 0, w: 7, d: 6, style: 'carpet', color: '#c9d2dc' });
    K.add({ type: 'execDesk', x: 17, y: 2, w: 2.6, d: 1, label: '⭐ 서장' }); K.blockRect(17, 2, 3, 1);
    K.add({ type: 'flagStand', x: 15.6, y: 0.6 }); K.block(15, 0);
    npc(S, L, { id: 'N:chief', role: '경찰서장', home: { x: 18.3, y: 1.45, face: '+y', pose: 'sit' }, anim: 'type', hat: 'police', accent: '#2b3a67' });
    K.add({ type: 'chair', x: 18.3, y: 1.45, face: '+y', part: 'seat', premium: true }); K.add({ type: 'chair', x: 18.3, y: 1.45, face: '+y', part: 'back', premium: true });
    K.wallX(15, 22, 6, { glass: true, doors: [16] });
    L.signs.push({ x: 15.3, y: 5.7, text: '⭐ 서장실', color: '#2b3a67', room: true });
    L.patches.push({ x: 0, y: 6, w: 22, d: 2, style: 'tile', color: '#cfd6de' });
    // front: duty desk, officer desks, wanted board, waiting bench
    K.add({ type: 'reception', x: 8, y: 11.5, w: 6 }); K.blockRect(8, 11, 6, 1);
    npc(S, L, { id: 'N:desk-officer', role: '민원 경찰관', home: { x: 11, y: 10.8, face: '+y', pose: 'stand' }, anim: 'idle', hat: 'police', accent: '#2b3a67' });
    const s1 = K.deskSeat(16, 8, 0, 'B', null), s2 = K.deskSeat(18, 8, 0, 'B', null);
    npc(S, L, { id: 'N:officer-1', role: '경찰관', home: { x: s1.x, y: s1.y, face: '-y', pose: 'sit' }, anim: 'type', hat: 'police', accent: '#2b3a67', patrol: [{ x: s1.x, y: s1.y, face: '-y', pose: 'sit' }, { x: 7.5, y: 7, face: '-y' }, { x: 2.5, y: 7, face: '-y' }] });
    npc(S, L, { id: 'N:officer-2', role: '경찰관', home: { x: s2.x, y: s2.y, face: '-y', pose: 'sit' }, anim: 'type', hat: 'police', accent: '#2b3a67' });
    K.add({ type: 'wantedBoard', x: 2.5, y: 8.4, w: 3 }); K.blockRect(2, 8, 4, 1);
    K.add({ type: 'bench', x: 1, y: 13.2, w: 3 }); K.blockRect(1, 13, 3, 1);
    K.add({ type: 'waterCooler', x: 5.5, y: 13.5 }); K.block(5, 13);
    K.add({ type: 'plant', x: 21.3, y: 14.9, size: 1, seed: 5 }); K.block(21, 14);
    K.add({ type: 'entrance', x: 9.5, y: L.H - 0.08, w: 3, bld: 'police' });
    L.windows = [9.5, 13];
    L.wallY = { clock: 20.6 };
    return L;
  }

  function bank(S) {
    const L = level(S, 'AI 은행 캠퍼스 출장소', { floor: 'marble', outer: 'premium', short: '은행', bld: 'bank' });
    L.floorColor = '#f3efe6';
    const K = LY.kit(S, L);
    const lv = L.idx;
    L.W = 22; L.H = 14;
    S.vault = [];
    // north: branch manager office + the vault (round door, deposit-box walls)
    L.patches.push({ x: 0, y: 0, w: 7, d: 6, style: 'carpet', color: '#c9b894' });
    K.add({ type: 'execDesk', x: 2.2, y: 2, w: 2.6, d: 1, label: '🏦 지점장' }); K.blockRect(2, 2, 3, 1);
    K.add({ type: 'chair', x: 3.5, y: 1.45, face: '+y', part: 'seat', premium: true }); K.add({ type: 'chair', x: 3.5, y: 1.45, face: '+y', part: 'back', premium: true });
    npc(S, L, { id: 'N:bank-manager', role: '지점장', home: { x: 3.5, y: 1.45, face: '+y', pose: 'sit' }, anim: 'type', hat: 'shades', accent: '#b8955f', tie: '#2b3a67' });
    K.wallX(0, 7, 6, { glass: true, doors: [6] });
    L.signs.push({ x: 0.3, y: 5.7, text: '👔 지점장실', color: '#7a5540', room: true });
    K.wallY(0, 6, 7, { h: 70, color: '#8d959c' });
    L.patches.push({ x: 7, y: 0, w: 15, d: 6, style: 'concrete', color: '#b5b9bd' });
    K.add({ type: 'depositBoxes', x: 7.3, y: 0.2, w: 14.4 }); K.blockRect(7, 0, 15, 1);
    K.add({ type: 'goldStack', x: 19.8, y: 3.6 }); K.blockRect(19, 3, 2, 2);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) S.vault.push({ lv, x: 8.6 + c * 1.6, y: 2.2 + r * 2.0, face: '+y', pose: 'sit', tag: `금고 ${r * 6 + c + 1}번 칸` });
    K.wallX(7, 22, 6, { glass: false, h: 70, doors: [14], color: '#8d959c' });
    K.add({ type: 'vaultDoor', x: 14, y: 6 });
    L.signs.push({ x: 7.3, y: 5.7, text: '🔐 세션 금고', color: '#b8955f', room: true });
    L.patches.push({ x: 0, y: 6, w: 22, d: 1.6, style: 'marble', color: '#e9e2d3' });
    // tellers behind glass, number machine, ATMs, waiting seats
    K.add({ type: 'tellerCounter', x: 4, y: 8, w: 14 }); K.blockRect(4, 8, 14, 1);
    for (let i = 0; i < 3; i++) npc(S, L, { id: `N:teller-${i}`, role: `창구 ${i + 1}`, home: { x: 6.5 + i * 4.5, y: 7.4, face: '+y', pose: 'stand' }, anim: 'type', hat: i === 1 ? 'bow' : null, accent: '#2f7d4f', tie: i === 1 ? null : '#2f7d4f' });
    K.add({ type: 'ticketMachine', x: 1.2, y: 9.2 }); K.block(1, 9);
    for (let i = 0; i < 2; i++) { K.add({ type: 'atm', x: 20.2, y: 9 + i * 1.6 }); K.blockRect(20, 9 + i * 1.6, 2, 1); }
    for (const bx of [3, 9, 15]) { K.add({ type: 'bench', x: bx, y: 11.2, w: 2.8, color: '#3f74b8' }); K.blockRect(bx, 11, 3, 1); }
    npc(S, L, { id: 'N:bank-guard', role: '청원경찰', home: { x: 13, y: 12.8, face: '+y', pose: 'stand' }, anim: 'idle', hat: 'police', accent: '#2b3a67', patrol: [{ x: 13, y: 12.8, face: '+y' }, { x: 1.5, y: 7, face: '+x' }, { x: 19.5, y: 7.2, face: '-x' }] });
    K.add({ type: 'entrance', x: 9.5, y: L.H - 0.08, w: 3, bld: 'bank' });
    L.windows = [9.5];
    L.wallY = { clock: 20.6 };
    return L;
  }

  /** which team / desks go on which research floor */
  function planFloors(spec) {
    const floors = [];
    const ROW = TW - 2;
    const newFloor = () => { const f = { teams: [], blocks: [], row: 0, x: 0 }; floors.push(f); return f; };
    const fit = (f, w) => {
      if (f.x + w <= ROW) { f.x += w; return true; }
      if (f.row === 0 && w <= ROW) { f.row = 1; f.x = w; return true; }
      return false;
    };
    const teamBlock = (t) => {
      const n = Math.max(4, Math.ceil(t.members.length / 4) * 4);
      return { w: n + 2, make: (S, L, K) => { const c = K.cluster(t.members.map((m) => `M:${t.lead}:${m}`), 'team', null, { noRug: true }); return { w: c.w, d: c.d, place(ox, oy) { L.rugs.push({ x: ox + 0.4, y: oy + 0.4, w: c.w - 0.8, d: 5.2, color: rgba(t.color, 0.16), border: rgba(t.color, 0.5) }); c.place(ox, oy); L.signs.push({ x: ox + 0.5, y: oy + 5.6, text: `🧶 ${t.title} 팀`, color: t.color, team: true, key: t.lead }); } }; } };
    };
    const first = newFloor();
    const hotN = Math.max(4, Math.ceil(spec.hot / 4) * 4), hotW = hotN + 2;
    fit(first, hotW);
    first.blocks.push({ w: hotW, make: (S, L, K) => K.cluster(new Array(hotN).fill(undefined), 'hot', '🎒 인턴 핫데스크') });
    for (const t of spec.teams) {
      const b = teamBlock(t);
      let f = floors.find((x) => x.teams.length < 2 && fit(x, b.w));
      if (!f) { f = newFloor(); fit(f, b.w); }
      f.teams.push(t); f.blocks.push(b);
    }
    const singles = spec.singles.slice();
    while (singles.length % 4) singles.push(null);
    for (let i = 0; i < singles.length; i += 4) {
      const keys = singles.slice(i, i + 4);
      const b = { w: 6, make: (S, L, K) => K.cluster(keys, 'single', i === 0 ? '💺 세션 데스크' : null, { noDecor: true }) };
      let f = floors.find((x) => fit(x, 6));
      if (!f) { f = newFloor(); fit(f, 6); }
      f.blocks.push(b);
    }
    while (floors.length < LABS.length) newFloor();
    return floors;
  }

  /** every tower level, bottom to top */
  function tower(S, spec) {
    const floors = planFloors(spec);
    const L1 = lobby(S);
    const labs = floors.map((f, i) => labFloor(S, i + 2, f, i));
    let n = floors.length + 2;
    const srv = serverFloor(S, n++, false);
    const gpu = serverFloor(S, n++, true);
    const ex = execFloor(S, n++);
    const R = roof(S);
    const lv = [L1, ...labs, srv, gpu, ex, R];
    lv.forEach((L, i) => { L.floorIdx = i; L.zBase = i * FLOOR_PX; });
    return lv;
  }

  AIO.interiors = { tower, factory, police, bank, level, rest, npc, restroomPieces, TW, TH, FLOOR_PX };
})();
