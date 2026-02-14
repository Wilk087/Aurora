<template>
  <div class="relative">
    <!-- Trigger button -->
    <button
      @click="open = !open"
      class="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
      :class="player.sleepTimerMode ? 'text-accent' : 'text-white/40 hover:text-white/70'"
      title="Sleep timer"
    >
      <!-- Timer icon -->
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>

    <!-- Dropdown menu -->
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-[90]" @click="open = false" />
      <Transition name="menu-fade">
        <div
          v-if="open"
          class="fixed z-[100] w-56 rounded-xl bg-[#1a1a2e]/95 backdrop-blur-lg border border-white/10 py-1.5 shadow-2xl"
          :style="menuStyle"
          @click.stop
        >
          <!-- Active timer display -->
          <div v-if="player.sleepTimerMode" class="px-4 py-2 border-b border-white/[0.06]">
            <p class="text-xs text-accent font-medium">
              <template v-if="player.sleepTimerMode === 'song'">Stopping after this song</template>
              <template v-else-if="player.sleepTimerMode === 'album'">Stopping after this album</template>
              <template v-else>{{ formatRemaining(player.sleepTimerRemaining) }} remaining</template>
            </p>
            <button
              @click="cancel"
              class="mt-1.5 text-[11px] text-red-400 hover:text-red-300 transition-colors"
            >Cancel timer</button>
          </div>

          <!-- Options -->
          <template v-if="!showCustom">
            <button @click="set('song')" class="menu-item">
              <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
              After this song
            </button>
            <button @click="set('album')" class="menu-item">
              <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
              </svg>
              After this album
            </button>

            <div class="border-t border-white/[0.06] my-1" />

            <button @click="setTime(15)" class="menu-item">
              <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              15 minutes
            </button>
            <button @click="setTime(30)" class="menu-item">
              <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              30 minutes
            </button>
            <button @click="setTime(45)" class="menu-item">
              <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              45 minutes
            </button>
            <button @click="setTime(60)" class="menu-item">
              <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              60 minutes
            </button>
            <button @click="setTime(90)" class="menu-item">
              <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              90 minutes
            </button>

            <div class="border-t border-white/[0.06] my-1" />

            <button @click="showCustom = true" class="menu-item">
              <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
              Custom time...
            </button>
          </template>

          <!-- Custom time input -->
          <div v-else class="px-4 py-3">
            <p class="text-xs text-white/50 mb-2">Enter time in minutes</p>
            <div class="flex items-center gap-2">
              <input
                ref="customInput"
                v-model="customMinutes"
                type="number"
                min="1"
                max="999"
                placeholder="e.g. 120"
                class="flex-1 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:border-accent/50 transition-colors"
                @keydown.enter="applyCustom"
                @keydown.escape="showCustom = false"
              />
              <button
                @click="applyCustom"
                class="px-3 py-1.5 rounded-lg bg-accent/80 hover:bg-accent text-white text-sm font-medium transition-colors"
              >Set</button>
            </div>
            <button
              @click="showCustom = false"
              class="mt-2 text-[11px] text-white/40 hover:text-white/60 transition-colors"
            >← Back</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { usePlayerStore } from '@/stores/player'

const player = usePlayerStore()
const open = ref(false)
const showCustom = ref(false)
const customMinutes = ref('')
const customInput = ref<HTMLInputElement>()

// Position the menu above the trigger button
const menuStyle = computed(() => {
  // Position near bottom-right of screen (above the player bar)
  return {
    bottom: '72px',
    right: '180px',
  }
})

watch(showCustom, (val) => {
  if (val) nextTick(() => customInput.value?.focus())
})

watch(open, (val) => {
  if (!val) showCustom.value = false
})

function set(mode: 'song' | 'album') {
  player.startSleepTimer(mode)
  open.value = false
}

function setTime(minutes: number) {
  player.startSleepTimer('time', minutes)
  open.value = false
}

function applyCustom() {
  const mins = parseInt(customMinutes.value)
  if (mins > 0) {
    player.startSleepTimer('time', mins)
    customMinutes.value = ''
    showCustom.value = false
    open.value = false
  }
}

function cancel() {
  player.cancelSleepTimer()
  open.value = false
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.menu-item {
  @apply w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5;
}

.menu-fade-enter-active { transition: all 0.15s ease-out; }
.menu-fade-leave-active { transition: all 0.1s ease-in; }
.menu-fade-enter-from, .menu-fade-leave-to { opacity: 0; transform: translateY(4px); }
</style>
