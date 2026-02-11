<template>
  <div class="w-full h-full relative bg-white/[0.04]">
    <!-- 4-cover collage -->
    <template v-if="covers.length >= 4">
      <div class="grid grid-cols-2 grid-rows-2 w-full h-full">
        <img v-for="(cover, i) in covers.slice(0, 4)" :key="i" :src="cover" class="w-full h-full object-cover" loading="lazy" />
      </div>
    </template>

    <!-- Single or few covers -->
    <template v-else-if="covers.length > 0">
      <img :src="covers[0]" class="w-full h-full object-cover" loading="lazy" />
    </template>

    <!-- Placeholder -->
    <template v-else>
      <div class="w-full h-full flex items-center justify-center">
        <svg class="w-10 h-10 text-white/15" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
        </svg>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlaylistStore } from '@/stores/playlist'

const props = defineProps<{ playlistId: string }>()

const playlistStore = usePlaylistStore()

const covers = computed(() => {
  const tracks = playlistStore.getPlaylistTracks(props.playlistId)
  // Collect unique cover art paths
  const seen = new Set<string>()
  const result: string[] = []
  for (const t of tracks) {
    if (t.coverArt && !seen.has(t.coverArt)) {
      seen.add(t.coverArt)
      result.push(window.api.getMediaUrl(t.coverArt))
      if (result.length >= 4) break
    }
  }
  return result
})
</script>
