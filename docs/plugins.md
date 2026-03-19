# Aurora Plugins

> **Note:** The plugin system is a work-in-progress feature. The API described here is functional but may change in future releases. Plugins currently run with full renderer process access (no sandbox).

Aurora supports JavaScript plugins that can react to playback events, inject UI elements, interact with the library and playlists, and persist their own settings and data.

## Quick start

1. Create a folder with a `manifest.json` and a `main.js` (see below).
2. Drop the folder into **Settings → Plugins → Open Plugins Folder** (or manually place it in `~/.config/aurora-player/plugins/` on Linux, `%APPDATA%/aurora-player/plugins/` on Windows).
3. Restart Aurora (or go to Settings → Plugins and click Refresh). Enable the plugin with the toggle.

Two example plugins are included in the repository:

- [`docs/example-plugin/`](example-plugin/) — a simple "Now Playing Logger" that adds a sidebar button and logs track changes (great starting point)
- [`docs/example-quality-badge-plugin/`](example-quality-badge-plugin/) — an intermediate example that fetches audio metadata via IPC, injects badges into player-bar and immersive slots, uses a MutationObserver, and reacts to settings changes

## Plugin structure

```
my-plugin/
├── manifest.json    # Required — plugin metadata and configuration
├── main.js          # Required — plugin entry point
└── style.css        # Optional — CSS injected into the renderer
```

## manifest.json

```jsonc
{
  // ── Required fields ────────────────────────────────────────
  "id": "my-plugin",            // Unique kebab-case identifier
  "name": "My Plugin",          // Human-readable name
  "version": "1.0.0",           // Semver string
  "author": "Your Name",
  "main": "main.js",            // Entry JS file (relative to plugin folder)

  // ── Optional fields ────────────────────────────────────────
  "description": "What this plugin does",
  "style": "style.css",         // CSS file to inject (relative to plugin folder)

  // Declare which lifecycle hooks your plugin uses
  "hooks": [
    "onTrackChange",
    "onPlay",
    "onPause",
    "onQueueChange",
    "onVolumeChange",
    "onSeek",
    "onLibraryUpdate",
    "onImmersiveEnter",
    "onImmersiveExit",
    "onImmersiveSettingsChanged"
  ],

  // Settings schema — Aurora auto-renders UI controls in Settings → Plugins
  "settingsSchema": {
    "myToggle": {
      "type": "boolean",
      "label": "Enable feature",
      "description": "A toggle shown in the plugin's settings panel",
      "default": true
    },
    "myChoice": {
      "type": "select",
      "label": "Pick one",
      "options": [
        { "label": "Option A", "value": "a" },
        { "label": "Option B", "value": "b" }
      ],
      "default": "a"
    },
    "myText": {
      "type": "string",
      "label": "Custom label",
      "default": "Hello"
    },
    "myNumber": {
      "type": "number",
      "label": "Delay (ms)",
      "default": 1000
    }
  }
}
```

### Settings schema field types

| Type | UI control | Properties |
|------|-----------|------------|
| `boolean` | Toggle switch | `label`, `description?`, `default` |
| `select` | Dropdown | `label`, `description?`, `default`, `options: {label, value}[]` |
| `string` | Text input | `label`, `description?`, `default` |
| `number` | Number input | `label`, `description?`, `default` |

Settings are automatically persisted to disk and restored on startup.

## main.js

Your entry point receives two implicit globals:

- **`aurora`** — the Plugin API object (see below)
- **`exports`** — attach your lifecycle hooks here

```javascript
// Called when the plugin is enabled
exports.onActivate = function () {
  aurora.ui.toast.info('My plugin is active!')
}

// Called when the plugin is disabled
exports.onDeactivate = function () {
  // Clean up any DOM elements, intervals, etc.
}

// Called when the current track changes
exports.onTrackChange = function (track) {
  console.log('Now playing:', track.title, '—', track.artist)
}

// Called when playback starts or resumes
exports.onPlay = function () {
  console.log('Playing')
}

// Called when playback pauses
exports.onPause = function () {
  console.log('Paused')
}

// Called when the play queue changes
exports.onQueueChange = function (queue) {
  console.log('Queue updated, length:', queue.length)
}

// Called when volume changes (0–1)
exports.onVolumeChange = function (volume) {
  console.log('Volume:', volume)
}

// Called when the user seeks
exports.onSeek = function (time) {
  console.log('Seeked to:', time)
}

// Called when the library is rescanned
exports.onLibraryUpdate = function (tracks) {
  console.log('Library updated, tracks:', tracks.length)
}

// Called when immersive (fullscreen) mode is entered
exports.onImmersiveEnter = function () {
  console.log('Immersive mode entered')
}

// Called when immersive mode is exited
exports.onImmersiveExit = function () {
  console.log('Immersive mode exited')
}

// Called when immersive settings change (style, vibrant, animated, etc.)
exports.onImmersiveSettingsChanged = function (settings) {
  console.log('Immersive style:', settings.style)
}
```

