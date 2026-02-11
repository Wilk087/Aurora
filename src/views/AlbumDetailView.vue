<template>
  <div v-if="album" class="album-detail p-6">
    <!-- Album header -->
    <div class="flex items-end gap-6 mb-8">
      <div class="w-56 h-56 rounded-2xl overflow-hidden bg-white/[0.06] shrink-0 cover-shadow">
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
        <p class="text-lg text-white/60 mb-4">{{ album.artist }}</p>
        <div class="flex items-center gap-3 text-sm text-white/40">
          <span v-if="album.year">{{ album.year }}</span>
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
        @play="player.playAll(album.tracks, i)"
      />
    </div>
  </div>

  <div v-else class="flex items-center justify-center h-full">
    <p class="text-white/30">Album not found</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import SongRow from '@/components/SongRow.vue'

const route = useRoute()
const library = useLibraryStore()
const player = usePlayerStore()

const album = computed(() => library.getAlbumById(route.params.id as string))

const coverUrl = computed(() =>
  album.value?.coverArt ? window.api.getMediaUrl(album.value.coverArt) : '',
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
</script>
