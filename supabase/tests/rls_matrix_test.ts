// supabase/tests/rls_matrix_test.ts
//
// RLS MATRIX — the salvage Phase A security guard. Supplier (org) data isolation
// is business-ending if wrong, so this asserts, against a live seeded DB, exactly
// what each role can read across the catalogue + pricing surface:
//
//   role            products / components / pricing_rules / price_books / items / rules
//   anon            reads NOTHING (no anon grants anywhere)
//   org-A user      reads ONLY org-A rows; CANNOT read org-B pricing
//   org-B user      reads ONLY org-B rows; CANNOT read org-A pricing
//   admin           can read across orgs on pricing_rules + product_components
//
// Runs in CI's "Deno integration tests" job after `npm run db:reset` (which seeds
// the glass-outlet org = org-A and the test + admin users). The test provisions a
// second org (org-B) with its own user and pricing fixtures, runs the matrix, and
// cleans up.
//
// Env: SUPABASE_URL (or VITE_SUPABASE_URL), VITE_SUPABASE_ANON_KEY,
//      SUPABASE_SERVICE_ROLE_KEY. Seeded creds: test@glass-outlet.com / 123456
//      (org-A member) and admin@glass-outlet.com / 123456 (admin).

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "http://localhost:54321";
const ANON = Deno.env.get("VITE_SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const B_USER_EMAIL = "rls-test-user-b@example.com";
const B_USER_PASSWORD = "rls-test-123456";
const B_ORG_SLUG = "rls-test-org-b";
const B_SUPPLIER_SLUG = "rls-test-supplier-b";
const B_SYSTEM_TYPE = "RLSTESTB";
const B_SKU = "RLS-TEST-B-COMPONENT";

const A_PB_NAME = "RLS Test — Glass Outlet Book";
const B_PB_NAME = "RLS Test — Org B Book";

if (!SERVICE || !ANON) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY — skipping RLS matrix");
  Deno.exit(1);
}

// Production guard: this test creates + deletes orgs, users, and pricing rows.
// Refuse to run it against a known production project. Mirror of
// supabase/seeds/tools/guard.js (kept inline — Deno cannot import the Node CJS/ESM
// guard cleanly). Override with ALLOW_PROD_DB=1 only if you truly mean it.
const PROD_SUPABASE_REFS = ["dsjtihvefcteftuxvowt"];
const prodMatch = PROD_SUPABASE_REFS.find((ref) => URL.includes(ref));
if (prodMatch && Deno.env.get("ALLOW_PROD_DB") !== "1") {
  console.error(
    `REFUSING to run the RLS matrix against PRODUCTION Supabase project "${prodMatch}" (${URL}). ` +
      `Set ALLOW_PROD_DB=1 to override.`,
  );
  Deno.exit(1);
}

const svc = createClient(URL, SERVICE, { auth: { persistSession: false } });

/** Rows a client can SELECT, or [] when blocked (permission denied / RLS). */
async function rows(client: SupabaseClient, table: string, select = "*"): Promise<any[]> {
  const { data, error } = await client.from(table).select(select);
  if (error) return []; // permission denied / no grant ⇒ reads nothing
  return data ?? [];
}

/**
 * Whether a client can read ONE specific row by id. Targeted by-id reads are
 * robust against PostgREST's default 1000-row page cap — the seeded Glass Outlet
 * catalogue is large, so an unfiltered fetch may not contain a given fixture row
 * even when RLS would allow it. RLS-blocked rows return 0 rows ⇒ false.
 */
async function canRead(client: SupabaseClient, table: string, id: string): Promise<boolean> {
  const { data, error } = await client.from(table).select("id").eq("id", id).maybeSingle();
  if (error) return false;
  return !!data;
}

// ── fixture ids, resolved/created in setup ──────────────────────────────────
let orgAId = "";
let orgBId = "";
let bUserId = "";
let aSupplierId = "";
let bSupplierId = "";
let bComponentId = "";
let bPricingRuleId = "";
let bProductId = "";
let aPriceBookId = "";
let bPriceBookId = "";
let aPriceBookItemId = "";
let bPriceBookItemId = "";

