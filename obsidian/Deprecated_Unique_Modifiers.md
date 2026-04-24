# Deprecated Unique Modifiers

Archive of every law, artefact, and technique unique modifier removed during the **Damage & Element System Overhaul** (2026-04-24). Pools are now empty in code; this doc preserves the prior content so it can be re-introduced or reworked under the new 5-element model.

> Source-of-truth at the time of removal:
> - Law uniques: `src/data/lawUniques.js` → `LAW_UNIQUES` (119 entries)
> - Artefact uniques: `src/data/uniqueModifiers.js` → `ARTEFACT_UNIQUES` (~110 entries)
> - Technique uniques: `src/data/uniqueModifiers.js` → `TECHNIQUE_UNIQUES` (~110 entries split across Attack / Heal / Defend / Dodge)

> All references to primary stats (Essence / Soul / Body), psychic damage, soul toughness, and the 9-pool type system (`physical / sword / fist / fire / water / earth / spirit / void / dao`) are obsolete. The new model uses 5 elements (`fire / water / earth / wood / metal`), 2 damage buckets (`physical / elemental`), and 6 unique pools (`fire / water / earth / wood / metal / general`).

---

## Law Uniques (119)

Compact table — full effect data lives in git history at the commit prior to the overhaul (`src/data/lawUniques.js`).

### Cultivation speed
| id | range | description |
|---|---|---|
| `l_limitless_vessel` | 80–150 | `{v}%` increased Qi Cultivation Speed. 50% less Combat Damage. |
| `l_patient_mountain` | 100–200 | `{v}%` increased Qi Cultivation Speed. Cannot use techniques for 5s after combat starts. |
| `l_dao_hunger` | 5–15 | `{v}%` increased Qi Cultivation Speed per major realm. |
| `l_breath_of_eternity` | 40–80 | `{v}%` increased Qi Cultivation Speed per active Pill. |
| `l_qi_spring` | 5–15 | `{v}%` more Qi gained while idle in combat. |
| `l_meditation_path` | 30–80 | `{v}%` increased Qi Gain after 20 minutes without combat. |
| `l_seasoned_cultivator` | 100–250 | `{v}%` increased Qi from Offline Earnings. |
| `l_eternal_breath` | 50–120 | `{v}%` increased Cultivation Speed. Cannot equip techniques. |
| `l_focused_cultivation` | 50–90 | `{v}%` increased Cult. Speed while focusing, `{v}%` reduced while not. |

### Body / HP focus
| id | range | description |
|---|---|---|
| `l_diamond_body` | 30–60 | `{v}%` increased Body. 50% less Soul. |
| `l_iron_marrow` | 30–80 | `{v}%` increased Health and Defense. 30% less Qi Cultivation Speed. |
| `l_mountain_stance` | 50–120 | `{v}%` increased Health and Defense. Cannot dodge. |
| `l_living_fortress` | 80–200 | `{v}%` increased Defense. 25% increased Technique Cooldowns. |
| `l_titan_blood` | 8–20 | `{v}%` increased Maximum Health per major realm. |
| `l_reincarnated_titan` | 100–250 | `{v}%` increased Health. Lose 1 Technique Slot. |
| `l_warrior_pulse` | 20–60 | `{v}%` increased Damage while Body > Essence + Soul. |

### Soul focus
| id | range | description |
|---|---|---|
| `l_spirit_sea` | 60–140 | `{v}%` increased Soul. 50% less Body. |
| `l_mental_blade` | 80–100 | `{v}%` increased Psychic Damage. 50% less Physical Damage. |
| `l_ethereal_form` | 30–70 | `{v}%` less Physical Dmg Taken. `{v}%` more Elemental Dmg Taken. |
| `l_dream_walker` | 40–100 | `{v}%` increased Cultivation Speed while in combat. |
| `l_soul_pierce` | 20–50 | Attacks ignore `{v}%` of enemy Soul Toughness. |
| `l_astral_projection` | 5–20 | `{v}%` chance for Psychic Attacks to deal Triple Damage. |
| `l_divine_consciousness` | 10–25 | `{v}%` increased Soul per Saint+ realm level. |
| `l_thoughtless_state` | 50–150 | `{v}%` increased Damage while at full Health. |
| `l_inner_void` | 40–90 | `{v}%` of Physical Damage converted to Psychic Damage. |

### Element / elemental damage
| id | range | description |
|---|---|---|
| `l_element_tyranny` | 100–250 | `{v}%` more Elemental Damage. Can only equip Elemental Techniques. |
| `l_volatile_chi` | 80–180 | `{v}%` more Elemental Damage. `{v}%` more Elemental Damage Taken. |
| `l_element_conversion` | 40–100 | `{v}%` of Physical Damage converted to your Law's Element. |
| `l_elemental_symphony` | 15–40 | `{v}%` increased Damage per unique element among equipped Techniques. |
| `l_burning_path` | 30–80 | (Fire) `{v}%` increased Damage. 10% of overkill carries to next enemy. |
| `l_frozen_path` | 30–80 | (Frost) `{v}%` increased Damage. Frost techniques stun for 1s. |
| `l_lightning_path` | 30–80 | (Lightning) `{v}%` increased Damage. Damage halved or doubled at random. |
| `l_void_path` | 30–80 | (Void) `{v}%` increased Damage. Attacks ignore 25% Defense. |
| `l_stone_path` | 30–80 | (Stone) `{v}%` increased Defense. Reflect 10% of Physical Damage. |

