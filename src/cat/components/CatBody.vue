<script setup lang="ts">
import { BODY } from '../geometry'
</script>

<template>
  <g data-part="body">
    <ellipse class="k-fur k-outline" :cx="BODY.cx" :cy="BODY.cy" :rx="BODY.rx" :ry="BODY.ry" stroke-width="5" />
    <ellipse class="k-cream" cx="130" cy="220" rx="34" ry="33" />
    <path class="k-stripe" stroke-width="4" d="M88 192q-6 10 0 22m84-22q6 10 0 22" />
  </g>
</template>
