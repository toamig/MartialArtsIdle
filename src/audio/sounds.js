/**
 * Audio manifest — single source of truth for all sound IDs and their file paths.
 *
 * Files live under public/audio/ so they are served as static assets (not bundled).
 * Prefer .ogg first (smaller, better loop), .mp3 as fallback for Safari/iOS.
 *
 * Paths are relative to the web root. On native (Capacitor) builds Howler
 * resolves them against the app bundle automatically.
 *
 * Override model
 * ──────────────────────────────────────────────────────────────────────────
 * audio.override.json (committed via the Designer) can patch any entry.
 * BGM record keys are prefixed "bgm_" (e.g. "bgm_cultivation").
 * SFX record keys are the SFX id directly (e.g. "ui_click").
 * Supported patch fields: volume, loop (BGM only), src (replaces the array).
 */

import audioOverride from '../data/config/audio.override.json';

const _overrides = audioOverride.records || {};

function _applyBgm(id, cfg) {
  const patch = _overrides[`bgm_${id}`];
  if (!patch) return cfg;
  return {
    ...cfg,
    ...(patch.volume !== undefined && { volume: patch.volume }),
    ...(patch.loop   !== undefined && { loop:   patch.loop   }),
    ...(patch.src    !== undefined && { src:    patch.src    }),
  };
}

function _applySfx(id, cfg) {
  const patch = _overrides[id];
  if (!patch) return cfg;
  return {
    ...cfg,
    ...(patch.volume !== undefined && { volume: patch.volume }),
    ...(patch.src    !== undefined && { src:    patch.src    }),
  };
}

// ── Background music ─────────────────────────────────────────────────────────

const _BGM_BASE = {
  /** Calm meditative loop — Home screen, default cultivation state. */
  cultivation: {
    src:    ['/audio/bgm/cultivation.ogg', '/audio/bgm/cultivation.mp3'],
    loop:   true,
    volume: 1.0,
  },
  /** High-energy loop — active Combat screen. */
  combat: {
    src:    ['/audio/bgm/combat.ogg', '/audio/bgm/combat.mp3'],
    loop:   true,
    volume: 1.0,
  },
  /** Ambient exploration — Worlds, Gathering, Mining screens. */
  world: {
    src:    ['/audio/bgm/world.ogg', '/audio/bgm/world.mp3'],
    loop:   true,
    volume: 1.0,
  },
  /** Soft ambient — Settings, Inventory, Stats, non-gameplay screens. */
  menu: {
    src:    ['/audio/bgm/menu.ogg', '/audio/bgm/menu.mp3'],
    loop:   true,
    volume: 0.6,
  },
};

export const BGM_TRACKS = Object.fromEntries(
  Object.entries(_BGM_BASE).map(([id, cfg]) => [id, _applyBgm(id, cfg)])
);

// ── Sound effects ─────────────────────────────────────────────────────────────