### Tempo / cooldown / dodge
| id | range | description |
|---|---|---|
| `l_quickened_steps` | 25–40 | `{v}%` reduced Cooldowns. 25% less Maximum Health. |
| `l_lightning_reflexes` | 20–50 | `{v}%` increased Dodge Chance. 50% less Defense. |
| `l_hummingbird_heart` | 30–40 | `{v}%` reduced Cooldowns. 30% reduced Pill Duration. |
| `l_blink_path` | 5–15 | Restore `{v}%` Health on successful dodge. |
| `l_perpetual_motion` | 5–15 | `{v}%` increased Damage per second since combat started (cap 100%). |
| `l_swallow_strike` | 30–40 | `{v}%` reduced Attack Cooldowns. 25% less Damage. |
| `l_sonic_step` | 20–60 | `{v}%` reduced Cooldowns for 2s after dodging. |
| `l_river_flow` | 1–4 | Restore `{v}%` Health per cooldown reset. |
| `l_unyielding_pace` | 30–70 | `{v}%` reduced Cooldowns while no Damage taken in last 5s. |
| `l_blade_dance` | 5–15 | Each consecutive attack deals `{v}%` more Damage (max 10, resets on hit taken). |

### Defense / damage reduction
| id | range | description |
|---|---|---|
| `l_unmovable_mountain` | 30–50 | `{v}%` less Damage Taken. `{v}%` less Damage Dealt. |
| `l_reflecting_pool` | 15–40 | Reflect `{v}%` of Damage Taken to attacker. |
| `l_living_shield` | 5–15 | `{v}%` of Maximum Health added to Defense. |
| `l_bonecage` | 50–70 | `{v}%` increased Defense. Cannot dodge. |
| `l_shell_path` | 50–150 | `{v}%` increased Defense during first 2s of combat. |
| `l_immortal_will` | 0 | Survive lethal damage with 1 HP once per fight. |
| `l_passive_resistance` | 20–50 | `{v}%` increased to all Elemental Defenses. |
| `l_perfect_form_tank` | 5–12 | `{v}%` increased Defense per major realm. |
| `l_stalwart_oath` | 10–30 | Regenerate `{v}%` Maximum Health per second. |

### High-damage with trade-offs
| id | range | description |
|---|---|---|
| `l_razors_edge` | 60–100 | `{v}%` increased Damage. 50% less Defense. |
| `l_all_in` | 50–100 | `{v}%` increased Damage. Cannot exceed 50% Maximum Health. |
| `l_blood_for_power` | 20–40 | `{v}%` increased Damage per 10% missing Health. |
| `l_overcharged` | 40–100 | `{v}%` increased Damage. Each attack drains 10% current Health. |
| `l_unstable_essence` | 60–140 | `{v}%` increased Elemental Damage. Chance to self-damage on hit. |
| `l_executioner_path` | 100–200 | `{v}%` increased Damage against enemies below 50% HP. |
| `l_blade_of_chaos` | 30–80 | `{v}%` increased Crit Damage. Crits cost 5% Health. |
| `l_sacred_offering` | 50–150 | `{v}%` increased Damage while below 25% Health. |
| `l_nuclear_path` | 100–200 | `{v}%` increased Damage. Cannot heal. |

### Healing / regen
| id | range | description |
|---|---|---|
| `l_eternal_spring` | 50–120 | `{v}%` increased Healing Received. 25% less Damage Dealt. |
| `l_vampiric_path` | 5–20 | `{v}%` of Damage Dealt restored as Health. |
| `l_self_renewal` | 10–20 | `{v}%` of Maximum Health regenerated per second. |
| `l_phoenix_path` | 20–30 | Restore `{v}%` Health if dropped below 50%. Once per fight. |
| `l_blood_pact` | 20–60 | `{v}%` more Healing while below 50% Health. |
| `l_qi_circulation` | 2–3 | `{v}%` of Maximum Health regenerated per second per active Pill. |
| `l_undying_will` | 30–70 | `{v}%` more Healing Effectiveness. |

### Crit chance / crit damage
| id | range | description |
|---|---|---|
| `l_lucky_star` | 20–50 | `{v}%` increased Crit Chance. Half damage chance. |
| `l_fortunes_favor` | 50–150 | `{v}%` increased Harvest+Mining Luck. 25% less Defense. |
| `l_perfect_strike` | 30–80 | Crits deal `{v}%` more Damage. |
| `l_crit_storm` | 20–60 | `{v}%` increased Crit Chance for 5s after a Crit. |
| `l_executioner_eye` | 30–80 | `{v}%` increased Crit Chance against enemies above 80% HP. |
| `l_lethal_focus` | 1–5 | `{v}%` increased Crit Chance per active Pill. |
| `l_god_of_chance` | 50–150 | `{v}%` increased Crit Damage. Chance to miss. |
| `l_assassin_creed` | 100–200 | `{v}%` increased Crit Damage on first attack. |
| `l_blood_in_water` | 5–15 | Crit Chance scales with missing HP, cap `{v}%`. |

