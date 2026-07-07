// af_overlay_test.ts — parity guard for the Amazing Fencing seed overlays.
//
// Reads the ACTUAL seed file (supabase/seeds/amazing-fencing/products/*.json),
// deep-merges its calculator_configs patch over the base config exactly like
// config/merge.ts does at request time, and asserts that every SKU the
// calculator can emit exists in the seed file's product_components. This turns
// the classic silent-$0 failure (template-interpolation ⇄ catalogue mismatch,
// AGENTS.md §15) into a red test.
//
//   npx deno test --allow-read --allow-env \
//     supabase/functions/bom-calculator-static/config/af_overlay_test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  calculateLocalBom,
  makeCalcContext,
  type CanonicalPayload,
  type CanonicalRun,
  type CanonicalSegment,
} from "../engine.ts";
import { BASE_CONFIGS, BASE_COLORBOND_CONFIG } from "./base.ts";
import { deepMerge } from "./merge.ts";
import { resolveUiConfig } from "./resolve.ts";
import type { CalculatorConfig } from "./types.ts";

type SeedFile = {
  org_slug: string;
  product_components?: Array<{ sku: string }>;
  calculator_configs?: Array<{ product_code: string; config: Partial<CalculatorConfig> }>;
};

function readSeed(name: string): SeedFile {
  const url = new URL(`../../../seeds/amazing-fencing/products/${name}`, import.meta.url);
  return JSON.parse(Deno.readTextFileSync(url)) as SeedFile;
}

const seed = readSeed("colorbond.json");
const gateSeed = readSeed("cb_gate.json");
const overlay = seed.calculator_configs?.find((c) => c.product_code === "COLORBOND");
const seedSkus = new Set(
  [...(seed.product_components ?? []), ...(gateSeed.product_components ?? [])].map((c) => c.sku),
);

function afConfig(): CalculatorConfig {
  assert(overlay, "AF colorbond.json must carry a COLORBOND calculator_configs overlay");
  return deepMerge(BASE_COLORBOND_CONFIG, overlay.config);
}

function afConfigs(): Map<string, CalculatorConfig> {
  const configs = new Map(Object.entries(BASE_CONFIGS));
  configs.set("COLORBOND", afConfig());
  return configs;
}

function afCtx() {
  return makeCalcContext({ dbComponents: [], dbPricingRules: [], configs: afConfigs() });
}

type Vars = Record<string, string | number | boolean>;

function seg(id: string, widthMm: number, height: number, vars: Vars = {}): CanonicalSegment {
  return { segmentId: id, segmentKind: "panel", segmentWidthMm: widthMm, targetHeightMm: height, variables: vars };
}

function run(segments: CanonicalSegment[], vars: Vars = {}, corners: unknown[] = []): CanonicalRun {
  return {
    runId: "r1",
    productCode: "COLORBOND",
    segments,
    leftBoundary: { type: "product_post" },
    rightBoundary: { type: "product_post" },
    corners,
    variables: {
      colour_code: "MN",
      max_panel_width_mm: 2360,
      mounting_type: "in_ground",
      post_cap: true,
      ...vars,
    },
  };
}

function payload(r: CanonicalRun): CanonicalPayload {
  return { runs: [r], variables: {} };
}

type Line = { sku: string; quantity: number; notes?: string };
const qty = (lines: Line[], sku: string) =>
  lines.filter((l) => l.sku === sku).reduce((s, l) => s + l.quantity, 0);

Deno.test("AF overlay merges over base and resolves a UI config", () => {
  const ui = resolveUiConfig(afConfig());
  assertEquals(ui.heightUi.mode, "options");
  assertEquals(ui.heightUi.heightOptions, [1200, 1500, 1800, 2100, 2400]);
  // fields is a wholesale replacement: no profile field, single mounting option
  assert(!ui.fields.some((f) => f.field_key === "profile"), "AF has no profile field");
  const mounting = ui.fields.find((f) => f.field_key === "mounting_type");
  assertEquals(mounting?.options_json?.length, 1);
  // ladder projects the options-mode entries (N:0 sentinel per AGENTS.md §6a)
  assertEquals(ui.heightLadder.entries.length, 5);
});

function gateSeg(id: string, widthMm: number, height: number, vars: Vars = {}): CanonicalSegment {
  return {
    segmentId: id, segmentKind: "gate_opening", segmentWidthMm: widthMm,
    targetHeightMm: height, variables: vars,
  };
}

