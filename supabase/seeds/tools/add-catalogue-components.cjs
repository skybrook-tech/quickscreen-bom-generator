#!/usr/bin/env node
/**
 * Adds missing product_components (and null-priced pricing_rules) from the
 * catalogue gap analysis to the seed JSON files.
 *
 * Usage:  node add-catalogue-components.js [--dry-run]
 *
 * Pass --dry-run to print a summary without writing files.
 */

const fs = require("fs");
const path = require("path");

const SEEDS_DIR = path.resolve(__dirname, "../glass-outlet/products");
const DRY_RUN = process.argv.includes("--dry-run");

// ─── colour helpers ──────────────────────────────────────────────────────────

const COLOUR_NAMES = {
  B: "Black Satin",
  MN: "Monument Matt",
  G: "Woodland Grey Matt",
  SM: "Surfmist Matt",
  W: "Pearl White Gloss",
  BS: "Basalt Satin",
  D: "Dune Satin",
  M: "Mill",
  P: "Primrose",
  PB: "Paperbark",
  S: "Palladium Silver Pearl",
  KWI: "Kwila",
  WRC: "Western Red Cedar",
  IG: "Island Grey",
  TR: "Terrain",
};

function colourName(code) {
  return COLOUR_NAMES[code] || code;
}

// Build pricing_rules rows for a sku (price: 0 = TBC, DB column is NOT NULL)
function nullPricing(sku) {
  return ["tier1", "tier2", "tier3"].map((tier_code) => ({
    sku,
    tier_code,
    rule: null,
    price: 0,
    priority: 0,
    valid_from: null,
    valid_to: null,
    notes: "Price TBC — not yet in supplier price list.",
    active: true,
  }));
}

// Build n coloured variants of a component
function coloured(colours, skuFn, nameFn, descFn, category, unit, systemTypes, extra = {}) {
  return colours.map((c) => ({
    sku: skuFn(c),
    name: nameFn(c),
    description: descFn(c),
    category,
    unit,
    default_price: null,
    system_types: systemTypes,
    metadata: { colour: c, ...extra },
    active: true,
  }));
}

// ─── QSHS additions ──────────────────────────────────────────────────────────

const QSHS_STANDARD_COLOURS = ["B", "MN", "G", "SM", "W", "BS", "D", "M", "S"];
const QSHS_ALL_COLOURS = ["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"];
const ARMSF_COLOURS = ["B", "MN", "G", "SM", "M", "S"];
const SFCAP_COLOURS = ["B", "MN", "G", "SM", "W", "BS", "D"];

