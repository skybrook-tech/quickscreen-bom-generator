import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { Input } from "../../ui/Input";
import { Segmented } from "../../ui/Segmented";

interface FenceProduct {
  id: string;
  name: string;
  system_type: string;
  description: string | null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  separated?: boolean;
}

/**
 * v4 Product picker. Reads the products table (data-driven).
 *
 * Job creation (`CalculatorV4Page`) builds a run with a master fence segment;
 * missing keys are seeded onto that segment via `MasterFenceVariableSeeds`.
 */
export function ProductSelectV4({ value, onChange, separated = false }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: products } = useQuery<FenceProduct[]>({
    queryKey: ["v4FenceProducts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, system_type, description")
        .eq("product_type", "fence")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FenceProduct[];
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
        (p.description ?? "").toLowerCase().includes(q),
    );
  }, [products, query]);

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

  const buttonLabel = currentProduct
    ? `${currentProduct.name} (${currentProduct.system_type})`
    : "Select a fencing system…";

  if (filtered.length <= 10 && separated) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="v4-product-cards">
        {filtered.map((p) => {
          const selected = p.system_type === currentProduct?.system_type;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => selectProduct(p)}
              className={`text-left p-4 rounded-[var(--brand-radius)] border transition-all duration-150 ${selected
                ? "border-brand-accent bg-brand-accent/5 ring-1 ring-brand-accent/40 shadow-sm"
                : "border-brand-border bg-brand-card hover:border-brand-accent/50 hover:shadow-sm"
                }`}
            >
              <div className="font-semibold text-sm text-brand-text leading-tight">
                {p.name}
              </div>
              {p.description && (
                <div className="text-xs text-brand-muted mt-1 leading-snug">
                  {p.description}
                </div>
              )}
              <div className="mt-2">
                <span className="inline-block font-mono text-[10px] bg-brand-border/40 text-brand-muted px-1.5 py-0.5 rounded">
                  {p.system_type}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (filtered.length <= 10) {
    return (
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium uppercase tracking-wider text-brand-muted block mb-1.5">
          Product type
        </label>
        <Segmented
          value={currentProduct?.system_type ?? ""}
          onChange={(value) =>
            selectProduct(
              filtered.find((p) => p.system_type === value) ?? filtered[0],
            )
          }
          options={filtered.map((p) => ({
            value: p.system_type,
            label: p.system_type,
          }))}
          size="sm"
        />
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative" data-testid="v4-product-select">
      <label className="text-[11px] font-medium uppercase tracking-wider text-brand-muted block mb-1.5">
        Product
      </label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-brand-border rounded-[var(--brand-radius-sm)] text-sm text-brand-text hover:border-brand-accent/50 transition-colors"
      >
        <span
          className={currentProduct ? "text-brand-text" : "text-brand-muted"}
        >
          {buttonLabel}
        </span>
        <ChevronDown size={16} className="text-brand-muted shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-brand-card border border-brand-border rounded-[var(--brand-radius-sm)] shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-brand-border">
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
          <ul role="listbox" className="max-h-72 overflow-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-brand-muted">
                No fences match "{query}".
              </li>
            ) : (
              filtered.map((p, idx) => {
                const active = idx === activeIndex;
                const selected = p.system_type === currentCode;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectProduct(p);
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${active
                        ? "bg-brand-accent/15 text-brand-accent"
                        : "text-brand-text hover:bg-brand-border/50"
                        } ${selected ? "font-medium" : ""}`}
                    >
                      <div className="font-mono text-xs text-brand-muted">
                        {p.system_type}
                      </div>
                      <div className="truncate">{p.name}</div>
                      {p.description && (
                        <div className="text-xs text-brand-muted truncate mt-0.5">
                          {p.description}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
