# Phase V3-6 — BOM Output (Per-Run Tabs + Trace Panel)

> **Status:** Not started
> **Depends on:** V3-4 (edge function response), V3-5 (page to render into)
> **Unblocks:** —

## Goal

Render the `bom-calculator` response using the **exact same BOM tab UX** as v2 (`All Items` · `Run 1` · `Run 2` · … · `Gates`), plus v3-only affordances: warnings panel, achieved-height badges, admin-gated trace drawer.

## Existing v2 pattern to reuse

`src/components/calculator/BOMResultTabs.tsx:143-239` already:
- Renders tabs with row counts
- Recomputes subtotal/GST/grand total for the active tab only
- Groups rows by category within each tab
- Shows generated-at timestamp and pricing tier

**Refactor step:** Move this file to `src/components/shared/BOMResultTabs.tsx`. Update imports in:
- `src/pages/CalculatorPage.tsx` (v2 — at `/`)
- `src/pages/CalculatorV3Page.tsx` (v3 — at `/calculator`)

No behavioural changes to the component. Single commit.

## Response → tab mapping

The edge function returns `runResults[]` matching the v2 shape:

```typescript
{
  lines: BOMLineItem[],        // all lines (filter source for tabs)
  runResults: [
    { runId, label, productCode, items: BOMLineItem[] }
  ],
  gateItems: BOMLineItem[],    // convenience — pre-filtered for Gates tab
  totals: { subtotal, gst, grandTotal },
  // ...
}
```

`BOMResultTabs` filters are:
- **All Items** tab → `lines` (aggregated across runs, de-duplicated by SKU)
- **Run N** tab → `runResults[N-1].items`
- **Gates** tab → `gateItems` (lines where `productCode ∈ gate-family products`)

`runResults[i].label` comes from the edge function, e.g. `"Run 1 — QSHS fence"` or `"Run 2 — QSHS gate"`. Label generation uses `quote_runs.description` when persisted; otherwise `productCode + sortOrder`.

## New v3-only components

### `src/components/calculator-v3/BOMWarningsPanel.tsx`

Renders above the tabs:

```
┌─────────────────────────────────────────────────────────┐
│ ⛔ Errors (blocks BOM)                                  │
│  • Height must be at least 300mm                        │
├─────────────────────────────────────────────────────────┤
│ ⚠️ Warnings                                             │
│  • Panel above 2600mm — split into additional panels    │
├─────────────────────────────────────────────────────────┤
│ ℹ️ Assumptions                                          │
│  • Defaulted finish_family to 'standard'                │
└─────────────────────────────────────────────────────────┘
```

Red for errors, amber for warnings, grey for assumptions. Errors: also hide the tab bar + Generate BOM button (prevent workflow until fixed).

### `src/components/calculator-v3/AchievedHeightBadge.tsx`

Inline badge next to each segment row:

```
Segment 1: 2500mm × Target 1800mm  →  [Achieved 1798mm]
```

Source: `computed[runId][segmentId].actual_height_mm` from the engine response. Always visible (not admin-gated) — staff need to confirm fit.

Hidden when `actual_height_mm` unset (e.g. `bay_group` segments).

### `src/components/calculator-v3/BOMTracePanel.tsx`

Collapsible drawer below the tabs. Only renders when:
1. User profile has `role === 'admin'`, **AND**
2. Response includes `trace` (server-side gated — non-admin requests receive `trace: []`)

Content:
- Table: `stage | rule_id | expression | inputs → output | error?`
- Section per run with its computed variables (`num_slats`, `actual_height_mm`, `slat_cut_length_mm`, ...)
- Section for unmatched selectors + unresolved placeholders
- Copy-to-clipboard button for debugging handoffs

**Security:** Never client-side render trace data that arrived via JWT role spoofing — the server gates it. Panel's presence alone is harmless; the content is empty for non-admins.

## Tab behaviour contract

| Active tab | Items shown | Subtotal / GST / Grand total |
|---|---|---|
| All Items | Aggregated unique SKUs across all runs | Full grand total |
| Run N | Only that run's items | Sum of that run only |
| Gates | Filter on `productCode ∈ gate-families` | Sum of gate items only |

Matches existing v2 behaviour at `BOMResultTabs.tsx:163-167` — no new logic, just new data source.

## Critical file to reuse

- `src/components/calculator/BOMResultTabs.tsx:143-239` — the tab bar + per-category table + summary layout. **Do not rebuild.**

## Pricing-tier toggle

Reuse existing `src/components/bom/PricingTierSelect.tsx`. Changing tier re-invokes `useBomCalculator` with the new `pricingTier` param. The engine's pricing stage is last (V3-4), so it's fast; no cache invalidation needed beyond `bomResult`.

Future optimisation: re-run only pricing stage (analogous to v2's `calculate-pricing` function). Not in MVP scope.

## Verification

1. Generate a valid QSHS 2-run BOM at `/calculator`
2. `All Items` tab shows aggregated BOM, grand total matches engine response
3. `Run 1` tab shows only run 1 — subtotal recomputes
4. `Run 2` tab shows only run 2 — subtotal recomputes
5. Add a gate → `Gates` tab populates
6. Introduce a `target_height_mm = 2800` → warnings panel shows blocking error, tabs hidden
7. Login as admin → trace panel renders with rule firings. Logout, login as regular user → trace panel hidden
8. Each segment row shows its achieved-height badge (e.g. "Achieved 1798mm" for target 1800mm)
9. v2 at `/` still works — `BOMResultTabs` import path change must not break the old page
10. Switch pricing tier → grand total updates; request round-trips to engine; no console errors

## Out of scope

- CSV / PDF export of v3 BOM — deferred
- Inline line-item qty override — deferred (BOMLineItem already has `onQtyChange` prop from v2; v3 wires it later)
- Extra items (ad-hoc SKUs added by staff) — v2 has `ExtraItemsInput`; not in v3 MVP
- Save BOM to quote — quote_runs tables exist (V3-1) but save flow deferred
