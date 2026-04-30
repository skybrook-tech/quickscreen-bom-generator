import { ChevronDown, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";

interface Suggestion {
  sku: string;
  name: string;
  desc: string;
  qty: number;
  unitPrice: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(n);

/**
 * v1 hardcoded suggested accessories derived from the current job state.
 *
 * TODO v4.2: move to engine response (`suggestions[]` field).
 * The migration path: extend `product_companion_rules` with a `suggested:boolean`
 * column, or introduce a new `product_suggestions` table; let the engine produce
 * suggestions in the same way it produces companions today, and replace this
 * hardcoded set with a read of `bomResult.suggestions`.
 */
function buildSuggestions(
  vars: Record<string, string | number | boolean>,
  hasResult: boolean,
): Suggestion[] {
  if (!hasResult) return [];
  const list: Suggestion[] = [];
  const colour = String(vars.colour_code ?? "black-satin");

  if (vars.mounting_type === "concreted-in-ground") {
    list.push({
      sku: "RAPIDSET-20KG",
      name: "Rapid-set concrete bag (20kg)",
      desc: "Recommended for concreted-in-ground posts.",
      qty: 4,
      unitPrice: 12.5,
    });
  }

  list.push({
    sku: "XP-6000-FP",
    name: "Full-length post stock (6000mm)",
    desc: "Spare 6m post in case of cuts/oversize runs.",
    qty: 1,
    unitPrice: 89.0,
  });

  list.push({
    sku: `XP-TOUCHUP-${colour.slice(0, 2).toUpperCase()}`,
    name: `Touch-up spray can — ${colour}`,
    desc: "Colour-matched aerosol for site touch-ups.",
    qty: 1,
    unitPrice: 18.5,
  });

  list.push({
    sku: "QS-CSR-KIT",
    name: "Centre support rail kit",
    desc: "Recommended for panels approaching max width.",
    qty: 1,
    unitPrice: 65.0,
  });

  return list;
}

interface Props {
  /** Called after a suggestion is added — e.g. scroll BOM table to show the new line. */
  onAddedSuggestion?: () => void;
}

export function SuggestedAccessoriesPanel({ onAddedSuggestion }: Props) {
  const { state, dispatch } = useCalculatorV4();
  const [expanded, setExpanded] = useState(true);

  const variables = useMemo(
    () => ({
      ...(state.payload?.variables ?? {}),
      ...(state.payload?.runs[0]?.variables ?? {}),
    }),
    [state.payload],
  );

  const visible = useMemo(() => {
    const all = buildSuggestions(variables, !!state.bomResult);
    return all.filter((s) => !state.dismissedSuggestionSkus.has(s.sku));
  }, [variables, state.bomResult, state.dismissedSuggestionSkus]);

  if (!state.bomResult || visible.length === 0) return null;

  return (
    <div className="border-t border-brand-border bg-brand-accent/10 px-4 py-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2  text-left rounded-md py-0.5 -mx-1 px-1 hover:bg-brand-border/20 transition-colors"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <ChevronDown
            size={14}
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
              className="flex items-center gap-3 px-3 py-2 rounded-md bg-brand-card border border-brand-border"
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
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-accent text-white text-xs font-medium hover:bg-brand-accent/80 transition-colors"
                data-testid={`v4-add-suggestion-${s.sku}`}
              >
                <Plus size={12} /> Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
