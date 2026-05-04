// @refresh reset
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TYPE_COLOR } from '../data/techniques';
import { mineralForRarity } from '../data/materials';

const BASE = import.meta.env.BASE_URL;

const TECH_GLYPH = {
  Attack: '⚔',
  Heal:   '✦',
  Defend: '⬡',
  Dodge:  '↯',
};
import ENEMIES, { pickEnemy } from '../data/enemies';
import CombatStage from '../components/CombatStage';

const AUTO_RESTART_MS = 2000;

// All entries use the dark-purple chrome family or the semantic accent so the
// log reads as part of the same UI as every other panel. Damage lines share
// the accent — direction is conveyed by the message text, not the colour.
const LOG_COLOR = {
  damage:         'var(--accent)',
  'damage-taken': 'rgba(var(--accent-rgb), 0.72)',
  heal:           'var(--ui-purple-light)',
  buff:           'var(--ui-purple-soft)',
  dodge:          'rgba(var(--ui-label-rgb), 0.72)',
  technique:      'var(--ui-purple-strong)',
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

    // Pull the full stat bundle and pass the WHOLE THING through. Pre-2026-05-03
    // this filtered to a hand-picked subset (health / damageStats / exploit / law)
    // and silently dropped lawTriggers, lawFlags, setFlags, dodgeChancePct,
    // pillEffectMult, freeCastEvery, killingStride and roughly 30 other fields.
    // useCombat reads any of those via `s.stats?.foo`, so missing fields meant
    // dodges never rolled, water_sanctuary never nulled hits, etc.
    const full = getFullStats?.();
    const playerStats = full
      ? { ...full, essence: 0, soul: 0, body: 0 }
      : {
          health:     100,
          essence:    0, soul: 0, body: 0,
          lawElement: law?.element ?? null,
          law,
        };

    // Per-region drop suppression: training-zone-style regions can flag
    // `noScrollOrArtefactDrops` to zero out scroll + artefact rolls without
    // touching per-enemy chance values (those enemies appear in real loot
    // zones too). Mutate a shallow clone of enemyDef so the source stays
    // pristine.
    const effectiveEnemyDef = region?.noScrollOrArtefactDrops
      ? { ...enemyDef, techniqueDrop: { ...(enemyDef?.techniqueDrop ?? {}), chance: 0 } }
      : enemyDef;

    startFight(
      playerStats,
      equippedTechniques,
      effectiveEnemyDef,
      inventory   ? (drops) => drops.forEach(d => inventory.addItem(d.itemId, d.qty)) : null,
      // Drop callback: hand the tech to the techniques hook, which dedupes
      // by base id. If duplicate, refund the matching dismantle mineral and
      // return `{ kind: 'duplicate', refundedItemId }` so useCombat can log
      // the auto-dismantle path. Otherwise return `{ kind: 'new' }`.
      techniques ? (tech) => {
        const result = techniques.addOwnedTechnique(tech);
        if (result.duplicate) {
          const refundedItemId = mineralForRarity(result.quality);
          inventory?.addItem?.(refundedItemId, 1);
          return { kind: 'duplicate', refundedItemId };
        }
        return { kind: 'new' };
      } : null,
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
      <header className="coll-page-header combat-page-header">
        {onBack && (
          <button
            className="back-btn back-btn-icon"
            onClick={onBack}
            aria-label={t('common.back')}
            title={t('common.back')}
          >
            ←
          </button>
        )}
        <div className="combat-page-header-text">
          <h1>{t('combat.title')}</h1>
          <span className="coll-page-subtitle">{subtitle}</span>
        </div>
      </header>

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
        spawnDropsRef={combat.spawnDropsRef}
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

        {/* Technique icons — TAP-TO-CAST. 2026-05-03: techniques no longer
            auto-trigger; the player taps the slot to fire instantly. The
            cooldown clock visualises the wait; on cooldown, taps no-op. */}
        <div className="tech-icon-grid">
          {equippedTechniques.filter(Boolean).map((tech, i) => {
            const color = TYPE_COLOR[tech.type];
            const techName = tGame(`techniques.${tech.id}.name`, { defaultValue: tech.name });
            const onTap = () => {
              if (!isFighting) return;
              const fired = combat.triggerTech?.(i);
              // No feedback toast on miss — the cooldown clock is the
              // affordance signal. Could add a flash later if needed.
              return fired;
            };
            return (
              <button
                type="button"
                key={i}
                className="tech-icon-slot tech-icon-slot-btn"
                style={{ '--tech-color': color, '--type-bg': `${color}22` }}
                onClick={onTap}
                disabled={!isFighting}
                aria-label={`Cast ${techName}`}
              >
                <div className="tech-icon-top">
                  <img
                    src={`${BASE}sprites/techniques/${tech?.type?.toLowerCase() ?? 'empty'}.png`}
                    className="tech-icon-img"
                    alt=""
                  />
                  <span className="tech-icon-glyph">
                    {TECH_GLYPH[tech?.type] ?? '—'}
                  </span>
                  <span
                    className="tech-icon-clock"
                    ref={el => { combat.cdBarRefs.current[i] = el; }}
                  />
                </div>
                <span className="tech-icon-name">
                  {techName}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default CombatScreen;
