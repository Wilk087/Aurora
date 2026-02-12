<template>
  <Transition name="slide-up">
    <div
      v-if="count > 0"
      class="selection-bar fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 shadow-2xl"
    >
      <span class="text-sm font-medium text-white/80 tabular-nums whitespace-nowrap">
        {{ count }} selected
      </span>

      <div class="w-px h-5 bg-white/10" />

      <!-- Play Next -->
      <button
        @click="$emit('play-next')"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
        title="Play Next"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
        </svg>
        Play Next
      </button>

      <!-- Add to Queue -->
      <button
        @click="$emit('add-to-queue')"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
        title="Add to Queue"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
        Add to Queue
      </button>

      <!-- Toggle Favorites -->
      <button
        @click="toggleFavorites"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        :class="majorityFavorited ? 'text-red-400 hover:text-white/70 hover:bg-white/[0.08]' : 'text-white/70 hover:text-red-400 hover:bg-white/[0.08]'"
        :title="majorityFavorited ? 'Remove from Favorites' : 'Add to Favorites'"
      >
        <svg v-if="majorityFavorited" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
        {{ majorityFavorited ? 'Unfavorite' : 'Favorite' }}
      </button>

      <!-- Add to Playlist -->
      <div class="relative" ref="playlistBtnRef">
        <button
          @click.stop="showPlaylistMenu = !showPlaylistMenu"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
          title="Add to Playlist"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add to Playlist
        </button>

        <!-- Playlist dropdown -->
        <Teleport to="body">
          <div v-if="showPlaylistMenu" class="fixed inset-0 z-[90]" @click="showPlaylistMenu = false" />
          <div
            v-if="showPlaylistMenu"
            class="fixed z-[100] w-56 max-h-64 overflow-y-auto rounded-xl bg-[#1a1a2e]/95 backdrop-blur-lg border border-white/10 py-1.5 shadow-2xl"
            :style="playlistMenuStyle"
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
              @click.stop="addToPlaylist(pl.id)"
              class="w-full px-3 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors truncate"
            >
              {{ pl.name }}
            </button>
          </div>
        </Teleport>
      </div>

      <div class="w-px h-5 bg-white/10" />

      <!-- Select All -->
      <button
        @click="$emit('select-all')"
        class="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
      >
        Select All
      </button>

      <!-- Clear -->
      <button
        @click="$emit('clear')"
        class="w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition-all"
        title="Clear selection"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { usePlaylistStore } from '@/stores/playlist'
import { useFavoritesStore } from '@/stores/favorites'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  count: number
  trackIds: string[]
}>()

defineEmits(['play-next', 'add-to-queue', 'select-all', 'clear'])

const playlistStore = usePlaylistStore()
const favoritesStore = useFavoritesStore()
const toast = useToast()

const showPlaylistMenu = ref(false)
const showNewInput = ref(false)
const newName = ref('')
const playlistBtnRef = ref<HTMLElement>()
const newInputRef = ref<HTMLInputElement>()

const playlistMenuStyle = computed(() => {
  if (!playlistBtnRef.value) return {}
  const rect = playlistBtnRef.value.getBoundingClientRect()
  return {
    bottom: (window.innerHeight - rect.top + 8) + 'px',
    left: Math.min(rect.left, window.innerWidth - 240) + 'px',
  }
})

function beginCreate() {
  showNewInput.value = true
  nextTick(() => newInputRef.value?.focus())
}

const majorityFavorited = computed(() => {
  const favCount = props.trackIds.filter(id => favoritesStore.isFavorite(id)).length
  return favCount > props.trackIds.length / 2
})

async function toggleFavorites() {
  if (majorityFavorited.value) {
    // Remove all from favorites
    const toRemove = props.trackIds.filter(id => favoritesStore.isFavorite(id))
    for (const id of toRemove) {
      await favoritesStore.toggle(id)
    }
    toast.success(`Removed ${toRemove.length} song${toRemove.length > 1 ? 's' : ''} from Favorites`)
  } else {
    // Add all to favorites
    const toAdd = props.trackIds.filter(id => !favoritesStore.isFavorite(id))
    for (const id of toAdd) {
      await favoritesStore.toggle(id)
    }
    toast.success(`Added ${toAdd.length} song${toAdd.length > 1 ? 's' : ''} to Favorites`)
  }
}

async function createAndAdd() {
  const name = newName.value.trim()
  if (!name) return
  const pl = await playlistStore.createPlaylist(name)
  await playlistStore.addTracks(pl.id, props.trackIds)
  showPlaylistMenu.value = false
  showNewInput.value = false
  newName.value = ''
}

async function addToPlaylist(playlistId: string) {
  const pl = playlistStore.getPlaylistById(playlistId)
  const existing = pl ? props.trackIds.filter(id => pl.trackIds.includes(id)) : []
  const newTracks = props.trackIds.filter(id => !existing.includes(id))

  if (newTracks.length === 0) {
    toast.warning('All selected songs are already in this playlist')
    showPlaylistMenu.value = false
    return
  }

  await playlistStore.addTracks(playlistId, props.trackIds)

  if (existing.length > 0) {
    toast.info(`Added ${newTracks.length} song${newTracks.length > 1 ? 's' : ''} — ${existing.length} already in playlist`)
  } else {
    toast.success(`Added ${newTracks.length} song${newTracks.length > 1 ? 's' : ''} to ${pl?.name || 'playlist'}`)
  }
  showPlaylistMenu.value = false
}
</script>

<style scoped>
.slide-up-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-leave-active { transition: all 0.2s ease-in; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translate(-50%, 20px); }
.slide-up-enter-to, .slide-up-leave-from { opacity: 1; transform: translate(-50%, 0); }
</style>
