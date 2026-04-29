/**
 * Qi Spark schema (src/data/qiSparks.js).
 *
 * Sparks come in three rarities (common / uncommon / rare) and several
 * "kinds" that drive their lifecycle. The schema exposes every numeric
 * tuning knob in the data file. Some fields are kind-specific (e.g.
 * `duration` only matters for `timed`); the SchemaForm preserves unknown
 * fields, so leaving an irrelevant field blank is safe.
 *
 * For the rare-tier MECHANIC cards, `mechanicId` + `tier` are identity
 * (1–5 ladder per mechanic). The five mechanic families ship at:
 *   crystal_click       — rate, capMinutes
 *   divine_qi           — spawnIntervalMs, windowMs, burstSeconds, doubleOrb, rateMult, rateBuffMs
 *   pattern_click       — dotCount, spawnIntervalMs, windowMs, burstSeconds, doubleOnFullClear, rateMult, rateBuffMs
 *   consecutive_focus   — holdMs, bonus, deepMeditation
 */

const RARITY_OPTIONS = [
  { value: 'common',   label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare',     label: 'Rare' },
];

const KIND_OPTIONS = [
  { value: 'instant',                 label: 'instant — fire-once on pick' },
  { value: 'timed',                   label: 'timed — active until expiresAt' },
  { value: 'until_breakthrough',      label: 'until_breakthrough — clears on next breakthrough' },
  { value: 'event_count',             label: 'event_count — active for N breakthroughs' },
  { value: 'next_breakthrough_flag',  label: 'next_breakthrough_flag — one-shot flag' },
  { value: 'lingering_focus_flag',    label: 'lingering_focus_flag — focus-release modifier' },
  { value: 'permanent',               label: 'permanent — run buff (stacks)' },
  { value: 'mechanic',                label: 'mechanic — rare-tier mechanic unlock' },
];

const EFFECT_TYPE_OPTIONS = [
  { value: '',                                 label: '— none —' },
  // instant
  { value: 'qi_seconds',                       label: 'qi_seconds (instant: N×qi/s as flat qi)' },
  // timed / until_breakthrough / event_count
  { value: 'qi_mult',                          label: 'qi_mult (additive bonus to qi/s mult)' },
  { value: 'focus_mult_bonus',                 label: 'focus_mult_bonus (additive to focus mult)' },
  // permanent stacking
  { value: 'qi_flat_per_stack',                label: 'qi_flat_per_stack (+N base qi/s per stack)' },
  { value: 'qi_mult_per_stack',                label: 'qi_mult_per_stack (+N% qi/s per stack)' },
  { value: 'focus_mult_bonus_per_stack',       label: 'focus_mult_bonus_per_stack' },
  { value: 'gate_reduction_per_stack',         label: 'gate_reduction_per_stack (−N% gate qi/s)' },
  { value: 'offline_qi_mult_per_stack',        label: 'offline_qi_mult_per_stack' },
  { value: 'qi_mult_per_breakthrough_per_stack', label: 'qi_mult_per_breakthrough_per_stack' },
];

const FLAG_OPTIONS = [
  { value: '',                       label: '— none —' },
  { value: 'painless_breakthrough',  label: 'painless_breakthrough' },
];

const MECHANIC_ID_OPTIONS = [
  { value: '',                  label: '— pick mechanic —' },
  { value: 'crystal_click',     label: 'crystal_click' },
  { value: 'divine_qi',         label: 'divine_qi' },
  { value: 'pattern_click',     label: 'pattern_click' },
  { value: 'consecutive_focus', label: 'consecutive_focus' },
];

const UNLOCK_CHECK_OPTIONS = [
  { value: '',           label: '— no gate —' },
  { value: 'qi_crystal', label: 'qi_crystal' },
];

const effectSchema = [
  { key: 'type',  type: 'enum',   label: 'Effect type', options: EFFECT_TYPE_OPTIONS },
  { key: 'value', type: 'number', label: 'Effect value', step: 0.01,
    help: 'Decimal where applicable: 0.5 = 50%; for qi_seconds, 30 = 30 seconds of qi.' },
];

export default [
  { key: 'id',          type: 'string',   label: 'Id (immutable)',
    help: 'Stable identifier referenced by useQiSparks state. Renaming breaks active sparks on existing saves.' },
  { key: 'rarity',      type: 'enum',     label: 'Rarity', options: RARITY_OPTIONS },
  { key: 'name',        type: 'string',   label: 'Display name' },
  { key: 'description', type: 'textarea', label: 'Description', rows: 2 },
  { key: 'kind',        type: 'enum',     label: 'Kind', options: KIND_OPTIONS,
    help: 'Drives lifecycle. Each kind ignores fields it does not need.' },

  // Lifecycle parameters (kind-specific; harmless when unused)
  { key: 'duration',           type: 'number', label: 'Duration (ms)', step: 1000,
    help: 'timed / lingering_focus_flag only.' },
  { key: 'breakthroughs',      type: 'number', label: 'Breakthroughs (event_count)', min: 1, step: 1 },
  { key: 'flag',               type: 'enum',   label: 'Flag (next_breakthrough_flag)', options: FLAG_OPTIONS },
  { key: 'residualMult',       type: 'number', label: 'Residual mult (lingering_focus)', step: 0.05 },
  { key: 'residualDurationMs', type: 'number', label: 'Residual duration ms (lingering_focus)', step: 1000 },

  // Effect (instant / timed / until_breakthrough / event_count / permanent)
  { key: 'effect',
    type: 'object',
    label: 'Effect',
    fields: effectSchema,
  },

  // Mechanic-card identity + per-mechanic tuning. Five mechanics, each with
  // a 1..5 tier ladder. Most fields are mechanic-specific.
  { key: 'mechanicId',     type: 'enum',   label: 'Mechanic id', options: MECHANIC_ID_OPTIONS },
  { key: 'tier',           type: 'number', label: 'Tier (1–5)', min: 1, max: 5, step: 1 },
  { key: 'unlockCheck',    type: 'enum',   label: 'Unlock check (T1 only)', options: UNLOCK_CHECK_OPTIONS },

  // crystal_click
  { key: 'rate',           type: 'number', label: 'Crystal rate (% of qi/s)', min: 0, max: 1, step: 0.05 },
  { key: 'capMinutes',     type: 'number', label: 'Crystal cap (minutes of qi/s)', min: 1, step: 1 },

  // divine_qi / pattern_click
  { key: 'spawnIntervalMs', type: 'number', label: 'Spawn interval (ms)', min: 1000, step: 1000 },
  { key: 'windowMs',        type: 'number', label: 'Tap window (ms)',     min: 1000, step: 500 },
  { key: 'burstSeconds',    type: 'number', label: 'Burst (seconds of qi)', min: 1, step: 1 },
  { key: 'dotCount',        type: 'number', label: 'Dot count (pattern_click)', min: 1, step: 1 },
  { key: 'doubleOrb',       type: 'boolean', label: 'Double orb (divine_qi T5)' },
  { key: 'doubleOnFullClear', type: 'boolean', label: 'Double on full clear (pattern_click T5)' },
  { key: 'rateMult',        type: 'number', label: 'Rate mult buff', step: 0.1 },
  { key: 'rateBuffMs',      type: 'number', label: 'Rate buff duration (ms)', step: 1000 },

  // consecutive_focus
  { key: 'holdMs',          type: 'number', label: 'Hold ms (consecutive_focus)', step: 500 },
  { key: 'bonus',           type: 'number', label: 'Per-tier qi/s bonus', step: 0.01 },
  { key: 'deepMeditation',  type: 'boolean', label: 'Deep meditation (T5)' },
];
