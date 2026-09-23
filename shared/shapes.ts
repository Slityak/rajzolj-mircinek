/**
 * "shapes" encoding: vectorises a doodle into geometric primitives and describes them, and how they
 * relate, with a fixed vocabulary. Deterministic: the same drawing always gives the same text.
 *
 *   Drawing: 3 shapes from 2 strokes.
 *   1. large closed ellipse, horizontal, very elongated, in the center.
 *   2. small triangle, attached to the right end of 1.
 *   3. tiny dot, inside 1, near its left end.
 *
 * Pipeline per stroke: join strokes whose ends meet → cut self-crossing loops → resample + smooth →
 * corners from turning angle, confirmed by pen slow-down when timestamps are present → pick the
 * simplest primitive that fits. Then relations: containment, attachment (to which end or side),
 * relative position, repeated elements (rays).
 * Strokes are flat [x0, y0, …] on the 256 judge grid; times (optional) are ms per point.
 */

interface Pt { x: number; y: number; t: number } // t is NaN when unknown

interface Shape {
  n: number // 1-based, in drawing order
  pts: Pt[]
  closed: boolean
  kind: string // primitive with its own qualifiers, e.g. "closed ellipse, horizontal, very elongated"
  cx: number; cy: number
  w: number; h: number
  size: number // max(w, h)
  /** Principal axis (unit vector), half-length along it, and elongation (major / minor). */
  ux: number; uy: number; half: number; elong: number
  /** Direction of a straight line, radians. */
  dir?: number
}

const hyp = Math.hypot
const d2 = (a: Pt, b: Pt) => hyp(a.x - b.x, a.y - b.y)
const len = (p: Pt[]) => { let s = 0; for (let i = 1; i < p.length; i++) s += d2(p[i], p[i - 1]); return s }

function toPts(xy: readonly number[], t?: readonly number[]): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < xy.length; i += 2) out.push({ x: xy[i], y: xy[i + 1], t: t ? t[i / 2] : NaN })
  return out
}

function resample(p: Pt[], step: number): Pt[] {
  if (p.length < 2) return p.slice()
  const out: Pt[] = [p[0]]
  let acc = 0
  for (let i = 1; i < p.length; i++) {
    let a = p[i - 1]; const b = p[i]
    let d = d2(a, b)
    while (acc + d >= step && d > 0) {
      const k = (step - acc) / d
      a = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, t: a.t + (b.t - a.t) * k }
      out.push(a); d = d2(a, b); acc = 0
    }
    acc += d
  }
  if (d2(out[out.length - 1], p[p.length - 1]) > step / 3) out.push(p[p.length - 1])
  return out
}

function smooth(p: Pt[], closed: boolean, r = 2): Pt[] {
  const n = p.length
  return p.map((q, i) => {
    if (!closed && (i < 1 || i > n - 2)) return q
    let x = 0, y = 0, c = 0
    for (let d = -r; d <= r; d++) {
      const j = closed ? (i + d + n) % n : Math.max(0, Math.min(n - 1, i + d))
      x += p[j].x; y += p[j].y; c++
    }
    return { x: x / c, y: y / c, t: q.t }
  })
}

/** Ramer–Douglas–Peucker; returns kept indices. */
function rdp(p: Pt[], eps: number): number[] {
  const keep = new Set([0, p.length - 1])
  const rec = (a: number, b: number) => {
    let far = -1, fd = eps
    for (let i = a + 1; i < b; i++) { const d = segDist(p[i], p[a], p[b]); if (d > fd) { fd = d; far = i } }
    if (far >= 0) { keep.add(far); rec(a, far); rec(far, b) }
  }
  rec(0, p.length - 1)
  return [...keep].sort((a, b) => a - b)
}

function segDist(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1e-9
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2))
  return hyp(p.x - a.x - t * dx, p.y - a.y - t * dy)
}

function signedArea(p: Pt[]) {
  let a = 0
  for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q.x * r.y - r.x * q.y }
  return a / 2
}

function hull(p: Pt[]): Pt[] {
  const s = [...p].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lo: Pt[] = [], up: Pt[] = []
  for (const q of s) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q) }
  for (const q of s.reverse()) { while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q) }
  return lo.slice(0, -1).concat(up.slice(0, -1))
}