## Plugin API reference

The `aurora` object is available as a global inside your plugin. It provides access to all major app subsystems.

### aurora.player

Control and query playback state.

| Property / Method | Type | Description |
|---|---|---|
| `currentTrack` | `object \| null` | The currently playing track (title, artist, album, duration, path, etc.) |
| `isPlaying` | `boolean` | Whether audio is currently playing |
| `currentTime` | `number` | Current playback position in seconds |
| `duration` | `number` | Duration of the current track in seconds |
| `volume` | `number` | Current volume (0–1) |
| `queue` | `object[]` | The current play queue |
| `currentIndex` | `number` | Index of the current track in the queue |
| `play()` | `void` | Start or resume playback |
| `pause()` | `void` | Pause playback |
| `togglePlay()` | `void` | Toggle play/pause |
| `next()` | `void` | Skip to next track |
| `previous()` | `void` | Skip to previous track |
| `seek(seconds)` | `void` | Seek to a position |
| `setVolume(level)` | `void` | Set volume (0–1) |
| `playAll(tracks, index?)` | `void` | Replace queue and start playing |
| `addToQueue(tracks)` | `void` | Append tracks to the end of the queue |
| `playNext(tracks)` | `void` | Insert tracks after the current track |
| `playLater(tracks)` | `void` | Append tracks to the end of the queue |

### aurora.library

Access the music library (read-only).

| Property | Type | Description |
|---|---|---|
| `tracks` | `object[]` | All tracks in the library |
| `albums` | `object[]` | All albums |
| `artists` | `object[]` | All artists |
| `searchQuery` | `string` | Get/set the current search query |

### aurora.playlists

Manage playlists.

| Property / Method | Type | Description |
|---|---|---|
| `all` | `object[]` | All playlists |
| `create(name)` | `object` | Create a new playlist |
| `delete(id)` | `void` | Delete a playlist |
| `rename(id, name)` | `void` | Rename a playlist |
| `addTracks(id, tracks)` | `void` | Add tracks to a playlist |
| `getPlaylistTracks(id)` | `object[]` | Get all tracks in a playlist |

### aurora.favorites

Manage favorites.

| Property / Method | Type | Description |
|---|---|---|
| `ids` | `Set<string>` | Set of favorite track IDs |
| `isFavorite(trackId)` | `boolean` | Check if a track is favorited |
| `toggle(trackId)` | `void` | Toggle favorite status |

### aurora.theme

Access and modify the app theme.

| Property / Method | Type | Description |
|---|---|---|
| `current` | `object` | The currently active theme |
| `all` | `object[]` | All available themes |
| `apply(theme)` | `void` | Apply a theme |
| `reset()` | `void` | Reset to the default theme |
| `injectCSS(css)` | `void` | Inject custom CSS |

### aurora.immersive

Read and control immersive (fullscreen) mode settings.

| Property / Method | Type | Description |
|---|---|---|
| `isActive` | `boolean` | Whether immersive mode is currently active |
| `style` | `string` | Current layout style (`'default'`, `'modern'`, or `'artwork'`) |
| `vibrant` | `object` | Per-style vibrant background state (`{ default, modern, artwork }`) |
| `animated` | `object` | Per-style animated background state |
| `animStyle` | `object` | Per-style animation style (`'lava-lamp'`, `'sonar-ripple'`, `'cinematic-grain'`) |
| `hideControls` | `object` | Per-style hide controls state |
| `getSettings()` | `object` | Full snapshot of all immersive settings |
| `setStyle(style)` | `void` | Change the layout style |
| `setVibrant(style, value)` | `void` | Toggle vibrant background for a layout style |
| `setAnimated(style, value)` | `void` | Toggle animated background for a layout style |
| `setAnimStyle(style, animStyle)` | `void` | Set animation type for a layout style |
| `setHideControls(style, value)` | `void` | Toggle hide controls for a layout style |

