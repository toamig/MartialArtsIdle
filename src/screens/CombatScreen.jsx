// @refresh reset
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

function CombatLog({ log }) {
  const ref  = useRef(null);

  // Snapshot captured in the render body — runs before React commits DOM
  // changes, giving us the scroll state we need to compute compensation.
  const snap = useRef({ top: 0, height: 0 });
  if (ref.current) {
    snap.current = { top: ref.current.scrollTop, height: ref.current.scrollHeight };
  }

  // Runs synchronously after each DOM commit (before paint) so the user
  // never sees a frame with the wrong scroll position.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const { top: prevTop, height: prevHeight } = snap.current;
    if (!prevHeight) return;               // first render — nothing to adjust yet

    const newHeight = el.scrollHeight;
    const added     = newHeight - prevHeight;   // net height change from this update
    const clientH   = el.clientHeight;

    if (prevTop <= 5) {
      // ── Following newest (at top) ──────────────────────────────────────
      // Override overflow-anchor: keep the newest entry visible.
      el.scrollTop = 0;
    } else if (prevHeight - prevTop - clientH <= 5) {
      // ── At the "end" (bottom) ──────────────────────────────────────────
      // Stay pinned to the bottom as older entries scroll through and despawn.
      el.scrollTop = newHeight - clientH;
    } else if (added) {
      // ── Reading history (middle) ───────────────────────────────────────
      // Compensate for content added at the top so the user's view doesn't move.
      el.scrollTop = prevTop + added;
    }
  }, [log]);

  return (
    <div ref={ref} className="combat-log">
      {log.length === 0
        ? <p className="combat-log-empty">Awaiting combat…</p>
        : log.map((entry, i) => (
            <p key={i} className={entry.kind === 'divider' ? 'combat-log-divider' : undefined}
               style={entry.kind !== 'divider' ? { color: LOG_COLOR[entry.kind] ?? 'var(--text-secondary)' } : undefined}>
              {entry.msg}
            </p>
          ))
      }
    </div>
  );
}

function CombatScreen({ cultivation, techniques, combat, inventory, artefacts = null, region = null, onBack = null, getFullStats, onRegionCleared = null }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  const { phase, enemy, log, startFight, stopFight } = combat;
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
          buffEffectMult:   full.buffEffectMult,
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
      artefacts   ? (id)    => artefacts.addArtefact(id) : null,
    );
  };

  // Auto-start the first fight when the screen mounts; stop on unmount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { doStartRef.current(); return () => stopFight(); }, []);

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


      {/* ── Bottom section: log + techniques ───────────────────────────────
           DOM order: log first (→ left on desktop), tech grid second (→ right).
           On mobile, CSS `order: -1` pulls the tech grid above the log.       */}
      <div className="combat-bottom">

        {/* Combat log */}
        <CombatLog log={log} />

        {/* Technique icons */}
        <div className="tech-icon-grid">
          {equippedTechniques.filter(Boolean).map((tech, i) => {
            const color = TYPE_COLOR[tech.type];
            const techName = tGame(`techniques.${tech.id}.name`, { defaultValue: tech.name });
            return (
              <div
                key={i}
                className="tech-icon-slot"
                style={{ '--tech-color': color }}
              >
                <div
                  className="tech-icon-top"
                  style={{ background: tech ? `${color}22` : undefined }}
                >
                  <img
                    src={`${BASE}sprites/techniques/${tech?.type?.toLowerCase() ?? 'empty'}.png`}
                    className="tech-icon-img"
                    alt=""
                  />
                  <span className="tech-icon-glyph" style={{ color }}>
                    {TECH_GLYPH[tech?.type] ?? '—'}
                  </span>
                  <span
                    className="tech-icon-clock"
                    ref={el => { combat.cdBarRefs.current[i] = el; }}
                  />
                </div>
                <span className="tech-icon-name" style={{ color }}>
                  {techName}
                </span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default CombatScreen;
