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

        <!-- Website + social links -->
        <div v-if="artistInfo?.website || artistInfo?.socials?.length" class="flex flex-wrap items-center gap-2 mb-4">
          <a
            v-if="artistInfo.website"
            href="#"
            @click.prevent="openExternal(artistInfo.website!)"
            class="inline-flex items-center gap-1.5 px-3 py-1 text-xs text-white/60 bg-white/[0.06] hover:bg-white/[0.10] rounded-full transition-colors"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            Website
          </a>
          <a
            v-for="social in artistInfo.socials"
            :key="social.url"
            href="#"
            @click.prevent="openExternal(social.url)"
            class="inline-flex items-center gap-1.5 px-3 py-1 text-xs text-white/60 bg-white/[0.06] hover:bg-white/[0.10] rounded-full transition-colors"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            {{ social.name }}
          </a>
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
          <button
            @click="fetchArtistInfo(true)"
            :disabled="loadingInfo"
            class="w-9 h-9 flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] rounded-full text-white/50 hover:text-white/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Refresh artist info"
          >
            <svg
              class="w-4 h-4"
              :class="{ 'animate-spin': loadingInfo }"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Bio -->
    <div v-if="artistInfo?.bio" class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-3">About</h2>
      <div
        ref="bioContainer"
        class="relative px-5 py-4 rounded-xl bg-white/[0.04] border border-white/[0.06]"
        :class="{ 'max-h-40 overflow-hidden': !bioExpanded && bioOverflows }"
      >
        <p v-if="artistInfo.disambiguation" class="text-xs text-white/40 italic mb-2">{{ artistInfo.disambiguation }}</p>
        <p class="text-sm text-white/60 leading-relaxed whitespace-pre-line">{{ artistInfo.bio }}</p>
        <div
          v-if="!bioExpanded && bioOverflows"
          class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0d0d1a] to-transparent pointer-events-none"
        />
      </div>
      <button
        v-if="bioOverflows"
        @click="bioExpanded = !bioExpanded"
        class="mt-2 text-xs text-accent hover:text-accent-hover transition-colors"
      >
        {{ bioExpanded ? 'Show less' : 'Read more' }}
      </button>
    </div>

    <!-- Band members -->
    <div v-if="artistInfo?.members?.length" class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-3">Members</h2>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="member in artistInfo.members"
          :key="member"
          @click="goToArtist(member)"
          class="px-3 py-1.5 text-sm text-white/70 bg-white/[0.06] hover:bg-white/[0.10] rounded-full transition-colors"
        >
          {{ member }}
        </button>
      </div>
    </div>

    <!-- Similar artists -->
    <div v-if="similarArtistsInLibrary.length" class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-3">Similar Artists</h2>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="similar in similarArtistsInLibrary"
          :key="similar"
          @click="goToArtist(similar)"
          class="px-3 py-1.5 text-sm text-white/70 bg-white/[0.06] hover:bg-white/[0.10] rounded-full transition-colors"
        >
          {{ similar }}
        </button>
      </div>
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
          <div class="relative aspect-square rounded-xl overflow-hidden bg-white/[0.06] mb-2 transition-transform group-hover:scale-[1.03]">
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

            <!-- Play / Stop overlay -->
            <div
              class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center"
            >
              <button
                @click.stop="togglePlayAlbum(album)"
                class="w-12 h-12 rounded-full bg-accent flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all accent-glow"
              >
                <svg v-if="isAlbumPlaying(album)" class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z" />
                </svg>
                <svg v-else class="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          </div>
          <p class="text-sm font-medium text-white truncate">{{ album.name }}</p>
          <p class="text-xs text-white/40"><span v-if="album.year" class="cursor-pointer hover:text-white/60 transition-colors" @click.stop="$router.push(`/year/${album.year}`)">{{ album.year }}</span><span v-if="album.year"> &bull; </span>{{ album.tracks.length }} tracks</p>
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

  </div>

  <!-- Not found -->
  <div v-else class="flex items-center justify-center h-full">
    <p class="text-white/30">Artist not found</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore, type Album } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import SongRow from '@/components/SongRow.vue'
import { splitArtists } from '@/utils/splitArtists'

const route = useRoute()
const router = useRouter()
const library = useLibraryStore()
const player = usePlayerStore()

const artistInfo = ref<ArtistInfo | null>(null)
const loadingInfo = ref(false)
const bioExpanded = ref(false)
const bioContainer = ref<HTMLElement | null>(null)
const bioOverflows = ref(false)

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
  // Use the same chronological order shown on the page (oldest → newest for playback,
  // which is the reverse of the display order that shows newest first)
  return [...albums.value].reverse().flatMap(a => a.tracks)
})

const allPlayableTracks = computed(() => [...allTracks.value, ...featuredTracks.value])

const localArtistNames = computed(() => new Set(library.artists.map(a => a.name)))

const similarArtistsInLibrary = computed(() =>
  (artistInfo.value?.similarArtists ?? []).filter(name => localArtistNames.value.has(name))
)

function getCoverUrl(path: string) {
  return window.api.getMediaUrl(path)
}

function openExternal(url: string) {
  window.api.openExternal(url)
}

function goToArtist(name: string) {
  router.push(`/artist/${encodeURIComponent(name)}`)
}

function isAlbumPlaying(album: Album): boolean {
  if (!player.isPlaying || !player.currentTrack) return false
  return album.tracks.some(t => t.id === player.currentTrack?.id)
}

function togglePlayAlbum(album: Album) {
  if (isAlbumPlaying(album)) {
    player.clearQueue()
  } else {
    player.playAll(album.tracks)
  }
}

function playAll() {
  if (allPlayableTracks.value.length > 0) {
    player.playAll(allPlayableTracks.value)
  }
}

async function fetchArtistInfo(forceRefresh = false) {
  if (!artistName.value) return
  loadingInfo.value = true
  try {
    artistInfo.value = await window.api.getArtistInfo(artistName.value, forceRefresh)
    await nextTick()
    bioOverflows.value = !!bioContainer.value && bioContainer.value.scrollHeight > bioContainer.value.clientHeight
  } catch (err) {
    console.error('Failed to fetch artist info:', err)
  } finally {
    loadingInfo.value = false
  }
}

onMounted(fetchArtistInfo)
onActivated(fetchArtistInfo)

watch(artistName, () => {
  artistInfo.value = null
  bioExpanded.value = false
  bioOverflows.value = false
  fetchArtistInfo()
})
</script>
