import type { FenceConfig } from "../../schemas/fence.schema";
import type { GateConfig } from "../../schemas/gate.schema";

interface JobSummaryProps {
  fenceConfig: FenceConfig;
  gates: GateConfig[];
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex justify-between items-baseline gap-2 py-1.5 border-brand-border last:border-0">
      <span className="text-xs text-brand-muted shrink-0">{label}</span>
      <span className="text-xs text-brand-text font-medium text-right truncate">
        {value}
      </span>
    </div>
  );
}

export function JobSummary({ fenceConfig: fc, gates }: JobSummaryProps) {
  const panels =
    fc.totalRunLength > 0
      ? Math.ceil((fc.totalRunLength * 1000) / parseInt(fc.maxPanelWidth))
      : 0;
  const wallTerms =
    (fc.leftTermination === "wall" ? 1 : 0) +
    (fc.rightTermination === "wall" ? 1 : 0);
  const posts = panels > 0 ? panels + 1 - wallTerms + fc.corners : 0;

  return (
    <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-brand-border">
        <h3 className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
          Job Summary
        </h3>
      </div>
      <div className="px-4 py-3 space-y-0">
        <SummaryRow label="System" value={fc.systemType} />
        <SummaryRow
          label="Run Length"
          value={fc.totalRunLength > 0 ? `${fc.totalRunLength}m` : "—"}
        />
        <SummaryRow
          label="Height"
          value={fc.targetHeight > 0 ? `${fc.targetHeight}mm` : "—"}
        />
        <SummaryRow
          label="Slat"
          value={`${fc.slatSize}mm · ${fc.slatGap}mm gap`}
        />
        <SummaryRow
          label="Colour"
          value={fc.colour
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())}
        />
        <SummaryRow label="Max Panel" value={`${fc.maxPanelWidth}mm`} />
        <SummaryRow
          label="Post Mounting"
          value={fc.postMounting
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())}
        />
        {panels > 0 && <SummaryRow label="Panels (est.)" value={panels} />}
        {posts > 0 && <SummaryRow label="Posts (est.)" value={posts} />}
        {fc.corners > 0 && <SummaryRow label="Corners" value={fc.corners} />}
        {gates.length > 0 && (
          <SummaryRow label="Gates" value={`${gates.length} configured`} />
        )}
      </div>
    </div>
  );
}
