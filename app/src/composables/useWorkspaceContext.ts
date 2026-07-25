import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { onAuthStateChanged, type Unsubscribe as AuthUnsubscribe, type User } from 'firebase/auth'
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type Unsubscribe as FirestoreUnsubscribe,
} from 'firebase/firestore'
import { useSelectedWorkspace } from '@/composables/useSelectedWorkspace'
import { auth, db, isFirebaseConfigured } from '@/firebase'
import type { WorkspaceAIContext } from '@/types/assistant'
import type { Project } from '@/types/project'

const NOTES_API_URL = 'http://localhost:5173/projects'

const getString = (data: DocumentData, field: string): string => {
  const value = data[field]
  return typeof value === 'string' ? value : ''
}

const toISOString = (value: unknown): string | null => {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate().toISOString()
  }

  return null
}

export const useWorkspaceContext = () => {
  const { selectedWorkspaceId } = useSelectedWorkspace()
  const user = ref<User | null>(null)
  const isAuthReady = ref(false)
  const workspace = ref<WorkspaceAIContext['workspace'] | null>(null)
  const members = ref<WorkspaceAIContext['members']>([])
  const notes = ref<WorkspaceAIContext['notes']>([])
  const tasks = ref<WorkspaceAIContext['tasks']>([])
  const activities = ref<WorkspaceAIContext['activities']>([])
  const loadingSources = ref<string[]>([])
  const errorMessage = ref('')
  const firestoreUnsubscribers: FirestoreUnsubscribe[] = []
  let authUnsubscribe: AuthUnsubscribe | undefined
  let subscriptionVersion = 0

  const isLoading = computed(() => loadingSources.value.length > 0)
  const context = computed<WorkspaceAIContext | null>(() => {
    if (!workspace.value) {
      return null
    }

    return {
      workspace: workspace.value,
      members: members.value,
      notes: notes.value,
      tasks: tasks.value,
      activities: activities.value,
    }
  })

  const finishLoading = (source: string) => {
    loadingSources.value = loadingSources.value.filter((item) => item !== source)
  }

  const setReadError = (error: unknown) => {
    console.error(error)
    errorMessage.value = 'Workspace情報の読み込みに失敗しました。'
  }

  const stopContextSubscriptions = () => {
    subscriptionVersion += 1
    firestoreUnsubscribers.splice(0).forEach((unsubscribe) => unsubscribe())
  }

  const clearContext = () => {
    stopContextSubscriptions()
    workspace.value = null
    members.value = []
    notes.value = []
    tasks.value = []
    activities.value = []
    loadingSources.value = []
    errorMessage.value = ''
  }

  const refreshNotes = async (
    workspaceId = selectedWorkspaceId.value,
    version = subscriptionVersion,
  ): Promise<boolean> => {
    if (!user.value || !workspaceId) {
      return false
    }

    if (!loadingSources.value.includes('notes')) {
      loadingSources.value = [...loadingSources.value, 'notes']
    }

    try {
      const response = await fetch(NOTES_API_URL)

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const allNotes = (await response.json()) as Project[]

      if (version !== subscriptionVersion || workspaceId !== selectedWorkspaceId.value) {
        return false
      }

      notes.value = allNotes
        .filter((note) => note.workspaceId === workspaceId)
        .map((note) => ({
          id: note.id,
          title: note.title,
          content: note.content,
        }))
      return true
    } catch (error) {
      if (version === subscriptionVersion) {
        setReadError(error)
      }
      return false
    } finally {
      if (version === subscriptionVersion) {
        finishLoading('notes')
      }
    }
  }

  const subscribeToContext = (workspaceId: string) => {
    stopContextSubscriptions()
    workspace.value = null
    members.value = []
    notes.value = []
    tasks.value = []
    activities.value = []
    errorMessage.value = ''
    loadingSources.value = ['workspace', 'members', 'tasks', 'activities', 'notes']
    const currentVersion = subscriptionVersion

    firestoreUnsubscribers.push(
      onSnapshot(
        doc(db, 'projects', workspaceId),
        (snapshot) => {
          if (currentVersion !== subscriptionVersion) {
            return
          }

          if (!snapshot.exists()) {
            errorMessage.value = '選択中のプロジェクトが見つかりません。'
            finishLoading('workspace')
            return
          }

          const data = snapshot.data()
          workspace.value = {
            id: snapshot.id,
            name: getString(data, 'name') || '名称未設定のプロジェクト',
            description: getString(data, 'description'),
          }
          finishLoading('workspace')
        },
        (error) => {
          if (currentVersion === subscriptionVersion) {
            setReadError(error)
            finishLoading('workspace')
          }
        },
      ),
    )

    firestoreUnsubscribers.push(
      onSnapshot(
        collection(db, 'projects', workspaceId, 'members'),
        (snapshot) => {
          if (currentVersion !== subscriptionVersion) {
            return
          }

          members.value = snapshot.docs.map((memberDocument) => {
            const data = memberDocument.data()
            return {
              displayName:
                getString(data, 'displayName') || getString(data, 'email') || 'ユーザー',
              role: getString(data, 'role') || 'member',
            }
          })
          finishLoading('members')
        },
        (error) => {
          if (currentVersion === subscriptionVersion) {
            setReadError(error)
            finishLoading('members')
          }
        },
      ),
    )

    firestoreUnsubscribers.push(
      onSnapshot(
        collection(db, 'projects', workspaceId, 'tasks'),
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
              status: getString(data, 'status'),
              priority: getString(data, 'priority'),
            }
          })
          finishLoading('tasks')
        },
        (error) => {
          if (currentVersion === subscriptionVersion) {
            setReadError(error)
            finishLoading('tasks')
          }
        },
      ),
    )

    const activitiesQuery = query(
      collection(db, 'projects', workspaceId, 'activities'),
      orderBy('createdAt', 'desc'),
      limit(20),
    )
    firestoreUnsubscribers.push(
      onSnapshot(
        activitiesQuery,
        (snapshot) => {
          if (currentVersion !== subscriptionVersion) {
            return
          }

          activities.value = snapshot.docs.map((activityDocument) => {
            const data = activityDocument.data()
            return {
              id: activityDocument.id,
              displayName:
                getString(data, 'displayName') || getString(data, 'email') || 'ユーザー',
              type: getString(data, 'type'),
              message: getString(data, 'message'),
              createdAt: toISOString(data.createdAt),
            }
          })
          finishLoading('activities')
        },
        (error) => {
          if (currentVersion === subscriptionVersion) {
            setReadError(error)
            finishLoading('activities')
          }
        },
      ),
    )

    void refreshNotes(workspaceId, currentVersion)
  }

  const updateContextSubscription = () => {
    clearContext()

    if (user.value && selectedWorkspaceId.value) {
      subscribeToContext(selectedWorkspaceId.value)
    }
  }

  watch(selectedWorkspaceId, updateContextSubscription)

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
        updateContextSubscription()
      },
      (error) => {
        console.error(error)
        user.value = null
        isAuthReady.value = true
        clearContext()
        errorMessage.value = 'ログイン状態の確認に失敗しました。'
      },
    )
  })

  onUnmounted(() => {
    authUnsubscribe?.()
    stopContextSubscriptions()
  })

  return {
    selectedWorkspaceId,
    user,
    isAuthReady,
    context,
    isLoading,
    errorMessage,
    refreshNotes,
  }
}
