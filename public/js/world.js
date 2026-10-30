// The living campus: entities, where they belong (desk / rest spot / factory / jail / vault), how they get there
// (walk on floors, doors between buildings and outside, elevators between tower floors, crosswalks that wait for
// the light) and how it is drawn (chunked ground with zoom LOD, building exteriors that melt into the interior of the
// floor you are looking at — raised to that floor's height —, traffic, trucks at the dock, students, families, geese).
(function () {
  const { P, rgba, poly } = AIO.iso;
  const A = AIO.art, A2 = AIO.art2, A3 = AIO.art3, A4 = AIO.art4, A5 = AIO.art5, A6 = AIO.art6, A7 = AIO.art7, A8 = AIO.art8;
  const T = (s) => (AIO.tr ? AIO.tr(s) : s);
  const TEAM_COLORS = ['#d97757', '#4e7cf6', '#3fb27f', '#a67be0', '#e9a23b', '#e2667f', '#1f9fb4'];
  const MEMBER_HATS = ['beanie', 'beret', 'bucket', 'headphones', 'cap', 'bow', 'beanie', 'shades'];
  const YARNS = ['#f4ead8', '#f1ece4', '#efe4d2', '#e9dcc8', '#f6e3d3', '#e8e1f1', '#e3eef0', '#f3e0e6'];
  const ACCENTS = ['#d97757', '#4e7cf6', '#3fb27f', '#a67be0', '#e9a23b', '#e2667f', '#1f9fb4', '#2b3a67', '#7a4a2a', '#c43d32'];
  const WALL = 104;
  const ACT_SCREEN = { read: 'read', edit: 'edit', terminal: 'terminal', search: 'search', web: 'web', think: 'think', delegate: 'delegate', meeting: 'meeting', plan: 'plan', ask: 'ask', skill: 'edit', publish: 'web', tool: 'edit', talk: 'edit', done: 'done', idle: 'idle' };
  const SCREEN_TYPES = new Set(['desk', 'machine', 'console', 'execDesk']);
  const AMBIENT = new Set(['npc', 'walker', 'family', 'pet']);
  const DYNAMIC_OUT = new Set(['trafficLight', 'busStop', 'barrier', 'duck', 'flag', 'foodTruck', 'stringLights', 'swingSet', 'seesaw', 'merryGoRound', 'fountain', 'policeCar']);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const CH = 32;                       // ground chunk size (tiles)
  const PX_BUDGET = 110e6;             // cached canvas pixels (chunks + building sprites)
  const BUCKETS = [1, 0.75, 0.5, 0.375, 0.25, 0.1875, 0.125, 0.0625];
  // long furniture is drawn in one-tile slices so each slice depth-sorts on its own (value = depth along y)
  const SLICE = { sofa: 1, reception: 1, tellerCounter: 1, cafeCounter: 0.9, highTable: 0.6, bench: 0.5, deskRow: 0.7, seatRow: 0.6, storeShelf: 0.8, kitchenLine: 0.9, till: 0.9, breadCase: 0.9, sushiBelt: 1.4,
    readingTable: 1.2, bookStack: 0.7, labBench: 0.9, tv: 0.3, bigScreen: 0.3, cctvWall: 0.3, nocWall: 0.1, depositBoxes: 0.1, storageShelf: 0.6, parcelShelf: 0.6, trophyCase: 0.6, bookshelf: 0.5, lockers: 0.6,
    whiteboard: 0.3, blackboard: 0.1, fridgeCase: 0.9, aquarium: 0.6, posterBoard: 0.4, decisionBoard: 0.4, wantedBoard: 0.4, cabinet: 0.6, planter: 0.8, batteryRack: 0.7, menuWall: 0.1, restroomWall: 0.1,
    gearRack: 0.5, flowerStand: 1.1, picnicTable: 2, palletRack: 0.9, snackBar: 0.8, beerTap: 0.9, gameTV: 0.6, brandWall: 0.3 };
  const PET = { dog: { speed: 3.4, roam: 9, dwell: [1, 4], say: '🐶 멍!' }, cat: { speed: 2.1, roam: 6, dwell: [3, 14], say: '😺 야옹~' }, duck: { speed: 1.1, roam: 5, dwell: [2, 6], say: '🦆 꽥꽥' }, hen: { speed: 1.2, roam: 5, dwell: [2, 5], say: '🐔 꼬꼬댁' } };
  const DIRV = { '+x': [1, 0], '-x': [-1, 0], '+y': [0, 1], '-y': [0, -1] };
  function pushF(list, f) {
    const d = SLICE[f.type] ?? (AIO.props && AIO.props[f.type] && AIO.props[f.type].slice);
    if (d && (f.w || 0) >= 1.5) {
      const n = Math.ceil(f.w), yf = f.y + d;
      for (let i = 0; i < n; i++) list.push({ k: f.x + i + 0.5 + f.y + d / 2, f, si: i, sn: n, clip: [i === 0 ? -1e7 : (f.x + i - yf) * 32, i === n - 1 ? 1e7 : (f.x + i + 1 - yf) * 32] });
    } else list.push({ k: sortKey(f), f });
  }
  const WALKERS = 45;

  /** where a session belongs: active → tower desk · paused → rest spots · stopped → factory · jail → 유치장 · vault → 금고 */
  if (AIO.i18n) AIO.i18n.add({ '주세요!': 'please!', '샀어요!': 'bought!', '사러 가는 중': 'going to buy', '자리 찾는 중': 'finding a seat', '먹는 중': 'eating', '주문 중': 'ordering', '😋 잘 먹었습니다!': '😋 That was good!',
    '아메리카노': 'Americano', '김밥': 'Gimbap', '라면': 'Ramen', '치킨': 'Fried chicken', '피자': 'Pizza', '초밥': 'Sushi', '한우 오마카세': 'Hanwoo omakase',
    '구내식당 배식대': 'Cafeteria counter', '1F 카페': '1F Café', '루프탑 카페': 'Rooftop café', '커피 바': 'Coffee bar', '지하매점': 'Basement store', 'B1 구내식당': 'B1 Cafeteria' });
  const ERRAND_FOOD = new Set(['coffee', 'kimbap', 'ramen', 'chicken', 'pizza', 'sushi', 'hanwoo']);   // 사러 가는 음식 (economy.mjs SHOP 의 food)
  function placeOf(s) {
    if (s.place) return s.place;
    const title = String(s.title || '');
    if (/유치장|감금/.test(title)) return 'jail';
    if (/금고|보관/.test(title)) return 'vault';
    if (/일시\s*정지/.test(title)) return 'paused';
    if (/중단/.test(title) || s.status === 'sleeping') return 'stopped';
    return 'active';
  }

  class World {
    constructor() {
      this.ents = new Map();
      this.S = null;
      this.sig = '';
      this.slots = { single: [], stopped: [], partner: [] };
      this.sessions = [];
      this.byId = new Map();
      this.first = true;
      this.claims = { rest: new Map(), hot: new Map(), meet: new Map(), visit: new Map(), jail: new Map(), vault: new Map(), spot: new Map(), under: new Map(), shop: new Map(), eat: new Map() };
      this.opts = { labels: true, bubbles: true, lines: true, rank: true, sky: 'auto', autoFocus: 'floor', afQuiet: '20' };   // autoFocus: off · floor(층 비추기) · follow(따라가기) · afQuiet: 내가 화면을 만진 뒤 몇 초 동안은 자동으로 안 움직임
      this.selected = null;
      this.hover = null;
      this.hits = [];
      this.caches = new Map();
      this.chunks = new Map();
      this.sprites = new Map();
      this.px = 0;
      this.codes = new Map();
      this.teamColor = new Map();
      this.elev = new Map();
      this.doorOpen = new Map();
      this.dockOpen = [];
      this.t = 0;
      this.onLayout = null;
      this.lastState = null;
      this.authed = true;
      this.view = { focus: null, t: 0, floor: null };
      this.shown = new Set([0]);
      this.cars = []; this.bus = null; this.trucks = [];
      this.familyMat = new Map();
      this.budget = 0;
      this.cam = null;
      if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('aio:lang', () => { this.caches.clear(); this.sprites.clear(); this.chunks.clear(); this.px = 0; });
    }

    placeOf(s) { return placeOf(s); }

    styleFor(provider, id, opt = {}) {
      const pv = AIO.provider(provider);
      const gender = opt.gender || null;
      const r = AIO.rand(AIO.hash(id));
      const yarns = [pv.yarn, '#f4ead8', '#f1ece4', '#efe4d2'];
      const hats = opt.member ? MEMBER_HATS : pv.hats;
      const hat = hats[Math.floor(r() * hats.length)];
      const st = { yarn: yarns[Math.floor(r() * yarns.length)], accent: opt.accent || pv.accent, accent2: pv.accent2, hat: opt.hat || hat, glasses: r() < 0.18 && hat !== 'shades', stripe: r() < 0.5, vest: null, tie: opt.intern ? null : (opt.accent || pv.accent) };
      st.gender = gender; st.hair = ['#6b4a2e', '#3b2a1e', '#a8743d', '#2b2622', '#c99a5b'][Math.floor(r() * 5)];
      if (gender === 'F') st.tie = null;   // 여성은 넥타이 대신 리본 장식(머리)
      st.factory = { ...st, hat: 'hardhat', hardhat: opt.intern ? '#ffffff' : opt.member ? '#f2c230' : pv.accent, vest: opt.intern ? '#f2c230' : '#ff8a3d', tie: null };
      return st;
    }
    npcStyle(seed, o = {}) {
      const r = AIO.rand(seed);
      const st = { yarn: o.yarn || YARNS[Math.floor(r() * YARNS.length)], accent: o.accent || ACCENTS[Math.floor(r() * ACCENTS.length)], accent2: '#ffffff', hat: o.hat === undefined ? (r() < 0.6 ? MEMBER_HATS[Math.floor(r() * MEMBER_HATS.length)] : null) : o.hat, glasses: r() < 0.2, stripe: r() < 0.4, vest: o.vest || null, tie: o.tie || null, balloon: o.balloon };
      st.factory = { ...st, hat: 'hardhat', hardhat: '#f2c230', vest: '#ff8a3d', tie: null };
      return st;
    }

    // ------------------------------------------------------------ state sync
    setState(state) {
      this.lastState = state;
      this.authed = !!(state.auth ? state.auth.authed : true);
      const sessions = state.sessions || [];
      this.sessions = sessions;
      this.byId = new Map(sessions.map((s) => [s.id, s]));
      const teams = [], stoppedTeams = [], singles = [], stopped = [], partners = [];
      for (const s of sessions) {
        const pl = placeOf(s);
        if (s.kind === 'app') partners.push(s);
        else if (s.kind === 'harness') (pl === 'stopped' ? stoppedTeams : teams).push(s);
        else (pl === 'stopped' ? stopped : singles).push(s);
      }
      const slotSync = (slots, list) => {
        const ids = new Set(list.map((s) => s.id));
        for (let i = 0; i < slots.length; i++) if (slots[i] && !ids.has(slots[i])) slots[i] = null;
        for (const s of list.slice().sort((a, b) => a.startedAt - b.startedAt)) {
          if (slots.includes(s.id)) continue;
          const free = slots.indexOf(null);
          if (free >= 0) slots[free] = s.id; else slots.push(s.id);
        }
        while (slots.length && slots[slots.length - 1] === null) slots.pop();
      };
      slotSync(this.slots.single, singles);
      slotSync(this.slots.stopped, stopped);
      slotSync(this.slots.partner, partners);

      const counters = {};
      for (const s of (state.allSessions || sessions).slice().sort((a, b) => a.startedAt - b.startedAt)) {   // 코드(C12 …)는 보기 필터와 상관없이 전체 기준 — 걸러도 번호가 안 바뀐다
        const sh = AIO.provider(s.provider).short;
        counters[sh] = (counters[sh] || 0) + 1;
        this.codes.set(s.id, sh + counters[sh]);
      }
      let interns = 0;
      for (const s of sessions) for (const a of s.agents || []) if (!this.isRosterAgent(s, a)) interns++;

      const team = (s) => {
        if (!this.teamColor.has(s.id)) this.teamColor.set(s.id, TEAM_COLORS[this.teamColor.size % TEAM_COLORS.length]);
        return { lead: 'S:' + s.id, title: trunc(this.authed ? (s.title || s.project || '하네스 팀') : '하네스', 16), color: this.teamColor.get(s.id), members: (s.roster || []).slice(0, 14).map((r) => r.name) };
      };
      const byStart = (a, b) => a.startedAt - b.startedAt;
      const combo = !!(AIO.maps && AIO.maps.ranked);   // 조합 맵: 활발도 순 재배치 (원본 맵 조합은 자리 고정)
      const spec = {
        teams: (combo ? this.rankLeads(teams.sort(byStart)) : teams.sort(byStart)).map(team),
        stoppedTeams: stoppedTeams.sort(byStart).map(team),
        // 조합 맵: 세션 책상 그룹도 활발한 순서로 (2분마다 재정렬) — 기존 맵은 자리 고정
        singles: combo ? this.rankLeads(singles.slice().sort(byStart), 'single').map((s) => 'S:' + s.id) : this.slots.single.map((id) => (id ? 'S:' + id : null)),
        stoppedSingles: this.slots.stopped.map((id) => (id ? 'S:' + id : null)),
        partners: this.slots.partner.map((id) => 'S:' + id),
        hot: Math.max(4, Math.ceil(interns / 4) * 4),
      };
      const map = AIO.maps ? AIO.maps.key : 'campus';
      AIO.buildingCfg = state.building || AIO.buildingCfg || { floors: {} };
      const sig = map + '|' + JSON.stringify(spec) + '|' + JSON.stringify(AIO.buildingCfg);
      if (sig !== this.sig) {
        if (this.mapId && this.mapId !== map) this.resetForMap();
        this.mapId = map;
        this.sig = sig;
        this.S = AIO.maps ? AIO.maps.build(AIO.maps.current, spec) : AIO.campus.build(spec);
        this.applyBuildingCfg(this.S);
        if (AIO.skins) AIO.skins.decorate(this.S);        // 🎨 테마 소품 (호박 · 트리 · 수정 …)
        this.spotsByLv = null; this.outSpots = null;
        this.caches.clear(); this.chunks.clear(); this.sprites.clear(); this.px = 0;
        for (const m of Object.values(this.claims)) m.clear();
        for (const [id, e] of this.ents) {
          if (e.kind === 'npc') { this.ents.delete(id); continue; }
          e.rest = e.hotKey = e.meet = e.visit = e.jailSpot = e.vaultSpot = e.spotClaim = null;
          if (e.leaving || (e.kind === 'intern' && e.finishing)) { this.ents.delete(id); continue; }
          e.busy = false; e.onArrive = null; e.waitUntil = 0; e.afterWait = null; e.carry = null; e.pendingReport = false; e.plan = []; e.inCab = false; e.cwWait = 0;
          e.errand = null; e.shopSpot = null; e.eatSpot = null; e.carryUntil = 0;
          e.spot = null;
          if (AMBIENT.has(e.kind)) { e.lv = 0; e.target = null; e.nextAt = this.t + Math.random() * 3; if (e.hidden) { e.hidden = false; e.alpha = 0; e.entering = true; } continue; }
          const want = this.desiredSpot(e);
          if (want) this.place(e, want);
        }
        this.initAmbient();
        // 팀장실을 새로 받거나 내준 팀장에게 한마디
        const roomed = new Set();
        for (const [k, seat] of this.S.seats) if (seat.lead && seat.room) roomed.add(k);
        if (this.roomed && !this.first) for (const s of this.sessions) {
          if (s.kind !== 'harness') continue;
          const id = 'S:' + s.id, was = this.roomed.has(id), now = roomed.has(id), e = this.ents.get(id);
          if (e && was !== now) e.say = { text: now ? '🚪 팀장실 입성!' : this.S.seats.get(id)?.desk ? '🪑 팀장 책상으로 이동' : '📦 팀 테이블로 이동', until: this.t + 5 };
        }
        this.roomed = roomed;
        this.onLayout && this.onLayout(this.S);
      }
      this.syncEntities();
      this.syncFamilies();
      this.first = false;
    }

    /** switching maps: nothing carries over — everyone is placed fresh at their new seat */
    resetForMap() {
      this.ents.clear(); this.familyMat.clear();
      for (const m of Object.values(this.claims)) m.clear();
      this.first = true; this.trafficReady = false; this.selected = null;
      this.caches.clear(); this.chunks.clear(); this.sprites.clear(); this.px = 0;
      this.cars = []; this.bus = null; this.trucks = [];
    }

    /** 일 많이 하는 팀장 순 (2분마다 재평가) — 앞쪽 팀장만 팀장실을 쓴다 */
    rankLeads(list, kind = 'team') {
      const now = Date.now();
      // 활발함(지금 작업 중 · 일하는 에이전트 · 오늘 처리량 · 최근 활동) + 중요도(팀 규모 · 레벨)
      const score = (s) => (AIO.isBusy(s.status) ? 100 : 0) + (s.agents || []).filter((a) => a.status === 'working').length * 15 + Math.min(60, s.stats?.today || 0) + Math.max(0, 40 - (now - (s.lastActive || 0)) / 60000) + (s.roster || []).length * 4 + (s.level || 1) * 2;
      this.ranks = this.ranks || {};
      const R = this.ranks[kind] || (this.ranks[kind] = { order: null, at: -1e9 });
      const ids = list.map((s) => s.id);
      if (!R.order || this.t - R.at > 120 || ids.some((id) => !R.order.includes(id))) {
        const prev = R.order || [];
        R.order = list.slice().sort((a, b) => score(b) - score(a) || prev.indexOf(a.id) - prev.indexOf(b.id)).map((s) => s.id);
        R.at = this.t;
      }
      return list.slice().sort((a, b) => R.order.indexOf(a.id) - R.order.indexOf(b.id));
    }

    /** 꼬마빌딩 숙소: 최근 사용량 많은 세션 순으로 침대 배정 (2분마다 재평가) */
    dormOf(e) {
      const S = this.S;
      if (!S.dorms || !S.dorms.length) return null;
      if (!this.dormMap || this.t - (this.dormAt ?? -1e9) > 120 || this.dormFor !== S) {
        const now = Date.now();
        const act = this.sessions.filter((s) => s.kind !== 'app' && placeOf(s) !== 'stopped' && placeOf(s) !== 'jail' && placeOf(s) !== 'vault' && placeOf(s) !== 'dungeon');
        const score = (s) => (s.stats?.today || 0) * 2 + (s.level || 1) * 3 + Math.max(0, 60 - (now - (s.lastActive || 0)) / 60000) + (AIO.isBusy(s.status) ? 20 : 0);
        act.sort((a, b) => score(b) - score(a));
        this.dormMap = new Map(act.slice(0, S.dorms.length).map((s, i) => [s.id, S.dorms[i]]));
        this.dormAt = this.t; this.dormFor = S;
      }
      return this.dormMap.get(e.sid) || null;
    }

    /** 빌딩 관리 설정: 층 이름(간판 · 층 버튼) · 테이블 그룹 업무(표지판에 📋) — L.key 는 원래 층 이름 (설정의 키) */
    applyBuildingCfg(S) {
      const F = (AIO.buildingCfg && AIO.buildingCfg.floors) || {};
      for (const L of S.levels) {
        L.key = L.key || L.name;
        L.groups = L.signs.filter((g) => !g.room && /^(🧶|💻|🤝|🎒|👔)/.test(g.text));
        const c = F[L.key];
        if (!c) continue;
        if (c.title) { L.name = `${L.short} ${c.title}`; L.customTitle = c.title; }
        L.groups.forEach((g, i) => { const t = c.groups && c.groups[i]; if (t && t.task) { g.text = `${g.text} · 📋 ${t.task}`; g.task = t.task; g.note = t.note; } });
        const tasks = Object.values(c.groups || {}).map((g) => g.task).filter(Boolean);
        if (tasks.length) L.desc = `${L.desc ? L.desc + ' · ' : ''}📋 ${tasks.join(', ')}`;
      }
      for (const L of S.levels) for (const f of L.furniture) if (f.type === 'v4_floorSign') f.text = L.name;
      S.floorNames = S.levels.map((L) => L.name);
    }

    /**
     * 돌려쓰는 팀장실: 방마다 그 층 팀장 중 가장 최근에 일한 팀장이 잡고, 지금 주인이 HOLD 동안 일이 없으면 다음 팀장에게 넘긴다.
     * 주인은 레이아웃이 다시 지어져도 방 이름으로 기억한다.
     */
    updateLeadRooms() {
      const S = this.S;
      if (!S || !S.leadRooms || !S.leadRooms.length) return;
      if (this.t - (this.roomTick || -99) < 4) return;
      this.roomTick = this.t;
      this.roomHolder = this.roomHolder || new Map();
      const HOLD = 15 * 60e3, now = Date.now();
      const act = (k) => { const s = this.byId && this.byId.get(k.slice(2)); return s ? (AIO.isBusy(s.status) ? now : s.lastActive || 0) : 0; };
      for (const R of S.leadRooms) {
        const cur = this.roomHolder.get(R.id);
        const best = R.candidates.slice().sort((a, b) => act(b) - act(a))[0];
        let next = cur;
        if (!cur || !R.candidates.includes(cur)) next = best || null;            // 비어 있으면 가장 최근에 일한 팀장이 잡는다
        else if (now - act(cur) > HOLD && best && best !== cur && act(best) > act(cur)) next = best;
        if (next !== cur) {
          this.roomHolder.set(R.id, next);
          const say = (k, text) => { const e = k && this.ents.get(k); if (e) e.say = { text, until: this.t + 5 }; };
          if (cur && !this.first) say(cur, '🪑 팀장실을 넘겨주고 팀 책상으로');
          if (next && !this.first) say(next, '🚪 팀장실 입성!');
        }
      }
    }
    /** 이 팀장이 지금 잡고 있는 팀장실 자리 */
    leadRoomSeat(key) {
      const S = this.S;
      if (!S.leadRooms || !this.roomHolder) return null;
      for (const R of S.leadRooms) if (this.roomHolder.get(R.id) === key) return R.seat;
      return null;
    }

    /** 빌딩 관리에서 정한 자리 { level: 층 키, x, y } → 실제 자리 객체 (가장 가까운 자리) */
    assignedSpot(a) {
      const S = this.S;
      if (!a || !S) return null;
      const L = S.levels.find((l) => (l.key || l.name) === a.level);
      if (!L) return null;
      const pools = [[...S.seats.values()], S.rest, S.meeting, S.visitorSeats, S.hot, S.jail, S.vault, S.underRest, S.underDorm, S.dorms, S.dungeon];
      let best = null, bd = 1e9;
      for (const P of pools) for (const sp of P || []) if (sp && sp.lv === L.idx) { const d = Math.hypot(sp.x - a.x, sp.y - a.y); if (d < bd) { bd = d; best = sp; } }
      return bd < 2.5 ? best : null;
    }
    /** 세션마다 고른 동작: rest(실내 휴식) · outside(밖에서 휴식) · meet(회의실) · desk(자리에서 일) */
    actionSpot(e, action) {
      const S = this.S, out = S.levels[0];
      if (action === 'desk') return S.seats.get(e.seatKey) || null;
      if (action === 'meet') return this.meetSpot(e);
      if (action === 'rest') return this.claim(this.claims.rest, S.rest.filter((r) => r.lv !== out.idx), e, 'rest');
      if (action === 'outside') return this.claim(this.claims.rest, S.rest.filter((r) => r.lv === out.idx), e, 'rest') || this.claim(this.claims.rest, S.rest, e, 'rest');
      return null;
    }

    isRosterAgent(s, a) { return s.kind === 'harness' && (s.roster || []).some((r) => r.name === a.type); }

    place(e, spot) { e.x = spot.x; e.y = spot.y; e.lv = spot.lv || 0; e.spot = spot; e.pose = spot.pose || 'stand'; e.dir = spot.face || '+y'; e.plan = []; e.alpha = 1; }

    spawn(id, props, spot) {
      const e = { id, x: 0, y: 0, lv: 0, dir: '+y', pose: 'stand', plan: [], speed: props.kind === 'intern' ? 3.6 : 2.8, alpha: 1, scale: 1, spot: null, busy: false, seed: AIO.hash(id) % 997, born: this.t, reported: new Set(), ...props };
      const door = this.S.door;
      if (this.first && spot) this.place(e, spot);
      else { e.x = door.x; e.y = door.y; e.lv = door.lv; e.dir = '-y'; if (!this.first) { e.alpha = 0; e.entering = true; } }
      this.ents.set(id, e);
      return e;
    }

    syncEntities() {
      const seen = new Set();
      const t = this.t;
      for (const s of this.sessions) {
        const id = 'S:' + s.id;
        seen.add(id);
        let e = this.ents.get(id);
        const kind = s.kind === 'app' ? 'visitor' : 'main';
        const gz = (s.persona && s.persona.gender) || null;
        const lookKey = (s.look ? `${s.look.hat}|${s.look.accent}` : '') + '|' + (gz || '');
        const lookOpt = { ...(s.look ? { hat: s.look.hat || undefined, accent: s.look.accent } : {}), gender: gz };
        if (!e) { e = this.spawn(id, { kind, sid: s.id, style: this.styleFor(s.provider, s.id, lookOpt) }, null); if (this.first) { const sp = this.desiredSpot(Object.assign(e, { s, seatKey: id })); if (sp) this.place(e, sp); } }
        if (e.leaving) { e.leaving = false; e.fading = false; e.alpha = 1; e.busy = false; }
        e.s = s; e.seatKey = id;
        if ((e.lookKey || '') !== lookKey) { e.lookKey = lookKey; e.style = this.styleFor(s.provider, s.id, lookOpt); if (s.look && s.look.hat === null) { e.style.hat = null; e.style.factory.hat = 'hardhat'; } }
        if (e.status !== s.status) {
          if (e.status && s.status === 'done') e.cheerUntil = t + 6;
          e.status = s.status; e.statusAt = t;
        }
        if (s.kind === 'harness') {
          for (const r of s.roster || []) {
            const mid = `M:${id}:${r.name}`;
            seen.add(mid);
            let m = this.ents.get(mid);
            if (!m) m = this.spawn(mid, { kind: 'member', sid: s.id, name: r.name, style: this.styleFor(s.provider, mid, { member: true, accent: this.teamColor.get(s.id) }) }, this.S.seats.get(mid));
            m.s = s; m.r = r;
            const mine = (s.agents || []).filter((a) => a.type === r.name);
            const working = mine.filter((a) => a.status === 'working');
            m.agent = working[working.length - 1] || null;
            m.status = working.length ? 'working' : 'standby';
            m.count = working.length;
            for (const a of mine) {
              if (a.status !== 'done' || m.reported.has(a.id)) continue;
              m.reported.add(a.id);
              if (!this.first) m.pendingReport = true;
            }
            if (this.first) for (const a of mine) m.reported.add(a.id);
          }
        }
        for (const a of s.agents || []) {
          if (this.isRosterAgent(s, a)) continue;
          const iid = `I:${s.id}:${a.id}`;
          let it = this.ents.get(iid);
          if (!it) {
            if (a.status === 'done') continue;
            it = this.spawn(iid, { kind: 'intern', sid: s.id, name: a.type, scale: 0.8, style: this.styleFor(s.provider, iid, { hat: 'beanie', accent: '#f3c44b', intern: true }) }, null);
            if (this.first) { const spot = this.hotSpot(it); if (spot) this.place(it, spot); }
          }
          seen.add(iid);
          it.agent = a; it.s = s;
          it.status = a.status === 'done' ? 'done' : 'working';
          if (a.status === 'done' && !it.finishing) { it.finishing = true; it.pendingReport = true; }
        }
      }
      for (const [id, e] of this.ents) {
        if (seen.has(id) || AMBIENT.has(e.kind)) continue;
        if (e.kind === 'member') { this.ents.delete(id); continue; }
        if (e.kind === 'intern' && (e.finishing || e.leaving)) continue;
        if (!e.leaving) this.leave(e);
      }
    }

    // ------------------------------------------------------------ ambient life: staff, students, families
    initAmbient() {
      const S = this.S;
      for (const n of S.npcs) {
        const id = n.id + '@' + n.lv;
        const e = { id, kind: 'npc', role: n.role, def: n, x: n.home.x, y: n.home.y, lv: n.lv, dir: n.home.face || '+y', pose: n.home.pose || 'stand', plan: [], speed: n.kid ? 1.8 : 2.2, alpha: 1, scale: n.kid ? 0.62 : 1, spot: n.home, seed: AIO.hash(id) % 997, pi: 0, nextAt: this.t + 4 + Math.random() * 10, reported: new Set() };
        const col = (c) => (typeof c === 'string' ? c : undefined);   // 색이 아닌 값이 들어오면 그리기가 통째로 멈추므로 거른다
        e.style = this.npcStyle(e.seed, { hat: n.hat ?? null, accent: col(n.accent), tie: col(n.tie), vest: col(n.vest) });
        this.ents.set(id, e);
      }
      const area = S.petArea || [];
      (S.pets || []).forEach((p, i) => {
        const id = `P:${p.kind}:${i}`;
        if (this.ents.has(id) || !area.length) return;
        const seed = AIO.hash(id) % 997, rr = AIO.rand(seed);
        let at = area[Math.floor(rr() * area.length)];
        if (p.near) { let best = null, bd = 1e9; for (const a of area) { const d = Math.hypot(a[0] - p.near[0], a[1] - p.near[1]); if (d < bd && d > 1.5) { bd = d; best = a; } } at = best || at; }
        const e = { id, kind: 'pet', species: p.kind, color: p.color, near: p.near, x: at[0], y: at[1], lv: 0, dir: '+y', pose: 'stand', plan: [], speed: PET[p.kind].speed, alpha: 1, scale: 1, spot: null, seed, nextAt: this.t + rr() * 4, reported: new Set() };
        this.ents.set(id, e);
        for (let k = 0; k < (p.chicks || 0); k++) this.ents.set(`${id}:chick${k}`, { id: `${id}:chick${k}`, kind: 'pet', species: 'chick', follow: id, k, x: at[0] - 0.4 * (k + 1), y: at[1], lv: 0, dir: '+y', pose: 'stand', plan: [], speed: 2.4, alpha: 1, scale: 1, seed: seed + k + 1, nextAt: 1e12, reported: new Set() });
      });
      let have = 0;
      for (const e of this.ents.values()) if (e.kind === 'walker') have++;
      for (let i = have; i < WALKERS && S.campusDoors.length; i++) {
        const id = 'W:' + i;
        const d = S.campusDoors[(i * 7) % S.campusDoors.length];
        const seed = AIO.hash(id) % 997;
        const r = AIO.rand(seed + 3);
        const role = r() < 0.7 ? 'student' : 'researcher';
        const e = { id, kind: 'walker', role, x: d.x, y: d.y, lv: 0, dir: '+y', pose: 'stand', plan: [], speed: 2 + r() * 1.2, alpha: 0, scale: 0.88 + r() * 0.14, spot: null, seed, nextAt: this.t + r() * 25, hidden: true, door: d, reported: new Set() };
        e.style = this.npcStyle(seed, { tie: role === 'researcher' && r() < 0.5 ? ACCENTS[seed % ACCENTS.length] : null });
        e.carryWalk = r() < 0.25 ? 'paper' : r() < 0.2 ? 'mug' : null;
        this.ents.set(id, e);
      }
    }

    /** a few sessions bring their family to the park: spouse + kids on a picnic mat */
    syncFamilies() {
      const S = this.S;
      if (!S || !S.park) return;
      const mats = S.park.mats;
      const live = new Set();
      const mains = this.sessions.filter((s) => s.kind !== 'app').sort((a, b) => a.startedAt - b.startedAt);
      for (const [sid] of this.familyMat) if (!mains.some((s) => s.id === sid)) this.familyMat.delete(sid);
      for (const s of mains) {
        if (AIO.hash(s.id + ':fam') % 10 >= 6) continue;
        if (!this.familyMat.has(s.id)) {
          const usedM = new Set(this.familyMat.values());
          const free = mats.findIndex((_, i) => !usedM.has(i));
          if (free < 0) continue;
          this.familyMat.set(s.id, free);
        }
        const mi = this.familyMat.get(s.id);
        const h = AIO.hash(s.id + ':kids');
        const members = [];
        if (h % 3 !== 0) members.push({ k: 'spouse', scale: 0.96 });
        const kids = 1 + (h % 2) + (h % 7 === 0 ? 1 : 0);
        for (let k = 0; k < kids; k++) members.push({ k: 'kid' + k, scale: 0.6 + ((h >> (k + 2)) % 3) * 0.04, kid: true });
        members.forEach((m, j) => {
          const id = `F:${s.id}:${m.k}`;
          live.add(id);
          let e = this.ents.get(id);
          if (!e) {
            const seat = mats[mi].seats[1 + (j % 3)];
            const seed = AIO.hash(id) % 997;
            const pv = AIO.provider(s.provider);
            e = { id, kind: 'family', sid: s.id, kid: !!m.kid, mat: mi, seatIdx: 1 + (j % 3), x: seat.x, y: seat.y, lv: 0, dir: seat.face, pose: 'sit', plan: [], speed: m.kid ? 2.6 : 2.0, alpha: this.first ? 1 : 0, entering: !this.first, scale: m.scale, spot: seat, seed, nextAt: this.t + 3 + (seed % 9), reported: new Set() };
            e.style = this.npcStyle(seed, { yarn: (seed % 2) ? pv.yarn : undefined, accent: m.kid ? ['#f07a8a', '#7ab8f5', '#f6c445', '#9fd8b0'][seed % 4] : pv.accent, hat: m.kid ? ['bow', 'cap', 'beanie', null][seed % 4] : undefined, balloon: ['#e5534b', '#4e7cf6', '#f2c230', '#a67be0'][seed % 4] });
            this.ents.set(id, e);
          }
          e.s = s;
        });
      }
      for (const [id, e] of this.ents) if (e.kind === 'family' && !live.has(id)) { e.fading = true; e.plan = []; }
    }

    ambientNext(e) {
      const S = this.S, t = this.t, r = Math.random;
      if (e.kind === 'npc') {
        const n = e.def;
        if (!n.patrol || !n.patrol.length) return null;
        e.pi = (e.pi + 1) % n.patrol.length;
        const sp = n.patrol[e.pi];
        return { spot: sp, dwell: e.pi === 0 ? 14 + r() * 12 : 4 + r() * 7, carry: n.walkCarry || n.carry || null, say: n.say };
      }
      if (e.kind === 'family') {
        const mat = S.park.mats[e.mat];
        const v = r();
        if (e.kid && v < 0.5 && S.park.play.length) { const p = S.park.play[Math.floor(r() * S.park.play.length)]; return { spot: p, dwell: 8 + r() * 14, carry: p.ball ? 'ball' : null, keep: e.balloon }; }
        if (v < 0.72) return { spot: mat.seats[e.seatIdx], dwell: 10 + r() * 16 };
        const foods = S.park.wander.filter((w) => w.food);
        if (v < 0.86 && foods.length) { const f = foods; const w = f[Math.floor(r() * f.length)]; return { spot: { lv: 0, ...w, pose: 'stand' }, dwell: 4 + r() * 3, after: w.food === 'icecream' ? 'icecream' : w.food === 'coffee' ? 'mug' : null }; }
        const w = S.park.wander[Math.floor(r() * S.park.wander.length)];
        if (!w) return { spot: mat.seats[e.seatIdx], dwell: 10 };
        return { spot: { lv: 0, ...w, pose: 'stand' }, dwell: 3 + r() * 5 };
      }
      if (e.kind === 'pet') {
        const P0 = PET[e.species], area = S.petArea || [];
        const cx = e.near ? e.near[0] : e.x, cy = e.near ? e.near[1] : e.y;
        let to = null;
        for (let k = 0; k < 12 && !to; k++) { const a = area[Math.floor(r() * area.length)]; if (a && Math.hypot(a[0] - cx, a[1] - cy) < P0.roam) to = a; }
        if (!to) return { spot: { lv: 0, x: e.x, y: e.y, pose: 'stand' }, dwell: 3 };
        return { spot: { lv: 0, x: to[0], y: to[1], pose: 'stand', face: e.dir }, dwell: P0.dwell[0] + r() * (P0.dwell[1] - P0.dwell[0]), say: r() < 0.22 ? P0.say : null };
      }
      if (e.kind === 'walker') {
        const near = (list, R) => { for (let k = 0; k < 8; k++) { const c = list[Math.floor(r() * list.length)]; if (c && Math.abs(c.x - e.x) + Math.abs(c.y - e.y) < R) return c; } return null; };
        const here = S.levels[e.lv || 0];
        // inside a building: mostly head back out (to a bench / another building), sometimes change seat
        if ((e.lv || 0) !== 0 && r() < 0.25) { const sp = this.freeSpot(e.lv, e); if (sp) return { spot: sp, dwell: 20 + r() * 40 }; }
        if (r() < 0.55) {
          const bs = S.buildings.filter((b) => !b.core && Math.abs(b.x + b.W / 2 - (e.x + (here.ox || 0))) + Math.abs(b.y + b.H / 2 - (e.y + (here.oy || 0))) < 110);
          const b = bs[Math.floor(r() * bs.length)];
          const sp = b && this.freeSpot(b.levels[0], e);
          if (sp) return { spot: sp, dwell: 25 + r() * 60 };
        }
        if (r() < 0.55) { const d = near(S.campusDoors, 90); if (d) return { spot: { ...d, pose: 'stand' }, door: d, dwell: 0 }; }
        const sp = near(this.outSpots || (this.outSpots = S.spots.filter((x) => (x.lv || 0) === 0)), 70);
        if (sp && !this.claims.spot.has(sp)) { this.claims.spot.set(sp, e.id); e.spotClaim = sp; return { spot: sp, dwell: 12 + r() * 30 }; }
        const d = near(S.campusDoors, 120) || S.campusDoors[0];
        return { spot: { ...d, pose: 'stand', face: '+y' }, dwell: 3 + r() * 6 };
      }
      return null;
    }

    /** an unclaimed seat/spot inside level lv (claimed for e) */
    freeSpot(lv, e) {
      const by = this.spotsByLv || (this.spotsByLv = (() => { const m = new Map(); for (const s of this.S.spots) { const k = s.lv || 0; if (!m.has(k)) m.set(k, []); m.get(k).push(s); } return m; })());
      const list = by.get(lv);
      if (!list || !list.length) return null;
      for (let k = 0; k < 6; k++) { const sp = list[Math.floor(Math.random() * list.length)]; if (!this.claims.spot.has(sp)) { this.claims.spot.set(sp, e.id); e.spotClaim = sp; return sp; } }
      return null;
    }

    stepAmbient(e, t) {
      if (e.kind === 'walker' && e.hidden) {
        if (t < e.nextAt) return;
        if (this.budget <= 0) return;
        const d0 = this.S.campusDoors[Math.floor(Math.random() * this.S.campusDoors.length)] || e.door;
        e.hidden = false; e.lv = 0; e.x = d0.x; e.y = d0.y; e.alpha = 0; e.entering = true;
      }
      if (t < (e.nextAt || 0) || this.budget <= 0) return;
      // a paused session sits with its family: they gather round the mat
      if (e.kind === 'family') {
        const parent = this.ents.get('S:' + e.sid);
        if (parent && parent.spot && parent.spot.family && !parent.plan.length && e.spot !== this.S.park.mats[e.mat].seats[e.seatIdx] && Math.random() < 0.6) {
          this.budget--;
          const seat = this.S.park.mats[e.mat].seats[e.seatIdx];
          this.goTo(e, seat, () => { e.nextAt = t + 20 + Math.random() * 20; e.carry = null; });
          return;
        }
      }
      if (e.spotClaim) { this.claims.spot.delete(e.spotClaim); e.spotClaim = null; }
      const nx = this.ambientNext(e);
      if (!nx) { e.nextAt = t + 30; return; }
      this.budget--;
      e.walkCarry = nx.carry || (e.kind === 'walker' ? e.carryWalk : null) || (e.kind === 'family' && e.kid && e.seed % 3 === 0 ? 'balloon' : null) || e.after || null;
      e.carry = e.walkCarry;
      this.goTo(e, nx.spot, () => {
        e.carry = nx.spot.carry || (e.kind === 'family' && e.kid && e.seed % 3 === 0 ? 'balloon' : e.walkCarry === 'mop' ? null : e.walkCarry);
        if (nx.after) { e.after = nx.after; e.carry = nx.after; } else if (e.after && Math.random() < 0.5) e.after = null;
        if (nx.say && Math.random() < 0.5) e.say = { text: nx.say, until: this.t + 3 };
        if (nx.door) { e.door = nx.door; e.hide = true; return; }
        e.nextAt = this.t + nx.dwell;
      });
    }

    // ------------------------------------------------------------ spots
    claim(map, list, e, field) {
      if (e[field] && map.get(e[field]) === e.id) return e[field];
      if (!list || !list.length) return null;
      const start = e.seed % list.length;
      for (let i = 0; i < list.length; i++) {
        const sp = list[(start + i) % list.length];
        if (!map.has(sp)) { map.set(sp, e.id); e[field] = sp; return sp; }
      }
      return null;
    }
    release(map, e, field) { if (e[field] && map.get(e[field]) === e.id) map.delete(e[field]); e[field] = null; }

    /**
     * 회의 자리: 회의실(room) 단위로 모인다. 팀원은 팀장이 잡은 방으로, 하네스 팀장은 팀이 다 앉을 수 있는 빈 방(회의 전용층 우선),
     * 혼자 회의하는 세션은 이미 회의 중인 방부터 채운다. room 정보가 없는 맵은 예전처럼 아무 자리.
     */
    meetSpot(e) {
      const M = this.S.meeting, map = this.claims.meet;
      if (e.meet && map.get(e.meet) === e.id) return e.meet;
      if (!M.length) return null;
      if (!M.some((sp) => sp.room)) return this.claim(map, M, e, 'meet');
      const rooms = new Map();
      for (const sp of M) {
        const k = sp.room || '-';
        if (!rooms.has(k)) rooms.set(k, { k, list: [], used: 0, team: false, pri: sp.pri ?? 1 });
        const R = rooms.get(k); R.list.push(sp);
        const who = map.get(sp);
        if (who) { R.used++; const o = this.ents.get(who); if (o && (o.kind === 'member' || o.s?.kind === 'harness')) R.team = true; }
      }
      const order = [...rooms.values()].sort((a, b) => a.pri - b.pri);
      let R = null;
      if (e.kind === 'member') { const lead = this.ents.get('S:' + e.sid); R = lead && lead.meet ? rooms.get(lead.meet.room) : null; }
      else if (e.s?.kind === 'harness') {
        const need = 1 + (e.s.roster || []).length;
        R = order.find((r) => r.used === 0 && r.list.length >= need) || order.find((r) => r.used === 0) || order.find((r) => r.used < r.list.length);
      } else R = order.find((r) => !r.team && r.used > 0 && r.used < r.list.length) || order.find((r) => r.used === 0) || order.find((r) => r.used < r.list.length);
      const sp = R && R.list.find((x) => !map.has(x));
      if (!sp) return null;
      map.set(sp, e.id); e.meet = sp;
      return sp;
    }

    hotSpot(e) {
      const S = this.S;
      if (e.hotKey && S.seats.get(e.hotKey)) return S.seats.get(e.hotKey);
      for (const seat of S.hot) if (!this.claims.hot.has(seat.key)) { this.claims.hot.set(seat.key, e.id); e.hotKey = seat.key; return seat; }
      const h0 = S.hot[0];
      const L = S.levels[h0.lv];
      const r = AIO.rand(e.seed);
      const [tx, ty] = AIO.layout.nearestWalkable(L, Math.floor(h0.x + r() * 4 - 1), Math.floor(h0.y + 2));
      return { lv: h0.lv, x: tx + 0.5, y: ty + 0.5, face: '-y', pose: 'stand' };
    }

    familySeat(e) {
      const mi = this.familyMat.get(e.sid);
      if (mi == null) return null;
      const s = this.S.park.mats[mi].seats[0];
      return { ...s, family: true, tag: '가족 피크닉' };
    }

    desiredSpot(e) {
      const S = this.S;
      if (e.kind === 'main') {
        const s = e.s;
        const pl = s ? placeOf(s) : 'active';
        // 빌딩 관리: 강제 배치(고정)는 무엇보다 먼저 · 원하는 동작(휴식/밖/회의/자리) 다음
        const ctl = s && s.ctl;
        if (ctl && ctl.assign && ctl.lock && pl !== 'jail' && pl !== 'dungeon' && pl !== 'vault') { const a = this.assignedSpot(ctl.assign); if (a) { e.tier = null; return a; } }   // 감옥 · 던전 · 금고가 고정 자리보다 먼저
        if (ctl && ctl.action && ctl.action !== 'auto' && pl !== 'jail' && pl !== 'vault' && pl !== 'dungeon') { const a = this.actionSpot(e, ctl.action); if (a) { e.tier = null; return a; } }
        if (S.mini && s) {
          // 귀중한 세션 → 금고 · 오래 안 쓸수록 지하휴게실 → 지하숙소 → 감옥 · 실적 좋은 세션은 휴식 때 숙소
          const idleH = (Date.now() - (s.lastActive || Date.now())) / 3.6e6;
          const valuable = pl === 'vault' || (pl === 'stopped' && (s.level || 1) >= 12);
          let tier = null;
          if (valuable) tier = 'vault';
          else if (pl === 'jail') tier = 'jail';
          else if (pl === 'dungeon') tier = S.dungeon && S.dungeon.length ? 'dungeon' : 'jail';      // 던전은 관리자가 직접 보낸 세션만
          else if (pl === 'stopped') tier = idleH < 6 ? 'underRest' : idleH < 24 ? 'underDorm' : 'jail';   // 오래 방치돼도 자동으론 감옥까지
          if (e.tier !== tier) { if (e.tierSpot && this.claims.under.get(e.tierSpot) === e.id) this.claims.under.delete(e.tierSpot); e.tierSpot = null; e.tier = tier; }
          if (tier) {
            // 자리가 다 차면 이웃한 지하층으로 (지하휴게실 ↔ 지하숙소, 감옥이 차면 숙소 · 휴게실) — 그래도 없으면 자기 책상에서 존다
            const NEXT = { underRest: ['underDorm'], underDorm: ['underRest'], jail: ['underDorm', 'underRest'] };
            for (const k of [tier, ...(NEXT[tier] || [])]) {
              const list = k === 'vault' ? S.vault : k === 'jail' ? S.jail : k === 'dungeon' ? S.dungeon : S[k];
              const sp = this.claim(this.claims.under, list, e, 'tierSpot');
              if (sp) { e.tierShown = (list || []).includes(sp) ? k : e.tierShown || tier; return sp; }
            }
          }
          if (pl === 'paused') { const d = this.dormOf(e); if (d) { e.inDorm = true; return d; } }
          e.inDorm = false;
        }
        if (pl === 'jail') { const j = this.claim(this.claims.jail, S.jail, e, 'jailSpot'); if (j) return j; } else this.release(this.claims.jail, e, 'jailSpot');
        if (pl === 'vault') { const v = this.claim(this.claims.vault, S.vault, e, 'vaultSpot'); if (v) return v; } else this.release(this.claims.vault, e, 'vaultSpot');
        if (pl === 'paused') {
          const fam = this.familySeat(e);
          if (fam) { if (!e.famSpot || e.famSpot.x !== fam.x || e.famSpot.y !== fam.y) e.famSpot = fam; return e.famSpot; }
          const r = this.claim(this.claims.rest, S.rest, e, 'rest'); if (r) return r;
        } else this.release(this.claims.rest, e, 'rest');
        if (pl === 'active' && AIO.isBusy(s?.status) && s?.activity?.type === 'meeting' && S.meeting.length) { const m = this.meetSpot(e); if (m) return m; }
        else this.release(this.claims.meet, e, 'meet');
        if (ctl && ctl.assign) { const a = this.assignedSpot(ctl.assign); if (a) return a; }
        const room = this.leadRoomSeat(e.seatKey);
        if (room) return room;
        return S.seats.get(e.seatKey);
      }
      if (e.kind === 'visitor') return this.claim(this.claims.visit, S.visitorSeats, e, 'visit') || this.claim(this.claims.rest, S.rest, e, 'rest');
      if (e.kind === 'member') {
        // 팀장이 회의실에 들어가 있으면 팀원도 같은 방으로 모인다
        const lead = this.ents.get('S:' + e.sid);
        if (lead && lead.meet && this.claims.meet.get(lead.meet) === lead.id && lead.meet.room) { const m = this.meetSpot(e); if (m) return m; }
        else this.release(this.claims.meet, e, 'meet');
        return S.seats.get(e.id);
      }
      if (e.kind === 'intern') return this.hotSpot(e);
      return null;
    }


    // ------------------------------------------------------------ 🍽️ 사 먹기: 산 음식은 파는 곳에 가서 주문하고, 밥은 식당 자리에서 먹고 돌아온다
    //   아메리카노 → 카페(1F · 루프탑 중 가까운 곳, 없으면 층 커피 바) → 들고 자리로 · 김밥 → 매점 · 그 밖의 음식 → 구내식당 배식대 → 식탁에서 먹기
    //   맵에 파는 곳 표시(S.shops)가 없으면 카페 카운터 · 배식대 · 계산대 가구 앞을 자동으로 찾는다. 그것도 없으면 예전처럼 자리에서 말풍선만.
    shopsOf() {
      const S = this.S;
      if (S._shops) return S._shops;
      const list = (S.shops || []).slice();
      if (!list.length) {
        const KIND = { cafeCounter: 'cafe', kitchenLine: 'food', ia_mealCounter: 'food', till: 'store' };
        for (const L of S.levels) for (const f of L.furniture || []) {
          const k = KIND[f.type]; if (!k || !L.W) continue;
          const w = f.w || 2;
          for (const dx of w >= 4 ? [w * 0.3, w * 0.7] : [w / 2]) {
            const gx = Math.floor(f.x + dx), gy = Math.floor(f.y + 1.6);
            const [tx, ty] = AIO.layout.nearestWalkable(L, gx, gy);
            if (Math.abs(tx - gx) + Math.abs(ty - gy) > 2) continue;
            list.push({ kind: k, lv: L.idx, x: tx + 0.5, y: ty + 0.5, face: '-y', pose: 'stand', tag: L.name });
          }
        }
      }
      S._shops = list;
      return list;
    }
    shopFor(e, item) {
      const S = this.S, all = this.shopsOf();
      if (!all.length) return null;
      const ORDER = { coffee: ['cafe', 'bar', 'store'], kimbap: ['store', 'food'] };
      const kinds = ORDER[item.id] || ['food', 'store'];
      const fi = (lv) => { const L = S.levels[lv || 0]; return L && L.floorIdx != null ? L.floorIdx : -50; };
      const here = e.lv || 0;
      for (const k of kinds) {
        const c = all.filter((sp) => sp.kind === k);
        if (!c.length) continue;
        const dist = (sp) => (sp.lv === here ? 0 : 1 + Math.abs(fi(sp.lv) - fi(here)));
        const best = Math.min(...c.map(dist));
        const near = c.filter((sp) => dist(sp) === best);
        return this.claim(this.claims.shop, near, e, 'shopSpot') || near[e.seed % near.length];
      }
      return null;
    }
    eatSeat(e, shop) {
      const S = this.S;
      let list = (S.eat || []).filter((sp) => sp.lv === shop.lv);
      if (!list.length) list = S.eat || [];
      if (!list.length) list = S.rest.filter((sp) => sp.lv === shop.lv && sp.pose === 'sit' && !this.claims.rest.has(sp));
      return this.claim(this.claims.eat, list, e, 'eatSpot');
    }
    /** 새로 산 게 있으면 심부름 시작 — true 면 이번 프레임은 심부름이 맡는다 */
    errandCheck(e) {
      const w = e.s && e.s.wallet, last = w && w.last;
      if (!last || !last.at) return false;
      if (e.buyAt == null) { e.buyAt = last.at; return false; }          // 화면을 처음 열었을 때 예전 구매는 다시 안 한다
      if (last.at <= e.buyAt) return false;
      e.buyAt = last.at;
      if (!ERRAND_FOOD.has(last.id) || Date.now() - last.at > 60000) return false;
      const pl = placeOf(e.s);
      if ((pl !== 'active' && pl !== 'paused') || e.tier || AIO.isUrgent(e.s.status)) return false;   // 감옥 · 금고 · 중단 · 결정 대기 중엔 자리에서 받기만
      const item = { id: last.id, icon: last.icon, name: last.name };
      const shop = this.shopFor(e, item);
      if (!shop) return false;
      e.errand = { item, phase: 'go', shop };
      e.busy = true; e.carry = null; e.carryUntil = 0;
      this.goTo(e, { ...shop, pose: 'stand' }, () => {
        if (!e.errand) return;
        e.errand.phase = 'order';
        e.say = { text: `${item.icon} ${T(item.name)} ${T('주세요!')}`, until: this.t + 2.4 };
        e.waitUntil = this.t + 2.8;
        e.afterWait = () => {
          if (!e.errand) return;
          this.release(this.claims.shop, e, 'shopSpot');
          e.say = { text: `${item.icon} ${T(item.name)} ${T('샀어요!')}`, until: this.t + 2.6 };
          const seat = item.id !== 'coffee' && this.eatSeat(e, shop);
          if (!seat) { this.endErrand(e, item.id === 'coffee' ? 'mug' : 'tray', item.id === 'coffee' ? 45 : 20); return; }
          e.carry = 'tray'; e.errand.phase = 'carry';
          this.goTo(e, seat, () => {
            if (!e.errand) return;
            e.errand.phase = 'eat';
            e.waitUntil = this.t + 16 + (e.seed % 9);
            e.afterWait = () => { this.release(this.claims.eat, e, 'eatSpot'); e.say = { text: T('😋 잘 먹었습니다!'), until: this.t + 2.5 }; this.endErrand(e, null, 0); };
          });
        };
      });
      return true;
    }
    endErrand(e, carry, secs) { e.errand = null; e.busy = false; e.carry = carry; e.carryUntil = carry ? this.t + secs : 0; }

    // ------------------------------------------------------------ route planning (floors, doors, elevators)
    neighbours(lv) {
      const S = this.S, out = [];
      for (const d of S.doors) {
        if (d.a.lv === lv) out.push({ to: d.b.lv, type: 'door', from: d.a, land: d.b, bld: d.bld });
        if (d.b.lv === lv) out.push({ to: d.a.lv, type: 'door', from: d.b, land: d.a, bld: d.bld });
      }
      const L = S.levels[lv];
      if (L.elev) for (const M of S.levels) if (M !== L && M.bld === L.bld && M.elev) out.push({ to: M.idx, type: 'elev' });
      return out;
    }
    route(from, to) {
      if (from === to) return [];
      const prev = new Map([[from, null]]), q = [from];
      while (q.length) {
        const cur = q.shift();
        if (cur === to) break;
        for (const n of this.neighbours(cur)) if (!prev.has(n.to)) { prev.set(n.to, { lv: cur, hop: n }); q.push(n.to); }
      }
      if (!prev.has(to)) return null;
      const hops = [];
      for (let c = to; prev.get(c); c = prev.get(c).lv) hops.unshift({ ...prev.get(c).hop, fromLv: prev.get(c).lv });
      return hops;
    }

    walkSteps(lv, x, y, tx, ty, finalPt) {
      const p = AIO.layout.path(this.S.levels[lv], x, y, tx, ty);
      if (!p) return [{ k: 'fade', to: 0 }, { k: 'tp', lv, x: finalPt ? finalPt[0] : tx + 0.5, y: finalPt ? finalPt[1] : ty + 0.5 }, { k: 'fade', to: 1 }];
      const pts = p.slice();
      if (finalPt) pts.push(finalPt);
      return [{ k: 'walk', pts, lv }];
    }

    plan(e, spot) {
      const steps = [];
      const hops = this.route(e.lv || 0, spot.lv || 0);
      const Ls = this.S.levels;
      let cur = { lv: e.lv || 0, x: e.x, y: e.y };
      if (e.spot && e.spot.approach && !e.plan.length) { steps.push({ k: 'step', x: e.spot.approach[0] + 0.5, y: e.spot.approach[1] + 0.5 }); cur = { lv: cur.lv, x: e.spot.approach[0] + 0.5, y: e.spot.approach[1] + 0.5 }; }
      if (!hops) return [{ k: 'fade', to: 0 }, { k: 'tp', lv: spot.lv || 0, x: spot.x, y: spot.y }, { k: 'fade', to: 1 }];
      for (const h of hops) {
        if (h.type === 'door') {
          steps.push(...this.walkSteps(cur.lv, cur.x, cur.y, Math.floor(h.from.x), Math.floor(h.from.y), [h.from.x, h.from.y]));
          steps.push({ k: 'door', bld: h.bld }, { k: 'fade', to: 0, d: 0.22 }, { k: 'tp', lv: h.land.lv, x: h.land.x, y: h.land.y }, { k: 'door', bld: h.bld }, { k: 'fade', to: 1, d: 0.22 });
          cur = { lv: h.land.lv, x: h.land.x, y: h.land.y };
        } else {
          const car = e.seed % 2;
          const A0 = Ls[cur.lv].elev[car], B0 = Ls[h.to].elev[car];
          const floors = Math.abs(Ls[h.to].floorIdx - Ls[cur.lv].floorIdx) || 1;
          steps.push(...this.walkSteps(cur.lv, cur.x, cur.y, Math.floor(A0.hall.x), Math.floor(A0.hall.y), [A0.hall.x, A0.hall.y]));
          steps.push({ k: 'face', dir: '-y' }, { k: 'call', lv: cur.lv, car }, { k: 'step', x: A0.cabin.x, y: A0.cabin.y, cab: true }, { k: 'face', dir: '+y' }, { k: 'wait', d: 0.35 },
            { k: 'close', lv: cur.lv, car }, { k: 'ride', lvs: [cur.lv, h.to], car, d: 0.5 + 0.3 * floors },
            { k: 'tp', lv: h.to, x: B0.cabin.x, y: B0.cabin.y, dir: '+y', cab: true }, { k: 'call', lv: h.to, car }, { k: 'step', x: B0.hall.x, y: B0.hall.y, cab: false }, { k: 'release', lv: h.to, car });
          cur = { lv: h.to, x: B0.hall.x, y: B0.hall.y };
        }
      }
      const ap = spot.approach || [Math.floor(spot.x), Math.floor(spot.y)];
      steps.push(...this.walkSteps(cur.lv, cur.x, cur.y, ap[0], ap[1], [spot.x, spot.y]));
      return steps;
    }

    goTo(e, spot, cb) {
      if (!spot) return;
      e.plan = this.plan(e, spot);
      e.spot = spot;
      e.onArrive = cb || null;
      e.pose = 'walk';
    }

    leave(e) {
      e.leaving = true; e.busy = true;
      if (e.errand) { e.errand = null; e.waitUntil = 0; e.afterWait = null; this.release(this.claims.shop, e, 'shopSpot'); this.release(this.claims.eat, e, 'eatSpot'); }
      for (const [k, f] of [['rest', 'rest'], ['meet', 'meet'], ['visit', 'visit'], ['jail', 'jailSpot'], ['vault', 'vaultSpot']]) this.release(this.claims[k], e, f);
      if (e.hotKey) { this.claims.hot.delete(e.hotKey); e.hotKey = null; }
      this.goTo(e, { ...this.S.door, pose: 'stand' }, () => { e.fading = true; });
    }

    reportTo(e, then) {
      const lead = this.ents.get('S:' + e.sid);
      e.busy = true; e.pendingReport = false; e.carry = 'paper';
      let spot = null;
      const spots = lead && lead.spot && lead.spot.reports ? lead.spot.reports : this.S.reportSpots.get('S:' + e.sid);
      if (spots && lead && (lead.spot === this.S.seats.get(lead.seatKey) || (lead.spot && lead.spot.reports))) spot = spots[e.seed % spots.length];
      if (!spot) { e.carry = null; e.busy = false; then && then(); return; }
      this.goTo(e, { ...spot, pose: 'stand' }, () => {
        e.say = { text: '📄 보고드려요!', until: this.t + 2.6 };
        if (lead) { lead.heartUntil = this.t + 2.8; lead.reply = { text: e.kind === 'intern' ? '👍 고마워요!' : '👍 수고했어요', until: this.t + 3 }; }
        e.waitUntil = this.t + 2.6;
        e.afterWait = () => { e.carry = null; e.busy = false; then && then(); };
      });
    }

    elevState(lv, car) {
      const k = lv + ':' + car;
      let s = this.elev.get(k);
      if (!s) { s = { open: 0, hold: 0, until: 0, movingUntil: 0 }; this.elev.set(k, s); }
      return s;
    }

    /** run one plan step; true when it is finished */
    step(e, s, dt, t) {
      switch (s.k) {
        case 'walk': {
          e.pose = 'walk';
          const OUT = this.S.levels[0];
          while (s.pts.length) {
            const [tx, ty] = s.pts[0];
            // wait at the curb until the walk signal
            if ((e.lv || 0) === 0 && OUT.cwAt) {
              const ni = Math.floor(ty) * OUT.W + Math.floor(tx), ci = Math.floor(e.y) * OUT.W + Math.floor(e.x);
              const cw = OUT.cwAt[ni];
              if (cw >= 0 && OUT.cwAt[ci] < 0 && this.light(cw) !== 'r') {
                if (!e.cwWait) e.cwWait = t;
                if (t - e.cwWait < 14) { e.pose = 'stand'; return false; }
              } else if (OUT.cwAt[ci] < 0) e.cwWait = 0;
            }
            const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy), st = e.speed * dt;
            if (d > 0.01) e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? '+x' : '-x') : (dy > 0 ? '+y' : '-y');
            if (d <= st) { e.x = tx; e.y = ty; s.pts.shift(); dt -= d / e.speed; if (dt <= 0) break; continue; }
            e.x += (dx / d) * st; e.y += (dy / d) * st;
            break;
          }
          return !s.pts.length;
        }
        case 'step': {
          e.pose = 'walk';
          const dx = s.x - e.x, dy = s.y - e.y, d = Math.hypot(dx, dy), st = e.speed * 0.7 * dt;
          if (d > 0.01) e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? '+x' : '-x') : (dy > 0 ? '+y' : '-y');
          if (d <= st) { e.x = s.x; e.y = s.y; if (s.cab !== undefined) e.inCab = s.cab; return true; }
          e.x += (dx / d) * st; e.y += (dy / d) * st;
          if (s.cab === true) e.inCab = true;
          return false;
        }
        case 'wait': e.pose = 'stand'; if (!s.until) s.until = t + s.d; return t >= s.until;
        case 'face': e.dir = s.dir; return true;
        case 'call': { e.pose = 'stand'; const el = this.elevState(s.lv, s.car); if (!s.started) { el.hold++; s.started = true; } return el.open > 0.95; }
        case 'close': { e.pose = 'stand'; const el = this.elevState(s.lv, s.car); if (!s.started) { el.hold = Math.max(0, el.hold - 1); el.until = 0; s.started = true; s.until = t + 2.5; } return el.open < 0.05 || t > s.until; }
        case 'ride': { if (!s.until) { s.until = t + s.d; for (const lv of s.lvs) this.elevState(lv, s.car).movingUntil = t + s.d + 0.4; } return t >= s.until; }
        case 'release': { const el = this.elevState(s.lv, s.car); el.hold = Math.max(0, el.hold - 1); el.until = t + 0.9; e.inCab = false; return true; }
        case 'tp': e.lv = s.lv; e.x = s.x; e.y = s.y; if (s.dir) e.dir = s.dir; if (s.cab !== undefined) e.inCab = s.cab; return true;
        case 'door': this.doorOpen.set(s.bld, t + 1.2); return true;
        case 'fade': { const d = s.d || 0.25; if (s.to === 0) { e.alpha = Math.max(0, e.alpha - dt / d); return e.alpha <= 0; } e.alpha = Math.min(1, e.alpha + dt / d); return e.alpha >= 1; }
      }
      return true;
    }

    // ------------------------------------------------------------ traffic: lights, cars, the campus bus, dock trucks
    light(cid) {
      const c = this.S.traffic.cross[cid];
      if (!c || !c.light) return 'r';
      const p = (this.t + c.phase) % 24;
      return p < 14 ? 'g' : p < 16.5 ? 'y' : 'r';
    }

    initTraffic() {
      const S = this.S, OUT = S.levels[0];
      if (!S.traffic) { this.cars = []; this.bus = null; this.trucks = []; this.dockOpen = []; return; }
      this.cars = [];
      const colors = ['#4e7cf6', '#f2c230', '#e5534b', '#ffffff', '#3b3f45', '#3fb27f', '#a67be0', '#e9a23b'];
      const kinds = ['car', 'car', 'car', 'taxi', 'car', 'car', 'police', 'car'];
      let n = 0;
      S.traffic.roads.forEach((r, ri) => {
        const len = r.axis === 'x' ? r.w : r.d;
        if (len < 40) return;
        const lanes = (r.axis === 'x' ? r.d : r.w) === 3 ? (r.axis === 'x' ? [[-1, r.y + 0.25], [1, r.y + 1.95]] : [[1, r.x + 0.25], [-1, r.x + 1.95]])
          : r.axis === 'x' ? [[-1, r.y + 0.1], [-1, r.y + 1.1], [1, r.y + 2.1], [1, r.y + 3.1]] : [[1, r.x + 0.1], [1, r.x + 1.1], [-1, r.x + 2.1], [-1, r.x + 3.1]];
        lanes.forEach(([dir, off], li) => {
          if (r.name === '대학로' && li === 3) return;   // the bus lane
          const k = Math.max(1, Math.floor(len / ((r.axis === 'x' ? r.d : r.w) === 3 ? 90 : 62)));
          for (let i = 0; i < k; i++) {
            const a0 = r.axis === 'x' ? r.x : r.y;
            this.cars.push({ road: ri, lane: li, dir, off, axis: r.axis, a0, a1: a0 + len, s: a0 + (i + 0.3 + (li * 0.17)) * len / k, v: 0, vmax: 3.2 + ((n * 37) % 10) / 10, color: colors[n % colors.length], kind: kinds[n % kinds.length], len: 1.6 });
            n++;
          }
        });
      });
      const RS = S.traffic.roads.find((r) => r.name === '대학로');
      this.bus = RS ? { y: RS.y + 2.78, x: -10, v: 0, stopUntil: 0, served: new Set(), wait: 0 } : null;
      // dock trucks: in from the east on 대학로, up the lot lane, reverse onto the overhead door, load, out the other lane
      this.trucks = [];
      const Y = S.yard;
      if (Y) Y.bays.forEach((by, i) => this.trucks.push(this.truckRoute(i, by, ['#e5534b', '#4e7cf6', '#3fb27f', '#e9a23b'][i % 4], ['box', 'semi', 'box', 'semi'][i % 4])));
      this.dockOpen = (Y ? Y.bays : []).map(() => 0);
      void OUT;
    }

    truckRoute(bay, by, color, kind) {
      const Y = this.S.yard, W = this.S.levels[0].W, L = A6.truck.len(kind);
      const ry = Y.roadY, yy = by + 0.7;
      const segs = [];
      const seg = (axis, dir, from, to, speed, extra = {}) => segs.push({ axis, dir, from, to, d: Math.hypot(to[0] - from[0], to[1] - from[1]) / speed, ...extra });
      const pause = (axis, dir, at, d, extra = {}) => segs.push({ axis, dir, from: at, to: at, d, ...extra });
      seg('x', -1, [W + 4, ry + 0.3], [Y.laneIn - 0.2, ry + 0.3], 4);
      pause('y', -1, [Y.laneIn, ry - 0.2], 0.8);
      seg('y', -1, [Y.laneIn, ry - 0.2], [Y.laneIn, yy - L + 1.6 + 0.0], 3);
      pause('x', 1, [Y.laneIn - L + 1.6, yy], 1.2);
      seg('x', 1, [Y.laneIn - L + 1.6, yy], [Y.dockX + 0.05, yy], 1.2, { reverse: true, beep: true });
      pause('x', 1, [Y.dockX + 0.05, yy], 26, { dock: bay, loading: true });
      seg('x', 1, [Y.dockX + 0.05, yy], [Y.laneOut - L + 1.6, yy], 2.2);
      pause('y', 1, [Y.laneOut, yy - L + 1.6], 0.8);
      seg('y', 1, [Y.laneOut, yy - L + 1.6], [Y.laneOut, ry + 2.2 - L + 1.6], 3);
      pause('x', 1, [Y.laneOut - L + 1.6, ry + 2.2], 0.6);
      seg('x', 1, [Y.laneOut - L + 1.6, ry + 2.2], [W + 6, ry + 2.2], 4);
      const total = segs.reduce((s, x) => s + x.d, 0);
      return { segs, total, period: total + 18, offset: bay * 23, color, kind, L, bay };
    }
    truckAt(tr, t) {
      let k = (t + tr.offset) % tr.period;
      for (const s of tr.segs) {
        if (k <= s.d) { const f = s.d ? k / s.d : 1; return { x: s.from[0] + (s.to[0] - s.from[0]) * f, y: s.from[1] + (s.to[1] - s.from[1]) * f, axis: s.axis, dir: s.dir, seg: s, k: f }; }
        k -= s.d;
      }
      return null;
    }

    updateTraffic(dt, t) {
      const S = this.S;
      if (!S.traffic) return;
      const OUT = S.levels[0];
      // who is standing on a crosswalk right now?
      const busy = new Set();
      for (const e of this.ents.values()) if ((e.lv || 0) === 0 && e.alpha > 0.1 && !e.hidden) { const c = OUT.cwAt[Math.floor(e.y) * OUT.W + Math.floor(e.x)]; if (c >= 0) busy.add(c); }
      this.cwBusy = busy;
      const byLane = new Map();
      for (const c of this.cars) { const k = c.road * 4 + c.lane; if (!byLane.has(k)) byLane.set(k, []); byLane.get(k).push(c); }
      for (const list of byLane.values()) {
        list.sort((a, b) => (b.s - a.s) * b.dir);
        for (let i = 0; i < list.length; i++) {
          const c = list[i];
          const front = c.dir > 0 ? c.s + c.len : c.s;
          let target = c.vmax;
          const ahead = list[i - 1];
          if (ahead) { const gap = c.dir > 0 ? ahead.s - front : front - (ahead.s + ahead.len); if (gap < 0.6) target = 0; else if (gap < 3) target = Math.min(target, (gap - 0.6) * 1.6); }
          for (const cw of S.traffic.cross) {
            if (cw.road !== c.road) continue;
            const stop = c.dir > 0 ? (c.axis === 'x' ? cw.x : cw.y) - 0.8 : (c.axis === 'x' ? cw.x + cw.w : cw.y + cw.d) + 0.8;
            const dist = (stop - front) * c.dir;
            if (dist < -0.2 || dist > 5) continue;
            const red = (cw.light && this.light(cw.id) !== 'g') || busy.has(cw.id);
            if (red) target = Math.min(target, Math.max(0, dist * 1.3 - 0.1));
          }
          c.v += Math.sign(target - c.v) * Math.min(Math.abs(target - c.v), dt * 3.5);
          c.s += c.v * dt * c.dir;
          if (c.dir > 0 && c.s > c.a1 + 3) c.s = c.a0 - 3 - Math.random() * 4;
          if (c.dir < 0 && c.s < c.a0 - 3) c.s = c.a1 + 3 + Math.random() * 4;
        }
      }
      // the campus bus: west → east, stopping at every shelter
      const b = this.bus;
      if (b) {
        if (b.wait > t) { /* garage */ }
        else {
          let target = 3.2;
          const front = b.x + 4.4;
          for (const st of S.busStops) {
            const stopAt = st.x + 4.2;
            if (b.served.has(st.x)) continue;
            const d = stopAt - front;
            if (d < -0.3) { b.served.add(st.x); continue; }
            if (d < 5) target = Math.min(target, Math.max(0, d * 1.2));
            if (d < 0.15) { if (!b.stopUntil) b.stopUntil = t + 7; if (t > b.stopUntil) { b.served.add(st.x); b.stopUntil = 0; } }
          }
          for (const cw of S.traffic.cross) {
            if (S.traffic.roads[cw.road].name !== '대학로') continue;
            const d = cw.x - 0.8 - front;
            if (d < -0.2 || d > 5) continue;
            if ((cw.light && this.light(cw.id) !== 'g') || busy.has(cw.id)) target = Math.min(target, Math.max(0, d * 1.3 - 0.1));
          }
          b.v += Math.sign(target - b.v) * Math.min(Math.abs(target - b.v), dt * 2.5);
          b.x += b.v * dt;
          b.doors = b.v < 0.05 && b.stopUntil > 0;
          if (b.x > OUT.W + 6) { b.x = -10; b.served.clear(); b.wait = t + 20; }
        }
      }
      // dock doors follow the trucks
      this.trucks.forEach((tr, i) => {
        const p = this.truckAt(tr, t);
        const want = p && (p.seg.loading || (p.seg.reverse && p.k > 0.4)) ? 1 : 0;
        this.dockOpen[tr.bay] = (this.dockOpen[tr.bay] || 0) + Math.sign(want - (this.dockOpen[tr.bay] || 0)) * Math.min(Math.abs(want - (this.dockOpen[tr.bay] || 0)), dt * 0.8);
        void i;
      });
      const Y = S.yard;
      if (Y) {
        const near = this.trucks.some((tr) => { const p = this.truckAt(tr, t); return p && p.y > Y.gateY - 6 && p.y < Y.roadY + 1 && p.axis === 'y'; });
        this.gateOpen = (this.gateOpen || 0) + Math.sign((near ? 1 : 0) - (this.gateOpen || 0)) * Math.min(Math.abs((near ? 1 : 0) - (this.gateOpen || 0)), dt * 1.5);
      }
    }

    update(dt, t) {
      this.t = t;
      if (!this.S) return;
      this.updateLeadRooms();
      if (!this.trafficReady || this.trafficFor !== this.S) { this.initTraffic(); this.trafficReady = true; this.trafficFor = this.S; }
      this.updateTraffic(dt, t);
      for (const el of this.elev.values()) {
        const want = el.hold > 0 || t < el.until ? 1 : 0;
        el.open += Math.sign(want - el.open) * Math.min(Math.abs(want - el.open), dt * 1.8);
      }
      this.budget = 6;
      for (const [id, e] of this.ents) {
        if (e.entering) { e.alpha = Math.min(1, e.alpha + dt * 2.5); if (e.alpha >= 1) e.entering = false; }
        if (e.hide) { e.alpha -= dt * 2.5; if (e.alpha <= 0) { e.alpha = 0; e.hide = false; e.hidden = true; e.nextAt = t + 10 + Math.random() * 40; e.plan = []; if (e.spotClaim) { this.claims.spot.delete(e.spotClaim); e.spotClaim = null; } } continue; }
        if (e.fading) { e.alpha -= dt * 2.5; if (e.alpha <= 0) { this.ents.delete(id); if (this.selected === id) this.selected = null; continue; } }
        if (e.hidden) { this.stepAmbient(e, t); continue; }
        if (e.follow) {
          const h = this.ents.get(e.follow);
          if (!h) continue;
          const v = DIRV[h.dir] || [0, 1], gap = 0.5 * (e.k + 1);
          const tx = h.x - v[0] * gap + Math.sin(t * 3 + e.k) * 0.12, ty = h.y - v[1] * gap + Math.cos(t * 2.6 + e.k) * 0.12;
          const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy), st = e.speed * dt;
          e.moving = d > 0.08;
          if (e.moving) { const m = Math.min(1, st / d); e.x += dx * m; e.y += dy * m; e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? '+x' : '-x') : (dy > 0 ? '+y' : '-y'); }
          continue;
        }
        if (e.waitUntil) {
          if (t < e.waitUntil) continue;
          const f = e.afterWait; e.waitUntil = 0; e.afterWait = null; f && f();
        }
        if (e.plan.length) {
          let guard = 0;
          while (e.plan.length && guard++ < 8 && this.step(e, e.plan[0], dt, t)) e.plan.shift();
          if (!e.plan.length) {
            e.pose = e.spot?.pose || 'stand';
            if (e.spot?.face) e.dir = e.spot.face;
            e.alpha = Math.max(e.alpha, e.fading || e.hide ? 0 : 1);
            const cb = e.onArrive; e.onArrive = null; cb && cb();
          }
          continue;
        }
        if (AMBIENT.has(e.kind)) { this.stepAmbient(e, t); continue; }
        if (e.carryUntil && this.t > e.carryUntil) { e.carry = null; e.carryUntil = 0; }   // 사 온 커피 · 도시락은 한동안 들고 있다가 내려놓는다
        if (e.busy) continue;
        if (e.kind === 'main' && this.errandCheck(e)) continue;
        if (e.pendingReport) {
          if (e.kind === 'member') { this.reportTo(e, () => this.goTo(e, this.desiredSpot(e))); continue; }
          if (e.kind === 'intern') { if (e.hotKey) { this.claims.hot.delete(e.hotKey); e.hotKey = null; } this.reportTo(e, () => this.leave(e)); continue; }
        }
        const want = this.desiredSpot(e);
        if (!want) continue;
        if (want !== e.spot || (want.lv || 0) !== (e.lv || 0) || Math.abs(e.x - want.x) > 0.05 || Math.abs(e.y - want.y) > 0.05) this.goTo(e, want);
      }
    }

    // ------------------------------------------------------------ view helpers
    night() {
      const sky = this.opts.sky;
      const h = sky === 'day' ? 12 : sky === 'night' ? 23 : sky === 'dusk' ? 18 : sky === 'dawn' ? 6.5 : new Date().getHours() + new Date().getMinutes() / 60;   // auto = 지금 시각
      // phase: 시간대 · bg: 캔버스 배경 하늘 · tint: 맵 전체에 곱하기(multiply)로 거는 빛 색 · dark: 밤 어둠 · sky: 창밖 하늘
      if (h >= 19.5 || h < 5.5) return { phase: 'night', dark: 0.3, bg: ['#141a3a', '#2c3566'], sky: ['#1d2547', '#3a4170'], bld: '#2a3052', stars: true, lamps: true, night: true };
      if (h >= 17.5) return { phase: 'dusk', dark: 0.12, tint: '#ffcfa6', bg: ['#6b5aa6', '#f7a76c'], sky: ['#f2a07b', '#f8d3a8'], bld: '#b9a1a0', lamps: true };
      if (h < 7.5) return { phase: 'dawn', dark: 0.08, tint: '#ffe4d2', bg: ['#a9b9e8', '#ffd9bd'], sky: ['#f7c59f', '#fde6c8'], bld: '#c9b6a6', lamps: true };
      return { phase: 'day', dark: 0, bg: ['#8ec8f2', '#e4f3fc'], sky: ['#a9d4f5', '#e3f2fb'], bld: '#c8d3dc', cloud: true };
    }

    /** 🌗 시간대 빛: 노을 · 아침은 따뜻한 색을 곱하고, 밤은 남색으로 어둡게 — 화면 전체(배경 하늘 포함)에 한 번에 */
    drawLight(ctx, N) {
      if ((!N.tint && !(N.dark > 0)) || !ctx.canvas) return;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const w = ctx.canvas.width, h = ctx.canvas.height;
      if (N.tint) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = N.tint; ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = 'source-over'; }
      if (N.night) { ctx.fillStyle = `rgba(22,26,58,${N.dark})`; ctx.fillRect(0, 0, w, h); }
      ctx.restore();
    }

    ownerOfSeat(key) {
      if (!key) return null;
      if (key.startsWith('H:')) return this.ents.get(this.claims.hot.get(key));
      return this.ents.get(key);
    }
    statusOf(e) { return e.kind === 'member' || e.kind === 'intern' ? e.status : e.s?.status; }

    screenFor(f) {
      const e = this.ownerOfSeat(f.seatKey);
      const base = { t: this.t, seed: f.seed || 1 };
      if (!e || AMBIENT.has(e.kind)) {
        if (e && e.kind === 'npc') return { ...base, act: 'edit', on: true, state: 'run', accent: e.style.accent, logo: '' };
        return { ...base, act: 'off', on: false, state: 'off' };
      }
      const pv = AIO.provider(e.s?.provider);
      const seat = this.S.seats.get(f.seatKey) || this.S.seats.get(e.hotKey);
      const atDesk = e.spot === seat && !e.plan.length;
      const extra = { accent: e.style?.accent || pv.accent, logo: pv.logo };
      const st = this.statusOf(e);
      if (!atDesk) return { ...base, ...extra, act: st === 'sleeping' ? 'sleep' : 'idle', on: true, state: AIO.isUrgent(st) ? 'alert' : 'idle' };
      let act = 'idle', state = 'idle';
      if (st === 'sleeping') { act = 'sleep'; state = 'off'; }
      else if (AIO.isUrgent(st)) { act = 'ask'; state = 'alert'; }
      else if (st === 'done') { act = 'done'; state = 'done'; }
      else if (st === 'thinking') { act = 'think'; state = 'run'; }
      else if (st === 'delegating') { act = 'delegate'; state = 'run'; }
      else if (st === 'working' || st === 'tool') { const a = e.kind === 'main' ? e.s.activity : e.agent?.activity; act = ACT_SCREEN[a?.type] || 'edit'; state = 'run'; }
      return { ...base, ...extra, act, on: act !== 'sleep', state };
    }

    anim(e) {
      const t = this.t;
      if (e.plan.length) return 'idle';
      if (e.kind === 'npc') return e.spot === e.def.home || (e.pi === 0 && !e.plan.length) ? (e.def.anim || 'idle') : 'idle';
      if (e.kind === 'family') return e.kid && e.spot && !e.spot.seats && (e.spot.ball || e.spot.slide) ? 'cheer' : 'idle';
      if (e.kind === 'walker') return 'idle';
      if (e.errand && e.errand.phase === 'eat') return 'idle';
      if (e.waitUntil) return e.kind === 'main' ? 'cheer' : 'wave';
      if (e.kind === 'member') return e.status === 'working' ? (e.agent?.activity?.type === 'think' ? 'think' : 'type') : e.s?.status === 'sleeping' || placeOf(e.s || {}) === 'stopped' ? 'sleep' : 'idle';
      if (e.kind === 'intern') return e.status === 'working' ? 'type' : 'idle';
      const pl = placeOf(e.s || {});
      if (pl === 'vault') return 'sleep';
      const st = e.s?.status;
      if (e.reply && t < e.reply.until) return 'cheer';
      switch (st) {
        case 'tool': case 'working': return e.meet ? 'point' : 'type';
        case 'thinking': return 'think';
        case 'delegating': return 'point';
        case 'waiting_input': case 'waiting_permission': return 'wave';
        case 'done': return t < (e.cheerUntil || 0) ? 'cheer' : 'idle';
        case 'sleeping': return 'sleep';
        default: return 'idle';
      }
    }

    levelOf(e) { return this.S.levels[e.lv || 0]; }
    /** campus-space projection for a point on a level (tower floors sit at their own height) */
    PL(lv, x, y, z = 0) { const L = this.S.levels[lv || 0]; return P(x + L.ox, y + L.oy, z + (L.zBase || 0)); }
    buildingOf(lv) { const L = this.S.levels[lv || 0]; return this.S.buildings.find((b) => b.id === L.bld) || null; }
    displayedLevel(b) {
      if (!b) return null;
      if (b.levels.length === 1) return b.levels[0];
      return this.view.floor != null && b.levels.includes(this.view.floor) ? this.view.floor : b.levels[0];
    }
    visible(e) { return e.alpha > 0.02 && !e.hidden && this.shown.has(e.lv || 0); }

    // ------------------------------------------------------------ static layers
    buildCache(L) {
      const lb = this.levelBox(L);
      const bw = lb.maxX - lb.minX, bh = lb.maxY - lb.minY;
      const X = AIO.pxw && AIO.pxw.on() ? AIO.pxw : null;      // 👾 도트 세트: 도트 하나(2.6px)가 캔버스 1px
      const s = X ? 1 / X.PX : Math.min(2.2, 5200 / Math.max(bw, bh));
      const c = document.createElement('canvas');
      c.width = Math.ceil(bw * s); c.height = Math.ceil(bh * s);
      const g = c.getContext('2d');
      g.setTransform(s, 0, 0, s, -lb.minX * s, -lb.minY * s);
      const W = L.W, H = L.H;
      const floorBase = L.floorColor || { wood: '#eadcc3', concrete: '#c9c8c3', deck: '#c9a57a', marble: '#f1eee8' }[L.floor] || '#eadcc3';
      A2.slab(g, L, L.outer === 'factory' ? '#9aa2a9' : L.outer === 'roof' ? '#b9b1a4' : '#d4c3a3');
      A2.floor(g, 0, 0, W, H, L.floor, floorBase, L.idx + 3);
      if (X) X.floorTex(g, 0, 0, W, H, L.floor);
      for (const p of L.patches) { A2.floor(g, p.x, p.y, p.w, p.d, p.style, p.color, Math.round(p.x * 7 + p.y)); if (X) X.floorTex(g, p.x, p.y, p.w, p.d, p.style); }
      for (const d of L.decals || []) {
        if (d.type === 'hazard') A2.hazardRect(g, d.x, d.y, d.w, d.d);
        else if (d.type === 'lane') A2.lane(g, d.x, d.y, d.w, d.d);
        else if (d.type === 'floor') poly(g, [P(d.x, d.y), P(d.x + d.w, d.y), P(d.x + d.w, d.y + d.d), P(d.x, d.y + d.d)], d.color);
        else if (d.type === 'court') A6.court(g, d);
        else if (d.type === 'pool') A7.pool(g, d);
        else if (d.type === 'ringFloor') A7.tileSpace(g, (q) => { q.beginPath(); q.arc(d.cx, d.cy, d.R, 0, 7); q.arc(d.cx, d.cy, d.r, 0, 7, true); q.fillStyle = '#d9d3c9'; q.fill('evenodd'); q.lineWidth = 0.08; q.strokeStyle = '#ffffff'; q.beginPath(); q.arc(d.cx, d.cy, d.R - 0.05, 0, 7); q.stroke(); q.beginPath(); q.arc(d.cx, d.cy, d.r + 0.05, 0, 7); q.stroke(); });
        else A5.decal(g, d);
      }
      for (const r of L.rugs) A.rug(g, r.x, r.y, r.w, r.d, r.color, r.border);
      if (L.outer !== 'none') { A2.outerWalls(g, L, L.outer, WALL); if (X) X.wallTex(g, L, L.outer, WALL); }
      if (L.indoor) A2.outerWalls(g, { W: L.indoor.x1, H: L.indoor.y1 }, 'premium', WALL);
      const wy = L.wallY;
      if (wy && L.outer !== 'roof') {
        if (wy.plaque != null) A.plaque(g, wy.plaque, '🧶 AI 인공지능 연구원');
        if (wy.banner != null) A2.banner(g, wy.banner, '🦺 안전제일 · 검수는 다른 AI가');
        if (wy.menu != null) A3.menuBoard(g, wy.menu);
      }
      if (X) { g.setTransform(1, 0, 0, 1, 0, 0); X.crisp(c, false); }
      this.caches.set(L.idx, { c, x: lb.minX, y: lb.minY, w: bw, h: bh, hour: new Date().getHours(), px: !!X });
    }
    levelBox(L) {
      const b = [P(0, 0, 130), P(L.W, 0, 130), P(0, L.H, 0), P(L.W, L.H, -20), P(L.W, 0, -20), P(0, L.H, -20)];
      return { minX: Math.min(...b.map((p) => p[0])) - 30, maxX: Math.max(...b.map((p) => p[0])) + 30, minY: Math.min(...b.map((p) => p[1])) - 30, maxY: Math.max(...b.map((p) => p[1])) + 20 };
    }

    /** LRU bookkeeping for cached canvases */
    remember(map, key, entry) {
      entry.used = this.frame; entry.px = entry.c.width * entry.c.height;
      map.set(key, entry); this.px += entry.px;
      if (this.px > PX_BUDGET) {
        // evict least-recently drawn; never anything drawn this frame (that is what made tiles blink)
        const all = [...this.chunks.entries()].map(([k, v]) => [this.chunks, k, v]).concat([...this.sprites.entries()].map(([k, v]) => [this.sprites, k, v]));
        all.sort((a, b) => a[2].used - b[2].used);
        for (const [m, k, v] of all) { if (this.px <= PX_BUDGET * 0.75 || v.used >= this.frame) break; m.delete(k); this.px -= v.px; }
      }
      return entry;
    }

    chunk(cx, cy, s, props) {
      const key = `${cx},${cy},${s},${props ? 1 : 0}`;
      const hit = this.chunks.get(key);
      if (hit) { hit.used = this.frame; return hit; }
      if (this.chunkBuilds <= 0) {
        let best = null;
        for (const [k, v] of this.chunks) if (k.startsWith(`${cx},${cy},`) && (!best || v.s > best.s)) best = v;
        if (best) best.used = this.frame;
        return best;
      }
      this.chunkBuilds--;
      const OUT = this.S.levels[0];
      const R = { x0: cx * CH, y0: cy * CH, x1: Math.min(OUT.W, cx * CH + CH), y1: Math.min(OUT.H, cy * CH + CH), s };
      const TOP = props ? 140 : 10;
      const minX = (R.x0 - R.y1) * 32 - 40, maxX = (R.x1 - R.y0) * 32 + 40, minY = (R.x0 + R.y0) * 16 - TOP, maxY = (R.x1 + R.y1) * 16 + 30;
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil((maxX - minX) * s)); c.height = Math.max(1, Math.ceil((maxY - minY) * s));
      const g = c.getContext('2d');
      g.setTransform(s, 0, 0, s, -minX * s, -minY * s);
      g.save();
      g.beginPath(); const q = [P(R.x0, R.y0), P(R.x1, R.y0), P(R.x1, R.y1), P(R.x0, R.y1)];
      g.moveTo(q[0][0], q[0][1] - 1); g.lineTo(q[1][0] + 1.5, q[1][1]); g.lineTo(q[2][0], q[2][1] + 1); g.lineTo(q[3][0] - 1.5, q[3][1]); g.closePath();
      if (R.x1 >= OUT.W || R.y1 >= OUT.H) { g.lineTo(q[2][0], q[2][1] + 20); }
      g.clip();
      A6.ground(g, OUT, R);
      g.restore();
      const GB = (OUT.ground && OUT.ground.base) || {};
      if (R.x1 >= OUT.W) poly(g, [P(OUT.W, R.y0, 0), P(OUT.W, R.y1, 0), P(OUT.W, R.y1, -16), P(OUT.W, R.y0, -16)], GB.edge2 || '#76684d');
      if (R.y1 >= OUT.H) poly(g, [P(R.x0, OUT.H, 0), P(R.x1, OUT.H, 0), P(R.x1, OUT.H, -16), P(R.x0, OUT.H, -16)], GB.edge || '#8a7a5c');
      if (props) {
        const I = { nightInfo: { lamps: false }, rules: [], urgent: [], busyAny: false, coats: [] };
        const list = OUT.furniture.filter((f) => f.x >= R.x0 && f.x < R.x1 && f.y >= R.y0 && f.y < R.y1).sort((a, b) => sortKey(a) - sortKey(b));
        for (const f of list) this.drawFurniture(g, f, I, 0);
      }
      if (AIO.pxw && AIO.pxw.on() && Math.abs(s - 1 / AIO.pxw.PX) < 1e-6) AIO.pxw.crisp(c, false);   // 👾 도트 세트
      return this.remember(this.chunks, key, { c, x: minX, y: minY, w: maxX - minX, h: maxY - minY, s });
    }

    sprite(o, s, night) {
      const key = `${o.id},${s},${night ? 1 : 0}`;
      const hit = this.sprites.get(key);
      if (hit) { hit.used = this.frame; return hit; }
      if (this.chunkBuilds <= 0) { let best = null; for (const [k, v] of this.sprites) if (k.startsWith(o.id + ',') && (!best || v.s > best.s)) best = v; if (best) best.used = this.frame; return best; }
      this.chunkBuilds--;
      const h = (o.floors || 3) * A6.FPX + 70;
      const minX = (o.x - o.y - o.H) * 32 - 30, maxX = (o.x + o.W - o.y) * 32 + 60, minY = (o.x + o.y) * 16 - h - 40, maxY = (o.x + o.W + o.y + o.H) * 16 + 30;
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil((maxX - minX) * s)); c.height = Math.max(1, Math.ceil((maxY - minY) * s));
      const g = c.getContext('2d');
      g.setTransform(s, 0, 0, s, -minX * s, -minY * s);
      if (o.kind === 'campus' || o.kind === 'shop') A6.campusBuilding(g, { ...o, style: o.kind === 'shop' ? 'shop' : o.style, floors: o.kind === 'shop' ? 2 : o.floors, name: T(o.name) }, night);
      const px = AIO.pxw && AIO.pxw.on() && Math.abs(s - 1 / AIO.pxw.PX) < 1e-6;
      if (px) AIO.pxw.crisp(c, true);
      return this.remember(this.sprites, key, { c, x: minX, y: minY, w: maxX - minX, h: maxY - minY, s, px });
    }

    /** 층 강조 설정 (계정 옵션 › 맵 표시) — 세션 수 기준 3단계 + 외벽 효과 */
    heatCfg() {
      const h = this.opts.heat || {};
      const t = Array.isArray(h.t) && h.t.length === 3 ? h.t.map((x) => Math.max(1, +x || 1)) : [1, 5, 10];
      return { on: h.on !== false, t, speed: Math.max(0.3, Math.min(3, +h.speed || 1)), fx: { tint: true, blink: true, neon: true, count: true, wave: false, rainbow: false, ...(h.fx || {}) } };
    }
    heatOf(n, cfg = this.heatCfg()) { return !cfg.on || !n ? 0 : n >= cfg.t[2] ? 3 : n >= cfg.t[1] ? 2 : n >= cfg.t[0] ? 1 : 0; }
    floorInfo(b) {
      return b.levels.map((lv) => {
        let people = 0, busy = 0, urgent = 0;
        for (const e of this.ents.values()) {
          if ((e.lv || 0) !== lv || AMBIENT.has(e.kind)) continue;
          people++;
          const st = this.statusOf(e);
          if (AIO.isBusy(st) || st === 'working') busy++;
          if (AIO.isUrgent(st)) urgent++;
        }
        return { people, busy, urgent };
      });
    }

    // ------------------------------------------------------------ draw
    draw(ctx, cam, dpr, vw, vh) {
      const S = this.S;
      if (!S) return;
      this.cam = cam;
      const t = this.t, z = cam.z, v = this.view;
      const nightInfo = this.night();
      if (S.single) { this.drawSingle(ctx, cam, dpr, vw, vh, nightInfo); return; }
      const OUT = S.levels[0];
      ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (vw / 2 - cam.x * z), dpr * (vh / 2 - cam.y * z));
      ctx.imageSmoothingEnabled = true;
      const view = { l: cam.x - vw / 2 / z, r: cam.x + vw / 2 / z, t: cam.y - vh / 2 / z, b: cam.y + vh / 2 / z };
      this.vrect = view;
      const onScreen = (x, y, hpx = 120, wpx = 120) => { const [sx, sy] = P(x, y); return sx > view.l - wpx && sx < view.r + wpx && sy > view.t - 40 && sy - hpx < view.b + 40; };
      const low = z < 0.3;
      this.frame = (this.frame || 0) + 1;
      this.chunkBuilds = this.first ? 6 : 3;
      const fb = v.focus && S.buildings.find((x) => x.id === v.focus);
      const deep = fb && fb.base && v.floor != null && S.levels[v.floor] && S.levels[v.floor].basement;
      const dim = v.focus ? 1 - (deep ? 0.88 : 0.7) * v.t : 1;

      // ---- ground chunks
      const want = Math.min(1, z * dpr);
      let bucket = BUCKETS.reduce((b, x) => (x >= want * 0.92 ? x : b), 1);
      const pxOn = AIO.pxw && AIO.pxw.on();
      if (pxOn) bucket = Math.min(bucket, 1 / AIO.pxw.PX);          // 👾 도트 세트: 땅 · 건물도 도트 격자로
      ctx.imageSmoothingEnabled = !pxOn;
      poly(ctx, [P(0, 0), P(OUT.W, 0), P(OUT.W, OUT.H), P(0, OUT.H)], (OUT.ground && OUT.ground.base && OUT.ground.base.color) || '#a9d18e');
      ctx.globalAlpha = dim;
      const ncx = Math.ceil(OUT.W / CH), ncy = Math.ceil(OUT.H / CH);
      const order = [];
      for (let cx = 0; cx < ncx; cx++) for (let cy = 0; cy < ncy; cy++) {
        const x0 = cx * CH, y0 = cy * CH, x1 = Math.min(OUT.W, x0 + CH), y1 = Math.min(OUT.H, y0 + CH);
        const minX = (x0 - y1) * 32, maxX = (x1 - y0) * 32, minY = (x0 + y0) * 16 - 140, maxY = (x1 + y1) * 16 + 30;
        if (maxX < view.l || minX > view.r || maxY < view.t || minY > view.b) continue;
        order.push([cx, cy]);
      }
      order.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
      for (const [cx, cy] of order) { const C = this.chunk(cx, cy, bucket, low); if (C) ctx.drawImage(C.c, C.x, C.y, C.w, C.h); }
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = true;

      const urgent = this.sessions.filter((s) => AIO.isUrgent(s.status));
      const I = { nightInfo, busyAny: this.sessions.some((s) => AIO.isBusy(s.status)), rules: this.rulesText(), urgent, coats: this.sessions.slice(0, 4).map((s) => AIO.provider(s.provider).accent), low };
      const sel = this.selected && this.ents.get(this.selected);

      // ---- which interiors are on show (decides which entities are visible)
      this.shown = new Set([OUT.idx]);
      for (const b of S.buildings) {
        const focused = v.focus === b.id && v.t > 0;
        if (focused) this.shown.add(this.displayedLevel(b));
        if (b.type === 'tower' && (!focused || v.t < 0.8)) this.shown.add(b.levels[b.levels.length - 1]);
      }

      // ---- occluders (buildings) + everything outdoors, painter-sorted per building slot
      // 건물 높이: 높은 빌딩은 층수만큼 (예전엔 600px 고정이라, 20층 넘는 꼬마빌딩 옥상을 크게 확대하면 건물이 '화면 밖' 으로 판정돼 통째로 사라졌다)
      const tallOf = (o) => (o.bld && o.bld.type === 'tower' ? Math.max(600, (o.bld.levels.length - (o.bld.base || 0)) * (S.FLOOR_PX || 58) + 260) : 600);
      const occ = S.occ.filter((o) => { const [a] = P(o.x, o.y + o.H), [b2] = P(o.x + o.W, o.y); const [, top] = P(o.x, o.y, tallOf(o)); const [, bot] = P(o.x + o.W, o.y + o.H); return b2 > view.l - 50 && a < view.r + 50 && bot > view.t - 50 && top < view.b + 50; })
        .sort((a, b) => (a.x + a.W + a.y + a.H) - (b.x + b.W + b.y + b.H));
      const slots = occ.map(() => []), inner = occ.map(() => []), after = [];
      const put = (x, y, item) => {
        for (let k = 0; k < occ.length; k++) {
          const o = occ[k];
          if (o.kind === 'ring') {
            const R = o.ring, d = Math.hypot(x - R.cx, y - R.cy);
            if (d < R.R + 0.3) { inner[k].push(item); return; }
            if (x < o.x + o.W && y < o.y + o.H && x + y < R.cx + R.cy) { slots[k].push(item); return; }
            continue;
          }
          if (x < o.x + o.W && y < o.y + o.H) { slots[k].push(item); return; }
        }
        after.push(item);
      };
      for (const f of OUT.furniture) {
        if (f.x == null && f.pts) { f.x = f.pts[0][0]; f.y = f.pts[0][1]; }
        if (low && !((DYNAMIC_OUT.has(f.type) || (AIO.props && AIO.props[f.type] && AIO.props[f.type].dynamic)) && f.type !== 'flag')) continue;
        // 긴 소품(다리·승강장 지붕 등)은 기준점이 화면 밖이어도 끝·가운데가 보이면 그린다
        const seen = onScreen(f.x, f.y, 140) || ((f.w > 3 || f.d > 3) && (onScreen(f.x + (f.w || 0), f.y + (f.d || 0), 140) || onScreen(f.x + (f.w || 0) / 2, f.y + (f.d || 0) / 2, 140)));
        if (seen) { const tmp = []; pushF(tmp, f); for (const it of tmp) put(f.x, f.y, it); }
      }
      for (const e of this.ents.values()) if ((e.lv || 0) === 0 && e.alpha > 0.02 && !e.hidden && onScreen(e.x, e.y, 60)) put(e.x, e.y, { k: e.x + e.y + 0.02, e });
      // vehicles
      for (const c of this.cars) {
        const x = c.axis === 'x' ? c.s : c.off, y = c.axis === 'x' ? c.off : c.s;
        if (!onScreen(x, y, 40)) continue;
        put(x + (c.axis === 'x' ? 0.8 : 0.4), y + (c.axis === 'x' ? 0.4 : 0.8), { k: x + y + 1.2, car: { x, y, c } });
      }
      if (this.bus && onScreen(this.bus.x, this.bus.y, 60, 200)) put(this.bus.x + 2.2, this.bus.y + 0.6, { k: this.bus.x + 2.2 + this.bus.y + 0.6, bus: this.bus });
      for (const tr of this.trucks) {
        const p = this.truckAt(tr, t);
        if (!p || !onScreen(p.x, p.y, 60, 220)) continue;
        const fw = p.axis === 'x' ? tr.L : 1.6, fd = p.axis === 'x' ? 1.6 : tr.L;
        put(p.x + fw / 2, p.y + fd / 2, { k: p.x + fw / 2 + p.y + fd / 2, truck: { tr, p } });
      }
      // geese around 오리연못, joggers on the track
      const Gs = S.geese;
      if (Gs && onScreen(Gs.cx, Gs.cy, 60, Gs.rx * 40)) for (let i = 0; i < Gs.n; i++) {
        const a = i / Gs.n * Math.PI * 2 + t * (0.025 + (i % 3) * 0.01) * (i % 2 ? 1 : -1), rr = 1.12 + (i % 3) * 0.08;
        const gx = Gs.cx + Math.cos(a) * Gs.rx * rr, gy = Gs.cy + Math.sin(a) * Gs.ry * rr;
        put(gx, gy, { k: gx + gy, goose: { x: gx, y: gy, dir: (i % 2 ? 1 : -1) * (Math.sin(a) > 0 ? -1 : 1), i } });
      }
      const Tk = S.track;
      if (Tk && !low && onScreen(Tk.cx, Tk.cy, 60, Tk.rx * 40)) for (let i = 0; i < 6; i++) {
        const a = t * (0.05 + i * 0.006) + i * 1.1, lane = 1 - i * 0.03;
        const jx = Tk.cx + Math.cos(a) * Tk.rx * lane, jy = Tk.cy + Math.sin(a) * Tk.ry * lane;
        const dx = -Math.sin(a), dy = Math.cos(a) * (Tk.ry / Tk.rx);
        put(jx, jy, { k: jx + jy, jogger: { x: jx, y: jy, dir: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? '+x' : '-x') : (dy > 0 ? '+y' : '-y'), i } });
      }

      const drawOut = (list) => {
        this.depthSort(list, I, 0, low);
        ctx.globalAlpha = dim;
        for (const it of list) {
          // 👾 도트 세트: 움직이는 것들도 매 프레임 도트 격자에 찍는다 (ttl 0)
          const box = (x, y, w, h) => { const [sx, sy] = P(x, y); return [sx - w, sy - h, sx + w, sy + 40]; };
          if (it.f) this.drawF(ctx, it, I, 0);
          else if (it.car) this.pxWrap(ctx, it.car.c, box(it.car.x, it.car.y, 120, 120), (c) => A6.vehicle(c, it.car.x, it.car.y, it.car.c.axis, it.car.c.dir, it.car.c.color, it.car.c.kind, t), 0);
          else if (it.bus) this.pxWrap(ctx, it.bus, box(it.bus.x, it.bus.y, 260, 200), (c) => A5.bus(c, it.bus.x, it.bus.y, 1, t, it.bus.doors), 0);
          else if (it.truck) { const { tr, p } = it.truck; this.pxWrap(ctx, tr, box(p.x, p.y, 280, 220), (c) => A6.truck(c, p.x, p.y, p.axis, p.dir, tr.color, tr.kind, { beacon: p.seg.reverse || p.seg.loading, t }), 0); if (p.seg.reverse && !low) A.bubble(ctx, ...P(p.x + 1, p.y + 0.6, 50), '🔙 삐- 삐-', { t }); }
          else if (it.goose) this.pxWrap(ctx, 'goose' + it.goose.i, box(it.goose.x, it.goose.y, 40, 50), (c) => A6.goose(c, it.goose.x, it.goose.y, it.goose.dir, t, it.goose.i), 0);
          else if (it.jogger) { if (!low) { const [jx, jy] = P(it.jogger.x, it.jogger.y), je = { sx: jx, sy: jy, style: this.npcStyle(500 + it.jogger.i, { hat: 'headphones' }), pose: 'walk', dir: it.jogger.dir, anim: 'idle', t: t * 1.4 + it.jogger.i, seed: 500 + it.jogger.i, scale: 0.92, kind: 'npc', moving: true, id: 'jog' + it.jogger.i }; if (!(AIO.skins && AIO.skins.sprite(ctx, je, jx, jy, je.t, 1))) A.character(ctx, je); } }
          else this.drawEntity(ctx, it.e, sel, t, 0, low);
        }
        ctx.globalAlpha = 1;
      };

      occ.forEach((o, i) => {
        drawOut(slots[i]);
        if (o.bld && o.bld.core) { this.drawBuilding(ctx, o.bld, I, sel, nightInfo, dim); return; }
        // every other building: interior of its ground floor fades in as the camera goes inside
        const focused = o.bld && v.focus === o.bld.id;
        const tt = focused ? v.t : 0;
        const a = clamp01(1 - tt * 1.25) * (focused ? 1 : dim);
        if (tt > 0) this.drawInterior(ctx, o.bld.levels[0], Math.min(1, tt * 1.6), I, sel, nightInfo);
        if (o.kind === 'ring') {
          if (a > 0) { ctx.globalAlpha = a; A5.ringPass(ctx, o.ring, false, t, !!nightInfo.night); }
          drawOut(inner[i]);
          if (a > 0) { ctx.globalAlpha = a; A5.ringPass(ctx, { ...o.ring, gates: o.ring.gates }, true, t, !!nightInfo.night); }
          ctx.globalAlpha = 1;
          return;
        }
        if (a <= 0.01) return;
        if (o.kind === 'campus' || o.kind === 'shop') {
          const sp = this.sprite(o, bucket, !!nightInfo.night);
          if (sp) { ctx.globalAlpha = a; if (sp.px) ctx.imageSmoothingEnabled = false; ctx.drawImage(sp.c, sp.x, sp.y, sp.w, sp.h); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1; }
          return;
        }
        ctx.globalAlpha = a;
        if (o.kind === 'warehouse') A5.warehouse(ctx, o, t);
        else if (o.kind === 'daycare') A5.daycare(ctx, o, t);
        ctx.globalAlpha = 1;
      });
      drawOut(after);
      if (this.deferBasement) {
        // 지하층은 바깥 지형·소품 위에 덮어 그린다 (흙 단면 + 그 층 내부)
        const D = this.deferBasement; this.deferBasement = null;
        ctx.save(); ctx.globalAlpha = D.a;
        A8.earthCut(ctx, D.b, S.levels[D.lv].zBase - 14);
        ctx.restore();
        this.drawInterior(ctx, D.lv, D.a, D.I, D.sel, D.nightInfo);
      }

      // night
      this.drawLight(ctx, nightInfo);
      if (nightInfo.dark > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const l of OUT.lamps) { if (!onScreen(l.x, l.y, 100)) continue; const [gx, gy] = P(l.x, l.y, 70); const gg = ctx.createRadialGradient(gx, gy, 4, gx, gy + 30, 120); gg.addColorStop(0, `rgba(255,214,140,${0.4 * nightInfo.dark / 0.3})`); gg.addColorStop(1, 'rgba(255,214,140,0)'); ctx.fillStyle = gg; ctx.fillRect(gx - 120, gy - 90, 240, 240); }
        if (v.focus && v.t > 0) { const b = S.buildings.find((x) => x.id === v.focus); const L = S.levels[this.displayedLevel(b)]; this.drawGlows(ctx, L, nightInfo); }
        ctx.restore();
      }
      this.drawOverlay(ctx, cam, dpr);
    }

    /** single-floor maps: one level, drawn as is (open office / terrace) */
    drawSingle(ctx, cam, dpr, vw, vh, nightInfo) {
      const S = this.S, L = S.levels[0], z = cam.z;
      this.frame = (this.frame || 0) + 1;
      ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (vw / 2 - cam.x * z), dpr * (vh / 2 - cam.y * z));
      ctx.imageSmoothingEnabled = true;
      this.shown = new Set([L.idx]);
      const urgent = this.sessions.filter((s) => AIO.isUrgent(s.status));
      const I = { nightInfo, busyAny: this.sessions.some((s) => AIO.isBusy(s.status)), rules: this.rulesText(), urgent, coats: this.sessions.slice(0, 4).map((s) => AIO.provider(s.provider).accent), low: false };
      const sel = this.selected && this.ents.get(this.selected);
      // indoor / outdoor: looking at the glass office → its walls solid, the deck hazy; looking outside → the office
      // fades under a translucent roof with its walls faintly there
      let zoneAlpha = null, m = 1;
      const IN = S.indoor;
      if (IN) {
        const gx = (cam.x / 32 + cam.y / 16) / 2, gy = (cam.y / 16 - cam.x / 32) / 2;
        const target = gx < IN.x1 && gy < IN.y1 ? 1 : 0;
        const dt = Math.min(0.1, Math.max(0, this.t - (this.zoneT ?? this.t))); this.zoneT = this.t;
        this.zoneM = this.zoneM == null ? target : this.zoneM + (target - this.zoneM) * Math.min(1, dt * 4);
        m = this.zoneM;
        const inside = (x, y) => x < IN.x1 && y < IN.y1;
        zoneAlpha = (it) => {
          const f = it.f, e = it.e;
          if (f && (f.type === 'wall' || f.type === 'doorframe') && ((f.axis === 'x' && f.y === IN.y1) || (f.axis === 'y' && f.x === IN.x1))) return 0.5 + 0.5 * m;
          const x = f ? (f.x ?? 0) : e.x, y = f ? (f.y ?? 0) : e.y;
          return inside(x, y) ? 0.22 + 0.78 * m : 0.4 + 0.6 * (1 - m);
        };
      }
      this.drawInterior(ctx, L.idx, 1, I, sel, nightInfo, false, zoneAlpha);
      if (L.outer === 'roof') A5.parapet(ctx, { x: 0, y: 0, W: L.W, H: L.H }, 0);
      if (IN) {
        const day = !(nightInfo.dark > 0);
        if (m > 0.02) { ctx.globalAlpha = 0.28 * m; poly(ctx, [P(IN.x1, 0), P(L.W, 0), P(L.W, L.H), P(0, L.H), P(0, IN.y1), P(IN.x1, IN.y1)], day ? '#f4efe6' : '#1d2547'); ctx.globalAlpha = 1; }
        if (m < 0.98) {
          const z = 106, a = 0.55 * (1 - m);
          ctx.globalAlpha = a;
          poly(ctx, [P(0, 0, z), P(IN.x1, 0, z), P(IN.x1, IN.y1, z), P(0, IN.y1, z)], '#e9e4dc', 'rgba(120,110,95,0.6)', 1.5);
          for (let gx = 4; gx < IN.x1; gx += 4) poly(ctx, [P(gx, 0, z), P(gx, IN.y1, z)], null, 'rgba(150,140,125,0.35)');
          ctx.globalAlpha = Math.min(1, a * 1.6);
          AIO.iso.box(ctx, 0, IN.y1 - 0.15, z, IN.x1, 0.15, 6, '#d9d3c9', '#cfc8bc', '#c4bdb1');
          AIO.iso.box(ctx, IN.x1 - 0.15, 0, z, 0.15, IN.y1, 6, '#d9d3c9', '#cfc8bc', '#c4bdb1');
          ctx.globalAlpha = 1;
        }
      }
      this.drawLight(ctx, nightInfo);   // 화면 전체(배경까지)에 걸어서 상자 모양 경계가 안 생긴다
      if (nightInfo.dark > 0) {
        {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          for (const l of L.lamps) { const [gx, gy] = P(l.x, l.y, 60); const gg = ctx.createRadialGradient(gx, gy, 4, gx, gy + 20, 90); gg.addColorStop(0, `rgba(255,214,140,${0.35 * nightInfo.dark / 0.3})`); gg.addColorStop(1, 'rgba(255,214,140,0)'); ctx.fillStyle = gg; ctx.fillRect(gx - 90, gy - 70, 180, 180); }
          this.drawGlows(ctx, L, nightInfo);
          ctx.restore();
        }
      }
      this.drawOverlay(ctx, cam, dpr);
    }

    /** an enterable building: exterior ⇄ interior of the shown floor (tower floors at their own height) */
    drawBuilding(ctx, b, I, sel, nightInfo, dim) {
      const S = this.S, v = this.view, t = this.t;
      const focused = v.focus === b.id;
      const tt = focused ? v.t : 0;
      const hc = this.heatCfg();
      const info = { heat: hc, floorPx: S.FLOOR_PX, floors: this.floorInfo(b).map((f, i) => ({ ...f, heat: this.heatOf(f.people, hc), tag: S.levels[b.levels[i]].short })), t, night: !!nightInfo.night, wallA: clamp01(1 - tt * 1.25), roofA: clamp01(1 - tt * 2), people: this.floorInfo(b).some((x) => x.people) };
      ctx.save();
      if (!focused) ctx.globalAlpha = dim;
      if (b.type === 'tower') {
        const nb = b.base || 0;
        if (nb) info.floors = info.floors.slice(nb);
        const n = b.levels.length - 1 - nb, roofLv = b.levels[b.levels.length - 1];
        const shownLv = this.displayedLevel(b), k = S.levels[shownLv].floorIdx - nb;
        if (tt > 0 && k < 0) {
          this.deferBasement = { b, lv: shownLv, a: Math.min(1, tt * 1.6), I, sel, nightInfo };
          ctx.save(); ctx.globalAlpha *= Math.max(0.12, info.wallA);
          A5.towerFaces(ctx, b, info, 0, n);
          this.drawInterior(ctx, roofLv, 1, I, sel, nightInfo, true);
          A5.parapet(ctx, b, n * S.FLOOR_PX);
          ctx.restore();
        } else if (tt > 0) {
          A5.towerFaces(ctx, b, info, 0, Math.min(k, n));
          this.drawInterior(ctx, shownLv, Math.min(1, tt * 1.6), I, sel, nightInfo);
          if (k < n && info.wallA > 0) {
            ctx.save(); ctx.globalAlpha *= info.wallA;
            A5.towerFaces(ctx, b, info, k, n);
            this.drawInterior(ctx, roofLv, 1, I, sel, nightInfo, true);
            A5.parapet(ctx, b, n * S.FLOOR_PX);
            ctx.restore();
          }
          if (k === n) A5.parapet(ctx, b, n * S.FLOOR_PX);
        } else {
          const TH = (n + 2) * S.FLOOR_PX + 120, l = P(b.x, b.y + b.H)[0] - 40, r = P(b.x + b.W, b.y)[0] + 40, top = P(b.x, b.y, TH)[1], bot = P(b.x + b.W, b.y + b.H)[1] + 30;
          this.pxWrap(ctx, 'tw' + b.id, [l, top, r, bot], (c) => A5.towerFaces(c, b, info, 0, n), 0.5);
          this.drawInterior(ctx, roofLv, 1, I, sel, nightInfo, I.low);
          A5.parapet(ctx, b, n * S.FLOOR_PX);
        }
      } else {
        if (tt > 0) this.drawInterior(ctx, this.displayedLevel(b), Math.min(1, tt * 1.6), I, sel, nightInfo);
        if (tt < 1) {
          ctx.save(); ctx.globalAlpha *= info.wallA;
          if (b.type === 'factory') {
            A3.factoryExterior(ctx, b, info);
            (b.bays || []).forEach((by, i) => A6.dockDoor(ctx, { x: b.x + b.W, y: by, w: 3, bay: i }, this.dockOpen[i] || 0));
          } else {
            A6.campusBuilding(ctx, { x: b.x, y: b.y, W: b.W, H: b.H, floors: 2, style: b.type, code: b.type === 'police' ? '112' : 'BANK', name: T(b.type === 'police' ? '캠퍼스 경찰서' : 'AI 은행 캠퍼스 출장소'), seed: 3 }, !!nightInfo.night);
            if (b.type === 'police') { const [sx, sy] = P(b.x + b.W - 1, b.y + 1, 2 * A6.FPX + 18); ctx.fillStyle = Math.sin(t * 6) > 0 ? '#e5534b' : '#4e7cf6'; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 7); ctx.fill(); }
          }
          ctx.restore();
        }
      }
      ctx.restore();
    }

    drawInterior(ctx, lvIdx, alpha, I, sel, nightInfo, staticOnly, zoneAlpha) {
      const L = this.S.levels[lvIdx];
      const t = this.t;
      if (!this.caches.get(L.idx) || this.caches.get(L.idx).hour !== new Date().getHours()) this.buildCache(L);
      const C = this.caches.get(L.idx);
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.translate(...P(L.ox, L.oy, L.zBase || 0));
      if (C.px) ctx.imageSmoothingEnabled = false;
      ctx.drawImage(C.c, C.x, C.y, C.w, C.h);
      ctx.imageSmoothingEnabled = true;
      if (!staticOnly) {
        const lb = this.levelBox(L);
        this.pxWrap(ctx, 'wd' + L.idx, [lb.minX, lb.minY, lb.maxX, lb.maxY], (c) => this.drawWallDecor(c, L, nightInfo, I.urgent, t), 1);
        const items = [];
        for (const f of L.furniture) pushF(items, f);
        for (const e of this.ents.values()) if ((e.lv || 0) === L.idx && e.alpha > 0.02 && !e.hidden) items.push({ k: e.x + e.y + 0.02, e });
        this.depthSort(items, I, L.idx);
        for (const it of items) {
          const za = zoneAlpha ? zoneAlpha(it) : 1;
          if (za < 0.02) continue;
          if (za !== 1) { ctx.save(); ctx.globalAlpha *= za; }
          if (it.f) this.drawF(ctx, it, I, L.idx); else this.drawEntity(ctx, it.e, sel, t, L.idx);
          if (za !== 1) ctx.restore();
        }
        if (this.opts.lines) this.drawThreads(ctx, t, L.idx);
      }
      ctx.restore();
    }

    drawGlows(ctx, L, nightInfo) {
      ctx.save();
      ctx.translate(...P(L.ox, L.oy, L.zBase || 0));
      for (const f of L.furniture) {
        if (!SCREEN_TYPES.has(f.type)) continue;
        const scr = this.screenFor(f);
        if (!scr.on) continue;
        const [gx, gy] = f.type === 'desk' ? P(f.x + 1, f.y + (f.face === '-y' ? 0.9 : 0.1), 36) : P(f.x + f.w / 2, f.y + f.d, 34);
        const gg = ctx.createRadialGradient(gx, gy, 2, gx, gy, 46);
        gg.addColorStop(0, `rgba(150,190,255,${0.22 * nightInfo.dark / 0.3})`); gg.addColorStop(1, 'rgba(150,190,255,0)');
        ctx.fillStyle = gg; ctx.fillRect(gx - 46, gy - 46, 92, 92);
      }
      ctx.restore();
    }

    drawWallDecor(ctx, L, nightInfo, urgent, t) {
      const sky = Object.assign(nightInfo.sky.slice(), { stars: nightInfo.stars, cloud: nightInfo.cloud, bld: nightInfo.bld });
      if (L.outer === 'factory') {
        A2.factoryWindows(ctx, L.W, t, sky);
        const wy = L.wallY;
        if (wy?.andon != null) A2.andon(ctx, wy.andon, urgent.map((s) => `${this.codes.get(s.id) || ''} ${this.authed ? s.title : AIO.provider(s.provider).label} · ${AIO.status(s.status).label}`), t);
        if (wy?.clock != null) A.clock(ctx, wy.clock, new Date());
        return;
      }
      if (L.outer === 'roof') return;
      for (const wy of L.windows) A.windowOnLeftWall(ctx, wy, sky, t);
      for (const wx of L.northWindows || []) A3.windowOnBackWall(ctx, wx, sky, t);
      const w = L.wallY;
      if (!w) return;
      if (w.bulletin != null) A.bulletin(ctx, w.bulletin, urgent.map((s) => ({ text: this.authed ? s.title : `${this.codes.get(s.id) || ''} ${AIO.provider(s.provider).label}`, sub: AIO.status(s.status).label, urgent: true })));
      if (w.clock != null) A.clock(ctx, w.clock, new Date(), w.clockZ);
      if (w.calendar != null) A.calendar(ctx, w.calendar, new Date());
      for (const fx of w.frames || []) A.frame(ctx, fx, Math.round(fx * 7));
      if (w.frame2 != null) A.frame(ctx, w.frame2, 5);
    }

    drawEntity(ctx, e, sel, t, lvIdx, low) {
      const L = this.S.levels[lvIdx];
      const [sx, sy] = P(e.x, e.y, 0);
      if (e.kind === 'pet') { ctx.save(); ctx.globalAlpha *= e.alpha; A8.pet(ctx, sx, sy, e.species, e.dir, t, e.plan.length > 0 || !!e.moving, e.color, e.seed); ctx.restore(); return; }
      if (low) {
        const c = e.kind === 'main' ? (AIO.isUrgent(e.s?.status) ? '#e5534b' : '#f0a03c') : e.style.accent;
        ctx.globalAlpha *= e.alpha;
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx, sy - 14, e.kind === 'main' ? 14 : 9, 0, 7); ctx.fill();
        ctx.globalAlpha /= e.alpha || 1;
        return;
      }
      const pulse = this.pulse && this.pulse.id === e.id && t < this.pulse.until;   // 🎯 자동 포커스 · 따라가기 대상 강조
      if (e === sel || e.id === this.hover || pulse) {
        ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.5);
        ctx.beginPath(); ctx.arc(0, 0, 19 * (e.scale || 1), 0, Math.PI * 2);
        ctx.strokeStyle = e === sel || pulse ? '#f0a03c' : 'rgba(240,160,60,0.5)'; ctx.lineWidth = pulse && e !== sel ? 3 + Math.abs(Math.sin(t * 5)) * 2 : 3; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 20; ctx.stroke();
        ctx.restore();
      }
      const resting = e.spot && e.spot.carry && !e.plan.length;
      let carry = e.carry || (resting ? e.spot.carry : null);
      if (e.plan.length && e.walkCarry) carry = e.walkCarry;
      const style0 = L.bld === 'factory' ? e.style.factory : e.style;
      const style = AIO.skins ? AIO.skins.dress(e, style0) : style0;   // 🎨 그래픽 테마 옷차림
      let z = 0;
      // kids on the swings ride the seat
      if (e.kind === 'family' && e.spot && e.spot.swing != null && !e.plan.length) {
        const at = e.spot.at, p = A5.swingSeatPos(at[0], at[1], e.spot.swing, t, true);
        const [qx, qy] = P(p.x, p.y, p.z - 12);
        ctx.save(); ctx.globalAlpha *= e.alpha;
        A.character(ctx, { sx: qx, sy: qy, style, pose: 'sit', dir: '+y', anim: 'cheer', t: t + e.seed, seed: e.seed, scale: e.scale, alpha: 1, carry: null });
        ctx.restore();
        return;
      }
      void z;
      ctx.save();
      ctx.globalAlpha *= e.alpha;
      if (!(AIO.skins && AIO.skins.sprite(ctx, { ...e, anim: this.anim(e) }, sx, sy, t + e.seed, 1)))   // 🎨 도트 세트면 도트 캐릭터
        A.character(ctx, { sx, sy, style, pose: e.pose, dir: e.dir, anim: this.anim(e), t: t + e.seed, seed: e.seed, scale: e.scale, alpha: 1, carry });
      ctx.restore();
    }

    rulesText() {
      const ss = this.sessions;
      const today = ss.reduce((n, s) => n + (s.stats?.today || 0), 0);
      const urgent = ss.filter((s) => AIO.isUrgent(s.status)).length;
      const working = ss.filter((s) => AIO.isBusy(s.status)).length;
      return [`· 오늘 처리 ${today}건`, `· 지금 일하는 중 ${working}명`, urgent ? `· 결정 대기 ${urgent}건!` : '· 결정 대기 없음', '· 검수는 다른 AI가'].map(T);
    }

    podInfo(podKey) {
      const lead = this.byId.get(String(podKey).replace(/^S:/, ''));
      const members = [...this.ents.values()].filter((e) => e.kind === 'member' && 'S:' + e.sid === podKey);
      return { lead, working: members.filter((m) => m.status === 'working').length };
    }

    /** 🧱 그리는 순서: 바닥 상자로 앞뒤를 가린다 (depth.js) — 아주 멀리서 볼 때 · 물건이 너무 많을 때는 예전처럼 숫자 하나로 */
    depthSort(list, I, lv, low) {
      list.sort((a, b) => a.k - b.k);
      const D = AIO.depth;
      if (!D || low || this.opts.depth === false || list.length > 2500) return;
      D.order(list, (it) => {
        if (it.f) {
          const f = it.f, m = D.furnBox(f, (c) => this.drawFurniture(c, f, I, lv));
          if (!m || !m.b || it.si == null) return m;
          // 길쭉한 가구를 한 칸씩 자른 조각: 그 칸만큼의 상자 · 화면 띠
          const x0 = Math.max(m.b.x0, it.si === 0 ? -1e9 : f.x + it.si), x1 = Math.min(m.b.x1, it.si === it.sn - 1 ? 1e9 : f.x + it.si + 1);
          if (x1 - x0 < 0.02 || !m.r) return null;
          const l = Math.max(m.r[0], it.clip[0]), r = Math.min(m.r[2], it.clip[1]);
          if (r <= l) return null;
          return { b: { ...m.b, x0, x1 }, r: [l, m.r[1], r, m.r[3]] };
        }
        if (it.e) { const e = it.e, [sx, sy] = P(e.x, e.y, 0); return D.entBox(e.x, e.y, sx, sy, e.kind === 'pet' ? 0.5 : e.scale || 1); }
        return null;
      });
    }

    drawF(ctx, it, I, lv) {
      if (!it.clip) { this.drawFurniturePx(ctx, it.f, I, lv); return; }
      ctx.save(); ctx.beginPath(); ctx.rect(it.clip[0], -1e7, it.clip[1] - it.clip[0], 2e7); ctx.clip();
      this.drawFurniturePx(ctx, it.f, I, lv);
      ctx.restore();
    }
    /** 👾 도트 세트면 가구도 도트(에셋 그림 · 도트 격자)로 — pixelworld.js */
    drawFurniturePx(ctx, f, I, lv) {
      const X = AIO.pxw;
      if (X && X.on() && X.furniture(ctx, f, I, lv, this)) return;
      this.drawFurniture(ctx, f, I, lv);
    }
    /** 👾 도트 세트면 fn 이 그리는 것을 도트 격자에 찍어서 붙인다 (key 마다 따로 기억 · ttl 초마다 새로 그림) */
    pxWrap(ctx, key, rect, fn, ttl = 0.5) {
      const X = AIO.pxw;
      if (!X || !X.on()) { fn(ctx); return; }
      this.pxOwners = this.pxOwners || new Map();
      let o = typeof key === 'object' ? key : this.pxOwners.get(key);
      if (!o) this.pxOwners.set(key, (o = {}));
      if (!X.drawObj(ctx, o, rect, fn, ttl, false)) fn(ctx);
    }

    /** 영어 모드: 가구에 쓰인 글자(간판 · 메뉴판 · 칠판 · 계산대 이름 …)도 번역해서 그린다 (가구마다 한 번 만들어 둔다) */
    furnEn(f) {
      this.furnTr = this.furnTr || new WeakMap();
      let g = this.furnTr.get(f);
      if (!g) {
        g = { ...f };
        for (const k of ['label', 'text', 'title', 'sign', 'name']) if (typeof f[k] === 'string') g[k] = T(f[k]);
        for (const k of ['lines', 'items']) if (Array.isArray(f[k])) g[k] = f[k].map((x) => (typeof x === 'string' ? T(x) : x));
        this.furnTr.set(f, g);
      }
      return g;
    }
    drawFurniture(ctx, f, I, lv) {
      if (AIO.lang === 'en' && (f.label || f.text || f.title || f.lines || f.items || f.sign)) f = this.furnEn(f);
      const t = this.t;
      switch (f.type) {
        case 'desk': A.desk(ctx, f, this.screenFor(f)); break;
        case 'chair': A.chair(ctx, f, f.part); break;
        case 'plant': A.plant(ctx, f.x, f.y, f.size, f.seed); break;
        case 'lamp': A.lamp(ctx, f.x, f.y, I.nightInfo.lamps); break;
        case 'sofa': A.sofa(ctx, f.x, f.y, f.w); break;
        case 'roundTable': A.roundTable(ctx, f.x, f.y, f.r, f.color); break;
        case 'stool': A.stool(ctx, f.x, f.y, f.color); break;
        case 'cabinet': A.cabinet(ctx, f.x, f.y, f.w, f.coffee); break;
        case 'whiteboard': A.whiteboard(ctx, f.x, f.y, f.w, this.authed ? (this.podInfo(f.podKey).lead?.todos || []) : [], f.color); break;
        case 'easel': A.easel(ctx, f.x, f.y, I.rules); break;
        case 'bookshelf': A.bookshelf(ctx, f.x, f.y, f.w, f.seed); break;
        case 'printer': A.printer(ctx, f.x, f.y, I.busyAny, t); break;
        case 'waterCooler': A.waterCooler(ctx, f.x, f.y); break;
        case 'coatRack': A.coatRack(ctx, f.x, f.y, I.coats); break;
        case 'wall': if (f.bars) A6.bars(ctx, f); else A2.wallSeg(ctx, f); break;
        case 'doorframe': if (f.bars) A6.barDoor(ctx, f); else A2.doorframe(ctx, f); break;
        case 'execDesk': {
          const lead = f.seatKey ? this.byId.get(f.seatKey.slice(2)) : null;
          A2.execDesk(ctx, { ...f, label: T(f.label || '') }, lead && AIO.isUrgent(lead.status) ? 3 : 0, t);
          break;
        }
        case 'bossChair': A2.bossChair(ctx, f.x, f.y); break;
        case 'armchair': A2.armchair(ctx, f.x, f.y, f.color); break;
        case 'tableSeg': A2.longTable(ctx, { x: f.x, y: f.y, w: f.w, d: f.d }); break;
        case 'tv': {
          const ss = this.sessions;
          A2.tv(ctx, f, [`출근 ${ss.length}명 · 작업중 ${ss.filter((s) => AIO.isBusy(s.status)).length}`, `오늘 처리 ${ss.reduce((n, s) => n + (s.stats?.today || 0), 0)}건`, `결정 대기 ${I.urgent.length}건`, `하네스 팀 ${ss.filter((s) => s.kind === 'harness').length}개`].map(T), t);
          break;
        }
        case 'bigScreen': { const ss = this.sessions; A4.bigScreen(ctx, f.x, f.y, f.w, [`세션 ${ss.length} · 작업중 ${ss.filter((s) => AIO.isBusy(s.status)).length}`, `결정 대기 ${I.urgent.length}건`].map(T), t); break; }
        case 'reception': A2.reception(ctx, f); break;
        case 'bench': A2.bench(ctx, f.x, f.y, f.w, f.color); break;
        case 'parasolTable': A2.parasolTable(ctx, f.x, f.y, f.color, t); break;
        case 'planter': A2.planter(ctx, f.x, f.y, f.w, f.seed); break;
        case 'machine': { const scr = this.screenFor(f); A2.machine(ctx, f, scr, scr.state, t); break; }
        case 'console': { const scr = this.screenFor(f); A2.console(ctx, f, scr, scr.state, t); break; }
        case 'beltSeg': {
          const { working } = this.podInfo(f.podKey);
          const speed = working ? 0.8 + working * 0.35 : 0;
          const boxes = [];
          const n = working ? Math.min(6, working + 1) : 2;
          for (let k = 0; k < n; k++) { const pos = ((k / n) + (t * speed * 0.06)) % 1 * f.n; if (pos >= f.i && pos < f.i + 1) boxes.push({ p: pos - f.i }); }
          A2.conveyor(ctx, { x: f.x, y: f.y, w: 1 }, t, speed, boxes);
          break;
        }
        case 'station': { const m = this.ents.get(f.seatKey); A2.station(ctx, f, t, !!m && m.status === 'working' && !m.plan.length); break; }
        case 'pallet': A2.pallet(ctx, f.x, f.y, f.count ?? Math.min(12, (this.podInfo(f.podKey).lead?.stats?.agents || 0))); break;
        case 'partsBin': A2.partsBin(ctx, f.x, f.y, f.seed); break;
        case 'palletRack': A2.palletRack(ctx, f.x, f.y, f.w, f.seed); break;
        case 'vending': A2.vending(ctx, f.x, f.y, f.color, t); break;
        case 'lockers': A2.lockers(ctx, f.x, f.y, f.w); break;
        case 'forklift': A2.forklift(ctx, f.x, f.y); break;
        case 'serverRack': A2.serverRack(ctx, f, t, Math.min(1, this.sessions.filter((s) => AIO.isBusy(s.status)).length / 4)); break;
        // tower / lobby / roof
        case 'elevCab': A3.elevCab(ctx, f, this.elevState(lv, f.car).open); break;
        case 'elevDoor': { const el = this.elevState(lv, f.car); A3.elevDoor(ctx, f, el.open, f.label, t < el.movingUntil, t); break; }
        case 'elevPanel': A3.elevPanel(ctx, f, f.label, t); break;
        case 'elevHutRoof': A3.elevHutRoof(ctx, f); break;
        case 'hutShell': A4.hutShell(ctx, f); break;
        case 'cafeCounter': A3.cafeCounter(ctx, f, t); break;
        case 'highTable': A3.highTable(ctx, f); break;
        case 'barStool': A3.barStool(ctx, f.x, f.y); break;
        case 'entrance': A3.entrance(ctx, f, t < (this.doorOpen.get(f.bld || 'tower') || 0) ? 1 : 0); break;
        case 'shutterFront': A3.shutterFront(ctx, f); break;
        case 'ashtray': A3.ashtray(ctx, f.x, f.y, t); break;
        case 'smokeSign': A3.smokeSign(ctx, f.x, f.y); break;
        case 'restroom': A4.restroom(ctx, f, t); break;
        case 'phoneBooth': A4.phoneBooth(ctx, f.x, f.y, f.color, ((f.x * 7) | 0) % 3 === 0); break;
        case 'cctvWall': A4.cctvWall(ctx, f, t); break;
        case 'storageShelf': A4.storageShelf(ctx, f.x, f.y, f.w, f.seed); break;
        case 'janitorCart': A4.janitorCart(ctx, f.x, f.y); break;
        case 'parcelShelf': A4.parcelShelf(ctx, f.x, f.y, f.w, f.seed); break;
        case 'trophyCase': A4.trophyCase(ctx, f.x, f.y, f.w); break;
        case 'aquarium': A4.aquarium(ctx, f.x, f.y, f.w, t); break;
        case 'piano': A4.piano(ctx, f.x, f.y); break;
        case 'sculpture': A4.sculpture(ctx, f.x, f.y, t); break;
        case 'menuStand': A5.menuStand(ctx, f.x, f.y); break;
        case 'decisionBoard': A5.decisionBoard(ctx, f.x, f.y, f.w, I.urgent.map((s) => `${this.codes.get(s.id) || ''} ${this.authed ? trunc(s.title, 14) : AIO.provider(s.provider).label}`)); break;
        case 'labBench': A6.labBench(ctx, f.x, f.y, f.w, t); break;
        case 'robotArm': A6.robotArm(ctx, f.x, f.y, t); break;
        case 'robotDog': A6.robotDog(ctx, f.x, f.y, t); break;
        case 'posterBoard': A6.posterBoard(ctx, f.x, f.y, f.w); break;
        case 'nocWall': { const ss = this.sessions; A6.nocWall(ctx, f, t, { n: ss.length, busy: ss.filter((s) => AIO.isBusy(s.status)).length, load: Math.min(1, ss.filter((s) => AIO.isBusy(s.status)).length / 4) }); break; }
        case 'upsCabinet': A6.upsCabinet(ctx, f.x, f.y, t); break;
        case 'batteryRack': A6.batteryRack(ctx, f.x, f.y, f.w); break;
        case 'chiller': A6.chiller(ctx, f.x, f.y, t); break;
        case 'pipes': A6.pipes(ctx, f.x, f.y, f.w); break;
        case 'gpuRack': A6.gpuRack(ctx, f, t, Math.min(1, this.sessions.filter((s) => AIO.isBusy(s.status)).length / 4)); break;
        case 'coolantPipe': A6.coolantPipe(ctx, f.x, f.y, f.w, t); break;
        case 'pergola': A5.pergola(ctx, f.x, f.y, f.w, f.d, t); break;
        case 'gazebo': A5.gazebo(ctx, f.x, f.y, t); break;
        case 'roofTree': A5.roofTree(ctx, f.x, f.y, f.size, f.seed, t, f.blossom); break;
        case 'birdbath': A5.birdbath(ctx, f.x, f.y, t); break;
        case 'stoneLantern': A5.stoneLantern(ctx, f.x, f.y, I.nightInfo.lamps); break;
        case 'greenhouse': A5.greenhouse(ctx, f.x, f.y, f.w, f.d); break;
        case 'deckChair': A5.deckChair(ctx, f.x, f.y, f.color); break;
        case 'parasol': A5.parasol(ctx, f.x, f.y, f.color, t); break;
        case 'flowerBush': A5.flowerBush(ctx, f.x, f.y, f.size || 1, f.seed, f.color); break;
        case 'topiary': A5.topiary(ctx, f.x, f.y, f.seed); break;
        case 'hedge': A5.hedge(ctx, f.x, f.y, f.w, f.d); break;
        case 'koi': A5.koi(ctx, f.x, f.y, t, f.seed); break;
        case 'stringLights': A5.stringLights(ctx, f.pts, t, !!I.nightInfo.lamps); break;
        // factory / police / bank
        case 'dockLeveler': A5.dockLeveler(ctx, f, t, (this.dockOpen[f.bay] || 0) > 0.5); break;
        case 'dockDoor': A6.dockDoor(ctx, f, this.dockOpen[f.bay] || 0); break;
        case 'bunk': A6.bunk(ctx, f.x, f.y); break;
        case 'cellToilet': A6.cellToilet(ctx, f.x, f.y); break;
        case 'flagStand': A6.flagStand(ctx, f.x, f.y, t); break;
        case 'wantedBoard': A6.wantedBoard(ctx, f.x, f.y, f.w, [...this.ents.values()].filter((e) => e.kind === 'main' && placeOf(e.s || {}) === 'jail').map((e) => this.codes.get(e.sid) || '?')); break;
        case 'vaultDoor': A6.vaultDoor(ctx, f.x, f.y, 1, t); break;
        case 'depositBoxes': A6.depositBoxes(ctx, f.x, f.y, f.w); break;
        case 'goldStack': A6.goldStack(ctx, f.x, f.y, t); break;
        case 'tellerCounter': A6.tellerCounter(ctx, f.x, f.y, f.w); break;
        case 'ticketMachine': A6.ticketMachine(ctx, f.x, f.y); break;
        case 'atm': A6.atm(ctx, f.x, f.y); break;
        // campus outdoors
        case 'tree': if (f.kind && f.kind !== 'oak') A7.tree2(ctx, f.x, f.y, f.size, f.seed, f.kind, t); else A3.tree(ctx, f.x, f.y, f.size, f.seed, t); break;
        case 'fence': A7.fence(ctx, f); break;
        case 'firePit': A7.firePit(ctx, f.x, f.y, t); break;
        case 'beerTap': A8.beerTap(ctx, f, t); break;
        case 'arcade': A8.arcade(ctx, f.x, f.y, t, f.hue); break;
        case 'gameTV': A8.gameTV(ctx, f, t); break;
        case 'foosball': A8.foosball(ctx, f.x, f.y, t); break;
        case 'massageChair': A8.massageChair(ctx, f.x, f.y); break;
        case 'dartboard': A8.dartboard(ctx, f); break;
        case 'napPod': A8.napPod(ctx, f.x, f.y, t, f.color); break;
        case 'airCon': A8.airCon(ctx, f.x, f.y, t); break;
        case 'wallAC': A8.wallAC(ctx, f, t); break;
        case 'exitSign': A8.exitSign(ctx, f); break;
        case 'extinguisher': A8.extinguisher(ctx, f.x, f.y); break;
        case 'umbrellaStand': A8.umbrellaStand(ctx, f.x, f.y); break;
        case 'turnstile': A8.turnstile(ctx, f.x, f.y, t, 0); break;
        case 'fridge': A8.fridge(ctx, f.x, f.y); break;
        case 'brandWall': A8.brandWall(ctx, { ...f, text: T('AI 인공지능 연구원') }); break;
        case 'doghouse': A8.doghouse(ctx, f.x, f.y); break;
        case 'stairs': A8.stairs(ctx, f); break;
        case 'bbq': A8.bbq(ctx, f.x, f.y, t); break;
        case 'trampoline': A8.trampoline(ctx, f.x, f.y, t); break;
        case 'veggies': A8.veggies(ctx, f.x, f.y, f.w, f.d, f.seed); break;
        case 'mailboxes': A8.mailboxes(ctx, f.x, f.y, f.w); break;
        case 'bikeRack': A8.bikeRack(ctx, f.x, f.y); break;
        case 'generator': A8.generator(ctx, f.x, f.y, t); break;
        case 'waterTank': A8.waterTank(ctx, f.x, f.y); break;
        case 'electricPanel': A8.electricPanel(ctx, f, t); break;
        case 'specimenTank': A8.specimenTank(ctx, f.x, f.y, t, f.color); break;
        case 'pingPong': A4.pingPong(ctx, f, t); break;
        case 'catTree': A8.catTree(ctx, f.x, f.y); break;
        case 'coop': A8.coop(ctx, f.x, f.y); break;
        case 'beanbag': A4.beanbag(ctx, f.x, f.y, f.color); break;
        case 'hammock': A7.hammock(ctx, f.x, f.y, t); break;
        case 'restroomWall': A7.restroomWall(ctx, f); break;
        case 'stall': A7.stall(ctx, f, t); break;
        case 'sinks': A7.sinks(ctx, f); break;
        case 'blackboard': A7.blackboard(ctx, f); break;
        case 'lectern': A7.lectern(ctx, f.x, f.y); break;
        case 'deskRow': A7.deskRow(ctx, f); break;
        case 'seatRow': A7.seatRow(ctx, f); break;
        case 'cleanroomTool': A7.cleanroomTool(ctx, f.x, f.y, t, f.seed); break;
        case 'drafting': A7.drafting(ctx, f.x, f.y); break;
        case 'canvasEasel': A4.canvasEasel(ctx, f.x, f.y, f.seed); break;
        case 'model3d': A7.model3d(ctx, f.x, f.y, t); break;
        case 'bookStack': A7.bookStack(ctx, f); break;
        case 'readingTable': A7.readingTable(ctx, f.x, f.y, f.w); break;
        case 'bed': A7.bed(ctx, f.x, f.y, f.color, f.flip); break;
        case 'washer': A7.washer(ctx, f.x, f.y, t, f.k || 0); break;
        case 'treadmill': A7.treadmill(ctx, f.x, f.y, t); break;
        case 'weightRack': A7.weightRack(ctx, f.x, f.y); break;
        case 'toyBlocks': A7.toyBlocks(ctx, f.x, f.y, f.seed); break;
        case 'firePole': A7.firePole(ctx, f.x, f.y); break;
        case 'gearRack': A7.gearRack(ctx, f.x, f.y, f.w); break;
        case 'storeShelf': A7.storeShelf(ctx, f); break;
        case 'fridgeCase': A7.fridgeCase(ctx, f, t); break;
        case 'till': A7.till(ctx, { ...f, label: f.label ? T(f.label) : '' }, t); break;
        case 'kitchenLine': A7.kitchenLine(ctx, f, t); break;
        case 'pizzaOven': A7.pizzaOven(ctx, f.x, f.y, t); break;
        case 'breadCase': A7.breadCase(ctx, f); break;
        case 'flowerStand': A7.flowerStand(ctx, f.x, f.y, f.w, f.seed); break;
        case 'salonStation': A7.salonStation(ctx, f.x, f.y); break;
        case 'sushiBelt': A7.sushiBelt(ctx, f, t); break;
        case 'pcStation': A7.pcStation(ctx, f, t); break;
        case 'wallSign': A7.wallSign(ctx, { ...f, text: T(f.text) }); break;
        case 'menuWall': A7.menuWall(ctx, f); break;
        case 'willow': A6.willow(ctx, f.x, f.y, f.seed, t); break;
        case 'streetLamp': A3.streetLamp(ctx, f.x, f.y, I.nightInfo.lamps); break;
        case 'busStop': A5.busStop(ctx, f.x, f.y, t, !!this.bus && Math.abs(this.bus.x + 4.4 - (f.x + 4.2)) < 6); break;
        case 'fountain': A3.fountain(ctx, f.x, f.y, t); break;
        case 'monument': A3.monument(ctx, f.x, f.y, f.text); break;
        case 'parkedCar': A6.vehicle(ctx, f.x, f.y, f.axis || 'x', f.dir || 1, f.color, 'car', t); break;
        case 'policeCar': A6.vehicle(ctx, f.x, f.y, 'y', 1, '#ffffff', 'police', t); break;
        case 'fireTruck': A6.vehicle(ctx, f.x, f.y, 'y', 1, '#d9302a', 'fire', t); break;
        case 'truck': A6.truck(ctx, f.x, f.y, f.axis, f.dir, f.color, f.kind, {}); break;
        case 'trafficLight': A5.trafficLight(ctx, f.x, f.y, this.light(f.cw), t, f.side); break;
        case 'gateBooth': A5.gateBooth(ctx, f.x, f.y); break;
        case 'barrier': A5.barrier(ctx, f.x, f.y, f.len, this.gateOpen || 0); break;
        case 'container': A5.container(ctx, f.x, f.y, f.z || 0, f.color, f.label); break;
        case 'foodTruck': A5.foodTruck(ctx, f.x, f.y, f.kind, t); break;
        case 'cafeKiosk': A5.cafeKiosk(ctx, f.x, f.y, f.w, t); break;
        case 'basket': A5.basket(ctx, f.x, f.y); break;
        case 'slide': A5.slide(ctx, f.x, f.y); break;
        case 'swingSet': A5.swingSet(ctx, f.x, f.y, t, [false, false]); break;
        case 'seesaw': A5.seesaw(ctx, f.x, f.y, t); break;
        case 'jungleGym': A5.jungleGym(ctx, f.x, f.y); break;
        case 'merryGoRound': A5.merryGoRound(ctx, f.x, f.y, t); break;
        case 'sandboxRim': A5.sandboxRim(ctx, f.x, f.y, f.w, f.d); break;
        case 'bridge': A5.bridge(ctx, f.x, f.y, f.w); break;
        case 'duck': { const a = t * 0.18 + f.seed * 1.6; A5.duck(ctx, f.x + Math.cos(a) * 4.2, f.y + Math.sin(a) * 2.1, t, f.seed); break; }
        case 'pondSign': A6.pondSign(ctx, f.x, f.y); break;
        case 'campusSign': A6.campusSign(ctx, f.x, f.y); break;
        case 'flag': A6.flag(ctx, f.x, f.y, f.color, t); break;
        case 'stage': A6.stage(ctx, f.x, f.y, f.w); break;
        case 'picnicTable': A6.picnicTable(ctx, f.x, f.y); break;
        case 'goal': A6.goal(ctx, f.x, f.y, f.side); break;
        case 'hoop': A6.hoop(ctx, f.x, f.y, f.side); break;
        case 'atmKiosk': A6.atmKiosk(ctx, f.x, f.y); break;
        default: { const X = AIO.props && AIO.props[f.type]; if (X) X.draw(ctx, f, t, I, this); }   // 플러그인 소품 (props.js)
      }
    }

    headPoint(e) { return this.PL(e.lv, e.x, e.y, (e.pose === 'sit' || e.pose === 'sofa' ? 11 : 0) + 34 * (e.scale || 1)); }

    drawThreads(ctx, t, li) {
      ctx.save();
      ctx.lineCap = 'round';
      for (const e of this.ents.values()) {
        if (!(e.kind === 'member' && e.status === 'working') && !(e.kind === 'intern' && e.status === 'working')) continue;
        const lead = this.ents.get('S:' + e.sid);
        if (!lead || e.plan.length || (e.lv || 0) !== li || (lead.lv || 0) !== li) continue;
        const [x0, y0] = P(lead.x, lead.y, (lead.pose === 'sit' ? 11 : 0) + 34), [x1, y1] = P(e.x, e.y, (e.pose === 'sit' ? 11 : 0) + 34 * (e.scale || 1));
        const mx = (x0 + x1) / 2, my = Math.max(y0, y1) + 28 + Math.sin(t * 2 + e.seed) * 4;
        const color = e.kind === 'member' ? (this.teamColor.get(e.sid) || '#a67be0') : '#d8b25a';
        ctx.strokeStyle = rgba(color, 0.55); ctx.lineWidth = 2.2; ctx.setLineDash([2, 5]); ctx.lineDashOffset = -t * 18;
        ctx.beginPath(); ctx.moveTo(x0, y0 + 8); ctx.quadraticCurveTo(mx, my, x1, y1 + 8); ctx.stroke();
        const k = (t * 0.5 + e.seed * 0.01) % 1;
        const bx = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * mx + k * k * x1;
        const by = (1 - k) * (1 - k) * (y0 + 8) + 2 * (1 - k) * k * my + k * k * (y1 + 8);
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(bx, by, 3.4, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      }
      ctx.restore();
    }

    // ------------------------------------------------------------ labels / bubbles (screen space)
    nameOf(s) { return this.authed && s.title ? s.title : `${AIO.provider(s.provider).label}${T(s.kind === 'harness' ? ' 하네스' : s.kind === 'app' ? ' 앱' : ' 세션')}`; }

    drawOverlay(ctx, cam, dpr) {
      const t = this.t, v = this.view;
      const ls = Math.max(0.72, Math.min(1.12, cam.z));
      ctx.setTransform(dpr * ls, 0, 0, dpr * ls, 0, 0);
      const toS = (wx, wy) => { const [x, y] = cam.toScreen(wx, wy); return [x / ls, y / ls]; };
      const inView = ([x, y]) => x > -100 && y > -100 && x < cam.vw / ls + 100 && y < cam.vh / ls + 100;
      this.hits = [];
      const placed = [];
      const place = (r) => {
        for (let k = 0; k < 5; k++) {
          const hit = placed.find((p) => r.x < p.x + p.w && r.x + r.w > p.x && r.y < p.y + p.h && r.y + r.h > p.y);
          if (!hit) break;
          r.y = hit.y - r.h - 2;
        }
        placed.push(r);
        return r;
      };
      const single = !!this.S.single;
      const inside = single || (v.focus && v.t > 0.55);

      // names of the campus buildings (exteriors only) while zoomed out
      if (cam.z < 0.75 && !inside) {
        ctx.font = `11px ${A.FONT}`;
        for (const o of this.S.occ) {
          if (o.kind !== 'campus' && o.kind !== 'ring' && o.kind !== 'warehouse' && o.kind !== 'daycare' && !(o.kind === 'shop' && cam.z > 0.3)) continue;
          if (o.kind === 'campus' && cam.z > 0.45) continue;
          const h = o.kind === 'ring' ? 90 : o.kind === 'shop' ? 80 : (o.floors || 3) * A6.FPX + 30;
          const p = toS(...P(o.x + o.W / 2, o.y + o.H / 2, h));
          if (!inView(p)) continue;
          const text = `${o.code ? o.code + ' ' : ''}${T(o.name)}`;
          const w = ctx.measureText(text).width + 14;
          ctx.save(); ctx.globalAlpha = 0.86;
          AIO.iso.roundRect(ctx, p[0] - w / 2, p[1] - 10, w, 20, 10); ctx.fillStyle = 'rgba(255,255,255,0.86)'; ctx.fill();
          ctx.fillStyle = '#3b332b'; ctx.textAlign = 'center'; ctx.fillText(text, p[0], p[1] + 4); ctx.textAlign = 'left';
          ctx.restore();
        }
      }

      // enterable building badges — click to go in
      for (const b of this.S.buildings) {
        const focused = v.focus === b.id;
        const a = focused ? clamp01(1 - v.t * 1.6) : 1 - 0.55 * v.t;
        if (!b.core) {
          if (focused && v.t > 0.4) continue;
          const o = b.occ, h = o.kind === 'ring' ? 70 : o.kind === 'shop' ? 2 * A6.FPX : (o.floors || 2) * A6.FPX;
          const q = [P(b.x, b.y + b.H, 0), P(b.x + b.W, b.y + b.H, 0), P(b.x + b.W, b.y, 0), P(b.x, b.y, h)].map((p) => toS(...p));
          const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
          if (Math.max(...xs) < 0 || Math.min(...xs) > cam.vw / ls || Math.max(...ys) < 0 || Math.min(...ys) > cam.vh / ls) continue;
          this.hits.push({ x: Math.min(...xs) * ls, y: Math.min(...ys) * ls, w: (Math.max(...xs) - Math.min(...xs)) * ls, h: (Math.max(...ys) - Math.min(...ys)) * ls, id: 'B:' + b.id, z: -6 });
          continue;
        }
        if (a <= 0.03) continue;
        const height = b.type === 'tower' ? (b.levels.length - 1) * this.S.FLOOR_PX + 34 : b.type === 'factory' ? 130 : 2 * A6.FPX + 40;
        const [sx, sy] = toS(...P(b.x + b.W / 2, b.y + b.H / 2, height));
        if (!inView([sx, sy])) continue;
        const fi = this.floorInfo(b);
        const people = fi.reduce((n, x) => n + x.people, 0), busy = fi.reduce((n, x) => n + x.busy, 0), urg = fi.reduce((n, x) => n + x.urgent, 0);
        const text = `${T(b.name)}  👥 ${people}${b.type === 'tower' || b.type === 'factory' ? `  ⌨️ ${busy}` : ''}${urg ? `  🙋 ${urg}` : ''}`;
        ctx.save(); ctx.globalAlpha = a;
        ctx.font = `bold 13px ${A.FONT}`;
        const w = ctx.measureText(text).width + 24;
        AIO.iso.roundRect(ctx, sx - w / 2, sy - 32, w, 28, 14);
        ctx.fillStyle = urg ? 'rgba(229,83,75,0.92)' : 'rgba(43,38,34,0.9)'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(text, sx, sy - 13);
        ctx.font = `10px ${A.FONT}`; ctx.fillStyle = 'rgba(43,38,34,0.75)'; ctx.fillText(T('클릭해서 들어가기'), sx, sy + 8);
        ctx.textAlign = 'left'; ctx.restore();
        this.hits.push({ x: (sx - w / 2) * ls, y: (sy - 32) * ls, w: w * ls, h: 46 * ls, id: 'B:' + b.id, z: -3 });
        const q = [P(b.x, b.y + b.H, 0), P(b.x + b.W, b.y + b.H, 0), P(b.x + b.W, b.y, 0), P(b.x, b.y, height)];
        const xs = q.map((p) => toS(...p)[0]), ys = q.map((p) => toS(...p)[1]);
        if (!focused || v.t < 0.4) this.hits.push({ x: Math.min(...xs) * ls, y: Math.min(...ys) * ls, w: (Math.max(...xs) - Math.min(...xs)) * ls, h: (Math.max(...ys) - Math.min(...ys)) * ls, id: 'B:' + b.id, z: -5 });
      }

      // room / team signs of the floor on show
      if (inside) {
        const b = single ? null : this.S.buildings.find((x) => x.id === v.focus);
        const L = this.S.levels[single ? 0 : this.displayedLevel(b)];
        for (const sg of L.signs) {
          const [sx, sy] = toS(...this.PL(L.idx, sg.x, sg.y, 0));
          const text = T(sg.text);
          const k = +this.opts.signScale || 1;          // 계정 옵션: 표지판 크기
          ctx.font = `12px ${A.FONT}`;
          const w = ctx.measureText(text).width + 16;
          ctx.save(); ctx.globalAlpha = single ? 0.92 : 0.92 * clamp01((v.t - 0.55) * 3);
          ctx.translate(sx, sy); ctx.scale(k, k); ctx.translate(-sx, -sy);
          AIO.iso.roundRect(ctx, sx - 4, sy - 11, w, 22, 11);
          ctx.fillStyle = sg.team ? sg.color : sg.room ? 'rgba(43,38,34,0.78)' : 'rgba(255,255,255,0.85)'; ctx.fill();
          ctx.fillStyle = sg.team ? '#fff' : sg.room ? '#f6efe2' : sg.color; ctx.fillText(text, sx + 4, sy + 4);
          ctx.restore();
          if (sg.key) this.hits.push({ x: (sx - 4 * k) * ls, y: (sy - 11 * k) * ls, w: w * k * ls, h: 22 * k * ls, id: sg.key, z: -1 });
        }
      }

      const far = cam.z < 0.5;
      const ents = [...this.ents.values()].filter((e) => this.visible(e) && !(e.inCab && this.elevState(e.lv, e.seed % 2).open < 0.5)).sort((a, b) => (b.x + b.y) - (a.x + a.y));
      const labelsFor = [];
      for (const e of ents) {
        const [hx, hy] = toS(...this.headPoint(e));
        if (!inView([hx, hy])) continue;
        const zf = cam.z / ls;
        const top = hy - 22 * zf * (e.scale || 1);
        if (AMBIENT.has(e.kind)) { labelsFor.push({ e, hx, hy, top, ambient: true }); continue; }
        const [, fy] = toS(...this.PL(e.lv, e.x, e.y, 0));
        this.hits.push({ x: (hx - 16 * zf) * ls, y: (top - 4) * ls, w: 32 * zf * ls, h: (fy - top + 6) * ls, id: e.id, z: e.x + e.y });
        labelsFor.push({ e, hx, hy, top });
      }
      for (const { e, hx, top, ambient } of labelsFor) {
        if (ambient) continue;
        if (this.anim(e) === 'cheer' && e.kind === 'main') A.sparkles(ctx, hx, top + 10, t);
        if (e.heartUntil && t < e.heartUntil) A.heart(ctx, hx + 14, top, t);
      }
      for (const { e, hx, top, ambient } of labelsFor.reverse()) {
        if (ambient) {
          if (cam.z < 0.95 || !this.opts.labels) continue;
          const b = e.say && t < e.say.until ? e.say.text : null;
          const name = e.kind === 'npc' ? T(e.role) : e.kind === 'family' ? `${this.codes.get(e.sid) || ''} ${T(e.kid ? '아이' : '가족')}` : null;
          if (name && (e.kind === 'npc' || cam.z > 1.3)) {
            ctx.font = `9px ${A.FONT}`;
            const w = ctx.measureText(name).width + 10;
            ctx.save(); ctx.globalAlpha = 0.8 * e.alpha;
            AIO.iso.roundRect(ctx, hx - w / 2, top - 16, w, 14, 7); ctx.fillStyle = e.kind === 'npc' ? 'rgba(43,58,103,0.82)' : 'rgba(217,119,87,0.85)'; ctx.fill();
            ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(name, hx, top - 6); ctx.textAlign = 'left';
            ctx.restore();
          }
          if (b) { ctx.font = `12px ${A.FONT}`; A.bubble(ctx, hx, top - 18, T(b), { t, border: '#9fd8b0' }); }
          continue;
        }
        const s = e.s;
        if (!s) continue;
        const sel = this.selected === e.id;
        let tagRect = null;
        const showTag = this.opts.labels && !(far && !sel) && e.alpha > 0.3;
        if (showTag) {
          let name, sub, opt = {};
          if (e.kind === 'main' || e.kind === 'visitor') {
            const pz = s.persona && this.opts.tagName !== 'title' ? s.persona : null;   // 캐릭터 이름 · 국기 (계정 옵션 › 맵 표시 › 이름표)
            name = pz ? `${this.codes.get(s.id) || ''} ${pz.flag || ''} ${trunc(AIO.pname(pz), 14)}` : `${this.codes.get(s.id) || ''} ${trunc(this.nameOf(s), 14)}`;
            const pl = placeOf(s);
            sub = `${e.kind === 'visitor' ? AIO.provider(s.provider).label : pl === 'paused' ? T('일시정지') : pl === 'stopped' ? T('중단') : pl === 'jail' ? T('🚔 수감') : pl === 'dungeon' ? T('🐉 던전 봉인') : pl === 'vault' ? T('🏦 금고 보관') : AIO.status(s.status).label} · ${this.opts.rank !== false && AIO.hr ? AIO.hr.short(e) + ' · ' : ''}Lv.${s.level || 1}${s.wallet && (s.wallet.home || s.wallet.car) ? ' ' + (s.wallet.home ? s.wallet.home.icon : '') + (s.wallet.car ? s.wallet.car.icon : '') : ''}${s.wallet && s.wallet.loan > 0 ? (s.wallet.status === '신용불량' ? ' 🚨' : ' 💸') : ''}`;
            opt = { dot: pl === 'paused' ? '#9ab' : pl === 'jail' ? '#2b3a67' : pl === 'vault' ? '#b8955f' : AIO.status(s.status).color, lead: s.kind === 'harness', selected: sel, dim: pl !== 'active' };
          } else if (e.kind === 'member') {
            name = trunc(e.name, 18);
            sub = `${e.status === 'working' ? T('작업중') + (e.count > 1 ? ` ×${e.count}` : '') : T('대기')} · ${this.opts.rank !== false && AIO.hr ? AIO.hr.short(e) + ' · ' : ''}Lv.${e.r?.level || 1}`;
            opt = { dot: e.status === 'working' ? '#3fb27f' : '#c9bda9', small: true, selected: sel, dim: e.status !== 'working' };
          } else {
            name = trunc(this.authed ? e.name : T('인턴'), 16);
            sub = T(e.status === 'working' ? '인턴 · 작업중' : '인턴 · 보고');   // 직급: 인턴
            opt = { small: true, dot: '#f3c44b', selected: sel };
          }
          const k = +this.opts.labelScale || 1;         // 계정 옵션: 이름표 크기
          ctx.font = `${opt.small ? 10 : 12}px ${A.FONT}`;
          const w = (Math.max(ctx.measureText(name).width, ctx.measureText(sub).width + 10) + 14) * k, h = (opt.small ? 26 : 30) * k;
          const r = place({ x: hx - w / 2, y: top - h - 4, w, h });
          const ay = r.y + h;
          ctx.save(); ctx.translate(hx, ay); ctx.scale(k, k); ctx.translate(-hx, -ay);
          const tr0 = A.nameTag(ctx, hx, ay, name, sub, opt);
          ctx.restore();
          tagRect = { x: hx + (tr0.x - hx) * k, y: ay + (tr0.y - ay) * k, w: tr0.w * k, h: tr0.h * k };
          this.hits.push({ x: tagRect.x * ls, y: tagRect.y * ls, w: tagRect.w * ls, h: tagRect.h * ls, id: e.id, z: 100000 + e.x + e.y });
        }
        const b = this.bubbleFor(e);
        if (b && (this.opts.bubbles || b.urgent || b.force) && !(far && !b.urgent && !sel)) {
          const by = tagRect ? tagRect.y - 2 : top - 6;
          ctx.font = `12px ${A.FONT}`;
          const k = +this.opts.bubbleScale || 1;        // 계정 옵션: 말풍선 크기
          const w = (ctx.measureText(b.text).width + 20) * k;
          const r = place({ x: hx - w / 2, y: by - 32 * k, w, h: 32 * k });
          const ay = r.y + 32 * k;
          ctx.save(); ctx.translate(hx, ay); ctx.scale(k, k); ctx.translate(-hx, -ay);
          A.bubble(ctx, hx, ay, b.text, { border: b.urgent ? '#e5534b' : b.border, wobble: b.urgent, t, bg: b.bg, fg: b.fg });
          ctx.restore();
          if (b.urgent) A.exclaim(ctx, hx + w / 2 + 6, r.y + 6, t);
        }
      }
      for (const { e, hx, hy, ambient } of labelsFor) {
        if (ambient || this.anim(e) !== 'sleep' || e.alpha < 0.5) continue;
        const zf = cam.z / ls;
        A.zzz(ctx, hx + 14 * zf * (e.scale || 1), hy - 4 * zf, t + e.seed);
      }
    }

    bubbleFor(e) {
      const t = this.t;
      if (e.say && t < e.say.until) return { text: T(e.say.text), force: true, border: '#f3c44b' };
      if (e.reply && t < e.reply.until) return { text: T(e.reply.text), force: true };
      if (e.kind === 'main' && e.s && e.s.bubble && !e.plan.length) return { text: e.s.bubble, border: '#e2667f' };
      if (e.kind === 'main' && e.s && e.s.wallet && e.s.wallet.status === '신용불량' && !e.plan.length && Math.floor(t + (e.seed || 0)) % 23 < 4) return { text: T('😰 빚 독촉 전화 받는 중…'), border: '#e5534b' };   // 직접 만든 캐릭터의 말풍선
      if (e.plan.length && !e.leaving) {
        if (e.inCab) return { text: T('🛗 이동 중') };
        if (e.cwWait && t - e.cwWait > 0.5 && e.pose === 'stand') return { text: T('🚦 신호 대기') };
        if (e.kind === 'intern' && !e.carry) return { text: T('🏃 출근!') };
        if (e.errand) { const it = e.errand.item; return { text: e.errand.phase === 'go' ? `${it.icon} ${T(it.name)} ${T('사러 가는 중')} · ${T(e.errand.shop.tag || '')}` : `${it.icon} ${T('자리 찾는 중')}`, bg: '#fff3d6' }; }
        if (e.kind === 'main') {
          const pl = placeOf(e.s || {});
          if (pl === 'stopped') return { text: T('🏭 공장동으로') };
          if (pl === 'paused') return { text: T(this.familyMat.has(e.sid) ? '👨‍👩‍👧 가족한테 가는 중' : '☕ 잠깐 쉬러') };
          if (pl === 'jail') return { text: T('🚔 연행 중…'), bg: '#e8ecf5' };
          if (pl === 'vault') return { text: T('🏦 금고로 이동'), bg: '#f6efd8' };
        }
        return null;
      }
      if (e.leaving) return e.kind === 'main' ? { text: T('👋 퇴근!') } : null;
      const authed = this.authed;
      if (e.kind === 'member' || e.kind === 'intern') {
        if (e.status !== 'working') return null;
        const a = e.agent?.activity;
        return { text: `${AIO.ACT_ICON[a?.type] || '⌨️'} ${trunc(authed ? (a?.label || e.agent?.description || T('작업 중')) : (a?.label || T('작업 중')), 16)}` };
      }
      const s = e.s;
      if (!s) return null;
      const a = s.activity || {};
      const pl = placeOf(s);
      if (e.errand && e.errand.phase === 'eat') return { text: `${e.errand.item.icon} ${T(e.errand.item.name)} ${T('먹는 중')}`, bg: '#fff3d6' };
      if (e.errand) return { text: `${e.errand.item.icon} ${T('주문 중')}`, bg: '#fff3d6' };
      { const w = e.kind === 'main' && e.s && e.s.wallet; if (!e.errand && w && w.last && Date.now() - w.last.at < 9000) return { text: `${w.last.icon} ${T(w.last.name)} ${T('샀어요!')}`, bg: '#fff3d6' }; }
      if (this.S.mini && e.tier) return { text: T({ vault: '🔐 금고에 보관 중', underRest: '🛋️ 지하휴게실에서 대기', underDorm: '🛏️ 지하숙소에서 쉬는 중', jail: '⛓️ 지하 감옥 (오래 방치됨)', dungeon: '🐉 비밀던전에서 깊이 잠듦' }[e.tierShown || e.tier]), bg: e.tier === 'vault' ? '#f6efd8' : '#e8ecf5' };
      if (this.S.mini && e.inDorm && e.spot && this.S.dorms && this.S.dorms.includes(e.spot)) return { text: `${T('🛏️ 숙소에서 휴식')} · ${e.spot.tag}`, bg: '#eef3f7' };
      if (pl === 'jail') return { text: T('🚔 유치장 수감 중'), bg: '#e8ecf5' };
      if (pl === 'vault') return { text: T('🔐 금고에 보관 중'), bg: '#f6efd8' };
      if (pl === 'paused') { if (e.famSpot && e.spot === e.famSpot) return { text: T('👨‍👩‍👧 가족과 피크닉'), bg: '#fdeee6' }; return e.rest ? { text: `${T('⏸️ 일시정지')} · ${T(e.rest.tag)}`, bg: '#eef3f7' } : null; }
      if (AIO.isUrgent(s.status)) {
        const head = T(s.status === 'waiting_input' ? '🙋 결정 필요' : '✋ 승인 필요');
        return { text: authed && (a.detail || a.label) ? `${head} · ${trunc(a.detail || a.label, 14)}` : head, urgent: true };
      }
      if (s.status === 'done') return { text: T(t < (e.cheerUntil || 0) ? '✅ 다 했어요!' : '✅ 확인해 주세요'), bg: '#eef6ff' };
      if (AIO.isBusy(s.status)) {
        const icon = AIO.ACT_ICON[a.type] || '⌨️';
        const dots = s.status === 'thinking' ? '.'.repeat(1 + Math.floor(t * 2) % 3) : '';
        return { text: `${icon} ${trunc(a.label || T('작업 중'), 18)}${dots}` };
      }
      return null;
    }

    hitTest(sx, sy) {
      let best = null;
      for (const h of this.hits) if (sx >= h.x && sx <= h.x + h.w && sy >= h.y && sy <= h.y + h.h) if (!best || h.z > best.z) best = h;
      return best?.id || null;
    }

    entityWorldPos(id) { const e = this.ents.get(id); if (!e) return null; return this.PL(e.lv, e.x, e.y, 30); }
  }

  function sortKey(f) {
    switch (f.type) {
      case 'desk': return f.x + f.w / 2 + f.y + f.d / 2;
      case 'chair': return f.part === 'seat' ? f.x + f.y - 0.05 : f.x + (f.face === '+y' ? f.y - 0.3 : f.y + 0.22);
      case 'sofa': return f.x + f.w / 2 + f.y + 0.5;
      case 'cabinet': case 'cafeCounter': return f.x + f.w / 2 + f.y + 0.4;
      case 'whiteboard': case 'bookshelf': case 'palletRack': case 'lockers': case 'tv': case 'planter': case 'reception': case 'bench': case 'highTable':
      case 'storageShelf': case 'parcelShelf': case 'trophyCase': case 'aquarium': case 'cctvWall': case 'depositBoxes': case 'nocWall': case 'decisionBoard': case 'posterBoard': case 'wantedBoard': case 'tellerCounter': case 'labBench': case 'batteryRack': case 'pipes':
        return f.x + (f.w || 1) / 2 + f.y + 0.2;
      case 'wall': case 'doorframe': return f.axis === 'x' ? f.x + 0.5 + f.y : f.x + f.y + 0.5;
      case 'beltSeg': return f.x + 0.5 + f.y + 0.5;
      case 'tableSeg': return f.x + 0.5 + f.y + 0.55;
      case 'elevCab': return f.x + f.w / 2 + f.y + 0.2;
      case 'elevDoor': return f.x + f.w / 2 + f.y + f.d + 0.01;
      case 'elevHutRoof': return f.x + f.w / 2 + f.y + f.d + 0.02;
      case 'hutShell': return f.x + f.y + 0.1;
      case 'restroom': return f.x + f.y + 0.3;
      case 'stall': return f.x + 0.7 + f.y + 0.8;
      case 'sinks': return f.x + 0.3 + f.y + 1.1;
      case 'fence': return f.axis === 'x' ? f.x + 0.5 + f.y : f.x + f.y + 0.5;
      case 'lectern': return f.x + f.y + 0.3;
      case 'bed': return f.x + 0.5 + f.y + 1;
      case 'cleanroomTool': return f.x + 0.8 + f.y + 0.6;
      case 'pcStation': return f.x + 0.8 + f.y + 0.4;
      case 'salonStation': return f.x + 0.5 + f.y + 0.9;
      case 'treadmill': return f.x + 0.4 + f.y + 1;
      case 'drafting': return f.x + 0.75 + f.y + 0.5;
      case 'wallSign': return -1e5;
      case 'wallAC': case 'exitSign': case 'dartboard': return f.x + 1.6 + f.y;
      case 'arcade': return f.x + 0.45 + f.y + 0.4;
      case 'napPod': return f.x + 0.8 + f.y + 1.2;
      case 'airCon': return f.x + 0.35 + f.y + 0.3;
      case 'turnstile': return f.x + 0.15 + f.y + 0.5;
      case 'fridge': return f.x + 0.45 + f.y + 0.4;
      case 'foosball': return f.x + 0.95 + f.y + 0.5;
      case 'massageChair': return f.x + f.y + 0.3;
      case 'doghouse': return f.x + 0.9 + f.y + 0.8;
      case 'stairs': return f.x + f.y + f.d + 0.8;   // 옆 화장실 벽(x=19)보다 뒤에, 계단실 앞벽(y=5)보다 앞에 그려지게
      case 'electricPanel': return f.x + f.w + f.y;
      case 'generator': return f.x + 1.3 + f.y + 0.7;
      case 'bbq': return f.x + 0.55 + f.y + 0.4;
      case 'veggies': return f.x + f.w / 2 + f.y + f.d / 2;
      case 'mailboxes': return f.x + f.w + f.y + 0.3;
      case 'coop': return f.x + 0.9 + f.y + 0.7;
      case 'entrance': case 'shutterFront': return f.x + f.w / 2 + f.y + 0.6;
      case 'execDesk': return f.x + f.w / 2 + f.y + f.d / 2;
      case 'dockDoor': return f.x + f.y + f.w + 0.5;
      case 'vaultDoor': return f.x + f.y + 1.6;
      case 'pergola': case 'greenhouse': return f.x + f.w + f.y + f.d - 0.5;
      case 'stringLights': return 1e5;
      case 'truck': { const L = A6.truck.len(f.kind); return f.axis === 'x' ? f.x + L / 2 + f.y + 0.8 : f.x + 0.8 + f.y + L / 2; }
      case 'parkedCar': return f.axis === 'y' ? f.x + 0.4 + f.y + 0.8 : f.x + 0.8 + f.y + 0.4;
      case 'policeCar': return f.x + 0.4 + f.y + 0.8;
      case 'fireTruck': return f.x + 0.6 + f.y + 2.2;
      case 'foodTruck': return f.x + 2 + f.y + 0.7;
      case 'container': return f.x + 1.5 + f.y + 0.6 + (f.z || 0) / 100;
      case 'busStop': return f.x + 1.7 + f.y + 0.6;
      case 'bridge': return f.x + f.w / 2 + f.y + 0.5;
      case 'duck': return f.x + f.y - 2;
      default: { const X = AIO.props && AIO.props[f.type]; if (X && X.depth) return X.depth(f); return f.w ? f.x + f.w / 2 + f.y + (f.d || 0.5) / 2 : f.x + f.y; }
    }
  }

  function trunc(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  AIO.World = World;
  World.pushF = pushF;   // 그리는 순서 점검 도구용
  AIO.trunc = trunc;
  AIO.placeOf = placeOf;
})();
