import CardGridEditor from './CardGridEditor.jsx';
import { NODES } from '../../data/reincarnationTree.js';
import reincarnationTreeSchema from '../schemas/reincarnationTree.js';

/**
 * Reincarnation Tree editor.
 *
 * Designer can tune cost / desc / prereqs per node. The actual effect of a
 * node is resolved at runtime by useReincarnationTree.js (pattern-matching
 * on id), so changing display text alone does NOT change gameplay — that
 * still requires a code change in the resolver.
 */
export default function ReincarnationTreeEditor({ edited, onChangeRecords }) {
  return (
    <CardGridEditor
      baselineRecords={NODES}
      editedRecords={edited.records || {}}
      onChangeRecords={onChangeRecords}
      schema={reincarnationTreeSchema}
      idField="id"
      displayLabel={(rec, key) => `${rec?.icon ?? ''} ${rec?.label ?? key} [${rec?.branch ?? '?'}]`.trim()}
      allowAdd={false}
      cardMinWidth="420px"
    />
  );
}
