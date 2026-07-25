<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from '@/components/UiIcon.vue'
import type { Activity, ActivityType } from '@/types/activity'

const props = withDefaults(
  defineProps<{
    activity: Activity
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

const activityIcons: Record<ActivityType, string> = {
  note_created: 'note',
  note_updated: 'edit',
  note_deleted: 'trash',
  workspace_created: 'folder-add',
  workspace_joined: 'user-add',
  task_created: 'task-add',
  task_updated: 'edit',
  task_deleted: 'trash',
}

const activityLabels: Record<ActivityType, string> = {
  note_created: 'ノート作成',
  note_updated: 'ノート更新',
  note_deleted: 'ノート削除',
  workspace_created: 'プロジェクト作成',
  workspace_joined: 'プロジェクト参加',
  task_created: 'タスク作成',
  task_updated: 'タスク更新',
  task_deleted: 'タスク削除',
}

const actorName = computed(
  () => props.activity.displayName.trim() || props.activity.email.trim() || 'ユーザー',
)

const initial = computed(
  () => Array.from(actorName.value)[0]?.toLocaleUpperCase() ?? '?',
)

const createdDate = computed(() => props.activity.createdAt?.toDate() ?? null)

const formattedDateTime = computed(() => {
  const date = createdDate.value

  if (!date) {
    return '日時を確認中'
  }

  const pad = (value: number) => String(value).padStart(2, '0')

  if (props.compact) {
    return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
})
</script>

<template>
  <article class="activity-item" :class="{ 'activity-item--compact': compact }">
    <div class="activity-item__marker" :aria-label="activityLabels[activity.type]">
      <UiIcon :name="activityIcons[activity.type]" />
    </div>

    <div class="activity-item__body">
      <div class="activity-item__heading">
        <span class="activity-avatar" aria-hidden="true">{{ initial }}</span>
        <strong>{{ actorName }}</strong>
        <span class="activity-kind">{{ activityLabels[activity.type] }}</span>
      </div>
      <p>{{ activity.message }}</p>
      <small v-if="activity.targetTitle && !activity.message.includes(activity.targetTitle)">
        対象：{{ activity.targetTitle }}
      </small>
    </div>

    <time :datetime="createdDate?.toISOString()">{{ formattedDateTime }}</time>
  </article>
</template>

<style scoped>
.activity-item {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: start;
  min-width: 0;
  padding: 1.15rem 1.2rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-normal),
    transform var(--transition-fast);
}

.activity-item:hover {
  border-color: rgba(34, 184, 240, 0.38);
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}

.activity-item__marker,
.activity-avatar {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.activity-item__marker {
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid rgba(34, 184, 240, 0.3);
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.activity-item__marker :deep(.ui-icon) {
  width: 1.2rem;
  height: 1.2rem;
}

.activity-item__body {
  min-width: 0;
}

.activity-item__heading {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}

.activity-avatar {
  width: 1.65rem;
  height: 1.65rem;
  background: #eaf7fc;
  color: var(--color-primary-dark);
  font-size: 0.64rem;
  font-weight: 800;
}

.activity-item strong {
  overflow-wrap: anywhere;
  color: var(--color-text);
  font-size: 0.82rem;
}

.activity-kind {
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  background: var(--color-bg-secondary);
  color: var(--color-primary-dark);
  font-size: 0.58rem;
  font-weight: 750;
}

.activity-item p {
  margin: 0.55rem 0 0;
  overflow-wrap: anywhere;
  color: var(--color-text);
  font-size: 0.8rem;
  line-height: 1.65;
}

.activity-item small {
  display: block;
  margin-top: 0.3rem;
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: 0.65rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-item time {
  color: var(--color-text-secondary);
  font-size: 0.66rem;
  white-space: nowrap;
}

.activity-item--compact {
  gap: 0.7rem;
  padding: 0.7rem;
  border: 0;
  border-radius: var(--radius-sm);
  box-shadow: none;
}

.activity-item--compact .activity-item__marker {
  width: 2.25rem;
  height: 2.25rem;
}

.activity-item--compact .activity-avatar,
.activity-item--compact .activity-kind,
.activity-item--compact small {
  display: none;
}

.activity-item--compact p {
  margin-top: 0.25rem;
  font-size: 0.72rem;
}

@media (max-width: 47.9375rem) {
  .activity-item {
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.75rem;
    padding: 1rem;
  }

  .activity-item time {
    grid-column: 2;
    white-space: normal;
  }
}

@media (prefers-reduced-motion: reduce) {
  .activity-item {
    transition: none;
  }

  .activity-item:hover {
    transform: none;
  }
}
</style>
