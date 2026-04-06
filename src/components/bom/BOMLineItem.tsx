import type { BOMLineItem as BOMLineItemType } from '../../types/bom.types';

interface BOMLineItemProps {
  item: BOMLineItemType;
  itemKey?: string;
  overrideQty?: number;
  onQtyChange?: (key: string, qty: number) => void;
}

export function BOMLineItem({ item, itemKey, overrideQty, onQtyChange }: BOMLineItemProps) {
  const displayQty = overrideQty !== undefined ? overrideQty : item.quantity;
  const lineTotal = displayQty * item.unitPrice;
  const isZeroed = overrideQty === 0;

  return (
    <tr
      data-testid="bom-row"
      className={`border-b border-brand-border/50 last:border-0 hover:bg-brand-accent/5 transition-colors ${isZeroed ? 'opacity-40' : ''}`}
    >
      <td
        data-testid="bom-row-code"
        className="py-2.5 px-3 text-xs font-mono text-brand-accent whitespace-nowrap"
      >
        {item.sku}
      </td>
      <td className="py-2.5 px-3">
        <span className={`text-sm text-brand-text ${isZeroed ? 'line-through' : ''}`}>{item.description}</span>
        {item.notes && (
          <span className="ml-2 text-xs text-yellow-400 font-medium">{item.notes}</span>
        )}
      </td>
      <td className="py-2.5 px-3 text-xs text-brand-muted text-center capitalize whitespace-nowrap">
        {item.unit}
      </td>
      <td
        data-testid="bom-row-qty"
        className="py-2.5 px-3 text-sm font-medium text-brand-text text-right tabular-nums"
      >
        {onQtyChange && itemKey ? (
          <input
            type="number"
            min="0"
            value={displayQty}
            onChange={(e) => onQtyChange(itemKey, Math.max(0, Number(e.target.value)))}
            className="w-16 px-1.5 py-0.5 text-right bg-brand-bg border border-brand-border rounded text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent/50 focus:border-brand-accent tabular-nums"
          />
        ) : (
          displayQty
        )}
      </td>
      <td
        data-testid="bom-row-unit-price"
        className="py-2.5 px-3 text-sm text-brand-muted text-right tabular-nums"
      >
        {item.unitPrice > 0 ? `$${item.unitPrice.toFixed(2)}` : '—'}
      </td>
      <td
        data-testid="bom-row-line-total"
        className="py-2.5 px-3 text-sm font-semibold text-brand-text text-right tabular-nums"
      >
        {lineTotal > 0 ? `$${lineTotal.toFixed(2)}` : '—'}
      </td>
    </tr>
  );
}
