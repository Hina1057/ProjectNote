import type { User } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { generateInviteCode } from '@/utils/generateInviteCode'

const MAX_BATCH_OPERATIONS = 450

const assertWorkspaceHost = async (workspaceId: string, user: User) => {
  const membershipSnapshot = await getDoc(
    doc(db, 'users', user.uid, 'projects', workspaceId),
  )

  if (!membershipSnapshot.exists() || membershipSnapshot.data().role !== 'host') {
    throw new Error('この操作はWorkspace Hostのみ実行できます。')
  }
}

const generateUniqueInviteCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const inviteCode = generateInviteCode()
    const existingProject = await getDocs(
      query(
        collection(db, 'projects'),
        where('inviteCode', '==', inviteCode),
        limit(1),
      ),
    )

    if (existingProject.empty) {
      return inviteCode
    }
  }

  throw new Error('参加コードを生成できませんでした。もう一度お試しください。')
}

export const updateWorkspaceGeneral = async (
  workspaceId: string,
  user: User,
  name: string,
  description: string,
) => {
  await assertWorkspaceHost(workspaceId, user)
  await updateDoc(doc(db, 'projects', workspaceId), {
    name,
    description,
    updatedAt: serverTimestamp(),
  })
}

export const regenerateWorkspaceInviteCode = async (
  workspaceId: string,
  user: User,
): Promise<string> => {
  await assertWorkspaceHost(workspaceId, user)
  const inviteCode = await generateUniqueInviteCode()

  await updateDoc(doc(db, 'projects', workspaceId), {
    inviteCode,
    updatedAt: serverTimestamp(),
  })

  return inviteCode
}

export const removeWorkspaceMember = async (
  workspaceId: string,
  user: User,
  memberId: string,
) => {
  await assertWorkspaceHost(workspaceId, user)

  if (memberId === user.uid) {
    throw new Error('Host自身を削除することはできません。')
  }

  const memberReference = doc(db, 'projects', workspaceId, 'members', memberId)
  const memberSnapshot = await getDoc(memberReference)

  if (!memberSnapshot.exists()) {
    throw new Error('対象のメンバーが見つかりません。')
  }

  if (memberSnapshot.data().role === 'host') {
    throw new Error('Workspace Hostを削除することはできません。')
  }

  const batch = writeBatch(db)
  batch.delete(memberReference)
  batch.delete(doc(db, 'users', memberId, 'projects', workspaceId))
  batch.update(doc(db, 'projects', workspaceId), {
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
}

export const leaveWorkspace = async (workspaceId: string, user: User) => {
  const userMembershipReference = doc(
    db,
    'users',
    user.uid,
    'projects',
    workspaceId,
  )
  const membershipSnapshot = await getDoc(userMembershipReference)

  if (!membershipSnapshot.exists()) {
    throw new Error('Workspaceの参加情報が見つかりません。')
  }

  if (membershipSnapshot.data().role === 'host') {
    throw new Error('HostはWorkspaceから退出できません。')
  }

  const batch = writeBatch(db)
  batch.delete(userMembershipReference)
  batch.delete(doc(db, 'projects', workspaceId, 'members', user.uid))
  await batch.commit()
}

const commitDeleteReferences = async (references: DocumentReference[]) => {
  for (let index = 0; index < references.length; index += MAX_BATCH_OPERATIONS) {
    const batch = writeBatch(db)
    references
      .slice(index, index + MAX_BATCH_OPERATIONS)
      .forEach((reference) => batch.delete(reference))
    await batch.commit()
  }
}

export const deleteWorkspace = async (workspaceId: string, user: User) => {
  await assertWorkspaceHost(workspaceId, user)

  const [membersSnapshot, tasksSnapshot, activitiesSnapshot] = await Promise.all([
    getDocs(collection(db, 'projects', workspaceId, 'members')),
    getDocs(collection(db, 'projects', workspaceId, 'tasks')),
    getDocs(collection(db, 'projects', workspaceId, 'activities')),
  ])
  const contentReferences: DocumentReference[] = []
  const otherMemberReferences: DocumentReference[] = []

  tasksSnapshot.docs.forEach((taskDocument) => {
    contentReferences.push(taskDocument.ref)
  })
  activitiesSnapshot.docs.forEach((activityDocument) => {
    contentReferences.push(activityDocument.ref)
  })
  membersSnapshot.docs
    .filter((memberDocument) => memberDocument.id !== user.uid)
    .forEach((memberDocument) => {
      otherMemberReferences.push(memberDocument.ref)
      otherMemberReferences.push(
        doc(db, 'users', memberDocument.id, 'projects', workspaceId),
      )
    })

  await commitDeleteReferences(contentReferences)
  await commitDeleteReferences(otherMemberReferences)

  const finalBatch = writeBatch(db)
  finalBatch.delete(doc(db, 'projects', workspaceId, 'members', user.uid))
  finalBatch.delete(doc(db, 'users', user.uid, 'projects', workspaceId))
  finalBatch.delete(doc(db, 'projects', workspaceId))
  await finalBatch.commit()
}
