import { useState, useMemo } from "react";
import { Check, ChevronDown, Trees, Layers, Waves, AlignJustify, Layout, Building2, KeyRound, Mountain } from "lucide-react";
import {
  initialVariablesForSystem,
} from "../../lib/productOptionRules";
import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalPayload } from "../../types/canonical.types";
import type { ReactNode } from "react";
import { getCustomCalculators, findHeightVariableKey } from "../../lib/customCalculators";

interface CategorizedProduct {
  id: string;
  name: string;
  system_type: string;
  underlying_type: string;
  description: string;
  isCustom: boolean;
}

export function ProductSelectV3({
  mapAction,
  onProductSelected,
}: {
  mapAction?: (selectDefaultProduct: () => void) => ReactNode;
  onProductSelected?: (payload: CanonicalPayload) => void;
}) {
  const { state, dispatch } = useCalculator();

  const categorizedProducts = useMemo(() => {
    const customCalcs = getCustomCalculators();
    
    // Start with empty categories
    const groups: Record<string, CategorizedProduct[]> = {};
    
    // Process custom calculators
    for (const c of customCalcs) {
      const categoryName = c.path[0] || "Custom Fencing";
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push({
        id: c.id,
        name: c.name,
        system_type: c.id,
        underlying_type: c.id,
        description: c.description,
        isCustom: true,
      });
    }

    // Add standard Slat Fencing if not already present
    const slatFencing = [
      { id: "qshs", name: "Horizontal Slats (QSHS)", system_type: "QSHS", underlying_type: "QSHS", description: "QuickScreen horizontal slat screening.", isCustom: false },
      { id: "vs", name: "Vertical Slats (VS)", system_type: "VS", underlying_type: "VS", description: "QuickScreen vertical slat fencing.", isCustom: false },
      { id: "xpl", name: "Xpress Plus (XPL)", system_type: "XPL", underlying_type: "XPL", description: "Xpress Plus premium slat screening.", isCustom: false }
    ];
    if (groups["Slat Fencing"]) {
      groups["Slat Fencing"].push(...slatFencing);
    } else {
      groups["Slat Fencing"] = slatFencing;
    }

    // Add standard Gates if not already present
    const gates = [
      { id: "sliding_gates", name: "Sliding Gates", system_type: "SLIDING_GATES", underlying_type: "BAYG", description: "Custom automated or manual sliding entry gates.", isCustom: false },
      { id: "swing_gates", name: "Swing Gates", system_type: "SWING_GATES", underlying_type: "BAYG", description: "Custom manual and automated double/single swing gates.", isCustom: false },
      { id: "pedestrian_gates", name: "Pedestrian Gates", system_type: "PEDESTRIAN_GATES", underlying_type: "BAYG", description: "Pedestrian access gates with hinges and latch kits.", isCustom: false },
      { id: "gate_automation", name: "Gate Automation", system_type: "GATE_AUTOMATION", underlying_type: "BAYG", description: "Electric gate motors and access control upgrades.", isCustom: false }
    ];
    if (groups["Gates"]) {
      groups["Gates"].push(...gates);
    } else {
      groups["Gates"] = gates;
    }

    return groups;
  }, []);

  const [expandedCat, setExpandedCat] = useState<string | null>("Treated Pine");

  const currentCode = state.payload?.productCode ?? null;
  const currentSubType = state.payload?.variables?.system_sub_type ?? null;

  const toggleCategory = (cat: string) => {
    setExpandedCat(expandedCat === cat ? null : cat);
  };

  const selectDefaultProduct = () => {
    if (!currentCode) {
      const defaultProduct = categorizedProducts["Treated Pine"]?.[0] || categorizedProducts["Timber Fencing"]?.[0];
      if (defaultProduct) selectProduct(defaultProduct);
    }
  };

  function selectProduct(p: CategorizedProduct) {
    const isCustom = p.isCustom;
    const systemType = p.system_type;
    const underlyingType = p.underlying_type;

    let initialVariables: Record<string, any> = {};
    if (isCustom) {
      const customCalcs = getCustomCalculators();
      const customCalc = customCalcs.find(c => c.id === systemType);
      if (customCalc) {
        customCalc.variables.forEach(v => {
          initialVariables[v.field_key] = v.default_value_json;
        });
      }
      initialVariables.fence_style = p.name;
      initialVariables.system_sub_type = systemType;
    } else {
      initialVariables = {
        ...initialVariablesForSystem(underlyingType),
        fence_style: p.name,
        system_sub_type: systemType,
      };
    }

    let initialHeight = 1800;
    if (isCustom) {
      const customCalcs = getCustomCalculators();
      const customCalc = customCalcs.find(c => c.id === systemType);
      if (customCalc) {
        const heightKey = findHeightVariableKey(customCalc.variables);
        if (heightKey) {
          initialHeight = Number(initialVariables[heightKey] ?? 1800);
        }
      }
    } else {
      initialHeight = Number(initialVariables.target_height_mm ?? 1800);
    }

    const initialPayload: CanonicalPayload = {
      productCode: underlyingType,
      schemaVersion: isCustom ? "v2" : "v1",
      variables: initialVariables,
      ...(state.payload?.propertyAnchor
        ? { propertyAnchor: state.payload.propertyAnchor }
        : {}),
      ...(state.payload?.snapshot ? { snapshot: state.payload.snapshot } : {}),
      runs: [
        {
          runId: crypto.randomUUID(),
          productCode: underlyingType,
          variables: initialVariables,
          leftBoundary: { type: "product_post" },
          rightBoundary: { type: "product_post" },
          segments: [
            {
              segmentId: crypto.randomUUID(),
              sortOrder: 1,
              segmentKind: "panel",
              segmentWidthMm: 0,
              targetHeightMm: initialHeight,
              variables: underlyingType === "BAYG" ? { panel_quantity: 1 } : undefined,
            },
          ],
          corners: [],
        },
      ],
    };
    dispatch({ type: "SET_PAYLOAD", payload: initialPayload });
    onProductSelected?.(initialPayload);
  }

  const getSelectedProductDescription = () => {
    for (const cat of Object.keys(categorizedProducts)) {
      const found = categorizedProducts[cat].find(
        (p) => p.underlying_type === currentCode && (!currentSubType || p.system_type === currentSubType)
      );
      if (found) return found.description;
    }
    return null;
  };

  const selectedDescription = getSelectedProductDescription();

  return (
    <div data-testid="product-select" className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="space-y-2.5">
          {Object.entries(categorizedProducts).map(([catName, items]) => {
            const isExpanded = expandedCat === catName;
            return (
              <div key={catName} className="rounded-xl border border-brand-border/40 bg-brand-card/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCategory(catName)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-brand-card/60 hover:bg-brand-card border-b border-brand-border/20 text-xs font-black text-brand-text transition"
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
                  <div className="p-2.5 grid grid-cols-2 gap-2 bg-brand-bg/10">
                    {items.map((item) => {
                      const selected =
                        item.underlying_type === currentCode &&
                        (!currentSubType || item.system_type === currentSubType);
                      const isCalc = ["QSHS", "VS", "XPL", "SLIDING_GATES", "SWING_GATES", "PEDESTRIAN_GATES"].includes(item.id.toUpperCase()) || item.isCustom;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => selectProduct(item)}
                          aria-pressed={selected}
                          className={`flex items-center justify-between min-h-[40px] px-3 py-1.5 rounded-lg border text-left text-xs transition-all ${
                            selected
                              ? "border-brand-primary bg-brand-primary/10 text-brand-primary font-black"
                              : isCalc
                              ? "border-brand-border bg-brand-card text-brand-accent hover:border-brand-primary hover:text-brand-primary"
                              : "border-brand-border bg-brand-card/50 text-brand-muted hover:border-brand-primary hover:text-brand-text"
                          }`}
                          data-testid={`product-option-${item.system_type}`}
                          title={item.description}
                        >
                          <span className="truncate">{item.name}</span>
                          {selected ? (
                            <Check size={12} className="shrink-0 ml-1.5" />
                          ) : isCalc ? (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-brand-accent/10 text-brand-accent font-bold uppercase shrink-0">Calc</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {mapAction && <div className="self-end">{mapAction(selectDefaultProduct)}</div>}
      </div>
      {selectedDescription && (
        <p className="text-xs leading-relaxed text-brand-muted mt-2 border-l-2 border-brand-primary/40 pl-2">
          {selectedDescription}
        </p>
      )}
    </div>
  );
}
