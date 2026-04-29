/**
 * Technique catalogue schema (src/data/techniques.js).
 *
 * 60 hand-authored techniques across 5 qualities × 5 types. The header of
 * the data file documents the full field list; the schema below mirrors it.
 *
 * Many fields are type-specific. Leaving an irrelevant field blank is safe
 * — the engine treats absent values as no-effect.
 */

const TYPE_OPTIONS = [
  { value: 'Attack', label: 'Attack' },
  { value: 'Heal',   label: 'Heal' },
  { value: 'Defend', label: 'Defend' },
  { value: 'Dodge',  label: 'Dodge' },
  { value: 'Expose', label: 'Expose' },
];

const QUALITY_OPTIONS = [
  { value: 'Iron',         label: 'Iron' },
  { value: 'Bronze',       label: 'Bronze' },
  { value: 'Silver',       label: 'Silver' },
  { value: 'Gold',         label: 'Gold' },
  { value: 'Transcendent', label: 'Transcendent' },
];

const FILTER_OPTIONS = [
  { value: '',       label: '— all —' },
  { value: 'all',    label: 'all' },
  { value: 'Attack', label: 'Attack' },
];

export default [
  // ── Identity ─────────────────────────────────────────────────────────────
  { key: 'id',       type: 'string', label: 'Id (immutable)',
    help: 'Stable identifier. Drop instances carry suffixed ids; the base id must remain stable.' },
  { key: 'name',     type: 'string', label: 'Display name' },
  { key: 'icon',     type: 'string', label: 'Icon (emoji)' },
  { key: 'type',     type: 'enum',   label: 'Type',    options: TYPE_OPTIONS },
  { key: 'quality',  type: 'enum',   label: 'Quality', options: QUALITY_OPTIONS,
    help: 'Identity + colour only — does NOT reduce cooldown.' },
  { key: 'flavour',  type: 'textarea', label: 'Flavour text', rows: 2 },
  { key: 'cooldown', type: 'number', label: 'Cooldown (s)', min: 0, step: 0.1 },

  // ── Attack / Heal damage scaling ─────────────────────────────────────────
  { key: 'bonus',    type: 'number', label: 'Bonus (flat damage / heal)', step: 1 },
  { key: 'physMult', type: 'number', label: 'Physical mult', step: 0.1,
    help: 'Multiplied into player physical damage stat.' },
  { key: 'elemMult', type: 'number', label: 'Elemental mult', step: 0.1,
    help: 'Multiplied into player elemental damage stat.' },

  // ── Heal-only ────────────────────────────────────────────────────────────
  { key: 'healPercent', type: 'number', label: 'Heal % of maxHP', min: 0, max: 1, step: 0.01,
    help: 'Heal techs: fraction of player maxHP healed (0..1). 0.20 = 20%.' },

  // ── Defend ───────────────────────────────────────────────────────────────
  { key: 'defMult',     type: 'number', label: 'Defense mult (Defend)', step: 0.05 },
  { key: 'buffAttacks', type: 'number', label: 'Buff lasts N attacks (Defend / Dodge)', min: 0, step: 1 },

  // ── Dodge ────────────────────────────────────────────────────────────────
  { key: 'dodgeChance', type: 'number', label: 'Dodge chance %', min: 0, max: 100, step: 1 },

  // ── Expose ───────────────────────────────────────────────────────────────
  { key: 'exploitChance',     type: 'number', label: 'Exploit chance %', min: 0, max: 100, step: 1 },
  { key: 'exploitMult',       type: 'number', label: 'Exploit damage %', min: 0, step: 1 },
  { key: 'defPen',            type: 'number', label: 'Defense penetration', step: 1 },
  { key: 'dmgReduction',      type: 'number', label: 'Damage reduction', step: 0.05 },
  { key: 'buffPlayerAttacks', type: 'number', label: 'Buff lasts N player attacks', min: 0, step: 1 },
  { key: 'buffEnemyAttacks',  type: 'number', label: 'Buff lasts N enemy attacks',  min: 0, step: 1 },

  // ── Special-logic flags (all optional) ───────────────────────────────────
  { key: 'damageFromMaxHpPct',          type: 'number', label: 'Damage from maxHP %', min: 0, max: 1, step: 0.01,
    help: 'Attack: + pct × maxHP added as flat damage.' },
  { key: 'damageFromDefensePct',        type: 'number', label: 'Damage from defense %', min: 0, max: 1, step: 0.01 },
  { key: 'damageFromElemDefensePct',    type: 'number', label: 'Damage from elem defense %', min: 0, max: 1, step: 0.01 },
  { key: 'healDealEnemyDamagePctOfHeal', type: 'number', label: 'On heal, damage enemy by % of heal', min: 0, max: 2, step: 0.05 },
  { key: 'nextDodgeHealPct',            type: 'number', label: 'Arm: next dodge heals % of maxHP', min: 0, max: 1, step: 0.01 },
  { key: 'nextHealDoubled',             type: 'boolean', label: 'Arm: next Heal cast doubled' },
  { key: 'cdReductionOnCastPct',        type: 'number', label: 'On cast, reduce other CDs by %', min: 0, max: 1, step: 0.05 },
  { key: 'cdReductionOnCastFilter',     type: 'enum',   label: 'CD reduction filter', options: FILTER_OPTIONS },
  { key: 'healOnCastPct',               type: 'number', label: 'Defend: heal % of maxHP on cast', min: 0, max: 1, step: 0.01 },

  // ── Defend buff modifiers (active while buff up) ─────────────────────────
  { key: 'defendBuffIncomingDmgReduction', type: 'number', label: 'Defend buff: + flat dmg reduction',  min: 0, max: 1, step: 0.05 },
  { key: 'defendBuffDodgeChance',          type: 'number', label: 'Defend buff: + passive dodge %',     min: 0, max: 100, step: 1 },
  { key: 'defendBuffMitigatedHealPct',     type: 'number', label: 'Defend buff: heal % of mitigated',   min: 0, max: 1, step: 0.05 },

  // ── Dodge buff modifiers (active while buff up) ──────────────────────────
  { key: 'dodgeBuffDefMult',                  type: 'number', label: 'Dodge buff: × player defenses', step: 0.05 },
  { key: 'dodgeBuffOnSuccessHealPct',         type: 'number', label: 'Dodge buff: heal % on dodge success', min: 0, max: 1, step: 0.01 },
  { key: 'dodgeBuffOnSuccessDamageBuffPct',   type: 'number', label: 'Dodge buff: arm one-shot dmg buff %',  min: 0, max: 5, step: 0.05 },
  { key: 'dodgeBuffReflectDamage',            type: 'boolean', label: 'Dodge buff: reflect would-have damage' },
  { key: 'dodgeBuffOnSuccessCdReductionPct',  type: 'number', label: 'Dodge buff: CD reduction on dodge %', min: 0, max: 1, step: 0.05 },

  // ── Expose buff modifiers (active while buff up) ─────────────────────────
  { key: 'exposeBuffMitigatedReflectPct', type: 'number', label: 'Expose buff: reflect % of mitigated', min: 0, max: 1, step: 0.05 },
  { key: 'exposeBuffUseMaxDefense',       type: 'boolean', label: 'Expose buff: enemy uses max(def, elemDef)' },
  { key: 'exposeBuffApplyToAttack',       type: 'boolean', label: 'Expose buff: also applies to Attack secrets' },
];
