import { createContext, useContext } from "react";

/**
 * EmbedContext — present only on the anonymous `/embed/:orgSlug` route.
 *
 * On the authenticated app this provider is absent and `useEmbed()` returns the
 * default (orgId/orgSlug = null), so org-scoped queries fall back to RLS scoping
 * by the signed-in user's org (unchanged behaviour).
 *
 * On the embed route the anon RLS policies (migration 041) make EVERY
 * embed-enabled org's catalogue/variable/colour rows readable to the anon role.
 * That is correct for the policy, but it means a bare anon query would mix rows
 * from multiple embed-enabled orgs. So the data hooks read `orgId` from here and
 * add an explicit `.eq('org_id', orgId)` filter when it is set. This is the
 * single multi-tenant guardrail that keeps one supplier's embed showing only
 * that supplier's products/colours.
 */
export interface EmbedContextValue {
  /** Resolved org UUID for the embed, or null when not on the embed route. */
  orgId: string | null;
  /** Org slug from the URL (`/embed/:orgSlug`), or null off the embed route. */
  orgSlug: string | null;
}

const EmbedContext = createContext<EmbedContextValue>({
  orgId: null,
  orgSlug: null,
});

export function EmbedProvider({
  orgId,
  orgSlug,
  children,
}: {
  orgId: string | null;
  orgSlug: string | null;
  children: React.ReactNode;
}) {
  return (
    <EmbedContext.Provider value={{ orgId, orgSlug }}>
      {children}
    </EmbedContext.Provider>
  );
}

export function useEmbed(): EmbedContextValue {
  return useContext(EmbedContext);
}
