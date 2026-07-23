<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onAuthStateChanged, type Unsubscribe as AuthUnsubscribe, type User } from 'firebase/auth'
import {
  collection,
  doc,
  onSnapshot,
  type DocumentData,
  type Unsubscribe as FirestoreUnsubscribe,
} from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '@/firebase'

type ProjectRole = 'host' | 'member'

interface JoinedProject {
  id: string
  name: string
  description: string
  inviteCode: string
  role: ProjectRole
}

interface ProjectMembership {
  projectId: string
  role: ProjectRole
}

const user = ref<User | null>(null)
const joinedProjects = ref<JoinedProject[]>([])
const selectedProjectId = ref<string | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
const isCopying = ref(false)
const copyMessage = ref('')
const copyError = ref('')

const projectData = new Map<string, JoinedProject>()
const pendingProjectIds = new Set<string>()
const projectUnsubscribers = new Map<string, FirestoreUnsubscribe>()
let authUnsubscribe: AuthUnsubscribe | undefined
let membershipUnsubscribe: FirestoreUnsubscribe | undefined
let subscriptionVersion = 0
let copyRequestVersion = 0
let copyFeedbackTimeout: number | undefined

const selectedProject = computed(() =>
  joinedProjects.value.find((project) => project.id === selectedProjectId.value),
)

const getRole = (value: unknown): ProjectRole => (value === 'host' ? 'host' : 'member')

const getString = (data: DocumentData, field: string): string => {
  const value = data[field]
  return typeof value === 'string' ? value : ''
}

const resetCopyFeedback = () => {
  copyRequestVersion += 1
  isCopying.value = false
  copyMessage.value = ''
  copyError.value = ''

  if (copyFeedbackTimeout !== undefined) {
    window.clearTimeout(copyFeedbackTimeout)
    copyFeedbackTimeout = undefined
  }
}

const stopProjectSubscriptions = () => {
  subscriptionVersion += 1
  projectUnsubscribers.forEach((unsubscribe) => unsubscribe())
  projectUnsubscribers.clear()
  projectData.clear()
  pendingProjectIds.clear()
}

const stopMembershipSubscription = () => {
  membershipUnsubscribe?.()
  membershipUnsubscribe = undefined
}

const resetJoinedProjects = () => {
  stopMembershipSubscription()
  stopProjectSubscriptions()
  joinedProjects.value = []
  selectedProjectId.value = null
  isLoading.value = false
  errorMessage.value = ''
  resetCopyFeedback()
}

const publishProjects = () => {
  joinedProjects.value = Array.from(projectData.values()).sort((projectA, projectB) =>
    projectA.name.localeCompare(projectB.name, 'ja'),
  )

  if (pendingProjectIds.size > 0) {
    return
  }

  isLoading.value = false

  if (
    !selectedProjectId.value ||
    !joinedProjects.value.some((project) => project.id === selectedProjectId.value)
  ) {
    selectedProjectId.value = joinedProjects.value[0]?.id ?? null
    resetCopyFeedback()
  }
}

const subscribeToProject = (
  membership: ProjectMembership,
  currentSubscriptionVersion: number,
) => {
  pendingProjectIds.add(membership.projectId)

  const unsubscribe = onSnapshot(
    doc(db, 'projects', membership.projectId),
    (projectSnapshot) => {
      if (currentSubscriptionVersion !== subscriptionVersion) {
        return
      }

      pendingProjectIds.delete(membership.projectId)

      if (projectSnapshot.exists()) {
        const data = projectSnapshot.data()
        projectData.set(membership.projectId, {
          id: membership.projectId,
          name: getString(data, 'name') || '名称未設定のプロジェクト',
          description: getString(data, 'description'),
          inviteCode: getString(data, 'inviteCode'),
          role: membership.role,
        })
      } else {
        projectData.delete(membership.projectId)
      }

      publishProjects()
    },
    (error) => {
      if (currentSubscriptionVersion !== subscriptionVersion) {
        return
      }

      console.error(error)
      pendingProjectIds.delete(membership.projectId)
      projectData.delete(membership.projectId)
      errorMessage.value = 'プロジェクト情報の読み込みに失敗しました。'
      publishProjects()
    },
  )

  projectUnsubscribers.set(membership.projectId, unsubscribe)
}

const subscribeToMemberships = (uid: string) => {
  isLoading.value = true

  membershipUnsubscribe = onSnapshot(
    collection(db, 'users', uid, 'projects'),
    (membershipSnapshot) => {
      stopProjectSubscriptions()
      joinedProjects.value = []
      errorMessage.value = ''
      isLoading.value = true
      resetCopyFeedback()

      const memberships: ProjectMembership[] = membershipSnapshot.docs.map((membership) => ({
        projectId: membership.id,
        role: getRole(membership.data().role),
      }))

      if (memberships.length === 0) {
        selectedProjectId.value = null
        isLoading.value = false
        return
      }

      const currentSubscriptionVersion = subscriptionVersion
      memberships.forEach((membership) =>
        subscribeToProject(membership, currentSubscriptionVersion),
      )
    },
    (error) => {
      console.error(error)
      stopProjectSubscriptions()
      joinedProjects.value = []
      selectedProjectId.value = null
      isLoading.value = false
      errorMessage.value = '参加中プロジェクトの読み込みに失敗しました。'
    },
  )
}

