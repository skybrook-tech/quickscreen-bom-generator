export const BULK_BUY_VARIANTS = {
  "LL-DL": "BB-LL-DL",
  "LL-DL-KA": "BB-LL-DL-KA",
  LLAA: "BB-LLAA",
  LLB: "BB-LLB",
  "ML-TL": "BB-ML-TL",
  "MR-FMLSL": "BB-MR-FMLSL",
  "KF-AH-AT": "BB-KF-AH-AT",
  "KF-H-FT": "BB-KF-H-FT",
  "TC-H-AT-B": "BB-TC-H-AT-B",
  "TC-H-AT-2L-B": "BB-TC-H-AT-2L-B",
  "ML-TL-KF-H-FT": "BB-ML-TL-KF-H-FT",
  "ML-TL-TC-H-AT": "BB-ML-TL-TC-H-AT",
  "LLM-L-B": "BB-LLM-L-B",
  "MR-SFLSL-B": "BB-MR-SFLSL-B",
} as const;

export type BulkBuyBaseSku = keyof typeof BULK_BUY_VARIANTS;

export const UNMAPPED_BULK_BUY_VARIANTS = [
  // TODO: confirm the regular non-BB peer SKU with Glass Outlet before mapping.
  "BB-MR-FLGGSS-P",
  // TODO: confirm the regular non-BB peer SKU with Glass Outlet before mapping.
  "BB-MR-FLGGSS-S",
  // TODO: confirm whether this maps to SS-GS or a differently named gate-stop SKU.
  "BB-SS-GS",
] as const;

export function bulkBuyVariantForSku(sku: string): string | undefined {
  return BULK_BUY_VARIANTS[sku as BulkBuyBaseSku];
}
