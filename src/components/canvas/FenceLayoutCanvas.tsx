import { useRef, useEffect, useCallback, useState } from "react";
import { ArrowRight } from "lucide-react";
import { initCanvasEngine } from "./canvasEngine";
import { CanvasToolbar } from "./CanvasToolbar";
import { MapControls } from "./MapControls";
import { GateModal } from "../gate/GateModal";
import { useFenceConfig } from "../../context/FenceConfigContext";
import { useGates } from "../../context/GateContext";
import type { GateConfig } from "../../schemas/gate.schema";
import type { CanvasLayout } from "./canvasEngine";

interface PendingGate {
  stub: GateConfig;
  segIdx: number;
  gateIdx: number;
}

interface FenceLayoutCanvasProps {
  onApplied?: (layout: CanvasLayout) => void;
}

export function FenceLayoutCanvas({ onApplied }: FenceLayoutCanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ReturnType<typeof initCanvasEngine> | null>(null);
  const { dispatch: fenceDispatch } = useFenceConfig();
  const { dispatch: gateDispatch } = useGates();

  const [activeTool, setActiveTool] = useState<"draw" | "gate" | "move">(
    "draw",
  );
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [applied, setApplied] = useState(false);

  // Gate placed on canvas but not yet configured by user
  const [pendingGate, setPendingGate] = useState<PendingGate | null>(null);

  const handleGatePlaced = useCallback(
    (segIdx: number, gateIdx: number, defaultWidthMM: number) => {
      const stub: GateConfig = {
        id: crypto.randomUUID(),
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

    engineRef.current = initCanvasEngine(canvasRef.current, {
      snapToGrid: true,
      gridSize: 20,
      showGrid: true,
      onGatePlaced: handleGatePlaced,
    });

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [handleGatePlaced]);

  const handleGateSave = useCallback(
    (gate: GateConfig) => {
      if (!pendingGate) return;
      engineRef.current?.updateGateWidth(
        pendingGate.segIdx,
        pendingGate.gateIdx,
        gate.openingWidth,
      );
      gateDispatch({ type: "ADD_GATE", gate });
      setPendingGate(null);
    },
    [pendingGate, gateDispatch],
  );

  const handleGateSkip = useCallback(() => {
    if (!pendingGate) return;
    // Add with defaults so the layout gate count stays accurate
    gateDispatch({ type: "ADD_GATE", gate: pendingGate.stub });
    setPendingGate(null);
  }, [pendingGate, gateDispatch]);

  const handleUseLayout = useCallback(() => {
    const layout = engineRef.current?.getLayout();
    if (!layout || layout.segments.length === 0) return;

    fenceDispatch({
      type: "SET_FIELD",
      field: "totalRunLength",
      value: layout.totalLengthM,
    });
    fenceDispatch({
      type: "SET_FIELD",
      field: "corners",
      value: layout.cornerCount,
    });

    setApplied(true);
    setTimeout(() => {
      setApplied(false);
      onApplied?.(layout);
    }, 300);
  }, [fenceDispatch, onApplied]);

  return (
    <div className="space-y-0">
      <CanvasToolbar
        engineRef={engineRef}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        snapEnabled={snapEnabled}
        onSnapToggle={setSnapEnabled}
      />

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full bg-brand-bg block"
          style={{ height: "420px", cursor: "crosshair" }}
        />

        {/* Hint overlay */}
        <div className="absolute bottom-2 left-2 text-xs text-brand-muted pointer-events-none select-none">
          {activeTool === "draw" &&
            "Click to place points · Double-click or Enter to finish · Esc to cancel"}
          {activeTool === "gate" &&
            "Click on a fence segment to place a gate marker"}
          {activeTool === "move" &&
            "Click a segment label to edit its real-world length"}
        </div>

        {/* Zoom hint */}
        <div className="absolute bottom-2 right-2 text-xs text-brand-muted pointer-events-none select-none">
          Scroll = zoom · Right-drag = pan · Ctrl+Z = undo
        </div>
      </div>

      <MapControls engineRef={engineRef} />

      {/* Apply button */}
      <div className="flex items-center justify-between p-3 bg-brand-card border-t-0 border-brand-border">
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
    </div>
  );
}
