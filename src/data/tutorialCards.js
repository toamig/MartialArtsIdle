/**
 * tutorialCards.js — Tier-A jade tutorial card content (2026-05-21).
 *
 * Each entry is keyed by a stable id and matches the `TutorialModal`
 * payload shape: { kicker, title, body, iconSrc?, ctaText? }.
 *
 * These cards fire at key first-run moments and never re-fire on the
 * same account (see src/systems/tutorialSeen.js). Trigger sites:
 *
 *   welcome              — App.jsx on first launch (no save state)
 *   hold_to_focus        — App.jsx when qi accumulates without ever holding Focus
 *   producers_tab        — CultivationScreen on first Producers tab view
 *   first_producer       — CultivationScreen after first successful buy
 *   first_layer_bt       — App.jsx on first realm-index increment
 *   first_major_gate     — HomeScreen when the BREAKTHROUGH button first appears
 *   first_spark_offer    — App.jsx when a Qi Spark offer first surfaces
 *   first_saint          — App.jsx when realmIndex first hits the Saint band
 *
 * Copy intent: each card is 2-3 short sentences. Body explains the WHAT,
 * not the WHY (the cultivation theme already carries flavour). Keep it
 * scannable — players will tap "Got it" fast if their thumb is mid-grind.
 *
 * Icons: a small set of UI sprites already exists under public/ui. We
 * reuse them so the card feels visually consistent with the rest of the
 * game. Default jade frame ships with TutorialModal — no per-card frame
 * tinting needed for Tier A.
 */

const BASE = (typeof import.meta !== 'undefined' && import.meta?.env?.BASE_URL) || '/';

export const TUTORIAL_IDS = Object.freeze({
  WELCOME:            'welcome',
  HOLD_TO_FOCUS:      'hold_to_focus',
  PRODUCERS_TAB:      'producers_tab',
  FIRST_PRODUCER:     'first_producer',
  FIRST_LAYER_BT:     'first_layer_bt',
  FIRST_MAJOR_GATE:   'first_major_gate',
  FIRST_SPARK_OFFER:  'first_spark_offer',
  FIRST_SAINT:        'first_saint',
});

/**
 * Card content. Trigger code calls `getTutorialCard(id)` to grab the
 * payload, then enqueues it via the event queue. Defaults to undefined
 * if an unknown id is requested — caller should guard.
 */
const CARDS = {
  [TUTORIAL_IDS.WELCOME]: {
    kicker:  'Welcome, cultivator',
    title:   'The Path Begins',
    body:    'Qi flows in with every breath. Fill the bar at the bottom of the screen to break through a layer of your realm. Layers stack into realms, realms stack into the heavens. The path is long.',
    ctaText: 'Begin',
  },
  [TUTORIAL_IDS.HOLD_TO_FOCUS]: {
    kicker:  'Focus',
    title:   'Hold to Focus',
    body:    'Press and hold the cultivator. Your qi/s climbs sharply while you hold, and drops back when you release. The early layers go by much faster with your thumb on the screen.',
    ctaText: 'Try it',
  },
  [TUTORIAL_IDS.PRODUCERS_TAB]: {
    kicker:  'Your sect',
    title:   'Producers',
    body:    'Producers gather qi for you in the background, even when you\'re not tapping. Each one raises your qi/s permanently for the rest of this life. Their price creeps up after every purchase, but each new tier outclasses the last. Spend your qi the moment you can afford one.',
    ctaText: 'Got it',
  },
  [TUTORIAL_IDS.FIRST_PRODUCER]: {
    kicker:  'First disciple',
    title:   'The Disciple Bows',
    body:    'A disciple kneels in your courtyard. Every disciple you train lifts your idle qi/s a little, and the next one costs slightly more than the last. The same shape holds for every producer you\'ll unlock.',
    ctaText: 'Onward',
  },
  [TUTORIAL_IDS.FIRST_LAYER_BT]: {
    kicker:  'Breakthrough',
    title:   'First Breakthrough',
    body:    'Your meridians widen. Each layer you cross brings new producers, sparks, and upgrades within reach. Keep cultivating; the next layer is already in sight.',
    ctaText: 'Continue',
  },
  [TUTORIAL_IDS.FIRST_MAJOR_GATE]: {
    kicker:  'Major realm',
    title:   'The Heavens Test You',
    body:    'A major realm asks for two things at once. You need qi in the bank, and a sustained qi/s rate to push through the gate. Build more producers, level your crystal, hold Focus. Tap BREAKTHROUGH when the heavens stop pushing back.',
    ctaText: 'Got it',
  },
  [TUTORIAL_IDS.FIRST_SPARK_OFFER]: {
    kicker:  'Sparks',
    title:   'Qi Sparks',
    body:    'Every layer breakthrough offers a Spark. Two cards appear and you pick one. Some give a short boost, some stack permanently for this run, and the rare ones unlock new mechanics. If neither card tempts you, your first reroll on every offer is free.',
    ctaText: 'Choose wisely',
  },
  [TUTORIAL_IDS.FIRST_SAINT]: {
    kicker:  'Reincarnation',
    title:   'A Second Life',
    body:    'You can reincarnate from here on. The progress of this life turns into karma, and karma buys permanent boosts on the Eternal Tree. Every life makes the next one start a little stronger. Keep grinding this run if it\'s still moving, or rebirth whenever the climb starts to drag.',
    ctaText: 'Got it',
  },
};

/** Fetch the payload for a tutorial id, or undefined if none. */
export function getTutorialCard(id) {
  return CARDS[id];
}

// Re-export the icon base so consumers can build iconSrc paths without
// pulling import.meta themselves.
export const TUTORIAL_ICON_BASE = BASE;

export default CARDS;
