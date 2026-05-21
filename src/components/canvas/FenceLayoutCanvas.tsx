import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { initCanvasEngine } from "./canvasEngine";
import {
  CanvasToolbar,
  type CanvasGoogleMapType,
  type CanvasMapInteractionMode,
} from "./CanvasToolbar";
import { MapControls } from "./MapControls";
import type { MapUiState } from "./MapControls";
import { MapOverlayCanvasFrame } from "./MapOverlayCanvasFrame";
import { HelpCheatSheet } from "./HelpCheatSheet";
import { GateModal } from "../gate/GateModal";
import NumberInput from "../shared/NumberInput";
import { useFenceConfig } from "../../context/FenceConfigContext";
import { useGates } from "../../context/GateContext";
import { useProducts } from "../../hooks/useProducts";
import type { GateConfig } from "../../schemas/gate.schema";
import type {
  CanvasGateSlidingSide,
  CanvasGateType,
  CanvasGateVisual,
  CanvasLayout,
  CanvasRunSummary,
} from "./canvasEngine";
import type { PostPosition } from "../../types/bom.types";
import {
  ACTIVATE_CANVAS_DRAW_TOOL_EVENT,
  type ActivateCanvasDrawToolDetail,
} from "./canvasToolEvents";

interface PendingGate {
  stub: GateConfig;
  segIdx: number;
  gateIdx: number;
  slidingSide: CanvasGateSlidingSide;
}

