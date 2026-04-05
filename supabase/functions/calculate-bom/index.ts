import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { extractJwt, resolveUserProfile } from '../_shared/auth.ts';
import type {
  FenceConfig,
  GateConfig,
  BOMLineItem,
  BOMResult,
  BOMCategory,
  BOMUnit,
  PricingRow,
  PricingTier,
  Colour,
  SlatSize,
  SlatGap,
} from '../_shared/types.ts';

// ─── Colour code map ──────────────────────────────────────────────────────────

const COLOUR_CODES: Record<string, string> = {
  'black-satin':            'B',
  'monument-matt':          'MN',
  'woodland-grey-matt':     'G',
  'surfmist-matt':          'SM',
  'pearl-white-gloss':      'W',
  'basalt-satin':           'BS',
  'dune-satin':             'D',
  'mill':                   'M',
  'primrose':               'P',
  'paperbark':              'PB',
  'palladium-silver-pearl': 'S',
};

// ─── Unpriced line item builder ───────────────────────────────────────────────

function item(
  sku: string,
  description: string,
  quantity: number,
  category: BOMCategory,
  unit: BOMUnit = 'each',
  notes?: string,
): Omit<BOMLineItem, 'unitPrice' | 'lineTotal'> {
  return { sku, description, quantity, category, unit, ...(notes ? { notes } : {}) };
}

// ─── QSHS BOM calculation ─────────────────────────────────────────────────────
//
// Verified formulas from TC1 and TC5 (all assertions confirmed against price
// file and Excel order form formulas). Do not modify without re-running tests.

function calcQSHSBom(fc: FenceConfig): Omit<BOMLineItem, 'unitPrice' | 'lineTotal'>[] {
  const runLengthMm   = fc.totalRunLength * 1000;          // metres → mm
  const maxPanelMm    = parseInt(fc.maxPanelWidth);
  const slatHeightMm  = parseInt(fc.slatSize);
  const slatGapMm     = parseInt(fc.slatGap);
  const cc            = COLOUR_CODES[fc.colour];
  const HEIGHT        = fc.targetHeight;                   // mm
  const SLAT_STOCK    = 6100;                              // mm
  const FRAME_STOCK   = 5800;                              // mm

  // 1. Panel layout — distributed evenly (NOT greedy)
  const panels     = Math.ceil(runLengthMm / maxPanelMm);
  const panelWidth = runLengthMm / panels;                 // mm

  // 2. Post count
  const wallTerminations =
    (fc.leftTermination  === 'wall' ? 1 : 0) +
    (fc.rightTermination === 'wall' ? 1 : 0);
  const posts = (panels + 1) - wallTerminations + fc.corners;

  // 3. Slats
  const slatsPerPanel     = Math.floor(HEIGHT / (slatHeightMm + slatGapMm));
  const totalSlats        = slatsPerPanel * panels;
  const cutsPerSlatStock  = Math.floor(SLAT_STOCK / panelWidth);
  const slatStocks        = Math.ceil(totalSlats / cutsPerSlatStock);

  // 4. Side frames (SF) + CFC — 2 per panel, cut to HEIGHT from FRAME_STOCK
  const cutsPerFrameStock = Math.floor(FRAME_STOCK / HEIGHT);
  const sfStocks          = Math.ceil((2 * panels) / cutsPerFrameStock);
  const cfcStocks         = Math.ceil((2 * panels) / cutsPerFrameStock);

  // 5. CSR — 1 per panel, cut to HEIGHT from FRAME_STOCK
  const csrStocks = Math.ceil(panels / cutsPerFrameStock);

  // 6. Accessories
  const sfcBCaps  = 4 * panels;                                   // 2 caps × 2 frames/panel
  const csrCaps   = panels;                                        // 1 cap per CSR
  const btpPlates = 2 * panels;                                    // 2 plates per CSR
  // Spacer blocks (50-pack): 2 columns × (slats+1 positions) × panels
  const spacerPacks = Math.ceil((2 * (slatsPerPanel + 1) * panels) / 50);
  // Screws (100-pack): 2 screws/slat × 1.01 waste + 1 structural screw/slat
  const screwPacks  = Math.ceil((totalSlats * 3.02) / 100);

  const slatSku  = fc.slatSize === '65' ? `XP-6100-S65-${cc}` : `QS-6100-S90-${cc}`;
  const spacerSku = fc.slatGap === '20' ? 'XPL-SB-50PK-20MM' : 'XPL-SB-50PK-09MM';

  const limitedNote = ['primrose', 'paperbark'].includes(fc.colour) ? '⚠ Limited colour' : undefined;

  return [
    item(slatSku,               `${fc.slatSize}mm Slat (6100mm)`,          slatStocks,  'slat',      'length', limitedNote),
    item(`QS-5800-SF-${cc}`,    'Side Frame (5800mm)',                      sfStocks,   'rail',      'length'),
    item(`QS-5800-CFC-${cc}`,   'Channel Frame Connector (5800mm)',         cfcStocks,  'rail',      'length'),
    item(`XP-5800-CSR-${cc}`,   'Corner/Slat Rail (5800mm)',                csrStocks,  'bracket',   'length'),
    item(`XP-2400-FP-${cc}`,    'Full Post (2400mm)',                       posts,      'post',      'each'),
    item('QS-SFC-B',            'Side Frame Cap (Black)',                   sfcBCaps,   'accessory', 'each'),
    item(`XP-CSRC-${cc}`,       'CSR End Cap',                             csrCaps,    'accessory', 'each'),
    item(`XP-BTP-${cc}`,        'Base/Top Plate',                          btpPlates,  'accessory', 'each'),
    item(spacerSku,             `Spacer Block ${fc.slatGap}mm (50-pack)`,  spacerPacks,'accessory', 'pack'),
    item(`XP-SCREWS-${cc}`,     'Screw Pack (100)',                        screwPacks, 'screw',     'pack'),
  ];
}

