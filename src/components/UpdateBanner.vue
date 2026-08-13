<template>
  <Transition name="update-slide">
    <div
      v-if="visible"
      class="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-full px-4"
    >
      <div class="bg-white/[0.08] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 shadow-2xl">
        <div class="flex items-start gap-3">
          <!-- Icon -->
          <div class="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg class="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white">
              {{ readyToInstall ? 'Update ready' : 'Update available' }}
            </p>
            <p class="text-xs text-white/50 mt-0.5">
              <template v-if="readyToInstall">
                Aurora Player <span class="text-white/70 font-medium">v{{ latestVersion }}</span> is
                downloaded. Restart to finish installing.
              </template>
              <template v-else>
                Aurora Player <span class="text-white/70 font-medium">v{{ latestVersion }}</span> is available.
                You're on v{{ currentVersion }}.
              </template>
            </p>

            <!-- Package-managed installs update through their own package manager -->
            <div v-if="method === 'package-manager' && command" class="mt-2">
              <p class="text-xs text-white/40">Update through your package manager:</p>
              <code class="block mt-1 px-2 py-1.5 rounded-lg bg-black/30 text-[11px] text-white/70 font-mono break-all">
                {{ command }}
              </code>
            </div>

            <!-- Download progress -->
            <div v-if="downloading" class="mt-2">
              <div class="h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  class="h-full bg-accent transition-[width] duration-200"
                  :style="{ width: `${Math.round(progress)}%` }"
                />
              </div>
              <p class="text-[11px] text-white/40 mt-1">Downloading… {{ Math.round(progress) }}%</p>
            </div>

            <p v-if="error" class="text-xs text-red-400/80 mt-2">{{ error }}</p>
          </div>

          <!-- Close -->
          <button
            @click="dismiss"
            class="text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 mt-3 ml-12">
          <button
            v-if="readyToInstall"
            @click="restart"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:brightness-110 transition-all"
          >
            Restart now
          </button>
          <button
            v-else-if="method === 'auto'"
            @click="download"
            :disabled="downloading"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-default"
          >
            {{ downloading ? 'Downloading…' : 'Update now' }}
          </button>
          <button
            v-else-if="method === 'package-manager'"
            @click="copyCommand"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:brightness-110 transition-all"
          >
            {{ copied ? 'Copied' : 'Copy command' }}
          </button>
          <button
            v-else
            @click="openRelease"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:brightness-110 transition-all"
          >
            Download
          </button>

          <button
            @click="openRelease"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.06] text-white/60 hover:text-white/80 hover:bg-white/[0.1] transition-all"
          >
            Release notes
          </button>
          <button
            @click="dismiss"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.06] text-white/60 hover:text-white/80 hover:bg-white/[0.1] transition-all"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const visible = ref(false)
const currentVersion = ref('')
const latestVersion = ref('')
const releaseUrl = ref('')

/** How this install is expected to update. See electron/updater.ts. */
const method = ref<'auto' | 'manual' | 'package-manager'>('manual')
const command = ref<string | undefined>(undefined)

const downloading = ref(false)
const readyToInstall = ref(false)
const progress = ref(0)
const error = ref('')
const copied = ref(false)

async function dismiss() {
  visible.value = false
  // Persist that we dismissed this specific version
  try {
    await window.api.mergeSettings({ dismissedUpdateVersion: latestVersion.value })
  } catch {}
}

function openRelease() {
  if (releaseUrl.value) {
    window.api.openExternal(releaseUrl.value)
  }
}

async function download() {
  error.value = ''
  downloading.value = true
  try {
    await window.api.downloadUpdate()
  } catch (err: any) {
    // Leave the banner up so the user can still reach the release page.
    downloading.value = false
    error.value = err?.message ?? 'Download failed'
  }
}

async function restart() {
  try {
    await window.api.installUpdate()
  } catch (err: any) {
    error.value = err?.message ?? 'Could not install the update'
  }
}

async function copyCommand() {
  if (!command.value) return
  try {
    await navigator.clipboard.writeText(command.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {}
}

onMounted(async () => {
  try {
    // Small delay so the app loads first
    await new Promise(r => setTimeout(r, 3000))

    const result = await window.api.checkForUpdate()
    if (!result) return

    // Check if user already dismissed this version
    const settings = await window.api.getSettings()
    if (settings.dismissedUpdateVersion === result.latestVersion) return

    currentVersion.value = result.currentVersion
    latestVersion.value = result.latestVersion
    releaseUrl.value = result.url
    method.value = result.method
    command.value = result.command

    window.api.onUpdateProgress(p => { progress.value = p.percent })
    window.api.onUpdateDownloaded(() => {
      downloading.value = false
      readyToInstall.value = true
    })
    window.api.onUpdateError(e => {
      downloading.value = false
      error.value = e.message
    })

    visible.value = true
  } catch {}
})

onUnmounted(() => {
  window.api.removeUpdateListeners()
})
</script>

<style scoped>
.update-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.update-slide-leave-active {
  transition: all 0.25s ease-in;
}
.update-slide-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
.update-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
