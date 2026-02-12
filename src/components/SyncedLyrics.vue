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
    <div v-else-if="lyrics.length === 0" class="text-center">
      <svg class="w-16 h-16 text-white/10 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
        />
      </svg>
      <p class="text-white/30 text-sm">No lyrics available</p>
      <p class="text-white/20 text-xs mt-1">No local .lrc file or online results found</p>
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
        class="lyric-line py-2 cursor-pointer transition-all duration-500 ease-out"
        :class="getLyricClass(i)"
      >
        <p class="text-center leading-relaxed" :class="getLyricTextClass(i)">
          {{ line.text || '\u266A' }}
        </p>
      </div>

      <div class="h-[40%]" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { parseLRC, findCurrentLine, type LyricLine } from '@/utils/lrcParser'

const player = usePlayerStore()

const lyrics = ref<LyricLine[]>([])
const loading = ref(false)
const searchingOnline = ref(false)
const currentLineIndex = ref(-1)
const lyricsContainer = ref<HTMLElement | null>(null)
const lineRefs = ref<Record<number, HTMLElement>>({})

// Load lyrics when track changes
watch(
  () => player.currentTrack?.path,
  async (path) => {
    lyrics.value = []
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
        lyrics.value = parseLRC(lrc)
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
        lyrics.value = parseLRC(onlineLrc)
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
</style>
