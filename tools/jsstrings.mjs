// 아주 작은 JS 렉서: 문자열 · 템플릿(중첩 ${} 포함)의 고정 글자만 뽑는다. 주석 · 정규식 리터럴은 건너뛴다.
//   정규식 한 줄로 따옴표를 짝지으면 템플릿 안의 font-family:'${f}' 같은 곳에서 짝이 어긋나 문구를 놓친다 — 그래서 직접 훑는다.
export function jsStrings(src) {
  const out = [];
  let i = 0, prev = '';                 // prev: 마지막 의미 있는 글자 (정규식 / 나눗셈 구분용)
  const n = src.length;
  const regexOk = () => !prev || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev) || /\b(return|typeof|case|in|of|delete|void|throw|new|else|do)$/.test(src.slice(Math.max(0, i - 8), i).trimEnd());
  function readQuoted(q) {               // i 는 여는 따옴표 다음
    let s = '';
    while (i < n && src[i] !== q) {
      if (src[i] === '\\') { const c = src[i + 1]; s += c === 'n' ? '\n' : c === 't' ? '\t' : c; i += 2; continue; }
      if (src[i] === '\n') break;
      s += src[i++];
    }
    i++;
    return s;
  }
  function readTemplate() {              // i 는 여는 ` 다음 → 고정 조각들을 out 에, ${…} 안은 다시 코드로
    let s = '';
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') { s += src[i + 1]; i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') { if (s) out.push(s); s = ''; i += 2; readCode('}'); continue; }
      s += src[i++];
    }
    if (s) out.push(s);
    i++;
  }
  function readCode(end) {
    let depth = 0;
    while (i < n) {
      const c = src[i];
      if (end && c === '}' && depth === 0) { i++; prev = '}'; return; }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2); i = i < 0 ? n : i + 2; continue; }
      if (c === '"' || c === "'") { i++; out.push(readQuoted(c)); prev = 'a'; continue; }
      if (c === '`') { i++; readTemplate(); prev = 'a'; continue; }
      if (c === '/' && regexOk()) {        // 정규식 리터럴 건너뛰기
        i++; let cls = false;
        while (i < n) { const d = src[i]; if (d === '\\') { i += 2; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break; else if (d === '\n') break; i++; }
        i++; while (/[a-z]/.test(src[i] || '')) i++;
        prev = 'a'; continue;
      }
      if (c === '{') depth++;
      if (c === '}') depth--;
      if (!/\s/.test(c)) prev = c;
      i++;
    }
  }
  readCode(null);
  return out;
}
