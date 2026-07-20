import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import EditProjectView from '@/views/EditProjectView.vue'
import NewProjectView from '@/views/NewProjectView.vue'
import ProjectDetailView from '@/views/ProjectDetailView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
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
  ],
})

export default router
