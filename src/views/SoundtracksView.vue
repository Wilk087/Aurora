<template>
  <div class="soundtracks-view p-6" ref="viewRoot">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-white mb-1">Soundtracks</h1>
        <p class="text-sm text-white/40">
          {{ filteredAlbums.length }} album{{ filteredAlbums.length !== 1 ? 's' : '' }}<span v-if="activeTag"> tagged "{{ activeTag }}"</span>
        </p>
      </div>

      <!-- Tag filter pills -->
      <div v-if="soundtrackTags.length > 0" class="flex items-center gap-2 flex-wrap justify-end max-w-sm">
        <button
          v-for="tag in soundtrackTags"
          :key="tag"
          @click="toggleTag(tag)"
          class="px-3 py-1 rounded-full text-xs font-medium transition-all border"
          :class="activeTag === tag
            ? 'bg-accent/20 text-accent border-accent/30'
            : 'text-white/50 bg-white/[0.05] border-white/[0.08] hover:text-white/70 hover:bg-white/[0.1]'"
        >
          {{ tag }}
        </button>
        <button
          v-if="activeTag"
          @click="activeTag = null"
          class="px-3 py-1 rounded-full text-xs font-medium text-white/30 hover:text-white/60 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Empty: no soundtrack tags at all -->
    <div
      v-if="!library.isScanning && library.libraryReady && soundtrackTaggedAlbums.length === 0"
      class="flex flex-col items-center justify-center py-20"
    >
      <svg class="w-20 h-20 text-white/[0.06] mb-6" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
      </svg>
      <h2 class="text-xl font-semibold text-white/60 mb-2">No soundtracks yet</h2>
      <p class="text-sm text-white/30 mb-2">Tag albums as "soundtrack", "game ost", "anime ost", etc.</p>
      <p class="text-xs text-white/20">Right-click any album → Manage Tags</p>
    </div>

    <!-- No results for active tag filter -->
    <div
      v-else-if="library.libraryReady && activeTag && filteredAlbums.length === 0"
      class="flex flex-col items-center justify-center py-20"
    >
      <h2 class="text-lg font-semibold text-white/60 mb-1">No albums with tag "{{ activeTag }}"</h2>
      <button @click="activeTag = null" class="mt-2 text-sm text-accent hover:underline">Clear filter</button>
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="!library.libraryReady" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
      <div v-for="i in 12" :key="i" class="animate-pulse">
        <div class="aspect-square rounded-xl bg-white/[0.06]" />
        <div class="mt-2.5 h-3.5 bg-white/[0.06] rounded w-3/4" />
        <div class="mt-1.5 h-3 bg-white/[0.04] rounded w-1/2" />
      </div>
    </div>

    <!-- Albums grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
      <div v-for="item in filteredAlbums" :key="item.album.id" class="relative">
        <AlbumCard
          :album="item.album"
          @click="$router.push(`/album/${item.album.id}`)"
          @play="player.playAll(item.album.tracks)"
        />
        <!-- Tag chips under the card -->
        <div class="mt-1 flex flex-wrap gap-1 px-0.5">
          <button
            v-for="tag in item.tags"
            :key="tag"
            @click.stop="toggleTag(tag)"
            class="px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors"
            :class="activeTag === tag
              ? 'bg-accent/20 text-accent'
              : 'bg-white/[0.06] text-white/30 hover:text-white/50'"
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onActivated } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import { useTagsStore } from '@/stores/tags'
import { usePlayerStore } from '@/stores/player'
import AlbumCard from '@/components/AlbumCard.vue'

const library = useLibraryStore()
const tagsStore = useTagsStore()
const player = usePlayerStore()
const viewRoot = ref<HTMLElement | null>(null)
const activeTag = ref<string | null>(null)

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

/** All albums that have at least one album-level tag */
const soundtrackTaggedAlbums = computed(() => {
  return library.albums
    .map(album => {
      const key = `${album.name}---${album.artist}`
      const tags = tagsStore.getAlbumTags(key)
      return { album, tags }
    })
    .filter(item => item.tags.length > 0)
})

/** All unique tags currently on albums, sorted */
const soundtrackTags = computed(() => {
  const set = new Set<string>()
  for (const item of soundtrackTaggedAlbums.value) {
    for (const t of item.tags) set.add(t)
  }
  return Array.from(set).sort()
})

/** Albums filtered by the active tag chip (if any) */
const filteredAlbums = computed(() => {
  if (!activeTag.value) return soundtrackTaggedAlbums.value
  return soundtrackTaggedAlbums.value.filter(item => item.tags.includes(activeTag.value!))
})

function toggleTag(tag: string) {
  activeTag.value = activeTag.value === tag ? null : tag
}
</script>
