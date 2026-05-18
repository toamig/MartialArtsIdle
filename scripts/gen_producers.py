"""
gen_producers.py — Producer-lane sprite generation for MartialArtsIdle.

Generates 10 producers × 4 tier sprites = 40 PNGs, BUT only uses 10 prompts
total — each PixelLab generate call returns 4 candidates which we map to the
4 ownership tiers (Bronze / Silver / Gold / Mythic) directly.

WORKFLOW per producer:
  1. Generate candidates:
       python gen_producers.py generate <producer_id>
       → 4 candidates → tmp/producer_gen/<id>_cand_{0..3}.png
       → review visually, decide which goes to which tier

  2. Assign 4 candidates → 4 tier sprites:
       python gen_producers.py assign <producer_id> <b> <s> <g> <m>
       → e.g. `assign p_disciple 2 0 3 1` saves
           cand_2 → public/sprites/producers/p_disciple_bronze.png
           cand_0 → public/sprites/producers/p_disciple_silver.png
           cand_3 → public/sprites/producers/p_disciple_gold.png
           cand_1 → public/sprites/producers/p_disciple_mythic.png

  Batch generate all:
       python gen_producers.py generate-all

PALETTE / STYLE:
  Xianxia / wuxia oriental aesthetic. Subjects vary widely — meditating
  disciples, glowing herbs, bronze cauldrons, sect pavilions, mythical
  beasts, ancestral relics, moonshrines, sky-piercing stelae, void rifts,
  cosmic trees. Each producer's prompt is tailored to its lane identity.

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
OUT_DIR  = Path(__file__).parent.parent / "public/sprites/producers"
TMP_DIR  = Path(__file__).parent.parent / "tmp/producer_gen"
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)

TIER_NAMES = ["bronze", "silver", "gold", "mythic"]

# ─────────────────────────────────────────────────────────────────────────────
# HTTP helpers (duplicated from gen_crystals.py — could refactor later)
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
# Art-style anchor — appended to every producer description
# ─────────────────────────────────────────────────────────────────────────────

S = (
    "Xianxia pixel art, 16-bit clean lines, limited palette. Fully transparent "
    "background, generous margin around the subject. NO clouds, NO fog, NO smoke, "
    "NO sky, NO backdrop. Auras are tight halos hugging the subject's outline. "
    "Oriental wuxia. No UI, no text, no drop shadow."
)

# ─────────────────────────────────────────────────────────────────────────────
# Producer prompts — one per producer, 4 candidates returned per generation
# ─────────────────────────────────────────────────────────────────────────────

PRODUCERS = {

    # All prompts use the 4-tier-frames format. The API treats "Frame 1..4" as
    # 4 distinct outputs in described order. Each frame is one ownership tier
    # (Bronze → Silver → Gold → Mythic). Upper tiers push into majestic /
    # divine / cosmic territory so the player feels the climb.

    # ── 1. Body Tempering Disciple ────────────────────────────────────────────
    "p_disciple": {
        "size": (96, 96),
        "desc": (
            "4 progression stages of one Xianxia cultivator from novice to heavenly sovereign. Same "
            "character identity (dark hair, similar face), same proportions and viewpoint across all four. "
            "Each frame escalates power and divine ornament. "

            "Frame 1 (Bronze Novice): young cultivator in plain white robes with a simple bronze sash, "
            "kneeling in basic meditation, bare feet, dark hair in a humble topknot. Calm expression. "
            "Faint warm yellow qi-glow at the hands. No ornaments. "

            "Frame 2 (Silver Trained): same cultivator standing in a focused martial stance. Robes with "
            "embroidered bronze cuffs, jade pendant at sash. Cyan qi swirls around the hands during a "
            "breathing technique. Confident expression. "

            "Frame 3 (Gold Master Patriarch): same cultivator transformed into a master patriarch in "
            "flowing jade-and-gold sect robes with phoenix embroidery, ornate hairpin, ceremonial sword "
            "at the hip. Floating slightly above the ground in a sage's pose, hair lifting from cultivated "
            "qi. Brilliant golden aura with radiating beams, cyan qi orbs orbiting the body, glowing eyes. "

            "Frame 4 (Mythic Heavenly Sovereign): same cultivator ascended into a heavenly immortal "
            "sovereign wreathed in cosmic divinity. Nine-layered celestial silk robes with constellations "
            "and dragon motifs in violet, gold, and white. Hair flowing supernaturally upward like flames. "
            "Multi-tiered halo of stars and sutra-glyphs. Enthroned floating posture, spirit dragons "
            "coiling at his sides, blazing white eyes. "

            f"{S}"
        ),
    },

    # ── 2. Spirit Herb Garden ─────────────────────────────────────────────────
    "p_herb_garden": {
        "size": (96, 96),
        "desc": (
            "4 progression stages of one Xianxia spirit herb plant from sprout to cosmic Dao-bloom. Same "
            "plant species and silhouette across all four frames, growing more elaborate and luminous "
            "each stage. Vertical centered. "

            "Frame 1 (Bronze Sprout): young spirit-herb sprout breaking through dark earth. 2-3 small "
            "jade-green leaves on a slender stem. Faint pale-yellow qi-glow at the leaf tips. Plain "
            "earthen mound. Humble and fresh. "

            "Frame 2 (Silver Sapling): same plant taller with 5-6 broader leaves. Visible cyan qi-veins "
            "pulsing through the leaves. A small glowing bud emerging from the center. Soft cyan aura. "
            "Roots beginning to show above soil. "

            "Frame 3 (Gold Celestial Bloom): same plant matured into a glowing celestial flower atop an "
            "ornate carved jade pedestal. Massive multi-petaled bloom radiating golden-white light, broad "
            "lustrous leaves curling outward like halos. Fireflies orbiting in arcs around the canopy. "
            "Spirit-light beams shooting from the petals. "

            "Frame 4 (Mythic Cosmic Dao-Bloom): same plant ascended into the cosmic Dao-Bloom — colossal "
            "multi-tiered flower throne radiating cosmic divine light. Every petal is a glowing "
            "constellation. Sutra-glyphs orbit in concentric rings. Roots form a glowing mandala below. "
            "Halo of stars, planets, and celestial dragons encircles the canopy. "

            f"{S}"
        ),
    },

    # ── 3. Meridian Furnace / Spirit Forge ────────────────────────────────────
    "p_meridian_furnace": {
        "size": (96, 96),
        "desc": (
            "4 progression stages of one Xianxia alchemy vessel from humble brazier to cosmic divine "
            "forge. Same Chinese ding cauldron silhouette across all four frames, growing more ornate "
            "and powerful each stage. Vertical centered. "

            "Frame 1 (Bronze Brazier): humble three-legged stone brazier with simple unadorned bowl. "
            "Small orange-red flames flickering on top. Faint smoke. Plain weathered grey stone on a "
            "stone tile. No carvings. "

            "Frame 2 (Silver Cauldron): same vessel evolved into a small bronze tripod ding with simple "
            "carved geometric patterns on the rim. Brighter red-gold flames, embers floating up. "
            "Patina-green tint on the bronze. "

            "Frame 3 (Gold Imperial Ding): same cauldron transformed into a magnificent imperial ding "
            "with full dragon sculptures coiling along the body and handles, gold-leaf engravings, "
            "brilliant runes pulsing. Vivid orange-gold flames roaring upward, smoke shaped into dragons "
            "and phoenixes spiraling around the cauldron. "

            "Frame 4 (Mythic Heavenly Forge): same cauldron transcended into a heavenly divine forge — "
            "massive multi-tiered ding with cosmic runes, dragon and phoenix spirit-beings emerging "
            "fully from the smoke, violet-gold-white cosmic flames erupting upward into a star-filled "
            "void. Floats on a halo of golden mandalas. Constellations swirl around. "

            f"{S}"
        ),
    },

    # ── 4. Mortal Sect Followers / Sacred Temple ──────────────────────────────
    # 128x128: temple architecture needs the extra pixels for statues, columns,
    # carved screens, etc. Tier 4 is intentionally a dramatic compositional
    # leap (floating multi-pagoda complex) rather than just "more tiers".
    "p_sect_followers": {
        "size": (128, 128),
        "desc": (
            "4 evolution stages of one Xianxia / Buddhist sacred temple, from humble roadside "
            "shrine to divine floating temple complex. SACRED TEMPLE feel — visible Buddhist / "
            "Taoist iconography (statues, lion-guardians, prayer flags, lanterns). Each stage "
            "visibly distinct in scale AND composition. Isometric 3/4 view, depth shading, never "
            "flat. "

            "Frame 1 (Bronze ROADSIDE SHRINE): tiny single-room stone shrine with curved grey-"
            "tile roof, wooden door, plain stone altar in front, small bronze incense burner. "
            "Smallest, most modest. "

            "Frame 2 (Silver SECT TEMPLE): proper SMALL temple — one main hall with red lacquer "
            "columns, green curved tile roof with carved finials, stone steps, pair of stone "
            "LION-GUARDIANS flanking the steps, lit paper lantern at the entrance. Visible side "
            "wall. Clearly larger and more sacred than Bronze. "

            "Frame 3 (Gold GRAND TEMPLE): magnificent THREE-tier pagoda temple — sweeping golden-"
            "tile eaves on every level, deep-red lacquer columns with dragon/phoenix motifs, "
            "prayer flags strung across, glowing lanterns at every tier, golden bell at the "
            "front, seated stone buddha-statue silhouette through the lowest entrance. Tight "
            "golden halo. "

            "Frame 4 (Mythic CELESTIAL COMPLEX): divine FLOATING temple — central tall celestial "
            "pagoda flanked by two smaller shrine pagodas at lower levels (clearly a complex, "
            "not one building). White-jade walls, golden-jade tile eaves, glowing phoenix "
            "screens, golden roofs. Tight ring of sutra-glyphs around the central tier. Glowing "
            "lotus mandala disc as floating base. DRAMATIC leap beyond gold. "

            f"{S}"
        ),
    },

    # ── 5. Spirit Beast Pact / Beast Sanctuary ────────────────────────────────
    "p_beast_pact": {
        "size": (96, 96),
        "desc": (
            "4 progression stages of one Xianxia spirit beast from humble cub to divine cosmic guardian. "
            "Same beast lineage and silhouette across all four frames, growing larger and more powerful "
            "each stage. Side-on view, centered. "

            "Frame 1 (Bronze Spirit Cub): small white tiger cub or fox kit with subtle qi-stripes "
            "glowing faintly. Sitting alertly, large eyes, fluffy fur. Faint warm glow at the paws. "
            "Humble, gentle. Plain stone ground. "

            "Frame 2 (Silver Spirit Beast): same beast grown to medium adult — sleek white tiger or "
            "nine-tailed fox with visible qi-stripes flowing along its body. Mid-prowl pose, alert "
            "posture. Soft cyan-white aura. Confident hunter's stance. "

            "Frame 3 (Gold Sacred Guardian): same beast transformed into a sacred guardian — massive "
            "battle-scarred white tiger with armor-plates carved with sutras, or majestic nine-tailed "
            "fox with each tail glowing a different color. Crouched in a powerful stance, brilliant "
            "golden aura, fangs bared, spirit flames swirling around the paws. "

            "Frame 4 (Mythic Divine Beast): same beast ascended into a cosmic divine beast — colossal "
            "celestial dragon-tiger or nine-tailed fox queen, body wreathed in stars and cosmic runes, "
            "multi-tiered halo of light around the head, spirit-fire trailing from the mane, cosmic "
            "eyes blazing. Floating above a halo of mandalas. "

            f"{S}"
        ),
    },

    # ── 6. Ancestral Treasure / Ancestral Pagoda ──────────────────────────────
    "p_treasure": {
        "size": (96, 96),
        "desc": (
            "4 progression stages of one Xianxia ancestral relic from humble keepsake to cosmic divine "
            "artifact. Same relic category on a carved pedestal across all four frames. Centered, full "
            "pedestal and relic visible. "

            "Frame 1 (Bronze Keepsake): a small jade pendant or simple bronze trinket resting on a plain "
            "wooden altar. Faint warm gold-jade glimmer in the stone. Humble offering bowl beside. "
            "Simple wood grain. Quiet and unassuming. "

            "Frame 2 (Silver Heirloom): same relic evolved into a finer ornament — carved jade pendant "
            "with engraved sutras, or polished bronze mirror with sect insignia. Soft cyan aura. "
            "Resting on a carved stone altar with incense smoke curling up. "

            "Frame 3 (Gold Sacred Treasure): same relic transformed into a glowing sacred treasure — "
            "ancient sword in a lacquered scabbard radiating golden aura, or celestial bell with carved "
            "dragons. Resting on an ornate jade pedestal with gold-leaf engravings. Brilliant golden "
            "halo, sutra-runes orbiting around it. "

            "Frame 4 (Mythic Cosmic Artifact): same relic ascended into a cosmic divine artifact — "
            "massive multi-tiered sacred treasure radiating cosmic-violet and gold light, surrounded by "
            "a halo of floating glyphs, mandalas, and stars. The pedestal floats above the ground on a "
            "cloud of divine qi. Reality bends around the artifact. "

            f"{S}"
        ),
    },

    # ── 7. Slumbering Spirit Dragon ───────────────────────────────────────────
    # 128x128: this subject (long sinuous dragon with antlers/whiskers/mane
    # coiled around a pearl) carries more detail than the compact subjects of
    # the other producers — 96 isn't enough pixel real-estate to render it
    # crisply. Higher canvas → final sprite is also 128x128. Lane CSS scales
    # to the same on-screen width as the others.
    "p_dragon": {
        "size": (128, 128),
        "desc": (
            "4 evolution stages of one Xianxia sky dragon (Shenlong / Rayquaza style: no wings, "
            "serpentine body, four-clawed feet, antler horns, whiskers, mane along spine). "
            "EMERALD-GREEN palette across all four. Like Pokemon evolutions — same lineage but "
            "visibly distinct in body proportions, ornament count, and silhouette. Coiled around "
            "a pearl orb. Side-on view, centered. "

            "Frame 1 (Bronze WYRMLING): tiny just-hatched baby — plump short body, oversized "
            "round head, big innocent yellow eyes, simple horn buds, no whiskers, dull moss-"
            "green scales. Coiled loosely around a tiny grey stone orb. Smallest, youngest. "

            "Frame 2 (Silver ADOLESCENT): same dragon longer/leaner — about 3x longer than "
            "Bronze, brighter emerald scales, small but proper antler horns, short forming "
            "whiskers, sharper eyes. Tighter spiral around a small jade-green pearl. Pale-green "
            "halo. Awkward teen stage. "

            "Frame 3 (Gold ADULT SHENLONG): full majestic adult form — long graceful Shenlong "
            "body, ornate multi-pronged antler crown, very long flowing whiskers, jade scales "
            "with prominent GOLDEN UNDERBELLY (yellow plates) and golden mane along the spine, "
            "sharp gold claws. Coiled in elegant s-curves around a brilliant golden pearl. "
            "Mature regal pose. "

            "Frame 4 (Mythic COSMIC SOVEREIGN): god form — EVEN LONGER body with extra fin-"
            "spikes along the spine, SECOND pair of smaller antlers behind the main crown, "
            "deep emerald scales showing constellations and star-points, massive golden "
            "underbelly, mane like cosmic green flame, gold claws. Coiled around a colossal "
            "glowing cosmic pearl emanating green-gold light. Tight ring of sutra-glyphs orbits "
            "the halo. Unmistakably grander than the adult. "

            f"{S}"
        ),
    },

    # ── 8. Heavenly Pillar / Sky-Piercing Stele ───────────────────────────────
    # 128x128: ornate carvings + dragon relief read crisper than at 96.
    "p_pillar": {
        "size": (128, 128),
        "desc": (
            "4 evolution stages of one Xianxia stele, like Pokemon evolutions — same lineage but "
            "each stage visibly distinct in HEIGHT, ornament, and divinity. Vertical centered, "
            "full pillar from top to bottom inside the frame, generous margin on all sides. "

            "Frame 1 (Bronze STONE MARKER): SHORT weathered grey-stone pillar, faint barely-"
            "readable sutra inscriptions on the shaft, plain square stone base. Standing alone on "
            "a small rocky patch. Smallest, plainest, most ancient. "

            "Frame 2 (Silver CARVED STELE): clearly TALLER refined pillar — polished blue-grey "
            "shaft with deeper-cut sutra carvings glowing jade-green, carved spiral patterns "
            "running up the shaft, simple lotus-cap top, square base with carved trim. Soft cyan "
            "halo hugging the outline. "

            "Frame 3 (Gold HEAVENLY PILLAR): EVEN TALLER ornate carved gold-and-jade column — "
            "dragon and phoenix relief sculptures coiling up the full shaft, blazing golden runes "
            "pulsing along the carvings, ornate lotus-crown top with curling jade flames, carved "
            "stone base with golden trim. Tight golden halo hugging the pillar's full length. "

            "Frame 4 (Mythic COSMIC AXIS MUNDI): TALLEST divine ascended form — colossal carved "
            "stone column with FULL-RELIEF spirit-dragon sculptures coiling around its length, "
            "violet-and-gold cosmic runes blazing across every facet, multi-tiered lotus crown at "
            "the top with a glowing sutra-orb, tiered carved base. Tight concentric ring of "
            "sutra-glyphs and small star-points orbits at midshaft, all within the subject "
            "outline. Unmistakably grander than the gold pillar. "

            f"{S}"
        ),
    },

    # ── 9. Void Conduit / Void Gate ───────────────────────────────────────────
    "p_void": {
        "size": (96, 96),
        "desc": (
            "4 progression stages of one Xianxia void rift from a small crack in reality to a colossal "
            "cosmic gate. Same swirling void portal silhouette across all four frames, growing more "
            "ornate and powerful each stage. Centered. "

            "Frame 1 (Bronze Void Crack): small jagged crack in a worn stone wall, faint purple light "
            "leaking out. Soft violet aura at the edges. Simple stone framing. Humble and ominous. "

            "Frame 2 (Silver Void Portal): same rift evolved into a swirling purple-black portal framed "
            "by carved dao-symbol stones. Glowing magenta edges, faint star fragments visible inside "
            "the swirl. Soft indigo aura. "

            "Frame 3 (Gold Void Gate): same portal transformed into an ornate stone pailou-style gate "
            "frame with sutra-carved pillars, a full violet-black vortex inside swirling with stars and "
            "cosmic energy. Glowing magenta and gold edges, jagged dark fragments orbiting. Brilliant "
            "violet aura. "

            "Frame 4 (Mythic Cosmic Rift): same gate ascended into a colossal cosmic rift tearing "
            "reality itself — vast star-filled void visible beyond, galaxies and nebulae spiraling "
            "within, dragon-shadows emerging from the void. Gate frame wreathed in cosmic violet and "
            "gold flames. Sutra-runes orbit in concentric rings. "

            f"{S}"
        ),
    },

    # ── 10. Sovereign Phoenix (Fenghuang, Ho-Oh inspired) ────────────────────
    # 128x128. Counterpart to the tier-7 Slumbering Dragon (yin-yang pair).
    # Ho-Oh inspired: self-contained phoenix, wings spread, no perch/pedestal.
    # Identifying features: hooked beak, ornate feather crest, long flowing
    # rainbow-tipped tail feathers, spread wings (mid-flight or majestic pose).
    "p_phoenix": {
        "size": (128, 128),
        "desc": (
            "4 escalating stages of the Fenghuang (Ho-Oh inspired sovereign phoenix). Apex "
            "celestial conduit — channels cosmic qi: stars in the wings, sun-disc aloft, "
            "beams of qi streaming. Self-contained bird, NO perch. Hooked beak, feather "
            "crest, long tail, spread wings. Centered. ONE bird per frame — NO fragments. "
            "NO halo backdrop. "

            "Frame 1 (Bronze CHICK): tiny fluffy phoenix chick on its own legs — round "
            "body, fuzzy red down, tiny hooked beak, big eyes, wing-nubs, stubby tail. "
            "Single tiny GLOWING STAR in its chest. Smallest. "

            "Frame 2 (Silver YOUNG PHOENIX): adolescent in mid-air, wings partially "
            "spread — slim red-orange feathers, small feather crest, tail half body with "
            "green-blue tips. Glowing star-specks scattered in the wing feathers. ~4x chick. "

            "Frame 3 (Gold ADULT FENGHUANG): majestic full-grown phoenix airborne, WINGS "
            "FULLY SPREAD Ho-Oh-style — rainbow-tipped tail (red/blue/green/yellow/white), "
            "feather crown, golden hooked beak, red-gold plumage. NEBULAE and "
            "CONSTELLATIONS inside the spread wings. Small glowing SUN-DISC held aloft "
            "above the bird, beams of starlight streaming down. "

            "Frame 4 (Mythic COSMIC CHANNELER): colossal RADICAL ascended — multi-tier "
            "feather crown, cosmic plumage in red-violet-gold with swirling GALAXIES "
            "inside the massive spread wings. Rainbow tail fanned like peacock. Brilliant "
            "SUN-DISC held aloft, streams of celestial qi cascading down through the "
            "wings. Small orbital firebirds. Apex of celestial channeling. "

            f"{S}"
        ),
    },

}

# ─────────────────────────────────────────────────────────────────────────────
# Image helpers
# ─────────────────────────────────────────────────────────────────────────────

def crop_transparent_edges(img):
    """Crop fully-transparent rows/cols on every side; returns the bbox image."""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    w, h = img.size
    pixels = img.load()

    def row_has_content(y):
        for x in range(w):
            if pixels[x, y][3] > 4:
                return True
        return False

    def col_has_content(x):
        for y in range(h):
            if pixels[x, y][3] > 4:
                return True
        return False

    left  = next((x for x in range(w)           if col_has_content(x)), 0)
    right = next((x for x in range(w-1, -1, -1) if col_has_content(x)), w - 1)
    top   = next((y for y in range(h)           if row_has_content(y)), 0)
    bot   = next((y for y in range(h-1, -1, -1) if row_has_content(y)), h - 1)

    cropped = img.crop((left, top, right + 1, bot + 1))
    return cropped


def pad_to_square(img, side):
    """Center an image inside a side×side transparent canvas. Keeps tier sprites
    visually aligned in the lane (no x/y drift between tiers on swap)."""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    cw, ch = img.size
    # Fit-shrink if the cropped image somehow exceeds the side.
    if cw > side or ch > side:
        img.thumbnail((side, side), Image.NEAREST)
        cw, ch = img.size
    ox = (side - cw) // 2
    oy = (side - ch) // 2
    canvas.paste(img, (ox, oy), img)
    return canvas

# ─────────────────────────────────────────────────────────────────────────────
# Pipeline steps
# ─────────────────────────────────────────────────────────────────────────────

def run_generate(producer_id):
    if producer_id not in PRODUCERS:
        raise ValueError(f"Unknown producer '{producer_id}'. Known: {list(PRODUCERS)}")

    cfg = PRODUCERS[producer_id]
    w, h = cfg["size"]

    print(f"\n{'='*60}")
    print(f"  Generating: {producer_id}  ({w}×{h})")
    print(f"{'='*60}")

    body = {
        "description":   cfg["desc"],
        "image_size":    {"width": w, "height": h},
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
        path = TMP_DIR / f"{producer_id}_cand_{i}.png"
        save_image(img, path)
        print(f"    cand_{i}: {path.name}  ({img['width']}×{img['height']})")

    print(f"\n  Review the candidates, decide which goes to which tier, then run:")
    print(f"    python gen_producers.py assign {producer_id} <bronze> <silver> <gold> <mythic>")
    print(f"  Example: assign {producer_id} 2 0 3 1  (visually weakest → strongest)")


def run_finalize(producer_id):
    """Auto-assign cand_0→bronze, cand_1→silver, cand_2→gold, cand_3→mythic.
    Used when the prompt is in 4-tier progression format and the API respects
    the per-frame ordering. Equivalent to `assign <id> 0 1 2 3`."""
    return run_assign(producer_id, 0, 1, 2, 3)


def run_assign(producer_id, b, s, g, m):
    """Assign 4 candidates to the 4 tier slots and save into public/sprites/producers/."""
    if producer_id not in PRODUCERS:
        raise ValueError(f"Unknown producer '{producer_id}'. Known: {list(PRODUCERS)}")

    cands = [int(b), int(s), int(g), int(m)]
    cfg = PRODUCERS[producer_id]
    side = max(cfg["size"])

    print(f"\n  Assigning {producer_id} candidates → tier sprites...")
    for tier_idx, cand_n in enumerate(cands):
        src = TMP_DIR / f"{producer_id}_cand_{cand_n}.png"
        if not src.exists():
            raise FileNotFoundError(f"Candidate not found: {src}")

        img = Image.open(src).convert("RGBA")
        img = crop_transparent_edges(img)
        img = pad_to_square(img, side)

        tier = TIER_NAMES[tier_idx]
        out_path = OUT_DIR / f"{producer_id}_{tier}.png"
        img.save(str(out_path))
        print(f"    cand_{cand_n} → {out_path.name}  ({img.size[0]}×{img.size[1]} RGBA, tier={tier})")

    print(f"\n  Done. Update src/data/producers.js → sprites for {producer_id}:")
    print(f"    sprites: [")
    for tier in TIER_NAMES:
        print(f"      '/sprites/producers/{producer_id}_{tier}.png',")
    print(f"    ],")


def run_generate_all():
    print(f"\n  Generating all {len(PRODUCERS)} producers sequentially...")
    print(f"  Each takes ~30-90s. Total time ~10-15 minutes.\n")
    for producer_id in PRODUCERS:
        try:
            run_generate(producer_id)
        except Exception as e:
            print(f"\n  ERROR on {producer_id}: {e}")
            print("  Continuing with next...")
    print(f"\n  All generated. Review candidates and assign each:")
    for pid in PRODUCERS:
        print(f"    python gen_producers.py assign {pid} <b> <s> <g> <m>")


def run_show_prompts():
    """Dump all the prompts so the user can review them without burning credits."""
    print(f"\n{'='*60}\n  Prompt review — {len(PRODUCERS)} producers\n{'='*60}\n")
    for pid, cfg in PRODUCERS.items():
        print(f"── {pid} ─────────────────────────────────")
        print(f"  size: {cfg['size'][0]}×{cfg['size'][1]}")
        print(f"  desc:")
        for line in cfg["desc"].split(". "):
            line = line.strip()
            if line:
                print(f"    {line}.")
        print()

# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) == 2 and args[0] == "generate":
        run_generate(args[1])
    elif len(args) == 2 and args[0] == "finalize":
        run_finalize(args[1])
    elif len(args) == 6 and args[0] == "assign":
        run_assign(args[1], args[2], args[3], args[4], args[5])
    elif len(args) == 1 and args[0] == "generate-all":
        run_generate_all()
    elif len(args) == 1 and args[0] == "prompts":
        run_show_prompts()
    else:
        print("Usage:")
        print(f"  python {sys.argv[0]} prompts                                  — preview all prompts (no API cost)")
        print(f"  python {sys.argv[0]} generate <producer_id>                   — 4 candidates → tmp/")
        print(f"  python {sys.argv[0]} finalize <producer_id>                   — auto-assign 0/1/2/3 → bronze/silver/gold/mythic")
        print(f"  python {sys.argv[0]} assign <producer_id> <b> <s> <g> <m>     — manual override (which cand → which tier)")
        print(f"  python {sys.argv[0]} generate-all                             — batch generate all 10")
        print(f"\nKnown producers ({len(PRODUCERS)}):")
        for pid in PRODUCERS:
            print(f"  {pid}")
