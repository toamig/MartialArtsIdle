"""
polish_qi_tint.py — shift the qi-glow pixels of a composed focused sprite
toward a target palette per tier (cyan / cyan-white / golden-cyan / gold /
violet-gold / white-gold). Operates on the candidate already produced by
compose_qi_overlay.py, identifying qi pixels as those that differ from the
matching normal sprite.

Usage:
    python polish_qi_tint.py <tier_id>
    python polish_qi_tint.py <tier_id> <r_mul> <g_mul> <b_mul>   # override

Output: overwrites tmp/cultivator/<tier_id>_focused_cand_0.png in place.
"""

import sys
from pathlib import Path
from PIL import Image

ROOT     = Path(__file__).parent.parent
OUT_DIR  = ROOT / "public/sprites/cultivator"
TMP_DIR  = ROOT / "tmp/cultivator"

# Per-palette (R, G, B) multipliers applied to each qi-glow pixel.
# Numbers tuned so the apparent hue lands on the target without crushing
# the chest-dantian beam's brightness. Clamped to 255 after multiplication.
PALETTES = {
    "cyan":         (1.00, 1.00, 1.00),  # T0/T1 — untouched
    "cyan_white":   (1.00, 1.00, 1.00),  # T2 — untouched
    "golden_cyan":  (1.35, 1.05, 0.70),  # T3 — warm shift, drop blue
    "gold":         (1.55, 1.15, 0.45),  # T4 — full gold, kill blue
    "violet_gold":  (1.30, 0.85, 0.95),  # T5 — magenta + warmth
    "violet_red":   (1.40, 0.80, 0.90),  # T6 — magenta-red
    "white_gold":   (1.25, 1.20, 0.85),  # T7 — bright warm white
}

TIER_PALETTE = {
    "t0_novice":              "cyan",
    "t1_qi_transformation":   "cyan",
    "t2_true_element":        "cyan",
    "t3_separation":          "cyan_white",
    "t4_immortal_ascension":  "cyan_white",
    "t5_saint":               "golden_cyan",
    "t6_saint_king":          "golden_cyan",
    "t7_origin_returning":    "gold",
    "t8_origin_king":         "gold",
    "t9_void_king":           "violet_gold",
    "t10_dao_source":         "violet_gold",
    "t11_emperor_realm":      "violet_red",
    "t12_open_heaven":        "white_gold",
}


def polish(tier_id, override=None):
    palette_name = TIER_PALETTE.get(tier_id, "cyan")
    if override is not None:
        mul_r, mul_g, mul_b = override
        palette_name = "override"
    else:
        mul_r, mul_g, mul_b = PALETTES[palette_name]

    normal_path  = OUT_DIR / f"{tier_id}_normal.png"
    focused_path = TMP_DIR / f"{tier_id}_focused_cand_0.png"

    normal = Image.open(normal_path).convert("RGBA")
    foc    = Image.open(focused_path).convert("RGBA")
    if normal.size != foc.size:
        foc = foc.resize(normal.size, Image.NEAREST)

    w, h = foc.size
    n_pix = normal.load()
    f_pix = foc.load()
    out   = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    o_pix = out.load()

    qi = 0
    for y in range(h):
        for x in range(w):
            np_ = n_pix[x, y]
            fp_ = f_pix[x, y]
            if np_ != fp_:
                fr, fg, fb, fa = fp_
                r = min(255, max(0, int(fr * mul_r)))
                g = min(255, max(0, int(fg * mul_g)))
                b = min(255, max(0, int(fb * mul_b)))
                o_pix[x, y] = (r, g, b, fa)
                qi += 1
            else:
                o_pix[x, y] = fp_
    out.save(focused_path)
    print(f"  Polished {tier_id}: palette={palette_name} mul=({mul_r}, {mul_g}, {mul_b})")
    print(f"  Qi pixels tinted: {qi:,}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) == 1:
        polish(args[0])
    elif len(args) == 4:
        polish(args[0], (float(args[1]), float(args[2]), float(args[3])))
    else:
        print("Usage: python polish_qi_tint.py <tier_id> [r_mul g_mul b_mul]")
        sys.exit(1)
