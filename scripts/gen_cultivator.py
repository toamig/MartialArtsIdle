"""
gen_cultivator.py — Main-character sprite generation for MartialArtsIdle.

Generates 8 realm-tier character sprites × 2 poses (normal + focused) + 1
heavenly aura underlay. Single static 128×128 PNGs (no per-frame animation —
CSS handles the breathing pulse and aura rotation).

Pipeline shape (per tier, run sequentially):
  1. `gen-normal <tier>`   — 4 design candidates, transparent BG
                             • T0: no reference (seed the character)
                             • T1-T7: previous tier's normal.png as ref+style
                             → tmp/cultivator/<tier>_normal_cand_{0..3}.png
  2. `pick-normal <tier> <N>` — copy cand_N into public/sprites/cultivator/
                                <tier>_normal.png; this sprite is the in-game
                                idle pose AND the reference for the next tier
  3. `gen-focused <tier>`  — same character, qi effects escalated. Always uses
                             THIS tier's normal.png as reference + style
                             → tmp/cultivator/<tier>_focused_cand_{0..3}.png
  4. `pick-focused <tier> <N>` — copy cand_N into <tier>_focused.png

Heavenly aura (run once, after all tiers or in parallel):
  • `gen-aura`             — 4 aura candidates (transparent center, sun-disc +
                             orbiting glyphs + violet-gold beams + lotus base)
  • `pick-aura <N>`        — copy cand_N into heavenly_aura.png

Prompts live in `scripts/cultivator_prompts.py`. Edit there, not here.

DEPENDENCIES:
  pip install Pillow
"""

import json, base64, time, sys, shutil
from pathlib import Path
import urllib.request, urllib.error
from PIL import Image

from cultivator_prompts import TIERS, HEAVENLY_AURA

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

API_KEY  = "886d28c4-fb31-429d-832e-1242e312160e"
BASE_URL = "https://api.pixellab.ai/v2"
OUT_DIR  = Path(__file__).parent.parent / "public/sprites/cultivator"
TMP_DIR  = Path(__file__).parent.parent / "tmp/cultivator"
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)

CANVAS = 256   # 256×256 — face details and ornament read crisp at this size
TIER_ORDER = list(TIERS.keys())  # t0_novice → t7_heavenly

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

def poll_job(job_id, max_wait=1500):
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
# Image helpers — crop transparent edges + pad to 128×128 with feet grounded
# ─────────────────────────────────────────────────────────────────────────────

def crop_transparent_edges(img):
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    w, h = img.size
    pixels = img.load()
    def row(y): return any(pixels[x, y][3] > 4 for x in range(w))
    def col(x): return any(pixels[x, y][3] > 4 for y in range(h))
    left  = next((x for x in range(w)         if col(x)), 0)
    right = next((x for x in range(w-1,-1,-1) if col(x)), w-1)
    top   = next((y for y in range(h)         if row(y)), 0)
    bot   = next((y for y in range(h-1,-1,-1) if row(y)), h-1)
    return img.crop((left, top, right+1, bot+1))

def pad_to_canvas(img, side=CANVAS, anchor="bottom"):
    """Center horizontally; anchor vertically to bottom (feet grounded) by
    default. Aura sprites use anchor="center" so their disc stays centered."""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    cw, ch = img.size
    if cw > side or ch > side:
        img.thumbnail((side, side), Image.NEAREST)
        cw, ch = img.size
    ox = (side - cw) // 2
    oy = side - ch if anchor == "bottom" else (side - ch) // 2
    canvas.paste(img, (ox, oy), img)
    return canvas

def encode_reference(path):
    """Return the PixelLab ref_sized payload for a local PNG."""
    b64 = base64.b64encode(path.read_bytes()).decode()
    img = {"type": "base64", "base64": b64, "format": "png"}
    rw, rh = Image.open(path).size
    return {"image": img, "size": {"width": rw, "height": rh}}

# ─────────────────────────────────────────────────────────────────────────────
# Pipeline steps
# ─────────────────────────────────────────────────────────────────────────────

def _previous_tier(tier_id):
    """Return the previous tier id (for normal-step reference), or None if T0."""
    idx = TIER_ORDER.index(tier_id)
    return TIER_ORDER[idx - 1] if idx > 0 else None

def _check_tier(tier_id):
    if tier_id not in TIERS:
        raise ValueError(f"Unknown tier '{tier_id}'. Known: {TIER_ORDER}")

