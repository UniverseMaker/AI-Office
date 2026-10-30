// v4 관리 도구: 직급/직책(AIO.hr) · 세션 관리(전체 보기) · 세션 보관함(대화 보기·편집·내려받기·올리기) · 빌딩 관리(층 이름 ·
// 테이블 그룹 업무 · 자리 배치/고정 · 석방) · 관리자 설정(자동 보관 · 연동 API 키). 상세 패널의 메모/동작/고정/알림 해제도 여기서.
(function () {
  const esc = AIO.esc, tr = (...a) => AIO.tr(...a);
  const authed = () => AIO.auth.state.authed && AIO.auth.state.admin;   // 관리 도구는 관리자만
  const api = (p, o) => AIO.auth.api(p, o);
  async function jfetch(p, body, method = body ? 'POST' : 'GET') {
    const r = await api(p, body ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { method });
    let j = {}; try { j = await r.json(); } catch {}
    if (!r.ok || j.ok === false) throw new Error(j.error || `HTTP ${r.status}`);
    return j;
  }
  let world = null, getState = () => ({ sessions: [] });
  const sessions = () => getState().sessions || [];
  const code = (id) => (world && world.codes.get(id)) || '';
  const ago = (t) => (t ? AIO.fmtDur(Date.now() - t) : '-');
  const toast = (msg) => { const t = document.createElement('div'); t.className = 'mg-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); };

  // ================================================================ 직급 · 직책 (체계는 관리 센터에서: 학계형(기본) · 기업형 · 직접 입력)
  const ACADEMIC = ['방문자', '방문연구원', '연구원', '연수연구원', '선임연구원', '책임연구원', '연구조교수', '연구부교수', '연구교수', '조교수', '부교수', '교수'];
  const CORPORATE = ['인턴', '사원', '주임', '대리', '과장', '차장', '부장', '이사', '상무', '전무', '부사장', '사장'];
  const ladder = () => {
    const R = (getState().ranks) || {};
    if (R.scheme === 'corporate') return CORPORATE;
    if (R.scheme === 'custom' && R.custom) { const l = String(R.custom).split(/[,\n]/).map((x) => x.trim()).filter(Boolean); if (l.length >= 2) return l; }
    return ACADEMIC;
  };
  /** 레벨 → 사다리 칸 (방문자·인턴 칸은 앱/서브에이전트 몫이라 세션은 3번째 칸부터) */
  const gradeAt = (lv, lo, hi) => { const L = ladder(); const a = Math.min(lo, L.length - 1), b = Math.min(hi, L.length - 1); return L[Math.max(a, Math.min(b, a + Math.floor((lv - 1) / 2)))]; };
  const hr = {
    ladder,
    ofSession(s) {
      const c = s.ctl || {}, lv = s.level || 1, L = ladder();
      let g, role, kind;
      if (s.kind === 'app') { g = L[0]; role = '협력사 담당'; kind = '외부 앱'; }
      else if (s.kind === 'harness') { g = gradeAt(lv + 4, 2, L.length - 1); role = '팀장'; kind = '세션 · 하네스'; }
      else { g = gradeAt(lv, 2, L.length - 1); role = '연구원'; kind = '세션'; }
      return { grade: c.rank || g, role: c.role || role, kind };
    },
    of(e) {
      if (e.kind === 'main' || e.kind === 'visitor') return e.s ? hr.ofSession(e.s) : { grade: ladder()[2], role: '연구원', kind: '세션' };
      if (e.kind === 'member') return { grade: gradeAt(e.r?.level || 1, 2, 5), role: '팀원', kind: '내부 에이전트' };
      if (e.kind === 'intern') return { grade: ladder()[1], role: '인턴', kind: '임시 에이전트' };
      return { grade: '', role: e.role || '', kind: '직원' };
    },
    short(e) { const h = hr.of(e), g = tr(h.grade); return h.role === '팀장' ? `${g}·${tr('팀장')}` : g; },   // 보이는 글자라 지금 언어로
  };
  AIO.hr = hr;

  // ================================================================ 메타 (메모 · 고정 · 동작 · 알림 해제 · 배치)
  async function setMeta(id, patch) {
    if (AIO.data.isDemo && AIO.data.isDemo()) { const d = AIO.data.demo && AIO.data.demo(); const s = d && d.sessions.find((x) => x.id === id); if (s) { s.ctl = { ...(s.ctl || {}), ...patch }; s.meta = { ...(s.meta || {}), ...patch }; } return; }
    await jfetch('/api/meta', { id, patch });
  }
  const urgentKey = (s) => `${s.status}|${s.activity?.detail || s.activity?.label || ''}`;
  const dismiss = (s) => setMeta(s.id, { dismiss: urgentKey(s) }).then(() => toast(tr('🔕 알림을 해제했어요 (새 질문이 오면 다시 알려요)')));
  const ACTIONS = [['auto', '🤖 자동'], ['desk', '💻 자리에서 일하기'], ['rest', '☕ 실내 휴식'], ['outside', '🌳 밖에서 휴식'], ['meet', '🗣️ 회의실']];

  /** 상세 패널(개요 위)에 붙는 관리 줄: 직급 · 고정 · 알림 해제 · 동작 · 배치 · 보관본 · 메모 */
  function detailExtras(s) {
    if (!authed()) return '';
    const h = hr.ofSession(s), c = s.ctl || {}, m = s.meta || {};
    const urgent = AIO.isUrgent(s.status);
    let x = `<div class="mg-extra" data-sid="${esc(s.id)}">`;
    x += `<div class="mg-row"><span class="mg-chip rank">🎖️ ${esc(h.grade)} · ${esc(h.role)}</span><span class="mg-chip">${esc(h.kind)}</span>${s.dismissed ? `<span class="mg-chip mute">🔕 ${tr('알림 해제됨')}</span>` : ''}${c.lock ? `<span class="mg-chip lock">📌 ${tr('강제 배치 고정')}</span>` : ''}</div>`;
    x += `<div class="mg-row">`;
    if (urgent) x += `<button class="btn ghost sm" data-mg="dismiss">🔕 ${tr('결정 알림 해제')}</button>`;
    x += `<button class="btn ghost sm ${c.pinned ? 'on' : ''}" data-mg="pin">${c.pinned ? '📌 ' + tr('일하는 중 고정 해제') : '📌 ' + tr('지금 일하는 중에 올리기')}</button>`;
    x += `<button class="btn ghost sm" data-mg="place">📍 ${tr('자리 배치')}</button><button class="btn ghost sm" data-mg="archive">📦 ${tr('보관본 · 전체 대화')}</button></div>`;
    x += `<div class="mg-row"><span class="mg-lbl">${tr('원하는 동작')}</span>${ACTIONS.map(([k, l]) => `<button class="mg-act ${(c.action || 'auto') === k ? 'on' : ''}" data-mg="action" data-v="${k}">${tr(l)}</button>`).join('')}</div>`;
    x += `<div class="mg-row"><span class="mg-lbl">${tr('직급 · 직책 직접 지정')}</span><input class="mg-in" data-mgf="rank" placeholder="${esc(h.grade)}" value="${esc(c.rank || '')}"><input class="mg-in" data-mgf="role" placeholder="${esc(h.role)}" value="${esc(c.role || '')}"><button class="btn ghost sm" data-mg="rank">${tr('저장')}</button></div>`;
    const task = m.task;
    x += `<div class="mg-row kb-link"><span class="mg-lbl">🗂️ ${tr('칸반 카드')}</span>${task && task.key
      ? `<button class="btn ghost sm" data-mg="kb-open" data-v="${esc(task.key)}">${esc(task.key)} · ${esc(String(task.title || '').slice(0, 40))}</button><button class="btn ghost sm ${task.sync !== false ? 'on' : ''}" data-mg="kb-sync">${task.sync !== false ? '🔄 ' + tr('자동 갱신 중') : '⏸️ ' + tr('자동 갱신 꺼짐')}</button><button class="btn ghost sm" data-mg="kb-timer" data-v="${esc(task.key)}">⏱️ ${tr('타이머')}</button><button class="btn ghost sm" data-mg="kb-unlink">${tr('연결 해제')}</button>`
      : `<input class="mg-in" data-mgf="kbkey" placeholder="${tr('카드 번호 (예: ARC-12)')}"><button class="btn ghost sm" data-mg="kb-link">🔗 ${tr('연결')}</button><button class="btn sm" data-mg="kb-create">✨ ${tr('카드 자동 생성 · 연결')}</button>`}</div>`;
    if (s.custom || (world && world.sessions && (world.sessions.find((y) => y.id === s.id) || {}).custom)) x += `<div class="mg-row"><span class="mg-lbl">🧑 ${tr('캐릭터')}</span><span class="muted">${tr('직접 만든 캐릭터예요 — 이름 · 외모 · 행동 · 돈은 관리 센터 › 🧑 캐릭터에서 고쳐요')}</span><button class="btn ghost sm" data-mg="chars-open">${tr('캐릭터 편집')}</button></div>`;
    else { const W = world, live = W && W.sessions ? W.sessions.find((y) => y.id === s.id) : null, pz = (live && live.persona) || s.persona || {};
      x += `<div class="mg-row mg-persona"><span class="mg-lbl">🧑 ${tr('캐릭터')}</span><span class="mg-pz">${esc(pz.flag || '')} <b>${esc(AIO.pname(pz))}</b> <small>${esc(tr(pz.country || ''))} · ${tr('{0}세', pz.age || '-')} · ${esc(pz.mbti || '')}${pz.custom ? '' : ' · ' + tr('자동')}</small></span>`
        + `<input class="mg-in" data-mgf="pzname" placeholder="${tr('이름 직접 입력')}" value="${pz.custom ? esc(pz.name || '') : ''}"><select class="mg-in" data-mgf="pzgender">${[['M', '♂ 남성'], ['F', '♀ 여성'], ['X', '기타']].map(([k, l]) => `<option value="${k}" ${k === pz.gender ? 'selected' : ''}>${tr(l)}</option>`).join('')}</select><select class="mg-in" data-mgf="pznat">${(M.nations || []).map((n) => `<option value="${n.code}" ${n.code === pz.nat ? 'selected' : ''}>${n.flag} ${esc(tr(n.ko))}</option>`).join('')}</select>`
        + `<button class="btn ghost sm" data-mg="pz-save">${tr('저장')}</button><button class="btn ghost sm" data-mg="pz-rand" data-v="name">🎲 ${tr('이름')}</button><button class="btn ghost sm" data-mg="pz-rand" data-v="nat">🎲 ${tr('국적')}</button><button class="btn ghost sm" data-mg="pz-rand" data-v="all">🎲 ${tr('전부')}</button>${pz.custom ? `<button class="btn ghost sm" data-mg="pz-clear">${tr('자동으로')}</button>` : ''}</div>`;
      if (!M.nations && !M.nationsLoading) { M.nationsLoading = true; jfetch('/api/persona/nations').then((r) => { M.nations = r.nations; if (AIO.detail && AIO.detail.refresh) AIO.detail.refresh(); }).catch(() => { M.nationsLoading = false; }); } }
    const w = s.wallet || {};
    if (w.pay) {
      const P = w.pay, n = (v) => Number(v || 0).toLocaleString();
      x += `<details class="mg-pay"><summary>💵 ${tr('급여')} <b>${n(P.monthly)}</b> ${tr('코인/월')} <small>${esc(tr(P.status))} · ${tr('근속 {0}년', P.years)}${P.raisePct ? ` (+${P.raisePct}%)` : ''}</small></summary>`
        + `<div class="mg-paygrid"><div><small>${tr('월급')}</small><b>${n(P.monthly)}</b></div><div><small>${tr('주급')}</small><b>${n(P.weekly)}</b></div><div><small>${tr('일급')}</small><b>${n(P.daily)}</b></div><div><small>${tr('시급 (8시간)')}</small><b>${n(P.hourly)}</b></div></div>`
        + `<table class="mg-paytbl"><tr><th>${tr('직급 기본급')} (Lv.${P.level})</th><td>${n(P.base)}</td></tr><tr><th>${tr('근속 인상')}</th><td>${tr('{0}년 · +{1}%', P.years, P.raisePct)}</td></tr><tr><th>${tr('근무 상태')}</th><td>${esc(tr(P.status))} · ${Math.round(P.factor * 100)}%</td></tr><tr><th>${tr('다음 인상')}</th><td>${tr('{0}일 뒤 → 월 {1}', P.nextRaiseDays, n(P.nextMonthly))}</td></tr><tr><th>${tr('누적 급여 · 성과급')}</th><td>${n(w.salaryTotal)} · ${n(w.perfTotal)} <small class="muted">(${tr('오늘 성과급 {0}', n(w.perfToday))})</small></td></tr></table>`
        + `<div class="mg-slips"><small class="muted">${tr('급여명세 (최근)')}</small>${(w.slips || []).length ? w.slips.map((sl) => `<div class="mg-slip"><span>${esc(sl.day)}</span><span>${tr(sl.status)}${sl.days > 1 ? ` · ${tr('{0}일치', sl.days)}` : ''}</span><b>+${n(sl.amount)}</b><small class="muted">${tr('성과급 {0}', n(sl.perf))}</small></div>`).join('') : `<span class="muted">${tr('내일 첫 일급이 나와요')}</span>`}</div></details>`;
    }
    x += `<details class="mg-wallet"><summary>💰 ${tr('지갑')} <b>${(w.coins || 0).toLocaleString()}</b> ${tr('코인')} <small>${tr('누적 {0} · 일한 {1}분', (w.earned || 0).toLocaleString(), w.workMin || 0)}${w.loan ? ' · 💸 ' + tr('대출 {0}', Number(w.loan).toLocaleString()) : ''}${w.deposit ? ' · 🐷 ' + tr('예금 {0}', Number(w.deposit).toLocaleString()) : ''}${w.status && w.status !== '정상' && w.status !== '대출 중' ? ' · 🚨 ' + tr(w.status) : ''}${w.home ? ' · ' + w.home.icon : ''}${w.car ? ' ' + w.car.icon : ''}</small></summary>`
      + `<div class="mg-owned">${(w.items || []).map((it) => `<span title="${esc(it.name)}">${it.icon}</span>`).join('') || `<span class="muted">${tr('아직 산 게 없어요')}</span>`} <small class="muted">🍽️ ${tr('식사 {0}번', w.meals || 0)}${w.last ? ` · ${tr('최근')}: ${w.last.icon} ${esc(w.last.name)}` : ''}</small></div>`
      + `<div class="mg-shop" data-shop>${tr('불러오는 중…')}</div><div class="mg-row"><input class="mg-in" data-mgf="grant" type="number" placeholder="${tr('코인')}"><button class="btn ghost sm" data-mg="grant">💸 ${tr('지급')}</button><button class="btn ghost sm" data-mg="company-open">💼 ${tr('회사 관리')}</button><button class="btn ghost sm" data-mg="disclose">🔐 ${tr('정보공개 설정')}</button></div></details>`;
    x += `<details class="mg-memo" ${m.memo ? 'open' : ''}><summary>📝 ${tr('메모')}${m.memoAt ? ` <small>${tr('{0} 전 수정', ago(m.memoAt))}</small>` : ''}</summary><textarea class="mg-ta" data-mgf="memo" placeholder="${tr('이 세션에 대한 메모…')}">${esc(m.memo || '')}</textarea><button class="btn sm" data-mg="memo">${tr('메모 저장')}</button></details>`;
    return x + '</div>';
  }
  async function onExtra(btn) {
    const box = btn.closest('[data-sid]');
    const id = box && box.dataset.sid;
    const s = sessions().find((x) => x.id === id);
    if (!s) return;
    const c = s.ctl || {};
    try {
      switch (btn.dataset.mg) {
        case 'dismiss': await dismiss(s); break;
        case 'pin': await setMeta(id, { pinned: !c.pinned }); toast(c.pinned ? tr('고정을 풀었어요') : tr('📌 지금 일하는 중에 올렸어요')); break;
        case 'action': await setMeta(id, { action: btn.dataset.v === 'auto' ? null : btn.dataset.v }); toast(tr('동작을 바꿨어요')); break;
        case 'rank': await setMeta(id, { rank: box.querySelector('[data-mgf=rank]').value.trim() || null, role: box.querySelector('[data-mgf=role]').value.trim() || null }); toast(tr('직급·직책을 저장했어요')); break;
        case 'memo': await setMeta(id, { memo: box.querySelector('[data-mgf=memo]').value }); toast(tr('📝 메모를 저장했어요')); break;
        case 'place': open('building', { sid: id }); break;
        case 'archive': open('archive', { id, snap: true }); break;
        case 'kb-open': AIO.kanban.openCard(btn.dataset.v); break;
        case 'kb-timer': AIO.kanban.startTimer(btn.dataset.v); break;
        case 'kb-link': { const key = box.querySelector('[data-mgf=kbkey]').value.trim(); if (!key) return; await AIO.kanban.link({ id, key }); toast(tr('🔗 카드를 연결했어요')); break; }
        case 'kb-create': { toast(tr('카드 만드는 중…')); const r = await AIO.kanban.link({ id, create: true }); toast(tr('✨ {0} 만들고 연결했어요', r.card.key)); break; }
        case 'kb-unlink': await AIO.kanban.link({ id, key: null }); toast(tr('연결을 끊었어요')); break;
        case 'kb-sync': await jfetch('/api/tcc/sync', { id, sync: !((s.meta || {}).task || {}).sync === false ? false : true }); break;
        case 'chars-open': open('chars'); break;
        case 'company-open': open('company'); break;
        case 'pz-save': { const name = box.querySelector('[data-mgf=pzname]').value.trim(), nat = box.querySelector('[data-mgf=pznat]').value, gender = box.querySelector('[data-mgf=pzgender]').value; await jfetch('/api/persona', { id, persona: { ...(name ? { name } : {}), nat, gender } }); toast(tr('🧑 캐릭터를 저장했어요')); break; }
        case 'pz-rand': { const nat = box.querySelector('[data-mgf=pznat]').value; const gender = box.querySelector('[data-mgf=pzgender]').value; const r = await jfetch('/api/persona', { id, random: btn.dataset.v, ...(btn.dataset.v === 'name' ? { persona: { nat, gender } } : {}) }); toast(tr('🎲 {0} {1}', r.persona.flag, r.persona.name)); break; }
        case 'pz-clear': await jfetch('/api/persona', { id, clear: true }); toast(tr('자동 인물로 돌렸어요')); break;
        case 'buy': { const r = await jfetch('/api/econ/buy', { id, item: btn.dataset.v }); toast(tr('🛒 샀어요')); break; }
        case 'grant': await jfetch('/api/econ/grant', { id, coins: +box.querySelector('[data-mgf=grant]').value || 0 }); toast(tr('💸 지급했어요')); break;
        case 'disclose': open('sessions', {}); setTimeout(() => discloseModal(id), 50); break;
      }
    } catch (e) { toast('⚠️ ' + e.message); }
  }

  // ================================================================ 전체 화면 관리 창
  const M = { tab: 'sessions', q: '', filter: 'all', sort: 'recent', arch: { list: [], id: null, data: null, edit: false, page: 1, roles: { user: 1, assistant: 1, tool: 1, thinking: 0 }, q: '' }, bld: { sid: null, lv: null, lock: true }, keys: null, settings: null, newKey: null };
  function el() {
    let o = document.getElementById('mgr');
    if (!o) {
      o = document.createElement('div'); o.id = 'mgr'; o.hidden = true;
      document.body.appendChild(o);
      o.addEventListener('click', onMgrClick);
      o.addEventListener('input', (ev) => { const t = ev.target; if (t.dataset.mgq != null) { M.q = t.value; renderBody(); keepFocus(t); } else if (t.dataset.aq != null) { M.arch.q = t.value; renderBody(); keepFocus(t); } });
      o.addEventListener('change', onMgrChange);
    }
    return o;
  }
  const keepFocus = (t) => { const sel = t.dataset.mgq != null ? '[data-mgq]' : '[data-aq]'; const n = document.querySelector('#mgr ' + sel); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } };
  function open(tab, o = {}) {
    const box = el();
    M.tab = tab || M.tab;
    if (o.sid) M.bld.sid = o.sid;
    box.hidden = false;
    renderShell();
    if (M.tab === 'archive') loadArchive(o.id, o.snap);
    if (M.tab === 'admin') loadAdmin();
    if (M.tab === 'users') loadUsers();
  }
  function close() { el().hidden = true; }
  const TABS = [['sessions', '👥 세션 관리'], ['kanban', '🗂️ 칸반'], ['mgm', '🏛️ 행정'], ['chars', '🧑 캐릭터'], ['company', '💼 회사'], ['archive', '📦 세션 보관함'], ['building', '🏢 빌딩 관리'], ['users', '🪪 계정 · 정보공개'], ['admin', '🔌 연동 · 설정']];
  function renderShell() {
    const box = el();
    box.innerHTML = `<div class="mg-card"><div class="mg-head"><h2>🗂️ ${tr('관리 센터')}</h2><div class="mg-tabs">${TABS.map(([k, l]) => `<button data-mtab="${k}" class="${M.tab === k ? 'on' : ''}">${tr(l)}</button>`).join('')}</div><button class="mg-x" data-mclose>✕</button></div><div class="mg-body" id="mgBody"></div></div>`;
    renderBody();
  }
  function renderBody() {
    const b = document.getElementById('mgBody');
    if (!b) return;
    if (!authed()) { b.innerHTML = `<div class="lock">${tr('🔒 관리자 로그인이 필요해요.')}</div>`; return; }
    if (M.tab === 'sessions') b.innerHTML = sessionsView();
    else if (M.tab === 'archive') b.innerHTML = archiveView();
    else if (M.tab === 'building') b.innerHTML = buildingView();
    else if (M.tab === 'users') b.innerHTML = usersView();
    else if (M.tab === 'company') { if (!b.querySelector('.co-host')) b.innerHTML = '<div class="co-host"></div>'; AIO.company.mount(b.querySelector('.co-host')); }
    else if (M.tab === 'chars') { if (!b.querySelector('.ch-host')) b.innerHTML = '<div class="ch-host"></div>'; AIO.chars.mount(b.querySelector('.ch-host')); }
    else if (M.tab === 'mgm') { if (!b.querySelector('.mm-host')) b.innerHTML = '<div class="mm-host"></div>'; AIO.mgm.mount(b.querySelector('.mm-host')); }
    else if (M.tab === 'kanban') { if (!b.querySelector('.kb-host')) { b.innerHTML = '<div class="kb-host"></div>'; } AIO.kanban.mount(b.querySelector('.kb-host')); }
    else b.innerHTML = adminView();
  }
  /** 상태가 갱신될 때마다 (세션 · 빌딩 탭만, 입력 중이 아니면) */
  function refresh() {
    const box = document.getElementById('mgr');
    if (!box || box.hidden || !(M.tab === 'sessions' || M.tab === 'building')) return;
    const a = document.activeElement;
    if (a && box.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')) return;
    const sc = box.querySelector('.mg-scroll'); const top = sc ? sc.scrollTop : 0;
    renderBody();
    const sc2 = box.querySelector('.mg-scroll'); if (sc2) sc2.scrollTop = top;
  }

  // ---------------------------------------------------------------- 👥 세션 관리
  const PLACE = { active: '🏢 근무', paused: '⏸️ 일시정지', stopped: '🏭 중단', jail: '🚔 감옥', dungeon: '🐉 던전', vault: '🏦 금고' };
  const FILTERS = [['all', '전체'], ['busy', '작업중'], ['urgent', '결정 필요'], ['pinned', '📌 고정'], ['rest', '휴식'], ['stopped', '중단'], ['jail', '감옥·던전·금고'], ['harness', '하네스'], ['memo', '📝 메모']];
  function whereOf(s) {
    const e = world && world.ents.get('S:' + s.id);
    if (!e || !world.S) return '';
    const L = world.S.levels[e.lv || 0];
    return L ? (e.spot && e.spot.tag ? `${L.name} · ${e.spot.tag}` : L.name) : '';
  }
  function sessionsView() {
    const q = M.q.trim().toLowerCase();
    let list = sessions().filter((s) => {
      const c = s.ctl || {};
      switch (M.filter) {
        case 'busy': if (!AIO.isBusy(s.status)) return false; break;
        case 'urgent': if (!AIO.isUrgent(s.status)) return false; break;
        case 'pinned': if (!c.pinned) return false; break;
        case 'rest': if (!(s.status === 'idle' || s.status === 'done' || s.place === 'paused')) return false; break;
        case 'stopped': if (s.place !== 'stopped') return false; break;
        case 'jail': if (s.place !== 'jail' && s.place !== 'vault' && s.place !== 'dungeon') return false; break;
        case 'harness': if (s.kind !== 'harness') return false; break;
        case 'memo': if (!s.meta?.memo) return false; break;
      }
      return !q || [s.title, s.project, code(s.id), s.model, s.meta?.memo, s.activity?.label].some((v) => String(v || '').toLowerCase().includes(q));
    });
    const key = { recent: (s) => -(s.lastActive || 0), level: (s) => -(s.level || 0), today: (s) => -(s.stats?.today || 0), status: (s) => (AIO.isUrgent(s.status) ? 0 : AIO.isBusy(s.status) ? 1 : 2) * 1e13 - (s.lastActive || 0), title: (s) => String(s.title || '') }[M.sort];
    list = list.sort((a, b) => { const x = key(a), y = key(b); return typeof x === 'string' ? x.localeCompare(y) : x - y; });
    let h = `<div class="mg-tools"><input class="mg-search" data-mgq placeholder="🔎 ${tr('제목 · 프로젝트 · 메모 검색')}" value="${esc(M.q)}"><div class="mg-filters">${FILTERS.map(([k, l]) => `<button data-mf="${k}" class="${M.filter === k ? 'on' : ''}">${tr(l)}</button>`).join('')}</div><select data-msort>${[['recent', '최근 활동순'], ['status', '상태순'], ['level', '레벨순'], ['today', '오늘 처리순'], ['title', '이름순']].map(([k, l]) => `<option value="${k}" ${M.sort === k ? 'selected' : ''}>${tr(l)}</option>`).join('')}</select><span class="mg-n">${list.length} / ${sessions().length}</span></div>`;
    h += `<div class="mg-scroll"><table class="mg-table"><thead><tr><th></th><th>${tr('세션')}</th><th>${tr('직급 · 직책')}</th><th>${tr('상태 · 활동')}</th><th>${tr('위치')}</th><th>${tr('메모')}</th><th>${tr('관리')}</th></tr></thead><tbody>`;
    for (const s of list) {
      const st = AIO.status(s.status), hh = hr.ofSession(s), c = s.ctl || {};
      h += `<tr data-sid="${esc(s.id)}"><td><span class="mg-code" style="background:${AIO.provider(s.provider).accent}">${esc(code(s.id))}</span></td>`;
      h += `<td class="mg-title"><b>${esc(s.title || '-')}</b><small>${esc(s.project || '')}${s.kind === 'harness' ? ` · 🧶 ${tr('팀원 {0}', (s.roster || []).length)}` : ''} · Lv.${s.level || 1} · ${tr('오늘 {0}', s.stats?.today || 0)}</small></td>`;
      h += `<td>${esc(hh.grade)}<small>${esc(hh.role)}</small></td>`;
      h += `<td><span class="st" style="background:${st.color}">${esc(st.label)}</span>${s.dismissed ? ' 🔕' : ''}<small>${esc(AIO.i18n.act(s.activity?.label, s.activity?.type) || '')} · ${ago(s.lastActive)}</small></td>`;
      h += `<td>${esc(tr(PLACE[s.place] || ''))}${c.lock ? ' 📌' : ''}<small>${esc(whereOf(s))}</small></td>`;
      h += `<td class="mg-memo-cell">${s.meta?.memo ? esc(s.meta.memo.slice(0, 60)) : '<span class="muted">-</span>'}</td>`;
      h += `<td class="mg-acts"><button data-row="open" title="${tr('상세')}">🔍</button><button data-row="pin" class="${c.pinned ? 'on' : ''}" title="${tr('지금 일하는 중에 고정')}">📌</button>${AIO.isUrgent(s.status) ? `<button data-row="dismiss" title="${tr('결정 알림 해제')}">🔕</button>` : ''}<button data-row="memo" title="${tr('메모')}">📝</button><button data-row="place" title="${tr('자리 배치')}">📍</button><button data-row="archive" title="${tr('보관본')}">📦</button><button data-row="disclose" title="${tr('정보공개')}">🔐</button>${s.placeOverride ? `<button data-row="release" title="${tr('석방')}">🔓</button>` : `<button data-row="dungeon" title="${tr('비밀던전에 보내기')}">🐉</button>`}</td></tr>`;
    }
    return h + '</tbody></table></div>';
  }
  async function rowAction(tr0, act) {
    const id = tr0.dataset.sid, s = sessions().find((x) => x.id === id);
    if (!s) return;
    try {
      if (act === 'open') { close(); AIO.ui.open('S:' + id); }
      else if (act === 'pin') await setMeta(id, { pinned: !(s.ctl || {}).pinned });
      else if (act === 'dismiss') await dismiss(s);
      else if (act === 'memo') { const v = prompt(tr('메모'), s.meta?.memo || ''); if (v != null) { await setMeta(id, { memo: v }); toast(tr('📝 메모를 저장했어요')); } }
      else if (act === 'place') { M.tab = 'building'; M.bld.sid = id; renderShell(); }
      else if (act === 'archive') { M.tab = 'archive'; renderShell(); loadArchive(id, true); }
      else if (act === 'dungeon') { await jfetch('/api/place', { id, place: 'dungeon' }); toast(tr('🐉 비밀던전으로 보냈어요')); }
      else if (act === 'release') { await jfetch('/api/place', { id, place: null }); toast(tr('🔓 석방했어요')); }
      else if (act === 'disclose') discloseModal(id);
    } catch (e) { toast('⚠️ ' + e.message); }
  }

  // ---------------------------------------------------------------- 📦 세션 보관함
  const media = new Map();     // `${id}/${file}` → blob URL (인증 헤더가 필요해서 fetch 로 받는다)
  async function loadMedia() {
    const imgs = document.querySelectorAll('#mgr img[data-media]');
    for (const im of imgs) {
      const k = im.dataset.media;
      if (media.has(k)) { im.src = media.get(k); continue; }
      const [id, file] = k.split('\n');
      try { const r = await api(`/api/archive/${encodeURIComponent(id)}/media/${encodeURIComponent(file)}`); if (r.ok) { const u = URL.createObjectURL(await r.blob()); media.set(k, u); im.src = u; } } catch {}
    }
  }
  async function loadArchive(id, snap) {
    const A = M.arch;
    try {
      if (snap && id) await jfetch('/api/archive/snapshot', { id }).catch(() => {});
      A.list = (await jfetch('/api/archive')).items || [];
      A.status = null;
      if (id) { A.id = id; A.page = 1; A.edit = false; A.data = await jfetch(`/api/archive/${encodeURIComponent(id)}`).catch(() => null); }
    } catch (e) { toast('⚠️ ' + e.message); }
    if (M.tab === 'archive') { renderBody(); loadMedia(); if (A.data) { const c = document.querySelector('#mgr .ar-conv'); if (c) c.scrollTop = c.scrollHeight; } }
  }
  const ROLE = { user: ['🙋', '사용자'], assistant: ['🤖', 'AI'], tool: ['🔧', '도구 결과'], system: ['⚙️', '시스템'] };
  function partHtml(p, id, editing, mi, pi) {
    if (editing && (p.type === 'text' || p.type === 'thinking' || p.type === 'tool_result')) return `<textarea class="ar-ta" data-m="${mi}" data-p="${pi}">${esc(p.text || '')}</textarea>`;
    switch (p.type) {
      case 'text': return `<div class="ar-text">${fmtText(p.text || '')}</div>`;
      case 'thinking': return M.arch.roles.thinking ? `<details class="ar-think"><summary>💭 ${tr('생각')}</summary><div class="ar-text">${fmtText(p.text || '')}</div></details>` : '';
      case 'tool_use': return `<details class="ar-tool"><summary>🔧 ${esc(p.name || '')}</summary><pre>${esc(p.input || '')}</pre></details>`;
      case 'tool_result': return `<details class="ar-res ${p.isError ? 'err' : ''}"><summary>${p.isError ? '⚠️' : '↳'} ${esc((p.text || '').slice(0, 90))}</summary><pre>${esc(p.text || '')}</pre></details>`;
      case 'image': return p.file ? `<img class="ar-img" data-media="${esc(id + '\n' + p.file)}" alt="${tr('이미지')}">` : `<span class="muted">🖼️ ${tr('(이미지)')}</span>`;
      default: return '';
    }
  }
  const fmtText = (t) => esc(t).replace(/```([\s\S]*?)```/g, (m, c) => `<pre>${c}</pre>`).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  function archiveView() {
    const A = M.arch;
    const live = new Set(sessions().map((s) => s.id));
    let h = `<div class="ar-wrap"><div class="ar-left"><div class="ar-tools"><button class="btn sm" data-ar="snapall">🔄 ${tr('지금 전부 보관')}</button><label class="btn ghost sm">⬆ ${tr('올리기')}<input type="file" accept=".json" data-ar-import hidden></label></div><div class="ar-list mg-scroll">`;
    h += A.list.map((it) => `<button class="ar-item ${A.id === it.id ? 'on' : ''}" data-arid="${esc(it.id)}"><b>${live.has(it.id) ? '🟢 ' : ''}${esc(it.title || it.id)}</b><small>${esc(it.project || it.provider)} · ${tr('{0}개', it.count || 0)}${it.media ? ` · 🖼️${it.media}` : ''}${it.edited ? ' · ✏️' : ''}${it.imported ? ' · ⬆' : ''} · ${tr('{0} 전', ago(it.savedAt))}</small></button>`).join('') || `<div class="empty-note">${tr('아직 보관된 세션이 없어요')}</div>`;
    h += `</div><div class="ar-foot">${tr('보관 위치: 서버 폴더의 archive/ (세션마다 원본 JSONL · 정규화 대화 · 이미지)')}</div></div><div class="ar-right">`;
    if (!A.data) return h + `<div class="empty-note">${tr('왼쪽에서 세션을 고르세요')}</div></div></div>`;
    const id = A.id, msgs = A.data.messages || [], q = A.q.trim().toLowerCase();
    const show = msgs.map((m, i) => [m, i]).filter(([m]) => (A.roles[m.role] ?? 1) && (!q || m.parts.some((p) => String(p.text || p.input || '').toLowerCase().includes(q))));
    const limit = A.page * 200, shown = show.slice(Math.max(0, show.length - limit));
    h += `<div class="ar-head"><div><h3>${esc(A.data.meta.session?.title || id)}</h3><small>${esc(A.data.meta.session?.project || '')} · ${esc(A.data.meta.session?.model || '')} · ${tr('메시지 {0}개', msgs.length)}${A.data.edited ? ' · ✏️ ' + tr('편집본') : ''}</small></div>`;
    h += `<div class="ar-btns">${['json', 'openai', 'md', 'jsonl'].map((f) => `<button class="btn ghost sm" data-ar="export" data-fmt="${f}">⬇ ${{ json: 'JSON', openai: 'OpenAI', md: 'Markdown', jsonl: tr('원본') }[f]}</button>`).join('')}${live.has(id) ? `<button class="btn ghost sm" data-ar="snap">🔄 ${tr('다시 보관')}</button>` : ''}${A.edit ? `<button class="btn sm" data-ar="save">💾 ${tr('저장')}</button><button class="btn ghost sm" data-ar="cancel">${tr('취소')}</button>` : `<button class="btn ghost sm" data-ar="edit">✏️ ${tr('편집')}</button>`}${A.data.edited && !A.edit ? `<button class="btn ghost sm" data-ar="reset">↩ ${tr('원본으로')}</button><button class="btn sm" data-ar="apply" title="${tr('편집본을 실제 세션 기록에 써 넣어요 (원본은 백업)')}">⚡ ${tr('실제 세션에 반영')}</button>` : ''}${A.data.meta && A.data.meta.lastBackup && !A.edit ? `<button class="btn ghost sm" data-ar="restore">⏪ ${tr('반영 되돌리기')}</button>` : ''}</div></div>`;
    h += `<div class="ar-filters">${Object.entries({ user: '🙋 사용자', assistant: '🤖 AI', tool: '🔧 도구', thinking: '💭 생각' }).map(([k, l]) => `<button data-arrole="${k}" class="${A.roles[k] ? 'on' : ''}">${tr(l)}</button>`).join('')}<input class="mg-search" data-aq placeholder="🔎 ${tr('대화 검색')}" value="${esc(A.q)}"><span class="mg-n">${show.length}</span></div>`;
    h += `<div class="ar-conv mg-scroll">${show.length > shown.length ? `<button class="btn ghost sm ar-more" data-ar="more">⬆ ${tr('이전 메시지 더 보기 ({0})', show.length - shown.length)}</button>` : ''}`;
    for (const [m, i] of shown) {
      const [ic, nm] = ROLE[m.role] || ['•', m.role];
      const body = m.parts.map((p, pi) => partHtml(p, id, A.edit, i, pi)).join('');
      if (!body && !A.edit) continue;
      h += `<div class="ar-msg ${m.role}" data-mi="${i}"><div class="ar-meta">${A.edit ? `<select data-mrole="${i}">${Object.keys(ROLE).map((r) => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${ROLE[r][0]} ${tr(ROLE[r][1])}</option>`).join('')}</select>` : `<span>${ic} ${tr(nm)}</span>`}<small>${m.ts ? new Date(m.ts).toLocaleString() : ''}${m.edited ? ' · ✏️' : ''}</small>${A.edit ? `<span class="ar-ed"><button data-ared="up" title="${tr('위로')}">↑</button><button data-ared="down" title="${tr('아래로')}">↓</button><button data-ared="ins" title="${tr('아래에 끼워넣기')}">➕</button><button data-ared="del" title="${tr('삭제')}">🗑</button></span>` : ''}</div>${body}</div>`;
    }
    return h + '</div></div></div>';
  }
  function collectEdits() {
    const A = M.arch, msgs = A.data.messages;
    document.querySelectorAll('#mgr .ar-ta').forEach((ta) => { const m = msgs[+ta.dataset.m], p = m && m.parts[+ta.dataset.p]; if (p && p.text !== ta.value) { p.text = ta.value; m.edited = true; } });
    document.querySelectorAll('#mgr [data-mrole]').forEach((sel) => { const m = msgs[+sel.dataset.mrole]; if (m && m.role !== sel.value) { m.role = sel.value; m.edited = true; } });
  }
  async function archAction(btn) {
    const A = M.arch, id = A.id;
    try {
      switch (btn.dataset.ar) {
        case 'snapall': toast(tr('보관 중…')); { const r = await jfetch('/api/archive/snapshot', { all: true }); toast(tr('📦 {0}개 세션을 보관했어요', r.saved)); } await loadArchive(id); break;
        case 'snap': await loadArchive(id, true); toast(tr('📦 다시 보관했어요')); break;
        case 'export': {
          const r = await api(`/api/archive/${encodeURIComponent(id)}/export?fmt=${btn.dataset.fmt}`);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const name = decodeURIComponent((r.headers.get('Content-Disposition') || '').split("''")[1] || `session.${btn.dataset.fmt}`);
          const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob()); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          break;
        }
        case 'edit': A.edit = true; A.backup = JSON.stringify(A.data.messages); renderBody(); loadMedia(); break;
        case 'cancel': A.data.messages = JSON.parse(A.backup); A.edit = false; renderBody(); loadMedia(); break;
        case 'save': collectEdits(); await jfetch(`/api/archive/${encodeURIComponent(id)}`, { messages: A.data.messages }, 'PUT'); A.edit = false; toast(tr('💾 편집본을 저장했어요 (원본은 그대로)')); await loadArchive(id); break;
        case 'reset': if (!confirm(tr('편집한 내용을 버리고 원본 대화로 되돌릴까요?'))) return; await jfetch(`/api/archive/${encodeURIComponent(id)}/edits`, null, 'DELETE'); await loadArchive(id); break;
        case 'apply': {
          if (!confirm(tr('편집본을 실제 세션 기록(Claude Code 원본 파일)에 써 넣을까요?\n\n· 원본은 보관함 backups/ 에 백업돼요 (⏪ 반영 되돌리기 가능)\n· 그 세션을 이어서 열면 고친 대화로 이어져요\n· 도구 호출/결과 · 생각 블록은 건드리지 않아요\n· 세션이 작업 중이면 거부돼요'))) return;
          const r = await api(`/api/archive/${encodeURIComponent(id)}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
          toast(tr('⚡ 반영했어요 — 고침 {0} · 끼움 {1} · 지움 {2}', j.edited, j.inserted, j.deleted) + (j.skipped && j.skipped.length ? ` (${tr('건너뜀 {0}', j.skipped.length)})` : ''));
          if (j.skipped && j.skipped.length) setTimeout(() => alert(tr('반영하지 않은 것') + ':\n' + j.skipped.join('\n')), 300);
          await loadArchive(id); break;
        }
        case 'restore': {
          if (!confirm(tr('마지막 반영 직전의 원본으로 세션 기록을 되돌릴까요?'))) return;
          const r = await api(`/api/archive/${encodeURIComponent(id)}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
          toast(tr('⏪ 원본으로 되돌렸어요')); await loadArchive(id, true); break;
        }
        case 'more': A.page++; renderBody(); loadMedia(); break;
      }
    } catch (e) { toast('⚠️ ' + e.message); }
  }
  function editOp(btn) {
    collectEdits();
    const msgs = M.arch.data.messages, i = +btn.closest('[data-mi]').dataset.mi;
    const op = btn.dataset.ared;
    if (op === 'del') msgs.splice(i, 1);
    else if (op === 'ins') msgs.splice(i + 1, 0, { role: 'user', ts: Date.now(), parts: [{ type: 'text', text: '' }], edited: true });
    else if (op === 'up' && i > 0) [msgs[i - 1], msgs[i]] = [msgs[i], msgs[i - 1]];
    else if (op === 'down' && i < msgs.length - 1) [msgs[i + 1], msgs[i]] = [msgs[i], msgs[i + 1]];
    msgs.forEach((m, k) => { m.i = k; });
    renderBody(); loadMedia();
  }
  async function importFile(inp) {
    const f = inp.files && inp.files[0];
    if (!f) return;
    try { const data = JSON.parse(await f.text()); const r = await jfetch('/api/archive/import', { data, name: f.name.replace(/\.json$/, '') }); toast(tr('⬆ {0}개 메시지를 가져왔어요', r.count)); await loadArchive(r.id); }
    catch (e) { toast('⚠️ ' + e.message); }
  }

  // ---------------------------------------------------------------- 🏢 빌딩 관리
  function spotsOf(L) {
    const S = world.S, out = [];
    const add = (list, kind, label) => (list || []).forEach((sp, i) => { if (sp && sp.lv === L.idx) out.push({ sp, kind, label: sp.tag || `${label} ${i + 1}` }); });
    let n = 0;
    for (const [k, sp] of S.seats) if (sp.lv === L.idx) out.push({ sp, kind: 'seat', key: k, label: sp.lead ? '👔 팀장 자리' : `💻 자리 ${++n}` });
    add(S.hot, 'hot', '🎒 핫데스크'); add(S.meeting, 'meet', '🗣️ 회의석'); add(S.rest, 'rest', '☕ 휴식'); add(S.visitorSeats, 'visit', '🛋️ 대기석');
    add(S.jail, 'jail', '⛓️ 감방'); add(S.vault, 'vault', '🔐 금고'); add(S.underRest, 'rest', '🛋️ 지하휴게'); add(S.underDorm, 'rest', '🛏️ 지하숙소'); add(S.dorms, 'rest', '🔬 개인연구실'); add(S.dungeon, 'jail', '🐉 던전');
    return out;
  }
  function occupants() {
    const m = new Map();
    for (const e of world.ents.values()) if (e.spot && (e.kind === 'main' || e.kind === 'member' || e.kind === 'intern')) m.set(e.spot, e);
    return m;
  }
  function buildingView() {
    if (!world || !world.S) return '';
    const S = world.S, B = M.bld;
    const tower = S.buildings.find((b) => b.type === 'tower') || S.buildings[0];
    const lvls = (tower ? tower.levels.slice().reverse() : []).concat([0]).map((i) => S.levels[i]).filter(Boolean);
    if (B.lv == null || !lvls.some((L) => L.idx === B.lv)) B.lv = (lvls.find((L) => /업무층/.test(L.key || L.name)) || lvls[0]).idx;
    const L = S.levels[B.lv];
    const cfg = ((AIO.buildingCfg || {}).floors || {})[L.key || L.name] || {};
    const occ = occupants();
    const ss = sessions().filter((s) => s.kind !== 'app');
    const sel = ss.find((s) => s.id === B.sid);
    let h = `<div class="bd-wrap"><div class="bd-floors mg-scroll">${lvls.map((x) => { let n = 0; for (const e of world.ents.values()) if ((e.lv || 0) === x.idx && (e.kind === 'main' || e.kind === 'member')) n++; return `<button data-bdlv="${x.idx}" class="${x.idx === B.lv ? 'on' : ''}"><b>${esc(x.short || '')}</b><span>${esc(x.customTitle || x.name.split(' ').slice(1).join(' ') || x.name)}</span><em>${n}</em></button>`; }).join('')}</div><div class="bd-main mg-scroll">`;
    h += `<div class="bd-sec"><h3>🏷️ ${tr('층 이름')} <small>${esc(L.key || L.name)}</small></h3><div class="mg-row"><input class="mg-in wide" data-bdtitle placeholder="${esc((L.key || L.name).split(' ').slice(1).join(' '))}" value="${esc(cfg.title || '')}"><button class="btn sm" data-bd="title">${tr('이름 저장')}</button><span class="muted">${tr('층 버튼 · 층 간판에 표시돼요')}</span></div></div>`;
    const groups = L.groups || [];
    if (groups.length) {
      h += `<div class="bd-sec"><h3>📋 ${tr('테이블 그룹 업무')}</h3><table class="mg-table bd-groups"><thead><tr><th>${tr('그룹')}</th><th>${tr('업무 (표지판에 표시)')}</th><th>${tr('상세 설명 · 담당 범위')}</th></tr></thead><tbody>`;
      groups.forEach((g, i) => { const c = (cfg.groups || {})[i] || {}; h += `<tr data-gi="${i}"><td>${esc(g.text.split(' · 📋')[0])}</td><td><input class="mg-in" data-gtask value="${esc(c.task || '')}" placeholder="${tr('예: 프론트엔드 · 리서치')}"></td><td><input class="mg-in wide" data-gnote value="${esc(c.note || '')}" placeholder="${tr('이 그룹이 맡는 일')}"></td></tr>`; });
      h += `</tbody></table><button class="btn sm" data-bd="groups">💾 ${tr('업무 저장')}</button></div>`;
    }
    h += `<div class="bd-sec"><h3>📍 ${tr('자리 배치')}</h3><div class="mg-row"><select data-bdsid><option value="">${tr('— 배치할 세션 고르기 —')}</option>${ss.map((s) => `<option value="${esc(s.id)}" ${s.id === B.sid ? 'selected' : ''}>${esc(code(s.id))} ${esc(s.title || '')}${s.ctl?.assign ? ' 📍' : ''}${s.ctl?.lock ? '📌' : ''}</option>`).join('')}</select><label class="mg-chk"><input type="checkbox" data-bdlock ${B.lock ? 'checked' : ''}> ${tr('강제 배치 고정 (자동 배치 막기)')}</label></div>`;
    if (sel) {
      const c = sel.ctl || {};
      h += `<div class="mg-row bd-cur">${tr('현재')}: <b>${esc(code(sel.id))} ${esc(sel.title || '')}</b> · ${esc(whereOf(sel))}${c.assign ? ` · 📍 ${esc(c.assign.label || c.assign.level)}${c.lock ? ' (📌 ' + tr('고정') + ')' : ''}` : ` · ${tr('자동 배치')}`}`;
      h += `${c.assign || c.lock ? `<button class="btn ghost sm" data-bd="auto">🤖 ${tr('자동 배치로 되돌리기')}</button>` : ''}${sel.placeOverride ? `<button class="btn ghost sm" data-bd="release">🔓 ${tr('감옥·금고에서 꺼내기')}</button>` : ''}${sel.place === 'stopped' ? `<span class="muted">${tr('오래 쉰 세션은 고정 배치해야 지하에서 올라와요')}</span>` : ''}</div>`;
    }
    h += `<p class="muted">${tr('세션을 고른 뒤 아래 자리를 누르면 그 자리에 배치돼요. 고정하면 상태가 바뀌어도 그 자리에 있어요.')}</p>`;
    const spots = spotsOf(L);
    const kinds = [['seat', '💻 책상'], ['hot', '🎒 핫데스크'], ['meet', '🗣️ 회의석'], ['rest', '☕ 휴식'], ['visit', '🛋️ 대기석'], ['jail', '⛓️ 감옥·던전'], ['vault', '🔐 금고']];
    for (const [k, l] of kinds) {
      const list = spots.filter((x) => x.kind === k);
      if (!list.length) continue;
      h += `<div class="bd-kind">${tr(l)} <small>${list.length}</small></div><div class="bd-spots">`;
      list.forEach((x, i) => {
        const e = occ.get(x.sp), who = e ? (e.kind === 'main' ? `${code(e.sid)}` : e.kind === 'member' ? `🧶${esc(String(e.name).slice(0, 6))}` : '🎒') : '';
        const mine = sel && sel.ctl?.assign && sel.ctl.assign.level === (L.key || L.name) && Math.hypot(sel.ctl.assign.x - x.sp.x, sel.ctl.assign.y - x.sp.y) < 0.3;
        h += `<button class="bd-spot ${e ? 'taken' : ''} ${mine ? 'mine' : ''}" data-spot="${k}:${i}" title="${esc(x.label)} (${x.sp.x.toFixed(1)}, ${x.sp.y.toFixed(1)})"><span>${esc(x.label.replace(/^\S+\s/, ''))}</span><em>${who || tr('빈 자리')}</em></button>`;
      });
      h += '</div>';
    }
    return h + '</div></div></div>';
  }
  async function bdAction(btn) {
    const B = M.bld, L = world.S.levels[B.lv], key = L.key || L.name;
    try {
      if (btn.dataset.bd === 'title') { await jfetch('/api/building', { key, title: document.querySelector('#mgr [data-bdtitle]').value }); toast(tr('🏷️ 층 이름을 저장했어요')); }
      else if (btn.dataset.bd === 'groups') {
        const groups = {};
        document.querySelectorAll('#mgr tr[data-gi]').forEach((r) => { groups[r.dataset.gi] = { task: r.querySelector('[data-gtask]').value, note: r.querySelector('[data-gnote]').value }; });
        await jfetch('/api/building', { key, groups }); toast(tr('📋 업무를 저장했어요'));
      } else if (btn.dataset.bd === 'auto') { await setMeta(B.sid, { assign: null, lock: null }); toast(tr('🤖 자동 배치로 되돌렸어요')); }
      else if (btn.dataset.bd === 'release') { await jfetch('/api/place', { id: B.sid, place: null }); toast(tr('🔓 꺼냈어요')); }
    } catch (e) { toast('⚠️ ' + e.message); }
  }
  async function spotClick(btn) {
    const B = M.bld;
    if (!B.sid) { toast(tr('먼저 배치할 세션을 고르세요')); return; }
    const L = world.S.levels[B.lv];
    const [k, i] = btn.dataset.spot.split(':');
    const x = spotsOf(L).filter((s) => s.kind === k)[+i];
    if (!x) return;
    try {
      const s = sessions().find((q) => q.id === B.sid);
      if (s && s.placeOverride && (k === 'seat' || k === 'meet' || k === 'rest' || k === 'hot')) await jfetch('/api/place', { id: B.sid, place: null });   // 감옥/금고에서 꺼내서 배치
      await setMeta(B.sid, { assign: { level: L.key || L.name, x: x.sp.x, y: x.sp.y, label: `${L.name} · ${x.label}` }, lock: B.lock || null });
      toast(tr('📍 {0} 에 배치했어요', `${L.name} · ${x.label}`));
    } catch (e) { toast('⚠️ ' + e.message); }
  }

  // ---------------------------------------------------------------- 🔌 연동 · 설정 (보관 · 직급 체계 · 재화 · API 키 · 칸반 웹훅 · 세션 전송)
  const errBox = (e) => `<div class="mg-err">⚠️ ${tr('서버에서 불러오지 못했어요')}: ${esc(e)}<br><small>${tr('관리자로 로그인했는지, 서버 연결(상단 LIVE)이 살아 있는지 확인해 주세요.')}</small><br><button class="btn sm" data-ad="reload">↻ ${tr('다시 불러오기')}</button></div>`;
  async function loadAdmin() {
    M.adErr = null;
    try {
      const [k, m, w] = await Promise.all([jfetch('/api/keys'), jfetch('/api/meta'), jfetch('/api/webhooks')]);
      M.keys = k.keys; M.settings = m.settings; M.archStatus = m.archive; M.hooks = w.hooks; M.hookLog = w.log; M.hookCols = w.columns; M.hookDefs = w.defaults;
      M.syncUps = (await jfetch('/api/transfer/v1/uploads').catch(() => ({ uploads: [] }))).uploads || [];
    } catch (e) { M.adErr = e.message; }
    if (M.tab === 'admin') renderBody();
  }
  const SCOPE = { full: '전체 (읽기 · 메모/업무 수정 · 보관함)', read: '읽기 전용', transfer: '세션 전송 전용 (대화 원문 내려받기)', sync: '세션 동기화 (내려받기 + 다른 컴퓨터 작업 올려 합치기)' };
  function adminView() {
    if (M.adErr) return errBox(M.adErr);
    if (!M.settings) return `<div class="loading">${tr('불러오는 중…')}</div>`;
    const st = M.settings;
    let h = `<div class="ad-grid">`;
    // 보관 · 직급 · 재화
    h += `<div class="ad-col"><div class="bd-sec"><h3>📦 ${tr('세션 자동 보관')}</h3>`;
    h += `<label class="mg-chk"><input type="checkbox" data-set="archiveAuto" ${st.archiveAuto ? 'checked' : ''}> ${tr('동작 중인 세션을 archive/ 폴더에 자동으로 복제')}</label>`;
    h += `<div class="mg-row"><span class="mg-lbl">${tr('주기')}</span><select data-set="archiveEveryMin">${[1, 2, 5, 10, 30].map((n) => `<option value="${n}" ${st.archiveEveryMin === n ? 'selected' : ''}>${tr('{0}분마다', n)}</option>`).join('')}</select></div>`;
    h += `<label class="mg-chk"><input type="checkbox" data-set="archiveMedia" ${st.archiveMedia ? 'checked' : ''}> ${tr('대화에 오간 이미지도 파일로 저장')}</label>`;
    h += `<p class="muted">${M.archStatus?.at ? tr('마지막 자동 보관: {0} 전 · {1}개 갱신', ago(M.archStatus.at), M.archStatus.saved) : ''}</p><button class="btn sm" data-ad="snapall">🔄 ${tr('지금 전부 보관')}</button></div>`;
    h += `<div class="bd-sec"><h3>👥 ${tr('모든 계정의 세션 보기')}</h3>`;
    h += `<label class="mg-chk"><input type="checkbox" data-set="allSessions" ${st.allSessions !== false ? 'checked' : ''}> ${tr('돌고 있지 않은 대화도 늘 보이기 (다른 계정으로 바꿔 둔 동안 · 창을 닫은 대화)')}</label>`;
    h += `<div class="mg-row"><span class="mg-lbl">${tr('범위')}</span><select data-set="allSessionsDays">${[[0, '전부'], [1, '최근 1일'], [3, '최근 3일'], [7, '최근 7일'], [30, '최근 30일']].map(([n, l]) => `<option value="${n}" ${(st.allSessionsDays || 0) === n ? 'selected' : ''}>${tr(l)}</option>`).join('')}</select></div>`;
    h += `<label class="mg-chk"><input type="checkbox" data-set="allSessionsArchived" ${st.allSessionsArchived ? 'checked' : ''}> ${tr('Claude 데스크톱에서 보관(아카이브)한 대화도')}</label>`;
    h += `<p class="muted">${tr('대화 원문은 이 PC 에 하나뿐이고 계정마다 그걸 가리키는 등록만 있어요. 그래서 계정을 바꿔도 같은 대화예요 — 오래 쉰 대화는 지하휴게실 · 숙소 · 감옥으로 내려가요.')}</p></div>`;
    h += `<div class="bd-sec"><h3>🎖️ ${tr('직급 체계')}</h3><div class="mg-row">${[['academic', '🎓 연구원 · 교수 (기본)'], ['corporate', '🏢 사원 · 대리 · 과장 · 부장'], ['custom', '✏️ 직접 입력']].map(([k, l]) => `<label class="mg-chk"><input type="radio" name="rk" data-setr="rankScheme" value="${k}" ${st.rankScheme === k ? 'checked' : ''}> ${tr(l)}</label>`).join('')}</div>`;
    h += `<textarea class="mg-ta" data-setv="rankCustom" placeholder="${tr('낮은 직급부터 쉼표로 — 예: 수습, 사원, 선임, 책임, 수석')}">${esc(st.rankCustom || '')}</textarea><button class="btn ghost sm" data-ad="rankCustom">${tr('직접 입력 저장')}</button>`;
    h += `<p class="muted">${tr('지금 사다리')}: ${esc(hr.ladder().join(' → '))}</p></div>`;
    h += `<div class="bd-sec"><h3>💰 ${tr('사내 재화')}</h3><div class="mg-row"><span class="mg-lbl">${tr('일한 1분당')}</span><select data-set="econRate">${[0.5, 1, 2, 5, 10].map((n) => `<option value="${n}" ${+st.econRate === n ? 'selected' : ''}>${n} ${tr('코인')}</option>`).join('')}</select></div><label class="mg-chk"><input type="checkbox" data-set="econAuto" ${st.econAuto !== false ? 'checked' : ''}> ${tr('세션이 알아서 밥 먹고 · 차 · 집 사기')}</label>`
      + `<h3 style="margin-top:10px">💵 ${tr('월급제')}</h3><label class="mg-chk"><input type="checkbox" data-set="payOn" ${st.payOn !== false ? 'checked' : ''}> ${tr('매일 일급 지급 (월급 ÷ 30, 놓친 날은 7일치까지 소급)')}</label>`
      + `<div class="mg-row"><span class="mg-lbl">${tr('Lv.1 기본 월급')}</span><input class="mg-in" type="number" min="0" step="100" data-set="payBase" value="${+st.payBase || 3000}"><span class="mg-lbl">${tr('레벨당 +%')}</span><input class="mg-in" type="number" min="0" max="100" data-set="payStep" value="${st.payStep ?? 8}"></div>`
      + `<div class="mg-row"><span class="mg-lbl">${tr('근속 1년당 인상 %')}</span><input class="mg-in" type="number" min="0" max="100" data-set="payRaise" value="${st.payRaise ?? 5}"><span class="mg-lbl">${tr('근속 1년 = 실제')}</span><input class="mg-in" type="number" min="1" max="365" data-set="payYearDays" value="${+st.payYearDays || 7}"><span class="mg-lbl">${tr('일')}</span></div>`
      + `<p class="muted">${tr('재직(일하는 중·쉬는 중) 100% · 휴직(중단) 50% · 정직(감옥·던전) 0%. 일한 시간 코인은 성과급으로 따로 쌓여요.')}</p></div></div>`;
    // API 키 · 세션 전송
    h += `<div class="ad-col"><div class="bd-sec"><h3>🔑 ${tr('API 키 (토큰)')}</h3>`;
    if (M.newKey) h += `<div class="ad-key">🔑 ${tr('새 키 (지금 한 번만 보여요 — 복사해 두세요)')}<code>${esc(M.newKey)}</code></div>`;
    h += `<div class="mg-row"><input class="mg-in" data-keyname placeholder="${tr('키 이름 (예: 칸반 · 세션 스위처)')}"><select data-keyscope>${Object.entries(SCOPE).map(([k, l]) => `<option value="${k}">${tr(l)}</option>`).join('')}</select><button class="btn sm" data-ad="newkey">${tr('발급')}</button></div>`;
    h += `<table class="mg-table"><tbody>${(M.keys || []).map((k) => `<tr><td><b>${esc(k.name)}</b><small>${esc(k.prefix)}… · ${esc(tr(SCOPE[k.scope || 'full']))}</small></td><td><small>${tr('발급 {0} 전', ago(k.created))} · ${k.last ? tr('마지막 사용 {0} 전', ago(k.last)) : tr('아직 안 씀')}</small></td><td><button class="btn ghost sm" data-ad="revoke" data-k="${esc(k.id)}">${tr('폐기')}</button></td></tr>`).join('') || `<tr><td class="muted">${tr('발급한 키가 없어요')}</td></tr>`}</tbody></table></div>`;
    h += `<div class="bd-sec"><h3>🔁 ${tr('세션 전송 · 동기화 (원격 작업)')}</h3><p class="muted">${tr('대화를 다른 컴퓨터로 내려받아 이어서 작업하고, 다시 올리면 이 서버에 줄 단위로 합쳐요 (어느 쪽 기록도 안 사라짐 · 반영 전 원본 백업 · 되돌리기). 형식은 세션 스위처 백업 zip 그대로예요. 내려받기만은 scope transfer, 올리기까지는 scope sync 키.')} ${tr('문서')}: <a href="/docs/sync-api.html" target="_blank">📄 ${tr('동기화 API 문서')}</a> · <a href="/api/transfer/v1" target="_blank">JSON</a></p>`;
    h += `<pre class="ad-doc">curl -H "Authorization: Bearer aio_…" -o work.zip "${esc(location.origin)}/api/transfer/v1/bundle?ids=&lt;id&gt;,&lt;id&gt;"
curl -H "Authorization: Bearer aio_…(sync 키)" -H "Content-Type: application/zip" --data-binary @work-done.zip "${esc(location.origin)}/api/transfer/v1/sync?dry_run=1"
curl -H "Authorization: Bearer aio_…(sync 키)" -H "Content-Type: application/zip" --data-binary @work-done.zip "${esc(location.origin)}/api/transfer/v1/sync"</pre>`;
    {
      const ST = { receiving: '⏳ 받는 중', ready: '📦 받음', previewed: '🔍 미리 봄', applied: '✅ 반영', undone: '↩️ 되돌림' };
      const ups = (M.syncUps || []).slice(0, 8);
      h += `<h4 style="margin:12px 0 6px">${tr('최근 동기화')}</h4>` + (ups.length ? `<table class="mg-table"><tbody>${ups.map((u) => {
        const r = u.result, pv = u.preview && u.preview.summary;
        const what = r ? tr('대화 {0}개 반영 (병합 {1} · 새로 {2} · 덮어씀 {3}){4}', r.transcripts, r.merged, r.created, r.overwritten, r.skipped && r.skipped.length ? ' · ' + tr('건너뜀 {0}', r.skipped.length) : '') : pv ? tr('대화 {0}개 · 새로 {1} · 원격이 최신 {2} · 갈라짐 {3}', pv.sessions, pv.new, pv.remote_newer, pv.diverged) : `${Math.round((u.received / Math.max(1, u.size)) * 100)}%`;
        return `<tr><td><b>${esc(tr(ST[u.status] || u.status))}</b><small>${esc(u.device || u.name || '')} · ${esc(u.by || '')} · ${new Date(u.created).toLocaleString()}</small></td><td><small>${esc(what)}</small></td><td>${u.status === 'applied' ? `<button class="mg-btn" data-ad="syncundo" data-u="${esc(u.id)}">↩️ ${tr('되돌리기')}</button>` : ''}</td></tr>`;
      }).join('')}</tbody></table>` : `<p class="muted">${tr('아직 올린 기록이 없어요')}</p>`);
    }
    h += `</div></div>`;
    // 칸반 웹훅
    h += `<div class="ad-col wide"><div class="bd-sec"><h3>🗂️ ${tr('칸반 · 업무관리 자동 연동 (웹훅)')}</h3><p class="muted">${tr('세션 상태가 바뀌면 (작업중 · 결정 필요 · 완료 · 대기 · 중단 · 종료) 아래 주소로 바로 알려 줘요. 받는 쪽은 column 값으로 칸반 카드를 옮기면 됩니다. 세션에 연결한 업무(task)도 함께 보내요. 문서')}: <a href="https://github.com/UniverseMaker/AI-Office/blob/main/docs/WEBHOOKS.md" target="_blank">WEBHOOKS.md</a> · <a href="/api/v1" target="_blank">/api/v1</a></p>`;
    (M.hooks || []).forEach((wh, i) => {
      h += `<div class="wh" data-wi="${i}"><div class="mg-row"><label class="mg-chk"><input type="checkbox" data-whf="enabled" ${wh.enabled ? 'checked' : ''}> ${tr('켜기')}</label><input class="mg-in" data-whf="name" value="${esc(wh.name)}" placeholder="${tr('이름')}"><input class="mg-in wide" data-whf="url" value="${esc(wh.url)}" placeholder="https://kanban.example.com/hooks/ai-office"><input class="mg-in" data-whf="secret" value="${esc(wh.secret)}" placeholder="${tr('서명 비밀값 (선택)')}"><button class="btn ghost sm" data-wh="test">📨 ${tr('테스트')}</button><button class="btn ghost sm" data-wh="del">🗑</button></div>`;
      h += `<div class="mg-row wh-cols">${(M.hookCols || []).map(([k, l]) => `<label><small>${tr(l)} →</small><input class="mg-in" data-whc="${k}" value="${esc((wh.columns || {})[k] || '')}"></label>`).join('')}</div>`;
      h += `<div class="mg-row">${[['session.created', '새 세션'], ['session.moved', '상태 이동'], ['session.closed', '종료']].map(([e, l]) => `<label class="mg-chk"><input type="checkbox" data-whe="${e}" ${!wh.events || !wh.events.length || wh.events.includes(e) ? 'checked' : ''}> ${tr(l)}</label>`).join('')}</div></div>`;
    });
    h += `<div class="mg-row"><button class="btn ghost sm" data-wh="add">➕ ${tr('웹훅 추가')}</button><button class="btn sm" data-wh="save">💾 ${tr('웹훅 저장')}</button></div>`;
    h += `<table class="mg-table"><tbody>${(M.hookLog || []).slice(0, 8).map((l) => `<tr><td>${l.ok ? '✅' : '⚠️'} ${esc(l.event)}</td><td><small>${ago(l.at)} ${tr('전')} · ${l.status || ''} ${esc(l.error || '')}</small></td></tr>`).join('') || `<tr><td class="muted">${tr('아직 보낸 기록이 없어요')}</td></tr>`}</tbody></table></div></div>`;
    return h + '</div>';
  }
  function readHooks() {
    return (M.hooks || []).map((wh, i) => {
      const box = document.querySelector(`#mgr .wh[data-wi="${i}"]`); if (!box) return wh;
      const v = (f) => box.querySelector(`[data-whf=${f}]`);
      return { ...wh, enabled: v('enabled').checked, name: v('name').value, url: v('url').value.trim(), secret: v('secret').value,
        columns: Object.fromEntries([...box.querySelectorAll('[data-whc]')].map((x) => [x.dataset.whc, x.value])),
        events: [...box.querySelectorAll('[data-whe]')].filter((x) => x.checked).map((x) => x.dataset.whe) };
    });
  }
  async function hookAction(b) {
    try {
      const i = b.closest('[data-wi]') ? +b.closest('[data-wi]').dataset.wi : -1;
      M.hooks = readHooks();
      if (b.dataset.wh === 'add') { M.hooks.push({ name: '칸반', url: '', secret: '', enabled: true, events: [], columns: { ...(M.hookDefs || {}) } }); renderBody(); return; }
      if (b.dataset.wh === 'del') { M.hooks.splice(i, 1); }
      if (b.dataset.wh === 'save' || b.dataset.wh === 'del' || b.dataset.wh === 'test') { const r = await jfetch('/api/webhooks', { hooks: M.hooks }); M.hooks = r.hooks; }
      if (b.dataset.wh === 'test') { const r = await jfetch('/api/webhooks/test', { id: M.hooks[i].id }).catch((e) => ({ ok: false, error: e.message })); toast(r.ok ? tr('📨 테스트 성공 ({0})', r.status) : tr('⚠️ 실패: {0}', r.error || r.status)); }
      else toast(tr('💾 저장했어요'));
      await loadAdmin();
    } catch (e) { toast('⚠️ ' + e.message); }
  }
  async function adAction(btn) {
    try {
      if (btn.dataset.ad === 'reload') return loadAdmin();
      if (btn.dataset.ad === 'snapall') { const r = await jfetch('/api/archive/snapshot', { all: true }); toast(tr('📦 {0}개 세션을 보관했어요', r.saved)); }
      else if (btn.dataset.ad === 'newkey') { const r = await jfetch('/api/keys', { name: document.querySelector('#mgr [data-keyname]').value || '연동', scope: document.querySelector('#mgr [data-keyscope]').value }); M.newKey = r.key; }
      else if (btn.dataset.ad === 'syncundo') {
        if (!confirm(tr('이 동기화를 되돌릴까요? 반영 전 원본으로 돌아가고, 그때 새로 생긴 대화는 지워져요.'))) return;
        const r = await jfetch(`/api/transfer/v1/uploads/${btn.dataset.u}/undo`, {}).catch(async (e) => { if (/다시 바뀐/.test(e.message) && confirm(tr('반영한 뒤에 이 서버에서 또 이어 쓴 대화가 있어요. 그래도 되돌릴까요? (그 사이 기록이 사라져요)'))) return jfetch(`/api/transfer/v1/uploads/${btn.dataset.u}/undo`, { force: true }); throw e; });
        if (r) toast(tr('↩️ 되돌렸어요 (원본 {0} · 지운 파일 {1})', r.restored, r.deleted));
      }
      else if (btn.dataset.ad === 'revoke') { if (!confirm(tr('이 키를 폐기할까요? 이 키를 쓰는 연동이 끊겨요.'))) return; await jfetch(`/api/keys/${btn.dataset.k}`, null, 'DELETE'); }
      else if (btn.dataset.ad === 'rankCustom') { M.settings = (await jfetch('/api/settings', { rankCustom: document.querySelector('#mgr [data-setv=rankCustom]').value, rankScheme: 'custom' })).settings; toast(tr('직급 체계를 저장했어요')); }
      await loadAdmin();
    } catch (e) { toast('⚠️ ' + e.message); }
  }

  // ---------------------------------------------------------------- 🪪 계정 · 정보공개
  async function loadUsers() {
    M.usErr = null;
    try { const [u, m] = await Promise.all([jfetch('/api/users'), jfetch('/api/meta')]); M.users = u.users; M.tiers = u.tiers; M.cats = u.cats; M.settings = m.settings; M.metaAll = m.sessions; }
    catch (e) { M.usErr = e.message; }
    if (M.tab === 'users' || M.tab === 'disclose') renderBody();
  }
  const tierSel = (attr, v, withAdmin) => `<select ${attr}>${withAdmin ? `<option value="" ${v == null || v === '' || v >= 99 ? 'selected' : ''}>🔒 ${tr('관리자만')}</option>` : ''}${(M.tiers || []).map((t, i) => `<option value="${i}" ${v !== '' && v != null && +v === i ? 'selected' : ''}>${withAdmin ? tr('{0} 이상', tr(t)) : tr(t)}</option>`).join('')}</select>`;
  function usersView() {
    if (M.tab === 'disclose') return discloseView();
    if (M.usErr) return errBox(M.usErr);
    if (!M.tiers) return `<div class="loading">${tr('불러오는 중…')}</div>`;
    let h = `<div class="ad-grid"><div class="ad-col"><div class="bd-sec"><h3>➕ ${tr('계정 발급')}</h3><div class="mg-row"><input class="mg-in" data-nu="id" placeholder="${tr('아이디 (영문·숫자 3~32)')}"><input class="mg-in" data-nu="name" placeholder="${tr('이름')}"><input class="mg-in" type="password" data-nu="password" placeholder="${tr('비밀번호 8자 이상')}" autocomplete="new-password">${tierSel('data-nu="tier"', 0, false)}<button class="btn sm" data-us="create">${tr('발급')}</button></div>`;
    h += `<p class="muted">${tr('새 계정은 처음엔 세션 상세(제목·대화·진행)가 하나도 안 보여요. 아래 기본 정책이나 세션마다 🔐 정보공개에서 등급별로 열어 주세요. 거르는 건 서버가 하므로 브라우저 소스를 열어도 허용 안 된 정보는 없어요.')}</p></div>`;
    h += `<div class="bd-sec"><h3>👥 ${tr('계정 목록')}</h3><table class="mg-table"><tbody>${(M.users || []).map((u) => `<tr data-uid="${esc(u.id)}"><td><b>${esc(u.id)}</b><small>${esc(u.name)}${u.disabled ? ' · ⛔ ' + tr('정지') : ''} · ${u.last ? tr('최근 로그인 {0} 전', ago(u.last)) : tr('로그인 기록 없음')}</small></td><td>${tierSel('data-ut', u.tier, false)}</td><td class="mg-acts"><button data-us="tier" title="${tr('등급 저장')}">💾</button><button data-us="pw" title="${tr('비밀번호 바꾸기')}">🔑</button><button data-us="toggle" title="${tr('정지 / 해제')}">${u.disabled ? '▶️' : '⛔'}</button><button data-us="del" title="${tr('삭제')}">🗑</button></td></tr>`).join('') || `<tr><td class="muted">${tr('발급한 계정이 없어요')}</td></tr>`}</tbody></table></div></div>`;
    const d = M.settings.disclosureDefault || {};
    h += `<div class="ad-col"><div class="bd-sec"><h3>🔐 ${tr('기본 정보공개 정책 (모든 세션)')}</h3><p class="muted">${tr('세션마다 따로 정하지 않았으면 이 정책을 따라요. 각 항목을 볼 수 있는 최소 등급을 고르세요.')}</p><table class="mg-table"><tbody>${(M.cats || []).map(([c, l]) => `<tr><td>${tr(l)}</td><td>${tierSel(`data-dfc="${c}"`, d[c], true)}</td></tr>`).join('')}</tbody></table><button class="btn sm" data-dc="default">💾 ${tr('기본 정책 저장')}</button></div>`;
    h += `<div class="bd-sec"><h3>📋 ${tr('세션별 공개 설정')}</h3><table class="mg-table"><tbody>${sessions().map((s) => { const pol = (M.metaAll[s.id] || {}).disclose; return `<tr><td><b>${esc(code(s.id))} ${esc(s.title || '')}</b><small>${pol ? Object.entries(pol).map(([c, t]) => `${esc(tr((M.cats.find((x) => x[0] === c) || [, c])[1]))}: ${esc(tr(M.tiers[t] || '관리자'))}+`).join(' · ') : tr('기본 정책')}</small></td><td><button class="btn ghost sm" data-dc="open" data-sid="${esc(s.id)}">🔐 ${tr('설정')}</button></td></tr>`; }).join('')}</tbody></table></div></div></div>`;
    return h;
  }
  function discloseModal(id) { M.dcId = id; M.dcBack = M.tab === 'disclose' ? 'users' : M.tab; M.tab = 'disclose'; renderShell(); loadUsers(); }
  function discloseView() {
    if (!M.tiers) return `<div class="loading">${tr('불러오는 중…')}</div>`;
    const s = sessions().find((x) => x.id === M.dcId) || { id: M.dcId };
    const pol = ((M.metaAll || {})[M.dcId] || {}).disclose || {};
    let h = `<div class="bd-sec"><h3>🔐 ${tr('정보공개')} — ${esc(code(s.id))} ${esc(s.title || s.id)}</h3><p class="muted">${tr('비워 두면(기본 정책) 기본 정책을 따라요. 고른 등급과 그보다 높은 등급 계정만 그 항목을 받아요.')}</p>`;
    h += `<table class="mg-table"><tbody>${M.cats.map(([c, l]) => `<tr><td>${tr(l)}</td><td><select data-dsc="${c}"><option value="" ${pol[c] == null ? 'selected' : ''}>↩ ${tr('기본 정책')}</option><option value="99" ${pol[c] === 99 ? 'selected' : ''}>🔒 ${tr('관리자만')}</option>${M.tiers.map((t, i) => `<option value="${i}" ${pol[c] === i ? 'selected' : ''}>${tr('{0} 이상', tr(t))}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table>`;
    h += `<div class="mg-row"><button class="btn sm" data-dc="save">💾 ${tr('저장')}</button><button class="btn ghost sm" data-dc="all">${tr('전부 방문자 이상')}</button><button class="btn ghost sm" data-dc="none">${tr('전부 관리자만')}</button><button class="btn ghost sm" data-dc="back">← ${tr('돌아가기')}</button></div></div>`;
    return h;
  }
  async function discloseAction(b) {
    try {
      const k = b.dataset.dc;
      if (k === 'open') return discloseModal(b.dataset.sid);
      if (k === 'back') { M.tab = M.dcBack || 'users'; renderShell(); if (M.tab === 'users') loadUsers(); return; }
      if (k === 'all' || k === 'none') { document.querySelectorAll('#mgr [data-dsc]').forEach((x) => { x.value = k === 'all' ? '0' : '99'; }); return; }
      if (k === 'default') { const def = {}; document.querySelectorAll('#mgr [data-dfc]').forEach((x) => { if (x.value !== '') def[x.dataset.dfc] = +x.value; }); await jfetch('/api/disclose', { default: def }); toast(tr('🔐 기본 정책을 저장했어요')); return loadUsers(); }
      if (k === 'save') { const pol = {}; document.querySelectorAll('#mgr [data-dsc]').forEach((x) => { if (x.value !== '') pol[x.dataset.dsc] = +x.value; }); await jfetch('/api/disclose', { id: M.dcId, policy: pol }); toast(tr('🔐 저장했어요')); return loadUsers(); }
    } catch (e) { toast('⚠️ ' + e.message); }
  }
  async function userAction(b) {
    try {
      const row = b.closest('[data-uid]'), id = row && row.dataset.uid;
      const k = b.dataset.us;
      if (k === 'create') {
        const v = (f) => document.querySelector(`#mgr [data-nu=${f}]`).value;
        await jfetch('/api/users', { id: v('id').trim(), name: v('name'), password: v('password'), tier: +v('tier') }); toast(tr('🪪 계정을 만들었어요'));
      } else if (k === 'tier') { await jfetch(`/api/users/${encodeURIComponent(id)}`, { tier: +row.querySelector('[data-ut]').value }, 'PATCH'); toast(tr('등급을 바꿨어요')); }
      else if (k === 'pw') { const pw = prompt(tr('새 비밀번호 (8자 이상)')); if (!pw) return; await jfetch(`/api/users/${encodeURIComponent(id)}`, { password: pw }, 'PATCH'); toast(tr('비밀번호를 바꿨어요 (그 계정은 다시 로그인해야 해요)')); }
      else if (k === 'toggle') { const u = M.users.find((x) => x.id === id); await jfetch(`/api/users/${encodeURIComponent(id)}`, { disabled: !u.disabled }, 'PATCH'); }
      else if (k === 'del') { if (!confirm(tr('{0} 계정을 삭제할까요?', id))) return; await jfetch(`/api/users/${encodeURIComponent(id)}`, null, 'DELETE'); }
      await loadUsers();
    } catch (e) { toast('⚠️ ' + e.message); }
  }

  // ---------------------------------------------------------------- 이벤트
  function onMgrClick(ev) {
    const t = ev.target;
    if (t.closest('[data-mclose]') || t.id === 'mgr') return close();
    const b = t.closest('button,[data-arid]');
    if (!b) return;
    if (b.dataset.mtab) { M.tab = b.dataset.mtab; renderShell(); if (M.tab === 'archive') loadArchive(M.arch.id); if (M.tab === 'admin') loadAdmin(); if (M.tab === 'users') loadUsers(); return; }
    if (b.dataset.us) return userAction(b);
    if (b.dataset.wh) return hookAction(b);
    if (b.dataset.dc) return discloseAction(b);
    if (b.dataset.mf) { M.filter = b.dataset.mf; renderBody(); return; }
    if (b.dataset.row) return rowAction(b.closest('tr'), b.dataset.row);
    if (b.dataset.arid) return loadArchive(b.dataset.arid);
    if (b.dataset.arrole) { M.arch.roles[b.dataset.arrole] = M.arch.roles[b.dataset.arrole] ? 0 : 1; renderBody(); loadMedia(); return; }
    if (b.dataset.ar) return archAction(b);
    if (b.dataset.ared) return editOp(b);
    if (b.dataset.bdlv) { M.bld.lv = +b.dataset.bdlv; renderBody(); return; }
    if (b.dataset.bd) return bdAction(b);
    if (b.dataset.spot) return spotClick(b);
    if (b.dataset.ad) return adAction(b);
  }
  async function onMgrChange(ev) {
    const t = ev.target;
    if (t.dataset.msort != null) { M.sort = t.value; renderBody(); }
    else if (t.dataset.bdsid != null) { M.bld.sid = t.value || null; renderBody(); }
    else if (t.dataset.bdlock != null) M.bld.lock = t.checked;
    else if (t.dataset.arImport != null) importFile(t);
    else if (t.dataset.setr) { try { M.settings = (await jfetch('/api/settings', { [t.dataset.setr]: t.value })).settings; toast(tr('설정을 저장했어요')); renderBody(); } catch (e) { toast('⚠️ ' + e.message); } }
    else if (t.dataset.set) { try { M.settings = (await jfetch('/api/settings', { [t.dataset.set]: t.type === 'checkbox' ? t.checked : +t.value })).settings; toast(tr('설정을 저장했어요')); } catch (e) { toast('⚠️ ' + e.message); } }
  }
  let shopCache = null;
  document.addEventListener('toggle', async (ev) => {
    const d = ev.target; if (!d.classList || !d.classList.contains('mg-wallet') || !d.open) return;
    const box = d.querySelector('[data-shop]'); if (!box) return;
    try { shopCache = shopCache || (await jfetch('/api/econ')).shop; } catch (e) { box.textContent = '⚠️ ' + e.message; return; }
    const cats = [['food', '🍽️ 음식'], ['car', '🚗 탈것'], ['home', '🏠 집'], ['hobby', '🎁 취미']];
    box.innerHTML = cats.map(([c, l]) => `<div class="shop-row"><span class="mg-lbl">${tr(l)}</span>${shopCache.filter((x) => x.cat === c).map((x) => `<button class="shop-it" data-mg="buy" data-v="${x.id}" title="${esc(x.name)} · ${x.price}">${x.icon}<small>${x.price.toLocaleString()}</small></button>`).join('')}</div>`).join('');
  }, true);
  document.addEventListener('click', (ev) => { const b = ev.target.closest('[data-mg]'); if (b) { ev.preventDefault(); ev.stopPropagation(); onExtra(b); } }, true);
  window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && document.getElementById('mgr') && !document.getElementById('mgr').hidden) close(); });

  AIO.manage = { init(w, gs) { world = w; getState = gs; }, open, close, refresh, detailExtras, setMeta, dismiss, hr };
})();
