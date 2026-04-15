/**
 * Designer override loader — merges user-edited JSON patches on top of the
 * hardcoded data modules at module-load time.
 *
 * Authoring model
 * ──────────────────────────────────────────────────────────────────────────
 *   The designer admin panel (src/designer/) writes per-domain JSON files
 *   under src/data/config/ that this loader reads via static import. Static
 *   imports are inlined by Vite at build time, so every shipping build
 *   carries whatever overrides were committed when the build ran.
 *
 *   Because the overrides resolve at IMPORT time and downstream data modules
 *   build their singletons (PILLS_BY_ID, RECIPE_MAP, …) once on first import,
 *   a committed override only takes effect after a full page reload.
 *
 * Merge semantics
 * ──────────────────────────────────────────────────────────────────────────
 *   mergeRecords (record maps, e.g. ENEMIES keyed by id):
 *     - For each id in the override's `records`, shallow-merge the patch
 *       onto the base record. Unknown fields in either side are preserved.
 *     - Arrays are REPLACED wholesale, not merged (avoids index ambiguity).
 *
 *   mergeSingleton (named singleton tables, e.g. SLOT_BRACKETS in crafting):
 *     - The override stores the whole replacement object under
 *       records[<singletonName>]. If present, use it verbatim; otherwise
 *       return the base object unchanged.
 */

import worldsOverride     from './worlds.override.json';
import enemiesOverride    from './enemies.override.json';
import realmsOverride     from './realms.override.json';
import craftingOverride   from './crafting.override.json';
import itemsOverride      from './items.override.json';
import pillsOverride      from './pills.override.json';
import lawsOverride       from './laws.override.json';
import artefactsOverride  from './artefacts.override.json';
import affixPoolsOverride from './affixPools.override.json';
import materialsOverride  from './materials.override.json';
import audioOverride      from './audio.override.json';

const OVERRIDES = {
  worlds:     worldsOverride,
  enemies:    enemiesOverride,
  realms:     realmsOverride,
  crafting:   craftingOverride,
  items:      itemsOverride,
  pills:      pillsOverride,
  laws:       lawsOverride,
  artefacts:  artefactsOverride,
  affixPools: affixPoolsOverride,
  materials:  materialsOverride,
  audio:      audioOverride,
};

/** Raw access — returns the full override document for a domain. */
export function getOverrideDoc(domain) {
  return OVERRIDES[domain] || { version: 1, records: {} };
}

/** Returns just the `records` object (keyed by id or singleton name). */
export function getRecordsPatch(domain) {
  return getOverrideDoc(domain).records || {};
}

/**
 * Shallow-merge record-map overrides onto a base map.
 * @param {Object} baseMap  - Map of { id: record }
 * @param {string} domain   - Override domain (e.g. 'enemies')
 * @returns {Object} New map with patches applied (base map not mutated).
 */
export function mergeRecords(baseMap, domain) {
  const patch = getRecordsPatch(domain);
  const keys = Object.keys(patch);
  if (keys.length === 0) return baseMap;

  const out = { ...baseMap };
  for (const id of keys) {
    const base = baseMap[id] || {};
    out[id] = { ...base, ...patch[id] };
  }
  return out;
}

/**
 * Apply record-map override to an ARRAY of records (each with an `id` field).
 * Returns a new array; order is preserved. Unknown ids in the override are
 * APPENDED so designers can add entirely new records.
 */
export function mergeRecordArray(baseArr, domain, idField = 'id') {
  const patch = getRecordsPatch(domain);
  const keys = Object.keys(patch);
  if (keys.length === 0) return baseArr;

  const patched = baseArr.map((rec) => {
    const p = patch[rec[idField]];
    return p ? { ...rec, ...p } : rec;
  });

  const existingIds = new Set(baseArr.map((r) => String(r[idField])));
  for (const id of keys) {
    if (!existingIds.has(id)) {
      patched.push({ [idField]: id, ...patch[id] });
    }
  }
  return patched;
}

/**
 * Apply overrides to an array whose identity is the POSITION (e.g. REALMS
 * is accessed by realm index; there is no stable id on each entry).
 * Override keys are array-index strings: "0", "1", ...
 *
 * Insert / remove / reorder are intentionally unsupported — realm indices
 * are save-file identity, so the MVP designer only edits existing entries.
 */
export function mergeArrayByIndex(baseArr, domain) {
  const patch = getRecordsPatch(domain);
  const keys = Object.keys(patch);
  if (keys.length === 0) return baseArr;

  return baseArr.map((rec, i) => {
    const p = patch[String(i)];
    return p ? { ...rec, ...p } : rec;
  });
}

/**
 * Full-object replacement for singleton tables (e.g. SLOT_BRACKETS).
 * The override stores the replacement under records[<key>].
 */
export function mergeSingleton(baseObj, domain, key) {
  const override = getRecordsPatch(domain)[key];
  return override ?? baseObj;
}
