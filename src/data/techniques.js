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

// ─── K multiplier table: rank × quality ──────────────────────────────────────
export const K_TABLE = {
  Mortal:   { Iron: 0.5, Bronze: 0.7, Silver: 1.0, Gold: 1.3, Transcendent: 1.8  },
  Earth:    { Iron: 1.0, Bronze: 1.4, Silver: 2.0, Gold: 2.7, Transcendent: 3.5  },
  Sky:      { Iron: 1.5, Bronze: 2.0, Silver: 2.8, Gold: 3.8, Transcendent: 5.0  },
  Saint:    { Iron: 2.0, Bronze: 2.8, Silver: 3.8, Gold: 5.2, Transcendent: 6.8  },
  Emperor:  { Iron: 2.5, Bronze: 3.5, Silver: 4.8, Gold: 6.5, Transcendent: 8.5  },
  Heaven:   { Iron: 4.0, Bronze: 5.5, Silver: 7.5, Gold: 10.0, Transcendent: 13.0 },
};

// ─── Base cooldowns (seconds) by type ────────────────────────────────────────
export const BASE_COOLDOWN = {
  Attack: 6,
  Heal:   12,
  Defend: 10,
  Dodge:  10,
  Expose: 12,
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
// Hand-authored pool. Each technique is identified by `id` (stable across
// drops — drop instances suffix `__<random>` to that base id). Quality is
// IDENTITY (Iron Sword Slash and Bronze Sword Slash are different entries);
// rank is assigned per-drop from the world tier (W1=Mortal … W6=Heaven), so
// a single Iron entry can manifest at any of the 6 K_TABLE ranks.
//
// Distribution: 12 techniques per quality × 5 qualities = 60 total.
//   per-quality: 4 Attack + 2 Heal + 2 Defend + 2 Dodge + 2 Expose
//
// All names + flavours are placeholders for the designer to update later.
// Stat values scale with quality tier on a deliberate ladder so the unique
// pool feels stratified out of the box; the designer can re-tune per entry.

const QUALITIES = ['Iron', 'Bronze', 'Silver', 'Gold', 'Transcendent'];

function buildCatalogue() {
  const out = [];

  QUALITIES.forEach((quality, qIdx) => {
    // ── Attack ×4 ──
    // Per-slot lean defaults: slot 1 leans physical, slot 2 leans elemental,
    // slot 3 is balanced, slot 4 leans physical harder. Designer overrides.
    const ATTACK_MULTS = [
      { physMult: 1.0, elemMult: 0.4 }, // slot 1 — phys-leaning
      { physMult: 0.4, elemMult: 1.0 }, // slot 2 — elem-leaning
      { physMult: 0.7, elemMult: 0.7 }, // slot 3 — balanced
      { physMult: 1.0, elemMult: 0.5 }, // slot 4 — phys-leaning + secondary elem
    ];
    for (let i = 1; i <= 4; i++) {
      const mults = ATTACK_MULTS[i - 1];
      out.push({
        id:         `${quality.toLowerCase()}_attack_${i}`,
        name:       `Placeholder ${quality} Attack ${i}`,
        type:       'Attack',
        quality,
        flavour:    'TBD — designer to fill in.',
        bonus:      qIdx * 5,
        physMult:   mults.physMult,
        elemMult:   mults.elemMult,
      });
    }

    // ── Heal ×2 ──
    // Heal slots also scale with phys + elem stats (added 2026-04-27 — heal
    // is now a multiplier-based effect, not just a maxHP fraction). Lower
    // coefficients than Attack so heal doesn't dominate balance.
    const HEAL_MULTS = [
      { physMult: 0.4, elemMult: 0.2 }, // slot 1 — phys-leaning
      { physMult: 0.2, elemMult: 0.4 }, // slot 2 — elem-leaning
    ];
    for (let i = 1; i <= 2; i++) {
      const mults = HEAL_MULTS[i - 1];
      out.push({
        id:          `${quality.toLowerCase()}_heal_${i}`,
        name:        `Placeholder ${quality} Heal ${i}`,
        type:        'Heal',
        quality,
        flavour:     'TBD — designer to fill in.',
        healPercent: parseFloat((0.15 + qIdx * 0.05).toFixed(3)),
        physMult:    mults.physMult,
        elemMult:    mults.elemMult,
      });
    }

    // ── Defend ×2 ──
    for (let i = 1; i <= 2; i++) {
      out.push({
        id:          `${quality.toLowerCase()}_defend_${i}`,
        name:        `Placeholder ${quality} Defend ${i}`,
        type:        'Defend',
        quality,
        flavour:     'TBD — designer to fill in.',
        defMult:     parseFloat((1.3 + qIdx * 0.15).toFixed(2)),
        buffAttacks: 2 + qIdx,
      });
    }

    // ── Dodge ×2 ──
    for (let i = 1; i <= 2; i++) {
      out.push({
        id:          `${quality.toLowerCase()}_dodge_${i}`,
        name:        `Placeholder ${quality} Dodge ${i}`,
        type:        'Dodge',
        quality,
        flavour:     'TBD — designer to fill in.',
        dodgeChance: parseFloat((0.30 + qIdx * 0.075).toFixed(3)),
        buffAttacks: 2 + qIdx,
      });
    }

    // ── Expose ×2 ──
    // Expose 1: offensive bundle (exploit chance + def pen) — player clock
    out.push({
      id:                 `${quality.toLowerCase()}_expose_1`,
      name:               `Placeholder ${quality} Expose 1`,
      type:               'Expose',
      quality,
      flavour:            'TBD — designer to fill in.',
      exploitChance:      15 + qIdx * 5,
      defPen:             parseFloat((0.05 + qIdx * 0.05).toFixed(2)),
      buffPlayerAttacks:  3 + qIdx,
    });
    // Expose 2: mitigation focus (incoming damage reduction) — enemy clock
    out.push({
      id:                 `${quality.toLowerCase()}_expose_2`,
      name:               `Placeholder ${quality} Expose 2`,
      type:               'Expose',
      quality,
      flavour:            'TBD — designer to fill in.',
      dmgReduction:       parseFloat((0.10 + qIdx * 0.04).toFixed(2)),
      exploitMult:        175 + qIdx * 10,    // applies on exploit rolls during the buff
      buffEnemyAttacks:   3 + qIdx,
      buffPlayerAttacks:  3 + qIdx,           // exploitMult needs the player clock
    });
  });

  return out;
}

export const TECHNIQUES = buildCatalogue();

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

/** Effective cooldown in seconds for a given type + quality. */
export function getCooldown(type, quality) {
  return BASE_COOLDOWN[type] * (TECHNIQUE_QUALITY[quality]?.cdMult ?? 1);
}

/** K damage multiplier from rank × quality table. */
export function getK(rank, quality) {
  return K_TABLE[rank]?.[quality] ?? 1.0;
}

/**
 * Attack damage formula (2026-04-27, post-cleanup):
 *
 *   damage = bonus
 *          + K × (physMult × physical_damage + elemMult × elemental_damage)
 *          + damage_all
 *          × (1 + secret_technique_damage)
 *
 * `K` (rank × quality table) multiplies the phys+elem stat contribution so
 * Heaven-Transcendent techs scale dramatically harder than Mortal-Iron ones.
 * `bonus` is a small flat per-technique add. `damage_all` and the
 * `secret_technique_damage` source multiplier behave as before.
 *
 * Removed in this cleanup pass:
 *   - essence / soul / body params (primary-stat layer was retired stage 15)
 *   - `_law` param (element-matching elemBonus was removed 2026-04-26)
 *   - artefactFlat param (no caller fills it; was always 0)
 *   - `arteMult` per-technique field (was multiplying a zero term)
 *
 * The previous categorical `damageType` (physical|elemental) was replaced
 * 2026-04-27 by independent `physMult` + `elemMult` coefficients.
 *
 * @param {object} tech
 * @param {{physical:number, elemental:number, damage_all?:number, secret_technique_damage?:number}|null} damageStats
 */
export function calcDamage(tech, damageStats = null) {
  const K = getK(tech.rank, tech.quality);
  const physBonus = (tech.physMult ?? 0) * (damageStats?.physical  ?? 0);
  const elemBonus = (tech.elemMult ?? 0) * (damageStats?.elemental ?? 0);
  let dmg = (tech.bonus ?? 0) + K * (physBonus + elemBonus);

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
