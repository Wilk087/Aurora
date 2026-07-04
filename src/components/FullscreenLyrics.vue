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
          class="text-center text-xl font-semibold leading-loose py-1.5"
          :class="isLightBackground ? 'text-black/70' : 'text-white/80 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]'"
        >
          {{ line || '\u00A0' }}
        </p>
      </div>
      <div class="flex flex-col items-center gap-4">
        <span
          class="px-4 py-1.5 rounded-full text-xs font-medium tracking-wide"
          :class="isLightBackground ? 'bg-black/[0.1] text-black/50' : 'bg-white/[0.08] text-white/50'"
        >These lyrics aren't synced yet</span>
        <button
          v-if="player.currentTrack?.source !== 'subsonic'"
          @click="showSyncer = true"
          class="px-6 py-3 rounded-full bg-accent hover:bg-accent-hover text-base font-medium text-white transition-colors flex items-center gap-2"
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
          <!-- Enhanced LRC: word-by-word highlight for the active line -->
          <template v-if="line.words && i === currentLineIndex">
            <span
              v-for="(word, wi) in line.words"
              :key="wi"
              class="transition-colors duration-200"
              :class="wi <= currentWordIndex ? 'text-white' : 'text-white/20'"
            >{{ wi < line.words.length - 1 ? word.text + ' ' : word.text }}</span>
          </template>
          <template v-else-if="line.text">{{ line.text }}</template>
          <span v-else class="inline-flex items-center gap-2 opacity-50">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
            <span class="text-xl tracking-[0.3em]">···</span>
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
          </span>
        </p>
        <!-- Pronunciation line (romaji) -->
        <p
          v-if="line.pronunciation && line.pronunciation.toLowerCase().trim() !== line.text.toLowerCase().trim()"
          class="fs-translation-line text-xl font-semibold mt-1 italic"
        >{{ line.pronunciation }}</p>
        <!-- Translation line -->
        <p
          v-if="player.showLyricsTranslation && line.translation && line.translation.toLowerCase().trim() !== line.text.toLowerCase().trim()"
          class="fs-translation-line text-xl font-semibold mt-1"
        >{{ line.translation }}</p>
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

    <!-- Lyrics toolbar (edit / translate / toggle translation) -->
    <Transition name="fs-slide-up">
      <div
        v-if="lyrics.length > 0 && selectedLines.size === 0 && player.currentTrack?.source !== 'subsonic'"
        class="fs-toolbar absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-2 rounded-full bg-black/75 backdrop-blur-xl border border-white/10 shadow-xl"
      >
        <button
          @click="openLyricsEditor"
          class="w-8 h-8 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          title="Edit lyrics (re-sync timestamps)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
          </svg>
        </button>
        <button
          @click="showTranslationEditor = true"
          class="flex items-center gap-1.5 px-3 h-8 rounded-full text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          title="Write your own translation"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
          </svg>
          Translate
        </button>
        <button
          @click="player.setShowLyricsTranslation(!player.showLyricsTranslation)"
          class="flex items-center gap-1.5 px-3 h-8 rounded-full text-sm font-medium transition-colors"
          :class="player.showLyricsTranslation ? 'bg-accent/25 text-accent' : 'text-white/50 hover:text-white hover:bg-white/10'"
          title="Show / hide translations"
        >
          Translated
        </button>
      </div>
    </Transition>

    <!-- LRC Syncer modal -->
    <LrcSyncer
      :visible="showSyncer"
      :plain-lyrics="syncerSource"
      :track-path="player.currentTrack?.path || ''"
      @close="showSyncer = false"
      @saved="onSyncSaved"
    />

    <!-- Own-translation editor -->
    <LyricsTranslationEditor
      :visible="showTranslationEditor"
      :lyrics="lyrics"
      :track-path="player.currentTrack?.path || ''"
      @close="showTranslationEditor = false"
      @saved="onTranslationSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, inject } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { parseLRC, mergeTranslations, mergePronunciations, findCurrentLine, findCurrentWord, type LyricLine } from '@/utils/lrcParser'
import LyricsCard from '@/components/LyricsCard.vue'
import LrcSyncer from '@/components/LrcSyncer.vue'
import LyricsTranslationEditor from '@/components/LyricsTranslationEditor.vue'

const player = usePlayerStore()
const isLightBackground = inject('isLightBackground', computed(() => false))

const lyrics = ref<LyricLine[]>([])
const plainLyricsText = ref('')
const loading = ref(false)
const searchingOnline = ref(false)
const currentLineIndex = ref(-1)
const currentWordIndex = ref(-1)
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
      const local = await window.api.getLyrics(path)
      if (local) {
        if (local.lrc === '[instrumental]') return
        let parsed = parseLRC(local.lrc)
        if (parsed.length > 0) {
          if (local.translation) parsed = mergeTranslations(parsed, local.translation)
          if (local.pronunciation) parsed = mergePronunciations(parsed, local.pronunciation)
          lyrics.value = parsed
          return
        }
        plainLyricsText.value = local.lrc
        return
      }

      loading.value = false
      searchingOnline.value = true
      const online = await window.api.fetchOnlineLyrics({
        path: track.path,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
      })
      if (online) {
        let parsed = parseLRC(online.lrc)
        if (parsed.length > 0) {
          if (online.translation) parsed = mergeTranslations(parsed, online.translation)
          if (online.pronunciation) parsed = mergePronunciations(parsed, online.pronunciation)
          lyrics.value = parsed
        } else {
          plainLyricsText.value = online.lrc
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

// Highlight current line and word (apply lyrics offset: positive = earlier = add to time)
watch(
  () => player.currentTime,
  (time) => {
    if (lyrics.value.length === 0) return
    const adjusted = time + player.lyricsOffset
    const idx = findCurrentLine(lyrics.value, adjusted)
    if (idx !== currentLineIndex.value) {
      currentLineIndex.value = idx
      scrollToLine(idx)
    }
    if (idx >= 0 && lyrics.value[idx].words) {
      currentWordIndex.value = findCurrentWord(lyrics.value[idx].words!, adjusted)
    } else {
      currentWordIndex.value = -1
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

// ── Own-translation editor ───────────────────────────────────────────
const showTranslationEditor = ref(false)

/** Apply a freshly saved user translation to the displayed lyrics */
function onTranslationSaved(translationLrc: string) {
  const stripped = lyrics.value.map(l => ({ ...l, translation: undefined }))
  lyrics.value = mergeTranslations(stripped, translationLrc)
}

// ── Lyrics editor (re-sync existing lyrics through the LRC syncer) ────
/** Text fed to the syncer: unsynced lyrics as-is, or the synced lines' text */
const syncerSource = computed(() =>
  plainLyricsText.value || lyrics.value.map(l => l.text).filter(t => t.trim()).join('\n'),
)

function openLyricsEditor() {
  showSyncer.value = true
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
/* Toolbar fades in when hovering the lyrics area */
.fs-toolbar {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
.fullscreen-lyrics:hover .fs-toolbar {
  opacity: 1;
  pointer-events: auto;
}

.fs-translation-line {
  /* inherits color and transform from parent .fs-lyric-line state classes */
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
