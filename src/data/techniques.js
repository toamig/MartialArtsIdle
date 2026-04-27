// ─── Quality tiers ────────────────────────────────────────────────────────────
export const TECHNIQUE_QUALITY = {
  Iron:         { label: 'Iron',         color: '#9ca3af', cdMult: 1.00 },
  Bronze:       { label: 'Bronze',       color: '#cd7f32', cdMult: 0.90 },
  Silver:       { label: 'Silver',       color: '#c0c0c0', cdMult: 0.80 },
  Gold:         { label: 'Gold',         color: '#f5c842', cdMult: 0.70 },
  Transcendent: { label: 'Transcendent', color: '#c084fc', cdMult: 0.55 },
};

// ─── Rank definitions ─────────────────────────────────────────────────────────
// minRealmIndex matches REALMS array in realms.js
// Techniques are available from the start; rank gates which you can equip.
export const TECHNIQUE_RANK = {
  Mortal:   { label: 'Mortal',   minRealmIndex: 0  },  // Tempered Body
  Earth:    { label: 'Earth',    minRealmIndex: 10 },  // Qi Transformation
  Sky:      { label: 'Sky',      minRealmIndex: 18 },  // Separation & Reunion
  Saint:    { label: 'Saint',    minRealmIndex: 24 },  // Saint
  Emperor:  { label: 'Emperor',  minRealmIndex: 36 },  // Void King
  Heaven:   { label: 'Heaven',   minRealmIndex: 45 },  // Open Heaven
};

export const TYPE_COLOR = {
  Attack: '#ef4444',
  Heal:   '#4ade80',
  Defend: '#60a5fa',
  Dodge:  '#facc15',
  Expose: '#a78bfa',
};

// ─── Unique technique catalogue ──────────────────────────────────────────────
//
// Hand-authored 60-entry pool (12 per quality × 5 qualities), each with all
// fields explicit — no scaffold defaults. A blank field = no effect.
//
// Catalogue mirror lives in `obsidian/Secret Technique Catalogue.md`. When
// editing values here, keep both in sync (per "Keep code and docs in parity"
// project rule).
//
// Quality is identity (Iron Sword Slash and Bronze Sword Slash are different
// entries with their own ids); rank is assigned per-drop from world tier
// (W1=Mortal … W6=Heaven). A single Iron entry can manifest at any rank.
//
// Per-quality distribution:
//   4 Attack + 2 Heal + 2 Defend + 2 Dodge + 2 Expose
//
// ── Schema ──
//   id, name, type, quality, flavour, cooldown   (always present)
//   bonus, physMult, elemMult                    (Attack + Heal damage / heal scaling)
//   healPercent                                  (Heal: fraction of maxHP)
//   defMult, buffAttacks                         (Defend)
//   dodgeChance, buffAttacks                     (Dodge)
//   exploitChance, exploitMult, defPen,
//     dmgReduction, buffPlayerAttacks,
//     buffEnemyAttacks                           (Expose)
//   ── Special-logic fields (all optional, absent = no effect) ──
//   damageFromMaxHpPct          Attack: + pct × maxHP  flat damage
//   damageFromDefensePct        Attack: + pct × defense flat damage
//   damageFromElemDefensePct    Attack: + pct × elemDef flat damage
//   healDealEnemyDamagePctOfHeal  Heal:  on heal, also damage enemy by pct of heal
//   nextDodgeHealPct            Heal:  arms a one-shot heal-on-next-dodge of pct of maxHP
//   nextHealDoubled             Heal:  arms a one-shot 2× multiplier on next Heal cast
//   cdReductionOnCastPct        any:   on cast, reduce other slot cooldowns by pct
//   cdReductionOnCastFilter     any:   'Attack' | 'all'  (default 'all')
//   healOnCastPct               Defend: on cast, heal pct of maxHP
//   defendBuffIncomingDmgReduction   Defend buff: + pct flat incoming-dmg reduction while active
//   defendBuffDodgeChance       Defend buff: + pct passive dodge chance while active
//   defendBuffMitigatedHealPct  Defend buff: heal pct of mitigated dmg per hit while active
//   dodgeBuffDefMult            Dodge buff: × mult on player defenses while active
//   dodgeBuffOnSuccessHealPct   Dodge buff: on each successful dodge, heal pct of maxHP
//   dodgeBuffOnSuccessDamageBuffPct  Dodge buff: on dodge, arm one-shot dmg buff for next attack
//   dodgeBuffReflectDamage      Dodge buff: on dodge, reflect would-have-been damage to enemy
//   dodgeBuffOnSuccessCdReductionPct  Dodge buff: on dodge, reduce all CDs by pct
//   exposeBuffMitigatedReflectPct  Expose buff: reflect pct of mitigated dmg to enemy
//   exposeBuffUseMaxDefense     Expose buff: enemy hit uses max(def, elemDef) regardless of dmg type
//   exposeBuffApplyToAttack     Expose buff: opt INTO Attack secret techs (default OFF — basic attacks only)

