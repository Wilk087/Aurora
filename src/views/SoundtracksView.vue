<template>
  <div class="soundtracks-view h-full flex flex-col" ref="viewRoot">
    <div class="shrink-0 view-header flex items-center justify-between px-6 py-3 border-b border-white/[0.06]">
      <div class="flex items-baseline gap-2.5 min-w-0">
        <h1 class="text-xl font-bold text-white">Soundtracks</h1>
        <p class="text-xs text-white/40 truncate">
          {{ filteredAlbums.length }} album{{ filteredAlbums.length !== 1 ? 's' : '' }}<span v-if="library.searchQuery"> matching "{{ library.searchQuery }}"</span>
        </p>
      </div>

      <!-- Tag filter dropdown -->
      <TagFilterDropdown v-if="availableTags.length > 0" v-model="activeTags" :tags="availableTags" />
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto p-6" ref="scrollEl">
      <!-- Empty: no soundtrack tags at all -->
      <EmptyState
        v-if="!library.isScanning && library.libraryReady && soundtrackTaggedAlbums.length === 0"
        title="No soundtracks yet"
        description="Tag albums with soundtrack tags from Settings → Album Display."
        large
      >
        <template #icon>
          <svg class="w-20 h-20 text-white/[0.06]" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
          </svg>
        </template>
        <p class="text-xs text-white/20 -mt-4">Right-click any album → Manage Tags</p>
      </EmptyState>

      <!-- No results for search query -->
      <div
        v-else-if="library.libraryReady && library.searchQuery && filteredAlbums.length === 0"
        class="flex flex-col items-center justify-center py-20"
      >
        <svg class="w-16 h-16 text-white/[0.06] mb-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <h2 class="text-lg font-semibold text-white/60 mb-1">No soundtracks found</h2>
        <p class="text-sm text-white/30">No soundtracks match "{{ library.searchQuery }}"</p>
      </div>

      <!-- No results for active tag filter -->
      <div
        v-else-if="library.libraryReady && activeTags.length > 0 && filteredAlbums.length === 0"
        class="flex flex-col items-center justify-center py-20"
      >
        <h2 class="text-lg font-semibold text-white/60 mb-1">No albums with the selected tags</h2>
        <button @click="activeTags = []" class="mt-2 text-sm text-accent hover:underline">Clear filter</button>
      </div>

      <!-- Loading skeleton -->
      <LoadingSkeleton v-else-if="!library.libraryReady" :count="12" />

      <!-- Albums grid -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        <div v-for="item in filteredAlbums" :key="item.album.id" class="relative">
          <AlbumCard
            :album="item.album"
            @click="$router.push(`/album/${item.album.id}`)"
            @play="player.playAll(item.album.tracks)"
          />
          <!-- Compact soundtrack tags under the card -->
          <div class="mt-1 px-0.5 relative">
            <button
              @click.stop="openAlbumTagMenu(item.album.id, $event)"
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors bg-white/[0.06] text-white/40 hover:text-white/70"
            >
              <span>{{ item.tags[0] }}</span>
              <span v-if="item.tags.length > 1" class="text-white/30">+{{ item.tags.length - 1 }}</span>
            </button>
            <Teleport to="body">
              <div v-if="openTagMenuAlbum === item.album.id" class="fixed inset-0 z-[90]" @click="openTagMenuAlbum = null" />
              <div
                v-if="openTagMenuAlbum === item.album.id"
                class="fixed z-[100] w-44 rounded-lg menu-panel p-1.5 shadow-2xl"
                :style="tagMenuStyle"
                @click.stop
              >
                <button
                  v-for="tag in item.tags"
                  :key="tag"
                  @click="openTagMenuAlbum = null; toggleTag(tag)"
                  class="w-full px-2 py-1.5 text-left text-xs rounded-md transition-colors"
                  :class="activeTags.includes(tag) ? 'bg-accent/20 text-accent' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'"
                >
                  {{ tag }}
                </button>
              </div>
            </Teleport>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useScrollMemory } from '@/composables/useScrollMemory'
import { useLibraryStore } from '@/stores/library'
import { useTagsStore } from '@/stores/tags'
import { usePlayerStore } from '@/stores/player'
import AlbumCard from '@/components/AlbumCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'
import TagFilterDropdown from '@/components/TagFilterDropdown.vue'

const library = useLibraryStore()
const tagsStore = useTagsStore()
const player = usePlayerStore()
const viewRoot = ref<HTMLElement | null>(null)
const scrollEl = ref<HTMLElement | null>(null)
const activeTags = ref<string[]>([])
const openTagMenuAlbum = ref<string | null>(null)
const tagMenuStyle = ref<Record<string, string>>({})

useScrollMemory(() => scrollEl.value)

/** All albums that have at least one album-level tag */
const soundtrackTaggedAlbums = computed(() => {
  const soundtrackSet = new Set(library.soundtrackTags)
  return library.albums
    .map(album => {
      const key = `${album.name}---${album.artist}`
      const tags = tagsStore.getAlbumTags(key)
      return { album, tags }
    })
    .filter(item => item.tags.some(t => soundtrackSet.has(t)))
})

/** All unique visible tags on soundtrack albums (not just the soundtrack tags themselves), sorted */
const availableTags = computed(() => {
  const set = new Set<string>()
  for (const item of soundtrackTaggedAlbums.value) {
    for (const t of item.tags) {
      if (tagsStore.isVisibleTag(t)) set.add(t)
    }
  }
  return Array.from(set).sort()
})

/** Strip diacritics for lenient matching, same as the library store search */
function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** Albums filtered by the global search query (if any) */
const searchedAlbums = computed(() => {
  if (!library.searchQuery) return soundtrackTaggedAlbums.value
  const q = normalize(library.searchQuery)
  return soundtrackTaggedAlbums.value.filter(item =>
    normalize(item.album.name).includes(q) ||
    normalize(item.album.artist).includes(q) ||
    item.album.tracks.some(t => normalize(t.title).includes(q)),
  )
})

/** Albums filtered by the active tags (if any) */
const filteredAlbums = computed(() => {
  if (activeTags.value.length === 0) return searchedAlbums.value
  return searchedAlbums.value.filter(item => activeTags.value.some(tag => item.tags.includes(tag)))
})

function toggleTag(tag: string) {
  if (activeTags.value.includes(tag)) {
    activeTags.value = activeTags.value.filter(t => t !== tag)
  } else {
    activeTags.value = [...activeTags.value, tag]
  }
}

function openAlbumTagMenu(albumId: string, event: MouseEvent) {
  if (openTagMenuAlbum.value === albumId) {
    openTagMenuAlbum.value = null
    return
  }
  const maxLeft = Math.max(12, window.innerWidth - 180)
  const maxTop = Math.max(12, window.innerHeight - 220)
  tagMenuStyle.value = {
    left: `${Math.min(event.clientX, maxLeft)}px`,
    top: `${Math.min(event.clientY, maxTop)}px`,
  }
  openTagMenuAlbum.value = albumId
}
</script>
