# Phase V3-5 — Schema-Driven Multi-Run UI at `/calculator`

> **Status:** Not started
> **Depends on:** V3-1 (engine tables), V3-2 (seed data), V3-3 (canonical types), V3-4 (edge function)
> **Unblocks:** V3-6 (BOM tabs consume the mutation result)

## Goal

Build a new page at `/calculator` where users pick a product (QSHS / QSHS_GATE), see a form generated from `product_input_schemas` + `_groups` + `_fields`, draw layouts on the existing canvas, and call `bom-calculator` — **all synchronised through the canonical payload**.

Legacy `/` (v2 `CalculatorPage`) and `/new` (v1 `MainApp`) remain untouched.

## Route

```typescript
// src/App.tsx — add route
{
  path: "/calculator",
  element: (
    <AuthGuard>
      <CalculatorV3Page />
    </AuthGuard>
  ),
}
```

Page file: `src/pages/CalculatorV3Page.tsx` (named `V3` to avoid clash with existing `CalculatorPage.tsx` at `/`).

## Directory layout

```
src/components/calculator-v3/
├── ProductSelect.tsx          # picks root product (QSHS / QSHS_GATE)
├── SchemaDrivenForm.tsx       # reads product_input_fields, renders controls
├── RunList.tsx                # maps canonical runs → RunCard[]
├── RunCard.tsx                # one run: boundaries, segments, corners
├── SegmentRow.tsx             # one segment row inside a run
├── BoundarySelect.tsx         # left/right boundary dropdown
├── CornerToggle.tsx           # add/remove corner after a segment
├── LayoutCanvasV3.tsx         # wraps FenceLayoutCanvas, toolbar from DB
├── BOMWarningsPanel.tsx       # (V3-6 but imported here)
├── BOMTracePanel.tsx          # (V3-6 but imported here)
└── AchievedHeightBadge.tsx    # (V3-6 but imported here)

src/hooks/
├── useProductSchema.ts        # TanStack Query loader
└── useBomCalculator.ts        # TanStack Query mutation
```

## `useProductSchema(productId)`

```typescript
export function useProductSchema(productId: string | null) {
  return useQuery({
    queryKey: ['productSchema', productId],
    enabled: !!productId,
    queryFn: async () => {
      // Parallel fetch: input_schema + groups + fields + layout_schema + entity_types + actions + variables + constraints
      const [schema, groups, fields, layoutSchema, entityTypes, actions, variables, constraints] = await Promise.all([
        supabase.from('product_input_schemas').select('*').eq('product_id', productId).eq('active', true).single(),
        supabase.from('product_input_groups').select('*').eq('active', true) /* filter by schema_id after */,
        // ...
      ]);
      return { schema, groups, fields, layoutSchema, entityTypes, actions, variables, constraints };
    },
    staleTime: 5 * 60_000, // rules rarely change at runtime; 5min is fine
  });
}
```

Tables read here must have `authenticated` SELECT RLS policy (V3-1).

## `useBomCalculator()`

```typescript
export function useBomCalculator() {
  return useMutation({
    mutationFn: async (payload: CanonicalPayload) => {
      const { data, error } = await supabase.functions.invoke('bom-calculator', {
        body: { payload },
      });
      if (error) throw error;
      return data as BomCalculatorResponse;
    },
  });
}
```

Mirrors existing `useBOM` shape so `BOMResultTabs` can swap between v2 and v3 results seamlessly.

## `CalculatorContext` extensions

Current shape in `src/context/CalculatorContext.tsx` is v2-focused (productId, systemType, productOptions, defaults, runs[], bomResult). Extend for v3:

```typescript
export interface CalculatorState {
  // existing v2 fields unchanged
  productId: string | null;
  systemType: string | null;
  productOptions: ProductOptions | null;
  defaults: CalculatorDefaults;
  runs: RunConfig[];
  bomResult: CalculatorBOMResult | null;

  // new v3 fields
  canonicalPayload: CanonicalPayload | null; // null = v2 mode
  productSchema: ProductSchemaBundle | null;
  v3BomResult: BomCalculatorResponse | null;
}

type CalculatorAction =
  | /* existing actions */
  | { type: "SET_CANONICAL_PAYLOAD"; payload: CanonicalPayload }
  | { type: "UPSERT_RUN"; run: CanonicalRun }
  | { type: "UPSERT_SEGMENT"; runId: string; segment: CanonicalSegment }
  | { type: "REMOVE_SEGMENT"; runId: string; segmentId: string }
  | { type: "SET_PRODUCT_SCHEMA"; schema: ProductSchemaBundle }
  | { type: "SET_V3_BOM_RESULT"; result: BomCalculatorResponse };
```

v2 actions stay untouched — both modes coexist in the same context so future consolidation is easy.

## `SchemaDrivenForm` rendering

```typescript
function SchemaDrivenForm({ schema, groups, fields, variables, onChange }) {
  // Group fields by group_key, respect parent_group_key for nested (runs > segments)
  // For each field:
  //   - resolve options: options_json | product_variables.options_json | src/lib/constants.ts enum
  //   - check visible_when_json against current canonicalPayload state
  //   - pick control: select | number | text | toggle based on control_type
  //   - emit data-testid={field_key}
}
```

**Field → control mapping:**

