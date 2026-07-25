<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { onAuthStateChanged, type Unsubscribe as AuthUnsubscribe, type User } from 'firebase/auth'
import {
  collection,
  onSnapshot,
  Timestamp,
  type DocumentData,
  type Unsubscribe as FirestoreUnsubscribe,
} from 'firebase/firestore'
import MemberCard, { type WorkspaceMember } from '@/components/MemberCard.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useSelectedWorkspace } from '@/composables/useSelectedWorkspace'
import { auth, db, isFirebaseConfigured } from '@/firebase'

const { selectedWorkspaceId } = useSelectedWorkspace()
const user = ref<User | null>(null)
const isAuthReady = ref(false)
const members = ref<WorkspaceMember[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
let authUnsubscribe: AuthUnsubscribe | undefined
let membersUnsubscribe: FirestoreUnsubscribe | undefined
let subscriptionVersion = 0

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

const getJoinedAt = (value: unknown): string | null => {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }

  return null
}

const stopMembersSubscription = () => {
  subscriptionVersion += 1
  membersUnsubscribe?.()
  membersUnsubscribe = undefined
}

const resetMembers = () => {
  stopMembersSubscription()
  members.value = []
  isLoading.value = false
  errorMessage.value = ''
}

const subscribeToMembers = (workspaceId: string) => {
  stopMembersSubscription()
  members.value = []
  errorMessage.value = ''
  isLoading.value = true
  const currentVersion = subscriptionVersion

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
          displayName: getString(data, 'displayName'),
          email: getString(data, 'email'),
          role: data.role === 'host' ? 'host' : 'member',
          joinedAt: getJoinedAt(data.joinedAt),
        }
      })
      isLoading.value = false
    },
    (error) => {
      if (currentVersion !== subscriptionVersion) {
        return
      }

      console.error(error)
      members.value = []
      errorMessage.value = 'メンバー情報の読み込みに失敗しました。'
      isLoading.value = false
    },
  )
}

const updateSubscription = () => {
  resetMembers()

  if (user.value && selectedWorkspaceId.value) {
    subscribeToMembers(selectedWorkspaceId.value)
  }
}

watch(selectedWorkspaceId, updateSubscription)

onMounted(() => {
  if (!isFirebaseConfigured) {
    isAuthReady.value = true
    errorMessage.value = 'Firebaseの設定を確認してください。'
    return
  }

  authUnsubscribe = onAuthStateChanged(
    auth,
    (currentUser) => {
      user.value = currentUser
      isAuthReady.value = true
      updateSubscription()
    },
    (error) => {
      console.error(error)
      user.value = null
      isAuthReady.value = true
      resetMembers()
      errorMessage.value = 'ログイン状態の確認に失敗しました。'
    },
  )
})

onUnmounted(() => {
  authUnsubscribe?.()
  stopMembersSubscription()
})
</script>

<template>
  <main class="home-view members-view">
    <PageHeader eyebrow="共同ワークスペース" title="メンバー" />

    <section class="members-section" aria-labelledby="members-title">
      <header class="members-heading">
        <div>
          <p>Workspaceメンバー</p>
          <h1 id="members-title">メンバー一覧</h1>
        </div>
        <span v-if="user && selectedWorkspaceId && !isLoading && !errorMessage">
          {{ sortedMembers.length }}人
        </span>
      </header>

      <p v-if="!isAuthReady" class="members-state ui-notice ui-notice--loading" role="status">
        ログイン状態を確認しています
      </p>
      <p
        v-else-if="errorMessage && !user"
        class="members-state ui-notice ui-notice--error"
        role="alert"
      >
        {{ errorMessage }}
      </p>
      <p v-else-if="!user" class="members-state ui-notice ui-notice--empty" role="status">
        ログインしてください
      </p>
      <p
        v-else-if="!selectedWorkspaceId"
        class="members-state ui-notice ui-notice--empty"
        role="status"
      >
        プロジェクトを選択してください
      </p>
      <p
        v-else-if="isLoading"
        class="members-state ui-notice ui-notice--loading"
        role="status"
      >
        メンバーを読み込んでいます
      </p>
      <p
        v-else-if="errorMessage"
        class="members-state ui-notice ui-notice--error"
        role="alert"
      >
        {{ errorMessage }}
      </p>
      <p
        v-else-if="sortedMembers.length === 0"
        class="members-state ui-notice ui-notice--empty"
        role="status"
      >
        メンバーが見つかりません
      </p>
      <div v-else class="member-grid" aria-live="polite">
        <MemberCard v-for="member in sortedMembers" :key="member.id" :member="member" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.members-section {
  width: min(100%, 76rem);
  margin: 0 auto;
}

.members-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.members-heading p,
.members-heading h1 {
  margin: 0;
}

.members-heading p {
  color: var(--color-primary-dark);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.members-heading h1 {
  margin-top: 0.25rem;
  color: var(--color-text);
  font-size: clamp(1.55rem, 3vw, 2.3rem);
  letter-spacing: -0.04em;
}

.members-heading > span {
  color: var(--color-text-secondary);
  font-size: 0.76rem;
  font-weight: 700;
}

.members-state {
  min-height: 7rem;
}

.member-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

@media (max-width: 47.9375rem) {
  .member-grid {
    grid-template-columns: 1fr;
  }
}
</style>
