import { Header } from "./Header";
import type { TenantBranding } from "../../lib/tenantThemes";

interface AppShellProps {
  children: React.ReactNode;
  topBar?: React.ReactNode;
  branding?: TenantBranding;
}

export function AppShell({ children, topBar, branding }: AppShellProps) {
  return (
    <div className="h-screen overflow-hidden bg-brand-bg text-brand-text flex flex-col">
      <Header branding={branding} />
      {topBar && (
        <div className="shrink-0 bg-brand-bg border-b border-brand-border/60">
          {topBar}
        </div>
      )}
      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
    </div>
  );
}
