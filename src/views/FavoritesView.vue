<template>
  <div class="p-6 h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-white mb-1">Favorites</h1>
        <p class="text-sm text-white/40">{{ favorites.count }} songs</p>
      </div>

      <div class="flex items-center gap-2" v-if="favorites.count > 0">
        <button
          @click="playAll"
          class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent hover:bg-accent-hover transition-colors text-sm font-medium"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          Play
        </button>
        <button
          @click="shufflePlay"
          class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.12] transition-colors text-sm font-medium text-white/70"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
          </svg>
          Shuffle
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="favorites.count === 0"
      class="flex flex-col items-center justify-center py-20"
    >
      <svg class="w-20 h-20 text-white/[0.06] mb-6" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
      <h2 class="text-xl font-semibold text-white/60 mb-2">No favorites yet</h2>
      <p class="text-sm text-white/30">Right-click a song and choose "Add to Favorites"</p>
    </div>

    <!-- Song list -->
    <div v-if="favorites.count > 0" class="flex flex-col flex-1 min-h-0">
      <!-- Column headers -->
      <div class="flex items-center gap-3 px-4 py-2 mb-1 border-b border-white/[0.06] shrink-0">
        <div class="w-8 text-center text-[10px] text-white/30 font-medium">#</div>
        <div class="w-10" />
        <div class="flex-1 text-[10px] text-white/30 font-medium uppercase tracking-wider">Title</div>
        <div class="w-48 hidden lg:block text-[10px] text-white/30 font-medium uppercase tracking-wider">Album</div>
        <div class="w-14 text-right">
          <svg class="w-3.5 h-3.5 text-white/30 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
        </div>
        <div class="w-7" />
        <div class="w-7" />
      </div>

      <VirtualScroller
        ref="virtualScrollerRef"
        :items="favorites.favoriteTracks"
        :item-height="56"
        key-field="id"
        container-height="100%"
        class="flex-1 min-h-0"
      >
        <template #default="{ item: track, index: i }">
          <SongRow
            :track="track"
            :index="i"
            :selected="selection.isSelected(track.id)"
            :selectable="selection.hasSelection.value"
            @play="selection.hasSelection.value ? selection.handleSelect(i, $event ?? { ctrlKey: true, metaKey: false, shiftKey: false }) : playFromIndex(i)"
            @select="selection.handleSelect(i, $event)"
          />
        </template>
      </VirtualScroller>
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
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, onActivated, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useFavoritesStore } from '@/stores/favorites'
import { usePlayerStore } from '@/stores/player'
import { useSelection } from '@/composables/useSelection'
import SongRow from '@/components/SongRow.vue'
import SelectionBar from '@/components/SelectionBar.vue'
import VirtualScroller from '@/components/VirtualScroller.vue'

const favorites = useFavoritesStore()
const player = usePlayerStore()
const selection = useSelection(() => favorites.favoriteTracks)
const virtualScrollerRef = ref<InstanceType<typeof VirtualScroller> | null>(null)

// ── Scroll memory ────────────────────────
let savedScrollTop = 0
onActivated(() => {
  requestAnimationFrame(() => {
    const el = virtualScrollerRef.value?.containerRef
    if (el) el.scrollTop = savedScrollTop
  })
})
onBeforeRouteLeave(() => {
  const el = virtualScrollerRef.value?.containerRef
  if (el) savedScrollTop = el.scrollTop
})

function playAll() {
  if (favorites.favoriteTracks.length > 0) {
    player.playAll(favorites.favoriteTracks, 0)
  }
}

function shufflePlay() {
  const shuffled = [...favorites.favoriteTracks].sort(() => Math.random() - 0.5)
  if (shuffled.length > 0) player.playAll(shuffled, 0)
}

function playFromIndex(index: number) {
  player.playAll(favorites.favoriteTracks, index)
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
  if ((e.ctrlKey || e.metaKey) && e.key === 'a' && favorites.favoriteTracks.length > 0) {
    e.preventDefault()
    selection.selectAll()
  }
}

onMounted(() => {
  if (!favorites.loaded) favorites.load()
  document.addEventListener('keydown', onKeyDown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
})
</script>