def run_gen_normal(tier_id):
    _check_tier(tier_id)
    cfg = TIERS[tier_id]

    print(f"\n{'='*60}")
    print(f"  Generating: {tier_id} NORMAL  ({CANVAS}×{CANVAS})")
    print(f"{'='*60}")

    body = {
        "description":   cfg["design_prompt"],
        "image_size":    {"width": CANVAS, "height": CANVAS},
        "no_background": True,
    }

    # T1-T7: use previous tier's normal as reference + style to lock identity
    prev = _previous_tier(tier_id)
    if prev is not None:
        prev_path = OUT_DIR / f"{prev}_normal.png"
        if not prev_path.exists():
            raise FileNotFoundError(
                f"Previous tier's normal sprite missing: {prev_path}. "
                f"Run `gen-normal {prev}` + `pick-normal {prev} <N>` first."
            )
        ref = encode_reference(prev_path)
        body["reference_images"] = [ref]
        body["style_image"]      = ref
        print(f"  Reference: {prev_path.name} (identity locked from {prev})")
    else:
        print(f"  Reference: none — T0 seeds the character lineage")

    print(f"  Prompt: {len(cfg['design_prompt'])} chars (limit 2000)\n")

    status, r = api_post("/generate-image-v2", body)
    if status != 202:
        raise RuntimeError(f"generate-image-v2 returned {status}: {r}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError("No images returned")

    print(f"\n  Saved {len(images)} candidates to: {TMP_DIR}")
    for i, img in enumerate(images):
        path = TMP_DIR / f"{tier_id}_normal_cand_{i}.png"
        save_image(img, path)
        print(f"    cand_{i}: {path.name}  ({img['width']}×{img['height']})")
    print(f"\n  Review, then run:")
    print(f"    python gen_cultivator.py pick-normal {tier_id} <N>")


def run_pick_normal(tier_id, n):
    _check_tier(tier_id)
    src = TMP_DIR / f"{tier_id}_normal_cand_{n}.png"
    if not src.exists():
        raise FileNotFoundError(f"Candidate not found: {src}")
    img = Image.open(src).convert("RGBA")
    img = crop_transparent_edges(img)
    img = pad_to_canvas(img, anchor="bottom")
    out = OUT_DIR / f"{tier_id}_normal.png"
    img.save(str(out))
    print(f"\n  cand_{n} → {out.name}  ({img.size[0]}×{img.size[1]} RGBA)")
    print(f"  Next: `gen-focused {tier_id}` to render this tier's focused pose.")


def run_gen_focused(tier_id):
    _check_tier(tier_id)
    cfg = TIERS[tier_id]

    ref_path = OUT_DIR / f"{tier_id}_normal.png"
    if not ref_path.exists():
        raise FileNotFoundError(
            f"This tier's normal sprite missing: {ref_path}. "
            f"Run `gen-normal {tier_id}` + `pick-normal {tier_id} <N>` first."
        )

    print(f"\n{'='*60}")
    print(f"  Generating: {tier_id} FOCUSED  ({CANVAS}×{CANVAS})")
    print(f"{'='*60}")
    print(f"  Reference: {ref_path.name} (THIS tier's normal — pose+identity lock)")
    print(f"  Prompt: {len(cfg['focused_prompt'])} chars (limit 2000)\n")

    ref = encode_reference(ref_path)
    body = {
        "description":      cfg["focused_prompt"],
        "image_size":       {"width": CANVAS, "height": CANVAS},
        "no_background":    True,
        "reference_images": [ref],
        "style_image":      ref,
    }

    status, r = api_post("/generate-image-v2", body)
    if status != 202:
        raise RuntimeError(f"generate-image-v2 returned {status}: {r}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError("No images returned")

    print(f"\n  Saved {len(images)} candidates to: {TMP_DIR}")
    for i, img in enumerate(images):
        path = TMP_DIR / f"{tier_id}_focused_cand_{i}.png"
        save_image(img, path)
        print(f"    cand_{i}: {path.name}  ({img['width']}×{img['height']})")
    print(f"\n  Review, then run:")
    print(f"    python gen_cultivator.py pick-focused {tier_id} <N>")


def run_pick_focused(tier_id, n):
    _check_tier(tier_id)
    src = TMP_DIR / f"{tier_id}_focused_cand_{n}.png"
    if not src.exists():
        raise FileNotFoundError(f"Candidate not found: {src}")
    img = Image.open(src).convert("RGBA")
    img = crop_transparent_edges(img)
    img = pad_to_canvas(img, anchor="bottom")
    out = OUT_DIR / f"{tier_id}_focused.png"
    img.save(str(out))
    print(f"\n  cand_{n} → {out.name}  ({img.size[0]}×{img.size[1]} RGBA)")
    nxt = TIER_ORDER[TIER_ORDER.index(tier_id) + 1] if TIER_ORDER.index(tier_id) + 1 < len(TIER_ORDER) else None
    if nxt:
        print(f"  Next: `gen-normal {nxt}` to start the next tier.")
    else:
        print(f"  All 8 tiers done. Run `gen-aura` next.")


def run_gen_aura():
    print(f"\n{'='*60}")
    print(f"  Generating: HEAVENLY AURA  ({CANVAS}×{CANVAS})")
    print(f"{'='*60}")
    print(f"  Reference: none — aura is independent of cultivator identity")
    print(f"  Prompt: {len(HEAVENLY_AURA['design_prompt'])} chars (limit 2000)\n")

    body = {
        "description":   HEAVENLY_AURA["design_prompt"],
        "image_size":    {"width": CANVAS, "height": CANVAS},
        "no_background": True,
    }

    status, r = api_post("/generate-image-v2", body)
    if status != 202:
        raise RuntimeError(f"generate-image-v2 returned {status}: {r}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError("No images returned")

    print(f"\n  Saved {len(images)} candidates to: {TMP_DIR}")
    for i, img in enumerate(images):
        path = TMP_DIR / f"aura_cand_{i}.png"
        save_image(img, path)
        print(f"    cand_{i}: {path.name}  ({img['width']}×{img['height']})")
    print(f"\n  Review, then run:")
    print(f"    python gen_cultivator.py pick-aura <N>")


def run_pick_aura(n):
    src = TMP_DIR / f"aura_cand_{n}.png"
    if not src.exists():
        raise FileNotFoundError(f"Candidate not found: {src}")
    img = Image.open(src).convert("RGBA")
    img = crop_transparent_edges(img)
    img = pad_to_canvas(img, anchor="center")
    out = OUT_DIR / "heavenly_aura.png"
    img.save(str(out))
    print(f"\n  cand_{n} → {out.name}  ({img.size[0]}×{img.size[1]} RGBA)")
    print(f"  All cultivator + aura assets done. Wire into HomeScreen next.")


def run_gen_aura_frames():
    """Generate the 4-frame animated heavenly aura. At 256×256 the API returns
    1 image per call, so we make 4 sequential calls. Frame 0 has no reference
    (seeds the design); frames 1-3 each use the previous frame as reference +
    style so the aura's silhouette stays locked while flames flicker."""
    frames = HEAVENLY_AURA["anim_frames"]
    print(f"\n{'='*60}")
    print(f"  Generating: HEAVENLY AURA — 4 animation frames  ({CANVAS}×{CANVAS})")
    print(f"{'='*60}\n")

    frame_paths = []
    for i, prompt in enumerate(frames):
        print(f"  Frame {i}/3  ({len(prompt)} chars)")
        body = {
            "description":   prompt,
            "image_size":    {"width": CANVAS, "height": CANVAS},
            "no_background": True,
        }
        if i > 0:
            ref = encode_reference(frame_paths[i - 1])
            body["reference_images"] = [ref]
            body["style_image"]      = ref
            print(f"    Reference: frame {i-1}")

        status, r = api_post("/generate-image-v2", body)
        if status != 202:
            raise RuntimeError(f"generate-image-v2 returned {status}: {r}")
        result = poll_job(r["background_job_id"])
        images = result.get("last_response", {}).get("images", [])
        if not images:
            raise RuntimeError(f"No images returned for frame {i}")

        path = TMP_DIR / f"aura_frame_{i}.png"
        save_image(images[0], path)
        frame_paths.append(path)
        print(f"    saved {path.name}\n")

    print(f"  All 4 frames generated. Review at: {TMP_DIR}")
    print(f"  Each frame: aura_frame_{{0..3}}.png  ({CANVAS}×{CANVAS})")
    print(f"\n  When ready, run:")
    print(f"    python gen_cultivator.py finalize-aura-frames")


def _knock_out_central_silhouette(img):
    """Flood-fill from the center of the image, knocking 'whitish' pixels to
    alpha=0. The PixelLab model draws a placeholder cultivator silhouette in
    the center instead of leaving it transparent; this strips it cleanly.
    The colored aura ring (purple/gold) stops the flood naturally because
    its pixels fail the whitishness threshold.

    Whitish = all RGB ≥ 190 AND saturation low (max-min ≤ 25). Tuned for the
    cream-white silhouette the model produces; aura flames are saturated so
    they fall outside this filter.
    """
    img = img.convert("RGBA").copy()
    w, h = img.size
    pixels = img.load()

    def is_whitish(p):
        r, g, b, a = p
        if a == 0:
            return False
        if r < 190 or g < 190 or b < 190:
            return False
        return (max(r, g, b) - min(r, g, b)) <= 25

    # Iterative flood-fill from the center (avoid recursion depth limits at 256x256).
    seed = (w // 2, h // 2)
    if not is_whitish(pixels[seed]):
        # Try a slightly different seed if center isn't whitish.
        for dy in (0, -10, 10, -20, 20):
            for dx in (0, -10, 10):
                cand = (seed[0] + dx, seed[1] + dy)
                if 0 <= cand[0] < w and 0 <= cand[1] < h and is_whitish(pixels[cand]):
                    seed = cand
                    break
            else:
                continue
            break

    if not is_whitish(pixels[seed]):
        return img  # nothing to do — silhouette not detected

    stack = [seed]
    visited = set()
    while stack:
        x, y = stack.pop()
        if (x, y) in visited:
            continue
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        visited.add((x, y))
        if not is_whitish(pixels[x, y]):
            continue
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
        stack.extend([(x+1, y), (x-1, y), (x, y+1), (x, y-1)])

    return img


def run_finalize_aura_frames():
    """Knock out the central placeholder silhouette on each frame, then
    stitch into a 1024×256 spritesheet at
    public/sprites/cultivator/heavenly_aura.png, ready for SpriteAnimator
    consumption (frameWidth=256, frameHeight=256, frameCount=4)."""
    frames = []
    for i in range(4):
        src = TMP_DIR / f"aura_frame_{i}.png"
        if not src.exists():
            raise FileNotFoundError(f"Frame missing: {src}. Run gen-aura-frames first.")
        # No crop/pad here — keep each frame at its native 256×256 so the
        # aura is consistently positioned across the spritesheet.
        img = Image.open(src).convert("RGBA")
        if img.size != (CANVAS, CANVAS):
            # Defensive: if the model returned an off-size frame, fit it.
            img.thumbnail((CANVAS, CANVAS), Image.NEAREST)
            canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
            canvas.paste(img, ((CANVAS - img.size[0]) // 2, (CANVAS - img.size[1]) // 2), img)
            img = canvas
        # Knock the placeholder cultivator silhouette to alpha=0 so the
        # actual cultivator sprite shows through cleanly when stacked.
        img = _knock_out_central_silhouette(img)
        # Save the cleaned per-frame for inspection.
        cleaned = TMP_DIR / f"aura_frame_{i}_clean.png"
        img.save(str(cleaned))
        frames.append(img)

    sheet = Image.new("RGBA", (CANVAS * 4, CANVAS), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * CANVAS, 0), frame)

    out = OUT_DIR / "heavenly_aura.png"
    sheet.save(str(out))
    print(f"\n  Cleaned individual frames saved to: {TMP_DIR}/aura_frame_{{0..3}}_clean.png")
    print(f"  Stitched 4 frames → {out}  ({CANVAS * 4}×{CANVAS} RGBA)")
    print(f"  Consume via <SpriteAnimator frameWidth={CANVAS} frameHeight={CANVAS} frameCount=4 />")


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

USAGE = """Usage:
  python gen_cultivator.py gen-normal   <tier>      # design candidate (uses prev tier's normal as ref for T1+)
  python gen_cultivator.py pick-normal  <tier> <N>  # save cand_N as normal
  python gen_cultivator.py gen-focused  <tier>      # focused candidate (uses this tier's normal as ref)
  python gen_cultivator.py pick-focused <tier> <N>  # save cand_N as focused
  python gen_cultivator.py gen-aura                 # single static aura candidate
  python gen_cultivator.py pick-aura    <N>         # save cand_N as heavenly_aura.png
  python gen_cultivator.py gen-aura-frames          # 4 sequential animation frames (1 call per frame)
  python gen_cultivator.py finalize-aura-frames     # stitch 4 frames into 1024x256 spritesheet

Tiers (run in order):
  """ + "\n  ".join(TIER_ORDER)


if __name__ == "__main__":
    args = sys.argv[1:]
    if   len(args) == 2 and args[0] == "gen-normal":             run_gen_normal(args[1])
    elif len(args) == 3 and args[0] == "pick-normal":            run_pick_normal(args[1], int(args[2]))
    elif len(args) == 2 and args[0] == "gen-focused":            run_gen_focused(args[1])
    elif len(args) == 3 and args[0] == "pick-focused":           run_pick_focused(args[1], int(args[2]))
    elif len(args) == 1 and args[0] == "gen-aura":               run_gen_aura()
    elif len(args) == 2 and args[0] == "pick-aura":              run_pick_aura(int(args[1]))
    elif len(args) == 1 and args[0] == "gen-aura-frames":        run_gen_aura_frames()
    elif len(args) == 1 and args[0] == "finalize-aura-frames":   run_finalize_aura_frames()
    else:
        print(USAGE)
