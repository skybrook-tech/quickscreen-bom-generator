import { useEffect, useState } from "react";
import pluralize from "pluralize";
import type { CalculatorBOMResult, BOMLineItem } from "../../types/bom.types";
import { localPriceBreaks, tierForSkuQuantity } from "../../lib/localPriceBreaks";
import { priceForSku } from "../../lib/localBomCalculator";
import { cataloguePageForSku, CATALOGUE_PDF_URL } from "../../lib/cataloguePages";
import { cartonHintForLine } from "../../lib/cartonQuantities";
import { bulkBuyVariantForSku } from "../../lib/bulkBuyVariants";
import {
  PRICE_SOURCE_LABEL,
  PRICE_SOURCE_VERIFIED_DATE,
} from "../../lib/pricingMetadata";
import { InstallVideoQR } from "../calculator-v3/InstallVideoQR";
import type { InstallVideoKey } from "../../lib/installVideos";
import { BomCutList } from "./BomCutList";

interface BOMResultTabsProps {
  result: CalculatorBOMResult;
  editable?: boolean;
  onQuantityChange?: (item: BOMLineItem, quantity: number) => void;
  onRemoveLine?: (item: BOMLineItem) => void;
  onSwitchEconomyToStandard?: (item: BOMLineItem) => void;
  onActiveSummaryChange?: (summary: {
    label: string;
    subtotal: number;
    gst: number;
    grandTotal: number;
  }) => void;
}

const CATEGORY_ORDER = [
  "post",
  "post_accessory",
  "slat",
  "side_frame",
  "cfc_cover",
  "centre_support_rail",
  "f_section",
  "rail",
  "bracket",
  "gate",
  "automation",
  "hardware",
  "accessory",
  "screw",
] as const;

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

function tierLabel(item: BOMLineItem) {
  if (item.unitPrice <= 0) return "Price not set";
  const pricingQty =
    item.sku.startsWith("XP-6500-E65") && item.unit === "pack"
      ? item.quantity * 96
      : item.quantity;
  return tierForSkuQuantity(item.sku, pricingQty).replace(/^tier/i, "Tier ");
}

function nextBreakHint(item: BOMLineItem) {
  if (item.sku.startsWith("XP-6500-E65") && item.unit === "pack") return null;
  const breaks = (localPriceBreaks as Record<string, readonly number[] | undefined>)[
    item.sku
  ];
  const nextBreak = breaks?.find((qty) => qty > item.quantity);
  if (!nextBreak) return null;

  const nextUnitPrice = priceForSku(item.sku, nextBreak);
  if (nextUnitPrice <= 0 || item.unitPrice <= 0 || nextUnitPrice >= item.unitPrice) {
    return {
      more: nextBreak - item.quantity,
      tier: tierForSkuQuantity(item.sku, nextBreak).replace(/^tier/i, "Tier "),
      savingPct: null as number | null,
    };
  }

  return {
    more: nextBreak - item.quantity,
    tier: tierForSkuQuantity(item.sku, nextBreak).replace(/^tier/i, "Tier "),
    savingPct: Math.round(((item.unitPrice - nextUnitPrice) / item.unitPrice) * 100),
  };
}

function unitLabel(item: BOMLineItem) {
  return item.sku.startsWith("XP-6500-E65") && item.unit === "pack"
    ? "pack of 96"
    : item.unit;
}

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

function PageChip({ sku }: { sku: string }) {
  const page = cataloguePageForSku(sku);
  if (!page) return null;
  const className =
    "inline-flex rounded-full border border-brand-border bg-brand-bg px-1.5 py-0.5 text-[10px] font-extrabold text-brand-muted hover:border-brand-primary hover:text-brand-primary";
  if (CATALOGUE_PDF_URL) {
    return (
      <a
        href={`${CATALOGUE_PDF_URL}#page=${page}`}
        target="_blank"
        rel="noreferrer"
        className={className}
        title={`Open catalogue page ${page}`}
      >
        p.{page}
      </a>
    );
  }
  return (
    <span className={className} title={`Catalogue page ${page}`}>
      p.{page}
    </span>
  );
}

function installVideoKeysForItems(items: BOMLineItem[]): InstallVideoKey[] {
  const keys = new Set<InstallVideoKey>();
  if (items.some((item) => item.productCode === "QSHS")) keys.add("QSHS");
  if (items.some((item) => item.productCode === "VS")) keys.add("VS");
  if (items.some((item) => item.sku.startsWith("XPSG-") || item.sku.startsWith("QSG-S-"))) {
    keys.add("QS_GATE_SLIDE");
  }
  if (items.some((item) => item.sku.startsWith("QSG-") && !item.sku.startsWith("QSG-S-"))) {
    keys.add("QS_GATE_PED");
  }
  return [...keys];
}

