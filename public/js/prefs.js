// 계정 옵션 (v5): 테마 · 팔레트 · 강조색 · 카드 스타일 · 모서리 · 그림자 · 글꼴 · 글자 크기 · 사이드바 폭 · 촘촘하게 · 티커 · 애니메이션 ·
// 헤더 제목 · 배경(캔버스) 색 · 맵 표시. 로그인하면 계정에 저장(서버 /api/prefs), 아니면 이 브라우저에만 저장.
(function () {
  const esc = AIO.esc, tr = (...a) => AIO.tr(...a);
  const DEF = { themeV: 2, showVer: true, tabCount: true, favBadge: true, favMode: 'logo', favBg: '#f0a03c', favFg: '#ffffff', theme: 'light', palette: 'cream', dpalette: 'cocoa', accent: '#f0a03c', cardStyle: 'glass', cardAlpha: 92, radius: 16, shadow: 100, font: 'Gowun Dodum', titleFont: 'Jua', fontScale: 100, sideWidth: 300, density: 'normal', ticker: true, chips: true, motion: true, brandTitle: '', brandSub: '', sky: 'default', inkColor: '', ink2Color: '', linkColor: '', headColor: '', tagColor: '' };
  /** 글자색 옵션 (빈 값 = 팔레트 기본). [키, 이름, CSS 변수, 라이트 기본, 다크 기본] */
  const TEXT_COLORS = [['inkColor', '본문 글자', '--ink'], ['ink2Color', '보조 글자 (설명 · 시간)', '--ink2'], ['headColor', '제목 글자', '--head'], ['linkColor', '링크 (소속 · 바로가기)', '--link'], ['tagColor', '태그 · 배지 글자', '--tag-ink']];
  const HEX = /^#[0-9a-fA-F]{6}$/;
  const PAL = {
    cream: ['크림', '#efe9df', '#f7f3ec', '#e2d8c9', '#3b332b', '#7a6e61', '255,252,247'],
    white: ['화이트', '#f4f5f7', '#ffffff', '#e4e7ec', '#25292e', '#6b7280', '255,255,255'],
    mint: ['민트', '#e6f2ec', '#f2f9f5', '#cfe3d8', '#23392f', '#5d7a6c', '250,255,252'],
    sky: ['하늘', '#e5eef8', '#f2f7fd', '#cfdcec', '#22324a', '#5b6f8a', '250,252,255'],
    lavender: ['라벤더', '#eeeaf6', '#f7f4fc', '#dcd4ec', '#33294a', '#776b8f', '253,251,255'],
    rose: ['로즈', '#f6e9ea', '#fcf3f4', '#ecd5d8', '#45282d', '#8a6a6f', '255,251,251'],
    sand: ['샌드', '#f1e6d0', '#f9f2e3', '#e3d2b0', '#3e3220', '#7d6a4b', '255,251,242'],
  };
  const DPAL = {
    cocoa: ['코코아', '#1f1c19', '#2a2622', '#3b352e', '#f1e9dd', '#b3a796', '40,36,32'],
    midnight: ['미드나잇', '#141a26', '#1d2433', '#2e384c', '#e6ecf7', '#9aa7bf', '27,33,47'],
    forest: ['포레스트', '#131c17', '#1c2721', '#2c3a32', '#e3efe7', '#98b0a2', '25,35,30'],
    plum: ['플럼', '#1d1622', '#271e2d', '#3a2e42', '#efe5f5', '#ad9bb9', '37,28,43'],
    ink: ['잉크', '#101112', '#1a1b1d', '#2c2e31', '#ececec', '#a0a3a8', '24,25,27'],
  };
  const ACCENTS = ['#f0a03c', '#e5534b', '#e2667f', '#a67be0', '#4e7cf6', '#1f9fb4', '#3fb27f', '#7a5540', '#2b2622'];
  const FONTS = ['Gowun Dodum', 'Noto Sans KR', 'Nanum Gothic', 'IBM Plex Sans KR', 'Gothic A1', 'Nanum Myeongjo', 'Sunflower', 'Gaegu', 'Poor Story', 'Dongle', 'Malgun Gothic'];
  const TFONTS = ['Jua', 'Do Hyeon', 'Black Han Sans', 'Gowun Dodum', 'Noto Sans KR', 'Hi Melody', 'Gaegu', 'Dongle', 'Malgun Gothic'];
  const SKIES = { default: ['기본', null], dawn: ['새벽', ['#f7c59f', '#fde6c8']], ocean: ['바다', ['#9fd3f0', '#e6f6fb']], forest: ['숲', ['#b9dcb0', '#eef6e6']], mono: ['회색', ['#d5d7da', '#f1f2f3']], deep: ['어두운 남색', ['#1d2547', '#3a4170']] };
  let P = { ...DEF };
  let stored0 = {};
  try { stored0 = JSON.parse(localStorage.getItem('aio.prefs') || '{}') || {}; } catch {}
  Object.assign(P, stored0);
  /** v6: 기본 모드를 라이트로 — 예전에 저장된 '시스템(auto)'은 한 번만 라이트로 옮긴다 (그 뒤에 고른 값은 그대로) */
  const migrate = (o) => { if (o.themeV !== 2) { if (!o.theme || o.theme === 'auto') o.theme = 'light'; o.themeV = 2; } return o; };
  if (Object.keys(stored0).length && stored0.themeV !== 2) { P.themeV = 0; migrate(P); try { localStorage.setItem('aio.prefs', JSON.stringify(P)); } catch {} }

  const root = document.documentElement;
  const dark = () => P.theme === 'dark' || (P.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const loaded = new Set(['Gowun Dodum', 'Jua']);
  function loadFont(f) {
    if (!f || loaded.has(f) || f === 'Malgun Gothic') return;
    loaded.add(f);
    const l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;700&display=swap`;
    document.head.appendChild(l);
  }
  function apply() {
    const d = dark();
    if (P.theme === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', P.theme);
    const pal = d ? DPAL[P.dpalette] || DPAL.cocoa : PAL[P.palette] || PAL.cream;
    const [, bg, bg2, line, ink, ink2, card] = pal;
    const st = root.style, a = (P.cardStyle === 'solid' ? 100 : P.cardAlpha) / 100;
    st.setProperty('--bg', bg); st.setProperty('--bg2', bg2); st.setProperty('--line', line); st.setProperty('--ink', ink); st.setProperty('--ink2', ink2);
    st.setProperty('--card', `rgba(${card},${a})`);
    st.setProperty('--accent', HEX.test(P.accent) ? P.accent : DEF.accent);
    // 글자색: 고르지 않으면 팔레트에 맞는 기본값 (링크는 배경에서 잘 보이는 파랑 계열)
    st.setProperty('--link', d ? '#9cc4ff' : '#2f62c9'); st.setProperty('--head', ink); st.setProperty('--tag-ink', ink);
    for (const [k, , v] of TEXT_COLORS) if (HEX.test(P[k] || '')) st.setProperty(v, P[k]);
    st.setProperty('--radius', P.radius + 'px');
    st.setProperty('--shadow', P.shadow ? `0 6px 20px rgba(${d ? '0,0,0' : '80,60,30'},${(d ? 0.35 : 0.12) * P.shadow / 100})` : 'none');
    loadFont(P.font); loadFont(P.titleFont);
    st.setProperty('--font', `'${P.font}', 'Gowun Dodum', 'Malgun Gothic', sans-serif`);
    st.setProperty('--cute', `'${P.titleFont}', 'Jua', 'Malgun Gothic', sans-serif`);
    st.setProperty('--ui-zoom', String(P.fontScale / 100));
    st.setProperty('--side-w', P.sideWidth + 'px');
    const b = document.body;
    if (b) {
      b.classList.toggle('compact', P.density === 'compact');
      b.classList.toggle('no-ticker', !P.ticker);
      b.classList.toggle('no-chips', !P.chips);
      b.classList.toggle('reduce-motion', !P.motion);
      b.classList.toggle('card-solid', P.cardStyle === 'solid');
      b.classList.toggle('card-outline', P.cardStyle === 'outline');
    }
    if (AIO.brand) AIO.brand.apply(true);              // 🏷️ 헤더 제목 · 부제 · 로고 · 탭 제목 · 파비콘 (brand.js)
    window.dispatchEvent(new Event('resize'));
  }
  let saveT = null;
  function save() {
    try { localStorage.setItem('aio.prefs', JSON.stringify(P)); } catch {}
    clearTimeout(saveT);
    saveT = setTimeout(() => { if (AIO.auth && AIO.auth.state.authed) AIO.auth.api('/api/prefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(P) }).catch(() => {}); }, 500);
  }
  /** 로그인하면 계정에 저장된 옵션을 불러온다 */
  async function pull() {
    try { const r = await AIO.auth.api('/api/prefs'); if (!r.ok) return; const j = await r.json(); if (j.prefs) { const old = j.prefs.themeV !== 2; P = migrate({ ...j.prefs, ...(old ? { themeV: 0 } : {}) }); P = { ...DEF, ...P }; if (old) setTimeout(save, 0); try { localStorage.setItem('aio.prefs', JSON.stringify(P)); } catch {} apply(); } } catch {}
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', apply);

  // ---------------------------------------------------------------- 계정 옵션 창
  const sw = (k, v, color, label) => `<button class="pf-sw ${P[k] === v ? 'on' : ''}" data-pk="${k}" data-pv="${esc(v)}" title="${esc(tr(label || v))}" style="--c:${color}">${label ? `<span>${esc(tr(label))}</span>` : ''}</button>`;
  const seg = (k, opts) => `<div class="pf-seg">${opts.map(([v, l]) => `<button class="${P[k] === v ? 'on' : ''}" data-pk="${k}" data-pv="${v}">${tr(l)}</button>`).join('')}</div>`;
  const range = (k, min, max, step, unit) => `<div class="pf-range"><input type="range" min="${min}" max="${max}" step="${step}" value="${P[k]}" data-pr="${k}"><b>${P[k]}${unit}</b></div>`;
  const tog = (k, l) => `<label class="pf-tog"><input type="checkbox" data-pt="${k}" ${P[k] ? 'checked' : ''}><span>${tr(l)}</span></label>`;
  const row = (l, h) => `<div class="pf-row"><span class="pf-l">${tr(l)}</span><div class="pf-c">${h}</div></div>`;
  function html() {
    const W = AIO.ui && AIO.ui.world ? AIO.ui.world() : null, o = W ? W.opts : {};
    const st = AIO.auth.state;
    let h = `<div class="pf"><h2>👤 ${tr('계정 옵션')}</h2>`;
    h += `<div class="pf-acct">${st.authed ? `🔓 <b>${tr('관리자 계정')}</b> <small>${tr('옵션이 이 계정에 저장돼 어느 브라우저에서든 같아요')}</small> <button class="btn ghost sm" data-act="logout">${tr('로그아웃')}</button>` : `🔒 ${tr('로그인 안 함 — 옵션은 이 브라우저에만 저장돼요')} <button class="btn sm" data-act="login">${tr('로그인')}</button>`}</div>`;
    h += `<div class="pf-grid"><section><h3>🎨 ${tr('테마 · 색')}</h3>`;
    h += row('모드', seg('theme', [['auto', '🖥️ 시스템'], ['light', '☀️ 라이트'], ['dark', '🌙 다크']]));
    h += row('라이트 팔레트', `<div class="pf-sws">${Object.entries(PAL).map(([k, v]) => sw('palette', k, v[1], v[0])).join('')}</div>`);
    h += row('다크 팔레트', `<div class="pf-sws">${Object.entries(DPAL).map(([k, v]) => sw('dpalette', k, v[1], v[0])).join('')}</div>`);
    h += row('강조색', `<div class="pf-sws">${ACCENTS.map((c) => sw('accent', c, c)).join('')}<input type="color" value="${esc(P.accent)}" data-pc="accent" title="${tr('직접 고르기')}"></div>`);
    h += `<div class="pf-sub">${tr('글자색 — 비워 두면 팔레트에 맞춰 자동')}</div>`;
    for (const [k, l, v] of TEXT_COLORS) h += row(l, `<div class="pf-sws"><input type="color" value="${esc(HEX.test(P[k] || '') ? P[k] : ((c) => (HEX.test(c) ? c : '#888888'))(getComputedStyle(root).getPropertyValue(v).trim()))}" data-pc="${k}"><span class="pf-cv" style="color:var(${v})">${tr('가나다 Abc')}</span>${P[k] ? `<button class="btn ghost sm" data-pk="${k}" data-pv="">${tr('자동')}</button>` : `<small class="muted">${tr('자동')}</small>`}</div>`);
    h += row('카드 스타일', seg('cardStyle', [['glass', '🫧 반투명'], ['solid', '⬜ 불투명'], ['outline', '▭ 테두리']]));
    h += row('카드 투명도', range('cardAlpha', 55, 100, 1, '%'));
    h += row('모서리 둥글기', range('radius', 4, 28, 1, 'px'));
    h += row('그림자', range('shadow', 0, 200, 10, '%'));
    h += row('맵 배경', `<div class="pf-sws">${Object.entries(SKIES).map(([k, v]) => sw('sky', k, v[1] ? `linear-gradient(${v[1][0]},${v[1][1]})` : 'linear-gradient(#cfe6f5,#eef3ea)', v[0])).join('')}</div>`);
    h += `</section><section><h3>🔤 ${tr('글꼴 · 크기')}</h3>`;
    h += row('본문 글꼴', `<select data-ps="font">${FONTS.map((f) => `<option ${P.font === f ? 'selected' : ''} style="font-family:'${f}'">${f}</option>`).join('')}</select>`);
    h += row('제목 글꼴', `<select data-ps="titleFont">${TFONTS.map((f) => `<option ${P.titleFont === f ? 'selected' : ''} style="font-family:'${f}'">${f}</option>`).join('')}</select>`);
    h += row('UI 크기', range('fontScale', 80, 140, 5, '%'));
    h += `<div class="pf-preview"><b style="font-family:var(--cute)">${tr('미리보기 · AI 인공지능 연구원')}</b><span>${tr('가나다라마바사 ABC 123 — 지금 일하는 중 · 결정 필요')}</span><button class="btn sm">${tr('버튼')}</button></div>`;
    h += `<h3>🧩 ${tr('레이아웃')}</h3>`;
    h += row('사이드바 폭', range('sideWidth', 240, 460, 10, 'px'));
    h += row('간격', seg('density', [['normal', '보통'], ['compact', '촘촘하게']]));
    h += `<div class="pf-togs">${tog('chips', '상단 상태 칩')}${tog('ticker', '아래 소식 티커')}${tog('motion', '애니메이션')}</div>`;
    // 🏷️ 타이틀 · 파비콘
    {
      const B = AIO.brand ? AIO.brand.DEF : { title: '', short: '', logo: '🧶' };
      const pair = (k, ph) => `<div class="pf-pair"><label><b class="pf-lg">한</b><input class="mg-in" data-pi="${k}" value="${esc(P[k] || '')}" placeholder="${esc(ph)}"></label><label><b class="pf-lg">EN</b><input class="mg-in" data-pi="${k}En" value="${esc(P[k + 'En'] || '')}" placeholder="${esc(AIO.lang === 'en' ? tr(ph) : AIO.i18n && AIO.i18n.dict[ph] || tr('비우면 번역'))}"></label></div>`;
      const EMO = ['🧶', '🤖', '🏢', '🧪', '🚀', '🐱', '🦊', '🌱', '💡', '⭐', '🎯', '🧠'];
      h += `<h3>🏷️ ${tr('타이틀 · 파비콘')}</h3>`;
      h += row('헤더 제목', pair('brandTitle', B.title));
      h += row('짧은 제목 (좁은 화면)', pair('brandShort', B.short));
      h += row('부제', pair('brandSub', tr('서버 이름 · AI 세션 캠퍼스')));
      h += row('로고', `<div class="pf-sws">${EMO.map((e) => `<button class="pf-emo ${!P.brandLogoImg && (P.brandLogo || '🧶') === e ? 'on' : ''}" data-pk="brandLogo" data-pv="${e}">${e}</button>`).join('')}<input class="mg-in pf-emoin" data-pi="brandLogo" value="${esc(P.brandLogo || '')}" placeholder="${tr('직접')}" maxlength="8"></div>`
        + `<div class="pf-file"><label class="btn ghost sm">🖼️ ${tr('로고 그림 올리기')}<input type="file" accept="image/*" data-pfile="brandLogoImg" hidden></label>${P.brandLogoImg ? `<img src="${esc(P.brandLogoImg)}" alt=""><button class="btn ghost sm" data-pk="brandLogoImg" data-pv="">${tr('그림 빼기')}</button>` : ''}</div>`);
      h += `<div class="pf-togs">${tog('showVer', '버전 뱃지 (v6)')}</div>`;
      h += row('브라우저 탭 제목', pair('tabTitle', tr('비우면 헤더 제목')));
      h += `<div class="pf-togs">${tog('tabCount', '탭 제목 앞에 결정 필요 수 (2)')}${tog('favBadge', '파비콘에 결정 필요 배지')}</div>`;
      h += row('파비콘', seg('favMode', [['logo', '로고와 같게'], ['emoji', '이모지'], ['text', '글자'], ['image', '그림']]));
      if (P.favMode === 'emoji') h += row('파비콘 이모지', `<div class="pf-sws">${EMO.map((e) => `<button class="pf-emo ${(P.favEmoji || '🧶') === e ? 'on' : ''}" data-pk="favEmoji" data-pv="${e}">${e}</button>`).join('')}<input class="mg-in pf-emoin" data-pi="favEmoji" value="${esc(P.favEmoji || '')}" placeholder="${tr('직접')}" maxlength="8"></div>`);
      if (P.favMode === 'text') h += row('파비콘 글자', `<input class="mg-in pf-emoin" data-pi="favText" value="${esc(P.favText || '')}" placeholder="AI" maxlength="3">`);
      if (P.favMode === 'text' || P.favMode === 'emoji' || (P.favMode || 'logo') === 'logo') h += row('파비콘 색', `<div class="pf-sws">${P.favMode === 'text' ? '' : tog('favBgOn', '배경 칠하기')}<label>${tr('배경')} <input type="color" value="${esc(P.favBg || '#f0a03c')}" data-pc="favBg"></label>${P.favMode === 'text' ? `<label>${tr('글자')} <input type="color" value="${esc(P.favFg || '#ffffff')}" data-pc="favFg"></label>` : ''}</div>`);
      if (P.favMode === 'image') h += row('파비콘 그림', `<div class="pf-file"><label class="btn ghost sm">🖼️ ${tr('그림 올리기')}<input type="file" accept="image/*" data-pfile="favImg" hidden></label>${P.favImg ? `<button class="btn ghost sm" data-pk="favImg" data-pv="">${tr('그림 빼기')}</button>` : `<small class="muted">${tr('정사각형 그림이 좋아요 · 64px 로 줄여 저장')}</small>`}</div>`);
      const T0 = AIO.brand ? AIO.brand.titles(P) : { tab: '' };
      h += `<div class="pf-tabpv"><img id="pfFav" src="${esc(AIO.brand ? AIO.brand.favURL() : '')}" alt=""><span>${esc(T0.tab)}</span><small>${tr('브라우저 탭 미리보기')}</small></div>`;
    }
    h += `</section><section><h3>🗺️ ${tr('맵 표시')}</h3><div class="pf-togs">`;
    h += [['labels', '🏷️ 이름표'], ['bubbles', '💬 말풍선'], ['lines', '🧵 위임선(털실)'], ['rank', '🎖️ 직급']].map(([k, l]) => `<label class="pf-tog"><input type="checkbox" data-wo="${k}" ${o[k] !== false ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('');
    h += `</div>`;
    for (const [k, l] of [['labelScale', '🏷️ 이름표 크기'], ['signScale', '🪧 방·팀 표지판 크기'], ['bubbleScale', '💬 말풍선 크기']]) h += row(l, `<div class="pf-range"><input type="range" min="60" max="200" step="5" value="${Math.round((+o[k] || 1) * 100)}" data-wscale="${k}"><b>${Math.round((+o[k] || 1) * 100)}%</b></div>`);
    { const hc = W ? W.heatCfg() : { on: true, t: [1, 5, 10], speed: 1, fx: {} };
      h += `<div class="pf-sub">🔥 ${tr('층 강조 — 세션 수에 따라 층 버튼 · 빌딩 외벽을 강조')}</div>`;
      h += row('층 강조', `<label class="pf-tog"><input type="checkbox" data-wheat="on" ${hc.on ? 'checked' : ''}><span>${tr('켜기')}</span></label>`);
      h += row('기준 (세션 수)', `<div class="pf-heatt">${[['낮음', 0], ['보통', 1], ['높음', 2]].map(([l, i]) => `<label>${tr(l)} <input class="mg-in" type="number" min="1" max="99" data-wheatt="${i}" value="${hc.t[i]}">${tr('명 ↑')}</label>`).join('')}</div>`);
      h += row('외벽 효과', `<div class="pf-togs">${[['tint', '🔥 단계별 불빛'], ['blink', '💡 깜빡임 (높음)'], ['wave', '🌊 흐르는 불빛 (보통 ↑)'], ['neon', '✨ 네온 띠'], ['count', '👥 인원 숫자'], ['rainbow', '🌈 무지개 (보통 ↑)']].map(([k, l]) => `<label class="pf-tog"><input type="checkbox" data-wfx="${k}" ${hc.fx[k] ? 'checked' : ''}><span>${tr(l)}</span></label>`).join('')}</div>`);
      h += row('효과 속도', `<div class="pf-range"><input type="range" min="30" max="300" step="10" value="${Math.round(hc.speed * 100)}" data-wheatspeed="1"><b>${Math.round(hc.speed * 100)}%</b></div>`); }
    h += row('이름표에 표시', `<div class="pf-seg">${[['persona', '🧑 캐릭터 이름 · 국기'], ['title', '📄 세션 제목']].map(([v, l]) => `<button class="${(o.tagName || 'persona') === v ? 'on' : ''}" data-wtag="${v}">${tr(l)}</button>`).join('')}</div>`);
    h += `${row('시간대', `<div class="pf-seg">${[['auto', '실제'], ['day', '낮'], ['dusk', '노을'], ['night', '밤']].map(([v, l]) => `<button class="${(o.sky || 'auto') === v ? 'on' : ''}" data-wsky="${v}">${tr(l)}</button>`).join('')}</div>`)}`;
    h += `<div class="pf-foot"><button class="btn ghost sm" data-preset="reset">↺ ${tr('기본값으로')}</button><button class="btn ghost sm" data-preset="night">🌙 ${tr('야간 작업용')}</button><button class="btn ghost sm" data-preset="big">🔍 ${tr('큰 글씨')}</button><button class="btn ghost sm" data-preset="clean">✨ ${tr('깔끔하게')}</button></div>`;
    h += `<p class="muted">${tr('바꾸는 즉시 적용·저장돼요.')}</p></section></div></div>`;
    return h;
  }
  const PRESETS = { reset: DEF, night: { theme: 'dark', dpalette: 'midnight', accent: '#4e7cf6', shadow: 60 }, big: { fontScale: 120, sideWidth: 360 }, clean: { cardStyle: 'solid', radius: 10, shadow: 40, font: 'Noto Sans KR', titleFont: 'Noto Sans KR', palette: 'white' } };
  let el = null;
  function open() {
    if (!AIO.ui || !AIO.ui.modal) return;
    AIO.ui.modal(html(), 'wide pf-card');
    el = document.getElementById('modalCard');
    if (!el.dataset.pfBound) {
      el.dataset.pfBound = '1';
      el.addEventListener('click', onClick);
      el.addEventListener('input', onInput);
      el.addEventListener('change', onInput);
    }
  }
  const rerender = () => { if (el && el.querySelector('.pf')) { const sc = el.scrollTop; el.innerHTML = `<button class="close" data-act="mclose" aria-label="${tr('닫기')}">✕</button>${html()}`; el.scrollTop = sc; } };
  function set(k, v, re = true) { P[k] = v; apply(); save(); if (re) rerender(); }
  function onClick(ev) {
    if (!el.querySelector('.pf')) return;
    const b = ev.target.closest('[data-pk],[data-preset],[data-wsky],[data-wtag]');
    if (!b) return;
    if (b.dataset.preset) { P = { ...(b.dataset.preset === 'reset' ? DEF : P), ...PRESETS[b.dataset.preset] }; apply(); save(); rerender(); return; }
    if (b.dataset.wtag) { const W = AIO.ui.world(); W.opts.tagName = b.dataset.wtag; try { localStorage.setItem('aio.opts', JSON.stringify(W.opts)); } catch {} rerender(); return; }
    if (b.dataset.wsky) { const W = AIO.ui.world(); W.opts.sky = b.dataset.wsky; try { localStorage.setItem('aio.opts', JSON.stringify(W.opts)); } catch {} W.caches.clear(); rerender(); return; }
    set(b.dataset.pk, b.dataset.pv);
  }
  function onInput(ev) {
    if (!el.querySelector('.pf')) return;
    const t = ev.target;
    if (t.dataset.pr) { set(t.dataset.pr, +t.value, false); const lab = t.parentElement.querySelector('b'); if (lab) lab.textContent = t.value + (t.dataset.pr === 'cardAlpha' || t.dataset.pr === 'fontScale' || t.dataset.pr === 'shadow' ? '%' : 'px'); }
    else if (t.dataset.pc && ev.type === 'change') set(t.dataset.pc, t.value);
    else if (t.dataset.ps) set(t.dataset.ps, t.value);
    else if (t.dataset.pt && ev.type === 'change') set(t.dataset.pt, t.checked, false);
    else if (t.dataset.pi && ev.type === 'change') set(t.dataset.pi, t.value.trim(), /^(brandLogo|favEmoji|favText)$/.test(t.dataset.pi));
    else if (t.dataset.pfile && ev.type === 'change' && t.files && t.files[0]) {     // 그림 → 64px PNG 로 줄여 저장 (계정 옵션 크기 제한)
      const k = t.dataset.pfile, f = t.files[0];
      if (!/^image\//.test(f.type) || f.size > 5e6) return;
      const rd = new FileReader();
      rd.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const s = Math.min(im.width, im.height); g.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 64, 64); set(k, c.toDataURL('image/png')); }; im.src = rd.result; };
      rd.readAsDataURL(f);
    }
    else if (t.dataset.wheat || t.dataset.wheatt || t.dataset.wfx || t.dataset.wheatspeed) {
      const W = AIO.ui.world(), hc = W.heatCfg();
      if (t.dataset.wheat) hc.on = t.checked;
      if (t.dataset.wheatt && ev.type === 'change') { hc.t[+t.dataset.wheatt] = Math.max(1, Math.min(99, +t.value || 1)); hc.t.sort((a, b) => a - b); }
      if (t.dataset.wfx) hc.fx[t.dataset.wfx] = t.checked;
      if (t.dataset.wheatspeed) { hc.speed = +t.value / 100; t.parentElement.querySelector('b').textContent = t.value + '%'; }
      W.opts.heat = hc; try { localStorage.setItem('aio.opts', JSON.stringify(W.opts)); } catch {}
    }
    else if (t.dataset.wscale) { const W = AIO.ui.world(); W.opts[t.dataset.wscale] = +t.value / 100; t.parentElement.querySelector('b').textContent = t.value + '%'; try { localStorage.setItem('aio.opts', JSON.stringify(W.opts)); } catch {} }
    else if (t.dataset.wo && ev.type === 'change') { const W = AIO.ui.world(); W.opts[t.dataset.wo] = t.checked; try { localStorage.setItem('aio.opts', JSON.stringify(W.opts)); } catch {} }
  }

  AIO.prefs = {
    get: () => P, apply, open, pull, isDark: dark,
    /** 맵 배경(하늘) 색: null 이면 기본 */
    sky: () => (SKIES[P.sky] && SKIES[P.sky][1]) || null,
  };
  apply();
  document.addEventListener('DOMContentLoaded', apply);
})();
