<template>
  <div class="year-view p-6">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-8">
      <button
        @click="$router.back()"
        class="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.12] flex items-center justify-center text-white/60 hover:text-white transition-all shrink-0"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <div>
        <p class="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Year</p>
        <h1 class="text-3xl font-bold text-white">{{ year }}</h1>
      </div>
    </div>

    <!-- Albums section -->
    <section v-if="yearAlbums.length > 0" class="mb-10">
      <h2 class="text-lg font-semibold text-white mb-4">Albums</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        <AlbumCard
          v-for="album in yearAlbums"
          :key="album.id"
          :album="album"
          @click="$router.push(`/album/${album.id}`)"
          @play="player.playAll(album.tracks)"
        />
      </div>
    </section>

    <!-- Songs section -->
    <section v-if="yearSongs.length > 0">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-white">Songs</h2>
        <button
          @click="player.playAll(yearSongs)"
          class="px-5 py-2 bg-accent hover:bg-accent-hover rounded-full text-sm font-medium text-white transition-all accent-glow hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play All
        </button>
      </div>
      <div class="space-y-0.5">
        <SongRow
          v-for="(track, i) in yearSongs"
          :key="track.id"
          :track="track"
          :index="i"
          @play="player.playAll(yearSongs, i)"
        />
      </div>
    </section>

    <!-- Empty state -->
    <div v-if="yearAlbums.length === 0 && yearSongs.length === 0" class="flex flex-col items-center justify-center py-20">
      <svg class="w-16 h-16 text-white/[0.06] mb-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <h2 class="text-lg font-semibold text-white/60 mb-1">Nothing found</h2>
      <p class="text-sm text-white/30">No albums or songs from {{ year }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import AlbumCard from '@/components/AlbumCard.vue'
import SongRow from '@/components/SongRow.vue'

const route = useRoute()
const library = useLibraryStore()
const player = usePlayerStore()

const year = computed(() => Number(route.params.year))

const yearAlbums = computed(() =>
  library.albums.filter(a => a.year === year.value),
)

const yearSongs = computed(() =>
  library.tracks.filter(t => t.year === year.value)
    .sort((a, b) => a.title.localeCompare(b.title)),
)
</script>