// ─── XPL BOM calculation ──────────────────────────────────────────────────────
// XPL (XPress Plus Premium): 65mm slats only, insert/clip system.
// Uses different frame codes — QS-5800-SF must NOT appear.

function calcXPLBom(fc: FenceConfig): Omit<BOMLineItem, 'unitPrice' | 'lineTotal'>[] {
  const runLengthMm   = fc.totalRunLength * 1000;
  const maxPanelMm    = parseInt(fc.maxPanelWidth);
  const slatGapMm     = parseInt(fc.slatGap);
  const cc            = COLOUR_CODES[fc.colour];
  const HEIGHT        = fc.targetHeight;
  const SLAT_STOCK    = 6100;
  const FRAME_STOCK   = 5800;

  const panels     = Math.ceil(runLengthMm / maxPanelMm);
  const panelWidth = runLengthMm / panels;

  const wallTerminations =
    (fc.leftTermination  === 'wall' ? 1 : 0) +
    (fc.rightTermination === 'wall' ? 1 : 0);
  const posts = (panels + 1) - wallTerminations + fc.corners;

  // XPL forces 65mm slats
  const slatsPerPanel     = Math.floor(HEIGHT / (65 + slatGapMm));
  const totalSlats        = slatsPerPanel * panels;
  const cutsPerSlatStock  = Math.floor(SLAT_STOCK / panelWidth);
  const slatStocks        = Math.ceil(totalSlats / cutsPerSlatStock);

  // XPL uses different frame SKU
  const cutsPerFrameStock = Math.floor(FRAME_STOCK / HEIGHT);
  const xplFrameStocks    = Math.ceil((2 * panels) / cutsPerFrameStock);
  const csrStocks         = Math.ceil(panels / cutsPerFrameStock);

  const sfcBCaps  = 4 * panels;
  const csrCaps   = panels;
  const btpPlates = 2 * panels;
  const spacerPacks = Math.ceil((2 * (slatsPerPanel + 1) * panels) / 50);
  const screwPacks  = Math.ceil((totalSlats * 3.02) / 100);
  const spacerSku   = fc.slatGap === '20' ? 'XPL-SB-50PK-20MM' : 'XPL-SB-50PK-09MM';

  return [
    item(`XP-6100-S65-${cc}`,   '65mm Slat (6100mm)',                      slatStocks,   'slat',      'length'),
    item(`XPL-5800-RF-${cc}`,   'XPL Rail Frame (5800mm)',                 xplFrameStocks,'rail',     'length'),
    item(`XP-5800-CSR-${cc}`,   'Corner/Slat Rail (5800mm)',               csrStocks,    'bracket',   'length'),
    item(`XP-2400-FP-${cc}`,    'Full Post (2400mm)',                      posts,         'post',      'each'),
    item('QS-SFC-B',            'Side Frame Cap (Black)',                  sfcBCaps,      'accessory', 'each'),
    item(`XP-CSRC-${cc}`,       'CSR End Cap',                            csrCaps,       'accessory', 'each'),
    item(`XP-BTP-${cc}`,        'Base/Top Plate',                         btpPlates,     'accessory', 'each'),
    item(spacerSku,             `Spacer Block ${fc.slatGap}mm (50-pack)`, spacerPacks,   'accessory', 'pack'),
    item(`XP-SCREWS-${cc}`,     'Screw Pack (100)',                       screwPacks,    'screw',     'pack'),
  ];
}

