// seed-products.js
//
// Loads every product file under supabase/seeds/glass-outlet/products/*.json,
// validates each against supabase/seeds/schemas/product-file.schema.json,
// resolves business-key FKs via on-the-fly lookups against Postgres, and
// upserts every section in dependency order via @supabase/supabase-js.
//
// LIVE sections only: products, product_components, pricing_rules.
// The static engine (bom-calculator-static) reads these from the DB; all
// calculation rules live in code+config under
// supabase/functions/bom-calculator-static/config/.
//
// The Node client uses the service role key, which bypasses RLS.
//
// Usage: node supabase/seeds/tools/seed-products.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'local'}`, override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('Missing VITE_SUPABASE_URL');
if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

console.log('VITE_SUPABASE_URL', supabaseUrl);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PRODUCTS_DIR = resolve(ROOT, 'glass-outlet', 'products');
const SCHEMA_DIR = resolve(ROOT, 'schemas');

// ── Load + compile schemas ──────────────────────────────────────────────────

function loadSchema(name) {
  return JSON.parse(readFileSync(resolve(SCHEMA_DIR, `${name}.schema.json`), 'utf8'));
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Register all per-table schemas so $refs in product-file.schema.json resolve
const PER_TABLE_SCHEMAS = ['products', 'product_components', 'pricing_rules'];
for (const name of PER_TABLE_SCHEMAS) {
  ajv.addSchema(loadSchema(name));
}
const validateFile = ajv.compile(loadSchema('product-file'));

// ── ID resolvers (cached per run) ───────────────────────────────────────────

const cache = {
  orgIdBySlug: new Map(),
  componentIdBySku: new Map(), // key: `${orgId}|${sku}` → id
};

async function resolveOrgId(slug) {
  if (cache.orgIdBySlug.has(slug)) return cache.orgIdBySlug.get(slug);
  const { data, error } = await supabase
    .from('organisations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`resolveOrgId(${slug}): ${error.message}`);
  if (!data) throw new Error(`org not found: ${slug}`);
  cache.orgIdBySlug.set(slug, data.id);
  return data.id;
}

async function resolveComponentId(orgId, sku) {
  const key = `${orgId}|${sku}`;
  if (cache.componentIdBySku.has(key)) return cache.componentIdBySku.get(key);
  const { data, error } = await supabase
    .from('product_components')
    .select('id')
    .eq('org_id', orgId)
    .eq('sku', sku)
    .maybeSingle();
  if (error) throw new Error(`resolveComponentId(${sku}): ${error.message}`);
  if (!data) throw new Error(`product_component not found: sku=${sku}`);
  cache.componentIdBySku.set(key, data.id);
  return data.id;
}

function invalidateComponentCache() {
  cache.componentIdBySku.clear();
}

// ── Per-section upserters ───────────────────────────────────────────────────

async function upsertProducts(orgId, rows) {
  if (!rows?.length) return;
  // Flat model (post-migration 022): every product is top-level, keyed by
  // (org_id, system_type). supabase-js upsert with onConflict works directly.
  const toUpsert = rows.map((r) => ({
    org_id: orgId,
    parent_id: null,
    system_type: r.system_type,
    product_type: r.product_type ?? 'fence',
    compatible_with_system_types: r.compatible_with_system_types ?? [],
    name: r.name,
    description: r.description ?? null,
    active: r.active,
    sort_order: r.sort_order ?? 0,
    metadata: r.metadata ?? {},
  }));
  const { error } = await supabase
    .from('products')
    .upsert(toUpsert, { onConflict: 'org_id,system_type', ignoreDuplicates: false });
  if (error) throw new Error(`products: ${error.message}`);
  console.log(`  products: ${toUpsert.length} upserted`);
}

async function upsertProductComponents(orgId, rows) {
  if (!rows?.length) return;
  const toUpsert = rows.map((r) => ({
    org_id: orgId,
    sku: r.sku,
    name: r.name,
    description: r.description ?? null,
    category: r.category,
    unit: r.unit,
    default_price: r.default_price ?? null,
    internal_sku: r.internal_sku ?? null,
    system_types: r.system_types ?? ['QSHS'],
    metadata: {
      ...(r.metadata ?? {}),
      ...(r.subCategory ? { subCategory: r.subCategory } : {}),
      ...(r.companionOf ? { companionOf: r.companionOf } : {}),
      ...(Number.isFinite(r.sortPriority) ? { sortPriority: r.sortPriority } : {}),
      ...(r.isOptionalAccessory === true ? { isOptionalAccessory: true } : {}),
      ...(Array.isArray(r.optionalChildOf) ? { optionalChildOf: r.optionalChildOf } : {}),
      ...(Number.isFinite(r.qtyPerParent) ? { qtyPerParent: r.qtyPerParent } : {}),
      ...(r.qtyFormula !== undefined ? { qtyFormula: r.qtyFormula } : {}),
    },
    active: r.active,
  }));
  const { error } = await supabase
    .from('product_components')
    .upsert(toUpsert, { onConflict: 'org_id,sku', ignoreDuplicates: false });
  if (error) throw new Error(`product_components: ${error.message}`);
  invalidateComponentCache();
  console.log(`  product_components: ${toUpsert.length} upserted`);
}

async function upsertPricingRules(orgId, rows) {
  if (!rows?.length) return;
  // pricing_rules' unique index is partial (WHERE active = true), so
  // supabase-js .upsert() with onConflict can't target it. Use check-then-insert/update.
  let inserted = 0;
  let updated = 0;
  for (const r of rows) {
    const componentId = await resolveComponentId(orgId, r.sku);
    const row = {
      org_id: orgId,
      component_id: componentId,
      tier_code: r.tier_code,
      rule: r.rule ?? null,
      price: r.price,
      priority: r.priority ?? 0,
      valid_from: r.valid_from ?? null,
      valid_to: r.valid_to ?? null,
      notes: r.notes ?? null,
      active: r.active,
    };
    const { data: existing, error: lookupErr } = await supabase
      .from('pricing_rules')
      .select('id')
      .eq('component_id', componentId)
      .eq('tier_code', r.tier_code)
      .eq('priority', r.priority ?? 0)
      .eq('active', true)
      .maybeSingle();
    if (lookupErr) throw new Error(`pricing_rules lookup (${r.sku} ${r.tier_code}): ${lookupErr.message}`);
    if (existing) {
      const { error } = await supabase.from('pricing_rules').update(row).eq('id', existing.id);
      if (error) throw new Error(`pricing_rules update (${r.sku} ${r.tier_code}): ${error.message}`);
      updated++;
    } else {
      const { error } = await supabase.from('pricing_rules').insert(row);
      if (error) throw new Error(`pricing_rules insert (${r.sku} ${r.tier_code}): ${error.message}`);
      inserted++;
    }
  }
  console.log(`  pricing_rules: ${inserted} inserted, ${updated} updated`);
}

// ── Main per-file loader ────────────────────────────────────────────────────

async function loadFile(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (!validateFile(raw)) {
    const errs = validateFile.errors
      .map((e) => `  ${e.instancePath} ${e.message}`)
      .join('\n');
    throw new Error(`${basename(path)} failed schema validation:\n${errs}`);
  }
  const orgId = await resolveOrgId(raw.org_slug);
  console.log(`${basename(path)} (org=${raw.org_slug}):`);

  // dependency order
  await upsertProducts(orgId, raw.products);
  await upsertProductComponents(orgId, raw.product_components);
  await upsertPricingRules(orgId, raw.pricing_rules);
}

// ── Post-load row-count floors ──────────────────────────────────────────────

// [table, minRows, filterByActive] — sanity floors to catch a catastrophically
// failed seed, not exact counts.
const ROW_COUNT_FLOORS = [
  ['products', 6, true],
  ['product_components', 300, true],
  ['pricing_rules', 1000, true],
];

async function verifyRowCounts() {
  console.log('Verifying row-count floors:');
  const errors = [];
  for (const [table, floor, filterActive] of ROW_COUNT_FLOORS) {
    let query = supabase.from(table).select('*', { count: 'exact', head: true });
    if (filterActive) query = query.eq('active', true);
    const { count, error } = await query;
    if (error) {
      errors.push(`  ${table}: query error — ${error.message}`);
      continue;
    }
    if (count < floor) {
      errors.push(`  ${table}: ${count} < ${floor} expected`);
    } else {
      console.log(`  ${table}: ${count} ✓`);
    }
  }
  if (errors.length) {
    throw new Error('Row-count verification failed:\n' + errors.join('\n'));
  }
  console.log('All floors met.');
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const files = readdirSync(PRODUCTS_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort()
    .map((f) => resolve(PRODUCTS_DIR, f));

  if (files.length === 0) {
    console.log(`No product files found in ${PRODUCTS_DIR}`);
    return;
  }

  console.log(`Found ${files.length} product file(s): ${files.map((p) => basename(p)).join(', ')}`);

  for (const path of files) {
    await loadFile(path);
  }

  await verifyRowCounts();
  console.log('\nSeed products done.');
}

main().catch((e) => {
  console.error('\nSEED FAILED:', e.message);
  process.exit(1);
});
