import type { TaskKey } from '@shared/subjects'

/** Canvas position, plus the pointer event's timestamp (ms) for pen-speed analysis. */
export type Point = [x: number, y: number, t?: number]
export type Stroke = Point[]

export type Screen = 'intro' | 'game' | 'final'
export type RoundOutcome = 'win' | 'timeout' | 'giveup'

export interface RoundResult {
  subject: TaskKey
  won: boolean
}

export interface Overlay {
  kind: RoundOutcome
  gain: number
}
