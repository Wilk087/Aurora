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
                class="mt-0.5 accent-accent"
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

    <!-- ── Audio Output ───────────────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">Audio Output</h2>
      <div class="space-y-4">
        <div class="px-4 py-3 rounded-xl bg-white/[0.05]">
          <p class="text-sm text-white/80 mb-2">Output Device</p>
          <select
            v-model="selectedDevice"
            @change="onDeviceChange"
            class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/70 outline-none focus:border-accent/40 transition-colors"
          >
            <option value="">System Default</option>
            <option v-for="d in player.audioDevices" :key="d.deviceId" :value="d.deviceId">
              {{ d.label || `Device ${d.deviceId.slice(0, 8)}` }}
            </option>
          </select>
        </div>
        <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.05] opacity-50">
          <div>
            <p class="text-sm text-white/80">Exclusive Mode <span class="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-yellow-500/20 text-yellow-400/80">WIP</span></p>
            <p class="text-xs text-white/30 mt-0.5">Not available — Chromium audio backend does not support exclusive device access</p>
          </div>
          <button
            disabled
            class="relative w-11 h-6 rounded-full transition-colors duration-200 cursor-not-allowed bg-white/15"
          >
            <div
              class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 translate-x-0.5"
            />
          </button>
        </div>
      </div>
    </section>

    <!-- ── Playback ───────────────────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">Playback</h2>
      <div class="space-y-4">
        <!-- Waveform progress bar -->
        <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.05]">
          <div>
            <p class="text-sm text-white/80">Waveform Progress Bar</p>
            <p class="text-xs text-white/30 mt-0.5">Replace the standard progress bar with an audio waveform visualization</p>
          </div>
          <button
            @click="toggleWaveform"
            class="relative w-11 h-6 rounded-full transition-colors duration-200"
            :class="player.waveformEnabled ? 'bg-accent' : 'bg-white/15'"
          >
            <div
              class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              :class="player.waveformEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'"
            />
          </button>
        </div>

        <!-- Audio normalization -->
        <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.05]">
          <div>
            <p class="text-sm text-white/80">Audio Normalization</p>
            <p class="text-xs text-white/30 mt-0.5">Reduce volume differences between tracks using dynamic compression</p>
          </div>
          <button
            @click="toggleNormalization"
            class="relative w-11 h-6 rounded-full transition-colors duration-200"
            :class="player.normalization ? 'bg-accent' : 'bg-white/15'"
          >
            <div
              class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              :class="player.normalization ? 'translate-x-[22px]' : 'translate-x-0.5'"
            />
          </button>
        </div>

        <!-- Lyrics offset -->
        <div class="px-4 py-3 rounded-xl bg-white/[0.05]">
          <div class="flex items-center justify-between mb-2">
            <div>
              <p class="text-sm text-white/80">Lyrics Offset</p>
              <p class="text-xs text-white/30 mt-0.5">Adjust lyrics timing (positive = earlier, negative = later)</p>
            </div>
            <span class="text-sm text-white/60 tabular-nums w-16 text-right">{{ lyricsOffsetDisplay }}s</span>
          </div>
          <div class="flex items-center gap-3">
            <button @click="adjustLyricsOffset(-0.5)" class="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/60 flex items-center justify-center transition-colors text-sm font-bold">−</button>
            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              :value="player.lyricsOffset"
              @input="onLyricsOffsetInput"
              class="flex-1 accent-accent"
            />
            <button @click="adjustLyricsOffset(0.5)" class="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/60 flex items-center justify-center transition-colors text-sm font-bold">+</button>
            <button @click="resetLyricsOffset" class="text-xs text-white/30 hover:text-white/60 transition-colors">Reset</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Appearance ─────────────────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">Appearance</h2>
      <div class="space-y-4">
        <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.05]">
          <div>
            <p class="text-sm text-white/80">Adaptive Accent Color</p>
            <p class="text-xs text-white/30 mt-0.5">Auto-adjust the accent color based on the current album's artwork</p>
          </div>
          <button
            @click="toggleAdaptiveAccent"
            class="relative w-11 h-6 rounded-full transition-colors duration-200"
            :class="player.adaptiveAccent ? 'bg-accent' : 'bg-white/15'"
          >
            <div
              class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              :class="player.adaptiveAccent ? 'translate-x-[22px]' : 'translate-x-0.5'"
            />
          </button>
        </div>
        <!-- iOS-style sliders -->
        <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.05]">
          <div>
            <p class="text-sm text-white/80">iOS-Style Sliders</p>
            <p class="text-xs text-white/30 mt-0.5">Replace standard sliders with pill-shaped iOS-style controls</p>
          </div>
          <button
            @click="toggleIOSSliders"
            class="relative w-11 h-6 rounded-full transition-colors duration-200"
            :class="player.iosSliders ? 'bg-accent' : 'bg-white/15'"
          >
            <div
              class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              :class="player.iosSliders ? 'translate-x-[22px]' : 'translate-x-0.5'"
            />
          </button>
        </div>      </div>
    </section>

    <!-- ── Behavior ───────────────────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">Behavior</h2>
      <div class="space-y-4">
        <!-- Auto-fullscreen toggle -->
        <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.05]">
          <div>
            <p class="text-sm text-white/80">Auto-Fullscreen on Idle <span class="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-yellow-500/20 text-yellow-400/80">WIP</span></p>
            <p class="text-xs text-white/30 mt-0.5">Automatically enter fullscreen mode when the mouse is idle during playback</p>
          </div>
          <button
            @click="toggleAutoFullscreen"
            class="relative w-11 h-6 rounded-full transition-colors duration-200"
            :class="player.autoFullscreen ? 'bg-accent' : 'bg-white/15'"
          >
            <div
              class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              :class="player.autoFullscreen ? 'translate-x-[22px]' : 'translate-x-0.5'"
            />
          </button>
        </div>
        <!-- Auto-fullscreen delay -->
        <div v-if="player.autoFullscreen" class="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.05]">
          <div>
            <p class="text-sm text-white/80">Idle Timeout</p>
            <p class="text-xs text-white/30 mt-0.5">Seconds of inactivity before entering fullscreen</p>
          </div>
          <div class="flex items-center gap-2">
            <button @click="adjustAutoFullscreenDelay(-5)" class="w-7 h-7 rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-white/15 flex items-center justify-center text-sm transition-colors">&minus;</button>
            <input
              type="number"
              :value="player.autoFullscreenDelay"
              @change="onAutoFullscreenDelayChange"
              min="5"
              max="300"
              step="5"
              class="w-16 text-center text-sm text-white bg-white/10 rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button @click="adjustAutoFullscreenDelay(5)" class="w-7 h-7 rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-white/15 flex items-center justify-center text-sm transition-colors">+</button>
            <span class="text-xs text-white/30 ml-1">sec</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Scrobbling ─────────────────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">
        Scrobbling
        <span class="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-500/20 text-yellow-400 uppercase tracking-wider align-middle">WIP</span>
      </h2>
      <div class="space-y-4">
        <!-- Enable scrobbling -->
        <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.05]">
          <div>
            <p class="text-sm text-white/80">Enable Scrobbling</p>
            <p class="text-xs text-white/30 mt-0.5">Send your listening activity to Last.fm and/or ListenBrainz</p>
          </div>
          <button
            @click="toggleScrobbling"
            class="relative w-11 h-6 rounded-full transition-colors duration-200"
            :class="scrobblingEnabled ? 'bg-accent' : 'bg-white/15'"
          >
            <div
              class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              :class="scrobblingEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'"
            />
          </button>
        </div>

        <!-- Last.fm config -->
        <div v-if="scrobblingEnabled" class="px-4 py-3 rounded-xl bg-white/[0.05]">
          <p class="text-sm text-white/80 mb-1">Last.fm</p>
          <p class="text-xs text-white/30 mb-3">Create an API account at <span class="text-accent/70">last.fm/api/account/create</span></p>
          <div class="space-y-2">
            <input
              v-model="lastfmApiKey"
              type="text"
              placeholder="API Key"
              class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
            />
            <input
              v-model="lastfmApiSecret"
              type="password"
              placeholder="API Secret"
              class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
            />
            <input
              v-model="lastfmSessionKey"
              type="password"
              placeholder="Session Key"
              class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
            />
            <button
              @click="saveLastfm"
              class="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-sm font-medium text-white transition-colors"
            >
              Save Last.fm
            </button>
          </div>
        </div>

        <!-- ListenBrainz config -->
        <div v-if="scrobblingEnabled" class="px-4 py-3 rounded-xl bg-white/[0.05]">
          <p class="text-sm text-white/80 mb-1">ListenBrainz</p>
          <p class="text-xs text-white/30 mb-3">Get your token at <span class="text-accent/70">listenbrainz.org/settings</span></p>
          <div class="flex items-center gap-2">
            <input
              v-model="listenbrainzToken"
              type="password"
              placeholder="User Token"
              class="flex-1 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
            />
            <button
              @click="saveListenbrainz"
              class="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-sm font-medium text-white transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Navidrome / Subsonic ─────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">
        Navidrome / Subsonic
        <span class="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-500/20 text-yellow-400 uppercase tracking-wider align-middle">WIP</span>
      </h2>

      <div class="px-4 py-4 rounded-xl bg-white/[0.05] space-y-4">
        <p class="text-xs text-white/40">Connect to a Navidrome or Subsonic-compatible server to stream your remote library alongside local files.</p>

        <div class="space-y-2">
          <input
            v-model="subsonicUrl"
            type="url"
            placeholder="Server URL (e.g. https://navidrome.example.com)"
            class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
          />
          <div class="grid grid-cols-2 gap-2">
            <input
              v-model="subsonicUsername"
              type="text"
              placeholder="Username"
              class="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
            />
            <input
              v-model="subsonicPassword"
              type="password"
              placeholder="Password"
              class="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
            />
          </div>
        </div>

        <!-- Legacy auth toggle -->
        <div class="flex items-center justify-between">
          <div>
            <span class="text-sm text-white/70">Legacy Authentication</span>
            <p class="text-xs text-white/30">Use password-based auth instead of token (for older servers)</p>
          </div>
          <button
            @click="subsonicLegacyAuth = !subsonicLegacyAuth"
            class="relative w-11 h-6 rounded-full transition-colors duration-200"
            :class="subsonicLegacyAuth ? 'bg-accent' : 'bg-white/15'"
          >
            <div
              class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              :class="subsonicLegacyAuth ? 'translate-x-[22px]' : 'translate-x-0.5'"
            />
          </button>
        </div>

        <!-- Action buttons -->
        <div class="flex items-center gap-2">
          <button
            @click="testSubsonic"
            :disabled="subsonicTesting || !subsonicUrl || !subsonicUsername || !subsonicPassword"
            class="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
          >
            {{ subsonicTesting ? 'Testing...' : 'Test Connection' }}
          </button>
          <button
            @click="syncSubsonicLibrary"
            :disabled="subsonicSyncing || !subsonicConnected"
            class="px-4 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white/70 hover:text-white/90 transition-all"
          >
            {{ subsonicSyncing ? 'Syncing...' : 'Sync Library' }}
          </button>
        </div>

        <!-- Connection status -->
        <div v-if="subsonicConnected" class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-green-400" />
          <span class="text-xs text-green-400/80">Connected</span>
        </div>
      </div>
    </section>

    <!-- ── Cache Management ─────────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">Cache</h2>

      <div class="px-4 py-4 rounded-xl bg-white/[0.05] space-y-3">
        <p class="text-xs text-white/40 mb-3">Clear cached data to free up disk space or resolve display issues. Library data will be rebuilt on next scan.</p>

        <div class="flex items-center justify-between">
          <div>
            <span class="text-sm text-white/70">Cover Art Cache</span>
            <p class="text-xs text-white/30">Extracted album artwork thumbnails</p>
          </div>
          <button
            @click="clearCache('covers')"
            :disabled="cacheClearing.covers"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white/60 hover:text-white/80 transition-all disabled:opacity-40"
          >
            {{ cacheClearing.covers ? 'Clearing...' : 'Clear' }}
          </button>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <span class="text-sm text-white/70">Artist Info Cache</span>
            <p class="text-xs text-white/30">Biographies, images, tags from APIs</p>
          </div>
          <button
            @click="clearCache('artist')"
            :disabled="cacheClearing.artist"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white/60 hover:text-white/80 transition-all disabled:opacity-40"
          >
            {{ cacheClearing.artist ? 'Clearing...' : 'Clear' }}
          </button>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <span class="text-sm text-white/70">Waveform Cache</span>
            <p class="text-xs text-white/30">Pre-generated audio waveform data</p>
          </div>
          <button
            @click="clearCache('waveform')"
            :disabled="cacheClearing.waveform"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white/60 hover:text-white/80 transition-all disabled:opacity-40"
          >
            {{ cacheClearing.waveform ? 'Clearing...' : 'Clear' }}
          </button>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <span class="text-sm text-white/70">Library Index</span>
            <p class="text-xs text-white/30">Song metadata index — rescan folders after clearing</p>
          </div>
          <button
            @click="clearCache('library')"
            :disabled="cacheClearing.library"
            class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white/60 hover:text-white/80 transition-all disabled:opacity-40"
          >
            {{ cacheClearing.library ? 'Clearing...' : 'Clear' }}
          </button>
        </div>

        <div class="border-t border-white/[0.06] pt-3">
          <button
            @click="clearAllCaches"
            :disabled="Object.values(cacheClearing).some(Boolean)"
            class="px-5 py-2 rounded-full text-sm font-medium bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all disabled:opacity-40"
          >
            Clear All Caches
          </button>
        </div>
      </div>
    </section>

    <!-- ── Export / Import ──────────────────────────────────────── -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">
        Export / Import
        <span class="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-500/20 text-yellow-400 uppercase tracking-wider align-middle">WIP</span>
      </h2>

      <div class="px-4 py-4 rounded-xl bg-white/[0.05] space-y-4">
        <p class="text-xs text-white/40">Backup your settings, favorites, and playlists. Auto-exports run in the background whenever data changes.</p>

        <!-- Auto-export toggle -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-white/80">Auto-Export on Change</p>
            <p class="text-xs text-white/30 mt-0.5">Automatically save a backup when settings, favorites, or playlists change</p>
          </div>
          <button
            @click="toggleAutoExport"
            class="relative w-11 h-6 rounded-full transition-colors duration-200"
            :class="autoExport ? 'bg-accent' : 'bg-white/15'"
          >
            <div
              class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              :class="autoExport ? 'translate-x-[22px]' : 'translate-x-0.5'"
            />
          </button>
        </div>

        <!-- Export path -->
        <div>
          <p class="text-sm text-white/70 mb-2">Export Location</p>
          <div class="flex items-center gap-2">
            <div class="flex-1 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/50 truncate select-text">
              {{ exportPath || exportDefaultPath || 'Default (app data)' }}
            </div>
            <button
              @click="openExportFolder"
              class="p-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white/40 hover:text-white/70 transition-all shrink-0"
              title="Open folder"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </button>
            <button
              @click="chooseExportPath"
              class="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-sm font-medium text-white/60 hover:text-white/80 transition-all shrink-0"
            >
              Browse
            </button>
            <button
              v-if="exportPath"
              @click="resetExportPath"
              class="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-xs text-white/40 hover:text-white/60 transition-all shrink-0"
            >
              Reset
            </button>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex items-center gap-2 pt-1">
          <button
            @click="runExport"
            :disabled="exporting"
            class="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 text-sm font-medium text-white transition-colors"
          >
            {{ exporting ? 'Exporting...' : 'Export Now' }}
          </button>
          <button
            @click="runImport"
            :disabled="importing"
            class="px-5 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-40 text-sm font-medium text-white/70 hover:text-white/90 transition-all"
          >
            {{ importing ? 'Importing...' : 'Import Backup' }}
          </button>
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
        <p class="text-xs text-white/30 mt-2">Version {{ appVersion }}</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { useToast } from '@/composables/useToast'

