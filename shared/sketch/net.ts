/**
 * Dependency-free inference for the tiny sketch classifier trained by ml/train.py
 * (conv 16 → conv 32 → conv 64, each 3×3 + ReLU + 2×2 max-pool, then dense 128 → classes).
 * Runs in the Worker in well under a millisecond per drawing.
 */
import { MODEL } from './model.gen'
import { SIZE, strokesToBitmap } from './bitmap'

type Tensor = { data: Float32Array; shape: readonly number[] }

function decode(): Record<string, Tensor> {
  const out: Record<string, Tensor> = {}
  for (const l of MODEL.layers) {
    const bytes = Uint8Array.from(atob(l.data), c => c.charCodeAt(0))
    const q = new Int8Array(bytes.buffer)
    out[l.name] = { data: Float32Array.from(q, v => v * l.scale), shape: l.shape }
  }
  return out
}

let W: Record<string, Tensor> | null = null

/** 3×3 convolution with padding 1, input and output in CHW layout. */
function conv(x: Float32Array, c: number, h: number, w: number, k: Tensor, b: Tensor): Float32Array {
  const o = k.shape[0], out = new Float32Array(o * h * w)
  for (let oc = 0; oc < o; oc++) {
    const bias = b.data[oc]
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
      let s = bias
      for (let ic = 0; ic < c; ic++) {
        const kb = ((oc * c + ic) * 3) * 3, xb = ic * h * w
        for (let ky = 0; ky < 3; ky++) {
          const yy = y + ky - 1
          if (yy < 0 || yy >= h) continue
          for (let kx = 0; kx < 3; kx++) {
            const xk = xx + kx - 1
            if (xk < 0 || xk >= w) continue
            s += k.data[kb + ky * 3 + kx] * x[xb + yy * w + xk]
          }
        }
      }
      out[(oc * h + y) * w + xx] = s > 0 ? s : 0 // ReLU
    }
  }
  return out
}

function pool(x: Float32Array, c: number, h: number, w: number): Float32Array {
  const h2 = h >> 1, w2 = w >> 1, out = new Float32Array(c * h2 * w2)
  for (let ch = 0; ch < c; ch++) for (let y = 0; y < h2; y++) for (let xx = 0; xx < w2; xx++) {
    const b = ch * h * w + 2 * y * w + 2 * xx
    out[(ch * h2 + y) * w2 + xx] = Math.max(x[b], x[b + 1], x[b + w], x[b + w + 1])
  }
  return out
}

function dense(x: Float32Array, k: Tensor, b: Tensor, relu: boolean): Float32Array {
  const [o, n] = k.shape, out = new Float32Array(o)
  for (let i = 0; i < o; i++) {
    let s = b.data[i]
    for (let j = 0; j < n; j++) s += k.data[i * n + j] * x[j]
    out[i] = relu && s < 0 ? 0 : s
  }
  return out
}

/** Raw class scores for a SIZE×SIZE bitmap (exported for the parity check). */
export function logits(img: Float32Array): Float32Array {
  W ??= decode()
  let x = pool(conv(img, 1, SIZE, SIZE, W['c1.weight'], W['c1.bias']), 16, 28, 28)
  x = pool(conv(x, 16, 14, 14, W['c2.weight'], W['c2.bias']), 32, 14, 14)
  x = pool(conv(x, 32, 7, 7, W['c3.weight'], W['c3.bias']), 64, 7, 7)
  x = dense(x, W['f1.weight'], W['f1.bias'], true)
  return dense(x, W['f2.weight'], W['f2.bias'], false)
}

export type SketchClass = typeof MODEL.classes[number]

/** Top-k classes with softmax probabilities for a drawing (strokes in the judge format). */
export function classify(strokes: readonly number[][], k = 5): { key: SketchClass; p: number }[] {
  const z = logits(strokesToBitmap(strokes))
  const m = Math.max(...z), e = Array.from(z, v => Math.exp(v - m)), sum = e.reduce((a, b) => a + b, 0)
  return e.map((v, i) => ({ key: MODEL.classes[i], p: v / sum })).sort((a, b) => b.p - a.p).slice(0, k)
}
