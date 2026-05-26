import { Eye, EyeOff, LogOut, Menu, Moon, PlayCircle, Sun, Trash2, WifiOff, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../context/ThemeContext";
import type { TenantBranding } from "../../lib/tenantThemes";
import { INSTALL_VIDEO_MENU_KEYS } from "../../lib/installVideos";
import { InstallVideoQR } from "../calculator-v3/InstallVideoQR";

interface HeaderProps {
  branding?: TenantBranding;
  actions?: ReactNode;
  mobileTitle?: string;
  jobTitle?: string;
  brandLogoSrc?: string;
  brandLogoAlt?: string;
  priceLabel?: string | null;
  customerMode?: boolean;
  onCustomerModeChange?: (enabled: boolean) => void;
  onClearJobRequest?: () => void;
  clearJobDisabled?: boolean;
}

export function Header({
  branding,
  actions,
  mobileTitle,
  jobTitle,
  brandLogoSrc,
  brandLogoAlt = "The Glass Outlet",
  priceLabel,
  customerMode = false,
  onCustomerModeChange,
  onClearJobRequest,
  clearJobDisabled = false,
}: HeaderProps = {}) {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [installVideosOpen, setInstallVideosOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [offline, setOffline] = useState(() => navigator.onLine === false);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const initials = user?.email?.[0].toUpperCase() ?? "?";
  const compactJobTitle = jobTitle?.trim();
  const centeredTitle = compactJobTitle || mobileTitle?.trim() || "";

  const navLinkCls = ({ isActive }: { isActive: boolean }) =>
    `text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
      isActive
        ? "text-brand-text bg-brand-border/40"
        : "text-brand-muted hover:text-brand-text hover:bg-brand-border/20"
    }`;

  const newQuoteLinkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ml-1 ${
      isActive
        ? "text-brand-accent bg-brand-accent/15"
        : "text-brand-accent hover:bg-brand-accent/10"
    }`;

  const menuItemCls =
    "flex min-h-11 w-full items-center gap-3 rounded-lg border border-brand-border px-3 py-2 text-left text-sm font-bold text-brand-text transition-colors hover:border-brand-primary hover:text-brand-primary";

  return (
    <header className="sticky top-0 z-40 flex min-h-[calc(var(--safe-top)+3.25rem)] flex-wrap items-stretch justify-between border-b border-brand-border bg-brand-card px-3 py-0 pt-[var(--safe-top)] sm:px-6">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="flex min-w-0 items-center gap-3 py-2 sm:py-3">
          {brandLogoSrc ? (
            <img
              src={brandLogoSrc}
              alt={brandLogoAlt}
              className="h-8 w-auto max-w-[9rem] shrink-0 object-contain sm:h-10 sm:max-w-[12rem]"
            />
          ) : (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-base font-black tracking-normal text-brand-text sm:text-lg">
                {branding?.title ?? "The Glass Outlet"}{branding?.titleItalic && <em>{branding.titleItalic}</em>}
              </p>
              <p className="truncate text-xs font-semibold text-brand-muted">
                {branding?.subtitle ?? "QuickScreen BOM Generator"}
                {!branding && <span className="hidden sm:inline"> - Powered by SkyBrookAI</span>}
              </p>
            </div>
          )}
        </div>

        {user && (
          <nav className="ml-2 hidden items-center gap-0.5 sm:flex">
            <NavLink to="/" end className={navLinkCls}>
              Home
            </NavLink>
            <NavLink to="/quotes" className={navLinkCls}>
              Quotes
            </NavLink>
            <NavLink to="/fence-calculator" className={newQuoteLinkCls}>
              New Quote
            </NavLink>
          </nav>
        )}
      </div>

      <div className="flex w-24 shrink-0 items-center justify-center px-2 py-2 sm:w-36 sm:px-4 lg:w-44">
        {centeredTitle && (
          <div className="flex min-w-0 items-center justify-center gap-2 overflow-hidden text-center text-sm font-black text-brand-text sm:text-base">
          <span
            className="min-w-0 truncate"
            data-testid="header-job-title"
            title={centeredTitle}
          >
            {centeredTitle}
          </span>
          {priceLabel && (
            <>
              <span className="shrink-0 text-brand-muted">-</span>
              <span
                className="shrink-0 whitespace-nowrap"
                data-testid="header-price"
                aria-label={`Current total ${priceLabel}`}
              >
                {priceLabel}
              </span>
            </>
          )}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
        {actions && (
          <div className="hidden min-w-0 flex-1 items-center justify-end gap-2 lg:flex" data-print-hide>
            {actions}
          </div>
        )}
        <button
          onClick={toggle}
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          className="hidden rounded-md p-2 text-brand-muted transition-colors hover:bg-brand-border/30 hover:text-brand-text sm:inline-flex"
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {user && (
          <>
            <div
              title={user.email ?? ""}
              className="hidden h-7 w-7 select-none items-center justify-center rounded-full border border-brand-accent/30 bg-brand-accent/15 text-xs font-semibold text-brand-accent sm:flex"
            >
              {initials}
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="hidden items-center gap-1.5 rounded-md px-2.5 py-2 text-xs text-brand-muted transition-colors hover:bg-brand-border/30 hover:text-brand-text sm:flex"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-brand-muted transition-colors hover:bg-brand-border/30 hover:text-brand-text"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {actions && (
        <div className="hidden w-full border-t border-brand-border py-2 md:flex lg:hidden" data-print-hide>
          {actions}
        </div>
      )}

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="ml-auto flex h-full w-72 max-w-[82vw] flex-col gap-2 border-l border-brand-border bg-brand-card p-4 shadow-2xl"
            style={{ paddingTop: "calc(var(--safe-top) + 1rem)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-black text-brand-text">Menu</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-2 text-brand-muted hover:bg-brand-border/30 hover:text-brand-text"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            {onCustomerModeChange && (
              <button
                type="button"
                onClick={() => onCustomerModeChange(!customerMode)}
                className={menuItemCls}
              >
                {customerMode ? <EyeOff size={18} /> : <Eye size={18} />}
                <span>{customerMode ? "Show cost mode" : "Customer Mode"}</span>
              </button>
            )}
            {offline && (
              <div
                className="flex min-h-11 items-center gap-3 rounded-lg border border-brand-danger/45 bg-brand-danger/10 px-3 py-2 text-left text-sm font-bold text-brand-danger"
                data-testid="menu-offline-indicator"
              >
                <WifiOff size={18} />
                Offline - quotes can't be saved
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setInstallVideosOpen(true);
              }}
              className={menuItemCls}
            >
              <PlayCircle size={18} />
              Install Videos
            </button>
            {onClearJobRequest && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onClearJobRequest();
                }}
                disabled={clearJobDisabled}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-brand-danger/45 px-3 py-2 text-left text-sm font-bold text-brand-danger transition-colors hover:bg-brand-danger/10 disabled:cursor-not-allowed disabled:opacity-40 sm:hidden"
              >
                <Trash2 size={18} />
                Clear Job
              </button>
            )}
          </div>
        </div>
      )}

      {installVideosOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Install Videos"
          onClick={() => setInstallVideosOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-brand-border bg-brand-card p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-muted">
                  Install Videos
                </p>
                <h2 className="mt-1 text-lg font-black text-brand-text">
                  Glass Outlet installation help
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInstallVideosOpen(false)}
                className="rounded-lg border border-brand-border p-2 text-brand-muted hover:border-brand-danger hover:text-brand-danger"
                title="Close install videos"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {INSTALL_VIDEO_MENU_KEYS.map((key) => (
                <InstallVideoQR key={key} videoKey={key} />
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