const qshsNewComponents = [
  // ── 135° corner adapter ──────────────────────────────────────────────────
  ...coloured(
    QSHS_STANDARD_COLOURS,
    (c) => `XP-6000-135-${c}`,
    (c) => `135° Angle Adapter 6000mm — ${colourName(c)}`,
    (c) => `Alloy 6060-T5 135° adapter for corner installations. 6000mm long. ${colourName(c)} powder coat.`,
    "accessory",
    "length",
    ["QSHS", "VS"],
  ),

  // ── Per-colour side frame top caps ───────────────────────────────────────
  ...coloured(
    SFCAP_COLOURS,
    (c) => `QS-SFCAP-${c}-2PK`,
    (c) => `Side Frame Top Cap ${colourName(c)} — 2 Pack`,
    (c) => `Nylon side frame top cap, ${colourName(c)}. 1× left + 1× right per pack. Suits QS-5800-SF.`,
    "accessory",
    "pack",
    ["QSHS", "VS", "BAYG"],
    { cap_count: 2 },
  ),

  // ── Louvre brackets ──────────────────────────────────────────────────────
  ...coloured(
    QSHS_STANDARD_COLOURS,
    (c) => `QS-LB-${c}`,
    (c) => `Louvre Bracket ${colourName(c)} — 1 Pair`,
    (c) => `Die-cast aluminium louvre bracket. 1× left + 1× right. Creates fixed 40° louvre finish on 65mm slats. ${colourName(c)}.`,
    "accessory",
    "pack",
    ["QSHS", "VS", "XPL"],
  ),

  // ── Side frame mounting arm ──────────────────────────────────────────────
  ...coloured(
    ARMSF_COLOURS,
    (c) => `XP-ARMSF-${c}`,
    (c) => `Side Frame Mounting Arm 200mm — ${colourName(c)}`,
    (c) => `200mm wide welded fixing arm for mounting side frames off substrate. 2× fixing plates incl. ${colourName(c)}.`,
    "bracket",
    "each",
    ["QSHS", "XPL", "VS"],
  ),

  // ── 65mm slat 6500mm extended pack lot ───────────────────────────────────
  ...coloured(
    QSHS_ALL_COLOURS,
    (c) => `XP-6500-E65-${c}`,
    (c) => `65mm Slat 6500mm Pack Lot — ${colourName(c)}`,
    (c) => `65×16.5mm horizontal slat with centre web. 6500mm long. Alloy 6063-T6. Sold in pack lots of 96. ${colourName(c)}.`,
    "slat",
    "pack",
    ["QSHS", "XPL"],
    { slat_size_mm: 65, slat_length_mm: 6500 },
  ),

  // ── 65mm flat end caps 4-pack ─────────────────────────────────────────────
  ...coloured(
    QSHS_ALL_COLOURS,
    (c) => `XP-EC65-4PK-${c}`,
    (c) => `65mm Slat Flat End Cap ${colourName(c)} — 4 Pack`,
    (c) => `ADC12 aluminium flat end cap for 65×16.5mm slats. Press-fit with polymer insert. 4 per pack. ${colourName(c)}.`,
    "accessory",
    "pack",
    ["QSHS", "XPL", "VS"],
    { slat_size_mm: 65, cap_count: 4 },
  ),

  // ── 90mm flat end caps 4-pack ─────────────────────────────────────────────
  ...coloured(
    QSHS_STANDARD_COLOURS,
    (c) => `XP-EC90-4PK-${c}`,
    (c) => `90mm Slat Flat End Cap ${colourName(c)} — 4 Pack`,
    (c) => `ADC12 aluminium flat end cap for 90×16mm slats. Press-fit with polymer insert. 4 per pack. ${colourName(c)}.`,
    "accessory",
    "pack",
    ["QSHS", "VS"],
    { slat_size_mm: 90, cap_count: 4 },
  ),

  // ── Federation topper ────────────────────────────────────────────────────
  {
    sku: "XP-FEDTOP-4PK-W",
    name: "Federation Topper Pearl White — 4 Pack",
    description: "ADC12 aluminium federation-style topper for 65mm slats. Creates vertical picket-fence look. Pearl White Gloss. 4 per pack.",
    category: "accessory",
    unit: "pack",
    default_price: null,
    system_types: ["QSHS", "XPL", "VS"],
    metadata: { colour: "W", slat_size_mm: 65, cap_count: 4 },
    active: true,
  },
  {
    sku: "XP-FEDTOP-4PK-M",
    name: "Federation Topper Mill — 4 Pack",
    description: "ADC12 aluminium federation-style topper for 65mm slats. Creates vertical picket-fence look. Mill finish. 4 per pack.",
    category: "accessory",
    unit: "pack",
    default_price: null,
    system_types: ["QSHS", "XPL", "VS"],
    metadata: { colour: "M", slat_size_mm: 65, cap_count: 4 },
    active: true,
  },
];

// ─── XPL additions ───────────────────────────────────────────────────────────

const XPL_COLOURS = ["B", "MN", "G", "SM", "W", "BS", "D", "M", "S"];

