/* AI OFFICE v6 — 🧱 그리는 순서(깊이) 정하기
 *
 * 예전에는 물건마다 숫자 하나(x + y)로 줄을 세웠다. 길쭉한 책상 · 소파 · 벽 옆을 지나는 캐릭터처럼
 * 크기가 다른 물건끼리는 이 숫자 하나로 앞뒤를 가릴 수 없어서 「캐릭터가 가구 뒤로 숨는」 일이 생겼다.
 *
 * 이제는 물건마다 바닥에 차지하는 상자(x0..x1, y0..y1)와 화면에 그려지는 네모를 알아내고,
 *   1) 화면에서 서로 겹치는 두 물건만 비교해서
 *   2) 한쪽이 다른 쪽보다 완전히 뒤(x 나 y 축으로 갈라짐)면 「뒤 → 앞」 순서를 정하고
 *   3) 바닥 상자가 겹치면(의자에 앉은 사람 · 책상 위 소품) 납작한 것 먼저, 그다음은 예전 숫자로
 * 이 순서들을 모두 지키는 줄(위상 정렬)을 만든다. 순서가 정해지지 않는 사이는 예전 숫자(k) 순서를 따른다.
 *
 * 바닥 상자는 물건을 작은 캔버스에 한 번 그려 보고 실제 그림의 아래쪽 윤곽(앞 모서리 · 왼쪽 · 오른쪽 끝)에서 계산한다
 * — 그림마다 기준점(가운데 · 모서리)이 제각각이라도 실제 모양을 따른다. 한 번 재면 가구마다 기억해 둔다.
 * 벽에 걸린 물건 · 책상 위 소품처럼 바닥에 닿지 않는 것은 상자 없이 예전 숫자로만 줄을 선다.
 */