function inside(q: { x: number; y: number }, poly: Pt[]) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a.y > q.y) !== (b.y > q.y) && q.x < (b.x - a.x) * (q.y - a.y) / (b.y - a.y) + a.x) c = !c
  }
  return c
}

/** Principal axes of a point set. */
function pca(p: Pt[]) {
  let mx = 0, my = 0
  for (const q of p) { mx += q.x; my += q.y }
  mx /= p.length; my /= p.length
  let sxx = 0, syy = 0, sxy = 0
  for (const q of p) { const dx = q.x - mx, dy = q.y - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy }
  sxx /= p.length; syy /= p.length; sxy /= p.length
  const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det))
  const l1 = tr / 2 + disc, l2 = Math.max(tr / 2 - disc, 1e-6)
  const ang = Math.abs(sxy) < 1e-9 ? (sxx >= syy ? 0 : Math.PI / 2) : Math.atan2(l1 - sxx, sxy)
  return { mx, my, ux: Math.cos(ang), uy: Math.sin(ang), sd1: Math.sqrt(l1), sd2: Math.sqrt(l2) }
}

/** Least-squares circle (Kåsa); returns centre, radius and mean relative residual. */
function fitCircle(p: Pt[]) {
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0
  for (const q of p) {
    const z = q.x * q.x + q.y * q.y
    sx += q.x; sy += q.y; sxx += q.x * q.x; syy += q.y * q.y; sxy += q.x * q.y; sxz += q.x * z; syz += q.y * z; sz += z
  }
  const n = p.length
  // Solve [sxx sxy sx; sxy syy sy; sx sy n] [a b c] = [-sxz -syz -sz]
  const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], B = [-sxz, -syz, -sz]
  const det3 = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  const D = det3(A)
  if (Math.abs(D) < 1e-9) return { cx: 0, cy: 0, r: Infinity, res: Infinity }
  const col = (i: number) => A.map((row, r) => row.map((v, c) => (c === i ? B[r] : v)))
  const a = det3(col(0)) / D, b = det3(col(1)) / D, c = det3(col(2)) / D
  const cx = -a / 2, cy = -b / 2, r = Math.sqrt(Math.max(cx * cx + cy * cy - c, 0))
  const res = p.reduce((s, q) => s + Math.abs(hyp(q.x - cx, q.y - cy) - r), 0) / n / Math.max(r, 1)
  return { cx, cy, r, res }
}

interface Corner { i: number; turn: number; sign: number }

/** How steadily the distance from the centroid grows (or shrinks) along the path: 1 = perfectly. */
function radialTrend(p: Pt[]): number {
  let mx = 0, my = 0
  for (const q of p) { mx += q.x; my += q.y }
  mx /= p.length; my /= p.length
  const r = p.map(q => hyp(q.x - mx, q.y - my)), n = r.length, im = (n - 1) / 2, rm = r.reduce((a, b) => a + b, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  r.forEach((v, i) => { sxy += (i - im) * (v - rm); sxx += (i - im) ** 2; syy += (v - rm) ** 2 })
  return Math.abs(sxy / Math.sqrt(sxx * syy || 1))
}

/**
 * Corners: sharp turns, or moderate turns where the pen clearly slowed down (people slow down at
 * corners; pointer timestamps make that visible). Works on the resampled, smoothed polyline.
 */
function corners(p: Pt[], closed: boolean): Corner[] {
  const n = p.length, k = 3
  if (n < 2 * k + 1) return []
  const at = (i: number) => p[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))]
  const timed = p.every(q => Number.isFinite(q.t))
  const speed = (i: number) => { const a = at(i - 1), b = at(i + 1), dt = b.t - a.t; return dt > 0 ? d2(a, b) / dt : NaN }
  const speeds = timed ? p.map((_, i) => speed(i)).filter(Number.isFinite).sort((a, b) => a - b) : []
  const median = speeds.length ? speeds[speeds.length >> 1] : NaN
  const out: Corner[] = []
  for (let i = closed ? 0 : k; i < (closed ? n : n - k); i++) {
    const a = at(i - k), b = at(i), c = at(i + k)
    let d = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x)
    while (d > Math.PI) d -= 2 * Math.PI
    while (d < -Math.PI) d += 2 * Math.PI
    const turn = Math.abs(d)
    const slow = timed && speed(i) < .4 * median
    if (!(turn > .95 || (slow && turn > .5))) continue
    const last = out[out.length - 1]
    if (last && i - last.i <= k) { if (turn > last.turn) out[out.length - 1] = { i, turn, sign: Math.sign(d) } }
    else out.push({ i, turn, sign: Math.sign(d) })
  }
  if (closed && out.length > 1 && out[0].i + n - out[out.length - 1].i <= k) {
    if (out[out.length - 1].turn > out[0].turn) out.shift(); else out.pop()
  }
  return out
}

