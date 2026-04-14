<template>
  <div
    class="w-full h-full flex flex-col select-none overflow-hidden"
  >

    <!-- ══ COVER MODE ══════════════════════════════════════════════════ -->
    <template v-if="mode === 'cover'">

      <!-- Full cover fill -->
      <div class="absolute inset-0 z-[1]">
        <video
          v-show="animatedActive"
          ref="videoEl"
          class="absolute inset-0 w-full h-full object-cover"
          muted loop playsinline
        />
        <img
          v-show="!animatedActive"
          v-if="coverUrl"
          :src="coverUrl"
          class="absolute inset-0 w-full h-full object-cover"
        />
        <div v-if="!coverUrl && !animatedActive" class="absolute inset-0 bg-white/[0.04] flex items-center justify-center">
          <svg class="w-16 h-16 text-white/10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
      </div>

      <!-- When overlay is hidden: full-window drag + mouse-detect layer -->
      <div
        v-if="!overlayVisible"
        class="absolute inset-0 z-[2] drag-region"
        @mousemove="onMouseMove"
      />

      <!-- Overlay (fades in on mouse movement / window blur) -->
      <Transition name="cover-overlay">
        <div v-if="overlayVisible" class="absolute inset-0 z-[3] flex flex-col no-drag" @mousemove="onMouseMove" @mouseleave="onMouseLeave">

          <!-- Top bar: draggable background, no-drag buttons -->
          <div class="flex items-center justify-end gap-1 px-2.5 pt-2.5 pb-1 drag-region"
               style="background: linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)">
            <!-- Cover→lyrics -->
            <button @click="setMode('lyrics')" class="overlay-btn no-drag" title="Lyrics view">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </button>
            <!-- Cover→compact -->
            <button @click="setMode('compact')" class="overlay-btn no-drag" title="Compact">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
              </svg>
            </button>
            <!-- Mini Player tutorial -->
            <TutorialPopup
              class="no-drag"
              tutorial-key="mini-player"
              title="Mini Player"
              description="A compact window that stays out of your way while you work."
              :items="[
                { label: 'Cover mode', description: 'Album art fills the window; controls fade in on hover.' },
                { label: 'Lyrics mode', description: 'Scrolling synced lyrics with a semi-transparent background.' },
                { label: 'Compact mode', description: 'Minimal single-line bar with track info and controls.' },
                { label: 'Always on top', description: 'The mini player floats above other windows by default.' },
              ]"
              :hotkeys="[
                { keys: ['Space'], description: 'Play / pause' },
                { keys: ['←', '→'], description: 'Previous / next track' },
              ]"
            />
            <!-- Exit mini -->
            <button @click="exitMini" class="overlay-btn no-drag" title="Full player">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            </button>
          </div>

          <!-- Spacer (drag region — middle of cover is the best drag handle) -->
          <div class="flex-1 drag-region" />

          <!-- Bottom: title/artist + controls + progress -->
          <div style="background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)">
            <!-- Progress bar -->
            <div class="mx-3 mb-2.5 relative cursor-pointer h-[3px] rounded-full overflow-hidden" @click="onProgressClick">
              <div class="absolute inset-0 bg-white/20 rounded-full" />
              <div class="absolute inset-y-0 left-0 bg-white/80 rounded-full transition-none" :style="{ width: player.progress + '%' }" />
            </div>

            <!-- Track info -->
            <div class="px-3 mb-2">
              <p class="text-[11px] font-bold truncate text-white leading-tight drop-shadow">
                {{ player.currentTrack?.title ?? 'Nothing playing' }}
              </p>
              <button
                v-if="player.currentTrack?.artist"
                @click="goToArtist()"
                class="text-[10px] text-white/55 truncate leading-tight mt-0.5 hover:text-white/80 transition-colors no-drag max-w-full text-left"
              >{{ player.currentTrack.artist }}</button>
              <p v-else class="text-[10px] text-white/55 truncate leading-tight mt-0.5"></p>
            </div>

            <!-- Controls row -->
            <div class="flex items-center justify-between px-3 pb-3">
              <!-- Left extras: shuffle + favorite -->
              <div class="flex items-center gap-1.5">
                <button
                  @click="player.toggleShuffle()"
                  class="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                  :class="player.isShuffle ? 'text-accent' : 'text-white/40 hover:text-white/70'"
                >
                  <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                  </svg>
                </button>
                <button
                  @click="currentTrackId ? favoritesStore.toggle(currentTrackId) : undefined"
                  class="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                  :class="currentTrackId && favoritesStore.isFavorite(currentTrackId) ? 'text-accent' : 'text-white/40 hover:text-white/70'"
                >
                  <svg v-if="currentTrackId && favoritesStore.isFavorite(currentTrackId)" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 17.5 3 20.58 3 23 5.42 23 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" />
                  </svg>
                </button>
              </div>

              <!-- Center: prev/play/next -->
              <div class="flex items-center gap-2">
                <button @click="player.previous()" class="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                  <svg class="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
                </button>
                <button @click="player.togglePlay()" class="w-11 h-11 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/85 active:scale-95 transition-all shadow-lg shadow-black/40">
                  <svg v-if="player.isPlaying" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                  <svg v-else class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </button>
                <button @click="player.next()" class="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                  <svg class="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                </button>
              </div>

              <!-- Right: volume + repeat -->
              <div class="flex items-center gap-1.5">
                <button
                  @click="player.toggleMute()"
                  @wheel.prevent="onVolumeWheel"
                  class="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                  :class="player.isMuted || player.volume === 0 ? 'text-white/30' : 'text-white/40 hover:text-white/70'"
                  title="Volume (scroll to adjust)"
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
                <button
                  @click="player.cycleRepeat()"
                  class="w-7 h-7 flex items-center justify-center rounded-full transition-colors relative"
                  :class="player.repeatMode !== 'off' ? 'text-accent' : 'text-white/40 hover:text-white/70'"
                >
                  <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                  </svg>
                  <span v-if="player.repeatMode === 'one'" class="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-accent leading-none">1</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </Transition>

    </template>

    <!-- ══ LYRICS MODE ═════════════════════════════════════════════════ -->
    <template v-else-if="mode === 'lyrics'">

      <!-- Ambient blurred background -->
      <div class="absolute inset-0 overflow-hidden">
        <video
          v-show="animatedActive"
          ref="videoEl"
          class="absolute inset-0 w-full h-full object-cover scale-125 blur-[48px] opacity-50"
          muted loop playsinline
        />
        <img
          v-show="!animatedActive"
          v-if="coverUrl"
          :src="coverUrl"
          class="absolute inset-0 w-full h-full object-cover scale-125 blur-[48px] opacity-40"
        />
        <div class="absolute inset-0 bg-black/65" />
      </div>

      <!-- Lyrics area -->
      <div class="flex-1 relative min-h-0">
        <!-- Top drag region (always draggable, above scroll area) -->
        <div class="absolute inset-x-0 top-0 h-10 drag-region z-[5]" />
        <div class="absolute inset-x-0 top-0 h-16 pointer-events-none z-[2]" style="background: linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)" />

        <div v-if="lyricsLoading" class="absolute inset-0 flex items-center justify-center">
          <div class="w-5 h-5 border-2 border-white/15 border-t-white/50 rounded-full animate-spin" />
        </div>
        <div v-else-if="lyricsLines.length === 0" class="absolute inset-0 flex flex-col items-start justify-center px-6 gap-1 drag-region">
          <svg class="w-7 h-7 text-white/10 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
          <p class="text-white/20 text-sm font-semibold">No lyrics available</p>
        </div>
        <div v-else ref="lyricsScroll" class="mini-lyrics absolute inset-0 overflow-y-auto no-drag z-[3]">
          <div class="h-[30%]" />
          <div
            v-for="(line, i) in lyricsLines"
            :key="i"
            :ref="(el) => { if (el) lineEls[i] = el as HTMLElement }"
            @click="isSynced ? player.seek(line.time) : undefined"
            class="mini-lyric-line px-5"
            :class="[
              isSynced ? 'cursor-pointer' : '',
              !isSynced ? 'is-plain' :
              i === currentLineIndex ? 'is-active' :
              Math.abs(i - currentLineIndex) === 1 ? 'is-near' :
              Math.abs(i - currentLineIndex) === 2 ? 'is-far' :
              Math.abs(i - currentLineIndex) === 3 ? 'is-distant' : 'is-hidden'
            ]"
          >{{ line.text || '···' }}</div>
          <div class="h-[55%]" />
        </div>
        <div class="absolute inset-x-0 bottom-0 h-20 pointer-events-none z-[2]" style="background: linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)" />
      </div>

      <!-- Progress bar -->
      <div class="h-[2px] shrink-0 relative cursor-pointer no-drag z-10" @click="onProgressClick">
        <div class="absolute inset-0 bg-white/10" />
        <div class="absolute inset-y-0 left-0 bg-white/60 transition-none" :style="{ width: player.progress + '%' }" />
      </div>

      <!-- Bottom control strip -->
      <div class="shrink-0 flex items-center gap-2 px-3 pt-2 pb-3 no-drag z-10" style="background: rgba(0,0,0,0.35); backdrop-filter: blur(20px)">
        <!-- Cover thumbnail — click to enter cover mode -->
        <div
          class="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0 cursor-pointer transition-transform hover:scale-105"
          @click="setMode('cover')"
          title="Cover view"
        >
          <img v-if="coverUrl" :src="coverUrl" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center">
            <svg class="w-4 h-4 text-white/20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-[11px] font-semibold truncate text-white leading-tight">{{ player.currentTrack?.title ?? 'Nothing playing' }}</p>
          <button
            v-if="player.currentTrack?.artist"
            @click="goToArtist()"
            class="text-[10px] text-white/45 truncate leading-tight mt-0.5 hover:text-white/70 transition-colors max-w-full text-left"
          >{{ player.currentTrack.artist }}</button>
          <p v-else class="text-[10px] text-white/45 leading-tight mt-0.5"></p>
        </div>
        <!-- Controls -->
        <div class="flex items-center gap-0.5 shrink-0">
          <button
            @click="player.toggleShuffle()"
            class="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            :class="player.isShuffle ? 'text-accent' : 'text-white/40 hover:text-white/70'"
          >
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
            </svg>
          </button>
          <button
            @click="currentTrackId ? favoritesStore.toggle(currentTrackId) : undefined"
            class="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            :class="currentTrackId && favoritesStore.isFavorite(currentTrackId) ? 'text-accent' : 'text-white/40 hover:text-white/70'"
          >
            <svg v-if="currentTrackId && favoritesStore.isFavorite(currentTrackId)" class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 17.5 3 20.58 3 23 5.42 23 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <svg v-else class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" />
            </svg>
          </button>
          <button @click="player.previous()" class="w-7 h-7 flex items-center justify-center rounded-full text-white/55 hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
          </button>
          <button @click="player.togglePlay()" class="w-9 h-9 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/85 active:scale-95 transition-all shadow-md">
            <svg v-if="player.isPlaying" class="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
            <svg v-else class="w-[18px] h-[18px] ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <button @click="player.next()" class="w-7 h-7 flex items-center justify-center rounded-full text-white/55 hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
          </button>
          <button
            @click="player.cycleRepeat()"
            class="w-7 h-7 flex items-center justify-center rounded-full transition-colors relative"
            :class="player.repeatMode !== 'off' ? 'text-accent' : 'text-white/40 hover:text-white/70'"
          >
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
            <span v-if="player.repeatMode === 'one'" class="absolute -top-0.5 -right-0.5 text-[7px] font-bold text-accent leading-none">1</span>
          </button>
        </div>
        <button
          @click="player.toggleMute()"
          @wheel.prevent="onVolumeWheel"
          class="w-6 h-6 flex items-center justify-center rounded-full transition-colors shrink-0"
          :class="player.isMuted || player.volume === 0 ? 'text-white/25' : 'text-white/40 hover:text-white/70'"
          title="Volume (scroll to adjust)"
        >
          <svg v-if="player.isMuted || player.volume === 0" class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          </svg>
          <svg v-else class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        </button>
        <button @click="exitMini" class="w-6 h-6 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 transition-colors shrink-0" title="Full player">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        </button>
      </div>

    </template>

    <!-- ══ COMPACT MODE ════════════════════════════════════════════════ -->
    <template v-else>
      <div class="flex-1 flex items-center gap-2 px-2 drag-region min-w-0">
        <!-- Cover thumbnail — click to enter cover mode -->
        <div
          class="w-12 h-12 rounded-lg overflow-hidden bg-white/10 shrink-0 no-drag cursor-pointer transition-transform hover:scale-105"
          @click="setMode('cover')"
          title="Cover view"
        >
          <img v-if="player.currentTrack?.coverArt" :src="coverUrl" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center">
            <svg class="w-5 h-5 text-white/20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold truncate text-white leading-tight">
            {{ player.currentTrack?.title ?? 'Nothing playing' }}
          </p>
          <button
            v-if="player.currentTrack?.artist"
            @click="goToArtist()"
            class="text-[10px] text-white/50 truncate leading-tight mt-0.5 hover:text-white/75 transition-colors no-drag max-w-full text-left"
          >{{ player.currentTrack.artist }}</button>
          <p v-else class="text-[10px] text-white/50 leading-tight mt-0.5"></p>
        </div>

        <div class="flex items-center gap-0.5 shrink-0 no-drag">
          <!-- Favorite -->
          <button
            @click="currentTrackId ? favoritesStore.toggle(currentTrackId) : undefined"
            class="w-6 h-6 flex items-center justify-center rounded-full transition-colors"
            :class="currentTrackId && favoritesStore.isFavorite(currentTrackId) ? 'text-accent' : 'text-white/40 hover:text-white/70'"
          >
            <svg v-if="currentTrackId && favoritesStore.isFavorite(currentTrackId)" class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 17.5 3 20.58 3 23 5.42 23 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <svg v-else class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" />
            </svg>
          </button>
          <!-- Shuffle -->
          <button
            @click="player.toggleShuffle()"
            class="w-6 h-6 flex items-center justify-center rounded-full transition-colors"
            :class="player.isShuffle ? 'text-accent' : 'text-white/40 hover:text-white/70'"
          >
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
            </svg>
          </button>
          <!-- Prev -->
          <button @click="player.previous()" class="w-6 h-6 flex items-center justify-center rounded-full text-white/60 hover:text-white transition-colors">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
          </button>
          <!-- Play/Pause -->
          <button @click="player.togglePlay()" class="w-8 h-8 flex items-center justify-center rounded-full bg-control text-control-fg hover:scale-105 active:scale-95 transition-all">
            <svg v-if="player.isPlaying" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
            <svg v-else class="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <!-- Next -->
          <button @click="player.next()" class="w-6 h-6 flex items-center justify-center rounded-full text-white/60 hover:text-white transition-colors">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
          </button>
          <!-- Repeat -->
          <button
            @click="player.cycleRepeat()"
            class="w-6 h-6 flex items-center justify-center rounded-full transition-colors relative"
            :class="player.repeatMode !== 'off' ? 'text-accent' : 'text-white/40 hover:text-white/70'"
          >
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
            <span v-if="player.repeatMode === 'one'" class="absolute -top-0.5 -right-0.5 text-[7px] font-bold text-accent leading-none">1</span>
          </button>
          <!-- Volume -->
          <button
            @click="player.toggleMute()"
            @wheel.prevent="onVolumeWheel"
            class="w-6 h-6 flex items-center justify-center rounded-full transition-colors"
            :class="player.isMuted || player.volume === 0 ? 'text-white/25' : 'text-white/40 hover:text-white/70'"
            title="Volume (scroll to adjust)"
          >
            <svg v-if="player.isMuted || player.volume === 0" class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
            <svg v-else class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          </button>
          <!-- Lyrics mode -->
          <button @click="setMode('lyrics')" class="w-6 h-6 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors" title="Lyrics view">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </button>
          <!-- Full player -->
          <button @click="exitMini" class="w-6 h-6 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors" title="Expand">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="h-1 shrink-0 relative cursor-pointer no-drag" @click="onProgressClick">
        <div class="absolute inset-0 bg-white/10" />
        <div class="absolute inset-y-0 left-0 bg-accent transition-none" :style="{ width: player.progress + '%' }" />
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useFavoritesStore } from '@/stores/favorites'
import { parseLRC, findCurrentLine, type LyricLine } from '@/utils/lrcParser'
import Hls from 'hls.js'
import TutorialPopup from '@/components/TutorialPopup.vue'

