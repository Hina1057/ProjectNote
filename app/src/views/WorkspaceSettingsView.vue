<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { onAuthStateChanged, type Unsubscribe as AuthUnsubscribe, type User } from 'firebase/auth'
import {
  collection,
  doc,
  onSnapshot,
  Timestamp,
  type DocumentData,
  type Unsubscribe as FirestoreUnsubscribe,
} from 'firebase/firestore'
import PageHeader from '@/components/PageHeader.vue'
import UiIcon from '@/components/UiIcon.vue'
import WorkspaceConfirmDialog from '@/components/WorkspaceConfirmDialog.vue'
import { useSelectedWorkspace } from '@/composables/useSelectedWorkspace'
import { auth, db, isFirebaseConfigured } from '@/firebase'
import {
  deleteWorkspace,
  leaveWorkspace,
  regenerateWorkspaceInviteCode,
  removeWorkspaceMember,
  updateWorkspaceGeneral,
} from '@/services/workspaceSettingsService'

type WorkspaceRole = 'host' | 'member'
type ConfirmAction = 'regenerate' | 'remove' | 'delete' | 'leave'

interface WorkspaceRecord {
  id: string
  name: string
  description: string
  inviteCode: string
  createdAt: unknown
}

interface WorkspaceMember {
  id: string
  displayName: string
  email: string
  role: WorkspaceRole
  joinedAt: unknown
}

interface ConfirmState {
  action: ConfirmAction
  title: string
  message: string
  confirmLabel: string
  tone: 'primary' | 'danger'
  member?: WorkspaceMember
}

const router = useRouter()
const { selectedWorkspaceId, clearSelectedWorkspace } = useSelectedWorkspace()
const user = ref<User | null>(null)
const isAuthReady = ref(false)
const role = ref<WorkspaceRole | null>(null)
const workspace = ref<WorkspaceRecord | null>(null)
const members = ref<WorkspaceMember[]>([])
const isLoading = ref(false)
const pageError = ref('')
const formError = ref('')
const isSaving = ref(false)
const isCopying = ref(false)
const isProcessingAction = ref(false)
const confirmState = ref<ConfirmState | null>(null)
const toastMessage = ref('')
const toastTone = ref<'success' | 'error'>('success')
const form = reactive({
  name: '',
  description: '',
})

let authUnsubscribe: AuthUnsubscribe | undefined
let membershipUnsubscribe: FirestoreUnsubscribe | undefined
let projectUnsubscribe: FirestoreUnsubscribe | undefined
let membersUnsubscribe: FirestoreUnsubscribe | undefined
let subscriptionVersion = 0
let subscribedHostWorkspaceId = ''
let toastTimer: number | undefined

const isHost = computed(() => role.value === 'host')
const isMember = computed(() => role.value === 'member')
const isFormChanged = computed(
  () =>
    Boolean(workspace.value) &&
    (form.name !== workspace.value?.name ||
      form.description !== workspace.value?.description),
)
const sortedMembers = computed(() =>
  [...members.value].sort((memberA, memberB) => {
    if (memberA.role !== memberB.role) {
      return memberA.role === 'host' ? -1 : 1
    }

    return memberA.displayName.localeCompare(memberB.displayName, 'ja')
  }),
)

const getString = (data: DocumentData, field: string): string => {
  const value = data[field]
  return typeof value === 'string' ? value : ''
}

const formatFirestoreDate = (value: unknown): string => {
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
  }).format(date)
}

const getInitial = (member: WorkspaceMember): string =>
  (member.displayName || member.email || 'U').charAt(0).toUpperCase()

const showToast = (message: string, tone: 'success' | 'error' = 'success') => {
  window.clearTimeout(toastTimer)
  toastMessage.value = message
  toastTone.value = tone
  toastTimer = window.setTimeout(() => {
    toastMessage.value = ''
  }, 3500)
}

