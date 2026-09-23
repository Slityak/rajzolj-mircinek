/**
 * Everything Mirci can guess. Keys are stable identifiers shared by the client, the worker and the
 * i18n files; `describe` is model-facing (always English), never shown to players. Descriptions use
 * the same vocabulary as shared/describe.ts (circle, oval, capsule, spikes, rays…).
 *
 * Only TASK_KEYS are ever asked for; the rest exist so Mirci has plenty of (wrong) things to guess.
 */
export const SUBJECTS = {
  // Tasks
  ball: { emoji: '⚽', describe: 'a ball: a single round circle, maybe with a few seam lines or stripes running across it inside, nothing sticking out' },
  fish: { emoji: '🐟', describe: 'a fish: an oval or lens-shaped body lying sideways with a triangular tail fin on one end' },
  house: { emoji: '🏠', describe: 'a house: a square or rectangle with a triangular roof on top, maybe a door or windows' },
  sun: { emoji: '☀️', describe: 'the sun: a circle with short straight rays radiating outwards all around it' },
  cucumber: { emoji: '🥒', describe: 'a cucumber: a long, narrow, slightly curved sausage-like shape with rounded ends' },
  tree: { emoji: '🌳', describe: 'a tree: a vertical trunk with a round or cloud-like crown (or a triangle) on top' },
  moon: { emoji: '🌙', describe: 'the moon: a crescent, a curved banana-like sickle shape with two pointed tips' },
  star: { emoji: '⭐', describe: 'a star: a five-pointed star shape with sharp spikes' },
  mouse: { emoji: '🐭', describe: 'a mouse: a small oval body with round ears, a pointy nose and a long thin tail' },
  heart: { emoji: '❤️', describe: 'a heart: the classic heart symbol with two rounded bumps on top and a point at the bottom' },

  // Guess only
  yarn: { emoji: '🧶', describe: 'a ball of yarn: a circle filled with many crossing, looping lines, maybe a loose thread' },
  apple: { emoji: '🍎', describe: 'an apple: a round shape with a small dip on top and a short stem, maybe a leaf' },
  egg: { emoji: '🥚', describe: 'an egg: a single upright oval, slightly narrower at the top, nothing else' },
  balloon: { emoji: '🎈', describe: 'a balloon: an upright oval or circle with a long thin wavy string hanging below it' },
  cloud: { emoji: '☁️', describe: 'a cloud: a wide closed shape with a bumpy, wavy outline of several round puffs' },
  flower: { emoji: '🌸', describe: 'a flower: a small circle surrounded by round petal loops, often on a vertical stem' },
  snake: { emoji: '🐍', describe: 'a snake: one long wavy S-shaped or zigzag line, maybe with a small head at one end' },
  bird: { emoji: '🐦', describe: 'a bird: a round or oval body with a small pointed beak, a wing and thin legs; or a flying "v" shape' },
  cat: { emoji: '🐱', describe: 'a cat: a round head with two triangular pointed ears on top, maybe whiskers and a tail' },
  snail: { emoji: '🐌', describe: 'a snail: a spiral shell on top of a long low body with two small feelers' },
  butterfly: { emoji: '🦋', describe: 'a butterfly: two pairs of loop-shaped wings on both sides of a thin vertical body' },
  spider: { emoji: '🕷️', describe: 'a spider: a small round body with eight thin bent legs sticking out on both sides' },
  umbrella: { emoji: '☂️', describe: 'an umbrella: a half circle dome on top of a straight vertical handle ending in a hook' },
  glasses: { emoji: '👓', describe: 'glasses: two circles or ovals side by side, joined by a short bridge line' },
  key: { emoji: '🔑', describe: 'a key: a small circle or loop at one end of a long straight shaft with a few teeth' },
  cup: { emoji: '☕', describe: 'a cup: an upright rectangle or bowl shape, open at the top, with a loop handle on one side' },
  lollipop: { emoji: '🍭', describe: 'a lollipop: a circle, often with a spiral inside, on top of a long straight stick' },
  ice_cream: { emoji: '🍦', describe: 'an ice cream cone: a round scoop on top of a downward-pointing triangle' },
  pizza: { emoji: '🍕', describe: 'a slice of pizza: a triangle with small circles (toppings) inside it' },
  banana: { emoji: '🍌', describe: 'a banana: a curved crescent-like elongated shape, thicker in the middle' },
  carrot: { emoji: '🥕', describe: 'a carrot: a long narrow triangle pointing down with a few short lines (leaves) on top' },
  lightning: { emoji: '⚡', describe: 'a lightning bolt: a zigzag line or zigzag closed shape going from top to bottom' },
  mountain: { emoji: '⛰️', describe: 'a mountain: one or more large wide triangles or a ^ shape standing on the ground' },
  boat: { emoji: '⛵', describe: 'a boat: a wide half-oval or trapezoid hull with a vertical mast and a triangular sail' },
  car: { emoji: '🚗', describe: 'a car: a wide rectangle-like body with two small circles (wheels) underneath' },
  rainbow: { emoji: '🌈', describe: 'a rainbow: several nested arches (half circles) one inside the other' },
  eye: { emoji: '👁️', describe: 'an eye: a wide lens or almond shape with a circle (pupil) inside' },
  bone: { emoji: '🦴', describe: 'a bone: a long straight shaft with two round knobs at each end' },
  leaf: { emoji: '🍃', describe: 'a leaf: a pointed oval or lens shape with a line down the middle and a short stem' },
  ghost: { emoji: '👻', describe: 'a ghost: a tall rounded-top shape with a wavy bottom edge and two small eyes' },
  donut: { emoji: '🍩', describe: 'a donut: a circle with a smaller circle (the hole) in its center' },
  clock: { emoji: '🕐', describe: 'a clock: a circle with two straight hands from the center and maybe small marks' },
  kite: { emoji: '🪁', describe: 'a kite: a diamond shape (four corners) with a long wavy tail line hanging below' },
  planet: { emoji: '🪐', describe: 'a planet: a circle with a wide flat oval ring around it that sticks out far beyond both sides of the circle' },
  crown: { emoji: '👑', describe: 'a crown: a wide shape with a flat bottom and three to five pointy spikes along the top' },
  mushroom: { emoji: '🍄', describe: 'a mushroom: a wide dome cap on top of a short thick stem' }
} as const satisfies Record<string, { emoji: string; describe: string }>

export type SubjectKey = keyof typeof SUBJECTS
export const SUBJECT_KEYS = Object.keys(SUBJECTS) as SubjectKey[]

/** What Mirci can ask the player to draw: shapes the judge recognises reliably. */
export const TASK_KEYS = ['ball', 'fish', 'house', 'sun', 'cucumber', 'tree', 'moon', 'star', 'mouse', 'heart'] as const satisfies readonly SubjectKey[]
export type TaskKey = typeof TASK_KEYS[number]

export const isSubjectKey = (v: unknown): v is SubjectKey => typeof v === 'string' && v in SUBJECTS
export const isTaskKey = (v: unknown): v is TaskKey => TASK_KEYS.includes(v as TaskKey)
