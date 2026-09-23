import { BASE, MOODS, SLOW_PARAMS, INSTANT_PARAMS, type Mood, type AnyMood, type MoodParams, type EyeMode, type NumericParam } from './moods'
import { FX, DEFAULT_CAT_WORDS, type CatWords, type FxKind } from './fx'
import { EAR, EYE, HEAD, BODY, NOSE, PAW, WHISKER, TAIL, GROUND, NECK, EYE_Y, clamp, rand, inTri, inEll, type Pt } from './geometry'
import { TEMPER, temperEvent, type CatGesture, type TemperStage } from './gestures'

/**
 * The SVG elements marked with the `data-part` attribute. The engine animates these
 * directly from requestAnimationFrame (without Vue reactivity, this is the cheapest at 60 fps).
 */
export const PARTS = [
  'shadow', 'root', 'tail', 'body', 'pawL', 'pawR', 'head', 'earL', 'earR',
  'eyeOL', 'eyeOR', 'pupL', 'pupR', 'lidL', 'lidR', 'lidFL', 'lidFR',
  'happyL', 'happyR', 'closedL', 'closedR', 'heartL', 'heartR',
  'brows', 'browsA', 'browQ', 'blushL', 'blushR',
  'mouthO', 'fangs', 'smirk', 'squig', 'blep', 'smile', 'frown', 'mouthW',
  'lick', 'lickMouth', 'tongueO', 'tongueI', 'whL', 'whR', 'fx'
] as const
export type Part = typeof PARTS[number]

type Shot = 'curious' | 'annoyed' | 'meow' | 'yawn' | 'boop' | 'jump' | 'land' | 'pawL' | 'pawR' | 'swat'
type Targets = MoodParams & { lx: number; ly: number }
type Smoothed = Record<NumericParam | 'lx' | 'ly', number>
interface FxItem { el: SVGTextElement; kind: FxKind; x: number; y: number; vx: number; vy: number; life: number; max: number; seed: number }

const NS = 'http://www.w3.org/2000/svg'
const f2 = (n: number) => n.toFixed(2)
const set = (el: Element, attr: string, v: string | number) => el.setAttribute(attr, typeof v === 'number' ? String(v) : v)
const show = (el: Element, on: boolean | number) => set(el, 'opacity', typeof on === 'number' ? on.toFixed(2) : on ? 1 : 0)

export interface CatEngineOptions {
  onGesture?: (g: CatGesture) => void
  /** After this many seconds of idling it yawns, then falls asleep */
  yawnAfter?: number
  sleepAfter?: number
  /** Floating caption texts; defaults to DEFAULT_CAT_WORDS */
  words?: CatWords
}

export class CatEngine {
  private el = {} as Record<Part, SVGGraphicsElement>
  private raf = 0
  private last = performance.now()
  private t = 0
  private moodProp: Mood = 'idle'
  private mood: AnyMood | null = null
  private s: Smoothed
  private shots: Partial<Record<Shot, { t0: number; dur: number }>> = {}
  private fx: FxItem[] = []
  private tailPts: [number, number][] = []
  private pp: (Pt & { ts: number }) | null = null
  private lastPtr = -99
  private lastAct = 0
  private phase = 0
  private nextBlink = 1.5; private blinkAt = -9; private dbl = 0
  private nextTwitch = 3; private twL = 0; private twR = 0; private whTw = 0; private whip = 0
  private purrUntil = -1; private petAcc = 0; private nextPurrFx = 0
  private sleeping = false; private yawned = false; private nextZ = 0
  private wander = { x: 0, y: 0, next: 0 }
  private temper = 0; private tStage: TemperStage = 0
  private heartsLeft = 0; private nextHeart = 0; private hopAgain = 0
  private jumpH = 0; private landAt = 0; private swatCd = 0; private nextMoodFx = 0

  words: CatWords

