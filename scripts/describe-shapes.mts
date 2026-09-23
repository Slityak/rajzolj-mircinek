// Prints the verbal description Jev receives for each synthetic eval shape (debug aid).
import { describeDoodle } from '../shared/describe'
import { SHAPES, flat } from './shapes.mjs'
for (const [k, make] of Object.entries(SHAPES)) console.log(`== ${k}\n${describeDoodle((make as () => [number, number][][])().map(flat))}`)