/** Max deviation of the pieces between corners from their chords, relative to piece length. */
function pieceStraightness(p: Pt[], cs: Corner[], closed: boolean): number {
  const idx = cs.map(c => c.i)
  const cuts = closed ? [...idx, idx[0] + p.length] : [0, ...idx, p.length - 1]
  let worst = 0
  for (let i = 1; i < cuts.length; i++) {
    const seg: Pt[] = []
    for (let j = cuts[i - 1]; j <= cuts[i]; j++) seg.push(p[j % p.length])
    const a = seg[0], b = seg[seg.length - 1], l = Math.max(d2(a, b), 1)
    for (const q of seg) worst = Math.max(worst, segDist(q, a, b) / l)
  }
  return worst
}

const orient = (ux: number, uy: number) => {
  const deg = Math.abs(Math.atan2(uy, ux) * 180 / Math.PI) % 180
  return deg < 22 || deg > 158 ? 'horizontal' : deg > 68 && deg < 112 ? 'vertical' : 'diagonal'
}
const elongWord = (e: number) => (e < 1.25 ? 'round' : e < 2 ? 'slightly elongated' : 'very elongated')

function classify(pts: Pt[], closed: boolean, span: number): Pick<Shape, 'kind' | 'dir'> {
  const box = bbox(pts), size = Math.max(box.w, box.h)
  if (size < .05 * span || len(pts) < 8) return { kind: 'dot' }
  // Too small to dissect reliably (eyes, buttons, toppings): hand wobble would dominate the shape.
  if (closed && size < .12 * span) return { kind: 'small round loop' }
  const step = Math.max(size / 48, 1)
  const rs = resample(pts, step)
  const ring = closed ? rs.slice(0, -1) : rs
  const sm = smooth(ring, closed)
  // A corner must also be a vertex of the RDP-simplified outline, which filters out wobble.
  const keys = rdp(sm, .035 * size)
  const cs = corners(sm, closed).filter(c => keys.some(v => Math.abs(v - c.i) <= 2) || (closed && (c.i <= 2 || c.i >= sm.length - 3)))
  const P = pca(sm), elong = P.sd1 / P.sd2

  if (!closed) {
    const chord = d2(rs[0], rs[rs.length - 1]), L = len(rs)
    if (chord / L > .94) {
      const dir = Math.atan2(rs[rs.length - 1].y - rs[0].y, rs[rs.length - 1].x - rs[0].x)
      return { kind: `straight line, ${orient(Math.cos(dir), Math.sin(dir))}`, dir }
    }
    // Spiral: keeps turning the same way for well over one full turn.
    let total = 0
    for (let i = 2; i < sm.length; i++) {
      let d = Math.atan2(sm[i].y - sm[i - 1].y, sm[i].x - sm[i - 1].x) - Math.atan2(sm[i - 1].y - sm[i - 2].y, sm[i - 1].x - sm[i - 2].x)
      while (d > Math.PI) d -= 2 * Math.PI
      while (d < -Math.PI) d += 2 * Math.PI
      total += d
    }
    if (Math.abs(total) > 2.4 * Math.PI && radialTrend(sm) > .7) return { kind: 'spiral' }
    const straight = pieceStraightness(sm, cs, false) < .12
    const alternating = cs.slice(1).filter((c, i) => c.sign !== cs[i].sign).length >= (cs.length - 1) * .6
    if (cs.length >= 3 && straight && alternating) return { kind: `zigzag line with ${cs.length + 1} straight segments, ${orient(P.ux, P.uy)}` }
    if (cs.length >= 3 && straight) {
      // Turning the same way: an outline left open, e.g. a house drawn in one go.
      const peak = cs.map(c => sm[c.i]).sort((a, b) => a.y - b.y)[0]
      const peaked = spot(peak, box) === 'top' && cs.length >= 4
      return { kind: peaked ? 'outline of a square or rectangle with a triangular peak on top, drawn in one line' : `open outline made of ${cs.length + 1} straight sides` }
    }
    if (cs.length === 1 && straight) {
      const c = sm[cs[0].i]
      return { kind: `angle made of two straight lines, tip at the ${spot(c, box)}${spot(c, box).startsWith('top') ? ' (like ^)' : spot(c, box).startsWith('bottom') ? ' (like V)' : ''}` }
    }
    if (cs.length === 2 && straight) {
      const mid = { x: (rs[0].x + rs[rs.length - 1].x) / 2, y: (rs[0].y + rs[rs.length - 1].y) / 2 }
      return { kind: `three-sided open shape made of straight lines, open at the ${spot(mid, box)}` }
    }
    const fit = fitCircle(sm)
    if (fit.res < .08 && cs.length === 0) {
      // Which way the arc opens: from the arc's middle towards the circle centre.
      const m = sm[sm.length >> 1], dx = fit.cx - m.x, dy = fit.cy - m.y
      const opens = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')
      const wide = L / Math.max(fit.r, 1) > Math.PI * .9
      return { kind: `${wide ? 'deep curved arc (U or C shape)' : 'gentle arc'}, opening ${opens}` }
    }
    // Wavy: the curvature flips sign several times without sharp corners.
    let flips = 0, prev = 0
    for (let i = 4; i < sm.length - 4; i += 2) {
      const a = sm[i - 4], b = sm[i], c = sm[i + 4]
      const cr = Math.sign((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x))
      if (cr && prev && cr !== prev) flips++
      if (cr) prev = cr
    }
    if (cs.length === 1 && !straight) return { kind: `two curves meeting at one sharp point (like a crescent or a sickle), ${orient(P.ux, P.uy)}` }
    if (flips >= 3 && cs.length <= 1) return { kind: `wavy line, ${orient(P.ux, P.uy)}` }
    // Curved pieces between same-direction cusps: a scalloped, cloud-like edge (tree crowns, clouds).
    const major = cs.filter(c => c.sign > 0).length >= cs.length / 2 ? 1 : -1
    const sameWay = cs.filter(c => c.sign === major).length >= cs.length * .65
    if (cs.length >= 3 && !straight && sameWay) return { kind: `bumpy, cloud-like line made of ${cs.length + 1} round bumps` }
    if (cs.length >= 3) return { kind: `jagged line with ${cs.length} sharp turns` }
    return { kind: `curved line${cs.length ? ` with ${cs.length === 1 ? 'one sharp bend' : 'two sharp bends'}` : ''}, ${orient(P.ux, P.uy)}` }
  }

  // Closed shapes, simplest first.
  const ringArea = Math.abs(signedArea(sm)), H = hull(sm), hullArea = Math.max(Math.abs(signedArea(H)), 1)
  const solidity = ringArea / hullArea
  const convex = cs.filter(c => c.sign === Math.sign(signedArea(sm)))
  const notches = dents(sm, H, size)
  const straight = pieceStraightness(sm, cs, true)

  const fill = ringArea / Math.max(box.w * box.h, 1)
  const apex = convex.map(c => sm[c.i]).sort((a, b) => a.y - b.y)[0]
  if (convex.length === 5 && straight < .12 && apex && spot(apex, box) === 'top' && fill > .6)
    return { kind: 'pentagon: a square or rectangle with a triangular peak on top' }
  if (fill > .86 && solidity > .9 && notches.length === 0)
    return { kind: elong < 1.2 ? 'square' : `rectangle, ${orient(P.ux, P.uy)}, ${elongWord(elong)}` }
  if (convex.length >= 3 && convex.length <= 6 && straight < .1 && notches.length === 0) {
    const n = convex.length
    if (n === 3) return { kind: `triangle, ${elongWord(elong)}${elong >= 1.25 ? `, ${orient(P.ux, P.uy)}` : ''}` }
    if (n === 4) {
      const axisAligned = orient(P.ux, P.uy) !== 'diagonal' || elong < 1.15
      const fill = ringArea / Math.max(box.w * box.h, 1)
      if (fill > .75 && axisAligned) return { kind: elong < 1.2 ? 'square' : `rectangle, ${orient(P.ux, P.uy)}, ${elongWord(elong)}` }
      return { kind: 'diamond (four-sided shape standing on a corner)' }
    }
    return { kind: `polygon with ${n} corners` }
  }
  // Ellipse fit: normalised radius along the principal axes.
  const a = Math.SQRT2 * P.sd1, b = Math.SQRT2 * P.sd2
  const res = sm.reduce((s, q) => {
    const dx = q.x - P.mx, dy = q.y - P.my, u = dx * P.ux + dy * P.uy, v = -dx * P.uy + dy * P.ux
    return s + Math.abs(hyp(u / a, v / b) - 1)
  }, 0) / sm.length
  // Small circles wobble relatively more, so they get a looser fit.
  if (res < (size < .35 * span ? .16 : .1) && notches.length === 0 && convex.length <= 2) {
    if (convex.length === 2 && elong > 1.4) return { kind: `pointed oval (lens or leaf shape), ${orient(P.ux, P.uy)}, ${elongWord(elong)}` }
    return { kind: elong < 1.2 ? 'circle' : `ellipse, ${orient(P.ux, P.uy)}, ${elongWord(elong)}` }
  }
  const sharpTips = convex.filter(c => c.turn > 1.3).length
  // Stars have sharp outward tips; a cloud's bumps are round even when its dents are deep.
  if ((notches.length >= 4 && sharpTips >= 4) || (straight < .2 && convex.filter(c => c.turn > 1.9).length >= 4)) return { kind: `star with ${Math.min(Math.max(notches.length, convex.length), 8)} points` }
  // Where dents sit along the long axis: t = −1…1 from one end to the other; side = which side of the axis.
  let reach = 0
  for (const q of sm) reach = Math.max(reach, Math.abs((q.x - P.mx) * P.ux + (q.y - P.my) * P.uy))
  const along = (q: Pt) => ((q.x - P.mx) * P.ux + (q.y - P.my) * P.uy) / Math.max(reach, 1)
  const across = (q: Pt) => Math.sign(-(q.x - P.mx) * P.uy + (q.y - P.my) * P.ux)
  const endWord = (t: number) => sideOf(P.ux * Math.sign(t), P.uy * Math.sign(t))
  if (elong >= 1.3 && notches.length === 2 && Math.sign(along(notches[0])) === Math.sign(along(notches[1])) &&
      Math.min(Math.abs(along(notches[0])), Math.abs(along(notches[1]))) > .25 && across(notches[0]) !== across(notches[1]))
    return { kind: `elongated closed outline, ${orient(P.ux, P.uy)}, pinched into a narrow waist near its ${endWord(along(notches[0]))} end, where it fans out again like a fin` }
  if (elong >= 1.3 && notches.length === 1 && Math.abs(along(notches[0])) > .6)
    return { kind: `elongated closed outline, ${orient(P.ux, P.uy)}, with a V-shaped notch cut into its ${endWord(along(notches[0]))} end (forked end)` }
  // One dent reaching deep towards the middle from a side: a crescent, however it is oriented.
  if (notches.length === 1 && notches[0].depth > .22 * size && Math.abs(along(notches[0])) < .5)
    return { kind: `crescent (a round shape with a deep bite out of its ${sideOf(notches[0].x - P.mx, notches[0].y - P.my)} side)` }
  if (notches.length >= 1 && notches.length <= 2 && notches.some(nt => spot(nt, box) === 'top') && convex.some(c => spot(sm[c.i], box).startsWith('bottom')))
    return { kind: 'heart-like outline: a dip at the top center, two round bumps, a point at the bottom' }
  if (solidity < .7 && notches.length === 1) return { kind: `crescent (a round shape with a deep bite out of its ${spot(notches[0], box)} side)` }
  if (notches.length >= 3 && straight > .1) return { kind: `bumpy, cloud-like outline with ${notches.length + 1} bulges, ${elongWord(elong)}` }
  if (convex.length >= 3 && straight < .14) return { kind: `irregular polygon with ${convex.length} corners` }
  return { kind: `irregular closed blob, ${elongWord(elong)}${notches.length ? `, dented at the ${[...new Set(notches.map(nt => spot(nt, box)))].join(' and ')}` : ''}` }
}

