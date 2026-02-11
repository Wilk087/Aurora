<template>
  <div class="p-6" v-if="playlist">
    <!-- Header -->
    <div class="flex items-start gap-6 mb-8">
      <!-- Cover -->
      <div class="w-48 h-48 rounded-xl overflow-hidden shadow-2xl shrink-0">
        <PlaylistCover :playlist-id="playlist.id" />
      </div>

      <div class="flex-1 min-w-0 pt-2">
        <p class="text-xs font-semibold uppercase tracking-wider text-white/30 mb-1">Playlist</p>
        <h1 class="text-3xl font-bold mb-2 truncate">{{ playlist.name }}</h1>
        <p class="text-sm text-white/40 mb-4">
          {{ tracks.length }} {{ tracks.length === 1 ? 'song' : 'songs' }}
          <span v-if="totalDuration" class="ml-2">&middot; {{ formatDuration(totalDuration) }}</span>
        </p>

        <div class="flex items-center gap-3">
          <!-- Play all -->
          <button
            v-if="tracks.length > 0"
            @click="playAll"
            class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent hover:bg-accent-hover transition-colors text-sm font-medium"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play
          </button>

          <!-- Shuffle play -->
          <button
            v-if="tracks.length > 1"
            @click="shufflePlay"
            class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.12] transition-colors text-sm font-medium text-white/70"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
            </svg>
            Shuffle
          </button>
        </div>
      </div>
    </div>

    <!-- Track list -->
    <div v-if="tracks.length > 0" class="space-y-0.5">
      <div
        v-for="(track, i) in tracks"
        :key="track.id + '-' + i"
        class="group flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all"
        :class="isTrackActive(track) ? 'bg-white/[0.1]' : 'hover:bg-white/[0.05]'"
        @click="playFromIndex(i)"
      >
        <!-- # / playing indicator -->
        <div class="w-8 text-center shrink-0">
          <div v-if="isTrackActive(track) && player.isPlaying" class="flex items-center justify-center gap-[2px]">
            <span class="w-[3px] h-3 bg-accent rounded-full animate-bounce" style="animation-delay: 0s" />
            <span class="w-[3px] h-4 bg-accent rounded-full animate-bounce" style="animation-delay: 0.15s" />
            <span class="w-[3px] h-2 bg-accent rounded-full animate-bounce" style="animation-delay: 0.3s" />
          </div>
          <template v-else>
            <span class="text-xs text-white/30 group-hover:hidden">{{ i + 1 }}</span>
            <svg class="w-4 h-4 text-white/70 hidden group-hover:block mx-auto" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </template>
        </div>

        <!-- Cover -->
        <div class="w-10 h-10 rounded-md overflow-hidden bg-white/10 shrink-0">
          <img
            v-if="track.coverArt"
            :src="getMediaUrl(track.coverArt)"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <svg class="w-4 h-4 text-white/20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        </div>

        <!-- Title / artist -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate" :class="isTrackActive(track) ? 'text-accent' : 'text-white'">
            {{ track.title }}
          </p>
          <p class="text-xs text-white/40 truncate">{{ track.artist }}</p>
        </div>

        <!-- Album -->
        <div class="w-48 min-w-0 hidden lg:block">
          <p class="text-xs text-white/40 truncate">{{ track.album }}</p>
        </div>

        <!-- Duration -->
        <div class="w-14 text-right shrink-0">
          <span class="text-xs text-white/30 tabular-nums">{{ formatTime(track.duration) }}</span>
        </div>

        <!-- Remove from playlist -->
        <button
          @click.stop="removeTrack(track.id)"
          class="w-7 h-7 rounded-full text-white/20 hover:text-red-400 hover:bg-white/[0.06] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shrink-0"
          title="Remove from playlist"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Empty track list -->
    <div v-else class="flex flex-col items-center justify-center h-40 text-white/30">
      <p class="text-sm">This playlist is empty</p>
      <p class="text-xs mt-1">Add songs from your library</p>
    </div>
  </div>

  <!-- Playlist not found -->
  <div v-else class="p-6 flex flex-col items-center justify-center h-64 text-white/30">
    <p class="text-lg">Playlist not found</p>
    <router-link to="/playlists" class="text-accent text-sm mt-2 hover:underline">Back to Playlists</router-link>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePlaylistStore } from '@/stores/playlist'
import { usePlayerStore } from '@/stores/player'
import { formatTime } from '@/utils/formatTime'
import PlaylistCover from '@/components/PlaylistCover.vue'

const route = useRoute()
const playlistStore = usePlaylistStore()
const player = usePlayerStore()

const playlist = computed(() => {
  const id = route.params.id as string
  return playlistStore.getPlaylistById(id)
})

const tracks = computed(() => {
  if (!playlist.value) return []
  return playlistStore.getPlaylistTracks(playlist.value.id)
})

const totalDuration = computed(() =>
  tracks.value.reduce((sum, t) => sum + (t.duration || 0), 0)
)

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hrs > 0) return `${hrs} hr ${mins} min`
  return `${mins} min`
}

function getMediaUrl(path: string) {
  return window.api.getMediaUrl(path)
}

function isTrackActive(track: Track): boolean {
  return player.currentTrack?.id === track.id
}

function playAll() {
  if (tracks.value.length > 0) {
    player.playAll(tracks.value, 0)
  }
}

function shufflePlay() {
  const shuffled = [...tracks.value].sort(() => Math.random() - 0.5)
  player.playAll(shuffled, 0)
}

function playFromIndex(index: number) {
  player.playAll(tracks.value, index)
}

async function removeTrack(trackId: string) {
  if (!playlist.value) return
  await playlistStore.removeTrack(playlist.value.id, trackId)
}
</script>
