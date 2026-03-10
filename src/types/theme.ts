/** Aurora theme definition — a JSON-serialisable colour / style override. */
export interface AuroraTheme {
  /** Unique identifier (kebab-case, e.g. "nord-dark") */
  id: string
  /** Human-readable name */
  name: string
  /** Author name */
  author: string
  /** Semver version string */
  version: string
  /** Optional description shown in the theme picker */
  description?: string

  colors: {
    /** RGB triplet for Tailwind opacity, e.g. "139 92 246" */
    accent: string
    accentHover: string
    accentDark: string
    /** Full CSS value, e.g. "rgba(10, 10, 10, 0.95)" */
    bgPrimary: string
    bgSecondary: string
    bgTertiary: string
    textPrimary: string
    textSecondary: string
    textTertiary: string
    border: string

    /**
     * Base RGB triplets (space-separated) used by Tailwind's white/black
     * override. Controls every opacity-based text/bg/border class in one go.
     *   appText  – "255 255 255" for dark themes, "0 0 0" for light
     *   appOverlay – the inverse: heavy overlays / backdrops
     */
    appText?: string
    appOverlay?: string

    /** Solid-colour buttons & toggle knobs */
    controlBg?: string
    controlFg?: string

    /** Opaque background used when transparency is turned off */
    bgSolid?: string
  }

  /** Override the glass panel styles */
  glass?: {
    background?: string
    lightBackground?: string
    heavyBackground?: string
    blur?: string
    saturate?: string
  }

  /** Scrollbar colours (full CSS values) */
  scrollbar?: {
    thumb?: string
    thumbHover?: string
  }

  /** Slider / range input overrides (full CSS values) */
  slider?: {
    thumb?: string
    track?: string
  }

  /** Cover art box-shadow override (full CSS shorthand) */
  coverShadow?: string

  /** Custom font families */
  fonts?: {
    primary?: string
    mono?: string
  }

  /** Arbitrary extra CSS custom properties (mapped to --aurora-<key>) */
  custom?: Record<string, string>
}

/** Default theme – mirrors the values in main.css :root */
export const DEFAULT_THEME: AuroraTheme = {
  id: 'aurora-default',
  name: 'Aurora Default',
  author: 'Aurora',
  version: '1.0.0',
  description: 'The default Aurora dark theme',
  colors: {
    accent: '139 92 246',
    accentHover: '167 139 250',
    accentDark: '109 40 217',
    bgPrimary: 'rgba(10, 10, 10, 0.95)',
    bgSecondary: 'rgba(18, 18, 18, 0.85)',
    bgTertiary: 'rgba(30, 30, 30, 0.9)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    textTertiary: 'rgba(255, 255, 255, 0.4)',
    border: 'rgba(255, 255, 255, 0.08)',
    appText: '255 255 255',
    appOverlay: '0 0 0',
    controlBg: '255 255 255',
    controlFg: '0 0 0',
    bgSolid: '#0c0c0c',
  },
  glass: {
    background: 'rgba(20, 20, 20, 0.75)',
    lightBackground: 'rgba(35, 35, 35, 0.6)',
    heavyBackground: 'rgba(12, 12, 12, 0.92)',
    blur: 'blur(40px) saturate(180%)',
  },
  scrollbar: {
    thumb: 'rgba(255, 255, 255, 0.15)',
    thumbHover: 'rgba(255, 255, 255, 0.25)',
  },
  slider: {
    thumb: 'rgb(255, 255, 255)',
    track: 'rgba(255, 255, 255, 0.1)',
  },
  coverShadow: '0 8px 30px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)',
}
