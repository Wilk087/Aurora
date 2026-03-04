<template>
  <Teleport to="body">
    <Transition name="wizard-backdrop">
      <div
        v-if="visible"
        class="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md"
        @click.self="() => {}"
      >
        <Transition name="wizard-card" appear>
          <div
            class="wizard-card relative w-[480px] max-h-[min(560px,85vh)] bg-[#1a1a1a]/95 border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <!-- Progress dots -->
            <div class="flex items-center justify-center gap-2 pt-6 pb-2">
              <button
                v-for="(_, i) in steps"
                :key="i"
                @click="i < step ? step = i : null"
                class="transition-all duration-300 rounded-full"
                :class="[
                  i === step ? 'w-6 h-2 bg-accent' : i < step ? 'w-2 h-2 bg-accent/50 cursor-pointer hover:bg-accent/70' : 'w-2 h-2 bg-white/15'
                ]"
              />
            </div>

            <!-- Step content with transitions -->
            <div class="flex-1 overflow-y-auto px-8 py-4">
              <TransitionGroup name="wizard-step">
                <!-- Step 0: Welcome -->
                <div v-if="step === 0" key="welcome" class="wizard-step-content">
                  <div class="flex flex-col items-center text-center pt-4">
                    <div class="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mb-5">
                      <div class="w-6 h-6 rounded-full bg-accent" />
                    </div>
                    <h2 class="text-2xl font-bold text-white mb-2">Welcome to Aurora</h2>
                    <p class="text-sm text-white/40 leading-relaxed max-w-[340px]">
                      A beautiful local music player for Linux. Let's get you set up in just a few steps.
                    </p>
                  </div>
                </div>

                <!-- Step 1: Music Folders -->
                <div v-if="step === 1" key="folders" class="wizard-step-content">
                  <h2 class="text-lg font-semibold text-white mb-1">Add Your Music</h2>
                  <p class="text-xs text-white/35 mb-5">Tell Aurora where your music lives. You can always add more later in Settings.</p>

                  <div class="space-y-2 mb-4">
                    <div
                      v-for="folder in library.folders"
                      :key="folder"
                      class="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.05] group"
                    >
                      <div class="flex items-center gap-3 min-w-0">
                        <svg class="w-4 h-4 text-accent/60 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                        <span class="text-sm text-white/70 truncate">{{ folder }}</span>
                      </div>
                      <button
                        @click="library.removeFolder(folder)"
                        class="text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div
                      v-if="library.folders.length === 0"
                      class="px-4 py-8 rounded-xl bg-white/[0.03] border border-dashed border-white/[0.08] text-center"
                    >
                      <svg class="w-8 h-8 text-white/15 mx-auto mb-2" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                      </svg>
                      <p class="text-sm text-white/25">No folders added yet</p>
                    </div>
                  </div>

                  <button
                    @click="library.addFolder()"
                    :disabled="library.isScanning"
                    class="w-full px-5 py-2.5 bg-accent/15 hover:bg-accent/25 border border-accent/20 disabled:opacity-50 rounded-xl text-sm font-medium text-accent transition-colors flex items-center justify-center gap-2"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Music Folder
                  </button>

                  <!-- Scan progress -->
                  <div v-if="library.isScanning" class="mt-3 flex items-center gap-3">
                    <div class="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                    <span class="text-xs text-white/40">
                      Scanning {{ library.scanProgress.current }}/{{ library.scanProgress.total }} files...
                    </span>
                  </div>
                </div>

                <!-- Step 2: Appearance -->
                <div v-if="step === 2" key="appearance" class="wizard-step-content">
                  <h2 class="text-lg font-semibold text-white mb-1">Appearance</h2>
                  <p class="text-xs text-white/35 mb-5">Customize how Aurora looks and feels.</p>

                  <div class="space-y-3">
                    <WizardToggle
                      label="Window Transparency"
                      description="Glass-like transparency effect on the window background"
                      :modelValue="player.transparencyEnabled"
                      @update:modelValue="player.setTransparencyEnabled($event)"
                    />
                    <WizardToggle
                      label="Adaptive Accent Color"
                      description="Auto-adjust the accent color based on the current album's artwork"
                      :modelValue="player.adaptiveAccent"
                      @update:modelValue="player.setAdaptiveAccent($event)"
                    />
                    <WizardToggle
                      label="iOS-Style Sliders"
                      description="Replace standard sliders with pill-shaped iOS-style controls"
                      :modelValue="player.iosSliders"
                      @update:modelValue="player.setIOSSliders($event)"
                    />
                    <WizardToggle
                      label="Motion Album Artwork"
                      description="Show animated album covers from Apple Music in fullscreen and album pages"
                      :modelValue="player.animatedCoversEnabled"
                      @update:modelValue="player.setAnimatedCoversEnabled($event)"
                    />
                  </div>
                </div>

                <!-- Step 3: Playback -->
                <div v-if="step === 3" key="playback" class="wizard-step-content">
                  <h2 class="text-lg font-semibold text-white mb-1">Playback</h2>
                  <p class="text-xs text-white/35 mb-5">Fine-tune your listening experience.</p>

                  <div class="space-y-3">
                    <WizardToggle
                      label="Waveform Progress Bar"
                      description="Replace the standard progress bar with an audio waveform visualization"
                      :modelValue="player.waveformEnabled"
                      @update:modelValue="player.setWaveformEnabled($event)"
                    />
                    <WizardToggle
                      label="Audio Normalization"
                      description="Reduce volume differences between tracks using dynamic compression"
                      :modelValue="player.normalization"
                      @update:modelValue="player.setNormalization($event)"
                    />
                    <WizardToggle
                      label="Auto-Fullscreen on Idle"
                      description="Automatically enter fullscreen when the mouse is idle during playback"
                      :modelValue="player.autoFullscreen"
                      @update:modelValue="player.setAutoFullscreen($event)"
                    />
                  </div>
                </div>

                <!-- Step 4: All Set -->
                <div v-if="step === 4" key="done" class="wizard-step-content">
                  <div class="flex flex-col items-center text-center pt-6">
                    <div class="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mb-5">
                      <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <h2 class="text-2xl font-bold text-white mb-2">You're All Set!</h2>
                    <p class="text-sm text-white/40 leading-relaxed max-w-[320px]">
                      Aurora is ready to go. You can always change these settings later. Enjoy your music!
                    </p>
                  </div>
                </div>
              </TransitionGroup>
            </div>

            <!-- Navigation buttons -->
            <div class="px-8 pb-6 pt-2 flex items-center" :class="step === 0 ? 'justify-center' : 'justify-between'">
              <button
                v-if="step > 0"
                @click="step--"
                class="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-sm font-medium text-white/50 hover:text-white/70 transition-colors"
              >
                Back
              </button>

              <button
                @click="nextStep"
                class="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200"
                :class="step === 4
                  ? 'bg-green-500/80 hover:bg-green-500/90 shadow-lg shadow-green-500/20'
                  : 'bg-accent hover:bg-accent-hover shadow-lg shadow-accent/20'"
              >
                {{ step === 0 ? 'Get Started' : step === 4 ? 'Start Listening' : step === 1 && library.folders.length === 0 ? 'Skip for Now' : 'Continue' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useLibraryStore } from '@/stores/library'

/* ── Sub-component: Toggle row (inline) ───────────────────── */
import { defineComponent, h } from 'vue'

const WizardToggle = defineComponent({
  name: 'WizardToggle',
  props: {
    label: String,
    description: String,
    modelValue: Boolean,
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.07] transition-colors' }, [
        h('div', { class: 'pr-4' }, [
          h('p', { class: 'text-sm text-white/80' }, props.label),
          h('p', { class: 'text-xs text-white/30 mt-0.5' }, props.description),
        ]),
        h(
          'button',
          {
            onClick: () => emit('update:modelValue', !props.modelValue),
            class: [
              'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
              props.modelValue ? 'bg-accent' : 'bg-white/15',
            ],
          },
          [
            h('div', {
              class: [
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                props.modelValue ? 'translate-x-[22px]' : 'translate-x-0.5',
              ],
            }),
          ]
        ),
      ])
  },
})

