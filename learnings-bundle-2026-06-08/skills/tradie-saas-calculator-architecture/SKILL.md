---
name: tradie-saas-calculator-architecture
id: cmp97rtoh03o607adppnccc0d
source: Hyperagent knowledge base
exported: 2026-06-08
platform_builtin: false
pinned: false
tags: []
credentials: []
---

# tradie-saas-calculator-architecture

> Architecture patterns for building SaaS calculators and BOM generators for trade industries. Covers 3-layer schema, run/section/gate hierarchy, BOM dispatch taxonomy, pricing models, and data model decisions.

## When to use
(not specified)

## Documentation
# Tradie SaaS Calculator Architecture

## Overview

Architecture patterns extracted from building a production fence calculator / BOM generator. These patterns generalize to any trade-industry SaaS tool where users configure a physical product and the system generates a bill of materials with pricing.

## The 3-Layer Schema

Every tradie calculator has three conceptual layers:

### Layer 1: Geometry (universal)
The physical layout. Independent of what product system is being used.

```
Job
 └─ Run (a continuous fence line, roof plane, deck section, etc.)
     ├─ Section (a segment between structural changes — posts, corners, joins)
     │   └─ Gate / Opening / Penetration (interruptions in the section)
     └─ Corner (where sections meet at non-180° angles)
```

**Key principle:** Geometry is universal across all product systems. A "run" of fence has the same shape whether it's aluminium slats, timber pickets, or colorbond panels. The geometry layer never references specific products.

### Layer 2: System (dispatch)
The product system assigned to a geometry element. Determines which BOM rules fire.

Examples in fencing: QSHS (Quick Screen Horizontal Slats), VS (Vertical Slats), XPL (Xpress Plus), BAYG (Build As You Go)

**Key principle:** System selection maps geometry to a specific rule set. Each system has its own BOM dispatch logic (different post sizes, rail types, bracket counts, etc.) but they all operate on the same geometry.

### Layer 3: Product Attributes (per-supplier seed)
The specific product options within a system: colours, sizes, mounting types, spacing, etc. These come from supplier catalogues and are stored as **seed JSON** — a structured data file that can be updated without code changes.

```typescript
// Seed JSON structure (per supplier, per system)
{
  system: "QSHS",
  colours: [{ code: "B", name: "Black Satin", hex: "#1a1a1a" }, ...],
  slat_sizes: [{ mm: 65, label: "65mm Slat Standard" }, ...],
  gap_sizes: [{ mm: 9, label: "9mm Gap" }, ...],
  post_sizes: [{ mm: 50, label: "50mm Post Standard" }, ...],
  mounting_types: ["Concreted in ground", "Base-plated to slab", "Core-drilled"],
  max_post_spacings: [2400, 2600, 2700],
  // ... all product options
}
```

## Run vs Section vs Gate: What lives where

This is the most important data model decision. Getting it wrong causes cascading bugs.

### Run-level attributes (span ALL sections in the run)
Things that are logically the same across the entire run:
- **System type** (QSHS / VS / etc.) — can be overridden per section, but defaults from run
- **Colour** — default for all sections; sections can override
- **Slat size** — default for all sections
- **Gap size** — default for all sections
- **Post mounting type** — default for all sections
- **Max post spacing** — default for all sections
- **Corner count** — derived from geometry (auto-calculated from angles between sections)
- **Total run length** — sum of section lengths

### Section-level attributes (vary along the run)
Things that may differ between sections in the same run:
- **Section length** — each section has its own length
- **Section height** — each section can have a different height
- **Gates within the section** — gates belong to sections, not runs
- **Setting overrides** — a section can override any run-level default (colour, slat size, etc.)

### Gate-level attributes (specific to each gate)
- **Gate width** (opening width in mm)
- **Gate type** (single swing / double swing / sliding)
- **Swing direction** (left / right)
- **Hinge side**
- **Hardware kit**
- **Position on section** (distance from section start)

