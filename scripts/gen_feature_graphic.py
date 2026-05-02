"""
gen_feature_graphic.py — Compose the Google Play 1024x500 feature graphic.

Uses existing in-game assets (Open Heaven background, peak cultivator,
final-tier QI crystal, gold pixel title) so the banner matches the game
1:1 — no separate art commission needed.

Output: public/store/feature_graphic_1024x500.png

Run:
  python scripts/gen_feature_graphic.py
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
OUT_DIR = PUBLIC / "store"
OUT_DIR.mkdir(parents=True, exist_ok=True)

W, H = 1024, 500

# ── Load assets ──────────────────────────────────────────────────────────────
bg = Image.open(PUBLIC / "backgrounds" / "world_6.png").convert("RGBA")
title = Image.open(PUBLIC / "Title.png").convert("RGBA")
cultivator_sheet = Image.open(PUBLIC / "sprites" / "cultivator" / "state4.png").convert("RGBA")
crystal = Image.open(PUBLIC / "crystals" / "crystal_10.png").convert("RGBA")

# Single cultivator frame (128x128, idx 0 = neutral pose)
fw = cultivator_sheet.width // 4
cultivator = cultivator_sheet.crop((0, 0, fw, cultivator_sheet.height))

# ── Background (scale Open Heaven 2x with NEAREST for pixel-perfect) ─────────
bg = bg.resize((W, H), Image.NEAREST)

# Global darkening so the foreground (gold elements on a gold bg) pops
darken = Image.new("RGBA", (W, H), (12, 18, 32, 130))
canvas = Image.alpha_composite(bg, darken)

# Top vignette for the title
top_vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
tv = ImageDraw.Draw(top_vig)
for y in range(H):
    a = int(max(0, (1 - y / (H * 0.45)) * 130))
    tv.line([(0, y), (W, y)], fill=(8, 10, 20, a))
canvas = Image.alpha_composite(canvas, top_vig)

# Bottom vignette for the tagline
bot_vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
bv = ImageDraw.Draw(bot_vig)
for y in range(H):
    a = int(max(0, (y - H * 0.62) / (H * 0.38) * 150))
    bv.line([(0, y), (W, y)], fill=(8, 10, 20, max(0, a)))
canvas = Image.alpha_composite(canvas, bot_vig)

# ── Cultivator (left side, the hero) — render BEFORE crystal ─────────────────
CULT_SCALE = 3
cult = cultivator.resize(
    (cultivator.width * CULT_SCALE, cultivator.height * CULT_SCALE),
    Image.NEAREST,
)
# Strong cyan/blue aura behind cultivator (complements gold bg)
aura_size = (cult.width * 2, cult.height * 2)
aura = Image.new("RGBA", aura_size, (0, 0, 0, 0))
aura_draw = ImageDraw.Draw(aura)
aura_draw.ellipse(
    (0, 0, aura_size[0], aura_size[1]),
    fill=(110, 180, 255, 150),
)
aura = aura.filter(ImageFilter.GaussianBlur(radius=70))

cult_x = 70
cult_y = (H - cult.height) // 2 + 25

canvas.alpha_composite(
    aura,
    (cult_x - cult.width // 2, cult_y - cult.height // 2),
)
canvas.alpha_composite(cult, (cult_x, cult_y))

# ── Crystal with glow (right side) ───────────────────────────────────────────
CRYSTAL_SCALE = 3
cr = crystal.resize(
    (crystal.width * CRYSTAL_SCALE, crystal.height * CRYSTAL_SCALE),
    Image.NEAREST,
)
# Hot golden-orange glow halo (pops against the dark vignette)
glow_size = (cr.width * 2, cr.height * 2)
glow = Image.new("RGBA", glow_size, (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow)
glow_draw.ellipse(
    (0, 0, glow_size[0], glow_size[1]),
    fill=(255, 170, 60, 200),
)
glow = glow.filter(ImageFilter.GaussianBlur(radius=55))

crystal_x = W - cr.width - 110
crystal_y = (H - cr.height) // 2 + 25

canvas.alpha_composite(
    glow,
    (crystal_x - cr.width // 2, crystal_y - cr.height // 2),
)
canvas.alpha_composite(cr, (crystal_x, crystal_y))

# ── Title (top-center) ───────────────────────────────────────────────────────
# Scale title to ~62% of canvas width, preserving aspect ratio
title_target_w = int(W * 0.62)
title_scale = title_target_w / title.width
title_target_h = int(title.height * title_scale)
title_resized = title.resize((title_target_w, title_target_h), Image.LANCZOS)

# Drop shadow for legibility
shadow = Image.new("RGBA", title_resized.size, (0, 0, 0, 0))
shadow_alpha = title_resized.split()[-1]
shadow.putalpha(shadow_alpha)
shadow = Image.new("RGBA", title_resized.size, (0, 0, 0, 0))
sh_pixels = title_resized.load()
shadow_data = []
for y in range(title_resized.height):
    for x in range(title_resized.width):
        a = sh_pixels[x, y][3]
        shadow_data.append((0, 0, 0, int(a * 0.55)))
shadow.putdata(shadow_data)
shadow = shadow.filter(ImageFilter.GaussianBlur(radius=8))

title_x = (W - title_resized.width) // 2
title_y = 38
canvas.alpha_composite(shadow, (title_x + 4, title_y + 6))
canvas.alpha_composite(title_resized, (title_x, title_y))

# ── Tagline (bottom-center) ──────────────────────────────────────────────────
tagline = "AN IDLE CULTIVATION RPG"
font = None
for candidate in [
    "C:/Windows/Fonts/seguibl.ttf",  # Segoe UI Black
    "C:/Windows/Fonts/segoeuib.ttf",  # Segoe UI Bold
    "C:/Windows/Fonts/arialbd.ttf",
]:
    try:
        font = ImageFont.truetype(candidate, 36)
        break
    except OSError:
        continue
if font is None:
    font = ImageFont.load_default()

draw = ImageDraw.Draw(canvas)
bbox = draw.textbbox((0, 0), tagline, font=font)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
tx = (W - tw) // 2
ty = H - th - 50

# Shadow under tagline
for dx, dy in [(2, 3), (-2, 3), (0, 4)]:
    draw.text((tx + dx, ty + dy), tagline, font=font, fill=(0, 0, 0, 200))
draw.text((tx, ty), tagline, font=font, fill=(255, 220, 130, 255))

# Subtitle word-spacing letter accent
sub = "Climb 13 realms.  Master the 5 elements.  Reach the Open Heaven."
sub_font = None
for candidate in [
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/arial.ttf",
]:
    try:
        sub_font = ImageFont.truetype(candidate, 22)
        break
    except OSError:
        continue
if sub_font is None:
    sub_font = ImageFont.load_default()

bbox2 = draw.textbbox((0, 0), sub, font=sub_font)
sw, sh = bbox2[2] - bbox2[0], bbox2[3] - bbox2[1]
sx = (W - sw) // 2
sy = ty + th + 10
draw.text((sx + 1, sy + 2), sub, font=sub_font, fill=(0, 0, 0, 200))
draw.text((sx, sy), sub, font=sub_font, fill=(230, 230, 240, 255))

# ── Save ─────────────────────────────────────────────────────────────────────
out = OUT_DIR / "feature_graphic_1024x500.png"
canvas.convert("RGB").save(out, "PNG", optimize=True)
print(f"Wrote {out} ({W}x{H})")