const xplNewComponents = [
  // ── U-channel (method 2 wall-to-wall) ────────────────────────────────────
  ...coloured(
    XPL_COLOURS,
    (c) => `XPL-6000-U-${c}`,
    (c) => `Xpress Plus U-Channel 6000mm — ${colourName(c)}`,
    (c) => `6000mm Alloy 6063-T5 U-channel. Used for Method 2 wall-to-wall XPL side frame installation. 33mm × 30mm. ${colourName(c)}.`,
    "extrusion",
    "length",
    ["XPL"],
  ),

  // ── F-section (method 2 void/cavity) ─────────────────────────────────────
  ...coloured(
    XPL_COLOURS,
    (c) => `XPL-6000-F-${c}`,
    (c) => `Xpress Plus F-Section 6000mm — ${colourName(c)}`,
    (c) => `6000mm Alloy 6060-T5 F-section. Method 2 alternative, ideal for void/cavity installations. 48mm × 32mm. ${colourName(c)}.`,
    "extrusion",
    "length",
    ["XPL"],
  ),

  // ── Premium 9mm aluminium insert ─────────────────────────────────────────
  ...coloured(
    XPL_COLOURS,
    (c) => `XPL-2100-INS09-${c}`,
    (c) => `Xpress Plus Premium Insert 9mm 2100mm — ${colourName(c)}`,
    (c) => `2100mm Alloy 6063-T6 aluminium insert. Slides into XPL side frame for precision 9mm spacing. 65mm slats only. ${colourName(c)}.`,
    "insert",
    "length",
    ["XPL"],
    { gap_mm: 9, slat_size_mm: 65 },
  ),

  // ── Premium 20mm aluminium insert ────────────────────────────────────────
  ...coloured(
    XPL_COLOURS,
    (c) => `XPL-2100-INS20-${c}`,
    (c) => `Xpress Plus Premium Insert 20mm 2100mm — ${colourName(c)}`,
    (c) => `2100mm Alloy 6063-T6 aluminium insert. Slides into XPL side frame for precision 20mm spacing. 65mm slats only. ${colourName(c)}.`,
    "insert",
    "length",
    ["XPL"],
    { gap_mm: 20, slat_size_mm: 65 },
  ),

  // ── 1000mm snap-in spacer block ───────────────────────────────────────────
  {
    sku: "XPL-1000-BLOCK",
    name: "Xpress Plus 1000mm Spacer Block",
    description: "1000mm ABS snap-in spacer block. Snaps into XPL post pocket to set starting height of first slat. Cut to any custom height. Black.",
    category: "accessory",
    unit: "each",
    default_price: null,
    system_types: ["XPL"],
    metadata: { block_length_mm: 1000 },
    active: true,
  },

  // ── Hinge panel brace screws ─────────────────────────────────────────────
  ...coloured(
    XPL_COLOURS,
    (c) => `XPL-SCHEX-12PK-${c}`,
    (c) => `Hinge Panel Brace Screws 12Gx40mm ${colourName(c)} — 12 Pack`,
    (c) => `12Gx40mm self-drilling hex screws. Fix through post and slat on hinging panel adjacent to XPL gate. 12 per pack. ${colourName(c)}.`,
    "fixing",
    "pack",
    ["XPL"],
    { screw_count: 12 },
  ),

  // ── CSR mounting arm for XPL ─────────────────────────────────────────────
  ...coloured(
    ["B", "MN", "G", "SM", "W", "M"],
    (c) => `XP-ARMCSR-${c}`,
    (c) => `CSR Mounting Arm 192mm — ${colourName(c)}`,
    (c) => `192mm shorter arm designed for mounting CSR alongside XPL side frames with 200mm support arms. Wall-side plate rotated horizontally. ${colourName(c)}.`,
    "bracket",
    "each",
    ["XPL"],
  ),
];

// ─── BAYG additions ──────────────────────────────────────────────────────────

