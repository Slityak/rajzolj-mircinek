<script setup lang="ts">
/** Multi-line, "handwritten" title: the first line is tilted, the rest are indented. */
defineProps<{ lines: readonly string[] }>()
</script>

<template>
  <h1 class="title">
    <span v-for="(l, i) in lines" :key="i" class="title__line" :class="{ 'title__line--first': i === 0 }">{{ l }}</span>
  </h1>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

.title {
  display: flex;
  flex-direction: column;
  font-weight: $fw-black;
  font-size: clamp(48px, 7vw, 82px);
  line-height: .98;
  letter-spacing: -.01em;

  &__line { display: block; padding-left: .55em; }
  &__line--first { padding-left: 0; transform: rotate(-3deg); transform-origin: left center; }

  @include mobile { font-size: 44px; margin-top: space(2); }
}
</style>