function BOMTable({
  items,
  editable,
  onQuantityChange,
  onRemoveLine,
  onSwitchEconomyToStandard,
}: {
  items: BOMLineItem[];
  editable?: boolean;
  onQuantityChange?: (item: BOMLineItem, quantity: number) => void;
  onRemoveLine?: (item: BOMLineItem) => void;
  onSwitchEconomyToStandard?: (item: BOMLineItem) => void;
}) {
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
            <th className="hidden py-2.5 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wider text-center sm:table-cell">
              Unit
            </th>
            <th className="py-2.5 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wider text-right">
              Qty
            </th>
            <th className="hidden py-2.5 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wider text-right whitespace-nowrap sm:table-cell">
              Unit $
            </th>
            <th className="py-2.5 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wider text-right">
              Line $
            </th>
            {editable && (
              <th className="py-2.5 px-3 text-xs font-semibold text-brand-muted uppercase tracking-wider text-right">
                Edit
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-brand-card">
          {groups.map(([category, categoryItems]) => (
            <ItemGroup
              key={category}
              category={category}
              items={categoryItems}
              editable={editable}
              onQuantityChange={onQuantityChange}
              onRemoveLine={onRemoveLine}
              onSwitchEconomyToStandard={onSwitchEconomyToStandard}
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
  editable,
  onQuantityChange,
  onRemoveLine,
  onSwitchEconomyToStandard,
}: {
  category: string;
  items: BOMLineItem[];
  editable?: boolean;
  onQuantityChange?: (item: BOMLineItem, quantity: number) => void;
  onRemoveLine?: (item: BOMLineItem) => void;
  onSwitchEconomyToStandard?: (item: BOMLineItem) => void;
}) {
  return (
    <>
      <tr className="border-t border-brand-border">
        <td
          colSpan={editable ? 7 : 6}
          className="px-3 py-1.5 bg-slate-300/15 border-b border-brand-border capitalize text-xs font-semibold text-brand-muted tracking-wider"
        >
          {pluralize(category)}
        </td>
      </tr>
      {items.map((item, itemIndex) => (
        (() => {
          const hint = nextBreakHint(item);
          const cartonHint = cartonHintForLine(item);
          const bulkBuySku = bulkBuyVariantForSku(item.sku);
          const bulkBuyUnitPrice = bulkBuySku ? priceForSku(bulkBuySku, item.quantity) : 0;
          const bulkBuySaving =
            bulkBuySku && bulkBuyUnitPrice > 0 && item.unitPrice > bulkBuyUnitPrice
              ? item.unitPrice - bulkBuyUnitPrice
              : 0;
          const canSwitchEconomy =
            item.sku.startsWith("XP-6500-E65") &&
            item.notes?.includes("Switch to Standard slats?");
          return (
        <tr
          key={`${category}-${item.sku}-${item.category}-${item.description}-${itemIndex}`}
          className="border-b border-brand-border last:border-0 hover:bg-brand-accent/5 transition-colors"
        >
          <td className="py-2.5 px-3 text-xs font-mono text-brand-accent whitespace-nowrap">
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {item.sku}
              <PageChip sku={item.sku} />
            </span>
          </td>
          <td className="py-2.5 px-3 text-sm text-brand-text">
            <div className="flex flex-wrap items-center gap-1.5">
              <span>{item.description}</span>
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  item.unitPrice > 0
                    ? "border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
                    : "border-brand-warning/40 bg-brand-warning/10 text-brand-warning"
                }`}
              >
                {tierLabel(item)}
              </span>
              {item.notes && (
                <span className="text-xs text-brand-warning">
                  {item.notes}
                </span>
              )}
              {canSwitchEconomy && (
                <button
                  type="button"
                  onClick={() => onSwitchEconomyToStandard?.(item)}
                  className="rounded-full border border-brand-warning/40 bg-brand-warning/10 px-2 py-0.5 text-[11px] font-bold text-brand-warning transition-colors hover:bg-brand-warning/20"
                >
                  Switch
                </button>
              )}
            </div>
            {hint && (
              <p className="mt-1 text-[11px] font-semibold text-brand-success">
                {hint.more} more for {hint.tier}
                {hint.savingPct ? ` (save ${hint.savingPct}%)` : ""}
              </p>
            )}
            {cartonHint && (
              <p className="mt-1 inline-flex rounded-full border border-brand-success/30 bg-brand-success/10 px-2 py-0.5 text-[11px] font-bold text-brand-success">
                {cartonHint.more} more for a carton ({cartonHint.cartonQty} {cartonHint.label})
                {cartonHint.saving > 0 ? ` - save ~$${cartonHint.saving}` : ""}
              </p>
            )}
            {bulkBuySku && (
              <p
                className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                  bulkBuySaving > 0
                    ? "border-brand-success/30 bg-brand-success/10 text-brand-success"
                    : "border-brand-border bg-brand-bg text-brand-muted"
                }`}
                title={`Bulk-buy variant: ${bulkBuySku}`}
              >
                Bulk buy {bulkBuySku}
                {bulkBuySaving > 0
                  ? ` saves $${formatMoney(bulkBuySaving)} each`
                  : " available"}
              </p>
            )}
          </td>
          <td className="hidden py-2.5 px-3 text-sm text-brand-muted text-center sm:table-cell">
            {unitLabel(item)}
          </td>
          <td className="py-2.5 px-3 text-sm text-brand-text text-right tabular-nums">
            {editable ? (
              <input
                type="number"
                min="0"
                step="1"
                value={item.quantity}
                onChange={(event) =>
                  onQuantityChange?.(item, Number(event.target.value))
                }
                className="w-20 rounded-lg border border-brand-border bg-brand-card px-2 py-1 text-right text-sm font-semibold text-brand-text shadow-sm outline-none transition-colors focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                aria-label={`Quantity for ${item.sku}`}
              />
            ) : (
              item.quantity
            )}
          </td>
          <td className="hidden py-2.5 px-3 text-sm text-brand-muted text-right tabular-nums sm:table-cell">
            {item.unitPrice > 0 ? `$${formatMoney(item.unitPrice)}` : "-"}
          </td>
          <td className="py-2.5 px-3 text-sm text-brand-text font-medium text-right tabular-nums">
            {item.unitPrice > 0 ? `$${formatMoney(item.lineTotal)}` : "-"}
          </td>
          {editable && (
            <td className="py-2.5 px-3 text-right">
              <button
                type="button"
                onClick={() => onRemoveLine?.(item)}
                className="rounded px-2 py-1 text-xs font-medium text-brand-danger transition-colors hover:bg-brand-danger/10"
              >
                Remove
              </button>
            </td>
          )}
        </tr>
          );
        })()
      ))}
    </>
  );
}

