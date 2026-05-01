/**
 * AudioManager — singleton audio engine built on Howler.js.
 *
 * Responsibilities:
 *  - BGM: one active track at a time, crossfade on track change
 *  - SFX: fire-and-forget playback with per-sound volume config
 *  - Volume channels: master, bgm, sfx — each with independent mute
 *  - Settings persistence via audioSettings.js
 *  - Page Visibility: auto-pause/resume BGM when tab is hidden
 *  - Pub/sub: notifies React hooks when settings change so UI stays in sync
 *
 * Usage:
 *   AudioManager.playBgm('cultivation')
 *   AudioManager.playSfx('ui_click')
 *   AudioManager.setVolume('bgm', 0.5)
 *   AudioManager.setMuted('master', true)
 */

import { Howl, Howler } from 'howler';
import { BGM_TRACKS, SFX } from './sounds.js';
import { loadAudioSettings, saveAudioSettings } from './audioSettings.js';

// ── BGM fade duration (ms) ────────────────────────────────────────────────────
const BGM_FADE_OUT = 500;
const BGM_FADE_IN  = 500;

// ── Internal state ────────────────────────────────────────────────────────────

let settings      = loadAudioSettings();
let bgmHowl       = null;   // currently active BGM Howl instance
let bgmTrackId    = null;   // key into BGM_TRACKS
let bgmPaused     = false;  // true while tab is hidden
let adPlaying     = false;  // true while an ad has audio focus

// Browser autoplay policies block the AudioContext until a user gesture.
// We buffer any playBgm/playSfx calls before that, then flush on unlock().
let unlocked          = false;
let pendingBgmTrackId = null;

// BGM preload cache: { [trackId]: Howl } — keyed instances ready to play
const bgmCache    = {};

// SFX cache: { [sfxId]: Howl[] } — one Howl per variation. Single-sample
// sounds collapse to a one-element array; variation pools (combat hits) hold
// one Howl per uploaded sample so playSfx can pick at random.
const sfxCache    = {};

// Combat hit SFXs — get a small random rate jitter on every play so even the
// same variation sample doesn't sound bit-perfect identical twice in a row.
// Range: ±SFX_JITTER (so 0.04 → rate falls in [0.96, 1.04]).
const COMBAT_HIT_SFX = new Set([
  'combat_hit_player', 'combat_hit_enemy', 'combat_critical',
  'combat_dodge',      'combat_enemy_die',
]);
const SFX_JITTER = 0.04;

// Subscribers for settings changes (useAudio hooks)
const subscribers = new Set();

// ── Internal helpers ──────────────────────────────────────────────────────────

function effectiveBgmVol() {
  if (settings.masterMuted || settings.bgmMuted) return 0;
  return settings.masterVol * settings.bgmVol;
}

function effectiveSfxVol() {
  if (settings.masterMuted || settings.sfxMuted) return 0;
  return settings.masterVol * settings.sfxVol;
}

function notify() {
  for (const fn of subscribers) fn({ ...settings });
}

function persist() {
  saveAudioSettings(settings);
  notify();
}

// ── BGM ───────────────────────────────────────────────────────────────────────

function _createBgmHowl(trackId) {
  if (bgmCache[trackId]) {
    // Reuse preloaded instance — reset volume so we can fade in again
    bgmCache[trackId].volume(0);
    return bgmCache[trackId];
  }

  const config = BGM_TRACKS[trackId];
  if (!config) return null;

  return new Howl({
    src:    config.src,
    loop:   config.loop ?? true,
    volume: 0,
    html5:  false,
    onloaderror: (id, err) => {
      console.error(`[Audio] BGM "${trackId}" failed to load (tried: ${config.src.join(', ')}):`, err);
    },
  });
}

function _fadeOutAndStop(howl, duration = BGM_FADE_OUT) {
  if (!howl || !howl.playing()) return;
  howl.fade(howl.volume(), 0, duration);
  // Stop only — no unload so preloaded/cached instances stay buffered and can replay instantly
  setTimeout(() => { try { howl.stop(); } catch {} }, duration + 50);
}

// ── SFX ───────────────────────────────────────────────────────────────────────

