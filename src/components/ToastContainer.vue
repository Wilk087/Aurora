<template>
  <Teleport to="body">
    <div class="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl backdrop-blur-xl border shadow-2xl max-w-xs"
          :class="toastClass(toast.type)"
        >
          <!-- Icon -->
          <svg v-if="toast.type === 'success'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <svg v-else-if="toast.type === 'warning'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <svg v-else-if="toast.type === 'error'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <svg v-else class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>

          <span class="text-sm font-medium leading-tight">{{ toast.message }}</span>

          <button
            @click="dismiss(toast.id)"
            class="ml-auto shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

function toastClass(type: string) {
  switch (type) {
    case 'success': return 'toast-success'
    case 'warning': return 'toast-warning'
    case 'error':   return 'toast-error'
    default:        return 'toast-info'
  }
}
</script>

<style scoped>
/* Toast variants — use solid accent-safe colors for readable contrast
   on both dark and light themes. Background is a solid tinted surface. */
.toast-success {
  background: color-mix(in srgb, #10b981 18%, var(--glass-heavy-bg));
  border-color: rgba(16, 185, 129, 0.35);
  color: #6ee7b7; /* always light green — readable on the tinted dark bg */
}
.toast-warning {
  background: color-mix(in srgb, #f59e0b 18%, var(--glass-heavy-bg));
  border-color: rgba(245, 158, 11, 0.35);
  color: #fcd34d;
}
.toast-error {
  background: color-mix(in srgb, #ef4444 18%, var(--glass-heavy-bg));
  border-color: rgba(239, 68, 68, 0.35);
  color: #fca5a5;
}
.toast-info {
  background: var(--glass-heavy-bg);
  border-color: var(--border);
  color: rgb(var(--app-text) / 0.85);
}

.toast-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translateX(40px) scale(0.95); }
.toast-leave-to { opacity: 0; transform: translateX(40px) scale(0.95); }
.toast-move { transition: transform 0.25s ease; }
</style>
