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
    <div class="flex-1 overflow-y-auto px-6 pb-6">
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
            @click="navigateTo(folder)"
            class="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer hover:bg-white/[0.05] transition-colors group"
          >
            <svg class="w-5 h-5 text-accent/60 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-white truncate">{{ folder }}</p>
            </div>
            <svg class="w-4 h-4 text-white/20 group-hover:text-white/40 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
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
            @click="navigateTo(entry.path)"
            class="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer hover:bg-white/[0.05] transition-colors group"
          >
            <svg class="w-5 h-5 text-accent/50 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-white truncate">{{ entry.name }}</p>
            </div>
            <span v-if="entry.trackCount" class="text-[10px] text-white/25 shrink-0">{{ entry.trackCount }} tracks</span>
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
              <button
                @click="playFolderTracks"
                class="px-3 py-1 text-xs text-accent hover:text-accent-hover transition-colors"
              >
                Play All
              </button>
            </div>
            <SongRow
              v-for="(track, i) in folderTracks"
              :key="track.id"
              :track="track"
              :index="i"
              @play="player.playAll(folderTracks, i)"
            />
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import SongRow from '@/components/SongRow.vue'

const library = useLibraryStore()
const player = usePlayerStore()

const currentPath = ref<string | null>(null)
const currentEntries = ref<FolderEntry[]>([])
const loading = ref(false)

// Build breadcrumbs from current path
const breadcrumbs = computed(() => {
  if (!currentPath.value) return []
  const crumbs: { name: string; path: string }[] = []
  // Find which root folder this path is under
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

// Get tracks from the library that are in the current folder
const folderTracks = computed(() => {
  if (!currentPath.value) return []
  const audioFiles = currentEntries.value.filter(e => !e.isDirectory)
  // Match audio files to library tracks by path
  const trackMap = new Map(library.tracks.map(t => [t.path, t]))
  return audioFiles
    .map(f => trackMap.get(f.path))
    .filter((t): t is Track => !!t)
})

async function navigateTo(path: string) {
  loading.value = true
  currentPath.value = path
  try {
    currentEntries.value = await window.api.getFolderTree(path)
    // Flatten: getFolderTree returns nested, but we only want the immediate children
    // The IPC returns the flat children of the requested path
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
</script>
