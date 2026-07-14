// orgs.js — shared tenant-org loader.
//
// Reads each tenant org's identity + branding from supabase/seeds/<slug>/org.json.
// This is the single source of truth for the `organisations` rows (replacing the
// old organizations.sql). Consumed by tools/seed-orgs.js (upserts the rows) and
// seed-auth.js (which orgs to seed users for).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SEEDS_DIR = path.resolve(__dirname, "..");

// Directories under supabase/seeds/ that are not tenant orgs.
const NON_ORG_DIRS = new Set(["schemas", "tools", "node_modules"]);

function validateOrgDef(def, file) {
  const problems = [];
  if (!def || typeof def !== "object") problems.push("not an object");
  if (!def?.name) problems.push("missing 'name'");
  if (!def?.slug) problems.push("missing 'slug'");
  if (!def?.branding?.cssVars) problems.push("missing 'branding.cssVars'");
  if (!def?.branding?.branding) problems.push("missing 'branding.branding' (title/subtitle/…)");
  if (problems.length) {
    throw new Error(`Invalid org file ${file}: ${problems.join(", ")}`);
  }
}

/**
 * Discover and load every <slug>/org.json under supabase/seeds/.
 * Fails loud if a file's `slug` doesn't match its directory name (a copy-paste
 * guard, same posture as the product seeder's org_slug↔dir check).
 * @returns {Array<{ slug, name, branding, dir, file }>}
 */
export function loadOrgDefs() {
  const dirs = fs
    .readdirSync(SEEDS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !NON_ORG_DIRS.has(d.name));

  const defs = [];
  for (const d of dirs) {
    const file = path.join(SEEDS_DIR, d.name, "org.json");
    if (!fs.existsSync(file)) continue; // dir without an org.json isn't a tenant org
    const def = JSON.parse(fs.readFileSync(file, "utf8"));
    validateOrgDef(def, file);
    if (def.slug !== d.name) {
      throw new Error(
        `Org slug mismatch: ${file} has slug "${def.slug}" but lives in directory "${d.name}" — they must match.`,
      );
    }
    defs.push({ slug: def.slug, name: def.name, branding: def.branding, dir: d.name, file });
  }
  return defs;
}
