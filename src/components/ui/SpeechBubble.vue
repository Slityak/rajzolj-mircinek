<script setup lang="ts">
export type BubbleArrow = 'top' | 'top-start' | 'left'
withDefaults(defineProps<{
  text: string
  arrow?: BubbleArrow
  /** Different arrow direction on mobile (e.g. to the left next to the cat) */
  arrowMobile?: BubbleArrow
}>(), { arrow: 'top' })
</script>

<template>
  <div class="bubble" :class="[`bubble--${arrow}`, arrowMobile && `bubble--m-${arrowMobile}`]" aria-live="polite">
    <span class="bubble__text">{{ text }}</span>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

$arrow: 16px;

@mixin arrow-top($left: 50%, $shift: -$arrow * .5) {
  top: -10px; left: $left; margin: 0 0 0 $shift; transform: rotate(45deg);
}
@mixin arrow-left {
  top: 50%; left: -10px; margin: -$arrow * .5 0 0; transform: rotate(-45deg);
}

.bubble {
  @include outlined;
  position: relative;
  background: var(--c-white);
  border-radius: $radius-card;
  padding: space(3) space(4);
  min-height: 64px;
  font-family: $font-hand;
  font-size: 19px;
  line-height: 1.3;
  text-wrap: pretty;

  &::before {
    content: '';
    position: absolute;
    width: $arrow;
    height: $arrow;
    background: var(--c-white);
    border-left: $border solid var(--c-ink);
    border-top: $border solid var(--c-ink);
  }

  &--top::before { @include arrow-top; }
  &--top-start::before { @include arrow-top(40px, 0); }
  &--left::before { @include arrow-left; }

  @include mobile {
    font-size: 18px;
    padding: 10px 14px;
    min-height: 0;
    &--m-top::before { @include arrow-top; }
    &--m-left::before { @include arrow-left; }
  }
}
</style>
