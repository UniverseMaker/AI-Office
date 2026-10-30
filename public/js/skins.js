// 🎨 그래픽 테마 — 맵처럼 골라 갈아 끼운다: 테마(옷차림 · 소품 · 분위기) × 그림체(그리는 방식). 기본은 지금 그대로.
//   테마: 기본 · 회사원 · 마법사 · 할로윈 · 크리스마스 · 우주   그림체: 기본 · 도트 · 게임보이 · 일러스트 · 연필 스케치 · 시네마틱 · 네온
//   캐릭터 옷차림은 world.drawEntity 에서 dress() 로 갈아입히고, 하늘색 · 색감(캔버스 필터) · 떠다니는 효과(박쥐 · 눈 · 별 · 마법 빛)는 main.js 가 그린다.
//   소품 그림(호박 · 유령 · 트리 · 수정 · 물약)은 OpenGameArt 의 CC0 이미지 — assets/skins/CREDITS.md
(function () {
  const KEY = 'aio.skin';
  const tr = (...a) => (AIO.tr ? AIO.tr(...a) : a[0]);
  const IMG = {};
  const img = (n) => { if (typeof Image === 'undefined') return {}; if (!IMG[n]) { const im = new Image(); im.src = 'assets/skins/' + n + '.png'; IMG[n] = im; } return IMG[n]; };
  const pick = (arr, r) => arr[Math.floor(r() * arr.length)];

  // ---------------------------------------------------------------- 테마
  const THEMES = {
    default: { name: '기본', icon: '🧶', desc: '지금 그대로 — 털실 인형 사무실' },
    office: {
      name: '회사원', icon: '👔', desc: '정장 · 넥타이 · 단정한 머리, 차분한 오피스 색',
      grade: 'saturate(0.86) contrast(1.03)', skies: { day: ['#d6e2ee', '#f4f6f8'] },
      dress: (st, r) => ({ hat: st.hat === 'hardhat' ? 'hardhat' : 'neat', suit: pick(['#2b3a55', '#3a3f47', '#4a4f57', '#2f4f4f', '#5a4a3a'], r), tie: st.gender === 'F' ? null : pick(['#c0392b', '#2e5aa8', '#8e44ad', '#1f8a5b'], r), noScarf: true, accent: pick(['#2e5aa8', '#c0392b', '#7a5540'], r) }),
    },
    wizard: {
      name: '마법사', icon: '🧙', desc: '뾰족 모자 · 별 무늬 로브 · 떠다니는 마법 빛 · 수정과 물약',
      grade: 'hue-rotate(-12deg) saturate(1.12)', skies: { day: ['#b9b2ea', '#efeafc'], dawn: ['#8d86d6', '#f4d6e6'], dusk: ['#4b3a8f', '#e08fb0'], night: ['#1f1b4d', '#5b3f8f'] }, fx: 'sparkle', decor: ['crystal_violet', 'crystal_blue', 'potion_violet', 'potion_green'],
      dress: (st, r) => { const c = pick(['#5b3f8f', '#2e4a8f', '#1f6f6f', '#7a2f5a', '#3f3f7a'], r); return { hat: 'wizard', robe: c, robeStars: true, accent: '#f2c230', noScarf: true }; },
    },
    halloween: {
      name: '할로윈', icon: '🎃', desc: '마녀 · 호박 머리 · 뱀파이어 분장, 박쥐 · 유령 · 호박 장식',
      grade: 'sepia(0.16) saturate(1.18) hue-rotate(-8deg) brightness(0.93)', skies: { day: ['#e9caa2', '#f8ebd9'], dawn: ['#b98a9e', '#f6c99a'], dusk: ['#2a1838', '#b05a2a'], night: ['#1e1128', '#4a2240'] }, fx: 'bats', decor: ['pumpkin'], ghosts: true,
      dress: (st, r) => { const k = r(); return k < 0.4 ? { hat: 'witch', robe: '#3b2a4f', accent: '#f08a24', noScarf: true } : k < 0.7 ? { hat: 'pumpkin', accent: '#f08a24' } : { hat: 'vamp', robe: '#1d1d24', cape: '#b3202a', accent: '#b3202a', noScarf: true }; },
    },
    christmas: {
      name: '크리스마스', icon: '🎄', desc: '산타 · 요정 모자, 눈 내리는 사무실, 트리',
      grade: 'saturate(1.06) brightness(1.02)', skies: { day: ['#c9dcef', '#f6f9fd'], night: ['#0f1f3d', '#2a4a74'] }, fx: 'snow', decor: ['pine'],
      dress: (st, r) => (r() < 0.7 ? { hat: 'santa', accent: '#c0392b', accent2: '#ffffff' } : { hat: 'elf', accent: '#1f8a5b', accent2: '#c0392b' }),
    },
    space: {
      name: '우주', icon: '🚀', desc: '우주복 · 헬멧, 별이 흐르는 밤하늘',
      grade: 'saturate(1.08) brightness(0.96)', skies: { day: ['#6f88cc', '#cfdaf3'], dawn: ['#3b3f7a', '#d9a3b5'], dusk: ['#1d1f4a', '#9a5a8a'], night: ['#05060f', '#1c2347'] }, fx: 'stars',
      dress: () => ({ hat: 'helmet', robe: '#eef1f5', patch: true, noScarf: true }),
    },
  };
  // ---------------------------------------------------------------- 그림체 (캔버스 전체에 거는 효과)
  const STYLES = {
    default: { name: '기본', icon: '🧶', desc: '지금 그대로' },
    pixel: { name: '도트', icon: '👾', desc: '큰 픽셀로 그린 레트로 게임 느낌', pixel: 2, filter: 'contrast(1.08) saturate(1.2)' },
    gameboy: { name: '게임보이', icon: '🟩', desc: '초록 4색 도트', pixel: 2, filter: 'url(#aioGB)' },
    illust: { name: '일러스트', icon: '🖌️', desc: '수채 종이 질감 · 부드러운 빛 · 그림책 색감', filter: 'saturate(1.2) contrast(1.05) brightness(1.03)', overlay: 'paper' },
    cinema: { name: '시네마틱', icon: '🎬', desc: '영화 같은 색감 · 필름 결 · 비네트 (실사풍)', filter: 'contrast(1.12) saturate(0.9) sepia(0.12)', overlay: 'film' },
    sketch: { name: '연필 스케치', icon: '✏️', desc: '흑백 연필 그림 · 종이 결', filter: 'grayscale(1) contrast(1.4) brightness(1.08)', overlay: 'paper' },
    neon: { name: '네온', icon: '🌃', desc: '어두운 밤 · 형광빛 · 주사선', filter: 'brightness(0.72) saturate(1.9) hue-rotate(195deg) contrast(1.25)', overlay: 'scan' },
  };

  let S = { theme: 'default', style: 'default', set: 'default' };
  try { S = { ...S, ...(JSON.parse(localStorage.getItem(KEY) || '{}') || {}) }; } catch {}
  if (!THEMES[S.theme]) S.theme = 'default';
  if (!STYLES[S.style]) S.style = 'default';

  // ---------------------------------------------------------------- 그래픽 세트 (캐릭터를 아예 다른 그림으로) — 필터와 다르다
  //   도트: Ninja Adventure Asset Pack (pixel-boy, CC0) 의 16×16 캐릭터 89종 · 4방향 걷기 — assets/sets/pixel/
  const SETS = {
    default: { name: '털실 인형', icon: '🧶', desc: '지금 그대로 — 코드로 그린 털실 인형' },
    pixel: { name: '도트 캐릭터', icon: '👾', desc: '도트 캐릭터 89종(4방향 걷기) + 도트 바닥 · 벽 · 가구 · 건물 (CC0 에셋 · 나머지도 같은 도트 크기로)' },
  };
  const PX_ALL = ['Boy', 'CamouflageGreen', 'CamouflageRed', 'Cavegirl', 'Cavegirl2', 'Caveman', 'Caveman2', 'Eskimo', 'FighterRed', 'FighterWhite', 'GladiatorBlue', 'Hunter', 'Inspector', 'Knight', 'KnightGold', 'LionBoy', 'ManGreen', 'MaskFrog', 'MaskGoldRacoon', 'MaskRacoon', 'Master', 'Monk', 'Monk2', 'NinjaBlue', 'NinjaBlue2', 'NinjaBomb', 'NinjaDark', 'NinjaEskimo', 'NinjaFire', 'NinjaGray', 'NinjaGreen', 'NinjaLeaf', 'NinjaMageBlack', 'NinjaMageOrange', 'NinjaMasked', 'NinjaRed', 'NinjaRed2', 'NinjaThunder', 'NinjaWater', 'NinjaYellow', 'Noble', 'OldMan', 'OldMan2', 'OldMan3', 'Princess', 'RedGladiator', 'RedNinja3', 'Samurai', 'SamuraiBlue', 'SamuraiRed', 'Shaman', 'SorcererBlack', 'SorcererOrange', 'Sultan', 'Sultan2', 'Village6', 'Villager', 'Villager2', 'Villager3', 'Villager4', 'Villager5', 'Villager6', 'Woman'];
  const PX_POOL = {
    default: PX_ALL,
    office: ['Noble', 'Inspector', 'Villager', 'Villager2', 'Villager3', 'Villager4', 'Villager5', 'Villager6', 'Village6', 'Woman', 'Boy', 'OldMan', 'OldMan2', 'OldMan3', 'ManGreen', 'Hunter', 'Princess', 'Sultan'],
    wizard: ['SorcererBlack', 'SorcererOrange', 'NinjaMageBlack', 'NinjaMageOrange', 'Shaman', 'ShamanLion', 'Master', 'Monk', 'Monk2', 'OldMan2', 'Spirit'],
    halloween: ['Skeleton', 'SkeletonDemon', 'Vampire', 'DemonGreen', 'DemonRed', 'Spirit', 'MaskFrog', 'MaskRacoon', 'MaskGoldRacoon', 'Tengu', 'Tengu2', 'NinjaDark'],
    christmas: ['Eskimo', 'NinjaEskimo', 'Villager', 'Villager3', 'Woman', 'Boy', 'OldMan3', 'Princess', 'Noble'],
    space: ['RobotGreen', 'RobotGrey', 'RobotCamouflage', 'GoldStatue', 'KnightGold', 'Knight'],
  };
  const pxImg = (n) => { if (typeof Image === 'undefined') return {}; const k = 'px:' + n; if (!IMG[k]) { const im = new Image(); im.src = 'assets/sets/pixel/chars/' + n + '.png'; IMG[k] = im; } return IMG[k]; };
  // 엔티티 → 캐릭터 이름 (테마마다 다른 무리에서, 세션 id 로 늘 같은 캐릭터)
  const pxOf = (e) => { const pool = PX_POOL[S.theme] || PX_ALL; return pool[AIO.hash(String(e.id || e.seed || '')) % pool.length]; };
  // 방향: 맵의 +y(왼쪽 아래) 앞 · -y(오른쪽 위) 뒤 · -x(왼쪽 위) 왼 · +x(오른쪽 아래) 오른 → 시트 열 0 앞 · 1 뒤 · 2 왼 · 3 오른
  const COL = { '+y': 0, '-y': 1, '-x': 2, '+x': 3 };
  /** 도트 세트면 캐릭터를 그리고 true — 아니면 false (털실 인형을 그대로 그린다) */
  function sprite(ctx, e, sx, sy, t, alpha) {
    if (S.set !== 'pixel' || e.kind === 'pet') return false;
    const im = pxImg(pxOf(e));
    if (!im.complete || !im.naturalWidth) return false;     // 아직 못 불러왔으면 잠깐 인형으로
    const SC = 2.6 * (e.scale || 1);
    const walk = e.pose === 'walk' || !!e.moving;
    const sitting = e.pose === 'sit' || e.pose === 'sofa';
    let row = walk ? Math.floor(t * 8 + (e.seed || 0)) % 4 : 0;
    if (!walk && e.anim === 'type') row = Math.floor(t * 4 + (e.seed || 0)) % 2 ? 0 : 2;   // 타이핑: 살짝 들썩
    const col = COL[e.dir] ?? 0;
    const bob = e.anim === 'cheer' ? Math.abs(Math.sin(t * 7)) * 6 : e.anim === 'wave' ? Math.abs(Math.sin(t * 5)) * 2 : 0;
    const lift = sitting ? (e.pose === 'sofa' ? 8 : 10) : 0;
    ctx.save();
    ctx.globalAlpha *= alpha ?? e.alpha ?? 1;
    ctx.fillStyle = 'rgba(40,30,20,0.22)'; ctx.beginPath(); ctx.ellipse(sx, sy, 6.5 * SC * 0.55, 2.2 * SC * 0.55, 0, 0, 7); ctx.fill();
    ctx.imageSmoothingEnabled = false;
    if (e.anim === 'sleep') { ctx.translate(sx, sy - lift - 4); ctx.rotate(-0.35); ctx.drawImage(im, col * 16, 0, 16, 16, -8 * SC, -16 * SC + 4, 16 * SC, 16 * SC); }
    else ctx.drawImage(im, col * 16, row * 16, 16, 16, Math.round((sx - 8 * SC) / 2.6) * 2.6, Math.round((sy - 16 * SC + 3 - lift - bob) / 2.6) * 2.6, 16 * SC, 16 * SC);   // 도트 격자(2.6)에 맞춰 바닥 · 가구 도트와 줄을 맞춘다
    ctx.restore();
    if (e.anim === 'sleep') { ctx.save(); ctx.fillStyle = '#6b7c93'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('z', sx + 10 + Math.sin(t * 2) * 2, sy - 34 - (t * 6 % 10)); ctx.restore(); }
    return true;
  }
  for (const n of new Set(Object.values(PX_POOL).flat())) pxImg(n);   // 미리 불러 두기 (89장 · 약 480KB)
  if (!SETS[S.set]) S.set = 'default';
  if (S.set !== 'pixel') { /* 털실 인형은 그대로 */ }
  const theme = () => THEMES[S.theme], style = () => STYLES[S.style];

  // ---------------------------------------------------------------- 캐릭터 옷차림 (엔티티마다 한 번 만들어 둔다)
  const dressed = new WeakMap();
  function dress(e, st) {
    const T = theme();
    if (!T.dress || !st) return st;
    let m = dressed.get(st);
    if (m && m.k === S.theme) return m.v;
    const r = AIO.rand(AIO.hash(String(e.id || e.seed || '')) + 7);
    const v = { ...st, ...T.dress(st, r), _skin: S.theme };
    if (v.hat === 'neat' || v.hat === 'helmet' || v.hat === 'pumpkin') v.glasses = st.glasses && v.hat === 'neat';
    dressed.set(st, { k: S.theme, v });
    return v;
  }

  // ---------------------------------------------------------------- 맵 소품 (테마 이미지 · 바깥 부지에 흩어 놓기)
  if (AIO.props) AIO.props.skinDecor = {
    dynamic: true,
    depth: (f) => f.x + f.y,
    draw(ctx, f, t) {
      const im = img(f.img); if (!im.complete || !im.naturalWidth) return;
      const [sx, sy] = AIO.iso.P(f.x, f.y, 0);
      const sc = f.scale || 0.6, w = im.naturalWidth * sc, h = im.naturalHeight * sc;
      const bob = f.float ? Math.sin(t * 1.6 + f.x) * 3 : 0;
      ctx.save();
      ctx.globalAlpha *= 0.22; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(sx, sy, w * 0.32, w * 0.12, 0, 0, 7); ctx.fill(); ctx.restore();
      ctx.drawImage(im, sx - w / 2, sy - h + 2 + bob, w, h);
      if (f.img === 'pumpkin' && Math.sin(t * 3 + f.x * 2) > -0.2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(sx, sy - h * 0.45, 1, sx, sy - h * 0.45, w * 0.7); g.addColorStop(0, 'rgba(255,170,60,0.35)'); g.addColorStop(1, 'rgba(255,170,60,0)'); ctx.fillStyle = g; ctx.fillRect(sx - w, sy - h * 1.2, w * 2, h * 1.6); ctx.restore(); }
    },
  };
  function decorate(Sc) {
    const T = theme();
    if (!T.decor || !Sc || !Sc.levels || !Sc.levels[0]) return;
    const OUT = Sc.levels[0], LY = AIO.layout;
    const r = AIO.rand(1234 + S.theme.length * 97);
    const spots = [];
    const near = Sc.door ? [Sc.door.x, Sc.door.y] : [OUT.W / 2, OUT.H / 2];
    // 출입구 양옆 · 그 밖은 부지 곳곳 (걸어 다닐 수 있는 칸 근처, 겹치지 않게)
    const tryAt = (x, y) => { if (!LY || !LY.nearestWalkable) return; const [tx, ty] = LY.nearestWalkable(OUT, Math.round(x), Math.round(y)); if (spots.some(([a, b]) => Math.abs(a - tx) + Math.abs(b - ty) < 3)) return; spots.push([tx, ty]); };
    for (const [dx, dy] of [[-3, 1], [3, 1], [-5, 3], [5, 3]]) tryAt(near[0] + dx, near[1] + dy);
    for (let i = 0; i < 40 && spots.length < 16; i++) tryAt(2 + r() * (OUT.W - 4), 2 + r() * (OUT.H - 4));
    spots.forEach(([x, y], i) => OUT.furniture.push({ type: 'skinDecor', img: T.decor[i % T.decor.length], x: x + 0.5, y: y + 0.5, lv: OUT.idx, scale: T.decor[0] === 'pine' ? 0.75 : 0.62 }));
  }

  // ---------------------------------------------------------------- 화면 효과 (하늘 · 색감 · 떠다니는 것 · 종이결/필름/주사선)
  function ensureFx() {
    if (!document.getElementById('aioGBdefs')) {   // 게임보이 4색: 밝기 → 초록 4단계
      const d = document.createElement('div'); d.id = 'aioGBdefs'; d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      d.innerHTML = '<svg width="0" height="0"><filter id="aioGB" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0"/><feComponentTransfer><feFuncR type="discrete" tableValues="0.06 0.19 0.55 0.61"/><feFuncG type="discrete" tableValues="0.22 0.38 0.67 0.74"/><feFuncB type="discrete" tableValues="0.06 0.19 0.06 0.06"/></feComponentTransfer></filter></svg>';
      document.body.appendChild(d);
    }
    let ov = document.getElementById('skinOverlay');
    if (!ov) { ov = document.createElement('div'); ov.id = 'skinOverlay'; const cv = document.getElementById('office'); cv.parentNode.insertBefore(ov, cv.nextSibling); }
    return ov;
  }
  let noise = null;
  function noiseURL() {
    if (noise) return noise;
    const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'); const d = g.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 90; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 44; }
    g.putImageData(d, 0, 0); noise = c.toDataURL(); return noise;
  }
  function applyScreen() {
    const cv = document.getElementById('office'); if (!cv) return;
    const ov = ensureFx(), st = style(), T = theme();
    cv.style.filter = [T.grade, st.filter].filter(Boolean).join(' ') || '';
    cv.style.imageRendering = st.pixel ? 'pixelated' : '';
    ov.className = 'skin-ov ' + (st.overlay || '');
    ov.style.backgroundImage = st.overlay === 'paper' || st.overlay === 'film' ? `url(${noiseURL()})${st.overlay === 'film' ? ', radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)' : ', radial-gradient(ellipse at 30% 20%, rgba(255,240,210,0.25), rgba(255,240,210,0) 60%)'}` : '';
    document.body.dataset.skinTheme = S.theme; document.body.dataset.skinStyle = S.style;
  }

  // 떠다니는 것 (화면 좌표)
  const P = [];
  function particles(kind, vw, vh) {
    if (P.kind === kind && P.vw === vw && P.vh === vh) return P;
    P.length = 0; P.kind = kind; P.vw = vw; P.vh = vh;
    const n = kind === 'snow' ? 90 : kind === 'stars' ? 120 : kind === 'sparkle' ? 46 : kind === 'bats' ? 9 : 0;
    for (let i = 0; i < n; i++) P.push({ x: Math.random() * vw, y: Math.random() * vh, s: 0.5 + Math.random(), p: Math.random() * 6.28, v: 0.4 + Math.random() });
    return P;
  }
  let lastT = 0, shoot = null;
  function drawFx(ctx, dpr, vw, vh, t) {
    const T = theme();
    const dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
    if (!T.fx && !T.ghosts) return;
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ps = particles(T.fx, vw, vh);
    if (T.fx === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (const p of ps) { p.y += dt * 28 * p.v; p.x += Math.sin(t * 0.8 + p.p) * dt * 12; if (p.y > vh + 4) { p.y = -4; p.x = Math.random() * vw; } ctx.globalAlpha = 0.55 + p.s * 0.35; ctx.beginPath(); ctx.arc(p.x, p.y, 1.2 + p.s * 1.6, 0, 7); ctx.fill(); }
    } else if (T.fx === 'stars') {
      for (const p of ps) { const a = 0.35 + 0.65 * Math.abs(Math.sin(t * p.v * 1.4 + p.p)); ctx.globalAlpha = a; ctx.fillStyle = p.s > 1.2 ? '#cfe3ff' : '#ffffff'; ctx.fillRect(p.x, p.y * 0.6, 1 + p.s, 1 + p.s); }
      if (!shoot && Math.random() < dt * 0.25) shoot = { x: Math.random() * vw * 0.7, y: Math.random() * vh * 0.25, k: 0 };
      if (shoot) { shoot.k += dt * 1.6; const x = shoot.x + shoot.k * 260, y = shoot.y + shoot.k * 90; ctx.globalAlpha = Math.max(0, 1 - shoot.k); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 60, y - 21); ctx.stroke(); if (shoot.k > 1) shoot = null; }
    } else if (T.fx === 'sparkle') {
      ctx.globalCompositeOperation = 'lighter';
      for (const p of ps) { p.y -= dt * 14 * p.v; if (p.y < -6) { p.y = vh + 6; p.x = Math.random() * vw; } const a = 0.25 + 0.6 * Math.abs(Math.sin(t * 2 * p.v + p.p)); const c = p.s > 1.1 ? '255,214,120' : '190,150,255'; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 4 + p.s * 4); g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = g; ctx.fillRect(p.x - 10, p.y - 10, 20, 20); }
    } else if (T.fx === 'bats') {
      ctx.fillStyle = 'rgba(25,15,30,0.85)';
      for (const p of ps) {
        p.x += dt * 50 * p.v; p.y += Math.sin(t * 1.3 + p.p) * dt * 18; if (p.x > vw + 30) { p.x = -30; p.y = Math.random() * vh * 0.55; }
        const f = Math.sin(t * 14 + p.p) * 0.8, s = 6 + p.s * 5;
        ctx.save(); ctx.translate(p.x, p.y); ctx.beginPath(); ctx.ellipse(0, 0, s * 0.28, s * 0.36, 0, 0, 7);
        for (const sd of [-1, 1]) { ctx.moveTo(0, 0); ctx.quadraticCurveTo(sd * s * 0.6, -s * (0.6 + f * 0.5), sd * s * 1.3, -s * f * 0.3); ctx.quadraticCurveTo(sd * s * 0.9, s * 0.1, sd * s * 0.7, s * 0.25); ctx.quadraticCurveTo(sd * s * 0.4, s * 0.05, 0, s * 0.2); }
        ctx.fill(); ctx.restore();
      }
    }
    if (T.ghosts) {         // 유령 (CC0 그림 3프레임) 두어 마리가 천천히 떠다닌다
      const im = img('ghost');
      if (im.complete && im.naturalWidth) {
        const fw = im.naturalWidth / 3, fh = im.naturalHeight;
        for (let i = 0; i < 2; i++) {
          const k = (t * 0.03 + i * 0.5) % 1, x = vw * (1.1 - k * 1.2), y = vh * (0.25 + i * 0.3) + Math.sin(t * 1.2 + i) * 14, fr = Math.floor(t * 6 + i) % 3;
          ctx.globalAlpha = 0.75; ctx.drawImage(im, fr * fw, 0, fw, fh, x, y, fw * 0.8, fh * 0.8);
        }
      }
    }
    ctx.restore();
  }

  function set(kind, id) {
    if (kind === 'theme' && THEMES[id]) S.theme = id;
    if (kind === 'style' && STYLES[id]) S.style = id;
    if (kind === 'set' && SETS[id]) S.set = id;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
    applyScreen();
    window.dispatchEvent(new CustomEvent('aio:skin', { detail: { ...S } }));
    window.dispatchEvent(new Event('resize'));          // 도트 그림체는 캔버스 해상도가 바뀐다
  }
  // 맵 선택 창 › 🎨 그래픽 탭
  function render(el) {
    if (!el) return;
    const card = (kind, id, d, on) => `<button class="map-card skin-card ${on ? 'on' : ''}" data-skin="${kind}|${id}" title="${AIO.esc(tr(d.desc))}"><span class="mi">${d.icon}</span><span class="mt"><b>${AIO.esc(tr(d.name))}</b><small>${AIO.esc(tr(d.desc))}</small></span></button>`;
    const W = AIO.ui && AIO.ui.world ? AIO.ui.world() : null, sky = (W && W.opts.sky) || 'auto';
    el.innerHTML = `<div class="map-hint">${tr('그래픽 세트(캐릭터 그림 자체) · 테마(옷차림 · 소품 · 분위기) · 필터(화면 효과)를 따로 골라 조합해요 · 이 브라우저에 저장')}</div>`
      + `<div class="pop-sec">🧍 ${tr('그래픽 세트')}</div><div class="map-grid skin-sets">${Object.entries(SETS).map(([id, d]) => card('set', id, d, S.set === id)).join('')}</div>`
      + `<div class="pop-sec">🌗 ${tr('밤낮')}</div><div class="vf-seg skin-sky">${[['auto', '🕒 실제 시간'], ['dawn', '🌅 아침'], ['day', '☀️ 낮'], ['dusk', '🌇 노을'], ['night', '🌙 밤']].map(([k, l]) => `<button class="${sky === k ? 'on' : ''}" data-sky="${k}">${tr(l)}</button>`).join('')}</div>`
      + `<div class="map-cols"><div><div class="pop-sec">🎭 ${tr('테마')}</div><div class="map-grid">${Object.entries(THEMES).map(([id, d]) => card('theme', id, d, S.theme === id)).join('')}</div></div>`
      + `<div><div class="pop-sec">🪄 ${tr('필터')}</div><div class="map-grid">${Object.entries(STYLES).map(([id, d]) => card('style', id, d, S.style === id)).join('')}</div></div></div>`
      + `<p class="muted skin-credit">${tr('소품 그림: OpenGameArt CC0 — 호박(Code Inferno Games) · 유령(ChiliGames) · 트리(jcrown41) · 수정 · 물약(Melissa Krautheim)')}</p>`;
    if (!el.dataset.bound) { el.dataset.bound = '1'; el.addEventListener('click', (ev) => {
      const sk = ev.target.closest('[data-sky]');
      if (sk) { const W2 = AIO.ui.world(); W2.opts.sky = sk.dataset.sky; try { localStorage.setItem('aio.opts', JSON.stringify(W2.opts)); } catch {} W2.caches.clear(); W2.sprites.clear(); W2.chunks.clear(); W2.px = 0; render(el); return; }
      const b = ev.target.closest('[data-skin]'); if (!b) return; const [k, id] = b.dataset.skin.split('|'); set(k, id); render(el); }); }
  }

  AIO.skins = {
    THEMES, STYLES, SETS, get: () => ({ ...S }), set, render, dress, decorate, drawFx, applyScreen, sprite,
    sky: (phase) => (theme().skies && theme().skies[phase || 'day']) || null,   // 테마가 시간대마다 정해 둔 하늘 (없으면 기본 하늘)
    pixel: () => style().pixel || 0,
    active: () => S.theme !== 'default' || S.style !== 'default' || S.set !== 'default',
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyScreen); else applyScreen();
  // 미리 불러 두기
  for (const T of Object.values(THEMES)) for (const n of T.decor || []) img(n);
  img('ghost');
})();
