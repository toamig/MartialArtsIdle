import { useState, useEffect, useRef, useCallback } from 'react';
import { calcDamage, getCooldown } from '../data/techniques';
import { ALL_MATERIALS } from '../data/materials';
import { generateTechnique } from '../data/techniqueDrops';

function rollDrops(drops) {
  if (!drops?.length) return [];
  const result = [];
  for (const drop of drops) {
    if (Math.random() < drop.chance) {
      const qty = drop.qty[0] + Math.floor(Math.random() * (drop.qty[1] - drop.qty[0] + 1));
      result.push({ itemId: drop.itemId, qty });
    }
  }
  return result;
}

/**
 * Turn-based combat loop.
 *
 * Flow: player_turn → [waiting_player] → enemy_turn → [waiting_enemy] → repeat
 *
 * Damage is dealt at the START of each turn.
 * The next turn only begins once the current attack animation signals completion
 * via playerAnimDoneRef / enemyAnimDoneRef — preventing animation overlap.
 *
 * Attack speed stat (TODO): will scale the inter-turn delay once connected.
 */

const MAX_LOG = 20;

export default function useCombat() {
  // ─── All mutable fight state in one ref ──────────────────────────────────
  const stateRef = useRef({
    phase:     'idle',
    turnPhase: 'player_turn', // 'player_turn'|'waiting_player'|'enemy_turn'|'waiting_enemy'
    pHp: 0, pMaxHp: 0,
    eHp: 0, eMaxHp: 0, eAtk: 0,
    cds:    [Infinity, Infinity, Infinity],
    maxCds: [Infinity, Infinity, Infinity],
    defBuff:   { mult: 1, endsAt: 0 },
    dodgeBuff: { chance: 0, endsAt: 0 },
    stats:    null,
    equipped: [null, null, null],
  });

  const lastTRef = useRef(performance.now());

  // ─── React state — phase transitions and log only ────────────────────────
  const [phase, setPhase] = useState('idle');
  const [enemy, setEnemy] = useState({ name: '', maxHp: 0 });
  const [log,   setLog]   = useState([]);

  // ─── DOM refs — HP bars, patched at 60fps ─────────────────────────────────
  const pHpBarRef  = useRef(null);
  const eHpBarRef  = useRef(null);
  const pHpTextRef = useRef(null);
  const eHpTextRef = useRef(null);
  const cdBarRefs  = useRef([null, null, null]);

  // ─── Drop callbacks — refreshed on each startFight call ─────────────────
  const onDropsRef          = useRef(null);
  const onTechniqueDropRef  = useRef(null);

  // ─── Sprite animation callbacks ────────────────────────────────────────────
  // playerAttackRef / enemyAttackRef: called by useCombat → CombatStage plays animation
  // playerAnimDoneRef / enemyAnimDoneRef: called by CombatStage → useCombat advances turn
  const playerAttackRef  = useRef(null);
  const enemyAttackRef   = useRef(null);
  const playerAnimDoneRef = useRef(null);
  const enemyAnimDoneRef  = useRef(null);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const patchBars = (s) => {
    if (pHpBarRef.current)
      pHpBarRef.current.style.width = `${(s.pHp / s.pMaxHp) * 100}%`;
    if (eHpBarRef.current)
      eHpBarRef.current.style.width = `${(s.eHp / s.eMaxHp) * 100}%`;
    if (pHpTextRef.current)
      pHpTextRef.current.textContent = `${Math.ceil(s.pHp)} / ${s.pMaxHp}`;
    if (eHpTextRef.current)
      eHpTextRef.current.textContent = `${Math.ceil(s.eHp)} / ${s.eMaxHp}`;

    for (let i = 0; i < 3; i++) {
      const el = cdBarRefs.current[i];
      if (!el) continue;
      const cd = s.cds[i], maxCd = s.maxCds[i];
      if (!isFinite(cd) || !isFinite(maxCd) || maxCd === 0) { el.style.width = '0%'; continue; }
      el.style.width = `${(1 - Math.min(cd / maxCd, 1)) * 100}%`;
    }
  };

  // ─── startFight ───────────────────────────────────────────────────────────
  /**
   * @param {object}   stats             — { essence, soul, body, lawElement }
   * @param {array}    equippedTechs     — technique slots
   * @param {object}   enemyDef          — entry from data/enemies.js
   * @param {function} onDrops           — callback([{itemId, qty}]) fired on material victory drops
   * @param {function} onTechniqueDrop   — callback(techniqueObj) fired when a technique drops
   * @param {number}   worldId           — world tier 1–6, used for technique generation
   */
  const startFight = useCallback((stats, equippedTechs, enemyDef = null, onDrops = null, onTechniqueDrop = null, worldId = 1) => {
    const { essence, soul, body } = stats;
    const total  = essence + soul + body;

    const hpMult  = enemyDef?.statMult?.hp  ?? 1;
    const atkMult = enemyDef?.statMult?.atk ?? 1;
    const eName   = enemyDef?.name ?? 'Training Dummy';

    const pMaxHp = Math.max(100, Math.floor((essence + body) * 12 + soul * 4));
    const eMaxHp = Math.max(200, Math.floor(total * 10 * hpMult));
    // eAtk scales with total player stats × enemy multiplier.
    // Paired with the scale-independent damage formula below.
    const eAtk   = Math.max(10,  Math.floor(total * atkMult));

    const cds    = equippedTechs.map(t => t ? 0        : Infinity);
    const maxCds = equippedTechs.map(t => t ? getCooldown(t.type, t.quality) : Infinity);

    onDropsRef.current         = onDrops;
    onTechniqueDropRef.current = onTechniqueDrop;

    stateRef.current = {
      phase:     'fighting',
      turnPhase: 'player_turn',
      pHp: pMaxHp, pMaxHp,
      eHp: eMaxHp, eMaxHp, eAtk,
      cds:    [...cds],
      maxCds: [...maxCds],
      defBuff:   { mult: 1, endsAt: 0 },
      dodgeBuff: { chance: 0, endsAt: 0 },
      stats:    { ...stats },
      equipped: [...equippedTechs],
      enemyDrops:       enemyDef?.drops ?? [],
      techDropChance:   enemyDef?.techniqueDrop?.chance ?? 0,
      worldId,
    };

    lastTRef.current = performance.now();
    setEnemy({ name: eName, maxHp: eMaxHp });
    setPhase('fighting');
    setLog([{ msg: `${eName} appears!`, kind: 'system' }]);
  }, []);

  // ─── rAF loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let raf;

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const s = stateRef.current;
      if (s.phase !== 'fighting') return;

      const dt    = Math.min((now - lastTRef.current) / 1000, 0.1);
      lastTRef.current = now;
      const nowSec = now / 1000;

      // ── Tick technique cooldowns (time-based, independent of turns) ───────
      for (let i = 0; i < 3; i++) {
        if (isFinite(s.cds[i])) s.cds[i] = Math.max(0, s.cds[i] - dt);
      }

      // ── Player's turn: deal damage, fire animation, then wait ─────────────
      if (s.turnPhase === 'player_turn') {
        s.turnPhase = 'waiting_player';
        const logs = [];

        // Find first ready technique
        let techFired = false;
        for (let i = 0; i < 3; i++) {
          if (!isFinite(s.cds[i]) || s.cds[i] > 0) continue;
          const tech = s.equipped[i];
          if (!tech) continue;
          if (tech.type === 'Heal' && s.pHp > s.pMaxHp * 0.5) continue;

          techFired  = true;
          s.cds[i]   = s.maxCds[i];

          if (tech.type === 'Attack') {
            const dmg = calcDamage(tech, s.stats.essence, s.stats.soul, s.stats.body, s.stats.lawElement);
            s.eHp = Math.max(0, s.eHp - dmg);
            logs.push({ msg: `${tech.name} → ${dmg.toLocaleString()} dmg`, kind: 'damage' });
          } else if (tech.type === 'Heal') {
            const heal = Math.floor(s.pMaxHp * (tech.healPercent ?? 0.25));
            s.pHp = Math.min(s.pMaxHp, s.pHp + heal);
            logs.push({ msg: `${tech.name} → +${heal.toLocaleString()} HP`, kind: 'heal' });
          } else if (tech.type === 'Defend') {
            s.defBuff = { mult: tech.defMult ?? 1.5, endsAt: nowSec + (tech.buffDuration ?? 5) };
            logs.push({ msg: `${tech.name} → DEF ×${tech.defMult ?? 1.5} (${tech.buffDuration ?? 5}s)`, kind: 'buff' });
          } else if (tech.type === 'Dodge') {
            s.dodgeBuff = { chance: tech.dodgeChance ?? 0.4, endsAt: nowSec + (tech.buffDuration ?? 4) };
            logs.push({ msg: `${tech.name} → ${Math.round((tech.dodgeChance ?? 0.4) * 100)}% dodge (${tech.buffDuration ?? 4}s)`, kind: 'buff' });
          }
          break; // one technique per turn
        }

        // Basic attack if no technique fired
        if (!techFired) {
          const dmg = Math.max(5, Math.floor(s.stats.essence + s.stats.body));
          s.eHp = Math.max(0, s.eHp - dmg);
          logs.push({ msg: `Basic attack → ${dmg.toLocaleString()} dmg`, kind: 'damage' });
        }

        if (logs.length) setLog(prev => [...logs, ...prev].slice(0, MAX_LOG));

        // Fire attack animation — turn advances in playerAnimDoneRef callback
        playerAttackRef.current?.();
        patchBars(s);

        // Register what happens when player animation finishes
        playerAnimDoneRef.current = () => {
          const s2 = stateRef.current;
          if (s2.phase !== 'fighting') return;
          if (s2.eHp <= 0) {
            s2.phase = 'won';

            const newLogs = [{ msg: 'Enemy defeated! Victory!', kind: 'system' }];

            // Roll material drops
            const dropped = rollDrops(s2.enemyDrops);
            if (dropped.length > 0) {
              onDropsRef.current?.(dropped);
              const dropMsg = dropped
                .map(d => `${d.qty}× ${ALL_MATERIALS[d.itemId]?.name ?? d.itemId}`)
                .join(', ');
              newLogs.unshift({ msg: `Drops: ${dropMsg}`, kind: 'system' });
            }

            // Roll technique drop
            if (s2.techDropChance > 0 && Math.random() < s2.techDropChance) {
              const tech = generateTechnique(s2.worldId);
              onTechniqueDropRef.current?.(tech);
              newLogs.unshift({ msg: `Scroll found: ${tech.name} (${tech.quality} ${tech.type})`, kind: 'technique' });
            }

            setLog(prev => [...newLogs, ...prev].slice(0, MAX_LOG));
            patchBars(s2);
            setPhase('won');
          } else {
            s2.turnPhase = 'enemy_turn';
          }
        };
      }

      // ── Enemy's turn: deal damage, fire animation, then wait ──────────────
      if (s.turnPhase === 'enemy_turn') {
        s.turnPhase = 'waiting_enemy';
        const logs = [];
        const nowSec2 = performance.now() / 1000;

        if (s.dodgeBuff.endsAt > nowSec2 && Math.random() < s.dodgeBuff.chance) {
          logs.push({ msg: 'Enemy attack — dodged!', kind: 'dodge' });
        } else {
          const defMult = s.defBuff.endsAt > nowSec2 ? s.defBuff.mult : 1;
          const def     = (s.stats.essence + s.stats.body) * defMult;
          // Scale-independent formula: dmg = eAtk² / (eAtk + def)
          // At equal eAtk and def → 50% reduction. Fully works at any stat scale.
          const dmg     = Math.max(1, Math.floor(s.eAtk * s.eAtk / (s.eAtk + def)));
          s.pHp         = Math.max(0, s.pHp - dmg);
          logs.push({ msg: `Enemy hits → −${dmg.toLocaleString()} HP`, kind: 'damage-taken' });
        }

        if (logs.length) setLog(prev => [...logs, ...prev].slice(0, MAX_LOG));

        enemyAttackRef.current?.();
        patchBars(s);

        // Register what happens when enemy animation finishes
        enemyAnimDoneRef.current = () => {
          const s2 = stateRef.current;
          if (s2.phase !== 'fighting') return;
          if (s2.pHp <= 0) {
            s2.phase = 'lost';
            setLog(prev => [{ msg: 'You were defeated…', kind: 'system' }, ...prev].slice(0, MAX_LOG));
            patchBars(s2);
            setPhase('lost');
          } else {
            s2.turnPhase = 'player_turn';
          }
        };
      }

      patchBars(s);
    };

    lastTRef.current = performance.now();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return {
    phase,
    enemy,
    log,
    stateRef,
    startFight,
    pHpBarRef,
    eHpBarRef,
    cdBarRefs,
    pHpTextRef,
    eHpTextRef,
    playerAttackRef,
    enemyAttackRef,
    playerAnimDoneRef,
    enemyAnimDoneRef,
  };
}
