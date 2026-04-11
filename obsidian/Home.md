# Idle Cultivation — Design Document

> Mobile idle game combining cultivation (xianxia), idle mechanics, and incremental progression.

## Navigation

- [[Game Vision]] — Overall concept, target market, monetization angle
- [[Roadmap]] — Development stages
- [[Cultivation System]] — Realms, sub-realms, breakthroughs
- [[Primary Stats]] — Essence, Soul, Body
- [[Stats]] — Full stat reference + modifier catalogue
- [[Realm Progression]] — Major realms and their thresholds
- [[Laws]] — Elemental cultivation arts
- [[Secret Techniques]] — Advanced combat skills
- [[Items]] — Pills and Artefacts
- [[Materials]] — Herbs, Minerals, Cultivation resources
- [[Realms/Exploration]] — Zone discovery, region unlocks
- [[Realms/Gathering]] — Herb collection (idle)
- [[Realms/Mining]] — Ore extraction (idle)
- [[Combat]] — Map, zones, enemies
- [[Reincarnation]] — Prestige system
- [[Implementation Notes]] — Tech stack, file structure, what's built vs stubbed

## Core Pillars

| Pillar | Description |
|---|---|
| **Idle** | Set up farming, leave game running |
| **Mobile** | Designed for short sessions with passive progress |
| **Cultivation** | Xianxia-inspired progression — realms, qi, laws |

## Key Design Goals

- Incremental progression with visible **power bumps** to maintain engagement
- Multiple cultivation types via **procedural generation** (find books)
- **Reincarnation** as prestige loop — retain knowledge, reset world
- Long-term: target Chinese market if quality warrants

---

## Implementation Status

| Screen | Status |
|---|---|
| Home (Cultivation) | Implemented |
| Inventory (Materials) | Implemented |
| Inventory (Items) | Stub |
| Stats | Partial (hardcoded placeholders) |
| Training | Stub |
| Combat | Stub |
| Shop | Stub |

**Tech stack:** React 19 + Vite + Capacitor 8 (mobile)  
**Save system:** localStorage (`mai_save`, `mai_inventory`), auto-save every 2s  
**Game loop:** `requestAnimationFrame` with delta-time

See [[Implementation Notes]] for full technical details.

---

## Claude Commands
