<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AIMessage from '@/components/AIMessage.vue'
import PageHeader from '@/components/PageHeader.vue'
import UiIcon from '@/components/UiIcon.vue'
import { useWorkspaceContext } from '@/composables/useWorkspaceContext'
import { requestAssistantAnswer } from '@/services/assistantService'
import { buildAssistantPrompt } from '@/services/promptBuilder'
import type { AssistantMessage } from '@/types/assistant'

const starterPrompts = [
  'このプロジェクトを要約して',
  '現在の進捗は？',
  'Todoは何件？',
  '最近何が更新された？',
  '優先度Highのタスクは？',
]

const {
  selectedWorkspaceId,
  user,
  isAuthReady,
  context,
  isLoading,
  errorMessage: contextError,
  refreshNotes,
} = useWorkspaceContext()
const messages = ref<AssistantMessage[]>([])
const input = ref('')
const isThinking = ref(false)
const requestError = ref('')
const chatHistory = ref<HTMLElement | null>(null)
let requestController: AbortController | null = null
let requestVersion = 0

const scrollToLatest = async () => {
  await nextTick()
  chatHistory.value?.scrollTo({
    top: chatHistory.value.scrollHeight,
    behavior: 'smooth',
  })
}

const createMessage = (
  role: AssistantMessage['role'],
  content: string,
): AssistantMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role,
  content,
})

const sendMessage = async (starter?: string) => {
  const question = (starter ?? input.value).trim()

  if (!isAuthReady.value || !user.value) {
    requestError.value = 'ログインしてください。'
    return
  }

  if (!selectedWorkspaceId.value) {
    requestError.value = 'プロジェクトを選択してください。'
    return
  }

  if (!question || isThinking.value) {
    return
  }

  const currentWorkspaceId = selectedWorkspaceId.value
  const currentVersion = ++requestVersion
  const history = [...messages.value]
  messages.value.push(createMessage('user', question))
  input.value = ''
  requestError.value = ''
  isThinking.value = true
  const controller = new AbortController()
  requestController = controller
  await scrollToLatest()

  try {
    const notesReady = await refreshNotes()

    if (!notesReady || !context.value) {
      throw new Error(contextError.value || 'Workspace情報を読み込めませんでした。')
    }

    const prompt = buildAssistantPrompt(context.value, question, history)
    const answer = await requestAssistantAnswer(prompt, controller.signal)

    if (
      currentVersion !== requestVersion ||
      currentWorkspaceId !== selectedWorkspaceId.value
    ) {
      return
    }

    messages.value.push(createMessage('assistant', answer))
    await scrollToLatest()
  } catch (error) {
    if (controller.signal.aborted) {
      return
    }

    console.error(error)
    requestError.value =
      error instanceof Error ? error.message : 'AIとの通信に失敗しました。'
  } finally {
    if (currentVersion === requestVersion) {
      isThinking.value = false
      requestController = null
    }
  }
}

const handleEnter = (event: KeyboardEvent) => {
  if (!event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void sendMessage()
  }
}

const resetConversation = () => {
  requestVersion += 1
  requestController?.abort()
  requestController = null
  messages.value = []
  input.value = ''
  requestError.value = ''
  isThinking.value = false
}

watch(selectedWorkspaceId, resetConversation)

onBeforeUnmount(() => {
  requestController?.abort()
})
</script>

<template>
  <main class="home-view assistant-view">
    <PageHeader eyebrow="Workspace AI" title="AIアシスタント" />

    <section class="assistant-shell ui-flow-frame" aria-labelledby="assistant-heading">
      <header class="assistant-shell__header">
        <span class="assistant-shell__mark" aria-hidden="true">
          <UiIcon name="sparkles" />
        </span>
        <div>
          <h2 id="assistant-heading">選択中プロジェクトについて質問</h2>
          <p>ノート・タスク・メンバー・最近の活動をもとに回答します。</p>
        </div>
      </header>

      <div
        v-if="!isAuthReady"
        class="assistant-state"
        role="status"
        aria-live="polite"
      >
        <span class="ui-spinner" aria-hidden="true" />
        ログイン状態を確認しています
      </div>
      <div v-else-if="!user" class="assistant-state" role="status">
        ログインしてください
      </div>
      <div v-else-if="!selectedWorkspaceId" class="assistant-state" role="status">
        プロジェクトを選択してください
      </div>
      <div
        v-else-if="isLoading && !context"
        class="assistant-state"
        role="status"
        aria-live="polite"
      >
        <span class="ui-spinner" aria-hidden="true" />
        Workspace情報を読み込んでいます
      </div>
      <div v-else-if="contextError && !context" class="assistant-state assistant-state--error" role="alert">
        {{ contextError }}
      </div>

      <template v-else>
        <div ref="chatHistory" class="assistant-chat" aria-live="polite">
          <div v-if="messages.length === 0" class="assistant-welcome">
            <span class="assistant-welcome__icon" aria-hidden="true">
              <UiIcon name="sparkles" />
            </span>
            <h3>{{ context?.workspace.name }}について何でも聞いてください</h3>
            <p>質問例を選ぶか、下の入力欄から質問できます。</p>
            <div class="assistant-starters" aria-label="質問例">
              <button
                v-for="starter in starterPrompts"
                :key="starter"
                type="button"
                class="assistant-starter"
                :disabled="isThinking"
                @click="sendMessage(starter)"
              >
                {{ starter }}
                <UiIcon name="chevron" />
              </button>
            </div>
          </div>

          <AIMessage v-for="message in messages" :key="message.id" :message="message" />
          <article v-if="isThinking" class="assistant-thinking" role="status">
            <span class="ui-spinner" aria-hidden="true" />
            <span>考えています...</span>
          </article>
        </div>

        <p v-if="requestError" class="assistant-error" role="alert">
          <UiIcon name="alert" />
          {{ requestError }}
        </p>

        <form class="assistant-composer" @submit.prevent="sendMessage()">
          <label class="sr-only" for="assistant-question">AIへの質問</label>
          <textarea
            id="assistant-question"
            v-model="input"
            rows="2"
            placeholder="選択中のプロジェクトについて質問してください"
            :disabled="isThinking"
            @keydown.enter="handleEnter"
          />
          <button
            class="assistant-send"
            type="submit"
            aria-label="質問を送信"
            :disabled="isThinking || !input.trim()"
          >
            <UiIcon name="send" />
            <span>送信</span>
          </button>
        </form>
        <p class="assistant-disclaimer">
          AIは現在のWorkspaceデータのみを参照します。重要な内容は元データも確認してください。
        </p>
      </template>
    </section>
  </main>
