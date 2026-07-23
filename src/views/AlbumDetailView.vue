<template>
  <div v-if="album" class="album-detail p-6">
    <!-- Album header -->
    <div class="flex items-end gap-6 mb-8">
      <div class="w-56 h-56 shrink-0 relative group">
        <Teleport to="body" :disabled="!coverZoomed">
          <div
            :class="coverZoomed
              ? 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out'
              : 'contents'"
            @click.self="coverZoomed = false"
          >
            <div
              :class="coverZoomed
                ? 'w-[min(70vw,70vh)] h-[min(70vw,70vh)] rounded-2xl overflow-hidden shadow-2xl relative'
                : 'w-full h-full rounded-2xl overflow-hidden bg-white/[0.06] cover-shadow relative'"
            >
              <video
                v-show="animatedCoverActive"
                ref="animatedVideoEl"
                class="w-full h-full object-cover absolute inset-0 z-10"
                autoplay loop muted playsinline
              />
              <img v-if="album.coverArt" ref="coverImgEl" :src="coverUrl" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-20 h-20 text-white/10" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
                  />
                </svg>
              </div>

              <!-- Copy / export actions -->
              <div v-if="coverZoomed" class="absolute top-3 right-3 z-20 flex items-center gap-2">
                <button
                  v-if="animatedCoverActive"
                  @click.stop="exportAnimatedGif"
                  :disabled="exportingGif"
                  class="flex items-center gap-1.5 px-3 h-9 rounded-full bg-black/60 hover:bg-black/75 backdrop-blur text-xs font-medium text-white transition-colors disabled:opacity-50"
                  title="Export animated cover as GIF"
                >
                  <svg v-if="!exportingGif" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div v-else class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {{ exportingGif ? 'Exporting…' : 'Export GIF' }}
                </button>
                <button
                  @click.stop="copyCoverImage"
                  class="w-9 h-9 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/75 backdrop-blur text-white transition-colors"
                  title="Copy cover image"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </Teleport>

        <!-- Zoom affordance -->
        <button
          v-if="!coverZoomed"
          @click="coverZoomed = true"
          class="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 group-hover:bg-black/25 transition-colors z-20"
          title="Enlarge cover"
        >
          <svg class="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15" />
          </svg>
        </button>
      </div>

      <div class="min-w-0 pb-2">
        <p class="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Album</p>
        <h1 class="text-4xl font-bold text-white mb-2 line-clamp-2">{{ album.name }}</h1>
        <p class="text-lg text-white/60 mb-4 cursor-pointer hover:text-accent transition-colors" @click="goToArtist">{{ album.artist }}</p>
        <div class="flex items-center gap-3 text-sm text-white/40">
          <span v-if="album.year" class="cursor-pointer hover:text-accent transition-colors" @click="goToYear">{{ album.year }}</span>
          <span v-if="album.year">&bull;</span>
          <span v-if="missingTracks.length">{{ album.tracks.length }}/{{ album.tracks.length + missingTracks.length }} songs</span>
          <span v-else>{{ album.tracks.length }} songs</span>
          <span>&bull;</span>
          <span>{{ totalDuration }}</span>
          <template v-if="missingTracks.length">
            <span>&bull;</span>
            <span>{{ missingTracks.length }} missing</span>
          </template>
        </div>

        <div class="flex items-center gap-3 mt-5 flex-wrap">
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
          <button
            v-if="isLocalAlbum"
            @click="showMetadataEditor = true"
            class="w-10 h-10 bg-white/[0.08] hover:bg-white/[0.12] rounded-full flex items-center justify-center text-white/50 hover:text-white/80 transition-all"
            title="Edit album metadata"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
          </button>
          <!-- Plugin slot — data-album-id is kept in sync with the viewed album -->
          <div id="aurora-album-detail-slot" :data-album-id="album.id" />
        </div>
      </div>
    </div>

    <!-- Track list (missing tracks interleaved when enabled — cosmetic only) -->
    <div class="space-y-0.5">
      <template
        v-for="row in displayRows"
        :key="row.kind === 'disc' ? `disc-${row.disc}` : row.kind === 'local' ? row.track.id : `missing-${row.key}`"
      >
        <!-- Disc separator (multi-disc albums only) -->
        <div v-if="row.kind === 'disc'" class="flex items-center gap-2 px-4 pt-4 pb-1.5 select-none">
          <svg class="w-3.5 h-3.5 text-white/25" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
          </svg>
          <span class="text-xs font-semibold uppercase tracking-wider text-white/25">Disc {{ row.disc }}</span>
          <div class="flex-1 border-t border-white/[0.06]" />
        </div>
        <SongRow
          v-else-if="row.kind === 'local'"
          :track="row.track"
          :index="row.index"
          :display-number="row.num"
          :selected="selection.isSelected(row.track.id)"
          :selectable="selection.hasSelection.value"
          @play="selection.hasSelection.value ? selection.handleSelect(row.index, $event ?? { ctrlKey: true, metaKey: false, shiftKey: false }) : player.playAll(album.tracks, row.index)"
          @select="selection.handleSelect(row.index, $event)"
        />
        <div
          v-else
          class="group flex items-center gap-3 px-4 rounded-lg relative select-none"
          style="height: 56px;"
          title="Not in your library"
        >
          <div class="w-8 text-center shrink-0">
            <span class="text-xs text-white/15">{{ row.num || '·' }}</span>
          </div>
          <div class="w-10 h-10 rounded-md bg-white/[0.03] border border-dashed border-white/10 shrink-0 flex items-center justify-center">
            <svg class="w-4 h-4 text-white/10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0 flex items-center gap-2">
            <p class="text-sm font-medium truncate text-white/25">{{ row.entry.title }}</p>
            <span class="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded bg-white/[0.06] text-white/25 shrink-0">missing</span>
          </div>
          <div class="w-48 hidden lg:block" />
          <div class="w-14 text-right shrink-0">
            <span class="text-xs text-white/15 tabular-nums">{{ row.entry.duration ? formatTime(row.entry.duration) : '' }}</span>
          </div>
          <div class="w-7 shrink-0" />
          <div class="w-7 shrink-0">
            <button
              @click.stop="hideMissing(row.key)"
              class="w-7 h-7 rounded-full text-white/20 hover:text-white/60 hover:bg-white/[0.06] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
              title="Hide this missing track (wrong match or unwanted)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Album metadata editor -->
    <MetadataEditorDialog
      :show="showMetadataEditor"
      :tracks="album.tracks"
      mode="album"
      @close="showMetadataEditor = false"
      @saved="onMetadataSaved"
    />

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
import { formatTime } from '@/utils/formatTime'
import { matchTracklist, type MissingEntry } from '@/utils/missingTracks'
import SongRow from '@/components/SongRow.vue'
import SelectionBar from '@/components/SelectionBar.vue'
import MetadataEditorDialog from '@/components/MetadataEditorDialog.vue'
import Hls from 'hls.js'
import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const library = useLibraryStore()
const player = usePlayerStore()
const toast = useToast()

