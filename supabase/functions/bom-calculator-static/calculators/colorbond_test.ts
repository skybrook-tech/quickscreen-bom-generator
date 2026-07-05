// colorbond_test.ts — offline assertion tests for the Colorbond calculator.
// Runs calculateLocalBom end-to-end against synthetic data + BASE_CONFIGS.
//
//   npx deno test --no-check --allow-read --allow-env \
//     supabase/functions/bom-calculator-static/calculators/colorbond_test.ts

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  calculateLocalBom,
  type CanonicalPayload,
  type CanonicalRun,
  type CanonicalSegment,
} from "../engine.ts";

type Vars = Record<string, string | number | boolean>;

const CB_VARS: Vars = {
  colour_code: "MN",
  profile: "GO-LINE",
  max_panel_width_mm: 2365,
  mounting_type: "in_ground",
  post_cap: true,
};

function cbSeg(id: string, widthMm: number, height = 1800, vars: Vars = {}): CanonicalSegment {
  return { segmentId: id, segmentKind: "panel", segmentWidthMm: widthMm, targetHeightMm: height, variables: vars };
}

function cbRun(
  segments: CanonicalSegment[],
  opts: { corners?: unknown[]; vars?: Vars; left?: CanonicalRun["leftBoundary"]; right?: CanonicalRun["rightBoundary"] } = {},
): CanonicalRun {
  return {
    runId: "r1",
    productCode: "COLORBOND",
    segments,
    leftBoundary: opts.left ?? { type: "product_post" },
    rightBoundary: opts.right ?? { type: "product_post" },
    corners: opts.corners ?? [],
    variables: { ...CB_VARS, ...(opts.vars ?? {}) },
  };
}

function cbPayload(run: CanonicalRun): CanonicalPayload {
  return { runs: [run], variables: {} };
}

type Line = { sku: string; category: string; quantity: number };
// Assert by SKU, not by our emitted category — the engine's withBomMetadata
// remaps the QtyLine category to a display category (sheet → screening, etc.).
const qty = (lines: Line[], sku: string) =>
  lines.filter((l) => l.sku === sku).reduce((s, l) => s + l.quantity, 0);

Deno.test("CB single 2365 bay → 3 sheets + 2 rails + 2 channel posts + 1 tek pack + 2 terminal posts + 2 concrete", () => {
  const r = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 2365, 1800)])));
  const l = r.lines as Line[];
  assertEquals(qty(l, "CB-GLINE-1790-MN"), 3);
  assertEquals(qty(l, "CB-RAIL-2365-MN"), 2);
  assertEquals(qty(l, "CB-TS-MN-15PK"), 1);
  assertEquals(qty(l, "XPSG-2700-ST65-MN"), 2);      // both boundaries are posts
  assertEquals(qty(l, "CB-CPOST-2400-MN"), 2);       // 2 channel posts per bay (catalogue p6 recipe)
  assertEquals(qty(l, "CB-POSTCAP-SGL"), 2);         // one-way caps at segment ends
  assertEquals(qty(l, "CB-POSTCAP-DBL"), 0);         // no interior joins on a single bay
  assertEquals(qty(l, "GROUT-CONCRETE"), 2);         // 1 bag/footing × 2 terminal footings
});

Deno.test("CB 3125 bay → 4 sheets, 2 rails", () => {
  const r = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 3125, 1800)], { vars: { max_panel_width_mm: 3125 } })));
  const l = r.lines as Line[];
  assertEquals(qty(l, "CB-GLINE-1790-MN"), 4);
  assertEquals(qty(l, "CB-RAIL-3125-MN"), 2);
});

Deno.test("CB multi-bay (3×2365) → 9 sheets, 6 rails, 6 channel posts, 3 tek, 4 concrete", () => {
  const r = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 7095, 1800)])));
  const l = r.lines as Line[];
  assertEquals(qty(l, "CB-GLINE-1790-MN"), 9);
  assertEquals(qty(l, "CB-RAIL-2365-MN"), 6);
  assertEquals(qty(l, "CB-CPOST-2400-MN"), 6);   // 2 per bay × 3 bays, 1800 in_ground → 2400
  assertEquals(qty(l, "CB-POSTCAP-DBL"), 2);     // 1 double-sided cap per back-to-back join (bays − 1)
  assertEquals(qty(l, "CB-POSTCAP-SGL"), 2);     // one-way caps at segment ends
  assertEquals(qty(l, "CB-TS-MN-15PK"), 3);
  assertEquals(qty(l, "XPSG-2700-ST65-MN"), 2);
  assertEquals(qty(l, "GROUT-CONCRETE"), 4);     // footings: 2 interior joins + 2 terminals
});

Deno.test("CB corner adds a terminal 65×65 post", () => {
  const r = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 2365, 1800)], { corners: [{ type: "90" }] })));
  assertEquals(qty(r.lines as Line[], "XPSG-2700-ST65-MN"), 3); // 2 boundaries + 1 corner
});

Deno.test("CB wall boundary omits a terminal post", () => {
  const r = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 2365, 1800)], { right: { type: "wall" } })));
  assertEquals(qty(r.lines as Line[], "XPSG-2700-ST65-MN"), 1); // only the left (post) boundary
});

Deno.test("CB post-height selection by finished height + mounting", () => {
  const inGround1500 = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 7095, 1500)])));
  assertEquals(qty(inGround1500.lines as Line[], "CB-CPOST-2400-MN"), 6); // 1500 in-ground → 2400

  const sharkfin1500 = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 7095, 1500)], { vars: { mounting_type: "sharkfin_baseplate" } })));
  const sl = sharkfin1500.lines as Line[];
  assertEquals(qty(sl, "CB-CPOST-1800-MN"), 6);  // 1500 sharkfin → 1800
  assertEquals(qty(sl, "CB-SHARKFIN-MN"), 2);    // one fin per back-to-back join (bays − 1)
  assertEquals(qty(sl, "GROUT-CONCRETE"), 0);    // no concrete under sharkfin

  const inGround2100 = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 7095, 2100)])));
  assertEquals(qty(inGround2100.lines as Line[], "CB-CPOST-3000-MN"), 6); // 2100 → 3000
});

Deno.test("CB GO-ZAG profile → 1500 finished → 1490 sheet token", () => {
  const r = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 2365, 1500)], { vars: { profile: "GO-ZAG" } })));
  assertEquals(qty(r.lines as Line[], "CB-GZAG-1490-MN"), 3);
});

Deno.test("CB post_cap=false suppresses cap lines", () => {
  const r = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 7095, 1800)], { vars: { post_cap: false } })));
  const l = r.lines as Line[];
  assertEquals(qty(l, "CB-POSTCAP-DBL") + qty(l, "CB-POSTCAP-SGL"), 0);
});