export const TECHNIQUES = [
  // ─── Iron ──────────────────────────────────────────────────────────────────
  // Attack
  {
    id: 'iron_attack_1', name: 'Iron Fist', type: 'Attack', quality: 'Iron',
    flavour: 'A fist tempered to iron; the simplest blow is also the truest.',
    cooldown: 5.0,
    bonus: 100, physMult: 1.0, elemMult: 0,
  },
  {
    id: 'iron_attack_2', name: 'Flame Palm', type: 'Attack', quality: 'Iron',
    flavour: 'A palm warmed by inner fire; flesh recoils where qi sears.',
    cooldown: 5.0,
    bonus: 100, physMult: 0, elemMult: 1.0,
  },
  {
    id: 'iron_attack_3', name: 'Flaming Slash', type: 'Attack', quality: 'Iron',
    flavour: 'Steel and ember in the same arc.',
    cooldown: 5.5,
    bonus: 0, physMult: 0.6, elemMult: 0.6,
  },
  {
    id: 'iron_attack_4', name: 'Spiked Shell', type: 'Attack', quality: 'Iron',
    flavour: 'Turn your own guard outward; what protects you wounds him.',
    cooldown: 5.5,
    bonus: 0, physMult: 0, elemMult: 0,
    damageFromDefensePct: 0.20,
  },
  // Heal
  {
    id: 'iron_heal_1', name: 'Apply Bandage', type: 'Heal', quality: 'Iron',
    flavour: 'A simple cloth, pressed firm. Time and pressure mend most things.',
    cooldown: 6.0,
    healPercent: 0.10, physMult: 0, elemMult: 0,
  },
  {
    id: 'iron_heal_2', name: 'Healing Hand', type: 'Heal', quality: 'Iron',
    flavour: 'Channeled qi binds tissue with a touch.',
    cooldown: 6.5,
    healPercent: 0, physMult: 0, elemMult: 1.0,
  },
  // Defend
  {
    id: 'iron_defend_1', name: 'Stone Stance', type: 'Defend', quality: 'Iron',
    flavour: 'Plant your feet; the stone beneath you remembers every blow it has weathered.',
    cooldown: 6.5,
    defMult: 1.4, buffAttacks: 2,
  },
  {
    id: 'iron_defend_2', name: 'Iron Bark Form', type: 'Defend', quality: 'Iron',
    flavour: 'Bark thickens, slow and unyielding; what cannot pierce will not stop.',
    cooldown: 7.0,
    defMult: 1.2, buffAttacks: 4,
  },
  // Dodge
  {
    id: 'iron_dodge_1', name: 'Lithe Step', type: 'Dodge', quality: 'Iron',
    flavour: 'A reed in the wind that the storm cannot grasp.',
    cooldown: 6.5,
    dodgeChance: 0.15, buffAttacks: 3,
  },
  {
    id: 'iron_dodge_2', name: 'Coiled Sway', type: 'Dodge', quality: 'Iron',
    flavour: 'Bend low and the strike passes overhead — and your guard tightens with it.',
    cooldown: 7.0,
    dodgeChance: 0.20, buffAttacks: 2,
    dodgeBuffDefMult: 1.2,
  },
  // Expose
  {
    id: 'iron_expose_1', name: 'Read the Opening', type: 'Expose', quality: 'Iron',
    flavour: 'Watch his ribs as they rise. There is the gap.',
    cooldown: 6.0,
    exploitChance: 15, defPen: 0, buffPlayerAttacks: 3,
  },
  {
    id: 'iron_expose_2', name: 'Settle the Mind', type: 'Expose', quality: 'Iron',
    flavour: 'Calm flesh receives less force.',
    cooldown: 6.5,
    dmgReduction: 0.20, buffEnemyAttacks: 3,
  },

  // ─── Bronze ────────────────────────────────────────────────────────────────
  // Attack
  {
    id: 'bronze_attack_1', name: 'Steel Fist', type: 'Attack', quality: 'Bronze',
    flavour: 'An older blow, refined; the body forgets nothing it has practiced.',
    cooldown: 5.0,
    bonus: 500, physMult: 1.5, elemMult: 0,
  },
  {
    id: 'bronze_attack_2', name: 'Water Jet', type: 'Attack', quality: 'Bronze',
    flavour: 'A pressed stream cuts where the open river only soothes.',
    cooldown: 5.0,
    bonus: 500, physMult: 0, elemMult: 1.5,
  },
  {
    id: 'bronze_attack_3', name: 'Heart Furnace Strike', type: 'Attack', quality: 'Bronze',
    flavour: 'Burn your own life as fuel; the blow lands with the weight of a beating heart.',
    cooldown: 5.5,
    bonus: 0, physMult: 0.2, elemMult: 0.2,
    damageFromMaxHpPct: 0.20,
  },
  {
    id: 'bronze_attack_4', name: 'Mirror Lance', type: 'Attack', quality: 'Bronze',
    flavour: 'What shielded you returns as a piercing edge.',
    cooldown: 5.5,
    bonus: 0, physMult: 0, elemMult: 0,
    damageFromElemDefensePct: 0.30,
  },
  // Heal
  {
    id: 'bronze_heal_1', name: 'Steady Breath', type: 'Heal', quality: 'Bronze',
    flavour: 'A long breath, drawn from the dantian; flesh knits where it idles.',
    cooldown: 6.0,
    healPercent: 0.15, physMult: 0, elemMult: 0,
  },
  {
    id: 'bronze_heal_2', name: 'Convergent Stream', type: 'Heal', quality: 'Bronze',
    flavour: 'Inner currents pool to where the body is broken.',
    cooldown: 6.5,
    healPercent: 0, physMult: 0.7, elemMult: 0.7,
  },
  // Defend
  {
    id: 'bronze_defend_1', name: 'Tempered Aegis', type: 'Defend', quality: 'Bronze',
    flavour: 'A guard raised in earnest also nourishes the bearer.',
    cooldown: 6.5,
    defMult: 1.6, buffAttacks: 2,
    healOnCastPct: 0.05,
  },
  {
    id: 'bronze_defend_2', name: 'Patient Wall', type: 'Defend', quality: 'Bronze',
    flavour: 'Stand long; let the sword tire on you.',
    cooldown: 7.0,
    defMult: 1.4, buffAttacks: 4,
  },
  // Dodge
  {
    id: 'bronze_dodge_1', name: 'Crescent Slide', type: 'Dodge', quality: 'Bronze',
    flavour: 'A shallow arc; the strike misses by a hair.',
    cooldown: 6.5,
    dodgeChance: 0.25, buffAttacks: 3,
  },
  {
    id: 'bronze_dodge_2', name: 'Counter Step', type: 'Dodge', quality: 'Bronze',
    flavour: 'Slip the strike, then step in. The blade meets bare flesh.',
    cooldown: 7.0,
    dodgeChance: 0.30, buffAttacks: 2,
    dodgeBuffOnSuccessDamageBuffPct: 0.30,
  },
  // Expose
  {
    id: 'bronze_expose_1', name: 'Glaring Pin', type: 'Expose', quality: 'Bronze',
    flavour: 'A cold stare fixes the gap; weakness widens under it.',
    cooldown: 6.0,
    exploitChance: 20, defPen: 0.10, buffPlayerAttacks: 2,
  },
  {
    id: 'bronze_expose_2', name: 'Veiled Stance', type: 'Expose', quality: 'Bronze',
    flavour: 'He cannot harm what he cannot read.',
    cooldown: 6.5,
    dmgReduction: 0.25, buffEnemyAttacks: 3,
  },

  // ─── Silver ────────────────────────────────────────────────────────────────
  // Attack
  {
    id: 'silver_attack_1', name: 'Steel Slash', type: 'Attack', quality: 'Silver',
    flavour: 'Forged stance, polished arc — the cut writes itself.',
    cooldown: 5.0,
    bonus: 2000, physMult: 2.0, elemMult: 0,
  },
  {
    id: 'silver_attack_2', name: 'Blooming Lotus', type: 'Attack', quality: 'Silver',
    flavour: 'Petals open one by one — and each is a wound.',
    cooldown: 5.0,
    bonus: 2000, physMult: 0, elemMult: 2.0,
  },
  {
    id: 'silver_attack_3', name: 'Twin Crescents', type: 'Attack', quality: 'Silver',
    flavour: 'Steel and qi together; one path, two cuts.',
    cooldown: 5.5,
    bonus: 0, physMult: 1.5, elemMult: 1.5,
  },
  {
    id: 'silver_attack_4', name: 'Quickening Strike', type: 'Attack', quality: 'Silver',
    flavour: 'The first blow shortens the second; rhythm overtakes form.',
    cooldown: 5.5,
    bonus: 0, physMult: 1.0, elemMult: 1.0,
    cdReductionOnCastPct: 0.30, cdReductionOnCastFilter: 'Attack',
  },
  // Heal
  {
    id: 'silver_heal_1', name: 'Restorative Pulse', type: 'Heal', quality: 'Silver',
    flavour: 'A pulse of wholeness sent through the meridians.',
    cooldown: 6.0,
    healPercent: 0.20, physMult: 0, elemMult: 0,
  },
  {
    id: 'silver_heal_2', name: 'Lifebloom Lash', type: 'Heal', quality: 'Silver',
    flavour: 'What heals the wielder lashes the foe — a flowering wound.',
    cooldown: 6.5,
    healPercent: 0, physMult: 0.9, elemMult: 0.9,
    healDealEnemyDamagePctOfHeal: 0.50,
  },
  // Defend
  {
    id: 'silver_defend_1', name: 'Centred Mountain', type: 'Defend', quality: 'Silver',
    flavour: 'From stillness comes readiness; the next move arrives faster.',
    cooldown: 6.5,
    defMult: 1.6, buffAttacks: 2,
    cdReductionOnCastPct: 0.20, cdReductionOnCastFilter: 'all',
  },
  {
    id: 'silver_defend_2', name: 'Layered Bulwark', type: 'Defend', quality: 'Silver',
    flavour: 'Hide behind hide; force fades through every shell.',
    cooldown: 7.0,
    defMult: 1.5, buffAttacks: 4,
    defendBuffIncomingDmgReduction: 0.10,
  },
  // Dodge
  {
    id: 'silver_dodge_1', name: 'Drifting Petal', type: 'Dodge', quality: 'Silver',
    flavour: 'A petal on water cannot be cut.',
    cooldown: 6.5,
    dodgeChance: 0.30, buffAttacks: 3,
  },
  {
    id: 'silver_dodge_2', name: 'Phoenix Feint', type: 'Dodge', quality: 'Silver',
    flavour: 'Each evasion stokes a small flame within.',
    cooldown: 7.0,
    dodgeChance: 0.30, buffAttacks: 2,
    dodgeBuffOnSuccessHealPct: 0.05,
  },
  // Expose
  {
    id: 'silver_expose_1', name: 'Soul-Marking Glare', type: 'Expose', quality: 'Silver',
    flavour: 'A mark on the spirit; your every blow finds it.',
    cooldown: 6.0,
    exploitChance: 20, defPen: 0.20, buffPlayerAttacks: 3,
    exposeBuffApplyToAttack: true,
  },
  {
    id: 'silver_expose_2', name: 'Misted Veil', type: 'Expose', quality: 'Silver',
    flavour: 'The world dims around the strike; less of it reaches you.',
    cooldown: 6.5,
    dmgReduction: 0.30, buffEnemyAttacks: 3,
  },

  // ─── Gold ──────────────────────────────────────────────────────────────────
  // Attack
  {
    id: 'gold_attack_1', name: 'Heaven-Cleaving Edge', type: 'Attack', quality: 'Gold',
    flavour: 'A cut so clean the air remembers it for a heartbeat.',
    cooldown: 5.0,
    bonus: 4000, physMult: 3.0, elemMult: 0,
  },
  {
    id: 'gold_attack_2', name: 'Phoenix Cry', type: 'Attack', quality: 'Gold',
    flavour: 'A note that breaks worlds; its echo is harm.',
    cooldown: 5.0,
    bonus: 4000, physMult: 0, elemMult: 3.0,
  },
  {
    id: 'gold_attack_3', name: 'Bloodroot Lance', type: 'Attack', quality: 'Gold',
    flavour: 'Drive the spear with a drop of your own life; it bites deeper.',
    cooldown: 5.5,
    bonus: 0, physMult: 2.0, elemMult: 1.5,
    damageFromMaxHpPct: 0.05,
  },
  {
    id: 'gold_attack_4', name: 'Cascading Step', type: 'Attack', quality: 'Gold',
    flavour: 'Each blow primes the next; the first opens the gate.',
    cooldown: 5.5,
    bonus: 0, physMult: 1.0, elemMult: 1.0,
    cdReductionOnCastPct: 0.30, cdReductionOnCastFilter: 'Attack',
  },
  // Heal
  {
    id: 'gold_heal_1', name: 'Mending Ward', type: 'Heal', quality: 'Gold',
    flavour: 'A ward set on the body — the next evasion blooms into recovery.',
    cooldown: 6.0,
    healPercent: 0.20, physMult: 0, elemMult: 0,
    nextDodgeHealPct: 0.10,
  },
  {
    id: 'gold_heal_2', name: 'Twin Bloom Strike', type: 'Heal', quality: 'Gold',
    flavour: 'Gather wholeness here; cast the surplus as harm.',
    cooldown: 6.5,
    healPercent: 0, physMult: 1.0, elemMult: 1.0,
    healDealEnemyDamagePctOfHeal: 0.60,
  },
  // Defend
  {
    id: 'gold_defend_1', name: 'Stoneblood Mantle', type: 'Defend', quality: 'Gold',
    flavour: 'Force absorbed becomes life within.',
    cooldown: 6.5,
    defMult: 1.7, buffAttacks: 2,
    defendBuffMitigatedHealPct: 0.50,
  },
  {
    id: 'gold_defend_2', name: 'Adamant Wall', type: 'Defend', quality: 'Gold',
    flavour: 'Edge bites stone, and stone bites less.',
    cooldown: 7.0,
    defMult: 1.5, buffAttacks: 4,
    defendBuffIncomingDmgReduction: 0.20,
  },
  // Dodge
  {
    id: 'gold_dodge_1', name: 'Mirror Sway', type: 'Dodge', quality: 'Gold',
    flavour: 'Do not be where the strike lands. Be where it returns.',
    cooldown: 6.5,
    dodgeChance: 0.40, buffAttacks: 2,
    dodgeBuffReflectDamage: true,
  },
  {
    id: 'gold_dodge_2', name: 'Wind Step', type: 'Dodge', quality: 'Gold',
    flavour: 'Each evasion quickens the next motion.',
    cooldown: 7.0,
    dodgeChance: 0.30, buffAttacks: 4,
    dodgeBuffOnSuccessCdReductionPct: 0.10,
  },
  // Expose
  {
    id: 'gold_expose_1', name: 'Sunder Sigil', type: 'Expose', quality: 'Gold',
    flavour: 'A sigil writ on the foe; armour reads it as paper.',
    cooldown: 6.0,
    exploitChance: 0, defPen: 0.40, buffPlayerAttacks: 5,
    exposeBuffApplyToAttack: true,
  },
  {
    id: 'gold_expose_2', name: 'Rebound Shroud', type: 'Expose', quality: 'Gold',
    flavour: 'What is dulled returns as rebuke.',
    cooldown: 6.5,
    dmgReduction: 0.30, buffEnemyAttacks: 4,
    exposeBuffMitigatedReflectPct: 0.50,
  },

  // ─── Transcendent ──────────────────────────────────────────────────────────
  // Attack
  {
    id: 'transcendent_attack_1', name: 'Severing Heaven', type: 'Attack', quality: 'Transcendent',
    flavour: 'A line drawn between what was and what is no more.',
    cooldown: 5.0,
    bonus: 10000, physMult: 5.0, elemMult: 0,
  },
  {
    id: 'transcendent_attack_2', name: 'Calamity Star', type: 'Attack', quality: 'Transcendent',
    flavour: 'A point of light that ends all that meets it.',
    cooldown: 5.0,
    bonus: 10000, physMult: 0, elemMult: 5.0,
  },
  {
    id: 'transcendent_attack_3', name: 'Eternal Cascade', type: 'Attack', quality: 'Transcendent',
    flavour: 'One strike opens all others; time bends to your hand.',
    cooldown: 5.5,
    bonus: 0, physMult: 2.5, elemMult: 2.5,
    cdReductionOnCastPct: 0.40, cdReductionOnCastFilter: 'Attack',
  },
  {
    id: 'transcendent_attack_4', name: 'Iron-Bone Smite', type: 'Attack', quality: 'Transcendent',
    flavour: 'Bone hardened to defense becomes the spear\'s haft.',
    cooldown: 5.5,
    bonus: 0, physMult: 1.0, elemMult: 1.0,
    damageFromDefensePct: 0.20,
  },
  // Heal
  {
    id: 'transcendent_heal_1', name: 'Prelude of Mending', type: 'Heal', quality: 'Transcendent',
    flavour: 'A first breath that doubles the second.',
    cooldown: 6.0,
    healPercent: 0.25, physMult: 0, elemMult: 0,
    nextHealDoubled: true,
  },
  {
    id: 'transcendent_heal_2', name: 'Cycle of the Phoenix', type: 'Heal', quality: 'Transcendent',
    flavour: 'What renews you also undoes him — equal in measure.',
    cooldown: 6.5,
    healPercent: 0.10, physMult: 1.0, elemMult: 1.0,
    healDealEnemyDamagePctOfHeal: 1.00,
  },
  // Defend
  {
    id: 'transcendent_defend_1', name: 'Diamond Mantle', type: 'Defend', quality: 'Transcendent',
    flavour: 'Force breaks before it reaches the bearer.',
    cooldown: 6.5,
    defMult: 2.0, buffAttacks: 3,
    defendBuffIncomingDmgReduction: 0.25,
  },
  {
    id: 'transcendent_defend_2', name: 'Sky-Veil Stance', type: 'Defend', quality: 'Transcendent',
    flavour: 'Walls of qi that part as easily as they hold.',
    cooldown: 7.0,
    defMult: 2.5, buffAttacks: 3,
    defendBuffDodgeChance: 0.20,
  },
  // Dodge
  {
    id: 'transcendent_dodge_1', name: 'Shadow Reversal', type: 'Dodge', quality: 'Transcendent',
    flavour: 'Step into his shadow; he reads only its return.',
    cooldown: 6.5,
    dodgeChance: 0.60, buffAttacks: 2,
    dodgeBuffReflectDamage: true,
  },
  {
    id: 'transcendent_dodge_2', name: 'Hundred-River Step', type: 'Dodge', quality: 'Transcendent',
    flavour: 'Each evasion is a current that drives the next.',
    cooldown: 7.0,
    dodgeChance: 0.50, buffAttacks: 4,
    dodgeBuffOnSuccessCdReductionPct: 0.20,
  },
  // Expose
  {
    id: 'transcendent_expose_1', name: 'Oblivion Mark', type: 'Expose', quality: 'Transcendent',
    flavour: 'A mark that no defense remembers.',
    cooldown: 6.0,
    exploitChance: 25, defPen: 0.60, buffPlayerAttacks: 5,
    exposeBuffApplyToAttack: true,
  },
  {
    id: 'transcendent_expose_2', name: 'Shroud of Inverted Heavens', type: 'Expose', quality: 'Transcendent',
    flavour: 'Defence and resilience become one shield.',
    cooldown: 6.5,
    dmgReduction: 0.40, buffEnemyAttacks: 2,
    exposeBuffUseMaxDefense: true,
  },
];

