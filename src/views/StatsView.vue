<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">Aurora Wrapped</h1>
        <p class="text-sm text-white/40 mt-0.5">Your listening history</p>
      </div>

      <!-- Period filter -->
      <div class="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
        <button
          v-for="opt in periodOptions"
          :key="opt.value"
          @click="activePeriod = opt.value"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          :class="activePeriod === opt.value ? 'bg-accent/20 text-accent' : 'text-white/40 hover:text-white/70'"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="stats.plays.length === 0" class="flex flex-col items-center justify-center h-96 text-white/30">
      <svg class="w-20 h-20 mb-5" fill="none" stroke="currentColor" stroke-width="0.8" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
      <p class="text-xl font-medium mb-2">Nothing here yet</p>
      <p class="text-sm">Play some music and your history will appear here</p>
    </div>

    <template v-else>
      <!-- Stat cards -->
      <div class="grid grid-cols-3 gap-4 mb-8">
        <div class="rounded-xl bg-white/[0.04] border border-white/[0.06] p-5">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">Total Plays</p>
          <p class="text-4xl font-bold tabular-nums">{{ periodPlayCount.toLocaleString() }}</p>
          <p class="text-xs text-white/30 mt-1">tracks played</p>
        </div>
        <div class="rounded-xl bg-white/[0.04] border border-white/[0.06] p-5">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">Listening Time</p>
          <p class="text-4xl font-bold">{{ formatListeningTime(periodListeningTime) }}</p>
          <p class="text-xs text-white/30 mt-1">{{ Math.round(periodListeningTime / 60) }} minutes total</p>
        </div>
        <div class="rounded-xl bg-white/[0.04] border border-white/[0.06] p-5">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">Listening Streak</p>
          <p class="text-4xl font-bold tabular-nums">{{ streak }}</p>
          <p class="text-xs text-white/30 mt-1">day{{ streak !== 1 ? 's' : '' }} in a row</p>
        </div>
      </div>

      <!-- Top tracks + Top artists -->
      <div class="grid grid-cols-5 gap-6 mb-8">
        <!-- Top Tracks (wider) -->
        <div class="col-span-3">
          <h2 class="text-base font-semibold mb-4 text-white/80">Top Tracks</h2>
          <div class="space-y-1">
            <div
              v-for="(track, i) in topTracks"
              :key="track.key"
              class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group cursor-pointer"
              @click="goToTrackAlbum(track)"
            >
              <span class="w-5 text-right text-xs text-white/20 shrink-0 tabular-nums">{{ i + 1 }}</span>
              <!-- Cover -->
              <div class="w-9 h-9 rounded-md overflow-hidden bg-white/[0.06] shrink-0">
                <img
                  v-if="resolveTrackCover(track.key)"
                  :src="getMediaUrl(resolveTrackCover(track.key)!)"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white/20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ track.title }}</p>
                <p class="text-xs text-white/40 truncate">{{ track.artist }}</p>
              </div>
              <span class="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent/80 shrink-0 tabular-nums">
                {{ track.count }}×
              </span>
            </div>
            <p v-if="topTracks.length === 0" class="text-sm text-white/30 px-3 py-4">No plays in this period</p>
          </div>
        </div>

        <!-- Top Artists -->
        <div class="col-span-2">
          <h2 class="text-base font-semibold mb-4 text-white/80">Top Artists</h2>
          <div class="space-y-1">
            <div
              v-for="(artist, i) in topArtists"
              :key="artist.artist"
              class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
              @click="$router.push(`/artist/${encodeURIComponent(artist.artist)}`)"
            >
              <span class="w-5 text-right text-xs text-white/20 shrink-0 tabular-nums">{{ i + 1 }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ artist.artist }}</p>
                <p class="text-xs text-white/30">{{ formatListeningTime(artist.totalTime) }}</p>
              </div>
              <span class="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent/80 shrink-0 tabular-nums">
                {{ artist.count }}×
              </span>
            </div>
            <p v-if="topArtists.length === 0" class="text-sm text-white/30 px-3 py-4">No plays in this period</p>
          </div>
        </div>
      </div>

      <!-- Top Albums + Heatmap -->
      <div class="grid grid-cols-2 gap-6">
        <!-- Top Albums -->
        <div>
          <h2 class="text-base font-semibold mb-4 text-white/80">Top Albums</h2>
          <div class="space-y-1">
            <div
              v-for="(album, i) in topAlbums"
              :key="album.album + album.artist"
              class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
              @click="goToAlbum(album)"
            >
              <span class="w-5 text-right text-xs text-white/20 shrink-0 tabular-nums">{{ i + 1 }}</span>
              <div class="w-9 h-9 rounded-md overflow-hidden bg-white/[0.06] shrink-0">
                <img
                  v-if="resolveAlbumCover(album.album, album.artist)"
                  :src="getMediaUrl(resolveAlbumCover(album.album, album.artist)!)"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white/20" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" /></svg>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ album.album }}</p>
                <p class="text-xs text-white/40 truncate">{{ album.artist }}</p>
              </div>
              <span class="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent/80 shrink-0 tabular-nums">
                {{ album.count }}×
              </span>
            </div>
            <p v-if="topAlbums.length === 0" class="text-sm text-white/30 px-3 py-4">No plays in this period</p>
          </div>
        </div>

        <!-- Listening Heatmap -->
        <div>
          <h2 class="text-base font-semibold mb-4 text-white/80">Daily Activity</h2>
          <div class="overflow-x-auto">
            <!-- Month labels -->
            <div class="flex gap-[3px] mb-1 pl-[13px]">
              <span
                v-for="m in monthLabels"
                :key="m.label + m.col"
                class="text-[9px] text-white/25"
                :style="{ minWidth: (m.span * 13) + 'px' }"
              >{{ m.label }}</span>
            </div>
            <!-- Grid: 7 rows (days of week) × N cols (weeks) -->
            <div class="flex gap-[3px]">
              <!-- Day labels -->
              <div class="flex flex-col gap-[3px] mr-1">
                <span v-for="d in ['', 'M', '', 'W', '', 'F', '']" :key="d + Math.random()" class="w-3 h-3 text-[9px] text-white/25 flex items-center justify-end">{{ d }}</span>
              </div>
              <!-- Week columns -->
              <div
                v-for="(week, wi) in heatmapGrid"
                :key="wi"
                class="flex flex-col gap-[3px]"
              >
                <div
                  v-for="(cell, di) in week"
                  :key="di"
                  class="w-3 h-3 rounded-sm transition-colors"
                  :class="heatmapColor(cell.count)"
                  :title="cell.date ? `${cell.date}: ${cell.count} play${cell.count !== 1 ? 's' : ''}` : ''"
                />
              </div>
            </div>
          </div>
          <!-- Legend -->
          <div class="flex items-center gap-2 mt-3">
            <span class="text-[10px] text-white/25">Less</span>
            <div class="w-3 h-3 rounded-sm bg-white/[0.05]" />
            <div class="w-3 h-3 rounded-sm bg-accent/20" />
            <div class="w-3 h-3 rounded-sm bg-accent/50" />
            <div class="w-3 h-3 rounded-sm bg-accent" />
            <span class="text-[10px] text-white/25">More</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStatsStore, type StatsPeriod } from '@/stores/stats'
