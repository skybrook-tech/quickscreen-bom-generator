export type BOMCategory =
  | 'post'
  | 'post_accessory'
  | 'rail'
  | 'rail_insert'
  | 'slat'
  | 'side_frame'
  | 'cfc_cover'
  | 'centre_support_rail'
  | 'f_section'
  | 'bracket'
  | 'screw'
  | 'gate'
  | 'hardware'
  | 'automation'
  | 'accessory';
export type BOMUnit = 'each' | 'length' | 'pack' | 'box';

export interface BOMLineItem {
  category: BOMCategory;
  sku: string;
  description: string;
  quantity: number;
  unit: BOMUnit;
  unitPrice: number;    // ex-GST
  lineTotal: number;    // quantity × unitPrice
  notes?: string;
  runId?: string;
  segmentId?: string;
  productCode?: string;
}

export interface PostPosition {
  x: number;
  y: number;
  label?: string;
}

export interface BOMResult {
  fenceItems: BOMLineItem[];
  gateItems: BOMLineItem[];
  total: number;
  gst: number;
  grandTotal: number;
  pricingTier: 'tier1' | 'tier2' | 'tier3';
  generatedAt: string;
  /** Optional post positions in canvas world coordinates (same space as drawn nodes).
   *  Populated by the edge function once post-position calculation is implemented. */
  postPositions?: PostPosition[];
}

export type PricingTier = 'tier1' | 'tier2' | 'tier3';

export interface CalculatorBOMResult {
  runResults: Array<{ runId: string; items: BOMLineItem[] }>;
  gateResults?: Array<{ id: string; label: string; items: BOMLineItem[] }>;
  gateItems: BOMLineItem[];
  allItems: BOMLineItem[];
  total: number;
  gst: number;
  grandTotal: number;
  pricingTier: PricingTier;
  generatedAt: string;
}

/** Ad-hoc line item added manually by staff — not from the BOM calculation */
export interface ExtraItem {
  id: string;           // generated UUID / nanoid
  description: string;
  quantity: number;
  unitPrice: number;    // ex-GST
  sku?: string;         // set when selected from autocomplete; undefined for free-text entries
}
