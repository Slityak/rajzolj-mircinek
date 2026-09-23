/**
 * Jev is a text model, and ASCII art turned out to be unreadable for it. So the doodle is described
 * in words instead: one line per stroke (shape, size, position, corners), followed by the
 * relations to the main shape (inside it, rays pointing outward, attached on top…).
 * Input strokes are flat [x0, y0, x1, y1, …] arrays, as in JudgeRequest.
 */
type P = [number, number]

interface StrokeInfo {
  pts: P[]
  len: number
  cx: number; cy: number
  w: number; h: number
  closed: boolean
  corners: Corner[]
  shape: string
  /** Straight line direction in radians, if the stroke is (nearly) straight. */
  dir?: number
}

const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1])

function toPoints(flat: readonly number[]): P[] {
  const pts: P[] = []
  for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]])
  return pts
}

function pathLength(pts: P[]) {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += dist(pts[i], pts[i - 1])
  return len
}

/** Evenly resamples a polyline to n points. */
function resample(pts: P[], n: number): P[] {
  const len = pathLength(pts)
  if (pts.length < 2 || len === 0) return pts.slice()
  const step = len / (n - 1), out: P[] = [pts[0]]
  let acc = 0
  for (let i = 1; i < pts.length && out.length < n; i++) {
    let a = pts[i - 1]; const b = pts[i]
    let d = dist(a, b)
    while (acc + d >= step && out.length < n) {
      const t = (step - acc) / d
      a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
      out.push(a); d = dist(a, b); acc = 0
    }
    acc += d
  }
  while (out.length < n) out.push(pts[pts.length - 1])
  return out
}

/** Moving average that removes hand jitter, so wobbles don't count as corners. */
function smooth(rs: P[], closed: boolean): P[] {
  const n = rs.length
  return rs.map((p, i) => {
    if (!closed && (i === 0 || i === n - 1)) return p
    let x = 0, y = 0, c = 0
    for (let d = -2; d <= 2; d++) {
      const j = closed ? (i + d + n) % n : Math.max(0, Math.min(n - 1, i + d))
      x += rs[j][0]; y += rs[j][1]; c++
    }
    return [x / c, y / c] as P
  })
}

/** `turn` is the unsigned turning angle; `sign` its direction (+1 left, −1 right in screen space). */
interface Corner { p: P; turn: number; i: number; sign: number }

/** Sharp turns along the stroke (for closed strokes the seam counts too). */
function findCorners(raw: P[], closed: boolean): Corner[] {
  const rs = smooth(raw, closed)
  const n = rs.length, k = 3, out: Corner[] = []
  const at = (i: number) => rs[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))]
  let last = -99
  const from = closed ? 0 : k, to = closed ? n - 1 : n - k
  for (let i = from; i < to; i++) {
    const a = at(i - k), b = at(i), c = at(i + k)
    const a1 = Math.atan2(b[1] - a[1], b[0] - a[0]), a2 = Math.atan2(c[1] - b[1], c[0] - b[0])
    let d = a2 - a1
    while (d > Math.PI) d -= 2 * Math.PI
    while (d < -Math.PI) d += 2 * Math.PI
    const da = Math.abs(d), sign = Math.sign(d)
    if (da > .9 && i - last > k) { out.push({ p: raw[i], turn: da, i, sign }); last = i }
    else if (da > .9 && out.length && i - last <= k && da > out[out.length - 1].turn) { out[out.length - 1] = { p: raw[i], turn: da, i, sign }; last = i }
  }
  return out
}

function signedArea(pts: P[]) {
  let a = 0
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1] }
  return a / 2
}
const polygonArea = (pts: P[]) => Math.abs(signedArea(pts))

function convexHull(pts: P[]): P[] {
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo: P[] = [], up: P[] = []
  for (const p of s) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p) }
  for (const p of s.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p) }
  return lo.slice(0, -1).concat(up.slice(0, -1))
}

