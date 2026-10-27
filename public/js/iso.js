// Isometric projection, camera and drawing primitives.
(function () {
  const TW = 64, TH = 32;           // tile width/height in world pixels
  const P = (x, y, z = 0) => [(x - y) * TW / 2, (x + y) * TH / 2 - z];

  // ---- color helpers ----
  const cache = new Map();
  function hexToRgb(h) {
    if (h.startsWith('rgb')) return h.match(/[\d.]+/g).slice(0, 3).map(Number);
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  /** amt -1..1 : darken / lighten */
  function shade(hex, amt) {
    const k = hex + amt;
    let v = cache.get(k);
    if (v) return v;
    const [r, g, b] = hexToRgb(hex);
    const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
    v = `rgb(${f(r)},${f(g)},${f(b)})`;
    cache.set(k, v);
    return v;
  }
  const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };

  // ---- primitives ----
  function poly(ctx, pts, fill, stroke, lw = 1) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }

  /** axis-aligned box: x..x+w, y..y+d, z..z+h. colors: top, left(+y face), right(+x face) */
  function box(ctx, x, y, z, w, d, h, top, left, right, stroke) {
    const z1 = z + h;
    poly(ctx, [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z1), P(x, y + d, z1)], left, stroke, 0.6);
    poly(ctx, [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z1), P(x + w, y, z1)], right, stroke, 0.6);
    poly(ctx, [P(x, y, z1), P(x + w, y, z1), P(x + w, y + d, z1), P(x, y + d, z1)], top, stroke, 0.6);
  }
  /** shorthand: box with auto-shaded sides */
  function sbox(ctx, x, y, z, w, d, h, base, stroke) {
    box(ctx, x, y, z, w, d, h, shade(base, 0.08), shade(base, -0.1), shade(base, -0.2), stroke);
  }

  function ellipseFloor(ctx, cx, cy, rx, ry, z, fill, stroke) {
    // ellipse lying on the floor in tile units (approx via scaling)
    const [sx, sy] = P(cx, cy, z);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1, 0.5);
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * TW / Math.SQRT2, ry * TW / Math.SQRT2, 0, 0, Math.PI * 2);
    ctx.restore();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }
  /** cylinder standing on floor (round table, pot, stool) */
  function cylinder(ctx, cx, cy, z, r, h, top, side, stroke) {
    const [sx, sy] = P(cx, cy, z);
    const rx = r * TW / Math.SQRT2 * 0.98, ry = rx / 2;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI);
    ctx.lineTo(sx - rx, sy - h);
    ctx.ellipse(sx, sy - h, rx, ry, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fillStyle = side; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.6; ctx.stroke(); }
    ctx.beginPath();
    ctx.ellipse(sx, sy - h, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = top; ctx.fill();
    if (stroke) ctx.stroke();
  }

  /** Draw in the local 2D space of a vertical plane y=const facing +y. 32 local units = 1 tile. origin = (x0, y, zTop), v grows downward */
  function onPlaneY(ctx, x0, y, zTop, fn) {
    const [sx, sy] = P(x0, y, zTop);
    ctx.save();
    ctx.transform(TW / 2 / 32, TH / 2 / 32, 0, 1, sx, sy);
    fn(ctx);
    ctx.restore();
  }
  /** vertical plane x=const facing +x; local u runs toward -y (left→right on screen). origin = (x, y0, zTop) where y0 is the LEFT end (larger y) */
  function onPlaneX(ctx, x, y0, zTop, fn) {
    const [sx, sy] = P(x, y0, zTop);
    ctx.save();
    ctx.transform(TW / 2 / 32, -TH / 2 / 32, 0, 1, sx, sy);
    fn(ctx);
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---- camera ----
  class Camera {
    constructor() { this.x = 0; this.y = 0; this.z = 1; this.tx = 0; this.ty = 0; this.tz = 1; this.userMoved = false; }
    toScreen(wx, wy) { return [(wx - this.x) * this.z + this.vw / 2, (wy - this.y) * this.z + this.vh / 2]; }
    toWorld(sx, sy) { return [(sx - this.vw / 2) / this.z + this.x, (sy - this.vh / 2) / this.z + this.y]; }
    fit(bounds, vw, vh, pad = { l: 20, r: 20, t: 90, b: 60 }) {
      const w = bounds.maxX - bounds.minX, h = bounds.maxY - bounds.minY;
      const aw = vw - pad.l - pad.r, ah = vh - pad.t - pad.b;
      this.tz = Math.max(0.04, Math.min(2.2, Math.min(aw / w, ah / h)));
      const cx = (bounds.minX + bounds.maxX) / 2, cy = (bounds.minY + bounds.maxY) / 2;
      this.tx = cx - ((pad.l - pad.r) / 2) / this.tz;
      this.ty = cy - ((pad.t - pad.b) / 2) / this.tz;
    }
    focus(wx, wy, z) { this.tx = wx; this.ty = wy; if (z) this.tz = z; }
    step(dt) {
      const k = 1 - Math.pow(0.0015, dt);
      this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; this.z += (this.tz - this.z) * k;
    }
    snap() { this.x = this.tx; this.y = this.ty; this.z = this.tz; }
  }

  AIO.iso = { TW, TH, P, shade, rgba, poly, box, sbox, ellipseFloor, cylinder, onPlaneY, onPlaneX, roundRect, Camera };
})();
