// Login client. Works from any page origin (served by the backend, file://, another host):
// the server hands out a bearer token that we keep in localStorage and send with every API call.
(function () {
  // 서버 주소 정하기: ① ?server=주소 / 저장해 둔 주소 ② 이 페이지를 준 서버가 곧 AI OFFICE 면 같은 주소(터널·프록시·다른 기기)
  //                   ③ 둘 다 아니면 이 PC 의 127.0.0.1:17777 (파일로 연 경우 등)
  let custom = null;
  // 보안: ?server= 는 이 PC 의 주소(127.0.0.1 · localhost)만 받는다 — 남의 서버로 로그인 토큰 · 비밀번호가 새지 않게. 주소가 바뀌면 저장된 토큰은 버린다.
  const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost)(:\d{1,5})?$/;
  try {
    const q = (new URLSearchParams(location.search).get('server') || '').replace(/\/+$/, '');
    if (q && LOCAL.test(q) && q !== localStorage.getItem('aio.server')) { localStorage.setItem('aio.server', q); localStorage.removeItem('aio.token'); }
    custom = localStorage.getItem('aio.server');
    if (custom && !LOCAL.test(custom)) { localStorage.removeItem('aio.server'); localStorage.removeItem('aio.token'); custom = null; }
  } catch {}
  const ORIGIN = custom || 'http://127.0.0.1:17777';
  const httpPage = location.protocol.startsWith('http');
  let same = httpPage && !custom && location.port === '17777';
  const sameOrigin = () => same;
  const base = () => (same ? '' : ORIGIN);
  // 다른 주소(터널 · 리버스 프록시 · 공유 링크)로 열었어도 그 주소가 AI OFFICE 서버면 그대로 쓴다
  const probe = httpPage && !same && !custom
    ? fetch('/api/auth/me', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && 'configured' in j) same = true; }).catch(() => {})
    : Promise.resolve();
  const listeners = new Set();
  const state = { available: false, configured: false, authed: false, admin: false, tier: null, tierName: null, user: null, demo: false };
  let token = null;
  try { token = localStorage.getItem('aio.token'); } catch {}

  const headers = (extra = {}) => (token ? { ...extra, Authorization: 'Bearer ' + token } : extra);
  const saveToken = (t) => { token = t; try { t ? localStorage.setItem('aio.token', t) : localStorage.removeItem('aio.token'); } catch {} };

  async function call(path, body) {
    await probe;
    const r = await fetch(base() + path, {
      method: body ? 'POST' : 'GET', cache: 'no-store', credentials: sameOrigin() ? 'same-origin' : 'omit',
      headers: headers(body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined,
    });
    let j = {};
    try { j = await r.json(); } catch {}
    return { ok: r.ok, status: r.status, ...j };
  }

  function emit() { for (const f of listeners) f(state); }

  async function refresh() {
    if (state.demo) return state;
    try {
      const j = await call('/api/auth/me');
      if (state.demo) return state; // demo started while we were waiting
      state.available = j.configured !== undefined;
      state.configured = !!j.configured;
      state.authed = !!j.authed; state.admin = !!j.admin; state.tier = j.tier ?? null; state.tierName = j.tierName || null; state.user = j.user || null;
      if (!j.authed && token) saveToken(null); // expired / revoked
    } catch { state.available = false; }
    emit();
    return state;
  }

  async function login(user, password) {
    const j = await call('/api/auth/login', { user, password });
    if (j.ok) { if (j.token) saveToken(j.token); state.authed = true; state.configured = true; state.available = true; await refresh(); }
    return j;
  }
  async function logout() { try { await call('/api/auth/logout', {}); } catch {} saveToken(null); state.authed = false; state.admin = false; state.tier = null; state.tierName = null; emit(); }

  /** demo mode: no server, nothing secret — behave as logged in so every panel can be previewed */
  function setDemo() { state.demo = true; state.available = true; state.configured = true; state.authed = true; state.admin = true; emit(); }

  /** keep in sync with what the server says in each state push */
  function fromState(st) {
    if (state.demo || !st || !st.auth) return;
    const a = !!st.auth.authed, ad = !!st.auth.admin;
    if (a !== state.authed || ad !== state.admin || (st.auth.configured != null && !!st.auth.configured !== state.configured)) {
      state.authed = a; state.admin = ad; state.tierName = st.auth.tierName || null; state.tier = st.auth.tier ?? null;
      if (st.auth.configured != null) state.configured = !!st.auth.configured;
      state.available = true;
      emit();
    }
  }

  /** fetch wrapper for every API call (adds the bearer token, resolves the backend address) */
  async function api(path, opts = {}) {
    await probe;
    return fetch(base() + path, { cache: 'no-store', credentials: sameOrigin() ? 'same-origin' : 'omit', ...opts, headers: headers(opts.headers || {}) });
  }
  /** 서버 주소를 직접 정하기 (빈 값 = 자동) */
  function setServer(url) { try { if (url) localStorage.setItem('aio.server', String(url).trim().replace(/\/+$/, '')); else localStorage.removeItem('aio.server'); } catch {} location.href = location.pathname; }

  AIO.auth = { state, refresh, login, logout, setDemo, fromState, sameOrigin, ORIGIN, api, base, headers, setServer, custom: () => custom, on: (f) => listeners.add(f) };
})();
