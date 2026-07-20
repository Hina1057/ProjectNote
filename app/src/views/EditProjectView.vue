<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import type { Project, ProjectCategory, ProjectStatus } from '@/types/project'

const API_URL = 'http://localhost:5173/projects'
const categoryOptions: ProjectCategory[] = ['Bug', 'Idea', 'UI', 'Task', 'Meeting', 'Reference']
const statusOptions: ProjectStatus[] = ['Todo', 'In Progress', 'Done']

const route = useRoute()
const router = useRouter()
const project = ref<Project | null>(null)
const isLoading = ref(true)
const isSubmitting = ref(false)
const loadError = ref('')
const errorMessage = ref('')
const form = reactive<Pick<Project, 'title' | 'category' | 'content' | 'status'>>({
  title: '',
  category: 'Bug',
  content: '',
  status: 'Todo',
})

const hasCurrentStatusOption = computed(() =>
  statusOptions.includes(form.status as ProjectStatus),
)

const fetchProject = async () => {
  try {
    const response = await fetch(`${API_URL}/${route.params.id}`)

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }

    const currentProject = (await response.json()) as Project
    project.value = currentProject
    form.title = currentProject.title
    form.category = currentProject.category
    form.content = currentProject.content
    form.status = currentProject.status
  } catch (error) {
    console.error(error)
    loadError.value = 'ノートが見つかりません'
  } finally {
    isLoading.value = false
  }
}

