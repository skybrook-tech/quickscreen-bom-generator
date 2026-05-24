import { Eye, EyeOff, LogOut, Menu, Moon, Plus, PlayCircle, Sun, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import type { TenantBranding } from '../../lib/tenantThemes';
import { INSTALL_VIDEOS, type InstallVideoKey } from '../../lib/installVideos';
import { InstallVideoQR } from '../calculator-v3/InstallVideoQR';

interface HeaderProps {
  branding?: TenantBranding;
  actions?: ReactNode;
  mobileTitle?: string;
  customerMode?: boolean;
  onCustomerModeChange?: (enabled: boolean) => void;
}

export function Header({
  branding,
  actions,
  mobileTitle,
  customerMode = false,
  onCustomerModeChange,
}: HeaderProps = {}) {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [installVideosOpen, setInstallVideosOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const initials = user?.email?.[0].toUpperCase() ?? '?';

  const navLinkCls = ({ isActive }: { isActive: boolean }) =>
    `text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${isActive
      ? 'text-brand-text bg-brand-border/40'
      : 'text-brand-muted hover:text-brand-text hover:bg-brand-border/20'
    }`;

  const newQuoteLinkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ml-1 ${isActive
      ? 'text-brand-accent bg-brand-accent/15'
      : 'text-brand-accent hover:bg-brand-accent/10'
    }`;

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-stretch justify-between border-b border-brand-border bg-brand-card px-4 py-0 pt-[var(--safe-top)] sm:px-6">
      {/* ── Brand + Nav ───────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 py-3">
          <div className="leading-tight">
            <p className="text-base font-black tracking-tight text-brand-text sm:text-lg">
              {branding?.title ?? 'The Glass Outlet'}{branding?.titleItalic && <em>{branding.titleItalic}</em>}
            </p>
            <p className="text-xs font-semibold text-brand-muted">
              {branding?.subtitle ?? 'QuickScreen BOM Generator'}
              {!branding && <span className="hidden sm:inline"> · Powered by SkyBrookAI</span>}
            </p>
          </div>
        </div>

        {user && (
          <nav className="hidden sm:flex items-center gap-0.5 ml-2">
            <NavLink to="/" end className={navLinkCls}>
              Home
            </NavLink>
            <NavLink to="/quotes" className={navLinkCls}>
              Quotes
            </NavLink>
            <NavLink to="/fence-calculator" className={newQuoteLinkCls}>
              <Plus size={16} />
              New Quote
            </NavLink>
          </nav>
        )}
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[calc(var(--safe-top)+0.75rem)] w-[42vw] -translate-x-1/2 truncate text-center text-sm font-black text-brand-text sm:hidden">
        {mobileTitle || "Calculator"}
      </div>

      {/* ── Controls ──────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {actions && (
          <div className="hidden min-w-0 flex-1 items-center justify-end gap-2 lg:flex" data-print-hide>
            {actions}
          </div>
        )}
        <button
          type="button"
          onClick={() => setInstallVideosOpen(true)}
          title="Install videos"
          className="hidden rounded-md p-2 text-brand-muted transition-colors hover:bg-brand-border/30 hover:text-brand-text sm:inline-flex"
        >
          <PlayCircle size={16} />
        </button>
        <button
          onClick={toggle}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          className="hidden rounded-md p-2 text-brand-muted transition-colors hover:bg-brand-border/30 hover:text-brand-text sm:inline-flex"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {user && (
          <>
            {onCustomerModeChange && (
              <button
                type="button"
                onClick={() => onCustomerModeChange(!customerMode)}
                title={customerMode ? "Show cost mode" : "Show customer mode"}
                className="hidden items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-bold text-brand-muted transition-colors hover:bg-brand-border/30 hover:text-brand-text sm:flex"
              >
                {customerMode ? <EyeOff size={16} /> : <Eye size={16} />}
                <span>{customerMode ? "Cost mode" : "Customer mode"}</span>
              </button>
            )}
            <div
              title={user.email ?? ''}
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
          onClick={() => setMobileMenuOpen(true)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-brand-muted transition-colors hover:bg-brand-border/30 hover:text-brand-text sm:hidden"
          aria-label="Open mobile menu"
        >
          <Menu size={20} />
        </button>
      </div>
      {actions && (
        <div className="hidden w-full border-t border-brand-border py-2 md:flex lg:hidden" data-print-hide>
          {actions}
        </div>
      )}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile menu"
          onClick={() => setMobileMenuOpen(false)}
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
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 text-brand-muted hover:bg-brand-border/30 hover:text-brand-text"
                aria-label="Close mobile menu"
              >
                <X size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setInstallVideosOpen(true);
              }}
              className="flex min-h-11 items-center gap-3 rounded-lg border border-brand-border px-3 py-2 text-left text-sm font-bold text-brand-text"
            >
              <PlayCircle size={18} />
              Install videos
            </button>
            <button
              type="button"
              onClick={toggle}
              className="flex min-h-11 items-center gap-3 rounded-lg border border-brand-border px-3 py-2 text-left text-sm font-bold text-brand-text"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
            {onCustomerModeChange && (
              <button
                type="button"
                onClick={() => onCustomerModeChange(!customerMode)}
                className="flex min-h-11 items-center gap-3 rounded-lg border border-brand-border px-3 py-2 text-left text-sm font-bold text-brand-text"
              >
                {customerMode ? <EyeOff size={18} /> : <Eye size={18} />}
                {customerMode ? "Show cost mode" : "Show customer mode"}
              </button>
            )}
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                className="flex min-h-11 items-center gap-3 rounded-lg border border-brand-border px-3 py-2 text-left text-sm font-bold text-brand-text"
              >
                <LogOut size={18} />
                Sign out
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
          aria-label="Install videos"
          onClick={() => setInstallVideosOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-brand-border bg-brand-card p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-muted">
                  Install videos
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
              {(Object.keys(INSTALL_VIDEOS) as InstallVideoKey[]).map((key) => (
                <InstallVideoQR key={key} videoKey={key} />
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
