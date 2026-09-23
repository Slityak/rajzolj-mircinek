import type { SubjectKey, TaskKey } from './subjects'

/**
 * Contract of POST /api/judge. Strokes are sent in a normalised JUDGE_GRID × JUDGE_GRID space
 * (integers, origin top-left) as flat [x0, y0, x1, y1, …] arrays, so the payload stays tiny.
 */
export const JUDGE_GRID = 256
export const JUDGE_LIMITS = { strokes: 120, pointsPerStroke: 400, totalPoints: 4000 } as const

/**
 * live: quick judgement while the player is drawing (one Jev call, ~0.4 s).
 * final: more careful judgement when a stroke ends (two Jev calls, ~0.8 s).
 */
export type JudgeMode = 'live' | 'final'

export interface JudgeRequest {
  /** What Mirci asked for. Only the acceptance question sees it; the guess stays blind. */
  target: TaskKey
  strokes: number[][]
  /** Optional per-point timestamps (ms since the first point), same shape as strokes / 2. */
  times?: number[][]
  mode?: JudgeMode
}

export interface JudgeResponse {
  /** Mirci's best guess, or null while the doodle is still an unrecognisable scribble. */
  guess: SubjectKey | null
  /** Probability of `guess` (0–1). */
  confidence: number
  /** Probability of the requested subject in the blind guess (0–1). */
  targetConfidence: number
  /** Probability that Mirci accepts the doodle as the requested subject (0–1). */
  accept: number
  /** Model version reported by Jev, for debugging. */
  model: string
}

export interface JudgeError {
  error: 'bad_request' | 'rate_limited' | 'model_error'
  message: string
}

/**
 * When Mirci accepts the drawing. The visible guess meter decides; Jev's separate `accept` answer
 * can only veto a drawing it clearly rejects, so a green, high meter always means a win.
 */
export const WIN_RULE = { minConfidence: .5, vetoBelow: .3 } as const

export function isAccepted(res: JudgeResponse, target: TaskKey): boolean {
  return res.guess === target && res.confidence >= WIN_RULE.minConfidence && res.accept >= WIN_RULE.vetoBelow
}
