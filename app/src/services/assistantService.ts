const ASSISTANT_API_URL = 'http://localhost:5173/assistant'

interface AssistantResponse {
  answer?: string
  code?: string
  message?: string
}

export class AssistantServiceError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AssistantServiceError'
    this.code = code
  }
}

export const requestAssistantAnswer = async (
  input: string,
  signal?: AbortSignal,
): Promise<string> => {
  try {
    const response = await fetch(ASSISTANT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
      signal,
    })
    const data = (await response.json()) as AssistantResponse

    if (!response.ok) {
      throw new AssistantServiceError(
        data.code ?? 'request_failed',
        data.message ??
          (response.status === 503
            ? 'OpenAI APIキーが設定されていません。'
            : 'AIとの通信に失敗しました。'),
      )
    }

    if (!data.answer?.trim()) {
      throw new AssistantServiceError('empty_response', 'AIから回答を取得できませんでした。')
    }

    return data.answer.trim()
  } catch (error) {
    if (error instanceof AssistantServiceError || error instanceof DOMException) {
      throw error
    }

    console.error(error)
    throw new AssistantServiceError('network_error', 'AIとの通信に失敗しました。')
  }
}
