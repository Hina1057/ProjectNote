<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AuthControls from '@/components/AuthControls.vue'
import UiIcon from '@/components/UiIcon.vue'

const route = useRoute()
const activeSection = computed(() => {
  if (route.name === 'workspaces' || route.name === 'workspace-detail') {
    return 'projects'
  }

  if (
    route.name === 'notes' ||
    route.name === 'new-project' ||
    route.name === 'edit-project' ||
    route.name === 'project-detail'
  ) {
    return 'notes'
  }

  if (route.name === 'members') {
    return 'members'
  }

  if (route.name === 'activity') {
    return 'activity'
  }

  if (route.name === 'tasks') {
    return 'tasks'
  }

  if (route.name === 'assistant') {
    return 'assistant'
  }

  if (route.name === 'settings') {
    return 'settings'
  }

  return 'dashboard'
})
const isMobileOpen = ref(false)

const closeMobileNavigation = () => {
  isMobileOpen.value = false
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeMobileNavigation()
  }
}

watch(
  () => route.fullPath,
  () => closeMobileNavigation(),
)

onMounted(() => document.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => document.removeEventListener('keydown', handleEscape))
</script>

<template>
  <button
    class="mobile-nav-toggle"
    type="button"
    :aria-label="isMobileOpen ? 'メニューを閉じる' : 'メニューを開く'"
    :aria-expanded="isMobileOpen"
    aria-controls="app-sidebar"
    @click="isMobileOpen = !isMobileOpen"
  >
    <UiIcon :name="isMobileOpen ? 'close' : 'menu'" />
  </button>
  <button
    v-if="isMobileOpen"
    class="sidebar-backdrop"
    type="button"
    aria-label="メニューを閉じる"
    @click="closeMobileNavigation"
  />
  <aside
    id="app-sidebar"
    class="app-sidebar"
    :class="{ 'app-sidebar--open': isMobileOpen }"
    aria-label="メインナビゲーション"
  >
    <RouterLink class="app-brand" :to="{ name: 'dashboard' }">
      <span class="app-brand__mark"><UiIcon name="brand" /></span>
      <span>
        <strong>ProjectNote</strong>
        <small>Collaborative Workspace</small>
      </span>
    </RouterLink>

    <nav class="app-navigation">
      <RouterLink
        class="app-navigation__item"
        :class="{ 'app-navigation__item--active': activeSection === 'dashboard' }"
        :to="{ name: 'dashboard' }"
      >
        <UiIcon name="grid" />
        ダッシュボード
      </RouterLink>
      <RouterLink
        class="app-navigation__item"
        :class="{ 'app-navigation__item--active': activeSection === 'projects' }"
        :to="{ name: 'workspaces' }"
      >
        <UiIcon name="folder" />
        プロジェクト
      </RouterLink>
      <RouterLink
        class="app-navigation__item"
        :class="{ 'app-navigation__item--active': activeSection === 'notes' }"
        :to="{ name: 'notes' }"
      >
        <UiIcon name="note" />
        ノート
      </RouterLink>

      <RouterLink
        class="app-navigation__item"
        :class="{ 'app-navigation__item--active': activeSection === 'tasks' }"
        :to="{ name: 'tasks' }"
      >
        <UiIcon name="task" />
        タスク
      </RouterLink>
      <RouterLink
        class="app-navigation__item"
        :class="{ 'app-navigation__item--active': activeSection === 'members' }"
        :to="{ name: 'members' }"
      >
        <UiIcon name="users" />
        メンバー
      </RouterLink>
      <RouterLink
        class="app-navigation__item"
        :class="{ 'app-navigation__item--active': activeSection === 'activity' }"
        :to="{ name: 'activity' }"
      >
        <UiIcon name="activity" />
        アクティビティ
      </RouterLink>
      <RouterLink
        class="app-navigation__item"
        :class="{ 'app-navigation__item--active': activeSection === 'assistant' }"
        :to="{ name: 'assistant' }"
      >
        <UiIcon name="sparkles" />
        AIアシスタント
      </RouterLink>
      <RouterLink
        class="app-navigation__item"
        :class="{ 'app-navigation__item--active': activeSection === 'settings' }"
        :to="{ name: 'settings' }"
      >
        <UiIcon name="settings" />
        設定
      </RouterLink>
    </nav>

    <div class="app-sidebar__footer">
      <AuthControls />
    </div>
  </aside>
