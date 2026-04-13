<template>
  <div class="flex flex-col items-center justify-center py-20">
    <div class="mb-6">
      <slot name="icon" />
    </div>
    <h2 class="font-semibold text-white/60 mb-2" :class="large ? 'text-xl' : 'text-lg'">{{ title }}</h2>
    <p v-if="description" class="text-sm text-white/30" :class="$slots.default ? 'mb-6' : ''">{{ description }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  large?: boolean
}>()
</script>
