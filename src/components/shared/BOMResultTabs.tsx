import { useState } from "react";
import { Trash2 } from "lucide-react";
import pluralize from "pluralize";
import type { CalculatorBOMResult, BOMLineItem } from "../../types/bom.types";

interface BOMResultTabsProps {
  result: CalculatorBOMResult;
  removedSkus?: Set<string>;
  onRemove?: (sku: string) => void;
  onRestoreAll?: () => void;
  qtyOverrides?: Map<string, number>;
  onQtyChange?: (sku: string, qty: number) => void;
}

const CATEGORY_ORDER = [
  "post",
  "slat",
  "rail",
  "bracket",
  "gate",
  "hardware",
  "accessory",
  "screw",
] as const;

function sortItems(items: BOMLineItem[]): BOMLineItem[] {
  return [...items].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(
      a.category as (typeof CATEGORY_ORDER)[number],
    );
    const bi = CATEGORY_ORDER.indexOf(
      b.category as (typeof CATEGORY_ORDER)[number],
    );
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function groupByCategory(items: BOMLineItem[]): [string, BOMLineItem[]][] {
  const map = new Map<string, BOMLineItem[]>();
  for (const item of items) {
    if (!map.has(item.category)) map.set(item.category, []);
    map.get(item.category)!.push(item);
  }
  return Array.from(map.entries());
}

interface BOMTableProps {
  items: BOMLineItem[];
  removedSkus?: Set<string>;
  onRemove?: (sku: string) => void;
  qtyOverrides?: Map<string, number>;
  onQtyChange?: (sku: string, qty: number) => void;
}

function BOMTable({
  items,
  removedSkus,
  onRemove,
  qtyOverrides,
  onQtyChange,
}: BOMTableProps) {
  const visible = removedSkus ? items.filter((i) => !removedSkus.has(i.sku)) : items;
  const sorted = sortItems(visible);
  const groups = groupByCategory(sorted);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-brand-muted py-6 text-center">
        No items in this section.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-brand-bg/80">
            <th className="py-2.5 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wider whitespace-nowrap">
              Code
            </th>
            <th className="py-2.5 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wider">
              Name / Description
            </th>
            <th className="py-2.5 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wider text-center">
              Unit
            </th>
            <th className="py-2.5 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wider text-right">
              Qty
            </th>
            <th className="py-2.5 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wider text-right whitespace-nowrap">
              Unit $
            </th>
            <th className="py-2.5 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wider text-right">
              Line $
            </th>
            {onRemove && (
              <th className="py-2.5 px-2 w-8" />
            )}
          </tr>
        </thead>
        <tbody className="bg-brand-card">
          {groups.map(([category, categoryItems]) => (
            <ItemGroup
              key={category}
              category={category}
              items={categoryItems}
              removedSkus={removedSkus}
              onRemove={onRemove}
              qtyOverrides={qtyOverrides}
              onQtyChange={onQtyChange}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ItemGroupProps {
  category: string;
  items: BOMLineItem[];
  removedSkus?: Set<string>;
  onRemove?: (sku: string) => void;
  qtyOverrides?: Map<string, number>;
  onQtyChange?: (sku: string, qty: number) => void;
}

function ItemGroup({
  category,
  items,
  removedSkus: _removedSkus,
  onRemove,
  qtyOverrides,
  onQtyChange,
}: ItemGroupProps) {
  return (
    <>
      <tr className="border-t border-brand-border">
        <td
          colSpan={onRemove ? 7 : 6}
          className="px-3 py-1.5 bg-slate-300/15 border-b border-brand-border capitalize text-xs font-semibold text-brand-muted tracking-wider"
        >
          {pluralize(category)}
        </td>
      </tr>
      {items.map((item) => {
        const overrideQty = qtyOverrides?.get(item.sku);
        const displayQty = overrideQty !== undefined ? overrideQty : item.quantity;
        const lineTotal = displayQty * item.unitPrice;

        return (
          <tr
            key={`${item.sku}-${item.category}`}
            className="border-b border-brand-border last:border-0 hover:bg-brand-accent/5 transition-colors group"
          >
            <td className="py-2.5 px-3 text-xs font-mono text-brand-accent whitespace-nowrap align-top">
              {item.sku}
            </td>
            <td className="py-2.5 px-3 align-top">
              <div className="text-sm text-brand-text font-medium leading-tight">
                {item.name || item.description}
              </div>
              {item.name && item.description && item.name !== item.description && (
                <div className="text-xs text-brand-muted mt-0.5 leading-snug">
                  {item.description}
                </div>
              )}
              {item.notes && (
                <span className="text-xs text-amber-400 font-medium">
                  {item.notes}
                </span>
              )}
            </td>
            <td className="py-2.5 px-3 text-sm text-brand-muted text-center align-top">
              {item.unit}
            </td>
            <td className="py-2.5 px-3 text-right align-top">
              {onQtyChange ? (
                <>
                  <span className="sr-only">{displayQty}</span>
                  <input
                    type="number"
                    min="0"
                    value={displayQty}
                    onChange={(e) =>
                      onQtyChange(item.sku, Math.max(0, Number(e.target.value)))
                    }
                    className="w-16 px-1.5 py-0.5 text-right bg-brand-bg border border-brand-border rounded-md text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent/50 focus:border-brand-accent tabular-nums"
                  />
                </>
              ) : (
                <span className="text-sm font-medium text-brand-text tabular-nums">
                  {displayQty}
                </span>
              )}
            </td>
            <td className="py-2.5 px-3 text-sm text-brand-muted text-right tabular-nums align-top">
              {item.unitPrice > 0 ? `$${item.unitPrice.toFixed(2)}` : "—"}
            </td>
            <td className="py-2.5 px-3 text-sm text-brand-text font-medium text-right tabular-nums align-top">
              {lineTotal > 0 ? `$${lineTotal.toFixed(2)}` : "—"}
            </td>
            {onRemove && (
              <td className="py-2.5 px-2 align-top">
                <button
                  type="button"
                  onClick={() => onRemove(item.sku)}
                  title="Remove line item"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-brand-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </td>
            )}
          </tr>
        );
      })}
    </>
  );
}

function calcEffectiveTotal(
  items: BOMLineItem[],
  removedSkus?: Set<string>,
  qtyOverrides?: Map<string, number>,
): number {
  return items
    .filter((i) => !removedSkus?.has(i.sku))
    .reduce((sum, i) => {
      const qty = qtyOverrides?.get(i.sku) ?? i.quantity;
      return sum + qty * i.unitPrice;
    }, 0);
}

export function BOMResultTabs({
  result,
  removedSkus,
  onRemove,
  onRestoreAll,
  qtyOverrides,
  onQtyChange,
}: BOMResultTabsProps) {
  const [activeTab, setActiveTab] = useState("all");

  const removedCount = removedSkus?.size ?? 0;

  const visibleAllItems = removedSkus
    ? result.allItems.filter((i) => !removedSkus.has(i.sku))
    : result.allItems;

  const tabs = [
    { id: "all", label: "All Items", count: visibleAllItems.length },
    ...result.runResults.map((r, i) => {
      const visible = removedSkus
        ? r.items.filter((item) => !removedSkus.has(item.sku))
        : r.items;
      return { id: r.runId, label: `Run ${i + 1}`, count: visible.length };
    }),
    {
      id: "gates",
      label: "Gates",
      count: removedSkus
        ? result.gateItems.filter((i) => !removedSkus.has(i.sku)).length
        : result.gateItems.length,
    },
  ];

  const activeItems =
    activeTab === "all"
      ? result.allItems
      : activeTab === "gates"
        ? result.gateItems
        : result.runResults.find((r) => r.runId === activeTab)?.items ?? [];

  const activeTotal = parseFloat(
    calcEffectiveTotal(activeItems, removedSkus, qtyOverrides).toFixed(2),
  );
  const activeGst = parseFloat((activeTotal * 0.1).toFixed(2));
  const activeGrandTotal = parseFloat((activeTotal + activeGst).toFixed(2));

  return (
    <div>
      {/* Removed items banner */}
      {removedCount > 0 && onRestoreAll && (
        <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-3 text-xs">
          <span className="text-amber-400 font-medium">
            {removedCount} line {removedCount === 1 ? "item" : "items"} removed
          </span>
          <button
            type="button"
            onClick={onRestoreAll}
            className="text-amber-400 underline hover:text-amber-300"
          >
            Restore all
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-brand-border mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === tab.id
                ? "border-brand-accent text-brand-accent"
                : "border-transparent text-brand-muted hover:text-brand-text hover:border-brand-border"
            }`}
          >
            {tab.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-medium leading-none ${
                activeTab === tab.id
                  ? "bg-brand-accent/15 text-brand-accent"
                  : "bg-brand-border/60 text-brand-muted"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <BOMTable
        items={activeItems}
        removedSkus={removedSkus}
        onRemove={onRemove}
        qtyOverrides={qtyOverrides}
        onQtyChange={onQtyChange}
      />

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-brand-border">
        <div className="space-y-1 mb-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-brand-muted">Subtotal (ex-GST)</span>
            <span className="tabular-nums text-brand-text">
              ${activeTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-brand-muted">GST (10%)</span>
            <span className="tabular-nums text-brand-text">
              ${activeGst.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center border-t border-brand-border pt-3">
          <div>
            <p className="text-sm font-semibold text-brand-text">
              Total (inc. GST)
            </p>
            <p className="text-xs text-brand-muted mt-0.5">
              Generated{" "}
              {new Date(result.generatedAt).toLocaleString("en-AU", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              {" · "}
              {result.pricingTier.replace("tier", "Tier ")}
            </p>
          </div>
          <span className="text-2xl font-bold text-brand-accent tabular-nums">
            ${activeGrandTotal.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
