import { LogOut, Sun, Moon, Plus } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';

export function Header() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

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
          <span className="text-xs font-bold text-brand-accent tracking-widest uppercase px-2 py-1 rounded border border-brand-accent/40 bg-brand-accent/5 hidden sm:inline">
            SkybrookAI
          </span>
          <span className="text-brand-border/60 hidden sm:inline">|</span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-brand-text">The Glass Outlet</p>
            <p className="text-xs text-brand-muted">QuickScreen BOM Generator</p>
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
              <Plus size={12} />
              New Quote
            </NavLink>
          </nav>
        )}
      </div>

      {/* ── Controls ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
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
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
