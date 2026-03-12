<template>
  <div class="p-6" v-if="playlist">
    <!-- Header -->
    <div class="flex items-start gap-6 mb-8">
      <!-- Cover -->
      <div class="w-48 h-48 rounded-xl overflow-hidden shadow-2xl shrink-0">
        <PlaylistCover :playlist-id="playlist.id" />
      </div>

      <div class="flex-1 min-w-0 pt-2">
        <p class="text-xs font-semibold uppercase tracking-wider mb-1" :class="playlist.smart ? 'text-accent/60' : 'text-white/30'">
          {{ playlist.smart ? 'Smart Playlist' : 'Playlist' }}
        </p>
        <h1 class="text-3xl font-bold mb-2 truncate">{{ playlist.name }}</h1>
        <p class="text-sm text-white/40 mb-4">
          {{ tracks.length }} {{ tracks.length === 1 ? 'song' : 'songs' }}
          <span v-if="totalDuration" class="ml-2">&middot; {{ formatDuration(totalDuration) }}</span>
        </p>

        <div class="flex items-center gap-3 flex-wrap">
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
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
            </svg>
            Shuffle
          </button>

          <!-- Edit Rules (smart playlists) -->
          <button
            v-if="playlist.smart"
            @click="showEditRules = true"
            class="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.12] transition-colors text-sm font-medium text-white/70"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Edit Rules
          </button>

          <!-- Export M3U (normal playlists) -->
          <button
            v-if="!playlist.smart && tracks.length > 0"
            @click="exportM3U"
            class="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.12] transition-colors text-sm font-medium text-white/50"
            title="Export as M3U"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export
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
        :class="[
          isTrackActive(track) ? 'bg-white/[0.1]' : 'hover:bg-white/[0.05]',
          dragOverIndex === i ? 'border-t-2 border-accent' : '',
        ]"
        :draggable="!playlist.smart"
        @click="playFromIndex(i)"
        @contextmenu.prevent="openTrackMenu(track, $event)"
        @dragstart="!playlist.smart && onDragStart(i, $event)"
        @dragover.prevent="!playlist.smart && onDragOver(i)"
        @drop="!playlist.smart && onDrop(i)"
        @dragend="onDragEnd"
      >
        <!-- Drag handle (normal playlists only) -->
        <div
          v-if="!playlist.smart"
          class="w-4 shrink-0 text-white/15 opacity-0 group-hover:opacity-100 cursor-grab transition-opacity"
          @click.stop
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm8-16a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </div>

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
          <p class="text-xs text-white/40 truncate">
            <ArtistLinks
              :artist="track.artist"
              :album-artist="track.albumArtist"
              hover-class="hover:text-white/60"
            />
          </p>
        </div>

        <!-- Album -->
        <div class="w-48 min-w-0 hidden lg:block">
          <p class="text-xs text-white/40 truncate">
            <span
              class="hover:text-white/60 hover:underline underline-offset-2 cursor-pointer transition-colors"
              @click.stop="goToTrackAlbum(track)"
            >{{ track.album }}</span>
          </p>
        </div>

        <!-- Duration -->
        <div class="w-14 text-right shrink-0">
          <span class="text-xs text-white/30 tabular-nums">{{ formatTime(track.duration) }}</span>
        </div>

        <!-- Remove from playlist (normal playlists only) -->
        <button
          v-if="!playlist.smart"
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
    <div v-else class="flex flex-col items-center justify-center h-48 text-white/30">
      <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
      </svg>
      <p class="text-sm font-medium mb-1">This playlist is empty</p>
      <p class="text-xs text-white/20">
        {{ playlist.smart ? 'No tracks match the current rules — try editing them' : 'Right-click tracks in your library to add them here' }}
      </p>
    </div>

    <!-- Track context menu -->
    <Teleport to="body">
      <div v-if="ctxTrack" class="fixed inset-0 z-[100]" @click="ctxTrack = null">
        <div
          class="fixed z-[101] w-52 rounded-xl menu-panel py-1.5 shadow-2xl"
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
          <template v-if="!playlist.smart">
            <div class="border-t border-white/[0.06] my-1" />
            <button @click="ctxRemoveFromPlaylist" class="w-full px-4 py-2 text-left text-sm text-red-400 hover:text-red-300 hover:bg-white/[0.06] transition-colors flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              Remove from Playlist
            </button>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- Edit Rules dialog -->
    <SmartPlaylistDialog
      :show="showEditRules"
      :editing="editingRules"
      @close="showEditRules = false"
      @update="onUpdateRules"
    />
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
import ArtistLinks from '@/components/ArtistLinks.vue'
import SmartPlaylistDialog from '@/components/SmartPlaylistDialog.vue'

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
  if (tracks.value.length > 0) player.playAll(tracks.value, 0)
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

// ── Drag-to-reorder ───────────────────────
const dragFromIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(i: number, e: DragEvent) {
  dragFromIndex.value = i
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(i: number) {
  dragOverIndex.value = i
}

function onDrop(i: number) {
  if (dragFromIndex.value !== null && dragFromIndex.value !== i && playlist.value) {
    playlistStore.reorderTracks(playlist.value.id, dragFromIndex.value, i)
  }
  dragFromIndex.value = null
  dragOverIndex.value = null
}

function onDragEnd() {
  dragFromIndex.value = null
  dragOverIndex.value = null
}

// ── M3U export ───────────────────────────
async function exportM3U() {
  if (!playlist.value) return
  const result = await window.api.exportPlaylistM3U(playlist.value.id)
  if (result.success && result.path) {
    toast.success(`Exported to ${result.path.split('/').pop()}`)
  }
}

// ── Edit Rules (smart playlists) ─────────
const showEditRules = ref(false)
const editingRules = computed(() => {
  if (!playlist.value?.smart) return null
  return {
    id: playlist.value.id,
    name: playlist.value.name,
    rules: playlist.value.rules || [],
    ruleMatch: playlist.value.ruleMatch || 'all' as 'all' | 'any',
  }
})

async function onUpdateRules(data: { id: string; name: string; rules: SmartPlaylistRule[]; ruleMatch: 'all' | 'any' }) {
  await playlistStore.updateSmartPlaylistRules(data.id, data.rules, data.ruleMatch)
  const current = playlistStore.getPlaylistById(data.id)
  if (current && data.name !== current.name) {
    await playlistStore.renamePlaylist(data.id, data.name)
  }
  showEditRules.value = false
}

// ── Track context menu ───────────────────
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

function goToTrackAlbum(track: Track) {
  const album = library.albums.find(a =>
    a.name === track.album && a.artist === (track.albumArtist || track.artist)
  )
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
