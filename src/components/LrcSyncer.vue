<template>
  <Teleport to="body">
  <Transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
      data-lrc-syncer-active
      @keydown="onKeyDown"
    >
      <div class="w-full max-w-xl mx-4 bg-[var(--bg-tertiary)] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h3 class="text-lg font-semibold text-white">Sync Lyrics</h3>
            <p class="text-xs text-white/40 mt-0.5">
              <kbd class="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono text-[10px]">Space</kbd>
              {{ elrcMode ? 'stamp word' : 'stamp line' }} ·
              <kbd class="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono text-[10px]">Tab</kbd> add instrumental
            </p>
          </div>
          <div class="flex items-center gap-2">
            <!-- ELRC mode toggle -->
            <button
              @click="toggleElrcMode"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              :class="elrcMode
                ? 'bg-accent/20 text-accent border border-accent/40'
                : 'bg-white/[0.06] text-white/40 hover:bg-white/[0.10] hover:text-white/60'"
              :title="elrcMode ? 'Switch to standard LRC' : 'Switch to Enhanced LRC (word-level)'"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h6m-6 4h4" />
              </svg>
              {{ elrcMode ? 'Enhanced' : 'Standard' }}
            </button>
            <button
              @click="close"
              class="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="px-6 pt-3 pb-1">
          <div class="flex items-center justify-between text-xs text-white/40 mb-1">
            <span>{{ formatTime(currentTime) }}</span>
            <span v-if="elrcMode">{{ stampedElrcWords }} / {{ totalElrcWords }} words stamped</span>
            <span v-else>{{ stampedCount }} / {{ lines.length }} lines stamped</span>
            <span>{{ formatTime(duration) }}</span>
          </div>
          <div class="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              class="h-full rounded-full bg-accent transition-all duration-300"
              :style="{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }"
            />
          </div>
        </div>

        <!-- Controls -->
        <div class="flex items-center justify-center gap-3 px-6 py-3">
          <button
            @click="seekBack"
            class="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
            title="Rewind 5s"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
            </svg>
          </button>

          <button
            @click="togglePlayback"
            class="w-12 h-12 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center transition-colors"
          >
            <svg v-if="!isPlaying" class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <svg v-else class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </button>

          <button
            @click="seekForward"
            class="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
            title="Forward 5s"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.5 8c2.65 0 5.05.99 6.9 2.6L22 7v9h-9l3.62-3.62c-1.39-1.16-3.16-1.88-5.12-1.88-3.54 0-6.55 2.31-7.6 5.5l-2.37-.78C2.92 11.03 6.85 8 11.5 8z" />
            </svg>
          </button>

          <div class="ml-4 flex items-center gap-2">
            <button
              @click="handleAddInstrumental"
              class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.08] hover:bg-white/[0.12] text-white/60 hover:text-white/80 transition-all"
              title="Add instrumental/empty line (Tab)"
            >
              ♪ Instrumental
            </button>
            <button
              @click="handleUndo"
              :disabled="elrcMode ? stampedElrcWords === 0 : stampedCount === 0"
              class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.08] hover:bg-white/[0.12] text-white/60 hover:text-white/80 disabled:opacity-30 transition-all"
            >
              Undo
            </button>
            <button
              @click="handleReset"
              :disabled="elrcMode ? stampedElrcWords === 0 : stampedCount === 0"
              class="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 disabled:opacity-30 transition-all"
            >
              Reset
            </button>
          </div>
        </div>

        <!-- Lyrics lines -->
        <div
          ref="scrollContainer"
          class="flex-1 overflow-y-auto px-6 pb-4 scroll-smooth"
        >
          <div class="h-20" />

          <!-- ── Standard LRC mode ── -->
          <template v-if="!elrcMode">
            <div
              v-for="(line, i) in lines"
              :key="i"
              :ref="el => { if (el) lineElRefs[i] = el as HTMLElement }"
              class="py-2 px-4 rounded-xl transition-all duration-200 cursor-pointer"
              :class="getLineClass(i)"
              @click="stampLine(i)"
            >
              <div class="flex items-center gap-3">
                <span
                  class="text-[10px] font-mono min-w-[52px] text-center px-1.5 py-0.5 rounded"
                  :class="line.time !== null ? 'bg-accent/20 text-accent' : 'bg-white/5 text-white/20'"
                >
                  {{ line.time !== null ? formatTime(line.time) : '--:--' }}
                </span>
                <p v-if="line.text" class="text-sm leading-relaxed" :class="getTextClass(i)">
                  {{ line.text }}
                </p>
                <p v-else class="text-sm leading-relaxed italic" :class="getTextClass(i)">
                  <span class="opacity-50">♪ instrumental</span>
                </p>
              </div>
            </div>
          </template>

          <!-- ── Enhanced LRC mode ── -->
          <template v-else>
            <div
              v-for="(line, li) in elrcLines"
              :key="li"
              :ref="el => { if (el) lineElRefs[li] = el as HTMLElement }"
              class="py-2 px-4 rounded-xl transition-all duration-200"
              :class="getElrcLineClass(li)"
            >
              <div class="flex items-start gap-3">
                <span
                  class="text-[10px] font-mono min-w-[52px] text-center px-1.5 py-0.5 rounded mt-0.5 shrink-0"
                  :class="line.time !== null ? 'bg-accent/20 text-accent' : 'bg-white/5 text-white/20'"
                >
                  {{ line.time !== null ? formatTime(line.time) : '--:--' }}
                </span>
                <!-- Instrumental -->
                <p v-if="line.isInstrumental" class="text-sm leading-relaxed italic text-white/50">
                  ♪ instrumental
                </p>
                <!-- Words as chips -->
                <div v-else class="flex flex-wrap gap-1.5 py-0.5">
                  <span
                    v-for="(word, wi) in line.words"
                    :key="wi"
                    class="text-sm px-2 py-0.5 rounded-md cursor-pointer transition-all duration-150 select-none"
                    :class="getElrcWordClass(li, wi)"
                    @click="stampElrcAt(li, wi)"
                  >
                    {{ word.text }}
                  </span>
                </div>
              </div>
            </div>
          </template>

          <div class="h-40" />
        </div>

        <!-- Footer: save actions -->
        <div class="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
          <p class="text-xs text-white/30">
            <template v-if="elrcMode">
              {{ allElrcStamped ? 'All words stamped — ready to save!' : 'Stamp all words to save' }}
            </template>
            <template v-else>
              {{ allStamped ? 'All lines stamped — ready to save!' : 'Stamp all lines to save' }}
            </template>
          </p>
          <div class="flex items-center gap-2">
            <button
              @click="close"
              class="px-4 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-all"
            >
              Cancel
            </button>
            <button
              @click="saveLrc"
              :disabled="(elrcMode ? !allElrcStamped : !allStamped) || saving"
              class="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
            >
              {{ saving ? 'Saving...' : (elrcMode ? 'Save Enhanced LRC' : 'Save .lrc') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useToast } from '@/composables/useToast'

// ── Standard LRC types ────────────────────────────────────────────────
interface SyncLine {
  text: string
  time: number | null
}

// ── Enhanced LRC types ────────────────────────────────────────────────
interface ElrcWord {
  text: string
  time: number | null
}

interface ElrcLine {
  words: ElrcWord[]
  time: number | null  // equals first word's time, auto-set on stamp
  isInstrumental: boolean
}

const props = defineProps<{
  visible: boolean
  plainLyrics: string
  trackPath: string
}>()

const emit = defineEmits<{
  close: []
  saved: [lrcContent: string]
}>()

const player = usePlayerStore()
const toast = useToast()

// ── Shared state ──────────────────────────────────────────────────────
const saving = ref(false)
const scrollContainer = ref<HTMLElement | null>(null)
const lineElRefs = ref<Record<number, HTMLElement>>({})

const currentTime = computed(() => player.currentTime)
const duration = computed(() => player.duration)
const isPlaying = computed(() => player.isPlaying)

// ── ELRC mode toggle (persisted) ──────────────────────────────────────
const elrcMode = ref(localStorage.getItem('lrcSyncer.elrcMode') === 'true')

function toggleElrcMode() {
  elrcMode.value = !elrcMode.value
  localStorage.setItem('lrcSyncer.elrcMode', String(elrcMode.value))
  if (props.visible) initLines()
}

// ── Standard LRC state ────────────────────────────────────────────────
const lines = ref<SyncLine[]>([])
const currentStampIndex = ref(0)

const stampedCount = computed(() => lines.value.filter(l => l.time !== null).length)
const allStamped = computed(() => lines.value.length > 0 && lines.value.every(l => l.time !== null))

// ── Enhanced LRC state ────────────────────────────────────────────────
const elrcLines = ref<ElrcLine[]>([])
const elrcCurrentLine = ref(0)
const elrcCurrentWord = ref(0)

const totalElrcWords = computed(() =>
  elrcLines.value.reduce((sum, l) => sum + (l.isInstrumental ? 1 : l.words.length), 0),
)
const stampedElrcWords = computed(() =>
  elrcLines.value.reduce((sum, l) => {
    if (l.isInstrumental) return sum + (l.time !== null ? 1 : 0)
    return sum + l.words.filter(w => w.time !== null).length
  }, 0),
)
const allElrcStamped = computed(() =>
  elrcLines.value.length > 0 && stampedElrcWords.value === totalElrcWords.value,
)

// Toggle lrcSyncMode on the player so the track pauses at the end
watch(
  () => props.visible,
  (vis) => { player.lrcSyncMode = vis },
  { immediate: true },
)

// Parse plain lyrics when visible/lyrics change
watch(
  () => [props.visible, props.plainLyrics],
  () => {
    if (props.visible && props.plainLyrics) initLines()
  },
  { immediate: true },
)

function initLines() {
  lineElRefs.value = {}
  if (elrcMode.value) {
    elrcLines.value = props.plainLyrics
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(l => ({
        words: l.split(/\s+/).filter(w => w.length > 0).map(w => ({ text: w, time: null })),
        time: null,
        isInstrumental: false,
      }))
    elrcCurrentLine.value = 0
    elrcCurrentWord.value = 0
  } else {
    lines.value = props.plainLyrics
      .split('\n')
      .map(text => text.trim())
      .filter(text => text.length > 0)
      .map(text => ({ text, time: null }))
    currentStampIndex.value = 0
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

function scrollToRef(index: number) {
  nextTick(() => {
    const el = lineElRefs.value[index]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

// ── Standard LRC methods ──────────────────────────────────────────────

function stampLine(index: number) {
  if (index < 0 || index >= lines.value.length) return
  lines.value[index].time = currentTime.value
  let next = index + 1
  while (next < lines.value.length && lines.value[next].time !== null) next++
  currentStampIndex.value = Math.min(next, lines.value.length - 1)
  scrollToRef(currentStampIndex.value)
}

function stampNext() {
  let idx = currentStampIndex.value
  while (idx < lines.value.length && lines.value[idx].time !== null) idx++
  if (idx < lines.value.length) stampLine(idx)
}

function addInstrumentalLine() {
  const idx = currentStampIndex.value
  lines.value.splice(idx, 0, { text: '', time: currentTime.value })
  lineElRefs.value = {}
  let next = idx + 1
  while (next < lines.value.length && lines.value[next].time !== null) next++
  currentStampIndex.value = Math.min(next, lines.value.length - 1)
  scrollToRef(currentStampIndex.value)
}

function undoLast() {
  for (let i = lines.value.length - 1; i >= 0; i--) {
    if (lines.value[i].time !== null) {
      lines.value[i].time = null
      currentStampIndex.value = i
      scrollToRef(i)
      return
    }
  }
}

function resetAll() {
  lines.value = lines.value.filter(l => l.text.length > 0)
  for (const line of lines.value) line.time = null
  currentStampIndex.value = 0
  lineElRefs.value = {}
  scrollToRef(0)
}

function buildLrc(): string {
  return [...lines.value]
    .filter(l => l.time !== null)
    .sort((a, b) => a.time! - b.time!)
    .map(line => {
      const t = line.time!
      const ts = `[${formatTime(t)}]`
      return line.text ? `${ts} ${line.text}` : ts
    })
    .join('\n')
}

// ── Enhanced LRC methods ──────────────────────────────────────────────

function stampElrcNext() {
  const li = elrcCurrentLine.value
  if (li >= elrcLines.value.length) return
  const line = elrcLines.value[li]

  if (line.isInstrumental) {
    line.time = currentTime.value
    elrcCurrentLine.value++
    elrcCurrentWord.value = 0
    scrollToRef(elrcCurrentLine.value)
    return
  }

  const wi = elrcCurrentWord.value
  if (wi >= line.words.length) return

  line.words[wi].time = currentTime.value
  if (wi === 0) line.time = currentTime.value

  if (wi + 1 < line.words.length) {
    elrcCurrentWord.value++
  } else {
    elrcCurrentLine.value++
    elrcCurrentWord.value = 0
    scrollToRef(elrcCurrentLine.value)
  }
}

function stampElrcAt(lineIdx: number, wordIdx: number) {
  const line = elrcLines.value[lineIdx]
  if (!line || line.isInstrumental || wordIdx >= line.words.length) return

  line.words[wordIdx].time = currentTime.value
  if (wordIdx === 0) line.time = currentTime.value

  // Advance cursor to the next unstamped word
  elrcCurrentLine.value = lineIdx
  elrcCurrentWord.value = wordIdx
  let li = lineIdx
  let wi = wordIdx + 1
  outer: while (li < elrcLines.value.length) {
    const l = elrcLines.value[li]
    if (l.isInstrumental) {
      if (l.time === null) { elrcCurrentLine.value = li; elrcCurrentWord.value = 0; break }
      li++; wi = 0; continue
    }
    while (wi < l.words.length) {
      if (l.words[wi].time === null) {
        elrcCurrentLine.value = li
        elrcCurrentWord.value = wi
        break outer
      }
      wi++
    }
    li++; wi = 0
  }
  scrollToRef(elrcCurrentLine.value)
}

function addElrcInstrumental() {
  const idx = elrcCurrentLine.value
  elrcLines.value.splice(idx, 0, { words: [], time: currentTime.value, isInstrumental: true })
  lineElRefs.value = {}
  elrcCurrentLine.value = idx + 1
  elrcCurrentWord.value = 0
  scrollToRef(elrcCurrentLine.value)
}

function undoElrcLast() {
  // Walk backwards to find last stamped word
  for (let li = Math.min(elrcCurrentLine.value, elrcLines.value.length - 1); li >= 0; li--) {
    const line = elrcLines.value[li]
    if (line.isInstrumental && line.time !== null) {
      line.time = null
      elrcCurrentLine.value = li
      elrcCurrentWord.value = 0
      scrollToRef(li)
      return
    }
    const maxWi = li < elrcCurrentLine.value ? line.words.length - 1 : elrcCurrentWord.value - 1
    for (let wi = maxWi; wi >= 0; wi--) {
      if (line.words[wi].time !== null) {
        line.words[wi].time = null
        if (wi === 0) line.time = null
        elrcCurrentLine.value = li
        elrcCurrentWord.value = wi
        scrollToRef(li)
        return
      }
    }
  }
}

function resetElrc() {
  elrcLines.value = elrcLines.value.filter(l => !l.isInstrumental)
  for (const line of elrcLines.value) {
    line.time = null
    for (const word of line.words) word.time = null
  }
  elrcCurrentLine.value = 0
  elrcCurrentWord.value = 0
  lineElRefs.value = {}
  scrollToRef(0)
}

function buildElrc(): string {
  return elrcLines.value.map(line => {
    if (line.isInstrumental) return `[${formatTime(line.time!)}]`
    const lineTs = `[${formatTime(line.time!)}]`
    const wordParts = line.words.map(w => `<${formatTime(w.time!)}>${w.text}`).join(' ')
    return `${lineTs}${wordParts}`
  }).join('\n')
}

// ── Dispatch helpers ──────────────────────────────────────────────────

function handleAddInstrumental() {
  if (elrcMode.value) addElrcInstrumental()
  else addInstrumentalLine()
}

function handleUndo() {
  if (elrcMode.value) undoElrcLast()
  else undoLast()
}

function handleReset() {
  if (elrcMode.value) resetElrc()
  else resetAll()
}

// ── Playback controls ─────────────────────────────────────────────────

function seekBack() { player.seek(Math.max(0, currentTime.value - 5)) }
function seekForward() { player.seek(Math.min(duration.value, currentTime.value + 5)) }
function togglePlayback() { player.togglePlay() }

// ── Keyboard handler ──────────────────────────────────────────────────

function onKeyDown(e: KeyboardEvent) {
  if (!props.visible) return
  if (e.code === 'Space') {
    e.preventDefault(); e.stopPropagation()
    if (elrcMode.value) stampElrcNext(); else stampNext()
  } else if (e.code === 'Tab') {
    e.preventDefault(); e.stopPropagation()
    handleAddInstrumental()
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault(); seekBack()
  } else if (e.code === 'ArrowRight') {
    e.preventDefault(); seekForward()
  } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
    e.preventDefault(); handleUndo()
  } else if (e.code === 'Escape') {
    e.preventDefault(); close()
  }
}

// ── Styling helpers ───────────────────────────────────────────────────

function getLineClass(index: number): string {
  if (index === currentStampIndex.value && lines.value[index].time === null)
    return 'bg-accent/10 border border-accent/30'
  if (lines.value[index].time !== null) return 'bg-white/[0.03]'
  return 'hover:bg-white/[0.04]'
}

function getTextClass(index: number): string {
  if (index === currentStampIndex.value && lines.value[index].time === null)
    return 'text-white font-medium'
  if (lines.value[index].time !== null) return 'text-white/60'
  return 'text-white/30'
}

function getElrcLineClass(li: number): string {
  if (li === elrcCurrentLine.value) return 'bg-accent/10 border border-accent/30'
  const line = elrcLines.value[li]
  const allDone = line.isInstrumental
    ? line.time !== null
    : line.words.every(w => w.time !== null)
  if (allDone) return 'bg-white/[0.03]'
  if (li < elrcCurrentLine.value) return 'bg-white/[0.02] opacity-60'
  return 'opacity-40'
}

function getElrcWordClass(li: number, wi: number): string {
  const word = elrcLines.value[li]?.words[wi]
  if (!word) return ''
  if (li === elrcCurrentLine.value && wi === elrcCurrentWord.value)
    return 'bg-accent/30 text-white font-semibold ring-1 ring-accent/60'
  if (word.time !== null)
    return 'bg-white/[0.08] text-white/60'
  if (li === elrcCurrentLine.value)
    return 'bg-white/[0.04] text-white/35 hover:bg-white/[0.08]'
  return 'text-white/20'
}

// ── Save ──────────────────────────────────────────────────────────────

async function saveLrc() {
  const ready = elrcMode.value ? allElrcStamped.value : allStamped.value
  if (!ready || saving.value) return
  saving.value = true
  try {
    const content = elrcMode.value ? buildElrc() : buildLrc()
    await window.api.saveLyrics(props.trackPath, content)
    toast.success('Synced lyrics saved!')
    emit('saved', content)
    close()
  } catch (e: any) {
    toast.error(`Failed to save: ${e.message || e}`)
  } finally {
    saving.value = false
  }
}

function close() { emit('close') }

function globalKeyHandler(e: KeyboardEvent) {
  if (props.visible) onKeyDown(e)
}

onMounted(() => { window.addEventListener('keydown', globalKeyHandler) })
onBeforeUnmount(() => { window.removeEventListener('keydown', globalKeyHandler) })
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
