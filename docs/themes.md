# Aurora Themes

> **Note:** Theming is a work-in-progress feature. The format described here is stable, but the set of overridable properties may grow in future releases.

Aurora supports fully customisable JSON themes that can restyle every colour, glass panel, scrollbar, slider, shadow, and font in the app. Themes are loaded from disk at startup and can be hot-swapped without restarting.

## Quick start

1. Create a `.json` file matching the format below.
2. Drop it into **Settings → Themes → Open Themes Folder** (or manually place it in `~/.config/aurora-player/themes/` on Linux, `%APPDATA%/aurora-player/themes/` on Windows).
3. Aurora detects the new file automatically — select it in the theme picker.

Two example themes are included in the repository under [`docs/`](./):

| File | Description |
|------|-------------|
| [`example-theme.json`](example-theme.json) | Nord Dark — a dark theme inspired by the Nord palette |
| [`example-light-theme.json`](example-light-theme.json) | Aurora Light — a light theme demonstrating full colour inversion |

## Theme format

A theme is a single JSON file containing the following structure. Only `id`, `name`, `author`, `version`, and the `colors` block are required — everything else is optional and falls back to the default Aurora dark values.

```jsonc
{
  // ── Metadata (required) ────────────────────────────────────
  "id": "my-theme",              // Unique kebab-case identifier (used as filename)
  "name": "My Theme",            // Human-readable name shown in the picker
  "author": "Your Name",
  "version": "1.0.0",            // Semver string
  "description": "Optional description shown in the theme picker",

  // ── Core colours (required) ────────────────────────────────
  "colors": {
    // Accent — space-separated RGB triplets (used with Tailwind opacity)
    "accent":      "139 92 246",
    "accentHover": "167 139 250",
    "accentDark":  "109 40 217",

    // Backgrounds — full CSS colour values (rgba recommended for transparency)
    "bgPrimary":   "rgba(10, 10, 10, 0.95)",
    "bgSecondary": "rgba(18, 18, 18, 0.85)",
    "bgTertiary":  "rgba(30, 30, 30, 0.9)",

    // Text — full CSS values
    "textPrimary":   "#ffffff",
    "textSecondary": "rgba(255, 255, 255, 0.6)",
    "textTertiary":  "rgba(255, 255, 255, 0.4)",

    // Border
    "border": "rgba(255, 255, 255, 0.08)",

    // ── Base colour axes (optional, strongly recommended) ────
    // These control ALL Tailwind white/black utility classes at once.
    // Set appText to "0 0 0" for light themes, "255 255 255" for dark.
    "appText":    "255 255 255",   // text-white/*, border-white/*
    "appOverlay": "0 0 0",         // bg-black/*, overlays

    // Solid-surface controls (play button, toggle knobs)
    "controlBg": "255 255 255",    // background
    "controlFg": "0 0 0",          // foreground / text

    // Opaque background when transparency is turned off in settings
    "bgSolid": "#0c0c0c"
  },

  // ── Glass panels (optional) ────────────────────────────────
  "glass": {
    "background":      "rgba(20, 20, 20, 0.75)",    // .glass
    "lightBackground": "rgba(35, 35, 35, 0.6)",      // .glass-light
    "heavyBackground": "rgba(12, 12, 12, 0.92)",     // .glass-heavy (main container)
    "blur":            "blur(40px) saturate(180%)"    // backdrop-filter shorthand
  },

  // ── Scrollbar (optional) ───────────────────────────────────
  "scrollbar": {
    "thumb":      "rgba(255, 255, 255, 0.15)",
    "thumbHover": "rgba(255, 255, 255, 0.25)"
  },

  // ── Slider / range inputs (optional) ───────────────────────
  "slider": {
    "thumb": "rgb(255, 255, 255)",
    "track": "rgba(255, 255, 255, 0.1)"
  },

  // ── Cover art shadow (optional) ────────────────────────────
  "coverShadow": "0 8px 30px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)",

  // ── Font overrides (optional) ──────────────────────────────
  "fonts": {
    "primary": "'Inter', sans-serif",
    "mono": "'JetBrains Mono', monospace"
  },

  // ── Arbitrary custom properties (optional) ─────────────────
  // Each key is mapped to --aurora-<key> on :root, usable in Custom CSS.
  "custom": {
    "sidebar-width": "280px",
    "my-highlight": "255 200 0"

  }
}
```