function distToSegment(p: P, a: P, b: P) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}

/**
 * Inward dents of a closed outline: runs of points lying clearly inside the convex hull.
 * Depth-based, so shallow hand-drawn dips (the top of a heart) count as well as sharp ones.
 */
function findNotches(poly: P[], size: number): { p: P; depth: number }[] {
  // Absolute floor (in judge-grid units) so hand wobble on tiny shapes doesn't read as dents.
  const minDepth = Math.max(.06 * size, 7)
  const hull = convexHull(poly)
  const depth = poly.map(p => Math.min(...hull.map((h, i) => distToSegment(p, h, hull[(i + 1) % hull.length]))))
  const out: { p: P; depth: number }[] = []
  const n = poly.length
  // Start scanning at a point on the hull so no dent is split across the seam.
  const start = depth.indexOf(Math.min(...depth))
  let best: { p: P; depth: number } | null = null
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n
    if (depth[i] > .03 * size) { if (!best || depth[i] > best.depth) best = { p: poly[i], depth: depth[i] } }
    else if (best) { if (best.depth > minDepth) out.push(best); best = null }
  }
  return out
}

/** True if the pieces between consecutive corners are (nearly) straight. */
function straightSegments(rs: P[], corners: Corner[]) {
  const cut = [0, ...corners.map(c => c.i), rs.length - 1]
  for (let i = 1; i < cut.length; i++) {
    const seg = rs.slice(cut[i - 1], cut[i] + 1)
    if (seg.length > 2 && dist(seg[0], seg[seg.length - 1]) / pathLength(seg) < .85) return false
  }
  return true
}

const aspectWord = (w: number, h: number) => {
  const r = w / Math.max(h, 1)
  return r > 2.2 ? 'very wide' : r > 1.3 ? 'wide' : r < 1 / 2.2 ? 'very tall' : r < 1 / 1.3 ? 'tall' : ''
}

function where(x: number, y: number, box: { x0: number; y0: number; w: number; h: number }) {
  const fx = (x - box.x0) / Math.max(box.w, 1), fy = (y - box.y0) / Math.max(box.h, 1)
  const v = fy < .33 ? 'top' : fy > .67 ? 'bottom' : '', hz = fx < .33 ? 'left' : fx > .67 ? 'right' : ''
  return v && hz ? `${v}-${hz}` : v || hz || 'center'
}

/** True if two points sit at opposite ends of the box (left/right or top/bottom). */
function opposite(a: P, b: P, box: { x0: number; y0: number; w: number; h: number }) {
  const fx = (p: P) => (p[0] - box.x0) / Math.max(box.w, 1), fy = (p: P) => (p[1] - box.y0) / Math.max(box.h, 1)
  return Math.abs(fx(a) - fx(b)) > .7 || Math.abs(fy(a) - fy(b)) > .7
}

