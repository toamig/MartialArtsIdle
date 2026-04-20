/**
 * dailyBonus.js — Daily login reward system.
 *
 * 7-day repeating cycle. Missing a day resets the streak to Day 1.
 * Balance is awarded in Blood Lotus (jade) via addJade().
 */

import { addJade } from './jade';

const KEY = 'mai_daily_bonus';

// 7-day reward cycle in Blood Lotus
export const DAILY_REWARDS = [10, 10, 15, 10, 10, 15, 35];

function todayStr() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { lastCollected: null, streak: 0 };
}

function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

/**
 * Returns the current daily bonus state without side effects.
 * streak is 1-indexed (1–7).
 */
export function getDailyBonusState() {
  const { lastCollected, streak } = load();
  const today = todayStr();

  if (lastCollected === today) {
    return {
      isAvailable: false,
      streak,
      todayReward: DAILY_REWARDS[streak - 1] ?? DAILY_REWARDS[0],
    };
  }

  // Determine next streak position
  let nextStreak = 1;
  if (lastCollected) {
    const diffDays = Math.round(
      (new Date(today) - new Date(lastCollected)) / 86_400_000
    );
    if (diffDays === 1) {
      nextStreak = streak >= 7 ? 1 : streak + 1;
    }
    // missed > 1 day → reset to 1
  }

  return {
    isAvailable: true,
    streak: nextStreak,
    todayReward: DAILY_REWARDS[nextStreak - 1],
  };
}

/**
 * Collects today's bonus. Returns the amount awarded, or 0 if already collected.
 */
export function collectDailyBonus() {
  const state = getDailyBonusState();
  if (!state.isAvailable) return 0;
  save({ lastCollected: todayStr(), streak: state.streak });
  addJade(state.todayReward);
  return state.todayReward;
}
