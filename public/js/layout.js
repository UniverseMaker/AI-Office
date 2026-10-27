// Floor-plan toolkit shared by every theme: levels, seat/desk/pod/lounge makers, room walls, shelf packing, A* with walls.
// A "scene" has one or more levels (floors). Every seat / spot carries `lv` (its level index).
(function () {
  const { P } = AIO.iso;

  function newScene(theme) {
    return { theme, levels: [], seats: new Map(), deskBySeat: new Map(), lounge: [], hot: [], reportSpots: new Map(), queue: [], meeting: [], door: null };
  }

  function newLevel(S, name, opts = {}) {
    const L = {
      idx: S.levels.length, name, W: 0, H: 0, dy: 0,
      furniture: [], rugs: [], patches: [], signs: [], lamps: [], windows: [],
      blocked: new Set(), edges: new Set(), floor: opts.floor || 'wood', outer: opts.outer || 'office', label: opts.label || name,
      wallY: null, doorY0: null, elevator: null, deco: [],
    };
    S.levels.push(L);
    return L;
  }

  /** Makers bound to one level. Every block maker returns {w, d, place(ox, oy)}. */
  function kit(S, L) {
    const lv = L.idx;
    const block = (x, y) => L.blocked.add(x + ',' + y);
    const blockRect = (x, y, w, d) => { for (let i = Math.floor(x); i < Math.ceil(x + w); i++) for (let j = Math.floor(y); j < Math.ceil(y + d); j++) block(i, j); };
    const add = (f) => { f.lv = lv; L.furniture.push(f); return f; };

    function deskSeat(ox, oy, col, row, key, opts = {}) {
      // row 'F': occupant faces +y (face visible), chair north of desk. row 'B': faces -y (screen visible)
      const dx = ox + col * 2;
      const desk = add({ type: 'desk', x: dx, y: row === 'F' ? oy + 2 : oy + 3, w: 2, d: 1, face: row === 'F' ? '+y' : '-y', seed: (dx * 7 + oy * 13 + lv * 31 + (row === 'F' ? 1 : 2)) | 0, lead: !!opts.lead, premium: !!opts.premium });
      const seat = { key, lv, x: dx + 1, y: row === 'F' ? oy + 1.45 : oy + 4.55, face: desk.face, pose: 'sit', desk };
      desk.seatKey = key;
      add({ type: 'chair', x: seat.x, y: seat.y, face: seat.face, part: 'seat', premium: !!opts.premium });
      add({ type: 'chair', x: seat.x, y: seat.y, face: seat.face, part: 'back', premium: !!opts.premium });
      blockRect(desk.x, desk.y, 2, 1);
      if (key) { S.seats.set(key, seat); S.deskBySeat.set(key, desk); }
      return seat;
    }

    function decorCorner(x, y, seed, lampOk = true) {
      const r = AIO.rand(seed);
      if (r() < 0.55 || !lampOk) add({ type: 'plant', x: x + 0.5, y: y + 0.55, size: 0.75 + r() * 0.3, seed });
      else { add({ type: 'lamp', x: x + 0.5, y: y + 0.5 }); L.lamps.push({ x: x + 0.5, y: y + 0.5 }); }
      block(x, y);
    }

    function cluster(keys, kind, title, opts = {}) {
      const n = Math.max(4, Math.ceil(keys.length / 4) * 4);
      const cols = n / 2;
      return {
        w: cols * 2 + 2, d: 6,
        place(ox, oy) {
          if (kind !== 'single' && !opts.noRug) L.rugs.push({ x: ox + 0.4, y: oy + 0.4, w: cols * 2 + 1.2, d: 5.2, color: kind === 'hot' ? '#e6e1f3' : '#efe6d2', border: kind === 'hot' ? '#cfc6e6' : '#e0d2b4' });
          for (let c = 0; c < cols; c++) {
            for (const [r, row] of [[0, 'B'], [1, 'F']]) {
              const key = keys[c * 2 + r] ?? (kind === 'hot' ? 'H:' + S.hot.length : null);
              const seat = deskSeat(ox + 1, oy, c, row, key, opts);
              if (kind === 'hot') S.hot.push(seat);
            }
          }
          if (title) L.signs.push({ x: ox + 0.5, y: oy + 5.6, text: title, color: kind === 'hot' ? '#8a7cc8' : '#b0915a' });
          if (!opts.noDecor) decorCorner(ox + cols * 2 + 1, oy, ox * 31 + oy * 17 + lv);
        },
      };
    }

    function pod(p, opts = {}) {
      const n = Math.max(2, p.members.length);
      const cols = Math.ceil(n / 2);
      return {
        w: 4 + cols * 2 + 1, d: 7,
        place(ox, oy) {
          if (!opts.noRug) L.rugs.push({ x: ox + 0.35, y: oy + 0.35, w: 4 + cols * 2 + 0.3, d: 6.3, color: AIO.iso.rgba(p.color, 0.13), border: AIO.iso.rgba(p.color, 0.45) });
          add({ type: 'whiteboard', x: ox + 0.6, y: oy + 0.45, w: 2.2, podKey: p.lead, color: p.color });
          blockRect(ox, oy, 3, 1);
          const lead = deskSeat(ox + 1, oy + 1, 0, 'F', p.lead, { lead: true, premium: opts.premium });
          lead.lead = true;
          S.reportSpots.set(p.lead, [{ lv, x: ox + 1.55, y: oy + 5.05, face: '-y' }, { lv, x: ox + 2.5, y: oy + 5.05, face: '-y' }, { lv, x: ox + 3.4, y: oy + 4.0, face: '-x' }]);
          p.members.forEach((m, i) => deskSeat(ox + 4, oy, Math.floor(i / 2), i % 2 === 0 ? 'B' : 'F', `M:${p.lead}:${m}`, opts));
          if (p.members.length % 2 === 1) deskSeat(ox + 4, oy, cols - 1, 'F', null, opts);
          L.signs.push({ x: ox + 0.5, y: oy + 6.6, text: '🧶 ' + p.title, color: p.color, team: true, key: p.lead });
          add({ type: 'plant', x: ox + 4 + cols * 2 + 0.5, y: oy + 6.3, size: 0.8, seed: ox * 3 + oy });
          block(ox + 4 + cols * 2, oy + 6);
        },
      };
    }

    /** sofa + coffee table + round meeting table + coffee cabinet + easel */
    function lounge(title = '☕ 라운지') {
      return {
        w: 10, d: 7,
        place(ox, oy) {
          L.rugs.push({ x: ox + 0.5, y: oy + 1.6, w: 4.6, d: 3.2, color: '#e9e6e0', border: '#d9d4cb' });
          L.rugs.push({ x: ox + 5.4, y: oy + 2.6, w: 4.2, d: 4.0, color: '#e4e6e3', border: '#d2d6d1' });
          add({ type: 'sofa', x: ox + 1, y: oy + 1, w: 3.2 });
          blockRect(ox + 1, oy + 1, 3.2, 1);
          [1.6, 2.6, 3.6].forEach((dx) => S.lounge.push({ lv, x: ox + dx, y: oy + 1.62, face: '+y', pose: 'sofa', approach: [Math.floor(ox + dx), oy + 2], carry: 'mug' }));
          add({ type: 'roundTable', x: ox + 2.6, y: oy + 3.4, r: 0.55, color: '#efe7da' });
          block(ox + 2, oy + 3);
          add({ type: 'roundTable', x: ox + 7.5, y: oy + 4.6, r: 1.0, color: '#f7f6f2' });
          block(ox + 7, oy + 4);
          for (const [dx, dy, face, color] of [[6.25, 4.6, '+x', '#a9c2d6'], [8.75, 4.6, '-x', '#f2b5b5'], [7.5, 3.35, '+y', '#b8d8b0'], [7.5, 5.85, '-y', '#f3d48c']]) {
            add({ type: 'stool', x: ox + dx, y: oy + dy, color });
            S.lounge.push({ lv, x: ox + dx, y: oy + dy, face, pose: 'sit', carry: null });
          }
          add({ type: 'cabinet', x: ox + 5.6, y: oy + 0.35, w: 2.6, coffee: true });
          blockRect(ox + 5, oy, 4, 1);
          S.lounge.push({ lv, x: ox + 6.6, y: oy + 1.6, face: '-y', pose: 'stand', carry: 'mug' });
          add({ type: 'easel', x: ox + 1.2, y: oy + 5.6 });
          block(ox + 1, oy + 5);
          add({ type: 'plant', x: ox + 9.4, y: oy + 0.6, size: 1.05, seed: 11 });
          block(ox + 9, oy);
          add({ type: 'plant', x: ox + 4.7, y: oy + 6.3, size: 1.15, seed: 21 });
          block(ox + 4, oy + 6);
          add({ type: 'lamp', x: ox + 0.5, y: oy + 0.6 });
          L.lamps.push({ x: ox + 0.5, y: oy + 0.6 });
          block(ox, oy);
          if (title) L.signs.push({ x: ox + 0.5, y: oy + 6.6, text: title, color: '#a08a6a' });
        },
      };
    }

    function utility() {
      return {
        w: 6, d: 3,
        place(ox, oy) {
          add({ type: 'bookshelf', x: ox + 0.5, y: oy + 0.4, w: 2.2, seed: ox + oy });
          blockRect(ox, oy, 3, 1);
          add({ type: 'printer', x: ox + 3.2, y: oy + 0.4 });
          block(ox + 3, oy);
          add({ type: 'waterCooler', x: ox + 4.6, y: oy + 0.4 });
          block(ox + 4, oy);
        },
      };
    }

    // ---- walls (interior). Along x at y=k: edge h:x,k. Along y at x=k: edge v:k,y.
    function wallX(x0, x1, y, o = {}) {
      for (let x = x0; x < x1; x++) {
        if (o.doors && o.doors.includes(x)) { add({ type: 'doorframe', axis: 'x', x, y, glass: o.glass, bars: o.bars, color: o.color, sign: o.doorSign && x === o.doors[0] ? o.doorSign : null }); continue; }
        L.edges.add(`h:${x},${y}`);
        add({ type: 'wall', axis: 'x', x, y, glass: o.glass, frosted: o.frosted, bars: o.bars, h: o.h, color: o.color });
      }
    }
    function wallY(y0, y1, x, o = {}) {
      for (let y = y0; y < y1; y++) {
        if (o.doors && o.doors.includes(y)) { add({ type: 'doorframe', axis: 'y', x, y, glass: o.glass, bars: o.bars, color: o.color }); continue; }
        L.edges.add(`v:${x},${y}`);
        add({ type: 'wall', axis: 'y', x, y, glass: o.glass, frosted: o.frosted, bars: o.bars, h: o.h, color: o.color });
      }
    }

    return { lv, add, block, blockRect, deskSeat, decorCorner, cluster, pod, lounge, utility, wallX, wallY };
  }

  /** shelf packing of blocks: returns rows; calls place() */
  function pack(blocks, maxW, x0 = 1, y0 = 1, gapY = 0) {
    let x = x0, y = y0, rowH = 0, W = 0;
    const rows = [];
    let row = [];
    for (const b of blocks) {
      if (x + b.w > maxW + x0 && row.length) { rows.push({ y, h: rowH, items: row }); y += rowH + gapY; x = x0; rowH = 0; row = []; }
      row.push({ b, x, y });
      x += b.w; rowH = Math.max(rowH, b.d); W = Math.max(W, x);
    }
    if (row.length) rows.push({ y, h: rowH, items: row });
    y += rowH;
    for (const r of rows) {
      const used = r.items.reduce((s, it) => s + it.b.w, 0);
      const shift = Math.floor((W - x0 - used) / 2);
      for (const it of r.items) it.b.place(it.x + shift, it.y + Math.floor((r.h - it.b.d) / 2));
    }
    return { W, H: y, rows };
  }

  function finalize(S) {
    for (const L of S.levels) {
      L.grid = new Uint8Array(L.W * L.H).fill(1);
      for (const k of L.blocked) { const [i, j] = k.split(',').map(Number); if (i >= 0 && j >= 0 && i < L.W && j < L.H) L.grid[j * L.W + i] = 0; }
    }
    // stack levels upward on screen (exploded building)
    let dy = 0;
    S.levels.forEach((L, i) => {
      // this floor's front corner must clear the walls of the floor below (+ slab and a little air for the floor tag)
      if (i > 0) dy -= (L.W + L.H) * 16 + 104 + 60;
      L.dy = dy;
    });
    const pts = [];
    for (const L of S.levels) {
      for (const p of [P(0, 0, 120), P(L.W, 0, 120), P(0, L.H, 120), P(L.W, L.H, -20), P(0, L.H, -20), P(L.W, 0, -20)]) pts.push([p[0], p[1] + L.dy]);
    }
    S.bounds = { minX: Math.min(...pts.map((p) => p[0])) - 40, maxX: Math.max(...pts.map((p) => p[0])) + 30, minY: Math.min(...pts.map((p) => p[1])) - 40, maxY: Math.max(...pts.map((p) => p[1])) + 20 };
    for (const L of S.levels) {
      const b = [P(0, 0, 120), P(L.W, 0, 120), P(0, L.H, 0), P(L.W, L.H, -20), P(L.W, 0, 0)];
      L.bounds = { minX: Math.min(...b.map((p) => p[0])) - 30, maxX: Math.max(...b.map((p) => p[0])) + 30, minY: Math.min(...b.map((p) => p[1])) + L.dy - 30, maxY: Math.max(...b.map((p) => p[1])) + L.dy + 20 };
    }
    return S;
  }

  // ---------------------------------------------------------------- the original open-plan office (원룸)
  function buildOpen(spec) {
    const S = newScene('open');
    const L = newLevel(S, '오피스', { floor: 'wood', outer: 'office' });
    const K = kit(S, L);
    const blocks = [];
    for (const p of spec.pods) blocks.push(K.pod(p));
    const singles = spec.singles.slice();
    while (singles.length % 4) singles.push(null);
    for (let i = 0; i < singles.length; i += 4) blocks.push(K.cluster(singles.slice(i, i + 4), 'single', i === 0 ? '💺 개인 데스크' : null));
    if (spec.partners.length) for (let i = 0; i < spec.partners.length; i += 4) blocks.push(K.cluster(spec.partners.slice(i, i + 4), 'partner', i === 0 ? '🤝 협력사석 (앱)' : null));
    blocks.push(K.cluster(new Array(spec.hot).fill(undefined), 'hot', '🎒 인턴 핫데스크'));
    blocks.push(K.lounge());
    blocks.push(K.utility());
    const area = blocks.reduce((s, b) => s + b.w * b.d, 0);
    const maxW = Math.max(20, Math.min(46, Math.ceil(Math.sqrt(area) * 1.35)));
    const { W, H } = pack(blocks, maxW);
    L.W = W + 1; L.H = H + 2;
    openShell(S, L, K);
    return finalize(S);
  }

  /** door, coat rack, windows and back-wall decor slots for a single-room level */
  function openShell(S, L, K, opts = {}) {
    S.door = S.door || { lv: L.idx, x: 0.6, y: L.H - 1.3, face: '+x' };
    L.doorY0 = L.H - 0.55;
    if (!opts.noCoat) { K.add({ type: 'coatRack', x: 0.5, y: L.H - 2.6 }); K.block(0, L.H - 3); }
    const Wd = L.W;
    L.wallY = { frames: Wd >= 18 ? [1.2, 2.6] : [], plaque: Math.max(4.2, Wd / 2 - 1.5), bulletin: Wd - 11.4, calendar: Wd - 7.2, clock: Wd - 4.6, frame2: Wd - 2.4 };
    L.windows = [];
    for (let wy = 1.2; wy + 2.2 < L.H - 2.4; wy += 3.4) L.windows.push(wy + 2);
  }

  // ---------------------------------------------------------------- pathfinding on a level grid
  // Walls live on tile edges (L.edges: "h:x,y" / "v:x,y"); a move may never cross one. Doors are gaps in those edges.
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const edgeKey = (cx, cy, dx, dy) => (dx === 1 ? `v:${cx + 1},${cy}` : dx === -1 ? `v:${cx},${cy}` : dy === 1 ? `h:${cx},${cy + 1}` : `h:${cx},${cy}`);
  const crosses = (L, cx, cy, dx, dy) => L.edges.size > 0 && L.edges.has(edgeKey(cx, cy, dx, dy));

  /** nearest walkable tile reachable WITHOUT crossing a wall (BFS through any tile, blocked or not) */
  function nearestReachable(L, tx, ty) {
    tx = Math.max(0, Math.min(L.W - 1, tx | 0)); ty = Math.max(0, Math.min(L.H - 1, ty | 0));
    if (L.grid[ty * L.W + tx]) return [tx, ty];
    const seen = new Uint8Array(L.W * L.H);
    const q = [[tx, ty]]; seen[ty * L.W + tx] = 1;
    for (let h = 0; h < q.length && h < 400; h++) {
      const [cx, cy] = q[h];
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= L.W || ny >= L.H || seen[ny * L.W + nx] || crosses(L, cx, cy, dx, dy)) continue;
        if (L.grid[ny * L.W + nx]) return [nx, ny];
        seen[ny * L.W + nx] = 1; q.push([nx, ny]);
      }
    }
    return null;
  }
  const nearestWalkable = (L, tx, ty) => nearestReachable(L, tx, ty) || [Math.max(0, Math.min(L.W - 1, tx | 0)), Math.max(0, Math.min(L.H - 1, ty | 0))];

  /** binary-heap A*; cost per tile from L.cost (outdoor: paths are cheap, grass dear). Returns tile centres, or null if unreachable. */
  function path(L, fx, fy, tx, ty) {
    const W = L.W, H = L.H, C = L.cost;
    const s = nearestReachable(L, Math.floor(fx), Math.floor(fy)), t = nearestReachable(L, Math.floor(tx), Math.floor(ty));
    if (!s || !t) return null;
    const start = s[1] * W + s[0], goal = t[1] * W + t[0];
    if (start === goal) return [[s[0] + 0.5, s[1] + 0.5]];
    const g = new Float32Array(W * H).fill(Infinity);
    const came = new Int32Array(W * H).fill(-1);
    const heap = [], hf = [];
    const push = (i, f) => { heap.push(i); hf.push(f); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (hf[p] <= hf[k]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; [hf[p], hf[k]] = [hf[k], hf[p]]; k = p; } };
    const pop = () => {
      const top = heap[0], li = heap.pop(), lf = hf.pop();
      if (heap.length) { heap[0] = li; hf[0] = lf; let k = 0; for (;;) { const a = 2 * k + 1, b = a + 1; let m = k; if (a < heap.length && hf[a] < hf[m]) m = a; if (b < heap.length && hf[b] < hf[m]) m = b; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; [hf[m], hf[k]] = [hf[k], hf[m]]; k = m; } }
      return top;
    };
    const h = (i) => Math.abs((i % W) - t[0]) + Math.abs(((i / W) | 0) - t[1]);
    g[start] = 0; push(start, h(start));
    while (heap.length) {
      const cur = pop();
      if (cur === goal) break;
      const cx = cur % W, cy = (cur / W) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || crosses(L, cx, cy, dx, dy)) continue;
        const ni = ny * W + nx;
        if (!L.grid[ni]) continue;
        const turn = came[cur] >= 0 && ((came[cur] % W) === cx) !== (dx === 0) ? 0.2 : 0;
        const ng = g[cur] + (C ? C[ni] : 1) + turn;
        if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; push(ni, ng + h(ni)); }
      }
    }
    if (!Number.isFinite(g[goal])) return null;
    const out = [];
    for (let c = goal; c >= 0; c = came[c]) { out.push([(c % W) + 0.5, ((c / W) | 0) + 0.5]); if (c === start) break; }
    return out.reverse();
  }

  AIO.layout = { newScene, newLevel, kit, pack, finalize, openShell, buildOpen, path, nearestWalkable, nearestReachable, crosses };
})();
