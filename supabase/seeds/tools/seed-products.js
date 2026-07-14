// seed-products.js
//
// Loads every product file under supabase/seeds/<org-slug>/products/*.json
// (one directory per tenant org, e.g. glass-outlet/, amazing-fencing/),
// validates each against supabase/seeds/schemas/product-file.schema.json,
// resolves business-key FKs via on-the-fly lookups against Postgres, and
// upserts every section in dependency order via @supabase/supabase-js.
//
// LIVE sections: products, product_components, pricing_rules, and
// calculator_configs (per-org sparse CalculatorConfig overlay patches written
// to supplier_product_calculator_configs — deep-merged over BASE_CONFIGS by
// the edge functions at request time).
// The static engine (bom-calculator-static) reads these from the DB; all
// calculation rules live in code+config under
// supabase/functions/bom-calculator-static/config/.
//
// The Node client uses the service role key, which bypasses RLS.
//
// Usage:
//   node supabase/seeds/tools/seed-products.js                       # all orgs
//   node supabase/seeds/tools/seed-products.js --org amazing-fencing # one org
//   node supabase/seeds/tools/seed-products.js --org acme --force    # override ui-edited rows
//
// (via npm: `npm run seed:products -- --org amazing-fencing`)
//
// DATA OWNERSHIP (see supabase/seeds/README.md): every component row this
// script writes is stamped `metadata.managed_by: "seed"`. Rows later edited
// through the app (a price upload / admin edit) must be flipped to
// `managed_by: "ui"` by that surface — the seeder REFUSES to overwrite those
// rows (and their pricing_rules) unless --force is passed, so re-running seeds
// can never silently roll back a customer's live price changes.

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
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

// ── CLI flags ───────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { org: null, force: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--org') {
      args.org = argv[++i];
      if (!args.org) throw new Error('--org requires a slug (e.g. --org amazing-fencing)');
    } else if (argv[i] === '--force') {
      args.force = true;
    } else {
      throw new Error(`Unknown argument: ${argv[i]} (supported: --org <slug>, --force)`);
    }
  }
  return args;
}

const ARGS = parseArgs(process.argv.slice(2));

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SCHEMA_DIR = resolve(ROOT, 'schemas');

// Every directory under supabase/seeds/ that contains a products/ subdir is an
// org seed dir; its name must equal the org's slug (cross-checked against each
// file's org_slug in loadFile so a copy-pasted org_slug can't silently seed one
// org's SKUs into another).
function discoverOrgProductDirs() {
  return readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(resolve(ROOT, d.name, 'products')))
    .map((d) => ({ orgSlug: d.name, dir: resolve(ROOT, d.name, 'products') }));
}

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

// ── managed_by ownership guard ──────────────────────────────────────────────
// Ownership is tracked per SKU on product_components.metadata.managed_by and
// covers both the component row (default_price) and its pricing_rules.
// "seed" (or absent, for pre-guard rows) = git seed files own it.
// "ui"   = it was edited in the app; the seeder must not clobber it.

async function fetchManagedBySku(orgId, skus) {
  const managed = new Map(); // sku → managed_by value
  const CHUNK = 200; // keep PostgREST in() URLs well under length limits
  for (let i = 0; i < skus.length; i += CHUNK) {
    const chunk = skus.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('product_components')
      .select('sku, metadata')
      .eq('org_id', orgId)
      .in('sku', chunk);
    if (error) throw new Error(`managed_by lookup: ${error.message}`);
    for (const row of data ?? []) {
      managed.set(row.sku, row.metadata?.managed_by);
    }
  }
  return managed;
}

function assertNotUiManaged(managed, skus, section) {
  if (ARGS.force) return;
  const conflicts = skus.filter((sku) => managed.get(sku) === 'ui');
  if (conflicts.length) {
    throw new Error(
      `${section}: ${conflicts.length} SKU(s) were edited in the app (managed_by=ui) and would be ` +
      `overwritten by this seed:\n  ${conflicts.join('\n  ')}\n` +
      `Either pull the live values back into the seed JSON first, or re-run with --force to overwrite them.`,
    );
  }
}

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
  const managed = await fetchManagedBySku(orgId, rows.map((r) => r.sku));
  assertNotUiManaged(managed, rows.map((r) => r.sku), 'product_components');
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
      managed_by: 'seed', // ownership stamp — see README "Data ownership"
    },
    active: r.active,
  }));
  const { error } = await supabase
    .from('product_components')
    .upsert(toUpsert, { onConflict: 'org_id,sku', ignoreDuplicates: false });
  if (error) throw new Error(`product_components: ${error.message}`);
  invalidateComponentCache();
  const reclaimed = rows.filter((r) => managed.get(r.sku) === 'ui').length;
  console.log(
    `  product_components: ${toUpsert.length} upserted`
    + (reclaimed ? ` (—force: ${reclaimed} ui-managed row(s) overwritten and reclaimed by seed)` : ''),
  );
}

