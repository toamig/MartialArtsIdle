import { useMemo } from 'react';
import CardGridEditor from './CardGridEditor.jsx';
import { ITEMS } from '../../data/items.js';
import itemsSchema from '../schemas/items.js';

/**
 * Items editor — flattens the 4 ITEMS categories into a single id-keyed
 * baseline so RecordEditor can handle it. Each baseline entry carries its
 * source category in `_category` so the override knows where to put new
 * items (the items.js wrapper looks at `_category` to decide which list
 * to append into).
 */
export default function ItemsEditor({ edited, onChangeRecords }) {
  const baseline = useMemo(() => {
    const out = {};
    for (const category of Object.keys(ITEMS)) {
      for (const it of ITEMS[category]) {
        out[it.id] = { ...it, _category: category };
      }
    }
    return out;
  }, []);

  return (
    <CardGridEditor
      baselineRecords={baseline}
      editedRecords={edited.records || {}}
      onChangeRecords={onChangeRecords}
      schema={itemsSchema}
      displayLabel={(rec, key) => rec?.name ?? key}
      allowAdd={true}
      newIdPlaceholder="new_item_id"
      initialNewRecord={{ name: 'New Item', rarity: 'Iron', _category: 'herbs' }}
      cardMinWidth="360px"
    />
  );
}
