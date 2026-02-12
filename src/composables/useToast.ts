import { reactive } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
  duration: number
}

const state = reactive<{ toasts: Toast[] }>({ toasts: [] })
let nextId = 0

export function useToast() {
  function show(message: string, type: Toast['type'] = 'success', duration = 2500) {
    const id = ++nextId
    state.toasts.push({ id, message, type, duration })
    setTimeout(() => dismiss(id), duration)
  }

  function dismiss(id: number) {
    const idx = state.toasts.findIndex(t => t.id === id)
    if (idx >= 0) state.toasts.splice(idx, 1)
  }

  function success(message: string, duration?: number) { show(message, 'success', duration) }
  function info(message: string, duration?: number) { show(message, 'info', duration) }
  function warning(message: string, duration?: number) { show(message, 'warning', duration) }
  function error(message: string, duration?: number) { show(message, 'error', duration) }

  return { toasts: state.toasts, show, dismiss, success, info, warning, error }
}
