<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-[80] bg-black/50" @click="$emit('close')" />
    </Transition>

    <!-- Panel -->
    <Transition name="slide">
      <div
        v-if="show"
        class="fixed top-0 right-0 bottom-0 z-[85] w-[380px] max-w-[85vw] flex flex-col bg-[#0e0e1c]/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-2xl"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
          <div>
            <h2 class="text-base font-bold text-white">Queue</h2>
            <p class="text-[11px] text-white/30 mt-0.5">{{ player.queue.length }} tracks</p>
          </div>
          <div class="flex items-center gap-1.5">
            <button
              v-if="player.queue.length > 0"
              @click="player.clearQueue()"
              class="px-3 py-1.5 text-[11px] text-white/30 hover:text-red-400 hover:bg-white/[0.06] rounded-lg transition-colors font-medium"
            >
              Clear
            </button>
            <button
              @click="$emit('close')"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Queue list -->
        <div v-if="player.queue.length > 0" class="flex-1 overflow-y-auto px-3 pb-3">
          <!-- Now Playing -->
          <div v-if="currentTrack" class="mb-3">
            <p class="px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/25">
              Now Playing
            </p>
            <div
              class="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.06] border border-white/[0.06]"
            >
              <div class="w-11 h-11 rounded-lg overflow-hidden bg-white/10 shrink-0 ring-1 ring-white/[0.06]">
                <img v-if="currentTrack.coverArt" :src="getCoverUrl(currentTrack.coverArt)" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-accent truncate">{{ currentTrack.title }}</p>
                <p class="text-[11px] text-white/35 truncate mt-0.5">
                  <ArtistLinks
                    :artist="currentTrack.artist"
                    :album-artist="currentTrack.albumArtist"
                    hover-class="hover:text-white/60"
                  />
                </p>
              </div>
              <div class="flex items-center justify-center gap-[2px] shrink-0 w-5">
                <span class="w-[2px] h-2.5 bg-accent rounded-full animate-bounce" style="animation-delay: 0s" />
                <span class="w-[2px] h-3.5 bg-accent rounded-full animate-bounce" style="animation-delay: 0.15s" />
                <span class="w-[2px] h-2 bg-accent rounded-full animate-bounce" style="animation-delay: 0.3s" />
              </div>
            </div>
          </div>

          <!-- Up Next -->
          <div v-if="upNext.length > 0">
            <p class="px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/25">
              Up Next &middot; {{ upNext.length }}
            </p>

            <div ref="upNextListRef" class="space-y-0.5">
              <div
                v-for="item in upNext"
                :key="item.track.id + '-' + item.queueIndex"
                :data-queue-index="item.queueIndex"
                class="queue-item group flex items-center gap-2 pl-1.5 pr-3 py-2 rounded-lg transition-colors"
                :class="[
                  dragOverIndex === item.queueIndex ? 'ring-1 ring-accent/40 bg-accent/[0.05]' : '',
                  draggedIndex === item.queueIndex ? 'opacity-30 bg-white/[0.02]' : 'hover:bg-white/[0.05]',
                ]"
                @click="player.playFromQueue(item.queueIndex)"
                draggable="true"
                @dragstart="onDragStart($event, item.queueIndex)"
                @dragover.prevent="onDragOver($event, item.queueIndex)"
                @dragleave="onDragLeave"
                @drop.prevent="onDrop($event, item.queueIndex)"
                @dragend="onDragEnd"
              >
                <!-- Drag handle -->
                <div
                  class="w-5 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-white/0 group-hover:text-white/15 hover:!text-white/30 transition-colors shrink-0"
                  @mousedown.stop
                >
                  <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                  </svg>
                </div>

                <div class="w-9 h-9 rounded-md overflow-hidden bg-white/[0.06] shrink-0 ring-1 ring-white/[0.04]">
                  <img v-if="item.track.coverArt" :src="getCoverUrl(item.track.coverArt)" class="w-full h-full object-cover" loading="lazy" />
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <svg class="w-3.5 h-3.5 text-white/15" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[13px] text-white/80 truncate">{{ item.track.title }}</p>
                  <p class="text-[11px] text-white/30 truncate">
                    <ArtistLinks
                      :artist="item.track.artist"
                      :album-artist="item.track.albumArtist"
                      hover-class="hover:text-white/50"
                    />
                  </p>
                </div>
                <span class="text-[10px] text-white/20 tabular-nums shrink-0 font-mono">{{ formatTime(item.track.duration) }}</span>
                <button
                  @click.stop="player.removeFromQueue(item.queueIndex)"
                  class="w-6 h-6 flex items-center justify-center rounded-full text-white/0 group-hover:text-white/20 hover:!text-red-400 transition-colors shrink-0"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Previous tracks (collapsed) -->
          <div v-if="previousTracks.length > 0" class="mt-3">
            <button
              @click="showPrevious = !showPrevious"
              class="w-full px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/20 hover:text-white/35 transition-colors flex items-center gap-1"
            >
              Previously Played &middot; {{ previousTracks.length }}
              <svg class="w-3 h-3 transition-transform" :class="showPrevious ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="showPrevious" class="space-y-0.5 mt-1">
              <div
                v-for="item in previousTracks"
                :key="item.track.id + '-prev-' + item.queueIndex"
                class="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors opacity-40 hover:opacity-60"
                @click="player.playFromQueue(item.queueIndex)"
              >
                <div class="w-9 h-9 rounded-md overflow-hidden bg-white/[0.06] shrink-0">
                  <img v-if="item.track.coverArt" :src="getCoverUrl(item.track.coverArt)" class="w-full h-full object-cover" loading="lazy" />
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <svg class="w-3.5 h-3.5 text-white/15" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[13px] text-white/70 truncate">{{ item.track.title }}</p>
                  <p class="text-[11px] text-white/30 truncate">
                    <ArtistLinks
                      :artist="item.track.artist"
                      :album-artist="item.track.albumArtist"
                      hover-class="hover:text-white/50"
                    />
                  </p>
                </div>
                <span class="text-[10px] text-white/20 tabular-nums shrink-0 font-mono">{{ formatTime(item.track.duration) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="flex-1 flex flex-col items-center justify-center text-white/20 px-6">
          <svg class="w-14 h-14 mb-4 opacity-20" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
          </svg>
          <p class="text-sm font-medium text-white/25">Queue is empty</p>
          <p class="text-[11px] mt-1 text-white/15">Play something to get started</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { formatTime } from '@/utils/formatTime'
import ArtistLinks from '@/components/ArtistLinks.vue'

defineProps<{ show: boolean }>()
defineEmits(['close'])

const router = useRouter()
const player = usePlayerStore()
const showPrevious = ref(false)

// ── Drag & drop state ──────────────────────────────────────
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const upNextListRef = ref<HTMLElement>()

function onDragStart(e: DragEvent, queueIndex: number) {
  draggedIndex.value = queueIndex
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(queueIndex))
  }
}

