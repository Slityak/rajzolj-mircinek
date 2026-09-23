import { JUDGE_GRID, JUDGE_LIMITS, type JudgeRequest, type JudgeResponse } from '@shared/judge'
import type { TaskKey } from '@shared/subjects'
import type { Stroke } from './types'

/** Converts canvas strokes into the compact integer format of POST /api/judge. */
export function encodeStrokes(strokes: readonly Stroke[], canvasSize: number): number[][] {
  const k = JUDGE_GRID / Math.max(canvasSize, 1)
  const q = (v: number) => Math.min(JUDGE_GRID, Math.max(0, Math.round(v * k)))
  const out: number[][] = []
  let budget: number = JUDGE_LIMITS.totalPoints
  for (const s of strokes.slice(-JUDGE_LIMITS.strokes)) {
    // Evenly thin out very long strokes, then drop points that land on the same cell.
    const every = Math.ceil(s.length / JUDGE_LIMITS.pointsPerStroke)
    const flat: number[] = []
    s.forEach((p, i) => {
      if (i % every && i !== s.length - 1) return
      const x = q(p[0]), y = q(p[1]), n = flat.length
      if (n && Math.abs(flat[n - 2] - x) + Math.abs(flat[n - 1] - y) < 2) return
      flat.push(x, y)
    })
    if (flat.length / 2 > budget) break
    budget -= flat.length / 2
    out.push(flat)
  }
  return out
}

export async function judgeDrawing(
  target: TaskKey, strokes: readonly Stroke[], canvasSize: number, signal?: AbortSignal
): Promise<JudgeResponse> {
  const body: JudgeRequest = { target, strokes: encodeStrokes(strokes, canvasSize) }
  const res = await fetch('/api/judge', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal
  })
  if (!res.ok) throw new Error(`judge failed: ${res.status}`)
  return res.json() as Promise<JudgeResponse>
}