type MiniMode = 'compact' | 'cover' | 'lyrics'

const MODE_HEIGHT: Record<MiniMode, number> = {
  compact: 90,
  cover: 360,
  lyrics: 560,
}

const router = useRouter()
const player = usePlayerStore()
const favoritesStore = useFavoritesStore()

const mode = ref<MiniMode>('compact')
const videoEl = ref<HTMLVideoElement | null>(null)
const animatedActive = ref(false)
const lyricsScroll = ref<HTMLElement | null>(null)
const lineEls = ref<Record<number, HTMLElement>>({})

const lyricsLines = ref<LyricLine[]>([])
const isSynced = ref(false)
const lyricsLoading = ref(false)
const currentLineIndex = ref(-1)

// ── Cover mode overlay (idle-hide + window blur) ──────────────────────
const overlayVisible = ref(false)
let idleTimer: ReturnType<typeof setTimeout> | null = null

function onMouseMove() {
  if (mode.value !== 'cover') return
  overlayVisible.value = true
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => { overlayVisible.value = false }, 2200)
}

function onMouseLeave() {
  if (mode.value !== 'cover') return
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => { overlayVisible.value = false }, 400)
}

// Show controls when window loses focus (so you can see them without hovering)
function onWindowBlur() {
  if (mode.value !== 'cover') return
  overlayVisible.value = true
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
}

