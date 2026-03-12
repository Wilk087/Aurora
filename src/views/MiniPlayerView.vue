<template>
  <div class="w-full h-full flex flex-col select-none overflow-hidden">

    <!-- ── EXPANDED MODE ──────────────────────────────────────────── -->
    <template v-if="expanded">

      <!-- Cover block: full-width square, controls overlaid -->
      <div class="relative shrink-0 drag-region" style="width:360px;height:360px">
        <!-- Animated cover video -->
        <video
          v-show="animatedActive"
          ref="videoEl"
          class="absolute inset-0 w-full h-full object-cover"
          muted loop playsinline
        />
        <!-- Static cover -->
        <img
          v-show="!animatedActive"
          v-if="player.currentTrack?.coverArt"
          :src="coverUrl"
          class="absolute inset-0 w-full h-full object-cover"
        />
        <div
          v-if="!player.currentTrack?.coverArt && !animatedActive"
          class="absolute inset-0 bg-white/[0.06] flex items-center justify-center"
        >
          <svg class="w-16 h-16 text-white/10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>

        <!-- Bottom overlay: gradient + title/artist + controls -->
        <div class="absolute inset-x-0 bottom-0 pt-16 pb-3 px-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent no-drag">
          <p class="text-sm font-bold truncate text-white leading-tight drop-shadow">
            {{ player.currentTrack?.title ?? 'Nothing playing' }}
          </p>
          <p class="text-xs text-white/60 truncate leading-tight mt-0.5 drop-shadow mb-2">
            {{ player.currentTrack?.artist ?? '' }}
          </p>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button @click="player.previous()" class="w-8 h-8 flex items-center justify-center rounded-full text-white/70 hover:text-white transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
              </button>
              <button @click="player.togglePlay()" class="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-black hover:bg-white active:scale-95 transition-all shadow-lg">
                <svg v-if="player.isPlaying" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                <svg v-else class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </button>
              <button @click="player.next()" class="w-8 h-8 flex items-center justify-center rounded-full text-white/70 hover:text-white transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
              </button>
            </div>
            <!-- Compact / expand buttons -->
            <div class="flex items-center gap-1">
              <button @click="toggleExpanded" class="w-7 h-7 flex items-center justify-center rounded-full bg-black/30 text-white/60 hover:text-white hover:bg-black/50 transition-colors" title="Compact view">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
                </svg>
              </button>
              <button @click="exitMini" class="w-7 h-7 flex items-center justify-center rounded-full bg-black/30 text-white/60 hover:text-white hover:bg-black/50 transition-colors" title="Expand to full player">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Lyrics section -->
      <div class="flex-1 overflow-hidden relative no-drag bg-black/30">
        <!-- Loading -->
        <div v-if="lyricsLoading" class="h-full flex items-center justify-center">
          <div class="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>

        <!-- No lyrics -->
        <div v-else-if="lyricsLines.length === 0" class="h-full flex items-center justify-center">
          <p class="text-white/20 text-xs">No lyrics available</p>
        </div>

        <!-- Lyrics (synced or plain) -->
        <div
          v-else
          ref="lyricsScroll"
          class="mini-lyrics h-full overflow-y-auto px-5"
        >
          <div class="h-[40%]" />
          <div
            v-for="(line, i) in lyricsLines"
            :key="i"
            :ref="(el) => { if (el) lineEls[i] = el as HTMLElement }"
            @click="isSynced ? player.seek(line.time) : undefined"
            class="mini-lyric-line py-1.5 text-center"
            :class="[
              isSynced ? 'cursor-pointer' : '',
              !isSynced ? 'is-plain' :
              i === currentLineIndex ? 'is-active' :
              Math.abs(i - currentLineIndex) === 1 ? 'is-near' :
              Math.abs(i - currentLineIndex) === 2 ? 'is-far' : 'is-hidden'
            ]"
          >
            <span class="text-base font-extrabold leading-snug">
              {{ line.text || '···' }}
            </span>
          </div>
          <div class="h-[40%]" />
        </div>

        <!-- Fade masks -->
        <div class="absolute inset-x-0 top-0 h-10 pointer-events-none mini-lyrics-mask-top" />
        <div class="absolute inset-x-0 bottom-0 h-10 pointer-events-none mini-lyrics-mask-bottom" />
      </div>

    </template>

    <!-- ── COMPACT MODE ───────────────────────────────────────────── -->
    <template v-else>
      <div class="flex-1 flex items-center gap-2 px-2 drag-region min-w-0">
        <!-- Cover art -->
        <div class="w-14 h-14 rounded-lg overflow-hidden bg-white/10 shrink-0 no-drag">
          <img v-if="player.currentTrack?.coverArt" :src="coverUrl" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center">
            <svg class="w-5 h-5 text-white/20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        </div>

        <!-- Title + Artist -->
        <div class="flex-1 min-w-0 no-drag">
          <p class="text-xs font-semibold truncate text-white leading-tight">
            {{ player.currentTrack?.title ?? 'Nothing playing' }}
          </p>
          <p class="text-[10px] text-white/50 truncate leading-tight mt-0.5">
            {{ player.currentTrack?.artist ?? '' }}
          </p>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-1 shrink-0 no-drag">
          <button @click="player.previous()" class="w-7 h-7 flex items-center justify-center rounded-full text-white/60 hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
          </button>
          <button @click="player.togglePlay()" class="w-8 h-8 flex items-center justify-center rounded-full bg-control text-control-fg hover:scale-105 active:scale-95 transition-all">
            <svg v-if="player.isPlaying" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
            <svg v-else class="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <button @click="player.next()" class="w-7 h-7 flex items-center justify-center rounded-full text-white/60 hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
          </button>
        </div>

        <!-- Toggle expanded / exit mini -->
        <div class="flex items-center shrink-0 no-drag">
          <button @click="toggleExpanded" class="w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors" title="Lyrics view">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </button>
          <button @click="exitMini" class="w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors" title="Expand">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </button>
        </div>
      </div>
    </template>

    <!-- Progress bar (always visible) -->
    <div class="h-1 shrink-0 relative cursor-pointer no-drag" @click="onProgressClick">
      <div class="absolute inset-0 bg-white/10" />
      <div class="absolute inset-y-0 left-0 bg-accent transition-none" :style="{ width: player.progress + '%' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { parseLRC, findCurrentLine, type LyricLine } from '@/utils/lrcParser'
