import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { extractJwt, resolveUserProfile } from '../_shared/auth.ts';
import { create, all } from 'https://esm.sh/mathjs@13/number';
import type {
  FenceConfig,
  GateConfig,
  BOMLineItem,
  BOMCategory,
  BOMUnit,
  PricingRule,
  PricingTier,
  Colour,
  SlatSize,
  SlatGap,
  MaxPanelWidth,
  Termination,
  PostMounting,
  SystemType,
  RunInput,
  CalculatorBOMResult,
} from '../_shared/types.ts';

const mathjs = create(all);

// ─── Pricing ──────────────────────────────────────────────────────────────────

function resolvePrice(rules: PricingRule[], qty: number): number {
  for (const r of rules) {
    if (!r.rule) return r.price;
    try {
      if (mathjs.evaluate(r.rule, { qty }) === true) return r.price;
    } catch { /* malformed rule — skip */ }
  }
  return 0;
}

async function loadPricing(orgId: string, tier: PricingTier): Promise<Map<string, PricingRule[]>> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabaseAdmin
    .from('pricing_rules_with_sku')
    .select('sku, price, rule, priority')
    .eq('org_id', orgId)
    .eq('tier_code', tier)
    .eq('active', true)
    .order('priority', { ascending: false });

  if (error) throw new Error(`Pricing lookup failed: ${error.message}`);

  const map = new Map<string, PricingRule[]>();
  for (const row of data ?? []) {
    const existing = map.get(row.sku) ?? [];
    existing.push(row as PricingRule);
    map.set(row.sku, existing);
  }
  return map;
}

function applyPricing(
  unpricedItems: Omit<BOMLineItem, 'unitPrice' | 'lineTotal'>[],
  pricingMap: Map<string, PricingRule[]>,
): BOMLineItem[] {
  return unpricedItems.map((i) => {
    const rules = pricingMap.get(i.sku) ?? [];
    const unitPrice = resolvePrice(rules, i.quantity);
    return { ...i, unitPrice, lineTotal: parseFloat((i.quantity * unitPrice).toFixed(2)) };
  });
}

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

// ─── Line item builder ───────────────────────────────────────────────────────

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

// ─── BOM calculation functions (copied from calculate-bom) ────────────────────