const stopHostSubscriptions = () => {
  projectUnsubscribe?.()
  membersUnsubscribe?.()
  projectUnsubscribe = undefined
  membersUnsubscribe = undefined
  subscribedHostWorkspaceId = ''
}

const stopAllSubscriptions = () => {
  subscriptionVersion += 1
  membershipUnsubscribe?.()
  membershipUnsubscribe = undefined
  stopHostSubscriptions()
}

const resetWorkspaceState = () => {
  stopAllSubscriptions()
  role.value = null
  workspace.value = null
  members.value = []
  form.name = ''
  form.description = ''
  isLoading.value = false
  pageError.value = ''
  formError.value = ''
  confirmState.value = null
}

const subscribeHostDetails = (workspaceId: string, currentVersion: number) => {
  if (subscribedHostWorkspaceId === workspaceId) {
    return
  }

  stopHostSubscriptions()
  subscribedHostWorkspaceId = workspaceId
  let projectReady = false
  let membersReady = false

  const finishLoading = () => {
    if (
      projectReady &&
      membersReady &&
      currentVersion === subscriptionVersion
    ) {
      isLoading.value = false
    }
  }

  projectUnsubscribe = onSnapshot(
    doc(db, 'projects', workspaceId),
    (snapshot) => {
      if (currentVersion !== subscriptionVersion) {
        return
      }

      if (!snapshot.exists()) {
        pageError.value = 'Workspaceが見つかりません。'
        projectReady = true
        finishLoading()
        return
      }

      const data = snapshot.data()
      workspace.value = {
        id: snapshot.id,
        name: getString(data, 'name') || '名称未設定のWorkspace',
        description: getString(data, 'description'),
        inviteCode: getString(data, 'inviteCode'),
        createdAt: data.createdAt,
      }
      form.name = workspace.value.name
      form.description = workspace.value.description
      projectReady = true
      finishLoading()
    },
    (error) => {
      if (currentVersion !== subscriptionVersion) {
        return
      }

      console.error(error)
      pageError.value = 'Workspace情報の取得に失敗しました。'
      projectReady = true
      membersReady = true
      finishLoading()
    },
  )

  membersUnsubscribe = onSnapshot(
    collection(db, 'projects', workspaceId, 'members'),
    (snapshot) => {
      if (currentVersion !== subscriptionVersion) {
        return
      }

      members.value = snapshot.docs.map((memberDocument) => {
        const data = memberDocument.data()
        return {
          id: memberDocument.id,
          displayName: getString(data, 'displayName') || '名前未設定',
          email: getString(data, 'email'),
          role: data.role === 'host' ? 'host' : 'member',
          joinedAt: data.joinedAt,
        }
      })
      membersReady = true
      finishLoading()
    },
    (error) => {
      if (currentVersion !== subscriptionVersion) {
        return
      }

      console.error(error)
      pageError.value = 'メンバー情報の取得に失敗しました。'
      projectReady = true
      membersReady = true
      finishLoading()
    },
  )
}

const subscribeWorkspace = (currentUser: User, workspaceId: string | null) => {
  resetWorkspaceState()

  if (!workspaceId) {
    return
  }

  isLoading.value = true
  const currentVersion = subscriptionVersion

  membershipUnsubscribe = onSnapshot(
    doc(db, 'users', currentUser.uid, 'projects', workspaceId),
    (snapshot) => {
      if (currentVersion !== subscriptionVersion) {
        return
      }

      if (!snapshot.exists()) {
        role.value = null
        stopHostSubscriptions()
        pageError.value = 'Workspaceの参加情報が見つかりません。'
        isLoading.value = false
        return
      }

      role.value = snapshot.data().role === 'host' ? 'host' : 'member'

      if (role.value === 'host') {
        subscribeHostDetails(workspaceId, currentVersion)
      } else {
        stopHostSubscriptions()
        workspace.value = null
        members.value = []
        isLoading.value = false
      }
    },
    (error) => {
      if (currentVersion !== subscriptionVersion) {
        return
      }

      console.error(error)
      pageError.value = 'Workspace権限の確認に失敗しました。'
      isLoading.value = false
    },
  )
}