const library = useLibraryStore()
const player = usePlayerStore()
const toast = useToast()

const appVersion = __APP_VERSION__

const discordEnabled = ref(true)
const discordFormat = ref('title-artist')
const discordClientId = ref('')

// Audio output
const selectedDevice = ref('')
const exclusiveMode = ref(false)

// Scrobbling
const scrobblingEnabled = ref(false)
const lastfmApiKey = ref('')
const lastfmApiSecret = ref('')
const lastfmSessionKey = ref('')
const listenbrainzToken = ref('')

// Subsonic / Navidrome
const subsonicUrl = ref('')
const subsonicUsername = ref('')
const subsonicPassword = ref('')
const subsonicLegacyAuth = ref(false)
const subsonicTesting = ref(false)
const subsonicSyncing = ref(false)
const subsonicConnected = ref(false)

// Export / Import
const autoExport = ref(true)
const exportPath = ref('')
const exportDefaultPath = ref('')
const exporting = ref(false)
const importing = ref(false)

// Lyrics offset display
const lyricsOffsetDisplay = computed(() => {
  const v = player.lyricsOffset
  return v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1)
})

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

  // Load audio / playback settings
  selectedDevice.value = settings.outputDeviceId || ''
  exclusiveMode.value = settings.exclusiveMode === true
  scrobblingEnabled.value = settings.scrobblingEnabled === true
  lastfmApiKey.value = settings.lastfmApiKey || ''
  lastfmApiSecret.value = settings.lastfmApiSecret || ''
  lastfmSessionKey.value = settings.lastfmSessionKey || ''
  listenbrainzToken.value = settings.listenbrainzToken || ''

  // Load Subsonic settings
  subsonicUrl.value = settings.subsonicUrl || ''
  subsonicUsername.value = settings.subsonicUsername || ''
  subsonicPassword.value = settings.subsonicPassword || ''
  subsonicLegacyAuth.value = settings.subsonicLegacyAuth === true
  subsonicConnected.value = settings.subsonicConnected === true

  // Load export settings
  autoExport.value = settings.autoExport !== false // default true
  exportPath.value = settings.exportPath || ''
  exportDefaultPath.value = await window.api.exportGetDefaultPath()

  // Enumerate audio devices
  player.enumerateOutputDevices()
})

