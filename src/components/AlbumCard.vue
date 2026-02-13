<template>
  <div @click="$emit('click')" @contextmenu.prevent="openCtx" class="album-card group cursor-pointer">
    <div
      class="relative aspect-square rounded-xl overflow-hidden bg-white/[0.06] mb-3 cover-shadow transition-transform group-hover:scale-[1.02]"
    >
      <img
        v-if="album.coverArt"
        :src="coverUrl"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <svg class="w-12 h-12 text-white/10" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
          />
        </svg>
      </div>

      <!-- Play overlay -->
      <div
        class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center"
      >
        <button
          @click.stop="$emit('play')"
          class="w-12 h-12 rounded-full bg-accent flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all accent-glow"
        >
          <svg class="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
    </div>

    <p class="text-sm font-medium text-white truncate">{{ album.name }}</p>
    <p class="text-xs text-white/40 truncate">
      <span
        class="hover:text-white/60 hover:underline underline-offset-2 cursor-pointer transition-colors"
        @click.stop="goToArtist"
      >{{ album.artist }}</span>{{ album.year ? ` • ${album.year}` : '' }}
    </p>

    <!-- Context menu -->
    <Teleport to="body">
      <div v-if="showCtx" class="fixed inset-0 z-[90]" @click="showCtx = false" @contextmenu.prevent="showCtx = false" />
      <div
        v-if="showCtx"
        class="fixed z-[100] w-48 rounded-xl bg-[#1a1a2e]/95 backdrop-blur-lg border border-white/10 py-1.5 shadow-2xl"
        :style="ctxStyle"
      >
        <button
          @click.stop="playAlbum"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play Album
        </button>
        <button
          @click.stop="addToQueue"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
          Add to Queue
        </button>
        <button
          @click.stop="goToArtist"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          Go to Artist
        </button>
        <div class="border-t border-white/[0.06] my-1" />
        <button
          @click.stop="openInExplorer"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          Show in File Explorer
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import type { Album } from '@/stores/library'

const props = defineProps<{ album: Album }>()

defineEmits(['click', 'play'])

const router = useRouter()
const player = usePlayerStore()

const coverUrl = computed(() =>
  props.album.coverArt ? window.api.getMediaUrl(props.album.coverArt) : '',
)

const showCtx = ref(false)
const ctxPos = ref({ top: 0, left: 0 })
const ctxStyle = computed(() => ({
  top: ctxPos.value.top + 'px',
  left: ctxPos.value.left + 'px',
}))

function openCtx(e: MouseEvent) {
  ctxPos.value = {
    top: Math.min(e.clientY, window.innerHeight - 220),
    left: Math.min(e.clientX, window.innerWidth - 200),
  }
  showCtx.value = true
}

function playAlbum() {
  showCtx.value = false
  player.playAll(props.album.tracks)
}

function addToQueue() {
  showCtx.value = false
  player.addToQueue(props.album.tracks)
}

function goToArtist() {
  showCtx.value = false
  router.push(`/artist/${encodeURIComponent(props.album.artist)}`)
}

function openInExplorer() {
  showCtx.value = false
  if (props.album.tracks.length > 0) {
    window.api.showInExplorer(props.album.tracks[0].path)
  }
}
</script>
