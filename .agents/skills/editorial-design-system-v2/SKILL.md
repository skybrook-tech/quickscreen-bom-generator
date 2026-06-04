---
name: editorial-design-system-v2
description: Use when establishing or refining the design language for a SaaS app — particularly tradie / B2B calculators / professional tools where the interior should feel editorial, calm, and trustworthy. Triggers when the user wants to (a) lock in design tokens, (b) pick typography/radii/density, (c) handle color hover-codes, (d) build state-aware onboarding hint cards, (e) build parse-preview chips for natural-language entry, (f) visually distinguish AI-generated content from user-drawn content, (g) prototype-as-spec before writing PR briefs. Captures the brand-* token contract, Geist/Inter typography rules, rounded-lg-actions / rounded-full-chips conventions, color-letter-codes-with-hover pattern, tabular-nums for financial display, parse-preview chips with 4 confidence states, AI-starter visual distinction, state-aware onboarding 6-state model, and the prototype-as-spec workflow.
---

# Editorial design system

The design language for SaaS app interiors that should feel calm, trustworthy, and information-dense — like a Bloomberg terminal, a Stripe dashboard, or The Economist data page. Distilled from the QuickScreen BOM Generator build.

## The premise

Tradies use calculators in stressful contexts: in a hot ute, with a customer waiting, on a phone screen in bright sun. The interior of the app should feel **calm and predictable** — not flashy, not animated, not begging for attention.

Reserve flash for the **landing page** (where the user is choosing to engage and personality is welcome). The interior is editorial. The contrast is the point.

## brand-* token contract

All colour, spacing, and typography come from CSS custom properties exposed as Tailwind brand-* tokens. NEVER use hardcoded colours like `bg-blue-800` or `text-emerald-600` — they break dark mode, multi-tenant theming, and consistency.

Required tokens:

| Token | Role |
|---|---|
| `brand-primary` | Primary action colour, links |
| `brand-success` | Successful state, validated |
| `brand-warning` | Caution, "your call" |
| `brand-danger` | Errors, destructive actions |
| `brand-bg` | Page background |
| `brand-card` | Card / surface background |
| `brand-border` | Borders, dividers |
| `brand-text` | Primary text |
| `brand-muted` | Secondary text, hints |
| `brand-accent` | Subtle accent for chips, eyebrows |

Optional:
- `brand-amber` — softer "your call" warning
- `brand-warm` — editorial eyebrow text

Wire all tokens via `tailwind.config.js`. Any new colour value goes here, not in component code.

## Typography

Default to **Geist** (Vercel) or **Inter** (Rasmussen). Both free via Google Fonts.

Hierarchy:

| Use | Weight | Size | Token |
|---|---|---|---|
| Display headlines | 800 | 5xl-7xl | landing/hero only |
| Section headlines | 600 | 2xl-3xl | text-brand-text |
| Subsection headlines | 600 | lg-xl | text-brand-text |
| Body | 400 | 15-16px | text-brand-text |
| Helper / muted | 400 | 13-14px | text-brand-muted |
| Eyebrow / chip label | 500 | 11px tracked uppercase | text-brand-warm |
| Tabular / financial | 500 | 15-16px | tabular-nums |

### Tabular nums for financial display

Use `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums`) anywhere numbers align vertically. Without it, vertical jitter undermines the "trustworthy financial tool" feel.

## Radii conventions

| Element | Radius |
|---|---|
| Action buttons | rounded-lg (8px) |
| Cards / surfaces | rounded-lg or rounded-xl |
| Chips, swatches, status pills | rounded-full |
| Inputs | rounded-md (6px) |
| Modal / overlay | rounded-xl (12px) |

The contrast between rounded-lg actions and rounded-full chips is intentional — actions feel solid and committed, chips feel light and decorative.

## Color-as-letter-code-with-hover

For colour selectors (paint, fence, finish), don't render the full name on the chip. Render a single letter code on a colour swatch; show the full name on hover.

```html
<button class="rounded-full w-8 h-8 bg-[#1a1a1a] hover:ring-2 hover:ring-brand-primary"
        title="Black">
  <span class="text-white text-xs font-medium">B</span>
</button>
```

Pattern keeps colour-pickers compact, scannable visually, and surfaces the canonical name on demand. Use for: fence/screen colours, paint colours, finish swatches, brand colour selectors.

## Density and rhythm

