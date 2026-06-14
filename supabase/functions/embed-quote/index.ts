// embed-quote — anonymous lead-capture quote creation for the customer embed.
//
// The embed route (/embed/:orgSlug) has no authenticated user and the anon role
// has NO insert access to `quotes` (revoked in migration 041). So an embed quote
// is created here, server-side, with the service role:
//
//   1. Resolve the org from `embedOrgSlug`, gated on `embed_enabled` (the single
//      server-side authorisation for anonymous writes — same gate as the BOM).
//   2. Insert a quote with source='embed', user_id=NULL, the org_id, the captured
//      customer contact, and the canonical payload + BOM snapshot in `notes`
//      (mirroring the authenticated v4 save shape).
//   3. Return ONLY { quoteId, totalIncGst, productCount } — totals, never line
//      items or trade pricing — for the parent page's quote-created event.
//
// NOTE (abuse): there is no rate limiting here yet — an anon caller could spam an
// org's quote history. The embed_enabled gate + advisory referrer check are the
// current controls; rate limiting on this function is tracked as P3 (HANDOVER §5).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { resolveEmbedOrg } from "../_shared/auth.ts";

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const embedOrgSlug = body?.embedOrgSlug;
    if (typeof embedOrgSlug !== "string" || embedOrgSlug.length === 0) {
      return new Response(JSON.stringify({ error: "Missing embedOrgSlug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orgId } = await resolveEmbedOrg(embedOrgSlug);

    const payload = body?.payload ?? null;
    const bomResult = body?.bomResult ?? null;
    const quoteDetails = body?.quoteDetails ?? {};
    const contact = {
      name: asString(quoteDetails.customer) || asString(body?.contact?.name),
      email: asString(quoteDetails.email) || asString(body?.contact?.email),
      phone: asString(quoteDetails.phone) || asString(body?.contact?.phone),
      address:
        asString(quoteDetails.siteAddress) || asString(body?.contact?.address),
    };

    const customerRef =
      (contact.name || asString(body?.jobName) || "Website enquiry").slice(0, 200);

    const notes = JSON.stringify({
      v4_payload: payload,
      bomResult,
      quoteDetails,
      source: "embed",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabaseAdmin
      .from("quotes")
      .insert({
        org_id: orgId,
        user_id: null,
        source: "embed",
        customer_ref: customerRef,
        // v4 stores the canonical payload in `notes`; these NOT NULL JSONB
        // columns are stubbed exactly as the authenticated v4 save does.
        fence_config: {},
        bom: {},
        gates: [],
        contact,
        notes,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) throw new Error(`Quote insert failed: ${error.message}`);

    // Totals for the parent page's quote-created event — derived from the BOM the
    // client already received from our own (server-side) calculator. Informational
    // only; the persisted lead is reviewed by the supplier.
    const totals = (bomResult?.totals ?? {}) as { grandTotal?: number };
    const totalIncGst = Number(totals.grandTotal ?? 0);
    const productCount = Array.isArray(bomResult?.lines)
      ? bomResult.lines.length
      : 0;

    return new Response(
      JSON.stringify({ quoteId: data.id, totalIncGst, productCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("Embedding is not enabled") ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
