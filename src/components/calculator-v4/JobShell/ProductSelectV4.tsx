import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Trash2, PlusCircle } from "lucide-react";
import { Input } from "../../ui/Input";
import { Segmented } from "../../ui/Segmented";
import { getCustomCalculators, saveCustomCalculators, isCustomCalculator } from "../../../lib/customCalculators";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { toast } from "sonner";

interface FenceProduct {
  id: string;
  name: string;
  system_type: string;
  description: string | null;
}

interface FenceProductWithPath extends FenceProduct {
  path?: string[];
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  separated?: boolean;
}

/**
 * v4 Product picker. Reads the products table (data-driven) and custom calculators.
 * Displays them hierarchically with headings and subheadings.
 */
export function ProductSelectV4({ value, onChange, separated = false }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { dispatch } = useCalculatorV4();

  const { data: products, refetch } = useQuery<FenceProductWithPath[]>({
    queryKey: ["v4FenceProducts"],
    queryFn: async () => {
      const customCalcs = getCustomCalculators();
      const customFormatted = customCalcs.map((c) => ({
        id: c.id,
        name: c.name,
        system_type: c.id,
        description: c.description,
        path: c.path,
      }));

      return customFormatted;
    },
  });

  const currentCode = value ?? null;
  const currentProduct = useMemo(
    () => products?.find((p) => p.system_type === currentCode),
    [products, currentCode],
  );

  const filtered = useMemo(() => {
    const list = products ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.system_type.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        (p.path ?? []).some((step) => step.toLowerCase().includes(q)),
    );
  }, [products, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, { product: FenceProductWithPath; idx: number }[]> = {};
    const order: string[] = [];

    filtered.forEach((p, idx) => {
      const category = (p.path && p.path[0]) || "General";
      if (!groups[category]) {
        groups[category] = [];
        order.push(category);
      }
      groups[category].push({ product: p, idx });
    });

    return order.map((cat) => ({
      category: cat,
      items: groups[cat],
    }));
  }, [filtered]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function selectProduct(p: FenceProduct) {
    onChange(p.system_type);
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && filtered[activeIndex]) {
        e.preventDefault();
        selectProduct(filtered[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const handleAddCustom = () => {
    const name = prompt("Enter the name of the new custom fencing type:");
    if (!name) return;
    const category = prompt("Enter the category path (e.g. Treated Pine, Pool Fencing):") || "Custom";
    const id = name.toLowerCase().replace(/[\s-]+/g, "-").replace(/[^a-z0-9-]/g, "");

    const customCalcs = getCustomCalculators();
    if (customCalcs.some((c) => c.id === id)) {
      alert("A custom fencing type with this name already exists.");
      return;
    }

    const newCalc = {
      id,
      name,
      path: [category, name],
      description: `Custom ${name} fencing calculator.`,
      variables: [
        {
          id: `custom-height-${Date.now()}`,
          field_key: "target_height_mm",
          label: "Height",
          control_type: "select" as const,
          data_type: "enum" as const,
          unit: "mm",
          required: true,
          default_value_json: "1800",
          options_json: ["1200", "1500", "1800", "2100"],
          sort_order: 1,
          visible_when_json: {}
        }
      ],
      materials: [
        {
          skuPattern: `${id.toUpperCase()}-POST`,
          namePattern: `${name} Post`,
          category: "post",
          unit: "each",
          defaultPrice: 35.00,
          formula: "ceil(length / 2.4) + 1",
          description: "Post spaced every 2.4 meters + 1 end post."
        }
      ]
    };

    saveCustomCalculators([...customCalcs, newCalc]);
    toast.success(`Created custom fencing type: "${name}"`);
    
    refetch().then(() => {
      onChange(id);
      setOpen(false);
      
      // Auto-trigger Logic Editor
      setTimeout(() => {
        dispatch({ type: "OPEN_LOGIC_EDITOR", productCode: id });
      }, 150);
    });
  };

  const handleDeleteCustom = (e: React.MouseEvent, systemType: string, productName: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm(`Are you sure you want to delete the custom fencing type "${productName}"?`)) return;

    const customCalcs = getCustomCalculators();
    const updated = customCalcs.filter((c) => c.id !== systemType);
    saveCustomCalculators(updated);
    toast.success(`Deleted custom fencing type "${productName}"`);
    
    refetch().then(() => {
      if (value === systemType) {
        onChange("");
      }
    });
  };

  const buttonLabel = currentProduct
    ? (currentProduct.path && currentProduct.path.length >= 2
        ? `${currentProduct.path[0]} - ${currentProduct.path[1]}`
        : currentProduct.name)
    : "Select a fencing system…";

  // When rendered separate (empty state layout)
  if (separated) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 text-left" data-testid="v4-product-cards">
        {/* Search Input for Separated Mode */}
        <div className="relative max-w-md mx-auto mb-6">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-brand-muted" />
          </span>
          <input
            type="text"
            placeholder="Search all fencing types..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-brand-border rounded-xl bg-brand-card text-brand-text text-sm outline-none focus:border-brand-accent transition-colors"
          />
        </div>

        {grouped.length === 0 ? (
          <div className="text-center py-8 text-brand-muted text-sm">
            No fencing types match "{query}".
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <div key={group.category} className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted/80 pl-2 border-l-2 border-brand-accent/70 select-none">
                  {group.category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {group.items.map(({ product: p }) => {
                    const selected = p.system_type === currentProduct?.system_type;
                    const isCustom = isCustomCalculator(p.system_type);
                    const displayName = p.path && p.path.length >= 2 ? p.path[1] : p.name;
                    return (
                      <div key={p.id} className="relative group text-left">
                        <button
                          type="button"
                          onClick={() => selectProduct(p)}
                          className={`w-full text-left p-4 rounded-xl border transition-all duration-200 pr-10 h-full flex flex-col justify-between ${selected
                            ? "border-brand-accent bg-brand-accent/5 ring-1 ring-brand-accent/40 shadow-sm"
                            : "border-brand-border bg-brand-card hover:border-brand-accent/50 hover:shadow-sm"
                            }`}
                        >
                          <div>
                            <div className="font-semibold text-sm text-brand-text leading-tight">
                              {displayName}
                            </div>
                            {p.description && (
                              <div className="text-xs text-brand-muted mt-1 leading-snug">
                                {p.description}
                              </div>
                            )}
                          </div>
                          <div className="mt-3">
                            <span className="inline-block font-mono text-[9px] bg-brand-border/40 text-brand-muted px-1.5 py-0.5 rounded">
                              {p.system_type}
                            </span>
                          </div>
                        </button>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustom(e, p.system_type, p.name)}
                            className="absolute right-3 top-3 p-1.5 rounded bg-brand-card hover:bg-red-500/10 text-brand-muted hover:text-brand-danger opacity-0 group-hover:opacity-100 transition-opacity border border-brand-border"
                            title="Delete custom fencing type"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 flex justify-center">
          <button
            type="button"
            onClick={handleAddCustom}
            className="flex items-center gap-2 py-2.5 px-6 rounded-xl border border-dashed border-brand-border hover:border-brand-accent bg-brand-card/40 hover:bg-brand-accent/5 text-xs font-semibold text-brand-accent transition-all duration-200 shadow-sm"
          >
            <PlusCircle size={15} />
            Add Custom Fence Type
          </button>
        </div>
      </div>
    );
  }

  // Segmented control fallback for very small numbers of total products
  const totalCount = products?.length ?? 0;
  if (totalCount <= 10 && !separated) {
    return (
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium uppercase tracking-wider text-brand-muted block mb-1.5">
          Product type
        </label>
        <div className="flex flex-wrap gap-2">
          <Segmented
            value={currentProduct?.system_type ?? ""}
            onChange={(val) =>
              selectProduct(
                filtered.find((p) => p.system_type === val) ?? filtered[0],
              )
            }
            options={filtered.map((p) => ({
              value: p.system_type,
              label: p.system_type,
            }))}
            size="sm"
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="p-2 rounded border border-dashed border-brand-accent/50 text-brand-accent hover:bg-brand-accent/5 transition-colors flex items-center justify-center"
            title="Add Custom Fence Type"
          >
            <PlusCircle size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative text-left" data-testid="v4-product-select">
      <label className="text-[11px] font-medium uppercase tracking-wider text-brand-muted block mb-1.5 select-none">
        Product
      </label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-brand-border rounded-[var(--brand-radius-sm)] text-sm text-brand-text hover:border-brand-accent/50 transition-colors"
      >
        <span
          className={currentProduct ? "text-brand-text font-medium" : "text-brand-muted"}
        >
          {buttonLabel}
        </span>
        <ChevronDown size={16} className="text-brand-muted shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-brand-card border border-brand-border rounded-[var(--brand-radius-sm)] shadow-lg overflow-hidden flex flex-col max-h-[380px]">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-brand-border shrink-0">
            <Search size={14} className="text-brand-muted shrink-0" />
            <Input
              autoFocus
              type="text"
              placeholder="Search fences…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-0 ring-0 focus:ring-0 focus:border-0 text-sm text-brand-text placeholder:text-brand-muted/60 p-0"
            />
          </div>
          
          <div className="overflow-y-auto flex-1">
            {grouped.length === 0 ? (
              <div className="px-3 py-2 text-sm text-brand-muted">
                No fences match "{query}".
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.category} className="border-b border-brand-border/30 last:border-b-0">
                  <div className="px-3 py-1 bg-brand-bg/50 text-[10px] font-bold uppercase tracking-wider text-brand-muted/75 select-none">
                    {group.category}
                  </div>
                  <ul className="divide-y divide-brand-border/10">
                    {group.items.map(({ product: p, idx }) => {
                      const active = idx === activeIndex;
                      const selected = p.system_type === currentCode;
                      const isCustom = isCustomCalculator(p.system_type);
                      const displayName = p.path && p.path.length >= 2 ? p.path[1] : p.name;
                      return (
                        <li key={p.id} className="relative group">
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectProduct(p);
                            }}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`w-full text-left px-4 py-2 pr-10 text-sm transition-colors ${active
                              ? "bg-brand-accent/15 text-brand-accent"
                              : "text-brand-text hover:bg-brand-border/50"
                              } ${selected ? "font-medium" : ""}`}
                          >
                            <div className="font-mono text-[9px] text-brand-muted">
                              {p.system_type}
                            </div>
                            <div className="truncate text-xs font-semibold">{displayName}</div>
                            {p.description && (
                              <div className="text-[11px] text-brand-muted truncate mt-0.5">
                                {p.description}
                              </div>
                            )}
                          </button>
                          {isCustom && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustom(e, p.system_type, p.name)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-red-500/10 text-brand-muted hover:text-brand-danger opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete custom fencing type"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
          
          <div className="p-2 border-t border-brand-border bg-brand-bg/50 shrink-0">
            <button
              type="button"
              onClick={handleAddCustom}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-brand-accent hover:bg-brand-accent/90 text-xs font-semibold text-white transition-colors"
            >
              <PlusCircle size={14} /> Add Custom Fence Type
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