Deno.test("AF parity guard: every emitted SKU across heights × bay widths × gates exists in the seed catalogue", () => {
  const ctx = afCtx();
  for (const height of [1200, 1500, 1800, 2100, 2400]) {
    for (const bay of [2360, 3100]) {
      for (const movement of ["single_swing", "double_swing"]) {
        // two bays + a corner + a gate: exercises sheets, rails, channel posts,
        // caps, terminal posts, concrete, the interior-join path, and bundles
        const r = calculateLocalBom(
          payload(run(
            [
              seg("s1", bay * 2, height, { max_panel_width_mm: bay }),
              gateSeg("g1", movement === "double_swing" ? 1800 : 900, height, {
                gate_movement: movement,
                drop_bolt_type: movement === "double_swing" ? "AF-CBD-GATEHW-DROP-BOLT" : "none",
              }),
            ],
            { target_height_mm: height, max_panel_width_mm: bay },
            [{ type: "90" }],
          )),
          "tier1",
          ctx,
        );
        const unknown = (r.lines as Line[]).map((l) => l.sku).filter((sku) => !seedSkus.has(sku));
        assertEquals(
          unknown,
          [],
          `height=${height} bay=${bay} gate=${movement}: emitted SKU(s) missing from AF seed catalogue: ${unknown.join(", ")}`,
        );
      }
    }
  }
});

Deno.test("AF bundle gate (single): snapped width bundle + butt hinges + D latch", () => {
  const ctx = afCtx();
  const r = calculateLocalBom(
    payload(run([seg("s1", 2360, 1800), gateSeg("g1", 1000, 1800)])),
    "tier1",
    ctx,
  );
  const l = r.lines as Line[];
  assertEquals(qty(l, "AF-CBD-GATE-STD-SGL-900"), 1); // 1000mm snapped to 900 bundle
  assertEquals(qty(l, "AF-CBD-GATEHW-BUTT-HINGE"), 1);
  assertEquals(qty(l, "AF-CBD-GATEHW-D-LATCH"), 1);
  assertEquals(qty(l, "AF-CBD-GATEHW-DOUBLE-SET"), 0);
  assert(
    r.warnings.some((w) => w.includes("snapped to the nearest 900mm")),
    "width snap must be surfaced as a warning",
  );
});

Deno.test("AF bundle gate (double): DBL bundle + double set + drop bolt", () => {
  const ctx = afCtx();
  const r = calculateLocalBom(
    payload(run([
      seg("s1", 2360, 1800),
      gateSeg("g1", 1800, 1800, { gate_movement: "double_swing", drop_bolt_type: "AF-CBD-GATEHW-DROP-BOLT" }),
    ])),
    "tier1",
    ctx,
  );
  const l = r.lines as Line[];
  assertEquals(qty(l, "AF-CBD-GATE-STD-DBL-1800"), 1);
  assertEquals(qty(l, "AF-CBD-GATEHW-DOUBLE-SET"), 1);
  assertEquals(qty(l, "AF-CBD-GATEHW-DROP-BOLT"), 1);
  assertEquals(qty(l, "AF-CBD-GATEHW-BUTT-HINGE"), 0);
});

Deno.test("AF capRule=half_posts: caps = ceil(channel posts / 2)", () => {
  const ctx = afCtx();
  // 1 bay → 2 channel posts → 1 cap
  const one = calculateLocalBom(payload(run([seg("s1", 2360, 1800)])), "tier1", ctx);
  assertEquals(qty(one.lines as Line[], "AF-CBD-CAP-100x100"), 1);
  // 3 bays → 6 channel posts → 3 caps
  const three = calculateLocalBom(payload(run([seg("s1", 7080, 1800)])), "tier1", ctx);
  assertEquals(qty(three.lines as Line[], "AF-CBD-CAP-100x100"), 3);
  // no single/double split SKUs under half_posts (same SKU either way for AF,
  // so also assert the GO cap SKUs never leak)
  assertEquals(qty(three.lines as Line[], "CB-POSTCAP-SGL"), 0);
  assertEquals(qty(three.lines as Line[], "CB-POSTCAP-DBL"), 0);
});

Deno.test("AF capRule=half_posts rounds odd post counts up (synthetic 1 post/bay)", () => {
  const cfg = afConfig();
  const synthetic = deepMerge(cfg, { colorbond: { ...cfg.colorbond!, channelPostsPerBay: 1 } });
  const configs = afConfigs();
  configs.set("COLORBOND", synthetic);
  const ctx = makeCalcContext({ dbComponents: [], dbPricingRules: [], configs });
  // 3 bays × 1 post = 3 posts → ceil(3/2) = 2 caps
  const r = calculateLocalBom(payload(run([seg("s1", 7080, 1800)])), "tier1", ctx);
  assertEquals(qty(r.lines as Line[], "AF-CBD-CAP-100x100"), 2);
});

