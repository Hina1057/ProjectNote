<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { onAuthStateChanged, type Unsubscribe, type User } from 'firebase/auth'
import { auth, isFirebaseConfigured } from '@/firebase'
import UiIcon from '@/components/UiIcon.vue'
import { createActivity } from '@/services/activityService'
import {
  joinProjectByInviteCode,
  normalizeInviteCode,
  type JoinProjectResult,
} from '@/services/projectMembershipService'

const user = ref<User | null>(null)
const isOpen = ref(false)
const inviteCode = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
let unsubscribe: Unsubscribe | undefined
let successMessageTimeout: number | undefined

const clearSuccessMessage = () => {
  successMessage.value = ''

  if (successMessageTimeout !== undefined) {
    window.clearTimeout(successMessageTimeout)
    successMessageTimeout = undefined
  }
}

const resetForm = () => {
  inviteCode.value = ''
  errorMessage.value = ''
}

const openDialog = () => {
  resetForm()
  clearSuccessMessage()
  isOpen.value = true
}

const closeDialog = () => {
  if (isSubmitting.value) {
    return
  }

  isOpen.value = false
  resetForm()
}

const updateInviteCode = (event: Event) => {
  const input = event.target as HTMLInputElement
  const normalizedCode = normalizeInviteCode(input.value).slice(0, 6)
  inviteCode.value = normalizedCode
  input.value = normalizedCode
}

const getJoinErrorMessage = (result: JoinProjectResult): string => {
  switch (result.status) {
    case 'invalid-code':
      return '参加コードは英大文字と数字の6文字で入力してください。'
    case 'not-found':
      return '参加コードが見つかりません'
    case 'duplicate-code':
      return '同じ参加コードを持つプロジェクトが複数あります'
    case 'already-member':
      return 'すでに参加しています'
    case 'host-project':
      return 'ホストは自分のプロジェクトへ再参加できません。'
    case 'joined':
      return ''
  }
}

const joinProject = async () => {
  if (isSubmitting.value) {
    return
  }

  const currentUser = user.value
  const normalizedCode = normalizeInviteCode(inviteCode.value)
  inviteCode.value = normalizedCode
  errorMessage.value = ''

  if (!currentUser) {
    errorMessage.value = 'プロジェクトへ参加するにはログインしてください。'
    return
  }

  if (normalizedCode.length !== 6) {
    errorMessage.value = '参加コードは6文字で入力してください。'
    return
  }

  isSubmitting.value = true

  try {
    const result = await joinProjectByInviteCode(currentUser, normalizedCode)

    if (user.value?.uid !== currentUser.uid) {
      return
    }

    if (result.status !== 'joined') {
      errorMessage.value = getJoinErrorMessage(result)
      return
    }

    await createActivity({
      workspaceId: result.projectId,
      type: 'workspace_joined',
      user: currentUser,
      targetId: result.projectId,
      targetTitle: result.projectName,
      message: 'プロジェクトに参加しました',
    })

    inviteCode.value = ''
    isOpen.value = false
    successMessage.value = `${result.projectName}に参加しました`
    successMessageTimeout = window.setTimeout(() => {
      successMessage.value = ''
      successMessageTimeout = undefined
    }, 4000)
  } catch (error) {
    console.error(error)
    errorMessage.value =
      'プロジェクトへの参加に失敗しました。時間をおいてもう一度お試しください。'
  } finally {
    isSubmitting.value = false
  }
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) {
    closeDialog()
  }
}

