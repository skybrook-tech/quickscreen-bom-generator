import { Download, FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { BomViewModel } from "./useBomViewModel";

interface Props {
  view: BomViewModel;
  isPending: boolean;
  onGenerate: () => void;
  canGenerate: boolean;
}

/**
 * Generate / Export buttons row above the BOM table.
 * Generate is the primary CTA; CSV/PDF are stubs (toast info) for v4 v1.
 */
export function BomActions({
  view,
  isPending,
  onGenerate,
  canGenerate,
}: Props) {
  function exportCsv() {
    if (!view.hasResult) return;
    const headers = ["SKU", "Description", "Unit", "Qty", "Unit $", "Line $"];
    const rows = view.allLines.map((l) => [
      l.sku,
      l.description,
      l.unit,
      l.quantity,
      l.unitPrice.toFixed(2),
      l.lineTotal.toFixed(2),
    ]);
    const csv =
      [headers, ...rows]
        .map((r) =>
          r
            .map((c) => {
              const s = String(c);
              return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(","),
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bom-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  return (
    <div className="px-4 py-3 border-b border-brand-border bg-brand-card flex items-center gap-2 flex-shrink-0">
      <button
        onClick={onGenerate}
        disabled={!canGenerate || isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-accent text-white text-xs font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="v4-generate-bom"
      >
        {isPending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Sparkles size={13} />
        )}
        {isPending ? "Calculating…" : "Generate BOM"}
      </button>
      <div className="flex-1" />
      <button
        onClick={exportCsv}
        disabled={!view.hasResult}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-brand-border text-xs font-medium text-brand-muted hover:text-brand-text hover:bg-brand-border/30 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download size={12} /> CSV
      </button>
      <button
        onClick={() =>
          toast.info("PDF export: not yet wired in v4 (use v3 for now)")
        }
        disabled={!view.hasResult}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-brand-border text-xs font-medium text-brand-muted hover:text-brand-text hover:bg-brand-border/30 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FileText size={12} /> PDF
      </button>
    </div>
  );
}