</template>

<style scoped>
.assistant-view {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 100%;
}

.assistant-shell {
  display: grid;
  grid-template-rows: auto minmax(20rem, 1fr) auto auto;
  min-height: min(46rem, calc(100dvh - 11rem));
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: var(--shadow-md);
}

.assistant-shell__header {
  display: flex;
  gap: 0.85rem;
  align-items: center;
  padding: 1rem 1.2rem;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(110deg, #f0fbff, #ffffff);
}

.assistant-shell__mark,
.assistant-welcome__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 8px 18px rgba(34, 184, 240, 0.22);
  color: #ffffff;
}

.assistant-shell__mark {
  width: 2.6rem;
  height: 2.6rem;
}

.assistant-shell__mark :deep(.ui-icon),
.assistant-welcome__icon :deep(.ui-icon) {
  width: 1.2rem;
  height: 1.2rem;
}

.assistant-shell__header h2,
.assistant-welcome h3 {
  margin: 0;
  color: var(--color-text);
}

.assistant-shell__header h2 {
  font-size: 1rem;
}

.assistant-shell__header p,
.assistant-welcome p,
.assistant-disclaimer {
  margin: 0.2rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.78rem;
}

.assistant-chat {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
  padding: 1.25rem;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.assistant-welcome {
  width: min(43rem, 100%);
  margin: auto;
  padding: 1rem 0;
  text-align: center;
}

.assistant-welcome__icon {
  width: 3.25rem;
  height: 3.25rem;
  margin-bottom: 0.9rem;
}

.assistant-welcome h3 {
  font-size: clamp(1.1rem, 2vw, 1.45rem);
}

.assistant-starters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 1.25rem;
  text-align: left;
}

.assistant-starter {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  justify-content: space-between;
  min-height: 3.25rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.assistant-starter:hover:not(:disabled),
.assistant-starter:focus-visible {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}

.assistant-starter :deep(.ui-icon) {
  flex: 0 0 auto;
  width: 1rem;
  height: 1rem;
  color: var(--color-primary-dark);
}

.assistant-thinking {
  display: inline-flex;
  gap: 0.6rem;
  align-items: center;
  align-self: flex-start;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.assistant-state {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  justify-content: center;
  min-height: 24rem;
  padding: 2rem;
  color: var(--color-text-secondary);
  text-align: center;
}

.assistant-state--error,
.assistant-error {
  color: var(--color-error);
}

.assistant-error {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  margin: 0 1.25rem 0.75rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: var(--radius-sm);
  background: #fff4f4;
  font-size: 0.8rem;
}

.assistant-error :deep(.ui-icon) {
  flex: 0 0 auto;
  width: 1rem;
  height: 1rem;
}

.assistant-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: end;
  margin: 0 1.25rem;
  padding: 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.assistant-composer:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(34, 184, 240, 0.15);
}

.assistant-composer textarea {
  min-height: 3.25rem;
  max-height: 10rem;
  padding: 0.65rem 0.7rem;
  resize: vertical;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  line-height: 1.55;
}

.assistant-composer textarea::placeholder {
  color: #9aabb6;
}

.assistant-send {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  justify-content: center;
  min-width: 6rem;
  min-height: 2.75rem;
  padding: 0.65rem 1rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #ffffff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition:
    background var(--transition-fast),
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.assistant-send:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.assistant-send:active:not(:disabled) {
  transform: scale(0.98);
}

.assistant-send:focus-visible {
  outline: 3px solid rgba(34, 184, 240, 0.24);
  outline-offset: 2px;
}

.assistant-send:disabled,
.assistant-starter:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.assistant-send :deep(.ui-icon) {
  width: 1rem;
  height: 1rem;
}

.assistant-disclaimer {
  padding: 0.55rem 1.25rem 0.85rem;
  text-align: center;
}

.ui-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--color-primary-soft);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: assistant-spin 0.8s linear infinite;
}

@keyframes assistant-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 767px) {
  .assistant-shell {
    min-height: calc(100dvh - 9rem);
    border-radius: var(--radius-lg);
  }

  .assistant-shell__header,
  .assistant-chat {
    padding: 0.9rem;
  }

  .assistant-starters {
    grid-template-columns: 1fr;
  }

  .assistant-composer {
    grid-template-columns: minmax(0, 1fr);
    margin: 0 0.9rem;
  }

  .assistant-send {
    width: 100%;
  }

  .assistant-disclaimer {
    padding-inline: 0.9rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-spinner {
    animation: none;
  }

  .assistant-chat {
    scroll-behavior: auto;
  }

  .assistant-starter,
  .assistant-send {
    transition: none;
  }
}
</style>
