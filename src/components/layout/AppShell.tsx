import { Header } from "./Header";
import type { TenantBranding } from "../../lib/tenantThemes";

interface AppShellProps {
  children: React.ReactNode;
  topBar?: React.ReactNode;
  headerActions?: React.ReactNode;
  branding?: TenantBranding;
  mobileTitle?: string;
  jobTitle?: string;
  brandLogoSrc?: string;
  brandLogoAlt?: string;
  headerPriceLabel?: string | null;
  onClearJobRequest?: () => void;
  clearJobDisabled?: boolean;
}

export function AppShell({
  children,
  topBar,
  headerActions,
  branding,
  mobileTitle,
  jobTitle,
  brandLogoSrc,
  brandLogoAlt,
  headerPriceLabel,
  onClearJobRequest,
  clearJobDisabled,
}: AppShellProps) {
  return (
    <div className="flex h-screen h-dvh flex-col overflow-hidden bg-brand-bg text-brand-text">
      <Header
        branding={branding}
        actions={headerActions}
        mobileTitle={mobileTitle}
        jobTitle={jobTitle}
        brandLogoSrc={brandLogoSrc}
        brandLogoAlt={brandLogoAlt}
        priceLabel={headerPriceLabel}
        onClearJobRequest={onClearJobRequest}
        clearJobDisabled={clearJobDisabled}
      />
      {topBar && (
        <div className="shrink-0 bg-brand-bg border-b border-brand-border/60">
          {topBar}
        </div>
      )}
      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
    </div>
  );
}
