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

function calcLineTotalCents(line: { kind: string; unitPriceCents: number; quantity: number }) {
  if (line.kind !== "PRICE") return 0;
  return Math.round((line.unitPriceCents || 0) * (line.quantity || 0));
}

function lineCounts(line: { kind: string; mode: string; isSelected: boolean }) {
  if (line.kind !== "PRICE") return false;
  if ((line.mode === "OPTIONAL" || line.mode === "MULTIPLE_CHOICE") && !line.isSelected) return false;
  return true;
}

function calcTotals(lines: any[], taxInclusive = false) {
  let subtotal = 0;
  let tax = 0;

  for (const line of lines) {
    if (!lineCounts(line)) continue;
    const lineTotal = calcLineTotalCents(line);
    const rate = line.taxRatePct || 0;

    if (taxInclusive) {
      const base = rate > 0 ? Math.round(lineTotal / (1 + rate / 100)) : lineTotal;
      subtotal += base;
      if (line.taxable) tax += lineTotal - base;
    } else {
      subtotal += lineTotal;
      if (line.taxable) tax += Math.round((lineTotal * rate) / 100);
    }
  }

  return {
    subtotalCents: subtotal,
    taxTotalCents: tax,
    totalCents: subtotal + tax,
  };
}

export async function syncQuoteLineItems(
  supabase: SupabaseClient,
  quoteId: string,
  bom: BOMResult,
): Promise<void> {
  // 1. Fetch current line items to preserve manual ones
  const { data: existingItems, error: fetchErr } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', quoteId);

  if (fetchErr) {
    console.error('[syncQuoteLineItems] Failed to fetch existing items:', fetchErr);
    throw fetchErr;
  }

  const manualItems = (existingItems || []).filter((it: any) => {
    return !it.item_code || 
           it.item_code.toLowerCase().includes('labor') || 
           it.item_code.toLowerCase().includes('labour') || 
           it.item_code.toLowerCase().includes('install') || 
           it.kind === 'TEXT';
  });

  // 2. Delete all current line items for this quote
  const { error: deleteErr } = await supabase
    .from('quote_line_items')
    .delete()
    .eq('quote_id', quoteId);

  if (deleteErr) {
    console.error('[syncQuoteLineItems] Failed to delete old items:', deleteErr);
    throw deleteErr;
  }

  // 3. Combine fenceItems and gateItems
  const items = [...(bom.fenceItems || []), ...(bom.gateItems || [])];

  // 4. Insert translated material items + preserved manual items
  const newItemsToInsert = [
    ...items.map((it: any, idx: number) => {
      const costCents = Math.round((it.unitPrice || 0) * 100);
      return {
        quote_id: quoteId,
        sort_order: idx,
        kind: 'PRICE',
        mode: 'STANDARD',
        is_selected: true,
        item_code: it.sku || null,
        heading: it.name || it.description || 'Material Item',
        description: it.description || null,
        unit_price_cents: costCents,
        quantity: it.quantity || 1,
        line_total_cents: Math.round(costCents * (it.quantity || 1)),
        cost_cents: costCents,
        tax_rate_pct: 10,
        taxable: true,
      };
    }),
    ...manualItems.map((it: any, idx: number) => ({
      quote_id: quoteId,
      sort_order: items.length + idx,
      kind: it.kind,
      mode: it.mode,
      option_group: it.option_group ?? null,
      is_selected: it.is_selected,
      item_code: it.item_code ?? null,
      heading: it.heading,
      description: it.description ?? null,
      unit_price_cents: it.unit_price_cents,
      quantity: it.quantity,
      line_total_cents: it.line_total_cents,
      cost_cents: it.cost_cents,
      tax_rate_pct: it.tax_rate_pct,
      taxable: it.taxable,
      image_url: it.image_url ?? null,
    })),
  ];

  if (newItemsToInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from('quote_line_items')
      .insert(newItemsToInsert);

    if (insertErr) {
      console.error('[syncQuoteLineItems] Failed to insert new items:', insertErr);
      throw insertErr;
    }
  }

  // 5. Fetch quote details
  const { data: quote, error: quoteErr } = await supabase
    .from('quotes')
    .select('tax_inclusive')
    .eq('id', quoteId)
    .single();

  if (quoteErr) {
    console.error('[syncQuoteLineItems] Failed to fetch quote details:', quoteErr);
    return;
  }

  // 6. Fetch fresh items to compute totals
  const { data: freshItems, error: freshErr } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', quoteId);

  if (freshErr) {
    console.error('[syncQuoteLineItems] Failed to fetch fresh items for totals:', freshErr);
    return;
  }

  const calcLines = (freshItems || []).map((it: any) => ({
    kind: it.kind,
    mode: it.mode,
    isSelected: it.is_selected,
    unitPriceCents: it.unit_price_cents,
    quantity: Number(it.quantity),
    taxRatePct: Number(it.tax_rate_pct),
    taxable: it.taxable,
  }));

  const totals = calcTotals(calcLines, quote?.tax_inclusive ?? false);

  const { error: updateErr } = await supabase
    .from('quotes')
    .update({
      subtotal_cents: totals.subtotalCents,
      tax_total_cents: totals.taxTotalCents,
      total_cents: totals.totalCents,
      updated_at: new Date().toISOString(),
    })
    .eq('id', quoteId);

  if (updateErr) {
    console.error('[syncQuoteLineItems] Failed to update quote totals:', updateErr);
  }
}
