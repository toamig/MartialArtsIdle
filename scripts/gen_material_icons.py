#!/usr/bin/env python3
"""
gen_material_icons.py
Generates all 128x128 material icons for MartialArtsIdle.
Pixel art style: 4px grid cells -> 128px output canvas.
Run from project root:  python3 scripts/gen_material_icons.py
"""
import math, os
from PIL import Image, ImageDraw

S = 128          # canvas size
G = 4            # grid unit (1 logical pixel = 4 output pixels)
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'sprites', 'items')

# ── Rarity palettes ────────────────────────────────────────────────────────────
RP = {
    'iron':         {'m':(156,163,175),'hi':(218,223,230),'lo':(62,68,85),   'gl':(156,163,175)},
    'bronze':       {'m':(205,127,50), 'hi':(238,188,110),'lo':(92,48,10),   'gl':(222,140,55)},
    'silver':       {'m':(192,194,202),'hi':(238,240,246),'lo':(88,92,108),  'gl':(200,206,218)},
    'gold':         {'m':(245,200,66), 'hi':(255,238,122),'lo':(130,92,6),   'gl':(255,215,50)},
    'transcendent': {'m':(192,132,252),'hi':(228,216,255),'lo':(105,30,165), 'gl':(212,158,255)},
}
RARITIES = ['iron','bronze','silver','gold','transcendent']

# ── Utilities ──────────────────────────────────────────────────────────────────
def c(rgb, a=255):
    return (*rgb[:3], a)

def new_img():
    return Image.new('RGBA', (S, S), (0, 0, 0, 0))

def over(base, top):
    return Image.alpha_composite(base, top)

def glow(cx, cy, rgb, r, max_a=90):
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for rr in range(r, 0, -1):
        a = int(max_a * (1 - rr / r) ** 1.3)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(*rgb[:3], a))
    return layer

def px(d, gx, gy, rgb, a=255, w=1, h=1):
    """Draw w x h grid cells at grid position (gx, gy)."""
    x0, y0 = gx * G, gy * G
    d.rectangle([x0, y0, x0 + w * G - 1, y0 + h * G - 1], fill=(*rgb[:3], a))

def poly(d, gpts, rgb, a=255):
    """Draw polygon from grid-coordinate list."""
    pts = [(int(gx * G), int(gy * G)) for gx, gy in gpts]
    d.polygon(pts, fill=(*rgb[:3], a))

def line(d, gpts, rgb, width=1, a=255):
    pts = [(int(gx * G), int(gy * G)) for gx, gy in gpts]
    d.line(pts, fill=(*rgb[:3], a), width=width)


