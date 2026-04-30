interface Props {
  total: number;
  gst: number;
  grandTotal: number;
  /** Footer hint matching active BOM tab scope. */
  scopeLabel?: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(n);

/**
 * Fixed footer totals row. Subtotal / GST / Grand total.
 */
export function BomTotals({ total, gst, grandTotal, scopeLabel }: Props) {
  return (
    <div className="border-t border-brand-border bg-brand-card px-4 py-3 flex-shrink-0">
      {scopeLabel ? (
        <p className="text-[10px] text-brand-muted mb-2">{scopeLabel}</p>
      ) : null}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-brand-muted">
            Subtotal
          </div>
          <div className="font-mono tabular-nums text-brand-text">
            {fmt(total)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-brand-muted">
            GST (10%)
          </div>
          <div className="font-mono tabular-nums text-brand-text">
            {fmt(gst)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-brand-muted">
            Grand total
          </div>
          <div className="font-mono tabular-nums text-base font-bold text-brand-accent">
            {fmt(grandTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}
