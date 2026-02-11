<template>
  <div
    class="app-container h-screen flex flex-col overflow-hidden"
    :class="isFullscreen ? 'bg-black' : 'glass-heavy rounded-xl border border-white/[0.06]'"
  >
    <!-- Dynamic ambient glow derived from album art -->
    <div
      v-if="dynamicColor && !isFullscreen"
      class="fixed inset-0 pointer-events-none z-0 transition-all duration-1000"
      :style="{
        background: `radial-gradient(ellipse at 20% 50%, ${dynamicColor}15 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 20%, ${dynamicColor}10 0%, transparent 50%)`,
      }"
    />

    <!-- Titlebar -->
    <Titlebar v-if="!isFullscreen" />

    <!-- Main layout -->
    <div class="flex flex-1 overflow-hidden relative z-10">
      <Sidebar v-if="!isFullscreen" />

      <main class="flex-1 overflow-y-auto overflow-x-hidden">
        <router-view v-slot="{ Component }">
          <keep-alive :max="5" :exclude="['FullscreenView']">
            <component :is="Component" :key="$route.path" />
          </keep-alive>
        </router-view>
      </main>
    </div>

    <!-- Bottom player bar -->
    <PlayerBar v-if="player.currentTrack && !isFullscreen" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useLibraryStore } from '@/stores/library'
import { usePlaylistStore } from '@/stores/playlist'
import Titlebar from '@/components/Titlebar.vue'
import Sidebar from '@/components/Sidebar.vue'
import PlayerBar from '@/components/PlayerBar.vue'

const router = useRouter()
const route = useRoute()
const player = usePlayerStore()
const library = useLibraryStore()
const playlistStore = usePlaylistStore()
const dynamicColor = ref<string | null>(null)

const isFullscreen = computed(() => route.path === '/fullscreen')

onMounted(async () => {
  // Load saved settings
  const settings = await window.api.getSettings()
  if (settings.volume !== undefined) player.setVolume(settings.volume)
  if (settings.sortOrder) library.sortOrder = settings.sortOrder
  if (settings.albumSortOrder) library.albumSortOrder = settings.albumSortOrder

  // Restore last open tab
  if (settings.lastTab && settings.lastTab !== '/') {
    router.replace(settings.lastTab)
  }

  await library.loadLibrary()
  await playlistStore.loadPlaylists()
})

// Extract a dominant colour from the current track's cover art
watch(
  () => player.currentTrack?.coverArt,
  (coverArt) => {
    if (!coverArt) {
      dynamicColor.value = null
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = window.api.getMediaUrl(coverArt)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 8
      canvas.height = 8
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(img, 0, 0, 8, 8)
      const data = ctx.getImageData(0, 0, 8, 8).data

      let r = 0,
        g = 0,
        b = 0,
        count = 0
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
        if (brightness > 30 && brightness < 220) {
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count++
        }
      }

      if (count > 0) {
        dynamicColor.value = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`
      }
    }

    img.onerror = () => {
      dynamicColor.value = null
    }
  },
)
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
