<template>
  <div class="albums-view p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-white mb-1">Albums</h1>
        <p class="text-sm text-white/40">{{ library.filteredAlbums.length }} albums<span v-if="library.searchQuery"> matching "{{ library.searchQuery }}"</span></p>
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
          Sort: {{ albumSortLabels[library.albumSortOrder] }}
          <svg class="w-3 h-3 ml-0.5 transition-transform" :class="showSortMenu ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-show="showSortMenu"
          class="absolute right-0 top-full mt-1.5 w-44 py-1.5 rounded-xl glass border border-white/[0.1] shadow-2xl z-50"
        >
          <button
            v-for="option in albumSortOptions"
            :key="option.value"
            @click="selectSort(option.value)"
            class="w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center justify-between"
            :class="library.albumSortOrder === option.value ? 'text-accent bg-white/[0.08]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'"
          >
            {{ option.label }}
            <svg v-if="library.albumSortOrder === option.value" class="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </button>
        </div>
      </div>
      </div>
    </div>

    <!-- No search results -->
    <div
      v-if="library.searchQuery && library.filteredAlbums.length === 0"
      class="flex flex-col items-center justify-center py-20"
    >
      <svg class="w-16 h-16 text-white/[0.06] mb-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <h2 class="text-lg font-semibold text-white/60 mb-1">No albums found</h2>
      <p class="text-sm text-white/30">No albums match "{{ library.searchQuery }}"</p>
    </div>

    <!-- Empty -->
    <div
      v-if="library.albums.length === 0 && !library.isScanning && !library.searchQuery"
      class="flex flex-col items-center justify-center py-20"
    >
      <svg class="w-20 h-20 text-white/[0.06] mb-6" fill="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"
        />
      </svg>
      <h2 class="text-xl font-semibold text-white/60 mb-2">No albums yet</h2>
      <p class="text-sm text-white/30 mb-6">Add a music folder to see your albums</p>
      <button
        @click="library.addFolder()"
        class="px-6 py-2.5 bg-accent hover:bg-accent-hover rounded-full text-sm font-medium text-white transition-colors accent-glow"
      >
        Add Music Folder
      </button>
    </div>

    <!-- Album grid -->
    <div
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5"
    >
      <AlbumCard
        v-for="album in library.filteredAlbums"
        :key="album.id"
        :album="album"
        @click="$router.push(`/album/${album.id}`)"
        @play="player.playAll(album.tracks)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useLibraryStore, type AlbumSortOrder } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import AlbumCard from '@/components/AlbumCard.vue'

const library = useLibraryStore()
const player = usePlayerStore()

const showSortMenu = ref(false)
const sortDropdownRef = ref<HTMLElement | null>(null)

const albumSortOptions: { value: AlbumSortOrder; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'artist', label: 'Artist' },
  { value: 'year', label: 'Year' },
  { value: 'tracks', label: 'Track Count' },
]

const albumSortLabels: Record<AlbumSortOrder, string> = {
  name: 'Name',
  artist: 'Artist',
  year: 'Year',
  tracks: 'Track Count',
}

function selectSort(order: AlbumSortOrder) {
  library.setAlbumSortOrder(order)
  showSortMenu.value = false
}

function onClickOutside(e: MouseEvent) {
  if (sortDropdownRef.value && !sortDropdownRef.value.contains(e.target as Node)) {
    showSortMenu.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))

function rescan() {
  library.rescanAll()
}
</script>
