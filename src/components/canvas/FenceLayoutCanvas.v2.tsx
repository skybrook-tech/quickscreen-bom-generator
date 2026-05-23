import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { Map } from "lucide-react";
import { cn } from "../../lib";
import { initCanvasEngine } from "./canvasEngine";
import { CanvasToolbar } from "./CanvasToolbar";
import { MapControls } from "./MapControls";
import { GateModal } from "../gate/GateModal";
import { useFenceConfig } from "../../context/FenceConfigContext";
import { useGates } from "../../context/GateContext";
import { useProducts } from "../../hooks/useProducts";
import type { GateConfig } from "../../schemas/gate.schema";
import type { CanvasLayout, CanvasRunSummary } from "./canvasEngine";
import type { PostPosition } from "../../types/bom.types";

interface PendingGate {
  stub: GateConfig;
  segIdx: number;
  gateIdx: number;
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
  /** Right-click on a segment — screen coords are viewport pixels (client*). */
  onSegmentContextMenu?: (
    flatSegIdx: number,
    screenX: number,
    screenY: number,
  ) => void;
  /** Optional content to render pinned inside the canvas (overlays, panels). */
  renderOverlay?: (runs: CanvasRunSummary[]) => React.ReactNode;
  /** Flat fence-segment index under cursor changed (-1 = none). */
  onFlatSegmentHoverChange?: (flatSegIdx: number) => void;
  /** Draw tool idle: click existing segment — select in run list (v4), do not start a new run. */
  onFenceSegmentClick?: (flatSegIdx: number) => void;
  propertyAnchor?: { lat: number; lng: number; address: string } | null;
}

