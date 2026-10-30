// 행정관리시스템(MGM) — 관리 센터 › 🏛️ 행정. 근태(출퇴근) · 전자결재 · 업무보고 · 일정 · 물품/장비 · 게시판.
// 모든 호출은 서버 프록시(/api/mgm/proxy/…)를 거친다 — 토큰은 관리자 계정 금고에만 있고 브라우저에는 오지 않는다.
// 서버가 허용목록 · 필드 검사 · 속도 제한 · 감사 기록을 하고, 삭제 · 인사 변경은 아예 막는다(server/mgm.mjs).
(function () {
  const esc = AIO.esc, tr = (...a) => AIO.tr(...a);
  const G = { tab: 'home', host: null, cfg: null, me: null, today: null, inbox: [], events: [], posts: [], err: null, busy: false,
    box: 'inbox', apv: [], apvSel: null, users: [], newApv: null,
    reports: [], draft: null, evList: [], evNew: null, eqQ: '', eq: [], eqSel: null, boards: [], board: '', bposts: [], postSel: null, postNew: null, audit: [] };
  const TABS = [['home', '🏠 오늘'], ['apv', '✍️ 결재'], ['rep', '📝 업무보고'], ['ev', '📅 일정'], ['eq', '🧰 물품 · 장비'], ['board', '📢 게시판'], ['set', '🔐 연동 · 보안']];
  const APV_ST = { draft: ['임시저장', '#8a7f72'], in_progress: ['진행 중', '#4e7cf6'], approved: ['승인', '#2fb27f'], rejected: ['반려', '#e5534b'], withdrawn: ['회수', '#9a8f80'] };
  const LINE_ST = { pending: '대기', approved: '승인', rejected: '반려', skipped: '건너뜀', current: '차례' };
  const ROLE = { approval: '승인', agreement: '합의', reference: '참조', delegate: '전결' };
  const BOX = [['inbox', '📥 내 차례'], ['sent', '📤 내가 기안'], ['done', '✅ 처리함'], ['mine', '🗂️ 관련 전체']];
  const toast = (m) => { const t = document.createElement('div'); t.className = 'mg-toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); };
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hm = (iso) => { if (!iso) return '—'; const d = new Date(iso); return isNaN(d) ? '—' : `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const when = (iso) => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return esc(iso); return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const day = (iso) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? esc(String(iso).slice(0, 10)) : `${d.getMonth() + 1}/${d.getDate()} (${'일월화수목금토'[d.getDay()]})`; };
  const userName = (id) => { const u = G.users.find((x) => x.id === id || x.username === id); return u ? u.name || u.username : id || ''; };
  const chip = (txt, c) => `<span class="mm-chip" style="--c:${/^#[0-9a-f]{6}$/i.test(c) ? c : '#8a7f72'}">${esc(tr(txt))}</span>`;

  async function call(path, method = 'GET', body) {
    const o = { method: method === 'PATCH' ? 'POST' : method, headers: { 'Content-Type': 'application/json' } };
    if (method === 'PATCH') o.headers['X-HTTP-Method-Override'] = 'PATCH';
    if (body) o.body = JSON.stringify(body);
    const r = await AIO.auth.api(path.startsWith('/api/') ? path : '/api/mgm/proxy' + path, o);
    let j = {}; try { j = await r.json(); } catch {}
    if (!r.ok || j.ok === false) { const e = new Error((j.error && (j.error.message || j.error)) || `HTTP ${r.status}`); e.code = j.error && j.error.code; e.status = r.status; throw e; }
    return j;
  }
  const data = async (path) => (await call(path)).data;

  // ---------------------------------------------------------------- 불러오기
  async function loadCfg() { try { G.cfg = await call('/api/mgm/config'); } catch (e) { G.cfg = null; G.err = e.message; } }
  async function loadTab() {
    G.err = null; G.busy = true; render();
    try {
      if (!G.cfg) await loadCfg();
      if (G.tab === 'set') { G.audit = (await call('/api/mgm/audit')).log || []; await loadCfg(); }
      else if (!G.cfg || !G.cfg.hasToken) { /* 설정 안내만 */ }
      else {
        if (!G.users.length) G.users = (await data('/users?limit=200')) || [];
        if (G.tab === 'home') {
          const t = new Date(), to = new Date(t.getTime() + 7 * 864e5);
          const [me, today, inbox, ev, posts] = await Promise.all([data('/me'), data('/attendance/today').catch(() => null), data('/approvals?box=inbox&limit=20'), data(`/events?from=${ymd(t)}&to=${ymd(to)}&limit=30`).catch(() => []), data('/posts?limit=6').catch(() => [])]);
          Object.assign(G, { me, today, inbox: inbox || [], events: ev || [], posts: posts || [] });
        } else if (G.tab === 'apv') { G.apv = (await data(`/approvals?box=${G.box}&limit=100`)) || []; }
        else if (G.tab === 'rep') { G.reports = (await data('/reportdocs?limit=50')) || []; }
        else if (G.tab === 'ev') { const t = new Date(), to = new Date(t.getTime() + 31 * 864e5); G.evList = (await data(`/events?from=${ymd(t)}&to=${ymd(to)}&limit=200`)) || []; }
        else if (G.tab === 'eq') { G.eq = (await data(`/equipment?limit=100${G.eqQ ? '&q=' + encodeURIComponent(G.eqQ) : ''}`)) || []; }
        else if (G.tab === 'board') { G.boards = (await data('/boards')) || []; if (!G.board && G.boards[0]) G.board = G.boards[0].id; G.bposts = G.board ? (await data(`/posts?boardId=${encodeURIComponent(G.board)}&limit=50`)) || [] : []; }
      }
    } catch (e) { G.err = e.message; if (e.code === 'vault_locked' || e.code === 'no_token') await loadCfg(); }
    G.busy = false; render();
  }

  // ---------------------------------------------------------------- 화면
  function render() {
    const h = G.host; if (!h) return;
    let x = `<div class="mm"><div class="mm-tabs">${TABS.map(([k, l]) => `<button data-mm-tab="${k}" class="${G.tab === k ? 'on' : ''}">${tr(l)}</button>`).join('')}<span class="mm-sp"></span>${G.busy ? `<span class="muted">${tr('불러오는 중…')}</span>` : ''}<button class="btn ghost sm" data-mm="reload">↻ ${tr('새로고침')}</button></div>`;
    if (G.err) x += `<div class="mg-err">⚠️ ${esc(tr(G.err))}</div>`;
    const c = G.cfg;
    if (G.tab !== 'set' && c && (!c.hasToken || !c.unlocked)) x += setupHint(c);
    else x += ({ home: homeView, apv: apvView, rep: repView, ev: evView, eq: eqView, board: boardView, set: setView }[G.tab] || homeView)();
    h.innerHTML = x + '</div>';
  }
  const setupHint = (c) => `<div class="mm-empty"><div class="mm-big">🏛️</div><b>${!c.hasToken ? tr('행정관리 토큰이 아직 없어요') : tr('계정 금고가 잠겨 있어요')}</b><p>${!c.hasToken ? tr('🔐 연동 · 보안 탭에서 행정관리 API 토큰(mgm_…)을 넣어 주세요. 토큰은 관리자 계정 금고에 암호화돼 저장되고 화면에는 다시 나오지 않아요.') : tr('토큰은 로그인할 때 열리는 계정 금고에 있어요. 로그아웃 후 다시 로그인하면 열려요.')}</p><button class="btn sm" data-mm-tab="set">🔐 ${tr('연동 · 보안')}</button></div>`;

  function homeView() {
    const me = G.me || {}, u = me.user || {}, emp = me.employee, rec = G.today && G.today.record;
    let x = `<div class="mm-grid">`;
    x += `<section class="mm-card mm-att"><h3>🕘 ${tr('오늘 근태')} <small>${esc(G.today ? G.today.date || '' : '')}</small></h3>`;
    if (!emp) x += `<p class="muted">${tr('이 토큰 계정에 연결된 직원이 없어 출퇴근을 찍을 수 없어요 (행정관리 › 인력관리에서 연결)')}</p>`;
    else {
      x += `<div class="mm-clock"><div><small>${tr('출근')}</small><b>${hm(rec && rec.checkIn)}</b></div><div><small>${tr('퇴근')}</small><b>${hm(rec && rec.checkOut)}</b></div><div><small>${tr('근무')}</small><b>${rec && rec.workMinutes ? `${Math.floor(rec.workMinutes / 60)}${tr('시간')} ${rec.workMinutes % 60}${tr('분')}` : '—'}</b></div></div>`;
      x += `<div class="mm-row">${rec && rec.type ? chip(rec.type, rec.type === '정상' ? '#2fb27f' : '#e9a23b') : ''}<span class="mm-sp"></span><button class="btn sm" data-mm="punch" data-v="in" ${rec && rec.checkIn ? 'disabled' : ''}>☀️ ${tr('출근')}</button><button class="btn ghost sm" data-mm="punch" data-v="out" ${!(rec && rec.checkIn) ? 'disabled' : ''}>🌙 ${tr('퇴근')}</button></div>`;
    }
    const au = G.cfg && G.cfg.auto;
    if (au) x += `<div class="mm-auto ${au.on ? 'on' : ''}"><b>🤖 ${tr('AI 세션 활동으로 자동 출퇴근')}</b> ${au.on ? `<span>${tr('켜짐')} · ${au.signal === 'any' ? tr('AI 작업 포함') : tr('내 요청 기준')} · ${tr('{0}분 조용하면 퇴근', au.idleMin)}</span>` : `<span>${tr('꺼짐')}</span>`}${au.today && au.today.lastAct ? `<small>${tr('마지막 AI 활동')} ${hm(new Date(au.today.lastAct).toISOString())}</small>` : ''}${au.today && au.today.error ? `<small class="err">⚠️ ${esc(au.today.error)}</small>` : ''}<button class="btn ghost sm" data-mm-tab="set">${tr('설정')}</button></div>`;
    x += `<p class="mm-who">👤 ${esc(u.name || u.username || '')} ${u.affiliation ? `· ${esc(u.affiliation)}` : ''} ${u.permissions && u.permissions.admin ? chip('관리자', '#8f4fe0') : ''} ${me.token ? chip(me.token.scope === 'write' ? '읽기+쓰기 토큰' : '읽기 전용 토큰', me.token.scope === 'write' ? '#4e7cf6' : '#8a7f72') : ''}</p></section>`;
    x += `<section class="mm-card"><h3>📥 ${tr('내 결재 차례')} <span class="mm-n">${G.inbox.length}</span></h3>${G.inbox.length ? G.inbox.slice(0, 6).map(apvRow).join('') : `<p class="muted">${tr('기다리는 결재가 없어요 🎉')}</p>`}${G.inbox.length ? `<button class="btn ghost sm" data-mm-tab="apv">${tr('결재함 열기')} →</button>` : ''}</section>`;
    x += `<section class="mm-card"><h3>📅 ${tr('다가오는 일정 (7일)')}</h3>${G.events.length ? G.events.slice(0, 8).map(evRow).join('') : `<p class="muted">${tr('일정이 없어요')}</p>`}</section>`;
    x += `<section class="mm-card"><h3>📢 ${tr('최근 게시글')}</h3>${G.posts.length ? G.posts.map((p) => `<button class="mm-li" data-mm="post" data-v="${esc(p.id)}"><b>${p.pinned ? '📌 ' : ''}${esc(p.title || '')}</b><small>${esc(userName(p.authorUserId || p.author || p.createdBy) || '')} · ${when(p.createdAt)}</small></button>`).join('') : `<p class="muted">${tr('게시글이 없어요')}</p>`}</section>`;
    return x + '</div>';
  }
  const apvRow = (a) => { const st = APV_ST[a.status] || [a.status, '#8a7f72']; return `<button class="mm-li ${G.apvSel && G.apvSel.id === a.id ? 'on' : ''}" data-mm="apv" data-v="${esc(a.id)}"><b>${esc(a.title || '')}</b><small>${chip(st[0], st[1])} ${esc(userName(a.drafterUserId))} · ${when(a.submittedAt || a.createdAt)}</small></button>`; };
  const evRow = (e) => `<div class="mm-li static"><b>${esc(e.title || '')}</b><small>${day(e.start)} ${e.allDay ? tr('종일') : hm(e.start)}${e.location ? ' · 📍' + esc(e.location) : ''} ${e.scope && e.scope !== 'personal' ? chip(e.scope === 'org' ? '전사' : '부서', '#00a3bf') : ''}</small></div>`;

  function apvView() {
    let x = `<div class="mm-row">${BOX.map(([k, l]) => `<button class="mm-seg ${G.box === k ? 'on' : ''}" data-mm="box" data-v="${k}">${tr(l)}</button>`).join('')}<span class="mm-sp"></span><button class="btn sm" data-mm="apv-new">＋ ${tr('기안')}</button></div><div class="mm-split"><div class="mm-list">`;
    x += G.apv.length ? G.apv.map(apvRow).join('') : `<p class="muted">${tr('문서가 없어요')}</p>`;
    x += `</div><div class="mm-detail">`;
    if (G.newApv) x += apvForm();
    else if (G.apvSel) {
      const a = G.apvSel, st = APV_ST[a.status] || [a.status, '#8a7f72'];
      const me = G.me && G.me.user, myTurn = a.status === 'in_progress' && (a.line || []).some((l) => l.order === a.currentStep && me && (l.approverUserId === me.id || l.approverUserId === me.username));
      x += `<h3>${esc(a.title || '')} ${chip(st[0], st[1])}</h3><small class="muted">${tr('기안')} ${esc(userName(a.drafterUserId))} · ${when(a.submittedAt || a.createdAt)}</small>`;
      x += `<ol class="mm-line">${(a.line || []).map((l) => `<li class="${l.order === a.currentStep && a.status === 'in_progress' ? 'cur' : ''} st-${esc(l.status || '')}"><b>${esc(userName(l.approverUserId))}</b> <small>${esc(tr(ROLE[l.role] || l.role || ''))} · ${esc(tr(LINE_ST[l.status] || l.status || ''))}${l.actedAt ? ' · ' + when(l.actedAt) : ''}</small>${l.comment ? `<div class="mm-cm">💬 ${esc(l.comment)}</div>` : ''}</li>`).join('')}</ol>`;
      x += `<div class="mm-body">${esc(a.content || '')}</div>`;
      if (myTurn) x += `<textarea class="mg-ta" data-mmf="comment" placeholder="${tr('의견 (선택)')}"></textarea><div class="mm-row"><button class="btn sm" data-mm="act" data-v="approve">✅ ${tr('승인')}</button><button class="btn ghost sm danger" data-mm="act" data-v="reject">↩️ ${tr('반려')}</button></div>`;
      else if (a.status === 'in_progress' && me && a.drafterUserId === me.id && !(a.line || []).some((l) => l.status === 'approved')) x += `<div class="mm-row"><button class="btn ghost sm" data-mm="act" data-v="withdraw">⤺ ${tr('회수')}</button></div>`;
      else if (a.status === 'draft') x += `<div class="mm-row"><button class="btn sm" data-mm="submit-apv">📨 ${tr('상신')}</button></div>`;
    } else x += `<p class="muted mm-pad">${tr('왼쪽에서 문서를 고르세요')}</p>`;
    return x + '</div></div>';
  }
  function apvForm() {
    const f = G.newApv;
    const opts = G.users.map((u) => `<option value="${esc(u.id)}">${esc(u.name || u.username)}${u.affiliation ? ' · ' + esc(u.affiliation) : ''}</option>`).join('');
    return `<h3>✍️ ${tr('새 기안')}</h3><input class="mg-in wide" data-mmf="title" placeholder="${tr('제목')}" value="${esc(f.title)}"><textarea class="mg-ta tall" data-mmf="content" placeholder="${tr('본문')}">${esc(f.content)}</textarea>
      <div class="mm-sub">${tr('결재선 (순서대로)')}</div><ol class="mm-line">${f.line.map((l, i) => `<li><b>${esc(userName(l.approverUserId))}</b> <small>${esc(tr(ROLE[l.role]))}</small> <button class="btn ghost sm" data-mm="line-del" data-v="${i}">✕</button></li>`).join('') || `<li class="muted">${tr('결재자를 추가하세요')}</li>`}</ol>
      <div class="mm-row"><select data-mmf="approver"><option value="">${tr('결재자 고르기')}</option>${opts}</select><select data-mmf="role">${Object.entries(ROLE).map(([k, v]) => `<option value="${k}">${tr(v)}</option>`).join('')}</select><button class="btn ghost sm" data-mm="line-add">＋ ${tr('추가')}</button></div>
      <div class="mm-row"><button class="btn sm" data-mm="apv-save" data-v="submit">📨 ${tr('바로 상신')}</button><button class="btn ghost sm" data-mm="apv-save" data-v="draft">💾 ${tr('임시저장')}</button><button class="btn ghost sm" data-mm="apv-cancel">${tr('취소')}</button></div>`;
  }

  function repView() {
    let x = `<div class="mm-row"><button class="btn sm" data-mm="draft">🤖 ${tr('AI 세션 기록으로 이번 주 초안 만들기')}</button><span class="muted">${tr('초안은 고친 다음에만 보내요')}</span></div><div class="mm-split"><div class="mm-list">`;
    x += G.reports.length ? G.reports.map((r) => `<div class="mm-li static"><b>${esc(r.title || r.periodKey || '')}</b><small>${chip({ draft: '임시', submitted: '제출', returned: '반려', approved: '승인' }[r.status] || r.status, { approved: '#2fb27f', returned: '#e5534b', submitted: '#4e7cf6' }[r.status] || '#8a7f72')} ${esc(r.periodKey || '')} · ${when(r.updatedAt || r.createdAt)}</small></div>`).join('') : `<p class="muted">${tr('업무보고가 없어요')}</p>`;
    x += `</div><div class="mm-detail">`;
    if (G.draft) {
      const d = G.draft;
      x += `<h3>📝 ${tr('업무보고 초안')} <small class="muted">${esc(d.periodStart)} ~ ${esc(d.periodEnd)} · ${tr('AI 세션 {0}개 · 프로젝트 {1}개', d.stats ? d.stats.sessions : 0, d.stats ? d.stats.projects : 0)}</small></h3><input class="mg-in wide" data-mmd="title" value="${esc(d.title)}"><div class="mm-row"><small>${tr('기간 키')}</small><input class="mg-in" data-mmd="periodKey" value="${esc(d.periodKey)}"></div>`;
      d.sections.forEach((s, i) => { x += `<div class="mm-sub">${esc(s.label)}</div><textarea class="mg-ta tall" data-mmsec="${i}">${esc(s.body)}</textarea>`; });
      x += `<div class="mm-row"><button class="btn sm" data-mm="rep-save" data-v="submit">📨 ${tr('제출')}</button><button class="btn ghost sm" data-mm="rep-save" data-v="draft">💾 ${tr('임시저장')}</button><button class="btn ghost sm" data-mm="rep-cancel">${tr('취소')}</button></div>`;
    } else x += `<p class="muted mm-pad">${tr('이번 주 AI 세션들의 제목 · 할 일 진행으로 「금주 실적 / 차주 계획」 초안을 만들어 드려요.')}</p>`;
    return x + '</div></div>';
  }

  function evView() {
    const f = G.evNew;
    let x = `<div class="mm-row"><b>${tr('앞으로 31일')}</b><span class="mm-sp"></span><button class="btn sm" data-mm="ev-new">＋ ${tr('일정 등록')}</button></div>`;
    if (f) x += `<div class="mm-card mm-form"><input class="mg-in wide" data-mme="title" placeholder="${tr('제목')}" value="${esc(f.title)}"><div class="mm-row"><label>${tr('시작')} <input type="datetime-local" data-mme="start" value="${esc(f.start)}"></label><label>${tr('끝')} <input type="datetime-local" data-mme="end" value="${esc(f.end)}"></label><select data-mme="scope">${[['personal', '개인'], ['dept', '부서'], ['org', '전사']].map(([k, l]) => `<option value="${k}" ${f.scope === k ? 'selected' : ''}>${tr(l)}</option>`).join('')}</select><input class="mg-in" data-mme="location" placeholder="${tr('장소')}" value="${esc(f.location)}"></div><div class="mm-row"><button class="btn sm" data-mm="ev-save">${tr('등록')}</button><button class="btn ghost sm" data-mm="ev-cancel">${tr('취소')}</button></div></div>`;
    const byDay = new Map();
    for (const e of G.evList) { const k = String(e.start || '').slice(0, 10); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(e); }
    x += byDay.size ? [...byDay].map(([k, list]) => `<div class="mm-day"><div class="mm-dh">${day(k)}</div>${list.map(evRow).join('')}</div>`).join('') : `<p class="muted">${tr('일정이 없어요')}</p>`;
    return x;
  }

  function eqView() {
    let x = `<div class="mm-row"><input class="mg-in wide" data-mmq placeholder="🔎 ${tr('품명 · 자산번호 · 위치 · 사용자 검색')}" value="${esc(G.eqQ)}"><button class="btn sm" data-mm="eq-search">${tr('검색')}</button></div><div class="mm-split"><div class="mm-list">`;
    x += G.eq.length ? G.eq.map((e) => `<button class="mm-li ${G.eqSel && G.eqSel.id === e.id ? 'on' : ''}" data-mm="eq" data-v="${esc(e.id)}"><b>${esc(e.name || '')}</b><small>${esc(e.assetNo || '')} · 📍${esc(e.location || '—')} · ${esc(e.status || '')}${e.userName ? ' · 👤' + esc(e.userName) : ''}</small></button>`).join('') : `<p class="muted">${tr('물품이 없어요')}</p>`;
    x += `</div><div class="mm-detail">`;
    const e = G.eqSel;
    if (e) {
      x += `<h3>🧰 ${esc(e.name || '')}</h3><dl class="mm-dl">${[['자산번호', e.assetNo], ['분류', e.category], ['모델', [e.manufacturer, e.model].filter(Boolean).join(' ')], ['시리얼', e.serial], ['취득일', e.acquiredDate], ['관리자', e.managerName]].filter(([, v]) => v).map(([k, v]) => `<dt>${tr(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
      x += `<div class="mm-sub">${tr('수정 (관리기록에 남아요)')}</div><div class="mm-row"><label>${tr('위치')} <input class="mg-in" data-mmq2="location" value="${esc(e.location || '')}"></label><label>${tr('상태')} <input class="mg-in" data-mmq2="status" value="${esc(e.status || '')}"></label><label>${tr('사용자')} <input class="mg-in" data-mmq2="userName" value="${esc(e.userName || '')}"></label></div><textarea class="mg-ta" data-mmq2="note" placeholder="${tr('비고')}">${esc(e.note || '')}</textarea><button class="btn sm" data-mm="eq-save">💾 ${tr('저장')}</button>`;
    } else x += `<p class="muted mm-pad">${tr('물품을 고르세요')}</p>`;
    return x + '</div></div>';
  }

  function boardView() {
    let x = `<div class="mm-row">${G.boards.map((b) => `<button class="mm-seg ${G.board === b.id ? 'on' : ''}" data-mm="board" data-v="${esc(b.id)}">${esc(b.name || b.title || b.id)}</button>`).join('')}<span class="mm-sp"></span><button class="btn sm" data-mm="post-new">✏️ ${tr('글쓰기')}</button></div><div class="mm-split"><div class="mm-list">`;
    x += G.bposts.length ? G.bposts.map((p) => `<button class="mm-li ${G.postSel && G.postSel.id === p.id ? 'on' : ''}" data-mm="post" data-v="${esc(p.id)}"><b>${p.pinned ? '📌 ' : ''}${esc(p.title || '')}</b><small>${esc(userName(p.authorUserId || p.author || p.createdBy))} · ${when(p.createdAt)}</small></button>`).join('') : `<p class="muted">${tr('게시글이 없어요')}</p>`;
    x += `</div><div class="mm-detail">`;
    if (G.postNew) x += `<h3>✏️ ${tr('새 글')}</h3><input class="mg-in wide" data-mmp="title" placeholder="${tr('제목')}" value="${esc(G.postNew.title)}"><textarea class="mg-ta tall" data-mmp="body" placeholder="${tr('내용')}">${esc(G.postNew.body)}</textarea><div class="mm-row"><button class="btn sm" data-mm="post-save">${tr('등록')}</button><button class="btn ghost sm" data-mm="post-cancel">${tr('취소')}</button></div>`;
    else if (G.postSel) x += `<h3>${esc(G.postSel.title || '')}</h3><small class="muted">${esc(userName(G.postSel.authorUserId || G.postSel.author || G.postSel.createdBy))} · ${when(G.postSel.createdAt)}</small><div class="mm-body">${esc(G.postSel.body || '')}</div>`;
    else x += `<p class="muted mm-pad">${tr('글을 고르세요')}</p>`;
    return x + '</div></div>';
  }

  function setView() {
    const c = G.cfg || { cfg: {} }, cfg = c.cfg || {};
    let x = `<div class="mm-grid"><section class="mm-card"><h3>🔐 ${tr('토큰 · 계정 금고')}</h3>`;
    x += `<p>${c.hasToken ? `✅ ${tr('토큰이 관리자 계정 금고에 저장돼 있어요')}` : `⬜ ${tr('토큰 없음')}`} · ${c.unlocked ? `🔓 ${tr('금고 열림 (로그인 중)')}` : `🔒 ${tr('금고 잠김 — 다시 로그인하면 열려요')}`}</p>`;
    x += `<p class="muted">${tr('토큰은 코드나 파일에 평문으로 남지 않아요. 계정마다 다른 키로 암호화되고, 그 키는 비밀번호·로그인으로만 풀려요. 화면에는 다시 보여 주지 않아요.')}</p>`;
    x += `<div class="mm-row"><input class="mg-in wide" type="password" autocomplete="off" data-mms="token" placeholder="${c.hasToken ? tr('새 토큰으로 바꾸기 (mgm_…)') : 'mgm_…'}"><button class="btn sm" data-mm="token-save">${tr('저장')}</button>${c.hasToken ? `<button class="btn ghost sm danger" data-mm="token-del">${tr('토큰 지우기')}</button>` : ''}</div>`;
    if (c.external) x += `<p class="mg-err">${tr('지금은 외부 주소로 접속 중이라 토큰을 넣을 수 없어요 (이 PC 에서 127.0.0.1:17777 로 접속해 넣으세요)')}</p>`;
    x += `<div class="mm-sub">${tr('API 주소 (바꾸면 토큰도 다시 넣어야 해요)')}</div><input class="mg-in wide" data-mms="base" value="${esc(cfg.base || '')}">`;
    const A = c.auto || {};
    x += `<div class="mm-sub">🤖 ${tr('AI 세션 활동으로 자동 출퇴근')}</div><label class="mg-chk"><input type="checkbox" data-mma="on" ${A.on ? 'checked' : ''}> ${tr('켜기 — 그날 처음 AI 에게 일을 시키면 출근, 한동안 조용하면 퇴근')}</label>`
      + `<div class="mm-row"><label>${tr('출근 신호')} <select data-mma="signal"><option value="prompt" ${A.signal !== 'any' ? 'selected' : ''}>${tr('내가 요청을 보낼 때')}</option><option value="any" ${A.signal === 'any' ? 'selected' : ''}>${tr('AI 가 일할 때도 (자동 작업 포함)')}</option></select></label>`
      + `<label>${tr('퇴근: 조용한 지')} <input type="number" min="5" max="240" data-mma="idleMin" value="${A.idleMin || 30}">${tr('분')}</label><label>${tr('출근 가능')} <input type="number" min="0" max="23" data-mma="startHour" value="${A.startHour ?? 5}">${tr('시부터')}</label>`
      + `<label class="mg-chk"><input type="checkbox" data-mma="weekdaysOnly" ${A.weekdaysOnly !== false ? 'checked' : ''}> ${tr('주말 제외')}</label><button class="btn sm" data-mm="auto-save">${tr('자동 출퇴근 저장')}</button></div>`
      + `<p class="muted">${tr('행정 API 는 출근 시각은 처음 한 번만, 퇴근 시각은 마지막 값으로 기록해요. 그래서 다시 일하면 다음 퇴근 때 퇴근 시각이 늦춰져요. 출퇴근 말고는 아무것도 쓰지 않아요.')}</p>`
      + (A.today ? `<p>${tr('오늘')}: ${tr('출근')} <b>${A.today.inAt ? hm(new Date(A.today.inAt).toISOString()) : '—'}</b> · ${tr('퇴근')} <b>${A.today.outAt ? hm(new Date(A.today.outAt).toISOString()) : '—'}</b> · ${tr('마지막 AI 활동')} <b>${A.today.lastAct ? hm(new Date(A.today.lastAct).toISOString()) : '—'}</b></p>` : '')
      + ((A.history || []).length ? `<div class="mm-hist">${A.history.map((h) => `<div>${h.ok ? '✅' : '⚠️'} ${when(new Date(h.at).toISOString())} · ${esc(tr(h.what))} <small>${esc(h.detail || '')}</small></div>`).join('')}</div>` : '');
    x += `<label class="mg-chk"><input type="checkbox" data-mms="externalWrite" ${cfg.externalWrite ? 'checked' : ''}> ${tr('외부 주소(터널)로 접속했을 때도 처리(출퇴근 · 결재 · 등록) 허용')}</label><button class="btn ghost sm" data-mm="cfg-save">${tr('설정 저장')}</button></section>`;
    x += `<section class="mm-card"><h3>🛡️ ${tr('보안 규칙')}</h3><ul class="mm-ul">${[
      '관리자 로그인만 쓸 수 있어요 (등급 계정 · 비로그인 · API 키로는 불가)',
      '토큰은 서버에서만 붙여 보내요 — 브라우저 · 응답 · 로그에 안 나가요',
      '토큰은 저장한 주소에 묶여요 — 주소를 바꿔 토큰을 빼돌릴 수 없어요',
      '허용된 경로 · 조회 조건 · 입력 필드만 통과 (나머지는 거부)',
      '삭제 · 직원/부서 변경 · 근태 보정은 AI OFFICE 에서 못 해요',
      '읽기 120회/분 · 쓰기 20회/분 제한, 리다이렉트 따라가지 않음, 응답 2MB 제한',
      '쓰기는 JSON 요청만 · 다른 사이트에서 온 요청 거부',
      '외부 주소 접속은 기본 읽기 전용, 토큰 저장은 이 PC 에서만',
      '모든 처리 · 거부를 감사 기록으로 남겨요 (내용 · 토큰은 안 남김)'].map((t) => `<li>${tr(t)}</li>`).join('')}</ul></section>`;
    x += `<section class="mm-card mm-wide"><h3>🧾 ${tr('감사 기록')} <small class="muted">${tr('최근 200건')}</small></h3><div class="mm-audit">${G.audit.length ? `<table class="mg-table"><thead><tr><th>${tr('시각')}</th><th>${tr('누가')}</th><th>${tr('요청')}</th><th>${tr('결과')}</th></tr></thead><tbody>${G.audit.map((a) => `<tr><td>${when(new Date(a.at).toISOString())}</td><td>${esc(a.who || '')}${a.ext ? ' 🌐' : ''}</td><td><code>${esc(a.method || '')} ${esc(a.path || '')}</code></td><td>${a.status >= 400 ? '❌' : '✅'} ${esc(String(a.status || ''))} ${esc(a.code || '')}</td></tr>`).join('')}</tbody></table>` : `<p class="muted">${tr('기록이 없어요')}</p>`}</div></section></div>`;
    return x;
  }

  // ---------------------------------------------------------------- 동작
  const val = (sel) => { const el = G.host.querySelector(sel); return el ? el.value : ''; };
  async function act(btn) {
    const k = btn.dataset.mm, v = btn.dataset.v;
    try {
      if (k === 'reload') { G.cfg = null; return loadTab(); }
      if (k === 'punch') {
        if (!confirm(v === 'in' ? tr('출근을 기록할까요?') : tr('퇴근을 기록할까요?'))) return;
        await call('/attendance/punch', 'POST', { kind: v }); toast(v === 'in' ? tr('☀️ 출근 기록했어요') : tr('🌙 퇴근 기록했어요')); return loadTab();
      }
      if (k === 'box') { G.box = v; G.apvSel = null; return loadTab(); }
      if (k === 'apv') { G.newApv = null; G.apvSel = await data('/approvals/' + encodeURIComponent(v)); if (G.tab !== 'apv') { G.tab = 'apv'; return loadTab(); } return render(); }
      if (k === 'apv-new') { G.apvSel = null; G.newApv = { title: '', content: '', line: [] }; return render(); }
      if (k === 'apv-cancel') { G.newApv = null; return render(); }
      if (k === 'line-add') { keepForm(); const id = val('[data-mmf=approver]'); if (!id) return; G.newApv.line.push({ approverUserId: id, role: val('[data-mmf=role]') || 'approval' }); return render(); }
      if (k === 'line-del') { keepForm(); G.newApv.line.splice(+v, 1); return render(); }
      if (k === 'apv-save') {
        keepForm(); const f = G.newApv;
        if (!f.title.trim() || !f.line.length) return toast(tr('제목과 결재선을 채워 주세요'));
        if (v === 'submit' && !confirm(tr('「{0}」을(를) 상신할까요?', f.title))) return;
        const r = await call('/approvals', 'POST', { title: f.title.trim(), content: f.content, line: f.line, ...(v === 'submit' ? { submit: true } : {}) });
        G.newApv = null; G.apvSel = r.data; toast(v === 'submit' ? tr('📨 상신했어요') : tr('💾 임시저장했어요')); G.box = 'sent'; return loadTab();
      }
      if (k === 'submit-apv') { if (!confirm(tr('상신할까요?'))) return; const r = await call(`/approvals/${encodeURIComponent(G.apvSel.id)}/submit`, 'POST', { ifUpdatedAt: G.apvSel.updatedAt }); G.apvSel = r.data; toast(tr('📨 상신했어요')); return loadTab(); }
      if (k === 'act') {
        const label = { approve: '승인', reject: '반려', withdraw: '회수' }[v];
        if (!confirm(tr('「{0}」 문서를 {1}할까요?', G.apvSel.title, tr(label)))) return;
        const body = v === 'withdraw' ? {} : { comment: val('[data-mmf=comment]').slice(0, 1000) };
        const r = await call(`/approvals/${encodeURIComponent(G.apvSel.id)}/${v}`, 'POST', body);
        G.apvSel = r.data; toast(tr('✅ {0}했어요', tr(label))); return loadTab();
      }
      if (k === 'draft') { const r = await call('/api/mgm/draft'); G.draft = r.draft; return render(); }
      if (k === 'rep-cancel') { G.draft = null; return render(); }
      if (k === 'rep-save') {
        keepDraft(); const d = G.draft;
        if (v === 'submit' && !confirm(tr('업무보고를 제출할까요?'))) return;
        await call('/reportdocs', 'POST', { period: d.period, periodKey: d.periodKey, periodStart: d.periodStart, periodEnd: d.periodEnd, title: d.title, sections: d.sections.map(({ key, label, body }) => ({ key, label, body })), ...(v === 'submit' ? { submit: true } : {}) });
        G.draft = null; toast(v === 'submit' ? tr('📨 제출했어요') : tr('💾 임시저장했어요')); return loadTab();
      }
      if (k === 'ev-new') { const t = new Date(Date.now() + 3600e3); t.setMinutes(0, 0, 0); const loc = (d) => `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; G.evNew = { title: '', start: loc(t), end: loc(new Date(t.getTime() + 3600e3)), scope: 'personal', location: '' }; return render(); }
      if (k === 'ev-cancel') { G.evNew = null; return render(); }
      if (k === 'ev-save') {
        const f = {}; G.host.querySelectorAll('[data-mme]').forEach((el) => { f[el.dataset.mme] = el.value; });
        if (!f.title.trim() || !f.start) return toast(tr('제목과 시작 시각을 채워 주세요'));
        const iso = (s) => { const d = new Date(s); return isNaN(d) ? s : d.toISOString(); };
        await call('/events', 'POST', { title: f.title.trim(), start: iso(f.start), end: iso(f.end || f.start), scope: f.scope, ...(f.location ? { location: f.location } : {}) });
        G.evNew = null; toast(tr('📅 일정을 등록했어요')); return loadTab();
      }
      if (k === 'eq-search') { G.eqQ = val('[data-mmq]').trim(); G.eqSel = null; return loadTab(); }
      if (k === 'eq') { G.eqSel = await data('/equipment/' + encodeURIComponent(v)); delete G.eqSel.images; return render(); }
      if (k === 'eq-save') {
        const p = { ifUpdatedAt: G.eqSel.updatedAt }; G.host.querySelectorAll('[data-mmq2]').forEach((el) => { if (el.value !== (G.eqSel[el.dataset.mmq2] || '')) p[el.dataset.mmq2] = el.value; });
        if (Object.keys(p).length < 2) return toast(tr('바뀐 내용이 없어요'));
        const r = await call('/equipment/' + encodeURIComponent(G.eqSel.id), 'PATCH', p); G.eqSel = r.data; toast(tr('💾 저장했어요')); return loadTab();
      }
      if (k === 'board') { G.board = v; G.postSel = null; return loadTab(); }
      if (k === 'post') { G.postNew = null; G.postSel = await data('/posts/' + encodeURIComponent(v)); if (G.tab !== 'board') { G.tab = 'board'; G.board = G.postSel.boardId || G.board; return loadTab(); } return render(); }
      if (k === 'post-new') { G.postSel = null; G.postNew = { title: '', body: '' }; return render(); }
      if (k === 'post-cancel') { G.postNew = null; return render(); }
      if (k === 'post-save') {
        const t = val('[data-mmp=title]').trim(), b = val('[data-mmp=body]');
        if (!t || !G.board) return toast(tr('제목을 채워 주세요'));
        if (!confirm(tr('게시판에 올릴까요?'))) return;
        await call('/posts', 'POST', { boardId: G.board, title: t, body: b }); G.postNew = null; toast(tr('📢 올렸어요')); return loadTab();
      }
      if (k === 'token-save' || k === 'token-del') {
        const tok = k === 'token-del' ? '' : val('[data-mms=token]').trim();
        if (k === 'token-save' && !/^mgm_[A-Za-z0-9]{16,128}$/.test(tok)) return toast(tr('mgm_ 로 시작하는 토큰을 넣어 주세요'));
        if (k === 'token-del' && !confirm(tr('저장된 토큰을 지울까요?'))) return;
        G.cfg = await call('/api/mgm/config', 'POST', { token: tok, cfg: { base: val('[data-mms=base]').trim() } }); toast(tok ? tr('🔐 금고에 저장했어요') : tr('토큰을 지웠어요')); return loadTab();
      }
      if (k === 'auto-save') {
        const q = (n) => G.host.querySelector(`[data-mma=${n}]`);
        G.cfg = await call('/api/mgm/config', 'POST', { cfg: { base: val('[data-mms=base]').trim(), auto: { on: q('on').checked, signal: q('signal').value, idleMin: +q('idleMin').value, startHour: +q('startHour').value, weekdaysOnly: q('weekdaysOnly').checked } } });
        toast(G.cfg.auto && G.cfg.auto.on ? tr('🤖 자동 출퇴근을 켰어요') : tr('자동 출퇴근을 껐어요')); return render();
      }
      if (k === 'cfg-save') { const el = G.host.querySelector('[data-mms=externalWrite]'); G.cfg = await call('/api/mgm/config', 'POST', { cfg: { base: val('[data-mms=base]').trim(), externalWrite: !!(el && el.checked) } }); toast(tr('저장했어요')); return render(); }
    } catch (e) { toast('⚠️ ' + tr(e.message)); if (e.status === 409) loadTab(); }
  }
  function keepForm() { if (!G.newApv) return; G.newApv.title = val('[data-mmf=title]'); G.newApv.content = val('[data-mmf=content]'); }
  function keepDraft() { const d = G.draft; if (!d) return; d.title = val('[data-mmd=title]'); d.periodKey = val('[data-mmd=periodKey]'); G.host.querySelectorAll('[data-mmsec]').forEach((el) => { d.sections[+el.dataset.mmsec].body = el.value; }); }

  function mount(host) {
    if (G.host !== host) {
      G.host = host;
      host.addEventListener('click', (ev) => {
        const t = ev.target.closest('[data-mm-tab]'); if (t) { G.tab = t.dataset.mmTab; G.err = null; return loadTab(); }
        const b = ev.target.closest('[data-mm]'); if (b && !b.disabled) act(b);
      });
      host.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target.matches('[data-mmq]')) act({ dataset: { mm: 'eq-search' } }); });
    }
    render(); loadTab();
  }
  AIO.mgm = { mount, open: (tab) => { G.tab = tab || 'home'; AIO.manage && AIO.manage.open && AIO.manage.open('mgm'); } };
})();
