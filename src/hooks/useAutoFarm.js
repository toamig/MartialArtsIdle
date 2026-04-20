/**
 * useAutoFarm — manages auto-farming config, background ticking, and offline gains.
 *
 * Design decisions:
 *   - This hook NEVER touches inventory directly.
 *     Gains accumulate in `pendingGains`; the caller applies them via `collectGains`.
 *   - Auto-farm is OFF by default. No activity starts unless explicitly enabled.
 *   - Background ticking uses setInterval (survives hidden tabs, unlike rAF).
 *   - Offline gains use the existing `lastSeen` timestamp from the main save.
 *   - `getStats` is called at tick time so it always reflects the current game state.
 *
 * Usage:
 *   const autoFarm = useAutoFarm({ worlds, getStats });
 *
 *   // Enable an activity:
 *   autoFarm.setAutoFarm('gathering', true, worldIndex, regionIndex);
 *
 *   // Apply accumulated gains when ready (e.g. on screen open or modal):
 *   autoFarm.collectGains((gains) => {
 *     Object.entries(gains.items).forEach(([id, qty]) => inventory.addItem(id, qty));
 *   });
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { loadGame } from '../systems/save';
import {
  loadAutoFarmConfig,
  saveAutoFarmConfig,
  getDefaultConfig,
  simulateGathering,
  simulateMining,
  mergeGains,
  hasGains,
} from '../systems/autoFarm';

const TICK_INTERVAL_MS  = 5_000; // background tick rate
const MIN_OFFLINE_SEC   = 5 * 60; // skip offline calc if away less than 5 minutes

// ─── Empty gains shape ────────────────────────────────────────────────────────

const PENDING_GAINS_KEY = 'mai_pending_gains';

function emptyGains() {
  return { items: {}, techniques: [] };
}

function mergeFullGains(a, b) {
  return {
    items:      mergeGains(a.items,      b.items),
    techniques: [...a.techniques, ...b.techniques],
  };
}

function loadPersistedGains() {
  try {
    const raw = localStorage.getItem(PENDING_GAINS_KEY);
    if (!raw) return emptyGains();
    const parsed = JSON.parse(raw);
    return {
      items:      parsed.items      ?? {},
      techniques: parsed.techniques ?? [],
    };
  } catch {
    return emptyGains();
  }
}

function savePersistedGains(gains) {
  try {
    localStorage.setItem(PENDING_GAINS_KEY, JSON.stringify(gains));
  } catch {}
}

function clearPersistedGains() {
  try {
    localStorage.removeItem(PENDING_GAINS_KEY);
  } catch {}
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param {object}   options
 * @param {Array}    options.worlds    — WORLDS array (static world/region data)
 * @param {function} options.getStats — () => { harvestSpeed?, harvestLuck?, miningSpeed?, miningLuck? }
 */