// ─── VS BOM calculation ───────────────────────────────────────────────────────
// VS (Vertical Slat Screen): slats run vertically, inserted into top + bottom rails.

function calcVSBom(fc: FenceConfig): Omit<BOMLineItem, 'unitPrice' | 'lineTotal'>[] {
  const runLengthMm   = fc.totalRunLength * 1000;
  const maxPanelMm    = parseInt(fc.maxPanelWidth);
  const slatGapMm     = parseInt(fc.slatGap);
  const cc            = COLOUR_CODES[fc.colour];
  const HEIGHT        = fc.targetHeight;
  const RAIL_STOCK    = 5800;
  const SLAT_STOCK    = 5800; // VS slats cut to height from 5800mm stock

  const panels     = Math.ceil(runLengthMm / maxPanelMm);
  const panelWidth = runLengthMm / panels;

  const wallTerminations =
    (fc.leftTermination  === 'wall' ? 1 : 0) +
    (fc.rightTermination === 'wall' ? 1 : 0);
  const posts = (panels + 1) - wallTerminations + fc.corners;

  const slatHeightMm = parseInt(fc.slatSize);
  // VS: slats fill the panel width horizontally
  const slatsPerPanel    = Math.floor(panelWidth / (slatHeightMm + slatGapMm));
  const totalSlats       = slatsPerPanel * panels;
  // VS slats are cut to target height from 5800mm stock
  const cutsPerSlatStock = Math.floor(SLAT_STOCK / HEIGHT);
  const slatStocks       = Math.ceil(totalSlats / cutsPerSlatStock);

  // Top + bottom rails per panel (2 rails), cut to panel width from 5800mm stock
  const cutsPerRailStock = Math.floor(RAIL_STOCK / panelWidth);
  const railStocks       = Math.ceil((2 * panels) / cutsPerRailStock);

  const screwPacks = Math.ceil((totalSlats * 2.02) / 100);

  const slatSku = fc.slatSize === '65' ? `VS-5800-S65-${cc}` : `VS-5800-S90-${cc}`;

  return [
    item(slatSku,               `${fc.slatSize}mm VS Slat (5800mm)`,  slatStocks, 'slat',  'length'),
    item(`VS-5800-TR-${cc}`,    'VS Top Rail (5800mm)',                railStocks, 'rail',  'length'),
    item(`XP-2400-FP-${cc}`,    'Full Post (2400mm)',                  posts,      'post',  'each'),
    item(`XP-SCREWS-${cc}`,     'Screw Pack (100)',                    screwPacks, 'screw', 'pack'),
  ];
}

