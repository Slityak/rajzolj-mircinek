<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary'
  size?: 'md' | 'lg'
  block?: boolean
  type?: 'button' | 'submit'
}>(), { variant: 'primary', size: 'md', block: false, type: 'button' })
</script>

<template>
  <button :type="type" class="btn" :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block }]">
    <slot />
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

.btn {
  @include outlined;
  @include pressable;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  border-radius: $radius-pill;
  font-family: $font-display;
  font-weight: $fw-bold;
  color: var(--c-ink);
  cursor: pointer;

  &--primary { background: var(--c-orange); }
  &--secondary { background: var(--c-white); }
  &--md { font-size: 17px; padding: space(3) space(6); }
  &--lg { font-size: 20px; padding: 14px space(7); }
  &--block { width: 100%; }
}
</style>
