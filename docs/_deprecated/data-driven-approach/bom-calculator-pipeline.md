# `bom-calculator` Edge Function

**Location:** `supabase/functions/bom-calculator/index.ts`
**Route:** `POST /functions/v1/bom-calculator`

Product-agnostic, data-driven BOM engine. No per-product branches in code — all calculation behaviour lives in seeded DB rows. See `docs/engine-schema.md` for the table shapes that drive it.

---

## Request

```typescript
// Headers: Authorization: Bearer <jwt>
{
  payload: CanonicalPayload,              // see docs/canonical-payload.md
  pricingTier?: 'tier1' | 'tier2' | 'tier3',  // defaults to profile.pricing_tier
  debug?: boolean,                        // admin-only; ignored for non-admins
}
```

---

## Response (200 OK)

```typescript
{
  lines: BOMLineItem[],          // all lines aggregated across runs (de-duped by SKU)
  runResults: RunResult[],       // per-run breakdown
  gateItems: BOMLineItem[],      // pre-filtered convenience for Gates tab
  totals: {
    subtotal: number,            // ex-GST
    gst: number,                 // 10%
    grandTotal: number,
  },
  warnings: string[],            // product_warnings severity=warning
  errors: string[],              // validation failures severity=error; lines=[] if any present
  assumptions: string[],         // engine defaulting notes (severity=info)
  computed: Record<string, Record<string, unknown>>,  // per-run/segment computed values
                                 // always includes actual_height_mm (needed by AchievedHeightBadge)
  trace?: TraceEntry[],          // admin only (role='admin'); empty array for regular users
  pricingTier: 'tier1' | 'tier2' | 'tier3',
  generatedAt: string,           // ISO timestamp
}

// RunResult shape (consumed by BOMResultTabs):
{
  runId: string,
  label: string,        // "Run 1 — QSHS fence"
  productCode: string,
  items: BOMLineItem[],
}
```

---

## 12-step pipeline

### 1. Handshake
CORS preflight → extract JWT → 401 if missing.

### 2. Auth + org resolution
`resolveUserProfile(jwt)` → `{ orgId, role, pricingTier }` (via `_shared/auth.ts`).

### 3. Payload validation
Parse body; validate via `canonicalPayloadSchema`. Bad payload → 400 with Zod errors.

### 4. Engine data load
For each unique `productCode` in `payload.runs`, load in parallel via `Promise.all`:
- `products` row (by `system_type = productCode`, `org_id`)
- Current `rule_version` (`is_current = true`)
- `product_variables`, `product_constraints`, `product_validations`
- `product_rules WHERE version_id ORDER BY stage, priority`
- `product_component_selectors ORDER BY priority`
- `product_companion_rules ORDER BY priority`
- `product_warnings`

Cache in `Map<product_id, EngineData>` for the request lifetime.

### 5. Input normalisation
Merge variables with precedence: **segment > run > job-level > variable default**. Map long Colorbond names → short codes (e.g. `black-satin` → `B`) using the `COLOUR_CODES` constant.

### 6. Validation pass
Evaluate every `product_validations.expression` against the normalised context:
- `severity=error` failure → append to `errors[]`
- `severity=warning` failure → append to `warnings[]`
- **If `errors.length > 0` → short-circuit: return `{ errors, warnings, lines: [], totals: zeroes }`**

### 7. Rule execution
Evaluate `product_rules` in stage order: `derive` → `stock` → `accessory` → `component`, then by `priority` ascending:

```typescript
const ctx = { ...normalisedVariables };
for (const rule of rules) {
  try {
    ctx[rule.output_key] = mathjs.evaluate(rule.expression, ctx);
  } catch (err) {
    trace.push({ rule_id: rule.id, error: err.message });
    // skip rule, never abort pipeline
  }
}
```

Variable `scope` determines when a rule runs: `segment`-scoped rules run per segment, `run`-scoped once per run, `job`-scoped once.

### 8. Selector resolution
For each component category the rules produced a quantity for, walk `product_component_selectors` by priority until the first `match_json` match:

