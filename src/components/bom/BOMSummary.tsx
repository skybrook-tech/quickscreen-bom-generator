import type { BOMResult } from "../../types/bom.types";

interface BOMSummaryProps {
  result: BOMResult;
}

export function BOMSummary({ result }: BOMSummaryProps) {
  return (
    <div className="">
      <div className="space-y-1 mb-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-brand-muted">Subtotal (ex-GST)</span>
          <span className="tabular-nums text-brand-text">
            ${result.total.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-brand-muted">GST (10%)</span>
          <span className="tabular-nums text-brand-text">
            ${result.gst.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center border-t border-brand-border pt-3">
        <div>
          <p className="text-sm font-semibold text-brand-text">
            Total (inc. GST)
          </p>
          <p className="text-xs text-brand-muted mt-0.5">
            Generated{" "}
            {new Date(result.generatedAt).toLocaleString("en-AU", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {" · "}
            {result.pricingTier.replace("tier", "Tier ")}
          </p>
        </div>
        <span
          data-testid="bom-grand-total"
          className="text-2xl font-bold text-brand-accent tabular-nums"
        >
          ${result.grandTotal.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