### The "green match" pattern
When a section's settings match the run defaults, show a green indicator. When they differ, show which settings are different. This lets users see at a glance which sections have custom settings.

**Match comparison fields** (must all match for green):
- System type, colour, slat size, gap size, post mounting, max post spacing

**Ignored for match** (section-specific by nature):
- Height (varies per section), length (varies per section), gates (section-specific)

## BOM Dispatch Taxonomy

Every product in a BOM falls into exactly one of four categories:

| Category | Meaning | UX treatment |
|----------|---------|-------------|
| `auto_add` | Always included. Quantity derived from geometry + system rules. | Shown in BOM, no user action needed |
| `suggested` | Recommended based on configuration. User can remove. | Shown with "suggested" badge, removable |
| `optional` | Available but not auto-included. User opts in. | Shown in picker at relevant parent |
| `warning` | Configuration triggers a warning (e.g. wind load exceeded). | Alert badge, no product added |

**Key principle:** Every BOM rule maps to exactly one category. If you can't categorize a rule, the rule is ambiguous.

## Pricing Model: Per-SKU Quantity Tiers

Don't use a global tier ladder (Tier 1 = 1-10, Tier 2 = 11-50, etc.). Different products have different break points.

```typescript
interface ProductPricing {
  sku: string;
  name: string;
  tiers: Array<{
    min_qty: number;     // Minimum quantity for this price
    unit_price: number;  // Price per unit at this tier
  }>;
}

// Example: slats have breaks at 50 and 200; posts break at 10 and 50
// Tiers are sorted ascending by min_qty
// To find price: filter to tiers where min_qty <= order_qty, take the last one
```

**Bulk-buy variants:** Some suppliers offer separate SKUs for bulk packs (e.g. "BB-" prefix). These are 10-32% cheaper. Model them as separate SKUs with their own tier arrays, not as a pricing flag on the base SKU.

## Scope-Attributed Line Items

When a BOM has multiple runs/sections, each line item should track WHERE its quantity comes from:

```typescript
interface BomLine {
  sku: string;
  total_qty: number;
  sources: Array<{
    scope: "run" | "section" | "gate";
    scopeId: string;  // run ID, section ID, or gate ID
    qty: number;
  }>;
}
```

This enables filtered views: "show me only Run 1's BOM" or "show me only Gate 2's components."

## Height Formula

For slat-based fences, actual height is calculated from components:

```
actual_height = round(num_slats × (slat_size + gap) - gap + rail_allowance)
```

Where `rail_allowance` is typically 3mm for the top/bottom rail clearance.

Present height to users as a dropdown of valid slat-count options (e.g. "1823mm — 25 slats"), not as a free-text input. This prevents impossible heights.

## Gate Width Validation

Gate width validation must be conditional on gate type:
- **Single pedestrian:** total opening ≤ 2100mm
- **Double pedestrian:** per-leaf width ≤ 2100mm (total opening ≤ 4200mm)
- **Sliding:** total opening ≤ 6000mm

A common bug: treating all gates as single and rejecting valid double-gate widths above 2100mm.

## Per-Leaf BOM Dispatch (Double Gates)

Double gates are two independent leaves. BOM dispatch must calculate per leaf:
- Frame components (rails, stiles) × 2 leaves
- Slats/panels × 2 leaves (each sized to leaf width)
- Hinges: 2 per leaf (always), total 4
- Latch: active leaf only (1 total)
- Drop bolt: passive leaf only (1 total)
- Hardware kit: 1 per gate (not per leaf)

## The brand-* Token Contract

Never hardcode colours. Use semantic design tokens:

```
brand-primary    — main action colour (buttons, links)
brand-success    — positive state (green match indicator)
brand-warning    — caution state
brand-danger     — destructive actions (delete, clear)
brand-bg         — page background
brand-card       — card/panel background
brand-border     — default borders
brand-text       — primary text
brand-muted      — secondary/helper text
brand-accent     — highlight/emphasis
```

This enables dark mode, white-labelling, and per-customer theming without touching component code.

## Scripts
None