function analyse(flat: readonly number[]): StrokeInfo {
  const pts = toPoints(flat)
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0
  const len = pathLength(pts), size = Math.max(w, h, 1)
  const info: StrokeInfo = { pts, len, cx: x0 + w / 2, cy: y0 + h / 2, w, h, closed: false, corners: [], shape: '' }
  if (len < 6 || size < 12) { info.shape = 'dot'; return info }

  const chord = dist(pts[0], pts[pts.length - 1])
  info.closed = isClosed(pts)
  const rs = resample(pts, 64)
  info.corners = findCorners(info.closed ? rs.slice(0, -1) : rs, info.closed)
  const nc = info.corners.length
  const box = { x0, y0, w, h }
  const cornerSpots = () => nc ? `, sharp corners at ${[...new Set(info.corners.map(c => where(c.p[0], c.p[1], box)))].join(', ')}` : ''

  if (!info.closed) {
    if (chord / len > .9) {
      info.dir = Math.atan2(pts[pts.length - 1][1] - pts[0][1], pts[pts.length - 1][0] - pts[0][0])
      const deg = Math.abs(((info.dir * 180 / Math.PI) + 180) % 180)
      info.shape = `straight line (${deg < 20 || deg > 160 ? 'horizontal' : deg > 70 && deg < 110 ? 'vertical' : 'diagonal'})`
    } else if (nc >= 1 && nc <= 3 && straightSegments(rs, info.corners)) {
      const c = info.corners[0].p
      info.shape = nc === 1
        ? `two straight segments meeting at a sharp angle, the tip at the ${where(c[0], c[1], box)} (like ${where(c[0], c[1], box).startsWith('top') ? 'a ^ or roof' : 'a V or corner'})`
        : `${nc + 1} straight segments forming an open polygon${cornerSpots()}, open at the ${where((pts[0][0] + pts[pts.length - 1][0]) / 2, (pts[0][1] + pts[pts.length - 1][1]) / 2, box)}`
    } else if (nc >= 4) info.shape = `zigzag line with ${nc} sharp turns`
    else if (chord / len < .45) info.shape = `open loop / hook-shaped curve${cornerSpots()}`
    else info.shape = `curved line${nc ? ` with ${nc} sharp turn${nc > 1 ? 's' : ''}` : ''}`
    return info
  }

  const poly = rs.slice(0, -1)
  const solidity = polygonArea(poly) / Math.max(polygonArea(convexHull(poly)), 1)
  let mx = 0, my = 0
  for (const p of poly) { mx += p[0]; my += p[1] }
  mx /= poly.length; my /= poly.length
  const rr = poly.map(p => Math.hypot(p[0] - mx, p[1] - my))
  const mr = rr.reduce((a, c) => a + c, 0) / rr.length
  const cv = Math.sqrt(rr.reduce((a, c) => a + (c - mr) ** 2, 0) / rr.length) / Math.max(mr, 1)
  const asp = aspectWord(w, h)
  // Area vs. bounding box: rectangle ≈ .9, circle/oval ≈ .79, triangle ≈ .5. Robust to a missed corner.
  const fill = polygonArea(poly) / Math.max(w * h, 1)

  // Corners turning with the outline's direction are convex points; dents come from the hull.
  const orient = Math.sign(signedArea(poly))
  const points = info.corners.filter(c => c.sign === orient)
  const notches = findNotches(poly, size)
  const isAt = (c: { p: P }, spot: string) => where(c.p[0], c.p[1], box) === spot
  const spiky = info.corners.filter(c => c.turn > 1.9).length
  // A star alternates points and dents; hand-drawn tips are often blunt, so the dents count too.
  if (notches.length >= 4 || spiky >= 4) info.shape = `star shape with ${notches.length >= 4 && notches.length <= 6 ? notches.length : 'several'} pointed spikes`
  else if (nc >= 7 && solidity < .75) info.shape = `star-like closed shape with about ${Math.round(nc / 2)} spikes`
  else if (notches.some(c => isAt(c, 'top')) && notches.length <= 2 && (points.some(c => isAt(c, 'bottom')) || nc <= 2))
    info.shape = 'closed rounded shape with a notch dipping in at the top center and a point at the bottom center, two round bulges on top'
  else if (solidity < .72 && nc >= 2) info.shape = `concave closed shape (crescent or kidney-like, a bite taken out of one side)${cornerSpots()}`
  else if (nc <= 2 && solidity > .85 && (asp === 'very wide' || asp === 'very tall'))
    info.shape = `long narrow rounded capsule/sausage shape (${asp})`
  else if (nc === 2 && solidity > .85 && opposite(info.corners[0].p, info.corners[1].p, box))
    info.shape = `pointed oval (lens or leaf shape${asp ? `, ${asp}` : ''}), pointed at the ${where(info.corners[0].p[0], info.corners[0].p[1], box)} and ${where(info.corners[1].p[0], info.corners[1].p[1], box)} ends`
  else if (fill > .86 && solidity > .9) info.shape = asp ? `rectangle (${asp})` : 'square'
  else if (fill < .56 && solidity > .85 && nc >= 2 && nc <= 4) info.shape = `triangle${asp ? ` (${asp})` : ''}`
  else if (nc === 3 && fill < .7) info.shape = `triangle${asp ? ` (${asp})` : ''}`
  else if (nc === 4 && solidity > .85 && fill > .75) info.shape = asp ? `rectangle (${asp})` : 'square'
  else if (nc <= 1 && cv < .12 && !asp) info.shape = 'circle'
  else if (nc <= 1 && (asp === 'very wide' || asp === 'very tall')) info.shape = `long narrow rounded capsule/sausage shape (${asp})`
  else if (nc <= 1) info.shape = `oval${asp ? ` (${asp})` : ''}`
  else info.shape = `closed rounded shape${asp ? ` (${asp})` : ''}${cornerSpots()}${notches.length ? `, inward notches at ${[...new Set(notches.map(c => where(c.p[0], c.p[1], box)))].join(', ')}` : ''}`
  return info
}

