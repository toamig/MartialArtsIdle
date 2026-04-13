const RARITY = {
  Iron:         { label: 'Iron',         color: '#9ca3af' },
  Bronze:       { label: 'Bronze',       color: '#cd7f32' },
  Silver:       { label: 'Silver',       color: '#c0c0c0' },
  Gold:         { label: 'Gold',         color: '#f5c842' },
  Transcendent: { label: 'Transcendent', color: '#c084fc' },
};

const ITEMS = {
  herbs: [
    { id: 'iron_herb_1',          name: 'Iron Herb 1',          rarity: 'Iron',         description: 'A common herb used in basic alchemical preparations.' },
    { id: 'iron_herb_2',          name: 'Iron Herb 2',          rarity: 'Iron',         description: 'A common herb with mild spiritual properties.' },
    { id: 'bronze_herb_1',        name: 'Bronze Herb 1',        rarity: 'Bronze',       description: 'An uncommon herb that stabilizes volatile pill recipes.' },
    { id: 'bronze_herb_2',        name: 'Bronze Herb 2',        rarity: 'Bronze',       description: 'An uncommon herb with fire-element affinity.' },
    { id: 'silver_herb_1',        name: 'Silver Herb 1',        rarity: 'Silver',       description: 'A rare herb that accumulates vitality over centuries.' },
    { id: 'silver_herb_2',        name: 'Silver Herb 2',        rarity: 'Silver',       description: 'A rare herb prized for refining body-tempering pills.' },
    { id: 'gold_herb_1',          name: 'Gold Herb 1',          rarity: 'Gold',         description: 'An epic herb saturated with lightning-attribute energy.' },
    { id: 'gold_herb_2',          name: 'Gold Herb 2',          rarity: 'Gold',         description: 'An epic herb essential for tribulation-resistance pills.' },
    { id: 'transcendent_herb_1',  name: 'Transcendent Herb 1',  rarity: 'Transcendent', description: 'A legendary herb said to pull cultivators back from the brink of death.' },
    { id: 'transcendent_herb_2',  name: 'Transcendent Herb 2',  rarity: 'Transcendent', description: 'An extremely rare botanical requiring ten thousand years to mature.' },
  ],
  minerals: [
    { id: 'iron_mineral_1',          name: 'Iron Mineral 1',          rarity: 'Iron',         description: 'A common ore used for basic crafting and transmutation of stats.' },
    { id: 'iron_mineral_2',          name: 'Iron Mineral 2',          rarity: 'Iron',         description: 'A common ore used for rolling modifiers during transmutation.' },
    { id: 'bronze_mineral_1',        name: 'Bronze Mineral 1',        rarity: 'Bronze',       description: 'An uncommon ore with fire-element properties, used to roll stats.' },
    { id: 'bronze_mineral_2',        name: 'Bronze Mineral 2',        rarity: 'Bronze',       description: 'An uncommon ore used for rolling modifiers during transmutation.' },
    { id: 'silver_mineral_1',        name: 'Silver Mineral 1',        rarity: 'Silver',       description: 'A rare space-attribute mineral used to roll stats in transmutation.' },
    { id: 'silver_mineral_2',        name: 'Silver Mineral 2',        rarity: 'Silver',       description: 'A lightweight rare ore prized for rolling modifiers.' },
    { id: 'gold_mineral_1',          name: 'Gold Mineral 1',          rarity: 'Gold',         description: 'An epic meteorite-born metal that channels astral energy, used to roll stats.' },
    { id: 'gold_mineral_2',          name: 'Gold Mineral 2',          rarity: 'Gold',         description: 'An epic ore containing compressed solar essence, used to roll modifiers.' },
    { id: 'transcendent_mineral_1',  name: 'Transcendent Mineral 1',  rarity: 'Transcendent', description: 'A nearly indestructible alloy used to roll stats at the highest tier.' },
    { id: 'transcendent_mineral_2',  name: 'Transcendent Mineral 2',  rarity: 'Transcendent', description: 'An exceptionally rare ore used for transcendent-tier modifier rolling.' },
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
    { id: 'iron_cultivation_1',         name: 'Iron Cultivation 1',         rarity: 'Iron',         description: 'A basic cultivation resource containing condensed spiritual energy.' },
    { id: 'iron_cultivation_2',         name: 'Iron Cultivation 2',         rarity: 'Iron',         description: 'A basic cultivation material used to fuel early breakthroughs.' },
    { id: 'bronze_cultivation_1',       name: 'Bronze Cultivation 1',       rarity: 'Bronze',       description: 'A cultivation resource holding accumulated elemental energy.' },
    { id: 'bronze_cultivation_2',       name: 'Bronze Cultivation 2',       rarity: 'Bronze',       description: 'A refined cultivation resource for Bronze-tier breakthroughs.' },
    { id: 'silver_cultivation_1',       name: 'Silver Cultivation 1',       rarity: 'Silver',       description: 'A higher-order cultivation resource containing primal world energy.' },
    { id: 'silver_cultivation_2',       name: 'Silver Cultivation 2',       rarity: 'Silver',       description: 'A refined Silver-tier cultivation material for advanced practitioners.' },
    { id: 'gold_cultivation_1',         name: 'Gold Cultivation 1',         rarity: 'Gold',         description: 'Liquid spiritual energy that collects in ancient sacred grounds.' },
    { id: 'gold_cultivation_2',         name: 'Gold Cultivation 2',         rarity: 'Gold',         description: 'A naturally formed pearl of pure elemental power left by ancient beasts.' },
    { id: 'transcendent_cultivation_1', name: 'Transcendent Cultivation 1', rarity: 'Transcendent', description: 'A legendary cultivation resource that shatters major-realm barriers.' },
    { id: 'transcendent_cultivation_2', name: 'Transcendent Cultivation 2', rarity: 'Transcendent', description: 'An extremely rare cultivation material for the peak of the martial path.' },
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
