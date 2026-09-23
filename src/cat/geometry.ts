/**
 * Mirci's geometry in the 260×290 viewBox. The SVG subcomponents and the hit zones
 * work from the same source, so when a shape is redrawn the clickable area follows it.
 */
export type Side = 'L' | 'R'
export interface Pt { x: number; y: number }

export const VIEWBOX = { w: 260, h: 290 } as const
/** Body's "footpoint" – origin for jumping, crouching, wiggling */
export const GROUND: Pt = { x: 130, y: 270 }
/** Head's pivot point (neck) */
export const NECK: Pt = { x: 130, y: 160 }
export const EYE_Y = 108

export const HEAD = { cx: 130, cy: 112, rx: 60, ry: 54 }
export const BODY = { cx: 130, cy: 208, rx: 58, ry: 54 }
export const NOSE: Pt = { x: 130, y: 131 }

export const EAR: Record<Side, { tri: [Pt, Pt, Pt]; inner: string; pivot: Pt }> = {
  L: { tri: [{ x: 72, y: 100 }, { x: 84, y: 30 }, { x: 122, y: 64 }], inner: 'M85 80 89 47 108 64Z', pivot: { x: 102, y: 90 } },
  R: { tri: [{ x: 188, y: 100 }, { x: 176, y: 30 }, { x: 138, y: 64 }], inner: 'M175 80 171 47 152 64Z', pivot: { x: 158, y: 90 } }
}

export const EYE: Record<Side, { cx: number; lidSad: string; lidSadLine: string; lidFlat: string; lidFlatLine: string; happy: string; closed: string }> = {
  L: {
    cx: 107,
    lidSad: 'M92 90h30v13q-15-3-30 5z', lidSadLine: 'M94 107q13-7 26-4',
    lidFlat: 'M92 90h30v16H92z', lidFlatLine: 'M94 106h26',
    happy: 'M96 111q11-13 22 0', closed: 'M96 106q11 11 22 0'
  },
  R: {
    cx: 153,
    lidSad: 'M138 90h30v18q-15-8-30-5z', lidSadLine: 'M140 103q13-3 26 4',
    lidFlat: 'M138 90h30v16h-30z', lidFlatLine: 'M140 106h26',
    happy: 'M142 111q11-13 22 0', closed: 'M142 106q11 11 22 0'
  }
}

export const PAW: Record<Side, { cx: number; cy: number; rx: number; ry: number }> = {
  L: { cx: 104, cy: 258, rx: 23, ry: 12 },
  R: { cx: 156, cy: 258, rx: 23, ry: 12 }
}

export const WHISKER: Record<Side, { d: string; pivot: Pt }> = {
  L: { d: 'M106 134 68 128M106 139l-40 1M108 144l-38 7', pivot: { x: 106, y: 139 } },
  R: { d: 'M154 134l38-6M154 139l40 1M152 144l38 7', pivot: { x: 154, y: 139 } }
}

/** Heart-eye path around the given center point. */
export const heartPath = (cx: number, cy = EYE_Y) =>
  `M${cx} ${cy + 12}C${cx - 17} ${cy + 2} ${cx - 13} ${cy - 13} ${cx - 6} ${cy - 12}C${cx - 3} ${cy - 12} ${cx} ${cy - 9} ${cx} ${cy - 7}` +
  `C${cx} ${cy - 9} ${cx + 3} ${cy - 12} ${cx + 6} ${cy - 12}C${cx + 13} ${cy - 13} ${cx + 17} ${cy + 2} ${cx} ${cy + 12}Z`

export const TAIL = { origin: { x: 178, y: 242 }, angle: .15, segments: 8, segLen: 13.5, hitRadius: 16 }

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const rand = (a: number, b: number) => a + Math.random() * (b - a)

export function inTri(p: Pt, a: Pt, b: Pt, c: Pt): boolean {
  const s = (p1: Pt, p2: Pt, p3: Pt) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y)
  const d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a)
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))
}

export const inEll = (p: Pt, e: { cx: number; cy: number; rx: number; ry: number }) =>
  ((p.x - e.cx) / e.rx) ** 2 + ((p.y - e.cy) / e.ry) ** 2 < 1
