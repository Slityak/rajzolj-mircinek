<script setup lang="ts">
import { SUBJECTS, type TaskKey } from '@shared/subjects'
import { t } from '@/i18n'
defineProps<{ subject: TaskKey }>()
</script>

<template>
  <div class="prompt">
    <h2 class="prompt__title">{{ t.tasks[subject] }}</h2>
    <span class="prompt__emoji" aria-hidden="true">{{ SUBJECTS[subject].emoji }}</span>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tokens' as *;
@use '@/styles/mixins' as *;

.prompt {
  display: flex;
  flex-direction: column;
  gap: 14px;

  &__title { font-size: 30px; font-weight: $fw-black; line-height: 1.1; text-wrap: pretty; }
  &__emoji { font-size: 28px; line-height: 1; }

  @include mobile {
    flex-direction: row-reverse;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    &__title { font-size: 26px; }
    &__emoji { font-size: 30px; }
  }
}
</style>
