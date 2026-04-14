<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-[80] bg-black/50" @click="$emit('close')" />
    </Transition>
    <Transition name="dialog-slide">
      <div
        v-if="show"
        class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-[400px] max-w-[90vw] rounded-2xl bg-[#12121f] border border-white/[0.08] shadow-2xl"
      >
        <div class="p-6">
          <h3 class="text-base font-semibold text-white mb-5">Edit Playlist</h3>

          <!-- Cover image picker -->
          <div class="flex items-start gap-4 mb-5">
            <div
              class="w-20 h-20 rounded-xl overflow-hidden bg-white/[0.06] border border-white/[0.08] shrink-0 relative group cursor-pointer"
              @click="pickCover"
              title="Click to set cover image"
            >
              <img
                v-if="customImage"
                :src="'localfile://' + customImage"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-white/20">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg class="w-5 h-5 text-white/80" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </div>
            </div>
            <div class="flex-1 min-w-0 flex flex-col gap-2 pt-1">
              <button
                v-if="customImage"
                @click="customImage = null"
                class="self-start text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Remove cover
              </button>
              <p class="text-xs text-white/30">Click the image to change the playlist cover</p>
            </div>
          </div>

          <!-- Name -->
          <label class="block text-xs text-white/40 mb-1.5">Name</label>
          <input
            ref="nameInput"
            v-model="name"
            @keydown.enter="confirm"
            @keydown.escape="$emit('close')"
            class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors mb-4"
            placeholder="Playlist name"
          />

          <!-- Description -->
          <label class="block text-xs text-white/40 mb-1.5">Description</label>
          <textarea
            v-model="description"
            rows="2"
            @keydown.escape="$emit('close')"
            class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors resize-none"
            placeholder="Optional description"
          />

          <div class="flex items-center justify-end gap-2.5 mt-5">
            <button
              @click="$emit('close')"
              class="px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              @click="confirm"
              :disabled="!name.trim()"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-accent/20 text-accent hover:bg-accent/30 border border-accent/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  show: boolean
  playlist: { id: string; name: string; description?: string; customImage?: string | null } | null
}>()

const emit = defineEmits<{
  close: []
  save: [{ id: string; name: string; description: string; customImage: string | null }]
}>()

const name        = ref('')
const description = ref('')
const customImage = ref<string | null>(null)
const nameInput   = ref<HTMLInputElement | null>(null)

watch(
  () => props.playlist,
  (pl) => {
    if (pl) {
      name.value        = pl.name
      description.value = pl.description ?? ''
      customImage.value = pl.customImage ?? null
    }
  },
  { immediate: true },
)

watch(
  () => props.show,
  (v) => { if (v) nextTick(() => { nameInput.value?.focus(); nameInput.value?.select() }) },
)

async function pickCover() {
  const path = await window.api.openImageDialog()
  if (path) customImage.value = path
}

function confirm() {
  if (!name.value.trim() || !props.playlist) return
  emit('save', {
    id: props.playlist.id,
    name: name.value.trim(),
    description: description.value,
    customImage: customImage.value,
  })
}
</script>
