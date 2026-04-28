import { useState } from "react";
import { Download, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import Papa from "papaparse";
import { BomV3PDFTemplate } from "./BomV3PDFTemplate";
import type { CalculatorBOMResult, BOMLineItem } from "../../types/bom.types";

interface BOMExportActionsProps {
  result: CalculatorBOMResult;
  removedSkus?: Set<string>;
  qtyOverrides?: Map<string, number>;
  customerRef?: string;
}

function applyOverrides(
  items: BOMLineItem[],
  removedSkus?: Set<string>,
  qtyOverrides?: Map<string, number>,
): BOMLineItem[] {
  return items
    .filter((i) => !removedSkus?.has(i.sku))
    .map((i) => {
      const qty = qtyOverrides?.get(i.sku) ?? i.quantity;
      return {
        ...i,
        quantity: qty,
        lineTotal: parseFloat((qty * i.unitPrice).toFixed(2)),
      };
    });
}

export function BOMExportActions({
  result,
  removedSkus,
  qtyOverrides,
  customerRef,
}: BOMExportActionsProps) {
  const [pdfing, setPdfing] = useState(false);
  const [csving, setCsving] = useState(false);
  const [copying, setCopying] = useState(false);

  const effectiveItems = applyOverrides(result.allItems, removedSkus, qtyOverrides);
  const subtotal = parseFloat(
    effectiveItems.reduce((s, i) => s + i.lineTotal, 0).toFixed(2),
  );
  const gst = parseFloat((subtotal * 0.1).toFixed(2));
  const grandTotal = parseFloat((subtotal + gst).toFixed(2));

  const date = new Date().toISOString().slice(0, 10);
  const fileSlug = customerRef?.replace(/\s+/g, "-").toLowerCase() || "bom";

  const handleCopy = async () => {
    setCopying(true);
    const lines = effectiveItems.map(
      (i) =>
        `${i.sku}\t${i.name || i.description}\t×${i.quantity}\t$${i.lineTotal.toFixed(2)}`,
    );
    lines.push("");
    lines.push(`Subtotal (ex-GST)\t\t\t$${subtotal.toFixed(2)}`);
    lines.push(`GST (10%)\t\t\t$${gst.toFixed(2)}`);
    lines.push(`TOTAL (inc. GST)\t\t\t$${grandTotal.toFixed(2)}`);
    await navigator.clipboard.writeText(lines.join("\n"));
    toast.success("BOM copied to clipboard");
    setCopying(false);
  };

  const handleCSV = () => {
    setCsving(true);
    type CSVRow = {
      SKU: string;
      Name: string;
      Description: string;
      Category: string;
      Unit: string;
      Qty: number | string;
      "Unit Price": string;
      "Line Total": string;
    };
    const rows: CSVRow[] = effectiveItems.map((i) => ({
      SKU: i.sku,
      Name: i.name || i.description,
      Description: i.description,
      Category: i.category,
      Unit: i.unit,
      Qty: i.quantity,
      "Unit Price": i.unitPrice.toFixed(2),
      "Line Total": i.lineTotal.toFixed(2),
    }));
    rows.push({
      SKU: "", Name: "Subtotal (ex-GST)", Description: "", Category: "",
      Unit: "", Qty: "", "Unit Price": "", "Line Total": subtotal.toFixed(2),
    });
    rows.push({
      SKU: "", Name: "GST (10%)", Description: "", Category: "",
      Unit: "", Qty: "", "Unit Price": "", "Line Total": gst.toFixed(2),
    });
    rows.push({
      SKU: "", Name: "TOTAL (inc. GST)", Description: "", Category: "",
      Unit: "", Qty: "", "Unit Price": "", "Line Total": grandTotal.toFixed(2),
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quote-${fileSlug}-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
    setCsving(false);
  };

  const handlePDF = async () => {
    setPdfing(true);
    try {
      const blob = await pdf(
        <BomV3PDFTemplate
          items={effectiveItems}
          subtotal={subtotal}
          gst={gst}
          grandTotal={grandTotal}
          pricingTier={result.pricingTier}
          generatedAt={result.generatedAt}
          customerRef={customerRef}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quote-${fileSlug}-${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfing(false);
    }
  };

  const btnCls =
    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-accent/60 hover:bg-brand-accent/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-wrap gap-2 justify-end pt-3">
      <button
        type="button"
        onClick={handleCopy}
        disabled={copying || effectiveItems.length === 0}
        className={btnCls}
        title="Copy to clipboard"
      >
        {copying ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
        Copy
      </button>
      <button
        type="button"
        onClick={handleCSV}
        disabled={csving || effectiveItems.length === 0}
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
      <button
        type="button"
        onClick={handlePDF}
        disabled={pdfing || effectiveItems.length === 0}
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
  );
}
