<template>
  <div
    v-if="player.currentTrack"
    class="fullscreen-view immersive-scope fixed inset-0 z-[100] select-none"
    :class="{ 'cursor-none': idle }"
    @mousemove="onMouseActivity"
    @mousedown="onMouseActivity"
    @dblclick.self="exitFullscreen"
  >
    <!-- ── Fluid gradient background from cover colors ─────────── -->
    <div class="absolute inset-0 bg-black transition-colors duration-1000">
      <!-- Static gradient background -->
      <div
        v-if="!effectiveAnimated"
        class="absolute inset-0 transition-all duration-[2s] ease-out"
        :style="bgStyle"
      />
      <!-- Animated background layer -->
      <div v-if="effectiveAnimated" class="absolute inset-0 overflow-hidden" :class="[`anim-${immersiveStyle}`]">
        <!-- Lava Lamp: dominant fill + drifting accent blobs -->
        <template v-if="animatedStyle === 'lava-lamp'">
          <div class="absolute inset-0 transition-[background] duration-[2s] ease-out" :style="{ background: brightColors.c1 }" />
          <div class="animated-blob blob-a1" :style="{ background: brightColors.c2, boxShadow: `0 0 80px 40px ${brightColors.c2}` }" />
          <div class="animated-blob blob-a2" :style="{ background: brightColors.c2, boxShadow: `0 0 60px 30px ${brightColors.c2}` }" />
          <div class="animated-blob blob-b1" :style="{ background: brightColors.c3, boxShadow: `0 0 80px 40px ${brightColors.c3}` }" />
          <div class="animated-blob blob-b2" :style="{ background: brightColors.c3, boxShadow: `0 0 60px 30px ${brightColors.c3}` }" />
          <div class="animated-blob blob-c1" :style="{ background: brightColors.c4, boxShadow: `0 0 80px 40px ${brightColors.c4}` }" />
          <div class="animated-blob blob-c2" :style="{ background: brightColors.c4, boxShadow: `0 0 60px 30px ${brightColors.c4}` }" />
        </template>

        <!-- Sonar Ripple: expanding halos from cover center -->
        <template v-else-if="animatedStyle === 'sonar-ripple'">
          <div class="absolute inset-0 transition-[background] duration-[2s] ease-out" :style="{ background: darkDominant }" />
          <canvas ref="sonarCanvas" class="absolute inset-0 w-full h-full" />
        </template>

        <!-- Cinematic Grain: film grain + orbiting spotlights -->
        <template v-else-if="animatedStyle === 'cinematic-grain'">
          <div class="absolute inset-0 transition-[background] duration-[2s] ease-out" :style="{ background: darkDominant }" />
          <div class="spotlight spotlight-1" :style="{ background: `radial-gradient(ellipse at center, ${brightColors.c2}bb 0%, ${brightColors.c2}44 40%, transparent 70%)` }" />
          <div class="spotlight spotlight-2" :style="{ background: `radial-gradient(ellipse at center, ${brightColors.c3}bb 0%, ${brightColors.c3}44 40%, transparent 70%)` }" />
          <canvas ref="grainCanvas" class="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none" style="mix-blend-mode: overlay;" />
        </template>
      </div>
      <div v-if="!effectiveVibrant" class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 /%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 /%3E%3C/svg%3E')" />
    </div>

    <!-- ── Two-column layout ──────────────────────────────────── -->
    <div class="relative z-10 h-full flex flex-col">
      <!-- Top bar: window controls (fade with idle) -->
      <div
        class="absolute top-0 right-0 flex items-center gap-2 p-6 z-20 fs-fade"
        :class="idle ? 'fs-idle' : ''"
      >
        <!-- Immersive Player tutorial -->
        <TutorialPopup
          tutorial-key="immersive-player"
          title="Immersive Player"
          description="A full-screen experience built around your music and artwork."
          :items="[
            { label: 'Layout styles', description: 'Switch between Default, Modern, and Artwork layouts via the settings panel.' },
            { label: 'Animated backgrounds', description: 'Choose from Lava Lamp, Sonar Ripple, or Cinematic Grain.' },
            { label: 'Vibrant mode', description: 'Blends translucent UI elements with the album colors.' },
            { label: 'Settings panel', description: 'Click the palette icon in the bottom bar to customise the view.' },
          ]"
          :hotkeys="[
            { keys: ['Esc'], description: 'Exit immersive player' },
            { keys: ['Space'], description: 'Play / pause' },
            { keys: ['←', '→'], description: 'Previous / next track' },
            { keys: ['↑', '↓'], description: 'Volume up / down' },
          ]"
        />
        <button
          @click="showQueue = !showQueue"
          class="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
          :class="showQueue ? 'bg-white/20 text-accent' : 'bg-white/10 hover:bg-white/20 text-white/60 hover:text-white'"
          title="Queue"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
        </button>
        <button
          @click="exitFullscreen"
          class="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
          title="Exit fullscreen"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
        </button>
      </div>

      <!-- Main content area: Default mode -->
      <div v-if="immersiveStyle === 'default'" class="flex-1 flex min-h-0">
        <!-- Left side: cover art + track info + waveform -->
        <div class="w-[45%] h-full flex flex-col items-center justify-center px-14 py-10 shrink-0">
          <!-- Album cover -->
          <div class="relative w-full transition-all duration-700 ease-out" :class="player.isPlaying ? 'max-w-[380px]' : 'max-w-[360px]'">
            <div class="aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/[0.06] transition-all duration-700 ease-out" :class="player.isPlaying ? 'scale-100' : 'scale-[0.97] opacity-90'">
              <!-- Animated cover video (HLS stream via hls.js) -->
              <video
                v-show="animatedCoverActive"
                ref="animatedVideoEl"
                class="w-full h-full object-cover absolute inset-0 z-10"
                autoplay loop muted playsinline
              />
              <img
                v-if="player.currentTrack.coverArt"
                :src="coverUrl"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full bg-white/[0.06] flex items-center justify-center">
                <svg class="w-32 h-32 text-white/10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Track info (always visible) -->
          <div class="mt-5 max-w-[380px] w-full">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h1 class="text-2xl font-extrabold text-white leading-tight line-clamp-2">
                  {{ player.currentTrack.title }}
                </h1>
                <p class="text-base text-white/50 mt-1.5 font-medium">
                  <ArtistLinks
                    :artist="player.currentTrack.artist"
                    :album-artist="player.currentTrack.albumArtist"
                    hover-class="hover:text-white/80"
                  />
                  <span v-if="player.currentTrack.album" class="text-white/25"> · </span>
                  <span
                    v-if="player.currentTrack.album"
                    class="text-white/25 hover:text-white/60 hover:underline underline-offset-2 cursor-pointer transition-colors"
                    @click="goToAlbum"
                  >{{ player.currentTrack.album }}</span>
                </p>
              </div>
              <!-- Plugin slot (right of track info) -->
              <div id="aurora-immersive-right-slot" class="flex items-center shrink-0 gap-2" />
            </div>
          </div>

          <!-- Progress / Waveform (always visible) -->
          <div class="mt-5 max-w-[380px] w-full">
            <div class="flex items-center gap-3">
              <span class="text-sm text-white/50 w-12 text-right tabular-nums font-mono">
                {{ formatTime(player.currentTime) }}
              </span>

              <!-- Waveform -->
              <div v-if="player.waveformEnabled && player.waveformData.length > 0" class="flex-1">
                <WaveformBar
                  :data="player.waveformData"
                  :progress="player.progress"
                  :duration="player.duration"
                  @seek="(p) => player.seekPercent(p)"
                />
              </div>

              <!-- Standard progress bar -->
              <div v-else-if="!player.iosSliders" class="flex-1 relative group h-2">
                <input
                  type="range" min="0" max="100" step="0.1"
                  :value="player.progress" @input="onProgressInput"
                  class="fs-progress w-full h-2 rounded-full cursor-pointer relative z-10 opacity-0"
                />
                <div class="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
                  <div class="w-full h-1.5 group-hover:h-2 rounded-full bg-white/15 transition-all overflow-hidden">
                    <div class="h-full rounded-full bg-white/80" :style="{ width: player.progress + '%' }" />
                  </div>
                </div>
              </div>

              <!-- iOS-style progress bar -->
              <IOSSlider
                v-else
                :value="player.progress" :min="0" :max="100" :step="0.1"
                size="lg" fill-color="bg-white/80" class="flex-1"
                @update="(v: number) => player.seekPercent(v)"
              />

              <span class="text-sm text-white/50 w-12 tabular-nums font-mono">
                {{ formatTime(player.duration) }}
              </span>
            </div>

            <!-- Transport controls (fade with idle) -->
            <div class="fs-fade mt-4" :class="idle ? 'fs-idle' : ''">
              <div class="flex items-center justify-center gap-5">
                <button
                  @click="player.toggleShuffle()"
                  class="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                  :class="player.isShuffle ? 'text-accent' : 'text-white/30 hover:text-white/60'"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                  </svg>
                </button>

                <button
                  @click="player.previous()"
                  class="w-11 h-11 flex items-center justify-center rounded-full text-white/60 hover:text-white transition-colors"
                >
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>

                <button
                  @click="player.togglePlay()"
                  class="w-14 h-14 flex items-center justify-center rounded-full bg-control text-control-fg hover:scale-105 active:scale-95 transition-transform shadow-xl"
                >
                  <svg v-if="player.isPlaying" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                  <svg v-else class="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>

                <button
                  @click="player.next()"
                  class="w-11 h-11 flex items-center justify-center rounded-full text-white/60 hover:text-white transition-colors"
                >
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>

                <button
                  @click="player.cycleRepeat()"
                  class="w-9 h-9 flex items-center justify-center rounded-full transition-colors relative"
                  :class="player.repeatMode !== 'off' ? 'text-accent' : 'text-white/30 hover:text-white/60'"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                  </svg>
                  <span v-if="player.repeatMode === 'one'" class="absolute -top-0.5 -right-0.5 text-[9px] font-bold text-accent">1</span>
                </button>
              </div>

              <!-- Volume slider (centered, slightly narrower than progress) -->
              <div class="flex items-center justify-center mt-3 px-8" @wheel.prevent="onVolumeWheel">
                <button
                  @click="player.toggleMute()"
                  class="w-5 h-5 mr-3 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors shrink-0"
                >
                  <svg v-if="player.isMuted || player.volume === 0" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                  <svg v-else-if="player.volume < 0.5" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                </button>

                <div class="flex-1 relative group" v-if="!player.iosSliders">
                  <input
                    type="range" min="0" max="1" step="0.01"
                    :value="player.volume" @input="onVolumeInput"
                    class="fs-volume w-full cursor-pointer relative z-10"
                  />
                  <div class="absolute top-1/2 left-0 -translate-y-1/2 h-[3px] rounded-full bg-white/15 w-full pointer-events-none" />
                  <div class="absolute top-1/2 left-0 -translate-y-1/2 h-[3px] rounded-full bg-white/70 pointer-events-none transition-all" :style="{ width: player.volume * 100 + '%' }" />
                </div>
                <IOSSlider v-else :value="player.volume" :min="0" :max="1" :step="0.01" class="flex-1" @update="(v: number) => player.setVolume(v)" />

                <button
                  @click="player.toggleMute()"
                  class="w-5 h-5 ml-3 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors shrink-0"
                >
                  <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right side: lyrics -->
        <div class="flex-1 h-full flex flex-col min-w-0">
          <div class="flex-1 overflow-hidden flex items-center justify-center">
            <FullscreenLyrics />
          </div>
        </div>
      </div>

      <!-- Main content area: Modern mode (full-height cover + ambient fade + lyrics) -->
      <div v-else-if="immersiveStyle === 'modern'" class="flex-1 flex min-h-0">
        <!-- Blurred ambient backdrop (extends cover's colors into the transition zone) -->
        <div
          class="absolute inset-0 z-[1] overflow-hidden pointer-events-none transition-opacity duration-1000"
          :class="effectiveAnimated ? 'opacity-40' : 'opacity-100'"
        >
          <img
            v-if="player.currentTrack?.coverArt"
            :src="coverUrl"
            class="absolute top-0 left-0 w-full h-full object-cover modern-ambient-blur"
          />
        </div>

        <!-- Left: full-height cover with alpha mask -->
        <div class="relative w-[58%] h-full shrink-0 z-[2]">
          <div class="absolute inset-0 modern-cover-masked">
            <video
              v-show="animatedCoverActive"
              ref="animatedVideoEl"
              class="w-full h-full object-cover absolute inset-0 z-10"
              autoplay loop muted playsinline
            />
            <img
              v-if="player.currentTrack?.coverArt"
              :src="coverUrl"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full bg-white/[0.06] flex items-center justify-center">
              <svg class="w-40 h-40 text-white/10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          </div>
          <!-- Darkening vignette at transition zone -->
          <div class="modern-vignette" />
        </div>

        <!-- Right: lyrics -->
        <div class="flex-1 h-full flex flex-col min-w-0 z-[3]">
          <div class="flex-1 overflow-hidden flex items-center justify-center">
            <FullscreenLyrics />
          </div>
        </div>

        <!-- Floating controls box -->
        <div
          v-show="!hideControls"
          class="modern-controls-box"
          :class="{ 'modern-controls-collapsed': idle && !modernControlsHover }"
          @mouseenter="modernControlsHover = true"
          @mouseleave="modernControlsHover = false"
        >
          <!-- Header zone: overlaid mini/full info -->
          <div class="modern-header-zone">
            <!-- Full track info -->
            <div class="modern-header-full">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h2 class="text-lg font-bold text-white leading-tight line-clamp-1">
                    {{ player.currentTrack?.title }}
                  </h2>
                  <p class="text-sm text-white/50 mt-0.5 font-medium line-clamp-1">
                    <ArtistLinks
                      :artist="player.currentTrack?.artist ?? ''"
                      :album-artist="player.currentTrack?.albumArtist"
                      hover-class="hover:text-white/80"
                    />
                    <span v-if="player.currentTrack?.album" class="text-white/25"> · </span>
                    <span
                      v-if="player.currentTrack?.album"
                      class="text-white/25 hover:text-white/60 hover:underline underline-offset-2 cursor-pointer transition-colors"
                      @click="goToAlbum"
                    >{{ player.currentTrack?.album }}</span>
                  </p>
                </div>
                <!-- Plugin slot (modern controls, right of track info) -->
                <div id="aurora-immersive-modern-right-slot" class="flex items-center shrink-0 gap-2" />
              </div>
            </div>
            <!-- Mini info -->
            <div class="modern-header-mini">
              <h2 class="text-base font-semibold text-white leading-tight line-clamp-1">
                {{ player.currentTrack?.title }}
              </h2>
              <p class="text-sm text-white/40 mt-0.5 font-medium line-clamp-1">
                <ArtistLinks
                  :artist="player.currentTrack?.artist ?? ''"
                  :album-artist="player.currentTrack?.albumArtist"
                  hover-class="hover:text-white/60"
                />
                <span v-if="player.currentTrack?.album" class="text-white/20"> · </span>
                <span
                  v-if="player.currentTrack?.album"
                  class="text-white/20 hover:text-white/50 hover:underline underline-offset-2 cursor-pointer transition-colors"
                  @click="goToAlbum"
                >{{ player.currentTrack?.album }}</span>
              </p>
            </div>
          </div>

          <!-- Progress / Waveform (always visible) -->
          <div class="mt-2 w-full">
            <div class="flex items-center gap-3">
              <span class="text-xs text-white/50 w-10 text-right tabular-nums font-mono">
                {{ formatTime(player.currentTime) }}
              </span>

              <div v-if="player.waveformEnabled && player.waveformData.length > 0" class="flex-1">
                <WaveformBar
                  :data="player.waveformData"
                  :progress="player.progress"
                  :duration="player.duration"
                  @seek="(p) => player.seekPercent(p)"
                />
              </div>

              <div v-else-if="!player.iosSliders" class="flex-1 relative group h-2">
                <input
                  type="range" min="0" max="100" step="0.1"
                  :value="player.progress" @input="onProgressInput"
                  class="fs-progress w-full h-2 rounded-full cursor-pointer relative z-10 opacity-0"
                />
                <div class="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
                  <div class="w-full h-1.5 group-hover:h-2 rounded-full bg-white/15 transition-all overflow-hidden">
                    <div class="h-full rounded-full bg-white/80" :style="{ width: player.progress + '%' }" />
                  </div>
                </div>
              </div>

              <IOSSlider
                v-else
                :value="player.progress" :min="0" :max="100" :step="0.1"
                size="lg" fill-color="bg-white/80" class="flex-1"
                @update="(v: number) => player.seekPercent(v)"
              />

              <span class="text-xs text-white/50 w-10 tabular-nums font-mono">
                {{ formatTime(player.duration) }}
              </span>
            </div>
          </div>

          <!-- Transport + Volume (hidden when collapsed) -->
          <div class="modern-controls-full">
            <div class="pt-1 pb-2">
            <div class="flex items-center justify-center gap-5 mt-2">
              <button
                @click="player.toggleShuffle()"
                class="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
                :class="player.isShuffle ? 'text-accent' : 'text-white/30 hover:text-white/60'"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                </svg>
              </button>

              <button
                @click="player.previous()"
                class="w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:text-white transition-colors"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              <button
                @click="player.togglePlay()"
                class="w-12 h-12 flex items-center justify-center rounded-full bg-control text-control-fg hover:scale-105 active:scale-95 transition-transform shadow-xl"
              >
                <svg v-if="player.isPlaying" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                <svg v-else class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>

              <button
                @click="player.next()"
                class="w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:text-white transition-colors"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>

              <button
                @click="player.cycleRepeat()"
                class="w-10 h-10 flex items-center justify-center rounded-full transition-colors relative"
                :class="player.repeatMode !== 'off' ? 'text-accent' : 'text-white/30 hover:text-white/60'"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                </svg>
                <span v-if="player.repeatMode === 'one'" class="absolute -top-0.5 -right-0.5 text-[9px] font-bold text-accent">1</span>
              </button>
            </div>

            <!-- Volume -->
            <div class="flex items-center justify-center mt-2 px-6" @wheel.prevent="onVolumeWheel">
              <button
                @click="player.toggleMute()"
                class="w-4 h-4 mr-2.5 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors shrink-0"
              >
                <svg v-if="player.isMuted || player.volume === 0" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
                <svg v-else-if="player.volume < 0.5" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                </svg>
                <svg v-else class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              </button>

              <div class="flex-1 relative group" v-if="!player.iosSliders">
                <input
                  type="range" min="0" max="1" step="0.01"
                  :value="player.volume" @input="onVolumeInput"
                  class="fs-volume w-full cursor-pointer relative z-10"
                />
                <div class="absolute top-1/2 left-0 -translate-y-1/2 h-[3px] rounded-full bg-white/15 w-full pointer-events-none" />
                <div class="absolute top-1/2 left-0 -translate-y-1/2 h-[3px] rounded-full bg-white/70 pointer-events-none transition-all" :style="{ width: player.volume * 100 + '%' }" />
              </div>
              <IOSSlider v-else :value="player.volume" :min="0" :max="1" :step="0.01" class="flex-1" @update="(v: number) => player.setVolume(v)" />

              <button
                @click="player.toggleMute()"
                class="w-4 h-4 ml-2.5 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors shrink-0"
              >
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main content area: Artwork mode (centered large cover) -->
      <div v-else-if="immersiveStyle === 'artwork'" class="flex-1 flex items-center justify-center min-h-0">
        <div
          class="relative transition-all duration-700 ease-out"
          :style="{ width: 'min(70vh, 70vw)' }"
        >
          <div
            class="aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/[0.06] transition-all duration-700 ease-out"
            :class="player.isPlaying ? 'scale-100' : 'scale-[0.97] opacity-90'"
          >
            <video
              v-show="animatedCoverActive"
              ref="animatedVideoEl"
              class="w-full h-full object-cover absolute inset-0 z-10"
              autoplay loop muted playsinline
            />
            <img
              v-if="player.currentTrack?.coverArt"
              :src="coverUrl"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full bg-white/[0.06] flex items-center justify-center">
              <svg class="w-40 h-40 text-white/10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Immersive settings button (top-left, fades with idle) -->
    <div
      class="absolute top-0 left-0 p-6 z-20 fs-fade"
      :class="idle && !showImmersiveMenu ? 'fs-idle' : ''"
    >
      <button
        @click.stop="showImmersiveMenu = !showImmersiveMenu"
        class="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
        :class="showImmersiveMenu ? 'bg-white/20 text-white' : 'bg-white/10 hover:bg-white/20 text-white/60 hover:text-white'"
        title="Immersive settings"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>

    <!-- Immersive Settings Panel (slide from left, like Queue) -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showImmersiveMenu" class="fixed inset-0 z-[80] bg-black/50" @click="showImmersiveMenu = false" />
      </Transition>
      <Transition name="slide-left">
        <div
          v-if="showImmersiveMenu"
          class="fixed top-0 left-0 bottom-0 z-[85] w-[300px] max-w-[85vw] flex flex-col shadow-2xl imm-settings-panel"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
            <div>
              <h2 class="text-base font-bold" style="color: rgb(var(--app-text) / 0.95)">Settings</h2>
              <p class="text-[11px] mt-0.5" style="color: rgb(var(--app-text) / 0.30)">Immersive mode</p>
            </div>
            <button
              @click="showImmersiveMenu = false"
              class="imm-close-btn w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
            <!-- Style -->
            <div>
              <p class="imm-section-label text-[10px] font-semibold uppercase tracking-wider mb-2">Style</p>
              <div class="relative" ref="styleDropdownRef">
                <button
                  @click.stop="showStyleDropdown = !showStyleDropdown"
                  class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl imm-select-btn transition-colors"
                >
                  <span class="imm-text text-sm">{{ currentStyleLabel }}</span>
                  <svg class="imm-icon w-4 h-4 transition-transform" :class="showStyleDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <Transition name="dropdown">
                  <div
                    v-if="showStyleDropdown"
                    class="absolute top-full left-0 right-0 mt-1.5 rounded-xl shadow-2xl py-1 z-10 imm-dropdown"
                  >
                    <button
                      v-for="style in immersiveStyles"
                      :key="style.id"
                      @click="immersiveStyle = style.id; showStyleDropdown = false"
                      class="w-full flex items-center justify-between px-3.5 py-2 text-sm transition-colors imm-dropdown-item"
                      :class="immersiveStyle === style.id
                        ? 'text-accent bg-accent/[0.08]'
                        : 'imm-dropdown-item-inactive'"
                    >
                      <span>{{ style.label }}</span>
                      <svg v-if="immersiveStyle === style.id" class="w-4 h-4 text-accent" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </button>
                  </div>
                </Transition>
              </div>
            </div>

            <!-- Background effects -->
            <div>
              <p class="imm-section-label text-[10px] font-semibold uppercase tracking-wider mb-2">Background</p>

              <!-- Vibrant (not shown for modern — it's always vibrant) -->
              <label v-if="immersiveStyle !== 'modern'" class="flex items-center justify-between cursor-pointer">
                <div>
                  <span class="imm-text text-sm">Vibrant background</span>
                  <p class="imm-hint text-[11px] mt-0.5">Brighter colors, no noise</p>
                </div>
                <button
                  @click="vibrantBackground = !vibrantBackground"
                  class="relative w-9 h-5 rounded-full transition-colors duration-200"
                  :class="vibrantBackground ? 'bg-accent' : 'imm-toggle-off'"
                >
                  <span
                    class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-control shadow transition-transform duration-200"
                    :class="vibrantBackground ? 'translate-x-4' : ''"
                  />
                </button>
              </label>

              <!-- Animated colors (modern / artwork only) -->
              <label
                v-if="immersiveStyle === 'modern' || (immersiveStyle === 'artwork' && effectiveVibrant)"
                class="flex items-center justify-between cursor-pointer"
                :class="immersiveStyle !== 'modern' ? 'mt-3' : ''"
              >
                <div>
                  <span class="imm-text text-sm">Animated background</span>
                  <p class="imm-hint text-[11px] mt-0.5">Dynamic moving backgrounds</p>
                </div>
                <button
                  @click="animatedBackground = !animatedBackground"
                  class="relative w-9 h-5 rounded-full transition-colors duration-200"
                  :class="animatedBackground ? 'bg-accent' : 'imm-toggle-off'"
                >
                  <span
                    class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-control shadow transition-transform duration-200"
                    :class="animatedBackground ? 'translate-x-4' : ''"
                  />
                </button>
              </label>

              <!-- Animated style dropdown (shown when animated is on) -->
              <div
                v-if="effectiveAnimated"
                class="mt-3"
              >
                <div class="relative" ref="animStyleDropdownRef">
                  <button
                    @click.stop="showAnimStyleDropdown = !showAnimStyleDropdown"
                    class="w-full flex items-center justify-between px-3 py-2 rounded-xl imm-select-btn transition-colors"
                  >
                    <span class="imm-text text-sm">{{ currentAnimStyleLabel }}</span>
                    <svg class="imm-icon w-4 h-4 transition-transform" :class="showAnimStyleDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <Transition name="dropdown">
                    <div
                      v-if="showAnimStyleDropdown"
                      class="absolute top-full left-0 right-0 mt-1.5 rounded-xl shadow-2xl py-1 z-10 imm-dropdown"
                    >
                      <button
                        v-for="animOpt in animatedStyles"
                        :key="animOpt.id"
                        @click="animatedStyle = animOpt.id; showAnimStyleDropdown = false"
                        class="w-full flex items-center justify-between px-3.5 py-2 text-left transition-colors imm-dropdown-item"
                        :class="animatedStyle === animOpt.id
                          ? 'text-accent bg-accent/[0.08]'
                          : 'imm-dropdown-item-inactive'"
                      >
                        <div>
                          <span class="text-sm">{{ animOpt.label }}</span>
                          <p class="text-[10px] opacity-50 mt-0.5">{{ animOpt.desc }}</p>
                        </div>
                        <svg v-if="animatedStyle === animOpt.id" class="w-4 h-4 text-accent shrink-0 ml-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </button>
                    </div>
                  </Transition>
                </div>
              </div>
            </div>

            <!-- Playback controls (modern only) -->
            <div v-if="immersiveStyle === 'modern'">
              <p class="imm-section-label text-[10px] font-semibold uppercase tracking-wider mb-2">Controls</p>
              <label class="flex items-center justify-between cursor-pointer">
                <div>
                  <span class="imm-text text-sm">Hide playback controls</span>
                  <p class="imm-hint text-[11px] mt-0.5">Shortcuts still work</p>
                </div>
                <button
                  @click="hideControls = !hideControls"
                  class="relative w-9 h-5 rounded-full transition-colors duration-200"
                  :class="hideControls ? 'bg-accent' : 'imm-toggle-off'"
                >
                  <span
                    class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-control shadow transition-transform duration-200"
                    :class="hideControls ? 'translate-x-4' : ''"
                  />
                </button>
              </label>
            </div>

            <!-- Animated Covers -->
            <div>
              <p class="imm-section-label text-[10px] font-semibold uppercase tracking-wider mb-2">Media</p>
              <label class="flex items-center justify-between cursor-pointer">
                <span class="imm-text text-sm">Animated covers</span>
                <button
                  @click="player.setAnimatedCoversEnabled(!player.animatedCoversEnabled)"
                  class="relative w-9 h-5 rounded-full transition-colors duration-200"
                  :class="player.animatedCoversEnabled ? 'bg-accent' : 'imm-toggle-off'"
                >
                  <span
                    class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-control shadow transition-transform duration-200"
                    :class="player.animatedCoversEnabled ? 'translate-x-4' : ''"
                  />
                </button>
              </label>
            </div>

            <!-- Plugin settings slot -->
            <div id="aurora-immersive-settings-slot" class="space-y-5" />
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Queue Panel -->
    <QueuePanel :show="showQueue" @close="showQueue = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, provide } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useLibraryStore } from '@/stores/library'
import { formatTime } from '@/utils/formatTime'
import FullscreenLyrics from '@/components/FullscreenLyrics.vue'
import QueuePanel from '@/components/QueuePanel.vue'
import WaveformBar from '@/components/WaveformBar.vue'
import IOSSlider from '@/components/IOSSlider.vue'
import ArtistLinks from '@/components/ArtistLinks.vue'
import Hls from 'hls.js'
import { setImmersiveActive, updateImmersiveSettings, immersiveState } from '@/plugins/immersiveState'
import TutorialPopup from '@/components/TutorialPopup.vue'

const router = useRouter()
const player = usePlayerStore()
const library = useLibraryStore()
const showQueue = ref(false)
const showImmersiveMenu = ref(false)
const showStyleDropdown = ref(false)
const styleDropdownRef = ref<HTMLElement | null>(null)
const modernControlsHover = ref(false)

// ── Immersive settings ───────────────────────────────────────────────
type StyleId = 'default' | 'modern' | 'artwork'
const immersiveStyle = ref<string>('default')
const immersiveStyles = [
  { id: 'default', label: 'Default' },
  { id: 'modern', label: 'Modern' },
  { id: 'artwork', label: 'Artwork' },
]
const currentStyleLabel = computed(() =>
  immersiveStyles.find(s => s.id === immersiveStyle.value)?.label ?? 'Default'
)

// Per-style effect toggles (each style remembers its own vibrant & animated state)
const vibrantPerStyle = ref<Record<StyleId, boolean>>({ default: false, modern: true, artwork: false })
const animatedPerStyle = ref<Record<StyleId, boolean>>({ default: false, modern: false, artwork: false })
const hideControlsPerStyle = ref<Record<StyleId, boolean>>({ default: false, modern: false, artwork: false })

// Animated background style selection (per immersive style)
type AnimStyleId = 'lava-lamp' | 'sonar-ripple' | 'cinematic-grain'
const animatedStyles = [
  { id: 'lava-lamp', label: 'Lava Lamp', desc: 'Drifting color blobs' },
  { id: 'sonar-ripple', label: 'Sonar Ripple', desc: 'Expanding halos from cover' },
  { id: 'cinematic-grain', label: 'Cinematic Grain', desc: 'Film grain & orbiting spotlights' },
] as const
const animStylePerStyle = ref<Record<StyleId, AnimStyleId>>({ default: 'lava-lamp', modern: 'lava-lamp', artwork: 'lava-lamp' })
const animatedStyle = computed({
  get: () => animStylePerStyle.value[immersiveStyle.value as StyleId] ?? 'lava-lamp',
  set: (v: AnimStyleId) => { animStylePerStyle.value[immersiveStyle.value as StyleId] = v; saveImmersiveSettings() },
})
const currentAnimStyleLabel = computed(() =>
  animatedStyles.find(s => s.id === animatedStyle.value)?.label ?? 'Lava Lamp'
)
const showAnimStyleDropdown = ref(false)
const animStyleDropdownRef = ref<HTMLElement>()

// Convenience accessors for the current style's toggles
const vibrantBackground = computed({
  get: () => vibrantPerStyle.value[immersiveStyle.value as StyleId] ?? false,
  set: (v: boolean) => { vibrantPerStyle.value[immersiveStyle.value as StyleId] = v; saveImmersiveSettings() },
})
const animatedBackground = computed({
  get: () => animatedPerStyle.value[immersiveStyle.value as StyleId] ?? false,
  set: (v: boolean) => { animatedPerStyle.value[immersiveStyle.value as StyleId] = v; saveImmersiveSettings() },
})
const hideControls = computed({
  get: () => hideControlsPerStyle.value[immersiveStyle.value as StyleId] ?? false,
  set: (v: boolean) => { hideControlsPerStyle.value[immersiveStyle.value as StyleId] = v; saveImmersiveSettings() },
})

// Modern always uses vibrant; for default/artwork it's a toggle
const effectiveVibrant = computed(() => immersiveStyle.value === 'modern' || vibrantBackground.value)
// Animated bg only for modern/artwork, and requires vibrant
const effectiveAnimated = computed(() => animatedBackground.value && effectiveVibrant.value && (immersiveStyle.value === 'modern' || immersiveStyle.value === 'artwork'))

// Persist immersive settings to Electron settings.json (included in backups)
async function saveImmersiveSettings() {
  // Sync to shared plugin state
  syncImmersiveState()
  try {
    await window.api.mergeSettings({
      immersiveStyle: immersiveStyle.value,
      immersiveVibrant: { ...vibrantPerStyle.value },
      immersiveAnimated: { ...animatedPerStyle.value },
      immersiveAnimStyle: { ...animStylePerStyle.value },
      immersiveHideControls: { ...hideControlsPerStyle.value },
    })
  } catch { /* ignore */ }
}

/** Push current immersive settings to the shared plugin-readable state */
function syncImmersiveState() {
  _syncingFromLocal = true
  updateImmersiveSettings({
    style: immersiveStyle.value as any,
    vibrant: { ...vibrantPerStyle.value },
    animated: { ...animatedPerStyle.value },
    animStyle: { ...animStylePerStyle.value },
    hideControls: { ...hideControlsPerStyle.value },
  })
  nextTick(() => { _syncingFromLocal = false })
}
let _syncingFromLocal = false

// Load persisted immersive settings on mount
async function loadImmersiveSettings() {
  try {
    const settings = await window.api.getSettings()

    // Migrate old localStorage keys (one-time)
    const oldStyle = localStorage.getItem('aurora:immersive-style')
    const oldVibrant = localStorage.getItem('aurora:vibrant-background')
    const oldAnimated = localStorage.getItem('aurora:animated-background')
    if (!settings.immersiveStyle && (oldStyle || oldVibrant !== null || oldAnimated !== null)) {
      if (oldStyle && ['default', 'modern', 'artwork'].includes(oldStyle)) {
        immersiveStyle.value = oldStyle
      }
      if (oldVibrant === 'true') {
        vibrantPerStyle.value[immersiveStyle.value as StyleId] = true
      }
      if (oldAnimated === 'true') {
        animatedPerStyle.value[immersiveStyle.value as StyleId] = true
      }
      // Clean up old keys
      localStorage.removeItem('aurora:immersive-style')
      localStorage.removeItem('aurora:vibrant-background')
      localStorage.removeItem('aurora:animated-background')
      await saveImmersiveSettings()
      return
    }

    if (settings.immersiveStyle && ['default', 'modern', 'artwork'].includes(settings.immersiveStyle)) {
      immersiveStyle.value = settings.immersiveStyle
    }
    if (settings.immersiveVibrant && typeof settings.immersiveVibrant === 'object') {
      vibrantPerStyle.value = { ...vibrantPerStyle.value, ...settings.immersiveVibrant }
    }
    if (settings.immersiveAnimated && typeof settings.immersiveAnimated === 'object') {
      animatedPerStyle.value = { ...animatedPerStyle.value, ...settings.immersiveAnimated }
    }
    if (settings.immersiveAnimStyle && typeof settings.immersiveAnimStyle === 'object') {
      animStylePerStyle.value = { ...animStylePerStyle.value, ...settings.immersiveAnimStyle }
    }
    if (settings.immersiveHideControls && typeof settings.immersiveHideControls === 'object') {
      hideControlsPerStyle.value = { ...hideControlsPerStyle.value, ...settings.immersiveHideControls }
    }
  } catch { /* first run, defaults are fine */ }
}

watch(immersiveStyle, () => saveImmersiveSettings())

// ── Sync plugin-driven changes back to local refs ──────────────────────
// When a plugin changes immersive settings via the API, the shared state
// updates first. This watcher applies those changes to the local component refs.
watch(
  () => immersiveState.settings,
  (s) => {
    // Skip if this change originated from our own syncImmersiveState call
    if (_syncingFromLocal) return
    if (s.style !== immersiveStyle.value) immersiveStyle.value = s.style
    vibrantPerStyle.value = { ...s.vibrant }
    animatedPerStyle.value = { ...s.animated }
    animStylePerStyle.value = { ...s.animStyle }
    hideControlsPerStyle.value = { ...s.hideControls }
    // Persist plugin-driven changes to disk (saveImmersiveSettings will set _syncingFromLocal)
    saveImmersiveSettings()
  },
  { deep: true },
)

// Luminance of the cover art (0 = black, 255 = white)
const coverLuminance = ref(50)
const isLightBackground = computed(() => effectiveVibrant.value && coverLuminance.value > 140)
provide('isLightBackground', isLightBackground)

// ── Idle / Active state ──────────────────────────────────────────────
const idle = ref(false)
let idleTimer: ReturnType<typeof setTimeout> | null = null
const IDLE_DELAY = 3000 // ms of no mouse activity

function onMouseActivity() {
  idle.value = false
  if (showImmersiveMenu.value) return // don't restart idle timer while menu is open
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => { idle.value = true }, IDLE_DELAY)
}

// ── Navigation helpers ───────────────────────────────────────────────
function goToArtist() {
  if (!player.currentTrack) return
  const artistName = player.currentTrack.albumArtist || player.currentTrack.artist
  window.api.exitFullscreen()
  router.replace(`/artist/${encodeURIComponent(artistName)}`)
}

function goToAlbum() {
  if (!player.currentTrack) return
  const album = library.albums.find(a =>
    a.name === player.currentTrack!.album && a.artist === (player.currentTrack!.albumArtist || player.currentTrack!.artist)
  )
  if (album) {
    window.api.exitFullscreen()
    router.replace(`/album/${album.id}`)
  }
}

const coverUrl = computed(() =>
  player.currentTrack?.coverArt ? window.api.getMediaUrl(player.currentTrack.coverArt) : '',
)

// ── Animated cover (HLS stream) ─────────────────────────────────────────
const animatedVideoEl = ref<HTMLVideoElement | null>(null)
const animatedCoverActive = ref(false)
let hlsInstance: Hls | null = null
let animatedCoverAbort = '' // track key to skip stale responses

function destroyHls() {
  if (hlsInstance) {
    hlsInstance.destroy()
    hlsInstance = null
  }
  animatedCoverActive.value = false
}

function attachHls(url: string) {
  destroyHls()
  const videoEl = animatedVideoEl.value
  if (!videoEl) return

  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: false,
      maxBufferLength: 10,
      maxMaxBufferLength: 30,
    })
    hls.loadSource(url)
    hls.attachMedia(videoEl)
    hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
      // Prefer H.264 (avc1) levels — HEVC can have color rendering issues in Chromium
      const avcLevels = data.levels
        .map((l: any, i: number) => ({ idx: i, codec: l.codecSet || '' }))
        .filter((l: any) => !l.codec.includes('hvc') && !l.codec.includes('hev'))
      if (avcLevels.length > 0) {
        // Restrict to only H.264 levels
        hls.currentLevel = avcLevels[avcLevels.length - 1].idx // pick highest quality avc
      }
      videoEl.play().catch(() => {})
      animatedCoverActive.value = true
    })
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (data.fatal) {
        destroyHls()
      }
    })
    hlsInstance = hls
  } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari native HLS
    videoEl.src = url
    videoEl.addEventListener('loadedmetadata', () => {
      videoEl.play().catch(() => {})
      animatedCoverActive.value = true
    }, { once: true })
  }
}

