// Map selector: the multi-building AI 캠퍼스, the 원룸 오피스 and the 선셋 테라스. The two single-floor maps share one
// realistic floor plan: 팀장실 per harness team, restrooms, a break room (beer tap · arcade · game TV · foosball),
// nap pods, server room, AI training lab, 관리실, security & cleaners' rest rooms, a pantry, ACs, and a proper way in
// (glass entrance with turnstiles + reception for the office, an elevator hall for the terrace). The terrace wraps an
// open-air deck round the glass office: pool, café, campfire, koi garden, and animals running about.
(function () {
  const LY = AIO.layout;
  const COLORS = ['#e5534b', '#4e7cf6', '#3fb27f', '#e9a23b', '#a67be0', '#e2667f', '#1f9fb4'];

  const openSpec = (spec) => ({ pods: [...spec.teams, ...spec.stoppedTeams], singles: [...spec.singles, ...spec.stoppedSingles], partners: spec.partners, hot: spec.hot });

  function asSingle(S, extra = {}) {
    S.single = true;
    S.rest = S.rest || []; S.spots = S.spots || []; S.npcs = S.npcs || []; S.visitorSeats = S.visitorSeats || []; S.occ = []; S.buildings = []; S.doors = []; S.campusDoors = [];
    for (const L of S.levels) { L.ox = 0; L.oy = 0; L.zBase = 0; L.decals = L.decals || []; L.northWindows = L.northWindows || []; L.bld = 'single'; L.short = L.short || '1F'; }
    S.homeBounds = S.bounds;
    Object.assign(S, extra);
    return S;
  }

  /**
   * The shared floor plan. West strip (x 0…WS) of service rooms stacked down the wall, a corridor, a north strip of
   * rooms, the open office packed in the middle, and (office only) an entrance strip at the front.
   * Returns { W, H } of the indoor part.
   */
  function officeFloor(S, L, K, o, opt) {
    const lv = L.idx;
    let nn = 0;
    const add = (f, bx, by, bw = 1, bd = 1) => { K.add(f); if (bx != null) K.blockRect(bx, by, bw, bd); return f; };
    const rest = (s, tag) => S.rest.push({ lv, tag, carry: 'mug', ...s });
    const npc = (role, home, x = {}) => S.npcs.push({ lv, id: `N:${L.name}:${nn++}`, role, home: { lv, pose: 'stand', ...home }, anim: x.anim || 'idle', hat: x.hat ?? null, accent: x.accent || '#2b3a67', tie: x.tie, vest: x.vest, walkCarry: x.carry, say: x.say, patrol: x.patrol ? x.patrol.map((p) => ({ lv, pose: 'stand', ...p })) : null });
    const sign = (x, y, text, color = '#6b5b4a') => L.signs.push({ x, y, text, color, room: true });
    const WS = 7, CW = 2;                       // west strip width, corridor width
    const NX = WS + CW;                         // north strip starts here (the west corridor runs to the back wall)

    // ---- north strip rooms
    const north = [];
    if (opt.elevator) north.push({ w: 7, kind: 'elev' });
    for (const t of o.pods) north.push({ w: 6, kind: 'lead', team: t });
    north.push({ w: 3, kind: 'wc', g: 'm' }, { w: 3, kind: 'wc', g: 'f' }, { w: 11, kind: 'lounge' }, { w: 7, kind: 'nap' });
    const northW = north.reduce((s, r) => s + r.w, 0);

    // ---- open office blocks (team desks — leads sit in their own room —, session desks, partners, interns, corners)
    const blocks = [];
    for (const t of o.pods) {
      const keys = t.members.map((m) => `M:${t.lead}:${m}`);
      const c = K.cluster(keys, 'team', null, { noRug: true });
      blocks.push({ w: c.w, d: c.d, place(ox, oy) { L.rugs.push({ x: ox + 0.4, y: oy + 0.4, w: c.w - 0.8, d: 5.2, color: AIO.iso.rgba(t.color, 0.16), border: AIO.iso.rgba(t.color, 0.5) }); c.place(ox, oy); L.signs.push({ x: ox + 0.5, y: oy + 5.6, text: `🧶 ${t.title} 팀`, color: t.color, team: true, key: t.lead }); } });
    }
    const singles = o.singles.slice();
    while (singles.length % 4) singles.push(null);
    for (let i = 0; i < singles.length; i += 4) blocks.push(K.cluster(singles.slice(i, i + 4), 'single', i === 0 ? '💻 세션 데스크' : null, { noDecor: true }));
    if (o.partners.length) for (let i = 0; i < o.partners.length; i += 4) blocks.push(K.cluster(o.partners.slice(i, i + 4), 'partner', i === 0 ? '🤝 협력사석 (앱)' : null, { noDecor: true }));
    blocks.push(K.cluster(new Array(o.hot).fill(undefined), 'hot', '🎒 인턴 핫데스크'));
    blocks.push(K.utility());
    blocks.push({ w: 6, d: 6, place(ox, oy) {     // huddle table
      add({ type: 'whiteboard', x: ox + 1.6, y: oy + 0.5, w: 2.6, color: '#3fb27f' }, ox + 1, oy, 4, 1);
      add({ type: 'roundTable', x: ox + 3, y: oy + 3.2, r: 0.95, color: '#f7f6f2' }, ox + 2, oy + 2, 2, 2);
      for (const [dx, dy, face, c] of [[-1.35, 0, '+x', '#a9c2d6'], [1.35, 0, '-x', '#f2b5b5'], [0, -1.35, '+y', '#b8d8b0'], [0, 1.35, '-y', '#f3d48c']]) { add({ type: 'stool', x: ox + 3 + dx, y: oy + 3.2 + dy, color: c }); rest({ x: ox + 3 + dx, y: oy + 3.2 + dy, face, pose: 'sit' }, '회의 테이블'); }
      L.signs.push({ x: ox + 0.5, y: oy + 5.6, text: '🤝 허들 테이블', color: '#3f8a45' });
    } });
    blocks.push({ w: 4, d: 3, place(ox, oy) { add({ type: 'airCon', x: ox + 0.5, y: oy + 0.6 }, ox, oy, 1, 1); add({ type: 'plant', x: ox + 2, y: oy + 1.5, size: 1.2, seed: ox }, ox + 1, oy + 1, 2, 1); add({ type: 'extinguisher', x: ox + 3.4, y: oy + 0.6 }, ox + 3, oy); } });
    let area = blocks.reduce((s, b) => s + b.w * b.d, 0);
    const packTarget = Math.max(26, Math.min(48, Math.ceil(Math.sqrt(area) * 1.45)));
    const OX = NX, OY = 8;                      // open area origin (after the north corridor)
    const W = Math.max(NX + northW, OX + packTarget + 1, 44);
    // furnish the rest of the floor so it never reads as an empty hall
    const westMin = 28 + 7, FR = opt.front ? 6 : 1;
    const want = (W - OX - 1) * (westMin - OY - FR - 1) * 0.72;
    const fillers = [
      () => K.lounge('☕ 오픈 라운지'),
      () => ({ w: 6, d: 6, place(ox, oy) {
        add({ type: 'bookshelf', x: ox + 0.3, y: oy + 0.25, w: 2.6, seed: ox * 5 }, ox, oy, 3, 1); add({ type: 'bookshelf', x: ox + 3.1, y: oy + 0.25, w: 2.6, seed: ox * 5 + 1 }, ox + 3, oy, 3, 1);
        for (const ax of [1.4, 4.4]) { add({ type: 'armchair', x: ox + ax, y: oy + 3, color: '#b79c74' }, Math.floor(ox + ax), oy + 3); rest({ x: ox + ax, y: oy + 2.98, face: '-y', pose: 'sit', approach: [Math.floor(ox + ax), oy + 4] }, '라이브러리'); }
        add({ type: 'lamp', x: ox + 2.9, y: oy + 2.6 }, ox + 2, oy + 2); L.lamps.push({ x: ox + 2.9, y: oy + 2.6 });
        L.signs.push({ x: ox + 0.5, y: oy + 5.6, text: '📚 라이브러리', color: '#7a5540' });
      } }),
      () => ({ w: 5, d: 6, place(ox, oy) {
        add({ type: 'phoneBooth', x: ox + 0.4, y: oy + 0.6, color: '#3f74b8' }, ox, oy, 2, 2); add({ type: 'phoneBooth', x: ox + 2.6, y: oy + 0.6, color: '#2f7d4f' }, ox + 2, oy, 2, 2);
        add({ type: 'printer', x: ox + 0.6, y: oy + 3.4 }, ox, oy + 3, 2, 1); add({ type: 'airCon', x: ox + 3.4, y: oy + 3.4 }, ox + 3, oy + 3);
        L.signs.push({ x: ox + 0.3, y: oy + 5.6, text: '📞 집중 부스', color: '#3f74b8' });
      } }),
      () => ({ w: 6, d: 4, place(ox, oy) {
        for (const ax of [1, 3, 5]) { add({ type: 'massageChair', x: ox + ax, y: oy + 1.4, color: ['#3b3f45', '#7a2232', '#2b3a67'][ax % 3] }, Math.floor(ox + ax), oy + 1); rest({ x: ox + ax, y: oy + 1.4, face: '+y', pose: 'sit', approach: [Math.floor(ox + ax), oy + 2] }, '안마 코너'); }
        add({ type: 'plant', x: ox + 5.5, y: oy + 3.4, size: 1, seed: ox }, ox + 5, oy + 3);
        L.signs.push({ x: ox + 0.3, y: oy + 3.6, text: '💆 안마 코너', color: '#a67be0' });
      } }),
      () => ({ w: 4, d: 4, place(ox, oy) { add({ type: 'plant', x: ox + 1, y: oy + 1.4, size: 1.3, seed: ox * 7 }, ox + 1, oy + 1); add({ type: 'plant', x: ox + 2.8, y: oy + 2.2, size: 1, seed: ox * 7 + 3 }, ox + 2, oy + 2); add({ type: 'airCon', x: ox + 0.4, y: oy + 2.8 }, ox, oy + 2); } }),
    ];
    for (let i = 0; area < want && i < 14; i++) { const b = fillers[i % fillers.length](); blocks.push(b); area += b.w * b.d; }
    const { H: ph } = LY.pack(blocks, W - OX - 1, OX, OY);
    const westRooms = [{ h: 6, kind: 'server' }, { h: 7, kind: 'ailab' }, { h: 5, kind: 'admin' }, { h: 5, kind: 'security' }, { h: 5, kind: 'janitor' }];
    const westH = westRooms.reduce((s, r) => s + r.h, 0);
    const FRONT = opt.front ? 6 : 1;
    const H = Math.max(ph + FRONT + 1, westH + 7);
    L.W = Math.max(L.W || 0, W); L.H = Math.max(L.H || 0, H);

    // ---- corridors
    L.patches.push({ x: WS, y: 0, w: CW, d: H, style: 'tile', color: '#ddd6ca' }, { x: NX, y: 6, w: W - NX, d: 2, style: 'tile', color: '#ddd6ca' });

    // ---- north strip
    let x = NX;
    north.forEach((r, i) => {
      const rw = i === north.length - 1 ? W - x : r.w, rx = x;
      const room = (floor, color, name, glass, door, signColor) => { L.patches.push({ x: rx, y: 0, w: rw, d: 6, style: floor, color }); K.wallX(rx, rx + rw, 6, { glass, h: glass ? 60 : 46, doors: [rx + (door ?? rw - 1)], color: '#e7e1d8' }); if (rx + rw < W) K.wallY(0, 6, rx + rw, { h: 46, color: '#e7e1d8' }); if (name) sign(rx + 0.3, 5.7, name, signColor); };
      if (r.kind === 'elev') {
        room('marble', '#efece6', '🛗 엘리베이터 홀', false, 3);
        for (const [car, cx] of [[0, rx + 0.8], [1, rx + 3.8]]) { add({ type: 'elevCab', x: cx, y: 0, w: 2, d: 2, car }); add({ type: 'elevDoor', x: cx, y: 0, w: 2, d: 2, car, label: 'R' }, cx, 0, 2, 2); }
        add({ type: 'elevPanel', x: rx + 3.3, y: 0.35, label: 'R' }, rx + 2, 0);
        add({ type: 'plant', x: rx + rw - 0.6, y: 4.6, size: 1, seed: 7 }, rx + rw - 1, 4);
        S.door = { lv, x: rx + 3.5, y: 3.2, face: '+y' };
      } else if (r.kind === 'lead') {
        const t = r.team;
        room('carpet', AIO.iso.shade(t.color, 0.8), `👔 ${t.title}`, true, rw - 1);
        L.signs[L.signs.length - 1].team = true; L.signs[L.signs.length - 1].key = t.lead; L.signs[L.signs.length - 1].color = t.color;
        add({ type: 'bookshelf', x: rx + 0.4, y: 0.3, w: 2.2, seed: rx }, rx, 0, 3, 1);
        add({ type: 'execDesk', x: rx + 1.7, y: 2.05, w: 2.6, d: 1.0, seatKey: t.lead, label: '👔 팀장' }, rx + 1, 2, 4, 1);
        const seat = { key: t.lead, lv, x: rx + 3, y: 1.45, face: '+y', pose: 'sit', lead: true };
        add({ type: 'chair', x: seat.x, y: seat.y, face: '+y', part: 'seat', premium: true }); add({ type: 'chair', x: seat.x, y: seat.y, face: '+y', part: 'back', premium: true });
        S.seats.set(t.lead, seat);
        S.reportSpots.set(t.lead, [{ lv, x: rx + 3, y: 3.45, face: '-y' }, { lv, x: rx + 4.6, y: 3.5, face: '-x' }, { lv, x: rx + 1.4, y: 3.5, face: '+x' }]);
        add({ type: 'armchair', x: rx + 1.9, y: 4.45, color: '#d9cbb7' }, rx + 1, 4); add({ type: 'armchair', x: rx + 4.1, y: 4.45, color: '#d9cbb7' }, rx + 4, 4);
        add({ type: 'plant', x: rx + rw - 0.55, y: 0.6, size: 0.9, seed: rx + 3 }, rx + rw - 1, 0);
        add({ type: 'wallAC', x: rx + 3.2, y: 0 });
      } else if (r.kind === 'wc') {
        room('tile', r.g === 'm' ? '#e4edf5' : '#f8e9ee', r.g === 'm' ? '🚹 남' : '🚺 여', false, 1, r.g === 'm' ? '#4e7cf6' : '#e2667f');
        AIO.interiors.restroomPieces(K, rx, r.g);
      } else if (r.kind === 'lounge') {
        room('wood', '#e2cfae', '🍺 휴게실', true, 1, '#c47f22');
        add({ type: 'beerTap', x: rx + 0.4, y: 0.35, w: 3 }, rx, 0, 4, 1);
        for (let k = 0; k < 2; k++) { add({ type: 'barStool', x: rx + 1 + k * 1.3, y: 1.75 }); rest({ x: rx + 1 + k * 1.3, y: 1.73, face: '-y', pose: 'sit', carry: 'mug' }, '휴게실 맥주'); }
        add({ type: 'fridge', x: rx + 3.8, y: 0.25 }, rx + 3, 0);
        add({ type: 'arcade', x: rx + 4.9, y: 0.25 }, rx + 4, 0); add({ type: 'arcade', x: rx + 6.0, y: 0.25, hue: 200 }, rx + 6, 0);
        rest({ x: rx + 5.35, y: 1.6, face: '-y', pose: 'stand' }, '휴게실 오락기'); rest({ x: rx + 6.45, y: 1.6, face: '-y', pose: 'stand' }, '휴게실 오락기');
        add({ type: 'gameTV', x: rx + 7.4, y: 0.2, w: Math.min(3, rw - 7.8) }, rx + 7, 0, Math.min(4, rw - 7), 1);
        for (const [bx, c] of [[rx + 7.9, '#e2667f'], [rx + 9.4, '#4e9cf6']]) { if (bx > rx + rw - 0.6) continue; add({ type: 'beanbag', x: bx, y: 2.5, color: c }); rest({ x: bx, y: 2.5, face: '-y', pose: 'sofa' }, '휴게실 게임'); }
        add({ type: 'foosball', x: rx + 0.6, y: 3.4 }, rx, 3, 3, 2);
        rest({ x: rx + 0.3, y: 3.9, face: '+x', pose: 'stand' }, '휴게실 푸스볼'); rest({ x: rx + 2.8, y: 3.9, face: '-x', pose: 'stand' }, '휴게실 푸스볼');
        add({ type: 'sofa', x: rx + 4, y: 4.3, w: 3 }, rx + 4, 4, 3, 1);
        [0.6, 1.6, 2.4].forEach((d) => rest({ x: rx + 4 + d, y: 4.92, face: '+y', pose: 'sofa', approach: [Math.floor(rx + 4 + d), 5] }, '휴게실 소파'));
        add({ type: 'massageChair', x: rx + 8.2, y: 4.4 }, rx + 8, 4); rest({ x: rx + 8.2, y: 4.4, face: '+y', pose: 'sit', approach: [rx + 8, 5] }, '안마의자');
        add({ type: 'dartboard', x: rx + 9.4, y: 0 });
      } else if (r.kind === 'nap') {
        room('carpet', '#5b6170', '😴 수면실', false, 1, '#7a8fd6');
        for (let k = 0; k * 2.2 + 1.8 < rw; k++) { const px = rx + 0.3 + k * 2.2; add({ type: 'napPod', x: px, y: 0.3, color: ['#7a8fd6', '#a67be0', '#4e9cf6'][k % 3] }, Math.floor(px), 0, 2, 3); rest({ x: px + 0.8, y: 1.6, face: '+y', pose: 'sofa', approach: [Math.floor(px + 0.8), 4] }, '수면실'); }
        add({ type: 'lamp', x: rx + rw - 0.6, y: 4.6 }, rx + rw - 1, 4); L.lamps.push({ x: rx + rw - 0.6, y: 4.6 });
      }
      x += rw;
    });

    // ---- west strip (service rooms, doors onto the west corridor)
    let y = 0;
    for (const r of westRooms) {
      const ry = y, rh = r.h;
      const room = (floor, color, name, signColor) => { L.patches.push({ x: 0, y: ry, w: WS, d: rh, style: floor, color }); K.wallY(ry, ry + rh, WS, { h: 46, doors: [ry + Math.floor(rh / 2)], color: '#e7e1d8' }); K.wallX(0, WS, ry + rh, { h: 46, color: '#e7e1d8' }); sign(0.3, ry + rh - 0.3, name, signColor); };
      if (r.kind === 'server') {
        room('raised', '#d5d9dd', '🖥️ 서버실', '#4f5a65');
        for (let k = 0; k < 5; k++) { add({ type: 'serverRack', x: 0.3 + k * 1.05, y: ry + 0.3 }); add({ type: 'serverRack', x: 0.3 + k * 1.05, y: ry + 2.8 }); }
        K.blockRect(0, ry, 6, 1); K.blockRect(0, ry + 2, 6, 2);
        add({ type: 'airCon', x: 6.2, y: ry + 0.4 }, 6, ry);
        npc('서버 엔지니어', { x: 3, y: ry + 4.8, face: '-y' }, { hat: 'cap', accent: '#4f5a65', carry: 'paper', patrol: [{ x: 3, y: ry + 4.8, face: '-y' }, { x: 5.5, y: ry + 1.9, face: '-y' }, { x: 1, y: ry + 1.9, face: '-y' }] });
      } else if (r.kind === 'ailab') {
        room('raised', '#d3d8de', '🧠 AI 학습실', '#2f9e5f');
        add({ type: 'nocWall', x: 0.3, y: ry, w: 6.2, gpu: true });
        for (let k = 0; k < 5; k++) add({ type: 'gpuRack', x: 0.3 + k * 1.05, y: ry + 1.2, seed: k * 7 + ry });
        K.blockRect(0, ry, 6, 3);
        const s = K.deskSeat(1, ry + 1.5, 0, 'B', null);
        npc('AI 연구원', { x: s.x, y: s.y, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'headphones', accent: '#2f9e5f' });
      } else if (r.kind === 'admin') {
        room('carpet', '#2f3a44', '🛡️ 관리실', '#2b3a67');
        add({ type: 'cctvWall', x: 0.4, y: ry, w: 5 }, 0, ry, 6, 1);
        const s = K.deskSeat(1, ry - 0.6, 0, 'B', null);
        npc('관리실 직원', { x: s.x, y: s.y, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'cap', accent: '#2b3a67' });
      } else if (r.kind === 'security') {
        room('carpet', '#c9d2dc', '👮 보안팀 휴게실', '#2b3a67');
        add({ type: 'tv', x: 1.8, y: ry + 0.25, w: 2.6 }, 1, ry, 4, 1);
        add({ type: 'lockers', x: 5.2, y: ry + 0.3, w: 1.5 }, 5, ry, 2, 1);
        add({ type: 'sofa', x: 1, y: ry + 2.4, w: 3 }, 1, ry + 2, 3, 1);
        npc('보안요원', { x: 2.2, y: ry + 3.02, face: '+y', pose: 'sofa' }, { anim: 'idle', hat: 'police', accent: '#2b3a67' });
      } else if (r.kind === 'janitor') {
        room('tile', '#e6efe2', '🧹 청소원 휴게실', '#3f8a45');
        add({ type: 'lockers', x: 0.3, y: ry + 0.25, w: 2.4 }, 0, ry, 3, 1);
        add({ type: 'janitorCart', x: 3.4, y: ry + 0.5 }, 3, ry, 2, 1);
        add({ type: 'roundTable', x: 3, y: ry + 3, r: 0.5, color: '#f7f6f2' }, 2, ry + 2, 2, 2);
        add({ type: 'stool', x: 1.9, y: ry + 3, color: '#b8d8b0' });
      }
      y += rh;
    }
    // under the west rooms: pantry (vending, water, coffee, microwave cabinet, AC)
    const py = y + 0.3;
    if (H - y >= 3) {
      L.patches.push({ x: 0, y, w: WS, d: H - y, style: 'tile', color: '#efe9df' });
      add({ type: 'vending', x: 0.3, y: py, color: '#e5534b' }, 0, Math.floor(py)); add({ type: 'vending', x: 1.4, y: py, color: '#4e7cf6' }, 1, Math.floor(py));
      add({ type: 'cabinet', x: 2.6, y: py + 0.05, w: 2.4, coffee: true }, 2, Math.floor(py), 3, 1);
      add({ type: 'waterCooler', x: 5.5, y: py + 0.2 }, 5, Math.floor(py));
      add({ type: 'airCon', x: 6.2, y: py + 2.2 }, 6, Math.floor(py) + 2);
      rest({ x: 1.4, y: py + 1.6, face: '-y', pose: 'stand' }, '탕비실'); rest({ x: 3.8, y: py + 1.6, face: '-y', pose: 'stand' }, '탕비실');
      sign(0.3, y + 2.6, '☕ 탕비실', '#7a4a2a');
    }
    // the cleaner + a guard walk the floor
    npc('청소원', { x: 1.9, y: westH - 2, face: '+x', pose: 'sit' }, { anim: 'idle', hat: 'bucket', accent: '#3f8a45', carry: 'mop', patrol: [{ x: 1.9, y: westH - 2, face: '+x', pose: 'sit' }, { x: NX + 2, y: 7, face: '+x' }, { x: W - 3, y: 7, face: '-x' }, { x: WS + 1, y: H - 2, face: '-y' }] });
    npc('보안요원', { x: WS + 1, y: H - 2, face: '+y' }, { hat: 'police', accent: '#2b3a67', patrol: [{ x: WS + 1, y: H - 2, face: '+y' }, { x: WS + 1, y: 3, face: '+y' }, { x: W - 2, y: 7, face: '-x' }, { x: Math.floor((OX + W) / 2), y: H - 2, face: '+y' }] });

    // ---- wall dressing: back-wall brand plaque, clock, ACs, exit signs, left-wall windows
    L.windows = []; for (let wy = 2; wy + 2 < H - 1; wy += 4) L.windows.push(wy + 2);
    const lounge = north.findIndex((r) => r.kind === 'lounge');
    const lx = NX + north.slice(0, lounge).reduce((s, r) => s + r.w, 0);
    L.wallY = { plaque: Math.max(NX + 0.5, lx - 4.6), clock: W - 1.6 };
    add({ type: 'exitSign', x: WS + 0.2, y: 0 });

    // ---- the front (office): glass entrance, turnstiles, reception, brand wall, coats & umbrellas
    if (opt.front) {
      const fy = H - FRONT;
      L.patches.push({ x: NX, y: fy, w: W - NX, d: FRONT, style: 'marble', color: '#f1eee8' });
      const ex = Math.floor((NX + W) / 2) - 1;
      add({ type: 'entrance', x: ex, y: H - 0.08, w: 3, bld: 'single' });
      L.decals.push({ type: 'floor', x: ex - 0.4, y: H - 1.6, w: 3.8, d: 1.5, color: '#8a7d6b' });
      add({ type: 'turnstile', x: ex - 0.6, y: H - 3.6 }, ex - 1, H - 4, 1, 1); add({ type: 'turnstile', x: ex + 1.3, y: H - 3.6 }); add({ type: 'turnstile', x: ex + 3.2, y: H - 3.6 }, ex + 3, H - 4, 1, 1);
      add({ type: 'brandWall', x: ex + 5, y: fy + 0.2, w: 7 }, ex + 5, fy, 7, 1);
      add({ type: 'reception', x: ex + 5.5, y: fy + 2, w: 5 }, ex + 5, fy + 2, 6, 1);
      npc('안내원', { x: ex + 8, y: fy + 1.3, face: '+y' }, { anim: 'idle', hat: 'bow', accent: '#d97757' });
      add({ type: 'coatRack', x: ex - 2.4, y: H - 1.6 }, ex - 3, H - 2); add({ type: 'umbrellaStand', x: ex - 1.4, y: H - 0.8 }, ex - 2, H - 1);
      add({ type: 'sofa', x: ex - 8, y: fy + 1.2, w: 3.2 }, ex - 8, fy + 1, 4, 1);
      [0.6, 1.6, 2.6].forEach((d) => rest({ x: ex - 8 + d, y: fy + 1.82, face: '+y', pose: 'sofa', approach: [Math.floor(ex - 8 + d), fy + 2] }, '로비 대기석'));
      add({ type: 'plant', x: ex - 4, y: fy + 1, size: 1.1, seed: 5 }, ex - 4, fy + 1); add({ type: 'plant', x: W - 1.2, y: H - 1.2, size: 1.2, seed: 9 }, W - 2, H - 2);
      add({ type: 'extinguisher', x: NX + 0.5, y: H - 0.6 }, NX, H - 1);
      sign(ex - 1, H - 0.3, '🚪 출입구', '#2b2622');
      S.door = { lv, x: ex + 1.5, y: H - 0.7, face: '-y' };
      S.visitorSeats = [0.6, 1.6, 2.6].map((d) => ({ lv, x: ex - 8 + d, y: fy + 1.82, face: '+y', pose: 'sofa', approach: [Math.floor(ex - 8 + d), fy + 2] }));
    }
    return { W, H, NX, OX };
  }

  // ---------------------------------------------------------------- 1) 원룸 오피스
  function office(spec) {
    const o = openSpec(spec);
    const S = LY.newScene('office');
    const L = LY.newLevel(S, 'AI 인공지능 연구원 오피스', { floor: 'wood', outer: 'premium' });
    L.decals = []; L.floorColor = '#eadcc3';
    S.rest = []; S.npcs = [];
    const K = LY.kit(S, L);
    officeFloor(S, L, K, o, { front: true });
    LY.finalize(S);
    return asSingle(S);
  }

  // ---------------------------------------------------------------- 2) 선셋 테라스: glass office + open-air terrace
  function terrace(spec) {
    const o = openSpec(spec);
    const S = LY.newScene('terrace');
    const L = LY.newLevel(S, '선셋 테라스', { floor: 'deck', outer: 'roof' });
    L.decals = []; L.floorColor = '#caa47a';
    S.rest = []; S.npcs = [];
    const K = LY.kit(S, L);
    const lv = L.idx;
    const fl = officeFloor(S, L, K, o, { elevator: true, front: false });
    const Wi = fl.W, Hi = fl.H;
    const W = Wi + 24, H = Math.max(Hi + 15, 38);
    L.W = W; L.H = H;
    L.indoor = { x0: 0, y0: 0, x1: Wi, y1: Hi };
    // indoor floor + glass curtain walls with doors onto the deck
    L.patches.unshift({ x: 0, y: 0, w: Wi, d: Hi, style: 'wood', color: '#eadcc3' });
    const dx = Math.floor((fl.OX + Wi) / 2), dy = Math.floor(Hi / 2);
    K.wallX(0, Wi, Hi, { glass: true, h: 104, doors: [dx, dx + 1, 3], color: '#d9dde1' });
    K.wallY(0, Hi, Wi, { glass: true, h: 104, doors: [dy, dy + 1, 8], color: '#d9dde1' });
    const rest = (s, tag) => S.rest.push({ lv, tag, carry: 'mug', ...s });
    const add = (f, bx, by, bw = 1, bd = 1) => { K.add(f); if (bx != null) K.blockRect(bx, by, bw, bd); return f; };
    const X0 = Wi + 1;
    // ☕ terrace café
    L.patches.push({ x: Wi, y: 0, w: 24, d: 19, style: 'deck', color: '#c79f74' });
    add({ type: 'cafeCounter', x: X0 + 1.4, y: 1.3, w: 6.4 }, X0 + 1, 1, 7, 1);
    S.npcs.push({ lv, id: 'N:terrace-barista', role: '바리스타', home: { lv, x: X0 + 4.6, y: 0.55, face: '+y', pose: 'stand' }, anim: 'type', hat: 'beret', accent: '#7a4a2a' });
    for (let i = 0; i < 4; i++) { const x = X0 + 2 + i * 1.3; add({ type: 'barStool', x, y: 2.6 }); rest({ x, y: 2.58, face: '-y', pose: 'sit' }, '테라스 카페'); }
    for (const [x, y, c] of [[X0 + 12, 2.5, '#e2667f'], [X0 + 17, 2.5, '#4e7cf6'], [X0 + 12, 7, '#3fb27f'], [X0 + 17, 7, '#e9a23b'], [X0 + 3, 7, '#a67be0']]) {
      add({ type: 'parasolTable', x, y, color: c }, Math.floor(x), Math.floor(y));
      for (const [ddx, face] of [[-1, '+x'], [1, '-x']]) { add({ type: 'stool', x: x + ddx, y, color: '#f3d48c' }); rest({ x: x + ddx, y, face, pose: 'sit' }, '테라스 카페'); }
    }
    L.signs.push({ x: X0 + 0.6, y: 9.4, text: '☕ 테라스 카페', color: '#7a4a2a', room: true });
    // 🏊 infinity pool
    L.decals.push({ type: 'pool', x: X0 + 1, y: 11, w: 11, d: 6 });
    K.blockRect(X0 + 1, 11, 11, 6);
    for (let k = 0; k < 3; k++) for (const [yy, cc] of [[11.4, ['#4e9cf6', '#f2a7c3', '#f6c445']], [15, ['#3fb27f', '#e5534b', '#a67be0']]]) { const x = X0 + 14 + k * 2.4; add({ type: 'deckChair', x, y: yy, color: cc[k] }, Math.floor(x), Math.floor(yy), 1, 1); rest({ x, y: yy + 0.55, face: '+y', pose: 'sofa', approach: [Math.floor(x), Math.floor(yy) + 2] }, '풀사이드 선베드'); }
    add({ type: 'parasol', x: X0 + 15.2, y: 14.2, color: '#e5534b' }); add({ type: 'parasol', x: X0 + 19.8, y: 14.2, color: '#4e9cf6' });
    L.signs.push({ x: X0 + 1.2, y: 18.2, text: '🏊 인피니티 풀', color: '#1f9fb4', room: true });
    S.npcs.push({ lv, id: 'N:lifeguard', role: '안전요원', home: { lv, x: X0 + 12.6, y: 17.6, face: '-y', pose: 'stand' }, anim: 'idle', hat: 'cap', accent: '#e5534b', patrol: [{ lv, x: X0 + 12.6, y: 17.6, face: '-y', pose: 'stand' }, { lv, x: X0 + 6, y: 18, face: '-y', pose: 'stand' }, { lv, x: X0 + 12.6, y: 10.3, face: '+y', pose: 'stand' }] });
    // 🔥 campfire lounge (right column, lower)
    L.patches.push({ x: Wi, y: 19, w: 24, d: H - 19, style: 'grass', color: '#a6d28b' });
    const fy = Math.min(H - 8, 19 + 7);
    add({ type: 'firePit', x: X0 + 11, y: fy }, X0 + 10, fy - 1, 2, 2);
    for (const [bx, by] of [[X0 + 8.4, fy - 3], [X0 + 8.4, fy + 2.2]]) { add({ type: 'bench', x: bx, y: by, w: 5.2, color: '#a87a52' }, Math.floor(bx), Math.floor(by), 6, 1); for (let k = 0; k < 4; k++) rest({ x: bx + 0.7 + k * 1.25, y: by + 0.25, face: by < fy ? '+y' : '-y', pose: 'sit', carry: k % 2 ? 'mug' : null, approach: [Math.floor(bx + 0.7 + k * 1.25), Math.floor(by) + (by < fy ? 1 : -1)] }, '캠프파이어'); }
    add({ type: 'hammock', x: X0 + 15, y: fy + 6 }, X0 + 15, Math.floor(fy + 6), 3, 1);
    add({ type: 'stringLights', pts: [[X0 + 6.5, fy - 4.5], [X0 + 15.5, fy - 4.5], [X0 + 15.5, fy + 4.5], [X0 + 6.5, fy + 4.5]] });
    for (const [x, y] of [[X0 + 6, fy - 5], [X0 + 15, fy - 5], [X0 + 15, fy + 4], [X0 + 6, fy + 4]]) K.block(Math.floor(x), Math.floor(y));
    L.signs.push({ x: X0 + 6.6, y: fy + 4.9, text: '🔥 캠프파이어 라운지', color: '#c47f22', room: true });
    // 🌻 flower garden + picnic corner (right column, bottom)
    const gy0 = fy + 9;
    for (let yy = gy0; yy + 2 < H - 1; yy += 3.4) { L.decals.push({ type: 'flowers', x: X0 + 1.5, y: yy, w: 8, d: 1.6, seed: Math.round(yy * 7), colors: [['#f6c445', '#ff9a5a', '#ffffff'], ['#f07a8a', '#f2a7c3', '#ffffff'], ['#b38cf0', '#7ab8f5', '#ffffff']][Math.round(yy) % 3] }); K.blockRect(X0 + 1, Math.floor(yy), 9, 2); }
    if (gy0 + 3 < H - 2) {
      add({ type: 'picnicTable', x: X0 + 13, y: gy0 + 1 }, X0 + 13, gy0 + 1, 3, 2);
      for (const [ddx, ddy, face] of [[0.6, -0.35, '+y'], [2.0, -0.35, '+y'], [0.6, 2.25, '-y'], [2.0, 2.25, '-y']]) rest({ x: X0 + 13 + ddx, y: gy0 + 1 + ddy, face, pose: 'sit' }, '가든 피크닉');
      add({ type: 'parasol', x: X0 + 14.5, y: gy0 + 2, color: '#3fb27f' });
      add({ type: 'birdbath', x: X0 + 19, y: gy0 + 4 }, X0 + 19, gy0 + 4);
      L.signs.push({ x: X0 + 1.4, y: H - 0.6, text: '🌻 플라워 가든', color: '#c47f22', room: true });
    }
    // 🐟 koi garden + pet lawn below the office
    L.patches.push({ x: 0, y: Hi, w: Wi, d: H - Hi, style: 'grass', color: '#a6d28b' });
    L.decals.push({ type: 'deckPath', x: dx - 0.5, y: Hi, w: 3, d: 2.2 });
    const gx = Math.min(Wi - 10, 14), cy = Hi + 7, rx = 6.5, ry = 3.2;
    L.decals.push({ type: 'pond', cx: gx, cy, rx, ry });
    for (let i = Math.floor(gx - rx); i <= gx + rx; i++) for (let j = Math.floor(cy - ry); j <= cy + ry; j++) if (((i + 0.5 - gx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 < 1 && !(j === Math.floor(cy) && Math.abs(i + 0.5 - gx) < 2.5)) K.block(i, j);
    add({ type: 'bridge', x: gx - 2.5, y: Math.floor(cy), w: 5 });
    for (let k = 0; k < 5; k++) add({ type: 'koi', x: gx - rx / 2 + (k % 3) * rx / 2, y: cy - 0.5 + (k % 2), seed: k });
    for (const [x, y] of [[gx - rx - 1.2, cy - 1], [gx + rx + 1.2, cy + 1]]) add({ type: 'stoneLantern', x, y }, Math.floor(x), Math.floor(y));
    for (const bx of [gx - rx + 1, gx + rx - 3.4]) { const by = cy + ry + 1.4; add({ type: 'bench', x: bx, y: by, w: 2.4 }, Math.floor(bx), Math.floor(by), 3, 1); for (let k = 0; k < 2; k++) rest({ x: bx + 0.7 + k * 1.1, y: by + 0.25, face: '+y', pose: 'sit', approach: [Math.floor(bx + 0.7 + k * 1.1), Math.floor(by) + 1] }, '연못 정원'); }
    L.signs.push({ x: Math.max(1, gx - rx), y: cy + ry + 3.4, text: '🐟 연못 정원', color: '#3f8a45', room: true });
    // dog house, cat tree, a little hen coop
    add({ type: 'doghouse', x: Wi - 6, y: Hi + 3 }, Wi - 6, Hi + 3, 2, 2);
    add({ type: 'catTree', x: Wi - 2.5, y: Hi + 9 }, Wi - 3, Hi + 9, 1, 1);
    add({ type: 'coop', x: gx + rx + 4, y: H - 4 }, gx + rx + 4, H - 4, 2, 2);
    const r = AIO.rand(77);
    const freeAt = (x, y) => !L.blocked.has(`${x},${y}`);
    for (let x = 1; x < Wi - 1; x += 3) { const y = H - 1; if (freeAt(x, y)) add({ type: 'flowerBush', x: x + 0.5, y: y + 0.4, size: 1, seed: x * 3 }, x, y); }
    for (let k = 0; k < 7; k++) { const x = 2 + Math.floor(r() * (Wi - 4)), y = Hi + 2 + Math.floor(r() * (H - Hi - 4)); if (freeAt(x, y) && Math.hypot(x - gx, (y - cy) * 1.6) > rx + 2) add({ type: 'roofTree', x: x + 0.5, y: y + 0.5, size: 0.85 + r() * 0.3, seed: x * 13 + y, blossom: r() < 0.5 }, x, y); }
    for (let k = 0; k < 6; k++) { const x = X0 + 2 + Math.floor(r() * 19), y = 20 + Math.floor(r() * (H - 21)); if (freeAt(x, y) && Math.hypot(x - X0 - 11, y - fy) > 5.5) add({ type: 'roofTree', x: x + 0.5, y: y + 0.5, size: 0.8 + r() * 0.3, seed: x * 13 + y, blossom: r() < 0.4 }, x, y); }
    for (let x = X0 + 1; x < W - 3; x += 3) if (freeAt(x, 18)) add({ type: 'planter', x, y: 18.2, w: 2.2, seed: x }, x, 18, 3, 1);
    // animals: puppies, cats, ducks by the pond, a hen with her chicks
    S.pets = [
      { kind: 'dog', color: '#d9a066' }, { kind: 'dog', color: '#f4ead8' }, { kind: 'dog', color: '#6b4a35' },
      { kind: 'cat', color: '#8a8f96' }, { kind: 'cat', color: '#f0a050' }, { kind: 'cat', color: '#2b2b2b' },
      { kind: 'duck', color: '#ffffff', near: [gx, cy] }, { kind: 'duck', color: '#3f8a45', near: [gx, cy] }, { kind: 'duck', color: '#ffffff', near: [gx, cy] },
      { kind: 'hen', chicks: 5 },
    ];
    L.lamps.push({ x: X0 + 11, y: fy });
    LY.finalize(S);
    // where the animals may roam: walkable tiles outside the glass office
    const area = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (L.grid[j * W + i] && !(i < Wi && j < Hi)) area.push([i + 0.5, j + 0.5]);
    return asSingle(S, { sunset: true, indoor: L.indoor, petArea: area });
  }

  if (AIO.i18n) AIO.i18n.add({
    '맵 선택': 'Map', '맵 선택 열기': 'Open map picker', '실내 · 건물': 'Indoor · building', '실외 · 부지': 'Outdoor · lot', '지금': 'Now', '원본 맵': 'Original map', '실내(건물)와 실외(부지)를 따로 골라 조합해요': 'Pick a building and an outdoor lot separately', '맵': 'Map', '꼬마빌딩 + 마당': 'Mini building + yard', '꼬마빌딩 + 골목': 'Mini building + street', '선셋 글래스 오피스': 'Sunset glass office', 'AI 캠퍼스 연구동': 'AI campus research tower', '없음 (건물만)': 'None (building only)', '건물 + 야외 조합': 'Building + outdoor', '건물과 야외를 따로 골라서 조합': 'Pick a building and an outdoor lot separately', '건물': 'Building', '골목': 'Street', '마당': 'Yard', '꼬마빌딩': 'Mini building', '현재 층': 'Current floor', 'AI 캠퍼스': 'AI Campus', '원룸 오피스': 'Open Office', '선셋 테라스': 'Sunset Terrace',
    '연구동·공장동·경찰서·은행·소방서·파크·상가길': 'Research tower · factory · police · bank · fire station · park · shops',
    '한 층짜리 사무실 · 팀장실·휴게실·수면실·서버실': 'One-floor office · lead offices · break room · nap room · server room',
    '실내 오피스 + 야외 테라스 · 풀 · 캠프파이어 · 동물들': 'Glass office + open terrace · pool · campfire · animals',
    '☕ 테라스 카페': '☕ Terrace café', '🏊 인피니티 풀': '🏊 Infinity pool', '🔥 캠프파이어 라운지': '🔥 Campfire lounge', '🐟 연못 정원': '🐟 Koi garden',
    '🍺 휴게실': '🍺 Break room', '😴 수면실': '😴 Nap room', '🖥️ 서버실': '🖥️ Server room', '🧠 AI 학습실': '🧠 AI training lab', '🛡️ 관리실': '🛡️ Control room',
    '👮 보안팀 휴게실': '👮 Security lounge', '🧹 청소원 휴게실': '🧹 Cleaners\' room', '☕ 탕비실': '☕ Pantry', '🚪 출입구': '🚪 Entrance', '🛗 엘리베이터 홀': '🛗 Elevator hall',
    '💻 세션 데스크': '💻 Session desks', '🤝 허들 테이블': '🤝 Huddle table', '실내': 'Indoor', '야외': 'Outdoor', '안전요원': 'Lifeguard', '바리스타': 'Barista',
  });

  AIO.officeFloor = officeFloor;   // 조합 맵(원룸 · 선셋 실내)이 같은 평면을 쓴다

  // ---------------------------------------------------------------- v3 맵 선택: 실내(건물) × 실외(부지)
  // 원래 짝을 고르면 원본 맵을 그대로 짓는다 (원룸+없음 · 선셋+선셋 · 연구동+AI 캠퍼스 · 꼬마빌딩+마당/골목)
  const C = AIO.compose;
  const SKEY = 'aio.v4.map';
  const sel = { in: 'kkoma', out: 'island' };        // 기본: 꼬마빌딩 + 열대 섬
  try { const v = JSON.parse(localStorage.getItem(SKEY) || '{}'); if (v.in) sel.in = v.in; if (v.out) sel.out = v.out; } catch {}
  // 미리보기: ?map=실내id|실외id (저장하지 않음 — 다른 탭의 선택을 건드리지 않는다)
  let preview = false;
  try { const q = new URLSearchParams(location.search).get('map'); if (q) { const [i, o] = q.split(/[|,]/); if (i) sel.in = i; if (o) sel.out = o; preview = true; } } catch {}
  if (!C.indoors.some((d) => d.id === sel.in)) sel.in = 'kkoma';
  if (!C.outdoors.some((d) => d.id === sel.out)) sel.out = C.outdoors.some((d) => d.id === 'island') ? 'island' : 'yard';
  const ORIGINAL = { 'office|none': 'office', 'terrace|terrace': 'terrace', 'lab|campus': 'campus', 'kkoma|yard': 'yard', 'kkoma|street': 'street' };
  const original = (i = sel.in, o = sel.out) => ORIGINAL[`${i}|${o}`] || null;
  const fire = () => window.dispatchEvent(new CustomEvent('aio:map', { detail: { ...sel } }));
  AIO.maps = {
    get indoors() { return C.indoors; },
    get outdoors() { return C.outdoors; },
    sel,
    original,
    /** 지금 조합이 원본 맵이면 그 이름 (office · terrace · campus · yard · street) */
    get current() { return original() || 'combo'; },
    /** 레이아웃을 다시 지어야 하는지 판단하는 키 */
    get key() { return `${sel.in}|${sel.out}`; },
    /** 활발도 순으로 팀·책상 재배치 (기존 원본 맵 3종은 자리 고정) */
    get ranked() { const o = original(); return !(o === 'office' || o === 'terrace' || o === 'campus'); },
    build(_id, spec) {
      const o = original();
      if (o === 'office') return office(spec);
      if (o === 'terrace') return terrace(spec);
      if (o === 'campus') return AIO.campus.build(spec);
      if (o === 'yard' || o === 'street') return AIO.mini.build(spec, { yard: o === 'yard' });
      return C.build(spec, sel.in, sel.out);
    },
    /** part: 'in' | 'out' */
    select(part, id) {
      const list = part === 'in' ? C.indoors : C.outdoors;
      if (!list.some((d) => d.id === id) || sel[part] === id) return;
      sel[part] = id;
      try { if (!preview) localStorage.setItem(SKEY, JSON.stringify(sel)); } catch {}
      fire();
    },
    /** 원본 짝 한 번에 고르기 */
    pick(i, o) {
      if (sel.in === i && sel.out === o) return;
      sel.in = i; sel.out = o;
      try { if (!preview) localStorage.setItem(SKEY, JSON.stringify(sel)); } catch {}
      fire();
    },
  };
})();