### Stat / resource conversions
| id | range | description |
|---|---|---|
| `l_body_to_soul` | 30–80 | `{v}%` of Body counted as Soul. |
| `l_soul_to_body` | 30–80 | `{v}%` of Soul counted as Body. |
| `l_tri_harmony` | 20–40 | `{v}%` increased All Stats while ESB are within 10% of each other. |
| `l_qi_to_damage` | 1–5 | `{v}%` of current Qi added to Damage per attack. |
| `l_essence_to_health` | 5–15 | `{v}%` of Essence converted to Maximum Health. |
| `l_defense_to_damage` | 10–30 | `{v}%` of Defense added as flat Physical Damage. |
| `l_dao_consumption` | 5–10 | `{v}%` of Qi/sec converted to Health/sec. |

### Per-realm scaling
| id | range | description |
|---|---|---|
| `l_realm_ascension` | 5–15 | `{v}%` increased Damage per major realm. |
| `l_late_bloomer` | 10–30 | `{v}%` increased All Stats per realm above Saint. |
| `l_slow_burn_realm` | 1–2 | `{v}%` increased Qi per minute cultivating without breakthrough. |
| `l_path_of_kings` | 100–150 | `{v}%` increased All Stats at Peak realm. |
| `l_first_steps` | 50–150 | `{v}%` increased All Stats while below Saint. |
| `l_immortal_legacy` | 5–15 | `{v}%` Lifesteal per realm above Saint. |
| `l_eternal_pupil` | 50–70 | `{v}%` increased Qi/sec per realm. |
| `l_seekers_path` | 3–5 | `{v}%` reduced Crafting Cost per realm. |

### Conditional / on-trigger
| id | range | description |
|---|---|---|
| `l_predator_patience` | 50–150 | `{v}%` increased Damage while no Damage taken in last 10s. |
| `l_berserker_resolve` | 50–150 | `{v}%` increased Damage while below 50% Health. |
| `l_first_strike` | 100–300 | `{v}%` increased Damage on first attack after combat starts. |
| `l_last_stand` | 100–300 | `{v}%` increased Damage while below 25% Health. |
| `l_calm_water` | 80–100 | `{v}%` increased Defense while at full Health. |
| `l_deadly_focus` | 60–80 | `{v}%` increased Crit Chance for 3s after dodging. |
| `l_quiet_mind` | 80–100 | `{v}%` more Healing if no Techniques used in last 3s. |

### Bonus with cost / drawback
| id | range | description |
|---|---|---|
| `l_heavy_burden` | 30–80 | `{v}%` increased All Stats. 50% increased Cooldowns. |
| `l_reckless` | 40–100 | `{v}%` increased Damage. `{v}%` increased Damage Taken. |
| `l_chained_will` | 50–100 | `{v}%` increased All Stats. Cannot consume Pills. |
| `l_stubborn_path` | 100–200 | `{v}%` increased Damage. Cannot heal. |
| `l_cursed_inheritance` | 100–300 | `{v}%` increased Crit Damage. 50% less Normal Damage. |
| `l_oath_of_silence` | 30–80 | `{v}%` increased Qi Cultivation Speed. Cannot use Techniques. |
| `l_blood_chains` | 50–100 | `{v}%` increased Defense. Cannot dodge. |
| `l_sealed_path` | 50–100 | `{v}%` increased Body. Cannot equip rings. |
| `l_burdened_soul` | 50–150 | `{v}%` increased Soul. 50% reduced Pill Duration. |

### Crafting / activity utility
| id | range | description |
|---|---|---|
| `l_master_smith` | 10–20 | `{v}%` reduced Crafting Cost. |
| `l_alchemist_path` | 20–30 | `{v}%` increased Pill Effects. |
| `l_lucky_gather` | 50–150 | `{v}%` increased Harvest Speed. |
| `l_deep_miner` | 50–150 | `{v}%` increased Mining Speed. |
| `l_pill_hoarder` | 50–150 | `{v}%` increased Pill Duration. |
| `l_treasure_finder` | 30–80 | `{v}%` increased Harvest+Mining Luck. |
| `l_dual_brew` | 50 | 50% chance for Alchemy to produce 1 extra pill. |
| `l_artisan_path` | 10–20 | `{v}%` reduced Transmutation Cost. |

