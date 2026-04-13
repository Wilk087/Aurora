<template>
  <div class="p-6" ref="viewRoot">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Playlists</h1>
      <div class="flex items-center gap-2">
        <!-- Sort dropdown -->
        <div class="relative" ref="sortBtnRef">
          <button
            @click.stop="toggleSortMenu"
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
              class="fixed z-[100] w-48 rounded-xl menu-panel py-1.5 shadow-2xl"
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

        <!-- Import M3U -->
        <button
          @click="importM3U"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors text-sm font-medium"
          title="Import M3U playlist"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Import
        </button>

        <!-- Smart Playlist -->
        <button
          @click="showSmartDialog = true"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors text-sm font-medium"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          Smart Playlist
        </button>

        <!-- New Playlist -->
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
      <p class="text-sm mb-6">Organize your music or let rules do it automatically</p>
      <div class="flex items-center gap-3">
        <button
          @click="showCreateDialog = true"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors text-sm font-medium"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Playlist
        </button>
        <button
          @click="showSmartDialog = true"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors text-sm font-medium"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          Smart Playlist
        </button>
      </div>
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
            <!-- Smart playlist badge -->
            <div
              v-if="playlist.smart"
              class="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-accent/80 backdrop-blur-sm text-[10px] font-semibold text-white"
            >
              Smart
            </div>
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
            <p class="text-xs text-white/40">{{ getTrackCount(playlist) }} {{ getTrackCount(playlist) === 1 ? 'song' : 'songs' }}</p>
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
      <Transition name="fade">
        <div v-if="showCreateDialog" class="fixed inset-0 z-[80] bg-black/50" @click="showCreateDialog = false" />
      </Transition>
      <Transition name="dialog-slide">
        <div v-if="showCreateDialog" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-[360px] max-w-[90vw] rounded-2xl bg-[#12121f]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl">
          <div class="p-6">
            <h2 class="text-base font-semibold mb-4">New Playlist</h2>
            <input
              v-model="newPlaylistName"
              ref="nameInput"
              @keydown.enter="createPlaylist"
              @keydown.escape="showCreateDialog = false"
              placeholder="Playlist name…"
              class="ctx-input w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            />
            <div class="flex justify-end gap-3 mt-4">
              <button @click="showCreateDialog = false" class="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">Cancel</button>
              <button @click="createPlaylist" :disabled="!newPlaylistName.trim()" class="px-5 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Create</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Context menu -->
    <Teleport to="body">
      <div v-if="contextPlaylist" class="fixed inset-0 z-[90]" @click="contextPlaylist = null" @contextmenu.prevent="contextPlaylist = null" />
      <div
        v-if="contextPlaylist"
        class="fixed z-[100] w-52 rounded-xl menu-panel py-1.5 shadow-2xl"
        :style="contextPos"
        @click.stop
      >
        <button @click="playContextPlaylist(false)" class="ctx-item w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center gap-2.5">
          <svg class="w-4 h-4 shrink-0 opacity-50" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          Play
        </button>
        <button @click="playContextPlaylist(true)" class="ctx-item w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center gap-2.5">
          <svg class="w-4 h-4 shrink-0 opacity-50" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
          Shuffle
        </button>
        <div class="border-t border-[var(--border)] my-1" />
        <button
          v-if="contextPlaylist.smart"
          @click="startEditRules"
          class="ctx-item w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
          Edit Rules
        </button>
        <button @click="startRename" class="ctx-item w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center gap-2.5">
          <svg class="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
          Rename
        </button>
        <div class="border-t border-[var(--border)] my-1" />
        <button @click="confirmDelete" class="w-full px-3.5 py-2 text-left text-sm text-red-400 hover:text-red-300 hover:bg-white/[0.06] transition-colors flex items-center gap-2.5">
          <svg class="w-4 h-4 shrink-0 opacity-60" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
          Delete
        </button>
      </div>
    </Teleport>

    <!-- Rename dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showRenameDialog" class="fixed inset-0 z-[80] bg-black/50" @click="showRenameDialog = false" />
      </Transition>
      <Transition name="dialog-slide">
        <div v-if="showRenameDialog" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-[360px] max-w-[90vw] rounded-2xl bg-[#12121f]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl">
          <div class="p-6">
            <h2 class="text-base font-semibold mb-4">Rename Playlist</h2>
            <input v-model="renameValue" ref="renameInput" @keydown.enter="doRename" @keydown.escape="showRenameDialog = false" class="ctx-input w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors" />
            <div class="flex justify-end gap-3 mt-4">
              <button @click="showRenameDialog = false" class="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">Cancel</button>
              <button @click="doRename" :disabled="!renameValue.trim()" class="px-5 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Save</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Smart Playlist Dialog (create + edit) -->
    <SmartPlaylistDialog
      :show="showSmartDialog"
      :editing="editingSmartPlaylist"
      @close="closeSmartDialog"
      @save="onSmartPlaylistSave"
      @update="onSmartPlaylistUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, nextTick } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { menuPosition } from '@/utils/menuPosition'
import { usePlaylistStore, type PlaylistSortOrder } from '@/stores/playlist'
import { usePlayerStore } from '@/stores/player'
import { useToast } from '@/composables/useToast'
import PlaylistCover from '@/components/PlaylistCover.vue'
import SmartPlaylistDialog from '@/components/SmartPlaylistDialog.vue'

const playlistStore = usePlaylistStore()
const player = usePlayerStore()
const router = useRouter()
const toast = useToast()
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
const editingSmartPlaylist = ref<{ id: string; name: string; rules: SmartPlaylistRule[]; ruleMatch: 'all' | 'any' } | null>(null)
const newPlaylistName = ref('')
const nameInput = ref<HTMLInputElement>()
const contextPlaylist = ref<Playlist | null>(null)
const contextPos = ref<Record<string, string>>({})
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
const sortMenuStyle = ref<Record<string, string>>({})

function toggleSortMenu() {
  if (!showSortMenu.value && sortBtnRef.value) {
    const rect = sortBtnRef.value.getBoundingClientRect()
    sortMenuStyle.value = { top: (rect.bottom + 4) + 'px', left: Math.min(rect.left, window.innerWidth - 200) + 'px' }
  }
  showSortMenu.value = !showSortMenu.value
}
function setSort(order: PlaylistSortOrder) {
  playlistStore.playlistSortOrder = order
  showSortMenu.value = false
}

function getTrackCount(playlist: Playlist): number {
  if (playlist.smart) return playlistStore.getPlaylistTracks(playlist.id).length
  return playlist.trackIds.length
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
  if (tracks.length > 0) player.playAll(tracks, 0)
}

function openContextMenu(playlist: Playlist, event?: MouseEvent) {
  contextPos.value = event
    ? menuPosition(event.clientX, event.clientY, 220, 220)
    : { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
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

// ── Smart playlist ────────────────────────
function startEditRules() {
  if (!contextPlaylist.value?.smart) return
  editingSmartPlaylist.value = {
    id: contextPlaylist.value.id,
    name: contextPlaylist.value.name,
    rules: JSON.parse(JSON.stringify(contextPlaylist.value.rules || [])),
    ruleMatch: contextPlaylist.value.ruleMatch || 'all',
  }
  contextPlaylist.value = null
  showSmartDialog.value = true
}

function closeSmartDialog() {
  showSmartDialog.value = false
  editingSmartPlaylist.value = null
}

async function onSmartPlaylistSave(data: { name: string; rules: SmartPlaylistRule[]; ruleMatch: 'all' | 'any' }) {
  const pl = await playlistStore.createSmartPlaylist(data.name, data.rules, data.ruleMatch)
  closeSmartDialog()
  router.push(`/playlist/${pl.id}`)
}

async function onSmartPlaylistUpdate(data: { id: string; name: string; rules: SmartPlaylistRule[]; ruleMatch: 'all' | 'any' }) {
  await playlistStore.updateSmartPlaylistRules(data.id, data.rules, data.ruleMatch)
  const current = playlistStore.getPlaylistById(data.id)
  if (current && data.name !== current.name) {
    await playlistStore.renamePlaylist(data.id, data.name)
  }
  closeSmartDialog()
}

// ── M3U import ────────────────────────────
async function importM3U() {
  const result = await window.api.importPlaylistM3U()
  if (!result) return
  await playlistStore.loadPlaylists()
  const msg = result.unmatched.length > 0
    ? `Imported ${result.matched} tracks (${result.unmatched.length} not found)`
    : `Imported ${result.matched} tracks`
  toast.success(msg)
  if (result.matched > 0) router.push(`/playlist/${result.playlistId}`)
}
</script>
