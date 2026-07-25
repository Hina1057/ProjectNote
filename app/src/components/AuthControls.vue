<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Unsubscribe,
  type User,
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '@/firebase'
import UiIcon from '@/components/UiIcon.vue'

const user = ref<User | null>(null)
const isAuthReady = ref(false)
const isProcessing = ref(false)
let unsubscribe: Unsubscribe | undefined

const showAuthError = (message: string, error?: unknown) => {
  if (error) {
    console.error(error)
  }

  window.alert(message)
}

const loginWithGoogle = async () => {
  if (!isFirebaseConfigured) {
    showAuthError('Firebaseの設定値を確認してください。')
    return
  }

  isProcessing.value = true

  try {
    await signInWithPopup(auth, googleProvider)
  } catch (error) {
    showAuthError('Googleログインに失敗しました。', error)
  } finally {
    isProcessing.value = false
  }
}

const logout = async () => {
  isProcessing.value = true

  try {
    await signOut(auth)
  } catch (error) {
    showAuthError('ログアウトに失敗しました。', error)
  } finally {
    isProcessing.value = false
  }
}

onMounted(() => {
  if (!isFirebaseConfigured) {
    isAuthReady.value = true
    return
  }

  unsubscribe = onAuthStateChanged(
    auth,
    (currentUser) => {
      user.value = currentUser
      isAuthReady.value = true
    },
    (error) => {
      isAuthReady.value = true
      showAuthError('ログイン状態の確認に失敗しました。', error)
    },
  )
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <div class="auth-controls">
    <div v-if="user" class="auth-user">
      <div class="auth-profile">
        <img
          v-if="user.photoURL"
          class="auth-avatar"
          :src="user.photoURL"
          :alt="`${user.displayName ?? 'ユーザー'}のアイコン`"
          referrerpolicy="no-referrer"
        />
        <span v-else class="auth-avatar auth-avatar--fallback" aria-hidden="true">
          {{ (user.displayName ?? user.email ?? 'U').charAt(0).toUpperCase() }}
        </span>

        <div class="auth-user-details">
          <strong>{{ user.displayName ?? 'Googleユーザー' }}</strong>
          <span>{{ user.email ?? 'メールアドレスなし' }}</span>
        </div>
      </div>

      <button type="button" :disabled="isProcessing" @click="logout">
        <UiIcon name="logout" />
        {{ isProcessing ? '処理中...' : 'ログアウト' }}
      </button>
    </div>

    <div v-else class="login-screen">
      <section class="login-panel ui-flow-frame" aria-labelledby="login-title">
        <span class="login-mark"><UiIcon name="brand" /></span>
        <h1 id="login-title">ProjectNote</h1>
        <p class="login-subtitle">Collaborative Workspace</p>
        <strong>アイデアを整理し、チームで育てる。</strong>
        <p class="login-description">
          アイデアとプロジェクトノートを、チームで育てるためのワークスペースです。
        </p>
        <button
          class="google-login-button"
          type="button"
          :disabled="!isAuthReady || isProcessing"
          @click="loginWithGoogle"
        >
          <span aria-hidden="true">G</span>
          {{ isProcessing ? 'ログイン中...' : 'Googleでログイン' }}
        </button>
        <small>Googleによる安全な認証を使用しています</small>
      </section>
    </div>
  </div>
</template>

<style scoped>
.auth-controls {
  padding: 0.75rem;
  border: 1px solid #1c334d;
  border-radius: 0.375rem;
  background: rgba(9, 25, 43, 0.9);
  box-shadow:
    inset 0 1px 0 rgba(106, 221, 255, 0.06),
    0 0.75rem 1.75rem rgba(0, 0, 0, 0.18);
}

.auth-user {
  display: grid;
  gap: 0.75rem;
}

.auth-profile {
  display: flex;
  gap: 0.625rem;
  align-items: center;
  min-width: 0;
}

.auth-avatar {
  flex: 0 0 auto;
  width: 2rem;
  height: 2rem;
  border: 1px solid rgba(91, 222, 255, 0.55);
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 0.75rem rgba(29, 217, 255, 0.18);
}

.auth-avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0b81c9, #35d6ec);
  color: #04111e;
  font-size: 0.75rem;
  font-weight: 700;
}

.auth-user-details {
  display: grid;
  min-width: 0;
}

.auth-user-details strong,
.auth-user-details span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.auth-user-details strong {
  color: #dceafa;
  font-size: 0.75rem;
  font-weight: 500;
}

.auth-user-details span {
  margin-top: 0.125rem;
  color: #7f93aa;
  font-size: 0.625rem;
}

button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 2.25rem;
  padding: 0.5rem 0.625rem;
  border: 1px solid #2c506e;
  border-radius: 0.3125rem;
  background: rgba(7, 21, 37, 0.92);
  color: #bfd0e2;
  font: inherit;
  font-size: 0.6875rem;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease;
}

button:hover:not(:disabled),
button:focus-visible {
  border-color: #33e4ff;
  color: #ffffff;
  outline: none;
  box-shadow: 0 0 0.875rem rgba(51, 228, 255, 0.15);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.google-login-button {
  gap: 0.5rem;
  min-height: 2.75rem;
  border-color: rgba(91, 222, 255, 0.48);
  background: linear-gradient(110deg, rgba(8, 78, 126, 0.95), rgba(16, 142, 173, 0.9));
  color: #e5faff;
  font-weight: 500;
}

.google-login-button span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: #ffffff;
  color: #3277d5;
  font-weight: 700;
}
</style>
