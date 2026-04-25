/**
 * Crafting editor — singleton-table UI.
 *
 * Unlike other categories, crafting overrides store full REPLACEMENT objects
 * per singleton name (currently just SLOT_BRACKETS). Left rail lists the
 * singletons; right side is a SchemaForm.
 *
 * Editing loads the baseline value from the game source and the form writes
 * the full replaced object back to records[singletonName]. We only emit the
 * override when it actually differs from baseline (dirty detection handled
 * by the parent via diff-on-commit).
 */

import { useState } from 'react';
import SchemaForm from '../SchemaForm.jsx';
import { SLOT_BRACKETS } from '../../data/crafting.js';
import { CRAFTING_SINGLETONS } from '../schemas/crafting.js';

const BASELINES = {
  SLOT_BRACKETS,
};

export default function CraftingEditor({ edited, onChangeRecords }) {
  const [selected, setSelected] = useState(CRAFTING_SINGLETONS[0].key);
  const records = edited.records || {};
  const schema  = CRAFTING_SINGLETONS.find((s) => s.key === selected);

  const baseline = BASELINES[selected];
  const current  = records[selected] ?? baseline;

  const onChange = (nextValue) => {
    const nextRecords = { ...records };
    // If new value equals baseline, drop the override entry; otherwise store.
    if (JSON.stringify(nextValue) === JSON.stringify(baseline)) {
      delete nextRecords[selected];
    } else {
      nextRecords[selected] = nextValue;
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
          {CRAFTING_SINGLETONS.map((s) => (
            <li key={s.key}>
              <button
                className={`dz-rec-item ${selected === s.key ? 'active' : ''} ${records[s.key] ? 'dirty' : ''}`}
                onClick={() => setSelected(s.key)}
              >
                <span className="dz-rec-item-label">{s.label}</span>
                {records[s.key] && <span className="dz-rec-dot" />}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="dz-rec-detail">
        <div className="dz-rec-detail-header">
          <span className="dz-rec-detail-id">{schema.label}</span>
          {records[selected] && (
            <button className="dz-btn dz-btn-ghost" onClick={revert}>Revert to baseline</button>
          )}
        </div>
        {schema.description && <p className="dz-placeholder-hint">{schema.description}</p>}

        {schema.type === 'list' ? (
          /* array of objects — wrap SchemaForm's ArrayField via a one-field schema */
          <SchemaForm
            schema={[{ key: selected, type: 'array', label: schema.label, itemSchema: schema.itemSchema }]}
            value={{ [selected]: current }}
            onChange={(next) => onChange(next[selected])}
          />
        ) : (
          <SchemaForm schema={schema.fields} value={current} onChange={onChange} />
        )}
      </section>
    </div>
  );
}
