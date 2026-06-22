import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { isEdgeFailurePayload } from "./useBomCalculator";
import type { CanonicalPayload } from "../types/canonical.types";

export interface EmbedQuoteInput {
  jobName: string;
  quoteDetails: {
    customer: string;
    email: string;
    phone: string;
    siteAddress: string;
    validUntil: string;
  };
  payload: CanonicalPayload | null;
  bomResult: Record<string, unknown> | null;
}

export interface EmbedQuoteResult {
  quoteId: string;
  totalIncGst: number;
  productCount: number;
}

/**
 * Create an anonymous lead-capture quote from the embed route via the
 * service-role `embed-quote` edge function (anon has no insert on `quotes`).
 * Returns totals only — the values forwarded to the host page's quote-created
 * event.
 */
export function useEmbedQuote(embedOrgSlug: string) {
  return useMutation<EmbedQuoteResult, Error, EmbedQuoteInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke("embed-quote", {
        body: { embedOrgSlug, ...input },
      });
      if (error || !data || isEdgeFailurePayload(data)) {
        // supabase-js puts the HTTP Response on FunctionsHttpError.context;
        // surface a friendlier hint when we've been rate-limited (429).
        const status = (error as { context?: { status?: number } } | null)?.context
          ?.status;
        throw new Error(
          status === 429
            ? "You're sending requests too quickly — please wait a moment and try again"
            : "Could not save your enquiry — please try again",
        );
      }
      return data as EmbedQuoteResult;
    },
  });
}