const album = computed(() => library.getAlbumById(route.params.id as string))
const selection = useSelection(() => album.value?.tracks ?? [])

const coverUrl = computed(() =>
  album.value?.coverArt ? window.api.getMediaUrl(album.value.coverArt) : '',
)

// ── Album metadata editing (local files only) ────────────────────────────
const showMetadataEditor = ref(false)
const isLocalAlbum = computed(() =>
  (album.value?.tracks ?? []).every(t => (!t.source || t.source === 'local') && !t.path.includes('://')),
)

/** Renaming the album (or its artist) changes the derived album id — follow it */
function onMetadataSaved(updated: Track[]) {
  showMetadataEditor.value = false
  const first = updated[0]
  if (!first) return
  const newAlbum = library.albums.find(a => a.tracks.some(t => t.id === first.id))
  if (newAlbum && newAlbum.id !== route.params.id) {
    router.replace(`/album/${newAlbum.id}`)
  }
}

// ── Missing tracks (optional, cosmetic) ─────────────────────────────────
// Compares the album against its official tracklist (iTunes lookup, cached
// in the main process) and greys out tracks not present in the library.
const canonicalTracks = ref<CanonicalTrack[] | null>(null)

watch(
  [() => album.value?.id, () => player.showMissingTracks],
  async () => {
    canonicalTracks.value = null
    const a = album.value
    if (!a || !player.showMissingTracks) return
    try {
      const list = await window.api.getAlbumTracklist(a.name || '', a.artist || '')
      if (album.value?.id === a.id) canonicalTracks.value = list
    } catch {}
  },
  { immediate: true },
)