Write methods take effect immediately if immersive mode is active, and are persisted to settings.

#### Example — add an immersive toggle to the settings panel

```javascript
exports.onActivate = function () {
  // Add a custom toggle to the immersive settings drawer
  var slot = aurora.ui.getImmersiveSettingsSlot()
  if (slot) {
    var label = document.createElement('label')
    label.className = 'flex items-center justify-between cursor-pointer'
    label.innerHTML = '<span class="text-sm text-white/70">My Feature</span>'
    var btn = document.createElement('button')
    btn.className = 'relative w-9 h-5 rounded-full bg-white/15'
    btn.onclick = function () { /* toggle your feature */ }
    label.appendChild(btn)
    slot.appendChild(label)
  }
}

// React to immersive style changes
exports.onImmersiveSettingsChanged = function (settings) {
  console.log('Layout:', settings.style, 'Vibrant:', settings.vibrant[settings.style])
}
```

#### Example — switch to modern layout from a plugin

```javascript
if (aurora.immersive.isActive) {
  aurora.immersive.setStyle('modern')
  aurora.immersive.setVibrant('modern', true)
  aurora.immersive.setAnimated('modern', true)
  aurora.immersive.setAnimStyle('modern', 'cinematic-grain')
}
```

### aurora.lyrics

Access, fetch, parse, and save lyrics for any track.

| Property / Method | Type | Description |
|---|---|---|
| `get(trackPath)` | `Promise<string \| null>` | Get raw LRC/text content from the local `.lrc` file next to the track |
| `fetchOnline(trackInfo)` | `Promise<string \| null>` | Fetch lyrics from the LRCLIB online database (auto-saves locally) |
| `save(trackPath, lrcContent)` | `Promise<void>` | Save an LRC string to disk next to the audio file |
| `parse(lrcContent)` | `LyricLine[]` | Parse raw LRC content into `[{ time, text }, ...]` (sorted by time) |
| `findCurrentLine(lyrics, time)` | `number` | Given parsed lyrics and a time in seconds, return the index of the active line (−1 if before the first line) |
| `offset` | `number` | Current lyrics timing offset in seconds (positive = lyrics appear earlier) |
| `setOffset(seconds)` | `void` | Set the lyrics timing offset (persisted to settings) |
| `getCurrentTrackLyrics()` | `Promise<object \| null>` | Convenience method — returns `{ synced, lines, raw }` for the playing track, or `null` |

#### trackInfo object (for `fetchOnline`)

```javascript
{
  path: '/path/to/song.mp3',
  title: 'Song Title',
  artist: 'Artist Name',
  album: 'Album Name',
  duration: 240  // seconds
}
```

#### Example — display synced lyrics

```javascript
exports.onTrackChange = async function (track) {
  var result = await aurora.lyrics.getCurrentTrackLyrics()
  if (!result) return console.log('No lyrics available')

  if (result.synced) {
    // result.lines is an array of { time: number, text: string }
    result.lines.forEach(function (line) {
      console.log('[' + line.time.toFixed(2) + '] ' + line.text)
    })
  } else {
    // Unsynced — result.raw contains the plain text
    console.log(result.raw)
  }
}
```

#### Example — fetch and save lyrics manually

```javascript
var raw = await aurora.lyrics.get(track.path)

if (!raw) {
  raw = await aurora.lyrics.fetchOnline({
    path: track.path,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration
  })
}

if (raw) {
  var lines = aurora.lyrics.parse(raw)
  var idx = aurora.lyrics.findCurrentLine(lines, aurora.player.currentTime + aurora.lyrics.offset)
  console.log('Active line:', lines[idx]?.text)
}
```

### aurora.ui

Interact with the UI.

