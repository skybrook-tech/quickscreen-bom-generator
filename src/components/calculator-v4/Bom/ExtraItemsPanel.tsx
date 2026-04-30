import { Plus } from "lucide-react";
import { useState } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";

/**
 * Manual extra-items panel. Fixed footer — visible whenever a BOM is loaded.
 * For v4 v1 this is a free-text/qty/unit-price form; the typeahead-from-products
 * pattern from v3 ExtraItemsPanel can be ported in a follow-up.
 */
export function ExtraItemsPanel() {
  const { state, dispatch } = useCalculatorV4();
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);

  if (!state.bomResult) return null;

  function handleAdd() {
    if (!desc.trim() || qty <= 0) return;
    dispatch({
      type: "ADD_EXTRA",
      item: {
        id: crypto.randomUUID(),
        sku: "",
        description: desc.trim(),
        qty,
        unitPrice: price,
      },
    });
    setDesc("");
    setQty(1);
    setPrice(0);
  }

  return (
    <div className="border-t border-brand-border bg-brand-card px-4 py-3 flex-shrink-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted mb-2">
        Add extra items
      </h3>

      <div className="grid grid-cols-12 gap-2">
        <input
          type="text"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          className="col-span-7 px-2.5 py-1.5 rounded-md bg-white border border-brand-border text-xs text-brand-text focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none"
          data-testid="v4-extra-desc"
        />
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
          className="col-span-1 px-2 py-1.5 rounded-md bg-white border border-brand-border text-xs text-brand-text font-mono tabular-nums focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none"
          data-testid="v4-extra-qty"
        />
        <input
          type="number"
          min={0}
          step={0.01}
          placeholder="Unit $"
          value={price || ""}
          onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
          className="col-span-2 px-2 py-1.5 rounded-md bg-white border border-brand-border text-xs text-brand-text font-mono tabular-nums focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none"
          data-testid="v4-extra-price"
        />
        <button
          onClick={handleAdd}
          className="col-span-2 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-brand-accent text-white text-xs font-medium hover:opacity-90"
          data-testid="v4-extra-add"
        >
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  );
}
