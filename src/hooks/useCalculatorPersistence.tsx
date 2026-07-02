import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import Papa from "papaparse";
import type { RightPaneView } from "../components/calculator-v3/RightPaneTabs";
import { useCalculator } from "../context/CalculatorContext";
import { useAuth } from "./useAuth";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { queryClient } from "../lib/queryClient";
import {
  buildV3FenceConfig,
  buildV3QuoteBom,
  replaceV3QuoteRuns,
} from "../lib/persistV3Quote";
import { shareOrDownloadPdfBlob } from "../lib/sharePdf";
import { defaultSaveJobName } from "../lib/calculatorV3Helpers";
import { BomV3PDFTemplate } from "../components/quote/BomV3PDFTemplate";
import type { CalculatorBOMResult } from "../types/bom.types";

export interface UseCalculatorPersistenceResult {
  saving: boolean;
  sharingPdf: boolean;
  saveJobWithName: (requestedJobName: string) => Promise<boolean>;
  exportCsv: (bomResultForTabs: CalculatorBOMResult) => void;
  sharePdf: (
    bomResultForTabs: CalculatorBOMResult,
    jobName: string,
    siteAddress: string | undefined,
  ) => Promise<void>;
  printBom: (includeMap: boolean, currentRightPaneView: string, setRightPaneView: (view: RightPaneView) => void) => void;
}

