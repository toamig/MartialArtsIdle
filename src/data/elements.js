/**
 * elements.js — authoritative 5-element constant for laws, artefacts,
 * techniques, artefact sets, and (optionally) enemies.
 *
 * Introduced in Stage 5 of the Damage & Element System Overhaul. Replaces
 * the legacy 8-element law list (Fire/Water/Stone/Air/Metal/Wood/Normal/Ice)
 * and the 9-pool type system (physical/sword/fist/fire/water/earth/
 * spirit/void/dao) — see obsidian/Elements.md.
 */

export const ELEMENTS = ['fire', 'water', 'earth', 'wood', 'metal'];

/** `general` catch-all pool every law implicitly draws from. */
export const LAW_UNIQUE_POOLS = [...ELEMENTS, 'general'];

export const ELEMENT_SET = new Set(ELEMENTS);

/** True for one of the five canonical elements; false for 'general' / unknown. */
export function isElement(x) {
  return ELEMENT_SET.has(x);
}
