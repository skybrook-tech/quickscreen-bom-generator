import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useCalculator } from "../context/CalculatorContext";
import { useBomCalculator } from "./useBomCalculator";
import { useCalculatorConfig } from "./useCalculatorConfig";
import { validateGateWidth } from "../lib/gateConstraints";
import {
  roundMoney,
  lineKey,
  aggregateBomItems,
  filterLinesForScope,
  gateLabel,
  payloadBomKey,
} from "../lib/calculatorV3Helpers";
import type { BOMLineItem, BOMSource, ExtraItem } from "../types/bom.types";
import type { CanonicalPayload } from "../types/canonical.types";
import type { CalculatorBOMResult } from "../types/bom.types";
import type { SuggestedAccessory } from "../types/bom.types";

const BOM_RECALC_DEBOUNCE_MS = 500;

export interface UseCalculatorBomResult {
  bomResultForTabs: CalculatorBOMResult | null;
  extraItems: ExtraItem[];
  setExtraItems: React.Dispatch<React.SetStateAction<ExtraItem[]>>;
  lineEdits: Record<string, number | null>;
  setLineEdits: React.Dispatch<React.SetStateAction<Record<string, number | null>>>;
  activeBomSummary: ActiveBomSummary | null;
  setActiveBomSummary: React.Dispatch<React.SetStateAction<ActiveBomSummary | null>>;
  handleActiveBomSummaryChange: (summary: ActiveBomSummary) => void;
  economySlatErrors: string[];
  gateWidthErrors: GateWidthValidation[];
  gateWidthWarnings: GateWidthValidation[];
  hasBlockingErrors: boolean;
  suggestedAccessories: SuggestedAccessory[];
  isCalculating: boolean;
  calcError: Error | null;
  handleSwitchEconomyToStandard: (item: BOMLineItem) => void;
  runBomRecalculation: () => Promise<void>;
  /** Call after loading a saved quote to prevent an immediate auto-recalc. */
  suppressNextAutoBom: (loadedPayloadKey: string) => void;
}

export interface ActiveBomSummary {
  label: string;
  subtotal: number;
  gst: number;
  grandTotal: number;
}

export interface GateWidthValidation {
  runId: string;
  segmentId: string;
  status: "ok" | "warning" | "error";
  message?: string;
  gateType?: string;
}

