import type { BOMLineItem as BOMLineItemType } from '../../types/bom.types';

interface BOMLineItemProps {
  item: BOMLineItemType;
}

export function BOMLineItem({ item }: BOMLineItemProps) {
  return (
    <tr
      data-testid="bom-row"
      className="border-b border-brand-border last:border-0 hover:bg-brand-bg/50 transition-colors"
    >
      <td
        data-testid="bom-row-code"
        className="py-2 px-3 text-xs font-mono text-brand-accent whitespace-nowrap"
      >
        {item.sku}
      </td>
      <td className="py-2 px-3 text-sm text-brand-text">
        {item.description}
        {item.notes && (
          <span className="ml-2 text-xs text-yellow-400">{item.notes}</span>
        )}
      </td>
      <td className="py-2 px-3 text-xs text-brand-muted text-center capitalize">
        {item.unit}
      </td>
      <td
        data-testid="bom-row-qty"
        className="py-2 px-3 text-sm text-brand-text text-right tabular-nums"
      >
        {item.quantity}
      </td>
      <td
        data-testid="bom-row-unit-price"
        className="py-2 px-3 text-sm text-brand-text text-right tabular-nums"
      >
        {item.unitPrice > 0 ? `$${item.unitPrice.toFixed(2)}` : '—'}
      </td>
      <td
        data-testid="bom-row-line-total"
        className="py-2 px-3 text-sm font-medium text-brand-text text-right tabular-nums"
      >
        {item.lineTotal > 0 ? `$${item.lineTotal.toFixed(2)}` : '—'}
      </td>
    </tr>
  );
}
