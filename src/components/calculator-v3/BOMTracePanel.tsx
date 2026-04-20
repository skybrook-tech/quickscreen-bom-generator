import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface TraceEntry {
  stage?: string;
  rule_id?: string;
  rule_name?: string;
  expression?: string;
  output_key?: string;
  output?: unknown;
  error?: string;
}

interface BOMTracePanelProps {
  trace: TraceEntry[];
  computed: Record<string, Record<string, unknown>>;
  isAdmin: boolean;
}

export function BOMTracePanel({ trace, computed, isAdmin }: BOMTracePanelProps) {
  const [open, setOpen] = useState(false);

  if (!isAdmin || trace.length === 0) return null;

  function copyTrace() {
    navigator.clipboard.writeText(JSON.stringify({ trace, computed }, null, 2));
    toast.success('Trace copied to clipboard');
  }

  return (
    <div className="border border-brand-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-brand-card hover:bg-brand-border/20 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-brand-muted">Engine Trace (Admin)</span>
        {open
          ? <ChevronDown className="w-4 h-4 text-brand-muted" />
          : <ChevronRight className="w-4 h-4 text-brand-muted" />
        }
      </button>

      {open && (
        <div className="bg-brand-bg p-4 space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={copyTrace}
              className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text border border-brand-border rounded px-3 py-1.5 transition-colors"
            >
              <Copy className="w-3 h-3" /> Copy trace
            </button>
          </div>

          {/* Rule firings */}
          <div>
            <h4 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2">Rule Firings</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-brand-muted border-b border-brand-border">
                    <th className="text-left py-1 px-2">Stage</th>
                    <th className="text-left py-1 px-2">Rule</th>
                    <th className="text-left py-1 px-2">Expression</th>
                    <th className="text-left py-1 px-2">Output</th>
                    <th className="text-left py-1 px-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {trace.map((entry, i) => (
                    <tr
                      key={i}
                      className={`border-b border-brand-border/30 ${entry.error ? 'bg-red-500/5' : ''}`}
                    >
                      <td className="py-1 px-2 text-brand-muted">{entry.stage}</td>
                      <td className="py-1 px-2 text-brand-text">{entry.rule_name}</td>
                      <td
                        className="py-1 px-2 text-brand-muted max-w-xs truncate"
                        title={entry.expression}
                      >
                        {entry.expression}
                      </td>
                      <td className="py-1 px-2 text-green-400">
                        {entry.output_key != null && entry.output !== undefined
                          ? `${entry.output_key} = ${String(entry.output)}`
                          : ''}
                      </td>
                      <td className="py-1 px-2 text-red-400">{entry.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Computed variables per run/segment */}
          {Object.keys(computed).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2">
                Computed Variables
              </h4>
              {Object.entries(computed).map(([runId, segs]) => (
                <div key={runId} className="mb-3">
                  <div className="text-xs text-brand-muted mb-1">
                    Run: {runId.slice(0, 8)}&hellip;
                  </div>
                  {Object.entries(segs as Record<string, unknown>).map(([segId, vals]) => (
                    <div key={segId} className="pl-4 mb-2">
                      <div className="text-xs text-brand-muted/70 mb-1">
                        Segment: {segId.slice(0, 8)}&hellip;
                      </div>
                      <pre className="text-xs text-brand-text bg-brand-card rounded p-2 overflow-x-auto">
                        {JSON.stringify(vals, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