Deno.test("AF post heights follow the doc ladder, with the 1200mm cut-down note", () => {
  const ctx = afCtx();
  const cases: Array<[number, string]> = [
    [1200, "AF-CBD-CPOST-2100"],
    [1500, "AF-CBD-CPOST-2100"],
    [1800, "AF-CBD-CPOST-2400"],
    [2100, "AF-CBD-CPOST-2700"],
    [2400, "AF-CBD-CPOST-3000"],
  ];
  for (const [height, sku] of cases) {
    const r = calculateLocalBom(
      payload(run([seg("s1", 4720, height)], { target_height_mm: height })),
      "tier1",
      ctx,
    );
    // 2 bays × 2 channel posts + 2 terminal C-posts (both boundaries) = 6
    assertEquals(qty(r.lines as Line[], sku), 6, `${height}mm should emit 6× ${sku}`);
  }
  const r1200 = calculateLocalBom(
    payload(run([seg("s1", 2360, 1200)], { target_height_mm: 1200 })),
    "tier1",
    ctx,
  );
  const postLine = (r1200.lines as Line[]).find((l) => l.sku === "AF-CBD-CPOST-2100");
  assert(postLine?.notes?.includes("cut down 300mm"), "1200mm channel-post line must carry the cut-down note");
});

Deno.test("AF sheets: 3 per bay at both widths, sheet height = finished height", () => {
  const ctx = afCtx();
  const r = calculateLocalBom(payload(run([seg("s1", 6200, 1800, { max_panel_width_mm: 3100 })], { max_panel_width_mm: 3100 })), "tier1", ctx);
  const l = r.lines as Line[];
  assertEquals(qty(l, "AF-CBD-SHEET-1800"), 6); // 3 sheets × 2 bays
  assertEquals(qty(l, "AF-CBD-RAIL-3100"), 4);  // 2 rails × 2 bays
});

Deno.test("AF fixings are not auto-calculated: no tek line, loud warning instead", () => {
  const ctx = afCtx();
  const r = calculateLocalBom(payload(run([seg("s1", 2360, 1800)])), "tier1", ctx);
  const tek = (r.lines as Line[]).filter((l) => l.sku.includes("SCREW"));
  assertEquals(tek.length, 0, "tekPacksPerBay=0 must suppress the fixings line");
  assert(
    r.warnings.some((w) => w.includes("not auto-calculated")),
    "the fixings warning must fire on every AF colorbond BOM",
  );
});

Deno.test("AF terminal posts are C-posts at the run height (no GO 65×65 leakage)", () => {
  const ctx = afCtx();
  const r = calculateLocalBom(
    payload(run([seg("s1", 2360, 2400)], { target_height_mm: 2400 })),
    "tier1",
    ctx,
  );
  const l = r.lines as Line[];
  // 2 channel posts (bay) + 2 terminal C-posts at 3000
  assertEquals(qty(l, "AF-CBD-CPOST-3000"), 4);
  assert(!l.some((line) => line.sku.startsWith("XPSG-")), "GO terminal-post SKU must not leak into AF quotes");
});

// ── Timber paling parity (no overlay — AF's rules ARE the base config) ───────

const timberSeed = readSeed("timber_paling.json");
const timberSeedSkus = new Set((timberSeed.product_components ?? []).map((c) => c.sku));

Deno.test("AF timber parity guard: every emitted SKU across styles × species × heights exists in the seed catalogue", () => {
  for (const style of ["butted", "lapped_capped"]) {
    for (const species of ["pine", "hardwood"]) {
      for (const height of [1200, 1500, 1800, 2100, 2400]) {
        const r = calculateLocalBom({
          runs: [{
            runId: "r1",
            productCode: "TIMBER_PALING",
            segments: [{
              segmentId: "s1", segmentKind: "panel", segmentWidthMm: 7200,
              targetHeightMm: height,
              variables: {},
            }],
            leftBoundary: { type: "product_post" },
            rightBoundary: { type: "product_post" },
            corners: [{ type: "90" }],
            variables: {
              paling_style: style, species, mounting_type: "in_ground",
              target_height_mm: height,
            },
          }],
          variables: {},
        });
        const unknown = (r.lines as Line[]).map((l) => l.sku).filter((sku) => !timberSeedSkus.has(sku));
        assertEquals(
          unknown,
          [],
          `style=${style} species=${species} height=${height}: emitted SKU(s) missing from AF timber seed: ${unknown.join(", ")}`,
        );
      }
    }
  }
});

Deno.test("AF overlay never leaks other GO SKU templates (full-SKU-map override)", () => {
  const cb = afConfig().colorbond!;
  for (const [key, template] of Object.entries(cb.skus)) {
    assert(
      !String(template).startsWith("CB-") && !String(template).startsWith("XPSG-") && !String(template).startsWith("GROUT-"),
      `colorbond.skus.${key} still points at a Glass Outlet template: ${template}`,
    );
  }
});