/* ── Main setup ───────────────────────────────────────────── */

const player = usePlayerStore()
const library = useLibraryStore()

const emit = defineEmits<{
  (e: 'complete'): void
}>()

const visible = ref(true)
const step = ref(0)
const steps = [0, 1, 2, 3, 4] // welcome, folders, appearance, playback, done

async function nextStep() {
  if (step.value < 4) {
    step.value++
  } else {
    // Mark setup as complete and close
    const s = await window.api.getSettings()
    s.setupComplete = true
    await window.api.saveSettings(s)
    visible.value = false
    setTimeout(() => emit('complete'), 350)
  }
}
</script>

<style scoped>
/* Backdrop */
.wizard-backdrop-enter-active,
.wizard-backdrop-leave-active {
  transition: opacity 0.35s ease;
}
.wizard-backdrop-enter-from,
.wizard-backdrop-leave-to {
  opacity: 0;
}

/* Card */
.wizard-card-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.wizard-card-leave-active {
  transition: all 0.25s ease-in;
}
.wizard-card-enter-from {
  opacity: 0;
  transform: scale(0.92) translateY(20px);
}
.wizard-card-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}

/* Step transitions */
.wizard-step-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.wizard-step-leave-active {
  transition: all 0.2s ease-in;
  position: absolute;
  width: 100%;
}
.wizard-step-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.wizard-step-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Content area relative for absolute step transitions */
.wizard-step-content {
  min-height: 200px;
}
</style>
