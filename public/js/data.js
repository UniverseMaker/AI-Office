// Data source: live collector when reachable, otherwise the demo simulator.
// The stream is read with fetch (not EventSource) so the login token can travel in a header from any page origin.
(function () {
  let handlers = null, demo = null, lastMsg = 0, ctrl = null, gen = 0, stale = false;
  // the server pings every 20 s even when nothing changes; any block (data or ping) proves the line is alive
  const alive = (host) => { lastMsg = Date.now(); if (stale || host !== undefined) { stale = false; handlers.onMode('live', host); } };

  function start(h) {
    handlers = h;
    const q = new URLSearchParams(location.search);
    if (q.has('demo')) return runDemo('forced');
    const abort = new AbortController();
    // 이 PC 가 아니면(터널·외부 기기) 응답이 느릴 수 있어서 더 기다린다
    const local = /^(127\.0\.0\.1|localhost)$/.test(location.hostname) || !location.protocol.startsWith('http');
    const timer = setTimeout(() => abort.abort(), local ? 2500 : 8000);
    AIO.auth.api('/api/state', { signal: abort.signal })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((st) => { clearTimeout(timer); h.onMode('live', st.host); h.onState(st); stream(); })
      .catch(() => { clearTimeout(timer); runDemo('offline'); });
    // 20 s pings → only call it a drop after two missed pings, and then actively reconnect
    setInterval(() => { if (!demo && lastMsg && Date.now() - lastMsg > 50e3 && !stale) { stale = true; h.onMode('reconnecting'); stream(); } }, 5000);
  }

  async function stream() {
    const my = ++gen;
    if (ctrl) ctrl.abort();
    ctrl = new AbortController();
    lastMsg = Date.now();
    try {
      const r = await AIO.auth.api('/api/stream', { signal: ctrl.signal, headers: { Accept: 'text/event-stream' } });
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, i); buf = buf.slice(i + 2);
          const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trimStart()).join('\n');
          if (!data) { alive(); continue; }
          try { const st = JSON.parse(data); alive(st.host); handlers.onState(st); } catch { alive(); }
        }
      }
    } catch (e) { if (e.name === 'AbortError' && my !== gen) return; }
    if (my !== gen) return;
    stale = true;
    handlers.onMode('reconnecting');
    setTimeout(() => { if (my === gen) stream(); }, 2000);
  }

  /** after login/logout the server must re-decide what this connection may see */
  function reconnect() {
    if (demo || !handlers) return;
    AIO.auth.api('/api/state').then((r) => r.json()).then((st) => handlers.onState(st)).catch(() => {});
    stream();
  }

  function runDemo(reason) {
    if (demo) return;
    demo = new AIO.Demo();
    window.AIO_DEMO = demo;
    AIO.auth.setDemo();
    handlers.onMode('demo', reason);
    handlers.onState(demo.step());
    setInterval(() => handlers.onState(demo.step()), 1500);
  }

  AIO.data = { start, reconnect, isDemo: () => !!demo, demo: () => demo };
})();
