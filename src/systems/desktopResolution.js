/**
 * desktopResolution.js — Window resolution control for the Steam (Electron) build.
 *
 * Steam is the only runtime where we own the OS window and can resize it via
 * IPC. On Android-on-PC the host window is controlled by the Google Play
 * Games for PC client (we are a guest inside their window) and on browser /
 * mobile there's no OS window to control. The setting is therefore Steam-only.
 *
 * Storage: single key `resolution` in localStorage.
 * Values: 'mobile' | 'windowed720p' | 'fullscreen'
 */

import { Platform } from '../platform';

export const RESOLUTION_KEY = 'resolution';
export const DEFAULT_RESOLUTION = 'mobile';

export const RESOLUTIONS = [
  { mode: 'mobile',       label: 'Mobile',     sub: '420 × 860', width: 420,  height: 860  },
  { mode: 'windowed720p', label: '720p',       sub: '1280 × 720', width: 1280, height: 720  },
  { mode: 'fullscreen',   label: 'Fullscreen', sub: 'native',     width: null, height: null },
];

const VALID_MODES = new Set(RESOLUTIONS.map(r => r.mode));

function isValid(mode) { return VALID_MODES.has(mode); }

/** Read saved resolution (or default). */
export function getResolution() {
  try {
    const v = localStorage.getItem(RESOLUTION_KEY);
    return isValid(v) ? v : DEFAULT_RESOLUTION;
  } catch { return DEFAULT_RESOLUTION; }
}

/** Persist resolution to localStorage. */
export function saveResolution(mode) {
  if (!isValid(mode)) return;
  try { localStorage.setItem(RESOLUTION_KEY, mode); } catch {}
}

/**
 * Apply the resolution to the runtime. Steam-only: resizes the OS window via
 * Electron IPC. No-op on every other platform.
 *
 * Idempotent — safe to call on every settings change AND on app boot.
 */
export function applyResolution(mode) {
  if (!isValid(mode)) mode = DEFAULT_RESOLUTION;
  if (typeof window === 'undefined' || !window.electronBridge?.setResolution) return;
  try { window.electronBridge.setResolution(mode); } catch {}
}

/**
 * Whether the resolution selector should be shown in Settings.
 * Steam-only: on Android-on-PC the host window is controlled by the Google
 * Play Games for PC client; on browser / mobile there is no OS window to
 * control. Only the Steam build owns its window via Electron.
 */
export function isResolutionSelectorAvailable() {
  return Platform.isSteam;
}

/** Convenience: restore the last saved resolution on boot. */
export function restoreResolution() {
  applyResolution(getResolution());
}