  constructor(private svg: SVGSVGElement, private opts: CatEngineOptions = {}) {
    for (const p of PARTS) {
      const n = svg.querySelector<SVGGraphicsElement>(`[data-part="${p}"]`)
      if (!n) throw new Error(`[Mirci] missing SVG part: ${p}`)
      this.el[p] = n
    }
    this.words = opts.words ?? DEFAULT_CAT_WORDS
    this.s = { ...(BASE as unknown as Smoothed), lx: 0, ly: 0 }
    window.addEventListener('pointermove', this.onMove)
    svg.addEventListener('pointerdown', this.onDown)
    this.raf = requestAnimationFrame(this.loop)
  }

  setMood(m: Mood) { this.moodProp = m }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('pointermove', this.onMove)
    this.svg.removeEventListener('pointerdown', this.onDown)
  }

  // ————— input —————

  private toSvg(cx: number, cy: number): Pt | null {
    const m = this.svg.getScreenCTM(); if (!m) return null
    const q = new DOMPoint(cx, cy).matrixTransform(m.inverse())
    return { x: q.x, y: q.y }
  }
  private emit(g: CatGesture) { this.opts.onGesture?.(g) }
  private nearTail(p: Pt, r = TAIL.hitRadius) { return this.tailPts.some(q => Math.hypot(q[0] - p.x, q[1] - p.y) < r) }
  private onEar(p: Pt, side: 'L' | 'R') { const [a, b, c] = EAR[side].tri; return inTri(p, a, b, c) && !inEll(p, HEAD) }

  private onMove = (e: PointerEvent) => {
    const p = this.toSvg(e.clientX, e.clientY); if (!p) return
    if (this.pp) {
      const d = Math.hypot(p.x - this.pp.x, p.y - this.pp.y)
      const speed = d / Math.max(1, e.timeStamp - this.pp.ts)
      if (d < 40 && inEll(p, { cx: HEAD.cx, cy: EYE_Y, rx: 62, ry: 60 })) {
        this.petAcc += d; this.temper = Math.min(1, this.temper + d * TEMPER.petGain)
      } else if (d < 40 && this.nearTail(p)) {
        this.temper = Math.max(-1, this.temper - d * TEMPER.tailLoss); this.whip = Math.min(1, this.whip + d * .01)
      }
      const m = this.moodProp
      if ((m === 'watch' || m === 'think') && speed > 1.6 && this.t > this.swatCd && Math.random() < .06) { this.swatCd = this.t + 4; this.shot('swat', .45) }
    }
    this.pp = { ...p, ts: e.timeStamp }; this.lastPtr = this.t; this.wake()
  }

  private onDown = (e: PointerEvent) => {
    const p = this.toSvg(e.clientX, e.clientY); if (!p) return
    this.lastAct = this.t
    if (this.sleeping) { this.sleeping = false; this.jump(22, .45); this.spawn('bang', 175, 40); return this.emit('startle') }
    if (Math.hypot(p.x - NOSE.x, p.y - NOSE.y) < 13) { this.shot('boop', 1.5); this.spawn('spark', 150, 118); return this.emit('boop') }
    if (this.onEar(p, 'L')) { this.twL = 34; return this.emit('ear') }
    if (this.onEar(p, 'R')) { this.twR = 34; return this.emit('ear') }
    if (this.nearTail(p, 15)) { this.whip = 1; this.temper = Math.max(-1, this.temper - TEMPER.tailTapLoss); this.shot('annoyed', 1.3); return this.emit('tail') }
    const pawHit = (s: 'L' | 'R') => inEll(p, { ...PAW[s], rx: PAW[s].rx + 3, ry: PAW[s].ry + 3 })
    if (pawHit('L')) { this.shot('pawL', .9); this.spawn('spark', 90, 225); return this.emit('paw') }
    if (pawHit('R')) { this.shot('pawR', .9); this.spawn('spark', 170, 225); return this.emit('paw') }
    if (inEll(p, HEAD)) { this.shot('curious', 1.4); this.spawn('q', 180, 45); return this.emit('head') }
    if (inEll(p, { ...BODY, rx: 60, ry: 56 })) { this.shot('meow', .75); this.jump(8, .3); this.spawn('note', 175, 110); return this.emit('meow') }
  }

  private wake() {
    if (this.sleeping) { this.sleeping = false; this.spawn('q', 170, 45); this.shot('curious', 1.2); this.emit('wake') }
    this.yawned = false; this.lastAct = this.t
  }

  // ————— timeline helpers —————

  private shot(n: Shot, dur: number) { this.shots[n] = { t0: this.t, dur } }
  private prog(n: Shot): number | null {
    const o = this.shots[n]; if (!o) return null
    const p = (this.t - o.t0) / o.dur
    if (p >= 1) { delete this.shots[n]; return null }
    return Math.max(0, p)
  }
  /** 0→1→0 curve for a one-off motion */
  private bell(n: Shot) { const p = this.prog(n); return p === null ? null : Math.sin(Math.PI * p) }
  private jump(h: number, dur: number) { this.jumpH = h; this.shot('jump', dur); this.landAt = this.t + dur }
  private hearts(n: number) { this.heartsLeft = n; this.nextHeart = this.t }

  private onMoodEnter(m: AnyMood) {
    this.sleeping = false; this.lastAct = this.t; this.nextMoodFx = this.t + 1.4
    switch (m) {
      case 'scared': this.jump(32, .5); this.spawn('bang', 188, 32); this.whip = .6; break
      case 'happy': this.jump(22, .42); this.hopAgain = this.t + .6; this.hearts(4); break
      case 'think': this.spawn('q', 182, 38); break
      case 'excited': this.jump(7, .25); this.spawn('spark', 190, 50); this.spawn('spark', 70, 55); break
      case 'sulk': this.spawn('word', 70, 50, this.words.hmpf); this.whip = .5; break
      case 'sad': this.spawn('word', 185, 45, '…'); break
      case 'love': this.hearts(5); break
      case 'angry': this.jump(10, .3); this.spawn('word', 200, 60, this.words.hissLoud); break
      case 'playful': this.jump(6, .25); break
      case 'hungry': this.spawn('word', 195, 70, this.words.yum); break
      case 'smug': this.spawn('word', 195, 60, this.words.hehe); break
      case 'zany': this.jump(12, .3); this.spawn('word', 200, 55, this.words.bleh); break
    }
  }

  spawn(kind: FxKind, x: number, y: number, text?: string) {
    const c = FX[kind]
    const el = document.createElementNS(NS, 'text')
    el.textContent = text ?? c.glyph
    el.setAttribute('text-anchor', 'middle')
    el.setAttribute('font-size', String(c.size))
    el.setAttribute('font-weight', String(c.weight ?? 700))
    el.setAttribute('opacity', '0')
    el.style.fill = c.fill
    this.el.fx.appendChild(el)
    this.fx.push({ el, kind, x, y, vx: (c.vx ?? 0) + rand(-6, 6), vy: c.vy, life: 0, max: c.life, seed: rand(0, 6) })
  }

  // ————— frame —————

  private loop = (now: number) => {
    try { this.frame(now) } catch (err) { console.error(err) }
    this.raf = requestAnimationFrame(this.loop)
  }

  private frame(now: number) {
    const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt
    const mood = this.resolveMood(dt)
    const purring = this.updateBehaviour(mood, dt)
    let key: AnyMood = mood
    if (this.sleeping) key = 'sleep'
    if (purring && this.tStage < 2) key = 'purr'
    const T: Targets = { ...BASE, ...MOODS[key], lx: 0, ly: 0 }
    this.applyGaze(T)
    const { eyeMode, blep } = this.applyShots(T)
    if (T.mm === 'zany') { T.tilt += Math.sin(this.t * 5) * 6; T.hx += Math.sin(this.t * 5) * 2 }
    this.smooth(T, dt)
    const open = this.updateBlinkAndTwitch(dt)
    this.drawTail(dt)
    this.drawBody()
    this.drawEyes(T, eyeMode, open)
    this.drawMouth(T, blep)
    this.drawFaceDetails()
    this.drawPaws()
    this.ambientFx(T, purring)
    this.updateFx(dt)
  }

  private resolveMood(dt: number): Mood {
    this.temper *= Math.exp(-dt / TEMPER.decaySeconds)
    const st = [...TEMPER.stages].reverse().find(s => this.temper >= s.min) ?? TEMPER.stages[2]
    const stage = st.stage as TemperStage
    if (stage !== this.tStage) { const worse = stage < this.tStage; this.tStage = stage; this.emit(temperEvent(stage, worse)) }
    const mood: Mood = (st.mood as Mood | null) ?? this.moodProp
    if (mood !== this.mood) { const first = this.mood === null; this.mood = mood; if (!first) this.onMoodEnter(mood) }
    return mood
  }

  private updateBehaviour(mood: Mood, dt: number): boolean {
    const t = this.t
    if (this.hopAgain && t > this.hopAgain) { this.hopAgain = 0; this.jump(14, .36) }
    if (this.landAt && t > this.landAt) { this.landAt = 0; this.shot('land', .24) }
    if (this.heartsLeft > 0 && t > this.nextHeart) { this.spawn('heart', rand(60, 200), rand(40, 90)); this.heartsLeft--; this.nextHeart = t + .3 }
    this.petAcc = Math.max(0, this.petAcc - dt * 120)
    if (this.petAcc > 160 && this.temper > -.3) {
      if (t > this.purrUntil) { this.emit('pet'); this.hearts(1) }
      this.purrUntil = t + 1.4; this.petAcc = 160
    }
    const purring = t < this.purrUntil
    if (mood === 'idle' && !purring) {
      const idle = t - this.lastAct
      if (idle > (this.opts.yawnAfter ?? 9) && !this.yawned) { this.yawned = true; this.shot('yawn', 1.9) }
      if (idle > (this.opts.sleepAfter ?? 11) && !this.sleeping) { this.sleeping = true; this.nextZ = t }
    }
    return purring
  }

  private applyGaze(T: Targets) {
    let tx: number, ty: number
    if (this.pp && this.t - this.lastPtr < 2.5) {
      tx = clamp((this.pp.x - 130) / 110, -1, 1); ty = clamp((this.pp.y - 110) / 110, -1, 1)
    } else {
      if (this.t > this.wander.next) this.wander = { x: Math.random() < .35 ? 0 : rand(-1, 1), y: rand(-.5, .6), next: this.t + rand(1.5, 4) }
      tx = this.wander.x; ty = this.wander.y
    }
    const w = T.look
    T.lx = tx * 4.5 * w; T.ly = ty * 4 * w + T.dly
    T.hx += tx * 3 * w; T.hy += ty * 2 * w; T.tilt += tx * 3 * w
  }

  private applyShots(T: Targets): { eyeMode: EyeMode; blep: boolean } {
    let e: number | null, eyeMode = T.eye, blep = false
    if ((e = this.bell('curious')) !== null) { T.tilt += 14 * e; T.earR += 12 * e; T.pupil += .25 * e }
    if ((e = this.bell('annoyed')) !== null) { T.earL += 28 * e; T.earR += 28 * e; T.whisk -= 8 * e; T.pupil -= .3 * e }
    if ((e = this.bell('meow')) !== null) { T.mouth = Math.max(T.mouth, e); T.hy -= 4 * e; T.earL -= 5 * e; T.earR -= 5 * e }
    if ((e = this.bell('yawn')) !== null) { T.mouth = Math.max(T.mouth, 1.25 * e); T.open = Math.min(T.open, 1 - e * .85); T.hy -= 5 * e; T.earL += 14 * e; T.earR += 14 * e }
    const p = this.prog('boop')
    if (p !== null) { if (p < .22) eyeMode = 'closed'; blep = p > .12 && p < .9; T.whisk += 8 * Math.sin(Math.PI * p) }
    return { eyeMode, blep }
  }

  private smooth(T: Targets, dt: number) {
    const fast = 1 - Math.exp(-dt * 10), slow = 1 - Math.exp(-dt * 5)
    const s = this.s as Record<string, number>
    for (const key in T) {
      const v = (T as unknown as Record<string, unknown>)[key]
      if (typeof v !== 'number' || INSTANT_PARAMS.has(key as NumericParam)) continue
      s[key] += (v - s[key]) * (SLOW_PARAMS.has(key as NumericParam) ? slow : fast)
    }
  }

  private updateBlinkAndTwitch(dt: number): number {
    const t = this.t
    if (t > this.nextBlink) { this.blinkAt = t; this.nextBlink = t + rand(2, 5.5); if (Math.random() < .25) this.dbl = t + .24 }
    if (this.dbl && t > this.dbl) { this.blinkAt = t; this.dbl = 0 }
    if (t > this.nextTwitch) { if (Math.random() < .5) this.twL = 16; else this.twR = 16; if (Math.random() < .4) this.whTw = 1; this.nextTwitch = t + rand(3, 8) }
    this.twL *= Math.exp(-dt * 6); this.twR *= Math.exp(-dt * 6); this.whTw *= Math.exp(-dt * 5); this.whip *= Math.exp(-dt * 2.5)
    const bp = (t - this.blinkAt) / .16
    return Math.max(.05, this.s.open * (bp < 1 ? Math.abs(1 - 2 * bp) : 1))
  }

  private drawTail(dt: number) {
    const s = this.s, t = this.t
    this.phase += dt * s.freq * 2
    let { x, y } = TAIL.origin, a = TAIL.angle
    const pts: [number, number][] = [[x, y]], N = TAIL.segments
    for (let i = 1; i <= N; i++) {
      const f = i / N
      a += s.curl * .75 + s.amp * .5 * Math.sin(this.phase - i * .6) * f + this.whip * .45 * Math.sin(t * 15 - i * .5) * f
      x += Math.cos(a) * TAIL.segLen; y += Math.sin(a) * TAIL.segLen; pts.push([x, y])
    }
    this.tailPts = pts
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
    for (let i = 1; i < N; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2
      d += `Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`
    }
    d += `L${pts[N][0].toFixed(1)} ${pts[N][1].toFixed(1)}`
    set(this.el.tail, 'd', d)
    set(this.el.tail, 'stroke-width', (s.tw + (s.tw > 20 ? Math.sin(t * 40) * 1.2 : 0)).toFixed(1))
  }

  private drawBody() {
    const s = this.s, t = this.t, E = this.el
    const br = Math.sin(t * 2.1 / s.breath)
    let sq = 1 + .013 * s.breath * br, jy = 0, p: number | null
    if ((p = this.prog('jump')) !== null) { jy = -this.jumpH * 4 * p * (1 - p); sq += .06 * Math.sin(Math.PI * p) }
    if ((p = this.prog('land')) !== null) sq -= .09 * Math.sin(Math.PI * p)
    const { x: gx, y: gy } = GROUND
    set(E.root, 'transform', `translate(0 ${f2(jy + s.by)}) rotate(${f2(s.wig * 3.5 * Math.sin(t * 13))} ${gx} ${gy}) translate(${gx} ${gy}) scale(${(1 / Math.sqrt(sq)).toFixed(4)} ${sq.toFixed(4)}) translate(${-gx} ${-gy})`)
    const lift = clamp(-(jy + s.by) / 60, 0, 1)
    set(E.shadow, 'rx', (70 * (1 - lift * .35)).toFixed(1))
    set(E.shadow, 'opacity', (.08 * (1 - lift * .5)).toFixed(3))
    set(E.head, 'transform', `translate(${f2(s.hx)} ${f2(s.hy + br * .9 * s.breath)}) rotate(${f2(s.tilt)} ${NECK.x} ${NECK.y})`)
    const ear = (base: number, tw: number) => clamp(base, -10, 22) + tw * .6 * Math.abs(Math.sin(t * 30))
    const eL = ear(s.earL, this.twL), eR = ear(s.earR, this.twR)
    set(E.earL, 'transform', `translate(0 ${f2(Math.max(0, eL) * .25)}) rotate(${f2(-eL)} ${EAR.L.pivot.x} ${EAR.L.pivot.y})`)
    set(E.earR, 'transform', `translate(0 ${f2(Math.max(0, eR) * .25)}) rotate(${f2(eR)} ${EAR.R.pivot.x} ${EAR.R.pivot.y})`)
  }

  private drawEyes(T: Targets, mode: EyeMode, open: number) {
    const s = this.s, t = this.t, E = this.el
    const part = (n: string) => E[n as Part]
    const beat = (1 + .12 * Math.max(0, Math.sin(t * 7))).toFixed(3)
    for (const side of ['L', 'R'] as const) {
      const cx = EYE[side].cx
      show(part(`heart${side}`), mode === 'heart')
      set(part(`heart${side}`), 'transform', `translate(${cx} ${EYE_Y}) scale(${beat}) translate(${-cx} ${-EYE_Y})`)
      show(part(`eyeO${side}`), mode === 'open')
      set(part(`eyeO${side}`), 'transform', `translate(0 ${EYE_Y}) scale(1 ${open.toFixed(3)}) translate(0 ${-EYE_Y})`)
      set(part(`pup${side}`), 'transform', `translate(${f2(cx + s.lx)} ${f2(EYE_Y + s.ly)}) scale(${(s.pupil * s.px).toFixed(3)} ${s.pupil.toFixed(3)})`)
      show(part(`happy${side}`), mode === 'happy')
      show(part(`closed${side}`), mode === 'closed')
    }
    if (T.mm === 'zany' && mode === 'open') {
      const cx = EYE.L.cx
      set(E.eyeOL, 'transform', `translate(${cx} 106) scale(1.3 ${(1.3 * open).toFixed(3)}) translate(${-cx} -106)`)
      set(E.pupL, 'transform', `translate(${f2(cx + 3.5 * Math.cos(t * 4))} ${f2(EYE_Y + 4 * Math.sin(t * 4))}) scale(1.25)`)
      show(E.eyeOR, false); show(E.happyR, true)
    }
  }

  /** Exactly one mouth shape is ever visible; priority: open > sad > smile > mood-specific > "w". */
  private drawMouth(T: Targets, blep: boolean) {
    const s = this.s, t = this.t, E = this.el
    const mOpen = s.mouth > .12
    set(E.mouthO, 'ry', f2(9 * clamp(s.mouth, 0, 1.3)))
    show(E.mouthO, mOpen)
    show(E.fangs, mOpen && T.mm === 'hiss')
    show(E.blep, blep && !mOpen)
    const frown = !mOpen && s.frw > .5
    const smile = !mOpen && !frown && s.sml > .5 && !blep
    const alt = !mOpen && !frown && !smile ? T.mm : null
    show(E.frown, frown); show(E.smile, smile)
    show(E.smirk, alt === 'smirk'); show(E.squig, alt === 'squig')

    let lk = 0, lq = 0
    if (alt === 'lick') {
      const ph = (t % 2.6) / 2.6
      if (ph < .6) { const p = ph / .6; lk = Math.min(1, p / .15, (1 - p) / .15); lq = clamp((p - .12) / .76, 0, 1) }
    }
    if (alt === 'zany') lk = 1
    const licking = lk > .02
    show(E.mouthW, !mOpen && !frown && !smile && alt !== 'smirk' && alt !== 'squig' && !licking)
    show(E.lick, licking)
    if (!licking) return
    set(E.lickMouth, 'transform', `translate(130 138) scale(1 ${clamp(lk * 1.4, .25, 1).toFixed(3)}) translate(-130 -138)`)
    let d: string
    if (alt === 'zany') {
      const wx = Math.sin(t * 7) * 3.5
      d = `M130 145Q${(133 + wx * .4).toFixed(1)} 157 ${(137 + wx).toFixed(1)} 161`
    } else {
      // The tongue emerges from the bottom of the mouth, then traces a full circle around the mouth.
      const ang = (90 - 360 * lq) * Math.PI / 180
      const bx = 130, by = 146, rx = 12 * lk, ry = 3 + 6 * lk
      const ext = Math.min(1, lq / .12)
      const tx = 130 + Math.cos(ang) * rx, ty = 142 + Math.sin(ang) * ry + (1 - ext) * 10 * lk
      const cx = (bx + tx) / 2 + Math.cos(ang) * 2, cy = Math.max(by, ty) + 3
      d = `M${bx} ${by}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`
    }
    set(E.tongueO, 'd', d); set(E.tongueI, 'd', d)
  }

  private drawFaceDetails() {
    const s = this.s, E = this.el
    show(E.lidL, s.lid); show(E.lidR, s.lid)
    show(E.lidFL, s.lidF); show(E.lidFR, s.lidF)
    show(E.brows, s.brow); show(E.browsA, s.browA); show(E.browQ, s.bq)
    show(E.blushL, s.blush * .8); show(E.blushR, s.blush * .8)
    const wt = s.whisk + 4 * Math.sin(this.t * 23) * this.whTw
    set(E.whL, 'transform', `rotate(${f2(wt)} ${WHISKER.L.pivot.x} ${WHISKER.L.pivot.y})`)
    set(E.whR, 'transform', `rotate(${f2(-wt)} ${WHISKER.R.pivot.x} ${WHISKER.R.pivot.y})`)
  }

  private drawPaws() {
    const s = this.s, t = this.t
    const L = { x: 0, y: s.knead * -5 * Math.max(0, Math.sin(t * 7)), r: 0 }
    const R = { x: 0, y: s.knead * -5 * Math.max(0, Math.sin(t * 7 + Math.PI)), r: 0 }
    let e: number | null
    if ((e = this.bell('pawL')) !== null) { L.x -= 6 * e; L.y -= 34 * e; L.r -= 22 * e }
    if ((e = this.bell('pawR')) !== null) { R.x += 6 * e; R.y -= 34 * e; R.r += 22 * e }
    if ((e = this.bell('swat')) !== null) { R.x += 22 * e; R.y -= 36 * e; R.r += 40 * e }
    set(this.el.pawL, 'transform', `translate(${f2(L.x)} ${f2(L.y)}) rotate(${f2(L.r)} ${PAW.L.cx} ${PAW.L.cy})`)
    set(this.el.pawR, 'transform', `translate(${f2(R.x)} ${f2(R.y)}) rotate(${f2(R.r)} ${PAW.R.cx} ${PAW.R.cy})`)
  }

  private ambientFx(T: Targets, purring: boolean) {
    const t = this.t
    if (T.mfx && t > this.nextMoodFx) {
      const k = T.mfx
      this.nextMoodFx = t + (k === 'heart' ? .7 : k === 'spark' ? 1.1 : 1.9)
      if (k === 'heart') this.spawn('heart', rand(60, 200), rand(40, 80))
      else if (k === 'q') this.spawn('q', 185, 40)
      else if (k === 'spark') this.spawn('spark', rand(50, 210), rand(150, 230))
      else this.spawn('word', rand(185, 205), rand(55, 80), this.words[k])
    }
    if (purring && t > this.nextPurrFx) { this.spawn('prr', rand(175, 205), rand(95, 125), this.words.purr); this.nextPurrFx = t + .7 }
    if (this.sleeping && t > this.nextZ) { this.spawn('z', 170, 62); this.nextZ = t + 1.1 }
  }

  private updateFx(dt: number) {
    this.fx = this.fx.filter(f => {
      f.life += dt
      if (f.life > f.max) { f.el.remove(); return false }
      const c = FX[f.kind]
      f.x += f.vx * dt + (c.sway ? Math.sin(f.life * 4 + f.seed) * 14 * dt : 0); f.y += f.vy * dt
      const a = f.life < .15 ? f.life / .15 : clamp(1 - (f.life - f.max * .6) / (f.max * .4), 0, 1)
      let sc = 1
      if (c.pop) sc = 1 + .7 * Math.exp(-f.life * 9) * Math.cos(f.life * 20)
      if (f.kind === 'z') sc = .6 + f.life / f.max * .9
      if (f.kind === 'heart') sc = .7 + Math.min(.5, f.life * 1.5)
      set(f.el, 'transform', `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) scale(${sc.toFixed(3)})`)
      set(f.el, 'opacity', a.toFixed(3))
      return true
    })
  }
}
