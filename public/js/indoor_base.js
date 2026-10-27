// 기존 맵에서 떼어 낸 실내(건물) 4종: 꼬마빌딩 · 원룸 오피스 · 선셋 테라스 글래스 오피스 · AI 캠퍼스 연구동.
// 원래 짝(꼬마빌딩+마당/골목 · 원룸+없음 · 선셋+선셋 · 연구동+AI 캠퍼스)을 고르면 maps.js 가 원본 맵을 그대로 짓는다.
(function () {
  const C = AIO.compose;
  const I = () => AIO.interiors;

  C.indoor({
    id: 'kkoma', icon: '🏢', name: '꼬마빌딩', desc: '지하 5층(기계실~감옥) · 업무층 · 임원층 · 루프탑 카페&바',
    build(S, o) {
      S.mini = true;
      const levels = AIO.mini.building(S, o, {});
      return { levels, W: AIO.mini.FW, H: AIO.mini.FH, base: S.miniBase, doorX: 11, name: '🏢 꼬마빌딩' };
    },
  });

  /** 원룸 오피스 평면을 한 층짜리 건물로 (정문 · 게이트 · 안내데스크 포함) */
  C.indoor({
    id: 'office', icon: '🧶', name: '원룸 오피스', desc: '한 층짜리 사무실 · 팀장실·휴게실·수면실·서버실', pair: 'none',
    build(S, o) {
      const L = I().level(S, '1F 원룸 오피스', { floor: 'wood', outer: 'premium', short: '1F', bld: 'tower' });
      L.floorColor = '#eadcc3';
      const fl = AIO.officeFloor(S, L, AIO.layout.kit(S, L), o, { front: true });
      L.desc = '팀장실 · 휴게실 · 수면실 · 서버실 · AI 학습실 · 로비';
      const T = C.tower(S, { W: L.W, H: L.H, id: 'office', name: '🧶 원룸 오피스', facade: { wall: '#e8dcc6', texture: 'brick', win: 'grid', frame: '#fbf7ef', trim: '#c9b79a', sign: '🧶 AI 인공지능 연구원', awning: '#d97757' } });
      T.adopt(L);
      T.roof({ kind: 'utility', desc: '옥상 · 실외기 · 물탱크' });
      return T.done({ doorX: Math.floor((fl.NX + fl.W) / 2) - 1 + 1.5 });
    },
  });

  /** 선셋 테라스의 유리 사무실 (엘리베이터 홀 포함) + 앞쪽 유리문 */
  C.indoor({
    id: 'terrace', icon: '🌅', name: '선셋 글래스 오피스', desc: '선셋 테라스의 유리 사무실 · 팀장실·휴게실·수면실', pair: 'terrace',
    build(S, o) {
      const L = I().level(S, '1F 글래스 오피스', { floor: 'wood', outer: 'premium', short: '1F', bld: 'tower' });
      L.floorColor = '#eadcc3';
      const K = AIO.layout.kit(S, L);
      const fl = AIO.officeFloor(S, L, K, o, { elevator: true, front: false });
      const dx = Math.floor((fl.OX + fl.W) / 2);
      K.add({ type: 'entrance', x: dx - 1, y: L.H - 0.08, w: 3, bld: 'tower' });
      L.decals.push({ type: 'floor', x: dx - 1.2, y: L.H - 1.5, w: 3.4, d: 1.4, color: '#8a7d6b' });
      L.signs.push({ x: dx - 1.2, y: L.H - 0.3, text: '🚪 출입구', color: '#2b2622', room: true });
      L.desc = '유리 사무실 · 팀장실 · 휴게실 · 수면실 · 서버실';
      const T = C.tower(S, { W: L.W, H: L.H, id: 'terrace', name: '🌅 선셋 글래스 오피스', facade: { wall: '#9fb9c9', win: 'band', winColor: 'rgba(214,236,248,0.85)', frame: 'rgba(70,90,110,0.5)', trim: '#e7ecef', sign: '🌅 SUNSET OFFICE', signBg: '#e9853c', signFg: '#fff8ea', lobby: 'rgba(220,238,248,0.85)' } });
      T.adopt(L);
      T.roof({ kind: 'utility', desc: '옥상 · 실외기' });
      return T.done({ doorX: dx + 0.5 });
    },
  });

  /** AI 캠퍼스 연구동: 로비·카페 / 연구소 층 × n / 서버실 / GPU 학습실 / 임원층 / 옥상정원 */
  C.indoor({
    id: 'lab', icon: '🏙️', name: 'AI 캠퍼스 연구동', desc: '로비·카페 · 연구소 층 · 서버실 · GPU 학습실 · 임원층 · 옥상정원', pair: 'campus',
    build(S, o) {
      const levels = I().tower(S, { teams: o.pods, singles: o.singles, hot: o.hot });
      return { levels, W: I().TW, H: I().TH, base: 0, doorX: 17, cafeDoor: 34.5, cafeX0: 24, name: '🏢 연구동' };
    },
  });
})();
