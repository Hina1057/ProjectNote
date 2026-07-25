<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <div class="app-main">
      <RouterView />
    </div>
  </div>
</template>

<style>
:root {
  --color-bg: #f6fafd;
  --color-bg-secondary: #edf7fc;
  --color-surface: #ffffff;
  --color-surface-glass: rgba(255, 255, 255, 0.88);
  --color-primary: #22b8f0;
  --color-primary-hover: #089dd4;
  --color-primary-dark: #087ea4;
  --color-primary-soft: #cff3ff;
  --color-text: #17212b;
  --color-text-secondary: #667785;
  --color-border: #d7e9f2;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --radius-xl: 22px;
  --shadow-sm: 0 4px 14px rgba(31, 89, 117, 0.06);
  --shadow-md: 0 10px 30px rgba(31, 89, 117, 0.09);
  --shadow-hover: 0 16px 36px rgba(34, 184, 240, 0.14);
  --transition-fast: 180ms ease;
  --transition-normal: 240ms ease;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  color: var(--color-text);
  background: var(--color-bg);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 20rem;
  height: 100vh;
  margin: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 0%, rgba(207, 243, 255, 0.6), transparent 30rem),
    var(--color-bg);
}

button,
input,
select,
textarea {
  font: inherit;
}

button,
a {
  -webkit-tap-highlight-color: transparent;
}

.app-main {
  height: 100vh;
  min-width: 0;
  margin-left: 17rem;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

@media (max-width: 79.9375rem) {
  .app-main {
    margin-left: 14rem;
  }
}

@media (max-width: 47.9375rem) {
  .app-main {
    margin-left: 0;
  }
}
</style>
