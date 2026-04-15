import RecordEditor from './RecordEditor.jsx';
import { PILLS } from '../../data/pills.js';
import pillsSchema from '../schemas/pills.js';

export default function PillsEditor({ edited, onChangeRecords }) {
  return (
    <RecordEditor
      baselineRecords={PILLS}
      editedRecords={edited.records || {}}
      onChangeRecords={onChangeRecords}
      schema={pillsSchema}
      idField="id"
      groupBy={(rec) => rec?.rarity ?? 'Other'}
      displayLabel={(rec, key) => rec?.name ?? key}
      allowAdd={true}
      newIdPlaceholder="new_pill_id"
      initialNewRecord={{ name: 'New Pill', rarity: 'Iron', duration: 60, effects: [] }}
    />
  );
}