(function () {
  'use strict';
  const AIO = (window.AIO = window.AIO || {});
  const SC = 0.5;                                   // 재는 캔버스 배율 (반 크기로 그려도 2px 오차)
  const BUDGET_MS = 6;                              // 한 프레임에 재는 데 쓰는 시간
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const boxes = new WeakMap();                      // 가구 → { b: {x0,y0,x1,y1,flat}, r: [l,t,r,b] } | { none, r }
  let cv = null, cx = null;
  let spent = 0, frameAt = 0;
  let pending = 0;

  function canvas() {
    if (!cv) { cv = document.createElement('canvas'); cx = cv.getContext('2d', { willReadFrequently: true }); }
    return cx;
  }

  /** 물건 하나를 그려 보고 바닥 상자 · 화면 네모를 잰다 (draw 는 레벨 좌표로 그리는 함수) */
  function measure(f, draw) {
    const ctx = canvas();
    if (!ctx || !ctx.getImageData) return null;
    const P = AIO.iso.P;
    const fx = +f.x || 0, fy = +f.y || 0, w = Math.max(1, +f.w || +f.r * 2 || 1), d = Math.max(1, +f.d || 1);
    const [ax, ay] = P(fx, fy);
    for (let grow = 1; grow <= 3; grow++) {
      const l = ax - (d + 3 * grow) * 32 - 64 * grow, r = ax + (w + 3 * grow) * 32 + 64 * grow;
      const t = ay - 240 * grow, b = ay + (w + d + 3 * grow) * 16 + 48 * grow;
      const W = Math.ceil((r - l) * SC), H = Math.ceil((b - t) * SC);
      if (W * H > 4e6) return null;
      cv.width = W; cv.height = H;
      ctx.setTransform(SC, 0, 0, SC, -l * SC, -t * SC);
      try { draw(ctx); } catch { return null; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const px = ctx.getImageData(0, 0, W, H).data;
      if (!px || px.length < W * H * 4) return null;               // 캔버스가 없는 환경(맵 점검 도구)
      let minX = W, maxX = -1, minY = H, maxY = -1;
      const low = new Int32Array(W).fill(-1);       // 칸마다 가장 아래 점
      for (let y = 0; y < H; y++) {
        const row = y * W * 4;
        for (let x = 0; x < W; x++) {
          if (px[row + x * 4 + 3] < 48) continue;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          low[x] = y;
        }
      }
      if (maxX < 0) return { none: true, r: null };                         // 아무것도 안 그림
      const edge = minX <= 0 || minY <= 0 || maxX >= W - 1 || maxY >= H - 1;
      if (edge && grow < 3) continue;                                        // 캔버스가 좁았다 → 넓혀서 다시
      // 화면 네모 (레벨 좌표)
      const toX = (x) => x / SC + l, toY = (y) => y / SC + t;
      const rect = [toX(minX), toY(minY), toX(maxX + 1), toY(maxY + 1)];
      // 바닥에 닿지 않음(벽걸이 · 책상 위 · 천장) → 상자 없음
      if (toY(maxY + 1) < ay - 8) return { none: true, r: rect };
      // 앞 모서리: 가장 아래 점들의 가운데
      let sx = 0, n = 0;
      for (let x = minX; x <= maxX; x++) if (low[x] >= maxY - 1) { sx += x; n++; }
      const A = toY(maxY + 1) / 16, D = toX(sx / n + 0.5) / 32, B = rect[0] / 32, C = rect[2] / 32;
      let x1 = (A + D) / 2, y1 = (A - D) / 2, x0 = B + y1, y0 = x1 - C;
      if (x0 > x1 - 0.05) x0 = x1 - 0.05;
      if (y0 > y1 - 0.05) y0 = y1 - 0.05;
      const flat = toY(maxY + 1) - toY(minY) < (x1 + y1 - x0 - y0) * 16 + 7;   // 키가 거의 없다 → 깔개 · 바닥 표시
      return { b: { x0, y0, x1, y1, flat }, r: rect };
    }
    return null;
  }

  /** 가구 상자 (아직 안 쟀으면 시간이 남을 때 잰다 — 못 재면 상자 없이 예전 순서) */
  function furnBox(f, draw) {
    let m = boxes.get(f);
    if (m) return m;
    const tn = now();
    if (tn - frameAt > 30) { frameAt = tn; spent = 0; }
    if (spent > BUDGET_MS) { pending++; return null; }
    const t0 = now();
    m = measure(f, draw) || { none: true, r: null };
    spent += now() - t0;
    boxes.set(f, m);
    return m;
  }

  /** 캐릭터 상자: 발 둘레 반 칸 · 화면은 몸 높이만큼 */
  function entBox(x, y, sx, sy, s = 1) {
    return { b: { x0: x - 0.22, y0: y - 0.22, x1: x + 0.22, y1: y + 0.22, flat: false }, r: [sx - 26 * s, sy - 90 * s, sx + 26 * s, sy + 8] };
  }

  const EPS = 0.02;
  /** a 를 b 보다 먼저 그려야 하면 -1, 나중이면 1, 모르면 0 */
  function cmp(a, b) {
    const A = a.b, B = b.b;
    const aBehind = A.x1 <= B.x0 + EPS || A.y1 <= B.y0 + EPS;
    const bBehind = B.x1 <= A.x0 + EPS || B.y1 <= A.y0 + EPS;
    if (aBehind && !bBehind) return -1;
    if (bBehind && !aBehind) return 1;
    if (aBehind && bBehind) return 0;                    // 옆으로 나란히 — 화면에서 안 겹친다
    if (A.flat !== B.flat) return A.flat ? -1 : 1;       // 바닥 상자가 겹치면: 깔개가 먼저
    return 0;
  }

  /** 그리는 순서 정하기. items: [{ k, ... }], boxOf(it) → { b, r } | null. 결과는 items 를 제자리에서 다시 줄 세운다 */
  function order(items, boxOf) {
    const n = items.length;
    if (n < 2) return items;
    const bx = new Array(n);
    for (let i = 0; i < n; i++) bx[i] = boxOf(items[i]);
    // 화면 칸(128px)마다 물건을 나눠 담아, 겹칠 수 있는 짝만 비교
    const CELL = 128, grid = new Map();
    for (let i = 0; i < n; i++) {
      const m = bx[i]; if (!m || !m.b || !m.r) continue;
      const r = m.r;
      for (let gx = Math.floor(r[0] / CELL); gx <= Math.floor(r[2] / CELL); gx++) for (let gy = Math.floor(r[1] / CELL); gy <= Math.floor(r[3] / CELL); gy++) {
        const key = gx * 65536 + gy; let c = grid.get(key); if (!c) grid.set(key, (c = [])); c.push(i);
      }
    }
    const out = Array.from({ length: n }, () => []), indeg = new Int32Array(n);
    const seen = new Set();
    for (const c of grid.values()) {
      for (let p = 0; p < c.length; p++) for (let q = p + 1; q < c.length; q++) {
        const i = c[p], j = c[q];
        const key = i < j ? i * n + j : j * n + i;
        if (seen.has(key)) continue; seen.add(key);
        const ri = bx[i].r, rj = bx[j].r;
        if (ri[2] <= rj[0] || rj[2] <= ri[0] || ri[3] <= rj[1] || rj[3] <= ri[1]) continue;   // 화면에서 안 겹침
        const s = cmp(bx[i], bx[j]);
        if (s < 0) { out[i].push(j); indeg[j]++; } else if (s > 0) { out[j].push(i); indeg[i]++; }
      }
    }
    // 위상 정렬 — 지금 그릴 수 있는 것 중 예전 숫자(k)가 가장 작은 것부터 (작은 힙)
    const heap = [];
    const less = (a, b) => items[a].k < items[b].k || (items[a].k === items[b].k && a < b);
    const push = (i) => { heap.push(i); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (!less(heap[c], heap[p])) break; [heap[c], heap[p]] = [heap[p], heap[c]]; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && less(heap[l], heap[m])) m = l; if (r < heap.length && less(heap[r], heap[m])) m = r; if (m === c) break; [heap[c], heap[m]] = [heap[m], heap[c]]; c = m; } } return top; };
    for (let i = 0; i < n; i++) if (!indeg[i]) push(i);
    const done = new Uint8Array(n), res = [];
    let cycles = 0;
    while (res.length < n) {
      let i;
      if (heap.length) i = pop();
      else {                                            // 순환(서로가 서로의 뒤) → 남은 것 중 예전 숫자가 가장 작은 것부터 풀어 준다
        cycles++; i = -1;
        for (let j = 0; j < n; j++) if (!done[j] && (i < 0 || less(j, i))) i = j;
      }
      if (done[i]) continue;
      done[i] = 1; res.push(items[i]);
      for (const j of out[i]) if (!done[j] && --indeg[j] === 0) push(j);
    }
    order.cycles = cycles;
    for (let i = 0; i < n; i++) items[i] = res[i];
    return items;
  }

  AIO.depth = { measure, furnBox, entBox, cmp, order, boxes, get pending() { const p = pending; pending = 0; return p; } };
})();
