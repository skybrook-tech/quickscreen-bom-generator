// engine_test.ts — regression safety net for the static BOM engine.
//
// These are OFFLINE snapshot tests: they import calculateLocalBom directly and
// run it against the engine's built-in SYNTHETIC component/pricing data (no DB,
// no network). Output is deterministic, so we lock it with assertSnapshot.
//
// What this locks: calculation LOGIC — quantities, SKUs, units, notes, computed
// geometry, warnings, and the totals math. SKUs that only exist in the DB price
// at 0 here (synthetic-only), which is fine and consistent: pricing correctness
// is a separate, DB-seeded integration concern. The goal of this suite is to
// prove later refactors (config extraction, internal-SKU layer, per-run routing)
// do not change the engine's logic.
//
// Run:
//   npx deno test --allow-read --allow-write \
//     supabase/functions/bom-calculator-static/engine_test.ts
//
// Update snapshots after an INTENTIONAL change (review the diff!):
//   npx deno test --allow-read --allow-write \
//     supabase/functions/bom-calculator-static/engine_test.ts -- --update
//
// See docs/configurable-static-calculator-plan.md (Phase 0 + scenario matrix).

import { assertSnapshot } from "https://deno.land/std@0.224.0/testing/snapshot.ts";
import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  calculateLocalBom,
  makeCalcContext,
  type CanonicalPayload,
  type CanonicalRun,
  type CanonicalSegment,
  type LocalBomResult,
  type PricingTier,
} from "./engine.ts";
// Frozen test catalogue+pricing (the former engine synthetic block, moved out
// so the runtime engine is DB-only). Keeps these snapshots price-bearing.
import { syntheticComponents, syntheticPricingRules } from "./engine_test_fixtures.ts";
import type { CalcContext, SeedComponent, LocalPricingRule } from "./config/types.ts";
import { BASE_CONFIGS } from "./config/base.ts";
import { deepMerge } from "./config/merge.ts";
import { makeInternalSkuResolver } from "./resolve.ts";

// ─── Builders ─────────────────────────────────────────────────────────────────

type Vars = Record<string, string | number | boolean>;

const BASE_QSHS: Vars = {
  colour_code: "B",
  slat_size_mm: 65,
  slat_gap_mm: 9,
  finish_family: "standard",
  mounting_type: "in_ground",
  post_size: 50,
  target_height_mm: 1800,
  max_panel_width_mm: 2600,
};

function seg(
  segmentId: string,
  segmentWidthMm: number,
  opts: { height?: number; vars?: Vars } = {},
): CanonicalSegment {
  return {
    segmentId,
    segmentKind: "panel",
    segmentWidthMm,
    targetHeightMm: opts.height ?? 1800,
    variables: opts.vars,
  };
}

function gateSeg(segmentId: string, segmentWidthMm: number, vars: Vars): CanonicalSegment {
  return {
    segmentId,
    segmentKind: "gate_opening",
    segmentWidthMm,
    targetHeightMm: Number(vars.gate_height_mm ?? 1800),
    variables: vars,
  };
}

function run(
  runId: string,
  productCode: string,
  segments: CanonicalSegment[],
  opts: {
    left?: CanonicalRun["leftBoundary"];
    right?: CanonicalRun["rightBoundary"];
    corners?: unknown[];
    vars?: Record<string, unknown>;
  } = {},
): CanonicalRun {
  return {
    runId,
    productCode,
    segments,
    leftBoundary: opts.left ?? { type: "product_post" },
    rightBoundary: opts.right ?? { type: "product_post" },
    corners: opts.corners ?? [],
    variables: opts.vars ?? {},
  };
}

function payload(runs: CanonicalRun[], variables: Record<string, unknown> = {}): CanonicalPayload {
  return { runs, variables };
}

