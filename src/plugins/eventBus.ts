/**
 * Lightweight typed event emitter for Aurora plugins.
 *
 * Plugins subscribe via the API they receive; the player store and other
 * core code call `emit()` to broadcast lifecycle events.
 */

type Handler = (...args: any[]) => void

const listeners = new Map<string, Set<Handler>>()

export const pluginBus = {
  on(event: string, handler: Handler) {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event)!.add(handler)
  },

  off(event: string, handler: Handler) {
    listeners.get(event)?.delete(handler)
  },

  emit(event: string, ...args: any[]) {
    const handlers = listeners.get(event)
    if (!handlers) return
    for (const h of handlers) {
      try {
        h(...args)
      } catch (err) {
        console.error(`[Aurora Plugin Bus] Error in "${event}" handler:`, err)
      }
    }
  },

  /** Remove all listeners for a specific plugin prefix (used on unload) */
  removeAllFor(prefix: string) {
    for (const [event, handlers] of listeners) {
      if (event.startsWith(prefix)) {
        handlers.clear()
      }
    }
  },

  /** Nuke everything — used on app shutdown / full reload */
  clear() {
    listeners.clear()
  },
}
