<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { onAuthStateChanged, type Unsubscribe as AuthUnsubscribe, type User } from 'firebase/auth'
import {
  doc,
  onSnapshot,
  type DocumentData,
  type Unsubscribe as FirestoreUnsubscribe,
} from 'firebase/firestore'
import { RouterLink } from 'vue-router'
import UiIcon from '@/components/UiIcon.vue'
import { useSelectedWorkspace } from '@/composables/useSelectedWorkspace'
import { auth, db, isFirebaseConfigured } from '@/firebase'
import { getRoleLabel } from '@/utils/uiLabels'

type ProjectRole = 'host' | 'member'

interface WorkspaceSummary {
  id: string
  name: string
  description: string
  role: ProjectRole
}

const { selectedWorkspaceId } = useSelectedWorkspace()
const user = ref<User | null>(null)
const workspace = ref<WorkspaceSummary | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
let authUnsubscribe: AuthUnsubscribe | undefined
let membershipUnsubscribe: FirestoreUnsubscribe | undefined
let projectUnsubscribe: FirestoreUnsubscribe | undefined

const stopSubscriptions = () => {
  membershipUnsubscribe?.()
  projectUnsubscribe?.()
  membershipUnsubscribe = undefined
  projectUnsubscribe = undefined
}

const getString = (data: DocumentData, field: string): string => {
  const value = data[field]
  return typeof value === 'string' ? value : ''
}

const subscribeWorkspace = (currentUser: User, workspaceId: string | null) => {
  stopSubscriptions()
  workspace.value = null
  errorMessage.value = ''

  if (!workspaceId) {
    isLoading.value = false
    return
  }

  isLoading.value = true
  membershipUnsubscribe = onSnapshot(
    doc(db, 'users', currentUser.uid, 'projects', workspaceId),
    (membershipSnapshot) => {
      if (!membershipSnapshot.exists()) {
        errorMessage.value = '選択中プロジェクトの参加情報を確認できません。'
        isLoading.value = false
        return
      }

      const role: ProjectRole = membershipSnapshot.data().role === 'host' ? 'host' : 'member'
      projectUnsubscribe?.()
      projectUnsubscribe = onSnapshot(
        doc(db, 'projects', workspaceId),
        (projectSnapshot) => {
          if (!projectSnapshot.exists()) {
            errorMessage.value = '選択中プロジェクトが見つかりません。'
            isLoading.value = false
            return
          }

          const data = projectSnapshot.data()
          workspace.value = {
            id: projectSnapshot.id,
            name: getString(data, 'name') || '名称未設定のプロジェクト',
            description: getString(data, 'description'),
            role,
          }
          isLoading.value = false
        },
        (error) => {
          console.error(error)
          errorMessage.value = 'プロジェクト概要の読み込みに失敗しました。'
          isLoading.value = false
        },
      )
    },
    (error) => {
      console.error(error)
      errorMessage.value = '参加情報の読み込みに失敗しました。'
      isLoading.value = false
    },
  )
}

onMounted(() => {
  if (!isFirebaseConfigured) {
    errorMessage.value = 'Firebaseの設定を確認してください。'
    return
  }

  authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser
    if (currentUser) {
      subscribeWorkspace(currentUser, selectedWorkspaceId.value)
    } else {
      stopSubscriptions()
      workspace.value = null
    }
  })
})

watch(selectedWorkspaceId, (workspaceId) => {
  if (user.value) {
    subscribeWorkspace(user.value, workspaceId)
  }
})

onUnmounted(() => {
  authUnsubscribe?.()
  stopSubscriptions()
})
</script>

<template>
  <section class="dashboard-workspace-overview" aria-labelledby="workspace-overview-title">
    <p v-if="!selectedWorkspaceId" class="message ui-notice ui-notice--empty" role="status">
      プロジェクトを選択すると概要を表示できます
    </p>
    <p v-else-if="isLoading" class="message ui-notice ui-notice--loading" role="status">
      プロジェクト概要を読み込んでいます
    </p>
    <p v-else-if="errorMessage" class="message ui-notice ui-notice--error" role="alert">
      {{ errorMessage }}
    </p>
    <article v-else-if="workspace" class="selected-project-card ui-flow-frame">
      <div class="selected-project-heading">
        <div>
          <p>選択中の共有プロジェクト</p>
          <h2 id="workspace-overview-title">{{ workspace.name }}</h2>
        </div>
        <span class="role-badge">{{ getRoleLabel(workspace.role) }}</span>
      </div>
      <div class="dashboard-workspace-body">
        <p>{{ workspace.description || '説明はありません。' }}</p>
        <RouterLink
          class="workspace-overview-link"
          :to="{ name: 'workspace-detail', params: { projectId: workspace.id } }"
        >
          詳細を見る
          <UiIcon name="chevron" />
        </RouterLink>
      </div>
    </article>
  </section>
</template>

<style scoped>
.dashboard-workspace-overview {
  width: min(100%, 76rem);
  margin: 0 auto 1.5rem;
}

.dashboard-workspace-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
}

.dashboard-workspace-body p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.82rem;
  line-height: 1.7;
}

.workspace-overview-link {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 0.35rem;
  align-items: center;
  min-height: 2.75rem;
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 700;
  text-decoration: none;
}

.workspace-overview-link:hover,
.workspace-overview-link:focus-visible {
  background: var(--color-primary-hover);
  box-shadow: var(--shadow-hover);
}

@media (max-width: 40rem) {
  .dashboard-workspace-body {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