- 8px base unit (Tailwind's `space-y-*` etc.)
- Card padding ≥24px; chip padding ≥16px; section padding ≥20px
- Body line-height 1.4-1.5; headline 1.2
- Body line length 65-75 characters max
- Whitespace > dividers

## Animation discipline

Reserve motion for:
- Page transitions (~400ms fade)
- State transitions in hint cards (~220ms fade between states)
- Hover affordances (subtle ring, no scale)
- Modal / drawer entry/exit (200-300ms)

Avoid: bouncing pointers, attention-grabber wiggles, animated gradients in the interior, spinning icons.

Honour `prefers-reduced-motion: reduce`.

## State-aware onboarding hint card

The 6-state model — replaces static helper text with adaptive guidance:

| State | Trigger |
|---|---|
| `IDLE` | Nothing selected |
| `RUN_CREATED` | Top-level item exists, no children |
| `CHILD_ADDED` | First child exists; **mandatory teaching moment** about parent-defaults-cascade-to-children |
| `DEFAULTS_SET` | User customised parent defaults |
| `READY_FOR_OUTPUT` | Inputs sufficient |
| `OUTPUT_GENERATED` | Auto-dismiss for the session |

Visual: white card, thin border (`border-brand-border`), compact padding (16-20px), eyebrow "TIP" or "NEXT" in `text-brand-warm` 11px tracked, body in `text-brand-text` 13.5px max ~22 words, dismiss × top-right, "Don't show again" link bottom.

Never blocks interaction.

## Parse preview chips: 4 confidence states

(NEW — from Brief AV)

For natural-language entry surfaces (description box, voice input, sketch upload), render the parsed result as a card of clickable chips. Each chip's visual treatment communicates confidence:

| State | Visual treatment |
|---|---|
| **Stated** | Solid chip, `bg-brand-card` border `border-brand-border`, `text-brand-text` |
| **Inferred** | Same as Stated + small `~` prefix glyph; lighter `bg-brand-bg` |
| **Default** | Italic, `text-brand-muted` on chip, no border emphasis |
| **Missing** | Outlined chip, `border-brand-warning text-brand-warning`, with `+ pick` button inline |

Behaviour:
- Click any chip → inline editor opens (dropdown / input)
- Selecting a new value re-badges the chip to `stated`
- Card has primary action `Apply to calculator` (rounded-lg) + secondary `Edit description`

This chip vocabulary works wherever a parser pre-fills user choices — text descriptions, voice notes, sketch uploads, image-to-layout extraction, parsed past quotes. The states are universal; the parser implementation differs.

## AI-generated content visual distinction

(NEW — from Brief AW)

When AI generates a draft (starter polyline on the map, suggested gate position, parsed layout from sketch), distinguish it from user-drawn content:

```html
<g data-source="ai-starter">...</g>
```

CSS:
- Dashed outline at 50% opacity
- Subtle `AI-placed — verify` badge in the corner
- On user confirmation ("Use this layout"), strip the data attribute and the styling

The pattern carries to any AI-generated artifact — layouts, parsed addresses, extracted dimensions, suggested geometries. The visual cue IS the trust mechanism: users don't ship AI output without seeing it as such.

## Prototype-as-spec workflow

Before writing a PR brief for a visual/UX feature, build an interactive HTML prototype that locks the visual intent. Reference the prototype in the brief.

Why:
- Codex/Cursor/etc. interpret visual specs liberally; a prototype is unambiguous
- The user can play with the prototype and react ("yes that radius / smaller font")
- Reviewers compare PR output to prototype side-by-side
- The prototype becomes a regression test

Workflow:
1. Identify the visual feature (e.g. gate hardware picker, height dropdown, BOM hero, parse preview card)
2. Build standalone HTML in `/agent/workspace/<feature>-mockup.html`
3. Use real CDN libraries (Tailwind play CDN, Geist font, Lucide via SVG)
4. PublishWebpage for shareable preview
5. Reference URL in the PR brief
6. After Codex ships, compare deploy preview to prototype

Examples from QuickScreen build: `gate-picker-mockup.html`, `height-dropdown-mockup.html`, `sliding-gate-automation-mockup.html`.

## Editorial vs flashy: when to deviate

Stay editorial in: calculator interior, BOM panel, settings, admin/dashboard, docs, reference.

Deviate intentionally for:
- **Landing page** — vibey-disco, neon, dramatic gradients, animated title (Brief AR)
- **Brand identity / lookbook / about** — saturated palettes, dramatic photography
- **Marketing pages** — bold headlines, dramatic CTAs

The contrast between disco landing and editorial interior is intentional — entering work feels like a settled, focused mode.

## Anti-patterns to avoid

| Anti-pattern | Fix |
|---|---|
| Hardcoded `bg-blue-800` | Use `bg-brand-primary` |
| Same radius everywhere | rounded-lg actions, rounded-full chips |
| Full colour names on chips | Letter-code with hover |
| Animation on every state change | Reserve motion for transitions only |
| Static "Select a thing" helper | State-aware hint card |
| Wishy-washy spec to coding agent | Prototype first, reference in brief |
| Wide line lengths (full-bleed body) | 65-75 char max for body |
| Numbers in proportional font | tabular-nums |
| AI content indistinguishable from user content | `data-source="ai-starter"` + visual distinction |
| Description applied silently | Parse-preview chips with 4 confidence states |

## In the QuickScreen repo

- **`.claude/skills/glass-calc-ui-designer/SKILL.md`** — repo-specific design goals: "first screen as the actual quoting workspace, not a landing page"; "drawing geometry is the source of layout truth, exact typed measurements are the source of dimension truth"; "post-Generate-BOM single-pane review (lines + warnings + suggested + manual + GST + grand total)"
- **brand-* tokens** — defined in `tailwind.config.js`; values are repo-specific, contract is portable
- **State-aware onboarding** — Brief AS, `GuidedHintCard.tsx`
- **Parse preview chips** — Brief AV, `ParsePreviewCard.tsx`
- **AI-starter visual distinction** — Brief AW, `data-source="ai-starter"` styling
- **Editorial vs flashy** — Brief AR (landing) vs interior (calculator)
- **Prototype examples** — `/agent/workspace/gate-picker-mockup.html`, `height-dropdown-mockup.html`, `sliding-gate-automation-mockup.html`

## Carry-forward checklist for the next app

1. Define brand-* tokens in tailwind.config.js as the FIRST visual decision
2. Pick Geist or Inter; ≤5 weights
3. Apply rounded-lg / rounded-full convention from the start
4. Use letter-code-with-hover for any colour selector
5. Build a state-aware hint card framework even before multi-step flows exist
6. Build the parse-preview chip vocabulary if you'll have ANY natural-language entry surface
7. Adopt `data-source="ai-starter"` styling from day 1 if AI features are on the roadmap
8. Prototype every visual feature before writing the brief
9. Keep the interior calm; reserve flash for the landing
10. Honour `prefers-reduced-motion` everywhere motion exists
