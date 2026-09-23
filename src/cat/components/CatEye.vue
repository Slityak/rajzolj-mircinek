<script setup lang="ts">
import { EYE, EYE_Y, heartPath, type Side } from '../geometry'
const props = defineProps<{ side: Side }>()
const e = EYE[props.side]
const heart = heartPath(e.cx)
</script>

<!-- All states of one eye. Their visibility and transform are set by CatEngine. -->
<template>
  <g :data-part="`eyeO${side}`">
    <ellipse class="k-eye k-outline" :cx="e.cx" :cy="EYE_Y" rx="12" ry="15" stroke-width="4" />
    <g :data-part="`pup${side}`" :transform="`translate(${e.cx} ${EYE_Y})`">
      <ellipse class="k-ink" rx="6" ry="9.5" />
      <circle class="k-white" cx="-2" cy="-4" r="2.4" />
    </g>
    <g :data-part="`lidF${side}`" opacity="0">
      <path class="k-fur" :d="e.lidFlat" />
      <path class="k-line" stroke-width="4" :d="e.lidFlatLine" />
    </g>
    <g :data-part="`lid${side}`" opacity="0">
      <path class="k-fur" :d="e.lidSad" />
      <path class="k-line" stroke-width="4" :d="e.lidSadLine" />
    </g>
  </g>
  <path :data-part="`heart${side}`" class="k-heart k-outline" stroke-width="2" :d="heart" opacity="0" />
  <path :data-part="`happy${side}`" class="k-line" stroke-width="4" :d="e.happy" opacity="0" />
  <path :data-part="`closed${side}`" class="k-line" stroke-width="4" :d="e.closed" opacity="0" />
</template>
