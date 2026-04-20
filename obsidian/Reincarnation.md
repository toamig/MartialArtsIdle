# Reincarnation — Rebirth System

> *"The body is ash. The soul remembers. The next life begins wiser."*

---

## Overview

Reincarnation is the prestige mechanic. The player resets all progress in
exchange for **Reincarnation Karma**, a permanent currency spent in the
**Eternal Tree** to unlock powerful lifelong buffs.

- **Tab name:** Rebirth (new entry in the main NavBar).
- **Tab visibility:** unlocked the first time the player reaches **Saint Early Stage**
  (realm index 24). Once unlocked it stays visible forever, even after reincarnating
  (gate: `karma.unlocked === highestReached >= SAINT_UNLOCK_INDEX`).
- **The Reincarnate button itself** is additionally gated on the **current**
  realm — `cultivation.realmIndex >= 24` — so reborn characters cannot
  immediately rebirth again until they cultivate back up to Saint. The Eternal
  Tree remains spendable in the meantime.
- **Karma is awarded immediately on reaching a new realm for the first time.**
  Re-reaching a realm in a later life grants zero additional karma. Players
  can spend their karma in the Eternal Tree at any point — rebirth is not
  required to unlock nodes.

### What a rebirth does to the law library

Reincarnation wipes QI, realms, pills, inventory, artefacts, techniques, and selections — but the **entire owned-law library survives**. `activeLawId` is cleared, so the reborn character is unequipped and must pick a new active law from their persisted library. That unequip moment is the intentional identity reset — every life can be a different playstyle without losing past acquisitions. Karma and the Eternal Tree also persist.

---

## Karma per realm

Awarded for the breakthrough *into* the realm. Starting realm (index 0) grants
nothing — you only earn karma by progressing.

| Major realm (index range)        | Karma / stage | Major total |
|----------------------------------|--------------:|------------:|
| Tempered Body Layer 2–10 (1–9)   | 1             | 9           |
| Qi Transformation (10–13)        | 1             | 4           |
| True Element (14–17)             | 1             | 4           |
| Separation & Reunion (18–20)     | 2             | 6           |
| Immortal Ascension (21–23)       | 2             | 6           |
| Saint (24–26) — **unlock here**  | 2             | 6           |
| Saint King (27–29)               | 3             | 9           |
| Origin Returning (30–32)         | 3             | 9           |
| Origin King (33–35)              | 4             | 12          |
| Void King (36–38)                | 4             | 12          |
| Dao Source (39–41)               | 5             | 15          |
| Emperor Realm (42–44)            | 5             | 15          |
| Open Heaven Layer 1–6 (45–50)    | 6             | 36          |
| **Peak total**                   |               | **143**     |

Reaching peak in a single life awards all 143 karma.

Karma state lives in `localStorage` key `mai_reincarnation` and tracks:
- `karma` — current spendable balance
- `highestReached` — highest realm index ever touched across all lives
- `maxAwarded` — highest realm index that has already granted its karma
- `lives` — number of completed reincarnations

Pending karma (what would be awarded if the player reincarnated right now)
= `Σ karmaForReachingIndex(i)` for `i` from `maxAwarded+1` to `highestReached`.

---

## The Eternal Tree

A **5-branch radial tree** rendered in an SVG canvas (pannable + scroll-to-zoom).
Four main branches radiate from the root with a sealed fifth branch (Yin Yang)
that unlocks once the player has bought ≥ 2 of the four main keystones.

> **Total tree cost = 143 karma** — exactly what one peak life awards. Players
> reincarnate only when they have reached a *higher* realm than any previous
> life (each realm grants karma once via `maxAwarded` tracking). Reincarnation
> is a true progression milestone, not a karma-farming loop.

| Branch | Theme | Total |
|---|---|---|
| 🏛 **Ancestor's Legacy** | Head-start, recipe carry-over, offline cap, jade + cult buff | 25 |
| ⚔ **Martial Dao** | Cooldowns, exploit, +1 slot, crafted-tech quality, post-kill exploit | 25 |
| 🌟 **Fate's Path** | Craft-tier luck, gather/mine rarity, refine cost, +Selection options, dual auto-farm | 25 |
| 💪 **Heavenly Will** | All-primaries / HP scaling, undying resolve, pill effect mult | 25 |
| ☯ **Yin Yang** *(sealed: ≥ 2 keystones)* | Per-life scaling, qi-on-realm, HP regen, free-cast cycle, artefact value mult | 28 |
| 🔗 **Cross-branch connectors** | typeMults bonus, kill-bonus gather drops, Phase Technique law | 15 |

Each main branch has 4 sequential nodes + 1 keystone. Yin Yang has 5 nodes
unlocked behind the keystone gate. **Cross-branch connectors** (`cb_*`)
link main keystones with AND prereqs.

Authoritative definitions: `NODES` array in [src/data/reincarnationTree.js](../src/data/reincarnationTree.js).
Each node is `{ id, branch, step, label, icon, desc, cost, prereqs, prereqMode, keystone? }`
with `prereqMode ∈ { 'or', 'and', 'yyUnlock' }`.

Purchases persist in `localStorage` key `mai_reincarnation_tree` and are NOT
wiped on reincarnation. Each node is a one-time purchase. Nodes can be
bought at any time during a run — rebirth is not required.

