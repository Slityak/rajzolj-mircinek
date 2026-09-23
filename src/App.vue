<script setup lang="ts">
import { computed, provide } from 'vue'
import { MOOD_NAMES, type Mood } from '@/cat'
import { useGame, GAME_KEY } from '@/game/useGame'
import IntroScreen from '@/screens/IntroScreen.vue'
import GameScreen from '@/screens/GameScreen.vue'
import FinalScreen from '@/screens/FinalScreen.vue'

const game = useGame({ rounds: 5, roundSeconds: 20 })
provide(GAME_KEY, game)

/** Dev aid: ?mood=zany pins Mirci's mood (same as the design prototype's "mood" tweak). */
const forced = new URLSearchParams(location.search).get('mood') as Mood | null
const mood = computed<Mood>(() => (forced && MOOD_NAMES.includes(forced) ? forced : game.state.mood))

const screens = { intro: IntroScreen, game: GameScreen, final: FinalScreen } as const
</script>

<template>
  <div class="shell">
    <main class="shell__device">
      <component :is="screens[game.state.screen]" :mood="mood" />
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

.shell {
  min-height: 100vh;

  @include mobile {
    min-height: 100dvh;
    display: flex;
    justify-content: center;
    background: var(--c-bg-outer);
    overscroll-behavior: none;

    &__device {
      width: 100%;
      max-width: $mobile-max;
      // Fixed height so the game screen can fit its board into it; taller screens scroll inside.
      height: 100dvh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      background: var(--c-bg);
      padding: max(16px, env(safe-area-inset-top)) 18px max(18px, env(safe-area-inset-bottom));
      // Screens center themselves with `margin: 0 auto`, which in a flex column would shrink them
      // to their content (the width then follows the bubble text). Always use the full width.
      > * { flex: 1; width: 100%; margin-inline: 0; }
    }
  }
}
</style>
