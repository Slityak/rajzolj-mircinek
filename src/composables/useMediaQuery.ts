import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Reactive media query, e.g. useMediaQuery('(max-width: 640px)') */
export function useMediaQuery(query: string) {
  const matches = ref(false)
  let mql: MediaQueryList | null = null
  const update = () => { matches.value = !!mql?.matches }
  onMounted(() => { mql = window.matchMedia(query); update(); mql.addEventListener('change', update) })
  onBeforeUnmount(() => mql?.removeEventListener('change', update))
  return matches
}
