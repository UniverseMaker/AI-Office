# 번역 묶음(chunk*.json · chunk*.en.json) → public/js/i18n_en.js — 사용: python tools/i18n-merge.py <번역 폴더> <출력 i18n_en.js>  (지금 i18n_en.js 를 직접 고쳐도 된다)
import json, io, glob, re, sys, os
SRC_DIR, out = (sys.argv[1], sys.argv[2]) if len(sys.argv) > 2 else (os.path.dirname(os.path.abspath(__file__)), sys.argv[1])
d, bad = {}, []
for f in sorted(glob.glob(os.path.join(SRC_DIR, 'chunk*.en.json'))):
    src = json.load(io.open(f.replace('.en.json', '.json'), encoding='utf-8'))
    tr = json.load(io.open(f, encoding='utf-8'))
    miss = [s for s in src if s not in tr]
    if miss: bad.append((os.path.basename(f), 'missing', len(miss)))
    for k, v in tr.items():
        if k not in src or not isinstance(v, str) or not v.strip(): continue
        if sorted(re.findall(r'\{\d+\}', k)) != sorted(re.findall(r'\{\d+\}', v)): bad.append((k, 'placeholder', v)); continue
        if re.search('[가-힣]', v): bad.append((k, 'hangul', v)); continue
        d[k] = v
print('entries', len(d), 'problems', len(bad))
for b in bad[:30]: print('  ', b)

HEAD = r"""// 영어 번역 (자동 수집 · 번역 · 검사 — 빠진 문구 다시 찾기: node tools/i18n-missing.mjs · tools/i18n-literals.mjs · tools/i18n-mapstrings.mjs)
(function () {
  if (!AIO.i18n) return;
  const H = /[가-힣]/;
  // 층 이름: '12F 업무층' · 'B3 지하휴게실' · 'R 루프탑' → 층 번호는 그대로, 뒤만 번역
  AIO.i18n.addPattern(/^((?:\d+F|B\d+|R))\s+([^\s].*)$/, (m, a, b) => { const t = AIO.tr(b); return H.test(t) ? m : `${a} ${t}`; });
  // 업무층 설명의 '👔 팀장실 (돌려쓰기: 팀 이름들) · …' — 괄호 안의 · 에서 잘리지 않게 먼저 (팀 이름은 세션 제목이라 그대로)
  AIO.i18n.addPattern(/^(.*?)팀장실 \(돌려쓰기: ([^)]*)\)\s*(?:·\s*)?(.*)$/, (m, a, b, c) => `${a}${AIO.tr('팀장실')} (${AIO.tr('돌려쓰기')}: ${b.split(' · ').map((x) => AIO.tr(x)).join(' · ')})${c ? ' · ' + AIO.tr(c) : ''}`);
  // 이어 붙인 문구('대기 · 연구부교수·팀장 · Lv.12'): 표에 통째로 없으면 조각마다 번역
  AIO.i18n.addPattern(/^(.+?)(\s*·\s*|\s+—\s+|\s+→\s+|\s+\|\s+)(.+)$/, (m, a, sep, b) => { const x = AIO.tr(a), y = AIO.tr(b); return x === a && y === b ? m : x + sep + y; });
  // 이모지로 시작하는 문구('⌨️ 명령 실행 중' · '🧶 하네스 팀'): 이모지는 두고 뒤만
  AIO.i18n.addPattern(/^(\p{Extended_Pictographic}[️‍\p{Extended_Pictographic}]*\s*)(.*[가-힣].*)$/u, (m, a, b) => { const x = AIO.tr(b); return H.test(x) && x === b ? m : a + x; });
  // '… 앱' → '… app'
  AIO.i18n.addPattern(/^(.*\S) 앱$/, (m, a) => `${AIO.tr(a)} app`);
  // 숫자가 붙은 문구('세션 79' · '팀원 2' · '결정 대기 1건' · '출근 79명')
  AIO.i18n.addPattern(/^(.*[가-힣].*?)\s*(\d[\d,.]*)\s*(명|개|건|회|번)?$/, (m, a, n) => { const x = AIO.tr(a.trim()); return H.test(x) ? m : `${x} ${n}`; });
  // 캔버스(맵)에 바로 그리는 글자도 영어 모드에선 번역해서 그린다 — 간판 · 전광판 · 가구 글자 · 이름표 조각 (한 번 번역한 건 기억)
  const CP = typeof CanvasRenderingContext2D !== 'undefined' && CanvasRenderingContext2D.prototype;
  if (CP && !CP.__aioTr) {
    CP.__aioTr = true;
    const cache = new Map();
    const tx = (t) => { if (AIO.lang !== 'en' || typeof t !== 'string' || !H.test(t)) return t; let v = cache.get(t); if (v === undefined) { v = AIO.tr(t); if (cache.size > 8000) cache.clear(); cache.set(t, v); } return v; };
    for (const k of ['fillText', 'strokeText']) { const f = CP[k]; CP[k] = function (t, ...a) { return f.call(this, tx(t), ...a); }; }
    const mt = CP.measureText; CP.measureText = function (t) { return mt.call(this, tx(t)); };
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('aio:lang', () => cache.clear());
  }
"""
js = HEAD + "  AIO.i18n.add(" + json.dumps(d, ensure_ascii=False, indent=0).replace('\n', '\n  ') + ");\n})();\n"
io.open(out, 'w', encoding='utf-8').write(js)
print('wrote', len(js))
