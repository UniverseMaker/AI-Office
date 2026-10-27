// 기존 맵에서 떼어 낸 실외(부지) 5종: 골목 · 마당 · 선셋 테라스 야외 · AI 캠퍼스 · 없음(건물만).
// 골목/마당은 꼬마빌딩(22×16) 기준 좌표를 건물 크기만큼 밀어서 어떤 건물이든 앉힌다 (꼬마빌딩이면 원본과 똑같다).
(function () {
  const C = AIO.compose;

  // ---------------------------------------------------------------- 🛣️ 골목
  C.outdoor({
    id: 'street', icon: '🛣️', name: '골목', desc: '도로·횡단보도·쌈지공원·주차장',
    size: (B) => ({ W: B.W + 24, H: B.H + 22 }),
    lot(S, OUT, B, k) {
      const W = k.W, H = k.H, TX = 12, TY = 6;
      k.place(B, TX, TY);
      const front = k.front, R0 = TX + B.W;
      k.plaza(0, front, W, 5, '#e6e0d4');
      const R = k.road(front + 6, '골목길');
      k.cross(R, TX + B.doorX - 1.5);
      k.G.decals.push({ type: 'meadow', x: 1, y: 3, w: 10, d: front - 4, seed: 5 });
      for (const [bx, by] of [[2, front - 8], [6.5, front - 4]]) { k.add({ type: 'bench', x: bx, y: by, w: 2.4 }, bx, by, 3, 1); for (let q = 0; q < 2; q++) k.rest({ x: bx + 0.7 + q * 1.1, y: by + 0.25, face: '+y', pose: 'sit', approach: [Math.floor(bx) + q, by + 1] }, '쌈지공원 벤치'); }
      k.add({ type: 'bikeRack', x: 7, y: front - 0.7 }, 7, front - 1, 3, 1);
      k.G.fell.push({ cx: 5.5, cy: 9, rx: 3, ry: 1.6, seed: 11 }); k.solid(3, 8, 6, 2);
      for (const [x, y, kind] of [[1, 3, 'cherry'], [9, 4, 'maple'], [2, 7, 'oak'], [9, 12, 'cherry'], [1, front - 4, 'pine']]) k.tree(x, y, 1.05, kind);
      k.G.decals.push({ type: 'parking', x: R0 + 2, y: 7, w: 9, d: 14, n: 3 }); k.mark(R0 + 2, 7, 9, 14, 1);
      for (let i = 0; i < 3; i++) k.add({ type: 'parkedCar', x: R0 + 2.9 + i * 3, y: i % 2 ? 15.1 : 11.4, axis: 'y', dir: i % 2 ? -1 : 1, color: ['#4e7cf6', '#ffffff', '#e5534b'][i] });
      for (let x = 1; x < W - 1; x += 3) k.tree(x, 1, 1, x % 2 ? 'ginkgo' : 'oak');
      for (let x = 2; x < W - 1; x += 6) { k.tree(x, R.y - 2, 1.05, 'ginkgo'); k.tree(x + 3, R.y + 5, 1.05, 'ginkgo'); }
      for (const x of [8, Math.round(W / 2) + 3, W - 6]) { const f = { type: 'streetLamp', x: x + 0.5, y: R.y - 0.6 }; k.K.add(f); OUT.lamps.push(f); }
      S.traffic = { roads: k.roads, cross: k.G.cross };
      S.door = { lv: OUT.idx, x: TX + B.doorX + 0.5, y: front + 3, face: '-y' };
    },
  });

  // ---------------------------------------------------------------- 🏡 마당
  C.outdoor({
    id: 'yard', icon: '🏡', name: '마당', desc: '울타리 마당 · 텃밭·바비큐·트램펄린·연못·반려동물',
    size: (B) => ({ W: 62 + B.W - 22, H: 52 + B.H - 16 }),
    lot(S, OUT, B, k) {
      const dx = B.W - 22, dy = B.H - 16;
      // 꼬마빌딩 기준 좌표 → 이 건물 기준: 건물 오른쪽(x≥27)은 dx 만큼, 건물 아래(x<27, y>21)는 dy 만큼 민다
      const X = (x) => (x >= 27 ? x + dx : x), Y = (x, y) => (x < 27 && y > 21 ? y + dy : y);
      const W = k.W, H = k.H, TX = 5, TY = 5, ROADY = 46 + dy;
      k.place(B, TX, TY);
      const front = k.front;
      const R = k.road(ROADY, '동네길');
      k.cross(R, X(29));
      const GATE = [X(28), X(33)];
      const fence = (axis, x, y) => { k.K.add({ type: 'fence', axis, x, y }); k.K.block(axis === 'x' ? x : x - 1, axis === 'x' ? y - 1 : y); };
      for (let x = 1; x < W - 1; x++) { fence('x', x, 1); if (x < GATE[0] || x >= GATE[1]) fence('x', x, ROADY - 1); }
      for (let y = 1; y < ROADY - 1; y++) { fence('y', 1, y); fence('y', W - 1, y); }
      // 마당 길: 대문 → 현관 (꼬마빌딩 곡선을 문 위치에 맞춰 늘림)
      const doorX = TX + B.doorX + 0.5, gx = X(30.5);
      const mapP = ([px, py]) => [doorX + (px - 16.5) * ((gx - doorX) / 14), front + 1 + (py - 22) * ((ROADY - 2 - front) / 23)];
      k.plaza(TX + B.doorX - 2, front, 5, 2, '#e6dccb');
      k.G.curves.push({ pts: [[30.5, 45], [29, 38], [22, 30], [17, 24.5], [16.5, 22]].map(mapP), w: 1.6, dots: true });
      for (const p of [[30.5, 44], [29.5, 40], [27, 35], [23, 31], [19.5, 27], [17, 24]].map(mapP)) k.mark(Math.floor(p[0]) - 1, Math.floor(p[1]) - 1, 3, 3, 1);
      k.plaza(4, Y(4, 28), 9, 7, '#d5d0c6'); k.add({ type: 'parkedCar', x: 6, y: Y(6, 30), axis: 'y', dir: 1, color: '#f2c230' });
      k.add({ type: 'parkedCar', x: 9, y: Y(9, 30.4), axis: 'y', dir: 1, color: '#4e7cf6' });
      for (let i = 0; i < 3; i++) k.add({ type: 'veggies', x: X(31 + i * 4.6), y: 4, w: 3.6, d: 2.2, seed: i * 7 }, X(31 + i * 4.6), 4, 4, 3);
      S.npcs.push({ lv: OUT.idx, id: 'N:gardener-yard', role: '텃밭 지기', home: { lv: OUT.idx, x: X(33), y: 7.6, face: '-y', pose: 'stand' }, anim: 'idle', hat: 'bucket', accent: '#3f8a45', say: '🥬 오늘 상추 따요', patrol: [{ lv: OUT.idx, x: X(33), y: 7.6, face: '-y', pose: 'stand' }, { lv: OUT.idx, x: X(42), y: 7.6, face: '-y', pose: 'stand' }] });
      const PD = { cx: X(53), cy: 10, rx: 5, ry: 3.2 };
      k.pond(PD.cx, PD.cy, PD.rx, PD.ry);
      k.add({ type: 'stoneLantern', x: X(46.5), y: 8 }, X(46), 8);
      k.add({ type: 'trampoline', x: X(41), y: 17 }, X(40), 16, 3, 3);
      k.add({ type: 'swingSet', x: X(47), y: 18 }, X(47), 17, 4, 2);
      S.park = { mats: [], wander: [], play: [{ lv: OUT.idx, x: X(41), y: 17, face: '+y', pose: 'stand', ball: false }, { lv: OUT.idx, x: X(47.9), y: 19.3, face: '+y', pose: 'sit', swing: 0, at: [X(47), 18] }, { lv: OUT.idx, x: X(49.1), y: 19.3, face: '+y', pose: 'sit', swing: 1, at: [X(47), 18] }] };
      k.add({ type: 'bbq', x: X(34), y: 22 }, X(34), 22, 2, 1);
      S.npcs.push({ lv: OUT.idx, id: 'N:bbq-yard', role: '바비큐 담당', home: { lv: OUT.idx, x: X(34.6), y: 23.5, face: '-y', pose: 'stand' }, anim: 'type', hat: 'beret', accent: '#e5534b' });
      k.add({ type: 'picnicTable', x: X(37), y: 22 }, X(37), 22, 4, 2);
      for (const [ddx, ddy, face] of [[0.6, -0.35, '+y'], [2.0, -0.35, '+y'], [0.6, 2.25, '-y'], [2.0, 2.25, '-y']]) k.rest({ x: X(37) + ddx, y: 22 + ddy, face, pose: 'sit' }, '마당 바비큐');
      k.add({ type: 'parasol', x: X(38.4), y: 23, color: '#e5534b' });
      k.add({ type: 'firePit', x: X(52), y: 25 }, X(51), 24, 2, 2);
      for (const [bx, by] of [[X(49.4), 22], [X(49.4), 27.2]]) { k.add({ type: 'bench', x: bx, y: by, w: 5.2, color: '#a87a52' }, Math.floor(bx), Math.floor(by), 6, 1); for (let q = 0; q < 4; q++) k.rest({ x: bx + 0.7 + q * 1.25, y: by + 0.25, face: by < 25 ? '+y' : '-y', pose: 'sit', approach: [Math.floor(bx + 0.7 + q * 1.25), Math.floor(by) + (by < 25 ? 1 : -1)] }, '마당 불멍'); }
      k.add({ type: 'stringLights', pts: [[X(33.5), 20.5], [X(42.5), 20.5], [X(42.5), 26.5]] }); k.solid(X(33), 20, 1, 1); k.solid(X(42), 20, 1, 1); k.solid(X(42), 26, 1, 1);
      k.add({ type: 'hammock', x: X(54), y: 33 }, X(54), 33, 3, 1);
      const matColors = ['#e5534b', '#4e7cf6', '#3fb27f', '#e9a23b'];
      [[30, 29], [36, 32], [42, 36], [48, 38]].forEach(([mx0, my], i) => {
        const mx = X(mx0);
        k.G.decals.push({ type: 'mat', x: mx, y: my, w: 3, d: 2.2, color: matColors[i] }); k.mark(mx, my, 3, 3, 1);
        k.add({ type: 'basket', x: mx + 1.5, y: my + 1.1 });
        S.park.mats.push({ x: mx, y: my, seats: [[mx + 0.6, my + 0.6, '+y'], [mx + 2.4, my + 0.6, '+y'], [mx + 0.6, my + 1.7, '-y'], [mx + 2.4, my + 1.7, '-y']].map(([x, y, face]) => ({ lv: OUT.idx, x, y, face, pose: 'sit', tag: '마당 피크닉' })) });
      });
      for (const [x, y] of [[33, 27], [45, 30], [52, 41], [38, 41]]) S.park.wander.push({ x: X(x) + 0.5, y: y + 0.5, face: '+y' });
      k.add({ type: 'doghouse', x: X(30), y: 13 }, X(30), 13, 2, 2);
      k.add({ type: 'catTree', x: X(28.5), y: 22 }, X(28), 22, 1, 1);
      k.add({ type: 'coop', x: X(56), y: 38 }, X(56), 38, 2, 2);
      k.G.fell.push({ cx: 24, cy: 10, rx: 3, ry: 1.6, seed: 3 }, { cx: 24, cy: 17, rx: 2.4, ry: 1.4, seed: 4 }, { cx: 14, cy: Y(14, 39), rx: 3.2, ry: 1.6, seed: 5 });
      k.solid(21, 9, 6, 2); k.solid(22, 16, 5, 2); k.solid(11, Y(11, 38), 7, 2);
      for (const [x, y, kind] of [[3, 3, 'pine'], [58, 3, 'pine'], [3, 42, 'cherry'], [58, 43, 'maple'], [27, 3, 'cherry'], [45, 13, 'oak'], [20, 42, 'oak'], [58, 20, 'cherry'], [3, 24, 'maple'], [44, 42, 'cherry']]) k.tree(X(x), Y(x, y), 1.15, kind);
      for (let x = 2; x < W - 1; x += 5) k.tree(x, R.y + 5, 1, 'ginkgo');
      for (const x of [10, X(40)]) { const f = { type: 'streetLamp', x: x + 0.5, y: R.y - 0.6 }; k.K.add(f); OUT.lamps.push(f); }
      S.pets = [
        { kind: 'dog', color: '#d9a066' }, { kind: 'dog', color: '#f4ead8' },
        { kind: 'cat', color: '#f0a050' }, { kind: 'cat', color: '#8a8f96' },
        { kind: 'duck', color: '#ffffff', near: [PD.cx, PD.cy] }, { kind: 'duck', color: '#3f8a45', near: [PD.cx, PD.cy] },
        { kind: 'hen', chicks: 4 },
      ];
      S.traffic = { roads: k.roads, cross: k.G.cross };
      S.door = { lv: OUT.idx, x: gx, y: ROADY - 0.6, face: '-y' };
      // 반려동물은 울타리 안에서만
      S.petArea = [];
      k.afterFinish = () => { for (let j = 2; j < ROADY - 2; j++) for (let i = 2; i < W - 2; i++) if (OUT.grid[j * W + i] && !(i >= TX && i < TX + B.W && j >= TY && j < TY + B.H)) S.petArea.push([i + 0.5, j + 0.5]); };
    },
  });

  // ---------------------------------------------------------------- 🌅 선셋 테라스 야외 (카페 · 인피니티 풀 · 캠프파이어 · 연못 정원 · 동물들)
  C.outdoor({
    id: 'terrace', icon: '🌅', name: '선셋 테라스', desc: '테라스 카페 · 인피니티 풀 · 캠프파이어 · 연못 정원 · 동물들',
    size: (B) => ({ W: B.W + 2 + 24, H: Math.max(B.H + 2 + 15, 38) }),
    lot(S, OUT, B, k) {
      const TX = 1, TY = 1;
      k.place(B, TX, TY);
      const Wi = TX + B.W + 1, Hi = TY + B.H + 1, W = k.W, H = k.H, X0 = Wi + 1;
      const rest = (s, tag) => k.rest(s, tag);
      const add = k.add;
      // 바닥: 오른쪽 데크(카페·풀) · 그 아래 잔디 · 건물 아래 잔디 정원
      k.area(Wi, 0, W - Wi, 19, 'deck', '#c79f74', 1);
      k.area(0, Hi, Wi, H - Hi, 'grass', '#a6d28b');
      k.area(Wi, 19, W - Wi, H - 19, 'grass', '#a6d28b');
      k.area(0, 0, Wi, Hi, 'deck', '#c9a57a', 1);
      // ☕ 테라스 카페
      add({ type: 'cafeCounter', x: X0 + 1.4, y: 1.3, w: 6.4 }, X0 + 1, 1, 7, 1);
      k.npc('바리스타', { x: X0 + 4.6, y: 0.55, face: '+y' }, { anim: 'type', hat: 'beret', accent: '#7a4a2a' });
      for (let i = 0; i < 4; i++) { const x = X0 + 2 + i * 1.3; add({ type: 'barStool', x, y: 2.6 }); rest({ x, y: 2.58, face: '-y', pose: 'sit' }, '테라스 카페'); }
      for (const [x, y, c] of [[X0 + 12, 2.5, '#e2667f'], [X0 + 17, 2.5, '#4e7cf6'], [X0 + 12, 7, '#3fb27f'], [X0 + 17, 7, '#e9a23b'], [X0 + 3, 7, '#a67be0']]) {
        add({ type: 'parasolTable', x, y, color: c }, Math.floor(x), Math.floor(y));
        for (const [ddx, face] of [[-1, '+x'], [1, '-x']]) { add({ type: 'stool', x: x + ddx, y, color: '#f3d48c' }); rest({ x: x + ddx, y, face, pose: 'sit' }, '테라스 카페'); }
      }
      k.sign(X0 + 0.6, 9.4, '☕ 테라스 카페', '#7a4a2a');
      // 🏊 인피니티 풀
      k.water(X0 + 1, 11, 11, 6, { type: 'pool', x: X0 + 1, y: 11, w: 11, d: 6 });
      for (let q = 0; q < 3; q++) for (const [yy, cc] of [[11.4, ['#4e9cf6', '#f2a7c3', '#f6c445']], [15, ['#3fb27f', '#e5534b', '#a67be0']]]) { const x = X0 + 14 + q * 2.4; add({ type: 'deckChair', x, y: yy, color: cc[q] }, Math.floor(x), Math.floor(yy), 1, 1); rest({ x, y: yy + 0.55, face: '+y', pose: 'sofa', approach: [Math.floor(x), Math.floor(yy) + 2] }, '풀사이드 선베드'); }
      add({ type: 'parasol', x: X0 + 15.2, y: 14.2, color: '#e5534b' }); add({ type: 'parasol', x: X0 + 19.8, y: 14.2, color: '#4e7cf6' });
      k.sign(X0 + 1.2, 18.2, '🏊 인피니티 풀', '#1f9fb4');
      k.npc('안전요원', { x: X0 + 12.6, y: 17.6, face: '-y' }, { hat: 'cap', accent: '#e5534b', patrol: [{ x: X0 + 12.6, y: 17.6, face: '-y' }, { x: X0 + 6, y: 18, face: '-y' }, { x: X0 + 12.6, y: 10.3, face: '+y' }] });
      // 🔥 캠프파이어 라운지
      const fy = Math.min(H - 8, 26);
      add({ type: 'firePit', x: X0 + 11, y: fy }, X0 + 10, fy - 1, 2, 2);
      for (const [bx, by] of [[X0 + 8.4, fy - 3], [X0 + 8.4, fy + 2.2]]) { add({ type: 'bench', x: bx, y: by, w: 5.2, color: '#a87a52' }, Math.floor(bx), Math.floor(by), 6, 1); for (let q = 0; q < 4; q++) rest({ x: bx + 0.7 + q * 1.25, y: by + 0.25, face: by < fy ? '+y' : '-y', pose: 'sit', carry: q % 2 ? 'mug' : null, approach: [Math.floor(bx + 0.7 + q * 1.25), Math.floor(by) + (by < fy ? 1 : -1)] }, '캠프파이어'); }
      add({ type: 'hammock', x: X0 + 15, y: fy + 6 }, X0 + 15, Math.floor(fy + 6), 3, 1);
      add({ type: 'stringLights', pts: [[X0 + 6.5, fy - 4.5], [X0 + 15.5, fy - 4.5], [X0 + 15.5, fy + 4.5], [X0 + 6.5, fy + 4.5]] });
      for (const [x, y] of [[X0 + 6, fy - 5], [X0 + 15, fy - 5], [X0 + 15, fy + 4], [X0 + 6, fy + 4]]) k.solid(Math.floor(x), Math.floor(y), 1, 1);
      k.sign(X0 + 6.6, fy + 4.9, '🔥 캠프파이어 라운지', '#c47f22');
      OUT.lamps.push({ x: X0 + 11, y: fy });
      // 🌻 플라워 가든 + 피크닉
      const gy0 = fy + 9;
      for (let yy = gy0; yy + 2 < H - 1; yy += 3.4) { k.G.decals.push({ type: 'flowers', x: X0 + 1.5, y: yy, w: 8, d: 1.6, seed: Math.round(yy * 7), colors: [['#f6c445', '#ff9a5a', '#ffffff'], ['#f07a8a', '#f2a7c3', '#ffffff'], ['#b38cf0', '#7ab8f5', '#ffffff']][Math.round(yy) % 3] }); k.solid(X0 + 1, Math.floor(yy), 9, 2); }
      if (gy0 + 3 < H - 2) {
        add({ type: 'picnicTable', x: X0 + 13, y: gy0 + 1 }, X0 + 13, gy0 + 1, 3, 2);
        for (const [ddx, ddy, face] of [[0.6, -0.35, '+y'], [2.0, -0.35, '+y'], [0.6, 2.25, '-y'], [2.0, 2.25, '-y']]) rest({ x: X0 + 13 + ddx, y: gy0 + 1 + ddy, face, pose: 'sit' }, '가든 피크닉');
        add({ type: 'parasol', x: X0 + 14.5, y: gy0 + 2, color: '#3fb27f' });
        add({ type: 'birdbath', x: X0 + 19, y: gy0 + 4 }, X0 + 19, gy0 + 4);
        k.sign(X0 + 1.4, H - 0.6, '🌻 플라워 가든', '#c47f22');
      }
      // 🐟 연못 정원 (건물 앞)
      const doorX = TX + B.doorX;
      k.G.decals.push({ type: 'deckPath', x: doorX - 1.5, y: Hi - 1, w: 3, d: 2.2 }); k.mark(doorX - 2, Hi - 1, 4, 3, 1);
      const gx = Math.max(9, Math.min(Wi - 10, doorX - 9)), cy = Hi + 7, rx = 6.5, ry = 3.2;
      if (cy + ry + 4 < H) {
        k.pond(gx, cy, rx, ry);
        OUT.bridges = [{ x: Math.floor(gx - 2.5), y: Math.floor(cy), w: 5, d: 1 }];
        add({ type: 'bridge', x: gx - 2.5, y: Math.floor(cy), w: 5 });
        for (let q = 0; q < 5; q++) add({ type: 'koi', x: gx - rx / 2 + (q % 3) * rx / 2, y: cy - 0.5 + (q % 2), seed: q });
        for (const [x, y] of [[gx - rx - 1.2, cy - 1], [gx + rx + 1.2, cy + 1]]) add({ type: 'stoneLantern', x, y }, Math.floor(x), Math.floor(y));
        for (const bx of [gx - rx + 1, gx + rx - 3.4]) { const by = cy + ry + 1.4; add({ type: 'bench', x: bx, y: by, w: 2.4 }, Math.floor(bx), Math.floor(by), 3, 1); for (let q = 0; q < 2; q++) rest({ x: bx + 0.7 + q * 1.1, y: by + 0.25, face: '+y', pose: 'sit', approach: [Math.floor(bx + 0.7 + q * 1.1), Math.floor(by) + 1] }, '연못 정원'); }
        k.sign(Math.max(1, gx - rx), cy + ry + 3.4, '🐟 연못 정원', '#3f8a45');
      }
      add({ type: 'doghouse', x: Wi - 6, y: Hi + 3 }, Wi - 6, Hi + 3, 2, 2);
      add({ type: 'catTree', x: Wi - 2.5, y: Hi + 9 }, Wi - 3, Hi + 9, 1, 1);
      add({ type: 'coop', x: Math.min(Wi - 4, gx + rx + 4), y: H - 4 }, Math.min(Wi - 4, gx + rx + 4), H - 4, 2, 2);
      const r = AIO.rand(77);
      for (let x = 1; x < Wi - 1; x += 3) if (k.free(x, H - 1)) add({ type: 'flowerBush', x: x + 0.5, y: H - 0.6, size: 1, seed: x * 3 }, x, H - 1);
      for (let q = 0; q < 7; q++) { const x = 2 + Math.floor(r() * (Wi - 4)), y = Hi + 2 + Math.floor(r() * Math.max(1, H - Hi - 4)); if (k.free(x, y) && Math.hypot(x - gx, (y - cy) * 1.6) > rx + 2) add({ type: 'roofTree', x: x + 0.5, y: y + 0.5, size: 0.85 + r() * 0.3, seed: x * 13 + y, blossom: r() < 0.5 }, x, y); }
      for (let q = 0; q < 6; q++) { const x = X0 + 2 + Math.floor(r() * 19), y = 20 + Math.floor(r() * (H - 21)); if (k.free(x, y) && Math.hypot(x - X0 - 11, y - fy) > 5.5) add({ type: 'roofTree', x: x + 0.5, y: y + 0.5, size: 0.8 + r() * 0.3, seed: x * 13 + y, blossom: r() < 0.4 }, x, y); }
      for (let x = X0 + 1; x < W - 3; x += 3) if (k.free(x, 18, 3, 1)) add({ type: 'planter', x, y: 18.2, w: 2.2, seed: x }, x, 18, 3, 1);
      S.pets = [
        { kind: 'dog', color: '#d9a066' }, { kind: 'dog', color: '#f4ead8' }, { kind: 'dog', color: '#6b4a35' },
        { kind: 'cat', color: '#8a8f96' }, { kind: 'cat', color: '#f0a050' }, { kind: 'cat', color: '#2b2b2b' },
        { kind: 'duck', color: '#ffffff', near: [gx, cy] }, { kind: 'duck', color: '#3f8a45', near: [gx, cy] },
        { kind: 'hen', chicks: 5 },
      ];
      S.sunset = true;
      S.door = { lv: OUT.idx, x: 1.5, y: H - 1.5, face: '+x' };
    },
  });

  // ---------------------------------------------------------------- 🏙️ AI 캠퍼스 (연구동 자리에 고른 건물이 들어간다)
  C.outdoor({
    id: 'campus', icon: '🏙️', name: 'AI 캠퍼스', desc: '소방서·링 R&D·경찰서·은행·공장동·파크·오리연못·상가길', pair: 'lab',
    custom: (spec, ID) => AIO.campus.build(spec, { main: ID }),
  });

  // ---------------------------------------------------------------- ⬜ 없음 (건물만)
  C.outdoor({
    id: 'none', icon: '⬜', name: '없음 (건물만)', desc: '바깥 없이 건물만 · 원룸 오피스는 원래처럼 한 층 평면', pair: 'office',
    size: (B) => ({ W: B.W + 8, H: B.H + 9 }),
    lot(S, OUT, B, k) {
      const TX = 4, TY = 2;
      OUT.ground.base = { color: '#dcd6cb', tufts: null, edge: '#a69e90', edge2: '#958d80' };
      k.place(B, TX, TY);
      k.plaza(0, 0, k.W, k.H, '#e4ded3');
      k.solid(TX, TY, B.W, B.H);
      for (const [x, y] of [[1, 1], [k.W - 2, 1], [1, k.H - 2], [k.W - 2, k.H - 2]]) k.add({ type: 'plant', x: x + 0.5, y: y + 0.5, size: 1.2, seed: x * 7 + y }, x, y);
      for (let x = 2; x < k.W - 2; x += 4) if (Math.abs(x - (TX + B.doorX)) > 3) k.add({ type: 'planter', x, y: k.H - 1.6, w: 2.2, seed: x }, x, k.H - 2, 3, 1);
      S.door = { lv: OUT.idx, x: TX + B.doorX + 0.5, y: k.H - 1.2, face: '-y' };
    },
  });
})();
