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
          <p class="text-lg text-white/50">
            <span
              class="hover:text-white/70 hover:underline underline-offset-2 cursor-pointer transition-colors"
              @click="goToArtist"
            >{{ player.currentTrack.artist }}</span>
          </p>
          <p class="text-sm text-white/30 mt-1">
            <span
              v-if="player.currentTrack.album"
              class="hover:text-white/50 hover:underline underline-offset-2 cursor-pointer transition-colors"
              @click="goToAlbum"
            >{{ player.currentTrack.album }}</span>
          </p>
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
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useLibraryStore } from '@/stores/library'
import SyncedLyrics from '@/components/SyncedLyrics.vue'

const router = useRouter()
const player = usePlayerStore()
const library = useLibraryStore()

const coverUrl = computed(() =>
  player.currentTrack?.coverArt ? window.api.getMediaUrl(player.currentTrack.coverArt) : '',
)

function goToArtist() {
  if (!player.currentTrack) return
  const artist = player.currentTrack.albumArtist || player.currentTrack.artist
  router.push(`/artist/${encodeURIComponent(artist)}`)
}

function goToAlbum() {
  if (!player.currentTrack) return
  const album = library.albums.find(a =>
    a.name === player.currentTrack!.album && a.artist === (player.currentTrack!.albumArtist || player.currentTrack!.artist)
  )
  if (album) router.push(`/album/${album.id}`)
}
</script>
