import { readFileSync, writeFileSync } from 'node:fs';
import Papa from 'papaparse';

const csvPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/_briefs/amazing-fencing-handoff/seed-data/brief_047_seed_timber_colorbond.csv';
const csvContent = readFileSync(csvPath, 'utf8');
const csvData = Papa.parse(csvContent, { header: true, skipEmptyLines: true }).data;

const jsonPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/supabase/seeds/amazing-fencing/products/price_catalogue.json';
const catalog = JSON.parse(readFileSync(jsonPath, 'utf8'));
const pcList = catalog.product_components;

const descToSku = new Map();
const nameToSku = new Map();
const pcMap = new Map();

for (const pc of pcList) {
  if (pc.sku) {
    descToSku.set(pc.description.trim().toLowerCase(), pc.sku);
    nameToSku.set(pc.name.trim().toLowerCase(), pc.sku);
    pcMap.set(pc.sku, pc);
  }
}

// Map the 620 rows to unique SKUs
const resolvedItems = [];
for (const row of csvData) {
  let sku = row.supplier_sku?.trim();
  
  if (!sku) {
    const desc = row.description?.trim().toLowerCase();
    const name = row.canonical_name?.trim().toLowerCase();
    let catalogSku = descToSku.get(desc) || nameToSku.get(name);
    if (catalogSku) {
      sku = catalogSku;
    } else if (row.canonical_name === '100x100 Treated Pine Post 3000mm') {
      sku = 'AF-POST-PINE-100x100-3000';
    }
  }

  // Handle HP100x100 post sku based on length
  if (sku === 'HP100x100') {
    const length = row.length_mm?.trim();
    if (length === '1800') sku = 'AF-POST-HWD-100x100-1800';
    else if (length === '2100') sku = 'AF-POST-HWD-100x100-2100';
    else if (length === '2400') sku = 'AF-POST-HWD-100x100-2400';
    else if (length === '2700') sku = 'AF-POST-HWD-100x100-2700';
  }

  // Handle Trimclad Jasper 1790mm infill sheet typo
  if (sku === 'FZSJA17' && row.description?.includes('Trimclad')) {
    sku = 'FNSJA18';
  }

  resolvedItems.push({ ...row, sku });
}

// Find missing components for the 122 components we need to insert
const existingSkusInDb = new Set();
// We will insert all 122 components we found missing earlier
// Let's get the list of unique missing SKUs
const missingFromDb = [];
const seenMissingSku = new Set();

