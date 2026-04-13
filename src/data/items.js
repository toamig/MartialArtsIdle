const RARITY = {
  Iron:         { label: 'Iron',         color: '#9ca3af' },
  Bronze:       { label: 'Bronze',       color: '#cd7f32' },
  Silver:       { label: 'Silver',       color: '#c0c0c0' },
  Gold:         { label: 'Gold',         color: '#f5c842' },
  Transcendent: { label: 'Transcendent', color: '#c084fc' },
};

const ITEMS = {
  herbs: [
    { id: 'iron_herb_1',          name: 'Mortal Qi Grass',       rarity: 'Iron',         description: 'A weed that grows wherever mortal cultivators train, soaking up residual qi from their exercises.' },
    { id: 'iron_herb_2',          name: 'Wild Spirit Root',       rarity: 'Iron',         description: 'A gnarled root found in borderland wilderness, drawn to faint spiritual energy in the soil.' },
    { id: 'bronze_herb_1',        name: 'Qi Vein Vine',           rarity: 'Bronze',       description: 'A creeping vine that grows along underground qi veins, its leaves faintly luminescent.' },
    { id: 'bronze_herb_2',        name: 'Misty Forest Bloom',     rarity: 'Bronze',       description: 'A pale flower that blooms only in spirit-mist forests, pollinated by forest spirits.' },
    { id: 'silver_herb_1',        name: 'Desert Silver Lotus',    rarity: 'Silver',       description: 'A silver lotus that survives in scorched desert ruins, drawing water from deep ley lines.' },
    { id: 'silver_herb_2',        name: 'Blood Reed',             rarity: 'Silver',       description: 'A blood-red reed that grows at the edges of the blood sea, its sap thick with corrupted vitality.' },
    { id: 'gold_herb_1',          name: 'Burial Ground Lotus',    rarity: 'Gold',         description: 'A dark lotus that blooms only above saint-grade burial sites, feeding on centuries of death qi.' },
    { id: 'gold_herb_2',          name: 'Void Thorn Vine',        rarity: 'Gold',         description: 'A thorned vine that grows through rift cracks, its barbs sharp enough to pierce saint-grade defenses.' },
    { id: 'transcendent_herb_1',  name: 'Origin Spring Petal',    rarity: 'Transcendent', description: 'A petal shed by flowers growing at the world\'s origin qi springs, saturated with primordial energy.' },
    { id: 'transcendent_herb_2',  name: 'Heaven Root Vine',       rarity: 'Transcendent', description: 'A legendary vine whose roots reach through bedrock to the world core, channeling heaven-grade energy.' },
  ],
  minerals: [
    { id: 'iron_mineral_1',          name: 'Sect Iron Shard',      rarity: 'Iron',         description: 'A fragment of iron-grade material shed from sect constructs, training equipment, and the iron of mortal cultivators.' },
    { id: 'iron_mineral_2',          name: 'Iron Vein Shard',      rarity: 'Iron',         description: 'A dense shard of iron ore extracted from shallow veins, used in basic transmutation.' },
    { id: 'bronze_mineral_1',        name: 'Qi Fang',              rarity: 'Bronze',       description: 'A fang or spine shard from a beast that grew mineral-dense through years of absorbing qi from the earth.' },
    { id: 'bronze_mineral_2',        name: 'Spirit Wood Core',     rarity: 'Bronze',       description: 'The hardened core from a spirit entity or ancient tree, permeated with concentrated forest qi.' },
    { id: 'silver_mineral_1',        name: 'Iron Spine Scale',     rarity: 'Silver',       description: 'A scale or spine segment from iron-calibre predators of the ancient frontier, dense enough to deflect silver-grade attacks.' },
    { id: 'silver_mineral_2',        name: 'Immortal Array Jade',  rarity: 'Silver',       description: 'Jade infused with formation arrays from sunken immortal ruins, still containing traces of their original inscriptions.' },
    { id: 'gold_mineral_1',          name: 'Saint Bone Sliver',    rarity: 'Gold',         description: 'A sliver of bone from saint-realm corpses, radiating a cold death qi that resists refinement.' },
    { id: 'gold_mineral_2',          name: 'Forbidden Seal Shard', rarity: 'Gold',         description: 'A fragment of the void seals that once contained the Forbidden Lands, crackling with restrained power.' },
    { id: 'transcendent_mineral_1',  name: 'Void Crystal',         rarity: 'Transcendent', description: 'A crystal grown inside rift tears, its structure formed entirely by compressed void energy.' },
    { id: 'transcendent_mineral_2',  name: 'World Stone Core',     rarity: 'Transcendent', description: 'An impossibly dense stone core formed at the world\'s deepest strata or shed by titans of the upper heaven, used only in the most advanced transmutation.' },
  ],
  pills: [
    { id: 'qi_condensation_pill',  name: 'Qi Condensation Pill',  rarity: 'Iron',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'body_tempering_pill',   name: 'Body Tempering Pill',   rarity: 'Iron',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'spirit_calming_pill',   name: 'Spirit Calming Pill',   rarity: 'Iron',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'fortification_pill',    name: 'Fortification Pill',    rarity: 'Iron',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'miners_focus_pill',     name: "Miner's Focus Pill",    rarity: 'Iron',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'qi_gathering_pill',     name: 'Qi Gathering Pill',     rarity: 'Bronze',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'meridian_opening_pill', name: 'Meridian Opening Pill', rarity: 'Bronze',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'flame_body_pill',       name: 'Flame Body Pill',       rarity: 'Bronze',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'iron_skin_pill',        name: 'Iron Skin Pill',        rarity: 'Bronze',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'earth_pulse_pill',      name: 'Earth Pulse Pill',      rarity: 'Bronze',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'spirit_sight_pill',     name: 'Spirit Sight Pill',     rarity: 'Bronze',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'qi_flow_pill',          name: 'Qi Flow Pill',          rarity: 'Bronze',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'profound_qi_pill',      name: 'Profound Qi Pill',      rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'dragon_blood_pill',     name: 'Dragon Blood Pill',     rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'soul_stabilizing_pill', name: 'Soul Stabilizing Pill', rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'vitality_pill',         name: 'Vitality Pill',         rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'heavenly_root_pill',    name: 'Heavenly Root Pill',    rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'deep_vein_pill',        name: 'Deep Vein Pill',        rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'qi_surge_pill',         name: 'Qi Surge Pill',         rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'combat_pill',           name: 'Combat Pill',           rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'qi_ascension_pill',     name: 'Qi Ascension Pill',     rarity: 'Gold',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'true_element_pill',     name: 'True Element Pill',     rarity: 'Gold',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'heaven_marrow_pill',    name: 'Heaven Marrow Pill',    rarity: 'Gold',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'origin_gathering_pill', name: 'Origin Gathering Pill', rarity: 'Gold',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'qi_breakthrough_pill',  name: 'Qi Breakthrough Pill',  rarity: 'Gold',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'dao_heart_pill',        name: 'Dao Heart Pill',        rarity: 'Gold',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'immortal_qi_pill',      name: 'Immortal Qi Pill',      rarity: 'Transcendent', description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'heaven_defying_pill',   name: 'Heaven Defying Pill',   rarity: 'Transcendent', description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'dao_foundation_pill',   name: 'Dao Foundation Pill',   rarity: 'Transcendent', description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'eternal_vigor_pill',    name: 'Eternal Vigor Pill',    rarity: 'Transcendent', description: 'A cultivated pill that provides temporary buffs.' },
  ],
  cultivation: [
    { id: 'iron_cultivation_1',         name: 'Mortal Qi Residue',     rarity: 'Iron',         description: 'Residual qi that coalesces above a defeated mortal cultivator or beast, briefly visible before dispersing — gathered quickly before it fades.' },
    { id: 'iron_cultivation_2',         name: 'Condensed Qi Stone',    rarity: 'Iron',         description: 'A naturally formed stone that accumulates ambient qi over time in mortal-realm training grounds.' },
    { id: 'bronze_cultivation_1',       name: 'Beast Qi Core',         rarity: 'Bronze',       description: 'The dense qi nucleus found at the center of a beast that has fed on spiritual energy for years — still pulsing faintly after death.' },
    { id: 'bronze_cultivation_2',       name: 'Corrupted Qi Shard',    rarity: 'Bronze',       description: 'A crystallised shard of qi torn from a fallen cultivator or construct whose energy pathways had been corrupted or shattered.' },
    { id: 'silver_cultivation_1',       name: 'Ancient Qi Marrow',     rarity: 'Silver',       description: 'The marrow-like qi condensate found deep within ancient frontier creatures, saturated after centuries of qi absorption in ruins and wastelands.' },
    { id: 'silver_cultivation_2',       name: 'Immortal Soul Remnant', rarity: 'Silver',       description: 'A fragment of soul-force that persists after the death of an immortal-grade entity, still carrying echoes of its cultivation.' },
    { id: 'gold_cultivation_1',         name: 'Saint Qi Relic',        rarity: 'Gold',         description: 'A calcified relic of saint-realm qi, recovered from burial grounds and war altars.' },
    { id: 'gold_cultivation_2',         name: 'Void Qi Pearl',         rarity: 'Gold',         description: 'A small pearl formed inside void-touched predators and shades, containing compressed void-attribute energy.' },
    { id: 'transcendent_cultivation_1', name: 'Primal Qi Core',        rarity: 'Transcendent', description: 'The crystallised qi core of a primordial entity — condensed from millions of years of unbroken cultivation, still radiating overwhelming pressure.' },
    { id: 'transcendent_cultivation_2', name: 'Heaven Qi Crystal',     rarity: 'Transcendent', description: 'A crystal of pure heaven-grade qi extracted from entities that have ascended beyond mortal limitations.' },
  ],
};

// Flat lookup by id
const ITEMS_BY_ID = {};
for (const category of Object.values(ITEMS)) {
  for (const item of category) {
    ITEMS_BY_ID[item.id] = item;
  }
}

export { RARITY, ITEMS, ITEMS_BY_ID };
