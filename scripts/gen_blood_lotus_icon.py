#!/usr/bin/env python3
"""
Generate a native 64x64 Blood Lotus pixel art icon.
5 outer petals + 5 inner petals + golden center.
Output: public/sprites/items/blood_lotus.png
"""
from PIL import Image, ImageDraw
import math
import sys

SIZE = 64
CX, CY = 32, 32  # lotus center

# --- Color palette ---
OUT_SHADOW    = (18,  3,  3, 255)   # deep outline / shadow edge
OUT_BASE      = (100, 12, 12, 255)  # dark base fill
OUT_MID       = (165, 28, 28, 255)  # mid tone
OUT_BRIGHT    = (210, 50, 50, 255)  # bright center stripe
OUT_HILIGHT   = (240, 85, 85, 255)  # tip highlight

IN_SHADOW     = (22,  4,  4, 255)
IN_BASE       = (130, 18, 18, 255)
IN_MID        = (190, 40, 40, 255)
IN_BRIGHT     = (230, 65, 65, 255)
IN_HILIGHT    = (255, 110, 110, 255)

POD_RIM       = (120, 65,  0, 255)
POD_BASE      = (185, 120,  0, 255)
POD_GOLD      = (255, 205,  0, 255)
POD_BRIGHT    = (255, 230, 80, 255)
POD_HILIGHT   = (255, 248, 175, 255)
STAMEN_COL    = (255, 195,  0, 255)


def petal_poly(cx, cy, angle_deg, length, width, n=32):
    """
    Returns polygon [(x, y), ...] for a petal.
    Base is at (cx, cy); tip points in angle_deg direction.
    angle_deg: 0=right, -90=up in PIL (y-down) coords.
    Width profile peaks around 40% of the way to the tip.
    """
    rad = math.radians(angle_deg)
    fwd_x, fwd_y   = math.cos(rad), math.sin(rad)
    perp_x, perp_y = -math.sin(rad), math.cos(rad)
    hw = width / 2.0

    left, right = [], []
    for i in range(n + 1):
        t = i / n
        d = length * t
        # t**0.88 peaks at ~t=0.46 → rounder, more lotus-like petal
        w = hw * math.sin(math.pi * (t ** 0.88))
        left.append((cx + fwd_x * d - perp_x * w,
                      cy + fwd_y * d - perp_y * w))
        right.append((cx + fwd_x * d + perp_x * w,
                      cy + fwd_y * d + perp_y * w))

    return left + list(reversed(right))


def draw_petal(draw, cx, cy, angle, L, W, shadow, base, mid, bright, hilight):
    """Draw a shaded petal with 5 colour layers (outline → shadow → base → mid → highlight)."""
    draw.polygon(petal_poly(cx, cy, angle, L,        W),        fill=shadow)
    draw.polygon(petal_poly(cx, cy, angle, L * 0.97, W * 0.82), fill=base)
    draw.polygon(petal_poly(cx, cy, angle, L * 0.93, W * 0.48), fill=mid)
    draw.polygon(petal_poly(cx, cy, angle, L * 0.88, W * 0.24), fill=bright)
    draw.polygon(petal_poly(cx, cy, angle, L * 0.74, W * 0.10), fill=hilight)


# ── Build image ────────────────────────────────────────────────────────────────
img  = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# 5 outer petals — pentagon, first petal pointing up
for i in range(5):
    a = -90 + 72 * i
    draw_petal(draw, CX, CY, a, 22, 16,
               OUT_SHADOW, OUT_BASE, OUT_MID, OUT_BRIGHT, OUT_HILIGHT)

# 5 inner petals — offset by 36° (half a pentagon step), shorter
for i in range(5):
    a = -90 + 36 + 72 * i
    draw_petal(draw, CX, CY, a, 14, 10,
               IN_SHADOW, IN_BASE, IN_MID, IN_BRIGHT, IN_HILIGHT)

# ── Center pod ─────────────────────────────────────────────────────────────────
def ellipse(d, cx, cy, rx, ry, fill):
    d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=fill)

ellipse(draw, CX, CY, 8, 8, POD_RIM)
ellipse(draw, CX, CY, 7, 7, POD_BASE)
ellipse(draw, CX, CY, 5, 5, POD_GOLD)
ellipse(draw, CX, CY, 3, 3, POD_BRIGHT)

# 8 stamen dots ringing the center
for i in range(8):
    a = math.radians(i * 45 - 22.5)
    sx = int(round(CX + 6.5 * math.cos(a)))
    sy = int(round(CY + 6.5 * math.sin(a)))
    draw.ellipse((sx - 1, sy - 1, sx + 1, sy + 1), fill=STAMEN_COL)

# Bright specular highlight on center pod (upper-left)
ellipse(draw, CX - 2, CY - 3, 2, 1, POD_HILIGHT)

# ── Save ───────────────────────────────────────────────────────────────────────
out_path = sys.argv[1] if len(sys.argv) > 1 else 'blood_lotus_64.png'
img.save(out_path)
print(f"Saved {out_path}  ({SIZE}x{SIZE} RGBA)")
