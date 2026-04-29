# MartialArtsIdle — UI Design Standards

> **Purpose:** Every new screen, component, or CSS edit must follow these rules.
> If something here doesn't cover your case, extend it here — don't invent a parallel system.
>
> **Source of truth:** `src/index.css` (variables), `src/App.css` (components).

---

## 1. Color System — Hierarchy, Tiers, and Where Each Is Used

All colors live in `src/index.css`. The rule is simple: **if you're writing a hex value or a raw `rgb()` literal that isn't a rarity/element semantic color, you're doing it wrong.**

---

### 1A. Text Color Tiers — Use in order of information importance

There are 7 text tiers. Every text element in the game belongs to exactly one tier.

| Tier | Token / Value | When to use | Real examples |
|---|---|---|---|
| **T1 — Primary content** | `var(--text-primary)` = `#eee` | Item names, modal titles, card headings, button labels, dialogue | `.inv-slot-name`, `<h1>`, `.pill-drawer-card-name`, `.reinc-node-label` |
| **T2 — Values / numbers** | `rgba(var(--ui-hover-rgb), 0.90)` | Stat numbers, counts, prices, quantities — anything the player reads as a "result" | `.secondary-stat-value`, `.coll-count`, `.reinc-stat-value`, damage numbers |
| **T3 — Interactive / selected** | `rgba(var(--ui-hover-rgb), 0.75)` | Hovered item names, selected state text, tab labels on hover | Active filter chip text, hovered card name |
| **T4 — Labels / captions** | `rgba(var(--ui-label-rgb), 0.65)` | Stat labels next to values, secondary descriptions, card subtitles | `.secondary-stat-label`, `.law-passive-desc`, `.reinc-stat-label` |
| **T5 — Section titles** | `var(--ui-text-section)` = `rgba(var(--ui-label-rgb), 0.55)` | Uppercase group/section headers inside a screen | `.col-section-title`, `.reinc-tree-karma-label` |
| **T6 — Meta / subtitles** | `var(--ui-text-meta)` = `rgba(var(--ui-label-rgb), 0.42)` | Page-level subtitles, small metadata lines, ingredient hints | `.coll-page-subtitle`, `.pill-drawer-card-effect` |
| **T7 — Hints / empty** | `var(--ui-text-caption)` = `rgba(var(--ui-label-rgb), 0.30)` | Empty state messages, placeholder text, very low-priority hints | `.pill-drawer-empty`, `.inv-slot-hint` |

**Muted variants** (for icons and disabled states — use `--ui-muted-rgb`, not `--ui-label-rgb`):

```css
rgba(var(--ui-muted-rgb), 0.65)   /* muted secondary text (slightly warmer grey) */
rgba(var(--ui-muted-rgb), 0.55)   /* muted icons, inactive tab icons */
rgba(var(--ui-muted-rgb), 0.45)   /* very muted decorative separators */
```

**Decision rule:** Ask "is the player actively reading this to make a decision?" → T1/T2. "Is it a label that explains the number?" → T4. "Is it a group header?" → T5. "Is it tiny metadata below the fold?" → T6/T7.

---

### 1B. Background / Surface Tiers — Use in order of depth (deepest first)

| Tier | Token / Value | When to use | Real examples |
|---|---|---|---|
| **BG0 — App background** | `rgb(var(--ui-bg-deep-rgb))` = `rgb(5,2,14)` | The outermost `<body>` / `#root` background. Never put this on a card. | `body`, `.app-wrapper` |
| **BG1 — Nav / sidebar** | `rgba(var(--ui-bg-deep-rgb), 0.95)` | Fixed nav bars, bottom tab bars, deep persistent chrome | `.bottom-nav`, `.sidebar` |
| **BG2 — Panel / modal** | `rgba(var(--ui-bg-panel-rgb), 0.95)` | Floating modals, overlay panels, drawers | `.pill-modal`, `.coll-modal-panel`, `.qi-spark-modal` |
| **BG3 — Card base** | `rgba(var(--ui-bg-panel-rgb), 0.88)` | All cards — canonical `inv-slot` value. **Do not deviate.** | `inv-slot`, `.build-law-card`, `.secondary-stat-row`, `.art-inline-card` |
| **BG4 — Nested surface** | `rgba(var(--ui-bg-panel-rgb), 0.75)` | Elements nested inside a card — inner rows, sub-sections | `.spark-row`, `.qi-spark-card` inner panels |
| **BG5 — Subtle tint** | `rgba(255, 255, 255, 0.04)` = `var(--ui-surface-subtle)` | Hover highlight strips, active row tints, barely-visible separators | Table row hover, selected list item bg |

