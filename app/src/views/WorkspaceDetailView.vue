<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { onAuthStateChanged, type Unsubscribe as AuthUnsubscribe, type User } from 'firebase/auth'
import {
  doc,
  onSnapshot,
  Timestamp,
  type DocumentData,
  type Unsubscribe as FirestoreUnsubscribe,
} from 'firebase/firestore'
import { RouterLink, useRoute } from 'vue-router'
import UiIcon from '@/components/UiIcon.vue'
import { useSelectedWorkspace } from '@/composables/useSelectedWorkspace'
import { auth, db, isFirebaseConfigured } from '@/firebase'
import { formatDateTime } from '@/utils/formatDate'
import { getRoleLabel } from '@/utils/uiLabels'

type ProjectRole = 'host' | 'member'

interface WorkspaceProject {
  id: string
  name: string
  description: string
  hostId: string
  inviteCode: string
  createdAt: unknown
  updatedAt: unknown
}

const route = useRoute()
const { selectWorkspace } = useSelectedWorkspace()
const user = ref<User | null>(null)
const project = ref<WorkspaceProject | null>(null)
const role = ref<ProjectRole | null>(null)
const isAuthReady = ref(false)
const isLoading = ref(true)
const errorMessage = ref('')
const copyMessage = ref('')
const copyError = ref('')
const isCopying = ref(false)

let authUnsubscribe: AuthUnsubscribe | undefined
let membershipUnsubscribe: FirestoreUnsubscribe | undefined
let projectUnsubscribe: FirestoreUnsubscribe | undefined
let copyFeedbackTimeout: number | undefined

const projectId = computed(() => String(route.params.projectId ?? ''))

const getString = (data: DocumentData, field: string): string => {
  const value = data[field]
  return typeof value === 'string' ? value : ''
}

const getRole = (value: unknown): ProjectRole => (value === 'host' ? 'host' : 'member')

const formatFirestoreDate = (value: unknown): string => {
  if (value instanceof Timestamp) {
    return formatDateTime(value.toDate().toISOString())
  }

  if (value instanceof Date) {
    return formatDateTime(value.toISOString())
  }

  return typeof value === 'string' ? formatDateTime(value) : '—'
}

const formattedCreatedAt = computed(() => formatFirestoreDate(project.value?.createdAt))
const formattedUpdatedAt = computed(() => formatFirestoreDate(project.value?.updatedAt))

const clearCopyFeedback = () => {
  copyMessage.value = ''
  copyError.value = ''

  if (copyFeedbackTimeout !== undefined) {
    window.clearTimeout(copyFeedbackTimeout)
    copyFeedbackTimeout = undefined
  }
}

const stopWorkspaceSubscriptions = () => {
  membershipUnsubscribe?.()
  projectUnsubscribe?.()
  membershipUnsubscribe = undefined
  projectUnsubscribe = undefined
}

const subscribeToWorkspace = (currentUser: User, currentProjectId: string) => {
  stopWorkspaceSubscriptions()
  clearCopyFeedback()
  project.value = null
  role.value = null
  errorMessage.value = ''
  isLoading.value = true

  if (!currentProjectId) {
    errorMessage.value = '共有プロジェクトが見つかりません。'
    isLoading.value = false
    return
  }

  membershipUnsubscribe = onSnapshot(
    doc(db, 'users', currentUser.uid, 'projects', currentProjectId),
    (membershipSnapshot) => {
      if (!membershipSnapshot.exists()) {
        projectUnsubscribe?.()
        projectUnsubscribe = undefined
        project.value = null
        role.value = null
        errorMessage.value = 'プロジェクトが見つからないか、参加権限がありません。'
        isLoading.value = false
        return
      }

      role.value = getRole(membershipSnapshot.data().role)
      projectUnsubscribe?.()
      projectUnsubscribe = onSnapshot(
        doc(db, 'projects', currentProjectId),
        (projectSnapshot) => {
          if (!projectSnapshot.exists()) {
            project.value = null
            errorMessage.value = '共有プロジェクトが見つかりません。'
            isLoading.value = false
            return
          }

          const data = projectSnapshot.data()
          project.value = {
            id: projectSnapshot.id,
            name: getString(data, 'name') || '名称未設定のプロジェクト',
            description: getString(data, 'description'),
            hostId: getString(data, 'hostId'),
            inviteCode: getString(data, 'inviteCode'),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          }
          selectWorkspace(currentProjectId)
          errorMessage.value = ''
          isLoading.value = false
        },
        (error) => {
          console.error(error)
          project.value = null
          errorMessage.value = '共有プロジェクト情報の読み込みに失敗しました。'
          isLoading.value = false
        },
      )
    },
    (error) => {
      console.error(error)
      project.value = null
      role.value = null
      errorMessage.value = '参加情報の確認に失敗しました。'
      isLoading.value = false
    },
  )
}

