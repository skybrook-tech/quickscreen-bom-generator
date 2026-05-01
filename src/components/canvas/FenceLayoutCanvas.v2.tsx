import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { ArrowRight } from "lucide-react";
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
}

export function FenceLayoutCanvas({
  onApplied,
  onLayoutChange,
  onEngineReady,
  postPositions,
  segmentPanelWidths,
  jobPanelWidth,
  allowedAngles: allowedAnglesProp,
  onSegmentContextMenu,
  renderOverlay,
}: FenceLayoutCanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ReturnType<typeof initCanvasEngine> | null>(null);
  const { state: fenceState, dispatch: fenceDispatch } = useFenceConfig();
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
    "draw" | "gate" | "move" | "boundary"
  >("draw");
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [applied, setApplied] = useState(false);
  const [runSummaries, setRunSummaries] = useState<CanvasRunSummary[]>([]);

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
      };
      setPendingGate({ stub, segIdx, gateIdx });
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
      onSegmentContextMenu: (flatSegIdx, sx, sy) => {
        onSegmentContextMenuRef.current?.(flatSegIdx, sx, sy);
      },
      onRunSummariesRefresh: (summaryRuns) => {
        setRunSummaries(summaryRuns);
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

  const handleUseLayout = useCallback(() => {
    const layout = engineRef.current?.getLayout();
    if (!layout || layout.segments.length === 0) return;

    fenceDispatch({
      type: "SET_FIELD",
      field: "totalRunLength",
      value: Math.round(layout.totalLengthM * 100) / 100,
    });

    fenceDispatch({
      type: "SET_FIELD",
      field: "corners",
      value: layout.cornerCount,
    });

    // Sync canvas gates to GateContext
    if (layout.gates.length > 0) {
      gateDispatch({ type: "CLEAR_ALL" });
      for (const gate of layout.gates) {
        gateDispatch({
          type: "ADD_GATE",
          gate: {
            id: crypto.randomUUID(),
            gateType: "single-swing" as const,
            openingWidth: gate.widthMM,
            gateHeight: "match-fence" as const,
            colour: "match-fence" as const,
            slatGap: "match-fence" as const,
            slatSize: "match-fence" as const,
            gatePostSize: "65x65" as const,
            hingeType: "dd-kwik-fit-adjustable" as const,
            latchType: "dd-magna-latch-top-pull" as const,
            qty: 1,
          },
        });
      }
    }

    setApplied(true);
    setTimeout(() => {
      setApplied(false);
      onApplied?.(layout);
    }, 300);
  }, [fenceDispatch, gateDispatch, onApplied]);

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
    <div className="space-y-0 h-full flex flex-col">
      <CanvasToolbar
        engineRef={engineRef}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        snapEnabled={snapEnabled}
        onSnapToggle={setSnapEnabled}
        showGrid={showGrid}
        onToggleGrid={setShowGrid}
        expanded={expanded}
        onToggleExpand={setExpanded}
      />

      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          className="w-full bg-brand-bg block h-full"
          style={{ cursor: "crosshair" }}
        />

        {/* Hint overlay */}
        <div className="absolute bottom-2 left-2 text-xs text-brand-muted pointer-events-none select-none">
          {activeTool === "draw" &&
            "Click to place points · Double-click or Enter to finish · Esc to cancel"}
          {activeTool === "gate" &&
            "Click on a fence segment to place a gate marker"}
          {activeTool === "move" &&
            "Drag a node to move it · Drag a segment body to move the whole run · Right-click to edit · Click a label to edit length"}
          {activeTool === "boundary" &&
            "Draw non-product context lines (existing fences, walls, property lines) — not included in BOM"}
        </div>

        {/* Zoom hint — shifted off the right edge so it isn't occluded by the runs overview overlay */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-brand-muted pointer-events-none select-none">
          Scroll = zoom · Right-drag = pan · Right-click segment = edit · Ctrl+Z = undo
        </div>

        {renderOverlay?.(runSummaries)}
      </div>

      <MapControls engineRef={engineRef} />

      {/* Apply button */}
      <div className="flex items-center justify-between p-3 bg-brand-card border-t border-brand-border">
        <p className="text-xs text-brand-muted">
          Draw your fence layout above, then click{" "}
          <strong className="text-brand-text">Use This Layout</strong> to
          populate the run length and corners in the form below.
        </p>
        <button
          type="button"
          onClick={handleUseLayout}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-accent text-white text-sm font-medium rounded hover:bg-brand-accent-hover transition-colors shrink-0 ml-4"
        >
          {applied ? "Applied!" : "Use This Layout"}
          {!applied && <ArrowRight size={14} />}
        </button>
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