const TECHNIQUES_BY_ID = Object.fromEntries(TECHNIQUES.map(t => [t.id, t]));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Look up a catalogue technique by id. Drop instances carry `${baseId}__suffix`
 * for uniqueness — strip the suffix before looking up so the catalogue entry
 * (and i18n keys, balance data, etc.) resolves to the shared base id.
 */
export function getTechniqueBaseId(id) {
  if (!id) return null;
  const cut = id.indexOf('__');
  return cut >= 0 ? id.slice(0, cut) : id;
}

export function getTechnique(id) {
  return TECHNIQUES_BY_ID[getTechniqueBaseId(id)] ?? null;
}

/**
 * Effective cooldown in seconds for a single technique. Per-tech base
 * cooldown × quality cdMult. Per-type BASE_COOLDOWN was retired alongside
 * the buildCatalogue scaffold — every technique now carries an explicit
 * `cooldown` field.
 */
export function getCooldown(tech) {
  if (!tech) return Infinity;
  const base = tech.cooldown ?? 6;
  const cdMult = TECHNIQUE_QUALITY[tech.quality]?.cdMult ?? 1;
  return base * cdMult;
}

/**
 * Attack damage formula:
 *
 *   damage = bonus
 *          + physMult × physical_damage
 *          + elemMult × elemental_damage
 *          + damageFromMaxHpPct × pMaxHp
 *          + damageFromDefensePct × defense
 *          + damageFromElemDefensePct × elementalDefense
 *          + damage_all
 *          × (1 + secret_technique_damage)
 *
 * The stat-derived flat damage terms (maxHp / defense / elemDef) are sourced
 * from the runtime `damageStats` bundle which now also carries player
 * defensive snapshots. Each is gated by an opt-in field on the technique;
 * absent fields contribute 0.
 *
 * @param {object} tech
 * @param {{
 *   physical?:number, elemental?:number,
 *   damage_all?:number, secret_technique_damage?:number,
 *   pMaxHp?:number, defense?:number, elementalDefense?:number,
 * }|null} damageStats
 */