const copyInviteCode = async () => {
  if (!user.value || !project.value?.inviteCode || isCopying.value) {
    return
  }

  clearCopyFeedback()
  isCopying.value = true

  try {
    await navigator.clipboard.writeText(project.value.inviteCode)
    copyMessage.value = 'コピーしました'
    copyFeedbackTimeout = window.setTimeout(() => {
      copyMessage.value = ''
      copyFeedbackTimeout = undefined
    }, 3500)
  } catch (error) {
    console.error(error)
    copyError.value = '参加コードのコピーに失敗しました。'
  } finally {
    isCopying.value = false
  }
}

onMounted(() => {
  if (!isFirebaseConfigured) {
    isAuthReady.value = true
    isLoading.value = false
    errorMessage.value = 'Firebaseの設定を確認してください。'
    return
  }

  authUnsubscribe = onAuthStateChanged(
    auth,
    (currentUser) => {
      stopWorkspaceSubscriptions()
      user.value = currentUser
      isAuthReady.value = true

      if (currentUser) {
        subscribeToWorkspace(currentUser, projectId.value)
      } else {
        project.value = null
        role.value = null
        isLoading.value = false
      }
    },
    (error) => {
      console.error(error)
      isAuthReady.value = true
      isLoading.value = false
      errorMessage.value = 'ログイン状態の確認に失敗しました。'
    },
  )
})

watch(projectId, (currentProjectId) => {
  if (user.value) {
    subscribeToWorkspace(user.value, currentProjectId)
  }
})

onUnmounted(() => {
  authUnsubscribe?.()
  stopWorkspaceSubscriptions()
  clearCopyFeedback()
})
</script>

