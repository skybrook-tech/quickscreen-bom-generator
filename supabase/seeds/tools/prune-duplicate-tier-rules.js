// prune-duplicate-tier-rules.js
//
// One-off cleanup for databases seeded BEFORE the 2026-07 pricing-rules slim
// (docs/tasks.md): seeds used to triplicate every rule across tier1/2/3 with
// identical prices. Seeds now store tier1 + sparse tier2/3 overrides, and the
// engine overlays tiers at price time — but a plain re-seed only upserts, it
// never deletes, so pre-slim DBs keep the redundant tier2/3 rows forever.
//
// This deletes ACTIVE tier2/tier3 rules whose (component_id, rule, priority,
// price) exactly matches an active tier1 row — i.e. pure duplicates. Rows with
// a DIFFERENT price (real tier overrides, incl. anything a customer edited
// live) are never touched.
//
// Usage:
//   node supabase/seeds/tools/prune-duplicate-tier-rules.js            # dry run
//   node supabase/seeds/tools/prune-duplicate-tier-rules.js --apply    # delete
//   NODE_ENV=production node ... --apply                               # remote

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: `.env.${process.env.NODE_ENV || "local"}`, override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) throw new Error("Missing VITE_SUPABASE_URL");
if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const APPLY = process.argv.includes("--apply");

async function fetchAllActiveRules() {
  const all = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("pricing_rules")
      .select("id, org_id, component_id, tier_code, rule, priority, price")
      .eq("active", true)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetch: ${error.message}`);
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

async function main() {
  const rules = await fetchAllActiveRules();
  console.log(`active pricing_rules: ${rules.length}`);

  const key = (r) => `${r.org_id}|${r.component_id}|${r.rule ?? "flat"}|${r.priority ?? 0}`;
  const tier1Price = new Map();
  for (const r of rules) if (r.tier_code === "tier1") tier1Price.set(key(r), r.price);

  const dupes = rules.filter(
    (r) => r.tier_code !== "tier1" && tier1Price.has(key(r)) && r.price === tier1Price.get(key(r)),
  );
  const kept = rules.filter((r) => r.tier_code !== "tier1").length - dupes.length;
  console.log(`tier2/3 exact duplicates of tier1: ${dupes.length} (real overrides kept: ${kept})`);

  if (!dupes.length) return console.log("Nothing to prune.");
  if (!APPLY) return console.log("Dry run — re-run with --apply to delete them.");

  const CHUNK = 200;
  for (let i = 0; i < dupes.length; i += CHUNK) {
    const ids = dupes.slice(i, i + CHUNK).map((r) => r.id);
    const { error } = await supabase.from("pricing_rules").delete().in("id", ids);
    if (error) throw new Error(`delete: ${error.message}`);
  }
  console.log(`Deleted ${dupes.length} duplicate rows.`);
}

main().catch((e) => {
  console.error("\nPRUNE FAILED:", e.message);
  process.exit(1);
});
