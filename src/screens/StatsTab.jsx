// @refresh reset
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { computeAllStats, mergeModifiers } from '../data/stats';
import { evaluateLawUniques, buildContext } from '../systems/lawEngine';

function fmt(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

// ─── SVG Sprites ─────────────────────────────────────────────────────────────

function EssenceSprite({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <polygon points="22,3 38,12 38,32 22,41 6,32 6,12" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.8" />
      <line x1="22" y1="3"  x2="22" y2="41" stroke="#7dd3fc" strokeWidth="0.8" opacity="0.45" />
      <line x1="6"  y1="22" x2="38" y2="22" stroke="#7dd3fc" strokeWidth="0.8" opacity="0.45" />
      <line x1="6"  y1="12" x2="38" y2="32" stroke="#7dd3fc" strokeWidth="0.6" opacity="0.3" />
      <line x1="38" y1="12" x2="6"  y2="32" stroke="#7dd3fc" strokeWidth="0.6" opacity="0.3" />
      <polygon points="22,13 30,22 22,31 14,22" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="1" />
      <circle cx="22" cy="22" r="3.5" fill="#e0f2fe" />
      <circle cx="22" cy="22" r="1.5" fill="#fff" />
    </svg>
  );
}

function SoulSprite({ size = 44, locked = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" opacity={locked ? 0.3 : 1}>
      <circle cx="22" cy="22" r="19" stroke="#7c3aed" strokeWidth="1.2" strokeDasharray="3 2.5" fill="#1e1b4b" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx="22" cy="10" rx="3.5" ry="6.5"
          fill="#4c1d95" stroke="#a855f7" strokeWidth="0.9"
          transform={`rotate(${deg} 22 22)`}
        />
      ))}
      <circle cx="22" cy="22" r="6.5" fill="#6d28d9" stroke="#ddd6fe" strokeWidth="1.2" />
      <circle cx="22" cy="22" r="2.5" fill="#f5f3ff" />
      <circle cx="20.5" cy="20.5" r="1" fill="#fff" opacity="0.7" />
    </svg>
  );
}

