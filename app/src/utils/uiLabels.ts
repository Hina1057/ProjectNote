const statusLabels: Record<string, string> = {
  Todo: '未着手',
  'In Progress': '進行中',
  Review: '確認中',
  Done: '完了',
}

const categoryLabels: Record<string, string> = {
  Bug: 'バグ',
  Idea: 'アイデア',
  UI: 'UI',
  Task: 'タスク',
  Meeting: '会議',
  Reference: '資料',
}

const roleLabels: Record<string, string> = {
  host: 'ホスト',
  member: 'メンバー',
}

export const getStatusLabel = (status: string): string => statusLabels[status] ?? status

export const getCategoryLabel = (category: string): string =>
  categoryLabels[category] ?? category

export const getCategoryFilterLabel = (category: string): string =>
  category === 'All' ? 'すべて' : getCategoryLabel(category)

export const getRoleLabel = (role: string): string => roleLabels[role] ?? role
