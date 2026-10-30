// Boot: canvas, render loop, camera (campus ↔ building interior), floor/building control panel, input, data → world → ui.
(function () {
  const canvas = document.getElementById('office');
  const ctx = canvas.getContext('2d');
  const cam = new AIO.iso.Camera();
  const world = new AIO.World();
  const nav = document.getElementById('floors');
  let vw = 0, vh = 0, dpr = 1;
  let fitted = false;
  let towerFloor = null;      // level index shown inside the tower (chosen with the panel)
  let lastFocus = null;

  function resize() {
    const px = AIO.skins ? AIO.skins.pixel() : 0;      // 🎨 도트 그림체: 캔버스를 낮은 해상도로 그려 큰 픽셀로 늘린다
    dpr = px ? 1 / px : Math.min(2, window.devicePixelRatio || 1);
    vw = canvas.clientWidth; vh = canvas.clientHeight;
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    cam.vw = vw; cam.vh = vh;
    if (world.S && !cam.userMoved) fitCampus(true);
  }
  function pad() {
    const side = document.getElementById('side');
    const m = vw < 760;
    return { l: m ? 12 : 150, r: side.classList.contains('hidden') || m ? 12 : 330, t: m ? 110 : vw < 1180 ? 130 : 84, b: m ? 150 : 56 };
  }
  let wide = false;            // false: the AI zone · true: the whole research-style campus
  function fitCampus(snap, all = wide) {
    if (!world.S) return;
    wide = all;
    cam.fit(all ? world.S.bounds : world.S.homeBounds || world.S.bounds, vw, vh, pad());
    if (snap) cam.snap();
    cam.userMoved = false;
  }
  const zOf = (b, lv) => (b && b.type === 'tower' && lv != null ? world.S.levels[lv].zBase || 0 : 0);
  /** screen-space box of a building, raised to the floor on show */
  function boxOf(b, lv) { const bb = b.bounds, z = zOf(b, lv); return { minX: bb.minX, maxX: bb.maxX, minY: bb.minY - z, maxY: bb.maxY - z }; }
  /** zoom at which a building's floor plate fills the view (= fully "inside") */
  function insideZoom(b) {
    const p = pad(), bb = b.bounds;
    return Math.min(2.2, Math.min((vw - p.l - p.r) / (bb.maxX - bb.minX), (vh - p.t - p.b) / (bb.maxY - bb.minY)));
  }
  let entered = null;          // the non-core building the user walked into
  function enter(id, lv) {
    const b = world.S.buildings.find((x) => x.id === id);
    if (!b) return;
    entered = b.core ? entered : b.id;
    // first time in: the lobby. After that: whatever floor was picked last
    if (b.type === 'tower') towerFloor = lv ?? towerFloor ?? b.lobby ?? b.levels[0];
    const p = pad(), bb = boxOf(b, b.type === 'tower' ? towerFloor : null), z = insideZoom(b);
    cam.focus((bb.minX + bb.maxX) / 2 + (p.r - p.l) / 2 / z, (bb.minY + bb.maxY) / 2 - (p.t - p.b) / 2 / z, z);
    cam.userMoved = true;
    renderNav();
  }
  function goCampus(all) { fitCampus(false, !!all); renderNav(); }

  // where is the camera looking, and how far "inside" is it?
  function updateView() {
    const S = world.S;
    if (!S) return;
    const at = (z) => { const wy = cam.y + z; return [(cam.x / 32 + wy / 16) / 2, (wy / 16 - cam.x / 32) / 2]; };
    const inB = (x, [gx, gy]) => gx > x.x - 2 && gx < x.x + x.W + 2 && gy > x.y - 2 && gy < x.y + x.H + 2;
    let b = null;
    for (const x of S.buildings) {
      if (!x.core && x.id !== entered) continue;   // ordinary buildings open only when entered (click / nav)
      const z = x.type === 'tower' && towerFloor != null ? zOf(x, towerFloor) : 0;
      if (inB(x, at(z)) || (z && inB(x, at(0)))) { b = x; break; }
    }
    let t = 0;
    if (b) { const zi = insideZoom(b); const k = Math.max(0, Math.min(1, (cam.z - zi * 0.55) / (zi * 0.92 - zi * 0.55))); t = k * k * (3 - 2 * k); }
    if (b && b.type === 'tower' && towerFloor == null && t > 0) towerFloor = b.lobby ?? b.levels[0];
    if (entered) {   // forget it once the camera is no longer headed for it (panned / zoomed away)
      const eb = S.buildings.find((x) => x.id === entered), wy = cam.ty;
      const g = [(cam.tx / 32 + wy / 16) / 2, (wy / 16 - cam.tx / 32) / 2];
      if (!eb || !inB(eb, g) || cam.tz < insideZoom(eb) * 0.5) entered = null;
    }
    lastFocus = b ? b.id : null;
    world.view = { focus: b ? b.id : null, t, floor: towerFloor };
  }

  // ---------------- building / floor control panel (elevator-style)
  function renderNav() {
    const S = world.S;
    if (!S) return;
    if (S.single) {
      if (!S.indoor) { nav.hidden = true; nav.innerHTML = ''; return; }
      nav.hidden = false;
      const T = (x) => (AIO.tr ? AIO.tr(x) : x);
      const inMode = (world.zoneM ?? 1) > 0.5;
      const h = `<div class="nav-b"><button data-zone="in" class="${inMode ? 'on' : ''}"><span>🏢</span>${T('실내')}</button><button data-zone="out" class="${inMode ? '' : 'on'}"><span>🌳</span>${T('야외')}</button></div>`;
      if (nav.innerHTML !== h) nav.innerHTML = h;
      return;
    }
    nav.hidden = false;
    const v = world.view;
    const inside = v.focus && v.t > 0.3;
    const T = (x) => (AIO.tr ? AIO.tr(x) : x);
    const cur = inside && S.buildings.find((b) => b.id === v.focus && !b.core);
    let html = '<div class="nav-b">' + [['campus', '🌳', S.compact ? '바깥' : 'AI 캠퍼스'], ...(S.compact ? [] : [['all', '🗺️', '전체 지도']]), ...S.buildings.filter((b) => b.core).map((b) => [b.id, b.name.split(' ')[0], b.name.split(' ').slice(1).join(' ')]), ...(cur ? [[cur.id, '🚪', cur.name.replace(/^\S+\s/, (m) => (/[가-힣]/.test(m) ? m : ''))]] : [])]
      .map(([id, ic, l]) => `<button data-bld="${id}" class="${(id === 'campus' && !inside && !wide) || (id === 'all' && !inside && wide) || (inside && v.focus === id) ? 'on' : ''}"><span>${ic}</span>${AIO.esc(T(l))}</button>`).join('') + '</div>';
    const tower = S.buildings.find((b) => b.type === 'tower');
    if (tower && inside && v.focus === 'tower') {
      const fi = world.floorInfo(tower);
      const rows = tower.levels.map((lv, i) => ({ lv, i, L: S.levels[lv], f: fi[i] })).reverse();
      html += `<div class="elev-panel"><div class="ep-title">🛗 ${T('층 이동')}</div>${(() => { const C = towerFloor != null ? S.levels[towerFloor] : null; return C ? `<div class="ep-cur"><small>📍 ${T('현재 층')}</small><b>${AIO.esc(T(C.name))}</b>${C.desc ? `<i>${AIO.esc(T(C.desc))}</i>` : ''}</div>` : ''; })()}<div class="ep-list"><button class="ep-arrow" data-step="1">▲</button>`
        + rows.map(({ lv, L, f }) => { const full = `${T(L.name)}${L.desc ? ' — ' + T(L.desc) : ''}`; return `<button data-floor="${lv}" class="ep-floor ${towerFloor === lv ? 'on' : ''} ${f.urgent ? 'alert' : ''} heat-${world.heatOf(f.people)}" title="${AIO.esc(full)}" data-full="${AIO.esc(full)}"><b>${L.short}</b><span>${AIO.esc(T(L.name.split(' ').slice(1).join(' ')))}</span><em>${f.people}</em></button>`; }).join('')
        + `<button class="ep-arrow" data-step="-1">▼</button></div></div>`;
    }
    if (nav.innerHTML !== html) {
      // 층 목록만 따로 스크롤 — 다시 그려도 보던 위치 그대로 (아래층을 눌렀는데 맨 위로 튀어 올라가던 문제)
      const old = nav.querySelector('.ep-list'), top = old ? old.scrollTop : 0, left = old ? old.scrollLeft : 0;
      nav.innerHTML = html;
      const list = nav.querySelector('.ep-list'); if (list) { list.scrollTop = top; list.scrollLeft = left; }
    }
  }
  function stepFloor(d) {
    const tower = world.S.buildings.find((b) => b.type === 'tower');
    if (!tower) return;
    const i = Math.max(0, tower.levels.indexOf(towerFloor));
    towerFloor = tower.levels[Math.max(0, Math.min(tower.levels.length - 1, i + d))];
    enter('tower', towerFloor);
    const on = nav.querySelector(`.ep-floor[data-floor="${towerFloor}"]`); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });   // ▲▼ 로 옮길 때만 안 보이면 살짝 따라간다
  }
  nav.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    touched(); if (follow) stopFollow();      // 층 · 건물을 직접 고르면 따라가기는 끝
    if (b.dataset.zone) {
      const S = world.S, IN = S.indoor, L = S.levels[0], P = AIO.iso.P;
      const [x, y] = b.dataset.zone === 'in' ? P(IN.x1 / 2, IN.y1 / 2) : P((IN.x1 + L.W) / 2 + 2, IN.y1 * 0.45 + 4);
      cam.focus(x, y, Math.max(cam.tz, 0.75)); cam.userMoved = true;
      return;
    }
    if (b.dataset.bld) { if (b.dataset.bld === 'campus') goCampus(false); else if (b.dataset.bld === 'all') goCampus(true); else enter(b.dataset.bld); }
    else if (b.dataset.floor) enter('tower', Number(b.dataset.floor));
    else if (b.dataset.step) stepFloor(Number(b.dataset.step));
  });

  world.onLayout = () => {
    const tower = world.S.buildings.find((b) => b.type === 'tower');
    if (towerFloor != null && tower && !tower.levels.includes(towerFloor)) towerFloor = null;
    if (!fitted) { fitCampus(true); fitted = true; }
    renderNav();
  };

  // ---------------- 🎯 따라가기 · 자동 포커스
  //   따라가기: 캐릭터를 카메라가 계속 따라간다 (층을 옮기면 그 층으로) — 지도를 끌거나 층을 고르거나 Esc 면 끝 (확대 · 축소는 그대로)
  //   자동 포커스: 어느 세션에 방금 새 지시(사용자 요청)가 들어오면 그 캐릭터의 층을 비추거나(floor) 따라간다(follow) — 표시 · 알림 옵션
  let follow = null;            // { id, manual }
  let userAt = -1e9;            // 마지막으로 내가 화면을 만진 때 (처음엔 안 만진 것으로)
  const touched = () => { userAt = performance.now(); };
  const T = (x, ...a) => (AIO.tr ? AIO.tr(x, ...a) : x);
  const bar = document.createElement('div'); bar.className = 'follow-bar'; bar.hidden = true; document.body.appendChild(bar);
  let noteTimer = 0;
  const who = (id) => { const e = world.ents.get(id), s = e && e.s; const nm = s && e.kind === 'main' ? ((s.persona && AIO.pname && AIO.pname(s.persona)) || s.title || '') : (e && (e.name || (e.role && T(e.role)))) || ''; return `${id.startsWith('S:') ? AIO.ui.code(id.slice(2)) || '' : ''} ${nm}`.trim(); };
  function showBar(html, sticky) {
    clearTimeout(noteTimer);
    bar.innerHTML = html; bar.hidden = false;
    if (!sticky) noteTimer = setTimeout(() => { if (!follow) bar.hidden = true; else followBar(); }, 4500);
  }
  const followBar = () => showBar(`🎯 <b>${AIO.esc(who(follow.id))}</b> ${T('따라가는 중')}<button data-unfollow title="${T('그만 따라가기 (Esc)')}">✕</button>`, true);
  function startFollow(id, manual) {
    const e = world.ents.get(id); if (!e) return;
    follow = { id, manual: !!manual };
    focus(id);
    // 따라가는 캐릭터의 세부 정보를 왼쪽에 — 대상이 바뀌면(자동 포커스 · 최근 세션) 같이 바뀐다. 휴대폰은 상세 창이 지도를 가려서 빼고
    if (world.selected !== id && innerWidth > 760) AIO.ui.open(id);
    world.pulse = { id, until: world.t + 3 };
    followBar();
  }
  function stopFollow() { follow = null; bar.hidden = true; }
  bar.addEventListener('click', (ev) => { if (ev.target.closest('[data-unfollow]')) stopFollow(); else if (follow) { AIO.ui.open(follow.id); } });
  document.addEventListener('click', (ev) => { const b = ev.target.closest('[data-follow]'); if (!b) return; ev.preventDefault(); const id = b.dataset.follow; if (follow && follow.id === id) stopFollow(); else startFollow(id, true); });
  window.AIO_follow = { start: startFollow, stop: stopFollow, get id() { return follow && follow.id; } };
  function followStep() {
    if (!follow) return;
    const e = world.ents.get(follow.id);
    if (!e || e.fading || e.hidden) { stopFollow(); return; }
    const L = world.levelOf(e), b = L.bld !== 'out' ? world.buildingOf(e.lv) : null;
    if (b && b.type === 'tower' && towerFloor !== e.lv) { towerFloor = e.lv; renderNav(); }      // 엘리베이터로 다른 층에 내리면 그 층으로
    const p = world.entityWorldPos(follow.id); if (!p) return;
    const z = cam.tz || cam.z;
    cam.tx = p[0] + (b ? (pad().r - 380) / 2 / z : 0); cam.ty = p[1];
    cam.userMoved = true;
  }
  /** 새 지시가 들어온 세션 찾기: 마지막 요청 시각(turnStartedAt)이 바뀐 세션 중 가장 최근 */
  const lastTurn = new Map(); let afPrimed = false;
  function autoFocus(st) {
    let best = null;
    for (const s of st.sessions || []) {
      if (s.kind === 'app') continue;
      const t = s.turnStartedAt || 0, prev = lastTurn.get(s.id);
      lastTurn.set(s.id, t);
      if (!afPrimed || prev === undefined || !t || t <= prev) continue;
      if (!best || t > best.t) best = { s, t };
    }
    afPrimed = true;
    const mode = world.opts.autoFocus || 'off';
    if (mode === 'latest') { followLatest(st); return; }
    if (!best || mode === 'off') return;
    if (performance.now() - userAt < (+world.opts.afQuiet || 0) * 1000) return;     // 내가 방금 화면을 만졌으면 쉬기
    if (follow && follow.manual) return;                                              // 내가 고른 캐릭터를 따라가는 중이면 뺏지 않는다
    const id = 'S:' + best.s.id;
    setTimeout(() => {                                    // 자리 옮기기(planning)가 시작된 뒤에 — 일하러 가는 층을 비춘다
      const e = world.ents.get(id); if (!e) return;
      if (mode === 'follow') { startFollow(id, false); showBar(`📍 <b>${AIO.esc(who(id))}</b> ${T('새 지시')} · ${T('따라가는 중')}<button data-unfollow>✕</button>`, true); return; }
      if (follow) stopFollow();
      const lv = e.spot && e.spot.lv != null ? e.spot.lv : e.lv;
      const L = world.S.levels[lv], b = L && L.bld !== 'out' ? world.buildingOf(lv) : null;
      if (b && b.type === 'tower') enter(b.id, lv); else focus(id);
      world.pulse = { id, until: world.t + 6 };
      showBar(`📍 <b>${AIO.esc(who(id))}</b> ${T('새 지시')} → ${AIO.esc(T((L && L.name) || ''))}<button data-follow="${id}" title="${T('이 캐릭터 따라가기')}">🎯</button>`);
    }, 450);
  }

  /** 🆕 가장 최근에 움직인 세션(lastActive 가 가장 늦은 세션)을 계속 따라간다 — 다른 세션이 더 최근이 되면 갈아탄다
   *  너무 자주 바뀌지 않게: 한 번 갈아타면 8초는 그대로, 새 세션이 3초 넘게 더 최근일 때만 */
  let latestAt = 0;
  function followLatest(st) {
    if (performance.now() - userAt < (+world.opts.afQuiet || 0) * 1000) return;
    if (follow && follow.manual) return;
    let best = null;
    for (const s of st.sessions || []) {
      if (s.kind === 'app' || s.custom || !s.lastActive) continue;
      if (!world.ents.get('S:' + s.id)) continue;
      if (!best || s.lastActive > best.lastActive) best = s;
    }
    if (!best) return;
    const id = 'S:' + best.id;
    if (follow && follow.id === id) return;
    if (follow) {
      const cur = (st.sessions || []).find((s) => 'S:' + s.id === follow.id);
      if (performance.now() - latestAt < 8000) return;
      if (cur && best.lastActive - (cur.lastActive || 0) < 3000) return;
    }
    latestAt = performance.now();
    startFollow(id, false);
    showBar(`🆕 <b>${AIO.esc(who(id))}</b> ${T('가장 최근 세션')} · ${T('따라가는 중')}<button data-unfollow>✕</button>`, true);
  }

  /** jump to whoever was clicked in the side panel / ticker */
  function focus(id) {
    if (id.startsWith('B:')) { enter(id.slice(2)); return; }
    const e = world.ents.get(id);
    if (!e) return;
    const L = world.levelOf(e);
    const p = world.entityWorldPos(id);
    if (L.bld !== 'out') {
      const b = world.buildingOf(e.lv);
      if (!b) { cam.focus(p[0], p[1], Math.max(cam.z, 1.1)); cam.userMoved = true; return; }
      if (b.type === 'tower') towerFloor = e.lv;
      const z = Math.max(cam.z, insideZoom(b) * 1.25);
      cam.focus(p[0] + (pad().r - 380) / 2 / z, p[1], z);
    } else cam.focus(p[0], p[1], Math.max(cam.z, 1.1));
    cam.userMoved = true;
    renderNav();
  }

  // ---------------- loop
  let last = performance.now();
  const t0 = last;
  let navAt = 0;
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    // 배경 하늘은 시간대(실제 시간 · 아침 · 낮 · 노을 · 밤)를 따른다: 그래픽 테마의 그 시간대 하늘 → (낮이면) 계정 옵션의 맵 배경 → 기본 하늘
    const N = world.night ? world.night() : { phase: 'day', bg: ['#cfe6f5', '#eef3ea'] };
    const sky = (AIO.skins && AIO.skins.sky(N.phase)) || (N.phase === 'day' && AIO.prefs && AIO.prefs.sky()) || N.bg;
    g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    world.draw(ctx, cam, dpr, vw, vh);
    if (AIO.skins) AIO.skins.drawFx(ctx, dpr, vw, vh, performance.now() / 1000);   // 박쥐 · 눈 · 별 · 마법 빛 · 유령
  }
  function tick(nowMs, dtMax) {
    const dt = Math.min(dtMax, (nowMs - last) / 1000);
    last = nowMs;
    followStep();
    cam.step(dt);
    updateView();
    const steps = dt > 0.12 ? 5 : 1;
    for (let i = 0; i < steps; i++) world.update(dt / steps, (nowMs - t0) / 1000);
    render();
    if (nowMs - navAt > 400) { navAt = nowMs; renderNav(); }
  }
  function frame(nowMs) { tick(nowMs, 0.1); requestAnimationFrame(frame); }

  // ---------------- input (mouse drag / wheel, touch drag / pinch)
  let drag = null;
  const pts = new Map();
  let pinch = null;
  const zoomAt = (sx, sy, nz) => {
    const [wx, wy] = cam.toWorld(sx, sy);
    nz = Math.max(0.04, Math.min(3.2, nz));
    cam.z = cam.tz = nz;
    cam.x = cam.tx = wx - (sx - vw / 2) / nz;
    cam.y = cam.ty = wy - (sy - vh / 2) / nz;
    cam.userMoved = true; touched();
  };
  canvas.addEventListener('pointerdown', (e) => {
    pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: cam.z };
      drag = null;
      return;
    }
    drag = { x: e.clientX, y: e.clientY, cx: cam.tx, cy: cam.ty, moved: false };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pinch && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.z * d / pinch.d);
      return;
    }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > (e.pointerType === 'touch' ? 8 : 4)) drag.moved = true;
      if (drag.moved) {
        cam.tx = drag.cx - dx / cam.z; cam.ty = drag.cy - dy / cam.z;
        cam.x = cam.tx; cam.y = cam.ty;
        cam.userMoved = true; touched(); if (follow) stopFollow();
        canvas.classList.add('dragging');
      }
      AIO.ui.tooltip(null);
      return;
    }
    if (e.pointerType === 'touch') return;
    const id = world.hitTest(e.offsetX, e.offsetY);
    world.hover = id;
    canvas.classList.toggle('hover', !!id);
    AIO.ui.tooltip(id, e.clientX, e.clientY);
  });
  const up = (e) => {
    pts.delete(e.pointerId);
    canvas.classList.remove('dragging');
    if (pinch) { if (pts.size < 2) pinch = null; drag = null; return; }
    if (drag && !drag.moved && e.type === 'pointerup') {
      const id = world.hitTest(e.offsetX, e.offsetY);
      if (id && id.startsWith('B:')) enter(id.slice(2));
      else if (id) AIO.ui.open(id); else AIO.ui.close();
    }
    drag = null;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => { world.hover = null; AIO.ui.tooltip(null); });
  canvas.addEventListener('dblclick', (e) => { const id = world.hitTest(e.offsetX, e.offsetY); if (id) focus(id); else goCampus(); });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, cam.z * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  canvas.style.touchAction = 'none';
  window.addEventListener('aio:lang', () => renderNav());
  // 층 버튼에 마우스를 올리면 전체 층 이름 + 용도 (패널 밖으로 띄우는 고정 툴팁)
  const floorTip = document.createElement('div');
  floorTip.className = 'floor-tip'; floorTip.hidden = true; document.body.appendChild(floorTip);
  nav.addEventListener('mouseover', (ev) => {
    const b = ev.target.closest('.ep-floor');
    if (!b || !b.dataset.full) { floorTip.hidden = true; return; }
    const r = b.getBoundingClientRect();
    floorTip.textContent = b.dataset.full; floorTip.hidden = false;
    floorTip.style.left = `${r.right + 10}px`; floorTip.style.top = `${r.top + r.height / 2}px`;
  });
  nav.addEventListener('mouseleave', () => { floorTip.hidden = true; });
  // map selector (⚙️ 설정): rebuild the world for the chosen map and frame it
  window.addEventListener('aio:map', () => {
    towerFloor = null; entered = null; wide = false; fitted = false;
    if (world.lastState) world.setState(world.lastState);
  });
  window.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    if (e.key === '+' || e.key === '=') { cam.tz = Math.min(3.2, cam.tz * 1.2); cam.userMoved = true; }
    if (e.key === '-') { cam.tz = Math.max(0.04, cam.tz / 1.2); cam.userMoved = true; }
    if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); touched(); if (follow) stopFollow(); stepFloor(e.key === 'PageUp' ? 1 : -1); }
    if (e.key === 'Escape' && follow) stopFollow();
  });
  window.addEventListener('resize', resize);
  // 🎨 그래픽 테마가 바뀌면 맵을 다시 지어 소품을 놓고, 그림 캐시를 비운다
  window.addEventListener('aio:pxload', () => { world.caches.clear(); world.chunks.clear(); world.sprites.clear(); world.px = 0; });   // 👾 도트 에셋을 다 불러오면 바닥 · 벽을 다시 깐다
  window.addEventListener('aio:skin', () => { world.caches.clear(); world.sprites.clear(); world.chunks.clear(); world.px = 0; world.sig = null; if (world.lastState) world.setState(world.lastState); });
  // 👁️ 세션 보기 필터가 바뀌면 마지막으로 받은 상태를 다시 걸러서 그린다
  if (AIO.view) { AIO.view.init(world); window.addEventListener('aio:view', () => { const r = AIO.view.raw; if (!r || !r.sessions) return; const v = AIO.view.apply(r); world.setState(v); AIO.ui.render(v); }); }

  // ---------------- boot
  AIO.ui.init(world, { onFocus: focus, onFit: goCampus, onSide: () => { if (!cam.userMoved) setTimeout(() => fitCampus(false), 50); } });
  resize();
  AIO.data.start({
    onState: (st) => { const v = AIO.view ? AIO.view.apply(st) : st; world.setState(v); AIO.ui.render(v); autoFocus(v); },
    onMode: (m, info) => AIO.ui.setMode(m, info),
  });
  requestAnimationFrame(frame);
  // keep the campus moving while the tab is hidden (rAF pauses)
  setInterval(() => { if (document.hidden) tick(performance.now(), 0.6); }, 500);
  if (document.fonts) document.fonts.ready.then(() => { world.caches.clear(); world.sprites.clear(); world.chunks.clear(); world.px = 0; });
  window.AIO_DEBUG = { world, cam, enter, goCampus, stepFloor, focus };
  // 촬영용 장면 (README 스크린샷): ?demo&shot=overview | floor:<층 이름 일부> | close:<x>,<y>,<zoom> | picker | acct | mgr:<탭> | side
  //   데모 데이터로만 쓰는 것을 권장 (실제 세션 제목이 찍히지 않게)
  (() => {
    const q = new URLSearchParams(location.search).get('shot');
    if (!q) return;
    const run = () => {
      const S = world.S;
      if (!S) return setTimeout(run, 300);
      for (const part of q.split(';')) {
        const [k, v] = [part.split(':')[0], part.slice(part.indexOf(':') + 1)];
        if (k === 'overview') goCampus();
        else if (k === 'floor' || k === 'close') {
          const b = S.buildings.find((x) => x.type === 'tower') || S.buildings[0];
          const lv = k === 'floor' ? S.levels.findIndex((L) => L.name.includes(decodeURIComponent(v))) : -1;
          if (lv >= 0) { enter(b.id, lv); const L = S.levels[lv]; const [sx, sy] = AIO.iso.P(L.ox + L.W / 2, L.oy + L.H / 2, L.zBase || 0); cam.tx = sx; cam.ty = sy; cam.tz = +(new URLSearchParams(location.search).get('z') || 0.95); cam.userMoved = true; }
          if (k === 'close') { const [x, y, z] = v.split(',').map(Number); const [sx, sy] = AIO.iso.P(x, y, 0); cam.tx = sx; cam.ty = sy; cam.tz = z || 1; cam.userMoved = true; }
        } else if (k === 'picker') document.getElementById('btnMap').click();
        else if (k === 'acct') AIO.prefs.open();
        else if (k === 'mgr') AIO.manage.open(v || 'sessions');
        else if (k === 'side') AIO.ui.toggleSide(true);
      }
    };
    setTimeout(run, 1200);
  })();
})();
