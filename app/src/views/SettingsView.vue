<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { onAuthStateChanged, signOut, type Unsubscribe as AuthUnsubscribe, type User } from 'firebase/auth'
import {
  doc,
  onSnapshot,
  Timestamp,
  type DocumentData,
  type Unsubscribe as FirestoreUnsubscribe,
} from 'firebase/firestore'
import PageHeader from '@/components/PageHeader.vue'
import UiIcon from '@/components/UiIcon.vue'
import { useSelectedWorkspace } from '@/composables/useSelectedWorkspace'
import { auth, db, isFirebaseConfigured } from '@/firebase'
import { getRoleLabel } from '@/utils/uiLabels'

interface WorkspaceSettings {
  name: string
  inviteCode: string
  createdAt: Timestamp | Date | string | null
}

const router = useRouter()
const { selectedWorkspaceId, clearSelectedWorkspace } = useSelectedWorkspace()
const user = ref<User | null>(null)
const isAuthReady = ref(false)
const workspace = ref<WorkspaceSettings | null>(null)
const workspaceRole = ref('')
const isWorkspaceLoading = ref(false)
const workspaceError = ref('')
const copyMessage = ref('')
const accountError = ref('')
const isSigningOut = ref(false)
let authUnsubscribe: AuthUnsubscribe | undefined
let projectUnsubscribe: FirestoreUnsubscribe | undefined
let membershipUnsubscribe: FirestoreUnsubscribe | undefined
let subscriptionVersion = 0
let copyMessageTimer: number | undefined

const displayName = computed(() => user.value?.displayName || 'Googleユーザー')
const userInitial = computed(() =>
  (user.value?.displayName || user.value?.email || 'U').charAt(0).toUpperCase(),
)

const getString = (data: DocumentData, field: string): string => {
  const value = data[field]
  return typeof value === 'string' ? value : ''
}

