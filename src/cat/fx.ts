/** Floating effects (heart, star, caption…) around the cat. */
/** Onomatopoeia the cat "says" as floating captions. Translatable via CatEngineOptions.words. */
export interface CatWords {
  hmpf: string
  hiss: string
  hissLoud: string
  yum: string
  hehe: string
  bleh: string
  purr: string
}

export const DEFAULT_CAT_WORDS: CatWords = { hmpf: 'hmpf', hiss: 'hiss', hissLoud: 'hiss!', yum: 'yum', hehe: 'hehe', bleh: 'blehh', purr: 'prr' }

export type FxKind = 'heart' | 'bang' | 'q' | 'z' | 'prr' | 'note' | 'spark' | 'word'

export interface FxStyle {
  glyph: string
  fill: string
  size: number
  vx?: number
  vy: number
  life: number
  weight?: number
  /** Entrance "pop" scaling */
  pop?: boolean
  /** Sideways drift */
  sway?: boolean
}

export const FX: Record<FxKind, FxStyle> = {
  heart: { glyph: '♥', fill: 'var(--cat-heart)', size: 24, vy: -34, life: 1.6, sway: true },
  bang: { glyph: '!', fill: 'var(--c-danger)', size: 46, vy: -8, life: 1.3, weight: 900, pop: true },
  q: { glyph: '?', fill: 'var(--cat-line)', size: 36, vy: -12, life: 1.4, weight: 800, pop: true },
  z: { glyph: 'z', fill: 'var(--c-ink-soft)', size: 20, vy: -22, vx: 12, life: 2.2, weight: 800, sway: true },
  prr: { glyph: 'prr', fill: 'var(--c-ink-soft)', size: 14, vy: -20, vx: 10, life: 1.4, weight: 700 },
  note: { glyph: '♪', fill: 'var(--cat-line)', size: 22, vy: -30, vx: 8, life: 1.3, sway: true },
  spark: { glyph: '✦', fill: 'var(--cat-fur)', size: 22, vy: -18, life: 1, pop: true },
  word: { glyph: '', fill: 'var(--cat-line)', size: 18, vy: -16, life: 1.4, weight: 800 }
}