import { useLibraryStore } from '@/stores/library'
import { songKey } from '@/utils/smartPlaylistMatcher'

const router = useRouter()
const stats = useStatsStore()
const library = useLibraryStore()

const activePeriod = ref<StatsPeriod>('30d')
const periodOptions: { label: string; value: StatsPeriod }[] = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '3mo', value: '3mo' },
  { label: '1y', value: '1y' },
  { label: 'All', value: 'all' },
]

const topTracks = computed(() => stats.topTracks(activePeriod.value, 15))
const topArtists = computed(() => stats.topArtists(activePeriod.value, 10))
const topAlbums = computed(() => stats.topAlbums(activePeriod.value, 10))
const periodListeningTime = computed(() => stats.totalListeningTime(activePeriod.value))
const periodPlayCount = computed(() => {
  const cutoff = (stats as any).getPeriodCutoff?.(activePeriod.value) ?? 0
  return stats.plays.filter(e => e.ts >= cutoff).length
})
const streak = computed(() => stats.listeningStreak())

function formatListeningTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function getMediaUrl(path: string) {
  return window.api.getMediaUrl(path)
}

// Build a map: songKey → track for cover resolution
const trackByKey = computed(() => {
  const map = new Map<string, Track>()
  for (const t of library.tracks) {
    const k = songKey(t)
    if (!map.has(k)) map.set(k, t)
  }
  return map
})

