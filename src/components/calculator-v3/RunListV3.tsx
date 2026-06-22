import { useState, useMemo } from "react";
import { ChevronDown, Trees, Layers, Waves, AlignJustify, Layout, Building2, KeyRound, Mountain } from "lucide-react";
import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalPayload, CanonicalRun } from "../../types/canonical.types";
import { initialVariablesForSystem } from "../../lib/productOptionRules";
import type { ParseResult } from "../../lib/describeFenceParser";
import { DescribeFenceBox } from "../calculator/DescribeFenceBox";
import { RunCard } from "./RunCard";
import { getCustomCalculators } from "../../lib/customCalculators";

interface CategorizedProduct {
  id: string;
  name: string;
  system_type: string;
  underlying_type: string;
  description: string;
}

export function RunListV3({
  autoOpenFirstRunId,
  onAutoOpenConsumed,
  onDescribeApply,
  initialDescription = "",
}: {
  autoOpenFirstRunId?: string | null;
  onAutoOpenConsumed?: () => void;
  onDescribeApply?: (result: ParseResult) => void;
  initialDescription?: string;
}) {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;
  const hasRuns = Boolean(payload?.runs.length);

  const customCalculators = useMemo(() => getCustomCalculators(), []);

  // Dynamically group custom calculators by their path[0] category
  const dynamicCategorizedProducts = useMemo(() => {
    const groups: Record<string, CategorizedProduct[]> = {};
    for (const c of customCalculators) {
      const category = c.path[0] || "Custom Fencing";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({
        id: c.id,
        name: c.name,
        system_type: c.id,
        underlying_type: c.id,
        description: c.description,
      });
    }
    return groups;
  }, [customCalculators]);

  const dynamicCategorizedKeys = Object.keys(dynamicCategorizedProducts);
  const [expandedCat, setExpandedCat] = useState<string | null>(() => {
    return dynamicCategorizedKeys[0] || null;
  });

  if (!payload) return null;
  const currentPayload = payload;

  const toggleCategory = (cat: string) => {
    setExpandedCat(expandedCat === cat ? null : cat);
  };

  function startFirstRun(p: CategorizedProduct) {
    const variables: Record<string, any> = {
      ...initialVariablesForSystem(p.underlying_type),
      fence_style: p.name,
      system_sub_type: p.system_type,
    };
    const runId = crypto.randomUUID();
    const nextPayload: CanonicalPayload = {
      productCode: p.underlying_type,
      schemaVersion: "v1",
      variables,
      ...(currentPayload.propertyAnchor
        ? { propertyAnchor: currentPayload.propertyAnchor }
        : {}),
      ...(currentPayload.snapshot ? { snapshot: currentPayload.snapshot } : {}),
      runs: [
        {
          runId,
          productCode: p.underlying_type,
          variables,
          leftBoundary: { type: "product_post" },
          rightBoundary: { type: "product_post" },
          segments: [
            {
              segmentId: crypto.randomUUID(),
              sortOrder: 1,
              segmentKind: "panel",
              segmentWidthMm: 0,
              targetHeightMm: Number(variables.target_height_mm ?? 1800),
              variables: p.underlying_type === "BAYG" ? { panel_quantity: 1 } : undefined,
            },
          ],
          corners: [],
        },
      ],
    };
    dispatch({ type: "SET_PAYLOAD", payload: nextPayload });
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("qsbom:open-run", { detail: runId }));
    }, 80);
  }

  function addRun() {
    const firstRun = payload!.runs[0];
    const r1s1 = firstRun?.segments[0];
    const productCode = firstRun?.productCode ?? payload!.productCode;
    const variables = {
      ...(payload!.variables ?? {}),
      ...(firstRun?.variables ?? {}),
      ...(r1s1?.variables ?? {}),
    };
    const defaultHeight = r1s1?.targetHeightMm ?? Number(variables.target_height_mm ?? 1800);
    const newRun: CanonicalRun = {
      runId: crypto.randomUUID(),
      productCode,
      variables,
      leftBoundary: firstRun?.leftBoundary ?? { type: "product_post" },
      rightBoundary: firstRun?.rightBoundary ?? { type: "product_post" },
      segments: [
        {
          segmentId: crypto.randomUUID(),
          sortOrder: 1,
          segmentKind: "panel",
          segmentWidthMm: 0,
          targetHeightMm: defaultHeight,
          variables: productCode === "BAYG" ? { panel_quantity: 1 } : undefined,
        },
      ],
      corners: [],
    };
    dispatch({ type: "UPSERT_RUN", run: newRun });
  }

  return (
    <div className="space-y-5">
      {!hasRuns && (
        <section className="space-y-4 rounded-2xl border border-brand-border/40 bg-brand-card/10 p-4 shadow-sm">
          <p className="text-sm font-black text-brand-text">Choose a Fencing System</p>
          <div className="space-y-2.5">
            {Object.entries(dynamicCategorizedProducts).map(([catName, items]) => {
              const isExpanded = expandedCat === catName;
              return (
                <div key={catName} className="rounded-xl border border-brand-border/40 bg-brand-card/25 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleCategory(catName)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-brand-card/85 hover:bg-brand-card border-b border-brand-border/20 text-xs font-black text-brand-text transition"
                  >
                    <span className="flex items-center gap-2">
                      {(catName.toLowerCase().includes("pine") || catName.toLowerCase().includes("timber")) && <Trees size={14} className="text-brand-primary" />}
                      {catName.toLowerCase().includes("colorbond") && <Layers size={14} className="text-brand-primary" />}
                      {(catName.toLowerCase().includes("pool") || catName.toLowerCase().includes("glass")) && <Waves size={14} className="text-brand-primary" />}
                      {catName.toLowerCase().includes("slat") && <AlignJustify size={14} className="text-brand-primary" />}
                      {catName.toLowerCase().includes("modular") && <Layout size={14} className="text-brand-primary" />}
                      {(catName.toLowerCase().includes("commercial") || catName.toLowerCase().includes("chain") || catName.toLowerCase().includes("weld")) && <Building2 size={14} className="text-brand-primary" />}
                      {(catName.toLowerCase().includes("gate") || catName.toLowerCase().includes("security")) && <KeyRound size={14} className="text-brand-primary" />}
                      {catName.toLowerCase().includes("retaining") && <Mountain size={14} className="text-brand-primary" />}
                      {catName}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-brand-muted transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="p-3 grid grid-cols-2 gap-2 bg-brand-bg/10">
                      {items.map((item) => {
                        const isCalc = true;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => startFirstRun(item)}
                            className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                              isCalc
                                ? "border-brand-primary/40 bg-brand-primary/5 text-brand-primary hover:bg-brand-primary/15"
                                : "border-brand-border bg-brand-card/75 text-brand-text hover:border-brand-primary hover:text-brand-primary"
                            }`}
                            data-testid={`landing-system-${item.system_type}`}
                            title={item.description}
                          >
                            <span className="text-xs font-black leading-tight">{item.name}</span>
                            <span className="text-[9px] text-brand-muted mt-1 leading-tight font-medium">
                              {isCalc ? "Interactive Calculator" : "Standard Materials List"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {onDescribeApply && (
            <div className="pt-2 text-center">
              <DescribeFenceBox
                title="Describe your fence"
                compact
                initialDescription={initialDescription}
                onApply={onDescribeApply}
              />
              <p className="mt-1 text-xs font-semibold text-brand-muted">
                (Click to describe)
              </p>
            </div>
          )}
        </section>
      )}
      {payload.runs.map((run, runIdx) => (
        <RunCard
          key={run.runId}
          run={run}
          runIdx={runIdx}
          autoOpenFirstSection={autoOpenFirstRunId === run.runId}
          onAutoOpenConsumed={onAutoOpenConsumed}
        />
      ))}
      {hasRuns && (
        <button
          type="button"
          onClick={addRun}
          className="min-h-11 w-full rounded-lg border border-brand-primary/50 bg-brand-primary px-4 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-brand-primary/90 hover:shadow-md"
        >
          + Add run
        </button>
      )}
    </div>
  );
}
