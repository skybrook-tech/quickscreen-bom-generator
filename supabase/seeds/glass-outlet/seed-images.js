// seed-images.js
//
// Uploads product images to Supabase Storage and updates products.image_url.
//
// Run after `supabase db reset`:
//   node supabase/seeds/glass-outlet/seed-images.js
//
// Reads VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: `.env.${process.env.NODE_ENV || "local"}` });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("Missing VITE_SUPABASE_URL");
if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, serviceRoleKey);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, "assets");
const BUCKET = "product-images";

// Maps image filename stem → products.system_type
const FILE_TO_SYSTEM_TYPE = {
  "quickscreen":             "QUICKSCREEN",
  "aluminium-balustrade":    "ALUMINIUM-BALUSTRADE",
  "colorbond":               "COLORBOND",
  "drainlab":                "DRAINLAB",
  "exterior":                "EXTERIOR",
  "fencing-and-breezewire":  "FENCING-BREEZEWIRE",
  "glass-balustrade":        "GLASS-BALUSTRADE",
  "glass":                   "GLASS",
  "glass-pool":              "GLASS-POOL",
  "glass-range":             "GLASS-RANGE",
  "glass-shower-screen":     "GLASS-SHOWER",
  "hamptons":                "HAMPTONS",
  "move-shutters":           "MOVE-SHUTTERS",
  // glass-outlet-logo.png is handled separately (uploaded to organisations.logo_url)
};

async function main() {
  // 1. Ensure the bucket exists (public so URLs work without auth)
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET);

  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
    });
    if (error) throw new Error(`Failed to create bucket: ${error.message}`);
    console.log(`Created bucket: ${BUCKET}`);
  } else {
    console.log(`Bucket already exists: ${BUCKET}`);
  }

  // 2. Get org id
  const { data: org } = await supabase
    .from("organisations")
    .select("id")
    .eq("slug", "glass-outlet")
    .single();

  if (!org) throw new Error("Org not found — run SQL seeds first");

  // 3. Upload org logo and update organisations.logo_url
  const logoFilename = "glass-outlet-logo.png";
  const logoBuffer = fs.readFileSync(path.join(ASSETS_DIR, logoFilename));

  const { error: logoUploadError } = await supabase.storage
    .from(BUCKET)
    .upload(logoFilename, logoBuffer, { contentType: "image/png", upsert: true });

  if (logoUploadError) {
    console.error(`  error uploading ${logoFilename}: ${logoUploadError.message}`);
  } else {
    const logoUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${logoFilename}`;
    const { error: logoUpdateError } = await supabase
      .from("organisations")
      .update({ logo_url: logoUrl })
      .eq("slug", "glass-outlet");

    if (logoUpdateError) {
      console.error(`  error updating org logo_url: ${logoUpdateError.message}`);
    } else {
      console.log(`  ok    ${logoFilename} → organisations.logo_url`);
    }
  }

  // 4. Upload each mapped image and update the product row
  const files = fs.readdirSync(ASSETS_DIR).filter((f) => f.endsWith(".png"));

  for (const filename of files) {
    const stem = path.basename(filename, ".png");
    const systemType = FILE_TO_SYSTEM_TYPE[stem];

    if (!systemType) {
      console.log(`  skip  ${filename} (no system_type mapping)`);
      continue;
    }

    const filePath = path.join(ASSETS_DIR, filename);
    const fileBuffer = fs.readFileSync(filePath);

    // Upload with upsert so re-runs are idempotent
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, fileBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error(`  error uploading ${filename}: ${uploadError.message}`);
      continue;
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filename}`;

    const { error: updateError } = await supabase
      .from("products")
      .update({ image_url: publicUrl })
      .eq("org_id", org.id)
      .eq("system_type", systemType)
      .is("parent_id", null);

    if (updateError) {
      console.error(`  error updating product ${systemType}: ${updateError.message}`);
      continue;
    }

    console.log(`  ok    ${filename} → ${systemType}`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
