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
    <div v-else-if="lyrics.length === 0" class="text-center">
      <svg class="w-24 h-24 text-white/[0.06] mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
      <p class="text-white/20 text-xl font-light">No lyrics available</p>
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
        class="fs-lyric-line py-3 cursor-pointer"
        :class="i === currentLineIndex ? 'is-active' : (Math.abs(i - currentLineIndex) === 1 ? 'is-near' : (Math.abs(i - currentLineIndex) === 2 ? 'is-far' : 'is-hidden'))"
      >
        <p class="text-[2rem] font-extrabold leading-snug">
          {{ line.text || '♪' }}
        </p>
      </div>

      <div class="h-[45%]" />
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
      const lrc = await window.api.getLyrics(path)
      if (lrc) {
        lyrics.value = parseLRC(lrc)
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

// Highlight current line
watch(
  () => player.currentTime,
  (time) => {
    if (lyrics.value.length === 0) return
    const idx = findCurrentLine(lyrics.value, time)
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
</script>

<style scoped>
.fs-mask {
  mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%);
}
.lyrics-scroll::-webkit-scrollbar {
  display: none;
}

/* Use only opacity and transform for GPU-composited, lag-free transitions.
   No font-size or color transitions — those trigger expensive layout/paint. */
.fs-lyric-line {
  transition: opacity 0.35s ease-out, transform 0.35s ease-out;
  will-change: opacity, transform;
  color: rgba(255, 255, 255, 0.15);
  transform: scale(0.95);
}

.fs-lyric-line.is-active {
  opacity: 1;
  color: white;
  transform: scale(1);
  text-shadow: 0 0 40px rgba(139, 92, 246, 0.35), 0 0 80px rgba(139, 92, 246, 0.12);
}

.fs-lyric-line.is-near {
  opacity: 1;
  color: rgba(255, 255, 255, 0.35);
  transform: scale(0.97);
}

.fs-lyric-line.is-far {
  opacity: 1;
  color: rgba(255, 255, 255, 0.18);
  transform: scale(0.95);
}

.fs-lyric-line.is-hidden {
  opacity: 1;
  color: rgba(255, 255, 255, 0.08);
  transform: scale(0.93);
}

.fs-lyric-line:hover {
  color: rgba(255, 255, 255, 0.3);
}
</style>
