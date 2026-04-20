// dump-to-json.js
//
// Reads the current seeded Postgres state and emits **one JSON file per
// product** under supabase/seeds/glass-outlet/products/*.json, following
// supabase/seeds/schemas/product-file.schema.json. Files emitted:
//
//   qshs.json        — QSHS fence + engine rules + QSHS-scoped SKUs/pricing
//   vs.json          — VS fence + VS-scoped SKUs/pricing (no engine yet)
//   xpl.json         — XPL fence + XPL-scoped SKUs/pricing
//   bayg.json        — BAYG fence + BAYG-scoped SKUs/pricing
//   gate_legacy.json — v1/v2 'GATE' variant + its SKUs/pricing (no engine)
//   qs_gate.json     — v3 QS_GATE product + engine rules + QSG/DD SKUs +
//                      compatible_with_system_types list
//   other.json       — inactive non-fence families (balustrade, colorbond,
//                      glass, hamptons, etc.) — product rows only
//
// FK UUIDs are translated back to business keys (org_slug at the file
// level; product_system_type / rule_set_name / version_label / sku on
// individual rows). Each product_file's products[] array contains every
// product row the file "owns" — the QS_GATE file owns the gate product;
// each fence file owns its fence variant. Cross-product SKUs (shared
// accessories, spacers, screws) may appear in multiple files; the Node
// upserter handles dup UPSERT semantics.
//
// Usage: node supabase/seeds/tools/dump-to-json.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'local'}` });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) throw new Error('Missing VITE_SUPABASE_URL');
if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'glass-outlet', 'products');
mkdirSync(OUT_DIR, { recursive: true });

const ORG_SLUG = 'glass-outlet';

// ── File definitions ────────────────────────────────────────────────────────
// Each entry owns one product row. engineSystemTypes lists the system_types
// whose engine data (rule_sets/versions/rules/etc.) should be dumped into
// this file. v3SkuFilter restricts which SKUs go into the file (useful for
// splitting gate-legacy vs qs_gate, which share system_types=['GATE']).

const V3_GATE_SKUS = new Set([
  'QSG-GATESF-05MM-B',
  'QSG-GATESF-09MM-B',
  'QSG-GATESF-20MM-B',
  'QSG-JBLOCK-65-4PK',
  'QSG-JBLOCK-90-4PK',
  'QSG-SC-10PK',
  'QSG-RS-10PK',
  'QSG-FTC-50',
  'QSG-FTC-65',
  'QSG-FTC-75',
  'DD-KWIK-FIT-FIXED',
  'DD-KWIK-FIT-ADJ',
  'DD-HD-WELD-ON',
  'DD-MAGNALATCH-TP',
  'DD-MAGNALATCH-LB',
  'DROP-BOLT-STD',
]);

// Some v3 accessory SKUs currently live under system_types=['QSHS'] (they're
// logically shared between QSHS/VS/XPL/BAYG but tagged QSHS for now).
const V3_ACCESSORY_SKUS = new Set([
  'QS-SFCAP-ACC-2PK',
  'XP-CSRC-ACC',
  'QS-SPACER-05MM-50PK',
  'QS-SPACER-09MM-50PK',
  'QS-SPACER-20MM-50PK',
  'QS-SCREWS-50PK',
  'XP-SCREWS-SINGLES-ACC',
  'S-120ROD-4PK',
  'QS-5800-F-B',
]);

const FENCE_FILES = [
  { filename: 'qshs.json', systemType: 'QSHS', productType: 'fence', hasEngine: true },
  { filename: 'vs.json',   systemType: 'VS',   productType: 'fence', hasEngine: false },
  { filename: 'xpl.json',  systemType: 'XPL',  productType: 'fence', hasEngine: false },
  { filename: 'bayg.json', systemType: 'BAYG', productType: 'fence', hasEngine: false },
];

