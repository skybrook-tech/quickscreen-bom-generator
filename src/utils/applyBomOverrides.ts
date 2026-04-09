import type { BOMResult } from '../types/bom.types';

export type BOMOverrides = Map<string, number>; // key = `${category}::${sku}`

export function applyBomOverrides(result: BOMResult, overrides: BOMOverrides): BOMResult {
  if (overrides.size === 0) return result;

  const applyToItems = (items: BOMResult['fenceItems']) =>
    items.map((item) => {
      const key = `${item.category}::${item.sku}`;
      const overrideQty = overrides.get(key);
      if (overrideQty === undefined) return item;
      return { ...item, quantity: overrideQty, lineTotal: overrideQty * item.unitPrice };
    });

  const fenceItems = applyToItems(result.fenceItems);
  const gateItems = applyToItems(result.gateItems);
  const total = [...fenceItems, ...gateItems].reduce((s, i) => s + i.lineTotal, 0);
  const gst = total * 0.1;
  return { ...result, fenceItems, gateItems, total, gst, grandTotal: total + gst };
}
