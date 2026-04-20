interface BOMWarningsPanelProps {
  errors: string[];
  warnings: string[];
  assumptions: string[];
}

export function BOMWarningsPanel({ errors, warnings, assumptions }: BOMWarningsPanelProps) {
  if (errors.length === 0 && warnings.length === 0 && assumptions.length === 0) return null;

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-400 text-sm font-semibold">Errors — BOM blocked until resolved</span>
          </div>
          <ul className="space-y-1">
            {errors.map((e, i) => (
              <li key={i} className="text-red-400 text-sm">• {e}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-400 text-sm font-semibold">Warnings</span>
          </div>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-amber-400 text-sm">• {w}</li>
            ))}
          </ul>
        </div>
      )}
      {assumptions.length > 0 && (
        <div className="bg-brand-border/30 border border-brand-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-brand-muted text-sm font-semibold">Assumptions</span>
          </div>
          <ul className="space-y-1">
            {assumptions.map((a, i) => (
              <li key={i} className="text-brand-muted text-sm">• {a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