import Hls from 'hls.js'

const COMPACT_H = 90
const EXPANDED_H = 660

const router = useRouter()
const player = usePlayerStore()

const expanded = ref(false)
const videoEl = ref<HTMLVideoElement | null>(null)
const animatedActive = ref(false)
const lyricsScroll = ref<HTMLElement | null>(null)
const lineEls = ref<Record<number, HTMLElement>>({})

// ── Lyrics state ────────────────────────────────────────────────────
const lyricsLines = ref<LyricLine[]>([])
const isSynced = ref(false)
const lyricsLoading = ref(false)
const currentLineIndex = ref(-1)

// ── Cover ────────────────────────────────────────────────────────────
const coverUrl = computed(() =>
  player.currentTrack?.coverArt ? window.api.getMediaUrl(player.currentTrack.coverArt) : '',
)

// ── Mode toggle ──────────────────────────────────────────────────────
function toggleExpanded() {
  expanded.value = !expanded.value
  window.api.resizeMiniPlayer(expanded.value ? EXPANDED_H : COMPACT_H)
  if (expanded.value) {
    loadLyrics()
    if (player.animatedCoversEnabled && player.currentTrack) {
      fetchAnimatedCover(player.currentTrack)
    }
  } else {
    destroyHls()
  }
}

function exitMini() {
  destroyHls()
  window.api.exitMiniPlayer()
  router.push('/')
}

function onProgressClick(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  player.seekPercent((e.clientX - rect.left) / rect.width * 100)
}

// ── HLS animated cover ───────────────────────────────────────────────
let hlsInstance: Hls | null = null
let abortKey = ''

function destroyHls() {
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null }
  animatedActive.value = false
  if (videoEl.value) videoEl.value.src = ''
}

function attachHls(url: string) {
  destroyHls()
  nextTick(() => {
    const v = videoEl.value
    if (!v) return
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false, maxBufferLength: 10, maxMaxBufferLength: 30 })
      hls.loadSource(url)
      hls.attachMedia(v)
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        const avcLevels = data.levels
          .map((l: any, i: number) => ({ idx: i, codec: l.codecSet || '' }))
          .filter((l: any) => !l.codec.includes('hvc') && !l.codec.includes('hev'))
        if (avcLevels.length > 0) hls.currentLevel = avcLevels[avcLevels.length - 1].idx
        v.play().catch(() => {})
        animatedActive.value = true
      })
      hls.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) destroyHls() })
      hlsInstance = hls
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = url
      v.addEventListener('loadedmetadata', () => { v.play().catch(() => {}); animatedActive.value = true }, { once: true })
    }
  })
}

