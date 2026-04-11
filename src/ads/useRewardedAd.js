import { useState, useEffect, useCallback, useRef } from 'react';
import { loadRewardedAd, showRewardedAd } from './adService';

/**
 * Manages the full lifecycle of a single rewarded ad slot:
 * load → ready → show → cooldown → load → ...
 *
 * @param {function} onReward  Called when user completes the ad and earns the reward.
 * @param {number}   cooldownMs  How long before the ad can be shown again (default 30 min).
 *
 * @returns {{
 *   isReady: boolean,
 *   isLoading: boolean,
 *   isCooldown: boolean,
 *   cooldownRemaining: number,  // ms remaining in cooldown
 *   show: function,
 * }}
 */
export function useRewardedAd(onReward, cooldownMs = 30 * 60 * 1000, storageKey = null) {
  const savedCooldownEnd = storageKey
    ? parseInt(localStorage.getItem(storageKey) ?? '0', 10)
    : 0;
  const restoredRemaining = Math.max(0, savedCooldownEnd - Date.now());

  const [status, setStatus] = useState(restoredRemaining > 0 ? 'cooldown' : 'loading');
  const [cooldownRemaining, setCooldownRemaining] = useState(restoredRemaining);

  const cooldownInterval = useRef(null);
  const cooldownEnd      = useRef(restoredRemaining > 0 ? savedCooldownEnd : 0);
  const onRewardRef      = useRef(onReward);
  onRewardRef.current    = onReward;

  const load = useCallback(async () => {
    setStatus('loading');
    const ok = await loadRewardedAd();
    setStatus(ok ? 'ready' : 'unavailable');
  }, []);

  // Restore cooldown interval if we resumed mid-cooldown
  useEffect(() => {
    if (restoredRemaining <= 0) { load(); return; }
    cooldownInterval.current = setInterval(() => {
      const remaining = cooldownEnd.current - Date.now();
      if (remaining <= 0) {
        clearInterval(cooldownInterval.current);
        if (storageKey) localStorage.removeItem(storageKey);
        setCooldownRemaining(0);
        load();
      } else {
        setCooldownRemaining(remaining);
      }
    }, 1000);
    return () => clearInterval(cooldownInterval.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup cooldown timer on unmount
  useEffect(() => () => clearInterval(cooldownInterval.current), []);

  const show = useCallback(async () => {
    if (status !== 'ready') return;
    setStatus('showing');

    const { rewarded } = await showRewardedAd();

    if (rewarded) {
      onRewardRef.current();

      // Start cooldown
      cooldownEnd.current = Date.now() + cooldownMs;
      if (storageKey) localStorage.setItem(storageKey, cooldownEnd.current.toString());
      setCooldownRemaining(cooldownMs);
      setStatus('cooldown');

      cooldownInterval.current = setInterval(() => {
        const remaining = cooldownEnd.current - Date.now();
        if (remaining <= 0) {
          clearInterval(cooldownInterval.current);
          if (storageKey) localStorage.removeItem(storageKey);
          setCooldownRemaining(0);
          load();
        } else {
          setCooldownRemaining(remaining);
        }
      }, 1000);
    } else {
      // Ad dismissed without reward — reload silently
      load();
    }
  }, [status, cooldownMs, load]);

  return {
    isReady:           status === 'ready',
    isLoading:         status === 'loading',
    isCooldown:        status === 'cooldown',
    cooldownRemaining,
    show,
  };
}

/** Format ms as "MM:SS" for cooldown display */
export function formatCooldown(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
