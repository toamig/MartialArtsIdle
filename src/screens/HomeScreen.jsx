// @refresh reset
import { useCallback, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SpriteAnimator from '../components/SpriteAnimator';
import RealmProgressBar from '../components/RealmProgressBar';
import OfflineEarningsModal from '../components/OfflineEarningsModal';
import { useVFX } from '../components/VFXLayer';
import { useRewardedAd, formatCooldown } from '../ads/useRewardedAd';
import CrystalFeedModal from '../components/CrystalFeedModal';
import DailyBonusWidget from '../components/DailyBonusWidget';
import ActiveSparksBar from '../components/ActiveSparksBar';
import { FEATURE_GATES } from '../data/featureGates';
import { useEventQueue, useBlockingPresence } from '../contexts/EventQueueContext';
import WORLDS from '../data/worlds';
const BASE = import.meta.env.BASE_URL;
const AD_BOOST_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// home.png natural dimensions — used to compute the cover-scale sprite size.
const HOME_BG_W = 1376;
const HOME_BG_H = 768;

// 4 states: idle | boost | adboosted | adboosted-boost
function getSpriteState(boosting, adBoostActive) {
  if (adBoostActive && boosting) return 4;
  if (adBoostActive)             return 3;
  if (boosting)                  return 2;
  return 1;
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
        textRef.current.textContent = r >= 1000
          ? `+${(r / 1000).toFixed(1)}K Qi/s`
          : `+${r.toFixed(1)} Qi/s`;
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
function QiProgressChip({ qiRef, costRef, gateRef, rateRef, maxed, ascended }) {
  const textRef = useRef(null);
  const divRef  = useRef(null);
  useEffect(() => {
    const fmt = (n) => {
      if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
      if (n >= 1e9)  return (n / 1e9).toFixed(2)  + 'B';
      if (n >= 1e6)  return (n / 1e6).toFixed(2)  + 'M';
      if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
      return String(Math.floor(n));
    };
    const fmtRate = (n) => {
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      if (n >= 10)  return n.toFixed(0);
      return n.toFixed(1);
    };
    let raf;
    const update = () => {
      const gate = gateRef?.current;
      if (divRef.current)  divRef.current.classList.toggle('qi-rate-gated', !!gate);
      if (textRef.current) {
        if (ascended) {
          const r = rateRef ? rateRef.current : 0;
          textRef.current.textContent = `${fmt(qiRef.current)} Qi  ·  ${fmtRate(r)}/s`;
        } else if (gate) {
          const r = rateRef ? rateRef.current : gate.current;
          textRef.current.textContent = `${fmtRate(r)} / ${fmtRate(gate.required)}  Qi/s`;
        } else {
          textRef.current.textContent = `${fmt(qiRef.current)} / ${fmt(costRef.current)}`;
        }
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [qiRef, costRef, gateRef, rateRef, maxed, ascended]);
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

const HOLD_HINT_SEEN_KEY = 'mai_home_hold_hint_seen';
const HOLD_HINT_IDLE_MS  = 60 * 1000;

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
  const card = (
    <div className="crystal-evolve-card">
      <div className="crystal-evolve-kicker">Evolution</div>
      <div className="crystal-evolve-name">{tierName}</div>
      <div className="crystal-evolve-sub">Tier {event.newTier} · Level {event.newLevel}</div>
    </div>
  );

  // Lift-and-return geometry — overlay stage starts at the home crystal's
  // rect and returns there at the end. Falls back to screen centre if no
  // origin was captured (e.g. gd trigger while crystal was off-screen).
  const originX     = event.origin?.x ?? (typeof window !== 'undefined' ? window.innerWidth  / 2 - CES_STAGE_SIZE / 2 : 0);
  const originY     = event.origin?.y ?? (typeof window !== 'undefined' ? window.innerHeight / 2 - CES_STAGE_SIZE / 2 : 0);
  const originScale = event.origin?.w ? event.origin.w / CES_STAGE_SIZE : 1;
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

/** Qi Crystal — locked (dim, greyscale) or unlocked (glowing, decorative).
 *  The feed modal is opened from the top-bar 🪨 button, not by tapping the
 *  crystal itself, so this component is purely visual. */
function KeyCrystal({ crystal, isUnlocked, particleColors, hidden }) {
  const unlockHint = FEATURE_GATES.qi_crystal?.hint ?? 'Reach a higher realm';

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
  return (
    <div className={`home-crystal-anchor${hidden ? ' home-crystal-anchor-lifted' : ''}`}>
      <div className="home-crystal-float" style={{ '--cg-a': glowA, '--cg-b': glowB }}>
        <span className="home-crystal-tag">Qi Crystal</span>
        <span className="home-crystal-evolve">Lv {level}</span>
        <img
          src={`${BASE}crystals/crystal_${tier}.png`}
          className="home-crystal-img"
          alt="Qi Crystal"
          draggable="false"
        />
      </div>
      <QiParticles colors={particleColors} />
      <div className="crystal-tooltip">
        <div className="ctt-title">Qi Crystal · Lv {level}</div>
        <div className="ctt-desc">A crystallised vessel of refined Qi. Feed it QI stones to level it up and increase your cultivation speed.</div>
        <div className="ctt-bonus">
          <span className="ctt-gem">◆</span> Current bonus: <strong>+{crystalQiBonus} Qi/s</strong>
        </div>
        <div className="ctt-hint">Feed via 🪨 in the top bar</div>
      </div>
    </div>
  );
}

// ── PC-only left info panel ──────────────────────────────────────────────────

/** Compact qi text updated via rAF — avoids a React re-render every frame.
 *  During a major-realm gate, switches to showing Qi/s current / required. */
function PCQiProgressText({ qiRef, costRef, gateRef, rateRef, maxed, ascended }) {
  const textRef = useRef(null);
  const divRef  = useRef(null);
  useEffect(() => {
    const fmt = (n) => {
      if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
      if (n >= 1e9)  return (n / 1e9).toFixed(2)  + 'B';
      if (n >= 1e6)  return (n / 1e6).toFixed(2)  + 'M';
      if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
      return String(Math.floor(n));
    };
    const fmtRate = (n) => {
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      if (n >= 10)  return n.toFixed(0);
      return n.toFixed(1);
    };
    let raf;
    const tick = () => {
      const gate = gateRef?.current;
      if (divRef.current)  divRef.current.classList.toggle('qi-rate-gated', !!gate);
      if (textRef.current) {
        if (ascended) {
          const r = rateRef ? rateRef.current : 0;
          textRef.current.textContent = `${fmt(qiRef.current)} Qi  ·  ${fmtRate(r)}/s`;
        } else if (gate) {
          const r = rateRef ? rateRef.current : gate.current;
          textRef.current.textContent = `${fmtRate(r)} / ${fmtRate(gate.required)}  Qi/s`;
        } else {
          textRef.current.textContent = `${fmt(qiRef.current)} / ${fmt(costRef.current)} Qi`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [qiRef, costRef, gateRef, rateRef, maxed, ascended]);
  return <div ref={divRef} className="qi-rate"><span ref={textRef}>—</span></div>;
}

/** Left panel — visible only at wide (≥ 900 px) breakpoints.
 *  Shows cultivation stats so the player doesn't have to look at the bar. */
function HomePCLeftPanel({ realmName, realmStage, qiRef, costRef, rateRef, gateRef, focusMultRef, sparkFocusMultBonusRef, sparkConsecutiveCurrentBonusRef, boosting, adBoostActive, maxed, ascended }) {
  const { t } = useTranslation('ui');
  return (
    <div className="home-pc-left">
      <div className="home-pc-section-label">Cultivation</div>
      <div className="home-pc-realm-name">{realmName.split(' - ')[0]}</div>
      {realmStage && !ascended && <div className="home-pc-realm-stage">{realmStage}</div>}
      <PCQiProgressText qiRef={qiRef} costRef={costRef} gateRef={gateRef} rateRef={rateRef} maxed={maxed} ascended={ascended} />
      <QiRateReadout rateRef={rateRef} focusMultRef={focusMultRef} sparkFocusMultBonusRef={sparkFocusMultBonusRef} sparkConsecutiveCurrentBonusRef={sparkConsecutiveCurrentBonusRef} boosting={boosting} adBoostActive={adBoostActive} maxed={maxed} />
    </div>
  );
}

/** Falling qi-particle stream between crystal and character (5 particles). */
function QiParticles({ colors }) {
  const p = colors?.particles ?? ['#a78bfa','#8b5cf6','#a78bfa','#ddd6fe','#7c3aed'];
  return (
    <div className="home-qi-particles" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`home-qi-particle home-qi-p${i + 1}`} style={{ background: p[i] }} />
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
}) {
  const { t } = useTranslation('ui');
  const {
    realmName,
    realmStage,
    nextRealmName,
    qiRef,
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
    const fmt = (n) => {
      if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(Math.floor(n));
    };
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
        content: `+${fmt(whole)}`,
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

  const cultivationAd = useRewardedAd(onCultivationReward, 30 * 60 * 1000, 'mai_ad_cd_cultivation');

  // ── Hold-hint ────────────────────────────────────────────────────────────
  const [showHoldHint, setShowHoldHint] = useState(() => {
    try { return !localStorage.getItem(HOLD_HINT_SEEN_KEY); } catch { return true; }
  });

  // ── Event queue wiring ───────────────────────────────────────────────────
  // Spontaneous popups (offline earnings, breakthrough banner, level-up cards,
  // crystal evolution) all flow through one FIFO queue so they don't stack.
  const { enqueue, currentEvent, dismiss } = useEventQueue();

  // ── Crystal feed modal ───────────────────────────────────────────────────
  const [crystalModalOpen, setCrystalModalOpen] = useState(false);
  useEffect(() => { if (openCrystal && isCrystalUnlocked) setCrystalModalOpen(true); }, [openCrystal]); // eslint-disable-line react-hooks/exhaustive-deps
  // While the player is feeding the crystal, queued events (breakthrough
  // banner, level-up cards) wait until the modal closes.
  useBlockingPresence(crystalModalOpen);

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
  }, [enqueue]);

  // Debug bridge — gd.crystalEvolve(newTier, previousTier?) fires this event.
  useEffect(() => {
    const handler = (e) => handleCrystalEvolve(e.detail ?? {});
    window.addEventListener('mai:crystal-evolve', handler);
    return () => window.removeEventListener('mai:crystal-evolve', handler);
  }, [handleCrystalEvolve]);

  // ── Breakthrough banner — enqueue when majorBreakthrough state appears ──
  const enqueuedBreakthroughIdRef = useRef(null);
  useEffect(() => {
    if (majorBreakthrough && enqueuedBreakthroughIdRef.current !== majorBreakthrough.id) {
      enqueuedBreakthroughIdRef.current = majorBreakthrough.id;
      enqueue('breakthrough', majorBreakthrough);
    }
  }, [majorBreakthrough, enqueue]);

  // ── Offline earnings — render via queue. App.jsx is already enqueueing. ─
  // (Render condition below combines queue head with cultivation state.)

  const idleTimerRef = useRef(null);
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setShowHoldHint(true), HOLD_HINT_IDLE_MS);
  }, []);
  useEffect(() => { resetIdleTimer(); return () => clearTimeout(idleTimerRef.current); }, [resetIdleTimer]);

  // Release hold state whenever a breakthrough fires — the modal that follows
  // would steal the pointer and stopBoost() would never be called otherwise.
  useEffect(() => { if (majorBreakthrough) stopBoost(); }, [majorBreakthrough]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pointer handlers ─────────────────────────────────────────────────────
  const handlePointerDown = (e) => {
    e.preventDefault();
    startBoost();
    const rect = e.currentTarget.getBoundingClientRect();
    spawnVFX({ type: 'burst', x: e.clientX - rect.left, y: e.clientY - rect.top, duration: 600 });
    if (showHoldHint) {
      setShowHoldHint(false);
      try { localStorage.setItem(HOLD_HINT_SEEN_KEY, '1'); } catch {}
    }
    resetIdleTimer();
  };
  const handlePointerUp = () => { stopBoost(); resetIdleTimer(); };

  // ── Ad boost countdown ───────────────────────────────────────────────────
  const adBoostRemaining = adBoostActive
    ? formatCooldown(adBoostEndsAt - Date.now())
    : null;

  const spriteState = getSpriteState(boosting, adBoostActive);
  const spriteSrc   = `${BASE}sprites/cultivator/state${spriteState}.png`;
  const fps         = boosting ? 14 : 5;

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

          {/* Crystal + particles + character — stacked so gap always equals particles height */}
          <div className="home-crystal-char-stack">
          <KeyCrystal
            crystal={crystal}
            isUnlocked={isCrystalUnlocked}
            particleColors={isCrystalUnlocked && crystal ? CRYSTAL_COLORS[getCrystalTier(crystal.level)] : CRYSTAL_COLORS[1]}
            hidden={currentEvent?.kind === 'crystal-evolution'}
          />

          {/* Character + hold-hint group — grounded at scene bottom */}
          <div className="home-char-group">
            {!maxed && (
              <div className={`home-hold-hint${showHoldHint ? '' : ' home-hold-hint-fade'}`}>
                {t('home.holdToCultivate')}
              </div>
            )}
            <div
              className={`fighter-stage home-fighter-stage${boosting ? ' stage-boosted' : ''}${adBoostActive ? ' stage-ad-boosted' : ''}`}
              style={{ width: `${128 * spriteScale}px`, height: `${128 * spriteScale}px` }}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {vfxLayer}
              <SpriteAnimator
                key={spriteState}
                src={spriteSrc}
                frameWidth={128}
                frameHeight={128}
                frameCount={4}
                fps={fps}
                scale={spriteScale}
              />
            </div>
          </div>
          </div>{/* end home-crystal-char-stack */}

        </div>{/* end home-cultivation-zone */}

        {/* ── Bottom section: realm name + qi/s row + bar ──────────── */}
        <div className="home-scene-bottom">

          {/* Overlay row — hidden on PC (info lives in left panel instead) */}
          <div className="home-scene-overlay-row">
            <div className="home-overlay-half">
              <QiProgressChip qiRef={qiRef} costRef={costRef} gateRef={gateRef} rateRef={rateRef} maxed={maxed} ascended={ascended} />
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
            <RealmProgressBar
              qiRef={qiRef}
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

      {/* Crystal feed modal */}
      {crystalModalOpen && isCrystalUnlocked && (
        <CrystalFeedModal
          crystal={crystal}
          inventory={inventory}
          onClose={() => setCrystalModalOpen(false)}
          onEvolve={handleCrystalEvolve}
        />
      )}

      {/* Crystal evolution celebration — fires on visual-tier change. */}
      {currentEvent?.kind === 'crystal-evolution' && (
        <CrystalEvolutionOverlay
          key={currentEvent.id}
          event={currentEvent.payload}
          onDone={() => dismiss(currentEvent.id)}
        />
      )}

    </div>
  );
}

export default HomeScreen;