async function fetchAnimatedCover(track: { album: string; artist: string; albumArtist?: string }) {
  const lookupArtist = track.albumArtist || track.artist
  const key = `${track.album}---${lookupArtist}`
  animatedCoverAbort = key
  try {
    const hlsUrl = await window.api.getAnimatedCover(track.album || '', lookupArtist || '')
    if (animatedCoverAbort !== key) return // track changed
    if (hlsUrl) {
      await nextTick() // ensure video element is in DOM
      attachHls(hlsUrl)
    }
  } catch {
    // silently ignore
  }
}

watch(
  () => player.currentTrack,
  (track) => {
    destroyHls()
    if (!track || !player.animatedCoversEnabled) return
    fetchAnimatedCover(track)
  },
  { immediate: true },
)

// React to animated covers toggle
watch(
  () => player.animatedCoversEnabled,
  (enabled) => {
    if (!enabled) {
      destroyHls()
    } else if (player.currentTrack) {
      fetchAnimatedCover(player.currentTrack)
    }
  },
)

// Re-attach HLS when immersive style changes (video element is recreated)
watch(immersiveStyle, () => {
  destroyHls()
  if (player.currentTrack && player.animatedCoversEnabled) {
    nextTick(() => fetchAnimatedCover(player.currentTrack!))
  }
})