async function main() {
  console.log(`Dumping per-product files → ${OUT_DIR}`);

  const { data: org, error: orgErr } = await supabase
    .from('organisations')
    .select('id, slug')
    .eq('slug', ORG_SLUG)
    .single();
  if (orgErr || !org) throw new Error(`org ${ORG_SLUG} not found: ${orgErr?.message}`);
  const ORG_ID = org.id;

  const { data: allProducts } = await supabase
    .from('products')
    .select('*')
    .eq('org_id', ORG_ID);
  const productBySysType = new Map(allProducts.map((p) => [p.system_type, p]));
  const productById = new Map(allProducts.map((p) => [p.id, p]));
  const systemTypeById = (id) => productById.get(id)?.system_type ?? null;

  // ── helpers ───────────────────────────────────────────────────────────────
  function productRow(p, overrides = {}) {
    return {
      system_type: p.system_type,
      product_type: overrides.product_type ?? p.product_type ?? 'fence',
      compatible_with_system_types:
        overrides.compatible_with_system_types ??
        p.compatible_with_system_types ??
        [],
      name: p.name,
      description: p.description,
      active: p.active,
      sort_order: p.sort_order ?? 0,
      metadata: p.metadata ?? {},
    };
  }

  async function componentsWithSystem(sysType, skuFilter) {
    const { data } = await supabase
      .from('product_components')
      .select('*')
      .eq('org_id', ORG_ID)
      .contains('system_types', [sysType])
      .order('sku');
    return (data ?? []).filter(skuFilter).map((c) => ({
      sku: c.sku,
      name: c.name,
      description: c.description,
      category: c.category,
      unit: c.unit,
      default_price: c.default_price,
      system_types: c.system_types,
      metadata: c.metadata ?? {},
      active: c.active,
    }));
  }

  async function pricingForSkus(skus) {
    if (skus.length === 0) return [];
    const { data } = await supabase
      .from('pricing_rules_with_sku')
      .select('*')
      .eq('org_id', ORG_ID)
      .in('sku', skus);
    return (data ?? []).map((p) => ({
      sku: p.sku,
      tier_code: p.tier_code,
      rule: p.rule,
      price: p.price,
      priority: p.priority,
      valid_from: p.valid_from,
      valid_to: p.valid_to,
      notes: p.notes ?? null,
      active: p.active,
    }));
  }

  async function engineSections(systemTypes) {
    // systemTypes is an array of one or more system_type strings (e.g. ['QSHS']
    // or ['QSHS', 'QSHS_GATE'] for the gate file during transition)
    const productIds = systemTypes
      .map((t) => productBySysType.get(t)?.id)
      .filter(Boolean);
    if (productIds.length === 0) return {};

    const out = {};

    // rule_sets
    const { data: ruleSets } = await supabase
      .from('rule_sets')
      .select('*')
      .eq('org_id', ORG_ID)
      .in('product_id', productIds)
      .order('name');
    const ruleSetById = new Map(ruleSets.map((rs) => [rs.id, rs]));
    if (ruleSets.length) {
      out.rule_sets = ruleSets.map((rs) => ({
        product_system_type: systemTypeById(rs.product_id),
        name: rs.name,
        description: rs.description,
        active: rs.active,
      }));
    }

    // rule_versions
    const { data: versions } = await supabase
      .from('rule_versions')
      .select('*')
      .eq('org_id', ORG_ID)
      .in('rule_set_id', ruleSets.map((rs) => rs.id))
      .order('version_label');
    const versionById = new Map(versions.map((v) => [v.id, v]));
    if (versions.length) {
      out.rule_versions = versions.map((v) => {
        const rs = ruleSetById.get(v.rule_set_id);
        return {
          product_system_type: systemTypeById(rs.product_id),
          rule_set_name: rs.name,
          version_label: v.version_label,
          is_current: v.is_current,
          effective_from: v.effective_from,
          notes: v.notes,
        };
      });
    }

    async function perProduct(table, mapper) {
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('org_id', ORG_ID)
        .in('product_id', productIds);
      if (data.length) out[table] = data.map((row) => mapper(row));
    }

    await perProduct('product_constraints', (row) => ({
      product_system_type: systemTypeById(row.product_id),
      name: row.name,
      constraint_type: row.constraint_type,
      value_text: row.value_text,
      unit: row.unit,
      severity: row.severity,
      applies_when_json: row.applies_when_json,
      message: row.message,
      active: row.active,
    }));

    await perProduct('product_variables', (row) => ({
      product_system_type: systemTypeById(row.product_id),
      name: row.name,
      label: row.label,
      data_type: row.data_type,
      unit: row.unit,
      required: row.required,
      default_value_json: row.default_value_json,
      options_json: row.options_json,
      scope: row.scope,
      sort_order: row.sort_order,
      active: row.active,
    }));

    await perProduct('product_validations', (row) => ({
      product_system_type: systemTypeById(row.product_id),
      name: row.name,
      expression: row.expression,
      severity: row.severity,
      message: row.message,
      active: row.active,
    }));

    // product_rules includes rule_set + version refs
    {
      const { data: rules } = await supabase
        .from('product_rules')
        .select('*')
        .eq('org_id', ORG_ID)
        .in('product_id', productIds)
        .order('priority');
      if (rules.length) {
        out.product_rules = rules.map((r) => {
          const rs = ruleSetById.get(r.rule_set_id);
          const v = versionById.get(r.version_id);
          return {
            product_system_type: systemTypeById(r.product_id),
            rule_set_name: rs?.name ?? null,
            version_label: v?.version_label ?? null,
            stage: r.stage,
            name: r.name,
            expression: r.expression,
            output_key: r.output_key,
            priority: r.priority,
            active: r.active,
            notes: r.notes,
          };
        });
      }
    }

    await perProduct('product_component_selectors', (row) => ({
      product_system_type: systemTypeById(row.product_id),
      selector_key: row.selector_key,
      component_category: row.component_category,
      selector_type: row.selector_type,
      match_json: row.match_json,
      sku_pattern: row.sku_pattern,
      priority: row.priority,
      notes: row.notes,
      active: row.active,
    }));

    await perProduct('product_companion_rules', (row) => ({
      product_system_type: systemTypeById(row.product_id),
      rule_key: row.rule_key,
      trigger_category: row.trigger_category,
      trigger_match_json: row.trigger_match_json,
      add_category: row.add_category,
      add_sku_pattern: row.add_sku_pattern,
      qty_formula: row.qty_formula,
      is_pack: row.is_pack,
      priority: row.priority,
      notes: row.notes,
      active: row.active,
    }));

    await perProduct('product_warnings', (row) => ({
      product_system_type: systemTypeById(row.product_id),
      warning_key: row.warning_key,
      severity: row.severity,
      condition_json: row.condition_json,
      message: row.message,
      active: row.active,
    }));

    return out;
  }

  function writeFile(filename, body) {
    const path = resolve(OUT_DIR, filename);
    writeFileSync(path, JSON.stringify(body, null, 2) + '\n');
    const sections = Object.keys(body)
      .filter((k) => k !== 'org_slug')
      .map((k) => `${k}=${Array.isArray(body[k]) ? body[k].length : '·'}`)
      .join(' ');
    console.log(`  ${filename}: ${sections}`);
  }

  // ── Fence files (QSHS, VS, XPL, BAYG) ─────────────────────────────────────
  for (const entry of FENCE_FILES) {
    const p = productBySysType.get(entry.systemType);
    if (!p) {
      console.warn(`  skipping ${entry.filename}: product ${entry.systemType} not found`);
      continue;
    }
    const out = { org_slug: ORG_SLUG };
    out.products = [productRow(p, { product_type: 'fence' })];

    // SKUs: include SKUs tagged with this system_type, plus (for QSHS only)
    // the v3 shared accessory SKUs that are tagged ['QSHS'] by legacy convention.
    const skuFilter = entry.systemType === 'QSHS'
      ? (_c) => true                      // all QSHS SKUs (includes v3 accessories)
      : (_c) => true;
    const components = await componentsWithSystem(entry.systemType, skuFilter);
    if (components.length) out.product_components = components;

    const pricing = await pricingForSkus(components.map((c) => c.sku));
    if (pricing.length) out.pricing_rules = pricing;

    // Engine data (only QSHS has any today)
    if (entry.hasEngine) {
      const engine = await engineSections([entry.systemType]);
      Object.assign(out, engine);
    }

    writeFile(entry.filename, out);
  }

  // ── Gate files ────────────────────────────────────────────────────────────

  // Legacy v1/v2 GATE variant: product row + any SKUs tagged ['GATE'] that
  // aren't v3 gate SKUs.
  {
    const p = productBySysType.get('GATE');
    if (p) {
      const out = { org_slug: ORG_SLUG };
      out.products = [productRow(p, { product_type: 'gate' })];
      const components = await componentsWithSystem('GATE', (c) => !V3_GATE_SKUS.has(c.sku));
      if (components.length) out.product_components = components;
      const pricing = await pricingForSkus(components.map((c) => c.sku));
      if (pricing.length) out.pricing_rules = pricing;
      writeFile('gate_legacy.json', out);
    }
  }

  // v3 QS_GATE — the shared gate product. Today the DB still has it as
  // system_type='QSHS_GATE'; the dumper rewrites it to 'QS_GATE' and
  // populates compatible_with_system_types.
  {
    const p = productBySysType.get('QSHS_GATE') ?? productBySysType.get('QS_GATE');
    if (p) {
      const out = { org_slug: ORG_SLUG };
      const renamed = {
        ...p,
        system_type: 'QS_GATE',
      };
      out.products = [
        productRow(renamed, {
          product_type: 'gate',
          compatible_with_system_types:
            p.compatible_with_system_types?.length
              ? p.compatible_with_system_types
              : ['QSHS', 'VS', 'XPL', 'BAYG'],
        }),
      ];

      // SKUs: v3 gate SKUs, regardless of system_types tag
      const { data: allComps } = await supabase
        .from('product_components')
        .select('*')
        .eq('org_id', ORG_ID)
        .order('sku');
      const components = (allComps ?? [])
        .filter((c) => V3_GATE_SKUS.has(c.sku))
        .map((c) => ({
          sku: c.sku,
          name: c.name,
          description: c.description,
          category: c.category,
          unit: c.unit,
          default_price: c.default_price,
          system_types: c.system_types,
          metadata: c.metadata ?? {},
          active: c.active,
        }));
      if (components.length) out.product_components = components;
      const pricing = await pricingForSkus(components.map((c) => c.sku));
      if (pricing.length) out.pricing_rules = pricing;

      // Engine data (QSHS_GATE → QS_GATE rename for product_system_type + rule_set_name 'QSHS Gate Rules' → 'QS Gate Rules')
      const engine = await engineSections(['QSHS_GATE']);
      for (const section of Object.values(engine)) {
        if (!Array.isArray(section)) continue;
        for (const row of section) {
          if (row.product_system_type === 'QSHS_GATE') row.product_system_type = 'QS_GATE';
          if (row.rule_set_name === 'QSHS Gate Rules') row.rule_set_name = 'QS Gate Rules';
          if (row.name === 'QSHS Gate Rules') row.name = 'QS Gate Rules';
        }
      }
      Object.assign(out, engine);

      writeFile('qs_gate.json', out);
    }
  }

  // ── Other inactive product families ───────────────────────────────────────
  {
    const FENCE_AND_GATE = new Set(['QSHS', 'VS', 'XPL', 'BAYG', 'GATE', 'QSHS_GATE', 'QS_GATE', 'QUICKSCREEN']);
    const others = allProducts.filter((p) => !FENCE_AND_GATE.has(p.system_type));
    if (others.length) {
      const out = { org_slug: ORG_SLUG };
      out.products = others
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((p) => productRow(p, { product_type: 'other' }));
      writeFile('other.json', out);
    }
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
