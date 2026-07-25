import type { User } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/firebase'
import { createActivity } from '@/services/activityService'
import type { Task, TaskInput } from '@/types/task'

const requireTaskContext = (workspaceId: string | null | undefined, user: User | null) => {
  const normalizedWorkspaceId = workspaceId?.trim()

  if (!isFirebaseConfigured || !normalizedWorkspaceId || !user) {
    throw new Error('タスクを操作するにはログインとプロジェクト選択が必要です。')
  }

  return normalizedWorkspaceId
}

const normalizeTaskInput = (input: TaskInput): TaskInput => {
  const title = input.title.trim()

  if (!title) {
    throw new Error('タイトルを入力してください。')
  }

  return {
    title,
    description: input.description.trim(),
    status: input.status,
    priority: input.priority,
  }
}

export const createWorkspaceTask = async (
  workspaceId: string | null | undefined,
  user: User | null,
  input: Omit<TaskInput, 'status'>,
): Promise<string> => {
  const currentWorkspaceId = requireTaskContext(workspaceId, user)
  const taskInput = normalizeTaskInput({ ...input, status: 'todo' })
  const taskReference = await addDoc(
    collection(db, 'projects', currentWorkspaceId, 'tasks'),
    {
      ...taskInput,
      createdBy: user!.uid,
      createdByName: user!.displayName ?? user!.email ?? 'ユーザー',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  )

  await createActivity({
    workspaceId: currentWorkspaceId,
    type: 'task_created',
    user,
    targetId: taskReference.id,
    targetTitle: taskInput.title,
    message: `${taskInput.title}を作成しました`,
  })

  return taskReference.id
}

export const updateWorkspaceTask = async (
  workspaceId: string | null | undefined,
  user: User | null,
  taskId: string,
  input: TaskInput,
): Promise<void> => {
  const currentWorkspaceId = requireTaskContext(workspaceId, user)
  const taskInput = normalizeTaskInput(input)

  if (!taskId.trim()) {
    throw new Error('更新するタスクを確認できません。')
  }

  await updateDoc(doc(db, 'projects', currentWorkspaceId, 'tasks', taskId), {
    ...taskInput,
    updatedAt: serverTimestamp(),
  })

  await createActivity({
    workspaceId: currentWorkspaceId,
    type: 'task_updated',
    user,
    targetId: taskId,
    targetTitle: taskInput.title,
    message: `${taskInput.title}を更新しました`,
  })
}

export const deleteWorkspaceTask = async (
  workspaceId: string | null | undefined,
  user: User | null,
  task: Task,
): Promise<void> => {
  const currentWorkspaceId = requireTaskContext(workspaceId, user)

  if (!task.id.trim()) {
    throw new Error('削除するタスクを確認できません。')
  }

  await deleteDoc(doc(db, 'projects', currentWorkspaceId, 'tasks', task.id))

  await createActivity({
    workspaceId: currentWorkspaceId,
    type: 'task_deleted',
    user,
    targetId: task.id,
    targetTitle: task.title,
    message: `${task.title}を削除しました`,
  })
}