/** Inward dents: runs of points clearly inside the convex hull; the deepest point of each, with its depth. */
function dents(p: Pt[], H: Pt[], size: number): (Pt & { depth: number })[] {
  const depth = p.map(q => Math.min(...H.map((h, i) => segDist(q, h, H[(i + 1) % H.length]))))
  const out: (Pt & { depth: number })[] = [], n = p.length, start = depth.indexOf(Math.min(...depth))
  let best: { q: Pt; d: number } | null = null
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n
    if (depth[i] > .04 * size) { if (!best || depth[i] > best.d) best = { q: p[i], d: depth[i] } }
    else if (best) { if (best.d > Math.max(.08 * size, 5)) out.push({ ...best.q, depth: best.d }); best = null }
  }
  return out
}

function bbox(p: Pt[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const q of p) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y) }
  return { x0, y0, w: x1 - x0, h: y1 - y0 }
}

/** 3×3 grid position of a point inside a box. */
function spot(q: { x: number; y: number }, b: { x0: number; y0: number; w: number; h: number }) {
  const fx = (q.x - b.x0) / Math.max(b.w, 1), fy = (q.y - b.y0) / Math.max(b.h, 1)
  const v = fy < .33 ? 'top' : fy > .67 ? 'bottom' : '', h = fx < .33 ? 'left' : fx > .67 ? 'right' : ''
  return v && h ? `${v}-${h}` : v || h || 'center'
}

