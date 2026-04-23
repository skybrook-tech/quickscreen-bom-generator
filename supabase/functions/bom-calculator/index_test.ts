// index_test.ts — bom-calculator test suite
//
// Part 1 (always): pure unit tests for lib.ts helpers — no DB, no network.
// Part 2 (integration, guarded): fixture-driven HTTP tests via fixture_runner.ts.
//   Only runs when SUPABASE_URL is set in the environment.
//
// Run unit tests only:
//   deno test --allow-read supabase/functions/bom-calculator/index_test.ts
//
// Run all (requires local Supabase + seeded DB):
//   SUPABASE_URL=http://localhost:54321 \
//   SUPABASE_SERVICE_ROLE_KEY=<key> \
//   deno test --allow-net --allow-env --allow-read \
//     supabase/functions/bom-calculator/index_test.ts
//
// Snapshot / update mode:
//   FIXTURE_UPDATE=1 SUPABASE_URL=... deno test --allow-net --allow-env --allow-read ...

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  matchesJSON,
  normaliseVariables,
  resolvePlaceholders,
  resolvePrice,
  type EngineData,
} from "./lib.ts";
import type { PricingRule } from "../_shared/types.ts";
import { runFixtures } from "./fixture_runner.ts";

// ─── resolvePrice ─────────────────────────────────────────────────────────────

Deno.test("resolvePrice: returns price of first truthy rule", () => {
  const rules: PricingRule[] = [
    { sku: "A", rule: "qty > 10", price: 5.0, priority: 2 },
    { sku: "A", rule: null, price: 8.0, priority: 1 },
  ];
  assertEquals(resolvePrice(rules, 15), 5.0);
});

Deno.test("resolvePrice: falls through to null catch-all rule", () => {
  const rules: PricingRule[] = [
    { sku: "A", rule: "qty > 10", price: 5.0, priority: 2 },
    { sku: "A", rule: null, price: 8.0, priority: 1 },
  ];
  assertEquals(resolvePrice(rules, 5), 8.0);
});

Deno.test("resolvePrice: returns 0 when no rules provided", () => {
  assertEquals(resolvePrice([], 10), 0);
});

Deno.test("resolvePrice: skips malformed rule and continues to next", () => {
  const rules: PricingRule[] = [
    { sku: "A", rule: "not a valid expression !!!!", price: 9.0, priority: 2 },
    { sku: "A", rule: null, price: 3.5, priority: 1 },
  ];
  assertEquals(resolvePrice(rules, 5), 3.5);
});

// ─── matchesJSON ──────────────────────────────────────────────────────────────

Deno.test("matchesJSON: exact match returns true", () => {
  assertEquals(
    matchesJSON({ colour: "B" }, { colour: "B", height: 1800 }),
    true,
  );
});

Deno.test("matchesJSON: exact mismatch returns false", () => {
  assertEquals(
    matchesJSON({ colour: "W" }, { colour: "B", height: 1800 }),
    false,
  );
});

Deno.test("matchesJSON: empty matchJson always returns true", () => {
  assertEquals(matchesJSON({}, { colour: "B" }), true);
});

Deno.test("matchesJSON: array membership — value in array returns true", () => {
  assertEquals(matchesJSON({ colour: ["B", "MN"] }, { colour: "B" }), true);
});

Deno.test(
  "matchesJSON: array membership — value not in array returns false",
  () => {
    assertEquals(matchesJSON({ colour: ["B", "MN"] }, { colour: "G" }), false);
  },
);

Deno.test("matchesJSON: range gt — above threshold returns true", () => {
  assertEquals(matchesJSON({ height: { gt: 1000 } }, { height: 1800 }), true);
});

Deno.test("matchesJSON: range gt — at threshold returns false", () => {
  assertEquals(matchesJSON({ height: { gt: 1800 } }, { height: 1800 }), false);
});

Deno.test("matchesJSON: range gte — at threshold returns true", () => {
  assertEquals(matchesJSON({ height: { gte: 1800 } }, { height: 1800 }), true);
});