// ── Extract dominant colors from cover art for fluid background ──────────
const colors = ref<{ c1: string; c2: string; c3: string; c4: string }>({
  c1: 'rgba(30,10,40,1)',
  c2: 'rgba(15,5,30,1)',
  c3: 'rgba(40,15,50,1)',
  c4: 'rgba(10,5,20,1)',
})
const brightColors = ref<{ c1: string; c2: string; c3: string; c4: string }>({
  c1: 'rgba(50,20,70,0.95)',
  c2: 'rgba(30,15,55,0.95)',
  c3: 'rgba(60,25,75,0.95)',
  c4: 'rgba(20,10,40,0.95)',
})
// Raw RGB values for canvas rendering
const rawColors = ref<{ r: number; g: number; b: number }[]>([
  { r: 50, g: 20, b: 70 }, { r: 30, g: 15, b: 55 },
  { r: 60, g: 25, b: 75 }, { r: 20, g: 10, b: 40 },
])
// Dark dominant color for Sonar Ripple / Cinematic Grain base
const darkDominant = computed(() => {
  const c = rawColors.value[0]
  return `rgb(${Math.round(c.r * 0.2)},${Math.round(c.g * 0.15)},${Math.round(c.b * 0.25)})`
})

// Canvas refs for animated styles
const sonarCanvas = ref<HTMLCanvasElement>()
const grainCanvas = ref<HTMLCanvasElement>()

