/**
 * digitGen.js — pixel art damage digit sprite sheet.
 *
 * Sprite sheet: 10 slots × 6px wide, 9px tall (digits 0–9, left to right).
 * Each digit is a hand-crafted 5×7 pixel bitmap rendered in amber-gold
 * with a 1px dark shadow offset. Displayed via CSS backgroundImage at
 * scale 2–4× so imageRendering: pixelated keeps them crisp.
 */

export const DW = 6;  // digit slot width  (native px)
export const DH = 9;  // digit slot height (native px)

// 5×7 bitmaps for digits 0–9 — each row is a 5-bit mask (MSB = left pixel)
const BITMAPS = [
  [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110], // 0
  [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110], // 1
  [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111], // 2
  [0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110], // 3
  [0b10001, 0b10001, 0b10001, 0b11111, 0b00001, 0b00001, 0b00001], // 4
  [0b11111, 0b10000, 0b10000, 0b11110, 0b00001, 0b10001, 0b01110], // 5
  [0b01110, 0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110], // 6
  [0b11111, 0b00001, 0b00010, 0b00100, 0b00100, 0b00100, 0b00100], // 7
  [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110], // 8
  [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110], // 9
];

const FILL   = '#f5c842'; // amber-gold
const SHADOW = '#3a2500'; // dark amber shadow

let _sheet = null;

export function getDigitSheet() {
  if (_sheet) return _sheet;

  const canvas = document.createElement('canvas');
  canvas.width  = DW * 10;
  canvas.height = DH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  for (let d = 0; d < 10; d++) {
    const bitmap = BITMAPS[d];
    const ox = d * DW + 1; // 1px left padding per slot
    const oy = 1;           // 1px top padding

    // Shadow pass — 1px right + 1px down offset
    ctx.fillStyle = SHADOW;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (bitmap[row] & (0b10000 >> col)) {
          ctx.fillRect(ox + col + 1, oy + row + 1, 1, 1);
        }
      }
    }

    // Fill pass
    ctx.fillStyle = FILL;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (bitmap[row] & (0b10000 >> col)) {
          ctx.fillRect(ox + col, oy + row, 1, 1);
        }
      }
    }
  }

  _sheet = canvas.toDataURL();
  return _sheet;
}
