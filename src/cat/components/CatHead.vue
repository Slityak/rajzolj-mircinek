<script setup lang="ts">
import { HEAD } from '../geometry'
import CatEar from './CatEar.vue'
import CatEye from './CatEye.vue'
import CatBrows from './CatBrows.vue'
import CatMouth from './CatMouth.vue'
import CatWhiskers from './CatWhiskers.vue'
</script>

<template>
  <g data-part="head">
    <CatEar side="L" />
    <CatEar side="R" />
    <ellipse class="k-fur k-outline" :cx="HEAD.cx" :cy="HEAD.cy" :rx="HEAD.rx" :ry="HEAD.ry" stroke-width="5" />
    <path class="k-stripe" stroke-width="4" d="M122 64l1 14m7-16v15m8-13l-1 14" />
    <ellipse data-part="blushL" class="k-pink" cx="92" cy="132" rx="9" ry="6" opacity="0" />
    <ellipse data-part="blushR" class="k-pink" cx="168" cy="132" rx="9" ry="6" opacity="0" />
    <CatEye side="L" />
    <CatEye side="R" />
    <CatBrows />
    <CatMouth />
    <CatWhiskers side="L" />
    <CatWhiskers side="R" />
  </g>
</template>
