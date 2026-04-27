#!/usr/bin/env node
/**
 * Fixes missing BOM-impacting components and selector overrides:
 * 1. Missing P/PB colour variants for QSHS post accessories (not 65HD posts — unavailable)
 * 2. Missing P/PB for XPL-specific posts (XPL-6000-2W, XPL-6000-90)
 * 3. Missing P/PB/S for VS horizontal rail (QS-5000-HORIZ)
 * 4. BAYG KWI/WRC/IG priority selector overrides (slats, CSR, SF, F-sec, posts, plates)
 * 5. Warnings for 65HD posts unavailable in P/PB
 */

const fs = require("fs");
const path = require("path");
const SEEDS = path.resolve(__dirname, "../glass-outlet/products");

function load(f) {
  return JSON.parse(fs.readFileSync(path.join(SEEDS, f)));
}
function save(f, d) {
  fs.writeFileSync(path.join(SEEDS, f), JSON.stringify(d, null, 2));
}

function pricingRows(sku, price = 0) {
  return ["tier1", "tier2", "tier3"].map((t) => ({
    sku, tier_code: t, rule: null, price,
    priority: 0, valid_from: null, valid_to: null,
    notes: price === 0 ? "Price TBC — not yet in supplier price list." : null,
    active: true,
  }));
}

function cloneColour(base, newColour, newColourName, overrides = {}) {
  const suffixRe = /-[A-Z]+$/;
  const newSku = base.sku.replace(suffixRe, `-${newColour}`);
  const newName = base.name.replace(/— \w.*$/, `— ${newColourName}`);
  return {
    ...base,
    sku: newSku,
    name: newName,
    metadata: { ...base.metadata, colour: newColour },
    default_price: 0,
    ...overrides,
  };
}

const COLOUR_NAMES = {
  P: "Primrose", PB: "Paperbark", S: "Palladium Silver Pearl",
  BS: "Basalt Satin", D: "Dune Satin", M: "Mill",
};

// ─── 1. QSHS: missing colour variants ────────────────────────────────────────

const qshs = load("qshs.json");
const qshsSkus = new Set(qshs.product_components.map((c) => c.sku));

const qshsMissing = [
  // XP-CSRC: has B,MN,G,SM,W,S — missing BS,D,M,P,PB
  { base: "XP-CSRC-B",     colours: ["BS", "D", "M", "P", "PB"] },
  // XP-BTP: has B,MN,G,SM,W,BS,D,S — missing P,PB
  { base: "XP-BTP-B",      colours: ["P", "PB"] },
  // XP-6000-FP: has B,MN,G,SM,W,BS,D,M,S — missing P,PB
  { base: "XP-6000-FP-B",  colours: ["P", "PB"] },
  // Post accessories — P/PB variants (accessories independent of post availability)
  // XP-TP: has B,MN,G,SM,W,BS,D,M,S,PB — missing P only
  { base: "XP-TP-B",       colours: ["P"] },
  // XP-DC-2P: has B,MN,G,SM,W,BS,D,M,S — missing P,PB
  { base: "XP-DC-2P-B",    colours: ["P", "PB"] },
  // XP-65TP: missing P,PB
  { base: "XP-65TP-B",     colours: ["P", "PB"] },
  // XP-65BP-SET: missing P,PB
  { base: "XP-65BP-SET-B", colours: ["P", "PB"] },
  // XP-65DC-2P: missing P,PB
  { base: "XP-65DC-2P-B",  colours: ["P", "PB"] },
  // XP-65DR: missing P,PB
  { base: "XP-65DR-B",     colours: ["P", "PB"] },
];

let qshsAdded = 0;
qshsMissing.forEach(({ base, colours }) => {
  const baseComp = qshs.product_components.find((c) => c.sku === base);
  if (!baseComp) { console.warn("Base not found:", base); return; }
  colours.forEach((col) => {
    const cloned = cloneColour(baseComp, col, COLOUR_NAMES[col]);
    if (!qshsSkus.has(cloned.sku)) {
      qshs.product_components.push(cloned);
      qshs.pricing_rules.push(...pricingRows(cloned.sku));
      qshsSkus.add(cloned.sku);
      qshsAdded++;
      console.log("  + " + cloned.sku);
    }
  });
});