export function FenceLayoutCanvas({
  onApplied: _onApplied,
  onLayoutChange,
  onEngineReady,
  postPositions,
  segmentPanelWidths,
  jobPanelWidth,
  allowedAngles: allowedAnglesProp,
  onSegmentContextMenu,
  renderOverlay,
  onFlatSegmentHoverChange,
  onFenceSegmentClick,
}: FenceLayoutCanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ReturnType<typeof initCanvasEngine> | null>(null);
  const { state: fenceState } = useFenceConfig();
  const { data: products } = useProducts();
  const { gates, dispatch: gateDispatch } = useGates();

  // Ref-wrap onLayoutChange so the engine (initialised once) always calls the current prop.
  // Without this, the closure captured at initCanvasEngine time goes stale when the parent
  // re-renders with a new handleLiveSync that closes over updated payload variables.
  const onLayoutChangeRef = useRef(onLayoutChange);
  useEffect(() => {
    onLayoutChangeRef.current = onLayoutChange;
  });

  const onSegmentContextMenuRef = useRef(onSegmentContextMenu);
  useEffect(() => {
    onSegmentContextMenuRef.current = onSegmentContextMenu;
  });

  const onFlatSegmentHoverChangeRef = useRef(onFlatSegmentHoverChange);
  useEffect(() => {
    onFlatSegmentHoverChangeRef.current = onFlatSegmentHoverChange;
  });

  const onFenceSegmentClickRef = useRef(onFenceSegmentClick);
  useEffect(() => {
    onFenceSegmentClickRef.current = onFenceSegmentClick;
  });

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

  const [activeTool, setActiveTool] = useState<
    "draw" | "gate" | "move" | "boundary" | "building" | "text" | "post" | "pillar" | "freehand" | "arrow"
  >("draw");
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [gateSnap100, setGateSnap100] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
  const [satelliteOpen, setSatelliteOpen] = useState(false);
  const [satelliteActive, setSatelliteActive] = useState(false);

  // Gate placed on canvas but not yet configured by user
  const [pendingGate, setPendingGate] = useState<PendingGate | null>(null);

  // Existing gate being edited (click on a placed gate marker)
  const [editingCanvasGate, setEditingCanvasGate] = useState<{
    flatSegIdx: number;
    gateIdx: number;
    gate: GateConfig;
  } | null>(null);

  const handleGatePlaced = useCallback(
    (segIdx: number, gateIdx: number, defaultWidthMM: number) => {
      const stub: GateConfig = {
        id: crypto.randomUUID(),
        qty: 1,
        gateType: "single-swing",
        openingWidth: defaultWidthMM,
        gateHeight: "match-fence",
        colour: "match-fence",
        slatGap: "match-fence",
        slatSize: "match-fence",
        gatePostSize: "65x65",
        hingeType: "dd-kwik-fit-adjustable",
        latchType: "dd-magna-latch-top-pull",
        swingDirection: "out",
      };
      setPendingGate({ stub, segIdx, gateIdx });
    },
    [],
  );

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = initCanvasEngine(canvasRef.current, {
      snapToGrid: false,
      gridSize: 20,
      showGrid: false,
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
    onEngineReady?.(engine);
    requestAnimationFrame(() => {
      engine.fitToContent();
    });

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleGatePlaced]);

  useEffect(() => {
    engineRef.current?.setAllowedAngles(allowedAngles);
  }, [allowedAngles]);

  const handleGateSave = useCallback(
    (gate: GateConfig) => {
      if (!pendingGate) return;
      engineRef.current?.updateGateWidth(
        pendingGate.segIdx,
        pendingGate.gateIdx,
        gate.openingWidth,
      );
      // Link canvas gate marker to GateConfig id so edit-by-click works later
      engineRef.current?.setGateId(
        pendingGate.segIdx,
        pendingGate.gateIdx,
        gate.id,
      );
      gateDispatch({ type: "ADD_GATE", gate });
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
    gateDispatch({ type: "ADD_GATE", gate: pendingGate.stub });
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
      gateDispatch({ type: "UPDATE_GATE", id: gate.id, updates: gate });
      setEditingCanvasGate(null);
    },
    [editingCanvasGate, gateDispatch],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-0">
      <CanvasToolbar
        engineRef={engineRef}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        snapEnabled={snapEnabled}
        onSnapToggle={setSnapEnabled}
        gateSnap100={gateSnap100}
        onGateSnap100Toggle={setGateSnap100}
        showGrid={showGrid}
        onToggleGrid={setShowGrid}
        expanded={expanded}
        onToggleExpand={setExpanded}
        freehandStyle={freehandStyle}
        onFreehandStyleChange={handleFreehandStyleChange}
        onHelpOpen={() => {}}
        onPrintMap={() => engineRef.current?.printMap?.()}
      />
      <div className="flex items-center gap-2 border-b border-brand-border/60 bg-brand-card px-2 py-1.5">
        <button
          type="button"
          onClick={() => setSatelliteOpen((o) => !o)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors",
            satelliteActive
              ? "border-brand-accent bg-brand-accent/25 text-brand-accent"
              : satelliteOpen
                ? "border-brand-accent/60 bg-brand-accent/10 text-brand-text"
                : "border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-accent/50",
          )}
          title="Satellite map underlay — address, opacity, and scale"
        >
          <Map size={13} aria-hidden /> Satellite
        </button>
      </div>

      {satelliteOpen ? (
        <MapControls
          engineRef={engineRef}
          onMapUiStateChange={(s) => setSatelliteActive(s.hasLoadedMap)}
        />
      ) : null}

      <div
        ref={canvasHostRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-brand-bg"
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full bg-brand-bg"
          style={{ cursor: "crosshair" }}
        />
        {renderOverlay?.(runSummaries)}

        {/* Single hint strip — two overlapping absolute rows caused unreadable text */}
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-brand-muted pointer-events-none select-none">
          <span>
            {activeTool === "draw" &&
              "Click to place points · Double-click or Enter to finish · Esc to cancel"}
            {activeTool === "gate" &&
              "Click on a fence segment to place a gate marker"}
            {activeTool === "move" &&
              "Drag a node to move it · Drag a segment body to move the whole run · Right-click to edit · Click a label to edit length"}
            {activeTool === "boundary" &&
              "Draw non-product context lines (existing fences, walls, property lines) — not included in BOM"}
          </span>
          <span className="hidden sm:inline text-brand-border" aria-hidden>
            |
          </span>
          <span className="text-brand-muted/90">
            Scroll = zoom · Right-drag = pan · Right-click segment = edit ·
            Ctrl+Z = undo
          </span>
        </div>

      </div>



      {/* Gate modal — opens immediately when a gate marker is placed on the canvas */}
      {pendingGate && (
        <GateModal
          mode="adding"
          gateId={pendingGate.stub.id}
          initialValues={pendingGate.stub}
          onSave={handleGateSave}
          onClose={handleGateSkip}
        />
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
    </div>
  );
}
