<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Playlists</h1>
      <button
        @click="showCreateDialog = true"
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors text-sm font-medium"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        New Playlist
      </button>
    </div>

    <!-- Empty state -->
    <div
      v-if="playlistStore.sortedPlaylists.length === 0"
      class="flex flex-col items-center justify-center h-64 text-white/30"
    >
      <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
      </svg>
      <p class="text-lg font-medium mb-1">No playlists yet</p>
      <p class="text-sm">Create a playlist to organize your music</p>
    </div>

    <!-- Playlists grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      <div
        v-for="playlist in playlistStore.sortedPlaylists"
        :key="playlist.id"
        class="group relative"
      >
        <router-link
          :to="`/playlist/${playlist.id}`"
          class="block rounded-xl overflow-hidden bg-white/[0.04] hover:bg-white/[0.08] transition-all"
        >
          <!-- Cover collage -->
          <div class="aspect-square relative overflow-hidden bg-white/[0.06]">
            <PlaylistCover :playlist-id="playlist.id" />
            <!-- Play overlay -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                @click.prevent.stop="playPlaylist(playlist.id)"
                class="w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
              >
                <svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          </div>

          <div class="p-3">
            <p class="text-sm font-medium truncate">{{ playlist.name }}</p>
            <p class="text-xs text-white/40">{{ playlist.trackIds.length }} {{ playlist.trackIds.length === 1 ? 'song' : 'songs' }}</p>
          </div>
        </router-link>

        <!-- Context menu button -->
        <button
          @click.stop="openContextMenu(playlist)"
          class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white/70 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Create playlist dialog -->
    <Teleport to="body">
      <div
        v-if="showCreateDialog"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
        @click.self="showCreateDialog = false"
      >
        <div class="w-96 rounded-xl bg-[#1a1a2e] border border-white/10 p-6 shadow-2xl">
          <h2 class="text-lg font-bold mb-4">New Playlist</h2>
          <input
            v-model="newPlaylistName"
            ref="nameInput"
            @keydown.enter="createPlaylist"
            placeholder="Playlist name"
            class="w-full px-4 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors"
          />
          <div class="flex justify-end gap-3 mt-4">
            <button
              @click="showCreateDialog = false"
              class="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              @click="createPlaylist"
              :disabled="!newPlaylistName.trim()"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Context menu -->
    <Teleport to="body">
      <div
        v-if="contextPlaylist"
        class="fixed inset-0 z-[100]"
        @click="contextPlaylist = null"
      >
        <div
          class="fixed z-[101] w-48 rounded-xl bg-[#1a1a2e] border border-white/10 py-1.5 shadow-2xl"
          :style="{ top: contextY + 'px', left: contextX + 'px' }"
          @click.stop
        >
          <button
            @click="startRename"
            class="w-full px-4 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            Rename
          </button>
          <button
            @click="confirmDelete"
            class="w-full px-4 py-2 text-left text-sm text-red-400 hover:text-red-300 hover:bg-white/[0.06] transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Rename dialog -->
    <Teleport to="body">
      <div
        v-if="showRenameDialog"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
        @click.self="showRenameDialog = false"
      >
        <div class="w-96 rounded-xl bg-[#1a1a2e] border border-white/10 p-6 shadow-2xl">
          <h2 class="text-lg font-bold mb-4">Rename Playlist</h2>
          <input
            v-model="renameValue"
            ref="renameInput"
            @keydown.enter="doRename"
            class="w-full px-4 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors"
          />
          <div class="flex justify-end gap-3 mt-4">
            <button
              @click="showRenameDialog = false"
              class="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              @click="doRename"
              :disabled="!renameValue.trim()"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { usePlaylistStore } from '@/stores/playlist'
import { usePlayerStore } from '@/stores/player'
import PlaylistCover from '@/components/PlaylistCover.vue'

const playlistStore = usePlaylistStore()
const player = usePlayerStore()

const showCreateDialog = ref(false)
const newPlaylistName = ref('')
const nameInput = ref<HTMLInputElement>()

const contextPlaylist = ref<Playlist | null>(null)
const contextX = ref(0)
const contextY = ref(0)

const showRenameDialog = ref(false)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement>()
const renameTargetId = ref('')

onMounted(async () => {
  if (!playlistStore.loaded) await playlistStore.loadPlaylists()
})

async function createPlaylist() {
  const name = newPlaylistName.value.trim()
  if (!name) return
  await playlistStore.createPlaylist(name)
  newPlaylistName.value = ''
  showCreateDialog.value = false
}

function playPlaylist(id: string) {
  const tracks = playlistStore.getPlaylistTracks(id)
  if (tracks.length > 0) {
    player.playAll(tracks, 0)
  }
}

function openContextMenu(playlist: Playlist) {
  // Position near center of viewport as a simple fallback
  contextX.value = Math.min(window.innerWidth - 200, window.innerWidth / 2)
  contextY.value = Math.min(window.innerHeight - 120, window.innerHeight / 2)
  contextPlaylist.value = playlist
}

function startRename() {
  if (!contextPlaylist.value) return
  renameTargetId.value = contextPlaylist.value.id
  renameValue.value = contextPlaylist.value.name
  contextPlaylist.value = null
  showRenameDialog.value = true
  nextTick(() => renameInput.value?.focus())
}

async function doRename() {
  const name = renameValue.value.trim()
  if (!name || !renameTargetId.value) return
  await playlistStore.renamePlaylist(renameTargetId.value, name)
  showRenameDialog.value = false
}

async function confirmDelete() {
  if (!contextPlaylist.value) return
  await playlistStore.deletePlaylist(contextPlaylist.value.id)
  contextPlaylist.value = null
}
</script>
