<script setup lang="ts">
import ProgressBar from '@/components/ui/ProgressBar.vue'
import { t } from '@/i18n'
defineProps<{ guess: { emoji: string; text: string } | null; pct: number; correct: boolean }>()
</script>

<template>
  <div class="meter">
    <div class="meter__row">
      <div class="meter__guess">
        <span class="meter__label meter__label--long">{{ t.guessLabel }}</span>
        <span class="meter__label meter__label--short">{{ t.guessLabelShort }}</span>
        <span v-if="guess" aria-hidden="true">{{ guess.emoji }}</span>
        <strong>{{ guess ? guess.text : t.nothingYet }}</strong>
      </div>
      <strong v-if="guess" class="meter__pct">{{ pct }}%</strong>
    </div>
    <ProgressBar :value="pct" :tone="correct ? 'success' : 'warning'" variant="outlined" :label="t.a11y.confidence" />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

.meter {
  display: flex;
  flex-direction: column;
  gap: space(2);

  &__row { display: flex; justify-content: space-between; align-items: center; gap: space(2); font-size: 15px; }
  &__guess {
    display: flex; align-items: center; gap: 6px; font-weight: $fw-semibold; min-width: 0; white-space: nowrap;
    // One line only, so a long guess never changes the height above the board.
    strong { font-weight: $fw-bold; overflow: hidden; text-overflow: ellipsis; }
  }
  &__pct { font-size: 14px; font-weight: $fw-bold; }
  &__label--short { display: none; }

  @include mobile {
    gap: 6px;
    &__row { font-size: 14px; }
    &__pct { font-size: 13px; }
    &__label--long { display: none; }
    &__label--short { display: inline; }
  }
}
</style>
