const toValidDate = (value?: string | null) => {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const pad = (value: number) => String(value).padStart(2, '0')

export const formatDate = (value?: string | null) => {
  const date = toValidDate(value)

  if (!date) {
    return '—'
  }

  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
}

export const formatDateTime = (value?: string | null) => {
  const date = toValidDate(value)

  if (!date) {
    return '—'
  }

  return `${formatDate(value)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const getDateTimestamp = (value?: string | null) => toValidDate(value)?.getTime() ?? null
