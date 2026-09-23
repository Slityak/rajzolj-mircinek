// Checks shared/sketch/net.ts (int8 weights) against PyTorch outputs saved by ml/train.py.
import { readFile } from 'node:fs/promises'
import { logits } from '../../shared/sketch/net'

const { x, logits: ref } = JSON.parse(await readFile('data/quickdraw/parity.json', 'utf8')) as { x: number[][]; logits: number[][] }
let same = 0, maxDiff = 0
x.forEach((img, i) => {
  const z = logits(Float32Array.from(img))
  const argmax = (a: ArrayLike<number>) => Array.from(a).indexOf(Math.max(...Array.from(a)))
  if (argmax(z) === argmax(ref[i])) same++
  z.forEach((v, j) => { maxDiff = Math.max(maxDiff, Math.abs(v - ref[i][j])) })
})
console.log(`top-1 agreement ${same}/${x.length}, max logit diff ${maxDiff.toFixed(3)}`)
const t0 = performance.now(); for (let i = 0; i < 200; i++) logits(Float32Array.from(x[i % x.length])); console.log(`${((performance.now() - t0) / 200).toFixed(2)} ms per inference`)
