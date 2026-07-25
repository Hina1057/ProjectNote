export type AssistantMessageRole = 'user' | 'assistant'

export interface AssistantMessage {
  id: string
  role: AssistantMessageRole
  content: string
}

export interface WorkspaceAIContext {
  workspace: {
    id: string
    name: string
    description: string
  }
  members: Array<{
    displayName: string
    role: string
  }>
  notes: Array<{
    id: number
    title: string
    content: string
  }>
  tasks: Array<{
    id: string
    title: string
    description: string
    status: string
    priority: string
  }>
  activities: Array<{
    id: string
    displayName: string
    type: string
    message: string
    createdAt: string | null
  }>
}