export function calcDamage(tech, damageStats = null) {
  const physBonus = (tech.physMult ?? 0) * (damageStats?.physical  ?? 0);
  const elemBonus = (tech.elemMult ?? 0) * (damageStats?.elemental ?? 0);
  let dmg = (tech.bonus ?? 0) + physBonus + elemBonus;

  // Stat-derived flat additions — opt-in per technique.
  if (tech.damageFromMaxHpPct)        dmg += tech.damageFromMaxHpPct       * (damageStats?.pMaxHp           ?? 0);
  if (tech.damageFromDefensePct)      dmg += tech.damageFromDefensePct     * (damageStats?.defense          ?? 0);
  if (tech.damageFromElemDefensePct)  dmg += tech.damageFromElemDefensePct * (damageStats?.elementalDefense ?? 0);

  // Universal damage_all flat bonus (whole-attack, no share).
  if (damageStats?.damage_all) dmg += damageStats.damage_all;

  // Source multiplier — secret_technique_damage applies only to technique
  // damage (this code path), not to default attacks.
  const techMult = damageStats?.secret_technique_damage ?? 0;
  if (techMult) dmg *= 1 + techMult;

  return Math.floor(dmg);
}

/** Whether the player's realmIndex meets the technique's rank requirement. */
export function canEquip(tech, realmIndex) {
  return realmIndex >= (TECHNIQUE_RANK[tech.rank]?.minRealmIndex ?? 0);
}