// When window regains focus, start fade timer
function onWindowFocus() {
  if (mode.value !== 'cover') return
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => { overlayVisible.value = false }, 2200)
}

onMounted(() => {
  window.addEventListener('blur', onWindowBlur)
  window.addEventListener('focus', onWindowFocus)
  favoritesStore.load()
})

// ── Cover URL ────────────────────────────────────────────────────────
const coverUrl = computed(() =>
  player.currentTrack?.coverArt ? window.api.getMediaUrl(player.currentTrack.coverArt) : '',
)

// ── Favorites helpers ────────────────────────────────────────────────
const currentTrackId = computed(() => player.currentTrack?.id ?? null)

// ── Mode switching ───────────────────────────────────────────────────
function setMode(newMode: MiniMode) {
  const prev = mode.value
  mode.value = newMode
  window.api.resizeMiniPlayer(MODE_HEIGHT[newMode])

  if (newMode === 'lyrics') {
    loadLyrics()
    if (player.animatedCoversEnabled && player.currentTrack) fetchAnimatedCover(player.currentTrack)
  } else if (newMode === 'cover') {
    overlayVisible.value = false
    if (player.animatedCoversEnabled && player.currentTrack) fetchAnimatedCover(player.currentTrack)
  } else {
    // compact
    if (prev !== 'compact') destroyHls()
    overlayVisible.value = false
  }
}