| Method | Description |
|---|---|
| `toast.success(msg)` | Show a success toast notification |
| `toast.info(msg)` | Show an info toast notification |
| `toast.warning(msg)` | Show a warning toast notification |
| `toast.error(msg)` | Show an error toast notification |
| `addSidebarItems(items)` | Add items to the sidebar (see below) |
| `removeSidebarItems()` | Remove all sidebar items added by this plugin |
| `addContextMenuItems(items)` | Add items to the song row right-click menu (see below) |
| `removeContextMenuItems()` | Remove all song context menu items added by this plugin |
| `addAlbumContextMenuItems(items)` | Add items to the album card right-click menu (see below) |
| `removeAlbumContextMenuItems()` | Remove all album context menu items added by this plugin |
| `observeAlbumCards(callbacks)` | Watch album card elements mount/unmount in the DOM — for injecting overlays (see below) |
| `navigate(path)` | Navigate to an app route, e.g. `'/albums'`, `'/album/some-id'`, `'/artist/Name'` |
| `openExternal(url)` | Open a URL in the system default browser |
| `copyToClipboard(text)` | Copy text to the system clipboard — returns a `Promise<void>` |
| `getPlayerBarSlot(position?)` | Get a DOM element slot in the player bar (`'left'` or `'right'`, default `'right'`) |
| `getImmersiveSlot(position?)` | Get a DOM slot in the fullscreen view (`'right'` or `'modern-right'`) |
| `getImmersiveSettingsSlot()` | Get a DOM slot in the fullscreen settings panel |

#### Sidebar items

```javascript
aurora.ui.addSidebarItems([
  {
    label: 'My Button',
    icon: '<svg class="w-5 h-5" ...>...</svg>',  // SVG string
    onClick: function () {
      aurora.ui.toast.info('Clicked!')
    }
  }
])
```

#### Song context menu items

Add custom actions to the track right-click menu. `onClick` receives the right-clicked track plus any other currently selected tracks. Use `separator: true` to render a divider line before an item. Use `children` to create a hover-triggered submenu — when present, `onClick` is ignored.

```javascript
aurora.ui.addContextMenuItems([
  {
    label: 'My Action',
    icon: 'M12 4.5v15m7.5-7.5h-15',  // SVG path d attribute (24x24 viewBox)
    separator: true,                  // optional: render a divider before this item
    onClick: function (tracks) {
      tracks.forEach(function (t) { console.log(t.title) })
    }
  },
  // Submenu example
  {
    label: 'Share',
    icon: 'M18 16.08c...',
    children: [
      {
        label: 'Copy link',
        onClick: function (tracks) { aurora.ui.copyToClipboard('https://example.com/' + tracks[0].title) }
      },
      {
        label: 'Open in browser',
        onClick: function (tracks) { aurora.ui.openExternal('https://example.com') }
      }
    ],
    onClick: function () {}
  }
])
```

#### Album context menu items

Add custom actions to the album card right-click menu. `onClick` receives the `Album` object `{ id, name, artist, year, tracks, coverArt }`. Supports the same `separator` and `icon` fields as song context menu items.

```javascript
aurora.ui.addAlbumContextMenuItems([
  {
    label: 'My Album Action',
    icon: 'M9 9h6M9 12h6M9 15h4',  // SVG path d attribute
    separator: true,
    onClick: function (album) {
      console.log('Right-clicked:', album.name, 'by', album.artist)
    }
  }
])
```

Always call `aurora.ui.removeAlbumContextMenuItems()` in `onDeactivate`.

#### Observing album cards

Use `aurora.ui.observeAlbumCards` to inject custom DOM overlays (badges, icons, etc.) directly onto album card elements as they mount and unmount in the grid.

Each album card's root element has a `data-album-id` attribute matching `album.id` from the library store. The cover art wrapper has the class `album-cover-wrapper` and is `position: relative`, making it ideal for absolute-positioned overlays.

```javascript
var stopObserver = null

exports.onActivate = function () {
  stopObserver = aurora.ui.observeAlbumCards({
    onMount: function (cardEl, albumId) {
      var badge = document.createElement('div')
      badge.style.cssText = 'position:absolute;top:6px;left:6px;z-index:10;padding:2px 8px;border-radius:100px;background:rgba(34,197,94,0.85);color:#000;font-size:11px;'
      badge.textContent = '✓'
      var cover = cardEl.querySelector('.album-cover-wrapper')
      if (cover) cover.appendChild(badge)
    },
    onUnmount: function (cardEl, albumId) {
      // cardEl is already removed from the DOM; no cleanup needed
    }
  })
}

exports.onDeactivate = function () {
  if (stopObserver) stopObserver()
}
```

