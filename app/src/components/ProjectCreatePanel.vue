<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { onAuthStateChanged, type Unsubscribe, type User } from 'firebase/auth'
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '@/firebase'
import { generateInviteCode } from '@/utils/generateInviteCode'

interface CreatedProject {
  name: string
  inviteCode: string
}

const user = ref<User | null>(null)
const isOpen = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const createdProject = ref<CreatedProject | null>(null)
const isCopyingInviteCode = ref(false)
const copyMessage = ref('')
const copyError = ref('')
const form = reactive({
  name: '',
  description: '',
})
let unsubscribe: Unsubscribe | undefined
let copyFeedbackTimeout: number | undefined

const resetCopyFeedback = () => {
  isCopyingInviteCode.value = false
  copyMessage.value = ''
  copyError.value = ''

  if (copyFeedbackTimeout !== undefined) {
    window.clearTimeout(copyFeedbackTimeout)
    copyFeedbackTimeout = undefined
  }
}

const resetDialog = () => {
  form.name = ''
  form.description = ''
  errorMessage.value = ''
  createdProject.value = null
  resetCopyFeedback()
}

const openDialog = () => {
  resetDialog()
  isOpen.value = true
}

const closeDialog = () => {
  if (isSubmitting.value) {
    return
  }

  isOpen.value = false
  resetDialog()
}

const createProject = async () => {
  if (isSubmitting.value) {
    return
  }

  const currentUser = user.value
  const name = form.name.trim()
  const description = form.description.trim()

  errorMessage.value = ''

  if (!currentUser) {
    errorMessage.value = 'プロジェクトを作成するにはログインしてください。'
    return
  }

  if (!name) {
    errorMessage.value = 'プロジェクト名を入力してください。'
    return
  }

  isSubmitting.value = true

  try {
    const inviteCode = generateInviteCode()
    const projectReference = doc(collection(db, 'projects'))
    const memberReference = doc(
      db,
      'projects',
      projectReference.id,
      'members',
      currentUser.uid,
    )
    const userProjectReference = doc(
      db,
      'users',
      currentUser.uid,
      'projects',
      projectReference.id,
    )
    const batch = writeBatch(db)

    batch.set(projectReference, {
      name,
      description,
      hostId: currentUser.uid,
      inviteCode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    batch.set(memberReference, {
      role: 'host',
      displayName: currentUser.displayName ?? '',
      email: currentUser.email ?? '',
      joinedAt: serverTimestamp(),
    })
    batch.set(userProjectReference, {
      role: 'host',
      joinedAt: serverTimestamp(),
    })

    await batch.commit()

    createdProject.value = { name, inviteCode }
  } catch (error) {
    console.error(error)
    errorMessage.value =
      'プロジェクトの作成に失敗しました。時間をおいてもう一度お試しください。'
  } finally {
    isSubmitting.value = false
  }
}

const copyCreatedInviteCode = async () => {
  const inviteCode = createdProject.value?.inviteCode

  if (!user.value || !inviteCode || isCopyingInviteCode.value) {
    return
  }

  resetCopyFeedback()
  isCopyingInviteCode.value = true

  try {
    await navigator.clipboard.writeText(inviteCode)
    copyMessage.value = 'コピーしました'
    copyFeedbackTimeout = window.setTimeout(() => {
      copyMessage.value = ''
      copyFeedbackTimeout = undefined
    }, 2000)
  } catch (error) {
    console.error(error)
    copyError.value = '参加コードのコピーに失敗しました。'
  } finally {
    isCopyingInviteCode.value = false
  }
}

onMounted(() => {
  if (!isFirebaseConfigured) {
    return
  }

  unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser

    if (!currentUser && isOpen.value) {
      closeDialog()
    }
  })
})

onUnmounted(() => {
  unsubscribe?.()
  resetCopyFeedback()
})
</script>

