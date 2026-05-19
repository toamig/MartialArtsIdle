"""
Composite a focused-pose sprite from (a) the focused candidate's pixels for
the upper body (face, eyes, chest, hands — where the qi glow and its natural
light bleed live) and (b) the matching normal-pose sprite for the lower body
(lap and feet, where the model's regen tends to drift the foot/knee colours).

Earlier threshold-based versions of this script tried to filter qi pixels on
saturation/luminance, but the model's natural light bleed on the face is
exactly what makes the eye-glow read as "illuminated" rather than "isolated
glowing spots in the eye sockets" — so we keep the focused upper body
verbatim and only enforce identity for the lap/feet, where colour drift is
purely an artefact.

Usage:
    python compose_qi_overlay.py <tier_id>              # split mode (default)
    python compose_qi_overlay.py <tier_id> split        # explicit split mode
    python compose_qi_overlay.py <tier_id> raw          # use the raw focused entirely
    python compose_qi_overlay.py <tier_id> normal-feet  # patch the normal sprite's
                                                          feet with the focused raw's
                                                          feet

Modes:
    split       — upper body from focused, lower body (lap/feet) from normal.
                  Use when the model drifted foot/knee colours in the focused
                  regen.
    raw         — keep the raw focused everywhere. Use when the model rendered
                  the whole body consistently and the qi-lit feet look better
                  than the unlit normal feet.
    normal-feet — IN-PLACE EDIT of the saved normal sprite: swap its lower
                  body with the focused raw's lower body. Use when the model's
                  normal-mode render of the feet has weird shadow artefacts
                  but the focused render of the feet looks clean.

Inputs:
    public/sprites/cultivator/<tier_id>_normal.png        (lower-body source)
    tmp/cultivator/<tier_id>_focused_cand_0.png           (upper-body source)

Outputs:
    tmp/cultivator/<tier_id>_focused_cand_0.png           (overwritten — composed)
    tmp/cultivator/<tier_id>_focused_cand_0_raw.png       (untouched copy of the
                                                           model output, kept so
                                                           we can re-run compose
                                                           without paying for a regen)
"""

import sys
import shutil
from pathlib import Path
from PIL import Image

ROOT     = Path(__file__).parent.parent
OUT_DIR  = ROOT / "public/sprites/cultivator"
TMP_DIR  = ROOT / "tmp/cultivator"

# A pixel counts as qi glow when it satisfies one of:
#   • focused is MUCH brighter than normal (catches eye-glow, dantian beam core)
#   • focused is brighter AND meaningfully more saturated (catches genuine qi
#     overlay on a coloured body part, while rejecting a diffuse cyan wash
#     which makes skin LESS saturated, not more)
#   • focused is opaque where normal is transparent (catches edge halo /
#     motes outside the body — though we no longer prompt for motes, this
#     covers any sub-pixel anti-alias on the silhouette glow)
# Vertical split between "upper body" (kept from focused, including any
# natural light bleed around the eyes/chest) and "lower body" (forced to
# normal so foot/lap colour drift can't sneak through). The cultivator sits
# in a fixed pose: head around y=20-90, chest around y=90-150, lap and feet
# below y≈160. The default 0.63 of image height lands just below the hands.
QI_MAX_Y_RATIO = 0.63


