<script setup lang="ts">
import { RouterLink } from 'vue-router'

import NoteListPanel from '@/components/NoteListPanel.vue'
import PageHeader from '@/components/PageHeader.vue'
import UiIcon from '@/components/UiIcon.vue'
import { useWorkspaceNotes } from '@/composables/useWorkspaceNotes'

const {
  selectedWorkspaceId,
  projects,
  isLoading,
  errorMessage,
  statusUpdateError,
  updatingProjectIds,
  updateProjectStatus,
} = useWorkspaceNotes()
</script>

<template>
  <main class="home-view notes-view">
    <PageHeader eyebrow="プロジェクトノート" title="ノート">
      <template #actions>
        <RouterLink
          v-if="selectedWorkspaceId"
          :to="{ name: 'new-project' }"
          class="new-project-link"
        >
          <UiIcon name="add-note" :size="19" />
          新規ノート
        </RouterLink>
      </template>
    </PageHeader>

    <NoteListPanel
      :projects="projects"
      :selected-workspace-id="selectedWorkspaceId"
      :is-loading="isLoading"
      :error-message="errorMessage"
      :status-update-error="statusUpdateError"
      :updating-project-ids="updatingProjectIds"
      @status-change="updateProjectStatus"
    />
  </main>
</template>
