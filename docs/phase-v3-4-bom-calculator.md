# Phase V3-4 — `bom-calculator` Edge Function

> **Status:** Not started
> **Depends on:** V3-1 (engine tables), V3-2 (seeded data), V3-3 (canonical types)
> **Unblocks:** V3-5 (UI calls this via `useBomCalculator`), V3-6 (response shape feeds BOM tabs)

## Goal

A product-agnostic, data-driven BOM engine. Given a canonical payload, walk the pipeline entirely off seeded rows — no per-product branches in code.

**Does NOT replace** `calculate-bom` or `calculate-bom-v2`. New route `/functions/v1/bom-calculator`. Legacy routes remain for `/` and `/new`.

## Location

`supabase/functions/bom-calculator/index.ts`

## Request / response

```typescript
// POST /functions/v1/bom-calculator
// Headers: Authorization: Bearer <jwt>
// Body:
{
  payload: CanonicalPayload,     // V3-3 shape
  pricingTier?: 'tier1' | 'tier2' | 'tier3',  // defaults to profile.pricing_tier
  debug?: boolean,                // admin-only; ignored for non-admins
}

// 200 OK:
{
  lines: BOMLineItem[],           // sku, description, quantity, unit, unitPrice, lineTotal, category, notes, runId, segmentId, productCode
  runResults: RunResult[],        // per-run breakdown matching v2 shape
  gateItems: BOMLineItem[],       // filter convenience for Gates tab
  totals: { subtotal: number, gst: number, grandTotal: number },
  normalized_inputs: Record<string, unknown>,  // variables after alias normalisation
  warnings: string[],             // product_warnings (severity=warning)
  errors: string[],               // validation errors (severity=error); lines is [] if any
  assumptions: string[],          // engine defaulting notes ("Assumed 90° corner uses XP-6000-90-B")
  computed: Record<string, Record<string, unknown>>, // per-run and per-segment computed values
  trace?: TraceEntry[],           // admin only
  pricingTier: 'tier1' | 'tier2' | 'tier3',
  generatedAt: string,            // ISO timestamp
}

// RunResult (matches v2 shape consumed by BOMResultTabs.tsx):
{
  runId: string,
  label: string,        // e.g. "Run 1 — QSHS fence"
  productCode: string,
  items: BOMLineItem[],
}
```

## Pipeline

### 1. Handshake
- `handleCors(req)` → preflight if OPTIONS
- `extractJwt(req)` → reject 401 if missing
- `resolveUserProfile(jwt)` → `{ orgId, role, pricingTier }` (reuses `supabase/functions/_shared/auth.ts`)

### 2. Payload validation
- Parse body; validate via `canonicalPayloadSchema` (V3-3). Bad payload → 400 with Zod errors

### 3. Engine data load (per request)
For each unique `productCode` in `payload.runs`:
- Load `products` row (by `system_type = productCode`, `org_id = orgId`, `parent_id IS NULL`)
- Load current `rule_version` (`WHERE rule_set.product_id = products.id AND rule_versions.is_current`)
- Load in one round-trip per product (parallelised via `Promise.all`):
  - `product_variables`, `product_constraints`, `product_validations`
  - `product_rules WHERE version_id = rule_version.id AND active ORDER BY stage, priority`
  - `product_component_selectors WHERE product_id AND active ORDER BY priority`
  - `product_companion_rules WHERE product_id AND active ORDER BY priority`
  - `product_warnings WHERE product_id AND active`
- Cache in `Map<product_id, EngineData>` for the request lifetime

### 4. Input normalisation
- For each variable in `payload.variables` / `run.variables` / `segment.variables`, check `input_aliases` (where `product_scope IN ('ALL', productCode)`) — remap alias → canonical_key if present
- Merge precedence: segment > run > job-level > variable default

