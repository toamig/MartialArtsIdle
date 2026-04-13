"""
gen_ui.py — Pixel art UI element generation pipeline for MartialArtsIdle.

WORKFLOW (2 steps per element):
  1. Generate candidates:
       python gen_ui.py generate <element_id>
       → calls generate-image-v2, saves candidate PNGs to TMP_DIR
       → review candidates, pick the best one

  2. Finalize chosen candidate:
       python gen_ui.py finalize <element_id> <cand_number>
       → crops transparent edges, saves to public/ui/<element_id>.png

ELEMENTS:
  card_frame      — Ornate oriental card border (technique slots)
  panel_scroll    — Parchment/stone scroll panel background
  btn_stone       — Carved stone action button
  bar_frame       — HP bar end-cap / decorative frame

DEPENDENCIES:
  pip install Pillow
"""

import json, base64, time, sys
from pathlib import Path
import urllib.request, urllib.error
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

API_KEY  = "886d28c4-fb31-429d-832e-1242e312160e"
BASE_URL = "https://api.pixellab.ai/v2"
OUT_DIR  = Path(__file__).parent.parent / "public/ui"
TMP_DIR  = Path(__file__).parent.parent / "tmp/ui_gen"
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# HTTP helpers
# ─────────────────────────────────────────────────────────────────────────────

def _headers():
    return {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

def api_post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=_headers())
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} on {path}: {e.read().decode()[:600]}") from e

def api_get(path):
    req = urllib.request.Request(f"{BASE_URL}{path}", headers=_headers())
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