`observeAlbumCards` immediately calls `onMount` for any album cards already in the DOM, then uses a `MutationObserver` to handle cards added or removed later (e.g. as the user navigates or filters). Returns a cleanup function — call it in `onDeactivate`.

#### DOM slots

The player bar and fullscreen view expose named `<div>` slots where plugins can inject custom DOM elements:

```javascript
exports.onActivate = function () {
  var slot = aurora.ui.getPlayerBarSlot('right')
  if (slot) {
    var btn = document.createElement('button')
    btn.textContent = '♥'
    btn.onclick = function () { /* ... */ }
    slot.appendChild(btn)
  }
}

exports.onDeactivate = function () {
  var slot = aurora.ui.getPlayerBarSlot('right')
  if (slot) slot.innerHTML = ''
}
```

### aurora.settings

Per-plugin settings that are auto-rendered in the Settings UI and persisted to disk.

| Method | Description |
|---|---|
| `register(schema)` | Register additional settings fields at runtime (merged with manifest schema) |
| `get(key)` | Get a setting value |
| `set(key, value)` | Set a setting value (persists automatically) |
| `getAll()` | Get all settings as an object |
| `onChange(handler)` | Listen for settings changes — `handler(key, value)` |
| `offChange(handler)` | Remove a change listener |

### aurora.storage

General-purpose per-plugin key-value store, persisted to disk.

| Method | Description |
|---|---|
| `get(key)` | Get a stored value |
| `set(key, value)` | Set a stored value |
| `getAll()` | Get all stored data |
| `setAll(data)` | Replace all stored data |

### aurora.on / aurora.off

Subscribe to raw events on the plugin event bus.

```javascript
function handler(track) {
  console.log('Track changed:', track.title)
}

aurora.on('trackChange', handler)
aurora.off('trackChange', handler)
```

Available events: `trackChange`, `play`, `pause`, `queueChange`, `volumeChange`, `seek`, `libraryUpdate`, `immersiveEnter`, `immersiveExit`, `immersiveSettingsChanged`.

### aurora.ipc

Direct access to Electron IPC (advanced, unrestricted).

| Method | Description |
|---|---|
| `invoke(channel, ...args)` | Send an IPC invoke to the main process and await the result |
| `send(channel, ...args)` | Send a one-way IPC message to the main process |

### aurora.version

`string` — the Aurora app version (e.g. `"2.7.0"`).

## Lifecycle

1. **Discovery** — Aurora scans the plugins directory for subfolders containing a `manifest.json`.
2. **Enable** — When toggled on in Settings, the plugin's `main.js` is read from disk and executed via `new Function()`.
3. **`onActivate()`** — Called immediately after the plugin code runs.
4. **Hooks fire** — `onTrackChange`, `onPlay`, `onPause`, etc. fire as playback events occur.
5. **`onDeactivate()`** — Called when the plugin is disabled. Clean up DOM elements, intervals, and event listeners here.
6. **Unload** — All event bus listeners are removed, injected CSS is removed, and the plugin is cleared from memory.

## Injecting CSS

If your plugin needs custom styles, add a `"style": "style.css"` field to your manifest. The CSS file will be injected as a `<style data-aurora-plugin="<plugin-id>">` element in `<head>` when the plugin loads, and removed when it unloads.

```css
/* style.css */
.my-plugin-widget {
  background: rgb(var(--accent) / 0.1);
  border: 1px solid rgb(var(--accent) / 0.2);
  border-radius: 0.75rem;
  padding: 1rem;
}
```

You can use any of Aurora's CSS variables (see [themes.md](themes.md)) to keep your plugin consistent with the active theme.

## Security note

Plugins run with **full renderer process access** — they are not sandboxed. Only install plugins from sources you trust. A malicious plugin has the same access as the app itself, including filesystem operations via IPC.

## File locations

| Platform | Directory | Contents |
|----------|-----------|----------|
| Linux | `~/.config/aurora-player/plugins/` | Plugin folders |
| Linux | `~/.config/aurora-player/plugin-settings/` | Per-plugin settings JSON |
| Windows | `%APPDATA%/aurora-player/plugins/` | Plugin folders |
| Windows | `%APPDATA%/aurora-player/plugin-settings/` | Per-plugin settings JSON |
