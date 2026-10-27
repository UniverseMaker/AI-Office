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
    dpr = Math.min(2, window.devicePixelRatio || 1);
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
      html += `<div class="elev-panel"><div class="ep-title">🛗 ${T('층 이동')}</div>${(() => { const C = towerFloor != null ? S.levels[towerFloor] : null; return C ? `<div class="ep-cur"><small>📍 ${T('현재 층')}</small><b>${AIO.esc(T(C.name))}</b>${C.desc ? `<i>${AIO.esc(T(C.desc))}</i>` : ''}</div>` : ''; })()}<button class="ep-arrow" data-step="1">▲</button>`
        + rows.map(({ lv, L, f }) => { const full = `${T(L.name)}${L.desc ? ' — ' + T(L.desc) : ''}`; return `<button data-floor="${lv}" class="ep-floor ${towerFloor === lv ? 'on' : ''} ${f.urgent ? 'alert' : ''}" title="${AIO.esc(full)}" data-full="${AIO.esc(full)}"><b>${L.short}</b><span>${AIO.esc(T(L.name.split(' ').slice(1).join(' ')))}</span><em>${f.people}</em></button>`; }).join('')
        + `<button class="ep-arrow" data-step="-1">▼</button></div>`;
    }
    if (nav.innerHTML !== html) nav.innerHTML = html;
  }
  function stepFloor(d) {
    const tower = world.S.buildings.find((b) => b.type === 'tower');
    if (!tower) return;
    const i = Math.max(0, tower.levels.indexOf(towerFloor));
    towerFloor = tower.levels[Math.max(0, Math.min(tower.levels.length - 1, i + d))];
    enter('tower', towerFloor);
  }
  nav.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
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
    const dark = AIO.prefs ? AIO.prefs.isDark() : matchMedia('(prefers-color-scheme: dark)').matches;
    const night = world.night ? world.night().night : false;
    const sky = AIO.prefs && AIO.prefs.sky();   // 계정 옵션의 맵 배경
    g.addColorStop(0, night ? '#1d2547' : sky ? sky[0] : dark ? '#2c2823' : '#cfe6f5'); g.addColorStop(1, night ? '#3a4170' : sky ? sky[1] : dark ? '#1b1815' : '#eef3ea');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    world.draw(ctx, cam, dpr, vw, vh);
  }
  function tick(nowMs, dtMax) {
    const dt = Math.min(dtMax, (nowMs - last) / 1000);
    last = nowMs;
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
    cam.userMoved = true;
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
        cam.userMoved = true;
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
    if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); stepFloor(e.key === 'PageUp' ? 1 : -1); }
  });
  window.addEventListener('resize', resize);

  // ---------------- boot
  AIO.ui.init(world, { onFocus: focus, onFit: goCampus, onSide: () => { if (!cam.userMoved) setTimeout(() => fitCampus(false), 50); } });
  resize();
  AIO.data.start({
    onState: (st) => { world.setState(st); AIO.ui.render(st); },
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
