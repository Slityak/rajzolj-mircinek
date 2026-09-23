<script setup lang="ts">
import { EAR, type Side } from '../geometry'
const props = defineProps<{ side: Side }>()
const e = EAR[props.side]
const outer = `M${e.tri.map(p => `${p.x} ${p.y}`).join(' ')}Z`
</script>

<template>
  <g :data-part="`ear${side}`">
    <path class="k-fur k-outline" stroke-width="5" :d="outer" />
    <path class="k-pink" :d="e.inner" />
  </g>
</template>
