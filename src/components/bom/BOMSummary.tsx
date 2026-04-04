import type { BOMResult } from '../../types/bom.types';

interface BOMSummaryProps {
  result: BOMResult;
}

export function BOMSummary({ result }: BOMSummaryProps) {
  return (
    <div className="mt-4 flex flex-col items-end gap-1 text-sm">
      <div className="flex gap-8 text-brand-muted">
        <span>Subtotal (ex-GST)</span>
        <span className="tabular-nums">${result.total.toFixed(2)}</span>
      </div>
      <div className="flex gap-8 text-brand-muted">
        <span>GST (10%)</span>
        <span className="tabular-nums">${result.gst.toFixed(2)}</span>
      </div>
      <div className="flex gap-8 text-brand-text font-semibold text-base border-t border-brand-border pt-2 mt-1">
        <span>Total (inc. GST)</span>
        <span
          data-testid="bom-grand-total"
          className="tabular-nums"
        >
          ${result.grandTotal.toFixed(2)}
        </span>
      </div>
      <p className="text-xs text-brand-muted mt-1">
        Generated {new Date(result.generatedAt).toLocaleString('en-AU')}
        {' · '}
        {result.pricingTier.replace('tier', 'Tier ')}
      </p>
    </div>
  );
}
