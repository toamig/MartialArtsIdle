/**
 * Reincarnation Tree node schema (src/data/reincarnationTree.js NODES).
 *
 * Each node has identity (id, branch, step) + display (label, icon, desc) +
 * gameplay (cost, prereqs, prereqMode). The actual *effect* of a node is
 * resolved at runtime by useReincarnationTree.js modifiers (it pattern-matches
 * on the id), so changing the description text alone won't change behaviour
 * — the JS resolver also has to know about it. The cost is freely tunable.
 */

const BRANCH_OPTIONS = [
  { value: 'legacy',  label: "🏛 Ancestor's Legacy" },
  { value: 'martial', label: '⚔ Martial Dao' },
  { value: 'fate',    label: "🌟 Fate's Path" },
  { value: 'will',    label: '💪 Heavenly Will' },
  { value: 'yinyang', label: '☯ Yin Yang' },
  { value: 'cross',   label: 'Cross-Branch' },
];

const PREREQ_MODE_OPTIONS = [
  { value: 'or',       label: 'or — any one prereq satisfies' },
  { value: 'and',      label: 'and — all prereqs required' },
  { value: 'yyUnlock', label: 'yyUnlock — ≥ 2 main keystones' },
];

export default [
  { key: 'id',     type: 'string', label: 'Id (immutable)',
    help: 'Stable identifier referenced by the runtime resolver in useReincarnationTree.js. Renaming requires a code change there too.' },
  { key: 'branch', type: 'enum',   label: 'Branch', options: BRANCH_OPTIONS },
  { key: 'step',   type: 'number', label: 'Step (0..N)', min: 0, step: 1,
    help: 'Position along the branch — drives layout coordinates.' },
  { key: 'label',  type: 'string', label: 'Display name' },
  { key: 'icon',   type: 'string', label: 'Icon (emoji)' },
  { key: 'desc',   type: 'textarea', label: 'Description', rows: 3 },
  { key: 'cost',   type: 'number', label: 'Karma cost', min: 1, step: 1,
    help: 'Total tree cost is calibrated so one peak life awards exactly enough karma to fully buy. Edit with care.' },
  { key: 'prereqs', type: 'array', label: 'Prereqs (node ids)', itemType: 'string',
    help: 'Plain id strings. Cross-branch links live here too.' },
  { key: 'prereqMode', type: 'enum', label: 'Prereq mode', options: PREREQ_MODE_OPTIONS },
];
