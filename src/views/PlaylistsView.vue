<template>
  <div class="p-6" ref="viewRoot">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Playlists</h1>
      <div class="flex items-center gap-2">
        <!-- Sort dropdown -->
        <div class="relative" ref="sortBtnRef">
          <button
            @click.stop="showSortMenu = !showSortMenu"
            class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors text-sm font-medium"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-3L16.5 18m0 0L12 13.5m4.5 4.5V4.5" />
            </svg>
            {{ sortLabel }}
          </button>
          <Teleport to="body">
            <div v-if="showSortMenu" class="fixed inset-0 z-[90]" @click="showSortMenu = false" />
            <div
              v-if="showSortMenu"
              class="fixed z-[100] w-48 rounded-xl bg-[#1a1a2e]/95 backdrop-blur-lg border border-white/10 py-1.5 shadow-2xl"
              :style="sortMenuStyle"
            >
              <button
                v-for="opt in sortOptions"
                :key="opt.value"
                @click.stop="setSort(opt.value)"
                class="w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center justify-between"
                :class="playlistStore.playlistSortOrder === opt.value ? 'text-accent' : 'text-white/70 hover:text-white hover:bg-white/[0.06]'"
              >
                {{ opt.label }}
                <svg v-if="playlistStore.playlistSortOrder === opt.value" class="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              </button>
            </div>
          </Teleport>
        </div>
        <button
          @click="showSmartDialog = true"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors text-sm font-medium"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          Smart Playlist
        </button>
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
          @contextmenu.prevent="openContextMenu(playlist, $event)"
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
          @click.stop="openContextMenu(playlist, $event)"
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
            @click="playContextPlaylist(false)"
            class="w-full px-4 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            Play
          </button>
          <button
            @click="playContextPlaylist(true)"
            class="w-full px-4 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" /></svg>
            Shuffle
          </button>
          <div class="border-t border-white/[0.06] my-1" />
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

    <!-- Smart Playlist Dialog -->
    <SmartPlaylistDialog
      :show="showSmartDialog"
      @close="showSmartDialog = false"
      @save="onSmartPlaylistSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, nextTick } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { usePlaylistStore, type PlaylistSortOrder } from '@/stores/playlist'
import { usePlayerStore } from '@/stores/player'
import { useLibraryStore } from '@/stores/library'
import PlaylistCover from '@/components/PlaylistCover.vue'
import SmartPlaylistDialog from '@/components/SmartPlaylistDialog.vue'

const playlistStore = usePlaylistStore()
const player = usePlayerStore()
const library = useLibraryStore()
const viewRoot = ref<HTMLElement | null>(null)

// ── Scroll memory ────────────────────────
let savedScrollTop = 0
onActivated(() => {
  requestAnimationFrame(() => {
    const el = viewRoot.value?.closest('main')
    if (el) el.scrollTop = savedScrollTop
  })
})
onBeforeRouteLeave(() => {
  const el = viewRoot.value?.closest('main')
  if (el) savedScrollTop = el.scrollTop
})

const showCreateDialog = ref(false)
const showSmartDialog = ref(false)
const newPlaylistName = ref('')
const nameInput = ref<HTMLInputElement>()

const contextPlaylist = ref<Playlist | null>(null)
const contextX = ref(0)
const contextY = ref(0)

const showRenameDialog = ref(false)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement>()
const renameTargetId = ref('')

// ── Sort ─────────────────────────────────
const showSortMenu = ref(false)
const sortBtnRef = ref<HTMLElement>()
const sortOptions: { label: string; value: PlaylistSortOrder }[] = [
  { label: 'Recently Updated', value: 'updated' },
  { label: 'Recently Created', value: 'created' },
  { label: 'Name (A–Z)', value: 'name' },
  { label: 'Song Count', value: 'tracks' },
]
const sortLabel = computed(() => sortOptions.find(o => o.value === playlistStore.playlistSortOrder)?.label || 'Sort')
const sortMenuStyle = computed(() => {
  if (!sortBtnRef.value) return {}
  const rect = sortBtnRef.value.getBoundingClientRect()
  return {
    top: (rect.bottom + 4) + 'px',
    left: Math.min(rect.left, window.innerWidth - 200) + 'px',
  }
})
function setSort(order: PlaylistSortOrder) {
  playlistStore.playlistSortOrder = order
  showSortMenu.value = false
}

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

function openContextMenu(playlist: Playlist, event?: MouseEvent) {
  if (event) {
    contextX.value = Math.min(event.clientX, window.innerWidth - 200)
    contextY.value = Math.min(event.clientY, window.innerHeight - 200)
  } else {
    contextX.value = Math.min(window.innerWidth - 200, window.innerWidth / 2)
    contextY.value = Math.min(window.innerHeight - 120, window.innerHeight / 2)
  }
  contextPlaylist.value = playlist
}

function playContextPlaylist(shuffle: boolean) {
  if (!contextPlaylist.value) return
  const tracks = playlistStore.getPlaylistTracks(contextPlaylist.value.id)
  if (tracks.length > 0) {
    const list = shuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks
    player.playAll(list, 0)
  }
  contextPlaylist.value = null
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

async function onSmartPlaylistSave(data: { name: string; rules: SmartPlaylistRule[]; ruleMatch: 'all' | 'any' }) {
  // Match tracks based on rules
  const matchingTracks = library.tracks.filter((track: Track) => {
    const results = data.rules.map(rule => {
      const val = String((track as unknown as Record<string, unknown>)[rule.field] || '').toLowerCase()
      const rv = String(rule.value).toLowerCase()
      switch (rule.operator) {
        case 'is': case 'equals': return val === rv
        case 'contains': return val.includes(rv)
        case 'starts': return val.startsWith(rv)
        case 'greater': return Number(val) > Number(rule.value)
        case 'less': return Number(val) < Number(rule.value)
        case 'between': return Number(val) >= Number(rule.value) && Number(val) <= Number(rule.value2)
        default: return false
      }
    })
    return data.ruleMatch === 'all' ? results.every(Boolean) : results.some(Boolean)
  })

  // Create playlist and populate
  const pl = await playlistStore.createPlaylist(data.name)
  if (matchingTracks.length > 0) {
    await playlistStore.addTracks(pl.id, matchingTracks.map(t => t.id))
  }
  // Save smart metadata
  try {
    await window.api.createSmartPlaylist(pl.id, data.rules, data.ruleMatch)
  } catch { /* ignore if IPC not available */ }
  showSmartDialog.value = false
}
</script>
