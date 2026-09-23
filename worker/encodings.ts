/**
 * How a drawing is serialised for Jev, which cannot see images. Jev always makes the decision; an
 * encoding produces the `state` of the deciding call. The subjects' criteria (SUBJECTS.describe)
 * are written in the same shape vocabulary, which is what makes the match work.
 *
 * - scene:          the drawing as a structured scene graph: shapes, relations, drawing order
 *                   (scene.ts). One Jev call, ~0.4 s. Used while the player is drawing.
 * - scene-features: the scene graph plus Jev's own answers to yes/no visual questions from a
 *                   first call (features.ts). Two calls, ~0.8 s, more accurate. Used when a stroke ends.
 *
 * Measured on real Quick, Draw! drawings (see README): 47% and 53% of rounds won, against 36% for
 * the former prose description; ASCII art, SVG and scanline encodings scored 0–3%.
 */
import { describeShapes } from '../shared/shapes'
import type { JudgeMode } from '../shared/judge'
import { sceneState } from './scene'
import { scanDoodle } from './scan'
import { observeFeatures } from './features'

export const ENCODINGS = ['scene', 'scene-features'] as const
export type Encoding = typeof ENCODINGS[number]
export const isEncoding = (v: unknown): v is Encoding => ENCODINGS.includes(v as Encoding)
export const ENCODING_FOR: Record<JudgeMode, Encoding> = { live: 'scene', final: 'scene-features' }

const CONTEXT = 'A player is drawing a quick doodle with a mouse or finger in under 20 seconds.'

export async function encode(enc: Encoding, strokes: readonly number[][], times: readonly number[][] | undefined, ai: Ai): Promise<Record<string, unknown>> {
  const scene = sceneState(strokes, times)
  if (enc === 'scene') return { context: `${CONTEXT} The drawing, broken down into basic shapes and how they relate, numbered in drawing order.`, ...scene }
  const features = await observeFeatures(ai, `${describeShapes(strokes, times)}\n\n${scanDoodle(strokes)}`)
  return { context: `${CONTEXT} The drawing, broken down into basic shapes, plus how likely an observer found each visual feature.`, ...scene, features }
}
