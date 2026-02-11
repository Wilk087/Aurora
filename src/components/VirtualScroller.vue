<template>
  <div
    ref="containerRef"
    class="virtual-scroller"
    :style="{ height: containerHeight, overflowY: 'auto', overflowX: 'hidden' }"
    @scroll.passive="onScroll"
  >
    <div :style="{ height: totalHeight + 'px', position: 'relative' }">
      <div :style="{ position: 'absolute', top: offsetY + 'px', left: 0, right: 0 }">
        <div
          v-for="item in visibleItems"
          :key="item.key"
          :style="{ height: itemHeight + 'px' }"
        >
          <slot :item="item.data" :index="item.index" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  items: T[]
  itemHeight: number
  containerHeight?: string
  keyField?: string
  overscan?: number
}>(), {
  containerHeight: '100%',
  keyField: 'id',
  overscan: 10,
})

const containerRef = ref<HTMLElement>()
const scrollTop = ref(0)
const viewHeight = ref(600)

const totalHeight = computed(() => props.items.length * props.itemHeight)

const startIndex = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight) - props.overscan
  return Math.max(0, start)
})

const endIndex = computed(() => {
  const end = Math.ceil((scrollTop.value + viewHeight.value) / props.itemHeight) + props.overscan
  return Math.min(props.items.length, end)
})

const offsetY = computed(() => startIndex.value * props.itemHeight)

const visibleItems = computed(() => {
  const result: { data: T; index: number; key: string | number }[] = []
  for (let i = startIndex.value; i < endIndex.value; i++) {
    const item = props.items[i]
    result.push({
      data: item,
      index: i,
      key: (item as any)[props.keyField] ?? i,
    })
  }
  return result
})

function onScroll() {
  if (containerRef.value) {
    scrollTop.value = containerRef.value.scrollTop
  }
}

function updateViewHeight() {
  if (containerRef.value) {
    viewHeight.value = containerRef.value.clientHeight
  }
}

let ro: ResizeObserver | null = null

onMounted(() => {
  updateViewHeight()
  if (containerRef.value) {
    ro = new ResizeObserver(updateViewHeight)
    ro.observe(containerRef.value)
  }
})

onUnmounted(() => {
  ro?.disconnect()
})

// Reset scroll when items change dramatically (e.g. new search)
watch(() => props.items.length, () => {
  nextTick(updateViewHeight)
})

defineExpose({ containerRef })
</script>