def poll_job(job_id, max_wait=600):
    print(f"    polling {job_id[:8]}...", end="", flush=True)
    for _ in range(max_wait // 5):
        time.sleep(5)
        r = api_get(f"/background-jobs/{job_id}")
        if r.get("status") == "completed":
            print(" done")
            return r
        if r.get("status") == "failed":
            raise RuntimeError(f"Job failed: {r}")
        print(".", end="", flush=True)
    raise TimeoutError(f"Job {job_id} timed out after {max_wait}s")

def decode_b64(b64):
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    return base64.b64decode(b64)

def save_image(img_obj, path):
    if img_obj.get("type") == "rgba_bytes":
        Image.frombytes(
            "RGBA", (img_obj["width"], img_obj["height"]),
            decode_b64(img_obj["base64"])
        ).save(str(path))
    else:
        Path(path).write_bytes(decode_b64(img_obj["base64"]))

# ─────────────────────────────────────────────────────────────────────────────
# Art style suffix (appended to all prompts)
# ─────────────────────────────────────────────────────────────────────────────

S = (
    "Xianxia cultivation fantasy pixel art UI element. "
    "16-bit style, clean pixel linework, limited 4-6 colour palette. "
    "Transparent background outside the element border. "
    "Ornate oriental motifs — jade inlays, bronze fittings, carved stone, cloud scroll patterns. "
    "No western UI chrome, no flat gradients, no modern design language."
)

# ─────────────────────────────────────────────────────────────────────────────
# Element definitions
# ─────────────────────────────────────────────────────────────────────────────

ELEMENTS = {

    "card_frame": {
        "size": (96, 120),
        "desc": (
            "A pixel art ornate card border / frame for a xianxia game technique slot. "
            "The frame is a rectangular border approximately 8-10 pixels thick on all sides. "
            "The INTERIOR of the card must be fully transparent so game icons can show through. "
            "Frame design: carved dark jade and ancient bronze construction. "
            "Corner decorations: small bronze dragon-head corner caps at each of the 4 corners. "
            "Top edge: a small carved stone nameplate ledge with cloud-scroll relief. "
            "Bottom edge: a thin bronze bar with aged patina. "
            "Side edges: smooth dark jade with faint engraved vertical line patterns. "
            "Overall shape: clean rectangular card proportions, portrait orientation. "
            "Palette: dark jade green, aged bronze-gold, deep charcoal stone, faint gold highlights. "
            "The transparent center must be large — at least 70% of the total frame area must be see-through. "
            f"{S}"
        ),
    },

    "panel_scroll": {
        "size": (256, 96),
        "two_tone_interior": True,
        "two_tone_kwargs": {"border_pct": 0.07, "ink_threshold": 170},
        "desc": (
            "A pixel art horizontal scroll/panel background for a xianxia game combat log or info panel. "
            "Wide landscape rectangle. "
            "Design: aged parchment or weathered stone slab texture. "
            "Left and right edges: small carved stone bracket decorations or bronze scroll end-caps. "
            "Surface texture: faint Chinese calligraphy brush strokes barely visible as texture pattern. "
            "Small bronze nail studs at the corners. "
            "Slightly darker border frame around a lighter interior. "
            "Palette: aged parchment cream, weathered stone grey, faded ink brown, bronze accent. "
            "The interior must be semi-opaque so text placed over it remains legible. "
            f"{S}"
        ),
    },

    "btn_stone": {
        "size": (128, 40),
        "desc": (
            "A pixel art rectangular button for a xianxia cultivation game. "
            "MUST match the established UI palette: dark jade green body, aged bronze-gold border. "
            "Wide landscape rectangle, designed to hold text in its centre. "
            "Design: flat dark jade face with a clean 2-3 pixel aged bronze border on all sides. "
            "3D depth: 2-3 pixel thick bottom edge in darker jade/bronze to suggest a raised slab. "
            "Corner decorations: one small bronze stud at each of the 4 corners — NOTHING ELSE. "
            "NO central ornaments, NO scroll patterns on the face, NO extra embellishments. "
            "Interior face: flat dark jade, smooth enough for white or gold text to be legible. "
            "Palette: dark jade green, aged bronze-gold border, slightly lighter jade highlight on top edge. "
            "Keep it simple — the restraint IS the design. "
            f"{S}"
        ),
    },

    "bar_frame": {
        "size": (256, 40),
        "desc": (
            "A pixel art HP bar frame / housing for a xianxia game. "
            "Wide landscape rectangle, designed to contain a coloured fill bar inside. "
            "Generated large so detail is visible — will be scaled down in the game. "
            "Design: a carved dark jade and ancient bronze trough/channel. "
            "The interior channel must be clearly transparent (where the coloured HP fill will go). "
            "Left end-cap: a small dragon head in profile facing right, mouth open as if breathing the bar. "
            "Right end-cap: a bronze finial curl or dragon tail bracket. "
            "Top edge: a carved stone lip with a subtle cloud-scroll engraving, 4-5 pixels thick. "
            "Bottom edge: matching carved stone lip, 4-5 pixels thick. "
            "The transparent interior strip runs the full width between end-caps. "
            "Palette: dark jade green, aged bronze-gold, charcoal stone, faint gold edge highlight. "
            f"{S}"
        ),
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Post-processing
# ─────────────────────────────────────────────────────────────────────────────

def crop_transparent_edges(img):
    """Trim fully-transparent border rows/columns from a RGBA image."""
    w, h = img.size
    px = img.load()

    def col_has_content(x):
        return any(px[x, y][3] > 10 for y in range(h))

    def row_has_content(y):
        return any(px[x, y][3] > 10 for x in range(w))

    left  = next((x for x in range(w)          if col_has_content(x)), 0)
    right = next((x for x in range(w-1, -1, -1) if col_has_content(x)), w - 1)
    top   = next((y for y in range(h)          if row_has_content(y)), 0)
    bot   = next((y for y in range(h-1, -1, -1) if row_has_content(y)), h - 1)

    cropped = img.crop((left, top, right + 1, bot + 1))
    print(f"  Cropped: {w}x{h} → {cropped.size[0]}x{cropped.size[1]}")
    return cropped


def reduce_interior_to_two_tones(img, border_pct=0.16, ink_threshold=170):
    """
    Reduce the interior of a scroll/panel to exactly 2 clean parchment tones.

    Two-step process:
      1. Spatial ink removal: replace every ink pixel (avg brightness below
         ink_threshold) with its nearest parchment neighbour in the same
         column — erases calligraphy shapes without leaving colour artifacts.
      2. k-means quantization (k=2) on the ink-free interior to snap all
         remaining subtle colour noise to exactly the two dominant tones.

    border_pct: fraction of width/height left untouched (border/end-caps).
    ink_threshold: avg RGB below this → treated as ink and spatially replaced.
    """
    w, h = img.size
    px = img.load()
    out = img.copy()
    dst = out.load()

    x0 = int(w * border_pct)
    x1 = int(w * (1 - border_pct))
    y0 = int(h * border_pct)
    y1 = int(h * (1 - border_pct))

    def brightness(pixel):
        return (pixel[0] + pixel[1] + pixel[2]) / 3

    def is_ink(pixel):
        return brightness(pixel) < ink_threshold

    # ── Step 1: spatial nearest-neighbour ink removal ──────────────────────
    # Column-scan: replace each ink pixel with nearest non-ink pixel above/below
    for x in range(x0, x1):
        parchment = [(y, dst[x, y]) for y in range(y0, y1) if not is_ink(px[x, y])]
        if not parchment:
            continue
        for y in range(y0, y1):
            if is_ink(px[x, y]):
                nearest = min(parchment, key=lambda p: abs(p[0] - y))
                dst[x, y] = nearest[1]

    # ── Step 2: k-means quantize the ink-free interior to 2 tones ──────────
    clean_pixels = [
        (dst[x, y][0], dst[x, y][1], dst[x, y][2])
        for y in range(y0, y1)
        for x in range(x0, x1)
        if dst[x, y][3] > 10
    ]

    if not clean_pixels:
        return out

    def sq_dist(a, b):
        return (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2

    sorted_px = sorted(clean_pixels, key=lambda p: p[0]+p[1]+p[2])
    n = len(sorted_px)
    c1 = sorted_px[n // 4]
    c2 = sorted_px[3 * n // 4]

    for _ in range(20):
        g1, g2 = [], []
        for p in clean_pixels:
            (g1 if sq_dist(p, c1) <= sq_dist(p, c2) else g2).append(p)
        if not g1 or not g2:
            break
        new_c1 = tuple(sum(p[i] for p in g1) // len(g1) for i in range(3))
        new_c2 = tuple(sum(p[i] for p in g2) // len(g2) for i in range(3))
        if new_c1 == c1 and new_c2 == c2:
            break
        c1, c2 = new_c1, new_c2

    print(f"  Two-tone interior: light={c1}  dark={c2}")

    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b, a = dst[x, y]
            p = (r, g, b)
            tone = c1 if sq_dist(p, c1) <= sq_dist(p, c2) else c2
            dst[x, y] = (tone[0], tone[1], tone[2], a)

    return out

# ─────────────────────────────────────────────────────────────────────────────
# Pipeline steps
# ─────────────────────────────────────────────────────────────────────────────

def run_generate(element_id):
    if element_id not in ELEMENTS:
        raise ValueError(f"Unknown element '{element_id}'. Known: {list(ELEMENTS)}")

    cfg = ELEMENTS[element_id]
    w, h = cfg["size"]
    print(f"\n{'='*60}")
    print(f"  Generating: {element_id}  ({w}x{h})")
    print(f"{'='*60}")

    status, r = api_post("/generate-image-v2", {
        "description":  cfg["desc"],
        "image_size":   {"width": w, "height": h},
        "no_background": True,
    })
    if status != 202:
        raise RuntimeError(f"generate-image-v2 returned {status}: {r}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError("No images returned")

    print(f"\n  Saved to: {TMP_DIR}")
    for i, img in enumerate(images):
        path = TMP_DIR / f"{element_id}_cand_{i}.png"
        save_image(img, path)
        print(f"    cand_{i}: {path.name}  ({img['width']}x{img['height']})")

    print(f"\n  Review, then run:")
    print(f"    python gen_ui.py finalize {element_id} <cand_number>")


def run_finalize(element_id, cand_n):
    if element_id not in ELEMENTS:
        raise ValueError(f"Unknown element '{element_id}'. Known: {list(ELEMENTS)}")

    src = TMP_DIR / f"{element_id}_cand_{cand_n}.png"
    if not src.exists():
        raise FileNotFoundError(f"Candidate not found: {src}")

    cfg = ELEMENTS[element_id]
    print(f"\n  Finalizing {element_id} from cand_{cand_n}...")

    img = Image.open(src).convert("RGBA")

    # Trim transparent border padding
    img = crop_transparent_edges(img)

    # Reduce interior to two clean parchment tones (removes calligraphy noise)
    if cfg.get("two_tone_interior"):
        img = reduce_interior_to_two_tones(img, **cfg.get("two_tone_kwargs", {}))

    out_path = OUT_DIR / f"{element_id}.png"
    img.save(str(out_path))
    print(f"  Saved {img.size[0]}x{img.size[1]} RGBA → {out_path}")
    print(f"\n  Done.")


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "generate":
        run_generate(sys.argv[2])
    elif len(sys.argv) == 4 and sys.argv[1] == "finalize":
        run_finalize(sys.argv[2], sys.argv[3])
    else:
        print("Usage:")
        print(f"  python {sys.argv[0]} generate <element_id>")
        print(f"  python {sys.argv[0]} finalize <element_id> <cand_number>")
        print(f"\nKnown elements ({len(ELEMENTS)}):")
        for eid in ELEMENTS:
            print(f"  {eid}")
