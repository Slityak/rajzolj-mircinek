<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { MirciCat, type Mood } from '@/cat'
import BaseButton from '@/components/ui/BaseButton.vue'
import SpeechBubble from '@/components/ui/SpeechBubble.vue'
import GameHud from '@/components/game/GameHud.vue'
import PromptHeading from '@/components/game/PromptHeading.vue'
import GuessMeter from '@/components/game/GuessMeter.vue'
import DrawingBoard from '@/components/game/DrawingBoard.vue'
import RoundOverlay from '@/components/game/RoundOverlay.vue'
import { GAME_KEY } from '@/game/useGame'
import { t } from '@/i18n'

defineProps<{ mood: Mood }>()
const game = inject(GAME_KEY)!
const board = ref<InstanceType<typeof DrawingBoard> | null>(null)

const overlay = computed(() => {
  const o = game.state.overlay
  if (!o) return null
  return {
    title: o.kind === 'win' ? t.value.winTitle : t.value.loseTitle,
    subtitle: o.gain ? t.value.gain(o.gain) : undefined,
    action: game.view.value.isLastRound ? t.value.toResults : t.value.nextRound
  }
})

function onClear() {
  if (!game.view.value.canDraw) return
  board.value?.clear()
  game.cleared()
}

function onNext() {
  board.value?.clear()
  game.next()
}
</script>

<template>
  <section class="game" data-screen="game">
    <GameHud
      class="game__hud"
      :round-label="game.view.value.roundLabel"
      :score="game.state.score"
      :time-pct="game.view.value.timePct"
      :time-label="game.view.value.timeLabel"
      :time-low="game.view.value.timeLow"
    />
    <PromptHeading class="game__prompt" :subject="game.subject.value" />
    <MirciCat class="game__cat" :mood="mood" :words="t.catWords" :label="t.a11y.cat" @gesture="game.onGesture" />
    <SpeechBubble class="game__bubble" :text="game.state.speech" arrow="top-start" arrow-mobile="left" />
    <GuessMeter
      class="game__meter"
      :guess="game.view.value.guess"
      :pct="game.view.value.guessPct"
      :correct="game.view.value.guessCorrect"
    />
    <DrawingBoard
      ref="board"
      class="game__board"
      :disabled="!game.view.value.canDraw"
      :dimmed="!!overlay"
      @change="game.setStrokes"
      @stroke-end="game.strokeEnded"
    >
      <RoundOverlay v-if="overlay" v-bind="overlay" @action="onNext" />
    </DrawingBoard>
    <div class="game__actions">
      <BaseButton variant="secondary" @click="onClear">{{ t.clear }}</BaseButton>
      <BaseButton variant="secondary" @click="game.giveUp">{{ t.giveUp }}</BaseButton>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

// Desktop: left column (task, cat, bubble, guess), right column (board, buttons).
.game {
  max-width: 1020px;
  margin: 0 auto;
  padding: space(4) space(7) space(7);
  display: grid;
  grid-template-columns: minmax(260px, 300px) minmax(300px, min(100%, calc(100vh - 110px)));
  grid-template-areas:
    'hud    hud'
    'prompt board'
    'cat    board'
    'bubble board'
    'meter  board'
    '.      actions'
    '.      .';
  grid-template-rows: auto auto auto auto auto auto 1fr;
  column-gap: space(6);
  row-gap: 14px;
  align-items: start;
  justify-content: center;

  &__hud { grid-area: hud; margin-bottom: space(1); }
  &__prompt { grid-area: prompt; }
  &__cat { grid-area: cat; height: 260px; }
  &__bubble { grid-area: bubble; margin-top: 6px; }
  &__meter { grid-area: meter; margin-top: space(3); }
  &__board { grid-area: board; }
  &__actions { grid-area: actions; display: flex; justify-content: space-between; gap: space(3); }

  // Mobile: single column, small cat next to the bubble, buttons at thumb height.
  @include mobile {
    min-height: 100dvh;
    padding: 0;
    grid-template-columns: 128px minmax(0, 1fr);
    grid-template-areas:
      'hud     hud'
      'prompt  prompt'
      'cat     bubble'
      'meter   meter'
      'board   board'
      '.       .'
      'actions actions';
    // Fixed cat/bubble row: bubble text of any length never pushes the board around.
    grid-template-rows: auto auto 136px auto auto 1fr auto;
    column-gap: space(2);
    row-gap: space(3);
    align-items: center;

    &__hud, &__meter, &__bubble { margin: 0; }
    &__cat { height: 136px; }
    &__bubble { align-self: center; max-height: 136px; overflow: hidden; }
    &__actions { display: grid; grid-template-columns: 1fr 1fr; }
  }
}
</style>
