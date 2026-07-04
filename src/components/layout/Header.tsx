import {
  LogOut,
  Menu,
  Moon,
  Plus,
  Sun,
  Trash2,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { cn } from '../../lib';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import type { TenantBranding } from '../../lib/tenantThemes';

/**
 * Every interactive element in the header is described as data and rendered via
 * `.map()`. `styleFor` is the single style-selector that turns a variant key into
 * the Tailwind class string for that visual style.
 */
type ButtonVariant =
  | 'nav'
  | 'navAccent'
  | 'iconControl'
  | 'signOut'
  | 'menuTrigger'
  | 'menuClose'
  | 'mobileItem'
  | 'mobileDanger';

function styleFor(variant: ButtonVariant, isActive = false): string {
  switch (variant) {
    case 'nav':
      return cn(
        'text-xs font-medium px-3 py-1.5 rounded-md transition-colors',
        isActive
          ? 'text-brand-text bg-brand-border/40'
          : 'text-brand-muted hover:text-brand-text hover:bg-brand-border/20',
      );
    case 'navAccent':
      return cn(
        'flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ml-1',
        isActive
          ? 'text-brand-accent bg-brand-accent/15'
          : 'text-brand-accent hover:bg-brand-accent/10',
      );
    case 'iconControl':
      return 'hidden rounded-md p-2 text-brand-muted transition-colors hover:bg-brand-border/30 hover:text-brand-text sm:inline-flex';
    case 'signOut':
      return 'hidden items-center gap-1.5 rounded-md px-2.5 py-2 text-xs text-brand-muted transition-colors hover:bg-brand-border/30 hover:text-brand-text sm:flex';
    case 'menuTrigger':
      return 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-brand-muted transition-colors hover:bg-brand-border/30 hover:text-brand-text sm:hidden';
    case 'menuClose':
      return 'rounded-lg p-2 text-brand-muted hover:bg-brand-border/30 hover:text-brand-text';
    case 'mobileItem':
      return 'flex min-h-11 items-center gap-3 rounded-lg border border-brand-border px-3 py-2 text-left text-sm font-bold text-brand-text';
    case 'mobileDanger':
      return 'flex min-h-11 items-center gap-3 rounded-lg border border-brand-danger/45 px-3 py-2 text-left text-sm font-bold text-brand-danger transition-colors hover:bg-brand-danger/10 disabled:cursor-not-allowed disabled:opacity-40';
  }
}

/** Static desktop nav links (router links — need `to` + active-state styling). */
type NavItem = {
  to: string;
  label: string;
  icon?: LucideIcon;
  variant: ButtonVariant;
  end?: boolean;
};

const navItems: NavItem[] = [
  { to: '/', label: 'Home', variant: 'nav', end: true },
  { to: '/quotes', label: 'Quotes', variant: 'nav' },
  { to: '/fence-calculator', label: 'New Quote', icon: Plus, variant: 'navAccent' },
];

/** Desktop control buttons (theme toggle, sign out). */
type ControlButton = {
  key: string;
  icon: LucideIcon;
  onClick: () => void;
  variant: ButtonVariant;
  /** `display` renders before the user avatar, `account` after it. */
  group: 'display' | 'account';
  title?: string;
  label?: string;
  show?: boolean;
};

/** Mobile drawer buttons (Clear Job, theme toggle, sign out). */
type MobileMenuItem = {
  key: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant: ButtonVariant;
  disabled?: boolean;
  show?: boolean;
};

interface HeaderProps {
  branding?: TenantBranding;
  actions?: ReactNode;
  mobileTitle?: string;
  jobTitle?: string;
  brandLogoSrc?: string;
  brandLogoAlt?: string;
  priceLabel?: string | null;
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
  onClearJobRequest,
  clearJobDisabled = false,
}: HeaderProps = {}) {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const initials = user?.email?.[0].toUpperCase() ?? '?';
  const compactJobTitle = jobTitle?.trim();

  const desktopControls: ControlButton[] = [
    {
      key: 'theme',
      icon: theme === 'light' ? Moon : Sun,
      onClick: toggle,
      variant: 'iconControl',
      group: 'display',
      title: theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode',
    },
    {
      key: 'sign-out',
      icon: LogOut,
      label: 'Sign out',
      onClick: handleSignOut,
      variant: 'signOut',
      group: 'account',
      title: 'Sign out',
      show: !!user,
    },
  ];

  const mobileMenuItems: MobileMenuItem[] = [
    {
      key: 'clear-job',
      icon: Trash2,
      label: 'Clear Job',
      onClick: () => {
        setMobileMenuOpen(false);
        onClearJobRequest?.();
      },
      variant: 'mobileDanger',
      disabled: clearJobDisabled,
    },
    {
      key: 'theme',
      icon: theme === 'light' ? Moon : Sun,
      label: theme === 'light' ? 'Dark mode' : 'Light mode',
      onClick: toggle,
      variant: 'mobileItem',
    },
    {
      key: 'sign-out',
      icon: LogOut,
      label: 'Sign out',
      onClick: handleSignOut,
      variant: 'mobileItem',
      show: !!user,
    },
  ];

  const renderControl = ({ key, icon: Icon, label, onClick, title, variant }: ControlButton) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      title={title}
      className={styleFor(variant)}
    >
      <Icon size={16} />
      {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 flex min-h-[calc(var(--safe-top)+3.25rem)] flex-wrap items-stretch justify-between border-b border-brand-border bg-brand-card px-3 py-0 pt-[var(--safe-top)] sm:px-6">
      {/* ── Brand + Nav ───────────────────────────────────────────── */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="flex min-w-0 items-center gap-3 py-2 sm:py-3">
          {compactJobTitle ? (
            <div className="min-w-0 max-w-[42vw] leading-tight sm:max-w-[18rem] lg:max-w-[24rem]">
              <span
                className="block truncate text-sm font-black text-brand-text sm:text-base"
                data-testid="header-job-title"
                title={compactJobTitle}
              >
                {compactJobTitle}
              </span>
            </div>
          ) : brandLogoSrc ? (
            <img
              src={brandLogoSrc}
              alt={brandLogoAlt}
              className="h-8 w-auto max-w-[9rem] shrink-0 object-contain sm:h-10 sm:max-w-[12rem]"
            />
          ) : (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-base font-black tracking-tight text-brand-text sm:text-lg">
                {branding?.title ?? 'The Glass Outlet'}{branding?.titleItalic && <em>{branding.titleItalic}</em>}
              </p>
              <p className="truncate text-xs font-semibold text-brand-muted">
                {branding?.subtitle ?? 'QuickScreen BOM Generator'}
                {!branding && <span className="hidden sm:inline"> · Powered by SkyBrookAI</span>}
              </p>
            </div>
          )}
        </div>

        {user && (
          <nav className="hidden sm:flex items-center gap-0.5 ml-2">
            {navItems.map(({ to, label, icon: Icon, variant, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => styleFor(variant, isActive)}
              >
                {Icon && <Icon size={16} />}
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      {mobileTitle && (
        <div className="pointer-events-none absolute left-1/2 top-[calc(var(--safe-top)+0.9rem)] w-[34vw] -translate-x-1/2 truncate text-center text-sm font-black text-brand-text sm:hidden">
          {mobileTitle}
        </div>
      )}

      {/* ── Controls ──────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
        {actions && (
          <div className="hidden min-w-0 flex-1 items-center justify-end gap-2 lg:flex" data-print-hide>
            {actions}
          </div>
        )}

        {desktopControls
          .filter((control) => control.show !== false && control.group === 'display')
          .map(renderControl)}

        {user && (
          <div
            title={user.email ?? ''}
            className="hidden h-7 w-7 select-none items-center justify-center rounded-full border border-brand-accent/30 bg-brand-accent/15 text-xs font-semibold text-brand-accent sm:flex"
          >
            {initials}
          </div>
        )}

        {desktopControls
          .filter((control) => control.show !== false && control.group === 'account')
          .map(renderControl)}

        {priceLabel && (
          <div
            className="shrink-0 whitespace-nowrap rounded-lg border border-brand-primary/25 bg-brand-primary/10 px-2 py-1 text-right font-mono text-sm font-black tabular-nums text-brand-primary sm:px-3 sm:text-base"
            data-testid="header-price"
            aria-label={`Current total ${priceLabel}`}
          >
            {priceLabel}
          </div>
        )}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={styleFor('menuTrigger')}
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
                className={styleFor('menuClose')}
                aria-label="Close mobile menu"
              >
                <X size={18} />
              </button>
            </div>
            {offline && (
              <div
                className="flex min-h-11 items-center gap-3 rounded-lg border border-brand-danger/45 bg-brand-danger/10 px-3 py-2 text-left text-sm font-bold text-brand-danger"
                data-testid="mobile-menu-offline-indicator"
              >
                <WifiOff size={18} />
                Offline - quotes can't save
              </div>
            )}
            {mobileMenuItems
              .filter((item) => item.show !== false)
              .map(({ key, icon: Icon, label, onClick, disabled, variant }) => (
                <button
                  key={key}
                  type="button"
                  onClick={onClick}
                  disabled={disabled}
                  className={styleFor(variant)}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
          </div>
        </div>
      )}

    </header>
  );
}
