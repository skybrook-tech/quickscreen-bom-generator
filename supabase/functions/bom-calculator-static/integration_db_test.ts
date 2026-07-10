// integration_db_test.ts — seeded-DB integration tests for the static BOM engine.
//
// The offline snapshot suite (engine_test.ts) locks calculation LOGIC against a
// fixture catalogue. What it structurally cannot catch is the DB path: the
// paginated catalogue loaders and whether the SKUs the engine emits actually
// resolve against the SEEDED catalogue (e.g. the PostgREST 1000-row truncation
// bug shipped unpriced BOMs while every offline test stayed green).
//
// These tests run the same loaders + engine the edge function uses (db.ts +
// engine.ts — no HTTP, no auth) against a running, seeded local Supabase, and
// assert on the COMPONENTS produced (sku + quantity). Prices are deliberately
// out of scope: price edits must never break this suite.
//
// Skipped unless RUN_DB_TESTS=1. Run locally with:
//   npm run test:integration
// (requires `supabase start` + a seeded DB, i.e. `npm run db:reset`)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  calculateLocalBom,
  makeCalcContext,
  type CanonicalPayload,
} from "./engine.ts";
import { loadCalculatorConfigs } from "./config/merge.ts";
import { loadDbComponents, loadDbPricing } from "./db.ts";

const RUN = Deno.env.get("RUN_DB_TESTS") === "1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ??
  Deno.env.get("VITE_SUPABASE_URL") ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ─── Scenarios (expectations captured from the verified engine output) ────────
// Update these ONLY after an intentional calculation or catalogue change, and
// review the diff — a missing SKU here usually means a seed regression.

const QSHS_10M: CanonicalPayload = {
  variables: {},
  runs: [{
    runId: "r1",
    productCode: "QSHS",
    variables: {
      colour_code: "B",
      slat_size: "65",
      slat_gap_mm: 9,
      finish: "standard",
      post_mounting: "in_ground",
      target_height_mm: 1800,
      slat_count: 13,
    },
    leftBoundary: { type: "product_post" },
    rightBoundary: { type: "product_post" },
    corners: [],
    segments: [{
      segmentId: "s1",
      segmentKind: "panel",
      segmentWidthMm: 10000,
      targetHeightMm: 1800,
      variables: {},
    }],
  }],
} as unknown as CanonicalPayload;

const QSHS_10M_EXPECTED: Array<[string, number]> = [
  ["GROUT-RSC", 8],
  ["QS-5800-CFC-B", 3],
  ["QS-5800-SF-B", 3],
  ["QS-SCREWS-50PK", 5],
  ["QS-SFC-B", 8],
  ["QS-SPACER-09MM-50PK", 4],
  ["XP-2400-FP-B", 5],
  ["XP-5800-CSR-B", 2],
  ["XP-6100-S65-B", 48],
  ["XP-CSRC-B", 4],
];

const COLORBOND_3BAY: CanonicalPayload = {
  variables: {},
  runs: [{
    runId: "r2",
    productCode: "COLORBOND",
    variables: { colour_code: "MN", target_height_mm: 1800 },
    leftBoundary: { type: "product_post" },
    rightBoundary: { type: "product_post" },
    corners: [],
    segments: [{
      segmentId: "s2",
      segmentKind: "panel",
      segmentWidthMm: 9375,
      targetHeightMm: 1800,
      variables: {},
    }],
  }],
} as unknown as CanonicalPayload;

const COLORBOND_3BAY_EXPECTED: Array<[string, number]> = [
  ["CB-CPOST-2400-MN", 8],
  ["CB-GLINE-1790-MN", 12],
  ["CB-POSTCAP-DBL", 3],
  ["CB-POSTCAP-SGL", 2],
  ["CB-RAIL-2365-MN", 8],
  ["CB-TS-MN-15PK", 4],
  ["GROUT-CONCRETE", 5],
  ["XPSG-2700-ST65-MN", 2],
];

// AF Colorbond goes through the org overlay (supplier_product_calculator_configs)
// — this is the only automated coverage of the deep-merged DB overlay path.
const AF_COLORBOND_2BAY: CanonicalPayload = {
  variables: {},
  runs: [{
    runId: "r3",
    productCode: "COLORBOND",
    variables: { colour_code: "MN", target_height_mm: 1800, max_panel_width_mm: 2360 },
    leftBoundary: { type: "product_post" },
    rightBoundary: { type: "product_post" },
    corners: [],
    segments: [{
      segmentId: "s3",
      segmentKind: "panel",
      segmentWidthMm: 4720,
      targetHeightMm: 1800,
      variables: {},
    }],
  }],
} as unknown as CanonicalPayload;

const AF_COLORBOND_2BAY_EXPECTED: Array<[string, number]> = [
  ["AF-CBD-CAP-100x100", 2],   // capRule half_posts: ceil(4 channel posts / 2)
  ["AF-CBD-CPOST-2400", 6],    // 4 channel + 2 terminal C-posts
  ["AF-CBD-RAIL-2360", 4],
  ["AF-CBD-SHEET-1800", 6],    // 3 sheets × 2 bays
  ["AF-CON-POSTMIX-30", 3],    // 1 interior join + 2 terminal footings
];