// Hardcoded existing DB SKUs based on our earlier check
// We know that out of 620, only 122 are missing. We will load the actual list of SKUs from database to be absolutely correct.
// Since we want this script to be self-contained and run offline if needed, we can query Supabase here.
// Let's write the query to get all existing SKUs in the DB.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function generate() {
  const orgSlug = 'amazing-fencing';
  const { data: org } = await supabase.from('organisations').select('id').eq('slug', orgSlug).single();
  const orgId = org.id;

  const { data: dbComps } = await supabase
    .from('product_components')
    .select('sku')
    .eq('org_id', orgId);

  const dbSkuSet = new Set(dbComps.map(c => c.sku));

  for (const item of resolvedItems) {
    if (!dbSkuSet.has(item.sku)) {
      if (!seenMissingSku.has(item.sku)) {
        seenMissingSku.add(item.sku);
        missingFromDb.push(item);
      }
    }
  }

  let sql = `-- ============================================================================
-- 057_amazing_fencing_pricebook_v2.sql
--
-- Adds the Colorbond tier-2 price book + timber paling fixes (v2, Fence-Forge-ratified)
-- and updates the pricing view to pull from price_book_items.
-- ============================================================================

-- 1. Recreate the pricing_rules_with_sku view to union price_book_items
DROP VIEW IF EXISTS public.pricing_rules_with_sku;

CREATE VIEW public.pricing_rules_with_sku AS
SELECT
  pr.id,
  pr.org_id,
  pr.supplier_id,
  pr.system_instance_id,
  pr.component_id,
  pc.sku,
  pr.tier_code,
  pr.rule,
  pr.price,
  pr.priority,
  pr.valid_from,
  pr.valid_to,
  pr.active,
  pr.updated_at,
  COALESCE(pr.canonical_code, pc.canonical_code) AS canonical_code
FROM public.pricing_rules pr
JOIN public.product_components pc ON pc.id = pr.component_id

UNION ALL

SELECT
  pbi.id,
  s.org_id,
  pb.supplier_id,
  NULL::uuid AS system_instance_id,
  pc.id AS component_id,
  pbi.sku,
  pbi.tier_code,
  CASE WHEN pbi.min_quantity = 1 THEN NULL ELSE 'qty >= ' || pbi.min_quantity END AS rule,
  pbi.price_cents::numeric / 100.0 AS price,
  pbi.min_quantity AS priority,
  pb.effective_from AS valid_from,
  pb.effective_to AS valid_to,
  (pb.status = 'published') AS active,
  pbi.created_at AS updated_at,
  pc.canonical_code AS canonical_code
FROM public.price_book_items pbi
JOIN public.price_books pb ON pb.id = pbi.price_book_id
JOIN public.suppliers s ON s.id = pb.supplier_id
LEFT JOIN public.product_components pc ON pc.sku = pbi.sku AND pc.org_id = s.org_id;

-- Revoke all direct public access
REVOKE ALL ON public.pricing_rules_with_sku FROM anon, authenticated;

-- 2. Expire the old v1 price book
UPDATE public.price_books
SET effective_to = '2026-06-01'::timestamptz
WHERE supplier_id = (SELECT id FROM public.suppliers WHERE slug = 'amazing-fencing')
  AND status = 'published'
  AND effective_to IS NULL;

-- 3. Create the new v2 price book
INSERT INTO public.price_books (id, supplier_id, name, source_file, status, effective_from, metadata)
VALUES (
  'b67d5ba0-be44-4861-ad81-b51f15802a46',
  (SELECT id FROM public.suppliers WHERE slug = 'amazing-fencing'),
  'Amazing Fencing 2026-06 Trade Pricing (Cin7 timber + Colorbond v2)',
  'brief_047_seed_timber_colorbond.csv',
  'published',
  '2026-06-01'::timestamptz,
  jsonb_build_object(
    'basis', 'trade',
    'currency', 'AUD',
    'tax_inclusive', false,
    'pricing_source', 'Cin7 mass-download v2',
    'tier_code', 'tier2',
    'covers', jsonb_build_array('amazing-timber-paling', 'amazing-colorbond'),
    'pending', jsonb_build_array('amazing-permasteel', 'amazing-timber-slat-screen', 'amazing-chainwire-security')
  )
)
ON CONFLICT (id) DO NOTHING;

-- 4. Add missing product components for Amazing Fencing
WITH af_org AS (SELECT id FROM public.organisations WHERE slug = 'amazing-fencing')
INSERT INTO public.product_components (org_id, sku, name, description, category, unit, default_price, system_types, active, metadata, canonical_code)
VALUES
`;

  const valuesSqls = [];
  for (const row of missingFromDb) {
    const sku = row.sku;
    const name = row.canonical_name.trim();
    const desc = row.description ? row.description.trim() : name;
    const csvCategory = row.category ? row.category.trim() : '';
    const csvSystem = row.system ? row.system.trim().toLowerCase() : '';
    
    let systemTypes = "ARRAY['AF_COLORBOND']";
    if (csvSystem === 'timber') {
      systemTypes = "ARRAY['AF_TIMBER_PALING']";
    }

    let category = 'accessory';
    if (csvCategory === 'Post') {
      category = 'post';
    } else if (csvCategory === 'Rail') {
      category = 'rail';
    } else if (csvCategory === 'Paling') {
      category = 'paling';
    } else if (csvCategory === 'Sleeper') {
      category = 'sleeper';
    } else if (csvCategory === 'Nails' || csvCategory === 'Screw') {
      category = 'screw';
    } else if (csvCategory === 'Bagged Concrete') {
      category = 'fixing';
    } else if (csvCategory === 'Infill Sheet') {
      category = 'sheet';
    } else if (csvCategory === 'Post Cap' || csvCategory === 'Coloured Cap') {
      category = 'cap';
    } else if (csvCategory === 'Gate' || csvCategory === 'Gate Style' || csvCategory === 'Double gate' || csvCategory === 'Single gate') {
      category = 'gate';
    } else if (csvCategory === 'Hinge Accessory' || csvCategory === 'Latch Accessory' || csvCategory === 'Gate Accessory') {
      category = 'hardware';
    }

    let unit = 'each';
    if (category === 'fixing' && name.toLowerCase().includes('concrete')) {
      unit = 'bag';
    } else if (category === 'screw' && (name.toLowerCase().includes('nail') || name.toLowerCase().includes('screw'))) {
      unit = 'pack';
    } else if (category === 'rail' || category === 'sleeper') {
      unit = 'length';
    }

    const defaultPrice = row.tier2_ex_gst ? parseFloat(row.tier2_ex_gst) : 'NULL';
    
    const catalogItem = pcMap.get(sku);
    let metadata = {};
    if (catalogItem && catalogItem.metadata) {
      metadata = {
        ...catalogItem.metadata,
        length_mm: row.length_mm ? parseInt(row.length_mm) : catalogItem.metadata.length_mm || null,
        size: row.size ? row.size.trim() : catalogItem.metadata.size || null,
        colour: row.colour ? row.colour.trim() : catalogItem.metadata.colour || null,
        brand: row.brand ? row.brand.trim() : catalogItem.metadata.brand || null,
        style: row.style ? row.style.trim() : catalogItem.metadata.style || null,
      };
    } else {
      metadata = {
        length_mm: row.length_mm ? parseInt(row.length_mm) : null,
        size: row.size ? row.size.trim() : null,
        colour: row.colour ? row.colour.trim() : null,
        brand: row.brand ? row.brand.trim() : null,
        style: row.style ? row.style.trim() : null,
      };
    }

    Object.keys(metadata).forEach(key => metadata[key] === null && delete metadata[key]);

    const escapedName = name.replace(/'/g, "''");
    const escapedDesc = desc.replace(/'/g, "''");
    const canonicalCode = name;

    valuesSqls.push(`  ((SELECT id FROM af_org), '${sku}', '${escapedName}', '${escapedDesc}', '${category}', '${unit}', ${defaultPrice}, ${systemTypes}, true, '${JSON.stringify(metadata)}'::jsonb, '${canonicalCode.replace(/'/g, "''")}')`);
  }

  sql += valuesSqls.join(',\n') + `
ON CONFLICT (org_id, sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  default_price = EXCLUDED.default_price,
  system_types = EXCLUDED.system_types,
  metadata = EXCLUDED.metadata,
  canonical_code = EXCLUDED.canonical_code;

-- 5. Insert price book items
INSERT INTO public.price_book_items (price_book_id, sku, tier_code, min_quantity, price_cents, currency, metadata)
VALUES
`;

  const itemSqls = [];
  const concreteSkus = new Set(['DMR3056LD', 'DMPM3056LD', 'CG2CD']);

  for (const row of resolvedItems) {
    const sku = row.sku;
    const priceCents = Math.round(parseFloat(row.tier2_ex_gst) * 100);
    const isConcrete = concreteSkus.has(sku);
    const itemMetadata = isConcrete ? '{"concrete_bag_size_scaling_pending": true}' : '{}';
    itemSqls.push(`  ('b67d5ba0-be44-4861-ad81-b51f15802a46', '${sku}', 'tier2', 1, ${priceCents}, 'AUD', '${itemMetadata}'::jsonb)`);
  }

  sql += itemSqls.join(',\n') + `
ON CONFLICT (price_book_id, sku, tier_code, min_quantity) DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  metadata = EXCLUDED.metadata;

-- 6. Update Amazing Fencing system instances concrete configuration to 30kg
UPDATE public.system_instances
SET metadata = jsonb_set(metadata, '{config,concrete_bag_size_kg}', '30'::jsonb, true)
WHERE slug IN ('amazing-timber-paling', 'amazing-colorbond');

-- Sanity log
DO $$ DECLARE v_book UUID; v_items INT;
BEGIN
  SELECT pb.id INTO v_book FROM public.price_books pb
    JOIN public.suppliers s ON s.id = pb.supplier_id
   WHERE s.slug = 'amazing-fencing' AND pb.status = 'published' AND pb.effective_to IS NULL;
  IF v_book IS NULL THEN
    RAISE EXCEPTION 'Amazing Fencing trade price book v2 not active';
  END IF;
  SELECT COUNT(*) INTO v_items FROM public.price_book_items WHERE price_book_id = v_book;
  RAISE NOTICE 'Amazing Fencing trade price book v2: % items at tier2', v_items;
END $$;
`;

  writeFileSync('supabase/migrations/057_amazing_fencing_pricebook_v2.sql', sql);
  console.log(`Generated migration 057 successfully.`);
}

generate().catch(console.error);
