/**
 * Shared number formatting utilities.
 *
 * All display-facing number formatting must go through these functions so
 * that the K / M / B / T tier ladder is consistent everywhere in the UI.
 *
 * Rules:
 *   - Always check from largest → smallest so 2 000 000 hits M, not K.
 *   - Values below 1 000 are shown as plain integers (no suffix).
 *   - fmtRate shows one decimal place for values < 10 so "3.7/s" is readable.
 */

/**
 * Format a large integer (qi total, damage, costs, etc.)
 * Examples: 1 500 → "1.5K"  |  2 300 000 → "2.3M"  |  4 100 000 000 → "4.1B"
 */
export function fmt(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(1)  + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1)  + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
  return String(Math.floor(n));
}

/**
 * Format a rate value (qi/s, damage/s, etc.) with a finer low-end display.
 * The M/B/T tiers use 2 decimal places so "1.00M/s" is unambiguous.
 * Examples: 3.7 → "3.7"  |  12 → "12"  |  2 500 → "2.5K"  |  1 800 000 → "1.80M"
 */
export function fmtRate(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(2)  + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(2)  + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
  if (n >= 10)   return n.toFixed(0);
  return n.toFixed(1);
}

/**
 * Format a number with a leading "+" sign, used for floaters / delta displays.
 * Examples: 1 500 → "+1.5K"  |  2 300 000 → "+2.3M"
 */
export function fmtDelta(n) {
  return '+' + fmt(n);
}
