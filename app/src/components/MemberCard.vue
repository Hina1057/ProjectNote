<script setup lang="ts">
import { computed } from 'vue'

export interface WorkspaceMember {
  id: string
  displayName: string
  email: string
  role: 'host' | 'member'
  joinedAt: string | null
}

const props = defineProps<{
  member: WorkspaceMember
}>()

const initial = computed(() => {
  const source = props.member.displayName.trim() || props.member.email.trim()
  return Array.from(source)[0]?.toLocaleUpperCase() ?? '?'
})

const joinedDate = computed(() => {
  if (!props.member.joinedAt) {
    return '—'
  }

  const date = new Date(props.member.joinedAt)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
})
</script>

<template>
  <article class="member-card">
    <div class="member-card__avatar" aria-hidden="true">{{ initial }}</div>

    <div class="member-card__identity">
      <div class="member-card__heading">
        <h2>{{ member.displayName || '名前未設定' }}</h2>
        <span class="member-role" :class="`member-role--${member.role}`">
          {{ member.role === 'host' ? 'Host' : 'Member' }}
        </span>
      </div>
      <p :title="member.email">{{ member.email || 'メールアドレス未設定' }}</p>
    </div>

    <dl class="member-card__meta">
      <div>
        <dt>参加日</dt>
        <dd>
          <time :datetime="member.joinedAt || undefined">{{ joinedDate }}</time>
        </dd>
      </div>
    </dl>
  </article>
</template>

<style scoped>
.member-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1rem;
  min-width: 0;
  padding: 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-normal),
    transform var(--transition-fast);
}

.member-card:hover {
  border-color: rgba(34, 184, 240, 0.4);
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}

.member-card__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.25rem;
  height: 3.25rem;
  border: 1px solid rgba(34, 184, 240, 0.3);
  border-radius: 50%;
  background: linear-gradient(145deg, var(--color-primary-soft), #edfaff);
  color: var(--color-primary-dark);
  font-size: 1.15rem;
  font-weight: 800;
}

.member-card__identity {
  min-width: 0;
}

.member-card__heading {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  justify-content: space-between;
}

.member-card h2,
.member-card p,
.member-card dl,
.member-card dd {
  margin: 0;
}

.member-card h2 {
  overflow: hidden;
  color: var(--color-text);
  font-size: 1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-card__identity > p {
  overflow: hidden;
  margin-top: 0.35rem;
  color: var(--color-text-secondary);
  font-size: 0.76rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-role {
  flex: 0 0 auto;
  padding: 0.28rem 0.55rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.member-role--host {
  border-color: rgba(34, 184, 240, 0.35);
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.member-role--member {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.member-card__meta {
  grid-column: 2;
  padding-top: 0.85rem;
  border-top: 1px solid var(--color-border);
}

.member-card__meta dt {
  color: var(--color-text-secondary);
  font-size: 0.62rem;
  font-weight: 700;
}

.member-card__meta dd {
  margin-top: 0.18rem;
  color: var(--color-text);
  font-size: 0.76rem;
  font-weight: 650;
}

@media (prefers-reduced-motion: reduce) {
  .member-card {
    transition: none;
  }

  .member-card:hover {
    transform: none;
  }
}
</style>