const bgStyle = computed(() => {
  const c = effectiveVibrant.value ? brightColors.value : colors.value
  if (effectiveVibrant.value) {
    return {
      background: `
        radial-gradient(ellipse 100% 80% at 25% 60%, ${c.c1} 0%, transparent 80%),
        radial-gradient(ellipse 100% 100% at 85% 35%, ${c.c2} 0%, transparent 75%),
        radial-gradient(ellipse 90% 70% at 60% 90%, ${c.c3} 0%, transparent 70%),
        radial-gradient(ellipse 110% 80% at 40% 10%, ${c.c4} 0%, transparent 80%),
        ${c.c1}
      `,
    }
  }
  return {
    background: `
      radial-gradient(ellipse 80% 70% at 15% 60%, ${c.c1} 0%, transparent 70%),
      radial-gradient(ellipse 70% 80% at 85% 30%, ${c.c2} 0%, transparent 65%),
      radial-gradient(ellipse 60% 50% at 50% 90%, ${c.c3} 0%, transparent 60%),
      radial-gradient(ellipse 90% 60% at 30% 10%, ${c.c4} 0%, transparent 70%)
    `,
  }
})

// Fade style for modern cover (uses bright background colors)
const modernFadeStyle = computed(() => {
  const c = brightColors.value
  // Average the extracted colors for a smooth single-tone fade
  return {
    background: `linear-gradient(to right, transparent 0%, ${c.c2} 70%, ${c.c1} 100%)`,
  }
})

