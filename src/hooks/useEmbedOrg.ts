import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { adjustThemeContrast, type TenantTheme } from "../lib/tenantThemes";

export interface EmbedOrg {
  id: string;
  slug: string;
  name: string;
  /** Org theme (cssVars + branding), contrast-adjusted, or null if unset. */
  theme: TenantTheme | null;
  /** Advisory referrer allowlist; empty/undefined means "any site". */
  embedDomains: string[];
}

/**
 * Resolve an embed-enabled org by slug for the anonymous `/embed/:orgSlug` route.
 *
 * The anon RLS policy (migration 041) only returns rows for orgs where
 * `embed_enabled = true`, so a `null` result means the slug is unknown OR the
 * org has not opted into embedding — both render the "not enabled" panel. The
 * anon column grant exposes only id/slug/name/branding/embed_domains; nothing
 * sensitive is reachable here.
 */
export function useEmbedOrg(slug: string | undefined) {
  return useQuery<EmbedOrg | null>({
    queryKey: ["embed-org", slug],
    enabled: !!slug,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organisations")
        .select("id, slug, name, branding, embed_domains")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const branding = data.branding as TenantTheme | null;
      // A freshly-created org has branding '{}' (no cssVars) — treat as no theme.
      const theme =
        branding && branding.cssVars ? adjustThemeContrast(branding) : null;

      return {
        id: data.id as string,
        slug: data.slug as string,
        name: data.name as string,
        theme,
        embedDomains: (data.embed_domains as string[] | null) ?? [],
      };
    },
  });
}
