export const CATEGORY_LABELS = {
  cultivation: 'Cultivation',
  combat:      'Combat',
  laws:        'Laws',
  techniques:  'Techniques',
  artefacts:   'Artefacts',
  alchemy:     'Alchemy',
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS);

export const ACHIEVEMENTS = [
  // ── Cultivation ─────────────────────────────────────────────────────────────
  {
    id:        'realm_1',
    category:  'cultivation',
    icon:      '🌱',
    title:     'First Breath',
    desc:      'Take your first step on the path of cultivation.',
    condition: s => s.realmIndex >= 1,
  },
  {
    id:        'realm_10',
    category:  'cultivation',
    icon:      '🔥',
    title:     'Body Tempering Complete',
    desc:      'Forge your body through all ten layers of Tempered Body.',
    condition: s => s.realmIndex >= 10,
  },
  {
    id:        'realm_14',
    category:  'cultivation',
    icon:      '⚡',
    title:     'True Elements Awakened',
    desc:      'Enter the True Element realm and command the forces of nature.',
    condition: s => s.realmIndex >= 14,
  },
  {
    id:        'realm_21',
    category:  'cultivation',
    icon:      '☁️',
    title:     'Immortal Ascension',
    desc:      'Begin your ascent beyond mortal limits.',
    condition: s => s.realmIndex >= 21,
  },
  {
    id:        'realm_24',
    category:  'cultivation',
    icon:      '✨',
    title:     "Saint's Path",
    desc:      'Walk alongside those who have transcended ordinary existence.',
    condition: s => s.realmIndex >= 24,
  },
  {
    id:        'realm_27',
    category:  'cultivation',
    icon:      '👑',
    title:     'Saint King',
    desc:      'Rise to the pinnacle of the Saint ranks.',
    condition: s => s.realmIndex >= 27,
  },
  {
    id:        'realm_46',
    category:  'cultivation',
    icon:      '🌟',
    title:     'Open Heaven',
    desc:      'Shatter the heavens and touch the realm of Open Heaven.',
    condition: s => s.realmIndex >= 46,
  },

  // ── Combat ───────────────────────────────────────────────────────────────────
  {
    id:        'region_1',
    category:  'combat',
    icon:      '⚔️',
    title:     'First Blood',
    desc:      'Clear your first combat region.',
    condition: s => s.clearedRegionsCount >= 1,
  },
  {
    id:        'region_5',
    category:  'combat',
    icon:      '🗡️',
    title:     'World Traveler',
    desc:      'Conquer 5 regions across the world.',
    condition: s => s.clearedRegionsCount >= 5,
  },
  {
    id:        'region_15',
    category:  'combat',
    icon:      '🏯',
    title:     'Conqueror',
    desc:      'Bring 15 regions under your dominion.',
    condition: s => s.clearedRegionsCount >= 15,
  },

  // ── Laws ─────────────────────────────────────────────────────────────────────
  {
    id:        'law_2',
    category:  'laws',
    icon:      '📜',
    title:     'First Insight',
    desc:      'Comprehend a Martial Law beyond the Three Harmony Manual.',
    condition: s => s.ownedLawsCount >= 2,
  },
  {
    id:        'law_5',
    category:  'laws',
    icon:      '📚',
    title:     'Law Collector',
    desc:      'Accumulate 5 Martial Laws.',
    condition: s => s.ownedLawsCount >= 5,
  },
  {
    id:        'law_20',
    category:  'laws',
    icon:      '🏛️',
    title:     'Dao Master',
    desc:      'Command 20 Martial Laws.',
    condition: s => s.ownedLawsCount >= 20,
  },

  // ── Techniques ───────────────────────────────────────────────────────────────
  {
    id:        'tech_1',
    category:  'techniques',
    icon:      '🥋',
    title:     'Combat Arts',
    desc:      'Learn your first combat technique.',
    condition: s => s.ownedTechniquesCount >= 1,
  },
  {
    id:        'tech_5',
    category:  'techniques',
    icon:      '📖',
    title:     'Martial Library',
    desc:      'Add 5 techniques to your repertoire.',
    condition: s => s.ownedTechniquesCount >= 5,
  },
  {
    id:        'tech_20',
    category:  'techniques',
    icon:      '🎯',
    title:     'Technique Master',
    desc:      'Collect 20 combat techniques.',
    condition: s => s.ownedTechniquesCount >= 20,
  },

  // ── Artefacts ─────────────────────────────────────────────────────────────────
  {
    id:        'art_1',
    category:  'artefacts',
    icon:      '💎',
    title:     'Geared Up',
    desc:      'Obtain your first artefact.',
    condition: s => s.ownedArtefactsCount >= 1,
  },
  {
    id:        'art_10',
    category:  'artefacts',
    icon:      '🏆',
    title:     'Treasure Hoard',
    desc:      'Amass a collection of 10 artefacts.',
    condition: s => s.ownedArtefactsCount >= 10,
  },

  // ── Alchemy ───────────────────────────────────────────────────────────────────
  {
    id:        'pill_1',
    category:  'alchemy',
    icon:      '🧪',
    title:     'First Elixir',
    desc:      'Discover your first pill recipe.',
    condition: s => s.discoveredPillsCount >= 1,
  },
  {
    id:        'pill_10',
    category:  'alchemy',
    icon:      '⚗️',
    title:     'Pill Connoisseur',
    desc:      'Uncover 10 pill recipes.',
    condition: s => s.discoveredPillsCount >= 10,
  },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