function extractColors(src: string) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = src
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const sz = 32
    canvas.width = sz
    canvas.height = sz
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0, sz, sz)
    const data = ctx.getImageData(0, 0, sz, sz).data

    // Collect all pixels
    const pixels: { r: number; g: number; b: number; sat: number }[] = []
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
      const sat = mx === 0 ? 0 : (mx - mn) / mx
      pixels.push({ r, g, b, sat })
    }

    const colorDist = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) =>
      Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b)

    // Find the dominant (most frequent) color via simple bucketing
    const bucketSize = 24
    const buckets = new Map<string, { r: number; g: number; b: number; count: number; tr: number; tg: number; tb: number }>()
    for (const px of pixels) {
      const key = `${Math.floor(px.r / bucketSize)},${Math.floor(px.g / bucketSize)},${Math.floor(px.b / bucketSize)}`
      const b = buckets.get(key)
      if (b) { b.count++; b.tr += px.r; b.tg += px.g; b.tb += px.b }
      else buckets.set(key, { r: px.r, g: px.g, b: px.b, count: 1, tr: px.r, tg: px.g, tb: px.b })
    }
    // Sort buckets by frequency
    const sortedBuckets = [...buckets.values()]
      .sort((a, b) => b.count - a.count)
      .map(b => ({ r: Math.round(b.tr / b.count), g: Math.round(b.tg / b.count), b: Math.round(b.tb / b.count) }))

    // c1 = most frequent (dominant), c2-c4 = most saturated distinct accents
    const dominant = sortedBuckets[0] || { r: 30, g: 30, b: 50 }
    const picked: { r: number; g: number; b: number }[] = [dominant]

    // Sort by saturation for accent picks
    const sorted = [...pixels].sort((a, b) => b.sat - a.sat)
    for (const px of sorted) {
      if (picked.length >= 4) break
      if (picked.every(p => colorDist(p, px) > 70)) {
        picked.push({ r: px.r, g: px.g, b: px.b })
      }
    }
    // Fill remaining with next most frequent buckets
    for (const bucket of sortedBuckets) {
      if (picked.length >= 4) break
      if (picked.every(p => colorDist(p, bucket) > 50)) {
        picked.push(bucket)
      }
    }
    while (picked.length < 4) picked.push(dominant)

    // Store raw RGB for canvas rendering
    rawColors.value = picked.map(c => ({ r: c.r, g: c.g, b: c.b }))

    // Dark variant (default mode)
    const dark = picked.map(c => {
      const dr = Math.round(c.r * 0.45)
      const dg = Math.round(c.g * 0.35)
      const db = Math.round(c.b * 0.5)
      return `rgba(${dr},${dg},${db},0.9)`
    })
    colors.value = { c1: dark[0], c2: dark[1], c3: dark[2], c4: dark[3] }

    // Bright variant — preserve actual hues
    const bright = picked.map(c => {
      const br = Math.min(255, Math.round(c.r * 0.95))
      const bg = Math.min(255, Math.round(c.g * 0.95))
      const bb = Math.min(255, Math.round(c.b * 0.95))
      return `rgba(${br},${bg},${bb},1)`
    })
    brightColors.value = { c1: bright[0], c2: bright[1], c3: bright[2], c4: bright[3] }

    // Compute overall luminance (0–255) from full image average
    let totalR = 0, totalG = 0, totalB = 0
    for (let i = 0; i < data.length; i += 4) {
      totalR += data[i]; totalG += data[i + 1]; totalB += data[i + 2]
    }
    const totalPx = data.length / 4
    coverLuminance.value = (0.299 * (totalR / totalPx) + 0.587 * (totalG / totalPx) + 0.114 * (totalB / totalPx))
  }
}

