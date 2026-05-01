/**
 * Audio manifest — single source of truth for all sound IDs and their file paths.
 *
 * Files live under public/audio/ so they are served as static assets (not bundled).
 * Prefer .ogg first (smaller, better loop), .mp3 as fallback for Safari/iOS.
 *
 * Paths are prefixed with BASE_URL so they resolve correctly on GitHub Pages
 * (base /MartialArtsIdle/) as well as root-served dev/native builds.
 *
 * Override model
 * ──────────────────────────────────────────────────────────────────────────
 * audio.override.json (committed via the Designer) can patch any entry.
 * BGM record keys are prefixed "bgm_" (e.g. "bgm_cultivation").
 * SFX record keys are the SFX id directly (e.g. "ui_click").
 * Supported patch fields:
 *   - volume     — number 0..1 (BGM + SFX)
 *   - loop       — boolean (BGM only)
 *   - src        — string[] of file URLs (single sample; legacy + non-variant SFX)
 *   - variations — { src: string[] }[] (multi-sample pool; combat hit variants)
 *
 * Variation pool model
 * ──────────────────────────────────────────────────────────────────────────
 * Some sounds are randomised at playback to avoid the machine-gun feel — every
 * combat hit picks one of N samples at random. A SFX entry can declare either
 * `src` (single sample) OR `variations: [{ src }, ...]`. AudioManager normalises
 * single-src entries to a one-element variation list internally.
 */

import audioOverride from '../data/config/audio.override.json';

const BASE = import.meta.env.BASE_URL;

const _overrides = audioOverride.records || {};