async function cleanup() {
  // Order respects FKs (items → books; pricing/components cascade with product/org).
  await svc.from("price_book_items").delete().in("price_book_id", [aPriceBookId, bPriceBookId].filter(Boolean));
  await svc.from("price_books").delete().in("name", [A_PB_NAME, B_PB_NAME]);
  await svc.from("pricing_rules").delete().eq("org_id", orgBId || "00000000-0000-0000-0000-000000000000");
  await svc.from("product_components").delete().eq("org_id", orgBId || "00000000-0000-0000-0000-000000000000");
  await svc.from("products").delete().eq("org_id", orgBId || "00000000-0000-0000-0000-000000000000");
  await svc.from("suppliers").delete().eq("slug", B_SUPPLIER_SLUG);
  if (bUserId) await svc.auth.admin.deleteUser(bUserId).catch(() => {});
  // Delete profile + org last (profile FK → org).
  if (bUserId) await svc.from("profiles").delete().eq("id", bUserId);
  await svc.from("organisations").delete().eq("slug", B_ORG_SLUG);
  // Reset the embed flag the embed step toggles on glass-outlet (org-A).
  await svc.from("organisations").update({ embed_enabled: false }).eq("slug", "glass-outlet");
}

async function setup() {
  // org-A = glass-outlet (seeded)
  const { data: orgA } = await svc.from("organisations").select("id").eq("slug", "glass-outlet").single();
  orgAId = orgA!.id;

  // Resolve the glass-outlet supplier (created + linked to org-A in migration 032)
  const { data: aSup } = await svc.from("suppliers").select("id").eq("slug", "glass-outlet").single();
  aSupplierId = aSup!.id;

  await cleanup(); // belt-and-suspenders before (re)creating fixtures

  // org-B
  const { data: orgB, error: orgErr } = await svc
    .from("organisations").insert({ slug: B_ORG_SLUG, name: "RLS Test Org B" }).select("id").single();
  if (orgErr) throw orgErr;
  orgBId = orgB!.id;

  // org-B user + profile pinned to org-B
  const { data: created, error: userErr } = await svc.auth.admin.createUser({
    email: B_USER_EMAIL, password: B_USER_PASSWORD, email_confirm: true,
  });
  if (userErr) throw userErr;
  bUserId = created.user!.id;
  // Signup trigger creates the profile (defaulting to glass-outlet) — repoint to org-B.
  const { error: profErr } = await svc.from("profiles").update({ org_id: orgBId }).eq("id", bUserId);
  if (profErr) throw profErr;

  // org-B supplier linked to org-B (so price-book RLS scopes correctly)
  const { data: bSup, error: supErr } = await svc.from("suppliers")
    .insert({ slug: B_SUPPLIER_SLUG, name: "RLS Test Supplier B", trust_tier: "user", status: "active", org_id: orgBId })
    .select("id").single();
  if (supErr) throw supErr;
  bSupplierId = bSup!.id;

  // org-B product / component / pricing rule
  const { data: bProd, error: prodErr } = await svc.from("products")
    .insert({ org_id: orgBId, name: "RLS Test Product B", system_type: B_SYSTEM_TYPE }).select("id").single();
  if (prodErr) throw prodErr;
  bProductId = bProd!.id;

  const { data: bComp, error: compErr } = await svc.from("product_components")
    .insert({ org_id: orgBId, sku: B_SKU, name: "RLS Test Component B", category: "accessory", unit: "each", supplier_id: bSupplierId })
    .select("id").single();
  if (compErr) throw compErr;
  bComponentId = bComp!.id;

  const { data: bRule, error: ruleErr } = await svc.from("pricing_rules")
    .insert({ org_id: orgBId, component_id: bComponentId, tier_code: "tier1", price: 9.99, priority: 0, supplier_id: bSupplierId })
    .select("id").single();
  if (ruleErr) throw ruleErr;
  bPricingRuleId = bRule!.id;

  // Published price books for both orgs (via their suppliers)
  const { data: aBook, error: aBookErr } = await svc.from("price_books")
    .insert({ supplier_id: aSupplierId, name: A_PB_NAME, status: "published" }).select("id").single();
  if (aBookErr) throw aBookErr;
  aPriceBookId = aBook!.id;

  const { data: bBook, error: bBookErr } = await svc.from("price_books")
    .insert({ supplier_id: bSupplierId, name: B_PB_NAME, status: "published" }).select("id").single();
  if (bBookErr) throw bBookErr;
  bPriceBookId = bBook!.id;

  const { data: aItem } = await svc.from("price_book_items")
    .insert({ price_book_id: aPriceBookId, sku: "RLS-A", tier_code: "tier1", min_quantity: 1, price_cents: 100 })
    .select("id").single();
  aPriceBookItemId = aItem!.id;

  const { data: bItem } = await svc.from("price_book_items")
    .insert({ price_book_id: bPriceBookId, sku: "RLS-B", tier_code: "tier1", min_quantity: 1, price_cents: 999 })
    .select("id").single();
  bPriceBookItemId = bItem!.id;
}

