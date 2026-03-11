<template>
  <div class="folder-view h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="px-6 pt-6 pb-4 shrink-0">
      <h1 class="text-2xl font-bold text-white mb-1">Folders</h1>
      <p class="text-xs text-white/40">Browse your music by file directory structure</p>
    </div>

    <!-- Breadcrumb -->
    <div v-if="breadcrumbs.length > 1" class="px-6 pb-3 shrink-0">
      <div class="flex items-center gap-1 text-sm">
        <button
          v-for="(crumb, idx) in breadcrumbs"
          :key="crumb.path"
          @click="navigateTo(crumb.path)"
          class="flex items-center gap-1 text-white/40 hover:text-white transition-colors"
          :class="idx === breadcrumbs.length - 1 ? 'text-white font-medium' : ''"
        >
          <svg v-if="idx > 0" class="w-3.5 h-3.5 text-white/20 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span class="truncate max-w-[150px]">{{ crumb.name }}</span>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto px-6 pb-6" @keydown.ctrl.a.prevent="selectAllInFolder" tabindex="0">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center gap-3 py-12 justify-center text-white/30">
        <div class="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        Loading folder structure...
      </div>

      <!-- No folders configured -->
      <div v-else-if="library.folders.length === 0" class="flex flex-col items-center justify-center py-20 text-white/20">
        <svg class="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        <p class="text-sm font-medium">No music folders configured</p>
        <p class="text-xs mt-1 text-white/15">Add folders in Settings to browse them here</p>
      </div>

      <!-- Root: show configured folders -->
      <template v-else-if="!currentPath">
        <div class="space-y-0.5">
          <div
            v-for="folder in library.folders"
            :key="folder"
            @click.exact="navigateTo(folder)"
            @click.ctrl.exact="selectFolderTracks(folder)"
            @click.meta.exact="selectFolderTracks(folder)"
            @contextmenu.prevent="openFolderCtxMenu($event, folder)"
            class="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer hover:bg-white/[0.05] transition-colors group select-none"
          >
            <svg class="w-5 h-5 text-accent/60 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-white truncate">{{ folder }}</p>
            </div>
            <span v-if="folderSelectionCount(folder) > 0" class="text-[10px] text-accent shrink-0">{{ folderSelectionCount(folder) }} selected</span>
            <svg class="w-4 h-4 text-white/20 group-hover:text-white/40 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7" />
            </svg>
          </div>
        </div>
      </template>

      <!-- Folder contents -->
      <template v-else>
        <!-- Back button -->
        <button
          @click="goUp"
          class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors mb-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div class="space-y-0.5">
          <!-- Subdirectories -->
          <div
            v-for="entry in currentEntries.filter(e => e.isDirectory)"
            :key="entry.path"
            @click.exact="navigateTo(entry.path)"
            @click.ctrl.exact="selectFolderTracks(entry.path)"
            @click.meta.exact="selectFolderTracks(entry.path)"
            @contextmenu.prevent="openFolderCtxMenu($event, entry.path)"
            class="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer hover:bg-white/[0.05] transition-colors group select-none"
            :class="folderSelectionCount(entry.path) > 0 ? 'bg-accent/[0.06]' : ''"
          >
            <!-- Folder checkbox indicator -->
            <div class="w-5 h-5 flex items-center justify-center shrink-0">
              <div
                v-if="selection.hasSelection.value"
                class="w-4 h-4 rounded border flex items-center justify-center transition-all"
                :class="folderSelectionCount(entry.path) > 0 ? 'bg-accent border-accent' : 'border-white/20'"
              >
                <svg v-if="folderSelectionCount(entry.path) > 0" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
              <svg v-else class="w-5 h-5 text-accent/50" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-white truncate">{{ entry.name }}</p>
            </div>
            <span v-if="folderSelectionCount(entry.path) > 0" class="text-[10px] text-accent shrink-0">{{ folderSelectionCount(entry.path) }} selected</span>
            <span v-else-if="entry.trackCount" class="text-[10px] text-white/25 shrink-0">{{ entry.trackCount }} tracks</span>
            <svg class="w-4 h-4 text-white/20 group-hover:text-white/40 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>

          <!-- Audio files -->
          <template v-if="folderTracks.length > 0">
            <div class="pt-2 pb-1 flex items-center justify-between">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-white/25 px-4">
                {{ folderTracks.length }} {{ folderTracks.length === 1 ? 'track' : 'tracks' }}
              </p>
              <div class="flex items-center gap-2">
                <button
                  v-if="selection.hasSelection.value"
                  @click="selection.clearSelection()"
                  class="px-3 py-1 text-xs text-white/40 hover:text-white transition-colors"
                >
                  Clear
                </button>
                <button
                  @click="selectAllInFolder"
                  class="px-3 py-1 text-xs text-white/40 hover:text-accent transition-colors"
                >
                  Select All
                </button>
                <button
                  @click="playFolderTracks"
                  class="px-3 py-1 text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  Play All
                </button>
              </div>
            </div>
            <SongRow
              v-for="(track, i) in folderTracks"
              :key="track.id"
              :track="track"
              :index="i"
              :selected="selection.isSelected(track.id)"
              :selectable="selection.hasSelection.value"
              :selected-tracks="selection.selectedItems.value"
              @play="selection.hasSelection.value ? selection.handleSelect(i, $event ?? { ctrlKey: true, metaKey: false, shiftKey: false }) : player.playAll(folderTracks, i)"
              @select="selection.handleSelect(i, $event)"
            />
          </template>
        </div>
      </template>
    </div>

    <!-- Selection action bar -->
    <SelectionBar
      :count="selection.selectedCount.value"
      :track-ids="selection.selectedItems.value.map(t => t.id)"
      @play-next="onPlayNextSelected"
      @add-to-queue="onAddToQueueSelected"
      @select-all="selectAllInFolder"
      @clear="selection.clearSelection()"
    />

    <!-- Folder context menu -->
    <Teleport to="body">
      <div v-if="folderCtx.show" class="fixed inset-0 z-[90]" @click="folderCtx.show = false" @contextmenu.prevent="folderCtx.show = false" />
      <div
        v-if="folderCtx.show"
        class="fixed z-[100] w-56 rounded-xl menu-panel py-1.5 shadow-2xl"
        :style="{ top: folderCtx.y + 'px', left: folderCtx.x + 'px' }"
        @click.stop
      >
        <button
          @click.stop="playFolderPath(folderCtx.path)"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          Play Folder
        </button>
        <button
          @click.stop="selectFolderTracks(folderCtx.path); folderCtx.show = false"
          class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
        >
          <svg class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          Select All Tracks
        </button>
        <!-- Plugin context menu items for folder -->
        <template v-if="pluginContextMenuItems.length">
          <div class="border-t border-white/[0.06] my-1" />
          <button
            v-for="item in pluginContextMenuItems"
            :key="item.label"
            @click.stop="runFolderPluginItem(item, folderCtx.path)"
            class="w-full px-3.5 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
          >
            <svg v-if="item.icon" class="w-4 h-4 shrink-0 text-white/40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
            </svg>
            {{ item.label }}
          </button>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { useSelection } from '@/composables/useSelection'
