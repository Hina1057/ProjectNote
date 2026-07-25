<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import UiIcon from '@/components/UiIcon.vue'
import type { Task, TaskInput, TaskPriority, TaskStatus } from '@/types/task'

const props = defineProps<{
  isOpen: boolean
  task: Task | null
  isSubmitting: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  close: []
  save: [input: TaskInput]
}>()

const localError = ref('')
const form = reactive<TaskInput>({
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
})

const priorities: Array<{ value: TaskPriority; label: string }> = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
]

const statuses: Array<{ value: TaskStatus; label: string }> = [
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const resetForm = () => {
  form.title = props.task?.title ?? ''
  form.description = props.task?.description ?? ''
  form.status = props.task?.status ?? 'todo'
  form.priority = props.task?.priority ?? 'medium'
  localError.value = ''
}

const submit = () => {
  if (!form.title.trim()) {
    localError.value = 'タイトルを入力してください。'
    return
  }

  localError.value = ''
  emit('save', {
    title: form.title,
    description: form.description,
    status: props.task ? form.status : 'todo',
    priority: form.priority,
  })
}

const close = () => {
  if (!props.isSubmitting) {
    emit('close')
  }
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isOpen) {
    close()
  }
}

watch(() => [props.isOpen, props.task] as const, resetForm)
onMounted(() => document.addEventListener('keydown', handleEscape))
onUnmounted(() => document.removeEventListener('keydown', handleEscape))
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="app-shell app-modal-root">
      <div class="task-dialog-backdrop" @click.self="close">
        <section
          class="task-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-dialog-title"
        >
          <header>
            <div>
              <p>{{ task ? 'タスク編集' : '新しいタスク' }}</p>
              <h2 id="task-dialog-title">{{ task ? 'タスクを編集' : 'タスクを作成' }}</h2>
            </div>
            <button
              type="button"
              class="task-dialog__close"
              aria-label="タスク画面を閉じる"
              :disabled="isSubmitting"
              @click="close"
            >
              <UiIcon name="close" />
            </button>
          </header>

          <form @submit.prevent="submit">
            <div class="task-field">
              <label for="task-title">タイトル <span>必須</span></label>
              <input
                id="task-title"
                v-model="form.title"
                type="text"
                maxlength="120"
                placeholder="タスクのタイトル"
                required
                autofocus
              />
            </div>

            <div class="task-field">
              <label for="task-description">説明</label>
              <textarea
                id="task-description"
                v-model="form.description"
                rows="5"
                maxlength="1000"
                placeholder="タスクの詳細を入力..."
              ></textarea>
            </div>

            <div class="task-field-row">
              <div class="task-field">
                <label for="task-priority">優先度</label>
                <select id="task-priority" v-model="form.priority">
                  <option
                    v-for="priority in priorities"
                    :key="priority.value"
                    :value="priority.value"
                  >
                    {{ priority.label }}
                  </option>
                </select>
              </div>

              <div v-if="task" class="task-field">
                <label for="task-status">ステータス</label>
                <select id="task-status" v-model="form.status">
                  <option v-for="status in statuses" :key="status.value" :value="status.value">
                    {{ status.label }}
                  </option>
                </select>
              </div>
            </div>

            <p
              v-if="localError || errorMessage"
              class="task-dialog__error"
              role="alert"
              aria-live="assertive"
            >
              {{ localError || errorMessage }}
            </p>

            <footer>
              <button
                type="button"
                class="task-secondary-button"
                :disabled="isSubmitting"
                @click="close"
              >
                キャンセル
              </button>
              <button type="submit" class="task-primary-button" :disabled="isSubmitting">
                {{ isSubmitting ? '保存中...' : '保存' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.task-dialog-backdrop {
  position: fixed;
  z-index: 120;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1rem;
  overflow-y: auto;
  background: rgba(23, 33, 43, 0.35);
  backdrop-filter: blur(5px);
}

.task-dialog {
  width: min(100%, 34rem);
  padding: 1.4rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: 0 24px 60px rgba(31, 89, 117, 0.2);
}

.task-dialog > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.task-dialog header p,
.task-dialog header h2 {
  margin: 0;
}

.task-dialog header p {
  color: var(--color-primary-dark);
  font-size: 0.66rem;
  font-weight: 750;
}

.task-dialog header h2 {
  margin-top: 0.25rem;
  color: var(--color-text);
  font-size: 1.25rem;
}

.task-dialog__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #ffffff;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.task-dialog form,
.task-field {
  display: grid;
  gap: 0.55rem;
}

.task-dialog form {
  gap: 1rem;
}

.task-field-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.task-field label {
  color: var(--color-text);
  font-size: 0.72rem;
  font-weight: 700;
}

.task-field label span {
  color: var(--color-error);
}

.task-field input,
.task-field textarea,
.task-field select {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  background: #ffffff;
  color: var(--color-text);
}

.task-field textarea {
  min-height: 7.5rem;
  resize: vertical;
}

.task-field input:focus-visible,
.task-field textarea:focus-visible,
.task-field select:focus-visible {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(34, 184, 240, 0.15);
}

.task-dialog__error {
  margin: 0;
  padding: 0.75rem;
  border: 1px solid #ffd0d0;
  border-radius: var(--radius-sm);
  background: #fff5f5;
  color: var(--color-error);
  font-size: 0.72rem;
}

.task-dialog footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
}

.task-dialog footer button {
  min-height: 2.75rem;
  padding: 0.65rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.74rem;
  font-weight: 750;
  cursor: pointer;
}

.task-secondary-button {
  border: 1px solid var(--color-primary);
  background: #ffffff;
  color: var(--color-primary-dark);
}

.task-primary-button {
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: #ffffff;
}

.task-primary-button:hover:not(:disabled),
.task-primary-button:focus-visible {
  background: var(--color-primary-hover);
}

.task-dialog button:focus-visible {
  outline: 3px solid rgba(34, 184, 240, 0.22);
  outline-offset: 2px;
}

.task-dialog button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (max-width: 35rem) {
  .task-dialog {
    padding: 1rem;
  }

  .task-field-row {
    grid-template-columns: 1fr;
  }

  .task-dialog footer {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
