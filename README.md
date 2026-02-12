# Aurora Player

Aurora Player is a local music player for Linux and Windows, built with Electron, Vue 3, and Tailwind CSS. It focuses on a feature-rich, clean, modern interface for managing and playing your personal music library.

> **Note:** This project was developed with the assistance of AI tools. All code has been reviewed and tested by the maintainer.

## Features

### Library and browsing

- Scan local folders for audio files (MP3, FLAC, OGG, WAV, M4A, AAC, OPUS, WMA)
- Browse by songs, albums, artists, or folder structure
- Real-time search across songs and albums
- Sort by title, artist, album, date added, duration, and year
- Virtual scrolling for large libraries

### Playback

- Gapless queue with play next, play later, shuffle, and repeat modes
- Waveform progress bar
- Audio output device selection
- Volume normalization (dynamics compressor)
- Drag-and-drop queue reordering

### Playlists and favorites

- Create, rename, delete, and reorder playlists
- Smart playlists with rule-based auto-population (genre, year, artist, BPM, etc.)
- Mark songs as favorites with inline heart buttons
- Multi-select with Ctrl+Click, Shift+Click, and Ctrl+A for bulk actions

### Now playing and fullscreen

- Now playing view with synced lyrics, album art, and waveform bar
- Adaptive accent colors extracted from album art
- Sonoma-inspired fullscreen mode with background blur and lyrics
- Auto-fullscreen on idle (configurable delay)

### Lyrics

- Automatic loading of local .lrc files alongside audio files
- Online lyrics fetching via LRCLIB
- Synced lyrics display with manual time offset adjustment
- Built-in LRC syncer tool for creating lyrics from scratch

### Integrations

- Discord Rich Presence (customizable format, custom client ID support)
- Last.fm and ListenBrainz scrobbling
- Navidrome / Subsonic server streaming
- MPRIS D-Bus integration on Linux (media keys, desktop controls)

### Other

- Export and import settings, favorites, and playlists as a backup file
- Context menus for songs, albums, and playlists
- Toast notifications for user actions
- Automatic update checker (notifies once per new release)
- Custom iOS-style slider option

## Installation

### Linux -- AppImage

Download the latest `.AppImage` from the [Releases](https://github.com/Wilk087/Aurora/releases) page. Make it executable and run:

```
chmod +x Aurora-Player-*.AppImage
./Aurora-Player-*.AppImage
```

### Linux -- Arch (pacman)

Download the `.pacman` package from [Releases](https://github.com/Wilk087/Aurora/releases) and install with:

```
sudo pacman -U aurora-player-*.pacman
```

Or use the PKGBUILD included in the repository to build from source:

```
makepkg -si
```

### Linux -- Nix

A `flake.nix` is included. To build and run:

```
nix build
./result/bin/aurora-player
```

Or run directly:

```
nix run
```

### Windows

Download the installer (`.exe`) or portable build from the [Releases](https://github.com/Wilk087/Aurora/releases) page.

## Development

### Requirements

- Node.js 18 or later
- npm

### Setup

```
git clone https://github.com/Wilk087/Aurora.git
cd Aurora
npm install
```

### Running in development mode

```
npm run dev
```

This starts the Vite dev server with hot reload for the renderer and auto-restarts the Electron main process on changes.

### Building

Build the renderer and Electron main process without packaging:

```
npm run build
```

### Packaging

Build distributable packages:

```
npm run dist:pacman       # Arch Linux .pacman package
npm run dist:appimage     # Linux AppImage
npm run dist:win          # Windows installer + portable
npm run dist:all          # All platforms at once
```

Built packages are written to the `release/` directory.

## Project structure

```
electron/
  main.ts          Main process (IPC handlers, file I/O, protocols, MPRIS)
  preload.ts       Context bridge exposing window.api to the renderer
  mpris.ts         Custom MPRIS2 D-Bus service for Linux
  subsonic.ts      Subsonic/Navidrome REST API client
src/
  components/      Reusable Vue components
  composables/     Vue composables (useSelection, useToast, etc.)
  router/          Vue Router configuration
  stores/          Pinia stores (library, player, playlist, favorites)
  views/           Page-level view components
  utils/           Utility functions
build/             App icons (PNG, ICO)
```

## Tech stack

- Electron 28
- Vue 3.4 (Composition API)
- Pinia 2.1
- Vue Router 4
- Tailwind CSS 3.4
- TypeScript
- Vite 5

## Versioning

This project uses semantic versioning. The version is defined in `package.json` and is the single source of truth for the application. PKGBUILD and flake.nix reference it via comments and should be updated manually when bumping versions.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
