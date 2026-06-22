import { useParams } from "react-router-dom";
import { EmbedProvider } from "../context/EmbedContext";
import { useEmbedOrg } from "../hooks/useEmbedOrg";
import { CalculatorV4Page } from "./CalculatorV4Page";
import { EmbedMessage } from "../components/embed/EmbedMessage";

/**
 * Host hostname of the page that framed us, or null if unavailable.
 * `document.referrer` is the parent page when embedded (and empty when opened
 * directly). Referrer checks are ADVISORY only — they nudge accidental misuse;
 * the real access gate is the anon RLS scoping (migration 041) + the edge
 * function's `embed_enabled` check, not this string comparison (it can be
 * spoofed / stripped by referrer policy). See brief 032 §D.9.
 */
function referrerHost(): string | null {
  try {
    if (!document.referrer) return null;
    return new URL(document.referrer).hostname;
  } catch {
    return null;
  }
}

/** Does `host` match an allowlist entry (exact or subdomain of it)? */
function hostAllowed(host: string, domains: string[]): boolean {
  return domains.some((d) => {
    const allow = d.trim().toLowerCase().replace(/^\*\./, "");
    if (!allow) return false;
    return host === allow || host.endsWith(`.${allow}`);
  });
}

/**
 * `/embed/:orgSlug` — the chromeless, anonymous calculator embedded into a
 * supplier's own site via `public/embed.js`. No auth, no app nav.
 */
export function EmbedCalculatorPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { data: org, isLoading, isError } = useEmbedOrg(orgSlug);

  if (isLoading) {
    return <EmbedMessage title="Loading calculator…" />;
  }

  // No row → org missing OR embed not enabled (anon RLS hides both the same way).
  if (isError || !org) {
    return (
      <EmbedMessage
        title="This calculator isn't available"
        body="The embedded calculator for this supplier isn't enabled. If you manage this site, contact Skybrook to enable it."
      />
    );
  }

  // Advisory referrer allowlist (empty list = any site permitted).
  if (org.embedDomains.length > 0) {
    const host = referrerHost();
    if (host && !hostAllowed(host, org.embedDomains)) {
      return (
        <EmbedMessage
          title="This calculator isn't enabled for this site"
          body="This supplier's calculator is restricted to specific websites."
        />
      );
    }
  }

  return (
    <EmbedProvider orgId={org.id} orgSlug={org.slug}>
      <CalculatorV4Page embed={{ orgSlug: org.slug, theme: org.theme }} />
    </EmbedProvider>
  );
}
