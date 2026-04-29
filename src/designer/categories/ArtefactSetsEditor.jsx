import CardGridEditor from './CardGridEditor.jsx';
import { ARTEFACT_SETS } from '../../data/artefactSets.js';
import artefactSetsSchema from '../schemas/artefactSets.js';

/**
 * Artefact Sets editor — exposes the 2/4-piece bonuses for each set.
 * Set ids follow the pattern set_<element>_<n>; the element + name are
 * baked into the catalogue at construction time and the schema treats
 * `element` as informational only.
 */
export default function ArtefactSetsEditor({ edited, onChangeRecords }) {
  return (
    <CardGridEditor
      baselineRecords={ARTEFACT_SETS}
      editedRecords={edited.records || {}}
      onChangeRecords={onChangeRecords}
      schema={artefactSetsSchema}
      idField="id"
      displayLabel={(rec, key) => `${rec?.name ?? key} [${rec?.element ?? '?'}]`}
      allowAdd={false}
      cardMinWidth="460px"
    />
  );
}
