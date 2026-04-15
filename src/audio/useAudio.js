/**
 * useAudio — React hook that exposes the AudioManager to components.
 *
 * Stays in sync with settings changes via AudioManager.subscribe() so any
 * volume/mute update (even from another component) re-renders automatically.
 *
 * Usage:
 *   const { playSfx, playBgm, stopBgm, settings, setVolume, setMuted } = useAudio();
 *
 * For fire-and-forget SFX in event handlers you don't need the hook at all —
 * just call AudioManager.playSfx('ui_click') directly.
 */

import { useState, useEffect, useCallback } from 'react';
import AudioManager from './AudioManager.js';

export default function useAudio() {
  const [settings, setSettings] = useState(() => AudioManager.getSettings());

  // Keep local settings state in sync with the manager
  useEffect(() => AudioManager.subscribe(setSettings), []);

  const playSfx = useCallback((sfxId) => AudioManager.playSfx(sfxId), []);
  const playBgm = useCallback((trackId, opts) => AudioManager.playBgm(trackId, opts), []);
  const stopBgm = useCallback((opts) => AudioManager.stopBgm(opts), []);
  const setVolume = useCallback((channel, value) => AudioManager.setVolume(channel, value), []);
  const setMuted  = useCallback((channel, muted)  => AudioManager.setMuted(channel, muted),  []);

  return { playSfx, playBgm, stopBgm, settings, setVolume, setMuted };
}