## CSS variable reference

Every theme property maps to a CSS custom property on `:root`. You can use these in the Custom CSS textarea in Settings.

| Theme property | CSS variable | Default value |
|---|---|---|
| `colors.accent` | `--accent` | `139 92 246` |
| `colors.accentHover` | `--accent-hover` | `167 139 250` |
| `colors.accentDark` | `--accent-dark` | `109 40 217` |
| `colors.bgPrimary` | `--bg-primary` | `rgba(10, 10, 10, 0.95)` |
| `colors.bgSecondary` | `--bg-secondary` | `rgba(18, 18, 18, 0.85)` |
| `colors.bgTertiary` | `--bg-tertiary` | `rgba(30, 30, 30, 0.9)` |
| `colors.textPrimary` | `--text-primary` | `rgb(var(--app-text))` |
| `colors.textSecondary` | `--text-secondary` | `rgb(var(--app-text) / 0.6)` |
| `colors.textTertiary` | `--text-tertiary` | `rgb(var(--app-text) / 0.4)` |
| `colors.border` | `--border` | `rgb(var(--app-text) / 0.08)` |
| `colors.appText` | `--app-text` | `255 255 255` |
| `colors.appOverlay` | `--app-overlay` | `0 0 0` |
| `colors.controlBg` | `--control-bg` | `255 255 255` |
| `colors.controlFg` | `--control-fg` | `0 0 0` |
| `colors.bgSolid` | `--bg-solid` | `#0c0c0c` |
| `glass.background` | `--glass-bg` | `rgba(20, 20, 20, 0.75)` |
| `glass.lightBackground` | `--glass-light-bg` | `rgba(35, 35, 35, 0.6)` |
| `glass.heavyBackground` | `--glass-heavy-bg` | `rgba(12, 12, 12, 0.92)` |
| `glass.blur` | `--glass-blur` | `blur(40px) saturate(180%)` |
| `scrollbar.thumb` | `--scrollbar-thumb` | `rgba(255, 255, 255, 0.15)` |
| `scrollbar.thumbHover` | `--scrollbar-thumb-hover` | `rgba(255, 255, 255, 0.25)` |
| `slider.thumb` | `--slider-thumb` | `rgb(var(--control-bg))` |
| `slider.track` | `--slider-track` | `rgb(var(--app-text) / 0.1)` |
| `coverShadow` | `--cover-shadow` | `0 8px 30px rgba(0,0,0,0.5), ...` |
| `fonts.primary` | `--font-primary` | System font stack |
| `fonts.mono` | `--font-mono` | System mono stack |
| `custom.<key>` | `--aurora-<key>` | *(none)* |

## Dark vs light themes

Aurora's UI uses Tailwind utility classes like `text-white/80`, `bg-white/[0.06]`, `border-white/10`, etc. These all resolve through the `--app-text` and `--app-overlay` CSS variables, so changing those two values inverts the entire UI automatically:

| Property | Dark theme | Light theme |
|----------|-----------|-------------|
| `appText` | `255 255 255` | `0 0 0` |
| `appOverlay` | `0 0 0` | `255 255 255` |
| `controlBg` | `255 255 255` | `30 30 30` |
| `controlFg` | `0 0 0` | `255 255 255` |
| `bgSolid` | `#0c0c0c` | `#f0f0f0` |

The `bgSolid` property is important for light themes — it controls the background when the user has transparency turned off in settings. Without it, the app would fall back to the dark default `#0c0c0c`.

## Custom CSS

In addition to (or instead of) a JSON theme, you can paste raw CSS into the **Custom CSS** textarea in Settings → Themes. This CSS is injected as a `<style>` element and can target any Aurora class or CSS variable.

Example — override just the accent colour:

```css
:root {
  --accent: 236 72 153;
  --accent-hover: 244 114 182;
  --accent-dark: 219 39 119;
}
```

Custom CSS is applied *on top of* the currently active JSON theme, so you can use a theme as a base and tweak individual values.

## File locations

| Platform | Themes directory |
|----------|-----------------|
| Linux | `~/.config/aurora-player/themes/` |
| Windows | `%APPDATA%/aurora-player/themes/` |

Theme files are named `<theme-id>.json`. Aurora watches this directory for changes and automatically refreshes the theme list.
