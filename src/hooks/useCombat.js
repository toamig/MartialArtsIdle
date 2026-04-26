import { useState, useEffect, useRef, useCallback } from 'react';
import { calcDamage, getCooldown } from '../data/techniques';
import { ALL_MATERIALS } from '../data/materials';
import { pickTechnique } from '../data/techniqueDrops';
import { pickRandomArtefact } from '../data/artefactDrops';
import { ARTEFACTS_BY_ID } from '../data/artefacts';

// PoE-style armour mitigation cap. Past this, even infinite armour can't
// fully negate a hit. Standard PoE convention.
const PIPE_MITIGATION_CAP = 0.9;
// Multiplier on `damage` in the PoE armour curve:
//   mitigation = armour / (armour + ARMOUR_DAMAGE_FACTOR × damage)
// Higher → bigger hits scale into armour better.
const ARMOUR_DAMAGE_FACTOR = 10;
// Per-region scaling for enemy DEF / ELEM_DEF.
//   EnemyDef = max(10, region_index × ENEMY_DEF_PER_REGION × def_mult)
// Cut from 8 → 5 on 2026-04-27 to keep enemy defense from getting absurd
// at high region indices. At regionIndex 50 the cap drops 400 → 250 base.
// PoE armour curve still applies on top.
const ENEMY_DEF_PER_REGION = 5;

// Artefacts drop using the same per-enemy `techniqueDrop.chance`, scaled up
// so they feel distinctly more common than Secret Technique scrolls.
const ARTEFACT_DROP_MULT = 2.0;

function fmtHp(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(1)  + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1)  + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
  return String(Math.ceil(n));
}

/**
 * Apply the PoE armour mitigation curve and return the final damage.
 *   mitigation = armour / (armour + 10 × damage), capped at 0.9.
 *   final     = damage × (1 − mitigation)
 */
function applyArmourMitigation(damage, armour) {
  if (armour <= 0 || damage <= 0) return damage;
  const mitigation = Math.min(
    PIPE_MITIGATION_CAP,
    armour / (armour + ARMOUR_DAMAGE_FACTOR * damage),
  );
  return Math.max(1, Math.floor(damage * (1 - mitigation)));
}

/** Resolve total exploit chance / mult including any active expose buff. */
function resolveExploitParams(s) {
  const baseChance = s.stats?.exploitChance ?? 0;
  const baseMult   = s.stats?.exploitMult   ?? 150;
  const ex = s.exposeBuff;
  if (!ex || ex.playerAttacksLeft <= 0) {
    return { chance: baseChance, mult: baseMult };
  }
  return {
    chance: baseChance + (ex.exploitChance ?? 0),
    mult:   ex.exploitMult ?? baseMult,
  };
}

/** Resolve total def_pen including any active expose buff (player clock). */
function resolveDefPen(s, { exploited = false } = {}) {
  const base = s.stats?.defPen ?? 0;
  const ex   = s.exposeBuff;
  let total = base;
  if (ex && ex.playerAttacksLeft > 0) total += (ex.defPen ?? 0);
  // Metal law / set: "Exploit hits ignore X% of enemy defenses".
  if (exploited) {
    total += s.stats?.lawFlags?.exploitDefPenPct ?? 0;
    total += s.stats?.setFlags?.exploitDefPenPct ?? 0;
  }
  return Math.min(1, total);
}

/** Resolve total incoming-damage reduction including the expose buff (enemy clock). */
function resolveIncomingDmgReduction(s) {
  const base = s.stats?.incomingDamageReduction ?? 0;
  const ex   = s.exposeBuff;
  if (!ex || ex.enemyAttacksLeft <= 0) return base;
  return Math.min(0.9, base + (ex.dmgReduction ?? 0));
}

/**
 * Decrement the appropriate expose-buff clock(s) after a turn resolves.
 * @param {object} s
 * @param {'player'|'enemy'} clock — which clock to tick
 */
function tickExposeBuff(s, clock) {
  const ex = s.exposeBuff;
  if (!ex) return;
  if (clock === 'player' && ex.playerAttacksLeft > 0) ex.playerAttacksLeft -= 1;
  if (clock === 'enemy'  && ex.enemyAttacksLeft  > 0) ex.enemyAttacksLeft  -= 1;
  if (ex.playerAttacksLeft <= 0 && ex.enemyAttacksLeft <= 0) s.exposeBuff = null;
}

/**
 * Resolve a single exploit roll. Folds the killing-stride guarantee into the
 * standard exploit-chance roll. The `cannotExploit` law/set flag forces a
 * non-exploit result regardless of chance / stride.
 *
 * Crit was consolidated into exploit on 2026-04-26.
 * Artefact unique flags removed on 2026-04-27 (silent-crown's
 * firstAttackGuaranteedExploit was the only consumer; gone with it).
 */