const AF_TIMBER_BUTTED: CanonicalPayload = {
  variables: {},
  runs: [{
    runId: "r4",
    productCode: "TIMBER_PALING",
    variables: { paling_style: "butted", species: "pine", target_height_mm: 1800 },
    leftBoundary: { type: "product_post" },
    rightBoundary: { type: "product_post" },
    corners: [],
    segments: [{
      segmentId: "s4",
      segmentKind: "panel",
      segmentWidthMm: 4800,
      targetHeightMm: 1800,
      variables: {},
    }],
  }],
} as unknown as CanonicalPayload;

const AF_TIMBER_BUTTED_EXPECTED: Array<[string, number]> = [
  ["AF-CON-RAPID-30", 3],
  ["AF-NAIL-COIL-45-250", 2],
  ["AF-PAL-100x16-1800", 54],
  ["AF-POST-PINE-100x75-2400", 3],
  ["AF-RAIL-PINE-75x38-4800", 3],
  ["AF-SCR-BB-14g-100-500", 1],
];

// ─── Shared context (one DB load per org for all tests) ───────────────────────

async function loadSeededCtx(orgSlug: string) {
  assert(SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY must be set for DB tests");
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: org, error } = await admin
    .from("organisations").select("id").eq("slug", orgSlug).single();
  if (error || !org) throw new Error(`${orgSlug} org not found: ${error?.message}`);

  const [dbComponents, dbPricingRules, configs] = await Promise.all([
    loadDbComponents(admin, org.id),
    loadDbPricing(admin, org.id),
    loadCalculatorConfigs(admin, org.id),
  ]);
  const ctx = makeCalcContext({ dbComponents, dbPricingRules, configs });
  return { ctx, dbComponents };
}

const seeded = RUN ? await loadSeededCtx("glass-outlet") : null;
const seededAf = RUN ? await loadSeededCtx("amazing-fencing") : null;

function componentsOf(
  payload: CanonicalPayload,
  ctx = seeded!.ctx,
): Array<[string, number]> {
  const result = calculateLocalBom(payload, "tier1", ctx);
  assertEquals(result.errors ?? [], [], "engine returned errors");
  return (result.lines ?? [])
    .map((l) => [l.sku, l.quantity] as [string, number])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

Deno.test({
  name: "DB-I01 catalogue loaders paginate past the PostgREST 1000-row cap",
  ignore: !RUN,
  fn: () => {
    assert(
      seeded!.dbComponents.length > 1000,
      `expected > 1000 components from the seeded catalogue, got ${seeded!.dbComponents.length} — pagination broken or seeds missing`,
    );
  },
});

Deno.test({
  name: "DB-I02 QSHS 10m run emits the expected components (seeded DB, prices ignored)",
  ignore: !RUN,
  fn: () => {
    assertEquals(componentsOf(QSHS_10M), QSHS_10M_EXPECTED);
  },
});

Deno.test({
  name: "DB-I03 COLORBOND 3-bay run emits the expected components (seeded DB, prices ignored)",
  ignore: !RUN,
  fn: () => {
    assertEquals(componentsOf(COLORBOND_3BAY), COLORBOND_3BAY_EXPECTED);
  },
});

Deno.test({
  name: "DB-I04 every emitted SKU resolves against the seeded catalogue",
  ignore: !RUN,
  fn: () => {
    const catalogue = new Set(seeded!.dbComponents.map((c) => c.sku));
    for (const payload of [QSHS_10M, COLORBOND_3BAY]) {
      for (const [sku] of componentsOf(payload)) {
        assert(catalogue.has(sku), `emitted SKU not in seeded catalogue: ${sku}`);
      }
    }
  },
});

Deno.test({
  name: "DB-I05 AF COLORBOND run applies the org overlay (capRule, C-post terminals, AF SKUs)",
  ignore: !RUN,
  fn: () => {
    assertEquals(componentsOf(AF_COLORBOND_2BAY, seededAf!.ctx), AF_COLORBOND_2BAY_EXPECTED);
  },
});

Deno.test({
  name: "DB-I06 AF TIMBER_PALING run emits the expected components (seeded DB, prices ignored)",
  ignore: !RUN,
  fn: () => {
    assertEquals(componentsOf(AF_TIMBER_BUTTED, seededAf!.ctx), AF_TIMBER_BUTTED_EXPECTED);
  },
});

Deno.test({
  name: "DB-I07 every AF-emitted SKU resolves against AF's seeded catalogue",
  ignore: !RUN,
  fn: () => {
    const catalogue = new Set(seededAf!.dbComponents.map((c) => c.sku));
    for (const payload of [AF_COLORBOND_2BAY, AF_TIMBER_BUTTED]) {
      for (const [sku] of componentsOf(payload, seededAf!.ctx)) {
        assert(catalogue.has(sku), `emitted SKU not in AF seeded catalogue: ${sku}`);
      }
    }
  },
});
