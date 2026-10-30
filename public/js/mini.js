// 꼬마빌딩 맵 두 종: 좁은 땅(22×16)에 층층이 올린 작은 사옥.
//   B7 비밀던전 / B6 비밀연구소·금고 / B5 감옥 / B4 지하숙소 / B3 지하휴게실 / B2 기계실 / B1 구내식당 / 1F 로비(보안실·카페·안내·우편함) /
//   업무층 × n (책상 많은 층은 팀장실, 적은 층은 회의실 + 팀장 단독 책상) · 회의 전용층 2개(업무층 가운데 · 서버실 위) / 서버실·AI 학습실 / 휴게층 / 개인연구실·숙소 / 임원층 /
//   R 루프탑 카페 & 바. 층마다 엘리베이터 2대·계단·남녀 화장실.
//   오래 안 쓴 세션일수록 깊이 내려가고(지하휴게실 → 지하숙소 → 감옥), 귀중한 세션은 금고, 실적 좋은 세션은 숙소를 받는다.
//   street: 골목길에 바로 붙은 도심형 · yard: 울타리 친 마당(텃밭·바비큐·트램펄린·연못·반려동물·가족 피크닉)
// 연구동과 같은 엔진(층 높이 렌더링, 엘리베이터, 외관↔내부 전환)으로 그려진다.
(function () {
  const LY = AIO.layout;
  const I = () => AIO.interiors;
  const FW = 22, FH = 16, FLOOR_PX = 58;
  const COLORS = ['#e5534b', '#4e7cf6', '#3fb27f', '#e9a23b', '#a67be0', '#e2667f', '#1f9fb4'];

  /** 일 많은 순으로 정렬된 팀 중 앞쪽 일부만 팀장실 (나머지 팀장은 팀 테이블 맨 앞자리) */
  const roomCount = (active) => (active ? Math.max(1, Math.round(active * 0.5)) : 0);

  function build(spec, opt) {
    const S = LY.newScene('mini');
    S.rest = []; S.visitorSeats = []; S.doors = []; S.buildings = []; S.npcs = []; S.occ = []; S.spots = []; S.campusDoors = [];
    S.compact = true; S.mini = true;
    S.underRest = []; S.underDorm = []; S.jail = []; S.vault = []; S.dorms = []; S.dungeon = []; S.leadRooms = [];
    const OUT = I().level(S, opt.yard ? '마당' : '골목', { floor: 'grass', outer: 'none', short: '외부', bld: 'out' });
    const pods = [...spec.teams, ...spec.stoppedTeams];
    const K0 = roomCount(spec.teams.length);
    pods.forEach((t, i) => { t.room = i < K0; });
    const lv = building(S, { pods, singles: spec.singles, partners: spec.partners, hot: spec.hot }, opt);
    return opt.yard ? yardLot(S, OUT, lv) : streetLot(S, OUT, lv);
  }

  // ---------------------------------------------------------------- the building, floor by floor
  function building(S, o, opt) {
    const levels = [];
    let n = 1;
    const mk = (name, floor, color, outer = 'premium') => {
      const L = I().level(S, name, { floor, outer, short: name.split(' ')[0], bld: 'tower' });
      L.W = FW; L.H = FH; L.floorColor = color;
      levels.push(L);
      return { L, K: LY.kit(S, L) };
    };
    const npc = (L, role, home, x = {}) => I().npc(S, L, { id: `N:mini:${L.idx}:${role}:${S.npcs.length}`, role, home: { pose: 'stand', ...home }, anim: x.anim || 'idle', hat: x.hat ?? null, accent: x.accent || '#2b3a67', tie: x.tie, walkCarry: x.carry, say: x.say, patrol: x.patrol });
    const rest = (L, s, tag) => S.rest.push({ lv: L.idx, tag, carry: 'mug', ...s });
    const sign = (L, x, y, text, color = '#6b5b4a', room = true) => L.signs.push({ x, y, text, color, room });
    // 사 먹는 곳: 음식을 산 세션이 실제로 가서 주문하는 자리 (food 구내식당 · cafe 카페 · bar 층 커피 바 · store 매점) + 식당 자리
    S.shops = S.shops || []; S.eat = S.eat || [];
    const shop = (L, kind, x, y, tag, face = '-y') => S.shops.push({ kind, lv: L.idx, x, y, face, pose: 'stand', tag });

    /** 공용: 엘리베이터 코어(x7–13) · 남녀 화장실(x13–19) · 계단(x19–22) · 복도(y5–7) */
    function shell(L, K, roomA) {
      L.patches.push({ x: 7, y: 0, w: 6, d: 5, style: 'marble', color: '#efece6' });
      L.elev = [];
      for (const [car, cx] of [[0, 7], [1, 10]]) {
        K.add({ type: 'elevCab', x: cx, y: 0, w: 2, d: 2, car });
        K.add({ type: 'elevDoor', x: cx, y: 0, w: 2, d: 2, car, label: L.short });
        K.blockRect(cx, 0, 2, 2);
        L.elev.push({ car, hall: { x: cx + 1, y: 2.75 }, cabin: { x: cx + 1, y: 1.0 } });
      }
      K.add({ type: 'v4_elevPillar', x: 9, y: 0, w: 1, d: 2 }); K.add({ type: 'elevPanel', x: 9.5, y: 2.32, label: L.short }); K.blockRect(9, 0, 1, 2);   // 안내판을 엘리베이터 앞면에
      K.add({ type: 'plant', x: 12.5, y: 0.6, size: 0.7, seed: L.idx }); K.block(12, 0);
      K.wallY(0, 5, 7, { h: 46, color: '#ece7df' }); K.wallY(0, 5, 13, { h: 46, color: '#ece7df' });
      for (const [rx, kind] of [[13, 'm'], [16, 'f']]) {
        L.patches.push({ x: rx, y: 0, w: 3, d: 5, style: 'tile', color: kind === 'm' ? '#e4edf5' : '#f8e9ee' });
        I().restroomPieces(K, rx, kind);
        K.wallX(rx, rx + 3, 5, { h: 44, doors: [rx + 1], color: kind === 'm' ? '#dfe8f0' : '#f3e1e7' });
        sign(L, rx + 0.2, 4.7, kind === 'm' ? '🚹 남' : '🚺 여', kind === 'm' ? '#4e7cf6' : '#e2667f');
      }
      K.wallY(0, 5, 16, { h: 44, color: '#ece7df' }); K.wallY(0, 5, 19, { h: 44, color: '#ece7df' });
      L.patches.push({ x: 19, y: 0, w: 3, d: 5, style: 'tile', color: '#d9d3c9' });
      K.add({ type: 'stairs', x: 19.2, y: 0.2, w: 2.6, d: 3.8 }); K.blockRect(19, 0, 3, 4);
      K.wallX(19, 22, 5, { glass: true, h: 60, doors: [20], color: '#d9dde1' });   // 유리벽: 계단이 가려지지 않게
      sign(L, 19.2, 4.7, '🪜 계단', '#7a5540');
      L.patches.push({ x: 0, y: 5, w: FW, d: 2, style: 'tile', color: '#ddd6ca' });
      if (roomA) { K.wallX(0, 7, 5, { glass: !!roomA.glass, h: roomA.glass ? 60 : 46, doors: [6], color: '#e7e1d8' }); sign(L, 0.3, 4.7, roomA.name, roomA.color); }
      L.windows = [8.4, 12]; L.northWindows = [3.5];
      L.wallY = { clock: 9.05, clockZ: 100 };            // 엘리베이터 두 대 사이, 호출 버튼 위
      K.add({ type: 'exitSign', x: 19.4, y: 0 });
      if (!/로비/.test(L.name)) K.add({ type: 'v4_floorSign', x: 8, y: 7, w: 6, text: L.name, lvKey: L.name });   // 층 이름 간판 (로비는 브랜드 간판이 있어 생략)
    }


    // ================================================================ 지하 (깊은 곳부터)
    const under = (name, color) => { const r = mk(name, 'concrete', color, 'office'); return r; };
    // ---- B7 비밀던전: 아주 오래(3일+) 잠든 세션이 쇠사슬 벤치에서 잠든다 · 횃불 · 보물상자 · 돌기둥 · 슬라임 우리
    {
      const { L, K } = under('B7 비밀던전', '#5d5852'); L.desc = '비밀던전 · 3일 넘게 잠든 세션 · 보물 · 슬라임';
      L.floor = 'v4_stone';
      shell(L, K, { name: '🗝️ 던전 관리실', color: '#8a6a3a' });
      L.patches.push({ x: 0, y: 0, w: 7, d: 5, style: 'v4_stone', color: '#6b655e' });
      K.add({ type: 'lockers', x: 0.3, y: 0.3, w: 2.4 }); K.blockRect(0, 0, 3, 1);
      K.add({ type: 'v4_chest', x: 4.2, y: 0.4 }); K.blockRect(4, 0, 2, 1);
      npc(L, '던전 지기', { x: 3.4, y: 3, face: '+y' }, { hat: 'hardhat', accent: '#8a6a3a', say: '🗝️ 깨우지 마세요' });
      L.patches.push({ x: 0, y: 7, w: FW, d: FH - 7, style: 'v4_stone', color: '#4f4b46' });
      K.wallX(0, FW, 7, { bars: true, doors: [11], color: '#3b3f45' });
      for (const [x, y] of [[3, 10], [8, 12], [14, 10], [19, 12]]) { K.add({ type: 'v4_stonePillar', x, y }); K.block(x, y); }
      for (const [x, y] of [[0.6, 8], [21.4, 8], [0.6, 15.2], [21.4, 15.2], [10.5, 8]]) { K.add({ type: 'v4_torch', x, y }); K.block(Math.floor(x), Math.floor(y)); L.lamps.push({ x, y }); }
      K.add({ type: 'v4_cage', x: 16, y: 13.2 }); K.blockRect(16, 13, 2, 3);
      for (const [x, y] of [[5.4, 14.6], [12.4, 8.2], [20, 10.2]]) { K.add({ type: 'v4_chest', x, y }); K.blockRect(Math.floor(x), Math.floor(y), 2, 1); }
      for (const [x, y] of [[6, 9.5], [13, 15], [2, 12.5]]) K.add({ type: 'v4_bones', x, y });
      for (const [bx, by] of [[1, 9], [6.5, 10.6], [10.6, 13.2], [1, 13.6]]) {
        K.add({ type: 'v4_chainBench', x: bx, y: by, w: 2.4 }); K.blockRect(Math.floor(bx), Math.floor(by), 3, 1);
        for (let q = 0; q < 2; q++) S.dungeon.push({ lv: L.idx, x: bx + 0.7 + q * 1.1, y: by + 0.45, face: '+y', pose: 'sofa', approach: [Math.floor(bx + 0.7 + q * 1.1), Math.floor(by) + 1], tag: '비밀던전' });
      }
      sign(L, 0.3, 15.7, '🐉 비밀던전 · 아주 오래 잠든 세션', '#c47f22', false);
    }
    // ---- B6 비밀연구소 · 금고
    {
      const { L, K } = under('B6 비밀연구소', '#2f3a44'); L.desc = '비밀연구소 + 금고 · 귀중한 세션 보관';
      shell(L, K, { name: '🔐 금고', color: '#b8955f' });
      L.patches.push({ x: 0, y: 0, w: 7, d: 5, style: 'concrete', color: '#b5b9bd' });
      K.add({ type: 'depositBoxes', x: 0.3, y: 0.2, w: 6.4 }); K.blockRect(0, 0, 7, 1);
      K.add({ type: 'goldStack', x: 5.2, y: 2.4 }); K.blockRect(5, 2, 2, 2);
      for (const [x, y] of [[1, 2.1], [2.6, 2.1], [1, 3.8], [2.6, 3.8], [4, 3.8]]) S.vault.push({ lv: L.idx, x, y, face: '+y', pose: 'sit', tag: '금고' });
      K.add({ type: 'vaultDoor', x: 4.6, y: 5 });
      L.patches.push({ x: 0, y: 7, w: FW, d: 9, style: 'raised', color: '#3b4652' });
      L.decals.push({ type: 'floor', x: 0.5, y: 7.5, w: FW - 1, d: 8, color: 'rgba(78,240,138,0.07)' });
      [[1, '#4ef08a'], [3, '#5fd0ff'], [5, '#f2a7c3'], [7, '#f2c230']].forEach(([x, c]) => { K.add({ type: 'specimenTank', x: x + 0.5, y: 8.4, color: c }); K.block(x, 8); });
      K.add({ type: 'labBench', x: 9.4, y: 8, w: 5 }); K.blockRect(9, 8, 6, 1);
      for (let k = 0; k < 4; k++) K.add({ type: 'gpuRack', x: 16 + k * 1.05, y: 7.6, seed: k * 11 });
      K.blockRect(16, 7, 5, 1);
      K.add({ type: 'robotArm', x: 19.5, y: 12.5 }); K.blockRect(18, 11, 3, 3);
      K.add({ type: 'cleanroomTool', x: 1, y: 12, seed: 3 }); K.blockRect(1, 12, 2, 2);
      K.add({ type: 'cleanroomTool', x: 4.5, y: 12, seed: 5 }); K.blockRect(4, 12, 2, 2);
      K.add({ type: 'blackboard', x: 9.6, y: 7, w: 4.6, lines: ['극비 · TOP SECRET', 'AGI v0.9 …', '절대 외부 반출 금지'] });
      npc(L, '비밀 연구원', { x: 11.5, y: 9.6, face: '-y' }, { anim: 'type', hat: 'shades', accent: '#4ef08a', patrol: [{ x: 11.5, y: 9.6, face: '-y' }, { x: 3, y: 10.4, face: '-y' }, { x: 17, y: 9.2, face: '-y' }] });
      npc(L, '박사', { x: 14, y: 13.5, face: '-x' }, { anim: 'think', hat: 'beret', accent: '#a67be0' });
      sign(L, 0.3, 15.7, '🧬 비밀연구소 (관계자 외 출입금지)', '#4ef08a');
    }
    // ---- B5 감옥
    {
      const { L, K } = under('B5 감옥', '#b9bcbf'); L.desc = '감방 4칸 · 하루 넘게 안 쓴 세션';
      shell(L, K, { name: '👮 간수실', color: '#2b3a67' });
      L.patches.push({ x: 0, y: 0, w: 7, d: 5, style: 'tile', color: '#c9d2dc' });
      K.add({ type: 'cctvWall', x: 0.4, y: 0.25, w: 5 }); K.blockRect(0, 0, 6, 1);
      const g = K.deskSeat(1, -0.6, 0, 'B', null);
      npc(L, '간수', { x: g.x, y: g.y, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'police' });
      L.patches.push({ x: 0, y: 9, w: FW, d: 7, style: 'concrete', color: '#a9adb1' });
      K.wallX(0, FW, 9, { bars: true, doors: [2, 7, 12, 18] });
      for (const x of [5, 10, 15]) K.wallY(9, FH, x, { h: 60, color: '#9aa1a7' });
      [[0, 5], [5, 10], [10, 15], [15, 22]].forEach(([cx, cx1], i) => {
        K.add({ type: 'bunk', x: cx + 0.4, y: 14.8 }); K.blockRect(cx, 14, 3, 2);
        K.add({ type: 'cellToilet', x: cx1 - 0.6, y: 10 }); K.block(cx1 - 1, 9);
        for (const [x, y, face, pose, ap] of [[cx + 1, 15.2, '-y', 'sit', [cx + 1, 13]], [cx + 2.1, 15.2, '-y', 'sit', [cx + 2, 13]], [cx + 1.6, 11.4, '+y', 'stand'], [cx1 - 1.6, 12.4, '-x', 'stand']]) S.jail.push({ lv: L.idx, x, y, face, pose, approach: ap, tag: `감옥 ${i + 1}호` });
        sign(L, cx + 0.3, 15.7, `⛓️ ${i + 1}호`, '#2b3a67');
      });
      npc(L, '간수', { x: 3, y: 8, face: '+y' }, { hat: 'police', patrol: [{ x: 3, y: 8, face: '+y' }, { x: 20, y: 8, face: '+y' }] });
      sign(L, 0.3, 8.6, '⛓️ 지하 감옥 · 오래 방치된 세션', '#2b3a67', false);
    }
    // ---- B4 지하숙소: 벽에 머리를 둔 1인 침대 포드(칸막이 · 협탁 · 무드등) 앞뒤 두 줄 + 가운데 러그 라운지
    {
      const { L, K } = under('B4 지하숙소', '#d9cdb8'); L.desc = '침대 포드 14칸 · 라운지 · 6~24시간 쉰 세션';
      shell(L, K, { name: '🧺 세탁실', color: '#4e7cf6' });
      L.patches.push({ x: 0, y: 0, w: 7, d: 5, style: 'tile', color: '#e4edf5' });
      for (let k = 0; k < 4; k++) { K.add({ type: 'washer', x: 0.3 + k * 1.2, y: 0.3, k }); K.block(k, 0); }
      L.patches.push({ x: 0, y: 7, w: FW, d: 9, style: 'wood', color: '#d9c19c' });
      const BED = ['#8fb3d9', '#e8a0a8', '#a7c98f', '#f0c987', '#b6a3dc', '#f2b38a', '#8fd1c8'];
      for (let i = 0; i < 7; i++) {
        const bx = 1 + i * 3;
        // 뒷줄: 머리판이 뒷벽 쪽 · 앞줄: 머리판이 앞벽 쪽 (침대 끝이 가운데 라운지를 본다)
        for (const back of [true, false]) {
          const by = back ? 7.1 : 13.9;
          L.patches.push({ x: bx - 1, y: back ? 7 : 14, w: 3, d: 2, style: 'carpet', color: i % 2 ? '#c9b49a' : '#cdb79c' });
          K.add({ type: 'bed', x: bx, y: by, color: BED[(i + (back ? 0 : 3)) % BED.length], flip: !back });
          K.blockRect(bx, back ? 7 : 14, 1, 2);
          K.add({ type: 'cabinet', x: bx + 1.15, y: back ? 7.15 : 15.2, w: 0.7 }); K.block(bx + 1, back ? 7 : 15);
          L.lamps.push({ x: bx + 1.5, y: back ? 7.4 : 15.4 });
          if (i < 6) K.wallY(back ? 7 : 14, back ? 9 : 16, bx + 2, { h: 34, color: '#cbb89e' });
          S.underDorm.push({ lv: L.idx, x: bx + 0.5, y: back ? by + 0.9 : by + 1.1, face: back ? '+y' : '-y', pose: 'sofa', approach: [bx, back ? 9 : 13], tag: '지하숙소' });
        }
      }
      // 가운데 라운지 (y 10~12): 러그 · 소파 · 테이블 · 책장 · 빈백 · 수족관 · 간식 코너 · 화분
      L.decals.push({ type: 'floor', x: 2.6, y: 9.8, w: 15.6, d: 3, color: '#b98a6a' }, { type: 'floor', x: 2.85, y: 10.05, w: 15.1, d: 2.5, color: '#e3c49b' });
      K.add({ type: 'plant', x: 1.5, y: 10.6, size: 1.1, seed: 31 }); K.block(1, 10);
      K.add({ type: 'sofa', x: 3.2, y: 10.05, w: 3 }); K.blockRect(3, 10, 3, 1);
      [0.6, 1.5, 2.4].forEach((d) => S.underDorm.push({ lv: L.idx, x: 3.2 + d, y: 10.67, face: '+y', pose: 'sofa', approach: [Math.floor(3.2 + d), 11], tag: '지하숙소 라운지', carry: 'mug' }));
      K.add({ type: 'roundTable', x: 4.7, y: 11.9, r: 0.45, color: '#a8784f' }); K.block(4, 11);
      K.add({ type: 'bookshelf', x: 7.3, y: 10.05, w: 2.4, seed: 77 }); K.blockRect(7, 10, 3, 1);
      for (const [bx, c] of [[8, '#e2667f'], [9.4, '#4e9cf6']]) { K.add({ type: 'beanbag', x: bx, y: 11.7, color: c }); S.underDorm.push({ lv: L.idx, x: bx, y: 11.7, face: '-y', pose: 'sofa', tag: '지하숙소 라운지' }); }
      K.add({ type: 'armchair', x: 11.6, y: 11.4, color: '#c9a77d' }); K.block(11, 11);
      K.add({ type: 'aquarium', x: 12.6, y: 10.05, w: 2.2 }); K.blockRect(12, 10, 3, 1);
      K.add({ type: 'armchair', x: 15.4, y: 11.4, color: '#9fb7a0' }); K.block(15, 11);
      K.add({ type: 'fridge', x: 16.1, y: 10.05 }); K.block(16, 10);
      K.add({ type: 'vending', x: 17.2, y: 10.05, color: '#e26a5a' }); K.block(17, 10);
      K.add({ type: 'plant', x: 19.5, y: 11.6, size: 1.2, seed: 13 }); K.block(19, 11);
      K.add({ type: 'plant', x: 20.6, y: 10.4, size: 0.9, seed: 19 }); K.block(20, 10);
      K.add({ type: 'lamp', x: 21.4, y: 12.6 }); K.block(21, 12); L.lamps.push({ x: 21.4, y: 12.6 });
      sign(L, 0.3, 12.9, '🛏️ 지하숙소 · 한동안 안 쓴 세션', '#6b5b4a');
    }
    // ---- B3 지하휴게실
    {
      const { L, K } = under('B3 지하휴게실', '#d8d2c6'); L.desc = '지하휴게실 · 매점 · 6시간 안쪽으로 쉰 세션';
      shell(L, K, { name: '🏪 지하매점', color: '#2f9e5f' });
      L.patches.push({ x: 0, y: 0, w: 7, d: 5, style: 'tile', color: '#efe9df' });
      K.add({ type: 'storeShelf', x: 0.4, y: 0.3, w: 4, seed: 3 }); K.blockRect(0, 0, 5, 1);
      K.add({ type: 'till', x: 3.4, y: 2.4, w: 2.6, label: '지하매점' }); K.blockRect(3, 2, 3, 1);
      npc(L, '매점 직원', { x: 4.6, y: 1.8, face: '+y' }, { hat: 'cap', accent: '#2f9e5f' });
      shop(L, 'store', 4.2, 3.6, '지하매점'); shop(L, 'store', 5.3, 3.6, '지하매점');
      L.patches.push({ x: 0, y: 7, w: FW, d: 9, style: 'wood', color: '#c9b38f' });
      K.add({ type: 'bigScreen', x: 5.5, y: 7.1, w: 5 }); K.blockRect(5, 7, 6, 1);
      for (const [gx, gy] of [[1, 9.6], [6.4, 11.6]]) { K.add({ type: 'sofa', x: gx, y: gy, w: 3.2 }); K.blockRect(gx, Math.floor(gy), 4, 1); [0.6, 1.6, 2.6].forEach((d) => S.underRest.push({ lv: L.idx, x: gx + d, y: gy + 0.62, face: '+y', pose: 'sofa', approach: [Math.floor(gx + d), Math.floor(gy) + 1], tag: '지하휴게실', carry: 'mug' })); }
      K.add({ type: 'pingPong', x: 12.5, y: 10 }); K.blockRect(12, 10, 4, 2);
      S.underRest.push({ lv: L.idx, x: 12, y: 10.7, face: '+x', pose: 'stand', tag: '지하휴게실 탁구' }, { lv: L.idx, x: 15.6, y: 10.7, face: '-x', pose: 'stand', tag: '지하휴게실 탁구' });
      K.add({ type: 'arcade', x: 17.6, y: 7.25 }); K.add({ type: 'arcade', x: 18.7, y: 7.25, hue: 30 }); K.blockRect(17, 7, 3, 1);
      K.add({ type: 'vending', x: 20.3, y: 7.25, color: '#e5534b' }); K.block(20, 7);
      S.underRest.push({ lv: L.idx, x: 18.1, y: 8.6, face: '-y', pose: 'stand', tag: '지하휴게실 오락기' });
      for (const [bx, c] of [[3, '#e2667f'], [18, '#4e9cf6'], [20, '#f6c445']]) { K.add({ type: 'beanbag', x: bx, y: 14.6, color: c }); S.underRest.push({ lv: L.idx, x: bx, y: 14.6, face: '-y', pose: 'sofa', tag: '지하휴게실' }); }
      sign(L, 0.3, 15.7, '🛋️ 지하휴게실 · 잠깐 쉬는 중단 세션', '#7a5540');
    }
    // ---- B2 기계실
    {
      const { L, K } = under('B2 기계실', '#c4c2bc'); L.desc = '기계실 · 전기실 · 발전기 · 저수조';
      shell(L, K, { name: '⚡ 전기실', color: '#c47f22' });
      L.patches.push({ x: 0, y: 0, w: 7, d: 5, style: 'concrete', color: '#bfbcb6' });
      K.add({ type: 'electricPanel', x: 0.3, y: 0, w: 6.4 }); K.blockRect(0, 0, 7, 1);
      K.add({ type: 'upsCabinet', x: 0.5, y: 2.4 }); K.add({ type: 'upsCabinet', x: 3.2, y: 2.4 }); K.blockRect(0, 2, 6, 1);
      L.decals.push({ type: 'hazard', x: 0.4, y: 7.4, w: 21.2, d: 8.2 });
      K.add({ type: 'generator', x: 0.8, y: 8 }); K.blockRect(0, 8, 4, 2);
      K.add({ type: 'waterTank', x: 7, y: 10.6 }); K.blockRect(6, 9, 2, 3);
      K.add({ type: 'waterTank', x: 9.6, y: 10.6 }); K.blockRect(8, 9, 3, 3);
      K.add({ type: 'chiller', x: 13, y: 8 }); K.add({ type: 'chiller', x: 16.6, y: 8 }); K.blockRect(13, 8, 7, 2);
      K.add({ type: 'pipes', x: 0.6, y: 14.6, w: 20 }); K.blockRect(0, 14, 21, 1);
      K.add({ type: 'airCon', x: 21, y: 11 }); K.block(21, 11);
      npc(L, '시설관리 기사', { x: 5, y: 12.6, face: '-y' }, { hat: 'hardhat', accent: '#f2c230', carry: 'paper', patrol: [{ x: 5, y: 12.6, face: '-y' }, { x: 15, y: 11.2, face: '-y' }, { x: 2, y: 11.5, face: '-y' }] });
      sign(L, 0.3, 13.6, '⚙️ 기계실 · 발전기 · 저수조 · 냉동기', '#c47f22', false);
    }
    // ---- B1 구내식당: 배식대(오늘의 메뉴) · 긴 식탁 4줄(40석) · 음료 냉장고 · 식판 반납 — 밥을 산 세션은 여기 내려와 받아서 먹고 올라간다
    {
      const { L, K } = mk('B1 구내식당', 'tile', '#f3ecdc', 'office'); L.desc = '구내식당 · 배식대 · 식탁 40석 · 조리실 · 음료';
      shell(L, K, { name: '🍳 조리실', color: '#c47f22' });
      L.patches.push({ x: 0, y: 0, w: 7, d: 5, style: 'tile', color: '#e6ebef' });
      K.add({ type: 'kitchenLine', x: 0.4, y: 0.3, w: 5, kind: 'pot' }); K.blockRect(0, 0, 6, 1);
      K.add({ type: 'fridge', x: 5.9, y: 0.25 }); K.block(5, 0); K.block(6, 0);
      npc(L, '조리장', { x: 2.4, y: 1.5, face: '-y' }, { anim: 'type', hat: 'cap', accent: '#ffffff', say: '🍲 오늘 국 맛있어요' });
      npc(L, '조리사', { x: 4.6, y: 1.5, face: '-y' }, { anim: 'type', hat: 'cap', accent: '#ffffff' });
      // 식당 홀
      L.patches.push({ x: 0, y: 7, w: FW, d: 9, style: 'wood', color: '#e6d3b3' }, { x: 0, y: 9, w: 9, d: 1, style: 'tile', color: '#ddd5c8' });
      K.wallX(0, FW, 7, { h: 46, doors: [9, 10, 17], color: '#efe6d6' });
      K.add({ type: 'ia_board', x: 1, y: 7, w: 6.4, kind: 'chalk', lines: ['🍱 오늘의 메뉴', '🍚 잡곡밥 · 🍲 된장국 · 🍗 닭갈비', '🥬 김치 · 🍮 푸딩 · 🍜 라면 코너'], z: 24, h: 22 });
      K.add({ type: 'ia_mealCounter', x: 0.8, y: 8.1, w: 7.6 }); K.blockRect(0, 7, 9, 2);
      npc(L, '배식 담당', { x: 2.6, y: 7.6, face: '+y' }, { anim: 'type', hat: 'cap', accent: '#ffffff' });
      npc(L, '배식 담당', { x: 6.2, y: 7.6, face: '+y' }, { anim: 'type', hat: 'bucket', accent: '#f2c230' });
      for (const x of [1.8, 3.4, 5, 6.6]) shop(L, 'food', x, 9.5, '구내식당 배식대');
      K.add({ type: 'fridgeCase', x: 12.2, y: 7.1, w: 3 }); K.blockRect(12, 7, 3, 1);
      K.add({ type: 'vending', x: 15.5, y: 7.25, color: '#3f8ae0' }); K.block(15, 7);
      K.add({ type: 'waterCooler', x: 16.6, y: 7.3 }); K.block(16, 7);
      K.add({ type: 'cabinet', x: 19, y: 7.3, w: 2.6 }); K.blockRect(19, 7, 3, 1);
      sign(L, 18.8, 8.7, '🍽️ 식판 반납', '#7a5540', false);
      const SEAT = ['#f2c230', '#4e9cf6', '#e2667f', '#3fb27f'];
      [[1, [1.5, 3, 4.5, 6, 7.5]], [12, [12.5, 14, 15.5, 17, 18.5]]].forEach(([tx, xs], side) => {
        for (const ty of [11, 14]) {
          for (let i = 0; i < 8; i++) K.add({ type: 'tableSeg', x: tx + i, y: ty, w: 1, d: 0.9 });
          K.blockRect(tx, ty, 8, 1);
          for (const [dy, face] of [[-0.6, '+y'], [1.4, '-y']]) for (const x of xs) {
            K.add({ type: 'stool', x, y: ty + dy, color: SEAT[(side * 2 + (dy > 0 ? 1 : 0)) % 4] });
            S.eat.push({ lv: L.idx, x, y: ty + dy, face, pose: 'sit', tag: '구내식당', carry: 'tray' });
          }
        }
      });
      K.add({ type: 'plant', x: 21.3, y: 15.3, size: 1.1, seed: 21 }); K.block(21, 15);
      K.add({ type: 'plant', x: 21.3, y: 11.6, size: 0.9, seed: 23 }); K.block(21, 11);
      npc(L, '홀 정리', { x: 10.5, y: 12.5, face: '+y' }, { hat: 'bucket', accent: '#3f8a45', carry: 'tray', patrol: [{ x: 10.5, y: 12.5, face: '+y' }, { x: 10.5, y: 9.6, face: '+x' }, { x: 20.5, y: 9.6, face: '-x' }] });
      sign(L, 0.3, 15.7, '🍽️ 구내식당 · 밥 사 먹는 곳', '#c47f22');
    }
    const NB = levels.length;

    // ---- 1F 로비
    {
      const { L, K } = mk('1F 로비', 'marble', '#f1eee8'); L.desc = '로비 · 카페 · 안내데스크 · 보안실';
      shell(L, K, { name: '🛡️ 보안실', color: '#2b3a67' });
      L.patches.push({ x: 0, y: 0, w: 7, d: 5, style: 'tile', color: '#d8dde2' });
      K.add({ type: 'cctvWall', x: 0.4, y: 0.25, w: 5 }); K.blockRect(0, 0, 6, 1);
      const g = K.deskSeat(1, -0.6, 0, 'B', null);
      npc(L, '보안요원', { x: g.x, y: g.y, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'police' });
      // 카페 코너 (왼쪽)
      L.patches.push({ x: 0, y: 7, w: 7, d: 9, style: 'wood', color: '#e2cfae' });
      K.add({ type: 'cafeCounter', x: 0.6, y: 8, w: 5.4 }); K.blockRect(0, 8, 6, 1);
      npc(L, '바리스타', { x: 2.8, y: 7.45, face: '+y' }, { anim: 'type', hat: 'beret', accent: '#7a4a2a' });
      for (const [tx, ty] of [[2, 11.5], [5, 13.6], [2, 14.6]]) {
        K.add({ type: 'roundTable', x: tx, y: ty, r: 0.45, color: '#ffffff' }); K.block(Math.floor(tx), Math.floor(ty));
        for (const [dx, face] of [[-0.95, '+x'], [0.95, '-x']]) { K.add({ type: 'stool', x: tx + dx, y: ty, color: '#c49a62' }); rest(L, { x: tx + dx, y: ty, face, pose: 'sit' }, '1F 카페'); }
      }
      sign(L, 0.4, 15.6, '☕ 1F 카페', '#7a4a2a');
      for (const x of [1.8, 3.4, 5]) shop(L, 'cafe', x, 9.4, '1F 카페');
      // 출입구 · 게이트 · 안내데스크 · 브랜드월 · 우편함 · 대기석
      K.add({ type: 'entrance', x: 9.5, y: FH - 0.08, w: 3, bld: 'tower' });
      L.decals.push({ type: 'floor', x: 9.3, y: FH - 1.5, w: 3.4, d: 1.4, color: '#8a7d6b' });
      K.add({ type: 'turnstile', x: 8.6, y: 12.3 }); K.block(8, 12);
      K.add({ type: 'turnstile', x: 10.9, y: 12.3 });
      K.add({ type: 'turnstile', x: 13.1, y: 12.3 }); K.block(13, 12);
      K.add({ type: 'brandWall', x: 14.3, y: 7.3, w: 6.4 }); K.blockRect(14, 7, 7, 1);
      K.add({ type: 'reception', x: 14.6, y: 9.6, w: 5 }); K.blockRect(14, 9, 6, 1);
      npc(L, '안내원', { x: 17, y: 8.9, face: '+y' }, { hat: 'bow', accent: '#d97757' });
      K.add({ type: 'mailboxes', x: 19.2, y: 12.2, w: 2.6 }); K.blockRect(19, 12, 3, 1);
      K.add({ type: 'sofa', x: 14.6, y: 13.8, w: 3 }); K.blockRect(14, 13, 4, 1);
      S.visitorSeats = [0.6, 1.6, 2.4].map((d) => ({ lv: L.idx, x: 14.6 + d, y: 14.42, face: '+y', pose: 'sofa', approach: [Math.floor(14.6 + d), 15] }));
      K.add({ type: 'umbrellaStand', x: 8.2, y: 15.3 }); K.block(8, 15);
      K.add({ type: 'plant', x: 21.3, y: 15.3, size: 1.1, seed: 4 }); K.block(21, 15);
      K.add({ type: 'extinguisher', x: 7.4, y: 7.4 }); K.block(7, 7);
      npc(L, '보안요원', { x: 12.5, y: 14.8, face: '+y' }, { hat: 'police', patrol: [{ x: 12.5, y: 14.8, face: '+y' }, { x: 3, y: 6, face: '+x' }, { x: 18, y: 6, face: '-x' }] });
      sign(L, 9.3, FH - 0.3, '🚪 출입구', '#2b2622');
    }

    // ---- 회의실 (방 하나): 뒷벽 TV · 긴 테이블 · 양쪽 의자 — 의자마다 회의 자리 (room 으로 묶여 같은 팀이 한 방에 모인다)
    const meet = (L, x, y, face, room, pri) => S.meeting.push({ lv: L.idx, x, y, face, pose: 'sit', room: `${L.idx}:${room}`, pri });
    const roomA = (L, K, room, pri) => {       // 뒤쪽 왼편(0~7 × 0~5) 회의실
      L.patches.push({ x: 0, y: 0, w: 7, d: 5, style: 'carpet', color: '#c9d2dc' });
      K.add({ type: 'tv', x: 1.8, y: 0.3, w: 3.2 }); K.blockRect(1, 0, 5, 1);
      for (let i = 0; i < 4; i++) K.add({ type: 'tableSeg', x: 1.5 + i, y: 2, w: 1, d: 1.1 });
      K.blockRect(1, 2, 5, 2);
      for (let i = 0; i < 3; i++) for (const [y, face] of [[1.4, '+y'], [3.65, '-y']]) { const x = 2.1 + i * 1.2; K.add({ type: 'chair', x, y, face, part: 'seat', premium: true }); K.add({ type: 'chair', x, y, face, part: 'back', premium: true }); meet(L, x, y, face, room, pri); }
    };
    const meetRoom = (L, K, rx, rw, room, color, pri) => {   // 앞쪽(y 7~16) 회의실 한 칸, 문은 rx+1
      L.patches.push({ x: rx, y: 7, w: rw, d: FH - 7, style: 'carpet', color });
      K.add({ type: 'tv', x: rx + 2.4, y: 7.3, w: rw - 3.4 }); K.blockRect(rx + 2, 7, rw - 2, 1);
      for (let i = 0; i < rw - 3; i++) K.add({ type: 'tableSeg', x: rx + 1.5 + i, y: 10.6, w: 1, d: 1.1 });
      K.blockRect(rx + 1, 10, rw - 2, 2);
      for (let i = 0; i < rw - 4; i++) for (const [y, face] of [[10, '+y'], [12.25, '-y']]) { const x = rx + 2.1 + i * 1.2; K.add({ type: 'chair', x, y, face, part: 'seat', premium: true }); K.add({ type: 'chair', x, y, face, part: 'back', premium: true }); meet(L, x, y, face, room, pri); }
      K.add({ type: 'whiteboard', x: rx + 0.4, y: 14.6, w: 1.8, color: '#4e7cf6' }); K.blockRect(rx, 14, 2, 1);
      K.add({ type: 'plant', x: rx + rw - 0.6, y: 15.3, size: 0.9, seed: rx + L.idx }); K.block(rx + rw - 1, 15);
      sign(L, rx + 0.3, 15.7, `🗣️ 회의실 ${room}`, '#4e7cf6');
    };

    /** 🗣️ 회의 전용층: 방 4칸 전부 회의실 — 회의하는 세션·팀이 한 방에 모인다 */
    const meetingFloor = () => {
      n++;
      const { L, K } = mk(`${n}F 회의층`, 'carpet', '#dfe3e8');
      L.desc = '회의실 4칸 (6~8인) · 회의하는 세션과 팀이 모이는 층';
      shell(L, K, { name: '🗣️ 회의실 A', color: '#4e7cf6', glass: true });
      roomA(L, K, 'A', 0);
      K.wallX(0, FW, 7, { glass: true, h: 60, doors: [1, 8, 15], color: '#d9dde1' });
      K.wallY(7, FH, 7, { glass: true, h: 60, color: '#d9dde1' }); K.wallY(7, FH, 14, { glass: true, h: 60, color: '#d9dde1' });
      meetRoom(L, K, 0, 7, 'B', '#d6dde6', 0); meetRoom(L, K, 7, 7, 'C', '#e3dccf', 0); meetRoom(L, K, 14, 8, 'D', '#d9e4d6', 0);
      K.add({ type: 'waterCooler', x: 21.3, y: 5.3 });
    };

    // ---- 업무층 (v6)
    //   · 팀장실(앞쪽 방)은 그 층 팀장들이 **돌려쓴다**: 가장 최근에 일한 팀장이 잡고, 한동안 일이 없으면 다음 팀장에게 (world.js leadRooms)
    //   · 방을 못 잡은 팀장은 팀 테이블 앞 단독 책상 — 팀원들을 바라보는 방향(-y)
    //   · 팀 테이블엔 빈 책상을 2개 이상 두고, 남는 폭은 서재 · 집중부스 · 커피바 · 공용 데스크로 채워 층이 비어 보이지 않게
    const ROW = FW - 2;
    S.leadRooms = S.leadRooms || [];
    const teamDesks = (t) => Math.max(4, Math.ceil((t.members.length + 2) / 4) * 4);     // 팀원 + 빈 책상 2+
    const teamW = (t) => teamDesks(t) + 2;
    /** 팀 테이블 + 그 앞 팀장 책상 (팀원 쪽을 본다) */
    const teamUnit = (t) => ({ w: teamW(t), label: `🧶 ${t.title}`, team: t, make: (L, K) => {
      const keys = t.members.map((m) => `M:${t.lead}:${m}`);
      while (keys.length < teamDesks(t)) keys.push(null);
      const c = K.cluster(keys, 'team', null, { noRug: true });
      return { w: c.w, d: c.d, place(ox, oy) {
        L.rugs.push({ x: ox + 0.4, y: oy + 0.4, w: c.w - 0.8, d: 7.2, color: AIO.iso.rgba(t.color, 0.14), border: AIO.iso.rgba(t.color, 0.5) });
        c.place(ox, oy);
        // 팀장 책상: 테이블 남쪽 가운데, 의자는 책상 남쪽에서 북쪽(팀원)을 향한다
        const cx = ox + Math.floor(c.w / 2);
        K.add({ type: 'desk', x: cx - 1, y: oy + 6, w: 2, d: 1, face: '-y', seed: cx * 7 + L.idx, lead: true, premium: true, seatKey: t.lead }); K.blockRect(cx - 1, oy + 6, 2, 1);
        const seat = { key: t.lead, lv: L.idx, x: cx, y: oy + 7.55, face: '-y', pose: 'sit', lead: true, desk: true, approach: [cx, oy + 8] };
        K.add({ type: 'chair', x: seat.x, y: seat.y, face: '-y', part: 'seat', premium: true }); K.add({ type: 'chair', x: seat.x, y: seat.y, face: '-y', part: 'back', premium: true });
        S.seats.set(t.lead, seat);
        S.reportSpots.set(t.lead, [{ lv: L.idx, x: cx - 1.5, y: oy + 6.6, face: '+x' }, { lv: L.idx, x: cx + 1.5, y: oy + 6.6, face: '-x' }]);
        L.signs.push({ x: ox + 0.5, y: oy + 5.6, text: `🧶 ${t.title} 팀`, color: t.color, team: true, key: t.lead });
        L.reserved = (L.reserved || []).concat([[cx - 2, cx + 2]]);
      } };
    } });
    /** 빈 폭 채우기 (깊이 6 이하) */
    const FILLERS = [
      { w: 6, label: '💼 공용 데스크', make: (L, K) => K.cluster([null, null, null, null], 'single', '💼 공용 데스크', { noDecor: true }) },
      { w: 5, label: '📚 서재 코너', make: (L, K) => ({ w: 5, d: 6, place(ox, oy) {
        K.add({ type: 'bookshelf', x: ox + 0.3, y: oy + 0.3, w: 2.2, seed: ox * 5 + L.idx }); K.add({ type: 'bookshelf', x: ox + 2.6, y: oy + 0.3, w: 2.2, seed: ox * 5 + 1 }); K.blockRect(ox, oy, 5, 1);
        for (const ax of [1.2, 3.6]) { K.add({ type: 'armchair', x: ox + ax, y: oy + 2.6, color: '#b79c74' }); K.block(Math.floor(ox + ax), oy + 2); rest(L, { x: ox + ax, y: oy + 2.58, face: '-y', pose: 'sit', approach: [Math.floor(ox + ax), oy + 3] }, '서재 코너'); }
        K.add({ type: 'lamp', x: ox + 2.4, y: oy + 2.2 }); K.block(ox + 2, oy + 2); L.lamps.push({ x: ox + 2.4, y: oy + 2.2 });
        K.add({ type: 'plant', x: ox + 4.3, y: oy + 4.6, size: 1, seed: ox }); K.block(ox + 4, oy + 4);
        L.signs.push({ x: ox + 0.3, y: oy + 5.6, text: '📚 서재 코너', color: '#7a5540' });
      } }) },
      { w: 4, label: '📞 집중 부스', make: (L, K) => ({ w: 4, d: 6, place(ox, oy) {
        K.add({ type: 'phoneBooth', x: ox + 0.2, y: oy + 0.5, color: '#3f74b8' }); K.blockRect(ox, oy, 2, 2);
        K.add({ type: 'phoneBooth', x: ox + 2.1, y: oy + 0.5, color: '#2f7d4f' }); K.blockRect(ox + 2, oy, 2, 2);
        K.add({ type: 'plant', x: ox + 1.9, y: oy + 4.4, size: 1.1, seed: ox + 3 }); K.block(ox + 1, oy + 4);
        L.signs.push({ x: ox + 0.2, y: oy + 5.6, text: '📞 집중 부스', color: '#3f74b8' });
      } }) },
      { w: 5, label: '☕ 커피 바', make: (L, K) => ({ w: 5, d: 6, place(ox, oy) {
        K.add({ type: 'cabinet', x: ox + 0.4, y: oy + 0.3, w: 3, coffee: true }); K.blockRect(ox, oy, 4, 1);
        K.add({ type: 'fridge', x: ox + 3.8, y: oy + 0.25 }); K.block(ox + 3, oy); K.block(ox + 4, oy);
        K.add({ type: 'highTable', x: ox + 0.8, y: oy + 2.8, w: 3.2 }); K.blockRect(ox, oy + 2, 4, 1);
        for (let q = 0; q < 3; q++) { K.add({ type: 'barStool', x: ox + 1.3 + q * 1.1, y: oy + 3.9 }); rest(L, { x: ox + 1.3 + q * 1.1, y: oy + 3.88, face: '-y', pose: 'sit', carry: 'mug' }, '커피 바'); }
        L.signs.push({ x: ox + 0.3, y: oy + 5.6, text: '☕ 커피 바', color: '#7a4a2a' });
        shop(L, 'bar', ox + 1.4, oy + 1.5, '커피 바'); shop(L, 'bar', ox + 2.6, oy + 1.5, '커피 바');
      } }) },
      { w: 3, label: '🌿 그린 존', make: (L, K) => ({ w: 3, d: 6, place(ox, oy) {
        for (const [dx, dy, sz] of [[0.7, 0.8, 1.3], [2.2, 2.4, 1], [0.8, 4, 1.15]]) { K.add({ type: 'plant', x: ox + dx, y: oy + dy, size: sz, seed: ox * 9 + dy * 3 }); K.block(Math.floor(ox + dx), Math.floor(oy + dy)); }
      } }) },
    ];

    // 1) 팀 · 세션 데스크 · 협력사석 · 인턴 핫데스크 순서로 층을 채운다
    const items = o.pods.map((t) => ({ team: t, w: teamW(t) }));
    const singles = o.singles.slice();
    while (singles.length % 4) singles.push(null);
    for (let i = 0; i < singles.length; i += 4) { const keys = singles.slice(i, i + 4); items.push({ w: 6, block: { w: 6, label: '💻 세션 데스크', make: (L, K) => K.cluster(keys, 'single', i === 0 ? '💻 세션 데스크' : null, { noDecor: true }) } }); }
    for (let i = 0; i < o.partners.length; i += 4) { const keys = o.partners.slice(i, i + 4); items.push({ w: 6, block: { w: 6, label: '🤝 협력사석', make: (L, K) => K.cluster(keys, 'partner', i === 0 ? '🤝 협력사석' : null, { noDecor: true }) } }); }
    const hotN = Math.max(8, Math.ceil(o.hot / 4) * 4);       // 인턴 핫데스크는 최소 8자리
    items.push({ w: hotN + 2, hot: true, block: { w: hotN + 2, label: '🎒 인턴 핫데스크', make: (L, K) => K.cluster(new Array(hotN).fill(undefined), 'hot', '🎒 인턴 핫데스크') } });
    const floors = [];
    for (const it of items) { let f = floors[floors.length - 1]; if (!f || f.x + it.w > ROW) { f = { items: [], x: 0 }; floors.push(f); } f.items.push(it); f.x += it.w; }
    if (!floors.length) floors.push({ items: [], x: 0 });
    // 핫데스크 층: 🎓 인턴 교육장 (강사 · 연수생 상주)
    { const hf = floors.find((f) => f.items.some((it) => it.hot)); if (hf && hf.x + 8 <= ROW) { hf.items.push({ w: 8, block: { w: 8, label: '🎓 인턴 교육장', make: (L, K) => ({ w: 8, d: 6, place(ox, oy) {
      L.rugs.push({ x: ox + 0.3, y: oy + 0.3, w: 7.4, d: 5.4, color: '#eef3e2', border: '#cfdcb8' });
      K.add({ type: 'whiteboard', x: ox + 1.4, y: oy + 0.4, w: 4.6, color: '#3fb27f' }); K.blockRect(ox + 1, oy, 6, 1);
      K.add({ type: 'lectern', x: ox + 6.6, y: oy + 1.6 }); K.block(ox + 6, oy + 1);
      npc(L, '인턴 교육 강사', { x: ox + 6.6, y: oy + 2.5, face: '-x' }, { anim: 'think', hat: 'beret', accent: '#3fb27f', say: '📚 오늘은 프롬프트 기초!' });
      [[1.5, 3], [3.5, 3], [5.5, 3], [1.5, 4.7], [3.5, 4.7], [5.5, 4.7]].forEach(([dx, dy], i) => {
        K.add({ type: 'stool', x: ox + dx, y: oy + dy, color: ['#f3d48c', '#b8d8b0', '#a9c2d6'][i % 3] }); K.block(Math.floor(ox + dx), Math.floor(oy + dy));
        if (i % 2 === 0 || i === 3) npc(L, '연수생', { x: ox + dx, y: oy + dy, face: '-y', pose: 'sit' }, { anim: i % 2 ? 'type' : 'think', hat: 'beanie', accent: '#f3c44b' });
      });
      L.signs.push({ x: ox + 0.5, y: oy + 5.6, text: '🎓 인턴 교육장', color: '#3f8a45' });
    } }) } }); hf.x += 8; } }
    // 2) 블록 만들기 + 남는 폭 채우기
    for (const f of floors) {
      f.teams = f.items.filter((it) => it.team).map((it) => it.team);
      f.blocks = f.items.map((it) => (it.team ? teamUnit(it.team) : it.block));
      let free = ROW - f.blocks.reduce((s2, x) => s2 + x.w, 0), fi2 = 0;
      while (free >= 3 && fi2 < 12) { const fl = FILLERS.find((x, i) => i >= fi2 % FILLERS.length && x.w <= free) || FILLERS.find((x) => x.w <= free); if (!fl) break; f.blocks.push(fl); free -= fl.w; fi2++; }
    }
    floors.reverse();                                   // 활발한 팀이 위층, 인턴 핫데스크는 맨 아래층
    const midMeet = 2;                                  // 회의 전용층: 3F 업무층 바로 위 (업무층이 2개 이하면 업무층 맨 위)
    floors.forEach((f, fi) => {
      if (fi === midMeet) meetingFloor();
      n++;
      const { L, K } = mk(`${n}F 업무층`, fi % 2 ? 'carpet' : 'wood', fi % 2 ? '#e3e6ea' : '#eadcc3');
      const hasTeam = f.teams.length > 0;
      L.desc = [hasTeam ? `👔 팀장실 (돌려쓰기: ${f.teams.map((t) => t.title).join(' · ')})` : '🗣️ 회의실', ...[...new Set(f.blocks.map((b) => b.label).filter(Boolean))]].join(' · ');
      shell(L, K, hasTeam ? { name: '👔 팀장실', color: '#7a5540', glass: true } : { name: '🗣️ 회의실', color: '#6b5b4a', glass: true });
      if (hasTeam) {
        // 돌려쓰는 팀장실: 책장 · 임원 책상(방문 쪽을 본다) · 손님 의자
        L.patches.push({ x: 0, y: 0, w: 7, d: 5, style: 'carpet', color: '#c9b79a' });
        K.add({ type: 'bookshelf', x: 0.4, y: 0.3, w: 2.2, seed: L.idx }); K.add({ type: 'bookshelf', x: 2.7, y: 0.3, w: 2.2, seed: L.idx + 1 }); K.blockRect(0, 0, 5, 1);
        K.add({ type: 'execDesk', x: 1.6, y: 2, w: 2.6, d: 1, label: '👔 팀장' }); K.blockRect(1, 2, 4, 1);
        const roomSeat = { key: null, lv: L.idx, x: 2.9, y: 1.45, face: '+y', pose: 'sit', lead: true, room: true, tag: `${n}F 팀장실` };
        K.add({ type: 'chair', x: roomSeat.x, y: roomSeat.y, face: '+y', part: 'seat', premium: true }); K.add({ type: 'chair', x: roomSeat.x, y: roomSeat.y, face: '+y', part: 'back', premium: true });
        roomSeat.reports = [{ lv: L.idx, x: 2.9, y: 3.4, face: '-y' }, { lv: L.idx, x: 4.6, y: 3.4, face: '-x' }, { lv: L.idx, x: 1.2, y: 3.4, face: '+x' }];
        K.add({ type: 'plant', x: 6.4, y: 0.6, size: 0.9, seed: L.idx }); K.block(6, 0);
        K.add({ type: 'wallAC', x: 3.2, y: 0 });
        S.leadRooms.push({ id: L.name, lv: L.idx, seat: roomSeat, candidates: f.teams.map((t) => t.lead), titles: Object.fromEntries(f.teams.map((t) => [t.lead, t.title])) });
      } else roomA(L, K, 'A', 1);
      const used = f.blocks.reduce((s2, x) => s2 + x.w, 0);
      let ox = 1 + Math.floor((ROW - used) / 2);
      for (const bk of f.blocks) { bk.make(L, K).place(ox, 7); ox += bk.w; }
      // 앞쪽 띠(y 14~15): 팀장 책상 자리를 비켜서 에어컨 · 복합기 · 정수기 · 책장 · 소파 · 화분
      const res = L.reserved || [];
      const freeX = (x0, w) => x0 >= 0 && x0 + w <= FW && !res.some(([a2, b2]) => x0 + w > a2 && x0 <= b2);
      let cx = 0;
      const put = (w, fn) => { while (cx + w <= FW && !freeX(cx, w)) cx++; if (cx + w > FW) return false; fn(cx); cx += w; return true; };
      put(1, (x) => { K.add({ type: 'airCon', x: x + 0.5, y: 14.2 }); K.block(x, 14); });
      put(1, (x) => { K.add({ type: 'plant', x: x + 0.6, y: 15.1, size: 1, seed: L.idx * 3 }); K.block(x, 15); });
      put(3, (x) => { K.add({ type: 'sofa', x, y: 14.2, w: 3 }); K.blockRect(x, 14, 3, 1); [0.6, 1.6, 2.4].forEach((d) => rest(L, { x: x + d, y: 14.82, face: '+y', pose: 'sofa', approach: [Math.floor(x + d), 15] }, `${n}F 라운지`)); });
      put(2, (x) => { K.add({ type: 'printer', x: x + 0.4, y: 14.3 }); K.blockRect(x, 14, 2, 1); });
      put(1, (x) => { K.add({ type: 'waterCooler', x: x + 0.6, y: 14.3 }); K.block(x, 14); });
      put(3, (x) => { K.add({ type: 'bookshelf', x: x + 0.3, y: 14.1, w: 2.4, seed: L.idx }); K.blockRect(x, 14, 3, 1); });
      put(1, (x) => { K.add({ type: 'plant', x: x + 0.6, y: 14.6, size: 1.2, seed: L.idx * 5 }); K.block(x, 14); });
      K.add({ type: 'extinguisher', x: 21.5, y: 7.4 }); K.block(21, 7);
    });
    if (floors.length <= midMeet) meetingFloor();

    meetingFloor();                                    // 업무층 위 회의 전용층 → 그 위 서버실

    // ---- 서버실 · AI 학습실 층
    {
      n++;
      const { L, K } = mk(`${n}F 서버실`, 'raised', '#d9dde1'); L.desc = '서버실 · AI 학습실 · 보안팀 휴게실';
      shell(L, K, { name: '👮 보안팀 휴게실', color: '#2b3a67' });
      L.patches.push({ x: 0, y: 0, w: 7, d: 5, style: 'carpet', color: '#c9d2dc' });
      K.add({ type: 'tv', x: 1.4, y: 0.25, w: 3 }); K.blockRect(1, 0, 4, 1);
      K.add({ type: 'lockers', x: 5.3, y: 0.3, w: 1.5 }); K.blockRect(5, 0, 2, 1);
      K.add({ type: 'sofa', x: 1, y: 2.4, w: 3 }); K.blockRect(1, 2, 3, 1);
      npc(L, '보안요원', { x: 2.2, y: 3.02, face: '+y', pose: 'sofa' }, { hat: 'police' });
      K.wallX(0, FW, 7, { glass: true, h: 60, doors: [2, 15], color: '#d9dde1' });
      K.wallY(7, FH, 11, { glass: true, h: 60, doors: [8], color: '#d9dde1' });
      L.patches.push({ x: 0, y: 7, w: 11, d: 9, style: 'raised', color: '#d5d9dd' }, { x: 11, y: 7, w: 11, d: 9, style: 'raised', color: '#d3d8de' });
      for (const ry of [8.4, 11.4, 14.4]) { for (let x = 0.5; x + 0.9 < 10.4; x += 1.05) K.add({ type: 'serverRack', x, y: ry }); K.blockRect(0, Math.floor(ry), 10, 1); }
      K.add({ type: 'airCon', x: 10.2, y: 15.2 }); K.block(10, 15);
      npc(L, '서버 엔지니어', { x: 5, y: 10.3, face: '-y' }, { hat: 'cap', accent: '#4f5a65', carry: 'paper', patrol: [{ x: 5, y: 10.3, face: '-y' }, { x: 2, y: 13.3, face: '-y' }, { x: 8, y: 13.3, face: '-y' }] });
      sign(L, 0.3, 15.7, '🖥️ 서버실', '#4f5a65');
      K.add({ type: 'nocWall', x: 11.4, y: 7.14, w: 10.2, gpu: true });   // 유리벽(y=7) 안쪽에 걸어 유리 앞에 보이게
      for (let x = 11.6; x + 0.95 < 21.8; x += 1.05) K.add({ type: 'gpuRack', x, y: 8.6, seed: Math.round(x * 7) });
      K.blockRect(11, 8, 11, 1);
      for (let c = 0; c < 3; c++) { const st = K.deskSeat(12, 9.6, c, 'B', null); if (c < 2) npc(L, 'AI 연구원', { x: st.x, y: st.y, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'headphones', accent: '#2f9e5f' }); }
      sign(L, 11.3, 15.7, '🧠 AI 학습실', '#2f9e5f');
    }

    // ---- 휴게층: 휴게실 · 수면실 · 청소원 휴게실
    {
      n++;
      const { L, K } = mk(`${n}F 휴게층`, 'wood', '#e2cfae'); L.desc = '휴게실 · 수면실 · 청소원 휴게실';
      shell(L, K, { name: '🧹 청소원 휴게실', color: '#3f8a45' });
      L.patches.push({ x: 0, y: 0, w: 7, d: 5, style: 'tile', color: '#e6efe2' });
      K.add({ type: 'lockers', x: 0.3, y: 0.25, w: 2.4 }); K.blockRect(0, 0, 3, 1);
      K.add({ type: 'janitorCart', x: 3.4, y: 0.4 }); K.blockRect(3, 0, 2, 1);
      K.add({ type: 'roundTable', x: 4.2, y: 3, r: 0.45, color: '#f7f6f2' }); K.block(4, 3);
      K.add({ type: 'stool', x: 3.2, y: 3, color: '#b8d8b0' });
      npc(L, '청소원', { x: 3.2, y: 3, face: '+x', pose: 'sit' }, { hat: 'bucket', accent: '#3f8a45', carry: 'mop', patrol: [{ x: 3.2, y: 3, face: '+x', pose: 'sit' }, { x: 2, y: 6, face: '+x' }, { x: 20, y: 6, face: '-x' }, { x: 6, y: 15, face: '-y' }] });
      K.wallX(0, FW, 7, { glass: true, h: 60, doors: [13, 18], color: '#d9dde1' });   // 휴게실 문: 자판기 옆 빈 칸 (예전 x=3 은 맥주탭에 막혀 못 들어갔다)
      K.wallY(7, FH, 14, { h: 46, doors: [9], color: '#e7e1d8' });
      L.patches.push({ x: 14, y: 7, w: 8, d: 9, style: 'carpet', color: '#5b6170' });
      K.add({ type: 'beerTap', x: 0.4, y: 7.3, w: 3 }); K.blockRect(0, 7, 4, 1);
      for (let k = 0; k < 2; k++) { K.add({ type: 'barStool', x: 1 + k * 1.3, y: 8.75 }); rest(L, { x: 1 + k * 1.3, y: 8.73, face: '-y', pose: 'sit', carry: 'mug' }, '휴게실 맥주'); }
      K.add({ type: 'fridge', x: 3.7, y: 7.25 }); K.block(3, 7);
      K.add({ type: 'arcade', x: 4.8, y: 7.25 }); K.add({ type: 'arcade', x: 5.9, y: 7.25, hue: 200 }); K.blockRect(4, 7, 3, 1);
      rest(L, { x: 5.25, y: 8.6, face: '-y', pose: 'stand' }, '휴게실 오락기'); rest(L, { x: 6.35, y: 8.6, face: '-y', pose: 'stand' }, '휴게실 오락기');
      K.add({ type: 'gameTV', x: 7.4, y: 7.2, w: 3 }); K.blockRect(7, 7, 4, 1);
      K.add({ type: 'vending', x: 11.2, y: 7.25, color: '#e5534b' }); K.block(11, 7);
      for (const [bx, c] of [[8, '#e2667f'], [9.6, '#4e9cf6']]) { K.add({ type: 'beanbag', x: bx, y: 9.8, color: c }); rest(L, { x: bx, y: 9.8, face: '-y', pose: 'sofa' }, '휴게실 게임'); }
      K.add({ type: 'foosball', x: 0.6, y: 11 }); K.blockRect(0, 11, 3, 2);
      rest(L, { x: 0.3, y: 11.5, face: '+x', pose: 'stand' }, '휴게실 푸스볼'); rest(L, { x: 2.8, y: 11.5, face: '-x', pose: 'stand' }, '휴게실 푸스볼');
      K.add({ type: 'sofa', x: 4.6, y: 13.6, w: 3 }); K.blockRect(4, 13, 4, 1);
      [0.6, 1.6, 2.4].forEach((d) => rest(L, { x: 4.6 + d, y: 14.22, face: '+y', pose: 'sofa', approach: [Math.floor(4.6 + d), 15] }, '휴게실 소파'));
      K.add({ type: 'massageChair', x: 10, y: 13.8 }); K.block(10, 13); rest(L, { x: 10, y: 13.8, face: '+y', pose: 'sit', approach: [10, 15] }, '안마의자');
      K.add({ type: 'dartboard', x: 12, y: 7 });
      sign(L, 0.3, 15.7, '🍺 휴게실', '#c47f22');
      for (const [px, py, c] of [[14.4, 8, '#7a8fd6'], [16.6, 8, '#a67be0'], [18.8, 8, '#4e9cf6'], [14.4, 12, '#a67be0'], [16.6, 12, '#4e9cf6'], [18.8, 12, '#7a8fd6']]) {
        K.add({ type: 'napPod', x: px, y: py, color: c }); K.blockRect(Math.floor(px), Math.floor(py), 2, 3);
        rest(L, { x: px + 0.8, y: py + 2.15, face: '+y', pose: 'sofa', approach: [Math.floor(px + 0.8), Math.floor(py) + 3] }, '수면실');
      }
      K.add({ type: 'lamp', x: 21.4, y: 15.3 }); K.block(21, 15); L.lamps.push({ x: 21.4, y: 15.3 });
      sign(L, 14.3, 15.7, '😴 수면실', '#7a8fd6');
    }


    // ---- 개인연구실 층: 방마다 책상 + 침대 (연구실 겸 숙소, 실적 좋은 세션에게 배정)
    {
      n++;
      const { L, K } = mk(`${n}F 개인연구실`, 'carpet', '#e3dccf');
      const room = (rx, ry, rw, rd, i) => {
        L.patches.push({ x: rx, y: ry, w: rw, d: rd, style: 'wood', color: i % 2 ? '#e6d6bd' : '#ead9c0' });
        // 책상 · 의자 · 책장 · 침대 · 스탠드
        K.add({ type: 'bookshelf', x: rx + 0.3, y: ry + 0.25, w: 2, seed: rx * 7 + ry }); K.blockRect(rx, ry, 2, 1);
        K.add({ type: 'desk', x: rx + 2.4, y: ry + 0.3, w: 2, d: 1, face: '-y', seed: rx + ry }); K.blockRect(rx + 2, ry, 2, 1);
        K.add({ type: 'chair', x: rx + 3.4, y: ry + 1.75, face: '-y', part: 'seat' }); K.add({ type: 'chair', x: rx + 3.4, y: ry + 1.75, face: '-y', part: 'back' });
        const bx = rx + rw - 1.3, by = ry + rd - 2.3;
        K.add({ type: 'bed', x: bx, y: by, color: COLORS[i % COLORS.length] }); K.blockRect(Math.floor(bx), Math.floor(by), 2, 3);
        S.dorms.push({ lv: L.idx, x: bx + 0.5, y: by + 0.9, face: '+y', pose: 'sofa', approach: [Math.floor(bx) - 1, Math.floor(by) + 1], tag: `개인연구실 ${i + 1}` });
        K.add({ type: 'lamp', x: rx + 0.5, y: ry + rd - 0.6 }); K.block(rx, ry + rd - 1); L.lamps.push({ x: rx + 0.5, y: ry + rd - 0.6 });
        sign(L, rx + 0.3, ry + rd - 0.3, `🔬 개인연구실 ${i + 1}`, '#1f9fb4');
      };
      shell(L, K, null);
      K.wallX(0, 7, 5, { h: 46, doors: [4], color: '#e7e1d8' });
      room(0, 0, 7, 5, 0);
      K.wallX(0, FW, 7, { h: 46, doors: [4, 9, 14, 19], color: '#e7e1d8' });
      for (const x of [5, 10, 15]) K.wallY(7, FH, x, { h: 46, color: '#e7e1d8' });
      [[0, 5], [5, 10], [10, 15], [15, 22]].forEach(([rx, rx1], i) => room(rx, 7, rx1 - rx, FH - 7, i + 1));
      L.desc = '연구실 겸 숙소 5칸 · 실적 좋은 세션이 쉬는 곳';
    }
    // ---- 임원층: 대표실 · 임원실 · 중역회의실 · 대회의실
    {
      n++;
      const { L, K } = mk(`${n}F 임원층`, 'carpet', '#d2c4ab'); L.desc = '대표실 · 임원실 · 중역회의실 · 대회의실';
      shell(L, K, { name: '🎩 임원실', color: '#7a5540', glass: true });
      L.patches.push({ x: 0, y: 0, w: 7, d: 5, style: 'carpet', color: '#cbb894' });
      K.add({ type: 'bookshelf', x: 0.4, y: 0.3, w: 2.2, seed: 77 }); K.blockRect(0, 0, 3, 1);
      K.add({ type: 'execDesk', x: 2.3, y: 2, w: 2.6, d: 1, label: '🎩 임원' }); K.blockRect(2, 2, 3, 1);
      K.add({ type: 'chair', x: 3.6, y: 1.45, face: '+y', part: 'seat', premium: true }); K.add({ type: 'chair', x: 3.6, y: 1.45, face: '+y', part: 'back', premium: true });
      npc(L, '임원', { x: 3.6, y: 1.45, face: '+y', pose: 'sit' }, { anim: 'type', hat: 'shades', accent: '#7a5540', tie: '#7a2232' });
      K.wallX(0, FW, 7, { glass: true, h: 60, doors: [1, 13, 21], color: '#d9dde1' });   // 회의실 문: TV·스크린에 막히지 않는 칸
      K.wallY(7, FH, 7, { h: 46, color: '#e7e1d8' }); K.wallY(7, FH, 14, { h: 46, color: '#e7e1d8' });
      // 대표실
      L.patches.push({ x: 0, y: 7, w: 7, d: 9, style: 'carpet', color: '#9b7b5a' });
      K.add({ type: 'trophyCase', x: 2.6, y: 7.3, w: 3.8 }); K.blockRect(2, 7, 5, 1);
      K.add({ type: 'flagStand', x: 0.7, y: 8 }); K.block(0, 8);
      K.add({ type: 'execDesk', x: 2, y: 10.2, w: 2.6, d: 1, label: '👑 대표' }); K.blockRect(2, 10, 3, 1);
      K.add({ type: 'bossChair', x: 3.3, y: 9.65 });
      npc(L, '원장', { x: 3.3, y: 9.65, face: '+y', pose: 'sit' }, { anim: 'think', hat: 'shades', accent: '#b8955f', tie: '#7a2232' });
      K.add({ type: 'sofa', x: 1, y: 13.8, w: 3.2 }); K.blockRect(1, 13, 4, 1);
      K.add({ type: 'aquarium', x: 4.6, y: 14.6, w: 2 }); K.blockRect(4, 14, 3, 1);
      sign(L, 0.3, 15.7, '👑 대표실', '#b8955f');
      // 중역회의실
      L.patches.push({ x: 7, y: 7, w: 7, d: 9, style: 'carpet', color: '#b9a37e' });
      K.add({ type: 'tv', x: 8.6, y: 7.3, w: 3.4 }); K.blockRect(8, 7, 5, 1);
      for (let i = 0; i < 4; i++) K.add({ type: 'tableSeg', x: 8.5 + i, y: 10.6, w: 1, d: 1.1 });
      K.blockRect(8, 10, 5, 2);
      for (let i = 0; i < 3; i++) for (const [y, face] of [[10, '+y'], [12.25, '-y']]) { const x = 9.1 + i * 1.2; K.add({ type: 'chair', x, y, face, part: 'seat', premium: true }); K.add({ type: 'chair', x, y, face, part: 'back', premium: true }); meet(L, x, y, face, '중역', 2); }
      sign(L, 7.3, 15.7, '🏛️ 중역회의실', '#7a5540');
      // 대회의실
      L.patches.push({ x: 14, y: 7, w: 8, d: 9, style: 'carpet', color: '#c9d2dc' });
      K.add({ type: 'bigScreen', x: 15.2, y: 7.25, w: 5.6 }); K.blockRect(15, 7, 6, 1);
      for (let i = 0; i < 5; i++) K.add({ type: 'tableSeg', x: 15.5 + i, y: 10.6, w: 1, d: 1.1 });
      K.blockRect(15, 10, 6, 2);
      for (let i = 0; i < 4; i++) for (const [y, face] of [[10, '+y'], [12.25, '-y']]) { const x = 16.1 + i * 1.2; K.add({ type: 'chair', x, y, face, part: 'seat', premium: true }); K.add({ type: 'chair', x, y, face, part: 'back', premium: true }); meet(L, x, y, face, '대회의', 2); }
      K.add({ type: 'plant', x: 21.3, y: 15.2, size: 1, seed: 5 }); K.block(21, 15);
      sign(L, 14.3, 15.7, '🏛️ 대회의실', '#6b5b4a');
    }

    // ---- 옥상
    {
      const { L, K } = mk('R 루프탑', 'deck', '#c9a57a', 'roof'); L.desc = '루프탑 카페 & 바 · 흡연구역';
      // 엘리베이터실: 8×4 로 키우고, 앞벽 가운데에 로비형 유리 자동문, 두 엘리베이터 사이 벽 기둥에 층 안내판
      L.patches.push({ x: 6, y: 0, w: 8, d: 4, style: 'marble', color: '#efece6' });
      L.elev = [];
      for (const [car, cx] of [[0, 7], [1, 10]]) { K.add({ type: 'elevCab', x: cx, y: 0, w: 2, d: 2, car }); K.add({ type: 'elevDoor', x: cx, y: 0, w: 2, d: 2, car, label: 'R' }); K.blockRect(cx, 0, 2, 2); L.elev.push({ car, hall: { x: cx + 1, y: 2.75 }, cabin: { x: cx + 1, y: 1.0 } }); }
      K.add({ type: 'v4_elevPillar', x: 9, y: 0, w: 1, d: 2 }); K.add({ type: 'elevPanel', x: 9.5, y: 2.32, label: 'R' }); K.blockRect(9, 0, 1, 2);
      K.add({ type: 'plant', x: 6.5, y: 0.6, size: 0.8, seed: 3 }); K.block(6, 0); K.add({ type: 'plant', x: 13.5, y: 0.6, size: 0.8, seed: 4 }); K.block(13, 0);
      K.add({ type: 'hutShell', x: 6, y: 0, w: 8, d: 4 });
      K.wallY(0, 4, 6, { h: 82, color: '#e6e0d6' }); K.wallY(0, 4, 14, { h: 82, color: '#e6e0d6' });
      K.wallX(6, 9, 4, { h: 82, color: '#e6e0d6' }); K.wallX(9, 11, 4, { h: 82, doors: [9, 10], color: '#e6e0d6' }); K.add({ type: 'entrance', x: 9, y: 4 - 0.08, w: 2, bld: 'roof', h: 82, color: '#e6e0d6' }); K.wallX(11, 14, 4, { h: 82, color: '#e6e0d6' });   // 가운데는 1층 로비와 같은 유리 자동문
      // 오른쪽 뒤 정원: 화분 줄 · 토피어리 · 텃밭 · 벤치
      for (let x = 14.4; x + 2 < FW; x += 2.4) { K.add({ type: 'planter', x, y: 0.35, w: 2.2, seed: x * 5 }); K.blockRect(Math.floor(x), 0, 3, 1); }
      for (const x of [15, 18, 21]) { K.add({ type: 'topiary', x: x + 0.5, y: 2.5, seed: x * 3 }); K.block(x, 2); }
      K.add({ type: 'veggies', x: 16.2, y: 3.3, w: 1.6, d: 1, seed: 9 }); K.blockRect(16, 3, 2, 1);
      K.add({ type: 'veggies', x: 19.2, y: 3.3, w: 1.6, d: 1, seed: 13 }); K.blockRect(19, 3, 2, 1);
      L.signs.push({ x: 14.4, y: 4.7, text: '🌿 루프탑 가든', color: '#3f8a45', room: true });
      // 여기저기 꽃 · 화분 (색 다양하게)
      for (const [x, y, c] of [[5.5, 4.4, '#b38cf0'], [14.4, 4.4, '#ff9a5a'], [21.3, 6.4, '#f07a8a'], [21.3, 8.4, '#7ab8f5'], [12.6, 5.6, '#f6c445'], [0.5, 12.5, '#f2a7c3']]) { K.add({ type: 'flowerBush', x, y, size: 0.95, seed: Math.round(x * 7 + y), color: c }); K.block(Math.floor(x), Math.floor(y)); }
      for (const [x, y, sz] of [[19.5, 6.6, 1.2], [6.6, 10.6, 1], [13.4, 15.3, 1.1], [9.5, 15.4, 0.9]]) { K.add({ type: 'plant', x, y, size: sz, seed: Math.round(x * 3 + y) }); K.block(Math.floor(x), Math.floor(y)); }
      K.add({ type: 'roofTree', x: 19.5, y: 9.2, size: 0.9, seed: 41, blossom: true }); K.block(19, 9);
      L.patches.push({ x: 0, y: 0, w: 7, d: 16, style: 'grass', color: '#a6d28b' });
      for (let x = 0.4; x < 6; x += 2.4) { K.add({ type: 'planter', x, y: 0.4, w: 2.2, seed: x * 3 }); K.blockRect(Math.floor(x), 0, 3, 1); }
      for (const [x, y] of [[1, 6], [5.5, 9.5], [1, 14.5]]) { K.add({ type: 'roofTree', x: x + 0.5, y: y + 0.5, size: 1, seed: x * 7 + y, blossom: y > 8 }); K.block(Math.floor(x), Math.floor(y)); }
      // ☕ 루프탑 카페 & 🍸 바
      K.add({ type: 'cafeCounter', x: 0.6, y: 6.2, w: 5.4 }); K.blockRect(0, 6, 6, 1);
      npc(L, '바리스타', { x: 2.6, y: 5.6, face: '+y' }, { anim: 'type', hat: 'beret', accent: '#7a4a2a' });
      shop(L, 'cafe', 5.3, 7.6, '루프탑 카페');
      K.add({ type: 'beerTap', x: 14.4, y: 6.2, w: 3.2 }); K.blockRect(14, 6, 4, 1);
      npc(L, '바텐더', { x: 16, y: 5.6, face: '+y' }, { anim: 'type', hat: 'shades', accent: '#2b2622', tie: '#2b2622' });
      for (let k = 0; k < 3; k++) { const x = 14.8 + k * 1.2; K.add({ type: 'barStool', x, y: 7.75 }); rest(L, { x, y: 7.73, face: '-y', pose: 'sit', carry: 'mug' }, '루프탑 바'); }
      for (let k = 0; k < 3; k++) { const x = 1.2 + k * 1.4; K.add({ type: 'barStool', x, y: 7.75 }); rest(L, { x, y: 7.73, face: '-y', pose: 'sit', carry: 'mug' }, '루프탑 카페'); }
      for (const [x, y, c] of [[3.5, 11, '#e2667f'], [8, 13.2, '#4e7cf6'], [11, 9.6, '#3fb27f']]) { K.add({ type: 'parasolTable', x, y, color: c }); K.block(Math.floor(x), Math.floor(y)); for (const [dx, face] of [[-1, '+x'], [1, '-x']]) { K.add({ type: 'stool', x: x + dx, y, color: '#f3d48c' }); rest(L, { x: x + dx, y, face, pose: 'sit' }, '루프탑 카페'); } }
      for (let k = 0; k < 3; k++) { const x = 13.8 + k * 1.6; K.add({ type: 'deckChair', x, y: 11.4, color: ['#4e9cf6', '#f2a7c3', '#f6c445'][k] }); K.block(Math.floor(x), 11); rest(L, { x, y: 11.95, face: '+y', pose: 'sofa', approach: [Math.floor(x), 13] }, '루프탑 선베드'); }
      K.add({ type: 'parasol', x: 15.4, y: 10.8, color: '#e5534b' });
      K.add({ type: 'ashtray', x: 20.6, y: 14.6 }); K.block(20, 14);
      K.add({ type: 'bench', x: 17.6, y: 14.4, w: 2.4 }); K.blockRect(17, 14, 3, 1);
      for (let k = 0; k < 2; k++) rest(L, { x: 18.3 + k * 1.1, y: 14.65, face: '+y', pose: 'sit', carry: 'cig', approach: [Math.floor(18.3 + k * 1.1), 13] }, '루프탑 흡연');
      K.add({ type: 'smokeSign', x: 21.4, y: 13.2 });
      K.add({ type: 'stringLights', pts: [[0.5, 9.2], [12.5, 9.2], [12.5, 15.2]] });
      for (const [x, y] of [[0, 9], [12, 9], [12, 15]]) K.block(x, y);
      for (const [x, y, c] of [[6, 15.2, '#f6c445']]) { K.add({ type: 'flowerBush', x, y, size: 1, seed: x * 3, color: c }); K.block(Math.floor(x), Math.floor(y)); }
      L.signs.push({ x: 0.4, y: 8.6, text: '☕ 루프탑 카페', color: '#7a4a2a', room: true }, { x: 14.2, y: 8.6, text: '🍸 루프탑 바', color: '#2b2622', room: true }, { x: 17.4, y: 15.8, text: '🚬 흡연구역', color: '#6b6b6b', room: true });

      L.windows = []; L.wallY = null;
    }
    levels.forEach((L, i) => { L.floorIdx = i; L.zBase = (i - NB) * FLOOR_PX; L.decals = L.decals || []; L.northWindows = L.northWindows || []; if (i < NB) L.basement = true; });
    S.miniBase = NB;
    return levels;
  }

  // ---------------------------------------------------------------- lots
  function lotKit(S, OUT, W, H) {
    OUT.W = W; OUT.H = H;
    const K = LY.kit(S, OUT);
    const G = OUT.ground = { walk: [], plaza: [], road: [], inter: [], cross: [], decals: [], lots: [], curves: [], rounds: [], fell: [] };
    const used = new Uint8Array(W * H);
    const mark = (x, y, w, d, v) => { for (let i = Math.max(0, Math.floor(x)); i < Math.min(W, Math.ceil(x + w)); i++) for (let j = Math.max(0, Math.floor(y)); j < Math.min(H, Math.ceil(y + d)); j++) if (v === 3 || used[j * W + i] !== 3) used[j * W + i] = v; };
    const free = (x, y, w = 1, d = 1) => { for (let i = Math.floor(x); i < Math.ceil(x + w); i++) for (let j = Math.floor(y); j < Math.ceil(y + d); j++) if (i < 0 || j < 0 || i >= W || j >= H || used[j * W + i]) return false; return true; };
    const solid = (x, y, w, d) => { K.blockRect(x, y, w, d); mark(x, y, w, d, 2); };
    const add = (f, bx, by, bw = 1, bd = 1) => { K.add(f); if (bx != null) solid(bx, by, bw, bd); return f; };
    const walk = (x, y, w, d) => { G.walk.push({ x, y, w, d }); mark(x, y, w, d, 1); };
    const plaza = (x, y, w, d, color) => { G.plaza.push({ x, y, w, d, color }); mark(x, y, w, d, 1); };
    const roads = [];
    const road = (y, name) => { const r = { axis: 'x', x: 0, y, w: W, d: 4, name }; roads.push(r); G.road.push(r); mark(0, y, W, 4, 3); walk(0, y - 1, W, 1); walk(0, y + 4, W, 1); return r; };
    const cross = (r, at) => { const c = { axis: 'x', x: at, y: r.y, w: 3, d: 4, light: true, id: G.cross.length, road: roads.indexOf(r), phase: G.cross.length * 7 }; G.cross.push(c); mark(c.x, c.y, 3, 4, 1); add({ type: 'trafficLight', x: c.x - 0.6, y: r.y - 1.4, cw: c.id, side: -1 }, c.x - 1, r.y - 2); add({ type: 'trafficLight', x: c.x + 3.6, y: r.y + 5.4, cw: c.id, side: 1 }, c.x + 3, r.y + 5); return c; };
    const tree = (x, y, s, kind) => { if (!free(x, y)) return false; add({ type: 'tree', x: x + 0.5, y: y + 0.5, size: s, seed: x * 31 + y, kind }, x, y); return true; };
    const rest = (s, tag) => S.rest.push({ lv: OUT.idx, tag, carry: 'mug', ...s });
    return { K, G, used, mark, free, solid, add, walk, plaza, roads, road, cross, tree, rest };
  }

  function placeBuilding(S, OUT, lv, k, TX, TY, name) {
    for (const L of lv) { L.ox = TX; L.oy = TY; }
    k.solid(TX, TY, FW, FH);
    const front = TY + FH;
    const NB = S.miniBase || 0;
    S.doors.push({ bld: 'tower', a: { lv: OUT.idx, x: TX + 11, y: front + 0.55 }, b: { lv: lv[NB].idx, x: 11, y: FH - 0.6 } });
    const b = { id: 'tower', name, type: 'tower', core: true, x: TX, y: TY, W: FW, H: FH, levels: lv.map((L) => L.idx), door: { x: TX + 11, y: front }, base: NB, lobby: lv[NB].idx };
    S.buildings.push(b);
    S.occ.push({ id: 'tower', kind: 'tower', name, x: TX, y: TY, W: FW, H: FH, bld: b });
    S.FLOOR_PX = FLOOR_PX;
    S.floorNames = lv.map((L) => L.name);
    return b;
  }

  /** 🏢 골목에 바로 붙은 꼬마빌딩 */
  function streetLot(S, OUT, lv) {
    const W = 46, H = 38, TX = 12, TY = 6, front = TY + FH;
    const k = lotKit(S, OUT, W, H);
    placeBuilding(S, OUT, lv, k, TX, TY, '🏢 꼬마빌딩');
    k.plaza(0, front, W, 5, '#e6e0d4');
    const R = k.road(front + 6, '골목길');
    k.cross(R, TX + 9.5);
    // 서쪽 쌈지공원 · 동쪽 주차장
    k.G.decals.push({ type: 'meadow', x: 1, y: 3, w: 10, d: 18, seed: 5 });
    for (const [bx, by] of [[2, 14], [6.5, 18]]) { k.add({ type: 'bench', x: bx, y: by, w: 2.4 }, bx, by, 3, 1); for (let q = 0; q < 2; q++) k.rest({ x: bx + 0.7 + q * 1.1, y: by + 0.25, face: '+y', pose: 'sit', approach: [bx + q, by + 1] }, '쌈지공원 벤치'); }
    k.add({ type: 'bikeRack', x: 7, y: 21.3 }, 7, 21, 3, 1);
    k.G.fell.push({ cx: 5.5, cy: 9, rx: 3, ry: 1.6, seed: 11 }); k.solid(3, 8, 6, 2);
    for (const [x, y, kind] of [[1, 3, 'cherry'], [9, 4, 'maple'], [2, 7, 'oak'], [9, 12, 'cherry'], [1, 18, 'pine']]) k.tree(x, y, 1.05, kind);
    k.G.decals.push({ type: 'parking', x: 36, y: 7, w: 9, d: 14, n: 3 }); k.mark(36, 7, 9, 14, 1);
    for (let i = 0; i < 3; i++) k.add({ type: 'parkedCar', x: 36.9 + i * 3, y: i % 2 ? 15.1 : 11.4, axis: 'y', dir: i % 2 ? -1 : 1, color: ['#4e7cf6', '#ffffff', '#e5534b'][i] });
    for (let x = 1; x < W - 1; x += 3) k.tree(x, 1, 1, x % 2 ? 'ginkgo' : 'oak');
    for (let x = 2; x < W - 1; x += 6) { k.tree(x, R.y - 2, 1.05, 'ginkgo'); k.tree(x + 3, R.y + 5, 1.05, 'ginkgo'); }
    for (const x of [8, 26, 40]) { const f = { type: 'streetLamp', x: x + 0.5, y: R.y - 0.6 }; k.K.add(f); OUT.lamps.push(f); }
    S.traffic = { roads: k.roads, cross: k.G.cross };
    S.door = { lv: OUT.idx, x: TX + 11.5, y: front + 3, face: '-y' };
    S.home = { x0: 0, y0: 0, x1: W, y1: H };
    return finish(S, OUT, k.used);
  }

  /** 🏡 마당 있는 꼬마빌딩: 울타리 · 텃밭 · 바비큐 · 트램펄린 · 연못 · 반려동물 · 가족 피크닉 */
  function yardLot(S, OUT, lv) {
    const W = 62, H = 52, TX = 5, TY = 5, front = TY + FH, ROADY = 46;
    const k = lotKit(S, OUT, W, H);
    placeBuilding(S, OUT, lv, k, TX, TY, '🏡 마당 오피스');
    const R = k.road(ROADY, '동네길');
    k.cross(R, 29);
    // 울타리 + 대문
    const GATE = [28, 33];
    const fence = (axis, x, y) => { k.K.add({ type: 'fence', axis, x, y }); k.K.block(axis === 'x' ? x : x - 1, axis === 'x' ? y - 1 : y); };
    for (let x = 1; x < W - 1; x++) { fence('x', x, 1); if (x < GATE[0] || x >= GATE[1]) fence('x', x, ROADY - 1); }
    for (let y = 1; y < ROADY - 1; y++) { fence('y', 1, y); fence('y', W - 1, y); }
    // 마당 길: 대문 → 현관
    k.plaza(TX + 9, front, 5, 2, '#e6dccb');
    k.G.curves.push({ pts: [[30.5, ROADY - 1], [29, 38], [22, 30], [17, 24.5], [16.5, front + 1]], w: 1.6, dots: true });
    for (const [px, py] of [[30.5, 44], [29.5, 40], [27, 35], [23, 31], [19.5, 27], [17, 24]]) k.mark(Math.floor(px) - 1, Math.floor(py) - 1, 3, 3, 1);
    k.plaza(4, 28, 9, 7, '#d5d0c6'); k.add({ type: 'parkedCar', x: 6, y: 30, axis: 'y', dir: 1, color: '#f2c230' });
    k.add({ type: 'parkedCar', x: 9, y: 30.4, axis: 'y', dir: 1, color: '#4e7cf6' });
    // 텃밭
    for (let i = 0; i < 3; i++) k.add({ type: 'veggies', x: 31 + i * 4.6, y: 4, w: 3.6, d: 2.2, seed: i * 7 }, 31 + i * 4.6, 4, 4, 3);
    S.npcs.push({ lv: OUT.idx, id: 'N:gardener-yard', role: '텃밭 지기', home: { lv: OUT.idx, x: 33, y: 7.6, face: '-y', pose: 'stand' }, anim: 'idle', hat: 'bucket', accent: '#3f8a45', say: '🥬 오늘 상추 따요', patrol: [{ lv: OUT.idx, x: 33, y: 7.6, face: '-y', pose: 'stand' }, { lv: OUT.idx, x: 42, y: 7.6, face: '-y', pose: 'stand' }] });
    // 연못 + 오리
    const PD = { cx: 53, cy: 10, rx: 5, ry: 3.2 };
    k.G.decals.push({ type: 'pond', ...PD });
    for (let i = PD.cx - 5; i <= PD.cx + 5; i++) for (let j = PD.cy - 4; j <= PD.cy + 4; j++) if (((i + 0.5 - PD.cx) / PD.rx) ** 2 + ((j + 0.5 - PD.cy) / PD.ry) ** 2 < 1) { k.K.block(i, j); k.used[j * W + i] = 4; }
    k.add({ type: 'stoneLantern', x: 46.5, y: 8 }, 46, 8);
    // 놀이: 트램펄린 · 그네
    k.add({ type: 'trampoline', x: 41, y: 17 }, 40, 16, 3, 3);
    k.add({ type: 'swingSet', x: 47, y: 18 }, 47, 17, 4, 2);
    S.park = { mats: [], wander: [], play: [{ lv: OUT.idx, x: 41, y: 17, face: '+y', pose: 'stand', ball: false }, { lv: OUT.idx, x: 47.9, y: 19.3, face: '+y', pose: 'sit', swing: 0, at: [47, 18] }, { lv: OUT.idx, x: 49.1, y: 19.3, face: '+y', pose: 'sit', swing: 1, at: [47, 18] }] };
    // 바비큐 · 피크닉 테이블 · 불멍
    k.add({ type: 'bbq', x: 34, y: 22 }, 34, 22, 2, 1);
    S.npcs.push({ lv: OUT.idx, id: 'N:bbq-yard', role: '바비큐 담당', home: { lv: OUT.idx, x: 34.6, y: 23.5, face: '-y', pose: 'stand' }, anim: 'type', hat: 'beret', accent: '#e5534b' });
    k.add({ type: 'picnicTable', x: 37, y: 22 }, 37, 22, 4, 2);
    for (const [dx, dy, face] of [[0.6, -0.35, '+y'], [2.0, -0.35, '+y'], [0.6, 2.25, '-y'], [2.0, 2.25, '-y']]) k.rest({ x: 37 + dx, y: 22 + dy, face, pose: 'sit' }, '마당 바비큐');
    k.add({ type: 'parasol', x: 38.4, y: 23, color: '#e5534b' });
    k.add({ type: 'firePit', x: 52, y: 25 }, 51, 24, 2, 2);
    for (const [bx, by] of [[49.4, 22], [49.4, 27.2]]) { k.add({ type: 'bench', x: bx, y: by, w: 5.2, color: '#a87a52' }, Math.floor(bx), by, 6, 1); for (let q = 0; q < 4; q++) k.rest({ x: bx + 0.7 + q * 1.25, y: by + 0.25, face: by < 25 ? '+y' : '-y', pose: 'sit', approach: [Math.floor(bx + 0.7 + q * 1.25), by + (by < 25 ? 1 : -1)] }, '마당 불멍'); }
    k.add({ type: 'stringLights', pts: [[33.5, 20.5], [42.5, 20.5], [42.5, 26.5]] }); k.solid(33, 20, 1, 1); k.solid(42, 20, 1, 1); k.solid(42, 26, 1, 1);
    k.add({ type: 'hammock', x: 54, y: 33 }, 54, 33, 3, 1);
    // 피크닉 매트 (세션 가족들이 와서 논다)
    const matColors = ['#e5534b', '#4e7cf6', '#3fb27f', '#e9a23b'];
    [[30, 29], [36, 32], [42, 36], [48, 38]].forEach(([mx, my], i) => {
      k.G.decals.push({ type: 'mat', x: mx, y: my, w: 3, d: 2.2, color: matColors[i] }); k.mark(mx, my, 3, 3, 1);
      k.add({ type: 'basket', x: mx + 1.5, y: my + 1.1 });
      S.park.mats.push({ x: mx, y: my, seats: [[mx + 0.6, my + 0.6, '+y'], [mx + 2.4, my + 0.6, '+y'], [mx + 0.6, my + 1.7, '-y'], [mx + 2.4, my + 1.7, '-y']].map(([x, y, face]) => ({ lv: OUT.idx, x, y, face, pose: 'sit', tag: '마당 피크닉' })) });
    });
    for (const [x, y] of [[33, 27], [45, 30], [52, 41], [38, 41]]) S.park.wander.push({ x: x + 0.5, y: y + 0.5, face: '+y' });
    // 동물 집
    k.add({ type: 'doghouse', x: 30, y: 13 }, 30, 13, 2, 2);
    k.add({ type: 'catTree', x: 28.5, y: 22 }, 28, 22, 1, 1);
    k.add({ type: 'coop', x: 56, y: 38 }, 56, 38, 2, 2);
    // 화단 · 나무
    k.G.fell.push({ cx: 24, cy: 10, rx: 3, ry: 1.6, seed: 3 }, { cx: 24, cy: 17, rx: 2.4, ry: 1.4, seed: 4 }, { cx: 14, cy: 39, rx: 3.2, ry: 1.6, seed: 5 });
    k.solid(21, 9, 6, 2); k.solid(22, 16, 5, 2); k.solid(11, 38, 7, 2);
    for (const [x, y, kind] of [[3, 3, 'pine'], [58, 3, 'pine'], [3, 42, 'cherry'], [58, 43, 'maple'], [27, 3, 'cherry'], [45, 13, 'oak'], [20, 42, 'oak'], [58, 20, 'cherry'], [3, 24, 'maple'], [44, 42, 'cherry']]) k.tree(x, y, 1.15, kind);
    for (let x = 2; x < W - 1; x += 5) { k.tree(x, R.y + 5, 1, 'ginkgo'); }
    for (const x of [10, 40]) { const f = { type: 'streetLamp', x: x + 0.5, y: R.y - 0.6 }; k.K.add(f); OUT.lamps.push(f); }
    // 반려동물: 마당 안에서만
    S.pets = [
      { kind: 'dog', color: '#d9a066' }, { kind: 'dog', color: '#f4ead8' },
      { kind: 'cat', color: '#f0a050' }, { kind: 'cat', color: '#8a8f96' },
      { kind: 'duck', color: '#ffffff', near: [PD.cx, PD.cy] }, { kind: 'duck', color: '#3f8a45', near: [PD.cx, PD.cy] },
      { kind: 'hen', chicks: 4 },
    ];
    S.traffic = { roads: k.roads, cross: k.G.cross };
    S.door = { lv: OUT.idx, x: 30.5, y: ROADY - 0.6, face: '-y' };
    S.home = { x0: 0, y0: 0, x1: W, y1: H };
    const s2 = finish(S, OUT, k.used);
    const area = [];
    for (let j = 2; j < ROADY - 2; j++) for (let i = 2; i < W - 2; i++) if (OUT.grid[j * W + i] && !(i >= TX && i < TX + FW && j >= TY && j < TY + FH)) area.push([i + 0.5, j + 0.5]);
    s2.petArea = area;
    return s2;
  }

  function finish(S, OUT, used) {
    const { P } = AIO.iso;
    for (const L of S.levels) {
      L.grid = new Uint8Array(L.W * L.H).fill(1);
      for (const k of L.blocked) { const [i, j] = k.split(',').map(Number); if (i >= 0 && j >= 0 && i < L.W && j < L.H) L.grid[j * L.W + i] = 0; }
      const z = L.zBase || 0;
      const b = [P(0, 0, 120 + z), P(L.W, 0, 120 + z), P(0, L.H, z), P(L.W, L.H, z - 20), P(L.W, 0, z), P(0, L.H, z - 20)];
      L.bounds = { minX: Math.min(...b.map((p) => p[0])) - 30, maxX: Math.max(...b.map((p) => p[0])) + 30, minY: Math.min(...b.map((p) => p[1])) - 30, maxY: Math.max(...b.map((p) => p[1])) + 20 };
    }
    const W = OUT.W, H = OUT.H;
    const C = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) { const u = used[i]; if (u === 3 || u === 4) OUT.grid[i] = 0; C[i] = u === 1 ? 1 : 2.5; }
    for (const c of OUT.ground.cross) for (let x = c.x; x < c.x + c.w; x++) for (let y = c.y; y < c.y + c.d; y++) { OUT.grid[y * W + x] = 1; C[y * W + x] = 1; }
    OUT.cost = C;
    OUT.used = used;
    OUT.cwAt = new Int16Array(W * H).fill(-1);
    for (const c of OUT.ground.cross) for (let x = c.x; x < c.x + c.w; x++) for (let y = c.y; y < c.y + c.d; y++) OUT.cwAt[y * W + x] = c.id;
    const tower = S.buildings[0];
    const top = (tower.levels.length - 1 - (tower.base || 0)) * FLOOR_PX + 100;
    const pts = [P(0, 0, 0), P(W, 0, 0), P(0, H, 0), P(W, H, 0), P(tower.x, tower.y, top)];
    S.bounds = { minX: Math.min(...pts.map((p) => p[0])) - 30, maxX: Math.max(...pts.map((p) => p[0])) + 30, minY: Math.min(...pts.map((p) => p[1])) - 60, maxY: Math.max(...pts.map((p) => p[1])) + 30 };
    S.homeBounds = S.bounds;
    for (const b of S.buildings) {
      const q = [P(b.x, b.y, 110), P(b.x + b.W, b.y, 110), P(b.x, b.y + b.H, 0), P(b.x + b.W, b.y + b.H, -10)];
      b.bounds = { minX: Math.min(...q.map((p) => p[0])) - 20, maxX: Math.max(...q.map((p) => p[0])) + 20, minY: Math.min(...q.map((p) => p[1])) - 30, maxY: Math.max(...q.map((p) => p[1])) + 20 };
    }
    return S;
  }

  AIO.mini = { build, roomCount, building, FW, FH };
})();
