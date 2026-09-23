import { computed, ref, watchEffect } from 'vue'
import type { Messages } from './types'
import { hu } from './hu'
import { en } from './en'

export type { Messages, SubjectText } from './types'

const LOCALES = { hu, en } satisfies Record<string, Messages>
export type Locale = keyof typeof LOCALES
export const LOCALE_LIST = Object.keys(LOCALES) as Locale[]
export const localeName = (l: Locale) => LOCALES[l].languageName
const STORAGE_KEY = 'mirci.locale'
export const DEFAULT_LOCALE: Locale = 'hu'

const isLocale = (v: unknown): v is Locale => typeof v === 'string' && v in LOCALES

/** `?lang=en` wins, then the player's earlier choice, then the browser's languages, then Hungarian. */
function detect(): Locale {
  const forced = new URLSearchParams(location.search).get('lang')
  if (isLocale(forced)) return forced
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch { /* storage unavailable (private mode, blocked): fall through */ }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}

export const locale = ref<Locale>(detect())
export const t = computed<Messages>(() => LOCALES[locale.value])

/** Switches the UI language and remembers it for next time (best effort). */
export function setLocale(l: Locale) {
  locale.value = l
  try { localStorage.setItem(STORAGE_KEY, l) } catch { /* not persisted, still switched */ }
}

watchEffect(() => { document.documentElement.lang = locale.value })

export const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)]
