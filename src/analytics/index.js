/* global __MAI_VERSION__ */
/**
 * analytics/index.js — single entry point for all telemetry.
 *
 * The rest of the codebase only ever imports from here. The GameAnalytics
 * SDK is treated as a private detail so we can swap it (or add a second
 * provider) later without touching gameplay code.
 *
 * Behaviour:
 *   - If VITE_GA_GAME_KEY / VITE_GA_SECRET_KEY are not set, every helper
 *     becomes a no-op. Dev builds without keys are silent and crash-free.
 *   - All helpers are safe to call before init() resolves — they queue
 *     internally inside the SDK.
 *   - Errors from the SDK are swallowed; analytics MUST never break gameplay.
 */

import { GameAnalytics, EGAResourceFlowType, EGAProgressionStatus, EGAAdAction, EGAAdType } from 'gameanalytics';
import { Capacitor } from '@capacitor/core';

const USER_ID_KEY    = 'mai_analytics_user_id';
const FIRSTS_KEY     = 'mai_analytics_firsts';
const BUILD_VERSION  = (typeof __MAI_VERSION__ !== 'undefined' && __MAI_VERSION__) || '0.0.0-dev';

let initialized = false;
let enabled     = false;
let firstsCache = null;

const RESOURCE_CURRENCIES = ['Qi', 'Karma', 'BloodLotus'];
const RESOURCE_ITEM_TYPES = [
  'Cultivation', 'Spark', 'Crystal',                  // Qi sources
  'Breakthrough', 'Pill',                             // Qi sinks
  'RealmReached', 'TreeNode', 'Reincarnation', 'Reroll',
  'OfflineGain', 'DailyBonus', 'AdReward',            // engagement / re-engagement
];

// Custom dimensions slot 1 = platform (web / android / ios / electron). Lets
// every dashboard be filtered by platform. Limited to 20 distinct values.
const PLATFORMS = ['web', 'android', 'ios', 'electron', 'unknown'];

function detectPlatform() {
  try {
    const cap = Capacitor?.getPlatform?.();
    if (cap === 'ios' || cap === 'android') return cap;
    // Electron exposes process.versions.electron via globalThis.
    const proc = globalThis?.process;
    if (proc?.versions?.electron) return 'electron';
    if (typeof window !== 'undefined') return 'web';
  } catch {}
  return 'unknown';
}

function safe(fn) {
  return (...args) => {
    if (!enabled) return;
    try { fn(...args); } catch (err) {
      if (import.meta.env.DEV) console.warn('[analytics]', err);
    }
  };
}

