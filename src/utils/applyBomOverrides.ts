import type { BOMResult, BOMLineItem, ExtraItem } from '../types/bom.types';

export type BOMOverrides = Map<string, number>; // key = `${category}::${sku}`

/** Convert an ExtraItem into a BOMLineItem so it can appear in the BOM table and totals. */
export function extraItemToBOMLineItem(item: ExtraItem): BOMLineItem {
  return {
    category: 'accessory',
    sku: item.sku ?? `extra::${item.id}`,
    description: item.description,
    quantity: item.quantity,
    unit: 'each',
    unitPrice: item.unitPrice,
    lineTotal: item.quantity * item.unitPrice,
    notes: 'extra',
  };
}

export function applyBomOverrides(
  result: BOMResult,
  overrides: BOMOverrides,
  extraItems?: ExtraItem[],
): BOMResult {
  const applyToItems = (items: BOMResult['fenceItems']) =>
    items.map((item) => {
      const key = `${item.category}::${item.sku}`;
      const overrideQty = overrides.get(key);
      if (overrideQty === undefined) return item;
      return { ...item, quantity: overrideQty, lineTotal: overrideQty * item.unitPrice };
    });

  const fenceItems = applyToItems(result.fenceItems);
  const gateItems = applyToItems(result.gateItems);
  const extraLineItems = (extraItems ?? []).map(extraItemToBOMLineItem);

  const total = [...fenceItems, ...gateItems, ...extraLineItems].reduce(
    (s, i) => s + i.lineTotal,
    0,
  );
  const gst = total * 0.1;
  return { ...result, fenceItems, gateItems, total, gst, grandTotal: total + gst };
}
