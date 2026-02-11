<template>
  <div class="settings-view p-6 max-w-2xl">
    <h1 class="text-3xl font-bold text-white mb-8">Settings</h1>

    <!-- ── Music Folders ──────────────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">Music Folders</h2>

      <div class="space-y-2 mb-4">
        <div
          v-for="folder in library.folders"
          :key="folder"
          class="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.05] group"
        >
          <div class="flex items-center gap-3 min-w-0">
            <svg
              class="w-5 h-5 text-white/30 shrink-0"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
              />
            </svg>
            <span class="text-sm text-white/70 truncate select-text">{{ folder }}</span>
          </div>

          <button
            @click="removeFolder(folder)"
            class="text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          v-if="library.folders.length === 0"
          class="px-4 py-6 rounded-xl bg-white/[0.03] text-center"
        >
          <p class="text-sm text-white/30">No folders added yet</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="library.addFolder()"
          :disabled="library.isScanning"
          class="px-5 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-sm font-medium text-white transition-colors"
        >
          Add Folder
        </button>
        <button
          v-if="library.folders.length > 0"
          @click="library.rescanAll()"
          :disabled="library.isScanning"
          class="px-5 py-2 bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-sm font-medium text-white/80 transition-colors"
        >
          Rescan All
        </button>
      </div>

      <!-- Scan progress -->
      <div v-if="library.isScanning" class="mt-4 flex items-center gap-3">
        <div
          class="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin"
        />
        <span class="text-sm text-white/50">
          Scanning {{ library.scanProgress.current }}/{{ library.scanProgress.total }} files...
        </span>
      </div>
    </section>

    <!-- ── Library stats ──────────────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">Library</h2>
      <div class="grid grid-cols-3 gap-4">
        <div class="px-4 py-3 rounded-xl bg-white/[0.05]">
          <p class="text-2xl font-bold text-white">{{ library.tracks.length }}</p>
          <p class="text-xs text-white/40">Songs</p>
        </div>
        <div class="px-4 py-3 rounded-xl bg-white/[0.05]">
          <p class="text-2xl font-bold text-white">{{ library.albums.length }}</p>
          <p class="text-xs text-white/40">Albums</p>
        </div>
        <div class="px-4 py-3 rounded-xl bg-white/[0.05]">
          <p class="text-2xl font-bold text-white">{{ library.artists.length }}</p>
          <p class="text-xs text-white/40">Artists</p>
        </div>
      </div>
    </section>

    <!-- ── Discord Rich Presence ──────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">Discord Rich Presence</h2>

      <div class="space-y-4">
        <!-- Enable/Disable -->
        <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.05]">
          <div>
            <p class="text-sm text-white/80">Show activity in Discord</p>
            <p class="text-xs text-white/30 mt-0.5">Display what you're listening to on your Discord profile</p>
          </div>
          <button
            @click="toggleDiscord"
            class="relative w-11 h-6 rounded-full transition-colors duration-200"
            :class="discordEnabled ? 'bg-accent' : 'bg-white/15'"
          >
            <div
              class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              :class="discordEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'"
            />
          </button>
        </div>

        <!-- Display Format -->
        <div v-if="discordEnabled" class="px-4 py-3 rounded-xl bg-white/[0.05]">
          <p class="text-sm text-white/80 mb-3">Display Format</p>
          <div class="space-y-2">
            <label
              v-for="option in rpcFormatOptions"
              :key="option.value"
              class="flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
              :class="discordFormat === option.value ? 'bg-white/[0.06] border border-accent/30' : 'hover:bg-white/[0.03] border border-transparent'"
            >
              <input
                type="radio"
                name="rpc-format"
                :value="option.value"
                v-model="discordFormat"
                @change="onFormatChange"
                class="mt-0.5 accent-[var(--accent)]"
              />
              <div class="min-w-0">
                <p class="text-sm text-white/80">{{ option.label }}</p>
                <p class="text-xs text-white/30 mt-0.5">{{ option.preview }}</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Client ID -->
        <div v-if="discordEnabled" class="px-4 py-3 rounded-xl bg-white/[0.05]">
          <p class="text-sm text-white/80 mb-1">Discord Application ID</p>
          <p class="text-xs text-white/30 mb-3">Create an app at <span class="text-accent/70 select-text">discord.com/developers/applications</span> to customize the name shown in Discord. The app name becomes "Playing <strong>YourAppName</strong>".</p>
          <div class="flex items-center gap-2">
            <input
              v-model="discordClientId"
              type="text"
              placeholder="e.g. 1234567890123456789"
              class="flex-1 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors select-text"
            />
            <button
              @click="saveClientId"
              class="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-sm font-medium text-white transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── About ──────────────────────────────────────────────────── -->
    <section>
      <h2 class="text-lg font-semibold text-white mb-4">About</h2>
      <div class="px-4 py-4 rounded-xl bg-white/[0.05]">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-3 h-3 rounded-full bg-accent" />
          <span class="text-sm font-semibold text-white">Aurora Player</span>
        </div>
        <p class="text-xs text-white/40 leading-relaxed">
          A beautiful local music player for Linux. Supports MP3, FLAC, OGG, WAV, M4A and more.
          Place .lrc files alongside your music for synced lyrics.
        </p>
        <p class="text-xs text-white/30 mt-2">Version 1.0.0</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'

const library = useLibraryStore()
const player = usePlayerStore()

const discordEnabled = ref(true)
const discordFormat = ref('title-artist')
const discordClientId = ref('')

const rpcFormatOptions = [
  {
    value: 'title-artist',
    label: 'Song Title — by Artist',
    preview: 'e.g. "Bohemian Rhapsody" · by Queen',
  },
  {
    value: 'artist-title',
    label: 'Artist — Song Title',
    preview: 'e.g. "Queen" · Bohemian Rhapsody',
  },
  {
    value: 'title-album',
    label: 'Song Title — on Album',
    preview: 'e.g. "Bohemian Rhapsody" · on A Night at the Opera',
  },
  {
    value: 'full',
    label: 'Full — Title by Artist + Album',
    preview: 'e.g. "Bohemian Rhapsody by Queen" · A Night at the Opera',
  },
  {
    value: 'minimal',
    label: 'Minimal — Song Title only',
    preview: 'e.g. "Bohemian Rhapsody"',
  },
]

onMounted(async () => {
  const settings = await window.api.getSettings()
  discordEnabled.value = settings.discordRPC !== false
  discordFormat.value = settings.discordRPCFormat || 'title-artist'
  discordClientId.value = settings.discordClientId || ''
})

async function toggleDiscord() {
  discordEnabled.value = !discordEnabled.value
  const settings = await window.api.getSettings()
  settings.discordRPC = discordEnabled.value
  await window.api.saveSettings(settings)
  await window.api.toggleDiscordRPC(discordEnabled.value, discordClientId.value || undefined)
  player.setDiscordEnabled(discordEnabled.value)
}

async function onFormatChange() {
  const settings = await window.api.getSettings()
  settings.discordRPCFormat = discordFormat.value
  await window.api.saveSettings(settings)
  player.setDiscordFormat(discordFormat.value)
}

async function saveClientId() {
  const settings = await window.api.getSettings()
  settings.discordClientId = discordClientId.value || undefined
  await window.api.saveSettings(settings)
  // Reconnect with new client ID
  if (discordEnabled.value) {
    await window.api.toggleDiscordRPC(false)
    await window.api.toggleDiscordRPC(true, discordClientId.value || undefined)
  }
}

async function removeFolder(folder: string) {
  await library.removeFolder(folder)
}
</script>
