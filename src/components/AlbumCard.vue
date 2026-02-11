<template>
  <div @click="$emit('click')" class="album-card group cursor-pointer">
    <div
      class="relative aspect-square rounded-xl overflow-hidden bg-white/[0.06] mb-3 cover-shadow transition-transform group-hover:scale-[1.02]"
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

      <!-- Play overlay -->
      <div
        class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center"
      >
        <button
          @click.stop="$emit('play')"
          class="w-12 h-12 rounded-full bg-accent flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all accent-glow"
        >
          <svg class="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
    </div>

    <p class="text-sm font-medium text-white truncate">{{ album.name }}</p>
    <p class="text-xs text-white/40 truncate">
      {{ album.artist }}{{ album.year ? ` \u2022 ${album.year}` : '' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Album } from '@/stores/library'

const props = defineProps<{ album: Album }>()

defineEmits(['click', 'play'])

const coverUrl = computed(() =>
  props.album.coverArt ? window.api.getMediaUrl(props.album.coverArt) : '',
)
</script>