### Full node list

| Node | Branch | Cost | Effect |
|---|---|---|---|
| Inherited Meridians (`al_1`) | Legacy | 3 | +25% qi/s permanently. |
| Echo of Mastery (`al_2`) | Legacy | 4 | Each new life starts with all crafting/alchemy recipes still discovered. |
| Ancestor's Shelter (`al_3`) | Legacy | 5 | Offline-gains cap raised 8h → 16h. |
| Bloodline Vigor (`al_4`) | Legacy | 6 | Each new life starts with +50 jade and 1 banked free Selection re-roll. |
| Living Memory ★ (`al_k`) | Legacy | 7 | At rebirth, gain a 1-hour ×2 cultivation buff. |
| Steady Hands (`md_1`) | Martial | 3 | All technique cooldowns −10%. |
| Combat Instinct (`md_2`) | Martial | 4 | +20% exploit chance permanently. |
| The Fourth Form (`md_3`) | Martial | 5 | Unlocks a 4th technique slot. |
| Veteran's Eye (`md_4`) | Martial | 6 | All crafted techniques arrive +1 quality tier. |
| Killing Stride ★ (`md_k`) | Martial | 7 | After defeating an enemy, next cast is a guaranteed exploit and deals +50% damage. |
| Lucky Star (`fp_1`) | Fate | 3 | +10% chance any artefact craft / pill brew rolls 1 tier higher. |
| Heavenly Nose (`fp_2`) | Fate | 4 | 10% chance any gathered/mined material is +1 rarity. |
| Connoisseur (`fp_3`) | Fate | 5 | All Refine operations cost −30% minerals. |
| Sage's Foresight (`fp_4`) | Fate | 6 | Selection screens at every major-realm breakthrough show 4 options instead of 3. |
| Twofold Path ★ (`fp_k`) | Fate | 7 | Auto-Farm can run two zone assignments simultaneously. |
| Soul Tempering (`hw_1`) | Will | 3 | +20% to all primary stats. |
| Iron Will (`hw_2`) | Will | 4 | +50% max HP permanently. |
| Undying Resolve (`hw_3`) | Will | 5 | Once per fight, surviving a lethal hit leaves you at 1 HP. |
| Soul Crucible (`hw_4`) | Will | 6 | All permanent pill stat bonuses are increased by 25%. |
| Heavenly Constitution ★ (`hw_k`) | Will | 7 | +25% MORE all primary stats and +25% MORE max HP (multiplicative). |
| Wisdom of Lives (`yy_1`) | Yin Yang | 4 | +5% to all damage and Health per completed life, capped +50%. |
| Yin Reservoir (`yy_2`) | Yin Yang | 5 | Every realm starts with 20% of its breakthrough qi cost already accumulated. |
| Yang Resolve (`yy_3`) | Yin Yang | 5 | Regenerate +5% max HP per second while above 50% HP. |
| Equilibrium (`yy_4`) | Yin Yang | 6 | Every 5th technique cast is free (no cooldown). |
| Primordial Balance ★ (`yy_k`) | Yin Yang | 8 | +10% engine-side multiplier on every artefact affix value you own. |
| Inherited Strength (`cb_is`) | cross — `al_k` + `hw_1` | 4 | Active law's typeMults are permanently +25%. |
| Veteran's Hunt (`cb_ts`) | cross — `md_k` + `fp_k` | 5 | After 10 enemy kills in a region, next gather/mine in that region drops at +1 rarity. |
| Phase Technique (`cb_pt`) | cross — all 4 main keystones | 6 | Grants the Phase Technique law: Transcendent, all 9 types, cannot be unequipped, crafting on it stays at base cost. |

---

## The reincarnate flow

1. Player clicks **Reincarnate** in the Rebirth tab.
2. Confirmation modal explains what is wiped vs what survives.
3. On confirm:
   - `karma.reincarnate()` bumps the life counter (karma itself was already
     granted incrementally as realms were reached).
   - `wipeReincarnation()` snapshots the **entire** owned-laws library,
     calls `wipeSave()` (which clears the standard set; `mai_jade`,
     `mai_lang`, `mai_reincarnation`, and `mai_reincarnation_tree` are
     untouched), then re-seeds `mai_owned_laws` from the snapshot.
     `mai_active_law` is intentionally **not** restored — the reborn
     character must re-equip a law from the persisted library.
   - `window.location.reload()` boots a fresh run — karma, tree and the
     full owned-laws library load back from their keys.

---

## Code map

| Responsibility                               | File                                   |
|----------------------------------------------|----------------------------------------|
| Karma scaling + tree node definitions        | `src/data/reincarnationTree.js`        |
| Karma state + per-realm tracking             | `src/hooks/useReincarnationKarma.js`   |
| Tree purchases + derived modifiers           | `src/hooks/useReincarnationTree.js`    |
| Tab UI                                       | `src/screens/ReincarnationScreen.jsx`  |
| Save-key preservation                        | `src/systems/save.js` (`wipeReincarnation`) |
| Nav tab entry                                | `src/components/NavBar.jsx`            |
| Wiring into cultivation / combat / stats     | `src/App.jsx` + `useCultivation.js` + `useCombat.js` |
