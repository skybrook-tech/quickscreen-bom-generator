import { useRef, useEffect, useCallback, useState, useMemo, type MouseEvent as ReactMouseEvent } from "react";
import { initCanvasEngine } from "./canvasEngine";
import { CanvasToolbar } from "./CanvasToolbar";
import { MapControls } from "./MapControls";
import type { MapUiState } from "./MapControls";
import { HelpCheatSheet } from "./HelpCheatSheet";
import NumberInput from "../shared/NumberInput";
import { useFenceConfig } from "../../context/FenceConfigContext";
import { useGates } from "../../context/GateContext";
import { useProducts } from "../../hooks/useProducts";
import type { GateConfig } from "../../schemas/gate.schema";
import type {
  CanvasGateSlidingSide,
  CanvasGateType,
  CanvasGateVariables,
  CanvasGateVisual,
  CanvasLayout,
  CanvasRunSummary,
} from "./canvasEngine";
import type { PostPosition } from "../../types/bom.types";
import { GATE_SEGMENT_STUB_KEYS } from "../../lib/segmentTermination";
import {
  defaultGateBuildForMovement,
  defaultGateVariables,
  DROP_BOLT_OPTIONS,
  GATE_STOP_OPTIONS,
  HINGE_OPTIONS,
  LATCH_OPTIONS,
  SLIDING_CATCH_OPTIONS,
  SLIDING_GUIDE_OPTIONS,
  SLIDING_TRACK_OPTIONS,
  type GateMovement,
} from "../../lib/gateOptionRules";

const DEFAULT_GATE_WIDTH_FALLBACK = 900;
type CanvasTool = "draw" | "gate" | "move" | "boundary" | "building" | "text" | "post" | "pillar" | "freehand";
type GateSessionRef = { flatSegIdx: number; gateIdx: number; gateId: string };
type GateDraft = {
  widthMM: number;
  useTerminationPosts: boolean;
  variables: CanvasGateVariables;
};

const COLOUR_OPTIONS = [
  ["B", "Black Satin"],
  ["MN", "Monument Matt"],
  ["G", "Woodland Grey Matt"],
  ["SM", "Surfmist Matt"],
  ["W", "Pearl White Gloss"],
  ["BS", "Basalt Satin"],
  ["D", "Dune Satin"],
  ["M", "Mill"],
] as const;

function movementFromCanvasType(gateType: CanvasGateType): GateMovement {
  if (gateType === "sliding") return "sliding";
  if (gateType === "double-swing") return "double_swing";
  return "single_swing";
}

function canvasTypeFromMovement(value: unknown): CanvasGateType {
  if (value === "sliding") return "sliding";
  if (value === "double_swing") return "double-swing";
  return "single-swing";
}

function createGateDraft(overrides: Partial<GateDraft> = {}): GateDraft {
  const variables = {
    ...defaultGateVariables({}, 1800),
    ...(overrides.variables ?? {}),
  } as CanvasGateVariables;
  return {
    widthMM: overrides.widthMM ?? DEFAULT_GATE_WIDTH_FALLBACK,
    useTerminationPosts: overrides.useTerminationPosts ?? true,
    variables,
  };
}