// Add warning: 65HD posts not available in P/PB
const hdWarningKey = "hd_post_no_ppb";
if (!qshs.product_warnings.find((w) => w.warning_key === hdWarningKey)) {
  qshs.product_warnings.push({
    product_system_type: "QSHS",
    warning_key: hdWarningKey,
    severity: "warning",
    condition_json: {},  // engine evaluates condition via expression field
    condition_expression: "(colour_code == \"P\" or colour_code == \"PB\") and post_size == \"65\"",
    message: "65×65mm HD posts (XP-2400-65HD, XP-6000-65HD) are not available in Primrose or Paperbark. Change colour or switch to 50×50mm posts.",
    active: true,
  });
  console.log("  + QSHS warning: hd_post_no_ppb");
}

save("qshs.json", qshs);
console.log(`\nqshs.json: +${qshsAdded} components`);

// ─── 2. XPL: missing P/PB for XPL-specific posts ─────────────────────────────

const xpl = load("xpl.json");
const xplSkus = new Set(xpl.product_components.map((c) => c.sku));

const xplMissing = [
  { base: "XPL-6000-2W-B", colours: ["P", "PB"] },
  { base: "XPL-6000-90-B", colours: ["P", "PB"] },
];

let xplAdded = 0;
xplMissing.forEach(({ base, colours }) => {
  const baseComp = xpl.product_components.find((c) => c.sku === base);
  if (!baseComp) { console.warn("Base not found:", base); return; }
  colours.forEach((col) => {
    const cloned = cloneColour(baseComp, col, COLOUR_NAMES[col]);
    if (!xplSkus.has(cloned.sku)) {
      xpl.product_components.push(cloned);
      xpl.pricing_rules.push(...pricingRows(cloned.sku));
      xplSkus.add(cloned.sku);
      xplAdded++;
      console.log("  + " + cloned.sku);
    }
  });
});

save("xpl.json", xpl);
console.log(`\nxpl.json: +${xplAdded} components`);

// ─── 3. VS: missing P/PB/S for QS-5000-HORIZ ─────────────────────────────────

const vs = load("vs.json");
const vsSkus = new Set(vs.product_components.map((c) => c.sku));

const vsBase = vs.product_components.find((c) => c.sku === "QS-5000-HORIZ-B");
let vsAdded = 0;
[["P", "Primrose"], ["PB", "Paperbark"], ["S", "Palladium Silver Pearl"]].forEach(([col, name]) => {
  const cloned = cloneColour(vsBase, col, name);
  if (!vsSkus.has(cloned.sku)) {
    vs.product_components.push(cloned);
    vs.pricing_rules.push(...pricingRows(cloned.sku));
    vsSkus.add(cloned.sku);
    vsAdded++;
    console.log("  + " + cloned.sku);
  }
});

save("vs.json", vs);
console.log(`\nvs.json: +${vsAdded} components`);

// ─── 4. BAYG: KWI/WRC/IG priority selector overrides ─────────────────────────

const bayg = load("bayg.json");

// Check existing selector keys to avoid duplication
const existingSelectors = new Set(
  bayg.product_component_selectors.map(
    (s) => `${s.qty_key}|${JSON.stringify(s.match_json)}|${s.sku_pattern}`
  )
);

// selector_key → category map for the new override selectors
const SELECTOR_META = {
  qty_slat_65:         { selector_key_prefix: "bayg_slat_65",       component_category: "slat" },
  qty_slat_90:         { selector_key_prefix: "bayg_slat_90",       component_category: "slat" },
  qty_csr:             { selector_key_prefix: "bayg_csr",           component_category: "centre_support_rail" },
  qty_sf:              { selector_key_prefix: "bayg_side_frame",    component_category: "side_frame" },
  qty_fsec:            { selector_key_prefix: "bayg_fsec",          component_category: "f_section" },
  qty_post_50_2400:    { selector_key_prefix: "bayg_post_50_2400",  component_category: "post" },
  qty_post_50_6000:    { selector_key_prefix: "bayg_post_50_6000",  component_category: "post" },
  qty_post_65_2400:    { selector_key_prefix: "bayg_post_65_2400",  component_category: "post" },
  qty_post_65_6000:    { selector_key_prefix: "bayg_post_65_6000",  component_category: "post" },
  qty_top_plate_50:    { selector_key_prefix: "bayg_tp_50",         component_category: "post_accessory" },
  qty_base_plate_50:   { selector_key_prefix: "bayg_bp_50",         component_category: "post_accessory" },
  qty_domical_cover_50:{ selector_key_prefix: "bayg_dc_50",         component_category: "post_accessory" },
  qty_dress_ring_50:   { selector_key_prefix: "bayg_dr_50",         component_category: "post_accessory" },
  qty_top_plate_65:    { selector_key_prefix: "bayg_tp_65",         component_category: "post_accessory" },
  qty_base_plate_65:   { selector_key_prefix: "bayg_bp_65",         component_category: "post_accessory" },
  qty_domical_cover_65:{ selector_key_prefix: "bayg_dc_65",         component_category: "post_accessory" },
  qty_dress_ring_65:   { selector_key_prefix: "bayg_dr_65",         component_category: "post_accessory" },
};

