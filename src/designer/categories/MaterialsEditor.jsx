/**
 * Materials editor — two sub-tabs (Herbs / Ores) since their cost field
 * differs (gatherCost vs mineCost). Each sub-tab is its own RecordEditor
 * over a namespaced subtree of the materials override (records.HERBS or
 * records.ORES).
 */
import { useState } from 'react';
import CardGridEditor from './CardGridEditor.jsx';
import { HERBS, ORES } from '../../data/materials.js';
import { HERB_SCHEMA, ORE_SCHEMA } from '../schemas/materials.js';

const SUB_TABS = [
  { id: 'HERBS', label: 'Herbs', baseline: HERBS, schema: HERB_SCHEMA, newRec: { rarity: 'Common', gatherCost: 15 }, placeholder: 'New Herb Name' },
  { id: 'ORES',  label: 'Ores',  baseline: ORES,  schema: ORE_SCHEMA,  newRec: { rarity: 'Common', mineCost:   15 }, placeholder: 'New Ore Name' },
];

export default function MaterialsEditor({ edited, onChangeRecords }) {
  const [tab, setTab] = useState(SUB_TABS[0].id);
  const sub = SUB_TABS.find((s) => s.id === tab);
  const all = edited.records || {};
  const subRecords = all[tab] || {};

  // Flatten partial-patch updates back into the namespaced structure.
  const onSubChange = (next) => {
    const nextAll = { ...all };
    if (Object.keys(next).length === 0) {
      delete nextAll[tab];
    } else {
      nextAll[tab] = next;
    }
    onChangeRecords(nextAll);
  };

  return (
    <div className="dz-materials-editor">
      <div className="dz-subtabs">
        {SUB_TABS.map((s) => (
          <button
            key={s.id}
            className={`dz-subtab ${tab === s.id ? 'active' : ''}`}
            onClick={() => setTab(s.id)}
          >
            {s.label} <span className="dz-subtab-count">({Object.keys(all[s.id] || {}).length})</span>
          </button>
        ))}
      </div>
      <CardGridEditor
        baselineRecords={sub.baseline}
        editedRecords={subRecords}
        onChangeRecords={onSubChange}
        schema={sub.schema}
        displayLabel={(rec, key) => `${rec?.rarity ?? '?'} · ${key}`}
        allowAdd={true}
        newIdPlaceholder={sub.placeholder}
        initialNewRecord={sub.newRec}
        cardMinWidth="320px"
      />
    </div>
  );
}
