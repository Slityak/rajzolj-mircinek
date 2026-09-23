// Streams the first recognised drawings of each mapped Quick, Draw! category (only the beginning
// of each large ndjson file is downloaded) and writes disjoint train/eval splits to data/quickdraw/.
// Strokes are stored in the judge format: flat [x0, y0, x1, y1, …] on the 0–255 grid.
import { mkdir, writeFile } from 'node:fs/promises'
import { QD_CATEGORIES } from './categories.mts'

const TRAIN = Number(process.env.TRAIN ?? 4000), EVAL = Number(process.env.EVAL ?? 100)
const BASE = 'https://storage.googleapis.com/quickdraw_dataset/full/simplified/'
await mkdir('data/quickdraw', { recursive: true })

async function take(name: string, n: number): Promise<number[][][]> {
  const res = await fetch(BASE + encodeURIComponent(name) + '.ndjson')
  if (!res.ok || !res.body) throw new Error(`${name}: HTTP ${res.status}`)
  const out: number[][][] = [], dec = new TextDecoder()
  let buf = ''
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true })
    let nl
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl); buf = buf.slice(nl + 1)
      const d = JSON.parse(line) as { recognized: boolean; drawing: [number[], number[]][] }
      if (!d.recognized) continue
      out.push(d.drawing.map(([xs, ys]) => xs.flatMap((x, i) => [x, ys[i]])))
      if (out.length >= n) return out // leaving the loop cancels the rest of the download
    }
  }
  return out
}

for (const [key, names] of Object.entries(QD_CATEGORIES)) {
  const per = Math.ceil((TRAIN + EVAL) / names!.length)
  const parts = await Promise.all(names!.map(n => take(n, per)))
  // Interleave the source categories so both splits contain all of them.
  const all: number[][][] = []
  for (let i = 0; i < per; i++) for (const p of parts) if (p[i]) all.push(p[i])
  const lines = (a: number[][][]) => a.map(s => JSON.stringify(s)).join('\n') + '\n'
  await writeFile(`data/quickdraw/${key}.train.ndjson`, lines(all.slice(0, TRAIN)))
  await writeFile(`data/quickdraw/${key}.eval.ndjson`, lines(all.slice(TRAIN, TRAIN + EVAL)))
  console.log(key.padEnd(10), names!.join(', '), `→ ${Math.min(all.length, TRAIN)} train, ${Math.max(0, Math.min(EVAL, all.length - TRAIN))} eval`)
}