def fix_normal_feet(tier_id):
    """Patch the saved normal sprite's lower body with the focused raw's
    lower body. Use when the model's normal-mode render of the feet has weird
    shadow artefacts but the focused render of the feet looks clean."""
    normal_path = OUT_DIR / f"{tier_id}_normal.png"
    raw_path    = TMP_DIR / f"{tier_id}_focused_cand_0_raw.png"
    if not normal_path.exists():
        raise FileNotFoundError(normal_path)
    if not raw_path.exists():
        raise FileNotFoundError(
            f"Focused raw not found: {raw_path}. Run `gen-focused {tier_id}` "
            f"+ `compose_qi_overlay.py {tier_id} <mode>` first to produce the _raw.png."
        )

    normal = Image.open(normal_path).convert("RGBA")
    raw    = Image.open(raw_path).convert("RGBA")
    if normal.size != raw.size:
        raw = raw.resize(normal.size, Image.NEAREST)

    # Save the pre-edit normal as <tier>_normal_bak.png in case we need to
    # revert the foot swap.
    bak_path = OUT_DIR / f"{tier_id}_normal_bak.png"
    if not bak_path.exists():
        shutil.copy(normal_path, bak_path)

    w, h = normal.size
    qi_max_y = int(h * QI_MAX_Y_RATIO)
    n_pix = normal.load()
    r_pix = raw.load()
    out   = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    o_pix = out.load()

    swapped = kept = 0
    for y in range(h):
        for x in range(w):
            if y > qi_max_y:
                o_pix[x, y] = r_pix[x, y]
                swapped += 1
            else:
                o_pix[x, y] = n_pix[x, y]
                kept += 1

    out.save(normal_path)
    print(f"  Patched normal feet for {tier_id}: {normal_path}")
    print(f"  Backup of pre-edit normal: {bak_path}")
    print(f"  Lower body pixels swapped from raw: {swapped:,}")
    print(f"  Upper body pixels kept from normal: {kept:,}")


def compose(tier_id, mode="split"):
    if mode not in ("split", "raw"):
        raise ValueError(f"Unknown mode '{mode}'. Expected 'split' or 'raw'.")

    normal_path  = OUT_DIR / f"{tier_id}_normal.png"
    focused_path = TMP_DIR / f"{tier_id}_focused_cand_0.png"
    raw_path     = TMP_DIR / f"{tier_id}_focused_cand_0_raw.png"
    if not normal_path.exists():
        raise FileNotFoundError(normal_path)
    if not focused_path.exists():
        raise FileNotFoundError(focused_path)

    # Preserve the unmodified model output so we can retune the compose and
    # recompose without paying for a regeneration. If a _raw.png already
    # exists from a previous compose, prefer THAT as the source (so repeated
    # runs aren't compositing on top of an already-composited file).
    if raw_path.exists():
        src_focused_path = raw_path
    else:
        src_focused_path = focused_path
        shutil.copy(focused_path, raw_path)

    normal  = Image.open(normal_path).convert("RGBA")
    focused = Image.open(src_focused_path).convert("RGBA")
    if normal.size != focused.size:
        focused = focused.resize(normal.size, Image.NEAREST)

    if mode == "raw":
        # Just promote the raw focused to be the final composed file. The
        # qi-lit feet stay as the model rendered them.
        focused.save(focused_path)
        print(f"  Composed {tier_id} (mode=raw): {focused_path}")
        print(f"  Raw saved at: {raw_path}")
        print(f"  Used the raw focused verbatim (no lower-body swap).")
        return

    w, h = normal.size
    qi_max_y = int(h * QI_MAX_Y_RATIO)
    n_pix = normal.load()
    f_pix = focused.load()
    out   = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    o_pix = out.load()

    upper = lower = 0
    for y in range(h):
        for x in range(w):
            if y > qi_max_y:
                # Lower body — always take the normal sprite's pixel so the
                # lap / feet stay locked to the canonical idle render.
                o_pix[x, y] = n_pix[x, y]
                lower += 1
            else:
                # Upper body — take the focused candidate's pixel verbatim
                # (including any natural light bleed around the eyes/chest).
                o_pix[x, y] = f_pix[x, y]
                upper += 1

    out.save(focused_path)
    print(f"  Composed {tier_id}: {focused_path}")
    print(f"  Raw saved at: {raw_path}")
    print(f"  Upper body (from focused): {upper:>8,} pixels")
    print(f"  Lower body (from normal):  {lower:>8,} pixels")


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) == 1:
        compose(args[0])
    elif len(args) == 2:
        if args[1] == "normal-feet":
            fix_normal_feet(args[0])
        else:
            compose(args[0], args[1])
    else:
        print("Usage: python compose_qi_overlay.py <tier_id> [split|raw|normal-feet]")
        sys.exit(1)