const isClosed = (p: Pt[]) => {
  const b = bbox(p), size = Math.max(b.w, b.h, 1), L = len(p)
  return L > 2 * size && d2(p[0], p[p.length - 1]) < Math.min(.15 * L, .3 * size)
}

/** Joins open strokes whose ends meet (a circle drawn in two halves becomes one circle). */
function join(strokes: Pt[][], span: number): Pt[][] {
  const S = strokes.map(s => s.slice()), gap = .07 * span
  for (let merged = true; merged;) {
    merged = false
    outer: for (let i = 0; i < S.length; i++) for (let j = 0; j < S.length; j++) {
      if (i === j || S[i].length < 2 || S[j].length < 2 || isClosed(S[i]) || isClosed(S[j])) continue
      const a = S[i], b = S[j]
      if (d2(a[a.length - 1], b[0]) < gap) S[i] = a.concat(b)
      else if (d2(a[a.length - 1], b[b.length - 1]) < gap) S[i] = a.concat([...b].reverse())
      else continue
      S.splice(j, 1); merged = true; break outer
    }
  }
  return S
}

/** Splits a stroke at its single self-crossing into two loops (a one-line fish: body + tail). */
function splitLoop(p: Pt[], span: number): Pt[][] {
  const cross = (a: Pt, b: Pt, c: Pt, d: Pt): Pt | null => {
    const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y, den = rx * sy - ry * sx
    if (Math.abs(den) < 1e-9) return null
    const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den, u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den
    return t > 0 && t < 1 && u > 0 && u < 1 ? { x: a.x + t * rx, y: a.y + t * ry, t: a.t } : null
  }
  const found: { i: number; j: number; x: Pt }[] = []
  for (let i = 0; i < p.length - 1; i++) for (let j = i + 2; j < p.length - 1; j++) {
    const x = cross(p[i], p[i + 1], p[j], p[j + 1])
    if (!x) continue
    const loop = [x, ...p.slice(i + 1, j + 1), x], rest = [...p.slice(0, i + 1), x, ...p.slice(j + 1)]
    if (len(loop) > .25 * span && len(rest) > .25 * span) found.push({ i, j, x })
  }
  if (found.length !== 1) return [p]
  const { i, j, x } = found[0]
  return [[...p.slice(0, i + 1), x, ...p.slice(j + 1)], [x, ...p.slice(i + 1, j + 1), x]]
}

