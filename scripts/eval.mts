// Judge accuracy harness: sends synthetic, slightly wobbly doodles of every subject to the running
// dev server and prints what Jev made of them. Run with `make eval` while `make dev` is up.
const URL = process.env.JUDGE_URL ?? 'http://localhost:5173/api/judge'
const RUNS = Number(process.env.RUNS ?? 2)
const STRATEGY = process.env.STRATEGY ?? '' // lab encoding (dev only), see worker/encodings.ts

import { SHAPES, flat } from './shapes.mjs'
import { isAccepted, type JudgeResponse } from '../shared/judge'
import { isTaskKey } from '../shared/subjects'

let hits = 0, accepts = 0, n = 0
const rows = []
for (const [key, make] of Object.entries(SHAPES)) {
  for (let r = 0; r < RUNS; r++) {
    // Non-task shapes (scribble, yarn) are sent with an arbitrary target and only show the guess.
    const base = key.split('_')[0] // heart_round → heart
    const task = isTaskKey(base)
    const target = task ? base : 'fish'
    const res = await fetch(URL, { method: 'POST', headers: { 'content-type': 'application/json', ...(STRATEGY && { 'x-judge-strategy': STRATEGY }) }, body: JSON.stringify({ target, strokes: make().map(flat) }) })
    const out = await res.json() as JudgeResponse
    if (!res.ok) { console.error(key, out); continue }
    const win = isAccepted(out, target)
    if (task) { n++; hits += out.guess === base ? 1 : 0; accepts += win ? 1 : 0 }
    rows.push(`${key.padEnd(9)} → ${String(out.guess).padEnd(9)} conf ${out.confidence.toFixed(2)}  target ${out.targetConfidence.toFixed(2)}  accept ${out.accept.toFixed(2)}  ${!task ? (win ? 'BAD (accepted)' : 'ok (not accepted)') : win ? 'WIN' : ''}`)
  }
}
console.log(rows.join('\n'))
console.log(`\nguess accuracy ${hits}/${n}, wins ${accepts}/${n}`)
