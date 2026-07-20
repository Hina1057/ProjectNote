<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import DashboardCharts from '@/components/DashboardCharts.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import type { Project, ProjectCategory, ProjectStatus } from '@/types/project'
import { formatDateTime, getDateTimestamp } from '@/utils/formatDate'

type CategoryFilter = 'All' | ProjectCategory

const categoryOptions: CategoryFilter[] = [
  'All',
  'Bug',
  'Idea',
  'UI',
  'Task',
  'Meeting',
  'Reference',
]
const API_URL = 'http://localhost:5173/projects'

const projects = ref<Project[]>([])
const isLoading = ref(true)
const errorMessage = ref('')
const statusUpdateError = ref('')
const searchQuery = ref('')
const selectedCategory = ref<CategoryFilter>('All')
const updatingProjectIds = ref<number[]>([])

const dashboardStats = computed(() => [
  {
    label: 'Total Notes',
    value: projects.value.length,
  },
  {
    label: 'Todo',
    value: projects.value.filter((project) => project.status === 'Todo').length,
  },
  {
    label: 'In Progress',
    value: projects.value.filter((project) => project.status === 'In Progress').length,
  },
  {
    label: 'Done',
    value: projects.value.filter((project) => project.status === 'Done').length,
  },
])

const dashboardCategories: ProjectCategory[] = ['Bug', 'Idea', 'Task', 'Meeting', 'Reference', 'UI']
const categoryStats = computed(() =>
  dashboardCategories.map((category) => ({
    category,
    value: projects.value.filter((project) => project.category === category).length,
  })),
)

