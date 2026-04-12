/**
 * gameDebug.js — development-only console helpers.
 *
 * Only active when import.meta.env.DEV is true (Vite dev server).
 * Exposes `window.debug` in the browser console.
 *
 * Usage: gd.help()
 */

import ENEMIES from '../data/enemies';
import { ALL_MATERIALS } from '../data/materials';
import REALMS from '../data/realms';

/**
 * Attach window.debug using a ref that always points to the latest hook values.
 * Called once from App.jsx on mount.
 *
 * @param {React.MutableRefObject} hooksRef  — ref whose .current is
 *   { cultivation, inventory, techniques, combat, artefacts }
 */
export function initDebug(hooksRef) {
  if (!import.meta.env.DEV) return;

  const g = () => hooksRef.current; // always-fresh hook bundle

  window.gd = {

    // ── Cultivation ────────────────────────────────────────────────────────

    /** Jump to realm index n (0-based). */
    setRealm(n) {
      const max = REALMS.length - 1;
      const idx = Math.max(0, Math.min(Math.floor(n), max));
      g().cultivation.setRealmIndex(idx);
      g().cultivation.qiRef.current = 0;
      console.log(`[debug] Realm → ${idx} (${REALMS[idx]?.name ?? '?'})`);
    },

    /** Add qi directly. */
    addQi(amount) {
      g().cultivation.qiRef.current += amount;
      const cur  = Math.floor(g().cultivation.qiRef.current);
      const cost = g().cultivation.costRef.current;
      console.log(`[debug] +${amount} qi (${cur} / ${cost})`);
    },

    /** Fill qi to just below the breakthrough threshold. */
    fillQi() {
      g().cultivation.qiRef.current = g().cultivation.costRef.current - 1;
      console.log(`[debug] Qi filled — one tick from breakthrough`);
    },

    // ── Combat ─────────────────────────────────────────────────────────────

    /**
     * Toggle or set player invincibility.
     * @param {boolean} [on]  Pass true/false to set explicitly; omit to toggle.
     */
    godMode(on) {
      const ref = g().combat.debugRef.current;
      ref.godMode = on !== undefined ? Boolean(on) : !ref.godMode;
      console.log(`[debug] God mode ${ref.godMode ? 'ON' : 'OFF'}`);
    },

    /**
     * Toggle or set one-shot mode (kills enemy in one hit).
     * @param {boolean} [on]  Pass true/false to set explicitly; omit to toggle.
     */
    oneShot(on) {
      const ref = g().combat.debugRef.current;
      ref.oneShot = on !== undefined ? Boolean(on) : !ref.oneShot;
      console.log(`[debug] One-shot ${ref.oneShot ? 'ON' : 'OFF'}`);
    },

    /**
     * Force a specific enemy to spawn on every subsequent fight.
     * The override persists until clearEnemy() is called.
     * @param {string} id  Enemy ID from listEnemies().
     */
    watchEnemy(id) {
      if (!ENEMIES[id]) {
        console.warn(`[debug] Unknown enemy: "${id}"\nCall gd.listEnemies() to see valid IDs.`);
        return;
      }
      g().combat.debugRef.current.nextEnemy = id;
      console.log(`[debug] Forced enemy set → ${ENEMIES[id].name} (persists until gd.clearEnemy())`);
    },

    /** Remove the forced-enemy override and return to random spawns. */
    clearEnemy() {
      g().combat.debugRef.current.nextEnemy = null;
      console.log('[debug] Enemy override cleared — back to random');
    },

    /** Print a table of all enemy IDs and names. */
    listEnemies() {
      console.table(
        Object.values(ENEMIES).map(e => ({
          id:     e.id,
          name:   e.name,
          sprite: e.sprite ?? '(canvas fallback)',
        }))
      );
    },

    // ── Inventory ──────────────────────────────────────────────────────────

    /**
     * Add items to inventory.
     * @param {string} id   Material ID from listMaterials().
     * @param {number} [qty=1]
     */
    addItem(id, qty = 1) {
      if (!ALL_MATERIALS[id]) {
        console.warn(`[debug] Unknown material: "${id}"\nCall gd.listMaterials() to see valid IDs.`);
        return;
      }
      g().inventory.addItem(id, qty);
      console.log(`[debug] +${qty}× ${ALL_MATERIALS[id].name}`);
    },

    /**
     * Add qty of every material at once.
     * @param {number} [qty=10]
     */
    addAllMaterials(qty = 10) {
      Object.keys(ALL_MATERIALS).forEach(id => g().inventory.addItem(id, qty));
      console.log(`[debug] Added ${qty}× of each material (${Object.keys(ALL_MATERIALS).length} types)`);
    },

    /** Print a table of all material IDs, names, and types. */
    listMaterials() {
      console.table(
        Object.entries(ALL_MATERIALS).map(([id, m]) => ({
          id,
          name:   m.name,
          rarity: m.rarity,
          type:   m.type,
        }))
      );
    },

    // ── General ────────────────────────────────────────────────────────────

    /** Print a summary of the current game state. */
    state() {
      const cult  = g().cultivation;
      const com   = g().combat;
      const qi    = Math.floor(cult.qiRef.current);
      const cost  = cult.costRef.current;
      const realm = REALMS[cult.indexRef?.current ?? cult.realmIndex];
      const dbg   = com.debugRef.current;

      console.group('%c[debug] Game State', 'color: #c084fc; font-weight: bold');
      console.log(`Realm:      ${realm?.name ?? '?'} (index ${cult.indexRef?.current ?? cult.realmIndex})`);
      console.log(`Qi:         ${qi.toLocaleString()} / ${cost.toLocaleString()} (${Math.floor(qi / cost * 100)}%)`);
      console.log(`Combat:     phase=${com.phase}`);
      console.log(`God mode:   ${dbg.godMode}`);
      console.log(`One-shot:   ${dbg.oneShot}`);
      console.log(`Forced enemy: ${dbg.nextEnemy ?? '(none)'}`);
      console.groupEnd();
    },

    /** Print all available commands. */
    help() {
      console.group('%c[debug] Available Commands', 'color: #c084fc; font-weight: bold');
      console.log('%cCultivation', 'font-weight: bold');
      console.log('  gd.setRealm(n)           — jump to realm index n');
      console.log('  gd.addQi(amount)          — add qi instantly');
      console.log('  gd.fillQi()               — fill qi to just before breakthrough');
      console.log('%cCombat', 'font-weight: bold');
      console.log('  gd.godMode(on?)           — toggle/set player invincibility');
      console.log('  gd.oneShot(on?)           — toggle/set enemy one-shot mode');
      console.log('  gd.watchEnemy(id)         — force a specific enemy every fight (persists)');
      console.log('  gd.clearEnemy()           — clear forced enemy override');
      console.log('  gd.listEnemies()          — show all enemy IDs and names');
      console.log('%cInventory', 'font-weight: bold');
      console.log('  gd.addItem(id, qty=1)     — add items by material ID');
      console.log('  gd.addAllMaterials(n=10)  — add n of every material');
      console.log('  gd.listMaterials()        — show all material IDs and rarities');
      console.log('%cGeneral', 'font-weight: bold');
      console.log('  gd.state()                — print current game state summary');
      console.log('  gd.help()                 — show this message');
      console.groupEnd();
    },
  };

  console.log(
    '%c[MartialArtsIdle] Debug tools ready — type gd.help()',
    'color: #c084fc; font-weight: bold; font-size: 13px'
  );
}