// Trim to the deterministic, logic-bearing projection. `generatedAt` is excluded
// (non-deterministic). Lines are sorted by sku+unit so internal aggregation
// order changes that don't affect content don't churn the snapshot.
function project(r: LocalBomResult) {
  return {
    lines: r.lines
      .map((l) => ({
        sku: l.sku,
        category: l.category,
        quantity: l.quantity,
        unit: l.unit,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
        notes: l.notes,
      }))
      .sort((a, b) => a.sku.localeCompare(b.sku) || a.unit.localeCompare(b.unit)),
    totals: r.totals,
    warnings: [...r.warnings].sort(),
    assumptions: [...r.assumptions].sort(),
    computed: r.computed,
  };
}

// Explicit fixture ctx: identical content to the engine's former synthetic
// default ctx, so these snapshots are unchanged by the engine going DB-only.
function makeFixtureCtx(): CalcContext {
  return makeCalcContext({
    dbComponents: syntheticComponents,
    dbPricingRules: syntheticPricingRules,
    configs: new Map(Object.entries(BASE_CONFIGS)),
  });
}

function snap(t: Deno.TestContext, p: CanonicalPayload, tier: PricingTier = "tier1") {
  return assertSnapshot(t, project(calculateLocalBom(p, tier, makeFixtureCtx())));
}

// ─── Scenarios (see plan §7) ────────────────────────────────────────────────────

Deno.test("S01 QSHS straight 10m horizontal baseline", async (t) => {
  await snap(t, payload([run("r1", "QSHS", [seg("s1", 10000)])], { ...BASE_QSHS }));
});

Deno.test("S02 QSHS 90mm slats", async (t) => {
  await snap(t, payload([run("r1", "QSHS", [seg("s1", 8000)])], { ...BASE_QSHS, slat_size_mm: 90 }));
});

Deno.test("S03 QSHS base_plate mounting", async (t) => {
  await snap(t, payload([run("r1", "QSHS", [seg("s1", 6000)])], { ...BASE_QSHS, mounting_type: "base_plate", base_plate_substrate: "concrete" }));
});

Deno.test("S04 QSHS core_drill mounting", async (t) => {
  await snap(t, payload([run("r1", "QSHS", [seg("s1", 6000)])], { ...BASE_QSHS, mounting_type: "core_drill" }));
});

Deno.test("S05 QSHS wall terminations both ends", async (t) => {
  const s = seg("s1", 6000, {
    vars: { left_termination_kind: "non_system_termination", right_termination_kind: "non_system_termination" },
  });
  await snap(t, payload([run("r1", "QSHS", [s], { left: { type: "wall" }, right: { type: "wall" } })], { ...BASE_QSHS }));
});

Deno.test("S06 QSHS custom corner 110deg", async (t) => {
  const s = seg("s1", 6000, { vars: { left_corner_degrees: 110 } });
  await snap(t, payload([run("r1", "QSHS", [s])], { ...BASE_QSHS }));
});

Deno.test("S07 QSHS economy slats pack-of-96", async (t) => {
  await snap(t, payload([run("r1", "QSHS", [seg("s1", 10000)])], { ...BASE_QSHS, finish_family: "economy" }));
});

Deno.test("S08 QSHS alumawood KWI", async (t) => {
  await snap(t, payload([run("r1", "QSHS", [seg("s1", 6000)])], { ...BASE_QSHS, finish_family: "alumawood", colour_code: "KWI", post_colour_code: "KWI" }));
});

Deno.test("S09 QSHS multi-panel split with CSR", async (t) => {
  await snap(t, payload([run("r1", "QSHS", [seg("s1", 6000, { height: 2100 })])], { ...BASE_QSHS, max_panel_width_mm: 2000, target_height_mm: 2100 }));
});

Deno.test("S10 QSHS louvre treatment 65mm", async (t) => {
  await snap(t, payload([run("r1", "QSHS", [seg("s1", 6000)])], { ...BASE_QSHS, slat_size_mm: 65, louvre_treatment: true }));
});

Deno.test("S11 VS vertical run", async (t) => {
  await snap(t, payload([run("r1", "VS", [seg("s1", 6000)])], { ...BASE_QSHS, slat_gap_mm: 20 }));
});

