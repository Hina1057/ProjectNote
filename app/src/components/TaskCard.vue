<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from '@/components/UiIcon.vue'
import type { Task, TaskPriority, TaskStatus } from '@/types/task'

const props = withDefaults(
  defineProps<{
    task: Task
    isDeleting?: boolean
  }>(),
  {
    isDeleting: false,
  },
)

defineEmits<{
  edit: [task: Task]
  delete: [task: Task]
}>()

const priorityLabels: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
}

const statusLabels: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
}

const updatedDate = computed(() => props.task.updatedAt?.toDate() ?? null)
const formattedUpdatedAt = computed(() => {
  const date = updatedDate.value

  if (!date) {
    return '日時を確認中'
  }

  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
})
</script>

<template>
  <article class="task-card">
    <header>
      <span class="task-status">
        <UiIcon name="task" />
        {{ statusLabels[task.status] }}
      </span>
      <span class="task-priority" :class="`task-priority--${task.priority}`">
        優先度 {{ priorityLabels[task.priority] }}
      </span>
    </header>

    <div class="task-card__content">
      <h3>{{ task.title }}</h3>
      <p>{{ task.description || '説明はありません。' }}</p>
    </div>

    <dl>
      <div>
        <dt>作成者</dt>
        <dd>{{ task.createdByName || 'ユーザー' }}</dd>
      </div>
      <div>
        <dt>更新日時</dt>
        <dd>
          <time :datetime="updatedDate?.toISOString()">{{ formattedUpdatedAt }}</time>
        </dd>
      </div>
    </dl>

    <footer>
      <button type="button" class="task-edit-button" @click="$emit('edit', task)">
        <UiIcon name="edit" />
        編集
      </button>
      <button
        type="button"
        class="task-delete-button"
        :disabled="isDeleting"
        @click="$emit('delete', task)"
      >
        <UiIcon name="trash" />
        {{ isDeleting ? '削除中...' : '削除' }}
      </button>
    </footer>
  </article>
</template>

<style scoped>
.task-card {
  display: grid;
  gap: 1rem;
  min-width: 0;
  padding: 1.15rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-normal),
    transform var(--transition-fast);
}

.task-card:hover {
  border-color: rgba(34, 184, 240, 0.4);
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}

.task-card header,
.task-card footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
  justify-content: space-between;
}

.task-status,
.task-priority {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  min-height: 1.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6rem;
  font-weight: 750;
}

.task-status {
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.task-status :deep(.ui-icon) {
  width: 0.85rem;
  height: 0.85rem;
}

.task-priority {
  border: 1px solid var(--color-border);
}

.task-priority--low {
  background: #effaf3;
  color: #168044;
}

.task-priority--medium {
  background: #fff8e8;
  color: #a56208;
}

.task-priority--high {
  background: #fff0f0;
  color: #c53a3a;
}

.task-card__content {
  min-height: 5.5rem;
}

.task-card h3,
.task-card p,
.task-card dl,
.task-card dd {
  margin: 0;
}

.task-card h3 {
  overflow-wrap: anywhere;
  color: var(--color-text);
  font-size: 0.98rem;
  line-height: 1.45;
}

.task-card p {
  display: -webkit-box;
  margin-top: 0.55rem;
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.task-card dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--color-border);
}

.task-card dt {
  color: var(--color-text-secondary);
  font-size: 0.58rem;
  font-weight: 700;
}

.task-card dd {
  overflow: hidden;
  margin-top: 0.2rem;
  color: var(--color-text);
  font-size: 0.68rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-card footer {
  justify-content: flex-end;
}

.task-card button {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
}

.task-card button :deep(.ui-icon) {
  width: 0.9rem;
  height: 0.9rem;
}

.task-edit-button {
  border: 1px solid var(--color-primary);
  background: #ffffff;
  color: var(--color-primary-dark);
}

.task-delete-button {
  border: 1px solid #ffd0d0;
  background: #fff4f4;
  color: var(--color-error);
}

.task-card button:hover:not(:disabled),
.task-card button:focus-visible {
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.task-card button:focus-visible {
  outline: 3px solid rgba(34, 184, 240, 0.22);
  outline-offset: 2px;
}

.task-card button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (max-width: 25rem) {
  .task-card dl {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .task-card {
    transition: none;
  }

  .task-card:hover,
  .task-card button:hover:not(:disabled) {
    transform: none;
  }
}
</style>
