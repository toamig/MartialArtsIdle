import { useState, useEffect, useRef, useCallback } from 'react';
import { calcDamage, getCooldown } from '../data/techniques';
import { ALL_MATERIALS } from '../data/materials';
import { generateTechnique } from '../data/techniqueDrops';
import { pickRandomArtefact } from '../data/artefactDrops';
import { ARTEFACTS_BY_ID } from '../data/artefacts';

// Artefacts drop using the same per-enemy `techniqueDrop.chance`, scaled up
// slightly so they feel marginally more common than Secret Technique scrolls.
const ARTEFACT_DROP_MULT = 1.5;

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

/**
 * Compute the aggregate **conditional** damage bonus contributed by the
 * equipped artefact unique flags for the current in-combat state. Returns a
 * multiplier in the form (1 + sum of applicable bonuses). Each flag value is
 * a raw percent number (0–100) stored on `stats.artefactFlags`.
 */
function computeArtefactDamageBonus(s) {
  const flags = s.stats?.artefactFlags;
  if (!flags) return 1;
  const nowSec   = performance.now() / 1000;
  const elapsed  = nowSec - (s.combatStartSec ?? nowSec);
  const enemyPct = s.eMaxHp ? s.eHp / s.eMaxHp : 1;
  const realmIdx = s.stats.realmIndex ?? 0;
  const majorR   = Math.floor(realmIdx / 3);
  const eqArt    = s.stats.equippedArtefactCount ?? 0;
  const techCount= (s.equipped ?? []).filter(Boolean).length;

  let bonus = 0;
  if (flags.damageFirst5sPct  && elapsed <= 5)  bonus += flags.damageFirst5sPct  / 100;
  if (flags.damageFirst10sPct && elapsed <= 10) bonus += flags.damageFirst10sPct / 100;
  if (flags.executeBonusPct   && enemyPct < 0.25) bonus += flags.executeBonusPct / 100;
  if (flags.damagePerRealmPct)            bonus += (flags.damagePerRealmPct / 100) * realmIdx;
  if (flags.damagePerMajorRealmPct)       bonus += (flags.damagePerMajorRealmPct / 100) * majorR;
  if (flags.damagePerArtefactPct)         bonus += (flags.damagePerArtefactPct / 100) * eqArt;
  if (flags.damageIfSoulGtBodyPct && (s.stats.soul ?? 0) > (s.stats.body ?? 0))
    bonus += flags.damageIfSoulGtBodyPct / 100;
  if (flags.damageIf3TechsPct && techCount >= 3) bonus += flags.damageIf3TechsPct / 100;
  if (flags.damagePostDodgePct && nowSec - (s.lastDodgeAtSec ?? -Infinity) <= 3)
    bonus += flags.damagePostDodgePct / 100;
  if (flags.comboDamagePerHitPct) {
    const capped = Math.min(10, s.comboCount ?? 0);
    bonus += (flags.comboDamagePerHitPct / 100) * capped;
  }
  if (flags.damagePerKill5sPct) {
    // Drop stale kills (>5s old) so the bonus is time-bounded.
    const recent = (s.killsIn5s ?? []).filter(t => nowSec - t <= 5);
    s.killsIn5s = recent;
    bonus += (flags.damagePerKill5sPct / 100) * recent.length;
  }
  // Enemies have no defense stat in the current combat model, so
  // ignore-defense rolls bleed into a flat damage boost (half value to
  // approximate their expected contribution). `ignoreDefensePct` is always
  // active; `ignoreDefenseChance` rolls once per attack.
  const ignorePct = s.stats?.ignoreDefensePct ?? 0;
  if (ignorePct > 0) bonus += (ignorePct / 100) * 0.5;
  const ignoreChance = s.stats?.ignoreDefenseChancePct ?? 0;
  if (ignoreChance > 0 && Math.random() * 100 < ignoreChance) bonus += 0.5;
  return 1 + bonus;
}

