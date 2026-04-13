import { useState, useRef, useEffect, useMemo } from "react";
import { PlusCircle } from "lucide-react";
import type { ExtraItem } from "../../types/bom.types";
import { useProductSearch } from "../../hooks/useProductSearch";
import { useFenceConfig } from "../../context/FenceConfigContext";
import type { ProductSearchItem } from "../../hooks/useProductSearch";

interface ExtraItemsInputProps {
  onAdd: (item: ExtraItem) => void;
}

let _counter = 0;
function genId(): string {
  return `extra-${Date.now()}-${++_counter}`;
}

/** Convert a colour slug (e.g. "black-satin") to a search-friendly string ("black satin"). */
function colourToWords(slug: string): string {
  return slug.replace(/-/g, " ").toLowerCase();
}

/** Returns true if the item's name or description contains the colour words. */
function matchesColour(item: ProductSearchItem, colourWords: string): boolean {
  const hay = `${item.name} ${item.description}`.toLowerCase();
  return hay.includes(colourWords);
}

export function ExtraItemsInput({ onAdd }: ExtraItemsInputProps) {
  const { state: fenceConfig } = useFenceConfig();
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [selectedSku, setSelectedSku] = useState<string | undefined>(undefined);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search query — don't fire while user is mid-keystroke
  const [debouncedDesc, setDebouncedDesc] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedDesc(desc), 300);
    return () => clearTimeout(t);
  }, [desc]);

  const { data: rawSuggestions = [] } = useProductSearch(debouncedDesc);

  // Re-order: items matching the current fence colour float to the top
  const suggestions = useMemo(() => {
    if (!fenceConfig.colour || rawSuggestions.length === 0)
      return rawSuggestions;
    const colourWords = colourToWords(fenceConfig.colour);
    const matched: ProductSearchItem[] = [];
    const rest: ProductSearchItem[] = [];
    for (const item of rawSuggestions) {
      (matchesColour(item, colourWords) ? matched : rest).push(item);
    }
    return [...matched, ...rest];
  }, [rawSuggestions, fenceConfig.colour]);

  // Hide dropdown when there's nothing to show
  useEffect(() => {
    if (suggestions.length === 0) setShowDropdown(false);
    else if (debouncedDesc.length >= 2) setShowDropdown(true);
  }, [suggestions, debouncedDesc]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const canAdd =
    desc.trim().length > 0 && qty > 0 && unitPrice !== "" && unitPrice >= 0;

  const handleSelectSuggestion = (s: ProductSearchItem) => {
    setDesc(s.name);
    setSelectedSku(s.sku);
    if (s.unitPrice != null) setUnitPrice(s.unitPrice);
    setShowDropdown(false);
    setActiveIndex(-1);
    // Focus qty field after selection
    setTimeout(() => {
      inputRef.current?.parentElement?.querySelectorAll("input")[1]?.focus();
    }, 0);
  };

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({
      id: genId(),
      description: desc.trim(),
      quantity: qty,
      unitPrice: unitPrice as number,
      sku: selectedSku,
    });
    setDesc("");
    setQty(1);
    setUnitPrice("");
    setSelectedSku(undefined);
    setDebouncedDesc("");
  };

  const handleDescChange = (val: string) => {
    setDesc(val);
    setSelectedSku(undefined); // clear SKU if user edits manually
    if (val.length >= 2) setShowDropdown(true);
    else setShowDropdown(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[activeIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowDropdown(false);
        return;
      }
    }
    if (e.key === "Enter" && canAdd) handleAdd();
  };

  return (
    <div className="mt-4 border-t border-brand-border pt-4">
      <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2">
        Add Extra Item
      </p>
      {/* Items list is rendered in the BOM table above as the "Extras" category */}

      {/* Input row */}
      <div className="flex flex-wrap gap-2 items-end flex items-center">
        {/* Description with autocomplete */}
        <div className="relative flex-1  min-w-40">
          <input
            ref={inputRef}
            type="text"
            placeholder="Description or SKU…"
            value={desc}
            onChange={(e) => handleDescChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0 && desc.length >= 2)
                setShowDropdown(true);
            }}
            className="w-full px-2.5 py-1.5 bg-brand-bg border border-brand-border rounded-md text-sm text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:ring-1 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
          />

          {showDropdown && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-brand-card border border-brand-border rounded-md shadow-lg"
              style={{ maxHeight: "200px", overflowY: "auto" }}
            >
              {suggestions.map((item, idx) => (
                <button
                  key={item.sku}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(item);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors border-b border-brand-border/40 last:border-b-0 ${
                    idx === activeIndex
                      ? "bg-brand-accent/15 text-brand-accent"
                      : "text-brand-text hover:bg-brand-border/40"
                  }`}
                >
                  <span className="font-mono text-brand-accent">
                    {item.sku}
                  </span>
                  <span className="text-brand-muted mx-1">—</span>
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <label className="text-xs text-brand-muted whitespace-nowrap">
            Qty
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            onKeyDown={handleKeyDown}
            className="w-16 px-2 py-1.5 bg-brand-bg border border-brand-border rounded-md text-sm text-brand-text text-right focus:outline-none focus:ring-1 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors tabular-nums"
          />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-xs text-brand-muted whitespace-nowrap">
            Unit ${unitPrice}
          </label>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap"
        >
          <PlusCircle size={14} />
          Add
        </button>
      </div>
    </div>
  );
}
