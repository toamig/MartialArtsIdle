import { useEffect, useRef, useState } from 'react';
import { TYPE_COLOR } from '../data/techniques';

const BASE = import.meta.env.BASE_URL;

const TECH_GLYPH = {
  Attack: '⚔',
  Heal:   '✦',
  Defend: '⬡',
  Dodge:  '↯',
};
import ENEMIES, { pickEnemy } from '../data/enemies';
import REALMS from '../data/realms';
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

function CombatScreen({ cultivation, techniques, combat, inventory, region = null, onBack = null }) {
  const { phase, enemy, log, startFight } = combat;
  const { equippedTechniques } = techniques;

  // Tracks the enemy def currently shown in the stage (updates on each fight start).
  const [stageEnemy, setStageEnemy] = useState(null);

  // Always-fresh ref so the auto-restart timer never captures stale closures.
  const doStartRef = useRef(null);
  doStartRef.current = () => {
    const qi  = cultivation.qiRef.current + cultivation.costRef.current;
    const law = cultivation.activeLaw;
    const forcedId = combat.debugRef?.current?.nextEnemy;
    const enemyDef = forcedId
      ? (ENEMIES[forcedId] ?? (region?.enemyPool ? pickEnemy(region.enemyPool) : null))
      : (region?.enemyPool ? pickEnemy(region.enemyPool) : null);
    setStageEnemy(enemyDef);
    // Enemy HP is anchored to the region's minimum realm cost, not the
    // player's current qi — so zone 1 enemies always have low HP and zone 6
    // enemies always have high HP regardless of who is fighting them.
    const regionBaseQi = region?.minRealmIndex != null
      ? (REALMS[region.minRealmIndex]?.cost ?? qi)
      : qi;

    startFight(
      {
        essence:    Math.floor(qi * law.essenceMult),
        soul:       Math.floor(qi * law.soulMult),
        body:       Math.floor(qi * law.bodyMult),
        lawElement: law.element,
      },
      equippedTechniques,
      enemyDef,
      inventory   ? (drops) => drops.forEach(d => inventory.addItem(d.itemId, d.qty)) : null,
      techniques  ? (tech)  => techniques.addOwnedTechnique(tech) : null,
      region?.worldId ?? 1,
      regionBaseQi,
    );
  };

  // Auto-start the first fight when the screen mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { doStartRef.current(); }, []);

  // Auto-restart after a short delay whenever a fight ends.
  useEffect(() => {
    if (phase !== 'won' && phase !== 'lost') return;
    const t = setTimeout(() => doStartRef.current(), AUTO_RESTART_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const isFighting = phase === 'fighting';

  return (
    <div className="screen combat-screen">
      {onBack && (
        <button className="back-btn" onClick={onBack}>← Back</button>
      )}
      <h1>Combat Arena</h1>
      <p className="subtitle">{region ? region.name : cultivation.realmName}</p>

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
        {equippedTechniques.map((tech, i) => {
          const color = tech ? TYPE_COLOR[tech.type] : 'rgba(255,255,255,0.15)';
          return (
            <div
              key={i}
              className={`tech-icon-slot${!tech ? ' tech-icon-empty' : ''}`}
              style={{ borderColor: color }}
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
                {tech ? tech.name : `Slot ${['I','II','III'][i]}`}
              </span>
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
