/**
 * fireTutorial.js — one-liner integration for the tutorial-card system.
 *
 * Trigger sites should call `fireTutorialOnce(id, enqueue)` from inside
 * the event handler / effect that detects the moment. The helper:
 *   1. Checks the seen-set; bails if already shown.
 *   2. Looks up the card payload from data/tutorialCards.
 *   3. Enqueues an 'tutorial' event via the EventQueueContext.
 *   4. Marks the id as seen so the next call is a no-op.
 *
 * The seen-set lives in localStorage and survives reincarnation but is
 * wiped by Settings > Wipe save (matching the user's intent — paid
 * currency stays, learning state resets with the rest of the run).
 */

import { hasSeenTutorial, markTutorialSeen } from './tutorialSeen';
import { getTutorialCard } from '../data/tutorialCards';

/**
 * Show the tutorial card with `id` if it hasn't been shown before.
 *
 * @param {string}   id        Stable tutorial id (see TUTORIAL_IDS).
 * @param {Function} enqueue   `enqueue` from useEventQueue() — same hook
 *                             the crystal-evolution tutorials use.
 * @returns {boolean}          True if the card was fired this call.
 */
export function fireTutorialOnce(id, enqueue) {
  if (!id || typeof enqueue !== 'function') return false;
  if (hasSeenTutorial(id)) return false;
  const card = getTutorialCard(id);
  if (!card) return false;
  // Mark FIRST, enqueue second. If the enqueue throws (shouldn't, but),
  // we'd rather skip the card than spam-fire it on every render.
  markTutorialSeen(id);
  enqueue('tutorial', { ...card });
  return true;
}
