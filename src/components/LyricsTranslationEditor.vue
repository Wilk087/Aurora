<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
        data-lyrics-translation-active
        @keydown.escape.stop.prevent="$emit('close')"
      >
        <div class="w-full max-w-2xl mx-4 bg-[var(--bg-tertiary)] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <div>
              <h3 class="text-lg font-semibold text-white">Translate Lyrics</h3>
              <p class="text-xs text-white/40 mt-0.5">
                Write your own translation for each line — saved next to the track as a .translation.lrc file
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

          <!-- Lines -->
          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            <div
              v-for="(entry, i) in entries"
              :key="i"
              class="rounded-xl bg-white/[0.03] border border-white/[0.05] px-4 py-3"
            >
              <div class="flex items-baseline gap-3 mb-1.5">
                <span class="text-[10px] font-mono text-white/25 shrink-0">{{ formatTime(entry.time) }}</span>
                <p class="text-sm text-white/70 leading-relaxed">{{ entry.text }}</p>
              </div>
              <input
                :ref="el => { if (el) inputRefs[i] = el as HTMLInputElement }"
                v-model="entry.translation"
                type="text"
                :placeholder="entry.autoTranslation || 'Your translation…'"
                class="w-full px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.06] text-sm text-white/85 placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
                @keydown.enter.prevent="focusNext(i)"
              />
            </div>
            <p v-if="entries.length === 0" class="text-sm text-white/30 text-center py-8">
              No synced lyric lines to translate.
            </p>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
            <div class="flex items-center gap-2">
              <button
                v-if="hasAutoTranslations"
                @click="fillFromAuto"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.08] hover:bg-white/[0.12] text-white/60 hover:text-white/80 transition-all"
                title="Copy the current automatic translation into the inputs as a starting point"
              >
                Fill from auto-translation
              </button>
              <button
                @click="clearAll"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.08] hover:bg-white/[0.12] text-white/60 hover:text-white/80 transition-all"
              >
                Clear all
              </button>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="$emit('close')"
                class="px-4 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-all"
              >
                Cancel
              </button>
              <button
                @click="save"
                :disabled="!hasAnyTranslation || saving"
                class="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
              >
                {{ saving ? 'Saving...' : 'Save Translation' }}
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
import type { LyricLine } from '@/utils/lrcParser'

interface EditableEntry {
  time: number
  text: string
  translation: string
  autoTranslation: string
}

const props = defineProps<{
  visible: boolean
  lyrics: LyricLine[]
  trackPath: string
}>()

const emit = defineEmits<{
  close: []
  saved: [translationLrc: string]
}>()

const toast = useToast()
const saving = ref(false)
const entries = ref<EditableEntry[]>([])
const inputRefs = ref<Record<number, HTMLInputElement>>({})

watch(
  () => props.visible,
  (vis) => {
    if (!vis) return
    inputRefs.value = {}
    entries.value = props.lyrics
      .filter(l => l.text.trim().length > 0)
      .map(l => ({
        time: l.time,
        text: l.text,
        translation: '',
        autoTranslation: l.translation ?? '',
      }))
  },
  { immediate: true },
)

const hasAnyTranslation = computed(() => entries.value.some(e => e.translation.trim().length > 0))
const hasAutoTranslations = computed(() => entries.value.some(e => e.autoTranslation))

function fillFromAuto() {
  for (const entry of entries.value) {
    if (!entry.translation.trim() && entry.autoTranslation) {
      entry.translation = entry.autoTranslation
    }
  }
}

function clearAll() {
  for (const entry of entries.value) entry.translation = ''
}

function focusNext(index: number) {
  inputRefs.value[index + 1]?.focus()
  inputRefs.value[index + 1]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

async function save() {
  if (!hasAnyTranslation.value || saving.value) return
  saving.value = true
  try {
    // The [by:user] tag marks this as hand-written so it always wins over auto-translation
    const content = '[by:user]\n' + entries.value
      .filter(e => e.translation.trim().length > 0)
      .map(e => `[${formatTime(e.time)}]${e.translation.trim()}`)
      .join('\n')
    await window.api.saveLyricsTranslation(props.trackPath, content)
    toast.success('Translation saved!')
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
</style>
