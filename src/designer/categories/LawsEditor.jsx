import RecordEditor from './RecordEditor.jsx';
import { LAWS } from '../../data/laws.js';
import lawsSchema from '../schemas/laws.js';

export default function LawsEditor({ edited, onChangeRecords }) {
  return (
    <RecordEditor
      baselineRecords={LAWS}
      editedRecords={edited.records || {}}
      onChangeRecords={onChangeRecords}
      schema={lawsSchema}
      groupBy={(rec) => rec?.element ?? 'Other'}
      displayLabel={(rec, key) => `${rec?.rarity ?? '?'} · ${rec?.name ?? key}`}
      allowAdd={true}
      newIdPlaceholder="new_law_id"
      initialNewRecord={{
        id: 'new_law',
        name: 'New Law',
        element: 'metal',
        types: ['metal'],
        rarity: 'Iron',
        realmRequirement: 0,
        realmRequirementLabel: 'Tempered Body',
        flavour: '',
        cultivationSpeedMult: 1.0,
        uniques: {},
      }}
    />
  );
}