### 5. Validation pass
- Evaluate every `product_validations.expression` against the normalised context
- `severity = 'error'` failure → append to `errors[]`
- `severity = 'warning'` failure → append to `warnings[]`
- If `errors.length > 0` → short-circuit: return `{ errors, warnings, lines: [], totals: 0 }` with HTTP 200

### 6. Rule execution
Evaluate `product_rules` in `stage` order (`derive` → `stock` → `accessory` → `component`), then by `priority` ascending:

```typescript
const ctx = { ...normalisedVariables };
for (const rule of rules) {
  try {
    ctx[rule.output_key] = mathjs.evaluate(rule.expression, ctx);
    if (debug) trace.push({ stage: rule.stage, rule_id: rule.id, expression: rule.expression, inputs: snapshot(ctx), output: ctx[rule.output_key] });
  } catch (err) {
    trace.push({ stage: rule.stage, rule_id: rule.id, expression: rule.expression, error: err.message });
    // skip rule, continue pipeline — never abort
  }
}
```

**Per-segment vs per-run vs per-job:** variable `scope` determines evaluation context. A rule using segment-scoped variables runs per segment (ctx scoped to that segment's merged variables). Run-scoped rules run once per run. Job-scoped rules run once.

### 7. Selector resolution
For each component_category that rules produced a quantity for:

```typescript
for (const selector of selectorsForCategory) {
  if (matchesJSON(selector.match_json, ctx)) {
    const sku = resolvePlaceholders(selector.sku_pattern, ctx);
    // sku_pattern e.g. "QS-6100-S65-{colour}" → "QS-6100-S65-B"
    addLine(sku, qty, category, segmentId, runId, productCode);
    break; // first match by priority wins
  }
}
```

Placeholder resolution reads `ctx.colour` (short code, e.g. `B`) — not `colour_code` long name. Normalisation at step 4 maps long → short using `COLOUR_CODES` from `supabase/functions/calculate-bom-v2/index.ts:76-88`.

### 8. Companion expansion
For every primary line already emitted:

```typescript
for (const rule of companionRules) {
  if (matchesJSON(rule.trigger_match_json, line.ctx) && line.category === rule.trigger_category) {
    const qty = mathjs.evaluate(rule.qty_formula, { ...ctx, [`${line.category}_qty`]: line.quantity });
    const sku = resolvePlaceholders(rule.add_sku_pattern, ctx);
    addLine(sku, qty, rule.add_category, segmentId, runId, productCode);
  }
}
```

Companion expansion runs once; companions do not themselves trigger new companions (keeps fan-out bounded, matches build-pack spec).

### 9. Warnings pass
Evaluate every `product_warnings.condition_json` against final context. Severity `error` found here also lands in `errors` (e.g. Alumawood 90mm non-WRC). Severity `warning` lands in `warnings`. Severity `info` lands in `assumptions`.

### 10. Line aggregation
Aggregate by SKU across segments/runs — sum quantities. Preserve `runId` list on each aggregated line so per-run filtering works on the UI without re-running the engine. Split `runResults[]` by `runId`.

### 11. Pricing (last, optional, non-fatal)
```typescript
const pricing = await loadPricing(orgId, pricingTier);  // reuse calculate-bom-v2:38-61
for (const line of lines) {
  const rules = pricing.get(line.sku) ?? [];
  if (rules.length === 0) {
    line.unitPrice = 0;
    line.lineTotal = 0;
    warnings.push(`No pricing rule for ${line.sku}`);
    continue;
  }
  line.unitPrice = resolvePrice(rules, line.quantity);
  line.lineTotal = parseFloat((line.quantity * line.unitPrice).toFixed(2));
}
```

Subtotal = sum of lineTotal. GST = subtotal × 0.1. Grand total = subtotal + GST.

### 12. Response assembly
- Strip `trace` and most of `computed` if role ≠ 'admin' (keep `actual_height_mm` in computed so AchievedHeightBadge can render)
- Return JSON with CORS headers

## Graceful failure modes

| Failure | Behaviour |
|---|---|
| Malformed `expression` throws | Log to trace, skip rule, continue |
| Selector `match_json` has no matching row | Add `assumption`: "No SKU match for category X"; skip component |
| `sku_pattern` placeholder references unset variable | Add `assumption`: "Placeholder {colour} unresolved"; emit SKU with literal `{colour}` so staff spot it |
| Pricing rule missing | `unitPrice = 0`, add warning, BOM still renders |
| Product not found | 400 "Unknown productCode" |
| Rule version not set `is_current` for a product | 500 "No current rule version for product X" |

## Critical files to reuse

| Source | Purpose |
|---|---|
| `supabase/functions/_shared/auth.ts` | `extractJwt`, `resolveUserProfile` — unchanged |
| `supabase/functions/_shared/cors.ts` | `handleCors`, `corsHeaders` — unchanged |
| `supabase/functions/calculate-bom-v2/index.ts:28-36` | `resolvePrice(rules, qty)` — copy into `bom-calculator/index.ts` |
| `supabase/functions/calculate-bom-v2/index.ts:38-61` | `loadPricing(orgId, tier)` — copy |
| `supabase/functions/calculate-bom-v2/index.ts:63-72` | `applyPricing(items, map)` — adapt |
| `supabase/functions/calculate-bom-v2/index.ts:76-88` | `COLOUR_CODES` map — copy verbatim |
| `supabase/functions/_shared/types.ts` | `BOMLineItem`, `BOMCategory`, `BOMUnit`, `PricingRule`, `PricingTier` — extend with `runId`, `segmentId`, `productCode` fields |
| `supabase/functions/_shared/canonical.types.ts` (V3-3) | `CanonicalPayload` input shape |

## Deno unit tests (`index_test.ts`)

Each test seeds a minimal in-memory context and runs the pipeline. Cases:

- **TC-V3-1** QSHS 5m fence, 65mm slats, 5mm gap, black — assert slat count = 23, side frame = 2, CFC = 2, spacer packs = 1, screen screw packs = 1
- **TC-V3-2** QSHS 2-run with 90° corner — assert corner_post SKU `XP-6000-90-B` qty = 1, per-run BOMs distinct, combined aggregation sums correctly
- **TC-V3-3** QSHS_GATE 900×1800 single leaf, 65mm/5mm, black — assert `QSG-GATESF-05MM-B` = 1, `QSG-JBLOCK-65-4PK` = 1, frame caps × 4, hinges × 2, latch × 1, screw cover pack × 1, rail screw pack × 1
- **TC-V3-4** QSHS panel 2400mm wide — assert CSR present + CSR caps (2) + CSR plates (2)
- **TC-V3-5** Validation failure: `target_height_mm = 2800` — `errors: ['Height is outside QSHS range']`, `lines: []`
- **TC-V3-6** Warning: `panel_width_mm = 2700` — warning present, lines still returned
- **TC-V3-7** Deactivate a SKU's pricing_rules row — `unitPrice = 0`, warning `"No pricing rule for ..."`, BOM still returned
- **TC-V3-8** Inject a malformed rule expression into test fixtures — engine skips rule, trace records error, remaining rules produce partial BOM

Run via `supabase functions serve` locally and `deno test --allow-all supabase/functions/bom-calculator/index_test.ts`.

## Manual verification

```bash
curl -X POST http://localhost:54321/functions/v1/bom-calculator \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d @fixtures/qshs-5m.json
```

Expected: valid JSON with `lines[]`, `totals.grandTotal > 0`, no `errors`.

## Out of scope

- Description parser / AI alias resolution — `input_aliases` lookup is wired; LLM call is V2 deferred
- Multi-rule-version A/B testing — MVP only loads `is_current = true`
- Pricing promotions / date-ranged rules beyond existing `pricing_rules` capabilities
- Caching engine data across requests — per-request load is fast enough; add Redis later if p95 > 500ms
