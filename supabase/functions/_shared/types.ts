// ─── Shared types (mirrored from src/types/) ──────────────────────────────────
// These are Deno-compatible copies. Do not import from src/ in edge functions.

export type SystemType = 'QSHS' | 'VS' | 'XPL' | 'BAYG';
export type SlatSize = '65' | '90';
export type SlatGap = '5' | '9' | '20';
export type MaxPanelWidth = '2600' | '2000';
export type PostMounting = 'concreted-in-ground' | 'base-plated-to-slab' | 'core-drilled-into-concrete';
export type Termination = 'post' | 'wall';
export type Colour =
  | 'black-satin'
  | 'monument-matt'
  | 'woodland-grey-matt'
  | 'surfmist-matt'
  | 'pearl-white-gloss'
  | 'basalt-satin'
  | 'dune-satin'
  | 'mill'
  | 'primrose'
  | 'paperbark'
  | 'palladium-silver-pearl';

export interface FenceConfig {
  systemType: SystemType;
  customerRef?: string;
  totalRunLength: number;      // metres
  targetHeight: number;        // mm
  slatSize: SlatSize;
  slatGap: SlatGap;
  colour: Colour;
  maxPanelWidth: MaxPanelWidth;
  leftTermination: Termination;
  rightTermination: Termination;
  postMounting: PostMounting;
  corners: number;
}

export type GateType = 'single-swing' | 'double-swing' | 'sliding';
export type GatePostSize = '50x50' | '65x65' | '75x75' | '100x100';
export type HingeType = 'dd-kwik-fit-fixed' | 'dd-kwik-fit-adjustable' | 'heavy-duty-weld-on';
export type LatchType = 'dd-magna-latch-top-pull' | 'dd-magna-latch-lock-box' | 'drop-bolt' | 'none';

export interface GateConfig {
  id: string;
  gateType: GateType;
  openingWidth: number;        // mm
  gateHeight: number | 'match-fence';
  colour: Colour | 'match-fence';
  slatGap: SlatGap | 'match-fence';
  slatSize: SlatSize | 'match-fence';
  gatePostSize: GatePostSize;
  hingeType: HingeType;
  latchType: LatchType;
}

export type BOMCategory = 'post' | 'rail' | 'slat' | 'bracket' | 'screw' | 'gate' | 'hardware' | 'accessory';
export type BOMUnit = 'each' | 'length' | 'pack' | 'box';

export interface BOMLineItem {
  category: BOMCategory;
  sku: string;
  description: string;
  quantity: number;
  unit: BOMUnit;
  unitPrice: number;       // ex-GST
  lineTotal: number;       // quantity × unitPrice
  notes?: string;
}

export interface BOMResult {
  fenceItems: BOMLineItem[];
  gateItems: BOMLineItem[];
  total: number;
  gst: number;
  grandTotal: number;
  pricingTier: 'tier1' | 'tier2' | 'tier3';
  generatedAt: string;
}

export type PricingTier = 'tier1' | 'tier2' | 'tier3';

export interface PricingRow {
  sku: string;
  tier1_price: number;
  tier2_price: number;
  tier3_price: number;
}
