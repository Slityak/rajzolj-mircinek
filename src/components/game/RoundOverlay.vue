<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
defineProps<{ title: string; subtitle?: string; action: string }>()
defineEmits<{ action: [] }>()
</script>

<template>
  <div class="overlay">
    <div class="overlay__title">{{ title }}</div>
    <div v-if="subtitle" class="overlay__sub">{{ subtitle }}</div>
    <BaseButton size="lg" class="overlay__btn" @click="$emit('action')">{{ action }}</BaseButton>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: space(3);
  padding: space(6);
  text-align: center;
  background: rgba($paper, .5);

  &__title { font-size: 26px; font-weight: $fw-black; }
  &__sub { font-size: 18px; font-weight: $fw-bold; color: var(--c-success); }
  &__btn { margin-top: 6px; padding-inline: 52px; font-size: 22px; }

  @include mobile {
    gap: 10px;
    padding: space(5);
    &__title { font-size: 24px; }
    &__btn { padding-inline: 36px; font-size: 20px; }
  }
}
</style>
