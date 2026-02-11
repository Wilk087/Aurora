<template>
  <div v-if="player.currentTrack" class="now-playing h-full flex">
    <!-- Left – album art -->
    <div class="flex-1 flex items-center justify-center p-12">
      <div class="relative max-w-md w-full">
        <div class="aspect-square rounded-3xl overflow-hidden cover-shadow">
          <img
            v-if="player.currentTrack.coverArt"
            :src="coverUrl"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-white/[0.06] flex items-center justify-center">
            <svg class="w-24 h-24 text-white/10" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
              />
            </svg>
          </div>
        </div>

        <div class="mt-6 text-center">
          <h2 class="text-2xl font-bold text-white mb-1">{{ player.currentTrack.title }}</h2>
          <p class="text-lg text-white/50">{{ player.currentTrack.artist }}</p>
          <p class="text-sm text-white/30 mt-1">{{ player.currentTrack.album }}</p>
        </div>
      </div>
    </div>

    <!-- Right – synced lyrics -->
    <div class="flex-1 flex items-center justify-center">
      <SyncedLyrics class="w-full h-full" />
    </div>
  </div>

  <!-- No track -->
  <div v-else class="h-full flex items-center justify-center">
    <div class="text-center">
      <svg class="w-20 h-20 text-white/[0.06] mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
        />
      </svg>
      <p class="text-white/30 text-lg">No track playing</p>
      <p class="text-white/20 text-sm mt-1">Pick a song to get started</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import SyncedLyrics from '@/components/SyncedLyrics.vue'

const player = usePlayerStore()

const coverUrl = computed(() =>
  player.currentTrack?.coverArt ? window.api.getMediaUrl(player.currentTrack.coverArt) : '',
)
</script>
