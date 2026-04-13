import type { FenceConfig } from "../../schemas/fence.schema";
import type { GateConfig } from "../../schemas/gate.schema";

const GATE_TYPE_LABELS: Record<string, string> = {
  "single-swing": "Single Swing",
  "double-swing": "Double Swing",
  sliding: "Sliding",
};

function formatColourSlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatGatePostSize(size: string): string {
  return size.replace(/x/i, "×") + "mm posts";
}

function formatGateHeight(height: GateConfig["gateHeight"]): string {
  return height === "match-fence" ? "Match fence" : `${height}mm`;
}

function formatGateColour(colour: GateConfig["colour"]): string {
  return colour === "match-fence" ? "Match fence" : formatColourSlug(colour);
}

const MAX_GATES_SHOWN = 3;

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
          <div className="pt-1.5 space-y-2">
            {gates.slice(0, MAX_GATES_SHOWN).map((gate, idx) => (
              <div key={gate.id} className="space-y-0.5">
                <div className="text-xs font-semibold text-brand-muted">
                  Gate {idx + 1}
                  {gate.qty > 1 && (
                    <span className="ml-1 text-brand-accent">×{gate.qty}</span>
                  )}
                </div>
                <div className="pl-2 space-y-0.5">
                  <div className="text-xs text-brand-text">
                    {GATE_TYPE_LABELS[gate.gateType] ?? gate.gateType}
                  </div>
                  <div className="text-xs text-brand-muted">
                    {gate.openingWidth}mm wide × {formatGateHeight(gate.gateHeight)}
                  </div>
                  <div className="text-xs text-brand-muted">
                    {formatGateColour(gate.colour)}
                  </div>
                  <div className="text-xs text-brand-muted">
                    {formatGatePostSize(gate.gatePostSize)}
                  </div>
                </div>
              </div>
            ))}
            {gates.length > MAX_GATES_SHOWN && (
              <div className="text-xs text-brand-muted">
                +{gates.length - MAX_GATES_SHOWN} more gate
                {gates.length - MAX_GATES_SHOWN > 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
