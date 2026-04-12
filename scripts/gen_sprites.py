"""
gen_sprites.py — Sprite generation pipeline for MartialArtsIdle enemies.

WORKFLOW (4 API calls per enemy):
  1. generate candidates:
       python gen_sprites.py generate <enemy_id>
       → calls generate-image-v2 once, saves 4 candidate PNGs to TMP_DIR
       → review candidates, pick the best one

  2. animate from chosen candidate:
       python gen_sprites.py animate <enemy_id> <cand_number>
       → calls generate-image-v2 three more times (idle / attack / hit)
       → each call receives a rich 4-frame sequence description PLUS:
           reference_images: the chosen candidate  (locks character appearance)
           style_image:      the chosen candidate  (locks art style and palette)
       → applies fading red tint to hit frames via PIL (0.75 → 0.50 → 0.25 → 0.00)
       → fits every frame to 128×128 without cropping (trim + resize + pad South)
       → flips all frames horizontally so the character faces left in-game
       → stitches 4 frames into a 512×128 spritesheet

OUTPUT:
  public/sprites/enemies/<enemy_id>-idle.png    (512×128, 4 frames)
  public/sprites/enemies/<enemy_id>-attack.png  (512×128, 4 frames)
  public/sprites/enemies/<enemy_id>-hit.png     (512×128, 4 frames)

ADDING A NEW ENEMY:
  Add an entry to ENEMIES with four keys:
    gen_desc    — single descriptive string for candidate generation.
                  Describe appearance, silhouette, distinctive features, art style.
    idle_desc   — 4-frame idle sequence description (see existing entries for format).
                  Each frame must describe a distinct pose in the breathing/sway cycle.
    attack_desc — 4-frame attack sequence: wind-up → mid → full extension → recovery.
                  Be explicit about body position, limb placement, and qi/energy effects.
    hit_desc    — 4-frame hit reaction: impact → stagger → recovery → return to neutral.
                  Do NOT describe the red tint here — that is applied by PIL automatically.

  Then run:
    python gen_sprites.py generate <enemy_id>
    python gen_sprites.py animate  <enemy_id> <cand_number>

  Finally set sprite: '<enemy_id>' in src/data/enemies.js.

DEPENDENCIES:
  pip install Pillow
  ImageMagick installed at MAGICK path below
"""

import json, base64, subprocess, time, sys
from pathlib import Path
import urllib.request, urllib.error
from PIL import Image

# Force UTF-8 output on Windows (cp1252 default chokes on → and em-dashes)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

API_KEY  = "886d28c4-fb31-429d-832e-1242e312160e"
BASE_URL = "https://api.pixellab.ai/v2"
MAGICK   = "C:/Program Files/ImageMagick-7.1.2-Q16-HDRI/magick.exe"
OUT_DIR  = Path(__file__).parent.parent / "public/sprites/enemies"
TMP_DIR  = Path(__file__).parent.parent / "tmp/sprite_gen"
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

# ─────────────────────────────────────────────────────────────────────────────
# Image helpers
# ─────────────────────────────────────────────────────────────────────────────

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

def magick(*args):
    subprocess.run([MAGICK, *[str(a) for a in args]], check=True)

def flip(src, dst):
    """Horizontal flip so sprite faces left in-game."""
    magick(src, "-flop", dst)

def stitch(frames, out):
    """Append frames side-by-side into a single spritesheet."""
    magick(*frames, "+append", out)

def fit_to_canvas(src_path, dst_path, size=128):
    """
    Trim transparent edges, shrink to fit if over size×size (never upscale),
    then pad back to exactly size×size anchored at the bottom edge so feet
    stay grounded consistently across all animation frames.
    """
    magick(
        src_path,
        "-trim", "+repage",
        "-resize", f"{size}x{size}>",
        "-background", "transparent",
        "-gravity", "South",
        "-extent", f"{size}x{size}",
        dst_path,
    )

def apply_red_tint(src_path, dst_path, strength):
    """
    Damage flash: boost red, suppress green and blue.
    strength=0.75 → near-solid red; strength=0.0 → original colours.
    """
    img = Image.open(src_path).convert("RGBA")
    r, g, b, a = img.split()
    r = r.point(lambda x: min(255, int(x + (255 - x) * strength)))
    g = g.point(lambda x: max(0,   int(x * (1 - strength * 0.65))))
    b = b.point(lambda x: max(0,   int(x * (1 - strength * 0.65))))
    Image.merge("RGBA", (r, g, b, a)).save(str(dst_path))

# ─────────────────────────────────────────────────────────────────────────────
# Core pipeline steps
# ─────────────────────────────────────────────────────────────────────────────