const saveGeneral = async () => {
  const currentUser = user.value
  const workspaceId = selectedWorkspaceId.value
  const name = form.name.trim()
  const description = form.description.trim()

  if (!currentUser || !workspaceId || !isHost.value || isSaving.value) {
    return
  }

  formError.value = ''

  if (!name) {
    formError.value = 'Workspace Nameを入力してください。'
    return
  }

  isSaving.value = true

  try {
    await updateWorkspaceGeneral(workspaceId, currentUser, name, description)
    showToast('Workspace情報を更新しました。')
  } catch (error) {
    console.error(error)
    formError.value =
      error instanceof Error ? error.message : 'Workspace情報の更新に失敗しました。'
  } finally {
    isSaving.value = false
  }
}

const copyInviteCode = async () => {
  if (!workspace.value?.inviteCode || isCopying.value) {
    return
  }

  isCopying.value = true

  try {
    await navigator.clipboard.writeText(workspace.value.inviteCode)
    showToast('Invite Codeをコピーしました。')
  } catch (error) {
    console.error(error)
    showToast('Invite Codeのコピーに失敗しました。', 'error')
  } finally {
    isCopying.value = false
  }
}

const openRegenerateConfirmation = () => {
  confirmState.value = {
    action: 'regenerate',
    title: 'Regenerate invite code?',
    message: '現在のInvite Codeは利用できなくなります。',
    confirmLabel: 'Regenerate',
    tone: 'primary',
  }
}

const openRemoveConfirmation = (member: WorkspaceMember) => {
  confirmState.value = {
    action: 'remove',
    title: 'Remove this member?',
    message: `${member.displayName}をWorkspaceから削除します。`,
    confirmLabel: 'Remove',
    tone: 'danger',
    member,
  }
}

const openDeleteConfirmation = () => {
  confirmState.value = {
    action: 'delete',
    title: 'Delete workspace?',
    message: 'This action cannot be undone.',
    confirmLabel: 'Delete',
    tone: 'danger',
  }
}

const openLeaveConfirmation = () => {
  confirmState.value = {
    action: 'leave',
    title: 'Leave workspace?',
    message: 'このWorkspaceへのアクセス権が失われます。',
    confirmLabel: 'Leave',
    tone: 'danger',
  }
}

const closeConfirmation = () => {
  if (!isProcessingAction.value) {
    confirmState.value = null
  }
}

const confirmAction = async () => {
  const currentUser = user.value
  const workspaceId = selectedWorkspaceId.value
  const state = confirmState.value

  if (!currentUser || !workspaceId || !state || isProcessingAction.value) {
    return
  }

  isProcessingAction.value = true

  try {
    if (state.action === 'regenerate') {
      const inviteCode = await regenerateWorkspaceInviteCode(
        workspaceId,
        currentUser,
      )
      if (workspace.value) {
        workspace.value.inviteCode = inviteCode
      }
      showToast('Invite Codeを再生成しました。')
    } else if (state.action === 'remove' && state.member) {
      await removeWorkspaceMember(workspaceId, currentUser, state.member.id)
      showToast(`${state.member.displayName}を削除しました。`)
    } else if (state.action === 'delete') {
      await deleteWorkspace(workspaceId, currentUser)
      clearSelectedWorkspace()
      await router.push({ name: 'workspaces' })
    } else if (state.action === 'leave') {
      await leaveWorkspace(workspaceId, currentUser)
      clearSelectedWorkspace()
      await router.push({ name: 'workspaces' })
    }

    confirmState.value = null
  } catch (error) {
    console.error(error)
    showToast(
      error instanceof Error ? error.message : '操作に失敗しました。',
      'error',
    )
  } finally {
    isProcessingAction.value = false
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
    pageError.value = 'Firebaseの設定を確認してください。'
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
        resetWorkspaceState()
      }
    },
    (error) => {
      console.error(error)
      user.value = null
      isAuthReady.value = true
      resetWorkspaceState()
      pageError.value = 'ログイン状態の確認に失敗しました。'
    },
  )
})

