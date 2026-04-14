<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
    <div
      v-for="i in count"
      :key="i"
      class="animate-pulse"
      :class="variant === 'artist' ? 'flex flex-col items-center gap-2' : ''"
    >
      <div
        class="w-full aspect-square bg-white/[0.06]"
        :class="variant === 'artist' ? 'rounded-full' : 'rounded-xl'"
      />
      <div class="h-3.5 bg-white/[0.06] rounded w-3/4" :class="variant === 'album' ? 'mt-2.5' : ''" />
      <div class="h-3 bg-white/[0.04] rounded w-1/2" :class="variant === 'album' ? 'mt-1.5' : ''" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  count?: number
  variant?: 'album' | 'artist'
}>(), {
  count: 18,
  variant: 'album',
})
</script>
