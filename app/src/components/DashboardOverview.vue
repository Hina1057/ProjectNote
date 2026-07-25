<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import ActivityTimeline from '@/components/ActivityTimeline.vue'
import DashboardCharts from '@/components/DashboardCharts.vue'
import UiIcon from '@/components/UiIcon.vue'
import { useWorkspaceActivities } from '@/composables/useWorkspaceActivities'
import { useWorkspaceTasks } from '@/composables/useWorkspaceTasks'
import type { Project, ProjectCategory } from '@/types/project'
import { formatDate, formatDateTime, getDateTimestamp } from '@/utils/formatDate'
import { getCategoryLabel, getStatusLabel } from '@/utils/uiLabels'

const props = defineProps<{
  projects: Project[]
  isLoading: boolean
  errorMessage: string
}>()

const {
  user: activityUser,
  isAuthReady: isActivityAuthReady,
  activities: recentActivities,
  isLoading: isActivityLoading,
  errorMessage: activityErrorMessage,
} = useWorkspaceActivities(5)

const {
  user: taskUser,
  isAuthReady: isTaskAuthReady,
  tasks: workspaceTasks,
  isLoading: isTaskLoading,
  errorMessage: taskErrorMessage,
} = useWorkspaceTasks()

const taskStats = computed(() => [
  {
    label: 'Todo',
    value: workspaceTasks.value.filter((task) => task.status === 'todo').length,
    icon: 'task',
  },
  {
    label: 'In Progress',
    value: workspaceTasks.value.filter((task) => task.status === 'in_progress').length,
    icon: 'activity',
  },
  {
    label: 'Done',
    value: workspaceTasks.value.filter((task) => task.status === 'done').length,
    icon: 'check',
  },
])

const dashboardStats = computed(() => [
  {
    label: 'ノート総数',
    value: props.projects.length,
    icon: 'note',
  },
  {
    label: '未着手',
    value: props.projects.filter((project) => project.status === 'Todo').length,
    icon: 'clock',
  },
  {
    label: '進行中',
    value: props.projects.filter((project) => project.status === 'In Progress').length,
    icon: 'activity',
  },
  {
    label: '完了',
    value: props.projects.filter((project) => project.status === 'Done').length,
    icon: 'check',
  },
])

const dashboardCategories: ProjectCategory[] = ['Bug', 'Idea', 'Task', 'Meeting', 'Reference', 'UI']
const categoryStats = computed(() =>
  dashboardCategories.map((category) => ({
    category,
    value: props.projects.filter((project) => project.category === category).length,
  })),
)

const latestUpdatedAt = computed(() => {
  let latestValue = ''
  let latestTimestamp = -Infinity

  props.projects.forEach((project) => {
    const value = project.updatedAt ?? project.createdAt
    const timestamp = getDateTimestamp(value)

    if (timestamp !== null && timestamp > latestTimestamp) {
      latestValue = value ?? ''
      latestTimestamp = timestamp
    }
  })

  return {
    value: latestValue,
    label: formatDateTime(latestValue),
  }
})

const recentProjects = computed(() =>
  [...props.projects]
    .sort(
      (projectA, projectB) =>
        (getDateTimestamp(projectB.updatedAt ?? projectB.createdAt) ?? 0) -
        (getDateTimestamp(projectA.updatedAt ?? projectA.createdAt) ?? 0),
    )
    .slice(0, 3),
)
</script>

