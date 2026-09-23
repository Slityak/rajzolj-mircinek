/**
 * Mirci's mood parameters. Each mood gives its deviation from BASE;
 * the engine smoothly approaches the numeric values (see CatEngine.smooth).
 * New mood: add a key to MOOD_NAMES and MOODS, and an entry effect to MOOD_ENTER if needed.
 */
export type EyeMode = 'open' | 'happy' | 'closed' | 'heart'
export type MouthMode = 'w' | 'lick' | 'smirk' | 'hiss' | 'squig' | 'zany'
export type MoodFx = '' | 'heart' | 'spark' | 'q' | 'yum' | 'hiss'

export interface MoodParams {
  open: number     // eye openness (0–1)
  pupil: number    // pupil size
  px: number       // pupil horizontal ratio (<1 = slit)
  tilt: number     // head tilt (degrees)
  hx: number       // head offset x
  hy: number       // head offset y
  earL: number     // left ear tilt (degrees, + = backward)
  earR: number
  amp: number      // tail sway amplitude
  freq: number     // tail sway frequency
  curl: number     // tail curl
  tw: number       // tail thickness (>20 = puffed up, trembling)
  by: number       // body vertical offset (+ = crouching)
  mouth: number    // open mouth (0–1.3)
  blush: number    // blush
  whisk: number    // whisker tilt
  knead: number    // kneading (paws)
  breath: number   // breathing slowness
  lid: number      // sad eyelid
  lidF: number     // flat (smug) eyelid
  brow: number     // sad eyebrow
  browA: number    // angry eyebrow
  bq: number       // raised (confused) eyebrow
  frw: number      // downturned mouth
  sml: number      // wide smile
  dly: number      // pupil vertical offset
  wig: number      // butt wiggle
  look: number     // how much it follows the cursor (not smoothed)
  eye: EyeMode
  mm: MouthMode
  mfx: MoodFx      // continuously repeating mood effect
}

export type NumericParam = { [K in keyof MoodParams]: MoodParams[K] extends number ? K : never }[keyof MoodParams]

export const MOOD_NAMES = [
  'idle', 'watch', 'think', 'excited', 'scared', 'happy', 'sulk', 'sad',
  'love', 'hungry', 'smug', 'angry', 'confused', 'playful', 'zany'
] as const
export type Mood = typeof MOOD_NAMES[number]
/** Internal states that cannot be set from outside. */
export type InternalMood = 'sleep' | 'purr'
export type AnyMood = Mood | InternalMood

export const BASE: MoodParams = {
  open: 1, pupil: 1, px: 1, tilt: 0, hx: 0, hy: 0, earL: 0, earR: 0,
  amp: .28, freq: 1.4, curl: -.27, tw: 16, by: 0, mouth: 0, blush: 0, whisk: 0,
  knead: 0, breath: 1, lid: 0, lidF: 0, brow: 0, browA: 0, bq: 0, frw: 0, sml: 0,
  dly: 0, wig: 0, look: 1, eye: 'open', mm: 'w', mfx: ''
}

export const MOODS: Record<AnyMood, Partial<MoodParams>> = {
  idle: {},
  watch: { pupil: 1.2, amp: .16, freq: 2.4 },
  think: { tilt: 10, earR: 14, pupil: 1.05, amp: .2, freq: 1.2 },
  excited: { pupil: 1.45, px: 1.15, curl: -.33, amp: .07, freq: 9, by: -2, earL: -6, earR: -6 },
  scared: { pupil: .42, earL: 20, earR: 20, tw: 28, by: -6, mouth: .65, whisk: -14, curl: -.2, amp: .08, freq: 12 },
  happy: { eye: 'happy', blush: .9, curl: -.33, amp: .35, freq: 3, sml: 1 },
  sulk: { eye: 'closed', tilt: -12, hx: -9, brow: .7, earL: 14, earR: 16, amp: .55, freq: 3.2, mouth: .4, look: 0 },
  sad: { pupil: .95, lid: 1, brow: 1, frw: 1, dly: 3, earL: 16, earR: 16, amp: .04, freq: .8, by: 2, hy: 5, tilt: 4, look: 0 },
  love: { eye: 'heart', blush: 1, sml: 1, curl: -.34, amp: .22, freq: 1.4, tilt: -6, look: 0, mfx: 'heart' },
  hungry: { pupil: 1.35, dly: -4, mm: 'lick', earL: -4, earR: -4, amp: .2, freq: 3, look: 0, mfx: 'yum' },
  smug: { lidF: 1, mm: 'smirk', tilt: -7, pupil: .9, amp: .3, freq: .7, curl: -.3, earL: 4, earR: -4, look: .3 },
  angry: { pupil: .6, px: .45, browA: 1, mm: 'hiss', mouth: .75, earL: 22, earR: 22, tw: 24, by: -3, whisk: -10, amp: .5, freq: 4.5, mfx: 'hiss' },
  confused: { bq: 1, mm: 'squig', tilt: 14, earR: 16, earL: -4, pupil: 1.1, amp: .12, freq: 1, look: .3, mfx: 'q' },
  playful: { pupil: 1.6, px: 1.2, by: 5, hy: 7, wig: 1, earL: -8, earR: -8, amp: .1, freq: 7, curl: -.24, mfx: 'spark' },
  zany: { mm: 'zany', tilt: 12, earL: -6, earR: 16, pupil: 1.2, blush: .5, amp: .4, freq: 5, curl: -.3, look: 0, mfx: 'spark' },
  sleep: { eye: 'closed', hy: 8, tilt: 7, earL: 10, earR: 10, amp: .05, freq: .5, breath: 1.8, look: 0 },
  purr: { eye: 'happy', blush: 1, knead: 1, amp: .18, freq: .9, earL: -4, earR: -4, look: 0, tilt: 6 }
}

/** Parameters smoothed more slowly (tail, breathing). */
export const SLOW_PARAMS: ReadonlySet<NumericParam> = new Set(['tw', 'curl', 'breath'])
/** Parameters that are not smoothed. */
export const INSTANT_PARAMS: ReadonlySet<NumericParam> = new Set(['look'])
