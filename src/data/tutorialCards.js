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
    body:    'Qi flows through you every breath. Tap and hold the cultivator to focus your breathing and multiply your gain. Reach enough qi to break through each layer — and beyond.',
    ctaText: 'Begin',
  },
  [TUTORIAL_IDS.HOLD_TO_FOCUS]: {
    kicker:  'Technique',
    title:   'Hold to Focus',
    body:    'Press and hold the cultivator at the centre of the screen. While you hold, your qi/s multiplies several times over. Release to rest. This is the fastest way through the early layers.',
    ctaText: 'Try it',
  },
  [TUTORIAL_IDS.PRODUCERS_TAB]: {
    kicker:  'Your sect',
    title:   'Producers',
    body:    'Producers cultivate qi for you, hands-free. Each one you buy adds permanent qi/s for this life. They get pricier — but every tier outclasses the last. Buy whenever you can afford.',
    ctaText: 'Understood',
  },
  [TUTORIAL_IDS.FIRST_PRODUCER]: {
    kicker:  'First disciple',
    title:   'The Disciple Bows',
    body:    'Your first Body Tempering Disciple breathes qi into your dantian. Your idle gains will rise with each disciple you train, and each disciple\'s cost rises a little after every buy.',
    ctaText: 'Onward',
  },
  [TUTORIAL_IDS.FIRST_LAYER_BT]: {
    kicker:  'Breakthrough',
    title:   'First Breakthrough',
    body:    'Your meridians widen. Each layer raises the qi-floor of your realm and brings new producers, sparks, and upgrades within reach. Keep cultivating — the next layer waits.',
    ctaText: 'Continue',
  },
  [TUTORIAL_IDS.FIRST_MAJOR_GATE]: {
    kicker:  'A wall appears',
    title:   'The Heavens Test You',
    body:    'A major realm asks for more than qi — it asks for a sustained qi/s rate. Build producers, level your crystal, hold Focus, then tap BREAKTHROUGH when the heavens stop refusing you.',
    ctaText: 'I see',
  },
  [TUTORIAL_IDS.FIRST_SPARK_OFFER]: {
    kicker:  'A spark appears',
    title:   'Qi Sparks',
    body:    'Every breakthrough offers a Spark — pick one of two. Sparks grant temporary buffs, permanent stacks, or rare mechanic unlocks. You get one free reroll per offer if neither tempts you.',
    ctaText: 'Choose wisely',
  },
  [TUTORIAL_IDS.FIRST_SAINT]: {
    kicker:  'A new horizon',
    title:   'A Second Life',
    body:    'You may now reincarnate. Your progress this life converts to karma, which buys permanent boosts on the Eternal Tree. Every life pushes the next one further — keep going, or rebirth and accelerate.',
    ctaText: 'Acknowledge',
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
