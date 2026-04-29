import RecordEditor from './RecordEditor.jsx';
import WORLDS from '../../data/worlds.js';
import worldsSchema from '../schemas/worlds.js';

// WORLDS (default export) is an array with `id`; use id-keyed records.
export default function WorldsEditor({ edited, onChangeRecords }) {
  // Strip runtime-added worldId from regions so the editor shows the source shape.
  const baseline = WORLDS.map((w) => ({
    ...w,
    regions: (w.regions || []).map(({ worldId: _worldId, ...r }) => r),
  }));

  return (
    <RecordEditor
      baselineRecords={baseline}
      editedRecords={edited.records || {}}
      onChangeRecords={onChangeRecords}
      schema={worldsSchema}
      idField="id"
      displayLabel={(rec, key) => `W${key} · ${rec.name}`}
      allowAdd={false} /* world ids are hand-authored — adding a world is a source-level change */
    />
  );
}