/**
 * Joins open strokes whose ends (nearly) touch: people lift the pen mid-outline, and a star drawn in
 * two pieces should still be described as one star. Closed shapes are left alone, so a roof touching
 * a wall stays a separate roof.
 */
function joinStrokes(strokes: readonly number[][]): number[][] {
  const S = strokes.map(s => toPoints(s))
  const all = S.flat()
  const span = Math.max(Math.max(...all.map(p => p[0])) - Math.min(...all.map(p => p[0])), Math.max(...all.map(p => p[1])) - Math.min(...all.map(p => p[1])), 1)
  const gap = .07 * span
  for (let merged = true; merged;) {
    merged = false
    outer: for (let i = 0; i < S.length; i++) for (let j = 0; j < S.length; j++) {
      if (i === j || S[i].length < 2 || S[j].length < 2 || isClosed(S[i]) || isClosed(S[j])) continue
      const a = S[i], b = S[j]
      // Try a's end against both ends of b.
      if (dist(a[a.length - 1], b[0]) < gap) S[i] = a.concat(b)
      else if (dist(a[a.length - 1], b[b.length - 1]) < gap) S[i] = a.concat([...b].reverse())
      else continue
      S.splice(j, 1); merged = true; break outer
    }
  }
  return S.map(s => s.flat())
}

function isClosed(pts: P[]) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1)
  return dist(pts[0], pts[pts.length - 1]) < .22 * size && pathLength(pts) > 2.2 * size
}

function segmentCrossing(a: P, b: P, c: P, d: P): P | null {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]]
  const den = r[0] * s[1] - r[1] * s[0]
  if (Math.abs(den) < 1e-9) return null
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den
  return t > 0 && t < 1 && u > 0 && u < 1 ? [a[0] + t * r[0], a[1] + t * r[1]] : null
}

/**
 * Cuts the loops out of a stroke that crosses itself. A fish drawn in one line (body and tail
 * joined by a crossing) becomes an oval plus a triangle touching it, which the rest of the
 * description handles like two separate strokes. Tiny loops (pen wobble) are ignored.
 */
function splitLoops(stroke: number[], span: number): number[][] {
  let rest = toPoints(stroke)
  const loops: P[][] = []
  // Only a single crossing whose both sides are substantial: a star crosses itself five times and
  // must stay a star, and the overlap where a closed outline meets its start is not a second loop.
  const crossings: { i: number; j: number; x: P }[] = []
  for (let i = 0; i < rest.length - 1; i++) for (let j = i + 2; j < rest.length - 1; j++) {
    const x = segmentCrossing(rest[i], rest[i + 1], rest[j], rest[j + 1])
    if (!x) continue
    const loop = [x, ...rest.slice(i + 1, j + 1), x], outer = [...rest.slice(0, i + 1), x, ...rest.slice(j + 1)]
    if (pathLength(loop) > .25 * span && pathLength(outer) > .25 * span) crossings.push({ i, j, x })
  }
  if (crossings.length === 1) {
    const { i, j, x } = crossings[0]
    loops.push([x, ...rest.slice(i + 1, j + 1), x])
    rest = [...rest.slice(0, i + 1), x, ...rest.slice(j + 1)]
  }
  return [rest, ...loops].filter(s => s.length > 1).map(s => s.flat())
}

