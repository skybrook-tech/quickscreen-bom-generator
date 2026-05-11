import { LogOut, Sun, Moon, Plus, PlayCircle, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import type { TenantBranding } from '../../lib/tenantThemes';
import { INSTALL_VIDEOS, type InstallVideoKey } from '../../lib/installVideos';
import { InstallVideoQR } from '../calculator-v3/InstallVideoQR';

interface HeaderProps {
  branding?: TenantBranding;
}

export function Header({ branding }: HeaderProps = {}) {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [installVideosOpen, setInstallVideosOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const initials = user?.email?.[0].toUpperCase() ?? '?';

  const navLinkCls = ({ isActive }: { isActive: boolean }) =>
    `text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
      isActive
        ? 'text-brand-text bg-brand-border/40'
        : 'text-brand-muted hover:text-brand-text hover:bg-brand-border/20'
    }`;

  const newQuoteLinkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ml-1 ${
      isActive
        ? 'text-brand-accent bg-brand-accent/15'
        : 'text-brand-accent hover:bg-brand-accent/10'
    }`;

  return (
    <header className="bg-brand-card border-b border-brand-border px-4 sm:px-6 py-0 flex items-stretch justify-between">
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
            <NavLink to="/new" className={newQuoteLinkCls}>
              <Plus size={16} />
              New Quote
            </NavLink>
          </nav>
        )}
      </div>

      {/* ── Controls ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setInstallVideosOpen(true)}
          title="Install videos"
          className="p-2 rounded-md text-brand-muted hover:text-brand-text hover:bg-brand-border/30 transition-colors"
        >
          <PlayCircle size={16} />
        </button>
        <button
          onClick={toggle}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          className="p-2 rounded-md text-brand-muted hover:text-brand-text hover:bg-brand-border/30 transition-colors"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {user && (
          <>
            <div
              title={user.email ?? ''}
              className="w-7 h-7 rounded-full bg-brand-accent/15 border border-brand-accent/30 text-brand-accent text-xs font-semibold flex items-center justify-center select-none"
            >
              {initials}
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text px-2.5 py-2 rounded-md hover:bg-brand-border/30 transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </>
        )}
      </div>
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