/** Roll crit chance/damage from artefact stats. Returns {dmg, crit}. */
function rollCritMultiplier(s, dmg) {
  const crit   = s.stats?.critChance ?? 0;
  const bonus  = s.stats?.critDamagePct ?? 0;
  const twice  = s.stats?.critTwiceChancePct ?? 0;
  const flags  = s.stats?.artefactFlags ?? {};
  const silentCrown = flags.firstAttackGuaranteedCrit && !s.firstAttackFired;
  const didCrit = silentCrown || (crit > 0 && Math.random() * 100 < crit);
  if (!didCrit) return { dmg, crit: false };
  // Base crit × 1.5; +critDamagePct% additional; +50% again on crit-twice roll.
  let mult = 1.5 + (bonus / 100);
  if (twice > 0 && Math.random() * 100 < twice) mult += 0.5;
  return { dmg: Math.floor(dmg * mult), crit: true };
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

const MAX_LOG = 100;

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
  // cb_ts Veteran's Hunt — every 10 kills grants one pending +1-rarity
  // bump that the next gather/mine cycle consumes. Read by App.jsx and
  // forwarded into autoFarm via getFullStats.
  const killsForHuntRef = useRef(0);
  const huntBumpsPendingRef = useRef(0);

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
  const onArtefactDropRef   = useRef(null);

  // ─── Sprite animation callbacks ────────────────────────────────────────────
  // playerAttackRef / enemyAttackRef: called by useCombat → CombatStage plays animation
  // playerAnimDoneRef / enemyAnimDoneRef: called by CombatStage → useCombat advances turn
  // spawnDamageNumberRef: registered by CombatStage; called here on each damage event
  // spawnDropsRef: registered by CombatStage; called here with material drops on kill
  const playerAttackRef       = useRef(null);
  const enemyAttackRef        = useRef(null);
  const playerAnimDoneRef     = useRef(null);
  const enemyAnimDoneRef      = useRef(null);
  const spawnDamageNumberRef  = useRef(null);
  const spawnDropsRef         = useRef(null);

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

    for (let i = 0; i < s.cds.length; i++) {
      const el = cdBarRefs.current[i];
      if (!el) continue;
      const cd = s.cds[i];
      if (!isFinite(cd) || cd <= 0) {
        el.textContent = '';
        el.style.opacity = '0';
      } else {
        el.textContent = cd < 10 ? cd.toFixed(1) : Math.ceil(cd).toString();
        el.style.opacity = '1';
      }
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
   * @param {function} onArtefactDrop    — callback(catalogueId) fired when an artefact drops
   */
  const startFight = useCallback((stats, equippedTechs, enemyDef = null, onDrops = null, onTechniqueDrop = null, worldId = 1, regionIndex = 0, onArtefactDrop = null) => {
    if (stateRef.current.phase === 'fighting') return;
    const { essence, soul, body } = stats;
    const total  = essence + soul + body;

    const hpMult  = enemyDef?.statMult?.hp  ?? 1;
    const atkMult = enemyDef?.statMult?.atk ?? 1;
    const eName   = enemyDef?.name ?? 'Training Dummy';
    // Each enemy deals a fixed damage type; the combat tick picks the
    // matching defence stat below. Default to 'physical' for anything the
    // DAMAGE_TYPE_BY_ID map missed (e.g. designer-added enemies).
    const eDmgType = enemyDef?.damageType ?? 'physical';

    const pMaxHp = Math.max(100, Math.floor((essence + body) * 12 + soul * 4));
    // Enemy HP anchored to region index, not player stats. Base 150 × 1.12^index
    // gives W1 R1 ≈ 150, W2 R1 ≈ 980, W3 R1 ≈ 1830, W6 R4 ≈ 46k — a ~300× spread
    // across the 52 region indices before the per-enemy hpMult is applied.
    const hpBase = 150 * Math.pow(1.12, Math.max(0, regionIndex ?? 0));
    const eMaxHp = Math.max(100, Math.floor(hpBase * hpMult));
    // Enemy attack is anchored to region index (not to player stats) so the
    // hit is a FIXED value per-region rather than scaling with the player's
    // Essence+Soul+Body total. Base 18 × 1.12^index puts W1 R1 ≈ 18,
    // W2 R1 ≈ 117, W3 R1 ≈ 219, W6 R4 ≈ 5520 before the per-enemy atkMult.
    // Mitigated in the enemy-turn tick via the player's matching defence stat.
    const atkBase = 18 * Math.pow(1.12, Math.max(0, regionIndex ?? 0));
    const eAtk    = Math.max(10, Math.floor(atkBase * atkMult));

    // md_1 Steady Hands (+ artefact cooldown reductions) — both shrink every
    // cooldown. `cooldownReductionPct` is an artefact-derived 0–1 fraction.
    const cdMult   = (stats?.cooldownMult ?? 1) * Math.max(0.1, 1 - (stats?.cooldownReductionPct ?? 0));
    const cds    = equippedTechs.map(t => t ? 0        : Infinity);
    const maxCds = equippedTechs.map(t => t
      ? getCooldown(t.type, t.quality) * cdMult
      : Infinity);

    onDropsRef.current         = onDrops;
    onTechniqueDropRef.current = onTechniqueDrop;
    onArtefactDropRef.current  = onArtefactDrop;

    stateRef.current = {
      phase:     'fighting',
      turnPhase: 'spawn_idle',
      pHp: pMaxHp, pMaxHp,
      eHp: eMaxHp, eMaxHp, eAtk, eDmgType,
      cds:    [...cds],
      maxCds: [...maxCds],
      defBuff:   { mult: 1, attacksLeft: 0 },
      dodgeBuff: { chance: 0, attacksLeft: 0 },
      stats:    { ...stats },
      equipped: [...equippedTechs],
      enemyDrops:       enemyDef?.drops ?? [],
      techDropChance:   enemyDef?.techniqueDrop?.chance ?? 0,
      artefactDropChance: (enemyDef?.techniqueDrop?.chance ?? 0) * ARTEFACT_DROP_MULT,
      worldId,
      // Reincarnation tree state
      undyingUsed: false,                 // hw_3 once-per-fight
      castCount:   0,                     // yy_4 every-Nth free
      stridePending: false,               // md_k post-kill exploit flag
      // ── Artefact-unique runtime state ──────────────────────────────────
      combatStartSec:   performance.now() / 1000,
      firstAttackFired: false,
      phoenixUsed:      false,
      comboCount:       0,                // resets when enemy hits player
      lastDodgeAtSec:   -Infinity,
      killsIn5s:  [],                     // timestamps for battle_sash stacks
    };

    lastTRef.current = performance.now();
    setEnemy({ name: eName, maxHp: eMaxHp });
    setPhase('fighting');
    setLog(prev => [
      { msg: `${eName} appears!`, kind: 'system' },
      ...(prev.length ? [{ msg: '───────────────', kind: 'divider' }] : []),
      ...prev,
    ].slice(0, MAX_LOG));
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
      for (let i = 0; i < s.cds.length; i++) {
        if (isFinite(s.cds[i])) s.cds[i] = Math.max(0, s.cds[i] - dt);
      }

      // ── yy_3 Yang Resolve — regen 5%/s of max HP while above 50% HP ──────
      const regen = s.stats?.hpRegenPerSec ?? 0;
      if (regen > 0 && s.pHp > s.pMaxHp * 0.5 && s.pHp < s.pMaxHp) {
        s.pHp = Math.min(s.pMaxHp, s.pHp + s.pMaxHp * regen * dt);
      }
      // Artefact-derived in-combat regen (hp_regen_in_combat stored as
      // fraction of maxHP / sec). Plus regen_at_full_hp applies only when
      // at max HP (no-op otherwise but included for parity with the flag).
      const artRegen = s.stats?.hpRegenInCombatPct ?? 0;
      if (artRegen > 0 && s.pHp < s.pMaxHp) {
        s.pHp = Math.min(s.pMaxHp, s.pHp + s.pMaxHp * artRegen * dt);
      }

      // ── Player's turn: deal damage, fire animation, then wait ─────────────
      if (s.turnPhase === 'player_turn') {
        s.turnPhase = 'waiting_player';
        const logs = [];

        // Basic attack always fires — techniques layer on top when ready.
        // Law typeMults scale each primary stat individually. Uncovered
        // categories are 0 so stats the law doesn't anchor contribute
        // nothing to the basic attack. With no law equipped at all
        // (fresh life / between picks) fall back to (body + essence) / 2
        // so combat is functional without an active law.
        {
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
          // Artefact-unique conditional damage stack (time / combo / realm…).
          dmg = Math.floor(dmg * computeArtefactDamageBonus(s));
          // Crit roll from artefact crit_chance / crit_damage.
          const critRes = rollCritMultiplier(s, dmg);
          dmg = critRes.dmg;
          dmg = Math.floor(dmg * (s.stats.damageMult ?? 1));
          s.eHp = Math.max(0, s.eHp - dmg);
          // Lifesteal from artefact affixes (blood_drinker / blood_palms / …).
          const lifestealPct = s.stats?.lifestealPct ?? 0;
          if (lifestealPct > 0 && dmg > 0) {
            const heal = Math.max(1, Math.floor(dmg * lifestealPct / 100));
            s.pHp = Math.min(s.pMaxHp, s.pHp + heal);
          }
          logs.push({
            msg: critRes.crit
              ? `Basic attack → CRIT! ${dmg.toLocaleString()} dmg`
              : exploited
                ? `Basic attack → EXPLOIT! ${dmg.toLocaleString()} dmg`
                : `Basic attack → ${dmg.toLocaleString()} dmg`,
            kind: 'damage',
          });
          spawnDamageNumberRef.current?.(dmg, 'enemy', s.eMaxHp, { exploit: exploited || critRes.crit });
          s.firstAttackFired = true;
          s.comboCount = (s.comboCount ?? 0) + 1;
        }

        // First ready technique fires in parallel to the basic attack.
        for (let i = 0; i < s.cds.length; i++) {
          if (!isFinite(s.cds[i]) || s.cds[i] > 0) continue;
          const tech = s.equipped[i];
          if (!tech) continue;
          if (tech.type === 'Heal' && s.pHp > s.pMaxHp * 0.5) continue;

          // yy_4 Equilibrium — every Nth cast is free (no CD applied).
          // a_inner_eye — random free-cast chance from an artefact unique.
          s.castCount += 1;
          const freeEvery   = s.stats?.freeCastEvery ?? 0;
          const freeChance  = s.stats?.freeCastChancePct ?? 0;
          const isFreeTree  = freeEvery > 0 && (s.castCount % freeEvery === 0);
          const isFreeChance = freeChance > 0 && Math.random() * 100 < freeChance;
          const isFree = isFreeTree || isFreeChance;
          s.cds[i]   = isFree ? 0 : s.maxCds[i];

          if (tech.type === 'Attack') {
            // Prefer the full law object so calcDamage can apply the
            // damage-category flat bonus (physical / elemental)
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
            // Artefact-unique conditional stack.
            dmg = Math.floor(dmg * computeArtefactDamageBonus(s));
            // Crit roll (independent from exploit).
            const critRes = rollCritMultiplier(s, dmg);
            dmg = critRes.dmg;
            // Reincarnation-tree "Triple All Damage" node.
            dmg = Math.floor(dmg * (s.stats.damageMult ?? 1));
            s.eHp = Math.max(0, s.eHp - dmg);
            // Lifesteal — counts every damage source.
            const lifestealPct = s.stats?.lifestealPct ?? 0;
            if (lifestealPct > 0 && dmg > 0) {
              const heal = Math.max(1, Math.floor(dmg * lifestealPct / 100));
              s.pHp = Math.min(s.pMaxHp, s.pHp + heal);
            }
            logs.push({
              msg: critRes.crit
                ? `${tech.name} → CRIT! ${dmg.toLocaleString()} dmg`
                : exploited
                  ? `${tech.name} → EXPLOIT! ${dmg.toLocaleString()} dmg`
                  : `${tech.name} → ${dmg.toLocaleString()} dmg`,
              kind: 'damage',
            });
            spawnDamageNumberRef.current?.(dmg, 'enemy', s.eMaxHp, { exploit: exploited || critRes.crit });
            s.firstAttackFired = true;
            s.comboCount = (s.comboCount ?? 0) + 1;
          } else if (tech.type === 'Heal') {
            const heal = Math.floor(s.pMaxHp * (tech.healPercent ?? 0.25)
                        * (1 + (s.stats?.healingReceivedPct ?? 0)));
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
            // Track kill timestamps for artefact damage_per_kill_5s stacks.
            s2.killsIn5s = [...(s2.killsIn5s ?? []), performance.now() / 1000];
            // md_k Killing Stride — arm the next cast for guaranteed exploit + 50%.
            if (s2.stats?.killingStride) strideRef.current = true;
            // cb_ts Veteran's Hunt — every 10 kills banks 1 rarity-bump
            // for the next gather/mine cycle.
            if (s2.stats?.regionKillBonus) {
              killsForHuntRef.current += 1;
              if (killsForHuntRef.current >= 10) {
                killsForHuntRef.current = 0;
                huntBumpsPendingRef.current += 1;
              }
            }

            const newLogs = [{ msg: 'Enemy defeated! Victory!', kind: 'system' }];

            // Roll material drops, scaled by artefact `all_loot_bonus`.
            const lootMult = 1 + (s2.stats?.allLootBonusPct ?? 0);
            const dropped = rollDrops(s2.enemyDrops).map(d =>
              lootMult !== 1 ? { ...d, qty: Math.max(1, Math.floor(d.qty * lootMult)) } : d);
            if (dropped.length > 0) {
              onDropsRef.current?.(dropped);
              // Spawn drop orbs in the stage — visual-only, fires before Victory overlay
              spawnDropsRef.current?.(dropped);
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

            // Roll artefact drop — independent from the technique roll so an
            // enemy can drop both. Uses the techniqueDrop.chance scaled up.
            if (s2.artefactDropChance > 0 && Math.random() < s2.artefactDropChance) {
              const artId = pickRandomArtefact(s2.worldId);
              if (artId) {
                onArtefactDropRef.current?.(artId);
                const cat = ARTEFACTS_BY_ID[artId];
                newLogs.unshift({
                  msg: `Artefact found: ${cat?.name ?? artId} (${cat?.rarity ?? 'Iron'})`,
                  kind: 'technique',
                });
              }
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

        const artDodgePct = s.stats?.dodgeChancePct ?? 0;
        const artDodgeRoll = artDodgePct > 0 && Math.random() * 100 < artDodgePct;
        if (dodgeActive && Math.random() < s.dodgeBuff.chance) {
          logs.push({ msg: 'Enemy attack — dodged!', kind: 'dodge' });
          s.lastDodgeAtSec = performance.now() / 1000;
        } else if (artDodgeRoll) {
          logs.push({ msg: 'Enemy attack — dodged!', kind: 'dodge' });
          s.lastDodgeAtSec = performance.now() / 1000;
          // a_voidstep — each dodge resets one cooldown.
          if (s.stats?.artefactFlags?.voidstepCdReset) {
            for (let i = 0; i < s.cds.length; i++) {
              if (isFinite(s.cds[i]) && s.cds[i] > 0) { s.cds[i] = 0; break; }
            }
          }
          // a_clarity_storm — after dodging, slice a % off every active CD.
          const postDodgeCdRed = s.stats?.artefactFlags?.postDodgeCdReductionPct ?? 0;
          if (postDodgeCdRed > 0) {
            const mult = 1 - postDodgeCdRed / 100;
            for (let i = 0; i < s.cds.length; i++) {
              if (isFinite(s.cds[i]) && s.cds[i] > 0) s.cds[i] *= mult;
            }
          }
          // a_serpent_skin / serpent_skin — heal % of max HP on dodge.
          const healPct = s.stats?.artefactFlags?.healOnDodgePct ?? 0;
          if (healPct > 0) {
            s.pHp = Math.min(s.pMaxHp, s.pHp + Math.floor(s.pMaxHp * healPct / 100));
          }
        } else if (debugRef.current.godMode) {
          logs.push({ msg: 'Enemy attack — negated (god mode)', kind: 'dodge' });
        } else {
          const defMult = defActive ? s.defBuff.mult : 1;
          // Pick the defence stat that matches this enemy's damage type.
          // Fallback to the legacy essence+body blend when combat stats were
          // built before the defence fields existed (e.g. debug flows).
          let rawDef;
          if (s.eDmgType === 'elemental') {
            rawDef = s.stats.elementalDefense ?? (s.stats.essence ?? 0);
          } else {
            rawDef = s.stats.defense ?? ((s.stats.essence ?? 0) + (s.stats.body ?? 0));
          }
          const def = Math.max(1, rawDef * defMult);
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
          // a_oracles_insight / a_oracle_amulet — lethal-blow dodge roll.
          const fatalDodgeChance = s.stats?.dodgeFatalChancePct ?? 0;
          if (fatalDodgeChance > 0 && dmg >= s.pHp && Math.random() * 100 < fatalDodgeChance) {
            dmg = Math.max(0, s.pHp - 1);
            logs.push({ msg: 'Fatal blow dodged!', kind: 'dodge' });
          }
          // a_unyielding_garb — HP floor. Clamps incoming damage so we never
          // drop below the floor. Percentage stored as raw 0–100.
          const hpFloor = s.stats?.artefactFlags?.hpFloorPct ?? 0;
          if (hpFloor > 0) {
            const floorHp = Math.floor(s.pMaxHp * hpFloor / 100);
            if (s.pHp - dmg < floorHp) dmg = Math.max(0, s.pHp - floorHp);
          }
          s.pHp = Math.max(0, s.pHp - dmg);
          // a_phoenix_robe / a_phoenix_ring — once-per-fight lethal save.
          const phoenixPct = s.stats?.artefactFlags?.phoenixRevivePct ?? 0;
          if (phoenixPct > 0 && !s.phoenixUsed && s.pHp <= 0) {
            s.pHp = Math.max(1, Math.floor(s.pMaxHp * phoenixPct / 100));
            s.phoenixUsed = true;
            logs.push({ msg: `PHOENIX — revived with ${s.pHp} HP!`, kind: 'system' });
          }
          // a_reflective_skin — reflect a share of damage taken back to enemy.
          const reflectPct = s.stats?.reflectPct ?? 0;
          if (reflectPct > 0 && dmg > 0) {
            const reflected = Math.max(1, Math.floor(dmg * reflectPct / 100));
            s.eHp = Math.max(0, s.eHp - reflected);
            logs.push({ msg: `Reflected ${reflected} dmg`, kind: 'damage' });
          }
          // Reset consecutive-hit combo on any incoming damage.
          s.comboCount = 0;
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

  const stopFight = useCallback(() => {
    stateRef.current.phase = 'idle';
    setPhase('idle');
  }, []);

  return {
    phase,
    enemy,
    log,
    stateRef,
    stopFight,
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
    spawnDropsRef,
    // cb_ts Veteran's Hunt — read by App.jsx getFullStats so the next
    // gather/mine tick consumes a pending bump.
    huntBumpsPendingRef,
  };
}
