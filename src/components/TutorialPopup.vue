<template>
  <!-- Help trigger button (shown once seen; slots into parent layout) -->
  <button
    v-if="ready && isSeen"
    @click="manuallyShown = true"
    class="tutorial-trigger flex items-center justify-center w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/40 hover:text-white/80 transition-colors"
    :title="`${title} — help`"
  >
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  </button>

  <!-- Tutorial popup (teleported to body) -->
  <Teleport to="body">
    <Transition name="tutorial-fade">
      <div
        v-if="ready && showPopup"
        class="fixed inset-0 z-[500] flex items-center justify-center p-4"
        style="background: rgba(0,0,0,0.6); backdrop-filter: blur(8px)"
        @click.self="dismiss"
      >
        <Transition name="tutorial-card" appear>
          <div
            class="tutorial-card relative w-full max-w-[460px] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col"
            style="background: var(--bg-secondary, #1a1a1a)"
          >
            <!-- Accent top bar -->
            <div class="h-0.5 w-full bg-accent/60" />

            <!-- Header -->
            <div class="px-6 pt-5 pb-3">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h3 class="text-base font-semibold text-white leading-snug">{{ title }}</h3>
                  <p v-if="description" class="text-sm text-white/50 mt-1 leading-relaxed">{{ description }}</p>
                </div>
                <button
                  @click="dismiss"
                  class="shrink-0 mt-0.5 p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Optional image/gif slot -->
            <div v-if="$slots.media" class="px-6 pb-3">
              <div class="rounded-xl overflow-hidden border border-white/[0.06] bg-black/30">
                <slot name="media" />
              </div>
            </div>

            <!-- Feature items -->
            <div v-if="items && items.length" class="px-6 pb-3 space-y-2">
              <div
                v-for="(item, i) in items"
                :key="i"
                class="flex items-start gap-3 text-sm"
              >
                <div class="shrink-0 mt-0.5 w-5 h-5 rounded-md bg-accent/15 flex items-center justify-center">
                  <svg v-if="!item.icon" class="w-3 h-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <span v-else class="text-accent text-[10px]">{{ item.icon }}</span>
                </div>
                <div>
                  <span class="text-white/80 font-medium">{{ item.label }}</span>
                  <span v-if="item.description" class="text-white/40 ml-1.5">{{ item.description }}</span>
                </div>
              </div>
            </div>

            <!-- Hotkeys section -->
            <div v-if="hotkeys && hotkeys.length" class="mx-6 mb-4 mt-1 px-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <p class="text-[10px] font-medium text-accent/60 uppercase tracking-wider mb-2">Keyboard shortcuts</p>
              <div class="space-y-1.5">
                <div v-for="(hk, i) in hotkeys" :key="i" class="flex items-center justify-between gap-4 text-xs">
                  <span class="text-white/50">{{ hk.description }}</span>
                  <div class="flex items-center gap-1 shrink-0">
                    <template v-for="(k, ki) in hk.keys" :key="ki">
                      <span v-if="ki > 0" class="text-white/20 text-[10px]">+</span>
                      <kbd class="px-1.5 py-0.5 rounded-md bg-white/[0.08] border border-white/[0.08] font-mono text-white/60 text-[10px] leading-none">{{ k }}</kbd>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <!-- Default slot for extra content -->
            <div v-if="$slots.default" class="px-6 pb-4">
              <slot />
            </div>

            <!-- Footer -->
            <div class="px-6 pb-5 pt-1 flex items-center justify-between gap-3">
              <span class="text-xs text-white/25">This won't show again</span>
              <button
                @click="dismiss"
                class="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent/80 text-sm font-medium text-white transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTutorial } from '@/composables/useTutorial'

interface TutorialItem {
  label: string
  description?: string
  icon?: string
}

interface TutorialHotkey {
  keys: string[]
  description: string
}

const props = defineProps<{
  tutorialKey: string
  title: string
  description?: string
  items?: TutorialItem[]
  hotkeys?: TutorialHotkey[]
}>()

const { ready, isSeen, markSeen } = useTutorial(props.tutorialKey)

const manuallyShown = ref(false)

const showPopup = computed(() => {
  if (!ready.value) return false
  if (manuallyShown.value) return true
  return !isSeen.value
})

async function dismiss() {
  manuallyShown.value = false
  await markSeen()
}

defineExpose({ show: () => { manuallyShown.value = true } })
</script>

<style scoped>
.tutorial-fade-enter-active,
.tutorial-fade-leave-active {
  transition: opacity 0.2s ease;
}
.tutorial-fade-enter-from,
.tutorial-fade-leave-to {
  opacity: 0;
}

.tutorial-card-enter-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tutorial-card-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tutorial-card-enter-from {
  opacity: 0;
  transform: scale(0.92) translateY(8px);
}
.tutorial-card-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
