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

// Primary-stat sprites (EssenceSprite / SoulSprite / BodySprite), the
// TriangleLines connector, the StatCircle wrapper, and the DetailPanel
// popover were removed in stage 16 of the Damage & Element Overhaul.
// Primary stats no longer exist — see obsidian/Primary Stats.md.

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
      <div className="col-section-header">
        <span className="col-section-title">{title}</span>
      </div>
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
      <span className={`secondary-stat-value${locked ? ' secondary-stat-value-locked' : ''}`}>
        {locked ? t('common.locked') : `${fmt(value)}${unit}`}
      </span>
      {tooltipStyle && breakdown && !locked && (
        <StatBreakdownTooltip breakdown={breakdown} style={tooltipStyle} />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function StatsContent({ cultivation, artefacts, pills, tree }) {
  const { t } = useTranslation('ui');
  const { qiRef, costRef, activeLaw, realmName, realmIndex } = cultivation;

  const [qi, setQi]             = useState(Math.floor(qiRef.current + costRef.current));

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
  const treeModBundle      = tree?.getStatModifiers?.()       ?? {};
  const lawModBundle       = lawBundle.statMods               ?? {};

  const mergedMods = mergeModifiers(
    artefactModBundle,
    pillModBundle,
    lawModBundle,
    treeModBundle,
  );
  const { combat, activity } = computeAllStats(qi, activeLaw, realmIndex, mergedMods);

  // ── Breakdown helpers ──────────────────────────────────────────────────────
  const SOURCE_BUNDLES = [
    { name: 'Artefacts',  bundle: artefactModBundle  },
    { name: 'Pills',      bundle: pillModBundle       },
    { name: 'Law',        bundle: lawModBundle        },
    { name: 'Tree',       bundle: treeModBundle       },
  ];

  function mkBd(statId, baseVal, baseLabel, total, unit = '') {
    const sources = SOURCE_BUNDLES.map(({ name, bundle }) => ({
      name,
      mods: bundle[statId] ?? [],
    }));
    return { base: baseLabel ? { label: baseLabel, value: baseVal } : null, sources, total, unit };
  }

  // Realm-based scaling removed 2026-04-27 — bases are flat now (health 100,
  // defense / elem_def 0). All growth comes from pills, artefacts, sets,
  // laws, and the reincarnation tree.
  const healthBase = 100;
  const defenseBase = 0;
  const elemDefBase = 0;

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
      {/* Primary-stat triangle removed in stage 15 of the overhaul. */}

      {/* ── Combat + Utility stats: stacked on mobile, side by side on PC ── */}
      <div className="secondary-stats-grid">
        <StatGroup title={t('stats.groupCombat')}>
          <StatRow
            label={t('statNames.health')}            hint="base 100 + bonuses"
            value={combat.health}
            breakdown={mkBd('health', healthBase, `Base (${fmt(healthBase)})`, combat.health)}
          />
          <StatRow
            label={t('statNames.defense')}           hint="bonus"
            value={combat.defense}
            breakdown={mkBd('defense', defenseBase, null, combat.defense)}
          />
          <StatRow
            label={t('statNames.elemental_defense')} hint="bonus"
            value={combat.elemDef}
            breakdown={mkBd('elemental_defense', elemDefBase, null, combat.elemDef)}
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
            label={t('statNames.exploit_chance')}   hint=""
            value={combat.exploitChance} unit="%"
            breakdown={mkBd('exploit_chance', 5, 'Base (5%)', combat.exploitChance, '%')}
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
            label={t('statNames.harvest_speed')}    hint=""
            value={activity.harvestSpeed}
            breakdown={mkBd('harvest_speed', 1, 'Base (1)', activity.harvestSpeed)}
          />
          <StatRow
            label={t('statNames.harvest_luck')}     hint=""
            value={activity.harvestLuck}
            breakdown={mkBd('harvest_luck', 0, null, activity.harvestLuck)}
          />
          <StatRow
            label={t('statNames.mining_speed')}     hint=""
            value={activity.miningSpeed}
            breakdown={mkBd('mining_speed', 1, 'Base (1)', activity.miningSpeed)}
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