// Ensure override src paths have the correct BASE_URL prefix.
// Stored paths may be relative ("audio/sfx/foo.ogg") or legacy absolute ("/audio/sfx/foo.ogg").
function _prefixSrc(paths) {
  return paths.map(p => {
    if (p.startsWith('http') || p.startsWith(BASE)) return p;
    return BASE + p.replace(/^\//, '');
  });
}

function _applyBgm(id, cfg) {
  const patch = _overrides[`bgm_${id}`];
  if (!patch) return cfg;
  return {
    ...cfg,
    ...(patch.volume !== undefined && { volume: patch.volume }),
    ...(patch.loop   !== undefined && { loop:   patch.loop   }),
    ...(patch.src    !== undefined && { src:    _prefixSrc(patch.src) }),
  };
}

function _applySfx(id, cfg) {
  const patch = _overrides[id];
  if (!patch) return cfg;
  // When the override declares variations, it fully replaces the base entry's
  // src/variations — we don't merge per-variant. (Keeps the model simple: the
  // designer either uploads variants or doesn't.)
  const next = {
    ...cfg,
    ...(patch.volume !== undefined && { volume: patch.volume }),
  };
  if (patch.variations !== undefined) {
    // Designer pads unfilled slots with null so indexes stay stable in the JSON;
    // strip those (and any malformed entries) before the manager sees them.
    next.variations = patch.variations
      .filter(v => v && Array.isArray(v.src) && v.src.length > 0)
      .map(v => ({ ...v, src: _prefixSrc(v.src) }));
    delete next.src;
  } else if (patch.src !== undefined) {
    next.src = _prefixSrc(patch.src);
    delete next.variations;
  }
  return next;
}

function sfx(stem, ...exts) {
  return exts.map(e => `${BASE}audio/sfx/${stem}.${e}`);
}

/**
 * Build N variation entries for a base stem, e.g. sfxVariants('combat_hit_player', 3, 'ogg', 'mp3')
 * → [{src: [..._1.ogg, _1.mp3]}, {src: [..._2.ogg, _2.mp3]}, {src: [..._3.ogg, _3.mp3]}].
 * Each Howl falls back through its own ogg/mp3 chain (browser format support).
 */
function sfxVariants(stem, count, ...exts) {
  return Array.from({ length: count }, (_, i) => ({
    src: exts.map(e => `${BASE}audio/sfx/${stem}_${i + 1}.${e}`),
  }));
}

// ── Background music ─────────────────────────────────────────────────────────

const _BGM_BASE = {
  /** Calm meditative loop — Home screen, default cultivation state. */
  cultivation: {
    src:    [`${BASE}audio/bgm/cultivation.ogg`, `${BASE}audio/bgm/cultivation.mp3`],
    loop:   true,
    volume: 1.0,
  },
  /** High-energy loop — active Combat screen. */
  combat: {
    src:    [`${BASE}audio/bgm/combat.ogg`, `${BASE}audio/bgm/combat.mp3`],
    loop:   true,
    volume: 1.0,
  },
};

export const BGM_TRACKS = Object.fromEntries(
  Object.entries(_BGM_BASE).map(([id, cfg]) => [id, _applyBgm(id, cfg)])
);

// ── Sound effects ─────────────────────────────────────────────────────────────

const _SFX_BASE = {
  // ── UI ────────────────────────────────────────────────────────────────────
  ui_click:       { src: sfx('ui_click',       'ogg', 'mp3') },
  ui_open:        { src: sfx('ui_open',        'ogg', 'mp3') },
  ui_close:       { src: sfx('ui_close',       'ogg', 'mp3') },
  ui_confirm:     { src: sfx('ui_confirm',     'ogg', 'mp3') },
  ui_notify:      { src: sfx('ui_notify',      'ogg', 'mp3') },

  // ── Cultivation ───────────────────────────────────────────────────────────
  cult_qi_pulse:       { src: sfx('cult_qi_pulse',       'ogg', 'mp3') },
  cult_breakthrough:   { src: sfx('cult_breakthrough',   'ogg', 'mp3') },
  cult_channel_start:  { src: sfx('cult_channel_start',  'ogg', 'mp3') },
  cult_channel_end:    { src: sfx('cult_channel_end',    'ogg', 'mp3') },
  cult_boost_active:   { src: sfx('cult_boost_active',   'ogg', 'mp3') },

  // ── Combat ────────────────────────────────────────────────────────────────
  // Hit / dodge / death sounds use 3-variant pools so consecutive triggers don't
  // sound identical. Once-per-fight sounds (technique / heal / victory / defeat)
  // stay single-sample.
  combat_hit_player:   { variations: sfxVariants('combat_hit_player', 3, 'ogg', 'mp3') },
  combat_hit_enemy:    { variations: sfxVariants('combat_hit_enemy',  3, 'ogg', 'mp3') },
  combat_critical:     { variations: sfxVariants('combat_critical',   3, 'ogg', 'mp3') },
  combat_dodge:        { variations: sfxVariants('combat_dodge',      3, 'ogg', 'mp3') },
  combat_enemy_die:    { variations: sfxVariants('combat_enemy_die',  3, 'ogg', 'mp3') },
  combat_technique:    { src: sfx('combat_technique',    'ogg', 'mp3') },
  combat_heal:         { src: sfx('combat_heal',         'ogg', 'mp3') },
  combat_victory:      { src: sfx('combat_victory',      'ogg', 'mp3') },
  combat_defeat:       { src: sfx('combat_defeat',       'ogg', 'mp3') },

  // ── Qi Crystal ────────────────────────────────────────────────────────────
  crystal_tap:         { src: sfx('crystal_tap',         'ogg', 'mp3') },
  crystal_tap_max:     { src: sfx('crystal_tap_max',     'ogg', 'mp3') },
  crystal_evolve:      { src: sfx('crystal_evolve',      'ogg', 'mp3') },
  divine_qi_collect:   { src: sfx('divine_qi_collect',   'ogg', 'mp3') },

  // ── Qi Sparks ─────────────────────────────────────────────────────────────
  spark_pattern_tap:   { src: sfx('spark_pattern_tap',   'ogg', 'mp3') },
  spark_pattern_clear: { src: sfx('spark_pattern_clear', 'ogg', 'mp3') },
  spark_pattern_miss:  { src: sfx('spark_pattern_miss',  'ogg', 'mp3') },

  // ── Items / Crafting ──────────────────────────────────────────────────────
  item_craft:          { src: sfx('item_craft',          'ogg', 'mp3') },
  item_upgrade:        { src: sfx('item_upgrade',        'ogg', 'mp3') },
  item_equip:          { src: sfx('item_equip',          'ogg', 'mp3') },
  item_unequip:        { src: sfx('item_unequip',        'ogg', 'mp3') },
  item_pill_use:       { src: sfx('item_pill_use',       'ogg', 'mp3') },
  item_refine:         { src: sfx('item_refine',         'ogg', 'mp3') },
};

export const SFX = Object.fromEntries(
  Object.entries(_SFX_BASE).map(([id, cfg]) => [id, _applySfx(id, cfg)])
);

/** All SFX ids as a typed union helper — useful for autocomplete when calling playSfx(). */
export const SFX_ID = /** @type {const} */ (Object.keys(SFX));
