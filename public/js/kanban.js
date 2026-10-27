// 칸반 (FlowBoard · TCC) — AI OFFICE 안에서 보드 보기 · 카드 만들기/옮기기/수정 · 댓글 · 체크리스트 · 세션 연결.
// 모든 호출은 서버 프록시(/api/tcc/proxy/…)를 거친다 — 토큰은 서버에만 있고 브라우저에는 오지 않는다.
// v6: 스윔레인(에픽·담당자·우선순위·유형·스프린트) · 에픽 보기/숨기기 · 필터 · WIP · 칸별 카드 추가 · 레인 간 끌어 놓기 · 카드 크기 · 모바일 칸 이동 바.
(function () {
  const esc = AIO.esc, tr = (...a) => AIO.tr(...a);
  const K = { cfg: null, hasToken: false, statuses: [], priorities: [], labels: [], sprints: [], users: [], projects: [], project: null, me: null,
    cards: new Map(), list: [], sel: null, detail: null, err: null, history: [], loading: false, setOpen: false,
    adding: null, wipEdit: null, fOpen: false, draft: {} };
  try { K.project = localStorage.getItem('aio.kb.project') || null; } catch {}

  // ---------------------------------------------------------------- 보기 설정(브라우저에 저장)
  const VKEY = 'aio.kb.view';
  const VDEF = { group: 'none', collapsed: {}, hideEmpty: false, epics: 'hide', q: '', mine: false, who: '', type: '', prio: '', label: '', hideDone: false, ai: false, density: 'normal', wip: {} };
  const V = { ...VDEF, collapsed: {}, wip: {} };
  try { const s = JSON.parse(localStorage.getItem(VKEY) || 'null'); if (s && typeof s === 'object') for (const k of Object.keys(VDEF)) if (s[k] != null && typeof s[k] === typeof VDEF[k]) V[k] = s[k]; } catch {}
  const saveV = () => { try { localStorage.setItem(VKEY, JSON.stringify(V)); } catch {} };

  const TYPES = [['Task', '작업', '#4f6df5'], ['Epic', '에픽', '#8f4fe0'], ['Bug', '버그', '#e5493a'], ['Story', '스토리', '#36b37e'], ['Feature', '기능', '#00a3bf'], ['Support', '지원', '#f0912b']];
  const typeInfo = (t) => { const x = TYPES.find((y) => y[0] === t) || TYPES[0]; return { id: x[0], ko: tr(x[1]), color: x[2] }; };
  const GROUPS = [['none', '없음'], ['epic', '에픽'], ['assignee', '담당자'], ['priority', '우선순위'], ['type', '유형'], ['sprint', '스프린트']];
  const DENS = [['compact', '컴팩트'], ['normal', '보통'], ['large', '크게']];
  const PRIO_KO = { highest: '최상', critical: '심각', urgent: '긴급', high: '높음', medium: '보통', normal: '보통', low: '낮음', lowest: '최하' };
  const PRIO_C = { highest: '#c2255c', critical: '#c2255c', urgent: '#8b3fd6', high: '#e5534b', medium: '#e9a23b', normal: '#e9a23b', low: '#4e9cf6', lowest: '#7a8fa6' };
  const PAL = ['#e2667f', '#4f6df5', '#36b37e', '#f0912b', '#8f4fe0', '#00a3bf', '#c2255c', '#5c7cfa', '#2f9e44', '#e8590c', '#7048e8', '#1098ad'];
  const hash = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) | 0; return Math.abs(h); };
  const safeColor = (c, fb = '#8a7f72') => (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(c || '')) ? c : fb);
  const inkOn = (hex) => { let h = safeColor(hex).slice(1); if (h.length === 3) h = h.replace(/./g, '$&$&'); const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#2b2620' : '#fff'; };
  const userColor = (id) => PAL[hash(id) % PAL.length];
  const epicColor = (e) => PAL[hash('e' + (e && e.id)) % PAL.length];
  const initials = (n) => { n = String(n || '?').trim(); if (/^[가-힣]{3,4}$/.test(n)) return n.slice(1, 3); const w = n.split(/\s+/); return (w.length > 1 ? w[0][0] + w[1][0] : n.slice(0, 2)).toUpperCase(); };
  const prioName = (id) => { if (id == null || id === '') return ''; const k = String(id).toLowerCase(); const p = K.priorities.find((x) => String(x.id) === String(id)); return tr(PRIO_KO[k] || (p && p.name) || String(id)); };
  const prioColor = (id) => { const p = K.priorities.find((x) => String(x.id) === String(id)); return safeColor(p && p.color, PRIO_C[String(id || '').toLowerCase()] || '#b8ab99'); };
  const pct = (n) => Math.max(0, Math.min(100, +n || 0));
  const daysOver = (due) => { if (!due) return 0; const d = new Date(due + 'T00:00:00'); if (isNaN(d)) return 0; const t = new Date(); t.setHours(0, 0, 0, 0); return Math.max(0, Math.round((t - d) / 86400000)); };

  async function req(path, method = 'GET', body) {
    const opts = { method: method === 'PATCH' ? 'POST' : method, headers: { 'Content-Type': 'application/json' } };
    if (method === 'PATCH') opts.headers['X-HTTP-Method-Override'] = 'PATCH';
    if (body) opts.body = JSON.stringify(body);
    const r = await AIO.auth.api('/api/tcc/proxy' + path, opts);
    let j = {}; try { j = await r.json(); } catch {}
    if (!j.ok) throw new Error((j.error && (j.error.message || j.error.code)) || j.error || `HTTP ${r.status}`);
    return j;
  }
  async function cfgCall(body) {
    const r = await AIO.auth.api('/api/tcc/config', body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    const j = await r.json(); if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
    K.cfg = j.cfg; K.hasToken = j.hasToken; K.history = j.history || []; return j;
  }
  const toast = (m) => { const t = document.createElement('div'); t.className = 'mg-toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); };
  const sessions = () => ((AIO.ui && AIO.ui.world && AIO.ui.world() && AIO.ui.world().sessions) || []);
  const code = (id) => (AIO.ui && AIO.ui.code ? AIO.ui.code(id) : '');
  const linkedTo = (key) => sessions().filter((s) => s.meta && s.meta.task && s.meta.task.key === key);

  async function load() {
    K.err = null; K.loading = true; paint();
    try {
      await cfgCall();
      if (!K.hasToken) { K.loading = false; paint(); return; }
      const soft = (p) => p.catch(() => null);
      const [st, pr, prio, lb, me] = await Promise.all([req('/statuses'), req('/projects'), req('/priorities'), soft(req('/labels')), soft(req('/me'))]);
      K.statuses = st.data; K.projects = pr.data; K.priorities = prio.data; K.labels = (lb && lb.data) || []; K.me = (me && me.data && me.data.user) || null;
      if (!K.project || !K.projects.some((p) => p.key === K.project)) K.project = K.cfg.project || (K.projects[0] && K.projects[0].key);
      K.users = []; K.sprints = [];
      await loadCards();
      const pk = encodeURIComponent(K.project);
      req(`/projects/${pk}`).then((j) => { K.users = (j.data.members || []).map((m) => m.user).filter(Boolean); paint(); }).catch(() => {});
      req(`/projects/${pk}/sprints`).then((j) => { K.sprints = j.data || []; paint(); }).catch(() => {});
    } catch (e) { K.err = e.message; }
    K.loading = false; paint();
  }
  async function loadCards() {
    const all = []; let off = 0;
    for (let i = 0; i < 10; i++) {
      const j = await req(`/issues?project=${encodeURIComponent(K.project)}&compact=1&limit=200&offset=${off}`);
      all.push(...j.data); if (!j.meta || j.meta.nextOffset == null) break; off = j.meta.nextOffset;
    }
    K.list = all; for (const c of all) K.cards.set(c.key, c);
  }
  async function openDetail(key) {
    K.sel = key; K.detail = null; paint();
    try { const j = await req(`/issues/${encodeURIComponent(key)}`); K.detail = j.data; K.cards.set(j.data.key, j.data); mergeList(j.data); } catch (e) { toast('⚠️ ' + e.message); K.sel = null; }
    paint();
  }
  function mergeList(d) { const i = K.list.findIndex((c) => c.key === d.key); if (i >= 0) { const { comments, checklistItems, activity, links, ...rest } = d; Object.assign(K.list[i], rest); } }
  async function patchCard(key, patch, msg) {
    try { const j = await req(`/issues/${encodeURIComponent(key)}`, 'PATCH', patch); K.cards.set(key, j.data); if (K.sel === key) K.detail = { ...K.detail, ...j.data }; mergeList(j.data); if (msg) toast(msg); }
    catch (e) { toast('⚠️ ' + e.message); }
    paint();
  }

  // ---------------------------------------------------------------- 보드 데이터(필터 · 에픽 · 레인)
  const cols = () => K.statuses.filter((s) => s.onBoard !== false);
  let byId = new Map();
  const reindex = () => { byId = new Map(K.list.map((c) => [String(c.id), c])); };
  function epicOf(c) {
    if (!c) return null;
    if (c.type === 'Epic') return c;
    let p = c.parentId;
    for (let i = 0; i < 6 && p != null; i++) { const par = byId.get(String(p)); if (!par) return null; if (par.type === 'Epic') return par; p = par.parentId; }
    return null;
  }
  const epics = () => K.list.filter((c) => c.type === 'Epic');
  function userList() {
    const m = new Map();
    for (const u of K.users) if (u && u.id != null) m.set(String(u.id), u);
    for (const c of K.list) if (c.assignee && c.assignee.id != null && !m.has(String(c.assignee.id))) m.set(String(c.assignee.id), c.assignee);
    return [...m.values()];
  }
  const meId = () => (K.me ? String(K.me.id) : null);
  function visible() {
    const q = V.q.trim().toLowerCase(), me = meId();
    return K.list.filter((c) => {
      const ep = c.type === 'Epic';
      if (V.epics === 'hide' && ep) return false;
      if (V.epics === 'only' && !ep) return false;
      const aid = c.assignee && c.assignee.id != null ? String(c.assignee.id) : '';
      if (V.mine && me && aid !== me) return false;
      if (V.who && (V.who === '_none' ? aid : aid !== V.who)) return false;
      if (V.type && c.type !== V.type) return false;
      if (V.prio && String(c.priority) !== V.prio) return false;
      if (V.label && !(c.labels || []).some((l) => String(l.id) === V.label)) return false;
      if (V.hideDone && c.done) return false;
      if (V.ai && !linkedTo(c.key).length) return false;
      if (q) {
        const hay = [c.key, c.title, c.assignee && c.assignee.name, ...(c.labels || []).map((l) => l.name), (epicOf(c) || {}).title].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }
  const activeFilters = () => [V.q.trim(), V.mine, V.who, V.type, V.prio, V.label, V.hideDone, V.ai].filter(Boolean).length;
  function laneOf(c) {
    switch (V.group) {
      case 'assignee': return c.assignee && c.assignee.id != null ? String(c.assignee.id) : '_none';
      case 'priority': return c.priority != null && c.priority !== '' ? String(c.priority) : '_none';
      case 'type': return c.type || 'Task';
      case 'epic': { const e = epicOf(c); return e ? String(e.id) : '_none'; }
      case 'sprint': return c.sprint && c.sprint.id != null ? String(c.sprint.id) : '_none';
      default: return '_all';
    }
  }
  function lanes(cards) {
    if (V.group === 'none') return [{ key: '_all', label: null, cards }];
    const by = new Map();
    const add = (key, label, extra) => { if (!by.has(key)) by.set(key, { key, label, cards: [], ...extra }); };
    if (V.group === 'epic') epics().forEach((e) => add(String(e.id), e.title, { epic: e }));
    if (V.group === 'assignee') userList().forEach((u) => add(String(u.id), u.name || u.username || String(u.id), { user: u }));
    if (V.group === 'priority') K.priorities.forEach((p) => add(String(p.id), prioName(p.id), { color: prioColor(p.id) }));
    if (V.group === 'type') TYPES.forEach(([id]) => add(id, typeInfo(id).ko, { color: typeInfo(id).color }));
    if (V.group === 'sprint') K.sprints.forEach((s) => add(String(s.id), s.name, { sprint: s }));
    const none = { epic: '에픽 없음', assignee: '미배정', priority: '우선순위 없음', type: '유형 없음', sprint: '백로그 (스프린트 없음)' }[V.group];
    for (const c of cards) {
      const k = laneOf(c);
      if (!by.has(k) && k !== '_none') {
        if (V.group === 'assignee') add(k, c.assignee.name || k, { user: c.assignee });
        else if (V.group === 'sprint') add(k, c.sprint.name || k, { sprint: c.sprint });
        else add(k, V.group === 'priority' ? prioName(k) : k, {});
      }
      if (k === '_none') add('_none', tr(none), { none: true });
      by.get(k).cards.push(c);
    }
    if (V.group !== 'type' && V.group !== 'priority') add('_none', tr(none), { none: true });
    const arr = [...by.values()];
    return arr.filter((l) => l.key !== '_none').concat(arr.filter((l) => l.key === '_none'));
  }
  function wipOf(col) {
    const loc = V.wip[String(col.id)] || {};
    const api = col.wipMax != null || col.wipMin != null;
    return { max: col.wipMax != null ? +col.wipMax : (loc.max != null ? +loc.max : null), min: col.wipMin != null ? +col.wipMin : (loc.min != null ? +loc.min : null), api };
  }
  // 레인으로 옮길 때 바뀌는 필드: [서버 patch, 화면에 먼저 반영할 값] — 바꿀 수 없으면 null
  function laneChange(c, key) {
    const none = key === '_none';
    switch (V.group) {
      case 'assignee': { const u = none ? null : (userList().find((x) => String(x.id) === key) || { id: key, name: key }); return [{ assignee: none ? null : key }, { assignee: u }]; }
      case 'priority': return none ? null : [{ priority: key }, { priority: key }];
      case 'type': return [{ type: key }, { type: key }];
      case 'epic': { if (c.type === 'Epic') return null; const e = none ? null : byId.get(key); if (!none && !e) return null; return [{ parentId: none ? null : e.id }, { parentId: none ? null : e.id }]; }
      case 'sprint': { const s = none ? null : (K.sprints.find((x) => String(x.id) === key) || { id: key, name: key }); return [{ sprintId: none ? null : key }, { sprint: s ? { id: s.id, name: s.name } : null }]; }
      default: return null;
    }
  }
  function lanePreset(key) {
    const none = key === '_none' || key === '_all';
    switch (V.group) {
      case 'assignee': return none ? {} : { assignee: key };
      case 'priority': return none ? { assignee: 'me' } : { priority: key, assignee: 'me' };
      case 'type': return { type: key, assignee: 'me' };
      case 'epic': { const e = byId.get(key); return none || !e ? { assignee: 'me' } : { parentId: e.id, assignee: 'me' }; }
      case 'sprint': return none ? { assignee: 'me' } : { sprintId: key, assignee: 'me' };
      default: return { assignee: 'me' };
    }
  }

  // ---------------------------------------------------------------- 그리기
  let host = null;
  const avatar = (u, cls = 'kb-av') => (u ? `<span class="${cls}" style="background:${userColor(u.id)}" title="${esc(u.name || u.username || '')}">${esc(initials(u.name || u.username))}</span>` : `<span class="${cls} none" title="${esc(tr('미배정'))}">?</span>`);
  function cardHtml(c) {
    const ss = linkedTo(c.key), t = typeInfo(c.type), isEpic = c.type === 'Epic';
    const ep = V.group !== 'epic' && !isEpic ? epicOf(c) : null;
    const prog = pct(c.progress);
    let h = `<div class="kb-card${c.overdue ? ' overdue' : ''}${c.done ? ' done' : ''}${isEpic ? ' is-epic' : ''}${K.sel === c.key ? ' on' : ''}" draggable="true" data-kbcard="${esc(c.key)}" style="--kb-pc:${prioColor(c.priority)}">`;
    h += `<div class="kb-top"><span class="kb-type" style="background:${t.color}">${esc(t.ko)}</span><span class="kb-key">${esc(c.key)}</span>`;
    if (ss.length) h += `<span class="kb-ai" title="${esc(tr('연결된 AI 세션') + ': ' + ss.map((s) => s.title || s.id).join(', '))}">🤖 ${esc(ss.map((s) => code(s.id)).filter(Boolean).join(' '))}</span>`;
    h += `</div>`;
    if (ep) h += `<div class="kb-epic" style="--kb-ec:${epicColor(ep)}" title="${esc(tr('에픽') + ' · ' + ep.key + ' ' + ep.title)}"><i></i><span>${esc(ep.title)}</span></div>`;
    h += `<div class="kb-title">${esc(c.title)}</div>`;
    if ((c.labels || []).length) h += `<div class="kb-labels">${c.labels.map((l) => { const bg = safeColor(l.color, '#d9cfc1'); return `<span class="kb-lb" style="background:${bg};color:${inkOn(bg)}">${esc(l.name)}</span>`; }).join('')}</div>`;
    if (isEpic) {
      const kids = K.list.filter((x) => x !== c && epicOf(x) === c), dn = kids.filter((x) => x.done).length;
      h += `<div class="kb-kids">${esc(tr('하위 카드 {0}개 · 완료 {1}', kids.length, dn))}</div>`;
    }
    h += `<div class="kb-prog" title="${esc(tr('진척도 {0}%', prog))}"><span style="width:${prog}%"></span></div>`;
    h += `<div class="kb-meta">`;
    if (c.priority) h += `<span class="kb-prio" style="background:${prioColor(c.priority)}">${esc(prioName(c.priority))}</span>`;
    h += `<span class="kb-pct">${prog}%</span>`;
    if (c.checklist && c.checklist.total) h += `<span title="${esc(tr('체크리스트'))}">☑ ${+c.checklist.done || 0}/${+c.checklist.total}</span>`;
    if (c.commentCount) h += `<span title="${esc(tr('댓글'))}">💬 ${+c.commentCount}</span>`;
    if (c.storyPoints != null && c.storyPoints !== '') h += `<span class="kb-sp" title="${esc(tr('스토리 포인트'))}">${esc(String(c.storyPoints))}P</span>`;
    if (c.done) h += `<span class="kb-done" title="${esc(tr('완료일'))}">✔ ${esc(c.completedDate || tr('완료'))}</span>`;
    else if (c.dueDate) h += `<span class="kb-due${c.overdue ? ' late' : ''}" title="${esc(tr('마감'))}">📅 ${esc(String(c.dueDate).slice(5))}${c.overdue ? ' ' + esc(tr('({0}일 지남)', daysOver(c.dueDate))) : ''}</span>`;
    h += avatar(c.assignee) + `</div></div>`;
    return h;
  }
  function laneHead(l, n, collapsed) {
    let h = `<div class="kb-laneh" data-kblt="${esc(l.key)}" role="button" tabindex="0" aria-expanded="${collapsed ? 'false' : 'true'}"><span class="kb-caret">▾</span>`;
    if (l.user) h += avatar(l.user, 'kb-av sm');
    else if (l.epic) h += `<i class="kb-dot" style="background:${epicColor(l.epic)}"></i>`;
    else if (l.color) h += `<i class="kb-dot" style="background:${l.color}"></i>`;
    h += `<b>${esc(l.label)}</b>`;
    if (l.epic) h += `<span class="kb-key">${esc(l.epic.key)}</span>`;
    h += `<span class="kb-lcount">${n}</span>`;
    if (l.epic) {
      const kids = K.list.filter((x) => x !== l.epic && epicOf(x) === l.epic), dn = kids.filter((x) => x.done).length, p = kids.length ? Math.round((dn / kids.length) * 100) : pct(l.epic.progress);
      h += `<span class="kb-lprog" title="${esc(tr('하위 카드 {0}개 중 {1}개 완료', kids.length, dn))}"><span><i style="width:${p}%;background:${epicColor(l.epic)}"></i></span>${dn}/${kids.length} · ${p}%</span>`;
    }
    if (l.sprint && l.sprint.state) h += `<span class="kb-key">${esc(l.sprint.state)}</span>`;
    if (!n) h += `<span class="muted">${tr('비어 있음')}</span>`;
    return h + `</div>`;
  }
  function cellHtml(col, l, cards) {
    const id = String(col.id), k = l.key, adding = K.adding === id + '|' + k;
    let h = `<div class="kb-cell" data-kbcol="${esc(id)}" data-kblane="${esc(k)}">${cards.map(cardHtml).join('')}`;
    if (adding) h += `<div class="kb-addbox"><input class="mg-in" data-kbaddin placeholder="${esc(tr('제목 입력 후 Enter'))}" value="${esc(K.draft.add || '')}" maxlength="200"><div class="mg-row"><button class="btn sm" data-kb="addgo">${tr('추가')}</button><button class="btn ghost sm" data-kb="addx">${tr('취소')}</button></div></div>`;
    else h += `<button class="kb-add" data-kbadd="${esc(id + '|' + k)}">＋ ${tr('카드 추가')}</button>`;
    return h + `</div>`;
  }
  function headHtml(col, vis, total) {
    const id = String(col.id), w = wipOf(col), over = w.max != null && total > w.max, under = w.min != null && total < w.min;
    let h = `<div class="kb-colh${over ? ' over' : under ? ' under' : ''}" data-kbhead="${esc(id)}"><div class="kb-colt"><b title="${esc(col.name)}">${esc(col.name)}</b><span class="kb-cnt" title="${esc(tr('보이는 카드 {0} · 전체 {1}', vis, total))}">${vis}</span>`;
    if (w.max != null) h += `<span class="kb-wip${over ? ' bad' : ''}" title="${esc(tr('전체 {0}장 · 최대 {1}', total, w.max))}">${tr('최대 {0}', w.max)}</span>`;
    if (w.min != null) h += `<span class="kb-wip${under ? ' warn' : ''}" title="${esc(tr('전체 {0}장 · 최소 {1}', total, w.min))}">${tr('최소 {0}', w.min)}</span>`;
    h += `<button class="kb-wipbtn" data-kbwip="${esc(id)}" title="${esc(tr('WIP 한도 설정'))}" aria-label="${esc(tr('WIP 한도 설정'))}">⚙</button></div>`;
    if (K.wipEdit === id) {
      const loc = V.wip[id] || {};
      h += `<div class="kb-wipedit">${w.api ? `<small>${tr('보드 설정 값이 있어 그 값이 우선이에요')}</small>` : `<small>${tr('이 브라우저에만 저장돼요')}</small>`}<div class="mg-row"><label>${tr('최소')} <input type="number" min="0" class="mg-in" data-kbwipmin value="${loc.min != null ? +loc.min : ''}"></label><label>${tr('최대')} <input type="number" min="0" class="mg-in" data-kbwipmax value="${loc.max != null ? +loc.max : ''}"></label></div><div class="mg-row"><button class="btn sm" data-kb="wipsave">${tr('저장')}</button><button class="btn ghost sm" data-kb="wipclear">${tr('지우기')}</button><button class="btn ghost sm" data-kb="wipx">${tr('닫기')}</button></div></div>`;
    }
    return h + `</div>`;
  }
  const seg = (name, opts, cur) => `<span class="kb-seg">${opts.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-kbset="${name}" data-v="${esc(v)}">${tr(l)}</button>`).join('')}</span>`;
  const tog = (name, label, title) => `<button class="mg-act${V[name] ? ' on' : ''}" data-kbset="${name}"${title ? ` title="${esc(tr(title))}"` : ''}>${tr(label)}</button>`;
  function toolsHtml(shown) {
    let h = `<div class="kb-tools"><select data-kbproj aria-label="${esc(tr('보드'))}">${K.projects.map((p) => `<option value="${esc(p.key)}" ${p.key === K.project ? 'selected' : ''}>${esc(p.name)} (${esc(p.key)})</option>`).join('')}</select>`;
    h += `<input class="mg-search kb-q" data-kbq placeholder="🔎 ${esc(tr('제목 · 번호 · 라벨 검색'))}" value="${esc(V.q)}">`;
    h += `<span class="kb-newrow"><input class="mg-in wide" data-kbnew placeholder="${esc(tr('새 카드 제목'))}" value="${esc(K.draft.nw || '')}" maxlength="200"><button class="btn sm" data-kb="new">➕ ${tr('카드')}</button></span>`;
    const nf = activeFilters();
    h += `<button class="btn ghost sm kb-ftog${K.fOpen ? ' on' : ''}" data-kb="ftog">🎛 ${tr('필터')}${nf ? ` <b class="kb-nf">${nf}</b>` : ''}</button>`;
    h += `<button class="btn ghost sm" data-kb="reload" title="${esc(tr('새로고침'))}">↻</button><button class="btn ghost sm ${K.setOpen ? 'on' : ''}" data-kb="settings">⚙️ <span class="kb-hide-s">${tr('연동 설정')}</span></button><span class="mg-n">${tr('{0} / {1}장', shown, K.list.length)}</span></div>`;
    // 필터 · 보기 줄
    h += `<div class="kb-filters${K.fOpen ? ' open' : ''}">`;
    h += `<label class="kb-fl">${tr('스윔레인')} <select data-kbsel="group">${GROUPS.map(([v, l]) => `<option value="${v}" ${V.group === v ? 'selected' : ''}>${tr(l)}</option>`).join('')}</select></label>`;
    h += `<span class="kb-fl">${tr('에픽 카드')} ${seg('epics', [['hide', '숨기기'], ['all', '보기'], ['only', '에픽만']], V.epics)}</span>`;
    h += `<span class="kb-fl">${tr('카드 크기')} ${seg('density', DENS, V.density)}</span>`;
    h += `<span class="kb-sep"></span>`;
    h += K.me ? tog('mine', '🙋 내 일만') : `<button class="mg-act" disabled title="${esc(tr('내 계정 정보를 불러오지 못했어요'))}">🙋 ${tr('내 일만')}</button>`;
    const us = userList();
    if (us.length) h += `<span class="kb-avs">${us.map((u) => `<button class="kb-avf${V.who === String(u.id) ? ' on' : ''}" data-kbset="who" data-v="${esc(String(u.id))}" title="${esc(tr('{0} 님 카드만', u.name || u.username || ''))}" style="background:${userColor(u.id)}">${esc(initials(u.name || u.username))}</button>`).join('')}<button class="kb-avf none${V.who === '_none' ? ' on' : ''}" data-kbset="who" data-v="_none" title="${esc(tr('미배정 카드만'))}">?</button></span>`;
    h += `<select data-kbsel="type" aria-label="${esc(tr('유형'))}"><option value="">${tr('유형 전체')}</option>${TYPES.map(([id]) => `<option value="${id}" ${V.type === id ? 'selected' : ''}>${esc(typeInfo(id).ko)}</option>`).join('')}</select>`;
    h += `<select data-kbsel="prio" aria-label="${esc(tr('우선순위'))}"><option value="">${tr('우선순위 전체')}</option>${K.priorities.map((p) => `<option value="${esc(String(p.id))}" ${V.prio === String(p.id) ? 'selected' : ''}>${esc(prioName(p.id))}</option>`).join('')}</select>`;
    if (K.labels.length) h += `<select data-kbsel="label" aria-label="${esc(tr('라벨'))}"><option value="">${tr('라벨 전체')}</option>${K.labels.map((l) => `<option value="${esc(String(l.id))}" ${V.label === String(l.id) ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>`;
    h += tog('hideDone', '✔ 완료 숨기기') + tog('ai', '🤖 AI 세션 연결된 카드만', 'AI OFFICE 세션과 연결된 카드만 보여요');
    if (V.group !== 'none') h += tog('hideEmpty', '빈 레인 숨기기');
    if (nf) h += `<button class="mg-act kb-reset" data-kb="reset">✕ ${tr('필터 초기화')}</button>`;
    return h + `</div>`;
  }
  function boardHtml() {
    if (K.loading && !K.list.length) return `<div class="loading">${tr('칸반 불러오는 중…')}</div>`;
    if (K.err) return `<div class="mg-err">⚠️ ${tr('칸반을 불러오지 못했어요')}: ${esc(K.err)}<br><button class="btn sm" data-kb="reload">↻ ${tr('다시')}</button> <button class="btn ghost sm" data-kb="settings">⚙️ ${tr('연동 설정')}</button></div>`;
    if (!K.hasToken) return `<div class="mg-err">🔑 ${tr('FlowBoard 토큰이 없어요. 연동 설정에서 토큰을 넣어 주세요.')}</div>` + settingsHtml();
    reindex();
    const cs = cols(), onBoard = new Set(cs.map((c) => String(c.id)));
    const vis = visible().filter((c) => c.status && onBoard.has(String(c.status.id)));
    const visCount = {}, totCount = {};
    for (const c of vis) visCount[c.status.id] = (visCount[c.status.id] || 0) + 1;
    for (const c of K.list) if (c.status && (V.epics !== 'hide' || c.type !== 'Epic')) totCount[c.status.id] = (totCount[c.status.id] || 0) + 1;
    let h = toolsHtml(vis.length);
    if (K.setOpen) h += settingsHtml();
    if (!cs.length) return h + `<div class="loading">${tr('보드에 표시할 칸이 없어요')}</div>`;
    h += `<div class="kb-jump" role="tablist">${cs.map((c, i) => `<button data-kbjump="${i}">${esc(c.name)} <b>${visCount[c.id] || 0}</b></button>`).join('')}</div>`;
    h += `<div class="kb-wrap${K.sel ? ' has-detail' : ''}"><div class="kb-board mg-scroll dens-${esc(V.density)}${V.group === 'none' ? ' flat' : ''}" style="--kb-cols:${cs.length}"><div class="kb-in">`;
    h += `<div class="kb-heads">${cs.map((c) => headHtml(c, visCount[c.id] || 0, totCount[c.id] || 0)).join('')}</div>`;
    let shown = 0;
    for (const l of lanes(vis)) {
      const n = l.cards.length;
      if (V.group !== 'none' && !n && V.hideEmpty) continue;
      shown++;
      const ck = V.group + ':' + l.key, collapsed = l.label != null && (V.collapsed[ck] != null ? V.collapsed[ck] : !n);
      h += `<section class="kb-lane${collapsed ? ' collapsed' : ''}${l.label == null ? ' solo' : ''}">`;
      if (l.label != null) h += laneHead(l, n, collapsed);
      if (!collapsed) h += `<div class="kb-row">${cs.map((col) => cellHtml(col, l, l.cards.filter((c) => String(c.status.id) === String(col.id)))).join('')}</div>`;
      h += `</section>`;
    }
    if (!shown) h += `<div class="loading">${tr('조건에 맞는 카드가 없어요')}</div>`;
    h += `</div></div>${K.sel ? detailHtml() : ''}</div>`;
    return h;
  }
  function detailHtml() {
    const c = K.detail;
    if (!c) return `<div class="kb-detail"><div class="loading">${tr('불러오는 중…')}</div></div>`;
    const ss = linkedTo(c.key), t = typeInfo(c.type);
    const opt = (v, cur, label) => `<option value="${esc(String(v))}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
    let h = `<div class="kb-detail mg-scroll"><div class="kb-dh"><span class="kb-type" style="background:${t.color}">${esc(t.ko)}</span><span class="kb-key">${esc(c.key)}</span><a href="${esc(/^https?:\/\//i.test(c.webUrl || '') ? c.webUrl : '#')}" target="_blank" rel="noopener" class="muted">FlowBoard ↗</a><button class="mg-x" data-kb="close" aria-label="${esc(tr('닫기'))}">✕</button></div>`;
    h += `<input class="kb-dtitle" data-kbf="title" value="${esc(c.title)}">`;
    const parent = c.parentId != null ? byId.get(String(c.parentId)) : null;
    const eps = epics().filter((e) => e.key !== c.key);
    h += `<div class="kb-grid">`;
    h += `<label>${tr('상태')}<select data-kbf="status">${K.statuses.map((s) => opt(s.id, c.status && c.status.id, s.name)).join('')}</select></label>`;
    h += `<label>${tr('우선순위')}<select data-kbf="priority">${K.priorities.map((p) => opt(p.id, c.priority, prioName(p.id))).join('')}</select></label>`;
    h += `<label>${tr('담당')}<select data-kbf="assignee"><option value="">${tr('미배정')}</option>${K.users.map((u) => `<option value="${esc(u.username || u.id)}" ${c.assignee && String(c.assignee.id) === String(u.id) ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label>`;
    h += `<label>${tr('유형')}<select data-kbf="type">${TYPES.map(([id]) => opt(id, c.type || 'Task', typeInfo(id).ko)).join('')}</select></label>`;
    h += `<label>${tr('마감')}<input type="date" data-kbf="dueDate" value="${esc(c.dueDate || '')}"></label>`;
    h += `<label>${tr('스토리 포인트')}<input type="number" min="0" step="0.5" data-kbf="storyPoints" value="${c.storyPoints != null ? esc(String(c.storyPoints)) : ''}"></label>`;
    if (c.type !== 'Epic') h += `<label class="span2">${tr('에픽 (상위)')}<select data-kbf="parentId"><option value="">${tr('— 에픽 없음 —')}</option>${eps.map((e) => opt(e.id, c.parentId, e.key + ' · ' + e.title)).join('')}${parent && parent.type !== 'Epic' ? opt(parent.id, c.parentId, parent.key + ' · ' + parent.title) : ''}</select></label>`;
    if (K.sprints.length || c.sprint) h += `<label class="span2">${tr('스프린트')}<select data-kbf="sprintId"><option value="">${tr('— 백로그 —')}</option>${K.sprints.map((s) => opt(s.id, c.sprint && c.sprint.id, s.name)).join('')}${c.sprint && !K.sprints.some((s) => String(s.id) === String(c.sprint.id)) ? opt(c.sprint.id, c.sprint.id, c.sprint.name) : ''}</select></label>`;
    h += `</div>`;
    if (K.labels.length || (c.labels || []).length) {
      const on = new Set((c.labels || []).map((l) => String(l.id)));
      const all = K.labels.length ? K.labels : c.labels;
      h += `<div class="kb-lbed"><span class="kb-lbt">🏷 ${tr('라벨')}</span>${all.map((l) => { const bg = safeColor(l.color, '#d9cfc1'), sel = on.has(String(l.id)); return `<button class="kb-lb${sel ? ' on' : ''}" data-kblabel="${esc(String(l.id))}" aria-pressed="${sel}" style="${sel ? `background:${bg};color:${inkOn(bg)}` : `--kb-lc:${bg}`}">${sel ? '✓ ' : ''}${esc(l.name)}</button>`; }).join('')}</div>`;
    }
    h += `<div class="kb-progrow"><span>${tr('진척도')}</span><input type="range" min="0" max="100" step="5" value="${pct(c.progress)}" data-kbf="progress"><b>${pct(c.progress)}%</b><span class="muted">⏱ ${(+c.spentHours || 0).toFixed(1)}h</span></div>`;
    h += `<details open><summary>${tr('설명')}</summary><textarea class="mg-ta" data-kbf="description">${esc(c.description || '')}</textarea><button class="btn ghost sm" data-kb="savedesc">${tr('설명 저장')}</button></details>`;
    h += `<div class="kb-sec"><b>🤖 ${tr('연결된 세션')}</b>${ss.map((s) => `<span class="mg-chip">${esc(code(s.id))} ${esc(s.title || '')} <button class="it-btn" data-kbunlink="${esc(s.id)}" aria-label="${esc(tr('연결 끊기'))}">✕</button></span>`).join('') || `<span class="muted">${tr('없음')}</span>`}<div class="mg-row"><select data-kblinksel><option value="">${tr('— 세션 골라 연결 —')}</option>${sessions().filter((s) => s.kind !== 'app').map((s) => `<option value="${esc(s.id)}">${esc(code(s.id))} ${esc(s.title || '')}</option>`).join('')}</select><button class="btn ghost sm" data-kb="link">🔗 ${tr('연결')}</button><button class="btn ghost sm" data-kb="timer">⏱️ ${tr('이 카드로 업무타이머')}</button></div></div>`;
    h += `<div class="kb-sec"><b>☑ ${tr('체크리스트')}</b>${(c.checklistItems || []).map((it) => `<label class="kb-chk"><input type="checkbox" data-kbchk="${esc(it.id)}" ${it.done ? 'checked' : ''}> ${esc(it.text)}</label>`).join('')}<div class="mg-row"><input class="mg-in wide" data-kbchknew placeholder="${esc(tr('항목 추가'))}" value="${esc(K.draft.chk || '')}"><button class="btn ghost sm" data-kb="chkadd">➕</button></div></div>`;
    h += `<div class="kb-sec"><b>💬 ${tr('댓글')}</b>${(c.comments || []).slice().reverse().map((m) => `<div class="kb-cm"><small>${esc(m.author ? m.author.name : '')} · ${esc(String(m.createdAt || '').slice(0, 16).replace('T', ' '))}${m.via === 'api' ? ' · API' : ''}</small><div>${esc(m.text)}</div></div>`).join('') || `<span class="muted">${tr('없음')}</span>`}<textarea class="mg-ta" data-kbcm placeholder="${esc(tr('댓글 쓰기'))}">${esc(K.draft.cm || '')}</textarea><button class="btn sm" data-kb="comment">${tr('댓글 달기')}</button></div>`;
    h += `<details class="kb-sec"><summary>📜 ${tr('활동 이력')}</summary>${(c.activity || []).map((a) => `<div class="kb-act"><small>${esc(String(a.createdAt || '').slice(0, 16).replace('T', ' '))}</small> ${esc(a.text)}</div>`).join('')}</details></div>`;
    return h;
  }
  function settingsHtml() {
    const c = K.cfg || {};
    const sm = c.statusMap || {};
    const opts = (v) => `<option value="">${tr('— 바꾸지 않음 —')}</option>` + (K.statuses.length ? K.statuses : [{ id: 'In Progress', name: 'In Progress' }, { id: 'In Review', name: 'In Review' }, { id: 'Pending', name: 'Pending' }, { id: 'Done', name: 'Done' }]).map((s) => `<option value="${esc(s.name)}" ${v === s.name || v === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
    let h = `<div class="bd-sec kb-set"><h3>⚙️ ${tr('FlowBoard 연동 설정')}</h3><div class="mg-row"><span class="mg-lbl">API</span><input class="mg-in wide" data-kbc="base" value="${esc(c.base || '')}"><span class="mg-lbl">${tr('토큰')}</span><input class="mg-in" type="password" data-kbc="token" placeholder="${K.hasToken ? tr('설정됨 — 바꿀 때만 입력') : 'fbt_…'}" autocomplete="off"></div>`;
    h += `<div class="mg-row"><span class="mg-lbl">${tr('기본 보드')}</span><select data-kbc="project">${K.projects.map((p) => `<option value="${esc(p.key)}" ${c.project === p.key ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select><label class="mg-chk"><input type="checkbox" data-kbc="autoSync" ${c.autoSync ? 'checked' : ''}> ${tr('연결된 카드 자동 갱신')}</label><label class="mg-chk"><input type="checkbox" data-kbc="autoCreate" ${c.autoCreate ? 'checked' : ''}> ${tr('새 세션마다 카드 자동 생성')}</label><label class="mg-chk"><input type="checkbox" data-kbc="checklist" ${c.checklist ? 'checked' : ''}> ${tr('세션 할 일 → 체크리스트')}</label></div>`;
    h += `<div class="mg-row">${[['status', '상태 바뀔 때 댓글'], ['prompt', '새 요청 댓글'], ['done', '완료 요약 댓글']].map(([k, l]) => `<label class="mg-chk"><input type="checkbox" data-kbcc="${k}" ${(c.comments || {})[k] ? 'checked' : ''}> ${tr(l)}</label>`).join('')}</div>`;
    h += `<div class="mg-row wh-cols">${[['working', '작업중'], ['review', '결정 필요'], ['done', '응답 완료'], ['idle', '대기'], ['stopped', '중단'], ['closed', '세션 종료']].map(([k, l]) => `<label><small>${tr(l)} →</small><select data-kbsm="${k}">${opts(sm[k])}</select></label>`).join('')}</div>`;
    h += `<div class="mg-row"><button class="btn sm" data-kb="savecfg">💾 ${tr('저장')}</button></div>`;
    h += `<table class="mg-table"><tbody>${(K.history || []).slice(0, 8).map((x) => `<tr><td>${x.ok ? '✅' : '⚠️'} ${esc(x.key)}</td><td><small>${esc(x.what || '')} ${esc(x.error || '')} · ${esc(new Date(x.at).toLocaleTimeString())}</small></td></tr>`).join('') || `<tr><td class="muted">${tr('아직 자동 갱신 기록이 없어요')}</td></tr>`}</tbody></table></div>`;
    return h;
  }
  const KEEP = ['data-kbq', 'data-kbnew', 'data-kbaddin', 'data-kbchknew', 'data-kbcm', 'data-kbwipmin', 'data-kbwipmax'];
  function paint(soft) {
    if (!host || !document.body.contains(host)) return;
    const sc = host.querySelector('.kb-board'), sd = host.querySelector('.kb-detail'), fl = host.querySelector('.kb-filters');
    const a = sc ? sc.scrollLeft : 0, b = sc ? sc.scrollTop : 0, d = sd ? sd.scrollTop : 0, f = fl ? fl.scrollLeft : 0;
    const ae = document.activeElement, fa = ae && host.contains(ae) ? KEEP.find((x) => ae.hasAttribute(x)) : null;
    const sel = fa && typeof ae.selectionStart === 'number' ? [ae.selectionStart, ae.selectionEnd] : null;
    const html = boardHtml();
    const tools = soft ? host.querySelector(':scope > .kb-tools') : null;
    if (tools) {
      // 검색어 입력 중: 검색칸(한글 조합 중일 수 있음)은 그대로 두고 나머지만 다시 그린다
      const tmp = document.createElement('div'); tmp.innerHTML = html;
      const nt = tmp.querySelector(':scope > .kb-tools');
      if (nt) {
        const n = nt.querySelector('.mg-n'), o = tools.querySelector('.mg-n'); if (n && o) o.textContent = n.textContent;
        const nf = nt.querySelector('.kb-ftog'), of = tools.querySelector('.kb-ftog'); if (nf && of) of.replaceWith(nf);
        nt.remove();
        [...host.children].forEach((ch) => { if (ch !== tools) ch.remove(); });
        tools.after(...tmp.childNodes);
      } else host.innerHTML = html;
    } else host.innerHTML = html;
    const sc2 = host.querySelector('.kb-board'), sd2 = host.querySelector('.kb-detail'), fl2 = host.querySelector('.kb-filters');
    if (sc2) { sc2.scrollLeft = a; sc2.scrollTop = b; } if (sd2) sd2.scrollTop = d; if (fl2) fl2.scrollLeft = f;
    if (fa && !(tools && fa === 'data-kbq')) { const el = host.querySelector(`[${fa}]`); if (el && el !== ae) { el.focus({ preventScroll: true }); if (sel) try { el.setSelectionRange(sel[0], sel[1]); } catch {} } }
    const ad = host.querySelector('[data-kbaddin]'); if (ad && !fa) ad.focus({ preventScroll: true });
    markJump();
  }
  const colX = (sc, el) => sc.scrollLeft + el.getBoundingClientRect().left - sc.getBoundingClientRect().left;
  // 모바일 칸 이동 바: 지금 보이는 칸 강조
  function markJump() {
    const sc = host && host.querySelector('.kb-board'), bar = host && host.querySelector('.kb-jump');
    if (!sc || !bar || !bar.offsetWidth) return;
    const hs = [...sc.querySelectorAll('.kb-colh')];
    let best = 0, bd = Infinity;
    hs.forEach((x, i) => { const dd = Math.abs(colX(sc, x) - sc.scrollLeft); if (dd < bd) { bd = dd; best = i; } });
    if (sc.scrollLeft >= sc.scrollWidth - sc.clientWidth - 2) best = hs.length - 1;
    [...bar.children].forEach((x, i) => { x.classList.toggle('on', i === best); x.setAttribute('aria-selected', i === best ? 'true' : 'false'); if (i === best && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = x.offsetLeft - (bar.clientWidth - x.offsetWidth) / 2; });
  }

  // ---------------------------------------------------------------- 이벤트
  async function createCard(body, okMsg) {
    const j = await req('/issues', 'POST', { project: K.project, ...body });
    toast(okMsg || tr('➕ {0} 만들었어요', j.data.key));
    K.list.unshift(j.data); K.cards.set(j.data.key, j.data);
    return j.data;
  }
  async function onClick(ev) {
    const t = ev.target;
    const card = t.closest('[data-kbcard]');
    if (card && !t.closest('button')) return openDetail(card.dataset.kbcard);
    const lt = t.closest('[data-kblt]');
    if (lt) { const ck = V.group + ':' + lt.dataset.kblt, sec = lt.closest('.kb-lane'); V.collapsed[ck] = !(sec && sec.classList.contains('collapsed')); saveV(); return paint(); }
    const sv = t.closest('[data-kbset]');
    if (sv) {
      const n = sv.dataset.kbset, v = sv.dataset.v;
      if (v == null) V[n] = !V[n];
      else if (n === 'who') V.who = V.who === v ? '' : v;
      else V[n] = v;
      if (n === 'mine' && V.mine) V.who = '';
      if (n === 'who' && V.who) V.mine = false;
      saveV(); return paint();
    }
    const jp = t.closest('[data-kbjump]');
    if (jp) { const sc = host.querySelector('.kb-board'), hd = sc && sc.querySelectorAll('.kb-colh')[+jp.dataset.kbjump]; if (hd) sc.scrollTo({ left: colX(sc, hd) - 2, behavior: 'smooth' }); return; }
    const wp = t.closest('[data-kbwip]');
    if (wp) { K.wipEdit = K.wipEdit === wp.dataset.kbwip ? null : wp.dataset.kbwip; return paint(); }
    const ad = t.closest('[data-kbadd]');
    if (ad) { K.adding = ad.dataset.kbadd; K.draft.add = ''; return paint(); }
    const lb = t.closest('[data-kblabel]');
    if (lb && K.detail) {
      const ids = new Set((K.detail.labels || []).map((l) => String(l.id)));
      if (ids.has(lb.dataset.kblabel)) ids.delete(lb.dataset.kblabel); else ids.add(lb.dataset.kblabel);
      return patchCard(K.detail.key, { labels: [...ids] }, tr('🏷 라벨을 바꿨어요'));
    }
    const b = t.closest('[data-kb],[data-kbunlink]');
    if (!b) return;
    const c = K.detail;
    try {
      if (b.dataset.kbunlink) { await linkApi({ id: b.dataset.kbunlink, key: null }); toast(tr('연결을 끊었어요')); return paint(); }
      switch (b.dataset.kb) {
        case 'reload': return load();
        case 'settings': K.setOpen = !K.setOpen; return paint();
        case 'ftog': K.fOpen = !K.fOpen; return paint();
        case 'reset': Object.assign(V, { q: '', mine: false, who: '', type: '', prio: '', label: '', hideDone: false, ai: false }); saveV(); return paint();
        case 'close': K.sel = null; K.detail = null; return paint();
        case 'new': {
          const v = (K.draft.nw || '').trim(); if (!v) return;
          const d = await createCard({ title: v, assignee: 'me' }); K.draft.nw = ''; return openDetail(d.key);
        }
        case 'addgo': return addGo();
        case 'addx': K.adding = null; return paint();
        case 'wipsave': case 'wipclear': {
          const id = K.wipEdit; if (!id) return;
          const num = (s) => { const x = host.querySelector(s); const n = x && x.value !== '' ? Math.max(0, Math.floor(+x.value)) : null; return Number.isFinite(n) ? n : null; };
          if (b.dataset.kb === 'wipclear') delete V.wip[id];
          else { const mn = num('[data-kbwipmin]'), mx = num('[data-kbwipmax]'); if (mn == null && mx == null) delete V.wip[id]; else V.wip[id] = { min: mn, max: mx }; }
          K.wipEdit = null; saveV(); toast(tr('WIP 한도를 저장했어요')); return paint();
        }
        case 'wipx': K.wipEdit = null; return paint();
        case 'savedesc': return patchCard(c.key, { description: host.querySelector('[data-kbf=description]').value }, tr('설명을 저장했어요'));
        case 'comment': { const v = (K.draft.cm || '').trim(); if (!v) return; await req(`/issues/${encodeURIComponent(c.key)}/comments`, 'POST', { text: v }); K.draft.cm = ''; return openDetail(c.key); }
        case 'chkadd': { const v = (K.draft.chk || '').trim(); if (!v) return; await req(`/issues/${encodeURIComponent(c.key)}/checklist`, 'POST', { text: v }); K.draft.chk = ''; return openDetail(c.key); }
        case 'link': { const sid = host.querySelector('[data-kblinksel]').value; if (!sid) return; await linkApi({ id: sid, key: c.key }); toast(tr('🔗 연결했어요 — 세션 변화가 카드에 자동으로 남아요')); return paint(); }
        case 'timer': startTimer(c.key); return;
        case 'savecfg': {
          const v = (s) => host.querySelector(s);
          const cfg = { base: v('[data-kbc=base]').value.trim(), project: v('[data-kbc=project]') ? v('[data-kbc=project]').value : '', autoSync: v('[data-kbc=autoSync]').checked, autoCreate: v('[data-kbc=autoCreate]').checked, checklist: v('[data-kbc=checklist]').checked,
            comments: Object.fromEntries([...host.querySelectorAll('[data-kbcc]')].map((x) => [x.dataset.kbcc, x.checked])), statusMap: Object.fromEntries([...host.querySelectorAll('[data-kbsm]')].map((x) => [x.dataset.kbsm, x.value])) };
          const tok = v('[data-kbc=token]').value.trim();
          await cfgCall({ cfg, ...(tok ? { token: tok } : {}) }); toast(tr('💾 연동 설정을 저장했어요')); return load();
        }
      }
    } catch (e) { toast('⚠️ ' + e.message); }
  }
  let addBusy = false;
  async function addGo() {
    const v = (K.draft.add || '').trim(); if (!v || !K.adding || addBusy) return;
    const [col, lane] = K.adding.split('|');
    addBusy = true;
    try { await createCard({ title: v, status: col, ...lanePreset(lane) }); K.draft.add = ''; K.adding = null; }
    catch (e) { toast('⚠️ ' + tr('카드를 만들지 못했어요: {0}', e.message)); }
    addBusy = false; paint();
  }
  function onChange(ev) {
    const t = ev.target;
    if (t.dataset.kbproj != null) { K.project = t.value; try { localStorage.setItem('aio.kb.project', K.project); } catch {} K.sel = null; K.detail = null; K.adding = null; return load(); }
    if (t.dataset.kbsel) { V[t.dataset.kbsel] = t.value; K.adding = null; saveV(); return paint(); }
    if (t.dataset.kbchk) { req(`/issues/${encodeURIComponent(K.detail.key)}/checklist/${encodeURIComponent(t.dataset.kbchk)}`, 'PATCH', { done: t.checked }).then(() => openDetail(K.detail.key)).catch((e) => toast('⚠️ ' + e.message)); return; }
    const f = t.dataset.kbf;
    if (!f || !K.detail || f === 'description') return;
    let v = t.value;
    if (f === 'progress') v = +v;
    if (f === 'assignee' || f === 'dueDate' || f === 'parentId' || f === 'sprintId') v = v || null;
    if (f === 'storyPoints') { v = v === '' ? null : +v; if (v != null && !Number.isFinite(v)) return; }
    if (f === 'title' && !v.trim()) return;
    patchCard(K.detail.key, { [f]: v }, tr('저장했어요'));
  }
  let qT = null;
  function onInput(ev) {
    const t = ev.target, d = t.dataset;
    if (d.kbq != null) { V.q = t.value; clearTimeout(qT); qT = setTimeout(() => { saveV(); paint(true); }, 180); return; }
    if (d.kbnew != null) K.draft.nw = t.value;
    if (d.kbaddin != null) K.draft.add = t.value;
    if (d.kbchknew != null) K.draft.chk = t.value;
    if (d.kbcm != null) K.draft.cm = t.value;
    if (d.kbf === 'progress') { const b = t.parentElement.querySelector('b'); if (b) b.textContent = t.value + '%'; }
  }
  function onKey(ev) {
    const d = ev.target.dataset || {};
    if (ev.isComposing || ev.keyCode === 229) return;
    if (ev.key === 'Enter' && d.kbaddin != null) { ev.preventDefault(); addGo(); }
    else if (ev.key === 'Escape' && d.kbaddin != null) { K.adding = null; paint(); }
    else if (ev.key === 'Enter' && d.kbnew != null) { ev.preventDefault(); host.querySelector('[data-kb=new]').click(); }
    else if (ev.key === 'Enter' && d.kbchknew != null) { ev.preventDefault(); host.querySelector('[data-kb=chkadd]').click(); }
    else if ((ev.key === 'Enter' || ev.key === ' ') && d.kblt != null) { ev.preventDefault(); ev.target.click(); }
    else if (ev.key === 'Escape' && K.sel && !/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) { K.sel = null; K.detail = null; paint(); }
  }
  // 끌어다 놓기: 칸 사이 = 상태, 레인 사이 = 레인 기준 필드(담당자·우선순위·유형·에픽·스프린트)
  let dragKey = null;
  const clearDrop = () => host && host.querySelectorAll('.kb-cell.drop').forEach((x) => x.classList.remove('drop'));
  function bindDnD(el) {
    el.addEventListener('dragstart', (ev) => { const c = ev.target.closest && ev.target.closest('[data-kbcard]'); if (!c) return; dragKey = c.dataset.kbcard; c.classList.add('dragging'); ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', dragKey); } catch {} });
    el.addEventListener('dragend', (ev) => { const c = ev.target.closest && ev.target.closest('[data-kbcard]'); if (c) c.classList.remove('dragging'); clearDrop(); dragKey = null; });
    el.addEventListener('dragover', (ev) => { const cell = dragKey && ev.target.closest('[data-kbcol]'); if (!cell) return; ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; if (!cell.classList.contains('drop')) { clearDrop(); cell.classList.add('drop'); } });
    el.addEventListener('dragleave', (ev) => { const c = ev.target.closest('[data-kbcol]'); if (c && !c.contains(ev.relatedTarget)) c.classList.remove('drop'); });
    el.addEventListener('drop', (ev) => { const cell = ev.target.closest('[data-kbcol]'); if (!cell || !dragKey) return; ev.preventDefault(); const key = dragKey; dragKey = null; clearDrop(); moveCard(key, cell.dataset.kbcol, cell.dataset.kblane); });
    el.addEventListener('scroll', (ev) => { if (ev.target.classList && ev.target.classList.contains('kb-board')) { clearTimeout(jT); jT = setTimeout(markJump, 80); } }, true);
  }
  let jT = null;
  async function moveCard(key, colId, laneKey) {
    const c = K.list.find((x) => x.key === key); if (!c) return;
    const patch = {}, local = {};
    if (!c.status || String(c.status.id) !== colId) {
      const col = K.statuses.find((s) => String(s.id) === colId) || { id: colId, name: colId };
      patch.status = col.id; local.status = { id: col.id, name: col.name, doneOnly: !!col.doneOnly };
      if (col.doneOnly) local.done = true;
    }
    if (V.group !== 'none' && laneKey && laneKey !== '_all' && laneKey !== laneOf(c)) {
      const ch = laneChange(c, laneKey);
      if (ch) { Object.assign(patch, ch[0]); Object.assign(local, ch[1]); }
      else toast(tr(c.type === 'Epic' && V.group === 'epic' ? '에픽 카드는 다른 에픽 아래로 옮길 수 없어요' : '이 레인으로는 옮길 수 없어서 상태만 바꿨어요'));
    }
    if (!Object.keys(patch).length) return paint();
    const snap = { ...c };
    Object.assign(c, local); paint();
    try {
      const j = await req(`/issues/${encodeURIComponent(key)}`, 'PATCH', patch);
      mergeList(j.data); K.cards.set(key, { ...(K.cards.get(key) || {}), ...j.data });
      if (K.sel === key && K.detail) K.detail = { ...K.detail, ...j.data };
      toast(tr('➡️ {0} 옮겼어요', key));
    } catch (e) {
      for (const k of Object.keys(c)) delete c[k];
      Object.assign(c, snap);
      toast('⚠️ ' + tr('옮기지 못해 되돌렸어요: {0}', e.message));
    }
    paint();
  }
  async function linkApi(body) {
    const r = await AIO.auth.api('/api/tcc/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
    return j;
  }
  function startTimer(key) { if (!window.Pomodoro) return; try { Pomodoro.startForIssue(key); } catch (e) {} AIO.timer && AIO.timer.open(); }

  AIO.kanban = {
    /** 관리 센터 '칸반' 탭에 그리기 */
    mount(el) {
      host = el;
      if (!el.dataset.kbBound) { el.dataset.kbBound = '1'; el.addEventListener('click', onClick); el.addEventListener('change', onChange); el.addEventListener('input', onInput); el.addEventListener('keydown', onKey); bindDnD(el); }
      if (!K.cfg || !K.list.length) load(); else paint();
    },
    project: () => K.project || (K.cfg && K.cfg.project) || 'aio',
    card: (id) => K.cards.get(id) || null,
    openCard(key) { if (AIO.manage) AIO.manage.open('kanban'); setTimeout(() => openDetail(key), 100); },
    /** 업무타이머 집중 시간 → 카드 작업 시간 + 댓글 */
    async logWork(key, hours, note) {
      try {
        const cur = (await req(`/issues/${encodeURIComponent(key)}`)).data;
        await req(`/issues/${encodeURIComponent(key)}`, 'PATCH', { spentHours: Math.round(((+cur.spentHours || 0) + hours) * 100) / 100 });
        await req(`/issues/${encodeURIComponent(key)}/comments`, 'POST', { text: `⏱️ 업무타이머 ${hours.toFixed(2).replace(/\.?0+$/, '')}h 기록${note ? ' · ' + note : ''} (AI OFFICE)` });
        toast(tr('⏱️ {0} 에 {1}h 기록했어요', key, hours.toFixed(2)));
      } catch (e) { toast('⚠️ ' + e.message); }
    },
    link: linkApi,
    search: async (q) => (await req(`/issues?q=${encodeURIComponent(q)}&compact=1&limit=20${K.project ? '&project=' + encodeURIComponent(K.project) : ''}`)).data,
    startTimer,
  };
})();
