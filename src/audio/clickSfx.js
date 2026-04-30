/**
 * Global click SFX — one document-level listener that plays a UI sound on
 * every <button> tap so we don't have to wire onClick → playSfx by hand on
 * 185+ buttons.
 *
 * Default sound: 'ui_click'.
 * Override per-button by setting `data-sfx="<sfx-id>"` (any id from
 * src/audio/sounds.js). Set `data-sfx="none"` to silence one specifically.
 *
 * The handler runs in the capture phase so it fires even if a child onClick
 * later calls stopPropagation. AudioManager.playSfx already gates on the
 * unlock state, so calls before the first user gesture are silent no-ops.
 */

import AudioManager from './AudioManager.js';

const SELECTOR = 'button, [role="button"]';

function onDocumentClick(e) {
  if (!(e.target instanceof Element)) return;
  const btn = e.target.closest(SELECTOR);
  if (!btn) return;
  if (btn.getAttribute('aria-disabled') === 'true') return;

  const sfxId = btn.dataset.sfx || 'ui_click';
  if (sfxId === 'none') return;

  AudioManager.playSfx(sfxId);
}

let installed = false;

export function installGlobalClickSfx() {
  if (installed) return;
  installed = true;
  document.addEventListener('click', onDocumentClick, true);
}
