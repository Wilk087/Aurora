import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const usePlayerStore = defineStore('player', () => {
  // ── Internal audio element ───────────────────────────────────────────────
  const audio = new Audio()
  audio.preload = 'auto'

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
  })
  audio.addEventListener('durationchange', () => {
    duration.value = audio.duration
  })
  audio.addEventListener('ended', () => handleTrackEnd())
  audio.addEventListener('playing', () => {
    isPlaying.value = true
    isLoading.value = false
  })
  audio.addEventListener('pause', () => {
    isPlaying.value = false
  })
  audio.addEventListener('waiting', () => {
    isLoading.value = true
  })
  audio.addEventListener('canplay', () => {
    isLoading.value = false
  })
  audio.addEventListener('error', (e) => {
    console.error('Audio error:', e)
    isLoading.value = false
    isPlaying.value = false
  })

  // ── Watchers ─────────────────────────────────────────────────────────────
  audio.volume = volume.value

  watch(volume, (val) => {
    audio.volume = val
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
    if (s.shuffle === true) isShuffle.value = true
    if (s.repeatMode && ['off', 'all', 'one'].includes(s.repeatMode)) repeatMode.value = s.repeatMode
    if (s.muted === true) { isMuted.value = true; audio.muted = true }
  })

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
  function loadTrack(track: Track) {
    currentTrack.value = track
    duration.value = track.duration || 0
    isLoading.value = true
    audio.src = window.api.getMediaUrl(track.path)
    audio.load()

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
  }

  function handleTrackEnd() {
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
      loadTrack(track)
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

  function next() {
    if (queue.value.length === 0) return
    let nextIdx = currentIndex.value + 1
    if (nextIdx >= queue.value.length) {
      if (repeatMode.value === 'all') nextIdx = 0
      else return
    }
    currentIndex.value = nextIdx
    loadTrack(queue.value[nextIdx])
    play()
  }

  function previous() {
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
    loadTrack(queue.value[prevIdx])
    play()
  }

  function seek(time: number) {
    audio.currentTime = time
    currentTime.value = time
    sendDiscordUpdate()
  }

  function seekPercent(percent: number) {
    seek((percent / 100) * duration.value)
  }

  function setVolume(val: number) {
    volume.value = Math.max(0, Math.min(1, val))
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
  }

  function cycleRepeat() {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one']
    repeatMode.value = modes[(modes.indexOf(repeatMode.value) + 1) % 3]
  }

  function playAll(tracks: Track[], startIndex = 0) {
    queue.value = [...tracks]
    originalQueue.value = [...tracks]
    currentIndex.value = startIndex
    loadTrack(tracks[startIndex])
    play()
  }

  function addToQueue(tracks: Track[]) {
    queue.value.push(...tracks)
    originalQueue.value.push(...tracks)
    // If nothing is playing, start from the first added track
    if (!currentTrack.value && tracks.length > 0) {
      currentIndex.value = queue.value.length - tracks.length
      loadTrack(queue.value[currentIndex.value])
      play()
    }
  }

  function clearQueue() {
    queue.value = []
    originalQueue.value = []
    currentIndex.value = -1
    currentTrack.value = null
    audio.src = ''
    isPlaying.value = false
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
    }
  }

  function playFromQueue(index: number) {
    if (index < 0 || index >= queue.value.length) return
    currentIndex.value = index
    loadTrack(queue.value[index])
    play()
  }

  /** Insert a track right after the currently playing track */
  function playNext(track: Track) {
    if (queue.value.length === 0 || currentIndex.value < 0) {
      // Nothing playing – just start it
      queue.value = [track]
      originalQueue.value = [track]
      currentIndex.value = 0
      loadTrack(track)
      play()
      return
    }
    const insertAt = currentIndex.value + 1
    queue.value.splice(insertAt, 0, track)
    originalQueue.value.splice(insertAt, 0, track)
  }

  /** Append a track to the end of the queue */
  function playLater(track: Track) {
    if (queue.value.length === 0 || currentIndex.value < 0) {
      queue.value = [track]
      originalQueue.value = [track]
      currentIndex.value = 0
      loadTrack(track)
      play()
      return
    }
    queue.value.push(track)
    originalQueue.value.push(track)
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
  }

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
  }
})
