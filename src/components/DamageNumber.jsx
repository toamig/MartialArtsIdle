import { getDigitSheet, DW, DH } from '../sprites/digitGen';

// Magnitude → pixel scale. Range: 2.0 (tiny hits) → 4.0 (massive hits).
// Uses log10 so small increases feel noticeable and huge numbers stay bounded.
function getScale(dmg) {
  return Math.min(4.0, 2.0 + Math.log10(Math.max(1, dmg)) * 0.4);
}

/**
 * DamageNumber — renders a single damage value as pixel-art digit sprites.
 *
 * Props:
 *   value  — integer damage value
 *   color  — 'gold' (player deals damage) | 'red' (player takes damage)
 *   style  — positioning styles (left, top) applied to the wrapper div
 */
export default function DamageNumber({ value, color = 'gold', style }) {
  const sheet  = getDigitSheet();
  const digits = String(value).split('').map(Number);
  const scale  = getScale(value);

  const slotW = DW * scale;
  const slotH = DH * scale;

  return (
    <div
      className={`damage-number damage-number-${color}`}
      style={style}
    >
      {digits.map((d, i) => (
        <div
          key={i}
          style={{
            display:             'inline-block',
            width:               slotW,
            height:              slotH,
            backgroundImage:     `url(${sheet})`,
            backgroundPosition:  `-${d * slotW}px 0px`,
            backgroundSize:      `${DW * 10 * scale}px ${slotH}px`,
            backgroundRepeat:    'no-repeat',
            imageRendering:      'pixelated',
          }}
        />
      ))}
    </div>
  );
}
