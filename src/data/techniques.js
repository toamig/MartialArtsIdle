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
export const TECHNIQUE_RANK = {
  Saint:    { label: 'Saint',    minRealmIndex: 10 },
  Emperor:  { label: 'Emperor',  minRealmIndex: 36 },
  Immortal: { label: 'Immortal', minRealmIndex: 44 },
};

// ─── K multiplier table: rank × quality ──────────────────────────────────────
export const K_TABLE = {
  Saint:    { Iron: 1.5, Bronze: 2.0, Silver: 2.8, Gold: 3.8, Transcendent: 5.0  },
  Emperor:  { Iron: 2.5, Bronze: 3.5, Silver: 4.8, Gold: 6.5, Transcendent: 8.5  },
  Immortal: { Iron: 4.0, Bronze: 5.5, Silver: 7.5, Gold: 10.0, Transcendent: 13.0 },
};

// ─── Base cooldowns (seconds) by type ────────────────────────────────────────
export const BASE_COOLDOWN = {
  Attack: 6,
  Heal:   12,
  Defend: 10,
  Dodge:  10,
};

export const TYPE_COLOR = {
  Attack: '#ef4444',
  Heal:   '#4ade80',
  Defend: '#60a5fa',
  Dodge:  '#facc15',
};

// ─── Technique catalogue ──────────────────────────────────────────────────────
// In the future, techniques are acquired via drops. For now all are available.
export const TECHNIQUES = [
  // ── Attack ──────────────────────────────────────────────────────────────────
  {
    id: 'raging_fire_slash',
    name: 'Raging Fire Slash',
    type: 'Attack', rank: 'Saint', quality: 'Iron', element: 'Fire',
    flavour: 'A blade wreathed in living fire, forged from fury alone.',
    arteMult: 1.0, elemBonus: 1.2, bonus: 0,
    passives: [
      { name: 'Ignite', description: 'Applies a burn dealing 5% dmg/s for 3s.' },
    ],
  },
  {
    id: 'void_piercer',
    name: 'Void Piercer',
    type: 'Attack', rank: 'Saint', quality: 'Silver', element: 'Normal',
    flavour: 'A thrust so precise it tears space itself.',
    arteMult: 1.0, elemBonus: 1.0, bonus: 0,
    passives: [
      { name: 'Penetrating', description: 'Ignores 20% of enemy DEF.' },
      { name: 'Momentum',    description: 'Next attack cooldown −1s.' },
      { name: 'Focus',       description: '+10% critical hit chance.' },
    ],
  },
  {
    id: 'twin_dragons_rage',
    name: "Twin Dragon's Rage",
    type: 'Attack', rank: 'Saint', quality: 'Gold', element: 'Fire',
    flavour: 'Two dragons roar as one — heaven itself trembles.',
    arteMult: 1.2, elemBonus: 1.3, bonus: 0,
    passives: [
      { name: "Dragon's Fury",  description: 'First strike deals double damage.' },
      { name: 'Inferno',        description: 'Burn stacks amplify dmg by 15%.' },
      { name: 'Soul Resonance', description: 'Soul contribution +50%.' },
      { name: 'Dragon Roar',    description: '15% chance to stun for 1s.' },
    ],
  },
  // ── Heal ────────────────────────────────────────────────────────────────────
  {
    id: 'mending_breath',
    name: 'Mending Breath',
    type: 'Heal', rank: 'Saint', quality: 'Bronze', element: 'Normal',
    flavour: 'A single exhale restores what years of battle have worn away.',
    healPercent: 0.25,
    passives: [
      { name: 'Deep Breath', description: '+5% HP regen over 3s after heal.' },
      { name: 'Calm Mind',   description: 'Reduces cooldowns by 10% for 5s.' },
    ],
  },
  {
    id: 'heaven_mending_art',
    name: 'Heaven Mending Art',
    type: 'Heal', rank: 'Saint', quality: 'Gold', element: 'Normal',
    flavour: 'Even shattered meridians knit themselves whole.',
    healPercent: 0.50,
    passives: [
      { name: "Heaven's Will", description: 'Can overheal up to 120% max HP.' },
      { name: 'Purify',        description: 'Removes all debuffs on heal.' },
      { name: 'Regeneration',  description: '+5% HP/s for 5s after cast.' },
      { name: 'Soul Mending',  description: 'Restores a portion of Soul stat.' },
    ],
  },
  // ── Defend ──────────────────────────────────────────────────────────────────
  {
    id: 'stone_skin',
    name: 'Stone Skin',
    type: 'Defend', rank: 'Saint', quality: 'Iron', element: 'Normal',
    flavour: 'Flesh becomes iron. Iron becomes stone.',
    defMult: 1.5, buffDuration: 5,
    passives: [
      { name: 'Hardened', description: 'DEF bonus lasts 2 extra seconds.' },
    ],
  },
  {
    id: 'iron_fortress',
    name: 'Iron Fortress',
    type: 'Defend', rank: 'Saint', quality: 'Silver', element: 'Normal',
    flavour: "A citadel of qi — no blow can shake its walls.",
    defMult: 2.0, buffDuration: 7,
    passives: [
      { name: 'Unbreakable',  description: 'Cannot be reduced below 1 HP while active.' },
      { name: 'Counterforce', description: '20% of blocked damage returned.' },
      { name: 'Ironclad',     description: 'Duration +1s per hit absorbed.' },
    ],
  },
  // ── Dodge ───────────────────────────────────────────────────────────────────
  {
    id: 'phantom_step',
    name: 'Phantom Step',
    type: 'Dodge', rank: 'Saint', quality: 'Iron', element: 'Normal',
    flavour: 'Between one heartbeat and the next — you are elsewhere.',
    dodgeChance: 0.40, buffDuration: 4,
    passives: [
      { name: 'Swift', description: 'Dodge window extended by 0.5s.' },
    ],
  },
  {
    id: 'shadow_walk',
    name: 'Shadow Walk',
    type: 'Dodge', rank: 'Saint', quality: 'Bronze', element: 'Normal',
    flavour: 'The shadow peels away and becomes you for a precious moment.',
    dodgeChance: 0.60, buffDuration: 6,
    passives: [
      { name: 'Afterimage',  description: 'Afterimage taunts enemy for 1s.' },
      { name: 'Phase Shift', description: 'First attack after dodge deals ×1.5 dmg.' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTechnique(id) {
  return TECHNIQUES.find(t => t.id === id) ?? null;
}

/** Effective cooldown in seconds for a given type + quality. */
export function getCooldown(type, quality) {
  return BASE_COOLDOWN[type] * (TECHNIQUE_QUALITY[quality]?.cdMult ?? 1);
}

/** K damage multiplier from rank × quality table. */
export function getK(rank, quality) {
  return K_TABLE[rank]?.[quality] ?? 1.0;
}

/**
 * Attack damage formula from the DD:
 *   K * (Essence + Soul + Body + artefactFlat) * arteMult * elemBonus + bonus
 *
 * elemBonus only applies when the active Law's element matches the technique's.
 */
export function calcDamage(tech, essence, soul, body, lawElement = 'Normal', artefactFlat = 0) {
  const K = getK(tech.rank, tech.quality);
  const elemMatch = tech.element !== 'Normal' && tech.element === lawElement;
  const elemBonus = elemMatch ? (tech.elemBonus ?? 1.0) : 1.0;
  return Math.floor(
    K * (essence + soul + body + artefactFlat)
    * (tech.arteMult ?? 1.0)
    * elemBonus
    + (tech.bonus ?? 0)
  );
}

/** Whether the player's realmIndex meets the technique's rank requirement. */
export function canEquip(tech, realmIndex) {
  return realmIndex >= (TECHNIQUE_RANK[tech.rank]?.minRealmIndex ?? 0);
}
