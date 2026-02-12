<template>
  <div
    v-if="player.currentTrack"
    class="fullscreen-view fixed inset-0 z-[100] select-none"
    @dblclick.self="exitFullscreen"
  >
    <!-- ── Fluid gradient background from cover colors ─────────── -->
    <div class="absolute inset-0 bg-black transition-colors duration-1000">
      <!-- Color blobs extracted from album art -->
      <div
        class="absolute inset-0 transition-all duration-[2s] ease-out"
        :style="bgStyle"
      />
      <!-- Noise / grain overlay for texture -->
      <div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 /%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 /%3E%3C/svg%3E')" />
    </div>

    <!-- ── Layout ──────────────────────────────────────────────── -->
    <div class="relative z-10 h-full flex">

      <!-- Left side: cover art + track info -->
      <div class="w-[45%] h-full flex flex-col items-center justify-center p-12 shrink-0">
        <!-- Album cover with shadow -->
        <div class="relative max-w-[420px] w-full">
          <div class="aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
            <img
              v-if="player.currentTrack.coverArt"
              :src="coverUrl"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full bg-white/[0.06] flex items-center justify-center">
              <svg class="w-32 h-32 text-white/10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Track info below cover -->
        <div class="mt-8 text-center max-w-[420px] w-full">
          <h1 class="text-3xl font-extrabold text-white leading-tight line-clamp-2">
            {{ player.currentTrack.title }}
          </h1>
          <p class="text-xl text-white/60 mt-2 font-medium">
            {{ player.currentTrack.artist }}
          </p>
          <p class="text-base text-white/30 mt-1">
            {{ player.currentTrack.album }}
          </p>
        </div>
      </div>

      <!-- Right side: lyrics -->
      <div class="flex-1 h-full flex flex-col min-w-0">
        <!-- Close / Queue buttons -->
        <div class="flex items-center justify-end gap-2 p-6 shrink-0">
          <button
            @click="showQueue = !showQueue"
            class="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
            :class="showQueue ? 'bg-white/20 text-accent' : 'bg-white/10 hover:bg-white/20 text-white/60 hover:text-white'"
            title="Queue"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          </button>
          <button
            @click="exitFullscreen"
            class="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
            title="Exit fullscreen"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          </button>
        </div>

        <!-- Synced lyrics -->
        <div class="flex-1 overflow-hidden flex items-center justify-center">
          <FullscreenLyrics />
        </div>

        <!-- Playback controls -->
        <div class="p-8 shrink-0">
          <!-- Progress bar -->
          <div class="flex items-center gap-4 mb-6">
            <span class="text-sm text-white/50 w-14 text-right tabular-nums font-mono">
              {{ formatTime(player.currentTime) }}
            </span>

            <!-- Waveform mode (fullscreen only) -->
            <div v-if="player.waveformEnabled && player.waveformData.length > 0" class="flex-1">
              <WaveformBar
                :data="player.waveformData"
                :progress="player.progress"
                :duration="player.duration"
                @seek="(p) => player.seekPercent(p)"
              />
            </div>

            <!-- Standard progress bar -->
            <div v-else-if="!player.iosSliders" class="flex-1 relative group h-2">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                :value="player.progress"
                @input="onProgressInput"
                class="fs-progress w-full h-2 rounded-full cursor-pointer relative z-10 opacity-0"
              />
              <div class="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
                <div class="w-full h-1.5 group-hover:h-2 rounded-full bg-white/15 transition-all overflow-hidden">
                  <div
                    class="h-full rounded-full bg-white/80"
                    :style="{ width: player.progress + '%' }"
                  />
                </div>
              </div>
            </div>

            <!-- iOS-style progress bar -->
            <IOSSlider
              v-else
              :value="player.progress"
              :min="0"
              :max="100"
              :step="0.1"
              size="lg"
              fill-color="bg-white/80"
              class="flex-1"
              @update="(v: number) => player.seekPercent(v)"
            />

            <span class="text-sm text-white/50 w-14 tabular-nums font-mono">
              {{ formatTime(player.duration) }}
            </span>
          </div>

          <!-- Transport + Volume controls -->
          <div class="flex items-center justify-center gap-6">
            <button
              @click="player.toggleShuffle()"
              class="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
              :class="player.isShuffle ? 'text-accent' : 'text-white/30 hover:text-white/60'"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
              </svg>
            </button>

            <button
              @click="player.previous()"
              class="w-12 h-12 flex items-center justify-center rounded-full text-white/60 hover:text-white transition-colors"
            >
              <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button
              @click="player.togglePlay()"
              class="w-16 h-16 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-transform shadow-xl"
            >
              <svg v-if="player.isPlaying" class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              <svg v-else class="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>

            <button
              @click="player.next()"
              class="w-12 h-12 flex items-center justify-center rounded-full text-white/60 hover:text-white transition-colors"
            >
              <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>

            <button
              @click="player.cycleRepeat()"
              class="w-10 h-10 flex items-center justify-center rounded-full transition-colors relative"
              :class="player.repeatMode !== 'off' ? 'text-accent' : 'text-white/30 hover:text-white/60'"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              </svg>
              <span v-if="player.repeatMode === 'one'" class="absolute -top-0.5 -right-0.5 text-[9px] font-bold text-accent">1</span>
            </button>

            <!-- Volume -->
            <div class="flex items-center gap-2 ml-2">
              <button
                @click="player.toggleMute()"
                class="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors"
              >
                <svg v-if="player.isMuted || player.volume === 0" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
                <svg v-else-if="player.volume < 0.5" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              </button>

              <div class="w-24 relative group" v-if="!player.iosSliders">
                <input
                  type="range" min="0" max="1" step="0.01"
                  :value="player.volume" @input="onVolumeInput"
                  class="fs-volume w-full cursor-pointer relative z-10"
                />
                <div class="absolute top-1/2 left-0 -translate-y-1/2 h-[3px] rounded-full bg-white/15 w-full pointer-events-none" />
                <div class="absolute top-1/2 left-0 -translate-y-1/2 h-[3px] rounded-full bg-white/70 pointer-events-none" :style="{ width: player.volume * 100 + '%' }" />
              </div>
              <IOSSlider v-else :value="player.volume" :min="0" :max="1" :step="0.01" class="w-24" @update="(v: number) => player.setVolume(v)" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Keyboard hint -->
    <div class="absolute top-6 left-6 text-white/20 text-xs font-mono opacity-0 hover:opacity-100 transition-opacity">
      ESC or F11 to exit
    </div>

    <!-- Queue Panel -->
    <QueuePanel :show="showQueue" @close="showQueue = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { formatTime } from '@/utils/formatTime'
