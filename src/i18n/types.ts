import type { CatGesture, CatWords } from '@/cat'
import type { SubjectKey, TaskKey } from '@shared/subjects'
import type { ReactionKey } from '@/game/reactions'

export interface SubjectText {
  /** Short name, e.g. on the result chips. */
  label: string
  /** How Mirci refers to it when guessing ("a fish"), used inside the guess lines. */
  guess: string
}

/** Every player-facing string. Add a language by implementing this interface (see hu.ts, en.ts). */
export interface Messages {
  title: readonly string[]
  intro: string
  introSpeech: string
  start: string
  again: string
  /** Back to the start screen. */
  home: string
  /** This language's own name, shown in the language switch ("Magyar", "English"). */
  languageName: string
  clear: string
  giveUp: string
  nextRound: string
  toResults: string
  round: string
  score: string
  guessLabel: string
  guessLabelShort: string
  nothingYet: string
  seconds: (n: number) => string
  points: (n: number) => string
  gain: (n: number) => string
  finalTitle: string
  winTitle: string
  loseTitle: string
  cleared: string
  win: (key: TaskKey, subject: SubjectText) => string
  timeout: string
  gaveUp: string
  finalGood: string
  finalMeh: string
  /** Shown when the judge (Jev) cannot be reached. */
  judgeOffline: string

  watch: readonly string[]
  think: readonly ((guess: string) => string)[]
  excited: readonly ((guess: string) => string)[]
  gestures: Record<CatGesture, readonly string[]>
  subjects: Record<SubjectKey, SubjectText>
  /** The full task sentence ("Draw a fish!"). Whole sentences, so every language can inflect freely. */
  tasks: Record<TaskKey, string>
  /** Mirci's line when she first suspects one of these (see game/reactions.ts). */
  reactions: Record<ReactionKey, string>
  /** Floating captions around Mirci. */
  catWords: CatWords

  /** Screen-reader-only labels. */
  a11y: {
    cat: string
    language: string
    board: string
    timeLeft: string
    confidence: string
    won: string
    lost: string
  }
}