<template>
  <main class="workspace-detail-view">
    <header class="detail-header workspace-detail-header">
      <RouterLink class="brand" :to="{ name: 'dashboard' }">ProjectNote</RouterLink>
      <span class="header-status">共有プロジェクト詳細</span>
    </header>

    <div class="workspace-detail-shell">
      <RouterLink class="workspace-back-link" :to="{ name: 'workspaces' }">
        <UiIcon name="chevron" />
        参加中プロジェクトへ戻る
      </RouterLink>

      <div
        v-if="!isAuthReady || isLoading"
        class="workspace-state workspace-state--loading"
        role="status"
      >
        <span class="workspace-spinner" aria-hidden="true"></span>
        共有プロジェクトを読み込んでいます
      </div>

      <div v-else-if="!user" class="workspace-state" role="status">
        <UiIcon name="user" />
        <div>
          <h1>ログインが必要です</h1>
          <p>共有プロジェクトを表示するにはGoogleでログインしてください。</p>
        </div>
      </div>

      <div v-else-if="errorMessage" class="workspace-state workspace-state--error" role="alert">
        <UiIcon name="alert" />
        <div>
          <h1>共有プロジェクトを表示できません</h1>
          <p>{{ errorMessage }}</p>
        </div>
      </div>

      <article v-else-if="project && role" class="workspace-detail-card ui-flow-frame">
        <div class="workspace-detail-heading">
          <div class="workspace-title">
            <span class="workspace-icon"><UiIcon name="folder" /></span>
            <div>
              <p>共有プロジェクト</p>
              <h1>{{ project.name }}</h1>
            </div>
          </div>
          <span class="role-badge">{{ getRoleLabel(role) }}</span>
        </div>

        <section class="workspace-description" aria-labelledby="workspace-description-title">
          <h2 id="workspace-description-title">プロジェクト概要</h2>
          <p>{{ project.description || '説明はありません。' }}</p>
        </section>

        <dl class="workspace-meta">
          <div>
            <dt>自分の権限</dt>
            <dd>{{ getRoleLabel(role) }}</dd>
          </div>
          <div>
            <dt>作成日</dt>
            <dd>{{ formattedCreatedAt }}</dd>
          </div>
          <div>
            <dt>更新日</dt>
            <dd>{{ formattedUpdatedAt }}</dd>
          </div>
        </dl>

        <section class="workspace-invite ui-flow-frame" aria-labelledby="invite-code-title">
          <div>
            <span>メンバー招待</span>
            <h2 id="invite-code-title">参加コード</h2>
            <p>このコードを共有して、プロジェクトへメンバーを招待できます。</p>
          </div>
          <div class="workspace-invite-action">
            <code>{{ project.inviteCode || '未設定' }}</code>
            <button
              type="button"
              :disabled="!project.inviteCode || isCopying"
              aria-label="参加コードをコピー"
              @click="copyInviteCode"
            >
              <UiIcon name="copy" />
              {{ isCopying ? 'コピー中' : 'コピー' }}
            </button>
          </div>
          <p v-if="copyMessage" class="workspace-feedback" role="status" aria-live="polite">
            {{ copyMessage }}
          </p>
          <p
            v-if="copyError"
            class="workspace-feedback workspace-feedback--error"
            role="alert"
            aria-live="assertive"
          >
            {{ copyError }}
          </p>
        </section>
      </article>
    </div>
  </main>
</template>

<style scoped>
.workspace-detail-view {
  min-height: 100%;
  padding: 7rem clamp(1rem, 3vw, 3rem) 4rem;
  overflow-x: clip;
  color: var(--color-text);
  background:
    radial-gradient(circle at 84% 0%, rgba(207, 243, 255, 0.75), transparent 27rem),
    var(--color-bg);
}

.workspace-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.workspace-detail-header .brand {
  color: var(--color-primary-dark);
  font-size: 1rem;
  font-weight: 750;
  text-decoration: none;
}

.workspace-detail-header .header-status {
  color: var(--color-text-secondary);
  font-size: 0.68rem;
  font-weight: 700;
}

.workspace-detail-shell {
  width: min(100%, 64rem);
  margin: 0 auto;
}

.workspace-back-link {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  min-height: 2.75rem;
  margin-bottom: 1.25rem;
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  color: var(--color-primary-dark);
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
}

.workspace-back-link .ui-icon {
  width: 0.9rem;
  height: 0.9rem;
  transform: rotate(180deg);
}

.workspace-back-link:hover,
.workspace-back-link:focus-visible {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-hover);
}

.workspace-state {
  display: flex;
  gap: 0.85rem;
  align-items: center;
  min-height: 8rem;
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  color: var(--color-text-secondary);
}

.workspace-state h1,
.workspace-state p {
  margin: 0;
}

.workspace-state h1 {
  color: var(--color-text);
  font-size: 1rem;
}

.workspace-state p {
  margin-top: 0.3rem;
  font-size: 0.78rem;
}

.workspace-state--loading {
  justify-content: center;
}

.workspace-state--error {
  border-color: rgba(239, 68, 68, 0.28);
  background: #fff6f6;
  color: #c93737;
}

.workspace-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--color-primary-soft);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: workspace-spin 800ms linear infinite;
}

@keyframes workspace-spin {
  to {
    transform: rotate(360deg);
  }
}

.workspace-detail-card {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface-glass);
  box-shadow: var(--shadow-md);
}

.workspace-detail-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: clamp(1.4rem, 4vw, 2.25rem);
  border-bottom: 1px solid var(--color-border);
}

