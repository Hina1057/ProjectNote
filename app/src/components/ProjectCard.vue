<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import UiIcon from '@/components/UiIcon.vue'
import type { Project, ProjectStatus } from '@/types/project'
import { formatDate } from '@/utils/formatDate'
import { getCategoryLabel, getStatusLabel } from '@/utils/uiLabels'

const statusOptions: ProjectStatus[] = ['Todo', 'In Progress', 'Done']

const props = defineProps<{
  project: Project
  isUpdatingStatus: boolean
}>()
const router = useRouter()

const emit = defineEmits<{
  statusChange: [projectId: number, status: ProjectStatus]
}>()

const hasSelectableStatus = computed(() =>
  statusOptions.includes(props.project.status as ProjectStatus),
)

const formattedCreatedAt = computed(() => formatDate(props.project.createdAt))
const updatedAtValue = computed(() => props.project.updatedAt ?? props.project.createdAt)
const formattedUpdatedAt = computed(() => formatDate(updatedAtValue.value))

const handleStatusChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('statusChange', props.project.id, target.value as ProjectStatus)
}

const goToDetail = () => {
  void router.push({ name: 'project-detail', params: { id: props.project.id } })
}
</script>

<template>
  <article
    class="project-card"
    role="link"
    tabindex="0"
    :aria-label="`${project.title}の詳細を表示`"
    @click="goToDetail"
    @keydown.enter="goToDetail"
  >
    <img
      v-if="project.image"
      class="project-card__image"
      :src="project.image"
      :alt="`${project.title}の画像`"
    />

    <div class="project-card__labels">
      <span><UiIcon name="tag" />{{ getCategoryLabel(project.category) }}</span>
    </div>

    <label
      class="status-control"
      :for="`project-status-${project.id}`"
      @click.stop
      @keydown.stop
    >
      <span>ステータス</span>
      <select
        :id="`project-status-${project.id}`"
        :value="project.status"
        :disabled="isUpdatingStatus"
        @change="handleStatusChange"
      >
        <option v-if="!hasSelectableStatus" :value="project.status" disabled>
          {{ getStatusLabel(project.status) }}
        </option>
        <option v-for="status in statusOptions" :key="status" :value="status">
          {{ getStatusLabel(status) }}
        </option>
      </select>
    </label>

    <h2>{{ project.title }}</h2>
    <p class="project-card__content">{{ project.content }}</p>
    <time v-if="project.createdAt" :datetime="project.createdAt">
      作成日：{{ formattedCreatedAt }}
    </time>
    <time :datetime="updatedAtValue || undefined">更新日：{{ formattedUpdatedAt }}</time>
    <div class="project-card__actions" @click.stop @keydown.stop>
      <RouterLink
        :to="{ name: 'edit-project', params: { id: project.id } }"
        :aria-label="`${project.title}を編集`"
      >
        <UiIcon name="edit" />
        編集
      </RouterLink>
      <RouterLink
        :to="{ name: 'project-detail', params: { id: project.id } }"
        :aria-label="`${project.title}の詳細を表示`"
      >
        <UiIcon name="eye" />
        詳細
      </RouterLink>
    </div>
  </article>
</template>

<style scoped>
.project-card {
  position: relative;
  min-height: 17rem;
  padding: 1.5rem;
  overflow: hidden;
  border: 1px solid #203650;
  border-radius: 0.625rem;
  background: linear-gradient(135deg, rgba(18, 38, 63, 0.92), rgba(8, 21, 38, 0.96)), #0b1728;
  box-shadow:
    0 1rem 2.5rem rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(129, 197, 255, 0.05);
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.project-card::before {
  position: absolute;
  top: 0;
  right: 1.5rem;
  left: 1.5rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, #1dd9ff, transparent);
  box-shadow: 0 0 0.75rem rgba(29, 217, 255, 0.65);
  content: '';
}

.project-card:hover {
  border-color: #315576;
  box-shadow:
    0 1.25rem 3rem rgba(0, 0, 0, 0.28),
    0 0 1.5rem rgba(15, 156, 212, 0.08);
  transform: translateY(-2px);
}

.project-card__image {
  display: block;
  width: 100%;
  height: auto;
  margin-bottom: 1rem;
  border: 1px solid #294059;
  border-radius: 0.375rem;
}

.project-card__labels {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.project-card__labels span {
  padding: 0.25rem 0.6875rem;
  border: 1px solid #2b6681;
  border-radius: 999px;
  background: rgba(10, 60, 82, 0.28);
  color: #bcefff;
  font-size: 0.6875rem;
  letter-spacing: 0.04em;
}

.status-control {
  display: grid;
  gap: 0.375rem;
  margin-bottom: 1rem;
  color: #8999ae;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.status-control select {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #2b435d;
  border-radius: 0.375rem;
  outline: none;
  background: rgba(5, 16, 29, 0.86);
  color: #d4e4f5;
  font: inherit;
  cursor: pointer;
}

.status-control select:focus {
  border-color: #1dd9ff;
  box-shadow: 0 0 0 2px rgba(29, 217, 255, 0.12);
}

.status-control select:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

h2 {
  margin: 0;
  color: #edf7ff;
  font-size: 1.0625rem;
  font-weight: 500;
  line-height: 1.45;
  letter-spacing: 0.01em;
}

.project-card__content {
  margin: 0.75rem 0 1rem;
  color: #aab8cb;
  font-size: 0.875rem;
  line-height: 1.75;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

time {
  display: block;
  padding-top: 0.875rem;
  border-top: 1px solid rgba(80, 111, 143, 0.22);
  color: #72839a;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
}

time + time {
  padding-top: 0.375rem;
  border-top: 0;
  color: #8ca4be;
}

.project-card__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.project-card__actions a {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  min-height: 2.75rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid #2b435d;
  border-radius: 0.55rem;
  color: #bcefff;
  font-size: 0.75rem;
  text-decoration: none;
}
</style>
