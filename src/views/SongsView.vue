<template>
  <div class="songs-view p-6 h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-white mb-1">Songs</h1>
        <p class="text-sm text-white/40">{{ library.filteredTracks.length }} songs<span v-if="library.searchQuery"> matching "{{ library.searchQuery }}"</span></p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Reload button -->
        <button
          @click="rescan"
          :disabled="library.isScanning"
          class="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/[0.15] text-white/50 hover:text-white transition-all border border-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed"
          title="Rescan library"
        >
          <svg class="w-4 h-4" :class="library.isScanning ? 'animate-spin' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M20.016 4.356v4.992" />
          </svg>
        </button>

      <!-- Sort dropdown -->
      <div class="relative" ref="sortDropdownRef">
        <button
          @click.stop="showSortMenu = !showSortMenu"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/[0.15] text-sm text-white/70 hover:text-white transition-all border border-white/[0.08]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-4.5L16.5 16.5m0 0L12 12m4.5 4.5V7.5" />
          </svg>
          Sort: {{ sortLabels[library.sortOrder] }}
          <svg class="w-3 h-3 ml-0.5 transition-transform" :class="showSortMenu ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-show="showSortMenu"
          class="absolute right-0 top-full mt-1.5 w-44 py-1.5 rounded-xl glass border border-white/[0.1] shadow-2xl z-50"
        >
          <button
            v-for="option in sortOptions"
            :key="option.value"
            @click="selectSort(option.value)"
            class="w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center justify-between"
            :class="library.sortOrder === option.value ? 'text-accent bg-white/[0.08]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'"
          >
            {{ option.label }}
            <svg v-if="library.sortOrder === option.value" class="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </button>
        </div>
      </div>
      </div>
    </div>

    <!-- No search results -->
    <div
      v-if="library.searchQuery && library.sortedTracks.length === 0"
      class="flex flex-col items-center justify-center py-20"
    >
      <svg class="w-16 h-16 text-white/[0.06] mb-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <h2 class="text-lg font-semibold text-white/60 mb-1">No songs found</h2>
      <p class="text-sm text-white/30">No songs match "{{ library.searchQuery }}"</p>
    </div>

    <!-- Empty state -->
    <div
      v-if="library.tracks.length === 0 && !library.isScanning && !library.searchQuery"
      class="flex flex-col items-center justify-center py-20"
    >
      <svg class="w-20 h-20 text-white/[0.06] mb-6" fill="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
        />
      </svg>
      <h2 class="text-xl font-semibold text-white/60 mb-2">No music yet</h2>
      <p class="text-sm text-white/30 mb-6">Add a folder to start building your library</p>
      <button
        @click="library.addFolder()"
        class="px-6 py-2.5 bg-accent hover:bg-accent-hover rounded-full text-sm font-medium text-white transition-colors accent-glow"
      >
        Add Music Folder
      </button>
    </div>

    <!-- Scanning indicator -->
    <div
      v-if="library.isScanning"
      class="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.05]"
    >
      <div class="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      <span class="text-sm text-white/60">
        Scanning... {{ library.scanProgress.current }}/{{ library.scanProgress.total }} files
      </span>
    </div>

    <!-- Song list -->
    <div v-if="library.filteredTracks.length > 0" class="flex flex-col flex-1 min-h-0">
      <!-- Column headers -->
      <div class="flex items-center gap-3 px-4 py-2 mb-1 border-b border-white/[0.06] shrink-0">
        <div class="w-8 text-center text-[10px] text-white/30 font-medium">#</div>
        <div class="w-10" />
        <div class="flex-1 text-[10px] text-white/30 font-medium uppercase tracking-wider">
          Title
        </div>
        <div
          class="w-48 hidden lg:block text-[10px] text-white/30 font-medium uppercase tracking-wider"
        >
          Album
        </div>
        <div class="w-14 text-right">
          <svg
            class="w-3.5 h-3.5 text-white/30 inline"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <div class="w-7" />
      </div>

      <!-- Virtual scrolled tracks -->
      <VirtualScroller
        :items="library.sortedTracks"
        :item-height="56"
        key-field="id"
        container-height="100%"
        class="flex-1 min-h-0"
      >
        <template #default="{ item: track, index: i }">
          <SongRow
            :track="track"
            :index="i"
            @play="playTrack(i)"
          />
        </template>
      </VirtualScroller>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useLibraryStore, type SortOrder } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import SongRow from '@/components/SongRow.vue'
import VirtualScroller from '@/components/VirtualScroller.vue'

const library = useLibraryStore()
const player = usePlayerStore()

const showSortMenu = ref(false)
const sortDropdownRef = ref<HTMLElement | null>(null)

const sortOptions: { value: SortOrder; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'artist', label: 'Artist' },
  { value: 'album', label: 'Album' },
  { value: 'year', label: 'Year' },
  { value: 'duration', label: 'Duration' },
]

const sortLabels: Record<SortOrder, string> = {
  title: 'Title',
  artist: 'Artist',
  album: 'Album',
  year: 'Year',
  duration: 'Duration',
}

function selectSort(order: SortOrder) {
  library.setSortOrder(order)
  showSortMenu.value = false
}

function onClickOutside(e: MouseEvent) {
  if (sortDropdownRef.value && !sortDropdownRef.value.contains(e.target as Node)) {
    showSortMenu.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))

function playTrack(index: number) {
  player.playAll(library.sortedTracks, index)
}

function rescan() {
  library.rescanAll()
}
</script>