<template>
  <section class="project-dashboard" aria-labelledby="dashboard-title">
    <p v-if="isLoading" class="message ui-notice ui-notice--loading" role="status">
      ダッシュボードを読み込んでいます
    </p>
    <p v-else-if="errorMessage" class="message ui-notice ui-notice--error" role="alert">
      {{ errorMessage }}
    </p>

    <template v-else>
      <div class="dashboard-heading">
        <div>
          <p>プロジェクト概要&nbsp; / &nbsp;リアルタイム集計</p>
          <h2 id="dashboard-title">プロジェクトダッシュボード</h2>
        </div>
        <div class="dashboard-last-updated">
          <span>最終更新</span>
          <time :datetime="latestUpdatedAt.value || undefined">{{ latestUpdatedAt.label }}</time>
        </div>
      </div>

      <div class="summary-grid">
        <article v-for="stat in dashboardStats" :key="stat.label" class="summary-card ui-flow-frame">
          <UiIcon :name="stat.icon" />
          <span>{{ stat.label }}</span>
          <strong>{{ stat.value }}</strong>
        </article>
      </div>

      <section class="dashboard-task-summary" aria-labelledby="dashboard-task-title">
        <div class="dashboard-section-heading">
          <div>
            <p>Workspaceタスク</p>
            <h3 id="dashboard-task-title">タスク状況</h3>
          </div>
          <RouterLink :to="{ name: 'tasks' }">タスクを見る</RouterLink>
        </div>
        <p
          v-if="!isTaskAuthReady || isTaskLoading"
          class="dashboard-inline-state"
          role="status"
        >
          タスクを読み込んでいます
        </p>
        <p v-else-if="!taskUser" class="dashboard-inline-state" role="status">
          ログインしてください
        </p>
        <p v-else-if="taskErrorMessage" class="dashboard-inline-state" role="alert">
          {{ taskErrorMessage }}
        </p>
        <div v-else class="summary-grid summary-grid--tasks">
          <article
            v-for="stat in taskStats"
            :key="stat.label"
            class="summary-card ui-flow-frame"
          >
            <UiIcon :name="stat.icon" />
            <span>{{ stat.label }}</span>
            <strong>{{ stat.value }}</strong>
          </article>
        </div>
      </section>

      <div class="categories-panel">
        <h3><UiIcon name="tag" />カテゴリ</h3>
        <ul>
          <li v-for="stat in categoryStats" :key="stat.category">
            <span>{{ getCategoryLabel(stat.category) }}</span>
            <strong>{{ stat.value }}</strong>
          </li>
        </ul>
      </div>

      <DashboardCharts :projects="projects" />

      <div class="dashboard-lower-grid">
        <section class="dashboard-readonly-card" aria-labelledby="recent-notes-title">
          <header>
            <div>
              <p>最近の更新</p>
              <h3 id="recent-notes-title">最近更新したノート</h3>
            </div>
            <RouterLink :to="{ name: 'notes' }">すべて表示</RouterLink>
          </header>

          <p v-if="recentProjects.length === 0" class="dashboard-empty">
            最近更新されたノートはありません
          </p>
          <ul v-else>
            <li v-for="project in recentProjects" :key="project.id">
              <RouterLink :to="{ name: 'project-detail', params: { id: project.id } }">
                <span class="recent-note-icon"><UiIcon name="note" /></span>
                <span class="recent-note-copy">
                  <strong>{{ project.title }}</strong>
                  <small>
                    {{ getCategoryLabel(project.category) }}・{{ getStatusLabel(project.status) }}
                  </small>
                </span>
                <time :datetime="project.updatedAt ?? project.createdAt">
                  {{ formatDate(project.updatedAt ?? project.createdAt) }}
                </time>
              </RouterLink>
            </li>
          </ul>
        </section>

        <section class="dashboard-readonly-card" aria-labelledby="activity-title">
          <header>
            <div>
              <p>アクティビティ</p>
              <h3 id="activity-title">最近のアクティビティ</h3>
            </div>
            <RouterLink :to="{ name: 'activity' }">すべて見る</RouterLink>
          </header>
          <p
            v-if="!isActivityAuthReady || isActivityLoading"
            class="dashboard-activity-state"
            role="status"
          >
            アクティビティを読み込んでいます
          </p>
          <p v-else-if="!activityUser" class="dashboard-activity-state" role="status">
            ログインしてください
          </p>
          <p v-else-if="activityErrorMessage" class="dashboard-activity-state" role="alert">
            {{ activityErrorMessage }}
          </p>
          <p v-else-if="recentActivities.length === 0" class="dashboard-activity-state">
            まだアクティビティはありません
          </p>
          <ActivityTimeline v-else :activities="recentActivities" compact />
        </section>
      </div>
    </template>
  </section>
</template>

<style scoped>
.dashboard-lower-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.dashboard-task-summary {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.dashboard-section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.dashboard-section-heading p,
.dashboard-section-heading h3 {
  margin: 0;
}

.dashboard-section-heading p {
  color: var(--color-primary-dark);
  font-size: 0.62rem;
  font-weight: 750;
}

.dashboard-section-heading h3 {
  margin-top: 0.2rem;
  color: var(--color-text);
  font-size: 1rem;
}

.dashboard-section-heading a {
  color: var(--color-primary-dark);
  font-size: 0.72rem;
  font-weight: 700;
  text-decoration: none;
}

.summary-grid--tasks {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.dashboard-inline-state {
  margin: 0;
  padding: 1rem;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  text-align: center;
}

.dashboard-readonly-card {
  padding: 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.dashboard-readonly-card > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.dashboard-readonly-card header p,
.dashboard-readonly-card header h3 {
  margin: 0;
}

.dashboard-readonly-card header p {
  color: var(--color-primary-dark);
  font-size: 0.62rem;
  font-weight: 750;
}

.dashboard-readonly-card header h3 {
  margin-top: 0.25rem;
  color: var(--color-text);
  font-size: 1rem;
}

.dashboard-readonly-card header > a {
  color: var(--color-primary-dark);
  font-size: 0.72rem;
  font-weight: 700;
  text-decoration: none;
}

.dashboard-readonly-card ul {
  display: grid;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dashboard-readonly-card li a {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.7rem;
  align-items: center;
  min-height: 3.75rem;
  padding: 0.65rem;
  border-radius: var(--radius-sm);
  color: inherit;
  text-decoration: none;
  transition:
    background var(--transition-fast),
    transform var(--transition-fast);
}

.dashboard-readonly-card li a:hover,
.dashboard-readonly-card li a:focus-visible {
  background: var(--color-bg-secondary);
  transform: translateY(-1px);
}

.recent-note-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.recent-note-copy {
  display: grid;
  min-width: 0;
}

.recent-note-copy strong {
  overflow: hidden;
  color: var(--color-text);
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-note-copy small,
.dashboard-readonly-card time {
  margin-top: 0.2rem;
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}

.dashboard-empty,
.dashboard-activity-state {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.dashboard-activity-state {
  display: grid;
  place-items: center;
  min-height: 8rem;
  margin: 0;
  padding: 1rem;
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  text-align: center;
}

@media (max-width: 62rem) {
  .dashboard-lower-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 40rem) {
  .summary-grid--tasks {
    grid-template-columns: 1fr;
  }
}
</style>
