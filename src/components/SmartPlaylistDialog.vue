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
        class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-[520px] max-w-[90vw] max-h-[80vh] overflow-y-auto rounded-2xl bg-[#12121f]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl"
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
              class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
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
          <div class="space-y-3 mb-5">
            <div
              v-for="(rule, i) in rules"
              :key="i"
              class="flex items-center gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.04]"
            >
              <!-- Field -->
              <select
                v-model="rule.field"
                @change="onFieldChange(i)"
                class="px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.06] text-sm text-white/70 outline-none"
              >
                <option value="genre">Genre</option>
                <option value="year">Year</option>
                <option value="artist">Artist</option>
                <option value="album">Album</option>
                <option value="title">Title</option>
                <option value="bpm">BPM</option>
              </select>

              <!-- Operator -->
              <select
                v-model="rule.operator"
                class="px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.06] text-sm text-white/70 outline-none"
              >
                <template v-if="isNumericField(rule.field)">
                  <option value="equals">equals</option>
                  <option value="greater">greater than</option>
                  <option value="less">less than</option>
                  <option value="between">between</option>
                </template>
                <template v-else>
                  <option value="is">is</option>
                  <option value="contains">contains</option>
                  <option value="starts">starts with</option>
                </template>
              </select>

              <!-- Value -->
              <input
                v-model="rule.value"
                :placeholder="isNumericField(rule.field) ? '0' : 'value'"
                :type="isNumericField(rule.field) ? 'number' : 'text'"
                class="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.06] text-sm text-white/70 placeholder:text-white/20 outline-none focus:border-accent/30"
              />

              <!-- Second value for between -->
              <template v-if="rule.operator === 'between'">
                <span class="text-xs text-white/30">–</span>
                <input
                  v-model="rule.value2"
                  :placeholder="isNumericField(rule.field) ? '0' : 'value'"
                  :type="isNumericField(rule.field) ? 'number' : 'text'"
                  class="w-20 px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.06] text-sm text-white/70 placeholder:text-white/20 outline-none focus:border-accent/30"
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
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useLibraryStore } from '@/stores/library'

const props = defineProps<{
  show: boolean
  editing?: { id: string; name: string; rules: SmartPlaylistRule[]; ruleMatch: 'all' | 'any' } | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: { name: string; rules: SmartPlaylistRule[]; ruleMatch: 'all' | 'any' }]
}>()

const library = useLibraryStore()

const name = ref('')
const ruleMatch = ref<'all' | 'any'>('all')
const rules = ref<SmartPlaylistRule[]>([
  { field: 'genre', operator: 'is', value: '', value2: '' },
])

function isNumericField(field: string): boolean {
  return field === 'year' || field === 'bpm'
}

function onFieldChange(i: number) {
  const rule = rules.value[i]
  if (isNumericField(rule.field)) {
    rule.operator = 'equals'
  } else {
    rule.operator = 'is'
  }
  rule.value = ''
  rule.value2 = ''
}

function addRule() {
  rules.value.push({ field: 'genre', operator: 'is', value: '', value2: '' })
}

// Preview matching tracks count
const matchCount = computed(() => {
  const validRules = rules.value.filter(r => r.value.toString().trim() !== '')
  if (validRules.length === 0) return -1

  return library.tracks.filter((track: Track) => {
    const results = validRules.map(rule => matchRule(track, rule))
    return ruleMatch.value === 'all' ? results.every(Boolean) : results.some(Boolean)
  }).length
})

function matchRule(track: Track, rule: SmartPlaylistRule): boolean {
  const fieldValue = String((track as unknown as Record<string, unknown>)[rule.field] || '').toLowerCase()
  const ruleValue = String(rule.value).toLowerCase()

  switch (rule.operator) {
    case 'is':
    case 'equals':
      return fieldValue === ruleValue
    case 'contains':
      return fieldValue.includes(ruleValue)
    case 'starts':
      return fieldValue.startsWith(ruleValue)
    case 'greater':
      return Number(fieldValue) > Number(rule.value)
    case 'less':
      return Number(fieldValue) < Number(rule.value)
    case 'between':
      return Number(fieldValue) >= Number(rule.value) && Number(fieldValue) <= Number(rule.value2)
    default:
      return false
  }
}

// Reset when dialog opens/closes
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
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
  emit('save', {
    name: name.value.trim(),
    rules: rules.value.filter(r => r.value.toString().trim() !== ''),
    ruleMatch: ruleMatch.value,
  })
}
</script>

<style scoped>
select option {
  background: #1a1a2e;
  color: rgba(255, 255, 255, 0.8);
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.dialog-slide-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.dialog-slide-leave-active { transition: all 0.2s ease-in; }
.dialog-slide-enter-from, .dialog-slide-leave-to { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
.dialog-slide-enter-to, .dialog-slide-leave-from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
</style>
