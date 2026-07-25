import { onMounted, onUnmounted, ref, watch } from 'vue'
import { onAuthStateChanged, type Unsubscribe as AuthUnsubscribe, type User } from 'firebase/auth'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type Unsubscribe as FirestoreUnsubscribe,
} from 'firebase/firestore'
import { useSelectedWorkspace } from '@/composables/useSelectedWorkspace'
import { auth, db, isFirebaseConfigured } from '@/firebase'
import type { Task, TaskPriority, TaskStatus } from '@/types/task'

const taskStatuses: TaskStatus[] = ['todo', 'in_progress', 'done']
const taskPriorities: TaskPriority[] = ['low', 'medium', 'high']

const getString = (data: DocumentData, field: string): string => {
  const value = data[field]
  return typeof value === 'string' ? value : ''
}

const getStatus = (value: unknown): TaskStatus =>
  taskStatuses.includes(value as TaskStatus) ? (value as TaskStatus) : 'todo'

const getPriority = (value: unknown): TaskPriority =>
  taskPriorities.includes(value as TaskPriority) ? (value as TaskPriority) : 'medium'

export const useWorkspaceTasks = () => {
  const { selectedWorkspaceId } = useSelectedWorkspace()
  const user = ref<User | null>(null)
  const isAuthReady = ref(false)
  const tasks = ref<Task[]>([])
  const isLoading = ref(false)
  const errorMessage = ref('')
  let authUnsubscribe: AuthUnsubscribe | undefined
  let tasksUnsubscribe: FirestoreUnsubscribe | undefined
  let subscriptionVersion = 0

  const stopTasksSubscription = () => {
    subscriptionVersion += 1
    tasksUnsubscribe?.()
    tasksUnsubscribe = undefined
  }

  const resetTasks = () => {
    stopTasksSubscription()
    tasks.value = []
    isLoading.value = false
    errorMessage.value = ''
  }

  const subscribeToTasks = (workspaceId: string) => {
    stopTasksSubscription()
    tasks.value = []
    errorMessage.value = ''
    isLoading.value = true
    const currentVersion = subscriptionVersion
    const tasksQuery = query(
      collection(db, 'projects', workspaceId, 'tasks'),
      orderBy('updatedAt', 'desc'),
    )

    tasksUnsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        if (currentVersion !== subscriptionVersion) {
          return
        }

        tasks.value = snapshot.docs.map((taskDocument) => {
          const data = taskDocument.data()
          return {
            id: taskDocument.id,
            title: getString(data, 'title'),
            description: getString(data, 'description'),
            status: getStatus(data.status),
            priority: getPriority(data.priority),
            createdBy: getString(data, 'createdBy'),
            createdByName: getString(data, 'createdByName') || 'ユーザー',
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
          }
        })
        isLoading.value = false
      },
      (error) => {
        if (currentVersion !== subscriptionVersion) {
          return
        }

        console.error(error)
        tasks.value = []
        errorMessage.value = 'タスクの取得に失敗しました。'
        isLoading.value = false
      },
    )
  }

  const updateSubscription = () => {
    resetTasks()

    if (user.value && selectedWorkspaceId.value) {
      subscribeToTasks(selectedWorkspaceId.value)
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
        resetTasks()
        errorMessage.value = 'ログイン状態の確認に失敗しました。'
      },
    )
  })

  onUnmounted(() => {
    authUnsubscribe?.()
    stopTasksSubscription()
  })

  return {
    selectedWorkspaceId,
    user,
    isAuthReady,
    tasks,
    isLoading,
    errorMessage,
  }
}
