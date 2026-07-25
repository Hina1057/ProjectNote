import { readonly, ref } from 'vue'

export const SELECTED_WORKSPACE_STORAGE_KEY = 'selectedWorkspaceId'

const selectedWorkspaceId = ref<string | null>(null)

const getLocalStorage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch (error) {
    console.warn('Workspaceの保存領域へアクセスできませんでした。', error)
    return null
  }
}

export const readStoredWorkspaceId = (): string | null => {
  try {
    const storage = getLocalStorage()
    const workspaceId = storage?.getItem(SELECTED_WORKSPACE_STORAGE_KEY)?.trim()

    if (!workspaceId) {
      return null
    }

    if (workspaceId.includes('/') || workspaceId.length > 1_500) {
      storage?.removeItem(SELECTED_WORKSPACE_STORAGE_KEY)
      return null
    }

    return workspaceId
  } catch (error) {
    console.warn('保存済みWorkspaceの読み込みに失敗しました。', error)
    return null
  }
}

const storeWorkspaceId = (workspaceId: string) => {
  try {
    getLocalStorage()?.setItem(SELECTED_WORKSPACE_STORAGE_KEY, workspaceId)
  } catch (error) {
    console.warn('選択中Workspaceの保存に失敗しました。', error)
  }
}

const removeStoredWorkspaceId = () => {
  try {
    getLocalStorage()?.removeItem(SELECTED_WORKSPACE_STORAGE_KEY)
  } catch (error) {
    console.warn('保存済みWorkspaceの削除に失敗しました。', error)
  }
}

const selectWorkspace = (workspaceId: string) => {
  const normalizedWorkspaceId = workspaceId.trim()

  if (!normalizedWorkspaceId) {
    clearSelectedWorkspace()
    return
  }

  selectedWorkspaceId.value = normalizedWorkspaceId
  storeWorkspaceId(normalizedWorkspaceId)
}

const clearSelectedWorkspace = () => {
  selectedWorkspaceId.value = null
  removeStoredWorkspaceId()
}

export const useSelectedWorkspace = () => ({
  selectedWorkspaceId: readonly(selectedWorkspaceId),
  selectWorkspace,
  clearSelectedWorkspace,
})
