"""
Cultivator sprite prompts — 13 realm tiers × 2 poses + 1 heavenly aura
underlay. One sprite per major realm name. Static single-frame sprites
(per-frame breathing animation was rejected — CSS handles the "alive"
feel via subtle scale pulse on the sprite + opacity pulse on the aura).

Pipeline shape (to be implemented in `gen_cultivator.py`):

  per tier T:
    Step 1 — generate design candidate from `design_prompt`. No reference
             for T0 (seeds the look). T1+ use the previous tier's normal
             sprite as `reference_images` + `style_image` to lock identity.
    Step 2 — user picks the candidate → saved as `<tier_id>_normal.png`.
    Step 3 — using that normal sprite as reference_images + style_image, run
             `focused_prompt` once → save as `<tier_id>_focused.png`. Same
             silhouette/robes, qi effects escalated.
    Step 4 — the normal sprite becomes the reference for the next tier's
             Step 1, so the player sees the same person evolving across
             the 13 major realms.

  heavenly aura:
    Single 4-frame spritesheet. Frame 0 has no reference; frames 1-3
    reference the previous frame to keep the silhouette stable while the
    flames shift state. Renders BEHIND the cultivator when the ad boost
    is active.

All prompts target 256×256 single-frame transparent PNGs. Each prompt is
under the PixelLab 2000-char limit (verify via `python cultivator_prompts.py`).

Tier → realm mapping (one sprite per major realm name):
  t0_novice              → Tempered Body          (idx  0-9)
  t1_qi_transformation   → Qi Transformation      (idx 10-13)
  t2_true_element        → True Element           (idx 14-17)
  t3_separation          → Separation & Reunion   (idx 18-20)
  t4_immortal_ascension  → Immortal Ascension     (idx 21-23)
  t5_saint               → Saint                  (idx 24-26)
  t6_saint_king          → Saint King             (idx 27-29)
  t7_origin_returning    → Origin Returning       (idx 30-32)
  t8_origin_king         → Origin King            (idx 33-35)
  t9_void_king           → Void King              (idx 36-38)
  t10_dao_source         → Dao Source             (idx 39-41)
  t11_emperor_realm      → Emperor Realm          (idx 42-44)
  t12_open_heaven        → Open Heaven            (idx 45-50)

Notes:
  • Pose silhouette stays constant across all tiers (seated cross-legged,
    facing camera, hands in mudra at chest level, feet grounded). Only
    the robes / accessories / build escalate.
  • The "focused" pose has the SAME silhouette as "normal" — the only
    differences are the two internal-qi effects (eyes glowing through
    eyelids + chest dantian beam streaming up). NO motes/particles/halos/
    orbits/rings — those are separate VFX assets.
  • Power progression across tiers comes via robes / gear / build /
    posture, never via external VFX baked into the sprite.
"""

# ─────────────────────────────────────────────────────────────────────────────
# Style anchor — kept short so every prompt has headroom
# ─────────────────────────────────────────────────────────────────────────────

S = (
    "Xianxia pixel art, 16-bit clean lines, limited palette. Fully "
    "transparent background. The character is the SOLE subject — NO rock, "
    "NO pedestal, NO seat, NO mat, NO lotus base, NO scenery, NO props of "
    "any kind. No UI, no text, no drop shadow."
)

# Shared pose anchor — present in every cultivator design prompt so the
# silhouette is identical across tiers.
#
# CRITICAL: the character is rendered STATIC (no animation in-game), so the
# prompt must avoid anything that implies motion or would look frozen-weird:
# no flowing hair, no billowing sleeves, no swaying ribbons, no "as if in
# breeze" language, no orbiting/coiling/rising/spiraling motion verbs.
# Everything must read naturally as a single static moment.
POSE = (
    "Seated cross-legged in lotus meditation pose, hovering in empty space "
    "(no seat or surface beneath the figure), facing the camera, back "
    "straight, hands held together in a prayer/mudra at chest level. "

    "FACE — characterful, not bland. Mature features (late teens to early "
    "twenties), sharp angular jawline, high cheekbones, strong defined "
    "dark eyebrows arched slightly inward to convey resolve. Eyes are "
    "closed in deep meditation, but the brow line is intense, not "
    "passive — this is a future sovereign, not a soft pupil. Straight "
    "narrow nose. Mouth set in a determined firm line. A face that has "
    "already known struggle and is now disciplined. "

    "Hair tied neatly and held statically — no loose strands, no ribbons, "
    "no wisps. Robes hang plainly without billowing or movement. "
    "Everything about the figure reads as a single frozen meditation "
    "moment with quiet menace under the calm."
)

