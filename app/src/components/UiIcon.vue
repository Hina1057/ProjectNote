<script setup lang="ts">
defineProps<{
  name: string
}>()
</script>

<template>
  <svg
    class="ui-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="name === 'brand' || name === 'note'">
      <path d="M6 3.5h8l4 4V20.5H6z" />
      <path d="M14 3.5v4h4M9 12h6M9 16h6" />
    </template>
    <template v-else-if="name === 'grid'">
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" />
      <rect x="14" y="14" width="6.5" height="6.5" rx="1" />
    </template>
    <template v-else-if="name === 'folder'">
      <path d="M3.5 6.5h6l2 2h9v10h-17z" />
      <path d="M3.5 9h17" />
    </template>
    <template v-else-if="name === 'folder-add'">
      <path d="M3.5 6.5h6l2 2h9v10h-17z" />
      <path d="M3.5 9h17M12 11.5v5M9.5 14h5" />
    </template>
    <template v-else-if="name === 'task'">
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 3.5v3h6v-3M8.5 11h7M8.5 15h5" />
    </template>
    <template v-else-if="name === 'task-add'">
      <rect x="4" y="3.5" width="13" height="17" rx="2" />
      <path d="M8 3.5v3h5v-3M7.5 11h5M7.5 15h3M19 12v7M15.5 15.5h7" />
    </template>
    <template v-else-if="name === 'users'">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.5-3.5 2.4-5.5 5.5-5.5s5 2 5.5 5.5M16 5.5a3 3 0 0 1 0 5.8M16 14c2.6.4 4 2.1 4.5 5" />
    </template>
    <template v-else-if="name === 'user-add'">
      <circle cx="8.5" cy="8" r="3" />
      <path d="M3 19c.5-3.5 2.4-5.5 5.5-5.5s5 2 5.5 5.5M17.5 8v7M14 11.5h7" />
    </template>
    <template v-else-if="name === 'activity'">
      <path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5" />
      <path d="M4 4v4.5h4.5M12 7.5V12l3 2" />
    </template>
    <template v-else-if="name === 'sparkles'">
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2zM18.5 14l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7zM5.5 14.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 13.5v-3l-2-.7a7 7 0 0 0-.7-1.7l.9-1.9-2.1-2.1-1.9.9a7 7 0 0 0-1.7-.7l-.7-2h-3l-.7 2a7 7 0 0 0-1.7.7l-1.9-.9-2.1 2.1.9 1.9a7 7 0 0 0-.7 1.7l-2 .7v3l2 .7c.2.6.4 1.2.7 1.7l-.9 1.9 2.1 2.1 1.9-.9c.5.3 1.1.5 1.7.7l.7 2h3l.7-2c.6-.2 1.2-.4 1.7-.7l1.9.9 2.1-2.1-.9-1.9c.3-.5.5-1.1.7-1.7z" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'join'">
      <path d="M14 5h5v14h-5M10 8l4 4-4 4M14 12H4" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </template>
    <template v-else-if="name === 'copy'">
      <rect x="8" y="8" width="11" height="12" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3" />
    </template>
    <template v-else-if="name === 'logout'">
      <path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" />
    </template>
    <template v-else-if="name === 'user'">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c.7-4.5 3.2-7 7.5-7s6.8 2.5 7.5 7" />
    </template>
    <template v-else-if="name === 'tag'">
      <path d="M4 4h7l9 9-7 7-9-9z" />
      <circle cx="8" cy="8" r="1" />
    </template>
    <template v-else-if="name === 'status' || name === 'check'">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16.5 8.5" />
    </template>
    <template v-else-if="name === 'bell'">
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2 6 2 8H4c0-2 2-2 2-8M10 20h4" />
    </template>
    <template v-else-if="name === 'menu'">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="m5 5 14 14M19 5 5 19" />
    </template>
    <template v-else-if="name === 'alert'">
      <path d="M12 3 2.5 20h19zM12 9v4M12 17h.01" />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </template>
    <template v-else-if="name === 'chart'">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </template>
    <template v-else-if="name === 'edit'">
      <path d="M4 20h4l11-11-4-4L4 16zM13.5 6.5l4 4" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M4.5 7h15M9 3.5h6L16 7H8zM7 7l1 13h8l1-13M10 10v6M14 10v6" />
    </template>
    <template v-else-if="name === 'eye'">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6" />
      <circle cx="12" cy="12" r="2.5" />
    </template>
    <template v-else-if="name === 'chevron'">
      <path d="m9 6 6 6-6 6" />
    </template>
    <template v-else-if="name === 'send'">
      <path d="m3 4 18 8-18 8 3-8zM6 12h15" />
    </template>
    <template v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="9" />
    </template>
  </svg>
</template>
