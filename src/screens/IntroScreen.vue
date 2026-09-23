<script setup lang="ts">
import { inject } from 'vue'
import { MirciCat, type Mood } from '@/cat'
import BaseButton from '@/components/ui/BaseButton.vue'
import SpeechBubble from '@/components/ui/SpeechBubble.vue'
import GameTitle from '@/components/ui/GameTitle.vue'
import LanguageSwitch from '@/components/ui/LanguageSwitch.vue'
import { GAME_KEY } from '@/game/useGame'
import { t } from '@/i18n'

defineProps<{ mood: Mood }>()
const game = inject(GAME_KEY)!
</script>

<template>
  <section class="intro" data-screen="intro">
    <LanguageSwitch class="intro__lang" />
    <div class="intro__copy">
      <GameTitle :lines="t.title" />
      <p class="intro__lead">{{ t.intro }}</p>
      <BaseButton size="lg" class="intro__cta" @click="game.start">{{ t.start }}</BaseButton>
    </div>
    <div class="intro__cat">
      <MirciCat class="intro__mirci" :mood="mood" :words="t.catWords" :label="t.a11y.cat" @gesture="game.onGesture" />
      <SpeechBubble class="intro__bubble" :text="game.state.speech" />
    </div>
  </section>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

.intro {
  position: relative;
  min-height: 100vh;
  max-width: $desktop-max;
  margin: 0 auto;
  padding: space(12) space(8);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: space(10);

  &__copy { flex: 1 1 380px; display: flex; flex-direction: column; align-items: flex-start; gap: 22px; }
  &__lead { max-width: 340px; font-size: 17px; line-height: 1.5; color: var(--c-ink-soft); font-weight: $fw-semibold; text-wrap: pretty; }
  &__cat { flex: 1 1 340px; display: flex; flex-direction: column; align-items: center; gap: 18px; }
  &__mirci { width: 320px; max-width: 100%; height: 340px; }
  &__bubble { width: 320px; max-width: 100%; }
  &__lang { position: absolute; top: space(6); right: space(8); }

  // Mobile: title → cat → bubble → lead → CTA at the bottom
  @include mobile {
    min-height: auto; // the shell is viewport-high and flex: 1 stretches us; taller content scrolls
    padding: 0;
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 14px;

    &__copy, &__cat { display: contents; }
    // Beside the short first title line, so it doesn't cost a row.
    &__lang { top: -8px; right: 0; z-index: 1; }
    :deep(.title) { order: 1; }
    // Mirci takes whatever height is left, so the CTA always fits on screen.
    &__mirci { order: 2; width: 100%; height: auto; flex: 1 1 0; min-height: 110px; max-height: 280px; }
    &__bubble { order: 3; width: 100%; }
    &__lead { order: 4; max-width: none; font-size: 16px; line-height: 1.45; }
    &__cta { order: 5; width: 100%; margin-top: auto; }
  }

  // Short phones: a smaller title leaves more room for Mirci.
  @media (max-width: $bp-mobile) and (max-height: 700px) {
    :deep(.title) { font-size: 36px; }
  }
  @media (max-width: $bp-mobile) and (max-height: 600px) {
    gap: 10px;
    &__lead { font-size: 15px; line-height: 1.35; }
    &__mirci { min-height: 90px; }
  }
}
</style>
