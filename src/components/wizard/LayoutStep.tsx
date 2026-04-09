import { ArrowLeft, PenTool } from "lucide-react";
import { FenceLayoutCanvas } from "../canvas/FenceLayoutCanvas";
import { ErrorBoundary } from "../shared/ErrorBoundary";
import type { CanvasLayout } from "../canvas/canvasEngine";

interface LayoutStepProps {
  onBack: () => void;
  onApplied: (layout: CanvasLayout) => void;
}

export function LayoutStep({ onBack, onApplied }: LayoutStepProps) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-text transition-colors"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-brand-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0">
              <PenTool size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-text">
                Draw Your Fence Layout
              </p>
              <p className="text-xs text-brand-muted">
                Sketch the run, place gate markers, then click Use This Layout
                to pre-fill the form
              </p>
            </div>
          </div>
        </div>
        <ErrorBoundary label="Layout Tool">
          <FenceLayoutCanvas onApplied={onApplied} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
