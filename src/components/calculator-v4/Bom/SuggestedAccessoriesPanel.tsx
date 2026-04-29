import { Plus } from "lucide-react";
import { useMemo } from "react";
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

export function SuggestedAccessoriesPanel() {
  const { state, dispatch } = useCalculatorV4();

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
    <div className="border-t border-brand-border bg-amber-500/5 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Suggested accessories
        </h3>
        <span className="text-[10px] text-brand-muted">
          {visible.length} suggestion{visible.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-1.5">
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
                <span className="font-mono text-[10px] text-brand-muted">
                  {s.sku}
                </span>
              </div>
              <p className="text-[11px] text-brand-muted truncate">{s.desc}</p>
            </div>
            <div className="text-right text-xs font-mono tabular-nums">
              <div className="text-brand-text">×{s.qty}</div>
              <div className="text-[10px] text-brand-muted">
                {fmt(s.unitPrice)}
              </div>
            </div>
            <button
              onClick={() =>
                dispatch({
                  type: "ADD_SUGGESTION",
                  suggestion: {
                    sku: s.sku,
                    name: s.name,
                    qty: s.qty,
                    unitPrice: s.unitPrice,
                  },
                })
              }
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors"
              data-testid={`v4-add-suggestion-${s.sku}`}
            >
              <Plus size={12} /> Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
