<script setup lang="ts">
definePageMeta({
  middleware: ['csrf-client'],
  layout: false
})
</script>

<template>
  <NuxtPage />
</template>
