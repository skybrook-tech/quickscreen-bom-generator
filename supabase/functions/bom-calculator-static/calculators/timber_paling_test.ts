// timber_paling_test.ts — offline assertion tests for the timber paling
// calculator. Runs calculateLocalBom end-to-end with no ctx (the
// unpriced-offline path): quantities and SKUs are exact; prices are $0 by
// design (DB-only pricing). Expected numbers come straight from the supplier
// doc (catalogues/amazing-fencing/amazing_fencing_bom_breakdown_by_height.md).
//
//   npx deno test --allow-read --allow-env \
//     supabase/functions/bom-calculator-static/calculators/timber_paling_test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  calculateLocalBom,
  type CanonicalPayload,
  type CanonicalRun,
  type CanonicalSegment,
} from "../engine.ts";
import { BASE_TIMBER_PALING_CONFIG } from "../config/base.ts";
import { resolveUiConfig } from "../config/resolve.ts";

Deno.test("TP config resolves a UI projection (options-mode heights, no slat slice crash)", () => {
  const ui = resolveUiConfig(BASE_TIMBER_PALING_CONFIG);
  assertEquals(ui.strategy.fence, "timber_paling");
  assertEquals(ui.heightUi.mode, "options");
  assertEquals(ui.heightUi.heightOptions, [1200, 1500, 1800, 2100, 2400]);
  assertEquals(ui.heightLadder.entries.length, 5); // N:0 sentinel entries (AGENTS.md §6a)
  assert(ui.fields.some((f) => f.field_key === "paling_style"));
  assert(ui.fields.some((f) => f.field_key === "species"));
  // No colour field — timber SKUs carry no {colour} token, so colour_code is
  // simply absent from the normalised variables (not defaulted).
  assertEquals(ui.normalisedVariables.colour_code, undefined);
});

type Vars = Record<string, string | number | boolean>;

const TP_VARS: Vars = {
  paling_style: "butted",
  species: "pine",
  mounting_type: "in_ground",
  target_height_mm: 1800,
};

function tpSeg(id: string, widthMm: number, height = 1800, vars: Vars = {}): CanonicalSegment {
  return { segmentId: id, segmentKind: "panel", segmentWidthMm: widthMm, targetHeightMm: height, variables: vars };
}

function tpRun(
  segments: CanonicalSegment[],
  opts: { corners?: unknown[]; vars?: Vars; left?: CanonicalRun["leftBoundary"]; right?: CanonicalRun["rightBoundary"] } = {},
): CanonicalRun {
  return {
    runId: "r1",
    productCode: "TIMBER_PALING",
    segments,
    leftBoundary: opts.left ?? { type: "product_post" },
    rightBoundary: opts.right ?? { type: "product_post" },
    corners: opts.corners ?? [],
    variables: { ...TP_VARS, ...(opts.vars ?? {}) },
  };
}

function tpPayload(run: CanonicalRun): CanonicalPayload {
  return { runs: [run], variables: {} };
}

type Line = { sku: string; quantity: number; notes?: string };
const qty = (lines: Line[], sku: string) =>
  lines.filter((l) => l.sku === sku).reduce((s, l) => s + l.quantity, 0);

Deno.test("TP butted 4800mm @ 1800 pine: 3 posts, 3 rails, 54 palings, 2 nail packs, 1 screw pack, 3 rapid-set bags", () => {
  const r = calculateLocalBom(tpPayload(tpRun([tpSeg("s1", 4800, 1800)])));
  const l = r.lines as Line[];
  assertEquals(qty(l, "AF-POST-PINE-100x75-2400"), 3);   // 1 interior + 2 terminals
  assertEquals(qty(l, "AF-RAIL-PINE-75x38-4800"), 3);    // 3 rows × ceil(2 bays / 2)
  assertEquals(qty(l, "AF-PAL-100x16-1800"), 54);        // 27/bay × 2 bays
  assertEquals(qty(l, "AF-NAIL-COIL-45-250"), 2);        // 54 × 2 nails × 3 rails = 324 → 2 packs
  assertEquals(qty(l, "AF-SCR-BB-14g-100-500"), 1);      // 3 rails × 2 screws = 6 → 1 pack
  assertEquals(qty(l, "AF-CON-RAPID-30"), 3);            // 1 bag per pine post
  assertEquals(qty(l, "AF-CON-POSTMIX-30"), 0);          // post mix is hardwood-only
  assertEquals(qty(l, "AF-CAP-75x50-4800"), 0);          // no capping on butted
});