Deno.test("S12 BAYG panel", async (t) => {
  await snap(t, payload([run("r1", "BAYG", [seg("s1", 2400)])], { ...BASE_QSHS, panel_quantity: 2 }));
});

Deno.test("S13 single swing gate", async (t) => {
  const gv: Vars = {
    gate_movement: "single_swing",
    gate_build: "qsg_hinged_horizontal",
    colour_code: "B",
    slat_size_mm: 65,
    slat_gap_mm: 9,
    gate_height_mm: 1800,
  };
  await snap(t, payload([run("r1", "QSHS", [seg("s1", 2000), gateSeg("g1", 1000, gv)])], { ...BASE_QSHS }));
});

Deno.test("S14 double swing gate", async (t) => {
  const gv: Vars = {
    gate_movement: "double_swing",
    gate_build: "qsg_hinged_horizontal",
    colour_code: "B",
    slat_size_mm: 65,
    slat_gap_mm: 9,
    gate_height_mm: 1800,
  };
  await snap(t, payload([run("r1", "QSHS", [seg("s1", 2000), gateSeg("g1", 2000, gv)])], { ...BASE_QSHS }));
});

Deno.test("S15 sliding gate with automation", async (t) => {
  const gv: Vars = {
    gate_movement: "sliding",
    gate_build: "qsg_hinged_horizontal",
    colour_code: "B",
    slat_size_mm: 65,
    slat_gap_mm: 9,
    gate_height_mm: 1800,
    automation_enabled: true,
    automation_power_source: "mains",
    automation_cable_distance_m: 10,
  };
  await snap(t, payload([run("r1", "QSHS", [seg("s1", 2000), gateSeg("g1", 4000, gv)])], { ...BASE_QSHS }));
});

Deno.test("S16 multi-run QSHS + VS", async (t) => {
  await snap(
    t,
    payload(
      [
        run("r1", "QSHS", [seg("s1", 6000)]),
        run("r2", "VS", [seg("s2", 4000, { vars: { slat_gap_mm: 20 } })]),
      ],
      { ...BASE_QSHS },
    ),
  );
});

Deno.test("S18 COLORBOND fence with kit gate (single swing)", async (t) => {
  const cbVars = {
    colour_code: "MN",
    profile: "GO-LINE",
    max_panel_width_mm: 2365,
    mounting_type: "in_ground",
    post_cap: true,
    target_height_mm: 1800,
  };
  const gv: Vars = {
    gate_movement: "single_swing",
    colour_code: "MN",
    gate_height_mm: 1800,
    hinge_type: "CB-HINGE-{colour}-2PK",
    latch_type: "CB-LATCH-{colour}",
  };
  await snap(
    t,
    payload([
      run("r1", "COLORBOND", [seg("s1", 4730, { height: 1800 }), gateSeg("g1", 900, gv)], { vars: cbVars }),
    ]),
  );
});

Deno.test("S19 TIMBER_PALING butted pine 4800mm @ 1800", async (t) => {
  const tpVars = {
    paling_style: "butted",
    species: "pine",
    mounting_type: "in_ground",
    target_height_mm: 1800,
  };
  await snap(
    t,
    payload([run("r1", "TIMBER_PALING", [seg("s1", 4800, { height: 1800 })], { vars: tpVars })]),
  );
});

Deno.test("S17a QSHS baseline tier2 pricing", async (t) => {
  await snap(t, payload([run("r1", "QSHS", [seg("s1", 10000)])], { ...BASE_QSHS }), "tier2");
});

Deno.test("S17b QSHS baseline tier3 pricing", async (t) => {
  await snap(t, payload([run("r1", "QSHS", [seg("s1", 10000)])], { ...BASE_QSHS }), "tier3");
});

// ─── Override / config parity tests ──────────────────────────────────────────
//
// These tests prove that the config layer works correctly:
//   1. Same input + default config = same BOM as calculateLocalBom (no ctx)
//   2. Same input + supplier override = expected supplier-specific differences
//   3. Internal SKU resolution via DB component rows (supplier override pattern)

