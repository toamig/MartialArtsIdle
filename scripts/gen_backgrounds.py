"""
gen_backgrounds.py — Background generation pipeline for MartialArtsIdle.

WORKFLOW (2 steps per scene):
  1. Generate candidates:
       python gen_backgrounds.py generate <scene_id>
       → calls generate-image-v2, saves 4 candidate PNGs to TMP_DIR
       → review candidates, pick the best one

  2. Finalize chosen candidate:
       python gen_backgrounds.py finalize <scene_id> <cand_number>
       → applies seamless horizontal tiling (edge-blend technique)
       → saves to public/backgrounds/<scene_id>.png

OUTPUT:
  public/backgrounds/<scene_id>.png  (512×256, seamlessly tileable horizontally)

SCENES:
  cultivation    — Main cultivation / idle screen
  world_1        — The Mortal Lands combat background
  world_2        — The Ancient Frontier combat background
  world_3        — The Forbidden Lands combat background
  world_4        — The Origin Depths combat background
  world_5        — The Void Sea combat background
  world_6        — The Open Heaven combat background

GROUND CLEARANCE RULE:
  The bottom 25% of every background (rows 192-255) must be a flat, clear ground
  strip with no tall obstacles. Enemies and the player are composited on top of it.

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
OUT_DIR  = Path(__file__).parent.parent / "public/backgrounds"
TMP_DIR  = Path(__file__).parent.parent / "tmp/bg_gen"
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)

BG_WIDTH  = 512
BG_HEIGHT = 256

# ─────────────────────────────────────────────────────────────────────────────
# HTTP helpers (same as gen_sprites.py)
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
        raise RuntimeError(f"HTTP {e.code} on {path}: {e.read().decode()[:400]}") from e

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
# Post-processing
# ─────────────────────────────────────────────────────────────────────────────

def make_seamless(img, blend_px=80):
    """
    Make the image seamlessly tileable horizontally.

    Uses the offset-blend technique:
      1. The edges of the original (left and right) are blended together
         over a zone of `blend_px` pixels on each side.
      2. When tiled side-by-side, the seam between tiles is invisible.

    Only blends the sky/midground region (top 75%) — the ground strip
    (bottom 25%) is left untouched to preserve its flat horizon line.
    """
    w, h = img.size
    ground_y = h * 3 // 4   # rows below this are the clear ground strip

    img = img.convert("RGBA")
    result = img.copy()
    src = img.load()
    dst = result.load()

    for y in range(ground_y):
        for x in range(blend_px):
            t = x / blend_px          # 0.0 at outer edge → 1.0 at inner edge
            mirror_x = w - blend_px + x

            # Left edge: blend from right-edge pixel toward original left pixel
            r1, g1, b1, a1 = src[x, y]
            r2, g2, b2, a2 = src[mirror_x, y]
            dst[x, y] = (
                int(r1 * t + r2 * (1 - t)),
                int(g1 * t + g2 * (1 - t)),
                int(b1 * t + b2 * (1 - t)),
                int(a1 * t + a2 * (1 - t)),
            )

            # Right edge: blend from left-edge pixel toward original right pixel
            r1, g1, b1, a1 = src[mirror_x, y]
            r2, g2, b2, a2 = src[x, y]
            dst[mirror_x, y] = (
                int(r1 * t + r2 * (1 - t)),
                int(g1 * t + g2 * (1 - t)),
                int(b1 * t + b2 * (1 - t)),
                int(a1 * t + a2 * (1 - t)),
            )

    return result

# ─────────────────────────────────────────────────────────────────────────────
# Scene definitions
# ─────────────────────────────────────────────────────────────────────────────

S = (
    "Xianxia cultivation fantasy pixel art game background. "
    "16-bit style, clean linework, limited palette, landscape orientation 512x256. "
    "CRITICAL: the bottom quarter of the image (bottom 25%) must be a flat, "
    "completely clear ground surface with no tall objects, no characters, "
    "no trees or pillars crossing into it — just flat ground texture (stone, "
    "earth, sand, etc.) so that game characters can be composited on top."
)

SCENES = {

    "cultivation": {
        "desc": (
            "A serene xianxia cultivation chamber or open mountain pavilion at dawn. "
            "Polished stone or wooden floor tiles in the ground zone (bottom quarter, flat and clear). "
            "Midground: lacquered wooden pillars, hanging silk lanterns glowing softly, "
            "wisps of golden qi energy drifting upward like incense smoke, a low meditation "
            "altar with candles. Background: mist-shrouded green mountain peaks visible "
            "through an arched opening, pale dawn sky with soft purples and gold. "
            "Peaceful, meditative, timeless inner-sect atmosphere. "
            f"{S}"
        ),
    },

    "world_1": {
        "desc": (
            "Combat background for a traditional xianxia sect training ground and borderland wilderness. "
            "Flat packed-earth or stone-paved ground in the bottom quarter (clear, no obstacles). "
            "Midground: weathered bamboo grove, stone practice pillars, a low sect wall with "
            "faded red banners, morning mist drifting through. Background: layered misty green "
            "mountains receding into a pale grey-blue sky, pine silhouettes at the ridge. "
            "Grounded, earthly, traditional Chinese martial arts atmosphere, muted greens and greys. "
            f"{S}"
        ),
    },

    "world_2": {
        "desc": (
            "Combat background for an ancient desert frontier ruin. "
            "Flat cracked sandy desert ground in the bottom quarter (clear, no rocks or ruins jutting up). "
            "Midground: broken stone columns, eroded ancient carved walls, wind-scattered sand drifts, "
            "bleached bones half-buried. Background: deep red-orange sunset sky over distant dunes, "
            "a collapsed ancient tower silhouette on the horizon, heat shimmer. "
            "Desolate, ancient, sun-scorched atmosphere. Warm reds, burnt oranges, sandy yellows. "
            f"{S}"
        ),
    },

    "world_3": {
        "desc": (
            "Combat background for forbidden burial grounds and sealed ancient ruins. "
            "Flat dark cracked stone ground in the bottom quarter (clear, no tombstones crossing into it). "
            "Midground: ancient tombstone slabs, stone burial altars, chained iron gates, "
            "faint purple seal-inscription glyphs glowing on stones. "
            "Background: deep purple-black sky, wisps of ghostly purple-white qi fog rising, "
            "a distant silhouette of a massive sealed stone mausoleum. "
            "Ominous, forbidden, death-qi atmosphere. Deep purples, blacks, ghostly blues. "
            f"{S}"
        ),
    },

    "world_4": {
        "desc": (
            "Combat background for deep underground origin-qi caverns. "
            "Flat ancient stone ground with faint glowing blue qi-vein cracks in the bottom quarter "
            "(flat and clear, no crystal formations jutting from the ground zone). "
            "Midground: towering crystal formations glowing teal and blue, massive stone roots "
            "descending from above, pools of glowing qi water reflecting the cave ceiling. "
            "Background: deep cavern darkness above with clusters of luminescent fungi and "
            "hanging crystalline stalactites. Primordial, subterranean atmosphere. "
            "Deep teals, glowing blues and greens, ancient brown stone. "
            f"{S}"
        ),
    },

    "world_5": {
        "desc": (
            "Combat background for a fractured void-space realm. "
            "Flat cosmic stone platform ground in the bottom quarter "
            "(clear, no floating debris or rifts crossing into it). "
            "Midground: jagged spatial rift tears glowing purple-white, floating stone fragments "
            "suspended in void space, faint dao-inscription runes glowing on broken stone surfaces. "
            "Background: deep indigo-black void with scattered silver stars, nebula wisps, "
            "and large glowing spatial cracks splitting the sky. "
            "Cosmic, empty, void-energy atmosphere. Deep indigo, purple, silver-white. "
            f"{S}"
        ),
    },

    "world_6": {
        "desc": (
            "Combat background for an open heaven celestial realm. "
            "Flat golden-white divine stone ground in the bottom quarter "
            "(clear, no pillars or clouds crossing into it). "
            "Midground: colossal white-gold heaven pillars rising, golden qi streams flowing "
            "upward like rivers, divine celestial architecture partially visible. "
            "Background: blinding divine light at the apex, a vast star sea and cosmic qi clouds "
            "in brilliant golds, whites, and celestial blues behind the pillars, "
            "radiant heaven energy saturating the air. "
            "Transcendent, divine, overwhelming celestial power atmosphere. "
            "Gold, white, brilliant celestial blue, divine radiance. "
            f"{S}"
        ),
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Pipeline steps
# ─────────────────────────────────────────────────────────────────────────────

def run_generate(scene_id):
    if scene_id not in SCENES:
        raise ValueError(f"Unknown scene '{scene_id}'. Known: {list(SCENES)}")

    cfg = SCENES[scene_id]
    print(f"\n{'='*60}")
    print(f"  {scene_id}")
    print(f"{'='*60}")
    print(f"  [1] Generating candidates for {scene_id}...")

    status, r = api_post("/generate-image-v2", {
        "description": cfg["desc"],
        "image_size":  {"width": BG_WIDTH, "height": BG_HEIGHT},
        "no_background": False,
    })
    if status != 202:
        raise RuntimeError(f"generate-image-v2 returned {status}: {r}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError("No images returned")

    print(f"\n  Candidates saved to: {TMP_DIR}")
    for i, img in enumerate(images[:4]):
        path = TMP_DIR / f"{scene_id}_cand_{i}.png"
        save_image(img, path)
        print(f"    cand_{i}: {path.name}  ({img['width']}x{img['height']})")

    print(f"\n  Review, then run:")
    print(f"    python gen_backgrounds.py finalize {scene_id} <0-3>")


def run_finalize(scene_id, cand_n):
    if scene_id not in SCENES:
        raise ValueError(f"Unknown scene '{scene_id}'. Known: {list(SCENES)}")

    src = TMP_DIR / f"{scene_id}_cand_{cand_n}.png"
    if not src.exists():
        raise FileNotFoundError(f"Candidate not found: {src}")

    print(f"\n  Finalizing {scene_id} from cand_{cand_n}...")

    img = Image.open(src).convert("RGBA")

    # Resize to exact target dimensions if API returned something slightly off
    if img.size != (BG_WIDTH, BG_HEIGHT):
        img = img.resize((BG_WIDTH, BG_HEIGHT), Image.NEAREST)
        print(f"  Resized to {BG_WIDTH}x{BG_HEIGHT}")

    # Apply seamless horizontal tiling
    seamless = make_seamless(img)
    print(f"  Applied seamless edge blend (80px zones)")

    out_path = OUT_DIR / f"{scene_id}.png"
    seamless.save(str(out_path))
    print(f"  Saved -> {out_path}")

    # Also save a 2x tiled preview so you can check the seam
    preview = Image.new("RGBA", (BG_WIDTH * 2, BG_HEIGHT))
    preview.paste(seamless, (0, 0))
    preview.paste(seamless, (BG_WIDTH, 0))
    preview_path = TMP_DIR / f"{scene_id}_tile_preview.png"
    preview.save(str(preview_path))
    print(f"  Tiled preview -> {preview_path}")
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
        print(f"  python {sys.argv[0]} generate <scene_id>")
        print(f"  python {sys.argv[0]} finalize <scene_id> <cand_number>")
        print(f"\nKnown scenes ({len(SCENES)}):")
        for sid in SCENES:
            print(f"  {sid}")
