import { AppShell } from "../components/layout/AppShell";
import {
  CalculatorProvider,
  useCalculator,
} from "../context/CalculatorContext";
import { FenceConfigProvider } from "../context/FenceConfigContext";
import { GateProvider } from "../context/GateContext";
import { RunListV3 } from "../components/calculator-v3/RunListV3";
import { LayoutCanvasV3 } from "../components/calculator-v3/LayoutCanvasV3";
import { RightPaneTabs, type RightPaneView } from "../components/calculator-v3/RightPaneTabs";
import { ExtraItemsPanel } from "../components/calculator-v3/ExtraItemsPanel";
import { SuggestedAccessoriesPanel } from "../components/calculator-v3/SuggestedAccessoriesPanel";
import { BOMResultTabs } from "../components/shared/BOMResultTabs";
import { GlassOutletLogo } from "../components/brand/GlassOutletLogo";
import { DescribeFenceBox } from "../components/calculator/DescribeFenceBox";
import { JobNameEditor } from "../components/calculator/JobNameEditor";
import { GatePositionModal } from "../components/calculator/GatePositionModal";
import { ConfirmButton } from "../components/shared/ConfirmButton";
import { useBomCalculator } from "../hooks/useBomCalculator";
import { suggestAccessories } from "../lib/suggestedAccessories";
import { priceForSku } from "../lib/localBomCalculator";
import {
  initialVariablesForSystem,
  normaliseVariablesForSystem,
} from "../lib/productOptionRules";
import { GATE_SEGMENT_STUB_KEYS } from "../lib/segmentTermination";
import {
  clearGateOpeningWidthMm,
  defaultGateBuildForMovement,
  defaultGateVariables,
} from "../lib/gateOptionRules";
import { hingeGapForSku, latchGapForSku } from "../lib/gateHardware";
import { gateTypeLabel, validateGateWidth } from "../lib/gateConstraints";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Download,
  FileX2,
  Keyboard,
  Loader2,
  Printer,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Papa from "papaparse";
import type {
  CalculatorBOMResult,
  BOMLineItem,
  BOMSource,
  ExtraItem,
} from "../types/bom.types";
import type { CanonicalPayload, CanonicalRun, CanonicalSegment } from "../types/canonical.types";
import type { ParseResult, ParsedSystemType } from "../lib/describeFenceParser";

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const lineKey = (line: BOMLineItem) =>
  `${line.sku}|${line.category}|${line.description}`;

const bomGroupKey = (line: BOMLineItem) =>
  `${line.sku}|${line.category}|${line.description}|${line.unit}`;

const ECONOMY_SLAT_PACK_SIZE = 96;

function priceForBomLine(line: Pick<BOMLineItem, "sku" | "unit">, quantity: number) {
  if (line.sku.startsWith("XP-6500-E65") && line.unit === "pack") {
    return roundMoney(priceForSku(line.sku, quantity * ECONOMY_SLAT_PACK_SIZE) * ECONOMY_SLAT_PACK_SIZE);
  }
  return priceForSku(line.sku, quantity);
}

function aggregateBomItems(items: BOMLineItem[]): BOMLineItem[] {
  const grouped = new Map<string, BOMLineItem>();
  for (const item of items) {
    const key = bomGroupKey(item);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...item });
      continue;
    }
    const quantity = existing.quantity + item.quantity;
    const sources = mergeBomSources([
      ...(existing.sources ?? sourceFromLine(existing)),
      ...(item.sources ?? sourceFromLine(item)),
    ]);
    const lineTotalBeforeReprice = existing.lineTotal + item.lineTotal;
    const unitPrice = priceForBomLine(item, quantity);
    const lineTotal =
      unitPrice > 0 ? roundMoney(unitPrice * quantity) : roundMoney(lineTotalBeforeReprice);
    grouped.set(key, {
      ...existing,
      quantity,
      totalQty: quantity,
      sources,
      unitPrice: unitPrice > 0 ? unitPrice : roundMoney(lineTotal / Math.max(1, quantity)),
      lineTotal,
      notes:
        existing.notes || item.notes
          ? Array.from(new Set([existing.notes, item.notes].filter(Boolean))).join("; ")
          : undefined,
    });
  }
  return [...grouped.values()];
}

function sourceFromLine(line: BOMLineItem): BOMSource[] {
  return [
    {
      scopeKind: line.productCode === "QS_GATE" || line.segmentId?.includes("gate") ? "gate" : "fence_run",
      scopeId: line.segmentId ?? line.runId ?? "global",
      scopeLabel: line.productCode === "QS_GATE" ? "Gate" : line.runId ? "Run" : "Global",
      qty: line.quantity,
    },
  ];
}

function mergeBomSources(sources: BOMSource[]): BOMSource[] {
  const merged = new Map<string, BOMSource>();
  for (const source of sources) {
    const key = `${source.scopeKind}|${source.scopeId}|${source.scopeLabel}`;
    const existing = merged.get(key);
    if (existing) {
      existing.qty += source.qty;
    } else {
      merged.set(key, { ...source });
    }
  }
  return [...merged.values()];
}

function deriveLineForSources(
  line: BOMLineItem,
  predicate: (source: BOMSource) => boolean,
): BOMLineItem | null {
  const sources = (line.sources ?? sourceFromLine(line)).filter(predicate);
  if (sources.length === 0) return null;
  const quantity = sources.reduce((sum, source) => sum + source.qty, 0);
  const unitPrice = priceForBomLine(line, quantity);
  return {
    ...line,
    quantity,
    totalQty: quantity,
    sources,
    unitPrice,
    lineTotal: roundMoney(unitPrice * quantity),
  };
}

function filterLinesForScope(
  items: BOMLineItem[],
  predicate: (source: BOMSource) => boolean,
): BOMLineItem[] {
  return items
    .map((item) => deriveLineForSources(item, predicate))
    .filter(Boolean) as BOMLineItem[];
}

function gateLabel(runIndex: number, gateIndex: number) {
  return `R${runIndex + 1} G${gateIndex + 1}`;
}

const COLOUR_NAMES: Record<string, string> = {
  B: "Black Satin",
  MN: "Monument Matt",
  G: "Woodland Grey Matt",
  SM: "Surfmist Matt",
  W: "Pearl White Gloss",
  BS: "Basalt Satin",
  D: "Dune Satin",
  M: "Mill",
  P: "Primrose",
  PB: "Paperbark",
  S: "Palladium Silver Pearl",
  KWI: "Kwila",
  WRC: "Western Red Cedar",
};

function colourName(code: unknown) {
  const value = String(code ?? "B");
  return COLOUR_NAMES[value] ? `${COLOUR_NAMES[value]} (${value})` : value;
}

function initialRunPaneWidth() {
  if (typeof window === "undefined") return 480;
  const stored = Number(window.localStorage.getItem("qsg-run-pane-width"));
  if (Number.isFinite(stored) && stored > 0) return stored;
  return Math.round(Math.min(680, Math.max(390, window.innerWidth / 3)));
}

function createInitialPayload(systemType = "QSHS"): CanonicalPayload {
  const initialVariables = initialVariablesForSystem(systemType);
  const initialHeight = Number(initialVariables.target_height_mm ?? 1800);
  return {
    productCode: systemType,
    schemaVersion: "v1",
    variables: initialVariables,
    runs: [
      {
        runId: crypto.randomUUID(),
        productCode: systemType,
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
            variables: systemType === "BAYG" ? { panel_quantity: 1 } : undefined,
          },
        ],
        corners: [],
      },
    ],
  };
}

function createEmptyPayload(systemType = "QSHS"): CanonicalPayload {
  return {
    productCode: systemType,
    schemaVersion: "v1",
    variables: initialVariablesForSystem(systemType),
    runs: [],
  };
}

type PendingParsedGate = NonNullable<NonNullable<CanonicalPayload["job"]>["pendingGates"]>[number];

function productCodeFromParsedSystem(systemType: ParsedSystemType | undefined) {
  if (systemType === "VS" || systemType === "XPL" || systemType === "BAYG") return systemType;
  return "QSHS";
}