const selectProject = (projectId: string) => {
  selectedProjectId.value = projectId
  resetCopyFeedback()
}

const copyInviteCode = async () => {
  const project = selectedProject.value

  if (!user.value || !project?.inviteCode || isCopying.value) {
    return
  }

  resetCopyFeedback()
  const currentRequestVersion = ++copyRequestVersion
  const currentProjectId = project.id
  isCopying.value = true

  try {
    await navigator.clipboard.writeText(project.inviteCode)

    if (
      currentRequestVersion !== copyRequestVersion ||
      selectedProjectId.value !== currentProjectId
    ) {
      return
    }

    copyMessage.value = 'コピーしました'
    copyFeedbackTimeout = window.setTimeout(() => {
      copyMessage.value = ''
      copyFeedbackTimeout = undefined
    }, 2000)
  } catch (error) {
    if (currentRequestVersion !== copyRequestVersion) {
      return
    }

    console.error(error)
    copyError.value = '参加コードのコピーに失敗しました。'
  } finally {
    if (currentRequestVersion === copyRequestVersion) {
      isCopying.value = false
    }
  }
}

onMounted(() => {
  if (!isFirebaseConfigured) {
    return
  }

  authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
    resetJoinedProjects()
    user.value = currentUser

    if (currentUser) {
      subscribeToMemberships(currentUser.uid)
    }
  })
})

onUnmounted(() => {
  authUnsubscribe?.()
  resetJoinedProjects()
})
</script>

<template>
  <div v-if="user" class="joined-projects-workspace">
    <aside class="joined-projects-sidebar" aria-labelledby="joined-projects-title">
      <header>
        <p>SHARED PROJECTS</p>
        <h2 id="joined-projects-title">参加中プロジェクト</h2>
      </header>

      <p v-if="errorMessage" class="sidebar-message sidebar-message--error" role="alert">
        {{ errorMessage }}
      </p>
      <p v-if="isLoading" class="sidebar-message" role="status">読み込み中です...</p>
      <p v-else-if="joinedProjects.length === 0" class="sidebar-message">
        参加中のプロジェクトはありません
      </p>
      <ul v-else>
        <li v-for="project in joinedProjects" :key="project.id">
          <button
            type="button"
            :class="{ 'project-select-button--active': project.id === selectedProjectId }"
            :aria-pressed="project.id === selectedProjectId"
            @click="selectProject(project.id)"
          >
            <strong>{{ project.name }}</strong>
            <span>{{ project.role }}</span>
          </button>
        </li>
      </ul>
    </aside>

    <section
      v-if="selectedProject"
      class="selected-project-card"
      aria-labelledby="selected-project-title"
    >
      <div class="selected-project-heading">
        <div>
          <p>ACTIVE SHARED PROJECT</p>
          <h2 id="selected-project-title">{{ selectedProject.name }}</h2>
        </div>
        <span class="role-badge">{{ selectedProject.role }}</span>
      </div>

      <div class="selected-project-body">
        <div>
          <span class="field-label">説明</span>
          <p>{{ selectedProject.description || '説明はありません。' }}</p>
        </div>

        <div>
          <span class="field-label">参加コード</span>
          <div class="invite-code-row">
            <code>{{ selectedProject.inviteCode || '未設定' }}</code>
            <button
              type="button"
              :disabled="!user || !selectedProject.inviteCode || isCopying"
              @click="copyInviteCode"
            >
              {{ isCopying ? 'コピー中...' : 'コピー' }}
            </button>
          </div>
          <p v-if="copyMessage" class="copy-feedback" role="status">
            {{ copyMessage }}
          </p>
          <p v-if="copyError" class="copy-feedback copy-feedback--error" role="alert">
            {{ copyError }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.joined-projects-workspace {
  max-width: 72rem;
  margin: 0 auto 2rem;
}

.joined-projects-sidebar {
  position: fixed;
  z-index: 23;
  top: 28rem;
  bottom: 5.5rem;
  left: 1.5rem;
  width: 12rem;
  box-sizing: border-box;
  padding: 0.75rem;
  overflow-y: auto;
  border: 1px solid #1c334d;
  border-radius: 0.375rem;
  background: rgba(8, 22, 39, 0.94);
  box-shadow:
    inset 0 1px 0 rgba(106, 221, 255, 0.06),
    0 0.75rem 1.75rem rgba(0, 0, 0, 0.18);
}

.joined-projects-sidebar header {
  padding: 0.125rem 0.125rem 0.625rem;
  border-bottom: 1px solid rgba(43, 74, 104, 0.72);
}

.joined-projects-sidebar header p,
.selected-project-heading > div > p {
  margin: 0 0 0.25rem;
  color: #35dcf7;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.5rem;
  letter-spacing: 0.12em;
}

.joined-projects-sidebar h2 {
  margin: 0;
  color: #cbd9e8;
  font-size: 0.6875rem;
  font-weight: 500;
}

.joined-projects-sidebar ul {
  display: grid;
  gap: 0.375rem;
  margin: 0.625rem 0 0;
  padding: 0;
  list-style: none;
}

.joined-projects-sidebar button {
  display: grid;
  gap: 0.25rem;
  width: 100%;
  padding: 0.625rem;
  border: 1px solid transparent;
  border-radius: 0.3125rem;
  background: rgba(5, 16, 29, 0.76);
  color: #91a4ba;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;
}

.joined-projects-sidebar button:hover,
.joined-projects-sidebar button:focus-visible,
.joined-projects-sidebar .project-select-button--active {
  border-color: rgba(64, 217, 245, 0.52);
  outline: none;
  background: rgba(10, 52, 75, 0.72);
  box-shadow: inset 2px 0 0 #32daf6;
}

.joined-projects-sidebar strong {
  overflow: hidden;
  color: #d7e6f5;
  font-size: 0.6875rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.joined-projects-sidebar button span {
  color: #57dff7;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.5625rem;
  letter-spacing: 0.06em;
}

.sidebar-message {
  margin: 0.625rem 0 0;
  color: #7f93aa;
  font-size: 0.625rem;
  line-height: 1.5;
}

.sidebar-message--error {
  color: #ff9caf;
}

.selected-project-card {
  overflow: hidden;
  border: 1px solid rgba(52, 102, 139, 0.74);
  border-radius: 0.5rem;
  background: linear-gradient(145deg, rgba(18, 45, 72, 0.78), rgba(7, 21, 38, 0.9));
  box-shadow:
    0 0.875rem 2rem rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(109, 221, 255, 0.08);
  backdrop-filter: blur(0.75rem);
}

.selected-project-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem;
  border-bottom: 1px solid rgba(48, 83, 117, 0.72);
}

.selected-project-heading h2 {
  margin: 0;
  color: #edf7ff;
  font-size: 1.25rem;
  font-weight: 400;
}

.role-badge {
  flex: 0 0 auto;
  padding: 0.375rem 0.625rem;
  border: 1px solid rgba(69, 220, 247, 0.52);
  border-radius: 999px;
  background: rgba(7, 65, 91, 0.5);
  color: #8aeafa;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.625rem;
}

.selected-project-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(15rem, 0.55fr);
  gap: 1.5rem;
  padding: 1.25rem;
}

