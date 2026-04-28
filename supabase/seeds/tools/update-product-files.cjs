#!/usr/bin/env node
// update-product-files.cjs
// Updates all 6 product JSON files for the finish_type + colour_options plan:
//  1. colour_code variable: add options_group='colours', clear options_json
//  2. Add finish_type variable
//  3. Add Alumawood selector overrides to qshs, vs, xpl
//  4. Add XPL product_warning for Alumawood patented posts

const { readFileSync, writeFileSync } = require('fs');
const path = require('path');

const PRODUCTS_DIR = path.resolve(__dirname, '../glass-outlet/products');

// ── Helper ───────────────────────────────────────────────────────────────────
function load(name) {
  return JSON.parse(readFileSync(path.join(PRODUCTS_DIR, `${name}.json`), 'utf8'));
}
function save(name, data) {
  writeFileSync(path.join(PRODUCTS_DIR, `${name}.json`), JSON.stringify(data, null, 2) + '\n');
  console.log(`✓ ${name}.json`);
}

// ── Alumawood selectors generator ────────────────────────────────────────────
const AW_COLOURS = ['KWI', 'WRC', 'IG'];

function awSlat(prefix, systemType) {
  return AW_COLOURS.map(c => ({
    product_system_type: systemType,
    selector_key: `${prefix}_slat_65_${c.toLowerCase()}`,
    component_category: 'slat',
    selector_type: 'exact',
    match_json: { colour_code: c },
    sku_pattern: c === 'IG' ? 'AW-5800-S65-IG' : `AW-5800-S65-${c}`,
    priority: 10,
    notes: `AW slat override for ${c}`,
    qty_key: 'qty_slat_65',
    active: true,
  }));
}

function awCsr(prefix, systemType) {
  return AW_COLOURS.map(c => ({
    product_system_type: systemType,
    selector_key: `${prefix}_csr_${c.toLowerCase()}`,
    component_category: 'centre_support_rail',
    selector_type: 'exact',
    match_json: { colour_code: c },
    sku_pattern: c === 'KWI' ? 'AW-5800-CSR-KWI' : c === 'WRC' ? 'AW-5800-CSR-WRC' : 'XP-5800-CSR-MN',
    priority: 10,
    notes: `AW CSR override for ${c}`,
    qty_key: 'qty_csr',
    active: true,
  }));
}

function awSideFrame(prefix, systemType) {
  return AW_COLOURS.map(c => ({
    product_system_type: systemType,
    selector_key: `${prefix}_side_frame_${c.toLowerCase()}`,
    component_category: 'side_frame',
    selector_type: 'exact',
    match_json: { colour_code: c },
    sku_pattern: 'QS-5800-SF-MN',
    priority: 10,
    notes: `AW side_frame override for ${c} → MN`,
    qty_key: 'qty_sf',
    active: true,
  }));
}

function awFSection(prefix, systemType, qtyKey = 'qty_fsec') {
  return AW_COLOURS.map(c => ({
    product_system_type: systemType,
    selector_key: `${prefix}_fsec_${c.toLowerCase()}`,
    component_category: 'f_section',
    selector_type: 'exact',
    match_json: { colour_code: c },
    sku_pattern: 'QS-5800-F-MN',
    priority: 10,
    notes: `AW f_section override for ${c} → MN`,
    qty_key: qtyKey,
    active: true,
  }));
}

function awRail(prefix, systemType) {
  return AW_COLOURS.map(c => ({
    product_system_type: systemType,
    selector_key: `${prefix}_rail_${c.toLowerCase()}`,
    component_category: 'rail',
    selector_type: 'exact',
    match_json: { colour_code: c },
    sku_pattern: c === 'KWI' ? 'AWQS-5000-HORIZ-KWI' : c === 'WRC' ? 'AWQS-5000-HORIZ-WRC' : 'QS-5000-HORIZ-MN',
    priority: 10,
    notes: `AW rail override for ${c}`,
    qty_key: 'qty_rail',
    active: true,
  }));
}

function awPosts(prefix, systemType) {
  const overrides = [];
  const postDefs = [
    { qty_key: 'qty_post_50_2400', kwi_sku: 'AW-5800-FP-KWI', wrc_sku: 'AW-5800-FP-WRC', ig_sku: 'XP-2400-FP-MN', suffix: '50_2400' },
    { qty_key: 'qty_post_50_6000', kwi_sku: 'AW-5800-FP-KWI', wrc_sku: 'AW-5800-FP-WRC', ig_sku: 'XP-6000-FP-MN', suffix: '50_6000' },
    { qty_key: 'qty_post_65_2400', kwi_sku: 'AW-5800-65HD-KWI', wrc_sku: 'AW-5800-65HD-WRC', ig_sku: 'XP-2400-65HD-MN', suffix: '65_2400' },
    { qty_key: 'qty_post_65_6000', kwi_sku: 'AW-5800-65HD-KWI', wrc_sku: 'AW-5800-65HD-WRC', ig_sku: 'XP-6000-65HD-MN', suffix: '65_6000' },
  ];
  for (const pd of postDefs) {
    const skuMap = { KWI: pd.kwi_sku, WRC: pd.wrc_sku, IG: pd.ig_sku };
    for (const c of AW_COLOURS) {
      overrides.push({
        product_system_type: systemType,
        selector_key: `${prefix}_post_${pd.suffix}_${c.toLowerCase()}`,
        component_category: 'post',
        selector_type: 'exact',
        match_json: { colour_code: c },
        sku_pattern: skuMap[c],
        priority: 10,
        notes: `AW post override for ${c} — ${pd.suffix}`,
        qty_key: pd.qty_key,
        active: true,
      });
    }
  }
  return overrides;
}

