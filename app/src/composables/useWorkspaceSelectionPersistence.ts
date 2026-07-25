import { onMounted, onUnmounted, watch } from 'vue'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '@/firebase'
import { hasWorkspaceAccess } from '@/services/projectMembershipService'
import {
  readStoredWorkspaceId,
  useSelectedWorkspace,
} from '@/composables/useSelectedWorkspace'

const shouldClearOnSnapshotError = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false
  }

  const code = String(error.code)
  return code === 'permission-denied' || code === 'not-found'
}

export const useWorkspaceSelectionPersistence = () => {
  const { selectedWorkspaceId, selectWorkspace, clearSelectedWorkspace } =
    useSelectedWorkspace()

  // 子コンポーネントが自動選択を行う前に、前回値を確保しておく。
  let pendingStoredWorkspaceId = readStoredWorkspaceId()
  let currentUser: User | null = null
  let authUnsubscribe: Unsubscribe | null = null
  let workspaceUnsubscribes: Unsubscribe[] = []
  let subscriptionVersion = 0
  let restoring = false

  const stopWorkspaceSubscriptions = () => {
    workspaceUnsubscribes.forEach((unsubscribe) => unsubscribe())
    workspaceUnsubscribes = []
    subscriptionVersion += 1
  }

  const subscribeToWorkspaceAccess = (user: User, workspaceId: string) => {
    stopWorkspaceSubscriptions()
    const version = subscriptionVersion

    const handleMissingAccess = () => {
      if (
        version === subscriptionVersion &&
        selectedWorkspaceId.value === workspaceId
      ) {
        clearSelectedWorkspace()
        stopWorkspaceSubscriptions()
      }
    }

    const handleSnapshotError = (error: unknown) => {
      console.warn('選択中Workspaceの監視に失敗しました。', error)

      if (shouldClearOnSnapshotError(error)) {
        handleMissingAccess()
      }
    }

    workspaceUnsubscribes = [
      onSnapshot(
        doc(db, 'projects', workspaceId),
        (snapshot) => {
          if (!snapshot.exists()) {
            handleMissingAccess()
          }
        },
        handleSnapshotError,
      ),
      onSnapshot(
        doc(db, 'users', user.uid, 'projects', workspaceId),
        (snapshot) => {
          if (!snapshot.exists()) {
            handleMissingAccess()
          }
        },
        handleSnapshotError,
      ),
    ]
  }

  const restoreWorkspaceSelection = async (user: User) => {
    const workspaceId = pendingStoredWorkspaceId
    pendingStoredWorkspaceId = null

    if (!workspaceId) {
      if (selectedWorkspaceId.value) {
        subscribeToWorkspaceAccess(user, selectedWorkspaceId.value)
      }
      return
    }

    restoring = true
    const version = subscriptionVersion

    try {
      const canAccess = await hasWorkspaceAccess(user.uid, workspaceId)

      if (currentUser?.uid !== user.uid || version !== subscriptionVersion) {
        return
      }

      if (!canAccess) {
        clearSelectedWorkspace()
        return
      }

      selectWorkspace(workspaceId)
      subscribeToWorkspaceAccess(user, workspaceId)
    } catch (error) {
      console.warn('保存済みWorkspaceの復元に失敗しました。', error)
    } finally {
      restoring = false
    }
  }

  const stopSelectionWatch = watch(selectedWorkspaceId, (workspaceId) => {
    if (restoring || !currentUser) {
      return
    }

    if (!workspaceId) {
      stopWorkspaceSubscriptions()
      return
    }

    subscribeToWorkspaceAccess(currentUser, workspaceId)
  })

  onMounted(() => {
    if (!isFirebaseConfigured) {
      return
    }

    authUnsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        stopWorkspaceSubscriptions()
        currentUser = user

        if (!user) {
          pendingStoredWorkspaceId = null
          clearSelectedWorkspace()
          return
        }

        void restoreWorkspaceSelection(user)
      },
      (error) => {
        console.warn('ログイン状態の監視に失敗しました。', error)
        currentUser = null
        clearSelectedWorkspace()
      },
    )
  })

  onUnmounted(() => {
    authUnsubscribe?.()
    authUnsubscribe = null
    stopWorkspaceSubscriptions()
    stopSelectionWatch()
  })
}
