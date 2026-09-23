<!--
  Muzzle: cheek pad, mouth shapes, nose, licking.
  Order matters: the licking group sits ABOVE the nose, so the tongue passes in front of the triangle.
  Exactly one mouth shape is ever visible at a time (CatEngine.drawMouth).
-->
<template>
  <ellipse class="k-cream" cx="130" cy="137" rx="24" ry="15" />
  <ellipse data-part="mouthO" class="k-mouth k-outline" cx="130" cy="145" rx="7" ry="0" stroke-width="3" opacity="0" />
  <path data-part="fangs" class="k-white k-outline" stroke-width="1.5" d="M124.5 138l2.5 6 2.5-6zm6 0l2.5 6 2.5-6z" opacity="0" />
  <path data-part="smirk" class="k-line" stroke-width="3" d="M130 134v4m-9 2q10 4 19-5" opacity="0" />
  <path data-part="squig" class="k-line" stroke-width="3" d="M130 134v4m-10 4q4-5 8 0t8 0q2-3 4-1" opacity="0" />
  <ellipse data-part="blep" class="k-tongue k-outline" cx="133" cy="143" rx="4.5" ry="5.5" stroke-width="2" opacity="0" />
  <g data-part="smile" opacity="0">
    <path class="k-mouth k-outline" stroke-width="3" d="M119 138q11 3 22 0-1 16-11 16t-11-16z" />
    <path class="k-tongue" d="M123.5 149q6.5-4.5 13 0-2.5 4-6.5 4t-6.5-4z" />
    <path class="k-line" stroke-width="3" d="M130 134v5.5" />
  </g>
  <path data-part="frown" class="k-line" stroke-width="3" d="M130 134v4m-8 7q8-9 16 0" opacity="0" />
  <path data-part="mouthW" class="k-line" stroke-width="3" d="M130 134v4m-9-1q4.5 7 9 1 4.5 6 9-1" />
  <path class="k-pink k-outline" stroke-width="3" d="M124 127h12l-6 7z" />
  <g data-part="lick" opacity="0">
    <path class="k-line" stroke-width="3" d="M130 134v4.5" />
    <path data-part="lickMouth" class="k-mouth k-outline" stroke-width="3" d="M121 138q9 3 18 0-1 11-9 11t-9-11z" />
    <path data-part="tongueO" class="k-line" stroke-width="11.5" d="M130 146v4" />
    <path data-part="tongueI" class="k-tongue-line" stroke-width="6.5" d="M130 146v4" />
  </g>
</template>