const sizeWord = (s: number, span: number) => { const r = s / span; return r < .12 ? 'tiny' : r < .3 ? 'small' : r < .6 ? 'medium' : 'large' }
/** Like sideOf, but names diagonals too (ears sit top-left and top-right of a head, not "left" and "top"). */
const side8 = (dx: number, dy: number) => {
  const r = Math.abs(dx) / Math.max(Math.abs(dy), 1e-6)
  return r > .5 && r < 2 ? `${dy > 0 ? 'bottom' : 'top'}-${dx > 0 ? 'right' : 'left'}` : sideOf(dx, dy)
}
const sideOf = (dx: number, dy: number) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'bottom' : 'top'))

/** One line of the description: a shape, or a group of repeated ones (rays). */
export interface SceneItem {
  ids: number[]
  size: string
  kind: string
  /** Position on the page (only for the main shape or a lone shape). */
  where?: string
  /** Relation to another shape, e.g. "attached to the right end of 1". */
  relation?: string
}

export interface Scene {
  strokes: number
  proportion: string
  items: SceneItem[]
  /** Raw geometry per shape (drawing order), for other serialisations such as SVG. */
  shapes: { n: number; closed: boolean; kind: string; cx: number; cy: number; w: number; h: number; ux: number; uy: number; elong: number; pts: [number, number][] }[]
  box: { x0: number; y0: number; w: number; h: number }
}