function mountingMethodToVariables(value: string | undefined) {
  if (value === "base_plated") return "base_plate";
  if (value === "core_drilled") return "core_drill";
  return "in_ground";
}

function boundariesFromTermination(value: string | undefined) {
  if (value === "wall_wall") return { left: "wall", right: "wall" } as const;
  if (value === "post_wall") return { left: "product_post", right: "wall" } as const;
  return { left: "product_post", right: "product_post" } as const;
}

function gateMovementFromParsedGate(gate: NonNullable<ParseResult["attributes"]["gates"]>["value"][number]) {
  if (gate.kind === "sliding") return "sliding" as const;
  if (gate.kind === "double_swing") return "double_swing" as const;
  return "single_swing" as const;
}

function gateLeavesForOpening(movement: ReturnType<typeof gateMovementFromParsedGate>, openingWidthMm: number) {
  if (movement === "sliding") return [{ widthMm: Math.max(1, Math.round(openingWidthMm)) }];
  const hingeGapMm = hingeGapForSku("TC-H-AT-HD-B");
  const latchGapMm = latchGapForSku("LL-DL-KA");
  const clearOpeningMm = clearGateOpeningWidthMm({
    movement,
    openingWidthMm,
    hingeGapMm,
    latchGapMm,
  });
  if (movement === "double_swing") {
    const first = Math.round(clearOpeningMm / 2);
    return [
      { widthMm: Math.max(1, first) },
      { widthMm: Math.max(1, Math.round(clearOpeningMm) - first) },
    ];
  }
  return [{ widthMm: Math.max(1, Math.round(clearOpeningMm)) }];
}

function runLengthMm(run: CanonicalRun) {
  return run.segments.reduce((sum, segment) => {
    if (segment.segmentKind === "gate_opening") return sum;
    const qty =
      run.productCode === "BAYG"
        ? Math.max(1, Math.round(Number(segment.variables?.panel_quantity ?? 1)))
        : 1;
    return sum + Number(segment.segmentWidthMm ?? 0) * qty;
  }, 0);
}

