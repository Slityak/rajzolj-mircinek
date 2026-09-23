<script setup lang="ts">
import StatPill from '@/components/ui/StatPill.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import { t } from '@/i18n'

defineProps<{ roundLabel: string; score: number; timePct: number; timeLabel: string; timeLow: boolean }>()
</script>

<template>
  <header class="hud">
    <StatPill :label="t.round" :value="roundLabel" />
    <div class="hud__timer">
      <ProgressBar :value="timePct" :tone="timeLow ? 'warning' : 'success'" :duration="100" :label="t.a11y.timeLeft" />
      <span class="hud__time">{{ timeLabel }}</span>
    </div>
    <StatPill :label="t.score" :value="score" align="end" />
  </header>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

.hud {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 18px;
  align-items: start;

  &__timer { display: flex; flex-direction: column; align-items: center; gap: 6px; padding-top: space(1); }
  &__time { font-size: 13px; font-weight: $fw-bold; }

  @include mobile {
    gap: space(3);
    align-items: center;
    &__timer { gap: 3px; padding-top: 0; }
    &__time { font-size: 12px; }
  }
}
</style>
