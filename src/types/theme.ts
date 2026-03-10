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
  }

  /** Override the glass panel styles */
  glass?: {
    background?: string
    blur?: string
    saturate?: string
  }

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
  },
}