**Decision rule:** Every new element, ask: "Is this floating above everything? (BG2) Is it a card? (BG3) Is it inside a card? (BG4)." If it's on the page background directly, it's BG0. Never invent a value between these tiers.

---

### 1C. Border Tiers — One of three values, nothing else

| Tier | Token | When to use | Real examples |
|---|---|---|---|
| **B1 — Card/slot edge** | `var(--ui-border-light)` = `rgba(255,255,255,0.10)` | All cards, slots, modal panels — **the default, most common** | `inv-slot`, `.build-law-card`, `.pill-modal`, stat rows |
| **B2 — Inner divider** | `var(--ui-border-subtle)` = `rgba(255,255,255,0.07)` | Horizontal rules inside a card, sub-section dividers | Dividers between card sections, separator lines |
| **B3 — Barely visible** | `var(--ui-border-faint)` = `rgba(255,255,255,0.05)` | Ghost outlines, decorative separators that shouldn't read as lines | Background grid lines, very low-key structure |

**Rule:** If you're not sure which to use, use `var(--ui-border-light)` (B1). The other two only exist when you need something lighter than a card edge.

---

### 1D. Interactive / Accent States — The action colors

These only go on interactive elements (buttons, tabs, active selections). Never on passive display cards.

```css
/* Primary CTA / active tab */
var(--accent)            /* #e94560 — the red-pink hit. Active tabs, main action buttons */
var(--accent-rgb)        /* 233, 69, 96 — for rgba() glows/shadows on accent elements */
var(--ui-accent-surface) /* rgba(accent, 0.12) — filled background of the active tab */
var(--ui-accent-border)  /* rgba(accent, 0.45) — border ring on active tab */
var(--ui-accent-glow)    /* rgba(accent, 0.10) — outer box-shadow on active tab */

/* Purple interactive chrome (secondary actions, hover glows, equipped state) */
rgba(var(--ui-purple-rgb), 0.35)        /* button border on hover */
rgba(var(--ui-purple-strong-rgb), 0.55) /* equipped-state inset ring */
rgba(var(--ui-purple-rgb), 0.15)        /* subtle button background on hover */
```

**Decision rule:** Is it the primary action or currently-selected tab? → `--accent` red. Is it a secondary interactive state (hover, equipped, purchased)? → purple rgb family.

---

### 1E. Purple Solid Tokens — For text that must read as a highlight

Use these only when you need a solid (non-rgba) purple color for text or decorative elements.

| Token | Value | Use for |
|---|---|---|
| `var(--ui-purple-light)` | `#c4b5fd` | Highlight text, equipped labels, small accent labels |
| `var(--ui-purple-soft)` | `#a78bfa` | Secondary accent text, glyph icons |
| `var(--ui-purple-strong)` | `#a855f7` | Loud callout text, purchased-node labels |
| `var(--ui-purple-wash)` | `#e0d8ff` | Pale uppercase labels (rarely needed — usually T5 suffices) |

---

### 1F. Semantic / Rarity Colors — Don't map these to the UI chrome system

These colors come from game data and intentionally break the purple system because they communicate meaning.

| Source | Color | Stays as-is because... |
|---|---|---|
| Item rarity | Set per rarity tier in `data/` | Rarity must visually distinguish itself from UI chrome |
| Law rarity | Same rarity lookup | Same reason |
| Element/damage type | Per-type color in `data/` | Fire ≠ Water ≠ Lightning — semantic |
| Gold rarity tier | `#f5c842` (in data files only) | It's the "Gold" rarity color, not a UI decoration |
| Urgent state | Amber `rgba(251,191,36,X)` | `.active-spark-row-urgent` — communicates danger |
| Warn badge | Amber `.col-section-badge.is-warn` | Amber = "something needs your attention" |
| Gameplay VFX | Cyan `rgba(92,216,255,X)` | Cultivation ring, realm boost — these are game effects |