function awPostAccessories(prefix, systemType) {
  const overrides = [];
  const accDefs = [
    { qty_key: 'qty_top_plate_50',      sku: 'XP-TP-MN',       suffix: 'tp_50' },
    { qty_key: 'qty_base_plate_50',     sku: 'XP-BP-SET-MN',   suffix: 'bp_50' },
    { qty_key: 'qty_domical_cover_50',  sku: 'XP-DC-2P-MN',    suffix: 'dc_50' },
    { qty_key: 'qty_dress_ring_50',     sku: 'XP-DR-MN',       suffix: 'dr_50' },
    { qty_key: 'qty_top_plate_65',      sku: 'XP-65TP-MN',     suffix: 'tp_65' },
    { qty_key: 'qty_base_plate_65',     sku: 'XP-65BP-SET-MN', suffix: 'bp_65' },
    { qty_key: 'qty_domical_cover_65',  sku: 'XP-65DC-2P-MN',  suffix: 'dc_65' },
    { qty_key: 'qty_dress_ring_65',     sku: 'XP-65DR-MN',     suffix: 'dr_65' },
  ];
  for (const ad of accDefs) {
    for (const c of AW_COLOURS) {
      overrides.push({
        product_system_type: systemType,
        selector_key: `${prefix}_${ad.suffix}_${c.toLowerCase()}`,
        component_category: 'post_accessory',
        selector_type: 'exact',
        match_json: { colour_code: c },
        sku_pattern: ad.sku,
        priority: 10,
        notes: `AW post_accessory override for ${c} → ${ad.sku}`,
        qty_key: ad.qty_key,
        active: true,
      });
    }
  }
  return overrides;
}

// ── Update colour_code variable ───────────────────────────────────────────────
function updateColourCodeVar(vars) {
  return vars.map(v => {
    if (v.name !== 'colour_code') return v;
    return { ...v, options_json: [], options_group: 'colours' };
  });
}

// ── Add finish_type variable ──────────────────────────────────────────────────
function addFinishType(vars, systemType, alumawoodEnabled) {
  if (vars.some(v => v.name === 'finish_type')) return vars;
  const entry = {
    product_system_type: systemType,
    name: 'finish_type',
    label: 'Finish',
    data_type: 'enum',
    unit: null,
    required: true,
    default_value_json: 'standard',
    options_json: alumawoodEnabled ? ['standard', 'alumawood'] : ['standard'],
    scope: 'job',
    sort_order: 5,
    active: true,
  };
  return [entry, ...vars];
}

// ── Process each product ──────────────────────────────────────────────────────

// QSHS — full 48 overrides
{
  const d = load('qshs');
  d.product_variables = addFinishType(updateColourCodeVar(d.product_variables), 'QSHS', true);
  d.product_component_selectors = [
    ...d.product_component_selectors,
    ...awSlat('qshs', 'QSHS'),
    ...awCsr('qshs', 'QSHS'),
    ...awSideFrame('qshs', 'QSHS'),
    ...awFSection('qshs', 'QSHS'),
    ...awPosts('qshs', 'QSHS'),
    ...awPostAccessories('qshs', 'QSHS'),
  ];
  save('qshs', d);
}

// VS — same minus CSR, plus 3 rail overrides
{
  const d = load('vs');
  d.product_variables = addFinishType(updateColourCodeVar(d.product_variables), 'VS', true);
  d.product_component_selectors = [
    ...d.product_component_selectors,
    ...awSlat('vs', 'VS'),
    ...awRail('vs', 'VS'),
    ...awSideFrame('vs', 'VS'),
    ...awFSection('vs', 'VS'),
    ...awPosts('vs', 'VS'),
    ...awPostAccessories('vs', 'VS'),
  ];
  save('vs', d);
}

// XPL — slat + standard posts + post_accessories; add warning for patented XPL posts
{
  const d = load('xpl');
  d.product_variables = addFinishType(updateColourCodeVar(d.product_variables), 'XPL', true);
  d.product_component_selectors = [
    ...d.product_component_selectors,
    ...awSlat('xpl_aw', 'XPL'),
    ...awPosts('xpl_aw', 'XPL'),
    ...awPostAccessories('xpl_aw', 'XPL'),
  ];
  // Add warning about patented XPL post system not having Alumawood variants
  if (!d.product_warnings.some(w => w.warning_key === 'xpl_aw_post_no_variant')) {
    d.product_warnings.push({
      product_system_type: 'XPL',
      warning_key: 'xpl_aw_post_no_variant',
      severity: 'warning',
      condition_json: { finish_type: 'alumawood' },
      message: 'Alumawood finish: the patented XPL track-and-clip posts (XPL-6000-1W, XPL-6000-2W, XPL-6000-90) are not available in KWI/WRC/IG. Standard posts (XP-FP, XP-65HD) will be supplied in Monument Matt for Alumawood colours.',
      active: true,
    });
  }
  save('xpl', d);
}

// BAYG — just add finish_type + update colour_code (already has AW selectors)
{
  const d = load('bayg');
  d.product_variables = addFinishType(updateColourCodeVar(d.product_variables), 'BAYG', true);
  save('bayg', d);
}

// QS_GATE — finish_type standard only + update colour_code
{
  const d = load('qs_gate');
  d.product_variables = addFinishType(updateColourCodeVar(d.product_variables), 'QS_GATE', false);
  save('qs_gate', d);
}

// XPSG_GATE — finish_type standard only + update colour_code
{
  const d = load('xpsg_gate');
  d.product_variables = addFinishType(updateColourCodeVar(d.product_variables), 'XPSG', false);
  save('xpsg_gate', d);
}

console.log('\nAll product files updated.');
