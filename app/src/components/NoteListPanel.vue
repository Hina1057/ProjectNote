<script setup lang="ts">
import { computed, ref } from 'vue'
import ProjectCard from '@/components/ProjectCard.vue'
import UiIcon from '@/components/UiIcon.vue'
import type { Project, ProjectCategory, ProjectStatus } from '@/types/project'
import { getCategoryFilterLabel } from '@/utils/uiLabels'

type CategoryFilter = 'All' | ProjectCategory

const props = defineProps<{
  projects: Project[]
  selectedWorkspaceId: string | null
  isLoading: boolean
  errorMessage: string
  statusUpdateError: string
  updatingProjectIds: number[]
}>()

const emit = defineEmits<{
  statusChange: [projectId: number, status: ProjectStatus]
}>()

const handleStatusChange = (projectId: number, status: ProjectStatus) => {
  emit('statusChange', projectId, status)
}

const categoryOptions: CategoryFilter[] = [
  'All',
  'Bug',
  'Idea',
  'UI',
  'Task',
  'Meeting',
  'Reference',
]
const searchQuery = ref('')
const selectedCategory = ref<CategoryFilter>('All')

const filteredProjects = computed(() => {
  const keyword = searchQuery.value.trim().toLocaleLowerCase()

  return props.projects.filter((project) => {
    const matchesKeyword =
      !keyword ||
      project.title.toLocaleLowerCase().includes(keyword) ||
      project.content.toLocaleLowerCase().includes(keyword)
    const matchesCategory =
      selectedCategory.value === 'All' || project.category === selectedCategory.value

    return matchesKeyword && matchesCategory
  })
})
</script>

<template>
  <section id="notes" class="notes-section" aria-labelledby="notes-title">
    <p
      v-if="!selectedWorkspaceId"
      class="message ui-notice ui-notice--empty"
      role="status"
    >
      プロジェクトを選択するとノートを表示できます
    </p>

    <template v-else>
      <header class="notes-section__heading">
        <div>
          <p>プロジェクトノート</p>
          <h2 id="notes-title">ノート一覧</h2>
        </div>
        <span v-if="!isLoading && !errorMessage" aria-live="polite">
          {{ filteredProjects.length }}件表示
        </span>
      </header>

      <div class="filter-controls">
        <div class="filter-field filter-field--search">
          <label for="project-search">検索</label>
          <div class="search-input">
            <UiIcon name="search" />
            <input
              id="project-search"
              v-model="searchQuery"
              type="search"
              placeholder="タイトルまたは内容を検索"
            />
          </div>
        </div>
        <div class="filter-field">
          <label for="category-filter">カテゴリ</label>
          <select id="category-filter" v-model="selectedCategory">
            <option v-for="category in categoryOptions" :key="category" :value="category">
              {{ getCategoryFilterLabel(category) }}
            </option>
          </select>
        </div>
      </div>

      <p v-if="statusUpdateError" class="message ui-notice ui-notice--error" role="alert">
        {{ statusUpdateError }}
      </p>
      <p v-if="isLoading" class="message ui-notice ui-notice--loading" role="status">
        ノートを読み込んでいます
      </p>
      <p v-else-if="errorMessage" class="message ui-notice ui-notice--error" role="alert">
        {{ errorMessage }}
      </p>
      <p
        v-else-if="filteredProjects.length === 0"
        class="message ui-notice ui-notice--empty"
        role="status"
      >
        {{ projects.length === 0 ? 'ノートはまだありません' : '該当するノートがありません' }}
      </p>
      <div v-else class="project-list" aria-label="プロジェクトノート一覧">
        <ProjectCard
          v-for="project in filteredProjects"
          :key="project.id"
          :project="project"
          :is-updating-status="updatingProjectIds.includes(project.id)"
          @status-change="handleStatusChange"
        />
      </div>
    </template>
  </section>
</template>