// Priority 10 overrides (lower number = tried first; existing selectors are priority 100)
const newSelectors = [
  // ── SLATS ──────────────────────────────────────────────────────────────
  { qty_key: "qty_slat_65", match_json: { colour_code: "KWI" }, sku_pattern: "AW-5800-S65-KWI", priority: 10, notes: "Alumawood Kwila slat — AW-branded stock" },
  { qty_key: "qty_slat_65", match_json: { colour_code: "WRC" }, sku_pattern: "AW-5800-S65-WRC", priority: 10, notes: "Alumawood Western Red Cedar slat — AW-branded stock" },
  { qty_key: "qty_slat_65", match_json: { colour_code: "IG"  }, sku_pattern: "AW-5800-S65-IG",  priority: 10, notes: "Alumawood Island Grey slat — AW-branded stock" },

  // ── CSR ────────────────────────────────────────────────────────────────
  { qty_key: "qty_csr", match_json: { colour_code: "KWI" }, sku_pattern: "AW-5800-CSR-KWI", priority: 10, notes: "AW-branded CSR for Kwila" },
  { qty_key: "qty_csr", match_json: { colour_code: "WRC" }, sku_pattern: "AW-5800-CSR-WRC", priority: 10, notes: "AW-branded CSR for WRC" },
  { qty_key: "qty_csr", match_json: { colour_code: "IG"  }, sku_pattern: "XP-5800-CSR-MN",  priority: 10, notes: "IG jobs use MN-coded XP CSR" },

  // ── SIDE FRAMES ────────────────────────────────────────────────────────
  { qty_key: "qty_sf", match_json: { colour_code: "KWI" }, sku_pattern: "QS-5800-SF-MN", priority: 10, notes: "Timber finish jobs use MN side frames" },
  { qty_key: "qty_sf", match_json: { colour_code: "WRC" }, sku_pattern: "QS-5800-SF-MN", priority: 10, notes: "Timber finish jobs use MN side frames" },
  { qty_key: "qty_sf", match_json: { colour_code: "IG"  }, sku_pattern: "QS-5800-SF-MN", priority: 10, notes: "IG jobs use MN side frames" },

  // ── F-SECTION ──────────────────────────────────────────────────────────
  { qty_key: "qty_fsec", match_json: { colour_code: "KWI" }, sku_pattern: "QS-5800-F-MN", priority: 10 },
  { qty_key: "qty_fsec", match_json: { colour_code: "WRC" }, sku_pattern: "QS-5800-F-MN", priority: 10 },
  { qty_key: "qty_fsec", match_json: { colour_code: "IG"  }, sku_pattern: "QS-5800-F-MN", priority: 10 },

  // ── 50mm POSTS ─────────────────────────────────────────────────────────
  { qty_key: "qty_post_50_2400", match_json: { colour_code: "KWI", post_size: "50" }, sku_pattern: "AW-5800-FP-KWI", priority: 10 },
  { qty_key: "qty_post_50_2400", match_json: { colour_code: "WRC", post_size: "50" }, sku_pattern: "AW-5800-FP-WRC", priority: 10 },
  { qty_key: "qty_post_50_2400", match_json: { colour_code: "IG",  post_size: "50" }, sku_pattern: "XP-2400-FP-MN",  priority: 10 },
  { qty_key: "qty_post_50_6000", match_json: { colour_code: "KWI", post_size: "50" }, sku_pattern: "AW-5800-FP-KWI", priority: 10 },
  { qty_key: "qty_post_50_6000", match_json: { colour_code: "WRC", post_size: "50" }, sku_pattern: "AW-5800-FP-WRC", priority: 10 },
  { qty_key: "qty_post_50_6000", match_json: { colour_code: "IG",  post_size: "50" }, sku_pattern: "XP-6000-FP-MN",  priority: 10 },

  // ── 65mm POSTS ─────────────────────────────────────────────────────────
  { qty_key: "qty_post_65_2400", match_json: { colour_code: "KWI", post_size: "65" }, sku_pattern: "AW-5800-65HD-KWI", priority: 10 },
  { qty_key: "qty_post_65_2400", match_json: { colour_code: "WRC", post_size: "65" }, sku_pattern: "AW-5800-65HD-WRC", priority: 10 },
  { qty_key: "qty_post_65_2400", match_json: { colour_code: "IG",  post_size: "65" }, sku_pattern: "XP-2400-65HD-MN",  priority: 10 },
  { qty_key: "qty_post_65_6000", match_json: { colour_code: "KWI", post_size: "65" }, sku_pattern: "AW-5800-65HD-KWI", priority: 10 },
  { qty_key: "qty_post_65_6000", match_json: { colour_code: "WRC", post_size: "65" }, sku_pattern: "AW-5800-65HD-WRC", priority: 10 },
  { qty_key: "qty_post_65_6000", match_json: { colour_code: "IG",  post_size: "65" }, sku_pattern: "XP-6000-65HD-MN",  priority: 10 },

  // ── POST ACCESSORIES ───────────────────────────────────────────────────
  ...["qty_top_plate_50","qty_base_plate_50","qty_domical_cover_50","qty_dress_ring_50",
      "qty_top_plate_65","qty_base_plate_65","qty_domical_cover_65","qty_dress_ring_65"].flatMap((qty_key) => {
    const skuBase = {
      qty_top_plate_50:      "XP-TP-MN",
      qty_base_plate_50:     "XP-BP-SET-MN",
      qty_domical_cover_50:  "XP-DC-2P-MN",
      qty_dress_ring_50:     "XP-DR-MN",
      qty_top_plate_65:      "XP-65TP-MN",
      qty_base_plate_65:     "XP-65BP-SET-MN",
      qty_domical_cover_65:  "XP-65DC-2P-MN",
      qty_dress_ring_65:     "XP-65DR-MN",
    }[qty_key];
    return [
      { qty_key, match_json: { colour_code: "KWI" }, sku_pattern: skuBase, priority: 10 },
      { qty_key, match_json: { colour_code: "WRC" }, sku_pattern: skuBase, priority: 10 },
      { qty_key, match_json: { colour_code: "IG"  }, sku_pattern: skuBase, priority: 10 },
    ];
  }),
];

