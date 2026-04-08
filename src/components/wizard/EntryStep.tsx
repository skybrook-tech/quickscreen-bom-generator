import {
  MessageSquare,
  PenTool,
  Settings2,
} from "lucide-react";

interface EntryStepProps {
  onStartManual: () => void;
  onStartLayout: () => void;
  onStartDescribe: () => void;
}

export function EntryStep({
  onStartManual,
  onStartLayout,
  onStartDescribe,
}: EntryStepProps) {
  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-brand-text">
          How would you like to start?
        </h2>
        <p className="text-sm text-brand-muted">
          Choose the best way to describe your fencing job.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* ── Describe the Job ─────────────────────────────────────── */}
        <button
          type="button"
          onClick={onStartDescribe}
          className="group rounded-xl border border-brand-border bg-brand-card hover:border-brand-accent/60 hover:shadow-lg hover:shadow-brand-accent/5 hover:-translate-y-0.5 transition-all duration-200 p-6 text-left flex flex-col gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0 group-hover:bg-brand-accent/15 transition-colors">
              <MessageSquare size={20} />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-brand-text">
                Describe the Job
              </p>
              <p className="text-xs text-brand-muted">
                Write in plain English — we'll parse it
              </p>
            </div>
          </div>
          <p className="text-xs text-brand-muted leading-relaxed">
            Type a description and our parser automatically detects run length,
            height, colour, system type, post mounting, and more.
          </p>
          <div className="mt-auto text-xs text-brand-accent font-medium group-hover:underline">
            Start describing →
          </div>
        </button>

        {/* ── Use Layout Tool ──────────────────────────────────────── */}
        <button
          type="button"
          onClick={onStartLayout}
          className="group rounded-xl border border-brand-border bg-brand-card hover:border-brand-accent/60 hover:shadow-lg hover:shadow-brand-accent/5 hover:-translate-y-0.5 transition-all duration-200 p-6 text-left flex-col gap-4 hidden sm:flex"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0 group-hover:bg-brand-accent/15 transition-colors">
              <PenTool size={20} />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-brand-text">
                Use Layout Tool
              </p>
              <p className="text-xs text-brand-muted">
                Draw your fence on a canvas
              </p>
            </div>
          </div>
          <p className="text-xs text-brand-muted leading-relaxed">
            Sketch the fence run, place gate markers, and transfer measurements
            directly into the configuration form.
          </p>
          <div className="mt-auto text-xs text-brand-accent font-medium group-hover:underline">
            Open canvas →
          </div>
        </button>

        {/* ── Configure Manually ───────────────────────────────────── */}
        <button
          type="button"
          data-testid="configure-manually-btn"
          onClick={onStartManual}
          className="group rounded-xl border border-brand-border bg-brand-card hover:border-brand-accent/60 hover:shadow-lg hover:shadow-brand-accent/5 hover:-translate-y-0.5 transition-all duration-200 p-6 text-left flex flex-col gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0 group-hover:bg-brand-accent/15 transition-colors">
              <Settings2 size={20} />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-brand-text">
                Configure Manually
              </p>
              <p className="text-xs text-brand-muted">
                Jump straight to the form
              </p>
            </div>
          </div>
          <p className="text-xs text-brand-muted leading-relaxed">
            Fill in run length, height, system type, colours, and gate details
            directly — fastest if you already know the specs.
          </p>
          <div className="mt-auto text-xs text-brand-accent font-medium group-hover:underline">
            Go to form →
          </div>
        </button>
      </div>
    </div>
  );
}