watch(coverUrl, (url) => { if (url) extractColors(url) }, { immediate: true })

function onProgressInput(e: Event) {
  player.seekPercent(parseFloat((e.target as HTMLInputElement).value))
}

function onVolumeInput(e: Event) {
  player.setVolume(parseFloat((e.target as HTMLInputElement).value))
}

function onVolumeWheel(e: WheelEvent) {
  const delta = e.deltaY < 0 ? 0.05 : -0.05
  player.setVolume(Math.min(1, Math.max(0, player.volume + delta)))
}

function exitFullscreen() {
  window.api.exitFullscreen()
  router.back()
}

function onKeydown(e: KeyboardEvent) {
  // Don't intercept when LrcSyncer overlay is active
  if (document.querySelector('[data-lrc-syncer-active]')) return

  if (e.key === 'Escape' || e.key === 'F11') {
    e.preventDefault()
    if (showImmersiveMenu.value) {
      showImmersiveMenu.value = false
    } else if (showQueue.value) {
      showQueue.value = false
    } else {
      exitFullscreen()
    }
  } else if (e.key === ' ') {
    e.preventDefault()
    player.togglePlay()
  } else if (e.key === 'ArrowRight') {
    player.next()
  } else if (e.key === 'ArrowLeft') {
    player.previous()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    player.setVolume(Math.min(1, player.volume + 0.05))
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    player.setVolume(Math.max(0, player.volume - 0.05))
  } else if (e.key === 's' || e.key === 'S') {
    // DEV: cycle immersive style
    const ids = immersiveStyles.map(s => s.id)
    const next = ids[(ids.indexOf(immersiveStyle.value) + 1) % ids.length]
    immersiveStyle.value = next
    saveImmersiveSettings()
  } else if (e.key === 'a' || e.key === 'A') {
    // DEV: toggle animated background for current style
    animatedBackground.value = !animatedBackground.value
  } else if (e.key === 'd' || e.key === 'D') {
    // DEV: cycle animated style for current immersive style
    if (effectiveAnimated.value) {
      const ids = animatedStyles.map(s => s.id)
      const next = ids[(ids.indexOf(animatedStyle.value) + 1) % ids.length] as AnimStyleId
      animatedStyle.value = next
    }
  } else if (e.key === 'n' || e.key === 'N') {
    // DEV: play next album in library
    const allAlbums = library.albums
    if (allAlbums.length === 0) return
    const cur = player.currentTrack
    let idx = 0
    if (cur) {
      const curIdx = allAlbums.findIndex(a => a.name === cur.album && a.artist === cur.albumArtist)
      idx = curIdx >= 0 ? (curIdx + 1) % allAlbums.length : 0
    }
    const album = allAlbums[idx]
    if (album.tracks.length > 0) {
      player.playAll(album.tracks, 0)
    }
  }
}

// ── Animated background renderers ──────────────────────────────────────
let animFrameId = 0
let grainFrameId = 0
let sonarRipples: { x: number; y: number; age: number; maxAge: number; intensity: number }[] = []
let lastSonarSpawn = 0

function stopAnimLoop() {
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = 0 }
  if (grainFrameId) { cancelAnimationFrame(grainFrameId); grainFrameId = 0 }
  sonarRipples = []
}

function startAnimLoop() {
  stopAnimLoop()
  if (!effectiveAnimated.value) return

  const style = animatedStyle.value
  if (style === 'sonar-ripple') startSonarLoop()
  else if (style === 'cinematic-grain') startGrainLoop()
}

// ── Sonar Ripple renderer (expanding halos) ───────────────────────────
function startSonarLoop() {
  const canvas = sonarCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  lastSonarSpawn = 0

  function draw(timestamp: number) {
    if (!canvas) return
    const w = canvas.width = canvas.clientWidth * (window.devicePixelRatio > 1 ? 2 : 1)
    const h = canvas.height = canvas.clientHeight * (window.devicePixelRatio > 1 ? 2 : 1)
    ctx!.clearRect(0, 0, w, h)

    // Origin: left-center for modern, center for artwork
    const isModern = immersiveStyle.value === 'modern'
    const ox = isModern ? w * 0.29 : w * 0.5
    const oy = h * 0.5

    // Get bass energy for ripple spawning intensity
    const freq = player.getFrequencyData()
    let bass = 0.4
    if (freq) {
      let sum = 0
      for (let i = 0; i < 6; i++) sum += freq[i]
      bass = sum / (6 * 255)
    }

    // Spawn new ripple at intervals (faster with more bass)
    const spawnInterval = 1800 - bass * 800
    if (timestamp - lastSonarSpawn > spawnInterval) {
      sonarRipples.push({
        x: ox, y: oy,
        age: 0,
        maxAge: 4000 + Math.random() * 2000,
        intensity: 0.15 + bass * 0.25,
      })
      lastSonarSpawn = timestamp
      // Limit ripple count
      if (sonarRipples.length > 8) sonarRipples.shift()
    }

    const rc = rawColors.value
    for (const ripple of sonarRipples) {
      ripple.age += 16
      const progress = ripple.age / ripple.maxAge
      if (progress > 1) continue
      const radius = Math.max(w, h) * 0.8 * progress
      const alpha = ripple.intensity * (1 - progress) * (1 - progress)
      const ci = rc[(Math.floor(ripple.age / 1000) % 3) + 1]

      ctx!.beginPath()
      ctx!.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2)
      ctx!.strokeStyle = `rgba(${ci.r},${ci.g},${ci.b},${alpha})`
      ctx!.lineWidth = 30 + 20 * (1 - progress)
      ctx!.filter = 'blur(15px)'
      ctx!.stroke()
      ctx!.filter = 'none'

      // Inner glow
      ctx!.beginPath()
      ctx!.arc(ripple.x, ripple.y, radius * 0.95, 0, Math.PI * 2)
      ctx!.strokeStyle = `rgba(${ci.r},${ci.g},${ci.b},${alpha * 0.4})`
      ctx!.lineWidth = 60 + 30 * (1 - progress)
      ctx!.stroke()
    }
    sonarRipples = sonarRipples.filter(r => r.age / r.maxAge <= 1)

    animFrameId = requestAnimationFrame(draw)
  }
  animFrameId = requestAnimationFrame(draw)
}

