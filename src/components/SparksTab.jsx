import { useEffect, useState } from 'react';
import {
  QI_SPARK_BY_ID,
  SPARK_RARITY,
  SPARK_COPY,
  TRINITY_SPARK_IDS,
  TRINITY_CONVERGENCE_MULT,
} from '../data/qiSparks';
import { PRODUCERS_BY_ID } from '../data/producers';
import { fmtRate } from '../utils/format';

const BASE = import.meta.env.BASE_URL;

/**
 * SparksTab — canonical "your active sparks" view inside the Cultivation
 * screen. Replaces the modal that used to live behind the home chip; the
 * chip now ONLY surfaces TIMED buffs (time-pressure UI) and routes here
 * for the full view.
 *
 * Layout: grid of compact BLOCK cards (similar visual language to
 * UpgradeCard / .cs-up-grid). Each block shows icon + name + rarity +
 * one-line contribution; tap to open a detail panel with the full
 * effect / example / lore + live contribution math.
 *
 * Sections (top to bottom):
 *   1. Trinity Convergence banner (if all 3 beasts active)
 *   2. Timed buffs (countdown bar — time-pressure)
 *   3. Legendary (the chase tier)
 *   4. Permanent (uncommon stack buffs)
 *   5. Mechanics (Crystal Click / Divine Qi / Pattern / Consecutive Focus)
 */

/** Sprite-or-emoji icon. */
function Icon({ icon, fallback = '✦', className = 'st-icon-img' }) {
  const ic = icon ?? fallback;
  if (typeof ic === 'string' && ic.startsWith('/')) {
    return <img className={className} src={`${BASE}${ic.replace(/^\//, '')}`} alt="" draggable={false} />;
  }
  return <span className={className.replace('-img', '-emoji')} aria-hidden="true">{ic}</span>;
}

/**
 * Resolve the display icon for a spark id. Priority:
 *   1. SPARK_COPY[id].icon — explicit override (producer sprite for
 *      legendaries, themed emoji for common/uncommon)
 *   2. mechanic-tier cards reuse the same medallion icon the upgrades
 *      shop already shows (ui/upgrade_<mechanicId>.png — Crystal
 *      Reservoir, Divine Qi, etc.)
 *   3. fallback to ✦
 */
function iconFor(sparkId) {
  const copy = SPARK_COPY[sparkId];
  if (copy?.icon) return copy.icon;
  const card = QI_SPARK_BY_ID[sparkId];
  if (card?.kind === 'mechanic' && card.mechanicId) {
    return `/ui/upgrade_${card.mechanicId}.png`;
  }
  return '✦';
}