const _SFX_BASE = {
  // ── UI ────────────────────────────────────────────────────────────────────
  /** Generic button / tap feedback. */
  ui_click:       { src: ['/audio/sfx/ui_click.ogg',       '/audio/sfx/ui_click.mp3']       },
  /** Screen or drawer slides open. */
  ui_open:        { src: ['/audio/sfx/ui_open.ogg',        '/audio/sfx/ui_open.mp3']        },
  /** Screen or drawer closes. */
  ui_close:       { src: ['/audio/sfx/ui_close.ogg',       '/audio/sfx/ui_close.mp3']       },
  /** Positive confirm / success action. */
  ui_confirm:     { src: ['/audio/sfx/ui_confirm.ogg',     '/audio/sfx/ui_confirm.mp3']     },
  /** Notification / alert ping. */
  ui_notify:      { src: ['/audio/sfx/ui_notify.ogg',      '/audio/sfx/ui_notify.mp3']      },

  // ── Cultivation ───────────────────────────────────────────────────────────
  /** Subtle ambient qi pulse — fires periodically while cultivating (not every tick). */
  cult_qi_pulse:       { src: ['/audio/sfx/cult_qi_pulse.ogg',       '/audio/sfx/cult_qi_pulse.mp3']       },
  /** Major milestone — realm breakthrough. */
  cult_breakthrough:   { src: ['/audio/sfx/cult_breakthrough.ogg',   '/audio/sfx/cult_breakthrough.mp3']   },
  /** Heavenly Qi channel begins. */
  cult_channel_start:  { src: ['/audio/sfx/cult_channel_start.ogg',  '/audio/sfx/cult_channel_start.mp3']  },
  /** Heavenly Qi channel ends / expires. */
  cult_channel_end:    { src: ['/audio/sfx/cult_channel_end.ogg',    '/audio/sfx/cult_channel_end.mp3']    },
  /** Heavenly Qi boost becomes active (ad watched). */
  cult_boost_active:   { src: ['/audio/sfx/cult_boost_active.ogg',   '/audio/sfx/cult_boost_active.mp3']   },

  // ── Combat ────────────────────────────────────────────────────────────────
  /** Player lands a hit on an enemy. */
  combat_hit_player:   { src: ['/audio/sfx/combat_hit_player.ogg',   '/audio/sfx/combat_hit_player.mp3']   },
  /** Enemy lands a hit on the player. */
  combat_hit_enemy:    { src: ['/audio/sfx/combat_hit_enemy.ogg',    '/audio/sfx/combat_hit_enemy.mp3']    },
  /** Critical hit — either side. */
  combat_critical:     { src: ['/audio/sfx/combat_critical.ogg',     '/audio/sfx/combat_critical.mp3']     },
  /** Dodge / miss. */
  combat_dodge:        { src: ['/audio/sfx/combat_dodge.ogg',        '/audio/sfx/combat_dodge.mp3']        },
  /** Secret technique activated. */
  combat_technique:    { src: ['/audio/sfx/combat_technique.ogg',    '/audio/sfx/combat_technique.mp3']    },
  /** Heal effect applied. */
  combat_heal:         { src: ['/audio/sfx/combat_heal.ogg',         '/audio/sfx/combat_heal.mp3']         },
  /** Player wins the fight. */
  combat_victory:      { src: ['/audio/sfx/combat_victory.ogg',      '/audio/sfx/combat_victory.mp3']      },
  /** Player is defeated. */
  combat_defeat:       { src: ['/audio/sfx/combat_defeat.ogg',       '/audio/sfx/combat_defeat.mp3']       },
  /** Enemy dies mid-wave. */
  combat_enemy_die:    { src: ['/audio/sfx/combat_enemy_die.ogg',    '/audio/sfx/combat_enemy_die.mp3']    },

  // ── Gathering / Mining ────────────────────────────────────────────────────
  /** Herb / material collected (common). */
  gather_collect:      { src: ['/audio/sfx/gather_collect.ogg',      '/audio/sfx/gather_collect.mp3']      },
  /** Rare item found during gathering. */
  gather_rare:         { src: ['/audio/sfx/gather_rare.ogg',         '/audio/sfx/gather_rare.mp3']         },
  /** Pickaxe strike during mining. */
  mine_strike:         { src: ['/audio/sfx/mine_strike.ogg',         '/audio/sfx/mine_strike.mp3']         },
  /** Ore collected. */
  mine_collect:        { src: ['/audio/sfx/mine_collect.ogg',        '/audio/sfx/mine_collect.mp3']        },

  // ── Items / Crafting ──────────────────────────────────────────────────────
  /** Item crafted successfully. */
  item_craft:          { src: ['/audio/sfx/item_craft.ogg',          '/audio/sfx/item_craft.mp3']          },
  /** Quality upgraded. */
  item_upgrade:        { src: ['/audio/sfx/item_upgrade.ogg',        '/audio/sfx/item_upgrade.mp3']        },
  /** Item equipped. */
  item_equip:          { src: ['/audio/sfx/item_equip.ogg',          '/audio/sfx/item_equip.mp3']          },
  /** Item unequipped. */
  item_unequip:        { src: ['/audio/sfx/item_unequip.ogg',        '/audio/sfx/item_unequip.mp3']        },
  /** Pill consumed. */
  item_pill_use:       { src: ['/audio/sfx/item_pill_use.ogg',       '/audio/sfx/item_pill_use.mp3']       },
  /** Artefact / technique refined. */
  item_refine:         { src: ['/audio/sfx/item_refine.ogg',         '/audio/sfx/item_refine.mp3']         },
};

export const SFX = Object.fromEntries(
  Object.entries(_SFX_BASE).map(([id, cfg]) => [id, _applySfx(id, cfg)])
);

/** All SFX ids as a typed union helper — useful for autocomplete when calling playSfx(). */
export const SFX_ID = /** @type {const} */ (Object.keys(SFX));
