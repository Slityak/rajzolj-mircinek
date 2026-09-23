<script setup lang="ts">
import { LOCALE_LIST, locale, localeName, setLocale, t } from '@/i18n'
</script>

<!-- Segmented pill: each language in its own name, the current one filled. -->
<template>
  <div class="lang" role="group" :aria-label="t.a11y.language">
    <button
      v-for="l in LOCALE_LIST"
      :key="l"
      type="button"
      class="lang__opt"
      :class="{ 'is-active': l === locale }"
      :aria-pressed="l === locale"
      :lang="l"
      :title="localeName(l)"
      @click="setLocale(l)"
    >
      {{ l.toUpperCase() }}
    </button>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

.lang {
  @include pill;
  display: inline-flex;
  padding: 3px;
  gap: 2px;

  &__opt {
    min-width: 44px;
    min-height: 36px;
    padding: 0 space(3);
    border: 0;
    border-radius: $radius-pill;
    background: transparent;
    font-size: 14px;
    font-weight: $fw-bold;
    cursor: pointer;
    &:focus-visible { outline: 3px solid var(--c-orange); outline-offset: 2px; }
    &.is-active { background: var(--c-orange); }
  }
}
</style>
