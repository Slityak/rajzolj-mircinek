import { JUDGE_GRID, JUDGE_LIMITS, type JudgeMode, type JudgeRequest, type JudgeResponse } from '@shared/judge'
import type { TaskKey } from '@shared/subjects'
import type { Stroke } from './types'

/**
 * Converts canvas strokes into the compact integer format of POST /api/judge: coordinates on the
 * judge grid, plus per-point times in ms since the first point (used to spot corners by slow-down).
 */
export function encodeStrokes(strokes: readonly Stroke[], canvasSize: number): Pick<JudgeRequest, 'strokes' | 'times'> {
  const k = JUDGE_GRID / Math.max(canvasSize, 1)
  const q = (v: number) => Math.min(JUDGE_GRID, Math.max(0, Math.round(v * k)))
  const kept = strokes.slice(-JUDGE_LIMITS.strokes)
  const t0 = kept[0]?.[0]?.[2]
  const timed = t0 !== undefined && kept.every(s => s.every(p => p[2] !== undefined))
  const out: number[][] = [], times: number[][] = []
  let budget: number = JUDGE_LIMITS.totalPoints
  for (const s of kept) {
    // Evenly thin out very long strokes, then drop points that land on the same cell.
    const every = Math.ceil(s.length / JUDGE_LIMITS.pointsPerStroke)
    const flat: number[] = [], ts: number[] = []
    s.forEach((p, i) => {
      if (i % every && i !== s.length - 1) return
      const x = q(p[0]), y = q(p[1]), n = flat.length
      if (n && Math.abs(flat[n - 2] - x) + Math.abs(flat[n - 1] - y) < 2) return
      flat.push(x, y)
      if (timed) ts.push(Math.min(120000, Math.max(0, Math.round(p[2]! - t0))))
    })
    if (flat.length / 2 > budget) break
    budget -= flat.length / 2
    out.push(flat); times.push(ts)
  }
  return timed ? { strokes: out, times } : { strokes: out }
}

export async function judgeDrawing(
  target: TaskKey, strokes: readonly Stroke[], canvasSize: number, mode: JudgeMode, signal?: AbortSignal
): Promise<JudgeResponse> {
  const body: JudgeRequest = { target, mode, ...encodeStrokes(strokes, canvasSize) }
  const res = await fetch('/api/judge', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal
  })
  if (!res.ok) throw new Error(`judge failed: ${res.status}`)
  return res.json() as Promise<JudgeResponse>
}
