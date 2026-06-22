import type { CanonicalPayload } from "../types/canonical.types";
import type { BOMLineItem, BOMSource, BOMCategory, LocalBomResult, PricingTier } from "../types/bom.types";
import { getCustomCalculators, getCustomPrices, evaluateFormula, resolvePattern } from "./customCalculators";

// Helper to slugify material names for use as variables in subsequent formulas
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

// Calculate the BOM for a custom product locally in the frontend
export function calculateCustomBOM(payload: CanonicalPayload, pricingTier: PricingTier = "tier1"): LocalBomResult {
  const customCalculators = getCustomCalculators();
  const customPrices = getCustomPrices();

  const warnings: string[] = [];
  const errors: string[] = [];
  const assumptions: string[] = [];
  const computed: LocalBomResult["computed"] = {};

  const calc = customCalculators.find((c) => c.id === payload.productCode);
  if (!calc) {
    return {
      lines: [],
      runResults: [],
      gateItems: [],
      totals: { subtotal: 0, gst: 0, grandTotal: 0 },
      warnings: ["Calculator definition not found."],
      errors: ["Invalid product code."],
      assumptions: [],
      computed: {},
      pricingTier,
      generatedAt: new Date().toISOString(),
    };
  }

  // Pre-load variable defaults
  const calculatorDefaults: Record<string, any> = {};
  for (const v of calc.variables) {
    if (v.default_value_json !== undefined) {
      calculatorDefaults[v.field_key] = v.default_value_json;
    }
  }

  const rawQtyLines: Array<{
    runId: string;
    segmentId: string;
    sku: string;
    name: string;
    category: string;
    unit: string;
    quantity: number;
    description: string;
    defaultPrice: number;
  }> = [];

  const runResults: Array<{ runId: string; items: BOMLineItem[] }> = [];
  const scopeBySegmentId = new Map<string, { scopeKind: BOMSource["scopeKind"]; scopeId: string; scopeLabel: string }>();

  payload.runs.forEach((run, runIdx) => {
    const runVars = run.variables ?? {};

    // Track gate index for labels
    let gateIdx = 0;

    run.segments.forEach((segment) => {
      const segmentId = segment.segmentId;
      const segmentVars = segment.variables ?? {};

      if (segment.segmentKind === "gate_opening") {
        gateIdx += 1;
        scopeBySegmentId.set(segmentId, {
          scopeKind: "gate",
          scopeId: segmentId,
          scopeLabel: `R${runIdx + 1} G${gateIdx}`,
        });

        // Simple default gate calculation fallback for custom fencing:
        // We will output a generic Gate Assembly line item
        const gateWidthMm = segment.segmentWidthMm ?? 900;
        const gateHeightMm = segment.targetHeightMm ?? 1800;
        const gateSku = `GATE-CUSTOM-${gateHeightMm}H-${gateWidthMm}W`;
        
        rawQtyLines.push({
          runId: run.runId,
          segmentId,
          sku: gateSku,
          name: `Custom Gate Assembly (${gateHeightMm}mm H x ${gateWidthMm}mm W)`,
          category: "gate",
          unit: "each",
          quantity: 1,
          description: "Custom gate leaf framing & hardware kit",
          defaultPrice: 350.00,
        });
        return;
      }

      // Standard fence segment
      scopeBySegmentId.set(segmentId, {
        scopeKind: "fence_run",
        scopeId: run.runId,
        scopeLabel: `Run ${runIdx + 1}`,
      });

      const segmentWidthMm = segment.segmentWidthMm ?? 0;
      const targetHeightMm = segment.targetHeightMm ?? 1800;
      if (segmentWidthMm <= 0) return;

      // Construct segment context
      const context: Record<string, any> = {
        length: segmentWidthMm / 1000,
        height: targetHeightMm / 1000,
        run_length: segmentWidthMm / 1000,
        run_height: targetHeightMm / 1000,
        width_mm: segmentWidthMm,
        height_mm: targetHeightMm,
        // Segment-level variables override run-level and job-level variables
        ...calculatorDefaults,
        ...payload.variables,
        ...runVars,
        ...segmentVars,
      };

      // Add a panels helper
      const maxPanel = Number(context.max_panel_width_mm || 2400);
      const panels = Math.max(1, Math.ceil(segmentWidthMm / maxPanel));
      context.panels = panels;
      context.panel_width = (segmentWidthMm / panels) / 1000;

      // Evaluate materials in order, adding calculated quantities back into the context
      calc.materials.forEach((material) => {
        const qty = evaluateFormula(material.formula, context);
        const resolvedSku = resolvePattern(material.skuPattern, context);
        const resolvedName = resolvePattern(material.namePattern, context);

        // Save variable into context so subsequent formulas can refer to it
        const slugName = slugify(resolvedName);
        context[slugName] = qty;
        
        // Also save simple category-based names if matching
        if (material.category === "post") context.posts = (context.posts || 0) + qty;
        if (material.category === "slat") context.palings = (context.palings || 0) + qty;
        if (material.category === "rail") context.rails = (context.rails || 0) + qty;

        if (qty > 0) {
          rawQtyLines.push({
            runId: run.runId,
            segmentId,
            sku: resolvedSku,
            name: resolvedName,
            category: material.category,
            unit: material.unit,
            quantity: qty,
            description: material.description,
            defaultPrice: material.defaultPrice,
          });
        }
      });

      // Save computed values for UI displays (like AchievedHeightBadge)
      computed[run.runId] = computed[run.runId] ?? {};
      computed[run.runId][segmentId] = {
        actual_height_mm: targetHeightMm,
        num_panels: panels,
        panel_width_mm: Math.round(segmentWidthMm / panels),
      };
    });
  });

  // Aggregate duplicate SKUs and compute pricing
  const aggLines = new Map<string, BOMLineItem>();

  rawQtyLines.forEach((item) => {
    const key = `${item.sku}__${item.runId}`;
    const scope = scopeBySegmentId.get(item.segmentId) ?? {
      scopeKind: "fence_run" as const,
      scopeId: item.runId,
      scopeLabel: "Fence run",
    };

    const source: BOMSource = {
      scopeKind: scope.scopeKind,
      scopeId: scope.scopeId,
      scopeLabel: scope.scopeLabel,
      qty: item.quantity,
    };

    // Determine unit price:
    // 1. Check user uploaded custom prices map
    // 2. Check material's default price
    let unitPrice = item.defaultPrice;
    if (customPrices[item.sku] !== undefined) {
      unitPrice = customPrices[item.sku];
    }

    const existing = aggLines.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      existing.totalQty = (existing.totalQty ?? 0) + item.quantity;
      existing.lineTotal = Math.round((existing.quantity * unitPrice + Number.EPSILON) * 100) / 100;
      if (existing.sources) {
        // Merge sources
        const sKey = `${source.scopeKind}|${source.scopeId}|${source.scopeLabel}`;
        const exSrc = existing.sources.find((s: BOMSource) => `${s.scopeKind}|${s.scopeId}|${s.scopeLabel}` === sKey);
        if (exSrc) {
          exSrc.qty += source.qty;
        } else {
          existing.sources.push(source);
        }
      }
    } else {
      aggLines.set(key, {
        category: item.category as BOMCategory,
        subCategory: item.category === "post" ? "posts" : item.category === "slat" ? "slats" : "accessories",
        sku: item.sku,
        description: item.name,
        quantity: item.quantity,
        totalQty: item.quantity,
        unit: item.unit as any,
        unitPrice,
        lineTotal: Math.round((item.quantity * unitPrice + Number.EPSILON) * 100) / 100,
        runId: item.runId,
        segmentId: item.segmentId,
        productCode: payload.productCode,
        sources: [source],
        notes: item.description,
      });
    }
  });

  const lines = Array.from(aggLines.values());

  // Split into per-run results for UI Tabs
  payload.runs.forEach((run) => {
    const runItems = lines.filter((l) => l.runId === run.runId);
    runResults.push({
      runId: run.runId,
      items: runItems,
    });
  });

  const subtotal = Math.round((lines.reduce((sum, l) => sum + l.lineTotal, 0) + Number.EPSILON) * 100) / 100;
  const gst = Math.round((subtotal * 0.1 + Number.EPSILON) * 100) / 100;
  const grandTotal = Math.round((subtotal + gst + Number.EPSILON) * 100) / 100;

  const gateItems = lines.filter((l) => l.sources?.some((s: BOMSource) => s.scopeKind === "gate"));

  return {
    lines,
    runResults,
    gateItems,
    totals: { subtotal, gst, grandTotal },
    warnings,
    errors,
    assumptions,
    computed,
    pricingTier,
    generatedAt: new Date().toISOString(),
  };
}
