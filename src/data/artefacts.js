import { MOD } from './stats';

// Quality tiers — unified with Laws and Techniques naming.
export const QUALITY = {
  Iron:         { label: 'Iron',         color: '#9ca3af', mult: 1  },
  Bronze:       { label: 'Bronze',       color: '#cd7f32', mult: 2  },
  Silver:       { label: 'Silver',       color: '#c0c0c0', mult: 4  },
  Gold:         { label: 'Gold',         color: '#f5c842', mult: 8  },
  Transcendent: { label: 'Transcendent', color: '#c084fc', mult: 16 },
};

// Base flat bonus value at Iron quality; scales linearly with mult.
const B = 8;

// Derive stat bonuses for an equipped artefact given its slot type and rarity.
// Uses MOD.FLAT so bonuses sit on top of the primary-stat-derived base values.
export function getSlotBonuses(slot, rarity) {
  const m = QUALITY[rarity]?.mult ?? 1;
  switch (slot) {
    case 'weapon': return [{ stat: 'physical_damage',  type: MOD.FLAT, value: B * 2 * m }];
    case 'head':   return [{ stat: 'soul_toughness',   type: MOD.FLAT, value: B * m }];
    case 'body':   return [{ stat: 'defense',           type: MOD.FLAT, value: B * 2 * m }];
    case 'hands':  return [{ stat: 'physical_damage',  type: MOD.FLAT, value: B * m }];
    case 'waist':  return [{ stat: 'health',            type: MOD.FLAT, value: B * 5 * m }];
    case 'feet':   return [{ stat: 'defense',           type: MOD.FLAT, value: B * m }];
    case 'neck':   return [{ stat: 'elemental_defense', type: MOD.FLAT, value: B * m }];
    case 'ring':   return [{ stat: 'essence',           type: MOD.FLAT, value: B * m }];
    default:       return [];
  }
}

