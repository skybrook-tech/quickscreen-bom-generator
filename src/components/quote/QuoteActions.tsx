import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { Save, Download, Loader2, Pencil } from "lucide-react";
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
  /** When set, save updates this existing draft instead of inserting a new one */
  editingQuoteId?: string;
  /** Used in the PDF when viewing a saved quote */
  quoteNumber?: number;
  /** Called with the saved quote id after a successful save. If omitted, navigates to /quote/:id */
  onSaved?: (id: string) => void;
  onShowSaved: () => void;
  /** When provided, renders an Edit Draft button */
  onEdit?: () => void;
  /** Set to false to hide the Save/Update button (e.g. in view-only mode). Defaults to true. */
  showSave?: boolean;
}

export function QuoteActions({
  fenceConfig,
  gates,
  bom,
  contact,
  customerRef,
  notes,
  orgId,
  editingQuoteId,
  quoteNumber,
  onSaved,
  onShowSaved,
  onEdit,
  showSave = true,
}: QuoteActionsProps) {
  const { saveQuote, updateQuote } = useQuotes();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [pdfing, setPdfing] = useState(false);
  const [csving, setCsving] = useState(false);

  const isEditing = !!editingQuoteId;

  // ── Save / Update draft ──────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      let savedId: string;

      if (isEditing) {
        const result = await updateQuote.mutateAsync({
          id: editingQuoteId,
          updates: {
            customer_ref: customerRef,
            fence_config: fenceConfig,
            gates,
            bom,
            contact,
            notes,
            status: "draft",
          },
        });
        savedId = result.id;
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const newQuote: NewQuote = {
          org_id: orgId,
          user_id: user.id,
          customer_ref: customerRef,
          fence_config: fenceConfig,
          gates,
          bom,
          contact,
          notes,
          status: "draft",
        };
        const result = await saveQuote.mutateAsync(newQuote);
        savedId = result.id;
      }

      toast.success(isEditing ? "Draft updated" : "Quote saved as draft");
      if (onSaved) {
        onSaved(savedId);
      } else {
        navigate(`/quote/${savedId}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save quote";
      toast.error(msg);
      setSaving(false);
    }
  };

  // ── CSV export ───────────────────────────────────────────────────────────────
  const handleCSV = () => {
    setCsving(true);
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
    setCsving(false);
  };

  // ── PDF download ─────────────────────────────────────────────────────────────
  const handlePDF = async () => {
    setPdfing(true);
    try {
      const quote: SavedQuote = {
        id: editingQuoteId ?? "",
        org_id: orgId,
        user_id: "",
        quote_number: quoteNumber ?? 0,
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
      <div className="flex gap-1.5 border-r border-brand-border pr-2 ml-0.5">
        <button
          type="button"
          onClick={handleCSV}
          disabled={csving}
          className={btnCls}
          title="Download CSV"
        >
          {csving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Download size={13} />
          )}
          CSV
        </button>
      </div>
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
      </div>

      {onEdit && (
        <button type="button" onClick={onEdit} className={primaryCls}>
          <Pencil size={13} />
          Edit Draft
        </button>
      )}

      {showSave && (
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
          {saving
            ? isEditing
              ? "Updating…"
              : "Saving…"
            : isEditing
              ? "Update Draft"
              : "Save as Draft"}
        </button>
      )}
    </div>
  );
}