// ── Cinematic Grain renderer (low-fps noise) ─────────────────────────
function startGrainLoop() {
  const canvas = grainCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let lastFrame = 0
  const grainFPS = 14

  function draw(timestamp: number) {
    // Low framerate grain (12-15fps feel)
    if (timestamp - lastFrame < 1000 / grainFPS) {
      grainFrameId = requestAnimationFrame(draw)
      return
    }
    lastFrame = timestamp

    if (!canvas) return
    const w = canvas.width = Math.ceil(canvas.clientWidth / 3)
    const h = canvas.height = Math.ceil(canvas.clientHeight / 3)
    const imageData = ctx!.createImageData(w, h)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255
      data[i] = v
      data[i + 1] = v
      data[i + 2] = v
      data[i + 3] = 255
    }
    ctx!.putImageData(imageData, 0, 0)
    grainFrameId = requestAnimationFrame(draw)
  }
  grainFrameId = requestAnimationFrame(draw)
}

// Start/stop animation loop when style or enabled state changes
watch([effectiveAnimated, animatedStyle], () => {
  nextTick(() => startAnimLoop())
}, { immediate: false })

// Pause animated cover when the app is backgrounded.
// document.visibilitychange catches minimisation, but on Linux it does NOT
// fire when another window goes fullscreen over Aurora.  Window blur/focus
// events reliably detect that scenario on all platforms, but can be too
// aggressive on multi-monitor setups — so they are opt-in via a setting.
function pauseAnimatedCover() {
  const videoEl = animatedVideoEl.value
  if (videoEl && animatedCoverActive.value) videoEl.pause()
}
function resumeAnimatedCover() {
  const videoEl = animatedVideoEl.value
  if (videoEl && animatedCoverActive.value && !document.hidden) {
    videoEl.play().catch(() => {})
  }
}
function onVisibilityChange() {
  if (document.hidden) pauseAnimatedCover()
  else resumeAnimatedCover()
}

watch(() => player.pauseAnimatedOnBlur, (enabled) => {
  if (enabled) {
    window.addEventListener('blur', pauseAnimatedCover)
    window.addEventListener('focus', resumeAnimatedCover)
  } else {
    window.removeEventListener('blur', pauseAnimatedCover)
    window.removeEventListener('focus', resumeAnimatedCover)
  }
})

// Exit immersive view when the queue is cleared (no track to show)
watch(() => player.currentTrack, (track) => {
  if (!track) {
    window.api.exitFullscreen()
    router.back()
  }
})

onMounted(async () => {
  window.api.enterFullscreen()
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('visibilitychange', onVisibilityChange)
  if (player.pauseAnimatedOnBlur) {
    window.addEventListener('blur', pauseAnimatedCover)
    window.addEventListener('focus', resumeAnimatedCover)
  }
  // Start idle timer immediately
  idleTimer = setTimeout(() => { idle.value = true }, IDLE_DELAY)
  // Load persisted immersive settings from settings.json
  await loadImmersiveSettings()
  // Notify plugins that immersive mode is active
  setImmersiveActive(true)
  syncImmersiveState()
  // Start animated background if enabled
  nextTick(() => startAnimLoop())
})

onUnmounted(() => {
  setImmersiveActive(false)
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('blur', pauseAnimatedCover)
  window.removeEventListener('focus', resumeAnimatedCover)
  if (idleTimer) clearTimeout(idleTimer)
  destroyHls()
  stopAnimLoop()
})
</script>

<style scoped>
/* ── Immersive settings panel — dark glass, themeable ────────── */
/* Defaults are set in .immersive-scope (main.css) so light       */
/* themes don't wash the panel out with a bright backdrop blur.   */
.imm-settings-panel {
  background: var(--glass-heavy-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-right: 1px solid var(--border);
  border-top-left-radius: var(--win-radius, 0);
  border-bottom-left-radius: var(--win-radius, 0);
  overflow: hidden;
}
.imm-dropdown {
  background: var(--glass-heavy-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--border);
  overflow: hidden;
}
.imm-select-btn {
  background: rgb(var(--app-text) / 0.06);
  border: 1px solid rgb(var(--app-text) / 0.08);
}
.imm-select-btn:hover { border-color: rgb(var(--app-text) / 0.18); }

/* ── Themed text / interactive classes inside the immersive panel ── */
.imm-section-label { color: rgb(var(--app-text) / 0.25); }
.imm-text { color: rgb(var(--app-text) / 0.70); }
.imm-hint { color: rgb(var(--app-text) / 0.30); }
.imm-icon { color: rgb(var(--app-text) / 0.30); }
.imm-close-btn { color: rgb(var(--app-text) / 0.30); }
.imm-close-btn:hover { color: rgb(var(--app-text) / 0.90); background: rgb(var(--app-text) / 0.08); }
.imm-toggle-off { background: rgb(var(--app-text) / 0.15); }
.imm-dropdown-item-inactive { color: rgb(var(--app-text) / 0.60); }
.imm-dropdown-item-inactive:hover { color: rgb(var(--app-text) / 0.90); background: rgb(var(--app-text) / 0.06); }

/* ── Idle/Active fade ─────────────────────────────────────────── */
.fs-fade {
  transition: opacity 0.5s ease, transform 0.5s ease;
  opacity: 1;
  transform: translateY(0);
}
.fs-fade.fs-idle {
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
}

/* ── Progress slider ──────────────────────────────────────────── */
.fs-progress {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
}
.fs-progress::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}
.group:hover .fs-progress::-webkit-slider-thumb {
  opacity: 1;
}

/* ── Volume slider ────────────────────────────────────────────── */
.fs-volume {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  height: 3px;
}
.fs-volume::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}
.group:hover .fs-volume::-webkit-slider-thumb {
  opacity: 1;
}

/* ── Immersive panel slide from left ──────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-left-enter-active { transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-left-leave-active { transition: transform 0.2s ease-in; }
.slide-left-enter-from, .slide-left-leave-to { transform: translateX(-100%); }

/* ── Dropdown transition ─────────────────────────────────────── */
.dropdown-enter-active { transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1); }
.dropdown-leave-active { transition: all 0.1s ease-in; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }
.dropdown-enter-to, .dropdown-leave-from { opacity: 1; transform: translateY(0); }

/* ── Modern mode: multi-layer ambient fade ─────────────────── */

/* Layer 1: Alpha gradient mask on the sharp cover ─ curved ")" dissolve */
.modern-cover-masked {
  mask-image: radial-gradient(ellipse 68% 100% at 38% 50%, black 0%, black 45%, transparent 85%);
  -webkit-mask-image: radial-gradient(ellipse 68% 100% at 38% 50%, black 0%, black 45%, transparent 85%);
}

/* Layer 2: Blurred ambient backdrop ─ smears cover hues into the transition */
.modern-ambient-blur {
  filter: blur(60px) saturate(1.4) brightness(0.95);
  transform: scale(1.15); /* prevent blur edge artifacts */
}

/* Layer 3: Darkening vignette at the transition midpoint */
.modern-vignette {
  position: absolute;
  top: 0;
  right: -25%;
  width: 45%;
  height: 100%;
  z-index: 25;
  pointer-events: none;
  background: radial-gradient(
    ellipse 50% 70% at 50% 50%,
    rgba(0, 0, 0, 0.15) 0%,
    transparent 100%
  );
}

