// Prints the verbal description Jev receives for each synthetic eval shape (debug aid).
import { describeShapes } from '../shared/shapes'
import { SHAPES, flat } from './shapes.mjs'
for (const [k, make] of Object.entries(SHAPES)) console.log(`== ${k}\n${describeShapes((make as () => [number, number][][])().map(flat))}`)