Deno.test("TP lapped & capped 4800mm @ 2400 hardwood: 4 rail rows, 38+38 palings, split nail packs, capping, post mix", () => {
  const r = calculateLocalBom(tpPayload(tpRun(
    [tpSeg("s1", 4800, 2400, { paling_style: "lapped_capped", species: "hardwood" })],
    { vars: { paling_style: "lapped_capped", species: "hardwood", target_height_mm: 2400 } },
  )));
  const l = r.lines as Line[];
  assertEquals(qty(l, "AF-POST-HWD-100x75-3000"), 3);
  assertEquals(qty(l, "AF-RAIL-HWD-75x38-4800"), 4);     // 4 rows × 1 piece
  assertEquals(qty(l, "AF-PAL-100x16-2400"), 76);        // back 38 + front 38
  assertEquals(qty(l, "AF-NAIL-COIL-45-250"), 1);        // back: 38 × 1 × 4 = 152 → 1 pack
  assertEquals(qty(l, "AF-NAIL-COIL-57-250"), 2);        // front: 38 × 2 × 4 = 304 → 2 packs
  assertEquals(qty(l, "AF-CAP-75x50-4800"), 1);          // ceil(2 bays × 0.5)
  assertEquals(qty(l, "AF-CON-POSTMIX-30"), 3);          // post mix for hardwood
  assertEquals(qty(l, "AF-CON-RAPID-30"), 0);
});

Deno.test("TP rail-row ladder: 1200 → 2 rows, 1500 → 3 rows, 2400 → 4 rows", () => {
  const cases: Array<[number, number]> = [[1200, 2], [1500, 3], [2100, 3], [2400, 4]];
  for (const [height, rows] of cases) {
    const r = calculateLocalBom(tpPayload(tpRun(
      [tpSeg("s1", 4800, height)],
      { vars: { target_height_mm: height } },
    )));
    const rails = (r.lines as Line[]).filter((l) => l.sku.startsWith("AF-RAIL-")).reduce((s, l) => s + l.quantity, 0);
    assertEquals(rails, rows, `${height}mm should need ${rows} rail rows (2 bays → 1 piece per row)`);
  }
});

Deno.test("TP odd bay counts round rail pieces up: 5 bays @ 1800 → 3 pieces per row × 3 rows", () => {
  const r = calculateLocalBom(tpPayload(tpRun([tpSeg("s1", 12000, 1800)])));
  assertEquals(qty(r.lines as Line[], "AF-RAIL-PINE-75x38-4800"), 9); // ceil(5/2)=3 pieces × 3 rows
});

Deno.test("TP 2100mm: palings cut from 2400 stock, pine posts cut from 3000 stock — noted on the lines", () => {
  const r = calculateLocalBom(tpPayload(tpRun(
    [tpSeg("s1", 4800, 2100)],
    { vars: { target_height_mm: 2100 } },
  )));
  const l = r.lines as Line[];
  assertEquals(qty(l, "AF-PAL-100x16-2400"), 54);        // 2100 has no paling stock
  const palingLine = l.find((line) => line.sku === "AF-PAL-100x16-2400");
  assert(palingLine?.notes?.includes("cut down to 2100mm"), "paling line must carry the cut-down note");
  assertEquals(qty(l, "AF-POST-PINE-100x75-3000"), 3);
  const postLine = l.find((line) => line.sku === "AF-POST-PINE-100x75-3000");
  assert(postLine?.notes?.includes("cut down to 2700mm"), "post line must carry the cut-down note");
});

Deno.test("TP 1500mm pine: 2400 posts cut down to 2100 (hardwood gets true 2100 stock)", () => {
  const pine = calculateLocalBom(tpPayload(tpRun(
    [tpSeg("s1", 4800, 1500)],
    { vars: { target_height_mm: 1500 } },
  )));
  assertEquals(qty(pine.lines as Line[], "AF-POST-PINE-100x75-2400"), 3);

  const hwd = calculateLocalBom(tpPayload(tpRun(
    [tpSeg("s1", 4800, 1500, { species: "hardwood" })],
    { vars: { species: "hardwood", target_height_mm: 1500 } },
  )));
  assertEquals(qty(hwd.lines as Line[], "AF-POST-HWD-100x75-2100"), 3);
});

Deno.test("TP wall boundary and corners adjust terminal posts", () => {
  const wall = calculateLocalBom(tpPayload(tpRun([tpSeg("s1", 4800, 1800)], { right: { type: "wall" } })));
  assertEquals(qty(wall.lines as Line[], "AF-POST-PINE-100x75-2400"), 2); // 1 interior + left terminal only

  const corner = calculateLocalBom(tpPayload(tpRun([tpSeg("s1", 4800, 1800)], { corners: [{ type: "90" }] })));
  assertEquals(qty(corner.lines as Line[], "AF-POST-PINE-100x75-2400"), 4); // + corner post
});

Deno.test("TP unmapped height warns loudly and emits nothing for the section (no silent default)", () => {
  const r = calculateLocalBom(tpPayload(tpRun([tpSeg("s1", 4800, 1000)])));
  const sectionLines = (r.lines as Line[]).filter((l) => l.sku.startsWith("AF-PAL") || l.sku.startsWith("AF-RAIL"));
  assertEquals(sectionLines.length, 0);
  assert(
    r.warnings.some((w) => w.includes("not an available timber paling height")),
    "unmapped height must warn",
  );
});

Deno.test("TP gate openings are rejected with a warning (timber gates = v2)", () => {
  const r = calculateLocalBom(tpPayload(tpRun([
    tpSeg("s1", 4800, 1800),
    { segmentId: "g1", segmentKind: "gate_opening", segmentWidthMm: 900, targetHeightMm: 1800, variables: {} },
  ])));
  assert(
    r.warnings.some((w) => w.includes("Timber paling gates are not supported yet")),
    "gate segments must warn",
  );
});
