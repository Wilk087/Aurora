<template>
  <div
    @click.exact="$emit('play')"
    @click.ctrl.shift="$emit('select', $event)"
    @click.meta.shift="$emit('select', $event)"
    @click.ctrl.exact="$emit('select', $event)"
    @click.meta.exact="$emit('select', $event)"
    @click.shift.exact="$emit('select', $event)"
    @contextmenu.prevent="openContextMenu"
    class="song-row group flex items-center gap-3 px-4 rounded-lg cursor-pointer transition-colors relative"
    style="height: 56px;"
    :class="[
      isActive ? 'bg-white/[0.1]' : selected ? 'bg-accent/[0.12]' : 'hover:bg-white/[0.05]',
      selected ? 'ring-1 ring-accent/30' : ''
    ]"
  >
    <!-- # / playing indicator / checkbox -->
    <div class="w-8 text-center shrink-0">
      <div v-if="isActive && isPlaying && !selected" class="flex items-center justify-center gap-[2px]">
        <span class="w-[3px] h-3 bg-accent rounded-full animate-bounce" style="animation-delay: 0s" />
        <span class="w-[3px] h-4 bg-accent rounded-full animate-bounce" style="animation-delay: 0.15s" />
        <span class="w-[3px] h-2 bg-accent rounded-full animate-bounce" style="animation-delay: 0.3s" />
      </div>
      <!-- Checkbox on select mode or hover -->
      <div
        v-else-if="selected || selectable"
        class="flex items-center justify-center"
        @click.stop="$emit('select', $event)"
      >
        <div
          class="w-4 h-4 rounded border flex items-center justify-center transition-all"
          :class="selected ? 'bg-accent border-accent' : 'border-white/20 group-hover:border-white/40'"
        >
          <svg v-if="selected" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        </div>
      </div>
      <template v-else>
        <span class="text-xs text-white/30 group-hover:hidden">{{ index + 1 }}</span>
        <svg class="w-4 h-4 text-white/70 hidden group-hover:block mx-auto" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </template>
    </div>

    <!-- Cover -->
    <div class="w-10 h-10 rounded-md overflow-hidden bg-white/10 shrink-0">
      <img v-if="track.coverArt" :src="coverUrl" class="w-full h-full object-cover" loading="lazy" />
      <div v-else class="w-full h-full flex items-center justify-center">
        <svg class="w-4 h-4 text-white/20" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      </div>
    </div>

    <!-- Title / artist -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium truncate" :class="isActive ? 'text-accent' : 'text-white'">
        {{ track.title }}
      </p>
      <p class="text-xs text-white/40 truncate">{{ track.artist }}</p>
    </div>

    <!-- Album -->
    <div class="w-48 min-w-0 hidden lg:block">
      <p class="text-xs text-white/40 truncate">{{ track.album }}</p>
    </div>

    <!-- Duration -->
    <div class="w-14 text-right shrink-0">
      <span class="text-xs text-white/30 tabular-nums">{{ formatTime(track.duration) }}</span>
    </div>

    <!-- Favorite heart button -->
    <div class="w-7 shrink-0">
      <button
        @click.stop="toggleFavoriteInline"
        class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
        :class="favoritesStore.isFavorite(track.id)
          ? 'text-red-400 hover:text-red-300'
          : 'text-white/20 hover:text-red-400 hover:bg-white/[0.06] opacity-0 group-hover:opacity-100'"
        :title="favoritesStore.isFavorite(track.id) ? 'Remove from Favorites' : 'Add to Favorites'"
      >
        <svg v-if="favoritesStore.isFavorite(track.id)" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      </button>
    </div>

    <!-- Add to playlist button -->
    <div class="w-7 shrink-0">
      <button
        ref="plusBtnRef"
        @click.stop="openMenu"
        class="w-7 h-7 rounded-full text-white/20 hover:text-accent hover:bg-white/[0.06] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        title="Add to playlist"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </div>

    <!-- Playlist dropdown (teleported) -->
    <Teleport to="body">
      <div v-if="showMenu" class="fixed inset-0 z-[90]" @click="showMenu = false" />
      <div
        v-if="showMenu"
        class="fixed z-[100] w-56 max-h-64 overflow-y-auto rounded-xl bg-[#1a1a2e]/95 backdrop-blur-lg border border-white/10 py-1.5 shadow-2xl"
        :style="menuStyle"
      >
        <p class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">Add to playlist</p>
        <div v-if="showNewInput" class="px-3 py-1.5 flex items-center gap-2">
          <input
            ref="newInputRef"
            v-model="newName"
            @keydown.enter="createAndAdd"
            @keydown.escape.stop="showNewInput = false"
            @click.stop
            placeholder="Name…"
            class="flex-1 px-2 py-1 rounded bg-white/[0.08] border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
          />
          <button @click.stop="createAndAdd" class="text-accent text-xs font-medium hover:underline shrink-0">Add</button>
        </div>
        <button
          v-else
          @click.stop="beginCreate"
          class="w-full px-3 py-2 text-left text-sm text-accent hover:bg-white/[0.06] transition-colors flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Playlist
        </button>
        <div v-if="playlistStore.playlists.length > 0" class="border-t border-white/[0.06] my-1" />
        <button
          v-for="pl in playlistStore.sortedPlaylists"
          :key="pl.id"
          @click.stop="addTo(pl.id)"
          class="w-full px-3 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors truncate flex items-center justify-between"
        >
          <span class="truncate">{{ pl.name }}</span>
          <svg v-if="pl.trackIds.includes(track.id)" class="w-3.5 h-3.5 text-accent shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        </button>
      </div>
    </Teleport>

    <!-- Context menu (teleported) -->
    <Teleport to="body">
      <div v-if="showCtx" class="fixed inset-0 z-[90]" @click="showCtx = false" @contextmenu.prevent="showCtx = false" />
      <div
        v-if="showCtx"
        class="fixed z-[100] w-52 rounded-xl bg-[#1a1a2e]/95 backdrop-blur-lg border border-white/10 py-1.5 shadow-2xl overflow-y-auto"
        :style="{ ...ctxStyle, maxHeight: 'calc(100vh - 20px)' }"
        @click.stop
      >
        <button
          @click.stop="doPlayNext"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
          </svg>
          Play Next
        </button>
        <button
          @click.stop="doPlayLater"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
          Play Later
        </button>
        <button
          @click.stop="toggleFavorite"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg v-if="favoritesStore.isFavorite(track.id)" class="w-4 h-4 shrink-0 text-red-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <svg v-else class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          {{ favoritesStore.isFavorite(track.id) ? 'Remove from Favorites' : 'Add to Favorites' }}
        </button>
        <div class="border-t border-white/[0.06] my-1" />
        <button
          @click.stop="goToArtist"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          Go to Artist
        </button>
        <button
          @click.stop="goToAlbum"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
          </svg>
          Go to Album
        </button>
        <button
          @click.stop="showCredits"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          Credits &amp; Info
        </button>
        <button
          @click.stop="showInExplorer"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          Show in File Explorer
        </button>
        <div class="border-t border-white/[0.06] my-1" />
        <button
          @click.stop="ctxToPlaylist"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add to Playlist…
        </button>
      </div>
    </Teleport>

    <!-- Credits panel (teleported) -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCreditsPanel" class="fixed inset-0 z-[80] bg-black/50" @click="showCreditsPanel = false" />
      </Transition>
      <Transition name="credits-slide">
        <div
          v-if="showCreditsPanel"
          class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-[480px] max-w-[90vw] max-h-[80vh] overflow-y-auto rounded-2xl bg-[#12121f]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl"
        >
          <div class="p-6">
            <!-- Header -->
            <div class="flex items-start gap-4 mb-6">
              <div class="w-16 h-16 rounded-lg overflow-hidden bg-white/10 shrink-0">
                <img v-if="track.coverArt" :src="coverUrl" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-bold text-white truncate">{{ track.title }}</h3>
                <p class="text-sm text-white/50">{{ track.artist }}</p>
                <p class="text-xs text-white/30 mt-0.5">{{ track.album }}</p>
              </div>
              <button @click="showCreditsPanel = false" class="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div v-if="creditsLoading" class="flex items-center gap-2 text-sm text-white/30 py-8 justify-center">
              <div class="w-3 h-3 border border-accent/30 border-t-accent rounded-full animate-spin" />
              Loading...
            </div>

            <template v-else-if="creditsData">
              <!-- Technical info -->
              <div class="mb-5 grid grid-cols-2 gap-3">
                <div v-if="creditsData.codec" class="px-3 py-2 rounded-lg bg-white/[0.04]">
                  <p class="text-[10px] text-white/30 uppercase tracking-wider">Codec</p>
                  <p class="text-sm text-white/70">{{ creditsData.codec }} {{ creditsData.lossless ? '(Lossless)' : '' }}</p>
                </div>
                <div v-if="creditsData.bitrate" class="px-3 py-2 rounded-lg bg-white/[0.04]">
                  <p class="text-[10px] text-white/30 uppercase tracking-wider">Bitrate</p>
                  <p class="text-sm text-white/70">{{ creditsData.bitrate }} kbps</p>
                </div>
                <div v-if="creditsData.sampleRate" class="px-3 py-2 rounded-lg bg-white/[0.04]">
                  <p class="text-[10px] text-white/30 uppercase tracking-wider">Sample Rate</p>
                  <p class="text-sm text-white/70">{{ (creditsData.sampleRate / 1000).toFixed(1) }} kHz</p>
                </div>
                <div v-if="creditsData.bpm" class="px-3 py-2 rounded-lg bg-white/[0.04]">
                  <p class="text-[10px] text-white/30 uppercase tracking-wider">BPM</p>
                  <p class="text-sm text-white/70">{{ creditsData.bpm }}</p>
                </div>
              </div>

              <!-- Credits -->
              <div class="space-y-3">
                <div v-if="creditsData.composer.length" class="flex gap-3">
                  <span class="text-xs text-white/30 w-24 shrink-0 text-right pt-0.5">Composer</span>
                  <span class="text-sm text-white/70">{{ creditsData.composer.join(', ') }}</span>
                </div>
                <div v-if="creditsData.lyricist.length" class="flex gap-3">
                  <span class="text-xs text-white/30 w-24 shrink-0 text-right pt-0.5">Lyricist</span>
                  <span class="text-sm text-white/70">{{ creditsData.lyricist.join(', ') }}</span>
                </div>
                <div v-if="creditsData.writer.length" class="flex gap-3">
                  <span class="text-xs text-white/30 w-24 shrink-0 text-right pt-0.5">Writer</span>
                  <span class="text-sm text-white/70">{{ creditsData.writer.join(', ') }}</span>
                </div>
                <div v-if="creditsData.producer.length" class="flex gap-3">
                  <span class="text-xs text-white/30 w-24 shrink-0 text-right pt-0.5">Producer</span>
                  <span class="text-sm text-white/70">{{ creditsData.producer.join(', ') }}</span>
                </div>
                <div v-if="creditsData.conductor.length" class="flex gap-3">
                  <span class="text-xs text-white/30 w-24 shrink-0 text-right pt-0.5">Conductor</span>
                  <span class="text-sm text-white/70">{{ creditsData.conductor.join(', ') }}</span>
                </div>
                <div v-if="creditsData.engineer.length" class="flex gap-3">
                  <span class="text-xs text-white/30 w-24 shrink-0 text-right pt-0.5">Engineer</span>
                  <span class="text-sm text-white/70">{{ creditsData.engineer.join(', ') }}</span>
                </div>
                <div v-if="creditsData.mixer.length" class="flex gap-3">
                  <span class="text-xs text-white/30 w-24 shrink-0 text-right pt-0.5">Mixer</span>
                  <span class="text-sm text-white/70">{{ creditsData.mixer.join(', ') }}</span>
                </div>
                <div v-if="creditsData.remixer.length" class="flex gap-3">
                  <span class="text-xs text-white/30 w-24 shrink-0 text-right pt-0.5">Remixer</span>
                  <span class="text-sm text-white/70">{{ creditsData.remixer.join(', ') }}</span>
                </div>
                <div v-if="creditsData.label.length" class="flex gap-3">
                  <span class="text-xs text-white/30 w-24 shrink-0 text-right pt-0.5">Label</span>
                  <span class="text-sm text-white/70">{{ creditsData.label.join(', ') }}</span>
                </div>
                <div v-if="creditsData.copyright" class="flex gap-3">
                  <span class="text-xs text-white/30 w-24 shrink-0 text-right pt-0.5">Copyright</span>
                  <span class="text-sm text-white/70">{{ creditsData.copyright }}</span>
                </div>
                <div v-if="creditsData.comment" class="flex gap-3">
                  <span class="text-xs text-white/30 w-24 shrink-0 text-right pt-0.5">Comment</span>
                  <span class="text-sm text-white/70">{{ creditsData.comment }}</span>
                </div>
              </div>

              <div v-if="noCredits" class="text-center py-8 text-white/20 text-sm">
                No credits information found in track metadata.
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlist'
import { useLibraryStore } from '@/stores/library'
import { useToast } from '@/composables/useToast'
import { useFavoritesStore } from '@/stores/favorites'
import { formatTime } from '@/utils/formatTime'

const props = defineProps<{
  track: Track
  index: number
  selected?: boolean
  selectable?: boolean
}>()

defineEmits(['play', 'select'])

const router = useRouter()
const player = usePlayerStore()
const playlistStore = usePlaylistStore()
const library = useLibraryStore()
const toast = useToast()
const favoritesStore = useFavoritesStore()

const isActive = computed(() => player.currentTrack?.id === props.track.id)
const isPlaying = computed(() => isActive.value && player.isPlaying)
const coverUrl = computed(() =>
  props.track.coverArt ? window.api.getMediaUrl(props.track.coverArt) : '',
)

const showMenu = ref(false)
const showNewInput = ref(false)
const newName = ref('')
const plusBtnRef = ref<HTMLElement>()
const newInputRef = ref<HTMLInputElement>()
const menuPos = ref({ top: 0, left: 0 })

// Context menu state
const showCtx = ref(false)
const ctxPos = ref({ top: 0, left: 0 })
const ctxStyle = computed(() => ({
  top: ctxPos.value.top + 'px',
  left: ctxPos.value.left + 'px',
}))

const menuStyle = computed(() => ({
  top: menuPos.value.top + 'px',
  left: menuPos.value.left + 'px',
}))

function openMenu() {
  if (showMenu.value) { showMenu.value = false; return }
  const btn = plusBtnRef.value
  if (btn) {
    const rect = btn.getBoundingClientRect()
    menuPos.value = {
      top: Math.min(rect.bottom + 4, window.innerHeight - 280),
      left: Math.min(rect.right - 224, window.innerWidth - 240),
    }
  }
  showNewInput.value = false
  newName.value = ''
  showMenu.value = true
}

function beginCreate() {
  showNewInput.value = true
  nextTick(() => newInputRef.value?.focus())
}

async function createAndAdd() {
  const name = newName.value.trim()
  if (!name) return
  const pl = await playlistStore.createPlaylist(name)
  await playlistStore.addTracks(pl.id, [props.track.id])
  showMenu.value = false
  showNewInput.value = false
  newName.value = ''
}

async function addTo(playlistId: string) {
  const pl = playlistStore.getPlaylistById(playlistId)
  if (pl && pl.trackIds.includes(props.track.id)) {
    toast.warning('Song is already in this playlist')
    showMenu.value = false
    return
  }
  await playlistStore.addTracks(playlistId, [props.track.id])
  toast.success(`Added to ${pl?.name || 'playlist'}`)
  showMenu.value = false
}

// ── Context menu ────────────────────────────────────────────
function openContextMenu(e: MouseEvent) {
  showCtx.value = false
  showMenu.value = false
  ctxPos.value = {
    top: Math.min(e.clientY, window.innerHeight - 320),
    left: Math.min(e.clientX, window.innerWidth - 220),
  }
  showCtx.value = true
}

function doPlayNext() {
  player.playNext(props.track)
  showCtx.value = false
}

function doPlayLater() {
  player.playLater(props.track)
  showCtx.value = false
}

async function toggleFavorite() {
  await favoritesStore.toggle(props.track.id)
  const isFav = favoritesStore.isFavorite(props.track.id)
  toast.success(isFav ? 'Added to Favorites' : 'Removed from Favorites')
  showCtx.value = false
}

async function toggleFavoriteInline() {
  await favoritesStore.toggle(props.track.id)
}

function ctxToPlaylist() {
  showCtx.value = false
  // Open the + playlist menu at same position
  nextTick(() => {
    menuPos.value = { ...ctxPos.value }
    showNewInput.value = false
    newName.value = ''
    showMenu.value = true
  })
}

function goToArtist() {
  showCtx.value = false
  const artistName = props.track.albumArtist || props.track.artist
  router.push(`/artist/${encodeURIComponent(artistName)}`)
}

function goToAlbum() {
  showCtx.value = false
  const album = library.albums.find(a =>
    a.name === props.track.album && a.artist === (props.track.albumArtist || props.track.artist)
  )
  if (album) {
    router.push(`/album/${album.id}`)
  }
}

function showInExplorer() {
  showCtx.value = false
  window.api.showInExplorer(props.track.path)
}

// Credits panel state
const showCreditsPanel = ref(false)
const creditsData = ref<TrackCredits | null>(null)
const creditsLoading = ref(false)

async function showCredits() {
  showCtx.value = false
  showCreditsPanel.value = true
  creditsLoading.value = true
  try {
    creditsData.value = await window.api.getTrackCredits(props.track.path)
  } catch {
    creditsData.value = null
  } finally {
    creditsLoading.value = false
  }
}

const noCredits = computed(() => {
  if (!creditsData.value) return false
  const c = creditsData.value
  return !c.composer.length && !c.lyricist.length && !c.writer.length && !c.producer.length &&
    !c.conductor.length && !c.engineer.length && !c.mixer.length && !c.remixer.length &&
    !c.label.length && !c.copyright && !c.comment
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.credits-slide-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.credits-slide-leave-active { transition: all 0.2s ease-in; }
.credits-slide-enter-from, .credits-slide-leave-to { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
.credits-slide-enter-to, .credits-slide-leave-from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
</style>