import SongRow from '@/components/SongRow.vue'
import SelectionBar from '@/components/SelectionBar.vue'
import { pluginContextMenuItems } from '@/plugins/api'

const library = useLibraryStore()
const player = usePlayerStore()

const currentPath = ref<string | null>(null)
const currentEntries = ref<FolderEntry[]>([])
const loading = ref(false)

// Selection
const selection = useSelection(() => folderTracks.value)

// Clear selection when navigating to a different folder
watch(currentPath, () => selection.clearSelection())

// Build breadcrumbs from current path
const breadcrumbs = computed(() => {
  if (!currentPath.value) return []
  const crumbs: { name: string; path: string }[] = []
  const root = library.folders.find(f => currentPath.value!.startsWith(f))
  if (!root) return []

  crumbs.push({ name: root.split('/').pop() || root, path: root })
  if (currentPath.value !== root) {
    const relative = currentPath.value.substring(root.length + 1)
    const parts = relative.split('/')
    let accumulated = root
    for (const part of parts) {
      accumulated += '/' + part
      crumbs.push({ name: part, path: accumulated })
    }
  }
  return crumbs
})

// Get tracks from the library that are in the current folder (direct files only)
const folderTracks = computed(() => {
  if (!currentPath.value) return []
  const audioFiles = currentEntries.value.filter(e => !e.isDirectory)
  const trackMap = new Map(library.tracks.map(t => [t.path, t]))
  return audioFiles
    .map(f => trackMap.get(f.path))
    .filter((t): t is Track => !!t)
})

