import { useState } from "react";
import { toast } from "sonner";
import {
  Save,
  Download,
  Copy,
  Printer,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import Papa from "papaparse";
import { QuotePDFTemplate } from "./QuotePDFTemplate";
import { useQuotes } from "../../hooks/useQuotes";
import type { SavedQuote, NewQuote } from "../../types/quote.types";
import type { BOMResult } from "../../types/bom.types";
import type { FenceConfig } from "../../schemas/fence.schema";
import type { GateConfig } from "../../schemas/gate.schema";
import type { ContactInfo } from "../../schemas/contact.schema";

interface QuoteActionsProps {
  fenceConfig: FenceConfig;
  gates: GateConfig[];
  bom: BOMResult;
  contact: ContactInfo;
  customerRef: string;
  notes: string;
  orgId: string;
  onShowSaved: () => void;
}

export function QuoteActions({
  fenceConfig,
  gates,
  bom,
  contact,
  customerRef,
  notes,
  orgId,
  onShowSaved,
}: QuoteActionsProps) {
  const { saveQuote } = useQuotes();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pdfing, setPdfing] = useState(false);

  // ── Save to Supabase ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const newQuote: NewQuote = {
        org_id: orgId,
        customer_ref: customerRef,
        fence_config: fenceConfig,
        gates,
        bom,
        contact,
        notes,
        status: "draft",
      };
      await saveQuote.mutateAsync(newQuote);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("Quote saved");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save quote";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── CSV export ───────────────────────────────────────────────────────────────
  const handleCSV = () => {
    const allItems = [...bom.fenceItems, ...bom.gateItems];
    type CSVRow = {
      SKU: string;
      Description: string;
      Category: string;
      Unit: string;
      Qty: string | number;
      "Unit Price": string;
      "Line Total": string;
    };
    const rows: CSVRow[] = allItems.map((i) => ({
      SKU: i.sku,
      Description: i.description,
      Category: i.category,
      Unit: i.unit,
      Qty: i.quantity,
      "Unit Price": i.unitPrice.toFixed(2),
      "Line Total": i.lineTotal.toFixed(2),
    }));
    rows.push({
      SKU: "",
      Description: "Subtotal (ex-GST)",
      Category: "",
      Unit: "",
      Qty: "",
      "Unit Price": "",
      "Line Total": bom.total.toFixed(2),
    });
    rows.push({
      SKU: "",
      Description: "GST (10%)",
      Category: "",
      Unit: "",
      Qty: "",
      "Unit Price": "",
      "Line Total": bom.gst.toFixed(2),
    });
    rows.push({
      SKU: "",
      Description: "TOTAL (inc. GST)",
      Category: "",
      Unit: "",
      Qty: "",
      "Unit Price": "",
      "Line Total": bom.grandTotal.toFixed(2),
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `quote-${customerRef || "bom"}-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  // ── Clipboard copy (tab-separated for Excel) ─────────────────────────────────
  const handleCopy = async () => {
    const allItems = [...bom.fenceItems, ...bom.gateItems];
    const header = "SKU\tDescription\tUnit\tQty\tUnit Price\tLine Total";
    const lines = allItems.map(
      (i) =>
        `${i.sku}\t${i.description}\t${i.unit}\t${i.quantity}\t${i.unitPrice.toFixed(2)}\t${i.lineTotal.toFixed(2)}`,
    );
    lines.push(`\tSubtotal (ex-GST)\t\t\t\t${bom.total.toFixed(2)}`);
    lines.push(`\tGST (10%)\t\t\t\t${bom.gst.toFixed(2)}`);
    lines.push(`\tTOTAL (inc. GST)\t\t\t\t${bom.grandTotal.toFixed(2)}`);
    try {
      await navigator.clipboard.writeText([header, ...lines].join("\n"));
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Clipboard copy failed");
    }
  };

  // ── Print ────────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ── PDF download ─────────────────────────────────────────────────────────────
  const handlePDF = async () => {
    setPdfing(true);
    try {
      const quote: SavedQuote = {
        id: "",
        org_id: orgId,
        user_id: "",
        customer_ref: customerRef,
        fence_config: fenceConfig,
        gates,
        bom,
        contact,
        notes,
        status: "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const blob = await pdf(<QuotePDFTemplate quote={quote} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `quote-${customerRef || "bom"}-${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfing(false);
    }
  };

  const primaryCls =
    "flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-brand-accent hover:bg-brand-accent-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const btnCls =
    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-accent/60 hover:bg-brand-accent/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-wrap gap-2 justify-end">
      {/* Export group */}
      <div className="flex gap-1.5 border-r border-brand-border pr-2 ml-0.5">
        <button
          type="button"
          onClick={handlePDF}
          disabled={pdfing}
          className={btnCls}
          title="Download PDF"
        >
          {pdfing ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Download size={13} />
          )}
          PDF
        </button>

        {/* <button
          type="button"
          onClick={handleCSV}
          className={btnCls}
          title="Download CSV"
        >
          <Download size={13} />
          CSV
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className={btnCls}
          title="Print"
        >
          <Printer size={13} />
          Print
        </button> */}
      </div>
      {/* Primary action */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={primaryCls}
      >
        {saving ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Save size={13} />
        )}
        {saved ? "Saved!" : saving ? "Saving…" : "Save Quote"}
      </button>
    </div>
  );
}
