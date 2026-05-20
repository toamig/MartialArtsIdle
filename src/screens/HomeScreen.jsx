// @refresh reset
import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SpriteAnimator from '../components/SpriteAnimator';
import RealmProgressBar from '../components/RealmProgressBar';
import OfflineEarningsModal from '../components/OfflineEarningsModal';
import { useVFX } from '../components/VFXLayer';
import { useRewardedAd, formatCooldown } from '../ads/useRewardedAd';
import { fmt as fmtNum, fmtRate as fmtRateNum, fmtDelta } from '../utils/format';
import DailyBonusWidget from '../components/DailyBonusWidget';
import ActiveSparksBar from '../components/ActiveSparksBar';
import { FEATURE_GATES } from '../data/featureGates';
import { useEventQueue } from '../contexts/EventQueueContext';
import { QI_SPARK_BY_ID } from '../data/qiSparks';
import { sparksToGrantOnEvolution } from '../data/crystalMechanicGrants';
import TutorialModal from '../components/TutorialModal';
import WORLDS from '../data/worlds';
import AudioManager from '../audio/AudioManager';
const BASE = import.meta.env.BASE_URL;
const AD_BOOST_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// home.png natural dimensions — used to compute the cover-scale sprite size.
const HOME_BG_W = 1376;
const HOME_BG_H = 768;

// ── Cultivator sprite tier mapping ──────────────────────────────────────────
// 13 character tiers (T0..T12), one per major realm name. Each tier has two
// static 256×256 sprites: `<tier>_normal.png` (idle cultivation) and
// `<tier>_focused.png` (Avatar-mode glow). When the rewarded-ad boost is
// active, a 4-frame `heavenly_aura.png` underlay renders behind the sprite.
// As more tiers are generated, add the tier index to CULTIVATOR_DONE_TIERS —
// players on a not-yet-generated tier fall back to the highest done tier
// below their realm (no missing-file 404s).
const CULTIVATOR_TIER_NAMES = [
  't0_novice',              // Tempered Body          (idx  0-9)
  't1_qi_transformation',   // Qi Transformation      (idx 10-13)
  't2_true_element',        // True Element           (idx 14-17)
  't3_separation',          // Separation & Reunion   (idx 18-20)
  't4_immortal_ascension',  // Immortal Ascension     (idx 21-23)
  't5_saint',               // Saint                  (idx 24-26)
  't6_saint_king',          // Saint King             (idx 27-29)
  't7_origin_returning',    // Origin Returning       (idx 30-32)
  't8_origin_king',         // Origin King            (idx 33-35)
  't9_void_king',           // Void King              (idx 36-38)
  't10_dao_source',         // Dao Source             (idx 39-41)
  't11_emperor_realm',      // Emperor Realm          (idx 42-44)
  't12_open_heaven',         // Open Heaven           (idx 45-50)
];
// Tiers with sprite files in public/sprites/cultivator/. Players on a tier
// that isn't in this set see the highest done tier below their realm.
const CULTIVATOR_DONE_TIERS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

// Cultivator tier display names — mirrors the `name` field in
// scripts/cultivator_prompts.py TIERS. Shown as the sub-line in the major-
// breakthrough cinematic so the player has a recognisable "title" for the
// new form (the realm name above it is the gameplay identifier).
const CULTIVATOR_TIER_DISPLAY_NAMES = [
  'Novice Disciple',          // T0
  'Inner Sect Disciple',      // T1
  'True-Element Cultivator',  // T2
  'Sect Adept',               // T3
  'Ascending Immortal',       // T4
  'Sect Master',              // T5
  'Saint King',               // T6
  'Immortal Sage',            // T7
  'Origin King',              // T8
  'Divine Sovereign',         // T9
  'Dao Source Cultivator',    // T10
  'Dao Emperor',              // T11
  'Heavenly Sovereign',       // T12
];

function getCultivatorTier(realmIndex) {
  let t = 0;
  if (realmIndex >= 10) t = 1;
  if (realmIndex >= 14) t = 2;
  if (realmIndex >= 18) t = 3;
  if (realmIndex >= 21) t = 4;
  if (realmIndex >= 24) t = 5;
  if (realmIndex >= 27) t = 6;
  if (realmIndex >= 30) t = 7;
  if (realmIndex >= 33) t = 8;
  if (realmIndex >= 36) t = 9;
  if (realmIndex >= 39) t = 10;
  if (realmIndex >= 42) t = 11;
  if (realmIndex >= 45) t = 12;
  // Fall back to the highest done tier ≤ t (avoids 404s for tiers not yet generated)
  for (let i = t; i >= 0; i--) {
    if (CULTIVATOR_DONE_TIERS.has(i)) return i;
  }
  return 0;
}


/** Qi/s readout — updated via rAF so it tracks every modifier without re-renders.
 *  The focus multiplier badge includes the Qi-Spark Focus Surge bonus when active. */
