export interface RegistryPlugin {
  id: string
  name: string
  author: string
  description: string
  version: string
  tags?: string[]
  downloadUrl: string
  homepageUrl?: string
  screenshots?: string[]
  minAppVersion?: string
}

export interface RegistryTheme {
  id: string
  name: string
  author: string
  description: string
  version: string
  tags?: string[]
  downloadUrl: string
  homepageUrl?: string
  screenshots?: string[]
  preview?: {
    accent: string
    bg: string
  }
}

export interface RegistryIndex {
  updatedAt?: string
  plugins: RegistryPlugin[]
  themes: RegistryTheme[]
}
