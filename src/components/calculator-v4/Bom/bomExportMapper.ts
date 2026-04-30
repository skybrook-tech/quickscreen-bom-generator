import type {
  BOMCategory,
  BOMLineItem,
  BOMUnit,
  CalculatorBOMResult,
  PricingTier,
} from "../../../types/bom.types";
import type { BomViewLine, BomViewModel } from "./useBomViewModel";

const ENGINE_CATEGORIES: Set<string> = new Set([
  "post",
  "rail",
  "slat",
  "bracket",
  "screw",
  "gate",
  "hardware",
  "accessory",
]);

function mapCategory(cat: string): BOMCategory {
  if (ENGINE_CATEGORIES.has(cat)) return cat as BOMCategory;
  return "accessory";
}

function mapUnit(u: string): BOMUnit {
  if (u === "each" || u === "length" || u === "pack" || u === "box") return u;
  return "each";
}

export function viewLineToBomLineItem(l: BomViewLine): BOMLineItem {
  return {
    category: mapCategory(l.category),
    sku: l.sku || "—",
    name: l.name,
    description: l.description,
    quantity: l.quantity,
    unit: mapUnit(l.unit),
    unitPrice: l.unitPrice,
    lineTotal: l.lineTotal,
    notes:
      l.source === "extra"
        ? "added manually"
        : l.source === "suggestion"
          ? "suggested accessory"
          : undefined,
  };
}

/**
 * Builds the shape expected by {@link BOMExportActions}. `useBomViewModel` already
 * applies removed SKUs and qty overrides, so exports match the on-screen BOM.
 */
export function bomViewModelToCalculatorResult(
  view: BomViewModel,
): CalculatorBOMResult {
  const mapLine = viewLineToBomLineItem;
  return {
    runResults: view.runResults.map((r) => ({
      runId: r.runId,
      items: r.items.map(mapLine),
    })),
    gateItems: view.gateItems.map(mapLine),
    allItems: view.allLines.map(mapLine),
    total: view.total,
    gst: view.gst,
    grandTotal: view.grandTotal,
    pricingTier: view.pricingTier as PricingTier,
    generatedAt: view.generatedAt,
    segmentDiagnostics: [],
  };
}
