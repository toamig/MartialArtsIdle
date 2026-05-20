"""
gen_qi_particles.py — Generate 16 small qi-particle VFX sprites (64×64 each).

Used as ambient/spawn VFX throughout the game: cultivation pulses, crystal
taps, breakthrough bursts, idle drift, hit feedback, etc. Each variant is a
distinct shape so a runtime spawner can pick one at random (or pick by
occasion) without the VFX feeling repetitive.

Style anchor: public/ui/qi.png — translucent sapphire-cyan pearl material,
charcoal outline, soft halo, bright cyan core highlight. The same palette
is used for every particle here so they all read as the SAME qi element.

WORKFLOW (per particle):
  1. python gen_qi_particles.py generate <particle_id>
     → calls generate-image-v2 with qi.png as style_image, saves candidates
       to tmp/qi_particles/
  2. python gen_qi_particles.py finalize <particle_id> <cand_number>
     → crops transparent edges, saves to public/sprites/vfx/qi_particles/<id>.png

BATCH:
  python gen_qi_particles.py generate-all
     → runs generate for every particle id sequentially (long-running).

DEPENDENCIES: pip install Pillow
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
OUT_DIR  = Path(__file__).parent.parent / "public/sprites/vfx/qi_particles"
TMP_DIR  = Path(__file__).parent.parent / "tmp/qi_particles"
STYLE_REF = Path(__file__).parent.parent / "public/ui/qi.png"
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)

SIZE = (64, 64)

# ─────────────────────────────────────────────────────────────────────────────
# HTTP helpers (same shape as gen_ui.py)
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
# Shared style prompt — appended to every particle description.
# Mirrors qi.png's pearl material, palette, and treatment so the 16 variants
# all read as the SAME qi element in different shapes.
# ─────────────────────────────────────────────────────────────────────────────

S = (
    "Pixel art VFX particle on a fully transparent background. "
    "Tiny translucent BLUE qi essence. Saturated mid-blue body, brighter "
    "cyan inner highlight, deep-blue shadow edge, thin charcoal outline, "
    "subtle 1-2 px cyan halo bleeding past the silhouette to sell the "
    "translucent glow. Flat colour fills, NO gradients (3-4 colour bands). "
    "Crisp pixel edges. Subject is small — occupies the centre 40-65% of "
    "the 64x64 frame, leaving generous transparent padding around it. "
    "Palette: bright cyan core (#7adcc4), translucent sapphire midtone "
    "(#3a8fc8), deep blue shadow (#1a3a70), white-cyan specular highlight "
    "(#e8ffff), faint cyan halo (#7adcc4 low alpha), charcoal outline "
    "(#111). NO gold, NO bronze, NO violet, NO red. NO frame, NO ring "
    "border, NO ornament — just the bare VFX shape on transparent."
)

# ─────────────────────────────────────────────────────────────────────────────
# 16 particle variants — grouped for variety
#   A. Orb droplets   (1-4)   — round, the simplest shape
#   B. Sparkle flashes (5-8)  — angular, sharp impact feel
#   C. Motion particles (9-12) — wisps & teardrops with directional motion
#   D. Special shapes  (13-16) — rings, swirls, crescents, shards
# ─────────────────────────────────────────────────────────────────────────────

PARTICLES = {

    # ── A. Orb droplets ──────────────────────────────────────────────────────
    "qi_orb_small": (
        "A single tiny perfectly round translucent blue qi orb, ~14 px "
        "diameter, centred. Pearl material — one white-cyan specular dot "
        "at top-left, deep-blue crescent at bottom-right, 1 px cyan halo. "
        "Reads as a small floating mote of qi essence. " + S
    ),
    "qi_orb_medium": (
        "A single translucent blue qi orb ~26 px diameter, centred. Same "
        "pearl construction as the reference qi sphere but smaller and "
        "with a slightly larger inner cyan core glow that almost fills "
        "the orb. Soft 2 px cyan halo. " + S
    ),
    "qi_orb_bright": (
        "A translucent blue qi orb ~22 px diameter with a VERY bright "
        "pulsing cyan core that occupies the inner 60% of the orb. "
        "Stronger 3-4 px outer cyan halo bleeding into the transparent "
        "background. Reads as 'qi orb at peak brightness'. " + S
    ),
    "qi_orb_faint": (
        "A faint translucent blue qi orb ~20 px diameter, low saturation, "
        "ghostly. The shell is barely there — mostly visible through its "
        "thin charcoal outline and a soft pale-cyan inner glow. No strong "
        "specular highlight. Reads as 'qi orb dissipating into mist'. " + S
    ),

    # ── B. Sparkle flashes ───────────────────────────────────────────────────
    "qi_spark_diamond": (
        "A small 4-pointed diamond sparkle, ~24 px tip-to-tip, centred. "
        "Two long thin cyan triangular spikes on the horizontal axis, two "
        "shorter cyan triangular spikes on the vertical axis. Bright "
        "white-cyan dot at the centre where the spikes meet. Thin "
        "charcoal outline along each spike. Reads as a sharp qi flash. " + S
    ),
    "qi_spark_cross": (
        "A small plus/cross sparkle, ~20 px wide, centred. Four equal "
        "short cyan rays at N/S/E/W and a bright white-cyan square pixel "
        "core. Each ray is 2-3 px wide tapering to 1 px tip. Reads as a "
        "tiny qi pop. " + S
    ),
    "qi_spark_star": (
        "A 6-pointed star sparkle, ~28 px tip-to-tip, centred. Six thin "
        "cyan triangular rays at evenly-spaced angles, bright cyan core "
        "dot at the centre, white-cyan specular pixel on top. Charcoal "
        "outline on each ray. Reads as a small celestial qi star. " + S
    ),
    "qi_spark_burst": (
        "A radial qi burst, ~30 px diameter, centred. A bright white-cyan "
        "dot at the centre with 8 short cyan radial spikes shooting "
        "outward (4 cardinal + 4 diagonal). Spikes are short and stubby, "
        "3-5 px long. Reads as an impact burst of qi. " + S
    ),

    # ── C. Motion particles ──────────────────────────────────────────────────
    "qi_wisp_horizontal": (
        "An elongated horizontal qi wisp/streak, ~36 px wide × 8 px tall, "
        "centred. A bright cyan head on the right tapering into a thinner "
        "translucent sapphire tail trailing to the left, ending in a soft "
        "halo wisp. Reads as a qi mote zipping rightward, motion-blurred. " + S
    ),
    "qi_wisp_diagonal": (
        "A diagonal qi wisp/streak running from bottom-left to top-right, "
        "~34 px long. A bright cyan head at the top-right end tapers into "
        "a thinner translucent sapphire tail down to the bottom-left, "
        "ending in a faint halo puff. Reads as a qi mote ascending. " + S
    ),
    "qi_droplet_falling": (
        "A single translucent blue teardrop pointing DOWNWARD, ~14 px wide "
        "× 22 px tall, centred. Rounded bulb at the bottom, narrow tip at "
        "the top. Pearl material: white-cyan specular highlight on the "
        "upper-left of the bulb, deep-blue shadow on the lower-right, "
        "1 px cyan halo. Reads as a qi droplet falling. " + S
    ),
    "qi_droplet_rising": (
        "A single translucent blue teardrop pointing UPWARD, ~14 px wide "
        "× 22 px tall, centred. Rounded bulb at the top, narrow tip at "
        "the bottom. Pearl material: white-cyan specular highlight on the "
        "upper-left of the bulb, deep-blue shadow on the lower-right, "
        "1 px cyan halo. Reads as a qi droplet rising. " + S
    ),

    # ── D. Special shapes ────────────────────────────────────────────────────
    "qi_ring": (
        "A thin hollow translucent blue qi ring/torus, ~28 px outer "
        "diameter × 4 px ring-thickness, centred. Crisp circular ring of "
        "translucent sapphire with a brighter cyan top-inside highlight "
        "and a deep-blue bottom-outside shadow. Centre of the ring is "
        "fully transparent. 1 px cyan halo on the outside. Reads as a "
        "qi pulse-ring expanding. " + S
    ),
    "qi_swirl": (
        "A small qi swirl/comma — a curving translucent cyan brush stroke "
        "~26 px tall shaped like a comma or fiddle-head. Thick bright "
        "cyan head at the top curling down and tapering to a thin "
        "translucent tail at the bottom. Charcoal outline along the "
        "stroke. Reads as a coiled qi tendril. " + S
    ),
    "qi_crescent": (
        "A thin curved translucent blue qi crescent/sliver, ~28 px wide × "
        "10 px tall, centred. Open side of the crescent faces UP. Bright "
        "cyan highlight along the top inner edge, deep-blue shadow along "
        "the bottom outer edge, 1 px cyan halo. Reads as a sliver of qi "
        "essence or a bowed wisp. " + S
    ),
    "qi_shard": (
        "A small angular translucent blue crystalline qi shard, ~16 px "
        "wide × 22 px tall, centred. A 4- or 5-sided gem fragment with "
        "flat facets — bright white-cyan top facet, mid-blue side facets, "
        "deep-blue bottom facet. Crisp charcoal outline along every "
        "facet edge, faint cyan halo. Reads as a tiny chip of crystallised "
        "qi. " + S
    ),
}

assert len(PARTICLES) == 16, f"Expected 16 particles, got {len(PARTICLES)}"

# ─────────────────────────────────────────────────────────────────────────────
# Pipeline
# ─────────────────────────────────────────────────────────────────────────────

def crop_transparent_edges(img):
    """Trim fully-transparent border rows/columns from a RGBA image."""
    w, h = img.size
    px = img.load()
    def col(x): return any(px[x, y][3] > 10 for y in range(h))
    def row(y): return any(px[x, y][3] > 10 for x in range(w))
    left  = next((x for x in range(w)           if col(x)), 0)
    right = next((x for x in range(w-1, -1, -1) if col(x)), w - 1)
    top   = next((y for y in range(h)           if row(y)), 0)
    bot   = next((y for y in range(h-1, -1, -1) if row(y)), h - 1)
    return img.crop((left, top, right + 1, bot + 1))


def run_generate(pid):
    if pid not in PARTICLES:
        raise ValueError(f"Unknown particle '{pid}'. Known: {list(PARTICLES)}")

    desc = PARTICLES[pid]
    w, h = SIZE
    print(f"\n{'='*60}\n  Generating: {pid}  ({w}x{h})\n{'='*60}")

    body = {
        "description":   desc,
        "image_size":    {"width": w, "height": h},
        "no_background": True,
    }

    if STYLE_REF.exists():
        ref_b64   = base64.b64encode(STYLE_REF.read_bytes()).decode()
        ref_img   = {"type": "base64", "base64": ref_b64, "format": "png"}
        rw, rh    = Image.open(STYLE_REF).size
        body["style_image"] = {"image": ref_img, "size": {"width": rw, "height": rh}}
        print(f"  Style ref:  {STYLE_REF.name}")

    status, r = api_post("/generate-image-v2", body)
    if status != 202:
        raise RuntimeError(f"generate-image-v2 returned {status}: {r}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError("No images returned")

    for i, img in enumerate(images):
        path = TMP_DIR / f"{pid}_cand_{i}.png"
        save_image(img, path)
        print(f"    cand_{i}: {path.name}  ({img['width']}x{img['height']})")

    print(f"\n  Saved to: {TMP_DIR}")
    print(f"  Review, then run: python gen_qi_particles.py finalize {pid} <cand_number>")


def run_finalize(pid, cand_n):
    if pid not in PARTICLES:
        raise ValueError(f"Unknown particle '{pid}'. Known: {list(PARTICLES)}")
    src = TMP_DIR / f"{pid}_cand_{cand_n}.png"
    if not src.exists():
        raise FileNotFoundError(f"Candidate not found: {src}")
    img = Image.open(src).convert("RGBA")
    img = crop_transparent_edges(img)
    out_path = OUT_DIR / f"{pid}.png"
    img.save(str(out_path))
    print(f"  Saved {img.size[0]}x{img.size[1]} RGBA → {out_path}")


def run_generate_all():
    """Fire generate for all 16 particles sequentially. ~10-20 min total."""
    ids = list(PARTICLES)
    print(f"\n  Batch generating all {len(ids)} particles. This will take a while.\n")
    for i, pid in enumerate(ids, 1):
        print(f"\n[{i}/{len(ids)}] {pid}")
        try:
            run_generate(pid)
        except Exception as e:
            print(f"  !! Failed: {e}")
    print(f"\n  Batch done. Review candidates in {TMP_DIR} then finalize each.")


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "generate":
        run_generate(sys.argv[2])
    elif len(sys.argv) == 4 and sys.argv[1] == "finalize":
        run_finalize(sys.argv[2], sys.argv[3])
    elif len(sys.argv) == 2 and sys.argv[1] == "generate-all":
        run_generate_all()
    else:
        print("Usage:")
        print(f"  python {sys.argv[0]} generate <particle_id>")
        print(f"  python {sys.argv[0]} finalize <particle_id> <cand_number>")
        print(f"  python {sys.argv[0]} generate-all")
        print(f"\nKnown particles ({len(PARTICLES)}):")
        for pid in PARTICLES:
            print(f"  {pid}")
