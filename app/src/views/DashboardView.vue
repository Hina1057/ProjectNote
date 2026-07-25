<script setup lang="ts">
import { RouterLink } from 'vue-router'
import DashboardOverview from '@/components/DashboardOverview.vue'
import PageHeader from '@/components/PageHeader.vue'
import SelectedWorkspaceOverview from '@/components/SelectedWorkspaceOverview.vue'
import UiIcon from '@/components/UiIcon.vue'
import { useWorkspaceNotes } from '@/composables/useWorkspaceNotes'

const { selectedWorkspaceId, projects, isLoading, errorMessage } = useWorkspaceNotes()
</script>

<template>
  <main class="home-view dashboard-view">
    <PageHeader eyebrow="共同ワークスペース" title="ダッシュボード" />
    <SelectedWorkspaceOverview />
    <RouterLink
      v-if="selectedWorkspaceId"
      class="dashboard-ai-card ui-flow-frame"
      :to="{ name: 'assistant' }"
    >
      <span class="dashboard-ai-card__icon" aria-hidden="true">
        <UiIcon name="sparkles" />
      </span>
      <span>
        <strong>AIに質問</strong>
        <small>選択中プロジェクトのノートやタスクについて確認できます</small>
      </span>
      <UiIcon class="dashboard-ai-card__chevron" name="chevron" />
    </RouterLink>
    <DashboardOverview
      v-if="selectedWorkspaceId"
      :projects="projects"
      :is-loading="isLoading"
      :error-message="errorMessage"
    />
  </main>
</template>

<style scoped>
.dashboard-ai-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.85rem;
  align-items: center;
  min-height: 5rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: var(--shadow-sm);
  color: var(--color-text);
  text-decoration: none;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.dashboard-ai-card:hover,
.dashboard-ai-card:focus-visible {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}

.dashboard-ai-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.7rem;
  height: 2.7rem;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
}

.dashboard-ai-card__icon :deep(.ui-icon) {
  width: 1.25rem;
  height: 1.25rem;
}

.dashboard-ai-card > span:nth-child(2) {
  display: grid;
  gap: 0.2rem;
}

.dashboard-ai-card small {
  color: var(--color-text-secondary);
}

.dashboard-ai-card__chevron {
  width: 1.1rem;
  height: 1.1rem;
  color: var(--color-primary-dark);
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-ai-card {
    transition: none;
  }
}
</style>
