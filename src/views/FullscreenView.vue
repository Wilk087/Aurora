<template>
  <div
    v-if="player.currentTrack"
    class="fullscreen-view fixed inset-0 z-[100] select-none"
    :class="{ 'cursor-none': idle }"
    @mousemove="onMouseActivity"
    @mousedown="onMouseActivity"
    @dblclick.self="exitFullscreen"
  >
    <!-- ── Fluid gradient background from cover colors ─────────── -->
    <div class="absolute inset-0 bg-black transition-colors duration-1000">
      <div
        class="absolute inset-0 transition-all duration-[2s] ease-out"
        :style="bgStyle"
      />
      <div v-if="immersiveStyle !== 'modern'" class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 /%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 /%3E%3C/svg%3E')" />
    </div>

    <!-- ── Two-column layout ──────────────────────────────────── -->
    <div class="relative z-10 h-full flex flex-col">
      <!-- Top bar: window controls (fade with idle) -->
      <div
        class="absolute top-0 right-0 flex items-center gap-2 p-6 z-20 fs-fade"
        :class="idle ? 'fs-idle' : ''"
      >
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
                  class="w-14 h-14 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-transform shadow-xl"
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
        <div class="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
          <img
            v-if="player.currentTrack?.coverArt"
            :src="coverUrl"
            class="absolute top-0 left-0 w-[85%] h-full object-cover modern-ambient-blur"
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
          class="modern-controls-box"
          :class="{ 'modern-controls-collapsed': idle && !modernControlsHover }"
          @mouseenter="modernControlsHover = true"
          @mouseleave="modernControlsHover = false"
        >
          <!-- Header zone: overlaid mini/full info -->
          <div class="modern-header-zone">
            <!-- Full track info -->
            <div class="modern-header-full">
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
                class="w-12 h-12 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-transform shadow-xl"
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
          class="fixed top-0 left-0 bottom-0 z-[85] w-[300px] max-w-[85vw] flex flex-col bg-[#0e0e1c]/95 backdrop-blur-2xl border-r border-white/[0.08] shadow-2xl"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
            <div>
              <h2 class="text-base font-bold text-white">Settings</h2>
              <p class="text-[11px] text-white/30 mt-0.5">Immersive mode</p>
            </div>
            <button
              @click="showImmersiveMenu = false"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/[0.08] transition-colors"
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
              <p class="text-[10px] font-semibold uppercase tracking-wider text-white/25 mb-2">Style</p>
              <div class="relative" ref="styleDropdownRef">
                <button
                  @click.stop="showStyleDropdown = !showStyleDropdown"
                  class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.12] transition-colors"
                >
                  <span class="text-sm text-white/70">{{ currentStyleLabel }}</span>
                  <svg class="w-4 h-4 text-white/30 transition-transform" :class="showStyleDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <Transition name="dropdown">
                  <div
                    v-if="showStyleDropdown"
                    class="absolute top-full left-0 right-0 mt-1.5 rounded-xl bg-[#16162a]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl py-1 z-10"
                  >
                    <button
                      v-for="style in immersiveStyles"
                      :key="style.id"
                      @click="immersiveStyle = style.id; showStyleDropdown = false"
                      class="w-full flex items-center justify-between px-3.5 py-2 text-sm transition-colors"
                      :class="immersiveStyle === style.id
                        ? 'text-accent bg-accent/[0.08]'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.06]'"
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

            <!-- Animated Covers -->
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-white/25 mb-2">Media</p>
              <label class="flex items-center justify-between cursor-pointer">
                <span class="text-sm text-white/70">Animated covers</span>
                <button
                  @click="player.setAnimatedCoversEnabled(!player.animatedCoversEnabled)"
                  class="relative w-9 h-5 rounded-full transition-colors duration-200"
                  :class="player.animatedCoversEnabled ? 'bg-accent' : 'bg-white/15'"
                >
                  <span
                    class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                    :class="player.animatedCoversEnabled ? 'translate-x-4' : ''"
                  />
                </button>
              </label>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Queue Panel -->
    <QueuePanel :show="showQueue" @close="showQueue = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
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

