# Aurora Player

Aurora Player is a local music player for Linux built with Electron, Vue 3, and Tailwind CSS. It is inspired by Cider 2 and focuses on a clean, modern interface for managing and playing your personal music library.

## Features

- **Library management** -- Scan local folders and browse songs, albums, and artists. Supports MP3, FLAC, OGG, WAV, M4A, AAC, OPUS, and WMA.
- **Albums and artist pages** -- Dedicated views for albums with cover art and per-artist discographies.
- **Playlists** -- Create, rename, delete, and sort playlists. Smart playlists with rule-based auto-population.
- **Favorites** -- Mark songs as favorites with a single click. Dedicated favorites view with full playback controls.
- **Folder browser** -- Navigate your music library by directory structure.
- **Search** -- Real-time search across songs and albums with automatic tab switching.
- **Queue and playback** -- Play next, play later, shuffle, and repeat modes. Drag-and-drop queue reordering.
- **Multi-select** -- Ctrl+Click to toggle, Shift+Click for range select, Ctrl+Shift+Click for additive range select, Ctrl+A to select all. Bulk actions include play next, add to queue, add to favorites, and add to playlist.
- **Now Playing** -- Full now-playing view with waveform progress bar, adaptive accent colors extracted from album art, and lyrics display with manual offset adjustment.
- **Fullscreen mode** -- Sonoma-inspired fullscreen experience.
- **Discord Rich Presence** -- Show what you are listening to on Discord.
- **Last.fm scrobbling** -- Scrobble tracks to your Last.fm account.
- **Audio output selection** -- Choose between available audio output devices.
- **Context menus** -- Right-click songs, albums, and playlists for quick actions (play next, add to playlist, go to artist, show in file explorer, credits and info).
- **Toast notifications** -- Non-intrusive feedback for all user actions.
- **Keyboard shortcuts** -- Ctrl+A to select all, Escape to clear selection, and standard media key support.

## Requirements

- Node.js 18 or later
- npm

## Getting started

Clone the repository and install dependencies:

```
git clone https://github.com/Wilk087/Aurora.git
cd Aurora
npm install
```

### Development

Start the application in development mode with hot reload:

```
npm run dev
```

### Building

Build the renderer and Electron main process:

```
npx vite build
```

### Packaging

Package for Linux as a Pacman package:

```
npm run dist:pacman
```

Package as an AppImage:

```
npm run dist:appimage
```

Build both Pacman and AppImage at once:

```
npm run dist:all
```

Built packages are written to the `release/` directory.

## Project structure

```
electron/          Electron main process and preload script
src/
  components/      Vue components (SongRow, Sidebar, SelectionBar, etc.)
  composables/     Vue composables (useSelection, useToast, etc.)
  router/          Vue Router configuration
  stores/          Pinia stores (library, player, playlist, favorites, settings)
  views/           Page-level Vue components
  utils/           Utility functions
```

## Tech stack

- Electron 28
- Vue 3.4 with Composition API
- Pinia for state management
- Vue Router 4
- Tailwind CSS 3.4
- TypeScript
- Vite 5

## License

MIT
