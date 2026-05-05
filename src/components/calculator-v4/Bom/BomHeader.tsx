import { AlertTriangle, Loader2, Sparkles } from "lucide-react";

interface Props {
  /** Primary summary under title, e.g. run/segment counts */
  summaryPrimary: string;
  /** Optional second line: per-run subtotals when BOM exists */
  summarySecondary?: string;
  grandTotal: number;
  /** Shown under "Grand total" when viewing a filtered tab (run / gates). */
  totalsScopeLabel?: string;
  isPending: boolean;
  /** True when the form has changed since the last BOM was generated. */
  isStale: boolean;
  /** True when at least one BOM result exists. */
  hasBom: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(n);

/**
 * Top of the BOM panel — title, live/stale indicator, job summary, grand total.
 */
export function BomHeader({
  summaryPrimary,
  summarySecondary,
  grandTotal,
  totalsScopeLabel,
  isPending,
  isStale,
  hasBom,
}: Props) {
  const badge = (() => {
    if (isPending) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-white/15 rounded-full px-2 py-0.5">
          <Loader2 size={9} className="animate-spin" />
          Calculating
        </span>
      );
    }
    if (!hasBom) return null;
    if (isStale) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-amber-400/25 text-amber-200 rounded-full px-2 py-0.5">
          <AlertTriangle size={9} />
          Stale — regenerate
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-white/15 rounded-full px-2 py-0.5">
        <Sparkles size={9} />
        Live
      </span>
    );
  })();

  return (
    <div className="bg-blue-800 text-white px-4 py-3 flex-shrink-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wide">
              Bill of Materials
            </h2>
            {badge}
          </div>
          <p className="text-xs text-white/80 mt-0.5">{summaryPrimary}</p>
          {summarySecondary ? (
            <p className="text-[11px] text-white/70 mt-0.5 truncate max-w-[min(100vw-8rem,28rem)]">
              {summarySecondary}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-white/70">
            Grand total
          </div>
          {totalsScopeLabel ? (
            <div className="text-[10px] text-white/65 mt-0.5">{totalsScopeLabel}</div>
          ) : null}
          <div className={`text-xl font-bold font-mono tabular-nums transition-opacity ${isStale && hasBom ? "opacity-50" : ""}`}>
            {fmt(grandTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}
