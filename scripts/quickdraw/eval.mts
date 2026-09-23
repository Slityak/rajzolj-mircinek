// Judge accuracy on real Quick, Draw! drawings (run `make qd-eval` with `make dev` up).
// For every task subject present in Quick, Draw!: POS drawings of it (should be accepted) and NEG
// drawings of other subjects sent with the same target (should be rejected).
// STRATEGY=<name> selects a lab judging strategy (dev only, see worker/lab.ts).
import { readFile } from 'node:fs/promises'
import { isAccepted, type JudgeResponse } from '../../shared/judge'
import { TASK_KEYS, type SubjectKey, type TaskKey } from '../../shared/subjects'
import { QD_CATEGORIES } from './categories.mts'

const URL = process.env.JUDGE_URL ?? 'http://localhost:5173/api/judge'
const POS = Number(process.env.POS ?? 15), NEG = Number(process.env.NEG ?? 8)
const STRATEGY = process.env.STRATEGY ?? ''
const NO_TIMES = process.env.NO_TIMES === '1'
// Lab mode has no rate limit; requests still go one at a time.
const PER_MINUTE = Number(process.env.PER_MINUTE ?? 100000)

// The raw split carries pen timestamps and is disjoint from the classifier's training data.
type Drawing = { strokes: number[][]; times?: number[][] }
// SET=dev evaluates on the tuning split instead of the held-out test split.
const SET = process.env.SET === 'dev' ? 'dev' : 'raw'
const VERBOSE = process.env.VERBOSE === '1'
const load = async (k: string) => (await readFile(`data/quickdraw/${k}.${SET}.ndjson`, 'utf8')).trim().split('\n').map(l => JSON.parse(l) as Drawing)
const keys = Object.keys(QD_CATEGORIES) as SubjectKey[]
const evalSet = Object.fromEntries(await Promise.all(keys.map(async k => [k, await load(k)]))) as Record<SubjectKey, Drawing[]>
const tasks = TASK_KEYS.filter(k => k in QD_CATEGORIES)

let last = 0
async function judge(target: TaskKey, d: Drawing) {
  const wait = last + 60000 / PER_MINUTE - Date.now()
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  last = Date.now()
  const t0 = performance.now()
  const res = await fetch(URL, { method: 'POST', headers: { 'content-type': 'application/json', ...(STRATEGY && { 'x-judge-strategy': STRATEGY }) }, body: JSON.stringify({ target, ...d }) })
  const out = await res.json() as JudgeResponse & { error?: string; debug?: unknown }
  if (!res.ok) throw new Error(`${res.status} ${out.error}`)
  return { out, ms: performance.now() - t0 }
}

const lat: number[] = []
let tp = 0, pos = 0, hit = 0, fp = 0, neg = 0
console.log(`set: ${SET === 'dev' ? 'dev' : 'test'}  strategy: ${STRATEGY || 'default'}  (${POS} pos + ${NEG} neg per task)\n`)
console.log('task       win   guess  false-accept  top confusions')
for (const task of tasks) {
  let w = 0, g = 0, f = 0
  const conf = new Map<string, number>()
  for (const s of evalSet[task].slice(0, POS)) {
    const { out, ms } = await judge(task, NO_TIMES ? { strokes: s.strokes } : s); lat.push(ms)
    if (isAccepted(out, task)) w++
    if (out.guess === task) g++; else conf.set(String(out.guess), (conf.get(String(out.guess)) ?? 0) + 1)
    if (VERBOSE && out.guess !== task) console.log(`  ✗ ${task} → ${out.guess}: ${JSON.stringify((out.debug as { drawing?: unknown })?.drawing)}`)
  }
  const others = keys.filter(k => k !== task)
  for (let i = 0; i < NEG; i++) {
    const k = others[(i * 7 + task.length) % others.length]
    const { out, ms } = await judge(task, NO_TIMES ? { strokes: evalSet[k][i].strokes } : evalSet[k][i]); lat.push(ms)
    if (isAccepted(out, task)) f++
  }
  tp += w; hit += g; pos += POS; fp += f; neg += NEG
  const top = [...conf].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k}×${n}`).join(' ')
  console.log(`${task.padEnd(10)} ${String(w).padStart(2)}/${POS}  ${String(g).padStart(2)}/${POS}   ${f}/${NEG}          ${top}`)
}
lat.sort((a, b) => a - b)
console.log(`\nTOTAL win ${tp}/${pos} (${Math.round(100 * tp / pos)}%)  guess ${hit}/${pos} (${Math.round(100 * hit / pos)}%)  false-accept ${fp}/${neg} (${Math.round(100 * fp / neg)}%)  latency p50 ${Math.round(lat[lat.length >> 1])} ms`)