const formatFirestoreDate = (value: WorkspaceSettings['createdAt']): string => {
  let date: Date | null = null

  if (value instanceof Timestamp) {
    date = value.toDate()
  } else if (value instanceof Date) {
    date = value
  } else if (typeof value === 'string') {
    const parsedDate = new Date(value)
    date = Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }

  if (!date) {
    return '—'
  }

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const stopWorkspaceSubscriptions = () => {
  subscriptionVersion += 1
  projectUnsubscribe?.()
  membershipUnsubscribe?.()
  projectUnsubscribe = undefined
  membershipUnsubscribe = undefined
}

const subscribeWorkspace = (currentUser: User, workspaceId: string | null) => {
  stopWorkspaceSubscriptions()
  workspace.value = null
  workspaceRole.value = ''
  workspaceError.value = ''

  if (!workspaceId) {
    isWorkspaceLoading.value = false
    return
  }

  isWorkspaceLoading.value = true
  const currentVersion = subscriptionVersion
  let projectReady = false
  let membershipReady = false

  const finishLoading = () => {
    if (projectReady && membershipReady && currentVersion === subscriptionVersion) {
      isWorkspaceLoading.value = false
    }
  }

  projectUnsubscribe = onSnapshot(
    doc(db, 'projects', workspaceId),
    (snapshot) => {
      if (currentVersion !== subscriptionVersion) {
        return
      }

      if (!snapshot.exists()) {
        workspaceError.value = '選択中のWorkspaceが見つかりません。'
        projectReady = true
        finishLoading()
        return
      }

      const data = snapshot.data()
      workspace.value = {
        name: getString(data, 'name') || '名称未設定のWorkspace',
        inviteCode: getString(data, 'inviteCode'),
        createdAt: (data.createdAt as WorkspaceSettings['createdAt']) ?? null,
      }
      projectReady = true
      finishLoading()
    },
    (error) => {
      if (currentVersion !== subscriptionVersion) {
        return
      }

      console.error(error)
      workspaceError.value = 'Workspace情報の取得に失敗しました。'
      projectReady = true
      membershipReady = true
      finishLoading()
    },
  )

  membershipUnsubscribe = onSnapshot(
    doc(db, 'users', currentUser.uid, 'projects', workspaceId),
    (snapshot) => {
      if (currentVersion !== subscriptionVersion) {
        return
      }

      if (!snapshot.exists()) {
        workspaceError.value = 'Workspaceの参加情報を確認できません。'
      } else {
        workspaceRole.value = getString(snapshot.data(), 'role') || 'member'
      }
      membershipReady = true
      finishLoading()
    },
    (error) => {
      if (currentVersion !== subscriptionVersion) {
        return
      }

      console.error(error)
      workspaceError.value = 'Workspaceの参加情報取得に失敗しました。'
      projectReady = true
      membershipReady = true
      finishLoading()
    },
  )
}

const copyUid = async () => {
  if (!user.value) {
    return
  }

  window.clearTimeout(copyMessageTimer)

  try {
    await navigator.clipboard.writeText(user.value.uid)
    copyMessage.value = 'UIDをコピーしました'
  } catch (error) {
    console.error(error)
    copyMessage.value = 'UIDのコピーに失敗しました'
  }

  copyMessageTimer = window.setTimeout(() => {
    copyMessage.value = ''
  }, 3500)
}

const handleSignOut = async () => {
  accountError.value = ''
  isSigningOut.value = true

  try {
    await signOut(auth)
    clearSelectedWorkspace()
    await router.push({ name: 'dashboard' })
  } catch (error) {
    console.error(error)
    accountError.value = 'サインアウトに失敗しました。'
  } finally {
    isSigningOut.value = false
  }
}

watch(selectedWorkspaceId, (workspaceId) => {
  if (user.value) {
    subscribeWorkspace(user.value, workspaceId)
  }
})

onMounted(() => {
  if (!isFirebaseConfigured) {
    isAuthReady.value = true
    accountError.value = 'Firebaseの設定を確認してください。'
    return
  }

  authUnsubscribe = onAuthStateChanged(
    auth,
    (currentUser) => {
      user.value = currentUser
      isAuthReady.value = true

      if (currentUser) {
        subscribeWorkspace(currentUser, selectedWorkspaceId.value)
      } else {
        stopWorkspaceSubscriptions()
        workspace.value = null
        workspaceRole.value = ''
      }
    },
    (error) => {
      console.error(error)
      user.value = null
      isAuthReady.value = true
      accountError.value = 'ログイン状態の確認に失敗しました。'
    },
  )
})

onUnmounted(() => {
  authUnsubscribe?.()
  stopWorkspaceSubscriptions()
  window.clearTimeout(copyMessageTimer)
})
</script>

<template>
  <main class="home-view settings-view">
    <PageHeader eyebrow="Account & Workspace" title="Settings" />

    <div class="settings-content">
      <section class="settings-section" aria-labelledby="profile-title">
        <div class="settings-section__heading">
          <span><UiIcon name="user" /></span>
          <div>
            <h2 id="profile-title">Profile</h2>
            <p>Googleアカウントのプロフィール情報</p>
          </div>
        </div>

        <div v-if="!isAuthReady" class="settings-state" role="status">
          <span class="settings-spinner" aria-hidden="true" />
          ログイン状態を確認しています
        </div>
        <div v-else-if="!user" class="settings-state" role="status">ログインしてください</div>
        <article v-else class="settings-card profile-card">
          <div class="profile-identity">
            <div class="profile-avatar">
              <img
                v-if="user.photoURL"
                :src="user.photoURL"
                :alt="`${displayName}のプロフィール画像`"
                referrerpolicy="no-referrer"
              />
              <span v-else aria-hidden="true">{{ userInitial }}</span>
              <small class="google-mark" aria-label="Googleアカウント">G</small>
            </div>
            <div>
              <strong>{{ displayName }}</strong>
              <span>{{ user.email || 'メールアドレスなし' }}</span>
            </div>
          </div>

          <dl class="profile-details">
            <div>
              <dt>Display Name</dt>
              <dd>{{ displayName }}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{{ user.email || '—' }}</dd>
            </div>
            <div class="profile-uid">
              <dt>UID</dt>
              <dd>
                <code>{{ user.uid }}</code>
                <button type="button" aria-label="UIDをコピー" @click="copyUid">
                  <UiIcon name="copy" />
                  コピー
                </button>
              </dd>
            </div>
          </dl>
          <p class="settings-live-message" aria-live="polite">{{ copyMessage }}</p>
        </article>
      </section>

      <section class="settings-section" aria-labelledby="appearance-title">
        <div class="settings-section__heading">
          <span><UiIcon name="sun" /></span>
          <div>
            <h2 id="appearance-title">Appearance</h2>
            <p>ProjectNoteの表示テーマ</p>
          </div>
        </div>

        <div class="theme-grid">
          <button class="theme-card theme-card--selected" type="button" aria-pressed="true">
            <span class="theme-preview theme-preview--light" aria-hidden="true">
              <i />
              <i />
            </span>
            <strong>Light</strong>
            <small>Selected</small>
          </button>
          <button class="theme-card" type="button" disabled>
            <span class="theme-preview theme-preview--dark" aria-hidden="true">
              <i />
              <i />
            </span>
            <strong>Dark</strong>
            <small>Coming Soon</small>
          </button>
          <button class="theme-card" type="button" disabled>
            <span class="theme-preview theme-preview--system" aria-hidden="true">
              <i />
              <i />
            </span>
            <strong>System</strong>
            <small>Coming Soon</small>
          </button>
        </div>
      </section>

      <section class="settings-section" aria-labelledby="workspace-title">
        <div class="settings-section__heading">
          <span><UiIcon name="folder" /></span>
          <div>
            <h2 id="workspace-title">Workspace</h2>
            <p>現在選択している共有プロジェクト</p>
          </div>
        </div>

        <div v-if="!user" class="settings-state">ログインしてください</div>
        <div v-else-if="!selectedWorkspaceId" class="settings-state">No Workspace Selected</div>
        <div v-else-if="isWorkspaceLoading" class="settings-state" role="status">
          <span class="settings-spinner" aria-hidden="true" />
          Workspace情報を読み込んでいます
        </div>
        <div v-else-if="workspaceError" class="settings-state settings-state--error" role="alert">
          {{ workspaceError }}
        </div>
        <article v-else-if="workspace" class="settings-card workspace-card ui-flow-frame">
          <div class="workspace-card__title">
            <span><UiIcon name="folder" /></span>
            <div>
              <small>Selected Workspace</small>
              <strong>{{ workspace.name }}</strong>
            </div>
            <span class="role-badge">{{ getRoleLabel(workspaceRole) }}</span>
          </div>
          <dl class="workspace-details">
            <div>
              <dt>Role</dt>
              <dd>{{ getRoleLabel(workspaceRole) }}</dd>
            </div>
            <div>
              <dt>Invite Code</dt>
              <dd><code>{{ workspace.inviteCode || '—' }}</code></dd>
            </div>
            <div>
              <dt>Created At</dt>
              <dd>{{ formatFirestoreDate(workspace.createdAt) }}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section class="settings-section" aria-labelledby="account-title">
        <div class="settings-section__heading">
          <span><UiIcon name="settings" /></span>
          <div>
            <h2 id="account-title">Account</h2>
            <p>アプリ情報とアカウント操作</p>
          </div>
        </div>

        <article class="settings-card account-card">
          <div>
            <span class="account-brand"><UiIcon name="brand" /></span>
            <div>
              <strong>ProjectNote</strong>
              <small>v1.0.0</small>
            </div>
          </div>
          <button
            class="sign-out-button"
            type="button"
            :disabled="!user || isSigningOut"
            @click="handleSignOut"
          >
            <UiIcon name="logout" />
            {{ isSigningOut ? 'Signing Out...' : 'Sign Out' }}
          </button>
        </article>
        <p v-if="accountError" class="settings-error" role="alert">{{ accountError }}</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.settings-content {
  display: grid;
  gap: 1.75rem;
  width: min(100%, 68rem);
  margin: 0 auto;
}

.settings-section {
  display: grid;
  gap: 0.85rem;
}

.settings-section__heading {
  display: flex;
  gap: 0.7rem;
  align-items: center;
}

.settings-section__heading > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.settings-section__heading :deep(.ui-icon) {
  width: 1.1rem;
  height: 1.1rem;
}

.settings-section__heading h2,
.settings-section__heading p {
  margin: 0;
}

.settings-section__heading h2 {
  color: var(--color-text);
  font-size: 1rem;
}

.settings-section__heading p {
  margin-top: 0.12rem;
  color: var(--color-text-secondary);
  font-size: 0.72rem;
}

.settings-card,
.settings-state {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.settings-card {
  padding: 1.25rem;
}

.settings-state {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  justify-content: center;
  min-height: 7rem;
  padding: 1.25rem;
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  text-align: center;
}

.settings-state--error,
.settings-error {
  color: var(--color-error);
}

.profile-card {
  display: grid;
  grid-template-columns: minmax(14rem, 0.65fr) minmax(0, 1.35fr);
  gap: 1.5rem;
  align-items: center;
}

.profile-identity {
  display: flex;
  gap: 0.9rem;
  align-items: center;
  min-width: 0;
}

.profile-identity > div:last-child {
  display: grid;
  min-width: 0;
}

.profile-identity strong,
.profile-identity span,
.profile-details dd {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-identity strong {
  color: var(--color-text);
  font-size: 1rem;
}

.profile-identity > div:last-child span {
  margin-top: 0.2rem;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.profile-avatar {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 4.25rem;
  height: 4.25rem;
  border: 3px solid #ffffff;
  border-radius: 50%;
  background: linear-gradient(135deg, #8bdcf7, var(--color-primary-dark));
  box-shadow:
    0 0 0 1px var(--color-border),
    0 10px 24px rgba(31, 89, 117, 0.14);
  color: #ffffff;
  font-size: 1.25rem;
  font-weight: 800;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}

.google-mark {
  position: absolute;
  right: -0.15rem;
  bottom: -0.15rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.45rem;
  height: 1.45rem;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: var(--shadow-sm);
  color: #4285f4;
  font-size: 0.7rem;
  font-weight: 800;
}

.profile-details,
.workspace-details {
  display: grid;
  gap: 0.75rem;
  margin: 0;
}

.profile-details {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.profile-details > div,
.workspace-details > div {
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid #e4f0f5;
  border-radius: var(--radius-sm);
  background: #f9fcfe;
}

.profile-details dt,
.workspace-details dt {
  color: var(--color-text-secondary);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.profile-details dd,
.workspace-details dd {
  margin: 0.3rem 0 0;
  color: var(--color-text);
  font-size: 0.78rem;
}

.profile-uid {
  grid-column: 1 / -1;
}

.profile-uid dd {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.profile-uid code,
.workspace-details code {
  min-width: 0;
  overflow: hidden;
  color: var(--color-primary-dark);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-uid button {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 0.35rem;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: #ffffff;
  color: var(--color-primary-dark);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
}

.profile-uid button:hover,
.profile-uid button:focus-visible {
  background: var(--color-primary-soft);
}

.profile-uid button :deep(.ui-icon) {
  width: 0.95rem;
  height: 0.95rem;
}

.settings-live-message {
  grid-column: 1 / -1;
  min-height: 1rem;
  margin: -0.65rem 0 0;
  color: var(--color-primary-dark);
  font-size: 0.68rem;
  text-align: right;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.theme-card {
  display: grid;
  gap: 0.45rem;
  min-height: 9rem;
  padding: 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.theme-card--selected {
  border-color: var(--color-primary);
  box-shadow:
    0 0 0 2px rgba(34, 184, 240, 0.1),
    var(--shadow-md);
}

.theme-card:hover:not(:disabled),
.theme-card:focus-visible {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}

.theme-card:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.theme-card strong {
  font-size: 0.82rem;
}

.theme-card small {
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}

.theme-card--selected small {
  color: var(--color-primary-dark);
}

.theme-preview {
  position: relative;
  display: grid;
  grid-template-columns: 30% 1fr;
  gap: 0.35rem;
  min-height: 4.5rem;
  padding: 0.45rem;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.theme-preview i {
  display: block;
  border-radius: 0.3rem;
}

.theme-preview--light {
  background: #f4f9fc;
}

.theme-preview--light i:first-child,
.theme-preview--system i:first-child {
  background: #d9f2fc;
}

.theme-preview--light i:last-child {
  background: #ffffff;
}

.theme-preview--dark {
  background: #17212b;
  border-color: #314454;
}

.theme-preview--dark i:first-child {
  background: #233646;
}

.theme-preview--dark i:last-child {
  background: #30495c;
}

.theme-preview--system {
  background: linear-gradient(90deg, #f4f9fc 50%, #17212b 50%);
}

.theme-preview--system i:last-child {
  background: linear-gradient(90deg, #ffffff 50%, #30495c 50%);
}

.workspace-card {
  display: grid;
  gap: 1rem;
}

.workspace-card__title {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
}

.workspace-card__title > span:first-child,
.account-brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.workspace-card__title > span:first-child :deep(.ui-icon),
.account-brand :deep(.ui-icon) {
  width: 1.25rem;
  height: 1.25rem;
}

.workspace-card__title > div {
  display: grid;
  min-width: 0;
}

.workspace-card__title small {
  color: var(--color-text-secondary);
  font-size: 0.6rem;
}

.workspace-card__title strong {
  margin-top: 0.15rem;
  overflow: hidden;
  color: var(--color-text);
  font-size: 1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-badge {
  padding: 0.3rem 0.6rem;
  border: 1px solid rgba(34, 184, 240, 0.3);
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
  font-size: 0.65rem;
  font-weight: 700;
}

.workspace-details {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.account-card,
.account-card > div {
  display: flex;
  gap: 0.8rem;
  align-items: center;
}

.account-card {
  justify-content: space-between;
}

.account-card > div > div {
  display: grid;
}

.account-card strong {
  color: var(--color-text);
}

.account-card small {
  margin-top: 0.15rem;
  color: var(--color-text-secondary);
  font-size: 0.68rem;
}

.sign-out-button {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0.55rem 0.9rem;
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: var(--radius-sm);
  background: #fff3f3;
  color: #c93333;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.sign-out-button:hover:not(:disabled),
.sign-out-button:focus-visible {
  border-color: rgba(239, 68, 68, 0.5);
  outline: none;
  background: #ffe6e6;
}

.sign-out-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.sign-out-button :deep(.ui-icon) {
  width: 1rem;
  height: 1rem;
}

.settings-error {
  margin: 0.5rem 0 0;
  padding: 0.7rem 0.8rem;
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: var(--radius-sm);
  background: #fff4f4;
  font-size: 0.75rem;
}

.settings-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--color-primary-soft);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: settings-spin 0.8s linear infinite;
}

@keyframes settings-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 767px) {
  .profile-card {
    grid-template-columns: 1fr;
  }

  .profile-details,
  .workspace-details {
    grid-template-columns: 1fr;
  }

  .profile-uid {
    grid-column: auto;
  }

  .theme-grid {
    grid-template-columns: 1fr;
  }

  .account-card {
    align-items: stretch;
    flex-direction: column;
  }

  .sign-out-button {
    width: 100%;
  }
}

@media (max-width: 420px) {
  .settings-card {
    padding: 1rem;
  }

  .profile-uid dd {
    align-items: stretch;
    flex-direction: column;
  }

  .profile-uid button {
    width: 100%;
  }

  .workspace-card__title {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .workspace-card__title .role-badge {
    grid-column: 1 / -1;
    justify-self: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-spinner {
    animation: none;
  }

  .theme-card {
    transition: none;
  }
}
</style>