const DEFAULT_GATE_WIDTH_FALLBACK = 900;
type CanvasTool = "draw" | "gate" | "move" | "boundary" | "building" | "text" | "post" | "pillar" | "freehand";

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
  propertyAnchor?: { lat: number; lng: number; address: string } | null;
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
  propertyAnchor,
}: FenceLayoutCanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ReturnType<typeof initCanvasEngine> | null>(null);
  const pendingDrawToolActivationRef = useRef<ActivateCanvasDrawToolDetail | null>(null);
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

  const gatesRef = useRef(gates);
  gatesRef.current = gates;

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
  const [engineVersion, setEngineVersion] = useState(0);
  const [mapInteractionMode, setMapInteractionMode] = useState<CanvasMapInteractionMode>("pan");
  const [googleMapType, setGoogleMapType] = useState<CanvasGoogleMapType>("satellite");
  const [googleMapOpacity, setGoogleMapOpacity] = useState(1);
  const [helpOpen, setHelpOpen] = useState(false);
  const [boundaryHintVisible, setBoundaryHintVisible] = useState(false);
  const [mapUiState, setMapUiState] = useState<MapUiState>({
    mapType: "satellite",
    hasAddress: false,
    hasLoadedMap: false,
    calibrationLabel: "",
  });

  // Gate placed on canvas but not yet configured by user
  const [pendingGate, setPendingGate] = useState<PendingGate | null>(null);
  const [gatePlacementOpen, setGatePlacementOpen] = useState(false);
  const [gatePlacementWidth, setGatePlacementWidth] = useState(DEFAULT_GATE_WIDTH_FALLBACK);
  const [gatePlacementType, setGatePlacementType] = useState<CanvasGateType>("single-swing");
  const [gatePlacementSlideSide, setGatePlacementSlideSide] = useState<CanvasGateSlidingSide>("front");

  // Existing gate being edited (click on a placed gate marker)
  const [editingCanvasGate, setEditingCanvasGate] = useState<{
    flatSegIdx: number;
    gateIdx: number;
    gate: GateConfig;
  } | null>(null);
  const [pendingGateWidth, setPendingGateWidth] = useState(DEFAULT_GATE_WIDTH_FALLBACK);
  const [useGatePostsAsTermination, setUseGatePostsAsTermination] = useState(true);

  const handleToolChange = useCallback((tool: CanvasTool) => {
    setActiveTool(tool);
    if (tool === "gate") {
      setGatePlacementOpen(true);
    }
    if (
      tool === "boundary" &&
      window.localStorage.getItem("qsbom.boundaryHintSeen") !== "true"
    ) {
      setBoundaryHintVisible(true);
      window.localStorage.setItem("qsbom.boundaryHintSeen", "true");
    }
  }, []);

  const activateDrawToolFromFenceSelection = useCallback(
    (detail: ActivateCanvasDrawToolDetail | null) => {
      pendingDrawToolActivationRef.current = detail;
      if (!engineRef.current) return;
      engineRef.current.setTool("draw");
      setActiveTool("draw");
      pendingDrawToolActivationRef.current = null;
      if (canvasRef.current) {
        if (detail?.runId) canvasRef.current.dataset.activeRunId = detail.runId;
        if (detail?.productCode) {
          canvasRef.current.dataset.activeProductCode = detail.productCode;
        }
      }
      console.log("[CanvasOverlay] draw tool activated from fence type selection", {
        activeTool: "draw",
        activeRunId: detail?.runId ?? null,
        productCode: detail?.productCode ?? null,
        source: detail?.source ?? null,
      });
    },
    [],
  );

  const handleGatePlaced = useCallback(
    (
      segIdx: number,
      gateIdx: number,
      defaultWidthMM: number,
      gateType: CanvasGateType = "single-swing",
      slidingSide: CanvasGateSlidingSide = "front",
    ) => {
      const stub: GateConfig = {
        id: crypto.randomUUID(),
        qty: 1,
        gateType,
        openingWidth: defaultWidthMM,
        gateHeight: "match-fence",
        colour: "match-fence",
        slatGap: "match-fence",
        slatSize: "match-fence",
        gatePostSize: "65x65",
        hingeType: "dd-kwik-fit-adjustable",
        latchType: "dd-magna-latch-top-pull",
        swingDirection: gateType === "sliding" ? "right" : "out",
      };
      setPendingGateWidth(defaultWidthMM);
      setUseGatePostsAsTermination(true);
      setPendingGate({ stub, segIdx, gateIdx, slidingSide });
    },
    [],
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
      onGateEdit: (flatSegIdx, gateIdx, gateId) => {
        // Find the gate in GateContext by id (set when gate was first saved)
        const existing = gateId
          ? gatesRef.current.find((g) => g.id === gateId)
          : undefined;
        if (!existing) return; // gate not yet saved (e.g. modal still open) — ignore
        setEditingCanvasGate({ flatSegIdx, gateIdx, gate: existing });
      },
    });
    engineRef.current = engine;
    setEngineVersion((value) => value + 1);
    onEngineReady?.(engine);
    if (pendingDrawToolActivationRef.current) {
      activateDrawToolFromFenceSelection(pendingDrawToolActivationRef.current);
    }

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
      setEngineVersion((value) => value + 1);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleGatePlaced]);

  useEffect(() => {
    engineRef.current?.setAllowedAngles(allowedAngles);
  }, [allowedAngles]);

  const handleGateSave = useCallback(
    (gate: GateConfig, useTerminationPosts = true) => {
      if (!pendingGate) return;
      engineRef.current?.updateGateWidth(
        pendingGate.segIdx,
        pendingGate.gateIdx,
        gate.openingWidth,
      );
      engineRef.current?.updateGateVisual(
        pendingGate.segIdx,
        pendingGate.gateIdx,
        {
          gateType: gate.gateType,
          swingDirection: gate.swingDirection,
          slidingSide: pendingGate.slidingSide,
        },
      );
      // Link canvas gate marker to GateConfig id so edit-by-click works later
      engineRef.current?.setGateId(
        pendingGate.segIdx,
        pendingGate.gateIdx,
        gate.id,
      );
      engineRef.current?.setGateTerminationPosts(
        pendingGate.segIdx,
        pendingGate.gateIdx,
        useTerminationPosts,
      );
      gateDispatch({
        type: "ADD_GATE",
        gate: { ...gate, useGatePostsAsFenceTermination: useTerminationPosts } as GateConfig,
      });
      setPendingGate(null);
    },
    [pendingGate, gateDispatch],
  );

  const handleGateSkip = useCallback(() => {
    if (!pendingGate) return;
    // Add with defaults so the layout gate count stays accurate
    engineRef.current?.setGateId(
      pendingGate.segIdx,
      pendingGate.gateIdx,
      pendingGate.stub.id,
    );
    engineRef.current?.updateGateVisual(
      pendingGate.segIdx,
      pendingGate.gateIdx,
      {
        gateType: pendingGate.stub.gateType,
        swingDirection: pendingGate.stub.swingDirection,
        slidingSide: pendingGate.slidingSide,
      },
    );
    gateDispatch({
      type: "ADD_GATE",
      gate: {
        ...pendingGate.stub,
        useGatePostsAsFenceTermination: true,
      } as GateConfig,
    });
    setPendingGate(null);
  }, [pendingGate, gateDispatch]);

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
    engineRef.current?.setPendingGatePlacement({
      gateType: gatePlacementType,
      widthMM: gatePlacementWidth,
      swingDirection: gatePlacementType === "sliding" ? "right" : "out",
      slidingSide: gatePlacementSlideSide,
    });
  }, [gatePlacementType, gatePlacementWidth, gatePlacementSlideSide]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ActivateCanvasDrawToolDetail>).detail;
      activateDrawToolFromFenceSelection(detail);
    };
    window.addEventListener(ACTIVATE_CANVAS_DRAW_TOOL_EVENT, handler);
    return () => window.removeEventListener(ACTIVATE_CANVAS_DRAW_TOOL_EVENT, handler);
  }, [activateDrawToolFromFenceSelection]);

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

  const handleEditCanvasGateSave = useCallback(
    (gate: GateConfig) => {
      if (!editingCanvasGate) return;
      engineRef.current?.updateGateWidth(
        editingCanvasGate.flatSegIdx,
        editingCanvasGate.gateIdx,
        gate.openingWidth,
      );
      engineRef.current?.updateGateVisual(
        editingCanvasGate.flatSegIdx,
        editingCanvasGate.gateIdx,
        {
          gateType: gate.gateType,
          swingDirection: gate.swingDirection,
          slidingSide: "front",
        },
      );
      gateDispatch({ type: "UPDATE_GATE", id: gate.id, updates: gate });
      setEditingCanvasGate(null);
    },
    [editingCanvasGate, gateDispatch],
  );

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
          mapOverlayEnabled={Boolean(propertyAnchor)}
          mapInteractionMode={mapInteractionMode}
          onMapInteractionModeChange={setMapInteractionMode}
          googleMapType={googleMapType}
          onGoogleMapTypeChange={setGoogleMapType}
          mapOpacity={googleMapOpacity}
          onMapOpacityChange={setGoogleMapOpacity}
        />
      </div>

      <MapOverlayCanvasFrame
        propertyAnchor={propertyAnchor}
        canvasRef={canvasRef}
        canvasHostRef={canvasHostRef}
        engine={engineRef.current}
        engineVersion={engineVersion}
        mapInteractionMode={mapInteractionMode}
        mapType={googleMapType}
        mapOpacity={googleMapOpacity}
        className="relative overflow-hidden"
        style={{ height: expanded ? "700px" : "630px" }}
      >
        <canvas
          ref={canvasRef}
          className={`block h-full w-full touch-none ${propertyAnchor ? "bg-transparent" : "bg-brand-bg"}`}
          style={{ cursor: "crosshair" }}
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
      </MapOverlayCanvasFrame>

      {!propertyAnchor ? (
        <div data-print-hide>
          <MapControls
            engineRef={engineRef}
            onMapUiStateChange={setMapUiState}
          />
        </div>
      ) : null}

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

      {gatePlacementOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Gate placement setup"
        >
          <div className="w-full max-w-sm rounded-lg border border-brand-border bg-brand-card p-5 shadow-2xl">
            <h2 className="text-base font-semibold text-brand-text">Gate placement</h2>
            <p className="mt-1 text-xs font-semibold text-brand-muted">
              Set the opening before placing the gate. The map preview will show this width before you drop it.
            </p>
            <div className="mt-4 space-y-4">
              <NumberInput
                label="Gate width (mm)"
                min={400}
                max={6500}
                step={50}
                value={gatePlacementWidth}
                onChange={setGatePlacementWidth}
                className="mt-1 w-full bg-brand-bg text-brand-text"
              />
              <label className="block text-sm font-semibold text-brand-text">
                Gate type
                <select
                  value={gatePlacementType}
                  onChange={(event) => setGatePlacementType(event.target.value as CanvasGateType)}
                  className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                >
                  <option value="single-swing">Single swing</option>
                  <option value="double-swing">Double swing</option>
                  <option value="sliding">Sliding</option>
                </select>
              </label>
              {gatePlacementType === "sliding" && (
                <label className="block text-sm font-semibold text-brand-text">
                  Sliding side
                  <select
                    value={gatePlacementSlideSide}
                    onChange={(event) =>
                      setGatePlacementSlideSide(event.target.value as CanvasGateSlidingSide)
                    }
                    className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                  >
                    <option value="front">Front side of fence</option>
                    <option value="back">Back side of fence</option>
                  </select>
                </label>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  engineRef.current?.setPendingGatePlacement({
                    gateType: gatePlacementType,
                    widthMM: gatePlacementWidth,
                    swingDirection: gatePlacementType === "sliding" ? "right" : "out",
                    slidingSide: gatePlacementSlideSide,
                  });
                  engineRef.current?.setTool("gate");
                  setActiveTool("gate");
                  setGatePlacementOpen(false);
                }}
                className="flex-1 rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent-hover"
              >
                Place gate
              </button>
              <button
                type="button"
                onClick={() => {
                  setGatePlacementOpen(false);
                  engineRef.current?.setTool("move");
                  setActiveTool("move");
                }}
                className="rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-muted hover:text-brand-text"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gate placement modal: detailed gate options live in the run settings. */}
      {pendingGate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Place gate"
        >
          <div className="w-full max-w-sm rounded-lg border border-brand-border bg-brand-card p-5 shadow-2xl">
            <h2 className="text-base font-semibold text-brand-text">
              Place gate
            </h2>
            <div className="mt-4 space-y-4">
              <NumberInput
                label="Gate opening (mm)"
                min={400}
                max={6000}
                step={50}
                value={pendingGateWidth}
                onChange={setPendingGateWidth}
                className="mt-1 w-full bg-brand-bg text-brand-text"
              />
              <label className="flex items-start gap-2 text-sm text-brand-text">
                <input
                  type="checkbox"
                  checked={useGatePostsAsTermination}
                  onChange={(event) =>
                    setUseGatePostsAsTermination(event.target.checked)
                  }
                  className="mt-0.5 accent-brand-accent"
                />
                <span>Use gate posts as fence termination post</span>
              </label>
              {pendingGate.stub.gateType === "sliding" && (
                <label className="block text-sm text-brand-text">
                  Sliding side
                  <select
                    value={pendingGate.slidingSide}
                    onChange={(event) =>
                      setPendingGate({
                        ...pendingGate,
                        slidingSide: event.target.value as CanvasGateSlidingSide,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                  >
                    <option value="front">Front side of fence</option>
                    <option value="back">Back side of fence</option>
                  </select>
                </label>
              )}
              <label className="block text-sm text-brand-text">
                Opening direction
                <select
                  value={pendingGate.stub.swingDirection}
                  onChange={(event) =>
                    setPendingGate({
                      ...pendingGate,
                      stub: {
                        ...pendingGate.stub,
                        swingDirection: event.target.value as GateConfig["swingDirection"],
                      },
                    })
                  }
                  className="mt-1 w-full rounded-md border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                >
                  {pendingGate.stub.gateType === "sliding" ? (
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
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  handleGateSave(
                    { ...pendingGate.stub, openingWidth: pendingGateWidth },
                    useGatePostsAsTermination,
                  )
                }
                className="flex-1 rounded-md bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent-hover"
              >
                Add gate
              </button>
              <button
                type="button"
                onClick={handleGateSkip}
                className="rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-muted hover:text-brand-text"
              >
                Keep default
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gate edit modal — opened by clicking an existing gate marker */}
      {editingCanvasGate && (
        <GateModal
          mode="editing"
          gateId={editingCanvasGate.gate.id}
          initialValues={editingCanvasGate.gate}
          onSave={handleEditCanvasGateSave}
          onClose={() => setEditingCanvasGate(null)}
        />
      )}

      <HelpCheatSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