const latestUpdatedAt = computed(() => {
  let latestValue = ''
  let latestTimestamp = -Infinity

  projects.value.forEach((project) => {
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

const filteredProjects = computed(() => {
  const keyword = searchQuery.value.trim().toLocaleLowerCase()

  return projects.value.filter((project) => {
    const matchesKeyword =
      !keyword ||
      project.title.toLocaleLowerCase().includes(keyword) ||
      project.content.toLocaleLowerCase().includes(keyword)
    const matchesCategory =
      selectedCategory.value === 'All' || project.category === selectedCategory.value

    return matchesKeyword && matchesCategory
  })
})

const fetchProjects = async () => {
  try {
    const response = await fetch(API_URL)

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }

    projects.value = (await response.json()) as Project[]
  } catch (error) {
    console.error(error)
    errorMessage.value = 'プロジェクトノートの取得に失敗しました。'
  } finally {
    isLoading.value = false
  }
}

const updateProjectStatus = async (projectId: number, status: ProjectStatus) => {
  const project = projects.value.find((item) => item.id === projectId)

  if (!project || project.status === status) {
    return
  }

  const previousStatus = project.status
  const previousUpdatedAt = project.updatedAt
  const updatedAt = new Date().toISOString()
  project.status = status
  project.updatedAt = updatedAt
  statusUpdateError.value = ''
  updatingProjectIds.value.push(projectId)

  try {
    const response = await fetch(`${API_URL}/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, updatedAt }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }

    const updatedProject = (await response.json()) as Project
    project.status = updatedProject.status
    project.updatedAt = updatedProject.updatedAt ?? updatedAt
  } catch (error) {
    console.error(error)
    project.status = previousStatus
    project.updatedAt = previousUpdatedAt
    statusUpdateError.value = 'ステータスの更新に失敗しました。'
  } finally {
    updatingProjectIds.value = updatingProjectIds.value.filter((id) => id !== projectId)
  }
}

onMounted(fetchProjects)
</script>

<template>
  <main class="home-view">
    <header class="page-header">
      <h1>ProjectNote</h1>
      <RouterLink class="new-project-link" :to="{ name: 'new-project' }">新規登録</RouterLink>
    </header>

    <section
      v-if="!isLoading && !errorMessage"
      class="project-dashboard"
      aria-labelledby="dashboard-title"
    >
      <div class="dashboard-heading">
        <div>
          <p>PROJECT OVERVIEW&nbsp; // &nbsp;LIVE DATA</p>
          <h2 id="dashboard-title">Project Dashboard</h2>
        </div>
        <div class="dashboard-last-updated">
          <span>Last Updated</span>
          <time :datetime="latestUpdatedAt.value || undefined">{{ latestUpdatedAt.label }}</time>
        </div>
      </div>

      <div class="summary-grid">
        <article v-for="stat in dashboardStats" :key="stat.label" class="summary-card">
          <span>{{ stat.label }}</span>
          <strong>{{ stat.value }}</strong>
        </article>
      </div>

      <div class="categories-panel">
        <h3>Categories</h3>
        <ul>
          <li v-for="stat in categoryStats" :key="stat.category">
            <span>{{ stat.category }}</span>
            <strong>{{ stat.value }}</strong>
          </li>
        </ul>
      </div>

      <DashboardCharts :projects="projects" />
    </section>

    <div class="filter-controls">
      <div class="filter-field filter-field--search">
        <label for="project-search">検索</label>
        <input
          id="project-search"
          v-model="searchQuery"
          type="search"
          placeholder="タイトルまたは内容を入力"
        />
      </div>

      <div class="filter-field">
        <label for="category-filter">カテゴリ</label>
        <select id="category-filter" v-model="selectedCategory">
          <option v-for="category in categoryOptions" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </div>
    </div>

    <p v-if="statusUpdateError" class="message message--error" role="alert">
      {{ statusUpdateError }}
    </p>
    <p v-if="isLoading" class="message" role="status">読み込み中です...</p>
    <p v-else-if="errorMessage" class="message message--error" role="alert">
      {{ errorMessage }}
    </p>
    <p v-else-if="filteredProjects.length === 0" class="message">該当するノートがありません</p>
    <section v-else class="project-list" aria-label="プロジェクトノート一覧">
      <ProjectCard
        v-for="project in filteredProjects"
        :key="project.id"
        :project="project"
        :is-updating-status="updatingProjectIds.includes(project.id)"
        @status-change="updateProjectStatus"
      />
    </section>
  </main>
</template>

<style scoped>
.home-view {
  --surface-deep: #050d1a;
  --surface-panel: #0b1728;
  --surface-raised: #101f34;
  --line: #203650;
  --text: #e5edf8;
  --muted: #8d9caf;
  --cyan: #1dd9ff;
  position: relative;
  width: calc(100% - 15rem);
  min-height: 100vh;
  margin-left: 15rem;
  padding: 7rem 2rem 4rem;
  color: var(--text);
  background:
    radial-gradient(circle at 62% 0%, rgba(14, 137, 190, 0.2), transparent 25rem),
    linear-gradient(145deg, #071221 0%, #050b16 52%, #081426 100%);
}

.home-view::before {
  position: fixed;
  z-index: 20;
  inset: 4.5rem auto 0 0;
  box-sizing: border-box;
  width: 15rem;
  padding: 1.5rem 1.5rem;
  border-right: 1px solid rgba(88, 123, 159, 0.22);
  background: linear-gradient(180deg, #071321 0%, #050e1b 100%);
  color: #aebdd0;
  content: 'COMMAND CENTER\A DEEP WORK ACTIVE';
  white-space: pre;
  font-size: 0.75rem;
  line-height: 1.8;
  letter-spacing: 0.12em;
}

.home-view::after {
  position: fixed;
  z-index: 22;
  bottom: 1.5rem;
  left: 1.25rem;
  box-sizing: border-box;
  width: 12.5rem;
  padding: 0.75rem 0.875rem;
  border: 1px solid #1c334d;
  border-radius: 0.375rem;
  background: rgba(13, 30, 50, 0.92);
  box-shadow: inset 0 -2px 0 rgba(31, 217, 255, 0.1);
  color: #9fadc0;
  content: '●  SYSTEM_READY';
  font-size: 0.625rem;
  letter-spacing: 0.04em;
}

.page-header {
  position: fixed;
  z-index: 30;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: 4.5rem;
  padding: 0 1.25rem;
  border-bottom: 1px solid rgba(69, 109, 147, 0.22);
  background: rgba(5, 14, 26, 0.96);
  box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(1rem);
}

h1 {
  margin: 0;
  color: #e7f6ff;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: -0.04em;
}

.new-project-link {
  flex-shrink: 0;
  padding: 0.6875rem 1.125rem;
  border: 1px solid rgba(126, 231, 255, 0.5);
  border-radius: 0.375rem;
  background: linear-gradient(110deg, #09cbe9, #4385ff);
  box-shadow: 0 0 1.25rem rgba(27, 190, 255, 0.35);
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-decoration: none;
}

.project-dashboard {
  max-width: 72rem;
  margin: 0 auto 2rem;
}

.dashboard-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.dashboard-heading p {
  margin: 0 0 0.375rem;
  color: var(--cyan);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.625rem;
  letter-spacing: 0.12em;
}

.dashboard-heading h2 {
  margin: 0;
  color: #edf7ff;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 400;
  letter-spacing: 0.025em;
}

.dashboard-last-updated {
  display: grid;
  gap: 0.375rem;
  min-width: 12rem;
  padding: 0.625rem 0.875rem;
  border: 1px solid rgba(48, 104, 135, 0.68);
  border-radius: 0.375rem;
  background: rgba(8, 27, 45, 0.68);
  text-align: right;
}

.dashboard-last-updated span {
  color: #71859d;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.5625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.dashboard-last-updated time {
  color: #aeefff;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.summary-card,
.categories-panel {
  border: 1px solid rgba(53, 91, 126, 0.72);
  background: linear-gradient(145deg, rgba(20, 46, 74, 0.72), rgba(8, 23, 40, 0.84));
  box-shadow:
    0 0.875rem 2rem rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(109, 221, 255, 0.08);
  backdrop-filter: blur(0.75rem);
}

.summary-card {
  position: relative;
  display: grid;
  gap: 0.75rem;
  min-height: 7.75rem;
  padding: 1.25rem;
  overflow: hidden;
  border-radius: 0.5rem;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.summary-card::before {
  position: absolute;
  top: 0;
  right: 1rem;
  left: 1rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--cyan), transparent);
  box-shadow: 0 0 0.75rem rgba(29, 217, 255, 0.55);
  content: '';
}

.summary-card:hover,
.categories-panel li:hover {
  border-color: rgba(63, 205, 240, 0.62);
  box-shadow:
    0 1rem 2.25rem rgba(0, 0, 0, 0.25),
    0 0 1.25rem rgba(29, 217, 255, 0.1);
  transform: translateY(-2px);
}

.summary-card span {
  color: #8ea2ba;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.summary-card strong {
  align-self: end;
  color: #c9f5ff;
  font-size: 2rem;
  font-weight: 400;
  line-height: 1;
  text-shadow: 0 0 1rem rgba(29, 217, 255, 0.26);
}

.categories-panel {
  margin-top: 1rem;
  padding: 1.25rem;
  border-radius: 0.5rem;
}

.categories-panel h3 {
  margin: 0 0 1rem;
  color: #b8c9dc;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.categories-panel ul {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.categories-panel li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid rgba(47, 81, 114, 0.68);
  border-radius: 0.375rem;
  background: rgba(7, 21, 38, 0.66);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.categories-panel li span {
  min-width: 0;
  overflow: hidden;
  color: #95a8bf;
  font-size: 0.6875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.categories-panel li strong {
  color: #65e8ff;
  font-size: 1rem;
  font-weight: 500;
}

.filter-controls {
  height: 0;
  margin: 0;
}

.filter-field {
  display: grid;
  gap: 0.5rem;
}

.filter-field--search {
  position: fixed;
  z-index: 32;
  top: 0.8125rem;
  left: 7rem;
  width: min(25rem, calc(100vw - 29rem));
}

.filter-field--search::before {
  position: absolute;
  z-index: 1;
  top: 0.7rem;
  left: 0.875rem;
  color: #b9c9dc;
  content: '⌕';
  font-size: 1.125rem;
}

.filter-field label {
  color: #aab8ca;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.filter-field--search label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.filter-field:not(.filter-field--search) {
  position: fixed;
  z-index: 23;
  top: 9.5rem;
  left: 1.5rem;
  width: 12rem;
}

.filter-field input,
.filter-field select {
  width: 100%;
  padding: 0.6875rem 0.875rem;
  border: 1px solid #1d324a;
  border-radius: 0.375rem;
  outline: none;
  background: rgba(8, 19, 33, 0.96);
  color: #dce9f7;
  font: inherit;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.filter-field input:focus,
.filter-field select:focus {
  border-color: var(--cyan);
  box-shadow: 0 0 0 2px rgba(29, 217, 255, 0.14);
}

.filter-field input::placeholder {
  color: #6f7c8f;
}

.filter-field--search input {
  height: 2.875rem;
  padding-left: 2.75rem;
}

.filter-field select {
  min-width: 12rem;
  border-color: #2c4967;
  box-shadow: inset 2px 0 0 rgba(29, 217, 255, 0.55);
  cursor: pointer;
}

.filter-field select option {
  background: #0a1626;
  color: #dce9f7;
}

.project-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 22.5rem), 1fr));
  gap: 1.25rem;
  max-width: 72rem;
  margin: 0 auto;
}

.message {
  max-width: 72rem;
  margin: 0 auto 1rem;
  padding: 1rem 1.125rem;
  border: 1px solid #203650;
  border-radius: 0.5rem;
  background: rgba(12, 27, 47, 0.9);
  color: #aebdd0;
}

.message--error {
  border-color: rgba(255, 100, 120, 0.55);
  color: #ff9aaa;
}

:global(body:has(.home-view) #vue-inspector-container),
:global(body:has(.home-view) #__vue-devtools-container__) {
  display: none !important;
}

@media (max-width: 56.25rem) {
  .home-view {
    width: 100%;
    margin-left: 0;
    padding: 6.5rem 1rem 3rem;
  }

  .home-view::before,
  .home-view::after {
    display: none;
  }

  .filter-controls {
    display: grid;
    gap: 1rem;
    height: auto;
    margin-bottom: 1.5rem;
  }

  .filter-field--search,
  .filter-field:not(.filter-field--search) {
    position: relative;
    z-index: auto;
    inset: auto;
    width: 100%;
  }

  .filter-field--search label {
    position: absolute;
  }

  .filter-field select {
    min-width: 0;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .categories-panel ul {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 32.5rem) {
  .page-header {
    padding: 0 0.875rem;
  }

  .new-project-link {
    padding: 0.625rem 0.875rem;
  }

  .dashboard-heading {
    display: block;
  }

  .dashboard-last-updated {
    width: 100%;
    margin-top: 1rem;
    text-align: left;
  }

  .project-list {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .categories-panel ul {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
