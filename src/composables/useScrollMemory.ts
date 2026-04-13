import { onActivated } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

/**
 * Session-scoped scroll position memory.
 * Pass a getter that returns the scrollable element — avoids needing a
 * dedicated ref when the element is accessed via nested property or DOM query.
 *
 * Uses onBeforeRouteLeave to save (DOM is still visible at that point)
 * and onActivated + requestAnimationFrame to restore.
 */
export function useScrollMemory(getEl: () => HTMLElement | null | undefined) {
  let savedScrollTop = 0

  onActivated(() => {
    requestAnimationFrame(() => {
      const el = getEl()
      if (el) el.scrollTop = savedScrollTop
    })
  })

  onBeforeRouteLeave(() => {
    const el = getEl()
    if (el) savedScrollTop = el.scrollTop
  })
}