function exitMini() {
  destroyHls()
  window.api.exitMiniPlayer()
  router.push('/')
}

function goToArtist() {
  const artist = player.currentTrack?.artist
  if (!artist) return
  destroyHls()
  window.api.exitMiniPlayer()
  router.push(`/artist/${encodeURIComponent(artist)}`)
}

function onVolumeWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = -e.deltaY / 500
  const newVol = Math.max(0, Math.min(1, player.volume + delta))
  player.setVolume(newVol)
}

function onProgressClick(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  player.seekPercent((e.clientX - rect.left) / rect.width * 100)
}

// ── HLS animated cover ───────────────────────────────────────────────
let hlsInstance: Hls | null = null
let abortKey = ''

function destroyHls() {
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null }
  animatedActive.value = false
  if (videoEl.value) videoEl.value.src = ''
}

function attachHls(url: string) {
  destroyHls()
  nextTick(() => {
    const v = videoEl.value
    if (!v) return
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false, maxBufferLength: 10, maxMaxBufferLength: 30 })
      hls.loadSource(url)
      hls.attachMedia(v)
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        const avcLevels = data.levels
          .map((l: any, i: number) => ({ idx: i, codec: l.codecSet || '' }))
          .filter((l: any) => !l.codec.includes('hvc') && !l.codec.includes('hev'))
        if (avcLevels.length > 0) hls.currentLevel = avcLevels[avcLevels.length - 1].idx
        v.play().catch(() => {})
        animatedActive.value = true
      })
      hls.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) destroyHls() })
      hlsInstance = hls
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = url
      v.addEventListener('loadedmetadata', () => { v.play().catch(() => {}); animatedActive.value = true }, { once: true })
    }
  })
}