function calcQSHSBom(fc: FenceConfig): Omit<BOMLineItem, 'unitPrice' | 'lineTotal'>[] {
  const runLengthMm   = fc.totalRunLength * 1000;
  const maxPanelMm    = parseInt(fc.maxPanelWidth);
  const slatHeightMm  = parseInt(fc.slatSize);
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

  const slatsPerPanel     = Math.floor(HEIGHT / (slatHeightMm + slatGapMm));
  const totalSlats        = slatsPerPanel * panels;
  const cutsPerSlatStock  = Math.floor(SLAT_STOCK / panelWidth);
  const slatStocks        = Math.ceil(totalSlats / cutsPerSlatStock);

  const cutsPerFrameStock = Math.floor(FRAME_STOCK / HEIGHT);
  const sfStocks          = Math.ceil((2 * panels) / cutsPerFrameStock);
  const cfcStocks         = Math.ceil((2 * panels) / cutsPerFrameStock);
  const csrStocks         = Math.ceil(panels / cutsPerFrameStock);

  const sfcBCaps  = 4 * panels;
  const csrCaps   = panels;
  const btpPlates = 2 * panels;
  const spacerPacks = Math.ceil((2 * (slatsPerPanel + 1) * panels) / 50);
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

  const slatsPerPanel     = Math.floor(HEIGHT / (65 + slatGapMm));
  const totalSlats        = slatsPerPanel * panels;
  const cutsPerSlatStock  = Math.floor(SLAT_STOCK / panelWidth);
  const slatStocks        = Math.ceil(totalSlats / cutsPerSlatStock);

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

function calcVSBom(fc: FenceConfig): Omit<BOMLineItem, 'unitPrice' | 'lineTotal'>[] {
  const runLengthMm   = fc.totalRunLength * 1000;
  const maxPanelMm    = parseInt(fc.maxPanelWidth);
  const slatGapMm     = parseInt(fc.slatGap);
  const cc            = COLOUR_CODES[fc.colour];
  const HEIGHT        = fc.targetHeight;
  const RAIL_STOCK    = 5800;
  const SLAT_STOCK    = 5800;

  const panels     = Math.ceil(runLengthMm / maxPanelMm);
  const panelWidth = runLengthMm / panels;

  const wallTerminations =
    (fc.leftTermination  === 'wall' ? 1 : 0) +
    (fc.rightTermination === 'wall' ? 1 : 0);
  const posts = (panels + 1) - wallTerminations + fc.corners;

  const slatHeightMm = parseInt(fc.slatSize);
  const slatsPerPanel    = Math.floor(panelWidth / (slatHeightMm + slatGapMm));
  const totalSlats       = slatsPerPanel * panels;
  const cutsPerSlatStock = Math.floor(SLAT_STOCK / HEIGHT);
  const slatStocks       = Math.ceil(totalSlats / cutsPerSlatStock);

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

function calcBAYGBom(fc: FenceConfig): Omit<BOMLineItem, 'unitPrice' | 'lineTotal'>[] {
  const qshsItems = calcQSHSBom(fc);
  return qshsItems.map(i => ({
    ...i,
    sku: i.sku.startsWith('QS-') ? i.sku.replace('QS-', 'BAYG-') : i.sku,
  }));
}

function calcGateBom(
  gate: GateConfig,
  fc: FenceConfig,
): Omit<BOMLineItem, 'unitPrice' | 'lineTotal'>[] {
  const slatSize   = gate.slatSize   === 'match-fence' ? fc.slatSize   : gate.slatSize;
  const slatGap    = gate.slatGap    === 'match-fence' ? fc.slatGap    : gate.slatGap;
  const colour     = gate.colour     === 'match-fence' ? fc.colour     : gate.colour as Colour;
  const gateHeight = gate.gateHeight === 'match-fence' ? fc.targetHeight : gate.gateHeight as number;

  const cc         = COLOUR_CODES[colour];
  const slatMm     = parseInt(slatSize);
  const gapMm      = parseInt(slatGap);
  const gapCode    = gapMm >= 20 ? '20' : '09';

  const kitSku = `XP-GKIT-LSET${gapCode}-${cc}`;

  const bladeMm    = (gate.gateType === 'single-swing' || gate.gateType === 'double-swing') ? 65 : slatMm;
  const gateSlats  = Math.floor(gateHeight / (bladeMm + gapMm));
  const BLADE_STOCK = 6100;
  const cutsPerBladeStock = Math.max(1, Math.floor(BLADE_STOCK / gate.openingWidth));
  const bladeStocks       = Math.ceil(gateSlats / cutsPerBladeStock);
  const bladeSku  = bladeMm === 65 ? `XP-6100-GB65-${cc}` : `XP-6100-GB90-${cc}`;

  const postCount  = gate.gateType === 'double-swing' ? 3 : 2;
  const postCode   = gate.gatePostSize.replace('x', '');
  const postSku    = `XP-GP-${postCode}-${cc}`;

  const items: Omit<BOMLineItem, 'unitPrice' | 'lineTotal'>[] = [
    item(kitSku,   `Gate Side Frame Kit (${gapMm}mm gap)`, 1,           'gate',     'each'),
    item(bladeSku, `Gate Blade ${bladeMm}mm (6100mm)`,      bladeStocks, 'gate',     'length'),
    item(postSku,  `Gate Post ${gate.gatePostSize}`,        postCount,   'post',     'each'),
  ];

  const hingeQty = gate.gateType === 'single-swing' ? 2
    : gate.gateType === 'double-swing' ? 4
    : 0;
  if (hingeQty > 0) {
    const hingSku = gate.hingeType === 'dd-kwik-fit-adjustable' ? 'DD-KWIKFIT-ADJ'
      : gate.hingeType === 'dd-kwik-fit-fixed' ? 'DD-KWIKFIT-FXD'
      : 'DD-HINGE-HD';
    items.push(item(hingSku, `Gate Hinge — ${gate.hingeType}`, hingeQty, 'hardware', 'each'));
  }

  if (gate.latchType !== 'none') {
    const latchSku = gate.latchType === 'dd-magna-latch-top-pull' ? 'DD-ML-TP'
      : gate.latchType === 'dd-magna-latch-lock-box' ? 'DD-ML-LB'
      : 'DD-DROP-BOLT';
    items.push(item(latchSku, `Gate Latch — ${gate.latchType}`, 1, 'hardware', 'each'));
  }

  if (gate.gateType === 'double-swing') {
    items.push(item('DD-DROP-BOLT', 'Drop Bolt', 1, 'hardware', 'each'));
  }

  if (gate.gateType === 'sliding') {
    items.push(item('XP-SLIDE-TRACK',   'Sliding Gate Track',  1, 'hardware', 'length'));
    items.push(item('XP-GUIDE-ROLLER',  'Guide Roller',        2, 'hardware', 'each'));
  }

  return items;
}

// ─── Run → FenceConfig conversion ─────────────────────────────────────────────

function runToFenceConfig(
  run: RunInput,
  defaults: { slatSize: string; slatGap: string; colour: string },
  systemType: SystemType,
): FenceConfig {
  return {
    systemType,
    totalRunLength: run.length,
    targetHeight: run.targetHeight,
    maxPanelWidth: (run.maxPanelWidth ?? '2600') as MaxPanelWidth,
    slatSize: ((run.slatSize ?? defaults.slatSize) as SlatSize),
    slatGap: ((run.slatGap ?? defaults.slatGap) as SlatGap),
    colour: ((run.colour ?? defaults.colour) as Colour),
    leftTermination: (run.leftTermination ?? 'post') as Termination,
    rightTermination: (run.rightTermination ?? 'post') as Termination,
    postMounting: (run.postMounting ?? 'concreted-in-ground') as PostMounting,
    corners: run.corners ?? 0,
  };
}

// ─── Merge items by SKU ───────────────────────────────────────────────────────

function mergeItems(allRunItems: BOMLineItem[]): BOMLineItem[] {
  const map = new Map<string, BOMLineItem>();
  for (const item of allRunItems) {
    const existing = map.get(item.sku);
    if (existing) {
      existing.quantity += item.quantity;
      existing.lineTotal = parseFloat((existing.quantity * existing.unitPrice).toFixed(2));
    } else {
      map.set(item.sku, { ...item });
    }
  }
  return Array.from(map.values());
}

// ─── Route by system type ─────────────────────────────────────────────────────

function calcBomForSystem(fc: FenceConfig): Omit<BOMLineItem, 'unitPrice' | 'lineTotal'>[] {
  switch (fc.systemType) {
    case 'QSHS': return calcQSHSBom(fc);
    case 'XPL':  return calcXPLBom(fc);
    case 'VS':   return calcVSBom(fc);
    case 'BAYG': return calcBAYGBom(fc);
    default:     return calcQSHSBom(fc);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const jwt = extractJwt(req);
    const { orgId, pricingTier: profileTier } = await resolveUserProfile(jwt);

    const body = await req.json();
    const { systemType, defaults, runs, gates, pricingTier: requestTier } = body;
    const tier: PricingTier = requestTier ?? profileTier;

    if (!runs || runs.length === 0) {
      throw new Error('At least one run is required');
    }

    // Load pricing once
    const pricingMap = await loadPricing(orgId, tier);

    // Calculate BOM per run
    const runResults: Array<{ runId: string; items: BOMLineItem[] }> = [];
    const allRunItemsFlat: BOMLineItem[] = [];

    for (const run of runs as RunInput[]) {
      const fc = runToFenceConfig(run, defaults, systemType as SystemType);
      const unpricedItems = calcBomForSystem(fc);
      const pricedItems = applyPricing(unpricedItems, pricingMap);
      runResults.push({ runId: run.id, items: pricedItems });
      allRunItemsFlat.push(...pricedItems);
    }

    // Calculate gate BOM — resolve match-fence against defaults
    const defaultFc: FenceConfig = {
      systemType: systemType as SystemType,
      totalRunLength: 1,
      targetHeight: (runs as RunInput[])[0]?.targetHeight ?? 1800,
      maxPanelWidth: '2600' as MaxPanelWidth,
      slatSize: defaults.slatSize as SlatSize,
      slatGap: defaults.slatGap as SlatGap,
      colour: defaults.colour as Colour,
      leftTermination: 'post',
      rightTermination: 'post',
      postMounting: 'concreted-in-ground',
      corners: 0,
    };

    const unpricedGates = (gates as GateConfig[] ?? []).flatMap((g) => calcGateBom(g, defaultFc));
    const gateItems = applyPricing(unpricedGates, pricingMap);

    // Merge all items (runs + gates) by SKU
    const allItems = mergeItems([...allRunItemsFlat, ...gateItems]);

    const total      = parseFloat(allItems.reduce((s, i) => s + i.lineTotal, 0).toFixed(2));
    const gst        = parseFloat((total * 0.1).toFixed(2));
    const grandTotal = parseFloat((total + gst).toFixed(2));

    const result: CalculatorBOMResult = {
      runResults,
      gateItems,
      allItems,
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