.workspace-title {
  display: flex;
  gap: 1rem;
  align-items: center;
  min-width: 0;
}

.workspace-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: var(--radius-md);
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.workspace-title p,
.workspace-title h1 {
  margin: 0;
}

.workspace-title p {
  margin-bottom: 0.35rem;
  color: var(--color-primary-dark);
  font-size: 0.64rem;
  font-weight: 750;
}

.workspace-title h1 {
  color: var(--color-text);
  font-size: clamp(1.5rem, 4vw, 2.2rem);
  line-height: 1.2;
  letter-spacing: -0.045em;
  overflow-wrap: anywhere;
}

.role-badge {
  flex: 0 0 auto;
  padding: 0.4rem 0.7rem;
  border: 1px solid rgba(34, 184, 240, 0.32);
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
  font-size: 0.68rem;
  font-weight: 750;
}

.workspace-description {
  padding: clamp(1.4rem, 4vw, 2.25rem);
}

.workspace-description h2,
.workspace-invite h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 1rem;
}

.workspace-description p {
  margin: 0.85rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.85;
  white-space: pre-wrap;
}

.workspace-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  padding: 0 clamp(1.4rem, 4vw, 2.25rem) clamp(1.4rem, 4vw, 2.25rem);
}

.workspace-meta div {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-left: 0;
  background: var(--color-bg-secondary);
}

.workspace-meta div:first-child {
  border-left: 1px solid var(--color-border);
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
}

.workspace-meta div:last-child {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.workspace-meta dt {
  color: var(--color-text-secondary);
  font-size: 0.66rem;
  font-weight: 700;
}

.workspace-meta dd {
  margin: 0.4rem 0 0;
  color: var(--color-text);
  font-size: 0.8rem;
  font-weight: 700;
}

.workspace-invite {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1.25rem;
  align-items: center;
  margin: 0 clamp(1.4rem, 4vw, 2.25rem) clamp(1.4rem, 4vw, 2.25rem);
  padding: 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: linear-gradient(120deg, rgba(207, 243, 255, 0.55), #ffffff);
}

.workspace-invite > div:first-child > span {
  color: var(--color-primary-dark);
  font-size: 0.62rem;
  font-weight: 750;
}

.workspace-invite > div:first-child > p {
  margin: 0.45rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.workspace-invite-action {
  display: flex;
  gap: 0.6rem;
}

.workspace-invite-action code {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  padding: 0.55rem 0.9rem;
  border: 1px solid rgba(34, 184, 240, 0.35);
  border-radius: var(--radius-sm);
  background: #ffffff;
  color: var(--color-primary-dark);
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.workspace-invite-action button {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  min-height: 2.75rem;
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #ffffff;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.workspace-invite-action button:hover:not(:disabled),
.workspace-invite-action button:focus-visible {
  background: var(--color-primary-hover);
  box-shadow: var(--shadow-hover);
}

.workspace-invite-action button:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.workspace-feedback {
  grid-column: 1 / -1;
  margin: 0;
  color: #15803d;
  font-size: 0.72rem;
  font-weight: 700;
}

.workspace-feedback--error {
  color: var(--color-error);
}

@media (max-width: 47.9375rem) {
  .workspace-detail-view {
    padding: 5.75rem 0.8rem 3rem;
  }

  .workspace-detail-heading,
  .workspace-title,
  .workspace-invite {
    align-items: flex-start;
  }

  .workspace-detail-heading,
  .workspace-invite {
    grid-template-columns: 1fr;
  }

  .workspace-detail-heading {
    flex-direction: column;
  }

  .workspace-meta {
    grid-template-columns: 1fr;
  }

  .workspace-meta div,
  .workspace-meta div:first-child,
  .workspace-meta div:last-child {
    border: 1px solid var(--color-border);
    border-bottom: 0;
    border-radius: 0;
  }

  .workspace-meta div:first-child {
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  }

  .workspace-meta div:last-child {
    border-bottom: 1px solid var(--color-border);
    border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  }

  .workspace-invite-action {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .workspace-spinner {
    animation: none;
  }
}
</style>
