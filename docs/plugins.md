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
    "onLibraryUpdate"
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

Available events: `trackChange`, `play`, `pause`, `queueChange`, `volumeChange`, `seek`, `libraryUpdate`.

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