# Shared focused-pose negatives — appended to every focused_prompt to keep
# the Avatar-mode visual language clean (eye-glow + chest dantian beam ONLY).
FOC_NEG = (
    "NO motes, NO particles, NO dots, NO sparkles, NO orbs of any kind "
    "around the head or body. NO halo disc, NO sutra-glyph rings, NO "
    "light beams, NO thick rim or stroke around the body, NO body "
    "luminosity past the silhouette. Identical character, identical "
    "silhouette, identical robes as the reference."
)


# ─────────────────────────────────────────────────────────────────────────────
# Per-tier prompts (13 tiers, T0..T12)
# ─────────────────────────────────────────────────────────────────────────────

TIERS = {

    # ── T0 Tempered Body (idx 0-9) ────────────────────────────────────────────
    "t0_novice": {
        "name": "Novice Disciple",
        "realms": ["Tempered Body"],
        "design_prompt": (
            f"Young Xianxia novice cultivator. Plain undyed off-white cotton "
            f"robes with a simple cloth belt. Bare feet. Tan from hard labour. "
            f"Dark hair tied tightly into a simple topknot, no loose strands. "
            f"No ornaments, no jewellery, no glow. {POSE} Humblest tier — "
            f"the player's starting form. {S}"
        ),
        "focused_prompt": (
            f"Same novice cultivator as the reference image, in the same "
            f"seated meditation pose. Hands stay in the EXACT same prayer-"
            f"mudra position as the reference — DO NOT move or change the "
            f"hands. The qi-gathering is INTERNAL ('Avatar state' style), "
            f"radiating from the body itself. ONLY two qi effects exist: "
            f"• Closed eyes radiate faint cyan light leaking through the "
            f"eyelids (the eyes are still shut but visibly glowing). "
            f"• A small cyan glow at the chest dantian, visibly streaming "
            f"UP through the robe collar V. "
            f"Qi at this tier is fragile, just-discovered. {FOC_NEG} {S}"
        ),
    },

    # ── T1 Qi Transformation (idx 10-13) ──────────────────────────────────────
    "t1_qi_transformation": {
        "name": "Inner Sect Disciple",
        "realms": ["Qi Transformation"],
        "design_prompt": (
            f"Same cultivator as the reference image, now an inner-sect "
            f"disciple. White inner-sect robes with grey trim, jade-green "
            f"sash, simple cloth shoes. Wooden hairpin holding a tidy "
            f"topknot, no loose strands. Slightly stronger build than the "
            f"reference — a touch broader at the shoulders, more upright "
            f"posture, the bearing of a disciple beginning real training. "
            f"IDENTICAL face, skin tone, complexion, eyebrows, jawline, "
            f"hairline, and proportions as the reference image — character "
            f"identity is fully locked, only the build/robes/sash/hairpin "
            f"change. NO halo, NO orbiting orbs, NO glyphs, NO glow effects "
            f"of any kind — the character is shown without qi effects "
            f"(those live in the focused-pose sprite and separate VFX "
            f"layers). {POSE} {S}"
        ),
        "focused_prompt": (
            f"Same inner-sect cultivator as the reference image, in the "
            f"same seated meditation pose, now in focused cultivation. "
            f"Hands stay in the EXACT same prayer-mudra position as the "
            f"reference — DO NOT move or change the hands. The qi-"
            f"gathering is INTERNAL ('Avatar state' style), in the same "
            f"visual language as the T0 novice focused sprite — just "
            f"slightly brighter. ONLY two qi effects exist: "
            f"• Closed eyes radiate cyan light leaking through the eyelids "
            f"(eyes are still shut but visibly glowing), a touch brighter "
            f"than the T0 reference. "
            f"• A small cyan glow at the chest dantian, visibly streaming "
            f"UP through the robe collar V. "
            f"{FOC_NEG} {S}"
        ),
    },

    # ── T2 True Element (idx 14-17) — NEW design ──────────────────────────────
    "t2_true_element": {
        "name": "True-Element Cultivator",
        "realms": ["True Element"],
        "design_prompt": (
            f"Same cultivator as the reference image, now a true-element "
            f"cultivator — qi has solidified into a stable elemental "
            f"affinity. Off-white robes with jade-green trim (richer than "
            f"the previous inner-sect grey trim), bronze sash, small jade "
            f"pendant of elemental affinity at the chest, simple cloth "
            f"shoes. Carved jade hairpin (a step up from the wooden one) "
            f"holding a tidy topknot, no loose strands. Visibly more "
            f"capable build than the reference — clearly broader at the "
            f"shoulders, more grounded posture, the bearing of a cultivator "
            f"who has stabilised their qi. IDENTICAL face, skin tone, "
            f"complexion, eyebrows, jawline, hairline, and proportions as "
            f"the reference image — character identity is fully locked, "
            f"only the build/robes/sash/hairpin/pendant change. NO halo, "
            f"NO orbiting orbs, NO glyphs, NO glow of any kind — no qi "
            f"effects on the sprite (those live in separate VFX layers). "
            f"{POSE} {S}"
        ),
        "focused_prompt": (
            f"Same true-element cultivator as the reference image, in the "
            f"same seated meditation pose, now in focused cultivation. "
            f"Hands stay in the EXACT same prayer-mudra position as the "
            f"reference — DO NOT move or change the hands. The qi-"
            f"gathering is INTERNAL ('Avatar state' style), in the same "
            f"visual language as the T0 novice focused sprite — escalated "
            f"in brightness. ONLY two qi effects exist: "
            f"• Closed eyes radiate bright cyan light leaking through the "
            f"eyelids. "
            f"• A clear cyan glow at the chest dantian, streaming UP "
            f"through the robe collar V. "
            f"{FOC_NEG} {S}"
        ),
    },

    # ── T3 Separation & Reunion (idx 18-20) ───────────────────────────────────
    "t3_separation": {
        "name": "Sect Adept",
        "realms": ["Separation & Reunion"],
        "design_prompt": (
            f"Same cultivator as the reference image, now a proper sect "
            f"adept. Layered jade-green robes with phoenix embroidery along "
            f"the hem, bronze sash, a small jade pendant at the chest. "
            f"Carved jade hairpin holding a refined static topknot, no "
            f"loose strands. Visibly stronger and more disciplined build "
            f"than the reference — broader shoulders, more upright "
            f"commanding posture, the bearing of someone who has begun to "
            f"master qi. IDENTICAL face, skin tone, complexion, eyebrows, "
            f"jawline, hairline, and proportions as the reference image — "
            f"character identity is fully locked, only the build/robes/"
            f"sash/hairpin/pendant change. NO halo, NO orbiting orbs, NO "
            f"glyphs, NO glow of any kind — no qi effects on the sprite "
            f"(those live in separate VFX layers). {POSE} {S}"
        ),
        "focused_prompt": (
            f"Same sect adept as the reference image, in the same seated "
            f"meditation pose, now in focused cultivation. Hands stay in "
            f"the EXACT same prayer-mudra position as the reference — DO "
            f"NOT move or change the hands. The qi-gathering is INTERNAL "
            f"('Avatar state' style), in the same visual language as the "
            f"T0 novice focused sprite — escalated in brightness. ONLY "
            f"two qi effects exist: "
            f"• Closed eyes radiate bright cyan-white light leaking "
            f"through the eyelids. "
            f"• A clear cyan-white glow at the chest dantian, streaming "
            f"UP through the robe collar V. "
            f"{FOC_NEG} {S}"
        ),
    },

    # ── T4 Immortal Ascension (idx 21-23) — NEW design ────────────────────────
    "t4_immortal_ascension": {
        "name": "Ascending Immortal",
        "realms": ["Immortal Ascension"],
        "design_prompt": (
            f"Same cultivator as the reference image, now an ascending "
            f"immortal. Layered jade-green robes (deeper, richer green "
            f"than the previous tier) with phoenix embroidery and silver-"
            f"thread woven into the sleeves and chest. Bronze-and-silver "
            f"sash, jade pendant with silver inlay. Jade hairpin with "
            f"silver lotus tip holding a refined static topknot, no loose "
            f"strands. More imposing build than the reference — broader "
            f"chest, more powerful shoulders, the bearing of one on the "
            f"brink of immortality. IDENTICAL face, skin tone, complexion, "
            f"eyebrows, jawline, hairline, and proportions as the "
            f"reference image — character identity is fully locked, only "
            f"the build/robes/sash/hairpin/pendant change. NO halo, NO "
            f"orbiting orbs, NO glyphs, NO glow of any kind — no qi "
            f"effects on the sprite (those live in separate VFX layers). "
            f"{POSE} {S}"
        ),
        "focused_prompt": (
            f"Same ascending immortal as the reference image, in the same "
            f"seated meditation pose, now in focused cultivation. Hands "
            f"stay in the EXACT same prayer-mudra position as the "
            f"reference — DO NOT move or change the hands. The qi-"
            f"gathering is INTERNAL ('Avatar state' style), in the same "
            f"visual language as the T0 novice focused sprite — escalated "
            f"to a clearer bright cyan-white. ONLY two qi effects exist: "
            f"• Closed eyes radiate bright cyan-white light leaking "
            f"through the eyelids. "
            f"• A vivid cyan-white glow at the chest dantian, streaming "
            f"UP through the robe collar V. "
            f"{FOC_NEG} {S}"
        ),
    },

    # ── T5 Saint (idx 24-26) ──────────────────────────────────────────────────
    "t5_saint": {
        "name": "Sect Master",
        "realms": ["Saint"],
        "design_prompt": (
            f"Same cultivator as the reference image, now a sect master. "
            f"White-and-gold trimmed robes with a high collar, hanging jade "
            f"pendant, elegant gold sash. Robes hang plainly without "
            f"billowing. Ornate phoenix-tail hairpin holding a tall static "
            f"topknot, no loose strands. Visibly more powerful frame than "
            f"the reference — broader chest and shoulders, calm dominant "
            f"presence, the bearing of a seasoned sect master. IDENTICAL "
            f"face, skin tone, complexion, eyebrows, jawline, hairline, "
            f"and proportions as the reference image — character identity "
            f"is fully locked, only the build/robes/hairpin/sash/pendant "
            f"change. NO halo, NO orbiting orbs, NO glyphs, NO glow of any "
            f"kind — no qi effects on the sprite (those live in separate "
            f"VFX layers). {POSE} {S}"
        ),
        "focused_prompt": (
            f"Same sect master as the reference image, in the same "
            f"seated meditation pose, now in focused cultivation. Hands "
            f"stay in the EXACT same prayer-mudra position as the "
            f"reference — DO NOT move or change the hands. The qi-"
            f"gathering is INTERNAL ('Avatar state' style), in the same "
            f"visual language as the T0 novice focused sprite — palette "
            f"shifted toward warm gold-cyan. ONLY two qi effects exist: "
            f"• Closed eyes radiate bright golden-cyan light leaking "
            f"through the eyelids. "
            f"• A vivid golden-cyan glow at the chest dantian, streaming "
            f"UP through the robe collar. "
            f"{FOC_NEG} {S}"
        ),
    },

    # ── T6 Saint King (idx 27-29) — NEW design ────────────────────────────────
    "t6_saint_king": {
        "name": "Saint King",
        "realms": ["Saint King"],
        "design_prompt": (
            f"Same cultivator as the reference image, now a Saint King. "
            f"White-and-gold robes (richer than the previous Saint tier) "
            f"with deeper gold borders along the hem AND silver-violet "
            f"accents along the sleeves. Both dragon AND phoenix "
            f"embroidery on the chest panel. Hanging jade-and-silver "
            f"pendant. Gold-and-silver sash. Crown-like jade hairpin "
            f"with silver lotus inlay holding a tall static topknot, no "
            f"loose strands. More commanding frame than the reference — "
            f"visibly broader, more imposing presence, the bearing of a "
            f"saint who rules other saints. IDENTICAL face, skin tone, "
            f"complexion, eyebrows, jawline, hairline, and proportions "
            f"as the reference image — character identity is fully "
            f"locked, only the build/robes/hairpin/sash/pendant change. "
            f"NO halo, NO orbiting orbs, NO glyphs, NO glow of any "
            f"kind — no qi effects on the sprite (those live in separate "
            f"VFX layers). {POSE} {S}"
        ),
        "focused_prompt": (
            f"Same Saint King as the reference image, in the same seated "
            f"meditation pose, now in focused cultivation. Hands stay in "
            f"the EXACT same prayer-mudra position as the reference — DO "
            f"NOT move or change the hands. The qi-gathering is INTERNAL "
            f"('Avatar state' style), in the same visual language as the "
            f"T0 novice focused sprite — escalated to a vivid golden-cyan "
            f"palette. ONLY two qi effects exist: "
            f"• Closed eyes radiate vivid golden-cyan light leaking "
            f"through the eyelids. "
            f"• A brilliant golden-cyan glow at the chest dantian, "
            f"streaming UP through the robe collar. "
            f"{FOC_NEG} {S}"
        ),
    },

    # ── T7 Origin Returning (idx 30-32) ───────────────────────────────────────
    "t7_origin_returning": {
        "name": "Immortal Sage",
        "realms": ["Origin Returning"],
        "design_prompt": (
            f"Same cultivator as the reference image, now an immortal "
            f"sage. Layered ceremonial robes — white outer with wide "
            f"gold borders down the chest, gold under-tunic visible at "
            f"chest V, celestial AZURE collar trim (a new cosmic "
            f"element). Bold gold DRAGON emblem on chest panel AND "
            f"bold gold PHOENIX on sleeve cuff (twin bold graphics). "
            f"Wide solid gold sash with LARGE gold clasp centre. TALL "
            f"jade-and-gold crown with azure gem centre — bolder than "
            f"the previous tier's hairpin. White trousers (gold on "
            f"upper body only). Imposing immortal presence — broader "
            f"more powerful frame, regal commanding bearing. IDENTICAL "
            f"face, skin tone, eyebrows, jawline, hairline, and "
            f"proportions — character identity is fully locked, only "
            f"the build/robes/crown/sash change. NO fine embroidery, "
            f"NO thin patterns, NO halo, NO orbs, NO glow — qi effects "
            f"live in VFX layers. {POSE} {S}"
        ),
        "focused_prompt": (
            f"Same immortal sage as the reference image, in the same "
            f"seated meditation pose, now in focused cultivation. Hands "
            f"stay in the EXACT same prayer-mudra position as the "
            f"reference — DO NOT move or change the hands. The qi-"
            f"gathering is INTERNAL ('Avatar state' style), in the same "
            f"visual language as the T0 novice focused sprite — escalated "
            f"to a full gold palette. ONLY two qi effects exist: "
            f"• Closed eyes radiate bright gold light leaking through "
            f"the eyelids. "
            f"• A vivid gold glow at the chest dantian, streaming UP "
            f"through the robe collar. "
            f"{FOC_NEG} {S}"
        ),
    },

    # ── T8 Origin King (idx 33-35) — NEW design ───────────────────────────────
    "t8_origin_king": {
        "name": "Origin King",
        "realms": ["Origin King"],
        "design_prompt": (
            f"Same cultivator as the reference image, now an Origin "
            f"King. Layered ceremonial robes — gold outer continues "
            f"the gold, with CLEAR VIOLET inner robe visible at chest "
            f"opening (violet replaces the previous azure). Bold gold "
            f"ceremonial shoulder panels. Bold gold DRAGON emblem on "
            f"chest panel AND bold gold PHOENIX on sleeve cuff (twin "
            f"bold graphics). Wide solid gold sash with LARGE violet "
            f"sapphire clasp centre. TALL jade-and-gold crown with "
            f"violet sapphire centre — taller than the previous. "
            f"White trousers with gold trim. King-tier — broader "
            f"chest, more powerful frame, regal dominant bearing. IDENTICAL face, skin tone, "
            f"eyebrows, jawline, hairline, and proportions — character "
            f"identity is fully locked, only the build/robes/crown/sash "
            f"change. NO fine embroidery, NO thin patterns, NO halo, "
            f"NO orbs, NO glyphs, NO glow — qi effects live in VFX "
            f"layers. {POSE} {S}"
        ),
        "focused_prompt": (
            f"Same Origin King as the reference image, in the same "
            f"seated meditation pose, now in focused cultivation. Hands "
            f"stay in the EXACT same prayer-mudra position as the "
            f"reference — DO NOT move or change the hands. The qi-"
            f"gathering is INTERNAL ('Avatar state' style — a closed-"
            f"eye warrior visibly channeling power through glowing "
            f"eyes), escalated to a vivid gold palette. ONLY two qi "
            f"effects exist: "
            f"• EYES — closed but BLAZING with intense bright gold "
            f"light leaking through the eyelids, the eyelids glowing "
            f"as if backlit by raw power. The eye-glow is the MOST "
            f"prominent qi effect — clearly bright, powerful, the "
            f"visual focal point. "
            f"• A brilliant gold glow at the chest dantian, streaming "
            f"UP through the robe collar. "
            f"{FOC_NEG} {S}"
        ),
    },

    # ── T9 Void King (idx 36-38) ──────────────────────────────────────────────
    "t9_void_king": {
        "name": "Divine Sovereign",
        "realms": ["Void King"],
        "design_prompt": (
            f"Same cultivator as the reference image, now a divine "
            f"sovereign — cosmic war-god aesthetic (NOT priestly, "
            f"NOT white). Body VIOLET (continues from T8) with LARGE "
            f"GOLD shoulder pauldrons (massive gold armour plates "
            f"with violet sapphires). Bold gold DRAGON on chest panel "
            f"AND bold gold PHOENIX on sleeve cuff. Wide gold sash "
            f"with LARGE violet sapphire clasp centre. SHARP ANGULAR "
            f"gold-and-violet warrior crown (flame-like, NOT rounded) "
            f"with LARGE violet sapphire centrepiece. Imposing war-god "
            f"frame — broader chest, powerful shoulders, divine "
            f"commanding bearing. IDENTICAL face, WARM TAN skin (no "
            f"pink/red drift), eyebrows, jawline, hairline, and "
            f"proportions — character identity is fully locked. NO "
            f"white-dominant outer, NO fine embroidery, NO thin "
            f"patterns, NO halo, NO orbs, NO glyphs, NO glow — qi "
            f"effects live in VFX layers. {POSE} {S}"
        ),
        "focused_prompt": (
            f"Same divine sovereign as the reference image, in the same "
            f"seated meditation pose, now in focused cultivation. Hands "
            f"stay in the EXACT same prayer-mudra position as the "
            f"reference — DO NOT move or change the hands. The qi-"
            f"gathering is INTERNAL ('Avatar state' style — a closed-"
            f"eye warrior visibly channeling power through glowing "
            f"eyes), escalated to a violet-gold palette. ONLY two qi "
            f"effects exist: "
            f"• EYES — closed but BLAZING with intense bright violet-"
            f"gold light leaking through the eyelids, the eyelids "
            f"glowing as if backlit by raw power. The eye-glow is the "
            f"MOST prominent qi effect — clearly bright, powerful, the "
            f"visual focal point. "
            f"• A vivid violet-gold glow at the chest dantian, streaming "
            f"UP through the robe collar. "
            f"{FOC_NEG} {S}"
        ),
    },

    # ── T10 Dao Source (idx 39-41) — NEW design ───────────────────────────────
    "t10_dao_source": {
        "name": "Dao Source Cultivator",
        "realms": ["Dao Source"],
        "design_prompt": (
            f"Same cultivator as the reference image, now a Dao Source "
            f"cultivator — cosmic war-god escalating ADDS (NOT "
            f"priestly, NOT white, NO crimson). KEEPS T9's massive "
            f"gold pauldrons WITH violet sapphires (sapphires visible "
            f"on each). KEEPS the deep violet body. ADDS sharp "
            f"angular GOLD spikes across the chest panel (matching "
            f"the crown). ADDS VIOLET trousers with bold GOLD accent "
            f"bands (NOT white/cream). Bold gold DRAGON on chest AND "
            f"bold gold PHOENIX on sleeve cuff. Wide gold sash with "
            f"LARGE violet sapphire clasp centre. EVEN SHARPER crown "
            f"(more spikes than T9, LARGE sapphire centre). Imposing "
            f"Dao-touched frame — broader chest, more powerful "
            f"shoulders. IDENTICAL face, WARM TAN skin (no pink/red "
            f"drift), eyebrows, jawline, hairline, and proportions — "
            f"character identity is fully locked. NO white, NO "
            f"crimson, NO fine embroidery, NO halo, NO orbs, NO glow "
            f"— qi effects live in VFX layers. {POSE} {S}"
        ),
        "focused_prompt": (
            f"Same Dao Source cultivator as the reference image, in the "
            f"same seated meditation pose, now in focused cultivation. "
            f"Hands stay in the EXACT same prayer-mudra position as the "
            f"reference — DO NOT move or change the hands. The qi-"
            f"gathering is INTERNAL ('Avatar state' style — a closed-"
            f"eye warrior visibly channeling power through glowing "
            f"eyes), escalated to a deep violet-gold palette. ONLY two "
            f"qi effects exist: "
            f"• EYES — closed but BLAZING with intense bright violet-"
            f"gold light leaking through the eyelids, the eyelids "
            f"glowing as if backlit by raw power. The eye-glow is the "
            f"MOST prominent qi effect — clearly bright, powerful, the "
            f"visual focal point. "
            f"• A brilliant violet-gold glow at the chest dantian, "
            f"streaming UP through the robe collar. "
            f"{FOC_NEG} {S}"
        ),
    },

    # ── T11 Emperor Realm (idx 42-44) ─────────────────────────────────────────
    "t11_emperor_realm": {
        "name": "Dao Emperor",
        "realms": ["Emperor Realm"],
        "design_prompt": (
            f"Same cultivator as the reference image, now a Dao "
            f"Emperor — cosmic war-god escalating ADDS (NOT priestly, "
            f"NO crimson, NO white). KEEPS T10's gold pauldrons "
            f"(sapphires intact), violet body, gold-banded violet "
            f"trousers. ADDS a flowing IMPERIAL CAPE (violet with "
            f"bold gold trim). ADDS a CLEAN BOLD GOLD CHESTPLATE "
            f"covering the chest (one large solid gold armour block, "
            f"clean metal, no embroidery). ADDS a SOLID GOLD imperial "
            f"crown (clean angular silhouette, LARGE violet sapphire "
            f"centrepiece, NOT messy multi-tier). "
            f"Wide gold sash with LARGE violet sapphire clasp. "
            f"Powerful imperial frame, commanding shoulders. "
            f"IDENTICAL face, WARM TAN skin (no pink/red "
            f"drift), eyebrows, jawline, hairline, and proportions — "
            f"character identity is fully locked. NO white, NO "
            f"crimson, NO thin embroidery, NO dragon/phoenix thin "
            f"lines, NO halo, NO orbs, NO glow — qi effects live in "
            f"VFX layers. {POSE} {S}"
        ),
        "focused_prompt": (
            f"Same Dao Emperor as the reference image, in the same "
            f"seated meditation pose, now in focused cultivation. Hands "
            f"stay in the EXACT same prayer-mudra position as the "
            f"reference — DO NOT move or change the hands. The qi-"
            f"gathering is INTERNAL ('Avatar state' style — a closed-"
            f"eye warrior visibly channeling power through glowing "
            f"eyes), in the EXACT visual language of the T0-T7 focused "
            f"sprites (NO red, NO crimson). ONLY two qi effects exist: "
            f"• EYES — closed but BLAZING with intense violet-gold "
            f"light leaking through the eyelids. Bright eye-glow is "
            f"the visual focal point. "
            f"• A subtle violet-gold glow visible at the edges of the "
            f"praying hands — the qi flame is HIDDEN INSIDE the hands "
            f"(cupped between the palms, NOT visible as a drawn flame "
            f"shape), only the radiance leaking out from where the "
            f"palms meet is visible (like T0-T7 — just glow peeking, "
            f"no flame icon). "
            f"NO chunky halo, NO wide glow spread, NO general "
            f"illumination on the cape / chestplate / pauldrons. "
            f"{FOC_NEG} {S}"
        ),
    },

    # ── T12 Open Heaven (idx 45-50) ───────────────────────────────────────────
    "t12_open_heaven": {
        "name": "Heavenly Sovereign",
        "realms": ["Open Heaven"],
        "design_prompt": (
            f"Same cultivator as the reference image, ascended into "
            f"a heavenly sovereign — GOD-OF-EVERYTHING APEX (NO "
            f"white, NO crimson). KEEPS T11's pauldrons, chestplate. "
            f"GOLD-DOMINANT body armour across chest/abdomen/arms. "
            f"ADDS bold DRAGON engraving on the chestplate (clean "
            f"bold relief, NOT thin lines). ADDS multiple LARGE "
            f"violet sapphires across the armour (chest centre, sash, "
            f"pauldrons, crown — gems break up the plain gold). "
            f"UPGRADES cape to GOLDEN (gold metallic, violet inner "
            f"trim). SLEEK STAR-CROWN (sharp gold star-points, THREE "
            f"large star-gems). ADDS bold gold LOTUS on hem. Wide "
            f"gold sash with LARGE star-gem clasp. Sleeker "
            f"silhouette, broadest chest. IDENTICAL face, WARM TAN "
            f"skin (no pink/red drift), eyebrows, jawline, hairline, "
            f"and proportions — character identity is fully locked. "
            f"NO crimson, NO white, NO thin embroidery, NO halo, NO "
            f"orbs — qi effects live in VFX layers. {POSE} {S}"
        ),
        "focused_prompt": (
            f"Same heavenly sovereign as the reference image, in the "
            f"same seated meditation pose, now in focused cultivation "
            f"(apex of all tiers). Hands stay in the EXACT same prayer-"
            f"mudra position as the reference — DO NOT move or change "
            f"the hands. The qi-gathering is INTERNAL ('Avatar state' "
            f"style), in the EXACT visual language of the T0-T11 "
            f"focused sprites, escalated to a blazing white-gold "
            f"palette. ONLY two qi effects exist: "
            f"• EYES — full ICONIC AVATAR STATE eye-glow (like "
            f"Aang/Korra at peak power — both eyes blazing with "
            f"intense pure WHITE-GOLD energy through the closed "
            f"eyelids, overwhelming brightness, the unmistakable "
            f"visual focal point, brightest eye-glow of any tier). "
            f"• A subtle white-gold glow visible at the edges of the "
            f"praying hands — the qi flame is HIDDEN INSIDE the hands "
            f"(cupped between the palms, NOT a drawn flame shape), "
            f"only the radiance leaking out from where the palms meet "
            f"is visible (like T0-T11). "
            f"NO chunky halo, NO wide glow spread, NO general "
            f"illumination on the cape / chestplate / pauldrons. "
            f"{FOC_NEG} {S}"
        ),
    },

}