### Misc / multi-stat
| id | range | description |
|---|---|---|
| `l_balanced_dao` | 10–20 | `{v}%` increased All Stats. |
| `l_chaos_path` | 50–200 | A random stat receives `{v}%` bonus, rerolled at combat start. |
| `l_combo_strike` | 5–20 | Each Technique used adds `{v}%` Damage to the next. |
| `l_forgotten_form` | 2000–6000 | `{v}%` increased Damage while no Artefacts equipped. |
| `l_naked_path` | 200–500 | `{v}%` increased All Stats while no Artefacts equipped. |
| `l_no_fingers` | 50–150 | `{v}%` increased Damage while ring slots empty. |
| `l_dao_chain` | 100–200 | `{v}%` increased Damage while Law element matches all Tech elements. |
| `l_time_dilation` | 30–60 | `{v}%` reduced Cooldowns during first second of combat. |
| `l_quick_kill` | 50–150 | Gain `{v}` Qi on kill within 3s of spawn. |
| `l_slow_burn_combat` | 300–500 | `{v}%` increased Damage after 15s in combat. |
| `l_time_master` | 20–40 | `{v}%` more hits covered by Defend/Dodge buffs. |

---

## Artefact Uniques (110)

### Weapon
| id | name | range | description |
|---|---|---|---|
| `a_keen_edge` | Keen Edge | 5–15 | +`{v}%` exploit chance. |
| `a_blood_drinker` | Blood Drinker | 1–5 | Heal `{v}%` of damage dealt. |
| `a_executioner` | Executioner | 50–150 | +`{v}%` damage to enemies <25% HP. |
| `a_void_cleaver` | Void Cleaver | 10–25 | Ignore `{v}%` enemy defense. |
| `a_perfect_balance` | Perfect Balance | 5–15 | +`{v}%` damage per equipped artefact. |
| `a_phantom_edge` | Phantom Edge | 10–30 | All technique cooldowns -`{v}%`. |
| `a_void_pierce` | Void Pierce | 5–15 | +`{v}%` chance to ignore all defense. |
| `a_savage_grip` | Savage Grip | 5–15 | +`{v}%` damage from Body stat. |
| `a_ethereal_blade` | Ethereal Blade | 20–50 | +`{v}%` damage from Soul stat. |
| `a_sky_breaker` | Sky Breaker | 5–15 | +`{v}%` damage per major realm. |
| `a_combo_blade` | Combo Blade | 10–30 | Each consecutive hit deals +`{v}%` bonus. |

### Head
| id | name | range | description |
|---|---|---|---|
| `a_clear_mind` | Clear Mind | 5–15 | All technique cooldowns -`{v}%`. |
| `a_focused_will` | Focused Will | 5–15 | +`{v}%` exploit chance. |
| `a_serene_face` | Serene Face | 5–15 | +`{v}%` healing received. |
| `a_warmind` | Warmind | 20–60 | +`{v}%` damage if Soul > Body. |
| `a_seeker_eye` | Seeker's Eye | 5–15 | +`{v}%` exploit damage. |
| `a_oracles_insight` | Oracle's Insight | 5–15 | +`{v}%` chance to dodge fatal blows. |
| `a_clarity_storm` | Clarity Storm | 5–15 | After dodging, cooldowns -`{v}%` for 3s. |
| `a_crown_focus` | Crown of Focus | 5–15 | +`{v}%` chance to crit twice. |
| `a_inner_eye` | Inner Eye | 5–15 | +`{v}%` chance for techniques to not consume cooldown. |
| `a_visionary_mind` | Visionary Mind | 30–80 | +`{v}%` offline qi gain. |
| `a_warmask` | Warmask | 20–60 | +`{v}%` damage if 3+ techniques equipped. |
| `a_silent_crown` | Silent Crown | 30–80 | First attack each combat is a guaranteed crit. |
| `a_dao_helm` | Dao Helm | 5–15 | `{v}%` more qi/s. |

### Body
| id | name | range | description |
|---|---|---|---|
| `a_titan_chest` | Titan's Chest | 10–30 | +`{v}%` max HP. |
| `a_living_armor` | Living Armor | 1–5 | +`{v}%` HP/sec in combat. |
| `a_reflective_skin` | Reflective Skin | 5–15 | Reflect `{v}%` of damage taken. |
| `a_phoenix_robe` | Phoenix Robe | 30–80 | Once per fight, revive with `{v}%` HP. |
| `a_void_cloak` | Void Cloak | 5–15 | +`{v}%` dodge chance. |
| `a_blessed_robe` | Blessed Robe | 10–30 | +`{v}%` healing received. |
| `a_chain_armor` | Chain Armor | 5–15 | +`{v}%` defense per missing 10% HP. |
| `a_warlords_mantle` | Warlord's Mantle | 10–30 | +`{v}%` damage. +`{v/2}%` defense. |
| `a_silken_robe` | Silken Robe | 5–15 | +`{v}%` Soul. -5% Body. |
| `a_iron_carapace_pro` | Heavy Carapace | 30–80 | +`{v}%` defense. -10% speed. |
| `a_ancestral_robe` | Ancestral Robe | 5–15 | +`{v}%` all stats per major realm. |
| `a_battle_mail` | Battle Mail | 10–30 | +`{v}%` damage in first 10s of combat. |
| `a_serpent_skin` | Serpent Skin | 5–15 | +`{v}%` dodge. Heal `{v}%` on dodge. |
| `a_unyielding_garb` | Unyielding Garb | 5–20 | Cannot drop below `{v}%` HP for 3s after heavy damage. |
| `a_blossoming_robe` | Blossoming Robe | 1–5 | +`{v}%` HP/s while at full HP. |