const updateProject = async () => {
  if (!project.value) {
    return
  }

  errorMessage.value = ''
  const title = form.title.trim()
  const content = form.content.trim()

  if (!title || !content) {
    errorMessage.value = 'タイトルと内容は必須です。空白以外の文字を入力してください。'
    return
  }

  isSubmitting.value = true

  try {
    const response = await fetch(`${API_URL}/${project.value.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        category: form.category,
        content,
        status: form.status,
        updatedAt: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }

    await router.push({ name: 'project-detail', params: { id: project.value.id } })
  } catch (error) {
    console.error(error)
    errorMessage.value = 'プロジェクトノートの更新に失敗しました。'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(fetchProject)
</script>

<template>
  <main class="edit-project-view">
    <header class="edit-project-header">
      <RouterLink class="brand" :to="{ name: 'home' }">ProjectNote</RouterLink>
      <span class="header-nav" aria-hidden="true">EDIT_NOTE&nbsp; // &nbsp;UPDATE_MODE</span>
    </header>

    <p v-if="isLoading" class="state-message" role="status">読み込み中です...</p>
    <div v-else-if="loadError" class="state-message state-message--error" role="alert">
      <p>{{ loadError }}</p>
      <RouterLink :to="{ name: 'home' }">一覧へ戻る</RouterLink>
    </div>

    <section v-else-if="project" class="form-panel">
      <div class="panel-heading">
        <div>
          <p>SYSTEM ACTION&nbsp; // &nbsp;EDIT NOTE {{ project.id }}</p>
          <h1>ノート編集</h1>
        </div>
        <span class="edit-mode">● EDIT_MODE: ACTIVE</span>
      </div>

      <form class="project-form" @submit.prevent="updateProject">
        <div class="form-field">
          <label for="edit-title">タイトル</label>
          <input
            id="edit-title"
            v-model="form.title"
            name="title"
            type="text"
            placeholder="ノートのタイトルを入力..."
            required
          />
        </div>

        <div class="form-row">
          <div class="form-field">
            <label for="edit-category">カテゴリ</label>
            <select id="edit-category" v-model="form.category" name="category">
              <option v-for="category in categoryOptions" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
          </div>

          <div class="form-field">
            <label for="edit-status">ステータス</label>
            <select id="edit-status" v-model="form.status" name="status">
              <option v-if="!hasCurrentStatusOption" :value="form.status">
                {{ form.status }}
              </option>
              <option v-for="status in statusOptions" :key="status" :value="status">
                {{ status }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-field">
          <label for="edit-content">内容</label>
          <textarea
            id="edit-content"
            v-model="form.content"
            name="content"
            rows="6"
            placeholder="メモの内容を記述してください..."
            required
          ></textarea>
        </div>

        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

        <div class="form-actions">
          <button type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? '保存中...' : '変更を保存' }}
          </button>
          <RouterLink
            class="back-link"
            :to="{ name: 'project-detail', params: { id: project.id } }"
          >
            キャンセル
          </RouterLink>
        </div>
      </form>
    </section>

    <footer class="edit-project-footer" aria-hidden="true">
      PROJECTNOTE&nbsp; // &nbsp;SYSTEM_READY
    </footer>
  </main>
</template>

<style scoped>
.edit-project-view {
  --cyan: #33e4ff;
  min-height: 100vh;
  padding: 6.75rem 1rem 5.5rem;
  color: #d9e6f6;
  background:
    linear-gradient(90deg, rgba(13, 29, 48, 0.9) 0 3.5rem, transparent 3.5rem),
    radial-gradient(circle at 50% 15%, rgba(16, 117, 160, 0.12), transparent 25rem), #071321;
}

.edit-project-header {
  position: fixed;
  z-index: 20;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 4.75rem;
  padding: 0 2.5rem;
  border-bottom: 1px solid rgba(65, 112, 151, 0.25);
  background: rgba(5, 14, 26, 0.96);
  box-shadow: 0 0.625rem 2rem rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(1rem);
}

.brand {
  color: #7cecff;
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.05em;
  text-decoration: none;
  text-shadow: 0 0 1rem rgba(44, 222, 255, 0.45);
}

.header-nav {
  color: #9eacbd;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.6875rem;
  letter-spacing: 0.09em;
}

.form-panel,
.state-message {
  position: relative;
  width: min(100%, 42rem);
  margin: 0 auto;
  border: 1px solid #213a55;
  border-radius: 0.5rem;
  background: linear-gradient(145deg, rgba(16, 36, 60, 0.96), rgba(9, 24, 43, 0.98)),
    #0c1b30;
  box-shadow:
    0 1.5rem 4rem rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(99, 216, 255, 0.08);
}

.form-panel::before,
.state-message::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 2px;
  border-radius: 0.5rem 0.5rem 0 0;
  background: linear-gradient(90deg, transparent, var(--cyan), transparent);
  box-shadow: 0 0 1rem rgba(51, 228, 255, 0.45);
  content: '';
}

.state-message {
  padding: 3rem 2rem;
  color: #aabbd0;
  text-align: center;
}

.state-message p {
  margin: 0 0 1rem;
}

.state-message a {
  color: #7cecff;
}

.state-message--error {
  color: #ffb4ae;
}

.panel-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1.5rem;
  margin: 0 2rem;
  padding: 2rem 0 1.5rem;
  border-bottom: 1px solid rgba(74, 108, 141, 0.24);
}

.panel-heading p {
  margin: 0 0 0.375rem;
  color: var(--cyan);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
}

h1 {
  margin: 0;
  color: #e8f1ff;
  font-size: clamp(1.75rem, 4vw, 2rem);
  font-weight: 400;
  letter-spacing: 0.04em;
}

.edit-mode {
  padding-bottom: 0.25rem;
  color: #42dcf7;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.project-form {
  display: grid;
  gap: 1.5rem;
  padding: 2rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
}

.form-field {
  display: grid;
  gap: 0.625rem;
}

.form-field label {
  color: #b0bfd0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

input,
select,
textarea {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid #1e334b;
  border-radius: 0.25rem;
  outline: none;
  color: #dbe8f7;
  background: rgba(3, 13, 25, 0.9);
  font: inherit;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}

input::placeholder,
textarea::placeholder {
  color: #6f7e93;
}

input:focus,
select:focus,
textarea:focus {
  border-color: var(--cyan);
  background: rgba(4, 17, 31, 0.98);
  box-shadow:
    0 0 0 2px rgba(51, 228, 255, 0.12),
    0 0 1rem rgba(37, 197, 238, 0.14);
}

select {
  cursor: pointer;
}

select option {
  background: #071525;
  color: #dbe8f7;
}

textarea {
  min-height: 9rem;
  resize: vertical;
}

.form-actions {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(9rem, 0.85fr);
  gap: 1rem;
  padding-top: 0.5rem;
}

button,
.back-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 4rem;
  border-radius: 0.25rem;
  font: inherit;
  font-size: 1.125rem;
  letter-spacing: 0.06em;
  text-decoration: none;
}

button {
  border: 1px solid rgba(107, 235, 255, 0.6);
  background: linear-gradient(110deg, #086fd8, #27bfe5 60%, #5adcf1);
  box-shadow: 0 0 1.5rem rgba(30, 173, 235, 0.35);
  color: #06101d;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.back-link {
  border: 1px solid #304761;
  background: rgba(10, 24, 42, 0.7);
  color: #c8d4e3;
}

.back-link:hover {
  border-color: #4c6c8d;
  color: #ffffff;
}

.error-message {
  margin: 0;
  padding: 0.875rem 1rem;
  border: 1px solid rgba(255, 100, 120, 0.55);
  border-radius: 0.25rem;
  background: rgba(112, 26, 42, 0.18);
  color: #ff9aaa;
  font-size: 0.875rem;
}

.edit-project-footer {
  margin-top: 3rem;
  color: #58d9ef;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  text-align: center;
}

:global(body:has(.edit-project-view) #vue-inspector-container),
:global(body:has(.edit-project-view) #__vue-devtools-container__) {
  display: none !important;
}

@media (max-width: 43.75rem) {
  .edit-project-view {
    padding: 6rem 0.75rem 3rem;
    background: #071321;
  }

  .edit-project-header {
    height: 4.25rem;
    padding: 0 1rem;
  }

  .header-nav {
    display: none;
  }

  .panel-heading {
    align-items: start;
    margin: 0 1.25rem;
    padding: 1.5rem 0 1.25rem;
  }

  .edit-mode {
    display: none;
  }

  .project-form {
    gap: 1.25rem;
    padding: 1.25rem;
  }

  .form-row,
  .form-actions {
    grid-template-columns: 1fr;
  }

  button,
  .back-link {
    min-height: 3.5rem;
  }
}
</style>
