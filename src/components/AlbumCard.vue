<template>
  <div @click="$emit('click')" @contextmenu.prevent="openCtx" class="album-card group cursor-pointer" :data-album-id="album.id">
    <div
      class="album-cover-wrapper relative aspect-square rounded-xl overflow-hidden bg-white/[0.06] mb-3 cover-shadow transition-transform group-hover:scale-[1.02]"
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

      <!-- Play / Pause overlay -->
      <div
        class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center"
      >
        <button
          @click.stop="togglePlayAlbum"
          class="w-12 h-12 rounded-full bg-accent flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all accent-glow"
        >
          <svg v-if="isThisAlbumPlaying" class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z" />
          </svg>
          <svg v-else class="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
    </div>

    <p class="text-sm font-medium text-white truncate">{{ album.name }}</p>
    <p class="text-xs text-white/40 truncate">
      <ArtistLinks
        :artist="album.artist"
        hover-class="hover:text-white/60"
      /><span v-if="album.year"> • <span class="hover:text-white/60 cursor-pointer transition-colors" @click.stop="goToYear">{{ album.year }}</span></span>
    </p>

    <!-- ── Context menu ── -->
    <Teleport to="body">
      <div v-if="showCtx" class="fixed inset-0 z-[90]" @click="showCtx = false" @contextmenu.prevent="showCtx = false" />
      <div
        v-if="showCtx"
        class="fixed z-[100] w-48 rounded-xl menu-panel py-1.5 shadow-2xl"
        :style="ctxStyle"
      >
        <button @click.stop="playAlbum" class="ctx-item w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center gap-2.5">
          <svg class="w-4 h-4 shrink-0 opacity-50" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play Album
        </button>
        <button @click.stop="addToQueue" class="ctx-item w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center gap-2.5">
          <svg class="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
          Add to Queue
        </button>
        <button @click.stop="goToArtist" class="ctx-item w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center gap-2.5">
          <svg class="w-4 h-4 shrink-0 opacity-50" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          Go to Artist
        </button>
        <div class="border-t border-[var(--border)] my-1" />
        <button @click.stop="openInExplorer" class="ctx-item w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center gap-2.5">
          <svg class="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          Show in File Explorer
        </button>
        <button @click.stop="openTagDialog" class="ctx-item w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center gap-2.5">
          <svg class="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
          Manage Tags
        </button>
        <div class="border-t border-[var(--border)] my-1" />
        <!-- Add to Playlist — button with ref for submenu positioning -->
        <button
          ref="playlistBtnRef"
          @click.stop="togglePlaylistSub"
          class="ctx-item w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add to Playlist…
          <svg class="w-3 h-3 ml-auto shrink-0 opacity-30" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <!-- Plugin-injected album context menu items -->
        <template v-if="pluginAlbumContextMenuItems.length">
          <div class="border-t border-[var(--border)] my-1" />
          <template v-for="(item, idx) in pluginAlbumContextMenuItems" :key="item.label">
            <div v-if="item.separator" class="border-t border-[var(--border)] my-1" />
            <!-- Item with children — hover submenu via Teleport -->
            <div
              v-if="item.children && item.children.length"
              @mouseenter="e => showPluginSub(idx, e.currentTarget as HTMLElement)"
              @mouseleave="scheduleHidePluginSub"
            >
              <button class="ctx-item w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center gap-2.5">
                <svg v-if="item.icon" class="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
                </svg>
                {{ item.label }}
                <svg class="w-3 h-3 ml-auto shrink-0 opacity-30" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
            <!-- Regular item -->
            <button
              v-else
              @click.stop="runPluginAlbumCtxItem(item)"
              class="ctx-item w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center gap-2.5"
            >
              <svg v-if="item.icon" class="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              {{ item.label }}
            </button>
          </template>
        </template>
      </div>
    </Teleport>

    <!-- ── Playlist submenu (Teleported, bounds-aware) ── -->
    <Teleport to="body">
      <div v-if="showPlaylistSub" class="fixed inset-0 z-[100]" @click="showPlaylistSub = false" />
      <div
        v-if="showPlaylistSub"
        class="fixed z-[110] w-52 rounded-xl menu-panel py-1.5 shadow-2xl max-h-64 overflow-y-auto"
        :style="playlistSubStyle"
      >
        <p class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style="color: rgb(var(--app-text) / 0.35)">Add to playlist</p>
        <button
          @click.stop="createAndAddPlaylist"
          class="ctx-item-accent w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center gap-2"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Playlist
        </button>
        <div v-if="playlistStore.playlists.length > 0" class="border-t border-[var(--border)] my-1" />
        <button
          v-for="pl in playlistStore.sortedPlaylists"
          :key="pl.id"
          @click.stop="addToPlaylist(pl.id)"
          class="ctx-item w-full px-3.5 py-2 text-left text-sm transition-colors truncate"
        >
          {{ pl.name }}
        </button>
      </div>
    </Teleport>

    <!-- ── Plugin submenu (Teleported, bounds-aware) ── -->
    <Teleport to="body">
      <div
        v-if="openPluginSubmenu !== null"
        class="fixed z-[110] w-52 rounded-xl menu-panel py-1.5 shadow-2xl"
        :style="pluginSubStyle"
        @mouseenter="cancelHidePluginSub"
        @mouseleave="scheduleHidePluginSub"
      >
        <template
          v-for="child in (pluginAlbumContextMenuItems[openPluginSubmenu!]?.children ?? [])"
          :key="child.label"
        >
          <div v-if="child.separator" class="border-t border-[var(--border)] my-1" />
          <button
            @click.stop="runPluginAlbumCtxItem(child)"
            class="ctx-item w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center gap-2.5"
          >
            <svg v-if="child.icon" class="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" :d="child.icon" />
            </svg>
            {{ child.label }}
          </button>
        </template>
      </div>
    </Teleport>

    <!-- ── Tag Dialog (own Teleport, independent of ctx menu) ── -->
    <Teleport to="body">
      <TagDialog
        :show="showTagDialog"
        type="album"
        :ids="[albumKey]"
        :label="album.name"
        @close="showTagDialog = false"
        @saved="showTagDialog = false"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { menuPosition } from '@/utils/menuPosition'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlist'
