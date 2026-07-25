import { readonly, ref } from 'vue'

const selectedWorkspaceId = ref<string | null>(null)

const selectWorkspace = (workspaceId: string) => {
  selectedWorkspaceId.value = workspaceId
}

const clearSelectedWorkspace = () => {
  selectedWorkspaceId.value = null
}

export const useSelectedWorkspace = () => ({
  selectedWorkspaceId: readonly(selectedWorkspaceId),
  selectWorkspace,
  clearSelectedWorkspace,
})