**Rule:** If the color encodes game information (what type is this? how rare? is this dangerous?), keep it. If it's UI chrome (is this a card? is this a label?), use the purple system.

---

### 1G. CSS Custom Props — Passed from JSX, consumed by CSS

These are **set in JSX** on a container element and **consumed in CSS**. Never read them from JS directly in a `color:` prop — put it on the element style and let CSS pick it up.

| Prop | Set by | Consumed by |
|---|---|---|
| `--rarity-color` | Item/law rarity lookup | `.alc-forge-name`, `.law-rarity-badge`, `.law-passive-desc`, etc. |
| `--slot-quality` | Artefact quality lookup | `.gear-slot-filled`, `.gear-slot-quality-dot`, `.gear-slot-name-filled` |
| `--item-quality` | Artefact quality lookup | `.art-inline-card-equipped`, `.art-inline-card-name` |
| `--tech-color` | Technique type color | `.tech-icon-glyph`, `.tech-icon-name` in combat |
| `--type-bg` | Technique type color + `22` alpha | `.tech-icon-top` background |
| `--type-color` | Technique type color | `.tech-icon` background ring |
| `--float-color` | Float message color | `.alc-float-msg` |
| `--chip-accent` | Filter chip accent | `.coll-filter-chip.is-active` border/color |

---

### 1H. Quick Reference — "What do I use for X?"

| I'm styling... | Use this |
|---|---|
| An item name, modal title, button label | `var(--text-primary)` (T1) |
| A stat number, count, price | `rgba(var(--ui-hover-rgb), 0.90)` (T2) |
| A stat label (the word "Attack" next to the number) | `rgba(var(--ui-label-rgb), 0.65)` (T4) |
| A section header ("TECHNIQUES", "PASSIVE EFFECTS") | `var(--ui-text-section)` (T5) |
| A page subtitle (the grey line under the `<h1>`) | `var(--ui-text-meta)` (T6) |
| An empty state message | `var(--ui-text-caption)` (T7) |
| A card background | `rgba(var(--ui-bg-panel-rgb), 0.88)` (BG3) |
| A floating modal background | `rgba(var(--ui-bg-panel-rgb), 0.95)` (BG2) |
| A card border | `var(--ui-border-light)` (B1) |
| A divider inside a card | `var(--ui-border-subtle)` (B2) |
| The active tab or main CTA button | `var(--accent)` |
| A hover state or equipped ring | purple rgb family |
| Rarity-specific color | data lookup → `--rarity-color` CSS prop |

---

## 2. Card System — One Base, Modifiers on Top

### The canonical card: `inv-slot`

**Every card in every screen must use `inv-slot` as its base class** — or explicitly match its exact visual properties if using `inv-slot` directly would conflict with layout (e.g., a card that needs `align-items: flex-start`).

```css
/* inv-slot — canonical card visual contract */
background: rgba(var(--ui-bg-panel-rgb), 0.88);
border:      1px solid rgba(255, 255, 255, 0.10);
border-radius: 10px;
box-shadow:  0 2px 8px rgba(0, 0, 0, 0.35);
```

**Layout properties** (these vary — `inv-slot` defaults to column/center but modifiers override):

```css
display: flex;
flex-direction: column;
align-items: center;
gap: 4px;
padding: 10px 6px;
cursor: pointer;
transition: transform 0.15s, box-shadow 0.15s;
```

### When to add `inv-slot` as a className vs just matching the CSS

- **Add the class** when the element is button-like and benefits from the `:hover`/`:active` transform states.
- **Only match the CSS values** when: the element is a `div` that shouldn't translate on hover, or layout needs `align-items: flex-start` and you don't want center.

In both cases, **do not re-invent the visual properties.** Copy the exact values above.

### Modifiers on top of `inv-slot`

```jsx
// Tech slot in build tab
className="inv-slot build-tech-slot"

// Gear slot in build tab
className="inv-slot gear-slot"

// Law card (div, not button — matched values, not class)
className="build-law-card build-law-card-compact"
/* CSS: background/border/radius/shadow match inv-slot exactly; overrides: align-items:flex-start, gap:10px, padding:14px */
```