function onDragOver(_e: DragEvent, queueIndex: number) {
  if (draggedIndex.value === null) return
  if (draggedIndex.value === queueIndex) {
    dragOverIndex.value = null
    return
  }
  dragOverIndex.value = queueIndex
}

function onDragLeave() {
  dragOverIndex.value = null
}

function onDrop(_e: DragEvent, toQueueIndex: number) {
  const fromQueueIndex = draggedIndex.value
  dragOverIndex.value = null
  draggedIndex.value = null
  if (fromQueueIndex === null || fromQueueIndex === toQueueIndex) return
  player.moveInQueue(fromQueueIndex, toQueueIndex)
}

function onDragEnd() {
  draggedIndex.value = null
  dragOverIndex.value = null
}

// ── Computed sections ──────────────────────────────────────
const currentTrack = computed(() => {
  if (player.currentIndex < 0 || player.currentIndex >= player.queue.length) return null
  return player.queue[player.currentIndex]
})

const upNext = computed(() => {
  const items: { track: Track; queueIndex: number }[] = []
  for (let i = player.currentIndex + 1; i < player.queue.length; i++) {
    items.push({ track: player.queue[i], queueIndex: i })
  }
  return items
})

const previousTracks = computed(() => {
  const items: { track: Track; queueIndex: number }[] = []
  for (let i = 0; i < player.currentIndex; i++) {
    items.push({ track: player.queue[i], queueIndex: i })
  }
  return items
})

function getCoverUrl(path: string) {
  return window.api.getMediaUrl(path)
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-enter-active { transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-leave-active { transition: transform 0.2s ease-in; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }

.queue-item {
  user-select: none;
}
</style>
