import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { pluginBus } from '@/plugins/eventBus'

// Lazy accessor for library store to avoid circular dependency
// Must not use require() — Vite doesn't resolve @/ aliases in require() calls
let _libStore: any = null
function getLibStore() {
  if (!_libStore) {
    // Dynamic import resolved at module level by Vite, called lazily
    _libStore = (window as any).__auroraLibStore
  }
  return _libStore
}

export const usePlayerStore = defineStore('player', () => {
  // ── Internal audio element ───────────────────────────────────────────────
  const audio = new Audio()
  audio.preload = 'auto'
  audio.crossOrigin = 'anonymous' // Required for Web Audio API with cross-origin sources (e.g. Navidrome streams)

  // ── Subsonic stream preload system ─────────────────────────────────────
  // Two-tier cache:
  //  1. _urlCache   – resolved stream URLs for ALL subsonic tracks in the
  //                   queue. Just strings, negligible memory. Eliminates
  //                   IPC + HTTP round-trip on every track change.
  //  2. _bufferCache – live Audio elements that pre-download audio data
  //                    for a sliding window around the current track
  //                    (1 behind, 3 ahead). These consume real bandwidth
  //                    but guarantee gapless playback on slow connections.
  //
  // When loadTrack() runs, the URL is resolved instantly from _urlCache.
  // The browser often serves the same URL from its HTTP/disk cache because
  // the buffer element already fetched (or is fetching) that data.
  // Consumed buffer elements are kept alive for 30 s so the HTTP cache
  // entry doesn't get evicted before the main <audio> finishes loading.

  const _urlCache = new Map<string, string>()           // trackId → streamUrl
  const _urlInFlight = new Set<string>()                // trackIds being resolved
  const _bufferCache = new Map<string, HTMLAudioElement>() // trackId → preloading Audio
  const _disposalTimers = new Map<string, ReturnType<typeof setTimeout>>() // delayed cleanup

  // How many tracks to buffer ahead / behind the current index
  const BUFFER_AHEAD = 3
  const BUFFER_BEHIND = 1

  /** Resolve stream URLs for every subsonic track in the queue. Cheap (string
   *  only) and done in small batches to avoid flooding the server. */
  function _resolveAllUrls() {
    const q = queue.value
    for (const track of q) {
      if (
        track.source !== 'subsonic' ||
        !track.path.startsWith('subsonic://') ||
        _urlCache.has(track.id) ||
        _urlInFlight.has(track.id)
      ) continue

      _urlInFlight.add(track.id)
      const songId = track.path.replace('subsonic://', '')
      window.api.subsonicGetStreamUrl(songId).then((url) => {
        _urlInFlight.delete(track.id)
        _urlCache.set(track.id, url)
      }).catch(() => {
        _urlInFlight.delete(track.id)
      })
    }
  }

  /** Maintain the audio-buffer sliding window (1 behind, 3 ahead). */
  function _updateBufferWindow() {
    const idx = currentIndex.value
    const q = queue.value

    // Determine which track IDs should have active buffer elements
    const wantBuffered = new Set<string>()
    const lo = Math.max(0, idx - BUFFER_BEHIND)
    const hi = Math.min(q.length - 1, idx + BUFFER_AHEAD)
    for (let i = lo; i <= hi; i++) {
      const t = q[i]
      if (t && t.source === 'subsonic' && t.path.startsWith('subsonic://')) {
        wantBuffered.add(t.id)
      }
    }

    // Evict buffer entries outside the window (with delayed disposal)
    for (const [id, el] of _bufferCache) {
      if (!wantBuffered.has(id)) {
        _bufferCache.delete(id)
        _scheduleDisposal(id, el)
      }
    }

    // Create buffer elements for tracks in the window that aren't buffered yet
    for (let i = lo; i <= hi; i++) {
      const t = q[i]
      if (!t || t.source !== 'subsonic' || !t.path.startsWith('subsonic://')) continue
      if (_bufferCache.has(t.id)) continue

      // We need a resolved URL to start buffering
      const url = _urlCache.get(t.id)
      if (!url) {
        // URL not ready yet — _resolveAllUrls is working on it.
        // We'll pick it up on the next _updateBufferWindow call.
        continue
      }

      // Cancel any pending delayed disposal for this track (re-entering window)
      _cancelDisposal(t.id)

      const preAudio = new Audio()
      preAudio.preload = 'auto'
      preAudio.crossOrigin = 'anonymous'
      preAudio.src = url
      preAudio.load()
      _bufferCache.set(t.id, preAudio)
    }
  }

  /** Schedule delayed disposal of a buffer element so the browser HTTP cache
   *  stays warm for the main audio element. */
  function _scheduleDisposal(id: string, el: HTMLAudioElement) {
    // If thre's already a pending timer for a different element, clear it
    _cancelDisposal(id)
    _disposalTimers.set(id, setTimeout(() => {
      el.src = ''
      el.load()
      _disposalTimers.delete(id)
    }, 30_000))
  }

  function _cancelDisposal(id: string) {
    const timer = _disposalTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      _disposalTimers.delete(id)
    }
  }

  /** Main preload entry point — call after track loads or queue mutations. */
  function _preloadAdjacent() {
    _resolveAllUrls()
    _updateBufferWindow()

    // Retry buffer creation shortly — some URLs may still be in flight
    setTimeout(_updateBufferWindow, 1500)
  }

  /** Get a resolved stream URL from cache (returns null if not yet resolved). */
  function _getCachedUrl(trackId: string): string | null {
    return _urlCache.get(trackId) ?? null
  }

  /** Dispose all preload caches (on clearQueue etc.) */
  function _disposePreloadCache() {
    for (const [, el] of _bufferCache) { el.src = ''; el.load() }
    _bufferCache.clear()
    for (const [, timer] of _disposalTimers) clearTimeout(timer)
    _disposalTimers.clear()
    _urlCache.clear()
    _urlInFlight.clear()
  }

  // ── Web Audio API chain for normalization ───────────────────────────────
  let audioCtx: AudioContext | null = null
  let sourceNode: MediaElementAudioSourceNode | null = null
  let compressorNode: DynamicsCompressorNode | null = null
  let gainNode: GainNode | null = null
  let analyserNode: AnalyserNode | null = null
  const frequencyBuf = new Uint8Array(128)

  // ── Exclusive mode (process-level flag from main process) ──────────────
  let exclusiveModeActive = false
  // Query async at init, stored for AudioContext creation
  window.api.getExclusiveStatus().then(s => { exclusiveModeActive = s.active }).catch(() => {})

  function createAudioContext(): AudioContext {
    // When exclusive mode is active, use 'playback' latency hint for higher quality
    // and avoid unnecessary processing. Otherwise use default (interactive).
    const opts: AudioContextOptions = exclusiveModeActive
      ? { latencyHint: 'playback' }
      : {}
    return new AudioContext(opts)
  }

  function initAudioChain() {
    if (audioCtx) return
    audioCtx = createAudioContext()
    sourceNode = audioCtx.createMediaElementSource(audio)
    compressorNode = audioCtx.createDynamicsCompressor()
    // Gentle normalization settings
    compressorNode.threshold.value = -24   // start compressing at -24dB
    compressorNode.knee.value = 12         // soft knee
    compressorNode.ratio.value = 4         // 4:1 compression
    compressorNode.attack.value = 0.003    // fast attack
    compressorNode.release.value = 0.25    // moderate release
    gainNode = audioCtx.createGain()
    gainNode.gain.value = 1.4              // make-up gain
    analyserNode = audioCtx.createAnalyser()
    analyserNode.fftSize = 256
    analyserNode.smoothingTimeConstant = 0.8
    // Chain: source -> compressor -> gain -> analyser -> output
    sourceNode.connect(compressorNode)
    compressorNode.connect(gainNode)
    gainNode.connect(analyserNode)
    analyserNode.connect(audioCtx.destination)
  }

  function initAudioBypass() {
    if (audioCtx) return
    audioCtx = createAudioContext()
    sourceNode = audioCtx.createMediaElementSource(audio)
    analyserNode = audioCtx.createAnalyser()
    analyserNode.fftSize = 256
    analyserNode.smoothingTimeConstant = 0.8
    sourceNode.connect(analyserNode)
    analyserNode.connect(audioCtx.destination)
  }
  // ── Reactive state ───────────────────────────────────────────────────────
  const currentTrack = ref<Track | null>(null)
  const queue = ref<Track[]>([])
  const originalQueue = ref<Track[]>([])
  const currentIndex = ref(-1)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(0.8)
  const isMuted = ref(false)
  const isShuffle = ref(false)
  const repeatMode = ref<'off' | 'all' | 'one'>('off')
  const isLoading = ref(false)

  // ── Audio output device ─────────────────────────────────────────────────
  const outputDeviceId = ref('')
  const audioDevices = ref<MediaDeviceInfo[]>([])

  async function enumerateOutputDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      audioDevices.value = devices.filter(d => d.kind === 'audiooutput')
    } catch (err) {
      console.error('Failed to enumerate devices:', err)
    }
  }

  async function setOutputDevice(deviceId: string) {
    try {
      if ((audio as any).setSinkId) {
        await (audio as any).setSinkId(deviceId)
        outputDeviceId.value = deviceId
        const s = await window.api.getSettings()
        s.outputDeviceId = deviceId
        await window.api.saveSettings(s)
      }
    } catch (err) {
      console.error('Failed to set output device:', err)
    }
  }

  // ── Lyrics offset ───────────────────────────────────────────────────────
  const lyricsOffset = ref(0) // in seconds (positive = lyrics earlier, negative = later)

  // ── Waveform data ──────────────────────────────────────────────────────
  const waveformData = ref<number[]>([])
  const waveformEnabled = ref(true)
  const waveformCache = new Map<string, number[]>()

  // ── Animated covers ────────────────────────────────────────────────────
  const animatedCoversEnabled = ref(true)
  const pauseAnimatedOnBlur = ref(false)

  async function generateWaveform(trackPath: string) {
    if (waveformCache.has(trackPath)) {
      waveformData.value = waveformCache.get(trackPath)!
      return
    }
    waveformData.value = []
    try {
      const result = await window.api.generateWaveform(trackPath)
      if (result && result.length > 0) {
        waveformCache.set(trackPath, result)
        waveformData.value = result
      }
    } catch (err) {
      console.error('Waveform generation error:', err)
      waveformData.value = []
    }
  }

  async function generateSubsonicWaveform(songId: string) {
    const cacheKey = `subsonic-${songId}`
    if (waveformCache.has(cacheKey)) {
      waveformData.value = waveformCache.get(cacheKey)!
      return
    }
    waveformData.value = []
    try {
      const result = await window.api.generateWaveformSubsonic(songId)
      if (result && result.length > 0) {
        waveformCache.set(cacheKey, result)
        waveformData.value = result
      }
    } catch (err) {
      console.error('Subsonic waveform generation error:', err)
      waveformData.value = []
    }
  }

  // ── Adaptive accent ────────────────────────────────────────────────────
  const adaptiveAccent = ref(true)
  const currentAccentColor = ref<string | null>(null)

  // ── iOS-style sliders ──────────────────────────────────────────────────
  const iosSliders = ref(true)

  // ── Transparency ───────────────────────────────────────────────────
  const transparencyEnabled = ref(true) // default on

  // ── Auto-fullscreen on idle ─────────────────────────────────────────
  const autoFullscreen = ref(false)
  const autoFullscreenDelay = ref(30) // seconds

  // ── Audio normalization ───────────────────────────────────────────────
  const normalization = ref(false)

  // ── LRC sync mode (pause at end of track instead of advancing) ────────
  const lrcSyncMode = ref(false)

  // ── Sleep timer ─────────────────────────────────────────────────────────
  const sleepTimerMode = ref<null | 'song' | 'album' | 'time'>(null)
  const sleepTimerEndTime = ref<number | null>(null) // ms timestamp for 'time' mode
  const sleepTimerRemaining = ref(0) // seconds remaining (updated by interval)
  let sleepTimerInterval: ReturnType<typeof setInterval> | null = null

  function startSleepTimer(mode: 'song' | 'album' | 'time', minutes?: number) {
    cancelSleepTimer()
    sleepTimerMode.value = mode
    if (mode === 'time' && minutes && minutes > 0) {
      sleepTimerEndTime.value = Date.now() + minutes * 60 * 1000
      sleepTimerRemaining.value = minutes * 60
      sleepTimerInterval = setInterval(() => {
        if (!sleepTimerEndTime.value) { cancelSleepTimer(); return }
        const left = Math.max(0, Math.round((sleepTimerEndTime.value - Date.now()) / 1000))
        sleepTimerRemaining.value = left
        if (left <= 0) {
          pause()
          cancelSleepTimer()
        }
      }, 1000)
    }
  }

  function cancelSleepTimer() {
    sleepTimerMode.value = null
    sleepTimerEndTime.value = null
    sleepTimerRemaining.value = 0
    if (sleepTimerInterval) { clearInterval(sleepTimerInterval); sleepTimerInterval = null }
  }

  // ── Scrobbling ──────────────────────────────────────────────────────────
  let scrobblingEnabled = false
  let scrobbleTimer: ReturnType<typeof setTimeout> | null = null
  let scrobbleReported = false

  // ── Computed ─────────────────────────────────────────────────────────────
  const progress = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
  })

  const hasNext = computed(() => {
    if (repeatMode.value !== 'off') return true
    return currentIndex.value < queue.value.length - 1
  })

  const hasPrevious = computed(() => {
    if (repeatMode.value !== 'off') return true
    return currentIndex.value > 0
  })

  // ── Audio event listeners ────────────────────────────────────────────────
  audio.addEventListener('timeupdate', () => {
    currentTime.value = audio.currentTime
    // Scrobble after listening to 50% or 4 minutes, whichever is first
    if (scrobblingEnabled && !scrobbleReported && currentTrack.value && duration.value > 30) {
      const threshold = Math.min(duration.value * 0.5, 240)
      if (audio.currentTime >= threshold) {
        scrobbleReported = true
        window.api.scrobbleTrack({
          title: currentTrack.value.title,
          artist: currentTrack.value.artist,
          album: currentTrack.value.album,
          duration: duration.value,
          timestamp: Date.now(),
        }).catch(() => {})
      }
    }
  })
  audio.addEventListener('durationchange', () => {
    duration.value = audio.duration
  })
  audio.addEventListener('ended', () => handleTrackEnd())
  audio.addEventListener('playing', () => {
    isPlaying.value = true
    isLoading.value = false
    pluginBus.emit('play')
  })
  audio.addEventListener('pause', () => {
    isPlaying.value = false
    pluginBus.emit('pause')
  })
  audio.addEventListener('waiting', () => {
    isLoading.value = true
  })
  audio.addEventListener('canplay', () => {
    isLoading.value = false
  })

  // Track playback errors with meaningful messages and auto-skip
  const playbackError = ref<string | null>(null)
  let errorSkipTimeout: ReturnType<typeof setTimeout> | null = null

  audio.addEventListener('error', () => {
    // Ignore errors from intentional queue clearing (audio.src = '')
    if (!currentTrack.value) return
    isLoading.value = false
    isPlaying.value = false
    const err = audio.error
    const codes: Record<number, string> = {
      1: 'Playback aborted',
      2: 'Network error loading file',
      3: 'Codec/decode error — format may not be supported',
      4: 'Source not supported — file format not playable',
    }
    const msg = err ? (codes[err.code] || `Unknown error (code ${err.code})`) : 'Unknown playback error'
    const trackName = currentTrack.value ? `${currentTrack.value.artist} - ${currentTrack.value.title}` : 'Unknown'
    console.error(`Audio error for "${trackName}": ${msg}`)
    playbackError.value = `Cannot play "${currentTrack.value?.title || 'track'}": ${msg}`

    // Auto-skip to next track after a short delay (avoid rapid loops)
    if (errorSkipTimeout) clearTimeout(errorSkipTimeout)
    errorSkipTimeout = setTimeout(() => {
      playbackError.value = null
      if (queue.value.length > 1) next()
    }, 2000)
  })

  // ── Watchers ─────────────────────────────────────────────────────────────
  // Apply a quadratic curve so the slider feels more natural
  // (perceived loudness is logarithmic; linear volume is way too loud at the top)
  audio.volume = volume.value * volume.value

  watch(volume, (val) => {
    audio.volume = val * val
    if (val > 0 && isMuted.value) isMuted.value = false
    // Persist volume
    window.api.getSettings().then((s: any) => {
      s.volume = val
      window.api.saveSettings(s)
    })
  })

  watch(isMuted, (val) => {
    audio.muted = val
  })

  // ── Restore persisted playback settings ────────────────────────────────────
  window.api.getSettings().then((s: any) => {
    if (s.volume !== undefined) {
      volume.value = s.volume
      audio.volume = s.volume * s.volume
    }
    if (s.shuffle === true) isShuffle.value = true
    if (s.repeatMode && ['off', 'all', 'one'].includes(s.repeatMode)) repeatMode.value = s.repeatMode
    if (s.muted === true) { isMuted.value = true; audio.muted = true }
    if (s.lyricsOffset !== undefined) lyricsOffset.value = s.lyricsOffset
    if (typeof s.waveformEnabled === 'boolean') waveformEnabled.value = s.waveformEnabled
    if (typeof s.animatedCoversEnabled === 'boolean') animatedCoversEnabled.value = s.animatedCoversEnabled
    if (typeof s.pauseAnimatedOnBlur === 'boolean') pauseAnimatedOnBlur.value = s.pauseAnimatedOnBlur
    if (typeof s.adaptiveAccent === 'boolean') adaptiveAccent.value = s.adaptiveAccent
    if (typeof s.iosSliders === 'boolean') iosSliders.value = s.iosSliders
    if (s.transparencyEnabled === false) transparencyEnabled.value = false
    if (s.autoFullscreen === true) autoFullscreen.value = true
    if (s.autoFullscreenDelay !== undefined) autoFullscreenDelay.value = s.autoFullscreenDelay
    if (s.normalization === true) {
      normalization.value = true
      initAudioChain()
    } else {
      initAudioBypass()
    }
    if (s.outputDeviceId) {
      setOutputDevice(s.outputDeviceId).catch(() => {})
    }
    scrobblingEnabled = s.scrobblingEnabled === true
  })

  // ── MediaSession action handlers (MPRIS integration) ─────────────────────
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => play())
    navigator.mediaSession.setActionHandler('pause', () => pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => previous())
    navigator.mediaSession.setActionHandler('nexttrack', () => next())
    navigator.mediaSession.setActionHandler('stop', () => { pause(); audio.currentTime = 0 })
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) seek(details.seekTime)
    })
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      seek(Math.max(0, audio.currentTime - (details.seekOffset || 10)))
    })
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      seek(Math.min(duration.value, audio.currentTime + (details.seekOffset || 10)))
    })
  }

  // Keep MediaSession playback state in sync
  watch(isPlaying, (playing) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
    }
    // MPRIS playback status
    window.api.mprisSendPlaybackStatus(playing ? 'Playing' : 'Paused')
  })

  // Update MediaSession position state periodically
  function updatePositionState() {
    if ('mediaSession' in navigator && duration.value > 0 && isFinite(duration.value)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration.value,
          playbackRate: audio.playbackRate,
          position: Math.min(currentTime.value, duration.value),
        })
      } catch { /* ignore invalid state errors */ }
    }
    // MPRIS position (send every timeupdate, the MPRIS module just stores the value)
    window.api.mprisSendPosition(currentTime.value)
  }
  // Update position when time or duration changes
  audio.addEventListener('timeupdate', updatePositionState)
  audio.addEventListener('durationchange', updatePositionState)

  // Send volume changes to MPRIS
  watch(volume, (val) => {
    window.api.mprisSendVolume(val)
  })

  // Send repeat/shuffle changes to MPRIS
  watch(repeatMode, (mode) => {
    window.api.mprisSendLoopStatus(mode)
  })
  watch(isShuffle, (val) => {
    window.api.mprisSendShuffle(val)
  })

  // Listen for MPRIS commands from the main process
  window.api.onMprisCommand((command: string, data?: any) => {
    switch (command) {
      case 'play': play(); break
      case 'pause': pause(); break
      case 'playPause': togglePlay(); break
      case 'next': next(); break
      case 'previous': previous(); break
      case 'stop': pause(); audio.currentTime = 0; break
      case 'seek': seek(Math.max(0, audio.currentTime + (data || 0))); window.api.mprisSendSeeked(audio.currentTime); break
      case 'seekAbsolute': seek(data || 0); window.api.mprisSendSeeked(data || 0); break
      case 'volume': setVolume(data || 0); break
      case 'loop': {
        const map: Record<string, 'off' | 'all' | 'one'> = { None: 'off', Playlist: 'all', Track: 'one' }
        if (map[data]) repeatMode.value = map[data]
        break
      }
      case 'shuffle': isShuffle.value = !!data; break
    }
  })

  // Enumerate audio devices on init
  enumerateOutputDevices()
  navigator.mediaDevices?.addEventListener('devicechange', enumerateOutputDevices)

  // Persist shuffle / repeat / mute when they change
  watch(isShuffle, (val) => {
    window.api.getSettings().then((s: any) => { s.shuffle = val; window.api.saveSettings(s) })
  })
  watch(repeatMode, (val) => {
    window.api.getSettings().then((s: any) => { s.repeatMode = val; window.api.saveSettings(s) })
  })
  watch(isMuted, (val) => {
    window.api.getSettings().then((s: any) => { s.muted = val; window.api.saveSettings(s) })
  })

  // ── Discord Rich Presence sync ───────────────────────────────────────────
  let discordFormat = 'title-artist'
  let discordEnabled = true

  // Load settings once
  window.api.getSettings().then((s: any) => {
    if (s.discordRPCFormat) discordFormat = s.discordRPCFormat
    if (s.discordRPC === false) discordEnabled = false
  })

  function sendDiscordUpdate() {
    if (!discordEnabled) return
    const track = currentTrack.value
    if (!track || !isPlaying.value) {
      window.api.updateDiscordPresence(null)
      return
    }
    window.api.updateDiscordPresence({
      title: track.title,
      artist: track.artist,
      album: track.album,
      isPlaying: isPlaying.value,
      duration: duration.value,
      elapsed: currentTime.value,
      format: discordFormat,
    })
  }

  function setDiscordFormat(fmt: string) {
    discordFormat = fmt
    sendDiscordUpdate()
  }

  function setDiscordEnabled(enabled: boolean) {
    discordEnabled = enabled
    if (!enabled) {
      window.api.updateDiscordPresence(null)
    } else {
      sendDiscordUpdate()
    }
  }

  // Update Discord on track change and play/pause
  watch(currentTrack, () => {
    // Small delay to let isPlaying settle
    setTimeout(sendDiscordUpdate, 500)
  })

  watch(isPlaying, () => {
    sendDiscordUpdate()
  })

  // ── Internal helpers ─────────────────────────────────────────────────────
  async function loadTrack(track: Track) {
    currentTrack.value = track
    duration.value = track.duration || 0
    isLoading.value = true

    // Notify plugins of track change
    pluginBus.emit('trackChange', { ...track })

    // Resolve audio source
    if (track.source === 'subsonic' && track.path.startsWith('subsonic://')) {
      // Try the URL cache first (instant), fall back to live IPC resolve
      const cachedUrl = _getCachedUrl(track.id)
      if (cachedUrl) {
        audio.src = cachedUrl
      } else {
        const songId = track.path.replace('subsonic://', '')
        const url = await window.api.subsonicGetStreamUrl(songId)
        _urlCache.set(track.id, url)   // populate cache for future use
        audio.src = url
      }
      // Wait for remote stream to become playable before returning
      await new Promise<void>((resolve) => {
        audio.addEventListener('canplay', () => resolve(), { once: true })
        audio.addEventListener('error', () => resolve(), { once: true })
        audio.load()
      })
    } else {
      audio.src = window.api.getMediaUrl(track.path)
      audio.load()
    }

    // Update preload caches (resolve remaining URLs + shift buffer window)
    _preloadAdjacent()

    // Reset scrobble tracking for new track
    scrobbleReported = false
    if (scrobbleTimer) { clearTimeout(scrobbleTimer); scrobbleTimer = null }

    // Generate waveform if enabled
    if (waveformEnabled.value) {
      if (track.source === 'subsonic' && track.path.startsWith('subsonic://')) {
        const songId = track.path.replace('subsonic://', '')
        generateSubsonicWaveform(songId)
      } else {
        generateWaveform(track.path)
      }
    }

    // Scrobble: update now playing
    if (scrobblingEnabled) {
      window.api.updateNowPlaying({
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
      }).catch(() => {})
    }

    // MediaSession metadata (for system integration)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: track.coverArt
          ? [{ src: window.api.getMediaUrl(track.coverArt), sizes: '512x512', type: 'image/jpeg' }]
          : [],
      })
    }

    // MPRIS metadata (custom D-Bus service for Linux)
    if (track.coverArt) {
      if (track.source === 'subsonic') {
        // Subsonic cover art is already an HTTP URL
        window.api.mprisSendMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album,
          artUrl: track.coverArt,
          length: track.duration || 0,
          trackId: `/org/mpris/MediaPlayer2/Track/${track.id?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown'}`,
        })
      } else {
        window.api.getCoverFileUrl(track.coverArt).then((artUrl: string) => {
          window.api.mprisSendMetadata({
            title: track.title,
            artist: track.artist,
            album: track.album,
            artUrl,
            length: track.duration || 0,
            trackId: `/org/mpris/MediaPlayer2/Track/${track.id?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown'}`,
          })
        }).catch(() => {
          window.api.mprisSendMetadata({
            title: track.title,
            artist: track.artist,
            album: track.album,
            length: track.duration || 0,
          })
        })
      }
    } else {
      window.api.mprisSendMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        length: track.duration || 0,
      })
    }
  }

  function handleTrackEnd() {
    // LRC sync mode: pause at end so user can save their work
    if (lrcSyncMode.value) {
      audio.currentTime = 0
      pause()
      return
    }

    // Sleep timer: "after this song" — pause immediately
    if (sleepTimerMode.value === 'song') {
      cancelSleepTimer()
      return // don't advance, just stop
    }

    // Sleep timer: "after this album" — pause if next track is a different album
    if (sleepTimerMode.value === 'album') {
      const currentAlbum = currentTrack.value?.album
      const nextIdx = currentIndex.value + 1
      const nextTrack = nextIdx < queue.value.length ? queue.value[nextIdx] : null
      if (!nextTrack || nextTrack.album !== currentAlbum) {
        cancelSleepTimer()
        return // album finished, stop
      }
    }

    if (repeatMode.value === 'one') {
      audio.currentTime = 0
      audio.play()
    } else {
      next()
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  async function play(track?: Track) {
    if (track) {
      const idx = queue.value.findIndex((t) => t.id === track.id)
      if (idx >= 0) {
        currentIndex.value = idx
      } else {
        queue.value.push(track)
        currentIndex.value = queue.value.length - 1
      }
      await loadTrack(track)
    }

    try {
      await audio.play()
    } catch (err) {
      console.error('Play error:', err)
    }
  }

  function pause() {
    audio.pause()
  }

  function togglePlay() {
    if (isPlaying.value) pause()
    else play()
  }

  async function next() {
    if (queue.value.length === 0) return
    let nextIdx = currentIndex.value + 1
    if (nextIdx >= queue.value.length) {
      if (repeatMode.value === 'all') nextIdx = 0
      else return
    }
    currentIndex.value = nextIdx
    await loadTrack(queue.value[nextIdx])
    play()
  }

  async function previous() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    if (queue.value.length === 0) return

    let prevIdx = currentIndex.value - 1
    if (prevIdx < 0) {
      if (repeatMode.value === 'all') prevIdx = queue.value.length - 1
      else {
        audio.currentTime = 0
        return
      }
    }
    currentIndex.value = prevIdx
    await loadTrack(queue.value[prevIdx])
    play()
  }

  function seek(time: number) {
    audio.currentTime = time
    currentTime.value = time
    pluginBus.emit('seek', time)
    sendDiscordUpdate()
  }

  function seekPercent(percent: number) {
    seek((percent / 100) * duration.value)
  }

  function setVolume(val: number) {
    volume.value = Math.max(0, Math.min(1, val))
    pluginBus.emit('volumeChange', volume.value)
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
  }

  function toggleShuffle() {
    isShuffle.value = !isShuffle.value
    if (isShuffle.value) {
      originalQueue.value = [...queue.value]
      const current = queue.value[currentIndex.value]
      const rest = queue.value.filter((_, i) => i !== currentIndex.value)
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[rest[i], rest[j]] = [rest[j], rest[i]]
      }
      queue.value = [current, ...rest]
      currentIndex.value = 0
    } else {
      const current = currentTrack.value
      queue.value = [...originalQueue.value]
      if (current) {
        currentIndex.value = queue.value.findIndex((t) => t.id === current.id)
      }
    }
    _preloadAdjacent()
  }

  function cycleRepeat() {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one']
    repeatMode.value = modes[(modes.indexOf(repeatMode.value) + 1) % 3]
  }

  async function playAll(tracks: Track[], startIndex = 0) {
    originalQueue.value = [...tracks]
    if (isShuffle.value) {
      // Keep the starting track first, shuffle the rest
      const startTrack = tracks[startIndex]
      const rest = tracks.filter((_, i) => i !== startIndex)
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]]
      }
      queue.value = [startTrack, ...rest]
      currentIndex.value = 0
      pluginBus.emit('queueChange', queue.value)
      await loadTrack(startTrack)
    } else {
      queue.value = [...tracks]
      currentIndex.value = startIndex
      pluginBus.emit('queueChange', queue.value)
      await loadTrack(tracks[startIndex])
    }
    play()
  }

  async function addToQueue(tracks: Track[]) {
    queue.value.push(...tracks)
    originalQueue.value.push(...tracks)
    pluginBus.emit('queueChange', queue.value)
    // If nothing is playing, start from the first added track
    if (!currentTrack.value && tracks.length > 0) {
      currentIndex.value = queue.value.length - tracks.length
      await loadTrack(queue.value[currentIndex.value])
      play()
    } else {
      _preloadAdjacent()
    }
  }

  function clearQueue() {
    queue.value = []
    originalQueue.value = []
    currentIndex.value = -1
    currentTrack.value = null
    audio.src = ''
    isPlaying.value = false
    pluginBus.emit('queueChange', queue.value)
    _disposePreloadCache()
  }

  function removeFromQueue(index: number) {
    if (index < 0 || index >= queue.value.length) return
    if (index === currentIndex.value) {
      // Removing current track – play next if available
      queue.value.splice(index, 1)
      if (queue.value.length === 0) {
        clearQueue()
      } else {
        if (currentIndex.value >= queue.value.length) currentIndex.value = 0
        loadTrack(queue.value[currentIndex.value])
        play()
      }
    } else {
      queue.value.splice(index, 1)
      if (index < currentIndex.value) currentIndex.value--
      _preloadAdjacent()
    }
  }

  function playFromQueue(index: number) {
    if (index < 0 || index >= queue.value.length) return
    currentIndex.value = index
    loadTrack(queue.value[index])
    play()
  }

  /** Insert a track right after the currently playing track */
  function playNext(trackOrTracks: Track | Track[]) {
    const tracks = Array.isArray(trackOrTracks) ? trackOrTracks : [trackOrTracks]
    if (tracks.length === 0) return

    if (queue.value.length === 0 || currentIndex.value < 0) {
      // Nothing playing – just start it
      queue.value = [...tracks]
      originalQueue.value = [...tracks]
      currentIndex.value = 0
      loadTrack(tracks[0])
      play()
      return
    }
    const insertAt = currentIndex.value + 1
    queue.value.splice(insertAt, 0, ...tracks)
    originalQueue.value.splice(insertAt, 0, ...tracks)
    _preloadAdjacent()
  }

  /** Append a track or tracks to the end of the queue */
  function playLater(trackOrTracks: Track | Track[]) {
    const tracks = Array.isArray(trackOrTracks) ? trackOrTracks : [trackOrTracks]
    if (tracks.length === 0) return

    if (queue.value.length === 0 || currentIndex.value < 0) {
      queue.value = [...tracks]
      originalQueue.value = [...tracks]
      currentIndex.value = 0
      loadTrack(tracks[0])
      play()
      return
    }
    queue.value.push(...tracks)
    originalQueue.value.push(...tracks)
    _preloadAdjacent()
  }

  /** Move a queue item from one index to another (for drag reorder) */
  function moveInQueue(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= queue.value.length) return
    if (toIndex < 0 || toIndex >= queue.value.length) return

    const [item] = queue.value.splice(fromIndex, 1)
    queue.value.splice(toIndex, 0, item)

    // Update currentIndex to follow the currently playing track
    if (fromIndex === currentIndex.value) {
      currentIndex.value = toIndex
    } else {
      if (fromIndex < currentIndex.value && toIndex >= currentIndex.value) {
        currentIndex.value--
      } else if (fromIndex > currentIndex.value && toIndex <= currentIndex.value) {
        currentIndex.value++
      }
    }
    _preloadAdjacent()
  }

  function setLyricsOffset(offset: number) {
    lyricsOffset.value = offset
    window.api.getSettings().then((s: any) => {
      s.lyricsOffset = offset
      window.api.saveSettings(s)
    })
  }

  function setWaveformEnabled(enabled: boolean) {
    waveformEnabled.value = enabled
    window.api.getSettings().then((s: any) => {
      s.waveformEnabled = enabled
      window.api.saveSettings(s)
    })
    if (enabled && currentTrack.value) {
      const t = currentTrack.value
      if (t.source === 'subsonic' && t.path.startsWith('subsonic://')) {
        generateSubsonicWaveform(t.path.replace('subsonic://', ''))
      } else {
        generateWaveform(t.path)
      }
    }
  }

  /** Returns the current frequency data (0-255) from the AnalyserNode, or null if unavailable */
  function getFrequencyData(): Uint8Array | null {
    if (!analyserNode) return null
    analyserNode.getByteFrequencyData(frequencyBuf)
    return frequencyBuf
  }

  function setAnimatedCoversEnabled(enabled: boolean) {
    animatedCoversEnabled.value = enabled
    window.api.getSettings().then((s: any) => {
      s.animatedCoversEnabled = enabled
      window.api.saveSettings(s)
    })
  }

  function setPauseAnimatedOnBlur(enabled: boolean) {
    pauseAnimatedOnBlur.value = enabled
    window.api.getSettings().then((s: any) => {
      s.pauseAnimatedOnBlur = enabled
      window.api.saveSettings(s)
    })
  }

  function setAdaptiveAccent(enabled: boolean) {
    adaptiveAccent.value = enabled
    window.api.getSettings().then((s: any) => {
      s.adaptiveAccent = enabled
      window.api.saveSettings(s)
    })
    if (!enabled) {
      currentAccentColor.value = null
      document.documentElement.style.removeProperty('--accent')
      document.documentElement.style.removeProperty('--accent-hover')
    }
  }

  function setIOSSliders(enabled: boolean) {
    iosSliders.value = enabled
    window.api.getSettings().then((s: any) => {
      s.iosSliders = enabled
      window.api.saveSettings(s)
    })
  }

  function setTransparencyEnabled(enabled: boolean) {
    transparencyEnabled.value = enabled
    window.api.getSettings().then((s: any) => {
      s.transparencyEnabled = enabled
      window.api.saveSettings(s)
    })
  }

  function setAutoFullscreen(enabled: boolean) {
    autoFullscreen.value = enabled
    window.api.getSettings().then((s: any) => {
      s.autoFullscreen = enabled
      window.api.saveSettings(s)
    })
  }

  function setAutoFullscreenDelay(seconds: number) {
    autoFullscreenDelay.value = seconds
    window.api.getSettings().then((s: any) => {
      s.autoFullscreenDelay = seconds
      window.api.saveSettings(s)
    })
  }

  function setNormalization(enabled: boolean) {
    normalization.value = enabled
    window.api.getSettings().then((s: any) => {
      s.normalization = enabled
      window.api.saveSettings(s)
    })
    // Normalization requires a page reload since the AudioContext source can only be connected once
    // We'll show a toast from the UI side prompting a restart
  }

  function setScrobblingEnabled(enabled: boolean) {
    scrobblingEnabled = enabled
    window.api.getSettings().then((s: any) => {
      s.scrobblingEnabled = enabled
      window.api.saveSettings(s)
    })
  }

  // ── Remote control integration ──────────────────────────────────────────
  function sendRemoteState() {
    const trackForRemote = currentTrack.value ? {
      id: currentTrack.value.id,
      title: currentTrack.value.title,
      artist: currentTrack.value.artist,
      album: currentTrack.value.album,
      coverArt: currentTrack.value.coverArt,
      duration: currentTrack.value.duration,
    } : null

    window.api.sendRemoteState({
      currentTrack: trackForRemote,
      isPlaying: isPlaying.value,
      currentTime: currentTime.value,
      duration: duration.value,
      volume: volume.value,
      isMuted: isMuted.value,
      isShuffle: isShuffle.value,
      repeatMode: repeatMode.value,
      currentIndex: currentIndex.value,
      queue: queue.value.slice(0, 50).map(t => ({
        id: t.id, title: t.title, artist: t.artist,
        album: t.album, coverArt: t.coverArt,
      })),
    })
  }

  // Throttled time updates (don't flood WS)
  let remoteTimeThrottle = 0
  audio.addEventListener('timeupdate', () => {
    const now = Date.now()
    if (now - remoteTimeThrottle > 1000) {
      remoteTimeThrottle = now
      sendRemoteState()
    }
  })

  // Send on meaningful state changes
  watch(currentTrack, sendRemoteState)
  watch(isPlaying, sendRemoteState)
  watch(volume, sendRemoteState)
  watch(isMuted, sendRemoteState)
  watch(isShuffle, sendRemoteState)
  watch(repeatMode, sendRemoteState)

  // Handle commands from remote clients
  window.api.onRemoteCommand((command: string, data?: any) => {
    switch (command) {
      case 'play': play(); break
      case 'pause': pause(); break
      case 'togglePlay': togglePlay(); break
      case 'next': next(); break
      case 'previous': previous(); break
      case 'seek': seek(typeof data === 'number' ? data : 0); break
      case 'volume': setVolume(typeof data === 'number' ? data : 0); break
      case 'toggleMute': toggleMute(); break
      case 'toggleShuffle': toggleShuffle(); break
      case 'cycleRepeat': cycleRepeat(); break
      case 'playFromQueue': {
        if (data && typeof data.index === 'number') {
          playFromQueue(data.index)
        }
        break
      }
      case 'playTrack': {
        const lib = getLibStore()
        const track = lib.tracks.find((t: Track) => t.id === data?.trackId)
        if (track) {
          const albumTracks = lib.tracks.filter((t: Track) => t.album === track.album && t.albumArtist === track.albumArtist)
          const idx = albumTracks.findIndex((t: Track) => t.id === track.id)
          playAll(albumTracks, Math.max(0, idx))
        }
        break
      }
      case 'playAlbum': {
        const lib = getLibStore()
        const albumTracks = lib.tracks.filter((t: Track) => {
          const key = `${t.album}---${t.albumArtist}`
          return key === data?.albumKey
        })
        if (albumTracks.length > 0) {
          if (data?.shuffle) isShuffle.value = true
          playAll(albumTracks, data?.startIndex || 0)
        }
        break
      }
      case 'playNext': {
        const lib = getLibStore()
        const track = lib.tracks.find((t: Track) => t.id === data?.trackId)
        if (track) playNext(track)
        break
      }
      case 'playLater': {
        const lib = getLibStore()
        const track = lib.tracks.find((t: Track) => t.id === data?.trackId)
        if (track) playLater(track)
        break
      }
    }
  })

  return {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    isLoading,
    progress,
    hasNext,
    hasPrevious,
    play,
    pause,
    togglePlay,
    next,
    previous,
    seek,
    seekPercent,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    playAll,
    addToQueue,
    clearQueue,
    removeFromQueue,
    playFromQueue,
    playNext,
    playLater,
    moveInQueue,
    setDiscordFormat,
    setDiscordEnabled,
    // Audio output
    outputDeviceId,
    audioDevices,
    enumerateOutputDevices,
    setOutputDevice,
    // Lyrics offset
    lyricsOffset,
    setLyricsOffset,
    // Waveform
    waveformData,
    waveformEnabled,
    setWaveformEnabled,
    generateWaveform,
    // Animated covers
    animatedCoversEnabled,
    setAnimatedCoversEnabled,
    pauseAnimatedOnBlur,
    setPauseAnimatedOnBlur,
    // Adaptive accent
    adaptiveAccent,
    currentAccentColor,
    setAdaptiveAccent,
    // iOS sliders
    iosSliders,
    setIOSSliders,
    // Transparency
    transparencyEnabled,
    setTransparencyEnabled,
    // Auto-fullscreen
    autoFullscreen,
    autoFullscreenDelay,
    setAutoFullscreen,
    setAutoFullscreenDelay,
    // Audio normalization
    normalization,
    setNormalization,
    // Scrobbling
    setScrobblingEnabled,
    // Playback error
    playbackError,
    // LRC sync mode
    lrcSyncMode,
    // Sleep timer
    sleepTimerMode,
    sleepTimerRemaining,
    startSleepTimer,
    cancelSleepTimer,
    // Audio analyser (for visual effects)
    getFrequencyData,
  }
})
