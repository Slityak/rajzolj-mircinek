import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import type { Point, Stroke } from '@/game/types'

export interface DrawingOptions {
  disabled?: Ref<boolean>
  lineWidth?: number
  /** CSS color or variable name (e.g. '--c-ink'); read out at runtime */
  color?: string
  onChange?: (strokes: readonly Stroke[]) => void
  onStrokeEnd?: () => void
}

/** Pointer-based freehand drawing on a HiDPI canvas. Mouse, pen, and touch alike. */
export function useDrawingCanvas(opts: DrawingOptions = {}) {
  const canvas: Ref<HTMLCanvasElement | null> = ref(null)
  let ctx: CanvasRenderingContext2D | null = null
  let ro: ResizeObserver | null = null
  let drawing = false
  const strokes: Stroke[] = []

  const color = () => {
    const c = opts.color ?? '--c-ink'
    return c.startsWith('--') && canvas.value ? getComputedStyle(canvas.value).getPropertyValue(c).trim() || '#1F2A5C' : c
  }

  function setupCtx() {
    if (!ctx) return
    ctx.lineWidth = opts.lineWidth ?? 5
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.strokeStyle = color()
  }

  function resize() {
    const el = canvas.value; if (!el) return
    const dpr = window.devicePixelRatio || 1
    el.width = Math.round(el.clientWidth * dpr); el.height = Math.round(el.clientHeight * dpr)
    ctx = el.getContext('2d')
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    redraw()
  }

  function redraw() {
    const el = canvas.value; if (!ctx || !el) return
    ctx.clearRect(0, 0, el.width, el.height)
    setupCtx()
    for (const s of strokes) {
      ctx.beginPath()
      s.forEach((p, i) => (i ? ctx!.lineTo(p[0], p[1]) : ctx!.moveTo(p[0], p[1])))
      if (s.length === 1) ctx.lineTo(s[0][0] + .1, s[0][1])
      ctx.stroke()
    }
  }

  function clear() { strokes.length = 0; redraw(); opts.onChange?.(strokes) }

  const pos = (e: PointerEvent): Point => {
    const r = canvas.value!.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }

  function onPointerDown(e: PointerEvent) {
    if (opts.disabled?.value || !canvas.value) return
    canvas.value.setPointerCapture(e.pointerId)
    drawing = true
    strokes.push([pos(e)])
    redraw()
    opts.onChange?.(strokes)
  }

  function onPointerMove(e: PointerEvent) {
    if (!drawing || !ctx) return
    const s = strokes[strokes.length - 1], p = pos(e), q = s[s.length - 1]
    s.push(p)
    ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]); ctx.stroke()
  }

  function onPointerUp() {
    if (!drawing) return
    drawing = false
    opts.onChange?.(strokes)
    opts.onStrokeEnd?.()
  }

  onMounted(() => {
    ro = new ResizeObserver(resize)
    if (canvas.value?.parentElement) ro.observe(canvas.value.parentElement)
    resize()
  })
  onBeforeUnmount(() => ro?.disconnect())

  return { canvas, strokes: strokes as readonly Stroke[], clear, redraw, onPointerDown, onPointerMove, onPointerUp }
}