export function useCalculatorBom(
  introDismissed: boolean,
  quoteId: string | undefined,
): UseCalculatorBomResult {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;
  const bomMutation = useBomCalculator();
  const lastBom = state.bomResult;
  // Gate width/height bounds live on the QS_GATE config, not the fence's —
  // shares the same TanStack cache key other components warm.
  const gateConfig = useCalculatorConfig("QS_GATE");

  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [lineEdits, setLineEdits] = useState<Record<string, number | null>>({});
  const [activeBomSummary, setActiveBomSummary] = useState<ActiveBomSummary | null>(null);

  const bomRequestIdRef = useRef(0);
  const lastCalcPayloadKeyRef = useRef<string | null>(null);
  const skipAutoBomRef = useRef(false);
  const bomMutateAsyncRef = useRef(bomMutation.mutateAsync);
  bomMutateAsyncRef.current = bomMutation.mutateAsync;

  const payloadCalcKey = useMemo(
    () => (payload ? payloadBomKey(payload) : null),
    [payload],
  );

  useEffect(() => {
    setActiveBomSummary(null);
  }, [payloadCalcKey]);

  useEffect(() => {
    if (!lastBom) setActiveBomSummary(null);
  }, [lastBom]);

  const handleActiveBomSummaryChange = useCallback(
    (summary: ActiveBomSummary) => {
      setActiveBomSummary({
        label: summary.label === "All Items" ? "All items" : summary.label,
        subtotal: summary.subtotal,
        gst: summary.gst,
        grandTotal: summary.grandTotal,
      });
    },
    [],
  );

  const economySlatErrors = useMemo(
    () =>
      payload?.runs.flatMap((run, runIndex) => {
        const runVars = { ...(run.variables ?? {}) };
        return run.segments
          .filter((segment) => segment.segmentKind !== "gate_opening")
          .flatMap((segment, segmentIndex) => {
            const vars = { ...runVars, ...(segment.variables ?? {}) };
            return vars.finish_family === "economy" &&
              Number(vars.slat_size_mm ?? 65) === 90
              ? [
                  `Run ${runIndex + 1} Section ${segmentIndex + 1}: Economy slats only available in 65mm - switch slat size or pick Standard.`,
                ]
              : [];
          });
      }) ?? [],
    [payload],
  );

  const gateWidthValidations = useMemo(
    () =>
      payload?.runs.flatMap((run) =>
        run.segments
          .filter((segment) => segment.segmentKind === "gate_opening")
          .map((segment) => ({
            runId: run.runId,
            segmentId: segment.segmentId,
            ...validateGateWidth(segment, gateConfig),
          })),
      ) ?? [],
    [payload, gateConfig],
  );

  const gateWidthErrors = useMemo(
    () => gateWidthValidations.filter((item) => item.status === "error") as GateWidthValidation[],
    [gateWidthValidations],
  );

  const gateWidthWarnings = useMemo(
    () => gateWidthValidations.filter((item) => item.status === "warning") as GateWidthValidation[],
    [gateWidthValidations],
  );

  const hasBlockingErrors = useMemo(
    () =>
      (lastBom?.errors as string[] | undefined)?.length
        ? true
        : gateWidthErrors.length > 0 || economySlatErrors.length > 0,
    [lastBom, gateWidthErrors, economySlatErrors],
  );

  const suggestedAccessories = useMemo(
    () => (lastBom?.suggestedItems ?? []) as SuggestedAccessory[],
    [lastBom],
  );

  // ── applyLineEdits ─────────────────────────────────────────────────────────
  const applyLineEdits = useCallback(
    (items: BOMLineItem[]) =>
      items
        .map((line) => {
          const edit = lineEdits[lineKey(line)];
          if (edit === null) return null;
          if (typeof edit === "number") {
            return {
              ...line,
              quantity: edit,
              lineTotal: roundMoney(line.unitPrice * edit),
              notes: line.notes ? `${line.notes}; edited` : "edited",
            };
          }
          return line;
        })
        .filter(Boolean) as BOMLineItem[],
    [lineEdits],
  );

  // ── bomResultForTabs ───────────────────────────────────────────────────────
  const bomResultForTabs: CalculatorBOMResult | null = useMemo(() => {
    if (!lastBom) return null;

    const baseAllItems = applyLineEdits(
      aggregateBomItems((lastBom.lines as BOMLineItem[]) ?? []),
    );
    const extraLineItems: BOMLineItem[] = extraItems.map((e) => ({
      category: "accessory",
      sku: e.sku ?? e.id,
      description: e.description,
      quantity: e.quantity,
      unit: "each",
      unitPrice: e.unitPrice,
      lineTotal: roundMoney(e.unitPrice * e.quantity),
      notes: "added manually",
      sources: [
        {
          scopeKind: "global" as BOMSource["scopeKind"],
          scopeId: "manual-extras",
          scopeLabel: "Manual extras",
          qty: e.quantity,
        },
      ],
      totalQty: e.quantity,
    }));

    const rawRunResults =
      (lastBom.runResults as Array<{ runId: string; items: BOMLineItem[] }>) ?? [];

    const runResults =
      payload?.runs.map((run) => ({
        runId: run.runId,
        items: applyLineEdits(
          filterLinesForScope(
            baseAllItems,
            (source) =>
              source.scopeKind === "fence_run" && source.scopeId === run.runId,
          ),
        ),
      })) ??
      rawRunResults.map((r) => ({
        runId: r.runId,
        items: applyLineEdits(aggregateBomItems(r.items)),
      }));

    const gateResults =
      payload?.runs.flatMap((run, runIndex) => {
        let gateIndex = 0;
        return run.segments.flatMap((segment) => {
          if (segment.segmentKind !== "gate_opening") return [];
          const label = gateLabel(runIndex, gateIndex++);
          return [
            {
              id: segment.segmentId,
              label,
              items: applyLineEdits(
                filterLinesForScope(
                  baseAllItems,
                  (source) =>
                    source.scopeKind === "gate" &&
                    source.scopeId === segment.segmentId,
                ),
              ),
            },
          ];
        });
      }) ?? [];

    const gateSegments =
      payload?.runs.flatMap((run) =>
        run.segments.filter((segment) => segment.segmentKind === "gate_opening"),
      ) ?? [];

    const runScopedGateItems = rawRunResults.flatMap((runResult) =>
      runResult.items.filter(
        (item) =>
          item.sources?.some((source) => source.scopeKind === "gate") ||
          item.productCode === "QS_GATE" ||
          gateSegments.some((segment) => segment.segmentId === item.segmentId),
      ),
    );

    const rawGateItems =
      baseAllItems.some((item) =>
        item.sources?.some((source) => source.scopeKind === "gate"),
      )
        ? filterLinesForScope(
            baseAllItems,
            (source) => source.scopeKind === "gate",
          )
        : runScopedGateItems.length > 0
          ? runScopedGateItems
          : ((lastBom.gateItems as BOMLineItem[]) ?? []);

    const gateItems = applyLineEdits(aggregateBomItems(rawGateItems));
    const allItems = aggregateBomItems([...baseAllItems, ...extraLineItems]);
    const baseTotal = roundMoney(allItems.reduce((sum, line) => sum + line.lineTotal, 0));
    const gst = roundMoney(baseTotal * 0.1);
    const grandTotal = roundMoney(baseTotal + gst);

    return {
      runResults,
      gateResults,
      gateItems,
      allItems,
      total: baseTotal,
      gst,
      grandTotal,
      pricingTier:
        (lastBom.pricingTier as CalculatorBOMResult["pricingTier"]) ?? "tier1",
      generatedAt: (lastBom.generatedAt as string) ?? new Date().toISOString(),
    };
  }, [lastBom, applyLineEdits, extraItems, payload]);

  // ── BOM recalculation ──────────────────────────────────────────────────────
  const runBomRecalculation = useCallback(async () => {
    if (!payload || !payloadCalcKey) {
      lastCalcPayloadKeyRef.current = null;
      dispatch({ type: "CLEAR_BOM_RESULT" });
      return;
    }
    const emptyRuns = payload.runs.every((run) => run.segments.length === 0);
    const economyErrors = payload.runs.flatMap((run, runIndex) => {
      const runVars = { ...(run.variables ?? {}) };
      return run.segments
        .filter((segment) => segment.segmentKind !== "gate_opening")
        .flatMap((segment, segmentIndex) => {
          const vars = { ...runVars, ...(segment.variables ?? {}) };
          return vars.finish_family === "economy" &&
            Number(vars.slat_size_mm ?? 65) === 90
            ? [`Run ${runIndex + 1} Section ${segmentIndex + 1}`]
            : [];
        });
    });
    const gateErrors = payload.runs.flatMap((run) =>
      run.segments
        .filter((segment) => segment.segmentKind === "gate_opening")
        .map((segment) => validateGateWidth(segment, gateConfig))
        .filter((result) => result.status === "error"),
    );
    if (emptyRuns || economyErrors.length > 0 || gateErrors.length > 0) {
      lastCalcPayloadKeyRef.current = payloadCalcKey;
      dispatch({ type: "CLEAR_BOM_RESULT" });
      return;
    }
    const requestId = ++bomRequestIdRef.current;
    try {
      const result = await bomMutateAsyncRef.current({ payload });
      if (requestId !== bomRequestIdRef.current) return;
      dispatch({ type: "SET_BOM_RESULT", result });
      lastCalcPayloadKeyRef.current = payloadCalcKey;
    } catch {
      // Error available via bomMutation.error
    }
  }, [payload, payloadCalcKey, dispatch, gateConfig]);

  const runBomRecalcRef = useRef(runBomRecalculation);
  runBomRecalcRef.current = runBomRecalculation;

  useEffect(() => {
    if (!introDismissed && !quoteId) return;
    if (!payload || !payloadCalcKey) return;
    if (skipAutoBomRef.current) {
      skipAutoBomRef.current = false;
      return;
    }
    if (payloadCalcKey === lastCalcPayloadKeyRef.current) return;
    const timer = window.setTimeout(() => {
      void runBomRecalcRef.current();
    }, BOM_RECALC_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [payloadCalcKey, introDismissed, quoteId]);

  const suppressNextAutoBom = useCallback((loadedPayloadKey: string) => {
    skipAutoBomRef.current = true;
    lastCalcPayloadKeyRef.current = loadedPayloadKey;
  }, []);

  const handleSwitchEconomyToStandard = useCallback(
    (item: BOMLineItem) => {
      if (!payload) return;
      const nextPayload: CanonicalPayload = {
        ...payload,
        runs: payload.runs.map((run) => {
          if (item.runId && run.runId !== item.runId) return run;
          const runVariables =
            run.variables?.finish_family === "economy"
              ? { ...run.variables, finish_family: "standard" }
              : run.variables;
          return {
            ...run,
            variables: runVariables,
            segments: run.segments.map((segment) => {
              const variables = segment.variables ?? {};
              const inheritsRunEconomy =
                run.variables?.finish_family === "economy" &&
                variables.finish_family == null;
              if (variables.finish_family !== "economy" && !inheritsRunEconomy)
                return segment;
              return {
                ...segment,
                variables: { ...variables, finish_family: "standard" },
              };
            }),
          };
        }),
      };
      dispatch({ type: "SET_PAYLOAD", payload: nextPayload });
      toast.success("Switched Economy slats to Standard.");
    },
    [payload, dispatch],
  );

  return {
    bomResultForTabs,
    extraItems,
    setExtraItems,
    lineEdits,
    setLineEdits,
    activeBomSummary,
    setActiveBomSummary,
    handleActiveBomSummaryChange,
    economySlatErrors,
    gateWidthErrors,
    gateWidthWarnings,
    hasBlockingErrors,
    suggestedAccessories,
    isCalculating: bomMutation.isPending,
    calcError: bomMutation.error instanceof Error ? bomMutation.error : null,
    handleSwitchEconomyToStandard,
    runBomRecalculation,
    suppressNextAutoBom,
  };
}
