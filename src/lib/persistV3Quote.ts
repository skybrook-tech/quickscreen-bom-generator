import type { SupabaseClient } from '@supabase/supabase-js';
import type { CanonicalPayload } from '../types/canonical.types';
import type { BOMResult } from '../types/bom.types';
import type { V3FenceConfig } from '../types/quote.types';

export function buildV3FenceConfig(
  customerRef: string,
  payload: CanonicalPayload,
): V3FenceConfig {
  return {
    calculator: 'v3',
    jobName: customerRef,
    payload,
    layoutGeometry: payload.runs.map((run) => ({
      runId: run.runId,
      geometry: run.geometry,
      segments: run.segments.map((segment) => ({
        segmentId: segment.segmentId,
        widthMm: segment.segmentWidthMm,
        targetHeightMm: segment.targetHeightMm,
        variables: segment.variables ?? {},
      })),
    })),
  };
}

export function buildV3QuoteBom(
  bomResultForTabs: {
    allItems: BOMResult['fenceItems'];
    gateItems: BOMResult['gateItems'];
    total: number;
    gst: number;
    grandTotal: number;
    pricingTier: BOMResult['pricingTier'];
    generatedAt: string;
  } | null,
): BOMResult {
  if (!bomResultForTabs) {
    return {
      fenceItems: [],
      gateItems: [],
      total: 0,
      gst: 0,
      grandTotal: 0,
      pricingTier: 'tier1',
      generatedAt: new Date().toISOString(),
    };
  }
  return {
    fenceItems: bomResultForTabs.allItems,
    gateItems: bomResultForTabs.gateItems,
    total: bomResultForTabs.total,
    gst: bomResultForTabs.gst,
    grandTotal: bomResultForTabs.grandTotal,
    pricingTier: bomResultForTabs.pricingTier,
    generatedAt: bomResultForTabs.generatedAt,
  };
}

/** Replaces all quote_runs + segments for a quote with the current payload. */
export async function replaceV3QuoteRuns(
  supabase: SupabaseClient,
  orgId: string,
  quoteId: string,
  payload: CanonicalPayload,
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('quote_runs')
    .delete()
    .eq('quote_id', quoteId);
  if (deleteError) throw deleteError;

  const systems = [...new Set(payload.runs.map((run) => run.productCode))];
  if (systems.length === 0) return;

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, system_type')
    .in('system_type', systems);
  if (productsError) throw productsError;

  const productIdByCode = new Map(
    (products ?? []).map((product) => [product.system_type, product.id]),
  );

  for (const [runIndex, run] of payload.runs.entries()) {
    const productId = productIdByCode.get(run.productCode);
    if (!productId) continue;

    const { data: savedRun, error: runError } = await supabase
      .from('quote_runs')
      .insert({
        org_id: orgId,
        quote_id: quoteId,
        product_id: productId,
        sort_order: runIndex + 1,
        description: `Run ${runIndex + 1} - ${run.productCode}`,
        variables_json: {
          runId: run.runId,
          productCode: run.productCode,
          variables: run.variables ?? {},
          leftBoundary: run.leftBoundary,
          rightBoundary: run.rightBoundary,
          corners: run.corners,
          geometry: run.geometry,
        },
      })
      .select('id')
      .single();
    if (runError) throw runError;

    if (run.segments.length > 0) {
      const { error: segmentError } = await supabase.from('quote_run_segments').insert(
        run.segments.map((segment) => ({
          org_id: orgId,
          quote_run_id: savedRun.id,
          sort_order: segment.sortOrder,
          segment_type: segment.segmentKind,
          segment_kind: segment.segmentKind,
          length_mm: segment.segmentWidthMm ?? null,
          panel_width_mm: segment.variables?.max_panel_width_mm ?? null,
          target_height_mm: segment.targetHeightMm ?? null,
          bay_count: segment.bayCount ?? null,
          variables_json: {
            segmentId: segment.segmentId,
            variables: segment.variables ?? {},
            gateProductCode: segment.gateProductCode,
          },
        })),
      );
      if (segmentError) throw segmentError;
    }
  }
}