def generate_candidates(enemy_id, description, frame_size=128):
    """
    Step 1 — one async call, returns 4 candidate images.
    No reference or style image here: let the model interpret the description freely.
    """
    print(f"  [1] Generating candidates for {enemy_id}...")
    status, r = api_post("/generate-image-v2", {
        "description":   description,
        "image_size":    {"width": frame_size, "height": frame_size},
        "no_background": True,
    })
    if status != 202:
        raise RuntimeError(f"generate-image-v2 returned {status}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError("No images returned from generate-image-v2")

    candidates = []
    for i, img in enumerate(images):
        path = TMP_DIR / f"{enemy_id}_cand_{i}.png"
        save_image(img, path)
        candidates.append(path)
        print(f"    cand_{i}: {path.name}  ({img['width']}x{img['height']})")
    return candidates


def generate_frames(enemy_id, anim_name, description, reference_path,
                    frame_size=128, tint_strengths=None):
    """
    Step 2 — one async call per animation (idle / attack / hit).

    description    : Full 4-frame sequence description. Be explicit about each
                     frame's pose, body position, energy effects, and expression.
    reference_path : The chosen candidate PNG.
                     Passed as reference_images → locks character appearance.
                     Passed as style_image      → locks art style and palette.
    tint_strengths : Optional list of 4 floats for hit damage tint fade,
                     e.g. [0.75, 0.50, 0.25, 0.0]. None = no tint applied.

    Returns list of 4 final frame paths (flipped, canvas-fitted, tinted if needed).
    """
    print(f"  [2] Generating '{anim_name}' ({frame_size}x{frame_size})...")
    ref_b64 = base64.b64encode(reference_path.read_bytes()).decode()
    ref_img = {"type": "base64", "base64": ref_b64, "format": "png"}
    ref_sized = {"image": ref_img, "size": {"width": frame_size, "height": frame_size}}

    status, r = api_post("/generate-image-v2", {
        "description":      description,
        "image_size":       {"width": frame_size, "height": frame_size},
        "no_background":    True,
        "reference_images": [ref_sized],   # locks character appearance
        "style_image":      ref_sized,     # locks art style and palette
    })
    if status != 202:
        raise RuntimeError(f"generate-image-v2 returned {status}: {r}")

    result = poll_job(r["background_job_id"])
    images = result.get("last_response", {}).get("images", [])
    if not images:
        raise RuntimeError(f"No images returned for '{anim_name}'")

    ready = []
    for i, img in enumerate(images[:4]):
        raw    = TMP_DIR / f"{enemy_id}_{anim_name}_{i}_raw.png"
        fitted = TMP_DIR / f"{enemy_id}_{anim_name}_{i}_fitted.png"
        done   = TMP_DIR / f"{enemy_id}_{anim_name}_{i}_final.png"

        save_image(img, raw)
        fit_to_canvas(raw, fitted, size=frame_size)

        strength = tint_strengths[i] if tint_strengths else 0.0
        if strength > 0:
            tinted = TMP_DIR / f"{enemy_id}_{anim_name}_{i}_tinted.png"
            apply_red_tint(fitted, tinted, strength)
            flip(tinted, done)
        else:
            flip(fitted, done)

        ready.append(done)
        print(f"    Frame {i}: {done.name}")

    return ready


def _reanimate(enemy_id, base):
    cfg = ENEMIES[enemy_id]

    idle_frames = generate_frames(enemy_id, "idle",   cfg["idle_desc"],   base)
    stitch(idle_frames, OUT_DIR / f"{enemy_id}-idle.png")
    print(f"  Idle sheet -> {enemy_id}-idle.png")

    atk_frames  = generate_frames(enemy_id, "attack", cfg["attack_desc"], base)
    stitch(atk_frames,  OUT_DIR / f"{enemy_id}-attack.png")
    print(f"  Attack sheet -> {enemy_id}-attack.png")

    # Hit: fading red tint — 0.75 (hard flash) -> 0.50 -> 0.25 -> 0.00 (clean)
    hit_frames  = generate_frames(enemy_id, "hit",    cfg["hit_desc"],    base,
                                  tint_strengths=[0.75, 0.50, 0.25, 0.0])
    stitch(hit_frames,  OUT_DIR / f"{enemy_id}-hit.png")
    print(f"  Hit sheet -> {enemy_id}-hit.png")

    print(f"\n  Done. Sprites in: {OUT_DIR}")


def _reanimate_attack(enemy_id, base):
    """Regenerate only the attack sheet, leaving idle and hit untouched."""
    cfg = ENEMIES[enemy_id]
    atk_frames = generate_frames(enemy_id, "attack", cfg["attack_desc"], base)
    stitch(atk_frames, OUT_DIR / f"{enemy_id}-attack.png")
    print(f"  Attack sheet -> {enemy_id}-attack.png")
    print(f"\n  Done. Sprites in: {OUT_DIR}")


def _reanimate_hit(enemy_id, base):
    """Regenerate only the hit sheet, leaving idle and attack untouched."""
    cfg = ENEMIES[enemy_id]
    hit_frames = generate_frames(enemy_id, "hit", cfg["hit_desc"], base,
                                 tint_strengths=[0.75, 0.50, 0.25, 0.0])
    stitch(hit_frames, OUT_DIR / f"{enemy_id}-hit.png")
    print(f"  Hit sheet -> {enemy_id}-hit.png")
    print(f"\n  Done. Sprites in: {OUT_DIR}")


def _reanimate_idle(enemy_id, base):
    """Regenerate only the idle sheet, leaving attack and hit untouched."""
    cfg = ENEMIES[enemy_id]
    idle_frames = generate_frames(enemy_id, "idle", cfg["idle_desc"], base)
    stitch(idle_frames, OUT_DIR / f"{enemy_id}-idle.png")
    print(f"  Idle sheet -> {enemy_id}-idle.png")
    print(f"\n  Done. Sprites in: {OUT_DIR}")

# ─────────────────────────────────────────────────────────────────────────────
# Enemy definitions
# ─────────────────────────────────────────────────────────────────────────────
#
# STYLE ANCHOR used in every description — keeps all enemies visually coherent.
# Insert at the end of gen_desc and at the end of each animation desc.
#
S = (
    "Xianxia cultivation fantasy pixel art game sprite. "
    "Transparent background. Clean linework, limited palette, 16-bit style. "
    "Side view facing right. Full body visible."
)

ENEMIES = {

    # ── World 1 — The Mortal Lands ────────────────────────────────────────────

    "outer_sect_disciple": {
        "gen_desc": (
            "Young male martial artist in plain grey-white training gi with a red sect sash "
            "tied at the waist, short dark hair, lean athletic build, relaxed guard stance "
            "with both fists slightly raised, bare feet planted firmly. No qi glow — this is "
            f"a beginner fighter at the lowest rung of cultivation. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a young male martial artist in grey-white gi with red "
            "sect sash, short dark hair, lean athletic build, no qi aura. "
            "Frame 1: relaxed guard stance, fists at chest height, weight centered, steady gaze. "
            "Frame 2: slight inhale, chest rising, weight shifting forward onto the front foot, "
            "fists tightening, chin dropping into a more focused posture. "
            "Frame 3: exhale, body settling slightly lower, knees bending a touch more, arms "
            "dropping fractionally, a subtle readjustment of balance. "
            "Frame 4: back to relaxed guard, breath normalised, eyes scanning, fists reset. "
            f"Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a young male martial artist in grey-white gi with red "
            "sect sash throwing a right straight punch. "
            "Frame 1: wind-up — leaning back onto the rear foot, right arm drawn all the way "
            "back with elbow bent, left arm extended forward for balance, knees bent and coiled. "
            "Frame 2: launch — explosive forward drive, whole body lurching forward, right fist "
            "mid-swing at chest height, left arm pulling back in opposition, mouth open in kiai. "
            "Frame 3: full extension — right arm completely extended in a textbook straight "
            "punch, body fully twisted into the strike, front foot stepping through, left fist "
            "chambered at the hip. "
            "Frame 4: recovery — right arm retracting, body straightening back toward guard "
            f"stance, weight re-centering. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a young male martial artist in grey-white gi with red "
            "sect sash struck by an attack. "
            "Frame 1: full impact — head snapping back sharply, whole body thrown backward, "
            "arms flying wide open, feet barely on the ground, face showing sharp pain. "
            "Frame 2: stagger — body still displaced backward, knees buckling, arms flailing "
            "to find balance, mouth open, expression twisted in pain. "
            "Frame 3: mid-recovery — spine straightening, feet replanting, arms coming back "
            "toward the body, expression hardening from pain into determination. "
            "Frame 4: recovered — back in guard stance, slightly off-balance but composed, "
            f"eyes back on the enemy. {S}"
        ),
    },

    "training_golem": {
        "gen_desc": (
            "A simple sect training construct assembled from bound wooden sticks and branches — "
            "a rough humanoid scarecrow-like figure, upright and slender, with a bundle of sticks "
            "for a torso tied together with coarse rope, two thin stick arms extending outward, "
            "two stick legs planted in the ground, and a small round bundle of sticks for a head "
            "with a single glowing yellow sect qi paper talisman pinned to the chest that animates "
            "it. Thin, awkward, and clearly improvised — just sticks and rope and one talisman. "
            "Charming and non-threatening. Standing upright in a wide wobbly ready stance. "
            f"No face, no weapons. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a stick-bundle training construct — thin stick-and-rope "
            "humanoid body, two twig arms, stick legs, small round stick-bundle head, single "
            "glowing yellow talisman on the chest. All 4 frames are nearly identical — "
            "the construct stands still with only a faint talisman glow pulse. "
            "Frame 1: base stance — upright and slightly lopsided, twig arms loosely spread, "
            "talisman glowing softly yellow at baseline. "
            "Frame 2: talisman brightening 1-2px on a slow qi pulse, nothing else moving. "
            "Frame 3: talisman returning to baseline glow, total stillness. "
            "Frame 4: identical to frame 1, the slow talisman pulse cycling, patiently waiting. "
            f"Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a stick training construct swinging a twig arm in a "
            "wide slow sweep. Thin stick-and-rope body, twig arms, glowing yellow talisman on chest. "
            "Frame 1: wind-up — right twig arm raised high and pulled back, talisman blazing "
            "bright yellow as it channels qi into the arm, the stick body leaning back, "
            "left twig arm extended for wobbly balance. "
            "Frame 2: arm swinging down and forward — twig arm arcing in a wide sweep, a streak "
            "of yellow qi energy trailing behind the stick arm, the whole construct lurching "
            "forward with awkward enthusiasm. "
            "Frame 3: full sweep extension — twig arm at the lowest point of its arc fully "
            "extended, a burst of yellow talisman qi exploding from the tip of the strike, "
            "stick legs bent and planted, the construct committed to the hit. "
            "Frame 4: arm swinging back to rest, yellow qi fading, talisman dimming to baseline, "
            f"the construct wobbling back upright with mechanical simplicity. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a stick training construct struck by an attack. "
            "Thin stick-and-rope body, twig arms, glowing yellow talisman on chest. "
            "Frame 1: full impact — the lightweight stick body thrown wildly backward, twig arms "
            "flying outward, rope bindings snapping taut, talisman flickering, a loose stick "
            "flying off from the force. "
            "Frame 2: stagger — construct bent far backward, twig arms akimbo, stick legs barely "
            "keeping contact with the ground, talisman still flickering. "
            "Frame 3: snapping back — the talisman's qi pulling the construct back upright, "
            "loose bindings tightening, arms swinging back in. "
            "Frame 4: reset — back to the wide wobbly stance, talisman glowing steady, slightly "
            f"more dishevelled than before but still standing. {S}"
        ),
    },

    "wolf": {
        "gen_desc": (
            "Fierce large grey-furred pack wolf, lean muscular body, bright amber glowing eyes, "
            "dark grey fur with a slightly lighter underbelly, oversized claws, faint pale blue "
            "qi energy wisps curling around its paws and muzzle, alert predatory stance with "
            "weight carried low and head pushed forward, bared fangs, thick powerful neck and "
            f"strong haunches. Full body from snout to tail tip. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a fierce grey pack wolf with amber glowing eyes, pale "
            "blue qi wisps at paws and muzzle, lean muscular body, bared fangs, oversized claws. "
            "Frame 1: alert guard stance — weight low and centered, head level, ears pricked "
            "fully forward, tail slightly raised, pale blue qi wisps drifting slowly from paws. "
            "Frame 2: scenting — wolf leaning subtly forward, nose extended to scent the air, "
            "weight shifting onto front paws, jaw slightly open revealing fangs, qi wisps "
            "curling up at the muzzle. "
            "Frame 3: settling — wolf easing back onto its haunches slightly, head tilting a "
            "fraction, tail sweeping slowly, muscles relaxed but loaded, qi wisps fading and "
            "reforming around the paws. "
            "Frame 4: reset — back to alert centered stance, ears pricked, amber eyes scanning, "
            f"qi wisps stabilising. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a fierce grey pack wolf lunging at an enemy to its left. "
            "Amber glowing eyes, pale blue qi energy, lean muscular body, oversized claws. "
            "Frame 1: coiled wind-up — haunches raised high, spine curved into a deep low arc, "
            "head pulled back with ears flat against the skull, eyes locked forward, claws "
            "digging visibly into the ground, pale blue qi energy building at the paws. "
            "Frame 2: explosive mid-lunge — body nearly horizontal, front legs fully extended "
            "forward, jaws wide open baring all fangs, pale blue qi trailing behind the body "
            "in a streaming wake. "
            "Frame 3: peak extension — entire body airborne and horizontal, head and neck "
            "thrust as far forward as possible, jaws snapping shut with force, all four legs "
            "fully extended, pale blue qi bursting outward at the point of impact. "
            "Frame 4: landing — front paws hitting the ground hard, hindquarters still raised, "
            f"head pulling back toward guard, body absorbing the landing. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a fierce grey pack wolf struck by a heavy attack. "
            "Amber glowing eyes, lean muscular grey body, pale blue qi. "
            "Frame 1: full impact — entire body thrown backward and off-balance, head snapping "
            "sharply back, legs scrambling and lifting off the ground, fur rippling from the "
            "force, mouth open. "
            "Frame 2: stagger — body still displaced, legs splayed and unsteady, jaw hanging "
            "open in pain, fur still ruffled. "
            "Frame 3: recovery — spine straightening, legs planting back into the ground, head "
            "lowering back to level, shaken but regaining composure. "
            "Frame 4: reset — back to alert low guard stance, amber eyes scanning, pale blue "
            f"qi reforming at paws. {S}"
        ),
    },

    "bandit_scout": {
        "gen_desc": (
            "A lean wiry male bandit scout in a patchwork of dark leather armour and rough "
            "brown cloth wrappings, a dirty bandana covering the lower face, short tangled "
            "hair, quick darting eyes, a short curved blade at the hip, lightly equipped for "
            "speed, crouched in a nimble ready stance. Worn practical gear, no qi aura — "
            f"a mortal opportunist. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a lean male bandit scout in patched dark leather and "
            "brown cloth, face bandana, short curved blade at hip, crouched ready stance. "
            "Frame 1: low crouched stance, weight on both feet, hand resting on the blade "
            "hilt, eyes darting left, suspicious and alert. "
            "Frame 2: shifting weight forward onto the front foot, head turning to scan right, "
            "free hand lifting slightly, ready to react. "
            "Frame 3: weight settling back, shoulders dropping a fraction, a moment of "
            "stillness — but the hand stays on the hilt, always ready. "
            "Frame 4: back to neutral crouched stance, eyes forward, balanced and watchful. "
            f"Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a lean bandit scout unleashing a vicious lightning-fast "
            "knife slash. Dark patched leather, face bandana, short curved blade. "
            "Frame 1: extreme wind-up — body wrenched hard back onto the rear foot, blade arm "
            "pulled all the way behind the shoulder, spine coiled like a spring, free hand "
            "raised open, entire body compressed and loaded, crouched low with knees deeply bent, "
            "eyes locked forward with predatory intensity. "
            "Frame 2: explosive release — body rocketing forward in a full lunge, blade arm "
            "blurring into motion with a sharp speed-line streak trailing behind the blade edge, "
            "bandana blown hard backward from the sudden acceleration, a visible slash arc of "
            "gleaming white light beginning at the low hip and cutting upward diagonally, "
            "dust exploding from the planted foot. "
            "Frame 3: peak slash impact — blade at full extension across the body completing "
            "the diagonal cut, a bright sharp slash-line flash of white-gold light cutting "
            "the air at the blade tip, motion blur streaking the entire blade arm, body fully "
            "twisted into the strike with front leg driving forward, free arm wrenched back, "
            "bandana still whipping behind — this frame radiates danger and speed. "
            "Frame 4: recovery — blade retracting fast, slash-line fading to a faint glint, "
            "body snapping back toward crouched guard, weight redistributing, eyes still cold "
            f"and locked on the target. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a lean bandit scout struck while in a crouched stance. "
            "Dark patched leather, face bandana, short curved blade. "
            "Frame 1: full impact — body snapping backward, bandana flapping, blade arm "
            "flying outward, one foot leaving the ground, sharp recoil. "
            "Frame 2: stagger — body tilted back and off-balance, legs scrambling to catch, "
            "blade dangling, free arm windmilling for balance. "
            "Frame 3: catching balance — foot replanting, spine pulling upright, blade arm "
            "coming back in, face showing pain behind the bandana. "
            "Frame 4: reset — back to crouched ready stance, blade hand returning to hilt, "
            f"eyes narrowed, still dangerous. {S}"
        ),
    },

    "wandering_beast": {
        "gen_desc": (
            "A large heavily-built quadruped beast resembling a great scarred boar crossed "
            "with a bear — broad chest, thick stumpy legs, coarse dark brown fur with patches "
            "of grey, small fierce red eyes, two blunt curved tusks, a heavy hunched back, "
            "and a short thick tail. Muscular and brutish, no qi glow, a wild mortal-realm "
            f"creature. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a large scarred quadruped beast — thick dark brown fur, "
            "broad chest, heavy hunched back, two blunt tusks, small red eyes. "
            "Frame 1: standing four-square, head lowered, tusks pointed forward, eyes scanning "
            "left with a dull hostility, tail flicking once. "
            "Frame 2: shifting weight forward, snout dipping toward the ground as if sniffing, "
            "shoulders rolling, one front hoof scraping the ground. "
            "Frame 3: head lifting back up, shoulders settling, a slow exhale visible — nostrils "
            "flaring, a moment of stillness. "
            "Frame 4: back to four-square stance, head lowered, eyes forward, tail flicking. "
            f"Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a large scarred beast executing a devastating full-power "
            "charge-gore. Thick dark brown fur, broad chest, heavy hunched back, two blunt tusks. "
            "Frame 1: extreme coil — entire massive body rocked back hard onto the haunches, "
            "head dropped low with tusks angled down and back ready to drive forward, "
            "front legs lifting slightly off the ground, back legs coiled like springs under the "
            "full weight of the beast, muscles visibly bulging, small red eyes blazing. "
            "Frame 2: eruption — beast launching forward with terrifying force, body nearly "
            "horizontal in mid-charge, all four legs driving hard, a thick cloud of dirt and "
            "debris exploding from the ground under the hooves, speed lines streaking along "
            "the flanks and back, tusks aimed directly forward like battering rams. "
            "Frame 3: full gore impact — tusks hitting their target at maximum extension, "
            "a massive shockwave burst of dust and impact energy exploding outward from the "
            "tusk tips, ground cracking under the planted hooves, the beast's entire enormous "
            "mass fully committed to the strike, spine locked straight, head driven down, "
            "debris and dirt flying outward — an overwhelming wall of brute force. "
            "Frame 4: recoil — head lifting hard, body decelerating, hooves grinding into the "
            "ground, dust cloud settling around the beast, nostrils flaring, still dangerous, "
            f"small red eyes scanning. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a large scarred beast absorbing a blow. "
            "Thick dark brown fur, broad chest, heavy hunched back, two blunt tusks. "
            "Frame 1: impact — heavy body shuddering from the hit, head snapping sideways, "
            "one front leg lifting off the ground, thick fur rippling. "
            "Frame 2: stagger — body rocking to the side, legs splaying to catch balance, "
            "tusks tilting, a deep grunt visible in the body language. "
            "Frame 3: planting — legs re-planting wide and hard, body steadying, head coming "
            "back level, the beast absorbing the punishment. "
            "Frame 4: reset — four-square again, head low, small red eyes blazing, "
            f"undeterred. {S}"
        ),
    },

    "qi_beast": {
        "gen_desc": (
            "A large panther-like beast with sleek dark purple-black fur that shimmers with "
            "embedded qi energy, visible lines of pale violet qi crackling along its spine "
            "and limbs like lightning veins, bright violet glowing eyes, oversized retractable "
            "claws that crackle with qi, a long whip-like tail with a glowing violet tip, "
            "lean and coiled, hyper-alert posture. A beast that has naturally absorbed "
            f"ambient qi and mutated toward something dangerous. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a sleek panther-like qi beast with dark purple-black "
            "shimmering fur, violet qi veins along its spine, glowing violet eyes, qi-crackling "
            "claws, a long tail with a glowing violet tip. "
            "Frame 1: low coiled stance, head level and forward, violet eyes burning, tail "
            "extended back, qi veins pulsing softly along the spine. "
            "Frame 2: weight shifting slightly forward, head dipping, violet eyes narrowing, "
            "qi veins brightening on the shoulders and front legs, claws briefly unsheathing. "
            "Frame 3: weight settling back, tail curling upward and tip glowing brighter, "
            "a quiet pulse of violet qi radiating outward from the body. "
            "Frame 4: back to coiled stance, qi veins dimming to their baseline glow, eyes "
            f"forward. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a sleek qi panther-beast lunging with qi-charged claws. "
            "Dark purple-black shimmering fur, violet qi veins, glowing eyes, crackling claws. "
            "Frame 1: coiled wind-up — haunches raised, body pressed low, head pulled back, "
            "violet qi surging visibly down the front legs into the claws, eyes blazing. "
            "Frame 2: explosive lunge — body fully horizontal, front legs extended with claws "
            "spread wide and crackling with violet qi, tail streaming back, eyes locked. "
            "Frame 3: strike — claws slashing through the air at full extension, a burst of "
            "violet qi energy exploding outward from the impact point, body twisted into it. "
            "Frame 4: landing — front paws hitting the ground, qi dissipating from claws, "
            f"body coiling back toward guard, violet eyes still burning. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a sleek qi panther-beast struck by a heavy blow. "
            "Dark purple-black fur, violet qi veins, glowing eyes, long glowing-tip tail. "
            "Frame 1: full impact — body thrown backward, violet qi veins flickering and "
            "sparking erratically from the disruption, tail whipping, claws splaying. "
            "Frame 2: stagger — body off-balance, qi veins dimmed and unstable, legs "
            "scrambling, head thrown back. "
            "Frame 3: recovery — legs replanting, qi veins steadying and beginning to "
            "recharge, head lowering back to level, tail resettling. "
            "Frame 4: reset — coiled low stance, qi veins burning at full intensity again, "
            f"violet eyes blazing with fury. {S}"
        ),
    },

    "rogue_disciple": {
        "gen_desc": (
            "A male martial artist in a torn and stained grey training gi, the red sect sash "
            "slashed and hanging loose, dark hair wild and dishevelled, eyes hollow and "
            "slightly maddened with a faint red tinge of qi deviation, a dark bruise across "
            "one cheek, fists wrapped in dirty cloth strips, lean and dangerous, stance "
            "aggressive and unbalanced — a cultivator who has lost the path and fights with "
            f"reckless desperation. No clean qi aura — corrupt dark qi flickers at the fists. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a rogue male martial artist in torn grey gi, loose "
            "slashed red sash, wild dark hair, hollow reddish eyes, dirty cloth-wrapped fists, "
            "faint dark qi flickering at the knuckles. All 4 frames are nearly identical — "
            "the character holds their aggressive forward-leaning stance throughout with "
            "only micro breathing variations. "
            "Frame 1: base stance — fists raised unevenly, hollow eyes forward, dark qi "
            "flickering softly at the knuckles, body still. "
            "Frame 2: chest rising 1-2px on a slow inhale, dark qi wisps barely brightening, "
            "everything else unchanged. "
            "Frame 3: chest settling back down on exhale, qi dimming to its base flicker, "
            "pose unchanged. "
            "Frame 4: identical to frame 1, breathing cycle complete, body utterly still "
            f"except the faint qi pulse at the knuckles. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a rogue martial artist throwing a wild powerful "
            "haymaker punch with dark qi. Torn grey gi, wild hair, hollow reddish eyes. "
            "Frame 1: winding up with full body rotation — weight way back on the rear foot, "
            "right arm swung far behind, dark qi surging up the arm, over-committed and reckless. "
            "Frame 2: full swing in motion — entire body rotating, arm mid-arc at shoulder "
            "height, dark qi trailing the fist like smoke, head forward, teeth bared. "
            "Frame 3: peak of the haymaker — fist at full extension in a wide arc, dark qi "
            "exploding off the knuckles in a burst, body over-rotated and exposed. "
            "Frame 4: stumbling recovery — body lurching past the strike from the over-rotation, "
            f"fist retracting, staggering back into the aggressive stance. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a rogue martial artist struck while attacking. "
            "Torn grey gi, wild dark hair, hollow reddish eyes, dirty wrapped fists. "
            "Frame 1: full impact — body snapping backward violently, torn gi flapping, "
            "loose sash flying out, head snapping back, dark qi dispersing in a ragged burst. "
            "Frame 2: stagger — body rolling sideways, completely off-balance, dark qi "
            "flickering weakly, a moment of real pain cutting through the madness. "
            "Frame 3: dragging back upright — spine pulling up, fists raising again, the "
            "hollow eyes refocusing with that reckless intensity. "
            "Frame 4: reset to the aggressive unbalanced forward stance, dark qi rekindling "
            f"at the fists, undeterred and more dangerous for having been hit. {S}"
        ),
    },

    "forest_spirit": {
        "gen_desc": (
            "An ethereal nature spirit manifested as a translucent humanoid figure woven from "
            "living vines, leaves, and pale green qi light — no solid body, more like a shape "
            "suggested by swirling foliage and glowing green energy. A roughly humanoid "
            "outline, arms formed from thick vines, a head of swirling leaves with two bright "
            "green glowing eyes, the lower body trailing into wisps of pale green qi and roots. "
            f"Glowing, otherworldly, beautiful and dangerous. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a forest spirit — translucent humanoid of living vines "
            "and leaves, pale green glowing qi energy forming its shape, two bright green eyes, "
            "vine arms, lower body trailing into glowing green wisps. All 4 frames are nearly "
            "identical — the spirit floats in place with only micro pulse variations. "
            "Frame 1: base hover — upright, vine arms loosely at sides, green qi wisps drifting "
            "slowly upward, bright eyes glowing steady. "
            "Frame 2: qi glow brightening 1-2px worth on a slow energy pulse, leaves very "
            "slightly rustling, everything else unchanged. "
            "Frame 3: qi glow dimming back to base, leaves resettling, form utterly still. "
            "Frame 4: identical to frame 1, the soft upward qi drift continuing its slow "
            f"cycle. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a forest spirit lashing with a vine arm strike. "
            "Translucent humanoid of living vines and leaves, bright green glowing eyes, "
            "pale green qi. "
            "Frame 1: wind-up — right vine arm pulling back and coiling tightly, leaves "
            "pulling in, green qi surging and concentrating along the vine. "
            "Frame 2: lash begins — vine arm uncoiling and extending forward rapidly, leaves "
            "spreading from the centrifugal force, green qi brightening along the length. "
            "Frame 3: full extension — vine arm fully lashed out at maximum reach, a burst "
            "of green qi and scattered leaves exploding from the tip of the strike. "
            "Frame 4: recoil — vine arm pulling back and recoiling into the spirit's form, "
            f"leaves resettling, green qi returning to its calm drift. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a forest spirit struck by an attack. "
            "Translucent vine-and-leaf humanoid, green glowing eyes, pale green qi form. "
            "Frame 1: impact — the entire translucent form destabilised, vines scattering "
            "outward, leaves flying, green qi flickering and breaking apart, eyes flaring. "
            "Frame 2: disruption — the humanoid shape partially losing coherence, vines "
            "tangled, form flickering between visible and nearly transparent. "
            "Frame 3: reformation — vines drawing back together, leaves resettling, "
            "the humanoid outline re-solidifying, green qi rebuilding. "
            "Frame 4: restored — back to hovering upright form, qi flowing steadily, "
            f"eyes burning brighter with anger. {S}"
        ),
    },

    "tree_demon": {
        "gen_desc": (
            "An ancient awakened tree demon — a massive hulking figure with a thick gnarled "
            "trunk-like torso, bark-covered skin with deep cracks glowing faintly orange "
            "from within, two enormous branch-like arms each ending in splayed claw-like "
            "wooden fingers, a wide grotesque face carved into the bark with two burning "
            "orange eyes, twisted root-legs, and a crown of dead twisted branches. Slow, "
            f"immense, and terrifying. No qi aura — raw awakened nature corruption. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a massive tree demon — gnarled bark-covered body, "
            "orange glow seeping through bark cracks, enormous branch arms, burning orange "
            "eyes set in a carved bark face, twisted root-legs, dead branch crown. All 4 "
            "frames are nearly identical — the demon stands motionless with only a slow "
            "inner glow pulse. "
            "Frame 1: base stance — arms hanging at sides, bark cracks glowing at steady "
            "orange, burning eyes forward, utterly still. "
            "Frame 2: orange inner glow brightening 1-2px along the crack lines on a slow "
            "pulse, nothing else moving. "
            "Frame 3: glow fading back to steady baseline, complete stillness, ominous weight. "
            "Frame 4: identical to frame 1, the slow glow cycle completing, the demon "
            f"immovable. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a tree demon slamming with an enormous branch arm. "
            "Gnarled bark body, orange glowing cracks, massive branch arms, burning eyes. "
            "Frame 1: raising the right arm — enormous branch arm lifting high above the "
            "body, bark cracks on the arm blazing orange, dead branches rattling, body "
            "leaning into the wind-up. "
            "Frame 2: the arm beginning its downward slam — massive branch arm descending "
            "in a wide arc, trailing broken bark and dead leaves, orange glow streaking. "
            "Frame 3: full slam impact — arm fully driven down to its lowest point, a "
            "shockwave of orange qi and bark fragments exploding outward from the strike. "
            "Frame 4: lifting the arm back up, bark settling, orange glow fading back to "
            f"steady, the demon straightening. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a massive tree demon absorbing a strike. "
            "Gnarled bark body, orange glowing cracks, branch arms, burning eyes in bark face. "
            "Frame 1: the hit — the enormous body shuddering from the blow, bark cracking "
            "further, orange glow flaring violently from new cracks, branches rattling. "
            "Frame 2: the shudder propagating — arms swaying from the impact, root-legs "
            "grinding sideways, orange light pouring through fresh cracks. "
            "Frame 3: the body stabilising — bark settling, orange glow dimming back, "
            "roots re-gripping the ground, the demon utterly immovable. "
            "Frame 4: back to the heavy standing pose, burning eyes blazing with cold fury, "
            f"new cracks still glowing faintly. {S}"
        ),
    },

    "sky_beast": {
        "gen_desc": (
            "A large winged beast like a massive hawk-lion hybrid — the front half a powerful "
            "tawny golden leonine body with thick forelegs and sharp claws, the rear half "
            "tapering into a muscular tail, enormous feathered wings spanning wide from its "
            "shoulders, a proud eagle-like head with a hooked beak and fierce golden eyes, "
            "feathers tipped with pale gold qi shimmer. Majestic and dangerous, a creature "
            f"of the upper air. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a hawk-lion sky beast — tawny golden leonine body, "
            "enormous feathered wings, eagle head with hooked beak, fierce golden eyes, "
            "pale gold qi shimmer on feather tips. All 4 frames are nearly identical — "
            "the beast holds its half-furled standing pose with only micro breathing shifts. "
            "Frame 1: base stance — four legs planted, wings half-furled, golden eyes "
            "forward, tail level, gold qi shimmer steady at wing edges. "
            "Frame 2: chest rising 1-2px on a slow breath, gold qi shimmer brightening "
            "a touch at the feather tips, nothing else moving. "
            "Frame 3: chest settling back down, shimmer returning to baseline, complete "
            "stillness, proud and alert. "
            "Frame 4: identical to frame 1, breathing cycle complete, golden eyes still "
            f"and fierce. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a sky beast diving and raking with its front claws. "
            "Tawny golden leonine body, enormous feathered wings, eagle head, golden eyes. "
            "Frame 1: crouch and wing-raise — body dropping low, wings spreading full and "
            "angling back, head dipping forward, golden eyes locking onto target, claws "
            "spreading on the forepaws. "
            "Frame 2: lunge with wings driving — wings snapping downward to propel the body "
            "forward, body going nearly horizontal, head thrust forward, claws leading. "
            "Frame 3: full raking strike — front claws slashing fully extended, wings at "
            "peak downstroke, pale gold qi energy bursting off the claws at impact. "
            "Frame 4: landing and pulling back — claws hitting the ground, wings folding, "
            f"body resetting from the dive into a standing guard. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a sky beast struck mid-stance. "
            "Tawny golden leonine body, enormous feathered wings, eagle head, golden eyes. "
            "Frame 1: impact — body knocked sideways, wings snapping open for balance, "
            "head jerking, golden eyes wide, feathers exploding from the hit. "
            "Frame 2: stagger — wings spread wide catching air, body tilted, tail lashing "
            "to counterbalance, a cry visible in the open beak. "
            "Frame 3: recovering — wings folding back, body levelling, claws replanting, "
            "golden eyes narrowing back to focused fury. "
            "Frame 4: reset to half-furled standing pose, tail arcing, golden eyes blazing, "
            f"pride wounded and fury kindled. {S}"
        ),
    },

    "thunder_hawk": {
        "gen_desc": (
            "A large fierce bird of prey — a hawk the size of a horse, jet-black feathers "
            "crackling with constant blue-white lightning arcing between the primary feathers, "
            "vivid electric-blue eyes, a sharp powerful hooked beak edged with visible static, "
            "talons that crackle with electricity, a fan tail with lightning-bolt markings, "
            "held in an aggressive wings-spread threat display. Fast, lethal, and storm-born. "
            f"{S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a thunder hawk — jet-black feathers crackling with "
            "blue-white lightning between the primaries, electric-blue eyes, static-edged "
            "beak, crackling talons, lightning-marked fan tail. All 4 frames are nearly "
            "identical — the hawk holds its threat display with only micro lightning pulse variations. "
            "Frame 1: base stance — wings half-spread, lightning arcing steadily between "
            "feathers at baseline, electric-blue eyes forward, completely still. "
            "Frame 2: lightning arcing brightening slightly between two primary feathers, "
            "a single small spark jumping, nothing else moving. "
            "Frame 3: lightning returning to baseline crackle, total stillness, "
            "dangerous and charged. "
            "Frame 4: identical to frame 1, the slow electrical pulse cycling, "
            f"electric eyes unblinking. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a thunder hawk diving and striking with lightning-charged "
            "talons. Jet-black feathers, blue-white lightning, electric-blue eyes. "
            "Frame 1: wind-up — body crouching, wings snapping fully open above, lightning "
            "surging intensely across all primaries and concentrating into the talons. "
            "Frame 2: dive begins — wings driving downward, body angling into a steep forward "
            "dive, talons dropping forward and crackling violently, beak open. "
            "Frame 3: talon strike — talons fully extended at the lowest point of the dive, "
            "a massive discharge of blue-white lightning exploding outward from the talons "
            "at impact, feathers blown back from the electrical burst. "
            "Frame 4: pulling out of the dive — wings snapping open to catch air, body "
            f"levelling, lightning dissipating from the talons. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a thunder hawk struck while in display stance. "
            "Jet-black feathers, blue-white lightning, electric-blue eyes. "
            "Frame 1: impact — wings snapping fully open from the force, lightning discharging "
            "erratically in all directions, feathers blasted outward, head thrown back. "
            "Frame 2: electrical disruption — lightning arcing wildly and uncontrolled across "
            "the feathers, the hawk off-balance, talons scraping the ground. "
            "Frame 3: restabilising — wings folding, lightning returning to controlled arcs, "
            "talons gripping, head coming back level. "
            "Frame 4: back to threat display, lightning blazing brighter than before, "
            f"electric eyes burning with fury. {S}"
        ),
    },

    "lightning_wyrm": {
        "gen_desc": (
            "A long sinuous serpentine wyrm covered in dark steel-blue scales that crackle "
            "with living electricity, a thick powerful body that undulates in lightning-charged "
            "coils, a wide flat wedge-shaped head with twin bright yellow lightning-slit eyes, "
            "no limbs, a forked tongue that sparks when extended, the spine ridge lined with "
            "a row of crackling electric blue dorsal spines, the tail tip forked and sparking. "
            f"Coiled in a rearing S-curve, poised to strike. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a lightning wyrm — dark steel-blue electric scales, "
            "sinuous coiled body, wide flat head, yellow lightning-slit eyes, crackling "
            "dorsal spines, forked sparking tail. All 4 frames are nearly identical — "
            "the wyrm holds its rearing S-curve with only micro electrical pulse variations. "
            "Frame 1: base pose — tall S-curve, upper body raised, head level, lightning "
            "crackling at baseline along dorsal spines and tail tip. "
            "Frame 2: electricity brightening 1-2px along the spine ridge in a slow pulse, "
            "tail tip sparking slightly brighter, body utterly still. "
            "Frame 3: electricity returning to baseline, complete stillness, coiled threat. "
            "Frame 4: identical to frame 1, the slow electrical pulse cycling, "
            f"yellow slit eyes unmoving. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a lightning wyrm striking with an electric bite. "
            "Dark steel-blue scales, yellow slit eyes, crackling dorsal spines. "
            "Frame 1: wind-up — upper body coiling back in a deep S, head pulling far back, "
            "electricity surging intensely from spine to head, jaws beginning to open. "
            "Frame 2: strike beginning — upper body uncoiling and launching forward, head "
            "driving forward at speed, jaws opening wide, electricity blazing around the "
            "open mouth. "
            "Frame 3: full bite strike — jaws snapping shut at maximum extension of the "
            "neck, a massive electrical discharge exploding from the bite point, the entire "
            "body following through with the strike. "
            "Frame 4: recoil — head pulling back, electricity dispersing, body coiling back "
            f"into the rearing S-pose. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a lightning wyrm struck by an attack. "
            "Dark steel-blue scales, yellow slit eyes, crackling dorsal spines, coiled body. "
            "Frame 1: full impact — the long body recoiling violently, electricity discharging "
            "wildly in all directions, dorsal spines flaring, head snapping sideways. "
            "Frame 2: disruption — coils loosening from the shock, the wyrm's body writhing "
            "in a spasm, electricity flickering erratically along the length. "
            "Frame 3: re-coiling — the body pulling back into its coils, electricity steadying, "
            "head rising back to level. "
            "Frame 4: back to the rearing S-curve, spine electricity blazing fully, yellow "
            f"slit eyes burning with cold rage. {S}"
        ),
    },

    "storm_elemental": {
        "gen_desc": (
            "A towering storm elemental — a vaguely humanoid form built entirely from swirling "
            "dark storm clouds and crackling white lightning, no solid body, the torso a dense "
            "compressed core of churning dark cloud, arms formed from reaching tendrils of "
            "storm cloud and lightning, a head-like mass of compressed dark cloud with two "
            "blazing white lightning eyes, the lower body dissolving into a vortex of spinning "
            f"wind and cloud. Crackling, violent, barely-contained. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a storm elemental — dark swirling cloud body with a "
            "dense compressed core, lightning-tendril arms, blazing white eyes, lower body "
            "a spinning cloud vortex. All 4 frames are nearly identical — the elemental "
            "hovers in place with only micro lightning pulse variations. "
            "Frame 1: base hover — cloud form still and dense, tendril arms loosely at sides, "
            "white eyes blazing steadily, lower vortex spinning slowly. "
            "Frame 2: white eyes brightening 1-2px, a single small lightning arc jumping "
            "between the core and one tendril arm, nothing else moving. "
            "Frame 3: eyes and lightning returning to baseline, complete hovering stillness, "
            "barely contained energy. "
            "Frame 4: identical to frame 1, the slow internal lightning pulse cycling, "
            f"white eyes unblinking. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a storm elemental launching a lightning strike. "
            "Dark swirling cloud body, lightning-tendril arms, blazing white eyes, "
            "lower body a cloud vortex. "
            "Frame 1: wind-up — the cloud form compressing tightly, both tendril arms pulling "
            "back, lightning consolidating into a blazing concentrated mass in the core. "
            "Frame 2: launching — one arm extending rapidly forward, compressed lightning "
            "beginning to discharge, the cloud form stretching toward the target. "
            "Frame 3: full discharge — a massive bolt of white lightning firing from the "
            "outstretched arm tip, the entire form briefly blazing white at the discharge. "
            "Frame 4: aftermath — arm retracting, lightning subsiding, cloud form "
            f"re-expanding into its hovering baseline. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a storm elemental struck by a heavy attack. "
            "Dark swirling cloud body, lightning arms, white eyes, cloud vortex base. "
            "Frame 1: the hit — the cloud form violently disrupted, dark clouds scattering "
            "outward, lightning arcing wildly in all directions, the vortex base spinning out. "
            "Frame 2: dissipation wave — portions of the cloud form temporarily scattering, "
            "the elemental partially losing shape, lightning discharging erratically. "
            "Frame 3: reformation — the scattered clouds pulling back together, lightning "
            "re-concentrating into the core, the form re-solidifying. "
            "Frame 4: restored — cloud form churning, white eyes blazing brighter, lightning "
            f"arcing with renewed intensity. {S}"
        ),
    },

    # ── World 2 — The Ancient Frontier ───────────────────────────────────────

    "iron_fang_wolf": {
        "gen_desc": (
            "A massive ancient wolf with fur like densely packed iron filaments, dark "
            "silver-grey coat with deep charcoal streaks running along the spine, eyes burning "
            "with fierce orange qi flame, fangs visibly reinforced with gleaming metallic "
            "hardness, thick heavily-scarred hide from countless battles, enormous muscular "
            "haunches coiled for a lunge, claws that dig visibly into the earth, a crackling "
            "aura of dense metallic qi radiating outward in sharp angular wisps. Far larger "
            f"and more imposing than a common pack wolf. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a massive Iron Fang Wolf. "
            "CRITICAL — every frame must look identical to the reference image: "
            "jet-black fur, large flowing golden qi swirls around the body, "
            "thick bright gold ring collar at the neck, four legs planted, "
            "head raised, tail up. The wolf body does NOT move between frames. "
            "The ONLY change across frames is the golden qi swirl particles slowly "
            "drifting — each frame the swirls have floated 2-3px further along their "
            "curl path, as if lazily orbiting the wolf's body in a slow loop. "
            "Wolf silhouette, pose, fur colour, and collar are locked — only the "
            f"golden swirl positions drift slightly each frame. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a massive Iron Fang Wolf lunging with devastating "
            "force. Iron-grey fur, charcoal spine streaks, orange flame-eyes, iron-reinforced "
            "fangs, thick scarred hide, sharp angular metallic qi aura. "
            "Frame 1: deep coiled crouch — all four enormous legs compressed under the body, "
            "head drawn back low, orange flame-eyes narrowed to burning slits, metallic qi "
            "aura flaring intensely, the sheer mass making this look seismic. "
            "Frame 2: explosive lunge — enormous body launched fully forward, iron-reinforced "
            "jaws tearing open wide, orange qi flame blazing, metallic qi trailing in jagged "
            "angular streaks behind the body. "
            "Frame 3: full devastating extension — entire massive frame airborne and committed, "
            "iron fangs snapping shut with tremendous force, metallic qi discharged in a burst "
            "of sharp sparks at the impact point. "
            "Frame 4: landing — enormous front legs absorbing the impact, hindquarters still "
            f"elevated, head pulling back, metallic qi aura reforming. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a massive Iron Fang Wolf absorbing a powerful attack. "
            "Iron-grey fur, charcoal streaks, orange flame-eyes, iron fangs, scarred hide. "
            "Frame 1: shuddering impact — the enormous scarred body shuddering from the blow, "
            "massive head thrown back, iron-grey fur rippling from force, thick legs staggering. "
            "Frame 2: stagger — enormous body displaced sideways, thick legs bracing wide, "
            "orange flame-eyes briefly dimmed with pain, iron-grey fur still ruffled. "
            "Frame 3: pulling upright — spine straightening slowly, enormous claws re-planting, "
            "orange flame-eyes beginning to rekindle. "
            "Frame 4: back to dominant stance, battle-worn but unbroken, orange flame-eyes "
            f"blazing with renewed fury. {S}"
        ),
    },

    "sand_dragon": {
        "gen_desc": (
            "A long powerful dragon built for the desert — sinuous serpentine body covered in "
            "overlapping sand-coloured scales ranging from pale gold to deep rust-orange, four "
            "short powerful limbs with wide splayed claws for sand-running, a broad flat "
            "wedge-shaped horned head with burning amber eyes and a wide jaw lined with "
            "jagged fangs, a thick muscular tail, no wings, qi energy manifesting as heat "
            "shimmer and swirling sand particles orbiting the body. Rearing in an aggressive "
            f"display. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a sand dragon — sand-gold to rust-orange scales, four "
            "wide-clawed limbs, broad horned head, amber eyes, heat-shimmer qi, orbiting "
            "sand particles. All 4 frames are nearly identical — the dragon holds its rearing "
            "pose with only micro heat-shimmer pulse variations. "
            "Frame 1: base pose — rearing S-curve, head level, sand particles orbiting "
            "slowly at baseline, heat shimmer present, amber eyes forward. "
            "Frame 2: heat shimmer brightening 1-2px, sand particles orbiting fractionally "
            "faster, nothing else moving. "
            "Frame 3: shimmer returning to baseline, particles back to slow orbit, "
            "completely still and imposing. "
            "Frame 4: identical to frame 1, the slow heat pulse cycling, amber eyes "
            f"unblinking. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a sand dragon striking with a sand-blast bite. "
            "Sand-gold to rust-orange scales, broad horned head, amber eyes, orbiting sand. "
            "Frame 1: wind-up — upper body coiling deep, sand particles spiralling inward and "
            "concentrating at the jaws, scales flaring, amber eyes narrowing. "
            "Frame 2: strike beginning — neck driving forward, sand particles rushing ahead "
            "of the jaws in a cone, mouth opening wide revealing jagged fangs. "
            "Frame 3: full bite strike with sand explosion — jaws clamping shut at maximum "
            "extension, a massive blast of sand particles and amber qi exploding outward. "
            "Frame 4: recoil — head pulling back, sand settling, body coiling back into "
            f"the rearing pose. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a sand dragon absorbing a strike. "
            "Sand-gold to rust-orange scales, broad horned head, amber eyes, orbiting sand. "
            "Frame 1: full impact — the long body rocking from the blow, sand particles "
            "scattering wildly, scales along the neck flaring, head snapping sideways. "
            "Frame 2: stagger — body tilting off the rearing pose, limbs splaying, sand "
            "cloud from the disruption hanging in the air. "
            "Frame 3: stabilising — limbs replanting, body pulling back into the S-curve, "
            "sand particles being recaptured back into orbit. "
            "Frame 4: back to rearing, particles fully restored, amber eyes blazing, "
            f"scales flat and menacing. {S}"
        ),
    },

    "bone_construct": {
        "gen_desc": (
            "An ancient war construct assembled entirely from large yellowed bones, held "
            "together by dark qi binding — not a natural skeleton but an artificial warrior "
            "built from mixed bones of different creatures, reinforced with iron bolts and "
            "dark qi sutures glowing dim purple, broad-shouldered and massive, two thick bone "
            "arms ending in fused bone-club fists, a skull head with hollow purple-glowing "
            "eye sockets, no lower jaw, standing in a heavy ready stance. Cold, purposeful, "
            f"and indestructible-looking. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a massive bone construct — yellowed assembled bones "
            "held by dark purple qi bindings, iron bolts, broad shoulders, bone-club fists, "
            "skull head with hollow purple-glowing eyes, no lower jaw. All 4 frames are "
            "nearly identical — the construct stands completely motionless with only a "
            "slow purple qi pulse. "
            "Frame 1: base guard — bone fists raised, purple glow steady in eye sockets "
            "and binding joints, utterly still. "
            "Frame 2: purple qi glow brightening 1-2px in the eye sockets on a slow pulse, "
            "nothing else moving. "
            "Frame 3: glow returning to steady baseline, complete motionless stillness, "
            "patient and cold. "
            "Frame 4: identical to frame 1, the slow qi pulse cycling, hollow eyes "
            f"eternally patient. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a bone construct swinging a bone-club fist. "
            "Yellowed assembled bones, dark purple qi bindings, bone-club fists, purple eyes. "
            "Frame 1: raising the right fist — bone arm lifting high above the shoulder, "
            "dark purple qi blazing along the arm binding joints. "
            "Frame 2: the downswing begins — massive bone arm arcing down in a heavy overhead "
            "slam, purple qi trailing the fist, the sheer mass of the arm terrifying. "
            "Frame 3: full slam — bone fist driven to its lowest point, a shockwave of "
            "purple qi and bone fragments exploding outward from the impact point. "
            "Frame 4: lifting the arm back to guard, purple qi settling, the construct "
            f"resetting with mechanical patience. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a bone construct struck by a heavy attack. "
            "Yellowed assembled bones, dark purple qi bindings, bone-club fists, purple eyes. "
            "Frame 1: impact — bones rattling and several fragmenting at the hit point, "
            "purple qi bindings flaring bright from the disruption, body shuddering. "
            "Frame 2: the shockwave — bone fragments clattering, purple bindings flickering, "
            "the construct lurching sideways from the force. "
            "Frame 3: the bindings pulling fragments back — purple qi reattaching scattered "
            "bone pieces, the construct re-solidifying, grinding back upright. "
            "Frame 4: fully restored to guard stance, purple bindings blazing steadier than "
            f"before, hollow eyes burning cold and patient. {S}"
        ),
    },

    "desert_wraith": {
        "gen_desc": (
            "A desert wraith — a gaunt translucent spectre draped in torn ancient burial "
            "wrappings that trail and flutter as if in a constant wind, the body beneath "
            "barely visible — more shadow and pale orange-gold qi smoke than flesh, a "
            "skull-like face showing through the wrappings with hollow blazing eyes of "
            "deep orange, skeletal hands extending from the wrappings, the lower body "
            "dissolving into a trailing wisp of orange smoke and sand. Hovering. Hungry. "
            f"{S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a desert wraith — gaunt translucent spectre in torn "
            "ancient burial wrappings, barely-visible shadowy body, hollow orange blazing eyes, "
            "skeletal hands, lower body dissolving into orange smoke and sand. All 4 frames "
            "are nearly identical — the wraith hovers in place with only micro wisp variations. "
            "Frame 1: base hover — wrappings drifting very slowly in a phantom wind, orange "
            "smoke rising gently from the lower body, hollow eyes burning steady. "
            "Frame 2: orange smoke wisping 1-2px brighter, wrappings drifting the same slow "
            "drift, skeletal hands still, everything else unchanged. "
            "Frame 3: smoke returning to baseline, wrappings unchanged, complete still "
            "hovering menace. "
            "Frame 4: identical to frame 1, the slow smoke pulse cycling, hollow orange "
            f"eyes unblinking. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a desert wraith lunging with spectral claws. "
            "Torn burial wrappings, shadowy form, hollow orange eyes, skeletal hands. "
            "Frame 1: coiling back — wrappings billowing forward as the body pulls back, "
            "skeletal hands retracting, orange qi smoke surging toward the hands. "
            "Frame 2: lunge begins — entire spectral form thrusting forward, wrappings "
            "streaming back, skeletal hands driving ahead, orange qi igniting on the fingers. "
            "Frame 3: full spectral claw strike — hands fully extended, orange qi erupting "
            "from the fingertips in clawing streaks, wrappings flying. "
            "Frame 4: retracting — form pulling back, orange qi fading from the hands, "
            f"wrappings resettling into drift. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a desert wraith struck by an attack. "
            "Torn burial wrappings, shadowy form, orange blazing eyes, skeletal hands. "
            "Frame 1: disruption — the spectral form fragmenting at the hit point, wrappings "
            "flying wildly, orange smoke scattering, hollow eyes flaring. "
            "Frame 2: destabilised — the form partially losing coherence, flickering between "
            "visible and near-invisible, orange smoke billowing chaotically. "
            "Frame 3: reforming — the fragments pulling back together, wrappings drawing "
            "in, orange smoke reconcentrating, the form solidifying. "
            "Frame 4: restored to hover, wrappings drifting, orange eyes blazing with "
            f"cold hunger. {S}"
        ),
    },

    "elemental_boar": {
        "gen_desc": (
            "A massive elemental boar suffused with raw earth qi — a titanic tusked boar with "
            "dark brown stone-like hide that has partially crystallised into rocky patches "
            "along its flanks and shoulders, deep brown earth qi seeping from cracks between "
            "the stone-hide patches and around the base of its two enormous curved tusks, "
            "small blazing amber eyes sunk into the rocky hide, a massive bulk suggesting "
            "unstoppable weight, legs like stone pillars, a bristled spine crest of crystallised "
            f"earth qi. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a massive elemental boar — stone-crystallised hide, "
            "earth qi seeping from cracks, enormous curved tusks, amber eyes, stone-pillar "
            "legs, crystallised earth-qi spine crest. All 4 frames are nearly identical — "
            "the boar stands immovably with only a slow earth-qi pulse. "
            "Frame 1: base stance — four-square, earth qi seeping steadily from hide cracks "
            "at baseline, spine crest still, amber eyes forward. "
            "Frame 2: earth qi seeping 1-2px brighter through the hide cracks on a slow "
            "pulse, nothing else moving. "
            "Frame 3: qi returning to baseline seep, complete stillness, an immovable "
            "wall of weight. "
            "Frame 4: identical to frame 1, the slow qi pulse cycling, amber eyes "
            f"unblinking. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of an elemental boar charging with earth-qi-charged tusks. "
            "Stone-crystallised hide, earth qi, enormous curved tusks, amber eyes. "
            "Frame 1: wind-up — body rocking back, haunches dropping, tusks angling down "
            "and forward, earth qi surging and concentrating around the tusks, hide "
            "cracks blazing. "
            "Frame 2: charge launch — entire massive body lurching forward with seismic "
            "momentum, earth qi streaming off the tusks, stone legs pounding. "
            "Frame 3: tusk impact — tusks driving fully forward at the lowest point, a "
            "massive explosion of earth qi and stone fragments radiating outward from the "
            "impact. "
            "Frame 4: charge deceleration — body slowing, earth qi dispersing from tusks, "
            f"legs resetting. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a massive elemental boar absorbing a powerful strike. "
            "Stone-crystallised hide, earth qi cracks, enormous tusks, amber eyes. "
            "Frame 1: impact — stone hide cracking further from the hit, earth qi flaring "
            "violently from new cracks, the enormous body shuddering but barely moving. "
            "Frame 2: the shockwave — cracks spreading, earth qi pouring through, a deep "
            "grinding sound implicit in the body language. "
            "Frame 3: stabilising — earth qi solidifying in the new cracks, stone hide "
            "partially resealing, the body utterly unmoved. "
            "Frame 4: back to four-square, new cracks still glowing, amber eyes blazing, "
            f"more dangerous than before. {S}"
        ),
    },

    "city_guardian": {
        "gen_desc": (
            "A massive ancient city guardian construct — a towering humanoid warrior built "
            "from dark iron and grey stone, engraved with protective seal inscriptions that "
            "glow with steady blue-white qi light, two enormous stone fists, a featureless "
            "flat stone face with a single horizontal slit of blue-white qi light for eyes, "
            "broad armoured shoulders with pauldrons carved from single blocks of stone, "
            "a barrel chest carved with protective formation arrays, standing in a "
            f"immovable guardian stance. Ancient. Unyielding. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a massive city guardian construct — dark iron and stone "
            "body, blue-white glowing seal inscriptions, enormous stone fists, flat stone face "
            "with single glowing slit, carved formation arrays on chest. All 4 frames are "
            "nearly identical — the guardian stands immovable with only a slow inscription pulse. "
            "Frame 1: base guard — stone fists at sides, blue-white inscriptions glowing "
            "at steady baseline, face slit glowing steadily, utterly motionless. "
            "Frame 2: inscription glow brightening 1-2px on a slow pulse, face slit "
            "brightening slightly, nothing else moving. "
            "Frame 3: glow returning to baseline, complete stone stillness, ancient and "
            "eternal. "
            "Frame 4: identical to frame 1, the slow inscription pulse cycling, the "
            f"guardian unmoved since ancient times. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a city guardian delivering a devastating stone fist "
            "slam. Dark iron and stone body, blue-white glowing seal inscriptions, stone fists. "
            "Frame 1: raising the fist — one enormous stone arm lifting high above the "
            "shoulder, blue-white qi inscriptions blazing along the entire arm. "
            "Frame 2: the slam beginning — stone arm descending in a massive overhead arc, "
            "blue-white qi trailing, the sheer mass of the limb shaking the ground. "
            "Frame 3: full slam — stone fist driven down, a massive shockwave of blue-white "
            "qi and stone fragments exploding outward, the ground cracking. "
            "Frame 4: fist lifting back to guard, qi settling, the guardian resetting with "
            f"absolute mechanical patience. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a massive city guardian absorbing an attack. "
            "Dark iron and stone, blue-white inscriptions, stone fists, flat face slit. "
            "Frame 1: impact — stone body shuddering from the hit, inscription lines "
            "flaring bright white, chips of stone flying from the impact point. "
            "Frame 2: the shockwave — the body rocking fractionally, inscription arrays "
            "flickering, the stone face slit blazing as defences activate. "
            "Frame 3: the inscriptions fully activating — arrays blazing in response, "
            "the body solidifying, the damage being absorbed and reinforced. "
            "Frame 4: fully steady, inscriptions at heightened glow, the guardian "
            f"unmoved, more dangerous than before. {S}"
        ),
    },

    "immortal_shade": {
        "gen_desc": (
            "A trapped immortal shade — the ghost of an ancient immortal cultivator whose "
            "spirit was unable to pass on, now a towering translucent figure in spectral "
            "immortal robes that shift between pale white and deep violet, long spectral hair "
            "floating upward, a proud gaunt face with hollow blazing violet eyes, spectral "
            "hands crackling with residual cultivation qi that has turned dark and unstable, "
            "the lower half dissolving into trailing violet ghost-fire and spectral robes. "
            f"Majestic, anguished, and immensely dangerous. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of an immortal shade — tall translucent figure in pale "
            "white and deep violet spectral immortal robes, floating spectral hair, gaunt "
            "proud face, hollow violet blazing eyes, hands crackling with unstable dark qi. "
            "All 4 frames are nearly identical — the shade hovers in place with only micro "
            "violet qi pulse variations. "
            "Frame 1: base hover — upright, robes drifting imperceptibly, spectral hair "
            "floating gently upward, violet qi crackling softly at the hands, eyes steady. "
            "Frame 2: violet qi brightening 1-2px at the knuckles on a slow pulse, "
            "everything else completely unchanged. "
            "Frame 3: qi returning to its baseline soft crackle, total hovering stillness, "
            "anguished dignity. "
            "Frame 4: identical to frame 1, the slow qi pulse cycling, hollow violet eyes "
            f"burning with ancient grief. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of an immortal shade unleashing a spectral qi blast. "
            "Spectral immortal robes, violet blazing eyes, unstable dark qi hands. "
            "Frame 1: winding up — one spectral hand pulling back, violet qi surging and "
            "compressing into the palm in a crackling mass, robes billowing from the buildup. "
            "Frame 2: the blast launching — hand thrusting forward, a spear of concentrated "
            "violet dark qi firing from the palm, robes streaming back from the discharge. "
            "Frame 3: full blast at peak — the violet qi spear fully extended and impacting, "
            "a violent explosion of dark violet energy at the strike point. "
            "Frame 4: hand retracting, violet qi dispersing, robes resettling, the shade "
            f"returning to its hovering poise. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of an immortal shade struck by a powerful attack. "
            "Spectral robes, floating hair, violet blazing eyes, unstable dark qi hands. "
            "Frame 1: disruption — the spectral form fragmenting at the hit, robes exploding "
            "outward, violet qi discharging wildly, eyes flaring. "
            "Frame 2: partial dissolution — the form losing cohesion, flickering between "
            "visible and nearly gone, violet qi scattering. "
            "Frame 3: reformation — violet qi pulling the form back together, robes drawing "
            "in, the shade re-solidifying with a violent pulse. "
            "Frame 4: restored and furious — hovering upright, violet qi blazing intensely, "
            f"eyes burning with ancient rage at the impertinence. {S}"
        ),
    },

    "corrupted_cultivator": {
        "gen_desc": (
            "A male cultivator consumed by dark qi corruption — once a powerful fighter, now "
            "his cultivation robes are shredded and blackened at the edges, his skin showing "
            "dark veins of corruption qi tracing across his hands and face, his eyes entirely "
            "consumed to solid black with no iris visible, dark qi smoke seeping from between "
            "his clenched fingers, his posture aggressive and hunched, hair wild, dark qi "
            "aura radiating in unstable tendrils around his body. Powerful and broken. "
            f"{S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a corrupted cultivator — shredded blackened robes, "
            "dark qi corruption veins on skin, solid black eyes, dark qi smoke from fists, "
            "unstable dark qi tendrils radiating from the body. All 4 frames are nearly "
            "identical — the cultivator holds their hunched stance with only micro "
            "dark qi pulse variations. "
            "Frame 1: base stance — hunched and aggressive, fists clenched, dark qi "
            "tendrils coiling softly at baseline, solid black eyes forward. "
            "Frame 2: dark qi tendrils brightening 1-2px on a slow pulse, smoke from fists "
            "thickening slightly, nothing else moving. "
            "Frame 3: tendrils and smoke returning to baseline, complete hunched stillness, "
            "dangerous and barely contained. "
            "Frame 4: identical to frame 1, the slow dark qi pulse cycling, solid black "
            f"eyes unblinking. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a corrupted cultivator striking with dark qi. "
            "Shredded robes, corruption veins, solid black eyes, dark qi smoke. "
            "Frame 1: wind-up — body twisting back, one arm drawing back with dark qi "
            "surging intensely up the arm and igniting the fist in black flame. "
            "Frame 2: the strike beginning — body driving forward, dark qi-ignited fist "
            "swinging in a wide arc, corruption tendrils trailing the arm. "
            "Frame 3: full impact strike — fist connecting at full extension, a violent "
            "explosion of dark qi and corruption energy at the strike point, black flame "
            "erupting outward. "
            "Frame 4: retracting, dark qi dissipating from the fist, body lurching back "
            f"to the hunched guard, trembling from the expenditure. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a corrupted cultivator struck in combat. "
            "Shredded robes, corruption veins, solid black eyes, dark qi tendrils. "
            "Frame 1: impact — body snapping back, dark qi tendrils discharging wildly, "
            "solid black eyes flaring, shredded robes flying. "
            "Frame 2: stagger — body off-balance, dark qi tendrils thrashing erratically, "
            "the corruption veins blazing on the skin. "
            "Frame 3: pulling back upright — dark qi tendrils consolidating back toward "
            "the body, spine straightening with visible effort. "
            "Frame 4: back to hunched guard, dark qi aura burning intensely, solid black "
            f"eyes blazing. {S}"
        ),
    },

    "blood_leviathan": {
        "gen_desc": (
            "A colossal sea leviathan — an immense serpentine sea beast with scales the "
            "colour of deep crimson blood that glisten with a wet sheen, a massive flat "
            "head lined with rows of backward-curving fangs, four vestigial fin-like limbs "
            "along the lower body, a huge fan tail, deep red glowing eyes beneath heavy "
            "ridged brow armour, blood-red qi seeping from between the scale edges like "
            "a constant wound, coiled in a rearing display — vast, ancient, and remorseless. "
            f"{S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a blood leviathan — enormous crimson-scaled sea "
            "serpent, massive toothed head, deep red glowing eyes, blood-red qi seeping "
            "from scale edges, four fin-limbs, huge fan tail. All 4 frames are nearly "
            "identical — the leviathan holds its rearing S-curve with only micro blood-qi "
            "pulse variations. "
            "Frame 1: base pose — rearing S-curve, head raised, blood-red qi seeping "
            "steadily at baseline from scale edges, deep red eyes forward. "
            "Frame 2: blood-red qi seeping 1-2px brighter along the scale edges on a slow "
            "pulse, nothing else moving. "
            "Frame 3: qi returning to baseline seep, complete rearing stillness, "
            "ancient and vast. "
            "Frame 4: identical to frame 1, the slow blood-qi pulse cycling, deep red "
            f"eyes unblinking. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a blood leviathan striking with a massive bite. "
            "Crimson-scaled body, blood-red qi, massive fanged head, deep red eyes. "
            "Frame 1: coiling back — the great head pulling far back and rising higher, "
            "blood-red qi surging intensely from scale edges and concentrating at the jaws. "
            "Frame 2: strike beginning — the massive head driving forward at speed, jaws "
            "opening to reveal rows of backward fangs, blood-red qi streaming forward. "
            "Frame 3: full bite — jaws clamping shut at full extension, a tremendous "
            "explosion of blood-red qi and crimson energy from the impact. "
            "Frame 4: head retracting, blood-red qi settling, coiling back into rearing "
            f"S-pose. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a blood leviathan struck by a powerful attack. "
            "Crimson scales, blood-red qi, massive head, deep red eyes, fan tail. "
            "Frame 1: impact — the vast body shuddering, crimson scales cracking at the "
            "hit point, blood-red qi surging violently from the damage, the great head "
            "snapping sideways. "
            "Frame 2: the stagger — the rearing pose disrupted, the body swaying, "
            "blood-red qi pouring from new cracks. "
            "Frame 3: re-stabilising — the body coiling back into the S-curve, scales "
            "sealing over, blood-red qi normalising. "
            "Frame 4: rearing again, deeper red than before, deep red eyes blazing with "
            f"ancient rage. {S}"
        ),
    },

    # ── World 3 — The Forbidden Lands ────────────────────────────────────────

    "burial_guardian": {
        "gen_desc": (
            "An ancient burial guardian — a towering humanoid warrior of tarnished bronze "
            "and blackened iron, clad in the decaying armour of a forgotten dynasty, deep "
            "green patina on the bronze, seal inscriptions on the chest plate now cracked "
            "and leaking pale green qi, a featureless bronze helmet-face with two hollow "
            "pale green glowing eye slits, enormous hands in heavy gauntlets, standing "
            "with a massive halberd-like weapon raised in a warning stance. Ancient duty "
            f"still burning in those hollow eyes. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a burial guardian — tarnished bronze and blackened "
            "iron armour of a forgotten dynasty, cracked seal inscriptions leaking pale green "
            "qi, featureless bronze helmet-face, hollow pale green eye slits, massive halberd. "
            "All 4 frames are nearly identical — the guardian stands immovably at post with "
            "only a slow green qi pulse through the inscription cracks. "
            "Frame 1: base guard — halberd raised, pale green qi leaking steadily at "
            "baseline from cracks, eye slits glowing steadily, utterly motionless. "
            "Frame 2: pale green qi brightening 1-2px through the chest inscription cracks "
            "on a slow pulse, eye slits brightening slightly, nothing else moving. "
            "Frame 3: qi returning to baseline, complete stone-like stillness, this guardian "
            "has stood here for ages. "
            "Frame 4: identical to frame 1, the slow qi pulse cycling, pale green eye slits "
            f"unblinking. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a burial guardian swinging its massive halberd. "
            "Tarnished bronze armour, cracked seal inscriptions, pale green qi, hollow eye slits. "
            "Frame 1: raising the halberd — both gauntleted arms lifting the great weapon "
            "high, pale green qi blazing along the cracks, eye slits flaring. "
            "Frame 2: the swing begins — halberd arcing down in a wide lateral sweep, "
            "pale green qi trailing the blade edge. "
            "Frame 3: full sweep impact — halberd at its maximum arc, pale green qi "
            "exploding off the blade in a shockwave. "
            "Frame 4: recovering the halberd — pulling it back to guard position, qi "
            f"settling, eye slits returning to steady glow. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a burial guardian absorbing an attack. "
            "Tarnished bronze armour, cracked inscriptions, pale green qi, hollow eye slits. "
            "Frame 1: impact — armour cracking further at the hit point, pale green qi "
            "flaring through every crack, the guardian shuddering but not falling. "
            "Frame 2: the force propagating — armour plates grinding, halberd swaying, "
            "the guardian rocking minutely from the blow. "
            "Frame 3: defences re-engaging — inscription cracks blazing green as the "
            "ancient wards activate, the body stabilising completely. "
            "Frame 4: back to guard, armour sealed, pale green qi burning brighter "
            f"than before, eternal and unmovable. {S}"
        ),
    },

    "saint_corpse_soldier": {
        "gen_desc": (
            "A saint corpse-soldier — the reanimated body of an ancient saint-level cultivator "
            "preserved in death, wearing the tattered but still-magnificent ceremonial robes "
            "of a great sect elder, the face grey-white and hollow-cheeked but still bearing "
            "an expression of noble authority, eyes replaced by twin blazing pale gold death-qi "
            "flames, hands wrapped in tattered golden cultivation gloves crackling with "
            "unstable saint-level qi, posture upright and commanding despite death. The power "
            f"still radiates from this corpse. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a saint corpse-soldier — reanimated ancient saint in "
            "tattered ceremonial sect elder robes, grey-white noble face, pale gold death-qi "
            "flame eyes, golden cultivation gloves crackling with unstable saint qi. All 4 "
            "frames are nearly identical — the corpse stands in commanding stillness with "
            "only a slow death-qi flame pulse. "
            "Frame 1: base stance — upright and commanding, pale gold death-qi flames "
            "burning at baseline in the eye sockets, saint qi crackling softly at the hands. "
            "Frame 2: pale gold eye-flames brightening 1-2px on a slow pulse, saint qi "
            "crackling slightly brighter at the gloves, nothing else moving. "
            "Frame 3: flames and qi returning to baseline, complete commanding stillness, "
            "death has not diminished the authority. "
            "Frame 4: identical to frame 1, the slow death-qi pulse cycling, pale gold "
            f"flames burning with cold authority. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a saint corpse-soldier unleashing saint-level qi. "
            "Tattered sect elder robes, pale gold death-qi flame eyes, golden crackling gloves. "
            "Frame 1: wind-up — one arm drawing back, saint qi surging intensely into the "
            "golden glove, pale gold eye-flames blazing, the very air distorting around "
            "the condensed qi. "
            "Frame 2: launching — arm driving forward, a condensed spear of pale gold "
            "saint qi firing from the outstretched hand, robes streaming back. "
            "Frame 3: full impact — pale gold saint qi striking at maximum range, a "
            "massive explosion of gold and death-qi energy at the impact point. "
            "Frame 4: arm retracting, qi dissipating, the corpse-soldier returning to "
            f"commanding posture with cold dignity. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a saint corpse-soldier struck in battle. "
            "Tattered ceremonial robes, pale gold death-qi flame eyes, golden crackling gloves. "
            "Frame 1: impact — the body rocking from the hit, robes flapping, pale gold "
            "eye-flames flaring violently, saint qi discharging from the gloves. "
            "Frame 2: stagger — body tilting off-balance, eye-flames flickering, the "
            "noble posture briefly disrupted. "
            "Frame 3: re-stabilising — saint qi surging to reinforce the body, robes "
            "resettling, posture pulling back upright. "
            "Frame 4: back to commanding stance, pale gold flames burning colder and "
            f"brighter, dignity restored and fury cold. {S}"
        ),
    },

    "void_rift_predator": {
        "gen_desc": (
            "A void rift predator — a creature that slipped through a tear in space, its body "
            "a shifting mass of deep black void-matter with a vaguely feline silhouette, edges "
            "of its form constantly flickering and distorting as if incompletely present in "
            "this reality, four limbs that end in claws of compressed void energy, a flat "
            "featureless head with two narrow slits of pure white void light for eyes, small "
            "rifts and tears in space briefly opening and closing along its back. Alien, "
            f"predatory, and deeply wrong. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a void rift predator — shifting void-matter feline body, "
            "flickering and distorting edges, void-energy claws, flat featureless head, white "
            "void-light eye slits, space rifts opening on its back. All 4 frames are nearly "
            "identical — the predator holds its crouch with only micro void-flicker variations. "
            "Frame 1: base crouch — body still, edges flickering at baseline, white eye slits "
            "burning steadily, one small space rift cycling on the back. "
            "Frame 2: edges flickering 1-2px more intensely on a pulse, white eye slits "
            "brightening slightly, nothing else moving. "
            "Frame 3: flicker returning to baseline, complete predator stillness, "
            "alien and wrong. "
            "Frame 4: identical to frame 1, the slow void pulse cycling, white eye slits "
            f"burning with alien hunger. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a void rift predator striking through a space rift. "
            "Shifting void-matter body, flickering edges, void-claws, white eye slits. "
            "Frame 1: wind-up — a large void rift tearing open directly in front of the "
            "predator, the creature compressing its form and moving toward the rift, "
            "white eye slits blazing. "
            "Frame 2: entering the rift — the void-form partially disappearing into the "
            "tear in space, only the trailing half of the body visible. "
            "Frame 3: emerging from a second rift at the target location — claws slashing "
            "outward as the predator exits the void, void energy exploding from the strike. "
            "Frame 4: the predator fully re-emerging, the rifts sealing behind it, "
            f"form re-stabilising. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a void rift predator struck by an attack. "
            "Shifting void-matter body, flickering edges, void-claws, white eye slits. "
            "Frame 1: the hit destabilising the void-form — edges flickering violently, "
            "the body partially dissipating, white eye slits flickering. "
            "Frame 2: destabilisation wave — the form losing coherence, void-matter "
            "scattering, small rifts tearing open erratically across the body. "
            "Frame 3: reconsolidating — void-matter drawing back together, rifts sealing, "
            "the form re-solidifying. "
            "Frame 4: back to predator crouch, form stabilised, white eye slits burning "
            f"with alien hunger. {S}"
        ),
    },

    # ── World 4 — The Origin Depths ──────────────────────────────────────────

    "origin_guardian": {
        "gen_desc": (
            "A primordial origin guardian — a colossal construct of pure condensed origin qi "
            "that has taken the form of an armoured giant, its body composed of slowly "
            "rotating geometric formations of dense white-gold origin qi rather than flesh "
            "or metal, massive crystalline formations making up its armour plates, a blank "
            "humanoid helmet-face with a single horizontal ring of blazing white origin qi "
            "for eyes, enormous fists of condensed origin qi crystal, the very air warping "
            f"and shimmering around its presence. Overwhelming. Primordial. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of an origin guardian — colossal armoured giant of "
            "rotating white-gold origin qi formations, crystalline armour plates, blank "
            "helmet-face with blazing white origin qi eye-ring, enormous crystalline fists. "
            "All 4 frames are nearly identical — the guardian stands in absolute stillness "
            "with only a micro origin-qi pulse in the eye-ring. "
            "Frame 1: base stance — origin qi formations rotating slowly at baseline, "
            "white eye-ring blazing steadily, air warping gently around the presence. "
            "Frame 2: eye-ring brightening 1-2px on a slow pulse, formations rotating "
            "at the same steady pace, nothing else moving. "
            "Frame 3: eye-ring returning to baseline, complete primordial stillness, "
            "timeless and patient. "
            "Frame 4: identical to frame 1, the slow qi pulse cycling, white eye-ring "
            f"blazing. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of an origin guardian delivering a crushing origin qi "
            "strike. Rotating white-gold qi formations, crystalline armour, white eye-ring. "
            "Frame 1: one enormous crystalline fist drawing back, origin qi formations "
            "converging onto the raised arm, condensing it with overwhelming energy. "
            "Frame 2: the fist driving forward, a shockwave of origin qi preceding the "
            "strike and warping space around it. "
            "Frame 3: full impact — the crystalline fist connecting, an explosion of "
            "white-gold origin qi obliterating everything at the strike point. "
            "Frame 4: fist retracting, origin qi dispersing, formations returning to "
            f"their steady rotation. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of an origin guardian struck by an enormously powerful attack. "
            "White-gold origin qi formations, crystalline armour, white eye-ring. "
            "Frame 1: the attack connecting — crystalline armour cracking, origin qi "
            "formations disrupted, the ring-eye blazing white in response. "
            "Frame 2: the force propagating — crystals fracturing further, formations "
            "spinning out of alignment. "
            "Frame 3: origin qi surging to repair — fractured crystals being rebuilt by "
            "the condensing energy, formations re-aligning. "
            "Frame 4: fully restored and enhanced, origin qi blazing more intensely "
            f"than before, the guardian unmoved. {S}"
        ),
    },

    "ancient_beast": {
        "gen_desc": (
            "An ancient beast of the origin depths — a titanic four-limbed creature whose "
            "body is encrusted in thick scales of compressed origin-qi crystal that glow "
            "from within with deep gold light, a massive dragon-like head with four horns "
            "and blazing golden origin-qi eyes, enormous claws of solid origin-qi crystal, "
            "a long powerful tail, the ground cracking visibly beneath its weight, qi of "
            "such density that visible distortions shimmer around its entire silhouette. "
            f"A remnant of the world's first age. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of an ancient beast — titanic quadruped, origin-qi "
            "crystal scales glowing gold from within, four-horned dragon head, blazing "
            "golden origin eyes, crystal claws, ground cracking under its weight. All 4 "
            "frames are nearly identical — the beast stands immovably with only a micro "
            "golden scale-glow pulse. "
            "Frame 1: base stance — four-square, origin-qi crystal scales glowing at "
            "steady baseline gold, golden eyes forward, completely still. "
            "Frame 2: scale glow brightening 1-2px on a slow breath pulse, golden eyes "
            "brightening slightly, nothing else moving. "
            "Frame 3: glow returning to baseline, complete mountain-like stillness, "
            "a remnant of the world's first age. "
            "Frame 4: identical to frame 1, the slow glow pulse cycling, golden eyes "
            f"unblinking. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of an ancient beast striking with origin-qi crystal "
            "claws. Crystal scales, golden origin eyes, massive dragon head. "
            "Frame 1: rearing back, enormous front limbs lifting, origin-qi blazing in "
            "the crystal claws, golden eyes blazing, the sheer scale catastrophic. "
            "Frame 2: driving the claws down and forward, origin-qi streaming off the "
            "crystal claws in golden trails. "
            "Frame 3: claws striking at full force, an explosion of golden origin-qi "
            "obliterating the impact point, ground shattering. "
            "Frame 4: pulling limbs back to standing, origin-qi dispersing from claws, "
            f"settling back to four-square. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of an ancient beast absorbing a powerful strike. "
            "Origin-qi crystal scales, golden eyes, massive dragon head, crystal claws. "
            "Frame 1: the hit — crystal scales cracking at the impact point, golden origin "
            "qi blazing through the cracks, the titanic body shuddering. "
            "Frame 2: the force absorbing — cracks spreading, origin qi flooding through, "
            "a roar implicit in the thrown-back head. "
            "Frame 3: crystal scales resealing — origin qi hardening the new cracks into "
            "thicker crystal, the beast visibly more armoured. "
            "Frame 4: back to four-square, origin-qi blazing, golden eyes burning with "
            f"ancient fury. {S}"
        ),
    },

    # ── World 5 — The Void Sea ────────────────────────────────────────────────

    "void_elemental": {
        "gen_desc": (
            "A void elemental of the void sea — a towering humanoid figure built entirely "
            "from swirling absolute darkness and streaks of deep violet void energy, no "
            "solid surface — more like the absence of light given shape, two blazing purple "
            "void-light eyes burning from within the darkness, arms of reaching void tendrils, "
            "the lower body a vortex of swirling void, rifts in space opening and closing "
            "across its surface constantly. Absolute. Cold. Consuming. "
            f"{S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a void elemental — towering humanoid of swirling "
            "absolute darkness, deep violet void streaks, blazing purple void eyes, "
            "void-tendril arms, lower body a void vortex, space rifts. All 4 frames are "
            "nearly identical — the elemental hovers in place with only micro purple eye "
            "pulse variations. "
            "Frame 1: base hover — void form still and dense, tendril arms loosely at sides, "
            "purple void eyes blazing at baseline, lower vortex spinning slowly. "
            "Frame 2: purple eyes brightening 1-2px on a slow pulse, a single small space "
            "rift blinking open and closed on the torso, nothing else moving. "
            "Frame 3: eyes returning to baseline, rift sealed, complete hovering void "
            "stillness, absolute and cold. "
            "Frame 4: identical to frame 1, the slow void pulse cycling, purple eyes "
            f"burning with consuming hunger. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a void elemental consuming with void energy. "
            "Absolute darkness form, deep violet void streaks, blazing purple eyes. "
            "Frame 1: compressing — entire void form condensing, rifts multiplying, "
            "purple eyes blazing with consuming intensity. "
            "Frame 2: void tendrils launching — arms extending as lashing tendrils of "
            "absolute darkness, void rifts opening along their length. "
            "Frame 3: the consuming strike — tendrils wrapping at full extension, void "
            "energy consuming everything at the contact point, deep purple obliteration. "
            "Frame 4: tendrils retracting, void form re-expanding, rifts sealing, "
            f"purple eyes cold with satisfaction. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a void elemental disrupted by an attack. "
            "Absolute darkness form, deep violet void streaks, blazing purple eyes. "
            "Frame 1: the hit disrupting the void — darkness scattering, purple eyes "
            "blazing wildly, rifts tearing open violently across the body. "
            "Frame 2: massive disruption — the form losing coherence, void matter "
            "dispersing, the humanoid shape fragmenting. "
            "Frame 3: reformation — void matter converging back, darkness deepening "
            "and consolidating. "
            "Frame 4: restored, the void form more dense and consuming than before, "
            f"purple eyes blazing with cold fury. {S}"
        ),
    },

    "dao_inscription_guardian": {
        "gen_desc": (
            "A dao inscription guardian — a construct that IS a living formation array, its "
            "body composed entirely of complex overlapping dao inscription patterns that glow "
            "brilliant gold-white, the shape broadly humanoid but with every surface covered "
            "in densely written inscription text that glows and shifts, no face — just a "
            "flat surface of inscription patterns with two blazing concentrated points of "
            "gold-white dao light for eyes, hands that trail floating inscription runes, "
            "the air filled with orbiting dao inscription fragments. The Dao made weapon. "
            f"{S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a dao inscription guardian — humanoid body entirely "
            "composed of glowing gold-white inscription patterns, no face, two blazing dao "
            "light eye points, hands trailing floating runes, orbiting inscription fragments. "
            "All 4 frames are nearly identical — the guardian stands in writing stillness "
            "with only a micro inscription glow pulse. "
            "Frame 1: base stance — inscription patterns glowing at steady baseline, "
            "orbiting rune fragments drifting slowly, dao light eyes blazing. "
            "Frame 2: inscription glow brightening 1-2px on a slow pulse, orbiting runes "
            "at the same slow drift, nothing else moving. "
            "Frame 3: glow returning to baseline, complete inscription stillness, "
            "perpetually writing the Dao. "
            "Frame 4: identical to frame 1, the slow inscription pulse cycling, dao "
            f"light eyes unblinking. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a dao inscription guardian launching inscription "
            "strikes. Gold-white inscription body, dao light eyes, orbiting runes. "
            "Frame 1: gathering — inscription patterns blazing intensely, orbiting runes "
            "converging into one hand, consolidating into a dense inscription spear. "
            "Frame 2: launching — the inscription spear firing from the outstretched hand, "
            "gold-white inscription energy blazing along its length. "
            "Frame 3: full impact — inscription spear detonating at the target, an "
            "explosion of gold-white dao inscription energy obliterating the point. "
            "Frame 4: hand retracting, new runes spawning and returning to orbit, "
            f"the guardian resetting. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a dao inscription guardian disrupted by an attack. "
            "Gold-white inscription body, dao light eyes, orbiting runes. "
            "Frame 1: impact — inscription patterns fragmenting at the hit point, "
            "gold-white energy discharging, orbiting runes scattering. "
            "Frame 2: the disruption propagating — inscription characters dissolving "
            "and reforming erratically, dao eyes flickering. "
            "Frame 3: the inscriptions rewriting themselves — new patterns forming over "
            "the damaged sections, orbiting runes returning to formation. "
            "Frame 4: fully restored, inscription patterns blazing more densely than "
            f"before, dao eyes burning cold and absolute. {S}"
        ),
    },

    # ── World 6 — The Open Heaven ─────────────────────────────────────────────

    "open_heaven_beast": {
        "gen_desc": (
            "An open heaven beast — a divine beast of heaven-touching power, its body a "
            "massive leonine-dragon form sheathed in scales of pure condensed heavenly qi "
            "that blaze with blinding gold-white celestial light, a grand maned head with "
            "five horns and eyes of pure gold celestial flame, enormous wings of condensed "
            "heavenly qi extending from its shoulders like divine light made solid, claws "
            "of heavenly crystal, celestial clouds and heaven-fire orbiting its body. "
            f"The power of heaven made flesh. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of an open heaven beast — divine leonine-dragon body "
            "sheathed in heavenly qi scales blazing gold-white, five-horned maned head, "
            "gold celestial flame eyes, wings of condensed heavenly qi, heaven-fire orbiting. "
            "All 4 frames are nearly identical — the beast holds its wings-half-spread "
            "stance with only a micro celestial glow pulse. "
            "Frame 1: base stance — wings half-spread, celestial scales blazing at baseline, "
            "gold celestial flame eyes forward, orbiting clouds drifting slowly. "
            "Frame 2: celestial scale glow brightening 1-2px on a slow pulse, orbiting "
            "clouds drifting at the same steady pace, nothing else moving. "
            "Frame 3: glow returning to baseline, complete divine stillness, the power of "
            "heaven contained and still. "
            "Frame 4: identical to frame 1, the slow celestial pulse cycling, gold eyes "
            f"burning with heaven-fire. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of an open heaven beast unleashing celestial divine "
            "power. Heavenly qi scales, gold celestial flame eyes, condensed qi wings. "
            "Frame 1: charging — wings snapping fully open, celestial qi blazing across "
            "every scale, gold flame eyes blazing, orbiting clouds converging into the "
            "front claws. "
            "Frame 2: the dive — wings driving downward, body angling forward, celestial "
            "qi streaming off the claws and mane. "
            "Frame 3: divine strike — claws connecting, a catastrophic explosion of "
            "gold-white celestial qi and heaven-fire obliterating the impact point. "
            "Frame 4: pulling back, wings spreading to brake, celestial qi dispersing "
            f"from claws, the divine beast resetting. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of an open heaven beast struck by a powerful attack. "
            "Heavenly qi scales, gold celestial flame eyes, divine wings. "
            "Frame 1: the hit — even this divine beast shuddering, celestial scales "
            "cracking, gold flame eyes blazing, heaven-fire discharging from the cracks. "
            "Frame 2: absorbing — scales fragmenting but celestial qi immediately "
            "rebuilding them, wings snapping open for balance. "
            "Frame 3: defences reasserting — scales rebuilding into thicker celestial "
            "crystal, heaven-fire blazing, the beast immovable. "
            "Frame 4: back to dominant stance, celestial qi blazing more intensely, "
            f"gold eyes burning with heaven's fury. {S}"
        ),
    },

    "boundary_wraith": {
        "gen_desc": (
            "A boundary wraith of the void sea's edge — a towering spectral figure at the "
            "boundary between existence and void, its form simultaneously there and not-there, "
            "body alternating between a gaunt translucent humanoid shape and pure boundary "
            "energy, wrapped in the tattered remnants of some ancient cultivator's robes "
            "that have been bleached to void-white, hollow eyes blazing with boundary "
            "energy — half gold, half void-black — hands trailing both void darkness and "
            "heaven-fire, the very boundary between worlds visible in its form. "
            f"Between everything and nothing. {S}"
        ),
        "idle_desc": (
            "4-frame idle animation of a boundary wraith — spectral figure alternating "
            "between translucent humanoid and boundary energy, void-white bleached robes, "
            "eyes half gold half void-black, hands trailing both void darkness and heaven-fire. "
            "All 4 frames are nearly identical — the wraith hovers in its in-between state "
            "with only a micro dual-fire pulse. "
            "Frame 1: base hover — form holding its translucent humanoid shape, void-black "
            "and gold fires burning at baseline in the eye sockets, hands still. "
            "Frame 2: both eye fires brightening 1-2px simultaneously on a slow pulse, "
            "nothing else moving. "
            "Frame 3: fires returning to baseline, complete hovering stillness, the boundary "
            "between everything and nothing. "
            "Frame 4: identical to frame 1, the slow dual-fire pulse cycling, the wraith "
            f"eternally between. Seamless loop. {S}"
        ),
        "attack_desc": (
            "4-frame attack animation of a boundary wraith striking with boundary energy. "
            "Flickering translucent form, void-white robes, half-gold half-void eyes, "
            "void darkness and heaven-fire hands. "
            "Frame 1: gathering — both hands pulling back, void darkness and heaven-fire "
            "converging and merging at the hands in a crackling boundary energy mass. "
            "Frame 2: launching — the merged boundary energy firing forward, void and "
            "heaven aspects swirling together in a devastating combination. "
            "Frame 3: full impact — boundary energy striking, an explosion of both void "
            "obliteration and heaven-fire consuming the impact point simultaneously. "
            "Frame 4: hands retracting, boundary energy dissipating, form resettling "
            f"to its flickering hover. {S}"
        ),
        "hit_desc": (
            "4-frame hit reaction of a boundary wraith struck by a powerful attack. "
            "Flickering translucent form, void-white robes, dual-aspect eyes and hands. "
            "Frame 1: the hit — the boundary form fragmenting violently, void and heaven "
            "aspects scattering, robes exploding outward, both fires discharging. "
            "Frame 2: destabilisation — the two aspects separating chaotically, the form "
            "flickering wildly between solid and transparent. "
            "Frame 3: the boundary reasserting — the two aspects being drawn back "
            "together, the form reconsolidating at the boundary. "
            "Frame 4: restored to the in-between hover, boundary energy blazing more "
            f"intensely than before, dual-fire eyes burning with cold boundary fury. {S}"
        ),
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Entry points
# ─────────────────────────────────────────────────────────────────────────────

def run_generate(enemy_id):
    cfg = ENEMIES[enemy_id]
    print(f"\n{'='*60}\n  {enemy_id}\n{'='*60}")
    candidates = generate_candidates(enemy_id, cfg["gen_desc"])
    print(f"\n  Candidates saved to: {TMP_DIR}")
    for i, p in enumerate(candidates):
        print(f"    cand_{i}: {p.name}")
    print(f"\n  Review, then run:")
    print(f"    python gen_sprites.py animate {enemy_id} <0-{len(candidates)-1}>")


def run_animate(enemy_id, cand_n):
    base = TMP_DIR / f"{enemy_id}_cand_{cand_n}.png"
    if not base.exists():
        raise FileNotFoundError(
            f"Candidate not found: {base}\n"
            f"Run: python gen_sprites.py generate {enemy_id}"
        )
    print(f"\nAnimating {enemy_id} from: {base.name}")
    _reanimate(enemy_id, base)


def run_reanimate_attack(enemy_id, cand_n):
    base = TMP_DIR / f"{enemy_id}_cand_{cand_n}.png"
    if not base.exists():
        raise FileNotFoundError(
            f"Candidate not found: {base}\n"
            f"Run: python gen_sprites.py generate {enemy_id}"
        )
    print(f"\nRegenerating attack for {enemy_id} from: {base.name}")
    _reanimate_attack(enemy_id, base)


def run_reanimate_hit(enemy_id, cand_n):
    base = TMP_DIR / f"{enemy_id}_cand_{cand_n}.png"
    if not base.exists():
        raise FileNotFoundError(
            f"Candidate not found: {base}\n"
            f"Run: python gen_sprites.py generate {enemy_id}"
        )
    print(f"\nRegenerating hit for {enemy_id} from: {base.name}")
    _reanimate_hit(enemy_id, base)


def run_reanimate_idle(enemy_id, cand_n):
    base = TMP_DIR / f"{enemy_id}_cand_{cand_n}.png"
    if not base.exists():
        raise FileNotFoundError(
            f"Candidate not found: {base}\n"
            f"Run: python gen_sprites.py generate {enemy_id}"
        )
    print(f"\nRegenerating idle for {enemy_id} from: {base.name}")
    _reanimate_idle(enemy_id, base)


if __name__ == "__main__":
    # python gen_sprites.py generate       <enemy_id>
    # python gen_sprites.py animate        <enemy_id> <cand_number>
    # python gen_sprites.py animate-attack <enemy_id> <cand_number>
    # python gen_sprites.py animate-hit    <enemy_id> <cand_number>
    # python gen_sprites.py animate-idle   <enemy_id> <cand_number>
    if len(sys.argv) >= 3 and sys.argv[1] == "generate":
        run_generate(sys.argv[2])
    elif len(sys.argv) == 4 and sys.argv[1] == "animate":
        run_animate(sys.argv[2], sys.argv[3])
    elif len(sys.argv) == 4 and sys.argv[1] == "animate-attack":
        run_reanimate_attack(sys.argv[2], sys.argv[3])
    elif len(sys.argv) == 4 and sys.argv[1] == "animate-hit":
        run_reanimate_hit(sys.argv[2], sys.argv[3])
    elif len(sys.argv) == 4 and sys.argv[1] == "animate-idle":
        run_reanimate_idle(sys.argv[2], sys.argv[3])
    else:
        print("Usage:")
        print(f"  python {sys.argv[0]} generate       <enemy_id>")
        print(f"  python {sys.argv[0]} animate        <enemy_id> <cand_number>")
        print(f"  python {sys.argv[0]} animate-attack <enemy_id> <cand_number>")
        print(f"  python {sys.argv[0]} animate-hit    <enemy_id> <cand_number>")
        print(f"  python {sys.argv[0]} animate-idle   <enemy_id> <cand_number>")
        print(f"\nKnown enemies ({len(ENEMIES)}):")
        for eid in ENEMIES:
            print(f"  {eid}")