```typescript
const sku = resolvePlaceholders(selector.sku_pattern, ctx);
// e.g. "QS-6100-S65-{colour}" → "QS-6100-S65-B"
addLine(sku, qty, category, segmentId, runId, productCode);
```

Unresolved placeholder → assumption logged, SKU emitted with literal `{colour}` so staff spot it.

### 9. Companion expansion
For every emitted primary line, evaluate `product_companion_rules`:

```typescript
if (matchesJSON(rule.trigger_match_json, line.ctx) && line.category === rule.trigger_category) {
  const qty = mathjs.evaluate(rule.qty_formula, { ...ctx, trigger_qty: line.quantity });
  addLine(resolvePlaceholders(rule.add_sku_pattern, ctx), qty, rule.add_category, ...);
}
```

Companions run **once** — they do not trigger further companions (bounded fan-out).

### 10. Warnings pass
Evaluate `product_warnings.condition_json` against final context. Results flow to `warnings[]` (warning), `errors[]` (error), or `assumptions[]` (info).

### 11. Line aggregation
Aggregate by SKU across segments/runs — sum quantities. Preserve `runId` list on each line for per-run tab filtering. Split into `runResults[]`.

### 12. Pricing (last, non-fatal)
```typescript
const pricing = await loadPricing(orgId, pricingTier);
for (const line of lines) {
  const rules = pricing.get(line.sku) ?? [];
  if (!rules.length) {
    line.unitPrice = 0;
    warnings.push(`No pricing rule for ${line.sku}`);
    continue;
  }
  line.unitPrice = resolvePrice(rules, line.quantity);
  line.lineTotal = line.quantity * line.unitPrice;
}
```

Subtotal = Σ lineTotal. GST = subtotal × 0.1. Grand total = subtotal + GST.

Strip `trace` and most of `computed` for non-admin (keep `actual_height_mm`). Return with CORS headers.

---

## Graceful failure modes

| Failure | Behaviour |
|---|---|
| Malformed `expression` | Log to trace, skip rule, continue pipeline |
| No selector match for category | Add assumption: "No SKU match for category X"; skip component |
| Unresolved placeholder in `sku_pattern` | Emit SKU with literal `{colour}` + add assumption |
| No pricing rule for SKU | `unitPrice = 0`, add warning, BOM still returned |
| Unknown `productCode` | 400 "Unknown productCode" |
| No `is_current` rule version for product | 500 "No current rule version for product X" |

---

## BOM output + tab contract

The `BOMResultTabs` component (`src/components/shared/BOMResultTabs.tsx`) consumes the response:

| Tab | Source | Totals |
|---|---|---|
| All Items | `lines` — aggregated across all runs | Full grand total |
| Run N | `runResults[N-1].items` | Sum of that run only |
| Gates | `gateItems` | Sum of gate items only |

`runResults[i].label` comes from the edge function (e.g. `"Run 1 — QSHS fence"`). For persisted quotes it uses `quote_runs.description`; otherwise `productCode + sortOrder`.

### Warnings panel (`BOMWarningsPanel.tsx`)
Rendered above the tab bar. Errors (red) block the BOM — tab bar and Generate button are hidden until fixed. Warnings (amber) and assumptions (grey) are informational only.

### Achieved height badge (`AchievedHeightBadge.tsx`)
Rendered inline per segment. Source: `computed[runId][segmentId].actual_height_mm`. Always visible (not admin-gated) — staff need it to confirm fence height.

### Trace panel (`BOMTracePanel.tsx`)
Admin-only collapsible drawer. Renders only when `profiles.role = 'admin'` **and** the response includes non-empty `trace`. Server-side gated — non-admin responses receive `trace: []`. Shows: stage → rule → expression → inputs → output (or error), plus computed variables per run/segment.

---

## Shared utilities

| File | Purpose |
|---|---|
| `supabase/functions/_shared/auth.ts` | `extractJwt`, `resolveUserProfile` |
| `supabase/functions/_shared/cors.ts` | `handleCors`, `corsHeaders` |
| `supabase/functions/_shared/types.ts` | `BOMLineItem`, `BOMCategory`, `BOMUnit`, `PricingRule`, `PricingTier` |
| `supabase/functions/_shared/canonical.types.ts` | `CanonicalPayload` input shape |
