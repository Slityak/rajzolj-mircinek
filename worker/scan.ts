/**
 * "Scanline" reading of the rasterised drawing, used as extra evidence for the feature observer
 * (on its own Jev could not use it: 0% of rounds won). Reports, in fixed words:
 * - horizontal and vertical bands: how many separate ink parts cross each band and how wide it is
 * - enclosed areas (holes) with size and position
 * - how often circles around the centre cross ink (many crossings on an outer ring = rays, legs, petals)
 * - left/right and top/bottom symmetry
 */
import { strokesToBitmap } from '../shared/sketch/bitmap'

const N = 32, BANDS = 6

const pos3 = (fx: number, fy: number) => {
  const v = fy < .33 ? 'top' : fy > .67 ? 'bottom' : '', h = fx < .33 ? 'left' : fx > .67 ? 'right' : ''
  return v && h ? `${v}-${h}` : v || h || 'center'
}
const count = (n: number, one: string, many: string) => `${n === 0 ? 'no' : n === 1 ? 'one' : n === 2 ? 'two' : n === 3 ? 'three' : n === 4 ? 'four' : n} ${n === 1 ? one : many}`

/** Runs of ink in a 1D profile: [start, end] pairs. */
function runs(line: boolean[]): [number, number][] {
  const out: [number, number][] = []
  let s = -1
  line.forEach((v, i) => { if (v && s < 0) s = i; if (!v && s >= 0) { out.push([s, i - 1]); s = -1 } })
  if (s >= 0) out.push([s, line.length - 1])
  return out
}

export function scanDoodle(strokes: readonly number[][]): string {
  const img = strokesToBitmap(strokes, N)
  const ink = (x: number, y: number) => img[y * N + x] > .35
  let x0 = N, y0 = N, x1 = -1, y1 = -1
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (ink(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  if (x1 < 0) return 'Empty page.'
  const w = x1 - x0 + 1, h = y1 - y0 + 1
  const lines: string[] = [`The drawing is ${w > h * 1.3 ? 'wider than tall' : h > w * 1.3 ? 'taller than wide' : 'about as wide as tall'}.`]

  // Bands: OR the rows (or columns) of each band into one profile, then count separate parts.
  const band = (horizontal: boolean, i: number) => {
    const lo = horizontal ? y0 + Math.floor(i * h / BANDS) : x0 + Math.floor(i * w / BANDS)
    const hi = horizontal ? y0 + Math.floor((i + 1) * h / BANDS) - 1 : x0 + Math.floor((i + 1) * w / BANDS) - 1
    const prof: boolean[] = []
    const across = horizontal ? [x0, x1] : [y0, y1]
    for (let a = across[0]; a <= across[1]; a++) {
      let any = false
      for (let b = lo; b <= Math.max(lo, hi); b++) if (horizontal ? ink(a, b) : ink(b, a)) any = true
      prof.push(any)
    }
    return runs(prof)
  }
  const describeBand = (r: [number, number][], span: number, names: [string, string]) => {
    if (!r.length) return 'empty'
    const extent = (r[r.length - 1][1] - r[0][0] + 1) / span
    const width = extent > .8 ? 'spanning almost all the way across' : extent > .5 ? 'spanning about half the width' : extent > .25 ? 'narrow' : 'very narrow'
    const where = r.length === 1 ? (() => { const c = (r[0][0] + r[0][1]) / 2 / span; return c < .35 ? `, at the ${names[0]}` : c > .65 ? `, at the ${names[1]}` : ', in the middle' })() : ''
    return `${count(r.length, 'part', 'separate parts')}, ${width}${where}`
  }
  const rowNames = ['top', 'upper', 'upper middle', 'lower middle', 'lower', 'bottom']
  lines.push('Scanning from top to bottom:')
  for (let i = 0; i < BANDS; i++) lines.push(`- ${rowNames[i]} band: ${describeBand(band(true, i), w, ['left', 'right'])}`)
  const colNames = ['far left', 'left', 'left of center', 'right of center', 'right', 'far right']
  lines.push('Scanning from left to right:')
  for (let i = 0; i < BANDS; i++) lines.push(`- ${colNames[i]} band: ${describeBand(band(false, i), h, ['top', 'bottom'])}`)

  // Enclosed areas: blank regions not reachable from the border.
  const seen = new Uint8Array(N * N)
  const fill = (sx: number, sy: number) => {
    const stack = [[sx, sy]]; let n = 0, cx = 0, cy = 0, touches = false
    seen[sy * N + sx] = 1
    while (stack.length) {
      const [x, y] = stack.pop()!; n++; cx += x; cy += y
      if (x === 0 || y === 0 || x === N - 1 || y === N - 1) touches = true
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy
        if (X < 0 || Y < 0 || X >= N || Y >= N || seen[Y * N + X] || ink(X, Y)) continue
        seen[Y * N + X] = 1; stack.push([X, Y])
      }
    }
    return { n, cx: cx / n, cy: cy / n, touches }
  }
  const holes: { n: number; cx: number; cy: number }[] = []
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!seen[y * N + x] && !ink(x, y)) { const r = fill(x, y); if (!r.touches && r.n >= 3) holes.push(r) }
  holes.sort((a, b) => b.n - a.n)
  const area = w * h
  lines.push(holes.length
    ? `Enclosed areas: ${holes.length}. ` + holes.slice(0, 5).map(o => `${o.n > area * .3 ? 'large' : o.n > area * .08 ? 'medium' : 'small'} one at the ${pos3((o.cx - x0) / w, (o.cy - y0) / h)}`).join('; ') + '.'
    : 'Enclosed areas: none (no closed outline).')

  // Rings around the ink's centre: many crossings on the outer ring = things sticking out all around.
  let mx = 0, my = 0, m = 0
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (ink(x, y)) { mx += x; my += y; m++ }
  mx /= m; my /= m
  const R = Math.max(w, h) / 2
  const ring = (f: number) => {
    const prof: boolean[] = []
    for (let a = 0; a < 96; a++) {
      const x = Math.round(mx + Math.cos(a / 96 * 2 * Math.PI) * R * f), y = Math.round(my + Math.sin(a / 96 * 2 * Math.PI) * R * f)
      prof.push(x >= 0 && y >= 0 && x < N && y < N && ink(x, y))
    }
    let r = runs(prof).length
    if (prof[0] && prof[prof.length - 1] && r > 1) r-- // wrap-around
    return r
  }
  lines.push(`Circles around the center cross the ink: ${ring(.35)} times close in, ${ring(.6)} times halfway out, ${ring(.85)} times near the edge.`)

  // Symmetry: mirrored overlap of ink.
  const sym = (mirror: (x: number, y: number) => [number, number]) => {
    let both = 0, any = 0
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const [X, Y] = mirror(x, y), a = ink(x, y), b = X >= 0 && Y >= 0 && X < N && Y < N && ink(X, Y)
      if (a || b) any++; if (a && b) both++
    }
    return both / Math.max(any, 1)
  }
  const lr = sym((x, y) => [x0 + x1 - x, y]), tb = sym((x, y) => [x, y0 + y1 - y])
  const word = (v: number) => (v > .55 ? 'strongly' : v > .35 ? 'somewhat' : 'not')
  lines.push(`Left-right symmetry: ${word(lr)} symmetric. Top-bottom symmetry: ${word(tb)} symmetric.`)
  return lines.join('\n')
}
