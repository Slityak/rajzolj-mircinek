import type { SubjectKey } from '../../shared/subjects'

/**
 * Our subjects → Quick, Draw! category names (https://github.com/googlecreativelab/quickdraw-dataset,
 * CC BY 4.0). heart, cucumber, ghost, planet, bone, kite, yarn and egg have no counterpart there.
 */
export const QD_CATEGORIES: Partial<Record<SubjectKey, string[]>> = {
  ball: ['soccer ball', 'basketball'],
  fish: ['fish'], house: ['house'], sun: ['sun'], tree: ['tree'], moon: ['moon'], star: ['star'],
  mouse: ['mouse'], cat: ['cat'], snake: ['snake'], apple: ['apple'], banana: ['banana'],
  carrot: ['carrot'], crown: ['crown'], mushroom: ['mushroom'], umbrella: ['umbrella'], key: ['key'],
  cloud: ['cloud'], flower: ['flower'], bird: ['bird'], spider: ['spider'], butterfly: ['butterfly'],
  snail: ['snail'], lollipop: ['lollipop'], ice_cream: ['ice cream'], pizza: ['pizza'],
  lightning: ['lightning'], mountain: ['mountain'], boat: ['sailboat'], car: ['car'],
  rainbow: ['rainbow'], eye: ['eye'], donut: ['donut'], clock: ['clock'], glasses: ['eyeglasses'],
  cup: ['cup', 'coffee cup', 'mug'], leaf: ['leaf']
}
