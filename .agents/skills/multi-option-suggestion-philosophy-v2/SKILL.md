---
name: multi-option-suggestion-philosophy-v2
description: Use when designing how a calculator app surfaces branching choices to the user. Triggers when the user wants to (a) decide between auto-pick vs suggest, (b) place an option picker product-tied vs cross-cutting, (c) handle optional accessories with many-to-many parent links, (d) build a natural-language entry surface (description box, voice, sketch) with parse → preview → confirm flow, (e) avoid the "silent default" anti-pattern. Captures the 4-state rule taxonomy (auto_add / suggested / optional / warning), the inline-vs-bottom placement heuristic, the 4-state confidence chip vocabulary (stated / inferred / default / missing), the optional-accessory many-to-many schema (isOptionalAccessory + optionalChildOf), and the skip-persistence rule.
---

# Multi-option suggestion philosophy

Calculator apps are full of branching choices the user has opinions about. This skill captures the discipline for surfacing those choices well: when to suggest vs auto-pick, where to surface them, how to make defaults transparent, how to handle natural-language description as a multi-option discovery surface.

## The premise

Multi-option moments are everywhere in tradie SaaS calculators:

- Dress rings (50mm vs 65mm post-specific)
- Domical covers (multiple sizes)
- Drivers (Phillips vs square)
- Driver bits (multiple sizes)
- Grout / concrete (5+ brands)
- Fixings (timber vs concrete substrate)
- Gate hinges (12+ options)
- Optional safety accessories (TruClose hinge caps, etc.)

The wrong move is silent auto-pick. The right move depends on the option's relationship to the parent product.

## Two placement heuristics

### Product-tied accessories → inline at parent selection

When the option only matters in the context of a specific parent (post → dress ring, gate → hinge variant), surface it AT the parent's selection moment:

- User picks a 65mm post → next to the size selector, a "Dress ring style" group with the 65mm-compatible options
- User picks a TruClose hinge → an "Optional add-ons" group reveals the safety caps
- Multi-select where multiple add-ons may apply

The picker collapses once the user moves on. The parent is the visual anchor.

### Cross-cutting consumables → bottom-of-BOM panel

When the option applies across the whole job (silicone, threadlocker, paint, epoxy, mixing buckets), surface it AFTER the BOM is generated, in a "Suggested for this job" panel at the bottom. These are job-wide, not item-tied. User checks any they want; un-checks default.

## Default cheapest-fit when forced to pick

Some options can't go un-picked (the calculator needs SOMETHING to dispatch). When forced to default, pick the cheapest fitment. Mark the chip `default` (lighter visual treatment) so the user knows it's a placeholder, not their explicit choice.

