/**
 * Platform-aware ad service.
 *
 * Provider selection (build-time + runtime):
 *   DEV mode (any platform)  →  mock    (fake countdown, tests both reward paths)
 *   browser / demo mode      →  mock    (until real IMA ad unit IDs are configured)
 *   Native iOS / Android     →  admob   (AdMob via Capacitor)
 *   Browser / Steam (prod)   →  ima     (Google IMA HTML5 SDK — enable once IDs are set)
 *
 * All consumers (useRewardedAd, etc.) call only this module —
 * they never import a provider directly.
 */

import { Platform } from '../platform';

let _provider = null;

async function provider() {
  if (_provider) return _provider;

  const mode = import.meta.env.MODE; // 'development' | 'browser' | 'demo' | 'native' | 'steam' | 'production'

  if (import.meta.env.DEV || mode === 'browser' || mode === 'demo') {
    // Mock until real IMA ad unit IDs are obtained from Google Ad Manager.
    // To switch to live IMA ads: remove 'browser' and 'demo' from this condition.
    _provider = await import('./providers/mock.js');
  } else if (Platform.isNative) {
    _provider = await import('./providers/admob.js');
  } else {
    // Browser PWA + Steam with real IMA ad unit IDs
    _provider = await import('./providers/ima.js');
  }

  return _provider;
}

/** Call once on app startup. Safe on all platforms. */
export async function initAds() {
  const p = await provider();
  await p.init();
}

/** Preload a rewarded ad. Returns true if an ad is ready to show. */
export async function loadRewardedAd() {
  const p = await provider();
  return p.loadRewarded();
}

/**
 * Show the preloaded rewarded ad.
 * Returns { rewarded: true } if user watched to completion.
 * Returns { rewarded: false } if skipped, dismissed, or unavailable.
 * Always safe to call — never throws.
 */
export async function showRewardedAd() {
  const p = await provider();
  return p.showRewarded();
}
