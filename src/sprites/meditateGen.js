/**
 * meditateGen.js — pixel-art cultivation / meditation sprite generator.
 *
 * Generates a 6-frame sprite sheet at 64×64 px per frame.
 * Displayed at scale 3 → 192×192 CSS px in the fighter-stage.
 *
 * Design: seated cultivator in lotus position, deep blue robes with gold
 * trim, topknot with golden hairpin, pulsing qi aura rings, orbiting
 * energy particles, dan tian inner glow. All 6 frames animated.
 */

export const MW = 64;   // frame width  (native px)
export const MH = 64;   // frame height (native px)

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
  skin:      '#d4935a',
  hair:      '#12080a',
  gold:      '#c8a020',
  goldL:     '#f0cc50',    // gold highlight / gleam
  robe:      '#0e1242',    // deep midnight blue
  robeL:     '#1a1e6a',    // lighter blue — robe fold highlights
  robeShadow:'#07091e',    // robe shadow / deep folds
  sash:      '#8a1c1c',    // dark crimson sash under gold belt
  aura:      '#4488ff',    // qi aura (blue-white)
  auraL:     '#aaccff',    // bright qi highlight
  chi:       '#ffffff',    // pure qi sparkle
  eye:       '#60aaff',    // glowing eye slit
};

// ── Low-level helpers ─────────────────────────────────────────────────────────

function r(ctx, col, x, y, w, h) {
  ctx.fillStyle = col;
  ctx.fillRect(x, y, w, h);
}

function alpha(ctx, a, fn) {
  ctx.save();
  ctx.globalAlpha = a;
  fn(ctx);
  ctx.restore();
}

// ── Aura / effects (drawn behind character) ────────────────────────────────────

function drawAura(ctx, frame) {
  const cx = 32, cy = 40;

  // Three expanding rings — each offset by 1/3 of the cycle
  for (let ring = 0; ring < 3; ring++) {
    const phase = ((frame / 6) + ring / 3) % 1;        // 0→1 per ring
    const radius = 18 + phase * 18;                     // grows 18→36
    const opacity = (1 - phase) * 0.55;                // fades as it expands
    if (opacity <= 0) continue;

    alpha(ctx, opacity, (c) => {
      c.strokeStyle = C.aura;
      c.lineWidth = 3 - phase * 2;                     // thinner as it grows
      c.beginPath();
      c.ellipse(cx, cy, radius, radius * 0.7, 0, 0, Math.PI * 2);
      c.stroke();
    });
  }

  // Inner halo fill (steady, just pulses alpha)
  const breathAlpha = 0.06 + Math.sin((frame / 6) * Math.PI * 2) * 0.04;
  alpha(ctx, breathAlpha, (c) => {
    c.fillStyle = C.aura;
    c.beginPath();
    c.ellipse(cx, cy, 22, 16, 0, 0, Math.PI * 2);
    c.fill();
  });

  // 5 orbiting qi particles — each spaced 72° apart, rotating each frame
  const orbitAngle = (frame / 6) * Math.PI * 2;
  for (let i = 0; i < 5; i++) {
    const angle = orbitAngle + (i / 5) * Math.PI * 2;
    const rx = 24, ry = 17;
    const px = Math.round(cx + Math.cos(angle) * rx);
    const py = Math.round(cy + Math.sin(angle) * ry);
    // alternate large / small dots
    const size = i % 2 === 0 ? 2 : 1;
    const opa  = i % 2 === 0 ? 0.85 : 0.55;
    alpha(ctx, opa, (c) => { c.fillStyle = C.auraL; c.fillRect(px, py, size, size); });
  }
}

// ── Character body ─────────────────────────────────────────────────────────────