# ══════════════════════════════════════════════════════════════════════════════
# HERBS
# ══════════════════════════════════════════════════════════════════════════════
def make_herb(p, v):
    img = new_img()
    d = ImageDraw.Draw(img)
    m, hi, lo, gl = p['m'], p['hi'], p['lo'], p['gl']

    # Flower petals (4 cardinal, snapped)
    px(d, 14, 0, hi, w=4, h=2)   # top
    px(d, 12, 2, hi, w=2, h=4)   # left
    px(d, 18, 2, hi, w=2, h=4)   # right
    px(d, 14, 5, hi, w=4, h=2)   # bottom

    # Flower center
    px(d, 13, 1, m, w=6, h=5)
    px(d, 14, 2, hi, w=4, h=3)
    px(d, 15, 2, (255, 255, 255), a=210, w=2, h=2)

    # Small upper leaves
    if v == 1:
        poly(d, [(9,8),(14,5),(15,8),(10,11)], m)
        poly(d, [(23,8),(18,5),(17,8),(22,11)], m)
        poly(d, [(10,9),(14,7),(14,9)], hi)
        poly(d, [(22,9),(18,7),(18,9)], hi)
    else:
        poly(d, [(8,7),(14,4),(15,8),(10,12),(7,10)], m)
        poly(d, [(24,7),(18,4),(17,8),(22,12),(25,10)], m)
        poly(d, [(10,8),(14,6),(14,9)], hi)
        poly(d, [(22,8),(18,6),(18,9)], hi)

    # Upper stem
    px(d, 15, 7, lo, w=2, h=5)

    # Big left leaf
    poly(d, [(16,12),(15,10),(5,7),(1,5),(1,4),(5,3),(11,5),(15,8)], m)
    line(d, [(15,11),(2,4)], lo, width=2)
    poly(d, [(14,11),(13,10),(7,8),(9,7),(13,9)], hi)

    # Big right leaf
    poly(d, [(16,10),(17,8),(27,4),(31,2),(31,3),(28,5),(22,8),(17,10)], m)
    line(d, [(17,10),(30,3)], lo, width=2)
    poly(d, [(18,9),(19,7),(26,5),(24,6),(19,8)], hi)

    # Lower stem
    px(d, 15, 12, lo, w=2, h=14)

    # Root system
    poly(d, [(15,26),(14,27),(8,31),(7,31),(9,30),(14,28),(15,27)], lo)
    poly(d, [(17,26),(18,27),(24,31),(25,31),(23,30),(18,28),(17,27)], lo)
    px(d, 15, 27, lo, w=2, h=4)

    # Soil mound
    poly(d, [(10,30),(22,30),(25,31),(7,31)], lo)

    gl_layer = glow(S // 2, 3 * G, gl, 26, 80)
    img = over(gl_layer, img)
    return img


# ══════════════════════════════════════════════════════════════════════════════
# MINERALS / ORES
# ══════════════════════════════════════════════════════════════════════════════
def make_mineral(p, v):
    img = new_img()
    d = ImageDraw.Draw(img)
    m, hi, lo, gl = p['m'], p['hi'], p['lo'], p['gl']

    # Ground base
    poly(d, [(4,28),(28,28),(30,31),(2,31)], lo)

    # Main center crystal
    poly(d, [(15,1),(12,7),(11,18),(14,28),(18,28),(21,18),(20,7)], m)
    poly(d, [(15,1),(12,7),(14,9),(16,7),(16,1)], hi)
    poly(d, [(15,1),(20,7),(18,9),(16,7),(16,1)], lo)
    poly(d, [(13,12),(14,10),(17,10),(16,14)], hi)

    # Left crystal
    if v == 1:
        poly(d, [(9,9),(7,15),(9,27),(13,27),(14,15),(12,9)], lo)
        poly(d, [(9,9),(7,15),(9,17),(10,15),(11,9)], m)
    else:
        poly(d, [(8,7),(5,13),(7,26),(12,26),(13,13),(11,7)], lo)
        poly(d, [(8,7),(5,13),(7,15),(9,13),(10,7)], m)
        poly(d, [(4,13),(2,18),(4,26),(7,26),(7,18),(5,13)], lo)

    # Right crystal
    poly(d, [(22,11),(24,16),(22,27),(18,27),(17,16),(20,11)], lo)
    poly(d, [(22,11),(24,16),(22,18),(21,16),(21,11)], m)

    if v == 2:
        poly(d, [(25,14),(27,19),(25,27),(22,27),(22,19),(24,14)], lo)
        poly(d, [(25,14),(27,19),(25,21),(24,19),(24,14)], m)

    px(d, 15, 0, (255, 255, 255), a=220, w=2, h=1)
    px(d, 14, 1, (255, 255, 255), a=140, w=1, h=1)

    gl_layer = glow(S // 2, 13 * G, gl, 32, 90)
    img = over(gl_layer, img)
    return img


# ══════════════════════════════════════════════════════════════════════════════
# BLOOD CORES
# ══════════════════════════════════════════════════════════════════════════════
def make_blood_core(p, v):
    img = new_img()
    d = ImageDraw.Draw(img)
    m, hi, lo, gl = p['m'], p['hi'], p['lo'], p['gl']

    cx = cy = S // 2

    d.ellipse([10, 10, 118, 118], fill=c(lo))
    d.ellipse([16, 16, 112, 112], fill=c(m))
    d.ellipse([26, 26, 102, 102], fill=c(hi))
    d.ellipse([36, 36, 92, 92], fill=c(lo))
    d.ellipse([46, 46, 82, 82], fill=c(m))
    d.ellipse([54, 54, 74, 74], fill=c(hi))
    d.ellipse([60, 60, 68, 68], fill=(255, 255, 255, 220))

    num_veins = 6 if v == 1 else 8
    for i in range(num_veins):
        angle = (i / num_veins) * 2 * math.pi
        x1 = cx + int(22 * math.cos(angle))
        y1 = cy + int(22 * math.sin(angle))
        x2 = cx + int(46 * math.cos(angle))
        y2 = cy + int(46 * math.sin(angle))
        d.line([x1, y1, x2, y2], fill=c(lo), width=2)

    for angle_deg in range(0, 360, 45):
        angle = math.radians(angle_deg)
        sx = cx + int(49 * math.cos(angle))
        sy = cy + int(49 * math.sin(angle))
        d.rectangle([sx - 2, sy - 2, sx + 2, sy + 2], fill=c(hi))

    d.arc([20, 20, 72, 72], start=200, end=320, fill=c(hi), width=4)

    if v == 2:
        for i in range(4):
            angle = (i / 4) * 2 * math.pi + math.pi / 8
            x1 = cx + int(52 * math.cos(angle))
            y1 = cy + int(52 * math.sin(angle))
            x2 = cx + int(58 * math.cos(angle + 0.3))
            y2 = cy + int(58 * math.sin(angle + 0.3))
            d.line([x1, y1, x2, y2], fill=c(hi), width=2)

    gl_layer = glow(cx, cy, gl, 58, 100)
    img = over(gl_layer, img)
    return img


# ══════════════════════════════════════════════════════════════════════════════
# CULTIVATION / QI STONES
# ══════════════════════════════════════════════════════════════════════════════
def make_cultivation(p, v):
    img = new_img()
    d = ImageDraw.Draw(img)
    m, hi, lo, gl = p['m'], p['hi'], p['lo'], p['gl']

    cx = cy = S // 2
    r = 11

    def hex_verts(cx_g, cy_g, r_g):
        pts = []
        for i in range(6):
            angle = math.radians(60 * i - 30)
            pts.append((cx_g + r_g * math.cos(angle), cy_g + r_g * math.sin(angle)))
        return pts

    cg = 16
    verts = hex_verts(cg, cg, r)
    shadow_verts = [(x + 0.8, y + 0.8) for x, y in verts]

    poly(d, shadow_verts, lo)
    poly(d, verts, m)

    face_hi = [verts[0], verts[1], (cg, cg - 3.5), (cg + 2, cg - 2)]
    poly(d, face_hi, hi)
    face_lo = [verts[3], verts[4], (cg, cg + 3.5), (cg - 2, cg + 2)]
    poly(d, face_lo, lo)

    inner = hex_verts(cg, cg, r * 0.58)
    poly(d, inner, hi)

    swirl_count = 8 if v == 1 else 12
    for i in range(swirl_count):
        angle = math.radians(360 / swirl_count * i)
        sr = 20 + i * 2.2 if v == 1 else 18 + i * 2.5
        sx = cx + int(sr * 0.52 * math.cos(angle))
        sy = cy + int(sr * 0.52 * math.sin(angle))
        d.rectangle([sx - 2, sy - 2, sx + 2, sy + 2], fill=c(lo))

    if v == 2:
        for i in range(swirl_count):
            angle = math.radians(360 / swirl_count * i + 180)
            sr = 16 + i * 1.8
            sx = cx + int(sr * 0.42 * math.cos(angle))
            sy = cy + int(sr * 0.42 * math.sin(angle))
            d.rectangle([sx - 2, sy - 2, sx + 2, sy + 2], fill=c(m))

    d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=c(hi))
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(255, 255, 255, 220))

    for vx, vy in verts:
        d.rectangle([int(vx * G) - 2, int(vy * G) - 2, int(vx * G) + 2, int(vy * G) + 2], fill=c(hi))

    gl_layer = glow(cx, cy, gl, 50, 105)
    img = over(gl_layer, img)
    return img


