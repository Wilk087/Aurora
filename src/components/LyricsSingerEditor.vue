<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
        data-lyrics-singers-active
        @keydown.escape.stop.prevent="$emit('close')"
      >
        <div class="w-full max-w-3xl mx-4 bg-[var(--bg-tertiary)] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <div>
              <h3 class="text-lg font-semibold text-white">Assign Singers</h3>
              <p class="text-xs text-white/40 mt-0.5">
                Each singer gets their own alignment and colour — saved next to the track as a .singers.lrc file
              </p>
            </div>
            <button
              @click="$emit('close')"
              class="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Legend -->
          <div class="flex items-center gap-4 px-6 py-2.5 border-b border-white/[0.06] text-[11px] text-white/40">
            <span>Shift-click to fill a range &middot; <span class="font-semibold">bg</span> = background vocal</span>
            <span class="ml-auto flex items-center gap-3">
              <span v-for="id in SINGER_ORDER" :key="id" class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full" :style="{ background: singerColor(id, player.lyricsSingerColors) }" />
                {{ SINGER_LABELS[id] }}
              </span>
            </span>
          </div>

          <!-- Lines -->
          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-1.5">
            <div
              v-for="(entry, i) in entries"
              :key="i"
              class="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors"
              :class="entry.singer || entry.background ? 'bg-white/[0.05]' : 'bg-white/[0.02] hover:bg-white/[0.04]'"
            >
              <span class="text-[10px] font-mono text-white/25 shrink-0 w-[52px]">{{ formatTime(entry.time) }}</span>

              <p
                class="flex-1 min-w-0 leading-relaxed truncate"
                :style="rowPreviewStyle(entry)"
                :class="[
                  entry.singer ? 'sg-assigned' : 'text-white/60',
                  entry.background ? 'text-xs opacity-70' : 'text-sm',
                ]"
              >{{ entry.text }}</p>

              <div class="flex items-center gap-1 shrink-0">
                <button
                  v-for="id in SINGER_ORDER"
                  :key="id"
                  @click="assign(i, id, $event)"
                  class="h-7 min-w-[28px] px-2 rounded-lg text-[11px] font-semibold transition-colors"
                  :class="entry.singer === id
                    ? 'text-black'
                    : 'bg-white/[0.06] text-white/40 hover:bg-white/[0.12] hover:text-white/70'"
                  :style="entry.singer === id ? { background: singerColor(id, player.lyricsSingerColors) } : {}"
                  :title="`${SINGER_LABELS[id]} — shift-click to fill range`"
                >{{ SINGER_SHORT_LABELS[id] }}</button>
                <button
                  @click="toggleBackground(i, $event)"
                  class="h-7 px-2 ml-1 rounded-lg text-[11px] font-semibold transition-colors"
                  :class="entry.background
                    ? 'bg-white/80 text-black'
                    : 'bg-white/[0.06] text-white/40 hover:bg-white/[0.12] hover:text-white/70'"
                  title="Background vocal — smaller and quieter, like Apple Music. Shift-click to fill range"
                >bg</button>
              </div>
            </div>
            <p v-if="entries.length === 0" class="text-sm text-white/30 text-center py-8">
              No synced lyric lines to assign.
            </p>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
            <div class="flex items-center gap-2">
              <button
                @click="alternate"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.08] hover:bg-white/[0.12] text-white/60 hover:text-white/80 transition-all"
                title="Alternate Singer 1 / Singer 2 line by line as a starting point"
              >
                Alternate 1 / 2
              </button>
              <button
                @click="clearAll"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.08] hover:bg-white/[0.12] text-white/60 hover:text-white/80 transition-all"
              >
                Clear all
              </button>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-white/30 mr-1">{{ assignedCount }} of {{ entries.length }} assigned</span>
              <button
                @click="$emit('close')"
                class="px-4 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                @click="save"
                :disabled="saving || entries.length === 0"
                class="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
              >
                {{ saving ? 'Saving...' : 'Save Singers' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import { usePlayerStore } from '@/stores/player'
import { serializeSingers, type LyricLine } from '@/utils/lrcParser'
import {
  SINGER_ORDER,
  SINGER_LABELS,
  SINGER_SHORT_LABELS,
  singerColor,
  singerStyle,
  type SingerId,
} from '@/utils/lyricSingers'

interface EditableEntry {
  time: number
  text: string
  singer?: SingerId
  background?: boolean
}

const props = defineProps<{
  visible: boolean
  lyrics: LyricLine[]
  trackPath: string
}>()

const emit = defineEmits<{
  close: []
  saved: [singersLrc: string]
}>()

const toast = useToast()
const player = usePlayerStore()
const saving = ref(false)
const entries = ref<EditableEntry[]>([])
// Anchor for shift-click range fills
let lastAssignedIndex: number | null = null

watch(
  () => props.visible,
  (vis) => {
    if (!vis) return
    lastAssignedIndex = null
    entries.value = props.lyrics
      .filter(l => l.text.trim().length > 0)
      .map(l => ({ time: l.time, text: l.text, singer: l.singer, background: l.background }))
  },
  { immediate: true },
)

const assignedCount = computed(() => entries.value.filter(e => e.singer || e.background).length)

/** Rows preview their singer's colour and alignment as configured */
function rowPreviewStyle(entry: EditableEntry) {
  return singerStyle(entry, {
    enabled: true,
    colorsEnabled: true,
    colors: player.lyricsSingerColors,
  })
}

/** Click assigns (or unassigns) one line; shift-click fills from the last one. */
function assign(index: number, singer: SingerId, event: MouseEvent) {
  if (event.shiftKey && lastAssignedIndex !== null) {
    const [from, to] = [lastAssignedIndex, index].sort((a, b) => a - b)
    for (let i = from; i <= to; i++) entries.value[i].singer = singer
  } else {
    entries.value[index].singer = entries.value[index].singer === singer ? undefined : singer
  }
  lastAssignedIndex = index
}

/** Background is independent of who sings the line, so it toggles on its own. */
function toggleBackground(index: number, event: MouseEvent) {
  if (event.shiftKey && lastAssignedIndex !== null) {
    const [from, to] = [lastAssignedIndex, index].sort((a, b) => a - b)
    const value = !entries.value[index].background
    for (let i = from; i <= to; i++) entries.value[i].background = value
  } else {
    entries.value[index].background = !entries.value[index].background
  }
  lastAssignedIndex = index
}

function alternate() {
  entries.value.forEach((entry, i) => { entry.singer = i % 2 === 0 ? 'v1' : 'v2' })
  lastAssignedIndex = null
}

function clearAll() {
  for (const entry of entries.value) {
    entry.singer = undefined
    entry.background = false
  }
  lastAssignedIndex = null
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const cs = Math.floor((seconds % 1) * 100)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(m)}:${pad(s)}.${pad(cs)}`
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    // Empty content is valid — it clears every assignment for this track
    const content = serializeSingers(entries.value)
    await window.api.saveLyricsSingers(props.trackPath, content)
    toast.success(content ? 'Singers saved!' : 'Singer assignments cleared')
    emit('saved', content)
    emit('close')
  } catch (e: any) {
    toast.error(`Failed to save: ${e.message || e}`)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
/* Assigned rows preview their singer colour (set by singerStyle) */
.sg-assigned {
  color: var(--singer-color);
}
</style>