function _getSfxHowls(sfxId) {
  if (sfxCache[sfxId]) return sfxCache[sfxId];

  const config = SFX[sfxId];
  if (!config) {
    console.warn(`[Audio] Unknown SFX id: "${sfxId}"`);
    return null;
  }

  // Normalise: variation pool wins over single src; otherwise wrap src.
  const variations = config.variations?.length
    ? config.variations
    : (config.src ? [{ src: config.src }] : []);

  if (variations.length === 0) {
    console.warn(`[Audio] SFX "${sfxId}" has no audio sources`);
    sfxCache[sfxId] = [];
    return sfxCache[sfxId];
  }

  const howls = variations.map((variant, i) => new Howl({
    src:    variant.src,
    volume: config.volume ?? 1.0,
    html5:  false,
    preload: false,
    onloaderror: (_id, err) => {
      console.error(`[Audio] SFX "${sfxId}"${variations.length > 1 ? ` variant ${i + 1}` : ''} failed to load (tried: ${variant.src.join(', ')}):`, err);
    },
    onplayerror: (_id, err) => {
      console.error(`[Audio] SFX "${sfxId}"${variations.length > 1 ? ` variant ${i + 1}` : ''} failed to play:`, err);
    },
  }));

  sfxCache[sfxId] = howls;
  return howls;
}

// ── Page Visibility ───────────────────────────────────────────────────────────

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!bgmHowl) return;
    if (document.hidden) {
      bgmHowl.pause();
      bgmPaused = true;
    } else if (bgmPaused && !adPlaying) {
      bgmHowl.play();
      bgmHowl.fade(bgmHowl.volume(), effectiveBgmVol(), 400);
      bgmPaused = false;
    }
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

