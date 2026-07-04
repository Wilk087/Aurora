<template>
  <div class="home-view p-6" ref="viewRoot">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white mb-1">{{ greeting }}</h1>
      <p class="text-sm text-white/40">Here's what's playing in your library</p>
    </div>

    <!-- Empty library -->
    <EmptyState
      v-if="library.libraryReady && library.albums.length === 0 && !library.isScanning"
      title="Welcome to Aurora"
      description="Add a music folder to start building your home feed"
      large
    >
      <template #icon>
        <svg class="w-20 h-20 text-white/[0.06]" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
        </svg>
      </template>
      <button
        @click="library.addFolder()"
        class="px-6 py-2.5 bg-accent hover:bg-accent-hover rounded-full text-sm font-medium text-white transition-colors accent-glow"
      >
        Add Music Folder
      </button>
    </EmptyState>

    <!-- Loading skeleton -->
    <LoadingSkeleton v-else-if="!library.libraryReady" :count="12" />

    <template v-else>
      <HomeRow id="picks" title="Top picks for you" :albums="topPicks" />
      <HomeRow id="recent" title="Recently listened" :albums="recentlyPlayed" />
      <HomeRow
        v-if="similarSection"
        id="similar"
        :title="`Because you like ${similarSection.artist}`"
        :albums="similarSection.albums"
      />
      <HomeRow id="added" title="Recently added" :albums="recentlyAdded" />
      <HomeRow
        v-if="!topPicks.length && !recentlyPlayed.length"
        id="explore"
        title="Explore your library"
        :albums="exploreAlbums"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, type PropType } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore, type Album } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { useStatsStore } from '@/stores/stats'
import { useFavoritesStore } from '@/stores/favorites'
import { useScrollMemory } from '@/composables/useScrollMemory'
import AlbumCard from '@/components/AlbumCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'

const router = useRouter()
const library = useLibraryStore()
const player = usePlayerStore()
const stats = useStatsStore()
const favorites = useFavoritesStore()
const viewRoot = ref<HTMLElement | null>(null)

useScrollMemory(() => viewRoot.value?.closest('main'))

const ROW_SIZE = 12

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

// ── Album lookup: play events store album + track artist strings ───────
const albumsByName = computed(() => {
  const map = new Map<string, Album[]>()
  for (const a of library.albums) {
    const key = a.name.toLowerCase()
    const list = map.get(key)
    if (list) list.push(a)
    else map.set(key, [a])
  }
  return map
})

function findAlbum(name: string, artist: string): Album | null {
  const candidates = albumsByName.value.get(name.toLowerCase())
  if (!candidates?.length) return null
  const al = artist.toLowerCase()
  return (
    candidates.find(a => a.artist.toLowerCase() === al) ??
    candidates.find(a => a.tracks.some(t => t.artist.toLowerCase() === al)) ??
    candidates[0]
  )
}

// ── Recently listened: newest play events, deduped per album ───────────
const recentlyPlayed = computed(() => {
  const seen = new Set<string>()
  const out: Album[] = []
  const events = [...stats.plays].sort((a, b) => b.ts - a.ts)
  for (const e of events) {
    if (!e.album) continue
    const album = findAlbum(e.album, e.artist)
    if (!album || seen.has(album.id)) continue
    seen.add(album.id)
    out.push(album)
    if (out.length >= ROW_SIZE) break
  }
  return out
})

// ── Top picks: recent heavy rotation, all-time favorites as fallback ───
const topPicks = computed(() => {
  const seen = new Set<string>()
  const out: Album[] = []
  const add = (album: Album | null) => {
    if (album && !seen.has(album.id) && out.length < ROW_SIZE) {
      seen.add(album.id)
      out.push(album)
    }
  }
  for (const s of stats.topAlbums('3mo', 30)) add(findAlbum(s.album, s.artist))
  for (const s of stats.topAlbums('all', 30)) add(findAlbum(s.album, s.artist))
  // Fill with albums containing the most favorited tracks
  if (out.length < ROW_SIZE) {
    const favCount = new Map<string, { album: Album; count: number }>()
    for (const t of favorites.favoriteTracks) {
      const album = findAlbum(t.album, t.albumArtist || t.artist)
      if (!album) continue
      const entry = favCount.get(album.id)
      if (entry) entry.count++
      else favCount.set(album.id, { album, count: 1 })
    }
    for (const e of [...favCount.values()].sort((a, b) => b.count - a.count)) add(e.album)
  }
  return out
})