function drawChar(ctx, frame) {
  // Breathing: 0px on even frames, -1px on frames 1, 3, 5
  const yo = (frame % 2 === 1) ? -1 : 0;

  // ── Crossed legs / base ────────────────────────────────────────────────────
  // Deep fold shadow at edges
  r(ctx, C.robeShadow, 10, 44+yo, 4, 14);
  r(ctx, C.robeShadow, 50, 44+yo, 4, 14);
  // Main leg spread (wide and flat)
  r(ctx, C.robe,       14, 44+yo, 36, 14);
  // Lighter fabric on top of legs (highlight)
  r(ctx, C.robeL,      16, 45+yo, 32,  6);
  // Central fold line
  r(ctx, C.robeShadow, 30, 44+yo,  4, 14);
  // Gold hem trim across top of legs
  r(ctx, C.gold,       14, 44+yo, 36,  2);
  // Gold hem trim at bottom of robe
  r(ctx, C.gold,       12, 56+yo, 40,  2);

  // Left foot peeking out
  r(ctx, C.robe,        8, 50+yo, 10,  8);
  r(ctx, C.skin,       10, 54+yo,  6,  4);
  r(ctx, C.gold,        8, 57+yo, 10,  1);  // foot trim

  // Right foot peeking out
  r(ctx, C.robe,       46, 50+yo, 10,  8);
  r(ctx, C.skin,       48, 54+yo,  6,  4);
  r(ctx, C.gold,       46, 57+yo, 10,  1);

  // ── Hands in meditation mudra ──────────────────────────────────────────────
  // Left hand resting on left knee, palm up
  r(ctx, C.robe,       14, 42+yo,  8,  6);  // sleeve over hand
  r(ctx, C.skin,       15, 44+yo,  7,  5);  // hand
  r(ctx, C.skin,       14, 45+yo,  2,  3);  // thumb
  // Right hand
  r(ctx, C.robe,       42, 42+yo,  8,  6);
  r(ctx, C.skin,       42, 44+yo,  7,  5);
  r(ctx, C.skin,       48, 45+yo,  2,  3);  // thumb

  // Qi glow on hands (pulses with breathing)
  const handGlow = 0.3 + Math.sin((frame / 6) * Math.PI * 2) * 0.25;
  alpha(ctx, handGlow, (c) => {
    c.fillStyle = C.auraL;
    c.fillRect(14, 43+yo, 9, 7);
    c.fillRect(41, 43+yo, 9, 7);
  });

  // ── Robe — main torso ──────────────────────────────────────────────────────
  // Deep shadows at sides
  r(ctx, C.robeShadow, 14, 26+yo,  4, 20);
  r(ctx, C.robeShadow, 46, 26+yo,  4, 20);
  // Outer robe body
  r(ctx, C.robe,       18, 26+yo, 28, 20);
  // Inner lighter area (front of robe)
  r(ctx, C.robeL,      22, 26+yo, 20, 18);
  // V-collar shadow (dark notch at centre)
  r(ctx, C.robeShadow, 28, 26+yo,  8, 12);
  // Left lapel (angled — simulate with stacked rects)
  r(ctx, C.robe,       22, 26+yo,  6, 16);
  r(ctx, C.robe,       22, 26+yo,  4, 18);
  // Right lapel
  r(ctx, C.robe,       36, 26+yo,  6, 16);
  r(ctx, C.robe,       38, 26+yo,  4, 18);
  // Gold edge trim on robe sides
  r(ctx, C.gold,       18, 26+yo,  2, 20);
  r(ctx, C.gold,       44, 26+yo,  2, 20);

  // ── Crimson sash ──────────────────────────────────────────────────────────
  r(ctx, C.sash,       18, 40+yo, 28,  3);
  // Gold belt over sash
  r(ctx, C.gold,       18, 41+yo, 28,  2);
  r(ctx, C.goldL,      20, 41+yo, 24,  1);  // belt gleam

  // ── Wide sleeves ──────────────────────────────────────────────────────────
  // Left sleeve
  r(ctx, C.robeShadow,  8, 30+yo,  4, 14);
  r(ctx, C.robe,       10, 28+yo, 10, 16);
  r(ctx, C.robeL,      11, 29+yo,  8, 12);
  r(ctx, C.gold,       10, 43+yo, 10,  2);  // sleeve hem
  // Right sleeve
  r(ctx, C.robeShadow, 52, 30+yo,  4, 14);
  r(ctx, C.robe,       44, 28+yo, 10, 16);
  r(ctx, C.robeL,      45, 29+yo,  8, 12);
  r(ctx, C.gold,       44, 43+yo, 10,  2);

  // ── Dan tian inner glow (centre of torso — cultivation power) ─────────────
  const danGlow = 0.35 + Math.sin((frame / 6) * Math.PI * 2) * 0.30;
  alpha(ctx, danGlow, (c) => {
    c.fillStyle = C.auraL;
    c.fillRect(28, 32+yo, 8, 6);
  });
  alpha(ctx, danGlow * 0.5, (c) => {
    c.fillStyle = C.chi;
    c.fillRect(30, 33+yo, 4, 4);
  });

  // ── Neck ──────────────────────────────────────────────────────────────────
  r(ctx, C.skin, 28, 22+yo, 8, 6);

  // ── Head ──────────────────────────────────────────────────────────────────
  // Side hair framing the face
  r(ctx, C.hair, 20, 12+yo, 4, 12);   // left side hair
  r(ctx, C.hair, 40, 12+yo, 4, 12);   // right side hair
  // Face
  r(ctx, C.skin, 22, 10+yo, 20, 14);
  // Subtle cheekbone/jaw shading
  r(ctx, C.hair, 22, 20+yo,  2,  2);
  r(ctx, C.hair, 40, 20+yo,  2,  2);

  // ── Eyes (closed — deep meditation, subtle glow seeping through) ─────────
  r(ctx, C.hair, 25, 18+yo,  6,  1);   // left eye closed line
  r(ctx, C.hair, 33, 18+yo,  6,  1);   // right eye closed line
  // Eyelash detail
  r(ctx, C.hair, 25, 17+yo,  5,  1);
  r(ctx, C.hair, 33, 17+yo,  5,  1);
  // Qi glow through eyelids
  const eyeGlow = 0.4 + Math.sin((frame / 6) * Math.PI * 2) * 0.3;
  alpha(ctx, eyeGlow, (c) => {
    c.fillStyle = C.eye;
    c.fillRect(26, 18+yo, 5, 1);
    c.fillRect(34, 18+yo, 5, 1);
  });

  // ── Nose ──────────────────────────────────────────────────────────────────
  r(ctx, C.hair, 30, 21+yo, 1, 1);
  r(ctx, C.hair, 33, 21+yo, 1, 1);

  // ── Mouth (neutral / serene) ──────────────────────────────────────────────
  r(ctx, C.hair, 28, 23+yo, 8, 1);

  // ── Top hair / crown ──────────────────────────────────────────────────────
  // Hair connecting to topknot
  r(ctx, C.hair, 22, 10+yo, 20,  4);
  r(ctx, C.hair, 20, 11+yo, 24,  3);

  // ── Topknot ────────────────────────────────────────────────────────────────
  r(ctx, C.hair, 26,  2+yo, 12,  8);   // topknot bundle
  r(ctx, C.hair, 28,  0+yo,  8,  4);   // topknot upper taper
  r(ctx, C.hair, 30, -1+yo,  4,  2);   // very tip
  // Topknot volume shaping
  r(ctx, C.hair, 24,  4+yo,  2,  6);   // left puff
  r(ctx, C.hair, 38,  4+yo,  2,  6);   // right puff

  // Gold hairpin (horizontal through topknot)
  r(ctx, C.gold,  24,  6+yo, 16,  2);
  r(ctx, C.goldL, 25,  6+yo,  6,  1);  // gleam left
  r(ctx, C.goldL, 35,  6+yo,  4,  1);  // gleam right
  // Pin end decorations (small ornament dots)
  r(ctx, C.goldL, 22,  5+yo,  3,  4);
  r(ctx, C.goldL, 39,  5+yo,  3,  4);

  // Flowing hair strands (cascading down from topknot past ears)
  r(ctx, C.hair, 20, 14+yo,  2, 10);   // left strand
  r(ctx, C.hair, 42, 14+yo,  2, 10);   // right strand
  r(ctx, C.hair, 18, 18+yo,  2,  6);   // left wisp
  r(ctx, C.hair, 44, 18+yo,  2,  6);   // right wisp
}

// ── Sheet factory ──────────────────────────────────────────────────────────────

function makeSheet(frameCount, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width  = MW * frameCount;
  canvas.height = MH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  for (let f = 0; f < frameCount; f++) {
    ctx.save();
    ctx.translate(f * MW, 0);
    ctx.clearRect(0, 0, MW, MH);
    drawFn(ctx, f);
    ctx.restore();
  }
  return canvas.toDataURL();
}

// ── Public API ────────────────────────────────────────────────────────────────

let _cache = null;

export function getMeditationSprite() {
  if (_cache) return _cache;
  _cache = makeSheet(6, (ctx, f) => {
    drawAura(ctx, f);
    drawChar(ctx, f);
  });
  return _cache;
}
