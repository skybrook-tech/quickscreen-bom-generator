import { Download, Keyboard, Loader2, Printer, Share2 } from "lucide-react";
import { RightPaneTabs, type RightPaneView } from "./RightPaneTabs";
import type { CalculatorBOMResult } from "../../types/bom.types";

interface CalculatorHeaderActionsProps {
  rightPaneView: RightPaneView;
  runPaneWidth: number;
  mobileLayout: boolean;
  bomResultForTabs: CalculatorBOMResult | null;
  sharingPdf: boolean;
  onRightPaneChange: (view: RightPaneView) => void;
  onOpenPrintDialog: () => void;
  onExportCsv: () => void;
  onSharePdf: () => void;
  onOpenShortcuts: () => void;
}

export function CalculatorHeaderActions({
  rightPaneView,
  runPaneWidth,
  mobileLayout,
  bomResultForTabs,
  sharingPdf,
  onRightPaneChange,
  onOpenPrintDialog,
  onExportCsv,
  onSharePdf,
  onOpenShortcuts,
}: CalculatorHeaderActionsProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-2">
      <div
        className="lg:fixed lg:top-2 lg:z-40"
        style={mobileLayout ? undefined : { left: runPaneWidth + 16 }}
      >
        <RightPaneTabs activeView={rightPaneView} onChange={onRightPaneChange} />
      </div>
      {rightPaneView === "bom" && (
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={onOpenPrintDialog}
            disabled={!bomResultForTabs}
            title="Print BOM"
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Printer size={16} />
            Print BOM
          </button>
          <button
            type="button"
            onClick={onExportCsv}
            disabled={!bomResultForTabs}
            title="Export CSV (Ctrl+E)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={onSharePdf}
            disabled={!bomResultForTabs || sharingPdf}
            title="Share PDF"
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sharingPdf ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
            Share PDF
          </button>
          <button
            type="button"
            onClick={onOpenShortcuts}
            title="Keyboard shortcuts (?)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary hover:shadow-sm"
          >
            <Keyboard size={16} />
            Shortcuts
          </button>
        </div>
      )}
    </div>
  );
}