| control_type / data_type | Component |
|---|---|
| `select` / `enum` | `<select>` or reuse `ColourSelect`, `SlatSizeSelect`, `SlatGapSelect` when `field_key` matches a known key |
| `number` / `number` or `integer` | `<input type="number">` with min/max from `product_constraints` |
| `text` / `text` | `<input type="text">` |
| `toggle` / `boolean` | `<input type="checkbox">` |

**Reuse `src/lib/constants.ts`** when `options_json` is empty — the COLOURS / SLAT_SIZES / SLAT_GAPS / HINGE_TYPES / LATCH_TYPES arrays are already well-typed.

**visible_when_json** example: `{"segment_kind": ["panel", "gate_opening"]}` — field only renders when parent segment's `segment_kind` is one of those values. Simple equality check on canonical payload.

## `LayoutCanvasV3`

Thin wrapper over `src/components/canvas/FenceLayoutCanvas.tsx`:

- Pulls `product_layout_actions` from `productSchema` (V3-2 seeds `add_run`, `add_panel_segment`, `add_bay_group`, `add_gate_opening`, `set_corner`)
- Renders one toolbar button per action, invoking canvas engine API
- On `getLayout()` → call `canvasLayoutToCanonical(layout, productCode, variables)` adapter (V3-3) → dispatch `SET_CANONICAL_PAYLOAD`
- On canonical payload change from the form side → call `canonicalToCanvasLayout(payload)` → feed back to canvas engine

**Important:** Keep `canvasEngine.ts` unchanged. All adaptation logic lives in the wrapper + adapter, not in the engine.

## Page layout (`CalculatorV3Page.tsx`)

```
┌─────────────────────────────────────────────────────────┐
│ Header (existing)                                        │
├─────────────────────────────────────────────────────────┤
│ AccordionSection: Product                                │
│   <ProductSelect /> → sets productId + loads schema     │
├─────────────────────────────────────────────────────────┤
│ AccordionSection: Layout (desktop-only)                  │
│   <LayoutCanvasV3 />                                    │
├─────────────────────────────────────────────────────────┤
│ AccordionSection: Configuration                          │
│   <SchemaDrivenForm /> → includes <RunList />           │
├─────────────────────────────────────────────────────────┤
│ Generate BOM button → useBomCalculator().mutate(payload)│
├─────────────────────────────────────────────────────────┤
│ AccordionSection: Bill of Materials (when result ready) │
│   <BOMWarningsPanel />                                  │
│   <BOMResultTabs result={v3Result} />  (reused from v2) │
│   <BOMTracePanel /> (admin only)                        │
└─────────────────────────────────────────────────────────┘
```

Uses existing `src/components/shared/AccordionSection.tsx` — matches v1/v2 visual style.

## Critical files to reuse (do NOT rebuild)

| File | Why |
|---|---|
| `src/components/canvas/canvasEngine.ts` | Unchanged — pure TS drawing engine |
| `src/components/canvas/FenceLayoutCanvas.tsx` | Wrapped, not replaced |
| `src/components/shared/AccordionSection.tsx` | Same accordion UX |
| `src/components/shared/FormField.tsx` | Label + error + hint chrome |
| `src/components/fence/ColourSelect.tsx` | Auto-picked by SchemaDrivenForm when field_key = `colour_code` |
| `src/components/fence/SlatSizeSelect.tsx` | Auto-picked for `slat_size_mm` |
| `src/components/fence/SlatGapSelect.tsx` | Auto-picked for `slat_gap_mm` |
| `src/lib/constants.ts` | COLOURS / SLAT_* / HINGE_TYPES / LATCH_TYPES enums |
| `src/components/calculator/BOMResultTabs.tsx` | Per-run tab UX (V3-6 moves to `shared/`) |
| `supabase/functions/search-products/` | Optional: list products in `ProductSelect` |

## Cypress continuity

Every control emits `data-testid={field_key}` matching existing conventions (`src/components/fence/FenceConfigForm.tsx`). Future Cypress test suite will reuse selectors from `cypress/support/selectors.ts` without modification.

## Multi-product payload

A single canonical payload can mix `productCode = 'QSHS'` and `productCode = 'QSHS_GATE'` runs. UI affordance:

- "Add run" button shows a product picker when the product supports it (config stored in `products.metadata_json.allowed_mixed_products`)
- For MVP: QSHS supports embedded QSHS_GATE via `gate_opening` segments (same run, different product resolution per segment)
- Pure multi-product quotes (separate runs for fence + gate) are also supported; each run carries its own productCode

## Verification

1. `npm run build` — zero TypeScript errors
2. `npm run dev`, visit `http://localhost:5173/calculator`
3. ProductSelect lists QSHS + QSHS_GATE — selects QSHS
4. Form renders all QSHS fields from seed (colour, slat size, gap, boundaries, segment controls)
5. Draw a run on canvas → form updates in sync (canonical payload round-trips)
6. Edit a field in form → canvas updates (reverse direction)
7. Click Generate BOM → BOM section appears below
8. Visit `/` (v2) and `/new` (v1) — both still work, no regression

## Out of scope

- Description parser / AI input — deferred
- Saving/loading quotes at `/calculator` — tables ready (V3-1) but no UI
- PDF / CSV export at `/calculator` — deferred
- Mobile layout for the canvas — inherits v2 behaviour (hidden on `md:`)
- Cypress tests for `/calculator` — follow-up phase
