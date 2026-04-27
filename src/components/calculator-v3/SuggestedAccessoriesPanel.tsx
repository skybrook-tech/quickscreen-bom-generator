import { Check, PlusCircle } from "lucide-react";
import type { ExtraItem } from "../../types/bom.types";
import type { SuggestedAccessory } from "../../lib/suggestedAccessories";

interface SuggestedAccessoriesPanelProps {
  suggestions: SuggestedAccessory[];
  addedItems: ExtraItem[];
  onAdd: (item: ExtraItem) => void;
}

export function SuggestedAccessoriesPanel({
  suggestions,
  addedItems,
  onAdd,
}: SuggestedAccessoriesPanelProps) {
  if (suggestions.length === 0) return null;

  const addedKeys = new Set(
    addedItems.map((item) => item.sku ?? item.id),
  );

  return (
    <div
      className="mt-4 border-t border-brand-border pt-4"
      data-testid="suggested-accessories-panel"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Suggested accessories
          </p>
          <p className="mt-1 text-xs text-brand-muted">
            Not included in the BOM until added.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        {suggestions.map((item) => {
          const key = item.sku ?? item.id;
          const added = addedKeys.has(key);
          return (
            <div
              key={item.id}
              className="grid gap-3 rounded-md border border-brand-border bg-slate-50 px-3 py-3 text-sm md:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-brand-accent">
                    {item.sku ?? "EXTRA"}
                  </span>
                  <span className="font-medium text-brand-text">
                    {item.description}
                  </span>
                </div>
                <p className="mt-1 text-xs text-brand-muted">{item.reason}</p>
                {!item.priced && (
                  <p className="mt-1 text-xs font-medium text-amber-700">
                    Price not seeded yet.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 md:justify-end">
                <div className="text-right tabular-nums">
                  <p className="text-xs text-brand-muted">Qty</p>
                  <p className="font-semibold text-brand-text">
                    {item.quantity}
                  </p>
                </div>
                <div className="text-right tabular-nums">
                  <p className="text-xs text-brand-muted">Unit</p>
                  <p className="font-semibold text-brand-text">
                    ${item.unitPrice.toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAdd(item)}
                  disabled={added}
                  className="flex items-center gap-1.5 rounded-md bg-brand-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-accent/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {added ? <Check size={14} /> : <PlusCircle size={14} />}
                  {added ? "Added" : "Add"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
