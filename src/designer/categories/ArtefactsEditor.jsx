import RecordEditor from './RecordEditor.jsx';
import { ARTEFACTS } from '../../data/artefacts.js';
import artefactsSchema from '../schemas/artefacts.js';

export default function ArtefactsEditor({ edited, onChangeRecords }) {
  return (
    <RecordEditor
      baselineRecords={ARTEFACTS}
      editedRecords={edited.records || {}}
      onChangeRecords={onChangeRecords}
      schema={artefactsSchema}
      idField="id"
      displayLabel={(rec, key) => `${rec?.slot ?? '?'} · ${rec?.rarity ?? ''} · ${rec?.name ?? key}`}
      allowAdd={true}
      newIdPlaceholder="new_artefact_id"
      initialNewRecord={{ name: 'New Artefact', slot: 'weapon', rarity: 'Iron' }}
    />
  );
}
