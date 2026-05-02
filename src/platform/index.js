import { Capacitor } from '@capacitor/core';

/**
 * Runtime platform detection.
 *
 * ── Build-target flags (baked at build time) ──
 *   isNative   — true inside a Capacitor WebView (Android or iOS)
 *   isAndroid  — Capacitor reports 'android' (phone OR Google Play Games for PC)
 *   isIOS      — Capacitor reports 'ios'
 *   isWeb      — running in a real browser / PWA (no Capacitor wrapper)
 *   isSteam    — built with `--mode steam` (Electron desktop wrapper)
 *
 * ── Runtime flags (heuristics, evaluated on import) ──
 *   isAndroidOnPC      — Android AAB running on the Google Play Games for PC client
 *   isGooglePlayGamesPC — same as above, slightly stricter (UA-only)
 *   hasKeyboardMouse   — input device has a fine pointer + hover (mouse-driven)
 *   isDesktop          — any desktop-like environment (Steam, Android-on-PC, or browser-on-PC)
 *
 * ── Viewport size category (re-evaluated on resize via the `subscribe` API) ──
 *   isPhoneSize, isTabletSize, isDesktopSize
 *
 * Use these to gate platform-specific features cleanly. AdMob is native-only.
 * Resolution selector should appear when `isDesktop`. Touch hints should hide
 * when `hasKeyboardMouse` is true. Etc.
 *
 * @example
 * import { Platform } from '../platform';
 * if (Platform.isDesktop) showResolutionSelector();
 * if (Platform.hasKeyboardMouse) showKeyboardHints();
 */

const _nativePlatform = Capacitor.getPlatform();           // 'android' | 'ios' | 'web'
const _buildTarget    = import.meta.env.MODE;              // 'native' | 'steam' | 'browser' | ...
const _ua             = (typeof navigator !== 'undefined' && navigator.userAgent) || '';

// ── Google Play Games for PC user-agent fingerprints ────────────────────────
// The PC client injects identifying tokens into the WebView UA. Google has
// changed these strings over time — keep this list growing as new ones appear.
const _isGooglePlayGamesPC =
  /GoogleGameSDK|GooglePlayGames|HPE-PC|HPE_PC|GameCenter\/Windows/i.test(_ua);

// ── Pointer / hover heuristics ─────────────────────────────────────────────
// (pointer: fine) is true for mouse-class devices; (hover: hover) confirms
// a real cursor (touchscreens fake-fire pointer events but cannot hover).
function _mq(query) {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try { return window.matchMedia(query).matches; } catch { return false; }
}
const _hasFinePointer = _mq('(pointer: fine)');
const _canHover       = _mq('(hover: hover)');
const _hasKeyboardMouse = _hasFinePointer && _canHover;

// ── Combined "Android running on PC" heuristic ─────────────────────────────
// True when the AAB is running inside the Google Play Games for PC client.
// Combines UA detection with input fingerprint so it survives Google
// rebranding the UA string.
const _isAndroidOnPC =
  _nativePlatform === 'android' && (_isGooglePlayGamesPC || _hasKeyboardMouse);

// ── Combined "is desktop" — the umbrella flag for desktop-style behaviour ──
// Steam build, Android-on-PC, or browser running on a real desktop. Use this
// to gate the resolution selector, larger UI affordances, keyboard shortcuts.
const _isDesktop =
  _buildTarget === 'steam'
  || _isAndroidOnPC
  || (_nativePlatform === 'web' && _hasKeyboardMouse);

// ── Viewport size categorisation ────────────────────────────────────────────
// These read the live viewport so they update on resize. For the static
// snapshot below we capture once at import; consumers that need live values
// should call Platform.refreshViewport() after a resize listener.
function _viewportFlags() {
  if (typeof window === 'undefined') {
    return { isPhoneSize: true, isTabletSize: false, isDesktopSize: false };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  const min = Math.min(w, h);
  // Heuristic: phones < 600 short side, tablets 600-1024, desktops > 1024.
  return {
    isPhoneSize:   min < 600,
    isTabletSize:  min >= 600 && min < 1024,
    isDesktopSize: min >= 1024,
  };
}

let _viewport = _viewportFlags();

export const Platform = {
  // Build-target / Capacitor flags
  isNative:  Capacitor.isNativePlatform(),
  isAndroid: _nativePlatform === 'android',
  isIOS:     _nativePlatform === 'ios',
  isWeb:     _nativePlatform === 'web',
  isSteam:   _buildTarget === 'steam',

  // Runtime detection
  isAndroidOnPhone:    _nativePlatform === 'android' && !_isAndroidOnPC,
  isAndroidOnPC:       _isAndroidOnPC,
  isGooglePlayGamesPC: _isGooglePlayGamesPC,
  hasKeyboardMouse:    _hasKeyboardMouse,
  isDesktop:           _isDesktop,

  // Viewport size (snapshot at import)
  get isPhoneSize()   { return _viewport.isPhoneSize; },
  get isTabletSize()  { return _viewport.isTabletSize; },
  get isDesktopSize() { return _viewport.isDesktopSize; },

  /** Re-read the viewport after a window resize. Call from a resize handler. */
  refreshViewport() { _viewport = _viewportFlags(); },
};
