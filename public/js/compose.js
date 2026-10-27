// 조합 맵 엔진 (v3): 건물(실내)과 부지(실외)를 따로 골라 한 맵으로 합친다.
//   AIO.compose.indoor({ id, icon, name, desc, build(S, o, ctx) → building })   실내(건물) 등록
//   AIO.compose.outdoor({ id, icon, name, desc, size(B) → {W,H}, lot(S, OUT, B, k) })  실외(부지) 등록
//   AIO.compose.build(spec, inId, outId) → scene
// 건물은 연구동·꼬마빌딩과 같은 'tower' 엔진(층 높이 렌더링 · 엘리베이터 · 외관↔내부 전환)으로 그려진다.
// 플러그인: AIO.props[type] = { draw(ctx, f, t, I, world), depth?(f), slice?, dynamic? } · AIO.floorStyles[style](g,x,y,w,d,base,r,seed)
//           AIO.decals[type](g, d, r) — world.js / art2 / art5 가 여기서 찾아 그린다.
(function () {
  const LY = AIO.layout;
  const I = () => AIO.interiors;
  const FLOOR_PX = 58;
  const COLORS = ['#e5534b', '#4e7cf6', '#3fb27f', '#e9a23b', '#a67be0', '#e2667f', '#1f9fb4'];
  const INDOORS = [], OUTDOORS = [];
  AIO.props = AIO.props || {};
  AIO.floorStyles = AIO.floorStyles || {};
  AIO.decals = AIO.decals || {};

  /** 일 많은 순으로 정렬된 팀 중 앞쪽 절반만 팀장실 (나머지 팀장은 팀 테이블 맨 앞자리) */
  const roomCount = (active) => (active ? Math.max(1, Math.round(active * 0.5)) : 0);

  // ================================================================ 건물 키트
  /**
   * T = tower(S, { W, H, name, facade, doorX })
   *   T.level(name, floor, color, outer?, { basement }) → { L, K }   아래층부터 순서대로 (지하는 깊은 곳부터)
   *   T.shell(L, K, roomA?)        엘리베이터 2대 · 남녀 화장실 · 계단실 · 복도 (오른쪽 뒤, 폭 15) — roomA = 왼쪽 뒤 방 {name,color,glass}
   *   T.entrance(L, K)             1층 정문 · 게이트 · 출입구 표지 (doorX 기준)
   *   T.visitorSofa(L, K, x, y)    방문객 대기석 (협력사 앱 세션이 앉는다)
   *   T.securityRoom(L, K)         roomA 자리에 보안실 (CCTV + 보안요원)
   *   T.workFloors(o, opt)         업무층들 (활발한 팀이 위층 · 인턴 핫데스크는 맨 아래)
   *   T.roof(opt)                  옥상 (엘리베이터 탑 + 정원/카페)
   *   T.done() → building
   *   T.npc / T.rest / T.sign / T.meeting  편의 함수
   */
  function tower(S, opt) {
    const W = opt.W, H = opt.H, CX = W - 15;
    const doorX = opt.doorX ?? Math.floor(W / 2);
    const levels = [];
    let n = 0, nb = 0;
    const T = { S, W, H, CX, doorX, levels };
    T.level = (name, floor, color, outer = 'premium', o = {}) => {
      const L = I().level(S, name, { floor, outer, short: o.short || name.split(' ')[0], bld: 'tower' });
      L.W = W; L.H = H; L.floorColor = color;
      if (o.basement) { L.basement = true; nb++; }
      levels.push(L);
      return { L, K: LY.kit(S, L) };
    };
    T.nextFloor = () => ++n;                     // 지상층 번호 (1F, 2F …)
    /** 이미 만든 층(다른 평면 함수가 지은 층)을 이 건물에 넣기 */
    T.adopt = (L) => { L.bld = 'tower'; L.decals = L.decals || []; L.northWindows = L.northWindows || []; levels.push(L); return { L, K: LY.kit(S, L) }; };
    T.npc = (L, role, home, x = {}) => I().npc(S, L, { id: `N:${opt.id || 'b'}:${L.idx}:${role}:${S.npcs.length}`, role, home: { pose: 'stand', ...home }, anim: x.anim || 'idle', hat: x.hat ?? null, accent: x.accent || '#2b3a67', tie: x.tie, vest: x.vest, walkCarry: x.carry, say: x.say, patrol: x.patrol });
    T.rest = (L, s, tag) => S.rest.push({ lv: L.idx, tag, carry: 'mug', ...s });
    T.meeting = (L, s) => S.meeting.push({ lv: L.idx, pose: 'sit', ...s });
    T.sign = (L, x, y, text, color = '#6b5b4a', room = true) => L.signs.push({ x, y, text, color, room });

    T.shell = (L, K, roomA) => {
      L.patches.push({ x: CX, y: 0, w: 6, d: 5, style: 'marble', color: '#efece6' });
      L.elev = [];
      for (const [car, cx] of [[0, CX], [1, CX + 3]]) {
        K.add({ type: 'elevCab', x: cx, y: 0, w: 2, d: 2, car });
        K.add({ type: 'elevDoor', x: cx, y: 0, w: 2, d: 2, car, label: L.short });
        K.blockRect(cx, 0, 2, 2);
        L.elev.push({ car, hall: { x: cx + 1, y: 2.75 }, cabin: { x: cx + 1, y: 1.0 } });
      }
      K.add({ type: 'v4_elevPillar', x: CX + 2, y: 0, w: 1, d: 2 }); K.add({ type: 'elevPanel', x: CX + 2.5, y: 2.32, label: L.short }); K.blockRect(CX + 2, 0, 1, 2);
      K.add({ type: 'plant', x: CX + 5.5, y: 0.6, size: 0.7, seed: L.idx }); K.block(CX + 5, 0);
      K.wallY(0, 5, CX, { h: 46, color: '#ece7df' }); K.wallY(0, 5, CX + 6, { h: 46, color: '#ece7df' });
      for (const [rx, kind] of [[CX + 6, 'm'], [CX + 9, 'f']]) {
        L.patches.push({ x: rx, y: 0, w: 3, d: 5, style: 'tile', color: kind === 'm' ? '#e4edf5' : '#f8e9ee' });
        I().restroomPieces(K, rx, kind);
        K.wallX(rx, rx + 3, 5, { h: 44, doors: [rx + 1], color: kind === 'm' ? '#dfe8f0' : '#f3e1e7' });
        T.sign(L, rx + 0.2, 4.7, kind === 'm' ? '🚹 남' : '🚺 여', kind === 'm' ? '#4e7cf6' : '#e2667f');
      }
      K.wallY(0, 5, CX + 9, { h: 44, color: '#ece7df' }); K.wallY(0, 5, CX + 12, { h: 44, color: '#ece7df' });
      L.patches.push({ x: CX + 12, y: 0, w: 3, d: 5, style: 'tile', color: '#d9d3c9' });
      K.add({ type: 'stairs', x: CX + 12.2, y: 0.2, w: 2.6, d: 3.8 }); K.blockRect(CX + 12, 0, 3, 4);
      K.wallX(CX + 12, CX + 15, 5, { glass: true, h: 60, doors: [CX + 13], color: '#d9dde1' });
      T.sign(L, CX + 12.2, 4.7, '🪜 계단', '#7a5540');
      L.patches.push({ x: 0, y: 5, w: W, d: 2, style: 'tile', color: '#ddd6ca' });
      if (roomA) { K.wallX(0, CX, 5, { glass: !!roomA.glass, h: roomA.glass ? 60 : 46, doors: [CX - 1], color: '#e7e1d8' }); T.sign(L, 0.3, 4.7, roomA.name, roomA.color); }
      L.windows = []; for (let wy = 8.4; wy + 2 < H - 1; wy += 3.6) L.windows.push(wy);
      L.northWindows = [Math.max(1, CX / 2 - 1)];
      L.wallY = { clock: CX + 2.05, clockZ: 100 };
      K.add({ type: 'exitSign', x: CX + 12.4, y: 0 });
      if (!/로비/.test(L.name)) K.add({ type: 'v4_floorSign', x: CX + 1, y: 7, w: 6, text: L.name, lvKey: L.name });
    };

    T.entrance = (L, K, o = {}) => {
      const dx = doorX;
      K.add({ type: 'entrance', x: dx - 1.5, y: H - 0.08, w: 3, bld: 'tower' });
      L.decals.push({ type: 'floor', x: dx - 1.7, y: H - 1.5, w: 3.4, d: 1.4, color: '#8a7d6b' });
      if (o.turnstiles !== false) {
        K.add({ type: 'turnstile', x: dx - 2.4, y: H - 3.7 }); K.block(dx - 3, H - 4);
        K.add({ type: 'turnstile', x: dx - 0.1, y: H - 3.7 });
        K.add({ type: 'turnstile', x: dx + 2.1, y: H - 3.7 }); K.block(dx + 2, H - 4);
      }
      T.sign(L, dx - 1.7, H - 0.3, '🚪 출입구', '#2b2622');
    };
    T.visitorSofa = (L, K, x, y) => {
      K.add({ type: 'sofa', x, y, w: 3 }); K.blockRect(Math.floor(x), Math.floor(y), 4, 1);
      S.visitorSeats.push(...[0.6, 1.6, 2.4].map((d) => ({ lv: L.idx, x: x + d, y: y + 0.62, face: '+y', pose: 'sofa', approach: [Math.floor(x + d), Math.floor(y) + 1] })));
    };
    T.securityRoom = (L, K, name = '🛡️ 보안실') => {
      L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'tile', color: '#d8dde2' });
      K.add({ type: 'cctvWall', x: 0.4, y: 0.25, w: Math.min(5, CX - 1.4) }); K.blockRect(0, 0, Math.min(6, CX - 1), 1);
      const g = K.deskSeat(1, -0.6, 0, 'B', null);
      T.npc(L, '보안요원', { x: g.x, y: g.y, face: '-y', pose: 'sit' }, { anim: 'type', hat: 'police' });
      return name;
    };

    /** 업무층: 팀장실(일 많은 팀장만) · 팀 테이블 · 세션 데스크 · 협력사석 · 인턴 핫데스크(맨 아래층) */
    T.workFloors = (o, wo = {}) => {
      const ROW = W - 2;
      const rowsPerFloor = H >= 24 ? 2 : 1;
      const rowY = rowsPerFloor === 2 ? [7, 14] : [7];
      const teamBlock = (t) => {
        const keys = t.room ? t.members.map((m) => `M:${t.lead}:${m}`) : [t.lead, ...t.members.map((m) => `M:${t.lead}:${m}`)];
        const nD = Math.max(4, Math.ceil(keys.length / 4) * 4);
        return { w: nD + 2, label: `🧶 ${t.title}`, make: (L, K) => { const c = K.cluster(keys, 'team', null, { noRug: true }); return { w: c.w, d: c.d, place(ox, oy) {
          L.rugs.push({ x: ox + 0.4, y: oy + 0.4, w: c.w - 0.8, d: 5.2, color: AIO.iso.rgba(t.color, 0.16), border: AIO.iso.rgba(t.color, 0.5) });
          c.place(ox, oy);
          if (!t.room) { const st = S.seats.get(t.lead); if (st) { st.lead = true; st.table = true; S.reportSpots.set(t.lead, [{ lv: L.idx, x: st.x + 1.1, y: st.y + (st.face === '+y' ? -0.2 : 0.2), face: '-x' }, { lv: L.idx, x: st.x - 1.1, y: st.y, face: '+x' }]); } }
          L.signs.push({ x: ox + 0.5, y: oy + 5.6, text: `🧶 ${t.title} 팀${t.room ? '' : ' (팀장 자리 포함)'}`, color: t.color, team: true, key: t.lead });
        } }; } };
      };
      const roomed = o.pods.filter((t) => t.room), tabled = o.pods.filter((t) => !t.room);
      const floors = [];
      const newFloor = (room) => { const f = { room, rows: rowY.map(() => ({ items: [], x: 0 })) }; floors.push(f); return f; };
      const fitIn = (f, b) => { const r = f.rows.find((rw) => rw.x + b.w <= ROW); if (!r) return false; r.items.push(b); r.x += b.w; return true; };
      const fit = (b) => { const f = floors[floors.length - 1]; if (!f || !fitIn(f, b)) fitIn(newFloor(null), b); };
      for (const t of roomed) fitIn(newFloor(t), teamBlock(t));
      for (const t of tabled) fit(teamBlock(t));
      const singles = o.singles.slice();
      while (singles.length % 4) singles.push(null);
      for (let i = 0; i < singles.length; i += 4) { const keys = singles.slice(i, i + 4); fit({ w: 6, label: '💻 세션 데스크', make: (L, K) => K.cluster(keys, 'single', i === 0 ? '💻 세션 데스크' : null, { noDecor: true }) }); }
      for (let i = 0; i < o.partners.length; i += 4) { const keys = o.partners.slice(i, i + 4); fit({ w: 6, label: '🤝 협력사석', make: (L, K) => K.cluster(keys, 'partner', i === 0 ? '🤝 협력사석' : null, { noDecor: true }) }); }
      const hotN = Math.max(8, Math.ceil(o.hot / 4) * 4);
      fit({ w: hotN + 2, label: '🎒 인턴 핫데스크', make: (L, K) => K.cluster(new Array(hotN).fill(undefined), 'hot', '🎒 인턴 핫데스크') });
      if (!floors.length) newFloor(null);
      floors.reverse();                                   // 활발한 팀이 위층, 인턴 핫데스크는 맨 아래층
      const looks = wo.looks || [['wood', '#eadcc3'], ['carpet', '#e3e6ea']];
      floors.forEach((f, fi) => {
        const num = T.nextFloor();
        const [fl, fc] = looks[fi % looks.length];
        const { L, K } = T.level(wo.name ? wo.name(num) : `${num}F 업무층`, fl, fc);
        const items = f.rows.flatMap((r) => r.items);
        L.desc = [f.room ? `👔 ${f.room.title} 팀장실` : '🗣️ 회의실', ...new Set(items.map((b) => b.label))].join(' · ');
        const t = f.room;
        T.shell(L, K, t ? { name: `👔 ${t.title}`, color: t.color, glass: true } : { name: '🗣️ 회의실', color: '#6b5b4a', glass: true });
        if (t) {
          L.signs[L.signs.length - 1].team = true; L.signs[L.signs.length - 1].key = t.lead;
          L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'carpet', color: AIO.iso.shade(t.color, 0.8) });
          K.add({ type: 'bookshelf', x: 0.4, y: 0.3, w: 2.2, seed: L.idx }); K.blockRect(0, 0, 3, 1);
          K.add({ type: 'execDesk', x: 2.3, y: 2, w: 2.6, d: 1, seatKey: t.lead, label: '👔 팀장' }); K.blockRect(2, 2, 3, 1);
          const seat = { key: t.lead, lv: L.idx, x: 3.6, y: 1.45, face: '+y', pose: 'sit', lead: true, room: true };
          K.add({ type: 'chair', x: seat.x, y: seat.y, face: '+y', part: 'seat', premium: true }); K.add({ type: 'chair', x: seat.x, y: seat.y, face: '+y', part: 'back', premium: true });
          S.seats.set(t.lead, seat);
          S.reportSpots.set(t.lead, [{ lv: L.idx, x: 3.6, y: 3.4, face: '-y' }, { lv: L.idx, x: 5.3, y: 3.4, face: '-x' }, { lv: L.idx, x: 1.8, y: 3.4, face: '+x' }]);
          K.add({ type: 'plant', x: CX - 0.6, y: 0.6, size: 0.9, seed: L.idx }); K.block(CX - 1, 0);
          K.add({ type: 'wallAC', x: 3.2, y: 0 });
        } else {
          L.patches.push({ x: 0, y: 0, w: CX, d: 5, style: 'carpet', color: '#c9d2dc' });
          K.add({ type: 'tv', x: 1.8, y: 0.3, w: 3.2 }); K.blockRect(1, 0, 5, 1);
          for (let i = 0; i < 4; i++) K.add({ type: 'tableSeg', x: 1.5 + i, y: 2, w: 1, d: 1.1 });
          K.blockRect(1, 2, 5, 2);
          for (let i = 0; i < 3; i++) for (const [y, face] of [[1.4, '+y'], [3.65, '-y']]) { const x = 2.1 + i * 1.2; K.add({ type: 'chair', x, y, face, part: 'seat', premium: true }); K.add({ type: 'chair', x, y, face, part: 'back', premium: true }); T.meeting(L, { x, y, face }); }
        }
        f.rows.forEach((r, ri) => {
          const used = r.items.reduce((s, b) => s + b.w, 0);
          let ox = 1 + Math.floor((ROW - used) / 2);
          for (const b of r.items) { b.make(L, K).place(ox, rowY[ri]); ox += b.w; }
        });
        // 앞쪽 띠: 에어컨 · 복합기 · 정수기 · 책장 · 소파(휴식) · 화분 · 소화기
        const fy = H - 2;
        K.add({ type: 'airCon', x: 0.5, y: fy + 0.2 }); K.block(0, fy);
        K.add({ type: 'plant', x: 1.8, y: fy + 1.2, size: 1, seed: L.idx * 3 }); K.block(1, fy + 1);
        K.add({ type: 'printer', x: 3.6, y: fy + 0.3 }); K.blockRect(3, fy, 2, 1);
        K.add({ type: 'waterCooler', x: 5.8, y: fy + 0.3 }); K.block(5, fy);
        if (W >= 20) { K.add({ type: 'bookshelf', x: 7.4, y: fy + 0.1, w: 2.4, seed: L.idx }); K.blockRect(7, fy, 3, 1); }
        const sx = W - 9;
        K.add({ type: 'sofa', x: sx, y: fy + 0.2, w: 3 }); K.blockRect(sx, fy, 3, 1);
        [0.6, 1.6, 2.4].forEach((d) => T.rest(L, { x: sx + d, y: fy + 0.82, face: '+y', pose: 'sofa', approach: [Math.floor(sx + d), fy + 1] }, `${num}F 라운지`));
        K.add({ type: 'plant', x: W - 1.2, y: fy + 0.6, size: 1.2, seed: L.idx * 5 }); K.block(W - 2, fy);
        K.add({ type: 'extinguisher', x: W - 0.5, y: 7.4 }); K.block(W - 1, 7);
        if (wo.deco) wo.deco(L, K, num, f);
      });
    };

    /** 옥상: 엘리베이터 탑 + (garden: 정원 · 벤치 · 파라솔 테이블 / utility: 실외기 · 물탱크만) */
    T.roof = (ro = {}) => {
      const { L, K } = T.level(ro.name || 'R 옥상', 'deck', ro.color || '#c9a57a', 'roof', { short: 'R' });
      L.desc = ro.desc || '옥상정원 · 벤치 · 파라솔';
      const elev = levels.some((x) => x.elev) && ro.elevator !== false;
      if (elev) {
        L.patches.push({ x: CX, y: 0, w: 6, d: 3, style: 'marble', color: '#efece6' });
        L.elev = [];
        for (const [car, cx] of [[0, CX], [1, CX + 3]]) { K.add({ type: 'elevCab', x: cx, y: 0, w: 2, d: 2, car }); K.add({ type: 'elevDoor', x: cx, y: 0, w: 2, d: 2, car, label: 'R' }); K.blockRect(cx, 0, 2, 2); L.elev.push({ car, hall: { x: cx + 1, y: 2.75 }, cabin: { x: cx + 1, y: 1.0 } }); }
        K.add({ type: 'elevPanel', x: CX + 2.5, y: 0.35, label: 'R' }); K.block(CX + 2, 0);
        K.add({ type: 'hutShell', x: CX, y: 0, w: 6, d: 3 });
        K.wallY(0, 3, CX, { h: 82, color: '#e6e0d6' }); K.wallY(0, 3, CX + 6, { h: 82, color: '#e6e0d6' });
        K.wallX(CX, CX + 6, 3, { h: 82, color: '#e6e0d6', doors: [CX + 1, CX + 4] });
      }
      const kind = ro.kind || (elev ? 'garden' : 'utility');
      for (let x = CX + 7.5; x + 1 < W; x += 2.2) { K.add({ type: 'airCon', x, y: 0.4 }); K.block(Math.floor(x), 0); }
      if (kind === 'garden' && elev) {
        L.patches.push({ x: 0, y: 0, w: Math.min(7, CX), d: H, style: 'grass', color: '#a6d28b' });
        for (let x = 0.4; x + 2 < Math.min(7, CX); x += 2.4) { K.add({ type: 'planter', x, y: 0.4, w: 2.2, seed: x * 3 + L.idx }); K.blockRect(Math.floor(x), 0, 3, 1); }
        for (const [x, y] of [[1, 6], [4.5, 9.5], [1, H - 2.5]]) if (x < CX - 1) { K.add({ type: 'roofTree', x: x + 0.5, y: y + 0.5, size: 1, seed: x * 7 + y, blossom: y > 8 }); K.block(Math.floor(x), Math.floor(y)); }
        const tables = [[Math.min(CX + 2, W - 6), 7], [Math.max(8, W - 6), 10.5], [Math.min(CX + 2, W - 6), H - 3]];
        tables.forEach(([x, y], i) => { if (y > H - 2) return; K.add({ type: 'parasolTable', x, y, color: COLORS[i] }); K.block(Math.floor(x), Math.floor(y)); for (const [dx, face] of [[-1, '+x'], [1, '-x']]) { K.add({ type: 'stool', x: x + dx, y, color: '#f3d48c' }); T.rest(L, { x: x + dx, y, face, pose: 'sit' }, '옥상정원'); } });
        K.add({ type: 'bench', x: 1, y: H - 4.6, w: 2.4 }); K.blockRect(1, H - 5, 3, 1);
        for (let q = 0; q < 2; q++) T.rest(L, { x: 1.7 + q * 1.1, y: H - 4.35, face: '+y', pose: 'sit', approach: [1 + q, H - 4] }, '옥상 벤치');
        L.signs.push({ x: 0.4, y: H - 0.4, text: '🌿 옥상정원', color: '#3f8a45', room: true });
      } else {
        // 설비 옥상: 회색 방수 바닥 · 채광창 줄 · 실외기 · 물탱크
        L.patches.push({ x: 0, y: 0, w: W, d: H, style: 'concrete', color: '#c9c5bd' });
        for (let x = 3; x + 3 < W - 2; x += 7) for (let y = 5; y + 2 < H - 2; y += 6) {
          L.decals.push({ type: 'floor', x, y, w: 3, d: 2, color: '#9fb6c4' }, { type: 'floor', x: x + 0.15, y: y + 0.15, w: 2.7, d: 1.7, color: 'rgba(205,230,245,0.9)' });
        }
        K.add({ type: 'waterTank', x: 2, y: 3.6 }); K.blockRect(1, 2, 2, 3);
        if (W > 12) { K.add({ type: 'waterTank', x: 5, y: 3.6 }); K.blockRect(4, 2, 2, 3); }
        for (let y = 6; y + 1 < H - 1; y += 4) { K.add({ type: 'airCon', x: W - 1.4, y }); K.block(W - 2, Math.floor(y)); }
      }
      L.windows = []; L.wallY = null;
      return { L, K };
    };

    T.done = (extra = {}) => {
      levels.forEach((L, i) => { L.floorIdx = i; L.zBase = (i - nb) * FLOOR_PX; L.decals = L.decals || []; L.northWindows = L.northWindows || []; });
      return { levels, W, H, base: nb, doorX, name: opt.name, facade: opt.facade || null, ...extra };
    };
    return T;
  }

  // ================================================================ 부지 키트
  function lotKit(S, OUT, W, H) {
    OUT.W = W; OUT.H = H;
    const K = LY.kit(S, OUT);
    const G = OUT.ground = { walk: [], plaza: [], road: [], inter: [], cross: [], decals: [], lots: [], curves: [], rounds: [], fell: [], areas: [] };
    const used = new Uint8Array(W * H);          // 0 풀밭 · 1 포장(싸게 걷기) · 2 막힘 · 3 도로 · 4 물
    const mark = (x, y, w, d, v) => { for (let i = Math.max(0, Math.floor(x)); i < Math.min(W, Math.ceil(x + w)); i++) for (let j = Math.max(0, Math.floor(y)); j < Math.min(H, Math.ceil(y + d)); j++) if (v === 3 || used[j * W + i] !== 3) used[j * W + i] = v; };
    const free = (x, y, w = 1, d = 1) => { for (let i = Math.floor(x); i < Math.ceil(x + w); i++) for (let j = Math.floor(y); j < Math.ceil(y + d); j++) if (i < 0 || j < 0 || i >= W || j >= H || used[j * W + i]) return false; return true; };
    const solid = (x, y, w, d) => { K.blockRect(x, y, w, d); mark(x, y, w, d, 2); };
    const add = (f, bx, by, bw = 1, bd = 1) => { K.add(f); if (bx != null) solid(bx, by, bw, bd); return f; };
    const walk = (x, y, w, d) => { G.walk.push({ x, y, w, d }); mark(x, y, w, d, 1); };
    const plaza = (x, y, w, d, color) => { G.plaza.push({ x, y, w, d, color }); mark(x, y, w, d, 1); };
    /** 바닥 재질 영역 (style: art2 재질 'deck' 'grass' 'tile' 'concrete' … 또는 floorStyles 플러그인) — paved=1 이면 싸게 걷는 길 */
    const area = (x, y, w, d, style, color, paved = 0) => { G.areas.push({ x, y, w, d, style, color }); if (paved) mark(x, y, w, d, 1); };
    /** 물(바다 · 호수 · 강): 못 걷는다. decal 로 그림 */
    const water = (x, y, w, d, decal) => { if (decal) G.decals.push(decal); for (let i = Math.max(0, Math.floor(x)); i < Math.min(W, Math.ceil(x + w)); i++) for (let j = Math.max(0, Math.floor(y)); j < Math.min(H, Math.ceil(y + d)); j++) { used[j * W + i] = 4; K.block(i, j); } };
    const pond = (cx, cy, rx, ry) => { G.decals.push({ type: 'pond', cx, cy, rx, ry }); for (let i = Math.floor(cx - rx); i <= cx + rx; i++) for (let j = Math.floor(cy - ry); j <= cy + ry; j++) if (i >= 0 && j >= 0 && i < W && j < H && ((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 < 1) { used[j * W + i] = 4; K.block(i, j); } };
    const roads = [];
    const road = (y, name, x0 = 0, x1 = W) => { const r = { axis: 'x', x: x0, y, w: x1 - x0, d: 4, name }; roads.push(r); G.road.push(r); mark(x0, y, x1 - x0, 4, 3); walk(x0, y - 1, x1 - x0, 1); walk(x0, y + 4, x1 - x0, 1); return r; };
    const cross = (r, at0) => { const at = Math.floor(at0); const c = { axis: 'x', x: at, y: r.y, w: 3, d: 4, light: true, id: G.cross.length, road: roads.indexOf(r), phase: G.cross.length * 7 }; G.cross.push(c); mark(c.x, c.y, 3, 4, 1); add({ type: 'trafficLight', x: c.x - 0.6, y: r.y - 1.4, cw: c.id, side: -1 }, c.x - 1, r.y - 2); add({ type: 'trafficLight', x: c.x + 3.6, y: r.y + 5.4, cw: c.id, side: 1 }, c.x + 3, r.y + 5); return c; };
    const tree = (x, y, s, kind) => { if (!free(x, y)) return false; add({ type: 'tree', x: x + 0.5, y: y + 0.5, size: s, seed: x * 31 + y, kind }, x, y); return true; };
    const rest = (s, tag) => S.rest.push({ lv: OUT.idx, tag, carry: 'mug', ...s });
    const npc = (role, home, x = {}) => S.npcs.push({ lv: OUT.idx, id: `N:out:${role}:${S.npcs.length}`, role, home: { lv: OUT.idx, pose: 'stand', ...home }, anim: x.anim || 'idle', hat: x.hat ?? null, accent: x.accent || '#2b3a67', tie: x.tie, vest: x.vest, walkCarry: x.carry, say: x.say, patrol: x.patrol ? x.patrol.map((p) => ({ lv: OUT.idx, pose: 'stand', ...p })) : null });
    const sign = (x, y, text, color = '#3f8a45') => OUT.signs.push({ x, y, text, color, room: true });
    /** 곡선 산책로 (점들을 지나는 부드러운 길) */
    const curve = (pts, w = 1.4, o = {}) => {
      G.curves.push({ pts, w, ...o });
      const samp = []; let prev = pts[0];
      for (let i = 1; i < pts.length - 1; i++) { const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; for (let t = 0; t <= 1; t += 0.04) samp.push([(1 - t) * (1 - t) * prev[0] + 2 * (1 - t) * t * pts[i][0] + t * t * m[0], (1 - t) * (1 - t) * prev[1] + 2 * (1 - t) * t * pts[i][1] + t * t * m[1]]); prev = m; }
      const last = pts[pts.length - 1]; for (let t = 0; t <= 1; t += 0.05) samp.push([prev[0] + (last[0] - prev[0]) * t, prev[1] + (last[1] - prev[1]) * t]);
      for (const [px, py] of samp) for (let i = Math.floor(px - w / 2); i <= px + w / 2; i++) for (let j = Math.floor(py - w / 2); j <= py + w / 2; j++) if (i >= 0 && j >= 0 && i < W && j < H && !used[j * W + i] && Math.hypot(i + 0.5 - px, j + 0.5 - py) < w / 2 + 0.35) used[j * W + i] = 1;
    };
    /** region 안에서 w×d 빈 자리를 찾아 fn(x, y) 실행 (앞에서부터 훑음) — 못 찾으면 false */
    const placeIn = (rx, ry, rw, rd, w, d, fn, step = 1) => {
      // 1차: 둘레 한 칸까지 비어 있는 자리 (소품끼리 붙지 않게) · 2차: 딱 맞는 자리
      for (const margin of [1, 0]) for (let y = ry; y + d <= ry + rd; y += step) for (let x = rx; x + w <= rx + rw; x += step) {
        if (margin ? free(Math.max(0, x - 1), Math.max(0, y - 1), w + 2, d + 2) : free(x, y, w, d)) { fn(x, y); return true; }
      }
      return false;
    };
    const k = { K, G, W, H, used, mark, free, solid, add, walk, plaza, area, water, pond, roads, road, cross, tree, rest, npc, sign, curve, placeIn };
    /** 건물 앉히기: 발자국을 막고, 정문 ↔ 로비를 잇고, 정문 앞에 작은 포장 */
    k.place = (B, TX, TY) => {
      for (const L of B.levels) { L.ox = TX; L.oy = TY; }
      solid(TX, TY, B.W, B.H);
      const front = TY + B.H, lobby = B.levels[B.base || 0];
      S.doors.push({ bld: 'tower', a: { lv: OUT.idx, x: TX + B.doorX, y: front + 0.55 }, b: { lv: lobby.idx, x: B.doorX, y: B.H - 0.6 } });
      if (B.cafeDoor != null) S.doors.push({ bld: 'cafe', a: { lv: OUT.idx, x: TX + B.cafeDoor, y: front + 0.55 }, b: { lv: lobby.idx, x: B.cafeDoor, y: B.H - 0.6 } });
      const b = { id: 'tower', name: B.name, type: 'tower', core: true, x: TX, y: TY, W: B.W, H: B.H, levels: B.levels.map((L) => L.idx), door: { x: TX + B.doorX, y: front }, base: B.base || 0, lobby: lobby.idx, facade: B.facade };
      if (B.cafeDoor != null) { b.cafeDoor = { x: TX + B.cafeDoor, y: front }; b.cafe = { x0: TX + (B.cafeX0 ?? B.cafeDoor - 10) }; }
      S.buildings.push(b);
      S.occ.push({ id: 'tower', kind: 'tower', name: B.name, x: TX, y: TY, W: B.W, H: B.H, bld: b });
      S.FLOOR_PX = FLOOR_PX;
      S.floorNames = B.levels.map((L) => L.name);
      if (!k.free(TX + B.doorX - 2, front, 4, 2)) {} else plaza(TX + B.doorX - 2, front, 4, 2, '#e6e0d4');
      k.B = b; k.TX = TX; k.TY = TY; k.front = front; k.right = TX + B.W;
      return b;
    };
    return k;
  }

  function finish(S, OUT, used) {
    const { P } = AIO.iso;
    for (const L of S.levels) {
      L.grid = new Uint8Array(L.W * L.H).fill(1);
      for (const kk of L.blocked) { const [i, j] = kk.split(',').map(Number); if (i >= 0 && j >= 0 && i < L.W && j < L.H) L.grid[j * L.W + i] = 0; }
      const z = L.zBase || 0;
      const b = [P(0, 0, 120 + z), P(L.W, 0, 120 + z), P(0, L.H, z), P(L.W, L.H, z - 20), P(L.W, 0, z), P(0, L.H, z - 20)];
      L.bounds = { minX: Math.min(...b.map((p) => p[0])) - 30, maxX: Math.max(...b.map((p) => p[0])) + 30, minY: Math.min(...b.map((p) => p[1])) - 30, maxY: Math.max(...b.map((p) => p[1])) + 20 };
    }
    const W = OUT.W, H = OUT.H;
    const C = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) { const u = used[i]; if (u === 3 || u === 4) OUT.grid[i] = 0; C[i] = u === 1 ? 1 : 2.5; }
    for (const c of OUT.ground.cross) for (let x = c.x; x < c.x + c.w; x++) for (let y = c.y; y < c.y + c.d; y++) { OUT.grid[y * W + x] = 1; C[y * W + x] = 1; }
    for (const br of OUT.bridges || []) for (let x = br.x; x < br.x + br.w; x++) for (let y = br.y; y < br.y + br.d; y++) if (x >= 0 && y >= 0 && x < W && y < H) { OUT.grid[y * W + x] = 1; C[y * W + x] = 1; }
    OUT.cost = C;
    OUT.used = used;
    OUT.cwAt = new Int16Array(W * H).fill(-1);
    for (const c of OUT.ground.cross) for (let x = c.x; x < c.x + c.w; x++) for (let y = c.y; y < c.y + c.d; y++) OUT.cwAt[y * W + x] = c.id;
    const tower = S.buildings[0];
    const top = (tower.levels.length - 1 - (tower.base || 0)) * FLOOR_PX + 100;
    const pts = [P(0, 0, 0), P(W, 0, 0), P(0, H, 0), P(W, H, 0), P(tower.x, tower.y, top)];
    S.bounds = { minX: Math.min(...pts.map((p) => p[0])) - 30, maxX: Math.max(...pts.map((p) => p[0])) + 30, minY: Math.min(...pts.map((p) => p[1])) - 60, maxY: Math.max(...pts.map((p) => p[1])) + 30 };
    const h = S.home;
    if (h) { const hp = [P(h.x0, h.y0, 0), P(h.x1, h.y0, 0), P(h.x0, h.y1, 0), P(h.x1, h.y1, 0), P(tower.x, tower.y, top)]; S.homeBounds = { minX: Math.min(...hp.map((p) => p[0])) - 20, maxX: Math.max(...hp.map((p) => p[0])) + 20, minY: Math.min(...hp.map((p) => p[1])) - 30, maxY: Math.max(...hp.map((p) => p[1])) + 20 }; }
    else S.homeBounds = S.bounds;
    for (const b of S.buildings) {
      const q = [P(b.x, b.y, 110), P(b.x + b.W, b.y, 110), P(b.x, b.y + b.H, 0), P(b.x + b.W, b.y + b.H, -10)];
      b.bounds = { minX: Math.min(...q.map((p) => p[0])) - 20, maxX: Math.max(...q.map((p) => p[0])) + 20, minY: Math.min(...q.map((p) => p[1])) - 30, maxY: Math.max(...q.map((p) => p[1])) + 20 };
    }
    // 반려동물이 다닐 수 있는 곳 (부지가 따로 안 정했으면: 건물 밖 걸을 수 있는 칸 전부)
    if (S.pets && S.pets.length && !S.petArea) {
      const area = [];
      for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) if (OUT.grid[j * W + i] && used[j * W + i] !== 3 && !(i >= tower.x && i < tower.x + tower.W && j >= tower.y && j < tower.y + tower.H)) area.push([i + 0.5, j + 0.5]);
      S.petArea = area;
    }
    return S;
  }

  /** spec → 건물 키트가 쓰는 o (팀장실은 일 많은 팀장 절반만) */
  function openSpec(spec) {
    const pods = [...spec.teams, ...spec.stoppedTeams].map((t) => ({ ...t }));
    const K0 = roomCount(spec.teams.length);
    pods.forEach((t, i) => { t.room = i < K0; });
    return { pods, singles: [...spec.singles, ...spec.stoppedSingles], partners: spec.partners, hot: spec.hot, spec };
  }

  function newScene() {
    const S = LY.newScene('combo');
    S.rest = []; S.visitorSeats = []; S.doors = []; S.buildings = []; S.npcs = []; S.occ = []; S.spots = []; S.campusDoors = [];
    S.underRest = []; S.underDorm = []; S.jail = []; S.vault = []; S.dorms = []; S.dungeon = [];
    S.compact = true;
    return S;
  }

  function build(spec, inId, outId) {
    const ID = INDOORS.find((d) => d.id === inId) || INDOORS[0];
    const OD = OUTDOORS.find((d) => d.id === outId) || OUTDOORS[0];
    if (OD.custom) return OD.custom(spec, ID);           // 자체 장면을 짓는 부지 (AI 캠퍼스)
    const S = newScene();
    const OUT = I().level(S, OD.name, { floor: 'grass', outer: 'none', short: '외부', bld: 'out' });
    const B = ID.build(S, openSpec(spec), { spec, outdoor: OD.id });
    const sz = OD.size(B);
    const k = lotKit(S, OUT, sz.W, sz.H);
    OD.lot(S, OUT, B, k);
    // 세션이 나타나고 사라지는 곳은 항상 바깥 (실내 평면이 정한 S.door 는 무시)
    if (!S.door || S.door.lv !== OUT.idx) S.door = { lv: OUT.idx, x: k.TX + B.doorX + 0.5, y: Math.min(OUT.H - 1, k.front + 3), face: '-y' };
    if (!S.home) S.home = { x0: 0, y0: 0, x1: OUT.W, y1: OUT.H };
    finish(S, OUT, k.used);
    if (k.afterFinish) k.afterFinish();
    return S;
  }

  AIO.compose = {
    indoors: INDOORS, outdoors: OUTDOORS, tower, lotKit, finish, openSpec, newScene, roomCount, FLOOR_PX, COLORS, build,
    indoor(def) { const i = INDOORS.findIndex((d) => d.id === def.id); if (i >= 0) INDOORS[i] = def; else INDOORS.push(def); return def; },
    outdoor(def) { const i = OUTDOORS.findIndex((d) => d.id === def.id); if (i >= 0) OUTDOORS[i] = def; else OUTDOORS.push(def); return def; },
    /** 소품 등록: draw(ctx, f, t, I, world) · depth(f) 정렬 깊이 · slice 긴 소품 조각 · dynamic 저배율에서도 매 프레임 */
    prop(type, def) { AIO.props[type] = typeof def === 'function' ? { draw: def } : def; },
    floorStyle(style, fn) { AIO.floorStyles[style] = fn; },
    decal(type, fn) { AIO.decals[type] = fn; },
  };
})();