async function toggleDiscord() {
  discordEnabled.value = !discordEnabled.value
  const settings = await window.api.getSettings()
  settings.discordRPC = discordEnabled.value
  await window.api.saveSettings(settings)
  await window.api.toggleDiscordRPC(discordEnabled.value, discordClientId.value || undefined)
  player.setDiscordEnabled(discordEnabled.value)
  toast.success(`Discord RPC ${discordEnabled.value ? 'enabled' : 'disabled'}`)
}

async function onFormatChange() {
  const settings = await window.api.getSettings()
  settings.discordRPCFormat = discordFormat.value
  await window.api.saveSettings(settings)
  player.setDiscordFormat(discordFormat.value)
  toast.success('Discord format updated')
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
  toast.success('Discord Client ID saved')
}

async function removeFolder(folder: string) {
  await library.removeFolder(folder)
  toast.success('Folder removed')
}

// ── Audio Output ──────────────────────────
async function onDeviceChange() {
  await player.setOutputDevice(selectedDevice.value)
  toast.success('Audio output device changed')
}

async function toggleExclusive() {
  exclusiveMode.value = !exclusiveMode.value
  const settings = await window.api.getSettings()
  settings.exclusiveMode = exclusiveMode.value
  await window.api.saveSettings(settings)
}

// ── Playback ──────────────────────────────
async function toggleWaveform() {
  player.setWaveformEnabled(!player.waveformEnabled)
  toast.success(`Waveform ${player.waveformEnabled ? 'enabled' : 'disabled'}`)
}