async function fetchAnimatedCover(track: Track) {
  const key = `${track.album}---${track.albumArtist || track.artist}`
  abortKey = key
  try {
    const hlsUrl = await window.api.getAnimatedCover(track.album || '', track.albumArtist || track.artist || '')
    if (abortKey !== key) return
    if (hlsUrl) attachHls(hlsUrl)
  } catch { /* ignore */ }
}

// ── Lyrics ───────────────────────────────────────────────────────────
async function loadLyrics() {
  const track = player.currentTrack
  lyricsLines.value = []
  isSynced.value = false
  currentLineIndex.value = -1
  lineEls.value = {}
  if (!track) return

  lyricsLoading.value = true
  try {
    const lrc = await window.api.getLyrics(track.path)
    if (lrc) {
      const parsed = parseLRC(lrc)
      if (parsed.length > 0) {
        lyricsLines.value = parsed
        isSynced.value = true
        return
      }
      lyricsLines.value = lrc.split('\n').filter(l => l.trim()).map(t => ({ text: t.trim(), time: 0 }))
      return
    }
    const onlineLrc = await window.api.fetchOnlineLyrics({
      path: track.path, title: track.title, artist: track.artist,
      album: track.album, duration: track.duration,
    })
    if (onlineLrc) {
      const parsed = parseLRC(onlineLrc)
      if (parsed.length > 0) {
        lyricsLines.value = parsed
        isSynced.value = true
      } else {
        lyricsLines.value = onlineLrc.split('\n').filter(l => l.trim()).map(t => ({ text: t.trim(), time: 0 }))
      }
    }
  } catch { /* ignore */ } finally {
    lyricsLoading.value = false
  }
}

watch(() => player.currentTime, (time) => {
  if (!isSynced.value || lyricsLines.value.length === 0) return
  const idx = findCurrentLine(lyricsLines.value, time + player.lyricsOffset)
  if (idx !== currentLineIndex.value) {
    currentLineIndex.value = idx
    nextTick(() => {
      const el = lineEls.value[idx]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }
})

// Reload when track changes while expanded
watch(() => player.currentTrack?.path, () => {
  if (!expanded.value) return
  loadLyrics()
  destroyHls()
  if (player.animatedCoversEnabled && player.currentTrack) {
    fetchAnimatedCover(player.currentTrack)
  }
})

watch(() => player.animatedCoversEnabled, (enabled) => {
  if (!expanded.value) return
  if (!enabled) destroyHls()
  else if (player.currentTrack) fetchAnimatedCover(player.currentTrack)
})

onUnmounted(() => { destroyHls() })
</script>

<style scoped>
.mini-lyrics::-webkit-scrollbar { display: none; }
.mini-lyrics { scrollbar-width: none; }

.mini-lyrics-mask-top {
  background: linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%);
}
.mini-lyrics-mask-bottom {
  background: linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%);
}

.mini-lyric-line {
  transition: opacity 0.35s ease-out, transform 0.35s ease-out, color 0.35s ease-out;
  will-change: opacity, transform;
  color: rgba(255, 255, 255, 0.10);
  transform: scale(0.92);
}
.mini-lyric-line.is-active {
  color: white;
  transform: scale(1.06);
  text-shadow: 0 0 30px rgba(139, 92, 246, 0.45), 0 0 60px rgba(139, 92, 246, 0.15);
}
.mini-lyric-line.is-near {
  color: rgba(255, 255, 255, 0.30);
  transform: scale(0.97);
}
.mini-lyric-line.is-far {
  color: rgba(255, 255, 255, 0.14);
  transform: scale(0.93);
}
.mini-lyric-line.is-hidden {
  color: rgba(255, 255, 255, 0.06);
  transform: scale(0.90);
}
.mini-lyric-line.is-plain {
  color: rgba(255, 255, 255, 0.55);
  transform: scale(1);
}
.mini-lyric-line:hover {
  color: rgba(255, 255, 255, 0.30);
}
</style>