const baygNewComponents = [
  // ── Island Grey 65mm fence slat ──────────────────────────────────────────
  {
    sku: "AW-5800-S65-IG",
    name: "Alumawood 65mm Slat Island Grey 5800mm",
    description: "65×16.5mm Alumawood slat with centre web. 5800mm. Alloy 6063-T6. Interpon base + Italian image film. Island Grey.",
    category: "slat",
    unit: "length",
    default_price: null,
    system_types: ["BAYG"],
    metadata: { colour: "IG", slat_size_mm: 65, slat_length_mm: 5800 },
    active: true,
  },

  // ── Island Grey 65mm gate blade slat ─────────────────────────────────────
  {
    sku: "AW-5800-GB65-IG",
    name: "Alumawood 65mm Gate Blade Slat Island Grey 5800mm",
    description: "65×16.5mm gate blade slat with centre web + 2× screw flutes. 5800mm. For Alumawood gate assembly. Island Grey.",
    category: "gate_slat",
    unit: "length",
    default_price: null,
    system_types: ["BAYG"],
    metadata: { colour: "IG", slat_size_mm: 65, slat_length_mm: 5800 },
    active: true,
  },

  // ── Kwila gate blade slat ─────────────────────────────────────────────────
  {
    sku: "AW-5800-GB65-KWI",
    name: "Alumawood 65mm Gate Blade Slat Kwila 5800mm",
    description: "65×16.5mm gate blade slat with centre web + 2× screw flutes. 5800mm. For Alumawood gate assembly. Kwila.",
    category: "gate_slat",
    unit: "length",
    default_price: null,
    system_types: ["BAYG"],
    metadata: { colour: "KWI", slat_size_mm: 65, slat_length_mm: 5800 },
    active: true,
  },

  // ── WRC gate blade slat ───────────────────────────────────────────────────
  {
    sku: "AW-5800-GB65-WRC",
    name: "Alumawood 65mm Gate Blade Slat Western Red Cedar 5800mm",
    description: "65×16.5mm gate blade slat with centre web + 2× screw flutes. 5800mm. For Alumawood gate assembly. Western Red Cedar.",
    category: "gate_slat",
    unit: "length",
    default_price: null,
    system_types: ["BAYG"],
    metadata: { colour: "WRC", slat_size_mm: 65, slat_length_mm: 5800 },
    active: true,
  },

  // ── Timber lag fixing kit ─────────────────────────────────────────────────
  {
    sku: "S-110LAG-4PK",
    name: "Timber Fixing Kit SS316 — 4 Pack",
    description: "M10×110mm SS316 timber lag screws with nuts and washers. 4 per pack. Suits Alumawood base plate fixing holes.",
    category: "hardware",
    unit: "pack",
    default_price: null,
    system_types: ["BAYG", "QSHS"],
    metadata: {},
    active: true,
  },

  // ── Concrete threaded rod fixing kit ─────────────────────────────────────
  {
    sku: "S-120ROD-4PK",
    name: "Concrete Fixing Kit SS316 — 4 Pack",
    description: "M10×120mm SS316 concrete threaded rods with nuts and washers. 4 per pack. Suits Alumawood base plate fixing holes.",
    category: "hardware",
    unit: "pack",
    default_price: null,
    system_types: ["BAYG", "QSHS"],
    metadata: {},
    active: true,
  },
];

// ─── QS_GATE additions ───────────────────────────────────────────────────────

const GATE_COLOURS = ["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"];
const GATE_COLOURS_STANDARD = ["B", "MN", "G", "SM", "W", "BS", "D", "M", "S"];

