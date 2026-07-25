import { onMounted, onUnmounted, ref, watch } from 'vue'
import { onAuthStateChanged, type Unsubscribe as AuthUnsubscribe, type User } from 'firebase/auth'
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type Unsubscribe as FirestoreUnsubscribe,
} from 'firebase/firestore'
import { useSelectedWorkspace } from '@/composables/useSelectedWorkspace'
import { auth, db, isFirebaseConfigured } from '@/firebase'
import type { Activity, ActivityType } from '@/types/activity'

const activityTypes: ActivityType[] = [
  'note_created',
  'note_updated',
  'note_deleted',
  'workspace_created',
  'workspace_joined',
  'task_created',
  'task_updated',
  'task_deleted',
]

const getString = (data: DocumentData, field: string): string => {
  const value = data[field]
  return typeof value === 'string' ? value : ''
}

const getActivityType = (value: unknown): ActivityType =>
  activityTypes.includes(value as ActivityType) ? (value as ActivityType) : 'note_updated'

export const useWorkspaceActivities = (maximumItems = 50) => {
  const { selectedWorkspaceId } = useSelectedWorkspace()
  const user = ref<User | null>(null)
  const isAuthReady = ref(false)
  const activities = ref<Activity[]>([])
  const isLoading = ref(false)
  const errorMessage = ref('')
  let authUnsubscribe: AuthUnsubscribe | undefined
  let activitiesUnsubscribe: FirestoreUnsubscribe | undefined
  let subscriptionVersion = 0

  const stopActivitiesSubscription = () => {
    subscriptionVersion += 1
    activitiesUnsubscribe?.()
    activitiesUnsubscribe = undefined
  }

  const resetActivities = () => {
    stopActivitiesSubscription()
    activities.value = []
    isLoading.value = false
    errorMessage.value = ''
  }

  const subscribeToActivities = (workspaceId: string) => {
    stopActivitiesSubscription()
    activities.value = []
    errorMessage.value = ''
    isLoading.value = true
    const currentVersion = subscriptionVersion
    const activitiesQuery = query(
      collection(db, 'projects', workspaceId, 'activities'),
      orderBy('createdAt', 'desc'),
      limit(maximumItems),
    )

    activitiesUnsubscribe = onSnapshot(
      activitiesQuery,
      (snapshot) => {
        if (currentVersion !== subscriptionVersion) {
          return
        }

        activities.value = snapshot.docs.map((activityDocument) => {
          const data = activityDocument.data()
          return {
            id: activityDocument.id,
            type: getActivityType(data.type),
            userId: getString(data, 'userId'),
            displayName: getString(data, 'displayName'),
            email: getString(data, 'email'),
            targetId: getString(data, 'targetId') || undefined,
            targetTitle: getString(data, 'targetTitle') || undefined,
            message: getString(data, 'message'),
            createdAt: data.createdAt ?? null,
          }
        })
        isLoading.value = false
      },
      (error) => {
        if (currentVersion !== subscriptionVersion) {
          return
        }

        console.error(error)
        activities.value = []
        errorMessage.value = 'アクティビティの取得に失敗しました'
        isLoading.value = false
      },
    )
  }

  const updateSubscription = () => {
    resetActivities()

    if (user.value && selectedWorkspaceId.value) {
      subscribeToActivities(selectedWorkspaceId.value)
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
        resetActivities()
        errorMessage.value = 'ログイン状態の確認に失敗しました。'
      },
    )
  })

  onUnmounted(() => {
    authUnsubscribe?.()
    stopActivitiesSubscription()
  })

  return {
    selectedWorkspaceId,
    user,
    isAuthReady,
    activities,
    isLoading,
    errorMessage,
  }
}