# ══════════════════════════════════════════════════════════════════════════════
# SPECIAL ITEMS — shared helpers
# ══════════════════════════════════════════════════════════════════════════════
def make_pill(main, shine, shadow, detail=None, glow_rgb=None):
    img = new_img()
    d = ImageDraw.Draw(img)
    glow_rgb = glow_rgb or main
    d.ellipse([14, 14, 114, 114], fill=c(shadow))
    d.ellipse([18, 18, 110, 110], fill=c(main))
    poly_px = [(32, 24), (76, 20), (94, 36), (90, 50), (72, 42), (40, 38)]
    d.polygon(poly_px, fill=c(shine))
    d.ellipse([36, 28, 60, 46], fill=c(shine, 180))
    d.ellipse([42, 32, 54, 42], fill=(255, 255, 255, 200))
    d.arc([18, 18, 110, 110], start=5, end=175, fill=c(shadow, 100), width=2)
    if detail:
        d.arc([36, 36, 92, 92], start=30, end=150, fill=c(detail, 120), width=2)
    gl_layer = glow(S // 2, S // 2, glow_rgb, 56, 85)
    return over(gl_layer, img)


def make_crystal_single(main, hi, lo, glow_rgb, tip_sparkle=True):
    img = new_img()
    d = ImageDraw.Draw(img)
    poly(d, [(6,28),(26,28),(28,31),(4,31)], lo)
    poly(d, [(15,1),(10,8),(9,27),(23,27),(22,8)], main)
    poly(d, [(15,1),(10,8),(12,10),(16,8),(16,1)], hi)
    poly(d, [(15,1),(22,8),(20,10),(16,8),(16,1)], lo)
    poly(d, [(11,14),(12,12),(20,12),(19,16)], hi)
    if tip_sparkle:
        d2 = ImageDraw.Draw(img)
        px(d2, 15, 0, (255,255,255), a=220, w=2, h=1)
    gl_layer = glow(S//2, 14*G, glow_rgb, 30, 90)
    return over(gl_layer, img)


def make_lotus(main, center, shadow, glow_rgb, num_petals=8):
    img = new_img()
    d = ImageDraw.Draw(img)
    cx = cy = S // 2
    for i in range(num_petals):
        angle = (i / num_petals) * 2 * math.pi
        pr = 46
        px_c = cx + int(pr * math.cos(angle))
        py_c = cy + int(pr * math.sin(angle))
        pw = 18
        d.ellipse([px_c - pw, py_c - pw, px_c + pw, py_c + pw], fill=c(main))
        hx = cx + int((pr - 8) * math.cos(angle - 0.15))
        hy = cy + int((pr - 8) * math.sin(angle - 0.15))
        hi_c = tuple(min(255, v + 40) for v in main[:3])
        d.ellipse([hx - 8, hy - 8, hx + 8, hy + 8], fill=c(hi_c))
    for i in range(num_petals):
        angle = (i / num_petals) * 2 * math.pi + math.pi / num_petals
        pr = 30
        px_c = cx + int(pr * math.cos(angle))
        py_c = cy + int(pr * math.sin(angle))
        pw = 14
        hi_c = tuple(min(255, v + 25) for v in main[:3])
        d.ellipse([px_c - pw, py_c - pw, px_c + pw, py_c + pw], fill=c(hi_c))
    d.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=c(shadow))
    d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=c(center))
    d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=(255, 240, 180, 230))
    gl_layer = glow(cx, cy, glow_rgb, 54, 100)
    return over(gl_layer, img)


