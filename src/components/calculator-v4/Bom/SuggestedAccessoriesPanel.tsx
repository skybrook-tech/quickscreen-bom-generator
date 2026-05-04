import { ChevronDown, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { buildAccessorySuggestions } from "../../../lib/suggestedAccessories";
import type { BOMLineItem } from "../../../types/bom.types";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(n);

interface Props {
  /** Called after a suggestion is added — e.g. scroll BOM table to show the new line. */
  onAddedSuggestion?: () => void;
}

export function SuggestedAccessoriesPanel({ onAddedSuggestion }: Props) {
  const { state, dispatch } = useCalculatorV4();
  const [expanded, setExpanded] = useState(true);

  const visible = useMemo(() => {
    if (!state.payload || !state.bomResult) return [];
    const lines = (state.bomResult.lines as BOMLineItem[]) ?? [];
    const all = buildAccessorySuggestions(state.payload, lines);
    return all.filter((s) => !state.dismissedSuggestionSkus.has(s.sku));
  }, [state.payload, state.bomResult, state.dismissedSuggestionSkus]);

  if (!state.bomResult || visible.length === 0) return null;

  return (
    <div className="border-t border-brand-border bg-brand-accent/10 px-4 py-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2  text-left rounded-lg py-0.5 -mx-1 px-1 hover:bg-brand-border/20 transition-colors"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <ChevronDown
            size={16}
            className={`flex-shrink-0 text-brand-accent transition-transform ${
              expanded ? "rotate-0" : "-rotate-90"
            }`}
            aria-hidden
          />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-accent truncate">
            Suggested accessories
          </h3>
        </span>
        <span className="text-[14px] text-brand-accent font-medium flex-shrink-0 tabular-nums">
          {visible.length} suggestion{visible.length === 1 ? "" : "s"}
        </span>
      </button>
      {expanded && (
        <div className="space-y-1.5 max-h-[150px] overflow-y-auto mt-2">
          {visible.map((s) => (
            <div
              key={s.sku}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-brand-card border border-brand-border"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-brand-text">
                    {s.name}
                  </span>
                  <span className="font-mono text-[10px] text-brand-accent">
                    {s.sku}
                  </span>
                  <p className="text-[11px] text-brand-muted truncate">
                    {s.desc}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs font-mono tabular-nums flex gap-1">
                <div className="text-brand-text">×{s.qty}</div>
                <div className="text-[10px] text-brand-muted">
                  {fmt(s.unitPrice)}
                </div>
              </div>
              <button
                onClick={() => {
                  dispatch({
                    type: "ADD_SUGGESTION",
                    suggestion: {
                      sku: s.sku,
                      name: s.name,
                      qty: s.qty,
                      unitPrice: s.unitPrice,
                    },
                  });
                  onAddedSuggestion?.();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-accent text-white text-xs font-medium hover:bg-brand-accent/80 transition-colors"
                data-testid={`v4-add-suggestion-${s.sku}`}
              >
                <Plus size={16} /> Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