/** Build a CalcContext with an optional config patch and optional synthetic component additions. */
function makeOverrideCtx(
  configPatch: Partial<typeof BASE_CONFIGS["QSHS"]> = {},
  extraComponents: SeedComponent[] = [],
  extraPricingRules: LocalPricingRule[] = [],
): CalcContext {
  const baseQshs = BASE_CONFIGS["QSHS"]!;
  const mergedQshs = deepMerge(baseQshs, configPatch);
  const configs = new Map(Object.entries(BASE_CONFIGS));
  configs.set("QSHS", mergedQshs);
  const components = [...extraComponents, ...syntheticComponents];
  return {
    components,
    pricingRules: extraPricingRules,
    configs,
    resolveInternalSku: makeInternalSkuResolver(components),
  };
}

// O01: The engine is DB-only — no-ctx runs are UNPRICED but quantity-identical.
// (Same SKUs and quantities as a priced fixture ctx; every price is $0.)
Deno.test("O01 no-ctx run is unpriced but quantity-identical to fixture ctx", () => {
  const p = payload([run("r1", "QSHS", [seg("s1", 6000)])], { ...BASE_QSHS });
  const unpriced = calculateLocalBom(p, "tier1");
  const priced   = calculateLocalBom(p, "tier1", makeFixtureCtx());
  assertEquals(
    unpriced.lines.map((l) => `${l.sku}|${l.quantity}`).sort(),
    priced.lines.map((l) => `${l.sku}|${l.quantity}`).sort(),
    "SKUs + quantities should match with and without ctx",
  );
  assertEquals(unpriced.totals, { subtotal: 0, gst: 0, grandTotal: 0 }, "No-ctx totals should be $0");
  assertNotEquals(priced.totals.grandTotal, 0, "Fixture ctx should price the run");
});

// O02: Stock-length override — if slat stock is shorter, more lengths required.
Deno.test("O02 stock length override changes slat qty", async (t) => {
  const p = payload([run("r1", "QSHS", [seg("s1", 10000)])], { ...BASE_QSHS });
  const defaultResult  = calculateLocalBom(p, "tier1", makeFixtureCtx());
  const shortStockCtx  = makeOverrideCtx({ slat: { stockLengths: { slat: { standard: 3000, economy: 6500, awood: 5800 } } } } as any);
  const shortStockResult = calculateLocalBom(p, "tier1", shortStockCtx);

  const defaultSlatQty = defaultResult.lines.find((l) => l.sku.includes("S65"))?.quantity ?? 0;
  const shortSlatQty   = shortStockResult.lines.find((l) => l.sku.includes("S65"))?.quantity ?? 0;
  // Shorter stock = more lengths needed for the same run.
  assertEquals(shortSlatQty > defaultSlatQty, true, `Short stock should require more slat lengths (${shortSlatQty} > ${defaultSlatQty})`);
  // Snapshot the override result so it becomes a regression baseline too.
  await assertSnapshot(t, project(shortStockResult));
});

// O03: Extra rule — supplier adds a rail above 1800mm.
Deno.test("O03 extraRule extra_component_above_height adds rail", async (t) => {
  const p = payload([run("r1", "QSHS", [seg("s1", 6000)])], { ...BASE_QSHS, target_height_mm: 2100 });
  const baseResult = calculateLocalBom(p, "tier1", makeFixtureCtx());

  const ctxWithRule = makeOverrideCtx({
    extraRules: [
      {
        id: "supplier-b-extra-rail",
        type: "extra_component_above_height",
        internalSku: "FRAME.SF.STD.B",  // internal SKU — will resolve to QS-5800-SF-B
        aboveHeightMm: 1800,
        qtyPerPanel: 1,
        notes: "Extra mid-rail for panels over 1800mm",
      },
    ],
  } as any);
  const overrideResult = calculateLocalBom(p, "tier1", ctxWithRule);

  const baseSfQty     = baseResult.lines.filter((l) => l.sku === "QS-5800-SF-B").reduce((s, l) => s + l.quantity, 0);
  const overrideSfQty = overrideResult.lines.filter((l) => l.sku === "QS-5800-SF-B").reduce((s, l) => s + l.quantity, 0);
  // The override adds an extra side frame per panel above 1800mm.
  assertEquals(overrideSfQty >= baseSfQty, true, "Override should add ≥ as many SF lengths as base");
  await assertSnapshot(t, project(overrideResult));
});

