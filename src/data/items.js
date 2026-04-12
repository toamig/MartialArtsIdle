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
