import { computed, onBeforeUnmount, reactive, type InjectionKey } from 'vue'
import type { Mood, CatGesture } from '@/cat'
import { SUBJECTS, TASK_KEYS, type SubjectKey, type TaskKey } from '@shared/subjects'
import { isAccepted, type JudgeResponse } from '@shared/judge'
import { t, pick } from '@/i18n'
import { judgeDrawing } from './judge'
import { REACTION_MOODS, isReactionKey } from './reactions'
import type { Overlay, RoundOutcome, RoundResult, Screen, Stroke } from './types'

export interface GameOptions {
  rounds?: number
  roundSeconds?: number
  /** Minimum gap between two judge (Jev) calls while drawing (ms) */
  evalEveryMs?: number
}

interface GameState {
  screen: Screen
  round: number
  time: number
  score: number
  subjects: TaskKey[]
  guess: SubjectKey | null
  confidence: number
  speech: string
  overlay: Overlay | null
  mood: Mood
  results: RoundResult[]
}

/** Minimum confidence of a wrong guess before Mirci reacts to it (see reactions.ts). */
const REACT_CONFIDENCE = .3
const MIN_ROUND_SECONDS = 1.5

function shuffle<T>(a: readonly T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

/** Mirci's mood after a won round, depending on what was drawn. */
function winMood(key: TaskKey): Mood {
  if (key === 'heart') return 'love'
  if (key === 'fish' || key === 'mouse') return 'hungry'
  return 'happy'
}

const inkOf = (s: readonly Stroke[]) => s.reduce((n, st) => n + st.length, 0)

export function useGame(opts: GameOptions = {}) {
  const ROUNDS = opts.rounds ?? 5
  const SECS = opts.roundSeconds ?? 20
  const EVAL_MS = opts.evalEveryMs ?? 900

  const state = reactive<GameState>({
    screen: 'intro', round: 0, time: SECS, score: 0, subjects: [], guess: null, confidence: 0,
    speech: t.value.introSpeech, overlay: null, mood: 'idle', results: []
  })

  // Non-reactive runtime state
  let strokes: readonly Stroke[] = []
  let canvasSize = 1
  let timer: ReturnType<typeof setInterval> | undefined
  let t0 = 0, lastEval = 0, moodLock = 0
  /** Hard hold: a gesture, reaction or error line stays up until then. */
  let holdSpeech = 0
  /** Soft limit: mood-only line changes (same guess) are rate limited until then. */
  let speechLock = 0
  /** The guess the bubble last talked about, so the bubble never contradicts the meter for long. */
  let spokenGuess: SubjectKey | null = null
  let lastRes: JudgeResponse | null = null
  let active = false, offlineShown = false
  /** Reactions already shown this round, so each fires only once. */
  let reacted = new Set<SubjectKey>()
  /** Set when Jev accepted the drawing before MIN_ROUND_SECONDS; the win is declared once that has passed. */
  let pendingWin = false
  /** Amount of ink the last judge call saw; a new call is only made when it changes. */
  let judgedInk = 0
  let inflight: AbortController | null = null
  let roundId = 0

  const subject = computed<TaskKey>(() => state.subjects[state.round] ?? TASK_KEYS[0])

  function start() {
    Object.assign(state, { screen: 'game', round: 0, score: 0, results: [], subjects: shuffle(TASK_KEYS).slice(0, ROUNDS) })
    beginRound()
  }

  function beginRound() {
    cancelJudge()
    roundId++
    strokes = []; judgedInk = 0; reacted = new Set(); pendingWin = false; moodLock = 0; holdSpeech = 0; speechLock = 0; spokenGuess = null; lastRes = null; lastEval = 0; active = true
    Object.assign(state, { time: SECS, guess: null, confidence: 0, overlay: null, mood: 'watch', speech: pick(t.value.watch) })
    t0 = performance.now()
    clearInterval(timer)
    timer = setInterval(tick, 100)
  }

  function tick() {
    if (!active) return
    const now = performance.now()
    const elapsed = (now - t0) / 1000
    state.time = Math.max(0, SECS - elapsed)
    if (state.time <= 0) return endRound('timeout')
    if (pendingWin && elapsed > MIN_ROUND_SECONDS) return endRound('win')
    if (moodLock && now > moodLock) moodLock = 0
    // A held line has expired but the drawing hasn't changed: let the bubble catch up with the meter.
    if (lastRes && !inflight && now > holdSpeech && state.guess !== spokenGuess) apply(lastRes, elapsed)
    const ink = inkOf(strokes)
    if (ink && ink !== judgedInk && !inflight && now - lastEval > EVAL_MS) { lastEval = now; void evaluate(ink) }
  }

  async function evaluate(ink: number) {
    const id = roundId
    judgedInk = ink
    inflight = new AbortController()
    let res: JudgeResponse
    try {
      res = await judgeDrawing(subject.value, strokes, canvasSize, inflight.signal)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      console.warn(err)
      judgedInk = 0 // retry on the next tick window
      if (id === roundId && active && !offlineShown) {
        offlineShown = true; holdSpeech = performance.now() + 2500
        Object.assign(state, { mood: 'confused', speech: t.value.judgeOffline })
      }
      return
    } finally {
      if (id === roundId) inflight = null
    }
    if (id !== roundId || !active) return
    offlineShown = false
    lastRes = res
    apply(res, (performance.now() - t0) / 1000)
  }

  function apply(res: JudgeResponse, elapsed: number) {
    const target = subject.value
    const guess = res.guess, confidence = guess ? res.confidence : 0
    pendingWin = isAccepted(res, target)
    if (pendingWin) {
      state.guess = guess; state.confidence = confidence
      if (elapsed > MIN_ROUND_SECONDS) endRound('win')
      return
    }
    const now = performance.now()
    const T = t.value
    let mood: Mood, speech: string | null = null
    if (guess && guess !== target && isReactionKey(guess) && confidence > REACT_CONFIDENCE && !reacted.has(guess)) {
      reacted.add(guess); moodLock = holdSpeech = now + 2200; spokenGuess = guess
      mood = REACTION_MOODS[guess]; speech = T.reactions[guess]
    } else if (moodLock) mood = state.mood
    else mood = confidence < .25 ? 'watch' : confidence < .5 ? 'think' : 'excited'

    if (!speech && now > holdSpeech && (guess !== spokenGuess || (mood !== state.mood && now > speechLock))) {
      const phrase = guess ? T.subjects[guess].guess : ''
      speech = mood === 'watch' || !guess ? pick(T.watch) : mood === 'think' ? pick(T.think)(phrase) : mood === 'excited' ? pick(T.excited)(phrase) : null
      if (speech) { speechLock = now + 1400; spokenGuess = guess }
    }
    state.guess = guess; state.confidence = confidence; state.mood = mood
    if (speech) state.speech = speech
  }

  function cancelJudge() { inflight?.abort(); inflight = null }

  function endRound(kind: RoundOutcome) {
    if (!active) return
    active = false; clearInterval(timer); cancelJudge()
    const key = subject.value, T = t.value
    const won = kind === 'win'
    const gain = won ? 100 + Math.round(state.time * 10) : 0
    state.overlay = { kind, gain }
    state.score += gain
    state.speech = won ? T.win(key, T.subjects[key]) : kind === 'timeout' ? T.timeout : T.gaveUp
    state.mood = won ? winMood(key) : kind === 'timeout' ? 'sulk' : 'sad'
    state.results.push({ subject: key, won })
  }

  function next() {
    if (state.round < ROUNDS - 1) { state.round++; beginRound(); return }
    const wins = state.results.filter(r => r.won).length
    Object.assign(state, {
      screen: 'final',
      mood: wins >= 4 ? 'smug' : wins >= 2 ? 'happy' : 'sulk',
      speech: wins >= 3 ? t.value.finalGood : t.value.finalMeh
    })
  }

  /** Call after the board was cleared. */
  function cleared() {
    if (!active) return
    cancelJudge()
    strokes = []; judgedInk = 0; reacted = new Set(); pendingWin = false; lastRes = null
    moodLock = performance.now() + 1600
    Object.assign(state, { guess: null, confidence: 0, mood: 'confused', speech: t.value.cleared })
  }

  const giveUp = () => endRound('giveup')

  function onGesture(g: CatGesture) {
    if (state.overlay && g !== 'pet') return
    holdSpeech = performance.now() + 2000
    state.speech = pick(t.value.gestures[g] ?? ['Mrr.'])
  }

  function setStrokes(s: readonly Stroke[], size: number) { strokes = s; canvasSize = size }
  /** Requests an immediate judgement when a stroke is finished. */
  function strokeEnded() { lastEval = 0 }

  onBeforeUnmount(() => { clearInterval(timer); cancelJudge() })

  const view = computed(() => {
    const g = state.guess
    return {
      roundLabel: `${state.round + 1}/${ROUNDS}`,
      timeLabel: t.value.seconds(Math.ceil(state.time)),
      timePct: (state.time / SECS) * 100,
      timeLow: state.time <= SECS * .3,
      guess: g ? { emoji: SUBJECTS[g].emoji, text: t.value.subjects[g].guess } : null,
      guessPct: g ? Math.round(state.confidence * 100) : 0,
      guessCorrect: g === subject.value,
      isLastRound: state.round >= ROUNDS - 1,
      canDraw: active && !state.overlay
    }
  })

  return {
    state, subject, view, rounds: ROUNDS, roundSeconds: SECS,
    start, next, giveUp, cleared, onGesture, setStrokes, strokeEnded
  }
}

export type Game = ReturnType<typeof useGame>
export const GAME_KEY: InjectionKey<Game> = Symbol('game')
