import { useEffect, useState } from 'react';
import {
  QI_SPARK_BY_ID,
  SPARK_RARITY,
  SPARK_COPY,
  TRINITY_SPARK_IDS,
  TRINITY_CONVERGENCE_MULT,
} from '../data/qiSparks';
import PRODUCERS, { PRODUCERS_BY_ID } from '../data/producers';
import { fmtRate } from '../utils/format';

const BASE = import.meta.env.BASE_URL;

/**
 * SparksTab — canonical "your active sparks" view inside the Cultivation
 * screen. Replaces the modal that used to live behind the home chip; the
 * chip now ONLY surfaces TIMED buffs (time-pressure UI) and routes here
 * for the full view.
 *
 * Each spark card shows live contribution math derived from current
 * producer counts + rate refs:
 *   - Timed sparks: a countdown bar + secs left
 *   - Stacked permanent: stack count + per-stack effect math
 *   - Legendary producer-synergy: which producer is affected + current ×N
 *   - Mechanic tiers (Crystal Click etc.): tier + key stat
 *
 * Sections (top to bottom) — newest urgency first:
 *   1. Trinity Convergence banner (if all 3 beasts active)
 *   2. Timed buffs (countdown — time-pressure)
 *   3. Legendary (the chase tier — strongest effects, shown second)
 *   4. Uncommon permanent (the steady build)
 *   5. Mechanic (Crystal Click / Divine Qi / Pattern / Consecutive Focus)
 */

/** Render an icon: sprite if path, else emoji. */
function Icon({ icon, fallback = '✦' }) {
  const ic = icon ?? fallback;
  if (typeof ic === 'string' && ic.startsWith('/')) {
    return <img className="st-card-icon-img" src={`${BASE}${ic.replace(/^\//, '')}`} alt="" draggable={false} />;
  }
  return <span className="st-card-icon-emoji" aria-hidden="true">{ic}</span>;
}

/**
 * Compute a one-line "Currently: …" string describing the live contribution
 * of a spark. Returns null if there's nothing meaningful to show (e.g. the
 * Focus Surge spark, which only contributes while Focus is held).
 */
