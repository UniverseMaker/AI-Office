// 업무 타이머(새 UI, js/timer-ui.js)를 AI OFFICE 에 붙인다: 상단바 미니 타이머 · 전체 타이머 창(#/timer) · 로그인하면 계정 기록 불러오기.
(function () {
  const $ = (id) => document.getElementById(id);
  const T = AIO.TimerUI;
  if (!T || !window.store) return;
  const ov = $('timerOverlay'), card = $('timerCard');
  let lastFocus = null;
  function open() {
    if (!ov || !ov.hidden) return;
    lastFocus = document.activeElement;
    ov.hidden = false;
    document.body.classList.add('tm-open');
    T.mountPanel(card);
    card.tabIndex = -1; try { card.focus({ preventScroll: true }); } catch (e) {}
  }
  function close() {
    if (!ov || ov.hidden) return;
    ov.hidden = true;
    document.body.classList.remove('tm-open');
    T.unmountPanel();
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }
  AIO.timer = { open, close, toggle: () => (ov.hidden ? open() : close()) };
  // 바깥(어두운 배경)을 눌러 닫기 — 창 안에서 끌다가 바깥에서 놓은 경우는 닫지 않는다
  let downSelf = false;
  ov.addEventListener('mousedown', (ev) => { downSelf = ev.target === ov; });
  ov.addEventListener('click', (ev) => { if (ev.target === ov && downSelf) close(); downSelf = false; });
  window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !ov.hidden) close(); });
  const onHash = () => { if (location.hash === '#/timer') { history.replaceState(null, '', location.pathname + location.search); open(); } };
  window.addEventListener('hashchange', onHash);
  try { T.init(); T.mountMini($('pomoMini')); } catch (e) { console.warn('timer', e); }
  // 로그인하면 계정에 저장된 타이머 설정 · 기록을 합친다
  let pulled = false;
  if (AIO.auth && AIO.auth.on) AIO.auth.on((st) => { if (st.authed && !st.demo && !pulled) { pulled = true; store.pull(); } if (!st.authed) pulled = false; });
  onHash();
})();