const router = useRouter()
const player = usePlayerStore()
const library = useLibraryStore()
const showQueue = ref(false)
const showImmersiveMenu = ref(false)
const showStyleDropdown = ref(false)
const styleDropdownRef = ref<HTMLElement | null>(null)
const modernControlsHover = ref(false)

// ── Immersive settings ───────────────────────────────────────────────
const IMMERSIVE_STYLE_KEY = 'aurora:immersive-style'
const _storedStyle = localStorage.getItem(IMMERSIVE_STYLE_KEY) || 'default'
const immersiveStyle = ref(['default', 'modern', 'artwork'].includes(_storedStyle) ? _storedStyle : 'default')
const immersiveStyles = [
  { id: 'default', label: 'Default' },
  { id: 'modern', label: 'Modern' },
  { id: 'artwork', label: 'Artwork' },
]
const currentStyleLabel = computed(() =>
  immersiveStyles.find(s => s.id === immersiveStyle.value)?.label ?? 'Default'
)
watch(immersiveStyle, (v) => localStorage.setItem(IMMERSIVE_STYLE_KEY, v))

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

const bgStyle = computed(() => {
  const c = immersiveStyle.value === 'modern' ? brightColors.value : colors.value
  if (immersiveStyle.value === 'modern') {
    return {
      background: `
        radial-gradient(ellipse 90% 80% at 20% 60%, ${c.c1} 0%, transparent 75%),
        radial-gradient(ellipse 85% 90% at 80% 30%, ${c.c2} 0%, transparent 70%),
        radial-gradient(ellipse 75% 60% at 55% 90%, ${c.c3} 0%, transparent 65%),
        radial-gradient(ellipse 100% 70% at 35% 10%, ${c.c4} 0%, transparent 75%)
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
    canvas.width = 16
    canvas.height = 16
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0, 16, 16)
    const data = ctx.getImageData(0, 0, 16, 16).data

    // Sample 4 quadrants for different color regions
    const quadrants = [
      { sx: 0, sy: 0, ex: 8, ey: 8 },    // top-left
      { sx: 8, sy: 0, ex: 16, ey: 8 },   // top-right
      { sx: 0, sy: 8, ex: 8, ey: 16 },   // bottom-left
      { sx: 8, sy: 8, ex: 16, ey: 16 },  // bottom-right
    ]

    const extracted = quadrants.map((q) => {
      let r = 0, g = 0, b = 0, count = 0
      for (let y = q.sy; y < q.ey; y++) {
        for (let x = q.sx; x < q.ex; x++) {
          const i = (y * 16 + x) * 4
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
        }
      }
      if (count === 0) return 'rgba(20,10,30,0.9)'
      // Darken and saturate for a moody look
      const dr = Math.round((r / count) * 0.45)
      const dg = Math.round((g / count) * 0.35)
      const db = Math.round((b / count) * 0.5)
      return `rgba(${dr},${dg},${db},0.9)`
    })

    colors.value = { c1: extracted[0], c2: extracted[1], c3: extracted[2], c4: extracted[3] }

    // Brighter variant for Modern mode
    const bright = quadrants.map((q) => {
      let r = 0, g = 0, b = 0, count = 0
      for (let y = q.sy; y < q.ey; y++) {
        for (let x = q.sx; x < q.ex; x++) {
          const i = (y * 16 + x) * 4
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
        }
      }
      if (count === 0) return 'rgba(40,20,60,0.95)'
      const br = Math.min(255, Math.round((r / count) * 0.9))
      const bg = Math.min(255, Math.round((g / count) * 0.8))
      const bb = Math.min(255, Math.round((b / count) * 0.95))
      return `rgba(${br},${bg},${bb},0.95)`
    })
    brightColors.value = { c1: bright[0], c2: bright[1], c3: bright[2], c4: bright[3] }
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
    exitFullscreen()
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
  }
}

onMounted(() => {
  window.api.enterFullscreen()
  document.addEventListener('keydown', onKeydown)
  // Start idle timer immediately
  idleTimer = setTimeout(() => { idle.value = true }, IDLE_DELAY)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  if (idleTimer) clearTimeout(idleTimer)
  destroyHls()
})
</script>

<style scoped>
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
</style>