function BodySprite({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <polygon points="22,4 41,41 3,41" fill="#431407" stroke="#f97316" strokeWidth="1.8" />
      <polygon points="22,14 32,33 12,33" fill="#7c2d12" stroke="#fb923c" strokeWidth="0.9" />
      <polygon points="22,4 27.5,17 16.5,17" fill="#fed7aa" opacity="0.85" />
      <line x1="22" y1="4" x2="22" y2="11" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
      <line x1="3" y1="41" x2="41" y2="41" stroke="#f97316" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

// ─── Triangle connector ───────────────────────────────────────────────────────
const STAT_COLORS = { soul: '#a855f7', essence: '#38bdf8', body: '#f97316' };
const TRANSITION  = { transition: 'stroke 0.25s, stroke-width 0.25s' };

function TriangleLines({ activeStat }) {
  const lineProps = (a, b) => {
    const lit = activeStat === a || activeStat === b;
    return {
      stroke: lit ? (STAT_COLORS[activeStat] ?? '#2a2a4a') : '#2a2a4a',
      strokeWidth: lit ? 1.8 : 1.2,
      strokeDasharray: '6 4',
      style: TRANSITION,
    };
  };
  return (
    <svg className="stat-triangle-lines" viewBox="0 0 280 230" preserveAspectRatio="xMidYMid meet">
      <line x1="140" y1="44"  x2="44"  y2="186" {...lineProps('soul', 'essence')} />
      <line x1="140" y1="44"  x2="236" y2="186" {...lineProps('soul', 'body')} />
      <line x1="44"  y1="186" x2="236" y2="186" {...lineProps('essence', 'body')} />
    </svg>
  );
}

// ─── Single stat circle ───────────────────────────────────────────────────────
function StatCircle({ label, value, locked, glowColor, active, onEnter, onLeave, onClick, children }) {
  return (
    <div
      className={`stat-circle${active ? ' stat-circle-active' : ''}${locked ? ' stat-circle-locked' : ''}`}
      style={{ '--glow': glowColor }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {children}
      <span className="stat-circle-name">{label}</span>
      <span className="stat-circle-val" style={{ color: locked ? 'var(--text-muted)' : glowColor }}>
        {locked ? '???' : fmt(value)}
      </span>
    </div>
  );
}

// ─── Detail panel (hover / tap) ───────────────────────────────────────────────
function DetailPanel({ stat, value, realmIndex }) {
  const { t } = useTranslation('ui');

  const SAINT_INDEX = 24;
  const locked = stat === 'soul' && realmIndex < SAINT_INDEX;

  const configs = {
    essence: {
      title:    t('stats.essenceLabel'),
      subtitle: t('stats.essenceSubtitle'),
      color:    '#38bdf8',
      effects: [
        t('stats.essenceEffects.elemental'),
      ],
    },
    soul: {
      title:    t('stats.soulLabel'),
      subtitle: t('stats.soulSubtitle'),
      color:    '#c084fc',
      effects: [
        t('stats.soulEffects.psychic'),
        t('stats.soulEffects.techniques'),
        t('stats.soulEffects.harvest'),
      ],
      lockMsg: t('stats.soulEffects.unlock'),
    },
    body: {
      title:    t('stats.bodyLabel'),
      subtitle: t('stats.bodySubtitle'),
      color:    '#f97316',
      effects: [
        t('stats.bodyEffects.physical'),
        t('stats.bodyEffects.defense'),
        t('stats.bodyEffects.mining'),
      ],
    },
  };

  const cfg = configs[stat];

  return (
    <div className="stat-detail-panel" style={{ '--panel-color': cfg.color }}>
      <div className="sdp-header">
        <span className="sdp-title" style={{ color: cfg.color }}>{cfg.title}</span>
        <span className="sdp-subtitle">{cfg.subtitle}</span>
      </div>
      <div className="sdp-divider" />
      {locked ? (
        <p className="sdp-locked">{cfg.lockMsg}</p>
      ) : (
        <>
          <div className="sdp-formula">
            <code className="sdp-code sdp-calc">
              <strong style={{ color: cfg.color }}>{fmt(value)}</strong>
            </code>
            <span className="sdp-source">{t('stats.fromModifiers', { defaultValue: 'From modifiers' })}</span>
          </div>
          <div className="sdp-divider" />
          <ul className="sdp-effects">
            {cfg.effects.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}

// ─── Stat breakdown tooltip ───────────────────────────────────────────────────

function summarizeMods(mods) {
  let flat = 0, baseFlat = 0, incrBase = 0, incr = 0, more = 1;
  let hasMore = false;
  for (const m of mods) {
    switch (m.type) {
      case 'flat':           flat     += m.value; break;
      case 'base_flat':      baseFlat += m.value; break;
      case 'increased_base': incrBase += m.value; break;
      case 'increased':      incr     += m.value; break;
      case 'more':           more     *= m.value; hasMore = true; break;
    }
  }
  const parts = [];
  const sign  = (v) => (v >= 0 ? '+' : '');
  if (flat !== 0)     parts.push(`${sign(flat)}${fmt(Math.round(flat))}`);
  if (baseFlat !== 0) parts.push(`${sign(baseFlat)}${fmt(Math.round(baseFlat))} (base)`);
  if (incrBase !== 0) parts.push(`${sign(incrBase)}${(incrBase * 100).toFixed(0)}% of base`);
  if (incr !== 0)     parts.push(`${sign(incr)}${(incr * 100).toFixed(0)}%`);
  if (hasMore)        parts.push(`×${more.toFixed(2)}`);
  return parts.join('  ·  ');
}

function StatBreakdownTooltip({ breakdown, style }) {
  const { base, sources, total, unit = '' } = breakdown;
  const activeSources = (sources ?? []).filter(s => s.mods?.length > 0);
  if (!base && activeSources.length === 0) return null;

  return createPortal(
    <div className="stat-breakdown-tooltip" style={style}>
      {base && (
        <div className="sbt-row sbt-base">
          <span className="sbt-src">{base.label}</span>
          <span className="sbt-val">{fmt(Math.round(base.value))}</span>
        </div>
      )}
      {activeSources.map(src => {
        const text = summarizeMods(src.mods);
        if (!text) return null;
        return (
          <div key={src.name} className="sbt-row">
            <span className="sbt-src">{src.name}</span>
            <span className="sbt-val sbt-bonus">{text}</span>
          </div>
        );
      })}
      <div className="sbt-divider" />
      <div className="sbt-row sbt-total">
        <span className="sbt-src">Total</span>
        <span className="sbt-val">{fmt(total)}{unit}</span>
      </div>
    </div>,
    document.body
  );
}

// ─── Stat table helpers ───────────────────────────────────────────────────────
function StatGroup({ title, children }) {
  return (
    <div className="secondary-stats">
      <p className="secondary-stats-title">{title}</p>
      {children}
    </div>
  );
}

function StatRow({ label, hint, value, unit = '', locked = false, breakdown = null }) {
  const { t } = useTranslation('ui');
  const [tooltipStyle, setTooltipStyle] = useState(null);

  function handleEnter(e) {
    if (!breakdown || locked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.right + 8, window.innerWidth - 260);
    const y = rect.top - 4;
    setTooltipStyle({ position: 'fixed', left: x, top: y });
  }

  return (
    <div
      className={`secondary-stat-row${breakdown && !locked ? ' secondary-stat-row-interactive' : ''}`}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setTooltipStyle(null)}
    >
      <span className="secondary-stat-label">{label}</span>
      {hint && <span className="secondary-stat-formula">{hint}</span>}
      <span
        className="secondary-stat-value"
        style={locked ? { color: 'var(--text-muted)', fontWeight: 400 } : undefined}
      >
        {locked ? t('common.locked') : `${fmt(value)}${unit}`}
      </span>
      {tooltipStyle && breakdown && !locked && (
        <StatBreakdownTooltip breakdown={breakdown} style={tooltipStyle} />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function StatsContent({ cultivation, artefacts, pills, selections, tree }) {
  const { t } = useTranslation('ui');
  const { qiRef, costRef, activeLaw, realmName, realmIndex } = cultivation;

  const [qi, setQi]             = useState(Math.floor(qiRef.current + costRef.current));
  const [activeStat, setActive] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setQi(Math.floor(qiRef.current + costRef.current)), 250);
    return () => clearInterval(id);
  }, [qiRef, costRef]);

  const lawCtx = buildContext({
    inCombat: false, realmIndex, lawElement: activeLaw?.element,
    isAtPeak: realmIndex >= 46,
    equippedArtefactCount: artefacts?.owned.filter(o => Object.values(artefacts.equipped ?? {}).includes(o.uid)).length ?? 0,
  });
  const lawBundle = evaluateLawUniques(activeLaw, lawCtx);

  // Per-source modifier bundles — kept separate so breakdown tooltips can
  // attribute each contribution to its origin system.
  const artefactModBundle  = artefacts?.getStatModifiers?.()  ?? {};
  const pillModBundle      = pills?.getStatModifiers?.()      ?? {};
  const selectionModBundle = selections?.getStatModifiers?.() ?? {};
  const treeModBundle      = tree?.getStatModifiers?.()       ?? {};
  const lawModBundle       = lawBundle.statMods               ?? {};

  const mergedMods = mergeModifiers(
    artefactModBundle,
    pillModBundle,
    lawModBundle,
    selectionModBundle,
    treeModBundle,
  );
  const { meta, primary, combat, activity } = computeAllStats(qi, activeLaw, realmIndex, mergedMods);
  const { soulUnlocked } = meta;

  const toggle = (stat) => setActive((s) => (s === stat ? null : stat));
  const enter  = (stat) => setActive(stat);
  const leave  = ()     => setActive(null);

  // ── Breakdown helpers ──────────────────────────────────────────────────────
  const SOURCE_BUNDLES = [
    { name: 'Artefacts',  bundle: artefactModBundle  },
    { name: 'Pills',      bundle: pillModBundle       },
    { name: 'Law',        bundle: lawModBundle        },
    { name: 'Selections', bundle: selectionModBundle  },
    { name: 'Tree',       bundle: treeModBundle       },
  ];

  function mkBd(statId, baseVal, baseLabel, total, unit = '') {
    const isPrimary = statId === 'essence' || statId === 'body' || statId === 'soul';
    const sources = SOURCE_BUNDLES.map(({ name, bundle }) => ({
      name,
      mods: isPrimary
        ? [...(bundle[statId] ?? []), ...(bundle.all_primary_stats ?? [])]
        : (bundle[statId] ?? []),
    }));
    return { base: baseLabel ? { label: baseLabel, value: baseVal } : null, sources, total, unit };
  }

  const healthBase = (primary.essence + primary.body) * 12 + primary.soul * 4;

  const qiSpeedBreakdown = {
    base: { label: 'Base', value: 1 },
    sources: (activeLaw?.cultivationSpeedMult ?? 1) !== 1
      ? [{ name: 'Law', mods: [{ type: 'more', value: activeLaw.cultivationSpeedMult }] }]
      : [],
    total: activity.qiSpeed,
    unit: '/s',
  };

  return (
    <div className="stats-content">
      {/* ── Primary Stats: triangle centered, description as popover ── */}
      <div className="stats-primary-row">
        <div className="stat-triangle-container">
          <TriangleLines activeStat={activeStat} />

          <div
            className="stat-circle-wrap stat-wrap-soul"
            onMouseEnter={() => enter('soul')}
            onMouseLeave={leave}
            onClick={() => toggle('soul')}
          >
            <StatCircle label={t('stats.soulLabel')} value={primary.soul} locked={!soulUnlocked} glowColor="#c084fc" active={activeStat === 'soul'}>
              <SoulSprite size={40} locked={!soulUnlocked} />
            </StatCircle>
          </div>

          <div
            className="stat-circle-wrap stat-wrap-essence"
            onMouseEnter={() => enter('essence')}
            onMouseLeave={leave}
            onClick={() => toggle('essence')}
          >
            <StatCircle label={t('stats.essenceLabel')} value={primary.essence} locked={false} glowColor="#38bdf8" active={activeStat === 'essence'}>
              <EssenceSprite size={40} />
            </StatCircle>
          </div>

          <div
            className="stat-circle-wrap stat-wrap-body"
            onMouseEnter={() => enter('body')}
            onMouseLeave={leave}
            onClick={() => toggle('body')}
          >
            <StatCircle label={t('stats.bodyLabel')} value={primary.body} locked={false} glowColor="#f97316" active={activeStat === 'body'}>
              <BodySprite size={40} />
            </StatCircle>
          </div>
        </div>

        {/* Detail popover — CSS positions this as a right-side panel on
            narrow screens and as an absolute overlay next to the triangle
            on PC (see .stat-detail-side in App.css). */}
        <div className="stat-detail-side">
          {activeStat ? (
            <DetailPanel stat={activeStat} value={primary[activeStat] ?? 0} realmIndex={realmIndex} />
          ) : (
            <div className="sdp-placeholder">
              <span>{t('stats.tapForDetails')}</span>
              <span>{t('stats.forDetails')}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Combat + Utility stats: stacked on mobile, side by side on PC ── */}
      <div className="secondary-stats-grid">
        <StatGroup title={t('stats.groupCombat')}>
          <StatRow
            label={t('statNames.health')}            hint="(Essence + Body) × 12"
            value={combat.health}
            breakdown={mkBd('health', healthBase, `Primary stats (${fmt(healthBase)})`, combat.health)}
          />
          <StatRow
            label={t('statNames.defense')}           hint="from Body"
            value={combat.defense}
            breakdown={mkBd('defense', primary.body, `Body (${primary.body})`, combat.defense)}
          />
          <StatRow
            label={t('statNames.elemental_defense')} hint="from Essence"
            value={combat.elemDef}
            breakdown={mkBd('elemental_defense', primary.essence, `Essence (${primary.essence})`, combat.elemDef)}
          />
          <StatRow
            label={t('statNames.soul_toughness')}   hint="from Soul"
            value={combat.soulTough}    locked={!soulUnlocked}
            breakdown={mkBd('soul_toughness', primary.soul, `Soul (${primary.soul})`, combat.soulTough)}
          />
          <StatRow
            label={t('statNames.physical_damage')}  hint="bonus"
            value={combat.physDmg}
            breakdown={mkBd('physical_damage', 0, null, combat.physDmg)}
          />
          <StatRow
            label={t('statNames.elemental_damage')} hint="bonus"
            value={combat.elemDmg}
            breakdown={mkBd('elemental_damage', 0, null, combat.elemDmg)}
          />
          <StatRow
            label={t('statNames.psychic_damage')}   hint="bonus"
            value={combat.psychDmg}     locked={!soulUnlocked}
            breakdown={mkBd('psychic_damage', 0, null, combat.psychDmg)}
          />
          <StatRow
            label={t('statNames.exploit_chance')}   hint=""
            value={combat.exploitChance} unit="%"
            breakdown={mkBd('exploit_chance', 0, null, combat.exploitChance, '%')}
          />
          <StatRow
            label={t('statNames.exploit_mult')}     hint=""
            value={combat.exploitMult}   unit="%"
            breakdown={mkBd('exploit_attack_mult', 150, 'Base (150%)', combat.exploitMult, '%')}
          />
        </StatGroup>

        <StatGroup title={t('stats.groupUtility')}>
          <StatRow
            label={t('statNames.qi_speed')}         hint="base × law mult"
            value={activity.qiSpeed}      unit="/s"
            breakdown={qiSpeedBreakdown}
          />
          <StatRow
            label={t('statNames.focus_mult')}       hint="while boosting"
            value={activity.focusMult}    unit="%"
            breakdown={mkBd('qi_focus_mult', 300, 'Base (300%)', activity.focusMult, '%')}
          />
          <StatRow
            label={t('statNames.harvest_speed')}    hint="from Soul"
            value={activity.harvestSpeed} locked={!soulUnlocked}
            breakdown={mkBd('harvest_speed', Math.floor(primary.soul * 0.1), `Soul/10 (${Math.floor(primary.soul * 0.1)})`, activity.harvestSpeed)}
          />
          <StatRow
            label={t('statNames.harvest_luck')}     hint=""
            value={activity.harvestLuck}
            breakdown={mkBd('harvest_luck', 0, null, activity.harvestLuck)}
          />
          <StatRow
            label={t('statNames.mining_speed')}     hint="from Body"
            value={activity.miningSpeed}
            breakdown={mkBd('mining_speed', Math.floor(primary.body * 0.1), `Body/10 (${Math.floor(primary.body * 0.1)})`, activity.miningSpeed)}
          />
          <StatRow
            label={t('statNames.mining_luck')}      hint=""
            value={activity.miningLuck}
            breakdown={mkBd('mining_luck', 0, null, activity.miningLuck)}
          />
        </StatGroup>
      </div>
    </div>
  );
}

export default StatsContent;
