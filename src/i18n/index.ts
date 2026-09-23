import { computed, ref, watchEffect } from 'vue'
import type { Messages } from './types'
import { hu } from './hu'
import { en } from './en'

export type { Messages, SubjectText } from './types'

const LOCALES = { hu, en } satisfies Record<string, Messages>
export type Locale = keyof typeof LOCALES
export const DEFAULT_LOCALE: Locale = 'hu'

const isLocale = (v: unknown): v is Locale => typeof v === 'string' && v in LOCALES

/** `?lang=en` wins, then the browser's preferred languages, then Hungarian. */
function detect(): Locale {
  const forced = new URLSearchParams(location.search).get('lang')
  if (isLocale(forced)) return forced
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}

export const locale = ref<Locale>(detect())
export const t = computed<Messages>(() => LOCALES[locale.value])

watchEffect(() => { document.documentElement.lang = locale.value })

export const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)]
