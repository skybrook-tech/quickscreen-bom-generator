// colorbond_test.ts — offline assertion tests for the Colorbond calculator.
// Runs calculateLocalBom end-to-end with no ctx (the unpriced-offline path):
// quantities and SKUs are exact; prices are $0 by design (DB-only pricing).
//
//   npx deno test --no-check --allow-read --allow-env \
//     supabase/functions/bom-calculator-static/calculators/colorbond_test.ts

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  calculateLocalBom,
  makeCalcContext,
  suggestAccessories,
  type CanonicalPayload,
  type CanonicalRun,
  type CanonicalSegment,
} from "../engine.ts";
import { BASE_CONFIGS } from "../config/base.ts";

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

Deno.test("CB depot-availability warnings fire per profile (extraRules variable_warning)", () => {
  const goTrim = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 2365, 1800)], { vars: { profile: "GO-TRIM" } })));
  assertEquals(goTrim.warnings.some((w) => w.includes("Newcastle depot only")), true, "GO-TRIM should warn Newcastle-only");

  const goLine = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 2365, 1800)])));  // default profile GO-LINE
  assertEquals(goLine.warnings.some((w) => w.includes("Brisbane & Gold Coast depots only")), true, "GO-LINE should warn Brisbane/GC-only");
  // De-duplicated: multi-segment runs repeat the rule but the warning appears once.
  const multi = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 2365, 1800), cbSeg("s2", 2365, 1800)])));
  assertEquals(multi.warnings.filter((w) => w.includes("Brisbane & Gold Coast depots only")).length, 1);

  const goZag = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 2365, 1500)], { vars: { profile: "GO-ZAG" } })));
  assertEquals(goZag.warnings.some((w) => w.includes("depot")), false, "GO-ZAG is stocked at all depots — no warning");
});

// ── Gates (kit mode — GO catalogue p7/p17 recipe) ────────────────────────────

function cbGateSeg(id: string, widthMm: number, height: number, vars: Vars = {}): CanonicalSegment {
  return {
    segmentId: id, segmentKind: "gate_opening", segmentWidthMm: widthMm,
    targetHeightMm: height,
    variables: {
      hinge_type: "CB-HINGE-{colour}-2PK",
      latch_type: "CB-LATCH-{colour}",
      ...vars,
    },
  };
}

Deno.test("CB kit gate (single): stile pack + 2 rails + 1 sheet + tek pack + hinge pair + latch", () => {
  const r = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 2365, 1800), cbGateSeg("g1", 900, 1800)])));
  const l = r.lines as Line[];
  assertEquals(qty(l, "CB-1800GS-MN-2PK"), 1);   // one stile 2-pack per leaf
  assertEquals(qty(l, "CB-GATE-R-830-MN"), 2);   // top + bottom gate rails
  assertEquals(qty(l, "CB-GLINE-1790-MN"), 3 + 1); // 3 fence sheets + 1 gate infill
  assertEquals(qty(l, "CB-TS-MN-15PK"), 1 + 1);  // fence bay pack + gate pack
  assertEquals(qty(l, "CB-HINGE-MN-2PK"), 1);    // hinge pair per leaf
  assertEquals(qty(l, "CB-LATCH-MN"), 1);
});

Deno.test("CB kit gate (double): doubled kit + drop bolt", () => {
  const r = calculateLocalBom(cbPayload(cbRun([
    cbSeg("s1", 2365, 1800),
    cbGateSeg("g1", 1800, 1800, { gate_movement: "double_swing", drop_bolt_type: "SS-0300DB-B" }),
  ])));
  const l = r.lines as Line[];
  assertEquals(qty(l, "CB-1800GS-MN-2PK"), 2);
  assertEquals(qty(l, "CB-GATE-R-830-MN"), 4);
  assertEquals(qty(l, "CB-GLINE-1790-MN"), 3 + 2);
  assertEquals(qty(l, "CB-HINGE-MN-2PK"), 2);    // hinge pair per leaf
  assertEquals(qty(l, "CB-LATCH-MN"), 1);
  assertEquals(qty(l, "SS-0300DB-B"), 1);
});

Deno.test("CB kit gate snaps off-ladder heights to the nearest stile pack and warns", () => {
  const r = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 2365, 1800), cbGateSeg("g1", 900, 2000)])));
  assertEquals(qty(r.lines as Line[], "CB-2100GS-MN-2PK"), 1); // 2000 → 2100 stile
  assertEquals(r.warnings.some((w) => w.includes("snapped to 2100mm")), true);
});

Deno.test("CB kit gate warns when the opening deviates from the ~900mm assembled leaf", () => {
  const r = calculateLocalBom(cbPayload(cbRun([cbSeg("s1", 2365, 1800), cbGateSeg("g1", 1400, 1800)])));
  assertEquals(r.warnings.some((w) => w.includes("~900mm per leaf")), true);
});

Deno.test("CB kit gate without hinge/latch selection emits neither and warns loudly", () => {
  const r = calculateLocalBom(cbPayload(cbRun([
    cbSeg("s1", 2365, 1800),
    { segmentId: "g1", segmentKind: "gate_opening", segmentWidthMm: 900, targetHeightMm: 1800, variables: {} },
  ])));
  const l = r.lines as Line[];
  assertEquals(qty(l, "CB-HINGE-MN-2PK"), 0);
  assertEquals(r.warnings.some((w) => w.includes("No hinge selected")), true);
  assertEquals(r.warnings.some((w) => w.includes("No latch selected")), true);
  // The kit itself still lands
  assertEquals(qty(l, "CB-1800GS-MN-2PK"), 1);
});

Deno.test("CB sliding gate is rejected with a warning (swing only)", () => {
  const r = calculateLocalBom(cbPayload(cbRun([
    cbSeg("s1", 2365, 1800),
    cbGateSeg("g1", 3000, 1800, { gate_movement: "sliding" }),
  ])));
  const l = r.lines as Line[];
  assertEquals(qty(l, "CB-1800GS-MN-2PK"), 0);
  assertEquals(r.warnings.some((w) => w.includes("Sliding gates are not available")), true);
});

Deno.test("CB run gets NO slat-system accessory suggestions (no slat config block)", () => {
  const ctx = makeCalcContext({
    dbComponents: [],
    dbPricingRules: [],
    configs: new Map(Object.entries(BASE_CONFIGS)),
  });
  const p = cbPayload(cbRun([cbSeg("s1", 7095, 1800)]));
  const r = calculateLocalBom(p, "tier1", ctx);
  const suggestions = suggestAccessories(p, r.lines, "tier1", ctx);
  const xp = suggestions.filter((s) => (s.sku ?? "").startsWith("XP-") || (s.sku ?? "").startsWith("SS-POSTPLUG"));
  assertEquals(xp.length, 0, `Colorbond runs must not receive slat accessories, got: ${xp.map((s) => s.sku).join(", ")}`);
});
