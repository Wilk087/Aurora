<template>
  <span v-if="artists.length <= 1">
    <span
      class="hover:underline underline-offset-2 cursor-pointer transition-colors"
      :class="hoverClass"
      @click.stop="navigate(artistStr)"
    >{{ artistStr }}</span>
  </span>
  <span v-else>
    <template v-for="(name, i) in artists" :key="i">
      <span
        class="hover:underline underline-offset-2 cursor-pointer transition-colors"
        :class="hoverClass"
        @click.stop="navigate(name)"
      >{{ name }}</span><span v-if="i < artists.length - 1" :class="separatorClass">, </span>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { splitArtists } from '@/utils/splitArtists'

const props = withDefaults(defineProps<{
  artist: string
  albumArtist?: string
  hoverClass?: string
  separatorClass?: string
}>(), {
  hoverClass: '',
  separatorClass: '',
})

const router = useRouter()

const artistStr = computed(() => props.artist || 'Unknown Artist')
const artists = computed(() => splitArtists(artistStr.value))

function navigate(name: string) {
  router.push(`/artist/${encodeURIComponent(name)}`)
}
</script>