import FullscreenLyrics from '@/components/FullscreenLyrics.vue'
import QueuePanel from '@/components/QueuePanel.vue'
import WaveformBar from '@/components/WaveformBar.vue'
import IOSSlider from '@/components/IOSSlider.vue'

const router = useRouter()
const player = usePlayerStore()
const showQueue = ref(false)

const coverUrl = computed(() =>
  player.currentTrack?.coverArt ? window.api.getMediaUrl(player.currentTrack.coverArt) : '',
)

// ── Extract dominant colors from cover art for fluid background ──────────
const colors = ref<{ c1: string; c2: string; c3: string; c4: string }>({
  c1: 'rgba(30,10,40,1)',
  c2: 'rgba(15,5,30,1)',
  c3: 'rgba(40,15,50,1)',
  c4: 'rgba(10,5,20,1)',
})

const bgStyle = computed(() => ({
  background: `
    radial-gradient(ellipse 80% 70% at 15% 60%, ${colors.value.c1} 0%, transparent 70%),
    radial-gradient(ellipse 70% 80% at 85% 30%, ${colors.value.c2} 0%, transparent 65%),
    radial-gradient(ellipse 60% 50% at 50% 90%, ${colors.value.c3} 0%, transparent 60%),
    radial-gradient(ellipse 90% 60% at 30% 10%, ${colors.value.c4} 0%, transparent 70%)
  `,
}))

function extractColors(src: string) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = src
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 16
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0, 16, 16)
    const data = ctx.getImageData(0, 0, 16, 16).data

    // Sample 4 quadrants for different color regions
    const quadrants = [
      { sx: 0, sy: 0, ex: 8, ey: 8 },    // top-left
      { sx: 8, sy: 0, ex: 16, ey: 8 },   // top-right
      { sx: 0, sy: 8, ex: 8, ey: 16 },   // bottom-left
      { sx: 8, sy: 8, ex: 16, ey: 16 },  // bottom-right
    ]

    const extracted = quadrants.map((q) => {
      let r = 0, g = 0, b = 0, count = 0
      for (let y = q.sy; y < q.ey; y++) {
        for (let x = q.sx; x < q.ex; x++) {
          const i = (y * 16 + x) * 4
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
        }
      }
      if (count === 0) return 'rgba(20,10,30,0.9)'
      // Darken and saturate for a moody look
      const dr = Math.round((r / count) * 0.45)
      const dg = Math.round((g / count) * 0.35)
      const db = Math.round((b / count) * 0.5)
      return `rgba(${dr},${dg},${db},0.9)`
    })

    colors.value = { c1: extracted[0], c2: extracted[1], c3: extracted[2], c4: extracted[3] }
  }
}

watch(coverUrl, (url) => { if (url) extractColors(url) }, { immediate: true })

function onProgressInput(e: Event) {
  player.seekPercent(parseFloat((e.target as HTMLInputElement).value))
}

function onVolumeInput(e: Event) {
  player.setVolume(parseFloat((e.target as HTMLInputElement).value))
}

function exitFullscreen() {
  window.api.exitFullscreen()
  router.back()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'F11') {
    e.preventDefault()
    exitFullscreen()
  } else if (e.key === ' ') {
    e.preventDefault()
    player.togglePlay()
  } else if (e.key === 'ArrowRight') {
    player.next()
  } else if (e.key === 'ArrowLeft') {
    player.previous()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    player.setVolume(Math.min(1, player.volume + 0.05))
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    player.setVolume(Math.max(0, player.volume - 0.05))
  }
}

onMounted(() => {
  window.api.enterFullscreen()
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.fs-progress {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
}
.fs-progress::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}
.group:hover .fs-progress::-webkit-slider-thumb {
  opacity: 1;
}

.fs-volume {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  height: 3px;
}
.fs-volume::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}
.group:hover .fs-volume::-webkit-slider-thumb {
  opacity: 1;
}
</style>