onMounted(() => {
  if (!isFirebaseConfigured) {
    return
  }

  unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser
    isOpen.value = false
    isSubmitting.value = false
    resetForm()
    clearSuccessMessage()
  })

  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  unsubscribe?.()
  clearSuccessMessage()
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div v-if="user" class="project-join-panel">
    <button class="open-button" type="button" @click="openDialog">
      <UiIcon name="join" />
      プロジェクトに参加
    </button>

    <p v-if="successMessage" class="success-toast" role="status" aria-live="polite">
      {{ successMessage }}
    </p>

    <Teleport to="body">
      <div v-if="isOpen" class="app-shell app-modal-root">
        <div class="dialog-backdrop" @click.self="closeDialog">
          <section
            class="join-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-project-title"
          >
            <div class="dialog-heading">
              <div>
                <p>共有プロジェクトへ参加</p>
                <h2 id="join-project-title">プロジェクトに参加</h2>
              </div>
              <button
                class="close-button"
                type="button"
                aria-label="参加画面を閉じる"
                :disabled="isSubmitting"
                @click="closeDialog"
              >
                <UiIcon name="close" />
              </button>
            </div>

            <form class="join-form" :aria-busy="isSubmitting" @submit.prevent="joinProject">
              <div class="form-field">
                <label for="project-invite-code">参加コード</label>
                <div class="code-input-wrap">
                  <input
                    id="project-invite-code"
                    :value="inviteCode"
                    type="text"
                    autocomplete="off"
                    autocapitalize="characters"
                    spellcheck="false"
                    placeholder="ABC234"
                    aria-describedby="invite-code-help"
                    autofocus
                    @input="updateInviteCode"
                  />
                  <span>{{ inviteCode.length }}/6</span>
                </div>
                <small id="invite-code-help">共有された6文字の参加コードを入力してください。</small>
              </div>

              <p v-if="errorMessage" class="error-message" role="alert" aria-live="assertive">
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
                  {{ isSubmitting ? '参加処理中...' : '参加する' }}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.open-button,
.close-button,
.primary-button,
.secondary-button {
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
  border: 1px solid rgba(91, 222, 255, 0.4);
  border-radius: 0.375rem;
  background: rgba(7, 34, 55, 0.92);
  box-shadow: inset 0 1px 0 rgba(106, 221, 255, 0.06);
  color: #bfeef7;
  font-size: 0.75rem;
  font-weight: 500;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.open-button span {
  color: #62e8ff;
  font-size: 0.9375rem;
}

.open-button:hover,
.open-button:focus-visible {
  border-color: #33e4ff;
  outline: none;
  box-shadow: 0 0 1rem rgba(51, 228, 255, 0.18);
  transform: translateY(-1px);
}

.success-toast {
  position: fixed;
  z-index: 90;
  top: 5.5rem;
  right: 1.5rem;
  max-width: min(24rem, calc(100vw - 2rem));
  margin: 0;
  padding: 0.875rem 1rem;
  border: 1px solid rgba(62, 222, 170, 0.56);
  border-radius: 0.375rem;
  background: rgba(7, 48, 50, 0.96);
  box-shadow: 0 0.75rem 2rem rgba(0, 0, 0, 0.32);
  color: #9bf8d4;
  font-size: 0.75rem;
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

.join-dialog {
  width: min(100%, 32rem);
  overflow: hidden;
  border: 1px solid rgba(64, 154, 196, 0.62);
  border-radius: 0.625rem;
  background: linear-gradient(145deg, rgba(16, 40, 66, 0.99), rgba(5, 17, 32, 0.99));
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

.join-form {
  display: grid;
  gap: 1.25rem;
  padding: 1.5rem;
}

.form-field {
  display: grid;
  gap: 0.5rem;
}

.form-field label {
  color: #bccbdd;
  font-size: 0.75rem;
  font-weight: 500;
}

.code-input-wrap {
  position: relative;
}

.code-input-wrap input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.875rem 3.5rem 0.875rem 1rem;
  border: 1px solid #2b4a68;
  border-radius: 0.375rem;
  outline: none;
  background: rgba(4, 15, 28, 0.9);
  color: #91efff;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1.125rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.code-input-wrap input:focus {
  border-color: #31daf6;
  box-shadow: 0 0 0 2px rgba(49, 218, 246, 0.13);
}

.code-input-wrap input::placeholder {
  color: #526980;
}

.code-input-wrap span {
  position: absolute;
  top: 50%;
  right: 0.875rem;
  color: #70869d;
  font-size: 0.625rem;
  transform: translateY(-50%);
}

.form-field small {
  color: #71869d;
  font-size: 0.6875rem;
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

@media (max-width: 32.5rem) {
  .dialog-backdrop {
    align-items: end;
    padding: 0;
  }

  .join-dialog {
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 0.75rem 0.75rem 0 0;
  }

  .dialog-heading,
  .join-form {
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

  .success-toast {
    top: 5.25rem;
    right: 1rem;
    left: 1rem;
  }
}
</style>
