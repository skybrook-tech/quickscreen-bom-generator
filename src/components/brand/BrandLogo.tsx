import { cn } from "../../lib";
import { useProfile } from "../../context/ProfileContext";
import { orgInitials } from "../../lib/tenantThemes";

/**
 * Org-driven brand logo. Renders the current org's logo image when one is
 * configured (`organisations.logo_url`, surfaced via `useProfile`), otherwise a
 * themed initials badge derived from the org name. Both variants carry
 * `data-print-logo` so the print stylesheet (src/index.css) can style them.
 *
 * Replaces the old hardcoded `GlassOutletLogo`. Sizing is preset-based so the
 * image and the fallback badge occupy the same footprint at each call site.
 */
export type BrandLogoSize = "sm" | "md" | "lg" | "xl";

const SIZES: Record<BrandLogoSize, { img: string; badge: string; text: string }> = {
  sm: { img: "h-10", badge: "h-10 w-10", text: "text-base" },
  md: { img: "h-12", badge: "h-12 w-12", text: "text-lg" },
  lg: { img: "h-14 sm:h-16", badge: "h-14 w-14 sm:h-16 sm:w-16", text: "text-2xl sm:text-3xl" },
  xl: {
    img: "h-20 sm:h-24 lg:h-28",
    badge: "h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28",
    text: "text-3xl sm:text-4xl lg:text-5xl",
  },
};

interface BrandLogoProps {
  size?: BrandLogoSize;
  className?: string;
}

export function BrandLogo({ size = "md", className = "" }: BrandLogoProps) {
  const { logoUrl, orgName } = useProfile();
  const s = SIZES[size];

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={orgName ?? "Logo"}
        data-print-logo
        className={cn("w-auto max-w-[16rem] shrink-0 object-contain", s.img, className)}
      />
    );
  }

  return (
    <div
      data-print-logo
      aria-label={orgName ? `${orgName} logo` : undefined}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-xl bg-brand-accent/15 font-black tracking-tight text-brand-accent",
        s.badge,
        s.text,
        className,
      )}
    >
      {orgInitials(orgName)}
    </div>
  );
}