### Hands
| id | name | range | description |
|---|---|---|---|
| `a_dragon_claws` | Dragon Claws | 5–15 | +`{v}%` crit damage. |
| `a_qi_channeler` | Qi Channeler | 5–15 | +`{v}%` damage from essence. |
| `a_void_grip` | Void Grip | 5–15 | Attacks ignore `{v}%` defense. |
| `a_blood_palms` | Blood Palms | 1–5 | Heal `{v}%` per hit. |
| `a_smith_hands` | Smith's Hands | 10–30 | Crafting cost reduced by `{v}%`. |
| `a_alchemist_hands` | Alchemist's Hands | 10–30 | Pill effects +`{v}%`. |
| `a_combo_grip` | Combo Grip | 5–15 | +`{v}%` per consecutive hit. |
| `a_warriors_grip` | Warrior's Grip | 5–15 | +`{v}%` damage and defense. |
| `a_qi_palms` | Qi Palms | 5–15 | `{v}%` more qi/s. |
| `a_destruction_grip` | Destruction Grip | 30–80 | +`{v}%` damage to objects and constructs. |
| `a_phoenix_palms` | Phoenix Palms | 5–15 | Fire damage heals `{v}%` of dealt damage. |

### Waist
| id | name | range | description |
|---|---|---|---|
| `a_qi_storage` | Qi Storage | 10–30 | `{v}%` more qi/s. |
| `a_sage_belt` | Sage's Belt | 5–15 | +`{v}%` pill effects. |
| `a_essence_belt` | Essence Belt | 5–15 | Convert `{v}%` body to essence. |
| `a_battle_sash` | Battle Sash | 5–15 | +`{v}%` damage per kill in last 5s. |
| `a_eternal_sash` | Eternal Sash | 1–5 | +`{v}%` HP/s. |
| `a_iron_belt` | Iron Belt | 10–30 | +`{v}%` defense and damage. |
| `a_lifebinder` | Lifebinder | 10–30 | +`{v}%` healing received. |
| `a_cursed_belt` | Cursed Belt | 50–150 | +`{v}%` damage. -25% defense. |
| `a_blessed_belt` | Blessed Belt | 5–15 | +`{v}%` all stats. |
| `a_emperor_belt` | Emperor's Belt | 10–25 | +`{v}%` to all stats per realm. |
| `a_thirsty_belt` | Thirsty Belt | 1–4 | +`{v}%` lifesteal. |
| `a_assassin_belt` | Assassin Belt | 5–15 | +`{v}%` crit chance. |

### Feet
| id | name | range | description |
|---|---|---|---|
| `a_swift_boots` | Swift Boots | 5–15 | +`{v}%` dodge chance. |
| `a_iron_greaves` | Iron Greaves | 10–30 | +`{v}%` defense. |
| `a_phoenix_boots` | Phoenix Boots | 5–15 | +`{v}%` HP/sec. |
| `a_dancers_boots` | Dancer's Boots | 10–30 | +`{v}%` damage after dodging. |
| `a_voidstep` | Voidstep | 1–5 | Each dodge resets one cooldown. |
| `a_dragon_treaders` | Dragon Treaders | 5–15 | +`{v}%` damage from Body. |
| `a_silent_steps` | Silent Steps | 50–150 | First attack is a guaranteed crit. |
| `a_iron_treads` | Iron Treads | 5–15 | +`{v}%` defense and HP. |
| `a_warriors_boots` | Warrior's Boots | 5–15 | +`{v}%` physical damage. |
| `a_eternal_treads` | Eternal Treads | 1–5 | +`{v}%` HP/s out of combat. |

### Neck
| id | name | range | description |
|---|---|---|---|
| `a_jade_pendant` | Jade Pendant | 5–15 | +`{v}%` Soul stat. |
| `a_dragon_amulet` | Dragon Amulet | 5–15 | +`{v}%` damage. |
| `a_seer_locket` | Seer Locket | 5–15 | +`{v}%` all loot. |
| `a_void_pendant` | Void Pendant | 5–15 | Ignore `{v}%` enemy defense. |
| `a_blood_amulet` | Blood Amulet | 1–4 | +`{v}%` lifesteal. |
| `a_qi_amulet` | Qi Amulet | 5–15 | `{v}%` more qi/s. |
| `a_warlords_amulet` | Warlord's Amulet | 5–15 | +`{v}%` damage and defense. |
| `a_oracle_amulet` | Oracle Amulet | 1–5 | +`{v}%` chance to dodge fatal blows. |
| `a_assassin_pendant` | Assassin Pendant | 5–15 | +`{v}%` crit chance. |
| `a_emperor_amulet` | Emperor's Amulet | 5–15 | +`{v}%` damage per realm. |
| `a_eternal_amulet` | Eternal Amulet | 5–15 | +`{v}%` healing. |
| `a_speed_amulet` | Amulet of Speed | 5–15 | -`{v}%` all cooldowns. |
| `a_combat_amulet` | Combat Amulet | 10–30 | +`{v}%` damage in first 5s of combat. |

