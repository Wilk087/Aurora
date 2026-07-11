<template>
  <div class="relative" ref="triggerEl">
    <button
      @click.stop="toggle"
      class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/[0.15] text-sm transition-all border border-white/[0.08]"
      :class="modelValue.length ? 'text-accent' : 'text-white/70 hover:text-white'"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
      </svg>
      Filter<span v-if="modelValue.length" class="text-white/40"> &bull; {{ modelValue.length }} tag{{ modelValue.length !== 1 ? 's' : '' }}</span>
      <svg class="w-3 h-3 ml-0.5 transition-transform" :class="showSortMenu ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <Teleport to="body">
      <div v-if="showSortMenu" class="fixed inset-0 z-[90]" @click="closeSortMenu" />
      <div
        v-if="showSortMenu"
        class="fixed z-[100] w-64 py-1.5 rounded-xl menu-panel shadow-2xl"
        :style="sortMenuStyle"
        @click.stop
      >
        <div class="px-3.5 py-1">
          <div class="flex items-center justify-between mb-1.5">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-white/30">Filter by Tags</p>
            <button v-if="modelValue.length" @click="emit('update:modelValue', [])" class="text-[10px] text-white/40 hover:text-white/70 transition-colors">Clear</button>
          </div>
          <input v-model="tagSearch" type="text" placeholder="Search tags..." class="w-full px-2.5 py-1.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/25 outline-none focus:border-accent/40" />
        </div>
        <div class="max-h-52 overflow-y-auto py-1">
          <button
            v-for="tag in filteredOptions"
            :key="tag"
            @click="toggleTag(tag)"
            class="w-full px-3.5 py-1.5 text-left text-xs transition-colors flex items-center justify-between"
            :class="modelValue.includes(tag) ? 'text-accent bg-white/[0.08]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'"
          >
            <span class="truncate pr-2">{{ tag }}</span>
            <svg v-if="modelValue.includes(tag)" class="w-3.5 h-3.5 text-accent shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </button>
          <p v-if="filteredOptions.length === 0" class="px-3.5 py-2 text-xs text-white/30">No matching tags</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSortDropdown } from '@/composables/useSortDropdown'

const props = defineProps<{
  tags: string[]
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const triggerEl = ref<HTMLElement>()
const tagSearch = ref('')
const { showSortMenu, sortMenuStyle, toggleSortMenu, closeSortMenu } = useSortDropdown()

const filteredOptions = computed(() => {
  const q = tagSearch.value.toLowerCase().trim()
  if (!q) return props.tags
  return props.tags.filter(tag => tag.toLowerCase().includes(q))
})

function toggle() {
  if (triggerEl.value) toggleSortMenu(triggerEl.value)
}

function toggleTag(tag: string) {
  emit(
    'update:modelValue',
    props.modelValue.includes(tag)
      ? props.modelValue.filter(t => t !== tag)
      : [...props.modelValue, tag],
  )
}
</script>