const gateNewComponents = [
  // ── Horizontal gate rail 65mm ─────────────────────────────────────────────
  ...coloured(
    GATE_COLOURS,
    (c) => `QSG-4800-RAIL65-${c}`,
    (c) => `QSG Gate Rail 65mm 4800mm — ${colourName(c)}`,
    (c) => `4800mm top/bottom horizontal gate rail for 65mm (and 90mm) slats. Alloy. Non-weld joiner block assembly. ${colourName(c)}.`,
    "gate_rail",
    "length",
    ["GATE"],
  ),

  // ── Horizontal gate rail 90mm ─────────────────────────────────────────────
  ...coloured(
    GATE_COLOURS,
    (c) => `QSG-4800-RAIL90-${c}`,
    (c) => `QSG Gate Rail 90mm 4800mm — ${colourName(c)}`,
    (c) => `4800mm top/bottom horizontal gate rail for 90mm slats. Non-weld joiner block assembly. ${colourName(c)}.`,
    "gate_rail",
    "length",
    ["GATE"],
  ),

  // ── Snap-on screw cover ───────────────────────────────────────────────────
  ...coloured(
    GATE_COLOURS_STANDARD,
    (c) => `QSG-4200-COVER-${c}`,
    (c) => `QSG Gate Screw Cover 4200mm — ${colourName(c)}`,
    (c) => `Snap-in cover 4200mm. Mates with gate side frame and top/bottom rails to conceal slat fixing screws. Alloy 6060-T5. ${colourName(c)}.`,
    "gate_cover",
    "length",
    ["GATE"],
  ),

  // ── Snap-in infill ────────────────────────────────────────────────────────
  ...coloured(
    GATE_COLOURS_STANDARD,
    (c) => `QSG-4800-INF-${c}`,
    (c) => `QSG Gate Infill 4800mm — ${colourName(c)}`,
    (c) => `Snap-in infill 4800mm. Fills unused channels in gate side frame or rails. Alloy 6060-T5. ${colourName(c)}.`,
    "gate_infill",
    "length",
    ["GATE"],
  ),

  // ── Curved infill for vertical slat gates ────────────────────────────────
  ...coloured(
    GATE_COLOURS_STANDARD,
    (c) => `QSG-4200-CINF-${c}`,
    (c) => `QSG Gate Curved Infill 4200mm — ${colourName(c)}`,
    (c) => `Snap-in curved infill 4200mm for vertical slat gate fabrications. 50mm extended channel. Alloy 6060-T5. ${colourName(c)}.`,
    "gate_infill",
    "length",
    ["GATE"],
  ),

  // ── Rail screws ───────────────────────────────────────────────────────────
  {
    sku: "AR-SCR-BR-50PK",
    name: "Gate Rail Screws SS304HC — 50 Pack",
    description: "12Gx25mm panhead screws with square drive. SS304HC. Secures joiner blocks to gate side frame. 50 per pack.",
    category: "fixing",
    unit: "pack",
    default_price: null,
    system_types: ["GATE"],
    metadata: { screw_count: 50 },
    active: true,
  },

  // ── Gate stop rubber ──────────────────────────────────────────────────────
  {
    sku: "XP-GATESTOP-RUB",
    name: "Gate Stop Rubber 4300mm",
    description: "Rubber bumper extrusion 4300mm. Feeds into cavity of XP-4200-GSTOP. Cut to required length.",
    category: "accessory",
    unit: "length",
    default_price: null,
    system_types: ["GATE"],
    metadata: {},
    active: true,
  },

  // ── Countersunk gate stop rivet ───────────────────────────────────────────
  {
    sku: "XP-GATESTOP-RIV-10PK",
    name: "Gate Stop Countersunk Rivet — 10 Pack",
    description: "4.0×8.4 countersunk aluminium rivet. Use when affixing gate stop to post with Lockwood 001 deadlatch lockbox (avoids screw head interference). 10 per pack.",
    category: "fixing",
    unit: "pack",
    default_price: null,
    system_types: ["GATE"],
    metadata: { rivet_count: 10 },
    active: true,
  },

  // ── Lockwood 001 deadlatch ────────────────────────────────────────────────
  {
    sku: "XP-DL001",
    name: "Lockwood 001 Deadlatch",
    description: "Market leading Lockwood 001 deadlatch for metal gate frames. Inwards-swinging gate only. Cut-resistant SS bolt.",
    category: "latch",
    unit: "each",
    default_price: null,
    system_types: ["GATE"],
    metadata: { handing: "inward_only" },
    active: true,
  },

  // ── Lockwood round knob set ───────────────────────────────────────────────
  {
    sku: "XP-HDL-LW534",
    name: "Lockwood Round Knob Set (Model 534)",
    description: "High purity zinc alloy. Keyed both sides. Satin Chrome brushed. C4 5-pin outside, 6-pin restricted inside. Suits left or right gate opening.",
    category: "latch",
    unit: "set",
    default_price: null,
    system_types: ["GATE"],
    metadata: {},
    active: true,
  },

  // ── Stanley round knob set ────────────────────────────────────────────────
  {
    sku: "XP-HDL-KNOB",
    name: "Stanley Round Knob Set (Stainless Steel)",
    description: "SS304 knob set keyed both sides. Suits left or right gate opening. C4 6-pin restricted compatible.",
    category: "latch",
    unit: "set",
    default_price: null,
    system_types: ["GATE"],
    metadata: {},
    active: true,
  },

  // ── Stanley lever set ─────────────────────────────────────────────────────
  {
    sku: "XP-HDL-LEVER",
    name: "Stanley Lever Set (Stainless Steel)",
    description: "SS304 lever set keyed both sides. Suits left or right gate opening. C4 6-pin restricted compatible.",
    category: "latch",
    unit: "set",
    default_price: null,
    system_types: ["GATE"],
    metadata: {},
    active: true,
  },

  // ── Electric striker kit ──────────────────────────────────────────────────
  {
    sku: "XP-HDL-ES",
    name: "Electric Striker Kit",
    description: "Optional electric striker for gate. 12V DC. Left or right handing. SS304 latching post face mount. Power required to lock/unlock. Compatible with XP-HDL-LW534, XP-HDL-KNOB, XP-HDL-LEVER.",
    category: "latch",
    unit: "each",
    default_price: null,
    system_types: ["GATE"],
    metadata: { voltage: "12V_DC" },
    active: true,
  },

  // ── Nylon packer (for D&D Lokk Latch Deluxe) ─────────────────────────────
  {
    sku: "XP-PACKER",
    name: "Nylon Packer for Lokk Latch Deluxe",
    description: "UV-stabilised nylon packer. Must be used when installing D&D Lokk Latch Deluxe. Aligns latch with gate side frame.",
    category: "accessory",
    unit: "each",
    default_price: null,
    system_types: ["GATE"],
    metadata: {},
    active: true,
  },

  // ── Gate frame cap (nylon) variants ──────────────────────────────────────
  {
    sku: "XP-GFC-B",
    name: "Gate Frame Cap Black (Nylon)",
    description: "UV-stabilised nylon 3mm cap for gate side frame. Black. Press-in flat cap.",
    category: "accessory",
    unit: "each",
    default_price: null,
    system_types: ["GATE"],
    metadata: { colour: "B" },
    active: true,
  },
  {
    sku: "XP-GFC-MN",
    name: "Gate Frame Cap Monument (Nylon)",
    description: "UV-stabilised nylon 3mm cap for gate side frame. Monument. Press-in flat cap.",
    category: "accessory",
    unit: "each",
    default_price: null,
    system_types: ["GATE"],
    metadata: { colour: "MN" },
    active: true,
  },

  // ── 9mm gate lockbox kit (lever/knob) ─────────────────────────────────────
  {
    sku: "XP-GKIT-LSET09",
    name: "9mm Gate Lockbox Kit (Lever/Knob Set)",
    description: "Complete gate side frame kit machined for 9mm spacing with lever/knob lockbox. Includes 2× GSF, 2× inserts, gate stops, rubber, caps, screws. Black/MN/G only.",
    category: "gate_kit",
    unit: "kit",
    default_price: null,
    system_types: ["GATE"],
    metadata: { gap_mm: 9 },
    active: true,
  },

  // ── 20mm gate lockbox kit (lever/knob) ────────────────────────────────────
  {
    sku: "XP-GKIT-LSET20",
    name: "20mm Gate Lockbox Kit (Lever/Knob Set)",
    description: "Complete gate side frame kit machined for 20mm spacing with lever/knob lockbox. Includes 2× GSF, 2× inserts, gate stops, rubber, caps, screws. Black/MN/G only.",
    category: "gate_kit",
    unit: "kit",
    default_price: null,
    system_types: ["GATE"],
    metadata: { gap_mm: 20 },
    active: true,
  },

  // ── Alumawood deadlatch lockbox ───────────────────────────────────────────
  {
    sku: "AW-LBOX-DL-TR",
    name: "Alumawood Deadlatch Lockbox Terrain",
    description: "Patented non-weld lockbox for Alumawood horizontal slat gates. Terrain powder coat. Suits 65mm slats with AWXP-4200-GSF09/20. Requires XP-DL001.",
    category: "latch",
    unit: "each",
    default_price: null,
    system_types: ["GATE"],
    metadata: { finish: "TR" },
    active: true,
  },

  // ── Gate wafer screws (colour-coded 100-pack) ─────────────────────────────
  {
    sku: "XP-SCREWS-B",
    name: "Gate Wafer Screws Black — 100 Pack",
    description: "10Gx16mm self-drilling wafer head zinc plated screws, powder coated Black. 100 per pack.",
    category: "fixing",
    unit: "pack",
    default_price: null,
    system_types: ["GATE"],
    metadata: { colour: "B", screw_count: 100 },
    active: true,
  },
  {
    sku: "XP-SCREWS-MN",
    name: "Gate Wafer Screws Monument — 100 Pack",
    description: "10Gx16mm self-drilling wafer head zinc plated screws, powder coated Monument. 100 per pack.",
    category: "fixing",
    unit: "pack",
    default_price: null,
    system_types: ["GATE"],
    metadata: { colour: "MN", screw_count: 100 },
    active: true,
  },

  // ── Gate frame hex screws ─────────────────────────────────────────────────
  {
    sku: "XP-SCREWSGF-10PK",
    name: "Gate Frame Screws 12Gx65mm — 10 Pack",
    description: "12Gx65mm hex flange head screws. Secures gate slats to side frames through pre-machined holes. 10 per pack.",
    category: "fixing",
    unit: "pack",
    default_price: null,
    system_types: ["GATE"],
    metadata: { screw_count: 10 },
    active: true,
  },
];