function rollExploit(s, dmg, { stride = false } = {}) {
  if (s.stats?.lawFlags?.cannotExploit || s.stats?.setFlags?.cannotExploit) {
    s.nextHitExploit = false;
    return { dmg, exploited: false };
  }
  // Wood Set 2 4-piece: "Dodging makes the next attack or secret technique an
  // exploit hit". Consumed by the next attack regardless of dmg.
  const guaranteedFromDodge = s.nextHitExploit === true;
  if (guaranteedFromDodge) s.nextHitExploit = false;
  const { chance, mult } = resolveExploitParams(s);
  const exploited = stride || guaranteedFromDodge || (chance > 0 && Math.random() * 100 < chance);
  if (!exploited) return { dmg, exploited: false };
  return { dmg: Math.floor(dmg * (mult / 100)), exploited: true };
}

// ─── Trigger dispatch (law + set on-event effects) ────────────────────────────

/**
 * Walk the active law-trigger + set-trigger lists, invoking each handler whose
 * event matches and whose condition (if any) passes. Triggers are declarative
 * data emitted by lawEngine / set engine — see `applyTriggerAction` for the
 * supported action shapes.
 *
 * @param {object} s        combat state ref
 * @param {string} event    one of 'on_heal' | 'on_default_attack_fired' |
 *                          'on_secret_tech_fired' | 'on_dodge_success' |
 *                          'on_hit_taken' | 'on_enemy_killed' | 'on_exploit_fired'
 * @param {object} payload  event-specific data (e.g. { amount } for on_heal)
 */
function dispatchTrigger(s, event, payload = {}) {
  const lawTriggers = s.stats?.lawTriggers ?? [];
  const setTriggers = s.stats?.setTriggers ?? [];
  for (const t of [...lawTriggers, ...setTriggers]) {
    if (t.event !== event) continue;
    applyTriggerAction(s, t.action, payload);
  }
}

function applyTriggerAction(s, action, payload) {
  if (!action || typeof action !== 'object') return;
  switch (action.type) {
    case 'heal_pct': {
      const heal = Math.floor(s.pMaxHp * (action.value ?? 0));
      if (heal > 0) {
        s.pHp = Math.min(s.pMaxHp, s.pHp + heal);
        s._triggerLog?.push({ msg: `Trigger → +${heal} HP`, kind: 'heal' });
      }
      break;
    }
    case 'damage_enemy_pct_of_payload': {
      const amount = payload?.amount ?? 0;
      const dmg = Math.max(0, Math.floor(amount * (action.value ?? 0)));
      if (dmg > 0) {
        s.eHp = Math.max(0, s.eHp - dmg);
        s._triggerLog?.push({ msg: `Trigger → ${dmg} reflected dmg`, kind: 'damage' });
      }
      break;
    }
    case 'null_next_enemy_hit': {
      s.nextEnemyHitNulls = true;
      break;
    }
    case 'reduce_other_tech_cd_pct': {
      const pct = action.value ?? 0;
      const sourceIdx = payload?.sourceIdx;
      for (let i = 0; i < s.cds.length; i++) {
        if (i === sourceIdx) continue;
        if (isFinite(s.cds[i]) && s.cds[i] > 0) {
          s.cds[i] = Math.max(0, s.cds[i] * (1 - pct));
        }
      }
      break;
    }
    case 'dodge_stack_increment': {
      s.dodgeStacks = (s.dodgeStacks ?? 0) + (action.value ?? 1);
      break;
    }
    case 'dodge_stack_reset': {
      s.dodgeStacks = 0;
      break;
    }
    case 'default_attack_buff_set': {
      s.defaultAttackBuff = { stacks: action.value ?? 1 };
      break;
    }
    case 'default_attack_buff_clear': {
      s.defaultAttackBuff = null;
      break;
    }
    case 'add_dodge_chance': {
      // Non-stacking-by-default flat dodge bonus, consumed at the next dodge roll.
      s.transientDodgeBonus = (s.transientDodgeBonus ?? 0) + (action.value ?? 0);
      break;
    }
    default:
      // Unknown action type — silently ignore so designer-facing law data
      // never crashes combat if a typo or unimplemented action sneaks through.
      break;
  }
}

// ─── Per-element artefact damage bonus (new, replaces artefact-flag stack) ───

/**
 * Aggregate the law-flag conditional damage bonuses that scale with current
 * combat state. Returns a multiplier (1 + sum). Replaces the deleted
 * computeArtefactDamageBonus that previously aggregated ~11 artefact-unique
 * flag bonuses.
 *
 * Active scalers (sourced from law uniques + set bonuses):
 *   - damagePerArtefactOfElement   : 1 + (pct/100) × count of matching-element artefacts
 *   - damagePerMissingHpPct        : 1 + (pct/100) × pct missing HP (0–100)
 *   - damageScalesWithDodgeChance  : 1 + currentDodgeChance/100  (multiplicative)
 *   - secretTechMoreDmgPerMetalArt : Attack-tech only; +pct% per metal artefact
 */
