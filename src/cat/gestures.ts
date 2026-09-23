/** Gestures and temperament events that the cat signals to the parent. */
export type TouchGesture = 'pet' | 'boop' | 'ear' | 'tail' | 'paw' | 'head' | 'meow' | 'wake' | 'startle'
export type TemperEvent =
  | 'temper:angry' | 'temper:annoyed' | 'temper:calming'
  | 'temper:cool' | 'temper:calm' | 'temper:happy' | 'temper:love'
export type CatGesture = TouchGesture | TemperEvent

/**
 * Temperament: -1 (angry) … +1 (in love). Petting raises it, poking the tail lowers it,
 * and it slowly decays to zero on its own. The stages override the mood passed in from outside.
 */
export const TEMPER = {
  decaySeconds: 9,
  petGain: .0016,
  tailLoss: .0035,
  tailTapLoss: .2,
  stages: [
    { min: -Infinity, stage: -2, mood: 'angry' },
    { min: -.7, stage: -1, mood: 'sulk' },
    { min: -.3, stage: 0, mood: null },
    { min: .35, stage: 1, mood: 'happy' },
    { min: .75, stage: 2, mood: 'love' }
  ]
} as const

export type TemperStage = -2 | -1 | 0 | 1 | 2

export function temperEvent(stage: TemperStage, worse: boolean): TemperEvent {
  switch (stage) {
    case -2: return 'temper:angry'
    case -1: return worse ? 'temper:annoyed' : 'temper:calming'
    case 0: return worse ? 'temper:cool' : 'temper:calm'
    case 1: return worse ? 'temper:cool' : 'temper:happy'
    case 2: return 'temper:love'
  }
}
