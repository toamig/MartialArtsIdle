// @refresh reset
import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
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
import { QI_SPARK_BY_ID } from '../data/qiSparks';
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

/** Qi Crystal — locked (dim, greyscale) or unlocked (glowing, tapable when
 *  Crystal Click mechanic is active). Reservoir fill tracked via rAF. */
function KeyCrystal({ crystal, isUnlocked, particleColors, hidden, cfRung, reservoirRef, crystalClickCapMinRef, rateRef, onCollect }) {
  const unlockHint = FEATURE_GATES.qi_crystal?.hint ?? 'Reach a higher realm';
  // true only when the Crystal Click spark is active AND the crystal is unlocked
  const mechanicOn = !!(crystalClickCapMinRef && onCollect && isUnlocked);

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
  return (
    <div
      ref={anchorRef}
      className={`home-crystal-anchor${hidden ? ' home-crystal-anchor-lifted' : ''}${mechanicOn ? ' home-crystal-tappable' : ''}`}
      onClick={mechanicOn ? onCollect : undefined}
    >
      <div className="home-crystal-float" style={{ '--cg-a': glowA, '--cg-b': glowB }}>
        <span className="home-crystal-tag">Qi Crystal</span>
        <span className="home-crystal-evolve">Lv {level}</span>
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
      <QiParticles colors={particleColors} rung={cfRung} />
      <div className="crystal-tooltip">
        <div className="ctt-title">Qi Crystal · Lv {level}</div>
        <div className="ctt-desc">A crystallised vessel of refined Qi. Feed it QI stones to level it up and increase your cultivation speed.</div>
        <div className="ctt-bonus">
          <span className="ctt-gem">◆</span> Current bonus: <strong>+{crystalQiBonus} Qi/s</strong>
        </div>
        {mechanicOn
          ? <div className="ctt-hint">Tap to collect stored Qi</div>
          : <div className="ctt-hint">Feed via 🪨 in the top bar</div>
        }
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
    setTapped(prev => { const n = new Set(prev); n.add(dot.num); return n; });
    const isLast = dot.num === pattern.dots.length;
    if (isLast) {
      phaseRef.current = 'success';
      setPhase('success');
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
            const fmt    = n => n >= 1e6 ? `+${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `+${(n/1e3).toFixed(1)}K` : `+${Math.floor(n)}`;
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
    <div className={`pc-overlay pc-overlay-${phase}`} aria-label="Pattern Clicking challenge">

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
 * Manages the Pattern Click minigame lifecycle.
 * Reads the active pattern_click spark; self-schedules spawns with ±30% jitter.
 * Returns { activePattern, completePattern }.
 */
function usePatternClick({ activeSparks, rateRef, qiRef }) {
  const [activePattern, setActivePattern] = useState(null);
  const activeRef = useRef(false);

  const config = useMemo(() => {
    const inst = activeSparks?.find(s => {
      const card = QI_SPARK_BY_ID[s.sparkId];
      return card?.kind === 'mechanic' && card?.mechanicId === 'pattern_click';
    });
    return inst ? (QI_SPARK_BY_ID[inst.sparkId] ?? null) : null;
  }, [activeSparks]);
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);

  const spawnPattern = useCallback(() => {
    if (activeRef.current) return; // don't overlap with an active pattern
    const cfg = configRef.current;
    if (!cfg) return;
    activeRef.current = true;
    setActivePattern({
      id:                Date.now(),
      dots:              generateDotPositions(cfg.dotCount),
      windowMs:          cfg.windowMs,
      burstSeconds:      cfg.burstSeconds,
      doubleOnFullClear: cfg.doubleOnFullClear ?? false,
      rateMult:          cfg.rateMult  ?? 2.0,
      rateBuffMs:        cfg.rateBuffMs ?? 15_000,
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
      timer = setTimeout(() => { spawnPattern(); arm(); }, delay);
    };
    // First spawn after a brief "discovery" delay capped at 15s
    timer = setTimeout(
      () => { spawnPattern(); arm(); },
      Math.min(config.spawnIntervalMs * 0.5, 15_000),
    );
    return () => clearTimeout(timer);
  }, [config?.id, spawnPattern]); // re-arm if tier changes

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
    activeRef.current = false;
    setActivePattern(null);
  }, [rateRef, qiRef]);

  return { activePattern, completePattern };
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
          const fmt = n => n >= 1e6 ? `+${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `+${(n/1e3).toFixed(1)}K` : `+${Math.floor(n)}`;
          spawnVFX({ type: 'qi-tick', x, y, content: fmt(reward), duration: 1500,
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
      aria-label="Divine Qi orb"
    />
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

  // Spawn function — creates 1 or 2 orbs (T5 doubleOrb)
  const spawnWave = useCallback(() => {
    const cfg = configRef.current;
    if (!cfg) return;
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
    return () => clearTimeout(timer);
  }, [config?.id, spawnWave]); // re-arm if tier changes (config.id changes)

  // Called when an orb is collected or expires (after its exit animation)
  const collectOrb = useCallback((orbId, wasCollected) => {
    setOrbs(prev => prev.filter(o => o.id !== orbId));
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

  // ── Crystal Click — collect reservoir on tap ─────────────────────────────
  const handleCrystalCollect = useCallback(() => {
    if (!crystalReservoirRef || !collectCrystalReservoir) return;
    const amount = crystalReservoirRef.current ?? 0;
    if (amount <= 0) return;
    collectCrystalReservoir();
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
        const fmt = n => n >= 1e6 ? `+${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `+${(n/1e3).toFixed(1)}K` : `+${Math.floor(n)}`;
        spawnVFX({ type: 'qi-tick', x, y, content: fmt(amount), duration: 1600,
          style: { '--qi-drift-x': '0px' } });
      }
    } catch {}
  }, [crystalReservoirRef, collectCrystalReservoir, spawnVFX]);

  const cultivationAd = useRewardedAd(onCultivationReward, 30 * 60 * 1000, 'mai_ad_cd_cultivation');

  // ── Divine Qi — golden orb mechanic ─────────────────────────────────────
  const { orbs: divineOrbs, collectOrb } = useDivineQi({
    activeSparks,
    rateRef:   cultivation.rateRef,
    qiRef:     cultivation.qiRef,
    spawnVFX,
  });

  // ── Pattern Click — numbered dot minigame ────────────────────────────────
  const { activePattern, completePattern } = usePatternClick({
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

          {/* Divine Qi orbs — float over the scene at random positions */}
          {divineOrbs.map(orb => (
            <DivineQiOrb key={orb.id} orb={orb} onResolve={collectOrb} spawnVFX={spawnVFX} rateRef={cultivation.rateRef} />
          ))}

          {/* Pattern Clicking overlay — appears when mechanic is active */}
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
