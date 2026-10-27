// Ground-floor interiors for every other campus building, generated from a template per building type:
// lecture halls, labs (CS / mech / bio / cleanroom / design studio), 본관, 대강당, library, dorms, 카이마루, 학생회관,
// sports complex, fire station, logistics warehouse, daycare, the ring R&D centre and every shop on the shopping street.
// Each interior has its own staff NPCs and seats/spots that strolling students use when they pop in.
(function () {
  const LY = AIO.layout;
  const I = () => AIO.interiors;
  const COLORS = ['#e5534b', '#4e7cf6', '#3fb27f', '#e9a23b', '#a67be0', '#e2667f', '#1f9fb4'];

  function make(S, o) {
    const W = o.W, H = o.H;
    const L = I().level(S, o.name, { floor: o.floor || 'wood', outer: o.outer || 'office', short: o.code || o.name.slice(0, 4), bld: o.id });
    L.W = W; L.H = H; L.floorColor = o.floorColor;
    const K = LY.kit(S, L);
    const lv = L.idx;
    const dc = Math.floor(W / 2);                     // door column (matches the exterior door)
    let nn = 0;
    const ctx = {
      S, L, K, lv, W, H, dc, o,
      spot: (s) => S.spots.push({ lv, ...s }),
      staff: (role, home, opt = {}) => I().npc(S, L, { id: `N:${o.id}:${nn++}`, role, home, anim: opt.anim || 'type', hat: opt.hat ?? null, accent: opt.accent || '#2b3a67', tie: opt.tie, vest: opt.vest, patrol: opt.patrol, walkCarry: opt.carry, say: opt.say }),
      sign: (x, y, text, color = '#6b5b4a', room = true) => L.signs.push({ x, y, text, color, room }),
      add: (f, bx, by, bw = 1, bd = 1) => { K.add(f); if (bx != null) K.blockRect(bx, by, bw, bd); return f; },
    };
    // entrance + doormat; keep the door lane free
    K.add({ type: 'entrance', x: dc - 1, y: H - 0.08, w: 3, bld: o.id });
    L.decals.push({ type: 'floor', x: dc - 1, y: H - 1.4, w: 3, d: 1.3, color: 'rgba(120,100,80,0.35)' });
    (T[o.tmpl] || T.lecture)(ctx);
    if (!L.windows.length) { L.windows = []; for (let wy = 2; wy + 2 < H - 1; wy += 3.4) L.windows.push(wy + 2); }
    L.wallY = L.wallY || { clock: W - 1.4 };
    L.door = { x: dc + 0.5, y: H - 0.6 };
    return L;
  }

  // ---------------------------------------------------------------- shared room makers
  /** a strip of rooms along the back wall, depth D, each with a door onto the corridor */
  function strip(c, D, rooms) {
    const { K, L, W } = c;
    let x = 0;
    rooms.forEach((r, i) => {
      const rw = i === rooms.length - 1 ? W - x : Math.min(r.w, W - x);
      if (rw < 2) return;
      const rx = x;
      if (r.floor) L.patches.push({ x: rx, y: 0, w: rw, d: D, style: r.floor, color: r.color });
      r.fill && r.fill(c, rx, 0, rw, D);
      K.wallX(rx, rx + rw, D, { glass: !!r.glass, h: 44, doors: [r.door != null ? rx + r.door : rx + Math.min(rw - 1, 1)], color: '#e7e1d8' });
      if (rx + rw < W) K.wallY(0, D, rx + rw, { h: 44, color: '#e7e1d8' });
      if (r.name) c.sign(rx + 0.3, D - 0.3, r.name, r.signColor);
      x += rw;
    });
    L.patches.push({ x: 0, y: D, w: W, d: 2, style: 'tile', color: '#e2ddd3' });
  }
  const R = {
    office(c, rx, ry, rw, rd, role = '교수') {
      c.add({ type: 'bookshelf', x: rx + 0.3, y: ry + 0.3, w: Math.min(2.2, rw - 0.6), seed: rx * 3 + c.lv }, rx, ry, 3, 1);
      if (rw >= 4 && rd >= 4) {
        const s = c.K.deskSeat(rx + Math.floor((rw - 2) / 2) - 1, ry, 0, 'F', null);
        c.staff(role, { x: s.x, y: s.y, face: '+y', pose: 'sit' }, { anim: rx % 2 ? 'type' : 'think', hat: ['shades', 'beret', null, 'headphones'][rx % 4], accent: COLORS[rx % COLORS.length] });
      }
      if (rw >= 4) c.add({ type: 'plant', x: rx + rw - 0.6, y: ry + 0.6, size: 0.8, seed: rx }, rx + rw - 1, ry);
    },
    restroom(c, rx, ry, rw, rd, kind) { I().restroomPieces(c.K, rx, kind); c.L.patches.push({ x: rx, y: ry, w: rw, d: rd, style: 'tile', color: kind === 'm' ? '#e4edf5' : '#f8e9ee' }); },
    study(c, rx, ry, rw, rd) {
      const tx = rx + rw / 2, ty = ry + rd / 2 + 0.2;
      c.add({ type: 'roundTable', x: tx, y: ty, r: 0.6, color: '#f7f6f2' }, Math.floor(tx), Math.floor(ty));
      for (const [dx, dy, face] of [[-1.1, 0, '+x'], [1.1, 0, '-x'], [0, -1.1, '+y']]) { c.add({ type: 'stool', x: tx + dx, y: ty + dy, color: COLORS[(rx + dx * 3) & 7 % 7] || '#a9c2d6' }); c.spot({ x: tx + dx, y: ty + dy, face, pose: 'sit' }); }
      c.add({ type: 'whiteboard', x: rx + 0.5, y: ry + 0.3, w: Math.min(2.4, rw - 1), color: '#4e7cf6' }, rx, ry, Math.min(3, rw), 1);
    },
    storage(c, rx, ry, rw) { c.add({ type: 'storageShelf', x: rx + 0.3, y: ry + 0.3, w: Math.min(rw - 0.6, 4), seed: rx }, rx, ry, rw, 1); },
    lockers(c, rx, ry, rw) { c.add({ type: 'lockers', x: rx + 0.3, y: ry + 0.25, w: rw - 0.6 }, rx, ry, rw, 1); c.add({ type: 'bench', x: rx + 0.6, y: ry + 2.4, w: rw - 1.2 }, rx, ry + 2, rw, 1); for (let k = 0.6; k < rw - 1; k += 1.2) c.spot({ x: rx + 0.6 + k, y: ry + 2.65, face: '+y', pose: 'sit', approach: [Math.floor(rx + 0.6 + k), ry + 3] }); },
    meeting(c, rx, ry, rw, rd) {
      const n = Math.max(2, rw - 3);
      for (let i = 0; i < n; i++) c.add({ type: 'tableSeg', x: rx + 1.5 + i, y: ry + rd / 2 - 0.5, w: 1, d: 1.1 });
      c.K.blockRect(rx + 1, Math.floor(ry + rd / 2 - 0.5), n + 1, 2);
      for (let i = 0; i < n - 1; i++) for (const [dy, face] of [[-0.6, '+y'], [1.65, '-y']]) { const x = rx + 2.1 + i, y = ry + rd / 2 - 0.5 + dy; c.add({ type: 'chair', x, y, face, part: 'seat' }); c.add({ type: 'chair', x, y, face, part: 'back' }); c.spot({ x, y, face, pose: 'sit' }); }
      c.add({ type: 'tv', x: rx + rw / 2 - 1.4, y: ry + 0.25, w: 2.8 }, rx + 1, ry, rw - 2, 1);
    },
    dormRoom(c, rx, ry, rw, rd) {
      c.add({ type: 'bed', x: rx + 0.3, y: ry + 0.4, color: COLORS[rx % 7] }, rx, ry, 1, 3);
      if (rw >= 4) c.add({ type: 'bed', x: rx + rw - 1.3, y: ry + 0.4, color: COLORS[(rx + 3) % 7] }, rx + rw - 2, ry, 2, 3);
      c.spot({ x: rx + 0.8, y: ry + 1.6, face: '+x', pose: 'sit' });
      c.add({ type: 'desk', x: rx + Math.max(1.3, rw / 2 - 1), y: ry + 0.3, w: 2, d: 1, face: '-y', seed: rx }, Math.floor(rx + Math.max(1.3, rw / 2 - 1)), ry, 2, 1);
    },
    kitchen(c, rx, ry, rw, rd, kind) {
      c.add({ type: 'kitchenLine', x: rx + 0.3, y: ry + 0.3, w: rw - 0.6, kind }, rx, ry, rw, 1);
      c.staff('조리사', { x: rx + rw / 2, y: ry + 1.7, face: '-y', pose: 'stand' }, { anim: 'type', hat: 'beret', accent: '#ffffff', patrol: [{ x: rx + 1.5, y: ry + 1.7, face: '-y' }, { x: rx + rw - 1.5, y: ry + 1.7, face: '-y' }] });
    },
    president(c, rx, ry, rw, rd) {
      c.add({ type: 'execDesk', x: rx + rw / 2 - 1.3, y: ry + 1.6, w: 2.6, d: 1, label: '🎓 총장' }, Math.floor(rx + rw / 2 - 1.3), ry + 1, 3, 1);
      c.add({ type: 'bossChair', x: rx + rw / 2, y: ry + 1.05 });
      c.staff('총장', { x: rx + rw / 2, y: ry + 1.05, face: '+y', pose: 'sit' }, { anim: 'think', hat: 'shades', accent: '#1f4e9a', tie: '#1f4e9a' });
      c.add({ type: 'flagStand', x: rx + 0.6, y: ry + 0.6 }, rx, ry);
      c.add({ type: 'trophyCase', x: rx + rw - 3.4, y: ry + 0.3, w: 3 }, rx + rw - 4, ry, 4, 1);
    },
  };

  /** a classroom: board on the north wall, lectern, rows of desks facing it */
  function classroom(c, x0, y0, x1, y1, o = {}) {
    const { K, L } = c;
    L.patches.push({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, style: o.floor || 'wood', color: o.color || '#e2d2b4' });
    c.add({ type: 'blackboard', x: x0 + 1, y: y0, w: x1 - x0 - 2, white: !!o.white, lines: o.lines });
    c.add({ type: 'lectern', x: x0 + 1.6, y: y0 + 1.4 }, x0 + 1, y0 + 1);
    c.staff(o.role || '교수', { x: x0 + 2.6, y: y0 + 1.6, face: '+y', pose: 'stand' }, { anim: 'point', hat: o.hat ?? 'shades', accent: '#7a5540', patrol: [{ x: x0 + 2.6, y: y0 + 1.6, face: '+y' }, { x: x1 - 2, y: y0 + 1.6, face: '+y' }] });
    for (let ry = y0 + 3.2; ry + 1.4 < y1 - 0.3; ry += 2) {
      c.add({ type: 'deskRow', x: x0 + 1, y: ry, w: x1 - x0 - 2 }, x0 + 1, Math.floor(ry), x1 - x0 - 2, 1);
      for (let sx = x0 + 1.5; sx < x1 - 1; sx += 1.2) { c.add({ type: 'chair', x: sx, y: ry + 1.15, face: '-y', part: 'seat' }); c.add({ type: 'chair', x: sx, y: ry + 1.15, face: '-y', part: 'back' }); c.spot({ x: sx, y: ry + 1.15, face: '-y', pose: 'sit' }); }
    }
  }
  /** lobby bits near the entrance */
  function lobbyBits(c, x0, y0, x1, y1, o = {}) {
    const { L } = c;
    L.patches.push({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, style: 'marble', color: o.color || '#efebe4' });
    if (x1 - x0 >= 6 && y1 - y0 >= 5) {
      c.add({ type: 'sofa', x: x0 + 0.6, y: y0 + 0.8, w: 2.6 }, x0, y0, 3, 1);
      [0.6, 1.6].forEach((d) => c.spot({ x: x0 + 0.6 + d, y: y0 + 1.42, face: '+y', pose: 'sofa', approach: [Math.floor(x0 + 0.6 + d), y0 + 2] }));
      c.add({ type: 'vending', x: x1 - 1.2, y: y0 + 0.3, color: COLORS[(x0 | 0) % 7] }, x1 - 2, y0, 2, 1);
    }
    if (o.board) c.add({ type: 'posterBoard', x: x0 + 0.5, y: y1 - 3.2, w: Math.min(3, x1 - x0 - 1) }, x0, y1 - 3, Math.min(4, x1 - x0), 1);
    c.add({ type: 'plant', x: x0 + 0.5, y: y1 - 0.8, size: 1, seed: x0 }, x0, y1 - 1);
  }
  const wallsAround = (c, x0, y0, x1, y1, doorX, doorY) => {
    const { K, W, H } = c;
    if (y0 > 0) K.wallX(x0, x1, y0, { h: 44, doors: doorY === 'top' ? [doorX] : [], color: '#e7e1d8' });
    if (x0 > 0) K.wallY(y0, y1, x0, { h: 44, doors: doorY === 'left' ? [doorX] : [], color: '#e7e1d8' });
    if (x1 < W) K.wallY(y0, y1, x1, { h: 44, doors: doorY === 'right' ? [doorX] : [], color: '#e7e1d8' });
    void H;
  };

  // ---------------------------------------------------------------- templates
  const T = {
    lecture(c) {
      const { W, H, dc } = c, D = 5;
      const offices = Math.max(1, Math.floor((W - 6) / 5));
      const rooms = [];
      for (let i = 0; i < offices; i++) rooms.push({ w: 5, fill: (cc, rx, ry, rw, rd) => R.office(cc, rx, ry, rw, rd, i % 2 ? '연구원' : '교수'), floor: 'carpet', color: '#d9d3c9', name: i % 2 ? '🔬 연구실' : '👩‍🏫 교수실' });
      rooms.splice(Math.min(1, rooms.length), 0, { w: 3, fill: (cc, rx, ry, rw, rd) => R.restroom(cc, rx, ry, rw, rd, 'm'), name: '🚹' }, { w: 3, fill: (cc, rx, ry, rw, rd) => R.restroom(cc, rx, ry, rw, rd, 'f'), name: '🚺' });
      strip(c, D, rooms);
      const y0 = D + 2;
      const lw = dc - 2, rw0 = dc + 3;
      if (lw >= 6) { classroom(c, 0, y0, lw, H, { lines: ['미적분학 II', '∫ e^x dx = e^x + C', '퀴즈 다음 주!'] }); wallsAround(c, 0, y0, lw, H, y0 + 1, 'right'); c.sign(0.4, H - 0.4, '📚 강의실 A'); }
      if (W - rw0 >= 6) { classroom(c, rw0, y0, W, H, { white: true, lines: ['딥러닝 개론', 'softmax(QKᵀ/√d)V', '과제: Transformer 구현'] }); wallsAround(c, rw0, y0, W, H, y0 + 1, 'left'); c.sign(rw0 + 0.4, H - 0.4, '📚 강의실 B'); }
      lobbyBits(c, Math.max(0, lw), y0, Math.min(W, rw0), H, { board: true });
    },
    lab(c, kind = 'bio') {
      const { W, H, dc, o } = c, D = 5;
      const rooms = [{ w: 6, fill: (cc, rx, ry, rw, rd) => R.office(cc, rx, ry, rw, rd, '교수'), floor: 'carpet', color: '#d9d3c9', name: '👩‍🏫 교수실' }, { w: 3, fill: (cc, rx, ry, rw, rd) => R.restroom(cc, rx, ry, rw, rd, 'm'), name: '🚹' }, { w: 3, fill: (cc, rx, ry, rw, rd) => R.restroom(cc, rx, ry, rw, rd, 'f'), name: '🚺' }, { w: 7, fill: R.meeting, floor: 'carpet', color: '#c9d2dc', name: '🗣️ 세미나실', glass: true }, { w: 6, fill: R.study, floor: 'tile', color: '#eef2ea', name: '☕ 학생 라운지' }, { w: 99, fill: R.storage, floor: 'concrete', color: '#d7d3cb', name: '📦 장비실' }];
      strip(c, D, rooms);
      const y0 = D + 2, lw = dc - 2, rw0 = dc + 3;
      const fillLab = (x0, x1, k) => {
        c.L.patches.push({ x: x0, y: y0, w: x1 - x0, d: H - y0, style: k === 'clean' ? 'raised' : 'tile', color: k === 'clean' ? '#eef4f8' : '#e9edf0' });
        if (k === 'cs') {
          for (let ry = y0 + 1; ry + 2 < H - 0.5; ry += 2.4) for (let x = x0 + 0.6; x + 1.7 < x1 - 0.3; x += 1.9) { c.add({ type: 'pcStation', x, y: ry }, Math.floor(x), Math.floor(ry), 2, 1); c.add({ type: 'chair', x: x + 0.8, y: ry + 1.35, face: '-y', part: 'seat' }); c.add({ type: 'chair', x: x + 0.8, y: ry + 1.35, face: '-y', part: 'back' }); c.spot({ x: x + 0.8, y: ry + 1.35, face: '-y', pose: 'sit' }); }
          c.sign(x0 + 0.4, H - 0.4, '💻 실습실');
        } else if (k === 'mech') {
          for (let x = x0 + 1; x + 2 < x1; x += 3.2) { c.add({ type: 'machine', x, y: y0 + 1, w: 1.8, d: 1.35, seed: x * 3, color: '#dfe5ea' }, Math.floor(x), y0 + 1, 2, 2); c.spot({ x: x + 0.9, y: y0 + 3.3, face: '-y', pose: 'stand' }); }
          c.add({ type: 'robotArm', x: x0 + 2, y: H - 2.6 }, x0 + 1, H - 4, 2, 2);
          c.add({ type: 'robotDog', x: x0 + 5, y: H - 2.2 });
          c.sign(x0 + 0.4, H - 0.4, '⚙️ 기계 실험실');
        } else if (k === 'clean') {
          c.L.decals.push({ type: 'floor', x: x0 + 0.3, y: y0 + 0.3, w: x1 - x0 - 0.6, d: H - y0 - 0.6, color: 'rgba(255,240,170,0.18)' });
          let n = 0;
          for (let ry = y0 + 1; ry + 1.5 < H - 1; ry += 3) for (let x = x0 + 0.8; x + 1.7 < x1 - 0.3; x += 2.6) { c.add({ type: 'cleanroomTool', x, y: ry, seed: n++ }, Math.floor(x), Math.floor(ry), 2, 2); c.spot({ x: x + 0.8, y: ry + 1.75, face: '-y', pose: 'stand' }); }
          c.sign(x0 + 0.4, H - 0.4, '🧪 클린룸 (방진복 필수)', '#1f9fb4');
        } else if (k === 'studio') {
          for (let ry = y0 + 1; ry + 1.5 < H - 1; ry += 2.6) for (let x = x0 + 0.8; x + 1.6 < x1 - 0.3; x += 2.4) { c.add({ type: (x + ry) % 3 < 1 ? 'canvasEasel' : 'drafting', x, y: ry, seed: x * 7 }, Math.floor(x), Math.floor(ry), 2, 1); c.spot({ x: x + 0.7, y: ry + 1.6, face: '-y', pose: 'stand' }); }
          c.add({ type: 'model3d', x: x1 - 1.6, y: H - 1.8 }, x1 - 2, H - 2);
          c.sign(x0 + 0.4, H - 0.4, '🎨 디자인 스튜디오', '#a67be0');
        } else {
          for (let ry = y0 + 1; ry + 1.2 < H - 1; ry += 2.8) { c.add({ type: 'labBench', x: x0 + 0.6, y: ry, w: x1 - x0 - 1.2 }, x0, Math.floor(ry), x1 - x0, 1); for (let x = x0 + 1.2; x < x1 - 1; x += 1.8) c.spot({ x, y: ry + 1.45, face: '-y', pose: 'stand' }); }
          c.sign(x0 + 0.4, H - 0.4, '🧬 실험실', '#3fb27f');
        }
      };
      if (lw >= 6) { fillLab(0, lw, kind); wallsAround(c, 0, y0, lw, H, y0 + 1, 'right'); }
      if (W - rw0 >= 6) { fillLab(rw0, W, kind === 'cs' ? 'cs' : kind === 'clean' ? 'clean' : kind === 'studio' ? 'studio' : kind === 'mech' ? 'cs' : 'bio'); wallsAround(c, rw0, y0, W, H, y0 + 1, 'left'); }
      lobbyBits(c, Math.max(0, lw), y0, Math.min(W, rw0), H, { board: true });
      c.staff('조교', { x: dc + 0.5, y: y0 + 0.9, face: '+y', pose: 'stand' }, { anim: 'idle', hat: 'cap', accent: '#1f9fb4', patrol: [{ x: dc + 0.5, y: y0 + 0.9, face: '+y' }, { x: 2, y: D + 1, face: '+x' }, { x: W - 2, y: D + 1, face: '-x' }], carry: 'paper' });
      void o;
    },
    cs(c) { T.lab(c, 'cs'); }, mech(c) { T.lab(c, 'mech'); }, clean(c) { T.lab(c, 'clean'); }, studio(c) { T.lab(c, 'studio'); },
    admin(c) {
      const { W, H, dc } = c, D = 6;
      strip(c, D, [{ w: 8, fill: R.president, floor: 'carpet', color: '#c9b38f', name: '🎓 총장실' }, { w: 8, fill: R.meeting, floor: 'carpet', color: '#c9d2dc', name: '🏛️ 대회의실', glass: true }, { w: 3, fill: (cc, rx, ry, rw, rd) => R.restroom(cc, rx, ry, rw, rd, 'm'), name: '🚹' }, { w: 3, fill: (cc, rx, ry, rw, rd) => R.restroom(cc, rx, ry, rw, rd, 'f'), name: '🚺' }, { w: 99, fill: (cc, rx, ry, rw, rd) => R.office(cc, rx, ry, rw, rd, '행정직원'), floor: 'carpet', color: '#d9d3c9', name: '🗂️ 행정실' }]);
      const y0 = D + 2;
      c.L.patches.push({ x: 0, y: y0, w: W, d: H - y0, style: 'marble', color: '#f1eee8' });
      c.L.rugs.push({ x: dc - 4, y: y0 + 1, w: 9, d: H - y0 - 2, color: '#a8323e', border: '#7a2232' });
      c.add({ type: 'reception', x: dc - 2.5, y: y0 + 1.6, w: 5 }, dc - 3, y0 + 1, 6, 1);
      c.staff('안내원', { x: dc, y: y0 + 0.9, face: '+y', pose: 'stand' }, { anim: 'idle', hat: 'bow', accent: '#1f4e9a' });
      for (const x of [1.5, W - 2.5]) { c.add({ type: 'sculpture', x, y: y0 + 1.5 }, Math.floor(x), y0 + 1); }
      c.add({ type: 'trophyCase', x: 1, y: H - 2.5, w: 4 }, 1, H - 3, 4, 1);
      for (const gx of [4, W - 8]) { c.add({ type: 'sofa', x: gx, y: y0 + 3.4, w: 3 }, gx, y0 + 3, 3, 1); [0.6, 1.6, 2.4].forEach((d) => c.spot({ x: gx + d, y: y0 + 4.02, face: '+y', pose: 'sofa', approach: [Math.floor(gx + d), y0 + 4] })); }
      c.sign(dc - 2, H - 0.4, '🏛️ 본관 로비');
    },
    hall(c) {
      const { W, H, dc, L } = c;
      L.patches.push({ x: 0, y: 0, w: W, d: H, style: 'carpet', color: '#7a2232' });
      c.add({ type: 'stage', x: 2, y: 0.4, w: W - 4 }, 1, 0, W - 2, 3);
      c.staff('연사', { x: dc, y: 1.5, face: '+y', pose: 'stand' }, { anim: 'point', hat: 'shades', accent: '#d97757', patrol: [{ x: dc, y: 1.5, face: '+y' }, { x: dc - 3, y: 1.5, face: '+y' }, { x: dc + 3, y: 1.5, face: '+y' }] });
      for (let ry = 4.5; ry + 1 < H - 3; ry += 1.4) for (const [x0, x1] of [[1, dc - 1], [dc + 2, W - 1]]) {
        c.add({ type: 'seatRow', x: x0, y: ry, w: x1 - x0, color: '#a8323e' }, x0, Math.floor(ry), x1 - x0, 1);
        for (let sx = x0 + 0.4; sx < x1 - 0.2; sx += 0.8) c.spot({ x: sx, y: ry + 0.35, face: '-y', pose: 'sit', approach: [Math.floor(sx), Math.floor(ry) + 1] });
      }
      c.sign(1, H - 0.4, '🎤 대강당');
    },
    library(c) {
      const { W, H, dc, L } = c, D = 5;
      strip(c, D, [{ w: 5, fill: R.study, floor: 'carpet', color: '#c9d2dc', name: '📖 스터디룸 1', glass: true }, { w: 5, fill: R.study, floor: 'carpet', color: '#c9d2dc', name: '📖 스터디룸 2', glass: true }, { w: 3, fill: (cc, rx, ry, rw, rd) => R.restroom(cc, rx, ry, rw, rd, 'm'), name: '🚹' }, { w: 3, fill: (cc, rx, ry, rw, rd) => R.restroom(cc, rx, ry, rw, rd, 'f'), name: '🚺' }, { w: 5, fill: R.study, floor: 'carpet', color: '#c9d2dc', name: '📖 스터디룸 3', glass: true }, { w: 99, fill: (cc, rx, ry, rw, rd) => R.office(cc, rx, ry, rw, rd, '사서'), floor: 'carpet', color: '#d9d3c9', name: '🗂️ 사서실' }]);
      const y0 = D + 2;
      L.patches.push({ x: 0, y: y0, w: W, d: H - y0, style: 'carpet', color: '#d8cdb8' });
      for (let ry = y0 + 0.6; ry + 1 < H - 2; ry += 2.2) for (const [x0, x1] of [[0.6, dc - 4], [dc + 5, W - 0.6]]) if (x1 - x0 >= 3) { c.add({ type: 'bookStack', x: x0, y: ry, w: x1 - x0, seed: ry * 7 + x0 }, Math.floor(x0), Math.floor(ry), Math.ceil(x1 - x0), 1); c.spot({ x: x0 + 1.2, y: ry + 1.4, face: '-y', pose: 'stand' }); }
      for (let ry = y0 + 1; ry + 2 < H - 2; ry += 3) { c.add({ type: 'readingTable', x: dc - 3, y: ry, w: 7 }, dc - 3, Math.floor(ry), 7, 2); for (let x = dc - 2.4; x < dc + 3.6; x += 1.6) for (const [dy, face] of [[-0.45, '+y'], [1.65, '-y']]) { c.add({ type: 'stool', x, y: ry + dy, color: '#a87a52' }); c.spot({ x, y: ry + dy, face, pose: 'sit' }); } }
      c.add({ type: 'till', x: dc + 2.2, y: H - 2.4, w: 3, label: '대출·반납' }, dc + 2, H - 3, 4, 1);
      c.staff('사서', { x: dc + 3.7, y: H - 3.2, face: '+y', pose: 'stand' }, { anim: 'type', hat: 'beret', accent: '#7a5540' });
      c.sign(1, H - 0.4, '📚 학술문화관 열람실');
    },
    dorm(c) {
      const { W, H, dc, L } = c, D = 4;
      const n = Math.max(1, Math.floor((W - 3) / 5));
      const rooms = [];
      for (let i = 0; i < n; i++) rooms.push({ w: 5, fill: R.dormRoom, floor: 'wood', color: '#e6d6bd', name: `🛏️ ${101 + i}호` });
      rooms.push({ w: 99, fill: (cc, rx, ry, rw) => { for (let k = 0; k < Math.min(3, rw - 0.5); k++) cc.add({ type: 'washer', x: rx + 0.2 + k * 1, y: ry + 0.3, k }, rx + k, ry); }, floor: 'tile', color: '#e4edf5', name: '🧺 세탁실' });
      strip(c, D, rooms);
      const y0 = D + 2;
      L.patches.push({ x: 0, y: y0, w: W, d: H - y0, style: 'wood', color: '#e2cfae' });
      c.add({ type: 'sofa', x: 1, y: y0 + 0.2, w: 3 }, 1, y0, 3, 1);
      [0.6, 1.6, 2.4].forEach((d) => c.spot({ x: 1 + d, y: y0 + 0.82, face: '+y', pose: 'sofa', approach: [Math.floor(1 + d), y0 + 1] }));
      c.add({ type: 'parcelShelf', x: W - 4, y: y0 - 1.6, w: 3, seed: W }, W - 4, y0 - 2, 4, 1);
      c.staff('사감', { x: W - 2.5, y: H - 1.2, face: '-y', pose: 'stand' }, { anim: 'idle', hat: 'bucket', accent: '#3f8a45' });
      void dc;
    },
    cafeteria(c) {
      const { W, H, dc, L } = c, D = 4;
      strip(c, D, [{ w: W - 6, fill: (cc, rx, ry, rw, rd) => R.kitchen(cc, rx, ry, rw, rd, 'pot'), floor: 'tile', color: '#e4e9ec', name: '🍳 조리실' }, { w: 3, fill: (cc, rx, ry, rw, rd) => R.restroom(cc, rx, ry, rw, rd, 'm') }, { w: 3, fill: (cc, rx, ry, rw, rd) => R.restroom(cc, rx, ry, rw, rd, 'f') }]);
      const y0 = D + 2;
      L.patches.push({ x: 0, y: y0, w: W, d: H - y0, style: 'tile', color: '#f2ede4' });
      c.add({ type: 'till', x: 1, y: y0 - 1.0, w: 6, label: '🍱 오늘의 메뉴 · 학식 4,500원', color: '#f4f1ec' }, 1, y0 - 1, 6, 1);
      c.add({ type: 'menuWall', x: 8, y: 0, w: 6, items: ['🍛 카레', '🍜 우동', '🍚 비빔밥', '🍖 돈까스', '🥗 샐러드', '🍲 국밥'] });
      c.staff('배식 담당', { x: 4, y: y0 - 1.7, face: '+y', pose: 'stand' }, { anim: 'type', hat: 'beret', accent: '#ffffff' });
      for (let ry = y0 + 1.5; ry + 1 < H - 1; ry += 2.5) for (let x = 2; x + 1 < W - 1; x += 3.5) {
        if (Math.abs(x - dc) < 1.6) continue;
        c.add({ type: 'roundTable', x, y: ry, r: 0.5, color: '#ffffff' }, Math.floor(x), Math.floor(ry));
        for (const [dx, face] of [[-1, '+x'], [1, '-x']]) { c.add({ type: 'stool', x: x + dx, y: ry, color: COLORS[(x | 0) % 7] }); c.spot({ x: x + dx, y: ry, face, pose: 'sit', carry: 'mug' }); }
      }
      c.sign(1, H - 0.4, '🍱 카이마루 푸드코트');
    },
    student(c) {
      const { W, H, dc, L } = c, D = 5;
      strip(c, D, [{ w: 6, fill: R.study, floor: 'carpet', color: '#e8e1f1', name: '🎸 밴드 동아리' }, { w: 6, fill: R.meeting, floor: 'carpet', color: '#dfe7ef', name: '🗳️ 총학생회' }, { w: 3, fill: (cc, rx, ry, rw, rd) => R.restroom(cc, rx, ry, rw, rd, 'm') }, { w: 3, fill: (cc, rx, ry, rw, rd) => R.restroom(cc, rx, ry, rw, rd, 'f') }, { w: 99, fill: R.study, floor: 'carpet', color: '#f3e6c9', name: '🎮 게임 동아리' }]);
      const y0 = D + 2;
      L.patches.push({ x: 0, y: y0, w: W, d: H - y0, style: 'tile', color: '#efe9df' });
      for (let x = 0.6; x + 3 < dc - 2; x += 3.6) c.add({ type: 'storeShelf', x, y: y0 + 0.6, w: 3, seed: x * 3 }, Math.floor(x), y0, 4, 2);
      c.add({ type: 'till', x: 1, y: H - 2.2, w: 3, label: '🏪 학생 매점' }, 1, H - 3, 3, 1);
      c.staff('매점 직원', { x: 2.5, y: H - 2.9, face: '+y', pose: 'stand' }, { anim: 'idle', hat: 'cap', accent: '#2f9e5f' });
      c.add({ type: 'piano', x: W - 4, y: y0 + 0.6 }, W - 4, y0, 2, 1);
      c.add({ type: 'sofa', x: W - 6, y: H - 2.5, w: 3 }, W - 6, H - 3, 3, 1);
      [0.6, 1.6, 2.4].forEach((d) => c.spot({ x: W - 6 + d, y: H - 1.88, face: '+y', pose: 'sofa', approach: [Math.floor(W - 6 + d), H - 1] }));
      c.add({ type: 'posterBoard', x: dc + 2, y: y0 + 0.4, w: 3 }, dc + 2, y0, 3, 1);
    },
    sports(c) {
      const { W, H, dc, L } = c, D = 5;
      strip(c, D, [{ w: 7, fill: R.lockers, floor: 'tile', color: '#e4edf5', name: '🚹 남자 탈의실' }, { w: 7, fill: R.lockers, floor: 'tile', color: '#f8e9ee', name: '🚺 여자 탈의실' }, { w: 99, fill: (cc, rx, ry, rw) => { for (let x = rx + 0.5; x + 1 < rx + rw; x += 1.3) cc.add({ type: 'treadmill', x, y: ry + 1.2 }, Math.floor(x), ry + 1, 1, 2); for (let x = rx + 0.5; x + 1 < rx + rw; x += 1.3) cc.spot({ x: x + 0.4, y: ry + 2.0, face: '-y', pose: 'stand' }); }, floor: 'raised', color: '#d5d9dd', name: '🏃 헬스장' }]);
      const y0 = D + 2;
      L.decals.push({ type: 'court', x: 1, y: y0 + 0.5, w: W - 2, d: H - y0 - 2.5, kind: 'basket' });
      c.add({ type: 'hoop', x: 1.6, y: y0 + (H - y0 - 2) / 2, side: -1 });
      c.add({ type: 'hoop', x: W - 1.6, y: y0 + (H - y0 - 2) / 2, side: 1 });
      for (let k = 0; k < 6; k++) c.spot({ x: 4 + k * (W - 8) / 5, y: y0 + 2 + (k % 3) * 2, face: k % 2 ? '-x' : '+x', pose: 'stand', carry: 'ball' });
      c.staff('코치', { x: dc, y: H - 1.6, face: '-y', pose: 'stand' }, { anim: 'wave', hat: 'cap', accent: '#e5534b', say: '📣 화이팅!' });
      c.sign(1, H - 0.4, '🏀 체육관');
    },
    fire(c) {
      const { W, H, dc, L } = c, D = 5;
      strip(c, D, [{ w: 7, fill: (cc, rx, ry, rw) => cc.add({ type: 'gearRack', x: rx + 0.3, y: ry + 0.3, w: rw - 0.6 }, rx, ry, rw, 1), floor: 'concrete', color: '#cfcac2', name: '🧯 장비실' }, { w: 7, fill: (cc, rx, ry, rw, rd) => R.office(cc, rx, ry, rw, rd, '소방관'), floor: 'tile', color: '#e4e0d8', name: '📟 상황실' }, { w: 3, fill: (cc, rx, ry, rw, rd) => R.restroom(cc, rx, ry, rw, rd, 'm') }, { w: 99, fill: R.study, floor: 'wood', color: '#e2cfae', name: '🍲 대기실' }]);
      const y0 = D + 2;
      L.patches.push({ x: 0, y: y0, w: W, d: H - y0, style: 'concrete', color: '#c9c6bf' });
      for (let i = 0; i < 2; i++) { const x = 3 + i * 8; L.decals.push({ type: 'hazard', x: x - 0.4, y: y0 + 0.4, w: 2.2, d: H - y0 - 1 }); c.add({ type: 'fireTruck', x, y: y0 + 1 }, x, y0 + 1, 2, 5); }
      c.add({ type: 'firePole', x: W - 3, y: y0 + 1.5 });
      c.staff('소방관', { x: W - 5, y: y0 + 2, face: '+y', pose: 'stand' }, { anim: 'idle', hat: 'hardhat', accent: '#e5534b', vest: '#f2c230', patrol: [{ x: W - 5, y: y0 + 2, face: '+y' }, { x: 6, y: H - 1.5, face: '-y' }, { x: W - 3, y: H - 1.5, face: '-x' }] });
      c.sign(1, H - 0.4, '🚒 차고');
    },
    warehouse(c) {
      const { W, H, dc, L } = c;
      L.patches.push({ x: 0, y: 0, w: W, d: H, style: 'concrete', color: '#c6c4bd' });
      for (let ry = 1; ry + 1 < H - 5; ry += 3.4) for (const [x0, x1] of [[1, dc - 3], [dc + 3, W - 1]]) for (let x = x0; x + 3 <= x1; x += 3.2) c.add({ type: 'palletRack', x, y: ry, w: 3, seed: x * 5 + ry }, Math.floor(x), Math.floor(ry), 3, 1);
      L.decals.push({ type: 'lane', x: dc - 2, y: 0.5, w: 4, d: H - 1 });
      c.add({ type: 'forklift', x: dc - 1, y: 4 }, dc - 1, 4, 2, 1);
      for (let k = 0; k < 4; k++) c.add({ type: 'pallet', x: 2 + k * 3, y: H - 3, count: 3 + k * 2 }, 2 + k * 3, H - 3, 2, 2);
      c.staff('물류 담당', { x: dc, y: H - 4, face: '-y', pose: 'stand' }, { anim: 'idle', hat: 'hardhat', accent: '#f2c230', vest: '#ff8a3d', carry: 'box', patrol: [{ x: dc, y: H - 4, face: '-y' }, { x: dc, y: 2, face: '-y' }, { x: 4, y: H - 4.5, face: '+y' }] });
      c.sign(1, H - 0.4, '📦 물류센터 적재 구역');
    },
    daycare(c) {
      const { W, H, L } = c;
      L.patches.push({ x: 0, y: 0, w: W, d: H, style: 'wood', color: '#f3e6c9' });
      L.decals.push({ type: 'rubber', x: 0.5, y: 0.5, w: W - 1, d: H - 2.5 });
      c.add({ type: 'toyBlocks', x: 1, y: 1, seed: 3 });
      c.add({ type: 'toyBlocks', x: W - 2.5, y: 1.5, seed: 7 });
      c.add({ type: 'roundTable', x: W / 2, y: 2.5, r: 0.5, color: '#f7b6c8' }, Math.floor(W / 2), 2);
      for (const [dx, face] of [[-0.9, '+x'], [0.9, '-x']]) c.add({ type: 'stool', x: W / 2 + dx, y: 2.5, color: '#7ab8f5' });
      c.staff('보육 선생님', { x: 2, y: H - 2, face: '-y', pose: 'stand' }, { anim: 'wave', hat: 'bow', accent: '#f07a8a' });
      for (let k = 0; k < 3; k++) I().npc(c.S, L, { id: `N:${c.o.id}:kid${k}`, role: '어린이', home: { x: 1.5 + k * 2.5, y: 4, face: '+y', pose: 'stand' }, anim: 'cheer', hat: ['bow', 'cap', 'beanie'][k], accent: ['#f07a8a', '#7ab8f5', '#f6c445'][k], kid: true, patrol: [{ x: 1.5 + k * 2.5, y: 4, face: '+y' }, { x: W - 1.5 - k, y: 1.6, face: '-y' }, { x: 1.2, y: 1.2 + k, face: '+x' }] });
    },
    ring(c) {
      const { W, H, L, o } = c;
      const R0 = o.ring;
      L.floor = 'grass'; L.outer = 'none';
      L.decals.push({ type: 'ringFloor', cx: W / 2, cy: H / 2, R: R0.R, r: R0.r });
      for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) { const d = Math.hypot(i + 0.5 - W / 2, j + 0.5 - H / 2); if (d < R0.r + 0.2 || d > R0.R - 0.2) c.K.block(i, j); }
      const n = 18;
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2, rr = (R0.R + R0.r) / 2;
        const x = W / 2 + Math.cos(a) * rr, y = H / 2 + Math.sin(a) * rr;
        if (Math.abs(Math.cos(a)) < 0.2 && Math.sin(a) > 0) continue;
        if (Math.abs(Math.sin(a)) < 0.2 && Math.cos(a) > 0) continue;
        if (k % 3 === 0) { c.add({ type: 'roundTable', x, y, r: 0.45, color: '#ffffff' }, Math.floor(x), Math.floor(y)); c.spot({ x: x + 0.9, y, face: '-x', pose: 'stand' }); }
        else { c.add({ type: 'desk', x: x - 1, y: y - 0.5, w: 2, d: 1, face: '+y', seed: k }, Math.floor(x - 1), Math.floor(y - 0.5), 2, 1); c.spot({ x, y: y - 0.95 + 0.5, face: '+y', pose: 'stand' }); }
      }
      c.staff('R&D 리드', { x: W / 2, y: H / 2 + (R0.R + R0.r) / 2 - 1.2, face: '-y', pose: 'stand' }, { anim: 'think', hat: 'shades', accent: '#4e7cf6' });
      L.windows = [];
    },
    shop(c) {
      const { W, H, dc, L, o } = c;
      const k = o.shop;
      L.patches.push({ x: 0, y: 0, w: W, d: H, style: k.floor || 'tile', color: k.color || '#f2ede4' });
      c.add({ type: 'wallSign', x: 0.6, y: 0, text: o.name, color: k.accent || '#2b2622' });
      const tables = (y0) => { for (let x = 1.5; x + 1 < W - 0.5; x += 3) { if (Math.abs(x - dc - 0.5) < 1.2) continue; c.add({ type: 'roundTable', x, y: y0, r: 0.45, color: '#ffffff' }, Math.floor(x), Math.floor(y0)); for (const [dx, face] of [[-0.95, '+x'], [0.95, '-x']]) { c.add({ type: 'stool', x: x + dx, y: y0, color: k.accent || '#c49a62' }); c.spot({ x: x + dx, y: y0, face, pose: 'sit', carry: k.carry || null }); } } };
      const clerk = (role, x, y, anim = 'type') => c.staff(role, { x, y, face: '+y', pose: 'stand' }, { anim, hat: k.hat ?? 'cap', accent: k.accent || '#2f9e5f' });
      switch (k.kind) {
        case 'mart':
          c.add({ type: 'fridgeCase', x: 0.4, y: 0.4, w: W - 3.5 }, 0, 0, W - 3, 1);
          for (let ry = 2; ry + 1 < H - 2; ry += 2) c.add({ type: 'storeShelf', x: 0.6, y: ry, w: dc - 1.2, seed: ry * 3 }, 0, ry, dc, 1);
          c.add({ type: 'till', x: dc + 2, y: H - 2.6, w: 3, label: '계산대' }, dc + 2, H - 3, 3, 1); clerk('편의점 알바', dc + 3.5, H - 3.3, 'idle');
          for (let ry = 2; ry + 1 < H - 2; ry += 2) c.spot({ x: dc - 0.5, y: ry + 1.5, face: '-x', pose: 'stand' });
          break;
        case 'food':
          c.add({ type: k.oven === 'pizza' ? 'pizzaOven' : 'kitchenLine', x: 0.4, y: 0.4, w: W - 3, kind: k.fry ? 'fry' : 'pot' }, 0, 0, k.oven === 'pizza' ? 2 : W - 3, k.oven === 'pizza' ? 2 : 1);
          if (k.oven === 'pizza') c.add({ type: 'kitchenLine', x: 2.6, y: 0.4, w: W - 5.6, kind: 'pot' }, 2, 0, W - 5, 1);
          c.add({ type: 'menuWall', x: 0.4, y: 0, w: Math.min(5, W - 3), items: k.menu || [] });
          clerk(k.cook || '요리사', 2.2, 1.9, 'type');
          c.add({ type: 'till', x: W - 3.2, y: 1.6, w: 2.6, label: '주문' }, W - 4, 1, 4, 1); clerk('점원', W - 1.9, 1.0, 'idle');
          tables(H - 2.2);
          break;
        case 'cafe':
          c.add({ type: 'cafeCounter', x: 0.8, y: 0.8, w: W - 2.6 }, 0, 0, W - 1, 2); clerk('바리스타', 2.6, 0.3, 'type');
          tables(H - 2.2);
          break;
        case 'books':
          for (let ry = 0.4; ry + 1 < H - 2.5; ry += 2) c.add({ type: 'bookStack', x: 0.5, y: ry, w: W - 4, seed: ry * 11 }, 0, Math.floor(ry), W - 3, 1);
          c.add({ type: 'till', x: W - 3, y: H - 2.6, w: 2.4, label: '계산' }, W - 3, H - 3, 3, 1); clerk('서점 주인', W - 1.6, H - 3.3, 'idle');
          for (let ry = 1.6; ry + 1 < H - 2.5; ry += 2) c.spot({ x: 2 + ry, y: ry, face: '-y', pose: 'stand' });
          break;
        case 'flower':
          c.add({ type: 'flowerStand', x: 0.5, y: 0.4, w: W - 4, seed: 5 }, 0, 0, W - 3, 2);
          c.add({ type: 'flowerStand', x: 0.5, y: H - 3, w: 3, seed: 9 }, 0, H - 3, 4, 2);
          c.add({ type: 'till', x: W - 3, y: H - 2.6, w: 2.4, label: '꽃다발 포장' }, W - 3, H - 3, 3, 1); clerk('플로리스트', W - 1.6, H - 3.3, 'type');
          c.spot({ x: dc, y: 2.4, face: '-y', pose: 'stand' });
          break;
        case 'salon':
          for (let x = 0.8; x + 1.4 < W - 0.5; x += 2.2) { c.add({ type: 'salonStation', x, y: 0.1 }, Math.floor(x), 0, 2, 2); c.spot({ x: x + 0.55, y: 1.35, face: '-y', pose: 'sit' }); }
          clerk('헤어 디자이너', 2.2, 2.6, 'type'); clerk('헤어 디자이너', W - 3, 2.6, 'type');
          c.add({ type: 'sofa', x: 0.6, y: H - 2.4, w: 3 }, 0, H - 3, 4, 1);
          break;
        case 'pc':
          for (let ry = 0.5; ry + 1.5 < H - 1.5; ry += 2.2) for (let x = 0.4; x + 1.6 < W - 0.3; x += 1.9) { if (Math.abs(x + 0.8 - dc - 0.5) < 1 && ry > H - 4) continue; c.add({ type: 'pcStation', x, y: ry }, Math.floor(x), Math.floor(ry), 2, 1); c.add({ type: 'chair', x: x + 0.8, y: ry + 1.35, face: '-y', part: 'seat' }); c.add({ type: 'chair', x: x + 0.8, y: ry + 1.35, face: '-y', part: 'back' }); c.spot({ x: x + 0.8, y: ry + 1.35, face: '-y', pose: 'sit' }); }
          clerk('PC방 사장님', W - 1.2, H - 1.4, 'idle');
          break;
        case 'gym':
          for (let x = 0.6; x + 1 < W - 0.5; x += 1.3) { c.add({ type: 'treadmill', x, y: 0.3 }, Math.floor(x), 0, 1, 2); c.spot({ x: x + 0.4, y: 1.0, face: '-y', pose: 'stand' }); }
          c.add({ type: 'weightRack', x: 0.6, y: H - 2.6 }, 0, H - 3, 3, 1);
          clerk('트레이너', W - 2, H - 2, 'wave');
          break;
        case 'bakery':
          c.add({ type: 'breadCase', x: 0.6, y: 0.6, w: W - 3 }, 0, 0, W - 2, 2); clerk('제빵사', 2, 0.15, 'type');
          c.add({ type: 'pizzaOven', x: W - 2.2, y: 0.3 }, W - 3, 0, 3, 2);
          tables(H - 2.2);
          break;
        case 'sushi':
          c.add({ type: 'sushiBelt', x: 1, y: 1.2, w: W - 2 }, 1, 1, W - 2, 2);
          for (let x = 1.5; x < W - 1.2; x += 1.2) { c.add({ type: 'barStool', x, y: 3.1 }); c.spot({ x, y: 3.08, face: '-y', pose: 'sit' }); }
          clerk('초밥 장인', dc, 0.6, 'type');
          break;
        default:
          for (let ry = 0.6; ry + 1 < H - 2.5; ry += 2) c.add({ type: 'storeShelf', x: 0.6, y: ry, w: W - 4, seed: ry * 5 }, 0, Math.floor(ry), W - 3, 1);
          c.add({ type: 'till', x: W - 3, y: H - 2.6, w: 2.4, label: '계산' }, W - 3, H - 3, 3, 1); clerk(k.clerk || '점원', W - 1.6, H - 3.3, 'idle');
          c.spot({ x: 2, y: H - 2, face: '-y', pose: 'stand' });
      }
      L.windows = [];
    },
  };

  // shop catalogue: name → interior kind
  const SHOPS = {
    '🏪 편의점': { kind: 'mart', accent: '#2f9e5f' },
    '🍗 치킨집': { kind: 'food', fry: true, accent: '#e9a23b', cook: '치킨 사장님', menu: ['🍗 후라이드 18K', '🍗 양념 19K', '🍺 생맥 4K'], carry: 'mug' },
    '☕ 카페 어은': { kind: 'cafe', accent: '#7a4a2a', floor: 'wood', color: '#e2cfae', carry: 'mug' },
    '📚 서점': { kind: 'books', accent: '#7a5540', floor: 'wood', color: '#e6d6bd' },
    '🍜 분식집': { kind: 'food', accent: '#e5534b', cook: '분식 이모님', menu: ['🍢 떡볶이 4K', '🍙 김밥 3K', '🍜 라면 4K'] },
    '💐 꽃집': { kind: 'flower', accent: '#e2667f', floor: 'tile', color: '#f6efe6' },
    '✏️ 문구점': { kind: 'other', accent: '#4e7cf6', clerk: '문구점 사장님' },
    '💊 약국': { kind: 'other', accent: '#3fb27f', clerk: '약사', hat: null },
    '🥐 빵집': { kind: 'bakery', accent: '#c47f22', floor: 'wood', color: '#efe0c4' },
    '🍕 피자': { kind: 'food', oven: 'pizza', accent: '#e5534b', cook: '피자 셰프', menu: ['🍕 페퍼로니 16K', '🍕 고르곤졸라 15K'] },
    '🧋 버블티': { kind: 'cafe', accent: '#a67be0', carry: 'mug' },
    '✂️ 미용실': { kind: 'salon', accent: '#e2667f', floor: 'tile', color: '#f4f1ec' },
    '🍔 버거': { kind: 'food', fry: true, accent: '#e9a23b', cook: '버거 셰프', menu: ['🍔 치즈버거 6K', '🍟 감자튀김 3K'] },
    '🍣 초밥': { kind: 'sushi', accent: '#1f4e9a', floor: 'wood', color: '#e6d6bd' },
    '🎮 PC방': { kind: 'pc', accent: '#7a2232', floor: 'carpet', color: '#3b3f45' },
    '🏋️ 헬스장': { kind: 'gym', accent: '#e5534b', floor: 'raised', color: '#d5d9dd' },
  };

  AIO.interiors2 = { make, SHOPS };
})();