function gateVisualFromDraft(draft: GateDraft): CanvasGateVisual & { widthMM: number } {
  const gateType = canvasTypeFromMovement(draft.variables[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  return {
    gateType,
    widthMM: draft.widthMM,
    swingDirection: String(
      draft.variables[GATE_SEGMENT_STUB_KEYS.openingDirection] ??
        (gateType === "sliding" ? "right" : "out"),
    ) as CanvasGateVisual["swingDirection"],
    slidingSide: String(
      draft.variables[GATE_SEGMENT_STUB_KEYS.slidingSide] ?? "front",
    ) as CanvasGateSlidingSide,
    variables: draft.variables,
  };
}

function legacyGateConfigFromDraft(gateId: string, draft: GateDraft): GateConfig {
  const gateType = canvasTypeFromMovement(draft.variables[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  return {
    id: gateId,
    qty: 1,
    gateType,
    openingWidth: draft.widthMM,
    gateHeight:
      draft.variables[GATE_SEGMENT_STUB_KEYS.matchRunHeight] === false
        ? Number(draft.variables[GATE_SEGMENT_STUB_KEYS.gateHeightMm] ?? 1800)
        : "match-fence",
    colour: "match-fence",
    slatGap: "match-fence",
    slatSize: "match-fence",
    gatePostSize: "65x65",
    hingeType: "dd-kwik-fit-adjustable",
    latchType: "dd-magna-latch-top-pull",
    swingDirection: String(
      draft.variables[GATE_SEGMENT_STUB_KEYS.openingDirection] ??
        (gateType === "sliding" ? "right" : "out"),
    ) as GateConfig["swingDirection"],
  };
}

interface FenceLayoutCanvasProps {
  onApplied?: (layout: CanvasLayout) => void;
  onLayoutChange?: (layout: CanvasLayout) => void;
  onEngineReady?: (engine: ReturnType<typeof initCanvasEngine>) => void;
  postPositions?: PostPosition[] | null;
  /** Per-segment max panel widths (flat array matching non-boundary segment order). Used for live post preview. */
  segmentPanelWidths?: number[];
  /** Job-level default panel width (mm). Used for the in-progress draw preview. */
  jobPanelWidth?: number;
  allowedAngles?: number[];
  /** Pre-computed stats text from calcRunStats — keeps canvas overlay in sync with form. */
  runStatsTexts?: { global: string; perRun: string[] };
  gateVisuals?: Record<string, CanvasGateVisual>;
  /** Job name shown in printed map header. */
  jobName?: string;
  /** Controlled expanded state. When provided, the parent drives expansion. */
  expanded?: boolean;
  /** Called when the expand toggle is triggered internally. */
  onExpandedChange?: (expanded: boolean) => void;
}

export function FenceLayoutCanvas({
  onLayoutChange,
  onEngineReady,
  postPositions,
  segmentPanelWidths,
  jobPanelWidth,
  allowedAngles: allowedAnglesProp,
  runStatsTexts,
  gateVisuals = {},
  jobName,
  expanded: expandedProp,
  onExpandedChange,
}: FenceLayoutCanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ReturnType<typeof initCanvasEngine> | null>(null);
  const { state: fenceState } = useFenceConfig();
  const { data: products } = useProducts();
  const { gates, dispatch: gateDispatch } = useGates();

  // Ref-wrap onLayoutChange so the engine (initialised once) always calls the current prop.
  // Without this, the closure captured at initCanvasEngine time goes stale when the parent
  // re-renders with a new handleLiveSync that closes over updated payload variables.
  const onLayoutChangeRef = useRef(onLayoutChange);
  useEffect(() => { onLayoutChangeRef.current = onLayoutChange; });

  // allowedAngles prop takes priority; fallback to product metadata lookup (v1 path)
  const allowedAngles = useMemo(() => {
    if (allowedAnglesProp !== undefined) return allowedAnglesProp;
    const product = products?.find(
      (p) => p.system_type === fenceState.systemType,
    );
    return product?.metadata?.allowedAngles ?? [];
  }, [allowedAnglesProp, products, fenceState.systemType]);

  const [activeTool, setActiveTool] = useState<CanvasTool>(
    "draw",
  );
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gateSnap100, setGateSnap100] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [expandedInternal, setExpandedInternal] = useState(false);
  const expanded = expandedProp !== undefined ? expandedProp : expandedInternal;
  const setExpanded = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(expanded) : v;
    setExpandedInternal(next);
    onExpandedChange?.(next);
  }, [expanded, onExpandedChange]);
  const [orthoEnabled, setOrthoEnabled] = useState(false);
  const [freehandStyle, setFreehandStyleState] = useState({
    color: "rgba(14,165,233,0.9)",
    width: 3,
    lineStyle: "solid" as "solid" | "dashed" | "dotted",
    opacity: 0.95,
    arrow: false,
  });
  const handleFreehandStyleChange = useCallback((style: Partial<typeof freehandStyle>) => {
    setFreehandStyleState((prev) => {
      const next = { ...prev, ...style };
      engineRef.current?.setFreehandStyle(next);
      return next;
    });
  }, []);
  const [runSummaries, setRunSummaries] = useState<CanvasRunSummary[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [boundaryHintVisible, setBoundaryHintVisible] = useState(false);
  const [mapUiState, setMapUiState] = useState<MapUiState>({
    mapType: "satellite",
    hasAddress: false,
    hasLoadedMap: false,
    calibrationLabel: "",
  });

  const [gateDialogOpen, setGateDialogOpen] = useState(false);
  const [gateDraft, setGateDraft] = useState<GateDraft>(() => createGateDraft());
  const gateDraftRef = useRef(gateDraft);
  const [activeGateRef, setActiveGateRef] = useState<GateSessionRef | null>(null);
  const [sessionGateRefs, setSessionGateRefs] = useState<GateSessionRef[]>([]);
  const [gateDialogPosition, setGateDialogPosition] = useState(() => ({
    left: typeof window === "undefined" ? 960 : Math.max(12, window.innerWidth - 430),
    top: 150,
  }));

  useEffect(() => {
    gateDraftRef.current = gateDraft;
  }, [gateDraft]);

  const handleToolChange = useCallback((tool: CanvasTool) => {
    setActiveTool(tool);
    if (tool === "gate") {
      setGateDialogOpen(true);
      setActiveGateRef(null);
      setSessionGateRefs([]);
    }
    if (
      tool === "boundary" &&
      window.localStorage.getItem("qsbom.boundaryHintSeen") !== "true"
    ) {
      setBoundaryHintVisible(true);
      window.localStorage.setItem("qsbom.boundaryHintSeen", "true");
    }
  }, []);

  const handleGatePlaced = useCallback(
    (
      flatSegIdx: number,
      gateIdx: number,
      _defaultWidthMM: number,
    ) => {
      const gateId = crypto.randomUUID();
      const draft = gateDraftRef.current;
      const visual = gateVisualFromDraft(draft);
      engineRef.current?.setGateId(flatSegIdx, gateIdx, gateId);
      engineRef.current?.updateGateWidth(flatSegIdx, gateIdx, draft.widthMM);
      engineRef.current?.updateGateVisual(flatSegIdx, gateIdx, visual);
      engineRef.current?.setGateVariables(flatSegIdx, gateIdx, draft.variables);
      engineRef.current?.setGateTerminationPosts(flatSegIdx, gateIdx, draft.useTerminationPosts);
      gateDispatch({
        type: "ADD_GATE",
        gate: {
          ...legacyGateConfigFromDraft(gateId, draft),
          useGatePostsAsFenceTermination: draft.useTerminationPosts,
        } as GateConfig,
      });
      const placed = { flatSegIdx, gateIdx, gateId };
      setActiveGateRef(placed);
      setSessionGateRefs((refs) => [...refs, placed]);
      setGateDialogOpen(true);
    },
    [gateDispatch],
  );

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = initCanvasEngine(canvasRef.current, {
      snapToGrid: true,
      gridSize: 20,
      showGrid: true,
      allowedAngles,
      onGatePlaced: handleGatePlaced,
      onLayoutChange: (layout) => {
        setRunSummaries(layout.runs);
        onLayoutChangeRef.current?.(layout);
      },
      onGateEdit: (flatSegIdx, gateIdx, gateId, currentWidthMM, gate) => {
        setGateDraft(createGateDraft({
          widthMM: currentWidthMM,
          useTerminationPosts: gate?.useGatePostsAsFenceTermination ?? true,
          variables: gate?.variables,
        }));
        setActiveGateRef(gateId ? { flatSegIdx, gateIdx, gateId } : null);
        setSessionGateRefs([]);
        setGateDialogOpen(true);
        engine.setTool("gate");
        setActiveTool("gate");
      },
    });
    engineRef.current = engine;
    onEngineReady?.(engine);

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleGatePlaced]);

  useEffect(() => {
    engineRef.current?.setAllowedAngles(allowedAngles);
  }, [allowedAngles]);


  // Sync showGrid state to engine
  useEffect(() => {
    engineRef.current?.setShowGrid(showGrid);
  }, [showGrid]);

  useEffect(() => {
    engineRef.current?.setGateSnapTo100mm(gateSnap100);
  }, [gateSnap100]);

  // Sync postPositions prop into the canvas engine
  useEffect(() => {
    engineRef.current?.setPostPositions(postPositions ?? null);
  }, [postPositions]);

  // Sync segmentPanelWidths prop into the canvas engine for live post preview
  useEffect(() => {
    engineRef.current?.setSegmentPanelWidths(segmentPanelWidths ?? []);
  }, [segmentPanelWidths]);

  // Sync jobPanelWidth prop into the canvas engine for in-progress segment post preview
  useEffect(() => {
    engineRef.current?.setJobPanelWidth(jobPanelWidth ?? null);
  }, [jobPanelWidth]);

  // Sync pre-computed run stats text into the engine overlay (shared with RunCard)
  useEffect(() => {
    if (!runStatsTexts) return;
    engineRef.current?.setRunStatsTexts(runStatsTexts.global, runStatsTexts.perRun);
  }, [runStatsTexts]);

  useEffect(() => {
    engineRef.current?.setGateVisuals(
      {
        ...gateVisuals,
        ...Object.fromEntries(
          gates.map((gate) => [
            gate.id,
            {
              gateType: gate.gateType,
              swingDirection: gate.swingDirection,
              slidingSide: "front",
            },
          ]),
        ),
      },
    );
  }, [gateVisuals, gates]);

  useEffect(() => {
    const visual = gateVisualFromDraft(gateDraft);
    engineRef.current?.setPendingGatePlacement(visual);
    if (!activeGateRef) return;
    engineRef.current?.updateGateWidth(
      activeGateRef.flatSegIdx,
      activeGateRef.gateIdx,
      gateDraft.widthMM,
    );
    engineRef.current?.updateGateVisual(
      activeGateRef.flatSegIdx,
      activeGateRef.gateIdx,
      visual,
    );
    engineRef.current?.setGateVariables(
      activeGateRef.flatSegIdx,
      activeGateRef.gateIdx,
      gateDraft.variables,
    );
    engineRef.current?.setGateTerminationPosts(
      activeGateRef.flatSegIdx,
      activeGateRef.gateIdx,
      gateDraft.useTerminationPosts,
    );
    gateDispatch({
      type: "UPDATE_GATE",
      id: activeGateRef.gateId,
      updates: {
        ...legacyGateConfigFromDraft(activeGateRef.gateId, gateDraft),
        useGatePostsAsFenceTermination: gateDraft.useTerminationPosts,
      } as Partial<GateConfig>,
    });
  }, [activeGateRef, gateDispatch, gateDraft]);

  useEffect(() => {
    const handler = (event: Event) => {
      const label = (event as CustomEvent<string | null>).detail ?? null;
      engineRef.current?.setHighlightedMapLabel(label);
    };
    window.addEventListener("qsbom:hover-map-label", handler);
    return () => window.removeEventListener("qsbom:hover-map-label", handler);
  }, []);

  // When expanded changes, trigger a window resize event so the engine's
  // internal onResize handler picks up the new canvas CSS height.
  useEffect(() => {
    window.dispatchEvent(new Event("resize"));
  }, [expanded]);

  function updateGateVariable(key: string, value: string | number | boolean) {
    setGateDraft((draft) => ({
      ...draft,
      variables: {
        ...draft.variables,
        [key]: value,
      },
    }));
  }

  function setGateMovement(gateType: CanvasGateType) {
    const movement = movementFromCanvasType(gateType);
    setGateDraft((draft) => ({
      ...draft,
      variables: {
        ...draft.variables,
        [GATE_SEGMENT_STUB_KEYS.gateMovement]: movement,
        [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovement(movement),
        [GATE_SEGMENT_STUB_KEYS.leafCount]: movement === "double_swing" ? 2 : 1,
        [GATE_SEGMENT_STUB_KEYS.openingDirection]:
          movement === "sliding" ? "right" : "out",
      },
    }));
  }

  function handleGateDialogSave() {
    setGateDialogOpen(false);
    setActiveGateRef(null);
    setSessionGateRefs([]);
    engineRef.current?.setTool("move");
    setActiveTool("move");
  }

  function handleGateDialogCancel() {
    const ids = sessionGateRefs.map((ref) => ref.gateId);
    engineRef.current?.removeGatesById(ids);
    ids.forEach((id) => gateDispatch({ type: "REMOVE_GATE", id }));
    setGateDialogOpen(false);
    setActiveGateRef(null);
    setSessionGateRefs([]);
    engineRef.current?.setTool("move");
    setActiveTool("move");
  }

  function startGateDialogDrag(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = gateDialogPosition;
    const onMove = (moveEvent: MouseEvent) => {
      const maxLeft = Math.max(12, window.innerWidth - 420);
      const maxTop = Math.max(12, window.innerHeight - 560);
      setGateDialogPosition({
        left: Math.min(maxLeft, Math.max(12, start.left + moveEvent.clientX - startX)),
        top: Math.min(maxTop, Math.max(12, start.top + moveEvent.clientY - startY)),
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const handlePrintMap = useCallback(() => {
    const includeSatellite = engineRef.current?.hasSatelliteUnderlay()
      ? window.confirm("Include the satellite underlay on the printed map?")
      : false;
    engineRef.current?.printMap({ includeSatellite, jobName });
  }, []);

  // Totals across all runs
  const totalLengthM = runSummaries.reduce((s, r) => s + r.totalLengthM, 0);
  const totalCorners = runSummaries.reduce((s, r) => s + r.cornerCount, 0);
  const totalGates = runSummaries.reduce((s, r) => s + r.gates.length, 0);

  return (
    <div className="space-y-0">
      <div data-print-hide>
        <CanvasToolbar
          engineRef={engineRef}
          activeTool={activeTool}
          onToolChange={handleToolChange}
          snapEnabled={snapEnabled}
          onSnapToggle={setSnapEnabled}
          gateSnap100={gateSnap100}
          onGateSnap100Toggle={setGateSnap100}
          showGrid={showGrid}
          onToggleGrid={setShowGrid}
          expanded={expanded}
          onToggleExpand={setExpanded}
          orthoEnabled={orthoEnabled}
          onOrthoToggle={setOrthoEnabled}
          freehandStyle={freehandStyle}
          onFreehandStyleChange={handleFreehandStyleChange}
          onHelpOpen={() => setHelpOpen(true)}
          onPrintMap={handlePrintMap}
        />
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none bg-brand-bg"
          style={{ height: expanded ? "700px" : "630px", cursor: "crosshair" }}
        />

        {/* Hint overlay */}
        <div className="hidden">
          {activeTool === "draw" &&
            "Click to place points - double-click near the last point to finish - click a length label to edit"}
          {activeTool === "gate" &&
            "Click on a fence section to place a gate marker, then drag it along the line to fine-tune"}
          {activeTool === "move" &&
            "Drag nodes or gates to reposition · Click a label to edit length"}
          {activeTool === "boundary" &&
            "Draw non-product context lines (existing fences, walls, property lines) — not included in BOM"}
        </div>

        {/* Zoom hint */}
        <div className="hidden">
          Scroll = zoom · Right-drag = pan · Ctrl+Z = undo
        </div>
        {boundaryHintVisible && (
          <div className="absolute left-4 top-4 max-w-xs rounded-lg border border-brand-warning/40 bg-brand-card/95 p-3 text-xs text-brand-text shadow-md">
            <div className="font-semibold text-brand-warning">Boundary tool</div>
            <p className="mt-1 text-brand-muted">
              Draw existing fences, walls, or property lines for context. These
              do not appear in your BOM.
            </p>
            <button
              type="button"
              onClick={() => setBoundaryHintVisible(false)}
              className="mt-2 rounded-lg border border-brand-border px-2 py-1 font-semibold text-brand-muted hover:border-brand-primary hover:text-brand-text"
            >
              Got it
            </button>
          </div>
        )}

        {mapUiState.calibrationLabel && (
          <div className="absolute right-2 top-2 rounded-full border border-brand-success/40 bg-brand-card/95 px-3 py-1 text-xs font-semibold text-brand-success shadow-md pointer-events-none">
            Calibrated: {mapUiState.calibrationLabel}
          </div>
        )}
      </div>

      <div data-print-hide>
        <MapControls
          engineRef={engineRef}
          onMapUiStateChange={setMapUiState}
        />
      </div>

      {/* Run summary table */}
      {runSummaries.length > 0 && (
        <div className="border-t border-brand-border">
          <div className="space-y-2 bg-brand-card px-3 py-2 text-xs text-brand-text">
            {runSummaries.map((run) => (
              <div key={run.label} className="space-y-1">
                <div className="font-bold tabular-nums">
                  {run.label} · {run.totalLengthM.toFixed(2)}m
                  {run.gates.length > 0
                    ? ` · ${run.gates.length} gate${run.gates.length === 1 ? "" : "s"}`
                    : ""}
                </div>
                <div className="ml-5 space-y-0.5 text-brand-muted">
                  {(run.sections ?? []).map((section) => (
                    <div key={`${run.label}-${section.label}`} className="tabular-nums">
                      {section.label} · {section.lengthM.toFixed(2)}m · {section.panelCount} panel{section.panelCount === 1 ? "" : "s"} · {section.gateCount > 0 ? `${section.gateCount} gate${section.gateCount === 1 ? "" : "s"}` : "—"}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {runSummaries.length > 1 && (
              <div className="border-t border-brand-border/60 pt-1 font-bold tabular-nums">
                Total · {totalLengthM.toFixed(2)}m · {totalGates} gate{totalGates === 1 ? "" : "s"} · {totalCorners} corner{totalCorners === 1 ? "" : "s"}
              </div>
            )}
          </div>
        </div>
      )}

      {gateDialogOpen && (
        <div
          className="fixed z-50 w-[min(92vw,410px)] overflow-hidden rounded-xl border border-brand-border bg-brand-card shadow-2xl"
          style={{ left: gateDialogPosition.left, top: gateDialogPosition.top }}
          role="dialog"
          aria-modal="false"
          aria-label="Edit gate placement"
        >
          <div
            className="cursor-move border-b border-brand-border bg-brand-bg/80 px-4 py-3"
            onMouseDown={startGateDialogDrag}
          >
            <h2 className="text-sm font-black text-brand-text">Edit Gate</h2>
            <p className="mt-0.5 text-xs font-semibold text-brand-muted">
              Configure the gate, hover a fence line to preview, click to place. Save closes this panel.
            </p>
          </div>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
            <NumberInput
              label="Gate opening (mm)"
              min={400}
              max={6500}
              step={50}
              value={gateDraft.widthMM}
              onChange={(value) => setGateDraft((draft) => ({ ...draft, widthMM: Number(value) || DEFAULT_GATE_WIDTH_FALLBACK }))}
              className="mt-1 w-full bg-brand-bg text-brand-text"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-brand-text">
                Gate type
                <select
                  value={canvasTypeFromMovement(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.gateMovement])}
                  onChange={(event) => setGateMovement(event.target.value as CanvasGateType)}
                  className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                >
                  <option value="single-swing">Single swing</option>
                  <option value="double-swing">Double swing</option>
                  <option value="sliding">Sliding</option>
                </select>
              </label>

              <label className="block text-sm font-semibold text-brand-text">
                {canvasTypeFromMovement(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.gateMovement]) === "sliding" ? "Slide direction" : "Swing direction"}
                <select
                  value={String(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.openingDirection] ?? "out")}
                  onChange={(event) => updateGateVariable(GATE_SEGMENT_STUB_KEYS.openingDirection, event.target.value)}
                  className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                >
                  {canvasTypeFromMovement(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.gateMovement]) === "sliding" ? (
                    <>
                      <option value="left">Slide left</option>
                      <option value="right">Slide right</option>
                    </>
                  ) : (
                    <>
                      <option value="out">Swing out</option>
                      <option value="in">Swing in</option>
                    </>
                  )}
                </select>
              </label>
            </div>

            {canvasTypeFromMovement(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.gateMovement]) === "sliding" && (
              <label className="block text-sm font-semibold text-brand-text">
                Sliding side
                <select
                  value={String(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.slidingSide] ?? "front")}
                  onChange={(event) => updateGateVariable(GATE_SEGMENT_STUB_KEYS.slidingSide, event.target.value)}
                  className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                >
                  <option value="front">Front side of fence</option>
                  <option value="back">Back side of fence</option>
                </select>
              </label>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-sm font-semibold text-brand-text">
                Colour
                <select
                  value={String(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.colourCode] ?? "B")}
                  onChange={(event) => updateGateVariable(GATE_SEGMENT_STUB_KEYS.colourCode, event.target.value)}
                  className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                >
                  {COLOUR_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-brand-text">
                Slat size
                <select
                  value={String(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.slatSizeMm] ?? 65)}
                  onChange={(event) => updateGateVariable(GATE_SEGMENT_STUB_KEYS.slatSizeMm, Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                >
                  <option value="65">65mm</option>
                  <option value="90">90mm</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-brand-text">
                Gap
                <select
                  value={String(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.slatGapMm] ?? 9)}
                  onChange={(event) => updateGateVariable(GATE_SEGMENT_STUB_KEYS.slatGapMm, Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                >
                  <option value="5">5mm</option>
                  <option value="9">9mm</option>
                  <option value="20">20mm</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-brand-text">
                Gate height
                <input
                  type="number"
                  min={600}
                  max={2500}
                  step={50}
                  value={Number(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.gateHeightMm] ?? 1800)}
                  onChange={(event) => updateGateVariable(GATE_SEGMENT_STUB_KEYS.gateHeightMm, Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                />
              </label>
              <label className="block text-sm font-semibold text-brand-text">
                Gate post size
                <select
                  value={String(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.gatePostSizeMm] ?? 50)}
                  onChange={(event) => updateGateVariable(GATE_SEGMENT_STUB_KEYS.gatePostSizeMm, Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                >
                  <option value="50">50mm</option>
                  <option value="65">65mm</option>
                  <option value="75">75mm</option>
                  <option value="100">100mm</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-brand-text">
                Hinges
                <select
                  value={String(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.hingeType] ?? "TC-H-AT-HD-B")}
                  onChange={(event) => updateGateVariable(GATE_SEGMENT_STUB_KEYS.hingeType, event.target.value)}
                  className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                >
                  {HINGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-brand-text">
                Latch
                <select
                  value={String(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.latchType] ?? "LL-DL-KA")}
                  onChange={(event) => updateGateVariable(GATE_SEGMENT_STUB_KEYS.latchType, event.target.value)}
                  className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                >
                  {LATCH_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-brand-text">
                Drop bolt
                <select
                  value={String(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.dropBoltType] ?? "none")}
                  onChange={(event) => updateGateVariable(GATE_SEGMENT_STUB_KEYS.dropBoltType, event.target.value)}
                  className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                >
                  {DROP_BOLT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-brand-text">
                Gate stop
                <select
                  value={String(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.gateStopType] ?? "none")}
                  onChange={(event) => updateGateVariable(GATE_SEGMENT_STUB_KEYS.gateStopType, event.target.value)}
                  className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                >
                  {GATE_STOP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>

            {canvasTypeFromMovement(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.gateMovement]) === "sliding" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block text-sm font-semibold text-brand-text">
                  Track
                  <select value={String(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.slidingTrackType] ?? "XPSG-6000-TRACK-ST")} onChange={(event) => updateGateVariable(GATE_SEGMENT_STUB_KEYS.slidingTrackType, event.target.value)} className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30">
                    {SLIDING_TRACK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-brand-text">
                  Guide
                  <select value={String(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.slidingGuideType] ?? "XPSG-GUIDE")} onChange={(event) => updateGateVariable(GATE_SEGMENT_STUB_KEYS.slidingGuideType, event.target.value)} className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30">
                    {SLIDING_GUIDE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-brand-text">
                  Catch
                  <select value={String(gateDraft.variables[GATE_SEGMENT_STUB_KEYS.slidingCatchType] ?? "XPSG-CATCH-U")} onChange={(event) => updateGateVariable(GATE_SEGMENT_STUB_KEYS.slidingCatchType, event.target.value)} className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30">
                    {SLIDING_CATCH_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
            )}

            <label className="flex items-start gap-2 text-sm font-semibold text-brand-text">
              <input
                type="checkbox"
                checked={gateDraft.useTerminationPosts}
                onChange={(event) => setGateDraft((draft) => ({ ...draft, useTerminationPosts: event.target.checked }))}
                className="mt-0.5 accent-brand-accent"
              />
              <span>Use gate posts as fence termination posts</span>
            </label>
          </div>
          <div className="flex gap-2 border-t border-brand-border bg-brand-bg/70 p-4">
            <button type="button" onClick={handleGateDialogSave} className="flex-1 rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent-hover">Save</button>
            <button type="button" onClick={handleGateDialogCancel} className="rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-muted hover:text-brand-text">Cancel</button>
          </div>
        </div>
      )}

      <HelpCheatSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
