import type { Timestamp } from 'firebase/firestore'

export type ActivityType =
  | 'note_created'
  | 'note_updated'
  | 'note_deleted'
  | 'workspace_created'
  | 'workspace_joined'
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'

export interface Activity {
  id: string
  type: ActivityType
  userId: string
  displayName: string
  email: string
  targetId?: string
  targetTitle?: string
  message: string
  createdAt: Timestamp | null
}
