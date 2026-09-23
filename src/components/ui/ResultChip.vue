<script setup lang="ts">
import { t } from '@/i18n'
defineProps<{ emoji: string; label: string; won: boolean }>()
</script>

<template>
  <div class="chip">
    <span aria-hidden="true">{{ emoji }}</span>
    <span>{{ label }}</span>
    <span class="chip__mark" :class="won ? 'is-won' : 'is-lost'" :aria-label="won ? t.a11y.won : t.a11y.lost">{{ won ? '✓' : '✗' }}</span>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

.chip {
  @include pill;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px space(3);
  font-size: 15px;
  font-weight: $fw-bold;

  &__mark.is-won { color: var(--c-success); }
  &__mark.is-lost { color: var(--c-danger); }
}
</style>
