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
        @contextmenu.prevent="openTrackMenu(track, $event)"
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

    <!-- Track context menu -->
    <Teleport to="body">
      <div v-if="ctxTrack" class="fixed inset-0 z-[100]" @click="ctxTrack = null">
        <div
          class="fixed z-[101] w-52 rounded-xl bg-[#1a1a2e]/95 backdrop-blur-lg border border-white/10 py-1.5 shadow-2xl"
          :style="{ top: ctxY + 'px', left: ctxX + 'px' }"
          @click.stop
        >
          <button @click="doPlayNext" class="w-full px-4 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
            Play Next
          </button>
          <button @click="doAddToQueue" class="w-full px-4 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>
            Add to Queue
          </button>
          <button @click="ctxToggleFavorite" class="w-full px-4 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2">
            <svg v-if="ctxTrack && favoritesStore.isFavorite(ctxTrack.id)" class="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
            {{ ctxTrack && favoritesStore.isFavorite(ctxTrack.id) ? 'Remove from Favorites' : 'Add to Favorites' }}
          </button>
          <div class="border-t border-white/[0.06] my-1" />
          <button @click="ctxGoToArtist" class="w-full px-4 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
            Go to Artist
          </button>
          <button @click="ctxGoToAlbum" class="w-full px-4 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" /></svg>
            Go to Album
          </button>
          <button @click="ctxShowInExplorer" class="w-full px-4 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
            Show in File Explorer
          </button>
          <div class="border-t border-white/[0.06] my-1" />
          <button @click="ctxRemoveFromPlaylist" class="w-full px-4 py-2 text-left text-sm text-red-400 hover:text-red-300 hover:bg-white/[0.06] transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            Remove from Playlist
          </button>
        </div>
      </div>
    </Teleport>
  </div>

  <!-- Playlist not found -->
  <div v-else class="p-6 flex flex-col items-center justify-center h-64 text-white/30">
    <p class="text-lg">Playlist not found</p>
    <router-link to="/playlists" class="text-accent text-sm mt-2 hover:underline">Back to Playlists</router-link>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlaylistStore } from '@/stores/playlist'
import { usePlayerStore } from '@/stores/player'
import { useLibraryStore } from '@/stores/library'
import { useFavoritesStore } from '@/stores/favorites'
import { useToast } from '@/composables/useToast'
import { formatTime } from '@/utils/formatTime'
import PlaylistCover from '@/components/PlaylistCover.vue'

const route = useRoute()
const router = useRouter()
const playlistStore = usePlaylistStore()
const player = usePlayerStore()
const library = useLibraryStore()
const favoritesStore = useFavoritesStore()
const toast = useToast()

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

// ── Track context menu ───────────────────────────
const ctxTrack = ref<Track | null>(null)
const ctxX = ref(0)
const ctxY = ref(0)

function openTrackMenu(track: Track, e: MouseEvent) {
  ctxX.value = Math.min(e.clientX, window.innerWidth - 220)
  ctxY.value = Math.min(e.clientY, window.innerHeight - 320)
  ctxTrack.value = track
}

function doPlayNext() {
  if (ctxTrack.value) player.playNext(ctxTrack.value)
  ctxTrack.value = null
}

function doAddToQueue() {
  if (ctxTrack.value) player.addToQueue([ctxTrack.value])
  ctxTrack.value = null
}

function ctxGoToArtist() {
  if (!ctxTrack.value) return
  const artist = ctxTrack.value.albumArtist || ctxTrack.value.artist
  ctxTrack.value = null
  router.push(`/artist/${encodeURIComponent(artist)}`)
}

function ctxGoToAlbum() {
  if (!ctxTrack.value) return
  const album = library.albums.find(a =>
    a.name === ctxTrack.value!.album && a.artist === (ctxTrack.value!.albumArtist || ctxTrack.value!.artist)
  )
  ctxTrack.value = null
  if (album) router.push(`/album/${album.id}`)
}

function ctxShowInExplorer() {
  if (ctxTrack.value) window.api.showInExplorer(ctxTrack.value.path)
  ctxTrack.value = null
}

function ctxRemoveFromPlaylist() {
  if (ctxTrack.value && playlist.value) {
    playlistStore.removeTrack(playlist.value.id, ctxTrack.value.id)
  }
  ctxTrack.value = null
}

async function ctxToggleFavorite() {
  if (!ctxTrack.value) return
  await favoritesStore.toggle(ctxTrack.value.id)
  toast.success(favoritesStore.isFavorite(ctxTrack.value.id) ? 'Added to Favorites' : 'Removed from Favorites')
  ctxTrack.value = null
}
</script>
