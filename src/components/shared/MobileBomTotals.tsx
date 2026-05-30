const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export function MobileBomTotals({
  subtotal,
  gst,
  grandTotal,
}: {
  subtotal: number;
  gst: number;
  grandTotal: number;
}) {
  return (
    <div
      className="sticky top-[var(--safe-top)] z-20 -mx-3 mb-4 border-b border-brand-border bg-brand-card/95 px-3 py-3 shadow-lg backdrop-blur md:hidden"
      data-testid="mobile-bom-totals"
    >
      <div className="grid grid-cols-3 gap-2 text-xs font-bold text-brand-muted">
        <div>
          <p>Subtotal</p>
          <p className="mt-1 font-mono text-sm text-brand-text">
            ${formatMoney(subtotal)}
          </p>
        </div>
        <div>
          <p>GST</p>
          <p className="mt-1 font-mono text-sm text-brand-text">
            ${formatMoney(gst)}
          </p>
        </div>
        <div className="text-right">
          <p>Total</p>
          <p className="mt-1 font-mono text-xl font-black text-brand-primary">
            ${formatMoney(grandTotal)}
          </p>
        </div>
      </div>
    </div>
  );
}