function QiRateReadout({ rateRef, focusMultRef, sparkFocusMultBonusRef, sparkConsecutiveCurrentBonusRef, boosting, adBoostActive, maxed }) {
  const { t } = useTranslation('ui');
  const textRef  = useRef(null);
  const boostRef = useRef(null);
  useEffect(() => {
    if (maxed) {
      if (textRef.current) textRef.current.textContent = t('home.peakQi');
      return;
    }
    let raf;
    const update = () => {
      const r = rateRef.current;
      if (textRef.current) {
        textRef.current.textContent = `+${fmtRateNum(r)} Qi/s`;
      }
      if (boostRef.current && focusMultRef) {
        const baseMult  = (focusMultRef.current ?? 300) / 100;
        const sparkBonus = sparkFocusMultBonusRef?.current ?? 0;
        // Consecutive Focus folds in multiplicatively on top of the focus
        // mult — same shape as the rate calc, so the badge matches reality.
        const cfBonus = sparkConsecutiveCurrentBonusRef?.current ?? 0;
        const mult = baseMult * (1 + sparkBonus) * (1 + cfBonus);
        // Show 2 decimals when CF is contributing fractional gains so the
        // step-ups (×3.00 → ×3.15 → ×3.36 …) feel readable.
        const decimals = cfBonus > 0 ? 2 : (mult % 1 === 0 ? 0 : 1);
        boostRef.current.textContent = `×${mult.toFixed(decimals)}`;
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [rateRef, focusMultRef, sparkFocusMultBonusRef, sparkConsecutiveCurrentBonusRef, maxed, t]);

  const cls = `qi-rate${boosting ? ' qi-rate-boosted' : ''}${adBoostActive ? ' qi-rate-ad' : ''}`;
  return (
    <div className={cls}>
      <span ref={textRef} className="qi-rate-value">—</span>
      {boosting      && <span ref={boostRef} className="qi-rate-badge qi-rate-badge-cf">×3</span>}
      {adBoostActive && <span className="qi-rate-badge qi-rate-badge-ad">×2</span>}
    </div>
  );
}

/** Current / target qi — single chip updated via rAF.
 *  During a major-realm gate, switches to showing Qi/s current / required. */
function QiProgressChip({ qiRef, progressRef, costRef, gateRef, rateRef, maxed, ascended }) {
  const textRef = useRef(null);
  const divRef  = useRef(null);
  useEffect(() => {
    const fmt     = fmtNum;
    const fmtRate = fmtRateNum;
    let raf;
    const update = () => {
      const gate = gateRef?.current;
      if (divRef.current)  divRef.current.classList.toggle('qi-rate-gated', !!gate);
      if (textRef.current) {
        if (ascended) {
          // Ascended: total spendable qi (balance) is the only number left.
          const r = rateRef ? rateRef.current : 0;
          textRef.current.textContent = `${fmt(qiRef.current)} Qi  ·  ${fmtRate(r)}/s`;
        } else if (gate) {
          const r = rateRef ? rateRef.current : gate.current;
          textRef.current.textContent = `${fmtRate(r)} / ${fmtRate(gate.required)}  Qi/s`;
        } else {
          // Cookie-Clicker pivot: realm-progress numerator is cumulative
          // qi earned this realm, NOT the spendable balance. Spending on
          // producers/upgrades never rolls this back. Falls back to qiRef
          // for callers that haven't passed progressRef yet.
          const progress = (progressRef?.current ?? qiRef.current);
          textRef.current.textContent = `${fmt(progress)} / ${fmt(costRef.current)}`;
        }
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [qiRef, progressRef, costRef, gateRef, rateRef, maxed, ascended]);
  return (
    <div ref={divRef} className="qi-rate">
      <span ref={textRef}>—</span>
    </div>
  );
}

// ── Heavenly Qi chip — redesigned as a pill floating in the scene (top-right) ──
/** Purple pill chip — replaces the old circular button.  Shows a pulsing dot,
 *  a label, and an optional countdown when an ad boost is running or on CD. */
function HeavenlyQiButton({ ad, adBoostActive, adBoostRemaining, maxed }) {
  const { t } = useTranslation('ui');
  if (maxed) return null;

  if (adBoostActive) {
    return (
      <div className="home-hq-chip home-hq-chip-active" title={t('home.heavenlyQiActive')}>
        <span className="home-hq-dot" />
        <span className="home-hq-text">×2</span>
        <span className="home-hq-timer">{adBoostRemaining}</span>
      </div>
    );
  }

  const isCd      = ad.isCooldown;
  const isLoading = ad.isLoading;
  const label = isCd
    ? formatCooldown(ad.cooldownRemaining)
    : isLoading
    ? t('home.channeling')
    : t('home.heavenlyQi');

  return (
    <button
      className={`home-hq-chip${ad.isReady ? ' home-hq-chip-ready' : ''}${isCd ? ' home-hq-chip-cd' : ''}`}
      onClick={ad.show}
      disabled={!ad.isReady}
      title={ad.isReady ? t('home.channelTitle') : label}
    >
      <span className="home-hq-dot" />
      <span className="home-hq-text">{label}</span>
    </button>
  );
}

/**
 * Transient celebration overlay shown when a MAJOR realm transition fires.
 * Auto-dismisses itself after the animation finishes. The component is
 * keyed on the event id in HomeScreen so each breakthrough remounts and
 * replays the animation.
 */
function BreakthroughBanner({ event, onDone }) {
  const { t } = useTranslation('ui');
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    if (!event) return undefined;
    try { AudioManager.playSfx('cult_breakthrough'); } catch {}
    const id = setTimeout(() => onDoneRef.current(), 2600);
    return () => clearTimeout(id);
  }, [event]); // onDone intentionally excluded — captured via ref so re-renders don't reset the timer
  if (!event) return null;
  return (
    <div className="home-breakthrough-overlay" aria-live="assertive">
      <div className="home-breakthrough-flash" />
      <div className="home-breakthrough-card">
        <div className="home-breakthrough-kicker">
          {event.isFinal ? t('home.finalKicker',       { defaultValue: 'Ascension' })
           : event.isPeak ? t('home.peakKicker',        { defaultValue: 'Peak Stage' })
           :                t('home.breakthroughKicker', { defaultValue: 'Breakthrough' })}
        </div>
        <div className="home-breakthrough-name">{event.label}</div>
      </div>
    </div>
  );
}

/**
 * ConsecutiveFocusMeter — shown while the player is focusing AND has at least
 * one Consecutive Focus rung unlocked.
 *
 * Progress bar runs continuously over the full hold window (0ms → last
 * threshold) with a tick at every rung the player has unlocked, so they can
 * see exactly how far they are from the next milestone bonus.
 *
 * Updates via rAF so the bar tracks every frame without re-renders.
 */
function ConsecutiveFocusMeter({ ladder, boostStartTimeRef }) {
  const barRef   = useRef(null);
  const labelRef = useRef(null);
  const rootRef  = useRef(null);
  const totalMs  = ladder[ladder.length - 1].holdMs;

  useEffect(() => {
    let raf;
    let lastRung = -1;
    const tick = () => {
      const start = boostStartTimeRef?.current ?? performance.now();
      const elapsed = performance.now() - start;
      let rung = 0;
      for (const step of ladder) {
        if (elapsed >= step.holdMs) rung++;
        else break;
      }
      const isMax = rung >= ladder.length;
      const frac  = isMax ? 1 : Math.min(1, elapsed / totalMs);

      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${frac})`;
      }
      if (rootRef.current && rung !== lastRung) {
        lastRung = rung;
        rootRef.current.classList.toggle('home-cf-meter-deep', isMax);
      }
      if (labelRef.current) {
        if (isMax) {
          const total = ladder.reduce((s, r) => s + r.bonus, 0);
          labelRef.current.textContent = `Deep meditation · +${Math.round(total * 100)}% qi/s`;
        } else {
          const next        = ladder[rung];
          const cumulative  = ladder.slice(0, rung).reduce((s, r) => s + r.bonus, 0);
          const remainingS  = Math.max(0, (next.holdMs - elapsed) / 1000).toFixed(1);
          labelRef.current.textContent = rung > 0
            ? `+${Math.round(cumulative * 100)}% · next +${Math.round(next.bonus * 100)}% in ${remainingS}s`
            : `next +${Math.round(next.bonus * 100)}% in ${remainingS}s`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ladder, totalMs, boostStartTimeRef]);

  return (
    <div ref={rootRef} className="home-cf-meter">
      <div ref={labelRef} className="home-cf-meter-label" />
      <div className="home-cf-meter-track">
        <div ref={barRef} className="home-cf-meter-bar" />
        {ladder.map((step, i) => (
          <span
            key={i}
            className="home-cf-meter-tick"
            style={{ left: `${(step.holdMs / totalMs) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

const CRYSTAL_TIER_THRESHOLDS = [1000, 750, 500, 350, 200, 100, 50, 25, 10, 1];
const CRYSTAL_TIER_VALUES     = [  10,   9,   8,   7,   6,   5,  4,  3,  2, 1];

function getCrystalTier(level) {
  for (let i = 0; i < CRYSTAL_TIER_THRESHOLDS.length; i++) {
    if (level >= CRYSTAL_TIER_THRESHOLDS[i]) return CRYSTAL_TIER_VALUES[i];
  }
  return 1;
}

// Evocative labels for each evolved tier — shown on the evolution overlay.
const CRYSTAL_TIER_NAMES = {
  2:  'Veined Shard',
  3:  'Azure Heart',
  4:  'Cobalt Prism',
  5:  'Sapphire Bloom',
  6:  'Amethyst Sigil',
  7:  'Violet Lotus',
  8:  'Lilac Radiance',
  9:  'Dawnfire Crystal',
  10: 'Sunflare Relic',
};

/**
 * Full-screen celebration overlay that fires when the Qi Crystal's visual tier
 * advances. Mirrors BreakthroughBanner's auto-dismiss pattern — keyed on the
 * event id so every evolution remounts and replays.
 */
// Stage size in CSS px — overlay artwork native size. We scale down to the
// origin rect at the start/end of the animation, so the "picked-up" crystal
// appears identical in size to the one sitting in the anchor.
const CES_STAGE_SIZE = 220;
const CES_PLAY_MS    = 3800;  // pickup + shatter + settle at centre
const CES_RETURN_MS  = 500;   // tap → shrink back to anchor + unmount

function CrystalEvolutionOverlay({ event, onDone }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  // Phase state — overlay waits at 'settled' for a tap before 'returning'.
  const [phase, setPhase] = useState('playing');

  // Play phase → settled (after transition finishes)
  useEffect(() => {
    if (!event || phase !== 'playing') return undefined;
    try { AudioManager.playSfx('crystal_evolve'); } catch {}
    const id = setTimeout(() => setPhase('settled'), CES_PLAY_MS);
    return () => clearTimeout(id);
  }, [event, phase]);

  // Tap anywhere → begin returning
  useEffect(() => {
    if (phase !== 'settled') return undefined;
    const handler = () => setPhase('returning');
    window.addEventListener('pointerdown', handler, { once: true });
    return () => window.removeEventListener('pointerdown', handler);
  }, [phase]);

  // Return phase → unmount
  useEffect(() => {
    if (phase !== 'returning') return undefined;
    const id = setTimeout(() => onDoneRef.current?.(), CES_RETURN_MS);
    return () => clearTimeout(id);
  }, [phase]);

  if (!event) return null;
  const variant = event.variant ?? 'shatter';
  const { glowA, glowB, textName } = CRYSTAL_COLORS[event.newTier] ?? CRYSTAL_COLORS[1];
  const oldSrc = event.previousTier > 0
    ? `${BASE}crystals/crystal_${event.previousTier}.png`
    : `${BASE}crystals/crystal_locked.png`;
  const newSrc = `${BASE}crystals/crystal_${event.newTier}.png`;
  const tierName = CRYSTAL_TIER_NAMES[event.newTier] ?? `Tier ${event.newTier}`;
  // If this evolution crosses one or more mechanic-granting thresholds, show
  // a single-line hint on the celebration card so the player knows a tutorial
  // is coming next. The actual TutorialModal queues separately and pops after
  // dismissal. Multiple mechanics collapse to a count to keep the line tight.
  const grantedSparkIds = sparksToGrantOnEvolution(event.previousTier ?? 0, event.newTier ?? 0);
  const grantedNames    = grantedSparkIds
    .map((id) => QI_SPARK_BY_ID[id]?.name)
    .filter(Boolean);
  let unlockLine = null;
  if (grantedNames.length === 1) unlockLine = `✦ Mechanic Unlocked — ${grantedNames[0]}`;
  else if (grantedNames.length > 1) unlockLine = `✦ ${grantedNames.length} Mechanics Unlocked`;
  const card = (
    <div className="crystal-evolve-card">
      <div className="crystal-evolve-name">{tierName}</div>
      {unlockLine && <div className="crystal-evolve-unlock">{unlockLine}</div>}
    </div>
  );

  // Lift-and-return geometry — overlay stage starts at the home crystal's
  // rect and returns there at the end. Falls back to screen centre if no
  // origin was captured (e.g. gd trigger while crystal was off-screen).
  //
  // The stage is a square (CES_STAGE_SIZE × CES_STAGE_SIZE) but the crystal
  // PNG is NOT square (89 × 110 native → taller than wide). Naïvely scaling
  // the stage by origin.w / CES_STAGE_SIZE gives a square that fits the
  // home crystal's width, but the contained crystal inside is letterboxed
  // and ends up SHORTER (e.g. 58×72 instead of the home's 72×89). At lift-
  // off the crystal visibly shrinks, and inverse at landing — the visible
  // "flicker". Pick the LARGER of width/height as the scaling base so the
  // contained crystal matches the home crystal exactly, then offset X/Y to
  // re-centre the (now-bigger) stage over the home crystal's actual rect.
  let originX, originY, originScale;
  if (event.origin?.w && event.origin?.h) {
    const baseDim    = Math.max(event.origin.w, event.origin.h);
    originScale      = baseDim / CES_STAGE_SIZE;
    const scaledSize = baseDim;
    originX          = event.origin.x - (scaledSize - event.origin.w) / 2;
    originY          = event.origin.y - (scaledSize - event.origin.h) / 2;
  } else {
    originX     = typeof window !== 'undefined' ? window.innerWidth  / 2 - CES_STAGE_SIZE / 2 : 0;
    originY     = typeof window !== 'undefined' ? window.innerHeight / 2 - CES_STAGE_SIZE / 2 : 0;
    originScale = 1;
  }
  const stageStyle  = {
    '--ce-a':         glowA,
    '--ce-b':         glowB,
    '--ce-text-name': textName,
    '--origin-x':     `${originX}px`,
    '--origin-y':     `${originY}px`,
    '--origin-scale': originScale,
  };

  if (variant === 'shatter') {
    // 8 shards around the center — varied distance so the ring feels alive.
    const shards = Array.from({ length: 8 }, (_, i) => ({
      angle:    i * 45,
      distance: 170 + (i % 3) * 18,
      spin:     i % 2 === 0 ? 1 : -1,
    }));
    return (
      <div
        className={`crystal-evolve-overlay crystal-evolve-overlay-shatter ces-phase-${phase}`}
        aria-live="assertive"
        style={stageStyle}
      >
        <div className="ces-flash" />
        <div className="ces-stage">
          <div className="ces-stack">
            <img src={oldSrc} className="ces-old" alt="" draggable="false" />
            {shards.map((s, i) => (
              <span
                key={i}
                className="ces-shard"
                style={{
                  '--shard-angle':    `${s.angle}deg`,
                  '--shard-distance': `${s.distance}px`,
                  '--shard-spin':     `${s.spin * 1080}deg`,
                }}
              />
            ))}
            <div className="ces-shockwave" />
            <img src={newSrc} className="ces-new" alt="" draggable="false" />
          </div>
        </div>
        {card}
        {phase === 'settled' && (
          <div className="ces-tap-hint">Tap to continue</div>
        )}
      </div>
    );
  }

  // Fallback: original flash-swap variant (kept for A/B comparison)
  return (
    <div className="crystal-evolve-overlay" aria-live="assertive" style={stageStyle}>
      <div className="crystal-evolve-flash" />
      <div className="crystal-evolve-stack">
        <img src={oldSrc} className="crystal-evolve-old"  alt="" draggable="false" />
        <img src={newSrc} className="crystal-evolve-new"  alt="" draggable="false" />
        <div className="crystal-evolve-burst" />
      </div>
      {card}
    </div>
  );
}

/**
 * Full-screen cinematic for MAJOR realm-name changes (every 1 of 13 over the
 * full ladder; peak-stage transitions inside the same realm still use the
 * lightweight BreakthroughBanner above). Mirrors CrystalEvolutionOverlay's
 * lift-and-return rhythm: home cultivator hides → overlay flies to centre →
 * old sprite glows, light pillar rises, old dissolves into the pillar → new
 * tier sprite descends from above, lands with a shockwave → realm-name banner
 * appears → tap to continue → overlay returns to anchor, home cultivator
 * reveals as the new tier.
 *
 * Player must tap to continue (no auto-dismiss) — the game keeps farming qi
 * in the background while the player savours the moment.
 */
const CES_CHAR_STAGE_SIZE = 256;  // cultivator sprites are 256×256
const CES_CHAR_PLAY_MS    = 4200;
const CES_CHAR_RETURN_MS  = 500;

function CharacterEvolutionOverlay({ event, onDone }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [phase, setPhase] = useState('playing');

  useEffect(() => {
    if (!event || phase !== 'playing') return undefined;
    try { AudioManager.playSfx('cult_breakthrough'); } catch {}
    const id = setTimeout(() => setPhase('settled'), CES_CHAR_PLAY_MS);
    return () => clearTimeout(id);
  }, [event, phase]);

  useEffect(() => {
    if (phase !== 'settled') return undefined;
    const handler = () => setPhase('returning');
    window.addEventListener('pointerdown', handler, { once: true });
    return () => window.removeEventListener('pointerdown', handler);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'returning') return undefined;
    const id = setTimeout(() => onDoneRef.current?.(), CES_CHAR_RETURN_MS);
    return () => clearTimeout(id);
  }, [phase]);

  if (!event) return null;
  const oldSrc = `${BASE}sprites/cultivator/${event.oldTier}_normal.png`;
  const newSrc = `${BASE}sprites/cultivator/${event.newTier}_normal.png`;

  // Match the crystal overlay's origin-x/y/scale geometry. Cultivator sprites
  // are square (256×256) so no letterbox compensation is needed — uniform
  // scale aligns the centred sprite with the home rect.
  const originX     = event.origin?.x ?? (typeof window !== 'undefined' ? window.innerWidth  / 2 - CES_CHAR_STAGE_SIZE / 2 : 0);
  const originY     = event.origin?.y ?? (typeof window !== 'undefined' ? window.innerHeight / 2 - CES_CHAR_STAGE_SIZE / 2 : 0);
  const originScale = event.origin?.w ? event.origin.w / CES_CHAR_STAGE_SIZE : 1;

  const stageStyle = {
    '--origin-x':     `${originX}px`,
    '--origin-y':     `${originY}px`,
    '--origin-scale': originScale,
  };

  const kicker = event.isFinal ? 'Final Ascension' : 'Breakthrough';

  return (
    <div
      className={`char-evolve-overlay che-phase-${phase}`}
      aria-live="assertive"
      style={stageStyle}
    >
      <div className="che-backdrop" />
      <div className="che-flash" />
      <div className="che-stage">
        <div className="che-stack">
          <img src={oldSrc} className="che-old" alt="" draggable="false" />
          <div className="che-pillar" />
          {/* Five ascension motes rising along the pillar */}
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className="che-mote"
              style={{ '--mote-delay': `${i * 0.10}s`, '--mote-x': `${(i - 2) * 14}px` }}
            />
          ))}
          <div className="che-shockwave" />
          <img src={newSrc} className="che-new" alt="" draggable="false" />
        </div>
      </div>
      <div className="char-evolve-card">
        <div className="char-evolve-kicker">{kicker}</div>
        <div className="char-evolve-name">{event.realmName}</div>
        {event.tierName && <div className="char-evolve-sub">{event.tierName}</div>}
      </div>
      {phase === 'settled' && (
        <div className="ces-tap-hint">Tap to continue</div>
      )}
    </div>
  );
}

// Glow and particle colors per visual tier.
// glowA = inner/bright,  glowB = outer/dim,
// textName = deeper saturated tier hue used for the evolution name/kicker,
// particles = 5 shades for the stream.
const CRYSTAL_COLORS = {
  locked: { glowA: 'rgba(80,80,100,0)',    glowB: 'rgba(50,50,70,0)',     textName: '#aaaabb', particles: ['#555566','#444455','#666677','#333344','#777788'] },
  1:      { glowA: 'rgba(136,153,187,0.9)',glowB: 'rgba(100,120,160,0.5)',textName: '#c8d4e4', particles: ['#8899bb','#aabbcc','#99aacc','#778899','#bbccdd'] },
  2:      { glowA: 'rgba(68,136,187,1)',   glowB: 'rgba(50,100,150,0.55)',textName: '#8fc2e6', particles: ['#4488bb','#88bbdd','#66aacc','#3377aa','#99ccee'] },
  3:      { glowA: 'rgba(0,187,204,1)',    glowB: 'rgba(0,150,160,0.55)', textName: '#6ee0e8', particles: ['#00bbcc','#aaffee','#00ccdd','#00aaaa','#88eeff'] },
  4:      { glowA: 'rgba(17,85,204,1)',    glowB: 'rgba(10,60,160,0.55)', textName: '#8ab1f2', particles: ['#1155cc','#55ddff','#2266dd','#0044bb','#66ccff'] },
  5:      { glowA: 'rgba(34,51,170,1)',    glowB: 'rgba(20,40,140,0.55)', textName: '#9aa2ed', particles: ['#2233aa','#6699ff','#3344cc','#1122bb','#7788ff'] },
  6:      { glowA: 'rgba(102,0,204,1)',    glowB: 'rgba(80,0,160,0.55)',  textName: '#be92f0', particles: ['#6600cc','#9966ff','#7711dd','#5500bb','#aa88ff'] },
  7:      { glowA: 'rgba(136,0,221,1)',    glowB: 'rgba(100,0,180,0.55)', textName: '#d094f5', particles: ['#8800dd','#aaddff','#9911ee','#7700cc','#bbaaff'] },
  8:      { glowA: 'rgba(204,153,255,1)',  glowB: 'rgba(170,100,240,0.55)',textName: '#e0c0ff', particles: ['#cc99ff','#eeddff','#bb88ee','#aa77dd','#ddbfff'] },
  9:      { glowA: 'rgba(255,204,68,1)',   glowB: 'rgba(220,160,40,0.55)',textName: '#ffd674', particles: ['#ffcc44','#fffacc','#ffdd66','#ffbb22','#fff0aa'] },
  10:     { glowA: 'rgba(255,170,34,1)',   glowB: 'rgba(220,120,0,0.55)', textName: '#ffb860', particles: ['#ffaa22','#ffe566','#ffbb44','#ff9900','#fff0aa'] },
};

/** Qi Crystal — locked (dim, greyscale) or unlocked (glowing, tapable when
 *  Crystal Click mechanic is active). Reservoir fill tracked via rAF. */
function KeyCrystal({ crystal, isUnlocked, particleColors, hidden, cfRung, reservoirRef, crystalClickCapMinRef, rateRef, onCollect, qiRef, onRefine }) {
  const unlockHint = FEATURE_GATES.qi_crystal?.hint ?? 'Reach a higher realm';
  // true only when the Crystal Click spark is active AND the crystal is unlocked
  const mechanicOn = !!(crystalClickCapMinRef && onCollect && isUnlocked);

  // Refine button affordability — polled at 5 Hz from cultivation.qiRef.
  // The button sits absolutely positioned beneath the crystal sprite (see
  // `.home-crystal-refine-btn` in App.css), so toggling its enabled state
  // does not reflow the surrounding layout.
  const refineCost = isUnlocked && crystal
    ? Math.max(0, crystal.requiredForNext - crystal.refinedQi)
    : 0;
  const [canAffordRefine, setCanAffordRefine] = useState(false);
  useEffect(() => {
    if (!isUnlocked || !onRefine) return;
    const tick = () => setCanAffordRefine(
      refineCost > 0 && ((qiRef?.current ?? 0) >= refineCost)
    );
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [isUnlocked, onRefine, qiRef, refineCost]);
  const handleRefineClick = (e) => {
    e.stopPropagation();   // never collect the reservoir on a refine tap
    if (!canAffordRefine) return;
    onRefine?.();
  };

  const fillBarRef = useRef(null);
  const anchorRef  = useRef(null);

  // rAF loop — drives the golden reservoir-fill glow overlay.
  // When the reservoir is full, clear the inline opacity so the CSS pulse
  // animation takes over; otherwise scale opacity with the fill fraction.
  useEffect(() => {
    if (!mechanicOn) return;
    let raf;
    const tick = () => {
      const rate   = rateRef?.current   ?? 0;
      const capMin = crystalClickCapMinRef?.current ?? 0;
      const cap    = capMin * 60 * rate;
      const reserv = reservoirRef?.current ?? 0;
      const fill   = cap > 0 ? Math.min(1, reserv / cap) : 0;
      const isFull = fill >= 0.999;
      if (fillBarRef.current) {
        // isFull: remove inline so CSS @keyframes pulse wins the cascade
        fillBarRef.current.style.opacity = isFull ? '' : String(fill * 0.85);
      }
      anchorRef.current?.classList.toggle('home-crystal-full', isFull);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mechanicOn, reservoirRef, crystalClickCapMinRef, rateRef]);

  if (!isUnlocked) {
    return (
      <div className="home-crystal-anchor">
        <div className="home-crystal-float home-crystal-float-slow">
          <span className="home-crystal-tag home-crystal-tag-locked">🔒 Qi Crystal</span>
          <img
            src={`${BASE}crystals/crystal_locked.png`}
            className="home-crystal-img home-crystal-locked"
            alt="Qi Crystal"
            draggable="false"
          />
        </div>
        <div className="crystal-tooltip crystal-tooltip-locked">
          <div className="ctt-title">🔒 Qi Crystal</div>
          <div className="ctt-desc">A crystallised vessel of refined Qi. Permanently boosts your cultivation speed.</div>
          <div className="ctt-unlock">Unlocks: {unlockHint}</div>
        </div>
      </div>
    );
  }

  const { level, crystalQiBonus } = crystal;
  const tier = getCrystalTier(level);
  const { glowA, glowB } = CRYSTAL_COLORS[tier];
  // SFX + VFX are fired by the parent's onCollect handler so cooldown-blocked
  // taps don't produce sound or floaters. Empty taps still grant a small qi
  // floor — the parent decides what feedback to play based on the granted amount.
  const handleCrystalTap = mechanicOn ? () => onCollect() : undefined;
  return (
    <div
      ref={anchorRef}
      className={`home-crystal-anchor${hidden ? ' home-crystal-anchor-lifted' : ''}${mechanicOn ? ' home-crystal-tappable' : ''}`}
      onClick={handleCrystalTap}
    >
      <div className="home-crystal-float" style={{ '--cg-a': glowA, '--cg-b': glowB }}>
        <span className="home-crystal-tag">
          Qi Crystal
          <span className="home-crystal-tag-divider">·</span>
          <span className="home-crystal-tag-level">Lv {level}</span>
        </span>
        <div className="home-crystal-img-wrap">
          <img
            src={`${BASE}crystals/crystal_${tier}.png`}
            className="home-crystal-img"
            alt="Qi Crystal"
            draggable="false"
          />
          {mechanicOn && (
            <div ref={fillBarRef} className="home-crystal-reservoir-fill" style={{ opacity: 0 }} />
          )}
        </div>
      </div>
      {/* Refine lives OUTSIDE .home-crystal-float so it stays anchored while
          the crystal sprite bobs above it. The anchor is the nearest
          positioned ancestor; its height matches the float's resting height
          (transform doesn't reflow), so `top: 100%` lands the button at the
          exact spot the float's bottom edge sits at rest. */}
      {onRefine && refineCost > 0 && (
        <button
          className={`home-crystal-refine-btn${canAffordRefine ? '' : ' home-crystal-refine-btn-disabled'}`}
          onClick={handleRefineClick}
          disabled={!canAffordRefine}
          aria-label={`Refine Qi Crystal to level ${level + 1} for ${fmtNum(refineCost)} qi`}
        >
          <span className="home-crystal-refine-icon">▲</span>
          <span className="home-crystal-refine-label">
            <span className="home-crystal-refine-verb">Refine</span>
            <span className="home-crystal-refine-sep">·</span>
            <span className="home-crystal-refine-cost">{fmtNum(refineCost)} Qi</span>
          </span>
        </button>
      )}
      {/* QiParticles intentionally not rendered in v1.5+ — we're rebuilding the
          crystal→player particle stream with pixel-art assets. The component
          definition stays in this file for now so the new system can reuse the
          existing path infrastructure once the new art lands. The gap variable
          --qi-particles-h still holds the layout open so the refine button has
          its breathing room. */}
      <div className="crystal-tooltip">
        <div className="ctt-title">Qi Crystal · Lv {level}</div>
        <div className="ctt-desc">A crystallised vessel of refined Qi. Feed it QI stones to level it up and increase your cultivation speed.</div>
        <div className="ctt-bonus">
          <span className="ctt-gem">◆</span> Current bonus: <strong>+{crystalQiBonus} Qi/s</strong>
        </div>
        {mechanicOn
          ? <div className="ctt-hint">Tap to collect stored Qi</div>
          : <div className="ctt-hint">Tap the chip below to refine</div>
        }
      </div>
    </div>
  );
}

// ── PC-only left info panel ──────────────────────────────────────────────────

/** Compact qi text updated via rAF — avoids a React re-render every frame.
 *  During a major-realm gate, switches to showing Qi/s current / required. */
function PCQiProgressText({ qiRef, progressRef, costRef, gateRef, rateRef, maxed, ascended }) {
  const textRef = useRef(null);
  const divRef  = useRef(null);
  useEffect(() => {
    const fmt     = fmtNum;
    const fmtRate = fmtRateNum;
    let raf;
    const tick = () => {
      const gate = gateRef?.current;
      if (divRef.current)  divRef.current.classList.toggle('qi-rate-gated', !!gate);
      if (textRef.current) {
        if (ascended) {
          // Ascended: spendable balance only.
          const r = rateRef ? rateRef.current : 0;
          textRef.current.textContent = `${fmt(qiRef.current)} Qi  ·  ${fmtRate(r)}/s`;
        } else if (gate) {
          const r = rateRef ? rateRef.current : gate.current;
          textRef.current.textContent = `${fmtRate(r)} / ${fmtRate(gate.required)}  Qi/s`;
        } else {
          // Cookie-Clicker pivot: numerator is realm-progress meter.
          const progress = (progressRef?.current ?? qiRef.current);
          textRef.current.textContent = `${fmt(progress)} / ${fmt(costRef.current)} Qi`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [qiRef, progressRef, costRef, gateRef, rateRef, maxed, ascended]);
  return <div ref={divRef} className="qi-rate"><span ref={textRef}>—</span></div>;
}

/** Left panel — visible only at wide (≥ 900 px) breakpoints.
 *  Shows cultivation stats so the player doesn't have to look at the bar. */
function HomePCLeftPanel({ realmName, realmStage, qiRef, progressRef, costRef, rateRef, gateRef, focusMultRef, sparkFocusMultBonusRef, sparkConsecutiveCurrentBonusRef, boosting, adBoostActive, maxed, ascended }) {
  const { t } = useTranslation('ui');
  return (
    <div className="home-pc-left">
      <div className="home-pc-section-label">Cultivation</div>
      <div className="home-pc-realm-name">{realmName.split(' - ')[0]}</div>
      {realmStage && !ascended && <div className="home-pc-realm-stage">{realmStage}</div>}
      <PCQiProgressText qiRef={qiRef} progressRef={progressRef} costRef={costRef} gateRef={gateRef} rateRef={rateRef} maxed={maxed} ascended={ascended} />
      <QiRateReadout rateRef={rateRef} focusMultRef={focusMultRef} sparkFocusMultBonusRef={sparkFocusMultBonusRef} sparkConsecutiveCurrentBonusRef={sparkConsecutiveCurrentBonusRef} boosting={boosting} adBoostActive={adBoostActive} maxed={maxed} />
    </div>
  );
}

// ── Pattern Clicking — numbered dot mechanic ─────────────────────────────────

/** Generate `count` dot positions with minimum separation (in % units).
 *  Coordinates are viewport-relative (the overlay is position:fixed inset:0).
 *  Safe zone avoids the top bar (~12%) and bottom nav (~18%) on typical phones. */
function generateDotPositions(count) {
  const MIN_DIST = 20; // % units minimum separation
  const positions = [];
  let attempts = 0;
  while (positions.length < count && attempts < 400) {
    attempts++;
    const x = 8  + Math.random() * 80; // 8%..88% — avoids side edges
    const y = 14 + Math.random() * 65; // 14%..79% — below top bar, above bottom nav
    const ok = positions.every(p => Math.hypot(p.x - x, p.y - y) >= MIN_DIST);
    if (ok) positions.push({ num: positions.length + 1, x, y });
  }
  // Fallback for extreme collision runs (shouldn't happen with reasonable counts)
  while (positions.length < count) {
    const i = positions.length;
    positions.push({ num: i + 1, x: 15 + (i * 12) % 65, y: 20 + (i * 15) % 55 });
  }
  return positions;
}

/** Single numbered dot button — phases: current (pulsing) | waiting (dim) | tapped (burst-vanish). */
function PatternDot({ dot, isCurrent, isTapped, onClick }) {
  const phase = isTapped ? 'tapped' : isCurrent ? 'current' : 'waiting';
  return (
    <button
      className={`pc-dot pc-dot-${phase}`}
      style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
      onClick={onClick}
      data-num={dot.num}
      data-sfx="none"
      aria-label={`Pattern dot ${dot.num}`}
    >
      {dot.num}
    </button>
  );
}

/**
 * Full cultivation-zone overlay showing the dot pattern + countdown timer.
 * Tracks tap order internally; calls onComplete(wasFullClear) when done.
 */
function PatternClickOverlay({ pattern, onComplete, rateRef, spawnVFX }) {
  const [nextNum, setNextNum] = useState(1);
  const [tapped, setTapped]   = useState(() => new Set());
  const [phase, setPhase]     = useState('active'); // 'active' | 'success' | 'fail'
  const nextNumRef   = useRef(1);
  const phaseRef     = useRef('active');
  const startTimeRef = useRef(performance.now());
  const timerBarRef  = useRef(null);

  // Window expiry — if player doesn't finish in time, fail out
  useEffect(() => {
    const t = setTimeout(() => {
      if (phaseRef.current !== 'active') return;
      phaseRef.current = 'fail';
      setPhase('fail');
      try { AudioManager.playSfx('spark_pattern_miss'); } catch {}
      setTimeout(() => onComplete(false), 600);
    }, pattern.windowMs);
    return () => clearTimeout(t);
  }, [pattern.windowMs, onComplete]);

  // Timer bar — rAF-driven scaleX shrink
  useEffect(() => {
    let raf;
    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const frac    = Math.max(0, 1 - elapsed / pattern.windowMs);
      if (timerBarRef.current) {
        timerBarRef.current.style.transform = `scaleX(${frac})`;
        timerBarRef.current.classList.toggle('pc-timer-urgent', frac < 0.25);
      }
      if (frac > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pattern.windowMs]);

  const handleDotClick = useCallback((dot) => {
    if (phaseRef.current !== 'active') return;
    if (dot.num !== nextNumRef.current) return; // wrong order — ignore tap
    // Rising-pitch tap — each note steps up a fixed amount so longer patterns
    // stay singable. 1.0 → 1.4 across 5 dots feels like an osu-style climb.
    const tapRate = 1 + (dot.num - 1) * 0.1;
    try { AudioManager.playSfx('spark_pattern_tap', { rate: tapRate }); } catch {}
    setTapped(prev => { const n = new Set(prev); n.add(dot.num); return n; });
    const isLast = dot.num === pattern.dots.length;
    if (isLast) {
      phaseRef.current = 'success';
      setPhase('success');
      try { AudioManager.playSfx('spark_pattern_clear'); } catch {}
      // VFX floater at the last dot's screen position
      if (spawnVFX && rateRef) {
        try {
          const dotEl   = document.querySelector(`.pc-dot[data-num="${dot.num}"]`);
          const stageEl = document.querySelector('.home-fighter-stage');
          if (dotEl && stageEl) {
            const dr     = dotEl.getBoundingClientRect();
            const sr     = stageEl.getBoundingClientRect();
            const x      = (dr.left + dr.width  / 2) - sr.left;
            const y      = (dr.top  + dr.height / 2) - sr.top;
            const reward = pattern.burstSeconds * (rateRef.current ?? 1);
            const fmt    = fmtDelta;
            spawnVFX({ type: 'qi-tick', x, y, content: fmt(reward), duration: 1600,
              style: { '--qi-drift-x': '0px' } });
          }
        } catch {}
      }
      setTimeout(() => onComplete(true), 600);
    } else {
      nextNumRef.current = dot.num + 1;
      setNextNum(dot.num + 1);
    }
  }, [pattern.dots.length, pattern.burstSeconds, rateRef, spawnVFX, onComplete]);

  return (
    <div className={`pc-overlay pc-overlay-${phase}`} aria-label="Tracing Meridians challenge">

      {/* osu-style connecting lines — SVG spanning full overlay */}
      <svg className="pc-connections" aria-hidden="true">
        {pattern.dots.map((dot, i) => {
          if (i === pattern.dots.length - 1) return null; // last dot has no outgoing line
          const next = pattern.dots[i + 1];
          if (tapped.has(dot.num)) return null;           // already tapped — line consumed
          const isActive = dot.num === nextNum;            // current → next: brighter line
          return (
            <line
              key={`${dot.num}-${next.num}`}
              x1={`${dot.x}%`} y1={`${dot.y}%`}
              x2={`${next.x}%`} y2={`${next.y}%`}
              className={`pc-connection${isActive ? ' pc-connection-active' : ''}`}
            />
          );
        })}
      </svg>

      <div className="pc-timer-track">
        <div ref={timerBarRef} className="pc-timer-bar" />
      </div>
      {pattern.dots.map(dot => (
        <PatternDot
          key={dot.num}
          dot={dot}
          isCurrent={!tapped.has(dot.num) && dot.num === nextNum}
          isTapped={tapped.has(dot.num)}
          onClick={() => handleDotClick(dot)}
        />
      ))}
    </div>
  );
}

/**
 * Opt-in prompt for the Pattern Click minigame. Mirrors the lifecycle of a
 * divine-qi orb (alive → expiring → collected/expired) but routes the click
 * through `onAccept` instead of granting qi directly. The minigame opens only
 * if the player taps the prompt before its window closes.
 */
function PatternClickPrompt({ prompt, onAccept, onDismiss }) {
  const [phase, setPhase] = useState('alive');
  const phaseRef = useRef('alive');

  // Switch to 'expiring' for the final 2s — visual urgency cue.
  useEffect(() => {
    const totalMs    = prompt.promptWindowMs;
    const expiringIn = totalMs - 2000;
    if (expiringIn <= 0) { phaseRef.current = 'expiring'; setPhase('expiring'); return; }
    const t = setTimeout(() => { phaseRef.current = 'expiring'; setPhase('expiring'); }, expiringIn);
    return () => clearTimeout(t);
  }, [prompt.promptWindowMs]);

  // Auto-expire when the full window closes.
  useEffect(() => {
    const t = setTimeout(() => {
      if (phaseRef.current === 'collected') return;
      phaseRef.current = 'expired';
      setPhase('expired');
    }, prompt.promptWindowMs);
    return () => clearTimeout(t);
  }, [prompt.promptWindowMs]);

  // Notify parent after exit animation so the unmount feels non-jarring.
  useEffect(() => {
    if (phase !== 'expired' && phase !== 'collected') return;
    const t = setTimeout(() => {
      if (phase === 'collected') onAccept();
      else                       onDismiss();
    }, 280);
    return () => clearTimeout(t);
  }, [phase, onAccept, onDismiss]);

  const handleClick = () => {
    if (phaseRef.current !== 'alive' && phaseRef.current !== 'expiring') return;
    phaseRef.current = 'collected';
    setPhase('collected');
    try { AudioManager.playSfx('spark_pattern_tap'); } catch {}
  };

  return (
    <button
      className={`pc-prompt pc-prompt-${phase}`}
      style={{ left: `${prompt.x}%`, top: `${prompt.y}%` }}
      onClick={handleClick}
      data-sfx="none"
      aria-label="Pattern spark — tap to begin"
    >
      <span className="pc-prompt-glyph" aria-hidden="true">
        <span className="pc-prompt-dot pc-prompt-dot-1" />
        <span className="pc-prompt-dot pc-prompt-dot-2" />
        <span className="pc-prompt-dot pc-prompt-dot-3" />
      </span>
    </button>
  );
}

/**
 * Manages the Pattern Click minigame lifecycle.
 * Reads the active pattern_click spark; self-schedules spawns with ±30% jitter.
 *
 * Two-phase opt-in flow:
 *   1. Spawn fires → an `activePrompt` appears (small clickable spark in the
 *      scene). Player taps to opt in, OR ignores it for `promptWindowMs` to
 *      let it pass — no penalty.
 *   2. On opt-in, the prompt resolves into `activePattern` and the existing
 *      dot-tap minigame begins with `windowMs` to clear.
 *
 * The shared spark-attention coordinator is held from prompt-spawn through
 * minigame-resolve, so divine_qi cannot spawn on top of an active pattern.
 *
 * Returns { activePrompt, openPrompt, dismissPrompt, activePattern, completePattern }.
 */
function usePatternClick({ activeSparks, rateRef, qiRef }) {
  const [activePrompt,  setActivePrompt]  = useState(null);
  const [activePattern, setActivePattern] = useState(null);
  const activeRef = useRef(false); // true between prompt-spawn and resolve

  const config = useMemo(() => {
    const inst = activeSparks?.find(s => {
      const card = QI_SPARK_BY_ID[s.sparkId];
      return card?.kind === 'mechanic' && card?.mechanicId === 'pattern_click';
    });
    return inst ? (QI_SPARK_BY_ID[inst.sparkId] ?? null) : null;
  }, [activeSparks]);
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);

  // Releases the shared coordinator iff we still own it (idempotent).
  const releaseAttention = useCallback(() => {
    if (activeRef.current) {
      activeRef.current = false;
      releaseSparkAttention('pattern');
    }
  }, []);

  const spawnPrompt = useCallback(() => {
    if (activeRef.current) return; // already showing a prompt or playing
    const cfg = configRef.current;
    if (!cfg) return;
    if (!tryClaimSparkAttention('pattern')) return; // divine_qi has the floor
    activeRef.current = true;
    // Place the prompt anywhere within the safe scene zone — same bounds as
    // a single divine_qi orb so the eye-line is consistent.
    setActivePrompt({
      id:             Date.now(),
      x:              12 + Math.random() * 76,
      y:              22 + Math.random() * 45,
      promptWindowMs: cfg.promptWindowMs ?? 6_000,
    });
  }, []);

  // Self-scheduling spawn timer with ±30% jitter
  useEffect(() => {
    if (!config) return;
    let timer;
    const arm = () => {
      const cfg = configRef.current;
      if (!cfg) return;
      const delay = cfg.spawnIntervalMs * (0.7 + Math.random() * 0.6);
      timer = setTimeout(() => { spawnPrompt(); arm(); }, delay);
    };
    // First spawn after a brief "discovery" delay capped at 15s
    timer = setTimeout(
      () => { spawnPrompt(); arm(); },
      Math.min(config.spawnIntervalMs * 0.5, 15_000),
    );
    return () => {
      clearTimeout(timer);
      releaseAttention(); // unmount mid-prompt → don't lock divine_qi out
    };
  }, [config?.id, spawnPrompt, releaseAttention]); // re-arm if tier changes

  /** Player accepted the prompt — open the dot minigame. */
  const openPrompt = useCallback(() => {
    const cfg = configRef.current;
    if (!cfg) { setActivePrompt(null); releaseAttention(); return; }
    setActivePrompt(null);
    setActivePattern({
      id:                Date.now(),
      dots:              generateDotPositions(cfg.dotCount),
      windowMs:          cfg.windowMs,
      burstSeconds:      cfg.burstSeconds,
      doubleOnFullClear: cfg.doubleOnFullClear ?? false,
      rateMult:          cfg.rateMult  ?? 2.0,
      rateBuffMs:        cfg.rateBuffMs ?? 15_000,
    });
    // Coordinator stays claimed until completePattern fires.
  }, [releaseAttention]);

  /** Prompt window expired (or player dismissed) — release without penalty. */
  const dismissPrompt = useCallback(() => {
    setActivePrompt(null);
    releaseAttention();
  }, [releaseAttention]);

  const completePattern = useCallback((wasFullClear) => {
    const cfg = configRef.current;
    if (wasFullClear && cfg) {
      // Add the qi burst reward directly
      const reward = cfg.burstSeconds * (rateRef?.current ?? 1);
      if (qiRef) qiRef.current += reward;
      // T5: dispatch rate-buff event for ×2 qi/s for 15s
      if (cfg.doubleOnFullClear && cfg.rateMult) {
        try {
          window.dispatchEvent(new CustomEvent('mai:pattern-click-buff', {
            detail: { mult: cfg.rateMult, durationMs: cfg.rateBuffMs ?? 15_000 },
          }));
        } catch {}
      }
    }
    setActivePattern(null);
    releaseAttention();
  }, [rateRef, qiRef, releaseAttention]);

  return { activePrompt, openPrompt, dismissPrompt, activePattern, completePattern };
}

// ── Spark coordinator ───────────────────────────────────────────────────────
// Divine Qi and Pattern Click both demand the player's attention. Letting them
// fire on top of each other forces context-switching and feels chaotic, so this
// shared module-level latch ensures only one is active at a time. The losing
// mechanic simply skips its spawn slot and re-arms on the next interval.
const sparkAttentionRef = { current: null }; // 'divine' | 'pattern' | null
function tryClaimSparkAttention(id) {
  if (sparkAttentionRef.current !== null) return false;
  sparkAttentionRef.current = id;
  return true;
}
function releaseSparkAttention(id) {
  if (sparkAttentionRef.current === id) sparkAttentionRef.current = null;
}

// ── Divine Qi — golden orb mechanic ─────────────────────────────────────────

/**
 * Single orb: self-destructs after `windowMs`; notifies parent on collect/expire.
 * Phases: 'alive' → 'expiring' (last 3s) → 'collected' | 'expired'
 */
function DivineQiOrb({ orb, onResolve, spawnVFX, rateRef }) {
  const [phase, setPhase] = useState('alive');
  const phaseRef = useRef('alive');

  // Switch to 'expiring' 3s before window closes
  useEffect(() => {
    const totalMs    = orb.expiresAt - performance.now();
    const expiringIn = totalMs - 3000;
    if (expiringIn <= 0) { phaseRef.current = 'expiring'; setPhase('expiring'); }
    else {
      const t = setTimeout(() => { phaseRef.current = 'expiring'; setPhase('expiring'); }, expiringIn);
      return () => clearTimeout(t);
    }
  }, [orb.expiresAt]);

  // Auto-expire when the full window closes
  useEffect(() => {
    const remaining = orb.expiresAt - performance.now();
    if (remaining <= 0) { phaseRef.current = 'expired'; setPhase('expired'); return; }
    const t = setTimeout(() => { phaseRef.current = 'expired'; setPhase('expired'); }, remaining);
    return () => clearTimeout(t);
  }, [orb.expiresAt]);

  // Report resolve after exit animation (300ms)
  useEffect(() => {
    if (phase !== 'collected' && phase !== 'expired') return;
    const t = setTimeout(() => onResolve(orb.id, phase === 'collected'), 300);
    return () => clearTimeout(t);
  }, [phase, orb.id, onResolve]);

  const handleClick = (e) => {
    if (phaseRef.current !== 'alive' && phaseRef.current !== 'expiring') return;
    phaseRef.current = 'collected';
    setPhase('collected');
    try { AudioManager.playSfx('divine_qi_collect'); } catch {}
    // Spawn "+N Qi" floater at the orb's screen position, offset into
    // fighter-stage coordinates (where the VFX layer lives).
    if (spawnVFX && rateRef) {
      try {
        const orbRect   = e.currentTarget.getBoundingClientRect();
        const stageEl   = document.querySelector('.home-fighter-stage');
        if (stageEl) {
          const sr = stageEl.getBoundingClientRect();
          const x  = (orbRect.left + orbRect.width  / 2) - sr.left;
          const y  = (orbRect.top  + orbRect.height / 2) - sr.top;
          const reward = orb.burstSeconds * (rateRef.current ?? 1);
          const fmt = fmtDelta;
          spawnVFX({ type: 'qi-tick', className: 'vfx-qi-tick-divine', x, y, content: fmt(reward), duration: 1500,
            style: { '--qi-drift-x': '0px' } });
        }
      } catch {}
    }
  };

  return (
    <button
      className={`divine-qi-orb divine-qi-orb-${phase}`}
      style={{ left: `${orb.x}%`, top: `${orb.y}%` }}
      onClick={handleClick}
      data-sfx="none"
      aria-label="Divine Qi orb"
    >
      <img className="divine-qi-orb-img" src={`${BASE}ui/qi_divine.png`} alt="" draggable="false" />
    </button>
  );
}

/**
 * Manages the Divine Qi orb lifecycle for the current screen.
 * Reads the active divine_qi spark from activeSparks; sets up a
 * self-scheduling spawn timer with ±30% jitter.
 * Returns { orbs, collectOrb } — render orbs in the cultivation zone.
 */
function useDivineQi({ activeSparks, rateRef, qiRef, spawnVFX }) {
  const [orbs, setOrbs] = useState([]);
  const nextIdRef = useRef(0);

  // Find the active divine_qi card — activeSparks items store only { sparkId, ... };
  // the kind/mechanicId fields live on the card object in QI_SPARK_BY_ID.
  const config = useMemo(() => {
    const inst = activeSparks?.find(s => {
      const card = QI_SPARK_BY_ID[s.sparkId];
      return card?.kind === 'mechanic' && card?.mechanicId === 'divine_qi';
    });
    return inst ? (QI_SPARK_BY_ID[inst.sparkId] ?? null) : null;
  }, [activeSparks]);
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);

  // Track how many orbs from the current spawn wave have been collected
  // so T5 can fire the rate buff when BOTH are collected.
  const pendingWaveRef = useRef({ waveId: -1, total: 0, collected: 0 });

  // True iff this hook is currently holding the shared spark-attention latch.
  // We only release it once every orb in the wave has resolved — see collectOrb.
  const claimedRef = useRef(false);

  // Spawn function — creates 1 or 2 orbs (T5 doubleOrb).
  // Returns false (and skips) when the coordinator says another spark already
  // owns the player's attention; the caller re-arms normally either way.
  const spawnWave = useCallback(() => {
    const cfg = configRef.current;
    if (!cfg) return false;
    if (!tryClaimSparkAttention('divine')) return false;
    claimedRef.current = true;
    const count = cfg.doubleOrb ? 2 : 1;
    const waveId = ++nextIdRef.current;
    pendingWaveRef.current = { waveId, total: count, collected: 0 };
    const now = performance.now();
    const newOrbs = Array.from({ length: count }, (_, i) => ({
      id:           `dqi-${waveId}-${i}`,
      waveId,
      burstSeconds: cfg.burstSeconds,
      // Scatter positions: safe zone within scene (avoid UI edges)
      x: 12 + Math.random() * 68 + (i === 1 ? 20 : 0), // second orb offset right
      y: 22 + Math.random() * 45,
      expiresAt: now + cfg.windowMs,
    }));
    setOrbs(prev => [...prev, ...newOrbs]);
    return true;
  }, []);

  // Self-scheduling spawn timer — re-arms after each spawn
  useEffect(() => {
    if (!config) return; // mechanic not active
    let timer;
    const arm = () => {
      const cfg = configRef.current;
      if (!cfg) return;
      // ±30% jitter so spawns feel organic
      const delay = cfg.spawnIntervalMs * (0.7 + Math.random() * 0.6);
      timer = setTimeout(() => { spawnWave(); arm(); }, delay);
    };
    // First spawn after a brief "discovery" delay so the player notices the new mechanic
    timer = setTimeout(() => { spawnWave(); arm(); }, Math.min(config.spawnIntervalMs * 0.5, 15_000));
    return () => {
      clearTimeout(timer);
      // Release the coordinator if we own it, so a screen-unmount mid-wave
      // doesn't permanently lock pattern_click out.
      if (claimedRef.current) {
        claimedRef.current = false;
        releaseSparkAttention('divine');
      }
    };
  }, [config?.id, spawnWave]); // re-arm if tier changes (config.id changes)

  // Called when an orb is collected or expires (after its exit animation)
  const collectOrb = useCallback((orbId, wasCollected) => {
    setOrbs(prev => {
      const next = prev.filter(o => o.id !== orbId);
      // Release the attention latch when the wave is fully resolved (no orbs
      // remain), so pattern_click can spawn on its next interval.
      if (next.length === 0 && claimedRef.current) {
        claimedRef.current = false;
        releaseSparkAttention('divine');
      }
      return next;
    });
    if (!wasCollected) return;
    const cfg = configRef.current;
    if (!cfg) return;

    // Qi burst reward
    const reward = cfg.burstSeconds * (rateRef?.current ?? 1);
    if (qiRef) qiRef.current += reward;

    // T5: track wave collection for rate buff
    if (cfg.doubleOrb && cfg.rateMult) {
      const wave = pendingWaveRef.current;
      if (orbId.startsWith(`dqi-${wave.waveId}-`)) {
        wave.collected++;
        if (wave.collected >= wave.total) {
          // Both collected — dispatch the rate buff event
          try {
            window.dispatchEvent(new CustomEvent('mai:divine-qi-buff', {
              detail: { mult: cfg.rateMult, durationMs: cfg.rateBuffMs ?? 30_000 },
            }));
          } catch {}
        }
      }
    }
  }, [rateRef, qiRef]);

  return { orbs, collectOrb };
}

/** Flowing qi-particle stream — energy pours from the crystal and
 *  converges onto the cultivator below.
 *  Always 6 particles per path. Rung controls which PATH GROUPS are
 *  active (WIDE at rung 2, EXTREME at rung 4) — never particle count.
 *
 *  Lifecycle rules:
 *  • NEW paths: positive delays (0, 0.4 … 2.0 s) so particles appear
 *    one-by-one from the crystal and build to steady state over 2.4 s.
 *  • DRAINING paths: the path-GROUP container fades to opacity 0 via CSS
 *    transition. Individual particle animations are NEVER touched so there
 *    is no animation restart and no positional jump on tap/untap/tap.
 *  • RE-ACTIVATION during drain: removing the draining class reverses the
 *    opacity transition smoothly; particles were cycling uninterrupted. */
function QiParticles({ colors, rung = 0 }) {
  const start = colors?.glowA ?? colors?.particles?.[0] ?? 'rgba(167, 139, 250, 0.95)';

  const PER_PATH = 6;
  const PERIOD   = 2.4;              // seconds — one particle lifetime
  const INTERVAL = PERIOD / PER_PATH; // 0.4 s stagger between slots

  // qi-particle-paths-start — managed by QiParticleEditor (?particleEdit)
  const BASE_PATHS    = ['A', 'B', 'C', 'D', 'E', 'F'];
  const WIDE_PATHS    = ['G', 'H', 'M', 'N', 'O', 'P'];
  const EXTREME_PATHS = ['I', 'J', 'K', 'L', 'Q', 'R'];
  // qi-particle-paths-end

  // Static DOM pool — every path is always mounted.
  const ALL_PATHS = [...BASE_PATHS, ...WIDE_PATHS, ...EXTREME_PATHS];

  // ── Imperative state (zero React re-renders for particle lifecycle) ───────
  const containerRef   = useRef(null);
  // slots[pathName][n] = { span, nameToggle, running }
  //   nameToggle: 0|1 — alternated each respawn so the browser sees a new
  //                      animation-name and restarts from 0% without reflow.
  //   running: bool    — true while the single-iteration animation is active.
  const slots          = useRef({});
  // paths currently emitting new particles
  const emittingRef    = useRef(new Set());
  // pending stagger timers per path
  const spawnTimersRef = useRef({});
  const rungRef        = useRef(rung);

  const activePaths = (r) => new Set([
    ...BASE_PATHS,
    ...(r >= 2 ? WIDE_PATHS    : []),
    ...(r >= 4 ? EXTREME_PATHS : []),
  ]);

  // Build the inline animation string for a given toggle value (0 or 1).
  // Single iteration (count:1) — particle travels once and stops.
  // animationend then fires, and the emitter decides whether to respawn.
  const animCSS = (toggle) => {
    const s = toggle ? 'B' : 'A';
    return `home-qi-flow-pos${s} ${PERIOD}s linear 1, home-qi-flow-fade${s} ${PERIOD}s linear 1`;
  };

  // Restart a particle's animation from offset-distance:0%.
  // Toggling the name counts as a new animation → no forced reflow needed.
  const respawn = (slot) => {
    slot.nameToggle ^= 1;
    slot.running = true;
    slot.span.style.animation = animCSS(slot.nameToggle);
  };

  // Activate a path: add to emitting set, stagger-spawn idle slots.
  // Slots already mid-arc are left alone — they respawn themselves via
  // animationend when they complete their current journey.
  const startPath = (pathName) => {
    emittingRef.current.add(pathName);
    (spawnTimersRef.current[pathName] ?? []).forEach(clearTimeout);
    spawnTimersRef.current[pathName] = Array.from({ length: PER_PATH }, (_, n) =>
      setTimeout(() => {
        if (!emittingRef.current.has(pathName)) return;
        const slot = slots.current[pathName]?.[n];
        if (slot && !slot.running) respawn(slot); // only idle slots need a kick
      }, n * INTERVAL * 1000)
    );
  };

  // Deactivate a path: remove from emitting set, cancel pending spawn timers.
  // Particles already in flight continue their single arc and die naturally —
  // animationend fires, emittingRef check fails, they are not respawned.
  const stopPath = (pathName) => {
    emittingRef.current.delete(pathName);
    (spawnTimersRef.current[pathName] ?? []).forEach(clearTimeout);
    spawnTimersRef.current[pathName] = [];
  };

  // ── Mount: wire animationend listener + activate initial paths ───────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Single delegated listener — fires when a particle's single-iteration
    // animation completes (offset-distance:100%, opacity:0 → naturally dead).
    // With fill-mode:none (default), the element immediately reverts to base
    // CSS (opacity:0) so there is no visible frozen frame after death.
    const onEnd = (e) => {
      // Two animations fire per particle — only handle one (pos) to avoid
      // double-respawn. The fade animation ends at the same instant.
      if (!e.animationName.startsWith('home-qi-flow-pos')) return;
      const pathName = e.target.dataset?.path;
      const n        = Number(e.target.dataset?.slot ?? -1);
      if (!pathName || n < 0) return;
      const slot = slots.current[pathName]?.[n];
      if (!slot) return;
      slot.running = false;
      if (emittingRef.current.has(pathName)) respawn(slot); // emitter still active → live again
    };
    container.addEventListener('animationend', onEnd);

    // Kick off the paths that should be active at mount
    const active = activePaths(rungRef.current);
    ALL_PATHS.forEach(name => { if (active.has(name)) startPath(name); });

    return () => {
      container.removeEventListener('animationend', onEnd);
      Object.values(spawnTimersRef.current).flat().forEach(clearTimeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — mount only, intentional

  // ── Rung changes ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (rung === rungRef.current) return;
    const prevActive = activePaths(rungRef.current);
    const nextActive = activePaths(rung);
    rungRef.current = rung;
    ALL_PATHS.forEach(name => {
      const was = prevActive.has(name);
      const is  = nextActive.has(name);
      if ( is && !was) startPath(name);
      if (!is &&  was) stopPath(name);
    });
  }, [rung]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="home-qi-particles"
      aria-hidden="true"
      style={{ '--qi-particle-start': start }}
    >
      {ALL_PATHS.map((pathName, p) => (
        <div key={pathName} className="home-qi-path-group">
          {Array.from({ length: PER_PATH }, (_, n) => {
            const jx = ((p * 17 + n * 11 + 5) % 19) - 9;
            const jy = ((p * 13 + n *  7 + 3) % 11) - 5;
            const MIX_STARTS = [0, 0, 0, 0, 40, 0, 65, 0, 0, 90];
            const mixStart = MIX_STARTS[(p * 7 + n * 3) % MIX_STARTS.length];
            return (
              <span
                key={n}
                ref={el => {
                  if (!el) return; // ignore the null call React makes before the element call
                  if (!slots.current[pathName]) slots.current[pathName] = [];
                  const existing = slots.current[pathName][n];
                  if (existing) {
                    existing.span = el; // update DOM ref only — preserve nameToggle + running
                  } else {
                    slots.current[pathName][n] = { span: el, nameToggle: 0, running: false };
                  }
                }}
                data-path={pathName}
                data-slot={n}
                className={`home-qi-particle home-qi-particle-path${pathName}`}
                style={{
                  // animation managed entirely by JS (respawn() sets inline style).
                  // React's style reconciler never touches it.
                  width:            `${3 + ((p + n) % 3)}px`,
                  height:           `${3 + ((p + n) % 3)}px`,
                  transform:        `translate(${jx}px, ${jy}px)`,
                  '--qi-mix-start': `${mixStart}%`,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
function HomeScreen({
  cultivation, inventory,
  selections, onOpenSelections,
  onNavigate,
  crystal, isCrystalUnlocked,
  dailyBonus, onOpenDailyBonus,
  lastIdleAssignment,
  openCrystal,
  onOpenPills,
  totalOwnedPills,
  activeSparks,
  crystalReservoirRef,
  crystalClickCapMinRef,
  collectCrystalReservoir,
}) {
  const { t } = useTranslation('ui');
  const {
    realmName,
    realmStage,
    nextRealmName,
    qiRef,
    // Cookie-Clicker pivot — realm progress meter (cumulative qi earned this
    // realm). Drives the progress-bar fill and the "X / cost" numerator.
    // qiRef stays as the spendable balance display.
    qiEarnedThisRealmRef,
    costRef,
    rateRef,
    gateRef,
    focusMultRef,
    sparkFocusMultBonusRef,
    sparkConsecutiveCurrentBonusRef,
    boosting,
    maxed,
    startBoost,
    stopBoost,
    boostStartTimeRef,
    sparkConsecutiveLadderRef,
    activateAdBoost,
    adBoostActive,
    adBoostEndsAt,
    offlineEarnings,
    collectOfflineEarnings,
    majorBreakthrough,
    clearMajorBreakthrough,
    ascended,
  } = cultivation;

  const { vfxLayer, spawnVFX } = useVFX();

  // Sprite scales with the rendered background height so the character stays
  // proportional to the art across every screen shape.
  const [spriteScale, setSpriteScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const scale = Math.max(window.innerWidth / HOME_BG_W, window.innerHeight / HOME_BG_H);
      setSpriteScale((HOME_BG_H * scale * 0.21) / 128);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // ── Qi tick floaters — "+N Qi" flies up off the cultivator on a steady
  // cadence so passive ticking reads as visible progress. Reuses the existing
  // vfx-float-up effect; gated off while qi is capped at a major-realm gate
  // or the run is finished without ascension.
  const lastFloaterQiRef = useRef(qiRef.current);
  useEffect(() => {
    lastFloaterQiRef.current = qiRef.current;
    const id = setInterval(() => {
      if (maxed && !ascended)   return;
      if (gateRef?.current)    { lastFloaterQiRef.current = qiRef.current; return; }
      const now   = qiRef.current;
      const delta = now - lastFloaterQiRef.current;
      // Breakthrough drained qi to a leftover — reseed the tracker and
      // skip this tick so floaters resume cleanly on the next one.
      if (delta < 0) { lastFloaterQiRef.current = now; return; }
      const whole = Math.floor(delta);
      if (whole < 1) return;
      lastFloaterQiRef.current += whole;
      const sz = 128 * spriteScale;
      const x  = sz * 0.5 + (Math.random() - 0.5) * sz * 0.45;
      const y  = sz * 0.55 + (Math.random() - 0.5) * sz * 0.15;
      const driftX = (Math.random() - 0.5) * 32;
      spawnVFX({
        type: 'qi-tick',
        x, y,
        content: fmtDelta(whole),
        duration: 1100,
        style: { '--qi-drift-x': `${driftX}px` },
      });
    }, 500);
    return () => clearInterval(id);
  }, [qiRef, gateRef, maxed, ascended, spawnVFX, spriteScale]);

  // ── Rewarded ad ─────────────────────────────────────────────────────────
  const onCultivationReward = useCallback(() => {
    activateAdBoost(AD_BOOST_DURATION_MS);
  }, [activateAdBoost]);

  // ── Crystal Click — collect reservoir on tap ─────────────────────────────
  const handleCrystalCollect = useCallback(() => {
    if (!collectCrystalReservoir) return;
    // Hook handles cooldown throttle + empty-reservoir floor and returns the
    // granted qi (0 if throttled). Skip all feedback when granted is 0 so
    // tap-spam past the 6.7/sec cap is silent — preserves ad-boost value.
    const granted = collectCrystalReservoir();
    if (granted <= 0) return;
    const wasFull = document.querySelector('.home-crystal-anchor')?.classList.contains('home-crystal-full');
    try { AudioManager.playSfx(wasFull ? 'crystal_tap_max' : 'crystal_tap'); } catch {}
    // Spawn a "+N Qi" floater at the crystal's screen position, offset into
    // fighter-stage coordinates (where the VFX layer lives).
    try {
      const crystalEl = document.querySelector('.home-crystal-img-wrap');
      const stageEl   = document.querySelector('.home-fighter-stage');
      if (crystalEl && stageEl) {
        const cr = crystalEl.getBoundingClientRect();
        const sr = stageEl.getBoundingClientRect();
        const x  = (cr.left + cr.width  / 2) - sr.left;
        const y  = (cr.top  + cr.height / 2) - sr.top;
        spawnVFX({ type: 'qi-tick', x, y, content: fmtDelta(granted), duration: 1600,
          style: { '--qi-drift-x': '0px' } });
      }
    } catch {}
  }, [collectCrystalReservoir, spawnVFX]);

  const cultivationAd = useRewardedAd(onCultivationReward, 30 * 60 * 1000, 'mai_ad_cd_cultivation');

  // ── Divine Qi — golden orb mechanic ─────────────────────────────────────
  const { orbs: divineOrbs, collectOrb } = useDivineQi({
    activeSparks,
    rateRef:   cultivation.rateRef,
    qiRef:     cultivation.qiRef,
    spawnVFX,
  });

  // ── Pattern Click — opt-in prompt + numbered dot minigame ────────────────
  const {
    activePrompt:    patternPrompt,
    openPrompt:      openPatternPrompt,
    dismissPrompt:   dismissPatternPrompt,
    activePattern,
    completePattern,
  } = usePatternClick({
    activeSparks,
    rateRef: cultivation.rateRef,
    qiRef:   cultivation.qiRef,
  });

  // ── Consecutive Focus rung — mirrors the body class set in App.jsx so
  // QiParticles can scale particle density without touching the DOM directly.
  const [cfRung, setCfRung] = useState(0);
  useEffect(() => {
    const onRung = (e) => setCfRung(e.detail?.rung ?? 0);
    window.addEventListener('mai:cf-rung', onRung);
    return () => window.removeEventListener('mai:cf-rung', onRung);
  }, []);


  // ── Event queue wiring ───────────────────────────────────────────────────
  // Spontaneous popups (offline earnings, breakthrough banner, level-up cards,
  // crystal evolution) all flow through one FIFO queue so they don't stack.
  const { enqueue, currentEvent, dismiss } = useEventQueue();

  // ── Crystal feed modal (v1: inlined into the crystal sprite) ────────────
  // Replaced by the inline refine button rendered inside <KeyCrystal>. The
  // modal still exists in CrystalFeedModal.jsx for v2 stone-fed reactivation.

  // ── Crystal evolution overlay ────────────────────────────────────────────
  // Enqueued at high priority so the moment of evolution feels immediate
  // when the player closes the feed modal.
  const handleCrystalEvolve = useCallback((info) => {
    // Measure the home crystal's on-screen rect so the overlay starts at its
    // position (lift-and-return illusion). Query lazily — the DOM always has
    // only one .home-crystal-img, and it's cheap enough to read per trigger.
    let origin = info?.origin ?? null;
    if (!origin && typeof document !== 'undefined') {
      const el = document.querySelector('.home-crystal-img');
      if (el) {
        const r = el.getBoundingClientRect();
        origin = { x: r.left, y: r.top, w: r.width, h: r.height };
      }
    }
    enqueue('crystal-evolution', { ...info, origin }, { priority: 'high' });

    // Queue a tutorial modal for every mechanic granted by crossing tiers in
    // this evolution. They fire AFTER the player dismisses the celebration
    // overlay (FIFO queue), so the flow is: shatter + reform → "tap to
    // continue" → tutorial pop for each newly-unlocked mechanic in order.
    // Crystal Reservoir → Consecutive Focus → Divine Qi → Tracing Meridians
    // is the natural ladder defined in crystalMechanicGrants.js.
    //
    // Icon: each mechanic already ships with an existing upgrade-card icon
    // at public/ui/upgrade_<mechanicId>.png (jade-medallion framed pixel
    // art — same asset the upgrade screen uses, so the player recognises
    // it when they encounter it again later). No tier colours passed —
    // TutorialModal's jade-green default accent matches the icon frame
    // and keeps the modal's identity consistent across all mechanics.
    const newlyGranted = sparksToGrantOnEvolution(info?.previousTier ?? 0, info?.newTier ?? 0);
    newlyGranted.forEach((sparkId) => {
      const card = QI_SPARK_BY_ID[sparkId];
      if (!card) return;
      enqueue('tutorial', {
        kicker:  'New Mechanic',
        title:   card.name,
        body:    card.description,
        ctaText: 'Got it',
        iconSrc: card.mechanicId ? `${BASE}ui/upgrade_${card.mechanicId}.png` : undefined,
      });
    });

    // Round 3 — Crystal Discovery. Re-broadcast the tier delta as a window
    // event so the App.jsx orchestrator can grant any mechanic-tier sparks
    // attached to the crossed tiers (see data/crystalMechanicGrants.js).
    // Avoids prop-drilling qiSparks all the way down to HomeScreen.
    try {
      window.dispatchEvent(new CustomEvent('mai:crystal-tier-crossed', {
        detail: {
          previousTier: info?.previousTier ?? 0,
          newTier:      info?.newTier ?? 0,
          newLevel:     info?.newLevel ?? 0,
        },
      }));
    } catch { /* CustomEvent unsupported — non-fatal */ }
  }, [enqueue]);

  // Debug bridge — gd.crystalEvolve(newTier, previousTier?) fires this event.
  useEffect(() => {
    const handler = (e) => handleCrystalEvolve(e.detail ?? {});
    window.addEventListener('mai:crystal-evolve', handler);
    return () => window.removeEventListener('mai:crystal-evolve', handler);
  }, [handleCrystalEvolve]);

  // Debug bridge — gd.charEvolve / window.dispatchEvent('mai:char-evolve')
  // lets the major-breakthrough cinematic be demoed without grinding qi.
  // Detail shape: { newRealmIndex, realmName, isFinal? }.
  useEffect(() => {
    const handler = (e) => {
      const d = e.detail ?? {};
      const newIdx = Math.max(0, Number(d.newRealmIndex ?? 0));
      const oldIdx = Math.max(0, newIdx - 1);
      const newTierIdx = getCultivatorTier(newIdx);
      const oldTierIdx = getCultivatorTier(oldIdx);
      let origin = null;
      if (typeof document !== 'undefined') {
        const el = document.querySelector('.home-cultivator-sprite');
        if (el) {
          const r = el.getBoundingClientRect();
          origin = { x: r.left, y: r.top, w: r.width, h: r.height };
        }
      }
      enqueue('character-evolution', {
        oldTier:    CULTIVATOR_TIER_NAMES[oldTierIdx],
        newTier:    CULTIVATOR_TIER_NAMES[newTierIdx],
        realmName:  d.realmName ?? 'Ascension',
        tierName:   CULTIVATOR_TIER_DISPLAY_NAMES[newTierIdx],
        isFinal:    !!d.isFinal,
        origin,
      }, { priority: 'high' });
    };
    window.addEventListener('mai:char-evolve', handler);
    return () => window.removeEventListener('mai:char-evolve', handler);
  }, [enqueue]);

  // ── Inline crystal refine (replaces the v1 feed modal) ───────────────────
  // The crystal exposes `feedQi(amount, spendFn)`; under the v1 Cookie-Clicker
  // pivot, 1 qi == 1 RQI, so spending exactly `requiredForNext - refinedQi`
  // buys precisely +1 crystal level. If that level-up crosses a visual tier
  // threshold, fire the same evolve overlay the modal used to trigger.
  const handleCrystalRefine = useCallback(() => {
    if (!crystal || !isCrystalUnlocked) return;
    const cost = Math.max(0, (crystal.requiredForNext ?? 0) - (crystal.refinedQi ?? 0));
    if (cost <= 0) return;
    const result = crystal.feedQi?.(cost, cultivation?.spendQi);
    if (!result) return;
    if (result.tierChanged) {
      handleCrystalEvolve({
        previousTier: result.previousTier,
        newTier:      result.newTier,
        newLevel:     result.newLevel,
      });
    }
  }, [crystal, isCrystalUnlocked, cultivation, handleCrystalEvolve]);

  // ── Breakthrough — peak-stage entries use the lightweight text banner,
  //    major realm-name changes (and the final ascension) pop the cinematic
  //    Character Evolution overlay so the player gets a real emotional beat
  //    every time their cultivator's appearance changes.
  const enqueuedBreakthroughIdRef = useRef(null);
  useEffect(() => {
    if (!majorBreakthrough || enqueuedBreakthroughIdRef.current === majorBreakthrough.id) return;
    enqueuedBreakthroughIdRef.current = majorBreakthrough.id;
    if (majorBreakthrough.isPeak) {
      // Sub-realm peak — same realm name, same cultivator tier, no new
      // visual identity. Lightweight 2.6 s text banner is right.
      enqueue('breakthrough', majorBreakthrough);
      return;
    }
    // Major realm change (or final ascension) — cultivator tier sprite WILL
    // change. Lift the home cultivator into a cinematic centred ascension
    // and reveal the new tier when the player taps to continue.
    const newRealmIndex = cultivation.realmIndex;
    const oldRealmIndex = Math.max(0, newRealmIndex - 1);
    const newTierIdx = getCultivatorTier(newRealmIndex);
    const oldTierIdx = getCultivatorTier(oldRealmIndex);
    // Measure the home cultivator's on-screen rect so the overlay lifts
    // from there and returns to it (matches the crystal-evolution pattern).
    let origin = null;
    if (typeof document !== 'undefined') {
      const el = document.querySelector('.home-cultivator-sprite');
      if (el) {
        const r = el.getBoundingClientRect();
        origin = { x: r.left, y: r.top, w: r.width, h: r.height };
      }
    }
    enqueue('character-evolution', {
      oldTier:    CULTIVATOR_TIER_NAMES[oldTierIdx],
      newTier:    CULTIVATOR_TIER_NAMES[newTierIdx],
      realmName:  majorBreakthrough.label,
      tierName:   CULTIVATOR_TIER_DISPLAY_NAMES[newTierIdx],
      isFinal:    !!majorBreakthrough.isFinal,
      origin,
    }, { priority: 'high' });
  }, [majorBreakthrough, enqueue, cultivation.realmIndex]);

  // ── Offline earnings — render via queue. App.jsx is already enqueueing. ─
  // (Render condition below combines queue head with cultivation state.)

  // Release hold state whenever a breakthrough fires — the modal that follows
  // would steal the pointer and stopBoost() would never be called otherwise.
  useEffect(() => { if (majorBreakthrough) stopBoost(); }, [majorBreakthrough]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pointer handlers ─────────────────────────────────────────────────────
  const handlePointerDown = (e) => {
    e.preventDefault();
    startBoost();
    const rect = e.currentTarget.getBoundingClientRect();
    spawnVFX({ type: 'burst', x: e.clientX - rect.left, y: e.clientY - rect.top, duration: 600 });
  };
  const handlePointerUp = () => { stopBoost(); };

  // ── Ad boost countdown ───────────────────────────────────────────────────
  const adBoostRemaining = adBoostActive
    ? formatCooldown(adBoostEndsAt - Date.now())
    : null;

  // Cultivator: static 256×256 PNG per (tier, pose). Tier from realmIndex,
  // pose from `boosting`. CSS does the gentle breathing pulse. The aura
  // overlay underneath uses SpriteAnimator (4-frame loop) and is only
  // mounted when the rewarded-ad boost is active.
  const cultivatorTier = getCultivatorTier(cultivation.realmIndex);
  const cultivatorTierName = CULTIVATOR_TIER_NAMES[cultivatorTier];
  const cultivatorPose = boosting ? 'focused' : 'normal';
  const spriteSrc = `${BASE}sprites/cultivator/${cultivatorTierName}_${cultivatorPose}.png`;
  const auraSrc   = `${BASE}sprites/cultivator/heavenly_aura.png`;
  const fps       = boosting ? 14 : 5; // kept for any remaining animated consumers

  return (
    <div className={`screen home-screen${boosting ? ' home-boosting' : ''}`}>
      {/* Full-screen background — center bottom so the hall floor and archway
          sit at the same visual depth regardless of screen aspect ratio */}
      <div className="home-bg" style={{ backgroundImage: `url(${BASE}backgrounds/home.png)` }} />

      {/* Offline earnings modal — gated by the event queue so it doesn't
          stack on top of the daily bonus or breakthrough banner. */}
      {currentEvent?.kind === 'offline-earnings' && offlineEarnings > 0 && (
        <OfflineEarningsModal
          amount={offlineEarnings}
          onCollect={() => {
            collectOfflineEarnings(1);
            dismiss(currentEvent.id);
          }}
          onDoubleCollect={cultivationAd.isReady ? () => {
            collectOfflineEarnings(2);
            cultivationAd.show();
            dismiss(currentEvent.id);
          } : null}
        />
      )}

      {/* ── Scene: fills all space between top bar and nav bar ──────── */}
      <div className="home-scene">

        {/* Left info panel — only visible at PC widths (≥ 900 px) */}
        <HomePCLeftPanel
          realmName={realmName}
          realmStage={realmStage}
          qiRef={qiRef}
          progressRef={qiEarnedThisRealmRef}
          focusMultRef={focusMultRef}
          sparkFocusMultBonusRef={sparkFocusMultBonusRef}
          sparkConsecutiveCurrentBonusRef={sparkConsecutiveCurrentBonusRef}
          costRef={costRef}
          rateRef={rateRef}
          gateRef={gateRef}
          boosting={boosting}
          adBoostActive={adBoostActive}
          maxed={maxed}
          ascended={ascended}
        />

        {/* Centre column: cultivation zone + bar */}
        <div className="home-pc-center">

        {/* ── Cultivation zone: absolutely-positioned scene elements ─── */}
        <div className="home-cultivation-zone">

          {/* Major-realm breakthrough celebration — gated by the event queue. */}
          {currentEvent?.kind === 'breakthrough' && (
            <BreakthroughBanner
              key={currentEvent.id}
              event={currentEvent.payload}
              onDone={() => {
                dismiss(currentEvent.id);
                clearMajorBreakthrough();
                if (selections?.pendingCount > 0) {
                  enqueue('selection-cards', null, { dedupe: true });
                }
              }}
            />
          )}

          {/* ── Top-left chip stack — priority order: rewards → no law → idle ── */}
          <div className="home-chips-tl">
            <ActiveSparksBar activeSparks={activeSparks} />
            {selections?.pendingCount > 0 && !majorBreakthrough && (
              <button className="home-sel-btn" onClick={onOpenSelections}>
                <span className="home-sel-btn-icon">📦</span>
                <span className="home-sel-btn-label">
                  {selections.pendingCount} Reward{selections.pendingCount !== 1 ? 's' : ''}!
                </span>
              </button>
            )}
            {!cultivation.activeLaw && (cultivation.ownedLaws?.length ?? 0) > 0 && (
              <button className="home-sel-btn home-sel-btn-law" onClick={() => onNavigate?.('character')}>
                <span className="home-sel-btn-icon">☯</span>
                <span className="home-sel-btn-label">No law equipped</span>
              </button>
            )}
            {lastIdleAssignment && (() => {
              const world  = WORLDS[lastIdleAssignment.worldIndex];
              const region = world?.regions?.[lastIdleAssignment.regionIndex];
              if (!region) return null;
              const icon = lastIdleAssignment.activity === 'gathering' ? '🌿' : '⛏';
              return (
                <button className="home-idle-chip" onClick={() => onNavigate?.('worlds', { activeTab: lastIdleAssignment.activity === 'gathering' ? 'gather' : 'mine' })}>
                  <span className="home-idle-chip-icon">{icon}</span>
                  <span className="home-idle-chip-label">{region.name}</span>
                </button>
              );
            })()}
            {totalOwnedPills > 0 && (
              <button className="home-pill-chip" onClick={onOpenPills}>
                <span className="home-pill-chip-icon">◈</span>
                <span className="home-pill-chip-label">{totalOwnedPills} Pills</span>
              </button>
            )}
          </div>

          {/* ── Top-right chip stack — reserved for timed/seasonal events ── */}
          <div className="home-chips-tr">
            <HeavenlyQiButton
              ad={cultivationAd}
              adBoostActive={adBoostActive}
              adBoostRemaining={adBoostRemaining}
              maxed={maxed}
            />
            {dailyBonus && (
              <DailyBonusWidget
                streak={dailyBonus.streak}
                todayReward={dailyBonus.todayReward}
                isAvailable={dailyBonus.isAvailable}
                onOpen={onOpenDailyBonus}
              />
            )}
          </div>

          {/* Divine Qi orbs — float over the scene at random positions */}
          {divineOrbs.map(orb => (
            <DivineQiOrb key={orb.id} orb={orb} onResolve={collectOrb} spawnVFX={spawnVFX} rateRef={cultivation.rateRef} />
          ))}

          {/* Pattern Clicking opt-in prompt — small spark the player can tap to
              begin the minigame, or ignore to let it pass without penalty. */}
          {patternPrompt && (
            <PatternClickPrompt
              key={patternPrompt.id}
              prompt={patternPrompt}
              onAccept={openPatternPrompt}
              onDismiss={dismissPatternPrompt}
            />
          )}

          {/* Pattern Clicking overlay — opens once the prompt is accepted. */}
          {activePattern && (
            <PatternClickOverlay
              key={activePattern.id}
              pattern={activePattern}
              onComplete={completePattern}
              rateRef={cultivation.rateRef}
              spawnVFX={spawnVFX}
            />
          )}

          {/* Crystal + particles + character — stacked so gap always equals particles height */}
          <div className="home-crystal-char-stack">
          <KeyCrystal
            crystal={crystal}
            isUnlocked={isCrystalUnlocked}
            particleColors={isCrystalUnlocked && crystal ? CRYSTAL_COLORS[getCrystalTier(crystal.level)] : CRYSTAL_COLORS[1]}
            hidden={currentEvent?.kind === 'crystal-evolution'}
            cfRung={cfRung}
            reservoirRef={crystalReservoirRef}
            crystalClickCapMinRef={crystalClickCapMinRef}
            rateRef={cultivation.rateRef}
            onCollect={handleCrystalCollect}
            qiRef={cultivation.qiRef}
            onRefine={handleCrystalRefine}
          />

          {/* Character + Consecutive-Focus meter group — grounded at scene bottom */}
          <div className="home-char-group">
            {!maxed && boosting && sparkConsecutiveLadderRef?.current?.length > 0 && (
              <div className="home-char-hint-slot">
                <ConsecutiveFocusMeter
                  ladder={sparkConsecutiveLadderRef.current}
                  boostStartTimeRef={boostStartTimeRef}
                />
              </div>
            )}
            <div
              className={`fighter-stage home-fighter-stage${boosting ? ' stage-boosted' : ''}${adBoostActive ? ' stage-ad-boosted' : ''}${currentEvent?.kind === 'character-evolution' ? ' home-fighter-stage-lifted' : ''}`}
              style={{ width: `${128 * spriteScale}px`, height: `${128 * spriteScale}px` }}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {vfxLayer}
              {/* Heavenly aura — only rendered when the rewarded-ad boost is
                  active. 4-frame loop at 6 fps. Sits BEHIND the cultivator
                  via z-index; alpha-zero center lets the character show
                  through cleanly. */}
              {adBoostActive && (
                <SpriteAnimator
                  src={auraSrc}
                  frameWidth={256}
                  frameHeight={256}
                  frameCount={4}
                  fps={6}
                  className="home-cultivator-aura"
                  style={{ width: '120%', height: '120%' }}
                />
              )}
              {/* Cultivator — static 256×256 PNG. CSS breathing pulse adds
                  life without API-side animation. We render BOTH poses
                  (normal + focused) stacked and toggle visibility via
                  opacity so a pose change is a crossfade rather than a
                  remount — the breathing-pulse keyframe keeps its phase
                  across the swap, no jump back to scale 1.0. Keys are
                  tier-only so both layers remount together (and re-sync
                  the breathing) only when the tier itself changes. */}
              <img
                key={`${cultivatorTierName}-normal`}
                src={`${BASE}sprites/cultivator/${cultivatorTierName}_normal.png`}
                alt="Cultivator"
                className={`home-cultivator-sprite${cultivatorPose === 'normal' ? '' : ' home-cultivator-sprite-fade'}`}
                draggable="false"
              />
              <img
                key={`${cultivatorTierName}-focused`}
                src={`${BASE}sprites/cultivator/${cultivatorTierName}_focused.png`}
                alt=""
                aria-hidden="true"
                className={`home-cultivator-sprite${cultivatorPose === 'focused' ? '' : ' home-cultivator-sprite-fade'}`}
                draggable="false"
              />
            </div>
          </div>
          </div>{/* end home-crystal-char-stack */}

        </div>{/* end home-cultivation-zone */}

        {/* ── Bottom section: realm name + qi/s row + bar ──────────── */}
        <div className="home-scene-bottom">

          {/* Realm name + stage header — mobile only; PC left panel shows the
              same info at the top of the side rail at ≥900px. */}
          {realmName && (
            <div className="home-scene-realm-header">
              <span className="home-scene-realm-name">{realmName.split(' - ')[0]}</span>
              {realmStage && <span className="home-scene-realm-stage">{realmStage}</span>}
            </div>
          )}

          {/* Overlay row — hidden on PC (info lives in left panel instead) */}
          <div className="home-scene-overlay-row">
            <div className="home-overlay-half">
              <QiProgressChip qiRef={qiRef} progressRef={qiEarnedThisRealmRef} costRef={costRef} gateRef={gateRef} rateRef={rateRef} maxed={maxed} ascended={ascended} />
            </div>
            <div className="home-overlay-half">
              <QiRateReadout
                rateRef={rateRef}
                focusMultRef={focusMultRef}
                sparkFocusMultBonusRef={sparkFocusMultBonusRef}
                sparkConsecutiveCurrentBonusRef={sparkConsecutiveCurrentBonusRef}
                boosting={boosting}
                adBoostActive={adBoostActive}
                maxed={maxed}
              />
            </div>
          </div>

          <div className="home-bar-wrap">
            {cultivation.pendingMajorBreakthrough && (
              <button
                className="home-major-breakthrough-btn"
                onClick={cultivation.confirmMajorBreakthrough}
                aria-label={`Breakthrough to ${cultivation.nextRealmName ?? 'next realm'}`}
              >
                <span className="home-mb-icon">▲</span>
                <span className="home-mb-label">
                  <span className="home-mb-cta">BREAKTHROUGH</span>
                  <span className="home-mb-next">{cultivation.nextRealmName}</span>
                </span>
                <span className="home-mb-icon">▲</span>
              </button>
            )}
            <RealmProgressBar
              qiRef={qiRef}
              progressRef={qiEarnedThisRealmRef}
              costRef={costRef}
              gateRef={gateRef}
              boosting={boosting}
              maxed={maxed}
              realmIndex={cultivation.realmIndex}
              breakthrough={currentEvent?.kind === 'breakthrough'}
              peakStage={cultivation.isInPeakStage}
            />
          </div>

        </div>

        </div>{/* end home-pc-center */}

        {/* Right spacer panel — only visible at PC widths, balances the layout */}
        <div className="home-pc-right" aria-hidden="true" />

      </div>{/* end home-scene */}

      {/* Crystal evolution celebration — fires on visual-tier change. */}
      {currentEvent?.kind === 'crystal-evolution' && (
        <CrystalEvolutionOverlay
          key={currentEvent.id}
          event={currentEvent.payload}
          onDone={() => dismiss(currentEvent.id)}
        />
      )}

      {/* Character evolution cinematic — fires on major realm-name changes
          (every cultivator-tier visual transition). Tap-to-continue. */}
      {currentEvent?.kind === 'character-evolution' && (
        <CharacterEvolutionOverlay
          key={currentEvent.id}
          event={currentEvent.payload}
          onDone={() => dismiss(currentEvent.id)}
        />
      )}

      {/* Tutorial popups — queued after celebrations (e.g. new mechanic
          unlocked by a crystal evolution). Generic; reusable for any future
          onboarding moment. */}
      {currentEvent?.kind === 'tutorial' && (
        <TutorialModal
          key={currentEvent.id}
          kicker={currentEvent.payload?.kicker}
          title={currentEvent.payload?.title}
          body={currentEvent.payload?.body}
          iconSrc={currentEvent.payload?.iconSrc}
          ctaText={currentEvent.payload?.ctaText}
          glowA={currentEvent.payload?.glowA}
          glowB={currentEvent.payload?.glowB}
          onDone={() => dismiss(currentEvent.id)}
        />
      )}

    </div>
  );
}

export default HomeScreen;
