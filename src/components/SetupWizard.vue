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
            class="wizard-card relative w-[520px] max-h-[min(620px,88vh)] bg-[#1a1a1a]/95 border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <!-- Progress dots -->
            <div class="flex items-center justify-center gap-2 pt-6 pb-2">
              <button
                v-for="(_, i) in totalSteps"
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
                  <!-- Image slot -->
                  <div v-if="stepImages[1]" class="mb-4 rounded-xl overflow-hidden border border-white/[0.06]">
                    <img :src="stepImages[1]" class="w-full h-auto" alt="Music folders" />
                  </div>

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
                  <!-- Image slot -->
                  <div v-if="stepImages[2]" class="mb-4 rounded-xl overflow-hidden border border-white/[0.06]">
                    <img :src="stepImages[2]" class="w-full h-auto" alt="Appearance" />
                  </div>

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
                  <!-- Image slot -->
                  <div v-if="stepImages[3]" class="mb-4 rounded-xl overflow-hidden border border-white/[0.06]">
                    <img :src="stepImages[3]" class="w-full h-auto" alt="Playback" />
                  </div>

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

                <!-- Step 4: Discord Rich Presence -->
                <div v-if="step === 4" key="discord" class="wizard-step-content">
                  <!-- Image slot -->
                  <div v-if="stepImages[4]" class="mb-4 rounded-xl overflow-hidden border border-white/[0.06]">
                    <img :src="stepImages[4]" class="w-full h-auto" alt="Discord Rich Presence" />
                  </div>

                  <div class="flex items-center gap-2 mb-1">
                    <h2 class="text-lg font-semibold text-white">Discord Rich Presence</h2>
                    <!-- Discord icon -->
                    <svg class="w-5 h-5 text-[#5865F2]/80" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
                    </svg>
                  </div>
                  <p class="text-xs text-white/35 mb-5">Show what you're listening to on your Discord profile. You can customize everything later in Settings.</p>

                  <div class="space-y-3">
                    <WizardToggle
                      label="Show activity in Discord"
                      description="Display current track on your Discord profile as a Rich Presence status"
                      :modelValue="discordEnabled"
                      @update:modelValue="toggleDiscord"
                    />

                    <div v-if="discordEnabled" class="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] space-y-3">
                      <div>
                        <p class="text-xs text-white/50 mb-1">Display Format</p>
                        <select
                          v-model="discordFormat"
                          @change="saveDiscordFormat"
                          class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 outline-none focus:border-accent/40 transition-colors appearance-none cursor-pointer"
                        >
                          <option value="title-artist">Song Title — by Artist</option>
                          <option value="artist-title">Artist — Song Title</option>
                          <option value="title-album">Song Title — on Album</option>
                          <option value="full">Full — Title by Artist + Album</option>
                          <option value="minimal">Minimal — Song Title only</option>
                        </select>
                      </div>

                      <div>
                        <p class="text-xs text-white/50 mb-1">Custom Application ID <span class="text-white/25">(optional)</span></p>
                        <p class="text-[11px] text-white/25 mb-2">
                          Create an app at
                          <a
                            href="#"
                            @click.prevent="openExternal('https://discord.com/developers/applications')"
                            class="text-accent/70 hover:text-accent transition-colors underline underline-offset-2"
                          >discord.com/developers/applications</a>
                          to customize the name shown. Your app name becomes "Playing <strong class="text-white/40">YourAppName</strong>".
                        </p>
                        <input
                          v-model="discordClientId"
                          type="text"
                          placeholder="e.g. 1234567890123456789"
                          class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Step 5: Navidrome / Subsonic -->
                <div v-if="step === 5" key="subsonic" class="wizard-step-content">
                  <!-- Image slot -->
                  <div v-if="stepImages[5]" class="mb-4 rounded-xl overflow-hidden border border-white/[0.06]">
                    <img :src="stepImages[5]" class="w-full h-auto" alt="Navidrome / Subsonic" />
                  </div>

                  <div class="flex items-center gap-2 mb-1">
                    <h2 class="text-lg font-semibold text-white">Navidrome / Subsonic</h2>
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-500/20 text-yellow-400 uppercase tracking-wider">WIP</span>
                  </div>
                  <p class="text-xs text-white/35 mb-2">Stream music from a remote server alongside your local library.</p>

                  <!-- How it works -->
                  <div class="mb-4 px-3 py-2.5 rounded-xl bg-accent/[0.06] border border-accent/[0.08]">
                    <p class="text-[11px] text-white/40 leading-relaxed">
                      <span class="font-semibold text-accent/70">How it works:</span>
                      If you have a <a href="#" @click.prevent="openExternal('https://www.navidrome.org')" class="text-accent/70 hover:text-accent underline underline-offset-2 transition-colors">Navidrome</a> or Subsonic-compatible server, Aurora can connect to it and merge your remote library with your local files. You'll be able to browse and play both seamlessly.
                    </p>
                  </div>

                  <div class="space-y-2.5">
                    <input
                      v-model="subsonicUrl"
                      type="url"
                      placeholder="Server URL (e.g. https://navidrome.example.com)"
                      class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
                    />
                    <div class="grid grid-cols-2 gap-2">
                      <input
                        v-model="subsonicUsername"
                        type="text"
                        placeholder="Username"
                        class="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
                      />
                      <input
                        v-model="subsonicPassword"
                        type="password"
                        placeholder="Password"
                        class="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
                      />
                    </div>

                    <div class="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.04]">
                      <span class="text-xs text-white/50">Legacy Authentication <span class="text-white/25">(for older servers)</span></span>
                      <button
                        @click="subsonicLegacyAuth = !subsonicLegacyAuth"
                        class="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0"
                        :class="subsonicLegacyAuth ? 'bg-accent' : 'bg-white/15'"
                      >
                        <div
                          class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                          :class="subsonicLegacyAuth ? 'translate-x-[18px]' : 'translate-x-0.5'"
                        />
                      </button>
                    </div>

                    <div class="flex items-center gap-2">
                      <button
                        @click="testSubsonic"
                        :disabled="subsonicTesting || !subsonicUrl || !subsonicUsername || !subsonicPassword"
                        class="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
                      >
                        {{ subsonicTesting ? 'Testing...' : 'Test Connection' }}
                      </button>
                      <div v-if="subsonicConnected" class="flex items-center gap-1.5">
                        <div class="w-2 h-2 rounded-full bg-green-400" />
                        <span class="text-xs text-green-400/80">Connected</span>
                      </div>
                    </div>
                  </div>

                  <p class="text-[11px] text-white/20 mt-3">Don't have a server? Skip this step — you can set it up later in Settings.</p>
                </div>

                <!-- Step 6: Remote Control -->
                <div v-if="step === 6" key="remote" class="wizard-step-content">
                  <!-- Image slot -->
                  <div v-if="stepImages[6]" class="mb-4 rounded-xl overflow-hidden border border-white/[0.06]">
                    <img :src="stepImages[6]" class="w-full h-auto" alt="Remote Control" />
                  </div>

                  <div class="flex items-center gap-2 mb-1">
                    <h2 class="text-lg font-semibold text-white">Remote Control</h2>
                    <!-- Phone icon -->
                    <svg class="w-4 h-4 text-accent/60 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  </div>
                  <p class="text-xs text-white/35 mb-4">Control Aurora from your phone — skip tracks, adjust volume, browse your library — all from any device on the same network.</p>

                  <!-- How it works -->
                  <div class="mb-4 px-3 py-2.5 rounded-xl bg-accent/[0.06] border border-accent/[0.08] space-y-2">
                    <p class="text-[11px] text-white/40 leading-relaxed">
                      <span class="font-semibold text-accent/70">How it works:</span>
                    </p>
                    <ol class="text-[11px] text-white/40 leading-relaxed space-y-1 list-decimal list-inside">
                      <li>Enable remote control below — this starts a small web server on your PC</li>
                      <li>Open the URL shown on any device connected to the same Wi-Fi</li>
                      <li>Enter the 4-digit PIN to pair — the PIN auto-refreshes every 5 minutes</li>
                      <li>Control playback, browse your library and manage the queue right from your phone</li>
                    </ol>
                  </div>

                  <div class="space-y-3">
                    <WizardToggle
                      label="Enable Remote Control"
                      description="Start a local server for mobile remote access"
                      :modelValue="remoteEnabled"
                      @update:modelValue="toggleRemote"
                    />

                    <div v-if="remoteEnabled" class="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      <p class="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">Connection</p>
                      <div class="flex items-center justify-between gap-3">
                        <p class="text-sm text-white/70 font-mono select-all">http://{{ remoteLanIp }}:{{ remotePort }}</p>
                        <div class="flex items-center gap-2">
                          <span class="text-[10px] font-semibold uppercase tracking-wider text-white/30">PIN</span>
                          <span class="text-lg font-bold font-mono text-accent tracking-widest select-all">{{ remotePin }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Step 7: All Set -->
                <div v-if="step === lastStep" key="done" class="wizard-step-content">
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
                :class="step === lastStep
                  ? 'bg-green-500/80 hover:bg-green-500/90 shadow-lg shadow-green-500/20'
                  : 'bg-accent hover:bg-accent-hover shadow-lg shadow-accent/20'"
              >
                {{ step === 0 ? 'Get Started' : step === lastStep ? 'Start Listening' : step === 1 && library.folders.length === 0 ? 'Skip for Now' : 'Continue' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
const lastStep = 7 // welcome(0), folders(1), appearance(2), playback(3), discord(4), subsonic(5), remote(6), done(7)
const totalSteps = Array.from({ length: lastStep + 1 })

/**
 * Image slots for each step — add images here later.
 * Map of step index → image URL (import or URL string).
 * Steps without an entry will simply not show an image.
 */
const stepImages: Record<number, string | null> = {
  // 1: '/path/to/music-folders-screenshot.png',
  // 2: '/path/to/appearance-screenshot.png',
  // 3: '/path/to/playback-screenshot.png',
  // 4: '/path/to/discord-screenshot.png',
  // 5: '/path/to/subsonic-screenshot.png',
  // 6: '/path/to/remote-screenshot.png',
}

// ── Discord RPC state ────────────────────
const discordEnabled = ref(true)
const discordFormat = ref('title-artist')
const discordClientId = ref('')

// ── Subsonic state ───────────────────────
const subsonicUrl = ref('')
const subsonicUsername = ref('')
const subsonicPassword = ref('')
const subsonicLegacyAuth = ref(false)
const subsonicConnected = ref(false)
const subsonicTesting = ref(false)

// ── Remote Control state ─────────────────
const remoteEnabled = ref(false)
const remoteLanIp = ref('')
const remotePort = ref(19876)
const remotePin = ref('')

onMounted(async () => {
  // Load current settings
  try {
    const settings = await window.api.getSettings()
    discordEnabled.value = settings.discordRPC !== false
    discordFormat.value = settings.discordRPCFormat || 'title-artist'
    discordClientId.value = settings.discordClientId || ''
    subsonicUrl.value = settings.subsonicUrl || ''
    subsonicUsername.value = settings.subsonicUsername || ''
    subsonicPassword.value = settings.subsonicPassword || ''
    subsonicLegacyAuth.value = settings.subsonicLegacyAuth === true
    subsonicConnected.value = settings.subsonicConnected === true
  } catch { /* first run, defaults are fine */ }

  // Load remote config
  try {
    const rc = await window.api.getRemoteConfig()
    remoteEnabled.value = rc.enabled
    remoteLanIp.value = rc.lanIp
    remotePort.value = rc.port
    remotePin.value = rc.pin
  } catch { /* remote not available yet */ }

  // Listen for auto-refreshed PIN
  window.api.onRemotePinChanged?.((pin: string) => {
    remotePin.value = pin
  })
})

// ── Discord handlers ─────────────────────
async function toggleDiscord(enabled: boolean) {
  discordEnabled.value = enabled
  const settings = await window.api.getSettings()
  settings.discordRPC = enabled
  await window.api.saveSettings(settings)
  await window.api.toggleDiscordRPC(enabled, discordClientId.value || undefined)
  player.setDiscordEnabled(enabled)
}

async function saveDiscordFormat() {
  const settings = await window.api.getSettings()
  settings.discordRPCFormat = discordFormat.value
  await window.api.saveSettings(settings)
  player.setDiscordFormat(discordFormat.value)
}

async function openExternal(url: string) {
  await window.api.openExternal(url)
}

// ── Subsonic handlers ────────────────────
async function testSubsonic() {
  subsonicTesting.value = true
  try {
    const ok = await window.api.subsonicTest({
      url: subsonicUrl.value.replace(/\/+$/, ''),
      username: subsonicUsername.value,
      password: subsonicPassword.value,
      useLegacyAuth: subsonicLegacyAuth.value,
    })
    if (ok) {
      subsonicConnected.value = true
      const settings = await window.api.getSettings()
      settings.subsonicUrl = subsonicUrl.value.replace(/\/+$/, '')
      settings.subsonicUsername = subsonicUsername.value
      settings.subsonicPassword = subsonicPassword.value
      settings.subsonicLegacyAuth = subsonicLegacyAuth.value
      settings.subsonicConnected = true
      await window.api.saveSettings(settings)
    } else {
      subsonicConnected.value = false
    }
  } catch {
    subsonicConnected.value = false
  } finally {
    subsonicTesting.value = false
  }
}

// ── Remote handlers ──────────────────────
async function toggleRemote(enabled: boolean) {
  remoteEnabled.value = enabled
  await window.api.setRemoteEnabled(enabled)
  if (enabled) {
    await window.api.remoteStartServer()
    const rc = await window.api.getRemoteConfig()
    remoteLanIp.value = rc.lanIp
    remotePort.value = rc.port
    remotePin.value = rc.pin
  } else {
    await window.api.remoteStopServer()
  }
}

// ── Navigation ───────────────────────────
async function nextStep() {
  // Save Discord client ID when leaving the Discord step
  if (step.value === 4 && discordClientId.value) {
    const settings = await window.api.getSettings()
    settings.discordClientId = discordClientId.value
    await window.api.saveSettings(settings)
    if (discordEnabled.value) {
      await window.api.toggleDiscordRPC(false)
      await window.api.toggleDiscordRPC(true, discordClientId.value)
    }
  }

  if (step.value < lastStep) {
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

/* Style native select dropdown for dark theme */
select option {
  background: #1a1a1a;
  color: rgba(255, 255, 255, 0.8);
}
</style>
