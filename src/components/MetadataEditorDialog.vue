<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-[80] bg-black/50" @click="!saving && $emit('close')" />
    </Transition>
    <Transition name="dialog-slide">
      <div
        v-if="show"
        class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-[560px] max-w-[92vw] max-h-[85vh] rounded-2xl bg-[#12121f] border border-white/[0.08] shadow-2xl flex flex-col"
      >
        <div class="p-6 pb-4 shrink-0">
          <h3 class="text-base font-semibold text-white">
            {{ mode === 'album' ? 'Edit Album Metadata' : 'Edit Metadata' }}
          </h3>
          <p class="text-xs text-white/30 mt-1">
            {{ mode === 'album'
              ? `Changes are written into all ${tracks.length} files of this album`
              : 'Changes are written into the audio file' }}
          </p>
        </div>

        <div class="px-6 overflow-y-auto flex-1">
          <!-- Cover + main fields -->
          <div class="flex items-start gap-4 mb-4">
            <div
              class="w-24 h-24 rounded-xl overflow-hidden bg-white/[0.06] border border-white/[0.08] shrink-0 relative group cursor-pointer"
              @click="pickCover"
              title="Click to change cover art"
            >
              <img v-if="coverPreviewUrl" :src="coverPreviewUrl" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-white/20">
                <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg class="w-5 h-5 text-white/80" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                </svg>
              </div>
            </div>
            <div class="flex-1 min-w-0 space-y-3">
              <template v-if="mode === 'song'">
                <div>
                  <label class="block text-xs text-white/40 mb-1">Title</label>
                  <input v-model="fields.title" class="meta-input" placeholder="Title" />
                </div>
                <div>
                  <label class="block text-xs text-white/40 mb-1">Artist</label>
                  <input v-model="fields.artist" class="meta-input" placeholder="Artist" />
                </div>
              </template>
              <template v-else>
                <div>
                  <label class="block text-xs text-white/40 mb-1">Album</label>
                  <input v-model="fields.album" class="meta-input" :placeholder="mixed.album ? 'Mixed values' : 'Album'" />
                </div>
                <div>
                  <label class="block text-xs text-white/40 mb-1">Album Artist</label>
                  <input v-model="fields.albumArtist" class="meta-input" :placeholder="mixed.albumArtist ? 'Mixed values' : 'Album artist'" />
                </div>
              </template>
              <p v-if="newCoverPath" class="text-[11px] text-accent/80 truncate">
                New cover: {{ newCoverPath.split('/').pop() }}
                <button @click="newCoverPath = null" class="ml-1 text-white/30 hover:text-white/60">✕</button>
              </p>
            </div>
          </div>

          <!-- Secondary fields -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <template v-if="mode === 'song'">
              <div>
                <label class="block text-xs text-white/40 mb-1">Album</label>
                <input v-model="fields.album" class="meta-input" placeholder="Album" />
              </div>
              <div>
                <label class="block text-xs text-white/40 mb-1">Album Artist</label>
                <input v-model="fields.albumArtist" class="meta-input" placeholder="Album artist" />
              </div>
            </template>
            <div>
              <label class="block text-xs text-white/40 mb-1">Genre</label>
              <input v-model="fields.genre" class="meta-input" :placeholder="mixed.genre ? 'Mixed values' : 'Genre'" />
            </div>
            <div>
              <label class="block text-xs text-white/40 mb-1">Year</label>
              <input v-model="fields.year" type="number" min="0" class="meta-input" :placeholder="mixed.year ? 'Mixed values' : 'Year'" />
            </div>
            <template v-if="mode === 'song'">
              <div>
                <label class="block text-xs text-white/40 mb-1">Track №</label>
                <input v-model="fields.trackNumber" type="number" min="0" class="meta-input" placeholder="Track number" />
              </div>
              <div>
                <label class="block text-xs text-white/40 mb-1">Disc №</label>
                <input v-model="fields.disc" type="number" min="0" class="meta-input" placeholder="Disc number" />
              </div>
              <div>
                <label class="block text-xs text-white/40 mb-1">Composer</label>
                <input v-model="fields.composer" class="meta-input" placeholder="Composer" />
              </div>
              <div>
                <label class="block text-xs text-white/40 mb-1">Comment</label>
                <input v-model="fields.comment" class="meta-input" placeholder="Comment" />
              </div>
            </template>
          </div>

          <!-- Album mode: per-track title / number editing -->
          <div v-if="mode === 'album'" class="mb-4">
            <p class="text-xs text-white/40 mb-2">Tracks</p>
            <div class="space-y-1.5">
              <div v-for="row in trackRows" :key="row.id" class="flex items-center gap-2">
                <input
                  v-model="row.track"
                  type="number"
                  min="0"
                  class="meta-input !w-14 text-center shrink-0"
                  title="Track number"
                />
                <input v-model="row.title" class="meta-input flex-1" placeholder="Title" />
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2.5 p-6 pt-4 shrink-0 border-t border-white/[0.06]">
          <p class="text-xs text-white/30">
            <template v-if="saving">Writing {{ saveProgress.current }} / {{ saveProgress.total }}…</template>
          </p>
          <div class="flex items-center gap-2.5">
            <button
              @click="$emit('close')"
              :disabled="saving"
              class="px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.06] disabled:opacity-40 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="save"
              :disabled="saving || !hasChanges"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-accent/20 text-accent hover:bg-accent/30 border border-accent/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  show: boolean
  tracks: Track[]
  mode: 'song' | 'album'
}>()

