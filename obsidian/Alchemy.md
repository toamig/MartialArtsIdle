# Alchemy

Pill crafting system accessed via the **Production > Alchemy** tab. Combine three herbs in the Refining Furnace to produce pills that grant **permanent, irreversible** stat bonuses.

---

## How It Works

1. Select **three herbs** (slots arranged in a triangle around the furnace)
2. The combination determines which pill is produced — every valid combination maps to exactly one pill
3. Pick a **craft quantity** (×1 / ×5 / ×10) and click **Craft** to consume that many sets of herbs at once. The button label clamps to what you can actually afford (e.g. `Craft ×3` when you picked ×10 but only have ingredients for 3)
4. A `+N PillName` message rises above the furnace to confirm each craft
5. Consume pills from the **Pill Drawer** on the Home screen — each consumption permanently adds its stat bonus to the character

### Recipe Discovery

The **Craftable Recipes** panel below the furnace only lists pills the player has already brewed at least once. Undiscovered pills are hidden entirely — the first craft of a given pill ID reveals its recipes in the list. Discovered state persists under the localStorage key `mai_discovered_pills`; legacy saves seed this set from existing owned-pill counts so no recipes are re-locked on upgrade.

Pills have **no duration**. Every bonus applied by a pill is added once and persists indefinitely across sessions, stored in `permanentStats` (see [[Items#Implementation Notes]]).

---

## Recipe Rules

- A recipe is any **unordered combination of 3 herbs** (duplicates allowed — you can use the same herb three times)
- **Rarity constraint**: the maximum rarity distance between any two herbs in a recipe must be **≤ 2 tiers** (e.g. Iron + Silver is allowed, but Iron + Gold is not)
- There are **92 valid combinations** across the 10 available herbs
- Each combination produces **exactly one pill** — no ambiguity

### Rarity Tiers

| Tier | Rarity | Herbs |
|---|---|---|
| 1 | Iron | Sect Grounds Grass, Borderland Root |
| 2 | Bronze | Qi Vein Vine, Spirit Forest Bloom |
| 3 | Silver | Shattered Sky Lotus, Blood Sea Reed |
| 4 | Gold | Saint Burial Lotus, Void Thorn Vine |
| 5 | Transcendent | Origin Spring Petal, Open Heaven Vine |

### Pill Rarity from Ingredients

The pill's rarity is determined by the **total rarity tier sum** of the three herbs:

| Tier Sum | Pill Rarity | Pill Count |
|---|---|---|
| 3–5 | Iron | 10 |
| 6–7 | Bronze | 10 |
| 8–9 | Silver | 10 |
| 10–11 | Gold | 10 |
| 12–15 | Transcendent | 6 |

Within each band the 92 valid combinations are distributed round-robin across that band's pill slots, so each pill has a deterministic set of recipes that brew it.

---

## Pill Catalogue (46 pills)

Pills at Iron / Bronze / Silver / Gold follow a fixed 10-pill template: 3 primary-stat pills, 3 damage pills, 3 defense pills, 1 health pill. Transcendent is a premium tier of 6 utility-grade pills.

### Iron Pills (+3 primary, +5 damage, +5 defense, +40 health)

| Pill | Permanent Effect |
|---|---|
| Iron Essence Pill | +3 Essence |
| Iron Soul Pill | +3 Soul |
| Iron Body Pill | +3 Body |
| Iron Fist Pill | +5 Physical Damage |
| Iron Ember Pill | +5 Elemental Damage |
| Iron Mind Pill | +5 Psychic Damage |
| Iron Skin Pill | +5 Defense |
| Iron Ward Pill | +5 Elemental Defense |
| Iron Anchor Pill | +5 Soul Toughness |
| Iron Vigor Pill | +40 Health |

### Bronze Pills (+6 primary, +10 damage, +10 defense, +100 health)

| Pill | Permanent Effect |
|---|---|
| Bronze Essence Pill | +6 Essence |
| Bronze Soul Pill | +6 Soul |
| Bronze Body Pill | +6 Body |
| Bronze Fist Pill | +10 Physical Damage |
| Bronze Ember Pill | +10 Elemental Damage |
| Bronze Mind Pill | +10 Psychic Damage |
| Bronze Skin Pill | +10 Defense |
| Bronze Ward Pill | +10 Elemental Defense |
| Bronze Anchor Pill | +10 Soul Toughness |
| Bronze Vigor Pill | +100 Health |

### Silver Pills (+12 primary, +20 damage, +20 defense, +250 health)

| Pill | Permanent Effect |
|---|---|
| Silver Essence Pill | +12 Essence |
| Silver Soul Pill | +12 Soul |
| Silver Body Pill | +12 Body |
| Silver Fist Pill | +20 Physical Damage |
| Silver Ember Pill | +20 Elemental Damage |
| Silver Mind Pill | +20 Psychic Damage |
| Silver Skin Pill | +20 Defense |
| Silver Ward Pill | +20 Elemental Defense |
| Silver Anchor Pill | +20 Soul Toughness |
| Silver Vigor Pill | +250 Health |

### Gold Pills (+25 primary, +40 damage, +40 defense, +600 health)

| Pill | Permanent Effect |
|---|---|
| Gold Essence Pill | +25 Essence |
| Gold Soul Pill | +25 Soul |
| Gold Body Pill | +25 Body |
| Gold Fist Pill | +40 Physical Damage |
| Gold Ember Pill | +40 Elemental Damage |
| Gold Mind Pill | +40 Psychic Damage |
| Gold Skin Pill | +40 Defense |
| Gold Ward Pill | +40 Elemental Defense |
| Gold Anchor Pill | +40 Soul Toughness |
| Gold Vigor Pill | +600 Health |

### Transcendent Pills (6 premium)

| Pill | Permanent Effect |
|---|---|
| Transcendent Essence Pill | +50 Essence, +50 Soul, +50 Body |
| Exploit Mastery Pill | +5 Exploit Chance, +10 Exploit Attack Mult |
| World Harvest Pill | +50% Harvest Speed, +50% Mining Speed, +30 Harvest Luck, +30 Mining Luck |
| Cataclysm Pill | +75 Physical Damage, +75 Elemental Damage, +75 Psychic Damage |
| Dao Bulwark Pill | +75 Defense, +75 Elemental Defense, +75 Soul Toughness |
| Eternal Vigor Pill | +2000 Health |

---

## Modifier Mapping

Pill effects plug into the stats stacking model (see [[Stats]]):

- **Harvest Speed** and **Mining Speed** are applied as `increased` modifiers (percentage).
- Every other stat is applied as a `flat` modifier.

See `INCREASED_STATS` in `src/hooks/usePills.js` — that set is the authoritative list of stats that use `increased`.

---

## Pill Usage

- Pills appear in the **Pill Drawer** floating above the Home-screen navigation
- Tabs: **Combat** / **Harvest** / **Mining** (a pill shows in every tab its effects touch — e.g. the World Harvest Pill appears in both Harvest and Mining)
- Click **Consume (Permanent)** on a pill card to apply its bonuses once and reduce the stock by 1
- A floating stat-gain animation confirms the bonus was applied
- Consuming is irreversible — bonuses persist across reincarnations

---

## Related

- [[Materials]] — herbs used in recipes
- [[Crafting]] — transmutation system (separate from alchemy)
- [[Primary Stats]]
- [[Stats]]
- [[Items]]
- [[Realm Progression]]
