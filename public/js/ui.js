// HTML overlay: top chips, sidebar lists, settings, login, detail drawer, insight dashboard, ticker, tooltip, notifications.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = AIO.esc;
  let world, opts, state = { sessions: [], feed: [] };
  let filter = 'all';
  let notify = false;
  const prevStatus = new Map();
  let tickerPending = null, tickerShown = '';
  // constant reading speed (~70px/s) whatever the amount of news
  const tickerSpeed = () => { const tr = document.getElementById('tickerTrack'); tr.style.animationDuration = Math.max(15, tr.scrollWidth / 70) + 's'; };
  let drawerId = null, drawerMode = null;

  const authed = () => AIO.auth.state.authed;
  const code = (id) => world?.codes.get(id) || '';
  const tr = (...a) => AIO.tr(...a);
  const act = (a) => AIO.i18n.act(a?.label, a?.type);
  // session titles are user data (never translated); only the generic "Claude 세션" style names are
  const GENERIC_NAME = { ' 하네스': ' harness', ' 앱': ' app', ' 세션': ' session' };
  const nameOf = (s) => {
    const n = world.nameOf(s);
    if (AIO.lang !== 'en' || (world.authed && s.title)) return n;
    const m = n.match(/^(.*)( 하네스| 앱| 세션)$/);
    return m ? m[1] + GENERIC_NAME[m[2]] : n;
  };
  const PLACE_ICON = { jail: '🚔 ', vault: '🏦 ' };
  const mobile = () => matchMedia('(max-width: 760px)').matches;
  let modalKind = null;

  function avatar(s, size = 28) {
    const pv = AIO.provider(s.provider);
    return `<div class="av" style="width:${size}px;height:${size}px;background:${pv.accent}">${esc(code(s.id) || pv.short)}</div>`;
  }
  function pill(status) { const st = AIO.status(status); return `<span class="st" style="background:${st.color}">${st.label}</span>`; }
  function since(t) { return t ? AIO.fmtDur(Date.now() - t) : ''; }
  function item(s, sub, o = {}) {
    const c = s.ctl || {}, h = AIO.hr ? AIO.hr.ofSession(s) : null;
    const marks = `${c.pinned ? '<i title="고정">📌</i>' : ''}${s.meta?.memo && authed() ? `<i title="${esc(s.meta.memo.slice(0, 120))}">📝</i>` : ''}${c.lock ? '<i title="강제 배치">📍</i>' : ''}${s.dismissed ? '<i title="알림 해제됨">🔕</i>' : ''}`;
    const extra = o.dismiss && authed() ? `<button class="it-btn" data-dismiss="${esc(s.id)}" title="${tr('실제로는 결정할 필요 없음 — 알림 해제')}">🔕</button>` : '';
    const bar = o.bar ? `<div class="it-bar"><span style="width:${Math.min(100, Math.round(((Date.now() - (s.activity?.since || Date.now())) / 600000) * 100))}%"></span></div>` : '';
    return `<div class="item ${c.pinned ? 'pinned' : ''}" data-id="S:${esc(s.id)}">${avatar(s)}<div class="tx"><div class="t1">${esc(nameOf(s))}${h ? `<small class="rk">${esc(h.grade)}${h.role === '팀장' ? '·팀장' : ''}</small>` : ''}${marks}</div><div class="t2">${esc(sub)}</div>${bar}</div>${extra}${pill(s.status)}</div>`;
  }
  const feedText = (f) => { const t = AIO.i18n.feed(f.text, f.kind); return authed() ? t : `${code(f.sid) || ''} · ${t}`; };

  function render(st) {
    state = st;
    AIO.auth.fromState(st);
    const ss = st.sessions || [];
    const urgent = ss.filter((s) => AIO.isUrgent(s.status));
    const busy = ss.filter((s) => AIO.isBusy(s.status));
    const done = ss.filter((s) => s.status === 'done');
    const rest = ss.filter((s) => s.status === 'idle' || s.status === 'sleeping');
    const harness = ss.filter((s) => s.kind === 'harness');
    const agents = ss.reduce((n, s) => n + (s.agents || []).filter((a) => a.status === 'working').length, 0);

    $('chips').innerHTML = [
      ['busy', '작업중', busy.length, '#3fb27f'], ['urgent', '결정 필요', urgent.length, '#e5534b'], ['done', '완료', done.length, '#4e9cf6'],
      ['rest', '휴식', rest.length, '#b8a58c'], ['harness', '하네스 팀', harness.length, '#a67be0'], ['agents', '팀원·인턴 출동', agents, '#f3c44b'],
    ].map(([k, l, n, c]) => `<div class="chip ${k === 'urgent' && n ? 'alert' : ''}" data-chip="${k}"><span class="dot" style="background:${c}"></span>${tr(l)} <b>${n}</b></div>`).join('');

    $('decisionCard').classList.toggle('on', urgent.length > 0);
    if ($('tbDot')) $('tbDot').hidden = !urgent.length;
    $('decisionCount').textContent = urgent.length;
    $('decisionList').innerHTML = urgent.length
      ? urgent.map((s) => item(s, `${authed() ? (s.activity?.detail || act(s.activity)) : AIO.status(s.status).label} · ${tr('{0}째', since(s.activity?.since))}`, { dismiss: true })).join('')
      : `<div class="empty-note">${tr('지금은 결정할 일이 없어요 🎉')}</div>`;
    // 지금 일하는 중: 고정(📌)한 세션이 맨 위, 그다음 바쁜 세션
    const working = [...ss.filter((s) => s.ctl?.pinned), ...busy.filter((s) => !s.ctl?.pinned)];
    $('workingCount').textContent = working.length;
    $('workingList').innerHTML = working.length
      ? working.map((s) => item(s, `${AIO.ACT_ICON[s.activity?.type] || ''} ${act(s.activity) || AIO.status(s.status).label} · ${since(s.activity?.since)}${authed() && s.project ? ' · ' + s.project : ''}`, { bar: AIO.isBusy(s.status) })).join('')
      : `<div class="empty-note">${tr('모두 쉬는 중이에요 ☕')}</div>`;

    const provs = [...new Set(ss.map((s) => s.provider))];
    $('filters').innerHTML = ['all', ...provs, 'harness'].map((p) => `<button data-filter="${p}" class="${filter === p ? 'on' : ''}">${p === 'all' ? tr('전체') : p === 'harness' ? tr('하네스') : esc(AIO.provider(p).label)}</button>`).join('');
    const q = ($('sideQ') && $('sideQ').value.trim().toLowerCase()) || '';
    const list = ss.filter((s) => (filter === 'all' || s.provider === filter || (filter === 'harness' && s.kind === 'harness')) && (!q || [s.title, s.project, code(s.id), s.meta?.memo].some((v) => String(v || '').toLowerCase().includes(q)))).sort((a, b) => rank(a) - rank(b) || b.lastActive - a.lastActive);
    $('allCount').textContent = ss.length;
    $('allList').innerHTML = list.map((s) => item(s, `${PLACE_ICON[s.place] || ''}${s.kind === 'harness' ? `🧶 ${tr('하네스')} · ` : ''}${tr(s.app || '')}${authed() && s.project ? ' · ' + s.project : ''}`)).join('') || `<div class="empty-note">${tr('세션이 없어요')}</div>`;

    // fold back-to-back repeats ("웹 탐색 중" ×3) so the ticker reads like news, not a log
    const feed = [];
    for (const f of st.feed || []) {
      const prev = feed[feed.length - 1];
      if (prev && prev.sid === f.sid && feedText(prev).replace(/ ×\d+$/, '') === feedText(f).replace(/ ×\d+$/, '')) { prev.k = (prev.k || 1) + 1; continue; }
      feed.push({ ...f });
    }
    for (const f of feed) if (f.k > 1) f.text = f.text.replace(/ ×\d+$/, '') + ` ×${f.k}`;
    $('feedList').innerHTML = feed.slice(0, 40).map((f) => `<div class="f" data-id="${f.sid ? 'S:' + esc(f.sid) : ''}"><span class="tm">${AIO.fmtTime(f.t)}</span><span class="ic">${esc(f.icon || '•')}</span><span class="tx">${esc(feedText(f))}</span></div>`).join('') || `<div class="empty-note">${tr('아직 소식이 없어요')}</div>`;
    // ticker: swap the text only when one full scroll finishes, so it never jumps back to the start mid-read
    const html = feed.slice(0, 12).map((f) => `<span data-id="${f.sid ? 'S:' + esc(f.sid) : ''}">${esc(f.icon || '•')} ${esc(feedText(f))} <small style="opacity:.6">${AIO.fmtTime(f.t)}</small></span>`).join('') || `<span>${tr('사무실이 조용해요…')}</span>`;
    const track = $('tickerTrack');
    if (!track.dataset.html || track.dataset.authed !== String(authed())) { track.innerHTML = html; track.dataset.html = '1'; track.dataset.authed = String(authed()); tickerShown = html; tickerPending = null; tickerSpeed(); }
    else if (html !== tickerShown) tickerPending = html;
    $('empty').hidden = ss.length > 0;

    for (const s of ss) {
      const p = prevStatus.get(s.id);
      if (p !== undefined && p !== s.status && AIO.isUrgent(s.status)) alertUser(s);
      prevStatus.set(s.id, s.status);
    }
    if (drawerId && drawerMode !== 'detail') renderDrawer();
    if (AIO.manage) AIO.manage.refresh();
  }

  function rank(s) { return AIO.isUrgent(s.status) ? 0 : AIO.isBusy(s.status) ? 1 : s.status === 'done' ? 2 : s.status === 'idle' ? 3 : s.status === 'present' ? 4 : 5; }

  function alertUser(s) {
    if (!notify) return;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [880, 1320].forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = f; o.type = 'sine';
        g.gain.setValueAtTime(0.0001, ac.currentTime + i * 0.16);
        g.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + i * 0.16 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + i * 0.16 + 0.35);
        o.connect(g).connect(ac.destination); o.start(ac.currentTime + i * 0.16); o.stop(ac.currentTime + i * 0.16 + 0.4);
      });
    } catch {}
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(`🙋 ${code(s.id)} ${nameOf(s)}`, { body: authed() ? (s.activity?.detail || act(s.activity) || tr('대표님 결정이 필요해요')) : tr('대표님 결정이 필요해요'), tag: s.id }); } catch {}
    }
  }

  // ------------------------------------------------------------ drawer
  function open(id) {
    if (id.startsWith('LV:')) return;
    drawerId = id;
    world.selected = id;
    if (mobile() && !$('side').classList.contains('hidden')) toggleSide(false); // the bottom sheet would cover the drawer
    $('drawer').hidden = false;
    renderDrawer(true);
    syncDrawerClass();
  }
  function close() { drawerId = null; drawerMode = null; world.selected = null; $('drawer').hidden = true; $('drawer').classList.remove('wide'); AIO.detail.close(); syncDrawerClass(); }
  function syncDrawerClass() { document.body.classList.toggle('drawer-open', !$('drawer').hidden); document.body.classList.toggle('drawer-wide', !$('drawer').hidden && $('drawer').classList.contains('wide')); }

  function renderDrawer(fresh) {
    const id = drawerId;
    const e = world.ents.get(id);
    const sid = id.startsWith('S:') ? id.slice(2) : e?.sid;
    const s = state.sessions.find((x) => x.id === sid);
    const body = $('drawerBody');
    if (!s) { body.innerHTML = `<p>${tr('이 세션은 퇴근했어요 👋')}</p>`; return; }
    const isSession = id.startsWith('S:');
    // logged in + a real session -> the deep panel
    if (authed() && isSession && s.source !== 'process') {
      $('drawer').classList.add('wide');
      if (fresh || drawerMode !== 'detail' || AIO.detail.panel.id !== s.id) { drawerMode = 'detail'; AIO.detail.open(body, s.id); }
      return;
    }
    $('drawer').classList.remove('wide');
    if (drawerMode === 'detail') AIO.detail.close();
    drawerMode = 'simple';
    const pv = AIO.provider(s.provider);
    let html = '';
    if (!isSession) {
      const isMember = id.startsWith('M:');
      const a = e?.agent, r = e?.r;
      html += `<div class="d-head"><div class="av" style="background:${isMember ? (world.teamColor.get(s.id) || pv.accent) : '#e0b13a'}">${isMember ? '🧶' : '🎒'}</div><div><h2>${esc(isMember || authed() ? e?.name : tr('인턴'))}</h2><div class="meta">${isMember ? tr('하네스 팀원') : tr('인턴 (서브에이전트)')} · ${esc(nameOf(s))}</div></div></div>`;
      const st = e?.status === 'working' ? 'working' : isMember ? 'standby' : 'done';
      html += `<div class="d-status"><div class="big">${a ? AIO.ACT_ICON[a.activity?.type] || '⌨️' : '☕'}</div><div><div class="l1">${a ? esc(act(a.activity) || tr('작업 중')) : AIO.status(st).label}</div><div class="l2">${authed() ? esc(a?.description || r?.description || '') : ''}</div></div></div>`;
      html += '<dl class="d-kv">';
      if (r) html += `<dt>${tr('누적 호출')}</dt><dd>${tr('{0}회 · Lv.{1}', r.runs || 0, r.level || 1)}</dd>`;
      if (a) html += `<dt>${tr('시작')}</dt><dd>${tr('{0} 전', since(a.startedAt))}</dd><dt>${tr('방식')}</dt><dd>${a.background ? tr('백그라운드') : tr('포그라운드')} · ${tr('깊이 {0}', a.depth || 1)}</dd>`;
      html += `<dt>${tr('소속')}</dt><dd><a href="#" data-open="S:${esc(s.id)}">${esc(code(s.id))} ${esc(nameOf(s))}</a></dd></dl>`;
      if (!authed()) html += lockCta();
      body.innerHTML = html;
      return;
    }
    const stt = AIO.status(s.status);
    html += `<div class="d-head">${avatar(s, 46)}<div><h2>${esc(nameOf(s))}</h2><div class="meta">${esc(pv.label)} · ${esc(tr(s.app || ''))}${s.kind === 'harness' ? ` · 🧶 ${tr('하네스')}` : s.kind === 'app' ? ` · ${tr('앱')}` : ` · ${tr('단일 세션')}`}</div></div></div>`;
    html += `<div class="d-status" style="border-left:4px solid ${stt.color}"><div class="big">${AIO.ACT_ICON[s.activity?.type] || stt.icon}</div><div><div class="l1">${String(s.activity?.label || '').startsWith(stt.ko) ? esc(act(s.activity)) : `${stt.label} · ${esc(act(s.activity))}`}</div><div class="l2">${esc(s.activity?.detail || '')}${s.activity?.since ? ` <br>⏱ ${tr('{0}째', since(s.activity.since))}` : ''}</div></div></div>`;
    html += `<div class="d-grid"><div class="s"><b>${s.stats?.today ?? 0}</b><span>${tr('오늘 처리')}</span></div><div class="s"><b>Lv.${s.level || 1}</b><span>${tr('레벨')}</span></div><div class="s"><b>${(s.agents || []).filter((a) => a.status === 'working').length}</b><span>${tr('출동 중')}</span></div><div class="s"><b>${since(s.startedAt)}</b><span>${tr('근무')}</span></div></div>`;
    if (s.kind === 'harness' && s.roster?.length) html += `<div class="d-sec">${tr('🧶 팀 ({0})', s.roster.length)}</div><div class="roster">${s.roster.map((r) => { const w = (s.agents || []).filter((a) => a.type === r.name && a.status === 'working'); return `<div class="r" data-open="M:S:${esc(s.id)}:${esc(r.name)}"><span class="dot" style="background:${w.length ? '#3fb27f' : '#c9bda9'}"></span><span class="nm">${esc(r.name)}</span><span class="lv">${w.length ? tr('작업중') : tr('대기')} · Lv.${r.level || 1}</span></div>`; }).join('')}</div>`;
    if (s.source === 'process') html += `<div class="note">${tr('이 앱은 실행 여부만 감지돼요. 브리지(유저스크립트·이벤트 API)를 연결하면 대화 상태까지 보여요.')}</div>`;
    if (!authed()) html += lockCta();
    body.innerHTML = html;
  }

  function lockCta() {
    return `<div class="lockcta"><div>${tr('🔒 로그인하면 <b>대화 내용 · 진행 요약 · 토큰/시간 인사이트 · 팀 위임 분석</b>까지 볼 수 있어요')}</div><button class="btn" data-act="login">${tr('로그인')}</button></div>`;
  }

  // ------------------------------------------------------------ settings panel (display + alerts)
  const OPTS = [['labels', '🏷️', '이름표', 'L'], ['bubbles', '💬', '말풍선', 'B'], ['lines', '🧵', '위임선(털실)', 'D']];
  // ------------------------------------------------------------ 🗺️ 맵 선택 (메인): 실내(건물) × 실외(부지)
  const ORIG = [['lab', 'campus', '🏙️', 'AI 캠퍼스'], ['office', 'none', '🧶', '원룸 오피스'], ['terrace', 'terrace', '🌅', '선셋 테라스'], ['kkoma', 'yard', '🏡', '꼬마빌딩 + 마당'], ['kkoma', 'street', '🛣️', '꼬마빌딩 + 골목']];
  function renderMaps() {
    const M = AIO.maps;
    if (!M || !$('mapIn')) return;
    const cur = (list, id) => list.find((d) => d.id === id) || {};
    const ci = cur(M.indoors, M.sel.in), co = cur(M.outdoors, M.sel.out);
    const curTxt = `${ci.icon || ''} ${tr(ci.name || '')} + ${co.icon || ''} ${tr(co.name || '')}`;
    $('mapLbl').textContent = `${tr(ci.name || '맵')} + ${tr(co.name || '')}`;
    if ($('popMapCur')) $('popMapCur').textContent = curTxt;
    $('mapCur').innerHTML = `<span>${tr('지금')}</span> <b>${esc(curTxt)}</b>${M.original() ? ` <em>⭐ ${tr('원본 맵')}</em>` : ''}`;
    $('mapOrig').innerHTML = `<span>⭐ ${tr('원본 맵')}</span>` + ORIG.map(([i, o, ic, nm]) => `<button class="combo-chip ${M.sel.in === i && M.sel.out === o ? 'on' : ''}" data-pick="${i}|${o}">${ic} ${esc(tr(nm))}</button>`).join('');
    const card = (part, d) => `<button class="map-card ${M.sel[part] === d.id ? 'on' : ''}" data-part="${part}" data-id="${d.id}" title="${esc(tr(d.desc || ''))}"><span class="mi">${d.icon}</span><span class="mt"><b>${esc(tr(d.name))}</b><small>${esc(tr(d.desc || ''))}</small></span></button>`;
    $('mapIn').innerHTML = M.indoors.map((d) => card('in', d)).join('');
    $('mapOut').innerHTML = M.outdoors.map((d) => card('out', d)).join('');
    $('mapInN').textContent = M.indoors.length; $('mapOutN').textContent = M.outdoors.length;
  }
  function renderThemes() {
    renderMaps();
    $('optList').innerHTML = OPTS.map(([k, ic, l, key]) => `<label class="opt"><span>${ic} ${tr(l)} <kbd>${key}</kbd></span><input type="checkbox" data-opt="${k}" ${world.opts[k] ? 'checked' : ''}></label>`).join('')
      + `<label class="opt"><span>🔔 ${tr('결정 필요 알림·소리')}</span><input type="checkbox" data-opt="notify" ${notify ? 'checked' : ''}></label>`
      + `<label class="opt"><span>📋 ${tr('사이드바')} <kbd>S</kbd></span><input type="checkbox" data-opt="side" ${$('side').classList.contains('hidden') ? '' : 'checked'}></label>`
      + `<label class="opt"><span>🎖️ ${tr('이름표에 직급 표시')}</span><input type="checkbox" data-opt="rank" ${world.opts.rank !== false ? 'checked' : ''}></label>`
      + `<label class="opt"><span>🌗 ${tr('시간대')}</span><select data-optsel="sky">${[['auto', '실제 시각'], ['day', '항상 낮'], ['dusk', '항상 노을'], ['night', '항상 밤']].map(([k, l]) => `<option value="${k}" ${(world.opts.sky || 'auto') === k ? 'selected' : ''}>${tr(l)}</option>`).join('')}</select></label>`;
    $('adminSec').innerHTML = '';
    if (false) $('adminSec').innerHTML = authed()
      ? `<div class="pop-sec">🔑 ${tr('관리자 전용')}</div><div class="admin-grid">${[['sessions', '👥', '세션 관리'], ['archive', '📦', '세션 보관함'], ['building', '🏢', '빌딩 관리'], ['admin', '🔌', '보관 설정 · 연동 API']].map(([k, ic, l]) => `<button class="theme" data-admin="${k}"><span class="ti">${ic}</span><span><b>${tr(l)}</b></span></button>`).join('')}</div>`
      : `<div class="pop-sec">🔑 ${tr('관리자 전용')}</div><div class="muted" style="padding:0 4px">${tr('로그인하면 세션 관리 · 보관함 · 빌딩 관리 · 연동 API 를 쓸 수 있어요')}</div>`;
  }
  async function setNotify(on) {
    notify = on;
    if (notify && 'Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch {} }
    try { localStorage.setItem('aio.notify', notify ? '1' : '0'); } catch {}
  }
  function toggleSide(force) {
    const hidden = $('side').classList.toggle('hidden', force === undefined ? undefined : !force);
    // on phones the panel is a bottom sheet that starts closed; only the desktop choice is remembered
    if (!mobile()) { try { localStorage.setItem('aio.side', hidden ? '0' : '1'); } catch {} }
    $('btnSide').classList.toggle('on', !hidden);
    opts.onSide && opts.onSide();
  }

  // ------------------------------------------------------------ modal (login / account / insights)
  function modal(html, cls = '') {
    $('modalCard').className = 'modal-card ' + cls;
    $('modalCard').innerHTML = `<button class="close" data-act="mclose" aria-label="${tr('닫기')}">✕</button>${html}`;
    $('modal').hidden = false;
  }
  function closeModal() { $('modal').hidden = true; modalKind = null; }

  function loginModal() {
    const A = AIO.auth.state;
    if (A.available && !A.configured) {
      modal(`<div class="auth"><div class="big">🗝️</div><h2>${tr('관리자 계정이 없어요')}</h2><p>${tr('관리자 계정은 이 PC에서만 설정해요.')}<br><code>node server/set-admin.mjs</code></p></div>`, 'small');
      modalKind = 'login';
      return;
    }
    modal(`<form class="auth" id="authForm"><div class="big">🔐</div><h2>${tr('관리자 로그인')}</h2>
      <p>${tr('로그인하면 대화 내용·진행 요약·인사이트가 보여요.')}</p>
      <input type="text" id="uid" placeholder="${tr('아이디')}" autocomplete="username" required>
      <input type="password" id="pw1" placeholder="${tr('비밀번호')}" autocomplete="current-password" required>
      <div class="err" id="authErr"></div><button class="btn" type="submit">${tr('로그인')}</button></form>`, 'small');
    modalKind = 'login';
    setTimeout(() => $('uid')?.focus(), 30);
    $('authForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      $('authErr').textContent = '';
      const j = await AIO.auth.login($('uid').value, $('pw1').value).catch(() => ({ ok: false, error: tr('서버에 연결하지 못했어요') }));
      if (j.ok) { closeModal(); AIO.data.reconnect(); }
      else $('authErr').textContent = j.status === 429 ? tr('잠시 잠겼어요. {0}초 뒤에 다시 해주세요', j.retryAfter || 30) : tr(j.error || '로그인 실패');
    });
  }

  /** 데모(서버 연결 실패)일 때: 서버 주소를 직접 넣어 연결 */
  function serverModal() {
    const cur = AIO.auth.custom() || '';
    modal(`<h2>🔌 ${tr('AI OFFICE 서버 연결')}</h2><p class="muted">${tr('서버에 연결하지 못해 데모 화면을 보여주고 있어요. 이 페이지를 연 주소가 서버가 아니라면, 서버 주소(터널 · 공유 주소 등)를 넣어 주세요. 비워 두면 자동으로 찾아요.')}</p>`
      + `<input class="mg-in wide" id="srvUrl" style="width:100%;margin:8px 0" placeholder="https://… 또는 http://IP:17777" value="${esc(cur)}">`
      + `<div style="display:flex;gap:6px"><button class="btn" id="srvGo">${tr('연결')}</button><button class="btn ghost" id="srvAuto">${tr('자동으로')}</button></div>`
      + `<p class="muted" style="font-size:12px;margin-top:10px">${tr('지금 페이지 주소')}: ${esc(location.origin)} · ${tr('찾은 서버')}: ${esc(AIO.auth.base() || location.origin)}</p>`, 'small');
    modalKind = 'server';
    $('srvGo').onclick = () => AIO.auth.setServer($('srvUrl').value);
    $('srvAuto').onclick = () => AIO.auth.setServer('');
  }
  function accountModal() {
    modal(`<div class="auth"><div class="big">👤</div><h2>${tr('관리자 로그인됨')}</h2><p>${tr('상세 정보가 보이는 상태예요. 화면 공유 전에는 로그아웃하세요.')}</p>
      <button class="btn" data-act="logout">${tr('로그아웃')}</button></div>`, 'small');
    modalKind = 'account';
  }

  let shownAuthed = null;
  function syncAuth() {
    const A = AIO.auth.state;
    const b = $('btnAuth');
    // 데모(서버에 연결 안 됨)여도 버튼은 남긴다 → 누르면 서버 주소 연결
    const demo = AIO.data.isDemo();
    b.hidden = false;
    b.innerHTML = demo ? `🔌<span class="lbl">${tr('서버 연결')}</span>` : A.authed ? `👤<span class="lbl">${esc(A.admin ? tr('관리자') : tr(A.tierName || '로그인됨'))}</span>` : `🔒<span class="lbl">${tr('로그인')}</span>`;
    b.title = demo ? tr('서버에 연결되지 않아 데모를 보여주는 중 — 눌러서 서버 주소 연결') : A.authed ? tr('로그인됨') : tr('로그인');
    b.classList.toggle('on', A.authed);
    $('btnInsights').hidden = !A.authed;
    world.authed = A.authed;
    // 관리 도구 독 (로그인했을 때만) · 계정 옵션 불러오기
    $('dock').hidden = !A.admin;
    $('dock').innerHTML = A.admin ? [['sessions', '👥', '세션 관리'], ['kanban', '🗂️', '칸반'], ['mgm', '🏛️', '행정'], ['archive', '📦', '보관함'], ['building', '🏢', '빌딩 관리'], ['users', '🪪', '계정'], ['admin', '🔌', '연동']].map(([k, ic, l]) => `<button class="dock-btn" data-admin="${k}" title="${tr(l)}">${ic}<span class="lbl">${tr(l)}</span></button>`).join('') : '';
    if (A.authed && shownAuthed !== true && AIO.prefs) AIO.prefs.pull();
    // only rebuild an open panel when the login state actually flipped
    if (shownAuthed !== A.authed) { shownAuthed = A.authed; if (drawerId) renderDrawer(true); }
  }

  // ------------------------------------------------------------ init
  function init(w, o) {
    world = w; opts = o;
    if (AIO.manage) AIO.manage.init(w, () => state);
    document.addEventListener('click', (ev) => {
      const d = ev.target.closest('[data-dismiss]');
      if (d) { ev.preventDefault(); ev.stopPropagation(); const s = state.sessions.find((x) => x.id === d.dataset.dismiss); if (s) AIO.manage.dismiss(s).catch((e) => alert(e.message)); return; }
      const m = ev.target.closest('[data-more]');
      if (m) { ev.preventDefault(); ev.stopPropagation(); if (!authed()) { loginModal(); return; } if (!AIO.auth.state.admin) return; AIO.manage.open('sessions'); const f = { urgent: 'urgent', busy: 'busy', all: 'all' }[m.dataset.more]; setTimeout(() => { const b = document.querySelector(`#mgr [data-mf="${f}"]`); if (b) b.click(); }, 0); return; }
      const ad = ev.target.closest('[data-admin]');
      if (ad) { ev.preventDefault(); $('themePop').hidden = true; AIO.manage.open(ad.dataset.admin); }
    }, true);
    if ($('sideQ')) $('sideQ').addEventListener('input', () => render(state));
    $('btnAcct').addEventListener('click', (ev) => { ev.stopPropagation(); AIO.prefs.open(); });
    // 모바일 하단 탭바
    $('tabbar').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-tab]'); if (!b) return;
      ev.stopPropagation();
      const t = b.dataset.tab;
      if (t !== 'side' && !$('side').classList.contains('hidden')) toggleSide(false);
      if (t === 'map') $('btnMap').click();
      else if (t === 'side') toggleSide();
      else if (t === 'manage') { if (!authed()) loginModal(); else if (!AIO.auth.state.admin) alert(tr('관리 도구는 관리자만 쓸 수 있어요')); else AIO.manage.open('sessions'); }
      else if (t === 'settings') $('btnTheme').click();
      else if (t === 'acct') AIO.prefs.open();
    });
    const clickOpen = (ev) => {
      const act = ev.target.closest('[data-act]');
      if (act) {
        ev.preventDefault();
        const a = act.dataset.act;
        if (a === 'login') loginModal();
        else if (a === 'mclose') closeModal();
        else if (a === 'logout') { AIO.auth.logout().then(() => { closeModal(); AIO.data.reconnect(); }); }
        return;
      }
      const el = ev.target.closest('[data-id],[data-open]');
      if (!el) return;
      const id = el.dataset.open || el.dataset.id;
      if (!id) return;
      ev.preventDefault();
      closeModal();
      open(id); opts.onFocus(id);
    };
    for (const id of ['side', 'ticker', 'drawerBody', 'modalCard']) $(id).addEventListener('click', clickOpen);
    $('drawerBody').addEventListener('click', (ev) => AIO.detail.onClick(ev));
    $('modal').addEventListener('click', (ev) => { if (ev.target === $('modal')) closeModal(); });
    $('filters').addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; ev.stopPropagation(); filter = b.dataset.filter; render(state); });
    $('chips').addEventListener('click', (ev) => {
      const c = ev.target.closest('.chip'); if (!c) return;
      const k = c.dataset.chip, ss = state.sessions;
      const pickS = { busy: ss.find((s) => AIO.isBusy(s.status)), urgent: ss.find((s) => AIO.isUrgent(s.status)), done: ss.find((s) => s.status === 'done'), rest: ss.find((s) => s.status === 'idle' || s.status === 'sleeping'), harness: ss.find((s) => s.kind === 'harness'), agents: ss.find((s) => (s.agents || []).some((a) => a.status === 'working')) }[k];
      if (k === 'harness') { filter = 'harness'; render(state); }
      if (pickS) { open('S:' + pickS.id); opts.onFocus('S:' + pickS.id); }
    });
    $('drawerClose').addEventListener('click', close);
    $('tickerTrack').addEventListener('animationiteration', () => { if (tickerPending) { $('tickerTrack').innerHTML = tickerPending; tickerShown = tickerPending; tickerPending = null; tickerSpeed(); } });
    $('btnFit').addEventListener('click', opts.onFit);
    $('demoClose').addEventListener('click', () => { $('demoBanner').hidden = true; });
    const togglePop = () => { $('themePop').hidden = !$('themePop').hidden; renderThemes(); $('btnTheme').classList.toggle('on', !$('themePop').hidden); };
    $('btnTheme').addEventListener('click', (ev) => { ev.stopPropagation(); togglePop(); });
    $('optList').addEventListener('change', (ev) => {
      const ks = ev.target.dataset.optsel;
      if (ks) { world.opts[ks] = ev.target.value; try { localStorage.setItem('aio.opts', JSON.stringify(world.opts)); } catch {} world.caches.clear(); return; }
      const k = ev.target.dataset.opt; if (!k) return;
      if (k === 'notify') setNotify(ev.target.checked);
      else if (k === 'side') toggleSide(ev.target.checked);
      else { world.opts[k] = ev.target.checked; try { localStorage.setItem('aio.opts', JSON.stringify(world.opts)); } catch {} }
    });
    const toggleMap = (force) => {
      const open = force ?? $('mapPop').hidden;
      $('mapPop').hidden = !open; $('btnMap').classList.toggle('on', open);
      if (open) { $('themePop').hidden = true; $('btnTheme').classList.remove('on'); renderMaps(); }
    };
    $('btnMap').addEventListener('click', (ev) => { ev.stopPropagation(); toggleMap(); });
    $('mapClose').addEventListener('click', () => toggleMap(false));
    $('popMapOpen').addEventListener('click', (ev) => { ev.stopPropagation(); toggleMap(true); });
    $('mapPop').addEventListener('click', (ev) => {
      const p = ev.target.closest('[data-pick]');
      if (p) { const [i, o] = p.dataset.pick.split('|'); AIO.maps.pick(i, o); renderMaps(); return; }
      const c = ev.target.closest('[data-part]');
      if (c) { AIO.maps.select(c.dataset.part, c.dataset.id); renderMaps(); }
    });
    document.addEventListener('click', (ev) => { if (!$('mapPop').hidden && !ev.target.closest('#mapPop,#btnMap')) toggleMap(false); });
    renderMaps();
    $('popClose').addEventListener('click', () => { $('themePop').hidden = true; $('btnTheme').classList.remove('on'); });
    document.addEventListener('click', (ev) => { if (!$('themePop').hidden && !ev.target.closest('#themePop,#btnTheme')) { $('themePop').hidden = true; $('btnTheme').classList.remove('on'); } });
    $('btnAuth').addEventListener('click', () => (AIO.data.isDemo() ? serverModal() : AIO.auth.state.authed ? accountModal() : loginModal()));
    const openDash = () => { modal('<div id="dash"></div>', 'wide'); modalKind = 'dash'; AIO.detail.dashboard($('dash')); };
    $('btnInsights').addEventListener('click', openDash);
    $('btnSide').addEventListener('click', (ev) => { ev.stopPropagation(); toggleSide(); });
    $('sideClose').addEventListener('click', (ev) => { ev.stopPropagation(); toggleSide(false); });
    try {
      notify = localStorage.getItem('aio.notify') === '1';
      Object.assign(world.opts, JSON.parse(localStorage.getItem('aio.opts') || '{}'));
      if (localStorage.getItem('aio.side') === '0') $('side').classList.add('hidden');
    } catch {}
    // phones: the session panel is a bottom sheet, closed until asked for
    const mq = matchMedia('(max-width: 760px)');
    const syncSideForWidth = () => {
      let keep = true;
      try { keep = localStorage.getItem('aio.side') !== '0'; } catch {}
      $('side').classList.toggle('hidden', mq.matches ? true : !keep);
      $('btnSide').classList.toggle('on', !$('side').classList.contains('hidden'));
    };
    syncSideForWidth();
    if (mq.addEventListener) mq.addEventListener('change', () => { syncSideForWidth(); opts.onSide && opts.onSide(); });
    // language switch: repaint everything that was rendered from JS with the last known state
    window.addEventListener('aio:lang', () => {
      $('tickerTrack').dataset.html = '';
      if (state) render(state);
      renderThemes();
      paintMode();
      syncAuth();
      if (drawerId) { if (drawerMode === 'detail') AIO.detail.render(); else renderDrawer(); }
      if (!$('modal').hidden) {
        if (modalKind === 'dash') openDash();
        else if (modalKind === 'account') accountModal();
        else if (modalKind === 'login' && !($('uid')?.value || $('pw1')?.value)) loginModal(); // never wipe what was typed
      }
    });
    renderThemes();
    AIO.auth.on(syncAuth);
    AIO.auth.refresh();
    const tick = () => { const d = new Date(); $('clock').textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    tick(); setInterval(tick, 1000);
    window.addEventListener('keydown', (ev) => {
      if (ev.target.closest('input,textarea')) return;
      const k = ev.key.toLowerCase();
      if (k === 'l') toggle('labels'); else if (k === 'b') toggle('bubbles'); else if (k === 'd') toggle('lines');
      else if (k === 's') toggleSide(); else if (k === 'f') opts.onFit();
      else if (k === 't' || k === ',') togglePop();
      else if (k === 'm') $('btnMap').click();
      else if (k === 'o') AIO.prefs.open();
      else if (k === 'i' && authed()) $('btnInsights').click();
      else if (k === 'escape') { if (!$('modal').hidden) closeModal(); else if (!$('themePop').hidden) $('popClose').click(); else if (!$('mapPop').hidden) $('mapClose').click(); else close(); }
    });
  }

  function toggle(k) { world.opts[k] = !world.opts[k]; try { localStorage.setItem('aio.opts', JSON.stringify(world.opts)); } catch {} if (!$('themePop').hidden) renderThemes(); }

  let modeNow = null, hostNow = '', hostSet = false;
  function paintMode() {
    if (!modeNow) return;
    const b = $('modeBadge');
    b.className = 'badge ' + (modeNow === 'live' ? 'live' : modeNow === 'demo' ? 'demo' : '');
    b.textContent = modeNow === 'live' ? 'LIVE' : modeNow === 'demo' ? 'DEMO' : tr('재연결 중…');
    if (hostSet) $('hostLabel').textContent = hostNow === null ? tr('데모 캠퍼스') : hostNow ? tr('{0} · AI 세션 캠퍼스', hostNow) : tr('AI 세션 캠퍼스');
  }
  function setMode(mode, info) {
    modeNow = mode;
    if (mode === 'live') { hostNow = info || ''; hostSet = true; }
    if (mode === 'demo') { hostNow = null; hostSet = true; if (info !== 'forced') $('demoBanner').hidden = false; }
    paintMode();
    syncAuth();
  }

  function tooltip(id, x, y) {
    const tt = $('tooltip');
    if (!id) { tt.hidden = true; return; }
    if (id.startsWith('B:')) {
      const b = world.S.buildings.find((v) => v.id === id.slice(2));
      if (!b) { tt.hidden = true; return; }
      const fi = world.floorInfo(b);
      tt.innerHTML = `<b>${esc(tr(b.name))}</b><br>${b.levels.length > 1 ? tr('{0}층 + 옥상 · ', b.levels.length - 1) : ''}${tr('👥 {0}명', fi.reduce((n, v) => n + v.people, 0))}<br><span style="opacity:.7">${tr('클릭하면 안으로 들어가요')}</span>`;
      tt.hidden = false; tt.style.left = (x + 14) + 'px'; tt.style.top = (y + 14) + 'px'; return;
    }
    const e = world.ents.get(id);
    const sid = id.startsWith('S:') ? id.slice(2) : e?.sid;
    const s = state.sessions.find((v) => v.id === sid);
    if (!s) { tt.hidden = true; return; }
    let html;
    if (e && (e.kind === 'member' || e.kind === 'intern')) html = `<b>${esc(e.kind === 'intern' && !authed() ? tr('인턴') : e.name)}</b><br>${e.agent ? esc(act(e.agent.activity)) + (authed() ? '<br><span style="opacity:.75">' + esc(e.agent.description || '') + '</span>' : '') : tr('대기 중')}`;
    else html = `<b>${esc(code(s.id))} ${esc(nameOf(s))}</b><br>${PLACE_ICON[s.place] || ''}${AIO.status(s.status).label} · ${esc(act(s.activity))}${authed() && s.activity?.detail ? '<br><span style="opacity:.75">' + esc(AIO.trunc(s.activity.detail, 90)) + '</span>' : ''}`;
    tt.innerHTML = html + (authed() ? '' : `<br><span style="opacity:.6">${tr('🔒 로그인하면 자세히')}</span>`);
    tt.hidden = false;
    tt.style.left = Math.min(x + 14, innerWidth - 310) + 'px';
    tt.style.top = (y + 14) + 'px';
  }

  AIO.ui = { init, render, setMode, open, close, tooltip, renderThemes, code, modal, closeModal, world: () => world, toggleSide };
})();