def make_orb(outer, mid, core, glow_rgb, veins=True):
    img = new_img()
    d = ImageDraw.Draw(img)
    cx = cy = S // 2
    d.ellipse([10, 10, 118, 118], fill=c(outer))
    d.ellipse([16, 16, 112, 112], fill=c(mid))
    if veins:
        for i in range(5):
            angle = (i / 5) * 2 * math.pi
            x1 = cx + int(18 * math.cos(angle))
            y1 = cy + int(18 * math.sin(angle))
            x2 = cx + int(44 * math.cos(angle))
            y2 = cy + int(44 * math.sin(angle))
            d.line([x1, y1, x2, y2], fill=c(outer), width=2)
    d.ellipse([38, 38, 90, 90], fill=c(outer))
    d.ellipse([46, 46, 82, 82], fill=c(core))
    d.ellipse([56, 56, 72, 72], fill=(255, 255, 255, 210))
    d.arc([20, 20, 68, 68], start=200, end=320, fill=c(core, 160), width=4)
    gl_layer = glow(cx, cy, glow_rgb, 58, 100)
    return over(gl_layer, img)


def make_metal_chunk(main, hi, lo, glow_rgb):
    img = new_img()
    d = ImageDraw.Draw(img)
    poly(d, [(5,21),(23,21),(27,29),(3,29)], lo)
    poly(d, [(8,5),(21,3),(29,10),(27,25),(18,28),(5,26),(2,18),(6,8)], main)
    poly(d, [(8,5),(21,3),(22,8),(14,10),(7,8)], hi)
    poly(d, [(8,5),(7,8),(5,18),(6,22),(8,22),(10,12),(9,6)], hi)
    poly(d, [(21,3),(29,10),(27,22),(20,24),(22,16),(23,8)], lo)
    d.line([(10*G,10*G),(14*G,16*G)], fill=c(lo), width=2)
    d.line([(16*G,8*G),(18*G,14*G)], fill=c(lo), width=2)
    gl_layer = glow(S//2, 16*G, glow_rgb, 28, 70)
    return over(gl_layer, img)


def make_leaf(main, hi, lo, glow_rgb):
    img = new_img()
    d = ImageDraw.Draw(img)
    px(d, 15, 25, lo, w=2, h=6)
    d.line([(16*G, 28*G), (10*G, 31*G)], fill=c(lo), width=G)
    d.line([(16*G, 28*G), (22*G, 31*G)], fill=c(lo), width=G)
    poly(d, [(16,25),(8,20),(3,12),(5,4),(10,1),(18,2),(26,8),(28,17),(22,24)], main)
    poly(d, [(16,25),(8,20),(6,12),(8,6),(12,3),(16,3),(16,25)], hi)
    d.line([(16*G, 24*G), (13*G, 4*G)], fill=c(lo), width=2)
    for i in range(4):
        gy = 8 + i * 4
        d.line([(13*G, gy*G), (6*G, (gy+3)*G)], fill=c(lo), width=1)
        d.line([(13*G, gy*G), (20*G, (gy+2)*G)], fill=c(lo), width=1)
    gl_layer = glow(S//2, 13*G, glow_rgb, 32, 75)
    return over(gl_layer, img)


def make_mushroom(cap_main, cap_hi, cap_lo, stalk, glow_rgb):
    img = new_img()
    d = ImageDraw.Draw(img)
    poly(d, [(12,18),(20,18),(21,29),(11,29)], stalk)
    hi_stalk = tuple(min(255, v + 30) for v in stalk[:3])
    poly(d, [(12,18),(14,18),(15,29),(11,29)], hi_stalk)
    poly(d, [(3,20),(15,5),(19,5),(29,19),(26,22),(6,22)], cap_main)
    poly(d, [(4,19),(15,5),(18,5),(16,8),(14,8),(6,16)], cap_hi)
    for sx, sy, sr in [(10,14,4),(17,10,3),(22,16,3)]:
        d.ellipse([sx-sr, sy-sr, sx+sr, sy+sr], fill=c(cap_hi, 160))
    poly(d, [(6,21),(26,21),(26,23),(6,23)], cap_lo)
    poly(d, [(9,27),(23,27),(25,31),(7,31)], cap_lo)
    gl_layer = glow(S//2, 16*G, glow_rgb, 30, 80)
    return over(gl_layer, img)


def make_grass_plant(stem, leaf1, leaf2, glow_rgb, stalks=3):
    img = new_img()
    d = ImageDraw.Draw(img)
    poly(d, [(4,28),(28,28),(30,31),(2,31)], stem)
    offsets = {1: [(15, 3)], 2: [(11, 5), (18, 4)], 3: [(10, 6), (15, 2), (21, 5)]}
    bases   = {1: [(16,27)], 2: [(12,27),(19,27)],  3: [(11,27),(16,27),(22,27)]}
    for i in range(stalks):
        tip  = offsets[stalks][i]
        base = bases[stalks][i]
        d.line([(base[0]*G, base[1]*G), (tip[0]*G, tip[1]*G)], fill=c(stem), width=G)
        lx, ly = tip[0], tip[1]
        poly(d, [(lx,ly),(lx-4,ly+5),(lx-6,ly+10),(lx-3,ly+11),(lx,ly+5)], leaf1)
        poly(d, [(lx,ly),(lx+4,ly+5),(lx+6,ly+10),(lx+3,ly+11),(lx,ly+5)], leaf2)
        d.ellipse([lx*G-3, ly*G-6, lx*G+3, ly*G], fill=c((180,220,255), 180))
    gl_layer = glow(S//2, 16*G, glow_rgb, 24, 60)
    return over(gl_layer, img)


def make_vine(main, hi, lo, glow_rgb):
    img = new_img()
    d = ImageDraw.Draw(img)
    pts_vine = []
    for t in range(60):
        tt = t / 60
        x = S // 2 + int(30 * math.sin(tt * 2 * math.pi))
        y = int(S * 0.05 + S * 0.9 * tt)
        pts_vine.append((x, y))
    for i in range(len(pts_vine) - 1):
        d.line([pts_vine[i], pts_vine[i + 1]], fill=c(lo), width=5)
        d.line([pts_vine[i], pts_vine[i + 1]], fill=c(main), width=3)
    leaf_positions = [0.15, 0.30, 0.50, 0.65, 0.80]
    for lp in leaf_positions:
        idx = int(lp * 59)
        vx, vy = pts_vine[idx]
        side = 1 if idx % 2 == 0 else -1
        lpts = [(vx, vy), (vx + side * 18, vy - 10), (vx + side * 22, vy + 4), (vx + side * 12, vy + 12)]
        d.polygon(lpts, fill=c(hi))
        d.line([(vx, vy), (vx + side * 20, vy + 2)], fill=c(lo), width=1)
    for lp in [0.1, 0.45, 0.78]:
        idx = int(lp * 59)
        vx, vy = pts_vine[idx]
        d.ellipse([vx - 6, vy - 6, vx + 6, vy + 6], fill=c(hi))
        d.ellipse([vx - 3, vy - 3, vx + 3, vy + 3], fill=(255, 255, 255, 200))
    gl_layer = glow(S//2, S//2, glow_rgb, 40, 70)
    return over(gl_layer, img)


def make_ginseng(main, hi, lo, glow_rgb):
    img = new_img()
    d = ImageDraw.Draw(img)
    cx = S // 2
    poly(d, [(14,4),(18,4),(20,8),(21,16),(20,22),(16,24),(12,22),(11,16),(12,8)], main)
    poly(d, [(14,4),(16,4),(17,8),(17,16),(16,20),(14,20),(13,16),(13,8)], hi)
    d.ellipse([12*G, 0, 20*G, 8*G], fill=c(main))
    d.ellipse([13*G, G, 19*G, 7*G], fill=c(hi))
    d.ellipse([14*G, 2*G, 18*G, 6*G], fill=(255, 240, 200, 200))
    poly(d, [(12,16),(8,14),(4,18),(5,21),(9,19),(12,17)], main)
    poly(d, [(12,16),(9,15),(5,18),(5,19),(9,18),(12,16)], hi)
    poly(d, [(20,16),(24,14),(28,18),(27,21),(23,19),(20,17)], main)
    poly(d, [(13,22),(10,26),(8,30),(11,31),(13,27),(14,23)], main)
    poly(d, [(19,22),(22,26),(24,30),(21,31),(19,27),(18,23)], main)
    gl_layer = glow(cx, 12*G, glow_rgb, 28, 70)
    return over(gl_layer, img)


# ══════════════════════════════════════════════════════════════════════════════
# SPECIAL ITEMS
# ══════════════════════════════════════════════════════════════════════════════
SPECIAL_ITEMS = {}

def special(fn):
    SPECIAL_ITEMS[fn.__name__.replace('make_', '')] = fn
    return fn

@special
def make_blood_lotus():
    return make_lotus(
        main=(200, 30, 50), center=(245, 200, 66),
        shadow=(120, 10, 20), glow_rgb=(220, 40, 60), num_petals=8
    )

@special
def make_spirit_stone():
    img = new_img()
    d = ImageDraw.Draw(img)
    d.ellipse([24, 14, 104, 114], fill=c((60, 80, 130)))
    d.ellipse([28, 18, 100, 110], fill=c((100, 140, 200)))
    d.ellipse([32, 22, 96, 106], fill=c((150, 190, 240)))
    cx = cy = S // 2
    d.line([(cx,22),(36,60)], fill=c((80,110,170)), width=2)
    d.line([(cx,22),(92,60)], fill=c((80,110,170)), width=2)
    d.line([(36,60),(cx,106)], fill=c((80,110,170)), width=2)
    d.line([(92,60),(cx,106)], fill=c((80,110,170)), width=2)
    d.line([(36,60),(92,60)], fill=c((80,110,170)), width=2)
    d.polygon([(cx,22),(36,60),(50,42)], fill=c((200,225,255,160)))
    d.ellipse([50,30,72,48], fill=c((230,245,255,180)))
    d.ellipse([56,36,68,46], fill=(255,255,255,220))
    return over(glow(cx, cy, (140,180,240), 56, 95), img)

@special
def make_beast_core():
    img = make_orb(outer=(40,20,20), mid=(90,30,30), core=(200,80,40),
                   glow_rgb=(160,50,30), veins=True)
    d = ImageDraw.Draw(img)
    cx = cy = S // 2
    for angle_deg in [0, 120, 240]:
        angle = math.radians(angle_deg)
        mx = cx + int(28 * math.cos(angle))
        my = cy + int(28 * math.sin(angle))
        d.ellipse([mx-5,my-5,mx+5,my+5], fill=c((245,200,66,200)))
    return img

@special
def make_black_tortoise_iron():
    img = make_metal_chunk(main=(35,40,55), hi=(70,80,100), lo=(18,20,30), glow_rgb=(50,60,90))
    d = ImageDraw.Draw(img)
    for gx, gy in [(10,10),(16,8),(13,14),(18,14),(10,17)]:
        d.polygon([
            (gx*G,gy*G-4),(gx*G+4,gy*G-2),(gx*G+4,gy*G+2),
            (gx*G,gy*G+4),(gx*G-4,gy*G+2),(gx*G-4,gy*G-2)
        ], outline=c((70,80,100,180)), width=1)
    return img

@special
def make_breakthrough_golden_pill():
    return make_pill(main=(220,170,40), shine=(255,238,140), shadow=(130,90,10),
                     detail=(180,130,20), glow_rgb=(245,200,66))

@special
def make_crimson_flame_crystal():
    img = make_crystal_single(main=(180,40,40), hi=(240,100,80), lo=(100,15,15),
                              glow_rgb=(220,50,30))
    d = ImageDraw.Draw(img)
    cx = S // 2
    for i in range(5):
        fy = 2 + i * 4
        fw = 4 + i * 3
        fa = max(30, 180 - i * 35)
        d.ellipse([cx-fw//2, fy-2, cx+fw//2, fy+4], fill=c((255,140,20,fa)))
    return img

@special
def make_deep_sea_cold_iron():
    img = make_metal_chunk(main=(30,55,90), hi=(60,100,150), lo=(15,28,50), glow_rgb=(40,80,140))
    d = ImageDraw.Draw(img)
    d.line([(30,50),(60,80),(90,55)], fill=c((150,200,255,120)), width=2)
    d.line([(50,30),(70,60),(55,95)], fill=c((150,200,255,100)), width=1)
    return img

@special
def make_dragon_saliva_grass():
    img = make_grass_plant(stem=(60,100,40), leaf1=(80,140,50), leaf2=(110,175,70),
                           glow_rgb=(100,160,60), stalks=3)
    d = ImageDraw.Draw(img)
    for dx, dy in [(14*G,10*G),(20*G,8*G),(16*G,16*G)]:
        d.ellipse([dx-5,dy-5,dx+5,dy+5], fill=c((200,240,255,200)))
        d.ellipse([dx-2,dy-3,dx+1,dy], fill=(255,255,255,220))
    return img

@special
def make_elemental_essence_bead():
    img = new_img()
    d = ImageDraw.Draw(img)
    cx = cy = S // 2
    d.ellipse([12,12,116,116], fill=c((30,25,50)))
    for col, start in [((200,40,40),0),((40,140,200),90),((200,160,30),180),((80,180,80),270)]:
        d.pieslice([20,20,108,108], start=start, end=start+90, fill=c(col,200))
    d.line([cx,20,cx,108], fill=(255,255,255,180), width=2)
    d.line([20,cy,108,cy], fill=(255,255,255,180), width=2)
    d.ellipse([cx-16,cy-16,cx+16,cy+16], fill=c((240,235,255)))
    d.ellipse([cx-8,cy-8,cx+8,cy+8], fill=(255,255,255,240))
    d.arc([16,16,80,80], start=210, end=330, fill=(255,255,255,140), width=4)
    return over(glow(cx, cy, (180,160,220), 56, 90), img)

@special
def make_heaven_spirit_dew():
    img = new_img()
    d = ImageDraw.Draw(img)
    cx = S // 2
    drop_pts = []
    for t in range(100):
        angle = t / 100 * 2 * math.pi
        r = 36 if angle < math.pi else 36 * (1 - ((angle - math.pi) / math.pi) * 0.6)
        x = cx + int(r * math.sin(angle))
        y = 90 - int(70 * math.cos(angle * 0.5))
        drop_pts.append((x, y))
    d.polygon([(x+3,y+3) for x,y in drop_pts], fill=c((50,80,130,80)))
    d.polygon(drop_pts, fill=c((100,160,220)))
    d.polygon(drop_pts, fill=c((140,200,245,180)))
    inner = [(cx + int(0.55*(x-cx)), 14 + int(0.55*(y-14))) for x,y in drop_pts]
    d.polygon(inner, fill=c((200,235,255,180)))
    d.ellipse([cx-12,18,cx+4,38], fill=c((255,255,255,200)))
    return over(glow(cx, 70, (120,190,240), 40, 90), img)

@special
def make_heavenly_profound_metal():
    img = make_metal_chunk(main=(200,210,225), hi=(240,245,255), lo=(110,115,130),
                           glow_rgb=(180,200,230))
    d = ImageDraw.Draw(img)
    for rx, ry in [(9,10),(15,7),(20,12)]:
        d.rectangle([rx*G-3,ry*G-3,rx*G+3,ry*G+3], outline=c((220,230,255,160)), width=1)
    return img

@special
def make_immortal_revival_leaf():
    return make_leaf(main=(50,180,80), hi=(120,230,130), lo=(25,100,40), glow_rgb=(70,200,100))

@special
def make_jade_heart_flower():
    return make_lotus(main=(60,180,120), center=(220,245,200), shadow=(30,100,60),
                      glow_rgb=(80,210,140), num_petals=6)

@special
def make_mithril_essence():
    img = make_orb(outer=(80,85,110), mid=(160,168,195), core=(220,228,245),
                   glow_rgb=(180,190,220), veins=False)
    d = ImageDraw.Draw(img)
    cx = cy = S // 2
    d.arc([30,30,98,98], start=0, end=360, fill=c((200,210,240,100)), width=2)
    d.arc([36,36,92,92], start=20, end=160, fill=c((240,245,255,160)), width=2)
    return img

@special
def make_netherworld_flame_mushroom():
    return make_mushroom(cap_main=(40,10,60), cap_hi=(120,30,180), cap_lo=(20,5,30),
                         stalk=(50,50,60), glow_rgb=(100,20,160))

@special
def make_origin_crystal():
    img = new_img()
    d = ImageDraw.Draw(img)
    cx = S // 2
    poly(d, [(14,1),(11,8),(10,27),(22,27),(21,8)], (140,100,200))
    poly(d, [(14,1),(11,8),(13,10),(16,8),(16,1)], (220,100,100))
    poly(d, [(16,1),(16,8),(18,10),(19,8),(16,1)], (100,200,120))
    poly(d, [(16,8),(21,8),(19,14),(16,10)], (100,140,220))
    poly(d, [(11,14),(12,12),(20,12),(18,16)], (255,255,200,180))
    d.rectangle([14*G, 0, 18*G, G], fill=(255,255,255,230))
    poly(d, [(6,28),(26,28),(28,31),(4,31)], (60,50,80))
    return over(glow(cx, 14*G, (160,120,220), 32, 90), img)

@special
def make_profound_accumulation_pill():
    return make_pill(main=(80,30,140), shine=(180,120,240), shadow=(40,10,80),
                     detail=(120,60,180), glow_rgb=(150,80,220))

@special
def make_purple_cloud_vine():
    return make_vine(main=(130,60,180), hi=(190,140,240), lo=(70,25,110), glow_rgb=(160,80,220))

@special
def make_qi_condensation_pill():
    return make_pill(main=(30,100,200), shine=(120,190,255), shadow=(10,50,110),
                     detail=(60,130,220), glow_rgb=(80,160,240))

@special
def make_skyfire_meteorite():
    img = make_metal_chunk(main=(60,40,30), hi=(100,70,50), lo=(30,20,15), glow_rgb=(200,80,20))
    d = ImageDraw.Draw(img)
    for i in range(8):
        fx = 100 - i * 6
        fy = 20 + i * 5
        fa = max(20, 200 - i * 25)
        fw = max(2, 14 - i * 2)
        d.ellipse([fx-fw,fy-fw//2,fx+fw,fy+fw//2], fill=c((255,120+i*10,20,fa)))
    d.ellipse([50,50,78,78], fill=c((255,180,40,160)))
    d.ellipse([58,58,70,70], fill=(255,230,100,200))
    return img

@special
def make_soul_calming_grass():
    img = make_grass_plant(stem=(70,110,80), leaf1=(100,160,110), leaf2=(130,190,140),
                           glow_rgb=(80,160,120), stalks=3)
    d = ImageDraw.Draw(img)
    cx = S // 2
    for wx, wy in [(cx-20,30),(cx,20),(cx+18,28)]:
        for i in range(3):
            wr = max(1, 5 - i * 2)
            d.ellipse([wx-wr,wy-i*6-wr,wx+wr,wy-i*6+wr], fill=c((150,200,240,max(20,140-i*50))))
    return img

@special
def make_star_metal_ore():
    img = make_metal_chunk(main=(25,25,45), hi=(55,55,90), lo=(12,12,25), glow_rgb=(100,100,180))
    d = ImageDraw.Draw(img)
    for sx, sy in [(40,40),(70,30),(90,60),(55,80),(30,70),(80,85)]:
        for dx, dy in [(0,-6),(0,6),(-6,0),(6,0)]:
            d.line([sx,sy,sx+dx,sy+dy], fill=(220,220,255,200), width=1)
        d.rectangle([sx-2,sy-2,sx+2,sy+2], fill=(255,255,255,230))
    return img

@special
def make_thousand_year_ginseng():
    return make_ginseng(main=(200,160,100), hi=(240,210,150), lo=(120,80,40), glow_rgb=(220,180,100))

@special
def make_void_stone():
    img = new_img()
    d = ImageDraw.Draw(img)
    cx = cy = S // 2
    d.ellipse([14,14,114,114], fill=c((10,8,20)))
    d.ellipse([18,18,110,110], fill=c((22,15,38)))
    for i in range(6):
        angle = math.radians(60 * i + 15)
        x1 = cx + int(10 * math.cos(angle))
        y1 = cy + int(10 * math.sin(angle))
        x2 = cx + int(46 * math.cos(angle + 0.2))
        y2 = cy + int(46 * math.sin(angle + 0.2))
        d.line([x1,y1,x2,y2], fill=c((100,60,180,180)), width=2)
    d.ellipse([cx-18,cy-18,cx+18,cy+18], fill=c((30,10,60)))
    d.ellipse([cx-10,cy-10,cx+10,cy+10], fill=c((80,40,140)))
    d.ellipse([cx-4,cy-4,cx+4,cy+4], fill=c((160,100,220)))
    d.ellipse([cx-1,cy-1,cx+1,cy+1], fill=(255,255,255,240))
    d.arc([22,22,106,106], start=0, end=270, fill=c((80,40,140,100)), width=3)
    return over(glow(cx, cy, (80,40,140), 54, 90), img)


# ══════════════════════════════════════════════════════════════════════════════
# GENERATION LOOP
# ══════════════════════════════════════════════════════════════════════════════
def main():
    os.makedirs(OUT, exist_ok=True)
    count = 0

    makers = {
        'herb':        make_herb,
        'mineral':     make_mineral,
        'blood_core':  make_blood_core,
        'cultivation': make_cultivation,
    }

    for mat_type, maker in makers.items():
        for rarity in RARITIES:
            p = RP[rarity]
            for v in [1, 2]:
                name = f"{rarity}_{mat_type}_{v}"
                path = os.path.join(OUT, f"{name}.png")
                img = maker(p, v)
                img.save(path)
                print(f"  + {name}.png")
                count += 1

    for item_name, fn in SPECIAL_ITEMS.items():
        path = os.path.join(OUT, f"{item_name}.png")
        img = fn()
        img.save(path)
        print(f"  + {item_name}.png")
        count += 1

    print(f"\nDone — {count} icons written to {os.path.abspath(OUT)}")

if __name__ == '__main__':
    main()
