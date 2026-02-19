<template>
  <div class="fullscreen-lyrics h-full w-full flex flex-col items-center justify-center relative">
    <!-- Loading -->
    <div v-if="loading" class="text-white/30 text-lg">Loading lyrics...</div>

    <!-- Searching online -->
    <div v-else-if="searchingOnline" class="text-center">
      <div class="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
      <p class="text-white/40 text-lg">Searching for lyrics...</p>
    </div>

    <!-- No lyrics -->
    <div v-else-if="lyrics.length === 0 && !plainLyricsText" class="text-center">
      <svg class="w-24 h-24 text-white/[0.06] mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
      <p class="text-white/20 text-xl font-light">No lyrics available</p>
    </div>

    <!-- Plain / unsynced lyrics -->
    <div v-else-if="lyrics.length === 0 && plainLyricsText" class="flex flex-col items-center justify-center h-full px-16">
      <div class="w-full max-w-2xl overflow-y-auto max-h-[55vh] mb-8 px-8">
        <p
          v-for="(line, i) in plainLyricsLines"
          :key="i"
          class="text-center text-white/30 text-lg font-light leading-relaxed py-1"
        >
          {{ line || '\u00A0' }}
        </p>
      </div>
      <div class="text-center">
        <p class="text-white/15 text-sm mb-4">These lyrics aren't synced yet</p>
        <button
          v-if="player.currentTrack?.source !== 'subsonic'"
          @click="showSyncer = true"
          class="px-6 py-3 rounded-full bg-accent hover:bg-accent-hover text-base font-medium text-white transition-colors inline-flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      class="lyrics-scroll w-full max-w-2xl px-16 overflow-y-auto fs-mask"
      style="max-height: 100%"
    >
      <div class="h-[45%]" />

      <div
        v-for="(line, i) in lyrics"
        :key="i"
        :ref="(el) => { if (el) lineRefs[i] = el as HTMLElement }"
        @click="seekToLine(i)"
        @click.right.prevent="toggleSelectLine(i)"
        class="fs-lyric-line py-3 cursor-pointer relative"
        :class="[
          i === currentLineIndex ? 'is-active' : (Math.abs(i - currentLineIndex) === 1 ? 'is-near' : (Math.abs(i - currentLineIndex) === 2 ? 'is-far' : 'is-hidden')),
          selectedLines.has(i) ? 'ring-1 ring-accent/40 rounded-lg !bg-accent/10' : ''
        ]"
      >
        <p class="text-[2.5rem] font-extrabold leading-snug">
          <template v-if="line.text">{{ line.text }}</template>
          <span v-else class="inline-flex items-center gap-2 opacity-50">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
            <span class="text-xl tracking-[0.3em]">···</span>
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
          </span>
        </p>
        <div v-if="selectedLines.has(i)" class="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent" />
      </div>

      <div class="h-[45%]" />
    </div>

    <!-- Selection bar -->
    <Transition name="fs-slide-up">
      <div
        v-if="selectedLines.size > 0"
        class="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-xl"
      >
        <span class="text-sm text-white/50">{{ selectedLines.size }} line{{ selectedLines.size > 1 ? 's' : '' }}</span>
        <button
          @click="openCard"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Create Card
        </button>
        <button
          @click="clearSelection"
          class="text-white/30 hover:text-white/60 transition-colors p-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      const lrc = await window.api.getLyrics(path)
      if (lrc) {
        const parsed = parseLRC(lrc)
        if (parsed.length > 0) {
          lyrics.value = parsed
          return
        }
        plainLyricsText.value = lrc
        return
      }

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
.fs-mask {
  mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%);
}
.lyrics-scroll::-webkit-scrollbar {
  display: none;
}

.fs-lyric-line {
  transition: opacity 0.35s ease-out, transform 0.35s ease-out;
  will-change: opacity, transform;
  color: rgba(255, 255, 255, 0.15);
  transform: scale(0.95);
}

.fs-lyric-line.is-active {
  opacity: 1;
  color: white;
  transform: scale(1.08);
  text-shadow: 0 0 40px rgba(139, 92, 246, 0.35), 0 0 80px rgba(139, 92, 246, 0.12);
}

.fs-lyric-line.is-near {
  opacity: 1;
  color: rgba(255, 255, 255, 0.30);
  transform: scale(0.97);
}

.fs-lyric-line.is-far {
  opacity: 1;
  color: rgba(255, 255, 255, 0.14);
  transform: scale(0.93);
}

.fs-lyric-line.is-hidden {
  opacity: 1;
  color: rgba(255, 255, 255, 0.06);
  transform: scale(0.90);
}

.fs-lyric-line:hover {
  color: rgba(255, 255, 255, 0.3);
}

.fs-slide-up-enter-active,
.fs-slide-up-leave-active {
  transition: all 0.25s ease;
}
.fs-slide-up-enter-from,
.fs-slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>