function getOrCreateUserId() {
  try {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() ?? `u_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  } catch {
    return `u_${Date.now()}`;
  }
}

function loadFirsts() {
  if (firstsCache) return firstsCache;
  try {
    const raw = localStorage.getItem(FIRSTS_KEY);
    firstsCache = raw ? JSON.parse(raw) : {};
  } catch { firstsCache = {}; }
  return firstsCache;
}

function persistFirsts() {
  try { localStorage.setItem(FIRSTS_KEY, JSON.stringify(firstsCache ?? {})); } catch {}
}

/**
 * Returns true when we should NOT initialise GameAnalytics for this session.
 *
 *   - localhost / 127.0.0.1 / *.local hostnames (dev + local preview builds)
 *   - file:// origins (Electron packaged build, opening dist/index.html directly)
 *   - Capacitor desktop in dev mode
 *
 * Real players on the deployed web build still get full telemetry. This just
 * stops the SDK from spamming "Failed to send events to collector" warnings
 * during local QA where the requests have nowhere useful to go.
 */
function isLocalEnvironment() {
  if (typeof window === 'undefined') return true;
  // Capacitor native (iOS/Android) always serves the bundle from a localhost
  // virtual server (https://localhost or capacitor://localhost) — those are
  // real player devices, never "local" for analytics purposes.
  try {
    if (Capacitor?.isNativePlatform?.()) return false;
  } catch {}
  const { protocol, hostname } = window.location;
  if (protocol === 'file:') return true;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  if (hostname.endsWith('.local')) return true;
  // Electron-packaged build: process.versions.electron is set
  try {
    if (globalThis?.process?.versions?.electron) return true;
  } catch {}
  return false;
}

/**
 * Initialise the SDK exactly once. Call from App boot.
 * Reads keys from Vite env (VITE_GA_GAME_KEY / VITE_GA_SECRET_KEY).
 * Missing keys → analytics stays disabled (no-op).
 * Local/desktop environments → analytics stays disabled (no-op).
 */
export function initAnalytics() {
  if (initialized) return;
  initialized = true;

  if (isLocalEnvironment()) {
    if (import.meta.env.DEV) console.info('[analytics] local environment → disabled');
    return;
  }

  const gameKey   = import.meta.env.VITE_GA_GAME_KEY;
  const secretKey = import.meta.env.VITE_GA_SECRET_KEY;

  if (!gameKey || !secretKey) {
    if (import.meta.env.DEV) console.info('[analytics] keys missing → disabled');
    return;
  }

  try {
    GameAnalytics.setEnabledInfoLog(import.meta.env.DEV);
    GameAnalytics.configureBuild(BUILD_VERSION);
    GameAnalytics.configureUserId(getOrCreateUserId());
    GameAnalytics.configureAvailableResourceCurrencies(RESOURCE_CURRENCIES);
    GameAnalytics.configureAvailableResourceItemTypes(RESOURCE_ITEM_TYPES);
    GameAnalytics.configureAvailableCustomDimensions01(PLATFORMS);
    GameAnalytics.initialize(gameKey, secretKey);
    GameAnalytics.setCustomDimension01(detectPlatform());
    enabled = true;
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[analytics] init failed', err);
  }
}

// ─── First-time milestones (FTUE) ──────────────────────────────────────────

/**
 * Fire a Design event exactly once per user, keyed by `id`. Uses localStorage
 * to remember the first-time set across sessions. Useful for tutorial /
 * onboarding milestones (first cultivation, first realm, first combat, etc.)
 * — these are the most important retention signals.
 */
export const trackFirstTime = safe((id, value) => {
  const firsts = loadFirsts();
  if (firsts[id]) return;
  firsts[id] = Date.now();
  persistFirsts();
  GameAnalytics.addDesignEvent(`First:${id}`, value);
});

// ─── Screen view ───────────────────────────────────────────────────────────

/** Fired on every navigate(). Helps identify dead screens and friction. */
export const trackScreenView = safe((screenId) => {
  GameAnalytics.addDesignEvent(`Screen:View:${slug(screenId)}`);
});

// ─── Cultivation / progression ─────────────────────────────────────────────

/** Major realm transition (e.g. Foundation → Core Formation). */
export const trackRealmAdvance = safe((realmIndex, realmName, isPeak, isFinal) => {
  GameAnalytics.addProgressionEvent(
    EGAProgressionStatus.Complete,
    'Realm',
    slug(realmName) || `r${realmIndex}`,
    '',
    realmIndex,
  );
  GameAnalytics.addDesignEvent(`Realm:Advance:${isPeak ? 'Peak' : 'Major'}${isFinal ? ':Final' : ''}`, realmIndex);
});

/** Player reached the final realm and ascended. Distinct milestone. */
export const trackAscension = safe((realmIndex) => {
  GameAnalytics.addDesignEvent('Realm:Ascended', realmIndex);
});

/** Player switched their active cultivation law. */
export const trackActiveLawSwitch = safe((lawId, element) => {
  GameAnalytics.addDesignEvent(`Law:ActiveSwitch:${element ?? 'x'}:${slug(lawId)}`);
});

/** Player triggered reincarnation. */
export const trackReincarnation = safe((peakRealmIndex, lifeCount) => {
  GameAnalytics.addDesignEvent('Reincarnation:Triggered', peakRealmIndex);
  GameAnalytics.addDesignEvent(`Reincarnation:Life:${lifeCount}`, peakRealmIndex);
});

// ─── Sparks ────────────────────────────────────────────────────────────────

export const trackSparkPicked = safe((sparkId, choiceCount, realmIndex) => {
  GameAnalytics.addDesignEvent(`Spark:Picked:${sparkId}`, realmIndex);
  if (choiceCount) GameAnalytics.addDesignEvent(`Spark:Offered:${choiceCount}cards`);
});

export const trackSparkRerolled = safe((isFree, costPaid) => {
  GameAnalytics.addDesignEvent(`Spark:Rerolled:${isFree ? 'Free' : 'Paid'}`, costPaid ?? 0);
});

/** Fires when a timed Qi Spark expires without being consumed. */
export const trackSparkExpired = safe((sparkId) => {
  GameAnalytics.addDesignEvent(`Spark:Expired:${slug(sparkId)}`);
});

// ─── Pills ─────────────────────────────────────────────────────────────────

export const trackPillConsumed = safe((pillId, statCount) => {
  GameAnalytics.addDesignEvent(`Pill:Consumed:${pillId}`, statCount ?? 1);
});

/** Fired when a recipe is discovered for the first time (per user). */
export const trackPillDiscovered = safe((pillId) => {
  GameAnalytics.addDesignEvent(`Pill:Discovered:${slug(pillId)}`);
});

/** Fired every time a pill is crafted (after discovery). */
export const trackPillCrafted = safe((pillId, qty) => {
  GameAnalytics.addDesignEvent(`Pill:Crafted:${slug(pillId)}`, qty ?? 1);
});

// ─── Artefacts / sets ──────────────────────────────────────────────────────

export const trackArtefactEquipped = safe((slotId, rarity, element) => {
  GameAnalytics.addDesignEvent(`Artefact:Equipped:${slotId}:${rarity ?? 'unknown'}:${element ?? 'none'}`);
});

export const trackSetCompleted = safe((setId, pieceCount) => {
  GameAnalytics.addDesignEvent(`Set:Completed:${setId}`, pieceCount);
});

// ─── Combat ────────────────────────────────────────────────────────────────

export const trackCombatStart = safe((worldId, regionIndex, enemyName) => {
  GameAnalytics.addDesignEvent(`Combat:Start:w${worldId}:r${regionIndex}:${slug(enemyName)}`);
});

export const trackCombatWin = safe((worldId, regionIndex, enemyName, durationMs, turns) => {
  GameAnalytics.addDesignEvent(`Combat:Win:w${worldId}:r${regionIndex}:${slug(enemyName)}`, durationMs);
  if (turns != null) GameAnalytics.addDesignEvent('Combat:Turns:Win', turns);
});

export const trackCombatLoss = safe((worldId, regionIndex, enemyName, durationMs, turns) => {
  GameAnalytics.addDesignEvent(`Combat:Loss:w${worldId}:r${regionIndex}:${slug(enemyName)}`, durationMs);
  if (turns != null) GameAnalytics.addDesignEvent('Combat:Turns:Loss', turns);
});

export const trackRegionCleared = safe((regionName) => {
  GameAnalytics.addDesignEvent(`Region:Cleared:${slug(regionName)}`);
});

// ─── Achievements ──────────────────────────────────────────────────────────

export const trackAchievementUnlocked = safe((achievementId) => {
  GameAnalytics.addDesignEvent(`Achievement:Unlocked:${achievementId}`);
});

// ─── Crystal ───────────────────────────────────────────────────────────────

export const trackCrystalFed = safe((newLevel, tierChanged, newTier) => {
  GameAnalytics.addDesignEvent('Crystal:Fed', newLevel);
  if (tierChanged) GameAnalytics.addDesignEvent(`Crystal:TierUp:${newTier}`, newLevel);
});

// ─── Laws / techniques ─────────────────────────────────────────────────────

export const trackLawPicked = safe((lawId, element, realmIndex) => {
  GameAnalytics.addDesignEvent(`Law:Picked:${element ?? 'x'}:${lawId}`, realmIndex);
});

/** Player skipped a law offer (free skip; not allowed for first-ever offer). */
export const trackLawSkipped = safe((realmIndex) => {
  GameAnalytics.addDesignEvent('Law:Skipped', realmIndex);
});

export const trackTechniqueDrop = safe((techId, quality, type, isDuplicate) => {
  GameAnalytics.addDesignEvent(`Technique:Drop:${type}:${quality}:${isDuplicate ? 'Dup' : 'New'}`);
});

// ─── Reincarnation tree ────────────────────────────────────────────────────

/** Explicit purchase event (in addition to the karma sink resource event). */
export const trackTreeNodePurchased = safe((nodeId, cost) => {
  GameAnalytics.addDesignEvent(`Tree:Purchased:${slug(nodeId)}`, cost);
});

// ─── Engagement / re-engagement ────────────────────────────────────────────

export const trackDailyBonusClaimed = safe((streakDay) => {
  GameAnalytics.addDesignEvent(`Daily:Claimed:Day${streakDay ?? 1}`);
});

export const trackOfflineQiCollected = safe((amount, awayMs, multiplier) => {
  if (!(amount > 0)) return;
  GameAnalytics.addResourceEvent(EGAResourceFlowType.Source, 'Qi', amount, 'OfflineGain', `m${multiplier ?? 1}`);
  if (awayMs > 0) GameAnalytics.addDesignEvent('Offline:Returned', Math.floor(awayMs / 1000));
});

export const trackAutoFarmToggled = safe((activity, enabled, worldIndex, regionIndex) => {
  GameAnalytics.addDesignEvent(`AutoFarm:${enabled ? 'On' : 'Off'}:${slug(activity)}:w${worldIndex ?? 0}:r${regionIndex ?? 0}`);
});

// ─── Settings ──────────────────────────────────────────────────────────────

export const trackSettingChanged = safe((settingId, value) => {
  GameAnalytics.addDesignEvent(`Setting:${slug(settingId)}:${slug(String(value))}`);
});

// ─── Ads ───────────────────────────────────────────────────────────────────

/**
 * Rewarded video lifecycle. Called on (Show, Clicked, RewardReceived,
 * FailedShow). `placement` is a short id like 'cultivation_boost'.
 */
export const trackAdEvent = safe((action, placement, adSdkName = 'admob') => {
  const map = {
    show:    EGAAdAction.Show,
    click:   EGAAdAction.Clicked,
    reward:  EGAAdAction.RewardReceived,
    failed:  EGAAdAction.FailedShow,
  };
  const ga = map[action] ?? EGAAdAction.Show;
  GameAnalytics.addAdEvent(ga, EGAAdType.RewardedVideo, adSdkName, slug(placement));
});

// ─── Resource flow (qi / karma economy) ────────────────────────────────────

export const trackQiSource = safe((amount, itemType, itemId) => {
  if (!(amount > 0)) return;
  GameAnalytics.addResourceEvent(EGAResourceFlowType.Source, 'Qi', amount, itemType, itemId);
});

export const trackQiSink = safe((amount, itemType, itemId) => {
  if (!(amount > 0)) return;
  GameAnalytics.addResourceEvent(EGAResourceFlowType.Sink, 'Qi', amount, itemType, itemId);
});

export const trackKarmaSource = safe((amount, source) => {
  if (!(amount > 0)) return;
  GameAnalytics.addResourceEvent(EGAResourceFlowType.Source, 'Karma', amount, 'RealmReached', source);
});

export const trackKarmaSink = safe((amount, nodeId) => {
  if (!(amount > 0)) return;
  GameAnalytics.addResourceEvent(EGAResourceFlowType.Sink, 'Karma', amount, 'TreeNode', nodeId);
});

// ─── Errors ────────────────────────────────────────────────────────────────

export const trackError = safe((message, severity = 'warning') => {
  GameAnalytics.addErrorEvent(severity, String(message).slice(0, 8000));
});

// ─── helpers ───────────────────────────────────────────────────────────────

function slug(s) {
  return String(s ?? '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 64) || 'unknown';
}
