<template>
  <div class="artists-view p-6" ref="viewRoot">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-white mb-1">Artists</h1>
        <p class="text-sm text-white/40">
          {{ filteredArtists.length }} artist{{ filteredArtists.length !== 1 ? 's' : '' }}<span v-if="library.searchQuery"> matching "{{ library.searchQuery }}"</span>
        </p>
      </div>
    </div>

    <!-- No search results -->
    <div
      v-if="library.searchQuery && filteredArtists.length === 0"
      class="flex flex-col items-center justify-center py-20"
    >
      <svg class="w-16 h-16 text-white/[0.06] mb-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <h2 class="text-lg font-semibold text-white/60 mb-1">No artists found</h2>
      <p class="text-sm text-white/30">No artists match "{{ library.searchQuery }}"</p>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="library.artists.length === 0 && !library.isScanning"
      class="flex flex-col items-center justify-center py-20"
    >
      <svg class="w-20 h-20 text-white/[0.06] mb-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
      <h2 class="text-xl font-semibold text-white/60 mb-2">No artists yet</h2>
      <p class="text-sm text-white/30 mb-6">Add a music folder to see your artists</p>
      <button
        @click="library.addFolder()"
        class="px-6 py-2.5 bg-accent hover:bg-accent-hover rounded-full text-sm font-medium text-white transition-colors accent-glow"
      >
        Add Music Folder
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="!library.libraryReady" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
      <div v-for="i in 18" :key="i" class="animate-pulse flex flex-col items-center gap-2">
        <div class="w-full aspect-square rounded-full bg-white/[0.06]" />
        <div class="h-3.5 bg-white/[0.06] rounded w-3/4" />
        <div class="h-3 bg-white/[0.04] rounded w-1/2" />
      </div>
    </div>

    <!-- Artists grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
      <div
        v-for="artist in filteredArtists"
        :key="artist.name"
        @click="goToArtist(artist.name)"
        class="group flex flex-col items-center gap-2.5 cursor-pointer"
      >
        <!-- Artist image / avatar -->
        <div class="w-full aspect-square rounded-full overflow-hidden bg-white/[0.06] relative cover-shadow transition-transform group-hover:scale-[1.02]">
          <img
            v-if="artistImages[artist.name]"
            :src="artistImages[artist.name]"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <!-- Fallback: show first album cover at 50% opacity if no artist image -->
          <img
            v-else-if="artist.albums[0]?.coverArt"
            :src="getCoverUrl(artist.albums[0].coverArt!)"
            class="w-full h-full object-cover opacity-50"
            loading="lazy"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <svg class="w-12 h-12 text-white/10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>

          <!-- Play overlay -->
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center rounded-full">
            <button
              @click.stop="playArtist(artist)"
              class="w-12 h-12 rounded-full bg-accent flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all accent-glow"
            >
              <svg class="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        </div>

        <div class="text-center w-full px-1">
          <p class="text-sm font-medium text-white truncate group-hover:text-accent transition-colors">{{ artist.name }}</p>
          <p class="text-xs text-white/40">
            {{ artist.albums.length }} {{ artist.albums.length === 1 ? 'album' : 'albums' }}
            &bull;
            {{ artist.trackCount }} {{ artist.trackCount === 1 ? 'song' : 'songs' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onActivated, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useScrollMemory } from '@/composables/useScrollMemory'
import { useLibraryStore, type Artist } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'

const library = useLibraryStore()
const player = usePlayerStore()
const router = useRouter()
const viewRoot = ref<HTMLElement | null>(null)

useScrollMemory(() => viewRoot.value?.closest('main'))

// ── Filtered artists (respects search query) ────────────────────────
function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const filteredArtists = computed(() => {
  if (!library.searchQuery) return library.artists
  const q = normalize(library.searchQuery)
  return library.artists.filter(a => normalize(a.name).includes(q))
})

// ── Lazy-load artist images from MusicBrainz cache ────────────────────────
// Using reactive<Record> so individual key assignments trigger reactivity
// without needing to replace the whole Map each time.
const artistImages = reactive<Record<string, string>>({})

async function loadArtistImages() {
  for (const artist of filteredArtists.value) {
    if (artistImages[artist.name]) continue
    try {
      const info = await window.api.getArtistInfo(artist.name)
      if (info?.imageUrl) {
        artistImages[artist.name] = info.imageUrl
      }
    } catch { /* ignore */ }
  }
}

onMounted(() => {
  if (library.libraryReady) loadArtistImages()
})

onActivated(() => {
  if (library.libraryReady) loadArtistImages()
})

// Also kick off loading when the library finishes scanning
watch(() => library.libraryReady, (ready) => {
  if (ready) loadArtistImages()
})

// ── Actions ────────────────────────────────────────────────────────────────
function getCoverUrl(path: string) {
  return window.api.getMediaUrl(path)
}

function goToArtist(name: string) {
  router.push(`/artist/${encodeURIComponent(name)}`)
}

function playArtist(artist: Artist) {
  const tracks = artist.albums.flatMap(a => a.tracks)
  if (tracks.length > 0) player.playAll(tracks)
}
</script>