function resolveTrackCover(key: string): string | null {
  return trackByKey.value.get(key)?.coverArt ?? null
}

function resolveAlbumCover(album: string, artist: string): string | null {
  const t = library.tracks.find(t =>
    t.album.toLowerCase() === album.toLowerCase() &&
    (t.artist.toLowerCase() === artist.toLowerCase() || t.albumArtist?.toLowerCase() === artist.toLowerCase())
  )
  return t?.coverArt ?? null
}

function goToTrackAlbum(track: { key: string; album: string; artist: string }) {
  const libTrack = trackByKey.value.get(track.key)
  if (!libTrack) return
  const album = library.albums.find(a =>
    a.name === libTrack.album && a.artist === (libTrack.albumArtist || libTrack.artist)
  )
  if (album) router.push(`/album/${album.id}`)
}

function goToAlbum(album: { album: string; artist: string }) {
  const found = library.albums.find(a =>
    a.name.toLowerCase() === album.album.toLowerCase() &&
    a.artist.toLowerCase() === album.artist.toLowerCase()
  )
  if (found) router.push(`/album/${found.id}`)
}

// ── Heatmap ───────────────────────────────
const heatmapGrid = computed(() => {
  const activity = stats.dailyActivity(activePeriod.value)
  const actMap = new Map(activity.map(a => [a.date, a.count]))

  // Build a grid covering the last N weeks (max 52)
  const weeks = activePeriod.value === '7d' ? 2
    : activePeriod.value === '30d' ? 5
    : activePeriod.value === '3mo' ? 13
    : 52

  const today = new Date()
  // Start on the Sunday of `weeks` ago
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - weeks * 7 + 1)
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const grid: { date: string; count: number }[][] = []
  const cur = new Date(startDate)
  while (cur <= today || grid.length < weeks) {
    const week: { date: string; count: number }[] = []
    for (let d = 0; d < 7; d++) {
      const dateStr = cur.toISOString().slice(0, 10)
      week.push({ date: dateStr, count: actMap.get(dateStr) ?? 0 })
      cur.setDate(cur.getDate() + 1)
    }
    grid.push(week)
    if (grid.length >= weeks + 1) break
  }
  return grid
})

const monthLabels = computed(() => {
  const labels: { label: string; col: number; span: number }[] = []
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  let lastMonth = -1
  heatmapGrid.value.forEach((week, wi) => {
    const month = new Date(week[0].date).getMonth()
    if (month !== lastMonth) {
      if (labels.length > 0) labels[labels.length - 1].span = wi - labels[labels.length - 1].col
      labels.push({ label: months[month], col: wi, span: 1 })
      lastMonth = month
    }
  })
  if (labels.length > 0) {
    labels[labels.length - 1].span = heatmapGrid.value.length - labels[labels.length - 1].col
  }
  return labels
})

function heatmapColor(count: number): string {
  if (count === 0) return 'bg-white/[0.05]'
  if (count <= 2) return 'bg-accent/20'
  if (count <= 5) return 'bg-accent/50'
  return 'bg-accent'
}
</script>