const tracklistAnalysis = computed(() => {
  const a = album.value
  if (!a || !canonicalTracks.value) return null
  return matchTracklist(a.tracks, canonicalTracks.value, new Set(player.hiddenMissingTracks[a.id] ?? []))
})

const missingTracks = computed(() => tracklistAnalysis.value?.missing ?? [])

type DisplayRow =
  | { kind: 'disc'; disc: number }
  | { kind: 'local'; track: Track; index: number; num?: number }
  | { kind: 'missing'; entry: CanonicalTrack; key: string; num: number }

/** Track rows with missing ones inserted at their canonical position, plus
 *  cosmetic "Disc N" separators for multi-disc albums. Matched tracks are
 *  numbered by the canonical tracklist; otherwise by their file tags. */
const displayRows = computed<DisplayRow[]>(() => {
  const a = album.value
  if (!a) return []
  const analysis = tracklistAnalysis.value
  const localCanon = analysis?.localCanon
  const byAnchor = new Map<number, MissingEntry[]>()
  for (const m of analysis?.missing ?? []) {
    byAnchor.set(m.anchor, [...(byAnchor.get(m.anchor) ?? []), m])
  }

  const discOfLocal = (t: Track) => localCanon?.get(t.id)?.disc || t.disc || 1
  const multiDisc = new Set([
    ...a.tracks.map(discOfLocal),
    ...(analysis?.missing ?? []).map(m => m.entry.disc || 1),
  ]).size > 1

  const rows: DisplayRow[] = []
  const seenDiscs = new Set<number>()
  const pushWithDisc = (disc: number, row: DisplayRow) => {
    if (multiDisc && !seenDiscs.has(disc)) {
      seenDiscs.add(disc)
      rows.push({ kind: 'disc', disc })
    }
    rows.push(row)
  }
  const pushMissing = (m: MissingEntry) =>
    pushWithDisc(m.entry.disc || 1, { kind: 'missing', entry: m.entry, key: m.key, num: m.entry.track })

  for (const m of byAnchor.get(-1) ?? []) pushMissing(m)
  a.tracks.forEach((t, i) => {
    const canonEntry = localCanon?.get(t.id)
    pushWithDisc(discOfLocal(t), {
      kind: 'local',
      track: t,
      index: i,
      // canonical number > file tag number > list index (SongRow fallback)
      num: canonEntry?.track || (analysis || multiDisc ? t.track || undefined : undefined),
    })
    for (const m of byAnchor.get(i) ?? []) pushMissing(m)
  })
  return rows
})

function hideMissing(key: string) {
  if (album.value) player.hideMissingTrack(album.value.id, key)
}

// ── Cover zoom ────────────────────────────────────────────────────────────
const coverZoomed = ref(false)
const coverImgEl = ref<HTMLImageElement | null>(null)
const exportingGif = ref(false)

/** Copy the currently visible cover (static image or current animated frame) to the clipboard as PNG. */
async function copyCoverImage() {
  try {
    const source: HTMLImageElement | HTMLVideoElement | null =
      animatedCoverActive.value && animatedVideoEl.value ? animatedVideoEl.value : coverImgEl.value
    if (!source) return

    const width = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth
    const height = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight
    if (!width || !height) throw new Error('Cover has no natural dimensions yet')

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    ctx.drawImage(source, 0, 0, width, height)

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Failed to encode PNG')

    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    toast.success('Cover copied to clipboard')
  } catch (err) {
    console.error('Failed to copy cover image:', err)
    toast.error('Failed to copy cover')
  }
}

