import { useMemo, useEffect, useRef } from 'react';
import { FEATURE_GATES, evaluateGate } from '../data/featureGates';
import { FEATURES } from '../data/featureFlags';

// Walk a gate tree and return true if it contains a `flag` node whose current
// FEATURES value is false. Used to OVERRIDE the seenSet "once unlocked, always
// unlocked" fallback so a feature hidden behind a disabled build flag actually
// re-locks for players who'd unlocked it under an older build.
function gateBlockedByFalseFlag(gate) {
  if (!gate) return false;
  if (gate.type === 'flag') return !FEATURES[gate.flag];
  if (gate.type === 'all')  return (gate.gates ?? []).some(gateBlockedByFalseFlag);
  // 'any' would need different inverse logic; we only nest `flag` inside
  // `all` today so this branch is intentionally not handled.
  return false;
}

const SEEN_KEY = 'mai_seen_features';

function loadSeenFeatures(currentUnlocked) {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  // First load — seed with everything already unlocked so we don't spam
  // unlock toasts for features the player already has.
  return new Set(currentUnlocked);
}

function saveSeenFeatures(set) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
  } catch {}
}

/**
 * Evaluates which features are currently unlocked and fires a toast when a
 * feature transitions from locked → unlocked.
 *
 * @param {{ realmIndex, getQuantity }} cultivation — only realmIndex and inventory needed
 * @param {Set<string>} clearedRegions
 * @param {object}      inventory
 * @param {function}    onUnlock(featureId, msg) — called once per new unlock
 *
 * Returns:
 *   isUnlocked(featureId) — boolean
 *   getHint(featureId)    — tooltip string or null
 */
export default function useFeatureFlags({ cultivation, clearedRegions, inventory, onUnlock }) {
  const ctx = useMemo(() => ({
    realmIndex:    cultivation.realmIndex,
    clearedRegions,
    getQuantity:   inventory.getQuantity,
  }), [cultivation.realmIndex, clearedRegions, inventory.getQuantity]);

  // Compute the full unlocked set on every relevant state change.
  const unlocked = useMemo(() => {
    const set = new Set();
    for (const [id, def] of Object.entries(FEATURE_GATES)) {
      if (evaluateGate(def.gate, ctx)) set.add(id);
    }
    return set;
  }, [ctx]);

  // Initialise seenFeatures lazily the first time we know what's unlocked.
  const seenRef = useRef(null);
  if (seenRef.current === null) {
    seenRef.current = loadSeenFeatures(unlocked);
  }

  // Detect new unlocks and call onUnlock once per feature.
  useEffect(() => {
    const newlyUnlocked = [];
    for (const id of unlocked) {
      if (!seenRef.current.has(id)) {
        newlyUnlocked.push(id);
        seenRef.current.add(id);
      }
    }
    if (newlyUnlocked.length === 0) return;
    saveSeenFeatures(seenRef.current);
    if (onUnlock) {
      for (const id of newlyUnlocked) {
        const msg = FEATURE_GATES[id]?.unlockMsg;
        if (msg) onUnlock(id, msg);
      }
    }
  }, [unlocked, onUnlock]);

  // Once unlocked, always unlocked — features don't re-lock when transient
  // conditions (e.g. item counts) drop back to zero. EXCEPT: features whose
  // gate contains a now-false build-time flag (FEATURES.combat etc.) DO
  // re-lock, so flipping a flag off in source actually hides the surface
  // even for players who'd previously unlocked it under an older build.
  const isUnlocked = (featureId) => {
    const def = FEATURE_GATES[featureId];
    if (def && gateBlockedByFalseFlag(def.gate)) return false;
    return unlocked.has(featureId) || seenRef.current.has(featureId);
  };
  // A feature is HIDDEN (not merely locked) when its gate contains a build-
  // time flag whose current value is false. The NavBar uses this to drop the
  // tab entirely so players don't see a teaser they can never unlock in v1.
  const isHidden    = (featureId) => {
    const def = FEATURE_GATES[featureId];
    return !!(def && gateBlockedByFalseFlag(def.gate));
  };
  const getHint     = (featureId) => FEATURE_GATES[featureId]?.hint ?? null;
  const getDesc     = (featureId) => FEATURE_GATES[featureId]?.desc ?? null;

  return { isUnlocked, isHidden, getHint, getDesc, unlocked };
}
