const SUFFIXES = [
  [1_000_000_000_000_000, 'Q'],
  [1_000_000_000_000,     'T'],
  [1_000_000_000,         'B'],
  [1_000_000,             'M'],
  [1_000,                 'K'],
];

function format(value) {
  for (const [threshold, suffix] of SUFFIXES) {
    if (value >= threshold) {
      const n = value / threshold;
      return (n >= 10 ? Math.round(n) : n.toFixed(1).replace(/\.0$/, '')) + suffix;
    }
  }
  return String(value);
}

/**
 * DamageNumber — renders a damage value using Press Start 2P pixel font.
 * fontSize is computed by the caller based on damage % of enemy max HP.
 */
export default function DamageNumber({ value, color = 'gold', fontSize = 14, style }) {
  const isGold = color === 'gold';
  return (
    <div
      className={`damage-number damage-number-${color}`}
      style={{
        ...style,
        fontSize,
        fontFamily: "'Press Start 2P', monospace",
        lineHeight: 1,
        color: isGold ? '#f5c842' : '#ef4444',
      }}
    >
      {format(value)}
    </div>
  );
}