export function useCalculatorPersistence(
  quoteId: string | undefined,
  setJobName: (name: string) => void,
  bomResultForTabs: CalculatorBOMResult | null,
): UseCalculatorPersistenceResult {
  const { state } = useCalculator();
  const payload = state.payload;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);

  const saveJobWithName = useCallback(
    async (requestedJobName: string): Promise<boolean> => {
      if (!payload) return false;
      const customerRef = requestedJobName.trim() || defaultSaveJobName();
      const quoteBom = buildV3QuoteBom(bomResultForTabs);
      const fenceConfig = buildV3FenceConfig(customerRef, payload);

      if (!isSupabaseConfigured) {
        localStorage.setItem(
          `glass-calc-job-${Date.now()}`,
          JSON.stringify({
            jobName: customerRef,
            payload,
            bom: quoteBom,
            savedAt: new Date().toISOString(),
          }),
        );
        setJobName(customerRef);
        toast.success("Job saved locally for this browser");
        return true;
      }

      setSaving(true);
      try {
        if (!user) {
          localStorage.setItem(
            `glass-calc-job-${Date.now()}`,
            JSON.stringify({
              jobName: customerRef,
              payload,
              bom: quoteBom,
              savedAt: new Date().toISOString(),
            }),
          );
          setJobName(customerRef);
          toast.success("Job saved locally for this browser");
          return true;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("org_id")
          .eq("id", user.id)
          .single();
        if (profileError) throw profileError;
        const orgId = profile?.org_id;
        if (!orgId) throw new Error("No organisation found for this user.");

        const propertyAnchor = payload.propertyAnchor
          ? {
            lat: payload.propertyAnchor.lat,
            lng: payload.propertyAnchor.lng,
            address: payload.propertyAnchor.address,
          }
          : null;

        if (quoteId) {
          const { error: updateError } = await supabase
            .from("quotes")
            .update({
              customer_ref: customerRef,
              property_anchor: propertyAnchor,
              fence_config: fenceConfig,
              gates: [],
              bom: quoteBom,
              updated_at: new Date().toISOString(),
            })
            .eq("id", quoteId);
          if (updateError) throw updateError;

          await replaceV3QuoteRuns(supabase, orgId, quoteId, payload);
          await queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
          await queryClient.invalidateQueries({ queryKey: ["quotes"] });
          setJobName(customerRef);
          toast.success("Job updated");
        } else {
          const { data: quote, error: quoteError } = await supabase
            .from("quotes")
            .insert({
              org_id: orgId,
              user_id: user.id,
              customer_ref: customerRef,
              property_anchor: propertyAnchor,
              fence_config: fenceConfig,
              gates: [],
              bom: quoteBom,
              contact: {},
              notes: "Saved from v3 job calculator",
              status: "draft",
            })
            .select("id")
            .single();
          if (quoteError) throw quoteError;

          await replaceV3QuoteRuns(supabase, orgId, quote.id, payload);
          await queryClient.invalidateQueries({ queryKey: ["quotes"] });
          setJobName(customerRef);
          toast.success("Job saved");
          navigate(`/quote/${quote.id}`);
        }
        return true;
      } catch (error) {
        toast.error("Couldn't save — please try again");
        console.error(error);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [payload, bomResultForTabs, quoteId, user, navigate, setJobName],
  );

  const exportCsv = useCallback((bom: CalculatorBOMResult) => {
    type CsvRow = {
      SKU: string;
      Description: string;
      Category: string;
      Unit: string;
      Qty: string | number;
      "Unit Price": string;
      "Line Total": string;
    };
    const rows: CsvRow[] = bom.allItems.map((line) => ({
      SKU: line.sku,
      Description: line.description,
      Category: line.category,
      Unit: line.unit,
      Qty: line.quantity,
      "Unit Price": line.unitPrice.toFixed(2),
      "Line Total": line.lineTotal.toFixed(2),
    }));
    rows.push(
      {
        SKU: "",
        Description: "Subtotal (ex-GST)",
        Category: "",
        Unit: "",
        Qty: "",
        "Unit Price": "",
        "Line Total": bom.total.toFixed(2),
      },
      {
        SKU: "",
        Description: "GST (10%)",
        Category: "",
        Unit: "",
        Qty: "",
        "Unit Price": "",
        "Line Total": bom.gst.toFixed(2),
      },
      {
        SKU: "",
        Description: "TOTAL (inc. GST)",
        Category: "",
        Unit: "",
        Qty: "",
        "Unit Price": "",
        "Line Total": bom.grandTotal.toFixed(2),
      },
    );
    const blob = new Blob([Papa.unparse(rows)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `glass-outlet-bom-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const sharePdf = useCallback(
    async (
      bom: CalculatorBOMResult,
      name: string,
      siteAddress: string | undefined,
    ) => {
      setSharingPdf(true);
      try {
        const fileDate = new Date().toISOString().slice(0, 10);
        const fileSlug =
          name.trim().replace(/\s+/g, "-").toLowerCase() || "quickscreen-quote";
        const pdfDocument = (
          <BomV3PDFTemplate
            items={bom.allItems}
            subtotal={bom.total}
            gst={bom.gst}
            grandTotal={bom.grandTotal}
            pricingTier={bom.pricingTier}
            generatedAt={bom.generatedAt}
            customerRef={name.trim() || undefined}
            siteAddress={siteAddress}
          />
        );
        const blob = await pdf(pdfDocument).toBlob();
        const result = await shareOrDownloadPdfBlob({
          blob,
          fileName: `quickscreen-quote-${fileSlug}-${fileDate}.pdf`,
          title: "QuickScreen Quote",
          text: name.trim()
            ? `QuickScreen BOM quote for ${name.trim()}`
            : "QuickScreen BOM quote",
        });
        toast.success(result === "shared" ? "PDF shared" : "PDF downloaded");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to share PDF",
        );
      } finally {
        setSharingPdf(false);
      }
    },
    [],
  );

  const printBom = useCallback(
    (
      includeMap: boolean,
      currentRightPaneView: string,
      setRightPaneView: (view: RightPaneView) => void,
    ) => {
      const cleanupPrintMode = () => {
        document.body.removeAttribute("data-print-bom");
        document.body.removeAttribute("data-print-bom-map");
        window.removeEventListener("afterprint", cleanupPrintMode);
        setRightPaneView(currentRightPaneView as RightPaneView);
      };
      document.body.setAttribute("data-print-bom", "true");
      if (includeMap) {
        document.body.setAttribute("data-print-bom-map", "true");
      } else {
        document.body.removeAttribute("data-print-bom-map");
      }
      window.addEventListener("afterprint", cleanupPrintMode);
      if (includeMap) {
        setRightPaneView("map");
        window.setTimeout(() => window.print(), 300);
        return;
      }
      window.setTimeout(() => window.print(), 0);
    },
    [],
  );

  return {
    saving,
    sharingPdf,
    saveJobWithName,
    exportCsv,
    sharePdf,
    printBom,
  };
}
