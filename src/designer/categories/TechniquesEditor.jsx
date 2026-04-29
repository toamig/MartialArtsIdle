import CardGridEditor from './CardGridEditor.jsx';
import { TECHNIQUES } from '../../data/techniques.js';
import techniquesSchema from '../schemas/techniques.js';

/**
 * Techniques editor — 60 hand-authored secret techniques.
 * Each has a stable id (e.g. iron_attack_1). Quality + type are identity
 * fields. Most other fields are type-specific tuning knobs; the schema
 * exposes them all but only the relevant subset will be wired by the
 * combat engine.
 */
export default function TechniquesEditor({ edited, onChangeRecords }) {
  return (
    <CardGridEditor
      baselineRecords={TECHNIQUES}
      editedRecords={edited.records || {}}
      onChangeRecords={onChangeRecords}
      schema={techniquesSchema}
      idField="id"
      displayLabel={(rec, key) => `${rec?.icon ?? ''} ${rec?.name ?? key} — ${rec?.quality ?? '?'} ${rec?.type ?? ''}`.trim()}
      allowAdd={false}
      cardMinWidth="440px"
    />
  );
}
