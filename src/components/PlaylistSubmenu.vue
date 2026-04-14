<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[100]" @click="$emit('update:show', false)" />
    <div
      v-if="show"
      class="fixed z-[110] w-52 rounded-xl menu-panel py-1.5 shadow-2xl max-h-64 overflow-y-auto"
      :style="panelStyle"
    >
      <p class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style="color: rgb(var(--app-text) / 0.35)">Add to playlist</p>

      <!-- Inline new playlist input -->
      <div v-if="showNewInput" class="px-3 py-1.5 flex items-center gap-2">
        <input
          ref="newInputRef"
          v-model="newName"
          @keydown.enter="confirmCreate"
          @keydown.escape.stop="showNewInput = false"
          @click.stop
          placeholder="Name…"
          class="ctx-input flex-1 px-2 py-1 rounded text-xs outline-none focus:border-accent"
        />
        <button @click.stop="confirmCreate" class="text-accent text-xs font-medium hover:underline shrink-0">Add</button>
      </div>
      <button
        v-else
        @click.stop="beginCreate"
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
        @click.stop="addTo(pl.id)"
        class="ctx-item w-full px-3.5 py-2 text-left text-sm transition-colors truncate flex items-center justify-between"
      >
        <span class="truncate">{{ pl.name }}</span>
        <svg
          v-if="isSingleTrack && pl.trackIds.includes(trackIds[0])"
          class="w-3.5 h-3.5 text-accent shrink-0"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
        </svg>
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { subMenuPosition } from '@/utils/menuPosition'
import { usePlaylistStore } from '@/stores/playlist'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  show: boolean
  triggerEl?: HTMLElement | null
  trackIds: string[]
  suggestedName?: string
}>()

const emit = defineEmits<{
  'update:show': [val: boolean]
}>()

const playlistStore = usePlaylistStore()
const toast = useToast()

const panelStyle = ref<Record<string, string>>({})
const showNewInput = ref(false)
const newName = ref('')
const newInputRef = ref<HTMLInputElement>()

const isSingleTrack = computed(() => props.trackIds.length === 1)

watch(() => props.show, (open) => {
  if (open) {
    showNewInput.value = false
    newName.value = props.suggestedName ?? ''
    if (props.triggerEl) {
      const rect = props.triggerEl.getBoundingClientRect()
      panelStyle.value = subMenuPosition(rect, 212, 270)
    }
  }
})

function beginCreate() {
  showNewInput.value = true
  nextTick(() => newInputRef.value?.focus())
}

async function confirmCreate() {
  const name = newName.value.trim()
  if (!name) return
  const pl = await playlistStore.createPlaylist(name)
  await playlistStore.addTracks(pl.id, props.trackIds)
  if (isSingleTrack.value) {
    toast.success(`Added to "${name}"`)
  } else {
    toast.success(`Created "${name}" with ${props.trackIds.length} tracks`)
  }
  showNewInput.value = false
  newName.value = ''
  emit('update:show', false)
}

async function addTo(playlistId: string) {
  const pl = playlistStore.getPlaylistById(playlistId)
  if (isSingleTrack.value && pl?.trackIds.includes(props.trackIds[0])) {
    toast.warning('Song is already in this playlist')
    emit('update:show', false)
    return
  }
  await playlistStore.addTracks(playlistId, props.trackIds)
  if (isSingleTrack.value) {
    toast.success(`Added to ${pl?.name || 'playlist'}`)
  } else {
    toast.success(`Added ${props.trackIds.length} tracks to ${pl?.name || 'playlist'}`)
  }
  emit('update:show', false)
}
</script>
