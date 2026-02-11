<template>
  <div
    @click="$emit('play')"
    @contextmenu.prevent="openContextMenu"
    class="song-row group flex items-center gap-3 px-4 rounded-lg cursor-pointer transition-colors relative"
    style="height: 56px;"
    :class="isActive ? 'bg-white/[0.1]' : 'hover:bg-white/[0.05]'"
  >
    <!-- # / playing indicator -->
    <div class="w-8 text-center shrink-0">
      <div v-if="isActive && isPlaying" class="flex items-center justify-center gap-[2px]">
        <span class="w-[3px] h-3 bg-accent rounded-full animate-bounce" style="animation-delay: 0s" />
        <span class="w-[3px] h-4 bg-accent rounded-full animate-bounce" style="animation-delay: 0.15s" />
        <span class="w-[3px] h-2 bg-accent rounded-full animate-bounce" style="animation-delay: 0.3s" />
      </div>
      <template v-else>
        <span class="text-xs text-white/30 group-hover:hidden">{{ index + 1 }}</span>
        <svg class="w-4 h-4 text-white/70 hidden group-hover:block mx-auto" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </template>
    </div>

    <!-- Cover -->
    <div class="w-10 h-10 rounded-md overflow-hidden bg-white/10 shrink-0">
      <img v-if="track.coverArt" :src="coverUrl" class="w-full h-full object-cover" loading="lazy" />
      <div v-else class="w-full h-full flex items-center justify-center">
        <svg class="w-4 h-4 text-white/20" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      </div>
    </div>

    <!-- Title / artist -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium truncate" :class="isActive ? 'text-accent' : 'text-white'">
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

    <!-- Add to playlist button -->
    <div class="w-7 shrink-0">
      <button
        ref="plusBtnRef"
        @click.stop="openMenu"
        class="w-7 h-7 rounded-full text-white/20 hover:text-accent hover:bg-white/[0.06] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        title="Add to playlist"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </div>

    <!-- Playlist dropdown (teleported) -->
    <Teleport to="body">
      <div v-if="showMenu" class="fixed inset-0 z-[90]" @click="showMenu = false" />
      <div
        v-if="showMenu"
        class="fixed z-[100] w-56 max-h-64 overflow-y-auto rounded-xl bg-[#1a1a2e]/95 backdrop-blur-lg border border-white/10 py-1.5 shadow-2xl"
        :style="menuStyle"
      >
        <p class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">Add to playlist</p>
        <div v-if="showNewInput" class="px-3 py-1.5 flex items-center gap-2">
          <input
            ref="newInputRef"
            v-model="newName"
            @keydown.enter="createAndAdd"
            @keydown.escape.stop="showNewInput = false"
            @click.stop
            placeholder="Name…"
            class="flex-1 px-2 py-1 rounded bg-white/[0.08] border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
          />
          <button @click.stop="createAndAdd" class="text-accent text-xs font-medium hover:underline shrink-0">Add</button>
        </div>
        <button
          v-else
          @click.stop="beginCreate"
          class="w-full px-3 py-2 text-left text-sm text-accent hover:bg-white/[0.06] transition-colors flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Playlist
        </button>
        <div v-if="playlistStore.playlists.length > 0" class="border-t border-white/[0.06] my-1" />
        <button
          v-for="pl in playlistStore.sortedPlaylists"
          :key="pl.id"
          @click.stop="addTo(pl.id)"
          class="w-full px-3 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors truncate flex items-center justify-between"
        >
          <span class="truncate">{{ pl.name }}</span>
          <svg v-if="pl.trackIds.includes(track.id)" class="w-3.5 h-3.5 text-accent shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        </button>
      </div>
    </Teleport>

    <!-- Context menu (teleported) -->
    <Teleport to="body">
      <div v-if="showCtx" class="fixed inset-0 z-[90]" @click="showCtx = false" @contextmenu.prevent="showCtx = false" />
      <div
        v-if="showCtx"
        class="fixed z-[100] w-52 rounded-xl bg-[#1a1a2e]/95 backdrop-blur-lg border border-white/10 py-1.5 shadow-2xl"
        :style="ctxStyle"
      >
        <button
          @click.stop="doPlayNext"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
          </svg>
          Play Next
        </button>
        <button
          @click.stop="doPlayLater"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
          Play Later
        </button>
        <div class="border-t border-white/[0.06] my-1" />
        <button
          @click.stop="ctxToPlaylist"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add to Playlist…
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlist'
import { formatTime } from '@/utils/formatTime'

const props = defineProps<{
  track: Track
  index: number
}>()

defineEmits(['play'])

const player = usePlayerStore()
const playlistStore = usePlaylistStore()

const isActive = computed(() => player.currentTrack?.id === props.track.id)
const isPlaying = computed(() => isActive.value && player.isPlaying)
const coverUrl = computed(() =>
  props.track.coverArt ? window.api.getMediaUrl(props.track.coverArt) : '',
)

const showMenu = ref(false)
const showNewInput = ref(false)
const newName = ref('')
const plusBtnRef = ref<HTMLElement>()
const newInputRef = ref<HTMLInputElement>()
const menuPos = ref({ top: 0, left: 0 })

// Context menu state
const showCtx = ref(false)
const ctxPos = ref({ top: 0, left: 0 })
const ctxStyle = computed(() => ({
  top: ctxPos.value.top + 'px',
  left: ctxPos.value.left + 'px',
}))

const menuStyle = computed(() => ({
  top: menuPos.value.top + 'px',
  left: menuPos.value.left + 'px',
}))

function openMenu() {
  if (showMenu.value) { showMenu.value = false; return }
  const btn = plusBtnRef.value
  if (btn) {
    const rect = btn.getBoundingClientRect()
    menuPos.value = {
      top: Math.min(rect.bottom + 4, window.innerHeight - 280),
      left: Math.min(rect.right - 224, window.innerWidth - 240),
    }
  }
  showNewInput.value = false
  newName.value = ''
  showMenu.value = true
}

function beginCreate() {
  showNewInput.value = true
  nextTick(() => newInputRef.value?.focus())
}

async function createAndAdd() {
  const name = newName.value.trim()
  if (!name) return
  const pl = await playlistStore.createPlaylist(name)
  await playlistStore.addTracks(pl.id, [props.track.id])
  showMenu.value = false
  showNewInput.value = false
  newName.value = ''
}

async function addTo(playlistId: string) {
  await playlistStore.addTracks(playlistId, [props.track.id])
  showMenu.value = false
}

// ── Context menu ────────────────────────────────────────────
function openContextMenu(e: MouseEvent) {
  showCtx.value = false
  showMenu.value = false
  ctxPos.value = {
    top: Math.min(e.clientY, window.innerHeight - 160),
    left: Math.min(e.clientX, window.innerWidth - 220),
  }
  showCtx.value = true
}

function doPlayNext() {
  player.playNext(props.track)
  showCtx.value = false
}

function doPlayLater() {
  player.playLater(props.track)
  showCtx.value = false
}

function ctxToPlaylist() {
  showCtx.value = false
  // Open the + playlist menu at same position
  nextTick(() => {
    menuPos.value = { ...ctxPos.value }
    showNewInput.value = false
    newName.value = ''
    showMenu.value = true
  })
}
</script>