export const ARTEFACTS = [
  // ── Weapons — Sword ──────────────────────────────────────────────────────
  { id: 'iron_sword',           slot: 'weapon', rarity: 'Iron',         weaponType: 'sword',   name: 'Iron Sword',           description: 'A plain iron sword forged for outer sect disciples. Reliable but unremarkable.' },
  { id: 'spirit_edge_sword',    slot: 'weapon', rarity: 'Bronze',       weaponType: 'sword',   name: 'Spirit-Edge Sword',    description: 'A sword honed with spirit energy; the blade hums faintly when qi flows through it.' },
  { id: 'void_cleaver',         slot: 'weapon', rarity: 'Silver',       weaponType: 'sword',   name: 'Void Cleaver',         description: 'Forged from void stone; each strike tears a hairline crack in the local spatial fabric.' },
  { id: 'dragon_fang_sword',    slot: 'weapon', rarity: 'Gold',         weaponType: 'sword',   name: 'Dragon Fang Sword',    description: 'Crafted from a dragon beast fang; channels raw draconic pressure into every blow.' },
  { id: 'heaven_slaying_sword', slot: 'weapon', rarity: 'Transcendent', weaponType: 'sword',   name: 'Heaven-Slaying Sword', description: 'A legendary blade said to have cut through the barrier between realms. The edge never dulls.' },

  // ── Weapons — Polearm ────────────────────────────────────────────────────
  { id: 'iron_polearm',         slot: 'weapon', rarity: 'Iron',         weaponType: 'polearm', name: 'Iron Polearm',         description: 'A heavy iron polearm favoured by body-cultivators for its reach and stopping power.' },
  { id: 'serpent_spear',        slot: 'weapon', rarity: 'Bronze',       weaponType: 'polearm', name: 'Serpent Spear',        description: 'A flexible spear with a serpent-tooth tip that injects a mild spiritual venom on penetration.' },
  { id: 'mountain_breaker',     slot: 'weapon', rarity: 'Silver',       weaponType: 'polearm', name: 'Mountain Breaker',     description: 'A broad-headed halberd said to have felled a small spirit mountain. Pulverises physical defence.' },
  { id: 'thunder_lance',        slot: 'weapon', rarity: 'Gold',         weaponType: 'polearm', name: 'Thunder Lance',        description: 'A lance coated in compressed lightning ore; strikes detonate with a thunderclap.' },
  { id: 'divine_pillar_spear',  slot: 'weapon', rarity: 'Transcendent', weaponType: 'polearm', name: 'Divine Pillar Spear',  description: 'Once a pillar of a heavenly palace, reshaped into a spear. A full-power thrust tears space.' },

  // ── Head ─────────────────────────────────────────────────────────────────
  { id: 'spirit_headband',         slot: 'head', rarity: 'Iron',         name: 'Spirit Headband',          description: 'A simple cloth band imbued with basic spiritual energy, aiding focus during cultivation.' },
  { id: 'jade_cultivation_crown',  slot: 'head', rarity: 'Bronze',       name: 'Jade Cultivation Crown',   description: 'A carved jade circlet that stabilizes the spiritual sea and reduces breakthrough turbulence.' },
  { id: 'ghost_kings_circlet',     slot: 'head', rarity: 'Silver',       name: "Ghost King's Circlet",     description: 'Forged from ghost iron; dulls spiritual attacks and suppresses soul-based debuffs.' },
  { id: 'heaven_forged_war_crown', slot: 'head', rarity: 'Gold',         name: 'Heaven-Forged War Crown',  description: 'A battle crown smelted in heavenly fire; greatly increases resistance to elemental damage.' },
  { id: 'crown_of_the_undying',    slot: 'head', rarity: 'Transcendent', name: 'Crown of the Undying',     description: 'Said to have been worn by an Open Heaven cultivator; protects the spirit from lethal soul attacks.' },

  // ── Body ─────────────────────────────────────────────────────────────────
  { id: 'cotton_spirit_robe',          slot: 'body', rarity: 'Iron',         name: 'Cotton Spirit Robe',          description: 'Lightweight robe woven with spirit thread, providing minimal but consistent qi circulation.' },
  { id: 'cloud_silk_battle_vest',      slot: 'body', rarity: 'Bronze',       name: 'Cloud Silk Battle Vest',      description: 'A vest spun from high-altitude cloud silk that deflects minor physical and elemental strikes.' },
  { id: 'dragon_scale_armour',         slot: 'body', rarity: 'Silver',       name: 'Dragon Scale Armour',         description: 'Scales shed by a lesser dragon beast; hard as iron and resistant to fire and lightning.' },
  { id: 'phoenix_feather_war_robe',    slot: 'body', rarity: 'Gold',         name: 'Phoenix Feather War Robe',    description: 'Woven from phoenix down; regenerates minor damage over time and resists extreme heat.' },
  { id: 'heaven_piercing_divine_robe', slot: 'body', rarity: 'Transcendent', name: 'Heaven-Piercing Divine Robe', description: 'A supreme-grade robe that shifts between softness and steel; nullifies strikes below a power threshold.' },

  // ── Hands ─────────────────────────────────────────────────────────────────
  { id: 'iron_bracers',          slot: 'hands', rarity: 'Iron',         name: 'Iron Bracers',          description: 'Basic iron bracers that reinforce the forearms and improve blocking stability.' },
  { id: 'tiger_claw_gauntlets',  slot: 'hands', rarity: 'Bronze',       name: 'Tiger Claw Gauntlets',  description: 'Gauntlets styled after tiger claws; slightly increases the damage of unarmed and polearm strikes.' },
  { id: 'mithril_bracers',       slot: 'hands', rarity: 'Silver',       name: 'Mithril Bracers',       description: 'Lightweight mithril bracers that conduct elemental energy through each strike.' },
  { id: 'dragon_vein_gauntlets', slot: 'hands', rarity: 'Gold',         name: 'Dragon Vein Gauntlets', description: 'Gauntlets threaded with dragon-vein ore; amplify Essence-based attacks channelled through the hands.' },
  { id: 'heaven_palm_guards',    slot: 'hands', rarity: 'Transcendent', name: 'Heaven Palm Guards',    description: 'Ancient guards worn by a palm-technique grandmaster; dramatically amplify open-palm secret techniques.' },

  // ── Waist ─────────────────────────────────────────────────────────────────
  { id: 'leather_cultivation_belt', slot: 'waist', rarity: 'Iron',         name: 'Leather Cultivation Belt', description: 'A sturdy belt that stabilizes the dantian and reduces qi dispersal during combat.' },
  { id: 'spirit_jade_sash',         slot: 'waist', rarity: 'Bronze',       name: 'Spirit Jade Sash',         description: 'A silk sash inlaid with spirit jade beads; improves qi circulation between upper and lower body.' },
  { id: 'serpent_skin_belt',        slot: 'waist', rarity: 'Silver',       name: 'Serpent Skin Belt',        description: 'Crafted from the shed skin of a spiritual serpent; increases agility and resistance to poison.' },
  { id: 'golden_dragon_belt',       slot: 'waist', rarity: 'Gold',         name: 'Golden Dragon Belt',       description: 'A broad belt embossed with a coiling dragon; greatly increases Body-stat conversion.' },
  { id: 'void_emperors_sash',       slot: 'waist', rarity: 'Transcendent', name: "Void Emperor's Sash",      description: 'A sash woven from spatial thread; absorbs a portion of incoming damage into a void pocket.' },

  // ── Feet ─────────────────────────────────────────────────────────────────
  { id: 'wind_step_boots',        slot: 'feet', rarity: 'Iron',         name: 'Wind-Step Boots',        description: 'Light boots enchanted for swift footwork; marginally increases dodge rate.' },
  { id: 'swiftcloud_sandals',     slot: 'feet', rarity: 'Bronze',       name: 'Swiftcloud Sandals',     description: 'Sandals that carry a trace of cloud energy; allow brief bursts of accelerated movement.' },
  { id: 'thunderstep_boots',      slot: 'feet', rarity: 'Silver',       name: 'Thunderstep Boots',      description: 'Boots crackling with stored lightning; each step releases a low-power shock on contact.' },
  { id: 'dragon_treading_boots',  slot: 'feet', rarity: 'Gold',         name: 'Dragon Treading Boots',  description: 'Forged from dragon beast bones; dramatically improves ground stability and stomp attacks.' },
  { id: 'heaven_soaring_sandals', slot: 'feet', rarity: 'Transcendent', name: 'Heaven-Soaring Sandals', description: 'Sandals said to let the wearer walk on air; massively boost dodge and movement-based techniques.' },

  // ── Neck ─────────────────────────────────────────────────────────────────
  { id: 'jade_spirit_pendant',    slot: 'neck', rarity: 'Iron',         name: 'Jade Spirit Pendant',    description: 'A smoothed jade piece worn close to the heart; gently strengthens the spiritual sea.' },
  { id: 'soul_calming_necklace',  slot: 'neck', rarity: 'Bronze',       name: 'Soul Calming Necklace',  description: 'A string of spirit beads that suppresses soul fluctuations and mental debuffs in combat.' },
  { id: 'blood_dragon_talisman',  slot: 'neck', rarity: 'Silver',       name: 'Blood Dragon Talisman',  description: 'A carved bone talisman soaked in dragon beast blood; increases raw physical resistance.' },
  { id: 'elemental_core_pendant', slot: 'neck', rarity: 'Gold',         name: 'Elemental Core Pendant', description: 'Contains a compressed elemental core; amplifies the elemental affinity bonus.' },
  { id: 'heavens_eye_amulet',     slot: 'neck', rarity: 'Transcendent', name: "Heaven's Eye Amulet",    description: "A talisman housing the petrified eye of a divine beast; grants brief precognition in combat." },

  // ── Ring ─────────────────────────────────────────────────────────────────
  { id: 'copper_spirit_ring', slot: 'ring', rarity: 'Iron',         name: 'Copper Spirit Ring', description: 'A plain copper ring that channels a faint qi current through the meridians.' },
  { id: 'jade_focus_ring',    slot: 'ring', rarity: 'Bronze',       name: 'Jade Focus Ring',    description: 'A carved jade ring that sharpens elemental technique control, reducing wasted energy.' },
  { id: 'void_stone_ring',    slot: 'ring', rarity: 'Silver',       name: 'Void Stone Ring',    description: 'Set with a void stone fragment; has a small storage space and boosts spatial-technique damage.' },
  { id: 'dragon_blood_ring',  slot: 'ring', rarity: 'Gold',         name: 'Dragon Blood Ring',  description: 'A ring forged with dragon blood alloy; significantly boosts Essence and Body stats.' },
  { id: 'immortal_soul_ring', slot: 'ring', rarity: 'Transcendent', name: 'Immortal Soul Ring', description: "A ring said to contain a sliver of an immortal's soul; dramatically boosts all three primary stats." },
];

export const ARTEFACTS_BY_ID = Object.fromEntries(ARTEFACTS.map(a => [a.id, a]));