/** Vectorises the drawing into shapes and relations (the structured form of describeShapes). */
export function analyzeShapes(strokes: readonly number[][], times?: readonly number[][]): Scene | null {
  const raw = strokes.map((s, i) => toPts(s, times?.[i])).filter(s => s.length)
  if (!raw.length) return null
  const all = bbox(raw.flat()), span = Math.max(all.w, all.h, 1)
  const pieces = join(raw, span).flatMap(s => splitLoop(s, span))

  const shapes: Shape[] = pieces.map((pts, k) => {
    const closed = isClosed(pts), b = bbox(pts), P = pca(pts.length > 2 ? pts : [...pts, pts[0]])
    const { kind, dir } = classify(pts, closed, span)
    return {
      n: k + 1, pts, closed, kind, dir, cx: b.x0 + b.w / 2, cy: b.y0 + b.h / 2, w: b.w, h: b.h, size: Math.max(b.w, b.h),
      ux: P.ux, uy: P.uy, half: Math.max(Math.SQRT2 * P.sd1 * 1.2, 1), elong: P.sd1 / Math.max(P.sd2, 1e-3)
    }
  })

  const gap = (a: Shape, b: Shape) => {
    let m = Infinity
    const sa = a.pts.filter((_, i) => i % 2 === 0), sb = b.pts.filter((_, i) => i % 2 === 0)
    for (const p of sa) for (const q of sb) m = Math.min(m, d2(p, q))
    return m
  }
  const nearestPoint = (from: Shape, on: Shape) => {
    let best = on.pts[0], m = Infinity
    for (const p of from.pts) for (const q of on.pts) { const d = d2(p, q); if (d < m) { m = d; best = q } }
    return best
  }
  const endName = (j: Shape, q: Pt) => {
    const dx = q.x - j.cx, dy = q.y - j.cy, t = (dx * j.ux + dy * j.uy) / j.half
    if (j.elong >= 1.6 && Math.abs(t) > .55) return `the ${sideOf(j.ux * Math.sign(t), j.uy * Math.sign(t))} end of`
    return `the ${j.elong < 1.6 ? side8(dx, dy) : sideOf(dx, dy)} side of`
  }

  // Relations, each shape against the others (the biggest relevant one wins).
  const bySize = [...shapes].sort((a, b) => b.w * b.h - a.w * a.h)
  const relation = (s: Shape): { ref: Shape | null; text: string } => {
    const container = bySize.filter(j => j !== s && j.closed && j.size > s.size * 1.2 && inside({ x: s.cx, y: s.cy }, j.pts)).pop()
    if (container) {
      const dx = s.cx - container.cx, dy = s.cy - container.cy, t = (dx * container.ux + dy * container.uy) / container.half
      const where = container.elong >= 1.6 && Math.abs(t) > .35
        ? `near its ${sideOf(container.ux * Math.sign(t), container.uy * Math.sign(t))} end`
        : hyp(dx, dy) < .2 * container.size ? 'in its center' : `in its ${spot({ x: s.cx, y: s.cy }, { x0: container.cx - container.w / 2, y0: container.cy - container.h / 2, w: container.w, h: container.h })} part`
      return { ref: container, text: `inside ${container.n}, ${where}` }
    }
    const touching = bySize.find(j => j !== s && j.size >= s.size * .6 && gap(s, j) < .05 * span)
    if (touching) {
      // Small parts attach to a point (an end or a side); a part about as big as the reference
      // (a roof on a house) is placed by where its centre sits relative to the reference.
      if (s.size < .7 * touching.size) return { ref: touching, text: `attached to ${endName(touching, nearestPoint(s, touching))} ${touching.n}` }
      const dx = (s.cx - touching.cx) / Math.max(touching.w, 1), dy = (s.cy - touching.cy) / Math.max(touching.h, 1)
      return { ref: touching, text: `attached to the ${sideOf(dx, dy)} side of ${touching.n}` }
    }
    const ref = bySize.find(j => j !== s)
    if (!ref) return { ref: null, text: '' }
    const dx = s.cx - ref.cx, dy = s.cy - ref.cy
    const far = hyp(dx, dy) > .6 * span ? 'far ' : ''
    const where = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? `${far}right of` : `${far}left of`) : (dy > 0 ? `${far}below` : `${far}above`)
    return { ref, text: `${where} ${ref.n}` }
  }

  const proportion = elongWord(Math.max(all.w, all.h) / Math.max(Math.min(all.w, all.h), 1)) === 'round' ? 'about as wide as tall' : all.w > all.h ? 'wider than tall' : 'taller than wide'

  // Rays: straight lines outside a shape, each pointing away from its centre.
  const main = bySize[0]
  const rays = new Set(shapes.filter(s => {
    if (s === main || s.dir === undefined || (main.closed && inside({ x: s.cx, y: s.cy }, main.pts))) return false
    let da = Math.abs(Math.atan2(s.cy - main.cy, s.cx - main.cx) - s.dir) % Math.PI
    if (da > Math.PI / 2) da = Math.PI - da
    return da < .45
  }))
  const items: SceneItem[] = []
  const described = new Set<Shape>()
  for (const s of shapes) {
    if (described.has(s)) continue
    if (rays.size >= 4 && rays.has(s)) {
      const group = shapes.filter(r => rays.has(r))
      group.forEach(r => described.add(r))
      items.push({ ids: group.map(r => r.n), size: 'small', kind: `${group.length} short straight lines`, relation: `spread around ${main.n}, each pointing outward from its center like rays` })
      continue
    }
    described.add(s)
    const rel = s === main && shapes.length > 1 ? '' : relation(s).text
    items.push({
      ids: [s.n], size: sizeWord(s.size, span), kind: s.kind,
      ...(shapes.length === 1 || s === main ? { where: spot({ x: s.cx, y: s.cy }, all) } : {}),
      ...(rel ? { relation: rel } : {})
    })
  }
  return {
    strokes: strokes.length, proportion, items, box: all,
    shapes: shapes.map(s => ({ n: s.n, closed: s.closed, kind: s.kind, cx: s.cx, cy: s.cy, w: s.w, h: s.h, ux: s.ux, uy: s.uy, elong: s.elong, pts: s.pts.map(q => [q.x, q.y] as [number, number]) }))
  }
}

export function describeShapes(strokes: readonly number[][], times?: readonly number[][]): string {
  const scene = analyzeShapes(strokes, times)
  if (!scene) return 'Empty page.'
  const n = scene.shapes.length
  const lines = [`Drawing: ${n} shape${n > 1 ? 's' : ''} from ${scene.strokes} stroke${scene.strokes > 1 ? 's' : ''}, ${scene.proportion}. Shapes are numbered in drawing order.`]
  for (const it of scene.items) {
    lines.push(it.ids.length > 1
      ? `${it.ids.join(', ')}. ${it.kind} ${it.relation}.`
      : `${it.ids[0]}. ${it.size} ${it.kind}${it.where ? `, in the ${it.where}` : ''}${it.relation ? `, ${it.relation}` : ''}.`)
  }
  return lines.join('\n')
}