# ─────────────────────────────────────────────────────────────────────────────
# Heavenly aura — single underlay, rendered BEHIND the cultivator when the
# ad boost is active. Cosmic violet-gold (default; swap palette here if you
# pick a different colour later — gold / jade / rainbow).
# ─────────────────────────────────────────────────────────────────────────────

HEAVENLY_AURA = {
    # Single-frame static fallback. Not used when the animated variant ships,
    # but kept here in case we want a no-animation build target later.
    "design_prompt": (
        f"Xianxia heavenly aura, designed to sit BEHIND a meditating "
        f"cultivator sprite. The center of the image is FULLY TRANSPARENT "
        f"(where the cultivator will go) — only the aura ring and beams are "
        f"drawn. Cosmic violet-and-gold palette. A large warm-gold sun-disc "
        f"halo behind where the head would be. A ring of small static "
        f"star-points and etched sutra-glyphs around the outline. Static "
        f"violet-gold light beams radiating outward from the disc. NO base, "
        f"NO mandala, NO lotus, NO ground anchor — the aura is pure "
        f"radiance only. Fully transparent background. Pixel art, 16-bit "
        f"clean lines."
    ),

    # 4-frame animation. At 256×256 the PixelLab API returns 1 image per
    # call, so the pipeline does one call per frame: frame 0 has no
    # reference (seeds the look), frames 1-3 each reference the previous
    # frame so the design stays locked while the flames shift state.
    # Stitched into a 1024×256 spritesheet by gen_cultivator.py.
    "anim_frames": [
        # Frame 0 — flames at rest
        (
            f"4-frame animated heavenly aura behind a meditating cultivator, "
            f"this image is FRAME 0 of 4 (flames at rest). Fully transparent "
            f"center (cultivator goes there — DO NOT draw a cultivator). "
            f"Cosmic violet-and-gold palette. A warm gold sun-disc halo "
            f"behind where the head would be. Tongues of violet-gold qi-"
            f"flame curl outward from the silhouette in a calm relaxed "
            f"state. A few small star-motes around the edges. NO base, "
            f"NO mandala, NO lotus. Pure radiance, fully transparent "
            f"background, 16-bit pixel art, clean lines."
        ),
        # Frame 1 — flames swirl one step
        (
            f"Same heavenly aura as the reference image, this image is "
            f"FRAME 1 of 4. Identical sun-disc, identical palette, "
            f"identical center transparency. The violet-gold qi-flames "
            f"have swirled one step clockwise — slightly longer flame "
            f"tongues, beams elongated. Sun-disc pulsing slightly "
            f"brighter. Star-motes shifted slightly. Subtle motion — "
            f"the OVERALL outline stays close to the reference so it "
            f"never reframes under the cultivator sprite."
        ),
        # Frame 2 — peak intensity
        (
            f"Same heavenly aura as the reference image, this image is "
            f"FRAME 2 of 4 (peak intensity). Identical sun-disc position, "
            f"identical palette, identical center transparency. The "
            f"violet-gold qi-flames are at maximum extension — long "
            f"flicking tongues curling outward, beams reaching farther, "
            f"sun-disc at brightest. Star-motes drift outward. The aura "
            f"feels alive and powerful. Same overall outline as reference."
        ),
        # Frame 3 — flames retract toward rest
        (
            f"Same heavenly aura as the reference image, this image is "
            f"FRAME 3 of 4 (returning toward rest). Identical sun-disc, "
            f"identical palette, identical center transparency. The "
            f"violet-gold qi-flames retract — shorter tongues than peak, "
            f"beams contracting. Sun-disc dimming. Star-motes returning "
            f"inward. The aura is about to loop back to Frame 0. Same "
            f"overall outline as the reference."
        ),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# Self-test — run this file directly to verify every prompt is under the
# PixelLab 2000-char limit. Run: `python scripts/cultivator_prompts.py`
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    LIMIT = 2000
    print(f"\nPrompt length audit (limit {LIMIT} chars):\n")
    bad = 0
    for tier_id, tier in TIERS.items():
        for key in ("design_prompt", "focused_prompt"):
            n = len(tier[key])
            marker = "OK " if n <= LIMIT else "FAIL"
            print(f"  {marker}  {tier_id}.{key:18s} {n:4d} chars")
            if n > LIMIT:
                bad += 1
    n = len(HEAVENLY_AURA["design_prompt"])
    marker = "OK " if n <= LIMIT else "FAIL"
    print(f"  {marker}  heavenly_aura.design_prompt   {n:4d} chars")
    if n > LIMIT:
        bad += 1
    total = sum(
        len(t["design_prompt"]) + len(t["focused_prompt"]) for t in TIERS.values()
    ) + len(HEAVENLY_AURA["design_prompt"])
    print(f"\nTotal sprites to generate: {len(TIERS) * 2 + 1} ({len(TIERS)} tiers × 2 + 1 aura)")
    print(f"{'All under limit' if bad == 0 else f'{bad} over limit'}.")
