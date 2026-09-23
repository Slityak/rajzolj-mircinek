/**
 * Jev as the eyes: a first Jev call reads the shape breakdown and the scanline description and
 * answers simple yes/no visual questions. The deciding call gets these probabilities next to the
 * scene graph, phrased in the same vocabulary as SUBJECTS.describe.
 */
import { runJev, type JevQuestion } from './jev'

const FEATURES = {
  round_outline: 'a main closed outline that is round (circle or oval)',
  long_narrow: 'the main shape is long and narrow, at least twice as long as wide',
  rays_around: 'several short lines spread all around a central shape, pointing outward like rays',
  roof_on_top: 'a triangle or ^ roof shape sitting on top of a box or other shape',
  box: 'a square or rectangle',
  tail_at_end: 'a triangle, fin or line sticking out from one end of the main shape, like a tail',
  heart_outline: 'an outline with a dip at the top center, two bumps, and a point at the bottom',
  crescent: 'a crescent or C shape: a round shape with a deep bite taken out of one side',
  star_spikes: 'a star outline with five or more sharp spikes',
  crown_on_trunk: 'a round or bumpy top shape on a vertical trunk, stem or lines below it',
  ears_on_top: 'small round or pointed bumps on top of a round head or body, like ears',
  eye_dot: 'a small dot or circle inside the main shape near one end, like an eye',
  lines_inside: 'lines, stripes or small shapes drawn inside the main shape',
  mirror_symmetric: 'the left and right halves mirror each other',
  many_legs: 'several thin lines sticking out below or around a body, like legs',
  wavy_line: 'a long wavy, S-shaped or zigzag line',
  spiral: 'a spiral',
  stick_below: 'a straight stick, string or handle attached below a round top',
  wheels_below: 'two small circles under a wider body, like wheels',
  nested_arches: 'several arches nested inside each other',
  loop_handle: 'a loop handle on one side of the main shape',
  scribble: 'only scribbles or random lines, nothing recognisable'
} as const

export async function observeFeatures(ai: Ai, observation: string): Promise<string> {
  const questions = Object.fromEntries(Object.entries(FEATURES).map(([k, text]) => [k, {
    type: 'noul', instructions: `Does the drawing contain this: ${text}?`,
    criteria: { true: 'Clearly present in the drawing', false: 'Not present' }
  } satisfies JevQuestion])) as Record<keyof typeof FEATURES, JevQuestion & { type: 'noul' }>
  const res = await runJev(ai, { state: { drawing: observation }, questions })
  return Object.entries(res.answers)
    .map(([k, a]) => [FEATURES[k as keyof typeof FEATURES], (a as { noul: number }).noul] as const)
    .sort((a, b) => b[1] - a[1])
    .map(([text, p]) => `- ${text}: ${Math.round(p * 100)}% likely`)
    .join('\n')
}
