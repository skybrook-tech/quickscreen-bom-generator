import { useRef, useEffect, useCallback, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { initCanvasEngine } from './canvasEngine';
import { CanvasToolbar } from './CanvasToolbar';
import { MapControls } from './MapControls';
import { useFenceConfig } from '../../context/FenceConfigContext';
import { useGates } from '../../context/GateContext';
import type { GateConfig } from '../../schemas/gate.schema';

export function FenceLayoutCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ReturnType<typeof initCanvasEngine> | null>(null);
  const { dispatch: fenceDispatch } = useFenceConfig();
  const { dispatch: gateDispatch } = useGates();

  const [activeTool, setActiveTool] = useState<'draw' | 'gate' | 'move'>('draw');
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    engineRef.current = initCanvasEngine(canvasRef.current, {
      snapToGrid: true,
      gridSize: 20,
      showGrid: true,
    });

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleUseLayout = useCallback(() => {
    const layout = engineRef.current?.getLayout();
    if (!layout || (layout.segments.length === 0)) return;

    // Dispatch fence config updates
    fenceDispatch({
      type: 'SET_FIELD',
      field: 'totalRunLength',
      value: layout.totalLengthM,
    });
    fenceDispatch({
      type: 'SET_FIELD',
      field: 'corners',
      value: layout.cornerCount,
    });

    // Create gate entries from canvas markers
    if (layout.gates.length > 0) {
      const gateConfigs: GateConfig[] = layout.gates.map((g) => ({
        id: crypto.randomUUID(),
        gateType: 'single-swing' as const,
        openingWidth: g.widthMM,
        gateHeight: 'match-fence' as const,
        colour: 'match-fence' as const,
        slatGap: 'match-fence' as const,
        slatSize: 'match-fence' as const,
        gatePostSize: '65x65' as const,
        hingeType: 'dd-kwik-fit-adjustable' as const,
        latchType: 'dd-magna-latch-top-pull' as const,
      }));
      gateDispatch({ type: 'SET_GATES', gates: gateConfigs });
    }

    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  }, [fenceDispatch, gateDispatch]);

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
          className="w-full border-x border-brand-border bg-brand-bg block"
          style={{ height: '420px', cursor: 'crosshair' }}
        />

        {/* Hint overlay */}
        <div className="absolute bottom-2 left-2 text-xs text-brand-muted pointer-events-none select-none">
          {activeTool === 'draw' && 'Click to place points · Double-click or Enter to finish · Esc to cancel'}
          {activeTool === 'gate' && 'Click on a fence segment to place a gate marker'}
          {activeTool === 'move' && 'Click a segment label to edit its real-world length'}
        </div>

        {/* Zoom hint */}
        <div className="absolute bottom-2 right-2 text-xs text-brand-muted pointer-events-none select-none">
          Scroll = zoom · Right-drag = pan · Ctrl+Z = undo
        </div>
      </div>

      <MapControls engineRef={engineRef} />

      {/* Apply button */}
      <div className="flex items-center justify-between p-3 bg-brand-card border border-t-0 border-brand-border rounded-b">
        <p className="text-xs text-brand-muted">
          Draw your fence layout above, then click <strong className="text-brand-text">Use This Layout</strong> to
          populate the run length, corners, and gate positions in the form below.
        </p>
        <button
          type="button"
          onClick={handleUseLayout}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-accent text-white text-sm font-medium rounded hover:bg-brand-accent-hover transition-colors shrink-0 ml-4"
        >
          {applied ? 'Applied!' : 'Use This Layout'}
          {!applied && <ArrowRight size={14} />}
        </button>
      </div>
    </div>
  );
}
