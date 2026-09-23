<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { CatEngine } from '../CatEngine'
import type { Mood } from '../moods'
import type { CatGesture } from '../gestures'
import type { CatWords } from '../fx'
import { VIEWBOX, GROUND } from '../geometry'
import CatTail from './CatTail.vue'
import CatBody from './CatBody.vue'
import CatPaw from './CatPaw.vue'
import CatHead from './CatHead.vue'

const props = withDefaults(defineProps<{ mood?: Mood; label?: string; words?: CatWords }>(), { mood: 'idle', label: 'Mirci' })
const emit = defineEmits<{ gesture: [g: CatGesture] }>()

const svg = ref<SVGSVGElement | null>(null)
let engine: CatEngine | null = null

onMounted(() => {
  engine = new CatEngine(svg.value!, { onGesture: g => emit('gesture', g), words: props.words })
  engine.setMood(props.mood)
})
onBeforeUnmount(() => engine?.destroy())
watch(() => props.mood, m => engine?.setMood(m))
watch(() => props.words, w => { if (engine && w) engine.words = w })
</script>

<template>
  <div class="mirci">
    <svg ref="svg" class="mirci__svg" :viewBox="`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`" role="img" :aria-label="label">
      <ellipse data-part="shadow" class="k-ink" :cx="GROUND.x" cy="272" rx="70" ry="7" opacity=".08" />
      <g data-part="root">
        <CatTail />
        <CatBody />
        <CatPaw side="L" />
        <CatPaw side="R" />
        <CatHead />
        <g data-part="fx" class="mirci__fx" />
      </g>
    </svg>
  </div>
</template>

<style lang="scss">
@use '@/styles/tokens' as *;

// Not scoped: the Cat* subcomponents share these classes.
.mirci {
  position: relative;
  width: 100%;
  height: 100%;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;

  &__svg { display: block; width: 100%; height: 100%; overflow: visible; }
  &__fx { font-family: $font-display; pointer-events: none; }

  .k-fur { fill: var(--cat-fur); }
  .k-cream { fill: var(--cat-cream); }
  .k-pink { fill: var(--cat-pink); }
  .k-eye { fill: var(--cat-eye); }
  .k-ink { fill: var(--cat-line); }
  .k-white { fill: #fff; }
  .k-mouth { fill: var(--cat-mouth); }
  .k-tongue { fill: var(--cat-tongue); }
  .k-heart { fill: var(--cat-heart); }
  .k-outline { stroke: var(--cat-line); stroke-linejoin: round; }
  .k-line { fill: none; stroke: var(--cat-line); stroke-linecap: round; stroke-linejoin: round; }
  .k-stripe { fill: none; stroke: var(--cat-stripe); stroke-linecap: round; stroke-linejoin: round; }
  .k-tongue-line { fill: none; stroke: var(--cat-tongue); stroke-linecap: round; }
}
</style>
