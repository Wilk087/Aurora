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
            <p class="text-sm font-medium text-white">Update available</p>
            <p class="text-xs text-white/50 mt-0.5">
              Aurora Player <span class="text-white/70 font-medium">v{{ latestVersion }}</span> is available.
              You're on v{{ currentVersion }}.
            </p>
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
            @click="openRelease"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:brightness-110 transition-all"
          >
            View release
          </button>
          <button
            @click="dismiss"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.06] text-white/60 hover:text-white/80 hover:bg-white/[0.1] transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const visible = ref(false)
const currentVersion = ref('')
const latestVersion = ref('')
const releaseUrl = ref('')

async function dismiss() {
  visible.value = false
  // Persist that we dismissed this specific version
  try {
    const settings = await window.api.getSettings()
    settings.dismissedUpdateVersion = latestVersion.value
    await window.api.saveSettings(settings)
  } catch {}
}

function openRelease() {
  if (releaseUrl.value) {
    window.api.openExternal(releaseUrl.value)
  }
  dismiss()
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
    visible.value = true
  } catch {}
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
