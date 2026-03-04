<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-[80] bg-black/50" @click="$emit('cancel')" />
    </Transition>

    <!-- Dialog -->
    <Transition name="dialog-slide">
      <div
        v-if="show"
        class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-[360px] max-w-[90vw] rounded-2xl bg-[#12121f]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl"
      >
        <div class="p-6">
          <!-- Icon -->
          <div
            v-if="variant === 'danger'"
            class="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4"
          >
            <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </div>

          <!-- Title -->
          <h3 class="text-base font-semibold text-white mb-1">{{ title }}</h3>

          <!-- Message -->
          <p class="text-sm text-white/50 leading-relaxed">{{ message }}</p>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2.5 mt-6">
            <button
              @click="$emit('cancel')"
              class="px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              {{ cancelLabel }}
            </button>
            <button
              @click="$emit('confirm')"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="
                variant === 'danger'
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20'
                  : 'bg-accent/20 text-accent hover:bg-accent/30 border border-accent/20'
              "
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  show: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
}>(), {
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  variant: 'default',
})

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.dialog-slide-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.dialog-slide-leave-active { transition: all 0.2s ease-in; }
.dialog-slide-enter-from, .dialog-slide-leave-to { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
.dialog-slide-enter-to, .dialog-slide-leave-from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
</style>
