<template>
  <div class="relative" ref="triggerEl">
    <button
      @click.stop="toggle"
      class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/[0.15] text-sm text-white/70 hover:text-white transition-all border border-white/[0.08]"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-4.5L16.5 16.5m0 0L12 12m4.5 4.5V7.5" />
      </svg>
      {{ label }}<span v-if="activeTags" class="text-white/40"> &bull; {{ activeTags }} tag{{ activeTags !== 1 ? 's' : '' }}</span>
      <svg class="w-3 h-3 ml-0.5 transition-transform" :class="showSortMenu ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <Teleport to="body">
      <div v-if="showSortMenu" class="fixed inset-0 z-[90]" @click="showSortMenu = false" />
      <div
        v-if="showSortMenu"
        class="fixed z-[100] w-80 py-1.5 rounded-xl menu-panel shadow-2xl"
        :style="sortMenuStyle"
      >
        <p class="px-3.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">Sort</p>
        <button
          v-for="option in options"
          :key="option.value"
          @click="select(option.value)"
          class="w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center justify-between"
          :class="modelValue === option.value ? 'text-accent bg-white/[0.08]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'"
        >
          {{ option.label }}
          <svg v-if="modelValue === option.value" class="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        </button>
        <slot name="filter" :close="closeSortMenu" />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSortDropdown } from '@/composables/useSortDropdown'

const props = defineProps<{
  options: { value: string; label: string }[]
  modelValue: string
  label: string
  activeTags?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const triggerEl = ref<HTMLElement>()
const { showSortMenu, sortMenuStyle, toggleSortMenu, closeSortMenu } = useSortDropdown()

function toggle() {
  if (triggerEl.value) toggleSortMenu(triggerEl.value)
}

function select(value: string) {
  emit('update:modelValue', value)
  closeSortMenu()
}
</script>