.field-label {
  display: block;
  margin-bottom: 0.5rem;
  color: #7e93ab;
  font-size: 0.625rem;
  letter-spacing: 0.08em;
}

.selected-project-body p {
  margin: 0;
  color: #b4c4d6;
  font-size: 0.8125rem;
  line-height: 1.7;
  white-space: pre-wrap;
}

.invite-code-row {
  display: flex;
  gap: 0.625rem;
}

.invite-code-row code {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  padding: 0.625rem 0.75rem;
  border: 1px solid rgba(55, 143, 177, 0.6);
  border-radius: 0.375rem;
  background: rgba(4, 21, 35, 0.84);
  color: #83edff;
  font-size: 0.875rem;
  letter-spacing: 0.14em;
}

.invite-code-row button {
  flex: 0 0 auto;
  padding: 0.625rem 0.875rem;
  border: 1px solid rgba(91, 222, 255, 0.48);
  border-radius: 0.375rem;
  background: linear-gradient(110deg, rgba(8, 105, 158, 0.94), rgba(20, 145, 177, 0.9));
  color: #e5faff;
  font: inherit;
  font-size: 0.6875rem;
  cursor: pointer;
}

.invite-code-row button:hover:not(:disabled),
.invite-code-row button:focus-visible {
  border-color: #44e5ff;
  outline: none;
  box-shadow: 0 0 0.875rem rgba(51, 228, 255, 0.18);
}

.invite-code-row button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.selected-project-body .copy-feedback {
  margin-top: 0.5rem;
  color: #67e8ff;
  font-size: 0.6875rem;
}

.selected-project-body .copy-feedback--error {
  color: #ff9caf;
}

@media (max-width: 56.25rem) {
  .joined-projects-workspace {
    margin-bottom: 1.5rem;
  }

  .joined-projects-sidebar {
    position: relative;
    inset: auto;
    width: 100%;
    max-height: 18rem;
    margin-bottom: 1.5rem;
  }
}

@media (max-width: 40rem) {
  .selected-project-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 32.5rem) {
  .selected-project-heading {
    display: grid;
  }

  .role-badge {
    justify-self: start;
  }

  .invite-code-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