function toggleNormalization() {
  player.setNormalization(!player.normalization)
  toast.success(`Normalization ${player.normalization ? 'enabled' : 'disabled'} \u2014 restart app to apply`)
}

function onLyricsOffsetInput(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  player.setLyricsOffset(val)
}

function adjustLyricsOffset(delta: number) {
  player.setLyricsOffset(Math.max(-5, Math.min(5, player.lyricsOffset + delta)))
}

function resetLyricsOffset() {
  player.setLyricsOffset(0)
}

// ── Appearance ────────────────────────────
async function toggleAdaptiveAccent() {
  player.setAdaptiveAccent(!player.adaptiveAccent)
  toast.success(`Adaptive accent ${player.adaptiveAccent ? 'enabled' : 'disabled'}`)
}

function toggleIOSSliders() {
  player.setIOSSliders(!player.iosSliders)
  toast.success(`iOS-style sliders ${player.iosSliders ? 'enabled' : 'disabled'}`)
}

// ── Behavior ──────────────────────────────
function toggleAutoFullscreen() {
  player.setAutoFullscreen(!player.autoFullscreen)
  toast.success(`Auto-fullscreen ${player.autoFullscreen ? 'enabled' : 'disabled'}`)
}

function onAutoFullscreenDelayChange(e: Event) {
  const val = Math.max(5, Math.min(300, parseInt((e.target as HTMLInputElement).value) || 30))
  player.setAutoFullscreenDelay(val)
}

