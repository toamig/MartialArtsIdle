"""
gen_blood_lotus.py — Blood Lotus IAP-pack icon pipeline (PixelLab API).

Generates the 6 Blood Lotus pack icons. The cheapest pack ($0.99, 1 lotus) IS the
default currency icon at public/sprites/items/blood_lotus.png — `finalize` writes
both that path and the per-pack path for tier 1.

WORKFLOW (per pack):
  1. Generate candidates:
       python scripts/gen_blood_lotus.py generate <pack_id>
       → saves 4 candidates to tmp/blood_lotus_gen/

  2. Finalize chosen candidate:
       python scripts/gen_blood_lotus.py finalize <pack_id> <cand_n>
       → crops transparent edges, saves to public/sprites/items/<pack_id>.png
       → for blood_lotus_60 also writes blood_lotus.png (currency icon)

  Batch-generate all 6:
       python scripts/gen_blood_lotus.py generate-all

PACK TIERS (must match BLOOD_LOTUS_PACKAGES in src/systems/bloodLotus.js):
  blood_lotus_60     $0.99   Handful           1 lotus  (== default currency icon)
  blood_lotus_330    $4.99   Pouch             2 lotuses
  blood_lotus_980    $14.99  Chest             3 lotuses
  blood_lotus_1980   $29.99  Vault             5 lotuses
  blood_lotus_3280   $49.99  Treasury          7 lotuses + faint gold halo
  blood_lotus_6480   $99.99  Heaven's Fortune  9+ lotuses + bright radiant halo

PALETTE IDENTITY:
  Deep crimson petals (the same blood reds as the current icon) layered with
  gold-yellow centers. Premium tiers add a warm gold halo. Top-down view —
  flat lotus pattern, NOT side profile.
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
OUT_DIR  = Path(__file__).parent.parent / "public/sprites/items"
TMP_DIR  = Path(__file__).parent.parent / "tmp/blood_lotus_gen"
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
# Art style anchor — appended to every pack prompt
# ─────────────────────────────────────────────────────────────────────────────

S = (
    "Xianxia cultivation fantasy pixel art game icon. "
    "16-bit style, limited palette, crisp pixel art with no anti-aliasing. "
    "Fully transparent background — lotuses float in empty space, no ground, no shadow. "
    "Top-down view: each lotus is a flat pentagon-symmetric flower seen from directly above, "
    "petals radiating outward from a golden center pod. NOT a side profile. "
    "Petal palette: deep crimson red base (#7e1212), mid red (#a51c1c), bright vermilion highlight (#d23232). "
    "Pod palette: dark amber rim (#7d4400), warm gold (#ffcd00), bright butter (#ffe650). "
    "Composition: lotuses centred in frame, evenly spread, none touching the canvas edges. "
    "No UI chrome, no text, no Western fantasy aesthetics, no realism. "
    "Icon-scale clarity — readable as a 32x32 thumbnail."
)

# ─────────────────────────────────────────────────────────────────────────────
# Pack definitions
# ─────────────────────────────────────────────────────────────────────────────

PACKS = {

    # ── Tier 1 — Handful (1 lotus, also the currency icon) ───────────────────
    "blood_lotus_60": {
        "size": (128, 128),
        "desc": (
            "A single Blood Lotus bloom, centered, filling the frame at icon scale. "
            "Five large outer petals arranged in a pentagon pointing outward. "
            "Five smaller inner petals offset by half a step (36 degrees), creating a layered flower. "
            "A golden center pod ringed by tiny amber stamen dots. "
            "Crisp readable shape — this is the canonical currency icon, must work at 32x32. "
            f"{S}"
        ),
    },

    # ── Tier 2 — Pouch (2 lotuses) ──────────────────────────────────────────
    "blood_lotus_330": {
        "size": (128, 128),
        "desc": (
            "EXACTLY TWO Blood Lotus blooms — only 2 flowers visible in this icon, never 3, never 1. "
            "Each lotus is large and prominent, filling nearly half the frame each. "
            "Both flowers identical: 5 outer + 5 inner crimson petals around a golden core. "
            "Arrangement: one upper-left bloom, one lower-right bloom, slightly overlapping where they meet. "
            "Both fully visible — neither cropped by the canvas edge. Negative space around them. "
            "Do not add a third flower. Two lotuses only. "
            f"{S}"
        ),
    },

    # ── Tier 3 — Chest (3 lotuses, triangle) ────────────────────────────────
    "blood_lotus_980": {
        "size": (128, 128),
        "desc": (
            "Three Blood Lotus blooms arranged in a triangle: one on top center, two on the bottom corners. "
            "Each flower identical and recognisable — 5 outer + 5 inner red petals around a gold core. "
            "All three blooms scaled to fit the canvas without touching the edges. "
            f"{S}"
        ),
    },

    # ── Tier 4 — Vault (5 lotuses, pentagon) ────────────────────────────────
    "blood_lotus_1980": {
        "size": (128, 128),
        "desc": (
            "Five Blood Lotus blooms arranged in a pentagon — one on top, two upper sides, two lower sides. "
            "Each lotus smaller than the 3-pack so all five fit cleanly. "
            "Same canonical lotus shape: 5 outer + 5 inner crimson petals around a gold center. "
            "Petals stay crisp and individually readable. "
            f"{S}"
        ),
    },

    # ── Tier 5 — Treasury (7 lotuses + halo) ────────────────────────────────
    "blood_lotus_3280": {
        "size": (128, 128),
        "desc": (
            "Seven Blood Lotus blooms — one slightly-larger centerpiece surrounded by six smaller ones in a hexagonal ring. "
            "Behind the cluster: a soft warm gold radial halo (translucent gold-yellow glow, NOT a hard ring), "
            "barely brighter than the background, just enough to suggest abundance. "
            "Same canonical lotus shape on every bloom. Halo does not eclipse the flowers — petals stay sharp on top. "
            f"{S}"
        ),
    },

    # ── Tier 6 — Heaven's Fortune (9+ lotuses + radiant halo) ───────────────
    "blood_lotus_6480": {
        "size": (128, 128),
        "desc": (
            "Nine Blood Lotus blooms — one prominent centerpiece bloom slightly larger than the others, "
            "surrounded by eight smaller blooms in a denser cluster filling the frame. "
            "Behind the cluster: a bright divine warm-gold radial halo with subtle golden rays of light "
            "fanning outward from behind the central lotus — the feel is heavenly fortune, sacred bounty. "
            "The halo is translucent gold-yellow at the centre fading to transparency at the edges. "
            "Canonical lotus shape preserved on every bloom — 5 outer + 5 inner crimson petals around gold center. "
            "Despite the halo, every petal stays crisp and readable. "
            f"{S}"
        ),
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Pipeline
# ─────────────────────────────────────────────────────────────────────────────

PACK_ORDER = list(PACKS.keys())

def _prev_finalized(pack_id):
    """Return path of the previous finalized pack so we can pass it as reference."""
    idx = PACK_ORDER.index(pack_id) if pack_id in PACK_ORDER else -1
    if idx <= 0:
        return None
    prev_id = PACK_ORDER[idx - 1]
    path = OUT_DIR / f"{prev_id}.png"
    return path if path.exists() else None


def run_generate(pack_id, ref_path=None):
    if pack_id not in PACKS:
        raise ValueError(f"Unknown pack '{pack_id}'. Known: {list(PACKS)}")

    cfg = PACKS[pack_id]
    w, h = cfg["size"]

    if ref_path is None:
        ref_path = _prev_finalized(pack_id)

    print(f"\n{'='*60}")
    print(f"  Generating: {pack_id}  ({w}x{h})")
    if ref_path:
        print(f"  Reference:  {ref_path.name}")
    print(f"{'='*60}")

    body = {
        "description":   cfg["desc"],
        "image_size":    {"width": w, "height": h},
        "no_background": True,
    }

    if ref_path and ref_path.exists():
        ref_b64   = base64.b64encode(ref_path.read_bytes()).decode()
        ref_img   = {"type": "base64", "base64": ref_b64, "format": "png"}
        rw, rh    = Image.open(ref_path).size
        ref_sized = {"image": ref_img, "size": {"width": rw, "height": rh}}
        body["reference_images"] = [ref_sized]
        body["style_image"]      = ref_sized

    status, r = api_post("/generate-image-v2", body)
    if status != 202:
        raise RuntimeError(f"generate-image-v2 returned {status}: {r}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError("No images returned")

    print(f"\n  Saved to: {TMP_DIR}")
    for i, img in enumerate(images):
        path = TMP_DIR / f"{pack_id}_cand_{i}.png"
        save_image(img, path)
        print(f"    cand_{i}: {path.name}  ({img['width']}x{img['height']})")


def crop_transparent_edges(img):
    """Trim fully-transparent border rows/columns from an RGBA image."""
    w, h = img.size
    px = img.load()

    def col_has_content(x):
        return any(px[x, y][3] > 10 for y in range(h))
    def row_has_content(y):
        return any(px[x, y][3] > 10 for x in range(w))

    left  = next((x for x in range(w)           if col_has_content(x)), 0)
    right = next((x for x in range(w-1, -1, -1) if col_has_content(x)), w - 1)
    top   = next((y for y in range(h)           if row_has_content(y)), 0)
    bot   = next((y for y in range(h-1, -1, -1) if row_has_content(y)), h - 1)

    cropped = img.crop((left, top, right + 1, bot + 1))
    print(f"  Cropped: {w}x{h} → {cropped.size[0]}x{cropped.size[1]}")
    return cropped


def run_finalize(pack_id, cand_n):
    if pack_id not in PACKS:
        raise ValueError(f"Unknown pack '{pack_id}'. Known: {list(PACKS)}")

    src = TMP_DIR / f"{pack_id}_cand_{cand_n}.png"
    if not src.exists():
        raise FileNotFoundError(f"Candidate not found: {src}")

    print(f"\n  Finalizing {pack_id} from cand_{cand_n}...")

    img = Image.open(src).convert("RGBA")
    img = crop_transparent_edges(img)

    # Always write the per-pack file
    out_path = OUT_DIR / f"{pack_id}.png"
    img.save(str(out_path))
    print(f"  Saved {img.size[0]}x{img.size[1]} RGBA → {out_path}")

    # Tier 1 is ALSO the canonical currency icon — mirror to blood_lotus.png
    if pack_id == "blood_lotus_60":
        mirror = OUT_DIR / "blood_lotus.png"
        img.save(str(mirror))
        print(f"  Also wrote currency icon → {mirror}")


def run_generate_all():
    print(f"\n  Generating all {len(PACKS)} blood-lotus packs sequentially...")
    for pack_id in PACKS:
        try:
            run_generate(pack_id)
        except Exception as e:
            print(f"\n  ERROR on {pack_id}: {e}")
            print("  Continuing with next...")

# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    args = sys.argv[1:]
    no_ref = "--no-ref" in args
    if no_ref:
        args = [a for a in args if a != "--no-ref"]

    def _gen(pid):
        # When --no-ref is set, pass a sentinel path that doesn't exist so the
        # reference resolution skips. Otherwise let auto-detection run.
        run_generate(pid, ref_path=Path("__none__") if no_ref else None)

    if len(args) == 2 and args[0] == "generate":
        _gen(args[1])
    elif len(args) == 3 and args[0] == "finalize":
        run_finalize(args[1], args[2])
    elif len(args) == 1 and args[0] == "generate-all":
        run_generate_all()
    else:
        print("Usage:")
        print(f"  python {sys.argv[0]} generate <pack_id> [--no-ref]")
        print(f"  python {sys.argv[0]} finalize <pack_id> <cand_n>")
        print(f"  python {sys.argv[0]} generate-all")
        print(f"\nKnown packs ({len(PACKS)}):")
        for pid in PACKS:
            print(f"  {pid}")
