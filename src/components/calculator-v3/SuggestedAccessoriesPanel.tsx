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
              className="grid gap-3 rounded-2xl border border-brand-border/70 bg-brand-bg/60 px-3 py-3 text-sm font-semibold md:grid-cols-[1fr_auto]"
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
                  <p className="mt-1 text-xs font-medium text-brand-warning">
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
                  className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-primary/90 hover:shadow-sm disabled:cursor-not-allowed disabled:bg-brand-border"
                >
                  {added ? <Check size={16} /> : <PlusCircle size={16} />}
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
