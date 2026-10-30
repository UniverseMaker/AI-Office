/* AI OFFICE v6 — 펼침 유지
 * 세션 상세 · 관리 화면은 몇 초마다 새로 그려지는데, 그때마다 <details>(급여 · 지갑 · 메모 · 팀원 …)가 처음 상태로 접혀 버렸다.
 * 내가 펼치거나 접은 상태를 기억해 두었다가, 새로 그려진 같은 칸에 그대로 다시 입힌다.
 * 같은 칸인지: 가장 가까운 id 붙은 상자 + class + data-agent + 제목 글자(숫자는 빼고 — 금액 · 시간은 계속 바뀌니까)
 */
(function () {
  'use strict';
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  const KEY = 'aio.keepOpen';
  let mem = {};
  try { mem = JSON.parse(sessionStorage.getItem(KEY) || '{}') || {}; } catch { mem = {}; }
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(mem)); } catch {} };
  const keyOf = (d) => {
    if (d.hasAttribute('data-act-toggle') || d.hasAttribute('data-nokeep')) return null;   // 스스로 상태를 기억하는 칸은 손대지 않는다
    const box = d.parentElement && d.parentElement.closest('[id]');
    const sum = d.querySelector(':scope > summary');
    const txt = (sum ? sum.textContent : '').replace(/[\d.,:%+-]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return `${box ? box.id : ''}|${d.className}|${d.dataset.agent || ''}|${txt}`;
  };
  let applying = false;
  // 내가 누른 펼치기 · 접기 → 기억
  document.addEventListener('toggle', (ev) => {
    const d = ev.target;
    if (applying || !(d instanceof HTMLDetailsElement) || !d.__aioSeen) return;
    const k = keyOf(d); if (!k) return;
    mem[k] = d.open; save();
  }, true);
  document.addEventListener('click', (ev) => { const s = ev.target.closest && ev.target.closest('summary'); if (s && s.parentElement) s.parentElement.__aioSeen = true; }, true);
  document.addEventListener('keydown', (ev) => { const s = ev.target.closest && ev.target.closest('summary'); if (s && s.parentElement) s.parentElement.__aioSeen = true; }, true);
  // 새로 그려진 칸 → 기억한 상태 입히기
  const apply = (root) => {
    const list = root.tagName === 'DETAILS' ? [root] : root.querySelectorAll ? root.querySelectorAll('details') : [];
    for (const d of list) {
      const k = keyOf(d);
      if (!k || !(k in mem) || d.open === mem[k]) continue;
      applying = true; d.open = mem[k];
      setTimeout(() => { applying = false; }, 0);   // toggle 이벤트는 한 박자 늦게 온다
    }
  };
  new MutationObserver((recs) => {
    for (const r of recs) for (const n of r.addedNodes) if (n.nodeType === 1) apply(n);
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