// ── Similar: other artists sharing genres with your top artist ─────────
const similarSection = computed(() => {
  const top = stats.topArtists('3mo', 1)[0] ?? stats.topArtists('all', 1)[0]
  if (!top?.artist) return null
  const artistName = top.artist
  const al = artistName.toLowerCase()

  const splitGenres = (g: string) => g.split(/[;,/|]/).map(s => s.trim().toLowerCase()).filter(Boolean)
  const genres = new Set<string>()
  for (const t of library.tracks) {
    if (t.genre && t.artist.toLowerCase().includes(al)) {
      for (const g of splitGenres(t.genre)) genres.add(g)
    }
  }
  if (genres.size === 0) return null

  const albums = library.albums
    .filter(a =>
      !a.artist.toLowerCase().includes(al) &&
      a.tracks.some(t => t.genre && splitGenres(t.genre).some(g => genres.has(g))),
    )
    .sort((a, b) => (b.year || 0) - (a.year || 0))
    .slice(0, ROW_SIZE)
  if (albums.length === 0) return null
  return { artist: artistName, albums }
})

// ── Recently added: newest albums by track addedAt ─────────────────────
const recentlyAdded = computed(() =>
  library.albums
    .map(a => ({ album: a, added: Math.max(0, ...a.tracks.map(t => t.addedAt ?? 0)) }))
    .filter(x => x.added > 0)
    .sort((x, y) => y.added - x.added)
    .slice(0, ROW_SIZE)
    .map(x => x.album),
)

// ── Fallback for fresh setups without play history ─────────────────────
const exploreAlbums = computed(() => library.albums.slice(0, ROW_SIZE))

// ── Horizontally scrollable album row ──────────────────────────────────
const rowRefs = ref<Record<string, HTMLElement>>({})

function scrollRow(id: string, dir: number) {
  const el = rowRefs.value[id]
  if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
}

const HomeRow = defineComponent({
  props: {
    id: { type: String, required: true },
    title: { type: String, required: true },
    albums: { type: Array as PropType<Album[]>, required: true },
  },
  setup(props) {
    return () => {
      if (props.albums.length === 0) return null
      const chevron = (dir: number, path: string) =>
        h('button', {
          class: 'w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/50 hover:text-white transition-colors',
          onClick: () => scrollRow(props.id, dir),
        }, [
          h('svg', { class: 'w-4 h-4', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', viewBox: '0 0 24 24' }, [
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: path }),
          ]),
        ])
      return h('section', { class: 'mb-8' }, [
        h('div', { class: 'flex items-center justify-between mb-3' }, [
          h('h2', { class: 'text-lg font-semibold text-white' }, props.title),
          h('div', { class: 'flex items-center gap-1.5' }, [
            chevron(-1, 'M15.75 19.5L8.25 12l7.5-7.5'),
            chevron(1, 'M8.25 4.5l7.5 7.5-7.5 7.5'),
          ]),
        ]),
        h('div', {
          class: 'home-row flex gap-4 overflow-x-auto pb-2 -mx-1 px-1',
          ref: (el: unknown) => { if (el) rowRefs.value[props.id] = el as HTMLElement },
        }, props.albums.map(album =>
          h('div', { key: album.id, class: 'w-40 shrink-0' }, [
            h(AlbumCard, {
              album,
              onClick: () => router.push(`/album/${album.id}`),
              onPlay: () => player.playAll(album.tracks),
            }),
          ]),
        )),
      ])
    }
  },
})
</script>

<style scoped>
.home-row {
  scrollbar-width: none;
}
.home-row::-webkit-scrollbar {
  display: none;
}
</style>
