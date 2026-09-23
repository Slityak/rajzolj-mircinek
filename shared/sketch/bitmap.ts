/**
 * Strokes → SIZE×SIZE grayscale bitmap for the sketch classifier. Used both to build the training
 * set and at inference time, so training and judging see pixel-identical images.
 * The drawing is cropped to its bounding box, scaled to fit (keeping the aspect ratio), centered,
 * and drawn as anti-aliased lines of constant width.
 */
export const SIZE = 28
const PAD = 2, WIDTH = 1.1

export function strokesToBitmap(strokes: readonly number[][], size = SIZE): Float32Array {
  const SIZE = size
  const img = new Float32Array(SIZE * SIZE)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const s of strokes) for (let i = 0; i < s.length; i += 2) {
    minX = Math.min(minX, s[i]); maxX = Math.max(maxX, s[i]); minY = Math.min(minY, s[i + 1]); maxY = Math.max(maxY, s[i + 1])
  }
  if (!isFinite(minX)) return img
  const span = Math.max(maxX - minX, maxY - minY, 1)
  const k = (SIZE - 1 - 2 * PAD) / span
  const ox = (SIZE - 1 - (maxX - minX) * k) / 2, oy = (SIZE - 1 - (maxY - minY) * k) / 2
  const X = (x: number) => (x - minX) * k + ox, Y = (y: number) => (y - minY) * k + oy

  const segment = (x0: number, y0: number, x1: number, y1: number) => {
    const lx = Math.max(0, Math.floor(Math.min(x0, x1) - 2)), hx = Math.min(SIZE - 1, Math.ceil(Math.max(x0, x1) + 2))
    const ly = Math.max(0, Math.floor(Math.min(y0, y1) - 2)), hy = Math.min(SIZE - 1, Math.ceil(Math.max(y0, y1) + 2))
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1e-9
    for (let py = ly; py <= hy; py++) for (let px = lx; px <= hx; px++) {
      const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2))
      const d = Math.hypot(px - x0 - t * dx, py - y0 - t * dy)
      const v = Math.max(0, Math.min(1, WIDTH - d + .5))
      if (v > img[py * SIZE + px]) img[py * SIZE + px] = v
    }
  }
  for (const s of strokes) {
    if (s.length === 2) segment(X(s[0]), Y(s[1]), X(s[0]), Y(s[1]))
    for (let i = 2; i < s.length; i += 2) segment(X(s[i - 2]), Y(s[i - 1]), X(s[i]), Y(s[i + 1]))
  }
  return img
}
