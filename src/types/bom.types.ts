export type BOMCategory = 'post' | 'rail' | 'slat' | 'bracket' | 'screw' | 'gate' | 'hardware' | 'accessory';
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