/* ── Modern mode: floating controls box ─────────────────────── */
.modern-controls-box {
  position: absolute;
  left: 25%;
  transform: translateX(-50%);
  bottom: 60px;
  z-index: 30;
  width: 420px;
  max-width: 90vw;
  padding: 16px 20px;
  border-radius: 20px;
  background: rgba(14, 14, 28, 0.55);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.modern-controls-box.modern-controls-collapsed {
  padding: 12px 24px;
  border-radius: 16px;
  bottom: 60px;
}
.modern-controls-full {
  display: grid;
  grid-template-rows: 1fr;
  opacity: 1;
  transition: grid-template-rows 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
}
.modern-controls-full > * {
  overflow: hidden;
  min-height: 0;
}
.modern-controls-collapsed .modern-controls-full {
  grid-template-rows: 0fr;
  opacity: 0;
}

/* Header zone: overlays mini and full info at the same position */
.modern-header-zone {
  display: grid;
  position: relative;
}
.modern-header-zone > * {
  grid-area: 1 / 1;
}
.modern-header-full {
  opacity: 1;
  transition: opacity 0.3s ease;
}
.modern-header-mini {
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}
.modern-controls-collapsed .modern-header-full {
  opacity: 0;
  pointer-events: none;
}
.modern-controls-collapsed .modern-header-mini {
  opacity: 1;
  pointer-events: auto;
}

/* ── Animated background: drifting accent blobs (Lava Lamp) ────── */
.animated-blob {
  position: absolute;
  border-radius: 40% 60% 55% 45% / 55% 40% 60% 45%;
  filter: blur(60px) saturate(1.4);
  opacity: 0.85;
  will-change: transform;
  transition: background 2s ease, width 1s ease, height 1s ease, top 1s ease, right 1s ease, bottom 1s ease, left 1s ease;
}

/* ========== MODERN: right-half positioning (Lava Lamp) ========== */
.anim-modern .blob-a1 {
  width: 28%; height: 35%; top: -5%; right: 2%;
  animation: drift-a1-m 20s ease-in-out infinite;
}
.anim-modern .blob-a2 {
  width: 18%; height: 22%; top: 8%; right: 20%; opacity: 0.7;
  animation: drift-a2-m 15s ease-in-out infinite;
}
.anim-modern .blob-b1 {
  width: 26%; height: 32%; bottom: -3%; right: 12%;
  animation: drift-b1-m 24s ease-in-out infinite;
}
.anim-modern .blob-b2 {
  width: 16%; height: 20%; bottom: 15%; right: 30%; opacity: 0.7;
  animation: drift-b2-m 17s ease-in-out infinite;
}
.anim-modern .blob-c1 {
  width: 24%; height: 30%; top: 30%; right: 5%;
  animation: drift-c1-m 22s ease-in-out infinite;
}
.anim-modern .blob-c2 {
  width: 15%; height: 18%; top: 45%; right: 28%; opacity: 0.7;
  animation: drift-c2-m 16s ease-in-out infinite;
}

/* Modern primary blobs — sweep within the right half */
@keyframes drift-a1-m {
  0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
  20% { transform: translate(-8%, 25%) scale(1.1) rotate(4deg); }
  45% { transform: translate(5%, 45%) scale(0.88) rotate(-3deg); }
  70% { transform: translate(-15%, 12%) scale(1.06) rotate(2deg); }
  90% { transform: translate(3%, -8%) scale(0.95) rotate(-1deg); }
}
@keyframes drift-b1-m {
  0%, 100% { transform: translate(0, 0) scale(1.02) rotate(0deg); }
  25% { transform: translate(8%, -22%) scale(0.9) rotate(-3deg); }
  50% { transform: translate(-10%, -35%) scale(1.1) rotate(5deg); }
  75% { transform: translate(5%, 10%) scale(0.94) rotate(-2deg); }
}
@keyframes drift-c1-m {
  0%, 100% { transform: translate(0, 0) scale(0.95) rotate(0deg); }
  30% { transform: translate(-12%, 20%) scale(1.12) rotate(4deg); }
  55% { transform: translate(10%, -22%) scale(0.98) rotate(-4deg); }
  80% { transform: translate(5%, 8%) scale(1.08) rotate(2deg); }
}
/* Modern satellite blobs */
@keyframes drift-a2-m {
  0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
  15% { transform: translate(15%, -30%) scale(1.2) rotate(-6deg); }
  35% { transform: translate(-12%, 25%) scale(0.8) rotate(5deg); }
  55% { transform: translate(10%, 50%) scale(1.15) rotate(-4deg); }
  75% { transform: translate(-20%, 10%) scale(0.85) rotate(6deg); }
  90% { transform: translate(8%, -15%) scale(1.05) rotate(-2deg); }
}
@keyframes drift-b2-m {
  0%, 100% { transform: translate(0, 0) scale(1.05) rotate(0deg); }
  20% { transform: translate(-18%, 30%) scale(0.8) rotate(6deg); }
  40% { transform: translate(15%, -20%) scale(1.2) rotate(-5deg); }
  60% { transform: translate(-5%, -35%) scale(0.9) rotate(3deg); }
  80% { transform: translate(12%, 15%) scale(1.1) rotate(-4deg); }
}
@keyframes drift-c2-m {
  0%, 100% { transform: translate(0, 0) scale(0.9) rotate(0deg); }
  18% { transform: translate(18%, -28%) scale(1.2) rotate(-5deg); }
  38% { transform: translate(-15%, 25%) scale(0.8) rotate(6deg); }
  58% { transform: translate(12%, 15%) scale(1.15) rotate(-3deg); }
  78% { transform: translate(-8%, -20%) scale(0.9) rotate(4deg); }
}

/* ========== ARTWORK: full-screen positioning (Lava Lamp) ========== */
.anim-artwork .blob-a1 {
  width: 45%; height: 50%; top: -8%; right: -5%;
  animation: drift-a1-f 20s ease-in-out infinite;
}
.anim-artwork .blob-a2 {
  width: 28%; height: 30%; top: 5%; left: 8%; opacity: 0.7;
  animation: drift-a2-f 15s ease-in-out infinite;
}
.anim-artwork .blob-b1 {
  width: 42%; height: 46%; bottom: -6%; left: -3%;
  animation: drift-b1-f 24s ease-in-out infinite;
}
.anim-artwork .blob-b2 {
  width: 25%; height: 28%; bottom: 15%; right: 10%; opacity: 0.7;
  animation: drift-b2-f 17s ease-in-out infinite;
}
.anim-artwork .blob-c1 {
  width: 38%; height: 42%; top: 25%; left: 30%;
  animation: drift-c1-f 22s ease-in-out infinite;
}
.anim-artwork .blob-c2 {
  width: 22%; height: 24%; top: 55%; right: 25%; opacity: 0.7;
  animation: drift-c2-f 16s ease-in-out infinite;
}

/* Artwork primary blobs — sweep across entire screen */
@keyframes drift-a1-f {
  0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
  20% { transform: translate(-20%, 25%) scale(1.08) rotate(4deg); }
  45% { transform: translate(15%, 45%) scale(0.9) rotate(-3deg); }
  70% { transform: translate(-25%, 15%) scale(1.05) rotate(2deg); }
  90% { transform: translate(8%, -5%) scale(0.96) rotate(-1deg); }
}
@keyframes drift-b1-f {
  0%, 100% { transform: translate(0, 0) scale(1.02) rotate(0deg); }
  25% { transform: translate(22%, -18%) scale(0.88) rotate(-3deg); }
  50% { transform: translate(8%, -40%) scale(1.1) rotate(5deg); }
  75% { transform: translate(-12%, -8%) scale(0.95) rotate(-2deg); }
}
@keyframes drift-c1-f {
  0%, 100% { transform: translate(0, 0) scale(0.95) rotate(0deg); }
  30% { transform: translate(-20%, 22%) scale(1.1) rotate(4deg); }
  55% { transform: translate(22%, -18%) scale(1.0) rotate(-4deg); }
  80% { transform: translate(10%, 12%) scale(1.06) rotate(2deg); }
}
/* Artwork satellite blobs */
@keyframes drift-a2-f {
  0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
  15% { transform: translate(30%, -20%) scale(1.2) rotate(-6deg); }
  35% { transform: translate(-15%, 35%) scale(0.8) rotate(5deg); }
  55% { transform: translate(25%, 50%) scale(1.15) rotate(-4deg); }
  75% { transform: translate(-30%, 15%) scale(0.85) rotate(6deg); }
  90% { transform: translate(12%, -12%) scale(1.05) rotate(-2deg); }
}
@keyframes drift-b2-f {
  0%, 100% { transform: translate(0, 0) scale(1.05) rotate(0deg); }
  20% { transform: translate(-25%, 25%) scale(0.8) rotate(6deg); }
  40% { transform: translate(30%, -15%) scale(1.2) rotate(-5deg); }
  60% { transform: translate(5%, -40%) scale(0.9) rotate(3deg); }
  80% { transform: translate(-20%, 10%) scale(1.1) rotate(-4deg); }
}
@keyframes drift-c2-f {
  0%, 100% { transform: translate(0, 0) scale(0.9) rotate(0deg); }
  18% { transform: translate(25%, -28%) scale(1.2) rotate(-5deg); }
  38% { transform: translate(-20%, 30%) scale(0.8) rotate(6deg); }
  58% { transform: translate(28%, 12%) scale(1.15) rotate(-3deg); }
  78% { transform: translate(-12%, -18%) scale(0.9) rotate(4deg); }
}

/* ── Cinematic Grain: orbiting spotlights ─────────────────────── */
.spotlight {
  position: absolute;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  filter: blur(50px);
  opacity: 0.8;
  will-change: transform;
  transition: background 2s ease;
}
.spotlight-1 {
  top: -20%; right: -15%;
  animation: orbit-1 28s linear infinite;
}
.spotlight-2 {
  bottom: -20%; left: -15%;
  animation: orbit-2 34s linear infinite;
}
@keyframes orbit-1 {
  0% { transform: translate(0, 0); }
  25% { transform: translate(-30%, 25%); }
  50% { transform: translate(-15%, 50%); }
  75% { transform: translate(20%, 20%); }
  100% { transform: translate(0, 0); }
}
@keyframes orbit-2 {
  0% { transform: translate(0, 0); }
  25% { transform: translate(25%, -30%); }
  50% { transform: translate(15%, -50%); }
  75% { transform: translate(-20%, -20%); }
  100% { transform: translate(0, 0); }
}
</style>
