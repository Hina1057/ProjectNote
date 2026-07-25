<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import TaskCard from '@/components/TaskCard.vue'
import TaskDialog from '@/components/TaskDialog.vue'
import UiIcon from '@/components/UiIcon.vue'
import { useWorkspaceTasks } from '@/composables/useWorkspaceTasks'
import {
  createWorkspaceTask,
  deleteWorkspaceTask,
  updateWorkspaceTask,
} from '@/services/taskService'
import type { Task, TaskInput, TaskStatus } from '@/types/task'

const {
  selectedWorkspaceId,
  user,
  isAuthReady,
  tasks,
  isLoading,
  errorMessage,
} = useWorkspaceTasks()

const isDialogOpen = ref(false)
const editingTask = ref<Task | null>(null)
const isSubmitting = ref(false)
const mutationError = ref('')
const deletingTaskIds = ref<string[]>([])

const taskColumns: Array<{ status: TaskStatus; label: string }> = [
  { status: 'todo', label: 'Todo' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
]

const tasksByStatus = computed(() =>
  Object.fromEntries(
    taskColumns.map(({ status }) => [
      status,
      tasks.value.filter((task) => task.status === status),
    ]),
  ) as Record<TaskStatus, Task[]>,
)

const openCreateDialog = () => {
  if (!user.value || !selectedWorkspaceId.value) {
    return
  }

  editingTask.value = null
  mutationError.value = ''
  isDialogOpen.value = true
}

const openEditDialog = (task: Task) => {
  editingTask.value = task
  mutationError.value = ''
  isDialogOpen.value = true
}

const closeDialog = () => {
  if (isSubmitting.value) {
    return
  }

  isDialogOpen.value = false
  editingTask.value = null
  mutationError.value = ''
}

const saveTask = async (input: TaskInput) => {
  if (!user.value || !selectedWorkspaceId.value || isSubmitting.value) {
    return
  }

  isSubmitting.value = true
  mutationError.value = ''

  try {
    if (editingTask.value) {
      await updateWorkspaceTask(
        selectedWorkspaceId.value,
        user.value,
        editingTask.value.id,
        input,
      )
    } else {
      await createWorkspaceTask(selectedWorkspaceId.value, user.value, {
        title: input.title,
        description: input.description,
        priority: input.priority,
      })
    }

    isDialogOpen.value = false
    editingTask.value = null
    mutationError.value = ''
  } catch (error) {
    console.error(error)
    mutationError.value =
      error instanceof Error ? error.message : 'タスクの保存に失敗しました。'
  } finally {
    isSubmitting.value = false
  }
}

const deleteTask = async (task: Task) => {
  if (
    !user.value ||
    !selectedWorkspaceId.value ||
    deletingTaskIds.value.includes(task.id) ||
    !window.confirm(`「${task.title}」を削除しますか？`)
  ) {
    return
  }

  deletingTaskIds.value.push(task.id)
  mutationError.value = ''

  try {
    await deleteWorkspaceTask(selectedWorkspaceId.value, user.value, task)
  } catch (error) {
    console.error(error)
    mutationError.value =
      error instanceof Error ? error.message : 'タスクの削除に失敗しました。'
  } finally {
    deletingTaskIds.value = deletingTaskIds.value.filter((taskId) => taskId !== task.id)
  }
}

watch([user, selectedWorkspaceId], () => {
  isDialogOpen.value = false
  editingTask.value = null
  mutationError.value = ''
  isSubmitting.value = false
})
</script>

<template>
  <main class="home-view tasks-view">
    <PageHeader eyebrow="共同ワークスペース" title="タスク">
      <template #actions>
        <button
          v-if="user && selectedWorkspaceId"
          type="button"
          class="new-project-link task-create-button"
          @click="openCreateDialog"
        >
          <UiIcon name="task-add" />
          新規タスク
        </button>
      </template>
    </PageHeader>

    <section class="tasks-page" aria-labelledby="tasks-page-title">
      <header class="tasks-page__heading">
        <div>
          <p>Workspaceタスク</p>
          <h1 id="tasks-page-title">タスク管理</h1>
        </div>
        <span v-if="user && selectedWorkspaceId && !isLoading && !errorMessage">
          {{ tasks.length }}件
        </span>
      </header>

      <p v-if="!isAuthReady" class="tasks-state ui-notice ui-notice--loading" role="status">
        ログイン状態を確認しています
      </p>
      <p
        v-else-if="errorMessage && !user"
        class="tasks-state ui-notice ui-notice--error"
        role="alert"
      >
        {{ errorMessage }}
      </p>
      <p v-else-if="!user" class="tasks-state ui-notice ui-notice--empty" role="status">
        ログインしてください
      </p>
      <p
        v-else-if="!selectedWorkspaceId"
        class="tasks-state ui-notice ui-notice--empty"
        role="status"
      >
        プロジェクトを選択してください
      </p>
      <p
        v-else-if="isLoading"
        class="tasks-state ui-notice ui-notice--loading"
        role="status"
      >
        タスクを読み込んでいます
      </p>
      <p
        v-else-if="errorMessage"
        class="tasks-state ui-notice ui-notice--error"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <template v-else>
        <p
          v-if="mutationError"
          class="tasks-mutation-error ui-notice ui-notice--error"
          role="alert"
          aria-live="assertive"
        >
          {{ mutationError }}
        </p>

        <p v-if="tasks.length === 0" class="tasks-state ui-notice ui-notice--empty" role="status">
          まだタスクはありません
        </p>

        <div v-else class="task-board" aria-live="polite">
          <section
            v-for="column in taskColumns"
            :key="column.status"
            class="task-column"
            :aria-labelledby="`task-column-${column.status}`"
          >
            <header>
              <h2 :id="`task-column-${column.status}`">{{ column.label }}</h2>
              <span>{{ tasksByStatus[column.status].length }}</span>
            </header>

            <p v-if="tasksByStatus[column.status].length === 0" class="task-column__empty">
              このステータスのタスクはありません
            </p>
            <div v-else class="task-column__list">
              <TaskCard
                v-for="task in tasksByStatus[column.status]"
                :key="task.id"
                :task="task"
                :is-deleting="deletingTaskIds.includes(task.id)"
                @edit="openEditDialog"
                @delete="deleteTask"
              />
            </div>
          </section>
        </div>
      </template>
    </section>

    <TaskDialog
      :is-open="isDialogOpen"
      :task="editingTask"
      :is-submitting="isSubmitting"
      :error-message="mutationError"
      @close="closeDialog"
      @save="saveTask"
    />
  </main>
</template>

<style scoped>
.tasks-page {
  width: min(100%, 76rem);
  margin: 0 auto;
}

.tasks-page__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.tasks-page__heading p,
.tasks-page__heading h1 {
  margin: 0;
}

.tasks-page__heading p {
  color: var(--color-primary-dark);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.tasks-page__heading h1 {
  margin-top: 0.25rem;
  color: var(--color-text);
  font-size: clamp(1.55rem, 3vw, 2.3rem);
  letter-spacing: -0.04em;
}

.tasks-page__heading > span {
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  font-weight: 700;
}

.task-create-button {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  cursor: pointer;
}

.task-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}

.task-column {
  min-width: 0;
  padding: 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: rgba(237, 247, 252, 0.62);
}

.task-column > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 2.5rem;
  margin-bottom: 0.75rem;
  padding: 0 0.25rem;
}

.task-column h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 0.88rem;
}

.task-column header span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.65rem;
  min-height: 1.65rem;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
  font-size: 0.65rem;
  font-weight: 800;
}

.task-column__list {
  display: grid;
  gap: 0.75rem;
}

.task-column__empty {
  margin: 0;
  padding: 1.5rem 0.75rem;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  text-align: center;
}

.tasks-state {
  min-height: 7rem;
}

.tasks-mutation-error {
  margin-bottom: 1rem;
}

@media (max-width: 79.9375rem) {
  .task-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 47.9375rem) {
  .task-board {
    grid-template-columns: 1fr;
  }

  .tasks-page__heading {
    align-items: flex-start;
  }
}
</style>