// ─── XPSG sliding gate (new file) ────────────────────────────────────────────
// This is created as a separate product file.

// ─── Writer ──────────────────────────────────────────────────────────────────

function addToFile(filename, newComponents) {
  const filepath = path.join(SEEDS_DIR, filename);
  const data = JSON.parse(fs.readFileSync(filepath, "utf8"));

  // Collect existing SKUs to avoid duplicates
  const existing = new Set(data.product_components.map((c) => c.sku));

  const toAdd = newComponents.filter((c) => {
    if (existing.has(c.sku)) {
      console.log(`  SKIP (exists): ${c.sku}`);
      return false;
    }
    return true;
  });

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would add ${toAdd.length} components to ${filename}:`);
    toAdd.forEach((c) => console.log(`  + ${c.sku}`));
    return;
  }

  if (toAdd.length === 0) {
    console.log(`\n${filename}: nothing to add (all already present)`);
    return;
  }

  // Append components
  data.product_components.push(...toAdd);

  // Append null pricing rules for each new component
  const newPricingRules = toAdd.flatMap((c) => nullPricing(c.sku));
  data.pricing_rules.push(...newPricingRules);

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`\n${filename}: added ${toAdd.length} components + ${newPricingRules.length} pricing rows`);
  toAdd.forEach((c) => console.log(`  + ${c.sku}`));
}

// ─── Run ─────────────────────────────────────────────────────────────────────

console.log("=== Adding catalogue components to seed files ===\n");

addToFile("qshs.json", qshsNewComponents);
addToFile("xpl.json", xplNewComponents);
addToFile("bayg.json", baygNewComponents);
addToFile("qs_gate.json", gateNewComponents);

console.log("\nDone.");
