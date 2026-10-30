// Logged-in views: the deep session panel (개요 · 대화 · 진행 · 인사이트 · 팀) and the global insight dashboard.
(function () {
  const esc = AIO.esc;
  const tr = (...a) => AIO.tr(...a);
  const act = (a) => AIO.i18n.act(a?.label, a?.type);
  const typeName = (k) => (TYPE_KO[k] ? tr(TYPE_KO[k]) : k);
  const nf = (n) => { n = Number(n) || 0; return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K' : String(Math.round(n)); };
  const pct = (x) => `${Math.round((Number(x) || 0) * 100)}%`;
  const dur = (ms) => (ms ? AIO.fmtDur(ms) : '-');
  const time = (t) => (t ? AIO.fmtTime(t) : '');
  const TYPE_KO = { read: '읽기', edit: '수정', terminal: '명령', search: '검색', web: '웹', think: '생각', delegate: '위임', meeting: '대화', plan: '계획', ask: '질문', skill: '스킬', publish: '게시', tool: '도구', talk: '답변' };
  const TYPE_COLOR = { read: '#6f9cf0', edit: '#3fb27f', terminal: '#2b2622', search: '#e9a23b', web: '#1f9fb4', think: '#a67be0', delegate: '#d97757', meeting: '#e2667f', plan: '#8b7d6b', ask: '#e5534b', skill: '#5a4fcf', publish: '#0fa3a3', tool: '#9a9a9a', talk: '#b8a58c' };

  // ------------------------------------------------------------ data access
  async function getJSON(path, opts = {}) {
    const demo = AIO.data.isDemo() && AIO.data.demo();
    if (demo) return demoApi(demo, path, opts);
    const r = await AIO.auth.api(path, opts);
    let j = null;
    try { j = await r.json(); } catch {}
    if (!r.ok) { const e = new Error((j && (j.error || j.message)) || `HTTP ${r.status}`); e.status = r.status; throw e; }
    return j;
  }
  const sessionDetail = (id) => getJSON(`/api/session/${encodeURIComponent(id)}/detail`);
  const agentDetail = (sid, aid) => getJSON(`/api/agent/${encodeURIComponent(sid)}/${encodeURIComponent(aid)}`);
  const insights = () => getJSON('/api/insights');
  const summary = (id) => getJSON(`/api/session/${encodeURIComponent(id)}/summary`, { method: 'POST' });

  // ------------------------------------------------------------ tiny charts (HTML/CSS, theme-aware)
  function kpi(label, value, sub) { return `<div class="kpi"><b>${value}</b><span>${esc(label)}</span>${sub ? `<i>${esc(sub)}</i>` : ''}</div>`; }
  function hbars(rows, opts = {}) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return `<div class="hbars">${rows.map((r) => `<div class="hb"><span class="l" title="${esc(r.label)}">${esc(r.label)}</span><span class="track"><span class="fill" style="width:${(r.value / max) * 100}%;background:${r.color || 'var(--accent, #d97757)'}"></span></span><span class="v">${esc(r.text ?? nf(r.value))}</span></div>`).join('')}</div>`;
  }
  function vbars(values, labels, opts = {}) {
    const max = Math.max(1, ...values);
    const now = opts.mark;
    return `<div class="vbars">${values.map((v, i) => `<div class="vb ${i === now ? 'now' : ''}" title="${esc(labels[i])}: ${nf(v)}"><span style="height:${Math.max(2, (v / max) * 100)}%"></span><em>${opts.every && i % opts.every ? '' : esc(labels[i])}</em></div>`).join('')}</div>`;
  }
  function stack(parts) {
    const total = parts.reduce((s, p) => s + p.value, 0) || 1;
    return `<div class="stackbar">${parts.filter((p) => p.value > 0).map((p) => `<span style="width:${(p.value / total) * 100}%;background:${p.color}" title="${esc(p.label)} ${nf(p.value)}"></span>`).join('')}</div><div class="legend">${parts.filter((p) => p.value > 0).map((p) => `<span><i style="background:${p.color}"></i>${esc(p.label)} ${Math.round((p.value / total) * 100)}%</span>`).join('')}</div>`;
  }

  // ------------------------------------------------------------ conversation
  function convItem(it, provider) {
    const t = `<span class="ct">${time(it.t)}</span>`;
    const text = esc(it.text || '');
    const long = (it.text || '').length > 600;
    const body = long ? `<details><summary>${esc((it.text || '').slice(0, 280))}… <u>${tr('더 보기')}</u></summary><div class="full">${text}</div></details>` : text;
    switch (it.role) {
      case 'user': return `<div class="msg user">${t}<div class="b">${body}</div></div>`;
      case 'assistant': return `<div class="msg ai"><div class="av" style="background:${AIO.provider(provider).accent}">${AIO.provider(provider).logo}</div>${t}<div class="b">${body}</div></div>`;
      case 'tool': {
        const tl = it.tool || {};
        return `<div class="msg tool">${t}<span class="ic">${AIO.ACT_ICON[tl.type] || '🔧'}</span><b>${esc(tl.label ? AIO.i18n.act(tl.label, tl.type) : tl.name || '')}</b>${tl.detail ? `<code>${esc(tl.detail)}</code>` : ''}</div>`;
      }
      case 'result': return `<div class="msg result ${it.isError ? 'err' : ''}">${t}<span>${it.isError ? '⚠️' : '↳'}</span><code>${esc((it.text || '').slice(0, 300))}</code></div>`;
      default: return `<div class="msg sys">${t}${body}</div>`;
    }
  }

  // ------------------------------------------------------------ session panel
  const panel = { id: null, tab: 'overview', data: null, timer: null, el: null, conv: 'all', sum: {}, err: null, agent: null, placeBusy: null, placeErr: null };

  function open(el, sessionId, tab) {
    close();
    panel.el = el; panel.id = sessionId; panel.data = null; panel.err = null; panel.agent = null; panel.placeErr = null;
    if (tab) panel.tab = tab;
    el.innerHTML = `<div class="loading">${tr('🧶 대화 기록을 풀어보는 중…')}</div>`;
    refresh();
    panel.timer = setInterval(refresh, 5000);
  }
  function close() { if (panel.timer) clearInterval(panel.timer); panel.timer = null; panel.id = null; }

  async function refresh() {
    const id = panel.id;
    if (!id) return;
    try { const d = await sessionDetail(id); if (panel.id !== id) return; panel.data = d; panel.err = null; }
    catch (e) { if (panel.id !== id) return; panel.err = e; }
    render();
  }

  function render() {
    const el = panel.el, d = panel.data;
    if (!el || !panel.id) return;
    const fa = document.activeElement;   // 메모·직급 입력 중에는 새로 그리지 않는다 (5초 갱신이 입력을 지우지 않게)
    if (fa && el.contains(fa) && /^(INPUT|TEXTAREA|SELECT)$/.test(fa.tagName)) return;
    if (!d) { el.innerHTML = panel.err ? errBox(panel.err) : `<div class="loading">${tr('🧶 대화 기록을 풀어보는 중…')}</div>`; return; }
    const s = d.session || {};
    const pv = AIO.provider(s.provider);
    const st = AIO.status(s.status);
    const convBox = el.querySelector('.conv');
    const stick = !convBox || convBox.scrollHeight - convBox.scrollTop - convBox.clientHeight < 60;
    const prevScroll = convBox ? convBox.scrollTop : 0;
    const tabs = [['overview', '개요'], ['conv', '대화'], ['progress', '진행'], ['insight', '인사이트'], ['team', s.kind === 'harness' ? '팀' : '서브에이전트']].map(([k, l]) => [k, tr(l)]);
    const W = AIO.ui && AIO.ui.world ? AIO.ui.world() : null, live = W && W.sessions ? W.sessions.find((x) => x.id === s.id) : null, pz = (live && live.persona) || s.persona;
    const fid = 'S:' + s.id, fon = window.AIO_follow && window.AIO_follow.id === fid;
    let html = `<button class="d-follow ${fon ? 'on' : ''}" data-follow="${esc(fid)}" title="${esc(tr('카메라가 이 캐릭터를 계속 따라가요 (지도를 끌거나 Esc 면 끝)'))}">🎯 ${esc(tr(fon ? '따라가는 중' : '따라가기'))}</button><div class="d-head"><div class="av" style="background:${pv.accent}">${esc(AIO.ui.code(s.id) || pv.short)}</div><div><h2>${esc(s.title || tr('세션'))}</h2>${pz ? `<div class="d-persona">${esc(pz.flag || '')} <b>${esc(AIO.pname(pz))}</b>${AIO.pname(pz) !== pz.name ? ` <small>${esc(pz.name)}</small>` : ''}${pz.gender === 'F' ? ' ♀' : pz.gender === 'M' ? ' ♂' : ''} · ${esc(tr(pz.country || ''))} · ${tr('{0}세', pz.age)} · ${esc(pz.mbti || '')} · 📍${esc(tr(pz.city || ''))} · ${esc(tr(pz.hobby || ''))}</div>` : ''}<div class="meta">${esc(pv.label)} · ${esc(tr(s.app || ''))}${s.kind === 'harness' ? ` · 🧶 ${tr('하네스')}` : ` · ${tr('단일 세션')}`}${s.model ? ' · ' + esc(s.model) : ''}</div></div></div>`;
    html += `<div class="d-status" style="border-left:4px solid ${st.color}"><div class="big">${AIO.ACT_ICON[s.activity?.type] || st.icon}</div><div><div class="l1">${String(s.activity?.label || '').startsWith(st.ko) ? esc(act(s.activity)) : `${esc(st.label)} · ${esc(act(s.activity))}`}</div><div class="l2">${esc(s.activity?.detail || '')}${s.activity?.since ? ` · ⏱ ${tr('{0}째', dur(Date.now() - s.activity.since))}` : ''}</div></div></div>`;
    html += placeRow(s);
    if (AIO.manage) html += AIO.manage.detailExtras(s);
    if (d.scan && !d.scan.done) html += `<div class="scan">${tr('📚 전체 기록 분석 중… {0}%', Math.round((d.scan.pct || 0) * 100))} <span class="track"><span class="fill" style="width:${(d.scan.pct || 0) * 100}%"></span></span></div>`;
    html += `<div class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${panel.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    html += `<div class="tabbody">${tabBody(d, s)}</div>`;
    el.innerHTML = html;
    const nb = el.querySelector('.conv');
    if (nb) nb.scrollTop = stick ? nb.scrollHeight : prevScroll;
  }

  // ------------------------------------------------------------ jail (police station) / vault (bank) — logged-in only
  const PLACE_BADGE = { jail: '🚔 유치장 수감 중', dungeon: '🐉 비밀던전 봉인 중', vault: '🏦 금고 보관 중', paused: '⏸️ 일시정지', stopped: '🏭 중단' };
  function placeRow(s) {
    if (!AIO.auth.state.authed) return '';
    const badge = PLACE_BADGE[s.place];
    const busy = panel.placeBusy === s.id;
    let h = '<div class="place-row">';
    if (badge) h += `<span class="place-badge ${esc(s.place)}">${tr(badge)}</span>`;
    if (busy) h += `<span class="muted">${tr('옮기는 중…')}</span>`;
    else if (s.placeOverride) h += `<button class="btn ghost sm" data-act="place" data-place="">${tr('🔓 석방 / 꺼내기')}</button>`;
    else h += `<button class="btn ghost sm" data-act="place" data-place="jail">${tr('🚔 유치장 보내기')}</button><button class="btn ghost sm" data-act="place" data-place="vault">${tr('🏦 금고 보관')}</button><button class="btn ghost sm" data-act="place" data-place="dungeon">${tr('🐉 던전 보내기')}</button>`;
    if (panel.placeErr) h += `<span class="err">${esc(tr('옮기지 못했어요: {0}', tr(panel.placeErr)))}</span>`;
    return h + '</div>';
  }
  async function setPlace(place) {
    const id = panel.id;
    if (!id) return;
    panel.placeBusy = id; panel.placeErr = null;
    render();
    try {
      const demo = AIO.data.isDemo() && AIO.data.demo();
      if (demo) {
        // no server in demo mode: move the simulated session directly
        const ds = demo.sessions.find((x) => x.id === id);
        if (ds) { if (place) { ds.placeOverride = place; ds.place = place; } else { delete ds.placeOverride; delete ds.place; } }
      } else {
        const r = await AIO.auth.api('/api/place', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, place: place || null }) });
        let j = {};
        try { j = await r.json(); } catch {}
        if (!r.ok || j.ok === false) throw new Error(j.error || `HTTP ${r.status}`);
      }
    } catch (e) { panel.placeErr = e.message; }
    panel.placeBusy = null;
    if (panel.id === id) refresh();
  }

  function errBox(e) {
    if (e.status === 401) return `<div class="lock">${tr('🔒 로그인이 필요해요.')}<br><small>${tr('로그인하면 대화 내용·진행 요약·인사이트를 볼 수 있어요.')}</small></div>`;
    if (e.status === 404) return `<div class="lock">${tr('🔎 아직 상세 기록을 찾지 못했어요.')}<br><small>${tr('앱 존재만 감지된 세션이거나 기록이 없는 도구예요.')}</small></div>`;
    return `<div class="lock">${tr('⚠️ 상세 정보를 불러오지 못했어요')}<br><small>${esc(tr(e.message))}</small></div>`;
  }

  function tabBody(d, s) {
    const P = d.progress || {}, I = d.insights || {};
    switch (panel.tab) {
      case 'overview': {
        const tk = I.tokens || {}, today = tk.today || {}, tot = tk.total || {};
        const sm = panel.sum[s.id];
        let h = `<div class="d-sec">${tr('🧾 진행 상황 요약')}</div><div class="summary">${esc(P.summary || tr('아직 요약할 만큼 기록이 쌓이지 않았어요.'))}</div>`;
        h += `<div class="ai-sum">${sm?.loading ? `<div class="loading sm">${tr('✨ AI가 요약 중… (로컬 Claude CLI)')}</div>` : sm?.text ? `<div class="summary ai"><b>${tr('✨ AI 요약')}</b> <small>${time(sm.at)}</small><div>${esc(sm.text)}</div></div>` : ''}${sm?.error || sm?.errArg ? `<div class="err">${esc(sm.error ? tr(sm.error) : tr('요약 실패: {0}', tr(sm.errArg)))}</div>` : ''}<button class="btn" data-act="summary">${tr('✨ AI로 자세히 요약하기')}</button></div>`;
        h += `<div class="kpis">${kpi(tr('오늘 출력 토큰'), nf(today.output), tr('입력 {0}', nf((today.input || 0) + (today.cacheRead || 0))))}${kpi(tr('누적 출력 토큰'), nf(tot.output), tr('캐시 {0}', nf(tot.cacheRead)))}${kpi(tr('평균 턴'), dur(I.turnStats?.avgMs), tr('{0}턴', I.turnStats?.count || 0))}${kpi(tr('오류율'), pct(I.errorRate))}${kpi(tr('대표 대기'), dur(I.userWait?.avgMs), tr('{0}회 평균', I.userWait?.count || 0))}${kpi(tr('결정 응답'), dur(I.decisions?.avgMs), tr('{0}회', I.decisions?.count || 0))}</div>`;
        if (d.tips?.length) h += `<div class="d-sec">${tr('💡 인사이트')}</div><ul class="tips">${d.tips.map((x) => `<li>${esc(tr(x))}</li>`).join('')}</ul>`;
        const td = P.todos;
        if (td?.items?.length) h += `<div class="d-sec">${tr('📋 할 일 {0}/{1}', td.done, td.total)}</div><div class="track big"><span class="fill" style="width:${(td.done / Math.max(1, td.total)) * 100}%"></span></div><ul class="todos">${td.items.map((t) => `<li class="${t.status}">${t.status === 'completed' ? '✅' : t.status === 'in_progress' ? '🔄' : '⬜'} ${esc(t.text)}</li>`).join('')}</ul>`;
        if (s.lastPrompt) h += `<div class="d-sec">${tr('📨 마지막 요청')}</div><div class="d-prompt">${esc(s.lastPrompt)}</div>`;
        h += `<div class="d-sec">${tr('🗂️ 정보')}</div><dl class="d-kv"><dt>${tr('프로젝트')}</dt><dd>${esc(s.project || '-')}</dd><dt>${tr('경로')}</dt><dd>${esc(s.cwd || '-')}</dd><dt>${tr('모델')}</dt><dd>${esc(s.model || '-')}${s.effort ? ' · ' + esc(s.effort) : ''}</dd><dt>${tr('권한')}</dt><dd>${esc(s.permissionMode || '-')}</dd><dt>${tr('시작')}</dt><dd>${tr('{0} 전', dur(Date.now() - s.startedAt))}</dd><dt>PID</dt><dd>${esc(s.pid || '-')}</dd></dl>`;
        return h;
      }
      case 'conv': {
        const items = (d.conversation || []).filter((it) => panel.conv === 'all' || (panel.conv === 'talk' ? it.role === 'user' || it.role === 'assistant' : it.role === 'tool' || it.role === 'result'));
        return `<div class="conv-arch" data-sid="${esc(s.id)}"><button class="btn sm" data-mg="archive">📦 ${tr('전체 대화 보기 · 이미지 · 편집 · 내려받기')}</button></div><div class="filters conv-f">${[['all', '전체'], ['talk', '대화만'], ['tools', '도구만']].map(([k, l]) => `<button data-conv="${k}" class="${panel.conv === k ? 'on' : ''}">${tr(l)}</button>`).join('')}<span class="muted">${tr('최근 {0}개', items.length)}</span></div><div class="conv">${items.map((it) => convItem(it, s.provider)).join('') || `<div class="muted">${tr('아직 대화가 없어요')}</div>`}</div>`;
      }
      case 'progress': {
        let h = '';
        const ct = P.currentTurn;
        if (ct) h += `<div class="d-sec">${tr('▶️ 지금 턴')}</div><div class="turn now"><div class="tp">${esc(ct.prompt || '')}</div><div class="tm">${tr('시작 {0} · {1}째 · 도구 {2} · 수정 {3}', time(ct.start), dur(Date.now() - ct.start), ct.tools || 0, ct.edits || 0)}</div></div>`;
        if (P.turns?.length) h += `<div class="d-sec">${tr('🕘 최근 턴')}</div><div class="turns">${P.turns.slice().reverse().map((t) => `<div class="turn"><div class="tp">${esc(t.prompt || '')}</div><div class="tm">${tr('{0} · {1} · 도구 {2} · 수정 {3} · {4}', time(t.start), dur(t.durationMs), t.tools || 0, t.edits || 0, esc(tr({ done: '완료', running: '진행중', interrupted: '중단', waiting: '대기' }[t.outcome] || t.outcome || '')))}</div>${t.lastText ? `<div class="tl">${esc(t.lastText)}</div>` : ''}</div>`).join('')}</div>`;
        if (P.filesTouched?.length) h += `<div class="d-sec">${tr('📁 손댄 파일')}</div><table class="tbl"><tr><th>${tr('파일')}</th><th>${tr('수정')}</th><th>${tr('읽기')}</th><th>${tr('마지막')}</th></tr>${P.filesTouched.map((f) => `<tr><td title="${esc(f.path)}">${esc(String(f.path).split(/[\\/]/).pop())}</td><td>${f.edits || 0}</td><td>${f.reads || 0}</td><td>${time(f.last)}</td></tr>`).join('')}</table>`;
        if (P.commands?.length) h += `<div class="d-sec">${tr('⌨️ 최근 명령')}</div><div class="cmds">${P.commands.slice().reverse().map((c) => `<div class="${c.ok === false ? 'err' : ''}"><span>${time(c.t)}</span><code>${esc(c.cmd)}</code></div>`).join('')}</div>`;
        if (P.errors?.length) h += `<div class="d-sec">${tr('⚠️ 오류')}</div><div class="cmds">${P.errors.slice().reverse().map((e) => `<div class="err"><span>${time(e.t)}</span><code>${esc(e.text)}</code></div>`).join('')}</div>`;
        return h || `<div class="muted">${tr('진행 기록이 아직 없어요')}</div>`;
      }
      case 'insight': {
        let h = '';
        const acts = Object.entries(I.activity || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
        if (acts.length) h += `<div class="d-sec">${tr('🧰 무슨 일을 했나 (도구 호출)')}</div>${stack(acts.map(([k, v]) => ({ label: typeName(k), value: v, color: TYPE_COLOR[k] || '#999' })))}`;
        const at = Object.entries(I.activityTimeMs || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
        if (at.length) h += `<div class="d-sec">${tr('⏱️ 어디에 시간을 썼나')}</div>${hbars(at.map(([k, v]) => ({ label: typeName(k), value: v, text: dur(v), color: TYPE_COLOR[k] })))}`;
        if (I.hourly?.length) h += `<div class="d-sec">${tr('🕐 시간대별 활동')}</div>${vbars(I.hourly, I.hourly.map((_, i) => String(i)), { every: 3, mark: new Date().getHours() })}`;
        if (I.daily?.length) h += `<div class="d-sec">${tr('📅 최근 14일')}</div>${vbars(I.daily.map((x) => x.count), I.daily.map((x) => String(x.date).slice(5)), { every: 2, mark: I.daily.length - 1 })}`;
        const tk = I.tokens?.total;
        if (tk) h += `<div class="d-sec">${tr('🔤 토큰 구성 (누적)')}</div>${stack([{ label: tr('캐시 읽기'), value: tk.cacheRead || 0, color: '#c9bda9' }, { label: tr('입력'), value: tk.input || 0, color: '#6f9cf0' }, { label: tr('캐시 쓰기'), value: tk.cacheWrite || 0, color: '#a67be0' }, { label: tr('출력'), value: (tk.output || 0) - (tk.thinking || 0), color: '#3fb27f' }, { label: tr('생각'), value: tk.thinking || 0, color: '#e9a23b' }])}`;
        const dl = I.delegation;
        if (dl && (dl.leadTools || dl.agentTools)) {
          h += `<div class="d-sec">${tr('👥 위임 균형')}</div><div class="share"><span>${tr('리더 직접 처리')} <b>${pct(dl.leadShare)}</b></span><span class="track big"><span class="fill" style="width:${(dl.leadShare || 0) * 100}%;background:${dl.leadShare > 0.5 ? '#e5534b' : '#3fb27f'}"></span></span><small>${tr('리더 {0} · 팀원 {1}', nf(dl.leadTools), nf(dl.agentTools))}</small></div>`;
          const bt = Object.entries(dl.byType || {}).sort((a, b) => (b[1].tools || 0) - (a[1].tools || 0));
          if (bt.length) h += hbars(bt.map(([k, v]) => ({ label: k, value: v.tools || v.runs || 0, text: tr('{0}회 · 도구 {1}', v.runs || 0, nf(v.tools)), color: '#a67be0' })));
          if (dl.idleMembers?.length) h += `<div class="warn">${tr('😴 최근 7일 호출 0회: {0}', dl.idleMembers.map(esc).join(', '))}</div>`;
        }
        if (I.models && Object.keys(I.models).length) h += `<div class="d-sec">${tr('🧠 사용 모델')}</div>${hbars(Object.entries(I.models).map(([k, v]) => ({ label: k, value: v })))}`;
        if (I.hotFiles?.length) h += `<div class="d-sec">${tr('🔥 가장 많이 고친 파일')}</div>${hbars(I.hotFiles.slice(0, 8).map((f) => ({ label: String(f.path).split(/[\\/]/).pop(), value: f.edits || 0, color: '#3fb27f' })))}`;
        return h || `<div class="muted">${tr('인사이트를 만들 데이터가 아직 부족해요')}</div>`;
      }
      case 'team': {
        let h = '';
        if (s.kind === 'harness' && s.roster?.length) h += `<div class="d-sec">${tr('🧶 팀 명부')}</div><div class="roster">${s.roster.map((r) => { const w = (s.agents || []).filter((a) => a.type === r.name && a.status === 'working'); return `<div class="r"><span class="dot" style="background:${w.length ? '#3fb27f' : '#c9bda9'}"></span><span class="nm">${esc(r.name)}</span><span class="lv">${tr('{0} · {1}회 · Lv.{2}', w.length ? tr('작업중') : tr('대기'), r.runs || 0, r.level || 1)}</span></div>`; }).join('')}</div>`;
        const ag = d.agents || [];
        h += `<div class="d-sec">${tr('🎒 최근 서브에이전트 ({0})', ag.length)}</div>`;
        h += ag.length ? ag.slice().reverse().map((a) => `<details class="agent" ${panel.agent === a.id ? 'open' : ''} data-agent="${esc(a.id)}"><summary><span class="dot" style="background:${a.status === 'working' ? '#3fb27f' : '#c9bda9'}"></span><b>${esc(a.type)}</b> <span class="muted">${esc(a.description || '')}</span><span class="lv">${tr('{0} · 도구 {1} · {2}', a.status === 'working' ? tr('작업중') : tr('완료'), a.tools || 0, time(a.startedAt))}</span></summary>${a.lastText ? `<div class="summary">${esc(a.lastText)}</div>` : ''}<div class="conv mini">${(a.recent || []).map((it) => convItem(it, s.provider)).join('')}</div></details>`).join('') : `<div class="muted">${tr('서브에이전트 기록이 없어요')}</div>`;
        return h;
      }
    }
    return '';
  }

  function onClick(ev) {
    const t = ev.target.closest('[data-tab],[data-conv],[data-act]');
    if (t) {
      if (t.dataset.tab) { panel.tab = t.dataset.tab; render(); }
      else if (t.dataset.conv) { panel.conv = t.dataset.conv; render(); }
      else if (t.dataset.act === 'summary') runSummary();
      else if (t.dataset.act === 'place') setPlace(t.dataset.place || null);
      return;
    }
    const ag = ev.target.closest('details.agent > summary');
    if (ag) panel.agent = ag.parentElement.open ? null : ag.parentElement.dataset.agent;
  }

  async function runSummary() {
    const id = panel.id;
    panel.sum[id] = { loading: true };
    render();
    try { const j = await summary(id); panel.sum[id] = { text: j.summary, at: j.generatedAt || Date.now() }; }
    catch (e) {
      // keep the Korean source so the message follows later language switches
      panel.sum[id] = { error: e.status === 501 ? 'Claude CLI를 찾지 못해 AI 요약을 쓸 수 없어요.'
        : e.status === 503 ? 'Claude CLI 로그인이 필요해요. 터미널에서 claude 를 한 번 실행해 /login 해주세요. (위의 기본 요약은 그대로 쓸 수 있어요)'
        : e.status === 429 ? '다른 요약을 만드는 중이에요. 잠시 후 다시 눌러주세요.' : null, errArg: e.message };
    }
    if (panel.id === id) render();
  }

  // ------------------------------------------------------------ global dashboard
  async function dashboard(el) {
    el.innerHTML = `<div class="loading">${tr('📊 사무실 전체를 집계하는 중…')}</div>`;
    let d;
    try { d = await insights(); } catch (e) { el.innerHTML = errBox(e); return; }
    const T = d.today || {};
    let h = `<div class="dash-head"><h2>${tr('📊 오늘의 AI 사무실 인사이트')}</h2>${d.scan && !d.scan.done ? `<span class="muted">${tr('기록 분석 중 {0}%', Math.round((d.scan.pct || 0) * 100))}</span>` : ''}</div>`;
    h += `<div class="kpis wide">${kpi(tr('출근 세션'), nf(T.sessionsActive))}${kpi(tr('오늘 도구 호출'), nf(T.tools))}${kpi(tr('수정'), nf(T.edits))}${kpi(tr('명령'), nf(T.cmds))}${kpi(tr('요청'), nf(T.prompts))}${kpi(tr('출력 토큰'), nf(T.tokensOut), tr('입력 {0}', nf(T.tokensIn)))}${kpi(tr('결정 응답 평균'), dur(d.decisions?.avgMs), tr('{0}회', d.decisions?.count || 0))}</div>`;
    if (d.tips?.length) h += `<div class="d-sec">${tr('💡 사무실 점검 (고문 AI 한 줄)')}</div><ul class="tips">${d.tips.map((x) => `<li>${esc(tr(x))}</li>`).join('')}</ul>`;
    h += '<div class="dash-grid">';
    if (d.hourlyToday?.length) h += `<section><div class="d-sec">${tr('🕐 오늘 시간대별 처리량')}</div>${vbars(d.hourlyToday, d.hourlyToday.map((_, i) => String(i)), { every: 3, mark: new Date().getHours() })}</section>`;
    if (d.leaderboard?.length) h += `<section><div class="d-sec">${tr('🏆 오늘 가장 바쁜 직원')}</div>${hbars(d.leaderboard.slice(0, 8).map((x) => ({ label: `${AIO.ui.code(x.id) || ''} ${x.title}`, value: x.today, color: AIO.provider(x.provider).accent })))}</section>`;
    if (d.byProject?.length) h += `<section><div class="d-sec">${tr('📁 프로젝트별')}</div>${hbars(d.byProject.slice(0, 8).map((x) => ({ label: x.project || '-', value: x.tools })))}</section>`;
    if (d.byProvider) h += `<section><div class="d-sec">${tr('🤖 AI별')}</div>${hbars(Object.entries(d.byProvider).map(([k, v]) => ({ label: `${AIO.provider(k).label} (${v.sessions})`, value: v.tools, color: AIO.provider(k).accent })))}</section>`;
    if (d.teams?.length) h += `<section><div class="d-sec">${tr('🧶 하네스 팀 위임 균형')}</div>${d.teams.map((tm) => `<div class="share"><span>${esc(tm.title)} <b>${tr('리더 {0}', pct(tm.leadShare))}</b></span><span class="track big"><span class="fill" style="width:${(tm.leadShare || 0) * 100}%;background:${tm.leadShare > 0.5 ? '#e5534b' : '#3fb27f'}"></span></span><small>${tr('팀원 {0}명', tm.members || 0)}${tm.idleMembers?.length ? tr(' · 😴 쉬는 팀원 {0}명 ({1})', tm.idleMembers.length, tm.idleMembers.slice(0, 4).map(esc).join(', ')) : ''}</small></div>`).join('')}</section>`;
    if (d.waitingNow?.length) h += `<section><div class="d-sec">${tr('🙋 지금 결정 기다리는 중')}</div>${d.waitingNow.map((w) => `<div class="wait" data-open="S:${esc(w.id)}"><b>${esc(AIO.ui.code(w.id) || '')} ${esc(w.title)}</b><span>${esc(AIO.status(w.status).label)} · ${tr('{0}째', dur(w.sinceMs))}</span></div>`).join('')}</section>`;
    h += '</div>';
    el.innerHTML = h;
  }

  // ------------------------------------------------------------ demo api (no server)
  function demoApi(demo, path, opts) {
    const r = AIO.rand(AIO.hash(path));
    if (path.startsWith('/api/insights')) {
      const ss = demo.sessions;
      return {
        scan: { done: true, pct: 1 },
        today: { tools: ss.reduce((n, s) => n + s.stats.today, 0), edits: 87, cmds: 64, prompts: 23, tokensIn: 3.2e6, tokensOut: 412e3, sessionsActive: ss.length },
        byProvider: ss.reduce((m, s) => { (m[s.provider] = m[s.provider] || { sessions: 0, tools: 0 }).sessions++; m[s.provider].tools += s.stats.today; return m; }, {}),
        byProject: ss.filter((s) => s.project).map((s) => ({ project: s.project, tools: s.stats.today })).sort((a, b) => b.tools - a.tools),
        leaderboard: ss.map((s) => ({ id: s.id, title: s.title, provider: s.provider, today: s.stats.today })).sort((a, b) => b.today - a.today),
        waitingNow: ss.filter((s) => AIO.isUrgent(s.status)).map((s) => ({ id: s.id, title: s.title, status: s.status, sinceMs: 7 * 60e3 })),
        decisions: { count: 6, avgMs: 11 * 60e3 },
        teams: ss.filter((s) => s.kind === 'harness').map((s, i) => ({ id: s.id, title: s.title, members: s.roster.length, idleMembers: i ? [] : ['design-critic'], leadShare: i ? 0.31 : 0.62 })),
        hourlyToday: Array.from({ length: 24 }, (_, h) => (h > 8 && h <= new Date().getHours() ? Math.round(10 + r() * 60) : 0)),
        tips: ['블로그 리뉴얼 하네스: 리더가 작업의 62%를 직접 처리하고 있어요 — 팀원에게 더 나눠보세요', '쉬는 팀원 1명: design-critic (최근 7일 호출 0회)', '대표 결정 평균 응답 11분 — 아침 보고 시간에 몰아서 처리하면 대기가 줄어요', '오늘 가장 많이 고친 파일: office.js (23회)'],
      };
    }
    const m = path.match(/^\/api\/session\/([^/]+)\/(detail|summary)/);
    if (m) {
      const s = demo.sessions.find((x) => x.id === decodeURIComponent(m[1]));
      if (!s) { const e = new Error('not found'); e.status = 404; throw e; }
      if (m[2] === 'summary') return new Promise((res) => setTimeout(() => res({ summary: `• ${s.title} 작업을 진행 중이에요.\n• 최근 30분 동안 파일 6개를 고치고 테스트를 3번 돌렸어요.\n• 남은 일: 검수, 배포 전 확인.\n\n다음 단계 제안\n1) 검수는 다른 AI에게 맡기기\n2) 결정이 필요한 2건 먼저 답하기\n3) 반복 작업은 스킬로 묶기`, generatedAt: Date.now() }), 1200));
      const now = Date.now();
      const conv = [];
      const prompts = [s.lastPrompt || `${s.title} 진행해줘`, '좋아 그 방향으로 계속해', '테스트까지 돌려서 확인해줘'];
      let t = now - 40 * 60e3;
      prompts.forEach((p, i) => {
        conv.push({ t, role: 'user', text: p }); t += 20e3;
        conv.push({ t, role: 'assistant', text: ['네, 먼저 구조를 파악하고 필요한 파일부터 수정할게요.', '방향 맞춰서 나머지 화면도 같은 패턴으로 정리합니다.', '테스트를 돌려 결과를 확인하겠습니다.'][i] }); t += 15e3;
        for (let k = 0; k < 4; k++) {
          const ty = ['read', 'edit', 'terminal', 'search'][k];
          conv.push({ t, role: 'tool', tool: { name: ty, type: ty, label: { read: 'index.html 읽는 중', edit: 'office.js 수정', terminal: 'npm test', search: '"TODO" 찾는 중' }[ty], detail: ty === 'terminal' ? 'npm test -- --watch=false' : '' } }); t += 9e3;
          conv.push({ t, role: 'result', text: ty === 'terminal' ? '✓ 42 passed (3.1s)' : 'ok', isError: false }); t += 6e3;
        }
      });
      conv.push({ t, role: 'assistant', text: '모든 테스트가 통과했어요. 변경 사항을 정리하면:\n- 사무실 테마 4종 추가\n- 로그인 후 상세 패널\n확인 부탁드려요!' });
      const roster = s.roster || [];
      return {
        session: s, scan: { done: true, pct: 1 }, conversation: conv,
        progress: {
          summary: `"${s.lastPrompt || s.title}" 요청을 처리 중이에요. 지금은 ${s.activity?.label || '작업'} 단계이고, 이번 세션에서 파일 9개를 고치고 명령 14번을 실행했어요.${s.todos?.length ? ` 할 일 ${s.todos.filter((x) => x.status === 'completed').length}/${s.todos.length} 완료.` : ''}`,
          currentTurn: AIO.isBusy(s.status) ? { start: now - 6 * 60e3, prompt: prompts[2], tools: 12, edits: 4 } : null,
          turns: prompts.map((p, i) => ({ start: now - (40 - i * 12) * 60e3, durationMs: (4 + i * 3) * 60e3, prompt: p, tools: 8 + i * 3, edits: 2 + i, outcome: 'done', lastText: '완료했어요.' })),
          todos: { total: s.todos?.length || 0, done: (s.todos || []).filter((x) => x.status === 'completed').length, inProgress: 1, items: s.todos || [] },
          filesTouched: ['office.js', 'world.js', 'style.css', 'index.html', 'server.mjs'].map((f, i) => ({ path: 'public/js/' + f, edits: 12 - i * 2, reads: 4 + i, last: now - i * 5 * 60e3 })),
          commands: ['npm test', 'git status', 'node build.mjs', 'npm run lint'].map((c, i) => ({ t: now - i * 4 * 60e3, cmd: c, ok: i !== 3 })),
          errors: [{ t: now - 16 * 60e3, text: 'npm run lint: 2 problems (1 error)' }],
        },
        insights: {
          tokens: { total: { input: 12e3, output: 380e3, cacheRead: 21e6, cacheWrite: 900e3, thinking: 210e3 }, today: { input: 3e3, output: 96e3, cacheRead: 5.1e6, cacheWrite: 210e3, thinking: 60e3 } },
          activity: { read: 120, edit: 86, terminal: 64, search: 41, web: 12, delegate: roster.length ? 18 : 2, plan: 9, ask: 3 },
          activityTimeMs: { terminal: 42 * 60e3, edit: 18 * 60e3, read: 9 * 60e3, web: 6 * 60e3, delegate: 31 * 60e3 },
          hourly: Array.from({ length: 24 }, (_, h) => (h > 8 && h < 23 ? Math.round(r() * 40) : 0)),
          daily: Array.from({ length: 14 }, (_, i) => ({ date: new Date(now - (13 - i) * 86400e3).toISOString().slice(0, 10), count: Math.round(r() * 200) })),
          models: { 'claude-opus-5-5': 812, 'claude-haiku-5-5': 64 },
          turnStats: { count: 38, avgMs: 7.5 * 60e3, medianMs: 5 * 60e3, longestMs: 41 * 60e3 },
          userWait: { count: 31, avgMs: 9 * 60e3, totalMs: 4.6 * 3600e3 }, decisions: { count: 5, avgMs: 12 * 60e3 }, errorRate: 0.06,
          delegation: roster.length ? { leadTools: 620, agentTools: 380, leadShare: 0.62, byType: Object.fromEntries(roster.map((x, i) => [x.name, { runs: x.runs, tools: 40 + i * 31, lastRun: now - i * 3600e3 }])), idleMembers: roster.slice(-1).map((x) => x.name) } : { leadTools: 300, agentTools: 40, leadShare: 0.88, byType: { Explore: { runs: 4, tools: 40 } }, idleMembers: [] },
          hotFiles: [{ path: 'office.js', edits: 23 }, { path: 'world.js', edits: 17 }, { path: 'style.css', edits: 9 }],
        },
        tips: roster.length ? ['리더가 작업의 62%를 직접 처리하고 있어요 — 팀원에게 더 나눠보세요', `쉬는 팀원: ${roster.slice(-1).map((x) => x.name).join(', ')} (최근 7일 호출 0회)`, '대표 결정 평균 응답 12분'] : ['오류율 6% — 린트 실패가 반복돼요. 같은 실수 두 번이면 규칙 한 줄을 추가해 보세요', '가장 많이 고친 파일: office.js (23회)'],
        agents: (s.agents || []).map((a) => ({ ...a, tools: 12, lastText: a.status === 'done' ? '보고: 요청한 작업을 끝냈어요.' : '', recent: [{ t: now - 60e3, role: 'tool', tool: { type: a.activity?.type || 'read', label: a.activity?.label || '작업 중' } }] })),
      };
    }
    const e = new Error('not available in demo'); e.status = 404; throw e;
  }

  AIO.detail = { open, close, render, onClick, dashboard, panel };
})();
