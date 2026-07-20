<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import type { Project } from '@/types/project'
import { formatDateTime } from '@/utils/formatDate'

const API_URL = 'http://localhost:5173/projects'
const route = useRoute()
const router = useRouter()
const project = ref<Project | null>(null)
const isLoading = ref(true)
const hasError = ref(false)
const isDeleting = ref(false)
const deleteError = ref('')

const formattedCreatedAt = computed(() => formatDateTime(project.value?.createdAt))
const updatedAtValue = computed(() => project.value?.updatedAt ?? project.value?.createdAt)
const formattedUpdatedAt = computed(() => formatDateTime(updatedAtValue.value))

const fetchProject = async () => {
  try {
    const response = await fetch(`${API_URL}/${route.params.id}`)

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }

    project.value = (await response.json()) as Project
  } catch (error) {
    console.error(error)
    hasError.value = true
  } finally {
    isLoading.value = false
  }
}

const deleteProject = async () => {
  if (!project.value || !window.confirm('このノートを削除しますか？')) {
    return
  }

  isDeleting.value = true
  deleteError.value = ''

  try {
    const response = await fetch(`${API_URL}/${project.value.id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }

    await router.push({ name: 'home' })
  } catch (error) {
    console.error(error)
    deleteError.value = 'ノートの削除に失敗しました。'
  } finally {
    isDeleting.value = false
  }
}

onMounted(fetchProject)
</script>

<template>
  <main class="project-detail-view">
    <header class="detail-header">
      <RouterLink class="brand" :to="{ name: 'home' }">ProjectNote</RouterLink>
      <span class="header-status" aria-hidden="true">DETAIL_VIEW&nbsp; // &nbsp;READ_ONLY</span>
    </header>

    <div class="detail-shell">
      <RouterLink class="back-link" :to="{ name: 'home' }">
        <span aria-hidden="true">←</span>
        一覧へ戻る
      </RouterLink>

      <p v-if="isLoading" class="state-message" role="status">読み込み中です...</p>
      <p v-else-if="hasError" class="state-message state-message--error" role="alert">
        ノートが見つかりません
      </p>

      <article v-else-if="project" class="detail-card">
        <div class="detail-card__heading">
          <div class="heading-copy">
            <p class="eyebrow">PROJECT NOTE&nbsp; // &nbsp;{{ project.id }}</p>
            <h1>{{ project.title }}</h1>
          </div>

          <div class="meta-tags" aria-label="ノート情報">
            <span class="category-tag">{{ project.category }}</span>
            <span class="status-tag">
              <i aria-hidden="true"></i>
              {{ project.status }}
            </span>
          </div>
        </div>

        <dl class="note-meta">
          <div>
            <dt>カテゴリ</dt>
            <dd>{{ project.category }}</dd>
          </div>
          <div>
            <dt>ステータス</dt>
            <dd>{{ project.status }}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>
              <time :datetime="project.createdAt || undefined">{{ formattedCreatedAt }}</time>
            </dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>
              <time :datetime="updatedAtValue || undefined">{{ formattedUpdatedAt }}</time>
            </dd>
          </div>
        </dl>

        <section class="content-section">
          <h2>内容</h2>
          <p>{{ project.content }}</p>
        </section>

        <figure v-if="project.image" class="note-image">
          <img :src="project.image" :alt="`${project.title}の画像`" />
        </figure>

        <p v-if="deleteError" class="delete-error" role="alert">{{ deleteError }}</p>

        <div class="detail-actions">
          <RouterLink
            class="edit-button"
            :to="{ name: 'edit-project', params: { id: project.id } }"
          >
            編集
          </RouterLink>
          <button class="delete-button" type="button" :disabled="isDeleting" @click="deleteProject">
            {{ isDeleting ? '削除中...' : '削除' }}
          </button>
        </div>

        <footer class="detail-card__footer" aria-hidden="true">
          <span>DATA_SOURCE&nbsp; // &nbsp;PROJECTS_API</span>
          <span>RECORD_READY</span>
        </footer>
      </article>
    </div>
  </main>
</template>

<style scoped>
.project-detail-view {
  --cyan: #33e4ff;
  --line: #213a55;
  min-height: 100vh;
  padding: 7rem 1rem 5rem;
  color: #d9e6f6;
  background:
    linear-gradient(90deg, rgba(13, 29, 48, 0.82) 0 3.5rem, transparent 3.5rem),
    radial-gradient(circle at 50% 12%, rgba(17, 133, 183, 0.14), transparent 28rem),
    linear-gradient(145deg, #071422 0%, #050d19 55%, #081525 100%);
}

.detail-header {
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

.header-status {
  color: #9eacbd;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.6875rem;
  letter-spacing: 0.09em;
}

.detail-shell {
  width: min(100%, 56rem);
  margin: 0 auto;
}

.back-link {
  display: inline-flex;
  gap: 0.625rem;
  align-items: center;
  margin-bottom: 1.25rem;
  padding: 0.625rem 0.875rem;
  border: 1px solid #27506d;
  border-radius: 0.375rem;
  background: rgba(8, 28, 47, 0.78);
  color: #b9eaff;
  font-size: 0.8125rem;
  text-decoration: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease;
}

.back-link:hover,
.back-link:focus-visible {
  border-color: var(--cyan);
  color: #ffffff;
  box-shadow: 0 0 1rem rgba(51, 228, 255, 0.16);
  outline: none;
}

.state-message,
.detail-card {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 0.5rem;
  background: linear-gradient(145deg, rgba(16, 36, 60, 0.97), rgba(8, 22, 40, 0.99)),
    #0c1b30;
  box-shadow:
    0 1.5rem 4rem rgba(0, 0, 0, 0.36),
    inset 0 1px 0 rgba(99, 216, 255, 0.07);
}

.state-message::before,
.detail-card::before {
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
  margin: 0;
  padding: 3rem 2rem;
  color: #aabbd0;
  text-align: center;
}

.state-message--error {
  color: #ffb4ae;
}

.detail-card {
  overflow: hidden;
}

.detail-card__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  padding: 2.25rem 2.5rem 1.75rem;
  border-bottom: 1px solid rgba(74, 108, 141, 0.25);
}

.heading-copy {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 0.5rem;
  color: var(--cyan);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.6875rem;
  letter-spacing: 0.11em;
}

h1 {
  margin: 0;
  color: #edf6ff;
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  font-weight: 400;
  line-height: 1.35;
  letter-spacing: 0.025em;
  overflow-wrap: anywhere;
}

.meta-tags {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

.category-tag,
.status-tag {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
}

.category-tag {
  border: 1px solid #2b728e;
  background: rgba(14, 91, 116, 0.22);
  color: #bcefff;
}

.status-tag {
  border: 1px solid #315472;
  background: rgba(21, 49, 77, 0.68);
  color: #c9d8ea;
}

.status-tag i {
  width: 0.4375rem;
  height: 0.4375rem;
  border-radius: 50%;
  background: var(--cyan);
  box-shadow: 0 0 0.625rem rgba(51, 228, 255, 0.72);
}

.note-meta {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin: 0;
  padding: 1.25rem 2.5rem;
  border-bottom: 1px solid rgba(74, 108, 141, 0.2);
  background: rgba(5, 17, 31, 0.34);
}

.note-meta div {
  padding: 0 1.25rem;
  border-left: 1px solid rgba(74, 108, 141, 0.22);
}

.note-meta div:first-child {
  padding-left: 0;
  border-left: 0;
}

dt {
  margin-bottom: 0.375rem;
  color: #71859d;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.625rem;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

dd {
  margin: 0;
  color: #c9d7e7;
  font-size: 0.875rem;
}

.content-section {
  padding: 2rem 2.5rem 2.25rem;
}

.content-section h2 {
  margin: 0 0 1rem;
  color: #74e9ff;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.12em;
}

.content-section h2::before {
  margin-right: 0.625rem;
  color: var(--cyan);
  content: '▣';
}

.content-section p {
  margin: 0;
  color: #b9c7d8;
  font-size: 1rem;
  line-height: 1.95;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.note-image {
  margin: 0;
  padding: 0 2.5rem 2.5rem;
}

.note-image img {
  display: block;
  width: 100%;
  max-height: 32rem;
  object-fit: contain;
  border: 1px solid #294866;
  border-radius: 0.375rem;
  background: rgba(3, 11, 20, 0.74);
}

.delete-error {
  margin: 0 2.5rem 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 100, 112, 0.42);
  border-radius: 0.375rem;
  background: rgba(104, 19, 30, 0.2);
  color: #ffb4bd;
  font-size: 0.8125rem;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 0 2.5rem 2rem;
}

.edit-button,
.delete-button {
  padding: 0.6875rem 1.25rem;
  border-radius: 0.375rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-decoration: none;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.edit-button {
  border: 1px solid #2d9cc0;
  background: linear-gradient(180deg, rgba(16, 112, 151, 0.92), rgba(10, 69, 107, 0.96));
  color: #e1faff;
  box-shadow: 0 0 1rem rgba(51, 228, 255, 0.14);
}

.edit-button:hover,
.edit-button:focus-visible {
  border-color: #5de7ff;
  outline: none;
  box-shadow: 0 0 1.25rem rgba(51, 228, 255, 0.25);
  transform: translateY(-1px);
}

.delete-button {
  border: 1px solid #d44757;
  background: linear-gradient(180deg, rgba(159, 35, 51, 0.9), rgba(107, 22, 34, 0.96));
  color: #fff0f2;
  box-shadow: 0 0 1rem rgba(212, 71, 87, 0.15);
}

.delete-button:hover:not(:disabled),
.delete-button:focus-visible {
  border-color: #ff7886;
  outline: none;
  box-shadow: 0 0 1.25rem rgba(255, 87, 104, 0.28);
  transform: translateY(-1px);
}

.delete-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.detail-card__footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 2.5rem;
  border-top: 1px solid rgba(74, 108, 141, 0.2);
  background: rgba(4, 14, 26, 0.48);
  color: #65788f;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.5625rem;
  letter-spacing: 0.09em;
}

@media (max-width: 42rem) {
  .project-detail-view {
    padding-top: 6rem;
    background:
      radial-gradient(circle at 50% 8%, rgba(17, 133, 183, 0.14), transparent 22rem),
      #071321;
  }

  .detail-header {
    height: 4.25rem;
    padding: 0 1rem;
  }

  .header-status {
    display: none;
  }

  .detail-card__heading {
    display: block;
    padding: 1.75rem 1.25rem 1.5rem;
  }

  .meta-tags {
    justify-content: flex-start;
    margin-top: 1rem;
  }

  .note-meta {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1.25rem;
  }

  .note-meta div,
  .note-meta div:first-child {
    padding: 0 0 1rem;
    border-bottom: 1px solid rgba(74, 108, 141, 0.2);
    border-left: 0;
  }

  .note-meta div:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .content-section {
    padding: 1.5rem 1.25rem 1.75rem;
  }

  .note-image {
    padding: 0 1.25rem 1.5rem;
  }

  .delete-error {
    margin: 0 1.25rem 1rem;
  }

  .detail-actions {
    padding: 0 1.25rem 1.5rem;
  }

  .detail-card__footer {
    padding: 0.875rem 1.25rem;
  }
}
</style>
