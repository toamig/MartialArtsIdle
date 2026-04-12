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
            "Interior of a xianxia inner-sect cultivation hall at dawn. "
            "Flat polished dark-jade floor tiles in the ground zone (bottom quarter, completely clear). "
            "Midground: red lacquered wooden pillars carved with ascending dragon motifs, "
            "a bronze incense burner (xianglu) emitting golden qi smoke coiling upward, "
            "red silk curtains embroidered with crane and cloud patterns hanging between pillars, "
            "copper wind chimes swaying, a low stone altar bearing jade candles and offering bowls. "
            "Background: a wide circular moon-gate opening onto mist-wrapped jade-green mountain peaks, "
            "pine trees visible through the arch, soft violet and gold dawn sky beyond. "
            "Atmosphere: serene, meditative, timeless Chinese inner-sect sanctuary. "
            "Palette: deep reds, warm gold, dark jade, soft ink-wash blues and greens. "
            f"{S}"
        ),
    },

    "world_1": {
        "desc": (
            "Outer sect martial training ground at the edge of borderland wilderness, xianxia China. "
            "Flat packed-earth courtyard ground in the bottom quarter (clear, no obstacles). "
            "Midground: weathered stone practice pillars with impact marks, a tall wooden pailou gate "
            "with faded red paint and hanging sect banners bearing Chinese calligraphy, "
            "a pair of worn stone lion guardians flanking the gate, dense bamboo grove to one side, "
            "morning mist drifting low across the ground. "
            "Background: layered misty green mountains in Chinese ink-wash style receding into pale grey-blue sky, "
            "pine silhouettes along the ridge, a distant waterfall barely visible through haze. "
            "Atmosphere: grounded, earthly, traditional wuxia/xianxia martial arts school. "
            "Palette: muted greens, grey stone, faded red and gold banners, pale morning sky. "
            f"{S}"
        ),
    },

    "world_2": {
        "desc": (
            "The Ancient Frontier — ruins of a vast xianxia immortal empire swallowed by desert sands. "
            "Flat cracked ochre desert floor in the bottom quarter (completely clear, no debris jutting up). "
            "Midground: half-buried ceremonial stone archways with worn dragon-and-phoenix relief carvings, "
            "toppled stone stele with ancient Chinese seal-script inscriptions still faintly legible, "
            "a cracked bronze ding ritual cauldron (tripod vessel) half-submerged in drifting sand, "
            "bleached dragon-beast ribcage bones curving out of dunes. "
            "Background: cracked amber-orange sky as if shattered by an ancient war, "
            "silhouettes of collapsed multi-tiered pagoda towers on the horizon, "
            "a massive stone torii-style ceremonial gate toppled across the far distance. "
            "Atmosphere: desolate grandeur, dead empire, scorched ancient glory. "
            "Palette: deep amber, scorched ochre, sun-bleached bone, ancient bronze-gold, fractured pale sky. "
            f"{S}"
        ),
    },

    "world_3": {
        "desc": (
            "Forbidden Chinese ancestral burial grounds of ancient Saints, sealed and cursed. "
            "Flat dark-grey cracked stone courtyard ground in the bottom quarter (clear, no tombstones crossing into it). "
            "Midground: towering stone memorial stele on turtle-dragon bases (bixi), "
            "stone civil and military tomb guardian statues (wenwu shixiang) lining a spirit road, "
            "chained iron spirit-lock gates with ward talismans nailed to them, "
            "wisps of ghost-fire floating above offering urns still smoldering with black incense. "
            "Background: deep purple-black sky, ghostly white mourning banners hanging from unseen heights, "
            "the distant silhouette of a colossal sealed imperial mausoleum with upturned eave rooflines, "
            "yin-yang and bagua glyphs glowing faintly in purple on the sealed stone gate. "
            "Atmosphere: ominous, cursed, death-qi soaked forbidden ground. "
            "Palette: deep purples, blacks, ghost-white, sickly jade-green ghost-fire, cold blue moonlight. "
            f"{S}"
        ),
    },

    "world_4": {
        "desc": (
            "Deep underground origin-qi caverns beneath sacred Chinese mountains — ancient and primordial. "
            "Flat ancient stone floor with faint glowing azure dragon-vein (longmai) qi cracks "
            "in the bottom quarter (flat and clear, no formations jutting from the ground zone). "
            "Midground: colossal stone dragon-head carvings set into the cave walls with water flowing "
            "from their mouths into glowing azure qi pools, "
            "a half-submerged ancient bronze mirror (tongjing) reflecting pale celestial light, "
            "massive gnarled tree roots descending from above like pillars, "
            "glowing jade crystal formations and luminescent spirit mushrooms clustering on cave walls. "
            "Background: vast cavern ceiling receding into darkness above, "
            "ancient Buddhist-style relief carvings of celestial figures barely visible on distant stone walls, "
            "stalactites like jade fangs. "
            "Atmosphere: primal, sacred underground world, origin of heaven and earth qi. "
            "Palette: deep teal, glowing azure, ancient bronze, jade green, dark brown stone, pale gold reflections. "
            f"{S}"
        ),
    },

    "world_5": {
        "desc": (
            "The Void Sea — shattered space between worlds, littered with relics of the Dao. "
            "Flat ancient stone dao-altar platform ground in the bottom quarter "
            "(clear, no floating debris or rifts crossing into it). "
            "Midground: a floating bronze armillary sphere (浑天仪) slowly rotating, "
            "shattered jade slips with glowing dao-inscription runes tumbling in void, "
            "fragments of ancient Chinese observatory architecture suspended in space, "
            "a cracked bronze bagua (八卦) trigram disc radiating cold indigo light. "
            "Background: deep indigo-black void filled with drifting star-charts in the style of "
            "ancient Chinese astronomical maps (star mandalas), "
            "massive spatial rift tears glowing silver-white, distant nebula wisps in ink-wash style. "
            "Atmosphere: cosmic, ancient, the dao made visible as void. "
            "Palette: deep indigo, void black, silver-white rift light, cold bronze, glowing jade-green runes. "
            f"{S}"
        ),
    },

    "world_6": {
        "desc": (
            "The Open Heaven — the celestial palace realm beyond ascension, tier of immortal gods. "
            "Flat divine white-jade paved ground in the bottom quarter "
            "(clear, no pillars, clouds, or lotus flowers crossing into it). "
            "Midground: colossal white-gold tiangong (heavenly palace) pillars carved with coiling "
            "celestial dragons rising out of frame, "
            "immortal cranes perched on carved jade railings, "
            "golden qi rivers flowing upward defying gravity, "
            "a pair of towering jade gate pillars (yuemen) with golden divine seals blazing. "
            "Background: blindingly radiant heavenly sky of pure divine gold and white, "
            "a vast celestial star sea visible through parting clouds of golden qi, "
            "distant tiangong palace rooflines with upturned eaves silhouetted against divine radiance, "
            "massive lotus flowers made of light blooming at the horizon. "
            "Atmosphere: transcendent, overwhelming divine power, the apex of cultivation. "
            "Palette: divine gold, pure white, celestial blue, jade, blazing radiance. "
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


def crop_to_content(img, white_threshold=200):
    """
    1. Crop away transparent bands and white/mist edges baked in by the API.
    2. Centre-crop the result to exactly BG_WIDTH:BG_HEIGHT (2:1) so all
       backgrounds are resized with a consistent scale factor and no distortion.

    A column/row is "edge filler" when it is either:
      - fully transparent (alpha == 0 for every pixel), OR
      - opaque but average brightness > white_threshold (mist/sky haze).
    """
    w, h = img.size
    pixels = img.load()

    def col_is_content(x):
        vals = [pixels[x, y][c] for y in range(h) for c in range(3)
                if pixels[x, y][3] > 0]
        return bool(vals) and (sum(vals) / len(vals)) < white_threshold

    def row_is_content(y):
        vals = [pixels[x, y][c] for x in range(w) for c in range(3)
                if pixels[x, y][3] > 0]
        return bool(vals) and (sum(vals) / len(vals)) < white_threshold

    left  = next((x for x in range(w)          if col_is_content(x)), 0)
    right = next((x for x in range(w-1, -1, -1) if col_is_content(x)), w - 1)
    top   = next((y for y in range(h)          if row_is_content(y)), 0)
    bot   = next((y for y in range(h-1, -1, -1) if row_is_content(y)), h - 1)

    cropped = img.crop((left, top, right + 1, bot + 1))
    cw, ch  = cropped.size
    print(f"  Content region: x={left}-{right}, y={top}-{bot} ({cw}x{ch})")

    # Normalise to target aspect ratio (2:1) by centre-cropping the excess axis.
    target_ar = BG_WIDTH / BG_HEIGHT          # 2.0
    current_ar = cw / ch

    if current_ar > target_ar:               # too wide — trim left/right equally
        new_w  = int(ch * target_ar)
        x_off  = (cw - new_w) // 2
        cropped = cropped.crop((x_off, 0, x_off + new_w, ch))
    elif current_ar < target_ar:             # too tall — trim top/bottom equally
        new_h  = int(cw / target_ar)
        y_off  = (ch - new_h) // 2
        cropped = cropped.crop((0, y_off, cw, y_off + new_h))

    print(f"  Normalised to {target_ar:.1f}:1 -> {cropped.size[0]}x{cropped.size[1]}")
    return cropped


def fill_transparent(img):
    """
    Replace any remaining transparent pixels with their nearest opaque neighbour,
    scanning each column vertically so sky/background tones extend naturally into
    gaps rather than showing a flat fill colour.
    """
    w, h = img.size
    px = img.load()
    out = img.copy()
    dst = out.load()

    for x in range(w):
        # Collect opaque pixels in this column
        opaque = [(y, px[x, y]) for y in range(h) if px[x, y][3] > 128]
        if not opaque:
            continue
        for y in range(h):
            if px[x, y][3] <= 128:
                nearest = min(opaque, key=lambda p: abs(p[0] - y))
                r, g, b, _ = nearest[1]
                dst[x, y] = (r, g, b, 255)
    return out


def run_finalize(scene_id, cand_n):
    if scene_id not in SCENES:
        raise ValueError(f"Unknown scene '{scene_id}'. Known: {list(SCENES)}")

    src = TMP_DIR / f"{scene_id}_cand_{cand_n}.png"
    if not src.exists():
        raise FileNotFoundError(f"Candidate not found: {src}")

    print(f"\n  Finalizing {scene_id} from cand_{cand_n}...")

    img = Image.open(src).convert("RGBA")

    # 1. Strip transparent padding and white/mist edge bands baked in by the API
    img = crop_to_content(img)

    # 2. Fill any residual transparent pixels with their nearest opaque neighbour
    #    (vertical scan — sky tones blend naturally into gaps, no flat colour fill)
    img = fill_transparent(img)

    # 3. Drop alpha — save as opaque RGB.  CSS background-size:cover handles
    #    display scaling; we don't force-resize so LANCZOS never re-introduces
    #    alpha artefacts at crop boundaries.
    img = img.convert("RGB")

    out_path = OUT_DIR / f"{scene_id}.png"
    img.save(str(out_path))
    cw, ch = img.size
    print(f"  Saved {cw}x{ch} -> {out_path}")
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