function adjustAutoFullscreenDelay(delta: number) {
  const newVal = Math.max(5, Math.min(300, player.autoFullscreenDelay + delta))
  player.setAutoFullscreenDelay(newVal)
}

// ── Scrobbling ────────────────────────────
async function toggleScrobbling() {
  scrobblingEnabled.value = !scrobblingEnabled.value
  player.setScrobblingEnabled(scrobblingEnabled.value)
  toast.success(`Scrobbling ${scrobblingEnabled.value ? 'enabled' : 'disabled'}`)
}

async function saveLastfm() {
  const settings = await window.api.getSettings()
  settings.lastfmApiKey = lastfmApiKey.value
  settings.lastfmApiSecret = lastfmApiSecret.value
  settings.lastfmSessionKey = lastfmSessionKey.value
  await window.api.saveSettings(settings)
  toast.success('Last.fm settings saved')
}

async function saveListenbrainz() {
  const settings = await window.api.getSettings()
  settings.listenbrainzToken = listenbrainzToken.value
  await window.api.saveSettings(settings)
  toast.success('ListenBrainz token saved')
}

// ── Subsonic / Navidrome ──────────────────
async function testSubsonic() {
  subsonicTesting.value = true
  try {
    const ok = await window.api.subsonicTest({
      url: subsonicUrl.value.replace(/\/+$/, ''),
      username: subsonicUsername.value,
      password: subsonicPassword.value,
      useLegacyAuth: subsonicLegacyAuth.value,
    })
    if (ok) {
      subsonicConnected.value = true
      const settings = await window.api.getSettings()
      settings.subsonicUrl = subsonicUrl.value.replace(/\/+$/, '')
      settings.subsonicUsername = subsonicUsername.value
      settings.subsonicPassword = subsonicPassword.value
      settings.subsonicLegacyAuth = subsonicLegacyAuth.value
      settings.subsonicConnected = true
      await window.api.saveSettings(settings)
      toast.success('Connected to server')
    } else {
      subsonicConnected.value = false
      toast.error('Connection failed — check credentials')
    }
  } catch (e: any) {
    subsonicConnected.value = false
    toast.error(`Connection error: ${e.message || e}`)
  } finally {
    subsonicTesting.value = false
  }
}