const emit = defineEmits<{
  close: []
  saved: [updated: Track[]]
}>()

const library = useLibraryStore()
const toast = useToast()

interface Fields {
  title: string
  artist: string
  albumArtist: string
  album: string
  genre: string
  year: string
  trackNumber: string
  disc: string
  composer: string
  comment: string
}

const emptyFields = (): Fields => ({
  title: '', artist: '', albumArtist: '', album: '', genre: '',
  year: '', trackNumber: '', disc: '', composer: '', comment: '',
})

const fields = ref<Fields>(emptyFields())
const initial = ref<Fields>(emptyFields())
const mixed = ref<Record<string, boolean>>({})
const newCoverPath = ref<string | null>(null)

interface TrackRow { id: string; path: string; title: string; track: string }
const trackRows = ref<TrackRow[]>([])
const initialRows = ref<Record<string, { title: string; track: string }>>({})

const saving = ref(false)
const saveProgress = ref({ current: 0, total: 0 })

/** Common value across tracks, or '' when they differ (flagged in `mixed`) */
function commonValue(key: string, get: (t: Track) => string): string {
  const values = new Set(props.tracks.map(get))
  mixed.value[key] = values.size > 1
  return values.size === 1 ? [...values][0] : ''
}

watch(
  () => [props.show, props.tracks] as const,
  ([show]) => {
    if (!show || props.tracks.length === 0) return
    mixed.value = {}
    const t = props.tracks[0]
    if (props.mode === 'song') {
      fields.value = {
        title: t.title,
        artist: t.artist,
        albumArtist: t.albumArtist,
        album: t.album,
        genre: t.genre,
        year: t.year ? String(t.year) : '',
        trackNumber: t.track ? String(t.track) : '',
        disc: t.disc ? String(t.disc) : '',
        composer: t.composer ?? '',
        comment: t.comment ?? '',
      }
    } else {
      fields.value = {
        ...emptyFields(),
        album: commonValue('album', t => t.album),
        albumArtist: commonValue('albumArtist', t => t.albumArtist),
        genre: commonValue('genre', t => t.genre),
        year: commonValue('year', t => (t.year ? String(t.year) : '')),
      }
      trackRows.value = props.tracks.map(t => ({
        id: t.id,
        path: t.path,
        title: t.title,
        track: t.track ? String(t.track) : '',
      }))
      initialRows.value = Object.fromEntries(
        trackRows.value.map(r => [r.id, { title: r.title, track: r.track }]),
      )
    }
    initial.value = { ...fields.value }
    newCoverPath.value = null
  },
  { immediate: true },
)