/** Tiny markdown-ish bold parser for **strong** → <strong>. */
function renderRich(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

/**
 * Compute a one-line "Currently: …" string describing the live contribution
 * of a spark. Returns null if there's nothing meaningful to show.
 */
function describeContribution(spark, card, ctx) {
  const eff = card?.effect;
  if (!eff) return null;
  const { ownedMap, rate } = ctx;
  const stacks = spark.stacks ?? 1;
  const pname = (pid) => PRODUCERS_BY_ID[pid]?.name ?? pid;

  switch (eff.type) {
    // ── Timed / event-count common buffs ────────────────────────────
    case 'qi_mult': {
      const bonus = eff.value;
      const extra = rate * bonus;
      return `+${Math.round(bonus * 100)}% qi/s → ≈ ${fmtRate(extra)} qi/s extra`;
    }
    case 'focus_mult_bonus':
      return `+${Math.round(eff.value * 100)}% Focus multiplier (active while holding Focus)`;
    // ── Permanent stacked uncommons ─────────────────────────────────
    case 'qi_flat_per_stack':
      return `+${eff.value * stacks} base qi/s${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    case 'qi_mult_per_stack':
      return `+${Math.round(eff.value * stacks * 100)}% qi/s${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    case 'focus_mult_bonus_per_stack':
      return `+${Math.round(eff.value * stacks * 100)}% Focus multiplier${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    case 'gate_reduction_per_stack':
      return `−${Math.round(eff.value * stacks * 100)}% major-realm gate cost${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    case 'offline_qi_mult_per_stack':
      return `+${Math.round(eff.value * stacks * 100)}% offline qi accrual${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    case 'qi_mult_per_breakthrough_per_stack': {
      const accrued = spark.breakthroughsAccrued ?? 0;
      const totalPct = Math.round(eff.value * stacks * accrued * 100);
      return `+${totalPct}% qi/s (${stacks}× × ${accrued} breakthroughs)`;
    }
    // ── Legendary producer-synergy ──────────────────────────────────
    case 'producer_self_mult':
      return `${pname(eff.target)} producing ×${eff.mult}`;
    case 'producer_count_mult': {
      const src = ownedMap[eff.source] ?? 0;
      const mult = 1 + src * eff.perEach;
      return `${src} × ${pname(eff.source)} → ${pname(eff.target)} ×${mult.toFixed(2)}`;
    }
    case 'producer_count_threshold_mult': {
      const src = ownedMap[eff.source] ?? 0;
      return src >= eff.threshold
        ? `Active → ${pname(eff.target)} ×${eff.mult}`
        : `Dormant — need ${eff.threshold} × ${pname(eff.source)} (you have ${src})`;
    }
    case 'producer_pair_synergy': {
      const a = ownedMap[eff.producerA] ?? 0;
      const b = ownedMap[eff.producerB] ?? 0;
      const pairs = Math.min(a, b);
      const mult = 1 + pairs * (eff.mult - 1);
      return pairs > 0
        ? `${pairs} pair${pairs > 1 ? 's' : ''} → both ×${mult.toFixed(2)}`
        : `No pairs (need ≥1 of each)`;
    }
    case 'producer_pair_global_mult': {
      const a = ownedMap[eff.producerA] ?? 0;
      const b = ownedMap[eff.producerB] ?? 0;
      const pairs = Math.min(a, b);
      const totalPct = Math.round(pairs * (eff.mult - 1) * 100);
      return pairs > 0
        ? `${pairs} pair${pairs > 1 ? 's' : ''} → +${totalPct}% global qi/s`
        : `No pairs (need ≥1 of each)`;
    }
    case 'phoenix_reborn': {
      const phStacks = spark.phoenixRebornStacks ?? 0;
      return phStacks > 0
        ? `${phStacks} rebirth${phStacks > 1 ? 's' : ''} → others ×${Math.pow(2, phStacks)}`
        : `Waiting on next major realm`;
    }
    default:
      return null;
  }
}

// ── Compact block (grid item) ─────────────────────────────────────────────

function SparkBlock({ spark, ctx, isTrinityActive, onOpen }) {
  const card = QI_SPARK_BY_ID[spark.sparkId];
  if (!card) return null;
  const rarity = SPARK_RARITY[card.rarity] ?? SPARK_RARITY.common;
  const icon   = iconFor(spark.sparkId);
  const isTrinityPiece = card.trinityPiece === true;

  // Timer for timed sparks
  const now = ctx.now;
  const isTimed     = !!spark.expiresAt;
  const remainingMs = isTimed ? Math.max(0, spark.expiresAt - now) : null;
  const totalMs     = card.duration ?? 1;
  const progress    = isTimed ? Math.max(0, Math.min(1, remainingMs / totalMs)) : null;
  const secsLeft    = isTimed ? Math.max(0, Math.ceil(remainingMs / 1000)) : null;

  const contribution = describeContribution(spark, card, ctx);

  // Show stack count badge on stacked permanents (>1)
  const stacks = spark.stacks ?? 1;
  const showStackBadge = card.kind === 'permanent' && stacks > 1;

  return (
    <button
      type="button"
      className={`st-block st-block-${card.rarity}${isTrinityPiece ? ' st-block-trinity-piece' : ''}${isTrinityPiece && isTrinityActive ? ' st-block-trinity-active' : ''}`}
      style={{ '--rarity-color': rarity.color }}
      onClick={() => onOpen(spark)}
      aria-label={`${card.name} — tap for details`}
    >
      <div className="st-block-icon-wrap">
        <Icon icon={icon} className="st-block-icon-img" />
        {isTrinityPiece && <span className="st-block-trinity-badge">✦</span>}
        {showStackBadge && <span className="st-block-stack-badge">×{stacks}</span>}
      </div>
      <div className="st-block-name">{card.name}</div>
      <div className={`st-block-rarity-tag st-rt-${card.rarity}`}>{rarity.label}</div>
      {contribution && <div className="st-block-line">{contribution}</div>}
      {isTimed && (
        <div className="st-block-timer">
          <div className="st-block-timer-bar">
            <div className="st-block-timer-fill" style={{ '--p': progress }} />
          </div>
          <span className="st-block-timer-text">{secsLeft}s</span>
        </div>
      )}
    </button>
  );
}

// ── Detail panel (opens on block tap) ─────────────────────────────────────

function SparkDetailPanel({ spark, ctx, isTrinityActive, onClose }) {
  const card = QI_SPARK_BY_ID[spark?.sparkId];
  if (!card) return null;
  const rarity = SPARK_RARITY[card.rarity] ?? SPARK_RARITY.common;
  const copy   = SPARK_COPY[spark.sparkId];
  const icon   = iconFor(spark.sparkId);
  const effectText  = copy?.effectText  ?? card.description ?? '';
  const exampleHtml = copy?.exampleText ?? null;
  const loreHtml    = copy?.loreText    ?? null;
  const contribution = describeContribution(spark, card, ctx);

  // Timer for timed sparks (live)
  const now = ctx.now;
  const isTimed     = !!spark.expiresAt;
  const remainingMs = isTimed ? Math.max(0, spark.expiresAt - now) : null;
  const totalMs     = card.duration ?? 1;
  const progress    = isTimed ? Math.max(0, Math.min(1, remainingMs / totalMs)) : null;
  const secsLeft    = isTimed ? Math.max(0, Math.ceil(remainingMs / 1000)) : null;

  return (
    <div
      className="st-detail-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`st-detail-panel st-detail-r-${card.rarity}`} style={{ '--rarity-color': rarity.color }}>
        <button type="button" className="st-detail-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="st-detail-hero">
          <Icon icon={icon} className="st-detail-hero-img" />
          <div className={`st-detail-rarity-banner st-rt-${card.rarity}`}>{rarity.label}</div>
        </div>
        <div className="st-detail-body">
          <div className="st-detail-name">{card.name}</div>
          {isTimed && (
            <div className="st-detail-timer">
              <div className="st-detail-timer-bar">
                <div className="st-detail-timer-fill" style={{ '--p': progress }} />
              </div>
              <span className="st-detail-timer-text">{secsLeft}s remaining</span>
            </div>
          )}
          <div className="st-detail-section">
            <div className="st-detail-section-label">Effect</div>
            <div className="st-detail-effect-text">{renderRich(effectText)}</div>
          </div>
          {contribution && (
            <div className="st-detail-section">
              <div className="st-detail-section-label">Currently</div>
              <div className="st-detail-contribution"><strong>{contribution}</strong></div>
            </div>
          )}
          {exampleHtml && (
            <div className="st-detail-section">
              <div className="st-detail-section-label">Example</div>
              <div className="st-detail-example" dangerouslySetInnerHTML={{ __html: exampleHtml }} />
            </div>
          )}
          {loreHtml && (
            <div className="st-detail-section">
              <div className="st-detail-section-label">Lore</div>
              <div className="st-detail-lore">{loreHtml}</div>
            </div>
          )}
          {isTrinityActive && card.trinityPiece && (
            <div className="st-detail-trinity-note">
              ✦ Trinity Convergence active — +{Math.round((TRINITY_CONVERGENCE_MULT - 1) * 100)}% global qi/s
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ label, count, tone, sublabel, children }) {
  if (!count) return null;
  return (
    <section className={`st-section st-section-${tone}`}>
      <header className="st-section-header">
        <span className="st-section-label">{label}</span>
        {sublabel && <span className="st-section-sublabel">{sublabel}</span>}
        <span className="st-section-count">{count}</span>
      </header>
      <div className="st-grid">{children}</div>
    </section>
  );
}

// ── Tab root ───────────────────────────────────────────────────────────────

export default function SparksTab({ qiSparks, producers, cultivation }) {
  const [now, setNow] = useState(Date.now());
  const [rate, setRate] = useState(() => cultivation?.rateRef?.current ?? 0);
  const [openSpark, setOpenSpark] = useState(null);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setRate(cultivation?.rateRef?.current ?? 0);
    }, 250);
    return () => clearInterval(id);
  }, [cultivation?.rateRef]);

  // Close detail panel on Escape
  useEffect(() => {
    if (!openSpark) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpenSpark(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSpark]);

  const activeSparks = qiSparks?.activeSparks ?? [];
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
  groups.timed.sort((a, b) => a.expiresAt - b.expiresAt);
  groups.legendary.sort((a, b) => {
    const ai = TRINITY_SPARK_IDS.indexOf(a.sparkId);
    const bi = TRINITY_SPARK_IDS.indexOf(b.sparkId);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return 0;
  });

  const isTrinityActive = TRINITY_SPARK_IDS.every(id => live.some(s => s.sparkId === id));
  const ctx = { now, rate, ownedMap: producers?.owned ?? {}, qiSparks };

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

  // Currently-open spark — re-resolve from `live` so timer/contribution
  // stay synced as the parent re-renders.
  const openSparkLive = openSpark
    ? live.find(s => s.instanceId === openSpark.instanceId) ?? null
    : null;

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

      <Section
        label="Active buffs"
        sublabel="time-limited"
        count={groups.timed.length}
        tone="timed"
      >
        {groups.timed.map(s => (
          <SparkBlock key={s.instanceId} spark={s} ctx={ctx} isTrinityActive={isTrinityActive} onOpen={setOpenSpark} />
        ))}
      </Section>

      <Section
        label="Legendary"
        sublabel="producer synergies"
        count={groups.legendary.length}
        tone="legendary"
      >
        {groups.legendary.map(s => (
          <SparkBlock key={s.instanceId} spark={s} ctx={ctx} isTrinityActive={isTrinityActive} onOpen={setOpenSpark} />
        ))}
      </Section>

      <Section
        label="Permanent"
        sublabel="lasts this run"
        count={groups.uncommon.length}
        tone="uncommon"
      >
        {groups.uncommon.map(s => (
          <SparkBlock key={s.instanceId} spark={s} ctx={ctx} isTrinityActive={isTrinityActive} onOpen={setOpenSpark} />
        ))}
      </Section>

      <Section
        label="Mechanics"
        sublabel="from crystal evolution"
        count={groups.mechanic.length}
        tone="mechanic"
      >
        {groups.mechanic.map(s => (
          <SparkBlock key={s.instanceId} spark={s} ctx={ctx} isTrinityActive={isTrinityActive} onOpen={setOpenSpark} />
        ))}
      </Section>

      {openSparkLive && (
        <SparkDetailPanel
          spark={openSparkLive}
          ctx={ctx}
          isTrinityActive={isTrinityActive}
          onClose={() => setOpenSpark(null)}
        />
      )}
    </div>
  );
}
