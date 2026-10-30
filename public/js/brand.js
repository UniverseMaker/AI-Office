// 🏷️ 타이틀 · 파비콘 (계정 옵션): 헤더 제목 · 짧은 제목 · 부제 · 로고 · 버전 뱃지 · 브라우저 탭 제목 · 파비콘(로고 · 이모지 · 글자 · 이미지 + 결정 필요 배지)
//   한국어 · 영어를 따로 정할 수 있고, 비워 두면 기본값(영어는 번역). 언어를 바꿨다 돌아와도 원래 제목으로 돌아온다.
//   (예전엔 헤더 글자를 '처음 본 값' 으로 기억해서, 영어일 때 처음 열면 한국어로 돌아와도 영어가 남았다)
(function () {
  const tr = (...a) => (AIO.tr ? AIO.tr(...a) : a[0]);
  const DEF = { title: 'AI 인공지능 연구원', short: 'AI 연구원', logo: '🧶' };
  const en = () => AIO.lang === 'en';
  const P = () => (AIO.prefs ? AIO.prefs.get() : {});
  let urgentN = 0, favKey = '', favURL = '';

  function titles(p = P()) {
    const title = en() ? p.brandTitleEn || p.brandTitle || tr(DEF.title) : p.brandTitle || DEF.title;
    const short = en() ? p.brandShortEn || p.brandTitleEn || p.brandShort || p.brandTitle || tr(DEF.short) : p.brandShort || p.brandTitle || DEF.short;
    const tab = (en() ? p.tabTitleEn || p.tabTitle : p.tabTitle) || title;
    return { title, short, tab };
  }
  /** 직접 쓴 부제 (없으면 null → 서버 이름 · AI 세션 캠퍼스) */
  const sub = (p = P()) => (en() ? p.brandSubEn || p.brandSub : p.brandSub) || null;
  const IMG = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/;     // 올린 그림만 (외부 주소 · 스크립트 막기)
  const okImg = (s) => (typeof s === 'string' && IMG.test(s) ? s : null);
  const logoOf = (p) => (okImg(p.brandLogoImg) ? { img: p.brandLogoImg } : { text: String(p.brandLogo || DEF.logo).slice(0, 8) });

  // ---------------------------------------------------------------- 파비콘: 64px 캔버스에 그려서 data URL
  function drawFavicon(p, done) {
    const mode = p.favMode || 'logo';
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const finish = () => {
      if (p.favBadge !== false && urgentN > 0) {           // 결정 필요 배지 (오른쪽 위 빨간 원 + 숫자)
        const n = urgentN > 9 ? '9+' : String(urgentN);
        g.fillStyle = '#e5534b'; g.beginPath(); g.arc(46, 18, 17, 0, Math.PI * 2); g.fill();
        g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.stroke();
        g.fillStyle = '#ffffff'; g.font = `bold ${n.length > 1 ? 18 : 22}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, 46, 19);
      }
      done(c.toDataURL('image/png'));
    };
    const rr = (color) => { g.fillStyle = color; const r = 14; g.beginPath(); g.moveTo(r, 0); g.arcTo(64, 0, 64, 64, r); g.arcTo(64, 64, 0, 64, r); g.arcTo(0, 64, 0, 0, r); g.arcTo(0, 0, 64, 0, r); g.closePath(); g.fill(); };
    const img = mode === 'image' ? okImg(p.favImg) : mode === 'logo' ? okImg(p.brandLogoImg) : null;
    if (img) {
      const im = new Image();
      im.onload = () => { g.drawImage(im, 0, 0, 64, 64); finish(); };
      im.onerror = () => finish();
      im.src = img; return;
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (mode === 'text') {
      const t = String(p.favText || 'AI').slice(0, 3);
      rr(p.favBg || '#f0a03c');
      g.fillStyle = p.favFg || '#ffffff'; g.font = `bold ${t.length >= 3 ? 26 : t.length === 2 ? 32 : 44}px 'Jua', 'Malgun Gothic', system-ui, sans-serif`;
      g.fillText(t, 32, 35);
    } else {
      if (p.favBgOn) rr(p.favBg || '#f0a03c');
      const e = mode === 'emoji' ? p.favEmoji || '🧶' : logoOf(p).text;
      g.font = `${p.favBgOn ? 44 : 54}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
      g.fillText(e, 32, 36);
    }
    finish();
  }
  function setFavicon(url) {
    let l = document.querySelector('link[rel~="icon"]');
    if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
    l.href = url;
  }
  function favicon(force) {
    const p = P();
    const key = JSON.stringify([p.favMode, p.favEmoji, p.favText, p.favBg, p.favFg, p.favBgOn, p.favBadge, (p.favImg || '').length, (p.brandLogoImg || '').length, p.brandLogo, urgentN]);
    if (!force && key === favKey) return;
    favKey = key;
    drawFavicon(p, (url) => { favURL = url; setFavicon(url); const pv = document.getElementById('pfFav'); if (pv) pv.src = url; });
  }

  // ---------------------------------------------------------------- 헤더 · 탭 제목
  const TIMER_TITLE = /^\d{1,2}:\d{2} /;            // 업무타이머가 돌 때는 탭 제목을 타이머가 쓴다
  function apply(force) {
    const p = P(), t = titles(p);
    const nf = document.querySelector('.brand .name-full'), ns = document.querySelector('.brand .name-short');
    if (nf) nf.textContent = t.title;
    if (ns) ns.textContent = t.short;
    const lg = document.querySelector('.brand .logo');
    if (lg) { const L = logoOf(p); if (L.img) lg.innerHTML = `<img src="${L.img}" alt="">`; else lg.textContent = L.text; }
    const vb = document.getElementById('verBadge'); if (vb) vb.hidden = p.showVer === false;
    const sb = document.getElementById('hostLabel'), cs = sub(p);
    if (sb && cs) sb.textContent = cs; else if (sb && AIO.ui && AIO.ui.repaint) AIO.ui.repaint();
    const full = (p.tabCount !== false && urgentN ? `(${urgentN}) ` : '') + t.tab;
    if (force || !TIMER_TITLE.test(document.title)) document.title = full;
    favicon(force);
  }
  function setUrgent(n) { if (n === urgentN) return; urgentN = n; apply(false); }

  window.addEventListener('aio:lang', () => apply(true));
  document.addEventListener('DOMContentLoaded', () => apply(true));
  AIO.brand = { apply, setUrgent, sub, titles, favURL: () => favURL, DEF };
  apply(true);
})();
