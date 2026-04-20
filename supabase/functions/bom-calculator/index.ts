// bom-calculator — v3 product-agnostic BOM engine
// Accepts a CanonicalPayload and returns priced BOM lines driven entirely by
// seed data in the rule_sets / product_rules / product_component_selectors / etc. tables.
//
// Pipeline (11 steps):
//   1.  CORS + JWT → resolveUserProfile → orgId, pricingTier
//   2.  Resolve user role (admin check) from profiles
//   3.  Parse + minimally validate payload
//   4.  Load engine data (product, rule_version, rules/selectors/companions/etc.)
//       per unique productCode — parallelised via Promise.all
//   5.  Normalise variables (defaults + colour codes)
//   6.  Run product_validations — error severity short-circuits the run
//   7.  Execute product_rules in stage order (derive → stock → accessory → component)
//   8.  Resolve SKUs via product_component_selectors (first match wins)
//   9.  Expand product_companion_rules (auto-add accessories)
//   10. Evaluate product_warnings (non-blocking; populates warnings/errors/assumptions)
//   11. Aggregate lines by SKU+runId → price → return

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { extractJwt, resolveUserProfile } from "../_shared/auth.ts";
import { create, all } from "https://esm.sh/mathjs@13/number";
import type {
  CanonicalPayload,
  CanonicalRun,
  CanonicalSegment,
} from "../_shared/canonical.types.ts";
import {
  cornerDegreesFromVars,
  effectiveLegacyBoundaryType,
  type LegacyBoundaryType,
} from "../_shared/segmentTermination.ts";
import type { BOMUnit, PricingRule, PricingTier } from "../_shared/types.ts";

const mathjs = create(all);

// ─── Colour codes (canonical short codes used in SKU patterns) ────────────────

const COLOUR_CODES: Record<string, string> = {
  "black-satin": "B",
  "monument-matt": "MN",
  "woodland-grey-matt": "G",
  "surfmist-matt": "SM",
  "pearl-white-gloss": "W",
  "basalt-satin": "BS",
  "dune-satin": "D",
  mill: "M",
  primrose: "P",
  paperbark: "PB",
  "palladium-silver-pearl": "S",
};

// ─── Pricing (verbatim from calculate-bom-v2) ─────────────────────────────────

function resolvePrice(rules: PricingRule[], qty: number): number {
  for (const r of rules) {
    if (!r.rule) return r.price;
    try {
      if (mathjs.evaluate(r.rule, { qty }) === true) return r.price;
    } catch {
      /* malformed rule — skip */
    }
  }
  return 0;
}

async function loadPricing(
  orgId: string,
  tier: PricingTier,
): Promise<Map<string, PricingRule[]>> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabaseAdmin
    .from("pricing_rules_with_sku")
    .select("sku, price, rule, priority")
    .eq("org_id", orgId)
    .eq("tier_code", tier)
    .eq("active", true)
    .order("priority", { ascending: false });

  if (error) throw new Error(`Pricing lookup failed: ${error.message}`);

  const map = new Map<string, PricingRule[]>();
  for (const row of data ?? []) {
    const existing = map.get(row.sku) ?? [];
    existing.push(row as PricingRule);
    map.set(row.sku, existing);
  }
  return map;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BomLineItemV3 {
  sku: string;
  description: string;
  quantity: number;
  unit: BOMUnit;
  category: string;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
  runId?: string;
  segmentId?: string;
  productCode?: string;
}

interface RunResult {
  runId: string;
  label: string;
  productCode: string;
  items: BomLineItemV3[];
}

interface TraceEntry {
  stage: string;
  rule_id: string;
  rule_name: string;
  expression: string;
  output_key?: string;
  output?: unknown;
  error?: string;
}

