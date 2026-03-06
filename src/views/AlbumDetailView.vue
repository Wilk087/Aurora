<template>
  <div v-if="album" class="album-detail p-6">
    <!-- Album header -->
    <div class="flex items-end gap-6 mb-8">
      <div class="w-56 h-56 rounded-2xl overflow-hidden bg-white/[0.06] shrink-0 cover-shadow relative">
        <video
          v-show="animatedCoverActive"
          ref="animatedVideoEl"
          class="w-full h-full object-cover absolute inset-0 z-10"
          autoplay loop muted playsinline
        />
        <img v-if="album.coverArt" :src="coverUrl" class="w-full h-full object-cover" />
        <div v-else class="w-full h-full flex items-center justify-center">
          <svg class="w-20 h-20 text-white/10" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
            />
          </svg>
        </div>
      </div>

      <div class="min-w-0 pb-2">
        <p class="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Album</p>
        <h1 class="text-4xl font-bold text-white mb-2 line-clamp-2">{{ album.name }}</h1>
        <p class="text-lg text-white/60 mb-4 cursor-pointer hover:text-accent transition-colors" @click="goToArtist">{{ album.artist }}</p>
        <div class="flex items-center gap-3 text-sm text-white/40">
          <span v-if="album.year" class="cursor-pointer hover:text-accent transition-colors" @click="goToYear">{{ album.year }}</span>
          <span v-if="album.year">&bull;</span>
          <span>{{ album.tracks.length }} songs</span>
          <span>&bull;</span>
          <span>{{ totalDuration }}</span>
        </div>

        <div class="flex items-center gap-3 mt-5">
          <button
            @click="player.playAll(album.tracks)"
            class="px-6 py-2.5 bg-accent hover:bg-accent-hover rounded-full text-sm font-medium text-white transition-all accent-glow hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play
          </button>
          <button
            @click="player.addToQueue(album.tracks)"
            class="px-6 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] rounded-full text-sm font-medium text-white/80 transition-all"
          >
            Add to Queue
          </button>
          <button
            @click="openAlbumInExplorer"
            class="w-10 h-10 bg-white/[0.08] hover:bg-white/[0.12] rounded-full flex items-center justify-center text-white/50 hover:text-white/80 transition-all"
            title="Show in File Explorer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Track list -->
    <div class="space-y-0.5">
      <SongRow
        v-for="(track, i) in album.tracks"
        :key="track.id"
        :track="track"
        :index="i"
        :selected="selection.isSelected(track.id)"
        :selectable="selection.hasSelection.value"
        @play="selection.hasSelection.value ? selection.handleSelect(i, $event ?? { ctrlKey: true, metaKey: false, shiftKey: false }) : player.playAll(album.tracks, i)"
        @select="selection.handleSelect(i, $event)"
      />
    </div>

    <!-- Selection action bar -->
    <SelectionBar
      :count="selection.selectedCount.value"
      :track-ids="selection.selectedItems.value.map(t => t.id)"
      @play-next="onPlayNextSelected"
      @add-to-queue="onAddToQueueSelected"
      @select-all="selection.selectAll()"
      @clear="selection.clearSelection()"
    />
  </div>

  <div v-else class="flex items-center justify-center h-full">
    <p class="text-white/30">Album not found</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { useSelection } from '@/composables/useSelection'
import SongRow from '@/components/SongRow.vue'
import SelectionBar from '@/components/SelectionBar.vue'
import Hls from 'hls.js'

const route = useRoute()
const router = useRouter()
const library = useLibraryStore()
const player = usePlayerStore()

const album = computed(() => library.getAlbumById(route.params.id as string))
const selection = useSelection(() => album.value?.tracks ?? [])

const coverUrl = computed(() =>
  album.value?.coverArt ? window.api.getMediaUrl(album.value.coverArt) : '',
)

// ── Animated cover (HLS stream) ─────────────────────────────────────────
const animatedVideoEl = ref<HTMLVideoElement | null>(null)
const animatedCoverActive = ref(false)
let hlsInstance: Hls | null = null

function destroyHls() {
  if (hlsInstance) {
    hlsInstance.destroy()
    hlsInstance = null
  }
  animatedCoverActive.value = false
}

function attachHls(url: string) {
  destroyHls()
  const videoEl = animatedVideoEl.value
  if (!videoEl) return

  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: false,
      maxBufferLength: 10,
      maxMaxBufferLength: 30,
    })
    hls.loadSource(url)
    hls.attachMedia(videoEl)
    hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
      const avcLevels = data.levels
        .map((l: any, i: number) => ({ idx: i, codec: l.codecSet || '' }))
        .filter((l: any) => !l.codec.includes('hvc') && !l.codec.includes('hev'))
      if (avcLevels.length > 0) {
        hls.currentLevel = avcLevels[avcLevels.length - 1].idx
      }
      videoEl.play().catch(() => {})
      animatedCoverActive.value = true
    })
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (data.fatal) destroyHls()
    })
    hlsInstance = hls
  } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
    videoEl.src = url
    videoEl.addEventListener('loadedmetadata', () => {
      videoEl.play().catch(() => {})
      animatedCoverActive.value = true
    }, { once: true })
  }
}

watch(
  () => album.value,
  async (a) => {
    destroyHls()
    if (!a || !player.animatedCoversEnabled) return
    try {
      const hlsUrl = await window.api.getAnimatedCover(a.name || '', a.artist || '')
      if (hlsUrl && album.value?.id === a.id) {
        await nextTick()
        attachHls(hlsUrl)
      }
    } catch {}
  },
  { immediate: true },
)

watch(
  () => player.animatedCoversEnabled,
  (enabled) => {
    if (!enabled) {
      destroyHls()
    } else if (album.value) {
      const a = album.value
      window.api.getAnimatedCover(a.name || '', a.artist || '').then((hlsUrl) => {
        if (hlsUrl && album.value?.id === a.id) {
          nextTick().then(() => attachHls(hlsUrl))
        }
      }).catch(() => {})
    }
  },
)

const totalDuration = computed(() => {
  if (!album.value) return ''
  const total = album.value.tracks.reduce((s, t) => s + t.duration, 0)
  const mins = Math.floor(total / 60)
  if (mins >= 60) {
    return `${Math.floor(mins / 60)} hr ${mins % 60} min`
  }
  return `${mins} min`
})

function goToArtist() {
  if (album.value) {
    router.push(`/artist/${encodeURIComponent(album.value.artist)}`)
  }
}

function goToYear() {
  if (album.value?.year) {
    router.push(`/year/${album.value.year}`)
  }
}

function openAlbumInExplorer() {
  if (album.value && album.value.tracks.length > 0) {
    window.api.showInExplorer(album.value.tracks[0].path)
  }
}

function onPlayNextSelected() {
  player.playNext(selection.selectedItems.value)
  selection.clearSelection()
}

function onAddToQueueSelected() {
  player.addToQueue(selection.selectedItems.value)
  selection.clearSelection()
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && selection.hasSelection.value) {
    selection.clearSelection()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'a' && album.value) {
    e.preventDefault()
    selection.selectAll()
  }
}

onMounted(() => document.addEventListener('keydown', onKeyDown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  destroyHls()
})
</script>