async function fetchAnimatedCover(track: Track) {
  const key = `${track.album}---${track.albumArtist || track.artist}`
  abortKey = key
  try {
    const hlsUrl = await window.api.getAnimatedCover(track.album || '', track.albumArtist || track.artist || '')
    if (abortKey !== key) return
    if (hlsUrl) attachHls(hlsUrl)
  } catch { /* ignore */ }
}

// ── Lyrics ───────────────────────────────────────────────────────────
async function loadLyrics() {
  const track = player.currentTrack
  lyricsLines.value = []
  isSynced.value = false
  currentLineIndex.value = -1
  lineEls.value = {}
  if (!track) return

  lyricsLoading.value = true
  try {
    const lrc = await window.api.getLyrics(track.path)
    if (lrc) {
      if (lrc === '[instrumental]') return // cached sentinel: no lyrics exist, skip online fetch
      const parsed = parseLRC(lrc)
      if (parsed.length > 0) { lyricsLines.value = parsed; isSynced.value = true; return }
      lyricsLines.value = lrc.split('\n').filter(l => l.trim()).map(t => ({ text: t.trim(), time: 0 }))
      return
    }
    const onlineLrc = await window.api.fetchOnlineLyrics({
      path: track.path, title: track.title, artist: track.artist,
      album: track.album, duration: track.duration,
    })
    if (onlineLrc) {
      const parsed = parseLRC(onlineLrc)
      if (parsed.length > 0) { lyricsLines.value = parsed; isSynced.value = true }
      else { lyricsLines.value = onlineLrc.split('\n').filter(l => l.trim()).map(t => ({ text: t.trim(), time: 0 })) }
    }
  } catch { /* ignore */ } finally {
    lyricsLoading.value = false
  }
}

