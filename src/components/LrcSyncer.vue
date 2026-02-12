<template>
  <Transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
      @keydown="onKeyDown"
    >
      <div class="w-full max-w-xl mx-4 bg-[#1a1a1e] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h3 class="text-lg font-semibold text-white">Sync Lyrics</h3>
            <p class="text-xs text-white/40 mt-0.5">
              Play the song and press <kbd class="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono text-[10px]">Space</kbd> to stamp each line
            </p>
          </div>
          <button
            @click="close"
            class="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Progress bar -->
        <div class="px-6 pt-3 pb-1">
          <div class="flex items-center justify-between text-xs text-white/40 mb-1">
            <span>{{ formatTime(currentTime) }}</span>
            <span>{{ stampedCount }} / {{ lines.length }} lines stamped</span>
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
              @click="undoLast"
              :disabled="stampedCount === 0"
              class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.08] hover:bg-white/[0.12] text-white/60 hover:text-white/80 disabled:opacity-30 transition-all"
            >
              Undo
            </button>
            <button
              @click="resetAll"
              :disabled="stampedCount === 0"
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

          <div
            v-for="(line, i) in lines"
            :key="i"
            :ref="el => { if (el) lineElRefs[i] = el as HTMLElement }"
            class="py-2 px-4 rounded-xl transition-all duration-200 cursor-pointer"
            :class="getLineClass(i)"
            @click="stampLine(i)"
          >
            <div class="flex items-center gap-3">
              <!-- Timestamp badge -->
              <span
                class="text-[10px] font-mono min-w-[52px] text-center px-1.5 py-0.5 rounded"
                :class="line.time !== null ? 'bg-accent/20 text-accent' : 'bg-white/5 text-white/20'"
              >
                {{ line.time !== null ? formatTime(line.time) : '--:--' }}
              </span>
              <!-- Line text -->
              <p class="text-sm leading-relaxed" :class="getTextClass(i)">
                {{ line.text }}
              </p>
            </div>
          </div>

          <div class="h-40" />
        </div>

        <!-- Footer: save actions -->
        <div class="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
          <p class="text-xs text-white/30">
            {{ allStamped ? 'All lines stamped — ready to save!' : 'Stamp all lines to save' }}
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
              :disabled="!allStamped || saving"
              class="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
            >
              {{ saving ? 'Saving...' : 'Save .lrc' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useToast } from '@/composables/useToast'

interface SyncLine {
  text: string
  time: number | null
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

const lines = ref<SyncLine[]>([])
const currentStampIndex = ref(0)
const saving = ref(false)
const scrollContainer = ref<HTMLElement | null>(null)
const lineElRefs = ref<Record<number, HTMLElement>>({})

const currentTime = computed(() => player.currentTime)
const duration = computed(() => player.duration)
const isPlaying = computed(() => player.isPlaying)

const stampedCount = computed(() => lines.value.filter(l => l.time !== null).length)
const allStamped = computed(() => lines.value.length > 0 && lines.value.every(l => l.time !== null))

// Parse plain lyrics into lines when visible/lyrics change
watch(
  () => [props.visible, props.plainLyrics],
  () => {
    if (props.visible && props.plainLyrics) {
      lines.value = props.plainLyrics
        .split('\n')
        .map(text => text.trim())
        .filter(text => text.length > 0)
        .map(text => ({ text, time: null }))
      currentStampIndex.value = 0
      lineElRefs.value = {}
    }
  },
  { immediate: true },
)

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

function stampLine(index: number) {
  if (index < 0 || index >= lines.value.length) return
  lines.value[index].time = currentTime.value

  // Advance to next unstamped line
  let next = index + 1
  while (next < lines.value.length && lines.value[next].time !== null) {
    next++
  }
  currentStampIndex.value = Math.min(next, lines.value.length - 1)

  // Scroll to next line
  nextTick(() => {
    const nextEl = lineElRefs.value[currentStampIndex.value]
    if (nextEl) {
      nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

function stampNext() {
  // Find the first unstamped line from current position
  let idx = currentStampIndex.value
  while (idx < lines.value.length && lines.value[idx].time !== null) {
    idx++
  }
  if (idx < lines.value.length) {
    stampLine(idx)
  }
}

function undoLast() {
  // Find last stamped line
  for (let i = lines.value.length - 1; i >= 0; i--) {
    if (lines.value[i].time !== null) {
      lines.value[i].time = null
      currentStampIndex.value = i
      nextTick(() => {
        const el = lineElRefs.value[i]
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }
  }
}

function resetAll() {
  for (const line of lines.value) {
    line.time = null
  }
  currentStampIndex.value = 0
  nextTick(() => {
    const el = lineElRefs.value[0]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function seekBack() {
  player.seek(Math.max(0, currentTime.value - 5))
}

function seekForward() {
  player.seek(Math.min(duration.value, currentTime.value + 5))
}

function togglePlayback() {
  player.togglePlay()
}

function onKeyDown(e: KeyboardEvent) {
  if (!props.visible) return

  if (e.code === 'Space') {
    e.preventDefault()
    e.stopPropagation()
    stampNext()
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault()
    seekBack()
  } else if (e.code === 'ArrowRight') {
    e.preventDefault()
    seekForward()
  } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
    e.preventDefault()
    undoLast()
  } else if (e.code === 'Escape') {
    e.preventDefault()
    close()
  }
}

function getLineClass(index: number): string {
  if (index === currentStampIndex.value && lines.value[index].time === null) {
    return 'bg-accent/10 border border-accent/30'
  }
  if (lines.value[index].time !== null) {
    return 'bg-white/[0.03]'
  }
  return 'hover:bg-white/[0.04]'
}

function getTextClass(index: number): string {
  if (index === currentStampIndex.value && lines.value[index].time === null) {
    return 'text-white font-medium'
  }
  if (lines.value[index].time !== null) {
    return 'text-white/60'
  }
  return 'text-white/30'
}

function buildLrc(): string {
  const sorted = [...lines.value]
    .filter(l => l.time !== null)
    .sort((a, b) => a.time! - b.time!)

  return sorted.map(line => {
    const t = line.time!
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    const ms = Math.floor((t % 1) * 100)
    return `[${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}] ${line.text}`
  }).join('\n')
}

async function saveLrc() {
  if (!allStamped.value || saving.value) return
  saving.value = true
  try {
    const lrcContent = buildLrc()
    await window.api.saveLyrics(props.trackPath, lrcContent)
    toast.success('Synced lyrics saved!')
    emit('saved', lrcContent)
    close()
  } catch (e: any) {
    toast.error(`Failed to save: ${e.message || e}`)
  } finally {
    saving.value = false
  }
}

function close() {
  emit('close')
}

// Global keyboard listener when visible
function globalKeyHandler(e: KeyboardEvent) {
  if (props.visible) onKeyDown(e)
}

onMounted(() => {
  window.addEventListener('keydown', globalKeyHandler)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', globalKeyHandler)
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
