<template>
  <div
    ref="trackRef"
    class="ios-slider relative select-none cursor-pointer"
    :class="[vertical ? 'ios-slider--vertical' : '', sizeClass]"
    @pointerdown="onPointerDown"
  >
    <!-- Track background -->
    <div class="absolute inset-0 rounded-full bg-white/15" />
    <!-- Filled portion -->
    <div
      class="absolute rounded-full transition-[width,height] duration-75"
      :class="fillColor"
      :style="fillStyle"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  min?: number
  max?: number
  step?: number
  vertical?: boolean
  size?: 'sm' | 'md' | 'lg'
  fillColor?: string
}>(), {
  min: 0,
  max: 1,
  step: 0.01,
  vertical: false,
  size: 'md',
  fillColor: 'bg-white/70',
})

const emit = defineEmits<{
  (e: 'update', value: number): void
}>()

const trackRef = ref<HTMLElement | null>(null)
const dragging = ref(false)

const sizeClass = computed(() => {
  const map = { sm: 'ios-slider--sm', md: 'ios-slider--md', lg: 'ios-slider--lg' }
  return map[props.size]
})

const percent = computed(() => {
  if (props.max === props.min) return 0
  return ((props.value - props.min) / (props.max - props.min)) * 100
})

const fillStyle = computed(() => {
  if (props.vertical) {
    return { left: '0', right: '0', bottom: '0', height: percent.value + '%' }
  }
  return { top: '0', bottom: '0', left: '0', width: percent.value + '%' }
})

function clampStep(raw: number): number {
  const clamped = Math.max(props.min, Math.min(props.max, raw))
  // Round to nearest step
  const steps = Math.round((clamped - props.min) / props.step)
  return props.min + steps * props.step
}

function valueFromEvent(e: PointerEvent) {
  const el = trackRef.value!
  const rect = el.getBoundingClientRect()
  let ratio: number
  if (props.vertical) {
    ratio = 1 - (e.clientY - rect.top) / rect.height
  } else {
    ratio = (e.clientX - rect.left) / rect.width
  }
  return clampStep(props.min + ratio * (props.max - props.min))
}

function onPointerDown(e: PointerEvent) {
  e.preventDefault()
  dragging.value = true
  emit('update', valueFromEvent(e))
  const el = trackRef.value!
  el.setPointerCapture(e.pointerId)

  const onMove = (ev: PointerEvent) => {
    emit('update', valueFromEvent(ev))
  }
  const onUp = () => {
    dragging.value = false
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onUp)
  }
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)
}
</script>

<style scoped>
.ios-slider {
  border-radius: 9999px;
  overflow: hidden;
}
.ios-slider--sm { height: 4px; }
.ios-slider--md { height: 6px; }
.ios-slider--lg { height: 8px; }
.ios-slider--vertical {
  width: 6px;
  height: auto;
}
.ios-slider--vertical.ios-slider--sm { width: 4px; }
.ios-slider--vertical.ios-slider--lg { width: 8px; }
</style>
