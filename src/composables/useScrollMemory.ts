import { onActivated, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

/**
 * Session-scoped scroll position memory.
 * Uses onBeforeRouteLeave to save (DOM is still visible at that point)
 * and onActivated + requestAnimationFrame to restore.
 */
const scrollPositions = new Map<string, number>()

export function useScrollMemory(key: string, containerRef: Ref<HTMLElement | null>) {
  function save() {
    if (containerRef.value) {
      scrollPositions.set(key, containerRef.value.scrollTop)
    }
  }

  function restore() {
    const pos = scrollPositions.get(key)
    if (pos !== undefined && containerRef.value) {
      containerRef.value.scrollTop = pos
    }
  }

  onActivated(() => {
    requestAnimationFrame(() => restore())
  })

  onBeforeRouteLeave(() => {
    save()
  })

  return { save, restore }
}