const AudioManager = {
  /**
   * Play a BGM track. If the same track is already playing, does nothing.
   * Crossfades from the previous track if one is active.
   *
   * @param {string} trackId - Key from BGM_TRACKS (e.g. 'cultivation', 'combat')
   * @param {{ fade?: boolean }} [opts]
   */
  playBgm(trackId, { fade = true } = {}) {
    // Defer until first user gesture — browsers block AudioContext otherwise.
    if (!unlocked) {
      pendingBgmTrackId = trackId;
      return;
    }
    if (bgmTrackId === trackId && bgmHowl?.playing()) return;

    // Fade out old track simultaneously with new one fading in (true crossfade)
    if (bgmHowl) {
      _fadeOutAndStop(bgmHowl, fade ? BGM_FADE_OUT : 0);
    }

    bgmTrackId = trackId;
    const howl = _createBgmHowl(trackId);
    if (!howl) return;

    bgmHowl   = howl;
    bgmPaused = false;

    const targetVol = effectiveBgmVol();
    howl.play();

    if (fade) {
      howl.fade(0, targetVol, BGM_FADE_IN);
    } else {
      howl.volume(targetVol);
    }
  },

  /** Stop the current BGM with optional fade. */
  stopBgm({ fade = true } = {}) {
    if (!bgmHowl) return;
    _fadeOutAndStop(bgmHowl, fade ? BGM_FADE_OUT : 0);
    bgmHowl    = null;
    bgmTrackId = null;
    bgmPaused  = false;
  },

  /** The currently playing BGM track id, or null. */
  get currentBgm() { return bgmTrackId; },

  /**
   * Play a one-shot SFX. If the SFX has a variation pool, picks one variant at
   * random. Combat hit SFXs additionally get a small ±SFX_JITTER rate jitter so
   * back-to-back triggers never sound bit-perfect identical.
   *
   * @param {string} sfxId - Key from SFX (e.g. 'ui_click', 'combat_hit_player')
   * @param {{ rate?: number }} [opts] - rate=1 is normal speed; >1 raises pitch.
   *   Used for things like the Pattern Click osu-style rising-pitch taps.
   */
  playSfx(sfxId, { rate } = {}) {
    if (!unlocked) return;

    const vol = effectiveSfxVol();
    if (vol === 0) return;

    const howls = _getSfxHowls(sfxId);
    if (!howls || howls.length === 0) return;

    const howl = howls.length === 1
      ? howls[0]
      : howls[Math.floor(Math.random() * howls.length)];

    // Set howl-group volume + rate BEFORE play() — setting these on the id
    // returned by play() races when the howl is still loading (id is a placeholder).
    howl.volume(vol);
    let finalRate = rate ?? 1;
    if (COMBAT_HIT_SFX.has(sfxId)) {
      finalRate *= 1 + (Math.random() * 2 - 1) * SFX_JITTER;
    }
    howl.rate(finalRate);
    howl.play();
  },

  /**
   * Set volume for a channel.
   *
   * @param {'master'|'bgm'|'sfx'} channel
   * @param {number} value - 0.0 … 1.0
   */
  setVolume(channel, value) {
    const clamped = Math.min(1, Math.max(0, value));
    if (channel === 'master') settings.masterVol = clamped;
    if (channel === 'bgm')    settings.bgmVol    = clamped;
    if (channel === 'sfx')    settings.sfxVol    = clamped;

    // Apply immediately to live BGM
    if ((channel === 'master' || channel === 'bgm') && bgmHowl?.playing()) {
      bgmHowl.volume(effectiveBgmVol());
    }

    persist();
  },

  /**
   * Toggle mute for a channel.
   *
   * @param {'master'|'bgm'|'sfx'} channel
   * @param {boolean} muted
   */
  setMuted(channel, muted) {
    if (channel === 'master') settings.masterMuted = muted;
    if (channel === 'bgm')    settings.bgmMuted    = muted;
    if (channel === 'sfx')    settings.sfxMuted    = muted;

    // Apply immediately to live BGM
    if (bgmHowl?.playing()) {
      bgmHowl.volume(effectiveBgmVol());
    }

    persist();
  },

  /** Returns a copy of the current settings. */
  getSettings() {
    return { ...settings };
  },

  /**
   * Subscribe to settings changes.
   * Returns an unsubscribe function.
   *
   * @param {(settings: object) => void} fn
   */
  subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },

  /**
   * Unlock audio playback after the first user gesture.
   *
   * Resumes the suspended AudioContext, preloads SFX, preloads both BGM tracks,
   * and starts any BGM that was requested before unlock. Idempotent.
   */
  unlock() {
    if (unlocked) return;
    unlocked = true;

    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume().catch(() => {});
    }

    // Preload everything now that the context is allowed to run.
    this.preloadBgm(['cultivation', 'combat']);
    this.preload();

    if (pendingBgmTrackId) {
      const trackId = pendingBgmTrackId;
      pendingBgmTrackId = null;
      this.playBgm(trackId);
    }
  },

  /**
   * Preload BGM tracks into memory so crossfades are seamless.
   * Call once at app startup (after first user gesture if required by browser).
   *
   * @param {string[]} trackIds - Keys from BGM_TRACKS to preload.
   */
  preloadBgm(trackIds) {
    for (const id of trackIds) {
      if (bgmCache[id]) continue;
      const config = BGM_TRACKS[id];
      if (!config) continue;
      bgmCache[id] = new Howl({
        src:     config.src,
        loop:    config.loop ?? true,
        volume:  0,
        html5:   false,
        preload: true,
        onloaderror: (_id, err) => {
          console.error(`[Audio] BGM preload "${id}" failed:`, err);
        },
      });
    }
  },

  /** Fade out and pause BGM before an ad takes audio focus. */
  pauseForAd() {
    if (adPlaying) return;
    adPlaying = true;
    if (bgmHowl?.playing()) {
      bgmHowl.fade(bgmHowl.volume(), 0, 300);
      setTimeout(() => { try { bgmHowl?.pause(); } catch {} }, 350);
    }
  },

  /** Resume BGM after an ad releases audio focus. */
  resumeFromAd() {
    if (!adPlaying) return;
    adPlaying = false;
    if (bgmHowl && !bgmPaused) {
      bgmHowl.play();
      bgmHowl.fade(bgmHowl.volume(), effectiveBgmVol(), 400);
    }
  },

  /**
   * Preload a set of SFX howls so the first play has no latency.
   * Call this once after the first user gesture.
   *
   * @param {string[]} [sfxIds] - Subset to preload. Defaults to all.
   */
  preload(sfxIds = Object.keys(SFX)) {
    for (const id of sfxIds) {
      const howls = _getSfxHowls(id);
      if (!howls) continue;
      for (const howl of howls) {
        if (howl.state() === 'unloaded') howl.load();
      }
    }
  },
};

export default AudioManager;
