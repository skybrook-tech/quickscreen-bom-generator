import type { FenceConfig } from '../../schemas/fence.schema';
import type { GateConfig } from '../../schemas/gate.schema';

interface JobSummaryProps {
  fenceConfig: FenceConfig;
  gates: GateConfig[];
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-sm py-1 border-b border-brand-border last:border-0">
      <span className="text-brand-muted">{label}</span>
      <span className="text-brand-text font-medium">{value}</span>
    </div>
  );
}

export function JobSummary({ fenceConfig: fc, gates }: JobSummaryProps) {
  const panels   = Math.ceil((fc.totalRunLength * 1000) / parseInt(fc.maxPanelWidth));
  const wallTerms =
    (fc.leftTermination  === 'wall' ? 1 : 0) +
    (fc.rightTermination === 'wall' ? 1 : 0);
  const posts = (panels + 1) - wallTerms + fc.corners;

  return (
    <div className="bg-brand-bg rounded border border-brand-border p-4">
      <h3 className="text-sm font-semibold text-brand-text mb-3">Job Summary</h3>
      <SummaryRow label="System"        value={fc.systemType} />
      <SummaryRow label="Run Length"    value={`${fc.totalRunLength}m`} />
      <SummaryRow label="Target Height" value={`${fc.targetHeight}mm`} />
      <SummaryRow label="Slat"          value={`${fc.slatSize}mm · ${fc.slatGap}mm gap`} />
      <SummaryRow label="Colour"        value={fc.colour} />
      <SummaryRow label="Max Panel"     value={`${fc.maxPanelWidth}mm`} />
      <SummaryRow label="Panels"        value={panels} />
      <SummaryRow label="Posts (est.)"  value={posts} />
      {fc.corners > 0 && <SummaryRow label="Corners" value={fc.corners} />}
      {gates.length > 0 && <SummaryRow label="Gates" value={gates.length} />}
    </div>
  );
}