### Ring
| id | name | range | description |
|---|---|---|---|
| `a_essence_ring` | Essence Ring | 5–15 | +`{v}%` Essence. |
| `a_soul_ring` | Soul Ring | 5–15 | +`{v}%` Soul. |
| `a_body_ring` | Body Ring | 5–15 | +`{v}%` Body. |
| `a_crit_ring` | Crit Ring | 5–15 | +`{v}%` crit chance. |
| `a_speed_ring` | Speed Ring | 5–15 | -`{v}%` cooldowns. |
| `a_blood_ring` | Blood Ring | 1–4 | +`{v}%` lifesteal. |
| `a_void_ring` | Void Ring | 5–15 | Ignore `{v}%` defense. |
| `a_dragon_ring` | Dragon Ring | 5–15 | +`{v}%` damage. |
| `a_iron_ring` | Iron Ring | 5–15 | +`{v}%` defense. |
| `a_emperor_ring` | Emperor Ring | 5–15 | +`{v}%` damage per realm. |
| `a_combo_ring` | Combo Ring | 5–15 | +`{v}%` per consecutive hit. |
| `a_lucky_ring` | Lucky Ring | 5–15 | +`{v}%` loot luck. |
| `a_warrior_ring` | Warrior Ring | 5–15 | +`{v}%` physical damage. |
| `a_mage_ring` | Mage Ring | 5–15 | +`{v}%` elemental damage. |
| `a_eternal_ring` | Eternal Ring | 5–15 | +`{v}%` healing. |
| `a_harvest_ring` | Harvest Ring | 10–30 | +`{v}%` harvest speed. |
| `a_mining_ring` | Mining Ring | 10–30 | +`{v}%` mining speed. |
| `a_alchemy_ring` | Alchemy Ring | 10–30 | Pill effects +`{v}%`. |

---

## Technique Uniques (~110)

### Attack
| id | name | range | description |
|---|---|---|---|
| `t_a_overwhelming` | Overwhelming | 30–80 | +`{v}%` damage. |
| `t_a_relentless` | Relentless | 5–15 | Each consecutive cast adds +`{v}%` (max 5). |
| `t_a_devastating` | Devastating | 50–150 | +`{v}%` damage. CD +50%. |
| `t_a_swift` | Swift | 20–50 | Cooldown -`{v}%`. |
| `t_a_essence_blade` | Essence Blade | 30–80 | +`{v}%` damage from Essence. |
| `t_a_soul_blade` | Soul Blade | 30–80 | +`{v}%` damage from Soul. |
| `t_a_body_blade` | Body Blade | 30–80 | +`{v}%` damage from Body. |
| `t_a_qi_blade` | Qi Blade | 1–4 | Each 100 qi adds `{v}` damage. |
| `t_a_chain_strike` | Chain Strike | 1–4 | Hits `{v}` extra enemies for 50%. |
| `t_a_double_strike` | Double Strike | 20–50 | `{v}%` chance to strike twice. |
| `t_a_triple_strike` | Triple Strike | 5–15 | `{v}%` chance to strike three times. |
| `t_a_pierce_def` | Pierce | 10–30 | Ignore `{v}%` enemy defense. |
| `t_a_void_strike` | Void Strike | 5–15 | `{v}%` chance to ignore all defense. |
| `t_a_brutal` | Brutal | 30–80 | +`{v}%` crit damage. |
| `t_a_keen` | Keen | 5–15 | +`{v}%` crit chance. |
| `t_a_executioner` | Executioner | 50–150 | +`{v}%` damage to enemies <25% HP. |
| `t_a_first_blood` | First Blood | 100–300 | +`{v}%` damage on first cast. |
| `t_a_finisher` | Finisher | 30–80 | +`{v}%` damage if last CD ready. |
| `t_a_combo` | Combo | 5–15 | +`{v}%` per other technique used in 5s. |
| `t_a_overflow_qi` | Overflow Qi | 5–15 | Excess qi deals `{v}%` bonus damage. |
| `t_a_focused` | Focused | 1–4 | Cooldown -`{v}s` on hit. |
| `t_a_efficient` | Efficient | 5–15 | `{v}%` chance to not consume cooldown. |
| `t_a_qi_drain` | Qi Drain | 1–5 | Restore `{v}%` qi per hit. |
| `t_a_blood_drinker` | Blood Drinker | 1–5 | Lifesteal `{v}%` of damage. |
| `t_a_kill_refresh` | Kill Refresh | 50–100 | `{v}%` chance to reset CD on kill. |
| `t_a_fire_strike` | Fire Strike | 30–80 | Bonus `{v}%` as fire damage. |
| `t_a_frost_strike` | Frost Strike | 30–80 | Bonus `{v}%` as frost damage. Slows. |
| `t_a_lightning` | Lightning | 30–80 | Bonus `{v}%` as lightning. Chains. |
| `t_a_void_dmg` | Void | 30–80 | Bonus `{v}%` as void damage. Ignores 50% def. |
| `t_a_elem_match` | Elemental Match | 30–80 | +`{v}%` damage if law=tech element. |
| `t_a_burn` | Burn | 5–15 | Burns enemies for `{v}%` over 3s. |
| `t_a_bleed` | Bleed | 5–15 | Bleeds enemies for `{v}%` over 5s. |
| `t_a_shock` | Shock | 5–15 | Shocked enemies take +`{v}%` from all sources. |
| `t_a_stun` | Stun | 5–15 | `{v}%` chance to stun on hit. |
| `t_a_curse` | Curse | 10–30 | Cursed enemies take +`{v}%` damage from all. |
| `t_a_kill_buff` | Kill Buff | 30–80 | +`{v}%` damage for 5s after kill. |
| `t_a_perfect_form` | Perfect Form | 50–150 | +`{v}%` damage at full HP. |
| `t_a_desperation` | Desperation | 50–150 | +`{v}%` damage when below 25% HP. |
| `t_a_glass_cannon` | Glass Cannon | 50–150 | +`{v}%` damage. Take `{v/4}%` recoil. |
| `t_a_realm_scale` | Realm Scaling | 5–15 | +`{v}%` damage per major realm. |
| `t_a_artefact_sync` | Artefact Sync | 5–15 | +`{v}%` damage per equipped artefact. |
| `t_a_pill_sync` | Pill Sync | 20–50 | +`{v}%` damage per active pill. |
| `t_a_law_resonance` | Law Resonance | 30–80 | Damage scales with law cultivation speed. |

