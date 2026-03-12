<template>
  <div class="p-6 h-full overflow-y-auto">
    <div class="max-w-5xl space-y-8 pb-4">

      <!-- No results -->
      <div v-if="hasNoResults" class="flex flex-col items-center justify-center py-24">
        <svg class="w-16 h-16 text-white/[0.06] mb-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <h2 class="text-lg font-semibold text-white/60 mb-1">Nothing found</h2>
        <p class="text-sm text-white/30">No results for "{{ library.searchQuery }}"</p>
      </div>

      <!-- Songs -->
      <section v-if="topSongs.length">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xs font-semibold uppercase tracking-widest text-white/40">Songs</h2>
          <button
            v-if="library.filteredTracks.length > MAX_SONGS"
            @click="router.push('/')"
            class="text-xs text-accent hover:underline transition-colors"
          >
            See all {{ library.filteredTracks.length }} →
          </button>
        </div>
        <div class="flex flex-col">
          <SongRow
            v-for="(track, i) in topSongs"
            :key="track.id"
            :track="track"
            :index="i"
            :selected="selection.isSelected(track.id)"
            :selectable="selection.hasSelection.value"
            :selected-tracks="selection.selectedItems.value"
            @play="selection.hasSelection.value ? selection.handleSelect(i, $event ?? { ctrlKey: true, metaKey: false, shiftKey: false }) : playTrack(track)"
            @select="selection.handleSelect(i, $event)"
          />
        </div>
      </section>

      <!-- Albums -->
      <section v-if="topAlbums.length">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xs font-semibold uppercase tracking-widest text-white/40">Albums</h2>
          <button
            v-if="library.filteredAlbums.length > MAX_ALBUMS"
            @click="router.push('/albums')"
            class="text-xs text-accent hover:underline transition-colors"
          >
            See all {{ library.filteredAlbums.length }} →
          </button>
        </div>
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
          <AlbumCard
            v-for="album in topAlbums"
            :key="album.id"
            :album="album"
            @click="router.push(`/album/${album.id}`)"
          />
        </div>
      </section>

      <!-- Artists -->
      <section v-if="topArtists.length">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Artists</h2>
        <div class="flex flex-wrap gap-2.5">
          <button
            v-for="artist in topArtists"
            :key="artist.name"
            @click="router.push(`/artist/${encodeURIComponent(artist.name)}`)"
            class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.06] hover:border-white/[0.12] transition-all"
          >
            <div class="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-accent/20 border border-accent/20">
              <img
                v-if="artistImages[artist.name]"
                :src="artistImages[artist.name]!"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <span class="text-sm font-bold text-accent">{{ artist.name[0]?.toUpperCase() ?? '?' }}</span>
              </div>
            </div>
            <div class="text-left min-w-0">
              <p class="text-sm font-medium text-white truncate">{{ artist.name }}</p>
              <p class="text-xs text-white/40">{{ artist.trackCount }} {{ artist.trackCount === 1 ? 'song' : 'songs' }}</p>
            </div>
          </button>
        </div>
      </section>

      <!-- Lyrics -->
      <section v-if="library.searchLyricsEnabled && topLyricsTracks.length">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">In Lyrics</h2>
        <div class="flex flex-col">
          <SongRow
            v-for="(track, i) in topLyricsTracks"
            :key="track.id"
            :track="track"
            :index="i"
            :selected="false"
            :selectable="false"
            :selected-tracks="[]"
            @play="playTrack(track)"
            @select="() => {}"
          />
        </div>
        <p v-if="lyricsSearching" class="text-xs text-white/30 mt-2 text-center">Searching lyrics…</p>
      </section>

      <!-- Playlists -->
      <section v-if="topPlaylists.length">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Playlists</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <div
            v-for="pl in topPlaylists"
            :key="pl.id"
            @click="router.push(`/playlist/${pl.id}`)"
            class="group cursor-pointer bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.10] rounded-xl p-3.5 transition-all"
          >
            <!-- Cover mosaic -->
            <div class="aspect-square rounded-lg overflow-hidden mb-3 bg-white/[0.06]">
              <div
                v-if="getPlaylistCovers(pl).length >= 4"
                class="grid grid-cols-2 h-full"
              >
                <img
                  v-for="(url, ci) in getPlaylistCovers(pl).slice(0, 4)"
                  :key="ci"
                  :src="url"
                  class="w-full h-full object-cover"
                />
              </div>
              <img
                v-else-if="getPlaylistCovers(pl).length > 0"
                :src="getPlaylistCovers(pl)[0]"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-8 h-8 text-white/10" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                </svg>
              </div>
            </div>
            <p class="text-sm font-medium text-white truncate">{{ pl.name }}</p>
            <p class="text-xs text-white/40 mt-0.5">{{ pl.trackIds.length }} {{ pl.trackIds.length === 1 ? 'song' : 'songs' }}</p>
          </div>
        </div>
      </section>

    </div>

    <!-- Selection action bar -->
    <SelectionBar
      :count="selection.selectedCount.value"
      :track-ids="selection.selectedItems.value.map(t => t.id)"
      @play-next="onPlayNextSelected"
      @add-to-queue="onAddToQueueSelected"
      @select-all="selection.selectAll()"
      @clear="selection.clearSelection()"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlist'
