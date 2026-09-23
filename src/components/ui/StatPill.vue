<script setup lang="ts">
withDefaults(defineProps<{ label: string; value: string | number; align?: 'start' | 'end' }>(), { align: 'start' })
</script>

<!-- On desktop, value above label; on mobile, in one row inside a pill frame. -->
<template>
  <div class="stat" :class="`stat--${align}`">
    <span class="stat__label">{{ label }}</span>
    <span class="stat__value">{{ value }}</span>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  &--end { align-items: flex-end; }

  &__label { font-size: 12px; font-weight: $fw-semibold; color: var(--c-ink-soft); }
  &__value { font-size: 15px; font-weight: $fw-bold; }

  @include mobile {
    @include pill;
    flex-direction: row;
    align-items: baseline;
    gap: space(1);
    padding: 6px space(3);
  }
}
</style>
