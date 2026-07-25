import type { User } from 'firebase/auth'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/firebase'
import type { ActivityType } from '@/types/activity'

interface CreateActivityInput {
  workspaceId: string | null | undefined
  type: ActivityType
  user: User | null | undefined
  targetId?: string | number
  targetTitle?: string
  message: string
}

export const createActivity = async ({
  workspaceId,
  type,
  user,
  targetId,
  targetTitle,
  message,
}: CreateActivityInput): Promise<boolean> => {
  const normalizedWorkspaceId = workspaceId?.trim()
  const normalizedMessage = message.trim()

  if (!isFirebaseConfigured || !normalizedWorkspaceId || !user?.uid || !normalizedMessage) {
    return false
  }

  const activityData: Record<string, unknown> = {
    type,
    userId: user.uid,
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    message: normalizedMessage,
    createdAt: serverTimestamp(),
  }

  if (targetId !== undefined && String(targetId).trim()) {
    activityData.targetId = String(targetId)
  }

  if (targetTitle?.trim()) {
    activityData.targetTitle = targetTitle.trim()
  }

  try {
    await addDoc(collection(db, 'projects', normalizedWorkspaceId, 'activities'), activityData)
    return true
  } catch (error) {
    console.error('アクティビティの保存に失敗しました。', error)
    return false
  }
}