async function syncSubsonicLibrary() {
  subsonicSyncing.value = true
  try {
    const tracks = await window.api.subsonicFetchLibrary()
    library.mergeSubsonicTracks(tracks)
    toast.success(`Synced ${tracks.length} tracks from server`)
  } catch (e: any) {
    toast.error(`Sync failed: ${e.message || e}`)
  } finally {
    subsonicSyncing.value = false
  }
}

// ── Export / Import ───────────────────────
async function toggleAutoExport() {
  autoExport.value = !autoExport.value
  const settings = await window.api.getSettings()
  settings.autoExport = autoExport.value
  await window.api.saveSettings(settings)
  toast.success(`Auto-export ${autoExport.value ? 'enabled' : 'disabled'}`)
}

async function chooseExportPath() {
  const dir = await window.api.exportChooseDir()
  if (!dir) return
  exportPath.value = dir
  const settings = await window.api.getSettings()
  settings.exportPath = dir
  await window.api.saveSettings(settings)
  toast.success('Export location updated')
}

async function resetExportPath() {
  exportPath.value = ''
  const settings = await window.api.getSettings()
  delete settings.exportPath
  await window.api.saveSettings(settings)
  toast.success('Export location reset to default')
}

async function openExportFolder() {
  const dir = exportPath.value || exportDefaultPath.value
  if (dir) {
    await window.api.openPath(dir)
  }
}