function computeLawDamageBonus(s, { tech } = {}) {
  const flags = s.stats?.lawFlags ?? {};
  const setFlags = s.stats?.setFlags ?? {};
  let bonus = 0;

  // Wood law "Damage is increased by current dodge chance".
  if (flags.damageScalesWithDodgeChance) {
    const dodgePct = s.stats?.dodgeChancePct ?? 0;
    bonus += dodgePct / 100;
  }
  // Fire set 1 4-piece: "10% more damage for each artefact that matches the law".
  // setFlags.damagePerLawMatchingArtefactPct stores the raw %.
  if (setFlags.damagePerLawMatchingArtefactPct) {
    const law = s.stats?.law;
    const lawEl = law?.element ?? null;
    if (lawEl) {
      const matching = s.stats?.equippedArtefactsByElement?.[lawEl] ?? 0;
      bonus += (setFlags.damagePerLawMatchingArtefactPct / 100) * matching;
    }
  }
  return 1 + bonus;
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
 */

const MAX_LOG = 100;

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

export default function useCombat() {
  // ─── All mutable fight state in one ref ──────────────────────────────────
  const stateRef = useRef({
    phase:     'idle',
    turnPhase: 'player_turn',
    pHp: 0, pMaxHp: 0,
    eHp: 0, eMaxHp: 0, eAtk: 0,
    cds:    [Infinity, Infinity, Infinity],
    maxCds: [Infinity, Infinity, Infinity],
    defBuff:   { mult: 1, attacksLeft: 0 },
    dodgeBuff: { chance: 0, attacksLeft: 0 },
    exposeBuff: null,
    stats:    null,
    equipped: [null, null, null],
  });

  const lastTRef = useRef(performance.now());
  const strideRef = useRef(false);
  const killsForHuntRef = useRef(0);
  const huntBumpsPendingRef = useRef(0);

  const [phase, setPhase] = useState('idle');
  const [enemy, setEnemy] = useState({ name: '', maxHp: 0 });
  const [log,   setLog]   = useState([]);

  const pHpBarRef  = useRef(null);
  const eHpBarRef  = useRef(null);
  const pHpTextRef = useRef(null);
  const eHpTextRef = useRef(null);
  const cdBarRefs  = useRef([null, null, null]);

  const debugRef = useRef({ godMode: false, oneShot: false, nextEnemy: null, watchMode: false });

  const onDropsRef          = useRef(null);
  const onTechniqueDropRef  = useRef(null);
  const onArtefactDropRef   = useRef(null);

  const playerAttackRef       = useRef(null);
  const enemyAttackRef        = useRef(null);
  const playerAnimDoneRef     = useRef(null);
  const enemyAnimDoneRef      = useRef(null);
  const spawnDamageNumberRef  = useRef(null);
  const spawnDropsRef         = useRef(null);

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

  const startFight = useCallback((stats, equippedTechs, enemyDef = null, onDrops = null, onTechniqueDrop = null, worldId = 1, regionIndex = 0, onArtefactDrop = null) => {
    if (stateRef.current.phase === 'fighting') return;

    const hpMult     = enemyDef?.statMult?.hp     ?? 1;
    const atkMult    = enemyDef?.statMult?.atk    ?? 1;
    const defMultE   = enemyDef?.statMult?.def    ?? 1;
    const elemDefMul = enemyDef?.statMult?.elemDef ?? 1;
    const eName     = enemyDef?.name ?? 'Training Dummy';
    const eDmgType = enemyDef?.damageType ?? 'physical';

    const pMaxHp = stats?.health ?? 100;
    const hpBase = 150 * Math.pow(1.12, Math.max(0, regionIndex ?? 0));
    const eMaxHp = Math.max(100, Math.floor(hpBase * hpMult));
    const atkBase = 18 * Math.pow(1.12, Math.max(0, regionIndex ?? 0));
    const eAtk    = Math.max(10, Math.floor(atkBase * atkMult));
    const defBase  = ENEMY_DEF_PER_REGION * Math.max(0, regionIndex ?? 0);
    const eDef     = Math.max(10, Math.floor(defBase * defMultE));
    const eElemDef = Math.max(10, Math.floor(defBase * elemDefMul));

    // Per-tech-type CD multiplier (e.g. fire law "Healing techs have double CD").
    const cdMult   = (stats?.cooldownMult ?? 1) * Math.max(0.1, 1 - (stats?.cooldownReductionPct ?? 0));
    const cdTypeMults = stats?.lawCdTypeMults ?? {};
    const cds    = equippedTechs.map(t => t ? 0        : Infinity);
    const maxCds = equippedTechs.map(t => t
      ? getCooldown(t.type, t.quality) * cdMult * (cdTypeMults[t.type] ?? 1)
      : Infinity);

    onDropsRef.current         = onDrops;
    onTechniqueDropRef.current = onTechniqueDrop;
    onArtefactDropRef.current  = onArtefactDrop;

    stateRef.current = {
      phase:     'fighting',
      turnPhase: 'spawn_idle',
      pHp: pMaxHp, pMaxHp,
      eHp: eMaxHp, eMaxHp, eAtk, eDmgType, eDef, eElemDef,
      cds:    [...cds],
      maxCds: [...maxCds],
      defBuff:   { mult: 1, attacksLeft: 0 },
      dodgeBuff: { chance: 0, attacksLeft: 0 },
      exposeBuff: null,
      stats:    { ...stats },
      equipped: [...equippedTechs],
      enemyDrops:       enemyDef?.drops ?? [],
      techDropChance:   enemyDef?.techniqueDrop?.chance ?? 0,
      artefactDropChance: (enemyDef?.techniqueDrop?.chance ?? 0) * ARTEFACT_DROP_MULT,
      worldId,
      // Reincarnation tree state
      undyingUsed: false,
      castCount:   0,
      stridePending: false,
      // ── Law / set runtime state ────────────────────────────────────────
      defaultAttackBuff: null,         // { stacks: N } — fire double-strike
      dodgeStacks:       0,            // wood dodge laws
      transientDodgeBonus: 0,          // wood "+5% dodge per hit taken"
      nextEnemyHitNulls: false,        // water "healing nulls next hit"
      lastDodgeAtSec:    -Infinity,    // lawEngine context input
    };

    lastTRef.current = performance.now();
    setEnemy({ name: eName, maxHp: eMaxHp });
    setPhase('fighting');
    setLog(prev => [
      { msg: `${eName} appears!`, kind: 'system' },
      ...(prev.length ? [{ msg: '───────────────', kind: 'divider' }] : []),
      ...prev,
    ].slice(0, MAX_LOG));
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

      // ── Tick technique cooldowns (time-based) ────────────────────────────
      for (let i = 0; i < s.cds.length; i++) {
        if (isFinite(s.cds[i])) s.cds[i] = Math.max(0, s.cds[i] - dt);
      }

      // ── Reincarnation-tree HP regen (above 50% only) ─────────────────────
      const regen = s.stats?.hpRegenPerSec ?? 0;
      if (regen > 0 && s.pHp > s.pMaxHp * 0.5 && s.pHp < s.pMaxHp) {
        s.pHp = Math.min(s.pMaxHp, s.pHp + s.pMaxHp * regen * dt);
      }
      // Generic in-combat regen (water laws "5% HP/s natural regen"; pills).
      const baseInCombatRegen = s.stats?.hpRegenInCombatPct ?? 0;
      if (baseInCombatRegen > 0 && s.pHp < s.pMaxHp) {
        // Water Set 2 4-piece: HP/s recovery is 50% more effective if a
        // Heal-type secret technique is currently on cooldown.
        const healCdActive = (s.equipped ?? []).some((t, i) => t?.type === 'Heal' && s.cds[i] > 0);
        const healMore = healCdActive ? (s.stats?.setFlags?.hpRegenMoreIfHealCdActive ?? 0) : 0;
        const inCombatRegen = baseInCombatRegen * (1 + healMore);
        s.pHp = Math.min(s.pMaxHp, s.pHp + s.pMaxHp * inCombatRegen * dt);
      }

      // ── Player's turn ────────────────────────────────────────────────────
      if (s.turnPhase === 'player_turn') {
        s.turnPhase = 'waiting_player';
        const logs = [];
        s._triggerLog = logs; // exposed to applyTriggerAction for log lines

        // ── Basic attack (always fires) ────────────────────────────────────
        {
          const K_BASIC = 10;
          const realmIdx = s.stats?.realmIndex ?? 0;
          let dmg = K_BASIC * (realmIdx + 1);
          // Basic attack is hard-pinned to physical damage, so it adds 100%
          // of the physical_damage stat (same as a physical secret tech does
          // via calcDamage's damage_bucket addition).
          dmg += s.stats?.damageStats?.physical ?? 0;
          dmg += s.stats?.damageStats?.damage_all ?? 0;
          // Earth law: "Default attacks deal 5% of max HP as physical damage".
          if (s.stats?.lawFlags?.basicAttackHpPctDmg) {
            dmg += Math.floor(s.pMaxHp * s.stats.lawFlags.basicAttackHpPctDmg);
          }
          const baseMult = 1 + (s.stats?.damageStats?.default_attack_damage ?? 0);
          dmg = Math.max(5, Math.floor(dmg * baseMult));
          // Fire double-strike: doubled damage; consumed by this attack.
          if (s.defaultAttackBuff?.stacks > 0) {
            dmg = dmg * 2;
            s.defaultAttackBuff = null;
          }
          const exRes = rollExploit(s, dmg);
          dmg = exRes.dmg;
          const exploited = exRes.exploited;
          dmg = Math.floor(dmg * computeLawDamageBonus(s));
          dmg = Math.floor(dmg * (s.stats?.damageMult ?? 1));
          // Metal Set 3 4-piece: 30% chance attacks bypass all defenses.
          const bypass = (s.stats?.setFlags?.attackBypassDefenseChance ?? 0) > 0
            && Math.random() * 100 < s.stats.setFlags.attackBypassDefenseChance;
          if (!bypass) {
            const armour    = s.eDef ?? 0;
            const totalPen  = resolveDefPen(s, { exploited });
            const effArmour = Math.max(0, armour * (1 - totalPen));
            dmg = applyArmourMitigation(dmg, effArmour);
          }
          tickExposeBuff(s, 'player');
          s.eHp = Math.max(0, s.eHp - dmg);
          const lifestealPct = s.stats?.lifestealPct ?? 0;
          if (lifestealPct > 0 && dmg > 0) {
            const heal = Math.max(1, Math.floor(dmg * lifestealPct / 100));
            s.pHp = Math.min(s.pMaxHp, s.pHp + heal);
          }
          logs.push({
            msg: exploited
              ? `Basic attack → EXPLOIT! ${dmg.toLocaleString()} dmg`
              : `Basic attack → ${dmg.toLocaleString()} dmg`,
            kind: 'damage',
          });
          spawnDamageNumberRef.current?.(dmg, 'enemy', s.eMaxHp, { exploit: exploited });
          if (exploited) {
            s.lastExploitAt = performance.now() / 1000;
            dispatchTrigger(s, 'on_exploit_fired', { amount: dmg });
          }
          dispatchTrigger(s, 'on_default_attack_fired', { amount: dmg });
        }

        // ── First ready technique fires alongside the basic attack ──────────
        for (let i = 0; i < s.cds.length; i++) {
          if (!isFinite(s.cds[i]) || s.cds[i] > 0) continue;
          const tech = s.equipped[i];
          if (!tech) continue;
          // Heal threshold: 50% by default; sets can override to 70%.
          const healThreshold = s.stats?.setFlags?.healAt70Pct ? 0.7 : 0.5;
          if (tech.type === 'Heal' && s.pHp > s.pMaxHp * healThreshold) continue;
          // Forbid flags from earth ("cannot heal") / metal-set ("cannot use attack secrets") / fire ("cannot exploit" — handled in rollExploit).
          if (tech.type === 'Heal'   && (s.stats?.lawFlags?.cannotHeal || s.stats?.setFlags?.cannotHeal)) continue;
          if (tech.type === 'Attack' && (s.stats?.lawFlags?.cannotUseAttackSecrets || s.stats?.setFlags?.cannotUseAttackSecrets)) continue;

          s.castCount += 1;
          const freeEvery   = s.stats?.freeCastEvery ?? 0;
          const freeChance  = s.stats?.freeCastChancePct ?? 0;
          const isFreeTree  = freeEvery > 0 && (s.castCount % freeEvery === 0);
          const isFreeChance = freeChance > 0 && Math.random() * 100 < freeChance;
          const isFree = isFreeTree || isFreeChance;
          s.cds[i]   = isFree ? 0 : s.maxCds[i];

          // Set 4-piece "Secret techniques trigger twice" — fires the same tech
          // execution path a second time. Skipped for Heal/Defend/Dodge/Expose
          // for now (would feel weird; user can scope this later).
          const doubleAttack = !!s.stats?.setFlags?.doubleSecretTechs && tech.type === 'Attack';
          const fires = doubleAttack ? 2 : 1;

          // Killing-stride: consumed by the first cast only.
          const stride = strideRef.current;
          strideRef.current = false;

          for (let cast = 0; cast < fires; cast++) {
            executeTechnique(s, tech, i, logs, { stride: cast === 0 ? stride : false });
          }

          // Any technique cast clears the fire double-strike buff.
          if (s.defaultAttackBuff) s.defaultAttackBuff = null;

          dispatchTrigger(s, 'on_secret_tech_fired', { sourceIdx: i, techType: tech.type });
          break; // one technique per turn
        }

        s._triggerLog = null;

        if (debugRef.current.oneShot && s.eHp > 0) s.eHp = 0;
        if (debugRef.current.watchMode && s.eHp <= 0) s.eHp = 1;

        if (logs.length) setLog(prev => [...logs, ...prev].slice(0, MAX_LOG));

        playerAttackRef.current?.();
        patchBars(s);

        playerAnimDoneRef.current = () => {
          const s2 = stateRef.current;
          if (s2.phase !== 'fighting') return;
          if (s2.eHp <= 0) {
            s2.phase = 'won';
            if (s2.stats?.killingStride) strideRef.current = true;
            if (s2.stats?.regionKillBonus) {
              killsForHuntRef.current += 1;
              if (killsForHuntRef.current >= 10) {
                killsForHuntRef.current = 0;
                huntBumpsPendingRef.current += 1;
              }
            }
            dispatchTrigger(s2, 'on_enemy_killed', {});

            const newLogs = [{ msg: 'Enemy defeated! Victory!', kind: 'system' }];

            const lootMult = 1 + (s2.stats?.allLootBonusPct ?? 0);
            const dropped = rollDrops(s2.enemyDrops).map(d =>
              lootMult !== 1 ? { ...d, qty: Math.max(1, Math.floor(d.qty * lootMult)) } : d);
            if (dropped.length > 0) {
              onDropsRef.current?.(dropped);
              spawnDropsRef.current?.(dropped);
              const dropMsg = dropped
                .map(d => `${d.qty}× ${ALL_MATERIALS[d.itemId]?.name ?? d.itemId}`)
                .join(', ');
              newLogs.unshift({ msg: `Drops: ${dropMsg}`, kind: 'system' });
            }

            if (s2.techDropChance > 0 && Math.random() < s2.techDropChance) {
              const tech = pickTechnique(s2.worldId);
              if (tech) {
                onTechniqueDropRef.current?.(tech);
                newLogs.unshift({ msg: `Scroll found: ${tech.name} (${tech.quality} ${tech.type})`, kind: 'technique' });
              }
            }

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

      // ── Enemy's turn ─────────────────────────────────────────────────────
      if (s.turnPhase === 'enemy_turn') {
        s.turnPhase = 'waiting_enemy';
        const logs = [];
        s._triggerLog = logs;

        const dodgeActive = s.dodgeBuff.attacksLeft > 0;
        const defActive   = s.defBuff.attacksLeft   > 0;

        // Dodge chance: passive dodge_chance stat + transient bonus (wood
        // "+5% per hit taken") − dodge-stack reduction (wood "Each dodge
        // increases defenses by 30%, decreases dodge chance by 5%").
        const reductionPerStack = s.stats?.lawFlags?.dodgeReductionPerDodgeStack ?? 0;
        const passiveDodgePct = Math.max(0,
          (s.stats?.dodgeChancePct ?? 0)
          + (s.transientDodgeBonus ?? 0)
          - (s.dodgeStacks ?? 0) * reductionPerStack
        );
        const passiveDodgeRoll = passiveDodgePct > 0 && Math.random() * 100 < passiveDodgePct;

        // ── Pre-hit consumed flags ─────────────────────────────────────────
        const nullsThisHit = s.nextEnemyHitNulls === true;
        if (nullsThisHit) s.nextEnemyHitNulls = false;

        const finishDodge = () => {
          s.lastDodgeAtSec = performance.now() / 1000;
          s.transientDodgeBonus = 0;
          // Wood Set 2 4-piece: dodging arms the next attack as a guaranteed exploit.
          if (s.stats?.setFlags?.nextHitExploitOnDodge) s.nextHitExploit = true;
          // Wood Set 3 4-piece: take % of hit damage even on dodge.
          const partialPct = s.stats?.setFlags?.dodgeTakesPctDamage ?? 0;
          if (partialPct > 0) {
            const partial = Math.max(1, Math.floor(s.eAtk * partialPct));
            s.pHp = Math.max(0, s.pHp - partial);
            logs.push({ msg: `Partial hit on dodge → −${partial} HP`, kind: 'damage-taken' });
          }
          dispatchTrigger(s, 'on_dodge_success', {});
        };

        if (nullsThisHit) {
          logs.push({ msg: 'Enemy attack — nullified by healing!', kind: 'dodge' });
          finishDodge();
        } else if (dodgeActive && Math.random() < s.dodgeBuff.chance) {
          logs.push({ msg: 'Enemy attack — dodged!', kind: 'dodge' });
          finishDodge();
        } else if (passiveDodgeRoll) {
          logs.push({ msg: 'Enemy attack — dodged!', kind: 'dodge' });
          finishDodge();
        } else if (debugRef.current.godMode) {
          logs.push({ msg: 'Enemy attack — negated (god mode)', kind: 'dodge' });
        } else {
          // ── Enemy hit lands ─────────────────────────────────────────────
          const defMult = defActive ? s.defBuff.mult : 1;
          let rawDef;
          if (s.eDmgType === 'elemental') {
            rawDef = s.stats?.elementalDefense ?? 0;
          } else {
            rawDef = s.stats?.defense ?? 0;
          }
          // Wood law: defense is added per dodge stack (each stack = +30% defense).
          const stackDefMult = 1 + (s.dodgeStacks ?? 0) * (s.stats?.lawFlags?.defensePerDodgeStack ?? 0);
          // Wood Set 3 2-piece: defense scales with dodge chance (defense × (1 + dodgePct)).
          const dodgeScale = s.stats?.setFlags?.defenseScalesWithDodgeChance
            ? 1 + ((s.stats?.dodgeChancePct ?? 0) / 100)
            : 1;
          const armour = Math.max(1, rawDef * defMult * stackDefMult * dodgeScale);
          const reduction = resolveIncomingDmgReduction(s);
          const preDef = Math.max(1, Math.floor(s.eAtk * (1 - reduction)));
          const postArmour = applyArmourMitigation(preDef, armour);
          const mitigated = Math.max(0, preDef - postArmour);

          let dmg = postArmour;
          if (s.stats?.undyingResolve && !s.undyingUsed && postArmour >= s.pHp) {
            dmg = Math.max(0, s.pHp - 1);
            s.undyingUsed = true;
            logs.push({ msg: 'UNDYING RESOLVE — survived at 1 HP!', kind: 'system' });
          }
          s.pHp = Math.max(0, s.pHp - dmg);

          // Earth law: "50% of mitigated damage is retaliated"
          const retaliatePct = s.stats?.lawFlags?.retaliateMitigatedPct ?? 0;
          if (retaliatePct > 0 && mitigated > 0) {
            const reflected = Math.max(1, Math.floor(mitigated * retaliatePct));
            s.eHp = Math.max(0, s.eHp - reflected);
            logs.push({ msg: `Retaliated ${reflected} dmg`, kind: 'damage' });
          }
          // Earth Set 3 4-piece: heal a fraction of mitigated damage.
          const bleedPct = s.stats?.setFlags?.defenseModsBleedToHealthPct ?? 0;
          if (bleedPct > 0 && mitigated > 0 && s.pHp < s.pMaxHp) {
            const heal = Math.max(1, Math.floor(mitigated * bleedPct));
            s.pHp = Math.min(s.pMaxHp, s.pHp + heal);
            logs.push({ msg: `Stoneblood → +${heal} HP from mitigation`, kind: 'heal' });
          }
          // Reflect (carried over from existing lifesteal/reflect plumbing).
          const reflectPct = s.stats?.reflectPct ?? 0;
          if (reflectPct > 0 && dmg > 0) {
            const reflected = Math.max(1, Math.floor(dmg * reflectPct / 100));
            s.eHp = Math.max(0, s.eHp - reflected);
            logs.push({ msg: `Reflected ${reflected} dmg`, kind: 'damage' });
          }
          logs.push({ msg: `Enemy hits → −${dmg.toLocaleString()} HP`, kind: 'damage-taken' });
          spawnDamageNumberRef.current?.(dmg, 'player', s.pMaxHp);

          // Wood law: dodge stack reset on hit; transient bonus may also reset.
          if (s.stats?.lawFlags?.dodgeStackResetOnHit) s.dodgeStacks = 0;

          dispatchTrigger(s, 'on_hit_taken', { amount: dmg });
        }

        if (dodgeActive) s.dodgeBuff.attacksLeft -= 1;
        if (defActive)   s.defBuff.attacksLeft   -= 1;
        tickExposeBuff(s, 'enemy');

        s._triggerLog = null;
        if (logs.length) setLog(prev => [...logs, ...prev].slice(0, MAX_LOG));

        enemyAttackRef.current?.();
        patchBars(s);

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
    setLog([]);
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
    huntBumpsPendingRef,
  };
}

// ─── Helpers extracted from the player-turn block ─────────────────────────────

/** Execute a single technique. Mutates state, pushes a log entry. */
function executeTechnique(s, tech, slotIdx, logs, { stride = false } = {}) {
  if (tech.type === 'Attack') {
    let dmg = calcDamage(tech, s.stats?.damageStats ?? null);
    const exRes = rollExploit(s, dmg, { stride });
    dmg = exRes.dmg;
    const exploited = exRes.exploited;
    if (stride) dmg = Math.floor(dmg * 1.5);
    dmg = Math.floor(dmg * computeLawDamageBonus(s, { tech }));
    dmg = Math.floor(dmg * (s.stats?.damageMult ?? 1));
    {
      const bypass = (s.stats?.setFlags?.attackBypassDefenseChance ?? 0) > 0
        && Math.random() * 100 < s.stats.setFlags.attackBypassDefenseChance;
      if (!bypass) {
        // 2026-04-27: damageType replaced by physMult + elemMult coefficients.
        // Enemy armour is the weighted average of phys + elem armour stats,
        // weighted by the technique's mults. Pure-physical tech (1.0/0)
        // faces only eDef; mixed (1.0/1.0) faces 50/50 of both.
        const pm = tech.physMult ?? 0;
        const em = tech.elemMult ?? 0;
        const totalMults = pm + em;
        const armour = totalMults > 0
          ? ((pm * (s.eDef ?? 0)) + (em * (s.eElemDef ?? 0))) / totalMults
          : (s.eDef ?? 0);
        const totalPen  = resolveDefPen(s, { exploited });
        const effArmour = Math.max(0, armour * (1 - totalPen));
        dmg = applyArmourMitigation(dmg, effArmour);
      }
    }
    tickExposeBuff(s, 'player');
    s.eHp = Math.max(0, s.eHp - dmg);
    const lifestealPct = s.stats?.lifestealPct ?? 0;
    if (lifestealPct > 0 && dmg > 0) {
      const heal = Math.max(1, Math.floor(dmg * lifestealPct / 100));
      s.pHp = Math.min(s.pMaxHp, s.pHp + heal);
    }
    logs.push({
      msg: exploited
        ? `${tech.name} → EXPLOIT! ${dmg.toLocaleString()} dmg`
        : `${tech.name} → ${dmg.toLocaleString()} dmg`,
      kind: 'damage',
    });
    if (exploited) {
      s.lastExploitAt = performance.now() / 1000;
      dispatchTrigger(s, 'on_exploit_fired', { amount: dmg });
    }
  } else if (tech.type === 'Heal') {
    // 2026-04-27: Heal also scales with phys + elem damage stats via the
    // same physMult / elemMult coefficients used by Attack. Adds a flat
    // bonus on top of the maxHP-percent base, then healing_received scales
    // the whole thing.
    const baseHealPct = s.pMaxHp * (tech.healPercent ?? 0.25);
    const dStats = s.stats?.damageStats ?? {};
    const physBonus = (tech.physMult ?? 0) * (dStats.physical  ?? 0);
    const elemBonus = (tech.elemMult ?? 0) * (dStats.elemental ?? 0);
    const healMult  = 1 + (s.stats?.healingReceivedPct ?? 0);
    const heal      = Math.floor((baseHealPct + physBonus + elemBonus) * healMult);
    s.pHp = Math.min(s.pMaxHp, s.pHp + heal);
    logs.push({ msg: `${tech.name} → +${heal.toLocaleString()} HP`, kind: 'heal' });
    dispatchTrigger(s, 'on_heal', { amount: heal, sourceIdx: slotIdx });
  } else if (tech.type === 'Defend') {
    const extra   = s.stats?.lawFlags?.defendBuffExtraHits ?? 0;
    const atks    = resolveBuffAttacks((tech.buffAttacks ?? 3) + extra, s.stats);
    const effMult = 1 + (s.stats?.buffEffectMult ?? 0);
    const defMult = (tech.defMult ?? 1.5) * effMult;
    s.defBuff = { mult: defMult, attacksLeft: atks };
    logs.push({ msg: `${tech.name} → DEF ×${defMult.toFixed(2)} (${atks} hits)`, kind: 'buff' });
  } else if (tech.type === 'Dodge') {
    const extra   = s.stats?.lawFlags?.dodgeBuffExtraHits ?? 0;
    const atks    = resolveBuffAttacks((tech.buffAttacks ?? 3) + extra, s.stats);
    const effMult = 1 + (s.stats?.buffEffectMult ?? 0);
    const chance  = Math.min(1, (tech.dodgeChance ?? 0.4) * effMult);
    s.dodgeBuff = { chance, attacksLeft: atks };
    logs.push({ msg: `${tech.name} → ${Math.round(chance * 100)}% dodge (${atks} hits)`, kind: 'buff' });
  } else if (tech.type === 'Expose') {
    const extra      = s.stats?.lawFlags?.exposeBuffExtraHits ?? 0;
    const playerAtks = resolveBuffAttacks((tech.buffPlayerAttacks ?? 0) + extra, s.stats);
    const enemyAtks  = resolveBuffAttacks((tech.buffEnemyAttacks  ?? 0) + extra, s.stats);
    s.exposeBuff = {
      exploitChance:     tech.exploitChance ?? 0,
      exploitMult:       tech.exploitMult,
      defPen:            tech.defPen ?? 0,
      dmgReduction:      tech.dmgReduction ?? 0,
      playerAttacksLeft: tech.buffPlayerAttacks ? playerAtks : 0,
      enemyAttacksLeft:  tech.buffEnemyAttacks  ? enemyAtks  : 0,
    };
    const parts = [];
    if (tech.exploitChance) parts.push(`+${tech.exploitChance}% exploit`);
    if (tech.defPen)        parts.push(`${Math.round(tech.defPen * 100)}% def pen`);
    if (tech.exploitMult)   parts.push(`exploit ×${(tech.exploitMult/100).toFixed(2)}`);
    if (tech.dmgReduction)  parts.push(`${Math.round(tech.dmgReduction * 100)}% dmg red`);
    const charges = [
      tech.buffPlayerAttacks ? `${playerAtks} player` : null,
      tech.buffEnemyAttacks  ? `${enemyAtks} enemy`   : null,
    ].filter(Boolean).join(' / ');
    logs.push({ msg: `${tech.name} → ${parts.join(', ')} (${charges} hits)`, kind: 'buff' });
  }
}
