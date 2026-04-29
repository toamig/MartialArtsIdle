import CardGridEditor from './CardGridEditor.jsx';
import { QI_SPARKS } from '../../data/qiSparks.js';
import qiSparksSchema from '../schemas/qiSparks.js';

/**
 * Qi Sparks editor — every card in the rarity-weighted draw pool.
 * Sparks have kind-discriminated payloads (timed / instant / mechanic / …)
 * but the schema is flat: each kind ignores fields it does not consume.
 */
export default function QiSparksEditor({ edited, onChangeRecords }) {
  return (
    <CardGridEditor
      baselineRecords={QI_SPARKS}
      editedRecords={edited.records || {}}
      onChangeRecords={onChangeRecords}
      schema={qiSparksSchema}
      idField="id"
      displayLabel={(rec, key) => `${rec?.name ?? key} (${rec?.rarity ?? '?'})`}
      allowAdd={true}
      newIdPlaceholder="new_spark_id"
      initialNewRecord={{
        id:          'new_spark',
        rarity:      'common',
        name:        'New Spark',
        description: '',
        kind:        'instant',
        effect:      { type: 'qi_seconds', value: 30 },
      }}
      cardMinWidth="380px"
    />
  );
}
