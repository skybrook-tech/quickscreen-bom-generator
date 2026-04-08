import { ArrowLeft, Loader2 } from 'lucide-react';
import { FenceConfigForm } from '../fence/FenceConfigForm';
import { GateConfigPanel } from '../gate/GateConfigPanel';
import { JobSummary } from '../contact/JobSummary';
import { LayoutMinimap } from '../canvas/LayoutMinimap';
import type { CanvasLayout } from '../canvas/canvasEngine';
import { useFenceConfig } from '../../context/FenceConfigContext';
import { useGates } from '../../context/GateContext';

interface ConfigureStepProps {
  onBack: () => void;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
  layoutData?: CanvasLayout | null;
}

export function ConfigureStep({ onBack, onGenerate, isGenerating, layoutData }: ConfigureStepProps) {
  const { state: fenceConfig } = useFenceConfig();
  const { gates } = useGates();

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-text transition-colors"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Fence config + Gates ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Combined Fence + Gates card */}
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
            {/* Fence Configuration section */}
            <div className="p-5 space-y-5">
              <h3 className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
                Fence Configuration
              </h3>
              <FenceConfigForm onGenerate={onGenerate} />
            </div>

            {/* Gates section — same card, separated by border */}
            <div className="border-t border-brand-border p-5 space-y-4">
              <h3 className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
                Gates
                {gates.length > 0 && (
                  <span className="ml-2 text-brand-accent normal-case font-medium tracking-normal text-[10px] bg-brand-accent/10 px-1.5 py-0.5 rounded-full">
                    {gates.length} added
                  </span>
                )}
              </h3>
              <GateConfigPanel />
            </div>
          </div>

          {/* Generate BOM button */}
          <button
            type="submit"
            form="fence-config-form"
            disabled={isGenerating}
            data-testid="generate-bom-btn"
            className="w-full py-3.5 px-6 bg-brand-accent hover:bg-brand-accent-hover active:bg-brand-accent-hover disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-150 text-sm tracking-wide shadow-sm hover:shadow-md hover:shadow-brand-accent/20 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating BOM…
              </>
            ) : (
              'Generate BOM →'
            )}
          </button>
        </div>

        {/* ── Right: Sticky Job Summary ────────────────────────────── */}
        <div className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            <JobSummary fenceConfig={fenceConfig} gates={gates} />
            {layoutData && <LayoutMinimap layout={layoutData} />}
          </div>
        </div>

      </div>

      {/* Mobile: Job Summary below */}
      <div className="lg:hidden">
        <JobSummary fenceConfig={fenceConfig} gates={gates} />
      </div>
    </div>
  );
}
