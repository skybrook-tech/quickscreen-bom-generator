import { Map as MapIcon } from "lucide-react";
import { JobNameField } from "./JobNameField";
import { Button } from "../../ui/Button";

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
    <div className="py-4  flex flex-col gap-1">
      <label className="text-[11px] font-medium uppercase tracking-wider text-brand-muted mb-4">
        Job
        <JobNameField />
      </label>


      {/* <QuoteDetailsPanel /> */}

      <Button
        variant="primary"
        onClick={onOpenLayoutMap}
        disabled={!hasPayload}
        className="text-center flex items-center justify-center gap-2"
        data-testid="v4-open-layout-map"
      >
        <MapIcon size={14} /> Use layout tool
      </Button>

    </div>
  );
}