/** Capture the animated cover for one full loop and export it as a GIF file. */
async function exportAnimatedGif() {
  const video = animatedVideoEl.value
  if (!video || !animatedCoverActive.value || exportingGif.value) return

  exportingGif.value = true
  try {
    const size = 480
    const fps = 12
    const loopDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 4
    const frameCount = Math.min(Math.round(loopDuration * fps), 72)
    const frameDelayMs = Math.round(1000 / fps)

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas not supported')

    // Sample frames in real time as the video plays (avoids slow/unreliable
    // HLS seeking) — takes roughly one loop's worth of wall-clock time.
    const frames: Uint8ClampedArray[] = []
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        ctx.drawImage(video, 0, 0, size, size)
        frames.push(ctx.getImageData(0, 0, size, size).data)
        if (frames.length >= frameCount) {
          clearInterval(interval)
          resolve()
        }
      }, frameDelayMs)
    })

    const gif = GIFEncoder()
    const firstFrame = new Uint8Array(frames[0].buffer)
    const palette = quantize(firstFrame, 256, { format: 'rgb444' })
    frames.forEach((frameData, i) => {
      const index = applyPalette(new Uint8Array(frameData.buffer), palette, 'rgb444')
      gif.writeFrame(index, size, size, {
        palette: i === 0 ? palette : undefined,
        delay: frameDelayMs,
        repeat: 0,
      })
    })
    gif.finish()

    const blob = new Blob([gif.bytes() as BlobPart], { type: 'image/gif' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeName = `${album.value?.artist || 'Unknown'} - ${album.value?.name || 'Cover'}`.replace(/[^a-zA-Z0-9-_ ]/g, '').trim()
    a.download = `${safeName}.gif`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Animated cover saved as GIF')
  } catch (err) {
    console.error('Failed to export GIF:', err)
    toast.error('Failed to export GIF')
  } finally {
    exportingGif.value = false
  }
}

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
    coverZoomed.value = false
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
  if (e.key === 'Escape' && coverZoomed.value) {
    coverZoomed.value = false
    return
  }
  if (e.key === 'Escape' && selection.hasSelection.value) {
    selection.clearSelection()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'a' && album.value) {
    e.preventDefault()
    selection.selectAll()
  }
}

// Pause animated cover when the app is backgrounded.
// document.visibilitychange catches minimisation, but on Linux it does NOT
// fire when another window goes fullscreen over Aurora.  Window blur/focus
// events reliably detect that scenario on all platforms, but can be too
// aggressive on multi-monitor setups — so they are opt-in via a setting.
function pauseAnimatedCover() {
  const videoEl = animatedVideoEl.value
  if (videoEl && animatedCoverActive.value) videoEl.pause()
}
function resumeAnimatedCover() {
  const videoEl = animatedVideoEl.value
  if (videoEl && animatedCoverActive.value && !document.hidden) {
    videoEl.play().catch(() => {})
  }
}
function onVisibilityChange() {
  if (document.hidden) pauseAnimatedCover()
  else resumeAnimatedCover()
}

watch(() => player.pauseAnimatedOnBlur, (enabled) => {
  if (enabled) {
    window.addEventListener('blur', pauseAnimatedCover)
    window.addEventListener('focus', resumeAnimatedCover)
  } else {
    window.removeEventListener('blur', pauseAnimatedCover)
    window.removeEventListener('focus', resumeAnimatedCover)
  }
})

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('visibilitychange', onVisibilityChange)
  if (player.pauseAnimatedOnBlur) {
    window.addEventListener('blur', pauseAnimatedCover)
    window.addEventListener('focus', resumeAnimatedCover)
  }
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('blur', pauseAnimatedCover)
  window.removeEventListener('focus', resumeAnimatedCover)
  destroyHls()
})
</script>
