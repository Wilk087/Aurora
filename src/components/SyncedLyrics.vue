<template>
  <div class="lyrics-container h-full flex flex-col items-center justify-center overflow-hidden relative">
    <!-- Loading -->
    <div v-if="loading" class="text-white/30 text-sm">Loading lyrics...</div>

    <!-- Searching online -->
    <div v-else-if="searchingOnline" class="text-center">
      <div class="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
      <p class="text-white/40 text-sm">Searching for lyrics online...</p>
    </div>

    <!-- No lyrics -->
    <div v-else-if="lyrics.length === 0 && !plainLyricsText" class="text-center">
      <svg class="w-16 h-16 text-white/10 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
        />
      </svg>
      <p class="text-white/30 text-sm">No lyrics available</p>
      <p class="text-white/20 text-xs mt-1">No local .lrc file or online results found</p>
    </div>

    <!-- Plain / unsynced lyrics (no timestamps) -->
    <div v-else-if="lyrics.length === 0 && plainLyricsText" class="flex flex-col items-center justify-center h-full px-6">
      <div class="w-full max-w-lg overflow-y-auto max-h-[60vh] mb-6 px-4">
        <p
          v-for="(line, i) in plainLyricsLines"
          :key="i"
          class="text-center text-white/40 text-sm leading-relaxed py-1"
        >
          {{ line || '\u00A0' }}
        </p>
      </div>
      <div class="text-center">
        <p class="text-white/20 text-xs mb-3">These lyrics aren't synced yet</p>
        <button
          v-if="player.currentTrack?.source !== 'subsonic'"
          @click="showSyncer = true"
          class="px-5 py-2.5 rounded-full bg-accent hover:bg-accent-hover text-sm font-medium text-white transition-colors inline-flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Sync Lyrics
        </button>
      </div>
    </div>

    <!-- Synced lyrics -->
    <div
      v-else
      ref="lyricsContainer"
      class="lyrics-scroll w-full max-w-lg px-6 overflow-y-auto mask-gradient"
      style="max-height: 100%"
    >
      <div class="h-[40%]" />

      <div
        v-for="(line, i) in lyrics"
        :key="i"
        :ref="(el) => { if (el) lineRefs[i] = el as HTMLElement }"
        @click="seekToLine(i)"
        @click.right.prevent="toggleSelectLine(i)"
        class="lyric-line py-2 cursor-pointer transition-all duration-500 ease-out relative"
        :class="[getLyricClass(i), selectedLines.has(i) ? 'ring-1 ring-accent/40 rounded-lg bg-accent/10' : '']"
      >
        <p class="text-center leading-relaxed" :class="getLyricTextClass(i)">
          {{ line.text || '\u266A' }}
        </p>
        <!-- Selection indicator -->
        <div v-if="selectedLines.has(i)" class="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
      </div>

      <div class="h-[40%]" />
    </div>

    <!-- Selection bar -->
    <Transition name="slide-up">
      <div
        v-if="selectedLines.size > 0"
        class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-xl"
      >
        <span class="text-xs text-white/50">{{ selectedLines.size }} line{{ selectedLines.size > 1 ? 's' : '' }}</span>
        <button
          @click="openCard"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Create Card
        </button>
        <button
          @click="clearSelection"
          class="text-white/30 hover:text-white/60 transition-colors p-1"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Transition>

    <!-- Lyrics Card modal -->
    <LyricsCard
      :visible="showCard"
      :lyrics="selectedLyricsText"
      :title="player.currentTrack?.title || ''"
      :artist="player.currentTrack?.artist || ''"
      :album="player.currentTrack?.album || ''"
      :cover-url="coverUrl"
      @close="showCard = false"
    />

    <!-- LRC Syncer modal -->
    <LrcSyncer
      :visible="showSyncer"
      :plain-lyrics="plainLyricsText"
      :track-path="player.currentTrack?.path || ''"
      @close="showSyncer = false"
      @saved="onSyncSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { parseLRC, findCurrentLine, type LyricLine } from '@/utils/lrcParser'
import LyricsCard from '@/components/LyricsCard.vue'
import LrcSyncer from '@/components/LrcSyncer.vue'

const player = usePlayerStore()

