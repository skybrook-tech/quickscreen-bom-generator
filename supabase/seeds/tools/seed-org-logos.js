// seed-org-logos.js
//
// Org-agnostic logo seeder. For every tenant org directory under
// supabase/seeds/<slug>/ that contains an `assets/logo.<ext>` file, uploads the
// logo to the `product-images` storage bucket under an ORG-PREFIXED key
// (`logos/<slug>.<ext>` — avoids the flat-filename collisions seed-images.js
// warns about) and sets `organisations.logo_url` to its public URL.
//
// Orgs with no logo asset are left with logo_url = NULL — the app renders a
// generic initials badge for them (src/components/brand/BrandLogo.tsx).
//
// This owns organisations.logo_url; the GO-only seed-images.js no longer does.
//
// Usage:
//   node supabase/seeds/tools/seed-org-logos.js                # all orgs
//   node supabase/seeds/tools/seed-org-logos.js --org <slug>   # one org
//
// Reads VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
// (or .env.<NODE_ENV>).

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: `.env.${process.env.NODE_ENV || "local"}`, override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("Missing VITE_SUPABASE_URL");
if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, serviceRoleKey);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = path.resolve(__dirname, "..");
const BUCKET = "product-images";

// Non-org directories under supabase/seeds/.
const NON_ORG_DIRS = new Set(["schemas", "tools", "node_modules"]);

const CONTENT_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function parseArgs(argv) {
  const args = { org: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--org") args.org = argv[++i] ?? null;
  }
  return args;
}

// Find each org dir's logo asset: supabase/seeds/<slug>/assets/logo.<ext>.
function discoverOrgLogos() {
  return fs
    .readdirSync(SEEDS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !NON_ORG_DIRS.has(d.name))
    .map((d) => {
      const assetsDir = path.join(SEEDS_DIR, d.name, "assets");
      if (!fs.existsSync(assetsDir)) return null;
      const logoFile = fs
        .readdirSync(assetsDir)
        .find((f) => /^logo\.(png|jpg|jpeg|webp|svg)$/i.test(f));
      if (!logoFile) return null;
      return { slug: d.name, filePath: path.join(assetsDir, logoFile), ext: path.extname(logoFile).toLowerCase() };
    })
    .filter(Boolean);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // 1. Ensure the (public) bucket exists.
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`Failed to create bucket: ${error.message}`);
    console.log(`Created bucket: ${BUCKET}`);
  }

  let logos = discoverOrgLogos();
  if (args.org) {
    logos = logos.filter((l) => l.slug === args.org);
    if (logos.length === 0) {
      console.log(
        `No assets/logo.* found for org "${args.org}" — nothing to upload (it will render an initials badge).`,
      );
      return;
    }
  }

  if (logos.length === 0) {
    console.log("No org logo assets found. Orgs will render initials badges.");
    return;
  }

  for (const { slug, filePath, ext } of logos) {
    // Fail loud: an asset with no matching org row is almost certainly a mistake.
    const { data: org, error: orgError } = await supabase
      .from("organisations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (orgError) throw new Error(`Failed to look up org "${slug}": ${orgError.message}`);
    if (!org) {
      throw new Error(
        `Found ${path.basename(filePath)} for "${slug}" but no organisations row with that slug — seed the org first (organizations.sql).`,
      );
    }

    const key = `logos/${slug}${ext}`;
    const buffer = fs.readFileSync(filePath);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(key, buffer, { contentType: CONTENT_TYPES[ext] ?? "application/octet-stream", upsert: true });
    if (uploadError) throw new Error(`Upload failed for ${slug}: ${uploadError.message}`);

    // Cache-bust: the storage key is stable across re-seeds, so browsers/CDN would
    // keep serving a stale logo after a swap. A content-hash query string changes
    // the URL only when the bytes change, forcing a refetch while staying cached
    // between identical seeds. (Storage ignores the query param on public objects.)
    const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 10);
    const logoUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${key}?v=${hash}`;
    const { error: updateError } = await supabase
      .from("organisations")
      .update({ logo_url: logoUrl })
      .eq("id", org.id);
    if (updateError) throw new Error(`Failed to set logo_url for ${slug}: ${updateError.message}`);

    console.log(`  ok    ${slug} → ${key}`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