interface EngineData {
  product: { id: string; system_type: string };
  ruleVersion: { id: string };
  rules: Array<{
    id: string;
    name: string;
    stage: string;
    expression: string;
    output_key: string;
    priority: number;
  }>;
  constraints: Array<{
    id: string;
    name: string;
    constraint_type: string;
    value_text: string;
    unit: string;
    severity: string;
    applies_when_json: Record<string, unknown>;
    message: string;
  }>;
  variables: Array<{
    id: string;
    name: string;
    data_type: string;
    default_value_json: unknown;
    scope: string;
  }>;
  validations: Array<{
    id: string;
    name: string;
    expression: string;
    severity: string;
    message: string;
  }>;
  selectors: Array<{
    id: string;
    selector_key: string;
    component_category: string;
    selector_type: string;
    match_json: Record<string, unknown>;
    sku_pattern: string;
    priority: number;
  }>;
  companions: Array<{
    id: string;
    rule_key: string;
    trigger_category: string;
    trigger_match_json: Record<string, unknown>;
    add_category: string;
    add_sku_pattern: string;
    qty_formula: string;
    is_pack: boolean;
    priority: number;
  }>;
  warnings: Array<{
    id: string;
    warning_key: string;
    severity: string;
    condition_json: Record<string, unknown>;
    message: string;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Test whether a context object satisfies a match_json predicate.
 * Supports: exact equality, array membership, and range operators
 * { gt, gte, lt, lte, eq, neq }.
 */
function matchesJSON(
  matchJson: Record<string, unknown>,
  ctx: Record<string, unknown>,
): boolean {
  for (const [key, expected] of Object.entries(matchJson)) {
    const actual = ctx[key];
    if (
      typeof expected === "object" &&
      expected !== null &&
      !Array.isArray(expected)
    ) {
      // Range predicate
      const range = expected as Record<string, unknown>;
      if ("gt" in range && !(Number(actual) > Number(range.gt))) return false;
      if ("gte" in range && !(Number(actual) >= Number(range.gte)))
        return false;
      if ("lt" in range && !(Number(actual) < Number(range.lt))) return false;
      if ("lte" in range && !(Number(actual) <= Number(range.lte)))
        return false;
      if ("eq" in range && actual !== range.eq) return false;
      if ("neq" in range && actual === range.neq) return false;
    } else if (Array.isArray(expected)) {
      if (!expected.includes(actual)) return false;
    } else {
      if (actual !== expected) return false;
    }
  }
  return true;
}

/**
 * Replace `{key}` placeholders in a SKU pattern with values from context.
 * Unresolved placeholders are left as-is so the caller can detect them.
 */
function resolvePlaceholders(
  pattern: string,
  ctx: Record<string, unknown>,
): string {
  return pattern.replace(/\{(\w+)\}/g, (_, key) => {
    const val = ctx[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Step 1a — CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Step 1b — JWT + profile
    const jwt = extractJwt(req);
    const { orgId, pricingTier: defaultTier } = await resolveUserProfile(jwt);

    // Step 2 — resolve role for admin trace gating
    // resolveUserProfile doesn't return role, so we query separately.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // We need the user id — get it from the JWT
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(jwt);
    const { data: profileWithRole } = user
      ? await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
      : { data: null };

    const role: string = profileWithRole?.role ?? "user";
    const isAdmin = role === "admin";

    // Step 3 — parse + minimally validate payload
    const body = (await req.json()) as {
      payload: CanonicalPayload;
      pricingTier?: PricingTier;
      debug?: boolean;
    };

    const { payload, pricingTier: reqTier, debug } = body;
    const pricingTier: PricingTier = reqTier ?? defaultTier ?? "tier1";
    const wantTrace = isAdmin && debug === true;

    if (
      !payload?.productCode ||
      !Array.isArray(payload?.runs) ||
      payload.runs.length === 0
    ) {
      return Response.json(
        { error: "Invalid payload: productCode and runs[] are required" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Step 4 — load engine data per unique productCode (parallelised)
    const productCodes = [
      ...new Set(payload.runs.map((r: CanonicalRun) => r.productCode)),
    ];
    const engineDataMap = new Map<string, EngineData>();

    await Promise.all(
      productCodes.map(async (code) => {
        // Flat products model (post migration 022): one row per (org, system_type).
        const { data: actualProduct } = await supabaseAdmin
          .from("products")
          .select("id, system_type")
          .eq("org_id", orgId)
          .eq("system_type", code)
          .maybeSingle();

        if (!actualProduct) {
          throw new Error(`Unknown productCode: ${code}`);
        }

        // Load current rule version via rule_set
        const { data: ruleSet } = await supabaseAdmin
          .from("rule_sets")
          .select("id")
          .eq("org_id", orgId)
          .eq("product_id", actualProduct.id)
          .maybeSingle();

        if (!ruleSet) {
          throw new Error(`No rule set found for product: ${code}`);
        }

        const { data: ruleVersion } = await supabaseAdmin
          .from("rule_versions")
          .select("id")
          .eq("org_id", orgId)
          .eq("rule_set_id", ruleSet.id)
          .eq("is_current", true)
          .maybeSingle();

        if (!ruleVersion) {
          throw new Error(`No current rule version for product: ${code}`);
        }

        // Parallel fetch of all engine tables
        const [
          { data: rules },
          { data: constraints },
          { data: variables },
          { data: validations },
          { data: selectors },
          { data: companions },
          { data: warnings },
        ] = await Promise.all([
          supabaseAdmin
            .from("product_rules")
            .select("id, name, stage, expression, output_key, priority")
            .eq("version_id", ruleVersion.id)
            .eq("active", true)
            .order("stage")
            .order("priority"),
          supabaseAdmin
            .from("product_constraints")
            .select("*")
            .eq("product_id", actualProduct.id)
            .eq("active", true),
          supabaseAdmin
            .from("product_variables")
            .select("*")
            .eq("product_id", actualProduct.id)
            .eq("active", true)
            .order("sort_order"),
          supabaseAdmin
            .from("product_validations")
            .select("*")
            .eq("product_id", actualProduct.id)
            .eq("active", true),
          supabaseAdmin
            .from("product_component_selectors")
            .select("*")
            .eq("product_id", actualProduct.id)
            .eq("active", true)
            .order("priority"),
          supabaseAdmin
            .from("product_companion_rules")
            .select("*")
            .eq("product_id", actualProduct.id)
            .eq("active", true)
            .order("priority"),
          supabaseAdmin
            .from("product_warnings")
            .select("*")
            .eq("product_id", actualProduct.id)
            .eq("active", true),
        ]);

        engineDataMap.set(code, {
          product: actualProduct,
          ruleVersion,
          rules: rules ?? [],
          constraints: constraints ?? [],
          variables: variables ?? [],
          validations: validations ?? [],
          selectors: selectors ?? [],
          companions: companions ?? [],
          warnings: warnings ?? [],
        });
      }),
    );

    // Step 5 helper — normalise variables: apply defaults, map colour codes
    function normaliseVariables(
      vars: Record<string, string | number | boolean>,
      engineData: EngineData,
    ): Record<string, unknown> {
      const ctx: Record<string, unknown> = {};

      // 1. Apply variable defaults from engine schema
      for (const v of engineData.variables) {
        if (
          v.default_value_json !== null &&
          v.default_value_json !== undefined
        ) {
          ctx[v.name] = v.default_value_json;
        }
      }

      // 2. Overlay provided variables
      for (const [k, v] of Object.entries(vars)) {
        ctx[k] = v;
      }

      // 3. Normalise colour: long name → short code
      const rawColour = ctx["colour_code"] ?? ctx["colour"];
      if (typeof rawColour === "string") {
        ctx["colour"] = COLOUR_CODES[rawColour] ?? rawColour;
      }

      return ctx;
    }

    // ─── Process runs ─────────────────────────────────────────────────────────

    const allLines: BomLineItemV3[] = [];
    const runResults: RunResult[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const allAssumptions: string[] = [];
    const allTrace: TraceEntry[] = [];
    // computed[runId][segmentId] = { actual_height_mm, ... }
    const computed: Record<
      string,
      Record<string, Record<string, unknown>>
    > = {};

    for (const run of payload.runs as CanonicalRun[]) {
      const engineData = engineDataMap.get(run.productCode);
      if (!engineData) continue;

      // Merge job-level + run-level variables
      const mergedRunVars = {
        ...payload.variables,
        ...(run.variables ?? {}),
      };
      const runCtx = normaliseVariables(mergedRunVars, engineData);
      const runTrace: TraceEntry[] = [];
      const runLines: BomLineItemV3[] = [];

      // Step 7 — validation pass
      let runHasError = false;
      for (const validation of engineData.validations) {
        try {
          const result = mathjs.evaluate(validation.expression, { ...runCtx });
          if (result === false) {
            if (validation.severity === "error") {
              allErrors.push(validation.message);
              runHasError = true;
            } else {
              allWarnings.push(validation.message);
            }
          }
        } catch (err) {
          runTrace.push({
            stage: "validation",
            rule_id: validation.id,
            rule_name: validation.name,
            expression: validation.expression,
            error: String(err),
          });
        }
      }
      if (runHasError) continue; // short-circuit this run only

      // ─── Process segments ─────────────────────────────────────────────────

      for (const segment of run.segments as CanonicalSegment[]) {
        // Build segment context: run ctx + segment overrides + boundary/layout helpers
        const segVarsNorm = segment.variables
          ? normaliseVariables(segment.variables, engineData)
          : {};

        const runLeftT = run.leftBoundary.type as LegacyBoundaryType;
        const runRightT = run.rightBoundary.type as LegacyBoundaryType;
        const segV = segment.variables;
        const leftEff = effectiveLegacyBoundaryType(runLeftT, segV, "left");
        const rightEff = effectiveLegacyBoundaryType(runRightT, segV, "right");
        const leftCornerDeg = cornerDegreesFromVars(segV, "left");
        const rightCornerDeg = cornerDegreesFromVars(segV, "right");

        const segCtx: Record<string, unknown> = {
          ...runCtx,
          ...segVarsNorm,
          // Segment geometry — segment_width_mm is the user input; panel_width_mm
          // is derived by the num_panels + panel_width_mm derive rules below.
          // max_panel_width_mm fallback: hardcoded 2600 (structural max for QSHS);
          // overridden by payload.variables or seg.variables from the UI.
          max_panel_width_mm: 2600,
          segment_width_mm: segment.segmentWidthMm,
          target_height_mm:
            segment.targetHeightMm ?? runCtx["target_height_mm"],
          bay_count: segment.bayCount ?? 1,
          segment_kind: segment.segmentKind,
          // Gate product (when segmentKind === 'gate_opening')
          gate_product_code: segment.gateProductCode ?? null,
          // Boundary-derived helpers — per-segment overrides via segment.variables
          left_boundary_type: leftEff,
          right_boundary_type: rightEff,
          ...(leftCornerDeg !== undefined && {
            left_corner_degrees: leftCornerDeg,
          }),
          ...(rightCornerDeg !== undefined && {
            right_corner_degrees: rightCornerDeg,
          }),
          product_post_boundary_count:
            (leftEff === "product_post" ? 1 : 0) +
            (rightEff === "product_post" ? 1 : 0),
          wall_boundary_count:
            (leftEff === "wall" ? 1 : 0) + (rightEff === "wall" ? 1 : 0),
          corner_count: run.corners.length,
          corner_post_count: run.corners.length, // alias used by some rules
          // Stock lengths (constants referenced by rules)
          slat_stock_length_mm: 6100,
          side_frame_stock_length_mm: 5800,
          // Cut deduction defaults — rules or variables can override
          width_deduction_mm: 0,
        };

        // Step 8 — execute product_rules (derive → stock → accessory → component)
        for (const rule of engineData.rules) {
          try {
            const output = mathjs.evaluate(rule.expression, segCtx);
            segCtx[rule.output_key] = output;
            if (wantTrace) {
              runTrace.push({
                stage: rule.stage,
                rule_id: rule.id,
                rule_name: rule.name,
                expression: rule.expression,
                output_key: rule.output_key,
                output,
              });
            }
          } catch (err) {
            // Graceful failure: log and continue
            runTrace.push({
              stage: rule.stage,
              rule_id: rule.id,
              rule_name: rule.name,
              expression: rule.expression,
              error: String(err),
            });
          }
        }

        // Stash computed values for this segment
        computed[run.runId] = computed[run.runId] ?? {};
        computed[run.runId][segment.segmentId] = {
          actual_height_mm: segCtx["actual_height_mm"],
          num_slats: segCtx["num_slats"],
          panel_width_mm: segCtx["panel_width_mm"],
          num_panels: segCtx["num_panels"],
        };

        // Step 9 — selector resolution.
        //
        // Strategy: iterate over selector categories (the authoritative list of what
        // components the engine can produce), and for each category look up its quantity
        // from the context using a flexible naming search.
        //
        // This avoids brittle output_key → category name derivation (pluralisation,
        // abbreviations like csr vs centre_support_rail, etc.).

        function getCategoryQty(category: string): number {
          // Explicit overrides for categories whose quantity key differs from name conventions
          const explicit: Record<string, string[]> = {
            centre_support_rail: ["num_csr", "num_centre_support_rail"],
            post: ["num_posts_from_boundaries", "num_post"],
            f_section: ["wall_boundary_count", "num_f_section"],
          };
          const candidates = [
            ...(explicit[category] ?? []),
            `num_${category}`, // num_slat
            `num_${category}s`, // num_slats
            `${category}_qty`,
            `${category}_count`,
          ];
          for (const key of candidates) {
            const val = segCtx[key];
            if (typeof val === "number" && val > 0) return val;
            if (typeof val === "boolean" && val) return 1;
          }
          return 0;
        }

        // Collect unique categories across all active selectors for this product
        const selectorCategories = [
          ...new Set(engineData.selectors.map((s) => s.component_category)),
        ];

        for (const category of selectorCategories) {
          const qty = getCategoryQty(category);
          if (qty <= 0) continue;

          // Find matching selectors for this category (priority ASC = highest priority first)
          const categorySelectors = engineData.selectors
            .filter((s) => s.component_category === category)
            .sort((a, b) => a.priority - b.priority);

          let matched = false;
          for (const selector of categorySelectors) {
            if (matchesJSON(selector.match_json, segCtx)) {
              const sku = resolvePlaceholders(selector.sku_pattern, segCtx);
              runLines.push({
                sku,
                description: `${category} — ${sku}`,
                quantity: qty,
                unit: "each" as BOMUnit,
                category,
                unitPrice: 0,
                lineTotal: 0,
                runId: run.runId,
                segmentId: segment.segmentId,
                productCode: run.productCode,
              });
              matched = true;
              break;
            }
          }

          if (!matched) {
            allAssumptions.push(
              `No SKU selector matched for category '${category}' (qty: ${qty}) in ${run.productCode}`,
            );
          }
        }

        // Step 10 — companion expansion
        // Iterate over a snapshot so new companions don't trigger further companions
        const linesSnapshot = [...runLines];
        for (const line of linesSnapshot) {
          if (!line.segmentId || line.segmentId !== segment.segmentId) continue;

          for (const companion of engineData.companions) {
            if (line.category !== companion.trigger_category) continue;
            if (!matchesJSON(companion.trigger_match_json, segCtx)) continue;

            try {
              const companionCtx = {
                ...segCtx,
                trigger_qty: line.quantity,
                [`${companion.trigger_category}_qty`]: line.quantity,
              };
              const qty = Number(
                mathjs.evaluate(companion.qty_formula, companionCtx),
              );
              if (!Number.isFinite(qty) || qty <= 0) continue;

              const sku = resolvePlaceholders(
                companion.add_sku_pattern,
                segCtx,
              );
              runLines.push({
                sku,
                description: `${companion.add_category} — ${sku}`,
                quantity: qty,
                unit: companion.is_pack ? "pack" : ("each" as BOMUnit),
                category: companion.add_category,
                unitPrice: 0,
                lineTotal: 0,
                runId: run.runId,
                segmentId: segment.segmentId,
                productCode: run.productCode,
              });
            } catch (err) {
              allTrace.push({
                stage: "companion",
                rule_id: companion.id,
                rule_name: companion.rule_key,
                expression: companion.qty_formula,
                error: String(err),
              });
            }
          }
        }
      } // end segment loop

      // Step 11 — warnings pass (run-level, uses merged run context)
      for (const warning of engineData.warnings) {
        try {
          if (matchesJSON(warning.condition_json, runCtx)) {
            if (warning.severity === "error") {
              allErrors.push(warning.message);
            } else if (warning.severity === "warning") {
              allWarnings.push(warning.message);
            } else {
              allAssumptions.push(warning.message); // severity === 'info'
            }
          }
        } catch {
          /* ignore malformed condition_json */
        }
      }

      allLines.push(...runLines);
      runResults.push({
        runId: run.runId,
        label: `Run ${runResults.length + 1} — ${run.productCode}`,
        productCode: run.productCode,
        items: runLines,
      });

      if (wantTrace) allTrace.push(...runTrace);
    } // end run loop

    // Short-circuit with empty BOM if blocking errors were raised
    if (allErrors.length > 0) {
      return Response.json(
        {
          lines: [],
          runResults: [],
          gateItems: [],
          totals: { subtotal: 0, gst: 0, grandTotal: 0 },
          normalized_inputs: {},
          errors: allErrors,
          warnings: allWarnings,
          assumptions: allAssumptions,
          computed: {},
          trace: wantTrace ? allTrace : [],
          pricingTier,
          generatedAt: new Date().toISOString(),
        },
        { headers: corsHeaders },
      );
    }

    // Step 10 (aggregate) — merge lines by SKU + runId
    const aggregated = new Map<string, BomLineItemV3>();
    for (const line of allLines) {
      const key = `${line.sku}__${line.runId ?? ""}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.quantity += line.quantity;
      } else {
        aggregated.set(key, { ...line });
      }
    }
    const aggregatedLines = [...aggregated.values()];

    // Separate gate items for the response envelope
    const gateProductCodes = new Set(["QS_GATE", "QSVS", "QSGH", "HSSG"]);
    const gateItems = aggregatedLines.filter((l) =>
      gateProductCodes.has(l.productCode ?? ""),
    );

    // Step 11 — pricing
    const pricingMap = await loadPricing(orgId, pricingTier);

    for (const line of aggregatedLines) {
      const rules = pricingMap.get(line.sku) ?? [];
      if (rules.length === 0) {
        line.unitPrice = 0;
        line.lineTotal = 0;
        allWarnings.push(`No pricing rule found for SKU: ${line.sku}`);
      } else {
        line.unitPrice = resolvePrice(rules, line.quantity);
        line.lineTotal = parseFloat(
          (line.quantity * line.unitPrice).toFixed(2),
        );
      }
    }

    // Propagate pricing back into per-run items for the UI tabs
    for (const rr of runResults) {
      for (const item of rr.items) {
        const rules = pricingMap.get(item.sku) ?? [];
        item.unitPrice = resolvePrice(rules, item.quantity);
        item.lineTotal = parseFloat(
          (item.quantity * item.unitPrice).toFixed(2),
        );
      }
    }

    // Step 12 — totals + response
    const subtotal = parseFloat(
      aggregatedLines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2),
    );
    const gst = parseFloat((subtotal * 0.1).toFixed(2));
    const grandTotal = parseFloat((subtotal + gst).toFixed(2));

    // Strip computed for non-admins (keep actual_height_mm only per segment)
    const strippedComputed: Record<
      string,
      Record<string, Record<string, unknown>>
    > = {};
    for (const [runId, segments] of Object.entries(computed)) {
      strippedComputed[runId] = {};
      for (const [segId, vals] of Object.entries(segments)) {
        strippedComputed[runId][segId] = isAdmin
          ? vals
          : {
              actual_height_mm: vals["actual_height_mm"],
              num_panels: vals["num_panels"],
            };
      }
    }

    return Response.json(
      {
        lines: aggregatedLines,
        runResults,
        gateItems,
        totals: { subtotal, gst, grandTotal },
        normalized_inputs: {},
        warnings: allWarnings,
        errors: allErrors,
        assumptions: allAssumptions,
        computed: strippedComputed,
        trace: wantTrace ? allTrace : [],
        pricingTier,
        generatedAt: new Date().toISOString(),
      },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error("bom-calculator error:", err);
    const message = err instanceof Error ? err.message : String(err);
    const status =
      message.includes("Authorization") || message.includes("Invalid JWT")
        ? 401
        : 500;
    return Response.json({ error: message }, { status, headers: corsHeaders });
  }
});
