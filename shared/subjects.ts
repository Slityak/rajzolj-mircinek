/**
 * Everything Mirci can guess. Keys are stable identifiers shared by the client, the worker and the
 * i18n files; `describe` is model-facing (always English), never shown to players.
 * Descriptions are written in the same shape vocabulary shared/shapes.ts uses to describe drawings
 * (ellipse, triangle, attached to the end of, rays, inside …): Jev matches far better when the
 * drawing and the candidates speak the same language (measured: 36% → 47% of rounds won).
 *
 * Only TASK_KEYS are ever asked for; the rest exist so Mirci has plenty of (wrong) things to guess.
 */
export const SUBJECTS = {
  // Tasks
  ball: { emoji: '⚽', describe: 'one circle, maybe with lines, curves or small shapes inside it; nothing sticking out' },
  fish: { emoji: '🐟', describe: 'a horizontal ellipse or pointed oval with a triangle, angle or fin attached to one end (tail), or one elongated outline pinched into a narrow waist near one end or with a V-shaped notch in one end; maybe a dot inside near the other end' },
  house: { emoji: '🏠', describe: 'a square or rectangle with a triangle or ^ angle attached on its top side (roof); maybe small rectangles inside (door, windows)' },
  sun: { emoji: '☀️', describe: 'a circle or ellipse with several short straight lines spread around it, pointing outward like rays' },
  cucumber: { emoji: '🥒', describe: 'one very elongated ellipse or capsule, maybe slightly curved, maybe with dots or short lines inside' },
  tree: { emoji: '🌳', describe: 'a round, bumpy or cloud-like shape or line on top (crown) with two roughly vertical lines or arcs, or a narrow rectangle, attached below it (trunk)' },
  moon: { emoji: '🌙', describe: 'a crescent: a round shape with a deep bite out of one side, or a deep C-shaped arc' },
  star: { emoji: '⭐', describe: 'a star with 5 sharp points, or a closed zigzag outline with 5 spikes' },
  mouse: { emoji: '🐭', describe: 'an ellipse or pointed oval body with small circles attached on top (ears) and a long curved or wavy line attached to one end (tail)' },
  heart: { emoji: '❤️', describe: 'a heart-like outline: a dip at the top center, two round bumps and a point at the bottom' },

  // Guess only
  yarn: { emoji: '🧶', describe: 'a circle filled with many crossing curved lines, maybe a loose wavy line attached outside' },
  apple: { emoji: '🍎', describe: 'a round shape with a small dip on top and a short line (stem) attached on top, maybe a small leaf' },
  egg: { emoji: '🥚', describe: 'a single upright ellipse, nothing else' },
  balloon: { emoji: '🎈', describe: 'an upright ellipse or circle with a long thin wavy or straight line attached below it (string)' },
  cloud: { emoji: '☁️', describe: 'a wide bumpy, cloud-like outline made of several round bulges, with nothing attached below it' },
  flower: { emoji: '🌸', describe: 'a small circle surrounded by several round loops (petals), often with a vertical line below (stem)' },
  snake: { emoji: '🐍', describe: 'one long wavy or zigzag line, maybe with a small head at one end' },
  bird: { emoji: '🐦', describe: 'a round or oval body with a small triangle attached on one side (beak), maybe thin lines below (legs); or a flying V shape' },
  cat: { emoji: '🐱', describe: 'a circle (head) with two triangles attached on top (ears), maybe lines on both sides (whiskers) and a tail' },
  snail: { emoji: '🐌', describe: 'a spiral (shell) on top of a long low shape (body) with two short lines on top (feelers)' },
  butterfly: { emoji: '🦋', describe: 'two pairs of loops or bumpy shapes on both sides of a thin vertical shape (wings and body)' },
  spider: { emoji: '🕷️', describe: 'a small circle or ellipse with many thin bent lines (legs) attached on both sides' },
  umbrella: { emoji: '☂️', describe: 'a half circle or dome on top with a vertical line attached below that ends in a hook' },
  glasses: { emoji: '👓', describe: 'two circles or ellipses side by side, joined by a short line' },
  key: { emoji: '🔑', describe: 'a small circle or loop attached to one end of a long straight line with small teeth' },
  cup: { emoji: '☕', describe: 'a rectangle or bowl shape open at the top with a loop attached on one side (handle)' },
  lollipop: { emoji: '🍭', describe: 'a circle, maybe with a spiral inside, with a long straight line attached below it (stick)' },
  ice_cream: { emoji: '🍦', describe: 'a round scoop on top of a downward-pointing triangle (cone)' },
  pizza: { emoji: '🍕', describe: 'a triangle with small circles or dots inside it' },
  banana: { emoji: '🍌', describe: 'a curved crescent-like elongated shape, pointed at both ends' },
  carrot: { emoji: '🥕', describe: 'a long narrow triangle pointing down with a few short lines attached on top (leaves)' },
  lightning: { emoji: '⚡', describe: 'a zigzag line or zigzag closed shape going from top to bottom' },
  mountain: { emoji: '⛰️', describe: 'one or more large triangles or ^ angles standing side by side' },
  boat: { emoji: '⛵', describe: 'a wide half-oval or trapezoid at the bottom (hull) with a vertical line and a triangle above it (mast and sail)' },
  car: { emoji: '🚗', describe: 'a wide rectangle-like body with two small circles below it (wheels)' },
  rainbow: { emoji: '🌈', describe: 'several arches (arcs opening down) nested inside each other' },
  eye: { emoji: '👁️', describe: 'a wide pointed oval (almond) with a circle inside it (pupil)' },
  bone: { emoji: '🦴', describe: 'a long straight shape with two round knobs at each end' },
  leaf: { emoji: '🍃', describe: 'a pointed oval with a line down the middle and a short line attached at one end (stem)' },
  ghost: { emoji: '👻', describe: 'a tall shape with a round top and a wavy bottom edge, with two small dots or circles inside (eyes)' },
  donut: { emoji: '🍩', describe: 'a circle with a smaller circle inside its center' },
  clock: { emoji: '🕐', describe: 'a circle with two straight lines starting from its center (hands), maybe small marks inside' },
  kite: { emoji: '🪁', describe: 'a diamond (four-sided shape standing on a corner) with a long wavy line attached below it' },
  planet: { emoji: '🪐', describe: 'a circle with a wide flat ellipse (ring) around it that sticks out far beyond both sides' },
  crown: { emoji: '👑', describe: 'a wide shape with a flat bottom and three to five sharp spikes along the top' },
  mushroom: { emoji: '🍄', describe: 'a wide dome or half circle on top with a short thick rectangle attached below it (stem)' }
} as const satisfies Record<string, { emoji: string; describe: string }>

export const SCRIBBLE_DESCRIBE = 'nothing recognisable: random scribbles, a few unrelated lines, or too little ink'

export type SubjectKey = keyof typeof SUBJECTS
export const SUBJECT_KEYS = Object.keys(SUBJECTS) as SubjectKey[]

/** What Mirci can ask the player to draw: shapes the judge recognises reliably. */
export const TASK_KEYS = ['ball', 'fish', 'house', 'sun', 'cucumber', 'tree', 'moon', 'star', 'mouse', 'heart'] as const satisfies readonly SubjectKey[]
export type TaskKey = typeof TASK_KEYS[number]

export const isSubjectKey = (v: unknown): v is SubjectKey => typeof v === 'string' && v in SUBJECTS
export const isTaskKey = (v: unknown): v is TaskKey => TASK_KEYS.includes(v as TaskKey)