const lyrics = ref<LyricLine[]>([])
const plainLyricsText = ref('')
const loading = ref(false)
const searchingOnline = ref(false)
const currentLineIndex = ref(-1)
const lyricsContainer = ref<HTMLElement | null>(null)
const lineRefs = ref<Record<number, HTMLElement>>({})
const showSyncer = ref(false)

const plainLyricsLines = computed(() => plainLyricsText.value.split('\n').map(l => l.trim()))
// Load lyrics when track changes
watch(
  () => player.currentTrack?.path,
  async (path) => {
    lyrics.value = []
    plainLyricsText.value = ''
    currentLineIndex.value = -1
    lineRefs.value = {}
    searchingOnline.value = false

    if (!path) return

    const track = player.currentTrack
    if (!track) return

    loading.value = true
    try {
      // 1. Try local .lrc file first
      const lrc = await window.api.getLyrics(path)
      if (lrc) {
        const parsed = parseLRC(lrc)
        if (parsed.length > 0) {
          lyrics.value = parsed
          return
        }
        // Local file exists but has no timestamps → treat as plain
        plainLyricsText.value = lrc
        return
      }

      // 2. Search online via LRCLIB
      loading.value = false
      searchingOnline.value = true
      const onlineLrc = await window.api.fetchOnlineLyrics({
        path: track.path,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
      })
      if (onlineLrc) {
        const parsed = parseLRC(onlineLrc)
        if (parsed.length > 0) {
          lyrics.value = parsed
        } else {
          // Got plain/unsynced lyrics from online
          plainLyricsText.value = onlineLrc
        }
      }
    } catch (err) {
      console.error('Error loading lyrics:', err)
    } finally {
      loading.value = false
      searchingOnline.value = false
    }
  },
  { immediate: true },
)

// Highlight current line (apply lyrics offset: positive = earlier = add to time)
watch(
  () => player.currentTime,
  (time) => {
    if (lyrics.value.length === 0) return
    const idx = findCurrentLine(lyrics.value, time + player.lyricsOffset)
    if (idx !== currentLineIndex.value) {
      currentLineIndex.value = idx
      scrollToLine(idx)
    }
  },
)

function scrollToLine(index: number) {
  if (index < 0) return
  nextTick(() => {
    const el = lineRefs.value[index]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

function seekToLine(index: number) {
  if (index >= 0 && index < lyrics.value.length) {
    player.seek(lyrics.value[index].time)
  }
}

function getLyricClass(index: number): string {
  if (index === currentLineIndex.value) return 'opacity-100 scale-100'
  const d = Math.abs(index - currentLineIndex.value)
  if (d === 1) return 'opacity-40'
  if (d === 2) return 'opacity-25'
  return 'opacity-15'
}

function getLyricTextClass(index: number): string {
  if (index === currentLineIndex.value) return 'text-2xl font-bold text-white text-glow'
  return 'text-lg font-medium text-white/60 hover:text-white/40'
}

// ── Lyrics selection & card ──────────────────────────────────────────
const selectedLines = ref<Set<number>>(new Set())
const showCard = ref(false)

const coverUrl = computed(() =>
  player.currentTrack?.coverArt ? window.api.getMediaUrl(player.currentTrack.coverArt) : null,
)

const selectedLyricsText = computed(() =>
  [...selectedLines.value].sort((a, b) => a - b).map((i) => lyrics.value[i]?.text || '').filter(Boolean),
)

function toggleSelectLine(index: number) {
  const next = new Set(selectedLines.value)
  if (next.has(index)) {
    next.delete(index)
  } else {
    next.add(index)
  }
  selectedLines.value = next
}

function clearSelection() {
  selectedLines.value = new Set()
}

function openCard() {
  if (selectedLines.value.size === 0) return
  showCard.value = true
}

/** Called when the LRC syncer saves, re-parse the new synced content */
function onSyncSaved(lrcContent: string) {
  showSyncer.value = false
  plainLyricsText.value = ''
  lyrics.value = parseLRC(lrcContent)
}

// Clear selection when track changes
watch(() => player.currentTrack?.path, () => {
  selectedLines.value = new Set()
  showCard.value = false
})
</script>

<style scoped>
.mask-gradient {
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
}
.lyrics-scroll::-webkit-scrollbar {
  display: none;
}
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>