### Quality/rarity borders on cards (inline override)

When a card shows a specific quality color, override the border inline:
```jsx
style={{ borderColor: quality.color }}
```
This overrides the default `rgba(255,255,255,0.10)` border. The card base stays `inv-slot`.

**Never** change `background`, `border-radius`, or `box-shadow` inline — those come from `inv-slot` only.

### Equipped state

```jsx
className={`inv-slot${isEquipped ? ' inv-slot-equipped' : ''}`}
```

CSS applies: `box-shadow: 0 0 0 1px rgba(var(--ui-purple-strong-rgb), 0.55) inset`

---

## 3. Page Structure — Every Screen Must Use These

### Page header

```jsx
<header className="coll-page-header">
  <h1>Screen Title</h1>
  <span className="coll-page-subtitle">Subtitle or current realm</span>
</header>
```

`coll-page-header` gives `flex-column, gap: 2px, margin-bottom: 12px`.
`coll-page-subtitle` gives `0.74rem, var(--ui-text-meta), letter-spacing 0.04em`.

### Section headers (within a screen)

```jsx
<div className="col-section-header">
  <span className="col-section-title">SECTION NAME</span>
  <span className="col-section-badge">4/9</span>  {/* optional count pill */}
</div>
```

`col-section-title`: uppercase, 0.72rem, `var(--ui-text-section)`.
`col-section-badge`: count pill on the right; turns amber (`.is-warn`) or red (`.is-critical`).

### Tab bar (top of screen, primary navigation within a screen)

```jsx
<div className="inv-tabs">
  <button className={`inv-tab${activeTab === 'x' ? ' inv-tab-active' : ''}`}>Tab Label</button>
</div>
```

`inv-tab-active` uses `--accent` (red). **Only use this for top-level screen tabs.**

For resource-type sub-tabs that need their own active color (e.g., Worlds screen gather/mine), keep a custom `worlds-tab-*` class system — do NOT force `inv-tab-active` where a different color is semantically needed.

### Screen wrapper

```jsx
<div className="screen your-screen-name">
```

---

## 4. Stat Rows

For any horizontal label → value row (Stats tab, tooltips, etc.):

```jsx
<div className="secondary-stat-row">
  <span className="secondary-stat-label">Label</span>
  <span className="secondary-stat-value">Value</span>
</div>
```

CSS contract matches `inv-slot` visually:
```css
background: rgba(var(--ui-bg-panel-rgb), 0.88);
border:      1px solid rgba(255, 255, 255, 0.10);
border-radius: 10px;
box-shadow:  0 2px 8px rgba(0, 0, 0, 0.35);
```

---

## 5. Inline Style Rules

### DO

```jsx
style={{ '--rarity-color': quality.color }}          // pass color as CSS var
style={{ '--slot-quality': quality?.color }}          // artefact slot rarity
style={{ borderColor: quality.color }}                // rarity border override on inv-slot
style={{ '--tech-color': color, '--type-bg': `${color}22` }}  // technique color
```

### DON'T

```jsx
style={{ background: someColor }}    // NEVER override card background inline
style={{ borderRadius: 14 }}         // NEVER override border-radius inline
style={{ color: '#777' }}            // NEVER hardcode grey hex — use rgba(--ui-muted-rgb, X)
style={{ color: '#f5c842' }}         // NEVER use gold — use var(--ui-purple-light)
style={{ color: 'var(--gold)' }}     // SAME — --gold is a legacy token, do not use
style={{ color: 'var(--text-muted)' }}     // LEGACY — use rgba(--ui-muted-rgb, X)
style={{ color: 'var(--text-secondary)' }} // LEGACY — use rgba(--ui-label-rgb, X)
```

---

## 6. Legacy Tokens — Do Not Use

These exist in `index.css` for historical reasons. **Do not reference them in new CSS or JSX.**

