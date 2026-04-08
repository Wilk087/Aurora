<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-[80] bg-black/50" @click="close" />
    </Transition>

    <Transition name="dialog-slide">
      <div
        v-if="show"
        class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-[480px] max-w-[92vw] rounded-2xl bg-[#12121f]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl"
        @click.stop
      >
        <div class="p-6">
          <!-- Header -->
          <div class="flex items-start justify-between mb-5">
            <div>
              <h3 class="text-base font-semibold text-white">Manage Tags</h3>
              <p class="text-xs text-white/40 mt-0.5">{{ subtitle }}</p>
            </div>
            <button @click="close" class="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Current tags -->
          <div class="mb-4">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">Current Tags</p>
            <div v-if="workingTags.length > 0" class="flex flex-wrap gap-1.5">
              <button
                v-for="tag in workingTags"
                :key="tag"
                @click="removeTag(tag)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/15 text-accent border border-accent/25 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/25 transition-colors group"
                :title="`Remove tag: ${tag}`"
              >
                {{ tag }}
                <svg class="w-3 h-3 opacity-60 group-hover:opacity-100" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p v-else class="text-sm text-white/20 italic">No tags yet</p>
          </div>

          <!-- Tag input -->
          <div class="mb-4">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">Add Tag</p>
            <div class="flex items-center gap-2">
              <div class="relative flex-1">
                <input
                  ref="inputRef"
                  v-model="inputValue"
                  @keydown.enter.prevent="addInputTag"
                  @keydown.comma.prevent="addInputTag"
                  @keydown.tab.prevent="addInputTag"
                  @input="onInput"
                  placeholder="Type a tag and press Enter…"
                  class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
                />
                <!-- Autocomplete dropdown -->
                <div
                  v-if="filteredSuggestions.length > 0 && inputValue.length > 0"
                  class="absolute top-full left-0 right-0 mt-1 rounded-xl menu-panel py-1 shadow-2xl z-10 max-h-40 overflow-y-auto"
                >
                  <button
                    v-for="suggestion in filteredSuggestions"
                    :key="suggestion"
                    @mousedown.prevent="selectSuggestion(suggestion)"
                    class="w-full px-3 py-1.5 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    {{ suggestion }}
                  </button>
                </div>
              </div>
              <button
                @click="addInputTag"
                :disabled="!inputValue.trim()"
                class="px-3 py-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 border border-accent/20 text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>

          <!-- Suggestions -->
          <div v-if="suggestionsToShow.length > 0" class="mb-5">
            <div class="flex items-center justify-between mb-2">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-white/30">Suggested</p>
              <button
                v-if="ids.length > 1"
                @click="applyAllSuggested"
                class="text-[10px] text-accent hover:text-accent-hover transition-colors"
              >
                Apply all to selection
              </button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="tag in suggestionsToShow"
                :key="tag"
                @click="addTag(tag)"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-white/50 bg-white/[0.05] border border-white/[0.08] hover:text-white hover:bg-white/[0.1] hover:border-white/[0.15] transition-colors"
              >
                <svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {{ tag }}
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
            <button
              v-if="workingTags.length > 0"
              @click="clearAll"
              class="px-3 py-1.5 rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:bg-white/[0.04] transition-colors"
            >
              Clear All Tags
            </button>
            <div v-else />
            <div class="flex items-center gap-2">
              <button
                @click="close"
                class="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                Cancel
              </button>
              <button
                @click="save"
                class="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-sm font-medium text-white transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { COMMON_TAGS, useTagsStore } from '@/stores/tags'
import { useLibraryStore } from '@/stores/library'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  show: boolean
  /** 'track' or 'album' */
  type: 'track' | 'album'
  /** Track IDs or album keys (albumName---albumArtist) */
  ids: string[]
  /** Display label, e.g. "3 songs" or "Dark Side of the Moon" */
  label?: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const tagsStore = useTagsStore()
const library = useLibraryStore()
const toast = useToast()
const inputRef = ref<HTMLInputElement>()
const inputValue = ref('')
const mbTags = ref<string[]>([])

/** Working set: starts from common tags, mutated during session */
const workingTags = ref<string[]>([])

const subtitle = computed(() => {
  if (props.label) return props.label
  const n = props.ids.length
  return props.type === 'track'
    ? `${n} song${n !== 1 ? 's' : ''} selected`
    : `${n} album${n !== 1 ? 's' : ''} selected`
})

function getExistingTags(): string[] {
  if (props.ids.length === 0) return []
  if (props.type === 'track') {
    // Tags common to ALL selected tracks
    return props.ids.reduce<string[]>((common, id, i) => {
      const tags = tagsStore.getTrackTags(id)
      if (i === 0) return [...tags]
      return common.filter(t => tags.includes(t))
    }, [])
  } else {
    return props.ids.reduce<string[]>((common, key, i) => {
      const tags = tagsStore.getAlbumTags(key)
      if (i === 0) return [...tags]
      return common.filter(t => tags.includes(t))
    }, [])
  }
}

const suggestions = computed<string[]>(() => {
  const base = props.type === 'track'
    ? tagsStore.suggestedTrackTags(props.ids)
    : tagsStore.suggestedAlbumTags(props.ids)
  // Merge in MusicBrainz and starter tags, dedup
  const merged = new Set([...base, ...mbTags.value, ...COMMON_TAGS])
  return Array.from(merged).sort()
})

const suggestionsToShow = computed(() => {
  return suggestions.value.filter(s => !workingTags.value.includes(s)).slice(0, 20)
})

const filteredSuggestions = computed(() => {
  const q = inputValue.value.toLowerCase().trim()
  if (!q) return []
  return tagsStore.visibleTags
    .filter(t => t.includes(q) && !workingTags.value.includes(t))
    .slice(0, 8)
})

watch(() => props.show, (v) => {
  if (v) {
    const tags = getExistingTags()
    workingTags.value = [...tags]
    inputValue.value = ''
    mbTags.value = []
    nextTick(() => inputRef.value?.focus())
    loadMbTags()
  }
})

async function loadMbTags() {
  // Collect artist names to look up
  const artistNames = new Set<string>()
  if (props.type === 'track') {
    for (const id of props.ids) {
      const t = library.tracks.find(tr => tr.id === id)
      if (t?.albumArtist) artistNames.add(t.albumArtist)
      else if (t?.artist) artistNames.add(t.artist)
    }
  } else {
    for (const key of props.ids) {
      const album = library.albums.find(a => `${a.name}---${a.artist}` === key)
      if (album?.artist) artistNames.add(album.artist)
    }
  }
  const fetched: string[] = []
  for (const name of Array.from(artistNames).slice(0, 2)) {
    try {
      const info = await window.api.getArtistInfo(name)
      if (info?.tags) fetched.push(...info.tags.filter(tag => tagsStore.isVisibleTag(tag)))
    } catch { /* ignore */ }
  }
  mbTags.value = [...new Set(fetched.map(t => t.toLowerCase()))]
}

function onInput() {
  // strip leading/trailing spaces when typing (but don't clear mid-type)
}

function addTag(tag: string) {
  const normalized = tag.toLowerCase().trim()
  if (!normalized || workingTags.value.includes(normalized)) return
  workingTags.value.push(normalized)
}

function addInputTag() {
  const normalized = inputValue.value.toLowerCase().trim().replace(/,$/, '')
  if (!normalized) return
  addTag(normalized)
  inputValue.value = ''
}

function selectSuggestion(tag: string) {
  addTag(tag)
  inputValue.value = ''
  nextTick(() => inputRef.value?.focus())
}

function removeTag(tag: string) {
  workingTags.value = workingTags.value.filter(t => t !== tag)
}

function clearAll() {
  workingTags.value = []
}

function applyAllSuggested() {
  for (const t of suggestionsToShow.value) {
    addTag(t)
  }
}

async function save() {
  // Spread to plain arrays — Vue reactive arrays can't be cloned over Electron IPC
  const ids = [...props.ids]
  const tags = [...workingTags.value]
  if (props.type === 'track') {
    await tagsStore.setTrackTags(ids, tags)
  } else {
    await tagsStore.setAlbumTags(ids, tags)
  }
  const n = props.ids.length
  const label = props.type === 'track'
    ? `${n} song${n !== 1 ? 's' : ''}`
    : `${n} album${n !== 1 ? 's' : ''}`
  toast.success(`Tags saved for ${label}`)
  emit('saved')
  emit('close')
}

function close() {
  emit('close')
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.dialog-slide-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.dialog-slide-leave-active { transition: all 0.2s ease-in; }
.dialog-slide-enter-from, .dialog-slide-leave-to { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
.dialog-slide-enter-to, .dialog-slide-leave-from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
</style>