onUnmounted(() => {
  authUnsubscribe?.()
  stopAllSubscriptions()
  window.clearTimeout(toastTimer)
})
</script>

<template>
  <main class="home-view workspace-settings-view">
    <PageHeader eyebrow="Workspace Administration" title="Workspace Settings" />

    <div class="workspace-settings-content">
      <p v-if="!isAuthReady" class="workspace-settings-state ui-notice ui-notice--loading" role="status">
        ログイン状態を確認しています
      </p>
      <p v-else-if="!user" class="workspace-settings-state ui-notice ui-notice--empty" role="status">
        ログインしてください
      </p>
      <p
        v-else-if="!selectedWorkspaceId"
        class="workspace-settings-state ui-notice ui-notice--empty"
        role="status"
      >
        Workspaceを選択してください
      </p>
      <p v-else-if="isLoading" class="workspace-settings-state ui-notice ui-notice--loading" role="status">
        Workspace設定を読み込んでいます
      </p>
      <p v-else-if="pageError" class="workspace-settings-state ui-notice ui-notice--error" role="alert">
        {{ pageError }}
      </p>

      <template v-else-if="isMember">
        <section class="forbidden-card" aria-labelledby="forbidden-title">
          <strong>403</strong>
          <h1 id="forbidden-title">Only workspace owners can access this page.</h1>
          <p>Workspaceの管理設定はHostのみ利用できます。</p>
        </section>

        <section class="settings-panel danger-panel" aria-labelledby="member-danger-title">
          <div class="settings-panel__heading">
            <span><UiIcon name="logout" /></span>
            <div>
              <h2 id="member-danger-title">Danger Zone</h2>
              <p>このWorkspaceから退出します。</p>
            </div>
          </div>
          <div class="danger-action">
            <div>
              <strong>Leave Workspace</strong>
              <p>退出後、このWorkspaceのノートやタスクへアクセスできなくなります。</p>
            </div>
            <button type="button" @click="openLeaveConfirmation">Leave Workspace</button>
          </div>
        </section>
      </template>

      <template v-else-if="isHost && workspace">
        <section class="settings-panel" aria-labelledby="general-settings-title">
          <div class="settings-panel__heading">
            <span><UiIcon name="settings" /></span>
            <div>
              <h2 id="general-settings-title">General</h2>
              <p>Workspaceの基本情報を管理します。</p>
            </div>
          </div>

          <form class="general-form" @submit.prevent="saveGeneral">
            <div class="workspace-icon-card">
              <span><UiIcon name="folder" /></span>
              <div>
                <strong>Workspace Icon</strong>
                <small>Coming Soon</small>
              </div>
            </div>
            <label>
              <span>Workspace Name</span>
              <input v-model="form.name" type="text" maxlength="80" required />
            </label>
            <label>
              <span>Description</span>
              <textarea v-model="form.description" rows="4" maxlength="500" />
            </label>
            <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
            <div class="form-actions">
              <span>{{ form.description.length }}/500</span>
              <button
                type="submit"
                :disabled="isSaving || !isFormChanged || !form.name.trim()"
              >
                {{ isSaving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </section>

        <section class="settings-panel" aria-labelledby="invite-settings-title">
          <div class="settings-panel__heading">
            <span><UiIcon name="join" /></span>
            <div>
              <h2 id="invite-settings-title">Invite</h2>
              <p>メンバー招待用のコードを管理します。</p>
            </div>
          </div>

          <div class="invite-card ui-flow-frame">
            <div>
              <small>Invite Code</small>
              <code>{{ workspace.inviteCode || '—' }}</code>
            </div>
            <div class="invite-actions">
              <button
                type="button"
                class="secondary-button"
                :disabled="!workspace.inviteCode || isCopying"
                @click="copyInviteCode"
              >
                <UiIcon name="copy" />
                {{ isCopying ? 'Copying...' : 'Copy' }}
              </button>
              <button
                type="button"
                class="primary-button"
                @click="openRegenerateConfirmation"
              >
                <UiIcon name="activity" />
                Regenerate
              </button>
            </div>
          </div>
        </section>

        <section class="settings-panel" aria-labelledby="members-settings-title">
          <div class="settings-panel__heading settings-panel__heading--count">
            <span><UiIcon name="users" /></span>
            <div>
              <h2 id="members-settings-title">Members</h2>
              <p>Workspaceに参加しているメンバーを管理します。</p>
            </div>
            <strong>{{ sortedMembers.length }} members</strong>
          </div>

          <div class="settings-members-list">
            <article v-for="member in sortedMembers" :key="member.id" class="settings-member">
              <span class="settings-member__avatar" aria-hidden="true">
                {{ getInitial(member) }}
              </span>
              <div class="settings-member__identity">
                <div>
                  <strong>{{ member.displayName }}</strong>
                  <span v-if="member.role === 'host'" class="host-crown" aria-label="Workspace Host">
                    <UiIcon name="crown" />
                  </span>
                </div>
                <small>{{ member.email || 'メールアドレスなし' }}</small>
              </div>
              <span class="member-role" :class="`member-role--${member.role}`">
                {{ member.role === 'host' ? 'Host' : 'Member' }}
              </span>
              <time :datetime="member.joinedAt instanceof Timestamp ? member.joinedAt.toDate().toISOString() : undefined">
                Joined {{ formatFirestoreDate(member.joinedAt) }}
              </time>
              <button
                v-if="member.role !== 'host' && member.id !== user.uid"
                type="button"
                class="remove-member-button"
                @click="openRemoveConfirmation(member)"
              >
                Remove
              </button>
            </article>
          </div>
        </section>

        <section class="settings-panel danger-panel" aria-labelledby="danger-settings-title">
          <div class="settings-panel__heading">
            <span><UiIcon name="alert" /></span>
            <div>
              <h2 id="danger-settings-title">Danger Zone</h2>
              <p>取り消すことができない操作です。</p>
            </div>
          </div>
          <div class="danger-action">
            <div>
              <strong>Delete Workspace</strong>
              <p>WorkspaceとFirestore上のメンバー・タスク・アクティビティを削除します。</p>
            </div>
            <button type="button" @click="openDeleteConfirmation">Delete Workspace</button>
          </div>
        </section>
      </template>
    </div>

    <Transition name="toast">
      <p
        v-if="toastMessage"
        class="workspace-toast"
        :class="`workspace-toast--${toastTone}`"
        :role="toastTone === 'error' ? 'alert' : 'status'"
        aria-live="polite"
      >
        <UiIcon :name="toastTone === 'error' ? 'alert' : 'check'" />
        {{ toastMessage }}
      </p>
    </Transition>

    <WorkspaceConfirmDialog
      :is-open="Boolean(confirmState)"
      :title="confirmState?.title ?? ''"
      :message="confirmState?.message ?? ''"
      :confirm-label="confirmState?.confirmLabel ?? ''"
      :tone="confirmState?.tone"
      :is-processing="isProcessingAction"
      @cancel="closeConfirmation"
      @confirm="confirmAction"
    />
  </main>
</template>

<style scoped>
.workspace-settings-content {
  display: grid;
  gap: 1.5rem;
  width: min(100%, 68rem);
  margin: 0 auto;
}

.workspace-settings-state {
  min-height: 8rem;
}

.settings-panel,
.forbidden-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.settings-panel {
  padding: 1.25rem;
}

.settings-panel__heading {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.7rem;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.settings-panel__heading--count {
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.settings-panel__heading > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.settings-panel__heading :deep(.ui-icon) {
  width: 1.1rem;
  height: 1.1rem;
}

.settings-panel__heading h2,
.settings-panel__heading p {
  margin: 0;
}

.settings-panel__heading h2 {
  color: var(--color-text);
  font-size: 1rem;
}

.settings-panel__heading p,
.settings-panel__heading--count > strong {
  color: var(--color-text-secondary);
  font-size: 0.7rem;
}

.settings-panel__heading p {
  margin-top: 0.15rem;
}

.general-form {
  display: grid;
  grid-template-columns: minmax(10rem, 0.34fr) minmax(0, 1fr);
  gap: 1rem;
  padding-top: 1.15rem;
}

.general-form label {
  display: grid;
  gap: 0.4rem;
}

.general-form label:nth-of-type(2) {
  grid-column: 2;
}

.general-form label > span {
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  font-weight: 700;
}

.general-form input,
.general-form textarea {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #fbfdfe;
  color: var(--color-text);
  font: inherit;
  resize: vertical;
}

.general-form input:focus,
.general-form textarea:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(34, 184, 240, 0.14);
}

.workspace-icon-card {
  grid-row: span 2;
  display: flex;
  gap: 0.8rem;
  align-items: center;
  align-self: stretch;
  padding: 1rem;
  border: 1px dashed #b8dce9;
  border-radius: var(--radius-md);
  background: #f6fbfd;
}

.workspace-icon-card > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.workspace-icon-card :deep(.ui-icon) {
  width: 1.4rem;
  height: 1.4rem;
}

.workspace-icon-card > div {
  display: grid;
}

.workspace-icon-card strong {
  color: var(--color-text);
  font-size: 0.78rem;
}

.workspace-icon-card small {
  margin-top: 0.15rem;
  color: var(--color-text-secondary);
  font-size: 0.62rem;
}

.form-error {
  grid-column: 2;
  margin: 0;
  color: var(--color-error);
  font-size: 0.7rem;
}

.form-actions {
  grid-column: 2;
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}

.form-actions > span {
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}

.form-actions button,
.primary-button,
.secondary-button {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0.6rem 0.9rem;
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.form-actions button,
.primary-button {
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: #ffffff;
}

.form-actions button:hover:not(:disabled),
.primary-button:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.form-actions button:disabled,
.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.invite-card {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.15rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: linear-gradient(110deg, #f0fbff, #ffffff);
}

.invite-card > div:first-child {
  display: grid;
  gap: 0.2rem;
}

.invite-card small {
  color: var(--color-text-secondary);
  font-size: 0.62rem;
}

.invite-card code {
  color: var(--color-primary-dark);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.invite-actions {
  display: flex;
  gap: 0.65rem;
}

.secondary-button {
  border: 1px solid var(--color-primary);
  background: #ffffff;
  color: var(--color-primary-dark);
}

.primary-button :deep(.ui-icon),
.secondary-button :deep(.ui-icon) {
  width: 0.95rem;
  height: 0.95rem;
}

.settings-members-list {
  display: grid;
  gap: 0.1rem;
  margin-top: 0.75rem;
}

.settings-member {
  display: grid;
  grid-template-columns: auto minmax(10rem, 1fr) auto minmax(8rem, auto) auto;
  gap: 0.75rem;
  align-items: center;
  min-width: 0;
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid #e8f1f5;
}

.settings-member:last-child {
  border-bottom: 0;
}

.settings-member__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #a5e5fa, var(--color-primary));
  color: #ffffff;
  font-size: 0.76rem;
  font-weight: 800;
}

.settings-member__identity {
  display: grid;
  min-width: 0;
}

.settings-member__identity > div {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  min-width: 0;
}

.settings-member__identity strong,
.settings-member__identity small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-member__identity strong {
  color: var(--color-text);
  font-size: 0.78rem;
}

.settings-member__identity small,
.settings-member time {
  color: var(--color-text-secondary);
  font-size: 0.65rem;
}

.host-crown {
  display: inline-flex;
  flex: 0 0 auto;
  color: #e3a008;
}

.host-crown :deep(.ui-icon) {
  width: 1rem;
  height: 1rem;
}

.member-role {
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6rem;
  font-weight: 800;
}

.member-role--host {
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.member-role--member {
  background: #edf2f5;
  color: var(--color-text-secondary);
}

.remove-member-button {
  min-height: 2.5rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid rgba(239, 68, 68, 0.24);
  border-radius: var(--radius-sm);
  background: #fff5f5;
  color: #cf3535;
  font: inherit;
  font-size: 0.65rem;
  font-weight: 700;
  cursor: pointer;
}

.danger-panel {
  border-color: rgba(239, 68, 68, 0.25);
}

.danger-panel .settings-panel__heading > span {
  background: #fff0f0;
  color: var(--color-error);
}

.danger-action {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  padding-top: 1.15rem;
}

.danger-action strong,
.danger-action p {
  margin: 0;
}

.danger-action strong {
  color: var(--color-text);
  font-size: 0.8rem;
}

.danger-action p {
  margin-top: 0.2rem;
  color: var(--color-text-secondary);
  font-size: 0.68rem;
  line-height: 1.6;
}

.danger-action button {
  flex: 0 0 auto;
  min-height: 2.75rem;
  padding: 0.6rem 0.9rem;
  border: 1px solid rgba(239, 68, 68, 0.45);
  border-radius: var(--radius-sm);
  background: #fff3f3;
  color: #c93333;
  font: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
}

.forbidden-card {
  padding: clamp(2rem, 6vw, 4rem);
  text-align: center;
}

.forbidden-card > strong {
  color: var(--color-primary);
  font-size: clamp(3rem, 8vw, 5rem);
  line-height: 1;
}

.forbidden-card h1 {
  margin: 1rem 0 0;
  color: var(--color-text);
  font-size: clamp(1.1rem, 3vw, 1.5rem);
}

.forbidden-card p {
  margin: 0.55rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.78rem;
}

.workspace-toast {
  position: fixed;
  z-index: 130;
  right: 1.25rem;
  bottom: 1.25rem;
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  max-width: min(25rem, calc(100vw - 2rem));
  min-height: 2.75rem;
  margin: 0;
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  font-size: 0.72rem;
}

.workspace-toast--success {
  border-color: rgba(34, 197, 94, 0.28);
  color: #16813b;
}

.workspace-toast--error {
  border-color: rgba(239, 68, 68, 0.28);
  color: var(--color-error);
}

.workspace-toast :deep(.ui-icon) {
  width: 1rem;
  height: 1rem;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 860px) {
  .general-form {
    grid-template-columns: 1fr;
  }

  .workspace-icon-card,
  .general-form label:nth-of-type(2),
  .form-error,
  .form-actions {
    grid-column: 1;
    grid-row: auto;
  }

  .settings-member {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .settings-member time {
    grid-column: 2;
  }

  .remove-member-button {
    grid-column: 3;
    grid-row: 2;
  }
}

@media (max-width: 600px) {
  .settings-panel {
    padding: 1rem;
  }

  .settings-panel__heading--count {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .settings-panel__heading--count > strong {
    grid-column: 2;
  }

  .invite-card,
  .danger-action {
    align-items: stretch;
    flex-direction: column;
  }

  .invite-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .settings-member {
    grid-template-columns: auto minmax(0, 1fr);
    padding-block: 0.9rem;
  }

  .member-role,
  .settings-member time,
  .remove-member-button {
    grid-column: 2;
  }

  .remove-member-button {
    grid-row: auto;
    justify-self: start;
  }

  .danger-action button {
    width: 100%;
  }

  .workspace-toast {
    right: 1rem;
    bottom: 1rem;
    left: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: none;
  }
}
</style>
