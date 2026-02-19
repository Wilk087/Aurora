<template>
  <div v-if="artist" class="artist-view p-6 max-w-5xl mx-auto">
    <!-- Artist header -->
    <div class="flex items-start gap-6 mb-8">
      <!-- Artist image -->
      <div class="w-48 h-48 rounded-full overflow-hidden bg-white/[0.06] shrink-0 cover-shadow flex items-center justify-center">
        <img
          v-if="artistInfo?.imageUrl"
          :src="artistInfo.imageUrl"
          class="w-full h-full object-cover"
        />
        <svg v-else class="w-20 h-20 text-white/10" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      </div>

      <div class="flex-1 min-w-0 pt-4">
        <p class="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Artist</p>
        <h1 class="text-4xl font-bold text-white mb-2">{{ artist.name }}</h1>
        <div class="flex items-center gap-3 text-sm text-white/40 mb-3">
          <span>{{ artist.albums.length }} {{ artist.albums.length === 1 ? 'album' : 'albums' }}</span>
          <span>&bull;</span>
          <span>{{ artist.trackCount + featuredTracks.length }} {{ (artist.trackCount + featuredTracks.length) === 1 ? 'song' : 'songs' }}</span>
          <template v-if="artistInfo?.country">
            <span>&bull;</span>
            <span>{{ artistInfo.country }}</span>
          </template>
          <template v-if="artistInfo?.type">
            <span>&bull;</span>
            <span>{{ artistInfo.type }}</span>
          </template>
        </div>

        <!-- Tags -->
        <div v-if="artistInfo?.tags?.length" class="flex flex-wrap gap-1.5 mb-4">
          <span
            v-for="tag in artistInfo.tags"
            :key="tag"
            class="px-2.5 py-0.5 text-[10px] font-medium text-white/50 bg-white/[0.06] rounded-full"
          >
            {{ tag }}
          </span>
        </div>

        <div class="flex items-center gap-3">
          <button
            @click="playAll"
            class="px-6 py-2.5 bg-accent hover:bg-accent-hover rounded-full text-sm font-medium text-white transition-all accent-glow hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play All
          </button>
          <button
            @click="player.addToQueue(allPlayableTracks)"
            class="px-6 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] rounded-full text-sm font-medium text-white/80 transition-all"
          >
            Add to Queue
          </button>
        </div>
      </div>
    </div>

    <!-- Bio -->
    <div v-if="artistInfo?.bio" class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-3">About</h2>
      <div
        class="relative px-5 py-4 rounded-xl bg-white/[0.04] border border-white/[0.06]"
        :class="{ 'max-h-40 overflow-hidden': !bioExpanded }"
      >
        <p v-if="artistInfo.disambiguation" class="text-xs text-white/40 italic mb-2">{{ artistInfo.disambiguation }}</p>
        <p class="text-sm text-white/60 leading-relaxed whitespace-pre-line">{{ artistInfo.bio }}</p>
        <div
          v-if="!bioExpanded && (artistInfo.bio?.length || 0) > 250"
          class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0d0d1a] to-transparent pointer-events-none"
        />
      </div>
      <button
        v-if="(artistInfo.bio?.length || 0) > 250"
        @click="bioExpanded = !bioExpanded"
        class="mt-2 text-xs text-accent hover:text-accent-hover transition-colors"
      >
        {{ bioExpanded ? 'Show less' : 'Read more' }}
      </button>
    </div>

    <!-- Active years / dates -->
    <div v-if="artistInfo?.beginDate" class="mb-8 flex items-center gap-2 text-sm text-white/40">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
      <span>Active {{ artistInfo.beginDate }}{{ artistInfo.endDate ? ' — ' + artistInfo.endDate : ' — present' }}</span>
    </div>

    <!-- Albums -->
    <section v-if="albums.length > 0" class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">Albums</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div
          v-for="album in albums"
          :key="album.id"
          @click="$router.push(`/album/${album.id}`)"
          class="group cursor-pointer"
        >
          <div class="aspect-square rounded-xl overflow-hidden bg-white/[0.06] mb-2 transition-transform group-hover:scale-[1.03]">
            <img
              v-if="album.coverArt"
              :src="getCoverUrl(album.coverArt)"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-12 h-12 text-white/10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          </div>
          <p class="text-sm font-medium text-white truncate">{{ album.name }}</p>
          <p class="text-xs text-white/40">{{ album.year || '' }} &bull; {{ album.tracks.length }} tracks</p>
        </div>
      </div>
    </section>

    <!-- Singles / loose tracks -->
    <section v-if="looseTracks.length > 0" class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">Singles &amp; Loose Tracks</h2>
      <div class="space-y-0.5">
        <SongRow
          v-for="(track, i) in looseTracks"
          :key="track.id"
          :track="track"
          :index="i"
          @play="player.playAll(looseTracks, i)"
        />
      </div>
    </section>

    <!-- Appears On (featured tracks not in this artist's own albums) -->
    <section v-if="featuredTracks.length > 0" class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">Appears On</h2>
      <div class="space-y-0.5">
        <SongRow
          v-for="(track, i) in featuredTracks"
          :key="track.id"
          :track="track"
          :index="i"
          @play="player.playAll(featuredTracks, i)"
        />
      </div>
    </section>

    <!-- Loading info state -->
    <div v-if="loadingInfo" class="flex items-center gap-2 text-xs text-white/30 mt-4">
      <div class="w-3 h-3 border border-accent/30 border-t-accent rounded-full animate-spin" />
      Fetching artist information...
    </div>
  </div>

  <!-- Not found -->
  <div v-else class="flex items-center justify-center h-full">
    <p class="text-white/30">Artist not found</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useLibraryStore, type Album } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import SongRow from '@/components/SongRow.vue'