function describeContribution(spark, card, ctx) {
  const eff = card?.effect;
  if (!eff) return null;
  const { ownedMap, qiSparks, rate } = ctx;
  const stacks = spark.stacks ?? 1;
  const pname = (pid) => PRODUCERS_BY_ID[pid]?.name ?? pid;

  switch (eff.type) {
    // ── Timed / event-count common buffs ────────────────────────────
    case 'qi_mult': {
      // Surging Stream / Steady Stream — multiplicative bonus on qi/s.
      const bonus = eff.value;
      const extra = rate * bonus;
      return `+${Math.round(bonus * 100)}% qi/s → ≈ ${fmtRate(extra)} qi/s extra right now`;
    }
    case 'focus_mult_bonus':
      return `+${Math.round(eff.value * 100)}% on your Focus multiplier (active while holding Focus)`;

    // ── Permanent stacked uncommons ─────────────────────────────────
    case 'qi_flat_per_stack':
      return `+${eff.value * stacks} base qi/s${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    case 'qi_mult_per_stack':
      return `+${Math.round(eff.value * stacks * 100)}% qi/s${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    case 'focus_mult_bonus_per_stack':
      return `+${Math.round(eff.value * stacks * 100)}% Focus multiplier${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    case 'gate_reduction_per_stack':
      return `−${Math.round(eff.value * stacks * 100)}% on major-realm gate cost${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    case 'offline_qi_mult_per_stack':
      return `+${Math.round(eff.value * stacks * 100)}% offline qi accrual${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    case 'qi_mult_per_breakthrough_per_stack': {
      const accrued = spark.breakthroughsAccrued ?? 0;
      const totalPct = Math.round(eff.value * stacks * accrued * 100);
      return `+${totalPct}% qi/s (${stacks} stack${stacks > 1 ? 's' : ''} × ${accrued} breakthroughs since pick)`;
    }

    // ── Legendary producer-synergy ──────────────────────────────────
    case 'producer_self_mult':
      return `${pname(eff.target)} producing ×${eff.mult} qi/s`;
    case 'producer_count_mult': {
      const src = ownedMap[eff.source] ?? 0;
      const mult = 1 + src * eff.perEach;
      return `${src} × ${pname(eff.source)} → ${pname(eff.target)} producing ×${mult.toFixed(2)}`;
    }
    case 'producer_count_threshold_mult': {
      const src = ownedMap[eff.source] ?? 0;
      return src >= eff.threshold
        ? `Active (you own ${src} × ${pname(eff.source)}) → ${pname(eff.target)} producing ×${eff.mult}`
        : `Dormant — need ${eff.threshold} × ${pname(eff.source)} (you have ${src})`;
    }
    case 'producer_pair_synergy': {
      const a = ownedMap[eff.producerA] ?? 0;
      const b = ownedMap[eff.producerB] ?? 0;
      const pairs = Math.min(a, b);
      const mult = 1 + pairs * (eff.mult - 1);
      return pairs > 0
        ? `${pairs} pair${pairs > 1 ? 's' : ''} → both ${pname(eff.producerA)} & ${pname(eff.producerB)} producing ×${mult.toFixed(2)}`
        : `No pairs yet (own ≥1 of each to activate)`;
    }
    case 'producer_pair_global_mult': {
      const a = ownedMap[eff.producerA] ?? 0;
      const b = ownedMap[eff.producerB] ?? 0;
      const pairs = Math.min(a, b);
      const totalPct = Math.round(pairs * (eff.mult - 1) * 100);
      return pairs > 0
        ? `${pairs} pair${pairs > 1 ? 's' : ''} → +${totalPct}% global qi/s`
        : `No pairs yet (need ≥1 ${pname(eff.producerA)} + 1 ${pname(eff.producerB)})`;
    }
    case 'phoenix_reborn': {
      const phStacks = spark.phoenixRebornStacks ?? 0;
      return phStacks > 0
        ? `${phStacks} rebirth${phStacks > 1 ? 's' : ''} accrued → every other producer ×${Math.pow(2, phStacks)}`
        : `Waiting for next major realm breakthrough to trigger first rebirth`;
    }

    default:
      return null;
  }
}

/** A single spark card. */
function SparkCard({ spark, ctx, isTrinityActive }) {
  const card = QI_SPARK_BY_ID[spark.sparkId];
  if (!card) return null;
  const rarity = SPARK_RARITY[card.rarity] ?? SPARK_RARITY.common;
  const copy   = SPARK_COPY[spark.sparkId];
  const isTrinityPiece = card.trinityPiece === true;

  // Timer for timed sparks
  const now = ctx.now;
  const isTimed     = !!spark.expiresAt;
  const remainingMs = isTimed ? Math.max(0, spark.expiresAt - now) : null;
  const totalMs     = card.duration ?? 1;
  const progress    = isTimed ? Math.max(0, Math.min(1, remainingMs / totalMs)) : null;
  const secsLeft    = isTimed ? Math.max(0, Math.ceil(remainingMs / 1000)) : null;

  const contribution = describeContribution(spark, card, ctx);

  return (
    <div
      className={`st-card st-card-${card.rarity}${isTrinityPiece ? ' st-card-trinity-piece' : ''}${isTrinityPiece && isTrinityActive ? ' st-card-trinity-active' : ''}`}
      style={{ '--rarity-color': rarity.color }}
    >
      <div className="st-card-icon">
        <Icon icon={copy?.icon} />
        {isTrinityPiece && <span className="st-trinity-badge">✦</span>}
      </div>
      <div className="st-card-body">
        <div className="st-card-head">
          <span className="st-card-name">{card.name}</span>
          <span className={`st-card-rarity-tag st-rt-${card.rarity}`}>{rarity.label}</span>
        </div>
        {(copy?.effectText ?? card.description) && (
          <div className="st-card-effect">{copy?.effectText ?? card.description}</div>
        )}
        {contribution && <div className="st-card-contribution">Currently: <strong>{contribution}</strong></div>}
        {isTimed && (
          <div className="st-card-timer">
            <div className="st-card-timer-bar">
              <div className="st-card-timer-fill" style={{ '--p': progress }} />
            </div>
            <span className="st-card-timer-text">{secsLeft}s left</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, count, children }) {
  if (!count) return null;
  return (
    <section className="st-section">
      <header className="st-section-header">
        <span className="st-section-label">{label}</span>
        <span className="st-section-count">{count}</span>
      </header>
      <div className="st-section-list">{children}</div>
    </section>
  );
}

export default function SparksTab({ qiSparks, producers, cultivation }) {
  // Tick at 250ms to drive countdown bars + live rate-based contribution.
  // Cheap: re-renders only this tab when it's the active one.
  const [now, setNow] = useState(Date.now());
  const [rate, setRate] = useState(() => cultivation?.rateRef?.current ?? 0);
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setRate(cultivation?.rateRef?.current ?? 0);
    }, 250);
    return () => clearInterval(id);
  }, [cultivation?.rateRef]);

  const activeSparks = qiSparks?.activeSparks ?? [];
  // Hide expired timed sparks even if the cleanup tick hasn't run yet.
  const live = activeSparks.filter(s => !s.expiresAt || s.expiresAt > now);

  // Group by lifecycle / rarity
  const groups = { timed: [], legendary: [], uncommon: [], mechanic: [] };
  for (const s of live) {
    const card = QI_SPARK_BY_ID[s.sparkId];
    if (!card) continue;
    if (s.expiresAt) groups.timed.push(s);
    else if (card.rarity === 'legendary') groups.legendary.push(s);
    else if (card.kind === 'mechanic')    groups.mechanic.push(s);
    else                                   groups.uncommon.push(s);
  }
  // Sort timed by soonest expiry first
  groups.timed.sort((a, b) => a.expiresAt - b.expiresAt);
  // Sort legendary so trinity pieces cluster together (canonical Tiger → Dragon → Phoenix order)
  groups.legendary.sort((a, b) => {
    const ai = TRINITY_SPARK_IDS.indexOf(a.sparkId);
    const bi = TRINITY_SPARK_IDS.indexOf(b.sparkId);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return 0;
  });

  const isTrinityActive = TRINITY_SPARK_IDS.every(id => live.some(s => s.sparkId === id));

  // Context for contribution calc
  const ctx = {
    now,
    rate,
    ownedMap: producers?.owned ?? {},
    qiSparks,
  };

  if (live.length === 0) {
    return (
      <div className="st-empty">
        <div className="st-empty-mark">✦</div>
        <div className="st-empty-title">No active sparks yet</div>
        <div className="st-empty-text">
          You'll be offered a Qi Spark to pick on every layer breakthrough.
          Your active sparks will live here, with live contribution math.
        </div>
      </div>
    );
  }

  return (
    <div className="st-root">
      {isTrinityActive && (
        <div className="st-trinity-banner">
          <span className="stb-mark">✦</span>
          <span className="stb-label">Trinity Convergence</span>
          <span className="stb-bonus">+{Math.round((TRINITY_CONVERGENCE_MULT - 1) * 100)}% global qi/s</span>
          <span className="stb-mark">✦</span>
        </div>
      )}

      <Section label="Timed buffs" count={groups.timed.length}>
        {groups.timed.map(s => <SparkCard key={s.instanceId} spark={s} ctx={ctx} isTrinityActive={isTrinityActive} />)}
      </Section>

      <Section label="Legendary" count={groups.legendary.length}>
        {groups.legendary.map(s => <SparkCard key={s.instanceId} spark={s} ctx={ctx} isTrinityActive={isTrinityActive} />)}
      </Section>

      <Section label="Permanent" count={groups.uncommon.length}>
        {groups.uncommon.map(s => <SparkCard key={s.instanceId} spark={s} ctx={ctx} isTrinityActive={isTrinityActive} />)}
      </Section>

      <Section label="Mechanics" count={groups.mechanic.length}>
        {groups.mechanic.map(s => <SparkCard key={s.instanceId} spark={s} ctx={ctx} isTrinityActive={isTrinityActive} />)}
      </Section>
    </div>
  );
}
