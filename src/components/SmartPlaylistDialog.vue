<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-[80] bg-black/50" @click="$emit('close')" />
    </Transition>

    <!-- Dialog -->
    <Transition name="dialog-slide">
      <div
        v-if="show"
        class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-[560px] max-w-[92vw] max-h-[80vh] overflow-y-auto rounded-2xl bg-[#12121f]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl"
      >
        <div class="p-6">
          <h2 class="text-xl font-bold text-white mb-1">
            {{ editing ? 'Edit Smart Playlist' : 'New Smart Playlist' }}
          </h2>
          <p class="text-xs text-white/30 mb-5">Auto-populate based on metadata rules</p>

          <!-- Name -->
          <div class="mb-5">
            <label class="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Name</label>
            <input
              v-model="name"
              placeholder="My Smart Playlist"
              class="ctx-input w-full px-3 py-2 rounded-lg text-sm outline-none focus:border-accent/40 transition-colors"
            />
          </div>

          <!-- Match mode -->
          <div class="mb-5 flex items-center gap-3">
            <span class="text-sm text-white/60">Match</span>
            <button
              @click="ruleMatch = ruleMatch === 'all' ? 'any' : 'all'"
              class="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
              :class="ruleMatch === 'all' ? 'bg-accent/20 text-accent' : 'bg-white/[0.06] text-white/60'"
            >
              {{ ruleMatch === 'all' ? 'ALL' : 'ANY' }}
            </button>
            <span class="text-sm text-white/60">of the following rules</span>
          </div>

          <!-- Rules -->
          <div class="space-y-2.5 mb-5">
            <div
              v-for="(rule, i) in rules"
              :key="i"
              class="flex items-center gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.04]"
            >
              <!-- Field dropdown trigger -->
              <button
                @click.stop="e => toggleDropdown('field', i, e.currentTarget as HTMLElement)"
                class="spl-select w-36 shrink-0 flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-left transition-colors"
                :class="openField === i ? 'border-accent/40 text-white' : ''"
              >
                <span class="truncate">{{ fieldLabel(rule.field) }}</span>
                <svg class="w-3 h-3 shrink-0 opacity-40 transition-transform" :class="openField === i ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Operator dropdown trigger -->
              <button
                @click.stop="e => toggleDropdown('op', i, e.currentTarget as HTMLElement)"
                class="spl-select w-36 shrink-0 flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-left transition-colors"
                :class="openOp === i ? 'border-accent/40 text-white' : ''"
              >
                <span class="truncate">{{ operatorLabel(rule.field, rule.operator) }}</span>
                <svg class="w-3 h-3 shrink-0 opacity-40 transition-transform" :class="openOp === i ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Value: tag autocomplete -->
              <div v-if="rule.field === 'tag'" class="flex-1 min-w-0">
                <input
                  v-model="rule.value"
                  @focus="e => openTagPicker(i, e.currentTarget as HTMLElement)"
                  @input="e => openTagPicker(i, e.currentTarget as HTMLElement)"
                  @blur="closeTagPicker"
                  placeholder="tag name"
                  type="text"
                  class="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.06] text-sm text-white/70 placeholder:text-white/20 outline-none focus:border-accent/30 transition-colors"
                />
              </div>

              <!-- Value: numeric/text -->
              <input
                v-else
                v-model="rule.value"
                :placeholder="isNumericField(rule.field) ? '0' : rule.field === 'format' ? 'flac' : 'value'"
                :type="isNumericField(rule.field) ? 'number' : 'text'"
                class="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.06] text-sm text-white/70 placeholder:text-white/20 outline-none focus:border-accent/30 transition-colors"
              />

              <span v-if="rule.field === 'recentlyAdded'" class="text-xs text-white/30 shrink-0">days</span>

              <!-- Between second value -->
              <template v-if="rule.operator === 'between'">
                <span class="text-xs text-white/30 shrink-0">–</span>
                <input
                  v-model="rule.value2"
                  placeholder="0"
                  type="number"
                  class="w-20 shrink-0 px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.06] text-sm text-white/70 placeholder:text-white/20 outline-none focus:border-accent/30 transition-colors"
                />
              </template>

              <!-- Remove -->
              <button
                v-if="rules.length > 1"
                @click="rules.splice(i, 1)"
                class="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-white/[0.06] transition-colors shrink-0"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Add rule -->
          <button
            @click="addRule"
            class="flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors mb-6"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Rule
          </button>

          <!-- Preview count -->
          <div v-if="matchCount >= 0" class="mb-5 px-3 py-2 rounded-lg bg-white/[0.04] text-sm text-white/50">
            {{ matchCount }} track{{ matchCount !== 1 ? 's' : '' }} match{{ matchCount === 1 ? 'es' : '' }}
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3">
            <button
              @click="$emit('close')"
              class="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              @click="save"
              :disabled="!name.trim() || rules.length === 0"
              class="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
            >
              {{ editing ? 'Update' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Field dropdown (Teleported) ── -->
    <div v-if="openField !== null" class="fixed inset-0 z-[100]" @click="openField = null" />
    <div
      v-if="openField !== null"
      class="fixed z-[101] rounded-xl menu-panel py-1.5 shadow-2xl overflow-y-auto"
      :style="dropdownStyle"
      @click.stop
    >
      <template v-for="group in fieldGroups" :key="group.label">
        <p class="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider" style="color: rgb(var(--app-text) / 0.35)">{{ group.label }}</p>
        <button
          v-for="opt in group.options"
          :key="opt.value"
          @click="selectField(opt.value)"
          class="w-full px-3 py-1.5 text-left text-sm transition-colors flex items-center justify-between"
          :class="rules[openField!]?.field === opt.value ? 'text-accent bg-white/[0.08]' : 'ctx-item'"
        >
          {{ opt.label }}
          <svg v-if="rules[openField!]?.field === opt.value" class="w-3.5 h-3.5 text-accent shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        </button>
      </template>
    </div>

    <!-- ── Operator dropdown (Teleported) ── -->
    <div v-if="openOp !== null" class="fixed inset-0 z-[100]" @click="openOp = null" />
    <div
      v-if="openOp !== null"
      class="fixed z-[101] rounded-xl menu-panel py-1.5 shadow-2xl"
      :style="dropdownStyle"
      @click.stop
    >
      <button
        v-for="opt in operatorsFor(rules[openOp!]?.field)"
        :key="opt.value"
        @click="selectOperator(opt.value)"
        class="w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between"
        :class="rules[openOp!]?.operator === opt.value ? 'text-accent bg-white/[0.08]' : 'ctx-item'"
      >
        {{ opt.label }}
        <svg v-if="rules[openOp!]?.operator === opt.value" class="w-3.5 h-3.5 text-accent shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
        </svg>
      </button>
    </div>

    <!-- ── Tag autocomplete (Teleported) ── -->
    <div
      v-if="tagPickerOpenIndex !== null && tagOptionsFor(rules[tagPickerOpenIndex]?.value ?? '').length > 0"
      class="fixed z-[102] rounded-xl menu-panel py-1 shadow-2xl overflow-y-auto"
      :style="tagDropdownStyle"
    >
      <button
        v-for="t in tagOptionsFor(rules[tagPickerOpenIndex!]?.value ?? '')"
        :key="t"
        @mousedown.prevent="selectTagValue(tagPickerOpenIndex!, t)"
        class="ctx-item w-full px-3 py-1.5 text-left text-sm transition-colors"
      >{{ t }}</button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { useTagsStore } from '@/stores/tags'
import { evaluateSmartPlaylist } from '@/utils/smartPlaylistMatcher'

const props = defineProps<{
  show: boolean
  editing?: { id: string; name: string; rules: SmartPlaylistRule[]; ruleMatch: 'all' | 'any' } | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: { name: string; rules: SmartPlaylistRule[]; ruleMatch: 'all' | 'any' }]
  update: [data: { id: string; name: string; rules: SmartPlaylistRule[]; ruleMatch: 'all' | 'any' }]
}>()

const library = useLibraryStore()
const tagsStore = useTagsStore()

const name = ref('')
const ruleMatch = ref<'all' | 'any'>('all')
const rules = ref<SmartPlaylistRule[]>([
  { field: 'genre', operator: 'is', value: '', value2: '' },
])
const tagPickerOpenIndex = ref<number | null>(null)
const tagDropdownStyle = ref<Record<string, string>>({})

// ── Custom dropdown state ─────────────────────────────────────────────────
type DropdownKind = 'field' | 'op'
const openField = ref<number | null>(null)
const openOp = ref<number | null>(null)
const dropdownStyle = ref<Record<string, string>>({})

function toggleDropdown(kind: DropdownKind, index: number, trigger: HTMLElement) {
  // Close any other open dropdown first
  if (kind === 'field') {
    openOp.value = null
    if (openField.value === index) { openField.value = null; return }
    openField.value = index
  } else {
    openField.value = null
    if (openOp.value === index) { openOp.value = null; return }
    openOp.value = index
  }
  tagPickerOpenIndex.value = null

  // Position the dropdown below the trigger, clamped to viewport
  const rect = trigger.getBoundingClientRect()
  const menuW = 200
  const left = Math.min(rect.left, window.innerWidth - menuW - 8)
  const spaceBelow = window.innerHeight - rect.bottom - 8
  const spaceAbove = rect.top - 8

  if (spaceBelow >= 120 || spaceBelow >= spaceAbove) {
    dropdownStyle.value = {
      top: (rect.bottom + 4) + 'px',
      left: left + 'px',
      minWidth: rect.width + 'px',
      maxHeight: Math.min(spaceBelow, 320) + 'px',
      overflowY: 'auto',
    }
  } else {
    dropdownStyle.value = {
      bottom: (window.innerHeight - rect.top + 4) + 'px',
      left: left + 'px',
      minWidth: rect.width + 'px',
      maxHeight: Math.min(spaceAbove, 320) + 'px',
      overflowY: 'auto',
    }
  }
}

// ── Field definitions ─────────────────────────────────────────────────────
const fieldGroups = [
  { label: 'Metadata', options: [
    { value: 'title', label: 'Title' },
    { value: 'artist', label: 'Artist' },
    { value: 'album', label: 'Album' },
    { value: 'genre', label: 'Genre' },
    { value: 'year', label: 'Year' },
    { value: 'bpm', label: 'BPM' },
  ]},
  { label: 'File', options: [
    { value: 'format', label: 'Format' },
    { value: 'bitrate', label: 'Bitrate (kbps)' },
    { value: 'duration', label: 'Duration (sec)' },
  ]},
  { label: 'Activity', options: [
    { value: 'playCount', label: 'Play Count' },
    { value: 'recentlyAdded', label: 'Recently Added (days)' },
  ]},
  { label: 'Tags', options: [
    { value: 'tag', label: 'Tag' },
  ]},
]

const allFieldOptions = fieldGroups.flatMap(g => g.options)

function fieldLabel(field: string): string {
  return allFieldOptions.find(o => o.value === field)?.label ?? field
}

function selectField(value: string) {
  const i = openField.value!
  openField.value = null
  const rule = rules.value[i]
  if (!rule) return
  rule.field = value as SmartPlaylistRule['field']
  onFieldChange(i)
}

// ── Operator definitions ──────────────────────────────────────────────────
function operatorsFor(field: string): { value: string; label: string }[] {
  if (isNumericField(field)) return [
    { value: 'equals', label: 'equals' },
    { value: 'greater', label: 'greater than' },
    { value: 'less', label: 'less than' },
    { value: 'between', label: 'between' },
  ]
  if (field === 'recentlyAdded') return [
    { value: 'less', label: 'within last' },
    { value: 'greater', label: 'older than' },
  ]
  if (field === 'tag') return [
    { value: 'has_tag', label: 'has tag' },
    { value: 'not_has_tag', label: 'does not have tag' },
    { value: 'contains', label: 'tag contains' },
  ]
  return [
    { value: 'is', label: 'is' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts', label: 'starts with' },
  ]
}

function operatorLabel(field: string, operator: string): string {
  return operatorsFor(field).find(o => o.value === operator)?.label ?? operator
}

function selectOperator(value: string) {
  const i = openOp.value!
  openOp.value = null
  const rule = rules.value[i]
  if (!rule) return
  rule.operator = value as SmartPlaylistRule['operator']
}

// ── Helpers ───────────────────────────────────────────────────────────────
function isNumericField(field: string): boolean {
  return ['year', 'bpm', 'playCount', 'bitrate', 'duration'].includes(field)
}

function onFieldChange(i: number) {
  const rule = rules.value[i]
  if (isNumericField(rule.field)) {
    rule.operator = 'equals'
  } else if (rule.field === 'recentlyAdded') {
    rule.operator = 'less'
  } else if (rule.field === 'tag') {
    rule.operator = 'has_tag'
  } else {
    rule.operator = 'is'
  }
  rule.value = ''
  rule.value2 = ''
}

function addRule() {
  rules.value.push({ field: 'genre', operator: 'is', value: '', value2: '' })
}

// ── Tag autocomplete ──────────────────────────────────────────────────────
function openTagPicker(index: number, el: HTMLElement) {
  openField.value = null
  openOp.value = null
  tagPickerOpenIndex.value = index

  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight
  const spaceBelow = vh - rect.bottom - 8
  const spaceAbove = rect.top - 8
  const maxH = 176 // max-h-44

  if (spaceBelow >= Math.min(maxH, 80) || spaceBelow >= spaceAbove) {
    tagDropdownStyle.value = {
      top: (rect.bottom + 4) + 'px',
      left: rect.left + 'px',
      width: rect.width + 'px',
      maxHeight: Math.min(spaceBelow, maxH) + 'px',
    }
  } else {
    tagDropdownStyle.value = {
      bottom: (vh - rect.top + 4) + 'px',
      left: rect.left + 'px',
      width: rect.width + 'px',
      maxHeight: Math.min(spaceAbove, maxH) + 'px',
    }
  }
}

function closeTagPicker() {
  tagPickerOpenIndex.value = null
}

function tagOptionsFor(query: string): string[] {
  const q = query.toLowerCase().trim()
  const source = tagsStore.visibleTags
  if (!q) return source.slice(0, 20)
  return source.filter(tag => tag.includes(q)).slice(0, 20)
}

function selectTagValue(index: number, value: string) {
  rules.value[index].value = value
  tagPickerOpenIndex.value = null
}

// ── Match preview ─────────────────────────────────────────────────────────
const matchCount = computed(() => {
  const validRules = rules.value.filter(r => r.value.toString().trim() !== '')
  if (validRules.length === 0) return -1
  const getTrackTags = (trackId: string) => {
    const track = library.tracks.find(t => t.id === trackId)
    const trackTagList = tagsStore.getTrackTags(trackId)
    if (!track) return trackTagList
    const key = `${track.album}---${track.albumArtist || track.artist}`
    return [...new Set([...trackTagList, ...tagsStore.getAlbumTags(key)])]
  }
  return evaluateSmartPlaylist(library.tracks, validRules, ruleMatch.value, undefined, getTrackTags).length
})

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      openField.value = null
      openOp.value = null
      tagPickerOpenIndex.value = null
      if (props.editing) {
        name.value = props.editing.name
        ruleMatch.value = props.editing.ruleMatch
        rules.value = JSON.parse(JSON.stringify(props.editing.rules))
      } else {
        name.value = ''
        ruleMatch.value = 'all'
        rules.value = [{ field: 'genre', operator: 'is', value: '', value2: '' }]
      }
    }
  },
)

function save() {
  if (!name.value.trim() || rules.value.length === 0) return
  const filteredRules = rules.value.filter(r => r.value.toString().trim() !== '')
  if (props.editing) {
    emit('update', { id: props.editing.id, name: name.value.trim(), rules: filteredRules, ruleMatch: ruleMatch.value })
  } else {
    emit('save', { name: name.value.trim(), rules: filteredRules, ruleMatch: ruleMatch.value })
  }
}
</script>

<style scoped>
.spl-select {
  background: rgb(var(--app-text) / 0.06);
  border: 1px solid var(--border);
  color: rgb(var(--app-text) / 0.70);
}
.spl-select:hover {
  background: rgb(var(--app-text) / 0.09);
  color: rgb(var(--app-text) / 0.90);
}
/* fade / dialog-slide transitions are global in main.css */
</style>
