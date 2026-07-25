<script setup lang="ts">
import UiIcon from '@/components/UiIcon.vue'
import type { AssistantMessage } from '@/types/assistant'

defineProps<{
  message: AssistantMessage
}>()
</script>

<template>
  <article
    class="ai-message"
    :class="`ai-message--${message.role}`"
    :aria-label="message.role === 'assistant' ? 'AIアシスタントの回答' : 'あなたの質問'"
  >
    <span class="ai-message__avatar" aria-hidden="true">
      <UiIcon v-if="message.role === 'assistant'" name="sparkles" />
      <UiIcon v-else name="user" />
    </span>
    <div class="ai-message__body">
      <strong>{{ message.role === 'assistant' ? 'ProjectNote AI' : 'あなた' }}</strong>
      <p>{{ message.content }}</p>
    </div>
  </article>
</template>

<style scoped>
.ai-message {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  max-width: min(46rem, 92%);
}

.ai-message--user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.ai-message__avatar {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.ai-message__avatar :deep(.ui-icon) {
  width: 1.1rem;
  height: 1.1rem;
}

.ai-message--user .ai-message__avatar {
  background: #edf2f5;
  color: var(--color-text-secondary);
}

.ai-message__body {
  min-width: 0;
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.3rem var(--radius-md) var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.ai-message--user .ai-message__body {
  border-color: rgba(34, 184, 240, 0.32);
  border-radius: var(--radius-md) 0.3rem var(--radius-md) var(--radius-md);
  background: #e6f8ff;
}

.ai-message__body strong {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--color-primary-dark);
  font-size: 0.74rem;
}

.ai-message--user .ai-message__body strong {
  color: var(--color-text-secondary);
}

.ai-message__body p {
  margin: 0;
  color: var(--color-text);
  line-height: 1.75;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

@media (max-width: 767px) {
  .ai-message {
    max-width: 100%;
  }
}
</style>
