import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TYPE_COLOR } from '../data/techniques';

const BASE = import.meta.env.BASE_URL;

const TECH_GLYPH = {
  Attack: '⚔',
  Heal:   '✦',
  Defend: '⬡',
  Dodge:  '↯',
};
import ENEMIES, { pickEnemy } from '../data/enemies';
import CombatStage from '../components/CombatStage';

const AUTO_RESTART_MS = 1500;

const LOG_COLOR = {
  damage:         'var(--accent)',
  'damage-taken': '#f97316',
  heal:           '#4ade80',
  buff:           '#60a5fa',
  dodge:          '#facc15',
  technique:      '#c084fc',
  system:         'var(--text-muted)',
};

function CombatScreen({ cultivation, techniques, combat, inventory, region = null, onBack = null, getFullStats, onRegionCleared = null }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  const { phase, enemy, log, startFight } = combat;
  const { equippedTechniques } = techniques;

  // Tracks the enemy def currently shown in the stage (updates on each fight start).
  const [stageEnemy, setStageEnemy] = useState(null);

  // Always-fresh ref so the auto-restart timer never captures stale closures.
  const doStartRef = useRef(null);
  doStartRef.current = () => {
    const law = cultivation.activeLaw;
    const forcedId = combat.debugRef?.current?.nextEnemy;
    const enemyDef = forcedId
      ? (ENEMIES[forcedId] ?? (region?.enemyPool ? pickEnemy(region.enemyPool) : null))
      : (region?.enemyPool ? pickEnemy(region.enemyPool) : null);
    setStageEnemy(enemyDef);
    // Enemy HP is anchored to the region's minRealmIndex on a smooth curve
    // (see useCombat's hpBase formula) — zone 1 enemies always have low HP,
    // zone 6 enemies always have high HP regardless of who is fighting them.
    const regionIndex = region?.minRealmIndex ?? 0;

    // Pull the full stat bundle if the caller provided one (so artefact /
    // pill / law modifiers contribute to exploit_chance + exploit_attack_mult).
    // Falls back to the simple law-derived stats if getFullStats is missing.
    const full = getFullStats?.();
    const playerStats = full
      ? {
          essence:       full.essence,
          soul:          full.soul,
          body:          full.body,
          lawElement:    full.lawElement,
          // Full law + category damage stats are required for the basic
          // attack's typeMults and for calcDamage's category split.
          law:           full.law,
          damageStats:   full.damageStats,
          exploitChance: full.exploitChance,
          exploitMult:   full.exploitMult,
          buffDurationMult: full.buffDurationMult,
        }
      : {
          // Stats decoupled from Qi — fallback uses zero baseline.
          essence:    0,
          soul:       0,
          body:       0,
          lawElement: law?.element ?? 'Normal',
          law,
        };

    startFight(
      playerStats,
      equippedTechniques,
      enemyDef,
      inventory   ? (drops) => drops.forEach(d => inventory.addItem(d.itemId, d.qty)) : null,
      techniques  ? (tech)  => techniques.addOwnedTechnique(tech) : null,
      region?.worldId ?? 1,
      regionIndex,
    );
  };

  // Auto-start the first fight when the screen mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { doStartRef.current(); }, []);

  // Auto-restart after a short delay whenever a fight ends.
  useEffect(() => {
    if (phase !== 'won' && phase !== 'lost') return;
    if (phase === 'won' && region?.name) onRegionCleared?.(region.name);
    const t = setTimeout(() => doStartRef.current(), AUTO_RESTART_MS);
    return () => clearTimeout(t);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const isFighting = phase === 'fighting';

  const subtitle = region
    ? tGame(`regions.${region.name}.name`, { defaultValue: region.name })
    : cultivation.realmName;

  return (
    <div className="screen combat-screen">
      {onBack && (
        <button className="back-btn" onClick={onBack}>{t('common.back')}</button>
      )}
      <h1>{t('combat.title')}</h1>
      <p className="subtitle">{subtitle}</p>

      {/* ── Fighter stage ───────────────────────────────────────────────── */}
      <CombatStage
        phase={phase}
        enemy={stageEnemy}
        worldId={region?.worldId ?? 1}
        playerAttackRef={combat.playerAttackRef}
        enemyAttackRef={combat.enemyAttackRef}
        playerAnimDoneRef={combat.playerAnimDoneRef}
        enemyAnimDoneRef={combat.enemyAnimDoneRef}
        spawnDamageNumberRef={combat.spawnDamageNumberRef}
        pHpBarRef={combat.pHpBarRef}
        pHpTextRef={combat.pHpTextRef}
        eHpBarRef={combat.eHpBarRef}
        eHpTextRef={combat.eHpTextRef}
      />


      {/* ── Technique icons ──────────────────────────────────────────────── */}
      <div className="tech-icon-grid">
        {equippedTechniques.filter(Boolean).map((tech, i) => {
          const color = TYPE_COLOR[tech.type];
          const techName = tGame(`techniques.${tech.id}.name`, { defaultValue: tech.name });
          return (
            <div
              key={i}
              className="tech-icon-slot"
            >
              <div
                className="tech-icon-top"
                style={{ background: tech ? `${color}28` : undefined }}
              >
                <img
                  src={`${BASE}sprites/techniques/${tech?.type?.toLowerCase() ?? 'empty'}.png`}
                  className="tech-icon-img"
                  alt=""
                />
                <span className="tech-icon-glyph" style={{ color }}>
                  {TECH_GLYPH[tech?.type] ?? '—'}
                </span>
                <div
                  className="tech-icon-clock"
                  ref={el => { combat.cdBarRefs.current[i] = el; }}
                />
              </div>
              <span className="tech-icon-name" style={{ color }}>
                {techName}
              </span>
              <img className="tech-icon-frame" src={`${BASE}ui/card_frame.png`} alt="" />
            </div>
          );
        })}
      </div>


      {/* ── Combat log ───────────────────────────────────────────────────── */}
      {log.length > 0 && (
        <div className="combat-log">
          {log.map((entry, i) => (
            <p key={i} style={{ color: LOG_COLOR[entry.kind] ?? 'var(--text-secondary)' }}>
              {entry.msg}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default CombatScreen;