import { useToast } from '@/composables/useToast'
import ArtistLinks from '@/components/ArtistLinks.vue'
import TagDialog from '@/components/TagDialog.vue'
import type { Album } from '@/stores/library'
import { pluginAlbumContextMenuItems } from '@/plugins/api'
import type { PluginAlbumContextMenuItem } from '@/types/plugin'

const props = defineProps<{ album: Album }>()

defineEmits(['click', 'play'])

const router = useRouter()
const player = usePlayerStore()
const playlistStore = usePlaylistStore()
const toast = useToast()

const albumKey = computed(() => `${props.album.name}---${props.album.artist}`)

const isThisAlbumPlaying = computed(() => {
  if (!player.isPlaying || !player.currentTrack) return false
  return props.album.tracks.some(t => t.id === player.currentTrack?.id)
})

function togglePlayAlbum() {
  if (isThisAlbumPlaying.value) {
    player.clearQueue()
  } else {
    player.playAll(props.album.tracks)
  }
}

const coverUrl = computed(() =>
  props.album.coverArt ? window.api.getMediaUrl(props.album.coverArt) : '',
)

// ── Context menu ──────────────────────────────────────────────────────────
const showCtx = ref(false)
const ctxPos = ref<Record<string, string>>({})
const ctxStyle = computed(() => ({
  ...ctxPos.value,
}))

function openCtx(e: MouseEvent) {
  showPlaylistSub.value = false
  openPluginSubmenu.value = null
  ctxPos.value = menuPosition(e.clientX, e.clientY, 200, 320)
  showCtx.value = true
}