### Heal
| id | name | range | description |
|---|---|---|---|
| `t_h_potent` | Potent | 30–80 | +`{v}%` healing. |
| `t_h_overflow` | Overflow | 10–30 | Can overheal up to +`{v}%` max HP. |
| `t_h_swift` | Swift | 20–50 | Cooldown -`{v}%`. |
| `t_h_emergency` | Emergency | 50–150 | +`{v}%` healing if HP <30%. |
| `t_h_burst` | Burst Heal | 30–80 | Heal +`{v}%` but doubles CD. |
| `t_h_regen` | Regen Field | 5–15 | +`{v}%` HP/s for 10s after cast. |
| `t_h_purify` | Purify | 1 | Removes all debuffs on cast. |
| `t_h_qi_restore` | Qi Restore | 5–15 | Also restores `{v}%` qi. |
| `t_h_combat_meditation` | Combat Meditation | 30–80 | Healing also grants +`{v}%` qi. |
| `t_h_blood_pact` | Blood Pact | 50–150 | +`{v}%` healing. Lose `{v/4}%` on cast. |
| `t_h_shield` | Holy Shield | 10–30 | Cast also grants +`{v}%` def for 5s. |
| `t_h_inner_peace` | Inner Peace | 5–15 | Reduces all CDs by `{v}%` on cast. |
| `t_h_lifebloom` | Lifebloom | 1–5 | Heal `{v}%` per second for 10s. |
| `t_h_phoenix` | Phoenix | 30–80 | On lethal damage, heal `{v}%`. 60s CD. |
| `t_h_renewal` | Renewal | 5–15 | +`{v}%` healing per missing 10% HP. |
| `t_h_pure_essence` | Pure Essence | 30–80 | Healing scales with Essence stat. |
| `t_h_blood_offering` | Blood Offering | 50–150 | Healing instead deals damage. |
| `t_h_oversoul` | Oversoul | 30–80 | Healing also restores +`{v}%` Soul for 10s. |
| `t_h_eternal_well` | Eternal Well | 5–15 | Subsequent heals within 5s are +`{v}%` stronger. |
| `t_h_no_cd` | No Cooldown | 5–15 | `{v}%` chance to not consume CD. |
| `t_h_realm_heal` | Realm Healing | 5–15 | +`{v}%` healing per major realm. |
| `t_h_qi_burn` | Qi Burn Heal | 5–15 | Spends 5% qi for +`{v}%` bonus healing. |
| `t_h_critical_heal` | Critical Heal | 30–80 | `{v}%` chance to heal twice. |
| `t_h_aoe_heal` | AoE Heal | 30–80 | Also heals nearby allies (TBD). |
| `t_h_pill_sync_heal` | Pill Sync | 20–50 | +`{v}%` healing per active pill. |
| `t_h_meditation` | Meditation | 30–80 | Gain +`{v}%` qi/s for 10s on cast. |
| `t_h_focus_mind` | Focus Mind | 30–80 | After heal, +`{v}%` damage for 5s. |
| `t_h_iron_skin` | Iron Skin | 30–80 | After heal, +`{v}%` defense for 5s. |
| `t_h_swift_recovery` | Swift Recovery | 1–4 | Reduce other CDs by `{v}s` on cast. |
| `t_h_perfect_heal` | Perfect Heal | 100–300 | First heal each combat is `{v}%` stronger. |

