<script setup lang="ts">
import { inject } from 'vue'
import { MirciCat, type Mood } from '@/cat'
import BaseButton from '@/components/ui/BaseButton.vue'
import SpeechBubble from '@/components/ui/SpeechBubble.vue'
import ResultChip from '@/components/ui/ResultChip.vue'
import { GAME_KEY } from '@/game/useGame'
import { SUBJECTS } from '@shared/subjects'
import { t } from '@/i18n'

defineProps<{ mood: Mood }>()
const game = inject(GAME_KEY)!
</script>

<template>
  <section class="final" data-screen="final">
    <MirciCat class="final__cat" :mood="mood" :words="t.catWords" :label="t.a11y.cat" @gesture="game.onGesture" />
    <h1 class="final__title">{{ t.finalTitle }}</h1>
    <div class="final__score">{{ t.points(game.state.score) }}</div>
    <ul class="final__results">
      <li v-for="(r, i) in game.state.results" :key="i">
        <ResultChip :emoji="SUBJECTS[r.subject].emoji" :label="t.subjects[r.subject].label" :won="r.won" />
      </li>
    </ul>
    <SpeechBubble class="final__bubble" :text="game.state.speech" />
    <BaseButton size="lg" class="final__cta" @click="game.start">{{ t.again }}</BaseButton>
  </section>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

.final {
  min-height: 100vh;
  max-width: 560px;
  margin: 0 auto;
  padding: space(10) space(6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  text-align: center;

  &__cat { width: 250px; height: 260px; }
  &__title { font-size: 44px; font-weight: $fw-black; line-height: 1; }
  &__score { font-size: 22px; font-weight: $fw-bold; color: var(--c-ink-soft); }
  &__results { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: space(2); }
  &__bubble { width: 100%; max-width: 400px; margin-top: 6px; text-align: left; }

  @include mobile {
    min-height: 100dvh;
    padding: 0;
    justify-content: flex-start;
    gap: 14px;
    &__cat { width: 230px; height: 240px; margin-top: space(3); }
    &__title { font-size: 36px; }
    &__score { font-size: 20px; }
    &__bubble { max-width: none; margin-top: 0; }
    &__cta { width: 100%; margin-top: auto; }
  }
}
</style>