// Count selected tracks within a given folder path (recursive)
function folderSelectionCount(folderPath: string): number {
  if (!selection.hasSelection.value) return 0
  return selection.selectedItems.value.filter(t =>
    t.path.startsWith(folderPath + '/') || t.path.startsWith(folderPath + '\\')
  ).length
}

// Select all tracks in the current folder's song list
function selectAllInFolder() {
  if (folderTracks.value.length === 0) return
  selection.selectAll()
}

// Ctrl+click a folder directory to add all its tracks (recursive) to the selection
function selectFolderTracks(folderPath: string) {
  const tracks = library.tracks.filter(t =>
    t.path.startsWith(folderPath + '/') || t.path.startsWith(folderPath + '\\')
  )
  if (tracks.length === 0) return
  const newSet = new Set(selection.selectedIds.value)
  tracks.forEach(t => newSet.add(t.id))
  selection.selectedIds.value = newSet
}

// Folder context menu
const folderCtx = ref({ show: false, x: 0, y: 0, path: '' })

function openFolderCtxMenu(e: MouseEvent, path: string) {
  folderCtx.value = {
    show: true,
    x: Math.min(e.clientX, window.innerWidth - 230),
    y: Math.min(e.clientY, window.innerHeight - 160),
    path,
  }
}

function playFolderPath(folderPath: string) {
  folderCtx.value.show = false
  const tracks = library.tracks.filter(t =>
    t.path.startsWith(folderPath + '/') || t.path.startsWith(folderPath + '\\')
  )
  if (tracks.length > 0) player.playAll(tracks)
}

function runFolderPluginItem(item: { onClick: (tracks: Track[]) => void }, folderPath: string) {
  folderCtx.value.show = false
  // If there are already selected tracks including tracks from this folder, pass the full selection;
  // otherwise gather all tracks in the folder
  const inSelection = selection.selectedItems.value.filter(t =>
    t.path.startsWith(folderPath + '/') || t.path.startsWith(folderPath + '\\')
  )
  const tracks = inSelection.length > 0
    ? selection.selectedItems.value
    : library.tracks.filter(t =>
        t.path.startsWith(folderPath + '/') || t.path.startsWith(folderPath + '\\')
      )
  if (tracks.length > 0) {
    try { item.onClick(tracks) } catch {}
  }
}

async function navigateTo(path: string) {
  loading.value = true
  currentPath.value = path
  try {
    currentEntries.value = await window.api.getFolderTree(path)
  } catch (err) {
    console.error('Failed to load folder:', err)
    currentEntries.value = []
  } finally {
    loading.value = false
  }
}

function goUp() {
  if (!currentPath.value) return
  const isRoot = library.folders.includes(currentPath.value)
  if (isRoot) {
    currentPath.value = null
    currentEntries.value = []
    return
  }
  const parent = currentPath.value.substring(0, currentPath.value.lastIndexOf('/'))
  if (parent) navigateTo(parent)
  else { currentPath.value = null; currentEntries.value = [] }
}

function playFolderTracks() {
  if (folderTracks.value.length > 0) {
    player.playAll(folderTracks.value)
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
</script>
