/**
 * CardGridEditor — condensed card-grid alternative to RecordEditor.
 *
 * Records are shown as cards in a responsive CSS grid. Each card header
 * is always visible; clicking it expands the inline form for that record.
 * All dirty tracking and patch-diffing semantics are identical to
 * RecordEditor, so callers can swap the component name without touching
 * any other props.
 *
 * Props (parallel to RecordEditor):
 *   baselineRecords   — map or indexed array of original records (read-only)
 *   editedRecords     — current override.records map (keyed by id or index str)
 *   onChangeRecords   — (nextRecords) => void
 *   schema            — field descriptors for SchemaForm
 *   idField           — where the id lives on each record (default 'id')
 *   isArrayIndex      — if true, keys are index strings ('0', '1', …)
 *   displayLabel      — (baseline, key) => string for the card title
 *   allowAdd          — show "+ New" button (default false)
 *   newIdPlaceholder  — hint text for the prompt (default 'new_id')
 *   initialNewRecord  — template object for new entries (default {})
 */

import { useMemo, useState } from 'react';
import SchemaForm from '../SchemaForm.jsx';

export default function CardGridEditor({
  baselineRecords,
  editedRecords,
  onChangeRecords,
  schema,
  idField = 'id',
  isArrayIndex = false,
  displayLabel,
  allowAdd = false,
  newIdPlaceholder = 'new_id',
  initialNewRecord = {},
  cardMinWidth = '300px',
}) {
  const baselineList = useMemo(
    () => toBaselineList(baselineRecords, idField, isArrayIndex),
    [baselineRecords, idField, isArrayIndex],
  );

  const [filter, setFilter]     = useState('');
  const [openCards, setOpenCards] = useState(() => new Set());

  const filtered = useMemo(() => {
    if (!filter) return baselineList;
    const q = filter.toLowerCase();
    return baselineList.filter((r) => {
      const lbl = displayLabel ? displayLabel(r.record, r.key) : String(r.key);
      return String(r.key).toLowerCase().includes(q) || lbl.toLowerCase().includes(q);
    });
  }, [baselineList, filter, displayLabel]);

  // Records that only exist in the override (newly added).
  const extraKeys = Object.keys(editedRecords).filter(
    (k) => !baselineList.some((b) => b.key === k),
  );

  const toggleCard = (key) => {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCardChange = (key, baseline, next) => {
    const base = baseline || {};
    const patch = {};
    let hasPatch = false;
    for (const k of new Set([...Object.keys(base), ...Object.keys(next)])) {
      if (JSON.stringify(base[k]) !== JSON.stringify(next[k])) {
        patch[k] = next[k] === undefined ? null : next[k];
        hasPatch = true;
      }
    }
    const nextRecords = { ...editedRecords };
    if (hasPatch) nextRecords[key] = patch;
    else delete nextRecords[key];
    onChangeRecords(nextRecords);
  };

  const handleDiscard = (key) => {
    const nextRecords = { ...editedRecords };
    delete nextRecords[key];
    onChangeRecords(nextRecords);
  };

  const addNewRecord = () => {
    const newId = prompt(`New record id (${newIdPlaceholder}):`, '');
    if (!newId) return;
    if (baselineRecords[newId] || editedRecords[newId]) {
      alert(`Record "${newId}" already exists.`);
      return;
    }
    onChangeRecords({ ...editedRecords, [newId]: { ...initialNewRecord } });
    setOpenCards((prev) => new Set([...prev, newId]));
  };

  return (
    <div className="dz-card-grid-editor">
      <div className="dz-card-grid-toolbar">
        <input
          className="dz-input"
          placeholder="Search…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {allowAdd && (
          <button className="dz-btn dz-btn-ghost" onClick={addNewRecord}>
            + New
          </button>
        )}
      </div>

      <div className="dz-card-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardMinWidth}, 1fr))` }}>
        {filtered.map(({ key, record }) => (
          <CardGridItem
            key={key}
            recordKey={key}
            baseline={record}
            patch={editedRecords[key]}
            schema={schema}
            displayLabel={displayLabel}
            open={openCards.has(key)}
            onToggle={() => toggleCard(key)}
            onFormChange={(next) => handleCardChange(key, record, next)}
            onDiscard={() => handleDiscard(key)}
          />
        ))}
        {extraKeys.map((key) => (
          <CardGridItem
            key={key}
            recordKey={key}
            baseline={null}
            patch={editedRecords[key]}
            schema={schema}
            displayLabel={displayLabel}
            open={openCards.has(key)}
            onToggle={() => toggleCard(key)}
            onFormChange={(next) => handleCardChange(key, null, next)}
            onDiscard={() => handleDiscard(key)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Card item ─────────────────────────────────────────────────────────── */

function CardGridItem({
  recordKey,
  baseline,
  patch,
  schema,
  displayLabel,
  open,
  onToggle,
  onFormChange,
  onDiscard,
}) {
  const merged  = { ...(baseline || {}), ...(patch || {}) };
  const isDirty = !!patch && Object.keys(patch).length > 0;
  const label   = displayLabel ? displayLabel(baseline, recordKey) : recordKey;
  const isNew   = baseline == null;

  return (
    <div className={`dz-card${open ? ' open' : ''}${isDirty ? ' dz-card-dirty' : ''}`}>
      <div className="dz-card-header" onClick={onToggle}>
        <span className="dz-card-title">{label}</span>
        <span className="dz-card-key">{recordKey}</span>
        {isNew  && <span className="dz-badge">new</span>}
        {isDirty && <span className="dz-rec-dot" />}
        <span className="dz-card-chevron">▸</span>
      </div>
      {open && (
        <div className="dz-card-body">
          <SchemaForm
            schema={schema}
            value={merged}
            onChange={onFormChange}
            compact={true}
          />
          {isDirty && (
            <div className="dz-card-actions">
              <button
                className="dz-btn dz-btn-ghost"
                style={{ fontSize: '11px', padding: '3px 9px' }}
                onClick={onDiscard}
              >
                Revert
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

/** Mirrors the same helper in RecordEditor — pure function, no side effects. */
function toBaselineList(records, idField, isArrayIndex) {
  if (isArrayIndex) {
    return records.map((record, i) => ({ key: String(i), record }));
  }
  if (Array.isArray(records)) {
    return records.map((record) => ({ key: String(record[idField]), record }));
  }
  return Object.keys(records).map((key) => ({ key, record: records[key] }));
}
