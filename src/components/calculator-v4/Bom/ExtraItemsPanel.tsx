import { useEffect, useRef, useState } from "react";
import { PlusCircle, Trash2, X } from "lucide-react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { useProductSearch } from "../../../hooks/useProductSearch";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";

/**
 * Manual extra lines with catalog typeahead (search-products) + create-custom flow (ported from v3).
 */
export function ExtraItemsPanel() {
  const { state, dispatch } = useCalculatorV4();
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [sku, setSku] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [createMode, setCreateMode] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(desc), 250);
    return () => clearTimeout(t);
  }, [desc]);

  const { data: suggestions = [], isFetching } =
    useProductSearch(debouncedQuery);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!state.bomResult) return null;

  const items = state.extraItems;

  const canAdd =
    desc.trim().length > 0 && qty > 0 && unitPrice !== "" && unitPrice >= 0;

  function selectSuggestion(item: {
    sku: string;
    name: string;
    unitPrice?: number;
    unit?: string;
  }) {
    setSku(item.sku);
    setDesc(item.name);
    if (item.unitPrice != null) setUnitPrice(item.unitPrice);
    setShowDropdown(false);
    setActiveIndex(-1);
    setCreateMode(false);
  }

  function handleAdd() {
    if (!canAdd) return;
    dispatch({
      type: "ADD_EXTRA",
      item: {
        id: crypto.randomUUID(),
        sku: sku.trim(),
        description: desc.trim(),
        qty,
        unitPrice: unitPrice as number,
      },
    });
    setDesc("");
    setQty(1);
    setUnitPrice("");
    setSku("");
    setCreateMode(false);
    setDebouncedQuery("");
  }

  function handleCreateNew() {
    setCreateMode(true);
    setShowDropdown(false);
    setSku("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showDropdown && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowDropdown(false);
        return;
      }
    }
    if (e.key === "Enter" && canAdd) handleAdd();
  }

  const noMatches =
    debouncedQuery.trim().length >= 2 &&
    !isFetching &&
    suggestions.length === 0;

  return (
    <div
      className="border-t border-brand-border bg-brand-card px-4 py-3 flex-shrink-0"
      data-testid="extra-items-panel"
    >
      {items.length > 0 && (
        <ul className="mb-3 space-y-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-sm text-brand-muted"
            >
              <span className="font-mono text-xs text-brand-accent shrink-0">
                {item.sku?.trim() ? item.sku : "EXTRA"}
              </span>
              <span className="flex-1 truncate italic">{item.description}</span>
              <span className="tabular-nums text-brand-text not-italic">
                ×{item.qty}
              </span>
              <span className="tabular-nums text-brand-text not-italic">
                ${item.unitPrice.toFixed(2)}
              </span>
              <span className="tabular-nums font-medium text-brand-text not-italic">
                ${(item.unitPrice * item.qty).toFixed(2)}
              </span>
              <Button
                icon={Trash2}
                variant="ghost-danger"
                size="small"
                onClick={() => dispatch({ type: "REMOVE_EXTRA", id: item.id })}
                className="shrink-0"
              />
            </li>
          ))}
        </ul>
      )}

      <div ref={wrapperRef} className="flex flex-wrap gap-2 items-end">
        <div className="relative flex-1 min-w-[13rem]">
          <label className="block text-[11px] text-brand-muted mb-1">
            {createMode
              ? "Description (new item)"
              : "Add extra items (search SKU or description or create new)"}
          </label>
          <Input
            type="text"
            placeholder={
              createMode
                ? "e.g. Site labour — 2 hours"
                : "Type SKU or description…"
            }
            value={desc}
            onChange={(e) => {
              setDesc(e.target.value);
              setSku("");
              if (!createMode && e.target.value.length >= 2)
                setShowDropdown(true);
              else setShowDropdown(false);
              setActiveIndex(-1);
            }}
            onFocus={() => {
              if (!createMode && suggestions.length > 0 && desc.length >= 2) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            data-testid="v4-extra-desc"
            className="w-full rounded-md placeholder:text-brand-muted/60"
          />

          {showDropdown && !createMode && (
            <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-brand-card border border-brand-border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {suggestions.length > 0 ? (
                suggestions.map((item, idx) => (
                  <button
                    key={item.sku}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(item);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full text-left px-3 py-2 text-xs border-b border-brand-border/40 last:border-b-0 transition-colors ${
                      idx === activeIndex
                        ? "bg-brand-accent/15 text-brand-accent"
                        : "text-brand-text hover:bg-brand-border/40"
                    }`}
                  >
                    <div>
                      <span className="font-mono text-brand-accent">
                        {item.sku}
                      </span>
                      <span className="text-brand-muted mx-1">—</span>
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.unitPrice != null && (
                      <div className="text-brand-muted text-[11px] mt-0.5">
                        ${item.unitPrice.toFixed(2)} {item.unit ?? "each"}
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-brand-muted italic">
                  {isFetching ? "Searching…" : "No matches."}
                </div>
              )}
              {noMatches && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCreateNew();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-brand-accent border-t border-brand-border hover:bg-brand-accent/10 transition-colors"
                  data-testid="extra-items-create-new"
                >
                  + Create new item “{desc}”
                </button>
              )}
            </div>
          )}
        </div>

        {createMode && (
          <div className="min-w-36">
            <label className="block text-[11px] text-brand-muted mb-1">
              SKU (optional)
            </label>
            <Input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="EXTRA-…"
              className="w-full rounded-md placeholder:text-brand-muted/60"
            />
          </div>
        )}

        <div>
          <label className="block text-[11px] text-brand-muted mb-1">Qty</label>
          <Input
            type="number"
            min={1}
            step={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            onKeyDown={handleKeyDown}
            data-testid="v4-extra-qty"
            className="w-20 rounded-md text-right tabular-nums"
          />
        </div>

        <div>
          <label className="block text-[11px] text-brand-muted mb-1">
            Unit price ($)
          </label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={unitPrice}
            onChange={(e) => {
              const n = Number(e.target.value);
              setUnitPrice(e.target.value === "" || Number.isNaN(n) ? "" : n);
            }}
            onKeyDown={handleKeyDown}
            data-testid="v4-extra-price"
            className="w-28 rounded-md text-right tabular-nums"
          />
        </div>

        <Button
          icon={PlusCircle}
          variant="primary"
          onClick={handleAdd}
          disabled={!canAdd}
          data-testid="v4-extra-add"
          className="whitespace-nowrap"
        >
          Add
        </Button>

        {createMode && (
          <Button
            icon={X}
            variant="secondary"
            size="small"
            onClick={() => {
              setCreateMode(false);
              setDesc("");
              setSku("");
              setUnitPrice("");
            }}
          />
        )}
      </div>
    </div>
  );
}
