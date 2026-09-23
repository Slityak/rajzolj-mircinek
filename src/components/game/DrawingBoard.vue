<script setup lang="ts">
import { toRef } from 'vue'
import { useDrawingCanvas } from '@/composables/useDrawingCanvas'
import type { Stroke } from '@/game/types'
import { t } from '@/i18n'

const props = withDefaults(defineProps<{ disabled?: boolean; dimmed?: boolean }>(), { disabled: false, dimmed: false })
const emit = defineEmits<{ change: [strokes: readonly Stroke[], size: number]; strokeEnd: [] }>()

const { canvas, clear, onPointerDown, onPointerMove, onPointerUp } = useDrawingCanvas({
  disabled: toRef(props, 'disabled'),
  onChange: s => emit('change', s, canvas.value?.clientWidth ?? 1),
  onStrokeEnd: () => emit('strokeEnd')
})

defineExpose({ clear })
</script>

<!-- Square grid-paper drawing board. The end-of-round overlay goes into the default slot. -->
<template>
  <div class="board">
    <canvas
      ref="canvas"
      class="board__canvas"
      :class="{ 'is-dimmed': dimmed }"
      :aria-label="t.a11y.board"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    />
    <slot />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

.board {
  @include outlined;
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: $radius-board;
  overflow: hidden;
  background-color: var(--c-paper);
  background-image:
    linear-gradient(var(--c-paper-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--c-paper-grid) 1px, transparent 1px);
  background-size: 24px 24px;

  &__canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: crosshair;
    transition: opacity .3s;
    &.is-dimmed { opacity: .25; }
  }
}
</style>
