// src/types/pricing.ts
export type PriceBookStatus = 'draft' | 'reviewed' | 'published' | 'archived';

export interface PriceBook {
  id: string;
  supplierId: string;
  name: string;
  sourceFile?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: PriceBookStatus;
  publishedAt?: string;
  publishedBy?: string;
  authoredBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PriceBookItem {
  id: string;
  priceBookId: string;
  sku: string;
  tierCode: string;
  minQuantity: number;
  priceCents: number;
  currency: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}