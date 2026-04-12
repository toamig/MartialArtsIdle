const RARITY = {
  Iron:         { label: 'Iron',         color: '#9ca3af' },
  Bronze:       { label: 'Bronze',       color: '#cd7f32' },
  Silver:       { label: 'Silver',       color: '#c0c0c0' },
  Gold:         { label: 'Gold',         color: '#f5c842' },
  Transcendent: { label: 'Transcendent', color: '#c084fc' },
};

const ITEMS = {
  herbs: [
    { id: 'soul_calming_grass', name: 'Soul Calming Grass', rarity: 'Iron', description: 'A pale blue herb used to treat spiritual sea injuries and stabilize consciousness during breakthroughs.' },
    { id: 'jade_heart_flower', name: 'Jade Heart Flower', rarity: 'Bronze', description: 'A translucent blossom that stabilizes volatile pill recipes and soothes meridian damage.' },
    { id: 'netherworld_flame_mushroom', name: 'Netherworld Flame Mushroom', rarity: 'Bronze', description: 'Thrives near underground fire veins; a key ingredient in flame-attribute alchemical refinements.' },
    { id: 'thousand_year_ginseng', name: 'Thousand-Year Ginseng', rarity: 'Silver', description: 'A deeply rooted spiritual herb that accumulates vitality over centuries, used as a base in longevity elixirs.' },
    { id: 'blood_lotus', name: 'Blood Lotus', rarity: 'Silver', description: 'Grows only in pools of demonic beast blood, prized for refining body-tempering pills.' },
    { id: 'dragon_saliva_grass', name: 'Dragon Saliva Grass', rarity: 'Silver', description: 'Emits a faint draconic pressure; used in pills that enhance bloodline purity.' },
    { id: 'purple_cloud_vine', name: 'Purple Cloud Vine', rarity: 'Gold', description: 'A high-altitude creeper saturated with lightning-attribute energy, essential for tribulation-resistance pills.' },
    { id: 'immortal_revival_leaf', name: 'Immortal Revival Leaf', rarity: 'Transcendent', description: 'Legendary herb said to pull cultivators back from the brink of death, requiring ten thousand years to mature.' },
  ],
  minerals: [
    { id: 'black_tortoise_iron', name: 'Black Tortoise Iron', rarity: 'Bronze', description: 'Extraordinarily dense and durable ore ideal for defensive armors and shields.' },
    { id: 'crimson_flame_crystal', name: 'Crimson Flame Crystal', rarity: 'Bronze', description: 'A fire-element crystal that keeps weapons permanently heated, boosting destructive power.' },
    { id: 'chaos_jade', name: 'Chaos Jade', rarity: 'Bronze', description: 'A mottled gem that pulses with unstable energy. Used in targeted single-property rerolls during transmutation.' },
    { id: 'void_stone', name: 'Void Stone', rarity: 'Silver', description: 'A space-attribute mineral used to craft spatial rings and dimensional arrays.' },
    { id: 'mithril_essence', name: 'Mithril Essence', rarity: 'Silver', description: 'A lightweight, magic-conductive silver ore prized for inscription work and formation plates.' },
    { id: 'deep_sea_cold_iron', name: 'Deep Sea Cold Iron', rarity: 'Silver', description: 'Mined from abyssal ocean trenches, it infuses weapons with bone-chilling ice energy.' },
    { id: 'star_metal_ore', name: 'Star Metal Ore', rarity: 'Gold', description: 'Meteorite-born metal that channels astral energy, favored for forging heaven-grade weapons.' },
    { id: 'skyfire_meteorite', name: 'Skyfire Meteorite', rarity: 'Gold', description: 'Contains compressed solar essence; a single fragment can serve as a forge\'s eternal heat source.' },
    { id: 'heavenly_profound_metal', name: 'Heavenly Profound Metal', rarity: 'Transcendent', description: 'Nearly indestructible alloy-base reserved for emperor-grade artifacts.' },
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
    { id: 'spirit_stone', name: 'Spirit Stone', rarity: 'Iron', description: 'The universal currency and cultivation fuel of the martial world, containing condensed spiritual energy.' },
    { id: 'qi_condensation_pill', name: 'Qi Condensation Pill', rarity: 'Iron', description: 'A standard alchemical pill that accelerates qi gathering for cultivators below the Earth realm.' },
    { id: 'beast_core', name: 'Beast Core', rarity: 'Bronze', description: 'A crystal harvested from the body of a demonic beast, holding its accumulated elemental energy.' },
    { id: 'profound_accumulation_pill', name: 'Profound Accumulation Pill', rarity: 'Silver', description: 'Compressed spiritual energy in pill form designed to push cultivators through minor-realm bottlenecks.' },
    { id: 'origin_crystal', name: 'Origin Crystal', rarity: 'Silver', description: 'A higher-order spirit stone containing primal world energy, valued at thousands of ordinary spirit stones.' },
    { id: 'heaven_spirit_dew', name: 'Heaven Spirit Dew', rarity: 'Gold', description: 'Liquid spiritual energy that collects in ancient sacred grounds, drastically accelerating cultivation speed.' },
    { id: 'elemental_essence_bead', name: 'Elemental Essence Bead', rarity: 'Gold', description: 'A naturally formed pearl of pure elemental power left behind by ancient beasts or natural phenomena.' },
    { id: 'breakthrough_golden_pill', name: 'Breakthrough Golden Pill', rarity: 'Transcendent', description: 'A legendary pill that shatters major-realm barriers, with catastrophic side effects if the body is unprepared.' },
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
