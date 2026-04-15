/**
 * Affix pools editor — singleton per slot. Each slot owns a full pool
 * array; the override stores a complete replacement for any slot the
 * designer touched.
 *
 * Left rail: 8 slots. Right pane: a SchemaForm with one array field that
 * holds the entire pool for the selected slot.
 */
import { useState } from 'react';
import SchemaForm from '../SchemaForm.jsx';
import { AFFIX_POOL_BY_SLOT } from '../../data/affixPools.js';
import { AFFIX_SLOTS, AFFIX_ROW_SCHEMA } from '../schemas/affixPools.js';

export default function AffixPoolsEditor({ edited, onChangeRecords }) {
  const [selected, setSelected] = useState(AFFIX_SLOTS[0]);
  const records  = edited.records || {};
  const baseline = AFFIX_POOL_BY_SLOT[selected] || [];
  const current  = records[selected] ?? baseline;

  const onChange = (next) => {
    const nextRecords = { ...records };
    if (JSON.stringify(next) === JSON.stringify(baseline)) {
      delete nextRecords[selected];
    } else {
      nextRecords[selected] = next;
    }
    onChangeRecords(nextRecords);
  };

  const revert = () => {
    const nextRecords = { ...records };
    delete nextRecords[selected];
    onChangeRecords(nextRecords);
  };

  return (
    <div className="dz-record-editor">
      <aside className="dz-rec-list">
        <ul>
          {AFFIX_SLOTS.map((slot) => (
            <li key={slot}>
              <button
                className={`dz-rec-item ${selected === slot ? 'active' : ''} ${records[slot] ? 'dirty' : ''}`}
                onClick={() => setSelected(slot)}
              >
                <span className="dz-rec-item-label">{slot}</span>
                {records[slot] && <span className="dz-rec-dot" />}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="dz-rec-detail">
        <div className="dz-rec-detail-header">
          <span className="dz-rec-detail-id">{selected} pool</span>
          {records[selected] && (
            <button className="dz-btn dz-btn-ghost" onClick={revert}>Revert to baseline</button>
          )}
        </div>
        <p className="dz-placeholder-hint">
          Edits replace the entire affix pool for this slot. Reverting drops the override entry.
        </p>
        <SchemaForm
          schema={[{ key: 'pool', type: 'array', label: `${selected} affixes`, itemSchema: AFFIX_ROW_SCHEMA }]}
          value={{ pool: current }}
          onChange={(next) => onChange(next.pool)}
        />
      </section>
    </div>
  );
}
