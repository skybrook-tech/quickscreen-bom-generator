// seed-products.js
//
// Loads every product file under supabase/seeds/glass-outlet/products/*.json,
// validates each against supabase/seeds/schemas/product-file.schema.json,
// resolves business-key FKs via on-the-fly lookups against Postgres, and
// upserts every section in dependency order via @supabase/supabase-js.
//
// This replaces the previous seed:build → regenerated SQL flow. The Node
// client uses the service role key, which bypasses RLS, so engine and
// catalog tables are written to directly.
//
// Usage: node supabase/seeds/tools/seed-products.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PRODUCTS_DIR = resolve(ROOT, 'glass-outlet', 'products');
const SCHEMA_DIR = resolve(ROOT, 'schemas');
const COLOUR_OPTIONS_FILE = resolve(ROOT, 'glass-outlet', 'colour-options.json');

// ── Load + compile schemas ──────────────────────────────────────────────────

function loadSchema(name) {
  return JSON.parse(readFileSync(resolve(SCHEMA_DIR, `${name}.schema.json`), 'utf8'));
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Register all per-table schemas so $refs in product-file.schema.json resolve
const PER_TABLE_SCHEMAS = [
  'products',
  'product_components',
  'rule_sets',
  'rule_versions',
  'product_constraints',
  'product_variables',
  'product_validations',
  'product_rules',
  'product_component_selectors',
  'product_companion_rules',
  'product_warnings',
  'pricing_rules',
];
for (const name of PER_TABLE_SCHEMAS) {
  ajv.addSchema(loadSchema(name));
}
const validateFile = ajv.compile(loadSchema('product-file'));

// ── ID resolvers (cached per run) ───────────────────────────────────────────

const cache = {
  orgIdBySlug: new Map(),
  productIdBySystemType: new Map(),       // key: `${orgId}|${systemType}` → id (flat model)
  ruleSetIdByKey: new Map(),              // key: `${orgId}|${productId}|${name}` → id
  ruleVersionIdByKey: new Map(),          // key: `${ruleSetId}|${versionLabel}` → id
  componentIdBySku: new Map(),            // key: `${orgId}|${sku}` → id
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

async function resolveProductId(orgId, systemType) {
  const key = `${orgId}|${systemType}`;
  if (cache.productIdBySystemType.has(key)) return cache.productIdBySystemType.get(key);
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('org_id', orgId)
    .eq('system_type', systemType)
    .maybeSingle();
  if (error) throw new Error(`resolveProductId(${systemType}): ${error.message}`);
  if (!data) throw new Error(`product not found: system_type=${systemType}`);
  cache.productIdBySystemType.set(key, data.id);
  return data.id;
}

async function resolveRuleSetId(orgId, productId, name) {
  const key = `${orgId}|${productId}|${name}`;
  if (cache.ruleSetIdByKey.has(key)) return cache.ruleSetIdByKey.get(key);
  const { data, error } = await supabase
    .from('rule_sets')
    .select('id')
    .eq('org_id', orgId)
    .eq('product_id', productId)
    .eq('name', name)
    .maybeSingle();
  if (error) throw new Error(`resolveRuleSetId(${name}): ${error.message}`);
  if (!data) throw new Error(`rule_set not found: product_id=${productId} name=${name}`);
  cache.ruleSetIdByKey.set(key, data.id);
  return data.id;
}

async function resolveRuleVersionId(ruleSetId, versionLabel) {
  const key = `${ruleSetId}|${versionLabel}`;
  if (cache.ruleVersionIdByKey.has(key)) return cache.ruleVersionIdByKey.get(key);
  const { data, error } = await supabase
    .from('rule_versions')
    .select('id')
    .eq('rule_set_id', ruleSetId)
    .eq('version_label', versionLabel)
    .maybeSingle();
  if (error) throw new Error(`resolveRuleVersionId(${versionLabel}): ${error.message}`);
  if (!data) throw new Error(`rule_version not found: rule_set_id=${ruleSetId} label=${versionLabel}`);
  cache.ruleVersionIdByKey.set(key, data.id);
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

function invalidateProductCache() {
  cache.productIdBySystemType.clear();
}
function invalidateRuleSetCache() {
  cache.ruleSetIdByKey.clear();
}
function invalidateRuleVersionCache() {
  cache.ruleVersionIdByKey.clear();
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
  invalidateProductCache();
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
    system_types: r.system_types ?? ['QSHS'],
    canonical_code: r.canonical_code ?? null,
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

async function upsertRuleSets(orgId, rows) {
  if (!rows?.length) return;
  const toUpsert = await Promise.all(
    rows.map(async (r) => ({
      org_id: orgId,
      product_id: await resolveProductId(orgId, r.product_system_type),
      name: r.name,
      description: r.description ?? null,
      active: r.active,
    })),
  );
  const { error } = await supabase
    .from('rule_sets')
    .upsert(toUpsert, { onConflict: 'org_id,product_id,name', ignoreDuplicates: false });
  if (error) throw new Error(`rule_sets: ${error.message}`);
  invalidateRuleSetCache();
  console.log(`  rule_sets: ${toUpsert.length} upserted`);
}

async function upsertRuleVersions(orgId, rows) {
  if (!rows?.length) return;
  const toUpsert = await Promise.all(
    rows.map(async (r) => {
      const productId = await resolveProductId(orgId, r.product_system_type);
      const ruleSetId = await resolveRuleSetId(orgId, productId, r.rule_set_name);
      return {
        org_id: orgId,
        rule_set_id: ruleSetId,
        version_label: r.version_label,
        is_current: r.is_current,
        effective_from: r.effective_from ?? null,
        notes: r.notes ?? null,
      };
    }),
  );
  const { error } = await supabase
    .from('rule_versions')
    .upsert(toUpsert, { onConflict: 'rule_set_id,version_label', ignoreDuplicates: false });
  if (error) throw new Error(`rule_versions: ${error.message}`);
  invalidateRuleVersionCache();
  console.log(`  rule_versions: ${toUpsert.length} upserted`);
}

async function upsertPerProduct(orgId, table, rows, mapper, conflict) {
  if (!rows?.length) return;
  const toUpsert = await Promise.all(
    rows.map(async (r) => {
      const productId = await resolveProductId(orgId, r.product_system_type);
      return mapper(r, productId);
    }),
  );
  const { error } = await supabase
    .from(table)
    .upsert(toUpsert, { onConflict: conflict, ignoreDuplicates: false });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ${table}: ${toUpsert.length} upserted`);
}

async function upsertProductRules(orgId, rows) {
  if (!rows?.length) return;
  const toUpsert = await Promise.all(
    rows.map(async (r) => {
      const productId = await resolveProductId(orgId, r.product_system_type);
      const ruleSetId = await resolveRuleSetId(orgId, productId, r.rule_set_name);
      const versionId = await resolveRuleVersionId(ruleSetId, r.version_label);
      return {
        org_id: orgId,
        product_id: productId,
        rule_set_id: ruleSetId,
        version_id: versionId,
        stage: r.stage,
        name: r.name,
        expression: r.expression,
        output_key: r.output_key,
        priority: r.priority,
        active: r.active,
        notes: r.notes ?? null,
      };
    }),
  );
  const { error } = await supabase
    .from('product_rules')
    .upsert(toUpsert, { onConflict: 'version_id,stage,name', ignoreDuplicates: false });
  if (error) throw new Error(`product_rules: ${error.message}`);
  console.log(`  product_rules: ${toUpsert.length} upserted`);
}

async function upsertPricingRules(orgId, rows) {
  if (!rows?.length) return;

  // Pre-populate component ID cache to avoid sequential SELECT queries (paginated to bypass 1000 limit)
  const allComponents = [];
  let fromComp = 0;
  let toComp = 999;
  let hasMoreComps = true;
  while (hasMoreComps) {
    const { data, error } = await supabase
      .from('product_components')
      .select('id, sku')
      .eq('org_id', orgId)
      .range(fromComp, toComp);
    if (error) throw new Error(`product_components cache pre-fill failed: ${error.message}`);
    allComponents.push(...(data ?? []));
    if ((data ?? []).length < 1000) {
      hasMoreComps = false;
    } else {
      fromComp += 1000;
      toComp += 1000;
    }
  }
  for (const comp of allComponents) {
    cache.componentIdBySku.set(`${orgId}|${comp.sku}`, comp.id);
  }

  // 1. Fetch all existing active pricing rules for this org in one query (paginated to bypass 1000 limit)
  const existingRules = [];
  let fromRules = 0;
  let toRules = 999;
  let hasMoreRules = true;
  while (hasMoreRules) {
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('id, component_id, tier_code, priority')
      .eq('org_id', orgId)
      .eq('active', true)
      .range(fromRules, toRules);
    if (error) throw new Error(`pricing_rules fetch failed: ${error.message}`);
    existingRules.push(...(data ?? []));
    if ((data ?? []).length < 1000) {
      hasMoreRules = false;
    } else {
      fromRules += 1000;
      toRules += 1000;
    }
  }

  // 2. Build a map of existing active pricing rules for O(1) lookup
  const existingMap = new Map();
  for (const row of existingRules) {
    existingMap.set(`${row.component_id}|${row.tier_code}|${row.priority}`, row.id);
  }

  const inserts = [];
  const updates = [];

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
      canonical_code: r.canonical_code ?? null,
    };

    const key = `${componentId}|${r.tier_code}|${row.priority}`;
    if (existingMap.has(key)) {
      updates.push({
        id: existingMap.get(key),
        ...row
      });
    } else {
      inserts.push(row);
    }
  }

  // 3. Batch upsert inserts and updates in chunks of 500 to avoid request size limits
  const CHUNK_SIZE = 500;
  
  if (inserts.length > 0) {
    for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
      const chunk = inserts.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('pricing_rules').upsert(chunk);
      if (error) throw new Error(`pricing_rules batch insert error: ${error.message}`);
    }
  }

  if (updates.length > 0) {
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('pricing_rules').upsert(chunk);
      if (error) throw new Error(`pricing_rules batch update error: ${error.message}`);
    }
  }

  console.log(`  pricing_rules: ${inserts.length} inserted, ${updates.length} updated`);
}

// ── Colour options ──────────────────────────────────────────────────────────

async function upsertColourOptions() {
  let raw;
  try {
    raw = JSON.parse(readFileSync(COLOUR_OPTIONS_FILE, 'utf8'));
  } catch {
    console.log('colour-options.json not found — skipping');
    return;
  }
  const orgId = await resolveOrgId(raw.org_slug);
  const rows = (raw.colour_options ?? []).map(r => ({ org_id: orgId, ...r }));
  if (rows.length === 0) return;
  const { error } = await supabase
    .from('colour_options')
    .upsert(rows, { onConflict: 'org_id,value' });
  if (error) throw new Error(`colour_options upsert: ${error.message}`);
  console.log(`colour-options.json: ${rows.length} upserted`);
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
  await upsertRuleSets(orgId, raw.rule_sets);
  await upsertRuleVersions(orgId, raw.rule_versions);

  await upsertPerProduct(
    orgId,
    'product_variables',
    raw.product_variables,
    (r, productId) => ({
      org_id: orgId,
      product_id: productId,
      name: r.name,
      label: r.label,
      data_type: r.data_type,
      unit: r.unit ?? null,
      required: r.required,
      default_value_json: r.default_value_json ?? null,
      options_json: r.options_json ?? [],
      options_group: r.options_group ?? null,
      scope: r.scope,
      sort_order: r.sort_order ?? 0,
      active: r.active,
    }),
    'org_id,product_id,name',
  );

  await upsertPerProduct(
    orgId,
    'product_constraints',
    raw.product_constraints,
    (r, productId) => ({
      org_id: orgId,
      product_id: productId,
      name: r.name,
      constraint_type: r.constraint_type,
      value_text: r.value_text,
      unit: r.unit ?? null,
      severity: r.severity,
      applies_when_json: r.applies_when_json ?? {},
      message: r.message,
      active: r.active,
    }),
    'org_id,product_id,name',
  );

  await upsertPerProduct(
    orgId,
    'product_validations',
    raw.product_validations,
    (r, productId) => ({
      org_id: orgId,
      product_id: productId,
      name: r.name,
      expression: r.expression,
      severity: r.severity,
      message: r.message,
      active: r.active,
    }),
    'org_id,product_id,name',
  );

  await upsertProductRules(orgId, raw.product_rules);

  await upsertPerProduct(
    orgId,
    'product_component_selectors',
    raw.product_component_selectors,
    (r, productId) => ({
      org_id: orgId,
      product_id: productId,
      selector_key: r.selector_key,
      component_category: r.component_category,
      selector_type: r.selector_type,
      match_json: r.match_json ?? {},
      qty_key: r.qty_key ?? null,
      sku_pattern: r.sku_pattern,
      priority: r.priority ?? 100,
      notes: r.notes ?? null,
      active: r.active,
    }),
    'org_id,product_id,selector_key',
  );

  await upsertPerProduct(
    orgId,
    'product_companion_rules',
    raw.product_companion_rules,
    (r, productId) => ({
      org_id: orgId,
      product_id: productId,
      rule_key: r.rule_key,
      trigger_category: r.trigger_category,
      trigger_match_json: r.trigger_match_json ?? {},
      add_category: r.add_category,
      add_sku_pattern: r.add_sku_pattern,
      qty_formula: r.qty_formula,
      is_pack: r.is_pack ?? false,
      is_suggestion: r.is_suggestion ?? false,
      priority: r.priority ?? 100,
      notes: r.notes ?? null,
      active: r.active,
    }),
    'org_id,product_id,rule_key',
  );

  await upsertPerProduct(
    orgId,
    'product_warnings',
    raw.product_warnings,
    (r, productId) => ({
      org_id: orgId,
      product_id: productId,
      warning_key: r.warning_key,
      severity: r.severity,
      condition_json: r.condition_json ?? {},
      message: r.message,
      active: r.active,
    }),
    'org_id,product_id,warning_key',
  );

  await upsertPricingRules(orgId, raw.pricing_rules);
}

// ── Post-load row-count floors (replaces v3-verify-seeds.sql) ──────────────

// [table, minRows, filterByActive]
// rule_sets + rule_versions have no `active` column on rule_versions;
// for consistency we count all rows on those. Others count only active=true.
const ROW_COUNT_FLOORS = [
  ['colour_options', 14, true],
  ['rule_sets', 2, true],
  ['rule_versions', 2, false],
  ['product_constraints', 8, true],
  ['product_variables', 18, true],
  ['product_validations', 7, true],
  ['product_rules', 22, true],
  ['product_component_selectors', 10, true],
  ['product_companion_rules', 13, true],
  ['product_warnings', 5, true],
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
  const dirs = readdirSync(ROOT).filter((name) => {
    try {
      return statSync(resolve(ROOT, name)).isDirectory() && name !== 'schemas' && name !== 'tools';
    } catch {
      return false;
    }
  });

  let files = [];
  for (const dirName of dirs) {
    const productsDir = resolve(ROOT, dirName, 'products');
    if (existsSync(productsDir)) {
      const supplierFiles = readdirSync(productsDir)
        .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
        .map((f) => resolve(productsDir, f));
      files = files.concat(supplierFiles);
    }
  }
  files.sort();

  if (files.length === 0) {
    console.log(`No product files found in seeds directory.`);
    return;
  }

  console.log(`Found ${files.length} product file(s): ${files.map((p) => basename(p)).join(', ')}`);

  await upsertColourOptions();

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
