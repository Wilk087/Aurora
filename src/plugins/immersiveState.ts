/**
 * Shared immersive mode state — bridging FullscreenView and the Plugin API.
 *
 * FullscreenView writes to this on mount/unmount/settings change.
 * Plugins read from it via aurora.immersive.* and listen for events via the bus.
 */

import { reactive } from 'vue'
import { pluginBus } from './eventBus'

export type ImmersiveStyleId = 'default' | 'modern' | 'artwork'
export type ImmersiveAnimStyleId = 'lava-lamp' | 'sonar-ripple' | 'cinematic-grain'

export interface ImmersiveSettings {
  style: ImmersiveStyleId
  vibrant: Record<ImmersiveStyleId, boolean>
  animated: Record<ImmersiveStyleId, boolean>
  animStyle: Record<ImmersiveStyleId, ImmersiveAnimStyleId>
  hideControls: Record<ImmersiveStyleId, boolean>
}

export interface ImmersiveState {
  active: boolean
  settings: ImmersiveSettings
}

/** The shared reactive state — updated by FullscreenView, read by plugins */
export const immersiveState: ImmersiveState = reactive({
  active: false,
  settings: {
    style: 'default',
    vibrant: { default: false, modern: true, artwork: false },
    animated: { default: false, modern: false, artwork: false },
    animStyle: { default: 'lava-lamp', modern: 'lava-lamp', artwork: 'lava-lamp' },
    hideControls: { default: false, modern: false, artwork: false },
  },
})

// ── Helpers called by FullscreenView ──────────────────────────────────────

export function setImmersiveActive(active: boolean) {
  immersiveState.active = active
  pluginBus.emit(active ? 'immersiveEnter' : 'immersiveExit')
}

export function updateImmersiveSettings(patch: Partial<ImmersiveSettings>) {
  Object.assign(immersiveState.settings, patch)
  pluginBus.emit('immersiveSettingsChanged', { ...immersiveState.settings })
}

// ── Helpers called by Plugin API (write access) ──────────────────────────

export function setImmersiveStyle(style: ImmersiveStyleId) {
  immersiveState.settings.style = style
  pluginBus.emit('immersiveSettingsChanged', { ...immersiveState.settings })
}

export function setImmersiveVibrant(style: ImmersiveStyleId, value: boolean) {
  immersiveState.settings.vibrant[style] = value
  pluginBus.emit('immersiveSettingsChanged', { ...immersiveState.settings })
}

export function setImmersiveAnimated(style: ImmersiveStyleId, value: boolean) {
  immersiveState.settings.animated[style] = value
  pluginBus.emit('immersiveSettingsChanged', { ...immersiveState.settings })
}

export function setImmersiveAnimStyle(style: ImmersiveStyleId, animStyle: ImmersiveAnimStyleId) {
  immersiveState.settings.animStyle[style] = animStyle
  pluginBus.emit('immersiveSettingsChanged', { ...immersiveState.settings })
}

export function setImmersiveHideControls(style: ImmersiveStyleId, value: boolean) {
  immersiveState.settings.hideControls[style] = value
  pluginBus.emit('immersiveSettingsChanged', { ...immersiveState.settings })
}
