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
 *
 * exploit: when true, prepends an EXPLOIT! flash above the number and
 * applies a brighter gradient + larger drop-shadow via the
 * `damage-number-exploit` CSS class.
 *
 * dodge: when true, renders a yellow "DODGED" label instead of a number.
 * Used to surface passive dodge rolls + null-on-heal events that were
 * previously only logged.
 */
export default function DamageNumber({ value, color = 'gold', fontSize = 14, exploit = false, dodge = false, style }) {
  if (dodge) {
    return (
      <div
        className="damage-number damage-number-dodge"
        style={{
          ...style,
          fontSize,
          fontFamily: "'Press Start 2P', monospace",
          lineHeight: 1,
          color: '#facc15',
        }}
      >
        DODGED
      </div>
    );
  }

  const isGold = color === 'gold';
  const baseColor = isGold ? '#f5c842' : '#ef4444';
  const cls = `damage-number damage-number-${color}${exploit ? ' damage-number-exploit' : ''}`;

  return (
    <div
      className={cls}
      style={{
        ...style,
        fontSize,
        fontFamily: "'Press Start 2P', monospace",
        lineHeight: 1,
        color: exploit ? '#fff5c2' : baseColor,
      }}
    >
      {exploit && (
        <span
          className="damage-number-exploit-tag"
          style={{ fontSize: Math.max(8, Math.round(fontSize * 0.4)) }}
        >
          EXPLOIT!
        </span>
      )}
      {format(value)}
    </div>
  );
}
