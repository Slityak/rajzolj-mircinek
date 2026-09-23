<script setup lang="ts">
import { PAW, type Side } from '../geometry'
const props = defineProps<{ side: Side }>()
const p = PAW[props.side]
</script>

<template>
  <g :data-part="`paw${side}`">
    <ellipse class="k-cream k-outline" :cx="p.cx" :cy="p.cy" :rx="p.rx" :ry="p.ry" stroke-width="4.5" />
  </g>
</template>