// ─── BAYG BOM calculation ─────────────────────────────────────────────────────
// BAYG (Buy As You Go): spacers are separate line items, customer assembles.
// Similar to QSHS but spacers are individual (not in packs from factory).

function calcBAYGBom(fc: FenceConfig): Omit<BOMLineItem, 'unitPrice' | 'lineTotal'>[] {
  // Reuse QSHS logic — BAYG is the same structure, just sold differently
  const qshsItems = calcQSHSBom(fc);
  // Replace the QS- prefix with BAYG- for BAYG-specific SKUs
  return qshsItems.map(i => ({
    ...i,
    sku: i.sku.startsWith('QS-') ? i.sku.replace('QS-', 'BAYG-') : i.sku,
  }));
}

// ─── Gate BOM calculation ─────────────────────────────────────────────────────

function calcGateBom(
  gate: GateConfig,
  fc: FenceConfig,
): Omit<BOMLineItem, 'unitPrice' | 'lineTotal'>[] {
  // Resolve match-fence values
  const slatSize   = gate.slatSize   === 'match-fence' ? fc.slatSize   : gate.slatSize;
  const slatGap    = gate.slatGap    === 'match-fence' ? fc.slatGap    : gate.slatGap;
  const colour     = gate.colour     === 'match-fence' ? fc.colour     : gate.colour as Colour;
  const gateHeight = gate.gateHeight === 'match-fence' ? fc.targetHeight : gate.gateHeight as number;

  const cc         = COLOUR_CODES[colour];
  const slatMm     = parseInt(slatSize);
  const gapMm      = parseInt(slatGap);
  const gapCode    = gapMm >= 20 ? '20' : '09';

  // Gate side frame kit
  const kitSku = `XP-GKIT-LSET${gapCode}-${cc}`;

  // Gate blades: fill height with horizontal slats (same orientation as fence)
  // Swing gates always use 65mm blades
  const bladeMm    = (gate.gateType === 'single-swing' || gate.gateType === 'double-swing') ? 65 : slatMm;
  const gateSlats  = Math.floor(gateHeight / (bladeMm + gapMm));
  const BLADE_STOCK = 6100;
  // Blades cut to opening width from 6100mm stock
  const cutsPerBladeStock = Math.max(1, Math.floor(BLADE_STOCK / gate.openingWidth));
  const bladeStocks       = Math.ceil(gateSlats / cutsPerBladeStock);
  const bladeSku  = bladeMm === 65 ? `XP-6100-GB65-${cc}` : `XP-6100-GB90-${cc}`;

  // Gate posts (2 for single/sliding, 3 for double swing — shared centre post)
  const postCount  = gate.gateType === 'double-swing' ? 3 : 2;
  const postCode   = gate.gatePostSize.replace('x', '');  // '65x65' → '6565'
  const postSku    = `XP-GP-${postCode}-${cc}`;

  const items: Omit<BOMLineItem, 'unitPrice' | 'lineTotal'>[] = [
    item(kitSku,   `Gate Side Frame Kit (${gapMm}mm gap)`, 1,           'gate',     'each'),
    item(bladeSku, `Gate Blade ${bladeMm}mm (6100mm)`,      bladeStocks, 'gate',     'length'),
    item(postSku,  `Gate Post ${gate.gatePostSize}`,        postCount,   'post',     'each'),
  ];

  // Hinges
  const hingeQty = gate.gateType === 'single-swing' ? 2
    : gate.gateType === 'double-swing' ? 4
    : 0; // sliding: track instead
  if (hingeQty > 0) {
    const hingSku = gate.hingeType === 'dd-kwik-fit-adjustable' ? 'DD-KWIKFIT-ADJ'
      : gate.hingeType === 'dd-kwik-fit-fixed' ? 'DD-KWIKFIT-FXD'
      : 'DD-HINGE-HD';
    items.push(item(hingSku, `Gate Hinge — ${gate.hingeType}`, hingeQty, 'hardware', 'each'));
  }

  // Latch
  if (gate.latchType !== 'none') {
    const latchSku = gate.latchType === 'dd-magna-latch-top-pull' ? 'DD-ML-TP'
      : gate.latchType === 'dd-magna-latch-lock-box' ? 'DD-ML-LB'
      : 'DD-DROP-BOLT';
    items.push(item(latchSku, `Gate Latch — ${gate.latchType}`, 1, 'hardware', 'each'));
  }

  // Double swing: drop bolt for the non-active leaf
  if (gate.gateType === 'double-swing') {
    items.push(item('DD-DROP-BOLT', 'Drop Bolt', 1, 'hardware', 'each'));
  }

  // Sliding gate hardware
  if (gate.gateType === 'sliding') {
    items.push(item('XP-SLIDE-TRACK',   'Sliding Gate Track',  1, 'hardware', 'length'));
    items.push(item('XP-GUIDE-ROLLER',  'Guide Roller',        2, 'hardware', 'each'));
  }

  return items;
}

