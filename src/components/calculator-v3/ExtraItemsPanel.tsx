import { useEffect, useRef, useState } from 'react';
import { PlusCircle, Trash2, X } from 'lucide-react';
import type { ExtraItem } from '../../types/bom.types';
import { useProductSearch } from '../../hooks/useProductSearch';

interface ExtraItemsPanelProps {
  items: ExtraItem[];
  onAdd: (item: ExtraItem) => void;
  onRemove: (id: string) => void;
}

let _counter = 0;
function genId(): string {
  return `extra-${Date.now()}-${++_counter}`;
}

export function ExtraItemsPanel({ items, onAdd, onRemove }: ExtraItemsPanelProps) {
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [sku, setSku] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [createMode, setCreateMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(desc), 250);
    return () => clearTimeout(t);
  }, [desc]);

  const { data: suggestions = [], isFetching } = useProductSearch(debouncedQuery);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const canAdd = desc.trim().length > 0 && qty > 0 && unitPrice !== '' && unitPrice >= 0;

  function selectSuggestion(item: { sku: string; name: string; description?: string; unitPrice?: number }) {
    setSku(item.sku);
    setDesc(item.name);
    if (item.unitPrice != null) setUnitPrice(item.unitPrice);
    setShowDropdown(false);
    setActiveIndex(-1);
    setCreateMode(false);
  }

  function handleAdd() {
    if (!canAdd) return;
    onAdd({
      id: genId(),
      description: desc.trim(),
      quantity: qty,
      unitPrice: unitPrice as number,
      sku: sku.trim() || undefined,
    });
    setDesc('');
    setQty(1);
    setUnitPrice('');
    setSku('');
    setCreateMode(false);
    setDebouncedQuery('');
  }

  function handleCreateNew() {
    setCreateMode(true);
    setShowDropdown(false);
    setSku('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showDropdown && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowDropdown(false);
        return;
      }
    }
    if (e.key === 'Enter' && canAdd) handleAdd();
  }

  const noMatches =
    debouncedQuery.trim().length >= 2 && !isFetching && suggestions.length === 0;

  return (
    <div className="mt-4 border-t border-brand-border pt-4" data-testid="extra-items-panel">
      <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2">
        Extra items
      </p>

      {items.length > 0 && (
        <ul className="mb-3 space-y-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-sm italic text-brand-muted"
            >
              <span className="font-mono text-xs text-brand-accent shrink-0">
                {item.sku ?? 'EXTRA'}
              </span>
              <span className="flex-1 truncate">{item.description}</span>
              <span className="tabular-nums text-brand-text not-italic">×{item.quantity}</span>
              <span className="tabular-nums text-brand-text not-italic">${item.unitPrice.toFixed(2)}</span>
              <span className="tabular-nums font-medium text-brand-text not-italic">
                ${(item.unitPrice * item.quantity).toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label="Remove extra item"
                className="p-1 rounded text-brand-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div ref={wrapperRef} className="flex flex-wrap gap-2 items-end">
        {/* Description + typeahead */}
        <div className="relative flex-1 min-w-52">
          <label className="block text-xs text-brand-muted mb-1">
            {createMode ? 'Description (new item)' : 'Search SKU / description'}
          </label>
          <input
            ref={inputRef}
            type="text"
            placeholder={createMode ? 'e.g. Site labour — 2 hours' : 'Type SKU or description…'}
            value={desc}
            onChange={(e) => {
              setDesc(e.target.value);
              setSku('');
              if (!createMode && e.target.value.length >= 2) setShowDropdown(true);
              else setShowDropdown(false);
              setActiveIndex(-1);
            }}
            onFocus={() => {
              if (!createMode && suggestions.length > 0 && desc.length >= 2) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            data-testid="extra-items-search"
            className="w-full px-2.5 py-1.5 bg-brand-bg border border-brand-border rounded-md text-sm text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:ring-1 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
          />

          {showDropdown && !createMode && (
            <div
              className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-brand-card border border-brand-border rounded-md shadow-lg"
              style={{ maxHeight: '240px', overflowY: 'auto' }}
            >
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
                        ? 'bg-brand-accent/15 text-brand-accent'
                        : 'text-brand-text hover:bg-brand-border/40'
                    }`}
                  >
                    <div>
                      <span className="font-mono text-brand-accent">{item.sku}</span>
                      <span className="text-brand-muted mx-1">—</span>
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.unitPrice != null && (
                      <div className="text-brand-muted text-[11px] mt-0.5">
                        ${item.unitPrice.toFixed(2)} {item.unit ?? 'each'}
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-brand-muted italic">
                  {isFetching ? 'Searching…' : 'No matches.'}
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
          <div className="min-w-40">
            <label className="block text-xs text-brand-muted mb-1">SKU (optional)</label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="EXTRA-…"
              className="w-full px-2.5 py-1.5 bg-brand-bg border border-brand-border rounded-md text-sm text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:ring-1 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-brand-muted mb-1">Qty</label>
          <input
            type="number"
            min="1"
            step="1"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            onKeyDown={handleKeyDown}
            className="w-20 px-2.5 py-1.5 bg-brand-bg border border-brand-border rounded-md text-sm text-brand-text text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-brand-muted mb-1">Unit price ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={unitPrice}
            onChange={(e) => {
              const n = Number(e.target.value);
              setUnitPrice(isNaN(n) ? '' : n);
            }}
            onKeyDown={handleKeyDown}
            className="w-28 px-2.5 py-1.5 bg-brand-bg border border-brand-border rounded-md text-sm text-brand-text text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap"
          data-testid="extra-items-add"
        >
          <PlusCircle size={14} />
          Add
        </button>

        {createMode && (
          <button
            type="button"
            onClick={() => {
              setCreateMode(false);
              setDesc('');
              setSku('');
              setUnitPrice('');
            }}
            aria-label="Cancel new item"
            className="p-1.5 text-brand-muted hover:text-brand-text transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
