import { Loader2, Sparkles } from "lucide-react";

interface Props {
  pricingTier: string;
  grandTotal: number;
  /** Shown under “Grand total” when viewing a filtered tab (run / gates). */
  totalsScopeLabel?: string;
  isPending: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(n);

/**
 * Top of the BOM panel — title, live indicator, pricing tier, grand total.
 */
export function BomHeader({
  pricingTier,
  grandTotal,
  totalsScopeLabel,
  isPending,
}: Props) {
  return (
    <div className="bg-blue-800 text-white px-4 py-3 flex-shrink-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wide">
              Bill of Materials
            </h2>
            {isPending ? (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-white/15 rounded-full px-2 py-0.5">
                <Loader2 size={9} className="animate-spin" />
                Calculating
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-white/15 rounded-full px-2 py-0.5">
                <Sparkles size={9} />
                Live
              </span>
            )}
          </div>
          <p className="text-xs text-white/80 mt-0.5 capitalize">
            Pricing tier: {pricingTier.replace("tier", "Tier ")}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-white/70">
            Grand total
          </div>
          {totalsScopeLabel ? (
            <div className="text-[10px] text-white/65 mt-0.5">{totalsScopeLabel}</div>
          ) : null}
          <div className="text-xl font-bold font-mono tabular-nums">
            {fmt(grandTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}