### Defend
| id | name | range | description |
|---|---|---|---|
| `t_d_aegis` | Aegis | 30–80 | Defense bonus +`{v}%`. |
| `t_d_iron_will` | Iron Will | 5–15 | +`{v}%` extra duration. |
| `t_d_reflect` | Reflect | 10–30 | Reflect `{v}%` of damage taken. |
| `t_d_counter` | Counter | 30–80 | After being hit, deal `{v}%` damage back. |
| `t_d_stalwart` | Stalwart | 30–80 | Cannot be reduced below 1 HP for `{v/10}s`. |
| `t_d_thorns` | Thorns | 5–15 | Attackers take `{v}%` recoil. |
| `t_d_phalanx` | Phalanx | 5–15 | +`{v}%` defense per nearby ally. |
| `t_d_ironclad` | Ironclad | 1–5 | Each hit absorbed extends duration by `{v}s`. |
| `t_d_swift_def` | Swift Defense | 20–50 | Cooldown -`{v}%`. |
| `t_d_blood_shield` | Blood Shield | 5–15 | Heal `{v}%` of blocked damage. |
| `t_d_qi_shield` | Qi Shield | 5–15 | Convert blocked damage to qi (max `{v}%`). |
| `t_d_perfect_block` | Perfect Block | 5–15 | `{v}%` chance to fully block an attack. |
| `t_d_offensive` | Offensive Stance | 20–60 | While active, +`{v}%` damage. |
| `t_d_endurance` | Endurance | 1–5 | +`{v}%` HP/s while active. |
| `t_d_meditation` | Meditation | 30–80 | While active, +`{v}%` qi gain. |
| `t_d_realm_def` | Realm Defense | 5–15 | +`{v}%` defense per realm. |
| `t_d_immovable` | Immovable | 30–80 | Cannot be moved/stunned. +`{v}%` defense. |
| `t_d_share` | Share Pain | 30–80 | Distribute `{v}%` of damage to attackers. |
| `t_d_phase` | Phase Defense | 5–15 | +`{v}%` chance to phase through attacks. |
| `t_d_resilient` | Resilient | 30–80 | +`{v}%` defense if HP above 80%. |

### Dodge
| id | name | range | description |
|---|---|---|---|
| `t_dg_swift` | Swift | 5–15 | +`{v}%` dodge chance. |
| `t_dg_phase` | Phase | 5–15 | Phase through `{v}` attacks. |
| `t_dg_after_dmg` | Vengeance | 30–80 | After dodge, next attack +`{v}%` damage. |
| `t_dg_after_heal` | Recovery | 5–15 | After dodge, heal `{v}%` HP. |
| `t_dg_after_cd` | Reset | 1–5 | After dodge, reduce `{v}` cooldowns by 1s. |
| `t_dg_chain` | Chain Dodge | 5–15 | Each dodge +`{v}%` next dodge chance. |
| `t_dg_phantom` | Phantom | 5–15 | Spawn afterimage that distracts enemies. |
| `t_dg_blink` | Blink | 5–15 | Dodge teleports you behind enemy. |
| `t_dg_perfect` | Perfect Dodge | 30–80 | Perfect dodge guarantees crit on next attack. |
| `t_dg_eternal` | Eternal Step | 1–4 | +`{v}%` chance for dodge to not consume CD. |
| `t_dg_qi_step` | Qi Step | 5–15 | Each dodge restores `{v}%` qi. |
| `t_dg_assassin` | Assassin | 50–150 | After dodge, +`{v}%` damage for 3s. |
| `t_dg_safe` | Safe Step | 30–80 | After dodge, +`{v}%` defense for 3s. |
| `t_dg_speedy_step` | Speedy Step | 5–15 | After dodge, -`{v}%` CD for 3s. |
| `t_dg_realm_dodge` | Realm Dodge | 5–15 | +`{v}%` dodge per realm. |
| `t_dg_combo` | Combo Dodge | 5–15 | +`{v}%` damage per dodge in last 5s. |
| `t_dg_eternal_phase` | Eternal Phase | 1–5 | `{v}%` chance dodge lasts 1s longer. |
| `t_dg_lucky` | Lucky Step | 5–15 | After dodge, next loot is +`{v}%` better. |
| `t_dg_void_step` | Void Step | 5–15 | After dodge, next attack ignores `{v}%` defense. |
| `t_dg_mirror` | Mirror Step | 30–80 | After dodge, copy attack is mirrored back. |

---

## Notes

- All 350+ uniques referenced primary stats (`essence` / `soul` / `body`), the 9-pool type system, or psychic damage. None survive the overhaul as-is.
- New unique pools live under `LAW_UNIQUE_POOLS = ['fire','water','earth','wood','metal','general']` and are empty at the time of the migration. Pick from this archive when refilling — but rewrite each entry's effect schema to use the new stat surface (no `essence`/`soul`/`body`, no `psychic_damage`, no `soul_toughness`).
- Artefact uniques are no longer auto-rolled. Artefacts now spawn with all modifier slots filled, no rerolls; if a unique slot is reintroduced it will follow the new spawn rules.
