# Antigravity build prompt — Amazing Fencing pricing & calculators

You are building on the **Anyfence** platform (multi-supplier fence-calculator engine + Supabase/Postgres backend). You already have the **anyfence-build-pack** in your knowledge base (platform overview, calculator-engine architecture, `fence_system_config` schema, BOM & cut math, the canonical product-name contract, AU compliance rules, and the supplier/contractor data model). This bundle is an **incremental handoff**: it adds Amazing Fencing's real tier-2 pricing and the decisions already ratified by Fence Forge (the canonical-name owner). Build from these artifacts, not from guesses.

## What this is

Amazing Fencing (multi-state contractor + supplier, est. 1989) is the pilot supplier. They were already onboarded (briefs 045/046) with 6 `amazing-*` system instances; the timber instance was priced, but Colorbond/composite/aluminium were "pricing pending." We parsed their Cin7 exports, built tier-2 price books for all four systems (736 lines, zero null prices), and had every canonical name ratified by Fence Forge. **Brief 047 is cleared to publish.**

## Your job, in order

1. **Implement Brief 047** (`briefs/brief_047_amazing_pricebook_v2.md`) — the authoritative spec. It adds the Colorbond price book + two timber price fixes to Amazing's instances. Seed data: `seed-data/brief_047_seed_timber_colorbond.csv` (620 lines).
2. **Stage follow-on briefs 048/049/050** (composite, aluminium-slat, aluminium-gate) using the per-system price books in `seed-data/per-system/` — but only after their archetypes exist (see Dependencies).

## Non-negotiable rules (these are contracts, not preferences)

- **Append-only price books.** Create a NEW `supplier_price_book` version for Amazing. Do NOT mutate the brief-046 version — existing quotes stay pinned to the version they were quoted against.
- **Own-SKU passthrough.** Price books are keyed on Amazing's own Cin7 SKUs. The `canonical_name` is an additive join, not a replacement.
- **Canonical names are a versioned contract — never rename.** Use the exact ratified patterns in Brief 047 (e.g. Colorbond infill = `{height}mm {Metzag|Metline} Colorbond Infill Sheet {colour}`; profile is IN the name, not a variable). Adding names is fine; renaming is a breaking change.
- **`localBomCalculator.ts` is a PROTECTED file. Do not touch it.**
- **Concrete:** set `system_instances.config.concrete_bag_size_kg = 30` for every Amazing instance with concrete in the BOM. The treated-pine kernel is parameterised (`concrete_helpers.py`: 1.0 bag/post at 30kg vs 1.5 at 20kg). Until Liam saves the treated-pine SKILLCONFIG draft, keep a `concrete_bag_size_scaling_pending` annotation on Amazing's concrete pricing rules.
- **Ship through the Codex brief queue / PR + review gate** for anything touching paying-customer pricing. This is a brief to implement, reviewed before it hits prod.

## Authority & provenance

- `fence-forge-correspondence/` holds the full canonical-name ratification (Fence Forge → Build Forge, rounds 1–3). Treat Fence Forge's ratified patterns as the contract.
- `specs/` holds the two NEW archetype specs Fence Forge drafted: `aluminium-slat-fence-calculator` and `composite-retaining-wall-calculator`. These define input schemas, constants, BOM kernels, validation, and canonical names for the follow-on briefs.
- `context/` holds the Amazing Fencing JobFlow System spec (their full Channel-2 SaaS scope — the calculator is §4 Quote Builder + §13 Products/Pricing) and the Supabase workflow governance doc.

## Validation gate (must pass before 047 merges)

Worked quote — **30m × 1800mm Colorbond Monument + 1 single gate, tier-2:**

| Line | SKU | Qty | Unit ex | Line ex |
|---|---|---|---|---|
| 1790mm Metzag Colorbond Infill Sheet Monument | FZSMO17 | 39 | $16.30 | $635.70 |
| Colorbond C-Post 2400mm Monument | FNPMO24 | 14 | $8.56 | $119.84 |
| Colorbond Fence Rail 2365mm Monument | FRMMO23 | 26 | $8.45 | $219.70 |
| Colorbond Post Cap Monument | CCAPMO | 14 | $2.25 | $31.50 |
| Colorbond Single Gate Monument | — | 1 | $82.92 | $82.92 |
| Post Mix Concrete 30kg | DMPM3056LD | 14 | $9.80 | $137.20 |
| **Materials ex GST** | | | | **$1,226.86** |
| **Total inc GST** | | | | **$1,349.55** |

(Concrete = 14 bags @ 1.0/post for 30kg. BOM quantities come from the Colorbond calculator's documented 30m×1800mm+gate example: 13 bays / 14 posts / 26 rails / 39 infill. Engine math is Fence Forge's; you wire the pricing.)

## Dependencies (don't run ahead of these)

- Brief 047 depends on foundation briefs **032–034** (supplier/archetype/instance schema, backfill, versioned price books) and **045/046** (Amazing supplier + 6 instances + timber price book) being live.
- A **timber-paling archetype** must exist (maps to `treated-pine-paling-fence-calculator`, spec doc on Fence Forge's side).
- Follow-on briefs need their archetypes first: **048** ← `composite-retaining-wall-calculator`; **049** ← `aluminium-slat-fence-calculator` (both specs in `specs/`); **050** ← `aluminium-gate-calculator` (not yet drafted — 20 Quickscreen Gate SKUs).

## Division of labour

- **Fence Forge** owns the canonical-name contract + BOM math kernels (the calculator skills).
- **Build Forge** (this bundle's author) owns the supplier-side instances + price-book mapping.
- **You (Antigravity)** implement the platform/DB/app: schema, seed loaders, RLS, admin UI, price-book versioning, and the calculator-invoke layer that passes `concrete_bag_size_kg` from supplier config into the kernel.

Start with Brief 047. Confirm the validation quote passes, then report back before touching the follow-on briefs.
