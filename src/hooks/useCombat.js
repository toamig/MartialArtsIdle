import { useState, useEffect, useRef, useCallback } from 'react';
import { calcDamage, getCooldown } from '../data/techniques';
import { ALL_MATERIALS } from '../data/materials';
import { generateTechnique } from '../data/techniqueDrops';

function fmtHp(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(1)  + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1)  + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
  return String(Math.ceil(n));
}

/**
 * Resolve the number of enemy attacks a buff will cover.
 *
 * Base value comes from the technique's `buffAttacks`. If the stats bundle
 * carries a `buffDurationMult` (fed by the buff_duration stat — e.g. the
 * Time Master law unique grants +20–50% more charges), scale up and ceil.
 * Always floors at 1 so a cast is never wasted.
 */
function resolveBuffAttacks(base, stats) {
  const mult = stats?.buffDurationMult ?? 1;
  return Math.max(1, Math.ceil(base * mult));
}

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
 * Flow: spawn_idle → player_turn → [waiting_player] → enemy_turn → [waiting_enemy] → repeat
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
    // Both buffs now consume 1 charge per enemy attack instead of ticking
    // on a wall-clock timer. A cast sets `attacksLeft`; the enemy turn
    // decrements it after applying the effect (if any charges remain).
    defBuff:   { mult: 1, attacksLeft: 0 },
    dodgeBuff: { chance: 0, attacksLeft: 0 },
    stats:    null,
    equipped: [null, null, null],
  });

  const lastTRef = useRef(performance.now());
  // md_k Killing Stride — flag persists across fights so the bonus applies
  // to the *next* cast even if the kill ended the current fight.
  const strideRef = useRef(false);

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

  // ─── Debug flags — mutated directly by gameDebug.js ─────────────────────
  const debugRef = useRef({ godMode: false, oneShot: false, nextEnemy: null, watchMode: false });

  // ─── Drop callbacks — refreshed on each startFight call ─────────────────
  const onDropsRef          = useRef(null);
  const onTechniqueDropRef  = useRef(null);

  // ─── Sprite animation callbacks ────────────────────────────────────────────
  // playerAttackRef / enemyAttackRef: called by useCombat → CombatStage plays animation
  // playerAnimDoneRef / enemyAnimDoneRef: called by CombatStage → useCombat advances turn
  // spawnDamageNumberRef: registered by CombatStage; called here on each damage event
  const playerAttackRef       = useRef(null);
  const enemyAttackRef        = useRef(null);
  const playerAnimDoneRef     = useRef(null);
  const enemyAnimDoneRef      = useRef(null);
  const spawnDamageNumberRef  = useRef(null);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const patchBars = (s) => {
    if (pHpBarRef.current)
      pHpBarRef.current.style.width = `${(s.pHp / s.pMaxHp) * 100}%`;
    if (eHpBarRef.current)
      eHpBarRef.current.style.width = `${(s.eHp / s.eMaxHp) * 100}%`;
    if (pHpTextRef.current)
      pHpTextRef.current.textContent = `${fmtHp(s.pHp)} / ${fmtHp(s.pMaxHp)}`;
    if (eHpTextRef.current)
      eHpTextRef.current.textContent = `${fmtHp(s.eHp)} / ${fmtHp(s.eMaxHp)}`;

    for (let i = 0; i < 3; i++) {
      const el = cdBarRefs.current[i];
      if (!el) continue;
      const cd = s.cds[i], maxCd = s.maxCds[i];
      if (!isFinite(cd) || !isFinite(maxCd) || maxCd === 0) {
        el.style.background = 'transparent';
        continue;
      }
      const angle = Math.min(cd / maxCd, 1) * 360;
      el.style.background = angle <= 0
        ? 'transparent'
        : `conic-gradient(from -90deg, rgba(0,0,0,0.72) ${angle}deg, transparent ${angle}deg)`;
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
   * @param {number}   regionIndex       — minRealmIndex of the region; anchors enemy HP to
   *                                       zone difficulty on a smooth 1.12×-per-index curve
   */
  const startFight = useCallback((stats, equippedTechs, enemyDef = null, onDrops = null, onTechniqueDrop = null, worldId = 1, regionIndex = 0) => {
    if (stateRef.current.phase === 'fighting') return;
    const { essence, soul, body } = stats;
    const total  = essence + soul + body;

    const hpMult  = enemyDef?.statMult?.hp  ?? 1;
    const atkMult = enemyDef?.statMult?.atk ?? 1;
    const eName   = enemyDef?.name ?? 'Training Dummy';

    const pMaxHp = Math.max(100, Math.floor((essence + body) * 12 + soul * 4));
    // Enemy HP anchored to region index, not player stats. Base 150 × 1.12^index
    // gives W1 R1 ≈ 150, W2 R1 ≈ 980, W3 R1 ≈ 1830, W6 R4 ≈ 46k — a ~300× spread
    // across the 52 region indices before the per-enemy hpMult is applied.
    const hpBase = 150 * Math.pow(1.12, Math.max(0, regionIndex ?? 0));
    const eMaxHp = Math.max(100, Math.floor(hpBase * hpMult));
    // ATK stays player-stats-based: it measures danger TO the current player.
    const eAtk   = Math.max(10,  Math.floor(total * atkMult));

    // md_1 Steady Hands — `cooldownMult` shrinks every cooldown.
    const cdMult = stats?.cooldownMult ?? 1;
    const cds    = equippedTechs.map(t => t ? 0        : Infinity);
    const maxCds = equippedTechs.map(t => t
      ? getCooldown(t.type, t.quality) * cdMult
      : Infinity);

    onDropsRef.current         = onDrops;
    onTechniqueDropRef.current = onTechniqueDrop;

    stateRef.current = {
      phase:     'fighting',
      turnPhase: 'spawn_idle',
      pHp: pMaxHp, pMaxHp,
      eHp: eMaxHp, eMaxHp, eAtk,
      cds:    [...cds],
      maxCds: [...maxCds],
      defBuff:   { mult: 1, attacksLeft: 0 },
      dodgeBuff: { chance: 0, attacksLeft: 0 },
      stats:    { ...stats },
      equipped: [...equippedTechs],
      enemyDrops:       enemyDef?.drops ?? [],
      techDropChance:   enemyDef?.techniqueDrop?.chance ?? 0,
      worldId,
      // Reincarnation tree state
      undyingUsed: false,                 // hw_3 once-per-fight
      castCount:   0,                     // yy_4 every-Nth free
      stridePending: false,               // md_k post-kill exploit flag
    };

    lastTRef.current = performance.now();
    setEnemy({ name: eName, maxHp: eMaxHp });
    setPhase('fighting');
    setLog([{ msg: `${eName} appears!`, kind: 'system' }]);
    // Give both fighters a brief idle window before the first exchange
    setTimeout(() => {
      if (stateRef.current.phase === 'fighting')
        stateRef.current.turnPhase = 'player_turn';
    }, 500);
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

      // ── yy_3 Yang Resolve — regen 5%/s of max HP while above 50% HP ──────
      const regen = s.stats?.hpRegenPerSec ?? 0;
      if (regen > 0 && s.pHp > s.pMaxHp * 0.5 && s.pHp < s.pMaxHp) {
        s.pHp = Math.min(s.pMaxHp, s.pHp + s.pMaxHp * regen * dt);
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
          // yy_4 Equilibrium — every Nth cast is free (no CD applied).
          s.castCount += 1;
          const freeEvery = s.stats?.freeCastEvery ?? 0;
          const isFree = freeEvery > 0 && (s.castCount % freeEvery === 0);
          s.cds[i]   = isFree ? 0 : s.maxCds[i];

          if (tech.type === 'Attack') {
            // Prefer the full law object so calcDamage can apply the
            // damage-category flat bonus (physical / elemental / psychic)
            // derived from law.types. Falls back to lawElement string.
            let dmg = calcDamage(
              tech,
              s.stats.essence, s.stats.soul, s.stats.body,
              s.stats.law ?? s.stats.lawElement,
              0,
              s.stats.damageStats ?? null,
            );
            // Exploit: roll exploitChance % per attack; on success multiply
            // damage by exploitMult % (default 150%).
            const exChance = s.stats.exploitChance ?? 0;
            const exMult   = s.stats.exploitMult   ?? 150;
            // md_k Killing Stride — next cast after a kill is a guaranteed
            // exploit and gets +50% damage. One-shot flag, consumed here.
            const stride = strideRef.current;
            strideRef.current = false;
            const exploited = stride || (exChance > 0 && Math.random() * 100 < exChance);
            if (exploited) dmg = Math.floor(dmg * (exMult / 100));
            if (stride) dmg = Math.floor(dmg * 1.5);
            // Reincarnation-tree "Triple All Damage" node.
            dmg = Math.floor(dmg * (s.stats.damageMult ?? 1));
            s.eHp = Math.max(0, s.eHp - dmg);
            logs.push({
              msg: exploited
                ? `${tech.name} → EXPLOIT! ${dmg.toLocaleString()} dmg`
                : `${tech.name} → ${dmg.toLocaleString()} dmg`,
              kind: 'damage',
            });
            spawnDamageNumberRef.current?.(dmg, 'enemy', s.eMaxHp, { exploit: exploited });
          } else if (tech.type === 'Heal') {
            const heal = Math.floor(s.pMaxHp * (tech.healPercent ?? 0.25));
            s.pHp = Math.min(s.pMaxHp, s.pHp + heal);
            logs.push({ msg: `${tech.name} → +${heal.toLocaleString()} HP`, kind: 'heal' });
          } else if (tech.type === 'Defend') {
            const atks    = resolveBuffAttacks(tech.buffAttacks ?? 3, s.stats);
            const effMult = 1 + (s.stats.buffEffectMult ?? 0);
            const defMult = (tech.defMult ?? 1.5) * effMult;
            s.defBuff = { mult: defMult, attacksLeft: atks };
            logs.push({ msg: `${tech.name} → DEF ×${defMult.toFixed(2)} (${atks} hits)`, kind: 'buff' });
          } else if (tech.type === 'Dodge') {
            const atks    = resolveBuffAttacks(tech.buffAttacks ?? 3, s.stats);
            const effMult = 1 + (s.stats.buffEffectMult ?? 0);
            const chance  = Math.min(1, (tech.dodgeChance ?? 0.4) * effMult);
            s.dodgeBuff = { chance, attacksLeft: atks };
            logs.push({ msg: `${tech.name} → ${Math.round(chance * 100)}% dodge (${atks} hits)`, kind: 'buff' });
          }
          break; // one technique per turn
        }

        // Basic attack if no technique fired
        if (!techFired) {
          // Law typeMults scale each primary stat individually. Uncovered
          // categories are 0 so stats the law doesn't anchor contribute
          // nothing to the basic attack. With no law equipped at all
          // (fresh life / between picks) fall back to (body + essence) / 2
          // so combat is functional without an active law.
          const law = s.stats.law;
          let dmg;
          if (!law) {
            dmg = (s.stats.body + s.stats.essence) / 2;
          } else {
            const tm = law.typeMults ?? { essence: 0, body: 0, soul: 0 };
            dmg = s.stats.essence * (tm.essence ?? 0)
                + s.stats.body    * (tm.body    ?? 0)
                + s.stats.soul    * (tm.soul    ?? 0);
          }
          // Universal damage_all flat (artefacts / law uniques).
          dmg += s.stats.damageStats?.damage_all ?? 0;
          // Source multiplier: default_attack_damage applies only to basic
          // attacks (techniques get their own secret_technique_damage in
          // calcDamage).
          const baseMult = 1 + (s.stats.damageStats?.default_attack_damage ?? 0);
          dmg = Math.max(5, Math.floor(dmg * baseMult));
          // Exploit also applies to basic attacks.
          const exChance = s.stats.exploitChance ?? 0;
          const exMult   = s.stats.exploitMult   ?? 150;
          const exploited = exChance > 0 && Math.random() * 100 < exChance;
          if (exploited) dmg = Math.floor(dmg * (exMult / 100));
          dmg = Math.floor(dmg * (s.stats.damageMult ?? 1));
          s.eHp = Math.max(0, s.eHp - dmg);
          logs.push({
            msg: exploited
              ? `Basic attack → EXPLOIT! ${dmg.toLocaleString()} dmg`
              : `Basic attack → ${dmg.toLocaleString()} dmg`,
            kind: 'damage',
          });
          spawnDamageNumberRef.current?.(dmg, 'enemy', s.eMaxHp, { exploit: exploited });
        }

        // Debug: force enemy death on every hit
        if (debugRef.current.oneShot && s.eHp > 0) s.eHp = 0;
        // Debug: keep enemy alive so full animation loop plays forever
        if (debugRef.current.watchMode && s.eHp <= 0) s.eHp = 1;

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
            // md_k Killing Stride — arm the next cast for guaranteed exploit + 50%.
            if (s2.stats?.killingStride) strideRef.current = true;

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
            setTimeout(() => {
              if (stateRef.current.phase === 'fighting')
                stateRef.current.turnPhase = 'enemy_turn';
            }, 500);
          }
        };
      }

      // ── Enemy's turn: deal damage, fire animation, then wait ──────────────
      if (s.turnPhase === 'enemy_turn') {
        s.turnPhase = 'waiting_enemy';
        const logs = [];

        // Buffs are charge-based: each enemy attack consumes one charge
        // from whichever buff is active, regardless of whether it triggered.
        const dodgeActive = s.dodgeBuff.attacksLeft > 0;
        const defActive   = s.defBuff.attacksLeft > 0;

        if (dodgeActive && Math.random() < s.dodgeBuff.chance) {
          logs.push({ msg: 'Enemy attack — dodged!', kind: 'dodge' });
        } else if (debugRef.current.godMode) {
          logs.push({ msg: 'Enemy attack — negated (god mode)', kind: 'dodge' });
        } else {
          const defMult = defActive ? s.defBuff.mult : 1;
          const def     = (s.stats.essence + s.stats.body) * defMult;
          // Scale-independent formula: dmg = eAtk² / (eAtk + def)
          // At equal eAtk and def → 50% reduction. Fully works at any stat scale.
          const rawDmg  = Math.max(1, Math.floor(s.eAtk * s.eAtk / (s.eAtk + def)));
          // hw_3 Undying Resolve — once per fight, a lethal hit leaves you
          // at 1 HP instead of dying. Charge consumed regardless of whether
          // the hit would actually have killed (only triggers on kill).
          let dmg = rawDmg;
          if (s.stats?.undyingResolve && !s.undyingUsed && rawDmg >= s.pHp) {
            dmg = Math.max(0, s.pHp - 1);
            s.undyingUsed = true;
            logs.push({ msg: 'UNDYING RESOLVE — survived at 1 HP!', kind: 'system' });
          }
          s.pHp = Math.max(0, s.pHp - dmg);
          logs.push({ msg: `Enemy hits → −${dmg.toLocaleString()} HP`, kind: 'damage-taken' });
          spawnDamageNumberRef.current?.(dmg, 'player', s.pMaxHp);
        }

        // Consume a charge from any active buff after this attack resolves.
        if (dodgeActive) s.dodgeBuff.attacksLeft -= 1;
        if (defActive)   s.defBuff.attacksLeft   -= 1;

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
            setTimeout(() => {
              if (stateRef.current.phase === 'fighting')
                stateRef.current.turnPhase = 'player_turn';
            }, 500);
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
    debugRef,
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
    spawnDamageNumberRef,
  };
}