<template>
  <div v-if="user" class="project-create-panel">
    <button class="open-button" type="button" @click="openDialog">
      <span aria-hidden="true">＋</span>
      プロジェクトを作成
    </button>

    <div
      v-if="isOpen"
      class="dialog-backdrop"
      role="presentation"
      @click.self="closeDialog"
    >
      <section
        class="create-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
      >
        <div class="dialog-heading">
          <div>
            <p>NEW SHARED PROJECT</p>
            <h2 id="create-project-title">プロジェクトを作成</h2>
          </div>
          <button
            class="close-button"
            type="button"
            aria-label="作成画面を閉じる"
            :disabled="isSubmitting"
            @click="closeDialog"
          >
            ×
          </button>
        </div>

        <div v-if="createdProject" class="success-panel" role="status">
          <span class="success-label">PROJECT CREATED</span>
          <h3>{{ createdProject.name }}</h3>
          <p>参加コード</p>
          <div class="created-invite-code">
            <strong>{{ createdProject.inviteCode }}</strong>
            <button
              class="copy-button"
              type="button"
              :disabled="!user || isCopyingInviteCode"
              @click="copyCreatedInviteCode"
            >
              {{ isCopyingInviteCode ? 'コピー中...' : 'コピー' }}
            </button>
          </div>
          <span v-if="copyMessage" class="copy-feedback" role="status">
            {{ copyMessage }}
          </span>
          <span v-if="copyError" class="copy-feedback copy-feedback--error" role="alert">
            {{ copyError }}
          </span>
          <small>参加するメンバーへ、このコードを共有してください。</small>
          <button class="primary-button" type="button" @click="closeDialog">閉じる</button>
        </div>

        <form v-else class="create-form" :aria-busy="isSubmitting" @submit.prevent="createProject">
          <div class="form-field">
            <label for="shared-project-name">
              プロジェクト名
              <span>必須</span>
            </label>
            <input
              id="shared-project-name"
              v-model="form.name"
              type="text"
              maxlength="80"
              autocomplete="off"
              placeholder="例：ゲーム開発プロジェクト"
              required
            />
          </div>

          <div class="form-field">
            <label for="shared-project-description">
              説明
              <span class="optional">任意</span>
            </label>
            <textarea
              id="shared-project-description"
              v-model="form.description"
              maxlength="500"
              rows="5"
              placeholder="プロジェクトの目的や概要を入力"
            ></textarea>
          </div>

          <p v-if="errorMessage" class="error-message" role="alert">
            {{ errorMessage }}
          </p>

          <div class="form-actions">
            <button
              class="secondary-button"
              type="button"
              :disabled="isSubmitting"
              @click="closeDialog"
            >
              キャンセル
            </button>
            <button class="primary-button" type="submit" :disabled="isSubmitting">
              {{ isSubmitting ? '作成中...' : '作成する' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.open-button,
.primary-button,
.secondary-button,
.close-button,
.copy-button {
  border: 0;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.open-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 2.75rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid rgba(91, 222, 255, 0.48);
  border-radius: 0.375rem;
  background: linear-gradient(110deg, rgba(8, 78, 126, 0.95), rgba(16, 142, 173, 0.9));
  box-shadow: 0 0 1rem rgba(29, 217, 255, 0.14);
  color: #e5faff;
  font-size: 0.75rem;
  font-weight: 500;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.open-button span {
  color: #72edff;
  font-size: 1rem;
}

.open-button:hover,
.open-button:focus-visible {
  border-color: #33e4ff;
  outline: none;
  box-shadow: 0 0 1.25rem rgba(51, 228, 255, 0.25);
  transform: translateY(-1px);
}

.dialog-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: rgba(1, 7, 15, 0.82);
  backdrop-filter: blur(0.5rem);
}

.create-dialog {
  width: min(100%, 38rem);
  max-height: calc(100vh - 3rem);
  overflow-y: auto;
  border: 1px solid rgba(64, 154, 196, 0.62);
  border-radius: 0.625rem;
  background:
    linear-gradient(145deg, rgba(16, 40, 66, 0.98), rgba(5, 17, 32, 0.99)),
    #071321;
  box-shadow:
    0 1.5rem 5rem rgba(0, 0, 0, 0.58),
    0 0 2rem rgba(29, 217, 255, 0.12),
    inset 0 1px 0 rgba(110, 230, 255, 0.12);
}

.dialog-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(57, 100, 139, 0.5);
}

.dialog-heading p {
  margin: 0 0 0.375rem;
  color: #38e1ff;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.625rem;
  letter-spacing: 0.13em;
}

.dialog-heading h2 {
  margin: 0;
  color: #edf7ff;
  font-size: 1.5rem;
  font-weight: 400;
  letter-spacing: 0.02em;
}

.close-button {
  flex: 0 0 auto;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid #294b68;
  border-radius: 0.375rem;
  background: rgba(5, 17, 31, 0.74);
  color: #9eb1c6;
  font-size: 1.25rem;
}

.create-form,
.success-panel {
  padding: 1.5rem;
}

.create-form {
  display: grid;
  gap: 1.25rem;
}

.form-field {
  display: grid;
  gap: 0.5rem;
}

.form-field label {
  color: #bccbdd;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.form-field label span {
  margin-left: 0.375rem;
  color: #55e6ff;
  font-size: 0.625rem;
}

.form-field label .optional {
  color: #788da5;
}

.form-field input,
.form-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 0.875rem;
  border: 1px solid #2b4a68;
  border-radius: 0.375rem;
  outline: none;
  background: rgba(4, 15, 28, 0.9);
  color: #e0eefc;
  font: inherit;
  font-size: 0.8125rem;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.form-field textarea {
  resize: vertical;
}

.form-field input:focus,
.form-field textarea:focus {
  border-color: #31daf6;
  box-shadow: 0 0 0 2px rgba(49, 218, 246, 0.13);
}

.form-field input::placeholder,
.form-field textarea::placeholder {
  color: #62758c;
}

.error-message {
  margin: 0;
  padding: 0.75rem 0.875rem;
  border: 1px solid rgba(255, 94, 119, 0.5);
  border-radius: 0.375rem;
  background: rgba(103, 20, 38, 0.18);
  color: #ff9caf;
  font-size: 0.75rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.25rem;
}

.primary-button,
.secondary-button {
  min-width: 8rem;
  min-height: 2.75rem;
  padding: 0.625rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.primary-button {
  border: 1px solid rgba(126, 231, 255, 0.55);
  background: linear-gradient(110deg, #08bfde, #397ff0);
  box-shadow: 0 0 1rem rgba(27, 190, 255, 0.25);
  color: #ffffff;
}

.secondary-button {
  border: 1px solid #31506c;
  background: rgba(6, 20, 36, 0.85);
  color: #adbed1;
}

.primary-button:hover:not(:disabled),
.primary-button:focus-visible,
.secondary-button:hover:not(:disabled),
.secondary-button:focus-visible,
.close-button:hover:not(:disabled),
.close-button:focus-visible {
  border-color: #4be6ff;
  outline: none;
  box-shadow: 0 0 1rem rgba(51, 228, 255, 0.18);
}

.primary-button:disabled,
.secondary-button:disabled,
.close-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.success-panel {
  display: grid;
  justify-items: center;
  text-align: center;
}

.success-label {
  color: #4de6ff;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.625rem;
  letter-spacing: 0.13em;
}

.success-panel h3 {
  margin: 0.625rem 0 1.5rem;
  color: #ecf8ff;
  font-size: 1.25rem;
  font-weight: 400;
}

.success-panel p {
  margin: 0 0 0.5rem;
  color: #879bb2;
  font-size: 0.75rem;
}

.created-invite-code {
  display: flex;
  gap: 0.625rem;
}

.success-panel strong {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.25rem;
  border: 1px solid rgba(65, 220, 249, 0.55);
  border-radius: 0.375rem;
  background: rgba(6, 34, 53, 0.82);
  color: #91efff;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1.75rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-shadow: 0 0 1rem rgba(29, 217, 255, 0.35);
}

.copy-button {
  padding: 0.625rem 0.875rem;
  border: 1px solid rgba(91, 222, 255, 0.48);
  border-radius: 0.375rem;
  background: linear-gradient(110deg, rgba(8, 105, 158, 0.94), rgba(20, 145, 177, 0.9));
  color: #e5faff;
  font-size: 0.6875rem;
}

.copy-button:hover:not(:disabled),
.copy-button:focus-visible {
  border-color: #44e5ff;
  outline: none;
  box-shadow: 0 0 0.875rem rgba(51, 228, 255, 0.18);
}

.copy-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.copy-feedback {
  margin-top: 0.625rem;
  color: #67e8ff;
  font-size: 0.6875rem;
}

.copy-feedback--error {
  color: #ff9caf;
}

.success-panel small {
  margin: 0.875rem 0 1.5rem;
  color: #8497ad;
  font-size: 0.6875rem;
}

@media (max-width: 32.5rem) {
  .dialog-backdrop {
    align-items: end;
    padding: 0;
  }

  .create-dialog {
    max-height: calc(100vh - 1rem);
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 0.75rem 0.75rem 0 0;
  }

  .dialog-heading,
  .create-form,
  .success-panel {
    padding: 1.25rem;
  }

  .form-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .primary-button,
  .secondary-button {
    min-width: 0;
  }

  .created-invite-code {
    display: grid;
    width: 100%;
  }

  .created-invite-code strong {
    justify-content: center;
  }
}
</style>
