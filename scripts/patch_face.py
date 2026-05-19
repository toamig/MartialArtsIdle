"""
patch_face.py — copy the face region from a canonical source sprite onto
a target sprite, with a soft elliptical mask so the edges blend instead of
looking like a sticker.

The cultivator pose is fixed (seated lotus, head centered, facing camera),
so the face is roughly at the same coordinates in every tier. We patch
the face area only — NOT the crown / hairpin (which is above) and NOT the
chin/neck (we leave a small unpatched margin at the bottom so the patched
face blends into the target's neck/shoulder colour).

Usage:
    python patch_face.py <source_tier_id> <target_tier_id>              # patch normal sprite
    python patch_face.py <source_tier_id> <target_tier_id> --focused    # patch focused sprite (preserve eye-glow)

Example:
    # Lock T9's face onto the freshly-generated T10 candidate.
    python patch_face.py t9_void_king t10_dao_source

    # Patch the SKIN ONLY on a focused sprite (eye-glow preserved).
    python patch_face.py t12_open_heaven t12_open_heaven --focused

Modes:
    default      — full face region patched (eyes included). Use for normal sprites.
    --focused    — face region patched MINUS the horizontal eye/brow strip, so the
                   focused sprite's existing eye-glow is preserved. Use this when
                   re-skinning a focused sprite to match a canonical face.

Notes:
- For normal targets, source must already be saved in
  public/sprites/cultivator/<source>_normal.png
- For --focused targets, target is public/sprites/cultivator/<target>_focused.png
  and source is public/sprites/cultivator/<source>_normal.png (skin from the
  matching normal sprite, eye-glow stays from the original focused).
- A backup of the pre-patch target is saved with `_facebak.png` suffix.
"""

import sys
from pathlib import Path
from PIL import Image

ROOT    = Path(__file__).parent.parent
OUT_DIR = ROOT / "public/sprites/cultivator"
TMP_DIR = ROOT / "tmp/cultivator"

# Face region for a 256x256 cultivator sprite. The cultivator's head sits
# centered horizontally around x=128, with the face proper roughly between
# y=58 (just below the topknot/crown) and y=100 (just above the prayer-mudra
# hands). The mask is a soft ellipse inside this box so the patch fades to
# zero at the edges and the seam disappears.
FACE_BOX = (88, 50, 168, 105)   # (x0, y0, x1, y1)  — covers brow → upper lip
FEATHER  = 6                      # soft falloff inside the ellipse edge

# Horizontal strip (within the face) that holds the eyes + eyebrows. When
# patching a focused sprite we KEEP this strip from the target so the eye-
# glow survives — only the skin (forehead above, cheeks/chin below) takes
# the patched face.
EYE_STRIP_Y = (62, 92)            # (y_top, y_bottom) of the eye/brow band


def build_mask(w, h, box, feather):
    """Build a soft elliptical alpha mask. 255 in the centre, falling off to
    0 outside the ellipse defined by `box`. `feather` is the pixel width of
    the soft falloff band on the inside of the ellipse."""
    x0, y0, x1, y1 = box
    cx = (x0 + x1) / 2.0
    cy = (y0 + y1) / 2.0
    rx = (x1 - x0) / 2.0
    ry = (y1 - y0) / 2.0
    mask = Image.new("L", (w, h), 0)
    m_pix = mask.load()
    for y in range(h):
        for x in range(w):
            dx = (x - cx) / rx if rx else 0
            dy = (y - cy) / ry if ry else 0
            d  = (dx * dx + dy * dy) ** 0.5  # 0 at centre, 1 at ellipse edge
            if d >= 1.0:
                continue
            # Hard inside the (1 - feather_frac) core, linear fade out to 1.0
            feather_frac = feather / min(rx, ry) if min(rx, ry) else 0
            if d <= 1.0 - feather_frac:
                m_pix[x, y] = 255
            else:
                t = (1.0 - d) / feather_frac if feather_frac else 0
                m_pix[x, y] = max(0, min(255, int(t * 255)))
    return mask


def patch_face(source_id, target_id, focused=False):
    src_path = OUT_DIR / f"{source_id}_normal.png"
    if focused:
        # Patch the SAVED focused sprite directly, source skin from the
        # matching normal sprite.
        tgt_path = OUT_DIR / f"{target_id}_focused.png"
        if not tgt_path.exists():
            raise FileNotFoundError(
                f"{tgt_path} not found. focused mode patches the saved "
                f"<target>_focused.png in place."
            )
    else:
        tgt_path_public = OUT_DIR / f"{target_id}_normal.png"
        tgt_path_tmp    = TMP_DIR / f"{target_id}_normal_cand_0.png"
        if tgt_path_public.exists():
            tgt_path = tgt_path_public
        elif tgt_path_tmp.exists():
            tgt_path = tgt_path_tmp
        else:
            raise FileNotFoundError(
                f"Neither {tgt_path_public} nor {tgt_path_tmp} exists. "
                f"Generate the target first."
            )

    if not src_path.exists():
        raise FileNotFoundError(src_path)

    # Backup
    bak_path = tgt_path.with_name(tgt_path.stem + "_facebak.png")
    if not bak_path.exists():
        Image.open(tgt_path).save(bak_path)

    source = Image.open(src_path).convert("RGBA")
    target = Image.open(tgt_path).convert("RGBA")
    if source.size != target.size:
        source = source.resize(target.size, Image.NEAREST)

    w, h = target.size
    mask = build_mask(w, h, FACE_BOX, FEATHER)

    # In --focused mode, knock out the eye/brow strip from the mask so the
    # target's existing eye-glow is preserved.
    if focused:
        m_pix = mask.load()
        y0, y1 = EYE_STRIP_Y
        # Feather the top/bottom of the knock-out strip too
        STRIP_FEATHER = 3
        for y in range(h):
            if y0 <= y <= y1:
                factor = 0  # fully knock out
            elif y0 - STRIP_FEATHER <= y < y0:
                factor = (y0 - y) / STRIP_FEATHER
            elif y1 < y <= y1 + STRIP_FEATHER:
                factor = (y - y1) / STRIP_FEATHER
            else:
                factor = 1
            if factor < 1:
                for x in range(w):
                    m_pix[x, y] = int(m_pix[x, y] * factor)

    out = Image.composite(source, target, mask)
    out.save(tgt_path)

    pose_label = "FOCUSED (eye strip preserved)" if focused else "NORMAL"
    print(f"  Patched face onto {target_id} [{pose_label}]: {tgt_path}")
    print(f"  Face source: {source_id}_normal.png")
    print(f"  Backup of pre-patch target: {bak_path}")
    print(f"  Face region: {FACE_BOX} with {FEATHER}-px feather"
          + (f"; eye strip preserved y={EYE_STRIP_Y}" if focused else ""))


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) == 2:
        patch_face(args[0], args[1])
    elif len(args) == 3 and args[2] in ("--focused", "focused"):
        patch_face(args[0], args[1], focused=True)
    else:
        print("Usage: python patch_face.py <source_tier_id> <target_tier_id> [--focused]")
        sys.exit(1)