export function BOMResultTabs({
  result,
  editable,
  onQuantityChange,
  onRemoveLine,
  onSwitchEconomyToStandard,
  onActiveSummaryChange,
}: BOMResultTabsProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"line_items" | "cut_list">("line_items");

  const gateResults = result.gateResults ?? [];
  const tabs = [
    { id: "all", label: "All Items", count: result.allItems.length },
    ...result.runResults.map((r, i) => ({
      id: r.runId,
      label: `Run ${i + 1}`,
      count: r.items.length,
    })),
    { id: "gates", label: "Gates", count: result.gateItems.length },
    ...gateResults.map((gate) => ({
      id: gate.id,
      label: gate.label,
      count: gate.items.length,
    })),
  ];

  const activeItems =
    activeTab === "all"
      ? result.allItems
      : activeTab === "gates"
        ? result.gateItems
        : gateResults.find((gate) => gate.id === activeTab)?.items ??
          result.runResults.find((r) => r.runId === activeTab)?.items ??
          [];

  const activeTotal = parseFloat(
    activeItems.reduce((s, i) => s + i.lineTotal, 0).toFixed(2),
  );
  const activeGst = parseFloat((activeTotal * 0.1).toFixed(2));
  const activeGrandTotal = parseFloat((activeTotal + activeGst).toFixed(2));
  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? "All Items";
  const activeInstallVideoKeys = installVideoKeysForItems(activeItems);

  useEffect(() => {
    onActiveSummaryChange?.({
      label: activeLabel,
      subtotal: activeTotal,
      gst: activeGst,
      grandTotal: activeGrandTotal,
    });
  }, [activeGrandTotal, activeGst, activeLabel, activeTotal, onActiveSummaryChange]);

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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-brand-muted">
            {viewMode === "cut_list" ? "What you'll receive" : "Line items"}
          </p>
          <p className="text-xs font-semibold text-brand-muted">
            {viewMode === "cut_list"
              ? "Grouped like flat-pack stock on the truck."
              : "Priced BOM rows with catalogue pages and quantity-break hints."}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setViewMode((mode) => (mode === "line_items" ? "cut_list" : "line_items"))
          }
          className="rounded-lg border border-brand-border px-3 py-2 text-sm font-bold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary hover:shadow-sm"
        >
          {viewMode === "line_items" ? "Show cut list" : "Show line items"}
        </button>
      </div>

      {viewMode === "cut_list" ? (
        <BomCutList items={activeItems} />
      ) : (
        <BOMTable
          items={activeItems}
          editable={editable}
          onQuantityChange={onQuantityChange}
          onRemoveLine={onRemoveLine}
          onSwitchEconomyToStandard={onSwitchEconomyToStandard}
        />
      )}

      {activeInstallVideoKeys.length > 0 && (
        <div className="mt-5 rounded-2xl border border-brand-border/70 bg-brand-bg/50 p-3">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-brand-muted">
            Install video QR codes
          </p>
          <div className="flex flex-wrap gap-3">
            {activeInstallVideoKeys.map((key) => (
              <InstallVideoQR key={key} videoKey={key} compact />
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-brand-border">
        <div className="mb-3 inline-flex rounded-full border border-brand-success/30 bg-brand-success/10 px-3 py-1 text-xs font-bold text-brand-success">
          {PRICE_SOURCE_LABEL} · {PRICE_SOURCE_VERIFIED_DATE}
        </div>
        <div className="space-y-1 mb-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-brand-muted">Subtotal (ex-GST)</span>
            <span className="tabular-nums text-brand-text">
              ${formatMoney(activeTotal)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-brand-muted">GST (10%)</span>
            <span className="tabular-nums text-brand-text">
              ${formatMoney(activeGst)}
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
              Auto quantity-break pricing
            </p>
          </div>
          <span className="text-2xl font-bold text-brand-accent tabular-nums">
            ${formatMoney(activeGrandTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
