import type { Mood } from '@/cat'
import type { SubjectKey } from '@shared/subjects'

/**
 * Guesses Mirci has feelings about. The first time per round she (wrongly) suspects one of these,
 * she reacts with this mood and a dedicated line (Messages.reactions) instead of a plain guess.
 */
export const REACTION_MOODS = {
  cucumber: 'scared',
  snake: 'scared',
  ghost: 'scared',
  spider: 'playful',
  yarn: 'playful',
  bird: 'playful',
  mouse: 'hungry',
  fish: 'hungry',
  cat: 'love'
} as const satisfies Partial<Record<SubjectKey, Mood>>

export type ReactionKey = keyof typeof REACTION_MOODS
export const isReactionKey = (k: SubjectKey): k is ReactionKey => k in REACTION_MOODS