async function clientFor(email: string, password: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return c;
}

Deno.test("RLS matrix — supplier/org isolation across catalogue + pricing", async (t) => {
  await setup();
  try {
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const userA = await clientFor("test@glass-outlet.com", "123456");
    const userB = await clientFor(B_USER_EMAIL, B_USER_PASSWORD);
    const admin = await clientFor("admin@glass-outlet.com", "123456");

    await t.step("anon reads NOTHING org-scoped", async () => {
      for (const table of ["products", "product_components", "pricing_rules", "price_books", "price_book_items", "product_rules"]) {
        assertEquals((await rows(anon, table)).length, 0, `anon should read 0 rows from ${table}`);
      }
    });

    await t.step("org-A user reads own org only; cannot read org-B pricing", async () => {
      // Sanity: org-A sees its own (large) catalogue, and every visible row is org-A's.
      const comps = await rows(userA, "product_components", "id,org_id");
      assert(comps.length > 0, "org-A user should see org-A components");
      assert(comps.every((r) => r.org_id === orgAId), "org-A user must see only org-A components");
      const prules = await rows(userA, "pricing_rules", "id,org_id");
      assert(prules.length > 0, "org-A user should see org-A pricing");
      assert(prules.every((r) => r.org_id === orgAId), "org-A user must see only org-A pricing");
      const prods = await rows(userA, "products", "id,org_id");
      assert(prods.every((r) => r.org_id === orgAId), "org-A user must see only org-A products");
      const rrules = await rows(userA, "product_rules", "id,org_id");
      assert(rrules.length > 0 && rrules.every((r) => r.org_id === orgAId), "org-A user must see only org-A product_rules");

      // Isolation (by-id, leak check): org-A must NOT read any org-B row.
      assert(!(await canRead(userA, "product_components", bComponentId)), "org-A user must NOT see org-B component");
      assert(!(await canRead(userA, "pricing_rules", bPricingRuleId)), "org-A user must NOT see org-B pricing rule");
      assert(!(await canRead(userA, "products", bProductId)), "org-A user must NOT see org-B product");
      assert(!(await canRead(userA, "price_books", bPriceBookId)), "org-A user must NOT see org-B price book");
      assert(!(await canRead(userA, "price_book_items", bPriceBookItemId)), "org-A user must NOT see org-B price book items");

      // Own price book IS visible (supplier→org linkage populated at seed time).
      assert(await canRead(userA, "price_books", aPriceBookId), "org-A user should see org-A price book");
      assert(await canRead(userA, "price_book_items", aPriceBookItemId), "org-A user should see org-A price book items");
    });

    await t.step("org-B user reads own org only; cannot read org-A pricing", async () => {
      const comps = await rows(userB, "product_components", "id,org_id");
      assert(comps.every((r) => r.org_id === orgBId), "org-B user must see only org-B components");
      const prules = await rows(userB, "pricing_rules", "id,org_id");
      assert(prules.every((r) => r.org_id === orgBId), "org-B user must NOT see any org-A pricing");
      const rrules = await rows(userB, "product_rules", "id,org_id");
      assertEquals(rrules.length, 0, "org-B user has no product_rules and must see none");

      // Own rows visible (by-id).
      assert(await canRead(userB, "product_components", bComponentId), "org-B user should see org-B component");
      assert(await canRead(userB, "pricing_rules", bPricingRuleId), "org-B user should see org-B pricing");
      assert(await canRead(userB, "price_books", bPriceBookId), "org-B user should see org-B price book");
      assert(await canRead(userB, "price_book_items", bPriceBookItemId), "org-B user should see own price book items");

      // Isolation (by-id, leak check): org-B must NOT read org-A price books.
      assert(!(await canRead(userB, "price_books", aPriceBookId)), "org-B user must NOT see org-A price book");
      assert(!(await canRead(userB, "price_book_items", aPriceBookItemId)), "org-B user must NOT see org-A price book items");
    });

    await t.step("admin can read across orgs (pricing_rules + product_components)", async () => {
      // By-id reads — admin's unfiltered catalogue exceeds the 1000-row page cap.
      assert(await canRead(admin, "product_components", bComponentId), "admin should see org-B component");
      assert(await canRead(admin, "pricing_rules", bPricingRuleId), "admin should see org-B pricing rule");
    });

    // ── Embed (brief 032) — anon reads ONLY embed-enabled orgs' safe metadata ──
    await t.step("anon embed access is scoped to embed-enabled orgs", async () => {
      // Enable embedding on org-A (glass-outlet — has seeded products/variables/
      // colours). org-B stays embed-disabled (default false).
      await svc.from("organisations").update({ embed_enabled: true }).eq("id", orgAId);

      const anonOrgRows = async (table: string, orgId: string): Promise<any[]> => {
        const { data, error } = await anon.from(table).select("id").eq("org_id", orgId);
        return error ? [] : (data ?? []);
      };

      // Anon CAN read the embed-enabled org's safe metadata...
      assert((await anonOrgRows("products", orgAId)).length > 0, "anon should read embed org products");
      assert((await anonOrgRows("product_variables", orgAId)).length > 0, "anon should read embed org product_variables");
      assert((await anonOrgRows("colour_options", orgAId)).length > 0, "anon should read embed org colour_options");

      // ...but NOTHING from the embed-disabled org.
      assertEquals((await anonOrgRows("products", orgBId)).length, 0, "anon must NOT read embed-disabled org products");
      assert(!(await canRead(anon, "products", bProductId)), "anon must NOT read embed-disabled org product by id");
      assertEquals((await anonOrgRows("product_variables", orgBId)).length, 0, "anon must NOT read embed-disabled product_variables");
      assertEquals((await anonOrgRows("colour_options", orgBId)).length, 0, "anon must NOT read embed-disabled colour_options");

      // Org branding: anon reads ONLY the embed-enabled org (column-restricted).
      const { data: orgARow } = await anon.from("organisations").select("id,slug,name,branding").eq("id", orgAId).maybeSingle();
      assert(orgARow, "anon should read embed org branding");
      const { data: orgBRow } = await anon.from("organisations").select("id,slug,name,branding").eq("id", orgBId).maybeSingle();
      assert(!orgBRow, "anon must NOT read embed-disabled org row");

      // Sensitive tables stay anon-denied EVEN for the embed-enabled org.
      for (
        const table of [
          "product_components", "pricing_rules", "price_books", "price_book_items",
          "product_rules", "product_component_selectors", "system_instances", "suppliers", "quotes",
          "embed_rate_limits",
        ]
      ) {
        assertEquals((await rows(anon, table)).length, 0, `anon must NOT read ${table} even with an org embed-enabled`);
      }

      await svc.from("organisations").update({ embed_enabled: false }).eq("id", orgAId);
    });
  } finally {
    await cleanup();
  }
});
