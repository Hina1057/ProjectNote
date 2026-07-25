<script setup lang="ts">
import JoinedProjectsPanel from '@/components/JoinedProjectsPanel.vue'
import PageHeader from '@/components/PageHeader.vue'
import ProjectCreatePanel from '@/components/ProjectCreatePanel.vue'
import ProjectJoinPanel from '@/components/ProjectJoinPanel.vue'
</script>

<template>
  <main class="home-view projects-view">
    <PageHeader eyebrow="共同ワークスペース" title="プロジェクト" />
    <section class="workspace-management-actions" aria-label="プロジェクト操作">
      <ProjectCreatePanel />
      <ProjectJoinPanel />
    </section>
    <JoinedProjectsPanel />
  </main>
</template>

<style scoped>
.workspace-management-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.workspace-management-actions :deep(.project-create-panel),
.workspace-management-actions :deep(.project-join-panel) {
  min-width: 0;
}

@media (max-width: 767px) {
  .workspace-management-actions {
    grid-template-columns: 1fr;
  }
}
</style>
