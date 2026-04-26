// fixture_runner.ts — fixture-driven integration tests for bom-calculator.
//
// Loaded by index_test.ts when SUPABASE_URL is set. Not intended to be run
// directly — always run via index_test.ts so unit tests run first.
//
// Snapshot mode: FIXTURE_UPDATE=1 writes actual BOM output back into each
// fixture file (same pattern as Jest --updateSnapshot). Use this to bootstrap
// new fixtures after confirming the output is correct, then commit the results.

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  join,
  fromFileUrl,
  dirname,
} from "https://deno.land/std@0.224.0/path/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QtyAssertion {
  gte?: number;
  lte?: number;
}

export interface LineItem {
  sku: string;
  name?: string;
  category?: string;
  qty: number | QtyAssertion;
}

export interface FixtureExpect {
  errors?: string[];
  lines?: Array<LineItem>;
  totals?: {
    grandTotal?: number | QtyAssertion;
  };
}

export interface Fixture {
  id: string;
  description: string;
  input: {
    payload: unknown;
    pricingTier?: string;
  };
  expect: FixtureExpect;
}

// ─── Assertion helpers ────────────────────────────────────────────────────────

export function assertQty(
  label: string,
  actual: number,
  expected: number | QtyAssertion,
): void {
  if (typeof expected === "number") {
    assertEquals(
      actual,
      expected,
      `${label}: expected qty ${expected}, got ${actual}`,
    );
  } else {
    if (expected.gte !== undefined && actual < expected.gte) {
      throw new Error(
        `${label}: expected qty >= ${expected.gte}, got ${actual}`,
      );
    }
    if (expected.lte !== undefined && actual > expected.lte) {
      throw new Error(
        `${label}: expected qty <= ${expected.lte}, got ${actual}`,
      );
    }
  }
}

export function assertFixture(
  body: Record<string, unknown>,
  expect: FixtureExpect,
): void {
  if (expect.errors !== undefined) {
    assertEquals(
      body.errors,
      expect.errors,
      `errors mismatch: got ${JSON.stringify(body.errors)}`,
    );
  }

  const lines = body.lines as Array<{ sku: string; quantity: number }>;

  for (const expectedLine of expect.lines ?? []) {
    const actual = lines.find((l) => l.sku === expectedLine.sku);
    assertExists(
      actual,
      `Expected SKU '${expectedLine.sku}' in BOM but it was not found`,
    );
    assertQty(`SKU ${expectedLine.sku}`, actual.quantity, expectedLine.qty);
  }

  const totals = body.totals as { grandTotal: number } | undefined;
  if (expect.totals?.grandTotal !== undefined && totals) {
    assertQty("grandTotal", totals.grandTotal, expect.totals.grandTotal);
  }
}

// ─── Fixture loader ───────────────────────────────────────────────────────────

export function loadFixtures(dir: string): Fixture[] {
  const fixtures: Fixture[] = [];
  for (const entry of Deno.readDirSync(dir)) {
    if (!entry.name.endsWith(".fixture.json")) continue;
    const raw = Deno.readTextFileSync(join(dir, entry.name));
    fixtures.push(JSON.parse(raw) as Fixture);
  }
  return fixtures.sort((a, b) => a.id.localeCompare(b.id));
}

// ─── Runner ───────────────────────────────────────────────────────────────────

export async function runFixtures(): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const email = Deno.env.get("TEST_USER_EMAIL") ?? "test@glass-outlet.com";
  const password = Deno.env.get("TEST_USER_PASSWORD") ?? "123456";
  const snapshotMode = Deno.env.get("FIXTURE_UPDATE") === "1";

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });
  if (authError || !authData.session) {
    throw new Error(`Failed to sign in as ${email}: ${authError?.message}`);
  }
  const jwt = authData.session.access_token;

  const fixtureDir = join(
    dirname(fromFileUrl(import.meta.url)),
    "../../../supabase/seeds/glass-outlet/tests",
  );
  const fixtures = loadFixtures(fixtureDir);

  if (fixtures.length === 0) {
    console.warn("No *.fixture.json files found in", fixtureDir);
    return;
  }

  console.log("Running fixtures...");
  for (const fixture of fixtures) {
    Deno.test(`${fixture.id}: ${fixture.description}`, async () => {
      const res = await fetch(`${supabaseUrl}/functions/v1/bom-calculator`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fixture.input),
      });

      const body = (await res.json()) as Record<string, unknown>;

      assertEquals(
        res.status,
        200,
        `HTTP ${res.status}: ${JSON.stringify(body)}`,
      );

      if (snapshotMode) {
        const lines = (
          body.lines as Array<LineItem & { quantity: number }>
        ).map((l) => ({
          sku: l.sku,
          qty: l.quantity,
          name: l.name,
          category: l.category,
        }));
        const totals = body.totals as { grandTotal: number };
        const updated: Fixture = {
          ...fixture,
          expect: {
            errors: (body.errors as string[]) ?? [],
            lines,
            totals: {
              grandTotal: { gte: Math.floor(totals.grandTotal * 0.8) },
            },
          },
        };
        for (const entry of Deno.readDirSync(fixtureDir)) {
          if (!entry.name.endsWith(".fixture.json")) continue;
          const raw = Deno.readTextFileSync(join(fixtureDir, entry.name));
          if ((JSON.parse(raw) as Fixture).id === fixture.id) {
            Deno.writeTextFileSync(
              join(fixtureDir, entry.name),
              JSON.stringify(updated, null, 2) + "\n",
            );
            break;
          }
        }
        console.log(`[FIXTURE_UPDATE] ${fixture.id} — written`);
        return;
      }

      assertFixture(body, fixture.expect);
    });
  }
}
