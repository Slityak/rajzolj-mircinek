<script setup lang="ts">
import { WHISKER, type Side } from '../geometry'
defineProps<{ side: Side }>()
</script>

<template>
  <g :data-part="`wh${side}`">
    <path class="k-line" stroke-width="2.5" :d="WHISKER[side].d" />
  </g>
</template>
