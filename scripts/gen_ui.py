"""
gen_ui.py — Pixel art UI element generation pipeline for MartialArtsIdle.

WORKFLOW (2 steps per element):
  1. Generate candidates:
       python gen_ui.py generate <element_id>
       → calls generate-image-v2 or generate-ui-v2, saves candidate PNGs to TMP_DIR
       → review candidates, pick the best one

  2. Finalize chosen candidate:
       python gen_ui.py finalize <element_id> <cand_number>
       → crops transparent edges, saves to public/ui/<element_id>.png

ELEMENTS:
  card_frame      — Ornate oriental card border (technique slots)
  panel_scroll    — Parchment/stone scroll panel background
  btn_stone       — Carved stone action button
  bar_frame       — HP bar end-cap / decorative frame
  qi_bar_half     — Left half of the cultivation QI bar (mirror in CSS for right half)

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

    # ── Cultivation QI bar (half, mirrored in CSS to cover full width) ──────
    "qi_bar_half": {
        "size": (256, 48),
        "api_path": "/generate-ui-v2",
        "color_palette": "dark jade green and aged bronze gold",
        "desc": (
            "A pixel art LEFT HALF of a qi cultivation progress bar for a xianxia game. "
            "This is a HEALTH BAR style element — thick, heavy, stone channel construction. "
            "The bar must have substantial lips (8-10 px each), not thin rails. "
            "This half will be mirrored horizontally in code to form the full bar: "
            "  - LEFT SIDE: ornate decorated end-cap (dragon head). "
            "  - RIGHT SIDE: perfectly flat vertical cut — no decoration, straight edge for mirroring. "
            "INTERIOR CHANNEL: the horizontal strip in the centre must be fully TRANSPARENT (alpha=0). "
            "This transparent gap is where the animated qi fill colour will show through. "
            "The bar cross-section from top to bottom: "
            "  [8px top lip: carved dark jade stone + bronze edge highlight] "
            "  [10px TRANSPARENT interior channel — alpha=0, completely see-through] "
            "  [8px bottom lip: carved dark jade stone + bronze edge highlight] "
            "LEFT end-cap: a jade dragon head in profile, facing RIGHT, mouth open. "
            "The dragon head protrudes 12-16 px beyond the bar's left edge. "
            "The head is carved jade and bronze, matching the established UI palette. "
            "Palette: dark jade green (#1a4040 range), aged bronze-gold border/accents, "
            "charcoal (#111) outline, faint gold pixel on the very top edge. "
            f"{S}"
        ),
    },

    # ── Same bar but via generate-image-v2 + post-processed channel carve ─────
    "qi_bar_half_v2": {
        "size": (256, 44),
        "carve_channel": True,
        "carve_channel_kwargs": {"scan_x_pct": (0.30, 0.80), "lip_threshold": 30},
        "desc": (
            "A pixel art LEFT HALF of a cultivation qi progress bar for a xianxia idle game. "
            "CRITICAL: This is a horizontal bar frame, symmetrical — only the LEFT HALF is shown. "
            "The rightmost pixels must form a perfectly straight vertical cut (no end-cap on the right). "
            "LEFT end-cap: ornate jade-and-bronze dragon head in profile, mouth open, facing RIGHT. "
            "This matches the existing bar_frame style (same dragon head end-cap). "
            "The bar body is a thick carved dark jade trough: "
            "  - Top lip: 5 px carved dark jade with cloud-scroll engraving, bronze top-edge accent. "
            "  - Interior channel: 8-10 px tall, fully TRANSPARENT (alpha = 0). "
            "  - Bottom lip: 5 px carved dark jade, bronze bottom-edge accent. "
            "The trough walls are thick stone — the bar must look heavy and ceremonial, "
            "not thin or wireframe. This is the main cultivation meter, more prominent than an HP bar. "
            "Palette: dark jade green (#1a4a3a range), aged bronze-gold (#8a6020 range), "
            "charcoal outline (#1a1a1a), faint gold highlight on top lip edge. "
            "Transparent background outside the bar element. "
            f"{S}"
        ),
    },

    # ── Cultivation upgrade icons (128×128, sit in cs-up-card top-centre) ─────
    # Style anchor for all upgrade_* icons:
    #   - Same "carved jade + bronze" treatment as card_frame / btn_stone.
    #   - One clear central motif, readable at 76px display.
    #   - Transparent background. Slight bronze ring or stone base around the
    #     motif so each icon reads as a coherent emblem on the dark card.

    "upgrade_focus": {
        "size": (128, 128),
        "desc": (
            "A pixel art emblem icon for a xianxia cultivation game upgrade — Deep Focus / "
            "Deeper Breath. Centred composition on transparent background. "
            "Subject: a single large stylised third-eye viewed front-on, centred in the icon. "
            "The eye is almond-shaped, narrowed in deep focused concentration (not wide open). "
            "Eyelid edges are carved bronze-gold lines; lashes are short angular bronze pixels. "
            "Inside the eye is a dark jade-green iris with a thin bronze-gold inner rim. "
            "At the centre of the iris sits a tight bright pinpoint of pale cyan qi — only 2-3 "
            "pixels — surrounded by a single faint cyan glow ring (the focused point of qi). "
            "Above the eye, a small forehead mark — a tiny vertical bronze tear-drop gem. "
            "Treatment: thick charcoal outline, flat colour fills, no gradients. "
            "Symmetrical, mystical, intense — the icon must read as 'concentrated inward focus'. "
            "Surround everything with a thin aged bronze-gold circular ring border like a carved "
            "bronze coin, with 4 tiny stud notches at N/S/E/W. The interior of the ring (around "
            "the eye) is fully transparent so the eye sits cleanly on the dark card. "
            "Palette: dark jade green (#0f2520), aged bronze-gold (#8a5a2a), pale cyan qi "
            "highlight (#7adcc4), charcoal outline (#111). No red, no purple, no grey stone, "
            "no human face/skin — just the eye motif. "
            f"{S}"
        ),
    },

    "upgrade_divine_qi": {
        "size": (128, 128),
        "desc": (
            "A pixel art emblem icon for a xianxia cultivation game upgrade — Divine Qi. "
            "Match the reference image's overall composition: a circular jade-green and bronze "
            "badge framing a clear centred subject. "
            ""
            "BORDER: jade-green ring with engraved cloud-scroll relief, four small bronze "
            "stud notches at N/S/E/W, tiny bronze tear-drop gem at the top (12 o'clock). "
            ""
            "SUBJECT (inside the ring): a single radiant celestial orb floating centred. "
            "The orb is a solid bright bronze-gold circle with a brighter pale-cyan core "
            "highlight. Around the orb, 8 sharp golden rays radiate outward in a starburst — "
            "long thin triangular spikes at N/NE/E/SE/S/SW/W/NW. Between the long rays, "
            "shorter secondary rays fill the gaps for a 16-point sunburst feel. "
            "Below the orb, a small bronze cloud-scroll motif (two curling waves) acts as a "
            "base, suggesting the orb hovers above clouds. "
            "Background behind the orb is deep charcoal-black so the gold and cyan pop with "
            "strong contrast. "
            ""
            "Treatment: thick charcoal outlines, flat colour fills, no gradients. "
            "Perfectly symmetrical. Reads as 'a divine sun orb radiating qi above clouds'. "
            ""
            "Palette: jade green (#0f2520) badge ring, bright bronze-gold (#c08a3a) orb + "
            "rays + cloud-scroll + gem + studs, pale cyan qi highlight (#7adcc4) orb core, "
            "deep charcoal (#0a0a0a) interior background, charcoal outline (#111). "
            "No red, no purple, no grey stone, no human figure. "
            f"{S}"
        ),
    },

    "upgrade_consecutive_focus": {
        "size": (128, 128),
        "desc": (
            "A pixel art emblem icon for a xianxia cultivation game upgrade — Consecutive Focus. "
            "Match the reference image's overall composition: a circular jade-green and bronze "
            "badge framing a clear centred subject. "
            ""
            "BORDER: jade-green ring with engraved cloud-scroll relief, four small bronze "
            "stud notches at N/S/E/W, tiny bronze tear-drop gem at the top (12 o'clock). "
            ""
            "SUBJECT (inside the ring): three concentric circular meditation rings stacking "
            "outward from a single bright pale-cyan qi pinpoint at the dead centre. "
            "Innermost ring is small and pale cyan; middle ring is medium and bronze-gold; "
            "outermost ring is largest and a slightly deeper bronze with a faint cyan glow "
            "highlight on its top edge. Each ring is a thin clean line (2-3 pixels), evenly "
            "spaced. Between the rings, four short bronze chevron tick marks at N/S/E/W "
            "between the middle and outer rings suggest the rings are 'snapping into place' "
            "as focus deepens. "
            "Background behind the rings is deep charcoal-black so the cyan and bronze pop "
            "with strong contrast. "
            ""
            "Treatment: thick charcoal outlines, flat colour fills, no gradients. "
            "Perfectly symmetrical. Reads as 'stacking focus aura tightening around a qi point'. "
            ""
            "Palette: jade green (#0f2520) badge ring, bronze-gold (#8a5a2a) middle/outer "
            "rings + gem + studs + chevrons, pale cyan qi highlight (#7adcc4) inner ring + "
            "centre point + outer-ring top highlight, deep charcoal (#0a0a0a) interior "
            "background, charcoal outline (#111). No red, no purple, no grey stone, no "
            "human figure. "
            f"{S}"
        ),
    },

    "upgrade_crystal_click": {
        "size": (128, 128),
        "desc": (
            "A pixel art emblem icon for a xianxia cultivation game upgrade — Crystal Reservoir. "
            "Match the reference image's overall composition: a circular jade-green and bronze "
            "badge framing a clear centred subject. "
            ""
            "BORDER: jade-green ring with engraved cloud-scroll relief, four small bronze "
            "stud notches at N/S/E/W, tiny bronze tear-drop gem at the top (12 o'clock). "
            ""
            "SUBJECT (inside the ring): a small wuxia-style cultivation gourd / hulu flask "
            "viewed head-on, centred and upright. The gourd is hourglass-shaped: a small "
            "round top bulb joined to a larger round bottom bulb by a narrow waist. It has "
            "a tiny bronze stopper/cork at the very top and a small bronze hanging cord ring. "
            "The gourd body is dark jade-green with a thick charcoal outline. "
            ""
            "The gourd is half to two-thirds full of glowing pale-cyan qi liquid that fills "
            "the bottom bulb and rises into the waist. From above the gourd, three or four "
            "pale-cyan qi droplets are mid-fall, dripping DOWN toward the open stopper — "
            "showing that the reservoir is actively being filled. "
            "Background behind the gourd is deep charcoal-black so the cyan qi pops with "
            "strong contrast. "
            ""
            "Treatment: thick charcoal outlines, flat colour fills, no gradients. "
            "Symmetrical horizontally. Reads as 'qi droplets fill the reservoir gourd'. "
            ""
            "Palette: jade green (#0f2520) badge ring + gourd body, bronze-gold (#8a5a2a) "
            "stopper, cord ring, gem, studs, pale cyan qi highlight (#7adcc4) qi liquid + "
            "droplets, deep charcoal (#0a0a0a) interior background, charcoal outline (#111). "
            "No red, no purple, no grey stone. "
            f"{S}"
        ),
    },

    "upgrade_pattern_click": {
        "size": (128, 128),
        "desc": (
            "A pixel art emblem icon for a xianxia cultivation game upgrade — Tracing Meridians. "
            "Match the reference image's overall composition: a circular jade-green and bronze "
            "badge framing a clear centred subject. "
            ""
            "BORDER: jade-green ring with engraved cloud-scroll relief, four small bronze "
            "stud notches at N/S/E/W, tiny bronze tear-drop gem at the top (12 o'clock). "
            ""
            "SUBJECT (inside the ring): five glowing bronze-gold acupressure nodes arranged "
            "in a small five-point constellation pattern. Each node has a bright pale-cyan "
            "qi pinpoint at its centre. Thin curving pale-cyan qi lines flow from node to "
            "node connecting them in a single traced path. The subject sits on a dark "
            "charcoal-black background (NOT jade) so the cyan and bronze pop with strong "
            "contrast — no body silhouette behind the nodes. "
            ""
            "Treatment: thick charcoal outlines, flat colour fills, no gradients. "
            "Symmetrical. Reads as 'glowing meridian points joined by traced qi'. "
            ""
            "Palette: jade green (#0f2520) badge ring only, bronze-gold (#8a5a2a) nodes/gem/studs, "
            "pale cyan qi highlight (#7adcc4) qi lines and node centres, deep charcoal (#0a0a0a) "
            "interior background, charcoal outline (#111). No red, no purple, no grey stone. "
            f"{S}"
        ),
    },

    "upgrade_crystal_tap": {
        "size": (128, 128),
        "desc": (
            "A pixel art emblem icon for a xianxia cultivation game upgrade — Refined Tap. "
            "Centred composition on transparent background. "
            ""
            "BORDER (must match the established upgrade-icon style): a thick aged bronze-gold "
            "circular ring filling the outer ~20% of the icon, covered all the way around with "
            "carved cloud-scroll relief patterns in slightly darker bronze. Four small dark "
            "jade-green square stud notches embedded at N/S/E/W positions on the ring. A tiny "
            "bronze-gold tear-drop gem sits centred at the very top of the ring (12 o'clock). "
            "The interior of the ring is fully transparent. "
            ""
            "SUBJECT (inside the ring): a single pointing finger — jade-green stylised hand "
            "silhouette, just the index finger and partial palm visible from the TOP of the "
            "icon — reaching DOWN to tap the apex of a small upright hexagonal qi crystal "
            "sitting at the bottom-centre. At the point of contact between fingertip and "
            "crystal apex, a sharp bright burst of pale cyan qi explodes outward — 5-6 "
            "short angular cyan spark lines radiating like a strike-impact starburst. "
            "The crystal: small upright hexagonal prism, deep jade-blue body, bronze-gold "
            "facet edge lines, bright cyan glow visible through it. The crystal sits on a "
            "tiny bronze pedestal base. "
            ""
            "Treatment: thick charcoal outlines, flat colour fills, no gradients. "
            "Symmetrical horizontally. Reads as 'finger strikes crystal → sharp qi burst'. "
            ""
            "Palette: aged bronze-gold (#8a5a2a) for the border, pedestal, gem, "
            "jade green (#0f2520) for the hand and ring studs, "
            "deep jade-blue (#1a3a55) for the crystal body, "
            "pale cyan qi highlight (#7adcc4) for the burst and crystal core, "
            "charcoal outline (#111). No red, no purple, no grey stone, no human face. "
            f"{S}"
        ),
    },

    # ── Cultivation QI bar — red lacquer & gold, matching cultivation bg ──────
    "qi_bar_red": {
        "size": (320, 60),
        "carve_channel": True,
        "carve_channel_kwargs": {"scan_x_pct": (0.65, 0.92), "lip_threshold": 35},
        "desc": (
            "Pixel art LEFT HALF of the main qi bar for a xianxia cultivation game. "
            "Mirrored in code — RIGHT EDGE must be a perfectly flat vertical cut, no decoration. "
            "PALETTE: deep crimson lacquer and bright gold only. No jade, no stone, no bronze. "
            ""
            "LEFT END-CAP (~25% of width): Large gold dragon head in profile facing RIGHT. "
            "Taller than the bar body. Detailed scales, open jaws. "
            "A circular gold dragon-pearl disc sits behind the jaw. Neck flows into bar body. "
            ""
            "BAR BODY CROSS-SECTION (top to bottom): "
            "[1px bright gold edge line at very top] "
            "[Top lip 10px: crimson lacquer with FULL-LENGTH decoration: "
            "  continuous gold cloud-scroll relief line just below top edge; "
            "  5 evenly-spaced gold circular boss studs (4px) across the lip; "
            "  diamond-lattice pattern pressed into crimson between studs; "
            "  1px lighter-crimson highlight on top face for lacquer sheen] "
            "[1px bright gold inner border — top of channel] "
            "[Channel 18px: solid dark crimson — carved transparent in post-processing] "
            "[1px bright gold inner border — bottom of channel] "
            "[Bottom lip 10px: identical to top lip — same studs, same cloud-scroll, same lattice] "
            "[1px bright gold edge line at very bottom] "
            ""
            "RULES: studs and patterns run ALL THE WAY to the flat right edge, no plain sections. "
            "Both gold inner-border lines framing the channel must be clearly visible. "
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


def carve_bar_channel(img, scan_x_pct=(0.25, 0.75), lip_threshold=30):
    """
    Carve a transparent interior channel into a solid bar frame image.

    Used when generate-image-v2 produces a beautifully styled bar but without
    a transparent interior channel (because the model filled it in).

    Strategy — lip-anchored carve (works regardless of interior colour):
      1. Compute per-row average brightness in the middle x-band (avoids end-caps).
      2. Find the LAST bright row (brightness > lip_threshold) in the top half  → top lip edge.
      3. Find the LAST bright row from the bottom in the bottom half              → bottom lip edge.
      4. Make every pixel strictly between those two lip edges transparent (alpha=0).

    This correctly handles both dark-jade bars (dark interior) and red-lacquer bars
    (dark-red interior) because it anchors on the bright lips rather than the dark outlines.

    lip_threshold: rows with avg brightness above this are considered lip territory.
    """
    w, h = img.size
    px   = img.load()
    out  = img.copy()
    dst  = out.load()

    x0 = int(w * scan_x_pct[0])
    x1 = int(w * scan_x_pct[1])

    def row_avg_brightness(y):
        vals = [(px[x, y][0] + px[x, y][1] + px[x, y][2]) / 3
                for x in range(x0, x1) if px[x, y][3] > 50]
        return sum(vals) / len(vals) if vals else 0.0

    brightnesses = [row_avg_brightness(y) for y in range(h)]
    mid = h // 2

    # Last bright row in top half (bottom edge of top lip)
    top_lip_end = None
    for y in range(0, mid + 1):
        if brightnesses[y] > lip_threshold:
            top_lip_end = y

    # Last bright row from bottom in bottom half (top edge of bottom lip)
    bot_lip_start = None
    for y in range(h - 1, mid - 1, -1):
        if brightnesses[y] > lip_threshold:
            bot_lip_start = y

    if top_lip_end is None or bot_lip_start is None or bot_lip_start <= top_lip_end + 1:
        print("  Warning: carve_bar_channel could not locate lip edges — skipping")
        return out

    # Erase everything strictly between the two lip edges
    for y in range(top_lip_end + 1, bot_lip_start):
        for x in range(w):
            r, g, b, a = dst[x, y]
            if a > 10:
                dst[x, y] = (r, g, b, 0)

    carved = bot_lip_start - top_lip_end - 1
    print(f"  Carved channel: rows {top_lip_end+1}..{bot_lip_start-1} ({carved}px transparent)")
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline steps
# ─────────────────────────────────────────────────────────────────────────────

def _style_ref_for(element_id):
    """
    Auto-resolve a style-only reference for upgrade_* icons (all upgrades
    except the tone-setter `upgrade_focus` itself). Returns the finalised
    upgrade_focus.png so the model echoes its palette/border treatment.

    NOTE: we pass this ONLY as `style_image`, not as `reference_images`.
    `reference_images` locks the SUBJECT (it caused PixelLab to copy the
    third-eye motif in earlier tests); `style_image` just hints at palette
    and line treatment, letting the subject described in the prompt come
    through cleanly.
    """
    if element_id.startswith("upgrade_") and element_id != "upgrade_focus":
        p = OUT_DIR / "upgrade_focus.png"
        return p if p.exists() else None
    return None


def run_generate(element_id, ref_path=None):
    if element_id not in ELEMENTS:
        raise ValueError(f"Unknown element '{element_id}'. Known: {list(ELEMENTS)}")

    cfg = ELEMENTS[element_id]
    w, h = cfg["size"]
    api_path = cfg.get("api_path", "/generate-image-v2")

    if ref_path is None:
        ref_path = _style_ref_for(element_id)

    print(f"\n{'='*60}")
    print(f"  Generating: {element_id}  ({w}x{h})  via {api_path}")
    if ref_path:
        print(f"  Style ref:  {ref_path.name} (style_image only)")
    print(f"{'='*60}")

    body = {
        "description": cfg["desc"],
        "image_size":  {"width": w, "height": h},
    }
    if api_path == "/generate-image-v2":
        body["no_background"] = True
    if cfg.get("color_palette"):
        body["color_palette"] = cfg["color_palette"]

    if ref_path and ref_path.exists():
        ref_b64   = base64.b64encode(ref_path.read_bytes()).decode()
        ref_img   = {"type": "base64", "base64": ref_b64, "format": "png"}
        rw, rh    = Image.open(ref_path).size
        ref_sized = {"image": ref_img, "size": {"width": rw, "height": rh}}
        # style_image only — `reference_images` would lock the subject and
        # the model would copy the third-eye motif instead of varying it.
        body["style_image"] = ref_sized

    status, r = api_post(api_path, body)
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


def compose_through_badge(img, badge_path):
    """
    Alpha-composite a generated upgrade-icon candidate through the canonical
    badge frame so every upgrade icon shares a pixel-identical border. The
    badge's opaque border overlays the candidate; the candidate's central
    subject shows through the badge's transparent interior.

    Both images are resized to the badge's dimensions if they differ.
    """
    badge = Image.open(badge_path).convert("RGBA")
    if img.size != badge.size:
        img = img.resize(badge.size, Image.NEAREST)
    return Image.alpha_composite(img, badge)


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

    # Carve a transparent channel into a solid bar (when model filled in the interior)
    if cfg.get("carve_channel"):
        img = carve_bar_channel(img, **cfg.get("carve_channel_kwargs", {}))

    # Optional per-config composite through the canonical badge frame.
    # Default off: with style_image-based generation the model already echoes
    # the focus border, and forcing a composite caused jade-on-jade overlap.
    # Set `cfg["compose_through_badge"] = True` on an element to re-enable.
    if cfg.get("compose_through_badge"):
        badge_path = OUT_DIR / "_upgrade_badge.png"
        if badge_path.exists():
            img = compose_through_badge(img, badge_path)
            print(f"  Composed through canonical badge: {badge_path.name}")

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
