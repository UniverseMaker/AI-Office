/* ========================================================================
   utils.js — small helpers, no dependencies
   ==================================================================== */
(function (global) {
  'use strict';

  const U = {};

  // DOM ------------------------------------------------------------------
  U.el = function (tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(node.style, attrs[k]);
      else if (k.startsWith('on') && typeof attrs[k] === 'function') node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null && attrs[k] !== false) node.setAttribute(k, attrs[k]);
    }
    if (children != null) U.append(node, children);
    return node;
  };
  U.append = function (parent, children) {
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null || c === false) return;
      parent.appendChild(typeof c === 'string' || typeof c === 'number'
        ? document.createTextNode(String(c)) : c);
    });
    return parent;
  };
  U.$  = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  U.clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); return node; };

  // Backdrop click-to-close guarded by mousedown origin. A modal closes only
  // when the press (mousedown) STARTED on the backdrop itself — not when a drag
  // begun inside the modal (e.g. selecting text in an input) happens to release
  // its mouseup on the backdrop. Scoped to this backdrop node only (no document
  // listeners). Callers keep their own Esc / close-button handling unchanged.
  U.bindBackdropClose = function (backdrop, closeFn) {
    var downSelf = false;
    backdrop.addEventListener('mousedown', function (e) { downSelf = (e.target === backdrop); });
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop && downSelf) { downSelf = false; closeFn(e); }
      else { downSelf = false; }
    });
    return backdrop;
  };

  // escape ---------------------------------------------------------------
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, m =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  };
  // tiny markdown: **bold**, links, line breaks
  U.mdInline = function (s) {
    let t = U.esc(s || '');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    t = t.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    return t;
  };

  // id / uuid ------------------------------------------------------------
  U.uid = function (p) { return (p || 'id') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); };

  // dates ----------------------------------------------------------------
  U.todayISO = function () { return new Date().toISOString().slice(0, 10); };
  U.parseDate = function (s) { if (!s) return null; const d = new Date(s + (s.length <= 10 ? 'T00:00:00' : '')); return isNaN(d) ? null : d; };
  U.fmtDate = function (s) { const d = U.parseDate(s); if (!d) return '—'; return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()); };
  U.daysBetween = function (a, b) { const da = U.parseDate(a), db = U.parseDate(b); if (!da || !db) return 0; return Math.round((db - da) / 86400000); };
  U.isOverdue = function (due, done) { if (!due || done) return false; const d = U.parseDate(due); return d && d < startOfDay(new Date()); };
  U.relTime = function (s) {
    const d = (s instanceof Date) ? s : U.parseDate(typeof s === 'number' ? undefined : s) || new Date(s);
    if (!d || isNaN(d)) return '';
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return '방금 전';
    if (diff < 3600) return Math.floor(diff / 60) + '분 전';
    if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
    if (diff < 2592000) return Math.floor(diff / 86400) + '일 전';
    if (diff < 31536000) return Math.floor(diff / 2592000) + '개월 전';
    return Math.floor(diff / 31536000) + '년 전';
  };
  function pad(n) { return String(n).padStart(2, '0'); }
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  U.startOfDay = startOfDay;

  // color helpers --------------------------------------------------------
  const AV_COLORS = ['#4f6df5', '#8f4fe0', '#e5493a', '#f0912b', '#36b37e', '#00a3bf', '#eb5a9d', '#6554c0'];
  U.colorFor = function (str) {
    let h = 0; str = String(str || '');
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return AV_COLORS[h % AV_COLORS.length];
  };
  U.initials = function (name) {
    if (!name) return '?';
    const s = String(name).trim();
    if (!s) return '?';
    // Korean names → single leading character (한글 1글자). Names containing a
    // Hangul syllable/jamo (가-힣 · 자모 · 호환자모) collapse to their first char;
    // Latin/other names keep the existing 2-char / two-word-initials behavior.
    if (/[가-힣ᄀ-ᇿ㄰-㆏]/.test(s)) return s.charAt(0);
    const parts = s.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // misc -----------------------------------------------------------------
  U.debounce = function (fn, ms) { let t; return function () { clearTimeout(t); const a = arguments, c = this; t = setTimeout(() => fn.apply(c, a), ms); }; };
  U.download = function (filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  };
  U.toast = function (msg, type) {
    const host = U.$('#toastHost'); if (!host) return alert(msg);
    const t = U.el('div', { class: 'toast ' + (type || '') , text: msg });
    host.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2200);
    setTimeout(() => t.remove(), 2600);
  };
  U.confirm = function (msg) { return global.confirm(msg); };
  U.csvCell = function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };

  global.U = U;
})(window);
