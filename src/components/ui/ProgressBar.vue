<script setup lang="ts">
withDefaults(defineProps<{
  /** 0–100 */
  value: number
  tone?: 'success' | 'warning'
  variant?: 'track' | 'outlined'
  /** Transition duration in ms (short for the timer, longer for the hint) */
  duration?: number
  label?: string
}>(), { tone: 'success', variant: 'track', duration: 400 })
</script>

<template>
  <div
    class="bar"
    :class="[`bar--${variant}`]"
    role="progressbar"
    :aria-valuenow="Math.round(value)"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label"
  >
    <div class="bar__fill" :class="`bar__fill--${tone}`" :style="{ width: `${value}%`, transitionDuration: `${duration}ms` }" />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

.bar {
  width: 100%;
  border-radius: $radius-pill;
  overflow: hidden;

  &--track { height: 10px; background: var(--c-track); }
  &--outlined { @include outlined($border-thin); height: 14px; background: var(--c-white); @include mobile { height: 12px; } }

  &__fill {
    height: 100%;
    border-radius: $radius-pill;
    transition-property: width, background-color;
    transition-timing-function: ease;
    &--success { background: var(--c-success); }
    &--warning { background: var(--c-orange); }
  }
}
</style>
