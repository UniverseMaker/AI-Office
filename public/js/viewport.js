// v6 화면 배치(viewport): 상단바가 화면 폭·UI 크기·관리 독에 따라 1~3줄로 접히므로 실제 높이를 재서
// 오른쪽 세션 패널 · 왼쪽 상세 패널 · 층 이동 패널이 그 아래에서 시작하도록 CSS 변수로 알려 준다.
(function () {
  const root = document.documentElement;
  function measure() {
    const tb = document.getElementById('topbar');
    if (!tb) return;
    let bottom = 0;
    for (const el of tb.children) {
      if (el.hidden || getComputedStyle(el).display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.height) bottom = Math.max(bottom, r.bottom);
    }
    root.style.setProperty('--top-h', Math.round(bottom || 62) + 'px');
    const tk = document.getElementById('ticker');
    const tr = tk && getComputedStyle(tk).display !== 'none' ? tk.getBoundingClientRect() : null;
    root.style.setProperty('--bot-h', Math.round(tr && tr.height ? innerHeight - tr.top : 10) + 'px');
  }
  let raf = 0;
  const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
  addEventListener('resize', later);
  addEventListener('load', later);
  document.addEventListener('DOMContentLoaded', () => {
    measure();
    const tb = document.getElementById('topbar');
    if (tb && 'ResizeObserver' in window) { const ro = new ResizeObserver(later); ro.observe(tb); for (const el of tb.children) ro.observe(el); }
    if (tb && 'MutationObserver' in window) new MutationObserver(later).observe(tb, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
    new MutationObserver(later).observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
  });
  window.AIO = window.AIO || {};
  AIO.relayout = later;
})();