export default function useAutoFarm({ worlds, getStats }) {
  const [config, setConfigRaw] = useState(loadAutoFarmConfig);

  // Persist config whenever it changes
  useEffect(() => { saveAutoFarmConfig(config); }, [config]);

  // Notify Electron main process of active state so it knows whether to show notifications
  useEffect(() => {
    if (!window.electronBridge?.isElectron) return;
    const anyEnabled = config.gathering.enabled || config.mining.enabled;
    window.electronBridge.setAutoFarmActive(anyEnabled);
  }, [config]);

  // Live refs so the tick always uses fresh values without re-subscribing
  const getStatsRef = useRef(getStats);
  const configRef   = useRef(config);
  useEffect(() => { getStatsRef.current = getStats; }, [getStats]);
  useEffect(() => { configRef.current   = config;   }, [config]);

  // ─── Pending gains ──────────────────────────────────────────────────────────

  const [pendingGains, setPendingGains] = useState(() => {
    // Start from any gains the player hadn't collected before closing the app
    const persisted = loadPersistedGains();

    // Compute offline gains once at init
    const saved = loadGame();
    if (!saved?.lastSeen) return persisted;

    const awaySeconds = (Date.now() - saved.lastSeen) / 1000;
    if (awaySeconds < MIN_OFFLINE_SEC) return persisted;

    const cfg = loadAutoFarmConfig();
    let offline = emptyGains();

    for (const activity of ['gathering', 'mining']) {
      const actCfg = cfg[activity];
      if (!actCfg.enabled) continue;

      const world  = worlds?.[actCfg.worldIndex];
      const region = world?.regions?.[actCfg.regionIndex];
      if (!region) continue;

      let gained = emptyGains();

      if (activity === 'gathering') {
        gained.items = simulateGathering(awaySeconds, region, null);
      } else if (activity === 'mining') {
        gained.items = simulateMining(awaySeconds, region, null);
      }

      offline = mergeFullGains(offline, gained);
    }

    return mergeFullGains(persisted, offline);
  });

  // Persist pending gains to localStorage so they survive app close
  useEffect(() => { savePersistedGains(pendingGains); }, [pendingGains]);

  // ─── Background tick (setInterval — survives hidden tabs) ──────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      const cfg = configRef.current;
      const anyEnabled = cfg.gathering.enabled || cfg.mining.enabled;
      if (!anyEnabled) return;

      const stats = getStatsRef.current?.() ?? null;
      let tick = emptyGains();

      // cb_ts Veteran's Hunt — consume at most one pending kill-bump per
      // tick across all auto-farm activities. The first eligible activity
      // (gathering before mining, alphabetical order of the loop) gets it.
      const huntRef = stats?.huntBumpsPendingRef;
      let bumpThisTick = false;
      if (huntRef && huntRef.current > 0) {
        huntRef.current -= 1;
        bumpThisTick = true;
      }

      for (const activity of ['gathering', 'mining']) {
        const actCfg = cfg[activity];
        if (!actCfg.enabled) continue;

        const world  = worlds?.[actCfg.worldIndex];
        const region = world?.regions?.[actCfg.regionIndex];
        if (!region) continue;

        let gained = emptyGains();

        // Pass a per-call clone so the bump flag is consumed by exactly
        // the first activity that produces a drop (cleared after first use).
        const callStats = stats ? { ...stats, regionKillBumpPending: bumpThisTick } : null;
        if (bumpThisTick) bumpThisTick = false;

        if (activity === 'gathering') {
          gained.items = simulateGathering(TICK_INTERVAL_MS / 1000, region, callStats);
        } else if (activity === 'mining') {
          gained.items = simulateMining(TICK_INTERVAL_MS / 1000, region, callStats);
        }

        tick = mergeFullGains(tick, gained);
      }

      if (hasGains(tick)) {
        setPendingGains(prev => {
          const next = mergeFullGains(prev, tick);
          // Signal Electron that gains are waiting (main decides if window is hidden)
          if (window.electronBridge?.isElectron) {
            const cfg = configRef.current;
            window.electronBridge.notifyGainsReady({
              gathering: cfg.gathering.enabled,
              mining:    cfg.mining.enabled,
              itemCount: Object.values(next.items).reduce((s, n) => s + n, 0),
            });
          }
          return next;
        });
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [worlds]); // worlds is static — this runs once

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Enable or disable an auto-farm activity and set its target region.
   * @param {'combat'|'gathering'|'mining'} activity
   * @param {boolean} enabled
   * @param {number}  worldIndex   — index into the worlds array
   * @param {number}  regionIndex  — index into world.regions
   */
  const setAutoFarm = useCallback((activity, enabled, worldIndex, regionIndex) => {
    setConfigRaw(prev => ({
      ...prev,
      [activity]: {
        ...prev[activity],
        enabled,
        worldIndex:  worldIndex  ?? prev[activity].worldIndex,
        regionIndex: regionIndex ?? prev[activity].regionIndex,
      },
    }));
  }, []);

  /**
   * Set an idle activity. By default mutex — clears all other activities so
   * exactly one assignment is active. When fp_k Twofold Path is owned the
   * caller passes `dualEnabled: true` and a second assignment is allowed
   * (cap of 2 enabled at once; the oldest is preserved if user tries to add
   * a third).
   *
   * Call with activity=null to stop all auto-farming.
   */
  const setIdleActivity = useCallback((activity, worldIndex = 0, regionIndex = 0, dualEnabled = false) => {
    setConfigRaw((prev) => {
      const base = getDefaultConfig();
      if (!activity) return base;
      if (!dualEnabled) {
        return { ...base, [activity]: { enabled: true, worldIndex, regionIndex } };
      }
      // Dual mode: keep any other already-enabled activity, cap at 2.
      const enabled = Object.entries(prev).filter(([k, v]) => v.enabled && k !== activity);
      const next = { ...base };
      // Keep at most one other enabled activity.
      if (enabled.length >= 1) {
        const [keepKey, keepCfg] = enabled[0];
        next[keepKey] = keepCfg;
      }
      next[activity] = { enabled: true, worldIndex, regionIndex };
      return next;
    });
  }, []);

  /**
   * Apply all pending gains via a caller-provided callback, then clear them.
   * The callback receives: { items: { [itemId]: qty }, techniques: [...] }
   *
   * @param {function} applyFn  — (gains) => void
   */
  const collectGains = useCallback((applyFn) => {
    setPendingGains(prev => {
      if (!hasGains(prev)) return prev;
      try { applyFn(prev); } catch {}
      clearPersistedGains();
      return emptyGains();
    });
  }, []);

  /** Discard pending gains without applying them. */
  const clearGains = useCallback(() => {
    clearPersistedGains();
    setPendingGains(emptyGains());
  }, []);

  return {
    /** Current auto-farm configuration. */
    autoFarmConfig: config,
    /** Enable/disable an activity and point it at a region. */
    setAutoFarm,
    /** Set exactly one idle region (mutex). Pass null activity to stop all. */
    setIdleActivity,
    /** Accumulated gains not yet applied (offline + background ticks). */
    pendingGains,
    /** Apply gains via callback and clear them. */
    collectGains,
    /** Discard gains without applying. */
    clearGains,
    /** True if any gains are waiting. */
    hasPendingGains: hasGains(pendingGains),
  };
}