| Legacy token | Why it's wrong | Use instead |
|---|---|---|
| `var(--gold)` / `#f5c842` | Gold palette — wrong color family | `var(--ui-purple-light)` |
| `var(--text-muted)` | Neutral grey (#777) — wrong family | `rgba(var(--ui-muted-rgb), 0.55)` |
| `var(--text-secondary)` | Neutral grey (#aaa) — wrong family | `rgba(var(--ui-label-rgb), 0.65)` |
| `var(--bg-card)` | Old navy (#0f3460) — wrong family | `rgba(var(--ui-bg-panel-rgb), 0.75)` |
| `var(--bg-secondary)` | Old navy (#16213e) — wrong family | `rgba(var(--ui-bg-panel-rgb), 0.60)` |
| `var(--bg-primary)` | Old navy (#1a1a2e) | `rgba(var(--ui-bg-deep-rgb), 1)` |
| `var(--border)` | Old border (#2a2a4a) | `var(--ui-border-light)` |
| Hardcoded `rgba(245,200,66,…)` | Gold — wrong family | `rgba(var(--ui-purple-strong-rgb), …)` |
| Hardcoded `rgba(20,28,40,…)` | Old dark navy bg | `rgba(var(--ui-bg-panel-rgb), …)` |

**Safe to use anywhere:** `var(--accent)`, `var(--accent-rgb)`, `var(--text-primary)` (near-white `#eee` — fine for primary content).

---

## 7. The "Why Are These Two Cards Different?" Checklist

When two cards look inconsistent, run through this:

1. **Background:** Is one `0.88` and the other `0.75` or `0.82`? → Cards are always `0.88` (BG3). Nested inner panels use `0.75` (BG4). Modals use `0.95` (BG2).
2. **Border:** Is one `rgba(255,255,255,0.10)` and the other `0.06` or `0.07`? → Normalize to `0.10` (B1) for all cards.
3. **Border-radius:** Is one `10px` and another `8px`, `12px`, or `14px`? → Normalize to `10px` for cards; use `6px`–`8px` only for badges/pills/chips.
4. **Box-shadow:** Is one `0 2px 8px rgba(0,0,0,0.35)` and another heavier/lighter? → Normalize to the canonical value.
5. **Background gradient:** Is one using `linear-gradient(…rgba(20,28,40,…))` and another flat? → Remove the gradient; all cards use flat `rgba(var(--ui-bg-panel-rgb), 0.88)`.
6. **Text color:** Is one using `var(--text-muted)` (grey #777) and another `rgba(var(--ui-muted-rgb), 0.55)` (purple-grey)? → Always use the purple-grey family.
7. **Text tier mismatch:** Is a stat label `var(--text-primary)` (#eee) instead of T4? Is a value dim instead of bright? → Run through the T1–T7 table in §1A and assign the correct tier.

---

## 8. Scope Rules — When to Add CSS to a Screen Selector

**Only add sizing overrides under a screen scope** (e.g., `.inventory-screen .inv-slot`). Never add visual property overrides (background, border, box-shadow, border-radius) under a screen scope — those must come from the base class or be shared identically.

**Good:**
```css
.inventory-screen .inv-slot {
  padding: 8px 5px;      /* compact grid sizing */
  min-height: 78px;
}
```

**Bad:**
```css
.inventory-screen .inv-slot {
  background: linear-gradient(…);  /* creates a second card style — kills consistency */
  border-radius: 9px;              /* breaks the 10px contract */
}
```

---

## 9. Shadow / Elevation Scale

| Level | Shadow | Use for |
|---|---|---|
| Card base | `0 2px 8px rgba(0,0,0,0.35)` | `inv-slot`, `build-law-card`, stat rows |
| Card hover | `0 6px 20px rgba(0,0,0,0.50)` | `:hover` on `inv-slot` |
| Panel/modal | `0 4px 20px rgba(0,0,0,0.55)` | modals, floating panels |
| Glow ring | `0 0 0 1px rgba(var(--ui-purple-strong-rgb),0.55) inset` | equipped state |
| Accent glow | `0 0 12px var(--ui-accent-glow)` | active tab |

---

## 10. Do Not Create New One-Off Card Components

If you need a card:
1. Use `inv-slot` or match its exact visual contract.
2. Add a modifier class for layout differences only.
3. Do not define a new `background`, `border-radius`, or `box-shadow` from scratch.

If you think you need a card that looks different from `inv-slot`, ask: does the player actually need to distinguish this from other cards, or does it just look different because no one checked?
