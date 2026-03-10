/**
 * Aurora Plugin — Now Playing Logger
 *
 * This is an example plugin showing how to use the Aurora Plugin API.
 * Drop this folder into ~/.config/aurora-player/plugins/ and enable it
 * in Settings → Plugins.
 *
 * The plugin receives two arguments:
 *   aurora  — the Plugin API (player, library, playlists, ui, storage, etc.)
 *   exports — attach lifecycle hooks here
 *
 * Available hooks:
 *   onActivate()           — called when the plugin is loaded
 *   onDeactivate()         — called when the plugin is unloaded
 *   onTrackChange(track)   — called when the current track changes
 *   onPlay()               — called when playback starts/resumes
 *   onPause()              — called when playback pauses
 *   onQueueChange(queue)   — called when the play queue changes
 *   onVolumeChange(vol)    — called when volume changes (0–1)
 *   onSeek(time)           — called when the user seeks
 *   onLibraryUpdate(tracks)— called when the library is rescanned
 *
 * Available API surfaces on `aurora`:
 *   aurora.player    — currentTrack, isPlaying, play(), pause(), next(), etc.
 *   aurora.library   — tracks, albums, artists, searchQuery
 *   aurora.playlists — all, create(), delete(), addTracks(), etc.
 *   aurora.favorites — ids, isFavorite(), toggle()
 *   aurora.theme     — current, all, apply(), reset(), injectCSS()
 *   aurora.ui.toast  — success(), info(), warning(), error()
 *   aurora.ui.addSidebarItems([...]) — add items to the sidebar
 *   aurora.storage   — get(key), set(key, val), getAll(), setAll(data)
 *   aurora.on(event, handler) / aurora.off(event, handler) — raw events
 *   aurora.ipc       — invoke(channel, ...args), send(channel, ...args)
 *   aurora.version   — app version string
 */

// Called when the plugin is enabled
exports.onActivate = function () {
  aurora.ui.toast.info('Now Playing Logger active!')
  console.log('[NowPlayingLogger] Plugin activated, Aurora v' + aurora.version)

  // Example: add a sidebar button
  aurora.ui.addSidebarItems([
    {
      label: 'Log Stats',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>',
      onClick: function () {
        var track = aurora.player.currentTrack
        if (track) {
          aurora.ui.toast.info(track.title + ' by ' + track.artist)
        } else {
          aurora.ui.toast.info('Nothing playing')
        }
      },
    },
  ])
}

// Called when the plugin is disabled
exports.onDeactivate = function () {
  aurora.ui.removeSidebarItems()
  console.log('[NowPlayingLogger] Plugin deactivated')
}

// Track changed
exports.onTrackChange = function (track) {
  console.log('[NowPlayingLogger] Now playing:', track.title, '—', track.artist, '(' + track.album + ')')
}

// Playback started
exports.onPlay = function () {
  var track = aurora.player.currentTrack
  if (track) {
    console.log('[NowPlayingLogger] ▶ Playing:', track.title)
  }
}

// Playback paused
exports.onPause = function () {
  console.log('[NowPlayingLogger] ⏸ Paused')
}
