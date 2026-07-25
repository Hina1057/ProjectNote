import { createRouter, createWebHistory } from 'vue-router'
import ActivityView from '@/views/ActivityView.vue'
import AIAssistantView from '@/views/AIAssistantView.vue'
import DashboardView from '@/views/DashboardView.vue'
import EditProjectView from '@/views/EditProjectView.vue'
import MembersView from '@/views/MembersView.vue'
import NewProjectView from '@/views/NewProjectView.vue'
import NotesView from '@/views/NotesView.vue'
import ProjectDetailView from '@/views/ProjectDetailView.vue'
import ProjectsView from '@/views/ProjectsView.vue'
import SettingsView from '@/views/SettingsView.vue'
import TasksView from '@/views/TasksView.vue'
import WorkspaceDetailView from '@/views/WorkspaceDetailView.vue'
import WorkspaceSettingsView from '@/views/WorkspaceSettingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: 'dashboard' },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/workspaces',
      name: 'workspaces',
      component: ProjectsView,
    },
    {
      path: '/notes',
      name: 'notes',
      component: NotesView,
    },
    {
      path: '/members',
      name: 'members',
      component: MembersView,
    },
    {
      path: '/activity',
      name: 'activity',
      component: ActivityView,
    },
    {
      path: '/assistant',
      name: 'assistant',
      component: AIAssistantView,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
    },
    {
      path: '/workspace-settings',
      name: 'workspace-settings',
      component: WorkspaceSettingsView,
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: TasksView,
    },
    {
      path: '/projects/new',
      name: 'new-project',
      component: NewProjectView,
    },
    {
      path: '/projects/:id/edit',
      name: 'edit-project',
      component: EditProjectView,
    },
    {
      path: '/projects/:id',
      name: 'project-detail',
      component: ProjectDetailView,
    },
    {
      path: '/workspaces/:projectId',
      name: 'workspace-detail',
      component: WorkspaceDetailView,
    },
  ],
})

export default router