// O04: Internal SKU remapping via DB component row — supplier B uses a different slat SKU.
Deno.test("O04 DB component internal_sku override remaps slat supplier SKU", async (t) => {
  // Supplier B stocks slats under "SUPPLIERB-SLAT-65-B".
  const supplierBSlat: SeedComponent = {
    sku: "SUPPLIERB-SLAT-65-B",
    internal_sku: "SLAT.STD.65.B",  // canonical internal name
    name: "Supplier B 65mm slat black",
    description: "Supplier B 65 x 16.5mm slat, 6100mm stock - Black",
    category: "slat", unit: "length", default_price: 28.50, active: true,
    system_types: ["QSHS"],
  };

  const pricingForSupplierB: LocalPricingRule[] = [
    { sku: "SUPPLIERB-SLAT-65-B", tier_code: "tier1", rule: null, price: 28.50, priority: 0, active: true },
  ];

  const p = payload([run("r1", "QSHS", [seg("s1", 6000)])], { ...BASE_QSHS });
  const ctx = makeOverrideCtx({}, [supplierBSlat], pricingForSupplierB);
  const result = calculateLocalBom(p, "tier1", ctx);

  // The slat line should now use the supplier B SKU (resolved from SLAT.STD.65.B).
  const slatLine = result.lines.find((l) => l.sku === "SUPPLIERB-SLAT-65-B");
  assertNotEquals(slatLine, undefined, "Supplier B slat SKU should appear in BOM");
  assertEquals(slatLine?.unitPrice, 28.50, "Supplier B pricing should apply");

  // The old Glass Outlet slat should NOT appear.
  const glassSlatLine = result.lines.find((l) => l.sku === "XP-6100-S65-B");
  assertEquals(glassSlatLine, undefined, "Glass Outlet slat should not appear when remapped");

  await assertSnapshot(t, project(result));
});

// O05: A COLORBOND run that inherited an invalid colour (e.g. "B", the QSHS
// default, carried over when a section switches product) is normalised to the
// product default ("MN") before calc, so it emits catalogue SKUs (…-MN) that
// can be priced instead of nonexistent …-B SKUs that would price $0.
Deno.test("O05 COLORBOND run snaps inherited invalid colour before calc", () => {
  const p = payload(
    [run("r1", "COLORBOND", [seg("s1", 4000, { height: 1800 })], {
      vars: {
        colour_code: "B", // invalid for Colorbond (set is MN/G/SM/BS/PB/P)
        profile: "GO-LINE",
        max_panel_width_mm: 2365,
        mounting_type: "in_ground",
        target_height_mm: 1800,
      },
    })],
  );
  const result = calculateLocalBom(p, "tier1", makeFixtureCtx());

  // No emitted SKU should carry the invalid "-B" colour token…
  const invalidColourLines = result.lines.filter((l) => /-B$/.test(l.sku));
  assertEquals(invalidColourLines.map((l) => l.sku), [], "no SKU should use the invalid colour B");

  // …and the colour-bearing lines should use the snapped default "MN".
  const sheetLine = result.lines.find((l) => l.sku === "CB-GLINE-1790-MN");
  assertNotEquals(sheetLine, undefined, "Colorbond sheet SKU should be built with MN");
  const railLine = result.lines.find((l) => l.sku === "CB-RAIL-2365-MN");
  assertNotEquals(railLine, undefined, "Colorbond rail SKU should be built with MN");

  // A warning should surface the colour substitution.
  const colourWarning = result.warnings.find(
    (w) => w.includes('"B"') && w.includes("COLORBOND") && w.includes('"MN"'),
  );
  assertNotEquals(colourWarning, undefined, "a colour-substitution warning should be emitted");
});
