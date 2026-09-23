/**
 * Typed wrapper around TypeSafe's Jev model on Workers AI (`typesafe/jev`).
 * Question definitions are typed so each answer comes back with the matching shape.
 */
export const JEV_MODEL = 'typesafe/jev'

export type JevQuestion =
  | { type: 'noul'; instructions: string; criteria: { true: string; false: string } }
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }
  | { type: 'score'; instructions: string; criteria: string[] }

export interface JevNoulAnswer { type: 'noul'; noul: number; confidence?: number }
export interface JevChoiceAnswer<K extends string = string> {
  type: 'choice'; choice: K; confidence: number; probabilities: Partial<Record<K, number>>
}
export interface JevScoreAnswer {
  type: 'score'; score: number; confidence?: number; probabilities?: Record<string, number>; legend?: Record<string, string>
}

type AnswerOf<Q> =
  Q extends { type: 'noul' } ? JevNoulAnswer
  : Q extends { type: 'choice'; criteria: Record<infer K extends string, string> } ? JevChoiceAnswer<K>
  : JevScoreAnswer

export interface JevResult<Qs extends Record<string, JevQuestion>> {
  model: string
  answers: { [K in keyof Qs]: AnswerOf<Qs[K]> }
  usage?: { input_tokens: number; output_tokens: number }
}

export async function runJev<const Qs extends Record<string, JevQuestion>>(
  ai: Ai, input: { state: string | Record<string, unknown>; questions: Qs }
): Promise<JevResult<Qs>> {
  // `typesafe/jev` is not in the generated model catalogue yet, hence the untyped call.
  const untyped = ai as unknown as { run(model: string, input: unknown): Promise<unknown> }
  // Through the Workers AI binding the result arrives wrapped: { state: 'Completed', result: {...} }.
  const raw = await untyped.run(JEV_MODEL, input) as { result?: JevResult<Qs> } & Partial<JevResult<Qs>>
  const out = (raw?.result ?? raw) as JevResult<Qs>
  for (const id of Object.keys(input.questions)) {
    if (!out?.answers?.[id]) throw new Error(`Jev response is missing answer "${id}": ${JSON.stringify(out).slice(0, 800)}`)
  }
  return out
}
