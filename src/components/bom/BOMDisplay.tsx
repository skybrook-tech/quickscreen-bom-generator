import { useState } from "react";
import type {
  BOMResult,
  BOMLineItem as BOMLineItemType,
} from "../../types/bom.types";
import { BOMLineItem } from "./BOMLineItem";
import { applyBomOverrides } from "../../utils/applyBomOverrides";
import type { BOMOverrides } from "../../utils/applyBomOverrides";
import pluralize from "pluralize";

type ViewFilter = "all" | "fence" | "gates";

interface BOMDisplayProps {
  result: BOMResult;
  overrides?: BOMOverrides;
  onQtyChange?: (key: string, qty: number) => void;
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

function sortItems(items: BOMLineItemType[]): BOMLineItemType[] {
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

function groupByCategory(
  items: BOMLineItemType[],
): [string, BOMLineItemType[]][] {
  const map = new Map<string, BOMLineItemType[]>();
  for (const item of items) {
    if (!map.has(item.category)) map.set(item.category, []);
    map.get(item.category)!.push(item);
  }
  return Array.from(map.entries());
}

export function BOMDisplay({
  result,
  overrides,
  onQtyChange,
}: BOMDisplayProps) {
  const [view, setView] = useState<ViewFilter>("all");

  const effectiveResult =
    overrides && overrides.size > 0
      ? applyBomOverrides(result, overrides)
      : result;

  const fenceItems = sortItems(effectiveResult.fenceItems);
  const gateItems = sortItems(effectiveResult.gateItems);
  const allItems =
    view === "fence"
      ? fenceItems
      : view === "gates"
        ? gateItems
        : [...fenceItems, ...gateItems];

  const groups = groupByCategory(allItems);

  const FILTER_OPTIONS: { value: ViewFilter; label: string; count: number }[] =
    [
      {
        value: "all",
        label: "All items",
        count: result.fenceItems.length + result.gateItems.length,
      },
      { value: "fence", label: "Fence", count: result.fenceItems.length },
      { value: "gates", label: "Gates", count: result.gateItems.length },
    ];

  return (
    <div>
      {/* ── View filter tabs ─────────────────────────────────────── */}
      {effectiveResult.gateItems.length > 0 && (
        <div className="flex border-b border-brand-border mb-4">
          {FILTER_OPTIONS.map(({ value, label, count }) => (
            <button
              key={value}
              type="button"
              data-testid={`bom-view-${value}`}
              onClick={() => setView(value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                view === value
                  ? "border-brand-accent text-brand-accent"
                  : "border-transparent text-brand-muted hover:text-brand-text hover:border-brand-border"
              }`}
            >
              {label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-medium leading-none ${
                  view === value
                    ? "bg-brand-accent/15 text-brand-accent"
                    : "bg-brand-border/60 text-brand-muted"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── BOM table ───────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border border-brand-border">
        <table
          data-testid="bom-table"
          className="w-full text-left border-collapse"
        >
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
                Unit Price
              </th>
              <th className="py-2.5 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wider text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-brand-card">
            {groups.map(([category, items]) => (
              <>
                {/* Category group header */}
                <tr
                  key={`cat-${category}`}
                  className="border-t border-brand-border/50"
                >
                  <td
                    colSpan={6}
                    className="px-3 py-1.5 bg-slate-50 border-b border-brand-border/50 capitalize text-xs font-semibold text-brand-muted tracking-wider"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {pluralize(category)}
                  </td>
                </tr>
                {items.map((item) => {
                  const itemKey = `${item.category}::${item.sku}`;
                  return (
                    <BOMLineItem
                      key={`${item.sku}-${item.category}`}
                      item={item}
                      itemKey={itemKey}
                      overrideQty={overrides?.get(itemKey)}
                      onQtyChange={onQtyChange}
                    />
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
