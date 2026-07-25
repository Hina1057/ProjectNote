import type { Timestamp } from 'firebase/firestore'

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  createdBy: string
  createdByName: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export interface TaskInput {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
}
