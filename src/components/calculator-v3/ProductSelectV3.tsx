import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCalculator } from '../../context/CalculatorContext';
import type { CanonicalPayload } from '../../types/canonical.types';

interface FenceProduct {
  id: string;
  name: string;
  system_type: string;
  description: string | null;
}

export function ProductSelectV3() {
  const { state, dispatch } = useCalculator();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: products } = useQuery<FenceProduct[]>({
    queryKey: ['v3FenceProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, system_type, description')
        .eq('product_type', 'fence')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as FenceProduct[];
    },
  });

  const currentCode = state.payload?.productCode ?? null;
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
        (p.description ?? '').toLowerCase().includes(q),
    );
  }, [products, query]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function selectProduct(p: FenceProduct) {
    const initialPayload: CanonicalPayload = {
      productCode: p.system_type,
      schemaVersion: 'v1',
      variables: {
        colour_code: 'B',
        slat_size_mm: 65,
        slat_gap_mm: 5,
        finish_family: 'standard',
      },
      runs: [
        {
          runId: crypto.randomUUID(),
          productCode: p.system_type,
          leftBoundary: { type: 'product_post' },
          rightBoundary: { type: 'product_post' },
          segments: [],
          corners: [],
        },
      ],
    };
    dispatch({ type: 'SET_PAYLOAD', payload: initialPayload });
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && filtered[activeIndex]) {
        e.preventDefault();
        selectProduct(filtered[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const buttonLabel = currentProduct
    ? `${currentProduct.name} (${currentProduct.system_type})`
    : 'Select a fencing system…';

  return (
    <div ref={wrapperRef} className="relative" data-testid="product-select">
      <label className="block text-sm font-medium text-brand-text mb-2">Product</label>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-sm text-brand-text hover:border-brand-accent/50 transition-colors"
      >
        <span className={currentProduct ? 'text-brand-text' : 'text-brand-muted'}>{buttonLabel}</span>
        <ChevronDown size={16} className="text-brand-muted shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-brand-card border border-brand-border rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-brand-border">
            <Search size={14} className="text-brand-muted shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search fences…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-sm text-brand-text placeholder:text-brand-muted/60"
              data-testid="product-select-search"
            />
          </div>
          <ul role="listbox" className="max-h-72 overflow-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-brand-muted">No fences match "{query}".</li>
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
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        active
                          ? 'bg-brand-accent/15 text-brand-accent'
                          : 'text-brand-text hover:bg-brand-border/50'
                      } ${selected ? 'font-medium' : ''}`}
                      data-testid={`product-option-${p.system_type}`}
                    >
                      <div className="font-mono text-xs text-brand-muted">{p.system_type}</div>
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