const coverPreviewUrl = computed(() => {
  // Must go through getMediaUrl — hand-concatenating skips the host prefix and
  // the percent-encoding, so paths with spaces or #?&=+ silently 404.
  if (newCoverPath.value) return window.api.getMediaUrl(newCoverPath.value)
  const cover = props.tracks[0]?.coverArt
  return cover ? window.api.getMediaUrl(cover) : ''
})

async function pickCover() {
  const path = await window.api.openImageDialog()
  if (path) newCoverPath.value = path
}

/** Shared fields the user actually changed (only these get written) */
const changedShared = computed(() => {
  const out: Record<string, string> = {}
  const f = fields.value
  const i = initial.value
  const keys: Array<[keyof Fields, string]> = props.mode === 'song'
    ? [['title', 'title'], ['artist', 'artist'], ['albumArtist', 'albumArtist'], ['album', 'album'],
       ['genre', 'genre'], ['year', 'year'], ['trackNumber', 'trackNumber'], ['disc', 'disc'],
       ['composer', 'composer'], ['comment', 'comment']]
    : [['album', 'album'], ['albumArtist', 'albumArtist'], ['genre', 'genre'], ['year', 'year']]
  for (const [key, tag] of keys) {
    if (f[key] !== i[key]) out[tag] = f[key]
  }
  return out
})

const changedRows = computed(() =>
  trackRows.value.filter(r => {
    const init = initialRows.value[r.id]
    return init && (r.title !== init.title || r.track !== init.track)
  }),
)

const hasChanges = computed(() =>
  Object.keys(changedShared.value).length > 0 ||
  newCoverPath.value !== null ||
  (props.mode === 'album' && changedRows.value.length > 0),
)

async function save() {
  if (!hasChanges.value || saving.value) return
  saving.value = true
  const updated: Track[] = []
  const failed: string[] = []

  // Per-track tag payloads: shared changes + cover, plus row edits in album mode
  const jobs = props.tracks
    .map(t => {
      const tags: Record<string, string> = { ...changedShared.value }
      if (props.mode === 'album') {
        const row = changedRows.value.find(r => r.id === t.id)
        if (row) {
          tags.title = row.title
          tags.trackNumber = row.track
        }
      }
      if (newCoverPath.value) tags.coverPath = newCoverPath.value
      return { track: t, tags }
    })
    .filter(j => Object.keys(j.tags).length > 0)

  saveProgress.value = { current: 0, total: jobs.length }
  try {
    for (const job of jobs) {
      saveProgress.value.current++
      try {
        const result = await window.api.writeTags(job.track.path, job.tags)
        updated.push(result)
      } catch (err: any) {
        console.error('Tag write failed:', job.track.path, err)
        failed.push(job.track.title)
      }
    }

    if (updated.length > 0) {
      library.updateLocalTracks(updated)
    }
    if (failed.length > 0) {
      toast.error(`Failed to update ${failed.length} file${failed.length > 1 ? 's' : ''}`)
    } else {
      toast.success(props.mode === 'album' ? 'Album metadata updated' : 'Metadata updated')
    }
    if (updated.length > 0) emit('saved', updated)
    if (failed.length === 0) emit('close')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.meta-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: rgb(255 255 255 / 0.06);
  border: 1px solid rgb(255 255 255 / 0.08);
  font-size: 0.875rem;
  color: white;
  outline: none;
  transition: border-color 0.15s ease;
}
.meta-input::placeholder { color: rgb(255 255 255 / 0.2); }
.meta-input:focus { border-color: rgb(var(--accent) / 0.4); }
/* Hide number input spinners for a cleaner look */
.meta-input[type='number']::-webkit-outer-spin-button,
.meta-input[type='number']::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.dialog-slide-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.dialog-slide-leave-active { transition: all 0.2s ease-in; }
.dialog-slide-enter-from, .dialog-slide-leave-to { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
.dialog-slide-enter-to, .dialog-slide-leave-from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
</style>
