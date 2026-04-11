import { useEffect, useRef, useState } from 'react';
import { TYPE_COLOR, getCooldown } from '../data/techniques';
import { pickEnemy } from '../data/enemies';
import CombatStage from '../components/CombatStage';

const AUTO_RESTART_MS = 1500;

const LOG_COLOR = {
  damage:         'var(--accent)',
  'damage-taken': '#f97316',
  heal:           '#4ade80',
  buff:           '#60a5fa',
  dodge:          '#facc15',
  system:         'var(--text-muted)',
};

function CombatScreen({ cultivation, techniques, combat, region = null, onBack = null }) {
  const { phase, enemy, log, startFight } = combat;
  const { equippedTechniques } = techniques;

  // Tracks the enemy def currently shown in the stage (updates on each fight start).
  const [stageEnemy, setStageEnemy] = useState(null);

  // Always-fresh ref so the auto-restart timer never captures stale closures.
  const doStartRef = useRef(null);
  doStartRef.current = () => {
    const qi  = cultivation.qiRef.current;
    const law = cultivation.activeLaw;
    const enemyDef = region?.enemyPool ? pickEnemy(region.enemyPool) : null;
    setStageEnemy(enemyDef);
    startFight(
      {
        essence:    Math.floor(qi * law.essenceMult),
        soul:       Math.floor(qi * law.soulMult),
        body:       Math.floor(qi * law.bodyMult),
        lawElement: law.element,
      },
      equippedTechniques,
      enemyDef,
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
        playerAttackRef={combat.playerAttackRef}
        enemyAttackRef={combat.enemyAttackRef}
        playerAnimDoneRef={combat.playerAnimDoneRef}
        enemyAnimDoneRef={combat.enemyAnimDoneRef}
      />

      {/* ── HP bars ─────────────────────────────────────────────────────── */}
      <div className="combat-arena">
        <div className="combatant combatant-player">
          <span className="combatant-label">You</span>
          <div className="hp-bar-track">
            <div
              ref={combat.pHpBarRef}
              className="hp-bar-fill player-hp-fill"
              style={{ width: '100%' }}
            />
          </div>
          <span ref={combat.pHpTextRef} className="hp-bar-text">—</span>
        </div>

        <span className="combat-vs">vs</span>

        <div className="combatant combatant-enemy">
          <span className="combatant-label">{enemy.name || 'Enemy'}</span>
          <div className="hp-bar-track">
            <div
              ref={combat.eHpBarRef}
              className="hp-bar-fill enemy-hp-fill"
              style={{ width: phase === 'idle' ? '100%' : undefined }}
            />
          </div>
          <span ref={combat.eHpTextRef} className="hp-bar-text">—</span>
        </div>
      </div>

      {/* ── Technique bars ───────────────────────────────────────────────── */}
      <div className="technique-bars">
        {[0, 1, 2].map(i => {
          const tech  = equippedTechniques[i];
          const color = tech ? TYPE_COLOR[tech.type] : 'rgba(255,255,255,0.12)';

          return (
            <div key={i} className={`tech-bar-slot${!tech ? ' tech-bar-empty' : ''}`}>
              <div className="tech-bar-header">
                <span className="tech-bar-name" style={{ color: tech ? color : 'var(--text-muted)' }}>
                  {tech ? tech.name : `— Slot ${['I','II','III'][i]} —`}
                </span>
                {tech && (
                  <div className="tech-bar-meta">
                    <span className="tech-bar-badge" style={{ color, borderColor: color }}>{tech.type}</span>
                    <span className="tech-bar-cd">{getCooldown(tech.type, tech.quality).toFixed(1)}s</span>
                  </div>
                )}
              </div>
              {tech && (
                <div className="tech-bar-track">
                  <div
                    ref={el => { combat.cdBarRefs.current[i] = el; }}
                    className="tech-bar-fill"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Result flash (auto-dismissed when next fight starts) ─────────── */}
      {phase === 'won'  && <div className="combat-result combat-result-won" >Victory!</div>}
      {phase === 'lost' && <div className="combat-result combat-result-lost">Defeated</div>}

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
