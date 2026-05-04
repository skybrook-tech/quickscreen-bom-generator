import { Map as MapIcon } from "lucide-react";
import { JobNameField } from "./JobNameField";

interface JobShellProps {
  onOpenLayoutMap: () => void;
  hasPayload: boolean;
}

/**
 * Top card on the left column: job name + product picker + Open layout map button.
 * The layout map opens as a slide-out pane (see LayoutMapPane).
 */
export function JobShell({ onOpenLayoutMap, hasPayload }: JobShellProps) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-card p-4 space-y-3">
      <JobNameField />
      <button
        type="button"
        onClick={onOpenLayoutMap}
        disabled={!hasPayload}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-brand-border text-sm font-medium text-brand-text hover:bg-brand-border/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="v4-open-layout-map"
      >
        <MapIcon size={16} /> Open layout map
      </button>
    </div>
  );
}
