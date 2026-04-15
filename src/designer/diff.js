/**
 * Compute the designer override payload from the current edited state vs.
 * the baseline (the unpatched source data).
 *
 * The override JSON stores PATCHES — only fields that differ from the
 * baseline. That keeps commits focused and minimizes merge conflicts.
 *
 * Semantics per category:
 *   - Record maps (enemies): diff each record by id; emit only fields
 *     where the value differs from the baseline. Arrays compared by deep
 *     equality (JSON string) and emitted whole when different.
 *   - Array-by-index (realms): same, but key by index string.
 *   - Singleton tables (crafting): emit the whole replacement object under
 *     its singleton name if any field in it differs.
 */

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Return the subset of `edited` where values differ from `base`. */
function diffRecord(base, edited) {
  const base0 = base || {};
  const out = {};
  let changed = false;
  // Fields present in edited
  for (const k of Object.keys(edited)) {
    if (!deepEqual(base0[k], edited[k])) {
      out[k] = edited[k];
      changed = true;
    }
  }
  // Fields removed in edited (base has them, edited doesn't)
  for (const k of Object.keys(base0)) {
    if (!(k in edited)) {
      out[k] = null; // null sentinel = explicit delete (callers must interpret)
      changed = true;
    }
  }
  return changed ? out : null;
}

/** Record-map diff: base and edited are { [id]: record } maps. */
export function diffRecordMap(baseMap, editedMap) {
  const records = {};
  let count = 0;
  // Existing records that changed
  for (const id of Object.keys(editedMap)) {
    const d = diffRecord(baseMap[id], editedMap[id]);
    if (d !== null) { records[id] = d; count++; }
  }
  return { records, count };
}

/** Array-by-index diff: base and edited are arrays of same length. */
export function diffArrayByIndex(baseArr, editedArr) {
  const records = {};
  let count = 0;
  const n = Math.max(baseArr.length, editedArr.length);
  for (let i = 0; i < n; i++) {
    const d = diffRecord(baseArr[i] || {}, editedArr[i] || {});
    if (d !== null) { records[String(i)] = d; count++; }
  }
  return { records, count };
}

/** Singleton-table diff: base and edited are singleton objects keyed by name. */
export function diffSingletonTable(baseObj, editedObj) {
  const records = {};
  let count = 0;
  for (const key of Object.keys(editedObj)) {
    if (!deepEqual(baseObj[key], editedObj[key])) {
      records[key] = editedObj[key]; // full replacement
      count++;
    }
  }
  return { records, count };
}