function useAnimatedNumber(target: number) {
  const [value, setValue] = useState(target);
  const previous = useRef(target);

  useEffect(() => {
    const start = previous.current;
    const delta = target - start;
    if (Math.abs(delta) < 0.01) {
      setValue(target);
      previous.current = target;
      return;
    }

    let frame = 0;
    const startTime = performance.now();
    const duration = 420;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + delta * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        previous.current = target;
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

function CalculatorV3Content() {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;
  const bomMutation = useBomCalculator();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [lineEdits, setLineEdits] = useState<Record<string, number | null>>({});
  const [saving, setSaving] = useState(false);
  const [jobName, setJobName] = useState("");
  const [activeBomSummary, setActiveBomSummary] = useState<{
    label: string;
    grandTotal: number;
  } | null>(null);
  const [runPaneWidth, setRunPaneWidth] = useState(initialRunPaneWidth);
  const [mobileLayout, setMobileLayout] = useState(false);
  const [mobileTab, setMobileTab] = useState<"run" | "bom" | "map">("bom");
  const [rightPaneView, setRightPaneView] = useState<RightPaneView>("bom");
  const [mapExpanded, setMapExpanded] = useState(false);
  const [introDismissed, setIntroDismissed] = useState(false);
  const [autoOpenFirstSectionRunId, setAutoOpenFirstSectionRunId] = useState<string | null>(null);
  const [includeMapInBomPrint, setIncludeMapInBomPrint] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [clearJobDialogOpen, setClearJobDialogOpen] = useState(false);
  const [gatePositionTarget, setGatePositionTarget] = useState<PendingParsedGate | null>(null);
  const handleActiveBomSummaryChange = useCallback(
    (summary: { label: string; grandTotal: number }) => {
      setActiveBomSummary({
        label: summary.label === "All Items" ? "All items" : summary.label,
        grandTotal: summary.grandTotal,
      });
    },
    [],
  );

  useEffect(() => {
    const updateLayout = () => setMobileLayout(window.innerWidth < 768);
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    if (rightPaneView !== "map") return;
    window.setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
  }, [rightPaneView]);

  useEffect(() => {
    if (!mapExpanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMapExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mapExpanded]);

  useEffect(() => {
    const openGateFromMap = (event: Event) => {
      const gateId = (event as CustomEvent<string>).detail;
      if (!gateId) return;
      setRightPaneView("map");
      setMapExpanded(false);
      if (mobileLayout) setMobileTab("run");
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("qsbom:open-segment", { detail: gateId }));
      }, 80);
    };
    window.addEventListener("qsbom:edit-gate-from-map", openGateFromMap);
    return () => window.removeEventListener("qsbom:edit-gate-from-map", openGateFromMap);
  }, [mobileLayout]);

  const handleRightPaneChange = useCallback((view: RightPaneView) => {
    setRightPaneView(view);
    if (view !== "map") setMapExpanded(false);
  }, []);

  function handleResizeStart() {
    let latestWidth = runPaneWidth;
    const onMove = (event: MouseEvent) => {
      const maxWidth = Math.min(760, window.innerWidth * 0.58);
      const minWidth = Math.min(390, Math.max(320, window.innerWidth - 360));
      latestWidth = Math.round(Math.min(maxWidth, Math.max(minWidth, event.clientX)));
      setRunPaneWidth(latestWidth);
    };
    const onUp = () => {
      window.localStorage.setItem("qsg-run-pane-width", String(latestWidth));
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function startWorkspaceFromLanding(nextJobName = jobName) {
    const cleanJobName = nextJobName.trim();
    if (!cleanJobName) return;
    setJobName(cleanJobName);
    if (!payload) {
      dispatch({ type: "SET_PAYLOAD", payload: createEmptyPayload("QSHS") });
      dispatch({ type: "SET_ENTRY_METHOD", entryMethod: "select" });
    }
    setIntroDismissed(true);
    setRightPaneView("bom");
    setMapExpanded(false);
    setMobileTab("bom");
  }

  function handleApplyDescription(result: ParseResult) {
    const parsedSystem = result.attributes.systemType?.value;
    const productCode = productCodeFromParsedSystem(parsedSystem);
    const base = payload ?? createEmptyPayload(productCode);
    const baseRun = base.runs[0] ?? createInitialPayload(productCode).runs[0];
    const runId = baseRun.runId;
    const initialVariables = initialVariablesForSystem(productCode);
    const variables = normaliseVariablesForSystem(productCode, {
      ...initialVariables,
      ...(base.variables ?? {}),
      ...(baseRun.variables ?? {}),
      ...(result.attributes.heightMm?.value
        ? { target_height_mm: result.attributes.heightMm.value }
        : {}),
      ...(result.attributes.slatSizeMm?.value
        ? { slat_size_mm: result.attributes.slatSizeMm.value }
        : {}),
      ...(result.attributes.gapMm?.value ? { slat_gap_mm: result.attributes.gapMm.value } : {}),
      ...(result.attributes.colourCode?.value
        ? {
          colour_code: result.attributes.colourCode.value,
          post_colour_code: result.attributes.colourCode.value,
        }
        : {}),
      ...(result.attributes.mountingMethod?.value
        ? {
          mounting_type: mountingMethodToVariables(result.attributes.mountingMethod.value),
          mounting_method: mountingMethodToVariables(result.attributes.mountingMethod.value),
        }
        : {}),
    });
    const boundaries = boundariesFromTermination(result.attributes.termination?.value);
    const firstSegment = baseRun.segments.find((segment) => segment.segmentKind !== "gate_opening");
    const targetHeightMm = Number(
      variables.target_height_mm ??
      firstSegment?.targetHeightMm ??
      1800,
    );
    const parsedGates = result.attributes.gates?.value ?? [];
    const gateWidths = parsedGates.map((gate) => {
      if (gate.widthMm && gate.widthMm > 0) return Math.round(gate.widthMm);
      if (gate.kind === "double_swing") return 1800;
      if (gate.kind === "sliding") return 3000;
      return 900;
    });
    const totalGateWidth = gateWidths.reduce((sum, width) => sum + width, 0);
    const parsedRunLength = Number(result.attributes.runLengthMm?.value ?? 0);
    const fallbackRunLength =
      parsedGates.length > 0 ? totalGateWidth + (parsedGates.length + 1) * 1000 : 0;
    const runLength = Math.max(
      parsedRunLength,
      Number(firstSegment?.segmentWidthMm ?? 0),
      fallbackRunLength,
    );
    const panelTotal = Math.max(0, runLength - totalGateWidth);
    const panelCount = parsedGates.length > 0 ? parsedGates.length + 1 : 1;
    const panelWidths =
      parsedGates.length > 0
        ? Array.from({ length: panelCount }, () => Math.max(1, Math.round(panelTotal / panelCount)))
        : [Math.max(0, Math.round(runLength))];
    if (parsedGates.length > 0 && panelWidths.length > 1) {
      const used = panelWidths.reduce((sum, width) => sum + width, 0);
      panelWidths[panelWidths.length - 1] = Math.max(1, panelWidths[panelWidths.length - 1] + Math.round(panelTotal - used));
    }
    const newSegments: CanonicalSegment[] = [];
    let sortOrder = 1;
    const useSingleCanvasSection = parsedGates.length > 0 && runLength > 0;
    const straightGeometry = {
      points: [
        { x: 0, y: 0 },
        { x: Math.max(1, runLength / 10), y: 0 },
      ],
    };
    const canvasMeta = useSingleCanvasSection
      ? {
        canvasSegmentIndex: 0,
        sourceSegmentLengthMm: Math.max(1, Math.round(runLength)),
      }
      : {};
    const makePanelSegment = (widthMm: number): CanonicalSegment => ({
      segmentId: crypto.randomUUID(),
      sortOrder: sortOrder++,
      segmentKind: "panel",
      segmentWidthMm: Math.max(0, Math.round(widthMm)),
      targetHeightMm,
      ...canvasMeta,
      variables: productCode === "BAYG" ? { panel_quantity: 1 } : undefined,
    });

    if (parsedGates.length === 0) {
      newSegments.push(makePanelSegment(panelWidths[0] ?? 0));
    } else {
      let distanceCursorMm = 0;
      for (let index = 0; index < parsedGates.length; index++) {
        const precedingPanel = makePanelSegment(panelWidths[index] ?? 1);
        newSegments.push(precedingPanel);
        distanceCursorMm += precedingPanel.segmentWidthMm ?? 0;
        const gate = parsedGates[index];
        const gateWidth = gateWidths[index] ?? 900;
        const movement = gateMovementFromParsedGate(gate);
        const gateCenterFraction =
          runLength > 0 ? Math.max(0, Math.min(1, (distanceCursorMm + gateWidth / 2) / runLength)) : 0.5;
        const gateVariables = {
          ...defaultGateVariables({ ...variables, productCode }, targetHeightMm),
          [GATE_SEGMENT_STUB_KEYS.gateMovement]: movement,
          [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovement(
            movement,
            productCode === "VS",
          ),
          [GATE_SEGMENT_STUB_KEYS.leafCount]: movement === "double_swing" ? 2 : 1,
          [GATE_SEGMENT_STUB_KEYS.dropBoltType]: movement === "double_swing" ? "SS-0300DB-B" : "none",
          parent_section_id: precedingPanel.segmentId,
        };
        newSegments.push({
          segmentId: crypto.randomUUID(),
          sortOrder: sortOrder++,
          segmentKind: "gate_opening",
          segmentWidthMm: gateWidth,
          targetHeightMm,
          gateProductCode: "QS_GATE",
          positionOnSegment: gateCenterFraction,
          gateAnchor: "center",
          ...canvasMeta,
          variables: gateVariables,
          leaves: gateLeavesForOpening(movement, gateWidth),
        });
        distanceCursorMm += gateWidth;
      }
      newSegments.push(makePanelSegment(panelWidths[panelWidths.length - 1] ?? 1));
    }
    const cornerCount = Math.max(0, Math.round(Number(result.attributes.cornerCount?.value ?? 0)));
    const corners = Array.from({ length: cornerCount }, () => ({
      cornerId: crypto.randomUUID(),
      afterSegmentId: newSegments.find((segment) => segment.segmentKind !== "gate_opening")?.segmentId ?? crypto.randomUUID(),
      type: "90" as const,
    }));
    const nextRun: CanonicalRun = {
      ...baseRun,
      runId,
      productCode,
      variables,
      leftBoundary: { type: boundaries.left },
      rightBoundary: { type: boundaries.right },
      segments: newSegments,
      corners,
      geometry: straightGeometry,
    };
    const nextPayload: CanonicalPayload = {
      ...base,
      productCode,
      variables,
      job: {
        ...(base.job ?? {}),
        description: result.description,
        pendingGates: [],
      },
      runs: [nextRun, ...base.runs.slice(1)],
    };
    dispatch({ type: "SET_PAYLOAD", payload: nextPayload });
    dispatch({ type: "SET_ENTRY_METHOD", entryMethod: "describe" });
    dispatch({ type: "CLEAR_BOM_RESULT" });
    setIntroDismissed(true);
    setAutoOpenFirstSectionRunId(nextRun.runId);
    setRightPaneView("bom");
    setMapExpanded(false);
    setMobileTab("bom");
    toast.success("Description applied");
  }

  function handleConfirmGatePosition(gate: PendingParsedGate, distanceFromStartMm: number) {
    if (!payload) return;
    const nextRuns = payload.runs.map((run) => {
      if (run.runId !== gate.runId) return run;
      const fenceSegments = run.segments.filter((segment) => segment.segmentKind !== "gate_opening");
      const firstSegment = fenceSegments[0];
      const totalLength = runLengthMm(run);
      const gateWidth = gate.widthMm ?? 1000;
      if (!firstSegment || totalLength <= gateWidth) return run;
      const leftWidth = Math.max(1, Math.round(distanceFromStartMm - gateWidth / 2));
      const rightWidth = Math.max(1, Math.round(totalLength - distanceFromStartMm - gateWidth / 2));
      const baseVars = {
        ...(payload.variables ?? {}),
        ...(run.variables ?? {}),
        productCode: run.productCode,
      };
      const movement =
        gate.kind === "sliding" ? "sliding" : gate.kind === "double_swing" ? "double_swing" : "single_swing";
      const targetHeightMm =
        firstSegment.targetHeightMm ?? Number(run.variables?.target_height_mm ?? payload.variables.target_height_mm ?? 1800);
      const gateVariables = {
        ...defaultGateVariables(baseVars, targetHeightMm),
        [GATE_SEGMENT_STUB_KEYS.gateMovement]: movement,
        [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovement(
          movement,
          run.productCode === "VS",
        ),
        [GATE_SEGMENT_STUB_KEYS.leafCount]: movement === "double_swing" ? 2 : 1,
        [GATE_SEGMENT_STUB_KEYS.dropBoltType]: movement === "double_swing" ? "SS-0300DB-B" : "none",
      };
      const leftSegment: CanonicalSegment = {
        ...firstSegment,
        sortOrder: 1,
        segmentWidthMm: leftWidth,
      };
      const gateSegment: CanonicalSegment = {
        segmentId: gate.id,
        sortOrder: 2,
        segmentKind: "gate_opening",
        segmentWidthMm: gateWidth,
        targetHeightMm,
        gateProductCode: "QS_GATE",
        variables: gateVariables,
      };
      const rightSegment: CanonicalSegment = {
        ...firstSegment,
        segmentId: crypto.randomUUID(),
        sortOrder: 3,
        segmentWidthMm: rightWidth,
      };
      return {
        ...run,
        segments: [leftSegment, gateSegment, rightSegment],
      };
    });
    dispatch({
      type: "SET_PAYLOAD",
      payload: {
        ...payload,
        job: {
          ...(payload.job ?? {}),
          pendingGates: payload.job?.pendingGates?.filter((item) => item.id !== gate.id) ?? [],
        },
        runs: nextRuns,
      },
    });
    dispatch({ type: "CLEAR_BOM_RESULT" });
    setGatePositionTarget(null);
    toast.success("Gate position confirmed");
  }

  async function handleGenerateBOM() {
    if (!payload) return;
    if (economySlatErrors.length > 0) {
      toast.error("Economy slats are only available in 65mm. Fix the slat size or range first.");
      return;
    }
    if (gateWidthErrors.length > 0) {
      toast.error("Fix gate width errors before generating the BOM.");
      return;
    }
    setExtraItems([]);
    setLineEdits({});
    setActiveBomSummary(null);
    dispatch({ type: "CLEAR_BOM_RESULT" });
    try {
      const result = await bomMutation.mutateAsync({ payload });
      dispatch({ type: "SET_BOM_RESULT", result });
    } catch {
      // Error is available via bomMutation.error.
    }
  }

  async function handleGenerateBOMFromFooter() {
    setRightPaneView("bom");
    setMapExpanded(false);
    await handleGenerateBOM();
  }

  async function handleSwitchEconomyToStandard(item: BOMLineItem) {
    if (!payload) return;
    const nextPayload = {
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
            const inheritsRunEconomy = run.variables?.finish_family === "economy" && variables.finish_family == null;
            if (variables.finish_family !== "economy" && !inheritsRunEconomy) return segment;
            return {
              ...segment,
              variables: {
                ...variables,
                finish_family: "standard",
              },
            };
          }),
        };
      }),
    };

    setExtraItems([]);
    setLineEdits({});
    setActiveBomSummary(null);
    dispatch({ type: "SET_PAYLOAD", payload: nextPayload });
    dispatch({ type: "CLEAR_BOM_RESULT" });
    try {
      const result = await bomMutation.mutateAsync({ payload: nextPayload });
      dispatch({ type: "SET_BOM_RESULT", result });
      toast.success("Switched Economy slats to Standard and regenerated the BOM.");
    } catch {
      toast.error("Switched to Standard, but BOM regeneration failed.");
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (typing) return;
      const mod = event.ctrlKey || event.metaKey;
      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen((open) => !open);
      }
      if (mod && event.key === "Enter") {
        event.preventDefault();
        void handleGenerateBOM();
      }
      if (mod && event.key.toLowerCase() === "e") {
        event.preventDefault();
        handleExportCsv();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const lastBom = state.bomResult;
  const baseBomLines = ((lastBom?.lines as BOMLineItem[]) ?? []);
  const suggestedAccessories = useMemo(
    () => (payload && lastBom ? suggestAccessories(payload, baseBomLines) : []),
    [payload, lastBom, baseBomLines],
  );
  const applyLineEdits = (items: BOMLineItem[]) =>
    items
      .map((line) => {
        const edit = lineEdits[lineKey(line)];
        if (edit === null) return null;
        if (typeof edit === "number") {
          const unitPrice = priceForBomLine(line, edit);
          return {
            ...line,
            quantity: edit,
            unitPrice,
            lineTotal: roundMoney(unitPrice * edit),
            notes: line.notes ? `${line.notes}; edited` : "edited",
          };
        }
        return line;
      })
      .filter(Boolean) as BOMLineItem[];

  const bomResultForTabs: CalculatorBOMResult | null = lastBom
    ? (() => {
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
            scopeKind: "global",
            scopeId: "manual-extras",
            scopeLabel: "Manual extras",
            qty: e.quantity,
          },
        ],
        totalQty: e.quantity,
      }));
      const rawRunResults =
        (lastBom.runResults as Array<{
          runId: string;
          items: BOMLineItem[];
        }>) ?? [];
      const runResults = payload?.runs.map((run) => ({
        runId: run.runId,
        items: applyLineEdits(
          filterLinesForScope(baseAllItems, (source) =>
            source.scopeKind === "fence_run" && source.scopeId === run.runId,
          ),
        ),
      })) ?? rawRunResults.map((r) => ({
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
                    (source) => source.scopeKind === "gate" && source.scopeId === segment.segmentId,
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
        runResult.items.filter((item) =>
          item.sources?.some((source) => source.scopeKind === "gate") ||
          item.productCode === "QS_GATE" ||
          gateSegments.some((segment) => segment.segmentId === item.segmentId),
        ),
      );
      const rawGateItems =
        baseAllItems.some((item) => item.sources?.some((source) => source.scopeKind === "gate"))
          ? filterLinesForScope(baseAllItems, (source) => source.scopeKind === "gate")
          : runScopedGateItems.length > 0
            ? runScopedGateItems
          : ((lastBom.gateItems as BOMLineItem[]) ?? []);
      const gateItems = applyLineEdits(aggregateBomItems(rawGateItems));
      const allItems = aggregateBomItems([...baseAllItems, ...extraLineItems]);
      const baseTotal = roundMoney(
        allItems.reduce((sum, line) => sum + line.lineTotal, 0),
      );
      const total = baseTotal;
      const gst = roundMoney(total * 0.1);
      const grandTotal = roundMoney(total + gst);
      return {
        runResults,
        gateResults,
        gateItems,
        allItems,
        total,
        gst,
        grandTotal,
        pricingTier:
          (lastBom.pricingTier as CalculatorBOMResult["pricingTier"]) ??
          "tier1",
        generatedAt:
          (lastBom.generatedAt as string) ?? new Date().toISOString(),
      };
    })()
    : null;

  async function handleSaveJob() {
    if (!payload) return;
    const cleanJobName = jobName.trim();
    const customerRef =
      cleanJobName || `Glass Outlet Job ${new Date().toLocaleDateString("en-AU")}`;
    const emptyBom = {
      fenceItems: [],
      gateItems: [],
      total: 0,
      gst: 0,
      grandTotal: 0,
      pricingTier: "tier1" as const,
      generatedAt: null,
    };
    const quoteBom = bomResultForTabs
      ? {
        fenceItems: bomResultForTabs.allItems,
        gateItems: bomResultForTabs.gateItems,
        total: bomResultForTabs.total,
        gst: bomResultForTabs.gst,
        grandTotal: bomResultForTabs.grandTotal,
        pricingTier: bomResultForTabs.pricingTier,
        generatedAt: bomResultForTabs.generatedAt,
      }
      : emptyBom;

    if (!isSupabaseConfigured) {
      localStorage.setItem(
        `glass-calc-job-${Date.now()}`,
        JSON.stringify({
          jobName: customerRef,
          payload,
          bom: quoteBom,
          savedAt: new Date().toISOString(),
        }),
      );
      toast.success("Job saved locally for this browser");
      return;
    }

    setSaving(true);
    try {
      if (!user) {
        localStorage.setItem(
          `glass-calc-job-${Date.now()}`,
          JSON.stringify({
            jobName: customerRef,
            payload,
            bom: quoteBom,
            savedAt: new Date().toISOString(),
          }),
        );
        toast.success("Job saved locally for this browser");
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();
      if (profileError) throw profileError;
      const orgId = profile?.org_id;
      if (!orgId) throw new Error("No organisation found for this user.");

      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          org_id: orgId,
          user_id: user.id,
          customer_ref: customerRef,
          fence_config: {
            calculator: "v3",
            jobName: customerRef,
            payload,
            layoutGeometry: payload.runs.map((run) => ({
              runId: run.runId,
              geometry: run.geometry,
              segments: run.segments.map((segment) => ({
                segmentId: segment.segmentId,
                widthMm: segment.segmentWidthMm,
                targetHeightMm: segment.targetHeightMm,
                variables: segment.variables ?? {},
              })),
            })),
          },
          gates: [],
          bom: quoteBom,
          contact: {},
          notes: "Saved from v3 job calculator",
          status: "draft",
        })
        .select("id")
        .single();
      if (quoteError) throw quoteError;

      const systems = [...new Set(payload.runs.map((run) => run.productCode))];
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, system_type")
        .in("system_type", systems);
      if (productsError) throw productsError;
      const productIdByCode = new globalThis.Map(
        (products ?? []).map((product) => [product.system_type, product.id]),
      );

      for (const [runIndex, run] of payload.runs.entries()) {
        const productId = productIdByCode.get(run.productCode);
        if (!productId) continue;
        const { data: savedRun, error: runError } = await supabase
          .from("quote_runs")
          .insert({
            org_id: orgId,
            quote_id: quote.id,
            product_id: productId,
            sort_order: runIndex + 1,
            description: `Run ${runIndex + 1} - ${run.productCode}`,
            variables_json: {
              runId: run.runId,
              productCode: run.productCode,
              variables: run.variables ?? {},
              leftBoundary: run.leftBoundary,
              rightBoundary: run.rightBoundary,
              corners: run.corners,
              geometry: run.geometry,
            },
          })
          .select("id")
          .single();
        if (runError) throw runError;

        if (run.segments.length > 0) {
          const { error: segmentError } = await supabase
            .from("quote_run_segments")
            .insert(
              run.segments.map((segment) => ({
                org_id: orgId,
                quote_run_id: savedRun.id,
                sort_order: segment.sortOrder,
                segment_type: segment.segmentKind,
                segment_kind: segment.segmentKind,
                length_mm: segment.segmentWidthMm ?? null,
                panel_width_mm: segment.variables?.max_panel_width_mm ?? null,
                target_height_mm: segment.targetHeightMm ?? null,
                bay_count: segment.bayCount ?? null,
                variables_json: {
                  segmentId: segment.segmentId,
                  variables: segment.variables ?? {},
                  gateProductCode: segment.gateProductCode,
                },
              })),
            );
          if (segmentError) throw segmentError;
        }
      }

      toast.success("Job saved");
      navigate(`/quote/${quote.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save job");
    } finally {
      setSaving(false);
    }
  }

  function clearToFreshWorkspace() {
    dispatch({ type: "CLEAR_QUOTE" });
    setExtraItems([]);
    setLineEdits({});
    setActiveBomSummary(null);
    setJobName("");
    dispatch({ type: "SET_PAYLOAD", payload: createEmptyPayload("QSHS") });
    setIntroDismissed(true);
    setRightPaneView("bom");
    setMapExpanded(false);
    setAutoOpenFirstSectionRunId(null);
    setMobileTab("bom");
    setClearJobDialogOpen(false);
  }

  function saveCurrentJobLocallyBeforeClear() {
    if (!payload) return;
    localStorage.setItem(
      `glass-calc-cleared-job-${Date.now()}`,
      JSON.stringify({
        jobName: jobName.trim() || "Untitled Glass Outlet Job",
        payload,
        bom: bomResultForTabs,
        savedAt: new Date().toISOString(),
        source: "clear-job-dialog",
      }),
    );
    toast.success("Job saved locally before clearing");
  }

  function handlePrintBom() {
    const cleanupPrintMode = () => {
      document.body.removeAttribute("data-print-bom");
      document.body.removeAttribute("data-print-bom-map");
      window.removeEventListener("afterprint", cleanupPrintMode);
    };
    document.body.setAttribute("data-print-bom", "true");
    if (includeMapInBomPrint) {
      document.body.setAttribute("data-print-bom-map", "true");
    } else {
      document.body.removeAttribute("data-print-bom-map");
    }
    window.addEventListener("afterprint", cleanupPrintMode);
    if (includeMapInBomPrint) {
      setRightPaneView("map");
      window.setTimeout(() => window.print(), 300);
      return;
    }
    window.setTimeout(() => window.print(), 0);
  }

  function handleExportCsv() {
    if (!bomResultForTabs) return;
    type CsvRow = {
      SKU: string;
      Description: string;
      Category: string;
      Unit: string;
      Qty: string | number;
      "Unit Price": string;
      "Line Total": string;
    };
    const rows: CsvRow[] = [];
    if (payload?.job?.description) {
      rows.push({
        SKU: "",
        Description: `Original description: ${payload.job.description}`,
        Category: "job",
        Unit: "",
        Qty: "",
        "Unit Price": "",
        "Line Total": "",
      });
    }
    rows.push(...bomResultForTabs.allItems.map((line) => ({
      SKU: line.sku,
      Description: line.description,
      Category: line.category,
      Unit: line.unit,
      Qty: line.quantity,
      "Unit Price": line.unitPrice.toFixed(2),
      "Line Total": line.lineTotal.toFixed(2),
    })));
    rows.push(
      {
        SKU: "",
        Description: "Subtotal (ex-GST)",
        Category: "",
        Unit: "",
        Qty: "",
        "Unit Price": "",
        "Line Total": bomResultForTabs.total.toFixed(2),
      },
      {
        SKU: "",
        Description: "GST (10%)",
        Category: "",
        Unit: "",
        Qty: "",
        "Unit Price": "",
        "Line Total": bomResultForTabs.gst.toFixed(2),
      },
      {
        SKU: "",
        Description: "TOTAL (inc. GST)",
        Category: "",
        Unit: "",
        Qty: "",
        "Unit Price": "",
        "Line Total": bomResultForTabs.grandTotal.toFixed(2),
      },
    );
    const blob = new Blob([Papa.unparse(rows)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `glass-outlet-bom-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const warnings = (lastBom?.warnings as string[]) ?? [];
  const errors = (lastBom?.errors as string[]) ?? [];
  const hasErrors = errors.length > 0;
  const noSegments =
    !payload || payload.runs.every((r) => r.segments.length === 0);
  const economySlatErrors =
    payload?.runs.flatMap((run, runIndex) => {
      const runVars = { ...(payload.variables ?? {}), ...(run.variables ?? {}) };
      return run.segments
        .filter((segment) => segment.segmentKind !== "gate_opening")
        .flatMap((segment, segmentIndex) => {
          const vars = { ...runVars, ...(segment.variables ?? {}) };
          return vars.finish_family === "economy" && Number(vars.slat_size_mm ?? 65) === 90
            ? [
              `Run ${runIndex + 1} Section ${segmentIndex + 1}: Economy slats only available in 65mm - switch slat size or pick Standard.`,
            ]
            : [];
        });
    }) ?? [];
  const gateWidthValidations =
    payload?.runs.flatMap((run) =>
      run.segments
        .filter((segment) => segment.segmentKind === "gate_opening")
        .map((segment) => ({ runId: run.runId, segmentId: segment.segmentId, ...validateGateWidth(segment) })),
    ) ?? [];
  const gateWidthErrors = gateWidthValidations.filter((item) => item.status === "error");
  const gateWidthWarnings = gateWidthValidations.filter((item) => item.status === "warning");
  const hasBlockingErrors = hasErrors || gateWidthErrors.length > 0 || economySlatErrors.length > 0;

  const cleanJobName = jobName.trim();
  const systemLabel = (productCode: string) => {
    if (productCode === "QSHS") return "QuickScreen Horizontal Slat";
    if (productCode === "VS") return "QuickScreen Vertical Slat";
    if (productCode === "XPL") return "XPress Plus Fence";
    if (productCode === "BAYG") return "BAY-G Infill Screens";
    return productCode;
  };
  const gateSummaryForRun = (run: CanonicalRun) => {
    const counts = new Map<string, number>();
    for (const segment of run.segments) {
      if (segment.segmentKind !== "gate_opening") continue;
      const movement = String(segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement] ?? "single_swing");
      const label =
        movement === "sliding"
          ? "sliding gate"
          : movement === "double_swing"
            ? "double swing gate"
            : "pedestrian gate";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, count]) => `${count} ${label}${count === 1 ? "" : "s"}`)
      .join(" + ");
  };
  const runBomSummaries = payload?.runs.map((run, index) => {
    const vars = {
      ...(payload.variables ?? {}),
      ...(run.variables ?? {}),
    };
    const lengthM = run.segments.reduce(
      (sum, segment) => {
        const qty =
          run.productCode === "BAYG" && segment.segmentKind !== "gate_opening"
            ? Math.max(1, Math.round(Number(segment.variables?.panel_quantity ?? 1)))
            : 1;
        return sum + Number(segment.segmentWidthMm ?? 0) * qty;
      },
      0,
    ) / 1000;
    const gatePart = gateSummaryForRun(run);
    return [
      `Run ${index + 1}`,
      `${lengthM.toFixed(2)}m`,
      systemLabel(run.productCode),
      colourName(vars.colour_code),
      `${Number(vars.slat_size_mm ?? 65)}mm slat`,
      `${Number(vars.slat_gap_mm ?? 9)}mm gap`,
      gatePart || null,
    ].filter(Boolean).join(" - ");
  }) ?? [];
  const summaryText = payload ? runBomSummaries.join(" | ") : cleanJobName;
  const bomRunDetails = payload?.runs.map((run, runIndex) => {
    const vars = { ...(payload.variables ?? {}), ...(run.variables ?? {}) };
    const gates = run.segments.filter((segment) => segment.segmentKind === "gate_opening");
    const sections = run.segments.filter((segment) => segment.segmentKind !== "gate_opening");
    const lengthMm = run.segments.reduce((sum, segment) => sum + Number(segment.segmentWidthMm ?? 0), 0);
    const maxPanelWidth = Number(vars.max_panel_width_mm ?? 2600);
    const sectionRows = sections.map((section, sectionIndex) => {
      const sectionVars = section.variables ?? {};
      const width = Number(section.segmentWidthMm ?? 0);
      const panelCount = width > 0 ? Math.max(1, Math.ceil(width / Number(sectionVars.max_panel_width_mm ?? maxPanelWidth))) : 0;
      const postSpacing = panelCount > 0 ? Math.round(width / panelCount) : 0;
      const overrides = [
        ["Colour", sectionVars.colour_code, vars.colour_code],
        ["Slat", sectionVars.slat_size_mm, vars.slat_size_mm],
        ["Gap", sectionVars.slat_gap_mm, vars.slat_gap_mm],
      ]
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .filter(([, value, master]) => String(value) !== String(master ?? ""))
        .map(([label, value]) => `${label}: ${value}${label === "Slat" || label === "Gap" || label === "Height" ? "mm" : ""}`);
      const linkedGates = gates.filter((gate) => gate.variables?.parent_section_id === section.segmentId);
      return {
        label: `Section ${sectionIndex + 1} - ${(width / 1000).toFixed(2)}m x ${Number(section.targetHeightMm ?? vars.target_height_mm ?? 1800)}mm - ${panelCount} panel${panelCount === 1 ? "" : "s"} - post spacing ${postSpacing}mm`,
        overrides,
        gates: linkedGates.map((gate) => {
          const movement = String(gate.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement] ?? "single_swing");
          const hardware = String(gate.variables?.[GATE_SEGMENT_STUB_KEYS.hardwareKitSku] ?? gate.variables?.[GATE_SEGMENT_STUB_KEYS.hingeType] ?? "default hardware");
          return `${movement.replace("_", " ")} - ${Number(gate.segmentWidthMm ?? 0)}mm - ${hardware}`;
        }),
      };
    });
    return {
      hero: `Run ${runIndex + 1} - ${(lengthMm / 1000).toFixed(2)}m - ${systemLabel(run.productCode)} - ${gateSummaryForRun(run) || "no gates"}`,
      settings: [
        `Slat size: ${Number(vars.slat_size_mm ?? 65)}mm`,
        `Gap: ${Number(vars.slat_gap_mm ?? 9)}mm`,
        `Colour: ${colourName(vars.colour_code)}`,
        `Mounting: ${String(vars.mounting_method ?? vars.mounting_type ?? "in_ground").replace(/_/g, " ")}`,
        `Termination L: ${run.leftBoundary?.type ?? "Post"}`,
        `Termination R: ${run.rightBoundary?.type ?? "Post"}`,
        `Corners: ${run.corners.length}`,
      ],
      posts: `Posts: ${sections.length + 1} standard + ${run.corners.length} corner + derived end posts`,
      sections: sectionRows,
    };
  }) ?? [];
  const saveJobLabel = jobName.trim() ? `Save ${jobName.trim()}` : "Save Job";
  const animatedGrandTotal = useAnimatedNumber(
    activeBomSummary?.grandTotal ?? bomResultForTabs?.grandTotal ?? 0,
  );
  const showIntro = !payload && !introDismissed;
  const gateTargetRun = gatePositionTarget
    ? payload?.runs.find((run) => run.runId === gatePositionTarget.runId)
    : undefined;
  const gateTargetRunLength = gateTargetRun ? runLengthMm(gateTargetRun) : 0;

  return (
    <AppShell>
      {gatePositionTarget && gateTargetRunLength > 0 && (
        <GatePositionModal
          gateLabel={gatePositionTarget.kind.replace("_", " ")}
          runLengthMm={gateTargetRunLength}
          widthMm={gatePositionTarget.widthMm ?? 1000}
          onClose={() => setGatePositionTarget(null)}
          onConfirm={(distance) => handleConfirmGatePosition(gatePositionTarget, distance)}
        />
      )}
      {showIntro ? (
        <div className="relative min-h-full overflow-hidden bg-brand-bg text-brand-text">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.35),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.28),transparent_24%),radial-gradient(circle_at_50%_80%,rgba(245,158,11,0.18),transparent_30%)]" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
          <div className="relative mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center gap-8 px-5 py-12 text-center">
            <div className="space-y-8">
              <GlassOutletLogo
                className="justify-center text-brand-primary"
                iconClassName="h-20 w-24 sm:h-24 sm:w-28 lg:h-28 lg:w-32"
                textClassName="text-5xl sm:text-7xl lg:text-8xl"
              />
              <form
                className="mx-auto w-full max-w-xl rounded-3xl border border-brand-border/70 bg-brand-card/80 p-5 text-left shadow-2xl backdrop-blur"
                onSubmit={(event) => {
                  event.preventDefault();
                  startWorkspaceFromLanding();
                }}
              >
                <JobNameEditor
                  value={jobName}
                  onChange={setJobName}
                  onCommit={startWorkspaceFromLanding}
                  autoFocus
                  inputClassName="rounded-2xl px-4 py-3 text-center text-xl font-semibold"
                  textClassName="mx-auto text-center text-xl font-semibold"
                />
                <button
                  type="submit"
                  disabled={!jobName.trim()}
                  className="mt-4 w-full rounded-lg bg-brand-primary px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-primary/90 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Enter
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            className={`${mapExpanded ? "fixed inset-0 z-50" : "relative"} flex h-full min-h-0 flex-col overflow-hidden bg-brand-bg md:flex-row`}
          >
            <aside
              className={`relative w-full overflow-hidden border-b border-brand-border bg-brand-card md:min-h-0 md:max-h-none md:shrink-0 md:border-b-0 md:border-r ${mapExpanded || (mobileLayout && mobileTab !== "run") ? "hidden" : "flex"
                } ${bomResultForTabs ? "max-h-[32vh]" : "min-h-[46vh]"
                }`}
              style={mobileLayout ? undefined : { width: runPaneWidth }}
            >
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-5">
                  <section className="-mx-3 border-b border-brand-border/70 bg-brand-card/95 px-3 pb-3 pt-3 shadow-sm sm:-mx-5 sm:px-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <JobNameEditor
                          value={jobName}
                          onChange={setJobName}
                          inputClassName="mb-1"
                          textClassName="mb-1"
                        />
                      </div>
                    </div>
                    {payload ? (
                      <DescribeFenceBox
                        title="Describe your fence"
                        compact
                        initialDescription={payload?.job?.description ?? ""}
                        onApply={handleApplyDescription}
                      />
                    ) : null}
                  </section>
                  {payload && (
                    <>
                      <hr className="border-brand-border/60" />
                      <section>
                        <RunListV3
                          autoOpenFirstRunId={autoOpenFirstSectionRunId}
                          onAutoOpenConsumed={() => setAutoOpenFirstSectionRunId(null)}
                        />
                      </section>

                      {payload.job?.pendingGates?.length ? (
                        <section className="space-y-2 rounded-2xl border border-brand-warning/35 bg-brand-warning/10 p-3">
                          <p className="text-xs font-black uppercase tracking-wide text-brand-warning">
                            Parsed gates need positions
                          </p>
                          {payload.job.pendingGates.map((gate, index) => {
                            const run = payload.runs.find((item) => item.runId === gate.runId);
                            const length = run ? runLengthMm(run) : 0;
                            return (
                              <button
                                key={gate.id}
                                type="button"
                                onClick={() => setGatePositionTarget(gate)}
                                disabled={length <= 0}
                                className="flex w-full items-center justify-between gap-3 rounded-lg border border-brand-warning/40 bg-brand-card px-3 py-2 text-left text-xs font-bold text-brand-warning transition-colors hover:border-brand-primary hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
                                title={length <= 0 ? "Add a run length before positioning this gate." : "Position this parsed gate in the run"}
                              >
                                <span>Position not set - drag in run</span>
                                <span>
                                  Gate {index + 1}: {gate.kind.replace("_", " ")}
                                  {gate.widthMm ? `, ${gate.widthMm}mm` : ""}
                                </span>
                              </button>
                            );
                          })}
                        </section>
                      ) : null}

                      {(errors.length > 0 || warnings.length > 0) && (
                        <div className="space-y-2">
                          {errors.map((e, i) => (
                            <div
                              key={i}
                              className="rounded-lg border border-brand-danger/30 bg-brand-danger/10 px-4 py-2 text-sm text-brand-danger"
                            >
                              Error: {e}
                            </div>
                          ))}
                          {warnings.map((w, i) => (
                            <div
                              key={i}
                              className="rounded-lg border border-brand-warning/30 bg-brand-warning/10 px-4 py-2 text-sm text-brand-warning"
                            >
                              Warning: {w}
                            </div>
                          ))}
                        </div>
                      )}

                      {economySlatErrors.length > 0 && (
                        <div className="space-y-2">
                          {economySlatErrors.map((message) => (
                            <div
                              key={message}
                              className="rounded-lg border border-brand-danger/30 bg-brand-danger/10 px-4 py-2 text-sm font-bold text-brand-danger"
                            >
                              {message}
                            </div>
                          ))}
                        </div>
                      )}

                      {(gateWidthErrors.length > 0 || gateWidthWarnings.length > 0) && (
                        <div className="space-y-2">
                          {gateWidthErrors.map((item) => (
                            <div
                              key={`${item.runId}-${item.segmentId}`}
                              className="rounded-lg border border-brand-danger/30 bg-brand-danger/10 px-4 py-2 text-sm font-bold text-brand-danger"
                            >
                              {item.message}
                            </div>
                          ))}
                          {gateWidthWarnings.map((item) => (
                            <div
                              key={`${item.runId}-${item.segmentId}`}
                              className="rounded-lg border border-brand-warning/30 bg-brand-warning/10 px-4 py-2 text-sm font-bold text-brand-warning"
                            >
                              {item.message ?? `Gate width is over the ${gateTypeLabel(item.gateType)} maximum.`}
                            </div>
                          ))}
                        </div>
                      )}

                      {bomMutation.isError && (
                        <div className="rounded-lg border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
                          Error:{" "}
                          {bomMutation.error instanceof Error
                            ? bomMutation.error.message
                            : String(bomMutation.error)}
                        </div>
                      )}

                    </>
                  )}
                </div>
                <div className="border-t border-brand-border bg-brand-card p-3 pb-24 sm:p-5 md:pb-5">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSaveJob}
                      disabled={!payload || saving}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-primary/90 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {saveJobLabel}
                    </button>
                    <ConfirmButton
                      onConfirm={() => setClearJobDialogOpen(true)}
                      disabled={!payload && !jobName}
                      confirmLabel={<><Trash2 size={16} /> Click again to confirm</>}
                      className="inline-flex items-center gap-2 rounded-lg border border-brand-danger/30 px-3 py-2 text-sm font-bold text-brand-danger transition-colors hover:bg-brand-danger/10 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={16} />
                      Clear Job
                    </ConfirmButton>
                    <button
                      type="button"
                      onClick={handleGenerateBOMFromFooter}
                      disabled={bomMutation.isPending || hasBlockingErrors || noSegments}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-primary/90 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {bomMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Generate BOM
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            <button
              type="button"
              aria-label="Resize panels"
              onMouseDown={handleResizeStart}
              className="hidden w-1.5 shrink-0 cursor-col-resize bg-brand-border/60 transition-colors hover:bg-brand-primary/40 md:block"
            />

            <main
              data-print-bom-main
              className={`min-h-0 min-w-0 flex-1 overflow-y-auto ${mapExpanded ? "p-0" : "p-3 pb-24 sm:p-5 lg:p-8"} ${mobileLayout && mobileTab === "run" ? "hidden" : ""
                }`}
            >
              <div className={`${mapExpanded ? "mx-0 max-w-none space-y-0" : "w-full space-y-4 sm:space-y-5"}`}>
                <section className={`overflow-hidden border border-brand-border/60 bg-brand-card ${mapExpanded ? "rounded-xl" : "rounded-2xl"}`}>
                  {!mapExpanded && (
                    <RightPaneTabs
                      activeView={rightPaneView}
                      onChange={handleRightPaneChange}
                    />
                  )}
                  <div className={`${rightPaneView === "map" ? "block" : "hidden"} ${mapExpanded ? "p-2" : "p-3 sm:p-4"}`}>
                    <div
                      data-print-map-panel
                      className="block"
                    >
                      {payload ? (
                        <LayoutCanvasV3
                          mapExpanded={mapExpanded}
                          onMapExpandedChange={setMapExpanded}
                          showRunDetails={!mapExpanded}
                          jobName={jobName}
                        />
                      ) : (
                        <div className="rounded-2xl border border-dashed border-brand-border bg-brand-bg/50 p-6 text-center text-sm font-bold text-brand-muted">
                          Start from the sidebar, then draw the layout here.
                        </div>
                      )}
                    </div>
                  </div>
                </section>
                <section data-print-bom-section className={`rounded-2xl border border-brand-border/60 bg-brand-card p-3 sm:p-5 ${rightPaneView === "bom" && !mapExpanded ? "block" : "hidden"}`}>
                  <div className="mb-4 flex flex-col gap-4 border-b border-brand-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <GlassOutletLogo
                          className="text-brand-primary"
                          iconClassName="h-10 w-12"
                          textClassName="text-2xl"
                        />
                        <div className="h-10 w-px bg-brand-border" />
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-muted">
                          Bill of Materials
                        </p>
                      </div>
                      {jobName.trim() && (
                        <JobNameEditor
                          value={jobName}
                          onChange={setJobName}
                          className="mt-2"
                          textClassName="px-0 text-4xl font-black leading-tight"
                          inputClassName="max-w-xl"
                        />
                      )}
                      {summaryText && (
                        <p className="mt-2 max-w-3xl text-sm font-semibold text-brand-text">
                          {summaryText}
                        </p>
                      )}
                      {payload?.job?.description && (
                        <p className="mt-1 max-w-3xl text-xs font-semibold text-brand-muted">
                          Original description: {payload.job.description}
                        </p>
                      )}
                    </div>
                    <div className="text-left sm:text-right" data-print-hide>
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">
                        {activeBomSummary?.label ?? (bomResultForTabs ? "Auto quantity breaks" : "Estimated total")}
                      </p>
                      <p className="font-mono text-4xl font-black tabular-nums text-brand-primary sm:text-5xl">
                        ${formatMoney(animatedGrandTotal)}
                      </p>
                    </div>
                  </div>
                  <div className="mb-4 flex flex-wrap items-center gap-2" data-print-hide>
                    <button
                      type="button"
                      onClick={handleGenerateBOM}
                      disabled={bomMutation.isPending || hasBlockingErrors || noSegments}
                      title="Generate BOM (Ctrl+Enter)"
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-primary/90 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {bomMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Generate BOM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBomSummary(null);
                        dispatch({ type: "CLEAR_BOM_RESULT" });
                      }}
                      disabled={!bomResultForTabs}
                      className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-sm font-bold text-brand-muted transition-colors hover:border-brand-danger/50 hover:text-brand-danger hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FileX2 size={16} />
                      Clear BOM
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintBom}
                      disabled={!bomResultForTabs}
                      title="Export CSV (Ctrl+E)"
                      className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-sm font-bold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Printer size={16} />
                      Print BOM
                    </button>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-sm font-bold text-brand-muted">
                      <input
                        type="checkbox"
                        checked={includeMapInBomPrint}
                        onChange={(event) => setIncludeMapInBomPrint(event.target.checked)}
                        className="accent-brand-primary"
                      />
                      Include map
                    </label>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      disabled={!bomResultForTabs}
                      className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-sm font-bold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Download size={16} />
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => setShortcutsOpen(true)}
                      title="Keyboard shortcuts (?)"
                      className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-sm font-bold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary hover:shadow-sm"
                    >
                      <Keyboard size={16} />
                      Shortcuts
                    </button>
                  </div>

                  {bomMutation.isPending ? (
                    <div className="space-y-3" aria-label="Generating BOM">
                      {Array.from({ length: 7 }).map((_, index) => (
                        <div
                          key={index}
                          className="grid gap-3 rounded-xl border border-brand-border/60 bg-brand-bg/50 p-3 sm:grid-cols-[8rem_1fr_5rem_6rem]"
                        >
                          <span className="h-4 animate-pulse rounded bg-brand-border/70" />
                          <span className="h-4 animate-pulse rounded bg-brand-border/60" />
                          <span className="h-4 animate-pulse rounded bg-brand-border/50" />
                          <span className="h-4 animate-pulse rounded bg-brand-border/50" />
                        </div>
                      ))}
                    </div>
                  ) : bomResultForTabs && !hasBlockingErrors ? (
                    <>
                      {bomRunDetails.length > 0 && (
                        <div className="mb-5 space-y-3 rounded-2xl border border-brand-border/70 bg-brand-bg/45 p-3 print:border-slate-300 print:bg-white">
                          {bomRunDetails.map((runDetail) => (
                            <section key={runDetail.hero} className="space-y-2">
                              <p className="text-sm font-black text-brand-text print:text-black">
                                {runDetail.hero}
                              </p>
                              <div className="grid gap-x-4 gap-y-1 text-xs font-semibold text-brand-muted sm:grid-cols-2 print:text-slate-700">
                                {runDetail.settings.map((setting) => (
                                  <span key={setting}>{setting}</span>
                                ))}
                                <span className="font-bold text-brand-text print:text-black">{runDetail.posts}</span>
                              </div>
                              <div className="space-y-1 pl-3 text-xs font-semibold text-brand-muted print:text-slate-700">
                                {runDetail.sections.map((section) => (
                                  <div key={section.label}>
                                    <p className="font-bold text-brand-text print:text-black">{section.label}</p>
                                    {section.overrides.length > 0 && (
                                      <p>overrides: {section.overrides.join(", ")}</p>
                                    )}
                                    {section.gates.map((gate) => (
                                      <p key={gate} className="pl-3 text-brand-warning print:text-slate-700">
                                        {gate}
                                      </p>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                      )}
                      <BOMResultTabs
                        result={bomResultForTabs}
                        editable
                        onQuantityChange={(item, quantity) =>
                          setLineEdits((prev) => ({
                            ...prev,
                            [lineKey(item)]: quantity <= 0 ? null : quantity,
                          }))
                        }
                        onRemoveLine={(item) =>
                          setLineEdits((prev) => ({
                            ...prev,
                            [lineKey(item)]: null,
                          }))
                        }
                        onSwitchEconomyToStandard={handleSwitchEconomyToStandard}
                        onActiveSummaryChange={handleActiveBomSummaryChange}
                      />
                      <div data-print-hide>
                        <ExtraItemsPanel
                          items={extraItems}
                          onAdd={(item) => setExtraItems((prev) => [...prev, item])}
                          onRemove={(id) =>
                            setExtraItems((prev) => prev.filter((i) => i.id !== id))
                          }
                        />
                      </div>
                      <div data-print-hide>
                        <SuggestedAccessoriesPanel
                          suggestions={suggestedAccessories}
                          addedItems={extraItems}
                          onAdd={(item) =>
                            setExtraItems((prev) =>
                              prev.some((existing) => (existing.sku ?? existing.id) === (item.sku ?? item.id))
                                ? prev
                                : [...prev, item],
                            )
                          }
                          onRemove={(id) =>
                            setExtraItems((prev) => prev.filter((item) => item.id !== id))
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-brand-border bg-brand-bg/60 px-5 py-12 text-center">
                      <p className="mx-auto max-w-xl text-base font-black italic text-brand-muted sm:text-lg">
                        Choose fence type on left or click the map button above to draw your fence in plan view
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </main>

          </div>
          {mobileLayout && !mapExpanded && (
            <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-brand-border bg-brand-card/95 p-2 shadow-2xl backdrop-blur md:hidden">
              {([
                ["run", "Run"],
                ["bom", "BOM"],
                ["map", "Map"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setMobileTab(id);
                    if (id === "map") {
                      if (!payload) {
                        dispatch({ type: "SET_PAYLOAD", payload: createInitialPayload("QSHS") });
                        dispatch({ type: "SET_ENTRY_METHOD", entryMethod: "draw" });
                      }
                      setIntroDismissed(true);
                      setRightPaneView("map");
                    } else if (id === "bom") {
                      setRightPaneView("bom");
                      setMapExpanded(false);
                    } else {
                      setRightPaneView("bom");
                      setMapExpanded(false);
                    }
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-extrabold transition-colors ${mobileTab === id
                    ? "bg-brand-primary text-white"
                    : "text-brand-muted hover:bg-brand-border/40 hover:text-brand-text"
                    }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          )}
          {clearJobDialogOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Save current job before clearing"
              onClick={() => setClearJobDialogOpen(false)}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-card p-5 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 className="text-lg font-black text-brand-text">
                  Save the current job before clearing?
                </h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-brand-muted">
                  Save a local browser copy, clear without saving, or cancel and keep working.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      saveCurrentJobLocallyBeforeClear();
                      clearToFreshWorkspace();
                    }}
                    className="rounded-lg bg-brand-primary px-3 py-2 text-sm font-black text-white transition-colors hover:bg-brand-primary/90"
                  >
                    Save & clear
                  </button>
                  <button
                    type="button"
                    onClick={clearToFreshWorkspace}
                    className="rounded-lg border border-brand-danger/40 px-3 py-2 text-sm font-black text-brand-danger transition-colors hover:bg-brand-danger/10"
                  >
                    Clear without saving
                  </button>
                  <button
                    type="button"
                    onClick={() => setClearJobDialogOpen(false)}
                    className="rounded-lg border border-brand-border px-3 py-2 text-sm font-black text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          {shortcutsOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Keyboard shortcuts"
              onClick={() => setShortcutsOpen(false)}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-card p-5 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-base font-extrabold text-brand-text">
                    Keyboard shortcuts
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShortcutsOpen(false)}
                    className="rounded-lg p-1 text-brand-muted hover:bg-brand-border/40 hover:text-brand-text"
                    aria-label="Close shortcuts"
                  >
                    <X size={16} />
                  </button>
                </div>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-brand-muted">Generate BOM</dt>
                    <dd className="rounded-lg bg-brand-bg px-2 py-1 font-mono text-brand-text">
                      Ctrl + Enter
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-brand-muted">Export CSV</dt>
                    <dd className="rounded-lg bg-brand-bg px-2 py-1 font-mono text-brand-text">
                      Ctrl + E
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-brand-muted">Open this panel</dt>
                    <dd className="rounded-lg bg-brand-bg px-2 py-1 font-mono text-brand-text">
                      ?
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-brand-muted">Canvas undo</dt>
                    <dd className="rounded-lg bg-brand-bg px-2 py-1 font-mono text-brand-text">
                      Ctrl + Z
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

export function CalculatorV3Page() {
  return (
    <CalculatorProvider>
      <FenceConfigProvider>
        <GateProvider>
          <CalculatorV3Content />
        </GateProvider>
      </FenceConfigProvider>
    </CalculatorProvider>
  );
}
