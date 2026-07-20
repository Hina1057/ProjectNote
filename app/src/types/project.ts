export type ProjectCategory = 'Bug' | 'Idea' | 'UI' | 'Task' | 'Meeting' | 'Reference'
export type ProjectStatus = 'Todo' | 'In Progress' | 'Done'

export interface Project {
  id: number
  title: string
  category: ProjectCategory
  content: string
  image: string
  status: string
  createdAt?: string
  updatedAt?: string
}
