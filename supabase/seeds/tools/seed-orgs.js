// seed-orgs.js
//
// Upserts the `organisations` rows (name, slug, branding) from each
// supabase/seeds/<slug>/org.json. Replaces the old organizations.sql — a
// service-role upsert that works identically local and remote (no manual psql),
// and never clobbers live-edited branding.
//
// Ownership posture (mirrors the product seeder's managed_by guard):
//   • org missing  → INSERT with branding.
//   • org exists   → leave branding ALONE (preserve live edits); only --force
//                    overwrites name + branding from org.json.
// On a fresh `db reset` the table is empty, so branding always applies locally;
// on a remote re-run, live branding survives unless you pass --force.
//
// Usage:
//   node supabase/seeds/tools/seed-orgs.js                     # all orgs
//   node supabase/seeds/tools/seed-orgs.js --org <slug>        # one org
//   node supabase/seeds/tools/seed-orgs.js --force             # overwrite branding
//
// Reads VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
// (or .env.<NODE_ENV>).

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { loadOrgDefs } from "./orgs.js";

dotenv.config({ path: `.env.${process.env.NODE_ENV || "local"}`, override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) throw new Error("Missing VITE_SUPABASE_URL");
if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, serviceRoleKey);

function parseArgs(argv) {
  const args = { org: null, force: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--org") args.org = argv[++i] ?? null;
    else if (argv[i] === "--force") args.force = true;
    else throw new Error(`Unknown argument: ${argv[i]} (supported: --org <slug>, --force)`);
  }
  return args;
}

async function upsertOrg(def, force) {
  const { data: existing, error } = await supabase
    .from("organisations")
    .select("id")
    .eq("slug", def.slug)
    .maybeSingle();
  if (error) throw new Error(`org lookup (${def.slug}): ${error.message}`);

  if (!existing) {
    const { error: insertError } = await supabase
      .from("organisations")
      .insert({ name: def.name, slug: def.slug, branding: def.branding });
    if (insertError) throw new Error(`org insert (${def.slug}): ${insertError.message}`);
    console.log(`  created  ${def.slug}`);
    return;
  }

  if (!force) {
    console.log(`  skip     ${def.slug} (exists — preserving live branding; --force to overwrite)`);
    return;
  }

  const { error: updateError } = await supabase
    .from("organisations")
    .update({ name: def.name, branding: def.branding })
    .eq("id", existing.id);
  if (updateError) throw new Error(`org update (${def.slug}): ${updateError.message}`);
  console.log(`  forced   ${def.slug} (name + branding overwritten)`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let defs = loadOrgDefs();
  if (args.org) {
    defs = defs.filter((d) => d.slug === args.org);
    if (defs.length === 0) {
      throw new Error(
        `No org.json found for "${args.org}". Available: ${loadOrgDefs().map((d) => d.slug).join(", ") || "(none)"}`,
      );
    }
  }
  if (defs.length === 0) throw new Error("No org.json files found under supabase/seeds/<slug>/.");

  for (const def of defs) await upsertOrg(def, args.force);
  console.log("\nSeed orgs done.");
}

main().catch((e) => {
  console.error("\nSEED ORGS FAILED:", e.message);
  process.exit(1);
});
