import { TYPE_COLOR, TECHNIQUE_QUALITY, getCooldown } from '../data/techniques';

const LOG_COLOR = {
  damage:       'var(--accent)',
  'damage-taken': '#f97316',
  heal:         '#4ade80',
  buff:         '#60a5fa',
  dodge:        '#facc15',
  system:       'var(--text-muted)',
};

function CombatScreen({ cultivation, techniques, combat }) {
  const { phase, enemy, log, startFight } = combat;
  const { equippedTechniques } = techniques;

  const handleStart = () => {
    const qi  = cultivation.qiRef.current;
    const law = cultivation.activeLaw;
    startFight(
      {
        essence:    Math.floor(qi * law.essenceMult),
        soul:       Math.floor(qi * law.soulMult),
        body:       Math.floor(qi * law.bodyMult),
        lawElement: law.element,
      },
      equippedTechniques,
    );
  };

  const isFighting = phase === 'fighting';

  return (
    <div className="screen combat-screen">
      <h1>Combat Arena</h1>
      <p className="subtitle">{cultivation.realmName}</p>

      {/* ── HP bars ─────────────────────────────────────────────────────── */}
      <div className="combat-arena">
        {/* Enemy */}
        <div className="combatant combatant-enemy">
          <span className="combatant-label">{phase === 'idle' ? 'Enemy' : enemy.name}</span>
          <div className="hp-bar-track">
            <div
              ref={combat.eHpBarRef}
              className="hp-bar-fill enemy-hp-fill"
              style={{ width: phase === 'idle' ? '100%' : undefined }}
            />
          </div>
          <span ref={combat.eHpTextRef} className="hp-bar-text">
            {phase === 'idle' ? '—' : `0 / ${enemy.maxHp}`}
          </span>
        </div>

        <span className="combat-vs">vs</span>

        {/* Player */}
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
      </div>

      {/* ── Technique cooldown bars ──────────────────────────────────────── */}
      <div className="technique-bars">
        {[0, 1, 2].map(i => {
          const tech = equippedTechniques[i];
          const cd   = tech ? getCooldown(tech.type, tech.quality) : null;
          const q    = tech ? TECHNIQUE_QUALITY[tech.quality] : null;

          return (
            <div key={i} className={`tech-bar-slot${!tech ? ' tech-bar-empty' : ''}`}>
              <div className="tech-bar-header">
                <span className="tech-bar-name">
                  {tech ? tech.name : `Slot ${['I','II','III'][i]} — empty`}
                </span>
                {tech && (
                  <div className="tech-bar-meta">
                    <span className="tech-bar-badge" style={{ color: TYPE_COLOR[tech.type], borderColor: TYPE_COLOR[tech.type] }}>
                      {tech.type}
                    </span>
                    <span className="tech-bar-badge" style={{ color: q.color, borderColor: q.color }}>
                      {q.label}
                    </span>
                    <span className="tech-bar-cd">{cd.toFixed(1)}s</span>
                  </div>
                )}
              </div>
              <div className="tech-bar-track">
                <div
                  ref={el => { combat.cdBarRefs.current[i] = el; }}
                  className="tech-bar-fill"
                  style={{ width: isFighting ? undefined : (tech ? '0%' : '0%') }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Phase banner + action button ─────────────────────────────────── */}
      {phase === 'idle' && (
        <button className="combat-start-btn" onClick={handleStart}>
          Start Fight
        </button>
      )}
      {phase === 'won' && (
        <div className="combat-result combat-result-won">
          <span>Victory!</span>
          <button className="combat-start-btn" onClick={handleStart}>Fight Again</button>
        </div>
      )}
      {phase === 'lost' && (
        <div className="combat-result combat-result-lost">
          <span>Defeated</span>
          <button className="combat-start-btn" onClick={handleStart}>Retry</button>
        </div>
      )}

      {/* ── Combat log ──────────────────────────────────────────────────── */}
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