</template>

<style scoped>
.app-sidebar {
  position: fixed;
  z-index: 60;
  inset: 0 auto 0 0;
  display: flex;
  flex-direction: column;
  width: 17rem;
  padding: 1.5rem 1.25rem;
  overflow-y: auto;
  border-right: 1px solid var(--color-border);
  background: rgba(244, 249, 252, 0.96);
  box-shadow: 8px 0 30px rgba(31, 89, 117, 0.04);
  backdrop-filter: blur(20px);
}

.app-brand {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.25rem 0.25rem 1.5rem;
  color: var(--color-text);
  text-decoration: none;
}

.app-brand__mark {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 2.65rem;
  height: 2.65rem;
  border-radius: var(--radius-sm);
  background: linear-gradient(145deg, #38c7f6, var(--color-primary));
  box-shadow: 0 8px 18px rgba(34, 184, 240, 0.24);
  color: #ffffff;
  font-size: 1.25rem;
}

.app-brand > span:last-child {
  display: grid;
  min-width: 0;
}

.app-brand strong {
  color: #086d90;
  font-size: 1.35rem;
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.app-brand small {
  margin-top: 0.2rem;
  color: var(--color-text-secondary);
  font-size: 0.7rem;
}

.app-navigation {
  display: grid;
  gap: 0.3rem;
}

.app-navigation__item {
  position: relative;
  display: grid;
  grid-template-columns: 1.25rem minmax(0, 1fr) auto;
  gap: 0.7rem;
  align-items: center;
  min-height: 2.9rem;
  padding: 0.65rem 0.8rem;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: #43515d;
  font: inherit;
  font-size: 0.86rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast);
}

.app-navigation__item :deep(.ui-icon) {
  color: #536774;
  width: 1.15rem;
  height: 1.15rem;
}

.app-navigation__item small {
  padding: 0.15rem 0.35rem;
  border-radius: 999px;
  background: #e8f1f5;
  color: #8a9aa5;
  font-size: 0.52rem;
}

.app-navigation__item:hover:not(:disabled),
.app-navigation__item:focus-visible,
.app-navigation__item--active {
  border-color: rgba(34, 184, 240, 0.22);
  outline: none;
  background: linear-gradient(100deg, #d8f4ff, #eaf9ff);
  color: #08799f;
  transform: translateX(2px);
}

.app-navigation__item:hover:not(:disabled)::before,
.app-navigation__item:focus-visible::before,
.app-navigation__item--active::before {
  position: absolute;
  inset: 0.55rem auto 0.55rem 0;
  width: 3px;
  border-radius: 999px;
  background: var(--color-primary);
  content: '';
}

.app-navigation__item--active :deep(.ui-icon) {
  color: var(--color-primary-dark);
}

.app-navigation__item:disabled {
  cursor: default;
  opacity: 0.72;
}

.app-sidebar__footer {
  display: grid;
  gap: 0.85rem;
  margin-top: auto;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.mobile-nav-toggle,
.sidebar-backdrop {
  display: none;
}

@media (max-width: 79.9375rem) {
  .app-sidebar {
    width: 14rem;
    padding: 1.25rem 0.9rem;
  }

  .app-brand strong {
    font-size: 1.1rem;
  }

  .app-brand small {
    font-size: 0.61rem;
  }

  .app-navigation__item {
    gap: 0.55rem;
    padding-inline: 0.65rem;
    font-size: 0.78rem;
  }

  .app-navigation__item small {
    font-size: 0.48rem;
  }
}

@media (max-width: 47.9375rem) {
  .mobile-nav-toggle {
    position: fixed;
    z-index: 90;
    top: 0.75rem;
    left: 0.75rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    color: var(--color-primary-dark);
  }

  .sidebar-backdrop {
    position: fixed;
    z-index: 70;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: rgba(23, 33, 43, 0.32);
    backdrop-filter: blur(2px);
  }

  .app-sidebar {
    z-index: 80;
    width: min(86vw, 18rem);
    padding: 1.25rem 1rem;
    transform: translateX(-105%);
    transition: transform var(--transition-normal);
  }

  .app-sidebar--open {
    transform: translateX(0);
  }
}
</style>
