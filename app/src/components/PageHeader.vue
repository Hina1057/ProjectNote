<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
}>()
</script>

<template>
  <header class="page-header">
    <div class="page-header__title">
      <span>{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
    </div>
    <slot name="actions"></slot>
  </header>
</template>