function playAlbum() { showCtx.value = false; player.playAll(props.album.tracks) }
function addToQueue() { showCtx.value = false; player.addToQueue(props.album.tracks) }
function goToArtist() { showCtx.value = false; router.push(`/artist/${encodeURIComponent(props.album.artist)}`) }
function goToYear() { if (props.album.year) router.push(`/year/${props.album.year}`) }
function openInExplorer() {
  showCtx.value = false
  if (props.album.tracks.length > 0) window.api.showInExplorer(props.album.tracks[0].path)
}

// ── Tag Dialog ────────────────────────────────────────────────────────────
const showTagDialog = ref(false)

function openTagDialog() {
  showCtx.value = false
  // 80ms gap ensures the click that closed the ctx menu has fully resolved
  // before the TagDialog backdrop mounts — otherwise the same click event
  // can immediately dismiss the newly-opened dialog.
  setTimeout(() => { showTagDialog.value = true }, 80)
}

// ── Playlist submenu (Teleported, bounds-aware) ───────────────────────────
const showPlaylistSub = ref(false)
const playlistBtnRef = ref<HTMLElement>()
const playlistSubStyle = ref({ top: '0px', left: '0px' })

function togglePlaylistSub() {
  if (showPlaylistSub.value) { showPlaylistSub.value = false; return }
  if (playlistBtnRef.value) {
    const rect = playlistBtnRef.value.getBoundingClientRect()
    const subW = 212
    const spaceRight = window.innerWidth - rect.right
    playlistSubStyle.value = {
      top: Math.min(rect.top, window.innerHeight - 270) + 'px',
      left: (spaceRight >= subW ? rect.right + 4 : rect.left - subW) + 'px',
    }
  }
  showPlaylistSub.value = true
}

async function createAndAddPlaylist() {
  const name = props.album.name || 'Untitled'
  const pl = await playlistStore.createPlaylist(name)
  await playlistStore.addTracks(pl.id, props.album.tracks.map(t => t.id))
  toast.success(`Created "${name}" with ${props.album.tracks.length} tracks`)
  showPlaylistSub.value = false
  showCtx.value = false
}

async function addToPlaylist(playlistId: string) {
  const pl = playlistStore.getPlaylistById(playlistId)
  const trackIds = props.album.tracks.map(t => t.id)
  await playlistStore.addTracks(playlistId, trackIds)
  toast.success(`Added ${trackIds.length} tracks to ${pl?.name || 'playlist'}`)
  showPlaylistSub.value = false
  showCtx.value = false
}

// ── Plugin submenus (Teleported, hover-intent with delay) ─────────────────
const openPluginSubmenu = ref<number | null>(null)
const pluginSubStyle = ref({ top: '0px', left: '0px' })
let pluginSubHideTimer: ReturnType<typeof setTimeout> | null = null

function showPluginSub(idx: number, el: HTMLElement) {
  if (pluginSubHideTimer) { clearTimeout(pluginSubHideTimer); pluginSubHideTimer = null }
  openPluginSubmenu.value = idx
  const rect = el.getBoundingClientRect()
  const subW = 212
  const spaceRight = window.innerWidth - rect.right
  pluginSubStyle.value = {
    top: Math.min(rect.top, window.innerHeight - 260) + 'px',
    left: (spaceRight >= subW ? rect.right + 4 : rect.left - subW) + 'px',
  }
}

function scheduleHidePluginSub() {
  pluginSubHideTimer = setTimeout(() => { openPluginSubmenu.value = null }, 120)
}

function cancelHidePluginSub() {
  if (pluginSubHideTimer) { clearTimeout(pluginSubHideTimer); pluginSubHideTimer = null }
}

function runPluginAlbumCtxItem(item: PluginAlbumContextMenuItem) {
  showCtx.value = false
  openPluginSubmenu.value = null
  try { item.onClick(props.album) } catch (err) {
    console.error('[Aurora] Plugin album context menu item error:', err)
  }
}
</script>
