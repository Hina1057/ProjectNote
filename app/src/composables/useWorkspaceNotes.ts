import { ref, watch } from 'vue'
import { auth } from '@/firebase'
import { createActivity } from '@/services/activityService'
import type { Project, ProjectStatus } from '@/types/project'
import { useSelectedWorkspace } from '@/composables/useSelectedWorkspace'

const API_URL = 'http://localhost:5173/projects'

export const useWorkspaceNotes = () => {
  const projects = ref<Project[]>([])
  const isLoading = ref(false)
  const errorMessage = ref('')
  const statusUpdateError = ref('')
  const updatingProjectIds = ref<number[]>([])
  const { selectedWorkspaceId } = useSelectedWorkspace()
  let fetchRequestVersion = 0

  const fetchProjects = async (workspaceId: string | null) => {
    const currentRequestVersion = ++fetchRequestVersion
    projects.value = []
    errorMessage.value = ''
    statusUpdateError.value = ''

    if (!workspaceId) {
      isLoading.value = false
      return
    }

    isLoading.value = true

    try {
      const response = await fetch(API_URL)

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const allProjects = (await response.json()) as Project[]

      if (currentRequestVersion !== fetchRequestVersion) {
        return
      }

      projects.value = allProjects.filter((project) => project.workspaceId === workspaceId)
    } catch (error) {
      if (currentRequestVersion !== fetchRequestVersion) {
        return
      }

      console.error(error)
      errorMessage.value = 'ノートの読み込みに失敗しました。'
    } finally {
      if (currentRequestVersion === fetchRequestVersion) {
        isLoading.value = false
      }
    }
  }

  const updateProjectStatus = async (projectId: number, status: ProjectStatus) => {
    const project = projects.value.find((item) => item.id === projectId)

    if (
      !project ||
      !selectedWorkspaceId.value ||
      project.workspaceId !== selectedWorkspaceId.value ||
      project.status === status
    ) {
      return
    }

    const previousStatus = project.status
    const previousUpdatedAt = project.updatedAt
    const updatedAt = new Date().toISOString()
    project.status = status
    project.updatedAt = updatedAt
    statusUpdateError.value = ''
    updatingProjectIds.value.push(projectId)

    try {
      const response = await fetch(`${API_URL}/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, updatedAt }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const updatedProject = (await response.json()) as Project
      project.status = updatedProject.status
      project.updatedAt = updatedProject.updatedAt ?? updatedAt

      await createActivity({
        workspaceId: project.workspaceId,
        type: 'note_updated',
        user: auth.currentUser,
        targetId: project.id,
        targetTitle: project.title,
        message: `${project.title}を更新しました`,
      })
    } catch (error) {
      console.error(error)
      project.status = previousStatus
      project.updatedAt = previousUpdatedAt
      statusUpdateError.value = 'ステータスの更新に失敗しました。'
    } finally {
      updatingProjectIds.value = updatingProjectIds.value.filter((id) => id !== projectId)
    }
  }

  watch(selectedWorkspaceId, (workspaceId) => fetchProjects(workspaceId), { immediate: true })

  return {
    selectedWorkspaceId,
    projects,
    isLoading,
    errorMessage,
    statusUpdateError,
    updatingProjectIds,
    updateProjectStatus,
  }
}