Examples:
- Gap = 9mm if no gap mentioned
- Mounting method = concreted (per Liam's preference)
- Termination = post_post (post-to-post)
- Cornercount = 0 (straight run)

## The canonical rule taxonomy

`auto_add | suggested | optional | warning` — defined in the QuickScreen repo by `.claude/skills/glass-calc-project-manager/SKILL.md` and `.claude/skills/glass-calc-catalogue-extractor/SKILL.md`. This is the canonical 4-state classification for BOM rules:

| Rule | Behaviour | Multi-option treatment |
|---|---|---|
| `auto_add` | Required for a valid BOM | Never multi-option; emitted automatically |
| `suggested` | Pre-calculated default; user can accept or replace | Render with default; allow swap |
| `optional` | NOT in BOM until user opts in | Render the picker; user opts in (multi-select) |
| `warning` | Constraint or decision note | Surface as a flag, not a line item |

Adopt this taxonomy in any tradie SaaS seed schema. The naming carries discipline: "optional" specifically means "do NOT auto-add."

## Natural-language entry as multi-option discovery

(From Brief AV — the "Describe Your Fence" feature)

A description box ("I want 30m of 1.8m fence in Monument with one gate") is itself a multi-option signal. Each parsed attribute is a choice that's been pre-filled to varying degrees of confidence.

Rather than apply silently, run a **parse → preview → confirm** loop:

1. **Parse** — produce an intermediate `ParseResult` mapping each attribute to a value + confidence
2. **Preview** — show the user a card with one chip per attribute, each chip styled per the four confidence states
3. **Confirm** — user clicks chips to fix anything wrong, then "Apply to calculator"

### Four confidence states

| State | Meaning | Example |
|---|---|---|
| **Stated** | Explicitly mentioned | "65mm slats" → slatSizeMm 65, stated |
| **Inferred** | Derived from context | "aluminium slat fence" → systemType QSHS, inferred |
| **Default** | Not mentioned; sensible default applied | mountingMethod = concreted, default |
| **Missing** | Needed but absent | colourCode for a non-default brief, missing |

The user always has the final say. No silent commit.

This pattern works for any natural-language entry surface — voice notes, sketch upload, AI-extracted CAD specs. Same chip vocabulary across all of them.

## Optional accessory many-to-many pattern

(From Brief AU.3)

Some accessories are optional add-ons for multiple parents (TruClose hinge safety caps fit any TruClose hinge variant). The schema is many-to-many:

```json
{
  "sku": "TC-SAFETY-CAPS-2PK",
  "isOptionalAccessory": true,
  "optionalChildOf": ["TC-H-AT-B", "TC-H-AT-2L-B", "TC-H-HD-B", "TC-H-HD-2L-B"],
  "qtyPerParent": 1
}
```

Dispatcher rules:
- `isOptionalAccessory: true` → exclude from auto_add
- Include only when user explicitly opts in via the inline picker

UX:
- When user picks any parent, look up all SKUs where `optionalChildOf` includes parent
- Render "Optional add-ons" group inline with the parent picker
- Multi-select (one parent → many accessories shown at once)
- **Per-scope opt-in:** same parent in two gates → independent opt-in (user might want safety caps on the front gate but not the back gate)
- Changing parent SKU clears that parent's `optionalAddOns` entry — user re-picks for the new parent

## Skip persistence

If a user closes a multi-option picker without selecting, that "no thanks" stays "no thanks" for the rest of the run. Don't re-prompt unless:
- A pre-requisite changes (e.g. user swaps the parent SKU)
- The user explicitly re-opens the picker

The visual cue: a small "Optional accessories ▸" link at the parent's row that re-opens the picker on click.

## Tier-break tightening: "10 more would unlock the bulk price"

When a user is within 10 units of the next quantity-tier breakpoint, surface a small chip in the BOM:

> Add 4 more posts to unlock the 40+ bulk price (-12%)

Make the chip clickable: clicking adds 4 to the line and shows the savings inline. Don't auto-add — the user pulls the trigger.

## Don't double-suggest

If a SKU is already auto-added by an `auto_add` rule (e.g. spacer packs follow slat orders), don't ALSO list it under "suggested accessories" at the bottom. Filter the suggestion panel against the current BOM line items.

## Anti-patterns to avoid

| Anti-pattern | Why it's wrong | Fix |
|---|---|---|
| Auto-pick when 2+ valid options exist | User's choice gets silently lost | Surface as picker (inline if product-tied, bottom if cross-cutting) |
| Auto-include optional accessories in BOM | Inflates quote, undermines trust | `isOptionalAccessory: true`; user opts in |
| Silent default with no visual cue | User assumes it's their choice | `default` confidence chip; lighter visual treatment |
| Re-prompting after user dismissed | Annoying | Skip persistence per run |
| Showing a suggestion that's already in BOM | Looks like a bug | Filter suggestion panel against current lines |
| Tier-break without showing the savings | User has to math | Show percentage discount inline |
| Description applied silently | User can't audit | Parse → preview → confirm |

## In the QuickScreen repo

The repo splits these concerns across a 6-skill specialist team. This portable skill maps onto:

- **`.claude/skills/glass-calc-project-manager/SKILL.md`** — defines the canonical `auto_add | suggested | optional | warning` rule taxonomy; orchestrates which calculator slice ships next
- **`.claude/skills/glass-calc-ui-designer/SKILL.md`** — repo-specific design goals: "Make suggested accessories obvious but not automatically included"; "Show only valid options for the selected system and current choices"
- **`.claude/skills/glass-calc-catalogue-extractor/SKILL.md`** — captures `rule_type` per SKU during catalogue extraction with these four states
- **Brief AU.3** (`/agent/workspace/codex-briefs-batch-2/AU-...md`) — the optional accessory many-to-many implementation
- **Brief AV** (`/agent/workspace/codex-briefs-batch-2/AV-...md`) — the parse-preview-confirm implementation
- **`describe-fence-test-corpus.md`** — the canonical input/output contract for the natural-language parser

When working in another tradie SaaS app, port the patterns; the repo references stay anchored here.

## Carry-forward checklist for the next app

1. Define the 4-state rule taxonomy in your seed schema (`auto_add | suggested | optional | warning`)
2. Mark `isOptionalAccessory: true` on every accessory not strictly required for valid BOM
3. Build the parse → preview → confirm flow as the natural-language entry skeleton (works for voice, text, sketch — all share the same chip vocabulary)
4. Bake the inline-vs-bottom heuristic into the BOM dispatcher
5. Implement skip persistence in multi-option pickers (don't re-prompt)
6. Surface tier-break savings inline ("Add N more to unlock -X%")
7. Filter suggestion panels against current BOM to avoid double-suggesting
