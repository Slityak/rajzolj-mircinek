/**
 * Scene-graph serialisation: the shape analysis as a structured object (Jev's state can be an
 * object, not only text), read against SUBJECTS.describe criteria written in the same vocabulary.
 */
import { analyzeShapes } from '../shared/shapes'

export function sceneState(strokes: readonly number[][], times?: readonly number[][]): Record<string, unknown> {
  const scene = analyzeShapes(strokes, times)
  if (!scene) return { drawing: 'empty page' }
  return {
    drawing: {
      strokes: scene.strokes,
      proportion: scene.proportion,
      shapes: scene.items.map(it => ({
        id: it.ids.length > 1 ? it.ids.join(',') : it.ids[0],
        ...(it.ids.length > 1 ? { count: it.ids.length } : {}),
        size: it.size,
        shape: it.kind,
        ...(it.where ? { position: it.where } : {}),
        ...(it.relation ? { relation: it.relation } : {})
      }))
    }
  }
}
