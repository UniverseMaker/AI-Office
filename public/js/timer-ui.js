// 업무 타이머 (v6 새 UI) — AI OFFICE 모양으로 처음부터 다시 만든 뽀모도로.
// FlowBoard 에서는 기능 구조만 가져왔다: 집중 · 짧은 휴식 · 긴 휴식 자동 순환, 시작 · 일시정지 · 건너뛰기 · 초기화, 딴짓 기록,
// 태그 · 메모, 날짜별 기록, 통계 · 히트맵, 칸반 카드 연결(집중이 끝나면 카드에 작업 시간 기록), 소리 · 알림 · 탭 제목.
// 저장은 그대로 store(store-shim.js: 이 브라우저 + 로그인 계정 /api/timer) — 예전 기록 형식과 같다.
// 진행 상태는 예전과 같은 'fb_pomo_live' 키에 둔다(진행 중이던 타이머가 그대로 이어진다).
(function () {
  'use strict';
  const store = window.store;
  if (!store) return;
  const AIO = (window.AIO = window.AIO || {});
  const esc = AIO.esc || ((s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

  const LS_LIVE = 'fb_pomo_live';
  const LS_UI = 'aio.timer.ui';
  const PH = {
    work: { key: 'work', label: '집중', emoji: '🍅', kind: 'focus', minKey: 'workMin', def: 25 },
    short: { key: 'short', label: '짧은 휴식', emoji: '☕', kind: 'break', minKey: 'shortMin', def: 5 },
    long: { key: 'long', label: '긴 휴식', emoji: '🌿', kind: 'break', minKey: 'longMin', def: 15 },
  };
  const PH_KEYS = ['work', 'short', 'long'];
  const SOUNDS = [['beep', '삐삐 (기본)'], ['chime', '차임벨'], ['bell', '맑은 종'], ['ding', '딩동'], ['alarm', '경보음']];
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const R = 104, C = 2 * Math.PI * R;   // 큰 원형 링
  const MR = 9, MC = 2 * Math.PI * MR;  // 상단바 작은 링

  // ------------------------------------------------------------------ 작은 도구
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ymd(new Date());
  const parseDay = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const shiftDay = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return ymd(d); };
  const mondayOf = (s) => shiftDay(s, -((parseDay(s).getDay() + 6) % 7));
  // 기록의 날짜는 시작 시각의 '이 컴퓨터 날짜'로 본다 (예전 기록의 date 는 UTC 기준이라 새벽 기록이 전날로 들어가 있었다)
  const dayOf = (s) => { if (s.startedAt) { const d = new Date(s.startedAt); if (!isNaN(d)) return ymd(d); } return s.date || ''; };
  const isFocus = (s) => (s.kind ? s.kind === 'focus' : s.type === 'work');
  const mmss = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return pad(Math.floor(t / 60)) + ':' + pad(t % 60); };
  const hhmm = (v) => { const d = new Date(v); return isNaN(d) ? '' : pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const fmtMin = (m) => (m < 60 ? `${m}분` : `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}`);
  const dateLabel = (s) => { const d = parseDay(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; };
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'mg-toast tm-toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
  }
  const S = () => store.pomodoroSettings();
  const phaseOf = (k) => PH[k] || PH.work;
  const minOf = (k) => { const p = phaseOf(k); return Math.max(1, Math.round(+S()[p.minKey] || p.def)); };
  const uiPrefs = (() => { try { return JSON.parse(localStorage.getItem(LS_UI) || '{}') || {}; } catch (e) { return {}; } })();
  const saveUi = () => { try { localStorage.setItem(LS_UI, JSON.stringify(uiPrefs)); } catch (e) {} };

  // ------------------------------------------------------------------ 진행 상태 (예전 형식 그대로)
  function defLive() {
    return { phase: 'work', stageIndex: 0, running: false, endsAt: 0, pausedRemainingMs: 0, cycleCount: 0, issueId: null, issueTitle: '', projectId: null,
      startedAtISO: null, accumSec: 0, lastStartMs: 0, interruptions: 0, tag: '', memo: '', badges: [] };
  }
  let live = defLive();
  function readLive() {
    try { const o = JSON.parse(localStorage.getItem(LS_LIVE) || 'null'); if (o && typeof o === 'object') return normLive(Object.assign(defLive(), o)); } catch (e) {}
    return null;
  }
  function normLive(o) {
    if (typeof o.memo !== 'string') o.memo = '';
    if (typeof o.tag !== 'string') o.tag = '';
    if (!Array.isArray(o.badges)) o.badges = [];
    if (!PH[o.phase]) { o.phase = 'work'; o.running = false; o.startedAtISO = null; o.pausedRemainingMs = 0; } // 예전 커스텀 페이즈 → 집중
    return o;
  }
  const persist = () => { try { localStorage.setItem(LS_LIVE, JSON.stringify(live)); } catch (e) {} };
  const durMs = () => minOf(live.phase) * 60000;
  function remainingMs() {
    if (live.running) return Math.max(0, live.endsAt - Date.now());
    if (live.startedAtISO) return Math.max(0, live.pausedRemainingMs || 0);
    return durMs();
  }
  function actualSec() { let s = live.accumSec || 0; if (live.running) s += (Date.now() - live.lastStartMs) / 1000; return s; }
  function finalizeActual() { if (live.running) { live.accumSec = (live.accumSec || 0) + (Date.now() - live.lastStartMs) / 1000; live.lastStartMs = Date.now(); } }
  function prepare(run) {
    live.accumSec = 0; live.interruptions = 0;
    const d = durMs();
    live.pausedRemainingMs = d;
    if (run) { live.startedAtISO = new Date().toISOString(); live.endsAt = Date.now() + d; live.lastStartMs = Date.now(); live.running = true; }
    else { live.startedAtISO = null; live.endsAt = 0; live.lastStartMs = 0; live.running = false; }
  }
  function resumeInternal() { live.endsAt = Date.now() + (live.pausedRemainingMs || 0); live.lastStartMs = Date.now(); live.running = true; }

  // ------------------------------------------------------------------ 기록
  function recordSession(completed) {
    const ph = phaseOf(live.phase), sec = Math.round(actualSec()), focus = ph.kind === 'focus';
    const startedAt = live.startedAtISO || new Date(Date.now() - sec * 1000).toISOString();
    const tag = focus ? (live.tag || '').trim() : '';
    try {
      const s = store.addPomodoroSession({
        type: ph.key, kind: ph.kind, typeLabel: ph.label, badges: (live.badges || []).slice(),
        startedAt, endedAt: new Date().toISOString(), plannedMin: minOf(ph.key), actualSec: sec, completed: !!completed,
        issueId: focus && live.issueId != null ? live.issueId : null, projectId: live.projectId || store.activeProjectId(),
        date: ymd(new Date(startedAt)), interruptions: live.interruptions || 0, tag, note: focus ? (live.memo || '').trim() : '',
      });
      if (tag) { const tags = (S().tags || []).filter((t) => t !== tag); tags.unshift(tag); store.savePomodoroSettings({ tags: tags.slice(0, 12) }); }
      return s;
    } catch (e) { return null; }
  }

  // ------------------------------------------------------------------ 소리 · 알림 · 탭 제목
  let actx = null;
  function unlockAudio() {
    try { if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); } if (actx && actx.state === 'suspended') actx.resume(); } catch (e) {}
  }
  const vol = () => { const v = +S().volume; return Math.max(0, Math.min(1, (isNaN(v) ? 70 : v) / 100)); };
  function beepTone() {
    try {
      if (!actx) return;
      const t = actx.currentTime, peak = Math.max(0.0002, 0.32 * vol());
      [880, 1174.7].forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain(), t0 = t + i * 0.19;
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.19);
      });
    } catch (e) {}
  }
  const audioCache = {};
  function playSound(id) {
    if (!id || id === 'beep') return beepTone();
    try {
      let a = audioCache[id];
      if (!a) { a = audioCache[id] = new Audio('sounds/' + id + '.wav'); a.preload = 'auto'; }
      a.volume = vol(); try { a.pause(); } catch (e) {}
      a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }
  const playAlarm = () => { if (S().sound) playSound(S().alarmSound || 'beep'); };
  function askNotify() { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) {} }
  function desktop(title, body) {
    try { if (S().notify && 'Notification' in window && Notification.permission === 'granted') new Notification(title, { body, silent: true }); } catch (e) {}
  }
  let origTitle = null, flashUntil = 0;
  function updateTitle() {
    try {
      if (Date.now() < flashUntil) return;
      if (S().tabTitle && live.running) {
        if (origTitle == null) origTitle = document.title;
        const p = phaseOf(live.phase);
        document.title = `${mmss(remainingMs())} ${p.emoji} ${p.label}`;
      } else if (origTitle != null) { document.title = origTitle; origTitle = null; }
    } catch (e) {}
  }
  function flashTitle(text) {
    if (!S().tabTitle) return;
    if (origTitle == null) origTitle = document.title;
    flashUntil = Date.now() + 2500; document.title = text;
    setTimeout(() => { flashUntil = 0; updateTitle(); }, 2600);
  }
  function announce(done, next) {
    const d = phaseOf(done), n = phaseOf(next);
    const title = d.kind === 'focus' ? '🍅 집중 끝! 수고했어요' : `${d.emoji} 휴식 끝! 다시 집중해 볼까요`;
    const body = d.kind === 'focus' ? `이제 ${n.emoji} ${n.label} ${minOf(n.key)}분이에요` : `🍅 집중 ${minOf('work')}분을 시작해요`;
    playAlarm(); desktop(title, body); flashTitle(d.kind === 'focus' ? '✅ 집중 끝!' : '⏰ 휴식 끝!'); toast(`${title} · ${body}`);
  }

  // ------------------------------------------------------------------ 엔진 (흐름)
  const subs = [];
  function notify() {
    updateTitle(); paintMini(); dyn();
    const snap = snapshot(); subs.slice().forEach((fn) => { try { fn(snap); } catch (e) {} });
  }
  function changed() { persist(); notify(); rerender(); }
  function snapshot() {
    const p = phaseOf(live.phase), rem = remainingMs(), dur = durMs() || 1;
    return { phase: p.key, label: p.label, emoji: p.emoji, isWork: p.kind === 'focus', running: live.running, hasSession: !!live.startedAtISO,
      remainingMs: rem, remainingSec: Math.ceil(rem / 1000), plannedMin: minOf(p.key), frac: Math.max(0, Math.min(1, 1 - rem / dur)),
      cycleCount: live.cycleCount || 0, cyclesPerLong: +S().cyclesPerLong || 4, issueId: live.issueId, interruptions: live.interruptions || 0 };
  }
  function completePhase() {
    // 새 창 타이머가 같은 세션을 이미 끝냈으면 그 상태를 따른다 (같은 기록이 두 번 남지 않게)
    const other = readLive();
    if (other && (other.startedAtISO !== live.startedAtISO || !other.running)) { live = other; notify(); rerender(); return; }
    const done = live.phase, ph = phaseOf(done);
    finalizeActual();
    const sess = recordSession(true);
    live.interruptions = 0;
    if (ph.kind === 'focus') {
      live.tag = '';
      // 카드가 연결돼 있으면 카드 작업 시간 + 댓글로 한 번만 남긴다 (칸반이 없는 새 창에선 미뤄 둔다)
      if (sess && (sess.issueId == null || AIO.kanban)) { try { store.logWorkForSession(sess.id, live.memo || ''); } catch (e) {} }
    }
    let next, auto;
    if (done === 'work') {
      live.cycleCount = (live.cycleCount || 0) + 1;
      next = live.cycleCount % (+S().cyclesPerLong || 4) === 0 ? 'long' : 'short';
      auto = !!S().autoStartBreak;
    } else { next = 'work'; auto = !!S().autoStartWork; }
    live.phase = next; prepare(auto);
    announce(done, next);
    changed();
  }
  function start() {
    unlockAudio();
    if (S().notify) askNotify();
    if (live.running) return;
    if (live.startedAtISO) resumeInternal(); else prepare(true);
    changed();
  }
  function pause() {
    if (!live.running) return;
    finalizeActual(); live.pausedRemainingMs = Math.max(0, live.endsAt - Date.now()); live.running = false;
    changed();
  }
  const toggleRun = () => (live.running ? pause() : start());
  function skip() {
    unlockAudio(); finalizeActual();
    if (live.startedAtISO && actualSec() >= 1) recordSession(false);
    if (live.phase === 'work') live.tag = '';
    live.phase = live.phase === 'work' ? 'short' : 'work';
    prepare(false); changed();
  }
  function reset() { live.phase = 'work'; live.cycleCount = 0; live.tag = ''; prepare(false); changed(); }
  function setPhase(k) {
    if (!PH[k] || (k === live.phase && !live.startedAtISO)) return;
    if (live.startedAtISO && actualSec() >= 60 && !window.confirm('진행 중인 세션은 기록하지 않고 바꿀까요?')) return;
    live.phase = k; prepare(false); changed();
  }
  function distract() { if (!live.running) return; live.interruptions = (live.interruptions || 0) + 1; changed(); }
  function setMinutes(v) {
    if (live.startedAtISO) return;
    v = Math.max(1, Math.min(180, Math.round(+v) || 1));
    store.savePomodoroSettings({ [phaseOf(live.phase).minKey]: v });
    prepare(false); changed();
  }
  function link(key, title) {
    if (key == null || key === '') { live.issueId = null; live.issueTitle = ''; }
    else {
      const c = AIO.kanban && AIO.kanban.card ? AIO.kanban.card(key) : null;
      live.issueId = String(key); live.issueTitle = title || (c && c.title) || ''; live.projectId = store.activeProjectId();
    }
    changed();
  }
  function startForIssue(key) {
    unlockAudio(); if (S().notify) askNotify();
    const c = AIO.kanban && AIO.kanban.card ? AIO.kanban.card(key) : null;
    live.issueId = String(key); live.issueTitle = (c && c.title) || live.issueTitle || ''; live.projectId = store.activeProjectId();
    if (!live.running || live.phase !== 'work') { live.phase = 'work'; prepare(true); }
    changed();
  }

  let tickT = null, inited = false;
  function tick() { if (!live.running) return; if (remainingMs() <= 0) completePhase(); else notify(); }
  function init() {
    if (inited) return; inited = true;
    live = readLive() || defLive();
    if (live.running && remainingMs() <= 0) { try { completePhase(); } catch (e) {} }
    tickT = setInterval(tick, 250);
    // 다른 창(새 창 타이머 · 다른 탭)에서 바꾼 상태를 따라간다
    window.addEventListener('storage', (e) => { if (e.key === LS_LIVE) { const o = readLive(); if (o) { live = o; notify(); rerender(); } } });
    notify();
  }

  // ------------------------------------------------------------------ 통계
  function stats() {
    const all = store.pomodoroSessions(), byDay = {};
    all.forEach((s) => {
      if (!isFocus(s)) return;
      const d = dayOf(s); if (!d) return;
      const r = byDay[d] || (byDay[d] = { min: 0, done: 0, n: 0 });
      r.min += (+s.actualSec || 0) / 60; r.n += 1; if (s.completed) r.done += 1;
    });
    const t = today(), goal = +S().dailyGoal || 0, mon = mondayOf(t);
    const week = []; for (let i = 0; i < 7; i++) { const d = shiftDay(mon, i); const r = byDay[d] || { min: 0, done: 0 }; week.push({ d, min: Math.round(r.min), done: r.done, today: d === t, future: d > t }); }
    const met = (d) => { const r = byDay[d]; return !!(r && (goal > 0 ? r.done >= goal : r.min >= 1)); };
    let streak = 0; for (let k = met(t) ? 0 : 1; k < 1000; k++) { if (met(shiftDay(t, -k))) streak++; else break; }
    const tr = byDay[t] || { min: 0, done: 0 };
    return { byDay, goal, week, streak, todayMin: Math.round(tr.min), todayDone: tr.done,
      weekMin: week.reduce((a, w) => a + w.min, 0), weekDone: week.reduce((a, w) => a + w.done, 0), mon, t };
  }
  const heatLv = (m) => (m <= 0 ? 0 : m < 25 ? 1 : m < 60 ? 2 : m < 120 ? 3 : 4);

  // ------------------------------------------------------------------ 화면: 상단바 미니 타이머
  let mini = null, miniEls = null;
  function mountMini(el) {
    if (!el) return;
    mini = el; el.classList.add('tm-mini'); el.removeAttribute('title');
    el.innerHTML = `<button type="button" class="tm-pill" data-mini="open" title="업무 타이머 열기 (집중 시간)" aria-label="업무 타이머 열기">
      <span class="tm-pill-ring"><svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true"><circle class="tk" cx="11" cy="11" r="${MR}" fill="none" stroke="#d9cfc0" stroke-width="2.6"/><circle class="br" cx="11" cy="11" r="${MR}" fill="none" stroke="#ee6a4c" stroke-width="2.6" stroke-linecap="round" transform="rotate(-90 11 11)" stroke-dasharray="${MC.toFixed(2)} ${MC.toFixed(2)}"/></svg><i></i></span>
      <span class="tm-pill-time"></span></button><button type="button" class="tm-pill-go" data-mini="go" aria-label="시작"></button>`;
    miniEls = { pill: el.querySelector('.tm-pill'), ic: el.querySelector('.tm-pill-ring i'), br: el.querySelector('.tm-pill-ring .br'), time: el.querySelector('.tm-pill-time'), go: el.querySelector('.tm-pill-go'), k: '' };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-mini]'); if (!b) return;
      if (b.dataset.mini === 'go') toggleRun();
      else if (AIO.timer && AIO.timer.open) AIO.timer.open();
    });
    paintMini();
  }
  function paintMini() {
    if (!miniEls) return;
    const p = phaseOf(live.phase), rem = remainingMs(), f = Math.max(0, Math.min(1, 1 - rem / (durMs() || 1)));
    const st = live.running ? 'run' : live.startedAtISO ? 'pause' : 'idle';
    const k = p.key + st;
    if (miniEls.k !== k) {
      miniEls.k = k;
      mini.className = `tm-mini is-${p.key} is-${st}`;
      miniEls.ic.textContent = p.emoji;
      miniEls.go.textContent = live.running ? '❚❚' : '▶';
      const lbl = live.running ? '일시정지' : live.startedAtISO ? '이어하기' : `${p.label} 시작`;
      miniEls.go.title = lbl; miniEls.go.setAttribute('aria-label', lbl);
    }
    const tx = mmss(rem); if (miniEls.time.textContent !== tx) miniEls.time.textContent = tx;
    miniEls.br.setAttribute('stroke-dashoffset', (MC * f).toFixed(2));
    miniEls.pill.title = `업무 타이머 — ${p.label} ${live.running ? '진행 중' : live.startedAtISO ? '일시정지' : '준비'} · ${tx} 남음`;
  }

  // ------------------------------------------------------------------ 화면: 전체 패널
  let panel = null, pageMode = false, rendering = false, dynEls = null;
  const ui = { date: today(), q: '', results: null, searching: false, searchErr: '', edit: null };

  function cardInfo() {
    if (live.issueId == null) return null;
    const c = AIO.kanban && AIO.kanban.card ? AIO.kanban.card(live.issueId) : null;
    return { key: String(live.issueId), title: (c && c.title) || live.issueTitle || '', status: c && c.status && c.status.name };
  }
  function worldSessions() {
    try { const w = AIO.ui && AIO.ui.world && AIO.ui.world(); return { w, list: (w && w.sessions) || [] }; } catch (e) { return { w: null, list: [] }; }
  }
  function aiHtml(card) {
    const { w, list } = worldSessions();
    if (!w) return '';
    const linked = card ? list.filter((s) => s.meta && s.meta.task && s.meta.task.key === card.key) : [];
    const busy = AIO.isBusy ? list.filter((s) => s.kind !== 'app' && AIO.isBusy(s.status)) : [];
    const show = linked.length ? linked : busy.slice(0, 4);
    const head = linked.length ? `🤖 이 카드를 맡은 AI <b>${linked.length}</b>` : `🧶 지금 사무실에서 일하는 AI <b>${busy.length}</b>`;
    const rows = show.map((s) => {
      const pv = AIO.provider ? AIO.provider(s.provider) : { accent: '#8b7d6b', short: 'A' };
      const st = AIO.status ? AIO.status(s.status) : { label: '', color: '#b8a58c' };
      const code = (AIO.ui && AIO.ui.code && AIO.ui.code(s.id)) || pv.short;
      const nm = w.nameOf ? w.nameOf(s) : s.title || '';
      return `<button type="button" class="tm-ai-it" data-act="session" data-sid="${esc(s.id)}" title="${esc(nm)} — 자세히 보기"><span class="av" style="background:${esc(pv.accent)}">${esc(code)}</span><span class="nm">${esc(nm)}</span><span class="st" style="background:${esc(st.color)}">${esc(st.label)}</span></button>`;
    }).join('');
    const empty = card ? '<div class="tm-empty">이 카드에 연결된 AI 세션은 아직 없어요. 관리 › 칸반에서 세션을 연결할 수 있어요.</div>' : '<div class="tm-empty">지금은 모두 쉬는 중이에요 ☕</div>';
    return `<div class="tm-ai"><div class="tm-lbl">${head}</div>${rows ? `<div class="tm-ai-list">${rows}</div>` : empty}</div>`;
  }

  function headHtml(st) {
    const goal = st.goal ? ` / ${st.goal}` : '';
    const btns = pageMode
      ? '<a class="tm-hbtn" href="./" title="AI OFFICE 사무실로 돌아가기">🏢 <span>사무실로</span></a>'
      : '<a class="tm-hbtn" href="timer.html" target="_blank" rel="noopener" title="타이머만 새 창으로 열기 (기록은 같이 저장돼요)">🗗 <span>새 창</span></a><button type="button" class="mg-x tm-x" data-act="close" aria-label="닫기" title="닫기 (Esc)">✕</button>';
    return `<header class="tm-head"><span class="tm-logo">⏱️</span><div class="tm-htx"><h2>업무 타이머</h2><small>오늘 🍅 <b>${st.todayDone}${goal}</b> · 집중 <b>${fmtMin(st.todayMin)}</b>${st.streak ? ` · 🔥 ${st.streak}일 연속` : ''}</small></div><div class="tm-hbtns">${btns}</div></header>`;
  }

  function timerHtml() {
    const p = phaseOf(live.phase), s = S(), cur = minOf(p.key), lock = !!live.startedAtISO;
    const seg = PH_KEYS.map((k) => `<button type="button" role="tab" aria-selected="${k === p.key}" class="${k === p.key ? 'on' : ''}" data-act="phase" data-k="${k}"><span class="l"><i>${PH[k].emoji}</i>${PH[k].label}</span><small>${minOf(k)}분</small></button>`).join('');
    const per = Math.max(1, +s.cyclesPerLong || 4), done = p.key === 'long' ? per : (live.cycleCount || 0) % per;
    const dots = Array.from({ length: per }, (_, i) => `<i class="${i < done ? 'on' : i === done && p.key === 'work' ? 'now' : ''}"></i>`).join('');
    const cyc = p.key === 'long' ? '긴 휴식으로 푹 쉬어요 🌿' : `긴 휴식까지 집중 <b>${per - done}</b>번`;
    const ticks = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 2 * Math.PI; return `<circle cx="${(120 + 93 * Math.sin(a)).toFixed(1)}" cy="${(120 - 93 * Math.cos(a)).toFixed(1)}" r="${i % 3 ? 1.6 : 2.6}"/>`; }).join('');
    const presets = (s.presets || []).slice().sort((a, b) => a - b);
    const chips = presets.map((m) => `<span class="tm-chip ${m === cur ? 'on' : ''}"><button type="button" data-act="preset" data-m="${m}" ${lock ? 'disabled' : ''}>${m}분</button><button type="button" class="x" data-act="preset-del" data-m="${m}" aria-label="${m}분 프리셋 지우기" title="프리셋 지우기">×</button></span>`).join('');
    const addChip = presets.indexOf(cur) < 0 ? `<button type="button" class="tm-chip add" data-act="preset-add" title="지금 시간(${cur}분)을 프리셋으로 저장">＋ ${cur}분 저장</button>` : '';
    const go = live.running ? '<span>❚❚</span> 일시정지' : live.startedAtISO ? '<span>▶</span> 이어하기' : '<span>▶</span> 시작';
    return `<section class="tm-box tm-timer is-${p.key} ${live.running ? 'is-run' : live.startedAtISO ? 'is-pause' : ''}">
      <div class="tm-seg" role="tablist" aria-label="단계">${seg}</div>
      <div class="tm-ring">
        <svg viewBox="0 0 240 240" width="240" height="240" aria-hidden="true">
          <circle class="tm-ring-plate" cx="120" cy="120" r="84" fill="none"/>
          <g class="tm-ring-ticks">${ticks}</g>
          <circle class="tm-ring-track" cx="120" cy="120" r="${R}" fill="none" stroke="#e2d8c9" stroke-width="14"/>
          <circle class="tm-ring-bar" cx="120" cy="120" r="${R}" fill="none" stroke="#ee6a4c" stroke-width="14" stroke-linecap="round" transform="rotate(-90 120 120)" stroke-dasharray="${C.toFixed(2)} ${C.toFixed(2)}"/>
          <circle class="tm-ring-knob" cx="120" cy="${120 - R}" r="9"/>
        </svg>
        <div class="tm-ring-in"><span class="tm-ring-emoji">${p.emoji}</span><b class="tm-time" data-dyn="time">${mmss(remainingMs())}</b><small data-dyn="sub"></small></div>
      </div>
      <div class="tm-cycle" title="집중을 ${per}번 마치면 긴 휴식"><span class="tm-dots">${dots}</span><span>${cyc}</span></div>
      <button type="button" class="tm-go" data-act="toggle">${go}</button>
      <div class="tm-acts">
        <button type="button" class="tm-sbtn" data-act="skip" title="이 단계를 건너뛰고 다음으로 (진행한 만큼은 '중단'으로 기록)">⏭ 건너뛰기</button>
        <button type="button" class="tm-sbtn" data-act="reset" title="기록하지 않고 처음(집중 1번째)으로">↺ 초기화</button>
        <button type="button" class="tm-sbtn tm-dis" data-act="distract" ${live.running && p.key === 'work' ? '' : 'disabled'} title="집중 중에 딴짓을 했다면 눌러 기록해요">🙈 딴짓 기록 <b>${live.interruptions || 0}</b></button>
      </div>
      <div class="tm-dur">
        <div class="tm-step" title="${lock ? '세션이 진행 중일 땐 시간을 바꿀 수 없어요 (초기화하거나 끝난 뒤에)' : `${p.label} 시간`}">
          <button type="button" data-act="dec" ${lock ? 'disabled' : ''} aria-label="1분 줄이기">−</button>
          <label><input type="number" min="1" max="180" value="${cur}" data-in="min" ${lock ? 'disabled' : ''} aria-label="${p.label} 시간 (분)"><span>분</span></label>
          <button type="button" data-act="inc" ${lock ? 'disabled' : ''} aria-label="1분 늘리기">＋</button>
        </div>
        <div class="tm-presets">${chips}${addChip}</div>
      </div>
    </section>`;
  }

  function resultsHtml() {
    if (ui.searching) return '<div class="tm-res-note">찾는 중…</div>';
    if (ui.searchErr) return `<div class="tm-res-note err">${esc(ui.searchErr)}</div>`;
    if (!ui.results) return '';
    if (!ui.results.length) return `<div class="tm-res-note">맞는 카드가 없어요${/^[A-Za-z][\w]*-\d+$/.test(ui.q.trim()) ? ' · Enter 로 그 번호를 바로 연결해요' : ''}</div>`;
    return ui.results.slice(0, 8).map((c) => `<button type="button" class="tm-res" data-act="pick" data-key="${esc(c.key)}" data-title="${esc(c.title || '')}"><span class="tm-key">${esc(c.key)}</span><span class="t">${esc(c.title || '')}</span>${c.status && c.status.name ? `<em>${esc(c.status.name)}</em>` : ''}</button>`).join('');
  }
  function taskHtml() {
    const card = cardInfo(), s = S();
    let link;
    if (card) {
      link = `<div class="tm-linked"><span class="tm-key">${esc(card.key)}</span><div class="t"><b>${esc(card.title || '칸반 카드')}</b><small>${card.status ? esc(card.status) + ' · ' : ''}집중을 마치면 이 카드에 작업 시간이 기록돼요</small></div>
        ${AIO.kanban ? '<button type="button" class="tm-sbtn sm" data-act="open-card" title="칸반에서 카드 열기">열기</button>' : ''}<button type="button" class="tm-sbtn sm" data-act="unlink" aria-label="연결 해제" title="연결 해제">✕</button></div>`;
    } else if (AIO.kanban && AIO.kanban.search) {
      link = `<div class="tm-pick"><input type="search" data-in="q" value="${esc(ui.q)}" placeholder="🔎 칸반 카드 찾기 — 제목 · 번호" autocomplete="off" aria-label="칸반 카드 찾기"><div class="tm-results" data-scroll="res">${resultsHtml()}</div></div>`;
    } else {
      link = '<div class="tm-empty">칸반 카드 연결은 AI OFFICE 본 화면에서 할 수 있어요.</div>';
    }
    const recent = (s.tags || []).slice(0, 6).map((t) => `<button type="button" class="tm-tag ${t === live.tag ? 'on' : ''}" data-act="tag" data-t="${esc(t)}">#${esc(t)}</button>`).join('');
    return `<section class="tm-box tm-task">
      <h3>📌 지금 할 일</h3>
      ${link}
      ${aiHtml(card)}
      <div class="tm-field"><label class="tm-lbl" for="tmTagIn">🏷️ 태그</label><input id="tmTagIn" type="text" data-in="tag" value="${esc(live.tag)}" maxlength="40" placeholder="예: 논문, 리뷰, 회의" autocomplete="off">${recent ? `<div class="tm-tags">${recent}</div>` : ''}</div>
      <div class="tm-field"><div class="tm-lbl"><label for="tmMemoIn">📝 메모</label>${live.memo ? '<button type="button" class="tm-link" data-act="memo-clear">비우기</button>' : ''}</div><textarea id="tmMemoIn" data-in="memo" rows="3" placeholder="이번 집중에서 할 일을 적어 두면 기록에 같이 남아요">${esc(live.memo)}</textarea></div>
    </section>`;
  }

  function statsHtml(st) {
    const pct = st.goal ? Math.min(1, st.todayDone / st.goal) : 0, gr = 21, gc = 2 * Math.PI * gr;
    const goalKpi = st.goal
      ? `<div class="tm-kpi goal"><svg viewBox="0 0 52 52" width="44" height="44" aria-hidden="true"><circle cx="26" cy="26" r="${gr}" class="tk" fill="none" stroke="#e2d8c9" stroke-width="6"/><circle cx="26" cy="26" r="${gr}" class="br" fill="none" stroke="#ee6a4c" stroke-width="6" stroke-linecap="round" transform="rotate(-90 26 26)" stroke-dasharray="${(gc * pct).toFixed(1)} ${gc.toFixed(1)}" ${pct ? '' : 'hidden'}/></svg><div><b>${st.todayDone}<small> / ${st.goal}</small></b><span>오늘 완료 / 목표</span></div></div>`
      : `<div class="tm-kpi"><b>${st.todayDone}<small>번</small></b><span>오늘 완료</span></div>`;
    const num = (m) => (m < 60 ? `${m}<small>분</small>` : `${Math.floor(m / 60)}<small>시간</small>${m % 60 ? ` ${m % 60}<small>분</small>` : ''}`);
    const max = Math.max(30, ...st.week.map((w) => w.min));
    const bars = st.week.map((w, i) => `<div class="tm-bar ${w.today ? 'today' : ''} ${w.future ? 'fut' : ''}" title="${dateLabel(w.d)} · ${fmtMin(w.min)} · 완료 ${w.done}번"><em>${w.min || ''}</em><div class="c"><span style="height:${Math.max(w.min ? 6 : 0, Math.round((w.min / max) * 100))}%"></span></div><i>${WD[(i + 1) % 7]}</i></div>`).join('');
    const start = shiftDay(st.mon, -7 * 11);
    let cells = '';
    for (let wk = 0; wk < 12; wk++) for (let d = 0; d < 7; d++) {
      const day = shiftDay(start, wk * 7 + d), r = st.byDay[day], m = r ? Math.round(r.min) : 0;
      cells += day > st.t ? '<i class="fut"></i>' : `<i class="l${heatLv(m)}${day === st.t ? ' today' : ''}" title="${dateLabel(day)} · ${m ? fmtMin(m) : '기록 없음'}"></i>`;
    }
    return `<section class="tm-box tm-stats">
      <div class="tm-boxh"><h3>📊 집중 통계</h3><span class="tm-streak ${st.streak ? 'on' : ''}" title="${st.goal ? `하루 목표(${st.goal}번)를 채운 날이 이어진 수` : '집중 기록이 있는 날이 이어진 수'}">🔥 <b>${st.streak}</b>일 연속 ${st.goal ? '목표 달성' : '집중'}</span></div>
      <div class="tm-kpis">
        <div class="tm-kpi"><b>${num(st.todayMin)}</b><span>오늘 집중</span></div>
        ${goalKpi}
        <div class="tm-kpi"><b>${num(st.weekMin)}</b><span>이번 주 집중</span></div>
        <div class="tm-kpi"><b>${st.weekDone}<small>번</small></b><span>이번 주 완료</span></div>
      </div>
      <div class="tm-charts">
        <div class="tm-chart"><div class="tm-lbl">이번 주 (분)</div><div class="tm-bars">${bars}</div></div>
        <div class="tm-chart"><div class="tm-lbl">최근 12주</div><div class="tm-heat" role="img" aria-label="최근 12주 집중 히트맵">${cells}</div>
          <div class="tm-heat-lg"><span>적음</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>많음</span></div></div>
      </div>
    </section>`;
  }

  function rowHtml(s) {
    const p = PH[s.type], f = isFocus(s);
    const label = p ? p.label : s.typeLabel || (f ? '집중' : '휴식'), emoji = p ? p.emoji : f ? '🍅' : '☕';
    const cls = p ? p.key : f ? 'work' : 'short';
    const min = Math.round((+s.actualSec || 0) / 60);
    const card = s.issueId != null ? `<button type="button" class="tm-key" data-act="open-card" data-key="${esc(s.issueId)}" title="칸반 카드 열기">${esc(s.issueId)}</button>` : '';
    const editing = ui.edit && ui.edit.sid === s.id;
    const note = editing
      ? `<textarea class="tm-note-in" data-in="note" rows="2" aria-label="기록 메모">${esc(ui.edit.val)}</textarea>`
      : f ? `<button type="button" class="tm-note ${s.note ? '' : 'empty'}" data-act="note" data-sid="${esc(s.id)}" title="눌러서 메모 고치기">${s.note ? esc(s.note) : '＋ 한 일 메모하기'}</button>` : '';
    return `<div class="tm-row is-${cls}">
      <span class="tm-row-ic">${emoji}</span>
      <div class="tm-row-tx">
        <div class="tm-row-t1"><b>${esc(label)}</b><span class="tm-row-tm">${hhmm(s.startedAt)}${s.endedAt ? '–' + hhmm(s.endedAt) : ''}</span><span class="tm-row-dur">${fmtMin(min)}<small> / ${+s.plannedMin || 0}분</small></span>
          <span class="tm-badge ${s.completed ? 'ok' : 'stop'}">${s.completed ? '완료' : '중단'}</span>${s.interruptions > 0 ? `<span class="tm-badge dis">🙈 ${s.interruptions}</span>` : ''}${s.tag ? `<span class="tm-badge tag">#${esc(s.tag)}</span>` : ''}${card}</div>
        ${note}
      </div>
      <button type="button" class="tm-row-del" data-act="del" data-sid="${esc(s.id)}" aria-label="이 기록 지우기" title="이 기록 지우기">✕</button>
    </div>`;
  }
  function logHtml() {
    const rows = store.pomodoroSessions().filter((s) => dayOf(s) === ui.date);
    const fr = rows.filter(isFocus), fmin = Math.round(fr.reduce((a, s) => a + (+s.actualSec || 0), 0) / 60), dis = fr.reduce((a, s) => a + (+s.interruptions || 0), 0);
    const isToday = ui.date === today();
    return `<section class="tm-box tm-log">
      <div class="tm-boxh"><h3>🗓️ 기록</h3>
        <div class="tm-datenav"><button type="button" data-act="day" data-d="-1" aria-label="이전 날">‹</button><b>${dateLabel(ui.date)}</b><button type="button" data-act="day" data-d="1" aria-label="다음 날" ${isToday ? 'disabled' : ''}>›</button>${isToday ? '' : '<button type="button" class="tm-today" data-act="day" data-d="0">오늘</button>'}</div></div>
      <div class="tm-logsum">🍅 집중 <b>${fr.filter((s) => s.completed).length}</b>번 완료 · <b>${fmtMin(fmin)}</b>${dis ? ` · 🙈 딴짓 <b>${dis}</b>번` : ''}</div>
      <div class="tm-rows">${rows.length ? rows.map(rowHtml).join('') : `<div class="tm-empty center">${isToday ? '오늘은 아직 기록이 없어요. 🍅 첫 집중을 시작해 볼까요?' : '이 날은 기록이 없어요.'}</div>`}</div>
    </section>`;
  }

  function settingsHtml() {
    const s = S();
    const num = (k, label, min, max, unit) => `<label class="tm-set-n"><span>${label}</span><span class="tm-set-in"><input type="number" min="${min}" max="${max}" value="${esc(s[k])}" data-set="${k}"><small>${unit}</small></span></label>`;
    const chk = (k, label) => `<label class="tm-set-c"><input type="checkbox" data-set="${k}" ${s[k] ? 'checked' : ''}><span>${label}</span></label>`;
    const v = Math.round(vol() * 100);
    const notifyNote = !('Notification' in window) ? '이 브라우저는 알림을 지원하지 않아요' : Notification.permission === 'denied' ? '브라우저에서 알림이 막혀 있어요' : '';
    return `<details class="tm-box tm-set" data-act-toggle="set" ${uiPrefs.setOpen ? 'open' : ''}>
      <summary><h3>⚙️ 타이머 설정</h3><small>시간 · 목표 · 자동 시작 · 소리</small></summary>
      <div class="tm-set-body">
        <div class="tm-set-grid">
          ${num('workMin', '🍅 집중', 1, 180, '분')}${num('shortMin', '☕ 짧은 휴식', 1, 60, '분')}${num('longMin', '🌿 긴 휴식', 1, 120, '분')}
          ${num('cyclesPerLong', '긴 휴식 주기 · 집중', 1, 12, '번마다')}${num('dailyGoal', '🎯 하루 목표', 0, 50, '번')}
        </div>
        <div class="tm-set-checks">
          ${chk('autoStartBreak', '집중이 끝나면 휴식 자동 시작')}${chk('autoStartWork', '휴식이 끝나면 집중 자동 시작')}
          ${chk('sound', '끝나면 소리로 알려 주기')}${chk('notify', '데스크톱 알림')}${chk('tabTitle', '탭 제목에 남은 시간 표시')}
        </div>
        ${notifyNote ? `<div class="tm-empty">${notifyNote}</div>` : ''}
        <div class="tm-set-sound">
          <label class="tm-set-n"><span>🔔 알림음</span><select data-set="alarmSound">${SOUNDS.map(([id, nm]) => `<option value="${id}" ${(s.alarmSound || 'beep') === id ? 'selected' : ''}>${nm}</option>`).join('')}</select></label>
          <button type="button" class="tm-sbtn sm" data-act="preview">▶ 미리 듣기</button>
          <label class="tm-vol"><span>🔊</span><input type="range" min="0" max="100" step="5" value="${v}" data-set="volume" aria-label="소리 크기"><b data-dyn="vol">${v}%</b></label>
        </div>
      </div>
    </details>`;
  }

  function html() {
    const st = stats();
    return `${headHtml(st)}<div class="tm-body" data-scroll="body"><div class="tm-col tm-main" data-scroll="main">${timerHtml()}${taskHtml()}</div><div class="tm-col tm-side" data-scroll="side">${statsHtml(st)}${logHtml()}${settingsHtml()}</div></div>`;
  }

  function rerender() {
    if (!panel) return;
    const a = document.activeElement;
    const keep = a && panel.contains(a) && a.dataset && a.dataset.in ? { k: a.dataset.in, s: a.selectionStart, e: a.selectionEnd } : null;
    const scrolls = Array.from(panel.querySelectorAll('[data-scroll]')).map((el) => [el.dataset.scroll, el.scrollTop]);
    rendering = true;
    panel.innerHTML = html();
    rendering = false;
    scrolls.forEach(([k, t]) => { const el = panel.querySelector(`[data-scroll="${k}"]`); if (el) el.scrollTop = t; });
    if (keep) {
      const el = panel.querySelector(`[data-in="${keep.k}"]`);
      if (el && !el.disabled) { el.focus({ preventScroll: true }); try { if (keep.s != null) el.setSelectionRange(keep.s, keep.e); } catch (e) {} }
    }
    dynEls = { box: panel.querySelector('.tm-timer'), time: panel.querySelector('[data-dyn=time]'), sub: panel.querySelector('[data-dyn=sub]'), bar: panel.querySelector('.tm-ring-bar'), knob: panel.querySelector('.tm-ring-knob') };
    dyn();
  }
  // 매 틱: 남은 시간 · 링만 다시 그린다 (입력칸은 건드리지 않음)
  function dyn() {
    if (!panel || !dynEls || !dynEls.time) return;
    const rem = remainingMs(), f = Math.max(0, Math.min(1, 1 - rem / (durMs() || 1)));
    const tx = mmss(rem); if (dynEls.time.textContent !== tx) dynEls.time.textContent = tx;
    const p = phaseOf(live.phase);
    const sub = live.running ? `${hhmm(live.endsAt)}에 끝나요` : live.startedAtISO ? '잠깐 멈춤 · 이어서 할 수 있어요' : `${p.label} ${minOf(p.key)}분 준비됐어요`;
    if (dynEls.sub.textContent !== sub) dynEls.sub.textContent = sub;
    dynEls.bar.setAttribute('stroke-dashoffset', (C * f).toFixed(2));
    const ang = (1 - f) * 2 * Math.PI;
    dynEls.knob.setAttribute('cx', (120 + R * Math.sin(ang)).toFixed(2));
    dynEls.knob.setAttribute('cy', (120 - R * Math.cos(ang)).toFixed(2));
  }

  let searchT = null, searchSeq = 0;
  function search(q) {
    ui.q = q; clearTimeout(searchT);
    if (!AIO.kanban || !AIO.kanban.search) return;
    searchT = setTimeout(async () => {
      const my = ++searchSeq; ui.searching = true; ui.searchErr = ''; paintResults();
      try { const r = await AIO.kanban.search(q.trim()); if (my !== searchSeq) return; ui.results = Array.isArray(r) ? r : (r && r.items) || []; }
      catch (e) { if (my !== searchSeq) return; ui.results = null; ui.searchErr = `칸반 카드를 불러오지 못했어요 — ${e.message || e}. (관리 › 칸반에서 로그인 · 연동을 확인해 주세요)`; }
      ui.searching = false; paintResults();
    }, q ? 280 : 0);
  }
  function paintResults() { const el = panel && panel.querySelector('.tm-results'); if (el) el.innerHTML = resultsHtml(); }

  function closeAll() { if (AIO.timer && AIO.timer.close) AIO.timer.close(); }
  function onClick(e) {
    const b = e.target.closest('[data-act]'); if (!b || !panel.contains(b) || b.disabled) return;
    const d = b.dataset;
    switch (d.act) {
      case 'close': closeAll(); break;
      case 'toggle': toggleRun(); break;
      case 'skip': skip(); break;
      case 'reset': if (!live.startedAtISO || actualSec() < 60 || window.confirm('진행 중인 세션을 기록하지 않고 처음으로 돌릴까요?')) reset(); break;
      case 'distract': distract(); break;
      case 'phase': setPhase(d.k); break;
      case 'dec': setMinutes(minOf(live.phase) - 1); break;
      case 'inc': setMinutes(minOf(live.phase) + 1); break;
      case 'preset': setMinutes(+d.m); break;
      case 'preset-add': { const m = minOf(live.phase), arr = (S().presets || []).slice(); if (arr.indexOf(m) < 0) { arr.push(m); arr.sort((x, y) => x - y); store.savePomodoroSettings({ presets: arr }); toast(`⏱️ ${m}분 프리셋을 저장했어요`); } rerender(); break; }
      case 'preset-del': store.savePomodoroSettings({ presets: (S().presets || []).filter((x) => x !== +d.m) }); rerender(); break;
      case 'pick': ui.q = ''; ui.results = null; link(d.key, d.title); break;
      case 'unlink': link(null); break;
      case 'open-card': { const key = d.key || live.issueId; if (key != null && AIO.kanban && AIO.kanban.openCard) { closeAll(); AIO.kanban.openCard(key); } break; }
      case 'session': if (AIO.ui && AIO.ui.open) { closeAll(); AIO.ui.open(d.sid); } break;
      case 'tag': live.tag = live.tag === d.t ? '' : d.t; persist(); rerender(); break;
      case 'memo-clear': live.memo = ''; persist(); rerender(); break;
      case 'day': ui.date = +d.d === 0 ? today() : shiftDay(ui.date, +d.d); if (ui.date > today()) ui.date = today(); ui.edit = null; rerender(); break;
      case 'note': { const s = store.pomodoroSessions().find((x) => x.id === d.sid); if (s) { ui.edit = { sid: s.id, val: s.note || '' }; rerender(); const ta = panel.querySelector('[data-in=note]'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } } break; }
      case 'del': if (window.confirm('이 기록을 지울까요?')) { store.deletePomodoroSession(d.sid); rerender(); } break;
      case 'preview': unlockAudio(); playSound(S().alarmSound || 'beep'); break;
    }
  }
  function saveNote(commit) {
    if (!ui.edit) return;
    const { sid, val } = ui.edit; ui.edit = null;
    if (commit) store.updatePomodoroSession(sid, { note: String(val || '').trim() });
    rerender();
  }
  function onInput(e) {
    const t = e.target, k = t.dataset && t.dataset.in;
    if (k === 'memo') { live.memo = t.value; persist(); }
    else if (k === 'tag') { live.tag = t.value; persist(); }
    else if (k === 'q') search(t.value);
    else if (k === 'note' && ui.edit) ui.edit.val = t.value;
    else if (t.dataset && t.dataset.set === 'volume') { const o = panel.querySelector('[data-dyn=vol]'); if (o) o.textContent = t.value + '%'; }
  }
  function onChange(e) {
    const t = e.target;
    if (t.dataset.in === 'min') { setMinutes(t.value); return; }
    if (t.dataset.in === 'tag') { rerender(); return; }
    const k = t.dataset.set; if (!k) return;
    let v;
    if (t.type === 'checkbox') v = t.checked;
    else if (t.tagName === 'SELECT') v = t.value;
    else { v = Math.round(+t.value); const lo = +t.min, hi = +t.max; if (isNaN(v)) v = lo; v = Math.max(lo, Math.min(hi, v)); }
    store.savePomodoroSettings({ [k]: v });
    if (k === 'notify' && v) askNotify();
    if (k === 'alarmSound' || k === 'volume') { unlockAudio(); playSound(S().alarmSound || 'beep'); }
    if (k === phaseOf(live.phase).minKey && !live.startedAtISO) prepare(false);
    changed();
  }
  function onKeyDown(e) {
    const t = e.target;
    if (t.dataset && t.dataset.in === 'q' && e.key === 'Enter') {
      e.preventDefault();
      const first = ui.results && ui.results[0], q = ui.q.trim();
      if (first) { ui.q = ''; ui.results = null; link(first.key, first.title); }
      else if (/^[A-Za-z][\w]*-\d+$/.test(q)) { ui.q = ''; ui.results = null; link(q.toUpperCase()); }
    } else if (t.dataset && t.dataset.in === 'note') {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); saveNote(false); }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveNote(true); }
    } else if (t.dataset && t.dataset.in === 'min' && e.key === 'Enter') { t.blur(); }
  }
  function onFocusIn(e) { const t = e.target; if (t.dataset && t.dataset.in === 'q' && !ui.results && !ui.searching) search(t.value || ''); }
  function onFocusOut(e) { if (rendering) return; const t = e.target; if (t.dataset && t.dataset.in === 'note') setTimeout(() => saveNote(true), 0); }
  function onToggle(e) { if (e.target.dataset && e.target.dataset.actToggle === 'set') { uiPrefs.setOpen = e.target.open; saveUi(); } }
  // 패널이 열려 있는 동안: Space = 시작/일시정지, 사무실 단축키(S·F·M…)는 막는다
  function onKeyCapture(e) {
    if (!panel) return;
    const typing = e.target.closest && e.target.closest('input,textarea,select,[contenteditable]');
    if (e.key === 'Escape' || typing) return;
    if (e.key === ' ' && !(e.target.closest && e.target.closest('button,a,summary'))) { e.preventDefault(); toggleRun(); }
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) e.stopPropagation();
  }

  function mountPanel(el, opts) {
    if (!el) return;
    if (panel && panel !== el) unmountPanel();
    pageMode = !!(opts && opts.page);
    if (panel !== el) {
      panel = el; el.classList.add('tm-panel');
      el.addEventListener('click', onClick); el.addEventListener('input', onInput); el.addEventListener('change', onChange);
      el.addEventListener('keydown', onKeyDown); el.addEventListener('focusin', onFocusIn); el.addEventListener('focusout', onFocusOut);
      el.addEventListener('toggle', onToggle, true);
      window.addEventListener('keydown', onKeyCapture, true);
    }
    ui.date = today(); ui.q = ''; ui.results = null; ui.searchErr = ''; ui.edit = null;
    rerender();
  }
  function unmountPanel() {
    if (!panel) return;
    const el = panel;
    el.removeEventListener('click', onClick); el.removeEventListener('input', onInput); el.removeEventListener('change', onChange);
    el.removeEventListener('keydown', onKeyDown); el.removeEventListener('focusin', onFocusIn); el.removeEventListener('focusout', onFocusOut);
    el.removeEventListener('toggle', onToggle, true);
    window.removeEventListener('keydown', onKeyCapture, true);
    panel = null; dynEls = null;
    if (!pageMode) el.innerHTML = '';
  }

  // ------------------------------------------------------------------ 바깥에서 쓰는 이름
  AIO.TimerUI = { init, mountMini, mountPanel, unmountPanel, rerender, state: snapshot };
  // 칸반(kanban.js)의 '이 카드로 업무타이머', store-shim 의 서버 불러오기가 이 이름을 부른다
  window.Pomodoro = {
    init, start, pause, resume: start, skip, reset, startForIssue, state: snapshot,
    subscribe(fn) { if (typeof fn === 'function' && subs.indexOf(fn) < 0) subs.push(fn); return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; },
    refresh() { const o = readLive(); if (o && inited) live = o; paintMini(); rerender(); },
    render: (el) => mountPanel(el), mountTopbar: (el) => mountMini(el),
  };

  // 새 창(timer.html): 같은 화면을 한 페이지 가득 연다
  const page = document.getElementById('timerPage');
  if (page) {
    try {
      const P = JSON.parse(localStorage.getItem('aio.prefs') || '{}') || {};
      if (P.theme === 'dark' || P.theme === 'light') document.documentElement.setAttribute('data-theme', P.theme);
      if (typeof P.accent === 'string' && /^#[0-9a-f]{3,8}$/i.test(P.accent)) document.documentElement.style.setProperty('--accent', P.accent);
    } catch (e) {}
    init(); mountPanel(page, { page: true });
  }
})();