async function upsertPricingRules(orgId, rows) {
  if (!rows?.length) return;
  // pricing_rules has no metadata column — ownership rides on the SKU's
  // component row, so a ui-managed component blocks its price rules too.
  // Checked here as well (not just in upsertProductComponents) because a file
  // may carry pricing_rules for SKUs whose component row lives in another file
  // (e.g. price_catalogue.json).
  const ruleSkus = [...new Set(rows.map((r) => r.sku))];
  assertNotUiManaged(await fetchManagedBySku(orgId, ruleSkus), ruleSkus, 'pricing_rules');
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

// Top-level keys of the engine's CalculatorConfig (config/types.ts). An overlay
// patch containing anything else is a typo (e.g. "colourbond") that deepMerge
// would silently carry along — reject it loudly at seed time instead.
const CALCULATOR_CONFIG_TOP_LEVEL_KEYS = new Set([
  'productCode',
  'configVersion',
  'strategy',
  'colours',
  'display',
  'finishFamilies',
  'heightUi',
  'panelRules',
  'postFixingMaterials',
  'gateRules',
  'defaults',
  'fields',
  'formGroups',
  'extraRules',
  'slat',
  'colorbond',
  'timberPaling',
]);

async function upsertCalculatorConfigs(orgId, rows) {
  if (!rows?.length) return;
  let inserted = 0;
  let updated = 0;
  for (const r of rows) {
    const unknownKeys = Object.keys(r.config).filter(
      (k) => !CALCULATOR_CONFIG_TOP_LEVEL_KEYS.has(k),
    );
    if (unknownKeys.length) {
      throw new Error(
        `calculator_configs (${r.product_code}): unknown top-level config key(s): ${unknownKeys.join(', ')}`,
      );
    }
    const row = {
      org_id: orgId,
      product_code: r.product_code,
      config: r.config,
      notes: r.notes ?? null,
      is_current: true,
      active: true,
    };
    const { data: existing, error: lookupErr } = await supabase
      .from('supplier_product_calculator_configs')
      .select('id')
      .eq('org_id', orgId)
      .eq('product_code', r.product_code)
      .eq('is_current', true)
      .eq('active', true)
      .maybeSingle();
    if (lookupErr) throw new Error(`calculator_configs lookup (${r.product_code}): ${lookupErr.message}`);
    if (existing) {
      const { error } = await supabase
        .from('supplier_product_calculator_configs')
        .update(row)
        .eq('id', existing.id);
      if (error) throw new Error(`calculator_configs update (${r.product_code}): ${error.message}`);
      updated++;
    } else {
      const { error } = await supabase.from('supplier_product_calculator_configs').insert(row);
      if (error) throw new Error(`calculator_configs insert (${r.product_code}): ${error.message}`);
      inserted++;
    }
  }
  console.log(`  calculator_configs: ${inserted} inserted, ${updated} updated`);
}

// ── Main per-file loader ────────────────────────────────────────────────────

async function loadFile(path, expectedOrgSlug) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (!validateFile(raw)) {
    const errs = validateFile.errors
      .map((e) => `  ${e.instancePath} ${e.message}`)
      .join('\n');
    throw new Error(`${basename(path)} failed schema validation:\n${errs}`);
  }
  if (raw.org_slug !== expectedOrgSlug) {
    throw new Error(
      `${basename(path)}: org_slug "${raw.org_slug}" does not match its seed directory "${expectedOrgSlug}"`,
    );
  }
  const orgId = await resolveOrgId(raw.org_slug);
  console.log(`${basename(path)} (org=${raw.org_slug}):`);

  // dependency order
  await upsertProducts(orgId, raw.products);
  await upsertProductComponents(orgId, raw.product_components);
  await upsertPricingRules(orgId, raw.pricing_rules);
  await upsertCalculatorConfigs(orgId, raw.calculator_configs);
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
  let orgDirs = discoverOrgProductDirs();
  if (orgDirs.length === 0) {
    console.log(`No org product directories found under ${ROOT}`);
    return;
  }

  if (ARGS.org) {
    orgDirs = orgDirs.filter((d) => d.orgSlug === ARGS.org);
    if (orgDirs.length === 0) {
      throw new Error(
        `--org ${ARGS.org}: no seed directory at supabase/seeds/${ARGS.org}/products/ ` +
        `(available: ${discoverOrgProductDirs().map((d) => d.orgSlug).join(', ')})`,
      );
    }
    console.log(`Scoped to org: ${ARGS.org}${ARGS.force ? ' (--force: ui-managed rows will be overwritten)' : ''}`);
  } else if (ARGS.force) {
    console.log('--force: ui-managed rows will be overwritten for ALL orgs');
  }

  let total = 0;
  for (const { orgSlug, dir } of orgDirs) {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
      .sort()
      .map((f) => resolve(dir, f));

    if (files.length === 0) {
      console.log(`${orgSlug}: no product files (skipping)`);
      continue;
    }

    console.log(`${orgSlug}: ${files.length} product file(s): ${files.map((p) => basename(p)).join(', ')}`);
    for (const path of files) {
      await loadFile(path, orgSlug);
    }
    total += files.length;
  }

  if (total === 0) {
    console.log('No product files found in any org directory.');
    return;
  }

  await verifyRowCounts();
  console.log('\nSeed products done.');
}

main().catch((e) => {
  console.error('\nSEED FAILED:', e.message);
  process.exit(1);
});
