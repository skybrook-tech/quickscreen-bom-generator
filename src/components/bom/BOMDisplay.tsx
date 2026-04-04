import { useState } from 'react';
import type { BOMResult, BOMLineItem as BOMLineItemType } from '../../types/bom.types';
import { BOMLineItem } from './BOMLineItem';
import { BOMSummary } from './BOMSummary';

type ViewFilter = 'all' | 'fence' | 'gates';

interface BOMDisplayProps {
  result: BOMResult;
}

const CATEGORY_ORDER = ['post', 'slat', 'rail', 'bracket', 'gate', 'hardware', 'accessory', 'screw'] as const;

function sortItems(items: BOMLineItemType[]): BOMLineItemType[] {
  return [...items].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.category as typeof CATEGORY_ORDER[number]);
    const bi = CATEGORY_ORDER.indexOf(b.category as typeof CATEGORY_ORDER[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export function BOMDisplay({ result }: BOMDisplayProps) {
  const [view, setView] = useState<ViewFilter>('all');

  const fenceItems = sortItems(result.fenceItems);
  const gateItems  = sortItems(result.gateItems);
  const allItems   = view === 'fence' ? fenceItems
    : view === 'gates' ? gateItems
    : [...fenceItems, ...gateItems];

  const hasGates = result.gateItems.length > 0;

  return (
    <div>
      {/* ── View filter ─────────────────────────────────────────── */}
      {hasGates && (
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            data-testid="bom-view-all"
            onClick={() => setView('all')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              view === 'all'
                ? 'bg-brand-accent text-white'
                : 'border border-brand-border text-brand-muted hover:text-brand-text'
            }`}
          >
            All
          </button>
          <button
            type="button"
            data-testid="bom-view-fence"
            onClick={() => setView('fence')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              view === 'fence'
                ? 'bg-brand-accent text-white'
                : 'border border-brand-border text-brand-muted hover:text-brand-text'
            }`}
          >
            Fence only
          </button>
          <button
            type="button"
            data-testid="bom-view-gates"
            onClick={() => setView('gates')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              view === 'gates'
                ? 'bg-brand-accent text-white'
                : 'border border-brand-border text-brand-muted hover:text-brand-text'
            }`}
          >
            Gates only
          </button>
        </div>
      )}

      {/* ── BOM table ───────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded border border-brand-border">
        <table
          data-testid="bom-table"
          className="w-full text-left border-collapse"
        >
          <thead>
            <tr className="bg-brand-bg border-b border-brand-border">
              <th className="py-2 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wide">Code</th>
              <th className="py-2 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wide">Description</th>
              <th className="py-2 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wide text-center">Unit</th>
              <th className="py-2 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wide text-right">Qty</th>
              <th className="py-2 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wide text-right">Unit Price</th>
              <th className="py-2 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wide text-right">Total</th>
            </tr>
          </thead>
          <tbody className="bg-brand-card divide-y divide-brand-border">
            {allItems.map((item) => (
              <BOMLineItem key={`${item.sku}-${item.category}`} item={item} />
            ))}
          </tbody>
        </table>
      </div>

      <BOMSummary result={result} />
    </div>
  );
}
