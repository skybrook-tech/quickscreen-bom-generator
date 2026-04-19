import { useState } from "react";
import pluralize from "pluralize";
import type { CalculatorBOMResult, BOMLineItem } from "../../types/bom.types";

interface BOMResultTabsProps {
  result: CalculatorBOMResult;
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

function BOMTable({ items }: { items: BOMLineItem[] }) {
  const sorted = sortItems(items);
  const groups = groupByCategory(sorted);

  if (items.length === 0) {
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
              Description
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
          </tr>
        </thead>
        <tbody className="bg-brand-card">
          {groups.map(([category, categoryItems]) => (
            <ItemGroup
              key={category}
              category={category}
              items={categoryItems}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemGroup({
  category,
  items,
}: {
  category: string;
  items: BOMLineItem[];
}) {
  return (
    <>
      <tr className="border-t border-brand-border">
        <td
          colSpan={6}
          className="px-3 py-1.5 bg-slate-300/15 border-b border-brand-border capitalize text-xs font-semibold text-brand-muted tracking-wider"
        >
          {pluralize(category)}
        </td>
      </tr>
      {items.map((item) => (
        <tr
          key={`${item.sku}-${item.category}`}
          className="border-b border-brand-border last:border-0 hover:bg-brand-accent/5 transition-colors"
        >
          <td className="py-2.5 px-3 text-xs font-mono text-brand-accent whitespace-nowrap">
            {item.sku}
          </td>
          <td className="py-2.5 px-3 text-sm text-brand-text">
            {item.description}
            {item.notes && (
              <span className="ml-1.5 text-xs text-amber-400">
                {item.notes}
              </span>
            )}
          </td>
          <td className="py-2.5 px-3 text-sm text-brand-muted text-center">
            {item.unit}
          </td>
          <td className="py-2.5 px-3 text-sm text-brand-text text-right tabular-nums">
            {item.quantity}
          </td>
          <td className="py-2.5 px-3 text-sm text-brand-muted text-right tabular-nums">
            ${item.unitPrice.toFixed(2)}
          </td>
          <td className="py-2.5 px-3 text-sm text-brand-text font-medium text-right tabular-nums">
            ${item.lineTotal.toFixed(2)}
          </td>
        </tr>
      ))}
    </>
  );
}

export function BOMResultTabs({ result }: BOMResultTabsProps) {
  const [activeTab, setActiveTab] = useState("all");

  const tabs = [
    { id: "all", label: "All Items", count: result.allItems.length },
    ...result.runResults.map((r, i) => ({
      id: r.runId,
      label: `Run ${i + 1}`,
      count: r.items.length,
    })),
    { id: "gates", label: "Gates", count: result.gateItems.length },
  ];

  const activeItems =
    activeTab === "all"
      ? result.allItems
      : activeTab === "gates"
        ? result.gateItems
        : result.runResults.find((r) => r.runId === activeTab)?.items ?? [];

  const activeTotal = parseFloat(
    activeItems.reduce((s, i) => s + i.lineTotal, 0).toFixed(2),
  );
  const activeGst = parseFloat((activeTotal * 0.1).toFixed(2));
  const activeGrandTotal = parseFloat((activeTotal + activeGst).toFixed(2));

  return (
    <div>
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
      <BOMTable items={activeItems} />

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