import { useSelection } from '@/composables/useSelection'
import SongRow from '@/components/SongRow.vue'
import AlbumCard from '@/components/AlbumCard.vue'
import SelectionBar from '@/components/SelectionBar.vue'

const router = useRouter()
const library = useLibraryStore()
const player = usePlayerStore()
const playlistStore = usePlaylistStore()

const MAX_SONGS = 5
const MAX_ALBUMS = 6
const MAX_ARTISTS = 8
const MAX_PLAYLISTS = 4

function normalizeStr(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const filteredArtists = computed(() => {
  if (!library.searchQuery) return []
  const q = normalizeStr(library.searchQuery)
  return library.artists.filter(a => normalizeStr(a.name).includes(q))
})

const filteredPlaylists = computed(() => {
  if (!library.searchQuery) return []
  const q = normalizeStr(library.searchQuery)
  return playlistStore.playlists.filter(p => normalizeStr(p.name).includes(q))
})

const topSongs = computed(() => library.filteredTracks.slice(0, MAX_SONGS))
const topAlbums = computed(() => library.filteredAlbums.slice(0, MAX_ALBUMS))
const topArtists = computed(() => filteredArtists.value.slice(0, MAX_ARTISTS))
const topPlaylists = computed(() => filteredPlaylists.value.slice(0, MAX_PLAYLISTS))

// Lyrics search — async, debounced, only runs when the setting is enabled
const lyricsMatchIds = ref<Set<string>>(new Set())
const lyricsSearching = ref(false)
let lyricsDebounce: ReturnType<typeof setTimeout> | null = null

watch(
  () => [library.searchQuery, library.searchLyricsEnabled] as const,
  ([query, enabled]) => {
    if (lyricsDebounce) clearTimeout(lyricsDebounce)
    if (!enabled || !query) {
      lyricsMatchIds.value = new Set()
      return
    }
    lyricsSearching.value = true
    lyricsDebounce = setTimeout(async () => {
      // Only search tracks not already matched by the regular search
      const alreadyMatched = new Set(library.filteredTracks.map(t => t.id))
      const candidates = library.tracks
        .filter(t => !alreadyMatched.has(t.id))
        .map(t => ({ id: t.id, path: t.path }))
      try {
        const ids = await window.api.searchLyrics(query, candidates)
        lyricsMatchIds.value = new Set(ids)
      } catch {
        lyricsMatchIds.value = new Set()
      } finally {
        lyricsSearching.value = false
      }
    }, 400)
  },
  { immediate: true },
)

const MAX_LYRICS = 5
const topLyricsTracks = computed(() => {
  if (!library.searchLyricsEnabled || !lyricsMatchIds.value.size) return []
  return library.tracks.filter(t => lyricsMatchIds.value.has(t.id)).slice(0, MAX_LYRICS)
})

// Selection — scoped to the displayed songs
const selection = useSelection(() => topSongs.value)

function onPlayNextSelected() {
  player.playNext(selection.selectedItems.value)
  selection.clearSelection()
}

function onAddToQueueSelected() {
  player.addToQueue(selection.selectedItems.value)
  selection.clearSelection()
}

function onKeyDown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
  if (e.key === 'Escape' && selection.hasSelection.value) {
    selection.clearSelection()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'a' && topSongs.value.length > 0) {
    e.preventDefault()
    selection.selectAll()
  }
}

onMounted(() => document.addEventListener('keydown', onKeyDown))
onUnmounted(() => document.removeEventListener('keydown', onKeyDown))

// Artist images — fetched on demand, disk-cached for 7 days by the main process
const artistImages = reactive<Record<string, string | null>>({})

async function fetchArtistImage(name: string) {
  if (name in artistImages) return // already fetched or in-flight
  artistImages[name] = null // sentinel: prevents duplicate requests
  try {
    const info = await window.api.getArtistInfo(name)
    artistImages[name] = info?.imageUrl ?? null
  } catch {
    artistImages[name] = null
  }
}

watch(topArtists, (artists) => {
  for (const artist of artists) fetchArtistImage(artist.name)
}, { immediate: true })

const hasNoResults = computed(() =>
  !topSongs.value.length &&
  !topAlbums.value.length &&
  !topArtists.value.length &&
  !topPlaylists.value.length &&
  !topLyricsTracks.value.length &&
  !lyricsSearching.value,
)

function playTrack(track: Track) {
  const idx = library.filteredTracks.indexOf(track)
  player.playAll(library.filteredTracks, idx >= 0 ? idx : 0)
}

function getPlaylistCovers(pl: Playlist): string[] {
  const covers: string[] = []
  for (const id of pl.trackIds) {
    const track = library.tracks.find(t => t.id === id)
    if (track?.coverArt) {
      const url = window.api.getMediaUrl(track.coverArt)
      if (!covers.includes(url)) covers.push(url)
    }
    if (covers.length >= 4) break
  }
  return covers
}
</script>