// Add product_system_type field and dedup
let baygSelectorsAdded = 0;
newSelectors.forEach((s) => {
  const key = `${s.qty_key}|${JSON.stringify(s.match_json)}|${s.sku_pattern}`;
  if (!existingSelectors.has(key)) {
    const meta = SELECTOR_META[s.qty_key] || { selector_key_prefix: s.qty_key, component_category: "component" };
    const colourSuffix = Object.values(s.match_json).join("_").toLowerCase();
    bayg.product_component_selectors.push({
      product_system_type: "BAYG",
      selector_key: `${meta.selector_key_prefix}_${colourSuffix}`,
      component_category: meta.component_category,
      selector_type: "exact",
      match_json: s.match_json,
      sku_pattern: s.sku_pattern,
      priority: s.priority,
      notes: s.notes || `${colourSuffix} override → ${s.sku_pattern}`,
      qty_key: s.qty_key,
      active: true,
    });
    existingSelectors.add(key);
    baygSelectorsAdded++;
    console.log(`  + BAYG selector: ${s.qty_key} [${JSON.stringify(s.match_json)}] → ${s.sku_pattern}`);
  }
});

save("bayg.json", bayg);
console.log(`\nbayg.json: +${baygSelectorsAdded} selectors`);

console.log("\nDone.");