watch(() => player.currentTime, (time) => {
  if (mode.value !== 'lyrics' || !isSynced.value || lyricsLines.value.length === 0) return
  const idx = findCurrentLine(lyricsLines.value, time + player.lyricsOffset)
  if (idx !== currentLineIndex.value) {
    currentLineIndex.value = idx
    nextTick(() => {
      const el = lineEls.value[idx]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }
})

watch(() => player.currentTrack?.path, () => {
  if (mode.value === 'lyrics') { loadLyrics(); destroyHls() }
  else if (mode.value === 'cover') destroyHls()
  if (mode.value !== 'compact' && player.animatedCoversEnabled && player.currentTrack) {
    fetchAnimatedCover(player.currentTrack)
  }
})

watch(() => player.animatedCoversEnabled, (enabled) => {
  if (mode.value === 'compact') return
  if (!enabled) destroyHls()
  else if (player.currentTrack) fetchAnimatedCover(player.currentTrack)
})

onUnmounted(() => {
  destroyHls()
  if (idleTimer) clearTimeout(idleTimer)
  window.removeEventListener('blur', onWindowBlur)
  window.removeEventListener('focus', onWindowFocus)
})
</script>

<style scoped>
/* ── Overlay transition ── */
.cover-overlay-enter-active,
.cover-overlay-leave-active {
  transition: opacity 0.25s ease;
}
.cover-overlay-enter-from,
.cover-overlay-leave-to {
  opacity: 0;
}

/* ── Overlay icon buttons ── */
.overlay-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.65);
  transition: background 0.15s, color 0.15s;
}
.overlay-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  color: white;
}

/* ── Lyrics scroll ── */
.mini-lyrics { scrollbar-width: none; overflow-x: hidden; }
.mini-lyrics::-webkit-scrollbar { display: none; }

/*
  Scale-based cascade: all lines share the same font-size so there's no
  layout reflow when the active line changes. transform: scale() gives
  the visual size difference without shifting any sibling lines.
*/
.mini-lyric-line {
  display: block;
  text-align: left;
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.25;
  padding-top: 8px;
  padding-bottom: 8px;
  transform-origin: left center;
  transform: scale(0.62);
  color: rgba(255, 255, 255, 0.04);
  transition:
    transform 0.38s cubic-bezier(0.4, 0, 0.2, 1),
    color     0.38s ease-out;
  will-change: transform, color;
}
.mini-lyric-line.is-active {
  transform: scale(1.52);
  font-weight: 900;
  color: rgba(255, 255, 255, 0.97);
  text-shadow: 0 1px 20px rgba(255,255,255,0.10), 0 0 40px rgba(180,130,255,0.18);
}
.mini-lyric-line.is-near {
  transform: scale(0.93);
  color: rgba(255, 255, 255, 0.32);
}
.mini-lyric-line.is-far {
  transform: scale(0.80);
  color: rgba(255, 255, 255, 0.15);
}
.mini-lyric-line.is-distant {
  transform: scale(0.70);
  color: rgba(255, 255, 255, 0.08);
}
.mini-lyric-line.is-hidden {
  transform: scale(0.62);
  color: rgba(255, 255, 255, 0.03);
}
.mini-lyric-line.is-plain {
  transform: scale(1.0);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
}
.mini-lyric-line:not(.is-active):not(.is-plain):hover {
  color: rgba(255, 255, 255, 0.22);
}
</style>
