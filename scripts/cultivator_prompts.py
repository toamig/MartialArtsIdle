"""
Cultivator sprite prompts — 8 realm tiers × 2 poses + 1 heavenly aura underlay.
Static single-frame sprites. Per-frame breathing animation was rejected as
too costly and prone to inter-frame drift; we get "alive" feel back via CSS
(subtle scale pulse on the sprite + opacity pulse on the aura).

Pipeline shape (to be implemented in `gen_cultivator.py`):

  per tier T:
    Step 1 — generate 4 design candidates from `design_prompt` (no reference
             for T0; previous tier's chosen candidate as reference for T1-T7).
    Step 2 — user picks one candidate → saved as `t{T}_normal.png`.
    Step 3 — using t{T}_normal.png as reference_images + style_image, run
             `focused_prompt` once → save as `t{T}_focused.png`. Same
             silhouette, qi effects escalated.
    Step 4 — t{T}_normal.png becomes the reference for tier T+1's Step 1,
             so the character's face/hair/proportions carry forward and the
             player sees the same person evolving across realms.

  heavenly aura:
    Same single-step flow. Design prompt describes a transparent-center aura
    with sun-disc + sutra-glyphs + light beams. Final sprite renders BEHIND
    the cultivator on HomeScreen when the ad boost is active.

All prompts target 128×128 single-frame transparent PNGs. Each is under the
PixelLab 2000-char limit (verify via `python cultivator_prompts.py`).

Notes:
  • Pose silhouette stays constant across all tiers (seated cross-legged,
    facing camera, hands in mudra at chest level, feet grounded). The
    cultivator's outline never reframes when the player crosses a tier — only
    the robes / accessories / aura escalate.
  • The "focused" pose has the SAME silhouette as "normal" — the difference
    is the qi effects radiating from the hands and crown. CSS handles the
    crossfade between the two so the boost-state swap is visually continuous.
  • Heavenly aura is generic across all tiers (Option B from the design doc).
    If it later feels under-art-directed at high realms, we'll generate 2
    more aura variants and map realm tier → aura tier (Option C).
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


# ─────────────────────────────────────────────────────────────────────────────
# Per-tier prompts (8 tiers, T0..T7)
# ─────────────────────────────────────────────────────────────────────────────

TIERS = {

    # ── T0 Novice (Tempered Body, idx 0-9) ────────────────────────────────────
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
            f"radiating from the body itself: "

            f"• Closed eyes radiate faint cyan light leaking through the "
            f"eyelids (the eyes are still shut but visibly glowing). "
            f"• A small cyan glow at the chest where the dantian is. "
            f"• A faint cyan aura outline hugs the cultivator's silhouette. "
            f"• A few subtle cyan motes hover in the air around the head. "

            f"NO qi orb between the hands, NO halo disc behind the head yet "
            f"(saved for higher tiers), NO beams. Qi at this tier is "
            f"fragile, just-discovered, shown by the body's inner glow only. "
            f"Identical character, identical silhouette as the reference. {S}"
        ),
    },

    # ── T1 Cultivator (Qi Transformation, True Element, idx 10-17) ────────────
    "t1_cultivator": {
        "name": "Inner Sect Disciple",
        "realms": ["Qi Transformation", "True Element"],
        "design_prompt": (
            f"Same cultivator as the reference image, now an inner-sect "
            f"disciple. White inner-sect robes with grey trim, jade-green "
            f"sash, simple cloth shoes. Wooden hairpin holding a tidy "
            f"topknot, no loose strands. Slightly fairer skin from less "
            f"manual work. {POSE} Same face as reference. {S}"
        ),
        "focused_prompt": (
            f"Same inner-sect cultivator as the reference image, in the "
            f"same seated meditation pose, now in focused cultivation. "
            f"Identical character, identical silhouette. A small bright cyan "
            f"qi-orb is forming between the palms; cyan threads rise along "
            f"the arms toward the crown; a faint cyan halo flickers behind "
            f"the head. {S}"
        ),
    },

    # ── T2 Adept (Separation & Reunion, Immortal Ascension, idx 18-23) ────────
    "t2_adept": {
        "name": "Sect Adept",
        "realms": ["Separation & Reunion", "Immortal Ascension"],
        "design_prompt": (
            f"Same cultivator as the reference image, now a proper sect "
            f"adept. Layered jade-green robes with phoenix embroidery along "
            f"the hem, bronze sash, a small jade pendant at the chest. "
            f"Carved jade hairpin holding a refined static topknot, no "
            f"loose strands. Calm, confident face. {POSE} Same face as "
            f"reference. {S}"
        ),
        "focused_prompt": (
            f"Same sect adept as the reference image, in the same seated "
            f"meditation pose, now in focused cultivation. Identical "
            f"character, identical silhouette. A visible cyan-white qi swirl "
            f"coils around the hands, cyan threads climb the arms in spiral "
            f"patterns, a soft cyan-white halo radiates behind the head, "
            f"and small qi orbs orbit at the shoulders. {S}"
        ),
    },

    # ── T3 Saint (Saint, Saint King, idx 24-29) ───────────────────────────────
    "t3_saint": {
        "name": "Sect Master",
        "realms": ["Saint", "Saint King"],
        "design_prompt": (
            f"Same cultivator as the reference image, now a sect master. "
            f"White-and-gold trimmed robes with a high collar, hanging jade "
            f"pendant, elegant gold sash. Robes hang plainly without "
            f"billowing. Ornate phoenix-tail hairpin holding a tall static "
            f"topknot, no loose strands. A serene wise face. {POSE} Same "
            f"face as reference. {S}"
        ),
        "focused_prompt": (
            f"Same sect master as the reference image, in the same seated "
            f"meditation pose, now in focused cultivation. Identical "
            f"character, identical silhouette. Brilliant golden-cyan qi "
            f"swirls tightly around the hands and rises along the arms in "
            f"spiral patterns. A clear golden halo radiates behind the head. "
            f"Golden qi orbs orbit at the wrists and shoulders. {S}"
        ),
    },

    # ── T4 Sage (Origin Returning, Origin King, idx 30-35) ────────────────────
    "t4_sage": {
        "name": "Immortal Sage",
        "realms": ["Origin Returning", "Origin King"],
        "design_prompt": (
            f"Same cultivator as the reference image, now an immortal sage. "
            f"Cosmic-thread robes in jade-white with subtle woven "
            f"constellation pattern, wide sleeves hanging plainly, gold-"
            f"thread sash. Lotus-shaped jade crown on the head holding a "
            f"tall static topknot, no loose strands. Faintly luminous skin. "
            f"{POSE} Same face as reference. {S}"
        ),
        "focused_prompt": (
            f"Same immortal sage as the reference image, in the same seated "
            f"meditation pose, now in focused cultivation. Identical "
            f"character, identical silhouette. Golden qi orbs orbit tightly "
            f"around the body. Faint sutra-glyphs glow at the wrists. A "
            f"clear golden halo radiates behind the head; faint white-gold "
            f"radiance at the closed eyes and the crown. {S}"
        ),
    },

    # ── T5 Sovereign (Void King, Dao Source, idx 36-41) ───────────────────────
    "t5_sovereign": {
        "name": "Divine Sovereign",
        "realms": ["Void King", "Dao Source"],
        "design_prompt": (
            f"Same cultivator as the reference image, now a divine sovereign. "
            f"Multi-layered celestial robes in violet, gold and white with "
            f"intricate embroidered dragon and phoenix patterns along the "
            f"hem. Robes hang plainly. Carved crown of static jade flames "
            f"on the head holding an elaborate static gathered topknot — no "
            f"flowing or loose hair. A subtle gold halo-disc behind the "
            f"head. Body slightly luminous. {POSE} Same face as reference. {S}"
        ),
        "focused_prompt": (
            f"Same divine sovereign as the reference image, in the same "
            f"levitating meditation pose, now in focused cultivation. "
            f"Identical character, identical silhouette. Violet-gold qi "
            f"columns rise around the body. A brilliant halo-disc blazes "
            f"behind the head. Sutra-glyphs orbit in two concentric rings "
            f"around the body. The jade lotus below glows brighter. {S}"
        ),
    },

    # ── T6 Emperor (Emperor Realm, idx 42-44) ─────────────────────────────────
    "t6_emperor": {
        "name": "Dao Emperor",
        "realms": ["Emperor Realm"],
        "design_prompt": (
            f"Same cultivator as the reference image, now a Dao Emperor. "
            f"Imperial dragon-and-phoenix embroidered robes in deep red, "
            f"gold and violet, ceremonial high collar. Robes hang plainly "
            f"without billowing. Multi-tier crown of carved golden lotus "
            f"petals on the head holding an elaborate static topknot — no "
            f"flowing or loose hair. A bright golden halo disc behind the "
            f"head. Static sutra-glyphs etched in the air at the wrists. "
            f"Cosmic blue-violet glow around the body. {POSE} Same face as "
            f"reference. {S}"
        ),
        "focused_prompt": (
            f"Same Dao Emperor as the reference image, in the same "
            f"levitating meditation pose, now in focused imperial "
            f"cultivation. Identical character, identical silhouette. A "
            f"blazing golden halo disc behind the head, violet-gold static "
            f"sutra-glyphs arranged in three concentric rings around the "
            f"body, etched spirit-dragon motifs glowing on the shoulders "
            f"of the robes. Cosmic blue-violet glow around the body. {S}"
        ),
    },

    # ── T7 Heavenly (Open Heaven, idx 45-50) ──────────────────────────────────
    "t7_heavenly": {
        "name": "Heavenly Sovereign",
        "realms": ["Open Heaven"],
        "design_prompt": (
            f"Same cultivator as the reference image, ascended into a "
            f"heavenly sovereign. Nine-layered celestial silk robes "
            f"embroidered with static constellation and dragon-motif "
            f"patterns in violet, gold and white. Robes hang plainly "
            f"without billowing. Elaborate static crown of gathered hair "
            f"with embedded star-points — no flowing or loose strands. "
            f"Multi-tiered halo disc of carved stars and etched sutra-"
            f"glyphs behind the head. Blazing white-gold light at the "
            f"closed eyes. Body luminous with cosmic radiance. {POSE} "
            f"Same face as reference. {S}"
        ),
        "focused_prompt": (
            f"Same heavenly sovereign as the reference image, in the same "
            f"levitating meditation pose, now in focused divine cultivation. "
            f"Identical character, identical silhouette. The multi-tier "
            f"halo blazes bright; constellations on the nine-layered robes "
            f"glow vivid. Etched spirit-dragon motifs blaze on the "
            f"shoulders of the robes. Closed eyes radiate white-gold light. "
            f"Static violet-gold flame motes around the body. The apex of "
            f"cultivation. {S}"
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
    print(f"\nTotal sprites to generate: {len(TIERS) * 2 + 1} (8 tiers × 2 + 1 aura)")
    print(f"{'All under limit' if bad == 0 else f'{bad} over limit'}.")
