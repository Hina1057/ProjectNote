<script setup lang="ts">
import ActivityTimeline from '@/components/ActivityTimeline.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useWorkspaceActivities } from '@/composables/useWorkspaceActivities'

const {
  selectedWorkspaceId,
  user,
  isAuthReady,
  activities,
  isLoading,
  errorMessage,
} = useWorkspaceActivities(50)
</script>

<template>
  <main class="home-view activity-view">
    <PageHeader eyebrow="共同ワークスペース" title="アクティビティ" />

    <section class="activity-page" aria-labelledby="activity-page-title">
      <header class="activity-page__heading">
        <div>
          <p>Workspace履歴</p>
          <h1 id="activity-page-title">アクティビティ</h1>
        </div>
        <span v-if="user && selectedWorkspaceId && !isLoading && !errorMessage">
          最新{{ activities.length }}件
        </span>
      </header>

      <p v-if="!isAuthReady" class="activity-state ui-notice ui-notice--loading" role="status">
        ログイン状態を確認しています
      </p>
      <p
        v-else-if="errorMessage && !user"
        class="activity-state ui-notice ui-notice--error"
        role="alert"
      >
        {{ errorMessage }}
      </p>
      <p v-else-if="!user" class="activity-state ui-notice ui-notice--empty" role="status">
        ログインしてください
      </p>
      <p
        v-else-if="!selectedWorkspaceId"
        class="activity-state ui-notice ui-notice--empty"
        role="status"
      >
        プロジェクトを選択してください
      </p>
      <p
        v-else-if="isLoading"
        class="activity-state ui-notice ui-notice--loading"
        role="status"
      >
        アクティビティを読み込んでいます
      </p>
      <p
        v-else-if="errorMessage"
        class="activity-state ui-notice ui-notice--error"
        role="alert"
      >
        {{ errorMessage }}
      </p>
      <p
        v-else-if="activities.length === 0"
        class="activity-state ui-notice ui-notice--empty"
        role="status"
      >
        まだアクティビティはありません
      </p>
      <ActivityTimeline v-else :activities="activities" aria-live="polite" />
    </section>
  </main>
</template>

<style scoped>
.activity-page {
  width: min(100%, 58rem);
  margin: 0 auto;
}

.activity-page__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.activity-page__heading p,
.activity-page__heading h1 {
  margin: 0;
}

.activity-page__heading p {
  color: var(--color-primary-dark);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.activity-page__heading h1 {
  margin-top: 0.25rem;
  color: var(--color-text);
  font-size: clamp(1.55rem, 3vw, 2.3rem);
  letter-spacing: -0.04em;
}

.activity-page__heading > span {
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  font-weight: 700;
}

.activity-state {
  min-height: 7rem;
}

@media (max-width: 47.9375rem) {
  .activity-page__heading {
    align-items: flex-start;
  }
}
</style>
