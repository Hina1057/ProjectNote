import type { User } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase'

const INVITE_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/

interface InviteCodeProject {
  id: string
  name: string
  hostId: string
}

export type InviteCodeSearchResult =
  | { status: 'found'; project: InviteCodeProject }
  | { status: 'not-found' }
  | { status: 'duplicate-code' }

export type JoinProjectResult =
  | { status: 'joined'; projectId: string; projectName: string }
  | { status: 'invalid-code' }
  | { status: 'not-found' }
  | { status: 'duplicate-code' }
  | { status: 'already-member' }
  | { status: 'host-project' }

export const normalizeInviteCode = (value: string): string => value.trim().toUpperCase()

export const isValidInviteCode = (value: string): boolean =>
  INVITE_CODE_PATTERN.test(normalizeInviteCode(value))

export const findProjectByInviteCode = async (
  inviteCode: string,
): Promise<InviteCodeSearchResult> => {
  const normalizedCode = normalizeInviteCode(inviteCode)
  const projectQuery = query(
    collection(db, 'projects'),
    where('inviteCode', '==', normalizedCode),
    limit(2),
  )
  const projectSnapshot = await getDocs(projectQuery)

  if (projectSnapshot.empty) {
    return { status: 'not-found' }
  }

  if (projectSnapshot.size >= 2) {
    return { status: 'duplicate-code' }
  }

  const projectDocument = projectSnapshot.docs[0]

  if (!projectDocument) {
    return { status: 'not-found' }
  }

  const data = projectDocument.data()

  return {
    status: 'found',
    project: {
      id: projectDocument.id,
      name: typeof data.name === 'string' && data.name ? data.name : '名称未設定のプロジェクト',
      hostId: typeof data.hostId === 'string' ? data.hostId : '',
    },
  }
}

export const hasWorkspaceAccess = async (uid: string, workspaceId: string) => {
  const [workspaceSnapshot, membershipSnapshot] = await Promise.all([
    getDoc(doc(db, 'projects', workspaceId)),
    getDoc(doc(db, 'users', uid, 'projects', workspaceId)),
  ])

  return workspaceSnapshot.exists() && membershipSnapshot.exists()
}

export const joinProjectByInviteCode = async (
  currentUser: User,
  inviteCode: string,
): Promise<JoinProjectResult> => {
  const normalizedCode = normalizeInviteCode(inviteCode)

  if (!isValidInviteCode(normalizedCode)) {
    return { status: 'invalid-code' }
  }

  const searchResult = await findProjectByInviteCode(normalizedCode)

  if (searchResult.status !== 'found') {
    return searchResult
  }

  const { project } = searchResult
  const projectReference = doc(db, 'projects', project.id)
  const memberReference = doc(db, 'projects', project.id, 'members', currentUser.uid)
  const userProjectReference = doc(db, 'users', currentUser.uid, 'projects', project.id)
  const [projectDocument, memberDocument, userProjectDocument] = await Promise.all([
    getDoc(projectReference),
    getDoc(memberReference),
    getDoc(userProjectReference),
  ])

  if (!projectDocument.exists()) {
    return { status: 'not-found' }
  }

  const currentProjectData = projectDocument.data()
  const currentInviteCode =
    typeof currentProjectData.inviteCode === 'string' ? currentProjectData.inviteCode : ''
  const currentHostId =
    typeof currentProjectData.hostId === 'string' ? currentProjectData.hostId : project.hostId

  if (currentInviteCode !== normalizedCode) {
    return { status: 'not-found' }
  }

  if (currentHostId === currentUser.uid) {
    return { status: 'host-project' }
  }

  if (memberDocument.exists() || userProjectDocument.exists()) {
    return { status: 'already-member' }
  }

  const projectName =
    typeof currentProjectData.name === 'string' && currentProjectData.name
      ? currentProjectData.name
      : project.name
  const batch = writeBatch(db)

  batch.set(memberReference, {
    role: 'member',
    displayName: currentUser.displayName ?? '',
    email: currentUser.email ?? '',
    joinedAt: serverTimestamp(),
  })
  batch.set(userProjectReference, {
    role: 'member',
    joinedAt: serverTimestamp(),
  })

  await batch.commit()

  return {
    status: 'joined',
    projectId: project.id,
    projectName,
  }
}