import { splitArtists } from '@/utils/splitArtists'

const route = useRoute()
const library = useLibraryStore()
const player = usePlayerStore()

const artistInfo = ref<ArtistInfo | null>(null)
const loadingInfo = ref(false)
const bioExpanded = ref(false)

const artistName = computed(() => decodeURIComponent(route.params.name as string))

const artist = computed(() => {
  return library.artists.find(a => a.name === artistName.value) || null
})

const albums = computed<Album[]>(() => {
  if (!artist.value) return []
  return [...artist.value.albums]
    .filter(a => a.tracks.length > 1)
    .sort((a, b) => (b.year || 0) - (a.year || 0))
})

const looseTracks = computed(() => {
  if (!artist.value) return []
  const singleAlbums = artist.value.albums.filter(a => a.tracks.length === 1)
  return singleAlbums.flatMap(a => a.tracks)
})

// Tracks where this artist appears as a featured/track-level artist but isn't the album artist
const featuredTracks = computed(() => {
  const name = artistName.value
  if (!name) return []
  const albumTrackIds = new Set(allTracks.value.map(t => t.id))
  return library.tracks.filter(t => {
    if (albumTrackIds.has(t.id)) return false
    return splitArtists(t.artist).some(a => a === name)
  })
})

const allTracks = computed(() => {
  if (!artist.value) return []
  return artist.value.albums.flatMap(a => a.tracks)
})

const allPlayableTracks = computed(() => [...allTracks.value, ...featuredTracks.value])

function getCoverUrl(path: string) {
  return window.api.getMediaUrl(path)
}

function playAll() {
  if (allPlayableTracks.value.length > 0) {
    player.playAll(allPlayableTracks.value)
  }
}

async function fetchArtistInfo() {
  if (!artistName.value) return
  loadingInfo.value = true
  try {
    artistInfo.value = await window.api.getArtistInfo(artistName.value)
  } catch (err) {
    console.error('Failed to fetch artist info:', err)
  } finally {
    loadingInfo.value = false
  }
}

onMounted(fetchArtistInfo)

watch(artistName, () => {
  artistInfo.value = null
  bioExpanded.value = false
  fetchArtistInfo()
})
</script>
