// 👁️ 세션 보기 필터 (보는 사람마다, 이 브라우저에 저장): 전체 / 기간 / 직접 고르기 + 상태 · 자리 · 종류 · 서비스 · 프로젝트 · 최대 인원 · 세션별 항상 보이기 / 숨기기.
//   서버에서 온 상태를 걸러서 맵 · 패널 · 숫자에 함께 쓴다 → 세션이 줄면 꼬마빌딩 층도 줄어든다.
//   결정 필요 · 일하는 중은 (옵션) 필터와 상관없이 늘 보인다. 관리 센터의 세션 관리는 필터 없이 전부 보인다.
(function () {
  const esc = AIO.esc, tr = (...a) => AIO.tr(...a);
  const KEY = 'aio.view';
  const DEF = {
    mode: 'all',                 // all · period · pick
    period: '24h', from: '', to: '',
    keepBusy: true,              // 결정 필요 · 일하는 중은 늘 보이기
    status: {}, place: {}, kind: {}, provider: {}, project: {},   // false 인 것만 끔 (없으면 켜짐)
    max: 0,                      // 최근 활동 순으로 최대 N개 (0 = 제한 없음)
    show: {}, hide: {},          // 세션별: 항상 보이기 · 숨기기
  };
  let V = { ...DEF };
  try { V = { ...DEF, ...(JSON.parse(localStorage.getItem(KEY) || '{}') || {}) }; } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(V)); } catch {} window.dispatchEvent(new CustomEvent('aio:view')); };
  let world = null, raw = { sessions: [] }, last = { shown: 0, total: 0 }, q = '';

  const PERIODS = [['1h', '1시간', 1], ['3h', '3시간', 3], ['6h', '6시간', 6], ['today', '오늘', 0], ['24h', '24시간', 24], ['3d', '3일', 72], ['7d', '7일', 168], ['30d', '30일', 720], ['custom', '날짜 지정', 0]];
  const STATUS = [['busy', '⌨️ 일하는 중'], ['urgent', '🙋 결정 필요'], ['done', '✅ 완료'], ['idle', '☕ 휴식'], ['sleeping', '😴 졸음']];
  const PLACE = [['active', '🏢 사무실'], ['paused', '⏸️ 일시정지'], ['stopped', '🛋️ 중단 · 지하'], ['jail', '⛓️ 감옥'], ['dungeon', '🐉 던전'], ['vault', '🏦 금고']];
  const KIND = [['single', '🧑 단일 세션'], ['harness', '👥 하네스 팀'], ['app', '🖥️ 앱'], ['custom', '🧶 만든 캐릭터']];
  const statusOf = (s) => (AIO.isUrgent(s.status) ? 'urgent' : AIO.isBusy(s.status) ? 'busy' : s.status === 'done' ? 'done' : s.status === 'sleeping' ? 'sleeping' : 'idle');
  const kindOf = (s) => (s.source === 'custom' || s.provider === 'custom' ? 'custom' : s.kind === 'app' ? 'app' : s.kind === 'harness' ? 'harness' : 'single');
  const placeOf = (s) => s.place || 'active';
  const on = (map, k) => !(map && map[k] === false);

  function since() {
    const p = PERIODS.find((x) => x[0] === V.period) || PERIODS[4];
    if (p[0] === 'today') { const d = new Date(); d.setHours(0, 0, 0, 0); return [d.getTime(), Infinity]; }
    if (p[0] === 'custom') {
      const a = V.from ? new Date(V.from + 'T00:00:00').getTime() : 0, b = V.to ? new Date(V.to + 'T23:59:59').getTime() : Infinity;
      return [a || 0, b || Infinity];
    }
    return [Date.now() - p[2] * 3600e3, Infinity];
  }
  function pass(s, win) {
    if (V.hide[s.id]) return false;
    if (V.show[s.id]) return true;
    if (V.keepBusy && (AIO.isBusy(s.status) || AIO.isUrgent(s.status))) return true;
    if (V.mode === 'pick') return false;
    if (V.mode === 'period') { const t = s.lastActive || 0; if (t < win[0] || t > win[1]) return false; }
    return on(V.status, statusOf(s)) && on(V.place, placeOf(s)) && on(V.kind, kindOf(s)) && on(V.provider, s.provider || '?') && on(V.project, s.project || '');
  }
  /** 서버 상태 → 걸러진 상태 */
  function apply(st) {
    raw = st || { sessions: [] };
    const all = raw.sessions || [];
    const win = since();
    let list = all.filter((s) => pass(s, win));
    if (V.max > 0 && list.length > V.max) {
      const must = list.filter((s) => V.show[s.id] || (V.keepBusy && (AIO.isBusy(s.status) || AIO.isUrgent(s.status))));
      const rest = list.filter((s) => !must.includes(s)).sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0)).slice(0, Math.max(0, V.max - must.length));
      const keep = new Set([...must, ...rest]);
      list = list.filter((s) => keep.has(s));
    }
    last = { shown: list.length, total: all.length };
    badge();
    return list.length === all.length ? raw : { ...raw, sessions: list, allSessions: all, view: last };
  }
  const active = () => last.shown < last.total;
  function badge() {
    const b = document.getElementById('btnView');
    if (!b) return;
    b.hidden = !active();
    b.innerHTML = `👁️<span class="lbl">${last.shown}/${last.total}</span>`;
    b.title = tr('세션 보기 필터 — 전체 {0}개 중 {1}개 보는 중', last.total, last.shown);
  }

  // ---------------------------------------------------------------- 설정 화면 (맵 선택 창 › 👁️ 세션 보기)
  const chip = (group, k, label, isOn) => `<button class="vf-chip ${isOn ? 'on' : ''}" data-vf="${group}" data-k="${esc(k)}">${esc(tr(label))}</button>`;
  const ago = (t) => (t ? AIO.fmtDur(Math.max(0, Date.now() - t)) : '-');
  function render(el) {
    if (!el) return;
    const all = raw.sessions || [], win = since();
    const providers = [...new Set(all.map((s) => s.provider || '?'))].sort();
    const projects = [...new Set(all.map((s) => s.project).filter(Boolean))].sort();
    let h = `<div class="vf-sum"><b>${tr('지금 {0}개 중 {1}개 보는 중', last.total, last.shown)}</b>${active() || V.mode !== 'all' ? `<button class="btn ghost sm" data-vfa="reset">🌐 ${tr('전부 보기로 되돌리기')}</button>` : ''}</div>`;
    h += `<div class="vf-sec"><div class="vf-h">${tr('보기 방식')}</div><div class="vf-seg">${[['all', '🌐 전체'], ['period', '🕒 기간'], ['pick', '✋ 직접 고르기']].map(([k, l]) => `<button class="${V.mode === k ? 'on' : ''}" data-vfmode="${k}">${tr(l)}</button>`).join('')}</div>`;
    if (V.mode === 'period') {
      h += `<div class="vf-row">${tr('마지막 활동이')}: ${PERIODS.map(([k, l]) => chip('period', k, k === 'custom' ? l : `${l}${k === 'today' ? '' : ' 안'}`, V.period === k)).join('')}</div>`;
      if (V.period === 'custom') h += `<div class="vf-row"><input type="date" data-vfdate="from" value="${esc(V.from)}"> ~ <input type="date" data-vfdate="to" value="${esc(V.to)}"></div>`;
    }
    if (V.mode === 'pick') h += `<p class="muted">${tr('아래 목록에서 👁️ 로 고른 세션만 보여요.')}</p>`;
    h += `<label class="mg-chk"><input type="checkbox" data-vfchk="keepBusy" ${V.keepBusy ? 'checked' : ''}> ${tr('결정 필요 · 일하는 중인 세션은 늘 보이기')}</label></div>`;
    if (V.mode !== 'pick') {
      h += `<div class="vf-sec"><div class="vf-h">${tr('상태')}</div><div class="vf-row">${STATUS.map(([k, l]) => chip('status', k, l, on(V.status, k))).join('')}</div>`;
      h += `<div class="vf-h">${tr('자리')}</div><div class="vf-row">${PLACE.map(([k, l]) => chip('place', k, l, on(V.place, k))).join('')}</div>`;
      h += `<div class="vf-h">${tr('종류')}</div><div class="vf-row">${KIND.map(([k, l]) => chip('kind', k, l, on(V.kind, k))).join('')}</div>`;
      if (providers.length > 1) h += `<div class="vf-h">${tr('서비스')}</div><div class="vf-row">${providers.map((k) => chip('provider', k, (AIO.provider && AIO.provider(k).label) || k, on(V.provider, k))).join('')}</div>`;
      if (projects.length > 1) h += `<div class="vf-h">${tr('프로젝트')}</div><div class="vf-row vf-scroll">${projects.map((k) => chip('project', k, k, on(V.project, k))).join('')}</div>`;
      h += `<div class="vf-h">${tr('최대 인원 (최근 활동 순)')}</div><div class="vf-row">${[0, 10, 20, 30, 50].map((n) => chip('max', String(n), n ? `${n}명` : '제한 없음', (V.max || 0) === n)).join('')}</div></div>`;
    }
    // 세션 목록: 항상 보이기 / 기본 / 숨기기
    const rows = all.filter((s) => !q || `${s.title || ''} ${s.project || ''} ${(s.persona && AIO.pname ? AIO.pname(s.persona) : '')} ${(world && world.codes.get(s.id)) || ''}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
    const nShow = Object.keys(V.show).length, nHide = Object.keys(V.hide).length;
    h += `<div class="vf-sec"><div class="vf-h">${tr('세션 하나하나')} <small>👁️ ${tr('항상 보이기')} ${nShow} · 🚫 ${tr('숨기기')} ${nHide}</small></div>`;
    h += `<div class="vf-row"><input class="vf-q" data-vfq placeholder="${esc(tr('🔎 이름 · 제목 · 프로젝트 · 코드'))}" value="${esc(q)}">`
      + `<button class="btn ghost sm" data-vfa="showVisible">👁️ ${tr('목록 전부 보이기')}</button><button class="btn ghost sm" data-vfa="clearPick">${tr('고른 것 비우기')}</button></div>`;
    h += `<div class="vf-list">${rows.map((s) => {
      const st = V.show[s.id] ? 'show' : V.hide[s.id] ? 'hide' : '';
      const vis = pass(s, win) && (!V.max || true);
      const nm = (s.persona && AIO.pname ? AIO.pname(s.persona) : '') || s.title || (AIO.provider ? AIO.provider(s.provider).label : s.provider);
      const sub = [world && world.codes.get(s.id), s.title && s.title !== nm ? s.title : '', s.project].filter(Boolean).join(' · ');
      return `<div class="vf-item ${vis ? '' : 'off'}"><div class="vf-name"><b>${esc(nm)}</b><small>${esc(sub)} · ${esc(AIO.status ? AIO.status(s.status).label : s.status)} · ${esc(ago(s.lastActive))} ${tr('전')}</small></div>`
        + `<div class="vf-tri">${[['show', '👁️', '항상 보이기'], ['', '·', '기본'], ['hide', '🚫', '숨기기']].map(([k, ic, l]) => `<button class="${st === k ? 'on' : ''}" data-vfpin="${esc(s.id)}" data-k="${k}" title="${esc(tr(l))}">${ic}</button>`).join('')}</div></div>`;
    }).join('') || `<p class="muted">${tr('세션이 없어요')}</p>`}</div></div>`;
    el.innerHTML = h;
  }
  function bind(el) {
    if (!el || el.dataset.vfBound) return;
    el.dataset.vfBound = '1';
    const rerender = () => { save(); setTimeout(() => render(el), 0); };
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.vfmode) { V.mode = b.dataset.vfmode; return rerender(); }
      if (b.dataset.vf) {
        const g = b.dataset.vf, k = b.dataset.k;
        if (g === 'period') V.period = k;
        else if (g === 'max') V.max = +k;
        else { V[g] = { ...V[g] }; if (on(V[g], k)) V[g][k] = false; else delete V[g][k]; }
        return rerender();
      }
      if (b.dataset.vfpin) {
        const id = b.dataset.vfpin, k = b.dataset.k;
        V.show = { ...V.show }; V.hide = { ...V.hide }; delete V.show[id]; delete V.hide[id];
        if (k === 'show') V.show[id] = 1; else if (k === 'hide') V.hide[id] = 1;
        return rerender();
      }
      const a = b.dataset.vfa;
      if (a === 'reset') { V = { ...DEF }; q = ''; return rerender(); }
      if (a === 'clearPick') { V.show = {}; V.hide = {}; return rerender(); }
      if (a === 'showVisible') {     // 검색으로 좁힌 목록을 전부 '항상 보이기' (직접 고르기에서 편함)
        V.show = { ...V.show }; V.hide = { ...V.hide };
        for (const s of raw.sessions || []) if (!q || `${s.title || ''} ${s.project || ''} ${(s.persona && AIO.pname ? AIO.pname(s.persona) : '')} ${(world && world.codes.get(s.id)) || ''}`.toLowerCase().includes(q.toLowerCase())) { V.show[s.id] = 1; delete V.hide[s.id]; }
        return rerender();
      }
    });
    el.addEventListener('change', (ev) => {
      const t = ev.target;
      if (t.dataset.vfchk) { V[t.dataset.vfchk] = t.checked; return rerender(); }
      if (t.dataset.vfdate) { V[t.dataset.vfdate] = t.value; return rerender(); }
    });
    el.addEventListener('input', (ev) => {
      if (ev.target.dataset.vfq == null) return;
      q = ev.target.value;
      const pos = ev.target.selectionStart;
      render(el);
      const i = el.querySelector('[data-vfq]'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch {} }
    });
  }

  AIO.view = {
    init(w) { world = w; const b = document.getElementById('btnView'); if (b) b.addEventListener('click', (ev) => { ev.stopPropagation(); window.dispatchEvent(new CustomEvent('aio:openmap', { detail: 'view' })); }); },
    apply, render(el) { bind(el); render(el); },
    get raw() { return raw; }, get stats() { return last; }, get active() { return active(); },
  };
})();