async function runExport() {
  exporting.value = true
  try {
    const filePath = await window.api.exportRun(exportPath.value || undefined)
    toast.success(`Backup saved to ${filePath.split('/').pop()}`)
  } catch (e: any) {
    toast.error(`Export failed: ${e.message || e}`)
  } finally {
    exporting.value = false
  }
}

async function runImport() {
  importing.value = true
  try {
    const result = await window.api.exportImport()
    if (!result) { importing.value = false; return }
    const parts: string[] = []
    if (result.settings) parts.push('settings')
    if (result.favorites > 0) parts.push(`${result.favorites} favorites`)
    if (result.playlists > 0) parts.push(`${result.playlists} playlists`)
    toast.success(`Imported: ${parts.join(', ')}`)
    // Reload everything
    await library.loadLibrary()
    const settings = await window.api.getSettings()
    autoExport.value = settings.autoExport !== false
    exportPath.value = settings.exportPath || ''
  } catch (e: any) {
    toast.error(`Import failed: ${e.message || e}`)
  } finally {
    importing.value = false
  }
}

// ── Cache Management ──────────────────────
const cacheClearing = ref<Record<string, boolean>>({
  library: false,
  covers: false,
  artist: false,
  waveform: false,
})

const cacheLabels: Record<string, string> = {
  library: 'Library index',
  covers: 'Cover art',
  artist: 'Artist info',
  waveform: 'Waveform',
}

async function clearCache(target: string) {
  cacheClearing.value[target] = true
  try {
    await window.api.resetCache([target])
    if (target === 'library') {
      await library.loadLibrary()
    }
    toast.success(`${cacheLabels[target] || target} cache cleared`)
  } catch {
    toast.error(`Failed to clear ${cacheLabels[target] || target} cache`)
  } finally {
    cacheClearing.value[target] = false
  }
}

async function clearAllCaches() {
  const targets = ['library', 'covers', 'artist', 'waveform']
  for (const t of targets) cacheClearing.value[t] = true
  try {
    await window.api.resetCache(targets)
    await library.loadLibrary()
    toast.success('All caches cleared')
  } catch {
    toast.error('Failed to clear caches')
  } finally {
    for (const t of targets) cacheClearing.value[t] = false
  }
}
</script>