Deno.test("matchesJSON: range lt — below threshold returns true", () => {
  assertEquals(matchesJSON({ qty: { lt: 10 } }, { qty: 5 }), true);
});

Deno.test("matchesJSON: range lte — at threshold returns true", () => {
  assertEquals(matchesJSON({ qty: { lte: 10 } }, { qty: 10 }), true);
});

Deno.test("matchesJSON: range eq — equal returns true", () => {
  assertEquals(
    matchesJSON({ slat_size_mm: { eq: 65 } }, { slat_size_mm: 65 }),
    true,
  );
});

Deno.test("matchesJSON: range neq — not equal returns true", () => {
  assertEquals(
    matchesJSON({ slat_size_mm: { neq: 90 } }, { slat_size_mm: 65 }),
    true,
  );
});

Deno.test("matchesJSON: range neq — equal returns false", () => {
  assertEquals(
    matchesJSON({ slat_size_mm: { neq: 65 } }, { slat_size_mm: 65 }),
    false,
  );
});

// ─── resolvePlaceholders ──────────────────────────────────────────────────────

Deno.test("resolvePlaceholders: single placeholder resolved", () => {
  assertEquals(
    resolvePlaceholders("XP-6100-S65-{colour}", { colour: "B" }),
    "XP-6100-S65-B",
  );
});

Deno.test("resolvePlaceholders: multiple placeholders resolved", () => {
  assertEquals(
    resolvePlaceholders("{prefix}-{size}-{colour}", {
      prefix: "QS",
      size: "65",
      colour: "MN",
    }),
    "QS-65-MN",
  );
});

Deno.test("resolvePlaceholders: unresolved placeholder left as-is", () => {
  assertEquals(
    resolvePlaceholders("XP-6100-S65-{colour}", { height: 1800 }),
    "XP-6100-S65-{colour}",
  );
});

// ─── normaliseVariables ───────────────────────────────────────────────────────

Deno.test(
  "normaliseVariables: applies default_value_json from engine variables",
  () => {
    const engineData: Pick<EngineData, "variables"> = {
      variables: [
        {
          id: "1",
          name: "slat_size_mm",
          data_type: "number",
          default_value_json: 65,
          scope: "run",
        },
        {
          id: "2",
          name: "mounting_type",
          data_type: "enum",
          default_value_json: "in_ground",
          scope: "run",
        },
      ],
    };
    const ctx = normaliseVariables({}, engineData);
    assertEquals(ctx["slat_size_mm"], 65);
    assertEquals(ctx["mounting_type"], "in_ground");
  },
);

Deno.test("normaliseVariables: provided vars override defaults", () => {
  const engineData: Pick<EngineData, "variables"> = {
    variables: [
      {
        id: "1",
        name: "slat_size_mm",
        data_type: "number",
        default_value_json: 65,
        scope: "run",
      },
    ],
  };
  const ctx = normaliseVariables({ slat_size_mm: 90 }, engineData);
  assertEquals(ctx["slat_size_mm"], 90);
});

Deno.test(
  "normaliseVariables: unknown colour string passed through unchanged",
  () => {
    const engineData: Pick<EngineData, "variables"> = { variables: [] };
    const ctx = normaliseVariables(
      { colour_code: "some-future-colour" },
      engineData,
    );
    assertEquals(ctx["colour"], "some-future-colour");
  },
);

Deno.test("normaliseVariables: null default_value_json not applied", () => {
  const engineData: Pick<EngineData, "variables"> = {
    variables: [
      {
        id: "1",
        name: "segment_width_mm",
        data_type: "number",
        default_value_json: null,
        scope: "segment",
      },
    ],
  };
  const ctx = normaliseVariables({}, engineData);
  assertEquals(ctx["segment_width_mm"], undefined);
});

// ─── Fixture-driven integration tests ────────────────────────────────────────

console.log("Checking for SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY...");
console.log(Deno.env.get("SUPABASE_URL"));
console.log(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
if (Deno.env.get("SUPABASE_URL") && Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
  console.log("Running fixtures...");
  await runFixtures();
}
