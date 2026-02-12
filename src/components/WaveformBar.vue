<template>
  <div
    ref="containerRef"
    class="waveform-bar relative h-8 cursor-pointer select-none group"
    @mousedown="startSeek"
    @mousemove="onHover"
    @mouseleave="hoverProgress = -1"
  >
    <!-- Waveform bars -->
    <div class="absolute inset-0 flex items-center gap-[1px]">
      <div
        v-for="(bar, i) in bars"
        :key="i"
        class="flex-1 rounded-full transition-colors duration-100"
        :style="{ height: Math.max(2, bar * 100) + '%' }"
        :class="i / bars.length <= progress / 100 ? 'bg-accent' : 'bg-white/20 group-hover:bg-white/25'"
      />
    </div>

    <!-- Hover indicator -->
    <div
      v-if="hoverProgress >= 0"
      class="absolute top-0 bottom-0 w-[2px] bg-white/40 pointer-events-none transition-opacity"
      :style="{ left: hoverProgress + '%' }"
    />

    <!-- Hover time tooltip -->
    <div
      v-if="hoverProgress >= 0"
      class="absolute -top-6 text-[10px] text-white/60 bg-black/60 rounded px-1.5 py-0.5 pointer-events-none whitespace-nowrap"
      :style="{ left: hoverProgress + '%', transform: 'translateX(-50%)' }"
    >
      {{ formatTime(hoverProgress / 100 * duration) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatTime } from '@/utils/formatTime'

const props = defineProps<{
  data: number[]
  progress: number
  duration: number
}>()

const emit = defineEmits<{
  seek: [percent: number]
}>()

const containerRef = ref<HTMLElement>()
const hoverProgress = ref(-1)

// Downsample or use data directly (target ~120 bars for a nice look)
const bars = computed(() => {
  if (props.data.length === 0) return new Array(120).fill(0.05)
  if (props.data.length <= 150) return props.data
  // Downsample
  const target = 120
  const step = props.data.length / target
  const result: number[] = []
  for (let i = 0; i < target; i++) {
    const start = Math.floor(i * step)
    const end = Math.floor((i + 1) * step)
    let sum = 0
    for (let j = start; j < end; j++) sum += props.data[j]
    result.push(sum / (end - start))
  }
  return result
})

function getPercent(e: MouseEvent): number {
  if (!containerRef.value) return 0
  const rect = containerRef.value.getBoundingClientRect()
  return Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
}

function startSeek(e: MouseEvent) {
  emit('seek', getPercent(e))

  const onMove = (ev: MouseEvent) => {
    emit('seek', getPercent(ev))
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function onHover(e: MouseEvent) {
  hoverProgress.value = getPercent(e)
}
</script>
