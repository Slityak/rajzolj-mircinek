// Timestamped test set from the *raw* Quick, Draw! files, for encodings that use drawing speed.
// Raw files are in the same order as the simplified ones, so the first SKIP recognised drawings per
// category (the classifier's training data) are skipped to keep the test set disjoint.
// Output: data/quickdraw/<key>.raw.ndjson, one {strokes, times} per line, in the /api/judge format:
// the drawing centred on the 256 grid like a player's, points ≥ 2 units apart, times in ms from start.
import { writeFile } from 'node:fs/promises'
import { QD_CATEGORIES } from './categories.mts'

// SPLIT=test (default) is the held-out test set; SPLIT=dev is a separate set for tuning, taken after it.
const SPLIT = process.env.SPLIT ?? 'test'
const N = Number(process.env.N ?? 60), SKIP = Number(process.env.SKIP ?? (SPLIT === 'dev' ? 4300 : 4200))
const BASE = 'https://storage.googleapis.com/quickdraw_dataset/full/raw/'

type Raw = { recognized: boolean; drawing: [number[], number[], number[]][] }

function toJudge(d: Raw['drawing']) {
  const xs = d.flatMap(s => s[0]), ys = d.flatMap(s => s[1]), t0 = Math.min(...d.flatMap(s => s[2]))
  const minX = Math.min(...xs), minY = Math.min(...ys), span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY, 1)
  // Players fill roughly 60–85% of the board; use ~75%, centred.
  const k = 190 / span, ox = (256 - (Math.max(...xs) - minX) * k) / 2, oy = (256 - (Math.max(...ys) - minY) * k) / 2
  const strokes: number[][] = [], times: number[][] = []
  for (const [sx, sy, st] of d) {
    const s: number[] = [], t: number[] = []
    sx.forEach((x, i) => {
      const X = Math.round((x - minX) * k + ox), Y = Math.round((sy[i] - minY) * k + oy), n = s.length
      if (n && Math.abs(s[n - 2] - X) + Math.abs(s[n - 1] - Y) < 2 && i !== sx.length - 1) return
      s.push(X, Y); t.push(Math.round(st[i] - t0))
    })
    if (s.length) { strokes.push(s); times.push(t) }
  }
  return { strokes, times }
}

async function take(name: string, n: number) {
  const res = await fetch(BASE + encodeURIComponent(name) + '.ndjson')
  if (!res.ok || !res.body) throw new Error(`${name}: HTTP ${res.status}`)
  const out: ReturnType<typeof toJudge>[] = [], dec = new TextDecoder()
  let buf = '', seen = 0
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true })
    let nl
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl); buf = buf.slice(nl + 1)
      if (!line.includes('"recognized":true')) continue
      if (seen++ < SKIP) continue
      out.push(toJudge((JSON.parse(line) as Raw).drawing))
      if (out.length >= n) return out
    }
  }
  return out
}

await Promise.all(Object.entries(QD_CATEGORIES).map(async ([key, names]) => {
  const parts = await Promise.all(names!.map(nm => take(nm, Math.ceil(N / names!.length))))
  const all = parts.flat().slice(0, N)
  await writeFile(`data/quickdraw/${key}.${SPLIT === 'dev' ? 'dev' : 'raw'}.ndjson`, all.map(d => JSON.stringify(d)).join('\n') + '\n')
  console.log(key.padEnd(10), all.length)
}))
