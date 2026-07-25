<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import UiIcon from '@/components/UiIcon.vue'

const props = defineProps<{
  isOpen: boolean
  title: string
  message: string
  confirmLabel: string
  isProcessing: boolean
  tone?: 'primary' | 'danger'
}>()

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isOpen && !props.isProcessing) {
    emit('cancel')
  }
}

onMounted(() => document.addEventListener('keydown', handleEscape))
onUnmounted(() => document.removeEventListener('keydown', handleEscape))
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="app-shell workspace-confirm-root">
      <div class="workspace-confirm-backdrop" @click.self="emit('cancel')">
        <section
          class="workspace-confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="workspace-confirm-title"
          aria-describedby="workspace-confirm-message"
        >
          <span
            class="workspace-confirm-icon"
            :class="{ 'workspace-confirm-icon--danger': tone === 'danger' }"
            aria-hidden="true"
          >
            <UiIcon :name="tone === 'danger' ? 'alert' : 'activity'" />
          </span>
          <h2 id="workspace-confirm-title">{{ title }}</h2>
          <p id="workspace-confirm-message">{{ message }}</p>
          <div class="workspace-confirm-actions">
            <button
              type="button"
              class="workspace-confirm-cancel"
              :disabled="isProcessing"
              @click="emit('cancel')"
            >
              Cancel
            </button>
            <button
              type="button"
              class="workspace-confirm-submit"
              :class="{ 'workspace-confirm-submit--danger': tone === 'danger' }"
              :disabled="isProcessing"
              @click="emit('confirm')"
            >
              {{ isProcessing ? 'Processing...' : confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.workspace-confirm-root {
  position: fixed;
  z-index: 140;
  inset: 0;
}

.workspace-confirm-backdrop {
  display: grid;
  width: 100%;
  height: 100%;
  padding: 1rem;
  background: rgba(23, 33, 43, 0.32);
  backdrop-filter: blur(5px);
  place-items: center;
}

.workspace-confirm-dialog {
  width: min(100%, 27rem);
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: 0 24px 70px rgba(31, 89, 117, 0.2);
  text-align: center;
  animation: workspace-confirm-in 180ms ease both;
}

.workspace-confirm-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.workspace-confirm-icon--danger {
  background: #fff0f0;
  color: var(--color-error);
}

.workspace-confirm-icon :deep(.ui-icon) {
  width: 1.3rem;
  height: 1.3rem;
}

.workspace-confirm-dialog h2 {
  margin: 1rem 0 0;
  color: var(--color-text);
  font-size: 1.1rem;
}

.workspace-confirm-dialog p {
  margin: 0.55rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  line-height: 1.7;
  white-space: pre-line;
}

.workspace-confirm-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
  margin-top: 1.3rem;
}

.workspace-confirm-actions button {
  min-height: 2.75rem;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}

.workspace-confirm-cancel {
  border: 1px solid var(--color-border);
  background: #ffffff;
  color: var(--color-text-secondary);
}

.workspace-confirm-submit {
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: #ffffff;
}

.workspace-confirm-submit--danger {
  border-color: var(--color-error);
  background: var(--color-error);
}

.workspace-confirm-actions button:hover:not(:disabled),
.workspace-confirm-actions button:focus-visible {
  box-shadow: var(--shadow-hover);
}

.workspace-confirm-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@keyframes workspace-confirm-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
}

@media (max-width: 420px) {
  .workspace-confirm-actions {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .workspace-confirm-dialog {
    animation: none;
  }
}
</style>
