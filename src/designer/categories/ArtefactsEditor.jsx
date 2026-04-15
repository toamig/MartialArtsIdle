import CardGridEditor from './CardGridEditor.jsx';
import { ARTEFACTS } from '../../data/artefacts.js';
import artefactsSchema from '../schemas/artefacts.js';

export default function ArtefactsEditor({ edited, onChangeRecords }) {
  return (
    <CardGridEditor
      baselineRecords={ARTEFACTS}
      editedRecords={edited.records || {}}
      onChangeRecords={onChangeRecords}
      schema={artefactsSchema}
      idField="id"
      displayLabel={(rec, key) => `${rec?.rarity ?? '?'} · ${rec?.name ?? key}`}
      allowAdd={true}
      newIdPlaceholder="new_artefact_id"
      initialNewRecord={{ name: 'New Artefact', slot: 'weapon', rarity: 'Iron' }}
      cardMinWidth="400px"
    />
  );
}