// ─── Pricing lookup ───────────────────────────────────────────────────────────

async function loadPricing(orgId: string): Promise<Map<string, PricingRow>> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabaseAdmin
    .from('product_pricing')
    .select('sku, tier1_price, tier2_price, tier3_price')
    .eq('org_id', orgId)
    .eq('active', true);

  if (error) throw new Error(`Pricing lookup failed: ${error.message}`);

  const map = new Map<string, PricingRow>();
  for (const row of data ?? []) {
    map.set(row.sku, row as PricingRow);
  }
  return map;
}

function applyPricing(
  unpricedItems: Omit<BOMLineItem, 'unitPrice' | 'lineTotal'>[],
  pricingMap: Map<string, PricingRow>,
  tier: PricingTier,
): BOMLineItem[] {
  return unpricedItems.map((i) => {
    const row = pricingMap.get(i.sku);
    const unitPrice = row ? (row[`${tier}_price` as keyof PricingRow] as number) : 0;
    return { ...i, unitPrice, lineTotal: parseFloat((i.quantity * unitPrice).toFixed(2)) };
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const jwt = extractJwt(req);
    const { orgId, pricingTier } = await resolveUserProfile(jwt);

    const body = await req.json();
    const fenceConfig: FenceConfig = body.fenceConfig;
    const gates: GateConfig[]      = body.gates ?? [];
    // Client-provided tier overrides profile default (for tier selection UI)
    const tier: PricingTier        = body.pricingTier ?? pricingTier;

    // Calculate unpriced BOM
    let unpricedFence: Omit<BOMLineItem, 'unitPrice' | 'lineTotal'>[];
    switch (fenceConfig.systemType) {
      case 'QSHS': unpricedFence = calcQSHSBom(fenceConfig); break;
      case 'XPL':  unpricedFence = calcXPLBom(fenceConfig);  break;
      case 'VS':   unpricedFence = calcVSBom(fenceConfig);   break;
      case 'BAYG': unpricedFence = calcBAYGBom(fenceConfig); break;
      default:     unpricedFence = calcQSHSBom(fenceConfig); break;
    }

    const unpricedGates = gates.flatMap((g) => calcGateBom(g, fenceConfig));

    // Load pricing and apply
    const pricingMap = await loadPricing(orgId);
    const fenceItems = applyPricing(unpricedFence, pricingMap, tier);
    const gateItems  = applyPricing(unpricedGates, pricingMap, tier);

    const total      = parseFloat([...fenceItems, ...gateItems].reduce((s, i) => s + i.lineTotal, 0).toFixed(2));
    const gst        = parseFloat((total * 0.1).toFixed(2));
    const grandTotal = parseFloat((total + gst).toFixed(2));

    const result: BOMResult = {
      fenceItems,
      gateItems,
      total,
      gst,
      grandTotal,
      pricingTier: tier,
      generatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: err instanceof Error && err.message.includes('Invalid JWT') ? 401 : 400,
    });
  }
});