export function describeDoodle(strokes: readonly number[][]): string {
  const joined = joinStrokes(strokes)
  const all = joined.flat()
  const span = Math.max(1, ...[0, 1].map(o => { const v = all.filter((_, k) => k % 2 === o); return Math.max(...v) - Math.min(...v) }))
  const S = joined.flatMap(s => splitLoops(s, span)).map(analyse)
  if (!S.length) return 'Empty page.'
  const xs = S.flatMap(s => s.pts.map(p => p[0])), ys = S.flatMap(s => s.pts.map(p => p[1]))
  const box = { x0: Math.min(...xs), y0: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  const D = Math.max(box.w, box.h, 1)
  const sizeWord = (s: StrokeInfo) => { const r = Math.max(s.w, s.h) / D; return r > .6 ? 'large' : r > .3 ? 'medium' : 'small' }

  // The main shape: the biggest closed stroke, else the longest stroke.
  const main = [...S].sort((a, b) => (+b.closed - +a.closed) || (b.w * b.h - a.w * a.h))[0]
  const lines = [`${S.length} stroke${S.length > 1 ? 's' : ''}; the whole drawing is ${aspectWord(box.w, box.h) || 'about as wide as tall'}.`]
  lines.push(`Main shape: ${sizeWord(main)} ${main.shape}, at the ${where(main.cx, main.cy, box)} of the drawing.`)

  const radial = new Set(S.filter(s => {
    if (s === main || s.dir === undefined) return false
    let da = Math.abs(Math.atan2(s.cy - main.cy, s.cx - main.cx) - s.dir) % Math.PI
    if (da > Math.PI / 2) da = Math.PI - da
    return da < .45
  }))

  const rel = (s: StrokeInfo): string => {
    const inside = main.closed && s.cx > main.cx - main.w / 2 && s.cx < main.cx + main.w / 2 && s.cy > main.cy - main.h / 2 && s.cy < main.cy + main.h / 2
    if (inside) {
      // Tells clock hands (starting at the center) from seams or stripes (running across).
      const ends = [s.pts[0], s.pts[s.pts.length - 1]]
      const fromCenter = ends.some(p => Math.hypot(p[0] - main.cx, p[1] - main.cy) < .15 * Math.max(main.w, main.h))
      const across = Math.max(s.w, s.h) > .6 * Math.max(main.w, main.h)
      return `inside the main shape${fromCenter ? ', starting from its center' : across ? ', running across it from edge to edge' : ''}`
    }
    const dx = s.cx - main.cx, dy = s.cy - main.cy
    if (radial.has(s) && radial.size >= 4) return 'outside the main shape, pointing outward from its center like a ray'
    const side = Math.abs(dx) / Math.max(main.w, 1) > Math.abs(dy) / Math.max(main.h, 1)
      ? (dx > 0 ? 'right of' : 'left of') : (dy > 0 ? 'below' : 'on top of')
    const gap = Math.max(Math.abs(dx) - (main.w + s.w) / 2, Math.abs(dy) - (main.h + s.h) / 2)
    return `${side} the main shape${gap < .05 * D ? ', touching it' : ''}`
  }

  const counts = new Map<string, number>()
  for (const s of S) if (s !== main) { const k = `${sizeWord(s)} ${s.shape}, ${rel(s)}`; counts.set(k, (counts.get(k) ?? 0) + 1) }
  for (const [k, n] of counts) lines.push(`${n > 1 ? `${n} × ` : ''}${k}.`)
  return lines.join('\n')
}
